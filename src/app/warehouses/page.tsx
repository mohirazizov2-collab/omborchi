
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { Warehouse as WarehouseIcon, MapPin, Phone, User, MoreVertical, Plus, Loader2, Package } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function WarehousesPage() {
  const { t } = useLanguage();
  const db = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = role === "Super Admin" || role === "Admin";

  useEffect(() => {
    if (!authLoading && role === "Omborchi") {
      router.push("/");
    }
  }, [role, authLoading, router]);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phoneNumber: ""
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

  const warehouseStats = useMemo(() => {
    if (!warehouses || !inventory) return {};
    const stats: Record<string, { totalStock: number, productCount: number }> = {};
    
    warehouses.forEach(w => {
      const items = inventory.filter(inv => inv.warehouseId === w.id);
      stats[w.id] = {
        totalStock: items.reduce((acc, curr) => acc + (curr.stock || 0), 0),
        productCount: items.filter(i => i.stock > 0).length
      };
    });
    return stats;
  }, [warehouses, inventory]);

  const handleSave = () => {
    if (!db || !user || !formData.name) return;
    
    setIsSaving(true);
    const warehouseId = doc(collection(db, "warehouses")).id;
    const warehouseRef = doc(db, "warehouses", warehouseId);
    
    const newWarehouse = {
      id: warehouseId,
      name: formData.name,
      address: formData.address,
      phoneNumber: formData.phoneNumber,
      responsibleUserId: user.uid,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDoc(warehouseRef, newWarehouse)
      .then(() => {
        setIsDialogOpen(false);
        setFormData({ name: "", address: "", phoneNumber: "" });
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: warehouseRef.path,
          operation: 'create',
          requestResourceData: newWarehouse
        }));
      })
      .finally(() => setIsSaving(false));
  };

  if (authLoading || role === "Omborchi") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <OmniSidebar />
      <main className="flex-1 p-10 overflow-y-auto page-transition">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">{t.warehouses.title}</h1>
            <p className="text-muted-foreground mt-1 font-medium text-sm">{t.warehouses.description}</p>
          </div>
          
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl premium-button shadow-xl shadow-primary/20 bg-primary text-white">
                  <Plus className="w-4 h-4" /> {t.warehouses.addNew}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2rem] border-white/5 bg-card/90 backdrop-blur-2xl text-foreground">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight">{t.warehouses.addNew}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">{t.common.id} (Nomi)</Label>
                    <Input 
                      className="h-12 rounded-2xl bg-background/50 border-border/40"
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Masalan: Asosiy Ombor Toshkent" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">Manzil</Label>
                    <Input 
                      className="h-12 rounded-2xl bg-background/50 border-border/40"
                      value={formData.address} 
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="Ko'cha nomi, shahar" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">Telefon</Label>
                    <Input 
                      className="h-12 rounded-2xl bg-background/50 border-border/40"
                      value={formData.phoneNumber} 
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      placeholder="+998 90 123 45 67" 
                    />
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

        <div className="mb-8 flex gap-4">
          <Input placeholder={t.warehouses.search} className="max-w-md h-12 rounded-2xl bg-card border-none shadow-sm px-6" />
          <Button variant="outline" className="h-12 rounded-2xl px-6 border-none bg-card shadow-sm font-black uppercase tracking-widest text-[10px]">
            {t.actions.filter}
          </Button>
        </div>

        {(isLoading || authLoading) ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {warehouses && warehouses.map((w: any) => {
              const stats = warehouseStats[w.id] || { totalStock: 0, productCount: 0 };
              return (
                <Card key={w.id} className="border-none glass-card hover:-translate-y-1 transition-all duration-300 rounded-[2.5rem] bg-card/40 backdrop-blur-xl">
                  <CardHeader className="flex flex-row items-start justify-between pb-4">
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-headline font-black tracking-tight">{w.name}</CardTitle>
                      <div className="flex items-center text-[10px] text-muted-foreground font-black uppercase tracking-widest gap-1.5 opacity-60">
                        <MapPin className="w-3.5 h-3.5" /> {w.address || 'Manzil belgilanmagan'}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground rounded-xl">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
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
                          <span className="font-black truncate max-w-[120px] text-foreground opacity-80">{w.responsibleUserId?.substring(0,8)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest opacity-60">
                            <Phone className="w-4 h-4" /> <span>{t.warehouses.contact}:</span>
                          </div>
                          <span className="font-black text-foreground opacity-80">{w.phoneNumber || '---'}</span>
                        </div>
                      </div>
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
      </main>
    </div>
  );
}
