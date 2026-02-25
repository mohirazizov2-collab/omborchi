
"use client";

import { useState, useMemo } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Warehouse as WarehouseIcon, MapPin, Phone, User, Trash2, Plus, Loader2, Package, Edit2, Eye, Hash } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function WarehousesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [viewStockWarehouse, setViewStockWarehouse] = useState<any>(null);
  const [stockSearch, setStockSearch] = useState("");

  const isAdmin = role === "Super Admin" || role === "Admin";

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phoneNumber: "",
    managerName: ""
  });

  const warehousesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "warehouses");
  }, [db, user]);
  const { data: warehouses, isLoading } = useCollection(warehousesQuery);

  const inventoryQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "inventory");
  }, [db, user]);
  const { data: inventory } = useCollection(inventoryQuery);

  const productsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "products");
  }, [db, user]);
  const { data: products } = useCollection(productsQuery);

  const warehouseStats = useMemo(() => {
    if (!warehouses || !inventory) return {};
    const stats: Record<string, { totalStock: number, productCount: number }> = {};
    
    warehouses.forEach(w => {
      const items = inventory.filter(inv => inv.warehouseId === w.id);
      stats[w.id] = {
        totalStock: items.reduce((acc, curr) => acc + (curr.stock || 0), 0),
        productCount: items.filter(i => (i.stock || 0) > 0).length
      };
    });
    return stats;
  }, [warehouses, inventory]);

  const filteredWarehouseStock = useMemo(() => {
    if (!viewStockWarehouse || !inventory || !products) return [];
    
    const warehouseInventory = inventory.filter(inv => inv.warehouseId === viewStockWarehouse.id);
    
    return warehouseInventory
      .map(inv => {
        const product = products.find(p => p.id === inv.productId);
        return {
          ...inv,
          productName: product?.name || "Noma'lum",
          sku: product?.sku || "---",
          price: product?.salePrice || 0,
          unit: product?.unit || "pcs"
        };
      })
      .filter(item => 
        item.productName.toLowerCase().includes(stockSearch.toLowerCase()) || 
        item.sku.toLowerCase().includes(stockSearch.toLowerCase())
      )
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }, [viewStockWarehouse, inventory, products, stockSearch]);

  const handleSave = () => {
    if (!db || !user || !formData.name) return;
    
    setIsSaving(true);
    const warehouseId = editingWarehouse ? editingWarehouse.id : doc(collection(db, "warehouses")).id;
    const warehouseRef = doc(db, "warehouses", warehouseId);
    
    const warehouseData = {
      id: warehouseId,
      name: formData.name,
      address: formData.address,
      phoneNumber: formData.phoneNumber,
      managerName: formData.managerName,
      responsibleUserId: user.uid,
      isDeleted: false,
      updatedAt: new Date().toISOString()
    };

    if (!editingWarehouse) {
      (warehouseData as any).createdAt = new Date().toISOString();
    }

    setDoc(warehouseRef, warehouseData, { merge: true })
      .then(() => {
        handleCloseDialog();
        toast({ title: "Muvaffaqiyatli", description: editingWarehouse ? "Ombor ma'lumotlari yangilandi." : "Yangi ombor qo'shildi." });
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: warehouseRef.path,
          operation: editingWarehouse ? 'update' : 'create',
          requestResourceData: warehouseData
        }));
      })
      .finally(() => setIsSaving(false));
  };

  const handleEditClick = (w: any) => {
    setEditingWarehouse(w);
    setFormData({
      name: w.name || "",
      address: w.address || "",
      phoneNumber: w.phoneNumber || "",
      managerName: w.managerName || ""
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingWarehouse(null);
    setFormData({ name: "", address: "", phoneNumber: "", managerName: "" });
  };

  const handleDelete = (id: string) => {
    if (!db || !confirm("Haqiqatdan ham ushbu omborni o'chirmoqchimisiz?")) return;
    const ref = doc(db, "warehouses", id);
    deleteDocumentNonBlocking(ref);
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatMoney = (val: number) => val.toLocaleString().replace(/,/g, ' ');

  return (
    <div className="flex min-h-screen bg-background">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">{t.warehouses.title}</h1>
            <p className="text-muted-foreground mt-1 font-medium text-sm">{t.warehouses.description}</p>
          </div>
          
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2 font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl premium-button shadow-xl shadow-primary/20 bg-primary text-white">
                  <Plus className="w-4 h-4" /> {t.warehouses.addNew}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2rem] border-white/5 bg-card/90 backdrop-blur-2xl text-foreground">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <WarehouseIcon className="text-primary w-6 h-6" />
                    {editingWarehouse ? "Omborni tahrirlash" : t.warehouses.addNew}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">Ombor nomi</Label>
                    <Input 
                      className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold"
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Masalan: Asosiy Ombor Toshkent" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">Menejer (Mas'ul shaxs)</Label>
                    <Input 
                      className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold"
                      value={formData.managerName} 
                      onChange={(e) => setFormData({...formData, managerName: e.target.value})}
                      placeholder="Ism va familiya" 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">Manzil</Label>
                      <Input 
                        className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold"
                        value={formData.address} 
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        placeholder="Ko'cha nomi, shahar" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">Telefon</Label>
                      <Input 
                        className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold"
                        value={formData.phoneNumber} 
                        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                        placeholder="+998 90 123 45 67" 
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="ghost" className="rounded-2xl h-12" onClick={handleCloseDialog}>{t.actions.cancel}</Button>
                  <Button className="rounded-2xl h-12 px-8 bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t.actions.save}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </header>

        {(isLoading || authLoading) ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {warehouses && warehouses.map((w: any) => {
              const stats = warehouseStats[w.id] || { totalStock: 0, productCount: 0 };
              return (
                <Card key={w.id} className="border-none glass-card hover:-translate-y-1 transition-all duration-300 rounded-[2.5rem] bg-card/40 backdrop-blur-xl group relative overflow-hidden">
                  <CardHeader className="flex flex-row items-start justify-between pb-4">
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-headline font-black tracking-tight">{w.name}</CardTitle>
                      <div className="flex items-center text-[10px] text-muted-foreground font-black uppercase tracking-widest gap-1.5 opacity-60">
                        <MapPin className="w-3.5 h-3.5" /> {w.address || 'Manzil belgilanmagan'}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl"
                          onClick={() => handleEditClick(w)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-rose-500 hover:bg-rose-500/10 rounded-xl"
                          onClick={() => handleDelete(w.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                          <p className="text-[9px] font-black uppercase opacity-40 mb-1">Jami tovarlar</p>
                          <p className="text-xl font-black flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary" /> {stats.totalStock}
                          </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                          <p className="text-[9px] font-black uppercase opacity-40 mb-1">SKU turlari</p>
                          <p className="text-xl font-black text-emerald-600">{stats.productCount}</p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-border/10">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest opacity-60">
                            <User className="w-4 h-4" /> <span>{t.warehouses.manager}:</span>
                          </div>
                          <span className="font-black truncate max-w-[120px] text-foreground opacity-80">
                            {w.managerName || 'Belgilanmagan'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest opacity-60">
                            <Phone className="w-4 h-4" /> <span>{t.warehouses.contact}:</span>
                          </div>
                          <span className="font-black text-foreground opacity-80">{w.phoneNumber || '---'}</span>
                        </div>
                      </div>

                      <Button 
                        onClick={() => setViewStockWarehouse(w)}
                        className="w-full h-11 mt-4 rounded-xl font-black uppercase tracking-widest text-[9px] bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all gap-2"
                      >
                        <Eye className="w-3.5 h-3.5" /> Zaxirani ko'rish
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {(!warehouses || warehouses.length === 0) && (
              <div className="col-span-full py-32 text-center border-2 border-dashed rounded-[2rem] border-muted/20">
                <WarehouseIcon className="w-16 h-16 text-muted/5 mx-auto mb-4" />
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">Hozircha omborlar yo'q</p>
              </div>
            )}
          </div>
        )}

        {/* View Stock Dialog */}
        <Dialog open={!!viewStockWarehouse} onOpenChange={(open) => !open && setViewStockWarehouse(null)}>
          <DialogContent className="rounded-[2.5rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-4xl p-8 shadow-2xl">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black tracking-tight flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Package className="text-primary w-6 h-6" /> {viewStockWarehouse?.name} - Tavar qoldig'i
                </div>
                <Badge variant="outline" className="font-black uppercase text-[10px] py-1 border-primary/20 text-primary">{filteredWarehouseStock.length} tur</Badge>
              </DialogTitle>
            </DialogHeader>
            
            <div className="mb-6">
              <div className="relative group">
                <Eye className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Nomi yoki tavar kodi bo'yicha qidirish..." 
                  className="pl-12 h-12 rounded-2xl bg-background/50 border-border/40"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-3">
                {filteredWarehouseStock.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-5 rounded-2xl bg-muted/20 border border-white/5 group hover:bg-muted/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-black text-sm tracking-tight">{item.productName}</h4>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                          <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {item.sku}</span>
                          <span>{formatMoney(item.price)} so'm</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase text-muted-foreground opacity-40 tracking-widest mb-0.5">Ombordagi qoldiq</p>
                      <p className="text-lg font-black font-headline text-primary">
                        {item.stock} <span className="text-[10px] opacity-50 uppercase">{item.unit}</span>
                      </p>
                    </div>
                  </div>
                ))}
                {filteredWarehouseStock.length === 0 && (
                  <div className="py-20 text-center opacity-20">
                    <Package className="w-16 h-16 mx-auto mb-4" />
                    <p className="font-black uppercase tracking-widest text-xs">Mahsulotlar topilmadi</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="mt-8">
              <Button onClick={() => setViewStockWarehouse(null)} className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-[10px] bg-primary text-white">Yopish</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
