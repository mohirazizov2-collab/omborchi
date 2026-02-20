"use client";

import { useEffect, useState } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Download, Filter, Calendar, FileText } from "lucide-react";

const COLORS = ['#2E68B8', '#669995', '#193D3E', '#B88B2E', '#B8452E'];

const data = [
  { name: 'Mon', value: 400 },
  { name: 'Tue', value: 300 },
  { name: 'Wed', value: 600 },
  { name: 'Thu', value: 800 },
  { name: 'Fri', value: 500 },
  { name: 'Sat', value: 900 },
  { name: 'Sun', value: 700 },
];

const categoryData = [
  { name: 'Processors', value: 400 },
  { name: 'Graphics Cards', value: 300 },
  { name: 'Storage', value: 300 },
  { name: 'Memory', value: 200 },
];

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">Analytics & Reports</h1>
            <p className="text-muted-foreground mt-1">Deep dive into your inventory performance and logistics metrics.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> Export PDF
            </Button>
            <Button className="gap-2">
              <Filter className="w-4 h-4" /> Filter Data
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Avg. Stock Turnaround</CardDescription>
              <CardTitle className="text-2xl font-bold font-headline">14.2 Days</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Inventory Accuracy</CardDescription>
              <CardTitle className="text-2xl font-bold font-headline">99.8%</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Peak Volume Day</CardDescription>
              <CardTitle className="text-2xl font-bold font-headline">Saturday</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-headline font-bold">Stock Value Trend</CardTitle>
              <CardDescription>Daily inventory valuation across all hubs.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#2E68B8" strokeWidth={2} dot={{ fill: '#2E68B8' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-accent/20 animate-pulse rounded-lg" />
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-headline font-bold">Category Distribution</CardTitle>
              <CardDescription>Stock allocation by product category.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {mounted ? (
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
                <div className="w-full h-full bg-accent/20 animate-pulse rounded-lg" />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}