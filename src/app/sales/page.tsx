"use client";
 
import { useState, useMemo, useCallback, useRef } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag, Plus, Loader2, Trash2, Calendar,
  User, Package, Search, Download, Filter, X,
  ChevronLeft, ChevronRight, TrendingUp, Banknote,
  ShoppingCart, AlertCircle, CheckCircle2, Clock,
  BarChart3, RefreshCw, Eye, Printer, Receipt,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import {
  collection, doc, serverTimestamp, runTransaction,
  increment,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
 
// ─── Types ─────────────────────────────────────────────────────────────────
interface SaleItem {
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}
 
interface FormData {
  customerName: string;
  staffId: string;
  paymentMethod: string;
  discount: number;
  note: string;
}
 
interface FilterState {
  payment: string;
  staffId: string;
  dateFrom: string;
  dateTo: string;
  search: string;
  status: string;
}
 
const defaultForm: FormData = {
  customerName: "",
  staffId: "",
  paymentMethod: "Naqd",
  discount: 0,
  note: "",
};
 
const defaultFilter: FilterState = {
  payment: "all",
  staffId: "all",
  dateFrom: "",
  dateTo: "",
  search: "",
  status: "all",
};
 
const PAGE_SIZE = 12;
 
// ─── Utils ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("uz-UZ");
const fmtDate = (ts: any) =>
  ts?.toDate?.()?.toLocaleDateString("uz-UZ", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }) || "—";
const fmtTime = (ts: any) =>
  ts?.toDate?.()?.toLocaleTimeString("uz-UZ", {
    hour: "2-digit", minute: "2-digit",
  }) || "";
 
// ─── Sub-components ──────────────────────────────────────────────────────────
 
function SkeletonRow({ cols = 9 }: { cols?: number }) {
  return (
    <tr className="border-t border-slate-100 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 bg-slate-100 rounded-full w-full" />
        </td>
      ))}
    </tr>
  );
}
 
