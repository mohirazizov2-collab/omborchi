"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Search, Plus, Filter, MoreHorizontal } from "lucide-react";

const products = [
  { id: 1, name: "Intel Core i9-13900K", sku: "CPU-I9-139", category: "Processors", stock: 12, price: "$589.00", status: "Low Stock" },
  { id: 2, name: "NVIDIA RTX 4090 FE", sku: "GPU-4090-FE", category: "Graphics Cards", stock: 4, price: "$1,599.00", status: "Critical" },
  { id: 3, name: "Samsung 980 Pro 2TB", sku: "SSD-SAM-980", category: "Storage", stock: 45, price: "$189.99", status: "In Stock" },
  { id: 4, name: "Corsair Vengeance 32GB", sku: "RAM-COR-32", category: "Memory", stock: 8, price: "$125.50", status: "Low Stock" },
  { id: 5, name: "ASUS ROG Maximus Z790", sku: "MB-ASU-Z790", category: "Motherboards", stock: 22, price: "$649.00", status: "In Stock" },
];

export default function ProductsPage() {
  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">Products Catalog</h1>
            <p className="text-muted-foreground mt-1">Manage your inventory items, SKUs, and stock levels.</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Add New Product
          </Button>
        </header>

        <Card className="border-none shadow-sm mb-8">
          <CardContent className="p-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, SKU or category..." className="pl-10 bg-accent/20 border-none" />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" /> Filter
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <Card className="border-none shadow-sm">
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Product info</th>
                    <th className="px-6 py-4 font-semibold">Category</th>
                    <th className="px-6 py-4 font-semibold">SKU</th>
                    <th className="px-6 py-4 font-semibold">Stock</th>
                    <th className="px-6 py-4 font-semibold">Price</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-accent/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                            <Package className="w-5 h-5" />
                          </div>
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{p.category}</td>
                      <td className="px-6 py-4 font-code text-xs">{p.sku}</td>
                      <td className="px-6 py-4 font-bold">{p.stock}</td>
                      <td className="px-6 py-4">{p.price}</td>
                      <td className="px-6 py-4">
                        <Badge variant={p.status === "In Stock" ? "default" : p.status === "Low Stock" ? "secondary" : "destructive"}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}