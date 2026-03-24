"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  History,
  Search,
  Trash2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Calendar,
  Package,
  Warehouse,
  User,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { role } = useUser();

  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = role === "Super Admin" || role === "Admin";

  const movementsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "stockMovements");
  }, [db]);
  const { data: movements, loading } = useCollection(movementsQuery);

  const filtered = useMemo(() => {
    if (!movements) return [];
    const sorted = [...movements].sort(
      (a, b) => new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime()
    );
    if (!search) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (m) =>
        m.productName?.toLowerCase().includes(q) ||
        m.warehouseName?.toLowerCase().includes(q) ||
        m.responsibleUserName?.toLowerCase().includes(q) ||
        m.dnNumber?.toLowerCase().includes(q) ||
        m.orderNumber?.toLowerCase().includes(q)
    );
  }, [movements, search]);

  const handleDelete = async () => {
    if (!deleteId || !db) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "stockMovements", deleteId));
      toast({ title: "O'chirildi", description: "Harakat tarixi muvaffaqiyatli o'chirildi." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Xatolik", description: "O'chirishda xatolik yuz berdi." });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("uz-UZ", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const formatMoney = (val: number) =>
    val?.toLocaleString().replace(/,/g, " ") ?? "0";

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto page-transition">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground flex items-center gap-3">
              <History className="w-8 h-8 text-primary" />
              Harakat Tarixi
            </h1>
            <p className="text-muted-foreground mt-1 font-medium text-sm">
              Barcha kirim va chiqim harakatlari
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Qidirish..."
              className="h-11 pl-10 rounded-xl bg-background/50 border-border/40 font-bold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Jami harakatlar", value: movements?.length ?? 0, color: "text-foreground" },
            { label: "Kirimlar", value: movements?.filter(m => m.movementType === "StockIn").length ?? 0, color: "text-emerald-500" },
            { label: "Chiqimlar", value: movements?.filter(m => m.movementType === "StockOut").length ?? 0, color: "text-rose-500" },
            { label: "Bugun", value: movements?.filter(m => new Date(m.movementDate).toDateString() === new Date().toDateString()).length ?? 0, color: "text-primary" },
          ].map((stat) => (
            <Card key={stat.label} className="border-none shadow-sm rounded-2xl bg-card/40 backdrop-blur-xl">
              <CardContent className="p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className={cn("text-2xl font-black font-headline mt-1", stat.color)}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card className="border-none shadow-sm rounded-3xl bg-card/40 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <History className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-bold text-sm">Hech narsa topilmadi</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/30 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4">Tur</th>
                      <th className="px-4 py-4">Mahsulot</th>
                      <th className="px-4 py-4">Miqdor</th>
                      <th className="px-4 py-4">Ombor</th>
                      <th className="px-4 py-4">Mas'ul</th>
                      <th className="px-4 py-4">Sana</th>
                      <th className="px-4 py-4">Hujjat №</th>
                      {isAdmin && <th className="px-6 py-4 w-12"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {filtered.map((m) => {
                      const isIn = m.movementType === "StockIn";
                      return (
                        <tr key={m.id} className="hover:bg-primary/[0.02] group transition-colors">
                          {/* Type */}
                          <td className="px-6 py-3">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase",
                              isIn
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-rose-500/10 text-rose-600"
                            )}>
                              {isIn
                                ? <ArrowDownToLine className="w-3 h-3" />
                                : <ArrowUpFromLine className="w-3 h-3" />}
                              {isIn ? "Kirim" : "Chiqim"}
                            </span>
                          </td>

                          {/* Product */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Package className="w-3.5 h-3.5 text-muted-foreground opacity-50 shrink-0" />
                              <span className="font-bold text-sm">{m.productName}</span>
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="px-4 py-3">
                            <span className={cn(
                              "font-black text-sm",
                              isIn ? "text-emerald-600" : "text-rose-600"
                            )}>
                              {isIn ? "+" : ""}{Math.abs(m.quantityChange)} {m.unit}
                            </span>
                          </td>

                          {/* Warehouse */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Warehouse className="w-3.5 h-3.5 text-muted-foreground opacity-50 shrink-0" />
                              <span className="font-bold text-sm text-muted-foreground">{m.warehouseName}</span>
                            </div>
                          </td>

                          {/* Responsible */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-muted-foreground opacity-50 shrink-0" />
                              <span className="font-bold text-xs text-muted-foreground">{m.responsibleUserName}</span>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground opacity-50 shrink-0" />
                              <span className="font-bold text-xs text-muted-foreground">{formatDate(m.movementDate)}</span>
                            </div>
                          </td>

                          {/* Doc number */}
                          <td className="px-4 py-3">
                            <span className="font-black text-xs text-primary">
                              {m.dnNumber || m.orderNumber || "—"}
                            </span>
                          </td>

                          {/* Delete (Admin only) */}
                          {isAdmin && (
                            <td className="px-6 py-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setDeleteId(m.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent className="rounded-[2rem] border-white/5 bg-card/40 backdrop-blur-3xl">
            <AlertDialogHeader>
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                <Trash2 className="w-7 h-7" />
              </div>
              <AlertDialogTitle className="text-xl font-black">O'chirishni tasdiqlang</AlertDialogTitle>
              <AlertDialogDescription className="font-medium">
                Bu harakat tarixi yozuvini o'chirasiz. Bu amalni qaytarib bo'lmaydi.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 mt-4">
              <AlertDialogCancel className="rounded-xl h-12 font-bold">
                Bekor qilish
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl h-12 bg-rose-600 text-white font-black hover:bg-rose-700"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                O'chirish
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
