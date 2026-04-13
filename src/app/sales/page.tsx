"use client";
 
import { useState, useMemo, useCallback, useRef } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ShoppingBag, Search, Trash2, Plus, Minus, X,
  CreditCard, Banknote, ArrowLeftRight, Loader2,
  ChevronLeft, ChevronRight, Receipt,
  CheckCircle2, RefreshCw, Clock, Eye, Printer,
  Download, Filter, Calendar, BarChart3, TrendingUp,
  Package, AlertCircle, Warehouse,
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import {
  collection, doc, serverTimestamp, runTransaction, increment,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
 
// ─── Types ────────────────────────────────────────────────────────────────────
interface SaleItem {
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  // Qaysi sklad dan yechilishi kerak
  warehouseId: string;
  warehouseName: string;
}
 
interface SaleForm {
  customerName: string;
  staffId: string;
  paymentMethod: string;
  discount: number;
  note: string;
  // Global sklad — barcha mahsulotlar uchun standart
  warehouseId: string;
}
 
interface FilterState {
  payment: string;
  staffId: string;
  warehouseId: string;
  dateFrom: string;
  dateTo: string;
  search: string;
  status: string;
}
 
const defaultForm: SaleForm = {
  customerName: "", staffId: "", paymentMethod: "Naqd",
  discount: 0, note: "", warehouseId: "",
};
 
const defaultFilter: FilterState = {
  payment: "all", staffId: "all", warehouseId: "all",
  dateFrom: "", dateTo: "", search: "", status: "all",
};
 
const PAGE_SIZE = 12;
 
// ─── Utils ────────────────────────────────────────────────────────────────────
const fmt     = (n: number) => n.toLocaleString("uz-UZ");
const fmtDate = (ts: any) =>
  ts?.toDate?.()?.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }) || "—";
const fmtTime = (ts: any) =>
  ts?.toDate?.()?.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) || "";
 
type View = "pos" | "history";
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
function PayBadge({ method }: { method: string }) {
  const map: Record<string, string> = {
    "Naqd": "bg-emerald-100 text-emerald-700",
    "Karta": "bg-blue-100 text-blue-700",
    "Pul o'tkazmasi": "bg-violet-100 text-violet-700",
  };
  return <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${map[method] || "bg-slate-100 text-slate-500"}`}>{method}</span>;
}
 
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; Icon: any }> = {
    completed: { cls: "bg-emerald-100 text-emerald-700", label: "Yakunlandi", Icon: CheckCircle2 },
    refunded:  { cls: "bg-amber-100 text-amber-700",    label: "Qaytarildi", Icon: RefreshCw    },
    pending:   { cls: "bg-slate-100 text-slate-500",    label: "Kutilmoqda", Icon: Clock         },
  };
  const { cls, label, Icon } = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${cls}`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  );
}
 
function SkeletonRow() {
  return (
    <tr className="border-t border-slate-100 animate-pulse">
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-3 bg-slate-100 rounded-full" /></td>
      ))}
    </tr>
  );
}
 
