"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Search, Plus, Filter, MoreHorizontal, Loader2, Trash2, Edit2, LayoutGrid, List } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";

export default function ProductsPage() {
  const { t } = useLanguage();
  const db = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const canEdit = role === "Super Admin" || role === "Admin";

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price: "0",
    stock: "0",
    category: "general"
  });

  const productsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "products");
  }, [db, user]);
  const { data: products, isLoading } = useCollection(productsQuery);

  const filteredProducts = useMemo(() => {
    return products?.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || p.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    }) || [];
  }, [products, searchQuery, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set((products || []).map(p => p.categoryId || "general"));
    return Array.from(cats);
  }, [products]);

  const handleSave = () => {
    if (!db || !user || !formData.name || !formData.sku) return;
    
    setIsSaving(true);
    const productId = doc(collection(db, "products")).id;
    const productRef = doc(db, "products", productId);
    
    const newProduct = {
      id: productId,
      name: formData.name,
      sku: formData.sku,
      salePrice: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      categoryId: formData.category,
      unitOfMeasure: "pcs",
      lowStockThreshold: 10,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDoc(productRef, newProduct)
      .then(() => {
        setIsDialogOpen(false);
        setFormData({ name: "", sku: "", price: "0", stock: "0", category: "general" });
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: productRef.path,
          operation: 'create',
          requestResourceData: newProduct
        }));
      })
      .finally(() => setIsSaving(false));
  };

  const handleDelete = (id: string) => {
    if (!db) return;
    const ref = doc(db, "products", id);
    deleteDocumentNonBlocking(ref);
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
          
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl premium-button shadow-xl shadow-primary/20 bg-primary text-white border-none">
                  <Plus className="w-4 h-4" /> {t.products.addNew}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] border-white/5 bg-black/90 backdrop-blur-3xl text-white max-w-lg p-8">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <Package className="text-primary w-6 h-6" /> {t.products.addNew}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">Product Name</Label>
                    <Input 
                      className="h-12 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20"
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Industrial Pallet" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">SKU Code</Label>
                      <Input 
                        className="h-12 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20"
                        value={formData.sku} 
                        onChange={(e) => setFormData({...formData, sku: e.target.value})}
                        placeholder="SKU-001" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">Category</Label>
                      <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                        <SelectTrigger className="h-12 rounded-2xl bg-white/5 border-white/10">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-white/10 bg-black text-white">
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="electronics">Electronics</SelectItem>
                          <SelectItem value="furniture">Furniture</SelectItem>
                          <SelectItem value="parts">Spare Parts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">Base Price ($)</Label>
                      <Input 
                        type="number"
                        className="h-12 rounded-2xl bg-white/5 border-white/10 text-white"
                        value={formData.price} 
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">Initial Stock</Label>
                      <Input 
                        type="number"
                        className="h-12 rounded-2xl bg-white/5 border-white/10 text-white"
                        value={formData.stock} 
                        onChange={(e) => setFormData({...formData, stock: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-10 gap-2">
                  <Button variant="ghost" className="rounded-2xl h-12 hover:bg-white/5 text-white/60" onClick={() => setIsDialogOpen(false)}>{t.actions.cancel}</Button>
                  <Button className="rounded-2xl h-12 px-8 bg-primary text-white font-black uppercase tracking-widest text-[10px] border-none shadow-xl shadow-primary/20" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.actions.save}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
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
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-12 w-[160px] rounded-2xl bg-background/50 border-border/40 font-bold uppercase text-[10px] tracking-widest">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3 h-3" />
                    <SelectValue placeholder="Category" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <th className="px-8 py-6">{t.products.productInfo}</th>
                    <th className="px-6 py-6">{t.products.category}</th>
                    <th className="px-6 py-6">{t.products.sku}</th>
                    <th className="px-6 py-6">{t.products.stock}</th>
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
                        className="hover:bg-primary/[0.02] transition-colors group cursor-pointer"
                      >
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
                          <Badge variant="outline" className="rounded-lg font-black text-[9px] uppercase tracking-widest bg-muted/30 border-none px-2 py-0.5 opacity-60">
                            {p.categoryId || 'General'}
                          </Badge>
                        </td>
                        <td className="px-6 py-5 font-code text-[11px] font-black text-primary/60">{p.sku}</td>
                        <td className="px-6 py-5 font-black text-sm">{p.stock || 0}</td>
                        <td className="px-6 py-5 font-black text-sm">${p.salePrice.toLocaleString()}</td>
                        <td className="px-6 py-5">
                          <Badge 
                            variant={(p.stock || 0) > (p.lowStockThreshold || 10) ? "default" : "destructive"}
                            className={cn(
                              "rounded-lg font-black text-[9px] uppercase tracking-widest px-3 py-1 border-none shadow-sm",
                              (p.stock || 0) > (p.lowStockThreshold || 10) ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                            )}
                          >
                            {(p.stock || 0) > (p.lowStockThreshold || 10) ? "Available" : "Critical"}
                          </Badge>
                        </td>
                        {canEdit && (
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary">
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
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={canEdit ? 7 : 6} className="px-6 py-32 text-center">
                        <div className="flex flex-col items-center justify-center opacity-10">
                          <Package className="w-16 h-16 mb-4" />
                          <p className="text-[12px] font-black uppercase tracking-[0.4em]">No products match filter</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </motion.main>
    </div>
  );
}