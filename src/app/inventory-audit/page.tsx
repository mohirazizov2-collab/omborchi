"use client";
 
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck,
  Search,
  Loader2,
  Warehouse,
  CheckCircle2,
  Trash2,
  Filter,
  Barcode,
  Plus,
  Copy,
  FolderOpen,
  RefreshCw,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Edit2,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { useScanner } from "@/hooks/use-scanner";
import { cn } from "@/lib/utils";
 
// ─── Typlar ───────────────────────────────────────────────────────────────────
 
type AuditStatus = "draft" | "completed" | "deleted";
 
interface AuditLogItem {
  productId: string;
  productName: string;
  bookStock: number;
  actualCount: number;
  discrepancy: number;
}
 
interface AuditLog {
  id: string;
  auditNumber: string;
  warehouseId: string;
  warehouseName: string;
  auditDate: string;
  items: AuditLogItem[];
  status: AuditStatus;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  totalSurplus: number;
  totalDeficit: number;
  surplusSum: number;
  deficitSum: number;
}
 
type FilterType = "all" | "completed" | "draft" | "surplus" | "deficit";
type SortCol = "date" | "num" | "surplus" | "deficit";
 
// Form mode: "new" = yangi audit, "edit" = mavjudni tahrirlash
type FormMode = "new" | "edit";
 
// ─── Yordamchi funksiyalar ─────────────────────────────────────────────────────
 
function generateAuditNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `INV-${dateStr}-${rand}`;
}
 
function formatNum(n: number) {
  return Math.round(n).toLocaleString("uz-UZ");
}
 
// ─── Asosiy sahifa ─────────────────────────────────────────────────────────────
 
