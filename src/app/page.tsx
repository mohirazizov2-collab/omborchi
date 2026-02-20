"use client";

import { useEffect, useState, useMemo } from "react";
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

// Charts dynamic import for performance
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

  const stockStats = useMemo(() => [
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
  ], [t, products, productsLoading, warehouses, warehousesLoading]);

  const chartData = [
    { month: "Jan", stockIn: 400, stockOut: 240 },
    { month: "Feb", stockIn: 300, stockOut: 139 },
    { month: "Mar", stockIn: 200, stockOut: 980 },
    { month: "Apr", stockIn: 278, stockOut: 390 },
    { month: "May", stockIn: 189, stockOut: 480 },
  ];

  const lowStockItems = useMemo(() => 
    products?.filter(p => (p.stock || 0) < (p.lowStockThreshold || 10)).slice(0, 4) || []
  , [products]);

  if (!mounted || isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="space-y-1">
            <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground">{t.dashboard.title}</h1>
            <p className="text-muted-foreground font-medium text-sm">{t.dashboard.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl font-bold premium-button h-11">
              <Calendar className="w-4 h-4 mr-2" /> {t.actions.downloadReport}
            </Button>
            <Button className="rounded-xl font-black uppercase tracking-widest text-[10px] text-white shadow-lg shadow-primary/10 h-11 premium-button bg-primary">
              <Zap className="w-4 h-4 mr-2" /> {t.actions.newOperation}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stockStats.map((stat) => (
            <Card key={stat.label} className="border-none glass-card hover:bg-card/80 transition-all duration-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={cn("p-2.5 rounded-xl", stat.color)}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className={cn("flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-muted/50", stat.trendColor)}>
                    {stat.trend}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</h3>
                  <p className="text-2xl font-black font-headline tracking-tighter">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card className="border-none glass-card">
              <CardHeader className="pb-4">
                <CardTitle className="font-headline font-black text-lg tracking-tight">{t.dashboard.stockMovements}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--foreground), 0.05)" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'hsl(var(--card))', boxShadow: 'var(--shadow-lg)' }} 
                      />
                      <Bar dataKey="stockIn" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="stockOut" fill="var(--muted)" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-none glass-card h-full">
              <CardHeader className="pb-4">
                <CardTitle className="font-headline font-black text-lg tracking-tight">{t.dashboard.lowStockAlerts}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowStockItems.length > 0 ? lowStockItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                        {item.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-black truncate max-w-[100px]">{item.name}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">{item.sku}</p>
                      </div>
                    </div>
                    <Badge variant="destructive" className="h-5 text-[9px] px-1.5 font-black">{item.stock}</Badge>
                  </div>
                )) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center opacity-30">
                    <Box className="w-10 h-10 mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No Alerts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-none glass-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="font-headline font-black text-lg tracking-tight">{t.dashboard.recentMovements}</CardTitle>
            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest">History</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase bg-muted/50 text-muted-foreground font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Ref</th>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4">Product</th>
                    <th className="px-4 py-4 text-right">Qty</th>
                    <th className="px-6 py-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {movements?.map((m: any) => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-code text-[10px] font-black text-primary">#{m.id.substring(0,8)}</td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className={cn(
                          "rounded-md font-black text-[8px] uppercase px-2 py-0.5 border-none",
                          m.movementType === 'StockIn' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                        )}>
                          {m.movementType}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 font-bold text-xs">{m.productId}</td>
                      <td className={cn("px-4 py-4 text-right font-black text-xs", m.quantityChange > 0 ? "text-emerald-500" : "text-rose-500")}>
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </td>
                      <td className="px-6 py-4 text-right text-[10px] text-muted-foreground font-black">
                        {m.movementDate ? new Date(m.movementDate).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}