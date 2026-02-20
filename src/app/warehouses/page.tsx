"use client";

import { useState } from "react";
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
import { Warehouse as WarehouseIcon, MapPin, Phone, User, MoreVertical, Plus, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function WarehousesPage() {
  const { t } = useLanguage();
  const db = useFirestore();
  const { user, isUserLoading: authLoading } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
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

  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">{t.warehouses.title}</h1>
            <p className="text-muted-foreground mt-1">{t.warehouses.description}</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> {t.warehouses.addNew}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.warehouses.addNew}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t.common.id} (Nomi)</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Masalan: Asosiy Ombor Toshkent" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Manzil</Label>
                  <Input 
                    value={formData.address} 
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Ko'cha nomi, shahar" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input 
                    value={formData.phoneNumber} 
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    placeholder="+998 90 123 45 67" 
                  />
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

        <div className="mb-6 flex gap-4">
          <Input placeholder={t.warehouses.search} className="max-w-md bg-card" />
          <Button variant="outline">{t.actions.filter}</Button>
        </div>

        {(isLoading || authLoading) ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {warehouses && warehouses.map((w: any) => (
              <Card key={w.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-headline font-bold">{w.name}</CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                      <MapPin className="w-3 h-3" /> {w.address}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" /> <span>{t.warehouses.manager}:</span>
                      </div>
                      <span className="font-medium truncate max-w-[150px]">{w.responsibleUserId}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" /> <span>{t.warehouses.contact}:</span>
                      </div>
                      <span className="font-medium">{w.phoneNumber}</span>
                    </div>
                    <div className="pt-4 border-t mt-4 flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">{t.warehouses.utilization}</p>
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-primary"
                            style={{ width: "0%" }} 
                          />
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-bold">0%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!warehouses || warehouses.length === 0) && (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl border-muted">
                <p className="text-muted-foreground">Hozircha omborlar yo'q. Birinchi omborni qo'shing!</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
