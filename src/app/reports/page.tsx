
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { 
  Loader2, 
  Wand2, 
  Sparkles, 
  Activity,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Table as TableIcon
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { analyzeReports, type AnalyzeReportsOutput } from "@/ai/flows/analyze-reports-flow";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, startOfMonth, isWithinInterval } from "date-fns";

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();
  const router = useRouter();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AnalyzeReportsOutput | null>(null);
  const [reportPeriod, setReportPeriod] = useState<'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && role === "Omborchi") {
      router.push("/");
    }
  }, [role, authLoading, router]);

  // Unified Data Subscriptions
  const productsQuery = useMemoFirebase(() => (db && user) ? collection(db, "products") : null, [db, user]);
  const warehousesQuery = useMemoFirebase(() => (db && user) ? collection(db, "warehouses") : null, [db, user]);
  const employeesQuery = useMemoFirebase(() => (db && user) ? collection(db, "employees") : null, [db, user]);
  const expensesQuery = useMemoFirebase(() => (db && user) ? collection(db, "expenses") : null, [db, user]);
  const movementsQuery = useMemoFirebase(() => (db && user) ? query(collection(db, "stockMovements"), orderBy("movementDate", "desc")) : null, [db, user]);

  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);
  const { data: warehouses, isLoading: warehousesLoading } = useCollection(warehousesQuery);
  const { data: employees } = useCollection(employeesQuery);
  const { data: operationalExpenses } = useCollection(expensesQuery);
  const { data: movements, isLoading: movementsLoading } = useCollection(movementsQuery);

  // Financial Engine
  const financials = useMemo(() => {
    if (!movements || !products) return { revenue: 0, expenses: 0, profit: 0, opsExpenses: 0, salaryExp: 0 };

    const now = new Date();
    const startDate = reportPeriod === 'weekly' ? startOfWeek(now) : startOfMonth(now);
    const interval = { start: startDate, end: now };

    let revenue = 0;
    movements.forEach(m => {
      if (m.movementType === 'StockOut' && isWithinInterval(new Date(m.movementDate), interval)) {
        revenue += Math.abs(m.quantityChange || 0) * (m.unitPrice || 0);
      }
    });

    let opsExpenses = 0;
    operationalExpenses?.forEach(ex => {
      if (isWithinInterval(new Date(ex.date), interval)) {
        opsExpenses += (ex.amount || 0);
      }
    });

    let salaryExp = 0;
    employees?.forEach(e => {
      const monthlyTotal = (e.baseSalary || 0);
      salaryExp += (reportPeriod === 'weekly' ? monthlyTotal / 4 : monthlyTotal);
    });

    const totalExpenses = opsExpenses + salaryExp;

    return { 
      revenue, 
      opsExpenses,
      salaryExp,
      expenses: totalExpenses, 
      profit: revenue - totalExpenses 
    };
  }, [movements, products, employees, operationalExpenses, reportPeriod]);

  const totalInventoryValue = useMemo(() => {
    return products?.reduce((acc, p) => acc + ((p.salePrice || 0) * (p.stock || 0)), 0) || 0;
  }, [products]);

  const handleAiAnalyze = useCallback(async () => {
    if (!products) return;
    setIsAiLoading(true);
    try {
      const topProducts = products
        .sort((a, b) => (b.stock || 0) - (a.stock || 0))
        .slice(0, 5)
        .map(p => ({
          name: p.name,
          stock: p.stock || 0,
          price: p.salePrice || 0
        }));

      const result = await analyzeReports({
        stats: {
          totalValue: totalInventoryValue,
          warehouseCount: warehouses?.length || 0,
          productCount: products.length,
          lowStockCount: products.filter(p => (p.stock || 0) < (p.lowStockThreshold || 10)).length,
        },
        topProducts
      });
      setAiResult(result);
    } catch (error) {
      toast({ variant: "destructive", title: "AI Xatolik", description: "Tahlil qilishda xatolik yuz berdi." });
    } finally {
      setIsAiLoading(false);
    }
  }, [products, totalInventoryValue, warehouses, toast]);

  const exportToExcel = async () => {
    try {
      const XLSXModule = await import("xlsx");
      const XLSX = (XLSXModule as any).default || XLSXModule;
      
      const data = [
        ["MOLIYAVIY HISOBOT", ""],
        ["Davr", reportPeriod === 'weekly' ? "Haftalik" : "Oylik"],
        ["Sana", new Date().toLocaleDateString()],
        ["", ""],
        ["Sotuv tushumi", financials.revenue],
        ["Operatsion xarajatlar", financials.opsExpenses],
        ["Maosh xarajatlari", financials.salaryExp],
        ["Jami xarajatlar", financials.expenses],
        ["Sof foyda", financials.profit],
        ["", ""],
        ["OMBOR HOLATI", ""],
        ["Jami zaxira qiymati", totalInventoryValue],
        ["Mahsulot turlari", products?.length || 0],
        ["Faol omborlar", warehouses?.length || 0]
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
      XLSX.writeFile(wb, `Hisobot_${reportPeriod}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Excel yuklandi" });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({ variant: "destructive", title: "Excel eksportida xatolik" });
    }
  };

  const formatMoney = (val: number) => Math.floor(val).toLocaleString().replace(/,/g, ' ');

  if (!mounted || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isLoading = productsLoading || warehousesLoading || movementsLoading;

  return (
    <div className="flex min-h-screen bg-background text-foreground font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">{t.reports.title}</h1>
            <p className="text-muted-foreground font-medium text-sm mt-1">{t.reports.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-muted/30 p-1.5 rounded-2xl flex gap-1 mr-4 border border-border/40">
              <Button 
                variant={reportPeriod === 'weekly' ? 'secondary' : 'ghost'} 
                size="sm" 
                className={cn("rounded-xl text-[10px] font-black uppercase h-10 px-4", reportPeriod === 'weekly' && "bg-background shadow-sm")}
                onClick={() => setReportPeriod('weekly')}
              >
                {t.reports.weekly}
              </Button>
              <Button 
                variant={reportPeriod === 'monthly' ? 'secondary' : 'ghost'} 
                size="sm" 
                className={cn("rounded-xl text-[10px] font-black uppercase h-10 px-4", reportPeriod === 'monthly' && "bg-background shadow-sm")}
                onClick={() => setReportPeriod('monthly')}
              >
                {t.reports.monthly}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl" onClick={exportToExcel} title="Excel">
                <TableIcon className="w-5 h-5 text-emerald-600" />
              </Button>
            </div>
            
            <Button onClick={handleAiAnalyze} disabled={isAiLoading || isLoading || !products?.length} className="rounded-2xl font-black uppercase tracking-widest text-[10px] text-white shadow-2xl shadow-primary/20 bg-primary premium-button h-12 px-8">
              {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
              {t.reports.aiAnalyze}
            </Button>
          </div>
        </header>

        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black font-headline tracking-tight">{t.reports.profitAnalysis}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2rem]">
              <CardContent className="pt-8">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">{t.reports.revenue}</p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <p className="text-2xl font-black font-headline tracking-tighter text-emerald-500">{formatMoney(financials.revenue)} so'm</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2rem]">
              <CardContent className="pt-8">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">{t.reports.expenses}</p>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  <p className="text-2xl font-black font-headline tracking-tighter text-rose-500">{formatMoney(financials.expenses)} so'm</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none glass-card bg-primary text-white shadow-2xl shadow-primary/20 rounded-[2rem]">
              <CardContent className="pt-8">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] mb-2">{t.reports.netProfit}</p>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <p className="text-2xl font-black font-headline tracking-tighter">
                    {financials.profit >= 0 ? '+' : ''}{formatMoney(financials.profit)} so'm
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none glass-card bg-muted/20 rounded-[2rem]">
              <CardContent className="pt-8">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">Zaxira Qiymati</p>
                <p className="text-2xl font-black font-headline tracking-tighter opacity-60">{formatMoney(totalInventoryValue)} so'm</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <AnimatePresence>
          {aiResult && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
              <Card className="border-none glass-card bg-primary/5 border border-primary/20 rounded-[2.5rem] overflow-hidden">
                <CardHeader className="pt-8 px-8 bg-gradient-to-r from-primary/10 to-transparent">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/70">Intelligent Analysis</span>
                  </div>
                  <CardTitle className="font-headline font-black text-3xl tracking-tight">AI Biznes Tahlili</CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-8 pt-6">
                  <div className="p-6 rounded-[2rem] bg-background/60 backdrop-blur-xl italic font-medium shadow-sm border border-white/5">
                    "{aiResult.summary}"
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" /> Trendlar va Muammolar
                      </h4>
                      <p className="text-sm text-muted-foreground font-medium leading-relaxed">{aiResult.analysis}</p>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                        <Wand2 className="w-3.5 h-3.5" /> Strategik Tavsiyalar
                      </h4>
                      <div className="space-y-3">
                        {aiResult.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-primary/10 border border-primary/5 group hover:bg-primary/20 transition-colors">
                            <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 text-[10px] font-black group-hover:scale-110 transition-transform">{i + 1}</div>
                            <span className="text-sm font-bold">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
