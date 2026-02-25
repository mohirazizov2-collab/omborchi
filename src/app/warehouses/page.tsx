
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  LayoutGrid
} from "lucide-react";
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
      .sort((a, b) => {
        const numA = parseInt(a.sku, 10);
        const numB = parseInt(b.sku, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.productName.localeCompare(b.productName);
      });
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
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">{t.warehouses.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">{t.warehouses.description}</p>
          </div>
          
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2 font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl premium-button shadow-xl shadow-primary/20 bg-primary text-white border-none">
                  <Plus className="w-4 h-4" /> {t.warehouses.addNew}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-lg p-8 shadow-2xl">
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
                  <Button className="rounded-2xl h-12 px-8 bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 border-none" onClick={handleSave} disabled={isSaving}>
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

        {/* View Stock Dialog - Redesigned for eye comfort and aesthetics */}
        <Dialog open={!!viewStockWarehouse} onOpenChange={(open) => !open && setViewStockWarehouse(null)}>
          <DialogContent className="rounded-[3rem] border-white/5 bg-background/60 backdrop-blur-[40px] text-foreground max-w-5xl p-0 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] overflow-hidden">
            <div className="flex flex-col h-[85vh]">
              {/* Soft Header */}
              <div className="p-10 pb-6 bg-primary/[0.03] border-b border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                      <LayoutGrid className="w-8 h-8" />
                    </div>
                    <div>
                      <DialogTitle className="text-3xl font-black tracking-tighter font-headline mb-1">{viewStockWarehouse?.name}</DialogTitle>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold uppercase tracking-widest opacity-60">{viewStockWarehouse?.address || "Toshkent shahar"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 shadow-sm">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5">Jami turlar</p>
                      <p className="text-xl font-black font-headline text-primary">{filteredWarehouseStock.length} SKU</p>
                    </div>
                    <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 shadow-sm">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5">Menejer</p>
                      <p className="text-xl font-black font-headline opacity-80">{viewStockWarehouse?.managerName?.split(' ')[0] || "Aziz"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="Mahsulot nomi yoki kodini yozing..." 
                    className="h-14 pl-14 pr-6 rounded-[1.5rem] bg-background/40 border-white/5 focus:border-primary/30 transition-all font-bold text-sm shadow-inner"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Scrollable Content with Soft Cards */}
              <ScrollArea className="flex-1 px-10 py-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
                  <AnimatePresence mode="popLayout">
                    {filteredWarehouseStock.map((item: any, idx) => {
                      const isLowStock = item.stock <= 10;
                      const isOut = item.stock <= 0;
                      const unitLabel = t.units[item.unit as keyof typeof t.units] || item.unit;

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: idx * 0.02, ease: "easeOut" }}
                        >
                          <div className={cn(
                            "p-5 rounded-[2rem] border transition-all duration-300 group relative overflow-hidden",
                            isOut ? "bg-rose-500/[0.02] border-rose-500/10" : 
                            isLowStock ? "bg-amber-500/[0.02] border-amber-500/10" : 
                            "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:shadow-xl hover:shadow-primary/[0.02]"
                          )}>
                            <div className="flex items-center justify-between gap-4 relative z-10">
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className={cn(
                                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm",
                                  isOut ? "bg-rose-500/10 text-rose-500" : 
                                  isLowStock ? "bg-amber-500/10 text-amber-500" : 
                                  "bg-primary/10 text-primary"
                                )}>
                                  <Package className="w-6 h-6" />
                                </div>
                                <div className="min-w-0 space-y-1">
                                  <h4 className="font-black text-sm tracking-tight text-foreground truncate">{item.productName}</h4>
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="h-5 px-2 rounded-md font-black text-[8px] uppercase border-white/10 bg-black/5 text-muted-foreground/60">
                                      <Hash className="w-2.5 h-2.5 mr-1 opacity-40" /> {item.sku}
                                    </Badge>
                                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{formatMoney(item.price)} so'm</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p className="text-[8px] font-black uppercase text-muted-foreground/30 tracking-[0.2em] mb-0.5">Ombordagi qoldiq</p>
                                <div className="flex items-baseline justify-end gap-1.5">
                                  <span className={cn(
                                    "text-2xl font-black font-headline tracking-tighter",
                                    isOut ? "text-rose-500" : isLowStock ? "text-amber-500" : "text-primary"
                                  )}>
                                    {item.stock}
                                  </span>
                                  <span className="text-[9px] font-black uppercase opacity-30">{unitLabel}</span>
                                </div>
                              </div>
                            </div>

                            {/* Status Indicator */}
                            {isLowStock && (
                              <div className="absolute top-0 right-0 p-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isOut ? "bg-rose-500" : "bg-amber-500")} />
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {filteredWarehouseStock.length === 0 && (
                  <div className="py-32 text-center opacity-10 flex flex-col items-center">
                    <Search className="w-24 h-24 mb-6" />
                    <p className="font-black uppercase tracking-[0.5em] text-sm">Ma'lumot topilmadi</p>
                  </div>
                )}
              </ScrollArea>

              {/* Soft Footer */}
              <div className="p-8 border-t border-white/5 bg-primary/[0.02] flex justify-end">
                <Button 
                  onClick={() => setViewStockWarehouse(null)} 
                  className="rounded-[1.5rem] h-14 px-12 font-black uppercase tracking-[0.2em] text-[11px] bg-primary text-white border-none shadow-2xl shadow-primary/20 hover:translate-y-[-2px] hover:shadow-primary/30 transition-all active:scale-95"
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
