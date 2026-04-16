"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  collection, getDocs, query, where, addDoc, 
  doc, runTransaction, serverTimestamp, increment 
} from "firebase/firestore";
import { db } from "@/lib/firebase"; // Firebase ulanish faylingiz

// ─── Tiplar ──────────────────────────────────────────────
export interface Warehouse { id: string; name: string; }
export interface Product { 
  id: string; name: string; price: number; stock: number; 
  category: string; barcode?: string; sku?: string; 
}
export interface CartItem { product: Product; quantity: number; }

// ─── Yordamchi Funksiyalar ────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n));

export default function POSPage() {
  // States
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selling, setSelling] = useState(false);
  const [paymentType, setPaymentType] = useState<"cash" | "card">("cash");

  // 1. Skladlarni yuklash
  useEffect(() => {
    const fetchWarehouses = async () => {
      const snap = await getDocs(collection(db, "warehouses"));
      setWarehouses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse)));
    };
    fetchWarehouses();
  }, []);

  // 2. Mahsulotlarni yuklash (Sklad tanlanganda)
  const loadProducts = useCallback(async (wId: string) => {
    if (!wId) return;
    const q = query(collection(db, "products"), where("warehouseId", "==", wId));
    const snap = await getDocs(q);
    setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
  }, []);

  useEffect(() => {
    loadProducts(warehouseId);
    setCart([]); // Sklad almashsa savatni tozalash
  }, [warehouseId, loadProducts]);

  // 3. Savat mantiqi
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return alert("Omborda qolmagan!");
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) {
        if (ex.quantity >= product.stock) return prev;
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const total = useMemo(() => cart.reduce((s, i) => s + i.product.price * i.quantity, 0), [cart]);

  // 4. Sotuv va Ombor qoldig'ini yangilash (FIREBASE TRANSACTION)
  const handleCheckout = async () => {
    if (!warehouseId || cart.length === 0 || selling) return;
    setSelling(true);

    try {
      await runTransaction(db, async (transaction) => {
        // Har bir mahsulotni tekshirish va ayirish
        for (const item of cart) {
          const pRef = doc(db, "products", item.product.id);
          const pSnap = await transaction.get(pRef);
          
          if (!pSnap.exists() || pSnap.data().stock < item.quantity) {
            throw new Error(`${item.product.name} yetarli emas!`);
          }
          
          transaction.update(pRef, { stock: increment(-item.quantity) });
        }

        // Sotuv tarixiga yozish
        await addDoc(collection(db, "sales"), {
          warehouseId,
          items: cart.map(i => ({ id: i.product.id, name: i.product.name, qty: i.quantity })),
          total,
          paymentType,
          createdAt: serverTimestamp()
        });
      });

      alert("Sotuv muvaffaqiyatli!");
      setCart([]);
      loadProducts(warehouseId); // Qoldiqlarni qayta yuklash
    } catch (e: any) {
      alert("Xato: " + e.message);
    } finally {
      setSelling(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#f0f2f5", fontFamily: "sans-serif" }}>
      {/* Chap taraf: Mahsulotlar */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}>
            <option value="">Sklad tanlang</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <input 
            placeholder="Qidirish..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 15 }}>
          {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
            <div key={p.id} onClick={() => addToCart(p)} style={{ background: "#fff", padding: 15, borderRadius: 12, cursor: "pointer", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", opacity: p.stock <= 0 ? 0.5 : 1 }}>
              <div style={{ fontWeight: "bold", fontSize: 14 }}>{p.name}</div>
              <div style={{ color: "#2ecc71", margin: "5px 0" }}>{fmt(p.price)} so'm</div>
              <div style={{ fontSize: 12, color: "#888" }}>Zaxira: {p.stock} ta</div>
            </div>
          ))}
        </div>
      </div>

      {/* O'ng taraf: Savat va To'lov */}
      <div style={{ width: 350, background: "#fff", borderLeft: "1px solid #ddd", padding: 20, display: "flex", flexDirection: "column" }}>
        <h3 style={{ marginTop: 0 }}>Savat</h3>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {cart.map(item => (
            <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eee", fontSize: 14 }}>
              <span>{item.product.name} (x{item.quantity})</span>
              <span>{fmt(item.product.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "2px solid #eee", paddingTop: 15 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 18, marginBottom: 15 }}>
            <span>Jami:</span>
            <span>{fmt(total)} so'm</span>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
            <button onClick={() => setPaymentType("cash")} style={{ flex: 1, padding: 10, background: paymentType === "cash" ? "#3498db" : "#eee", color: paymentType === "cash" ? "#fff" : "#000", border: "none", borderRadius: 8 }}>Naqd</button>
            <button onClick={() => setPaymentType("card")} style={{ flex: 1, padding: 10, background: paymentType === "card" ? "#3498db" : "#eee", color: paymentType === "card" ? "#fff" : "#000", border: "none", borderRadius: 8 }}>Karta</button>
          </div>

          <button 
            disabled={selling || cart.length === 0}
            onClick={handleCheckout}
            style={{ width: "100%", padding: 15, background: "#27ae60", color: "#fff", border: "none", borderRadius: 10, fontWeight: "bold", cursor: "pointer" }}
          >
            {selling ? "Yuklanmoqda..." : "Sotishni yakunlash"}
          </button>
        </div>
      </div>
    </div>
  );
}
