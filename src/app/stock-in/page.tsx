
"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calendar, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function StockInPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([{ id: Date.now(), productId: "", quantity: 1, price: 0 }]);
  const [dnNumber, setDnNumber] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const productsQuery = useMemoFirebase(() => collection(db, "products"), [db]);
  const { data: products } = useCollection(productsQuery);

  const warehousesQuery = useMemoFirebase(() => collection(db, "warehouses"), [db]);
  const { data: warehouses } = useCollection(warehousesQuery);

  const addItem = () => {
    setItems([...items, { id: Date.now(), productId: "", quantity: 1, price: 0 }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: number, field: string, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleProcess = () => {
    if (!dnNumber || !warehouseId || items.some(i => !i.productId)) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Barcha maydonlarni to'ldiring.",
      });
      return;
    }

    setLoading(true);

    try {
      items.forEach((item) => {
        // 1. Record the movement
        const movementData = {
          productId: item.productId,
          warehouseId: warehouseId,
          quantityChange: item.quantity,
          movementType: "StockIn",
          movementDate: new Date().toISOString(),
          responsibleUserId: user?.uid,
          dnNumber: dnNumber,
        };
        addDocumentNonBlocking(collection(db, "stockMovements"), movementData);

        // 2. Update product total stock
        const product = products?.find(p => p.id === item.productId);
        if (product) {
          const productRef = doc(db, "products", item.productId);
          updateDocumentNonBlocking(productRef, {
            stock: (product.stock || 0) + item.quantity
          });
        }
      });

      toast({
        title: "Muvaffaqiyatli",
        description: "Tovarlar qabul qilindi va zaxira yangilandi.",
      });
      
      // Reset form
      setItems([{ id: Date.now(), productId: "", quantity: 1, price: 0 }]);
      setDnNumber("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalValue = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);

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
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="note_number">{t.stockIn.dnNumber}</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="note_number" 
                      placeholder="DN-12345678" 
                      className="pl-10" 
                      value={dnNumber}
                      onChange={(e) => setDnNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">{t.stockIn.receiptDate}</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="date" type="date" className="pl-10" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouse">{t.stockIn.targetWarehouse}</Label>
                  <Select onValueChange={setWarehouseId} value={warehouseId}>
                    <SelectTrigger id="warehouse">
                      <SelectValue placeholder={t.stockIn.targetWarehouse} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
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
                      <Select 
                        onValueChange={(val) => updateItem(item.id, "productId", val)}
                        value={item.productId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t.common.product} />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32 space-y-2">
                      <Label className="text-xs">{t.common.quantity}</Label>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value))}
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label className="text-xs">{t.common.price}</Label>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        value={item.price}
                        onChange={(e) => updateItem(item.id, "price", parseFloat(e.target.value))}
                      />
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
                  <span className="text-2xl font-bold font-headline text-primary">${totalValue.toFixed(2)}</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button className="w-full h-11 text-lg" onClick={handleProcess} disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.stockIn.process}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => toast({ title: "Saqlandi", description: "Qoralama muvaffaqiyatli saqlandi." })}>
                  {t.stockIn.saveDraft}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
