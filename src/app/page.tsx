
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, limit, orderBy } from "firebase/firestore";
import { 
  TrendingUp, 
  Box, 
  Warehouse as WarehouseIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle,
  ChevronRight,
  Loader2
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch data from Firebase
  const warehousesQuery = useMemoFirebase(() => collection(db, "warehouses"), [db]);
  const { data: warehouses, isLoading: warehousesLoading } = useCollection(warehousesQuery);

  const productsQuery = useMemoFirebase(() => collection(db, "products"), [db]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const recentMovementsQuery = useMemoFirebase(() => 
    query(collection(db, "stockMovements"), orderBy("movementDate", "desc"), limit(5)), 
    [db]
  );
  const { data: movements } = useCollection(recentMovementsQuery);

  const stockStats = [
    { 
      label: t.dashboard.totalStockValue, 
      value: productsLoading ? "..." : `$${products?.reduce((acc, p) => acc + (p.salePrice * 100), 0).toLocaleString() || 0}`, 
      trend: "+0%", 
      trendIcon: TrendingUp,
      trendColor: "text-green-500",
      icon: Box,
      color: "bg-blue-100 text-blue-600"
    },
    { 
      label: t.dashboard.activeWarehouses, 
      value: warehousesLoading ? "..." : (warehouses?.length || 0).toString(), 
      trend: "+0", 
      trendIcon: ArrowUpRight,
      trendColor: "text-blue-500",
      icon: WarehouseIcon,
      color: "bg-purple-100 text-purple-600"
    },
    { 
      label: t.dashboard.monthlyStockIn, 
      value: "0", 
      trend: "0%", 
      trendIcon: TrendingUp,
      trendColor: "text-green-500",
      icon: ArrowDownRight,
      color: "bg-green-100 text-green-600"
    },
    { 
      label: t.dashboard.monthlyStockOut, 
      value: "0", 
      trend: "0%", 
      trendIcon: ArrowUpRight,
      trendColor: "text-red-500",
      icon: ArrowUpRight,
      color: "bg-orange-100 text-orange-600"
    },
  ];

  const chartData = [
    { month: "Jan", stockIn: 0, stockOut: 0 },
    { month: "Feb", stockIn: 0, stockOut: 0 },
    { month: "Mar", stockIn: 0, stockOut: 0 },
  ];

  const lowStockItems = products?.filter(p => p.stock < (p.lowStockThreshold || 10)).slice(0, 4) || [];

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">{t.dashboard.title}</h1>
            <p className="text-muted-foreground mt-1">{t.dashboard.description}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">{t.actions.downloadReport}</Button>
            <Button>{t.actions.newOperation}</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stockStats.map((stat) => (
            <Card key={stat.label} className="border-none shadow-sm bg-card">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={cn("p-2 rounded-lg", stat.color)}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className={cn("flex items-center text-xs font-semibold", stat.trendColor)}>
                    <stat.trendIcon className="w-3 h-3 mr-1" />
                    {stat.trend}
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">{stat.label}</h3>
                  <p className="text-2xl font-bold font-headline tracking-tight">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="font-headline font-bold text-lg">{t.dashboard.stockMovements}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="stockIn" fill="#2E68B8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="stockOut" fill="#669995" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline font-bold text-lg">{t.dashboard.lowStockAlerts}</CardTitle>
              </div>
              <AlertTriangle className="text-orange-500 w-5 h-5" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockItems.length > 0 ? lowStockItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border">
                    <div>
                      <p className="text-sm font-semibold truncate max-w-[140px]">{item.name}</p>
                      <p className="text-xs text-muted-foreground font-code">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-destructive">{item.stock} left</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">Barcha mahsulotlar yetarli.</p>
                )}
              </div>
              <Button variant="link" className="w-full mt-4 text-xs">
                {t.dashboard.viewAll} <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline font-bold text-lg">{t.dashboard.recentMovements}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-semibold">{t.common.id}</th>
                    <th className="px-6 py-3 font-semibold">{t.common.type}</th>
                    <th className="px-6 py-3 font-semibold">{t.common.product}</th>
                    <th className="px-6 py-3 font-semibold">{t.common.quantity}</th>
                    <th className="px-6 py-3 font-semibold">{t.common.warehouse}</th>
                    <th className="px-6 py-3 font-semibold">{t.common.date}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movements && movements.map((m: any) => (
                    <tr key={m.id} className="hover:bg-accent/20 transition-colors">
                      <td className="px-6 py-4 font-code text-primary">{m.id.substring(0,6)}</td>
                      <td className="px-6 py-4">
                        <Badge variant="default">
                          {m.movementType}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-medium">{m.productId}</td>
                      <td className="px-6 py-4 font-bold">{m.quantityChange}</td>
                      <td className="px-6 py-4">{m.warehouseId}</td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(m.movementDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {(!movements || movements.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                        Hozircha harakatlar mavjud emas.
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