function StatCard({
  label, value, sub, icon: Icon, gradient, trend,
}: {
  label: string; value: string; sub?: string;
  icon: any; gradient: string; trend?: { val: number; label: string };
}) {
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-5 group hover:shadow-md transition-all duration-200">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${gradient} opacity-[0.03]`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        {trend && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 px-2 py-1 rounded-full ${
            trend.val >= 0
              ? "text-emerald-600 bg-emerald-50"
              : "text-red-500 bg-red-50"
          }`}>
            {trend.val >= 0
              ? <ArrowUpRight className="w-3 h-3" />
              : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend.val)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-black text-slate-800 mb-0.5 tracking-tight">{value}</div>
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}
 
function PaymentBadge({ method }: { method: string }) {
  const map: Record<string, string> = {
    Naqd: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Karta: "bg-blue-50 text-blue-700 border-blue-200",
    "Pul o'tkazmasi": "bg-violet-50 text-violet-700 border-violet-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${map[method] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {method}
    </span>
  );
}
 
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; icon: any }> = {
    completed: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Yakunlandi", icon: CheckCircle2 },
    refunded:  { cls: "bg-amber-50 text-amber-700 border-amber-200",    label: "Qaytarildi",  icon: RefreshCw },
    pending:   { cls: "bg-slate-50 text-slate-600 border-slate-200",    label: "Kutilmoqda",  icon: Clock },
  };
  const { cls, label, icon: Icon } = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}
 
function DeleteConfirmDialog({ onConfirm, disabled, children }: {
  onConfirm: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" /> Sotuvni o'chirish
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 py-2 leading-relaxed">
          Bu sotuvni o'chirsangiz, <strong>inventar miqdori avtomatik qaytariladi</strong> va
          tranzaksiya tarixi yangilanadi. Bu amalni ortga qaytarib bo'lmaydi.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
          <Button variant="destructive" onClick={() => { setOpen(false); onConfirm(); }}>
            Ha, o'chirish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
 
// ─── Cart Item Row ──────────────────────────────────────────────────────────
function CartItemRow({
  item, onQtyChange, onPriceChange, onRemove, maxQty,
}: {
  item: SaleItem;
  onQtyChange: (id: string, qty: number) => void;
  onPriceChange: (id: string, price: number) => void;
  onRemove: (id: string) => void;
  maxQty: number;
}) {
  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-800 text-sm truncate">{item.productName}</div>
        <div className="text-xs text-slate-500">SKU: {item.productSku}</div>
      </div>
      <Input
        type="number" min={1} max={maxQty}
        value={item.quantity}
        onChange={(e) => onQtyChange(item.productId, Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1)))}
        className="w-16 h-8 text-center text-sm"
      />
      <span className="text-slate-400 text-xs">×</span>
      <Input
        type="number" min={0}
        value={item.unitPrice}
        onChange={(e) => onPriceChange(item.productId, parseFloat(e.target.value) || 0)}
        className="w-28 h-8 text-sm text-right"
      />
      <div className="w-24 text-right font-bold text-emerald-600 text-sm">
        {fmt(item.subtotal)}
      </div>
      <Button variant="ghost" size="sm" onClick={() => onRemove(item.productId)} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 shrink-0">
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
 
// ─── Receipt Dialog ─────────────────────────────────────────────────────────
function ReceiptDialog({ sale, onClose }: { sale: any; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Chek</title><style>
      body { font-family: monospace; font-size: 12px; padding: 20px; }
      h2 { text-align: center; } .line { border-top: 1px dashed #000; margin: 8px 0; }
      .row { display: flex; justify-content: space-between; }
      .total { font-weight: bold; font-size: 14px; }
    </style></head><body>${printRef.current.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };
  if (!sale) return null;
  const items = sale.items || [{ productName: sale.productName, productSku: sale.productSku, quantity: sale.quantity || 1, unitPrice: sale.unitPrice || 0, subtotal: sale.amount || 0 }];
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Chek #{sale.id?.slice(-6).toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        <div ref={printRef} className="font-mono text-xs space-y-1 py-2">
          <h2 className="text-center font-bold text-base mb-2">DO'KON CHEKI</h2>
          <div className="border-t border-dashed border-slate-300 my-2" />
          <div className="flex justify-between"><span>Sana:</span><span>{fmtDate(sale.createdAt)} {fmtTime(sale.createdAt)}</span></div>
          <div className="flex justify-between"><span>Mijoz:</span><span>{sale.customerName || "Noma'lum"}</span></div>
          <div className="flex justify-between"><span>Sotuvchi:</span><span>{sale.staffName}</span></div>
          <div className="border-t border-dashed border-slate-300 my-2" />
          {items.map((item: any, i: number) => (
            <div key={i}>
              <div className="font-semibold">{item.productName}</div>
              <div className="flex justify-between text-slate-500">
                <span>{item.quantity} × {fmt(item.unitPrice)}</span>
                <span>{fmt(item.subtotal)}</span>
              </div>
            </div>
          ))}
          <div className="border-t border-dashed border-slate-300 my-2" />
          {sale.discount > 0 && <div className="flex justify-between text-amber-600"><span>Chegirma:</span><span>-{fmt(sale.discount)}</span></div>}
          <div className="flex justify-between font-bold text-base"><span>JAMI:</span><span>{fmt(sale.amount)} so'm</span></div>
          <div className="flex justify-between"><span>To'lov:</span><span>{sale.paymentMethod}</span></div>
          <div className="border-t border-dashed border-slate-300 my-2" />
          <p className="text-center text-slate-400">Rahmat! Yana keling!</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Yopish</Button>
          <Button onClick={handlePrint} className="gap-2"><Printer className="w-4 h-4" />Chop etish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
 
// ─── Main Page ───────────────────────────────────────────────────────────────
export default function SalesPage() {
  const { toast } = useToast();
  const db = useFirestore();
 
  // Modal states
  const [loading, setLoading]           = useState(false);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [formData, setFormData]         = useState<FormData>(defaultForm);
  const [cartItems, setCartItems]       = useState<SaleItem[]>([]);
  const [receiptSale, setReceiptSale]   = useState<any>(null);
 
  // Filters
  const [filter, setFilter]       = useState<FilterState>(defaultFilter);
  const [currentPage, setCurrentPage] = useState(1);
 
  // Firestore queries
  const salesQuery     = useMemoFirebase(() => db ? collection(db, "sales")     : null, [db]);
  const staffQuery     = useMemoFirebase(() => db ? collection(db, "staff")     : null, [db]);
  const inventoryQuery = useMemoFirebase(() => db ? collection(db, "inventory") : null, [db]);
 
  const { data: salesList,     isLoading: salesLoading }     = useCollection(salesQuery);
  const { data: staffList }                                   = useCollection(staffQuery);
  const { data: inventoryList }                               = useCollection(inventoryQuery);
 
  // ── Product search in modal ───────────────────────────────────────────────
  const filteredProducts = useMemo(
    () =>
      (inventoryList || []).filter(
        (item: any) =>
          item.quantity > 0 &&
          (item.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
           item.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
           item.barcode?.includes(productSearch))
      ),
    [inventoryList, productSearch]
  );
 
  // ── Cart management ───────────────────────────────────────────────────────
  //
  // getAvailableStock: real inventar miqdori MINUS savatda band qilingan
  // → bir xil mahsulot bir necha marta qo'shilganda ham to'g'ri hisoblaydi
  const getAvailableStock = useCallback(
    (productId: string, currentCart: SaleItem[]): number => {
      const realStock = (inventoryList || []).find((p: any) => p.id === productId)?.quantity ?? 0;
      const inCart    = currentCart.find((i) => i.productId === productId)?.quantity ?? 0;
      return realStock - inCart; // shu mahsulotdan yana qancha qo'shsa bo'ladi
    },
    [inventoryList]
  );
 
  const addToCart = useCallback((product: any) => {
    setCartItems((prev) => {
      const available = getAvailableStock(product.id, prev);
 
      if (available <= 0) {
        toast({
          title: "Ombor yetarli emas",
          description: `"${product.name}" omborda qolmagan yoki savatda to'liq band.`,
          variant: "destructive",
        });
        return prev; // o'zgartirmasdan qaytaramiz
      }
 
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        // Mavjud elementga +1
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitPrice }
            : i
        );
      }
 
      // Yangi element
      const unitPrice = product.salePrice ?? product.price ?? 0;
      return [...prev, {
        productId:   product.id,
        productName: product.name,
        productSku:  product.sku || "",
        unitPrice,
        quantity:    1,
        subtotal:    unitPrice,
      }];
    });
    setProductSearch("");
  }, [toast, getAvailableStock]);
 
  const updateCartQty = useCallback((productId: string, qty: number) => {
    setCartItems((prev) => {
      // Yangi qty real stock'dan oshib ketmasligi kerak
      const realStock = (inventoryList || []).find((p: any) => p.id === productId)?.quantity ?? 0;
      const safeQty   = Math.max(1, Math.min(qty, realStock));
      return prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: safeQty, subtotal: safeQty * i.unitPrice }
          : i
      );
    });
  }, [inventoryList]);
 
  const updateCartPrice = useCallback((productId: string, price: number) => {
    const safePrice = Math.max(0, price);
    setCartItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, unitPrice: safePrice, subtotal: i.quantity * safePrice }
          : i
      )
    );
  }, []);
 
  const removeFromCart = useCallback((productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);
 
  // CartItemRow uchun max qiymat: inventardagi real stock
  const getProductStock = useCallback(
    (productId: string) =>
      (inventoryList || []).find((p: any) => p.id === productId)?.quantity ?? 0,
    [inventoryList]
  );
 
  const cartSubtotal = useMemo(() => cartItems.reduce((s, i) => s + i.subtotal, 0), [cartItems]);
  const cartTotal    = useMemo(() => Math.max(0, cartSubtotal - (formData.discount || 0)), [cartSubtotal, formData.discount]);
 
  // ── Table filters ─────────────────────────────────────────────────────────
  const filteredSales = useMemo(() => {
    if (!salesList) return [];
    return salesList.filter((s: any) => {
      if (filter.payment !== "all" && s.paymentMethod !== filter.payment) return false;
      if (filter.staffId !== "all" && s.staffId !== filter.staffId)       return false;
      if (filter.status  !== "all" && s.status  !== filter.status)        return false;
      if (filter.dateFrom) {
        const d = s.createdAt?.toDate?.();
        if (d && d < new Date(filter.dateFrom)) return false;
      }
      if (filter.dateTo) {
        const d = s.createdAt?.toDate?.();
        const to = new Date(filter.dateTo); to.setHours(23, 59, 59);
        if (d && d > to) return false;
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const items: SaleItem[] = s.items || [];
        const itemMatch = items.some(
          (i) =>
            i.productName?.toLowerCase().includes(q) ||
            i.productSku?.toLowerCase().includes(q)
        );
        return (
          itemMatch ||
          s.customerName?.toLowerCase().includes(q) ||
          s.staffName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [salesList, filter]);
 
  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const revenue  = filteredSales.reduce((s: number, x: any) => s + (x.amount || 0), 0);
    const items    = filteredSales.reduce((s: number, x: any) => s + (x.totalItems || x.quantity || 1), 0);
    const avgOrder = filteredSales.length ? Math.round(revenue / filteredSales.length) : 0;
    return { count: filteredSales.length, revenue, items, avgOrder };
  }, [filteredSales]);
 
  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const pagedSales = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSales.slice(start, start + PAGE_SIZE);
  }, [filteredSales, currentPage]);
 
  const hasActiveFilters = Object.entries(filter).some(([k, v]) =>
    k === "payment" || k === "staffId" || k === "status"
      ? v !== "all"
      : v !== ""
  );
 
  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };
 
  const clearFilters = () => { setFilter(defaultFilter); setCurrentPage(1); };
 
  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!filteredSales.length) return;
    const headers = ["Sana", "Vaqt", "Mijoz", "Mahsulotlar", "Jami mahsulot", "Chegirma", "Jami", "Sotuvchi", "To'lov", "Holat"];
    const rows = filteredSales.map((s: any) => {
      const items: SaleItem[] = s.items || [];
      const names = items.map((i) => `${i.productName}(${i.quantity})`).join("; ");
      return [
        fmtDate(s.createdAt),
        fmtTime(s.createdAt),
        s.customerName || "",
        names || s.productName || "",
        s.totalItems || s.quantity || 1,
        s.discount || 0,
        s.amount || 0,
        s.staffName || "",
        s.paymentMethod || "",
        s.status || "completed",
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `sotuvlar_${new Date().toLocaleDateString("uz-UZ")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
 
  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData(defaultForm);
    setCartItems([]);
    setProductSearch("");
  };
 
  const handleModalChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) resetForm();
  };
 
  // ── Add Sale — atomic Firestore transaction ───────────────────────────────
  //
  // Algoritm:
  //   PHASE 1 – reads  (barcha get() lar birinchi, writes yo'q)
  //   PHASE 2 – validate (stock tekshiruv, throw → rollback)
  //   PHASE 3 – writes  (sale, inventory updates, tx logs, daily_revenue)
  //
  // Nima uchun bu to'g'ri:
  //   • Firestore transaction GET operatsiyalari ketma-ket bo'lishi shart,
  //     Promise.all ishlatish transaction kontekstini buzishi mumkin →
  //     biz for...of loop bilan ketma-ket o'qiymiz.
  //   • Barcha reads → validate → writes tartibi ACID kafolatini beradi.
  //   • Agar biror mahsulot omborda yetishmasa, HECH NARSA yozilmaydi.
  // ─────────────────────────────────────────────────────────────────────────
  const handleAddSale = async () => {
    if (!db) return;
 
    // ─ pre-flight validations (transaction tashqarisida) ─
    if (!cartItems.length) {
      toast({ title: "Xatolik", description: "Kamida 1 ta mahsulot tanlang", variant: "destructive" });
      return;
    }
    if (!formData.staffId) {
      toast({ title: "Xatolik", description: "Sotuvchini tanlang", variant: "destructive" });
      return;
    }
    // Discount mantiqan to'g'ri bo'lsin
    if ((formData.discount || 0) > cartSubtotal) {
      toast({ title: "Xatolik", description: "Chegirma jami summadan katta bo'lishi mumkin emas", variant: "destructive" });
      return;
    }
 
    setLoading(true);
    try {
      const staff     = staffList?.find((s: any) => s.id === formData.staffId);
      const staffName = `${staff?.surname || ""} ${staff?.name || ""}`.trim();
      const today     = new Date().toISOString().split("T")[0];
 
      // Oldindan ref'larni tayyorlab qo'yamiz (transaction ichida new doc ref yaratish OK)
      const saleRef      = doc(collection(db, "sales"));
      const revenueRef   = doc(db, "daily_revenue", today);
      const productRefs  = cartItems.map((item) => doc(db, "inventory", item.productId));
      const txRefs       = cartItems.map(() => doc(collection(db, "inventory_transactions")));
 
      await runTransaction(db, async (tx) => {
 
        // ── PHASE 1: reads — ketma-ket, Promise.all EMAS ──────────────────
        const snaps: ReturnType<typeof tx.get> extends Promise<infer T> ? T[] : never[] = [];
        for (const ref of productRefs) {
          // eslint-disable-next-line no-await-in-loop
          snaps.push(await tx.get(ref) as any);
        }
 
        // ── PHASE 2: validate ──────────────────────────────────────────────
        for (let i = 0; i < snaps.length; i++) {
          const snap    = snaps[i] as any;
          const reqItem = cartItems[i];
 
          if (!snap.exists()) {
            throw new Error(`❌ Mahsulot topilmadi: "${reqItem.productName}". U inventardan o'chirilgan bo'lishi mumkin.`);
          }
 
          const currentQty: number = snap.data().quantity ?? 0;
 
          if (currentQty <= 0) {
            throw new Error(`⚠️ "${reqItem.productName}" omborda tugagan (mavjud: 0 ta).`);
          }
          if (currentQty < reqItem.quantity) {
            throw new Error(
              `⚠️ "${reqItem.productName}" yetarli emas. ` +
              `So'ralgan: ${reqItem.quantity} ta, mavjud: ${currentQty} ta.`
            );
          }
        }
 
        // ── PHASE 3: writes ────────────────────────────────────────────────
 
        // 3a. Sale document
        tx.set(saleRef, {
          customerName:  formData.customerName.trim(),
          staffId:       formData.staffId,
          staffName,
          paymentMethod: formData.paymentMethod,
          discount:      formData.discount || 0,
          note:          formData.note.trim(),
          items:         cartItems,
          totalItems:    cartItems.reduce((s, i) => s + i.quantity, 0),
          subtotal:      cartSubtotal,
          amount:        cartTotal,
          status:        "completed",
          createdAt:     serverTimestamp(),
        });
 
        // 3b. Per-product: decrement inventory + write tx log
        for (let i = 0; i < cartItems.length; i++) {
          const item = cartItems[i];
 
          // Inventory: faqat zarur fieldlar, manfiy bo'lib ketmasligi uchun
          // server-side increment ishlatamiz (atomic)
          tx.update(productRefs[i], {
            quantity:  increment(-item.quantity),  // atomic decrement
            totalSold: increment(item.quantity),   // jami sotilgan statistikasi
            lastSold:  serverTimestamp(),
          });
 
          // Inventory transaction log
          tx.set(txRefs[i], {
            productId:    item.productId,
            productName:  item.productName,
            productSku:   item.productSku,
            type:         "sale",
            quantityDelta: -item.quantity,         // manfiy = yechildi
            quantityBefore: (snaps[i] as any).data().quantity,
            quantityAfter:  (snaps[i] as any).data().quantity - item.quantity,
            unitPrice:    item.unitPrice,
            subtotal:     item.subtotal,
            staffId:      formData.staffId,
            staffName,
            saleId:       saleRef.id,
            paymentMethod: formData.paymentMethod,
            createdAt:    serverTimestamp(),
          });
        }
 
        // 3c. Daily revenue aggregate (merge: true → doc bo'lmasa yaratadi)
        tx.set(revenueRef, {
          date:       today,
          revenue:    increment(cartTotal),
          salesCount: increment(1),
          itemsSold:  increment(cartItems.reduce((s, i) => s + i.quantity, 0)),
        }, { merge: true });
      });
 
      toast({
        title: "✅ Sotuv muvaffaqiyatli!",
        description: `${cartItems.length} xil, jami ${fmt(cartTotal)} so'm. Ombor yangilandi.`,
      });
      setIsModalOpen(false);
      resetForm();
 
    } catch (error: any) {
      // Foydalanuvchiga aniq xabar
      toast({
        title: "Sotuv amalga oshmadi",
        description: error?.message || "Noma'lum xatolik. Qaytadan urinib ko'ring.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
 
  // ── Delete Sale — runTransaction (writeBatch EMAS) ────────────────────────
  //
  // Nima uchun runTransaction:
  //   • writeBatch hech qanday read qilmaydi → inventory manfiy bo'lishi mumkin
  //   • runTransaction bilan avval sale doc o'qiymiz (exists tekshiruvi),
  //     so'ng xavfsiz qaytaramiz.
  //   • "already refunded" holatini oldini olamiz (status: "refunded" tekshiruv).
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteSale = async (saleId: string) => {
    if (!db) return;
 
    // Local cache'dan oldindan ma'lumot olamiz (items ro'yxati kerak)
    const localSale = salesList?.find((s: any) => s.id === saleId);
    if (!localSale) return;
 
    // Qaytariladigan mahsulotlar ro'yxati (multi-item yoki legacy single-item)
    const returnItems: SaleItem[] = localSale.items?.length
      ? localSale.items
      : localSale.productId
        ? [{
            productId:   localSale.productId,
            productName: localSale.productName || "",
            productSku:  localSale.productSku  || "",
            unitPrice:   localSale.unitPrice   || 0,
            quantity:    localSale.quantity    || 1,
            subtotal:    localSale.amount      || 0,
          }]
        : [];
 
    if (!returnItems.length) {
      toast({ title: "Xatolik", description: "Sotuv ma'lumotlari topilmadi", variant: "destructive" });
      return;
    }
 
    try {
      const saleDocRef   = doc(db, "sales", saleId);
      const productRefs  = returnItems.map((i) => doc(db, "inventory", i.productId));
      const refundTxRefs = returnItems.map(() => doc(collection(db, "inventory_transactions")));
      const saleDate     = localSale.createdAt?.toDate?.()?.toISOString().split("T")[0]
                          || new Date().toISOString().split("T")[0];
      const revenueRef   = doc(db, "daily_revenue", saleDate);
 
      await runTransaction(db, async (tx) => {
 
        // ── PHASE 1: reads ─────────────────────────────────────────────────
        const saleSnap = await tx.get(saleDocRef);
 
        if (!saleSnap.exists()) {
          throw new Error("Bu sotuv allaqachon o'chirilgan.");
        }
        if (saleSnap.data()?.status === "refunded") {
          throw new Error("Bu sotuv allaqachon qaytarilgan (refunded).");
        }
 
        // Inventory snapshot'larini ketma-ket o'qiymiz
        const invSnaps: any[] = [];
        for (const ref of productRefs) {
          invSnaps.push(await tx.get(ref));
        }
 
        // ── PHASE 2: validate ──────────────────────────────────────────────
        // (Delete uchun kritik tekshiruv yo'q, lekin product mavjudligini tekshiramiz)
        for (let i = 0; i < invSnaps.length; i++) {
          if (!invSnaps[i].exists()) {
            // Mahsulot o'chirilgan — omborsiz davom etamiz (faqat sale o'chiriladi)
            console.warn(`Inventory doc topilmadi: ${returnItems[i].productId}`);
          }
        }
 
        // ── PHASE 3: writes ────────────────────────────────────────────────
 
        // 3a. Sale statusini "refunded" ga o'zgartir (o'chirish o'rniga soft delete)
        tx.update(saleDocRef, {
          status:     "refunded",
          refundedAt: serverTimestamp(),
        });
 
        // 3b. Har bir mahsulotni omborga qaytaramiz
        for (let i = 0; i < returnItems.length; i++) {
          const item    = returnItems[i];
          const invSnap = invSnaps[i];
 
          if (!invSnap.exists()) continue; // mahsulot o'chirilgan, skip
 
          const currentQty: number = invSnap.data().quantity ?? 0;
 
          tx.update(productRefs[i], {
            quantity:  increment(item.quantity),               // atomic qaytarish
            totalSold: increment(-item.quantity),              // statistika tuzatish
            // lastSold o'zgartirilmaydi — haqiqiy sotuv vaqti saqlanib qolsin
          });
 
          // Refund transaction log
          tx.set(refundTxRefs[i], {
            productId:     item.productId,
            productName:   item.productName,
            productSku:    item.productSku,
            type:          "sale_refund",
            quantityDelta:  item.quantity,              // musbat = qaytarildi
            quantityBefore: currentQty,
            quantityAfter:  currentQty + item.quantity,
            unitPrice:     item.unitPrice,
            subtotal:      item.subtotal,
            staffId:       localSale.staffId,
            staffName:     localSale.staffName,
            originalSaleId: saleId,
            createdAt:     serverTimestamp(),
          });
        }
 
        // 3c. Daily revenue tuzatish
        tx.set(revenueRef, {
          revenue:    increment(-(localSale.amount || 0)),
          salesCount: increment(-1),
          itemsSold:  increment(-(localSale.totalItems || localSale.quantity || 1)),
        }, { merge: true });
      });
 
      toast({
        title: "Qaytarildi",
        description: `${returnItems.length} xil mahsulot omborga qaytarildi.`,
      });
 
    } catch (error: any) {
      toast({
        title: "O'chirishda xatolik",
        description: error?.message || "Noma'lum xatolik",
        variant: "destructive",
      });
    }
  };
 
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-[#f4f6f8]">
        <OmniSidebar />
 
        <main className="flex-1 p-5 md:p-8 overflow-auto">
 
          {/* ── Header ── */}
          <div className="flex flex-wrap justify-between items-center mb-7 gap-4">
            <div>
              <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight text-slate-900">
                <ShoppingBag className="text-blue-600 w-6 h-6" />
                SOTUVLAR
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">Sotuv boshqaruvi va tahlili</p>
            </div>
 
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={handleExportCSV} disabled={!filteredSales.length} className="gap-2 h-9">
                    <Download className="w-4 h-4" /> CSV
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Filtrlangan sotuvlarni CSV formatida yuklab olish</TooltipContent>
              </Tooltip>
 
              <Dialog open={isModalOpen} onOpenChange={handleModalChange}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 gap-2 h-9 font-semibold shadow-sm">
                    <Plus className="w-4 h-4" /> YANGI SOTUV
                  </Button>
                </DialogTrigger>
 
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-blue-700">
                      <ShoppingBag className="w-5 h-5" /> Yangi sotuv — savat
                    </DialogTitle>
                  </DialogHeader>
 
                  <div className="space-y-5 py-2">
                    {/* Mijoz va sotuvchi */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Mijoz ismi</label>
                        <Input
                          placeholder="Mijoz ismini kiriting"
                          value={formData.customerName}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">
                          <User className="inline w-3 h-3 mr-1" />Sotuvchi *
                        </label>
                        <Select value={formData.staffId} onValueChange={(v) => setFormData({ ...formData, staffId: v })}>
                          <SelectTrigger className={!formData.staffId ? "border-red-200" : ""}>
                            <SelectValue placeholder="Tanlang..." />
                          </SelectTrigger>
                          <SelectContent>
                            {staffList?.map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.surname} {s.name}
                                {s.position && <span className="text-slate-400 ml-1">· {s.position}</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
 
                    {/* Mahsulot qidirish */}
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">
                        <Package className="inline w-3 h-3 mr-1" />Mahsulot qo'shish
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Nom, SKU yoki shtrix-kod bo'yicha qidiring..."
                          className="pl-9"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
 
                      {productSearch && filteredProducts.length > 0 && (
                        <div className="mt-1.5 border rounded-xl max-h-48 overflow-y-auto bg-white shadow-lg z-50 relative divide-y divide-slate-50">
                          {filteredProducts.map((product: any) => {
                            const inCart = cartItems.find((i) => i.productId === product.id);
                            return (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => addToCart(product)}
                                className="w-full text-left p-3 hover:bg-blue-50 flex justify-between items-center transition-colors"
                              >
                                <div>
                                  <div className="font-semibold text-slate-800 text-sm">{product.name}</div>
                                  <div className="text-xs text-slate-400 mt-0.5">
                                    SKU: {product.sku} &nbsp;|&nbsp; Omborda: <span className={`font-semibold ${product.quantity < 5 ? "text-red-500" : "text-emerald-600"}`}>{product.quantity} ta</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {inCart && (
                                    <Badge variant="secondary" className="text-xs">Savatda: {inCart.quantity}</Badge>
                                  )}
                                  <span className="text-emerald-600 font-bold text-sm">
                                    {fmt(product.salePrice || product.price || 0)} so'm
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {productSearch && filteredProducts.length === 0 && (
                        <div className="mt-1.5 p-3 text-sm text-slate-400 bg-slate-50 rounded-xl text-center">
                          Mahsulot topilmadi
                        </div>
                      )}
                    </div>
 
                    {/* Savat */}
                    {cartItems.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Savat ({cartItems.length} xil mahsulot)
                          </label>
                          <div className="text-xs text-slate-400">Miqdor · Narx · Jami</div>
                        </div>
                        <div className="space-y-2">
                          {cartItems.map((item) => (
                            <CartItemRow
                              key={item.productId}
                              item={item}
                              onQtyChange={updateCartQty}
                              onPriceChange={updateCartPrice}
                              onRemove={removeFromCart}
                              maxQty={getProductStock(item.productId)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
 
                    {/* Chegirma + To'lov + Izoh */}
                    {cartItems.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Chegirma (so'm)</label>
                          <Input
                            type="number" min={0} max={cartSubtotal}
                            value={formData.discount}
                            onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">To'lov usuli</label>
                          <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Naqd">💵 Naqd pul</SelectItem>
                              <SelectItem value="Karta">💳 Karta</SelectItem>
                              <SelectItem value="Pul o'tkazmasi">🏦 O'tkazma</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Izoh</label>
                          <Input
                            placeholder="Ixtiyoriy..."
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
 
                    {/* Jami */}
                    {cartItems.length > 0 && (
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white">
                        <div className="flex justify-between items-center text-sm opacity-80 mb-1">
                          <span>Mahsulotlar jami:</span>
                          <span>{fmt(cartSubtotal)} so'm</span>
                        </div>
                        {formData.discount > 0 && (
                          <div className="flex justify-between items-center text-sm opacity-80 mb-1">
                            <span>Chegirma:</span>
                            <span>- {fmt(formData.discount)} so'm</span>
                          </div>
                        )}
                        <div className="border-t border-white/20 mt-2 pt-2 flex justify-between items-center">
                          <span className="font-bold text-lg">TO'LOV JAMI:</span>
                          <span className="font-black text-2xl">{fmt(cartTotal)} so'm</span>
                        </div>
                      </div>
                    )}
                  </div>
 
                  <DialogFooter className="gap-2">
                    <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Bekor qilish</Button>
                    <Button
                      type="button"
                      onClick={handleAddSale}
                      disabled={loading || !cartItems.length || !formData.staffId}
                      className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
                    >
                      {loading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saqlanmoqda...</>
                      ) : (
                        <><ShoppingBag className="mr-2 h-4 w-4" />Sotish ({fmt(cartTotal)} so'm)</>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
 
          {/* ── Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Jami sotuvlar"
              value={String(stats.count)}
              icon={ShoppingCart}
              gradient="from-blue-500 to-blue-600"
              sub={hasActiveFilters ? "Filtr bo'yicha" : "Barcha vaqt"}
            />
            <StatCard
              label="Jami daromad"
              value={`${fmt(stats.revenue)} so'm`}
              icon={Banknote}
              gradient="from-emerald-500 to-emerald-600"
            />
            <StatCard
              label="Sotilgan mahsulot"
              value={`${stats.items} ta`}
              icon={TrendingUp}
              gradient="from-orange-500 to-orange-600"
            />
            <StatCard
              label="O'rtacha sotuv"
              value={`${fmt(stats.avgOrder)} so'm`}
              icon={BarChart3}
              gradient="from-violet-500 to-violet-600"
            />
          </div>
 
          {/* ── Filters ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> FILTR
              </span>
 
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Mahsulot, mijoz, sotuvchi..."
                  className="pl-9 h-9 text-sm"
                  value={filter.search}
                  onChange={(e) => updateFilter("search", e.target.value)}
                />
              </div>
 
              <Select value={filter.status} onValueChange={(v) => updateFilter("status", v)}>
                <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="Holat" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha holat</SelectItem>
                  <SelectItem value="completed">Yakunlandi</SelectItem>
                  <SelectItem value="refunded">Qaytarildi</SelectItem>
                  <SelectItem value="pending">Kutilmoqda</SelectItem>
                </SelectContent>
              </Select>
 
              <Select value={filter.payment} onValueChange={(v) => updateFilter("payment", v)}>
                <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="To'lov" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha to'lov</SelectItem>
                  <SelectItem value="Naqd">Naqd</SelectItem>
                  <SelectItem value="Karta">Karta</SelectItem>
                  <SelectItem value="Pul o'tkazmasi">O'tkazma</SelectItem>
                </SelectContent>
              </Select>
 
              <Select value={filter.staffId} onValueChange={(v) => updateFilter("staffId", v)}>
                <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="Sotuvchi" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha xodim</SelectItem>
                  {staffList?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.surname} {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
 
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <Input type="date" className="h-9 w-36 text-sm" value={filter.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} />
                <span>–</span>
                <Input type="date" className="h-9 w-36 text-sm" value={filter.dateTo}   onChange={(e) => updateFilter("dateTo",   e.target.value)} />
              </div>
 
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-red-500 hover:text-red-700 hover:bg-red-50">
                  <X className="w-3.5 h-3.5" /> Tozalash
                </Button>
              )}
            </div>
          </div>
 
          {/* ── Table ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Sana / Vaqt</th>
                    <th className="px-4 py-3">Mijoz</th>
                    <th className="px-4 py-3">Mahsulotlar</th>
                    <th className="px-4 py-3 text-center">Soni</th>
                    <th className="px-4 py-3">Sotuvchi</th>
                    <th className="px-4 py-3">To'lov</th>
                    <th className="px-4 py-3">Holat</th>
                    <th className="px-4 py-3 text-right">Summa</th>
                    <th className="px-4 py-3 text-center">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {salesLoading ? (
                    Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={9} />)
                  ) : pagedSales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-20 text-center text-slate-400">
                        <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="font-semibold text-sm">
                          {hasActiveFilters ? "Filtr bo'yicha natija topilmadi" : "Hali sotuvlar mavjud emas"}
                        </p>
                        {hasActiveFilters && (
                          <button onClick={clearFilters} className="mt-2 text-blue-500 text-xs hover:underline">
                            Filtrni tozalash
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    pagedSales.map((s: any) => {
                      const items: SaleItem[] = s.items || [];
                      const displayItems = items.length > 0 ? items : [{ productName: s.productName, productSku: s.productSku } as SaleItem];
                      return (
                        <tr key={s.id} className="border-t border-slate-50 hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-slate-700 font-medium text-xs">{fmtDate(s.createdAt)}</div>
                            <div className="text-slate-400 text-[11px]">{fmtTime(s.createdAt)}</div>
                          </td>
                          <td className="px-4 py-3 max-w-[110px]">
                            <span className="truncate block text-slate-700 text-xs font-medium">
                              {s.customerName || <span className="text-slate-300 italic">Noma'lum</span>}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[180px]">
                            {displayItems.slice(0, 2).map((item, i) => (
                              <div key={i} className="truncate">
                                <span className="font-semibold text-slate-800 text-xs">{item.productName}</span>
                                {item.productSku && <span className="text-slate-400 text-[11px] ml-1">· {item.productSku}</span>}
                              </div>
                            ))}
                            {items.length > 2 && (
                              <span className="text-[11px] text-blue-500 font-medium">+{items.length - 2} ta mahsulot</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                              {s.totalItems || s.quantity || 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-slate-600">{s.staffName || "—"}</div>
                          </td>
                          <td className="px-4 py-3">
                            <PaymentBadge method={s.paymentMethod} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={s.status || "completed"} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="font-black text-emerald-600 text-sm whitespace-nowrap">{fmt(s.amount || 0)} so'm</div>
                            {s.discount > 0 && (
                              <div className="text-[11px] text-amber-500">-{fmt(s.discount)} chegirma</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost" size="sm" type="button"
                                    onClick={() => setReceiptSale(s)}
                                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8 p-0"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Chekni ko'rish</TooltipContent>
                              </Tooltip>
 
                              <DeleteConfirmDialog onConfirm={() => handleDeleteSale(s.id)}>
                                <Button
                                  variant="ghost" size="sm" type="button"
                                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </DeleteConfirmDialog>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
 
            {/* ── Pagination ── */}
            {!salesLoading && filteredSales.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-50 bg-slate-50/50">
                <span className="text-xs text-slate-400">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredSales.length)}{" "}
                  / {filteredSales.length} ta sotuv
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc: (number | string)[], p, i, arr) => {
                      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span key={`d${i}`} className="px-1 text-slate-300 text-xs">…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={currentPage === p ? "default" : "outline"}
                          size="sm"
                          className={`h-8 w-8 p-0 text-xs ${currentPage === p ? "bg-blue-600 border-blue-600" : ""}`}
                          onClick={() => setCurrentPage(p as number)}
                        >
                          {p}
                        </Button>
                      )
                    )}
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
 
      {/* ── Receipt Modal ── */}
      {receiptSale && (
        <ReceiptDialog sale={receiptSale} onClose={() => setReceiptSale(null)} />
      )}
    </TooltipProvider>
  );
}"use client";
 
import { useState, useMemo, useCallback, useRef } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag, Plus, Loader2, Trash2, Calendar,
  User, Package, Search, Download, Filter, X,
  ChevronLeft, ChevronRight, TrendingUp, Banknote,
  ShoppingCart, AlertCircle, CheckCircle2, Clock,
  BarChart3, RefreshCw, Eye, Printer, Receipt,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import {
  collection, doc, serverTimestamp, runTransaction,
  increment,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
 
// ─── Types ─────────────────────────────────────────────────────────────────
interface SaleItem {
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}
 
interface FormData {
  customerName: string;
  staffId: string;
  paymentMethod: string;
  discount: number;
  note: string;
}
 
interface FilterState {
  payment: string;
  staffId: string;
  dateFrom: string;
  dateTo: string;
  search: string;
  status: string;
}
 
const defaultForm: FormData = {
  customerName: "",
  staffId: "",
  paymentMethod: "Naqd",
  discount: 0,
  note: "",
};
 
const defaultFilter: FilterState = {
  payment: "all",
  staffId: "all",
  dateFrom: "",
  dateTo: "",
  search: "",
  status: "all",
};
 
const PAGE_SIZE = 12;
 
// ─── Utils ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("uz-UZ");
const fmtDate = (ts: any) =>
  ts?.toDate?.()?.toLocaleDateString("uz-UZ", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }) || "—";
const fmtTime = (ts: any) =>
  ts?.toDate?.()?.toLocaleTimeString("uz-UZ", {
    hour: "2-digit", minute: "2-digit",
  }) || "";
 
// ─── Sub-components ──────────────────────────────────────────────────────────
 
function SkeletonRow({ cols = 9 }: { cols?: number }) {
  return (
    <tr className="border-t border-slate-100 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 bg-slate-100 rounded-full w-full" />
        </td>
      ))}
    </tr>
  );
}
 
function StatCard({
  label, value, sub, icon: Icon, gradient, trend,
}: {
  label: string; value: string; sub?: string;
  icon: any; gradient: string; trend?: { val: number; label: string };
}) {
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-5 group hover:shadow-md transition-all duration-200">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${gradient} opacity-[0.03]`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        {trend && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 px-2 py-1 rounded-full ${
            trend.val >= 0
              ? "text-emerald-600 bg-emerald-50"
              : "text-red-500 bg-red-50"
          }`}>
            {trend.val >= 0
              ? <ArrowUpRight className="w-3 h-3" />
              : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend.val)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-black text-slate-800 mb-0.5 tracking-tight">{value}</div>
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}
 
function PaymentBadge({ method }: { method: string }) {
  const map: Record<string, string> = {
    Naqd: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Karta: "bg-blue-50 text-blue-700 border-blue-200",
    "Pul o'tkazmasi": "bg-violet-50 text-violet-700 border-violet-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${map[method] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {method}
    </span>
  );
}
 
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; icon: any }> = {
    completed: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Yakunlandi", icon: CheckCircle2 },
    refunded:  { cls: "bg-amber-50 text-amber-700 border-amber-200",    label: "Qaytarildi",  icon: RefreshCw },
    pending:   { cls: "bg-slate-50 text-slate-600 border-slate-200",    label: "Kutilmoqda",  icon: Clock },
  };
  const { cls, label, icon: Icon } = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}
 
function DeleteConfirmDialog({ onConfirm, disabled, children }: {
  onConfirm: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" /> Sotuvni o'chirish
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 py-2 leading-relaxed">
          Bu sotuvni o'chirsangiz, <strong>inventar miqdori avtomatik qaytariladi</strong> va
          tranzaksiya tarixi yangilanadi. Bu amalni ortga qaytarib bo'lmaydi.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
          <Button variant="destructive" onClick={() => { setOpen(false); onConfirm(); }}>
            Ha, o'chirish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
 
// ─── Cart Item Row ──────────────────────────────────────────────────────────
function CartItemRow({
  item, onQtyChange, onPriceChange, onRemove, maxQty,
}: {
  item: SaleItem;
  onQtyChange: (id: string, qty: number) => void;
  onPriceChange: (id: string, price: number) => void;
  onRemove: (id: string) => void;
  maxQty: number;
}) {
  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-800 text-sm truncate">{item.productName}</div>
        <div className="text-xs text-slate-500">SKU: {item.productSku}</div>
      </div>
      <Input
        type="number" min={1} max={maxQty}
        value={item.quantity}
        onChange={(e) => onQtyChange(item.productId, Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1)))}
        className="w-16 h-8 text-center text-sm"
      />
      <span className="text-slate-400 text-xs">×</span>
      <Input
        type="number" min={0}
        value={item.unitPrice}
        onChange={(e) => onPriceChange(item.productId, parseFloat(e.target.value) || 0)}
        className="w-28 h-8 text-sm text-right"
      />
      <div className="w-24 text-right font-bold text-emerald-600 text-sm">
        {fmt(item.subtotal)}
      </div>
      <Button variant="ghost" size="sm" onClick={() => onRemove(item.productId)} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 shrink-0">
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
 
// ─── Receipt Dialog ─────────────────────────────────────────────────────────
function ReceiptDialog({ sale, onClose }: { sale: any; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Chek</title><style>
      body { font-family: monospace; font-size: 12px; padding: 20px; }
      h2 { text-align: center; } .line { border-top: 1px dashed #000; margin: 8px 0; }
      .row { display: flex; justify-content: space-between; }
      .total { font-weight: bold; font-size: 14px; }
    </style></head><body>${printRef.current.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };
  if (!sale) return null;
  const items = sale.items || [{ productName: sale.productName, productSku: sale.productSku, quantity: sale.quantity || 1, unitPrice: sale.unitPrice || 0, subtotal: sale.amount || 0 }];
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Chek #{sale.id?.slice(-6).toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        <div ref={printRef} className="font-mono text-xs space-y-1 py-2">
          <h2 className="text-center font-bold text-base mb-2">DO'KON CHEKI</h2>
          <div className="border-t border-dashed border-slate-300 my-2" />
          <div className="flex justify-between"><span>Sana:</span><span>{fmtDate(sale.createdAt)} {fmtTime(sale.createdAt)}</span></div>
          <div className="flex justify-between"><span>Mijoz:</span><span>{sale.customerName || "Noma'lum"}</span></div>
          <div className="flex justify-between"><span>Sotuvchi:</span><span>{sale.staffName}</span></div>
          <div className="border-t border-dashed border-slate-300 my-2" />
          {items.map((item: any, i: number) => (
            <div key={i}>
              <div className="font-semibold">{item.productName}</div>
              <div className="flex justify-between text-slate-500">
                <span>{item.quantity} × {fmt(item.unitPrice)}</span>
                <span>{fmt(item.subtotal)}</span>
              </div>
            </div>
          ))}
          <div className="border-t border-dashed border-slate-300 my-2" />
          {sale.discount > 0 && <div className="flex justify-between text-amber-600"><span>Chegirma:</span><span>-{fmt(sale.discount)}</span></div>}
          <div className="flex justify-between font-bold text-base"><span>JAMI:</span><span>{fmt(sale.amount)} so'm</span></div>
          <div className="flex justify-between"><span>To'lov:</span><span>{sale.paymentMethod}</span></div>
          <div className="border-t border-dashed border-slate-300 my-2" />
          <p className="text-center text-slate-400">Rahmat! Yana keling!</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Yopish</Button>
          <Button onClick={handlePrint} className="gap-2"><Printer className="w-4 h-4" />Chop etish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
 
// ─── Main Page ───────────────────────────────────────────────────────────────
export default function SalesPage() {
  const { toast } = useToast();
  const db = useFirestore();
 
  // Modal states
  const [loading, setLoading]           = useState(false);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [formData, setFormData]         = useState<FormData>(defaultForm);
  const [cartItems, setCartItems]       = useState<SaleItem[]>([]);
  const [receiptSale, setReceiptSale]   = useState<any>(null);
 
  // Filters
  const [filter, setFilter]       = useState<FilterState>(defaultFilter);
  const [currentPage, setCurrentPage] = useState(1);
 
  // Firestore queries
  const salesQuery     = useMemoFirebase(() => db ? collection(db, "sales")     : null, [db]);
  const staffQuery     = useMemoFirebase(() => db ? collection(db, "staff")     : null, [db]);
  const inventoryQuery = useMemoFirebase(() => db ? collection(db, "inventory") : null, [db]);
 
  const { data: salesList,     isLoading: salesLoading }     = useCollection(salesQuery);
  const { data: staffList }                                   = useCollection(staffQuery);
  const { data: inventoryList }                               = useCollection(inventoryQuery);
 
  // ── Product search in modal ───────────────────────────────────────────────
  const filteredProducts = useMemo(
    () =>
      (inventoryList || []).filter(
        (item: any) =>
          item.quantity > 0 &&
          (item.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
           item.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
           item.barcode?.includes(productSearch))
      ),
    [inventoryList, productSearch]
  );
 
  // ── Cart management ───────────────────────────────────────────────────────
  //
  // getAvailableStock: real inventar miqdori MINUS savatda band qilingan
  // → bir xil mahsulot bir necha marta qo'shilganda ham to'g'ri hisoblaydi
  const getAvailableStock = useCallback(
    (productId: string, currentCart: SaleItem[]): number => {
      const realStock = (inventoryList || []).find((p: any) => p.id === productId)?.quantity ?? 0;
      const inCart    = currentCart.find((i) => i.productId === productId)?.quantity ?? 0;
      return realStock - inCart; // shu mahsulotdan yana qancha qo'shsa bo'ladi
    },
    [inventoryList]
  );
 
  const addToCart = useCallback((product: any) => {
    setCartItems((prev) => {
      const available = getAvailableStock(product.id, prev);
 
      if (available <= 0) {
        toast({
          title: "Ombor yetarli emas",
          description: `"${product.name}" omborda qolmagan yoki savatda to'liq band.`,
          variant: "destructive",
        });
        return prev; // o'zgartirmasdan qaytaramiz
      }
 
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        // Mavjud elementga +1
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitPrice }
            : i
        );
      }
 
      // Yangi element
      const unitPrice = product.salePrice ?? product.price ?? 0;
      return [...prev, {
        productId:   product.id,
        productName: product.name,
        productSku:  product.sku || "",
        unitPrice,
        quantity:    1,
        subtotal:    unitPrice,
      }];
    });
    setProductSearch("");
  }, [toast, getAvailableStock]);
 
  const updateCartQty = useCallback((productId: string, qty: number) => {
    setCartItems((prev) => {
      // Yangi qty real stock'dan oshib ketmasligi kerak
      const realStock = (inventoryList || []).find((p: any) => p.id === productId)?.quantity ?? 0;
      const safeQty   = Math.max(1, Math.min(qty, realStock));
      return prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: safeQty, subtotal: safeQty * i.unitPrice }
          : i
      );
    });
  }, [inventoryList]);
 
  const updateCartPrice = useCallback((productId: string, price: number) => {
    const safePrice = Math.max(0, price);
    setCartItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, unitPrice: safePrice, subtotal: i.quantity * safePrice }
          : i
      )
    );
  }, []);
 
  const removeFromCart = useCallback((productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);
 
  // CartItemRow uchun max qiymat: inventardagi real stock
  const getProductStock = useCallback(
    (productId: string) =>
      (inventoryList || []).find((p: any) => p.id === productId)?.quantity ?? 0,
    [inventoryList]
  );
 
  const cartSubtotal = useMemo(() => cartItems.reduce((s, i) => s + i.subtotal, 0), [cartItems]);
  const cartTotal    = useMemo(() => Math.max(0, cartSubtotal - (formData.discount || 0)), [cartSubtotal, formData.discount]);
 
  // ── Table filters ─────────────────────────────────────────────────────────
  const filteredSales = useMemo(() => {
    if (!salesList) return [];
    return salesList.filter((s: any) => {
      if (filter.payment !== "all" && s.paymentMethod !== filter.payment) return false;
      if (filter.staffId !== "all" && s.staffId !== filter.staffId)       return false;
      if (filter.status  !== "all" && s.status  !== filter.status)        return false;
      if (filter.dateFrom) {
        const d = s.createdAt?.toDate?.();
        if (d && d < new Date(filter.dateFrom)) return false;
      }
      if (filter.dateTo) {
        const d = s.createdAt?.toDate?.();
        const to = new Date(filter.dateTo); to.setHours(23, 59, 59);
        if (d && d > to) return false;
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const items: SaleItem[] = s.items || [];
        const itemMatch = items.some(
          (i) =>
            i.productName?.toLowerCase().includes(q) ||
            i.productSku?.toLowerCase().includes(q)
        );
        return (
          itemMatch ||
          s.customerName?.toLowerCase().includes(q) ||
          s.staffName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [salesList, filter]);
 
  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const revenue  = filteredSales.reduce((s: number, x: any) => s + (x.amount || 0), 0);
    const items    = filteredSales.reduce((s: number, x: any) => s + (x.totalItems || x.quantity || 1), 0);
    const avgOrder = filteredSales.length ? Math.round(revenue / filteredSales.length) : 0;
    return { count: filteredSales.length, revenue, items, avgOrder };
  }, [filteredSales]);
 
  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const pagedSales = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSales.slice(start, start + PAGE_SIZE);
  }, [filteredSales, currentPage]);
 
  const hasActiveFilters = Object.entries(filter).some(([k, v]) =>
    k === "payment" || k === "staffId" || k === "status"
      ? v !== "all"
      : v !== ""
  );
 
  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };
 
  const clearFilters = () => { setFilter(defaultFilter); setCurrentPage(1); };
 
  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!filteredSales.length) return;
    const headers = ["Sana", "Vaqt", "Mijoz", "Mahsulotlar", "Jami mahsulot", "Chegirma", "Jami", "Sotuvchi", "To'lov", "Holat"];
    const rows = filteredSales.map((s: any) => {
      const items: SaleItem[] = s.items || [];
      const names = items.map((i) => `${i.productName}(${i.quantity})`).join("; ");
      return [
        fmtDate(s.createdAt),
        fmtTime(s.createdAt),
        s.customerName || "",
        names || s.productName || "",
        s.totalItems || s.quantity || 1,
        s.discount || 0,
        s.amount || 0,
        s.staffName || "",
        s.paymentMethod || "",
        s.status || "completed",
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `sotuvlar_${new Date().toLocaleDateString("uz-UZ")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
 
  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData(defaultForm);
    setCartItems([]);
    setProductSearch("");
  };
 
  const handleModalChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) resetForm();
  };
 
  // ── Add Sale — atomic Firestore transaction ───────────────────────────────
  //
  // Algoritm:
  //   PHASE 1 – reads  (barcha get() lar birinchi, writes yo'q)
  //   PHASE 2 – validate (stock tekshiruv, throw → rollback)
  //   PHASE 3 – writes  (sale, inventory updates, tx logs, daily_revenue)
  //
  // Nima uchun bu to'g'ri:
  //   • Firestore transaction GET operatsiyalari ketma-ket bo'lishi shart,
  //     Promise.all ishlatish transaction kontekstini buzishi mumkin →
  //     biz for...of loop bilan ketma-ket o'qiymiz.
  //   • Barcha reads → validate → writes tartibi ACID kafolatini beradi.
  //   • Agar biror mahsulot omborda yetishmasa, HECH NARSA yozilmaydi.
  // ─────────────────────────────────────────────────────────────────────────
  const handleAddSale = async () => {
    if (!db) return;
 
    // ─ pre-flight validations (transaction tashqarisida) ─
    if (!cartItems.length) {
      toast({ title: "Xatolik", description: "Kamida 1 ta mahsulot tanlang", variant: "destructive" });
      return;
    }
    if (!formData.staffId) {
      toast({ title: "Xatolik", description: "Sotuvchini tanlang", variant: "destructive" });
      return;
    }
    // Discount mantiqan to'g'ri bo'lsin
    if ((formData.discount || 0) > cartSubtotal) {
      toast({ title: "Xatolik", description: "Chegirma jami summadan katta bo'lishi mumkin emas", variant: "destructive" });
      return;
    }
 
    setLoading(true);
    try {
      const staff     = staffList?.find((s: any) => s.id === formData.staffId);
      const staffName = `${staff?.surname || ""} ${staff?.name || ""}`.trim();
      const today     = new Date().toISOString().split("T")[0];
 
      // Oldindan ref'larni tayyorlab qo'yamiz (transaction ichida new doc ref yaratish OK)
      const saleRef      = doc(collection(db, "sales"));
      const revenueRef   = doc(db, "daily_revenue", today);
      const productRefs  = cartItems.map((item) => doc(db, "inventory", item.productId));
      const txRefs       = cartItems.map(() => doc(collection(db, "inventory_transactions")));
 
      await runTransaction(db, async (tx) => {
 
        // ── PHASE 1: reads — ketma-ket, Promise.all EMAS ──────────────────
        const snaps: ReturnType<typeof tx.get> extends Promise<infer T> ? T[] : never[] = [];
        for (const ref of productRefs) {
          // eslint-disable-next-line no-await-in-loop
          snaps.push(await tx.get(ref) as any);
        }
 
        // ── PHASE 2: validate ──────────────────────────────────────────────
        for (let i = 0; i < snaps.length; i++) {
          const snap    = snaps[i] as any;
          const reqItem = cartItems[i];
 
          if (!snap.exists()) {
            throw new Error(`❌ Mahsulot topilmadi: "${reqItem.productName}". U inventardan o'chirilgan bo'lishi mumkin.`);
          }
 
          const currentQty: number = snap.data().quantity ?? 0;
 
          if (currentQty <= 0) {
            throw new Error(`⚠️ "${reqItem.productName}" omborda tugagan (mavjud: 0 ta).`);
          }
          if (currentQty < reqItem.quantity) {
            throw new Error(
              `⚠️ "${reqItem.productName}" yetarli emas. ` +
              `So'ralgan: ${reqItem.quantity} ta, mavjud: ${currentQty} ta.`
            );
          }
        }
 
        // ── PHASE 3: writes ────────────────────────────────────────────────
 
        // 3a. Sale document
        tx.set(saleRef, {
          customerName:  formData.customerName.trim(),
          staffId:       formData.staffId,
          staffName,
          paymentMethod: formData.paymentMethod,
          discount:      formData.discount || 0,
          note:          formData.note.trim(),
          items:         cartItems,
          totalItems:    cartItems.reduce((s, i) => s + i.quantity, 0),
          subtotal:      cartSubtotal,
          amount:        cartTotal,
          status:        "completed",
          createdAt:     serverTimestamp(),
        });
 
        // 3b. Per-product: decrement inventory + write tx log
        for (let i = 0; i < cartItems.length; i++) {
          const item = cartItems[i];
 
          // Inventory: faqat zarur fieldlar, manfiy bo'lib ketmasligi uchun
          // server-side increment ishlatamiz (atomic)
          tx.update(productRefs[i], {
            quantity:  increment(-item.quantity),  // atomic decrement
            totalSold: increment(item.quantity),   // jami sotilgan statistikasi
            lastSold:  serverTimestamp(),
          });
 
          // Inventory transaction log
          tx.set(txRefs[i], {
            productId:    item.productId,
            productName:  item.productName,
            productSku:   item.productSku,
            type:         "sale",
            quantityDelta: -item.quantity,         // manfiy = yechildi
            quantityBefore: (snaps[i] as any).data().quantity,
            quantityAfter:  (snaps[i] as any).data().quantity - item.quantity,
            unitPrice:    item.unitPrice,
            subtotal:     item.subtotal,
            staffId:      formData.staffId,
            staffName,
            saleId:       saleRef.id,
            paymentMethod: formData.paymentMethod,
            createdAt:    serverTimestamp(),
          });
        }
 
        // 3c. Daily revenue aggregate (merge: true → doc bo'lmasa yaratadi)
        tx.set(revenueRef, {
          date:       today,
          revenue:    increment(cartTotal),
          salesCount: increment(1),
          itemsSold:  increment(cartItems.reduce((s, i) => s + i.quantity, 0)),
        }, { merge: true });
      });
 
      toast({
        title: "✅ Sotuv muvaffaqiyatli!",
        description: `${cartItems.length} xil, jami ${fmt(cartTotal)} so'm. Ombor yangilandi.`,
      });
      setIsModalOpen(false);
      resetForm();
 
    } catch (error: any) {
      // Foydalanuvchiga aniq xabar
      toast({
        title: "Sotuv amalga oshmadi",
        description: error?.message || "Noma'lum xatolik. Qaytadan urinib ko'ring.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
 
  // ── Delete Sale — runTransaction (writeBatch EMAS) ────────────────────────
  //
  // Nima uchun runTransaction:
  //   • writeBatch hech qanday read qilmaydi → inventory manfiy bo'lishi mumkin
  //   • runTransaction bilan avval sale doc o'qiymiz (exists tekshiruvi),
  //     so'ng xavfsiz qaytaramiz.
  //   • "already refunded" holatini oldini olamiz (status: "refunded" tekshiruv).
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteSale = async (saleId: string) => {
    if (!db) return;
 
    // Local cache'dan oldindan ma'lumot olamiz (items ro'yxati kerak)
    const localSale = salesList?.find((s: any) => s.id === saleId);
    if (!localSale) return;
 
    // Qaytariladigan mahsulotlar ro'yxati (multi-item yoki legacy single-item)
    const returnItems: SaleItem[] = localSale.items?.length
      ? localSale.items
      : localSale.productId
        ? [{
            productId:   localSale.productId,
            productName: localSale.productName || "",
            productSku:  localSale.productSku  || "",
            unitPrice:   localSale.unitPrice   || 0,
            quantity:    localSale.quantity    || 1,
            subtotal:    localSale.amount      || 0,
          }]
        : [];
 
    if (!returnItems.length) {
      toast({ title: "Xatolik", description: "Sotuv ma'lumotlari topilmadi", variant: "destructive" });
      return;
    }
 
    try {
      const saleDocRef   = doc(db, "sales", saleId);
      const productRefs  = returnItems.map((i) => doc(db, "inventory", i.productId));
      const refundTxRefs = returnItems.map(() => doc(collection(db, "inventory_transactions")));
      const saleDate     = localSale.createdAt?.toDate?.()?.toISOString().split("T")[0]
                          || new Date().toISOString().split("T")[0];
      const revenueRef   = doc(db, "daily_revenue", saleDate);
 
      await runTransaction(db, async (tx) => {
 
        // ── PHASE 1: reads ─────────────────────────────────────────────────
        const saleSnap = await tx.get(saleDocRef);
 
        if (!saleSnap.exists()) {
          throw new Error("Bu sotuv allaqachon o'chirilgan.");
        }
        if (saleSnap.data()?.status === "refunded") {
          throw new Error("Bu sotuv allaqachon qaytarilgan (refunded).");
        }
 
        // Inventory snapshot'larini ketma-ket o'qiymiz
        const invSnaps: any[] = [];
        for (const ref of productRefs) {
          invSnaps.push(await tx.get(ref));
        }
 
        // ── PHASE 2: validate ──────────────────────────────────────────────
        // (Delete uchun kritik tekshiruv yo'q, lekin product mavjudligini tekshiramiz)
        for (let i = 0; i < invSnaps.length; i++) {
          if (!invSnaps[i].exists()) {
            // Mahsulot o'chirilgan — omborsiz davom etamiz (faqat sale o'chiriladi)
            console.warn(`Inventory doc topilmadi: ${returnItems[i].productId}`);
          }
        }
 
        // ── PHASE 3: writes ────────────────────────────────────────────────
 
        // 3a. Sale statusini "refunded" ga o'zgartir (o'chirish o'rniga soft delete)
        tx.update(saleDocRef, {
          status:     "refunded",
          refundedAt: serverTimestamp(),
        });
 
        // 3b. Har bir mahsulotni omborga qaytaramiz
        for (let i = 0; i < returnItems.length; i++) {
          const item    = returnItems[i];
          const invSnap = invSnaps[i];
 
          if (!invSnap.exists()) continue; // mahsulot o'chirilgan, skip
 
          const currentQty: number = invSnap.data().quantity ?? 0;
 
          tx.update(productRefs[i], {
            quantity:  increment(item.quantity),               // atomic qaytarish
            totalSold: increment(-item.quantity),              // statistika tuzatish
            // lastSold o'zgartirilmaydi — haqiqiy sotuv vaqti saqlanib qolsin
          });
 
          // Refund transaction log
          tx.set(refundTxRefs[i], {
            productId:     item.productId,
            productName:   item.productName,
            productSku:    item.productSku,
            type:          "sale_refund",
            quantityDelta:  item.quantity,              // musbat = qaytarildi
            quantityBefore: currentQty,
            quantityAfter:  currentQty + item.quantity,
            unitPrice:     item.unitPrice,
            subtotal:      item.subtotal,
            staffId:       localSale.staffId,
            staffName:     localSale.staffName,
            originalSaleId: saleId,
            createdAt:     serverTimestamp(),
          });
        }
 
        // 3c. Daily revenue tuzatish
        tx.set(revenueRef, {
          revenue:    increment(-(localSale.amount || 0)),
          salesCount: increment(-1),
          itemsSold:  increment(-(localSale.totalItems || localSale.quantity || 1)),
        }, { merge: true });
      });
 
      toast({
        title: "Qaytarildi",
        description: `${returnItems.length} xil mahsulot omborga qaytarildi.`,
      });
 
    } catch (error: any) {
      toast({
        title: "O'chirishda xatolik",
        description: error?.message || "Noma'lum xatolik",
        variant: "destructive",
      });
    }
  };
 
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-[#f4f6f8]">
        <OmniSidebar />
 
        <main className="flex-1 p-5 md:p-8 overflow-auto">
 
          {/* ── Header ── */}
          <div className="flex flex-wrap justify-between items-center mb-7 gap-4">
            <div>
              <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight text-slate-900">
                <ShoppingBag className="text-blue-600 w-6 h-6" />
                SOTUVLAR
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">Sotuv boshqaruvi va tahlili</p>
            </div>
 
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={handleExportCSV} disabled={!filteredSales.length} className="gap-2 h-9">
                    <Download className="w-4 h-4" /> CSV
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Filtrlangan sotuvlarni CSV formatida yuklab olish</TooltipContent>
              </Tooltip>
 
              <Dialog open={isModalOpen} onOpenChange={handleModalChange}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 gap-2 h-9 font-semibold shadow-sm">
                    <Plus className="w-4 h-4" /> YANGI SOTUV
                  </Button>
                </DialogTrigger>
 
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-blue-700">
                      <ShoppingBag className="w-5 h-5" /> Yangi sotuv — savat
                    </DialogTitle>
                  </DialogHeader>
 
                  <div className="space-y-5 py-2">
                    {/* Mijoz va sotuvchi */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Mijoz ismi</label>
                        <Input
                          placeholder="Mijoz ismini kiriting"
                          value={formData.customerName}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">
                          <User className="inline w-3 h-3 mr-1" />Sotuvchi *
                        </label>
                        <Select value={formData.staffId} onValueChange={(v) => setFormData({ ...formData, staffId: v })}>
                          <SelectTrigger className={!formData.staffId ? "border-red-200" : ""}>
                            <SelectValue placeholder="Tanlang..." />
                          </SelectTrigger>
                          <SelectContent>
                            {staffList?.map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.surname} {s.name}
                                {s.position && <span className="text-slate-400 ml-1">· {s.position}</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
 
                    {/* Mahsulot qidirish */}
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">
                        <Package className="inline w-3 h-3 mr-1" />Mahsulot qo'shish
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Nom, SKU yoki shtrix-kod bo'yicha qidiring..."
                          className="pl-9"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
 
                      {productSearch && filteredProducts.length > 0 && (
                        <div className="mt-1.5 border rounded-xl max-h-48 overflow-y-auto bg-white shadow-lg z-50 relative divide-y divide-slate-50">
                          {filteredProducts.map((product: any) => {
                            const inCart = cartItems.find((i) => i.productId === product.id);
                            return (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => addToCart(product)}
                                className="w-full text-left p-3 hover:bg-blue-50 flex justify-between items-center transition-colors"
                              >
                                <div>
                                  <div className="font-semibold text-slate-800 text-sm">{product.name}</div>
                                  <div className="text-xs text-slate-400 mt-0.5">
                                    SKU: {product.sku} &nbsp;|&nbsp; Omborda: <span className={`font-semibold ${product.quantity < 5 ? "text-red-500" : "text-emerald-600"}`}>{product.quantity} ta</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {inCart && (
                                    <Badge variant="secondary" className="text-xs">Savatda: {inCart.quantity}</Badge>
                                  )}
                                  <span className="text-emerald-600 font-bold text-sm">
                                    {fmt(product.salePrice || product.price || 0)} so'm
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {productSearch && filteredProducts.length === 0 && (
                        <div className="mt-1.5 p-3 text-sm text-slate-400 bg-slate-50 rounded-xl text-center">
                          Mahsulot topilmadi
                        </div>
                      )}
                    </div>
 
                    {/* Savat */}
                    {cartItems.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Savat ({cartItems.length} xil mahsulot)
                          </label>
                          <div className="text-xs text-slate-400">Miqdor · Narx · Jami</div>
                        </div>
                        <div className="space-y-2">
                          {cartItems.map((item) => (
                            <CartItemRow
                              key={item.productId}
                              item={item}
                              onQtyChange={updateCartQty}
                              onPriceChange={updateCartPrice}
                              onRemove={removeFromCart}
                              maxQty={getProductStock(item.productId)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
 
                    {/* Chegirma + To'lov + Izoh */}
                    {cartItems.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Chegirma (so'm)</label>
                          <Input
                            type="number" min={0} max={cartSubtotal}
                            value={formData.discount}
                            onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">To'lov usuli</label>
                          <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Naqd">💵 Naqd pul</SelectItem>
                              <SelectItem value="Karta">💳 Karta</SelectItem>
                              <SelectItem value="Pul o'tkazmasi">🏦 O'tkazma</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Izoh</label>
                          <Input
                            placeholder="Ixtiyoriy..."
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
 
                    {/* Jami */}
                    {cartItems.length > 0 && (
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white">
                        <div className="flex justify-between items-center text-sm opacity-80 mb-1">
                          <span>Mahsulotlar jami:</span>
                          <span>{fmt(cartSubtotal)} so'm</span>
                        </div>
                        {formData.discount > 0 && (
                          <div className="flex justify-between items-center text-sm opacity-80 mb-1">
                            <span>Chegirma:</span>
                            <span>- {fmt(formData.discount)} so'm</span>
                          </div>
                        )}
                        <div className="border-t border-white/20 mt-2 pt-2 flex justify-between items-center">
                          <span className="font-bold text-lg">TO'LOV JAMI:</span>
                          <span className="font-black text-2xl">{fmt(cartTotal)} so'm</span>
                        </div>
                      </div>
                    )}
                  </div>
 
                  <DialogFooter className="gap-2">
                    <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Bekor qilish</Button>
                    <Button
                      type="button"
                      onClick={handleAddSale}
                      disabled={loading || !cartItems.length || !formData.staffId}
                      className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
                    >
                      {loading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saqlanmoqda...</>
                      ) : (
                        <><ShoppingBag className="mr-2 h-4 w-4" />Sotish ({fmt(cartTotal)} so'm)</>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
 
          {/* ── Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Jami sotuvlar"
              value={String(stats.count)}
              icon={ShoppingCart}
              gradient="from-blue-500 to-blue-600"
              sub={hasActiveFilters ? "Filtr bo'yicha" : "Barcha vaqt"}
            />
            <StatCard
              label="Jami daromad"
              value={`${fmt(stats.revenue)} so'm`}
              icon={Banknote}
              gradient="from-emerald-500 to-emerald-600"
            />
            <StatCard
              label="Sotilgan mahsulot"
              value={`${stats.items} ta`}
              icon={TrendingUp}
              gradient="from-orange-500 to-orange-600"
            />
            <StatCard
              label="O'rtacha sotuv"
              value={`${fmt(stats.avgOrder)} so'm`}
              icon={BarChart3}
              gradient="from-violet-500 to-violet-600"
            />
          </div>
 
          {/* ── Filters ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> FILTR
              </span>
 
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Mahsulot, mijoz, sotuvchi..."
                  className="pl-9 h-9 text-sm"
                  value={filter.search}
                  onChange={(e) => updateFilter("search", e.target.value)}
                />
              </div>
 
              <Select value={filter.status} onValueChange={(v) => updateFilter("status", v)}>
                <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="Holat" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha holat</SelectItem>
                  <SelectItem value="completed">Yakunlandi</SelectItem>
                  <SelectItem value="refunded">Qaytarildi</SelectItem>
                  <SelectItem value="pending">Kutilmoqda</SelectItem>
                </SelectContent>
              </Select>
 
              <Select value={filter.payment} onValueChange={(v) => updateFilter("payment", v)}>
                <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="To'lov" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha to'lov</SelectItem>
                  <SelectItem value="Naqd">Naqd</SelectItem>
                  <SelectItem value="Karta">Karta</SelectItem>
                  <SelectItem value="Pul o'tkazmasi">O'tkazma</SelectItem>
                </SelectContent>
              </Select>
 
              <Select value={filter.staffId} onValueChange={(v) => updateFilter("staffId", v)}>
                <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="Sotuvchi" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha xodim</SelectItem>
                  {staffList?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.surname} {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
 
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <Input type="date" className="h-9 w-36 text-sm" value={filter.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} />
                <span>–</span>
                <Input type="date" className="h-9 w-36 text-sm" value={filter.dateTo}   onChange={(e) => updateFilter("dateTo",   e.target.value)} />
              </div>
 
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-red-500 hover:text-red-700 hover:bg-red-50">
                  <X className="w-3.5 h-3.5" /> Tozalash
                </Button>
              )}
            </div>
          </div>
 
          {/* ── Table ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Sana / Vaqt</th>
                    <th className="px-4 py-3">Mijoz</th>
                    <th className="px-4 py-3">Mahsulotlar</th>
                    <th className="px-4 py-3 text-center">Soni</th>
                    <th className="px-4 py-3">Sotuvchi</th>
                    <th className="px-4 py-3">To'lov</th>
                    <th className="px-4 py-3">Holat</th>
                    <th className="px-4 py-3 text-right">Summa</th>
                    <th className="px-4 py-3 text-center">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {salesLoading ? (
                    Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={9} />)
                  ) : pagedSales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-20 text-center text-slate-400">
                        <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="font-semibold text-sm">
                          {hasActiveFilters ? "Filtr bo'yicha natija topilmadi" : "Hali sotuvlar mavjud emas"}
                        </p>
                        {hasActiveFilters && (
                          <button onClick={clearFilters} className="mt-2 text-blue-500 text-xs hover:underline">
                            Filtrni tozalash
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    pagedSales.map((s: any) => {
                      const items: SaleItem[] = s.items || [];
                      const displayItems = items.length > 0 ? items : [{ productName: s.productName, productSku: s.productSku } as SaleItem];
                      return (
                        <tr key={s.id} className="border-t border-slate-50 hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-slate-700 font-medium text-xs">{fmtDate(s.createdAt)}</div>
                            <div className="text-slate-400 text-[11px]">{fmtTime(s.createdAt)}</div>
                          </td>
                          <td className="px-4 py-3 max-w-[110px]">
                            <span className="truncate block text-slate-700 text-xs font-medium">
                              {s.customerName || <span className="text-slate-300 italic">Noma'lum</span>}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[180px]">
                            {displayItems.slice(0, 2).map((item, i) => (
                              <div key={i} className="truncate">
                                <span className="font-semibold text-slate-800 text-xs">{item.productName}</span>
                                {item.productSku && <span className="text-slate-400 text-[11px] ml-1">· {item.productSku}</span>}
                              </div>
                            ))}
                            {items.length > 2 && (
                              <span className="text-[11px] text-blue-500 font-medium">+{items.length - 2} ta mahsulot</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                              {s.totalItems || s.quantity || 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-slate-600">{s.staffName || "—"}</div>
                          </td>
                          <td className="px-4 py-3">
                            <PaymentBadge method={s.paymentMethod} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={s.status || "completed"} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="font-black text-emerald-600 text-sm whitespace-nowrap">{fmt(s.amount || 0)} so'm</div>
                            {s.discount > 0 && (
                              <div className="text-[11px] text-amber-500">-{fmt(s.discount)} chegirma</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost" size="sm" type="button"
                                    onClick={() => setReceiptSale(s)}
                                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8 p-0"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Chekni ko'rish</TooltipContent>
                              </Tooltip>
 
                              <DeleteConfirmDialog onConfirm={() => handleDeleteSale(s.id)}>
                                <Button
                                  variant="ghost" size="sm" type="button"
                                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </DeleteConfirmDialog>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
 
            {/* ── Pagination ── */}
            {!salesLoading && filteredSales.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-50 bg-slate-50/50">
                <span className="text-xs text-slate-400">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredSales.length)}{" "}
                  / {filteredSales.length} ta sotuv
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc: (number | string)[], p, i, arr) => {
                      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span key={`d${i}`} className="px-1 text-slate-300 text-xs">…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={currentPage === p ? "default" : "outline"}
                          size="sm"
                          className={`h-8 w-8 p-0 text-xs ${currentPage === p ? "bg-blue-600 border-blue-600" : ""}`}
                          onClick={() => setCurrentPage(p as number)}
                        >
                          {p}
                        </Button>
                      )
                    )}
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
 
      {/* ── Receipt Modal ── */}
      {receiptSale && (
        <ReceiptDialog sale={receiptSale} onClose={() => setReceiptSale(null)} />
      )}
    </TooltipProvider>
  );
}
