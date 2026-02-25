
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  WalletCards, 
  Plus, 
  Search, 
  Loader2, 
  Trash2, 
  Calendar, 
  TrendingDown, 
  Tag, 
  FileText,
  User,
  Filter
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function ExpensesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role, isUserLoading } = useUser();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const isAdmin = role === "Super Admin" || role === "Admin";
  const isOmborchi = role === "Omborchi";

  useEffect(() => {
    if (!isUserLoading && isOmborchi) {
      router.push("/");
    }
  }, [isOmborchi, isUserLoading, router]);

  const [formData, setFormData] = useState({
    category: "rent",
    amount: "",
    description: "",
    date: new Date().toISOString().split('T')[0]
  });

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "expenses");
  }, [db, user]);
  const { data: expenses, isLoading } = useCollection(expensesQuery);

  const formatMoney = (val: number) => val.toLocaleString().replace(/,/g, ' ');

  const filteredExpenses = useMemo(() => {
    return expenses?.filter(e => {
      const matchesSearch = e.description?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           e.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
  }, [expenses, searchQuery, categoryFilter]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [filteredExpenses]);

  const handleSave = () => {
    if (!db || !user || !formData.amount) return;
    
    setIsSaving(true);
    const expenseId = doc(collection(db, "expenses")).id;
    const expenseRef = doc(db, "expenses", expenseId);
    
    const newExpense = {
      id: expenseId,
      category: formData.category,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
      responsibleUserId: user.uid,
      responsibleUserName: user.displayName || user.email || "Noma'lum",
      createdAt: new Date().toISOString()
    };

    setDoc(expenseRef, newExpense)
      .then(() => {
        setIsDialogOpen(false);
        setFormData({ 
          category: "rent", 
          amount: "", 
          description: "", 
          date: new Date().toISOString().split('T')[0] 
        });
        toast({ title: t.expenses.success });
      })
      .finally(() => setIsSaving(false));
  };

  const handleDelete = (id: string) => {
    if (!isAdmin || !db) return;
    if (!confirm("Xarajatni o'chirishni tasdiqlaysizmi?")) return;
    deleteDocumentNonBlocking(doc(db, "expenses", id));
  };

  if (isUserLoading || isOmborchi) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const categories = Object.entries(t.expenses.categories);

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
            <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground flex items-center gap-3">
              <WalletCards className="text-primary w-8 h-8" /> {t.expenses.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">{t.expenses.description}</p>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl premium-button shadow-xl shadow-primary/20 bg-primary text-white border-none">
                  <Plus className="w-4 h-4" /> {t.expenses.addNew}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-lg p-8 shadow-2xl">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <TrendingDown className="text-rose-500 w-6 h-6" /> {t.expenses.addNew}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.expenses.category}</Label>
                      <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                        <SelectTrigger className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {categories.map(([key, label]) => (
                            <SelectItem key={key} value={key} className="font-bold">{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.expenses.date}</Label>
                      <Input 
                        type="date"
                        className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.expenses.amount} (so'm)</Label>
                    <Input 
                      type="number"
                      placeholder="1 000 000"
                      className="h-12 rounded-2xl bg-background/50 border-border/40 font-black text-lg"
                      value={formData.amount} 
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.expenses.description_label}</Label>
                    <Textarea 
                      placeholder="..."
                      className="rounded-2xl bg-background/50 border-border/40 min-h-[100px]"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-8">
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>{t.actions.cancel}</Button>
                  <Button className="rounded-2xl h-12 px-8 bg-primary text-white font-black" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.actions.save}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <Card className="border-none glass-card bg-primary text-white rounded-[2.5rem] p-8 md:col-span-1 shadow-2xl shadow-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <WalletCards className="w-24 h-24 rotate-12" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">{t.expenses.total}</p>
            <p className="text-3xl font-black font-headline tracking-tighter">{formatMoney(totalAmount)} <span className="text-xs opacity-60">so'm</span></p>
          </Card>

          <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem] p-4 md:col-span-3 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Qidirish..." 
                className="pl-12 h-12 rounded-2xl bg-background/50 border-border/40 w-full" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-12 w-full md:w-48 rounded-2xl bg-background/50 border-border/40 font-bold">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5" />
                  <SelectValue placeholder="Toifa" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{t.history.all}</SelectItem>
                {categories.map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredExpenses.map((exp: any, idx) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[2.5rem] hover:bg-card/60 transition-all group overflow-hidden border-l-4 border-l-rose-500/20">
                    <CardContent className="pt-8 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                            <Tag className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-black text-lg tracking-tight">
                              {t.expenses.categories[exp.category as keyof typeof t.expenses.categories] || exp.category}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                              <Calendar className="w-3 h-3" /> {new Date(exp.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(exp.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1 flex items-center gap-2">
                            <TrendingDown className="w-3 h-3 text-rose-500" /> {t.expenses.amount}
                          </p>
                          <p className="text-2xl font-black text-rose-500 font-headline tracking-tight">{formatMoney(exp.amount)} <span className="text-xs">so'm</span></p>
                        </div>

                        {exp.description && (
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 flex items-center gap-1.5">
                              <FileText className="w-3 h-3" /> {t.expenses.description_label}
                            </p>
                            <p className="text-xs font-medium text-foreground/80 line-clamp-2">{exp.description}</p>
                          </div>
                        )}

                        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> {exp.responsibleUserName?.split(' ')[0]}</span>
                          <span className="opacity-40">#{exp.id.substring(0,6).toUpperCase()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!isLoading && filteredExpenses.length === 0 && (
          <div className="py-32 text-center opacity-10">
            <WalletCards className="w-20 h-20 mx-auto mb-4" />
            <p className="text-sm font-black uppercase tracking-[0.5em]">{t.expenses.empty}</p>
          </div>
        )}
      </motion.main>
    </div>
  );
}
