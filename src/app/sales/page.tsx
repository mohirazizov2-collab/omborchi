"use client";
 
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShoppingCart, Search, TrendingUp, TrendingDown,
  Package, DollarSign, BarChart2, Filter, Download,
  RefreshCw, Calendar,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";
 
export default function SalesPage() {
  const { t } = useLanguage();
  const db = useFirestore();
 
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // all | sale | expense
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
 
  // Firebase data
  const movementsQuery = useMemoFirebase(
    () => db ? collection(db, "stockMovements") : null,
    [db]
  );
  const { data: movements, loading: movementsLoading } = useCollection(movementsQuery);
 
  const warehousesQuery = useMemoFirebase(
    () => db ? collection(db, "warehouses") : null,
    [db]
  );
  const { data: warehouses } = useCollection(warehousesQuery);
 
  const formatMoney = (val: number) =>
    val.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
 
  // Faqat StockOut harakatlarini olamiz
  const salesMovements = useMemo(() => {
    if (!movements) return [];
    return movements.filter(m => m.movementType === "StockOut");
  }, [movements]);
 
  // Filter
  const filtered = useMemo(() => {
    let data = salesMovements;
 
    if (warehouseFilter !== "all") {
      data = data.filter(m => m.warehouseId === warehouseFilter);
    }
 
    if (typeFilter !== "all") {
      data = data.filter(m => (m.outgoingType || "sale") === typeFilter);
    }
 
    if (search.trim()) {
      const s = search.toLowerCase();
      data = data.filter(m =>
        m.productName?.toLowerCase().includes(s) ||
        m.recipient?.toLowerCase().includes(s) ||
        m.orderNumber?.toLowerCase().includes(s)
      );
    }
 
    if (dateFrom) {
      data = data.filter(m => m.movementDate >= dateFrom);
    }
    if (dateTo) {
      data = data.filter(m => m.movementDate <= dateTo + "T23:59:59");
    }
 
    // Sort by date desc
    return [...data].sort((a, b) =>
      new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime()
    );
  }, [salesMovements, warehouseFilter, typeFilter, search, dateFrom, dateTo]);
 
  // Totals
  const totals = useMemo(() => {
    const saleItems = filtered.filter(m => (m.outgoingType || "sale") === "sale");
    const expenseItems = filtered.filter(m => m.outgoingType === "expense");
 
    const saleTotal = saleItems.reduce((s, m) => s + (m.totalPrice || 0), 0);
    const expenseTotal = expenseItems.reduce((s, m) => s + (m.totalPrice || 0), 0);
    const totalQty = filtered.reduce((s, m) => s + Math.abs(m.quantityChange || 0), 0);
    const vatTotal = filtered.reduce((s, m) => {
      const vatPct = m.vatRate === "Без НДС" || m.vatRate === "0%" ? 0 : parseFloat(m.vatRate) || 0;
      return s + ((m.totalPrice || 0) * vatPct) / (100 + vatPct);
    }, 0);
 
    return { saleTotal, expenseTotal, total: saleTotal + expenseTotal, totalQty, vatTotal };
  }, [filtered]);
 
  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border/20 bg-card/30">
          <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            Sotuv va Chiqimlar hisoboti
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Barcha omborlardan chiqim qilingan mahsulotlar
          </p>
        </div>
 
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: "Jami sotuv",
                value: formatMoney(totals.saleTotal),
                icon: TrendingUp,
                color: "emerald",
                suffix: "р.",
              },
              {
                label: "Jami xarajat",
                value: formatMoney(totals.expenseTotal),
                icon: TrendingDown,
                color: "amber",
                suffix: "р.",
              },
              {
                label: "Jami miqdor",
                value: totals.totalQty.toFixed(2),
                icon: Package,
                color: "blue",
                suffix: "ед.",
              },
              {
                label: "Jami NDS",
                value: formatMoney(totals.vatTotal),
                icon: DollarSign,
                color: "purple",
                suffix: "р.",
              },
            ].map((stat, i) => (
              <Card key={i} className="border border-border/30 rounded-xl bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-bold">{stat.label}</span>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      stat.color === "emerald" && "bg-emerald-500/10 text-emerald-600",
                      stat.color === "amber" && "bg-amber-500/10 text-amber-600",
                      stat.color === "blue" && "bg-blue-500/10 text-blue-600",
                      stat.color === "purple" && "bg-purple-500/10 text-purple-600",
                    )}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-black">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.suffix}</p>
                </CardContent>
              </Card>
            ))}
          </div>
 
          {/* Filters */}
          <Card className="border border-border/30 rounded-xl bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Mahsulot, mijoz yoki hujjat №..."
                    className="h-8 pl-8 text-xs rounded-lg bg-background/80 border-border/40"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
 
                {/* Warehouse filter */}
                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                  <SelectTrigger className="h-8 text-xs w-40 rounded-lg bg-background/80 border-border/40">
                    <SelectValue placeholder="Ombor" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Barcha omborlar</SelectItem>
                    {warehouses?.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
 
                {/* Type filter */}
                <div className="flex gap-1">
                  {[
                    { value: "all", label: "Barchasi" },
                    { value: "sale", label: "Sotuv" },
                    { value: "expense", label: "Xarajat" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTypeFilter(opt.value)}
                      className={cn(
                        "h-8 px-3 rounded-lg text-xs font-bold transition-all border",
                        typeFilter === opt.value
                          ? opt.value === "sale"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : opt.value === "expense"
                              ? "bg-amber-500 text-white border-amber-500"
                              : "bg-foreground text-background border-foreground"
                          : "bg-background/80 text-muted-foreground border-border/40 hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
 
                {/* Date range */}
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="date"
                    className="h-8 text-xs w-36 rounded-lg bg-background/80 border-border/40"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">—</span>
                  <Input
                    type="date"
                    className="h-8 text-xs w-36 rounded-lg bg-background/80 border-border/40"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                  />
                </div>
 
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs rounded-lg gap-1.5"
                  onClick={() => {
                    setSearch("");
                    setWarehouseFilter("all");
                    setTypeFilter("all");
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset
                </Button>
              </div>
            </CardContent>
          </Card>
 
          {/* Table */}
          <Card className="border border-border/30 rounded-xl bg-card/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                <BarChart2 className="w-3.5 h-3.5 inline mr-1" />
                Jami {filtered.length} ta yozuv
              </p>
              <p className="text-sm font-black">
                Umumiy:{" "}
                <span className="text-emerald-600">{formatMoney(totals.total)} р.</span>
              </p>
            </div>
 
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 border-b border-border/20">
                  <tr>
                    <th className="px-3 py-2.5 font-black uppercase text-muted-foreground w-8">№</th>
                    <th className="px-3 py-2.5 font-black uppercase text-muted-foreground">Hujjat №</th>
                    <th className="px-3 py-2.5 font-black uppercase text-muted-foreground">Sana</th>
                    <th className="px-3 py-2.5 font-black uppercase text-muted-foreground">Mahsulot</th>
                    <th className="px-3 py-2.5 font-black uppercase text-muted-foreground">Mijoz</th>
                    <th className="px-3 py-2.5 font-black uppercase text-muted-foreground">Ombor</th>
                    <th className="px-3 py-2.5 font-black uppercase text-muted-foreground text-center">Tur</th>
                    <th className="px-3 py-2.5 font-black uppercase text-muted-foreground text-right">Miqdor</th>
                    <th className="px-3 py-2.5 font-black uppercase text-muted-foreground text-right">Narx</th>
                    <th className="px-3 py-2.5 font-black uppercase text-muted-foreground text-right">NDS %</th>
                    <th className="px-3 py-2.5 font-black uppercase text-muted-foreground text-right">Summa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {movementsLoading ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground font-bold">
                        Yuklanmoqda...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground font-bold">
                        Ma'lumot topilmadi
                      </td>
                    </tr>
                  ) : (
                    filtered.map((m, index) => {
                      const isSale = (m.outgoingType || "sale") === "sale";
                      return (
                        <tr key={m.id} className="hover:bg-muted/5 transition-colors">
                          <td className="px-3 py-2 text-center text-muted-foreground font-bold">{index + 1}</td>
                          <td className="px-3 py-2 font-mono font-black text-rose-600">{m.orderNumber || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {m.movementDate
                              ? new Date(m.movementDate).toLocaleDateString("ru-RU")
                              : "—"}
                          </td>
                          <td className="px-3 py-2 font-bold">{m.productName || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{m.recipient || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{m.warehouseName || "—"}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={cn(
                              "inline-block px-2 py-0.5 rounded-lg text-[11px] font-black",
                              isSale
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-amber-500/10 text-amber-600"
                            )}>
                              {isSale ? "Sotuv" : "Xarajat"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-black">
                            {Math.abs(m.quantityChange || 0).toFixed(3)} {m.unit || "ед."}
                          </td>
                          <td className="px-3 py-2 text-right font-black">
                            {formatMoney(m.unitPrice || 0)}
                          </td>
                          <td className="px-3 py-2 text-right text-amber-600 font-bold">
                            {m.vatRate || "Без НДС"}
                          </td>
                          <td className="px-3 py-2 text-right font-black text-emerald-600">
                            {formatMoney(m.totalPrice || 0)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
 
                {/* Footer totals */}
                {filtered.length > 0 && (
                  <tfoot className="border-t-2 border-border/30 bg-muted/20">
                    <tr className="font-black text-xs">
                      <td colSpan={7} className="px-3 py-2 text-right text-muted-foreground">Итого:</td>
                      <td className="px-3 py-2 text-right">{totals.totalQty.toFixed(3)}</td>
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2 text-right text-amber-600">{formatMoney(totals.vatTotal)}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{formatMoney(totals.total)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
