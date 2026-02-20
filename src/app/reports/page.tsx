
"use client";

import { useEffect, useState } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { Download, Filter, Loader2, TrendingUp, Package, Warehouse } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";

// Dynamically import Recharts to avoid SSR errors
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const LineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const PieChart = dynamic(() => import("recharts").then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then(m => m.Cell), { ssr: false });

const COLORS = ['#2E68B8', '#669995', '#193D3E', '#B88B2E', '#B8452E'];

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();
  const db = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch real data
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

  const movementsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "stockMovements");
  }, [db, user]);
  const { data: movements } = useCollection(movementsQuery);

  if (!mounted) return null;

  // Process data for charts
  const totalStockValue = (products || []).reduce((acc, p) => acc + (p.salePrice * (p.stock || 0)), 0);
  
  // Category distribution
  const categoriesMap: Record<string, number> = {};
  (products || []).forEach(p => {
    const cat = p.categoryId || 'Boshqa';
    categoriesMap[cat] = (categoriesMap[cat] || 0) + (p.stock || 0);
  });
  const categoryData = Object.entries(categoriesMap).map(([name, value]) => ({ name, value }));

  // Dummy trend data for visual (can be enhanced with real movement dates)
  const trendData = [
    { name: 'Dush', value: totalStockValue * 0.8 },
    { name: 'Sesh', value: totalStockValue * 0.85 },
    { name: 'Chor', value: totalStockValue * 0.9 },
    { name: 'Pay', value: totalStockValue * 0.95 },
    { name: 'Jum', value: totalStockValue },
  ];

  const isLoading = productsLoading || warehousesLoading;

  return (
    <div className="flex min-h-screen bg-background">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">{t.reports.title}</h1>
            <p className="text-muted-foreground mt-1">{t.reports.description}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> {t.reports.export}
            </Button>
            <Button className="gap-2">
              <Filter className="w-4 h-4" /> {t.actions.filter}
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border-none shadow-sm bg-card">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" /> {t.dashboard.totalStockValue}
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold font-headline">
                    ${totalStockValue.toLocaleString()}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-sm bg-card">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-500" /> {t.nav.products}
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold font-headline">
                    {products?.length || 0} ta tur
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-sm bg-card">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-purple-500" /> {t.dashboard.activeWarehouses}
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold font-headline">
                    {warehouses?.length || 0} ta nuqta
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border-none shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="text-lg font-headline font-bold">{t.reports.stockValueTrend}</CardTitle>
                  <CardDescription>Oxirgi 5 kunlik zaxira o'zgarishi (taxminiy)</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#2E68B8" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#2E68B8' }} 
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="text-lg font-headline font-bold">{t.reports.categoryDist}</CardTitle>
                  <CardDescription>Zaxira hajmi kategoriyalar kesimida</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
                      Ma'lumotlar yetarli emas
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
