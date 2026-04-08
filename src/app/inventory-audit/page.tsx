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
import { 
  ClipboardCheck, Search, Loader2, Save, Warehouse, 
  CheckCircle2, FileText, Calculator, Trash2, Filter, 
  Barcode 
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, where, getDocs } from "firebase/firestore";
import { setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { useScanner } from "@/hooks/use-scanner"; // Skayner hook-ini import qilamiz
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
  const canAccess = isAdmin || role === "Sotuvchi";

  // SKAYNER MANTIQI
  useScanner(async (barcode) => {
    if (!db || !selectedWarehouseId) {
      toast({ variant: "destructive", title: "Xatolik", description: "Avval omborni tanlang!" });
      return;
    }

    // Bazadan shtrix-kod orqali qidirish
    const q = query(collection(db, "products"), where("barcode", "==", barcode));
    const snap = await getDocs(q);

    if (snap.empty) {
      toast({ variant: "destructive", title: "Topilmadi", description: "Bu shtrix-kodli mahsulot mavjud emas." });
      return;
    }

    const product = snap.docs[0];
    const productId = product.id;

    // Skayner qilinganda sonini 1 taga oshirish yoki yangi qo'shish
    setAuditData(prev => {
      const currentVal = prev[productId] ?? 0;
      return { ...prev, [productId]: currentVal + 1 };
    });

    toast({ title: "Skanerlandi", description: `${product.data().name} ro'yxatga qo'shildi.` });
  });

  // Audit raqami va sanasini generatsiya qilish
  useEffect(() => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    setAuditNumber(`INV-${dateStr}-${randomNum}`);
    setAuditDate(today.toISOString().slice(0, 16));
  }, []);

  // Ma'lumotlarni yuklash (Products, Warehouses, Inventory)
  const productsQuery = useMemoFirebase(() => db ? collection(db, "products") : null, [db]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const warehousesQuery = useMemoFirebase(() => db ? collection(db, "warehouses") : null, [db]);
  const { data: warehouses } = useCollection(warehousesQuery);

  const inventoryQuery = useMemoFirebase(() => db ? collection(db, "inventory") : null, [db]);
  const { data: inventory, isLoading: invLoading } = useCollection(inventoryQuery);

  // Filtrlangan mahsulotlar ro'yxati
  const filteredProducts = useMemo(() => {
    if (!products || !selectedWarehouseId) return [];
    
    let list = products.map(p => {
      const invItem = inventory?.find(inv => inv.warehouseId === selectedWarehouseId && inv.productId === p.id);
      return { ...p, warehouseStock: invItem ? (invItem.stock || 0) : 0 };
    });

    // Qidiruv
    if (searchQuery) {
      list = list.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.barcode && p.barcode.includes(searchQuery))
      );
    }

    // Filtrlar
    if (showZeroOnly) list = list.filter(p => (auditData[p.id] ?? p.warehouseStock) === 0);
    if (showSavedOnly) list = list.filter(p => savedItems.has(p.id));

    return list;
  }, [products, inventory, searchQuery, selectedWarehouseId, showZeroOnly, showSavedOnly, auditData, savedItems]);

  const handleAuditChange = (productId: string, val: string) => {
    const num = parseFloat(val);
    setAuditData(prev => ({ ...prev, [productId]: isNaN(num) ? 0 : num }));
  };

  const handleSubmitAudit = async () => {
    if (!db || !user || !selectedWarehouseId) return;
    setIsSubmitting(true);
    
    try {
      const auditLog = {
        auditNumber,
        warehouseId: selectedWarehouseId,
        warehouseName: warehouses?.find(w => w.id === selectedWarehouseId)?.name,
        auditDate,
        items: Object.entries(auditData).map(([productId, count]) => {
          const product = products?.find(p => p.id === productId);
          return {
            productId,
            productName: product?.name,
            bookStock: product?.warehouseStock || 0,
            actualCount: count,
            discrepancy: count - (product?.warehouseStock || 0)
          };
        }),
        status: "completed",
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      };
      
      await addDocumentNonBlocking(collection(db, "auditLogs"), auditLog);
      toast({ title: "Muvaffaqiyatli", description: "Inventarizatsiya yakunlandi." });
      setAuditData({});
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik", description: "Saqlashda muammo bo'ldi." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <OmniSidebar />
      <main className="flex-1 p-6 lg:p-10">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <ClipboardCheck className="text-blue-600" /> ИНВЕНТАРИЗАЦИЯ №{auditNumber}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-blue-50 text-blue-600 border-blue-100 rounded-lg py-1">
                <Barcode className="w-3 h-3 mr-1" /> SKAYNER AKTIV
              </Badge>
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
             <Label className="text-[10px] uppercase font-bold text-slate-400">Sklad tanlang:</Label>
             <Select onValueChange={setSelectedWarehouseId} value={selectedWarehouseId}>
                <SelectTrigger className="w-[200px] h-9 border-none font-bold text-slate-700">
                  <SelectValue placeholder="Omborni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
             </Select>
          </div>
        </div>

        {/* SEARCH AND FILTERS */}
        <Card className="border-none shadow-sm mb-6 rounded-3xl overflow-hidden">
          <CardContent className="p-4 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Mahsulot nomi, SKU yoki Shtrix-kod..." 
                className="pl-10 h-11 bg-slate-50 border-none rounded-2xl"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              className={cn("rounded-2xl h-11 font-bold", showZeroOnly && "bg-blue-600 text-white")}
              onClick={() => setShowZeroOnly(!showZeroOnly)}
            >
              <Filter className="w-4 h-4 mr-2" /> Faqat nollar
            </Button>
            {Object.keys(auditData).length > 0 && (
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-8 rounded-2xl font-black shadow-lg shadow-emerald-100"
                onClick={handleSubmitAudit}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                YAKUNLASH
              </Button>
            )}
          </CardContent>
        </Card>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <th className="px-6 py-4 text-left">Mahsulot</th>
                <th className="px-6 py-4 text-center">Tizimda (Kitobiy)</th>
                <th className="px-6 py-4 text-center">Haqiqatda (Fakt)</th>
                <th className="px-6 py-4 text-center">Farq</th>
                <th className="px-6 py-4 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map((p: any) => {
                const physical = auditData[p.id] ?? p.warehouseStock;
                const discrepancy = physical - p.warehouseStock;
                
                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{p.barcode || "Shtrix-kod yo'q"}</p>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-500">{p.warehouseStock}</td>
                    <td className="px-6 py-4 text-center">
                      <Input 
                        type="number"
                        className="w-24 h-9 mx-auto text-center font-black rounded-xl border-slate-200"
                        value={auditData[p.id] ?? ""}
                        placeholder={p.warehouseStock.toString()}
                        onChange={(e) => handleAuditChange(p.id, e.target.value)}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black",
                        discrepancy === 0 ? "bg-slate-100 text-slate-400" :
                        discrepancy > 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                      )}>
                        {discrepancy > 0 ? `+${discrepancy}` : discrepancy}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => {
                        const newData = {...auditData};
                        delete newData[p.id];
                        setAuditData(newData);
                      }}>
                        <Trash2 className="w-4 h-4 text-slate-300 hover:text-rose-500" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
