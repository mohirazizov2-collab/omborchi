"use client";

import { useState } from "react";
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
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
  increment,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface FormData {
  customerName: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  staffId: string;
  paymentMethod: string;
}

const defaultForm: FormData = {
  customerName: "",
  productId: "",
  productName: "",
  productSku: "",
  quantity: 1,
  unitPrice: 0,
  totalAmount: 0,
  staffId: "",
  paymentMethod: "Naqd",
};

export default function SalesPage() {
  const { toast } = useToast();
  const db = useFirestore();

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [formData, setFormData] = useState<FormData>(defaultForm);

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

  const filteredProducts =
    inventoryList?.filter(
      (item: any) =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode?.includes(searchQuery)
    ) || [];

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
    const price = product.salePrice || product.price || 0;
    setFormData((prev) => ({
      ...prev,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      unitPrice: price,
      totalAmount: price * quantity,
    }));
    setSearchQuery("");
  };

  const handleQuantityChange = (val: string) => {
    const qty = Math.max(1, parseInt(val) || 1);
    setQuantity(qty);
    setFormData((prev) => ({
      ...prev,
      quantity: qty,
      totalAmount: prev.unitPrice * qty,
    }));
  };

  const handlePriceChange = (val: string) => {
    const price = parseFloat(val) || 0;
    setFormData((prev) => ({
      ...prev,
      unitPrice: price,
      totalAmount: price * quantity,
    }));
  };

  const handleAddSale = async () => {
    if (!db) {
      toast({ title: "Xatolik", description: "Bazaga ulanish yo'q", variant: "destructive" });
      return;
    }
    if (!formData.productId || !formData.staffId || quantity <= 0) {
      toast({
        title: "Xatolik",
        description: "Barcha maydonlarni to'ldiring",
        variant: "destructive",
      });
      return;
    }
    if (selectedProduct && selectedProduct.quantity < quantity) {
      toast({
        title: "Omborda yetarli mahsulot yo'q",
        description: `Faqat ${selectedProduct.quantity} ta mavjud`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const staff = staffList?.find((s: any) => s.id === formData.staffId);
      const staffName = `${staff?.surname || ""} ${staff?.name || ""}`.trim();
      const batch = writeBatch(db);

      // 1. Sotuv yozuvi
      const saleRef = doc(collection(db, "sales"));
      batch.set(saleRef, {
        ...formData,
        quantity,
        amount: formData.totalAmount,
        staffName,
        createdAt: serverTimestamp(),
        status: "completed",
      });

      // 2. Inventardan ayirish
      const productRef = doc(db, "inventory", formData.productId);
      batch.update(productRef, {
        quantity: increment(-quantity),
        lastSold: serverTimestamp(),
        totalSold: increment(quantity),
      });

      // 3. Tranzaksiya yozuvi
      const txRef = doc(collection(db, "inventory_transactions"));
      batch.set(txRef, {
        productId: formData.productId,
        productName: formData.productName,
        productSku: formData.productSku,
        type: "sale",
        quantity: -quantity,
        saleId: saleRef.id,
        staffId: formData.staffId,
        staffName,
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      toast({
        title: "Sotuv muvaffaqiyatli",
        description: `${formData.productName} — ${quantity} ta sotildi`,
      });

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Sale error:", error);
      toast({
        title: "Xatolik yuz berdi",
        description: "Sotuvni saqlashda muammo yuz berdi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!db || !confirm("Sotuvni o'chirishni xohlaysizmi?")) return;
    try {
      await deleteDoc(doc(db, "sales", saleId));
      toast({ title: "O'chirildi", description: "Sotuv muvaffaqiyatli o'chirildi" });
    } catch {
      toast({ title: "Xatolik", description: "O'chirishda muammo", variant: "destructive" });
    }
  };

  const totalRevenue = salesList?.reduce((sum: number, s: any) => sum + (s.amount || 0), 0) || 0;
  const totalItems = salesList?.reduce((sum: number, s: any) => sum + (s.quantity || 1), 0) || 0;

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <OmniSidebar />
      <main className="flex-1 p-10">

        {/* Sarlavha */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-black flex items-center gap-2">
            <ShoppingBag className="text-orange-500" />
            SOTUVLAR
          </h1>

          <Dialog open={isModalOpen} onOpenChange={handleModalChange}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
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

                {/* Mijoz ismi */}
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">
                    Mijoz ismi
                  </label>
                  <Input
                    placeholder="Mijoz ismini kiriting"
                    value={formData.customerName}
                    onChange={(e) =>
                      setFormData({ ...formData, customerName: e.target.value })
                    }
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
                          Omborda:{" "}
                          <span className="font-bold">{selectedProduct.quantity} ta</span> mavjud
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => {
                          setSelectedProduct(null);
                          setFormData((prev) => ({
                            ...prev,
                            productId: "",
                            productName: "",
                            productSku: "",
                            unitPrice: 0,
                            totalAmount: 0,
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
                      <label className="text-sm font-medium text-slate-600 mb-1 block">
                        Miqdori
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={selectedProduct.quantity}
                        value={quantity}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600 mb-1 block">
                        Narxi (so'm)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.unitPrice}
                        onChange={(e) => handlePriceChange(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Jami summa */}
                {selectedProduct && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-green-800 font-medium">Jami summa:</span>
                      <span className="text-2xl font-black text-green-600">
                        {formData.totalAmount.toLocaleString()} so'm
                      </span>
                    </div>
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

                {/* To'lov usuli */}
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">
                    To'lov usuli
                  </label>
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
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                >
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

        {/* Jadval */}
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
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                  </td>
                </tr>
              ) : !salesList || salesList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>Hali sotuvlar yo'q</p>
                  </td>
                </tr>
              ) : (
                salesList.map((s: any) => (
                  <tr
                    key={s.id}
                    className="border-t hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 whitespace-nowrap text-slate-600">
                      <Calendar className="inline w-3 h-3 mr-1 text-slate-400" />
                      {s.createdAt?.toDate?.().toLocaleDateString("uz-UZ") || "—"}
                    </td>
                    <td className="p-4 text-slate-600">
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
                    <td className="p-4 text-slate-600">
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
                    <td className="p-4 text-right font-bold text-green-600">
                      {(s.amount || 0).toLocaleString()} so'm
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => handleDeleteSale(s.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Statistika */}
        {salesList && salesList.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Jami sotuvlar</div>
              <div className="text-3xl font-black text-slate-800">{salesList.length}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Jami daromad</div>
              <div className="text-3xl font-black text-green-600">
                {totalRevenue.toLocaleString()} so'm
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Sotilgan mahsulot</div>
              <div className="text-3xl font-black text-blue-600">{totalItems} ta</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
