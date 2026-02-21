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
  Zap,
  PlusCircle,
  History,
  ArrowRightLeft
} from "lucide-react";
import Link from "next/link";

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

  const quickActions = [
    { name: t.nav.stockIn, href: "/stock-in", icon: PlusCircle, color: "bg-emerald-500/10 text-emerald-500" },
    { name: t.nav.stockOut, href: "/stock-out", icon: History, color: "bg-rose-500/10 text-rose-500" },
    { name: t.nav.transfers, href: "/transfers", icon: ArrowRightLeft, color: "bg-blue-500/10 text-blue-500" },
  ];

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
    <div className="flex min-h-screen bg-background text-foreground font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="space-y-1">
            <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground">{t.dashboard.title}</h1>
            <p className="text-muted-foreground font-medium text-sm">{t.dashboard.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl font-bold premium-button h-11 border-border/50">
              <Calendar className="w-4 h-4 mr-2" /> {t.actions.downloadReport}
            </Button>
            <Button className="rounded-xl font-black uppercase tracking-widest text-[10px] text-white shadow-xl shadow-primary/20 h-11 premium-button bg-primary hover:bg-primary/90">
              <PlusCircle className="w-4 h-4 mr-2" /> {t.actions.newOperation}
            </Button>
          </div>
        </header>

        {/* Quick Actions Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {quickActions.map((action) => (
            <Link key={action.name} href={action.href}>
              <motion.div 
                whileHover={{ y: -4 }}
                className="flex items-center gap-4 p-4 rounded-2xl glass-card bg-card/50 cursor-pointer"
              >
                <div className={cn("p-3 rounded-xl", action.color)}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="font-black text-[11px] uppercase tracking-widest">{action.name}</span>
              </motion.div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stockStats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="border-none glass-card hover:bg-card/80 transition-all duration-200">
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
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card className="border-none glass-card bg-card/40 backdrop-blur-xl">
              <CardHeader className="pb-4">
                <CardTitle className="font-headline font-black text-lg tracking-tight">{t.dashboard.stockMovements}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--foreground), 0.05)" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 700 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 700 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: 'hsl(var(--card))', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)' }} 
                      />
                      <Bar dataKey="stockIn" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={24} />
                      <Bar dataKey="stockOut" fill="hsl(var(--muted-foreground) / 0.2)" radius={[6, 6, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-none glass-card h-full bg-card/40 backdrop-blur-xl">
              <CardHeader className="pb-4">
                <CardTitle className="font-headline font-black text-lg tracking-tight flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  {t.dashboard.lowStockAlerts}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lowStockItems.length > 0 ? lowStockItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/20 border border-transparent hover:border-primary/20 transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary group-hover:scale-110 transition-transform">
                        {item.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-black truncate max-w-[120px]">{item.name}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">{item.sku}</p>
                      </div>
                    </div>
                    <Badge variant="destructive" className="h-6 text-[10px] px-2 font-black rounded-lg">{item.stock}</Badge>
                  </div>
                )) : (
                  <div className="py-16 flex flex-col items-center justify-center text-center opacity-20">
                    <Box className="w-12 h-12 mb-3" />
                    <p className="text-[11px] font-black uppercase tracking-[0.3em]">No Alerts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-none glass-card overflow-hidden bg-card/40 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="font-headline font-black text-lg tracking-tight">{t.dashboard.recentMovements}</CardTitle>
            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100">
              <History className="w-3.5 h-3.5 mr-1.5" /> History
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase bg-muted/30 text-muted-foreground font-black tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-5">Ref ID</th>
                    <th className="px-4 py-5">Operation</th>
                    <th className="px-4 py-5">Product</th>
                    <th className="px-4 py-5 text-right">Quantity</th>
                    <th className="px-8 py-5 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {movements?.map((m: any) => (
                    <tr key={m.id} className="hover:bg-primary/[0.02] transition-colors group">
                      <td className="px-8 py-5 font-code text-[10px] font-black text-primary/70">#{m.id.substring(0,8)}</td>
                      <td className="px-4 py-5">
                        <Badge variant="outline" className={cn(
                          "rounded-lg font-black text-[9px] uppercase px-2.5 py-0.5 border-none",
                          m.movementType === 'StockIn' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                        )}>
                          {m.movementType}
                        </Badge>
                      </td>
                      <td className="px-4 py-5 font-bold text-xs">{m.productId}</td>
                      <td className={cn("px-4 py-5 text-right font-black text-xs", m.quantityChange > 0 ? "text-emerald-500" : "text-rose-500")}>
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </td>
                      <td className="px-8 py-5 text-right text-[10px] text-muted-foreground font-black">
                        {m.movementDate ? new Date(m.movementDate).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {(!movements || movements.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center opacity-20">
                          <History className="w-10 h-10 mb-2" />
                          <p className="text-[10px] font-black uppercase tracking-widest">No recent data</p>
                        </div>
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