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
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

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
  customPrice: number;
}

interface SaleItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  paymentMethod: string;
  cashierName: string;
  cashierId: string;
  warehouseId: string;
  cashGiven?: number;
  change?: number;
  createdAt: any;
}

type TabType = "pos" | "history" | "payments" | "report";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(amount)) + " so'm";
}

function formatDate(ts: any) {
  if (!ts) return "-";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString("uz-UZ");
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}

export default function CashPage() {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [cashGiven, setCashGiven] = useState(0);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("pos");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Sale[]>([]);
  const [report, setReport] = useState({
    totalRevenue: 0, cashRevenue: 0, cardRevenue: 0, transferRevenue: 0,
    salesCount: 0, itemsSold: 0,
    topProducts: [] as { name: string; qty: number; revenue: number }[],
  });
  const [customPriceItem, setCustomPriceItem] = useState<CartItem | null>(null);
  const [tempPrice, setTempPrice] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchRecentSales();
    fetchPayments();
    fetchDailyReport();
  }, []);

  async function fetchProducts() {
    try {
      const snap = await getDocs(collection(db, "products"));
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
    } catch (e) { console.error(e); }
  }

  async function fetchRecentSales() {
    try {
      const q = query(collection(db, "sales"), orderBy("createdAt", "desc"), limit(30));
      const snap = await getDocs(q);
      setRecentSales(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale)));
    } catch (e) { console.error(e); }
  }

  async function fetchPayments() {
    try {
      const q = query(collection(db, "sales"), orderBy("createdAt", "desc"), limit(50));
      const snap = await getDocs(q);
      setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale)));
    } catch (e) { console.error(e); }
  }

  async function fetchDailyReport() {
    try {
      const { start, end } = todayRange();
      const q = query(
        collection(db, "sales"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end)
      );
      const snap = await getDocs(q);
      const sales = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale));
      let totalRevenue = 0, cashRev = 0, cardRev = 0, transferRev = 0, itemsSold = 0;
      const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
      for (const s of sales) {
        totalRevenue += s.total;
        if (s.paymentMethod === "cash") cashRev += s.total;
        else if (s.paymentMethod === "card") cardRev += s.total;
        else transferRev += s.total;
        for (const item of s.items || []) {
          itemsSold += item.quantity;
          if (!productMap[item.id]) productMap[item.id] = { name: item.name, qty: 0, revenue: 0 };
          productMap[item.id].qty += item.quantity;
          productMap[item.id].revenue += item.subtotal;
        }
      }
      const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      setReport({ totalRevenue, cashRevenue: cashRev, cardRevenue: cardRev, transferRevenue: transferRev, salesCount: sales.length, itemsSold, topProducts });
    } catch (e) { console.error(e); }
  }

  function addToCart(product: Product) {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1, customPrice: product.price }];
    });
  }

  function removeFromCart(id: string) { setCart((prev) => prev.filter((i) => i.id !== id)); }

  function updateQty(id: string, qty: number) {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, quantity: Math.min(qty, i.stock) } : i));
  }

  function clearCart() { setCart([]); setCashGiven(0); }

  function openCustomPrice(item: CartItem) { setCustomPriceItem(item); setTempPrice(String(item.customPrice)); }

  function applyCustomPrice() {
    if (!customPriceItem) return;
    const price = parseFloat(tempPrice);
    if (isNaN(price) || price < 0) return;
    setCart((prev) => prev.map((i) => i.id === customPriceItem.id ? { ...i, customPrice: price } : i));
    setCustomPriceItem(null); setTempPrice("");
  }

  const total = cart.reduce((sum, i) => sum + i.customPrice * i.quantity, 0);
  const change = cashGiven - total;

  async function handleCheckout() {
    if (cart.length === 0) return;
    if (paymentMethod === "cash" && cashGiven < total) { alert("Berilgan naqd pul yetarli emas!"); return; }
    setLoading(true);
    try {
      const saleData = {
        items: cart.map((i) => ({ id: i.id, name: i.name, price: i.customPrice, originalPrice: i.price, quantity: i.quantity, subtotal: i.customPrice * i.quantity })),
        total, paymentMethod,
        cashGiven: paymentMethod === "cash" ? cashGiven : total,
        change: paymentMethod === "cash" ? Math.max(0, change) : 0,
        cashierName: user?.displayName || user?.email || "Cashier",
        cashierId: user?.uid || "",
        warehouseId: cart[0]?.warehouseId || "",
        createdAt: serverTimestamp(),
      };
      const saleRef = await addDoc(collection(db, "sales"), saleData);
      for (const item of cart) await updateDoc(doc(db, "products", item.id), { stock: increment(-item.quantity) });
      setLastSale({ id: saleRef.id, ...saleData } as any);
      setShowReceipt(true);
      setSuccessMsg("Sotuv muvaffaqiyatli amalga oshirildi!");
      clearCart();
      fetchProducts(); fetchRecentSales(); fetchPayments(); fetchDailyReport();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) { console.error(e); alert("Xatolik yuz berdi."); }
    finally { setLoading(false); }
  }

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];
  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "all" || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "pos", label: "Sotuv", icon: "🛒" },
    { key: "history", label: "Tarix", icon: "📋" },
    { key: "payments", label: "To'lovlar", icon: "💳" },
    { key: "report", label: "Hisobot", icon: "📊" },
  ];

  const payBadge = (method: string) =>
    method === "cash" ? "bg-green-900/50 text-green-400"
    : method === "card" ? "bg-blue-900/50 text-blue-400"
    : "bg-purple-900/50 text-purple-400";

  const payLabel = (method: string) =>
    method === "cash" ? "💵 Naqd" : method === "card" ? "💳 Karta" : "📱 O'tkazma";

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: "system-ui,sans-serif" }}>

      {/* HEADER */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-sm">K</div>
          <span className="font-semibold hidden sm:block">Kassa</span>
        </div>
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                activeTab === t.key ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}>
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="text-xs text-gray-500 truncate max-w-[120px]">{user?.displayName || user?.email || "Cashier"}</div>
      </header>

      {successMsg && (
        <div className="bg-emerald-700 text-white text-center py-2 text-sm font-medium">✓ {successMsg}</div>
      )}

      {/* ===== POS ===== */}
      {activeTab === "pos" && (
        <div className="flex h-[calc(100vh-52px)]">
          {/* Products */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-800 space-y-2">
              <input ref={searchRef} type="text" placeholder="🔍 Mahsulot qidirish..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-white" />
              <div className="flex gap-1.5 flex-wrap">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      selectedCategory === cat ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}>
                    {cat === "all" ? "Barchasi" : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 content-start">
              {filteredProducts.map((product) => (
                <button key={product.id} onClick={() => addToCart(product)} disabled={product.stock <= 0}
                  className={`bg-gray-800 border rounded-xl p-3 text-left transition active:scale-95 ${
                    product.stock <= 0 ? "border-gray-700 opacity-40 cursor-not-allowed" : "border-gray-700 hover:border-emerald-500 cursor-pointer"
                  }`}>
                  <div className="w-full h-14 bg-gray-700 rounded-lg mb-2 flex items-center justify-center text-2xl">📦</div>
                  <p className="text-xs font-semibold text-white truncate">{product.name}</p>
                  <p className="text-xs text-emerald-400 font-bold mt-0.5">{formatMoney(product.price)}</p>
                  <p className={`text-xs mt-0.5 ${product.stock <= 5 ? "text-red-400" : "text-gray-500"}`}>Qoldi: {product.stock}</p>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center text-gray-600 py-20 text-sm">Mahsulot topilmadi</div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="w-72 lg:w-80 xl:w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <span className="font-semibold text-sm">Savat ({cart.length})</span>
              {cart.length > 0 && <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-300">Tozalash</button>}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {cart.length === 0 && <div className="text-center text-gray-600 py-20 text-sm">Savat bo'sh</div>}
              {cart.map((item) => (
                <div key={item.id} className="bg-gray-800 rounded-xl p-2.5">
                  <div className="flex items-start justify-between mb-1.5">
                    <p className="text-xs font-medium text-white flex-1 truncate mr-2">{item.name}</p>
                    <button onClick={() => removeFromCart(item.id)} className="w-5 h-5 bg-red-900/60 hover:bg-red-800 rounded text-xs flex items-center justify-center">✕</button>
                  </div>

                  {/* Custom price button */}
                  <button onClick={() => openCustomPrice(item)}
                    className="w-full text-left text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-lg mb-1.5 flex items-center gap-1">
                    <span className="text-emerald-400 font-bold">{formatMoney(item.customPrice)}</span>
                    {item.customPrice !== item.price && (
                      <span className="text-gray-500 line-through text-[10px]">{formatMoney(item.price)}</span>
                    )}
                    <span className="ml-auto text-gray-500 text-[10px]">✏️ o'zgartirish</span>
                  </button>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-sm">−</button>
                      <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-sm">+</button>
                    </div>
                    <span className="text-xs font-bold">{formatMoney(item.customPrice * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment */}
            <div className="border-t border-gray-800 p-3 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Jami:</span>
                <span className="text-xl font-bold text-emerald-400">{formatMoney(total)}</span>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {(["cash", "card", "transfer"] as const).map((m) => (
                  <button key={m} onClick={() => setPaymentMethod(m)}
                    className={`py-2 rounded-lg text-xs font-medium transition ${
                      paymentMethod === m ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}>
                    {m === "cash" ? "💵 Naqd" : m === "card" ? "💳 Karta" : "📱 O'tkazma"}
                  </button>
                ))}
              </div>

              {paymentMethod === "cash" && (
                <div className="space-y-1.5">
                  <input type="number" value={cashGiven || ""} onChange={(e) => setCashGiven(Number(e.target.value))}
                    placeholder="Berilgan pul"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                  {cashGiven > 0 && (
                    <div className={`flex justify-between text-sm font-bold ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      <span>Qaytim:</span><span>{formatMoney(Math.max(0, change))}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-1">
                    {[10000, 20000, 50000, 100000, 200000, 500000].map((amt) => (
                      <button key={amt} onClick={() => setCashGiven(amt)} className="py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-400">
                        {amt / 1000}K
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleCheckout}
                disabled={loading || cart.length === 0 || (paymentMethod === "cash" && cashGiven < total)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition">
                {loading ? "Amalga oshirilmoqda..." : `✓ To'lash — ${formatMoney(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== HISTORY ===== */}
      {activeTab === "history" && (
        <div className="p-4 max-w-4xl mx-auto">
          <h2 className="text-lg font-bold mb-4">📋 So'nggi sotuvlar</h2>
          <div className="space-y-2">
            {recentSales.length === 0 && <div className="text-center text-gray-500 py-20">Sotuvlar yo'q</div>}
            {recentSales.map((sale) => (
              <div key={sale.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-gray-500 font-mono">#{sale.id.slice(-8)}</p>
                    <p className="text-xs text-gray-500">{formatDate(sale.createdAt)}</p>
                    <p className="text-xs text-gray-400">{sale.cashierName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-bold">{formatMoney(sale.total)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${payBadge(sale.paymentMethod)}`}>{payLabel(sale.paymentMethod)}</span>
                  </div>
                </div>
                <div className="space-y-0.5 border-t border-gray-800 pt-2">
                  {sale.items?.map((item, idx) => (
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

      {/* ===== PAYMENTS ===== */}
      {activeTab === "payments" && (
        <div className="p-4 max-w-4xl mx-auto">
          <h2 className="text-lg font-bold mb-4">💳 To'lovlar ro'yxati</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Naqd", value: payments.filter(s => s.paymentMethod === "cash").reduce((a, s) => a + s.total, 0), color: "text-green-400", border: "border-green-800 bg-green-900/20" },
              { label: "Karta", value: payments.filter(s => s.paymentMethod === "card").reduce((a, s) => a + s.total, 0), color: "text-blue-400", border: "border-blue-800 bg-blue-900/20" },
              { label: "O'tkazma", value: payments.filter(s => s.paymentMethod === "transfer").reduce((a, s) => a + s.total, 0), color: "text-purple-400", border: "border-purple-800 bg-purple-900/20" },
            ].map((card) => (
              <div key={card.label} className={`border rounded-xl p-3 ${card.border}`}>
                <p className="text-xs text-gray-400">{card.label}</p>
                <p className={`text-sm font-bold mt-1 ${card.color}`}>{formatMoney(card.value)}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {payments.map((sale) => (
              <div key={sale.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-gray-500">#{sale.id.slice(-8)}</p>
                  <p className="text-xs text-gray-500">{formatDate(sale.createdAt)}</p>
                  <p className="text-xs text-gray-400">{sale.items?.length} ta mahsulot</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatMoney(sale.total)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${payBadge(sale.paymentMethod)}`}>{payLabel(sale.paymentMethod)}</span>
                  {sale.paymentMethod === "cash" && sale.change !== undefined && (
                    <p className="text-xs text-gray-500 mt-0.5">Qaytim: {formatMoney(sale.change)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== REPORT ===== */}
      {activeTab === "report" && (
        <div className="p-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">📊 Kunlik hisobot</h2>
            <button onClick={fetchDailyReport} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-400">🔄 Yangilash</button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            {[
              { label: "Jami daromad", value: formatMoney(report.totalRevenue), icon: "💰", color: "text-emerald-400" },
              { label: "Sotuvlar soni", value: report.salesCount + " ta", icon: "🧾", color: "text-blue-400" },
              { label: "Sotilgan dona", value: report.itemsSold + " dona", icon: "📦", color: "text-purple-400" },
              { label: "Naqd", value: formatMoney(report.cashRevenue), icon: "💵", color: "text-green-400" },
              { label: "Karta", value: formatMoney(report.cardRevenue), icon: "💳", color: "text-cyan-400" },
              { label: "O'tkazma", value: formatMoney(report.transferRevenue), icon: "📱", color: "text-yellow-400" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>{kpi.icon}</span>
                  <p className="text-xs text-gray-400">{kpi.label}</p>
                </div>
                <p className={`text-base font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {report.totalRevenue > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium mb-3">To'lov usullari taqsimoti</p>
              <div className="h-4 rounded-full overflow-hidden flex gap-0.5">
                {report.cashRevenue > 0 && <div className="bg-green-500 h-full" style={{ width: `${(report.cashRevenue / report.totalRevenue) * 100}%` }} />}
                {report.cardRevenue > 0 && <div className="bg-blue-500 h-full" style={{ width: `${(report.cardRevenue / report.totalRevenue) * 100}%` }} />}
                {report.transferRevenue > 0 && <div className="bg-purple-500 h-full" style={{ width: `${(report.transferRevenue / report.totalRevenue) * 100}%` }} />}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full inline-block" />Naqd</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full inline-block" />Karta</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-500 rounded-full inline-block" />O'tkazma</span>
              </div>
            </div>
          )}

          {report.topProducts.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-sm font-medium mb-3">🏆 Eng ko'p sotilgan mahsulotlar</p>
              <div className="space-y-3">
                {report.topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-4">{idx + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white font-medium">{p.name}</span>
                        <span className="text-gray-400">{p.qty} dona</span>
                      </div>
                      <div className="h-1.5 bg-gray-700 rounded-full">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(p.revenue / report.topProducts[0].revenue) * 100}%` }} />
                      </div>
                      <p className="text-xs text-emerald-400 mt-0.5">{formatMoney(p.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.salesCount === 0 && <div className="text-center text-gray-500 py-20">Bugun sotuvlar yo'q</div>}
        </div>
      )}

      {/* ===== CUSTOM PRICE MODAL ===== */}
      {customPriceItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <h3 className="font-bold mb-1">Narxni o'zgartirish</h3>
            <p className="text-xs text-gray-400 mb-1">{customPriceItem.name}</p>
            <p className="text-xs text-gray-500 mb-3">Asl narx: {formatMoney(customPriceItem.price)}</p>
            <input type="number" value={tempPrice} onChange={(e) => setTempPrice(e.target.value)} autoFocus
              onKeyDown={(e) => e.key === "Enter" && applyCustomPrice()}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-emerald-500 mb-4"
              placeholder="Yangi narx (so'm)" />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setCustomPriceItem(null); setTempPrice(""); }} className="py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm">Bekor</button>
              <button onClick={applyCustomPrice} className="py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold">Saqlash</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== RECEIPT MODAL ===== */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-gray-900 rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <div className="text-center mb-3">
              <div className="text-4xl mb-1">🧾</div>
              <h3 className="font-bold">Chek</h3>
              <p className="text-xs text-gray-400 font-mono">#{lastSale.id?.slice(-8)}</p>
              <p className="text-xs text-gray-400">{lastSale.cashierName}</p>
            </div>
            <div className="border-t border-dashed border-gray-300 py-3 space-y-1">
              {lastSale.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.name} × {item.quantity}</span>
                  <span className="font-medium">{formatMoney(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-gray-300 pt-3 space-y-1">
              <div className="flex justify-between font-bold text-base">
                <span>Jami:</span><span>{formatMoney(lastSale.total)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>To'lov:</span><span>{payLabel(lastSale.paymentMethod)}</span>
              </div>
              {lastSale.paymentMethod === "cash" && (
                <>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Berildi:</span><span>{formatMoney((lastSale as any).cashGiven)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span>Qaytim:</span><span>{formatMoney((lastSale as any).change)}</span>
                  </div>
                </>
              )}
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">Xarid uchun rahmat! 🙏</p>
            <button onClick={() => setShowReceipt(false)} className="w-full mt-4 py-2.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 text-sm">Yopish</button>
          </div>
        </div>
      )}
    </div>
  );
}
