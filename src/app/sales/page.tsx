"use client";

import { useState, useMemo } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingBag,
  Plus,
  Loader2,
  Trash2,
  Calendar,
  User,
  Package,
  Search,
  Download,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Banknote,
  ShoppingCart,
} from "lucide-react";
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
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import {
  collection,
  doc,
  serverTimestamp,
  runTransaction,
  increment,
  writeBatch,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface FormData {
  customerName: string;
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: number;
  staffId: string;
  paymentMethod: string;
}

const defaultForm: FormData = {
  customerName: "",
  productId: "",
  productName: "",
  productSku: "",
  unitPrice: 0,
  staffId: "",
  paymentMethod: "Naqd",
};

const PAGE_SIZE = 10;

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-t animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-4 bg-slate-100 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <div className="text-xs text-slate-500 mb-0.5">{label}</div>
        <div className="text-xl font-black text-slate-800">{value}</div>
      </div>
    </div>
  );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────
function DeleteConfirmDialog({
  onConfirm,
  children,
}: {
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sotuvni o'chirishni tasdiqlang</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 py-2">
          Bu sotuvni o'chirsangiz, inventar miqdori avtomatik qaytariladi.
          Davom etasizmi?
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Bekor qilish
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            Ha, o'chirish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SalesPage() {
  const { toast } = useToast();
  const db = useFirestore();

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [formData, setFormData] = useState<FormData>(defaultForm);

  // Filter state
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterStaff, setFilterStaff] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const salesQuery = useMemoFirebase(
    () => (db ? collection(db, "sales") : null),
    [db]
  );
  const staffQuery = useMemoFirebase(
    () => (db ? collection(db, "staff") : null),
    [db]
  );
  const inventoryQuery = useMemoFirebase(
    () => (db ? collection(db, "inventory") : null),
    [db]
  );

  const { data: salesList, isLoading: salesLoading } = useCollection(salesQuery);
  const { data: staffList } = useCollection(staffQuery);
  const { data: inventoryList } = useCollection(inventoryQuery);

  // ── Product search in modal ──────────────────────────────────────────────
  const filteredProducts = useMemo(
    () =>
      inventoryList?.filter(
        (item: any) =>
          item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.barcode?.includes(searchQuery)
      ) || [],
    [inventoryList, searchQuery]
  );

  // ── Table filter + search ────────────────────────────────────────────────
  const filteredSales = useMemo(() => {
    if (!salesList) return [];
    return salesList.filter((s: any) => {
      if (filterPayment !== "all" && s.paymentMethod !== filterPayment) return false;
      if (filterStaff !== "all" && s.staffId !== filterStaff) return false;
      if (filterDateFrom) {
        const saleDate = s.createdAt?.toDate?.();
        if (saleDate && saleDate < new Date(filterDateFrom)) return false;
      }
      if (filterDateTo) {
        const saleDate = s.createdAt?.toDate?.();
        const to = new Date(filterDateTo);
        to.setHours(23, 59, 59);
        if (saleDate && saleDate > to) return false;
      }
      if (tableSearch) {
        const q = tableSearch.toLowerCase();
        return (
          s.productName?.toLowerCase().includes(q) ||
          s.customerName?.toLowerCase().includes(q) ||
          s.staffName?.toLowerCase().includes(q) ||
          s.productSku?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [salesList, filterPayment, filterStaff, filterDateFrom, filterDateTo, tableSearch]);

  // ── Stats from filtered ──────────────────────────────────────────────────
  const stats = useMemo(() => ({
    count: filteredSales.length,
    revenue: filteredSales.reduce((sum: number, s: any) => sum + (s.amount || 0), 0),
    items: filteredSales.reduce((sum: number, s: any) => sum + (s.quantity || 1), 0),
  }), [filteredSales]);

  // ── Pagination ───────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const pagedSales = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSales.slice(start, start + PAGE_SIZE);
  }, [filteredSales, currentPage]);

  const hasActiveFilters =
    filterPayment !== "all" ||
    filterStaff !== "all" ||
    filterDateFrom !== "" ||
    filterDateTo !== "" ||
    tableSearch !== "";

  const clearFilters = () => {
    setFilterPayment("all");
    setFilterStaff("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setTableSearch("");
    setCurrentPage(1);
  };

  // ── CSV Export ───────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!filteredSales.length) return;
    const headers = ["Sana", "Mijoz", "Mahsulot", "SKU", "Miqdor", "Narx", "Jami", "Sotuvchi", "To'lov"];
    const rows = filteredSales.map((s: any) => [
      s.createdAt?.toDate?.().toLocaleDateString("uz-UZ") || "",
      s.customerName || "",
      s.productName || "",
      s.productSku || "",
      s.quantity || 1,
      s.unitPrice || 0,
      s.amount || 0,
      s.staffName || "",
      s.paymentMethod || "",
    ]);
    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sotuvlar_${new Date().toLocaleDateString("uz-UZ")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Form helpers ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData(defaultForm);
    setSelectedProduct(null);
    setQuantity(1);
    setSearchQuery("");
  };

  const handleModalChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) resetForm();
  };

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    setFormData((prev) => ({
      ...prev,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      unitPrice: product.salePrice || product.price || 0,
    }));
    setSearchQuery("");
  };

  const totalAmount = formData.unitPrice * quantity;

  // ── Add sale ─────────────────────────────────────────────────────────────
  const handleAddSale = async () => {
    if (!db) return;
    if (!formData.productId || !formData.staffId || quantity <= 0) {
      toast({ title: "Xatolik", description: "Barcha maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const staff = staffList?.find((s: any) => s.id === formData.staffId);
      const staffName = `${staff?.surname || ""} ${staff?.name || ""}`.trim();

      await runTransaction(db, async (transaction) => {
        const productRef = doc(db, "inventory", formData.productId);
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists()) throw new Error("Mahsulot topilmadi");
        const currentQty = productSnap.data().quantity || 0;
        if (currentQty < quantity) throw new Error(`Omborda faqat ${currentQty} ta mavjud`);

        const saleRef = doc(collection(db, "sales"));
        transaction.set(saleRef, {
          ...formData,
          quantity,
          amount: totalAmount,
          staffName,
          createdAt: serverTimestamp(),
          status: "completed",
        });

        transaction.update(productRef, {
          quantity: increment(-quantity),
          lastSold: serverTimestamp(),
          totalSold: increment(quantity),
        });

        const txRef = doc(collection(db, "inventory_transactions"));
        transaction.set(txRef, {
          productId: formData.productId,
          productName: formData.productName,
          productSku: formData.productSku,
          type: "sale",
          quantity: -quantity,
          staffId: formData.staffId,
          staffName,
          createdAt: serverTimestamp(),
        });
      });

      toast({ title: "✅ Sotuv muvaffaqiyatli", description: `${formData.productName} — ${quantity} ta sotildi` });
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Xatolik", description: error?.message || "Sotuvni saqlashda muammo", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Delete sale ──────────────────────────────────────────────────────────
  const handleDeleteSale = async (saleId: string) => {
    if (!db) return;
    const sale = salesList?.find((s: any) => s.id === saleId);
    if (!sale) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "sales", saleId));
      if (sale.productId) {
        batch.update(doc(db, "inventory", sale.productId), {
          quantity: increment(sale.quantity || 1),
          totalSold: increment(-(sale.quantity || 1)),
        });
      }
      await batch.commit();
      toast({ title: "O'chirildi", description: `${sale.quantity || 1} ta mahsulot inventarga qaytarildi` });
    } catch (error: any) {
      toast({ title: "Xatolik", description: "O'chirishda muammo", variant: "destructive" });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-auto">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <h1 className="text-2xl font-black flex items-center gap-2">
            <ShoppingBag className="text-orange-500" />
            SOTUVLAR
          </h1>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={!filteredSales.length}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              CSV
            </Button>

            <Dialog open={isModalOpen} onOpenChange={handleModalChange}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                  <Plus className="w-4 h-4" />
                  YANGI SOTUV
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    Yangi sotuv qo'shish
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Mijoz */}
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">Mijoz ismi</label>
                    <Input
                      placeholder="Mijoz ismini kiriting"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    />
                  </div>

                  {/* Mahsulot qidirish */}
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">
                      <Package className="inline w-4 h-4 mr-1" />
                      Mahsulot qidirish
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Nomi, SKU yoki shtrix-kod..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    {searchQuery && filteredProducts.length > 0 && (
                      <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto bg-white shadow-lg z-50 relative">
                        {filteredProducts.map((product: any) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleProductSelect(product)}
                            className="w-full text-left p-3 hover:bg-slate-50 border-b last:border-0 flex justify-between items-center"
                          >
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-xs text-slate-500">
                                SKU: {product.sku} | Omborda: {product.quantity} ta
                              </div>
                            </div>
                            <div className="text-green-600 font-bold text-sm">
                              {(product.salePrice || product.price || 0).toLocaleString()} so'm
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchQuery && filteredProducts.length === 0 && (
                      <div className="mt-2 p-3 text-sm text-slate-500 bg-slate-50 rounded-lg">
                        Mahsulot topilmadi
                      </div>
                    )}
                  </div>

                  {/* Tanlangan mahsulot */}
                  {selectedProduct && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-blue-900">{formData.productName}</div>
                          <div className="text-sm text-blue-700">SKU: {formData.productSku}</div>
                          <div className="text-sm text-blue-600 mt-1">
                            Omborda: <span className="font-bold">{selectedProduct.quantity} ta</span> mavjud
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => {
                            setSelectedProduct(null);
                            setQuantity(1);
                            setFormData((prev) => ({
                              ...prev,
                              productId: "",
                              productName: "",
                              productSku: "",
                              unitPrice: 0,
                            }));
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Miqdor va narx */}
                  {selectedProduct && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">Miqdori</label>
                        <Input
                          type="number"
                          min={1}
                          max={selectedProduct.quantity}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">Narxi (so'm)</label>
                        <Input
                          type="number"
                          min={0}
                          value={formData.unitPrice}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Jami */}
                  {selectedProduct && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex justify-between items-center">
                      <span className="text-green-800 font-medium">Jami summa:</span>
                      <span className="text-2xl font-black text-green-600">
                        {totalAmount.toLocaleString()} so'm
                      </span>
                    </div>
                  )}

                  {/* Sotuvchi */}
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">
                      <User className="inline w-4 h-4 mr-1" />
                      Sotuvchi
                    </label>
                    <Select
                      value={formData.staffId}
                      onValueChange={(v) => setFormData({ ...formData, staffId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sotuvchini tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffList?.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.surname} {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* To'lov */}
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">To'lov usuli</label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Naqd">Naqd pul</SelectItem>
                        <SelectItem value="Karta">Karta orqali</SelectItem>
                        <SelectItem value="Pul o'tkazmasi">Pul o'tkazmasi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                    Bekor qilish
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddSale}
                    disabled={loading || !selectedProduct || !formData.staffId}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saqlanmoqda...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Sotish
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Jami sotuvlar"
            value={String(stats.count)}
            icon={ShoppingCart}
            color="bg-blue-500"
          />
          <StatCard
            label="Jami daromad"
            value={`${stats.revenue.toLocaleString()} so'm`}
            icon={Banknote}
            color="bg-green-500"
          />
          <StatCard
            label="Sotilgan mahsulot"
            value={`${stats.items} ta`}
            icon={TrendingUp}
            color="bg-orange-500"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
              <Filter className="w-4 h-4" /> Filtr:
            </div>

            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Mahsulot, mijoz, sotuvchi..."
                className="pl-9 h-9 text-sm"
                value={tableSearch}
                onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>

            <Select value={filterPayment} onValueChange={(v) => { setFilterPayment(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 w-40 text-sm">
                <SelectValue placeholder="To'lov" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha to'lov</SelectItem>
                <SelectItem value="Naqd">Naqd</SelectItem>
                <SelectItem value="Karta">Karta</SelectItem>
                <SelectItem value="Pul o'tkazmasi">O'tkazma</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStaff} onValueChange={(v) => { setFilterStaff(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 w-40 text-sm">
                <SelectValue placeholder="Sotuvchi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha xodim</SelectItem>
                {staffList?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.surname} {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">dan</span>
              <Input
                type="date"
                className="h-9 w-36 text-sm"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">gacha</span>
              <Input
                type="date"
                className="h-9 w-36 text-sm"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-3.5 h-3.5" /> Tozalash
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 uppercase text-[11px] font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="p-4">Sana</th>
                <th className="p-4">Mijoz</th>
                <th className="p-4">Mahsulot</th>
                <th className="p-4">Miqdor</th>
                <th className="p-4">Sotuvchi</th>
                <th className="p-4">To'lov</th>
                <th className="p-4 text-right">Summa</th>
                <th className="p-4 text-center">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {salesLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : pagedSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center text-slate-500">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                    <p className="font-medium">
                      {hasActiveFilters ? "Filtr bo'yicha natija topilmadi" : "Hali sotuvlar yo'q"}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="mt-2 text-blue-500 text-sm hover:underline"
                      >
                        Filtrni tozalash
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                pagedSales.map((s: any) => (
                  <tr key={s.id} className="border-t hover:bg-slate-50 transition-colors">
                    <td className="p-4 whitespace-nowrap text-slate-600 text-xs">
                      <Calendar className="inline w-3 h-3 mr-1 text-slate-400" />
                      {s.createdAt?.toDate?.().toLocaleDateString("uz-UZ") || "—"}
                    </td>
                    <td className="p-4 text-slate-600 max-w-[120px] truncate">
                      {s.customerName || "Noma'lum"}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{s.productName}</div>
                      <div className="text-xs text-slate-400">SKU: {s.productSku}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                        {s.quantity || 1} ta
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      <User className="inline w-3 h-3 mr-1 text-slate-400" />
                      {s.staffName || "—"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          s.paymentMethod === "Naqd"
                            ? "bg-green-100 text-green-700"
                            : s.paymentMethod === "Karta"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-green-600 whitespace-nowrap">
                      {(s.amount || 0).toLocaleString()} so'm
                    </td>
                    <td className="p-4 text-center">
                      <DeleteConfirmDialog onConfirm={() => handleDeleteSale(s.id)}>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </DeleteConfirmDialog>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {!salesLoading && filteredSales.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
              <span className="text-xs text-slate-500">
                {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filteredSales.length)} / {filteredSales.length} ta
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce((acc: (number | string)[], p, i, arr) => {
                    if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`dot-${i}`} className="px-1 text-slate-400 text-xs">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={p}
                        variant={currentPage === p ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0 text-xs"
                        onClick={() => setCurrentPage(p as number)}
                      >
                        {p}
                      </Button>
                    )
                  )}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
