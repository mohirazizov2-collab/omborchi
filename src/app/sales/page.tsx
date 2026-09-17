"use client";
 
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ShoppingCart, Search, TrendingUp, TrendingDown,
  Package, DollarSign, BarChart2, RefreshCw, Calendar,
  Pencil, Save, X, Loader2, AlertTriangle, Check,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
 
// $ formatida pul
const formatMoney = (val: number) =>
  "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
 
const VAT_RATES = ["0%", "12%", "20%", "Без НДС"];
 
export default function SalesPage() {
  const db = useFirestore();
  const { toast } = useToast();
 
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
 
  // Edit state
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editFields, setEditFields] = useState({
    productName: "",
    recipient: "",
    unitPrice: 0,
    quantityChange: 0,
    discount: 0,
    vatRate: "Без НДС",
    outgoingType: "sale",
    movementDate: "",
  });
 
  const movementsQuery = useMemoFirebase(() => db ? collection(db, "stockMovements") : null, [db]);
  const { data: movements, loading: movementsLoading } = useCollection(movementsQuery);
 
  const warehousesQuery = useMemoFirebase(() => db ? collection(db, "warehouses") : null, [db]);
  const { data: warehouses } = useCollection(warehousesQuery);
 
  const salesMovements = useMemo(() => {
    if (!movements) return [];
    return movements.filter(m => m.movementType === "StockOut" && !m._deleted);
  }, [movements]);
 
  const filtered = useMemo(() => {
    let data = salesMovements;
    if (warehouseFilter !== "all") data = data.filter(m => m.warehouseId === warehouseFilter);
    if (typeFilter !== "all") data = data.filter(m => (m.outgoingType || "sale") === typeFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      data = data.filter(m =>
        m.productName?.toLowerCase().includes(s) ||
        m.recipient?.toLowerCase().includes(s) ||
        m.orderNumber?.toLowerCase().includes(s)
      );
    }
    if (dateFrom) data = data.filter(m => m.movementDate >= dateFrom);
    if (dateTo) data = data.filter(m => m.movementDate <= dateTo + "T23:59:59");
    return [...data].sort((a, b) =>
      new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime()
    );
  }, [salesMovements, warehouseFilter, typeFilter, search, dateFrom, dateTo]);
 
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
 
  // Edited row live total calc
  const editedTotal = useMemo(() => {
    const qty = Math.abs(editFields.quantityChange || 0);
    const gross = qty * (editFields.unitPrice || 0);
    const discountAmt = (gross * (editFields.discount || 0)) / 100;
    return gross - discountAmt;
  }, [editFields]);
 
  const handleOpenEdit = (row: any) => {
    setEditingRow(row);
    setEditFields({
      productName: row.productName || "",
      recipient: row.recipient || "",
      unitPrice: row.unitPrice || 0,
      quantityChange: Math.abs(row.quantityChange || 0),
      discount: row.discount || 0,
      vatRate: row.vatRate || "Без НДС",
      outgoingType: row.outgoingType || "sale",
      movementDate: row.movementDate ? row.movementDate.slice(0, 16) : "",
    });
  };
 
  const handleSaveEdit = async () => {
    if (!editingRow || !db) return;
    setEditSaving(true);
    try {
      const docRef = doc(db, "stockMovements", editingRow.id);
      const qty = Math.abs(editFields.quantityChange);
      const vatPct = editFields.vatRate === "Без НДС" || editFields.vatRate === "0%"
        ? 0 : parseFloat(editFields.vatRate) || 0;
      const gross = qty * editFields.unitPrice;
      const discountAmt = (gross * editFields.discount) / 100;
      const afterDiscount = gross - discountAmt;
      const vatAmt = (afterDiscount * vatPct) / (100 + vatPct);
 
      await updateDoc(docRef, {
        productName: editFields.productName,
        recipient: editFields.recipient,
        unitPrice: editFields.unitPrice,
        quantityChange: -qty,
        discount: editFields.discount,
        vatRate: editFields.vatRate,
        outgoingType: editFields.outgoingType,
        outgoingTypeLabel: editFields.outgoingType === "sale" ? "Sotuv" : "Xarajat",
        movementDate: editFields.movementDate || editingRow.movementDate,
        totalPrice: afterDiscount,
        vatAmount: vatAmt,
        editedAt: new Date().toISOString(),
      });
 
      toast({ title: "Saqlandi ✓", description: `${editingRow.orderNumber} — muvaffaqiyatli yangilandi.` });
      setEditingRow(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Xatolik", description: "Saqlashda muammo yuz berdi." });
    } finally {
      setEditSaving(false);
    }
  };
 
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
            Barcha omborlardan chiqim qilingan mahsulotlar · Sumalar $ da
          </p>
        </div>
 
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Jami sotuv", value: formatMoney(totals.saleTotal), icon: TrendingUp, color: "emerald" },
              { label: "Jami xarajat", value: formatMoney(totals.expenseTotal), icon: TrendingDown, color: "amber" },
              { label: "Jami miqdor", value: totals.totalQty.toFixed(2) + " ед.", icon: Package, color: "blue" },
              { label: "Jami NDS", value: formatMoney(totals.vatTotal), icon: DollarSign, color: "purple" },
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
                    setSearch(""); setWarehouseFilter("all");
                    setTypeFilter("all"); setDateFrom(""); setDateTo("");
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
                Umumiy: <span className="text-emerald-600">{formatMoney(totals.total)}</span>
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
                    <th className="px-3 py-2.5 font-black uppercase text-muted-foreground text-right">Narx ($)</th>
                    <th className="px-3 py-2.5 font-black uppercase text-muted-foreground text-right">NDS %</th>
                    <th className="px-3 py-2.5 font-black uppercase text-muted-foreground text-right">Summa ($)</th>
                    <th className="px-3 py-2.5 font-black uppercase text-muted-foreground text-center w-16">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {movementsLoading ? (
                    <tr>
                      <td colSpan={12} className="px-3 py-8 text-center text-muted-foreground font-bold">
                        Yuklanmoqda...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-3 py-8 text-center text-muted-foreground font-bold">
                        Ma'lumot topilmadi
                      </td>
                    </tr>
                  ) : (
                    filtered.map((m, index) => {
                      const isSale = (m.outgoingType || "sale") === "sale";
                      return (
                        <tr key={m.id} className="hover:bg-muted/5 transition-colors group">
                          <td className="px-3 py-2 text-center text-muted-foreground font-bold">{index + 1}</td>
                          <td className="px-3 py-2 font-mono font-black text-rose-600">{m.orderNumber || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {m.movementDate ? new Date(m.movementDate).toLocaleDateString("ru-RU") : "—"}
                          </td>
                          <td className="px-3 py-2 font-bold">{m.productName || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{m.recipient || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{m.warehouseName || "—"}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={cn(
                              "inline-block px-2 py-0.5 rounded-lg text-[11px] font-black",
                              isSale ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
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
                          <td className="px-3 py-2 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500/10 text-amber-600"
                              onClick={() => handleOpenEdit(m)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
 
                {filtered.length > 0 && (
                  <tfoot className="border-t-2 border-border/30 bg-muted/20">
                    <tr className="font-black text-xs">
                      <td colSpan={7} className="px-3 py-2 text-right text-muted-foreground">Итого:</td>
                      <td className="px-3 py-2 text-right">{totals.totalQty.toFixed(3)}</td>
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2 text-right text-amber-600">{formatMoney(totals.vatTotal)}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{formatMoney(totals.total)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </div>
 
        {/* ===== EDIT DIALOG ===== */}
        <Dialog open={!!editingRow} onOpenChange={(o) => !o && setEditingRow(null)}>
          <DialogContent className="rounded-[2rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-lg p-8 shadow-2xl">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-3">
                <Pencil className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-black tracking-tight">
                Yozuvni tahrirlash
              </DialogTitle>
              <p className="text-muted-foreground text-sm font-medium">
                <span className="font-mono font-black text-rose-600">{editingRow?.orderNumber}</span>
                {" "}— {editingRow?.productName}
              </p>
            </DialogHeader>
 
            <div className="space-y-3 py-2">
              {/* Chiqim turi */}
              <div className="flex items-center gap-3">
                <Label className="w-32 text-xs text-right text-muted-foreground shrink-0">Chiqim turi:</Label>
                <div className="flex flex-1 gap-2">
                  {[{ value: "sale", label: "Sotuv" }, { value: "expense", label: "Xarajat" }].map(t => (
                    <button
                      key={t.value}
                      onClick={() => setEditFields(f => ({ ...f, outgoingType: t.value }))}
                      className={cn(
                        "flex-1 h-8 rounded-lg text-xs font-black border transition-all",
                        editFields.outgoingType === t.value
                          ? t.value === "sale"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-amber-500 text-white border-amber-500"
                          : "bg-background/80 text-muted-foreground border-border/40 hover:text-foreground"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
 
              {/* Mahsulot nomi */}
              <div className="flex items-center gap-3">
                <Label className="w-32 text-xs text-right text-muted-foreground shrink-0">Mahsulot:</Label>
                <Input
                  className="h-8 text-xs flex-1 rounded-lg bg-background/80 border-border/40 font-bold"
                  value={editFields.productName}
                  onChange={e => setEditFields(f => ({ ...f, productName: e.target.value }))}
                />
              </div>
 
              {/* Mijoz */}
              <div className="flex items-center gap-3">
                <Label className="w-32 text-xs text-right text-muted-foreground shrink-0">Mijoz:</Label>
                <Input
                  className="h-8 text-xs flex-1 rounded-lg bg-background/80 border-border/40 font-bold"
                  value={editFields.recipient}
                  onChange={e => setEditFields(f => ({ ...f, recipient: e.target.value }))}
                />
              </div>
 
              {/* Sana */}
              <div className="flex items-center gap-3">
                <Label className="w-32 text-xs text-right text-muted-foreground shrink-0">Sana:</Label>
                <Input
                  type="datetime-local"
                  className="h-8 text-xs flex-1 rounded-lg bg-background/80 border-border/40"
                  value={editFields.movementDate}
                  onChange={e => setEditFields(f => ({ ...f, movementDate: e.target.value }))}
                />
              </div>
 
              {/* Miqdor + Narx */}
              <div className="flex items-center gap-3">
                <Label className="w-32 text-xs text-right text-muted-foreground shrink-0">Miqdor:</Label>
                <Input
                  type="number" min={0} step={0.001}
                  className="h-8 text-xs w-28 rounded-lg bg-background/80 border-border/40 font-black text-center"
                  value={editFields.quantityChange}
                  onChange={e => setEditFields(f => ({ ...f, quantityChange: parseFloat(e.target.value) || 0 }))}
                />
                <Label className="text-xs text-muted-foreground shrink-0">Narx ($):</Label>
                <Input
                  type="number" min={0} step={0.01}
                  className="h-8 text-xs flex-1 rounded-lg bg-background/80 border-border/40 font-black text-right"
                  value={editFields.unitPrice}
                  onChange={e => setEditFields(f => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))}
                />
              </div>
 
              {/* Chegirma + NDS */}
              <div className="flex items-center gap-3">
                <Label className="w-32 text-xs text-right text-muted-foreground shrink-0">Chegirma %:</Label>
                <Input
                  type="number" min={0} max={100}
                  className="h-8 text-xs w-28 rounded-lg bg-background/80 border-border/40 font-black text-center"
                  value={editFields.discount}
                  onChange={e => setEditFields(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                />
                <Label className="text-xs text-muted-foreground shrink-0">NDS:</Label>
                <Select value={editFields.vatRate} onValueChange={v => setEditFields(f => ({ ...f, vatRate: v }))}>
                  <SelectTrigger className="h-8 text-xs flex-1 rounded-lg bg-background/80 border-border/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {VAT_RATES.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
 
              {/* Live total */}
              <div className="p-3 rounded-xl bg-muted/20 border border-border/20 flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">Yangi summa:</span>
                <span className="text-lg font-black text-emerald-600">{formatMoney(editedTotal)}</span>
              </div>
 
              {/* Warning */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-700">
                  Faqat bu yozuv yangilanadi. Inventar stoki o'zgarmaydi — stokni to'g'rilash uchun to'liq tahrirlashdan foydalaning.
                </p>
              </div>
            </div>
 
            <DialogFooter className="gap-2 mt-2">
              <Button
                variant="ghost"
                onClick={() => setEditingRow(null)}
                className="rounded-xl h-10 font-bold px-4"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Bekor
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="rounded-xl h-10 flex-1 bg-amber-500 text-white hover:bg-amber-600 font-black gap-2"
              >
                {editSaving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Check className="w-4 h-4" /> Saqlash</>
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
 
