
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Loader2, 
  Trash2, 
  Warehouse,
  Calendar,
  FileBox,
  FileUp,
  FileDown,
  ChevronDown,
  FileText,
  User,
  Download,
  ClipboardCheck
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, orderBy, query, doc, deleteDoc, getDoc, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function HistoryPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const isAdmin = role === "Super Admin" || role === "Admin";

  const movementsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "stockMovements"), orderBy("movementDate", "desc"));
  }, [db, user]);
  
  const { data: movements, isLoading } = useCollection(movementsQuery);

  const groupedMovements = useMemo(() => {
    if (!movements) return {};

    const filtered = movements.filter(m => {
      const bizId = m.dnNumber || m.orderNumber || m.id || "";
      const prodName = m.productName || "";
      const respName = m.responsibleUserName || "";
      return bizId.toLowerCase().includes(searchQuery.toLowerCase()) || 
             prodName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             respName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const groups: Record<string, any> = {};

    filtered.forEach(m => {
      const dateKey = format(new Date(m.movementDate), 'dd.MM.yyyy');
      if (!groups[dateKey]) {
        groups[dateKey] = { 
          StockIn: {}, 
          StockOut: {}, 
          Adjustment: {}, 
          Transfer: {},
          allMovements: []
        };
      }

      const type = m.movementType as keyof typeof groups[string];
      const docId = m.dnNumber || m.orderNumber || m.saleId || m.movementDate.substring(0, 16); 
      
      if (!groups[dateKey][type]) {
        // Fallback for missing types
        return;
      }

      if (!groups[dateKey][type][docId]) {
        groups[dateKey][type][docId] = {
          id: docId,
          items: [],
          responsible: m.responsibleUserName,
          warehouse: m.warehouseName,
          date: m.movementDate,
          supplier: m.supplier,
          recipient: m.recipient,
          type: type
        };
      }
      groups[dateKey][type][docId].items.push(m);
      groups[dateKey].allMovements.push(m);
    });

    return groups;
  }, [movements, searchQuery]);

  const exportDayToExcel = async (day: string, data: any) => {
    try {
      const XLSXModule = await import("xlsx");
      const XLSX = (XLSXModule as any).default || XLSXModule;
      
      const records = data.allMovements.map((m: any) => ({
        "Sana": format(new Date(m.movementDate), 'HH:mm'),
        "Turi": m.movementType,
        "Mahsulot": m.productName,
        "Miqdor": m.quantityChange,
        "Birlik": m.unit,
        "Ombor": m.warehouseName,
        "Mas'ul": m.responsibleUserName
      }));
      
      const ws = XLSX.utils.json_to_sheet(records);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, day);
      XLSX.writeFile(wb, `Harakatlar_${day}.xlsx`);
      toast({ title: "Excel tayyor" });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({ variant: "destructive", title: "Excel eksportida xatolik" });
    }
  };

  const handleDelete = async (movementItems: any[]) => {
    if (!isAdmin || !db) return;
    if (!confirm("Ushbu butun operatsiyani o'chirib, zaxirani qayta tiklamoqchimisiz?")) return;

    setIsDeleting(movementItems[0].id);
    try {
      for (const m of movementItems) {
        const productRef = doc(db, "products", m.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          await updateDoc(productRef, { stock: (productSnap.data().stock || 0) - m.quantityChange, updatedAt: new Date().toISOString() });
        }
        const invId = `${m.warehouseId}_${m.productId}`;
        const invRef = doc(db, "inventory", invId);
        const invSnap = await getDoc(invRef);
        if (invSnap.exists()) {
          await updateDoc(invRef, { stock: (invSnap.data().stock || 0) - m.quantityChange, updatedAt: new Date().toISOString() });
        }
        await deleteDoc(doc(db, "stockMovements", m.id));
      }
      toast({ title: "Bekor qilindi" });
    } finally { setIsDeleting(null); }
  };

  if (isLoading) return (<div className="flex h-screen items-center justify-center bg-background"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>);

  const days = Object.keys(groupedMovements);

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="mb-10">
          <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">Harakatlar jurnali</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Barcha amallar kunlik fayllarga jamlangan.</p>
        </header>

        <Card className="border-none glass-card mb-10 bg-card/40 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Nakladnoy, mahsulot yoki mas'ul..." className="pl-12 h-14 rounded-2xl bg-background/50 border-border/40 font-bold text-base" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-10">
          {days.length === 0 ? (
            <div className="py-32 text-center opacity-10"><FileBox className="w-20 h-20 mx-auto mb-4" /><p className="text-sm font-black uppercase tracking-[0.5em]">Harakatlar topilmadi</p></div>
          ) : (
            days.map((day) => (
              <section key={day} className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-border/40" />
                  <Badge variant="outline" className="px-6 py-2 rounded-full border-primary/20 bg-primary/5 text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> {day}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => exportDayToExcel(day, groupedMovements[day])} className="h-8 rounded-lg text-emerald-600 font-black text-[9px] uppercase hover:bg-emerald-50"><Download className="w-3 h-3 mr-1" /> Excel</Button>
                  <div className="h-px flex-1 bg-border/40" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <TypeFolder title="Kirimlar" icon={FileDown} color="emerald" data={groupedMovements[day].StockIn} onDelete={handleDelete} isDeleting={isDeleting} isAdmin={isAdmin} />
                  <TypeFolder title="Chiqimlar" icon={FileUp} color="rose" data={groupedMovements[day].StockOut} onDelete={handleDelete} isDeleting={isDeleting} isAdmin={isAdmin} />
                  <TypeFolder title="Inventar/Boshqa" icon={ClipboardCheck} color="blue" data={{...groupedMovements[day].Adjustment, ...groupedMovements[day].Transfer}} onDelete={handleDelete} isDeleting={isDeleting} isAdmin={isAdmin} />
                </div>
              </section>
            ))
          )}
        </div>
      </motion.main>
    </div>
  );
}

