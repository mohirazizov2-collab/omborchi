"use client";

import { useState } from "react";
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
import { Package, Search, Plus, Filter, MoreHorizontal, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function ProductsPage() {
  const { t } = useLanguage();
  const db = useFirestore();
  const { user, isUserLoading: authLoading } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
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

  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">{t.products.title}</h1>
            <p className="text-muted-foreground mt-1">{t.products.description}</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> {t.products.addNew}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.products.addNew}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Mahsulot nomi</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Masalan: Intel Core i9" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input 
                    value={formData.sku} 
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    placeholder="PRD-12345" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Narxi ($)</Label>
                    <Input 
                      type="number"
                      value={formData.price} 
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Zaxira miqdori</Label>
                    <Input 
                      type="number"
                      value={formData.stock} 
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t.actions.cancel}</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.actions.save}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <Card className="border-none shadow-sm mb-8">
          <CardContent className="p-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t.products.search} className="pl-10 bg-accent/20 border-none" />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" /> {t.actions.filter}
            </Button>
          </CardContent>
        </Card>

        {(isLoading || authLoading) ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card className="border-none shadow-sm">
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-semibold">{t.products.productInfo}</th>
                    <th className="px-6 py-4 font-semibold">{t.products.category}</th>
                    <th className="px-6 py-4 font-semibold">{t.products.sku}</th>
                    <th className="px-6 py-4 font-semibold">{t.products.stock}</th>
                    <th className="px-6 py-4 font-semibold">{t.products.price}</th>
                    <th className="px-6 py-4 font-semibold">{t.products.status}</th>
                    <th className="px-6 py-4 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products && products.map((p: any) => (
                    <tr key={p.id} className="hover:bg-accent/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                            <Package className="w-5 h-5" />
                          </div>
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{p.categoryId}</td>
                      <td className="px-6 py-4 font-code text-xs">{p.sku}</td>
                      <td className="px-6 py-4 font-bold">{p.stock || 0}</td>
                      <td className="px-6 py-4">${p.salePrice}</td>
                      <td className="px-6 py-4">
                        <Badge variant={(p.stock || 0) > (p.lowStockThreshold || 10) ? "default" : "destructive"}>
                          {(p.stock || 0) > (p.lowStockThreshold || 10) ? "In Stock" : "Low Stock"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(!products || products.length === 0) && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                        Katalog bo'sh. Mahsulotlar qo'shing.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
