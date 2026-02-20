"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { Download, Filter, Loader2, TrendingUp, Package, Warehouse, Wand2, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import { analyzeReports, type AnalyzeReportsOutput } from "@/ai/flows/analyze-reports-flow";

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
  const { user } = useUser();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AnalyzeReportsOutput | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) return null;

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

  const categoriesMap: Record<string, number> = {};
  (products || []).forEach(p => {
    const cat = p.categoryId || 'Boshqa';
    categoriesMap[cat] = (categoriesMap[cat] || 0) + (p.stock || 0);
  });
  const categoryData = Object.entries(categoriesMap).map(([name, value]) => ({ name, value }));

  const trendData = [
    { name: 'Dush', value: totalValue * 0.8 },
    { name: 'Sesh', value: totalValue * 0.85 },
    { name: 'Chor', value: totalValue * 0.9 },
    { name: 'Pay', value: totalValue * 0.95 },
    { name: 'Jum', value: totalValue },
  ];

  const isLoading = productsLoading || warehousesLoading;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <OmniSidebar />
      <main className="flex-1 p-10 overflow-y-auto page-transition">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">{t.reports.title}</h1>
            <p className="text-muted-foreground font-medium text-sm mt-1">{t.reports.description}</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleAiAnalyze} 
              disabled={isAiLoading || isLoading || !products?.length}
              className="rounded-xl font-black uppercase tracking-widest text-[10px] text-white shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all px-8 h-12 bg-primary premium-button"
            >
              {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
              {t.reports.aiAnalyze || 'AI Tahlil'}
            </Button>
            <Button variant="outline" className="rounded-xl font-bold bg-card border-white/5 shadow-sm hover:shadow-xl transition-all premium-button h-12">
              <Download className="w-4 h-4 mr-2" /> {t.reports.export}
            </Button>
          </div>
        </header>

        <AnimatePresence>
          {aiResult && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-10"
            >
              <Card className="border-none glass-card bg-primary/5 border border-primary/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Sparkles className="w-24 h-24 text-primary" />
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">AI Insights</span>
                  </div>
                  <CardTitle className="font-headline font-black text-2xl tracking-tight">Omborchi AI Tahlili</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 relative z-10">
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-foreground/80 leading-relaxed italic border-l-4 border-primary pl-4">
                      "{aiResult.summary}"
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Batafsil Tahlil</h4>
                      <p className="text-sm text-muted-foreground font-medium leading-relaxed">{aiResult.analysis}</p>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tavsiyalar</h4>
                      <div className="space-y-2">
                        {aiResult.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-background/40 border border-white/5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground/90">{rec}</span>
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
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <Card className="border-none glass-card hover:bg-card transition-colors group">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{t.dashboard.totalStockValue}</h3>
                  <p className="text-3xl font-black font-headline tracking-tighter mt-1">${totalValue.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="border-none glass-card hover:bg-card transition-colors group">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                      <Package className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{t.nav.products}</h3>
                  <p className="text-3xl font-black font-headline tracking-tighter mt-1">{products?.length || 0} Tur</p>
                </CardContent>
              </Card>

              <Card className="border-none glass-card hover:bg-card transition-colors group">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                      <Warehouse className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{t.dashboard.activeWarehouses}</h3>
                  <p className="text-3xl font-black font-headline tracking-tighter mt-1">{warehouses?.length || 0} Nuqta</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border-none glass-card overflow-hidden">
                <CardHeader>
                  <CardTitle className="font-headline font-black text-xl tracking-tight">{t.reports.stockValueTrend}</CardTitle>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-50">Trend Visualization</p>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--foreground), 0.03)" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 900, fill: 'var(--muted-foreground)', letterSpacing: '0.1em' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 900, fill: 'var(--muted-foreground)' }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '20px', 
                          border: 'none', 
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          backdropFilter: 'blur(20px)',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                          padding: '16px',
                          color: 'white'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="var(--primary)" 
                        strokeWidth={4} 
                        dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }} 
                        activeDot={{ r: 8, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none glass-card overflow-hidden">
                <CardHeader>
                  <CardTitle className="font-headline font-black text-xl tracking-tight">{t.reports.categoryDist}</CardTitle>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-50">Inventory Composition</p>
                </CardHeader>
                <CardContent className="h-[350px]">
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '20px', 
                            border: 'none', 
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(20px)',
                            padding: '16px',
                            color: 'white'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center flex-col gap-4 opacity-20">
                      <Package className="w-12 h-12" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Data Available</p>
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
