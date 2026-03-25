"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, FileText, Loader2, Search, PackageSearch,
  ShoppingCart, Download, CheckCircle2, Calendar, Warehouse, FileInput,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, getDoc, setDoc, runTransaction } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { generateInvoicePDF } from "@/services/pdf-service";

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

// ✅ AI-0001, AI-0002... avtomatik raqam
async function getNextDnNumber(db: any): Promise<string> {
  const counterRef = doc(db, "counters", "stockIn");
  try {
    const next = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      const current = snap.exists() ? (snap.data().lastNumber || 0) : 0;
      const next = current + 1;
      transaction.set(counterRef, { lastNumber: next }, { merge: true });
      return next;
    });
    return `AI-${String(next).padStart(4, "0")}`;
  } catch {
    return `AI-${Date.now().toString().slice(-4)}`;
  }
}

export default function StockInPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role, assignedWarehouseId } = useUser();

  const [loading, setLoading] = useState(false);
  const [dnLoading, setDnLoading] = useState(false);
  const [items, setItems] = useState([
    { id: generateId(), productId: "", quantity: 1, price: 0, searchQuery: "" },
  ]);
  const [dnNumber, setDnNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [movementDateStr, setMovementDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [processedInvoice, setProcessedInvoice] = useState<any>(null);

  const isAdmin = role === "Super Admin" || role === "Admin";

  // ✅ Sahifa ochilganda avtomatik DN raqam
  useEffect(() => {
    if (!db) return;
    setDnLoading(true);
    getNextDnNumber(db).then((num) => setDnNumber(num)).finally(() => setDnLoading(false));
  }, [db]);

  useEffect(() => {
    if (!isAdmin && assignedWarehouseId) setWarehouseId(assignedWarehouseId);
  }, [isAdmin, assignedWarehouseId]);

  const productsQuery = useMemoFirebase(() => db ? collection(db, "products") : null, [db]);
  const { data: products } = useCollection(productsQuery);
  const warehousesQuery = useMemoFirebase(() => db ? collection(db, "warehouses") : null, [db]);
  const { data: warehouses } = useCollection(warehousesQuery);

  const formatMoney = (val: number) => val.toLocaleString().replace(/,/g, " ");

  const addItem = () => setItems([...items, { id: generateId(), productId: "", quantity: 1, price: 0, searchQuery: "" }]);
  const removeItem = (id: string) => { if (items.length > 1) setItems(items.filter((i) => i.id !== id)); };

  const updateItem = (id: string, field: string, value: any) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === "productId" && value) {
        const p = products?.find((prod) => prod.id === value);
        if (p) updated.price = p.purchasePrice || p.salePrice || 0;
      }
      return updated;
    }));
  };

  const handleProcess = async () => {
    if (!dnNumber || !supplier || !warehouseId) {
      toast({ variant: "destructive", title: "Xatolik", description: "Barcha asosiy maydonlarni to'ldiring." });
      return;
    }
    if (items.some((i) => !i.productId)) {
      toast({ variant: "destructive", title: "Xatolik", description: "Barcha mahsulotlarni tanlang." });
      return;
    }
    if (items.some((i) => i.quantity <= 0)) {
      toast({ variant: "destructive", title: "Xatolik", description: "Miqdor 0 dan katta bo'lishi kerak." });
      return;
    }

    setLoading(true);
    try {
      const invoiceItems: any[] = [];
      const currentUserName = user?.displayName || user?.email || "Noma'lum";
      const movementDate = movementDateStr ? new Date(movementDateStr).toISOString() : new Date().toISOString();

      for (const item of items) {
        const product = products?.find((p) => p.id === item.productId);
        invoiceItems.push({
          name: product?.name || "Noma'lum",
          quantity: item.quantity,
          price: item.price,
          unit: product?.unit ? (t.units[product.unit as keyof typeof t.units] || product.unit) : "pcs",
        });

        addDocumentNonBlocking(collection(db, "stockMovements"), {
          productId: item.productId,
          productName: product?.name || "Noma'lum",
          warehouseId,
          warehouseName: warehouses?.find((w) => w.id === warehouseId)?.name || "Noma'lum",
          quantityChange: item.quantity,
          movementType: "StockIn",
          movementDate,
          responsibleUserId: user?.uid,
          responsibleUserName: currentUserName,
          dnNumber,
          supplier,
          unitPrice: item.price,
          totalPrice: (item.quantity || 0) * (item.price || 0),
          unit: product?.unit || "pcs",
        });

        if (product) {
          updateDocumentNonBlocking(doc(db, "products", item.productId), {
            stock: (product.stock || 0) + (item.quantity || 0),
            updatedAt: new Date().toISOString(),
          });
        }

        const invId = `${warehouseId}_${item.productId}`;
        const invRef = doc(db, "inventory", invId);
        const invSnap = await getDoc(invRef);
        if (invSnap.exists()) {
          updateDocumentNonBlocking(invRef, {
            stock: (invSnap.data().stock || 0) + (item.quantity || 0),
            updatedAt: new Date().toISOString(),
          });
        } else {
          await setDoc(invRef, { id: invId, warehouseId, productId: item.productId, stock: item.quantity, updatedAt: new Date().toISOString() });
        }
      }

      setProcessedInvoice({
        dnNumber, supplier,
        warehouse: warehouses?.find((w) => w.id === warehouseId)?.name,
        date: new Date(movementDate).toLocaleString(),
        items: invoiceItems, responsible: currentUserName,
      });

      toast({ title: t.stockIn.title, description: `${dnNumber} — muvaffaqiyatli saqlandi.` });
      setIsSuccessOpen(true);
      setItems([{ id: generateId(), productId: "", quantity: 1, price: 0, searchQuery: "" }]);
      setSupplier("");
      setMovementDateStr(new Date().toISOString().split("T")[0]);
      if (isAdmin) setWarehouseId("");
      // ✅ Keyingi raqam olish (counter allaqachon oshgan)
      const next = await getNextDnNumber(db);
      setDnNumber(next);
    } catch (err: any) {
      console.error("StockIn error:", err);
      toast({
        variant: "destructive", title: "Xatolik",
        description: err?.code === "permission-denied" ? "Ruxsat yo'q." : "Saqlashda xatolik yuz berdi.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!processedInvoice) return;
    const currencyStr = t.settings.currency.split(" ")[0];
    await generateInvoicePDF({
      title: t.nav.stockIn, type: "in",
      docNumber: processedInvoice.dnNumber, date: processedInvoice.date,
      partyName: processedInvoice.supplier, partyTypeLabel: t.pdf.supplier,
      warehouseName: processedInvoice.warehouse, responsibleName: processedInvoice.responsible,
      items: processedInvoice.items, currency: currencyStr,
      labels: {
        number: t.stockIn.dnNumber, date: t.common.date, warehouse: t.common.warehouse,
        product: t.products.productInfo, qty: t.common.quantity, unit: t.units.label,
        price: t.common.price, total: t.common.summary, grandTotal: t.expenses.total,
        shippedBy: t.pdf.shippedBy, receivedBy: t.pdf.receivedBy,
      },
    });
  };

  const totalValue = useMemo(
    () => items.reduce((acc, item) => acc + (item.quantity || 0) * (item.price || 0), 0),
    [items]
  );

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto page-transition">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground flex items-center gap-3">
              <FileInput className="w-8 h-8 text-primary" /> {t.stockIn.title}
            </h1>
            <p className="text-muted-foreground mt-1 font-medium text-sm">{t.stockIn.description}</p>
          </div>
          <Link href="/products">
            <Button variant="outline" className="rounded-xl h-11 px-5 font-bold text-xs">
              <PackageSearch className="w-4 h-4 mr-2" /> {t.nav.products}
            </Button>
          </Link>
        </header>

        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-3xl bg-card/40 backdrop-blur-xl">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* DN raqam — avtomatik */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {t.stockIn.dnNumber}
                  <span className="ml-2 text-primary opacity-60 normal-case font-normal">avtomatik</span>
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                  {dnLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}
                  <Input
                    placeholder="AI-0001"
                    className="h-11 pl-10 rounded-xl bg-primary/5 border-primary/20 font-bold font-mono text-primary"
                    value={dnNumber}
                    onChange={(e) => setDnNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.stockIn.supplier}</Label>
                <Input placeholder="..." className="h-11 rounded-xl bg-background/50 border-border/40 font-bold" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.stockIn.targetWarehouse}</Label>
                <Select onValueChange={setWarehouseId} value={warehouseId} disabled={!isAdmin && !!assignedWarehouseId}>
                  <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/40 font-bold">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-4 h-4 text-primary/40" />
                      <SelectValue placeholder={t.actions.filter} />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {warehouses?.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.common.date}</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                  <Input type="date" className="h-11 pl-10 rounded-xl bg-background/50 border-border/40 font-bold" value={movementDateStr} onChange={(e) => setMovementDateStr(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl bg-card/40 backdrop-blur-xl overflow-hidden">
            <div className="p-6 border-b border-border/10 flex justify-between items-center bg-muted/10">
              <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" /> {t.stockIn.productItems}
              </h3>
              <Button onClick={addItem} size="sm" className="rounded-xl h-9 px-4 font-black uppercase text-[10px] tracking-widest bg-primary text-white border-none">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> {t.actions.addItem}
              </Button>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/30 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 w-12 text-center">№</th>
                      <th className="px-4 py-4 min-w-[300px]">{t.products.productInfo}</th>
                      <th className="px-4 py-4 w-32">{t.common.quantity}</th>
                      <th className="px-4 py-4 w-40">{t.common.price}</th>
                      <th className="px-4 py-4 w-40">{t.common.summary}</th>
                      <th className="px-6 py-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    <AnimatePresence mode="popLayout">
                      {items.map((item, index) => {
                        const sel = products?.find((p) => p.id === item.productId);
                        const rowTotal = (item.quantity || 0) * (item.price || 0);
                        const unitLabel = sel ? t.units[sel.unit as keyof typeof t.units] || sel.unit : "";
                        return (
                          <motion.tr key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="hover:bg-primary/[0.02] group">
                            <td className="px-6 py-3 text-center text-xs font-bold opacity-40">{index + 1}</td>
                            <td className="px-4 py-3">
                              <Select onValueChange={(val) => updateItem(item.id, "productId", val)} value={item.productId}>
                                <SelectTrigger className="h-10 rounded-lg bg-background/50 border-border/40 font-bold">
                                  <SelectValue placeholder={t.products.search} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl max-h-[300px]">
                                  <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border/10 mb-2">
                                    <div className="relative">
                                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                      <Input placeholder={t.products.search} className="h-9 pl-9 text-xs rounded-lg bg-background/50 border-none" value={item.searchQuery} onChange={(e) => updateItem(item.id, "searchQuery", e.target.value)} onClick={(e) => e.stopPropagation()} />
                                    </div>
                                  </div>
                                  {products?.filter((p) => p.name.toLowerCase().includes(item.searchQuery.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(item.searchQuery.toLowerCase()))).map((p) => (
                                    <SelectItem key={p.id} value={p.id} className="py-2.5 rounded-lg cursor-pointer font-bold">{p.name} {p.sku ? `(${p.sku})` : ""}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <Input type="number" min={1} className="h-10 rounded-lg bg-background/50 border-border/40 font-black text-center" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)} />
                                {unitLabel && <p className="text-[9px] font-black text-primary uppercase text-center">{unitLabel}</p>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <Input type="number" min={0} className="h-10 rounded-lg bg-background/50 border-border/40 font-black" value={item.price} onChange={(e) => updateItem(item.id, "price", parseFloat(e.target.value) || 0)} />
                                {unitLabel && <p className="text-[9px] font-black text-muted-foreground uppercase opacity-50">1 {unitLabel}</p>}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-black text-sm text-primary font-headline">{formatMoney(rowTotal)}</td>
                            <td className="px-6 py-3">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeItem(item.id)}>
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
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{t.common.totalItems}</span>
                  <span className="text-xl font-black">{items.filter((i) => i.productId).length} ta</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{t.common.totalValue}</span>
                  <span className="text-2xl font-black text-primary font-headline">{formatMoney(totalValue)} <span className="text-xs">{t.settings.currency.split(" ")[0]}</span></span>
                </div>
              </div>
              <Button className="h-14 rounded-2xl px-10 bg-primary text-white font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-primary/20 border-none premium-button" onClick={handleProcess} disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                {t.stockIn.process}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
          <DialogContent className="rounded-[2.5rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground p-8 shadow-2xl text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight mb-2">Muvaffaqiyatli saqlandi!</DialogTitle>
              <p className="text-muted-foreground font-medium">Kirim nakladnoyi rasmiylashtirildi.</p>
              <p className="text-primary font-black text-xl mt-2 font-mono">{processedInvoice?.dnNumber}</p>
            </DialogHeader>
            <DialogFooter className="mt-8 flex-col sm:flex-col gap-3">
              <Button onClick={handleDownloadPDF} className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] gap-3">
                <Download className="w-4 h-4" /> PDF {t.actions.downloadReport}
              </Button>
              <Button variant="ghost" onClick={() => setIsSuccessOpen(false)} className="w-full h-12 rounded-2xl font-bold">{t.actions.cancel}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
