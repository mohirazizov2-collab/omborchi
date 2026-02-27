
"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { 
  Warehouse as WarehouseIcon, 
  AlertTriangle,
  Loader2,
  Layers,
  PlusCircle,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

// Recharts components
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

  // Data fetching
  const warehousesQuery = useMemoFirebase(() => (mounted && db && user) ? collection(db, "warehouses") : null, [mounted, db, user]);
  const productsQuery = useMemoFirebase(() => (mounted && db && user) ? collection(db, "products") : null, [mounted, db, user]);
  const employeesQuery = useMemoFirebase(() => (mounted && db && user) ? collection(db, "employees") : null, [mounted, db, user]);
  const movementsQuery = useMemoFirebase(() => (mounted && db && user) ? collection(db, "stockMovements") : null, [mounted, db, user]);
  const expensesQuery = useMemoFirebase(() => (mounted && db && user) ? collection(db, "expenses") : null, [mounted, db, user]);

  const { data: warehouses } = useCollection(warehousesQuery);
  const { data: products } = useCollection(productsQuery);
  const { data: employees } = useCollection(employeesQuery);
  const { data: movements } = useCollection(movementsQuery);
  const { data: expenses } = useCollection(expensesQuery);

  const formatMoney = (val: number) => Math.floor(val).toLocaleString().replace(/,/g, ' ');

  // Calculate dynamic chart data based on movements
  const chartData = useMemo(() => {
    if (!movements) return [];
    
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return {
        name: format(d, 'MMM'),
        monthIdx: d.getMonth(),
        year: d.getFullYear(),
        in: 0,
        out: 0
      };
    });

    movements.forEach(m => {
      const mDate = new Date(m.movementDate);
      const monthLabel = format(mDate, 'MMM');
      const year = mDate.getFullYear();
      
      const monthData = months.find(d => d.name === monthLabel && d.year === year);
      if (monthData) {
        if (m.movementType === 'StockIn') monthData.in += (m.quantityChange || 0);
        if (m.movementType === 'StockOut') monthData.out += Math.abs(m.quantityChange || 0);
      }
    });

    return months;
  }, [movements]);

  // Comprehensive stats
  const stats = useMemo(() => {
    if (!products || !movements) return [];
    
    const totalInventoryVal = products?.reduce((acc, p) => acc + ((p.salePrice || 0) * (p.stock || 0)), 0) || 0;
    const lowStock = products?.filter(p => (p.stock || 0) < (p.lowStockThreshold || 10)).length || 0;
    
    // Financials for current month
    const thisMonthInterval = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
    
    const monthlyRevenue = movements
      ?.filter(m => m.movementType === 'StockOut' && isWithinInterval(new Date(m.movementDate), thisMonthInterval))
      .reduce((acc, m) => acc + (Math.abs(m.quantityChange || 0) * (m.unitPrice || 0)), 0) || 0;

    const monthlyExp = (expenses
      ?.filter(ex => isWithinInterval(new Date(ex.date), thisMonthInterval))
      .reduce((acc, ex) => acc + (ex.amount || 0), 0) || 0) + (employees?.reduce((acc, e) => acc + (e.baseSalary || 0), 0) || 0);

    const netProfit = monthlyRevenue - monthlyExp;

    return [
      { 
        label: t.dashboard.totalStockValue, 
        value: `${formatMoney(totalInventoryVal)} so'm`, 
        icon: Layers, 
        color: "bg-primary/10 text-primary", 
        trend: "Umumiy", 
        trendColor: "text-primary" 
      },
      { 
        label: "Oylik Tushum", 
        value: `${formatMoney(monthlyRevenue)} so'm`, 
        icon: TrendingUp, 
        color: "bg-emerald-500/10 text-emerald-500", 
        trend: "Shu oy", 
        trendColor: "text-emerald-500" 
      },
      { 
        label: "Oylik Sof Foyda", 
        value: `${formatMoney(netProfit)} so'm`, 
        icon: DollarSign, 
        color: netProfit >= 0 ? "bg-blue-500/10 text-blue-500" : "bg-rose-500/10 text-rose-500", 
        trend: netProfit >= 0 ? "Musbat" : "Minus", 
        trendColor: netProfit >= 0 ? "text-blue-500" : "text-rose-500" 
      },
      { 
        label: t.dashboard.lowStockAlerts, 
        value: lowStock.toString(), 
        icon: AlertTriangle, 
        color: lowStock > 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500", 
        trend: lowStock > 0 ? "Nazorat" : "Xavfsiz", 
        trendColor: lowStock > 0 ? "text-rose-500" : "text-emerald-500" 
      }
    ];
  }, [t, products, movements, expenses, employees]);

  if (!mounted || isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="space-y-1">
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">{t.dashboard.title}</h1>
            <p className="text-muted-foreground font-medium text-sm">{t.dashboard.description}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/reports">
              <Button variant="outline" className="rounded-2xl font-bold h-12 px-6">
                <TrendingUp className="w-4 h-4 mr-2" /> Moliyaviy Tahlil
              </Button>
            </Link>
            <Link href="/stock-in">
              <Button className="rounded-2xl font-black uppercase tracking-widest text-[10px] text-white shadow-2xl shadow-primary/20 h-12 px-8 bg-primary premium-button">
                <PlusCircle className="w-4 h-4 mr-2" /> {t.actions.newOperation}
              </Button>
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden group">
              <CardContent className="pt-8">
                <div className="flex justify-between items-start mb-6">
                  <div className={cn("p-3 rounded-2xl shadow-sm", stat.color)}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className={cn("rounded-full text-[9px] font-black uppercase px-3 py-1 border-none bg-muted/30", stat.trendColor)}>
                    {stat.trend}
                  </Badge>
                </div>
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">{stat.label}</h3>
                <p className="text-2xl font-black font-headline tracking-tighter mt-1">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <Card className="lg:col-span-2 border-none glass-card bg-card/40 backdrop-blur-2xl rounded-[3rem] p-8">
            <CardTitle className="font-headline font-black text-xl mb-6">Zaxira Harakati Dinamikasi (6 oylik)</CardTitle>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                  <Tooltip 
                    cursor={{fill: 'rgba(0,0,0,0.02)'}}
                    contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}} 
                  />
                  <Bar dataKey="in" name="Kirim" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} barSize={24} />
                  <Bar dataKey="out" name="Chiqim" fill="rgba(225, 29, 72, 0.6)" radius={[8, 8, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="border-none glass-card bg-card/40 backdrop-blur-2xl rounded-[3rem] p-8">
            <CardTitle className="font-headline font-black text-xl mb-6 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-500" /> Kam qoldiqlar
            </CardTitle>
            <div className="space-y-4">
              {products?.filter(p => (p.stock || 0) < (p.lowStockThreshold || 10)).slice(0, 6).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-3xl bg-muted/10 hover:bg-muted/20 transition-all">
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{item.sku}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <Badge variant="destructive" className="h-7 px-3 font-black rounded-xl">{item.stock}</Badge>
                    <span className="text-[8px] font-black uppercase opacity-40 mt-1">{item.unit || 'pcs'}</span>
                  </div>
                </div>
              ))}
              {(!products || products.filter(p => (p.stock || 0) < (p.lowStockThreshold || 10)).length === 0) && (
                <div className="py-20 text-center opacity-20 flex flex-col items-center">
                  <PlusCircle className="w-12 h-12 mb-4" />
                  <p className="text-[10px] font-black uppercase">Barcha mahsulotlar yetarli ✅</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
