
"use client";

import { useState, useMemo } from "react";
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
import { Package, Search, Plus, Loader2, Trash2, Edit2, Hash, CheckSquare } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function ProductsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const canEdit = role === "Super Admin" || role === "Admin";

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    unit: "pcs"
  });

  const productsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "products");
  }, [db, user]);
  const { data: products, isLoading } = useCollection(productsQuery);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products
      .filter(p => {
        const matchesSearch = 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
      })
      .sort((a, b) => {
        const skuA = a.sku || "";
        const skuB = b.sku || "";
        const numA = parseInt(skuA, 10);
        const numB = parseInt(skuB, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return skuA.localeCompare(skuB);
      });
  }, [products, searchQuery]);

  const formatMoney = (val: number) => val.toLocaleString().replace(/,/g, ' ');

  const handleSave = () => {
    if (!db || !user || !formData.name || !formData.sku) return;
    
    setIsSaving(true);
    const productId = editingProduct ? editingProduct.id : formData.sku;
    const productRef = doc(db, "products", productId);
    
    const productData: any = {
      id: productId,
      name: formData.name,
      sku: formData.sku,
      unit: formData.unit,
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

  const handleEditClick = (p: any) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku || "",
      unit: p.unit || "pcs"
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setFormData({ name: "", sku: "", unit: "pcs" });
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
        className="flex-1 p-6 md:p-10 overflow-y-auto page-transition"
      >
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground">{t.products.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">{t.products.description}</p>
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
                  <Button onClick={() => setIsDialogOpen(true)} className="gap-2 font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl premium-button shadow-xl shadow-primary/20 bg-primary text-white border-none">
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
                          onChange={(e) => setFormData({...formData, sku: e.target.value})}
                          placeholder="Masalan: 0020" 
                          disabled={!!editingProduct}
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
                    {!editingProduct && (
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest bg-white/5 p-4 rounded-xl border border-white/5">
                        * Yangi mahsulot kodi (SKU) uning asosiy ID-si bo'lib xizmat qiladi.
                      </p>
                    )}
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

        <Card className="border-none glass-card mb-8 bg-card/40 backdrop-blur-xl">
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

        {(isLoading || authLoading) ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
          </div>
        ) : (
          <Card className="border-none glass-card overflow-hidden bg-card/40 backdrop-blur-xl">
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
                    <th className="px-6 py-6">{t.products.stock}</th>
                    <th className="px-6 py-6">{t.units.label}</th>
                    <th className="px-6 py-6">{t.products.price}</th>
                    <th className="px-6 py-6">{t.products.status}</th>
                    {canEdit && <th className="px-6 py-6"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  <AnimatePresence mode="popLayout">
                    {filteredProducts.map((p: any, idx) => (
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
                        <td className="px-6 py-5 font-black text-sm">{p.stock || 0}</td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-bold text-muted-foreground">
                            {t.units[p.unit as keyof typeof t.units] || p.unit || '---'}
                          </span>
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
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </motion.main>
    </div>
  );
}