function DeleteConfirm({ onConfirm, children }: { onConfirm: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span onClick={() => setOpen(true)}>{children}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" /> Sotuvni qaytarish
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-1">
            Mahsulotlar <strong>omborga qaytariladi</strong>. Davom etasizmi?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor</Button>
            <Button variant="destructive" onClick={() => { setOpen(false); onConfirm(); }}>Qaytarish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
 
function ReceiptDialog({ sale, onClose }: { sale: any; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const print = () => {
    if (!ref.current) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Chek</title><style>
      body{font-family:monospace;font-size:12px;padding:20px;max-width:300px}
      h2{text-align:center}.row{display:flex;justify-content:space-between}
      .dash{border-top:1px dashed #000;margin:6px 0}
    </style></head><body>${ref.current.innerHTML}</body></html>`);
    w.document.close(); w.print();
  };
  const items: SaleItem[] = sale.items || [];
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Receipt className="w-4 h-4" /> Chek #{sale.id?.slice(-6).toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        <div ref={ref} className="font-mono text-xs space-y-0.5 py-1">
          <div className="text-center font-bold text-sm mb-1">DO'KON CHEKI</div>
          <div className="border-t border-dashed border-slate-300 my-1" />
          <div className="flex justify-between"><span>Sana:</span><span>{fmtDate(sale.createdAt)}</span></div>
          <div className="flex justify-between"><span>Vaqt:</span><span>{fmtTime(sale.createdAt)}</span></div>
          <div className="flex justify-between"><span>Sotuvchi:</span><span>{sale.staffName}</span></div>
          {sale.warehouseName && <div className="flex justify-between"><span>Sklad:</span><span>{sale.warehouseName}</span></div>}
          {sale.customerName && <div className="flex justify-between"><span>Mijoz:</span><span>{sale.customerName}</span></div>}
          <div className="border-t border-dashed border-slate-300 my-1" />
          {items.map((it, i) => (
            <div key={i}>
              <div className="font-semibold">{it.productName}</div>
              <div className="flex justify-between text-slate-500">
                <span>{it.quantity} × {fmt(it.unitPrice)}</span>
                <span>{fmt(it.subtotal)}</span>
              </div>
            </div>
          ))}
          <div className="border-t border-dashed border-slate-300 my-1" />
          {sale.discount > 0 && <div className="flex justify-between text-amber-600"><span>Chegirma:</span><span>-{fmt(sale.discount)}</span></div>}
          <div className="flex justify-between font-bold"><span>JAMI:</span><span>{fmt(sale.amount)} so'm</span></div>
          <div className="flex justify-between"><span>To'lov:</span><span>{sale.paymentMethod}</span></div>
          <div className="border-t border-dashed border-slate-300 my-1" />
          <div className="text-center text-slate-400">Rahmat! Yana keling!</div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Yopish</Button>
          <Button size="sm" onClick={print} className="gap-1"><Printer className="w-3.5 h-3.5" />Chop</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
 
// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function SalesPage() {
  const { toast } = useToast();
  const db        = useFirestore();
 
  const [view, setView]                   = useState<View>("pos");
  const [loading, setLoading]             = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cart, setCart]                   = useState<SaleItem[]>([]);
  const [form, setForm]                   = useState<SaleForm>(defaultForm);
  const [receiptSale, setReceiptSale]     = useState<any>(null);
 
  const [filter, setFilter]       = useState<FilterState>(defaultFilter);
  const [currentPage, setCurrentPage] = useState(1);
 
  // ── Firestore ─────────────────────────────────────────────────────────────
  const salesQ      = useMemoFirebase(() => db ? collection(db, "sales")      : null, [db]);
  const staffQ      = useMemoFirebase(() => db ? collection(db, "staff")      : null, [db]);
  const inventoryQ  = useMemoFirebase(() => db ? collection(db, "inventory")  : null, [db]);
  const warehouseQ  = useMemoFirebase(() => db ? collection(db, "warehouses") : null, [db]);
 
  const { data: salesList,     isLoading: salesLoading } = useCollection(salesQ);
  const { data: staffList }                               = useCollection(staffQ);
  const { data: inventoryList }                           = useCollection(inventoryQ);
  const { data: warehouseList }                           = useCollection(warehouseQ);
 
  // ── Bitta sklad bo'lsa avtomatik tanlash ──────────────────────────────────
  // Agar faqat 1 ta sklad bo'lsa, foydalanuvchi dropdown ko'rmaydi
  const autoWarehouse = useMemo(() => {
    if (!warehouseList) return null;
    if (warehouseList.length === 1) return warehouseList[0];
    return null;
  }, [warehouseList]);
 
  const effectiveWarehouseId = autoWarehouse?.id || form.warehouseId;
  const effectiveWarehouse   = useMemo(() =>
    (warehouseList || []).find((w: any) => w.id === effectiveWarehouseId),
  [warehouseList, effectiveWarehouseId]);
 
  // ── Categories ────────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = new Set<string>();
    (inventoryList || []).forEach((p: any) => { if (p.category) cats.add(p.category); });
    return Array.from(cats).sort();
  }, [inventoryList]);
 
  // ── Tanlangan sklaддagi qoldiqni olish ────────────────────────────────────
  // inventory hujjatida: { quantity: number, warehouses: { [whId]: { quantity: number } } }
  // Agar warehouses yo'q bo'lsa — eski kolleksiya, quantity ni to'g'ridan ishlatadi
  const getWarehouseStock = useCallback((product: any, warehouseId: string): number => {
    if (!warehouseId) return product?.quantity ?? 0;
    // Multi-warehouse struktura
    if (product?.warehouses?.[warehouseId] !== undefined) {
      return product.warehouses[warehouseId]?.quantity ?? 0;
    }
    // Eski struktura — bitta sklad bo'lsa, umumiy qty ni qaytaradi
    return product?.quantity ?? 0;
  }, []);
 
  // ── Product grid — tanlangan sklad qoldiqlarini ko'rsatadi ───────────────
  const filteredProducts = useMemo(() =>
    (inventoryList || []).filter((p: any) => {
      const stock = effectiveWarehouseId
        ? getWarehouseStock(p, effectiveWarehouseId)
        : (p.quantity ?? 0);
      if (stock <= 0) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (!productSearch) return true;
      const q = productSearch.toLowerCase();
      return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(productSearch);
    }),
  [inventoryList, productSearch, categoryFilter, effectiveWarehouseId, getWarehouseStock]);
 
  // ── Cart ──────────────────────────────────────────────────────────────────
  // Savatdagi mahsulot uchun tanlangan sklaддagi qoldiq
  const getCartStock = useCallback((productId: string): number => {
    const product = (inventoryList || []).find((p: any) => p.id === productId);
    if (!product) return 0;
    return getWarehouseStock(product, effectiveWarehouseId);
  }, [inventoryList, effectiveWarehouseId, getWarehouseStock]);
 
  const addToCart = useCallback((product: any) => {
    // Sklad tanlanmagan bo'lsa, ogoh
    if (!effectiveWarehouseId) {
      toast({ title: "Sklad tanlanmagan", description: "Avval sklad tanlang", variant: "destructive" });
      return;
    }
    setCart((prev) => {
      const whStock = getWarehouseStock(product, effectiveWarehouseId);
      const inCart  = prev.find((i) => i.productId === product.id)?.quantity ?? 0;
      if (whStock - inCart <= 0) {
        toast({
          title: "Ombor yetarli emas",
          description: `"${product.name}" — ${effectiveWarehouse?.name || "sklad"}da tugagan`,
          variant: "destructive",
        });
        return prev;
      }
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitPrice }
            : i
        );
      }
      const unitPrice = product.salePrice ?? product.price ?? 0;
      return [...prev, {
        productId:     product.id,
        productName:   product.name,
        productSku:    product.sku || "",
        unitPrice,
        quantity:      1,
        subtotal:      unitPrice,
        warehouseId:   effectiveWarehouseId,
        warehouseName: effectiveWarehouse?.name || "",
      }];
    });
  }, [toast, effectiveWarehouseId, effectiveWarehouse, getWarehouseStock]);
 
  const changeQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const maxQty = getCartStock(productId);
        const newQty = Math.max(0, Math.min(i.quantity + delta, maxQty));
        if (newQty === 0) return null as any;
        return { ...i, quantity: newQty, subtotal: newQty * i.unitPrice };
      }).filter(Boolean)
    );
  }, [getCartStock]);
 
  const removeFromCart = useCallback((productId: string) =>
    setCart((prev) => prev.filter((i) => i.productId !== productId)), []);
 
  const clearCart = () => { setCart([]); setForm(defaultForm); };
 
  // Sklad o'zgartirilganda savat tozalanadi (chunki qoldiqlar boshqa)
  const handleWarehouseChange = (whId: string) => {
    if (cart.length > 0) {
      const confirmed = window.confirm(
        "Sklad o'zgartirilsa savat tozalanadi. Davom etasizmi?"
      );
      if (!confirmed) return;
      setCart([]);
    }
    setForm((p) => ({ ...p, warehouseId: whId }));
  };
 
  const cartSubtotal = useMemo(() => cart.reduce((s, i) => s + i.subtotal, 0), [cart]);
  const cartTotal    = useMemo(() => Math.max(0, cartSubtotal - (form.discount || 0)), [cartSubtotal, form.discount]);
 
  // ── Handle Sell ───────────────────────────────────────────────────────────
  const handleSell = async () => {
    if (!db) return;
    if (!effectiveWarehouseId) {
      toast({ title: "Xatolik", description: "Sklad tanlanmagan", variant: "destructive" });
      return;
    }
    if (!cart.length) {
      toast({ title: "Xatolik", description: "Savatga mahsulot qo'shing", variant: "destructive" });
      return;
    }
    if (!form.staffId) {
      toast({ title: "Xatolik", description: "Sotuvchini tanlang", variant: "destructive" });
      return;
    }
    if ((form.discount || 0) > cartSubtotal) {
      toast({ title: "Xatolik", description: "Chegirma summadan katta", variant: "destructive" });
      return;
    }
 
    setLoading(true);
    try {
      const staff     = staffList?.find((s: any) => s.id === form.staffId);
      const staffName = `${staff?.surname || ""} ${staff?.name || ""}`.trim();
      const today     = new Date().toISOString().split("T")[0];
      const whName    = effectiveWarehouse?.name || "";
 
      const saleRef     = doc(collection(db, "sales"));
      const revenueRef  = doc(db, "daily_revenue", today);
      const productRefs = cart.map((i) => doc(db, "inventory", i.productId));
      const txRefs      = cart.map(() => doc(collection(db, "inventory_transactions")));
 
      await runTransaction(db, async (tx) => {
        // PHASE 1: reads
        const snaps: any[] = [];
        for (const ref of productRefs) snaps.push(await tx.get(ref));
 
        // PHASE 2: validate — tanlangan sklaддagi qoldiqni tekshirish
        for (let i = 0; i < snaps.length; i++) {
          if (!snaps[i].exists()) throw new Error(`Mahsulot topilmadi: "${cart[i].productName}"`);
          const data = snaps[i].data();
          // Multi-warehouse: warehouses.{whId}.quantity
          // Eski: quantity
          const whQty: number = data?.warehouses?.[effectiveWarehouseId]?.quantity
            ?? data?.quantity
            ?? 0;
          if (whQty < cart[i].quantity) {
            throw new Error(
              `"${cart[i].productName}": ${whName}da so'ralgan ${cart[i].quantity} ta, mavjud ${whQty} ta`
            );
          }
        }
 
        // PHASE 3: writes
        tx.set(saleRef, {
          customerName:  form.customerName.trim(),
          staffId:       form.staffId,
          staffName,
          warehouseId:   effectiveWarehouseId,
          warehouseName: whName,
          paymentMethod: form.paymentMethod,
          discount:      form.discount || 0,
          note:          form.note.trim(),
          items:         cart,
          totalItems:    cart.reduce((s, i) => s + i.quantity, 0),
          subtotal:      cartSubtotal,
          amount:        cartTotal,
          status:        "completed",
          createdAt:     serverTimestamp(),
        });
 
        for (let i = 0; i < cart.length; i++) {
          const item = cart[i];
          const data = snaps[i].data();
          const hasMultiWh = data?.warehouses?.[effectiveWarehouseId] !== undefined;
 
          if (hasMultiWh) {
            // Multi-warehouse: faqat o'sha sklaддagi qty ni kamaytiramiz
            tx.update(productRefs[i], {
              [`warehouses.${effectiveWarehouseId}.quantity`]: increment(-item.quantity),
              totalSold: increment(item.quantity),
              lastSold:  serverTimestamp(),
            });
          } else {
            // Eski yagona-sklad: umumiy quantity
            tx.update(productRefs[i], {
              quantity:  increment(-item.quantity),
              totalSold: increment(item.quantity),
              lastSold:  serverTimestamp(),
            });
          }
 
          const qtyBefore = hasMultiWh
            ? (data.warehouses[effectiveWarehouseId]?.quantity ?? 0)
            : (data.quantity ?? 0);
 
          tx.set(txRefs[i], {
            productId:     item.productId,
            productName:   item.productName,
            productSku:    item.productSku,
            warehouseId:   effectiveWarehouseId,
            warehouseName: whName,
            type:          "sale",
            quantityDelta: -item.quantity,
            quantityBefore: qtyBefore,
            quantityAfter:  qtyBefore - item.quantity,
            unitPrice:     item.unitPrice,
            subtotal:      item.subtotal,
            staffId:       form.staffId,
            staffName,
            saleId:        saleRef.id,
            paymentMethod: form.paymentMethod,
            createdAt:     serverTimestamp(),
          });
        }
 
        tx.set(revenueRef, {
          date: today,
          revenue:    increment(cartTotal),
          salesCount: increment(1),
          itemsSold:  increment(cart.reduce((s, i) => s + i.quantity, 0)),
        }, { merge: true });
      });
 
      toast({ title: "✅ Sotuv amalga oshdi!", description: `${cart.length} xil — ${fmt(cartTotal)} so'm | ${whName}` });
      clearCart();
    } catch (err: any) {
      toast({ title: "Xatolik", description: err?.message || "Noma'lum xatolik", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
 
  // ── Delete Sale ───────────────────────────────────────────────────────────
  const handleDeleteSale = async (saleId: string) => {
    if (!db) return;
    const localSale = salesList?.find((s: any) => s.id === saleId);
    if (!localSale) return;
    const returnItems: SaleItem[] = localSale.items?.length
      ? localSale.items
      : localSale.productId
        ? [{
            productId:     localSale.productId,
            productName:   localSale.productName || "",
            productSku:    localSale.productSku || "",
            unitPrice:     localSale.unitPrice || 0,
            quantity:      localSale.quantity || 1,
            subtotal:      localSale.amount || 0,
            warehouseId:   localSale.warehouseId || "",
            warehouseName: localSale.warehouseName || "",
          }]
        : [];
    if (!returnItems.length) return;
 
    try {
      const saleDocRef   = doc(db, "sales", saleId);
      const productRefs  = returnItems.map((i) => doc(db, "inventory", i.productId));
      const refundTxRefs = returnItems.map(() => doc(collection(db, "inventory_transactions")));
      const saleDate     = localSale.createdAt?.toDate?.()?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0];
      const revenueRef   = doc(db, "daily_revenue", saleDate);
      const refundWhId   = localSale.warehouseId || "";
 
      await runTransaction(db, async (tx) => {
        const saleSnap = await tx.get(saleDocRef);
        if (!saleSnap.exists()) throw new Error("Sotuv topilmadi");
        if (saleSnap.data()?.status === "refunded") throw new Error("Allaqachon qaytarilgan");
 
        const invSnaps: any[] = [];
        for (const ref of productRefs) invSnaps.push(await tx.get(ref));
 
        tx.update(saleDocRef, { status: "refunded", refundedAt: serverTimestamp() });
 
        for (let i = 0; i < returnItems.length; i++) {
          const item = returnItems[i];
          if (!invSnaps[i].exists()) continue;
          const data = invSnaps[i].data();
          const hasMultiWh = refundWhId && data?.warehouses?.[refundWhId] !== undefined;
          const curQty: number = hasMultiWh
            ? (data.warehouses[refundWhId]?.quantity ?? 0)
            : (data.quantity ?? 0);
 
          if (hasMultiWh) {
            tx.update(productRefs[i], {
              [`warehouses.${refundWhId}.quantity`]: increment(item.quantity),
              totalSold: increment(-item.quantity),
            });
          } else {
            tx.update(productRefs[i], {
              quantity:  increment(item.quantity),
              totalSold: increment(-item.quantity),
            });
          }
 
          tx.set(refundTxRefs[i], {
            productId:      item.productId,
            productName:    item.productName,
            warehouseId:    refundWhId,
            warehouseName:  localSale.warehouseName || "",
            type:           "sale_refund",
            quantityDelta:  item.quantity,
            quantityBefore: curQty,
            quantityAfter:  curQty + item.quantity,
            unitPrice:      item.unitPrice,
            subtotal:       item.subtotal,
            staffId:        localSale.staffId,
            staffName:      localSale.staffName,
            originalSaleId: saleId,
            createdAt:      serverTimestamp(),
          });
        }
        tx.set(revenueRef, {
          revenue:    increment(-(localSale.amount || 0)),
          salesCount: increment(-1),
          itemsSold:  increment(-(localSale.totalItems || localSale.quantity || 1)),
        }, { merge: true });
      });
 
      toast({ title: "Qaytarildi", description: "Mahsulotlar omborga qaytarildi" });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err?.message, variant: "destructive" });
    }
  };
 
  // ── History filter ────────────────────────────────────────────────────────
  const filteredSales = useMemo(() => {
    if (!salesList) return [];
    return salesList.filter((s: any) => {
      if (filter.payment     !== "all" && s.paymentMethod !== filter.payment)     return false;
      if (filter.staffId     !== "all" && s.staffId       !== filter.staffId)     return false;
      if (filter.status      !== "all" && s.status        !== filter.status)      return false;
      if (filter.warehouseId !== "all" && s.warehouseId   !== filter.warehouseId) return false;
      if (filter.dateFrom) { const d = s.createdAt?.toDate?.(); if (d && d < new Date(filter.dateFrom)) return false; }
      if (filter.dateTo)   { const d = s.createdAt?.toDate?.(); const to = new Date(filter.dateTo); to.setHours(23,59,59); if (d && d > to) return false; }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        return (s.items || []).some((i: any) => i.productName?.toLowerCase().includes(q) || i.productSku?.toLowerCase().includes(q))
          || s.customerName?.toLowerCase().includes(q) || s.staffName?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [salesList, filter]);
 
  const stats = useMemo(() => ({
    count:    filteredSales.length,
    revenue:  filteredSales.reduce((s: number, x: any) => s + (x.amount || 0), 0),
    items:    filteredSales.reduce((s: number, x: any) => s + (x.totalItems || x.quantity || 1), 0),
    avgOrder: filteredSales.length
      ? Math.round(filteredSales.reduce((s: number, x: any) => s + (x.amount || 0), 0) / filteredSales.length) : 0,
  }), [filteredSales]);
 
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const pagedSales = useMemo(() => filteredSales.slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE), [filteredSales, currentPage]);
  const hasFilters = Object.entries(filter).some(([k, v]) =>
    ["payment","staffId","status","warehouseId"].includes(k) ? v !== "all" : v !== ""
  );
  const setF = (key: keyof FilterState, val: string) => { setFilter((p) => ({ ...p, [key]: val })); setCurrentPage(1); };
 
  const exportCSV = () => {
    if (!filteredSales.length) return;
    const headers = ["Sana","Vaqt","Sklad","Mijoz","Mahsulotlar","Soni","Chegirma","Jami","Sotuvchi","To'lov","Holat"];
    const rows = filteredSales.map((s: any) => [
      fmtDate(s.createdAt), fmtTime(s.createdAt), s.warehouseName||"",
      s.customerName||"",
      (s.items||[]).map((i: any) => `${i.productName}(${i.quantity})`).join("; ") || s.productName||"",
      s.totalItems||s.quantity||1, s.discount||0, s.amount||0,
      s.staffName||"", s.paymentMethod||"", s.status||"completed",
    ]);
    const csv = [headers,...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `sotuvlar_${new Date().toLocaleDateString("uz-UZ")}.csv`;
    a.click();
  };
 
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex min-h-screen bg-[#EAECF0]">
      <OmniSidebar />
 
      <div className="flex-1 flex flex-col overflow-hidden">
 
        {/* ── Top Nav ── */}
        <div className="bg-[#1C2333] text-white flex items-center justify-between px-5 h-12 shrink-0 shadow-lg">
          <div className="flex items-center">
            <button
              onClick={() => setView("pos")}
              className={`px-5 h-12 text-sm font-semibold transition-all ${
                view === "pos" ? "border-b-2 border-blue-400 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              🛒 Sotuv
            </button>
            <button
              onClick={() => setView("history")}
              className={`px-5 h-12 text-sm font-semibold transition-all ${
                view === "history" ? "border-b-2 border-blue-400 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              📋 Tarix
              {salesList?.length > 0 && (
                <span className="ml-2 bg-slate-600 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full">
                  {salesList.length}
                </span>
              )}
            </button>
          </div>
 
          {/* Tanlangan sklad — navbarda ko'rinadi */}
          {effectiveWarehouse && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <Warehouse className="w-3.5 h-3.5" />
              {effectiveWarehouse.name}
            </div>
          )}
 
          <div className="text-xs text-slate-500 font-mono">
            {new Date().toLocaleDateString("uz-UZ", { weekday: "long", day: "2-digit", month: "long" })}
          </div>
        </div>
 
        {/* ══ POS VIEW ══ */}
        {view === "pos" && (
          <div className="flex flex-1 overflow-hidden">
 
            {/* LEFT: Products */}
            <div className="flex-1 flex flex-col overflow-hidden">
 
              {/* Search + Category bar */}
              <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    placeholder="Qidirish..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
 
                <div className="flex items-center gap-1.5 overflow-x-auto flex-1">
                  {["all", ...categories].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        categoryFilter === cat
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {cat === "all" ? "Barchasi" : cat}
                    </button>
                  ))}
                </div>
 
                <div className="text-xs text-slate-400 shrink-0">
                  {filteredProducts.length} ta mahsulot
                </div>
              </div>
 
              {/* Sklad tanlanmagan ogoh banner */}
              {!effectiveWarehouseId && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 text-amber-700 text-sm font-semibold shrink-0">
                  <Warehouse className="w-4 h-4" />
                  Mahsulot sotish uchun avval sklatni tanlang →
                </div>
              )}
 
              {/* Product grid */}
              <div className="flex-1 overflow-y-auto p-4 bg-[#F0F2F5]">
                {!effectiveWarehouseId ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Warehouse className="w-14 h-14 mb-3 opacity-20" />
                    <p className="text-sm font-semibold">Sklad tanlanmagan</p>
                    <p className="text-xs text-slate-300 mt-1">O'ng paneldagi "Sklad" maydonidan tanlang</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Package className="w-14 h-14 mb-3 opacity-20" />
                    <p className="text-sm font-semibold">Mahsulot topilmadi</p>
                    {productSearch && (
                      <button onClick={() => setProductSearch("")} className="mt-2 text-blue-500 text-xs hover:underline">
                        Qidiruvni tozalash
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                    {filteredProducts.map((product: any) => {
                      const inCart   = cart.find((i) => i.productId === product.id);
                      const whStock  = getWarehouseStock(product, effectiveWarehouseId);
                      const lowStock = whStock <= 5;
                      return (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className={`relative text-left bg-white rounded-xl border transition-all duration-150 overflow-hidden
                            hover:border-blue-400 hover:shadow-lg active:scale-[0.96] cursor-pointer group
                            ${inCart ? "border-blue-400 ring-2 ring-blue-100 shadow-md" : "border-slate-200"}`}
                        >
                          {inCart && (
                            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-bl-xl z-10">
                              {inCart.quantity}
                            </div>
                          )}
 
                          <div className={`w-full h-20 flex items-center justify-center text-3xl font-black transition-colors
                            ${inCart ? "bg-blue-600 text-white" : "bg-gradient-to-br from-slate-100 to-slate-50 text-slate-300 group-hover:from-blue-50 group-hover:to-blue-100 group-hover:text-blue-400"}`}>
                            {product.name?.[0]?.toUpperCase() || "?"}
                          </div>
 
                          <div className="p-2.5">
                            <div className="text-[11px] font-bold text-slate-700 leading-tight line-clamp-2 mb-1.5">
                              {product.name}
                            </div>
                            <div className="text-[11px] font-black text-emerald-600">
                              {fmt(product.salePrice ?? product.price ?? 0)} so'm
                            </div>
                            {/* Tanlangan sklaддagi qoldiq */}
                            <div className={`text-[10px] mt-0.5 font-semibold ${lowStock ? "text-red-500" : "text-slate-400"}`}>
                              {lowStock ? `⚠ ${whStock} ta` : `${whStock} ta`}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
 
            {/* RIGHT: Cart */}
            <div className="w-[320px] xl:w-[360px] shrink-0 bg-white border-l border-slate-200 flex flex-col shadow-xl">
 
              {/* Cart header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-700 text-sm">Savat</span>
                  {cart.length > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                      {cart.reduce((s, i) => s + i.quantity, 0)} ta
                    </span>
                  )}
                </div>
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600 font-semibold transition-colors">
                    Tozalash
                  </button>
                )}
              </div>
 
              {/* Cart items */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-200 py-12">
                    <ShoppingBag className="w-16 h-16 mb-3" />
                    <p className="text-sm font-semibold text-slate-300">Savat bo'sh</p>
                    <p className="text-xs text-slate-200 mt-1">Chap tomondagi mahsulotni tanlang</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {cart.map((item) => (
                      <div key={item.productId} className="px-4 py-3 flex items-start gap-2 hover:bg-slate-50/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-800 truncate leading-tight">{item.productName}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{fmt(item.unitPrice)} so'm/ta</div>
                        </div>
 
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          <button
                            onClick={() => changeQty(item.productId, -1)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors text-slate-500"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-black text-slate-800">{item.quantity}</span>
                          <button
                            onClick={() => changeQty(item.productId, +1)}
                            disabled={item.quantity >= getCartStock(item.productId)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center transition-colors text-slate-500 disabled:opacity-30"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
 
                        <div className="w-16 text-right shrink-0 mt-0.5">
                          <div className="text-xs font-black text-slate-700">{fmt(item.subtotal)}</div>
                        </div>
 
                        <button onClick={() => removeFromCart(item.productId)} className="text-slate-200 hover:text-red-500 transition-colors mt-1 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
 
              {/* Bottom form */}
              <div className="border-t border-slate-100 p-4 space-y-3 shrink-0 bg-slate-50">
 
                {/* ── SKLAD TANLASH ── */}
                {/* Bitta sklad bo'lsa avtomatik — ko'rsatilmaydi */}
                {/* Ko'p sklad bo'lsa — majburiy dropdown */}
                {!autoWarehouse && (
                  <Select
                    value={form.warehouseId}
                    onValueChange={handleWarehouseChange}
                  >
                    <SelectTrigger className={`text-sm h-10 rounded-xl bg-white ${
                      !form.warehouseId ? "border-red-300 text-slate-400" : "border-emerald-300 text-emerald-700"
                    }`}>
                      <div className="flex items-center gap-2">
                        <Warehouse className="w-3.5 h-3.5 shrink-0" />
                        <SelectValue placeholder="🏭 Sklad tanlang *" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {(warehouseList || []).map((wh: any) => (
                        <SelectItem key={wh.id} value={wh.id}>
                          <div className="flex items-center gap-2">
                            <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                            <span>{wh.name}</span>
                            {wh.location && <span className="text-slate-400 text-xs">({wh.location})</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
 
                {/* Bitta sklad — faqat info badge */}
                {autoWarehouse && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    <Warehouse className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-emerald-700">{autoWarehouse.name}</span>
                    {autoWarehouse.location && (
                      <span className="text-xs text-emerald-500">— {autoWarehouse.location}</span>
                    )}
                  </div>
                )}
 
                {/* Mijoz */}
                <input
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition placeholder:text-slate-300"
                  placeholder="Mijoz ismi (ixtiyoriy)"
                  value={form.customerName}
                  onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                />
 
                {/* Sotuvchi */}
                <Select value={form.staffId} onValueChange={(v) => setForm((p) => ({ ...p, staffId: v }))}>
                  <SelectTrigger className={`text-sm h-10 rounded-xl bg-white ${!form.staffId ? "border-amber-300 text-slate-400" : "border-slate-200"}`}>
                    <SelectValue placeholder="👤 Sotuvchini tanlang *" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.surname} {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
 
                {/* Chegirma */}
                {cart.length > 0 && (
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                    <span className="text-xs text-slate-400 shrink-0">Chegirma:</span>
                    <input
                      type="number" min={0} max={cartSubtotal}
                      className="flex-1 text-sm outline-none text-right font-semibold text-amber-600 bg-transparent"
                      value={form.discount || ""}
                      placeholder="0"
                      onChange={(e) => setForm((p) => ({ ...p, discount: parseFloat(e.target.value) || 0 }))}
                    />
                    <span className="text-xs text-slate-400">so'm</span>
                  </div>
                )}
 
                {/* Totals */}
                {cart.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Mahsulotlar:</span>
                      <span>{fmt(cartSubtotal)} so'm</span>
                    </div>
                    {form.discount > 0 && (
                      <div className="flex justify-between text-xs text-amber-600">
                        <span>Chegirma:</span>
                        <span>− {fmt(form.discount)} so'm</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-slate-900 text-lg pt-1.5 border-t border-slate-100 mt-1">
                      <span>TO'LOV</span>
                      <span>{fmt(cartTotal)} so'm</span>
                    </div>
                  </div>
                )}
 
                {/* Payment method */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "Naqd",            Icon: Banknote,       label: "Naqd"     },
                    { key: "Karta",           Icon: CreditCard,     label: "Karta"    },
                    { key: "Pul o'tkazmasi",  Icon: ArrowLeftRight, label: "O'tkazma" },
                  ].map(({ key, Icon, label }) => (
                    <button
                      key={key}
                      onClick={() => setForm((p) => ({ ...p, paymentMethod: key }))}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold border-2 transition-all ${
                        form.paymentMethod === key
                          ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200"
                          : "bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
 
                {/* Sell button */}
                <button
                  onClick={handleSell}
                  disabled={loading || !cart.length || !form.staffId || !effectiveWarehouseId}
                  className="w-full py-3.5 rounded-xl font-black text-sm tracking-wide bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-all shadow-md shadow-blue-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Saqlanmoqda...</>
                    : <><CheckCircle2 className="w-4 h-4" />SOTISH — {fmt(cartTotal)} so'm</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}
 
        {/* ══ HISTORY VIEW ══ */}
        {view === "history" && (
          <div className="flex-1 overflow-y-auto p-6">
 
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {[
                { label: "Jami sotuvlar",    value: String(stats.count),           Icon: ShoppingBag, color: "bg-blue-600"   },
                { label: "Jami daromad",      value: `${fmt(stats.revenue)} so'm`,  Icon: Banknote,    color: "bg-emerald-600"},
                { label: "Sotilgan mahsulot", value: `${stats.items} ta`,           Icon: TrendingUp,  color: "bg-orange-500" },
                { label: "O'rtacha sotuv",    value: `${fmt(stats.avgOrder)} so'm`, Icon: BarChart3,   color: "bg-violet-600" },
              ].map(({ label, value, Icon, color }) => (
                <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">{label}</div>
                    <div className="text-base font-black text-slate-800 leading-tight">{value}</div>
                  </div>
                </div>
              ))}
            </div>
 
            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 mb-4 flex flex-wrap gap-2 items-center">
              <Filter className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <Input className="pl-9 h-9 text-sm" placeholder="Qidirish..."
                  value={filter.search} onChange={(e) => setF("search", e.target.value)} />
              </div>
              {/* Sklad filter — tarixda */}
              {(warehouseList?.length || 0) > 1 && (
                <Select value={filter.warehouseId} onValueChange={(v) => setF("warehouseId", v)}>
                  <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="Sklad" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha sklad</SelectItem>
                    {(warehouseList || []).map((wh: any) => (
                      <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={filter.status}  onValueChange={(v) => setF("status",  v)}>
                <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="Holat" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha holat</SelectItem>
                  <SelectItem value="completed">Yakunlandi</SelectItem>
                  <SelectItem value="refunded">Qaytarildi</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filter.payment} onValueChange={(v) => setF("payment", v)}>
                <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="To'lov" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha to'lov</SelectItem>
                  <SelectItem value="Naqd">Naqd</SelectItem>
                  <SelectItem value="Karta">Karta</SelectItem>
                  <SelectItem value="Pul o'tkazmasi">O'tkazma</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filter.staffId} onValueChange={(v) => setF("staffId", v)}>
                <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="Sotuvchi" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha xodim</SelectItem>
                  {staffList?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.surname} {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <Input type="date" className="h-9 w-36 text-sm" value={filter.dateFrom} onChange={(e) => setF("dateFrom", e.target.value)} />
                <span className="text-slate-200">–</span>
                <Input type="date" className="h-9 w-36 text-sm" value={filter.dateTo}   onChange={(e) => setF("dateTo",   e.target.value)} />
              </div>
              {hasFilters && (
                <button onClick={() => { setFilter(defaultFilter); setCurrentPage(1); }}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1.5 rounded-lg hover:bg-red-50 transition">
                  <X className="w-3.5 h-3.5" /> Tozalash
                </button>
              )}
              <button onClick={exportCSV} disabled={!filteredSales.length}
                className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition disabled:opacity-40">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
 
            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Sana / Vaqt</th>
                      <th className="px-4 py-3">Sklad</th>
                      <th className="px-4 py-3">Mijoz</th>
                      <th className="px-4 py-3">Mahsulotlar</th>
                      <th className="px-4 py-3 text-center">Soni</th>
                      <th className="px-4 py-3">Sotuvchi</th>
                      <th className="px-4 py-3">To'lov</th>
                      <th className="px-4 py-3">Holat</th>
                      <th className="px-4 py-3 text-right">Summa</th>
                      <th className="px-4 py-3 text-center w-20">—</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesLoading
                      ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                      : pagedSales.length === 0
                        ? (
                          <tr><td colSpan={10} className="py-20 text-center text-slate-400">
                            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-semibold">{hasFilters ? "Natija topilmadi" : "Hali sotuvlar yo'q"}</p>
                            {hasFilters && <button onClick={() => { setFilter(defaultFilter); setCurrentPage(1); }} className="mt-1 text-blue-500 text-xs hover:underline">Filtrni tozalash</button>}
                          </td></tr>
                        )
                        : pagedSales.map((s: any) => {
                          const items: SaleItem[] = s.items || [];
                          return (
                            <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-xs font-semibold text-slate-700">{fmtDate(s.createdAt)}</div>
                                <div className="text-[11px] text-slate-400">{fmtTime(s.createdAt)}</div>
                              </td>
                              {/* Sklad ustuni */}
                              <td className="px-4 py-3">
                                {s.warehouseName
                                  ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                      <Warehouse className="w-3 h-3" />{s.warehouseName}
                                    </span>
                                  : <span className="text-slate-300 italic text-xs">—</span>
                                }
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs text-slate-600 truncate max-w-[90px] block">{s.customerName || <span className="text-slate-300 italic">—</span>}</span>
                              </td>
                              <td className="px-4 py-3 max-w-[180px]">
                                {items.slice(0, 2).map((it, i) => (
                                  <div key={i} className="text-xs font-semibold text-slate-800 truncate">{it.productName}</div>
                                ))}
                                {items.length > 2 && <div className="text-[11px] text-blue-400 font-medium">+{items.length - 2} ta</div>}
                                {!items.length && s.productName && <div className="text-xs font-semibold text-slate-800 truncate">{s.productName}</div>}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[11px] font-bold">
                                  {s.totalItems || s.quantity || 1}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500">{s.staffName || "—"}</td>
                              <td className="px-4 py-3"><PayBadge method={s.paymentMethod} /></td>
                              <td className="px-4 py-3"><StatusBadge status={s.status || "completed"} /></td>
                              <td className="px-4 py-3 text-right">
                                <div className="font-black text-emerald-600 text-sm whitespace-nowrap">{fmt(s.amount||0)} so'm</div>
                                {s.discount > 0 && <div className="text-[11px] text-amber-500">−{fmt(s.discount)}</div>}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => setReceiptSale(s)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition">
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  {s.status !== "refunded" && (
                                    <DeleteConfirm onConfirm={() => handleDeleteSale(s.id)}>
                                      <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </DeleteConfirm>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
 
              {/* Pagination */}
              {!salesLoading && filteredSales.length > PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-50 bg-slate-50/50">
                  <span className="text-xs text-slate-400">
                    {(currentPage-1)*PAGE_SIZE+1}–{Math.min(currentPage*PAGE_SIZE, filteredSales.length)} / {filteredSales.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage===1} onClick={() => setCurrentPage((p) => p-1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i+1)
                      .filter((p) => p===1 || p===totalPages || Math.abs(p-currentPage)<=1)
                      .reduce((acc: (number|string)[], p, i, arr) => {
                        if (i>0 && (p as number)-(arr[i-1] as number)>1) acc.push("…");
                        acc.push(p); return acc;
                      }, [])
                      .map((p, i) => p==="…"
                        ? <span key={`d${i}`} className="px-1 text-slate-200 text-xs">…</span>
                        : <Button key={p} variant={currentPage===p?"default":"outline"} size="sm"
                            className={`h-8 w-8 p-0 text-xs ${currentPage===p ? "bg-blue-600 border-blue-600" : ""}`}
                            onClick={() => setCurrentPage(p as number)}>{p}</Button>
                      )
                    }
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage===totalPages} onClick={() => setCurrentPage((p) => p+1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
 
      {receiptSale && <ReceiptDialog sale={receiptSale} onClose={() => setReceiptSale(null)} />}
    </div>
  );
}
