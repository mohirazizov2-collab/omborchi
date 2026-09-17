"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Wand2, Sparkles, Activity, TrendingUp, TrendingDown,
  DollarSign, Table as TableIcon, AlertTriangle, Package,
  BarChart2, ArrowUpRight, ArrowDownRight, RefreshCw,
  ChevronRight, Eye, Boxes, Warehouse, Users2, Receipt,
  Target, Zap, ShieldAlert, CheckCircle2, Clock, Flame,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { analyzeReports, type AnalyzeReportsOutput } from "@/ai/flows/analyze-reports-flow";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  startOfWeek, startOfMonth, startOfQuarter, startOfYear,
  isWithinInterval, subMonths, format, differenceInDays,
} from "date-fns";

// ─── Tiplar ───────────────────────────────────────────────────────

type Period = "weekly" | "monthly" | "quarterly" | "yearly";
type ViewTab = "overview" | "products" | "warehouse" | "staff";

interface KpiCard {
  label: string;
  value: number;
  prev: number;
  icon: React.ReactNode;
  format: "money" | "count" | "percent";
  color: string;
}

interface ProductStat {
  id: string;
  name: string;
  stock: number;
  lowStockThreshold: number;
  salePrice: number;
  costPrice: number;
  totalRevenue: number;
  totalSold: number;
  marginPct: number;
  trend: "up" | "down" | "stable";
  riskLevel: "critical" | "warning" | "ok";
}

// ─── Yordamchi ────────────────────────────────────────────────────

function getStartDate(period: Period, offset = 0): Date {
  const now = new Date();
  if (offset !== 0) {
    // offset=-1 → oldingi davr
    const shifted = new Date(now);
    if (period === "weekly")    shifted.setDate(now.getDate() - 7 * Math.abs(offset));
    if (period === "monthly")   shifted.setMonth(now.getMonth() - Math.abs(offset));
    if (period === "quarterly") shifted.setMonth(now.getMonth() - 3 * Math.abs(offset));
    if (period === "yearly")    shifted.setFullYear(now.getFullYear() - Math.abs(offset));
    return getStartDate(period === "weekly" ? "weekly" : period, 0);
  }
  switch (period) {
    case "weekly":    return startOfWeek(now);
    case "monthly":   return startOfMonth(now);
    case "quarterly": return startOfQuarter(now);
    case "yearly":    return startOfYear(now);
  }
}

function getPrevInterval(period: Period): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case "weekly": {
      const end = startOfWeek(now);
      const start = new Date(end); start.setDate(end.getDate() - 7);
      return { start, end };
    }
    case "monthly": {
      const end = startOfMonth(now);
      const start = startOfMonth(subMonths(now, 1));
      return { start, end };
    }
    case "quarterly": {
      const end = startOfQuarter(now);
      const start = new Date(end); start.setMonth(end.getMonth() - 3);
      return { start, end };
    }
    case "yearly": {
      const end = startOfYear(now);
      const start = new Date(end); start.setFullYear(end.getFullYear() - 1);
      return { start, end };
    }
  }
}

function calcChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function fmtMoney(val: number): string {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}mlrd`;
  if (val >= 1_000_000)     return `${(val / 1_000_000).toFixed(1)}mln`;
  if (val >= 1_000)         return `${(val / 1_000).toFixed(0)}ming`;
  return Math.floor(val).toLocaleString("uz-UZ");
}

function fmtFull(val: number): string {
  return Math.floor(val).toLocaleString("uz-UZ").replace(/,/g, " ");
}

// ─── Mini Sparkline ───────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 80; const h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Gauge (donut) ────────────────────────────────────────────────

function GaugeRing({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const stroke = circ * Math.min(Math.max(pct, 0), 100) / 100;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} stroke="#e2e8f0" strokeWidth="6" fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth="6" fill="none"
        strokeDasharray={circ} strokeDashoffset={circ - stroke} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

// ─── ASOSIY SAHIFA ────────────────────────────────────────────────

export default function ReportsPage() {
  const [mounted, setMounted]           = useState(false);
  const { t }                           = useLanguage();
  const { toast }                       = useToast();
  const db                              = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();
  const router                          = useRouter();

  const [isAiLoading, setIsAiLoading]   = useState(false);
  const [aiResult, setAiResult]         = useState<AnalyzeReportsOutput | null>(null);
  const [period, setPeriod]             = useState<Period>("monthly");
  const [activeTab, setActiveTab]       = useState<ViewTab>("overview");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!authLoading && role === "Omborchi") router.push("/");
  }, [role, authLoading, router]);

  // ── Firebase queries ──
  const productsQuery  = useMemoFirebase(() => (db && user) ? collection(db, "products")  : null, [db, user]);
  const warehousesQuery= useMemoFirebase(() => (db && user) ? collection(db, "warehouses"): null, [db, user]);
  const employeesQuery = useMemoFirebase(() => (db && user) ? collection(db, "employees") : null, [db, user]);
  const expensesQuery  = useMemoFirebase(() => (db && user) ? collection(db, "expenses")  : null, [db, user]);
  const movementsQuery = useMemoFirebase(() =>
    (db && user) ? query(collection(db, "stockMovements"), orderBy("movementDate", "desc")) : null,
  [db, user]);

  const { data: products,  isLoading: productsLoading  } = useCollection(productsQuery);
  const { data: warehouses,isLoading: warehousesLoading } = useCollection(warehousesQuery);
  const { data: employees                               } = useCollection(employeesQuery);
  const { data: operationalExpenses                     } = useCollection(expensesQuery);
  const { data: movements, isLoading: movementsLoading  } = useCollection(movementsQuery);

  const isLoading = productsLoading || warehousesLoading || movementsLoading;

  // ══════════════════════════════════════════════════════════════
  //  MOLIYAVIY HISOB-KITOB (joriy + oldingi davr)
  // ══════════════════════════════════════════════════════════════
  const financials = useMemo(() => {
    const now  = new Date();
    const curr = { start: getStartDate(period), end: now };
    const prev = getPrevInterval(period);

    const sumMovements = (interval: { start: Date; end: Date }, type: string) => {
      let revenue = 0; let cost = 0;
      movements?.forEach(m => {
        if (m.movementType !== type) return;
        const d = new Date(m.movementDate);
        if (!isWithinInterval(d, interval)) return;
        const qty = Math.abs(m.quantityChange || 0);
        revenue += qty * (m.unitPrice   || 0);
        cost    += qty * (m.costPrice   || 0);
      });
      return { revenue, cost };
    };

    const sumExpenses = (interval: { start: Date; end: Date }) => {
      let ops = 0;
      operationalExpenses?.forEach(ex => {
        if (isWithinInterval(new Date(ex.date), interval)) ops += (ex.amount || 0);
      });
      return ops;
    };

    const sumSalary = () => {
      let sal = 0;
      employees?.forEach(e => {
        const m = e.baseSalary || 0;
        sal += period === "weekly" ? m / 4 : period === "quarterly" ? m * 3 : period === "yearly" ? m * 12 : m;
      });
      return sal;
    };

    const cSales    = sumMovements(curr, "StockOut");
    const pSales    = sumMovements(prev, "StockOut");
    const cOps      = sumExpenses(curr);
    const pOps      = sumExpenses(prev);
    const salary    = sumSalary();

    const cRevenue  = cSales.revenue;
    const pRevenue  = pSales.revenue;
    const cCOGS     = cSales.cost;
    const cExpenses = cOps + salary;
    const pExpenses = pOps + salary;
    const cProfit   = cRevenue - cExpenses;
    const pProfit   = pRevenue - pExpenses;
    const cGrossMargin = cRevenue > 0 ? ((cRevenue - cCOGS) / cRevenue * 100) : 0;

    // Kunlik o'rtacha
    const daysInPeriod = period === "weekly" ? 7 : period === "monthly" ? 30 : period === "quarterly" ? 90 : 365;
    const daysSoFar = Math.max(1, differenceInDays(now, curr.start));
    const dailyRevenue = cRevenue / daysSoFar;
    const projectedRevenue = dailyRevenue * daysInPeriod;

    return {
      revenue:     cRevenue,   prevRevenue:  pRevenue,
      expenses:    cExpenses,  prevExpenses: pExpenses,
      profit:      cProfit,    prevProfit:   pProfit,
      grossMargin: cGrossMargin,
      opsExpenses: cOps,
      salary,
      projectedRevenue,
      dailyRevenue,
      revenueChange:  calcChange(cRevenue,  pRevenue),
      expensesChange: calcChange(cExpenses, pExpenses),
      profitChange:   calcChange(cProfit,   pProfit),
    };
  }, [movements, operationalExpenses, employees, period]);

  // ══════════════════════════════════════════════════════════════
  //  MAHSULOT STATISTIKASI
  // ══════════════════════════════════════════════════════════════
  const productStats = useMemo((): ProductStat[] => {
    if (!products || !movements) return [];
    const now  = new Date();
    const curr = { start: getStartDate(period), end: now };

    return products.map(p => {
      let totalRevenue = 0; let totalSold = 0;
      movements.forEach(m => {
        if (m.productId !== p.id || m.movementType !== "StockOut") return;
        if (!isWithinInterval(new Date(m.movementDate), curr)) return;
        totalSold    += Math.abs(m.quantityChange || 0);
        totalRevenue += Math.abs(m.quantityChange || 0) * (m.unitPrice || 0);
      });

      const stock             = p.stock || 0;
      const lowStockThreshold = p.lowStockThreshold || 10;
      const salePrice         = p.salePrice || 0;
      const costPrice         = p.costPrice || 0;
      const marginPct         = salePrice > 0 ? ((salePrice - costPrice) / salePrice * 100) : 0;

      const riskLevel: ProductStat["riskLevel"] =
        stock === 0         ? "critical" :
        stock < lowStockThreshold ? "warning" : "ok";

      const trend: ProductStat["trend"] =
        totalRevenue > 0    ? "up"   :
        stock < lowStockThreshold ? "down" : "stable";

      return {
        id: p.id, name: p.name,
        stock, lowStockThreshold, salePrice, costPrice,
        totalRevenue, totalSold, marginPct, trend, riskLevel,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [products, movements, period]);

  // ══════════════════════════════════════════════════════════════
  //  OMBOR TAHLILI
  // ══════════════════════════════════════════════════════════════
  const warehouseStats = useMemo(() => {
    if (!warehouses || !products) return [];
    return warehouses.map(wh => {
      const whProducts = products.filter(p => p.warehouseId === wh.id);
      const totalValue = whProducts.reduce((s, p) => s + (p.salePrice || 0) * (p.stock || 0), 0);
      const lowStockItems = whProducts.filter(p => (p.stock || 0) < (p.lowStockThreshold || 10)).length;
      const outOfStock    = whProducts.filter(p => (p.stock || 0) === 0).length;
      const capacity      = wh.capacity || 1000;
      const usedCapacity  = whProducts.reduce((s, p) => s + (p.stock || 0), 0);
      const fillPct       = Math.min(100, Math.round((usedCapacity / capacity) * 100));
      return { ...wh, totalValue, lowStockItems, outOfStock, productCount: whProducts.length, fillPct, usedCapacity };
    });
  }, [warehouses, products]);

  // ══════════════════════════════════════════════════════════════
  //  ALERT TIZIMI — "Aqlli ogohlantirish"
  // ══════════════════════════════════════════════════════════════
  const alerts = useMemo(() => {
    const list: { type: "critical" | "warning" | "info"; message: string; icon: React.ReactNode }[] = [];

    const critical = productStats.filter(p => p.riskLevel === "critical");
    const warning  = productStats.filter(p => p.riskLevel === "warning");
    if (critical.length)
      list.push({ type: "critical", icon: <AlertTriangle className="w-4 h-4" />, message: `${critical.length} ta mahsulot TUGAGAN: ${critical.slice(0,3).map(p=>p.name).join(", ")}` });
    if (warning.length)
      list.push({ type: "warning", icon: <ShieldAlert className="w-4 h-4" />, message: `${warning.length} ta mahsulot kam qolgan (chegaradan past)` });

    if (financials.profitChange < -20)
      list.push({ type: "critical", icon: <TrendingDown className="w-4 h-4" />, message: `Foyda oldingi davrga nisbatan ${Math.abs(financials.profitChange)}% ga kamaydi!` });
    if (financials.expenses > financials.revenue)
      list.push({ type: "critical", icon: <DollarSign className="w-4 h-4" />, message: "Xarajatlar daromaddan OSHIB KETDI — zararli holat!" });
    if (financials.grossMargin < 15 && financials.grossMargin > 0)
      list.push({ type: "warning", icon: <Target className="w-4 h-4" />, message: `Umumiy marja juda past: ${financials.grossMargin.toFixed(1)}%` });
    if (financials.projectedRevenue > financials.revenue * 1.2)
      list.push({ type: "info", icon: <Zap className="w-4 h-4" />, message: `Joriy sur'atda oylik prognoz: ${fmtMoney(financials.projectedRevenue)} so'm` });

    return list;
  }, [productStats, financials]);

  // ══════════════════════════════════════════════════════════════
  //  TOP mahsulotlar (eng ko'p sotuv)
  // ══════════════════════════════════════════════════════════════
  const topSelling = useMemo(() =>
    productStats.filter(p => p.totalRevenue > 0).slice(0, 5),
  [productStats]);

  const totalInventoryValue = useMemo(() =>
    products?.reduce((s, p) => s + (p.salePrice || 0) * (p.stock || 0), 0) || 0,
  [products]);

  // ══════════════════════════════════════════════════════════════
  //  AI TAHLIL
  // ══════════════════════════════════════════════════════════════
  const handleAiAnalyze = useCallback(async () => {
    if (!products) return;
    setIsAiLoading(true);
    try {
      const result = await analyzeReports({
        stats: {
          totalValue:     totalInventoryValue,
          warehouseCount: warehouses?.length || 0,
          productCount:   products.length,
          lowStockCount:  productStats.filter(p => p.riskLevel !== "ok").length,
        },
        topProducts: topSelling.map(p => ({ name: p.name, stock: p.stock, price: p.salePrice })),
      });
      setAiResult(result);
    } catch {
      toast({ variant: "destructive", title: "AI Xatolik", description: "Tahlil qilishda xatolik yuz berdi." });
    } finally {
      setIsAiLoading(false);
    }
  }, [products, totalInventoryValue, warehouses, productStats, topSelling, toast]);

  // ══════════════════════════════════════════════════════════════
  //  EXCEL EKSPORT
  // ══════════════════════════════════════════════════════════════
  const exportToExcel = async () => {
    try {
      const XLSXModule = await import("xlsx");
      const XLSX = (XLSXModule as unknown as { default: typeof XLSXModule }).default || XLSXModule;
      const wb = XLSX.utils.book_new();

      // 1. Moliyaviy xulosа
      const finData = [
        ["MOLIYAVIY HISOBOT", ""],
        ["Davr", period],
        ["Sana", format(new Date(), "dd.MM.yyyy HH:mm")],
        [""],
        ["Ko'rsatkich", "Joriy davr", "Oldingi davr", "O'zgarish %"],
        ["Daromad (so'm)",    financials.revenue,     financials.prevRevenue,  `${financials.revenueChange}%`],
        ["Xarajatlar (so'm)", financials.expenses,    financials.prevExpenses, `${financials.expensesChange}%`],
        ["Sof foyda (so'm)",  financials.profit,      financials.prevProfit,   `${financials.profitChange}%`],
        [""],
        ["Operatsion xarajat", financials.opsExpenses, "", ""],
        ["Maosh xarajati",     financials.salary,      "", ""],
        ["Brutto marja (%)",   financials.grossMargin.toFixed(2) + "%", "", ""],
        ["Prognoz (davr oxirigacha)", financials.projectedRevenue, "", ""],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(finData), "Moliya");

      // 2. Mahsulotlar
      const prodData = [
        ["Mahsulot nomi", "Zaxira", "Sotuv narxi", "Tannarx", "Marja %", "Sotuv soni", "Daromad", "Risk"],
        ...productStats.map(p => [
          p.name, p.stock, p.salePrice, p.costPrice,
          p.marginPct.toFixed(1) + "%", p.totalSold,
          p.totalRevenue, p.riskLevel,
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prodData), "Mahsulotlar");

      // 3. Ogohlantirishlar
      const alertData = [["Turi", "Xabar"], ...alerts.map(a => [a.type, a.message])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(alertData), "Ogohlantirishlar");

      XLSX.writeFile(wb, `Hisobot_${period}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast({ title: "Excel muvaffaqiyatli yuklandi ✓" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Excel eksportida xatolik" });
    }
  };

  // ══════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════
  if (!mounted || authLoading)
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const PERIOD_LABELS: Record<Period, string> = {
    weekly: "Haftalik", monthly: "Oylik", quarterly: "Choraklik", yearly: "Yillik",
  };

  const TABS: { key: ViewTab; label: string; icon: React.ReactNode }[] = [
    { key: "overview",   label: "Umumiy ko'rinish", icon: <BarChart2 className="w-4 h-4" /> },
    { key: "products",   label: "Mahsulotlar",       icon: <Package className="w-4 h-4" /> },
    { key: "warehouse",  label: "Omborlar",           icon: <Warehouse className="w-4 h-4" /> },
    { key: "staff",      label: "Xodimlar",           icon: <Users2 className="w-4 h-4" /> },
  ];

  const alertColors = {
    critical: "bg-rose-50 border-rose-200 text-rose-700",
    warning:  "bg-amber-50 border-amber-200 text-amber-700",
    info:     "bg-blue-50 border-blue-200 text-blue-700",
  };

  const changeEl = (pct: number, inverse = false) => {
    const positive = inverse ? pct < 0 : pct > 0;
    return (
      <span className={cn("text-xs font-bold flex items-center gap-0.5", positive ? "text-emerald-600" : pct === 0 ? "text-slate-400" : "text-rose-600")}>
        {pct > 0 ? <ArrowUpRight className="w-3 h-3" /> : pct < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
        {pct > 0 ? "+" : ""}{pct}%
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <OmniSidebar />
      <main className="flex-1 overflow-y-auto">

        {/* ── TOP BAR ── */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900">Hisobotlar va Tahlil</h1>
            <p className="text-[11px] text-slate-400 font-medium">Real-vaqt moliyaviy va ombor ko&apos;rsatkichlari</p>
          </div>

          <div className="flex-1" />

          {/* Davr tanlash */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-0.5">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                  period === p
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-1.5 text-xs h-9 rounded-xl border-slate-200">
            <TableIcon className="w-4 h-4 text-emerald-600" /> Excel
          </Button>

          <Button
            onClick={handleAiAnalyze}
            disabled={isAiLoading || isLoading || !products?.length}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs h-9 rounded-xl font-bold"
          >
            {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            AI Tahlil
          </Button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ── OGOHLANTIRISHLAR ── */}
          <AnimatePresence>
            {alerts.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                {alerts.map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={cn("flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium", alertColors[a.type])}
                  >
                    {a.icon}
                    {a.message}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── KPI KARTOCHKALARI ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Daromad",
                value: financials.revenue,
                prev: financials.prevRevenue,
                change: financials.revenueChange,
                icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
                bg: "bg-emerald-50",
                accent: "text-emerald-700",
                sub: `Prognoz: ${fmtMoney(financials.projectedRevenue)} so'm`,
              },
              {
                label: "Xarajatlar",
                value: financials.expenses,
                prev: financials.prevExpenses,
                change: financials.expensesChange,
                icon: <Receipt className="w-5 h-5 text-rose-500" />,
                bg: "bg-rose-50",
                accent: "text-rose-700",
                sub: `Maosh: ${fmtMoney(financials.salary)} | Ops: ${fmtMoney(financials.opsExpenses)}`,
              },
              {
                label: "Sof foyda",
                value: financials.profit,
                prev: financials.prevProfit,
                change: financials.profitChange,
                icon: <DollarSign className="w-5 h-5 text-indigo-600" />,
                bg: "bg-indigo-50",
                accent: "text-indigo-700",
                sub: `Marja: ${financials.grossMargin.toFixed(1)}%`,
              },
              {
                label: "Zaxira qiymati",
                value: totalInventoryValue,
                prev: 0,
                change: 0,
                icon: <Boxes className="w-5 h-5 text-amber-600" />,
                bg: "bg-amber-50",
                accent: "text-amber-700",
                sub: `${products?.length || 0} xil mahsulot`,
              },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Card className="border border-slate-200 shadow-none hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn("p-2 rounded-lg", kpi.bg)}>{kpi.icon}</div>
                      {kpi.change !== 0 && changeEl(kpi.change, kpi.label === "Xarajatlar")}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
                    <p className={cn("text-2xl font-black tracking-tight", kpi.accent)}>
                      {fmtMoney(kpi.value)} <span className="text-sm font-semibold">so&apos;m</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">{kpi.sub}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* ── TAB NAVIGATSIYA ── */}
          <div className="flex gap-1 border-b border-slate-200">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all -mb-px",
                  activeTab === tab.key
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ══ OVERVIEW ══ */}
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                  {/* Top Sotuvchi mahsulotlar */}
                  <Card className="border border-slate-200 shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" /> TOP-5 Sotuv mahsulotlari
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {topSelling.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">Bu davrda sotuv ma&apos;lumoti yo&apos;q</p>
                      ) : topSelling.map((p, i) => {
                        const maxRev = topSelling[0]?.totalRevenue || 1;
                        const barPct = (p.totalRevenue / maxRev) * 100;
                        return (
                          <div key={p.id} className="flex items-center gap-3">
                            <span className="w-5 text-[11px] font-black text-slate-300">#{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-slate-700 truncate">{p.name}</span>
                                <span className="text-xs font-black text-slate-900 ml-2 shrink-0">{fmtMoney(p.totalRevenue)} so&apos;m</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${barPct}%` }}
                                  transition={{ duration: 0.6, delay: i * 0.08 }}
                                />
                              </div>
                              <div className="flex gap-3 mt-0.5">
                                <span className="text-[10px] text-slate-400">{p.totalSold} dona sotilgan</span>
                                <span className="text-[10px] text-emerald-600">Marja: {p.marginPct.toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Daromad vs Xarajat breakdown */}
                  <Card className="border border-slate-200 shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-500" /> Moliya taqsimoti
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { label: "Daromad",            val: financials.revenue,     total: Math.max(financials.revenue, 1), color: "#10b981" },
                        { label: "Operatsion xarajat", val: financials.opsExpenses, total: Math.max(financials.revenue, 1), color: "#f59e0b" },
                        { label: "Maosh xarajati",     val: financials.salary,      total: Math.max(financials.revenue, 1), color: "#6366f1" },
                        { label: "Sof foyda",          val: Math.max(financials.profit, 0), total: Math.max(financials.revenue, 1), color: "#3b82f6" },
                      ].map((item, i) => (
                        <div key={item.label}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                              <span className="text-xs font-medium text-slate-600">{item.label}</span>
                            </div>
                            <span className="text-xs font-black text-slate-800">{fmtMoney(item.val)} so&apos;m</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: item.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (item.val / item.total) * 100)}%` }}
                              transition={{ duration: 0.5, delay: i * 0.1 }}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Sog'liq indikatori */}
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4">
                        <div className="relative">
                          <GaugeRing
                            pct={financials.revenue > 0 ? Math.max(0, Math.min(100, financials.profit / financials.revenue * 100)) : 0}
                            color={financials.profit > 0 ? "#10b981" : "#ef4444"}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-black text-slate-700">
                              {financials.revenue > 0 ? Math.round(financials.profit / financials.revenue * 100) : 0}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">Foyda ko&apos;rsatkichi</p>
                          <p className="text-[11px] text-slate-400">
                            {financials.profit > 0
                              ? "Biznes sog'lom darajada ishlayapti"
                              : "Xarajatlar daromaddan oshib ketmoqda — choralar ko'ring!"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Kunlik statistika */}
                  <Card className="border border-slate-200 shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" /> Kunlik ko&apos;rsatkichlar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Kunlik o'rtacha daromad",  val: financials.dailyRevenue,    color: "text-emerald-700", bg: "bg-emerald-50" },
                          { label: "Oylik prognoz",             val: financials.projectedRevenue,color: "text-indigo-700",  bg: "bg-indigo-50" },
                          { label: "Mahsulot turlari",          val: products?.length || 0,      color: "text-amber-700",   bg: "bg-amber-50",  isMoney: false },
                          { label: "Faol omborlar",             val: warehouses?.length || 0,    color: "text-blue-700",    bg: "bg-blue-50",   isMoney: false },
                        ].map(item => (
                          <div key={item.label} className={cn("p-3 rounded-xl", item.bg)}>
                            <p className="text-[10px] text-slate-500 font-semibold mb-1">{item.label}</p>
                            <p className={cn("text-lg font-black", item.color)}>
                              {(item as { isMoney?: boolean }).isMoney === false
                                ? item.val
                                : `${fmtMoney(item.val as number)} so'm`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Risk xaritasi */}
                  <Card className="border border-slate-200 shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500" /> Xavf xaritasi
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: "Kritik (tugagan)",  count: productStats.filter(p => p.riskLevel === "critical").length, color: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
                          { label: "Ogohlantirish",      count: productStats.filter(p => p.riskLevel === "warning").length,  color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
                          { label: "Yaxshi holat",       count: productStats.filter(p => p.riskLevel === "ok").length,       color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
                        ].map(r => (
                          <div key={r.label} className={cn("p-3 rounded-xl text-center", r.color)}>
                            <div className={cn("w-2 h-2 rounded-full mx-auto mb-1.5", r.dot)} />
                            <p className="text-xl font-black">{r.count}</p>
                            <p className="text-[10px] font-semibold">{r.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                        {productStats.filter(p => p.riskLevel !== "ok").slice(0, 6).map(p => (
                          <div key={p.id} className="flex items-center gap-2 text-xs">
                            <span className={cn("w-2 h-2 rounded-full shrink-0",
                              p.riskLevel === "critical" ? "bg-rose-500" : "bg-amber-500"
                            )} />
                            <span className="font-medium text-slate-700 truncate flex-1">{p.name}</span>
                            <span className="text-slate-400 shrink-0">
                              {p.stock === 0 ? "Tugagan" : `${p.stock} qolgan`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* ══ MAHSULOTLAR ══ */}
            {activeTab === "products" && (
              <motion.div key="products" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="border border-slate-200 shadow-none overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {["Mahsulot", "Zaxira", "Marja", "Sotuv (davr)", "Daromad", "Holat"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                          <th className="px-4 py-3 w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {productStats.length === 0 ? (
                          <tr><td colSpan={7} className="text-center py-10 text-slate-400">Ma&apos;lumot yo&apos;q</td></tr>
                        ) : productStats.map(p => (
                          <>
                            <tr
                              key={p.id}
                              className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                              onClick={() => setExpandedProduct(expandedProduct === p.id ? null : p.id)}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className={cn("w-2 h-2 rounded-full shrink-0",
                                    p.riskLevel === "critical" ? "bg-rose-500" :
                                    p.riskLevel === "warning"  ? "bg-amber-400" : "bg-emerald-500"
                                  )} />
                                  <span className="font-semibold text-slate-800 text-xs">{p.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs font-bold text-slate-700">{p.stock} dona</td>
                              <td className="px-4 py-3">
                                <span className={cn("text-xs font-bold",
                                  p.marginPct >= 30 ? "text-emerald-600" :
                                  p.marginPct >= 15 ? "text-amber-600" : "text-rose-600"
                                )}>{p.marginPct.toFixed(1)}%</span>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600">{p.totalSold} dona</td>
                              <td className="px-4 py-3 text-xs font-bold text-slate-800">{fmtMoney(p.totalRevenue)} so&apos;m</td>
                              <td className="px-4 py-3">
                                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold",
                                  p.riskLevel === "critical" ? "bg-rose-100 text-rose-700" :
                                  p.riskLevel === "warning"  ? "bg-amber-100 text-amber-700" :
                                  "bg-emerald-100 text-emerald-700"
                                )}>
                                  {p.riskLevel === "critical" ? "Tugagan" : p.riskLevel === "warning" ? "Kam" : "Yaxshi"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <ChevronRight className={cn("w-4 h-4 text-slate-300 transition-transform", expandedProduct === p.id && "rotate-90")} />
                              </td>
                            </tr>
                            {expandedProduct === p.id && (
                              <tr key={`${p.id}-detail`} className="bg-indigo-50/40">
                                <td colSpan={7} className="px-6 py-3">
                                  <div className="grid grid-cols-4 gap-4 text-xs">
                                    <div><span className="text-slate-400">Sotuv narxi:</span> <span className="font-bold">{fmtFull(p.salePrice)} so&apos;m</span></div>
                                    <div><span className="text-slate-400">Tannarx:</span> <span className="font-bold">{fmtFull(p.costPrice)} so&apos;m</span></div>
                                    <div><span className="text-slate-400">Zaxira qiymati:</span> <span className="font-bold">{fmtMoney(p.stock * p.salePrice)} so&apos;m</span></div>
                                    <div><span className="text-slate-400">Min zaxira:</span> <span className="font-bold">{p.lowStockThreshold} dona</span></div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* ══ OMBORLAR ══ */}
            {activeTab === "warehouse" && (
              <motion.div key="warehouse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {warehouseStats.length === 0 ? (
                    <div className="col-span-2 text-center py-12 text-slate-400">Omborlar topilmadi</div>
                  ) : warehouseStats.map((wh) => (
                    <Card key={wh.id} className="border border-slate-200 shadow-none">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-slate-800">{wh.name}</h3>
                            <p className="text-xs text-slate-400">{wh.location || "Manzil ko'rsatilmagan"}</p>
                          </div>
                          <div className="relative">
                            <GaugeRing pct={wh.fillPct} color={wh.fillPct > 85 ? "#ef4444" : wh.fillPct > 60 ? "#f59e0b" : "#10b981"} />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[10px] font-black text-slate-700">{wh.fillPct}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 rounded-lg p-2.5">
                            <p className="text-[10px] text-slate-400 mb-0.5">Umumiy qiymat</p>
                            <p className="text-sm font-black text-slate-800">{fmtMoney(wh.totalValue)} so&apos;m</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2.5">
                            <p className="text-[10px] text-slate-400 mb-0.5">Mahsulot turlari</p>
                            <p className="text-sm font-black text-slate-800">{wh.productCount} xil</p>
                          </div>
                          <div className={cn("rounded-lg p-2.5", wh.outOfStock > 0 ? "bg-rose-50" : "bg-slate-50")}>
                            <p className="text-[10px] text-slate-400 mb-0.5">Tugagan</p>
                            <p className={cn("text-sm font-black", wh.outOfStock > 0 ? "text-rose-600" : "text-slate-800")}>{wh.outOfStock} ta</p>
                          </div>
                          <div className={cn("rounded-lg p-2.5", wh.lowStockItems > 0 ? "bg-amber-50" : "bg-slate-50")}>
                            <p className="text-[10px] text-slate-400 mb-0.5">Kam qolgan</p>
                            <p className={cn("text-sm font-black", wh.lowStockItems > 0 ? "text-amber-600" : "text-slate-800")}>{wh.lowStockItems} ta</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>To&apos;ldirilganlik: {wh.usedCapacity} / {wh.capacity || "∞"}</span>
                            <span>{wh.fillPct}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              className={cn("h-full rounded-full", wh.fillPct > 85 ? "bg-rose-500" : wh.fillPct > 60 ? "bg-amber-400" : "bg-emerald-500")}
                              initial={{ width: 0 }}
                              animate={{ width: `${wh.fillPct}%` }}
                              transition={{ duration: 0.6 }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ══ XODIMLAR ══ */}
            {activeTab === "staff" && (
              <motion.div key="staff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border border-slate-200 shadow-none">
                    <CardContent className="p-5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Jami xodimlar</p>
                      <p className="text-4xl font-black text-slate-900">{employees?.length || 0}</p>
                      <p className="text-xs text-slate-400 mt-1">ta faol xodim</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-slate-200 shadow-none">
                    <CardContent className="p-5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Maosh xarajati</p>
                      <p className="text-4xl font-black text-indigo-700">{fmtMoney(financials.salary)}</p>
                      <p className="text-xs text-slate-400 mt-1">so&apos;m ({PERIOD_LABELS[period]})</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-slate-200 shadow-none">
                    <CardContent className="p-5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">O&apos;rtacha maosh</p>
                      <p className="text-4xl font-black text-amber-700">
                        {employees?.length ? fmtMoney(financials.salary / employees.length) : "—"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">so&apos;m / xodim</p>
                    </CardContent>
                  </Card>
                </div>
                <Card className="border border-slate-200 shadow-none mt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {["Xodim", "Lavozim", "Asosiy maosh", "Davr maoshi", "Holat"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {!employees?.length ? (
                          <tr><td colSpan={5} className="text-center py-10 text-slate-400">Xodimlar topilmadi</td></tr>
                        ) : employees.map(e => {
                          const periodSalary = period === "weekly" ? (e.baseSalary || 0) / 4
                            : period === "quarterly" ? (e.baseSalary || 0) * 3
                            : period === "yearly" ? (e.baseSalary || 0) * 12
                            : (e.baseSalary || 0);
                          return (
                            <tr key={e.id} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{e.name} {e.surname}</td>
                              <td className="px-4 py-3 text-xs text-slate-500">{e.position || "—"}</td>
                              <td className="px-4 py-3 text-xs font-bold text-slate-700">{fmtMoney(e.baseSalary || 0)} so&apos;m</td>
                              <td className="px-4 py-3 text-xs font-bold text-indigo-700">{fmtMoney(periodSalary)} so&apos;m</td>
                              <td className="px-4 py-3">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                  <CheckCircle2 className="w-3 h-3 inline mr-0.5" />Faol
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── AI NATIJASI ── */}
          <AnimatePresence>
            {aiResult && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-none overflow-hidden">
                  <CardHeader className="pb-2 px-6 pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-indigo-600 rounded-lg">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-indigo-500">AI Biznes Tahlili</span>
                    </div>
                    <CardTitle className="text-xl font-black text-slate-900">Aqlli tavsiyalar</CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-5">
                    <div className="p-4 rounded-xl bg-indigo-600 text-white">
                      <p className="text-sm font-medium leading-relaxed italic">&quot;{aiResult.summary}&quot;</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" /> Trendlar
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{aiResult.analysis}</p>
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5" /> Tavsiyalar
                        </h4>
                        <div className="space-y-2">
                          {aiResult.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-indigo-100">
                              <div className="w-5 h-5 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-[10px] font-black">{i + 1}</div>
                              <span className="text-xs font-semibold text-slate-700">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}
