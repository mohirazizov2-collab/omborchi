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
  Download,
  CheckCircle2,
  Calendar,
  Warehouse,
  FileOutput,
  AlertTriangle,
  ArrowRight,
  Info
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
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
  const [items, setItems] = useState([{ id: generateId(), productId: "", quantity: 1, price: 0, searchQuery: "" }]);
  const [orderNumber, setOrderNumber] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [clientType, setClientType] = useState<"internal" | "external">("external");
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [processedInvoice, setProcessedInvoice] = useState<any>(null);

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

  const inventoryQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "inventory");
  }, [db]);
  const { data: inventory } = useCollection(inventoryQuery);

  const formatMoney = (val: number) => val.toLocaleString().replace(/,/g, ' ');

  const getStockForProduct = (pId: string) => {
    if (!warehouseId || !pId || !inventory) return 0;
    const invItem = inventory.find(i => i.warehouseId === warehouseId && i.productId === pId);
    return invItem ? (invItem.stock || 0) : 0;
  };

  const addItem = () => {
    setItems([...items, { id: generateId(), productId: "", quantity: 1, price: 0, searchQuery: "" }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === "productId" && value) {
          const p = products?.find(prod => prod.id === value);
          if (p) updated.price = p.salePrice || 0;
        }
        return updated;
      }
      return item;
    }));
  };

  const validation = useMemo(() => {
    const errors = [];
    const itemErrors: Record<string, string> = {};

    if (!warehouseId) errors.push("Omborni tanlang.");
    if (!recipient) errors.push("Mijoz nomini kiriting.");
    
    items.forEach(item => {
      if (!item.productId) {
        itemErrors[item.id] = "Mahsulot tanlanmagan";
      } else {
        const stock = getStockForProduct(item.productId);
        if (item.quantity > stock) {
          itemErrors[item.id] = `Zaxira yetarli emas (Mavjud: ${stock})`;
        }
        if (item.quantity <= 0) {
          itemErrors[item.id] = "Miqdor noto'g'ri";
        }
      }
    });

    return { 
      isValid: errors.length === 0 && Object.keys(itemErrors).length === 0,
      errors,
      itemErrors
    };
  }, [items, warehouseId, recipient, inventory]);

  const totalValue = useMemo(() => {
    return items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.price || 0)), 0);
  }, [items]);

  const handlePreDispatch = () => {
    if (!validation.isValid) {
      toast({ 
        variant: "destructive", 
        title: "Xatolik", 
        description: validation.errors[0] || "Jadvaldagi xatoliklarni to'g'rilang." 
      });
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleFinalProcess = async () => {
    setIsConfirmOpen(false);
    setLoading(true);
    const saleId = `SALE_${Date.now()}`;

    try {
      const invoiceItems = [];
      for (const item of items) {
        const product = products?.find(p => p.id === item.productId);
        const stock = getStockForProduct(item.productId);
        const invId = `${warehouseId}_${item.productId}`;
        const invRef = doc(db, "inventory", invId);

        invoiceItems.push({
          name: product?.name || "Noma'lum",
          quantity: item.quantity,
          price: item.price,
          unit: product?.unit || "pcs"
        });

        const movementData = {
          productId: item.productId,
          productName: product?.name || "Noma'lum",
          warehouseId: warehouseId,
          warehouseName: warehouses?.find(w => w.id === warehouseId)?.name || "Noma'lum",
          quantityChange: -(item.quantity || 0),
          movementType: "StockOut",
          movementDate: new Date().toISOString(),
          responsibleUserId: user?.uid,
          responsibleUserName: user?.displayName || user?.email || "Noma'lum",
          orderNumber: orderNumber || saleId,
          recipient: recipient,
          clientType: clientType,
          saleId: saleId,
          unitPrice: item.price,
          totalPrice: (item.quantity || 0) * (item.price || 0),
          unit: product?.unit || "pcs"
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
          stock: stock - (item.quantity || 0),
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
      setItems([{ id: generateId(), productId: "", quantity: 1, price: 0, searchQuery: "" }]);
      setOrderNumber("");
      setRecipient("");
      setWarehouseId("");
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Xatolik", description: "Saqlashda xato yuz berdi." });
    } finally {
      loading && setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!processedInvoice) return;
    const jsPDFLib = (await import("jspdf")).default;
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
    doc.text(`Mijoz: ${processedInvoice.recipient} (${processedInvoice.clientType === 'internal' ? 'Ichki' : 'Tashqi'})`, 20, 57);
    doc.text(`Chiqarilgan ombor: ${processedInvoice.warehouse}`, 20, 64);
    doc.text(`Sana: ${processedInvoice.date}`, 140, 50);

    const tableData = processedInvoice.items.map((it: any, i: number) => [
      i + 1,
      it.name,
      it.quantity,
      t.units[it.unit as keyof typeof t.units] || it.unit,
      `${formatMoney(it.price)} so'm`,
      `${formatMoney(it.quantity * it.price)} so'm`
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
    doc.text(`UMUMIY SUMMA: ${formatMoney(total)} so'm`, 140, finalY);

    doc.save(`Chiqim_Nakladnoy_${processedInvoice.orderNumber}.pdf`);
  };

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto page-transition">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground flex items-center gap-3">
              <FileOutput className="w-8 h-8 text-rose-600" /> Chiqim Nakladnoyi
            </h1>
            <p className="text-muted-foreground mt-1 font-medium text-sm">Ombordan tovarlarni chiqarish va sotuv.</p>
          </div>
        </header>

        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-3xl bg-card/40 backdrop-blur-xl">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mijoz turi va nomi</Label>
                  <div className="flex flex-col md:flex-row gap-4">
                    <RadioGroup 
                      value={clientType} 
                      onValueChange={(v: any) => setClientType(v)}
                      className="flex gap-2 p-1.5 bg-muted/20 rounded-xl"
                    >
                      <div className={cn("flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition-all", clientType === 'external' ? "bg-background shadow-sm" : "opacity-50")}>
                        <RadioGroupItem value="external" id="external" />
                        <Label htmlFor="external" className="cursor-pointer font-bold text-xs uppercase">Tashqi</Label>
                      </div>
                      <div className={cn("flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition-all", clientType === 'internal' ? "bg-background shadow-sm" : "opacity-50")}>
                        <RadioGroupItem value="internal" id="internal" />
                        <Label htmlFor="internal" className="cursor-pointer font-bold text-xs uppercase">Ichki</Label>
                      </div>
                    </RadioGroup>
                    <div className="relative flex-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-600/40" />
                      <Input 
                        placeholder="Mijoz / Qabul qiluvchi nomi" 
                        className="h-11 pl-10 rounded-xl bg-background/50 border-border/40 font-bold" 
                        value={recipient} 
                        onChange={(e) => setRecipient(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chiqaruvchi ombor</Label>
                    <Select onValueChange={setWarehouseId} value={warehouseId}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/40 font-bold">
                        <div className="flex items-center gap-2">
                          <Warehouse className="w-4 h-4 text-rose-600/40" />
                          <SelectValue placeholder="Tanlang" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {warehouses?.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hujjat raqami</Label>
                    <Input 
                      placeholder="SALE-00001" 
                      className="h-11 rounded-xl bg-background/50 border-border/40 font-bold" 
                      value={orderNumber} 
                      onChange={(e) => setOrderNumber(e.target.value)} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl bg-card/40 backdrop-blur-xl overflow-hidden">
            <div className="p-6 border-b border-border/10 flex justify-between items-center bg-muted/10">
              <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <Package className="w-4 h-4 text-rose-600" /> Mahsulotlar ro'yxati
              </h3>
              <Button onClick={addItem} size="sm" variant="outline" className="rounded-xl h-9 px-4 font-black uppercase text-[10px] tracking-widest border-rose-600/20 text-rose-600 hover:bg-rose-600/5">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Yangi qator
              </Button>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/30 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 w-12 text-center">№</th>
                      <th className="px-4 py-4 min-w-[250px]">Mahsulot nomi</th>
                      <th className="px-4 py-4 w-32 text-center">Qoldiq</th>
                      <th className="px-4 py-4 w-32">Miqdor</th>
                      <th className="px-4 py-4 w-40">Sotuv narxi (so'm)</th>
                      <th className="px-4 py-4 w-40">Jami summasi</th>
                      <th className="px-6 py-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    <AnimatePresence mode="popLayout">
                      {items.map((item, index) => {
                        const p = products?.find(prod => prod.id === item.productId);
                        const stock = getStockForProduct(item.productId);
                        const rowTotal = (item.quantity || 0) * (item.price || 0);
                        const hasError = validation.itemErrors[item.id];
                        const unitLabel = p ? (t.units[p.unit as keyof typeof t.units] || p.unit) : '';

                        return (
                          <motion.tr 
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={cn(
                              "hover:bg-muted/5 transition-colors group",
                              hasError && "bg-rose-500/[0.03]"
                            )}
                          >
                            <td className="px-6 py-3 text-center text-xs font-bold opacity-40">{index + 1}</td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <Select 
                                  onValueChange={(val) => updateItem(item.id, "productId", val)}
                                  value={item.productId}
                                >
                                  <SelectTrigger className={cn(
                                    "h-10 rounded-lg bg-background/50 border-border/40 font-bold focus:ring-rose-600/20",
                                    !item.productId && "border-dashed"
                                  )}>
                                    <SelectValue placeholder="Mahsulot tanlang..." />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl max-h-[300px]">
                                    <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border/10 mb-2">
                                      <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                        <Input 
                                          placeholder="Qidirish..." 
                                          className="h-9 pl-9 text-xs rounded-lg bg-background/50 border-none"
                                          value={item.searchQuery}
                                          onChange={(e) => updateItem(item.id, "searchQuery", e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    </div>
                                    {products?.filter(p => p.name.toLowerCase().includes(item.searchQuery.toLowerCase())).map((p) => (
                                      <SelectItem key={p.id} value={p.id} className="py-2.5 rounded-lg cursor-pointer font-bold">
                                        {p.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {hasError && <p className="text-[9px] font-black text-rose-600 uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {hasError}</p>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className={cn(
                                "inline-flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase",
                                stock <= 0 ? "bg-rose-500/10 text-rose-600" : stock < 10 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
                              )}>
                                <span className="flex items-center gap-1">{stock <= 0 && <AlertTriangle className="w-3 h-3" />}{stock}</span>
                                {unitLabel && <span className="opacity-50 text-[8px]">{unitLabel}</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <Input 
                                  type="number" 
                                  className={cn(
                                    "h-10 rounded-lg bg-background/50 border-border/40 font-black text-center",
                                    item.quantity > stock && "border-rose-600 text-rose-600"
                                  )}
                                  value={item.quantity}
                                  onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                                />
                                {unitLabel && <p className="text-[9px] font-black text-primary uppercase text-center">{unitLabel}</p>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <Input 
                                  type="number" 
                                  className="h-10 rounded-lg bg-background/50 border-border/40 font-black"
                                  value={item.price}
                                  onChange={(e) => updateItem(item.id, "price", parseFloat(e.target.value) || 0)}
                                />
                                {unitLabel && <p className="text-[9px] font-black text-muted-foreground uppercase opacity-50">1 {unitLabel} uchun</p>}
                              </div>
                            </td>
                            <td className={cn(
                              "px-4 py-3 font-black text-sm font-headline",
                              item.quantity > stock ? "text-rose-600" : "text-foreground"
                            )}>
                              {formatMoney(rowTotal)}
                            </td>
                            <td className="px-6 py-3">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="p-6 bg-muted/10 border-t border-border/10 flex justify-between items-center">
              <div className="flex gap-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Jami turlar</span>
                  <span className="text-xl font-black">{items.filter(i => i.productId).length} ta</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Umumiy Sotuv Summasi</span>
                  <span className={cn("text-2xl font-black font-headline", validation.isValid ? "text-rose-600" : "text-muted-foreground opacity-50")}>
                    {formatMoney(totalValue)} <span className="text-xs">so'm</span>
                  </span>
                </div>
              </div>
              <Button 
                className="h-14 rounded-2xl px-10 bg-rose-600 text-white font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-rose-600/20 border-none premium-button" 
                onClick={handlePreDispatch} 
                disabled={loading || !validation.isValid}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <FileOutput className="w-5 h-5 mr-2" />}
                Tasdiqlash va Chiqarish
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Confirmation Modal */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent className="rounded-[2.5rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-lg p-8 shadow-2xl">
            <DialogHeader>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4">
                <Info className="w-8 h-8" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight">Chiqimni tasdiqlang</DialogTitle>
              <p className="text-muted-foreground font-medium pt-2">Operatsiyani yakunlashdan oldin barcha ma'lumotlarni tekshiring.</p>
            </DialogHeader>
            
            <div className="py-6 space-y-4">
              <div className="p-4 rounded-2xl bg-muted/20 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-bold">Qabul qiluvchi:</span>
                  <span className="font-black">{recipient}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-bold">Ombor:</span>
                  <span className="font-black">{warehouses?.find(w => w.id === warehouseId)?.name}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-white/5 pt-3">
                  <span className="text-muted-foreground font-bold">Jami mahsulotlar:</span>
                  <span className="font-black">{items.length} ta</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-rose-600 font-black uppercase text-[10px] tracking-widest">Umumiy Summa</span>
                  <span className="text-xl font-black text-rose-600 font-headline">{formatMoney(totalValue)} so'm</span>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-emerald-600/80 leading-relaxed">
                  Tasdiqlashni bossangiz, ombor qoldig'i avtomatik kamaytiriladi va tarixda saqlanadi.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-3">
              <Button variant="ghost" onClick={() => setIsConfirmOpen(false)} className="rounded-2xl h-12 font-bold px-6">Bekor qilish</Button>
              <Button 
                onClick={handleFinalProcess}
                className="rounded-2xl h-12 flex-1 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] gap-2"
              >
                Tasdiqlayman <ArrowRight className="w-4 h-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Modal */}
        <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
          <DialogContent className="rounded-[2.5rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-md p-8 shadow-2xl text-center">
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