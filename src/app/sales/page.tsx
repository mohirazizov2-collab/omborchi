"use client";
 
import { useState, useMemo } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  Plus,
  Loader2,
  Trash2,
  Calendar,
  User,
  Package,
  Search,
  TrendingUp,
  Receipt,
  Filter,
  X,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  ArrowUpDown,
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
import { useUser } from "@/firebase";
 
// ─── Types ───────────────────────────────────────────────────────────────────
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
 
// ─── Delete Confirm ───────────────────────────────────────────────────────────
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
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Sotuvni o'chirish
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 py-2">
          Bu sotuvni o'chirsangiz, inventar miqdori avtomatik qaytariladi. Davom etasizmi?
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
          <Button variant="destructive" onClick={() => { setOpen(false); onConfirm(); }}>
            Ha, o'chirish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
 
// ─── Receipt Modal ────────────────────────────────────────────────────────────
function ReceiptModal({ sale, onClose }: { sale: any; onClose: () => void }) {
  if (!sale) return null;
  return (
    <Dialog open={!!sale} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-green-600" />
            Chek
          </DialogTitle>
        </DialogHeader>
        <div className="bg-slate-50 rounded-xl p-5 font-mono text-sm space-y-2 border">
          <div className="text-center font-black text-lg mb-3">omborchi.uz</div>
          <div className="border-t border-dashed pt-3 space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Sana:</span><span>{sale.createdAt?.toDate?.().toLocaleString("uz-UZ") || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Mijoz:</span><span>{sale.customerName || "Noma'lum"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Sotuvchi:</span><span>{sale.staffName || "—"}</span></div>
          </div>
          <div className="border-t border-dashed pt-3 space-y-1">
            <div className="flex justify-between font-bold"><span>{sale.productName}</span></div>
            <div className="flex justify-between text-slate-500">
              <span>{sale.quantity} ta × {(sale.unitPrice || 0).toLocaleString()} so'm</span>
            </div>
          </div>
          <div className="border-t border-dashed pt-3">
            <div className="flex justify-between font-black text-lg">
              <span>JAMI:</span>
              <span className="text-green-600">{(sale.amount || 0).toLocaleString()} so'm</span>
            </div>
            <div className="flex justify-between text-slate-500 mt-1">
              <span>To'lov:</span><span>{sale.paymentMethod}</span>
            </div>
          </div>
          <div className="text-center text-xs text-slate-400 border-t border-dashed pt-3">
            Xarid uchun rahmat!
          </div>
        </div>
        <Button variant="outline" onClick={onClose} className="w-full">Yopish</Button>
      </DialogContent>
    </Dialog>
  );
}
 
// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SalesPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { role } = useUser();
 
  const isSuperAdmin = role === "Super Admin";
  const isAdmin = role === "Admin" || isSuperAdmin;
 
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [receiptSale, setReceiptSale] = useState<any>(null);
 
  // Filters
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
 
  // Firebase queries
  const salesQuery = useMemoFirebase(() => (db ? collection(db, "sales") : null), [db]);
  const staffQuery = useMemoFirebase(() => (db ? collection(db, "staff") : null), [db]);
  const inventoryQuery = useMemoFirebase(() => (db ? collection(db, "inventory") : null), [db]);
 
  const { data: salesList, isLoading: salesLoading } = useCollection(salesQuery);
  const { data: staffList } = useCollection(staffQuery);
  const { data: inventoryList } = useCollection(inventoryQuery);
 
  // Product search
  const filteredProducts = useMemo(() =>
    inventoryList?.filter((item: any) =>
      (item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode?.includes(searchQuery)) &&
      (item.quantity > 0)
    ) || [], [inventoryList, searchQuery]);
 
  // Table filtering & sorting
  const filteredSales = useMemo(() => {
    let list = [...(salesList || [])];
    if (filterPayment !== "all") list = list.filter((s: any) => s.paymentMethod === filterPayment);
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      list = list.filter((s: any) =>
        s.productName?.toLowerCase().includes(q) ||
        s.customerName?.toLowerCase().includes(q) ||
        s.staffName?.toLowerCase().includes(q)
      );
    }
    list.sort((a: any, b: any) => {
      const ta = a.createdAt?.toDate?.()?.getTime() || 0;
      const tb = b.createdAt?.toDate?.()?.getTime() || 0;
      return sortOrder === "desc" ? tb - ta : ta - tb;
    });
    return list;
  }, [salesList, filterPayment, filterSearch, sortOrder]);
 
  // Stats
  const totalRevenue = useMemo(() =>
    salesList?.reduce((s: number, i: any) => s + (i.amount || 0), 0) || 0, [salesList]);
  const totalItems = useMemo(() =>
    salesList?.reduce((s: number, i: any) => s + (i.quantity || 1), 0) || 0, [salesList]);
  const todayRevenue = useMemo(() => {
    const today = new Date().toDateString();
    return salesList?.filter((s: any) =>
      s.createdAt?.toDate?.()?.toDateString() === today
    ).reduce((sum: number, s: any) => sum + (s.amount || 0), 0) || 0;
  }, [salesList]);
 
  const totalAmount = formData.unitPrice * quantity;
 
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
      productSku: product.sku || "",
      unitPrice: product.salePrice || product.price || 0,
    }));
    setSearchQuery("");
  };
 
  const handleAddSale = async () => {
    if (!db) return toast({ title: "Xatolik", description: "Bazaga ulanish yo'q", variant: "destructive" });
    if (!formData.productId || !formData.staffId || quantity <= 0) {
      return toast({ title: "Xatolik", description: "Barcha maydonlarni to'ldiring", variant: "destructive" });
    }
 
    setLoading(true);
    try {
      const staff = staffList?.find((s: any) => s.id === formData.staffId);
      const staffName = `${staff?.surname || ""} ${staff?.name || ""}`.trim();
 
      let savedSaleId = "";
 
      await runTransaction(db, async (transaction) => {
        const productRef = doc(db, "inventory", formData.productId);
        const productSnap = await transaction.get(productRef);
 
        if (!productSnap.exists()) throw new Error("Mahsulot topilmadi");
 
        const currentQty = productSnap.data().quantity || 0;
        if (currentQty < quantity) throw new Error(`Omborda faqat ${currentQty} ta mavjud`);
 
        const saleRef = doc(collection(db, "sales"));
        savedSaleId = saleRef.id;
 
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
          saleId: saleRef.id,
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
 
      toast({
        title: "✅ Sotuv muvaffaqiyatli",
        description: `${formData.productName} — ${quantity} ta sotildi`,
      });
 
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Xatolik", description: error?.message || "Sotuvni saqlashda muammo", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
 
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
      toast({ title: "Xatolik", description: "O'chirishda muammo yuz berdi", variant: "destructive" });
    }
  };
 
  const paymentIcon = (method: string) => {
    if (method === "Naqd") return <Banknote className="w-3 h-3" />;
    if (method === "Karta") return <CreditCard className="w-3 h-3" />;
    return <ArrowUpDown className="w-3 h-3" />;
  };
 
  const paymentColor = (method: string) => {
    if (method === "Naqd") return "bg-green-100 text-green-700";
    if (method === "Karta") return "bg-blue-100 text-blue-700";
    return "bg-purple-100 text-purple-700";
  };
 
  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-auto">
 
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <ShoppingBag className="text-orange-500" />
              SOTUVLAR
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Barcha sotuvlar va daromadlar</p>
          </div>
 
          <Dialog open={isModalOpen} onOpenChange={handleModalChange}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                <Plus className="mr-2 h-4 w-4" />
                YANGI SOTUV
              </Button>
            </DialogTrigger>
 
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                  Yangi sotuv qo'shish
                </DialogTitle>
              </DialogHeader>
 
              <div className="space-y-4 py-4">
                {/* Mijoz */}
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">Mijoz ismi</label>
                  <Input
                    placeholder="Mijoz ismini kiriting (ixtiyoriy)"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>
 
                {/* Mahsulot qidirish */}
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">
                    <Package className="inline w-4 h-4 mr-1" />
                    Mahsulot qidirish *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Nomi, SKU yoki shtrix-kod..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={!!selectedProduct}
                    />
                  </div>
 
                  {searchQuery && !selectedProduct && filteredProducts.length > 0 && (
                    <div className="mt-2 border rounded-xl max-h-44 overflow-y-auto bg-white shadow-xl z-50 relative">
                      {filteredProducts.map((product: any) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product)}
                          className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-0 flex justify-between items-center transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-slate-800">{product.name}</div>
                            <div className="text-xs text-slate-400">SKU: {product.sku} | Omborda: <span className="font-bold text-green-600">{product.quantity} ta</span></div>
                          </div>
                          <div className="text-green-600 font-black text-sm shrink-0 ml-2">
                            {(product.salePrice || product.price || 0).toLocaleString()} so'm
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
 
                  {searchQuery && !selectedProduct && filteredProducts.length === 0 && (
                    <div className="mt-2 p-3 text-sm text-slate-400 bg-slate-50 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Mahsulot topilmadi yoki omborda yo'q
                    </div>
                  )}
                </div>
 
                {/* Tanlangan mahsulot */}
                {selectedProduct && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-black text-blue-900">{formData.productName}</div>
                        <div className="text-sm text-blue-600">SKU: {formData.productSku}</div>
                        <div className="text-sm text-slate-600 mt-1">
                          Omborda: <span className={`font-black ${selectedProduct.quantity < 5 ? "text-red-500" : "text-green-600"}`}>{selectedProduct.quantity} ta</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => {
                          setSelectedProduct(null);
                          setQuantity(1);
                          setFormData((prev) => ({ ...prev, productId: "", productName: "", productSku: "", unitPrice: 0 }));
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
 
                {/* Miqdor va narx */}
                {selectedProduct && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-600 mb-1 block">Miqdori *</label>
                      <Input
                        type="number"
                        min={1}
                        max={selectedProduct.quantity}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.min(selectedProduct.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                        className={quantity > selectedProduct.quantity ? "border-red-400" : ""}
                      />
                      {quantity > selectedProduct.quantity && (
                        <p className="text-xs text-red-500 mt-1">Omborda yetarli emas</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600 mb-1 block">Narxi (so'm) *</label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.unitPrice}
                        onChange={(e) => setFormData((prev) => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                )}
 
                {/* Jami */}
                {selectedProduct && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-green-800 font-medium">Jami summa:</span>
                      <span className="text-2xl font-black text-green-600">{totalAmount.toLocaleString()} so'm</span>
                    </div>
                    <div className="text-xs text-green-600 mt-1">{quantity} ta × {formData.unitPrice.toLocaleString()} so'm</div>
                  </div>
                )}
 
                {/* Sotuvchi */}
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">
                    <User className="inline w-4 h-4 mr-1" />
                    Sotuvchi *
                  </label>
                  <Select value={formData.staffId} onValueChange={(v) => setFormData({ ...formData, staffId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sotuvchini tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.surname} {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
 
                {/* To'lov usuli */}
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">To'lov usuli *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Naqd", "Karta", "Pul o'tkazmasi"].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: method })}
                        className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                          formData.paymentMethod === method
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {method === "Naqd" ? "💵" : method === "Karta" ? "💳" : "🏦"} {method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
 
              <DialogFooter className="gap-2">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Bekor qilish</Button>
                <Button
                  type="button"
                  onClick={handleAddSale}
                  disabled={loading || !selectedProduct || !formData.staffId || quantity > (selectedProduct?.quantity || 0)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saqlanmoqda...</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-4 w-4" />Sotish</>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
 
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Jami sotuvlar</div>
              <ShoppingBag className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-3xl font-black text-slate-800">{salesList?.length || 0}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Jami daromad</div>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-2xl font-black text-green-600">{totalRevenue.toLocaleString()}</div>
            <div className="text-xs text-slate-400">so'm</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Sotilgan</div>
              <Package className="w-4 h-4 text-blue-300" />
            </div>
            <div className="text-3xl font-black text-blue-600">{totalItems}</div>
            <div className="text-xs text-slate-400">ta mahsulot</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Bugun</div>
              <Calendar className="w-4 h-4 text-orange-300" />
            </div>
            <div className="text-2xl font-black text-orange-500">{todayRevenue.toLocaleString()}</div>
            <div className="text-xs text-slate-400">so'm</div>
          </div>
        </div>
 
        {/* Filters */}
        <div className="bg-white rounded-2xl border shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Qidirish: mahsulot, mijoz, sotuvchi..."
              className="pl-10 bg-slate-50 border-0"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>
          <Select value={filterPayment} onValueChange={setFilterPayment}>
            <SelectTrigger className="w-44 bg-slate-50 border-0">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha to'lovlar</SelectItem>
              <SelectItem value="Naqd">💵 Naqd</SelectItem>
              <SelectItem value="Karta">💳 Karta</SelectItem>
              <SelectItem value="Pul o'tkazmasi">🏦 O'tkazma</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className="bg-slate-50 border-0 font-medium"
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            {sortOrder === "desc" ? "Yangi avval" : "Eski avval"}
          </Button>
          {(filterSearch || filterPayment !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterSearch(""); setFilterPayment("all"); }} className="text-red-500 hover:text-red-600">
              <X className="w-4 h-4 mr-1" /> Tozalash
            </Button>
          )}
          <div className="text-xs text-slate-400 ml-auto">{filteredSales.length} ta natija</div>
        </div>
 
        {/* Table */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Sana</th>
                <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Mijoz</th>
                <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Mahsulot</th>
                <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Miqdor</th>
                <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">Sotuvchi</th>
                <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">To'lov</th>
                <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Summa</th>
                <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Amal</th>
              </tr>
            </thead>
            <tbody>
              {salesLoading ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-400" />
                    <p className="text-slate-400 mt-2 text-sm">Yuklanmoqda...</p>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center">
                    <ShoppingBag className="h-14 w-14 mx-auto mb-3 text-slate-200" />
                    <p className="text-slate-400 font-medium">
                      {filterSearch || filterPayment !== "all" ? "Filtr bo'yicha natija topilmadi" : "Hali sotuvlar yo'q"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((s: any) => (
                  <tr key={s.id} className="border-t hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {s.createdAt?.toDate?.().toLocaleDateString("uz-UZ") || "—"}
                      <div className="text-[10px] text-slate-300">
                        {s.createdAt?.toDate?.().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.customerName || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{s.productName}</div>
                      {s.productSku && <div className="text-[10px] text-slate-400">SKU: {s.productSku}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-black">
                        {s.quantity || 1} ta
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{s.staffName || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${paymentColor(s.paymentMethod)}`}>
                        {paymentIcon(s.paymentMethod)}
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-black text-green-600">{(s.amount || 0).toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400">so'm</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => setReceiptSale(s)}
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8 p-0"
                        >
                          <Receipt className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <DeleteConfirmDialog onConfirm={() => handleDeleteSale(s.id)}>
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </DeleteConfirmDialog>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredSales.length > 0 && (
              <tfoot className="bg-slate-50 border-t">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-xs font-black text-slate-500 uppercase">
                    Jami ({filteredSales.length} ta sotuv)
                  </td>
                  <td className="px-4 py-3 text-right font-black text-green-600">
                    {filteredSales.reduce((s: number, i: any) => s + (i.amount || 0), 0).toLocaleString()} so'm
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
 
        {/* Receipt Modal */}
        <ReceiptModal sale={receiptSale} onClose={() => setReceiptSale(null)} />
      </main>
    </div>
  );
}
