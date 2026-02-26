
"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  Search, 
  Plus, 
  Loader2, 
  Trash2, 
  Edit2, 
  Hash, 
  Folder, 
  FolderPlus,
  ChevronRight,
  MoreVertical,
  Filter,
  ArrowLeft,
  PackagePlus
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function ProductsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [newCategoryName, setNewCategoryName] = useState("");

  const canEdit = role === "Super Admin" || role === "Admin";

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    unit: "pcs",
    categoryId: ""
  });

  // --- Data Fetching ---
  const productsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "products");
  }, [db, user]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const categoriesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "categories");
  }, [db, user]);
  const { data: categories, isLoading: categoriesLoading } = useCollection(categoriesQuery);

  // --- Logic ---
  const calculateNextSku = () => {
    if (!products || products.length === 0) return "0001";
    const skus = products
      .map(p => parseInt(p.sku, 10))
      .filter(n => !isNaN(n));
    const maxSku = skus.length > 0 ? Math.max(...skus) : 0;
    return (maxSku + 1).toString().padStart(4, '0');
  };

  const filteredProducts = useMemo(() => {
    if (!products || selectedCategoryId === "all") return [];
    
    return products
      .filter(p => p.categoryId === selectedCategoryId)
      .filter(p => {
        return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
               (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      })
      .sort((a, b) => {
        const skuA = a.sku || "";
        const skuB = b.sku || "";
        const numA = parseInt(skuA, 10);
        const numB = parseInt(skuB, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return skuA.localeCompare(skuB);
      });
  }, [products, searchQuery, selectedCategoryId]);

  const currentCategory = categories?.find(c => c.id === selectedCategoryId);

  const formatMoney = (val: number) => val.toLocaleString().replace(/,/g, ' ');

  // --- Actions ---
  const handleSave = () => {
    if (!db || !user || !formData.name || !formData.sku) return;
    
    setIsSaving(true);
    const productId = editingProduct ? editingProduct.id : doc(collection(db, "products")).id;
    const productRef = doc(db, "products", productId);
    
    const productData: any = {
      id: productId,
      name: formData.name,
      sku: formData.sku,
      unit: formData.unit,
      categoryId: formData.categoryId || null,
      updatedAt: new Date().toISOString()
    };

    if (!editingProduct) {
      productData.salePrice = 0;
      productData.stock = 0;
      productData.lowStockThreshold = 10;
      productData.isDeleted = false;
      productData.createdAt = new Date().toISOString();
    }

    setDoc(productRef, productData, { merge: true })
      .then(() => {
        handleCloseDialog();
        toast({ title: "Muvaffaqiyatli", description: editingProduct ? "Mahsulot tahrirlandi." : "Yangi mahsulot qo'shildi." });
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: productRef.path,
          operation: editingProduct ? 'update' : 'create',
          requestResourceData: productData
        }));
      })
      .finally(() => setIsSaving(false));
  };

  const handleCreateCategory = async () => {
    if (!db || !newCategoryName) return;
    setIsSaving(true);
    const id = doc(collection(db, "categories")).id;
    try {
      await setDoc(doc(db, "categories", id), {
        id,
        name: newCategoryName,
        createdAt: new Date().toISOString()
      });
      setNewCategoryName("");
      setIsCategoryDialogOpen(false);
      toast({ title: "Papka yaratildi", description: `"${newCategoryName}" toifasi qo'shildi.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik", description: "Toifani yaratishda xato." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!db || !confirm(`"${name}" papkasini o'chirishni tasdiqlaysizmi? (Ichidagi mahsulotlar o'chmaydi)`)) return;
    try {
      await deleteDoc(doc(db, "categories", id));
      if (selectedCategoryId === id) setSelectedCategoryId("all");
      toast({ title: "O'chirildi", description: "Toifa muvaffaqiyatli o'chirildi." });
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik", description: "Toifani o'chirishda xato." });
    }
  };

  const handleAddNewClick = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: calculateNextSku(),
      unit: "pcs",
      categoryId: selectedCategoryId !== "all" ? selectedCategoryId : ""
    });
    setIsDialogOpen(true);
  };

  const handleEditClick = (p: any) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku || "",
      unit: p.unit || "pcs",
      categoryId: p.categoryId || ""
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setFormData({ name: "", sku: "", unit: "pcs", categoryId: "" });
  };

  const handleDelete = (id: string) => {
    if (!db) return;
    if (!confirm("Haqiqatdan ham ushbu mahsulotni o'chirmoqchimisiz?")) return;
    const ref = doc(db, "products", id);
    deleteDocumentNonBlocking(ref);
    toast({ title: "O'chirildi", description: "Mahsulot muvaffaqiyatli o'chirildi." });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!db || selectedIds.length === 0) return;
    if (!confirm(`${selectedIds.length} ta mahsulotni o'chirishni tasdiqlaysizmi?`)) return;

    setIsBulkDeleting(true);
    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, "products", id));
      }
      setSelectedIds([]);
      toast({ title: "Muvaffaqiyatli", description: "Tanlangan mahsulotlar o'chirildi." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Xatolik", description: "O'chirishda xato yuz berdi." });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 p-6 md:p-10 overflow-y-auto page-transition flex flex-col gap-8"
      >
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            {selectedCategoryId !== "all" && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full h-12 w-12 hover:bg-muted"
                onClick={() => setSelectedCategoryId("all")}
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground">
                {selectedCategoryId === "all" ? t.products.title : currentCategory?.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                {selectedCategoryId === "all" ? "Papkalar bo'yicha saralangan katalog" : `${filteredProducts.length} ta mahsulot`}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {selectedIds.length > 0 && canEdit && (
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="gap-2 font-black uppercase tracking-widest text-[10px] h-12 px-6 rounded-2xl shadow-xl shadow-rose-500/20"
              >
                {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {t.actions.deleteSelected} ({selectedIds.length})
              </Button>
            )}

            {canEdit && (
              <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddNewClick} className="gap-2 font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl premium-button shadow-xl shadow-primary/20 bg-primary text-white border-none">
                    <Plus className="w-4 h-4" /> {t.products.addNew}
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[2.5rem] border-white/5 bg-black/90 backdrop-blur-3xl text-white max-w-lg p-8">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                      <Package className="text-primary w-6 h-6" /> {editingProduct ? t.actions.edit : t.products.addNew}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">Mahsulot nomi</Label>
                      <Input 
                        className="h-12 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20 font-bold"
                        value={formData.name} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Masalan: Stol" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">{t.products.sku}</Label>
                        <Input 
                          className="h-12 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20 font-bold"
                          value={formData.sku} 
                          placeholder="0001" 
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">{t.units.label}</Label>
                        <Select value={formData.unit} onValueChange={(val) => setFormData({...formData, unit: val})}>
                          <SelectTrigger className="h-12 rounded-2xl bg-white/5 border-white/10 font-bold">
                            <SelectValue placeholder="Tanlang" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-white/10 bg-black text-white max-h-[300px]">
                            <SelectItem value="pcs">{t.units.pcs}</SelectItem>
                            <SelectItem value="kg">{t.units.kg}</SelectItem>
                            <SelectItem value="g">{t.units.g}</SelectItem>
                            <SelectItem value="m">{t.units.m}</SelectItem>
                            <SelectItem value="cm">{t.units.cm}</SelectItem>
                            <SelectItem value="l">{t.units.l}</SelectItem>
                            <SelectItem value="ml">{t.units.ml}</SelectItem>
                            <SelectItem value="m2">{t.units.m2}</SelectItem>
                            <SelectItem value="m3">{t.units.m3}</SelectItem>
                            <SelectItem value="set">{t.units.set}</SelectItem>
                            <SelectItem value="bag">{t.units.bag}</SelectItem>
                            <SelectItem value="box">{t.units.box}</SelectItem>
                            <SelectItem value="pack">{t.units.pack}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">Papka (Toifa)</Label>
                      <Select value={formData.categoryId} onValueChange={(val) => setFormData({...formData, categoryId: val})}>
                        <SelectTrigger className="h-12 rounded-2xl bg-white/5 border-white/10 font-bold">
                          <SelectValue placeholder="Toifasiz" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-white/10 bg-black text-white">
                          <SelectItem value="none">Toifasiz</SelectItem>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className="mt-10 gap-2">
                    <Button variant="ghost" className="rounded-2xl h-12 hover:bg-white/5 text-white/60" onClick={handleCloseDialog}>{t.actions.cancel}</Button>
                    <Button className="rounded-2xl h-12 px-8 bg-primary text-white font-black uppercase tracking-widest text-[10px] border-none shadow-xl shadow-primary/20" onClick={handleSave} disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.actions.save}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Sidebar logic for small screens or filters */}
          <Card className="w-full lg:w-72 border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shrink-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground opacity-50">Papkalar</h3>
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 text-primary">
                      <FolderPlus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[2rem] max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="font-black">Yangi papka yaratish</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Papka nomi</Label>
                      <Input 
                        placeholder="Masalan: Filterlar" 
                        value={newCategoryName} 
                        onChange={(e) => setNewCategoryName(e.target.value)} 
                        className="rounded-xl h-12"
                      />
                    </div>
                    <DialogFooter>
                      <Button className="w-full rounded-xl bg-primary text-white font-black h-12" onClick={handleCreateCategory} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yaratish"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-1">
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedCategoryId("all")}
                  className={cn(
                    "w-full justify-start gap-3 rounded-xl h-11 font-bold transition-all",
                    selectedCategoryId === "all" ? "bg-primary text-white shadow-lg shadow-primary/20" : "hover:bg-muted"
                  )}
                >
                  <Filter className="w-4 h-4" /> Barcha papkalar
                </Button>
                
                {categoriesLoading ? (
                  <div className="py-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin opacity-20" /></div>
                ) : (
                  categories?.map((cat) => (
                    <div key={cat.id} className="group relative">
                      <Button 
                        variant="ghost" 
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={cn(
                          "w-full justify-start gap-3 rounded-xl h-11 font-bold transition-all pr-10",
                          selectedCategoryId === cat.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "hover:bg-muted"
                        )}
                      >
                        <Folder className={cn("w-4 h-4", selectedCategoryId === cat.id ? "fill-white/20" : "fill-primary/10 text-primary")} />
                        <span className="truncate">{cat.name}</span>
                      </Button>
                      
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem className="text-rose-500 font-bold gap-2 cursor-pointer" onClick={() => handleDeleteCategory(cat.id, cat.name)}>
                              <Trash2 className="w-3.5 h-3.5" /> O'chirish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Main Content Area */}
          <div className="flex-1 w-full space-y-6">
            {(productsLoading || categoriesLoading || authLoading) ? (
              <div className="flex justify-center py-32">
                <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
              </div>
            ) : selectedCategoryId === "all" ? (
              /* FOLDERS GRID VIEW - Default */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {categories?.map((cat, idx) => (
                    <motion.div
                      key={cat.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card 
                        className="cursor-pointer hover:bg-primary/[0.03] hover:-translate-y-1 transition-all group border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden relative"
                        onClick={() => setSelectedCategoryId(cat.id)}
                      >
                        <CardContent className="p-10 flex flex-col items-center text-center gap-6">
                          <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
                            <Folder className="w-12 h-12 fill-primary/20" />
                          </div>
                          <div>
                            <h3 className="font-black text-2xl tracking-tight text-foreground">{cat.name}</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 mt-2">
                              {products?.filter(p => p.categoryId === cat.id).length || 0} ta mahsulot
                            </p>
                          </div>
                          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                             <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
                                <ChevronRight className="w-5 h-5" />
                             </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                  
                  {/* Create Folder Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (categories?.length || 0) * 0.05 }}
                  >
                    <Card 
                      className="cursor-pointer hover:bg-primary/5 transition-all group border-2 border-dashed border-primary/20 bg-transparent rounded-[2.5rem] overflow-hidden h-full flex items-center justify-center"
                      onClick={() => setIsCategoryDialogOpen(true)}
                    >
                      <CardContent className="p-10 flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center text-primary/30 group-hover:scale-110 transition-transform">
                          <FolderPlus className="w-8 h-8" />
                        </div>
                        <p className="font-black text-[11px] uppercase tracking-widest text-primary/60">Yangi papka qo'shish</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              </div>
            ) : (
              /* PRODUCTS TABLE VIEW - When Folder Selected */
              <div className="space-y-6">
                <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem]">
                  <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input 
                        placeholder={t.products.search} 
                        className="pl-12 h-12 rounded-2xl bg-background/50 border-border/40 focus:border-primary/50 transition-all font-medium" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none glass-card overflow-hidden bg-card/40 backdrop-blur-xl rounded-[2.5rem]">
                  <div className="relative overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[10px] uppercase bg-muted/30 text-muted-foreground font-black tracking-[0.2em]">
                        <tr>
                          {canEdit && (
                            <th className="px-6 py-6 w-10">
                              <Checkbox 
                                checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                                onCheckedChange={toggleSelectAll}
                                className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            </th>
                          )}
                          <th className="px-8 py-6">{t.products.productInfo}</th>
                          <th className="px-6 py-6">{t.products.sku}</th>
                          <th className="px-6 py-6">Papka</th>
                          <th className="px-6 py-6">{t.products.stock}</th>
                          <th className="px-6 py-6">{t.products.price}</th>
                          <th className="px-6 py-6">{t.products.status}</th>
                          {canEdit && <th className="px-6 py-6"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        <AnimatePresence mode="popLayout">
                          {filteredProducts.map((p: any, idx) => {
                            const productCategory = categories?.find(c => c.id === p.categoryId);
                            return (
                              <motion.tr 
                                key={p.id} 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className={cn(
                                  "hover:bg-primary/[0.02] transition-colors group cursor-pointer",
                                  selectedIds.includes(p.id) && "bg-primary/[0.04]"
                                )}
                                onClick={() => canEdit && toggleSelect(p.id)}
                              >
                                {canEdit && (
                                  <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox 
                                      checked={selectedIds.includes(p.id)}
                                      onCheckedChange={() => toggleSelect(p.id)}
                                      className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    />
                                  </td>
                                )}
                                <td className="px-8 py-5">
                                  <div className="flex items-center gap-4">
                                    <motion.div 
                                      whileHover={{ scale: 1.1, rotate: 5 }}
                                      className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"
                                    >
                                      <Package className="w-5.5 h-5.5" />
                                    </motion.div>
                                    <span className="font-black text-foreground tracking-tight">{p.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase opacity-60">
                                    <Hash className="w-3 h-3" /> {p.sku || '---'}
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-2">
                                    <Folder className="w-3.5 h-3.5 text-muted-foreground/40" />
                                    <span className="text-xs font-bold text-muted-foreground">{productCategory?.name || '---'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-5 font-black text-sm">
                                  {p.stock || 0} <span className="text-[10px] opacity-40 font-bold uppercase ml-1">{t.units[p.unit as keyof typeof t.units] || p.unit}</span>
                                </td>
                                <td className="px-6 py-5 font-black text-sm">{formatMoney(p.salePrice || 0)} so'm</td>
                                <td className="px-6 py-5">
                                  <Badge 
                                    variant={(p.stock || 0) > (p.lowStockThreshold || 10) ? "default" : "destructive"}
                                    className={cn(
                                      "rounded-lg font-black text-[9px] uppercase tracking-widest px-3 py-1 border-none shadow-sm",
                                      (p.stock || 0) > (p.lowStockThreshold || 10) ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                                    )}
                                  >
                                    {(p.stock || 0) > (p.lowStockThreshold || 10) ? "Mavjud" : "Kam qolgan"}
                                  </Badge>
                                </td>
                                {canEdit && (
                                  <td className="px-6 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditClick(p);
                                        }}
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-9 w-9 rounded-xl hover:bg-rose-500/10 text-rose-500"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(p.id);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </td>
                                )}
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </Card>

                {filteredProducts.length === 0 && (
                  <div className="py-32 text-center opacity-10 flex flex-col items-center gap-4">
                    <PackagePlus className="w-20 h-20" />
                    <p className="text-sm font-black uppercase tracking-[0.5em]">Bu papka bo'sh</p>
                    <Button onClick={handleAddNewClick} variant="outline" className="rounded-xl border-dashed">
                      Mahsulot qo'shish
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.main>
    </div>
  );
}
