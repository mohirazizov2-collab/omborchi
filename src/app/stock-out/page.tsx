
"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Calendar, Truck, User, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function StockOutPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([{ id: Date.now(), productId: "", quantity: 1 }]);
  const [orderNumber, setOrderNumber] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [recipient, setRecipient] = useState("");

  const productsQuery = useMemoFirebase(() => collection(db, "products"), [db]);
  const { data: products } = useCollection(productsQuery);

  const warehousesQuery = useMemoFirebase(() => collection(db, "warehouses"), [db]);
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

  const handleDispatch = () => {
    if (!orderNumber || !warehouseId || items.some(i => !i.productId)) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Barcha maydonlarni to'ldiring.",
      });
      return;
    }

    // Check stock availability
    let insufficient = false;
    items.forEach(item => {
      const product = products?.find(p => p.id === item.productId);
      if (product && (product.stock || 0) < item.quantity) {
        insufficient = true;
      }
    });

    if (insufficient) {
      toast({
        variant: "destructive",
        title: "Zaxira yetarli emas",
        description: "Ayrim mahsulotlar bo'yicha zaxira yetishmayapti.",
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
          quantityChange: -item.quantity,
          movementType: "StockOut",
          movementDate: new Date().toISOString(),
          responsibleUserId: user?.uid,
          orderNumber: orderNumber,
          recipient: recipient
        };
        addDocumentNonBlocking(collection(db, "stockMovements"), movementData);

        // 2. Update product total stock
        const product = products?.find(p => p.id === item.productId);
        if (product) {
          const productRef = doc(db, "products", item.productId);
          updateDocumentNonBlocking(productRef, {
            stock: (product.stock || 0) - item.quantity
          });
        }
      });

      toast({
        title: "Muvaffaqiyatli",
        description: "Tovarlar muvaffaqiyatli chiqarildi.",
      });
      
      setItems([{ id: Date.now(), productId: "", quantity: 1 }]);
      setOrderNumber("");
      setRecipient("");
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
                    <input 
                      id="order_number" 
                      placeholder="ORD-998877" 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">{t.stockOut.issueDate}</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="date" type="date" className="pl-10" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source_warehouse">{t.stockOut.sourceWarehouse}</Label>
                  <Select onValueChange={setWarehouseId} value={warehouseId}>
                    <SelectTrigger id="source_warehouse">
                      <SelectValue placeholder={t.stockOut.sourceWarehouse} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer">{t.stockOut.recipient}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="customer" 
                      placeholder="Mijoz nomi" 
                      className="pl-10" 
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                    />
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
                      <Select 
                        onValueChange={(val) => updateItem(item.id, "productId", val)}
                        value={item.productId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t.common.product} />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name} ({p.stock} ta bor)</SelectItem>
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
                <Button className="w-full h-11 text-lg bg-orange-600 hover:bg-orange-700" onClick={handleDispatch} disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.stockOut.dispatch}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => toast({ title: "Chop etilmoqda", description: "Terish varaqasi tayyorlanmoqda." })}>
                  {t.stockOut.pickingList}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
