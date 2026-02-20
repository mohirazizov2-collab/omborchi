"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Calendar, Truck, User } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { Badge } from "@/components/ui/badge";

export default function StockOutPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState([{ id: 1, product: "", quantity: 0 }]);

  const addItem = () => {
    setItems([...items, { id: Date.now(), product: "", quantity: 0 }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">{t.stockOut.title}</h1>
          <p className="text-muted-foreground mt-1">{t.stockOut.description}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="font-headline">{t.stockOut.issueDetails}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="order_number">{t.stockOut.refNumber}</Label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="order_number" placeholder="ORD-998877" className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">{t.stockOut.issueDate}</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="date" type="date" className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source_warehouse">{t.stockOut.sourceWarehouse}</Label>
                  <Select>
                    <SelectTrigger id="source_warehouse">
                      <SelectValue placeholder={t.stockOut.sourceWarehouse} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">Main Hub - Tashkent</SelectItem>
                      <SelectItem value="fergana">Fergana Regional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer">{t.stockOut.recipient}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="customer" placeholder="Acme Corp" className="pl-10" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-headline">{t.stockOut.title}</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
                  <Plus className="w-4 h-4" /> {t.actions.addItem}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-end p-4 rounded-lg bg-accent/20 border">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">{t.common.product}</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder={t.common.product} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="i9">Intel Core i9-13900K</SelectItem>
                          <SelectItem value="rtx4090">NVIDIA RTX 4090 FE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32 space-y-2">
                      <Label className="text-xs">{t.common.quantity}</Label>
                      <Input type="number" placeholder="0" />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm h-fit sticky top-8">
              <CardHeader>
                <CardTitle className="font-headline">{t.common.summary}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.common.totalItems}</span>
                  <span className="font-semibold">{items.length}</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button className="w-full h-11 text-lg bg-orange-600 hover:bg-orange-700">{t.stockOut.dispatch}</Button>
                <Button variant="outline" className="w-full">{t.stockOut.pickingList}</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
