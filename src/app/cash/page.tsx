"use client";
 
import { useState, useEffect, useRef } from "react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase"; // sizning firebase config yo'li
import { useAuth } from "@/hooks/useAuth"; // sizning auth hook yo'li
 
// ============ TYPES ============
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  warehouseId: string;
}
 
interface CartItem extends Product {
  quantity: number;
}
 
interface Sale {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  cashierName: string;
  warehouseId: string;
  createdAt: any;
}
 
// ============ MAIN COMPONENT ============
export default function CashPage() {
  const { user } = useAuth();
 
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
 
  // ============ DATA FETCHING ============
  useEffect(() => {
    fetchProducts();
    fetchRecentSales();
  }, []);
 
  async function fetchProducts() {
    try {
      const snap = await getDocs(collection(db, "products"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
      setProducts(data);
    } catch (e) {
      console.error("Products fetch error:", e);
    }
  }
 
  async function fetchRecentSales() {
    try {
      const q = query(
        collection(db, "sales"),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale));
      setRecentSales(data);
    } catch (e) {
      console.error("Sales fetch error:", e);
    }
  }
 
  // ============ CART LOGIC ============
  function addToCart(product: Product) {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }
 
  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }
 
  function updateQty(id: string, qty: number) {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const maxQty = Math.min(qty, i.stock);
        return { ...i, quantity: maxQty };
      })
    );
  }
 
  function clearCart() {
    setCart([]);
    setCashGiven(0);
  }
 
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const change = cashGiven - total;
 
  // ============ CHECKOUT ============
  async function handleCheckout() {
    if (cart.length === 0) return;
    if (paymentMethod === "cash" && cashGiven < total) {
      alert("Berilgan naqd pul yetarli emas!");
      return;
    }
 
    setLoading(true);
    try {
      const saleData = {
        items: cart.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          subtotal: i.price * i.quantity,
        })),
        total,
        paymentMethod,
        cashGiven: paymentMethod === "cash" ? cashGiven : total,
        change: paymentMethod === "cash" ? change : 0,
        cashierName: user?.displayName || user?.email || "Cashier",
        cashierId: user?.uid || "",
        warehouseId: cart[0]?.warehouseId || "",
        createdAt: serverTimestamp(),
      };
 
      const saleRef = await addDoc(collection(db, "sales"), saleData);
 
      // Stock kamaytirish
      for (const item of cart) {
        const productRef = doc(db, "products", item.id);
        await updateDoc(productRef, {
          stock: increment(-item.quantity),
        });
      }
 
      setLastSale({ id: saleRef.id, ...saleData } as any);
      setShowReceipt(true);
      setSuccessMsg("Sotuv muvaffaqiyatli amalga oshirildi!");
      clearCart();
      fetchProducts();
      fetchRecentSales();
 
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      console.error("Checkout error:", e);
      alert("Xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  }
 
  // ============ FILTERS ============
  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];
 
  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "all" || p.category === selectedCategory;
    return matchSearch && matchCat;
  });
 
  // ============ FORMAT ============
  function formatMoney(amount: number) {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
  }
 
  function formatDate(ts: any) {
    if (!ts) return "-";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString("uz-UZ");
  }
 
  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* TOP NAV */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-sm font-bold">
            K
          </div>
          <span className="text-lg font-semibold">Kassa</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("pos")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === "pos"
                ? "bg-emerald-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Sotuv
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === "history"
                ? "bg-emerald-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Tarix
          </button>
        </div>
        <div className="text-sm text-gray-400">
          {user?.displayName || user?.email}
        </div>
      </header>
 
      {/* SUCCESS MSG */}
      {successMsg && (
        <div className="bg-emerald-600 text-white text-center py-2 text-sm font-medium">
          ✓ {successMsg}
        </div>
      )}
 
      {/* POS TAB */}
      {activeTab === "pos" && (
        <div className="flex h-[calc(100vh-56px)]">
          {/* LEFT: Products */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search + Category */}
            <div className="p-4 border-b border-gray-800 space-y-3">
              <input
                ref={searchRef}
                type="text"
                placeholder="Mahsulot qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      selectedCategory === cat
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {cat === "all" ? "Barchasi" : cat}
                  </button>
                ))}
              </div>
            </div>
 
            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 content-start">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className={`bg-gray-800 border rounded-xl p-3 text-left transition hover:border-emerald-500 active:scale-95 ${
                    product.stock <= 0
                      ? "border-gray-700 opacity-50 cursor-not-allowed"
                      : "border-gray-700 hover:bg-gray-750 cursor-pointer"
                  }`}
                >
                  <div className="w-full h-16 bg-gray-700 rounded-lg mb-2 flex items-center justify-center text-2xl">
                    📦
                  </div>
                  <p className="text-sm font-medium text-white truncate">{product.name}</p>
                  <p className="text-xs text-emerald-400 font-bold mt-1">
                    {formatMoney(product.price)}
                  </p>
                  <p className={`text-xs mt-1 ${product.stock <= 5 ? "text-red-400" : "text-gray-500"}`}>
                    Qoldi: {product.stock}
                  </p>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center text-gray-500 py-16">
                  Mahsulot topilmadi
                </div>
              )}
            </div>
          </div>
 
          {/* RIGHT: Cart */}
          <div className="w-80 lg:w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
            {/* Cart Header */}
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <span className="font-semibold">Savat ({cart.length})</span>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Tozalash
                </button>
              )}
            </div>
 
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 && (
                <div className="text-center text-gray-600 py-16 text-sm">
                  Savat bo'sh
                </div>
              )}
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-800 rounded-lg p-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-emerald-400">
                      {formatMoney(item.price)} × {item.quantity}
                    </p>
                    <p className="text-xs text-white font-bold">
                      = {formatMoney(item.price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-6 h-6 bg-gray-700 rounded text-sm hover:bg-gray-600 flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-6 h-6 bg-gray-700 rounded text-sm hover:bg-gray-600 flex items-center justify-center"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-6 h-6 bg-red-900 rounded text-xs hover:bg-red-800 flex items-center justify-center ml-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
 
            {/* Payment Section */}
            <div className="border-t border-gray-800 p-4 space-y-3">
              {/* Total */}
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Jami:</span>
                <span className="text-emerald-400">{formatMoney(total)}</span>
              </div>
 
              {/* Payment Method */}
              <div className="grid grid-cols-3 gap-1">
                {(["cash", "card", "transfer"] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 rounded-lg text-xs font-medium transition ${
                      paymentMethod === method
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {method === "cash" ? "💵 Naqd" : method === "card" ? "💳 Karta" : "📱 O'tkazma"}
                  </button>
                ))}
              </div>
 
              {/* Cash Given Input */}
              {paymentMethod === "cash" && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Berilgan pul:</label>
                  <input
                    type="number"
                    value={cashGiven || ""}
                    onChange={(e) => setCashGiven(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="0"
                  />
                  {cashGiven > 0 && (
                    <div className={`flex justify-between text-sm ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      <span>Qaytim:</span>
                      <span className="font-bold">{formatMoney(Math.max(0, change))}</span>
                    </div>
                  )}
                  {/* Quick amounts */}
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {[10000, 20000, 50000, 100000, 200000, 500000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setCashGiven(amt)}
                        className="py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-400"
                      >
                        {amt >= 1000 ? amt / 1000 + "K" : amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
 
              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={
                  loading ||
                  cart.length === 0 ||
                  (paymentMethod === "cash" && cashGiven < total)
                }
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-bold text-base transition"
              >
                {loading ? "Amalga oshirilmoqda..." : `✓ To'lash — ${formatMoney(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="p-6 max-w-5xl mx-auto">
          <h2 className="text-xl font-bold mb-4">So'nggi sotuvlar</h2>
          <div className="space-y-3">
            {recentSales.length === 0 && (
              <div className="text-center text-gray-500 py-16">Sotuvlar yo'q</div>
            )}
            {recentSales.map((sale) => (
              <div key={sale.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-400 font-mono">#{sale.id.slice(-8)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(sale.createdAt)}</p>
                    <p className="text-xs text-gray-500">{sale.cashierName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-bold">{formatMoney(sale.total)}</p>
                    <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full text-gray-400">
                      {sale.paymentMethod === "cash"
                        ? "Naqd"
                        : sale.paymentMethod === "card"
                        ? "Karta"
                        : "O'tkazma"}
                    </span>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {sale.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs text-gray-400">
                      <span>{item.name} × {item.quantity}</span>
                      <span>{formatMoney(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
 
      {/* RECEIPT MODAL */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-4">
              <div className="text-3xl mb-1">🧾</div>
              <h3 className="text-lg font-bold">Chek</h3>
              <p className="text-xs text-gray-500">#{lastSale.id?.slice(-8)}</p>
            </div>
 
            <div className="border-t border-dashed border-gray-300 py-3 space-y-1">
              {lastSale.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span className="font-medium">{formatMoney(item.subtotal)}</span>
                </div>
              ))}
            </div>
 
            <div className="border-t border-dashed border-gray-300 pt-3 space-y-1">
              <div className="flex justify-between font-bold text-lg">
                <span>Jami:</span>
                <span>{formatMoney(lastSale.total)}</span>
              </div>
              {lastSale.paymentMethod === "cash" && (
                <>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Berildi:</span>
                    <span>{formatMoney((lastSale as any).cashGiven)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Qaytim:</span>
                    <span>{formatMoney((lastSale as any).change)}</span>
                  </div>
                </>
              )}
            </div>
 
            <div className="text-center text-xs text-gray-400 mt-3">
              Xarid uchun rahmat!
            </div>
 
            <button
              onClick={() => setShowReceipt(false)}
              className="w-full mt-4 py-2.5 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
 
