"use client";

import {
  useState, useEffect, useCallback, useMemo, useRef,
} from "react";

// ─── Types ────────────────────────────────────────────────
export interface Warehouse { id: string; name: string; location?: string; }
export interface Product { 
  id: string; name: string; price: number; stock: number; 
  category: string; barcode?: string; image?: string; sku?: string; 
}
export interface Customer { id: string; name: string; phone?: string; }
export type PaymentType = "cash" | "card" | "split";
export type DiscountType = "percent" | "fixed";
export interface CartItem { product: Product; quantity: number; }

export interface SalePayload {
  warehouse_id: string;
  customer_id?: string;
  items: { product_id: string; quantity: number; price: number }[];
  payment_type: PaymentType;
  cash_amount?: number;
  card_amount?: number;
  total: number;
  discount: number;
  discount_type: DiscountType;
}

// ─── API Service ──────────────────────────────────────────
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";
async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...opts?.headers },
    ...opts,
  });
  if (!res.ok) throw new Error("Server xatosi");
  return res.json();
}

const api = {
  warehouses: () => apiFetch<Warehouse[]>("/warehouses"),
  products: (wid: string) => apiFetch<Product[]>(`/products?warehouse_id=${wid}`),
  customers: () => apiFetch<Customer[]>("/customers"),
  createCustomer: (data: { name: string; phone?: string }) =>
    apiFetch<Customer>("/customers", { method: "POST", body: JSON.stringify(data) }),
  sale: (payload: SalePayload) =>
    apiFetch<{ id: string }>("/sales", { method: "POST", body: JSON.stringify(payload) }),
};

// ─── Main Component ───────────────────────────────────────
export default function POSPage() {
  // States
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [paymentType, setPaymentType] = useState<PaymentType>("cash");
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [discountVal, setDiscountVal] = useState(0);
  const [discountType, setDiscountType] = useState<DiscountType>("fixed");
  const [selling, setSelling] = useState(false);

  // Initial Data
  useEffect(() => {
    api.warehouses().then(setWarehouses);
    api.customers().then(setCustomers);
  }, []);

  useEffect(() => {
    if (warehouseId) api.products(warehouseId).then(setProducts);
  }, [warehouseId]);

  // ─── Logic: Cart & Pricing ──────────────────────────────
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.product.price * i.quantity, 0), [cart]);
  const discountAmount = useMemo(() => {
    return discountType === "percent" ? Math.round(subtotal * discountVal / 100) : Math.min(discountVal, subtotal);
  }, [subtotal, discountVal, discountType]);
  const total = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  // ─── Barcode & Shortcuts ────────────────────────────────
  useEffect(() => {
    let buffer = "";
    let lastTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Global Shortcut: Ctrl + F (Search)
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        document.getElementById("pos-search")?.focus();
      }

      // Barcode Scanner Logic
      if (Date.now() - lastTime > 100) buffer = "";
      if (e.key === "Enter" && buffer.length > 2) {
        const p = products.find(prod => prod.barcode === buffer || prod.sku === buffer);
        if (p) { addToCart(p); buffer = ""; }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
      lastTime = Date.now();
    };

    window.addEventListener("keydown", handleKeyDown as any);
    return () => window.removeEventListener("keydown", handleKeyDown as any);
  }, [products, addToCart]);

  // ─── Payment Handling ───────────────────────────────────
  const finalizeSale = async () => {
    if (!warehouseId || cart.length === 0 || selling) return;
    setSelling(true);
    try {
      const payload: SalePayload = {
        warehouse_id: warehouseId,
        customer_id: customerId || undefined,
        items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, price: i.product.price })),
        payment_type: paymentType,
        cash_amount: paymentType !== "card" ? cashAmount : 0,
        card_amount: paymentType !== "cash" ? cardAmount : 0,
        total, discount: discountAmount, discount_type: discountType,
      };
      await api.sale(payload);
      alert("Sotuv muvaffaqiyatli!");
      setCart([]); setDiscountVal(0); setCashAmount(0); setCardAmount(0);
      api.products(warehouseId).then(setProducts); // Refresh stock
    } catch (e) {
      alert("Xatolik yuz berdi");
    } finally {
      setSelling(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f4f7f6", fontFamily: "sans-serif" }}>
      {/* Chap tomondagi mahsulotlar paneli */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} style={{ padding: 10, borderRadius: 8 }}>
            <option value="">Omborni tanlang</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <input 
            id="pos-search" 
            placeholder="Qidirish (Ctrl+F)" 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 15 }}>
          {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
            <div key={p.id} onClick={() => addToCart(p)} style={{ background: "#fff", padding: 15, borderRadius: 12, cursor: "pointer", border: "1px solid #eee", textAlign: "center", opacity: p.stock <= 0 ? 0.5 : 1 }}>
              <div style={{ fontWeight: "bold", marginBottom: 5 }}>{p.name}</div>
              <div style={{ color: "#27ae60", fontWeight: "bold" }}>{p.price.toLocaleString()} so'm</div>
              <div style={{ fontSize: 12, color: "#999" }}>Qoldiq: {p.stock} ta</div>
            </div>
          ))}
        </div>
      </div>

      {/* O'ng tomondagi savatcha va to'lov paneli */}
      <div style={{ width: 400, background: "#fff", borderLeft: "1px solid #ddd", display: "flex", flexDirection: "column", padding: 20 }}>
        <h2 style={{ fontSize: 18, marginBottom: 20 }}>Savat</h2>
        <div style={{ flex: 1, overflowY: "auto", marginBottom: 20 }}>
          {cart.map(item => (
            <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f9f9f9" }}>
              <span>{item.product.name} (x{item.quantity})</span>
              <span>{(item.product.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#f9f9f9", padding: 15, borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span>Jami:</span>
            <span style={{ fontWeight: "bold", fontSize: 20 }}>{total.toLocaleString()} so'm</span>
          </div>

          <div style={{ marginBottom: 15 }}>
            <label style={{ fontSize: 12 }}>To'lov turi:</label>
            <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
              {(["cash", "card", "split"] as const).map(type => (
                <button key={type} onClick={() => setPaymentType(type)} style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ddd", background: paymentType === type ? "#3498db" : "#fff", color: paymentType === type ? "#fff" : "#333" }}>
                  {type === "cash" ? "Naqd" : type === "card" ? "Karta" : "Aralash"}
                </button>
              ))}
            </div>
          </div>

          {paymentType !== "card" && (
            <input type="number" placeholder="Naqd summa" value={cashAmount || ""} onChange={e => setCashAmount(Number(e.target.value))} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", marginBottom: 10 }} />
          )}
          {paymentType !== "cash" && (
            <input type="number" placeholder="Karta summa" value={cardAmount || ""} onChange={e => setCardAmount(Number(e.target.value))} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", marginBottom: 10 }} />
          )}

          <button 
            disabled={selling || cart.length === 0}
            onClick={finalizeSale}
            style={{ width: "100%", padding: 15, background: "#2ecc71", color: "#fff", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}
          >
            {selling ? "Yuborilmoqda..." : "Sotishni yakunlash"}
          </button>
        </div>
      </div>
    </div>
  );
}
