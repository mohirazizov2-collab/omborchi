"use client";
 
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
 
const ITEMS_PER_PAGE = 8;
 
type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
 
const categoryColors: Record<string, string> = {
  rent:      "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  salary:    "bg-green-500/10 text-green-600 dark:text-green-400",
  utility:   "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  transport: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  other:     "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400",
};
 
const categoryBarColors: Record<string, string> = {
  rent:      "#378ADD",
  salary:    "#639922",
  utility:   "#BA7517",
  transport: "#D4537E",
  other:     "#888780",
};
 
function formatMoney(val: number) {
  return Math.round(val).toLocaleString("uz-UZ").replace(/,/g, " ");
}
 
function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
 
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
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
 
  const isAdmin = role === "Super Admin" || role === "Admin";
  const isOmborchi = role === "Omborchi";
 
  useEffect(() => {
    if (!isUserLoading && isOmborchi) router.push("/");
  }, [isOmborchi, isUserLoading, router]);
 
  const [formData, setFormData] = useState({
    category: "rent",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
 
  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "expenses");
  }, [db, user]);
 
  const { data: expenses, isLoading } = useCollection(expensesQuery);
 
  // ── Filtering & sorting ─────────────────────────────────────────────────────
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (expenses ?? [])
      .filter((e: any) => {
        const matchSearch =
          e.description?.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q);
        const matchCat =
          categoryFilter === "all" || e.category === categoryFilter;
        return matchSearch && matchCat;
      })
      .sort((a: any, b: any) => {
        if (sortKey === "date-desc")
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortKey === "date-asc")
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortKey === "amount-desc") return b.amount - a.amount;
        return a.amount - b.amount;
      });
  }, [expenses, searchQuery, categoryFilter, sortKey]);
 
  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filteredExpenses.reduce(
      (s: number, e: any) => s + (e.amount ?? 0),
      0
    );
    const avg = filteredExpenses.length ? total / filteredExpenses.length : 0;
    const max = filteredExpenses.reduce(
      (m: any, e: any) => (e.amount > (m?.amount ?? 0) ? e : m),
      null
    );
    return { total, avg, count: filteredExpenses.length, max };
  }, [filteredExpenses]);
 
  // ── Category bar chart data ─────────────────────────────────────────────────
  const catTotals = useMemo(() => {
    const map: Record<string, number> = {};
    (expenses ?? []).forEach((e: any) => {
      map[e.category] = (map[e.category] ?? 0) + (e.amount ?? 0);
    });
    const maxVal = Math.max(...Object.values(map), 1);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => ({ cat, amt, pct: Math.round((amt / maxVal) * 100) }));
  }, [expenses]);
 
  // ── Pagination ──────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE));
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
 
  const handleFilterChange = (fn: () => void) => {
    fn();
    setCurrentPage(1);
  };
 
  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!db || !user || !formData.amount) return;
    setIsSaving(true);
    const expenseId = doc(collection(db, "expenses")).id;
    const expenseRef = doc(db, "expenses", expenseId);
    setDoc(expenseRef, {
      id: expenseId,
      category: formData.category,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
      responsibleUserId: user.uid,
      responsibleUserName: user.displayName || user.email || "Noma'lum",
      createdAt: new Date().toISOString(),
    })
      .then(() => {
        setIsDialogOpen(false);
        setFormData({
          category: "rent",
          amount: "",
          description: "",
          date: new Date().toISOString().split("T")[0],
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
 
  // ── Guards ──────────────────────────────────────────────────────────────────
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex-1 p-6 md:p-10 overflow-y-auto"
      >
        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
              <WalletCards className="w-6 h-6 text-primary" />
              {t.expenses.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t.expenses.description}
            </p>
          </div>
 
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-10 px-5 rounded-xl">
                <Plus className="w-4 h-4" /> {t.expenses.addNew}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-md">
              <DialogHeader className="mb-4">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                  {t.expenses.addNew}
                </DialogTitle>
              </DialogHeader>
 
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t.expenses.category}
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) =>
                        setFormData({ ...formData, category: v })
                      }
                    >
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t.expenses.date}
                    </Label>
                    <Input
                      type="date"
                      className="h-10 rounded-xl"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                  </div>
                </div>
 
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t.expenses.amount} (so'm)
                  </Label>
                  <Input
                    type="number"
                    placeholder="1 000 000"
                    className="h-10 rounded-xl font-semibold text-base"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                  />
                </div>
 
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t.expenses.description_label}
                  </Label>
                  <Textarea
                    placeholder="Qo'shimcha ma'lumot..."
                    className="rounded-xl min-h-[80px] resize-none"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>
 
              <DialogFooter className="mt-6 gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setIsDialogOpen(false)}>
                  {t.actions.cancel}
                </Button>
                <Button className="rounded-xl px-6" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.actions.save}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>
 
        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: t.expenses.total,
              value: formatMoney(stats.total),
              sub: "so'm",
              danger: true,
            },
            {
              label: "Operatsiyalar",
              value: stats.count,
              sub: "ta yozuv",
              danger: false,
            },
            {
              label: "O'rtacha",
              value: formatMoney(stats.avg),
              sub: "so'm",
              danger: false,
            },
            {
              label: "Eng katta",
              value: stats.max ? formatMoney(stats.max.amount) : "—",
              sub: stats.max
                ? t.expenses.categories[
                    stats.max.category as keyof typeof t.expenses.categories
                  ]
                : "—",
              danger: false,
            },
          ].map((s, i) => (
            <Card key={i} className="border border-border/60 shadow-none rounded-2xl">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  {s.label}
                </p>
                <p
                  className={cn(
                    "text-xl font-bold tracking-tight",
                    s.danger && "text-destructive"
                  )}
                >
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
 
        {/* ── Bar chart ── */}
        {catTotals.length > 0 && (
          <Card className="border border-border/60 shadow-none rounded-2xl mb-6">
            <CardContent className="p-5">
              <p className="text-sm font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Toifalar bo'yicha taqsimot
              </p>
              <div className="space-y-3">
                {catTotals.map(({ cat, amt, pct }) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">
                      {t.expenses.categories[
                        cat as keyof typeof t.expenses.categories
                      ] || cat}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: categoryBarColors[cat] ?? "#888" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground text-right w-28 shrink-0">
                      {formatMoney(amt)} so'm
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
 
        {/* ── Toolbar ── */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Qidirish..."
              className="pl-9 h-10 rounded-xl"
              value={searchQuery}
              onChange={(e) =>
                handleFilterChange(() => setSearchQuery(e.target.value))
              }
            />
          </div>
 
          <Select
            value={categoryFilter}
            onValueChange={(v) =>
              handleFilterChange(() => setCategoryFilter(v))
            }
          >
            <SelectTrigger className="h-10 w-full md:w-44 rounded-xl">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <SelectValue placeholder="Toifa" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.history.all}</SelectItem>
              {categories.map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
 
          <Select
            value={sortKey}
            onValueChange={(v) =>
              handleFilterChange(() => setSortKey(v as SortKey))
            }
          >
            <SelectTrigger className="h-10 w-full md:w-44 rounded-xl">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                <SelectValue placeholder="Saralash" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Yangi avval</SelectItem>
              <SelectItem value="date-asc">Eski avval</SelectItem>
              <SelectItem value="amount-desc">Ko'p miqdor</SelectItem>
              <SelectItem value="amount-asc">Kam miqdor</SelectItem>
            </SelectContent>
          </Select>
        </div>
 
        {/* ── Table ── */}
        <Card className="border border-border/60 shadow-none rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary opacity-30" />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="py-24 text-center opacity-20">
              <WalletCards className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm font-semibold uppercase tracking-widest">
                {t.expenses.empty}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/60">
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pl-5">
                      Toifa
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Sana
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Miqdor
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Izoh
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Mas'ul
                    </TableHead>
                    {isAdmin && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {paginatedExpenses.map((exp: any, idx: number) => (
                      <motion.tr
                        key={exp.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="group border-border/40 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="pl-5 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
                              categoryColors[exp.category] ??
                                "bg-zinc-100 text-zinc-600"
                            )}
                          >
                            <Tag className="w-3 h-3" />
                            {t.expenses.categories[
                              exp.category as keyof typeof t.expenses.categories
                            ] ?? exp.category}
                          </span>
                        </TableCell>
 
                        <TableCell className="py-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(exp.date).toLocaleDateString("uz-UZ")}
                          </div>
                        </TableCell>
 
                        <TableCell className="py-3">
                          <span className="text-sm font-bold text-destructive">
                            {formatMoney(exp.amount)}
                            <span className="text-xs font-normal text-muted-foreground ml-1">
                              so'm
                            </span>
                          </span>
                        </TableCell>
 
                        <TableCell className="py-3 max-w-[200px]">
                          {exp.description ? (
                            <span className="text-sm text-muted-foreground truncate block">
                              {exp.description}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
 
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                              {getInitials(exp.responsibleUserName ?? "?")}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {exp.responsibleUserName?.split(" ")[0]}
                            </span>
                          </div>
                        </TableCell>
 
                        {isAdmin && (
                          <TableCell className="py-3 pr-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(exp.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
 
              {/* ── Pagination ── */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-border/60">
                <p className="text-xs text-muted-foreground">
                  {filteredExpenses.length} ta ichidan{" "}
                  {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredExpenses.length)}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredExpenses.length)} ko'rsatilmoqda
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8 rounded-lg text-xs"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <span className="text-xs text-muted-foreground px-1">…</span>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </motion.main>
    </div>
  );
}
 
