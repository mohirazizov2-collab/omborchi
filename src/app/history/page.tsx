
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Search, Filter, Loader2, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, FileText, User, ShoppingCart, Trash2, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, orderBy, query, doc, deleteDoc, getDoc, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function HistoryPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const isAdmin = role === "Super Admin" || role === "Admin";

  const movementsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "stockMovements"), orderBy("movementDate", "desc"));
  }, [db, user]);
  
  const { data: movements, isLoading } = useCollection(movementsQuery);

  const filteredMovements = useMemo(() => {
    return movements?.filter(m => {
      const matchesSearch = 
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (m.productName && m.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.recipient && m.recipient.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === "all" || m.movementType === typeFilter;
      return matchesSearch && matchesType;
    }) || [];
  }, [movements, searchQuery, typeFilter]);

  const handleDelete = async (movement: any) => {
    if (!isAdmin || !db) return;
    if (!confirm("Haqiqatdan ham ushbu operatsiyani o'chirib, zaxirani qayta tiklamoqchimisiz?")) return;

    setIsDeleting(movement.id);
    try {
      // 1. Zaxirani qayta tiklash
      const productRef = doc(db, "products", movement.productId);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const currentStock = productSnap.data().stock || 0;
        // Agar stock-in bo'lgan bo'lsa, endi u miqdorni ayiramiz. 
        // Agar stock-out bo'lgan bo'lsa (quantityChange manfiy), uni ayirganda aslida qo'shiladi.
        await updateDoc(productRef, {
          stock: currentStock - movement.quantityChange,
          updatedAt: new Date().toISOString()
        });
      }

      // 2. Ombor inventarini tiklash
      const invId = `${movement.warehouseId}_${movement.productId}`;
      const invRef = doc(db, "inventory", invId);
      const invSnap = await getDoc(invRef);
      if (invSnap.exists()) {
        const currentWhStock = invSnap.data().stock || 0;
        await updateDoc(invRef, {
          stock: currentWhStock - movement.quantityChange,
          updatedAt: new Date().toISOString()
        });
      }

      // 3. Movement logini o'chirish
      await deleteDoc(doc(db, "stockMovements", movement.id));
      
      toast({ title: "Muvaffaqiyatli", description: "Operatsiya bekor qilindi va zaxira tiklandi." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Xatolik", description: "O'chirishda xato yuz berdi." });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 p-6 md:p-10 overflow-y-auto page-transition"
      >
        <header className="mb-10">
          <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">{t.history.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">{t.history.description}</p>
        </header>

        <Card className="border-none glass-card mb-8 bg-card/40 backdrop-blur-xl">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input 
                placeholder={t.history.search} 
                className="pl-12 h-12 rounded-2xl bg-background/50 border-border/40 focus:border-primary/50 transition-all font-medium" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-12 w-[200px] rounded-2xl bg-background/50 border-border/40 font-bold uppercase text-[10px] tracking-widest">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3 h-3" />
                    <SelectValue placeholder={t.history.filterType} />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{t.history.all}</SelectItem>
                  <SelectItem value="StockIn">{t.nav.stockIn}</SelectItem>
                  <SelectItem value="StockOut">{t.nav.stockOut}</SelectItem>
                  <SelectItem value="Transfer">{t.nav.transfers}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredMovements.map((m: any, idx) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[2rem] hover:bg-card/60 transition-all group overflow-hidden">
                    <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className={cn(
                          "w-14 h-14 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110",
                          m.movementType === 'StockIn' ? "bg-emerald-500/10 text-emerald-500" : 
                          m.movementType === 'StockOut' ? "bg-rose-500/10 text-rose-500" : 
                          "bg-blue-500/10 text-blue-500"
                        )}>
                          {m.movementType === 'StockIn' ? <ArrowDownLeft className="w-7 h-7" /> : 
                           m.movementType === 'StockOut' ? <ShoppingCart className="w-7 h-7" /> : 
                           <ArrowRightLeft className="w-7 h-7" />}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-lg tracking-tight truncate">{m.productName || m.productId}</span>
                            <Badge variant="outline" className={cn(
                              "rounded-lg font-black text-[8px] uppercase px-2 py-0.5 border-none",
                              m.movementType === 'StockIn' ? "bg-emerald-500/10 text-emerald-500" : 
                              m.movementType === 'StockOut' ? "bg-rose-500/10 text-rose-500" : 
                              "bg-blue-500/10 text-blue-500"
                            )}>
                              {m.movementType}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                            <span className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> {m.id.substring(0,8).toUpperCase()}</span>
                            <span className="flex items-center gap-1.5 text-primary"><User className="w-3 h-3" /> {m.responsibleUserName || 'N/A'}</span>
                            <span className="flex items-center gap-1.5"><Warehouse className="w-3 h-3" /> {m.warehouseName || 'Ombor'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">{t.common.quantity}</p>
                          <p className={cn(
                            "text-2xl font-black font-headline",
                            m.quantityChange > 0 ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                          </p>
                        </div>
                        <div className="text-right min-w-[120px]">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">{t.common.date}</p>
                          <p className="text-sm font-black text-foreground/80">
                            {new Date(m.movementDate).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground/50">
                            {new Date(m.movementDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center pl-4 border-l border-white/5">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-10 w-10 rounded-xl text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                              onClick={() => handleDelete(m)}
                              disabled={isDeleting === m.id}
                            >
                              {isDeleting === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredMovements.length === 0 && (
              <div className="py-32 text-center opacity-10">
                <History className="w-20 h-20 mx-auto mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.5em]">{t.history.empty}</p>
              </div>
            )}
          </div>
        )}
      </motion.main>
    </div>
  );
}
