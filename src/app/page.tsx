
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, limit, orderBy } from "firebase/firestore";
import { 
  TrendingUp, 
  Box, 
  Warehouse as WarehouseIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle,
  ChevronRight,
  Loader2,
  Calendar,
  Layers,
  Zap
} from "lucide-react";

const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  const warehousesQuery = useMemoFirebase(() => {
    if (!mounted || !db || !user) return null;
    return collection(db, "warehouses");
  }, [mounted, db, user]);
  const { data: warehouses, isLoading: warehousesLoading } = useCollection(warehousesQuery);

  const productsQuery = useMemoFirebase(() => {
    if (!mounted || !db || !user) return null;
    return collection(db, "products");
  }, [mounted, db, user]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const recentMovementsQuery = useMemoFirebase(() => {
    if (!mounted || !db || !user) return null;
    return query(collection(db, "stockMovements"), orderBy("movementDate", "desc"), limit(5));
  }, [mounted, db, user]);
  const { data: movements } = useCollection(recentMovementsQuery);

  if (!mounted || isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0, 0.5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
            />
          </div>
          <p className="text-sm font-black text-muted-foreground animate-pulse tracking-[0.4em] uppercase">omborchi.uz</p>
        </motion.div>
      </div>
    );
  }

  const stockStats = [
    { 
      label: t.dashboard.totalStockValue, 
      value: productsLoading ? "..." : `$${(products || []).reduce((acc, p) => acc + (p.salePrice * (p.stock || 0)), 0).toLocaleString()}`, 
      trend: "+2.5%", 
      trendIcon: TrendingUp,
      trendColor: "text-emerald-500",
      icon: Layers,
      color: "bg-primary/10 text-primary"
    },
    { 
      label: t.dashboard.activeWarehouses, 
      value: warehousesLoading ? "..." : (warehouses?.length || 0).toString(), 
      trend: "Stable", 
      trendIcon: Zap,
      trendColor: "text-amber-500",
      icon: WarehouseIcon,
      color: "bg-purple-500/10 text-purple-500"
    },
    { 
      label: t.dashboard.monthlyStockIn, 
      value: "1,240", 
      trend: "+12%", 
      trendIcon: TrendingUp,
      trendColor: "text-emerald-500",
      icon: ArrowDownRight,
      color: "bg-emerald-500/10 text-emerald-500"
    },
    { 
      label: t.dashboard.monthlyStockOut, 
      value: "980", 
      trend: "+5%", 
      trendIcon: ArrowUpRight,
      trendColor: "text-rose-500",
      icon: ArrowUpRight,
      color: "bg-rose-500/10 text-rose-500"
    },
  ];

  const chartData = [
    { month: "Jan", stockIn: 400, stockOut: 240 },
    { month: "Feb", stockIn: 300, stockOut: 139 },
    { month: "Mar", stockIn: 200, stockOut: 980 },
    { month: "Apr", stockIn: 278, stockOut: 390 },
    { month: "May", stockIn: 189, stockOut: 480 },
  ];

  const lowStockItems = products?.filter(p => (p.stock || 0) < (p.lowStockThreshold || 10)).slice(0, 4) || [];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <OmniSidebar />
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex-1 p-10 overflow-y-auto"
      >
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="space-y-1">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 mb-1"
            >
              <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest bg-primary/5 text-primary border-primary/20 px-3">Operational</Badge>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-50">• {new Date().toLocaleDateString('uz-UZ', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </motion.div>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">{t.dashboard.title}</h1>
            <p className="text-muted-foreground font-medium text-sm">{t.dashboard.description}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-xl font-bold bg-card border-white/5 shadow-sm hover:shadow-xl transition-all premium-button">
              <Calendar className="w-4 h-4 mr-2" /> {t.actions.downloadReport}
            </Button>
            <Button className="rounded-xl font-black uppercase tracking-widest text-[10px] text-white shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all px-8 h-12 premium-button bg-primary">
              <Zap className="w-4 h-4 mr-2" /> {t.actions.newOperation}
            </Button>
          </div>
        </header>

        <motion.div 
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.05 }
            }
          }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10"
        >
          {stockStats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <Card className="border-none glass-card hover:bg-card group transition-colors">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300", stat.color)}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <div className={cn("flex items-center px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-background border border-white/5 shadow-inner", stat.trendColor)}>
                      <stat.trendIcon className="w-3 h-3 mr-1" />
                      {stat.trend}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</h3>
                    <p className="text-3xl font-black font-headline tracking-tighter">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="border-none glass-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-8">
                <div>
                  <CardTitle className="font-headline font-black text-xl tracking-tight">{t.dashboard.stockMovements}</CardTitle>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-50">Real-time flow analytics</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">In</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Out</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--foreground), 0.03)" />
                      <XAxis 
                        dataKey="month" 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fontSize: 9, fontWeight: 900, fill: 'var(--muted-foreground)', letterSpacing: '0.1em' }} 
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fontSize: 9, fontWeight: 900, fill: 'var(--muted-foreground)' }} 
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(var(--primary), 0.03)' }}
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
                      <Bar dataKey="stockIn" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={24} />
                      <Bar dataKey="stockOut" fill="rgba(var(--foreground), 0.1)" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-none glass-card overflow-hidden h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-6">
                <div>
                  <CardTitle className="font-headline font-black text-xl tracking-tight">{t.dashboard.lowStockAlerts}</CardTitle>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-50">Priority action</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/10">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {lowStockItems.length > 0 ? lowStockItems.map((item: any, idx) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-2xl bg-background/40 border border-white/5 hover:border-rose-500/30 transition-all hover:bg-background/80 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-[10px] font-black group-hover:bg-rose-500/10 group-hover:text-rose-500 transition-colors">
                          {item.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black truncate max-w-[120px] text-foreground">{item.name}</p>
                          <p className="text-[9px] text-muted-foreground font-black tracking-[0.2em] uppercase opacity-50">{item.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-rose-500">{item.stock}</p>
                        <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest opacity-50">Units</p>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                      <Box className="w-12 h-12 text-muted/20 mb-4" />
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Healthy Levels</p>
                    </div>
                  )}
                </AnimatePresence>
                <Button variant="ghost" className="w-full mt-4 text-[9px] font-black uppercase tracking-[0.3em] text-primary hover:bg-primary/5 rounded-xl premium-button">
                  {t.dashboard.viewAll} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-none glass-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline font-black text-xl tracking-tight">{t.dashboard.recentMovements}</CardTitle>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-50">Verified audit log</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg text-[9px] font-black uppercase tracking-widest h-8 px-4 premium-button border-white/5">History</Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[9px] uppercase bg-muted/30 text-muted-foreground font-black tracking-[0.2em]">
                    <tr>
                      <th className="px-8 py-5">Reference</th>
                      <th className="px-6 py-5">Activity</th>
                      <th className="px-6 py-5">Item</th>
                      <th className="px-6 py-5 text-right">Qty</th>
                      <th className="px-6 py-5">Node</th>
                      <th className="px-6 py-5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {movements && movements.map((m: any, idx: number) => (
                      <motion.tr 
                        key={m.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 + idx * 0.05 }}
                        className="hover:bg-primary/[0.02] transition-colors group cursor-pointer"
                      >
                        <td className="px-8 py-5 font-code text-[11px] font-black text-primary/70 group-hover:text-primary uppercase tracking-tight">#{m.id.substring(0,8)}</td>
                        <td className="px-6 py-5">
                          <Badge variant="outline" className={cn(
                            "rounded-lg font-black text-[9px] uppercase tracking-widest px-3 py-1 border-none shadow-sm",
                            m.movementType === 'StockIn' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                          )}>
                            {m.movementType}
                          </Badge>
                        </td>
                        <td className="px-6 py-5 font-bold text-foreground/90 text-sm">{m.productId}</td>
                        <td className="px-6 py-5 text-right">
                          <span className={cn("font-black text-sm", m.quantityChange > 0 ? "text-emerald-500" : "text-rose-500")}>
                            {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                          </span>
                        </td>
                        <td className="px-6 py-5 font-bold text-muted-foreground text-xs uppercase tracking-wider opacity-60">{m.warehouseId}</td>
                        <td className="px-6 py-5 text-right text-[10px] text-muted-foreground font-black uppercase tracking-tighter opacity-40">
                          {m.movementDate ? new Date(m.movementDate).toLocaleString('uz-UZ', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : 'N/A'}
                        </td>
                      </motion.tr>
                    ))}
                    {(!movements || movements.length === 0) && (
                      <tr>
                        <td colSpan={6} className="px-6 py-24 text-center">
                          <Box className="w-12 h-12 text-muted/10 mx-auto mb-4" />
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">No activity detected</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.main>
    </div>
  );
}
