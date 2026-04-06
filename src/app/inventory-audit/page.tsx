"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardCheck, Search, Loader2, Save, Warehouse, AlertTriangle, CheckCircle2, FileText, Calculator, Trash2, Filter } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function InventoryAuditPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const router = useRouter();
  const { user, role, isUserLoading, assignedWarehouseId } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<Record<string, number>>({});
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [showZeroOnly, setShowZeroOnly] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [auditNumber, setAuditNumber] = useState("");
  const [auditDate, setAuditDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = role === "Super Admin" || role === "Admin";
  const isSotuvchi = role === "Sotuvchi";
  const canAccess = isAdmin || isSotuvchi;

  useEffect(() => {
    if (!isUserLoading && !canAccess) {
      router.push("/");
    }
  }, [canAccess, isUserLoading, router]);

  useEffect(() => {
    if (!isAdmin && assignedWarehouseId) {
      setSelectedWarehouseId(assignedWarehouseId);
    }
  }, [isAdmin, assignedWarehouseId]);

  useEffect(() => {
    // Generate audit document number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    setAuditNumber(`INV-${dateStr}-${randomNum}`);
    setAuditDate(today.toISOString().slice(0, 16));
  }, []);

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
    let list = products.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    }).map(p => {
      const invItem = inventory?.find(inv => inv.warehouseId === selectedWarehouseId && inv.productId === p.id);
      return { ...p, warehouseStock: invItem ? (invItem.stock || 0) : 0 };
    }).sort((a, b) => {
      const numA = parseInt(a.sku || "0", 10);
      const numB = parseInt(b.sku || "0", 10);
      return isNaN(numA) || isNaN(numB) ? (a.sku || "").localeCompare(b.sku || "") : numA - numB;
    });

    // Apply filters
    if (showZeroOnly) {
      list = list.filter(p => (auditData[p.id] ?? p.warehouseStock) === 0);
    }
    if (showSavedOnly) {
      list = list.filter(p => savedItems.has(p.id));
    }

    return list;
  }, [products, inventory, searchQuery, selectedWarehouseId, showZeroOnly, showSavedOnly, auditData, savedItems]);

  const handleAuditChange = (productId: string, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) {
      const newData = { ...auditData };
      delete newData[productId];
      setAuditData(newData);
    } else {
      setAuditData(prev => ({ ...prev, [productId]: num }));
    }
  };

  const handleSaveItem = (productId: string) => {
    setSavedItems(prev => new Set(prev).add(productId));
    toast({ title: "Saqlangan", description: "Mahsulot vaqtinchalik saqlandi" });
  };

  const handleRecalculate = (product: any) => {
    // Reset to warehouse stock
    const newData = { ...auditData };
    delete newData[product.id];
    setAuditData(newData);
    setSavedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(product.id);
      return newSet;
    });
    toast({ title: "Qayta hisoblandi", description: `${product.name} qayta hisoblandi` });
  };

  const handleReconcile = async (product: any) => {
    if (!db || !user || !selectedWarehouseId) return;
    const physicalCount = auditData[product.id];
    if (physicalCount === undefined) return;

    const currentWhStock = product.warehouseStock;
    const discrepancy = physicalCount - currentWhStock;

    if (discrepancy === 0) {
      toast({ title: "Xabar", description: "Zaxira miqdori allaqachon to'g'ri." });
      return;
    }

    setIsSaving(product.id);
    try {
      const selectedWhName = warehouses?.find(w => w.id === selectedWarehouseId)?.name || "Noma'lum";
      const movementData = {
        productId: product.id,
        productName: product.name,
        warehouseId: selectedWarehouseId,
        warehouseName: selectedWhName,
        quantityChange: discrepancy,
        movementType: "Adjustment",
        movementDate: new Date().toISOString(),
        responsibleUserId: user.uid,
        responsibleUserName: user.displayName || user.email || "Noma'lum",
        description: `Inventarizatsiya №${auditNumber}: Tizimda ${currentWhStock}, Haqiqatda ${physicalCount}`,
        unit: product.unit || "pcs"
      };

      await addDocumentNonBlocking(collection(db, "stockMovements"), movementData);

      const invId = `${selectedWarehouseId}_${product.id}`;
      const invRef = doc(db, "inventory", invId);
      await setDocumentNonBlocking(invRef, {
        id: invId,
        warehouseId: selectedWarehouseId,
        productId: product.id,
        stock: physicalCount,
        lastAuditDate: new Date().toISOString(),
        auditNumber: auditNumber,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      const productRef = doc(db, "products", product.id);
      await updateDocumentNonBlocking(productRef, {
        stock: (product.stock || 0) + discrepancy,
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "Muvaffaqiyatli",
        description: `${product.name} zaxirasi ${physicalCount} ga to'g'irlandi.`,
      });

      const newAuditData = { ...auditData };
      delete newAuditData[product.id];
      setAuditData(newAuditData);
      setSavedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Xatolik", description: "Zaxirani yangilashda xatolik yuz berdi." });
    } finally {
      setIsSaving(null);
    }
  };

  const handleBulkFillWithBookStock = () => {
    if (!selectedWarehouseId) return;
    const newAuditData: Record<string, number> = {};
    filteredProducts.forEach(product => {
      newAuditData[product.id] = product.warehouseStock;
    });
    setAuditData(newAuditData);
    toast({ title: "To'ldirildi", description: "Barcha mahsulotlar kitobiy qoldiqlar bilan to'ldirildi" });
  };

  const handleRemoveZeros = () => {
    const newAuditData = { ...auditData };
    Object.keys(newAuditData).forEach(productId => {
      if (newAuditData[productId] === 0) {
        delete newAuditData[productId];
      }
    });
    setAuditData(newAuditData);
    toast({ title: "Tozalandi", description: "Nol qiymatli mahsulotlar o'chirildi" });
  };

  const handleSubmitAudit = async () => {
    if (!db || !user || !selectedWarehouseId) return;
    
    setIsSubmitting(true);
    try {
      const auditLog = {
        auditNumber: auditNumber,
        warehouseId: selectedWarehouseId,
        warehouseName: warehouses?.find(w => w.id === selectedWarehouseId)?.name,
        auditDate: auditDate,
        items: Object.entries(auditData).map(([productId, count]) => {
          const product = products?.find(p => p.id === productId);
          return {
            productId,
            productName: product?.name,
            sku: product?.sku,
            unit: product?.unit,
            bookStock: product?.warehouseStock || 0,
            actualCount: count,
            discrepancy: count - (product?.warehouseStock || 0)
          };
        }),
        totalItems: Object.keys(auditData).length,
        status: "completed",
        createdBy: user.uid,
        createdByName: user.displayName || user.email,
        createdAt: new Date().toISOString()
      };
      
      await addDocumentNonBlocking(collection(db, "auditLogs"), auditLog);
      toast({ title: "Muvaffaqiyatli", description: `Inventarizatsiya №${auditNumber} yakunlandi` });
      
      // Reset after submission
      setAuditData({});
      setSavedItems(new Set());
      setShowZeroOnly(false);
      setShowSavedOnly(false);
      
      // Generate new audit number
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      setAuditNumber(`INV-${dateStr}-${randomNum}`);
      setAuditDate(today.toISOString().slice(0, 16));
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Xatolik", description: "Inventarizatsiyani yakunlashda xatolik" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMoney = (value: number) => {
    return value?.toLocaleString("ru-RU") ?? "0";
  };

  if (isUserLoading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!canAccess) return null;

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 p-6 md:p-10 overflow-y-auto page-transition"
      >
        {/* Header with iiko style */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-primary" />
                Инвентаризация №{auditNumber}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {t.inventoryAudit.description}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-muted-foreground">Дата:</p>
              <p className="text-sm font-black">{new Date(auditDate).toLocaleString()}</p>
            </div>
          </div>

          {/* iiko style action buttons */}
          <div className="flex flex-wrap items-center gap-2 mb-6 p-4 bg-muted/10 rounded-2xl border border-border/20">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1 block">Номер док-та:</Label>
              <Input 
                value={auditNumber} 
                onChange={(e) => setAuditNumber(e.target.value)}
                className="h-8 text-xs font-mono font-bold bg-background/50"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1 block">Поиск:</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  placeholder="..."
                  className="pl-7 h-8 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-end gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-[10px] font-black"
                onClick={handleBulkFillWithBookStock}
              >
                <FileText className="w-3 h-3 mr-1" />
                Заполнить книжными остатками
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-[10px] font-black"
                onClick={() => {
                  toast({ title: "Пересчитать 1-ый шаг", description: "Функция в разработке" });
                }}
              >
                <Calculator className="w-3 h-3 mr-1" />
                Пересчитать 1-ый шаг
              </Button>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1 block">Склад:</Label>
              <Select onValueChange={setSelectedWarehouseId} value={selectedWarehouseId}>
                <SelectTrigger className="h-8 text-xs rounded-xl bg-background/50 border-border/40 font-bold">
                  <div className="flex items-center gap-2">
                    <Warehouse className="w-3 h-3 text-primary" />
                    <SelectValue placeholder="Основной склад" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {warehouses?.map((w) => (
                    <SelectItem key={w.id} value={w.id} className="text-xs font-bold">{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-[10px] font-black">
              Бланк
            </Button>
          </div>

          {/* Filter toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4 pb-2 border-b border-border/10">
            <Button
              variant={showZeroOnly ? "default" : "ghost"}
              size="sm"
              className={cn("h-7 px-3 text-[9px] font-black rounded-md", !showZeroOnly && "text-muted-foreground")}
              onClick={() => setShowZeroOnly(!showZeroOnly)}
            >
              <Filter className="w-2.5 h-2.5 mr-1" />
              Только нулевые
            </Button>
            <Button
              variant={showSavedOnly ? "default" : "ghost"}
              size="sm"
              className={cn("h-7 px-3 text-[9px] font-black rounded-md", !showSavedOnly && "text-muted-foreground")}
              onClick={() => setShowSavedOnly(!showSavedOnly)}
            >
              <Save className="w-2.5 h-2.5 mr-1" />
              Только сохраненные
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-[9px] font-black text-muted-foreground hover:text-rose-500"
              onClick={handleRemoveZeros}
            >
              <Trash2 className="w-2.5 h-2.5 mr-1" />
              Удалить нулевые
            </Button>
            <div className="flex-1" />
            {Object.keys(auditData).length > 0 && (
              <Button
                size="sm"
                className="h-8 px-4 text-[10px] font-black rounded-lg gap-1.5 bg-emerald-600 text-white"
                onClick={handleSubmitAudit}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Завершить инвентаризацию
              </Button>
            )}
          </div>
        </div>

        {(productsLoading || invLoading) ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
          </div>
        ) : !selectedWarehouseId ? (
          <div className="py-32 text-center opacity-20">
            <Warehouse className="w-20 h-20 mx-auto mb-4" />
            <p className="text-sm font-black uppercase tracking-[0.5em]">Выберите склад</p>
          </div>
        ) : (
          <>
            {/* iiko style table */}
            <div className="overflow-x-auto rounded-2xl border border-border/20">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b border-border/20">
                  <tr className="text-[9px] font-black uppercase text-muted-foreground">
                    <th className="px-3 py-3 text-center w-12">№</th>
                    <th className="px-3 py-3 text-left">Код товара</th>
                    <th className="px-3 py-3 text-left">Штрихкод</th>
                    <th className="px-3 py-3 text-left">Товар</th>
                    <th className="px-3 py-3 text-center min-w-[120px]">Факт количество</th>
                    <th className="px-3 py-3 text-center">В ед.</th>
                    <th className="px-3 py-3 text-center">Вес с тарой</th>
                    <th className="px-3 py-3 text-center">Себест... р.</th>
                    <th className="px-3 py-3 text-center">Книжн. к-во</th>
                    <th className="px-3 py-3 text-center">Разница к-во</th>
                    <th className="px-3 py-3 text-center">Разница сумма, р.</th>
                    <th className="px-3 py-3 text-center">Сохранение</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  <AnimatePresence mode="popLayout">
                    {filteredProducts.map((p: any, idx) => {
                      const physical = auditData[p.id] ?? p.warehouseStock;
                      const discrepancy = physical - (p.warehouseStock || 0);
                      const unitLabel = t.units[p.unit as keyof typeof t.units] || p.unit || 'шт';
                      const isItemSaving = isSaving === p.id;
                      const isSaved = savedItems.has(p.id);
                      const costPrice = p.costPrice || 0;
                      const discrepancySum = discrepancy * costPrice;

                      return (
                        <motion.tr
                          key={p.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={cn(
                            "hover:bg-muted/10 transition-colors",
                            isSaved && "bg-emerald-500/5"
                          )}
                        >
                          <td className="px-3 py-3 text-center text-xs font-bold text-muted-foreground">{idx + 1}</td>
                          <td className="px-3 py-3 font-mono text-xs font-bold">{p.sku || "—"}</td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">—</td>
                          <td className="px-3 py-3">
                            <div>
                              <span className="font-black text-sm">{p.name}</span>
                              <p className="text-[9px] text-muted-foreground opacity-50">{unitLabel}</p>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              type="number"
                              step="0.001"
                              className="h-8 w-28 text-xs font-black text-center rounded-lg"
                              value={auditData[p.id] ?? ""}
                              placeholder={p.warehouseStock.toString()}
                              onChange={(e) => handleAuditChange(p.id, e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-3 text-center text-xs font-bold">{unitLabel}</td>
                          <td className="px-3 py-3 text-center text-xs">{physical}</td>
                          <td className="px-3 py-3 text-center text-xs">{formatMoney(costPrice)}</td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-xs font-black">{p.warehouseStock || 0}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={cn(
                              "text-xs font-black",
                              discrepancy > 0 ? "text-emerald-600" : discrepancy < 0 ? "text-rose-600" : "text-muted-foreground"
                            )}>
                              {discrepancy > 0 ? `+${discrepancy.toFixed(3)}` : discrepancy.toFixed(3)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center text-xs">
                            {formatMoney(discrepancySum)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {!isSaved && auditData[p.id] !== undefined && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[9px] font-black"
                                  onClick={() => handleSaveItem(p.id)}
                                >
                                  <Save className="w-3 h-3 mr-1" />
                                  Сохранить
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant={discrepancy !== 0 && auditData[p.id] !== undefined ? "default" : "ghost"}
                                className={cn(
                                  "h-7 px-2 text-[9px] font-black",
                                  discrepancy !== 0 && auditData[p.id] !== undefined && "bg-primary text-white"
                                )}
                                onClick={() => handleRecalculate(p)}
                                disabled={!auditData[p.id]}
                              >
                                <Calculator className="w-3 h-3 mr-1" />
                                Пересчитать
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {filteredProducts.length === 0 && (
              <div className="py-32 text-center opacity-10">
                <Search className="w-20 h-20 mx-auto mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.5em]">
                  {searchQuery ? "Товары не найдены" : "Нет товаров для инвентаризации"}
                </p>
              </div>
            )}

            {/* Footer summary */}
            {Object.keys(auditData).length > 0 && (
              <div className="mt-6 p-4 bg-muted/10 rounded-2xl border border-border/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground">Итого по инвентаризации</p>
                    <p className="text-2xl font-black">
                      {Object.keys(auditData).length} товаров
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase text-muted-foreground">Общая разница</p>
                    <p className={cn(
                      "text-2xl font-black",
                      Object.entries(auditData).reduce((sum, [id, val]) => {
                        const product = products?.find(p => p.id === id);
                        return sum + ((val - (product?.warehouseStock || 0)) * (product?.costPrice || 0));
                      }, 0) > 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {formatMoney(Object.entries(auditData).reduce((sum, [id, val]) => {
                        const product = products?.find(p => p.id === id);
                        return sum + ((val - (product?.warehouseStock || 0)) * (product?.costPrice || 0));
                      }, 0))} so'm
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </motion.main>
    </div>
  );
}
