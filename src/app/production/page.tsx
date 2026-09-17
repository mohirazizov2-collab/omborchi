"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wrench, Loader2, CheckCircle2, Warehouse, AlertTriangle,
  Package, ClipboardList, FlaskConical, ChevronRight, RefreshCw,
  History, X, Info, TrendingDown,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Animation ───────────────────────────────────────────────────────────────
const SPRING = { type: "spring", stiffness: 380, damping: 34, mass: 0.65 } as const;
const ROW_VARIANTS = {
  initial: { opacity: 0, transform: "translateX(-8px)" },
  animate: { opacity: 1, transform: "translateX(0)" },
  exit:    { opacity: 0, transform: "translateX(8px)" },
};

export default function ProductionPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, assignedWarehouseId, role } = useUser();
  const prefersReduced = useReducedMotion();

  const isAdmin = role === "Super Admin" || role === "Admin";

  // ─── State ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [warehouseId, setWarehouseId] = useState("");
  const [recentProductions, setRecentProductions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [productionNote, setProductionNote] = useState("");

  // Lock warehouse for non-admins
  useEffect(() => {
    if (!isAdmin && assignedWarehouseId) setWarehouseId(assignedWarehouseId);
  }, [isAdmin, assignedWarehouseId]);

  // ─── Firebase queries ─────────────────────────────────────────────────────
  const recipesQ   = useMemoFirebase(() => db ? collection(db, "recipes") : null, [db]);
  const productsQ  = useMemoFirebase(() => db ? collection(db, "products") : null, [db]);
  const inventoryQ = useMemoFirebase(() => db ? collection(db, "inventory") : null, [db]);
  const warehousesQ = useMemoFirebase(() => db ? collection(db, "warehouses") : null, [db]);

  const { data: recipes }    = useCollection(recipesQ);
  const { data: products }   = useCollection(productsQ);
  const { data: inventory }  = useCollection(inventoryQ);
  const { data: warehouses } = useCollection(warehousesQ);

  // ─── Selected recipe ──────────────────────────────────────────────────────
  const selectedRecipe = useMemo(
    () => recipes?.find(r => r.id === selectedRecipeId) || null,
    [recipes, selectedRecipeId]
  );

  // ─── Material requirements with stock check ───────────────────────────────
  // Each component gets: needed total, current stock, shortage amount
  const neededMaterials = useMemo(() => {
    if (!selectedRecipe || !warehouseId) return [];
    return (selectedRecipe.components || []).map((c: any) => {
      const product = products?.find(p => p.id === c.productId);
      const inv = inventory?.find(i => i.warehouseId === warehouseId && i.productId === c.productId);
      const currentStock = inv?.stock ?? 0;
      const totalNeeded  = Number(c.quantity) * quantity;
      const shortage     = Math.max(0, totalNeeded - currentStock);
      const ratio        = currentStock > 0 ? Math.min(currentStock / totalNeeded, 1) : 0;

      return {
        productId:    c.productId,
        name:         product?.name || "Noma'lum mahsulot",
        unit:         product?.unit ? (t.units?.[product.unit as keyof typeof t.units] || product.unit) : c.unit,
        perUnit:      c.quantity,
        totalNeeded,
        currentStock,
        shortage,
        ratio,
        hasEnough:    currentStock >= totalNeeded,
        inventoryId:  `${warehouseId}_${c.productId}`,
      };
    });
  }, [selectedRecipe, quantity, products, inventory, warehouseId, t.units]);

  // ─── Global readiness check ───────────────────────────────────────────────
  const canProduce = useMemo(
    () => neededMaterials.length > 0 && neededMaterials.every(m => m.hasEnough),
    [neededMaterials]
  );

  const readinessPercent = useMemo(() => {
    if (!neededMaterials.length) return 0;
    const ready = neededMaterials.filter(m => m.hasEnough).length;
    return Math.round((ready / neededMaterials.length) * 100);
  }, [neededMaterials]);

  // ─── Load recent productions ──────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!db) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "stockMovements"),
        where("movementType", "==", "Production"),
        orderBy("movementDate", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      setRecentProductions(snap.docs.map(d => d.data()));
    } catch {
      // silently fail — history is non-critical
    } finally {
      setLoadingHistory(false);
    }
  }, [db]);

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory, loadHistory]);

  // ─── Execute production ───────────────────────────────────────────────────
  const handleProduction = useCallback(async () => {
    if (!db || !selectedRecipe || !warehouseId || !canProduce || loading) return;
    setLoading(true);

    const userName = user?.displayName || user?.email || "Noma'lum";
    const whName   = warehouses?.find(w => w.id === warehouseId)?.name || "Noma'lum ombor";
    const now      = new Date().toISOString();
    const batchId  = `prod_${Date.now()}`;

    try {
      // 1. Deduct stock from each material
      for (const mat of neededMaterials) {
        // Update inventory record
        const invRef = doc(db, "inventory", mat.inventoryId);
        updateDocumentNonBlocking(invRef, {
          stock: mat.currentStock - mat.totalNeeded,
          updatedAt: now,
        });

        // Update global product stock
        const product = products?.find(p => p.id === mat.productId);
        if (product) {
          updateDocumentNonBlocking(doc(db, "products", mat.productId), {
            stock: Math.max(0, (product.stock || 0) - mat.totalNeeded),
            updatedAt: now,
          });
        }

        // 2. Write stock movement log entry
        addDocumentNonBlocking(collection(db, "stockMovements"), {
          batchId,
          productId:           mat.productId,
          productName:         mat.name,
          warehouseId,
          warehouseName:       whName,
          quantityChange:      -mat.totalNeeded,
          movementType:        "Production",
          movementDate:        now,
          responsibleUserId:   user?.uid || null,
          responsibleUserName: userName,
          recipeName:          selectedRecipe.name,
          recipeId:            selectedRecipe.id,
          recipeQuantity:      quantity,
          recipeUnit:          selectedRecipe.mainUnit || "",
          description:         productionNote.trim() || `Tayyorlash: ${selectedRecipe.name} × ${quantity}`,
          unit:                mat.unit,
        });
      }

      toast({
        title: "✅ Tayyorlash muvaffaqiyatli bajarildi",
        description: `${selectedRecipe.name} × ${quantity} ${selectedRecipe.mainUnit || ""} — ${whName}`,
      });

      // Reset form
      setSelectedRecipeId("");
      setQuantity(1);
      setProductionNote("");

      // Refresh history if open
      if (showHistory) loadHistory();

    } catch {
      toast({ variant: "destructive", title: "Xatolik yuz berdi", description: "Tayyorlash amalga oshmadi" });
    } finally {
      setLoading(false);
    }
  }, [
    db, selectedRecipe, warehouseId, canProduce, loading,
    neededMaterials, products, user, warehouses, quantity,
    productionNote, showHistory, loadHistory,
  ]);

  // ─── Reset recipe when warehouse changes ──────────────────────────────────
  const handleWarehouseChange = useCallback((id: string) => {
    setWarehouseId(id);
    setSelectedRecipeId("");
    setQuantity(1);
  }, []);

  // ─── Format helpers ───────────────────────────────────────────────────────
  const fmtDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
    } catch { return iso; }
  };

  const selectedWarehouseName = warehouses?.find(w => w.id === warehouseId)?.name;

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />

      <main className="flex-1 flex flex-col overflow-hidden" style={{ contain: "layout style" }}>

        {/* ── Header ── */}
        <div className="px-8 pt-7 pb-5 border-b border-border/20 bg-card/20 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5 text-primary" />
              </span>
              {t.production?.title || "Ishlab chiqarish"}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-medium ml-11">
              {t.production?.description || "Retsept bo'yicha materiallarni sarflash va tayyorlashni qayd etish"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              className="h-8 px-3 text-xs rounded-lg gap-1.5"
              onClick={() => setShowHistory(p => !p)}
            >
              <History className="w-3.5 h-3.5" /> Tarix
            </Button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto p-8" style={{ contain: "strict" }}>
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* ── Left panel: settings ── */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-card/40 border border-border/20 rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  <span className="text-sm font-black">Sozlamalar</span>
                </div>

                {/* Warehouse */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ombor *</Label>
                  <Select
                    value={warehouseId}
                    onValueChange={handleWarehouseChange}
                    disabled={!isAdmin && !!assignedWarehouseId}
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-background/70 border-border/40 font-bold text-sm">
                      <div className="flex items-center gap-2">
                        <Warehouse className="w-3.5 h-3.5 opacity-40 shrink-0" />
                        <SelectValue placeholder="Omborni tanlang" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {(warehouses || []).map(w => (
                        <SelectItem key={w.id} value={w.id} className="font-bold">{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isAdmin && assignedWarehouseId && (
                    <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                      <Info className="w-3 h-3" /> Sizga tayinlangan ombor
                    </p>
                  )}
                </div>

                {/* Recipe */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Retsept *</Label>
                  <Select
                    value={selectedRecipeId}
                    onValueChange={v => { setSelectedRecipeId(v); setQuantity(1); }}
                    disabled={!warehouseId}
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-background/70 border-border/40 font-bold text-sm">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-3.5 h-3.5 opacity-40 shrink-0" />
                        <SelectValue placeholder={warehouseId ? "Retseptni tanlang" : "Avval omborni tanlang"} />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {(recipes || []).map(r => (
                        <SelectItem key={r.id} value={r.id} className="font-bold">{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Miqdor {selectedRecipe ? `(${selectedRecipe.mainUnit || "birlik"})` : ""}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline" size="icon"
                      className="h-10 w-10 rounded-xl shrink-0 font-black text-lg"
                      onClick={() => setQuantity(q => Math.max(0.1, parseFloat((q - 1).toFixed(3))))}
                      disabled={quantity <= 0.1}
                    >−</Button>
                    <Input
                      type="number"
                      min={0.001}
                      step={0.1}
                      className="h-10 flex-1 rounded-xl bg-background/70 border-border/40 text-center font-black text-lg"
                      value={quantity}
                      onChange={e => setQuantity(Math.max(0.001, parseFloat(e.target.value) || 0))}
                    />
                    <Button
                      variant="outline" size="icon"
                      className="h-10 w-10 rounded-xl shrink-0 font-black text-lg"
                      onClick={() => setQuantity(q => parseFloat((q + 1).toFixed(3)))}
                    >+</Button>
                  </div>
                </div>

                {/* Optional note */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Izoh (ixtiyoriy)</Label>
                  <Input
                    className="h-10 rounded-xl bg-background/70 border-border/40 font-medium text-sm"
                    placeholder="Tayyorlash haqida izoh..."
                    value={productionNote}
                    onChange={e => setProductionNote(e.target.value)}
                  />
                </div>
              </div>

              {/* Readiness bar */}
              {selectedRecipe && neededMaterials.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, transform: "translateY(6px)" }}
                  animate={{ opacity: 1, transform: "translateY(0)" }}
                  transition={SPRING}
                  className={cn(
                    "rounded-2xl p-5 border",
                    canProduce
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-amber-500/5 border-amber-500/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-muted-foreground">Tayyor materiallar</span>
                    <span className={cn("text-sm font-black", canProduce ? "text-emerald-500" : "text-amber-500")}>
                      {readinessPercent}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", canProduce ? "bg-emerald-500" : "bg-amber-500")}
                      initial={{ width: 0 }}
                      animate={{ width: `${readinessPercent}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                  <p className={cn("text-[10px] font-bold mt-2", canProduce ? "text-emerald-600" : "text-amber-600")}>
                    {canProduce
                      ? "Barcha materiallar yetarli — tayyorlashga tayyor"
                      : `${neededMaterials.filter(m => !m.hasEnough).length} ta materialda yetishmovchilik`}
                  </p>
                </motion.div>
              )}
            </div>

            {/* ── Right panel: materials + action ── */}
            <div className="lg:col-span-7">
              {!selectedRecipe ? (
                <div className="h-full min-h-[320px] flex flex-col items-center justify-center border-2 border-dashed border-muted/20 rounded-2xl opacity-30 text-center p-12">
                  <FlaskConical className="w-14 h-14 mb-3" />
                  <p className="font-black uppercase tracking-[0.3em] text-xs">Retseptni tanlang</p>
                </div>
              ) : (
                <motion.div
                  key={selectedRecipeId + warehouseId + quantity}
                  initial={{ opacity: 0, transform: "translateY(8px)" }}
                  animate={{ opacity: 1, transform: "translateY(0)" }}
                  transition={SPRING}
                  className="bg-card/40 border border-border/20 rounded-2xl overflow-hidden flex flex-col"
                >
                  {/* Panel header */}
                  <div className="px-6 py-4 border-b border-border/15 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      <span className="text-sm font-black">Kerakli materiallar</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-black text-[10px] uppercase">
                        {selectedRecipe.name}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                      <span className="font-black text-foreground">{quantity} {selectedRecipe.mainUnit}</span>
                    </div>
                  </div>

                  {/* Materials list */}
                  <div className="flex-1 overflow-y-auto divide-y divide-border/10">
                    <AnimatePresence mode="popLayout">
                      {neededMaterials.map((mat, idx) => (
                        <motion.div
                          key={mat.productId}
                          variants={prefersReduced ? {} : ROW_VARIANTS}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={{ ...SPRING, delay: idx * 0.03 }}
                          style={{ willChange: "transform, opacity" }}
                          className={cn(
                            "px-6 py-4",
                            !mat.hasEnough && "bg-rose-500/[0.03]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            {/* Left: name + per-unit info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Package className={cn("w-3.5 h-3.5 shrink-0", mat.hasEnough ? "text-emerald-500" : "text-rose-500")} />
                                <span className="font-black text-sm truncate">{mat.name}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground font-bold mt-0.5 ml-5">
                                1 {selectedRecipe.mainUnit} uchun: {mat.perUnit} {mat.unit}
                              </p>
                            </div>

                            {/* Right: stock info */}
                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-1.5 justify-end">
                                <span className={cn("text-base font-black", !mat.hasEnough && "text-rose-500")}>
                                  {mat.totalNeeded}
                                </span>
                                <span className="text-muted-foreground opacity-40 text-sm">/</span>
                                <span className={cn("text-sm font-bold", mat.hasEnough ? "text-emerald-500" : "text-muted-foreground")}>
                                  {mat.currentStock}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{mat.unit}</span>
                              </div>
                              {!mat.hasEnough && (
                                <p className="text-[10px] text-rose-500 font-black flex items-center gap-0.5 justify-end mt-0.5">
                                  <TrendingDown className="w-3 h-3" />
                                  −{mat.shortage.toFixed(3)} {mat.unit} yetishmaydi
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-2.5 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                            <motion.div
                              className={cn("h-full rounded-full", mat.hasEnough ? "bg-emerald-500" : "bg-rose-500")}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.round(mat.ratio * 100)}%` }}
                              transition={{ duration: 0.35, ease: "easeOut", delay: idx * 0.03 }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-muted-foreground/50 font-bold mt-0.5">
                            <span>0</span>
                            <span>{Math.round(mat.ratio * 100)}%</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Summary footer */}
                  <div className="px-6 py-4 border-t border-border/15 bg-muted/10">
                    {/* Material counts */}
                    <div className="flex items-center gap-4 mb-4 text-xs">
                      <span className="flex items-center gap-1.5 font-black text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {neededMaterials.filter(m => m.hasEnough).length} ta yetarli
                      </span>
                      {neededMaterials.some(m => !m.hasEnough) && (
                        <span className="flex items-center gap-1.5 font-black text-rose-500">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {neededMaterials.filter(m => !m.hasEnough).length} ta yetishmaydi
                        </span>
                      )}
                    </div>

                    {/* Action button */}
                    <Button
                      className={cn(
                        "w-full h-12 rounded-xl font-black text-sm uppercase tracking-widest gap-2 border-none transition-all duration-150",
                        canProduce
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "bg-muted/30 text-muted-foreground cursor-not-allowed"
                      )}
                      disabled={!canProduce || loading}
                      onClick={handleProduction}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : canProduce ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                      {loading
                        ? "Tayyorlanmoqda..."
                        : canProduce
                          ? `${t.production?.process || "Tayyorlashni tasdiqlash"}`
                          : "Material yetarli emas"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* ── Recent History Panel ── */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, transform: "translateY(16px)" }}
                animate={{ opacity: 1, transform: "translateY(0)" }}
                exit={{ opacity: 0, transform: "translateY(8px)" }}
                transition={SPRING}
                className="max-w-5xl mx-auto mt-8 bg-card/40 border border-border/20 rounded-2xl overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-border/15 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    <span className="text-sm font-black">So'ngi tayyorlashlar</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={loadHistory}>
                      <RefreshCw className={cn("w-3.5 h-3.5", loadingHistory && "animate-spin")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setShowHistory(false)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {loadingHistory ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-primary opacity-30" />
                    </div>
                  ) : recentProductions.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground/30">
                      <History className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-xs font-black uppercase tracking-widest">Tarix topilmadi</p>
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-muted/20 border-b border-border/10">
                        <tr>
                          {["Sana", "Retsept", "Miqdor", "Material", "Sarflangan", "Ombor", "Xodim"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase text-muted-foreground">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/10">
                        {recentProductions.map((m, i) => (
                          <tr key={i} className="hover:bg-muted/10 transition-colors duration-100">
                            <td className="px-4 py-3 font-bold text-muted-foreground whitespace-nowrap">
                              {fmtDate(m.movementDate)}
                            </td>
                            <td className="px-4 py-3 font-black text-foreground max-w-[140px] truncate">
                              {m.recipeName || "—"}
                            </td>
                            <td className="px-4 py-3 font-bold text-primary">
                              {m.recipeQuantity} {m.recipeUnit}
                            </td>
                            <td className="px-4 py-3 font-bold max-w-[120px] truncate">{m.productName}</td>
                            <td className="px-4 py-3 font-black text-rose-500">
                              -{Math.abs(m.quantityChange)} {m.unit}
                            </td>
                            <td className="px-4 py-3 font-bold text-muted-foreground">{m.warehouseName}</td>
                            <td className="px-4 py-3 font-bold text-muted-foreground max-w-[100px] truncate">
                              {m.responsibleUserName}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
