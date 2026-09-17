"use client";
 
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FlaskConical, Plus, Trash2, Loader2, Search, Settings2,
  ChevronDown, ChevronUp, Package, X, Edit2, Copy, AlertCircle,
  CheckCircle2, MoreVertical, Layers,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
 
// ─── Constants ───────────────────────────────────────────────────────────────
const PRODUCT_UNITS = ["kg", "litr", "dona", "metr", "m2", "m3", "gramm", "pachka", "quti"];
const RECIPE_MAIN_UNITS = ["m2", "m3", "pogometr", "dona", "komplekt", "marta", "kg", "litr"];
 
const genId = () => Math.random().toString(36).slice(2, 11);
 
type Component = { id: string; productId: string; quantity: number; unit: string };
type FormMode = "create" | "edit";
 
// ─── Animation presets ───────────────────────────────────────────────────────
const SPRING = { type: "spring", stiffness: 380, damping: 34, mass: 0.65 } as const;
const CARD_VARIANTS = {
  initial: { opacity: 0, transform: "translateY(10px) scale(0.98)" },
  animate: { opacity: 1, transform: "translateY(0px) scale(1)" },
  exit:    { opacity: 0, transform: "translateY(-6px) scale(0.97)" },
};
 
const emptyComponent = (): Component => ({ id: genId(), productId: "", quantity: 1, unit: "kg" });
const defaultForm = () => ({ name: "", mainUnit: "m2", components: [emptyComponent()] });
 
