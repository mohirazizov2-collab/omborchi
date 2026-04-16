"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
// --- FIREBASE INTEGRATSIYASI ---
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy 
} from "firebase/firestore";
import { db } from "@/lib/firebase"; // <-- Firebase config faylingiz manzili

// ─── Types ────────────────────────────────────────────────
export interface Warehouse { id: string; name: string; location?: string; }
export interface Product { id: string; name: string; price: number; stock: number; category: string; barcode?: string; sku?: string; warehouseId?: string; }
export interface Customer { id: string; name: string; phone?: string; }
export type PaymentType = "cash" | "card" | "split";
export type DiscountType = "percent" | "fixed";
export interface CartItem { product: Product; quantity: number; }
export interface Transaction {
  id?: string;
  date: any;
  warehouseId: string;
  warehouseName: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentType: PaymentType;
  cashAmount?: number;
  cardAmount?: number;
  customerName?: string;
}

// ─── Utils ────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n));

function useDebounce<T>(value: T, delay = 300): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// ─── Toast System ─────────────────────────────────────────
interface ToastMsg { id: number; type: "success" | "error" | "warn"; text: string; }
function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const counter = useRef(0);
  const add = useCallback((type: ToastMsg["type"], text: string) => {
    const id = ++counter.current;
    setToasts(p => [...p, { id, type, text }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  return { toasts, success: (t: string) => add("success", t), error: (t: string) => add("error", t), warn: (t: string) => add("warn", t) };
}

// ─── Main Component ───────────────────────────────────────
export default function POSPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"pos" | "report">("pos");
  const [loading, setLoading] = useState(true);

  // Data States
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchRaw, setSearchRaw] = useState("");
  const search = useDebounce(searchRaw, 300);
  const [category, setCategory] = useState("all");

  // Payment States
  const [customerId, setCustomerId] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("fixed");
  const [discountVal, setDiscountVal] = useState(0);
  const [paymentType, setPaymentType] = useState<PaymentType>("cash");
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [selling, setSelling] = useState(false);

  // 1. Firebase'dan ma'lumotlarni yuklash
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Omborlar
        const whSnap = await getDocs(collection(db, "warehouses"));
        const whs = whSnap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse));
        setWarehouses(whs);
        if (whs.length > 0) setSelectedWarehouseId(whs[0].id);

        // Mahsulotlar
        const prSnap = await getDocs(collection(db, "products"));
        setAllProducts(prSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));

        // Mijozlar
        const cuSnap = await getDocs(collection(db, "customers"));
        setCustomers(cuSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));

        // Sotuvlar (Hisobot uchun)
        const slSnap = await getDocs(query(collection(db, "sales"), orderBy("date", "desc")));
        setTransactions(slSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));

      } catch (e) {
        console.error(e);
        toast.error("Ma'lumotlarni yuklashda xatolik");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filtrlangan mahsulotlar (Tanlangan omborga ko'ra)
  const products = useMemo(() => {
    return allProducts.filter(p => !p.warehouseId || p.warehouseId === selectedWarehouseId);
  }, [allProducts, selectedWarehouseId]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = category === "all" || p.category === category;
      const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
      return matchesCat && matchesSearch;
    });
  }, [products, category, search]);

  const categories = useMemo(() => ["all", ...Array.from(new Set(products.map(p => p.category)))], [products]);

  // Savat funksiyalari
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return toast.warn("Mahsulot tugagan");
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.warn("Omborda boshqa qolmagan");
          return prev;
        }
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id !== id) return i;
      const nq = i.quantity + delta;
      if (nq <= 0) return null as any;
      if (nq > i.product.stock) { toast.warn("Zaxira yetarli emas"); return i; }
      return { ...i, quantity: nq };
    }).filter(Boolean));
  };

  // Hisob-kitob
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const discountAmount = discountType === "percent" ? (subtotal * discountVal / 100) : discountVal;
  const total = Math.max(0, subtotal - discountAmount);
  const paymentValid = paymentType === "cash" ? cashAmount >= total : (paymentType === "card" ? true : (cashAmount + cardAmount >= total));

  // 2. Sotish jarayoni (Checkout)
  const handleCheckout = async () => {
    if (!paymentValid || selling || cart.length === 0) return;
    setSelling(true);
    try {
      const selectedWh = warehouses.find(w => w.id === selectedWarehouseId);
      const customer = customers.find(c => c.id === customerId);

      const newSale: Transaction = {
        date: serverTimestamp(),
        warehouseId: selectedWarehouseId,
        warehouseName: selectedWh?.name || "Noma'lum",
        items: cart,
        subtotal,
        discount: discountAmount,
        total,
        paymentType,
        cashAmount,
        cardAmount,
        customerName: customer?.name || "Aprelyat mijoz"
      };

      // Firestore'ga sotuvni yozish
      const saleRef = await addDoc(collection(db, "sales"), newSale);
      
      // Ombor qoldig'ini yangilash
      for (const item of cart) {
        const pRef = doc(db, "products", item.product.id);
        await updateDoc(pRef, { stock: item.product.stock - item.quantity });
      }

      // Lokal holatni yangilash
      setAllProducts(prev => prev.map(p => {
        const cartItem = cart.find(ci => ci.product.id === p.id);
        return cartItem ? { ...p, stock: p.stock - cartItem.quantity } : p;
      }));

      setReceipt({ ...newSale, id: saleRef.id, date: new Date() });
      setCart([]);
      setDiscountVal(0);
      setCashAmount(0);
      setCardAmount(0);
      toast.success("Sotuv muvaffaqiyatli yakunlandi");
      
    } catch (e) {
      console.error(e);
      toast.error("Xatolik yuz berdi");
    } finally {
      setSelling(false);
    }
  };

  if (loading) return <div className="loading">Yuklanmoqda...</div>;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f4f7f6", fontFamily: "sans-serif" }}>
      {/* Toast Stack */}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000 }}>
        {toast.toasts.map(t => (
          <div key={t.id} style={{ background: t.type === "success" ? "#4caf50" : "#f44336", color: "white", padding: "10px 20px", borderRadius: 8, marginBottom: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            {t.text}
          </div>
        ))}
      </div>

      {/* LEFT: Product Grid */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 15, marginBottom: 20, alignItems: "center" }}>
          <select value={selectedWarehouseId} onChange={e => setSelectedWarehouseId(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <input 
            placeholder="Qidirish..." 
            value={searchRaw} 
            onChange={e => setSearchRaw(e.target.value)} 
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20, overflowX: "auto" }}>
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setCategory(cat)}
              style={{ 
                padding: "8px 16px", borderRadius: 20, border: "none", 
                background: category === cat ? "#007bff" : "#fff",
                color: category === cat ? "#white" : "#333",
                cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
              }}
            >
              {cat === "all" ? "Hammasi" : cat}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 15, overflowY: "auto" }}>
          {filteredProducts.map(p => (
            <div 
              key={p.id} 
              onClick={() => addToCart(p)}
              style={{ 
                background: "#fff", padding: 15, borderRadius: 12, cursor: "pointer",
                border: "1px solid #eee", transition: "transform 0.2s"
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: 5 }}>{p.name}</div>
              <div style={{ color: "#007bff", fontWeight: "bold" }}>{fmt(p.price)} so'm</div>
              <div style={{ fontSize: 12, color: p.stock < 5 ? "red" : "#777" }}>Zaxira: {p.stock} ta</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div style={{ width: 400, background: "#fff", borderLeft: "1px solid #ddd", display: "flex", flexDirection: "column", padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Savat</h3>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {cart.map(item => (
            <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 15, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14 }}>{item.product.name}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{fmt(item.product.price)} so'm</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => updateQty(item.product.id, -1)} style={{ width: 25, height: 25, borderRadius: "50%", border: "1px solid #ddd" }}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQty(item.product.id, 1)} style={{ width: 25, height: 25, borderRadius: "50%", border: "1px solid #ddd" }}>+</button>
              </div>
              <div style={{ width: 80, textAlign: "right", fontWeight: "bold" }}>{fmt(item.product.price * item.quantity)}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "2px dashed #eee", paddingTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span>Jami:</span>
            <span>{fmt(subtotal)} so'm</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
            <select value={discountType} onChange={e => setDiscountType(e.target.value as any)} style={{ padding: 5 }}>
              <option value="fixed">so'm</option>
              <option value="percent">%</option>
            </select>
            <input 
              type="number" 
              placeholder="Chegirma" 
              value={discountVal || ""} 
              onChange={e => setDiscountVal(Number(e.target.value))}
              style={{ flex: 1, padding: 5 }}
            />
          </div>
          <div style={{ fontSize: 20, fontWeight: "bold", display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <span>To'lov:</span>
            <span style={{ color: "#28a745" }}>{fmt(total)} so'm</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            <button onClick={() => setPaymentType("cash")} style={{ background: paymentType === "cash" ? "#007bff" : "#f8f9fa", color: paymentType === "cash" ? "#fff" : "#333", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}>Naqd</button>
            <button onClick={() => setPaymentType("card")} style={{ background: paymentType === "card" ? "#007bff" : "#f8f9fa", color: paymentType === "card" ? "#fff" : "#333", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}>Karta</button>
            <button onClick={() => setPaymentType("split")} style={{ background: paymentType === "split" ? "#007bff" : "#f8f9fa", color: paymentType === "split" ? "#fff" : "#333", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}>Aralash</button>
          </div>

          {paymentType !== "card" && (
            <input 
              type="number" 
              placeholder="Qabul qilingan naqd pul" 
              onChange={e => setCashAmount(Number(e.target.value))}
              style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #ddd", marginBottom: 15, boxSizing: "border-box" }}
            />
          )}

          <button 
            disabled={!paymentValid || cart.length === 0 || selling}
            onClick={handleCheckout}
            style={{ 
              width: "100%", padding: 15, borderRadius: 12, border: "none", 
              background: paymentValid ? "#28a745" : "#ccc", color: "#fff",
              fontSize: 16, fontWeight: "bold", cursor: "pointer"
            }}
          >
            {selling ? "Saqlanmoqda..." : "Sotish"}
          </button>
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {receipt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
          <div style={{ background: "#fff", padding: 30, borderRadius: 16, width: 350, textAlign: "center" }}>
            <h2>Sotuv Tasdiqlandi!</h2>
            <div style={{ fontSize: 40, color: "#28a745", marginBottom: 20 }}>✅</div>
            <p>Jami: <strong>{fmt(receipt.total)} so'm</strong></p>
            <p>Sana: {receipt.date.toLocaleString()}</p>
            <button onClick={() => setReceipt(null)} style={{ marginTop: 20, padding: "10px 20px", borderRadius: 8, border: "none", background: "#007bff", color: "#fff", cursor: "pointer" }}>Yopish</button>
          </div>
        </div>
      )}
    </div>
  );
}
