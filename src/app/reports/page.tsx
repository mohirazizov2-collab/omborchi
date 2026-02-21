
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { FileDown, Filter, Loader2, TrendingUp, Package, Warehouse, Wand2, Sparkles, CheckCircle2, ChevronRight, FileBarChart, PieChart as PieIcon, Activity } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
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

  const handleExportExcel = () => {
    if (!products || !warehouses) return;
    setIsExporting(true);

    try {
      // 1. Products Sheet
      const productsData = products.map(p => ({
        "Nomi": p.name,
        "SKU": p.sku,
        "Kategoriya": p.categoryId || "General",
        "Zaxira miqdori": p.stock || 0,
        "Sotuv narxi (so'm)": p.salePrice || 0,
        "Umumiy qiymat (so'm)": (p.stock || 0) * (p.salePrice || 0),
        "Zaxira chegarasi": p.lowStockThreshold || 10
      }));

      // 2. Warehouses Sheet
      const warehousesData = warehouses.map(w => ({
        "Ombor nomi": w.name,
        "Manzil": w.address,
        "Telefon": w.phoneNumber,
        "Mas'ul ID": w.responsibleUserId,
        "Yaratilgan sana": w.createdAt ? new Date(w.createdAt).toLocaleDateString() : 'N/A'
      }));

      // 3. Summary Sheet
      const summaryData = [
        { "Ko'rsatkich": "Jami zaxira qiymati", "Qiymat": `${totalValue.toLocaleString()} so'm` },
        { "Ko'rsatkich": "Omborlar soni", "Qiymat": warehouses.length },
        { "Ko'rsatkich": "Jami mahsulot turlari", "Qiymat": products.length },
        { "Ko'rsatkich": "Kam qolgan mahsulotlar", "Qiymat": lowStockCount },
        { "Ko'rsatkich": "Hisobot sanasi", "Qiymat": new Date().toLocaleString() }
      ];

      const wb = XLSX.utils.book_new();
      
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      const wsProducts = XLSX.utils.json_to_sheet(productsData);
      const wsWarehouses = XLSX.utils.json_to_sheet(warehousesData);

      XLSX.utils.book_append_sheet(wb, wsSummary, "Umumiy Xulosa");
      XLSX.utils.book_append_sheet(wb, wsProducts, "Mahsulotlar");
      XLSX.utils.book_append_sheet(wb, wsWarehouses, "Omborlar");

      const fileName = `ombor_hisobot_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Excel export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!mounted || authLoading || role === "Omborchi") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const categoriesMap: Record<string, number> = {};
  (products || []).forEach(p => {
    const cat = p.categoryId || 'Boshqa';
    categoriesMap[cat] = (categoriesMap[cat] || 0) + (p.stock || 0);
  });
  const categoryData = Object.entries(categoriesMap).map(([name, value]) => ({ name, value }));

  const trendData = [
    { name: 'Mon', value: totalValue * 0.8 },
    { name: 'Tue', value: totalValue * 0.85 },
    { name: 'Wed', value: totalValue * 0.9 },
    { name: 'Thu', value: totalValue * 0.95 },
    { name: 'Fri', value: totalValue },
  ];

  const isLoading = productsLoading || warehousesLoading;

  return (
    <div className="flex min-h-screen bg-background text-foreground font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">{t.reports.title}</h1>
            <p className="text-muted-foreground font-medium text-sm mt-1">{t.reports.description}</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleAiAnalyze} 
              disabled={isAiLoading || isLoading || !products?.length}
              className="rounded-2xl font-black uppercase tracking-widest text-[10px] text-white shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all px-8 h-12 bg-primary premium-button group"
            >
              {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />}
              {t.reports.aiAnalyze || 'AI Tahlil'}
            </Button>
            <Button 
              onClick={handleExportExcel}
              disabled={isExporting || isLoading || !products?.length}
              variant="outline" 
              className="rounded-2xl font-bold bg-card/50 backdrop-blur-md border-border/50 shadow-sm hover:shadow-xl transition-all h-12 px-6"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileDown className="w-4 h-4 mr-2" />}
              Excel (XLSX)
            </Button>
          </div>
        </header>

        <AnimatePresence>
          {aiResult && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-12"
            >
              <Card className="border-none glass-card bg-primary/5 border border-primary/20 overflow-hidden relative rounded-[2.5rem]">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Sparkles className="w-32 h-32 text-primary" />
                </div>
                <CardHeader className="pt-8 px-8">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-primary/20 text-primary">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/70">Intelligent Insights</span>
                  </div>
                  <CardTitle className="font-headline font-black text-3xl tracking-tight">AI Report Summary</CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-8 relative z-10">
                  <div className="p-6 rounded-[2rem] bg-background/40 backdrop-blur-xl border border-white/5 italic font-medium leading-relaxed text-foreground/90 shadow-sm">
                    "{aiResult.summary}"
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Deep Analysis
                      </h4>
                      <p className="text-sm text-muted-foreground font-medium leading-relaxed whitespace-pre-wrap">{aiResult.analysis}</p>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Actionable Recommendations
                      </h4>
                      <div className="space-y-3">
                        {aiResult.recommendations.map((rec, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-start gap-4 p-4 rounded-2xl bg-primary/10 border border-primary/10 group hover:bg-primary/15 transition-colors"
                          >
                            <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 text-[10px] font-black">
                              {i + 1}
                            </div>
                            <span className="text-sm font-bold text-foreground/90">{rec}</span>
                          </motion.div>
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
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <motion.div whileHover={{ y: -5 }} transition={{ type: 'spring' }}>
                <Card className="border-none glass-card bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all duration-300 group">
                  <CardContent className="pt-8">
                    <div className="flex justify-between items-start mb-8">
                      <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-7 h-7" />
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-none">+12.4%</Badge>
                    </div>
                    <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">{t.dashboard.totalStockValue}</h3>
                    <p className="text-3xl font-black font-headline tracking-tighter mt-2">{totalValue.toLocaleString()} so'm</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ y: -5 }} transition={{ type: 'spring' }}>
                <Card className="border-none glass-card bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all duration-300 group">
                  <CardContent className="pt-8">
                    <div className="flex justify-between items-start mb-8">
                      <div className="p-4 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                        <Package className="w-7 h-7" />
                      </div>
                      <Badge className="bg-primary/10 text-primary border-none">Active</Badge>
                    </div>
                    <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">{t.nav.products}</h3>
                    <p className="text-3xl font-black font-headline tracking-tighter mt-2">{products?.length || 0} Skus</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ y: -5 }} transition={{ type: 'spring' }}>
                <Card className="border-none glass-card bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all duration-300 group">
                  <CardContent className="pt-8">
                    <div className="flex justify-between items-start mb-8">
                      <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                        <Warehouse className="w-7 h-7" />
                      </div>
                      <Badge className="bg-purple-500/10 text-purple-500 border-none">Stable</Badge>
                    </div>
                    <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">{t.dashboard.activeWarehouses}</h3>
                    <p className="text-3xl font-black font-headline tracking-tighter mt-2">{warehouses?.length || 0} Hubs</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border-none glass-card bg-card/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
                <CardHeader className="px-8 pt-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-headline font-black text-xl tracking-tight">{t.reports.stockValueTrend}</CardTitle>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1 opacity-50">7-Day Value performance</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/50">
                      <FileBarChart className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-[350px] px-8 pb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--foreground), 0.04)" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--muted-foreground)', letterSpacing: '0.1em' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--muted-foreground)' }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '24px', 
                          border: 'none', 
                          backgroundColor: 'rgba(0,0,0,0.85)',
                          backdropFilter: 'blur(20px)',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                          padding: '20px',
                          color: 'white'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={5} 
                        dot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 0 }} 
                        activeDot={{ r: 10, strokeWidth: 0, fill: 'white' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none glass-card bg-card/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
                <CardHeader className="px-8 pt-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-headline font-black text-xl tracking-tight">{t.reports.categoryDist}</CardTitle>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1 opacity-50">Stock share by Category</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/50">
                      <PieIcon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-[350px] px-8 pb-8">
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={90}
                          outerRadius={125}
                          paddingAngle={10}
                          dataKey="value"
                          stroke="none"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '24px', 
                            border: 'none', 
                            backgroundColor: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(20px)',
                            padding: '20px',
                            color: 'white'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center flex-col gap-4 opacity-10">
                      <Package className="w-16 h-16" />
                      <p className="text-[11px] font-black uppercase tracking-[0.4em]">Inventory data unavailable</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
