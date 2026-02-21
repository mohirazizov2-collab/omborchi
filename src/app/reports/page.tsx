
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { 
  FileDown, 
  Filter, 
  Loader2, 
  TrendingUp, 
  Package, 
  Warehouse, 
  Wand2, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  FileBarChart, 
  PieChart as PieIcon, 
  Activity,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Calendar
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { analyzeReports, type AnalyzeReportsOutput } from "@/ai/flows/analyze-reports-flow";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';

const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const PieChart = dynamic(() => import("recharts").then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then(m => m.Cell), { ssr: false });

const COLORS = ['#2E68B8', '#669995', '#193D3E', '#B88B2E', '#B8452E'];

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();
  const db = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();
  const router = useRouter();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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

  // Firestore Queries
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

  const movementsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "stockMovements"), orderBy("movementDate", "desc"));
  }, [db, user]);
  const { data: movements, isLoading: movementsLoading } = useCollection(movementsQuery);

  // Financial Calculations
  const financials = useMemo(() => {
    if (!movements || !products || !employees) return { revenue: 0, expenses: 0, profit: 0 };

    const now = new Date();
    const days = reportPeriod === 'weekly' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);

    // Revenue from StockOut (Chiqim)
    const revenue = movements
      .filter(m => m.movementType === 'StockOut' && new Date(m.movementDate) >= startDate)
      .reduce((acc, m) => {
        const product = products.find(p => p.id === m.productId);
        const price = product?.salePrice || 0;
        return acc + (Math.abs(m.quantityChange) * price);
      }, 0);

    // Expenses (Total Salaries)
    const expenses = employees.reduce((acc, e) => {
      const monthlyTotal = (e.baseSalary || 0) + (e.bonus || 0) - (e.deductions || 0);
      // Agar haftalik bo'lsa, oylik xarajatni 4 ga bo'lamiz (taxminiy)
      return acc + (reportPeriod === 'weekly' ? monthlyTotal / 4 : monthlyTotal);
    }, 0);

    return {
      revenue,
      expenses,
      profit: revenue - expenses
    };
  }, [movements, products, employees, reportPeriod]);

  const totalValue = (products || []).reduce((acc, p) => acc + (p.salePrice * (p.stock || 0)), 0);
  const lowStockCount = (products || []).filter(p => (p.stock || 0) < (p.lowStockThreshold || 10)).length;

  const handleAiAnalyze = async () => {
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
          totalValue,
          warehouseCount: warehouses?.length || 0,
          productCount: products.length,
          lowStockCount,
        },
        topProducts
      });
      setAiResult(result);
    } catch (error) {
      console.error("AI Analysis error:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!mounted || authLoading || role === "Omborchi") {
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
          <div className="flex items-center gap-3">
            <div className="bg-muted/30 p-1.5 rounded-2xl flex gap-1 mr-4 border border-border/40">
              <Button 
                variant={reportPeriod === 'weekly' ? 'secondary' : 'ghost'} 
                size="sm" 
                className={cn(
                  "rounded-xl text-[10px] font-black uppercase h-10 px-4",
                  reportPeriod === 'weekly' && "bg-background shadow-sm"
                )}
                onClick={() => setReportPeriod('weekly')}
              >
                {t.reports.weekly}
              </Button>
              <Button 
                variant={reportPeriod === 'monthly' ? 'secondary' : 'ghost'} 
                size="sm" 
                className={cn(
                  "rounded-xl text-[10px] font-black uppercase h-10 px-4",
                  reportPeriod === 'monthly' && "bg-background shadow-sm"
                )}
                onClick={() => setReportPeriod('monthly')}
              >
                {t.reports.monthly}
              </Button>
            </div>
            <Button 
              onClick={handleAiAnalyze} 
              disabled={isAiLoading || isLoading || !products?.length}
              className="rounded-2xl font-black uppercase tracking-widest text-[10px] text-white shadow-2xl shadow-primary/20 bg-primary premium-button h-12 px-8"
            >
              {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
              {t.reports.aiAnalyze}
            </Button>
          </div>
        </header>

        {/* Profit Analysis Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black font-headline tracking-tight">{t.reports.profitAnalysis}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none glass-card bg-card/40 backdrop-blur-xl relative overflow-hidden group rounded-[2rem]">
              <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                <ArrowUpRight className="w-32 h-32 text-emerald-500" />
              </div>
              <CardContent className="pt-8">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">{t.reports.revenue}</p>
                <p className="text-3xl font-black font-headline tracking-tighter text-emerald-500">{financials.revenue.toLocaleString()} so'm</p>
                <div className="mt-4 flex items-center gap-2 text-emerald-500 font-bold text-[11px]">
                  <TrendingUp className="w-3.5 h-3.5" /> 
                  <span>{reportPeriod === 'weekly' ? 'Haftalik sotuv' : 'Oylik sotuv'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none glass-card bg-card/40 backdrop-blur-xl relative overflow-hidden group rounded-[2rem]">
              <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                <ArrowDownRight className="w-32 h-32 text-rose-500" />
              </div>
              <CardContent className="pt-8">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">{t.reports.expenses}</p>
                <p className="text-3xl font-black font-headline tracking-tighter text-rose-500">{financials.expenses.toLocaleString()} so'm</p>
                <div className="mt-4 flex items-center gap-2 text-rose-500 font-bold text-[11px]">
                  <Wallet className="w-3.5 h-3.5" /> 
                  <span>{reportPeriod === 'weekly' ? 'Taxminiy haftalik xarajat' : 'Oylik ish haqi fondi'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none glass-card bg-primary text-white relative overflow-hidden group shadow-2xl shadow-primary/20 rounded-[2rem]">
              <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Sparkles className="w-32 h-32" />
              </div>
              <CardContent className="pt-8">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] mb-2">{t.reports.netProfit}</p>
                <p className="text-3xl font-black font-headline tracking-tighter">
                  {financials.profit > 0 ? '+' : ''}{financials.profit.toLocaleString()} so'm
                </p>
                <div className="mt-4 flex items-center gap-2 text-white/80 font-bold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 
                  <span>Balans: {financials.profit > 0 ? 'Ijobiy' : 'Salbiy'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <AnimatePresence>
          {aiResult && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-12"
            >
              <Card className="border-none glass-card bg-primary/5 border border-primary/20 overflow-hidden relative rounded-[2.5rem]">
                <CardHeader className="pt-8 px-8">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/70">Intelligent Analysis</span>
                  </div>
                  <CardTitle className="font-headline font-black text-3xl tracking-tight">AI Xulosasi</CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-8 relative z-10">
                  <div className="p-6 rounded-[2rem] bg-background/40 backdrop-blur-xl border border-white/5 italic font-medium leading-relaxed shadow-sm">
                    "{aiResult.summary}"
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Trendlar
                      </h4>
                      <p className="text-sm text-muted-foreground font-medium leading-relaxed whitespace-pre-wrap">{aiResult.analysis}</p>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Strategik Tavsiyalar
                      </h4>
                      <div className="space-y-3">
                        {aiResult.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-primary/10 border border-primary/10">
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

        {isLoading ? (
          <div className="flex h-[400px] items-center justify-center opacity-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2rem]">
              <CardContent className="pt-8">
                <div className="flex justify-between items-start mb-8">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                </div>
                <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">{t.dashboard.totalStockValue}</h3>
                <p className="text-3xl font-black font-headline tracking-tighter mt-2">{totalValue.toLocaleString()} so'm</p>
              </CardContent>
            </Card>

            <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2rem]">
              <CardContent className="pt-8">
                <div className="flex justify-between items-start mb-8">
                  <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                    <Package className="w-7 h-7" />
                  </div>
                </div>
                <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">{t.nav.products}</h3>
                <p className="text-3xl font-black font-headline tracking-tighter mt-2">{products?.length || 0} Skus</p>
              </CardContent>
            </Card>

            <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2rem]">
              <CardContent className="pt-8">
                <div className="flex justify-between items-start mb-8">
                  <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-500">
                    <Warehouse className="w-7 h-7" />
                  </div>
                </div>
                <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">{t.dashboard.activeWarehouses}</h3>
                <p className="text-3xl font-black font-headline tracking-tighter mt-2">{warehouses?.length || 0} ta Hub</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
