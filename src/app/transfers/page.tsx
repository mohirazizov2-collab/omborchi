
"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, Plus, Trash2, Calendar, Loader2, ArrowRight, Warehouse as WarehouseIcon } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Unique ID helper
const generateId = () => Math.random().toString(36).substring(2, 11);

export default function TransfersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([{ id: generateId(), productId: "", quantity: 1 }]);
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
    setItems([...items, { id: generateId(), productId: "", quantity: 1 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    } else {
      setItems([{ id: generateId(), productId: "", quantity: 1 }]);
    }
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleTransfer = () => {
    // Validation
    if (!fromWarehouse) {
      toast({ variant: "destructive", title: "Xatolik", description: "Manba omborini tanlang." });
      return;
    }
    if (!toWarehouse) {
      toast({ variant: "destructive", title: "Xatolik", description: "Maqsadli omborni tanlang." });
      return;
    }
    if (fromWarehouse === toWarehouse) {
      toast({ variant: "destructive", title: "Xatolik", description: "Manba va maqsad ombori bir xil bo'lishi mumkin emas." });
      return;
    }
    if (items.some(i => !i.productId)) {
      toast({ variant: "destructive", title: "Xatolik", description: "Barcha mahsulotlarni tanlang." });
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
          description: `Internal Transfer from ${warehouses?.find(w => w.id === fromWarehouse)?.name} to ${warehouses?.find(w => w.id === toWarehouse)?.name}`
        };
        addDocumentNonBlocking(collection(db, "stockMovements"), movementData);
      });

      toast({
        title: "Muvaffaqiyatli",
        description: "Transfer operatsiyasi muvaffaqiyatli qayd etildi.",
      });

      setItems([{ id: generateId(), productId: "", quantity: 1 }]);
      setFromWarehouse("");
      setToWarehouse("");
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Xatolik", description: "Amalni bajarishda xato yuz berdi." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="mb-12">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">{t.transfers.title}</h1>
            <p className="text-muted-foreground mt-1 font-medium">{t.transfers.description}</p>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden">
              <CardHeader className="p-8">
                <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                  <ArrowRightLeft className="w-6 h-6 text-primary" />
                  {t.transfers.routeDetails}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">{t.transfers.fromWarehouse}</Label>
                  <Select onValueChange={setFromWarehouse} value={fromWarehouse}>
                    <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-border/40 focus:ring-primary/40 font-bold">
                      <SelectValue placeholder="Tanlang" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {warehouses?.map((w) => (
                        <SelectItem key={w.id} value={w.id} disabled={w.id === toWarehouse}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10">
                   <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl shadow-primary/5">
                      <ArrowRight className="w-6 h-6" />
                   </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">{t.transfers.toWarehouse}</Label>
                  <Select onValueChange={setToWarehouse} value={toWarehouse}>
                    <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-border/40 focus:ring-primary/40 font-bold">
                      <SelectValue placeholder="Tanlang" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {warehouses?.map((w) => (
                        <SelectItem key={w.id} value={w.id} disabled={w.id === fromWarehouse}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="px-8 pb-8">
                 <div className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-dashed border-border/40">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.transfers.scheduleDate}</p>
                       <input type="date" className="bg-transparent border-none outline-none font-bold text-sm w-full" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                 </div>
              </CardFooter>
            </Card>

            <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden">
              <CardHeader className="p-8 flex flex-row items-center justify-between">
                <CardTitle className="font-headline font-black text-xl tracking-tight">{t.products.productInfo}</CardTitle>
                <Button variant="outline" size="sm" onClick={addItem} className="gap-2 rounded-xl font-black uppercase text-[9px] tracking-widest border-border/40 h-9 px-4">
                  <Plus className="w-4 h-4" /> {t.actions.addItem}
                </Button>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-4">
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={cn(
                        "flex gap-4 items-end p-5 rounded-[2rem] bg-muted/10 border transition-all group relative",
                        !item.productId && "border-rose-500/20 bg-rose-500/[0.02]",
                        item.productId && "border-border/10"
                      )}
                    >
                      <div className="flex-1 space-y-3">
                        <Label className={cn(
                          "text-[10px] font-black uppercase tracking-widest pl-2",
                          !item.productId ? "text-rose-500 opacity-100" : "opacity-40"
                        )}>
                          {t.common.product} {!item.productId && "*"}
                        </Label>
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
                      <div className="w-32 space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-40">{t.common.quantity}</Label>
                        <Input 
                          type="number" 
                          className="h-12 rounded-xl bg-background/50 border-none font-black"
                          placeholder="0" 
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-12 w-12 rounded-xl hover:bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
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
                <ArrowRightLeft className="w-32 h-32 rotate-45" />
              </div>
              <CardHeader className="p-8 pb-4">
                <CardTitle className="font-headline font-black text-2xl tracking-tight">{t.common.summary}</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-6">
                <div className="flex justify-between items-center pb-6 border-b border-white/10">
                  <span className="text-white/60 text-xs font-black uppercase tracking-widest">{t.common.totalItems}</span>
                  <span className="text-2xl font-black">{items.filter(i => i.productId).length}</span>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                         <WarehouseIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                         <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">From</p>
                         <p className="font-bold text-sm truncate">{warehouses?.find(w => w.id === fromWarehouse)?.name || '---'}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                         <ArrowRight className="w-4 h-4 rotate-90 md:rotate-0" />
                      </div>
                      <div className="min-w-0">
                         <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">To</p>
                         <p className="font-bold text-sm truncate">{warehouses?.find(w => w.id === toWarehouse)?.name || '---'}</p>
                      </div>
                   </div>
                </div>
              </CardContent>
              <CardFooter className="p-8 pt-0">
                <Button 
                  className="w-full h-16 rounded-2xl bg-white text-primary hover:bg-white/90 font-black uppercase tracking-[0.2em] text-[12px] shadow-xl border-none premium-button" 
                  onClick={handleTransfer} 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><ArrowRightLeft className="w-5 h-5 mr-3" /> {t.transfers.initiate}</>}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
