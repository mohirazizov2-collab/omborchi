"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Wrench, 
  Loader2, 
  CheckCircle2, 
  Warehouse, 
  AlertTriangle,
  Package
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function FactoryProductionPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, assignedWarehouseId, role } = useUser();
  const [loading, setLoading] = useState(false);
  const [selectedProcedureId, setSelectedProcedureId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [warehouseId, setWarehouseId] = useState("");

  const isAdmin = role === "Super Admin" || role === "Admin";

  useEffect(() => {
    if (!isAdmin && assignedWarehouseId) {
      setWarehouseId(assignedWarehouseId);
    }
  }, [isAdmin, assignedWarehouseId]);

  const proceduresQuery = useMemoFirebase(() => db ? collection(db, "procedures") : null, [db]);
  const { data: procedures } = useCollection(proceduresQuery);

  const productsQuery = useMemoFirebase(() => db ? collection(db, "products") : null, [db]);
  const { data: products } = useCollection(productsQuery);

  const inventoryQuery = useMemoFirebase(() => db ? collection(db, "inventory") : null, [db]);
  const { data: inventory } = useCollection(inventoryQuery);

  const warehousesQuery = useMemoFirebase(() => db ? collection(db, "warehouses") : null, [db]);
  const { data: warehouses } = useCollection(warehousesQuery);

  const selectedProcedure = useMemo(() => procedures?.find(r => r.id === selectedProcedureId), [procedures, selectedProcedureId]);

  const neededMaterials = useMemo(() => {
    if (!selectedProcedure) return [];
    return selectedProcedure.components.map((c: any) => {
      const p = products?.find(prod => prod.id === c.productId);
      const inv = inventory?.find(i => i.warehouseId === warehouseId && i.productId === c.productId);
      return {
        ...c,
        name: p?.name || 'Material',
        unit: p?.unit ? (t.units[p.unit as keyof typeof t.units] || p.unit) : '',
        currentStock: inv?.stock || 0,
        totalNeeded: c.quantity * quantity
      };
    });
  }, [selectedProcedure, quantity, products, inventory, warehouseId, t.units]);

  const canProduce = useMemo(() => {
    if (neededMaterials.length === 0) return false;
    return neededMaterials.every((m: any) => m.currentStock >= m.totalNeeded);
  }, [neededMaterials]);

  const handleProduction = async () => {
    if (!db || !selectedProcedure || !warehouseId || !canProduce) return;

    setLoading(true);
    try {
      const userName = user?.displayName || user?.email || "Noma'lum";
      const whName = warehouses?.find(w => w.id === warehouseId)?.name || "Noma'lum";

      for (const mat of neededMaterials) {
        const invId = `${warehouseId}_${mat.productId}`;
        const invRef = doc(db, "inventory", invId);
        
        updateDocumentNonBlocking(invRef, {
          stock: mat.currentStock - mat.totalNeeded,
          updatedAt: new Date().toISOString()
        });

        const p = products?.find(prod => prod.id === mat.productId);
        if (p) {
          updateDocumentNonBlocking(doc(db, "products", p.id), {
            stock: (p.stock || 0) - mat.totalNeeded,
            updatedAt: new Date().toISOString()
          });
        }

        const movementData = {
          productId: mat.productId,
          productName: mat.name,
          warehouseId: warehouseId,
          warehouseName: whName,
          quantityChange: -mat.totalNeeded,
          movementType: "Production",
          movementDate: new Date().toISOString(),
          responsibleUserId: user?.uid,
          responsibleUserName: userName,
          description: `Jarayon: ${selectedProcedure.name} (x${quantity})`,
          unit: mat.unit
        };
        addDocumentNonBlocking(collection(db, "stockMovements"), movementData);
      }

      toast({ title: t.factory.success });
      setSelectedProcedureId("");
      setQuantity(1);
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="mb-10">
          <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground flex items-center gap-3">
            <Wrench className="text-primary w-8 h-8" /> {t.factory.productionTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">{t.factory.productionDescription}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sozlamalar paneli */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8">
                <CardTitle className="text-xl font-black flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-primary" /> {t.factory.selectProcedure}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-6">
                {/* Zavod ombori tanlash */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Zavod Ombori</Label>
                  <Select onValueChange={setWarehouseId} value={warehouseId} disabled={!isAdmin && !!assignedWarehouseId}>
                    <SelectTrigger className="h-12 rounded-2xl bg-background/50 font-bold">
                      <div className="flex items-center gap-2">
                        <Warehouse className="w-4 h-4 opacity-40" />
                        <SelectValue placeholder="Omborni tanlang" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {warehouses?.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Jarayonni tanlash */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.factory.selectProcedure}</Label>
                  <Select onValueChange={setSelectedProcedureId} value={selectedProcedureId}>
                    <SelectTrigger className="h-12 rounded-2xl bg-background/50 font-bold">
                      <SelectValue placeholder="Jarayonni tanlang" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {procedures?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Miqdorni belgilash */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.factory.quantityToProduce}</Label>
                  <Input 
                    type="number"
                    className="h-12 rounded-2xl bg-background/50 font-black text-lg"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseFloat(e.target.value) || 0))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Kerakli materiallar va ishlab chiqarish */}
          <div className="lg:col-span-7">
            {selectedProcedure ? (
              <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden h-full flex flex-col">
                <CardHeader className="p-8 border-b border-white/5">
                  <CardTitle className="text-xl font-black flex items-center gap-3">
                    <Package className="w-5 h-5 text-primary" /> {t.factory.neededMaterials}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto">
                  <div className="divide-y divide-border/10">
                    {neededMaterials.map((mat: any, idx: number) => {
                      const isLow = mat.currentStock < mat.totalNeeded;
                      return (
                        <div key={idx} className={cn("p-6 flex justify-between items-center", isLow && "bg-rose-500/5")}>
                          <div className="space-y-1">
                            <p className="font-black text-sm">{mat.name}</p>
                            <p className="text-[10px] font-bold uppercase opacity-40">1 birlikka: {mat.quantity} {mat.unit}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Jami kerak / Omborda</p>
                            <div className="flex items-center gap-2 justify-end">
                              <span className="font-black text-lg">{mat.totalNeeded}</span>
                              <span className="opacity-30">/</span>
                              <span className={cn("font-bold", isLow ? "text-rose-500" : "text-emerald-500")}>
                                {mat.currentStock} {mat.unit}
                              </span>
                              {isLow && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
                <CardFooter className="p-8 bg-muted/10">
                  <Button 
                    className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20"
                    disabled={!canProduce || loading}
                    onClick={handleProduction}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                    {t.factory.process}
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-[3rem] border-muted/20 opacity-30 p-12 text-center">
                <Package className="w-16 h-16 mb-4" />
                <p className="font-black uppercase tracking-[0.3em] text-sm">Jarayonni tanlang</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
