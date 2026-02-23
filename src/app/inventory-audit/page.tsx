"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, Search, Loader2, Save, Warehouse } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function InventoryAuditPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [auditData, setAuditData] = useState<Record<string, number>>({});

  const isAdmin = role === "Super Admin" || role === "Admin";

  const productsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "products");
  }, [db, user]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const warehousesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "warehouses");
  }, [db, user]);
  const { data: warehouses } = useCollection(warehousesQuery);

  const inventoryQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "inventory");
  }, [db, user]);
  const { data: inventory, isLoading: invLoading } = useCollection(inventoryQuery);

  const filteredProducts = useMemo(() => {
    if (!products || !selectedWarehouseId) return [];
    
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }).map(p => {
      const invItem = inventory?.find(inv => inv.warehouseId === selectedWarehouseId && inv.productId === p.id);
      return { ...p, warehouseStock: invItem ? (invItem.stock || 0) : 0 };
    });
  }, [products, inventory, searchQuery, selectedWarehouseId]);

  const handleAuditChange = (productId: string, val: string) => {
    const num = parseFloat(val) || 0;
    setAuditData(prev => ({ ...prev, [productId]: num }));
  };

  const handleReconcile = async (product: any) => {
    if (!db || !user || !selectedWarehouseId) return;
    const physicalCount = auditData[product.id];
    if (physicalCount === undefined) return;

    const currentWhStock = product.warehouseStock;
    const discrepancy = physicalCount - currentWhStock;
    
    if (discrepancy === 0) {
      toast({ title: "Xabar", description: "Zaxira allaqachon to'g'ri." });
      return;
    }

    setIsSaving(true);
    try {
      const movementData = {
        productId: product.id,
        warehouseId: selectedWarehouseId,
        quantityChange: discrepancy,
        movementType: "Adjustment",
        movementDate: new Date().toISOString(),
        responsibleUserId: user.uid,
        responsibleUserName: user.displayName || user.email || "Noma'lum",
        description: `Audit Adjustment. System: ${currentWhStock}, Physical: ${physicalCount}`,
        unit: product.unit || "pcs"
      };
      addDocumentNonBlocking(collection(db, "stockMovements"), movementData);

      // Update Warehouse Inventory
      const invId = `${selectedWarehouseId}_${product.id}`;
      const invRef = doc(db, "inventory", invId);
      updateDocumentNonBlocking(invRef, {
        stock: physicalCount,
        updatedAt: new Date().toISOString()
      });

      // Update Global Product Stock
      const productRef = doc(db, "products", product.id);
      updateDocumentNonBlocking(productRef, {
        stock: (product.stock || 0) + discrepancy,
        updatedAt: new Date().toISOString()
      });

      toast({
        title: t.inventoryAudit.success,
        description: `${product.name} zaxirasi ${physicalCount} ${t.units[product.unit as keyof typeof t.units] || product.unit} ga o'zgartirildi.`,
      });

      const newAuditData = { ...auditData };
      delete newAuditData[product.id];
      setAuditData(newAuditData);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) return null;

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
            <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground">{t.inventoryAudit.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">{t.inventoryAudit.description}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-none glass-card bg-card/40 backdrop-blur-xl p-4 md:col-span-1">
            <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50 mb-2 block">Omborni tanlang</Label>
            <Select onValueChange={setSelectedWarehouseId} value={selectedWarehouseId}>
              <SelectTrigger className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-primary" />
                  <SelectValue placeholder="Ombor..." />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {warehouses?.map((w) => (
                  <SelectItem key={w.id} value={w.id} className="font-bold">{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          <Card className="border-none glass-card bg-card/40 backdrop-blur-xl p-4 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50 mb-2 block">Mahsulot qidiruvi</Label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder={t.products.search} 
                className="pl-12 h-12 rounded-2xl bg-background/50 border-border/40 focus:border-primary/50" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={!selectedWarehouseId}
              />
            </div>
          </Card>
        </div>

        {(productsLoading || invLoading) ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
          </div>
        ) : !selectedWarehouseId ? (
          <div className="py-32 text-center opacity-20">
            <Warehouse className="w-20 h-20 mx-auto mb-4" />
            <p className="text-sm font-black uppercase tracking-[0.5em]">Avval omborni tanlang</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((p: any, idx) => {
                const physical = auditData[p.id] ?? p.warehouseStock;
                const discrepancy = physical - (p.warehouseStock || 0);
                const unitLabel = t.units[p.unit as keyof typeof t.units] || p.unit || '';
                
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                  >
                    <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[2rem] hover:bg-card/60 transition-all group overflow-hidden">
                      <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6 w-full md:w-auto">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <ClipboardCheck className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-black text-lg tracking-tight truncate max-w-[250px]">{p.name}</h3>
                            <p className="text-[10px] font-black uppercase text-muted-foreground opacity-50">{unitLabel}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-center md:text-right">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">{t.inventoryAudit.systemStock}</p>
                            <p className="text-xl font-black font-headline">{p.warehouseStock || 0} <span className="text-[10px] opacity-40 uppercase">{unitLabel}</span></p>
                          </div>

                          <div className="w-32">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">{t.inventoryAudit.physicalStock}</p>
                            <div className="relative">
                              <Input 
                                type="number"
                                className="h-10 rounded-xl bg-background/50 border-border/40 font-black text-center"
                                value={auditData[p.id] ?? ""}
                                placeholder={p.warehouseStock.toString()}
                                onChange={(e) => handleAuditChange(p.id, e.target.value)}
                              />
                              <span className="absolute -bottom-4 left-0 w-full text-center text-[8px] font-black uppercase text-primary/40">{unitLabel}</span>
                            </div>
                          </div>

                          <div className="text-center md:text-right min-w-[80px]">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">{t.inventoryAudit.discrepancy}</p>
                            <p className={cn(
                              "text-xl font-black font-headline",
                              discrepancy > 0 ? "text-emerald-500" : discrepancy < 0 ? "text-rose-500" : "text-muted-foreground opacity-30"
                            )}>
                              {discrepancy > 0 ? `+${discrepancy}` : discrepancy}
                            </p>
                          </div>

                          <Button 
                            onClick={() => handleReconcile(p)}
                            disabled={discrepancy === 0 || isSaving}
                            className={cn(
                              "rounded-xl h-12 px-6 font-black uppercase tracking-widest text-[10px] transition-all",
                              discrepancy !== 0 ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground opacity-20"
                            )}
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> {t.inventoryAudit.reconcile}</>}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredProducts.length === 0 && (
              <div className="py-32 text-center opacity-10">
                <ClipboardCheck className="w-20 h-20 mx-auto mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.5em]">Mahsulotlar topilmadi</p>
              </div>
            )}
          </div>
        )}
      </motion.main>
    </div>
  );
}
