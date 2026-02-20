"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calendar, FileText } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";

export default function StockInPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState([{ id: 1, product: "", quantity: 0, price: 0 }]);

  const addItem = () => {
    setItems([...items, { id: Date.now(), product: "", quantity: 0, price: 0 }]);
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
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">{t.stockIn.title}</h1>
          <p className="text-muted-foreground mt-1">{t.stockIn.description}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="font-headline">{t.stockIn.dnDetails}</CardTitle>
                <CardDescription>{t.stockIn.dnDetails}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="note_number">{t.stockIn.dnNumber}</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="note_number" placeholder="DN-12345678" className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">{t.stockIn.receiptDate}</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="date" type="date" className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">{t.stockIn.supplier}</Label>
                  <Select>
                    <SelectTrigger id="supplier">
                      <SelectValue placeholder={t.stockIn.supplier} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intel">Intel Corporation</SelectItem>
                      <SelectItem value="nvidia">NVIDIA Corp</SelectItem>
                      <SelectItem value="samsung">Samsung Electronics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouse">{t.stockIn.targetWarehouse}</Label>
                  <Select>
                    <SelectTrigger id="warehouse">
                      <SelectValue placeholder={t.stockIn.targetWarehouse} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">Main Hub - Tashkent</SelectItem>
                      <SelectItem value="fergana">Fergana Regional</SelectItem>
                      <SelectItem value="samarkand">Samarkand Hub</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-headline">{t.stockIn.productItems}</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
                  <Plus className="w-4 h-4" /> {t.actions.addItem}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-end p-4 rounded-lg bg-accent/20 border group relative">
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
                    <div className="w-32 space-y-2">
                      <Label className="text-xs">{t.common.price}</Label>
                      <Input type="number" placeholder="0.00" />
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
                <div className="pt-4 border-t flex justify-between items-center">
                  <span className="font-bold">{t.common.totalValue}</span>
                  <span className="text-2xl font-bold font-headline text-primary">$0.00</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button className="w-full h-11 text-lg">{t.stockIn.process}</Button>
                <Button variant="outline" className="w-full">{t.stockIn.saveDraft}</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
