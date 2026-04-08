"use client";
 
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  History, Search, Trash2, ArrowDownToLine, ArrowUpFromLine,
  Loader2, Calendar, Package, Warehouse, User, Filter,
  TrendingUp, TrendingDown, BarChart2, Clock, ChevronDown,
  FileText, ShieldAlert, RefreshCw,
} from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, deleteDoc, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { isWithinInterval, startOfDay, subDays, startOfWeek, startOfMonth } from "date-fns";
 
// ─── Tiplar ───────────────────────────────────────────────────────
 
type FilterType  = "all" | "StockIn" | "StockOut";
type FilterPeriod = "all" | "today" | "week" | "month" | "3days";
 
// ─── Yordamchilar ─────────────────────────────────────────────────
 
const parseDate = (val: unknown): Date => {
  if (!val) return new Date(0);
  if (val instanceof Timestamp) return val.toDate();
  if (typeof val === "string")  return new Date(val);
  if (typeof val === "object" && val !== null && "seconds" in val)
    return new Date((val as { seconds: number }).seconds * 1000);
  return new Date(val as string | number);
};
 
const formatDate = (val: unknown) => {
  try {
    return parseDate(val).toLocaleString("uz-UZ", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return String(val); }
};
 
const fmtMoney = (val: number): string => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} mln`;
  if (val >= 1_000)     return `${(val / 1_000).toFixed(0)} ming`;
  return Math.floor(val).toLocaleString("uz-UZ");
};
 
// ─── ASOSIY KOMPONENT ─────────────────────────────────────────────
 
export default function HistoryPage() {
  const { t }      = useLanguage();
  const { toast }  = useToast();
  const db         = useFirestore();
  const { role, user } = useUser();
 
  // ── Ruxsat: FAQAT Super Admin o'chira oladi ──
  const isSuperAdmin = role === "Super Admin";
 
  // ── Holat ──
  const [search, setSearch]           = useState("");
  const [filterType, setFilterType]   = useState<FilterType>("all");
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("all");
  const [deleteId, setDeleteId]       = useState<string | null>(null);
  const [deleteName, setDeleteName]   = useState<string>("");
  const [deleting, setDeleting]       = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage]               = useState(1);
  const PER_PAGE = 20;
 
  const deleteIdRef = useRef<string | null>(null);
 
  // ── Firebase ──
  const movementsQuery = useMemoFirebase(() => db ? collection(db, "stockMovements") : null, [db]);
  const { data: movements, isLoading: loading } = useCollection(movementsQuery);
 
  // ── Vaqt filtri ──
  const periodInterval = useMemo(() => {
    const now = new Date();
    switch (filterPeriod) {
      case "today":  return { start: startOfDay(now), end: now };
      case "3days":  return { start: startOfDay(subDays(now, 3)), end: now };
      case "week":   return { start: startOfWeek(now), end: now };
      case "month":  return { start: startOfMonth(now), end: now };
      default:       return null;
    }
  }, [filterPeriod]);
 
  // ── Filtrlangan + saralangan ──
  const filtered = useMemo(() => {
    if (!movements) return [];
    let list = [...movements];
 
    // Tur filtri
    if (filterType !== "all") list = list.filter(m => m.movementType === filterType);
 
    // Vaqt filtri
    if (periodInterval) {
      list = list.filter(m => {
        try { return isWithinInterval(parseDate(m.movementDate), periodInterval); }
        catch { return false; }
      });
    }
 
    // Qidiruv
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.productName?.toLowerCase().includes(q) ||
        m.warehouseName?.toLowerCase().includes(q) ||
        m.responsibleUserName?.toLowerCase().includes(q) ||
        m.dnNumber?.toLowerCase().includes(q) ||
        m.orderNumber?.toLowerCase().includes(q)
      );
    }
 
    // Sana bo'yicha tartiblash (yangi avval)
    return list.sort((a, b) =>
      parseDate(b.movementDate).getTime() - parseDate(a.movementDate).getTime()
    );
  }, [movements, filterType, periodInterval, search]);
 
  // ── Sahifalash ──
  const totalPages  = Math.ceil(filtered.length / PER_PAGE);
  const paginated   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
 
  // ── Statistika ──
  const stats = useMemo(() => {
    if (!movements) return { total: 0, stockIn: 0, stockOut: 0, today: 0, totalInValue: 0, totalOutValue: 0 };
    const today = new Date().toDateString();
    let totalInValue = 0; let totalOutValue = 0;
    movements.forEach(m => {
      const qty = Math.abs(m.quantityChange || 0);
      const price = m.unitPrice || 0;
      if (m.movementType === "StockIn")  totalInValue  += qty * price;
      if (m.movementType === "StockOut") totalOutValue += qty * price;
    });
    return {
      total:        movements.length,
      stockIn:      movements.filter(m => m.movementType === "StockIn").length,
      stockOut:     movements.filter(m => m.movementType === "StockOut").length,
      today:        movements.filter(m => parseDate(m.movementDate).toDateString() === today).length,
      totalInValue,
      totalOutValue,
    };
  }, [movements]);
 
  // ── Top mahsulotlar (eng ko'p harakat) ──
  const topProducts = useMemo(() => {
    if (!movements) return [];
    const map: Record<string, { name: string; count: number; revenue: number }> = {};
    movements.forEach(m => {
      if (!m.productName) return;
      if (!map[m.productName]) map[m.productName] = { name: m.productName, count: 0, revenue: 0 };
      map[m.productName].count++;
      if (m.movementType === "StockOut")
        map[m.productName].revenue += Math.abs(m.quantityChange || 0) * (m.unitPrice || 0);
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [movements]);
 
  // ── O'chirish ──
  const openDeleteDialog = (id: string, name: string) => {
    deleteIdRef.current = id;
    setDeleteId(id);
    setDeleteName(name);
  };
 
  const closeDeleteDialog = () => {
    if (deleting) return;
    deleteIdRef.current = null;
    setDeleteId(null);
    setDeleteName("");
  };
 
  const handleDelete = async () => {
    const idToDelete = deleteIdRef.current;
    if (!idToDelete || !db) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "stockMovements", idToDelete));
      toast({ title: "O'chirildi ✓", description: `"${deleteName}" tarixi o'chirildi.` });
      deleteIdRef.current = null;
      setDeleteId(null);
      setDeleteName("");
    } catch (err: unknown) {
      const e = err as { code?: string };
      const msg =
        e?.code === "permission-denied" ? "Sizda o'chirish uchun ruxsat yo'q." :
        e?.code === "not-found"         ? "Yozuv topilmadi yoki allaqachon o'chirilgan." :
        "O'chirishda noma'lum xatolik yuz berdi.";
      toast({ variant: "destructive", title: "Xatolik", description: msg });
    } finally {
      setDeleting(false);
    }
  };
 
  // ─── RENDER ───────────────────────────────────────────────────
 
  const PERIOD_LABELS: Record<FilterPeriod, string> = {
    all: "Barchasi", today: "Bugun", "3days": "3 kun", week: "Bu hafta", month: "Bu oy",
  };
 
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <OmniSidebar />
      <main className="flex-1 overflow-y-auto">
 
        {/* ── TOP BAR ── */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Harakat Tarixi
            </h1>
            <p className="text-[11px] text-slate-400">Barcha kirim va chiqim harakatlari</p>
          </div>
 
          <div className="flex-1" />
 
          {/* Qidiruv */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Qidirish..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9 w-52 text-sm rounded-xl border-slate-200"
            />
          </div>
 
          <Button
            variant="outline" size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("gap-1.5 text-xs h-9 rounded-xl border-slate-200", showFilters && "bg-indigo-50 border-indigo-200 text-indigo-700")}
          >
            <Filter className="w-3.5 h-3.5" /> Filtr
          </Button>
 
          {/* Ruxsat ko'rsatkichi */}
          {!isSuperAdmin && (
            <div className="flex items-center gap-1.5 text-[11px] bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              Faqat ko&apos;rish huquqi
            </div>
          )}
          {isSuperAdmin && (
            <div className="flex items-center gap-1.5 text-[11px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-xl font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              Super Admin — o&apos;chirish mumkin
            </div>
          )}
        </div>
 
        <div className="px-6 py-5 space-y-5">
 
          {/* ── FILTRLAR ── */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="border border-slate-200 shadow-none">
                  <CardContent className="p-4 flex flex-wrap gap-5">
                    {/* Tur */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tur</p>
                      <div className="flex gap-1.5">
                        {(["all", "StockIn", "StockOut"] as FilterType[]).map(t => (
                          <button
                            key={t}
                            onClick={() => { setFilterType(t); setPage(1); }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                              filterType === t
                                ? t === "StockIn"  ? "bg-emerald-600 text-white border-emerald-600"
                                : t === "StockOut" ? "bg-rose-600 text-white border-rose-600"
                                : "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                            )}
                          >
                            {t === "all" ? "Barchasi" : t === "StockIn" ? "Kirim" : "Chiqim"}
                          </button>
                        ))}
                      </div>
                    </div>
 
                    {/* Davr */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Davr</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {(Object.keys(PERIOD_LABELS) as FilterPeriod[]).map(p => (
                          <button
                            key={p}
                            onClick={() => { setFilterPeriod(p); setPage(1); }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                              filterPeriod === p
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                            )}
                          >
                            {PERIOD_LABELS[p]}
                          </button>
                        ))}
                      </div>
                    </div>
 
                    {(filterType !== "all" || filterPeriod !== "all" || search) && (
                      <div className="flex items-end">
                        <button
                          onClick={() => { setFilterType("all"); setFilterPeriod("all"); setSearch(""); setPage(1); }}
                          className="flex items-center gap-1 text-xs text-rose-500 font-bold hover:underline"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Tozalash
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
 
          {/* ── KPI KARTOCHKALAR ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Jami harakat",  value: stats.total,    color: "text-slate-800",   bg: "bg-slate-100",   icon: <BarChart2 className="w-4 h-4" /> },
              { label: "Kirimlar",      value: stats.stockIn,  color: "text-emerald-700", bg: "bg-emerald-100", icon: <ArrowDownToLine className="w-4 h-4" /> },
              { label: "Chiqimlar",     value: stats.stockOut, color: "text-rose-700",    bg: "bg-rose-100",    icon: <ArrowUpFromLine className="w-4 h-4" /> },
              { label: "Bugun",         value: stats.today,    color: "text-indigo-700",  bg: "bg-indigo-100",  icon: <Clock className="w-4 h-4" /> },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card className="border border-slate-200 shadow-none">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", s.bg, s.color)}>{s.icon}</div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
                      <p className={cn("text-2xl font-black", s.color)}>{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
 
          {/* ── QIYMAT STATISTIKASI ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="border border-slate-200 shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jami kirim qiymati</p>
                <p className="text-xl font-black text-emerald-700">{fmtMoney(stats.totalInValue)} so&apos;m</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jami chiqim qiymati</p>
                <p className="text-xl font-black text-rose-700">{fmtMoney(stats.totalOutValue)} so&apos;m</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Natija</p>
                <p className={cn("text-xl font-black", stats.totalInValue - stats.totalOutValue >= 0 ? "text-indigo-700" : "text-rose-700")}>
                  {stats.totalInValue - stats.totalOutValue >= 0 ? "+" : ""}
                  {fmtMoney(stats.totalInValue - stats.totalOutValue)} so&apos;m
                </p>
              </CardContent>
            </Card>
          </div>
 
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
 
            {/* ── JADVAL ── */}
            <div className="lg:col-span-2">
              <Card className="border border-slate-200 shadow-none overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <History className="w-12 h-12 mb-3 opacity-20" />
                    <p className="font-bold text-sm">Hech narsa topilmadi</p>
                    <p className="text-xs mt-1">Filtr yoki qidiruvni o&apos;zgartiring</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tur</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Mahsulot</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Miqdor</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Ombor</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Mas&apos;ul</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Sana</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Hujjat</th>
                            {/* O'chirish ustuni — FAQAT Super Admin */}
                            {isSuperAdmin && <th className="px-4 py-3 w-10" />}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {paginated.map((m, idx) => {
                            const isIn = m.movementType === "StockIn";
                            return (
                              <motion.tr
                                key={m.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.02 }}
                                className="hover:bg-slate-50/70 transition-colors group"
                              >
                                <td className="px-4 py-2.5">
                                  <span className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase",
                                    isIn ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                  )}>
                                    {isIn ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                                    {isIn ? "Kirim" : "Chiqim"}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <Package className="w-3 h-3 text-slate-300 shrink-0" />
                                    <span className="font-semibold text-slate-800 text-xs truncate max-w-[120px]">{m.productName}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={cn("font-black text-xs", isIn ? "text-emerald-600" : "text-rose-600")}>
                                    {isIn ? "+" : "-"}{Math.abs(m.quantityChange)} {m.unit}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <Warehouse className="w-3 h-3 text-slate-300 shrink-0" />
                                    <span className="text-xs text-slate-500 truncate max-w-[100px]">{m.warehouseName}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <User className="w-3 h-3 text-slate-300 shrink-0" />
                                    <span className="text-xs text-slate-500 truncate max-w-[90px]">{m.responsibleUserName}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-300 shrink-0" />
                                    <span className="text-[11px] text-slate-500 whitespace-nowrap">{formatDate(m.movementDate)}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className="text-[11px] font-bold text-indigo-600">
                                    {m.dnNumber || m.orderNumber || "—"}
                                  </span>
                                </td>
 
                                {/* O'chirish: FAQAT Super Admin ko'radi */}
                                {isSuperAdmin && (
                                  <td className="px-4 py-2.5">
                                    <Button
                                      variant="ghost" size="icon"
                                      className="h-7 w-7 rounded-lg hover:bg-rose-100 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                                      onClick={() => openDeleteDialog(m.id, m.productName || "?")}
                                      title="O'chirish (Super Admin)"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </td>
                                )}
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
 
                    {/* ── PAGINATSIYA ── */}
                    <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {filtered.length} ta natijadan {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} ko&apos;rsatilmoqda
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline" size="sm"
                          disabled={page === 1}
                          onClick={() => setPage(p => p - 1)}
                          className="h-7 px-2 text-xs rounded-lg border-slate-200"
                        >
                          ←
                        </Button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                          return (
                            <Button
                              key={p}
                              variant={p === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(p)}
                              className={cn(
                                "h-7 w-7 p-0 text-xs rounded-lg",
                                p === page ? "bg-indigo-600 hover:bg-indigo-700 border-indigo-600" : "border-slate-200"
                              )}
                            >
                              {p}
                            </Button>
                          );
                        })}
                        <Button
                          variant="outline" size="sm"
                          disabled={page === totalPages || totalPages === 0}
                          onClick={() => setPage(p => p + 1)}
                          className="h-7 px-2 text-xs rounded-lg border-slate-200"
                        >
                          →
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            </div>
 
            {/* ── YON PANEL: Top mahsulotlar ── */}
            <div className="space-y-4">
              <Card className="border border-slate-200 shadow-none">
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> Eng faol mahsulotlar
                  </p>
                  {topProducts.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Ma&apos;lumot yo&apos;q</p>
                  ) : (
                    <div className="space-y-3">
                      {topProducts.map((p, i) => {
                        const maxCount = topProducts[0]?.count || 1;
                        return (
                          <div key={p.name}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="w-4 text-[10px] font-black text-slate-300">#{i + 1}</span>
                                <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">{p.name}</span>
                              </div>
                              <span className="text-[11px] font-black text-slate-600">{p.count} ta</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-6">
                              <motion.div
                                className="h-full bg-indigo-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(p.count / maxCount) * 100}%` }}
                                transition={{ duration: 0.5, delay: i * 0.08 }}
                              />
                            </div>
                            {p.revenue > 0 && (
                              <p className="text-[10px] text-emerald-600 font-semibold ml-6 mt-0.5">{fmtMoney(p.revenue)} so&apos;m sotuv</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
 
              {/* Ruxsat tushuntirishi */}
              <Card className={cn("border shadow-none", isSuperAdmin ? "border-indigo-200 bg-indigo-50" : "border-amber-200 bg-amber-50")}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className={cn("w-4 h-4 mt-0.5 shrink-0", isSuperAdmin ? "text-indigo-600" : "text-amber-600")} />
                    <div>
                      <p className={cn("text-xs font-bold", isSuperAdmin ? "text-indigo-700" : "text-amber-700")}>
                        {isSuperAdmin ? "Super Admin huquqlari" : "Sizning huquqingiz"}
                      </p>
                      <p className={cn("text-[11px] mt-0.5", isSuperAdmin ? "text-indigo-600" : "text-amber-600")}>
                        {isSuperAdmin
                          ? "Siz barcha harakatlarni o'chira olasiz. Ehtiyotkor bo'ling — bu amal qaytarib bo'lmaydi."
                          : "Siz faqat tarixni KO'RISH huquqiga egasiz. O'chirish uchun Super Admin kerak."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
 
              {/* Hujjat statistikasi */}
              <Card className="border border-slate-200 shadow-none">
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Hujjat statistikasi
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Hujjatli harakatlar</span>
                      <span className="font-bold text-slate-700">
                        {movements?.filter(m => m.dnNumber || m.orderNumber).length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Hujjatsiz harakatlar</span>
                      <span className="font-bold text-rose-600">
                        {movements?.filter(m => !m.dnNumber && !m.orderNumber).length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Filtr natijasi</span>
                      <span className="font-bold text-indigo-600">{filtered.length} ta</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
 
      {/* ── O'CHIRISH DIALOGI — FAQAT Super Admin ── */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) closeDeleteDialog(); }}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-lg font-black text-slate-900">
              O&apos;chirishni tasdiqlang
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500">
              <span className="font-bold text-slate-700">&quot;{deleteName}&quot;</span> bo&apos;yicha harakat yozuvi o&apos;chiriladi.
              Bu amal qaytarib bo&apos;lmaydi!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel
              className="rounded-xl h-10 font-bold border-slate-200"
              disabled={deleting}
            >
              Bekor qilish
            </AlertDialogCancel>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl h-10 bg-rose-600 hover:bg-rose-700 text-white font-black gap-1.5"
            >
              {deleting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Trash2 className="w-4 h-4" />}
              O&apos;chirish
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