export default function RecipesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { role } = useUser();
  const prefersReduced = useReducedMotion();
 
  const canEdit = role === "Super Admin" || role === "Admin";
 
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultForm());
 
  // ─── Firebase ─────────────────────────────────────────────────────────────
  const productsQ = useMemoFirebase(() => db ? collection(db, "products") : null, [db]);
  const { data: products } = useCollection(productsQ);
 
  const recipesQ = useMemoFirebase(() => db ? collection(db, "recipes") : null, [db]);
  const { data: recipes, isLoading } = useCollection(recipesQ);
 
  // ─── Component helpers ────────────────────────────────────────────────────
  const addComponent = useCallback(() => {
    setFormData(p => ({ ...p, components: [...p.components, emptyComponent()] }));
  }, []);
 
  const removeComponent = useCallback((id: string) => {
    setFormData(p => ({
      ...p,
      components: p.components.length > 1 ? p.components.filter(c => c.id !== id) : p.components,
    }));
  }, []);
 
  const updateComponent = useCallback((id: string, field: keyof Component, value: string | number) => {
    setFormData(p => ({
      ...p,
      components: p.components.map(c => c.id === id ? { ...c, [field]: value } : c),
    }));
  }, []);
 
  // ─── Validation ───────────────────────────────────────────────────────────
  const formValid = useMemo(() => {
    if (!formData.name.trim()) return false;
    if (formData.components.length === 0) return false;
    return formData.components.every(c => c.productId && c.quantity > 0);
  }, [formData]);
 
  // ─── Dialog open handlers ─────────────────────────────────────────────────
  const handleOpenCreate = useCallback(() => {
    setFormMode("create");
    setEditingId(null);
    setFormData(defaultForm());
    setIsDialogOpen(true);
  }, []);
 
  const handleOpenEdit = useCallback((recipe: any) => {
    setFormMode("edit");
    setEditingId(recipe.id);
    setFormData({
      name: recipe.name,
      mainUnit: recipe.mainUnit || "m2",
      components: (recipe.components || []).map((c: any) => ({
        id: genId(),
        productId: c.productId,
        quantity: c.quantity,
        unit: c.unit,
      })),
    });
    setIsDialogOpen(true);
  }, []);
 
  // ─── Duplicate ────────────────────────────────────────────────────────────
  const handleDuplicate = useCallback(async (recipe: any) => {
    if (!db) return;
    const id = doc(collection(db, "recipes")).id;
    try {
      await setDoc(doc(db, "recipes", id), {
        ...recipe,
        id,
        name: `${recipe.name} (nusxa)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast({ title: "Retsept nusxalandi" });
    } catch {
      toast({ variant: "destructive", title: "Xatolik yuz berdi" });
    }
  }, [db, toast]);
 
  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!db || !formValid) {
      toast({ variant: "destructive", title: "Barcha maydonlarni to'ldiring" });
      return;
    }
    setIsSaving(true);
    try {
      const id = formMode === "edit" && editingId ? editingId : doc(collection(db, "recipes")).id;
      await setDoc(doc(db, "recipes", id), {
        id,
        name: formData.name.trim(),
        mainUnit: formData.mainUnit,
        components: formData.components.map(({ productId, quantity, unit }) => ({
          productId,
          quantity: Number(quantity),
          unit,
        })),
        ...(formMode === "create" ? { createdAt: new Date().toISOString() } : {}),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
 
      toast({ title: formMode === "edit" ? "Retsept yangilandi" : "Retsept saqlandi" });
      setIsDialogOpen(false);
      setFormData(defaultForm());
    } catch {
      toast({ variant: "destructive", title: "Xatolik yuz berdi" });
    } finally {
      setIsSaving(false);
    }
  }, [db, formData, formMode, editingId, formValid, toast]);
 
  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!db || !confirm(`"${name}" retseptini o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await deleteDoc(doc(db, "recipes", id));
      toast({ title: "Retsept o'chirildi" });
    } catch {
      toast({ variant: "destructive", title: "Xatolik yuz berdi" });
    }
  }, [db, toast]);
 
  // ─── Filter ───────────────────────────────────────────────────────────────
  const filteredRecipes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (recipes || []).filter(r => !q || r.name?.toLowerCase().includes(q));
  }, [recipes, searchQuery]);
 
  const getProductName = useCallback((id: string) =>
    products?.find(p => p.id === id)?.name || "Noma'lum mahsulot",
  [products]);
 
  const duplicateProductIds = useMemo(() => {
    const ids = formData.components.map(c => c.productId).filter(Boolean);
    return new Set(ids.filter((id, i) => ids.indexOf(id) !== i));
  }, [formData.components]);
 
  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setFormData(defaultForm());
  }, []);
 
  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
 
      <main className="flex-1 flex flex-col overflow-hidden" style={{ contain: "layout style" }}>
 
        {/* ── Header ── */}
        <div className="px-8 pt-7 pb-5 border-b border-border/20 bg-card/20 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <FlaskConical className="w-5 h-5 text-primary" />
              </span>
              {t.recipes?.title || "Retseptlar"}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-medium ml-11">
              {t.recipes?.description || "Mahsulot tayyorlash retseptlarini boshqarish"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-bold mr-1">
              Jami: <span className="text-foreground font-black">{filteredRecipes.length}</span> ta
            </span>
            {canEdit && (
              <Button
                size="sm"
                className="h-9 px-5 text-xs font-black rounded-xl gap-1.5 bg-primary text-white border-none shadow-lg shadow-primary/20"
                onClick={handleOpenCreate}
              >
                <Plus className="w-3.5 h-3.5" /> Retsept qo&apos;shish
              </Button>
            )}
          </div>
        </div>
 
        {/* ── Search ── */}
        <div className="px-8 py-3 border-b border-border/10 bg-muted/5">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Retsept nomi bo'yicha qidirish..."
              className="h-8 pl-9 pr-8 text-xs rounded-lg bg-background/80 border-border/40"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost" size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-rose-500"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
 
        {/* ── Grid ── */}
        <div className="flex-1 overflow-auto p-8" style={{ contain: "strict" }}>
          {isLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 text-muted-foreground/30">
              <FlaskConical className="w-14 h-14 mb-3" />
              <p className="font-black uppercase tracking-widest text-xs">
                {searchQuery ? "Qidiruv natijasi topilmadi" : "Hozircha retseptlar yo'q"}
              </p>
              {canEdit && !searchQuery && (
                <Button
                  size="sm"
                  className="mt-4 h-8 px-4 text-xs font-black rounded-xl gap-1.5 bg-primary text-white border-none opacity-60 hover:opacity-100"
                  onClick={handleOpenCreate}
                >
                  <Plus className="w-3.5 h-3.5" /> Retsept qo&apos;shish
                </Button>
              )}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
              initial="initial"
              animate="animate"
            >
              <AnimatePresence mode="popLayout">
                {filteredRecipes.map((recipe: any, idx) => {
                  const isExpanded = expandedId === recipe.id;
                  return (
                    <motion.div
                      key={recipe.id}
                      layout
                      variants={prefersReduced ? {} : CARD_VARIANTS}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ ...SPRING, delay: Math.min(idx * 0.04, 0.25) }}
                      style={{ willChange: "transform, opacity" }}
                      className="group bg-card/50 border border-border/20 rounded-2xl overflow-hidden hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-150"
                    >
                      {/* Card Header */}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <FlaskConical className="w-3.5 h-3.5 text-primary" />
                              </span>
                              <h3 className="font-black text-sm text-foreground truncate">{recipe.name}</h3>
                            </div>
                            <span className="ml-9 inline-flex text-[10px] font-black px-2 py-0.5 bg-primary/10 text-primary rounded-md uppercase tracking-wide">
                              1 {recipe.mainUnit || "m2"} uchun
                            </span>
                          </div>
 
                          {canEdit && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl text-xs">
                                <DropdownMenuItem className="font-bold gap-2 cursor-pointer" onClick={() => handleOpenEdit(recipe)}>
                                  <Edit2 className="w-3.5 h-3.5" /> Tahrirlash
                                </DropdownMenuItem>
                                <DropdownMenuItem className="font-bold gap-2 cursor-pointer" onClick={() => handleDuplicate(recipe)}>
                                  <Copy className="w-3.5 h-3.5" /> Nusxalash
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-rose-500 font-bold gap-2 cursor-pointer"
                                  onClick={() => handleDelete(recipe.id, recipe.name)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> O&apos;chirish
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
 
                        <div className="mt-3 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                            <Layers className="w-3 h-3" />
                            {recipe.components?.length || 0} ta tarkib
                          </span>
                          <button
                            className="ml-auto text-[10px] font-black text-primary/60 hover:text-primary flex items-center gap-1 transition-colors duration-100"
                            onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                          >
                            {isExpanded ? (
                              <><ChevronUp className="w-3 h-3" /> Yopish</>
                            ) : (
                              <><ChevronDown className="w-3 h-3" /> Ko&apos;rish</>
                            )}
                          </button>
                        </div>
                      </div>
 
                      {/* Expandable list */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                            style={{ overflow: "hidden" }}
                          >
                            <div className="border-t border-border/15 px-5 pb-4 pt-3 space-y-1.5 bg-muted/10">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Tarkib</p>
                              {(recipe.components || []).map((c: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-background/60 border border-border/10">
                                  <div className="flex items-center gap-2">
                                    <Package className="w-3 h-3 text-primary/40 shrink-0" />
                                    <span className="font-bold truncate max-w-[150px]">{getProductName(c.productId)}</span>
                                  </div>
                                  <span className="font-black text-primary shrink-0 ml-2">
                                    {c.quantity} {c.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
 
        {/* ── Dialog ── */}
        <Dialog open={isDialogOpen} onOpenChange={open => { if (!open) closeDialog(); }}>
          <DialogContent className="rounded-[2rem] border-white/5 bg-card/50 backdrop-blur-3xl text-foreground max-w-2xl p-0 shadow-2xl overflow-hidden">
 
            <div className="px-8 py-6 border-b border-border/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Settings2 className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-black tracking-tight">
                {formMode === "edit" ? "Retseptni tahrirlash" : "Yangi retsept yaratish"}
              </DialogTitle>
            </div>
 
            <div className="px-8 py-6 space-y-5 max-h-[65vh] overflow-y-auto">
              {/* Name + Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Retsept nomi *
                  </Label>
                  <Input
                    className="h-10 rounded-xl bg-background/70 border-border/40 font-bold text-sm"
                    placeholder="Masalan: 1 kv.m kafel..."
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Hisob birligi
                  </Label>
                  <Select value={formData.mainUnit} onValueChange={v => setFormData(p => ({ ...p, mainUnit: v }))}>
                    <SelectTrigger className="h-10 rounded-xl bg-background/70 border-border/40 font-bold text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {RECIPE_MAIN_UNITS.map(u => (
                        <SelectItem key={u} value={u} className="font-bold">{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
 
              {/* Components */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/10 pb-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Tarkibiy mahsulotlar *
                  </Label>
                  <Button
                    variant="ghost" size="sm" onClick={addComponent}
                    className="h-7 px-3 text-[10px] font-black text-primary gap-1 rounded-lg"
                  >
                    <Plus className="w-3 h-3" /> Qo&apos;shish
                  </Button>
                </div>
 
                <AnimatePresence mode="popLayout">
                  {formData.components.map((comp, idx) => {
                    const isDuplicate = duplicateProductIds.has(comp.productId);
                    return (
                      <motion.div
                        key={comp.id}
                        layout
                        initial={{ opacity: 0, transform: "translateY(6px)" }}
                        animate={{ opacity: 1, transform: "translateY(0)" }}
                        exit={{ opacity: 0, transform: "translateX(-10px)" }}
                        transition={SPRING}
                        style={{ willChange: "transform, opacity" }}
                        className={cn(
                          "flex gap-2 items-center p-3 rounded-xl border transition-colors duration-100",
                          isDuplicate ? "bg-amber-500/5 border-amber-500/20" : "bg-muted/20 border-border/10"
                        )}
                      >
                        <span className="text-[10px] font-black text-muted-foreground/40 w-4 shrink-0 text-center">
                          {idx + 1}
                        </span>
 
                        <Select
                          value={comp.productId}
                          onValueChange={v => updateComponent(comp.id, "productId", v)}
                        >
                          <SelectTrigger className="h-9 flex-[2] rounded-lg bg-background/70 border-border/30 font-bold text-xs">
                            <SelectValue placeholder="Mahsulotni tanlang" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {(products || []).map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-sm font-bold">{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
 
                        <Input
                          type="number"
                          min={0.001}
                          step={0.001}
                          className="h-9 w-20 rounded-lg bg-background/70 border-border/30 text-center font-bold text-sm"
                          value={comp.quantity}
                          onChange={e => updateComponent(comp.id, "quantity", parseFloat(e.target.value) || 0)}
                        />
 
                        <Select value={comp.unit} onValueChange={v => updateComponent(comp.id, "unit", v)}>
                          <SelectTrigger className="h-9 w-24 rounded-lg bg-background/70 border-border/30 font-bold text-xs text-primary">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {PRODUCT_UNITS.map(u => (
                              <SelectItem key={u} value={u} className="font-bold">{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
 
                        {isDuplicate && (
                          <AlertCircle
                            className="w-4 h-4 text-amber-500 shrink-0"
                            title="Bu mahsulot allaqachon qo'shilgan"
                          />
                        )}
 
                        <Button
                          variant="ghost" size="icon"
                          className="h-9 w-9 rounded-lg text-rose-500 hover:bg-rose-500/10 shrink-0"
                          onClick={() => removeComponent(comp.id)}
                          disabled={formData.components.length === 1}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
 
                {duplicateProductIds.size > 0 && (
                  <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    Bir xil mahsulot bir necha marta qo&apos;shilgan. Birlashtiring.
                  </p>
                )}
              </div>
            </div>
 
            <DialogFooter className="px-8 pb-6 gap-2 border-t border-border/10 pt-4">
              <Button
                variant="ghost"
                className="h-10 rounded-xl font-bold px-5"
                onClick={closeDialog}
              >
                <X className="w-3.5 h-3.5 mr-1.5" /> Bekor qilish
              </Button>
              <Button
                className="h-10 px-7 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest gap-2 border-none"
                onClick={handleSave}
                disabled={isSaving || !formValid}
              >
                {isSaving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-3.5 h-3.5" />
                }
                {formMode === "edit" ? "Saqlash" : "Yaratish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
