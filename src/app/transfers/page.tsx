
"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, Plus, Trash2, Calendar, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function TransfersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([{ id: Date.now(), productId: "", quantity: 1 }]);
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");

  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "products");
  }, [db]);
  const { data: products } = useCollection(productsQuery);

  const warehousesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "warehouses");
  }, [db]);
  const { data: warehouses } = useCollection(warehousesQuery);

  const addItem = () => {
    setItems([...items, { id: Date.now(), productId: "", quantity: 1 }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: number, field: string, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleTransfer = () => {
    if (!fromWarehouse || !toWarehouse || items.some(i => !i.productId)) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Barcha maydonlarni to'ldiring.",
      });
      return;
    }

    if (fromWarehouse === toWarehouse) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Manba va maqsad ombori bir xil bo'lishi mumkin emas.",
      });
      return;
    }

    setLoading(true);
    try {
      items.forEach(item => {
        // Record the transfer movement
        const movementData = {
          productId: item.productId,
          fromWarehouseId: fromWarehouse,
          toWarehouseId: toWarehouse,
          quantityChange: item.quantity,
          movementType: "Transfer",
          movementDate: new Date().toISOString(),
          responsibleUserId: user?.uid,
        };
        addDocumentNonBlocking(collection(db, "stockMovements"), movementData);

        // In a real app, you'd also update per-warehouse stock levels here.
        // For MVP, we are tracking global stock in products and movements history.
      });

      toast({
        title: "Muvaffaqiyatli",
        description: "Transfer operatsiyasi muvaffaqiyatli qayd etildi.",
      });

      setItems([{ id: Date.now(), productId: "", quantity: 1 }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">{t.transfers.title}</h1>
          <p className="text-muted-foreground mt-1">{t.transfers.description}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="font-headline">{t.transfers.routeDetails}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="source">{t.transfers.fromWarehouse}</Label>
                  <Select onValueChange={setFromWarehouse} value={fromWarehouse}>
                    <SelectTrigger id="source">
                      <SelectValue placeholder={t.transfers.fromWarehouse} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">{t.transfers.toWarehouse}</Label>
                  <Select onValueChange={setToWarehouse} value={toWarehouse}>
                    <SelectTrigger id="destination">
                      <SelectValue placeholder={t.transfers.toWarehouse} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer_date">{t.transfers.scheduleDate}</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="transfer_date" type="date" className="pl-10" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-headline">{t.transfers.title}</CardTitle>
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
                <Button className="w-full h-11 text-lg gap-2" onClick={handleTransfer} disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRightLeft className="w-5 h-5" /> {t.transfers.initiate}</>}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
