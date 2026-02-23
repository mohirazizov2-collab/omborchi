
"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash2, Plus, Truck, User, Loader2, ArrowRight, Search, AlertCircle, Package, UserCheck } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

export default function StockOutPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([{ id: generateId(), productId: "", quantity: 1, searchQuery: "" }]);
  const [orderNumber, setOrderNumber] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [clientType, setClientType] = useState<"internal" | "external">("external");

  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "products");
  }, [db]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const warehousesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "warehouses");
  }, [db]);
  const { data: warehouses } = useCollection(warehousesQuery);

  const addItem = () => {
    setItems([...items, { id: generateId(), productId: "", quantity: 1, searchQuery: "" }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    } else {
      setItems([{ id: generateId(), productId: "", quantity: 1, searchQuery: "" }]);
    }
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDispatch = async () => {
    if (!warehouseId || !recipient) {
      toast({ variant: "destructive", title: "Xatolik", description: "Mijoz va omborni tanlang." });
      return;
    }
    if (items.some(i => !i.productId)) {
      toast({ variant: "destructive", title: "Xatolik", description: "Barcha mahsulotlarni tanlang." });
      return;
    }

    setLoading(true);
    const saleId = `SALE_${Date.now()}`;

    try {
      // 1. First, validate stock for ALL items before processing any
      for (const item of items) {
        const invId = `${warehouseId}_${item.productId}`;
        const invRef = doc(db, "inventory", invId);
        const invSnap = await getDoc(invRef);
        const currentWhStock = invSnap.exists() ? (invSnap.data().stock || 0) : 0;

        if (currentWhStock < (item.quantity || 0)) {
          const pName = products?.find(p => p.id === item.productId)?.name || "Noma'lum mahsulot";
          toast({ 
            variant: "destructive", 
            title: t.stockOut.insufficientStock, 
            description: `${pName} omborda faqat ${currentWhStock} ta bor.` 
          });
          setLoading(false);
          return;
        }
      }

      // 2. Process transactions (Safe stock deduction)
      for (const item of items) {
        const invId = `${warehouseId}_${item.productId}`;
        const invRef = doc(db, "inventory", invId);
        const invSnap = await getDoc(invRef);
        const currentWhStock = invSnap.exists() ? (invSnap.data().stock || 0) : 0;

        // Log Movement (Audit Trail)
        const movementData = {
          productId: item.productId,
          warehouseId: warehouseId,
          quantityChange: -(item.quantity || 0),
          movementType: "StockOut",
          movementDate: new Date().toISOString(),
          responsibleUserId: user?.uid,
          orderNumber: orderNumber || saleId,
          recipient: recipient,
          clientType: clientType,
          saleId: saleId
        };
        addDocumentNonBlocking(collection(db, "stockMovements"), movementData);

        // Update Global Product Stock
        const product = products?.find(p => p.id === item.productId);
        if (product) {
          const productRef = doc(db, "products", item.productId);
          updateDocumentNonBlocking(productRef, {
            stock: (product.stock || 0) - (item.quantity || 0),
            updatedAt: new Date().toISOString()
          });
        }

        // Update Warehouse Inventory (Specific Balance)
        updateDocumentNonBlocking(invRef, {
          stock: currentWhStock - (item.quantity || 0),
          updatedAt: new Date().toISOString()
        });
      }

      toast({ 
        title: "Muvaffaqiyatli", 
        description: `${recipient} uchun chiqim qilindi va balanslar yangilandi.` 
      });
      
      setItems([{ id: generateId(), productId: "", quantity: 1, searchQuery: "" }]);
      setOrderNumber("");
      setRecipient("");
      setWarehouseId("");
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
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">{t.stockOut.title}</h1>
            <p className="text-muted-foreground mt-1 font-medium text-sm">{t.stockOut.description}</p>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden">
              <CardHeader className="p-8">
                <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                  <UserCheck className="w-6 h-6 text-primary" /> {t.stockOut.issueDetails}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">{t.stockOut.clientType}</Label>
                    <RadioGroup 
                      value={clientType} 
                      onValueChange={(v: any) => setClientType(v)}
                      className="flex gap-4 p-2 bg-muted/20 rounded-2xl"
                    >
                      <div className="flex items-center space-x-2 bg-background/50 px-4 py-2 rounded-xl flex-1 cursor-pointer">
                        <RadioGroupItem value="external" id="external" />
                        <Label htmlFor="external" className="cursor-pointer font-bold">{t.stockOut.external}</Label>
                      </div>
                      <div className="flex items-center space-x-2 bg-background/50 px-4 py-2 rounded-xl flex-1 cursor-pointer">
                        <RadioGroupItem value="internal" id="internal" />
                        <Label htmlFor="internal" className="cursor-pointer font-bold">{t.stockOut.internal}</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">{t.stockOut.recipient}</Label>
                    <Input 
                      placeholder={clientType === 'external' ? "Mijoz yoki korxona nomi" : "Bo'lim yoki ishchi nomi"} 
                      className="h-14 rounded-2xl bg-background/50 border-border/40 font-bold focus:ring-rose-500/40" 
                      value={recipient} 
                      onChange={(e) => setRecipient(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">{t.stockOut.sourceWarehouse}</Label>
                    <Select onValueChange={setWarehouseId} value={warehouseId}>
                      <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-border/40 font-bold">
                        <SelectValue placeholder="Omborni tanlang" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border/40">
                        {warehouses?.map((w) => (
                          <SelectItem key={w.id} value={w.id} className="font-bold">{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">{t.stockOut.refNumber}</Label>
                    <Input 
                      placeholder="SALE-2026-XXX (Ixtiyoriy)" 
                      className="h-14 rounded-2xl bg-background/50 border-border/40 font-bold" 
                      value={orderNumber} 
                      onChange={(e) => setOrderNumber(e.target.value)} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden">
              <CardHeader className="p-8 flex flex-row items-center justify-between">
                <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                  <Package className="w-6 h-6 text-primary" /> {t.common.totalItems}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addItem} className="gap-2 rounded-xl font-black uppercase text-[9px] tracking-widest h-9 px-4 border-rose-500/20 text-rose-600 hover:bg-rose-500/5">
                  <Plus className="w-4 h-4" /> {t.actions.addItem}
                </Button>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-4">
                <AnimatePresence mode="popLayout">
                  {items.map((item) => {
                    const selectedProduct = products?.find(p => p.id === item.productId);
                    return (
                      <motion.div 
                        key={item.id} 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={cn(
                          "flex flex-col md:flex-row gap-4 p-6 rounded-[2.5rem] bg-muted/10 border transition-all relative group",
                          !item.productId ? "border-rose-500/20 bg-rose-500/[0.02]" : "border-border/10"
                        )}
                      >
                        <div className="flex-1 space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-40">
                            {t.common.product}
                          </Label>
                          <Select 
                            onValueChange={(val) => updateItem(item.id, "productId", val)}
                            value={item.productId}
                          >
                            <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-none font-bold shadow-sm">
                              <SelectValue placeholder={productsLoading ? "Yuklanmoqda..." : "Mahsulotni tanlang..."} />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl max-h-[400px]">
                              <div className="p-2 sticky top-0 bg-popover z-10">
                                 <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                      placeholder="Qidirish..." 
                                      className="h-10 pl-10 text-sm rounded-xl bg-background/50"
                                      value={item.searchQuery}
                                      onChange={(e) => updateItem(item.id, "searchQuery", e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                 </div>
                              </div>
                              {products?.filter(p => 
                                p.name.toLowerCase().includes(item.searchQuery.toLowerCase())
                              ).map((p) => (
                                <SelectItem key={p.id} value={p.id} className="py-3 rounded-xl">
                                  <div className="flex flex-col">
                                    <span className="font-bold">{p.name}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">{p.stock || 0} {t.units[p.unit as keyof typeof t.units] || p.unit} mavjud</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-full md:w-40 space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-40">
                            {t.common.quantity} {selectedProduct && `(${t.units[selectedProduct.unit as keyof typeof t.units] || selectedProduct.unit})`}
                          </Label>
                          <Input 
                            type="number" 
                            className="h-14 rounded-2xl bg-background/50 border-none font-black text-center text-lg"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-14 w-14 rounded-2xl hover:bg-rose-500/10 text-rose-500 self-end md:self-center transition-colors"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="w-6 h-6" />
                        </Button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <Card className="border-none glass-card bg-rose-600 text-white rounded-[3rem] shadow-2xl sticky top-8 overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                <Package className="w-32 h-32" />
              </div>
              <CardHeader className="p-8 pb-4 relative z-10">
                <CardTitle className="font-headline font-black text-2xl tracking-tight">{t.common.summary}</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-8 relative z-10">
                <div className="flex justify-between items-center pb-6 border-b border-white/10">
                  <span className="text-white/60 text-xs font-black uppercase tracking-widest">Jami qatorlar</span>
                  <span className="text-4xl font-black">{items.filter(i => i.productId).length}</span>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 border border-white/5">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                         <User className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">{t.stockOut.recipient}</p>
                        <p className="font-bold text-sm truncate">{recipient || '---'}</p>
                      </div>
                   </div>
                </div>
              </CardContent>
              <CardFooter className="p-8 pt-0 relative z-10">
                <Button 
                  className="w-full h-16 rounded-[1.5rem] bg-white text-rose-600 hover:bg-white/90 font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl border-none premium-button group" 
                  onClick={handleDispatch} 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><ArrowRight className="w-5 h-5 mr-3 transition-transform group-hover:translate-x-1" /> {t.stockOut.dispatch}</>}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
