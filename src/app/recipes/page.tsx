"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FlaskConical, 
  Plus, 
  Trash2, 
  Loader2, 
  Search, 
  Layers, 
  Settings2
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const generateId = () => Math.random().toString(36).substring(2, 11);

// O'lchov birliklari ro'yxati
const PRODUCT_UNITS = ["kg", "litr", "dona", "metr", "m2", "m3", "gramm", "pachka"];
const RECIPE_MAIN_UNITS = ["m2", "m3", "pogometr", "dona", "komplekt", "marta"];

export default function RecipesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    mainUnit: "m2", // Retsept nima uchun (1 kv.m uchunmi yoki 1 dona?)
    components: [{ id: generateId(), productId: "", quantity: 1, unit: "kg" }]
  });

  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "products");
  }, [db]);
  const { data: products } = useCollection(productsQuery);

  const recipesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "recipes");
  }, [db]);
  const { data: recipes, isLoading } = useCollection(recipesQuery);

  const addComponent = () => {
    setFormData(prev => ({
      ...prev,
      components: [...prev.components, { id: generateId(), productId: "", quantity: 1, unit: "kg" }]
    }));
  };

  const removeComponent = (id: string) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.filter(c => c.id !== id)
    }));
  };

  const updateComponent = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const handleSave = async () => {
    if (!db || !formData.name || formData.components.some(c => !c.productId)) {
      toast({ variant: "destructive", title: "Xatolik", description: "Barcha maydonlarni to'ldiring." });
      return;
    }

    setIsSaving(true);
    try {
      const recipeId = doc(collection(db, "recipes")).id;
      await setDoc(doc(db, "recipes", recipeId), {
        id: recipeId,
        name: formData.name,
        mainUnit: formData.mainUnit,
        components: formData.components.map(c => ({ 
          productId: c.productId, 
          quantity: c.quantity, 
          unit: c.unit 
        })),
        createdAt: new Date().toISOString()
      });

      toast({ title: "Retsept muvaffaqiyatli saqlandi" });
      setIsDialogOpen(false);
      setFormData({ name: "", mainUnit: "m2", components: [{ id: generateId(), productId: "", quantity: 1, unit: "kg" }] });
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik yuz berdi" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db || !confirm("Retseptni o'chirishni tasdiqlaysizmi?")) return;
    await deleteDoc(doc(db, "recipes", id));
  };

  const filteredRecipes = useMemo(() => {
    return recipes?.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];
  }, [recipes, searchQuery]);

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground flex items-center gap-3">
              <FlaskConical className="text-primary w-8 h-8" /> {t.recipes.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">{t.recipes.description}</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 border-none hover:scale-105 transition-transform">
                <Plus className="w-4 h-4" /> {t.recipes.addNew}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-3xl p-8 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black flex items-center gap-3">
                  <Settings2 className="text-primary w-6 h-6" /> Retsept yaratish
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Retsept nomi</Label>
                    <Input 
                      className="h-12 rounded-2xl bg-background/50 font-bold"
                      placeholder="Masalan: 1 kv.m Kafel"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Hisob birligi (1 birlik uchun)</Label>
                    <Select onValueChange={(val) => setFormData({...formData, mainUnit: val})} value={formData.mainUnit}>
                      <SelectTrigger className="h-12 rounded-2xl bg-background/50 font-bold border-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {RECIPE_MAIN_UNITS.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Tarkibiy mahsulotlar va sarf</Label>
                    <Button variant="ghost" size="sm" onClick={addComponent} className="text-primary font-black uppercase text-[9px] gap-1">
                      <Plus className="w-3 h-3" /> Mahsulot qo'shish
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {formData.components.map((comp) => (
                      <div key={comp.id} className="flex gap-3 items-center bg-white/5 p-3 rounded-2xl border border-white/5 group">
                        <div className="flex-[2]">
                          <Select onValueChange={(val) => updateComponent(comp.id, "productId", val)} value={comp.productId}>
                            <SelectTrigger className="h-11 rounded-xl bg-background/50 font-bold border-none">
                              <SelectValue placeholder="Mahsulotni tanlang" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {products?.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-24">
                          <Input 
                            type="number" 
                            className="h-11 rounded-xl bg-background/50 text-center font-bold border-none"
                            value={comp.quantity}
                            onChange={(e) => updateComponent(comp.id, "quantity", parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="w-28">
                          <Select onValueChange={(val) => updateComponent(comp.id, "unit", val)} value={comp.unit}>
                            <SelectTrigger className="h-11 rounded-xl bg-background/50 font-bold border-none text-primary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {PRODUCT_UNITS.map(u => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-500/10" onClick={() => removeComponent(comp.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold">Bekor qilish</Button>
                <Button className="rounded-2xl h-12 px-8 bg-primary text-white font-black" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Retseptni saqlash"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <Card className="border-none glass-card mb-8 bg-card/40 backdrop-blur-xl rounded-[2rem]">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Retseptlarni qidirish..." 
                className="pl-12 h-12 rounded-2xl bg-background/50 border-none font-bold" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe: any) => (
              <Card key={recipe.id} className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[2.5rem] group overflow-hidden hover:shadow-2xl transition-all border border-white/5">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl font-black tracking-tight">{recipe.name}</CardTitle>
                      <span className="text-[10px] font-black px-2 py-1 bg-primary/10 text-primary rounded-md uppercase">
                        1 {recipe.mainUnit || 'm2'} uchun
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(recipe.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-muted-foreground opacity-50 tracking-widest mb-1 text-right">Sarf:</p>
                    {recipe.components.map((c: any, i: number) => {
                      const p = products?.find(prod => prod.id === c.productId);
                      return (
                        <div key={i} className="flex justify-between items-center text-xs p-3 rounded-xl bg-white/5 border border-white/5">
                          <span className="font-bold truncate max-w-[140px]">{p?.name || 'Mahsulot'}</span>
                          <span className="font-black text-primary">
                            {c.quantity} {c.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
