
"use client";

import { useState } from "react";
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
import { Package, Search, Plus, Filter, MoreHorizontal, Loader2, Trash2, Edit2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function ProductsPage() {
  const { t } = useLanguage();
  const db = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const canEdit = role === "Super Admin" || role === "Admin";

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price: "0",
    stock: "0"
  });

  const productsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "products");
  }, [db, user]);
  const { data: products, isLoading } = useCollection(productsQuery);

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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
      categoryId: "general",
      unitOfMeasure: "pcs",
      lowStockThreshold: 10,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDoc(productRef, newProduct)
      .then(() => {
        setIsDialogOpen(false);
        setFormData({ name: "", sku: "", price: "0", stock: "0" });
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
    <div className="flex min-h-screen bg-background">
      <OmniSidebar />
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 p-10 overflow-y-auto"
      >
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground">{t.products.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">{t.products.description}</p>
          </div>
          
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl premium-button shadow-xl shadow-primary/20 bg-primary text-white">
                  <Plus className="w-4 h-4" /> {t.products.addNew}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2rem] border-white/5 bg-black/90 backdrop-blur-2xl text-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight">{t.products.addNew}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">Mahsulot nomi</Label>
                    <Input 
                      className="h-12 rounded-2xl bg-white/5 border-white/10"
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Masalan: Intel Core i9" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">SKU</Label>
                    <Input 
                      className="h-12 rounded-2xl bg-white/5 border-white/10"
                      value={formData.sku} 
                      onChange={(e) => setFormData({...formData, sku: e.target.value})}
                      placeholder="PRD-12345" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">Narxi ($)</Label>
                      <Input 
                        type="number"
                        className="h-12 rounded-2xl bg-white/5 border-white/10"
                        value={formData.price} 
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">Zaxira miqdori</Label>
                      <Input 
                        type="number"
                        className="h-12 rounded-2xl bg-white/5 border-white/10"
                        value={formData.stock} 
                        onChange={(e) => setFormData({...formData, stock: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="ghost" className="rounded-2xl h-12" onClick={() => setIsDialogOpen(false)}>{t.actions.cancel}</Button>
                  <Button className="rounded-2xl h-12 px-8 bg-primary text-white font-black uppercase tracking-widest text-[10px]" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.actions.save}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </header>

        <Card className="border-none glass-card mb-8">
          <CardContent className="p-4 flex gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input 
                placeholder={t.products.search} 
                className="pl-12 h-12 rounded-2xl bg-background/50 border-white/5 focus:border-primary/50 transition-all" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2 h-12 rounded-2xl px-6 border-white/5 bg-background/50 premium-button font-black uppercase tracking-widest text-[10px]">
              <Filter className="w-4 h-4" /> {t.actions.filter}
            </Button>
          </CardContent>
        </Card>

        {(isLoading || authLoading) ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : (
          <Card className="border-none glass-card overflow-hidden">
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase bg-muted/30 text-muted-foreground font-black tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-5">{t.products.productInfo}</th>
                    <th className="px-6 py-5">{t.products.category}</th>
                    <th className="px-6 py-5">{t.products.sku}</th>
                    <th className="px-6 py-5">{t.products.stock}</th>
                    <th className="px-6 py-5">{t.products.price}</th>
                    <th className="px-6 py-5">{t.products.status}</th>
                    {canEdit && <th className="px-6 py-5"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence mode="popLayout">
                    {filteredProducts.map((p: any, idx) => (
                      <motion.tr 
                        key={p.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="hover:bg-primary/[0.02] transition-colors group cursor-pointer"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <motion.div 
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"
                            >
                              <Package className="w-5 h-5" />
                            </motion.div>
                            <span className="font-black text-foreground tracking-tight">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-muted-foreground font-bold text-xs uppercase tracking-widest opacity-60">{p.categoryId || 'General'}</td>
                        <td className="px-6 py-5 font-code text-xs font-black text-primary/60">{p.sku}</td>
                        <td className="px-6 py-5 font-black text-sm">{p.stock || 0}</td>
                        <td className="px-6 py-5 font-black text-sm">${p.salePrice}</td>
                        <td className="px-6 py-5">
                          <Badge 
                            variant={(p.stock || 0) > (p.lowStockThreshold || 10) ? "default" : "destructive"}
                            className="rounded-lg font-black text-[9px] uppercase tracking-widest px-3 py-1 border-none shadow-sm"
                          >
                            {(p.stock || 0) > (p.lowStockThreshold || 10) ? "In Stock" : "Low Stock"}
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
                        <Package className="w-12 h-12 text-muted/10 mx-auto mb-4" />
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">No products found</p>
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
