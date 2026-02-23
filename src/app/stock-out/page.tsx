"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Trash2, 
  Plus, 
  User, 
  Loader2, 
  Search, 
  Package, 
  UserCheck, 
  Download,
  CheckCircle2
} from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [processedInvoice, setProcessedInvoice] = useState<any>(null);

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
      const invoiceItems = [];
      for (const item of items) {
        const invId = `${warehouseId}_${item.productId}`;
        const invRef = doc(db, "inventory", invId);
        const invSnap = await getDoc(invRef);
        const currentWhStock = invSnap.exists() ? (invSnap.data().stock || 0) : 0;

        if (currentWhStock < (item.quantity || 0)) {
          const pName = products?.find(p => p.id === item.productId)?.name || "Noma'lum mahsulot";
          toast({ 
            variant: "destructive", 
            title: "Zaxira yetarli emas!", 
            description: `${pName} omborda faqat ${currentWhStock} ta bor.` 
          });
          setLoading(false);
          return;
        }
      }

      for (const item of items) {
        const product = products?.find(p => p.id === item.productId);
        const invId = `${warehouseId}_${item.productId}`;
        const invRef = doc(db, "inventory", invId);
        const invSnap = await getDoc(invRef);
        const currentWhStock = invSnap.exists() ? (invSnap.data().stock || 0) : 0;

        invoiceItems.push({
          name: product?.name || "Noma'lum",
          quantity: item.quantity,
          price: product?.salePrice || 0,
          unit: product?.unit || "pcs"
        });

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

        if (product) {
          const productRef = doc(db, "products", item.productId);
          updateDocumentNonBlocking(productRef, {
            stock: (product.stock || 0) - (item.quantity || 0),
            updatedAt: new Date().toISOString()
          });
        }

        updateDocumentNonBlocking(invRef, {
          stock: currentWhStock - (item.quantity || 0),
          updatedAt: new Date().toISOString()
        });
      }

      setProcessedInvoice({
        orderNumber: orderNumber || saleId,
        recipient,
        clientType,
        warehouse: warehouses?.find(w => w.id === warehouseId)?.name,
        date: new Date().toLocaleString(),
        items: invoiceItems
      });

      toast({ title: "Muvaffaqiyatli", description: "Chiqim nakladnoyi saqlandi." });
      setIsSuccessOpen(true);
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

  const handleDownloadPDF = async () => {
    if (!processedInvoice) return;
    
    const jsPDFLib = (await import("jspdf")).default;
    // @ts-ignore
    await import("jspdf-autotable");
    
    const doc = new jsPDFLib();
    
    doc.setFillColor(225, 29, 72); 
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("CHIQIM NAKLADNOYI", 105, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(`Hujjat #: ${processedInvoice.orderNumber}`, 20, 50);
    doc.text(`Mijoz: ${processedInvoice.recipient} (${processedInvoice.clientType})`, 20, 57);
    doc.text(`Chiqarilgan ombor: ${processedInvoice.warehouse}`, 20, 64);
    doc.text(`Sana: ${processedInvoice.date}`, 140, 50);

    const tableData = processedInvoice.items.map((it: any, i: number) => [
      i + 1,
      it.name,
      it.quantity,
      it.unit,
      `${it.price.toLocaleString()} so'm`,
      `${(it.quantity * it.price).toLocaleString()} so'm`
    ]);

    (doc as any).autoTable({
      startY: 75,
      head: [['#', 'Mahsulot nomi', 'Miqdor', 'Birlik', 'Narx', 'Jami']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [225, 29, 72] },
      styles: { fontSize: 9 }
    });

    const total = processedInvoice.items.reduce((acc: number, it: any) => acc + (it.quantity * it.price), 0);
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`UMUMIY SUMMA: ${total.toLocaleString()} so'm`, 140, finalY);

    doc.save(`Chiqim_Nakladnoy_${processedInvoice.orderNumber}.pdf`);
  };

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">Chiqim Nakladnoyi</h1>
            <p className="text-muted-foreground mt-1 font-medium text-sm">Ombordan tovarlarni chiqarish va hujjatlashtirish.</p>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[3rem]">
              <CardHeader className="p-8">
                <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                  <UserCheck className="w-6 h-6 text-primary" /> Chiqim tafsilotlari
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">Mijoz turi</Label>
                    <RadioGroup 
                      value={clientType} 
                      onValueChange={(v: any) => setClientType(v)}
                      className="flex gap-4 p-2 bg-muted/20 rounded-2xl"
                    >
                      <div className="flex items-center space-x-2 bg-background/50 px-4 py-2 rounded-xl flex-1 cursor-pointer">
                        <RadioGroupItem value="external" id="external" />
                        <Label htmlFor="external" className="cursor-pointer font-bold">Tashqi mijoz</Label>
                      </div>
                      <div className="flex items-center space-x-2 bg-background/50 px-4 py-2 rounded-xl flex-1 cursor-pointer">
                        <RadioGroupItem value="internal" id="internal" />
                        <Label htmlFor="internal" className="cursor-pointer font-bold">Ichki mijoz</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">Mijoz / Qabul qiluvchi</Label>
                    <Input 
                      placeholder="Mijoz nomi" 
                      className="h-14 rounded-2xl bg-background/50 border-border/40 font-bold" 
                      value={recipient} 
                      onChange={(e) => setRecipient(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">Chiqaruvchi ombor</Label>
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
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">Hujjat raqami</Label>
                    <Input 
                      placeholder="SALE-2026-XXX" 
                      className="h-14 rounded-2xl bg-background/50 border-border/40 font-bold" 
                      value={orderNumber} 
                      onChange={(e) => setOrderNumber(e.target.value)} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[3rem]">
              <CardHeader className="p-8 flex flex-row items-center justify-between">
                <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                  <Package className="w-6 h-6 text-primary" /> Mahsulotlar ro'yxati
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addItem} className="gap-2 rounded-xl font-black uppercase text-[9px] tracking-widest h-9 px-4 border-rose-500/20 text-rose-600 hover:bg-rose-500/5">
                  <Plus className="w-4 h-4" /> Yangi qator
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
                          "flex flex-col md:flex-row gap-4 p-6 rounded-[2.5rem] bg-muted/10 border border-border/10 transition-all"
                        )}
                      >
                        <div className="flex-1 space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-40">Mahsulot</Label>
                          <Select 
                            onValueChange={(val) => updateItem(item.id, "productId", val)}
                            value={item.productId}
                          >
                            <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-none font-bold shadow-sm">
                              <SelectValue placeholder="Tanlang..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl max-h-[400px]">
                              <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border/10 mb-2">
                                 <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                      placeholder="Qidirish..." 
                                      className="h-10 pl-10 text-sm rounded-xl bg-background/50 border-none"
                                      value={item.searchQuery}
                                      onChange={(e) => updateItem(item.id, "searchQuery", e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                 </div>
                              </div>
                              {products?.filter(p => p.name.toLowerCase().includes(item.searchQuery.toLowerCase())).map((p) => (
                                <SelectItem key={p.id} value={p.id} className="py-3 rounded-xl">
                                  <div className="flex flex-col">
                                    <span className="font-bold">{p.name}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">{p.stock || 0} mavjud</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-full md:w-40 space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-40">Miqdor {selectedProduct && `(${t.units[selectedProduct.unit as keyof typeof t.units] || selectedProduct.unit})`}</Label>
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

          <div className="lg:col-span-4">
            <Card className="border-none glass-card bg-rose-600 text-white rounded-[3rem] shadow-2xl sticky top-8 overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                <Package className="w-32 h-32" />
              </div>
              <CardHeader className="p-8 pb-4 relative z-10">
                <CardTitle className="font-headline font-black text-2xl tracking-tight">Xulosa</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-8 relative z-10">
                <div className="flex justify-between items-center pb-6 border-b border-white/10">
                  <span className="text-white/60 text-xs font-black uppercase tracking-widest">Jami turlar</span>
                  <span className="text-4xl font-black">{items.filter(i => i.productId).length}</span>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 border border-white/5">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                         <User className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">Mijoz</p>
                        <p className="font-bold text-sm truncate">{recipient || '---'}</p>
                      </div>
                   </div>
                </div>
              </CardContent>
              <CardFooter className="p-8 pt-0 relative z-10">
                <Button 
                  className="w-full h-16 rounded-[1.5rem] bg-white text-rose-600 hover:bg-white/90 font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl border-none premium-button" 
                  onClick={handleDispatch} 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-3" /> Tasdiqlash va Yakunlash</>}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
          <DialogContent className="rounded-[2.5rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-md p-8 shadow-2xl text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight mb-2">Chiqim bajarildi!</DialogTitle>
              <p className="text-muted-foreground font-medium">Chiqim nakladnoyi muvaffaqiyatli rasmiylashtirildi.</p>
            </DialogHeader>
            <DialogFooter className="mt-8 flex-col sm:flex-col gap-3">
              <Button 
                onClick={handleDownloadPDF}
                className="w-full h-14 rounded-2xl bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] gap-3"
              >
                <Download className="w-4 h-4" /> PDF Nakladnoyni yuklab olish
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setIsSuccessOpen(false)}
                className="w-full h-12 rounded-2xl font-bold"
              >
                Yopish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}