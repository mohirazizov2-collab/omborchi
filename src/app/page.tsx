
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
import { collection, query, limit, orderBy, where } from "firebase/firestore";
import { 
  TrendingUp, 
  Box, 
  Warehouse as WarehouseIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  Zap,
  PlusCircle,
  History,
  ArrowRightLeft,
  Search,
  Wallet,
  Users
} from "lucide-react";
import Link from "next/link";
import { ChatAssistant } from "@/components/ai/chat-assistant";

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

  // Firestore Queries
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

  const employeesQuery = useMemoFirebase(() => {
    if (!mounted || !db || !user) return null;
    return collection(db, "employees");
  }, [mounted, db, user]);
  const { data: employees, isLoading: employeesLoading } = useCollection(employeesQuery);

  const recentMovementsQuery = useMemoFirebase(() => {
    if (!mounted || !db || !user) return null;
    return query(collection(db, "stockMovements"), orderBy("movementDate", "desc"), limit(6));
  }, [mounted, db, user]);
  const { data: movements } = useCollection(recentMovementsQuery);

  // Statistics Calculation
  const stats = useMemo(() => {
    const totalVal = (products || []).reduce((acc, p) => acc + ((p.salePrice || 0) * (p.stock || 0)), 0);
    const lowStock = (products || []).filter(p => (p.stock || 0) < (p.lowStockThreshold || 10)).length;
    const totalSalary = (employees || []).reduce((acc, e) => acc + ((e.baseSalary || 0) + (e.bonus || 0) - (e.deductions || 0)), 0);
    
    return [
      { 
        label: t.dashboard.totalStockValue, 
        value: productsLoading ? "..." : `${totalVal.toLocaleString()} so'm`, 
        trend: "+3.2%", 
        trendIcon: TrendingUp,
        trendColor: "text-emerald-500",
        icon: Layers,
        color: "bg-primary/10 text-primary"
      },
      { 
        label: t.dashboard.activeWarehouses, 
        value: warehousesLoading ? "..." : (warehouses?.length || 0).toString(), 
        trend: "Normal", 
        trendIcon: Zap,
        trendColor: "text-amber-500",
        icon: WarehouseIcon,
        color: "bg-purple-500/10 text-purple-500"
      },
      { 
        label: t.dashboard.totalSalaryExpense, 
        value: employeesLoading ? "..." : `${totalSalary.toLocaleString()} so'm`, 
        trend: `${employees?.length || 0} xodim`, 
        trendIcon: Users,
        trendColor: "text-blue-500",
        icon: Wallet,
        color: "bg-emerald-500/10 text-emerald-500"
      },
      { 
        label: t.dashboard.lowStockAlerts, 
        value: productsLoading ? "..." : lowStock.toString(), 
        trend: lowStock > 0 ? "Action Req" : "Safe", 
        trendIcon: AlertTriangle,
        trendColor: lowStock > 0 ? "text-rose-500" : "text-emerald-500",
        icon: AlertTriangle,
        color: lowStock > 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
      }
    ];
  }, [t, products, productsLoading, warehouses, warehousesLoading, movements, employees, employeesLoading]);

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

  if (!mounted || isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-body transition-colors duration-500">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1"
          >
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">
              {t.dashboard.title}
            </h1>
            <p className="text-muted-foreground font-medium text-sm">
              {t.dashboard.description}
            </p>
          </motion.div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-2xl font-bold border-border/50 h-12 px-6 hover:bg-muted/50 transition-all">
              <Calendar className="w-4 h-4 mr-2" /> {t.actions.downloadReport}
            </Button>
            <Link href="/stock-in">
              <Button className="rounded-2xl font-black uppercase tracking-widest text-[10px] text-white shadow-2xl shadow-primary/20 h-12 px-8 bg-primary hover:bg-primary/90 transition-all premium-button">
                <PlusCircle className="w-4 h-4 mr-2" /> {t.actions.newOperation}
              </Button>
            </Link>
          </div>
        </header>

        {/* Quick Actions Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {quickActions.map((action, idx) => (
            <Link key={action.name} href={action.href}>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="flex items-center gap-5 p-5 rounded-[2rem] glass-card bg-card/40 backdrop-blur-xl cursor-pointer border-white/5"
              >
                <div className={cn("p-4 rounded-2xl shadow-lg", action.color)}>
                  <action.icon className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-black text-[12px] uppercase tracking-[0.2em]">{action.name}</span>
                  <p className="text-[10px] text-muted-foreground font-bold opacity-50">Quick process</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[2.5rem] hover:bg-card/60 transition-all group overflow-hidden relative">
                <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                  <stat.icon className="w-24 h-24" />
                </div>
                <CardContent className="pt-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className={cn("p-3 rounded-2xl shadow-sm", stat.color)}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className={cn("rounded-full text-[9px] font-black uppercase px-3 py-1 border-none bg-muted/30", stat.trendColor)}>
                      {stat.trend}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">{stat.label}</h3>
                    <p className="text-3xl font-black font-headline tracking-tighter">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts and Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-2">
            <Card className="border-none glass-card bg-card/40 backdrop-blur-2xl rounded-[3rem] overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center justify-between">
                  <span>{t.dashboard.stockMovements}</span>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-[9px] font-black uppercase opacity-40">In</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                      <span className="text-[9px] font-black uppercase opacity-40">Out</span>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <div className="h-[350px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--foreground), 0.05)" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 900 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 900 }} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(var(--primary), 0.05)' }}
                        contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: 'hsl(var(--card))', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', padding: '16px' }} 
                      />
                      <Bar dataKey="stockIn" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} barSize={32} />
                      <Bar dataKey="stockOut" fill="rgba(var(--foreground), 0.1)" radius={[8, 8, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-none glass-card h-full bg-card/40 backdrop-blur-2xl rounded-[3rem] overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-rose-500 animate-pulse" />
                  {t.dashboard.lowStockAlerts}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                {products?.filter(p => (p.stock || 0) < (p.lowStockThreshold || 10)).slice(0, 5).map((item: any) => (
                  <motion.div 
                    key={item.id} 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center justify-between p-4 rounded-3xl bg-muted/10 border border-transparent hover:border-primary/20 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-[11px] font-black text-rose-500 group-hover:scale-110 transition-transform">
                        {item.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate max-w-[140px]">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider opacity-50">{item.sku}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <Badge variant="destructive" className="h-7 text-[10px] px-3 font-black rounded-xl shadow-lg shadow-rose-500/10">
                        {item.stock}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
                {(products?.filter(p => (p.stock || 0) < (p.lowStockThreshold || 10)).length === 0) && (
                  <div className="py-24 flex flex-col items-center justify-center text-center opacity-10">
                    <Box className="w-16 h-16 mb-4" />
                    <p className="text-[12px] font-black uppercase tracking-[0.4em]">All Stocks Safe</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <Card className="border-none glass-card overflow-hidden bg-card/40 backdrop-blur-2xl rounded-[3rem]">
          <CardHeader className="p-8 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <History className="w-5 h-5" />
              </div>
              <CardTitle className="font-headline font-black text-xl tracking-tight">
                {t.dashboard.recentMovements}
              </CardTitle>
            </div>
            <Link href="/products">
              <Button variant="ghost" size="sm" className="text-[11px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 hover:bg-muted/50 rounded-xl px-4">
                View All <ArrowUpRight className="w-3 h-3 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase bg-muted/20 text-muted-foreground font-black tracking-[0.2em]">
                  <tr>
                    <th className="px-10 py-6">Ref ID</th>
                    <th className="px-6 py-6">Operation</th>
                    <th className="px-6 py-6">Product</th>
                    <th className="px-6 py-6 text-right">Quantity</th>
                    <th className="px-10 py-6 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  <AnimatePresence>
                    {movements?.map((m: any, idx) => (
                      <motion.tr 
                        key={m.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-primary/[0.03] transition-colors group cursor-pointer"
                      >
                        <td className="px-10 py-6 font-code text-[11px] font-black text-primary/60">
                          #{m.id.substring(0,8).toUpperCase()}
                        </td>
                        <td className="px-6 py-6">
                          <Badge variant="outline" className={cn(
                            "rounded-xl font-black text-[9px] uppercase px-3 py-1 border-none shadow-sm",
                            m.movementType === 'StockIn' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                          )}>
                            {m.movementType}
                          </Badge>
                        </td>
                        <td className="px-6 py-6 font-bold text-xs truncate max-w-[200px]">
                          {m.productId}
                        </td>
                        <td className={cn("px-6 py-6 text-right font-black text-sm", m.quantityChange > 0 ? "text-emerald-500" : "text-rose-500")}>
                          {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                        </td>
                        <td className="px-10 py-6 text-right text-[11px] text-muted-foreground font-black opacity-60">
                          {m.movementDate ? new Date(m.movementDate).toLocaleDateString() : 'N/A'}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {(!movements || movements.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-32 text-center">
                        <div className="flex flex-col items-center opacity-10">
                          <History className="w-16 h-16 mb-4" />
                          <p className="text-[12px] font-black uppercase tracking-[0.4em]">No Live Data</p>
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
      <ChatAssistant />
    </div>
  );
}
