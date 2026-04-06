"use client";
 
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Trash2, FileText, Loader2, Search, PackageSearch,
  CheckCircle2, Calendar, Warehouse, FileInput, Download,
  Save, X, RefreshCw, ChevronDown,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/context";
import {
  useCollection, useFirestore, useMemoFirebase, useUser,
} from "@/firebase";
import {
  collection, doc, getDoc, setDoc, runTransaction,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from "@/firebase/non-blocking-updates";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { generateInvoicePDF } from "@/services/pdf-service";
 
// ─── helpers ───────────────────────────────────────────────────────────────
const generateId = () =>
  Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
 
async function getNextDnNumber(db: any): Promise<string> {
  const counterRef = doc(db, "counters", "stockIn");
  try {
    const next = await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      const cur = snap.exists() ? snap.data().lastNumber || 0 : 0;
      const nxt = cur + 1;
      tx.set(counterRef, { lastNumber: nxt }, { merge: true });
      return nxt;
    });
    return `AI-${String(next).padStart(4, "0")}`;
  } catch {
    return `AI-${Date.now().toString().slice(-4)}`;
  }
}
 
const fmt = (v: number) =>
  v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
 
const VAT_RATES = [0, 10, 18, 20];
 
type ProductTab = "all" | "goods" | "dishes" | "prep" | "services";
 
interface LineItem {
  id: string;
  productId: string;
  searchQuery: string;
  // iiko-style quantity
  containerQty: number;   // В таре (qadoqdagi)
  unitQty: number;        // В ед. (birlikda)
  actualQty: number;      // Фактич. (faktik)
  containerSize: number;  // 1 qadoq = N birlik
  price: number;          // narx (per unit)
  vatRate: number;        // QQS %
  // read-only computed
  stockBefore: number;
  tab: ProductTab;
}
 
