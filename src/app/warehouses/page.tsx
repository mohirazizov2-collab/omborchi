"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Warehouse as WarehouseIcon,
  MapPin,
  Phone,
  User,
  Trash2,
  Plus,
  Loader2,
  Package,
  Edit2,
  Eye,
  Hash,
  Search,
  RefreshCw,
  X,
  Save,
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// iiko warehouse types
const WAREHOUSE_TYPES = [
  "Производственный",
  "Розничный",
  "Банкетный",
  "Склад сырья",
  "Промежуточный",
  "Другое",
];

type SortField = "name" | "type" | "managerName" | "address" | "totalStock";
type SortDir = "asc" | "desc";

export default function WarehousesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();

  const isAdmin = role === "Super Admin" || role === "Admin";

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [viewStockWarehouse, setViewStockWarehouse] = useState<any>(null);
  const [stockSearch, setStockSearch] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Table controls
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    name: "",
    type: "Производственный",
    address: "",
    phoneNumber: "",
    managerName: "",
    comment: "",
  });

  // Firebase queries
  const warehousesQuery = useMemoFirebase(() => (db && user ? collection(db, "warehouses") : null), [db, user]);
  const { data: warehouses, isLoading } = useCollection(warehousesQuery);

  const inventoryQuery = useMemoFirebase(() => (db && user ? collection(db, "inventory") : null), [db, user]);
  const { data: inventory } = useCollection(inventoryQuery);

  const productsQuery = useMemoFirebase(() => (db && user ? collection(db, "products") : null), [db, user]);
  const { data: products } = useCollection(productsQuery);

  // Stats per warehouse
  const warehouseStats = useMemo(() => {
    if (!warehouses || !inventory) return {} as Record<string, { totalStock: number; productCount: number; totalValue: number }>;
    const stats: Record<string, { totalStock: number; productCount: number; totalValue: number }> = {};
    warehouses.forEach((w) => {
      const items = inventory.filter((inv) => inv.warehouseId === w.id);
      const totalValue = items.reduce((acc, inv) => {
        const p = products?.find((pr) => pr.id === inv.productId);
        return acc + (inv.stock || 0) * (p?.salePrice || 0);
      }, 0);
      stats[w.id] = {
        totalStock: items.reduce((acc, cur) => acc + (cur.stock || 0), 0),
        productCount: items.filter((i) => (i.stock || 0) > 0).length,
        totalValue,
      };
    });
    return stats;
  }, [warehouses, inventory, products]);

  // Filtered + sorted warehouses
  const displayedWarehouses = useMemo(() => {
    if (!warehouses) return [];
    let list = warehouses.filter(
      (w) =>
        w.name?.toLowerCase().includes(search.toLowerCase()) ||
        w.managerName?.toLowerCase().includes(search.toLowerCase()) ||
        w.address?.toLowerCase().includes(search.toLowerCase())
    );
    list = [...list].sort((a, b) => {
      let va: any = a[sortField] ?? "";
      let vb: any = b[sortField] ?? "";
      if (sortField === "totalStock") {
        va = warehouseStats[a.id]?.totalStock ?? 0;
        vb = warehouseStats[b.id]?.totalStock ?? 0;
      }
      if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return list;
  }, [warehouses, search, sortField, sortDir, warehouseStats]);

  // Stock dialog items
  const filteredWarehouseStock = useMemo(() => {
    if (!viewStockWarehouse || !inventory || !products) return [];
    return inventory
      .filter((inv) => inv.warehouseId === viewStockWarehouse.id)
      .map((inv) => {
        const product = products.find((p) => p.id === inv.productId);
        return {
          ...inv,
          productName: product?.name || "Noma'lum",
          sku: product?.sku || "---",
          price: product?.salePrice || 0,
          unit: product?.unit || "pcs",
        };
      })
      .filter(
        (item) =>
          item.productName.toLowerCase().includes(stockSearch.toLowerCase()) ||
          item.sku.toLowerCase().includes(stockSearch.toLowerCase())
      )
      .sort((a, b) => {
        const nA = parseInt(a.sku, 10), nB = parseInt(b.sku, 10);
        if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
        return a.productName.localeCompare(b.productName);
      });
  }, [viewStockWarehouse, inventory, products, stockSearch]);

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : (
      <ChevronUp className="w-3 h-3 opacity-20" />
    );

  const handleSave = () => {
    if (!db || !user || !formData.name) return;
    setIsSaving(true);
    const warehouseId = editingWarehouse ? editingWarehouse.id : doc(collection(db, "warehouses")).id;
    const warehouseRef = doc(db, "warehouses", warehouseId);
    const warehouseData: any = {
      id: warehouseId,
      name: formData.name,
      type: formData.type,
      address: formData.address,
      phoneNumber: formData.phoneNumber,
      managerName: formData.managerName,
      comment: formData.comment,
      responsibleUserId: user.uid,
      isDeleted: false,
      updatedAt: new Date().toISOString(),
    };
    if (!editingWarehouse) warehouseData.createdAt = new Date().toISOString();

    setDoc(warehouseRef, warehouseData, { merge: true })
      .then(() => {
        handleCloseDialog();
        toast({ title: "Muvaffaqiyatli", description: editingWarehouse ? "Ombor yangilandi." : "Yangi ombor qo'shildi." });
      })
      .catch(() => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({ path: warehouseRef.path, operation: editingWarehouse ? "update" : "create", requestResourceData: warehouseData }));
      })
      .finally(() => setIsSaving(false));
  };

  const handleEditClick = (w: any) => {
    setEditingWarehouse(w);
    setFormData({ name: w.name || "", type: w.type || "Производственный", address: w.address || "", phoneNumber: w.phoneNumber || "", managerName: w.managerName || "", comment: w.comment || "" });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingWarehouse(null);
    setFormData({ name: "", type: "Производственный", address: "", phoneNumber: "", managerName: "", comment: "" });
  };

  const handleDelete = (id: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, "warehouses", id));
    setDeleteConfirmId(null);
    toast({ title: "O'chirildi", description: "Ombor o'chirildi." });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayedWarehouses.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayedWarehouses.map((w) => w.id)));
  };

  const formatMoney = (val: number) =>
    val.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ── iiko-style header ── */}
        <div className="px-6 pt-5 pb-4 border-b border-border/20 bg-card/30 flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <WarehouseIcon className="w-5 h-5 text-primary" />
            {t.warehouses.title}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Summary badges */}
            <div className="flex items-center gap-3 mr-2 text-xs text-muted-foreground">
              <span className="font-bold">Jami omborlar: <span className="text-foreground font-black">{warehouses?.length || 0}</span></span>
              <span className="font-bold">Jami SKU: <span className="text-foreground font-black">{Object.values(warehouseStats).reduce((a, s) => a + s.productCount, 0)}</span></span>
            </div>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs rounded-lg gap-1.5" onClick={() => window.location.reload()}>
              <RefreshCw className="w-3.5 h-3.5" /> Yangilash
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                className="h-8 px-4 text-xs font-black rounded-lg gap-1.5 bg-primary text-white border-none"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Ombor qo'shish
              </Button>
            )}
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="px-6 py-3 border-b border-border/10 flex items-center gap-3 bg-muted/5 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Ombor nomi, menejer yoki manzil..."
              className="h-8 pl-9 text-xs rounded-lg bg-background/80 border-border/40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {selectedIds.size > 0 && isAdmin && (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs text-muted-foreground font-bold">{selectedIds.size} ta tanlandi</span>
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs rounded-lg text-rose-600 border-rose-600/20 hover:bg-rose-600/5 gap-1.5"
                onClick={() => { selectedIds.forEach(id => handleDelete(id)); setSelectedIds(new Set()); }}>
                <Trash2 className="w-3.5 h-3.5" /> O'chirish
              </Button>
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary opacity-30" />
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/20 border-b border-border/20 sticky top-0 z-10">
                <tr>
                  {isAdmin && (
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedIds.size === displayedWarehouses.length && displayedWarehouses.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="px-2 py-3 w-8 text-center text-[10px] font-black uppercase text-muted-foreground">№</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("name")}>
                    <span className="flex items-center gap-1">Ombor nomi <SortIcon field="name" /></span>
                  </th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("type")}>
                    <span className="flex items-center gap-1">Turi <SortIcon field="type" /></span>
                  </th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("managerName")}>
                    <span className="flex items-center gap-1">Menejer <SortIcon field="managerName" /></span>
                  </th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground" onClick={() => handleSort("address")}>
                    <span className="flex items-center gap-1 cursor-pointer">Manzil <SortIcon field="address" /></span>
                  </th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground">Telefon</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground text-center cursor-pointer hover:text-foreground" onClick={() => handleSort("totalStock")}>
                    <span className="flex items-center gap-1 justify-center">Jami qoldiq <SortIcon field="totalStock" /></span>
                  </th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground text-center">SKU turlari</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground text-right">Balans qiymati</th>
                  <th className="px-3 py-3 w-28 text-[10px] font-black uppercase text-muted-foreground text-center">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                <AnimatePresence mode="popLayout">
                  {displayedWarehouses.map((w, idx) => {
                    const stats = warehouseStats[w.id] || { totalStock: 0, productCount: 0, totalValue: 0 };
                    const isSelected = selectedIds.has(w.id);
                    const isLowStock = stats.totalStock < 10 && stats.totalStock > 0;
                    const isEmpty = stats.totalStock === 0;

                    return (
                      <motion.tr
                        key={w.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: idx * 0.03 }}
                        className={cn(
                          "group hover:bg-primary/[0.02] transition-colors cursor-default",
                          isSelected && "bg-primary/[0.04]"
                        )}
                      >
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={isSelected}
                              onChange={() => toggleSelect(w.id)}
                            />
                          </td>
                        )}
                        {/* № */}
                        <td className="px-2 py-3 text-center text-xs font-bold text-muted-foreground">{idx + 1}</td>

                        {/* Ombor nomi */}
                        <td className="px-3 py-3">
                          <span className="font-black text-foreground text-sm">{w.name}</span>
                          {w.comment && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[180px]">{w.comment}</p>
                          )}
                        </td>

                        {/* Turi */}
                        <td className="px-3 py-3">
                          <Badge variant="outline" className="text-[10px] font-black px-2 rounded-md border-primary/20 text-primary bg-primary/5">
                            {w.type || "Производственный"}
                          </Badge>
                        </td>

                        {/* Menejer */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary shrink-0">
                              {(w.managerName || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-foreground/80 truncate max-w-[120px]">
                              {w.managerName || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Manzil */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 shrink-0 opacity-40" />
                            <span className="truncate max-w-[140px]">{w.address || "—"}</span>
                          </div>
                        </td>

                        {/* Telefon */}
                        <td className="px-3 py-3 text-xs text-muted-foreground font-mono">
                          {w.phoneNumber || "—"}
                        </td>

                        {/* Jami qoldiq */}
                        <td className="px-3 py-3 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black",
                            isEmpty ? "bg-rose-500/10 text-rose-600"
                              : isLowStock ? "bg-amber-500/10 text-amber-600"
                                : "bg-emerald-500/10 text-emerald-600"
                          )}>
                            {isEmpty && <AlertTriangle className="w-3 h-3" />}
                            {stats.totalStock}
                          </span>
                        </td>

                        {/* SKU */}
                        <td className="px-3 py-3 text-center">
                          <span className="text-xs font-black text-muted-foreground">
                            {stats.productCount} та
                          </span>
                        </td>

                        {/* Balans */}
                        <td className="px-3 py-3 text-right">
                          <span className="text-xs font-black text-foreground font-mono">
                            {formatMoney(stats.totalValue)} so'm
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary"
                              title="Zaxirani ko'rish"
                              onClick={() => { setViewStockWarehouse(w); setStockSearch(""); }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground"
                                  title="Tahrirlash"
                                  onClick={() => handleEditClick(w)}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-rose-500"
                                  title="O'chirish"
                                  onClick={() => setDeleteConfirmId(w.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>

              {/* Footer row — totals */}
              {displayedWarehouses.length > 0 && (
                <tfoot className="bg-muted/20 border-t-2 border-border/30">
                  <tr>
                    {isAdmin && <td />}
                    <td className="px-2 py-3" />
                    <td className="px-3 py-3 text-xs font-black text-muted-foreground" colSpan={4}>
                      Jami {displayedWarehouses.length} та ombor
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-black text-emerald-600">
                        {formatMoney(Object.values(warehouseStats).reduce((a, s) => a + s.totalStock, 0))}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-black text-muted-foreground">
                        {Object.values(warehouseStats).reduce((a, s) => a + s.productCount, 0)} та
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-xs font-black text-foreground">
                        {formatMoney(Object.values(warehouseStats).reduce((a, s) => a + s.totalValue, 0))} so'm
                      </span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {!isLoading && displayedWarehouses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-muted-foreground/30">
              <WarehouseIcon className="w-16 h-16 mb-4" />
              <p className="font-black uppercase tracking-[0.3em] text-xs">
                {search ? "Qidiruv natijasi topilmadi" : "Hozircha omborlar yo'q"}
              </p>
            </div>
          )}
        </div>

        {/* ── Add/Edit Dialog ── */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="rounded-[2rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-lg p-0 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 border-b border-border/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <WarehouseIcon className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-black tracking-tight">
                {editingWarehouse ? "Omborni tahrirlash" : "Yangi ombor qo'shish"}
              </DialogTitle>
            </div>

            {/* iiko-style form */}
            <div className="px-8 py-6 space-y-4">
              {[
                { label: "Ombor nomi *", field: "name", placeholder: "Masalan: Asosiy ombor" },
                { label: "Menejer (Mas'ul shaxs)", field: "managerName", placeholder: "Ism familiya" },
                { label: "Manzil", field: "address", placeholder: "Ko'cha, shahar" },
                { label: "Telefon", field: "phoneNumber", placeholder: "+998 90 123 45 67" },
                { label: "Izoh", field: "comment", placeholder: "Qo'shimcha ma'lumot" },
              ].map(({ label, field, placeholder }) => (
                <div key={field} className="flex items-center gap-4">
                  <Label className="w-40 text-xs text-right text-muted-foreground shrink-0">{label}:</Label>
                  <Input
                    className="h-9 flex-1 text-sm bg-background/80 border-border/40 rounded-lg font-bold"
                    placeholder={placeholder}
                    value={(formData as any)[field]}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  />
                </div>
              ))}
              {/* Type */}
              <div className="flex items-center gap-4">
                <Label className="w-40 text-xs text-right text-muted-foreground shrink-0">Ombor turi:</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger className="h-9 flex-1 text-sm bg-background/80 border-border/40 rounded-lg font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {WAREHOUSE_TYPES.map((tp) => (
                      <SelectItem key={tp} value={tp} className="text-sm font-bold">{tp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="px-8 pb-6 gap-2">
              <Button variant="ghost" className="h-10 rounded-xl font-bold px-5" onClick={handleCloseDialog}>
                <X className="w-3.5 h-3.5 mr-1.5" /> Bekor qilish
              </Button>
              <Button
                className="h-10 px-6 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest gap-2 border-none"
                onClick={handleSave}
                disabled={isSaving || !formData.name}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editingWarehouse ? "Saqlash" : "Qo'shish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirm Dialog ── */}
        <Dialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
          <DialogContent className="rounded-[2rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-sm p-8 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto mb-4">
              <Trash2 className="w-7 h-7" />
            </div>
            <DialogTitle className="text-lg font-black mb-2">Omborni o'chirish</DialogTitle>
            <p className="text-muted-foreground text-sm font-medium mb-6">
              Haqiqatdan ham ushbu omborni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 h-11 rounded-xl font-bold" onClick={() => setDeleteConfirmId(null)}>
                Bekor qilish
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl bg-rose-600 text-white font-black border-none"
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              >
                O'chirish
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Stock View Dialog ── */}
        <Dialog open={!!viewStockWarehouse} onOpenChange={(open) => !open && setViewStockWarehouse(null)}>
          <DialogContent className="rounded-[2rem] border-white/5 bg-background/70 backdrop-blur-[40px] text-foreground max-w-4xl p-0 shadow-2xl overflow-hidden">
            <div className="flex flex-col h-[80vh]">
              {/* Header */}
              <div className="px-8 py-6 border-b border-border/20 bg-primary/[0.02]">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-xl font-black tracking-tight">{viewStockWarehouse?.name}</h2>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{viewStockWarehouse?.address || "—"}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{viewStockWarehouse?.managerName || "—"}</span>
                      <Badge variant="outline" className="text-[10px] font-black px-2 rounded-md border-primary/20 text-primary bg-primary/5">
                        {viewStockWarehouse?.type || "Производственный"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="px-4 py-2 rounded-xl bg-muted/20 border border-border/20 text-center">
                      <p className="text-[9px] font-black uppercase text-muted-foreground mb-0.5">Jami SKU</p>
                      <p className="text-lg font-black text-primary">{filteredWarehouseStock.length}</p>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-muted/20 border border-border/20 text-center">
                      <p className="text-[9px] font-black uppercase text-muted-foreground mb-0.5">Jami qoldiq</p>
                      <p className="text-lg font-black">
                        {filteredWarehouseStock.reduce((a, i) => a + (i.stock || 0), 0)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input
                    placeholder="Mahsulot nomi yoki SKU kodi..."
                    className="h-10 pl-11 text-sm rounded-xl bg-background/60 border-border/40 font-bold"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/20 border-b border-border/20 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 w-8 text-center text-[10px] font-black uppercase text-muted-foreground">№</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground w-24">SKU</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground">Mahsulot nomi</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground text-center w-32">Qoldiq</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground w-20">O'lchov</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground text-right w-36">Narxi</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground text-right w-36">Umumiy qiymat</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground text-center w-24">Holati</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    <AnimatePresence mode="popLayout">
                      {filteredWarehouseStock.map((item: any, idx) => {
                        const isLow = item.stock > 0 && item.stock <= 10;
                        const isOut = item.stock <= 0;
                        const unitLabel = t.units[item.unit as keyof typeof t.units] || item.unit;
                        const totalVal = item.stock * item.price;

                        return (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className={cn(
                              "hover:bg-primary/[0.02] transition-colors",
                              isOut && "bg-rose-500/[0.02]",
                              isLow && "bg-amber-500/[0.02]"
                            )}
                          >
                            <td className="px-4 py-2.5 text-center text-xs font-bold text-muted-foreground">{idx + 1}</td>
                            <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{item.sku}</td>
                            <td className="px-3 py-2.5 font-black text-sm">{item.productName}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={cn(
                                "inline-block px-3 py-1 rounded-lg text-xs font-black",
                                isOut ? "bg-rose-500/10 text-rose-600"
                                  : isLow ? "bg-amber-500/10 text-amber-600"
                                    : "bg-emerald-500/10 text-emerald-600"
                              )}>
                                {item.stock}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground font-bold">{unitLabel}</td>
                            <td className="px-3 py-2.5 text-right text-xs font-mono font-black">{formatMoney(item.price)} so'm</td>
                            <td className="px-3 py-2.5 text-right text-xs font-mono font-black text-primary">{formatMoney(totalVal)} so'm</td>
                            <td className="px-3 py-2.5 text-center">
                              {isOut ? (
                                <Badge className="text-[9px] font-black bg-rose-500/10 text-rose-600 border-none">Tugagan</Badge>
                              ) : isLow ? (
                                <Badge className="text-[9px] font-black bg-amber-500/10 text-amber-600 border-none">Kam</Badge>
                              ) : (
                                <Badge className="text-[9px] font-black bg-emerald-500/10 text-emerald-600 border-none">
                                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Yetarli
                                </Badge>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                  {filteredWarehouseStock.length > 0 && (
                    <tfoot className="bg-muted/20 border-t-2 border-border/30">
                      <tr>
                        <td colSpan={5} className="px-4 py-2.5 text-xs font-black text-muted-foreground">
                          Jami {filteredWarehouseStock.length} та mahsulot
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-black">—</td>
                        <td className="px-3 py-2.5 text-right text-xs font-black text-primary">
                          {formatMoney(filteredWarehouseStock.reduce((a, i) => a + i.stock * i.price, 0))} so'm
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>

                {filteredWarehouseStock.length === 0 && (
                  <div className="py-24 text-center text-muted-foreground/30 flex flex-col items-center">
                    <Package className="w-14 h-14 mb-3" />
                    <p className="font-black uppercase tracking-widest text-xs">
                      {stockSearch ? "Qidiruv natijasi topilmadi" : "Ombor bo'sh"}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-4 border-t border-border/20 bg-primary/[0.02] flex justify-end">
                <Button
                  className="h-10 px-8 rounded-xl font-black text-xs uppercase tracking-widest bg-primary text-white border-none"
                  onClick={() => setViewStockWarehouse(null)}
                >
                  Yopish
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
