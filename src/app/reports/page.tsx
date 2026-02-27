
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
  FileDown,
  Table as TableIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Download
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { analyzeReports, type AnalyzeReportsOutput } from "@/ai/flows/analyze-reports-flow";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

  const productsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "products");
  }, [db, user]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const warehousesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "warehouses");
  }, [db, user]);
  const { data: warehouses, isLoading: warehousesLoading } = useCollection(warehousesQuery);

  const employeesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "employees");
  }, [db, user]);
  const { data: employees } = useCollection(employeesQuery);

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "expenses");
  }, [db, user]);
  const { data: operationalExpenses } = useCollection(expensesQuery);

  const movementsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "stockMovements"), orderBy("movementDate", "desc"));
  }, [db, user]);
  const { data: movements, isLoading: movementsLoading } = useCollection(movementsQuery);

  const financials = useMemo(() => {
    if (!movements || !products) return { revenue: 0, expenses: 0, profit: 0 };

    const now = Date.now();
    const days = reportPeriod === 'weekly' ? 7 : 30;
    const thresholdDate = now - (days * 24 * 60 * 60 * 1000);

    let revenue = 0;
    movements.forEach(m => {
      if (m.movementType === 'StockOut' && new Date(m.movementDate).getTime() >= thresholdDate) {
        revenue += Math.abs(m.quantityChange || 0) * (m.unitPrice || 0);
      }
    });

    let opsExpenses = 0;
    operationalExpenses?.forEach(ex => {
      if (new Date(ex.date).getTime() >= thresholdDate) {
        opsExpenses += (ex.amount || 0);
      }
    });

    let salaryExpenses = 0;
    employees?.forEach(e => {
      const monthlyTotal = (e.baseSalary || 0);
      salaryExpenses += (reportPeriod === 'weekly' ? monthlyTotal / 4 : monthlyTotal);
    });

    const totalExpenses = opsExpenses + salaryExpenses;

    return { 
      revenue, 
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
      const topProducts = products.slice(0, 5).map(p => ({
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
    const XLSX = (await import("xlsx")).default;
    const data = [
      ["Hisobot turi", "Qiymat"],
      ["Davr", reportPeriod === 'weekly' ? "Haftalik" : "Oylik"],
      ["Sotuv tushumi", financials.revenue],
      ["Xarajatlar", financials.expenses],
      ["Sof foyda", financials.profit],
      ["Jami zaxira qiymati", totalInventoryValue],
      ["Mahsulot turlari", products?.length || 0],
      ["Faol omborlar", warehouses?.length || 0]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
    XLSX.writeFile(wb, `Hisobot_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "Excel yuklandi" });
  };

  const exportToPDF = async () => {
    const jsPDFLib = (await import("jspdf")).default;
    const doc = new jsPDFLib();
    
    doc.setFontSize(20);
    doc.text("MOLIYAVIY HISOBOT", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Davr: ${reportPeriod === 'weekly' ? 'Haftalik' : 'Oylik'}`, 20, 40);
    doc.text(`Sana: ${new Date().toLocaleDateString()}`, 20, 47);

    doc.line(20, 55, 190, 55);
    doc.text(`Sotuv tushumi:`, 20, 65); doc.text(`${formatMoney(financials.revenue)} so'm`, 140, 65);
    doc.text(`Xarajatlar:`, 20, 72); doc.text(`${formatMoney(financials.expenses)} so'm`, 140, 72);
    doc.setFont("helvetica", "bold");
    doc.text(`SOF FOYDA:`, 20, 82); doc.text(`${formatMoney(financials.profit)} so'm`, 140, 82);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Zaxira qiymati:`, 20, 95); doc.text(`${formatMoney(totalInventoryValue)} so'm`, 140, 95);

    if (aiResult) {
      doc.addPage();
      doc.setFontSize(18);
      doc.text("AI TAHLIL XULOSASI", 105, 20, { align: "center" });
      doc.setFontSize(10);
      const splitSummary = doc.splitTextToSize(aiResult.summary, 170);
      doc.text(splitSummary, 20, 40);
      
      doc.text("TAVSIYALAR:", 20, 80);
      aiResult.recommendations.forEach((rec, i) => {
        doc.text(`${i+1}. ${rec}`, 20, 90 + (i * 7));
      });
    }

    doc.save(`Hisobot_${Date.now()}.pdf`);
    toast({ title: "PDF yuklandi" });
  };

  const formatMoney = (val: number) => val.toLocaleString().replace(/,/g, ' ');

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
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl" onClick={exportToPDF} title="PDF">
                <FileText className="w-5 h-5 text-rose-600" />
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
                    {financials.profit > 0 ? '+' : ''}{formatMoney(financials.profit)} so'm
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none glass-card bg-muted/20 rounded-[2rem]">
              <CardContent className="pt-8">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">{t.dashboard.totalStockValue}</p>
                <p className="text-2xl font-black font-headline tracking-tighter opacity-60">{formatMoney(totalInventoryValue)} so'm</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <AnimatePresence>
          {aiResult && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
              <Card className="border-none glass-card bg-primary/5 border border-primary/20 rounded-[2.5rem]">
                <CardHeader className="pt-8 px-8">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/70">Intelligent Analysis</span>
                  </div>
                  <CardTitle className="font-headline font-black text-3xl tracking-tight">AI Xulosasi</CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-8">
                  <div className="p-6 rounded-[2rem] bg-background/40 backdrop-blur-xl italic font-medium shadow-sm">
                    "{aiResult.summary}"
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                      <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Trendlar</h4>
                      <p className="text-sm text-muted-foreground font-medium leading-relaxed">{aiResult.analysis}</p>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Strategik Tavsiyalar</h4>
                      <div className="space-y-3">
                        {aiResult.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-primary/10">
                            <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 text-[10px] font-black">{i + 1}</div>
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
