"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package, Search, Plus, Loader2, Trash2, Edit2, Hash,
  Folder, FolderPlus, ChevronRight, MoreVertical, X,
  Table as TableIcon, RefreshCw, Save, ChevronUp, ChevronDown,
  AlertTriangle, CheckCircle2, FolderOpen,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type SortField = "name" | "sku" | "stock" | "salePrice";
type SortDir = "asc" | "desc";

export default function ProductsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();

  const canEdit = role === "Super Admin" || role === "Admin";
  const canAdd = canEdit || role === "Sotuvchi";

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Category tree state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<any>(null);

  // Table controls
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("sku");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [formData, setFormData] = useState({
    name: "", sku: "", unit: "pcs", categoryId: "",
    salePrice: 0, lowStockThreshold: 10,
  });

  // Firebase
  const productsQuery = useMemoFirebase(() => (db && user ? collection(db, "products") : null), [db, user]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const categoriesQuery = useMemoFirebase(() => (db && user ? collection(db, "categories") : null), [db, user]);
  const { data: categories, isLoading: categoriesLoading } = useCollection(categoriesQuery);

  // Auto SKU
  const calculateNextSku = () => {
    if (!products || products.length === 0) return "0001";
    const skus = products.map((p) => parseInt(p.sku, 10)).filter((n) => !isNaN(n));
    return ((skus.length > 0 ? Math.max(...skus) : 0) + 1).toString().padStart(4, "0");
  };

  // Filtered + sorted products
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = searchQuery.toLowerCase().trim();
    let list = products.filter((p) => {
      const matchCat = selectedCategoryId === "all" || p.categoryId === selectedCategoryId;
      const matchQ = !q || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
    list = [...list].sort((a, b) => {
      let va: any = a[sortField] ?? "";
      let vb: any = b[sortField] ?? "";
      if (sortField === "sku") {
        const na = parseInt(a.sku, 10), nb = parseInt(b.sku, 10);
        if (!isNaN(na) && !isNaN(nb)) { va = na; vb = nb; }
      }
      if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return list;
  }, [products, searchQuery, selectedCategoryId, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };
  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field
      ? sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <ChevronUp className="w-3 h-3 opacity-20" />;

  // Excel export
  const exportToExcel = async () => {
    try {
      const XLSXModule = await import("xlsx");
      const XLSX = (XLSXModule as any).default || XLSXModule;
      const ws = XLSX.utils.json_to_sheet(
        filteredProducts.map((p) => ({
          "Kod": p.sku, "Nomi": p.name, "Birlik": p.unit,
          "Zaxira": p.stock, "Narx": p.salePrice,
          "Guruh": categories?.find((c) => c.id === p.categoryId)?.name || "—",
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Katalog");
      XLSX.writeFile(wb, `Mahsulotlar_${Date.now()}.xlsx`);
      toast({ title: "Excel yuklandi" });
    } catch {
      toast({ variant: "destructive", title: "Excel eksportida xatolik" });
    }
  };

  // CRUD
  const handleSave = () => {
    if (!db || !user || !formData.name || !formData.sku) return;
    setIsSaving(true);
    const productId = editingProduct ? editingProduct.id : doc(collection(db, "products")).id;
    const productRef = doc(db, "products", productId);
    const data: any = {
      id: productId, name: formData.name, sku: formData.sku,
      unit: formData.unit, categoryId: formData.categoryId || null,
      salePrice: formData.salePrice, lowStockThreshold: formData.lowStockThreshold,
      updatedAt: new Date().toISOString(),
    };
    if (!editingProduct) {
      data.stock = 0; data.isDeleted = false; data.createdAt = new Date().toISOString();
    }
    setDoc(productRef, data, { merge: true })
      .then(() => { handleCloseDialog(); toast({ title: "Muvaffaqiyatli saqlandi" }); })
      .finally(() => setIsSaving(false));
  };

  const handleEditClick = (p: any) => {
    setEditingProduct(p);
    setFormData({ name: p.name, sku: p.sku || "", unit: p.unit || "pcs", categoryId: p.categoryId || "", salePrice: p.salePrice || 0, lowStockThreshold: p.lowStockThreshold || 10 });
    setIsDialogOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingProduct(null);
    setFormData({ name: "", sku: calculateNextSku(), unit: "pcs", categoryId: selectedCategoryId !== "all" ? selectedCategoryId : "", salePrice: 0, lowStockThreshold: 10 });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false); setEditingProduct(null);
    setFormData({ name: "", sku: "", unit: "pcs", categoryId: "", salePrice: 0, lowStockThreshold: 10 });
  };

  const handleDelete = (id: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, "products", id));
    setDeleteConfirmId(null);
    toast({ title: "O'chirildi" });
  };

  const handleBulkDelete = async () => {
    if (!db || selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      for (const id of selectedIds) await deleteDoc(doc(db, "products", id));
      setSelectedIds([]); toast({ title: "Muvaffaqiyatli o'chirildi" });
    } finally { setIsBulkDeleting(false); }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === filteredProducts.length ? [] : filteredProducts.map((p) => p.id));

  // Category CRUD
  const handleCreateCategory = async () => {
    if (!db || !newCategoryName.trim()) return;
    setIsSaving(true);
    const id = editingCategory ? editingCategory.id : doc(collection(db, "categories")).id;
    try {
      await setDoc(doc(db, "categories", id), {
        id, name: newCategoryName, createdAt: editingCategory?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setNewCategoryName(""); setIsCategoryDialogOpen(false); setEditingCategory(null);
      toast({ title: editingCategory ? "Guruh yangilandi" : "Guruh yaratildi" });
    } finally { setIsSaving(false); }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!db || !confirm(`"${name}" guruhini o'chirmoqchimisiz?`)) return;
    await deleteDoc(doc(db, "categories", id));
    if (selectedCategoryId === id) setSelectedCategoryId("all");
    toast({ title: "Guruh o'chirildi" });
  };

  const formatMoney = (v: number) => v?.toLocaleString("ru-RU") ?? "0";

  const isLoading = productsLoading || categoriesLoading || authLoading;

  // Category product counts
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products?.forEach((p) => { if (p.categoryId) counts[p.categoryId] = (counts[p.categoryId] || 0) + 1; });
    return counts;
  }, [products]);

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ── iiko-style header ── */}
        <div className="px-6 pt-5 pb-4 border-b border-border/20 bg-card/30 flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {t.products.title}
            {selectedCategoryId !== "all" && (
              <span className="text-muted-foreground font-normal text-sm flex items-center gap-1">
                <ChevronRight className="w-4 h-4" />
                {categories?.find((c) => c.id === selectedCategoryId)?.name}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-bold mr-1">
              Jami: <span className="text-foreground font-black">{filteredProducts.length}</span> ta mahsulot
            </span>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs rounded-lg gap-1.5" onClick={() => window.location.reload()}>
              <RefreshCw className="w-3.5 h-3.5" /> Yangilash
            </Button>
            {filteredProducts.length > 0 && (
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs rounded-lg gap-1.5 text-emerald-600 border-emerald-600/20" onClick={exportToExcel}>
                <TableIcon className="w-3.5 h-3.5" /> Excel
              </Button>
            )}
            {selectedIds.length > 0 && canEdit && (
              <Button size="sm" variant="outline"
                className="h-8 px-3 text-xs rounded-lg gap-1.5 text-rose-600 border-rose-600/20 hover:bg-rose-600/5"
                onClick={handleBulkDelete} disabled={isBulkDeleting}>
                {isBulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {selectedIds.length} ta o'chirish
              </Button>
            )}
            {canAdd && (
              <Button size="sm" className="h-8 px-4 text-xs font-black rounded-lg gap-1.5 bg-primary text-white border-none" onClick={handleAddNewClick}>
                <Plus className="w-3.5 h-3.5" /> Mahsulot qo'shish
              </Button>
            )}
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="px-6 py-3 border-b border-border/10 flex items-center gap-3 bg-muted/5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Mahsulot nomi yoki tavar kodi..."
              className="h-8 pl-9 pr-8 text-xs rounded-lg bg-background/80 border-border/40"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-rose-500"
                onClick={() => setSearchQuery("")}>
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* ── Main layout: sidebar + table ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── Category tree sidebar ── */}
          <div className="w-56 border-r border-border/20 bg-muted/5 flex flex-col overflow-y-auto shrink-0">
            <div className="px-3 py-3 border-b border-border/10 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Guruhlar</span>
              {canEdit && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" title="Yangi guruh"
                  onClick={() => { setEditingCategory(null); setNewCategoryName(""); setIsCategoryDialogOpen(true); }}>
                  <FolderPlus className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            <div className="p-2 space-y-0.5">
              {/* All */}
              <button
                onClick={() => setSelectedCategoryId("all")}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left transition-colors",
                  selectedCategoryId === "all"
                    ? "bg-primary text-white"
                    : "hover:bg-muted/50 text-foreground"
                )}
              >
                <Package className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 truncate">Barcha mahsulotlar</span>
                <span className={cn("text-[10px] font-black shrink-0", selectedCategoryId === "all" ? "text-white/70" : "text-muted-foreground")}>
                  {products?.length || 0}
                </span>
              </button>

              {/* Uncategorized */}
              <button
                onClick={() => setSelectedCategoryId("none")}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left transition-colors",
                  selectedCategoryId === "none"
                    ? "bg-primary text-white"
                    : "hover:bg-muted/50 text-foreground"
                )}
              >
                <Folder className="w-3.5 h-3.5 shrink-0 opacity-40" />
                <span className="flex-1 truncate">Guruhlenmagan</span>
                <span className={cn("text-[10px] font-black shrink-0", selectedCategoryId === "none" ? "text-white/70" : "text-muted-foreground")}>
                  {products?.filter((p) => !p.categoryId).length || 0}
                </span>
              </button>

              {/* Separator */}
              {categories && categories.length > 0 && (
                <div className="my-1 border-t border-border/10" />
              )}

              {/* Categories */}
              {categories?.map((cat) => (
                <div key={cat.id} className="group relative">
                  <button
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left transition-colors pr-8",
                      selectedCategoryId === cat.id
                        ? "bg-primary text-white"
                        : "hover:bg-muted/50 text-foreground"
                    )}
                  >
                    {selectedCategoryId === cat.id
                      ? <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                      : <Folder className="w-3.5 h-3.5 shrink-0 text-primary" />
                    }
                    <span className="flex-1 truncate">{cat.name}</span>
                    <span className={cn("text-[10px] font-black shrink-0", selectedCategoryId === cat.id ? "text-white/70" : "text-muted-foreground")}>
                      {catCounts[cat.id] || 0}
                    </span>
                  </button>
                  {canEdit && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl text-xs">
                          <DropdownMenuItem className="font-bold gap-2 cursor-pointer" onClick={() => { setEditingCategory(cat); setNewCategoryName(cat.name); setIsCategoryDialogOpen(true); }}>
                            <Edit2 className="w-3 h-3" /> Tahrirlash
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-rose-500 font-bold gap-2 cursor-pointer" onClick={() => handleDeleteCategory(cat.id, cat.name)}>
                            <Trash2 className="w-3 h-3" /> O'chirish
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              ))}

              {/* New category shortcut */}
              {canEdit && (
                <button
                  onClick={() => { setEditingCategory(null); setNewCategoryName(""); setIsCategoryDialogOpen(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left text-primary/40 hover:text-primary hover:bg-primary/5 transition-colors border border-dashed border-primary/10 mt-2"
                >
                  <FolderPlus className="w-3.5 h-3.5 shrink-0" />
                  <span>Yangi guruh</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Products table ── */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-30" />
              </div>
            ) : (
              <>
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/20 border-b border-border/20 sticky top-0 z-10">
                    <tr>
                      {canEdit && (
                        <th className="px-4 py-3 w-10">
                          <Checkbox
                            checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                      )}
                      <th className="px-3 py-3 w-8 text-center text-[10px] font-black uppercase text-muted-foreground">№</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground cursor-pointer hover:text-foreground transition-colors w-24" onClick={() => handleSort("sku")}>
                        <span className="flex items-center gap-1">Kod <SortIcon field="sku" /></span>
                      </th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("name")}>
                        <span className="flex items-center gap-1">Mahsulot nomi <SortIcon field="name" /></span>
                      </th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground w-24">O'lchov</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground w-32">Guruh</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground text-center cursor-pointer hover:text-foreground w-28" onClick={() => handleSort("stock")}>
                        <span className="flex items-center gap-1 justify-center">Zaxira <SortIcon field="stock" /></span>
                      </th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground text-right cursor-pointer hover:text-foreground w-32" onClick={() => handleSort("salePrice")}>
                        <span className="flex items-center gap-1 justify-end">Narxi <SortIcon field="salePrice" /></span>
                      </th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-muted-foreground text-center w-20">Holati</th>
                      {canEdit && <th className="px-3 py-3 w-20 text-[10px] font-black uppercase text-muted-foreground text-center">Amallar</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    <AnimatePresence mode="popLayout">
                      {filteredProducts.map((p: any, idx) => {
                        const cat = categories?.find((c) => c.id === p.categoryId);
                        const isSelected = selectedIds.includes(p.id);
                        const isLow = (p.stock || 0) > 0 && (p.stock || 0) <= (p.lowStockThreshold || 10);
                        const isOut = (p.stock || 0) <= 0;
                        const unitLabel = t.units[p.unit as keyof typeof t.units] || p.unit;

                        return (
                          <motion.tr
                            key={p.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: idx * 0.02 }}
                            className={cn(
                              "group hover:bg-primary/[0.02] transition-colors cursor-default",
                              isSelected && "bg-primary/[0.04]"
                            )}
                          >
                            {canEdit && (
                              <td className="px-4 py-2.5">
                                <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(p.id)} />
                              </td>
                            )}
                            {/* № */}
                            <td className="px-3 py-2.5 text-center text-xs font-bold text-muted-foreground">{idx + 1}</td>
                            {/* Kod */}
                            <td className="px-3 py-2.5 font-mono text-xs font-bold text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Hash className="w-3 h-3 opacity-40" />{p.sku || "—"}
                              </span>
                            </td>
                            {/* Nomi */}
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                  <Package className="w-4 h-4" />
                                </div>
                                <span className="font-black text-sm text-foreground">{p.name}</span>
                              </div>
                            </td>
                            {/* O'lchov */}
                            <td className="px-3 py-2.5 text-xs font-bold text-muted-foreground">{unitLabel}</td>
                            {/* Guruh */}
                            <td className="px-3 py-2.5">
                              {cat ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                                  <Folder className="w-3 h-3 text-primary opacity-60 shrink-0" />
                                  <span className="truncate max-w-[100px]">{cat.name}</span>
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/40 font-bold">—</span>
                              )}
                            </td>
                            {/* Zaxira */}
                            <td className="px-3 py-2.5 text-center">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black",
                                isOut ? "bg-rose-500/10 text-rose-600"
                                  : isLow ? "bg-amber-500/10 text-amber-600"
                                    : "bg-emerald-500/10 text-emerald-600"
                              )}>
                                {isOut && <AlertTriangle className="w-3 h-3" />}
                                {p.stock || 0}
                                <span className="opacity-60 text-[9px] ml-0.5">{unitLabel}</span>
                              </span>
                            </td>
                            {/* Narx */}
                            <td className="px-3 py-2.5 text-right font-black text-sm font-mono">
                              {formatMoney(p.salePrice || 0)}
                              <span className="text-[10px] text-muted-foreground font-normal ml-1">so'm</span>
                            </td>
                            {/* Holati */}
                            <td className="px-3 py-2.5 text-center">
                              {isOut ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Tugagan
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Kam
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Yetarli
                                </span>
                              )}
                            </td>
                            {/* Amallar */}
                            {canEdit && (
                              <td className="px-3 py-2.5">
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-muted"
                                    onClick={(e) => { e.stopPropagation(); handleEditClick(p); }}>
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-rose-500"
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(p.id); }}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>

                  {/* Footer totals */}
                  {filteredProducts.length > 0 && (
                    <tfoot className="bg-muted/20 border-t-2 border-border/30">
                      <tr>
                        {canEdit && <td />}
                        <td colSpan={3} className="px-3 py-2.5 text-xs font-black text-muted-foreground">
                          Jami {filteredProducts.length} та mahsulot
                        </td>
                        <td colSpan={2} />
                        <td className="px-3 py-2.5 text-center text-xs font-black text-emerald-600">
                          {filteredProducts.reduce((a, p) => a + (p.stock || 0), 0)} dona
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-black">
                          —
                        </td>
                        <td colSpan={canEdit ? 2 : 1} />
                      </tr>
                    </tfoot>
                  )}
                </table>

                {filteredProducts.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center py-28 text-muted-foreground/30">
                    <Package className="w-14 h-14 mb-3" />
                    <p className="font-black uppercase tracking-widest text-xs">
                      {searchQuery ? "Qidiruv natijasi topilmadi" : "Bu guruhda mahsulotlar yo'q"}
                    </p>
                    {canAdd && !searchQuery && (
                      <Button size="sm" className="mt-4 h-8 px-4 text-xs font-black rounded-lg gap-1.5 bg-primary text-white border-none opacity-60 hover:opacity-100" onClick={handleAddNewClick}>
                        <Plus className="w-3.5 h-3.5" /> Mahsulot qo'shish
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Add/Edit Product Dialog ── */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="rounded-[2rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-lg p-0 shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-border/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Package className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-black tracking-tight">
                {editingProduct ? "Mahsulotni tahrirlash" : "Yangi mahsulot qo'shish"}
              </DialogTitle>
            </div>

            <div className="px-8 py-6 space-y-4">
              {/* Nomi */}
              <div className="flex items-center gap-4">
                <Label className="w-36 text-xs text-right text-muted-foreground shrink-0">Mahsulot nomi *:</Label>
                <Input className="h-9 flex-1 text-sm bg-background/80 border-border/40 rounded-lg font-bold"
                  placeholder="Nomini yozing..." value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              {/* SKU */}
              <div className="flex items-center gap-4">
                <Label className="w-36 text-xs text-right text-muted-foreground shrink-0">Kod (SKU):</Label>
                <Input className="h-9 flex-1 text-sm bg-muted/20 border-border/30 rounded-lg font-mono font-bold text-muted-foreground"
                  value={formData.sku} disabled />
              </div>
              {/* Unit */}
              <div className="flex items-center gap-4">
                <Label className="w-36 text-xs text-right text-muted-foreground shrink-0">O'lchov birligi:</Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                  <SelectTrigger className="h-9 flex-1 text-sm bg-background/80 border-border/40 rounded-lg font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {["pcs", "kg", "g", "m", "l", "set", "box"].map((u) => (
                      <SelectItem key={u} value={u} className="text-sm font-bold">
                        {t.units[u as keyof typeof t.units] || u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Category */}
              <div className="flex items-center gap-4">
                <Label className="w-36 text-xs text-right text-muted-foreground shrink-0">Guruh:</Label>
                <Select value={formData.categoryId || "none"} onValueChange={(v) => setFormData({ ...formData, categoryId: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-9 flex-1 text-sm bg-background/80 border-border/40 rounded-lg font-bold">
                    <SelectValue placeholder="Guruhlenmagan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none" className="text-sm font-bold">Guruhlenmagan</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-sm font-bold">{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Sale price */}
              <div className="flex items-center gap-4">
                <Label className="w-36 text-xs text-right text-muted-foreground shrink-0">Sotuv narxi:</Label>
                <div className="flex flex-1 items-center gap-2">
                  <Input type="number" min={0} className="h-9 flex-1 text-sm bg-background/80 border-border/40 rounded-lg font-bold"
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })} />
                  <span className="text-xs text-muted-foreground font-bold shrink-0">so'm</span>
                </div>
              </div>
              {/* Low stock threshold */}
              <div className="flex items-center gap-4">
                <Label className="w-36 text-xs text-right text-muted-foreground shrink-0">Kam zaxira chegarasi:</Label>
                <div className="flex flex-1 items-center gap-2">
                  <Input type="number" min={0} className="h-9 flex-1 text-sm bg-background/80 border-border/40 rounded-lg font-bold"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })} />
                  <span className="text-xs text-muted-foreground font-bold shrink-0">dona</span>
                </div>
              </div>
            </div>

            <DialogFooter className="px-8 pb-6 gap-2">
              <Button variant="ghost" className="h-10 rounded-xl font-bold px-5" onClick={handleCloseDialog}>
                <X className="w-3.5 h-3.5 mr-1.5" /> Bekor qilish
              </Button>
              <Button className="h-10 px-6 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest gap-2 border-none"
                onClick={handleSave} disabled={isSaving || !formData.name}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editingProduct ? "Saqlash" : "Qo'shish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Category Dialog ── */}
        <Dialog open={isCategoryDialogOpen} onOpenChange={(o) => { if (!o) { setIsCategoryDialogOpen(false); setEditingCategory(null); setNewCategoryName(""); } }}>
          <DialogContent className="rounded-[2rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-sm p-8 shadow-2xl">
            <DialogHeader>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                <FolderPlus className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-black">{editingCategory ? "Guruhni tahrirlash" : "Yangi guruh yaratish"}</DialogTitle>
            </DialogHeader>
            <div className="py-4 flex items-center gap-3">
              <Label className="text-xs text-muted-foreground w-24 text-right shrink-0">Guruh nomi:</Label>
              <Input
                className="h-9 flex-1 text-sm bg-background/80 border-border/40 rounded-lg font-bold"
                placeholder="Guruh nomini yozing..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" className="h-10 rounded-xl font-bold" onClick={() => setIsCategoryDialogOpen(false)}>Bekor</Button>
              <Button className="h-10 px-5 rounded-xl bg-primary text-white font-black text-xs gap-2 border-none"
                onClick={handleCreateCategory} disabled={isSaving || !newCategoryName.trim()}>
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editingCategory ? "Saqlash" : "Yaratish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirm Dialog ── */}
        <Dialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
          <DialogContent className="rounded-[2rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-sm p-8 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-black mb-2">Mahsulotni o'chirish</DialogTitle>
            <p className="text-muted-foreground text-sm mb-6">Haqiqatdan ham bu mahsulotni o'chirmoqchimisiz?</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 h-10 rounded-xl font-bold" onClick={() => setDeleteConfirmId(null)}>Bekor</Button>
              <Button className="flex-1 h-10 rounded-xl bg-rose-600 text-white font-black border-none"
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
                O'chirish
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
