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
import { collection, query, limit, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { 
  Warehouse as WarehouseIcon, 
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  PlusCircle,
  Wallet
} from "lucide-react";
import Link from "next/link";

// Recharts components are only needed on the client
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
  const { toast } = useToast();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  const warehousesQuery = useMemoFirebase(() => {
    if (!mounted || !db || !user) return null;
    return collection(db, "warehouses");
  }, [mounted, db, user]);
  const { data: warehouses } = useCollection(warehousesQuery);

  const productsQuery = useMemoFirebase(() => {
    if (!mounted || !db || !user) return null;
    return collection(db, "products");
  }, [mounted, db, user]);
  const { data: products } = useCollection(productsQuery);

  const employeesQuery = useMemoFirebase(() => {
    if (!mounted || !db || !user) return null;
    return collection(db, "employees");
  }, [mounted, db, user]);
  const { data: employees } = useCollection(employeesQuery);

  const stats = useMemo(() => {
    if (!products && !employees && !warehouses) return [];
    
    const totalVal = products?.reduce((acc, p) => acc + ((p.salePrice || 0) * (p.stock || 0)), 0) || 0;
    const lowStock = products?.filter(p => (p.stock || 0) < (p.lowStockThreshold || 10)).length || 0;
    const totalSalary = employees?.reduce((acc, e) => acc + ((e.baseSalary || 0) + (e.bonus || 0) - (e.deductions || 0)), 0) || 0;
    
    return [
      { label: t.dashboard.totalStockValue, value: `${totalVal.toLocaleString()} so'm`, icon: Layers, color: "bg-primary/10 text-primary", trend: "+3.2%", trendColor: "text-emerald-500" },
      { label: t.dashboard.activeWarehouses, value: (warehouses?.length || 0).toString(), icon: WarehouseIcon, color: "bg-purple-500/10 text-purple-500", trend: "Normal", trendColor: "text-amber-500" },
      { label: t.dashboard.totalSalaryExpense, value: `${totalSalary.toLocaleString()} so'm`, icon: Wallet, color: "bg-emerald-500/10 text-emerald-500", trend: `${employees?.length || 0} xodim`, trendColor: "text-blue-500" },
      { label: t.dashboard.lowStockAlerts, value: lowStock.toString(), icon: AlertTriangle, color: lowStock > 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500", trend: lowStock > 0 ? "Action Req" : "Safe", trendColor: lowStock > 0 ? "text-rose-500" : "text-emerald-500" }
    ];
  }, [t, products, warehouses, employees]);

  const handleDownloadReport = async () => {
    if (!products) return;
    toast({ title: "Hisobot tayyorlanmoqda..." });
    
    const jsPDFLib = (await import("jspdf")).default;
    // @ts-ignore
    await import("jspdf-autotable");
    
    const doc = new jsPDFLib();
    
    // Logo Drawing
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(95, 15, 20, 20, 4, 4, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.8);
    doc.line(100, 25, 105, 20); 
    doc.line(105, 20, 110, 25);
    doc.line(101, 25, 109, 25);
    doc.line(102, 25, 102, 30);
    doc.line(108, 25, 108, 30);
    doc.line(103, 27, 107, 27);
    doc.line(103, 29, 107, 29);

    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("ombor.uz", 105, 45, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("Dashboard Umumiy Hisoboti", 105, 55, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Sana: ${new Date().toLocaleString()}`, 105, 62, { align: "center" });

    const statsData = stats.map(s => [s.label, s.value]);
    (doc as any).autoTable({
      startY: 75,
      head: [['Ko\'rsatkich', 'Qiymat']],
      body: statsData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], halign: 'center' },
      styles: { cellPadding: 5, fontSize: 11 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Bu hisobot ombor.uz tizimi orqali avtomatik shakllantirildi.", 105, 285, { align: "center" });

    doc.save(`Dashboard_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

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
            <Button variant="outline" onClick={handleDownloadReport} className="rounded-2xl font-bold h-12 px-6">
              <Calendar className="w-4 h-4 mr-2" /> {t.actions.downloadReport}
            </Button>
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
            <CardTitle className="font-headline font-black text-xl mb-6">{t.dashboard.stockMovements}</CardTitle>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{month: 'Jan', in: 400, out: 240}, {month: 'Feb', in: 300, out: 139}, {month: 'Mar', in: 200, out: 980}]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                  <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}} />
                  <Bar dataKey="in" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} barSize={32} />
                  <Bar dataKey="out" fill="rgba(0,0,0,0.1)" radius={[8, 8, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="border-none glass-card bg-card/40 backdrop-blur-2xl rounded-[3rem] p-8">
            <CardTitle className="font-headline font-black text-xl mb-6 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-500" /> {t.dashboard.lowStockAlerts}
            </CardTitle>
            <div className="space-y-4">
              {products?.filter(p => (p.stock || 0) < (p.lowStockThreshold || 10)).slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-3xl bg-muted/10">
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{item.sku}</p>
                  </div>
                  <Badge variant="destructive" className="h-7 px-3 font-black rounded-xl">{item.stock}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
