"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
// Firebase importlari
import { db } from "@/lib/firebaseConfig"; // O'zingizning yo'lingizni tekshiring
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  increment, 
  query, 
  where, 
  serverTimestamp 
} from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────
export interface Warehouse { id: string; name: string; location?: string; }
export interface Product   { id: string; name: string; price: number; stock: number; category: string; barcode?: string; image?: string; warehouseId: string; }
export interface Customer  { id: string; name: string; phone?: string; }
export type PaymentType   = "cash" | "card" | "split";
export interface CartItem  { product: Product; quantity: number; }

// ─── Utils ────────────────────────────────────────────────
const fmt = (num: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(num));

export default function POSPage() {
  const [activeTab, setActiveTab] = useState<"pos" | "report">("pos");
  
  // Data States
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection States
  const [warehouseId, setWarehouseId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  // Cart States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountVal, setDiscountVal] = useState(0);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("fixed");
  const [paymentType, setPaymentType] = useState<PaymentType>("cash");
  const [cashIn, setCashIn] = useState(0);
  const [receipt, setReceipt] = useState<any>(null);
  const [selling, setSelling] = useState(false);

  // ─── 1. Ma'lumotlarni Firebase'dan yuklash ───
  useEffect(() => {
    async function loadInitialData() {
      try {
        const wSnap = await getDocs(collection(db, "warehouses"));
        setWarehouses(wSnap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse)));

        const cSnap = await getDocs(collection(db, "customers"));
        setCustomers(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
      } catch (err) {
        console.error("Yuklashda xato:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Sklad o'zgarganda mahsulotlarni filtrlab olish
  useEffect(() => {
    if (!warehouseId) { setProducts([]); return; }
    async function loadProducts() {
      const q = query(collection(db, "products"), where("warehouseId", "==", warehouseId));
      const pSnap = await getDocs(q);
      setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }
    loadProducts();
    setCart([]);
  }, [warehouseId]);

  // ─── 2. Savat Funksiyalari ───
  const addToCart = (p: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      if (ex) {
        if (ex.quantity >= p.stock) return prev;
        return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product: p, quantity: 1 }];
    });
  };

  const removeFromCart = (pid: string) => setCart(c => c.filter(i => i.product.id !== pid));
  
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.product.price * i.quantity, 0), [cart]);
  const discountAmount = useMemo(() => discountType === "percent" ? (subtotal * discountVal) / 100 : discountVal, [subtotal, discountVal, discountType]);
  const total = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);

  // ─── 3. SOTISH (FIREBASE UPDATE) ───
  const handleCheckout = async () => {
    if (!warehouseId || cart.length === 0 || selling) return;
    setSelling(true);

    try {
      // a) Tranzaksiyani saqlash
      const docRef = await addDoc(collection(db, "transactions"), {
        warehouseId,
        customerId: customerId || "walking-customer",
        items: cart.map(i => ({ id: i.product.id, name: i.product.name, qty: i.quantity, price: i.product.price })),
        subtotal,
        discount: discountAmount,
        total,
        paymentType,
        createdAt: serverTimestamp()
      });

      // b) STOCKNI KAMAYTIRISH (Har bir mahsulot uchun)
      for (const item of cart) {
        const pRef = doc(db, "products", item.product.id);
        await updateDoc(pRef, {
          stock: increment(-item.quantity)
        });
      }

      setReceipt({ id: docRef.id, total, items: cart }); // Chekni ko'rsatish
      setCart([]);
      setDiscountVal(0);
      
      // Ro'yxatni yangilash
      const q = query(collection(db, "products"), where("warehouseId", "==", warehouseId));
      const pSnap = await getDocs(q);
      setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));

    } catch (err) {
      alert("Xatolik yuz berdi: " + err);
    } finally {
      setSelling(false);
    }
  };

  if (loading) return <div style={{ padding: 50 }}>Yuklanmoqda...</div>;

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#f0f2f5", fontFamily: "sans-serif" }}>
      
      {/* CHAP PANEL: Mahsulotlar */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid #ddd" }}>
        <div style={{ padding: 15, backgroundColor: "#fff", display: "flex", gap: 10 }}>
          <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} style={{ padding: 8 }}>
            <option value="">Sklad tanlang</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <input 
            placeholder="Mahsulot qidirish..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: 8, borderRadius: 5, border: "1px solid #ccc" }}
          />
        </div>

        <div style={{ flex: 1, padding: 15, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 15 }}>
          {products
            .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
            .map(p => (
              <div key={p.id} onClick={() => addToCart(p)} style={{ 
                backgroundColor: "#fff", padding: 10, borderRadius: 8, cursor: "pointer", 
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)", opacity: p.stock <= 0 ? 0.5 : 1 
              }}>
                <div style={{ fontWeight: "bold" }}>{p.name}</div>
                <div style={{ color: "#28a745", fontWeight: "bold" }}>{fmt(p.price)}</div>
                <div style={{ fontSize: 12, color: "#777" }}>Qoldiq: {p.stock}</div>
              </div>
          ))}
        </div>
      </div>

      {/* O'NG PANEL: Savat va To'lov */}
      <div style={{ width: 380, backgroundColor: "#fff", display: "flex", flexDirection: "column", padding: 20 }}>
        <h3>Savat</h3>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {cart.map(item => (
            <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, borderBottom: "1px solid #eee", pb: 5 }}>
              <div>
                <div>{item.product.name}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{fmt(item.product.price)} x {item.quantity}</div>
              </div>
              <button onClick={() => removeFromCart(item.product.id)} style={{ border: "none", color: "red", background: "none", cursor: "pointer" }}>✕</button>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "2px solid #f0f0f0", paddingTop: 15 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span>Jami:</span> <span>{fmt(subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, color: "red" }}>
            <span>Chegirma:</span> <span>-{fmt(discountAmount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, fontWeight: "bold", marginTop: 10 }}>
            <span>To'lov:</span> <span>{fmt(total)}</span>
          </div>

          <button 
            disabled={selling || cart.length === 0}
            onClick={handleCheckout}
            style={{ 
              width: "100%", marginTop: 20, padding: 15, borderRadius: 8, border: "none",
              backgroundColor: selling ? "#ccc" : "#007bff", color: "#fff", fontSize: 18, cursor: "pointer" 
            }}
          >
            {selling ? "Bajarilmoqda..." : "Sotish (Checkout)"}
          </button>
        </div>
      </div>

      {/* Chek Modali (Sizning kodingizdagi kabi bo'lishi mumkin) */}
      {receipt && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#fff", padding: 30, borderRadius: 10, width: 300 }}>
            <h2 style={{ textAlign: "center" }}>CHEK #{receipt.id.slice(0,6)}</h2>
            <hr/>
            {receipt.items.map((i: any) => (
              <div key={i.product.id} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{i.product.name} x{i.quantity}</span>
                <span>{fmt(i.product.price * i.quantity)}</span>
              </div>
            ))}
            <hr/>
            <div style={{ fontSize: 20, fontWeight: "bold", textAlign: "right" }}>Jami: {fmt(receipt.total)}</div>
            <button onClick={() => setReceipt(null)} style={{ width: "100%", marginTop: 20, padding: 10 }}>Yopish</button>
          </div>
        </div>
      )}
    </div>
  );
}
