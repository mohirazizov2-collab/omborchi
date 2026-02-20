"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  Box, 
  Warehouse, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const stockStats = [
  { 
    label: "Total Stock Value", 
    value: "$4,239,000", 
    trend: "+12.5%", 
    trendIcon: TrendingUp,
    trendColor: "text-green-500",
    icon: Box,
    color: "bg-blue-100 text-blue-600"
  },
  { 
    label: "Active Warehouses", 
    value: "14", 
    trend: "+2", 
    trendIcon: ArrowUpRight,
    trendColor: "text-blue-500",
    icon: Warehouse,
    color: "bg-purple-100 text-purple-600"
  },
  { 
    label: "Monthly Stock In", 
    value: "12,450", 
    trend: "+18%", 
    trendIcon: TrendingUp,
    trendColor: "text-green-500",
    icon: ArrowDownRight,
    color: "bg-green-100 text-green-600"
  },
  { 
    label: "Monthly Stock Out", 
    value: "10,230", 
    trend: "+5%", 
    trendIcon: TrendingDown,
    trendColor: "text-red-500",
    icon: ArrowUpRight,
    color: "bg-orange-100 text-orange-600"
  },
];

const chartData = [
  { month: "Jan", stockIn: 450, stockOut: 300 },
  { month: "Feb", stockIn: 520, stockOut: 380 },
  { month: "Mar", stockIn: 480, stockOut: 420 },
  { month: "Apr", stockIn: 610, stockOut: 450 },
  { month: "May", stockIn: 590, stockOut: 480 },
  { month: "Jun", stockIn: 720, stockOut: 510 },
];

const lowStockItems = [
  { name: "Intel Core i9-13900K", sku: "CPU-I9-139", stock: 12, threshold: 20 },
  { name: "NVIDIA RTX 4090", sku: "GPU-4090-FE", stock: 4, threshold: 10 },
  { name: "Samsung 980 Pro 2TB", sku: "SSD-SAM-980", stock: 15, threshold: 30 },
  { name: "Corsair Vengeance 32GB", sku: "RAM-COR-32", stock: 8, threshold: 15 },
];

const recentMovements = [
  { id: "M-1029", type: "Stock In", product: "MacBook Pro M2", quantity: 50, warehouse: "Main Hub", date: "2 hours ago" },
  { id: "M-1028", type: "Transfer", product: "iPhone 15 Pro", quantity: 20, warehouse: "East Branch", date: "5 hours ago" },
  { id: "M-1027", type: "Stock Out", product: "iPad Air", quantity: 15, warehouse: "North Outlet", date: "1 day ago" },
];

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of OmniStock inventory and warehouse operations.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Download Report</Button>
            <Button>+ New Operation</Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stockStats.map((stat) => (
            <Card key={stat.label} className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
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
          {/* Main Chart */}
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="font-headline font-bold text-lg">Stock Movements</CardTitle>
              <CardDescription>Comparison between stock inflow and outflow over time.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ 
                stockIn: { label: "Stock In", color: "hsl(var(--chart-1))" },
                stockOut: { label: "Stock Out", color: "hsl(var(--chart-2))" }
              }}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="stockIn" fill="var(--color-stockIn)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="stockOut" fill="var(--color-stockOut)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline font-bold text-lg">Low Stock Alerts</CardTitle>
                <CardDescription>Items below threshold.</CardDescription>
              </div>
              <AlertTriangle className="text-orange-500 w-5 h-5" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockItems.map((item) => (
                  <div key={item.sku} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border">
                    <div>
                      <p className="text-sm font-semibold truncate max-w-[140px]">{item.name}</p>
                      <p className="text-xs text-muted-foreground font-code">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-destructive">{item.stock} left</p>
                      <p className="text-[10px] text-muted-foreground">Min: {item.threshold}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="link" className="w-full mt-4 text-xs">
                View All Alerts <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions Table */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline font-bold text-lg">Recent Movements</CardTitle>
            <CardDescription>Latest inventory transactions across all warehouses.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-semibold">ID</th>
                    <th className="px-6 py-3 font-semibold">Type</th>
                    <th className="px-6 py-3 font-semibold">Product</th>
                    <th className="px-6 py-3 font-semibold">Quantity</th>
                    <th className="px-6 py-3 font-semibold">Warehouse</th>
                    <th className="px-6 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-accent/20 transition-colors">
                      <td className="px-6 py-4 font-code text-primary">{m.id}</td>
                      <td className="px-6 py-4">
                        <Badge variant={m.type === "Stock In" ? "default" : m.type === "Transfer" ? "secondary" : "outline"}>
                          {m.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-medium">{m.product}</td>
                      <td className="px-6 py-4 font-bold">{m.quantity}</td>
                      <td className="px-6 py-4">{m.warehouse}</td>
                      <td className="px-6 py-4 text-muted-foreground">{m.date}</td>
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
