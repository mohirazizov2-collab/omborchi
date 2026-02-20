"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
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
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-muted-foreground animate-pulse tracking-[0.2em] uppercase">omborchi.uz</p>
        </div>
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
      color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
    },
    { 
      label: t.dashboard.monthlyStockIn, 
      value: "1,240", 
      trend: "+12%", 
      trendIcon: TrendingUp,
      trendColor: "text-emerald-500",
      icon: ArrowDownRight,
      color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
    },
    { 
      label: t.dashboard.monthlyStockOut, 
      value: "980", 
      trend: "+5%", 
      trendIcon: ArrowUpRight,
      trendColor: "text-rose-500",
      icon: ArrowUpRight,
      color: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
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
      <main className="flex-1 p-10 overflow-y-auto scroll-smooth">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest bg-primary/5 text-primary border-primary/20">Operational</Badge>
              <span className="text-xs text-muted-foreground font-bold">• {new Date().toLocaleDateString('uz-UZ', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <h1 className="text-4xl font-black font-headline tracking-tight">{t.dashboard.title}</h1>
            <p className="text-muted-foreground font-medium">{t.dashboard.description}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-xl font-bold bg-card border-none shadow-sm hover:shadow-md transition-all">
              <Calendar className="w-4 h-4 mr-2" /> {t.actions.downloadReport}
            </Button>
            <Button className="rounded-xl font-bold text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all px-6">
              <Zap className="w-4 h-4 mr-2" /> {t.actions.newOperation}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stockStats.map((stat, idx) => (
            <Card key={stat.label} className={cn("border-none shadow-sm bg-card/60 backdrop-blur-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 group", `delay-[${idx * 100}ms]`)}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-6">
                  <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", stat.color)}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div className={cn("flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-background border", stat.trendColor)}>
                    <stat.trendIcon className="w-3 h-3 mr-1" />
                    {stat.trend}
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</h3>
                  <p className="text-3xl font-black font-headline tracking-tighter">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <Card className="lg:col-span-2 border-none shadow-sm bg-card/40 backdrop-blur-md animate-in fade-in slide-in-from-left-4 duration-1000">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline font-black text-xl">{t.dashboard.stockMovements}</CardTitle>
                <p className="text-xs text-muted-foreground font-medium mt-1">Real-time inventory flow analytics</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-4">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stock In</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-muted" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stock Out</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--foreground), 0.05)" />
                    <XAxis 
                      dataKey="month" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--muted-foreground)' }} 
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--muted-foreground)' }} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(var(--primary), 0.05)' }}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        backgroundColor: 'var(--card)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        padding: '12px'
                      }} 
                    />
                    <Bar dataKey="stockIn" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={24} />
                    <Bar dataKey="stockOut" fill="var(--muted)" radius={[6, 6, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card/40 backdrop-blur-md animate-in fade-in slide-in-from-right-4 duration-1000 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="font-headline font-black text-xl">{t.dashboard.lowStockAlerts}</CardTitle>
                <p className="text-xs text-muted-foreground font-medium mt-1">Priority reorder list</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lowStockItems.length > 0 ? lowStockItems.map((item: any, idx) => (
                  <div key={item.id} className={cn("flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-transparent hover:border-rose-500/30 transition-all hover:bg-background cursor-pointer group", `animate-in slide-in-from-right-4 duration-500 delay-[${idx * 150}ms]`)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xs font-black group-hover:bg-rose-500/10 group-hover:text-rose-500 transition-colors">
                        {item.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold truncate max-w-[120px]">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase">{item.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-rose-500">{item.stock}</p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Left</p>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <Box className="w-12 h-12 text-muted/20 mb-4" />
                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">All stock levels healthy</p>
                  </div>
                )}
              </div>
              <Button variant="ghost" className="w-full mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:bg-primary/5 rounded-xl">
                {t.dashboard.viewAll} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm bg-card/30 backdrop-blur-lg animate-in fade-in slide-in-from-bottom-8 duration-1000 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline font-black text-xl">{t.dashboard.recentMovements}</CardTitle>
              <p className="text-xs text-muted-foreground font-medium mt-1">Audit log of latest inventory transactions</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg text-[10px] font-bold uppercase tracking-wider h-8">View History</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase bg-muted/30 text-muted-foreground font-black tracking-[0.1em]">
                  <tr>
                    <th className="px-8 py-4">{t.common.id}</th>
                    <th className="px-6 py-4">{t.common.type}</th>
                    <th className="px-6 py-4">{t.common.product}</th>
                    <th className="px-6 py-4">{t.common.quantity}</th>
                    <th className="px-6 py-4">{t.common.warehouse}</th>
                    <th className="px-6 py-4">{t.common.date}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {movements && movements.map((m: any) => (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-8 py-5 font-code text-xs font-bold text-primary/80 group-hover:text-primary">#{m.id.substring(0,8).toUpperCase()}</td>
                      <td className="px-6 py-5">
                        <Badge variant="outline" className={cn(
                          "rounded-lg font-bold text-[10px] uppercase tracking-wider px-2 py-0.5",
                          m.movementType === 'StockIn' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        )}>
                          {m.movementType}
                        </Badge>
                      </td>
                      <td className="px-6 py-5 font-bold text-foreground/90">{m.productId}</td>
                      <td className="px-6 py-5">
                        <span className={cn("font-black", m.quantityChange > 0 ? "text-emerald-500" : "text-rose-500")}>
                          {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-medium text-muted-foreground">{m.warehouseId}</td>
                      <td className="px-6 py-5 text-muted-foreground font-bold text-xs uppercase tracking-tighter">
                        {m.movementDate ? new Date(m.movementDate).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {(!movements || movements.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground italic font-medium">
                        No activity recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}