export default function InventoryAuditPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const router = useRouter();
  const { user, role, isUserLoading, assignedWarehouseId } = useUser();
 
  // Sahifa holati
  const [view, setView] = useState<"list" | "form">("list");
  const [formMode, setFormMode] = useState<FormMode>("new");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
 
  // ── Ro'yxat holatlari ──
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortCol, setSortCol] = useState<SortCol>("date");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [periodFrom, setPeriodFrom] = useState(
    new Date().getFullYear() + "-01-01"
  );
  const [periodTo, setPeriodTo] = useState(
    new Date().getFullYear() + "-12-31"
  );
 
  // ── Forma holatlari ──
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    assignedWarehouseId || ""
  );
  const [auditData, setAuditData] = useState<Record<string, number>>({});
  const [auditNumber, setAuditNumber] = useState(generateAuditNumber());
  const [auditDate, setAuditDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSearch, setFormSearch] = useState("");
  const [showZeroOnly, setShowZeroOnly] = useState(false);
 
  const isAdmin = role === "Super Admin" || role === "Admin";
 
  // ── Skayner ──
  useScanner(async (barcode) => {
    if (view !== "form") return;
    if (!db || !selectedWarehouseId) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Avval omborni tanlang!",
      });
      return;
    }
    const q = query(
      collection(db, "products"),
      where("barcode", "==", barcode)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      toast({
        variant: "destructive",
        title: "Topilmadi",
        description: "Bu shtrix-kodli mahsulot mavjud emas.",
      });
      return;
    }
    const product = snap.docs[0];
    setAuditData((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] ?? 0) + 1,
    }));
    toast({
      title: "Skanerlandi ✓",
      description: `${product.data().name} qo'shildi`,
    });
  });
 
  // ── Firebase ma'lumotlari ──
  const productsQuery = useMemoFirebase(
    () => (db ? collection(db, "products") : null),
    [db]
  );
  const { data: products, isLoading: productsLoading } =
    useCollection(productsQuery);
 
  const warehousesQuery = useMemoFirebase(
    () => (db ? collection(db, "warehouses") : null),
    [db]
  );
  const { data: warehouses } = useCollection(warehousesQuery);
 
  const inventoryQuery = useMemoFirebase(
    () => (db ? collection(db, "inventory") : null),
    [db]
  );
  const { data: inventory } = useCollection(inventoryQuery);
 
  const auditLogsQuery = useMemoFirebase(
    () => (db ? collection(db, "auditLogs") : null),
    [db]
  );
  const { data: auditLogsRaw, isLoading: logsLoading } =
    useCollection(auditLogsQuery);
 
  // ── Filtrlangan va saralangan audit ro'yxati ──
  const filteredLogs = useMemo(() => {
    if (!auditLogsRaw) return [];
    let list = auditLogsRaw as unknown as AuditLog[];
 
    if (!showDeleted) list = list.filter((l) => l.status !== "deleted");
 
    if (filterType === "completed")
      list = list.filter((l) => l.status === "completed");
    else if (filterType === "draft")
      list = list.filter((l) => l.status === "draft");
    else if (filterType === "surplus")
      list = list.filter((l) => (l.totalSurplus ?? 0) > 0);
    else if (filterType === "deficit")
      list = list.filter((l) => (l.totalDeficit ?? 0) > 0);
 
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.auditNumber?.toLowerCase().includes(q) ||
          l.warehouseName?.toLowerCase().includes(q) ||
          l.items?.some((i) => i.productName?.toLowerCase().includes(q))
      );
    }
 
    list = [...list].sort((a, b) => {
      if (sortCol === "date")
        return (a.auditDate > b.auditDate ? 1 : -1) * sortDir;
      if (sortCol === "num")
        return (a.auditNumber > b.auditNumber ? 1 : -1) * sortDir;
      if (sortCol === "surplus")
        return ((a.totalSurplus ?? 0) - (b.totalSurplus ?? 0)) * sortDir;
      if (sortCol === "deficit")
        return ((a.totalDeficit ?? 0) - (b.totalDeficit ?? 0)) * sortDir;
      return 0;
    });
 
    return list;
  }, [auditLogsRaw, showDeleted, filterType, searchQuery, sortCol, sortDir]);
 
  const selectedLog = useMemo(
    () => filteredLogs.find((l) => l.id === selectedLogId) ?? null,
    [filteredLogs, selectedLogId]
  );
 
  // ── Forma uchun filtrlangan mahsulotlar ──
  const filteredProducts = useMemo(() => {
    if (!products || !selectedWarehouseId) return [];
    let list = products.map((p) => {
      const inv = inventory?.find(
        (i) => i.warehouseId === selectedWarehouseId && i.productId === p.id
      );
      return { ...p, warehouseStock: inv?.stock ?? 0 };
    });
    if (formSearch) {
      const q = formSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.barcode?.includes(formSearch)
      );
    }
    if (showZeroOnly)
      list = list.filter((p) => (auditData[p.id] ?? p.warehouseStock) === 0);
    return list;
  }, [
    products,
    inventory,
    selectedWarehouseId,
    formSearch,
    showZeroOnly,
    auditData,
  ]);
 
  // ─────────────────────────────────────────────────────────────────────────────
  // ASOSIY SUBMIT: Yangi yaratish YOKI mavjudni yangilash
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSubmitAudit = async () => {
    if (!db || !user || !selectedWarehouseId) return;
    if (Object.keys(auditData).length === 0) {
      toast({
        variant: "destructive",
        title: "Bo'sh",
        description: "Hech bir mahsulot kiritilmagan.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const wh = warehouses?.find((w) => w.id === selectedWarehouseId);
      let totalSurplus = 0,
        totalDeficit = 0,
        surplusSum = 0,
        deficitSum = 0;
 
      // Kitobiy stock — edit rejimida yangilanayotgan vaqtda ham to'g'ri hisoblash uchun
      // inventory dan olamiz (forma yuklanganida olingan qiymat)
      const items: AuditLogItem[] = Object.entries(auditData).map(
        ([productId, actualCount]) => {
          const product = products?.find((p) => p.id === productId);
          const invItem = inventory?.find(
            (i) => i.warehouseId === selectedWarehouseId && i.productId === productId
          );
          const bookStock = invItem?.stock ?? product?.warehouseStock ?? 0;
          const discrepancy = actualCount - bookStock;
          const price = product?.price ?? 0;
          if (discrepancy > 0) {
            totalSurplus += discrepancy;
            surplusSum += discrepancy * price;
          } else if (discrepancy < 0) {
            totalDeficit += Math.abs(discrepancy);
            deficitSum += Math.abs(discrepancy) * price;
          }
          return {
            productId,
            productName: product?.name ?? "",
            bookStock,
            actualCount,
            discrepancy,
          };
        }
      );
 
      const auditPayload = {
        auditNumber,
        warehouseId: selectedWarehouseId,
        warehouseName: wh?.name ?? "",
        auditDate,
        items,
        status: "completed" as AuditStatus,
        createdBy: user.uid,
        totalSurplus,
        totalDeficit,
        surplusSum,
        deficitSum,
      };
 
      if (formMode === "edit" && editingLogId) {
        // ── EDIT REJIMI: mavjud hujjatni yangilash ──
        await updateDocumentNonBlocking(
          doc(db, "auditLogs", editingLogId),
          {
            ...auditPayload,
            updatedAt: new Date().toISOString(),
          }
        );
      } else {
        // ── YANGI REJIM: yangi hujjat yaratish ──
        await addDocumentNonBlocking(collection(db, "auditLogs"), {
          ...auditPayload,
          createdAt: new Date().toISOString(),
        });
      }
 
      // ── MUHIM: Inventory stock-larini yangilash ──
      // Bu qadamsiz inventarizatsiya natijasi skadga ta'sir qilmaydi!
      for (const [productId, actualCount] of Object.entries(auditData)) {
        const existingInv = inventory?.find(
          (i) => i.warehouseId === selectedWarehouseId && i.productId === productId
        );
 
        if (existingInv) {
          // Mavjud inventory hujjatini yangilash
          await updateDocumentNonBlocking(
            doc(db, "inventory", existingInv.id),
            { stock: actualCount }
          );
        } else {
          // Inventory hujjati yo'q bo'lsa — yangi yaratish
          await addDocumentNonBlocking(collection(db, "inventory"), {
            warehouseId: selectedWarehouseId,
            productId,
            stock: actualCount,
          });
        }
      }
 
      toast({
        title: formMode === "edit" ? "Yangilandi ✓" : "Muvaffaqiyatli ✓",
        description:
          formMode === "edit"
            ? `${auditNumber} inventarizatsiyasi yangilandi.`
            : `${auditNumber} inventarizatsiyasi yakunlandi.`,
      });
 
      // Formani tozalab ro'yxatga qaytish
      resetForm();
      setView("list");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Saqlashda muammo bo'ldi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
 
  // ── Form reset ──
  const resetForm = () => {
    setAuditData({});
    setAuditNumber(generateAuditNumber());
    setAuditDate(new Date().toISOString().slice(0, 16));
    setFormMode("new");
    setEditingLogId(null);
    setSelectedWarehouseId(assignedWarehouseId || "");
    setFormSearch("");
  };
 
  // ── Hujjatni o'chirish (soft delete) ──
  const handleDelete = async (logId: string) => {
    if (!db) return;
    await updateDocumentNonBlocking(doc(db, "auditLogs", logId), {
      status: "deleted",
    });
    setSelectedLogId(null);
    toast({ title: "O'chirildi", description: "Hujjat o'chirilgan deb belgilandi." });
  };
 
  // ── Nusxa ko'chirish ──
  const handleCopy = (log: AuditLog) => {
    const newAuditData: Record<string, number> = {};
    log.items.forEach((i) => {
      newAuditData[i.productId] = i.actualCount;
    });
    setSelectedWarehouseId(log.warehouseId);
    setAuditData(newAuditData);
    setAuditNumber(generateAuditNumber());
    setAuditDate(new Date().toISOString().slice(0, 16));
    setFormMode("new");
    setEditingLogId(null);
    setView("form");
    toast({ title: "Nusxa", description: "Hujjat nusxasi yaratildi. Tahrirlang va yakunlang." });
  };
 
  // ── Hujjatni tahrirlash uchun ochish ──
  const handleEditLog = (log: AuditLog) => {
    const existingAuditData: Record<string, number> = {};
    log.items.forEach((i) => {
      existingAuditData[i.productId] = i.actualCount;
    });
    setSelectedWarehouseId(log.warehouseId);
    setAuditData(existingAuditData);
    setAuditNumber(log.auditNumber);
    setAuditDate(log.auditDate);
    setFormMode("edit");
    setEditingLogId(log.id);
    setFormSearch("");
    setView("form");
    toast({ title: "Tahrirlash rejimi", description: `${log.auditNumber} tahrirlash uchun ochildi.` });
  };
 
  // ── Sort toggle ──
  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortCol(col); setSortDir(-1); }
  };
 
  // ── Statistika ──
  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const completed = filteredLogs.filter((l) => l.status === "completed").length;
    const surplusTotal = filteredLogs.reduce((a, l) => a + (l.surplusSum ?? 0), 0);
    const deficitTotal = filteredLogs.reduce((a, l) => a + (l.deficitSum ?? 0), 0);
    return { total, completed, surplusTotal, deficitTotal };
  }, [filteredLogs]);
 
  if (isUserLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );
 
  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="flex min-h-screen bg-[#f4f6f9]">
      <OmniSidebar />
 
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ── TOP NAV ── */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 flex-wrap">
          {view === "form" && (
            <button
              onClick={() => { resetForm(); setView("list"); }}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mr-2"
            >
              <ArrowLeft className="w-4 h-4" /> Orqaga
            </button>
          )}
          <ClipboardCheck className="w-5 h-5 text-blue-600" />
          <h1 className="text-base font-semibold text-slate-800">
            {view === "list"
              ? "Inventarizatsiya"
              : formMode === "edit"
              ? `Tahrirlash: №${auditNumber}`
              : `Inventarizatsiya №${auditNumber}`}
          </h1>
 
          {/* Edit rejimi badge */}
          {view === "form" && formMode === "edit" && (
            <Badge className="bg-amber-50 text-amber-600 border border-amber-200 ml-1">
              <Edit2 className="w-3 h-3 mr-1" /> Tahrirlash rejimi
            </Badge>
          )}
 
          {view === "list" && (
            <>
              <Badge className="bg-blue-50 text-blue-600 border border-blue-100 ml-1">
                <Barcode className="w-3 h-3 mr-1" /> Skaner tayyor
              </Badge>
 
              <div className="flex-1" />
 
              <Button
                size="sm"
                onClick={() => {
                  resetForm();
                  setView("form");
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
              >
                <Plus className="w-4 h-4" /> Yaratish
              </Button>
 
              {selectedLog && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(selectedLog)}
                    className="gap-1"
                  >
                    <Copy className="w-4 h-4" /> Nusxa
                  </Button>
                  {/* YANGI: Tahrirlash tugmasi */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditLog(selectedLog)}
                    className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                  >
                    <Edit2 className="w-4 h-4" /> Tahrirlash
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(selectedLog.id)}
                    className="gap-1 text-rose-500 border-rose-200 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" /> O'chirish
                  </Button>
                </>
              )}
 
              <Button size="sm" variant="outline" className="gap-1">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </>
          )}
 
          {view === "form" && (
            <>
              <div className="flex-1" />
              <Badge
                variant="outline"
                className="text-slate-500 font-mono text-xs"
              >
                {auditDate?.slice(0, 10)}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { resetForm(); setView("list"); }}
              >
                Bekor qilish
              </Button>
              <Button
                size="sm"
                disabled={isSubmitting || Object.keys(auditData).length === 0}
                onClick={handleSubmitAudit}
                className={cn(
                  "text-white gap-1",
                  formMode === "edit"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : formMode === "edit" ? (
                  <Edit2 className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {formMode === "edit" ? "Yangilash" : "O'tkazish"}
              </Button>
            </>
          )}
        </div>
 
        {/* ════════════════ RO'YXAT VIEW ════════════════ */}
        {view === "list" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filtr toolbar */}
            <div className="bg-white border-b border-slate-100 px-6 py-2 flex items-center gap-3 flex-wrap text-sm">
              <span className="text-slate-500 text-xs">Davr:</span>
              <select
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"
                onChange={(e) => {
                  const y = new Date().getFullYear();
                  const m = String(new Date().getMonth() + 1).padStart(2, "0");
                  if (e.target.value === "year") {
                    setPeriodFrom(`${y}-01-01`);
                    setPeriodTo(`${y}-12-31`);
                  } else if (e.target.value === "month") {
                    setPeriodFrom(`${y}-${m}-01`);
                    setPeriodTo(`${y}-${m}-31`);
                  }
                }}
              >
                <option value="year">Joriy yil</option>
                <option value="month">Joriy oy</option>
                <option value="custom">Boshqa</option>
              </select>
              <input
                type="date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"
              />
              <span className="text-slate-400 text-xs">—</span>
              <input
                type="date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"
              />
              <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                  className="rounded"
                />
                O'chirilganlarni ko'rsatish
              </label>
              <div className="flex-1" />
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border border-slate-200 rounded-lg pl-7 pr-3 py-1 text-xs bg-white w-44 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>
 
            {/* Status filter chips */}
            <div className="bg-white border-b border-slate-100 px-6 py-2 flex items-center gap-2 flex-wrap">
              {(
                [
                  { key: "all", label: "Barchasi" },
                  { key: "completed", label: "O'tkazilgan" },
                  { key: "draft", label: "Qoralama" },
                  { key: "surplus", label: "Ortiqcha bor" },
                  { key: "deficit", label: "Kamomad bor" },
                ] as { key: FilterType; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterType(key)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs border transition-colors",
                    filterType === key
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {label}
                </button>
              ))}
 
              <div className="flex-1" />
              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-800 inline-block" />
                  O'tkazilgan
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  O'tkazilmagan
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                  O'chirilgan
                </span>
              </div>
            </div>
 
            {/* Statistika kartalar */}
            <div className="px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Jami hujjat", value: stats.total, color: "text-slate-700" },
                { label: "O'tkazilgan", value: stats.completed, color: "text-emerald-600" },
                { label: "Ortiqcha (so'm)", value: formatNum(stats.surplusTotal), color: "text-emerald-600" },
                { label: "Kamomad (so'm)", value: formatNum(stats.deficitTotal), color: "text-rose-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
                  <p className="text-[11px] text-slate-400 mb-1">{label}</p>
                  <p className={cn("text-lg font-semibold", color)}>{value}</p>
                </div>
              ))}
            </div>
 
            {/* Asosiy jadval */}
            <div className="flex-1 overflow-auto px-6 pb-6">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="w-8 px-3 py-2">
                        <input type="checkbox" className="rounded" />
                      </th>
                      <th
                        className="px-3 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-600 w-28"
                        onClick={() => toggleSort("date")}
                      >
                        Sana{" "}
                        {sortCol === "date" ? (
                          sortDir === -1 ? <ChevronDown className="inline w-3 h-3" /> : <ChevronUp className="inline w-3 h-3" />
                        ) : null}
                      </th>
                      <th
                        className="px-3 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-600 w-28"
                        onClick={() => toggleSort("num")}
                      >
                        №{" "}
                        {sortCol === "num" ? (
                          sortDir === -1 ? <ChevronDown className="inline w-3 h-3" /> : <ChevronUp className="inline w-3 h-3" />
                        ) : null}
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        Sklad
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        Tovarlar
                      </th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-20">
                        Holat
                      </th>
                      <th
                        className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-24 cursor-pointer hover:text-slate-600"
                        onClick={() => toggleSort("surplus")}
                      >
                        Ortiqcha{" "}
                        {sortCol === "surplus" ? (
                          sortDir === -1 ? <ChevronDown className="inline w-3 h-3" /> : <ChevronUp className="inline w-3 h-3" />
                        ) : null}
                      </th>
                      <th
                        className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-24 cursor-pointer hover:text-slate-600"
                        onClick={() => toggleSort("deficit")}
                      >
                        Kamomad{" "}
                        {sortCol === "deficit" ? (
                          sortDir === -1 ? <ChevronDown className="inline w-3 h-3" /> : <ChevronUp className="inline w-3 h-3" />
                        ) : null}
                      </th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-28">
                        Ortiqcha ∑
                      </th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-28">
                        Kamomad ∑
                      </th>
                      {/* YANGI: Amallar ustuni */}
                      <th className="px-3 py-2 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-20">
                        Amallar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {logsLoading ? (
                      <tr>
                        <td colSpan={11} className="text-center py-12 text-slate-400">
                          <Loader2 className="animate-spin inline w-5 h-5 mr-2" />
                          Yuklanmoqda...
                        </td>
                      </tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-12 text-slate-400 text-sm">
                          Hujjatlar topilmadi
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        const isDeleted = log.status === "deleted";
                        const isCompleted = log.status === "completed";
                        const isSelected = selectedLogId === log.id;
 
                        return (
                          <tr
                            key={log.id}
                            onClick={() => setSelectedLogId(isSelected ? null : log.id)}
                            className={cn(
                              "cursor-pointer transition-colors hover:bg-slate-50",
                              isSelected && "bg-blue-50 hover:bg-blue-50",
                              isDeleted && "opacity-50"
                            )}
                          >
                            <td className="px-3 py-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="rounded"
                              />
                            </td>
                            <td className={cn("px-3 py-2.5 text-xs", isDeleted && "line-through text-slate-400", !isDeleted && "text-slate-600")}>
                              {log.auditDate?.slice(0, 10)}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={cn(
                                "text-xs font-mono font-semibold px-2 py-0.5 rounded",
                                isDeleted ? "text-rose-400 line-through" : isCompleted ? "text-slate-800" : "text-blue-600"
                              )}>
                                {log.auditNumber}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-600 truncate max-w-[120px]">
                              {log.warehouseName}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-500 truncate max-w-[160px]">
                              {log.items?.slice(0, 2).map((i) => i.productName).join(", ")}
                              {(log.items?.length ?? 0) > 2 && ` +${log.items.length - 2} ta`}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={cn(
                                "text-[11px] px-2 py-0.5 rounded-full font-medium",
                                isDeleted ? "bg-rose-50 text-rose-500" : isCompleted ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-600"
                              )}>
                                {isDeleted ? "O'chirilgan" : isCompleted ? "O'tkazilgan" : "Qoralama"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs font-medium text-emerald-600">
                              {(log.totalSurplus ?? 0) > 0 ? `+${formatNum(log.totalSurplus)}` : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs font-medium text-rose-600">
                              {(log.totalDeficit ?? 0) > 0 ? `−${formatNum(log.totalDeficit)}` : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs text-emerald-700">
                              {(log.surplusSum ?? 0) > 0 ? formatNum(log.surplusSum) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs text-rose-700">
                              {(log.deficitSum ?? 0) > 0 ? formatNum(log.deficitSum) : "—"}
                            </td>
                            {/* Inline amallar tugmalari */}
                            <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              {!isDeleted && (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleEditLog(log)}
                                    className="p-1 rounded hover:bg-amber-100 text-amber-500 transition-colors"
                                    title="Tahrirlash"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(log.id)}
                                    className="p-1 rounded hover:bg-rose-100 text-rose-400 transition-colors"
                                    title="O'chirish"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
 
                {/* Footer jami */}
                <div className="border-t border-slate-100 px-4 py-2 flex items-center gap-6 text-xs text-slate-500 bg-slate-50">
                  <span>Jami: <strong className="text-slate-700">{filteredLogs.length}</strong> ta</span>
                  <span>Ortiqcha: <strong className="text-emerald-600">{formatNum(stats.surplusTotal)}</strong> so'm</span>
                  <span>Kamomad: <strong className="text-rose-600">{formatNum(stats.deficitTotal)}</strong> so'm</span>
                </div>
              </div>
 
              {/* Tanlangan hujjat tafsiloti */}
              <AnimatePresence>
                {selectedLog && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden"
                  >
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">
                        {selectedLog.auditNumber} — Tafsilot
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500">{selectedLog.warehouseName}</span>
                        <span className="text-slate-400">{selectedLog.auditDate?.slice(0, 10)}</span>
                        {selectedLog.updatedAt && (
                          <span className="text-amber-500 text-[10px]">
                            (yangilangan: {selectedLog.updatedAt.slice(0, 10)})
                          </span>
                        )}
                        <button
                          onClick={() => handleEditLog(selectedLog)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors text-xs font-medium"
                        >
                          <Edit2 className="w-3 h-3" /> Tahrirlash
                        </button>
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-[11px] text-slate-400 uppercase tracking-wide">
                          <th className="px-4 py-2 text-left">Mahsulot</th>
                          <th className="px-4 py-2 text-right">Kitobiy</th>
                          <th className="px-4 py-2 text-right">Haqiqiy</th>
                          <th className="px-4 py-2 text-right">Farq</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selectedLog.items?.map((item) => (
                          <tr key={item.productId} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-slate-700">{item.productName}</td>
                            <td className="px-4 py-2 text-right text-slate-500">{item.bookStock}</td>
                            <td className="px-4 py-2 text-right text-slate-700 font-medium">{item.actualCount}</td>
                            <td className="px-4 py-2 text-right">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full font-semibold",
                                item.discrepancy === 0 ? "bg-slate-100 text-slate-400"
                                  : item.discrepancy > 0 ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              )}>
                                {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
 
        {/* ════════════════ FORMA VIEW ════════════════ */}
        {view === "form" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Forma header */}
            <div className="bg-white border-b border-slate-100 px-6 py-3 flex flex-wrap items-end gap-4">
              {/* Edit rejimi xabar */}
              {formMode === "edit" && (
                <div className="w-full mb-1 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  <Edit2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <strong>{auditNumber}</strong> raqamli inventarizatsiyani tahrirlayapsiz.
                    O'zgarishlar saqlanganidan so'ng sklad qoldiqlari ham yangilanadi.
                  </span>
                </div>
              )}
 
              {/* Sklad tanlash */}
              <div>
                <Label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  Sklad
                </Label>
                <Select
                  value={selectedWarehouseId}
                  onValueChange={setSelectedWarehouseId}
                  disabled={formMode === "edit"} // Edit rejimida sklad o'zgarmaydi
                >
                  <SelectTrigger className="w-52 h-9 text-sm border-slate-200">
                    <SelectValue placeholder="Omborni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
 
              {/* Sana */}
              <div>
                <Label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  Sana
                </Label>
                <input
                  type="datetime-local"
                  value={auditDate}
                  onChange={(e) => setAuditDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 h-9 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
 
              {/* Statistika */}
              <div className="flex items-center gap-4 ml-4">
                <div className="text-center">
                  <p className="text-[11px] text-slate-400">Kiritilgan</p>
                  <p className="text-base font-semibold text-slate-700">
                    {Object.keys(auditData).length} ta
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-slate-400">Ortiqcha</p>
                  <p className="text-base font-semibold text-emerald-600">
                    +{filteredProducts.filter(
                      (p) => auditData[p.id] !== undefined && auditData[p.id] > p.warehouseStock
                    ).length}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-slate-400">Kamomad</p>
                  <p className="text-base font-semibold text-rose-600">
                    −{filteredProducts.filter(
                      (p) => auditData[p.id] !== undefined && auditData[p.id] < p.warehouseStock
                    ).length}
                  </p>
                </div>
              </div>
            </div>
 
            {/* Qidiruv va filtrlar */}
            <div className="bg-white border-b border-slate-100 px-6 py-2 flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Mahsulot nomi, SKU, shtrix-kod..."
                  value={formSearch}
                  onChange={(e) => setFormSearch(e.target.value)}
                  className="border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm bg-white w-72 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <button
                onClick={() => setShowZeroOnly(!showZeroOnly)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs border transition-colors flex items-center gap-1",
                  showZeroOnly
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200"
                )}
              >
                <Filter className="w-3.5 h-3.5" /> Faqat nollar
              </button>
              <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-xs">
                <Barcode className="w-3 h-3 mr-1" /> Skaner aktiv
              </Badge>
            </div>
 
            {/* Mahsulotlar jadvali */}
            <div className="flex-1 overflow-auto px-6 py-4">
              {!selectedWarehouseId ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                  <Warehouse className="w-12 h-12 opacity-30" />
                  <p className="text-sm">Avval omborni tanlang</p>
                </div>
              ) : productsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="animate-spin w-6 h-6 text-blue-500" />
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                          Mahsulot
                        </th>
                        <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-28">
                          Kitobiy
                        </th>
                        <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-32">
                          Haqiqiy (fakt)
                        </th>
                        <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-28">
                          Farq
                        </th>
                        <th className="px-4 py-3 w-12" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-10 text-slate-400 text-sm">
                            Mahsulotlar topilmadi
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p: any) => {
                          const actual = auditData[p.id] ?? p.warehouseStock;
                          const diff = actual - p.warehouseStock;
                          const hasInput = auditData[p.id] !== undefined;
 
                          return (
                            <tr
                              key={p.id}
                              className={cn(
                                "transition-colors hover:bg-slate-50/80",
                                hasInput && diff > 0 && "bg-emerald-50/40",
                                hasInput && diff < 0 && "bg-rose-50/40"
                              )}
                            >
                              <td className="px-4 py-3">
                                <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  {p.barcode ?? "Shtrix-kod yo'q"}
                                  {p.sku && <span className="ml-2 text-slate-300">{p.sku}</span>}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-center font-medium text-slate-500">
                                {p.warehouseStock}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  className="w-24 h-8 text-center text-sm font-semibold rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white mx-auto block"
                                  value={auditData[p.id] !== undefined ? auditData[p.id] : ""}
                                  placeholder={String(p.warehouseStock)}
                                  onChange={(e) => {
                                    const num = parseFloat(e.target.value);
                                    setAuditData((prev) => ({
                                      ...prev,
                                      [p.id]: isNaN(num) ? 0 : num,
                                    }));
                                  }}
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                {hasInput ? (
                                  <span className={cn(
                                    "inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                                    diff === 0 ? "bg-slate-100 text-slate-400"
                                      : diff > 0 ? "bg-emerald-100 text-emerald-700"
                                      : "bg-rose-100 text-rose-700"
                                  )}>
                                    {diff > 0 ? <TrendingUp className="w-3 h-3" /> : diff < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                    {diff > 0 ? `+${diff}` : diff}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {hasInput && (
                                  <button
                                    onClick={() => {
                                      const d = { ...auditData };
                                      delete d[p.id];
                                      setAuditData(d);
                                    }}
                                    className="text-slate-300 hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
 
                  {/* Forma footer */}
                  <div className="border-t border-slate-100 px-5 py-3 flex items-center gap-6 bg-slate-50 text-xs text-slate-500">
                    <span>
                      Jami mahsulot: <strong className="text-slate-700">{filteredProducts.length}</strong>
                    </span>
                    <span>
                      Kiritildi: <strong className="text-blue-600">{Object.keys(auditData).length}</strong>
                    </span>
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      disabled={isSubmitting || Object.keys(auditData).length === 0}
                      onClick={handleSubmitAudit}
                      className={cn(
                        "text-white gap-1",
                        formMode === "edit"
                          ? "bg-amber-500 hover:bg-amber-600"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      )}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : formMode === "edit" ? (
                        <Edit2 className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {formMode === "edit" ? "Yangilash (saqlash)" : "O'tkazish (yakunlash)"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