// ─── component ─────────────────────────────────────────────────────────────
export default function StockInPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role, assignedWarehouseId } = useUser();
 
  // form state
  const [loading, setLoading] = useState(false);
  const [dnLoading, setDnLoading] = useState(false);
  const [dnNumber, setDnNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [movementDateStr, setMovementDateStr] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [incomingDocNo, setIncomingDocNo] = useState(""); // Kiruvchi hujjat №
  const [invoiceNo, setInvoiceNo] = useState("");         // Hisob-faktura
  const [invoiceDate, setInvoiceDate] = useState("");
  const [comment, setComment] = useState("");
  const [concept, setConcept] = useState("");
  const [activeTab, setActiveTab] = useState<ProductTab>("all");
 
  // items
  const [items, setItems] = useState<LineItem[]>([
    {
      id: generateId(), productId: "", searchQuery: "",
      containerQty: 1, unitQty: 1, actualQty: 1,
      containerSize: 1, price: 0, vatRate: 0,
      stockBefore: 0, tab: "goods",
    },
  ]);
 
  // success dialog
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [processedInvoice, setProcessedInvoice] = useState<any>(null);
 
  const isAdmin = role === "Super Admin" || role === "Admin";
 
  // ── firebase queries ──────────────────────────────────────────────────
  const productsQuery = useMemoFirebase(
    () => (db ? collection(db, "products") : null), [db]
  );
  const { data: products } = useCollection(productsQuery);
 
  const warehousesQuery = useMemoFirebase(
    () => (db ? collection(db, "warehouses") : null), [db]
  );
  const { data: warehouses } = useCollection(warehousesQuery);
 
  // inventory snapshot for stockBefore
  const inventoryQuery = useMemoFirebase(
    () => (db ? collection(db, "inventory") : null), [db]
  );
  const { data: inventory } = useCollection(inventoryQuery);
 
  // ── init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!db) return;
    setDnLoading(true);
    getNextDnNumber(db)
      .then(setDnNumber)
      .finally(() => setDnLoading(false));
  }, [db]);
 
  useEffect(() => {
    if (!isAdmin && assignedWarehouseId) setWarehouseId(assignedWarehouseId);
  }, [isAdmin, assignedWarehouseId]);
 
  // update stockBefore when warehouse/productId changes
  const getStock = useCallback(
    (productId: string) => {
      if (!inventory || !warehouseId) return 0;
      const inv = inventory.find(
        (i) => i.warehouseId === warehouseId && i.productId === productId
      );
      return inv?.stock || 0;
    },
    [inventory, warehouseId]
  );
 
  // ── item helpers ──────────────────────────────────────────────────────
  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        id: generateId(), productId: "", searchQuery: "",
        containerQty: 1, unitQty: 1, actualQty: 1,
        containerSize: 1, price: 0, vatRate: 0,
        stockBefore: 0, tab: "goods",
      },
    ]);
 
  const removeItem = (id: string) => {
    if (items.length > 1) setItems((p) => p.filter((i) => i.id !== id));
  };
 
  const updateItem = (id: string, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const upd: any = { ...item, [field]: value };
 
        if (field === "productId" && value) {
          const p = products?.find((pr) => pr.id === value);
          if (p) {
            upd.price = p.purchasePrice || p.salePrice || 0;
            upd.vatRate = p.vatRate || 0;
            upd.containerSize = p.containerSize || 1;
            upd.stockBefore = getStock(value);
            upd.tab = p.category === "dish" ? "dishes"
              : p.category === "prep" ? "prep"
              : p.category === "service" ? "services"
              : "goods";
          }
        }
 
        // sync qty fields
        if (field === "containerQty") {
          upd.unitQty = parseFloat(value) * upd.containerSize;
          upd.actualQty = upd.unitQty;
        }
        if (field === "unitQty") {
          upd.containerQty = parseFloat(value) / upd.containerSize;
          upd.actualQty = parseFloat(value);
        }
        if (field === "actualQty") {
          upd.unitQty = parseFloat(value);
          upd.containerQty = parseFloat(value) / upd.containerSize;
        }
        if (field === "containerSize") {
          upd.unitQty = upd.containerQty * parseFloat(value);
          upd.actualQty = upd.unitQty;
        }
 
        return upd;
      })
    );
  };
 
  // ── filtered items by tab ─────────────────────────────────────────────
  const visibleItems = useMemo(() => {
    if (activeTab === "all") return items;
    return items.filter((i) => i.tab === activeTab);
  }, [items, activeTab]);
 
  // ── totals ────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let gross = 0, vatTotal = 0;
    items.forEach((item) => {
      const qty = item.actualQty || 0;
      const rowGross = qty * (item.price || 0);
      const rowVat = (rowGross * item.vatRate) / 100;
      gross += rowGross;
      vatTotal += rowVat;
    });
    return { gross, vatTotal, net: gross - vatTotal };
  }, [items]);
 
  // ── process ───────────────────────────────────────────────────────────
  const handleProcess = async (closeAfter = false) => {
    if (!dnNumber || !supplier || !warehouseId) {
      toast({
        variant: "destructive", title: "Xatolik",
        description: "DN raqam, yetkazuvchi va ombor majburiy.",
      });
      return;
    }
    if (items.some((i) => !i.productId)) {
      toast({
        variant: "destructive", title: "Xatolik",
        description: "Barcha qatorlarda mahsulot tanlanishi shart.",
      });
      return;
    }
 
    setLoading(true);
    try {
      const invoiceItems: any[] = [];
      const userName = user?.displayName || user?.email || "Noma'lum";
      const movDate = movementDateStr
        ? new Date(movementDateStr).toISOString()
        : new Date().toISOString();
 
      for (const item of items) {
        const product = products?.find((p) => p.id === item.productId);
        const qty = item.actualQty || 0;
        const unitLabel = product?.unit
          ? t.units[product.unit as keyof typeof t.units] || product.unit
          : "pcs";
        const rowTotal = qty * item.price;
        const vatAmt = (rowTotal * item.vatRate) / 100;
 
        invoiceItems.push({
          name: product?.name || "Noma'lum",
          sku: product?.sku || "",
          quantity: qty,
          price: item.price,
          vatRate: item.vatRate,
          vatAmount: vatAmt,
          unit: unitLabel,
        });
 
        addDocumentNonBlocking(collection(db, "stockMovements"), {
          productId: item.productId,
          productName: product?.name || "Noma'lum",
          warehouseId,
          warehouseName:
            warehouses?.find((w) => w.id === warehouseId)?.name || "Noma'lum",
          quantityChange: qty,
          movementType: "StockIn",
          movementDate: movDate,
          responsibleUserId: user?.uid,
          responsibleUserName: userName,
          dnNumber, supplier,
          incomingDocNo, invoiceNo, invoiceDate, comment, concept,
          unitPrice: item.price,
          totalPrice: rowTotal,
          vatRate: item.vatRate,
          vatAmount: vatAmt,
          unit: product?.unit || "pcs",
        });
 
        if (product) {
          updateDocumentNonBlocking(doc(db, "products", item.productId), {
            stock: (product.stock || 0) + qty,
            updatedAt: new Date().toISOString(),
          });
        }
 
        const invId = `${warehouseId}_${item.productId}`;
        const invRef = doc(db, "inventory", invId);
        const invSnap = await getDoc(invRef);
        if (invSnap.exists()) {
          updateDocumentNonBlocking(invRef, {
            stock: (invSnap.data().stock || 0) + qty,
            updatedAt: new Date().toISOString(),
          });
        } else {
          await setDoc(invRef, {
            id: invId, warehouseId,
            productId: item.productId,
            stock: qty,
            updatedAt: new Date().toISOString(),
          });
        }
      }
 
      const savedInvoice = {
        dnNumber, supplier, incomingDocNo, invoiceNo,
        warehouse: warehouses?.find((w) => w.id === warehouseId)?.name,
        date: new Date(movDate).toLocaleString(),
        items: invoiceItems, responsible: userName,
        totals,
      };
      setProcessedInvoice(savedInvoice);
      toast({
        title: "Muvaffaqiyatli saqlandi!",
        description: `${dnNumber} — kirim nakладной rasmiylashtirildi.`,
      });
 
      // reset form
      setItems([{
        id: generateId(), productId: "", searchQuery: "",
        containerQty: 1, unitQty: 1, actualQty: 1,
        containerSize: 1, price: 0, vatRate: 0,
        stockBefore: 0, tab: "goods",
      }]);
      setSupplier(""); setIncomingDocNo(""); setInvoiceNo("");
      setInvoiceDate(""); setComment(""); setConcept("");
      setMovementDateStr(new Date().toISOString().split("T")[0]);
      if (isAdmin) setWarehouseId("");
 
      const next = await getNextDnNumber(db);
      setDnNumber(next);
 
      if (closeAfter) setIsSuccessOpen(false);
      else setIsSuccessOpen(true);
    } catch (err: any) {
      toast({
        variant: "destructive", title: "Xatolik",
        description:
          err?.code === "permission-denied"
            ? "Ruxsat yo'q."
            : "Saqlashda xatolik yuz berdi.",
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
      docNumber: processedInvoice.dnNumber,
      date: processedInvoice.date,
      partyName: processedInvoice.supplier,
      partyTypeLabel: t.pdf.supplier,
      warehouseName: processedInvoice.warehouse,
      responsibleName: processedInvoice.responsible,
      items: processedInvoice.items,
      currency: currencyStr,
      labels: {
        number: t.stockIn.dnNumber, date: t.common.date,
        warehouse: t.common.warehouse,
        product: t.products.productInfo,
        qty: t.common.quantity, unit: t.units.label,
        price: t.common.price, total: t.common.summary,
        grandTotal: t.expenses.total,
        shippedBy: t.pdf.shippedBy, receivedBy: t.pdf.receivedBy,
      },
    });
  };
 
  // ── tabs ──────────────────────────────────────────────────────────────
  const TABS: { key: ProductTab; label: string }[] = [
    { key: "all",      label: "Barcha" },
    { key: "goods",    label: "Tovarlar" },
    { key: "dishes",   label: "Taomlar" },
    { key: "prep",     label: "Yarim tayyor" },
    { key: "services", label: "Xizmatlar" },
  ];
 
  // ── render ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
 
      <main className="flex-1 overflow-y-auto">
        {/* ── page title bar ── */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/30 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileInput className="w-5 h-5 text-primary" />
            <h1 className="font-black text-base tracking-tight">
              {t.stockIn.title}{" "}
              {dnNumber && (
                <span className="font-mono text-primary">№{dnNumber}</span>
              )}
              {movementDateStr && (
                <span className="font-normal text-muted-foreground ml-2 text-sm">
                  от {new Date(movementDateStr).toLocaleDateString("ru-RU")}
                </span>
              )}
            </h1>
          </div>
 
          {/* action buttons — iiko style */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-lg font-bold text-xs gap-2"
              onClick={() => handleProcess(false)}
              disabled={loading}
            >
              {loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />}
              Обновить
            </Button>
            <Button
              size="sm"
              className="h-9 rounded-lg font-bold text-xs gap-2 bg-primary text-white"
              onClick={() => handleProcess(false)}
              disabled={loading}
            >
              <Save className="w-3.5 h-3.5" />
              Сохранить
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-lg font-bold text-xs gap-2"
              asChild
            >
              <Link href="/products">
                <X className="w-3.5 h-3.5" />
                Выйти
              </Link>
            </Button>
            <Button
              size="sm"
              className="h-9 rounded-lg font-bold text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleProcess(true)}
              disabled={loading}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Сохранить и закрыть
            </Button>
          </div>
        </div>
 
        <div className="p-6 space-y-4">
 
          {/* ── HEADER CARD — Основные свойства ── */}
          <Card className="border border-border/40 rounded-2xl shadow-sm">
            <div className="px-5 py-2.5 border-b border-border/20 flex gap-4 text-sm">
              <button className="font-bold text-primary border-b-2 border-primary pb-1">
                Основные свойства
              </button>
              <button className="text-muted-foreground font-medium pb-1">
                Доставка и оплата
              </button>
            </div>
 
            <CardContent className="p-5">
              {/* Row 1 */}
              <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                {/* left column */}
                <div className="space-y-3">
                  {/* DN raqam */}
                  <div className="flex items-center gap-3">
                    <Label className="w-44 shrink-0 text-xs font-semibold text-right text-muted-foreground">
                      {t.stockIn.dnNumber}:
                    </Label>
                    <div className="relative flex-1">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/40" />
                      {dnLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary animate-spin" />
                      )}
                      <Input
                        className="h-9 pl-9 rounded-lg font-mono font-bold text-primary text-sm"
                        value={dnNumber}
                        onChange={(e) => setDnNumber(e.target.value)}
                      />
                    </div>
                  </div>
 
                  {/* Sana */}
                  <div className="flex items-center gap-3">
                    <Label className="w-44 shrink-0 text-xs font-semibold text-right text-muted-foreground">
                      Дата и время получения:
                    </Label>
                    <div className="relative flex-1">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/40" />
                      <Input
                        type="date"
                        className="h-9 pl-9 rounded-lg text-sm font-bold"
                        value={movementDateStr}
                        onChange={(e) => setMovementDateStr(e.target.value)}
                      />
                    </div>
                  </div>
 
                  {/* Konsepsiya */}
                  <div className="flex items-center gap-3">
                    <Label className="w-44 shrink-0 text-xs font-semibold text-right text-muted-foreground">
                      Концепция:
                    </Label>
                    <Input
                      className="h-9 rounded-lg text-sm font-bold flex-1"
                      placeholder="—"
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                    />
                  </div>
 
                  {/* Kiruvchi hujjat */}
                  <div className="flex items-center gap-3">
                    <Label className="w-44 shrink-0 text-xs font-semibold text-right text-muted-foreground">
                      Вход. документ №:
                    </Label>
                    <Input
                      className="h-9 rounded-lg text-sm font-bold flex-1"
                      placeholder="9876543"
                      value={incomingDocNo}
                      onChange={(e) => setIncomingDocNo(e.target.value)}
                    />
                  </div>
 
                  {/* Izoh */}
                  <div className="flex items-center gap-3">
                    <Label className="w-44 shrink-0 text-xs font-semibold text-right text-muted-foreground">
                      Комментарий:
                    </Label>
                    <Input
                      className="h-9 rounded-lg text-sm flex-1"
                      placeholder="Na osnove zakaza..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>
                </div>
 
                {/* right column */}
                <div className="space-y-3">
                  {/* Yetkazuvchi */}
                  <div className="flex items-center gap-3">
                    <Label className="w-32 shrink-0 text-xs font-semibold text-right text-muted-foreground">
                      {t.stockIn.supplier}:
                    </Label>
                    <Input
                      className="h-9 rounded-lg text-sm font-bold flex-1"
                      placeholder="Yetkazuvchi nomi"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                    />
                  </div>
 
                  {/* Ombor */}
                  <div className="flex items-center gap-3">
                    <Label className="w-32 shrink-0 text-xs font-semibold text-right text-muted-foreground">
                      {t.stockIn.targetWarehouse}:
                    </Label>
                    <Select
                      onValueChange={setWarehouseId}
                      value={warehouseId}
                      disabled={!isAdmin && !!assignedWarehouseId}
                    >
                      <SelectTrigger className="h-9 rounded-lg flex-1 text-sm font-bold">
                        <div className="flex items-center gap-2">
                          <Warehouse className="w-3.5 h-3.5 text-primary/40" />
                          <SelectValue placeholder="Ombor tanlang" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {warehouses?.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
 
                  {/* Hisob-faktura № */}
                  <div className="flex items-center gap-3">
                    <Label className="w-32 shrink-0 text-xs font-semibold text-right text-muted-foreground">
                      Счёт-фактура:
                    </Label>
                    <Input
                      className="h-9 rounded-lg text-sm font-bold flex-1"
                      placeholder="123456"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                    />
                  </div>
 
                  {/* Hisob-faktura sanasi */}
                  <div className="flex items-center gap-3">
                    <Label className="w-32 shrink-0 text-xs font-semibold text-right text-muted-foreground">
                      От:
                    </Label>
                    <Input
                      type="date"
                      className="h-9 rounded-lg text-sm font-bold flex-1"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
 
          {/* ── ITEMS TABLE ── */}
          <Card className="border border-border/40 rounded-2xl shadow-sm overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center border-b border-border/20 bg-muted/10 px-4 gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-4 py-2.5 text-xs font-bold transition-colors border-b-2",
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                  {tab.key !== "all" && (
                    <span className={cn(
                      "ml-1.5 text-[9px] rounded-full px-1.5 py-0.5",
                      activeTab === tab.key
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {items.filter(
                        (i) => i.tab === tab.key && i.productId
                      ).length}
                    </span>
                  )}
                </button>
              ))}
 
              {/* add button on right */}
              <div className="ml-auto py-2">
                <Button
                  size="sm"
                  onClick={addItem}
                  className="h-8 rounded-lg font-bold text-[10px] uppercase tracking-wide bg-primary text-white gap-1.5"
                >
                  <Plus className="w-3 h-3" />
                  {t.actions.addItem}
                </Button>
              </div>
            </div>
 
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/20 text-[10px] uppercase font-black tracking-wider text-muted-foreground border-b border-border/20">
                  <tr>
                    <th className="px-3 py-3 w-10 text-center">№</th>
                    <th className="px-3 py-3 w-20 text-center">Kod</th>
                    <th className="px-3 py-3 min-w-[220px]">Mahsulot nomi</th>
                    {/* iiko: 3 quantity columns */}
                    <th className="px-2 py-3 w-24 text-right">Qadoqda</th>
                    <th className="px-2 py-3 w-24 text-right">Birlikda</th>
                    <th className="px-2 py-3 w-24 text-right bg-amber-50/50 dark:bg-amber-900/10">Faktik</th>
                    <th className="px-2 py-3 w-32 text-right">Narx</th>
                    <th className="px-2 py-3 w-32 text-right">Summa</th>
                    <th className="px-2 py-3 w-20 text-right">QQS, %</th>
                    <th className="px-2 py-3 w-28 text-right">QQS summa</th>
                    <th className="px-2 py-3 w-28 text-right">Sofsiz</th>
                    <th className="px-2 py-3 w-28 text-right">Oldingi qoldiq</th>
                    <th className="px-2 py-3 w-28 text-right">Yangi qoldiq</th>
                    <th className="px-3 py-3 w-10"></th>
                  </tr>
                </thead>
 
                <tbody className="divide-y divide-border/10">
                  <AnimatePresence mode="popLayout">
                    {visibleItems.map((item, index) => {
                      const sel = products?.find((p) => p.id === item.productId);
                      const qty = item.actualQty || 0;
                      const rowGross = qty * (item.price || 0);
                      const rowVat = (rowGross * item.vatRate) / 100;
                      const rowNet = rowGross - rowVat;
                      const stockAfter = item.stockBefore + qty;
                      const unitLabel = sel
                        ? t.units[sel.unit as keyof typeof t.units] || sel.unit
                        : "";
 
                      return (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -16 }}
                          className="hover:bg-primary/[0.02] group"
                        >
                          <td className="px-3 py-2 text-center text-xs font-bold opacity-40">
                            {index + 1}
                          </td>
 
                          {/* SKU */}
                          <td className="px-3 py-2 text-center">
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {sel?.sku || "—"}
                            </span>
                          </td>
 
                          {/* Product select with search */}
                          <td className="px-3 py-2">
                            <Select
                              onValueChange={(v) => updateItem(item.id, "productId", v)}
                              value={item.productId}
                            >
                              <SelectTrigger className="h-9 rounded-lg bg-background/50 border-border/40 font-bold text-xs w-full">
                                <SelectValue placeholder={t.products.search} />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl max-h-[300px]">
                                <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border/10 mb-1">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                    <Input
                                      placeholder="Qidirish..."
                                      className="h-8 pl-8 text-xs rounded-lg"
                                      value={item.searchQuery}
                                      onChange={(e) =>
                                        updateItem(item.id, "searchQuery", e.target.value)
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                </div>
                                {products
                                  ?.filter(
                                    (p) =>
                                      p.name.toLowerCase().includes(item.searchQuery.toLowerCase()) ||
                                      (p.sku && p.sku.toLowerCase().includes(item.searchQuery.toLowerCase()))
                                  )
                                  .map((p) => (
                                    <SelectItem key={p.id} value={p.id} className="text-xs py-2 font-bold">
                                      {p.sku && (
                                        <span className="font-mono text-muted-foreground mr-1.5">
                                          {p.sku}
                                        </span>
                                      )}
                                      {p.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </td>
 
                          {/* Qadoqda (В таре) */}
                          <td className="px-2 py-2">
                            <Input
                              type="number" min={0}
                              className="h-9 rounded-lg text-right text-xs font-black bg-background/50 border-border/40 w-full"
                              value={item.containerQty}
                              onChange={(e) =>
                                updateItem(item.id, "containerQty", parseFloat(e.target.value) || 0)
                              }
                            />
                          </td>
 
                          {/* Birlikda (В ед.) */}
                          <td className="px-2 py-2">
                            <div className="space-y-0.5">
                              <Input
                                type="number" min={0}
                                className="h-9 rounded-lg text-right text-xs font-black bg-background/50 border-border/40 w-full"
                                value={item.unitQty}
                                onChange={(e) =>
                                  updateItem(item.id, "unitQty", parseFloat(e.target.value) || 0)
                                }
                              />
                              {unitLabel && (
                                <p className="text-[9px] text-center text-primary/60 font-bold uppercase">
                                  {unitLabel}
                                </p>
                              )}
                            </div>
                          </td>
 
                          {/* Faktik (Фактич.) — highlighted */}
                          <td className="px-2 py-2 bg-amber-50/30 dark:bg-amber-900/5">
                            <Input
                              type="number" min={0}
                              className="h-9 rounded-lg text-right text-xs font-black bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/40 w-full"
                              value={item.actualQty}
                              onChange={(e) =>
                                updateItem(item.id, "actualQty", parseFloat(e.target.value) || 0)
                              }
                            />
                          </td>
 
                          {/* Narx (Price) */}
                          <td className="px-2 py-2">
                            <Input
                              type="number" min={0}
                              className="h-9 rounded-lg text-right text-xs font-black bg-background/50 border-border/40 w-full"
                              value={item.price}
                              onChange={(e) =>
                                updateItem(item.id, "price", parseFloat(e.target.value) || 0)
                              }
                            />
                          </td>
 
                          {/* Summa */}
                          <td className="px-2 py-2 text-right font-black text-sm text-primary">
                            {fmt(rowGross)}
                          </td>
 
                          {/* QQS % */}
                          <td className="px-2 py-2">
                            <Select
                              value={String(item.vatRate)}
                              onValueChange={(v) =>
                                updateItem(item.id, "vatRate", parseFloat(v))
                              }
                            >
                              <SelectTrigger className="h-9 rounded-lg text-xs font-bold bg-background/50 border-border/40 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {VAT_RATES.map((r) => (
                                  <SelectItem key={r} value={String(r)} className="text-xs">
                                    {r}%
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
 
                          {/* QQS summa */}
                          <td className="px-2 py-2 text-right text-xs font-semibold text-muted-foreground">
                            {fmt(rowVat)}
                          </td>
 
                          {/* Net (without VAT) */}
                          <td className="px-2 py-2 text-right text-xs font-semibold text-muted-foreground">
                            {fmt(rowNet)}
                          </td>
 
                          {/* Stock before */}
                          <td className="px-2 py-2 text-right text-xs text-muted-foreground">
                            {fmt(item.stockBefore)}
                          </td>
 
                          {/* Stock after */}
                          <td className={cn(
                            "px-2 py-2 text-right text-xs font-bold",
                            stockAfter >= 0 ? "text-emerald-600" : "text-rose-500"
                          )}>
                            {fmt(stockAfter)}
                          </td>
 
                          {/* Delete */}
                          <td className="px-3 py-2">
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
 
                  {/* empty row hint */}
                  {visibleItems.length === 0 && (
                    <tr>
                      <td colSpan={14} className="py-10 text-center text-muted-foreground text-sm">
                        Bu tabda mahsulot yo'q.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
 
            {/* ── Footer: totals ── */}
            <div className="border-t border-border/20 bg-muted/10 px-6 py-4 flex items-center justify-between">
              {/* left: item counts */}
              <div className="flex items-center gap-8 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs font-semibold mr-2">
                    Позиций:
                  </span>
                  <span className="font-black">
                    {items.filter((i) => i.productId).length}
                  </span>
                </div>
              </div>
 
              {/* right: financial summary — iiko style */}
              <div className="flex items-center gap-8 text-sm font-bold">
                <div className="text-right">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-0.5">
                    QQS sofsiz summa
                  </p>
                  <p className="text-base font-black">{fmt(totals.net)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-0.5">
                    QQS miqdori
                  </p>
                  <p className="text-base font-black text-amber-600">{fmt(totals.vatTotal)}</p>
                </div>
                <div className="text-right bg-primary/5 rounded-xl px-5 py-2">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-0.5">
                    Общая сумма (QQS bilan)
                  </p>
                  <p className="text-2xl font-black text-primary font-headline">
                    {fmt(totals.gross)}{" "}
                    <span className="text-xs font-bold opacity-60">
                      {t.settings.currency.split(" ")[0]}
                    </span>
                  </p>
                  {totals.vatTotal > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      в том числе НДС: {fmt(totals.vatTotal)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
 
        {/* ── Success Dialog ── */}
        <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
          <DialogContent className="rounded-[2rem] border-white/5 bg-card/50 backdrop-blur-2xl p-8 shadow-2xl text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                Muvaffaqiyatli saqlandi!
              </DialogTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Kirim nakładnoyi rasmiylashtirildi.
              </p>
              <p className="text-primary font-black text-lg mt-2 font-mono">
                {processedInvoice?.dnNumber}
              </p>
              {processedInvoice && (
                <div className="mt-3 text-left bg-muted/20 rounded-xl p-4 space-y-1 text-xs">
                  <p><span className="text-muted-foreground w-28 inline-block">Yetkazuvchi:</span> <strong>{processedInvoice.supplier}</strong></p>
                  <p><span className="text-muted-foreground w-28 inline-block">Ombor:</span> <strong>{processedInvoice.warehouse}</strong></p>
                  <p><span className="text-muted-foreground w-28 inline-block">Sana:</span> <strong>{processedInvoice.date}</strong></p>
                  <p><span className="text-muted-foreground w-28 inline-block">Jami summa:</span> <strong className="text-primary">{fmt(processedInvoice.totals.gross)}</strong></p>
                  {processedInvoice.totals.vatTotal > 0 && (
                    <p><span className="text-muted-foreground w-28 inline-block">QQS:</span> <strong>{fmt(processedInvoice.totals.vatTotal)}</strong></p>
                  )}
                </div>
              )}
            </DialogHeader>
            <DialogFooter className="mt-6 flex-col gap-2">
              <Button
                onClick={handleDownloadPDF}
                className="w-full h-12 rounded-xl bg-primary text-white font-bold gap-2"
              >
                <Download className="w-4 h-4" />
                PDF yuklash
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsSuccessOpen(false)}
                className="w-full h-10 rounded-xl font-bold text-sm"
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
 