function TypeFolder({ title, icon: Icon, color, data, onDelete, isDeleting, isAdmin }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const docs = Object.values(data || {});
  const count = docs.length;
  if (count === 0) return null;

  return (
    <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden group">
      <CardContent className="p-0">
        <button onClick={() => setIsOpen(!isOpen)} className={cn("w-full p-6 flex items-center justify-between border-b border-white/5 transition-all outline-none text-left", color === 'emerald' ? "hover:bg-emerald-500/5" : color === 'rose' ? "hover:bg-rose-500/5" : "hover:bg-blue-500/5", isOpen && (color === 'emerald' ? "bg-emerald-500/10" : color === 'rose' ? "bg-rose-500/10" : "bg-blue-500/10"))}>
          <div className="flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105", color === 'emerald' ? "bg-emerald-500/10 text-emerald-500" : color === 'rose' ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500")}><Icon className="w-6 h-6" /></div>
            <div><h3 className="font-black text-sm tracking-tight">{title}</h3><p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">{count} ta hujjat</p></div>
          </div>
          <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", isOpen ? "rotate-180" : "")} />
        </button>
        <AnimatePresence>{isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-4 space-y-3">
              {docs.map((doc: any) => (
                <div key={doc.id} className="p-4 rounded-2xl bg-muted/10 hover:bg-muted/20 transition-all group/doc">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-primary/40" /><span className="text-xs font-black uppercase tracking-wider text-primary">#{doc.id.substring(0, 10)}</span></div>
                    {isAdmin && (<Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover/doc:opacity-100" onClick={(e) => { e.stopPropagation(); onDelete(doc.items); }} disabled={isDeleting === doc.items[0].id}><Trash2 className="w-3.5 h-3.5" /></Button>)}
                  </div>
                  <div className="space-y-2">
                    {doc.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-[11px]"><span className="font-bold text-foreground/70 truncate max-w-[140px]">{item.productName}</span><span className={cn("font-black", item.quantityChange > 0 ? "text-emerald-500" : "text-rose-500")}>{item.quantityChange > 0 ? `+${item.quantityChange}` : item.quantityChange}</span></div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[9px] font-black uppercase opacity-40">
                    <div className="flex items-center gap-1.5"><User className="w-3 h-3" /> {doc.responsible?.split(' ')[0]}</div>
                    <div className="flex items-center gap-1.5"><Warehouse className="w-3 h-3" /> {doc.warehouse}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}</AnimatePresence>
      </CardContent>
    </Card>
  );
}
