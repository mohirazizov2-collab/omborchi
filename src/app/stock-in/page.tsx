"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calendar, FileText, Loader2, Truck, User, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StockInPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([{ id: Date.now(), productId: "", quantity: 1, price: 0 }]);
  const [dnNumber, setDnNumber] = useState("");
  const [supplier, setSupplier] = useState("");
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
    if (!dnNumber || !supplier || !warehouseId || items.some(i => !i.productId)) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Barcha majburiy maydonlarni (Yuk xati, Yetkazib beruvchi, Ombor) to'ldiring.",
      });
      return;
    }

    setLoading(true);

    try {
      items.forEach((item) => {
        // 1. Record the movement as a formal entry
        const movementData = {
          productId: item.productId,
          warehouseId: warehouseId,
          quantityChange: item.quantity,
          movementType: "StockIn",
          movementDate: new Date().toISOString(),
          responsibleUserId: user?.uid,
          dnNumber: dnNumber,
          supplier: supplier,
          unitPrice: item.price,
          totalPrice: item.quantity * item.price,
        };
        addDocumentNonBlocking(collection(db, "stockMovements"), movementData);

        // 2. Update product total stock
        const product = products?.find(p => p.id === item.productId);
        if (product) {
          const productRef = doc(db, "products", item.productId);
          updateDocumentNonBlocking(productRef, {
            stock: (product.stock || 0) + item.quantity,
            updatedAt: new Date().toISOString()
          });
        }
      });

      toast({
        title: "Muvaffaqiyatli",
        description: "Nakladnoy saqlandi va zaxira yangilandi.",
      });
      
      // Reset form
      setItems([{ id: Date.now(), productId: "", quantity: 1, price: 0 }]);
      setDnNumber("");
      setSupplier("");
      setWarehouseId("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalValue = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="mb-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">{t.stockIn.title}</h1>
            <p className="text-muted-foreground mt-1 font-medium text-sm">{t.stockIn.description}</p>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden">
              <CardHeader className="p-8">
                <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                  <FileText className="w-6 h-6 text-primary" />
                  {t.stockIn.dnDetails}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">{t.stockIn.dnNumber}</Label>
                  <div className="relative group">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="DN-2026-001" 
                      className="pl-12 h-14 rounded-2xl bg-background/50 border-border/40 focus:ring-primary/40 font-bold" 
                      value={dnNumber}
                      onChange={(e) => setDnNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">{t.stockIn.supplier}</Label>
                  <div className="relative group">
                    <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="Yetkazib beruvchi nomi" 
                      className="pl-12 h-14 rounded-2xl bg-background/50 border-border/40 focus:ring-primary/40 font-bold" 
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">{t.stockIn.targetWarehouse}</Label>
                  <Select onValueChange={setWarehouseId} value={warehouseId}>
                    <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-border/40 font-bold">
                      <SelectValue placeholder="Omborni tanlang" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {warehouses?.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">{t.stockIn.receiptDate}</Label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="date" className="pl-12 h-14 rounded-2xl bg-background/50 border-border/40 font-bold" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden">
              <CardHeader className="p-8 flex flex-row items-center justify-between">
                <CardTitle className="font-headline font-black text-xl tracking-tight">{t.stockIn.productItems}</CardTitle>
                <Button variant="outline" size="sm" onClick={addItem} className="gap-2 rounded-xl font-black uppercase text-[9px] tracking-widest border-border/40 h-9 px-4">
                  <Plus className="w-4 h-4" /> {t.actions.addItem}
                </Button>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-4">
                <AnimatePresence mode="popLayout">
                  {items.map((item, idx) => (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col md:flex-row gap-4 p-6 rounded-[2rem] bg-muted/10 border border-border/10 group relative"
                    >
                      <div className="flex-1 space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-40">{t.common.product}</Label>
                        <Select 
                          onValueChange={(val) => updateItem(item.id, "productId", val)}
                          value={item.productId}
                        >
                          <SelectTrigger className="h-12 rounded-xl bg-background/50 border-none font-bold">
                            <SelectValue placeholder="Tanlang" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {products?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-full md:w-32 space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-40">{t.common.quantity}</Label>
                        <Input 
                          type="number" 
                          className="h-12 rounded-xl bg-background/50 border-none font-black"
                          placeholder="0" 
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value))}
                        />
                      </div>
                      <div className="w-full md:w-32 space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-40">{t.common.price}</Label>
                        <Input 
                          type="number" 
                          className="h-12 rounded-xl bg-background/50 border-none font-black"
                          placeholder="0.00" 
                          value={item.price}
                          onChange={(e) => updateItem(item.id, "price", parseFloat(e.target.value))}
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-12 w-12 rounded-xl hover:bg-rose-500/10 text-rose-500 self-end md:self-auto"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="border-none glass-card bg-primary text-white rounded-[3rem] shadow-2xl shadow-primary/20 sticky top-8 overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <FileText className="w-32 h-32 rotate-12" />
              </div>
              <CardHeader className="p-8 pb-4">
                <CardTitle className="font-headline font-black text-2xl tracking-tight">{t.common.summary}</CardTitle>
                <CardDescription className="text-white/60 font-medium">Nakladnoy yakuni</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-6">
                <div className="flex justify-between items-center pb-6 border-b border-white/10">
                  <span className="text-white/60 text-xs font-black uppercase tracking-widest">{t.common.totalItems}</span>
                  <span className="text-2xl font-black">{items.length}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-white/60 text-xs font-black uppercase tracking-widest">{t.common.totalValue}</p>
                  <p className="text-4xl font-black font-headline tracking-tighter">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="pt-4 space-y-3">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                         <Truck className="w-4 h-4" />
                      </div>
                      <p className="font-bold text-sm truncate">{supplier || '---'}</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                         <FileText className="w-4 h-4" />
                      </div>
                      <p className="font-bold text-sm truncate">{dnNumber || '---'}</p>
                   </div>
                </div>
              </CardContent>
              <CardFooter className="p-8 pt-0 flex flex-col gap-4">
                <Button 
                  className="w-full h-16 rounded-2xl bg-white text-primary hover:bg-white/90 font-black uppercase tracking-[0.2em] text-[12px] shadow-xl border-none premium-button" 
                  onClick={handleProcess} 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><ArrowRight className="w-5 h-5 mr-3" /> {t.stockIn.process}</>}
                </Button>
                <Button variant="ghost" className="w-full text-white/60 hover:text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest">
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
