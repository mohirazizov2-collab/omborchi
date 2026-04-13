"use client";

/**
 * POS (Point of Sale) Module
 * ─────────────────────────────────────────────────────────
 * Features:
 *  - Warehouse selection (mandatory)
 *  - Product grid with real-time search + category filter
 *  - Barcode search support
 *  - Cart with qty controls
 *  - Customer select + quick-add modal
 *  - Payment: Cash / Card / Split
 *  - Discount (% or fixed)
 *  - Offline cart persistence (localStorage)
 *  - Receipt print
 *  - Keyboard shortcuts: Ctrl+F → search, Enter → checkout
 *  - Loading skeletons, toasts, error handling
 *  - Dark mode compatible
 */

import {
  useState, useEffect, useCallback, useMemo, useRef,
  KeyboardEvent,
} from "react";

// ─── Types ────────────────────────────────────────────────
export interface Warehouse {
  id: string;
  name: string;
  location?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  barcode?: string;
  image?: string;
  sku?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
}

export type PaymentType = "cash" | "card" | "split";
export type DiscountType = "percent" | "fixed";

export interface CartItem {
  product: Product;
  quantity: number;
}

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

// ─── API service ──────────────────────────────────────────
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...opts?.headers },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? "Server xatosi");
  }
  return res.json();
}

const api = {
  warehouses: ()               => apiFetch<Warehouse[]>("/warehouses"),
  products:   (wid: string)   => apiFetch<Product[]>(`/products?warehouse_id=${wid}`),
  customers:  ()               => apiFetch<Customer[]>("/customers"),
  createCustomer: (data: { name: string; phone?: string }) =>
    apiFetch<Customer>("/customers", { method: "POST", body: JSON.stringify(data) }),
  sale: (payload: SalePayload) =>
    apiFetch<{ id: string; receipt_url?: string }>("/sales", {
      method: "POST", body: JSON.stringify(payload),
    }),
};

// ─── Hooks ────────────────────────────────────────────────
function useDebounce<T>(value: T, delay = 300): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

function useAsyncData<T>(fetcher: (() => Promise<T>) | null) {
  const [data, setData]     = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!fetcher) return;
    setLoading(true); setError(null);
    try { setData(await fetcher()); }
    catch (e: any) { setError(e.message ?? "Xatolik"); }
    finally { setLoading(false); }
  }, [fetcher]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

// localStorage offline cart
const CART_KEY = "pos_cart_v2";
function loadCartFromLS(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]"); }
  catch { return []; }
}
function saveCartToLS(cart: CartItem[]) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  catch {}
}

// ─── Toast ────────────────────────────────────────────────
interface ToastMsg { id: number; type: "success" | "error" | "warn"; text: string; }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  let counter = useRef(0);
  const add = useCallback((type: ToastMsg["type"], text: string) => {
    const id = ++counter.current;
    setToasts(p => [...p, { id, type, text }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, success: (t: string) => add("success", t), error: (t: string) => add("error", t), warn: (t: string) => add("warn", t) };
}

// ─── Number utils ─────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n));

// ═════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═════════════════════════════════════════════════════════

// Skeleton card
function SkeletonCard() {
  return (
    <div style={{
      background: "var(--color-background-secondary)",
      borderRadius: "var(--border-radius-lg)",
      border: "0.5px solid var(--color-border-tertiary)",
      padding: 12, animation: "pulse 1.4s ease-in-out infinite",
    }}>
      <div style={{ height: 72, borderRadius: 8, background: "var(--color-border-tertiary)", marginBottom: 8 }} />
      <div style={{ height: 12, borderRadius: 6, background: "var(--color-border-tertiary)", marginBottom: 6, width: "80%" }} />
      <div style={{ height: 12, borderRadius: 6, background: "var(--color-border-tertiary)", width: "50%" }} />
    </div>
  );
}

// Toast container
function ToastStack({ toasts }: { toasts: ToastMsg[] }) {
  const colorMap = {
    success: { bg: "var(--color-background-success)", color: "var(--color-text-success)", border: "var(--color-border-success)" },
    error:   { bg: "var(--color-background-danger)",  color: "var(--color-text-danger)",  border: "var(--color-border-danger)"  },
    warn:    { bg: "var(--color-background-warning)", color: "var(--color-text-warning)", border: "var(--color-border-warning)" },
  };
  return (
    <div style={{ position: "absolute", top: 12, right: 12, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map(t => {
        const c = colorMap[t.type];
        return (
          <div key={t.id} style={{
            padding: "10px 16px", borderRadius: "var(--border-radius-md)",
            background: c.bg, color: c.color,
            border: `0.5px solid ${c.border}`,
            fontSize: 13, fontWeight: 500, minWidth: 220, maxWidth: 320,
          }}>{t.text}</div>
        );
      })}
    </div>
  );
}

// Product card
function ProductCard({ product, inCart, onClick }: { product: Product; inCart: number; onClick: () => void }) {
  const outOfStock = product.stock <= 0;
  const lowStock   = product.stock > 0 && product.stock <= 5;
  return (
    <button
      onClick={onClick}
      disabled={outOfStock}
      style={{
        position: "relative",
        background: inCart > 0 ? "var(--color-background-info)" : "var(--color-background-primary)",
        border: `${inCart > 0 ? "1.5px" : "0.5px"} solid ${inCart > 0 ? "var(--color-border-info)" : "var(--color-border-tertiary)"}`,
        borderRadius: "var(--border-radius-lg)",
        padding: 0, overflow: "hidden",
        cursor: outOfStock ? "not-allowed" : "pointer",
        opacity: outOfStock ? 0.45 : 1,
        textAlign: "left", display: "flex", flexDirection: "column",
        transition: "border-color 0.15s, background 0.15s, transform 0.1s",
      }}
      onMouseEnter={e => { if (!outOfStock) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ""; }}
    >
      {inCart > 0 && (
        <div style={{
          position: "absolute", top: 0, right: 0,
          background: "#185FA5", color: "#E6F1FB",
          fontSize: 11, fontWeight: 700,
          padding: "2px 7px", borderRadius: "0 12px 0 8px",
        }}>{inCart}</div>
      )}
      <div style={{
        height: 72, background: "var(--color-background-secondary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, fontWeight: 700, color: "var(--color-text-tertiary)",
        overflow: "hidden",
      }}>
        {product.image
          ? <img src={product.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : product.name[0]?.toUpperCase()
        }
      </div>
      <div style={{ padding: "8px 10px 10px" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.3, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {product.name}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: inCart > 0 ? "#185FA5" : "#3B6D11" }}>
          {fmt(product.price)} so'm
        </div>
        <div style={{ fontSize: 11, marginTop: 2, color: outOfStock ? "var(--color-text-danger)" : lowStock ? "var(--color-text-warning)" : "var(--color-text-tertiary)" }}>
          {outOfStock ? "Tugagan" : lowStock ? `! ${product.stock} ta` : `${product.stock} ta`}
        </div>
      </div>
    </button>
  );
}

// Cart row
function CartRow({ item, onQty, onRemove, maxQty }: {
  item: CartItem; onQty: (delta: number) => void; onRemove: () => void; maxQty: number;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.product.name}
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 1 }}>
          {fmt(item.product.price)} × {item.quantity}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={() => onQty(-1)} style={{ width: 24, height: 24, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", fontSize: 16, color: "var(--color-text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
        <span style={{ width: 24, textAlign: "center", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{item.quantity}</span>
        <button onClick={() => onQty(+1)} disabled={item.quantity >= maxQty} style={{ width: 24, height: 24, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: item.quantity >= maxQty ? "not-allowed" : "pointer", opacity: item.quantity >= maxQty ? 0.35 : 1, fontSize: 16, color: "var(--color-text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", minWidth: 64, textAlign: "right" }}>
        {fmt(item.product.price * item.quantity)}
      </div>
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 16, padding: "0 2px", lineHeight: 1 }}>×</button>
    </div>
  );
}

// Customer modal
function NewCustomerModal({ onSave, onClose }: { onSave: (c: Customer) => void; onClose: () => void }) {
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr]     = useState("");

  const save = async () => {
    if (!name.trim()) { setErr("Ism kiritilishi shart"); return; }
    setSaving(true); setErr("");
    try {
      const c = await api.createCustomer({ name: name.trim(), phone: phone.trim() || undefined });
      onSave(c);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: 24, minWidth: 300, maxWidth: 360, width: "90%" }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: "var(--color-text-primary)" }}>Yangi mijoz</div>
        {err && <div style={{ color: "var(--color-text-danger)", fontSize: 12, marginBottom: 8 }}>{err}</div>}
        <input
          placeholder="Ism *" value={name} onChange={e => setName(e.target.value)}
          style={{ width: "100%", marginBottom: 10, boxSizing: "border-box" }}
        />
        <input
          placeholder="Telefon" value={phone} onChange={e => setPhone(e.target.value)}
          style={{ width: "100%", marginBottom: 16, boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 16px" }}>Bekor</button>
          <button onClick={save} disabled={saving} style={{ padding: "7px 16px", background: "var(--color-background-info)", color: "var(--color-text-info)", border: "0.5px solid var(--color-border-info)", borderRadius: "var(--border-radius-md)", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Receipt printer
function printReceipt(sale: SalePayload & { id: string; items_detail: CartItem[]; warehouseName: string; customerName?: string }) {
  const w = window.open("", "_blank");
  if (!w) return;
  const total = fmt(sale.total);
  const rows  = sale.items_detail.map(i =>
    `<tr><td>${i.product.name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${fmt(i.product.price * i.quantity)}</td></tr>`
  ).join("");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Chek</title><style>
    *{margin:0;padding:0;box-sizing:border-box}body{font:12px monospace;padding:16px;max-width:280px}
    h2{text-align:center;font-size:14px;margin-bottom:8px}.divider{border-top:1px dashed #000;margin:6px 0}
    table{width:100%}td{padding:2px 0}.total{font-weight:700;font-size:14px}
  </style></head><body>
    <h2>DO'KON CHEKI</h2>
    <div class="divider"></div>
    <div>Sana: ${new Date().toLocaleString("uz-UZ")}</div>
    <div>Sklad: ${sale.warehouseName}</div>
    ${sale.customerName ? `<div>Mijoz: ${sale.customerName}</div>` : ""}
    <div class="divider"></div>
    <table><thead><tr><th style="text-align:left">Nomi</th><th>Soni</th><th style="text-align:right">Summa</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="divider"></div>
    ${sale.discount ? `<div>Chegirma: ${fmt(sale.discount)} so'm</div>` : ""}
    <div class="total">JAMI: ${total} so'm</div>
    <div>To'lov: ${sale.payment_type === "cash" ? "Naqd" : sale.payment_type === "card" ? "Karta" : "Aralash"}</div>
    <div class="divider"></div>
    <div style="text-align:center;margin-top:8px">Rahmat! Yana keling!</div>
  </body></html>`);
  w.document.close();
  w.print();
}

// ═════════════════════════════════════════════════════════
// MAIN POS COMPONENT
// ═════════════════════════════════════════════════════════
export default function POSPage() {
  const toast = useToast();

  // ── Warehouse ──────────────────────────────────────────
  const warehouseFetcher = useMemo(() => api.warehouses, []);
  const { data: warehouses, loading: whLoading } = useAsyncData(warehouseFetcher);
  const [warehouseId, setWarehouseId] = useState("");

  const selectedWarehouse = useMemo(
    () => warehouses?.find(w => w.id === warehouseId) ?? null,
    [warehouses, warehouseId]
  );

  // Auto-select if only one warehouse
  useEffect(() => {
    if (warehouses?.length === 1) setWarehouseId(warehouses[0].id);
  }, [warehouses]);

  // ── Products ───────────────────────────────────────────
  const productFetcher = useMemo(
    () => warehouseId ? () => api.products(warehouseId) : null,
    [warehouseId]
  );
  const { data: products, loading: prodLoading, error: prodError, reload: reloadProducts } = useAsyncData(productFetcher);

  // ── Customers ──────────────────────────────────────────
  const customerFetcher = useMemo(() => api.customers, []);
  const { data: customers, reload: reloadCustomers } = useAsyncData(customerFetcher);
  const [customerId, setCustomerId]       = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  // ── Search & filter ────────────────────────────────────
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchRaw, setSearchRaw] = useState("");
  const search     = useDebounce(searchRaw, 300);
  const [category, setCategory]   = useState("all");

  const categories = useMemo(() => {
    const cats = new Set<string>();
    (products ?? []).forEach(p => cats.add(p.category));
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = search.toLowerCase();
    return products.filter(p => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.includes(search)
      );
    });
  }, [products, search, category]);

  // ── Cart ───────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>(() => loadCartFromLS());

  useEffect(() => { saveCartToLS(cart); }, [cart]);

  // Clear cart when warehouse changes
  useEffect(() => { if (warehouseId) setCart([]); }, [warehouseId]);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      const currentQty = existing?.quantity ?? 0;
      if (currentQty >= product.stock) {
        toast.warn(`"${product.name}" — omborda yetarli emas (${product.stock} ta)`);
        return prev;
      }
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, [toast]);

  const changeQty = useCallback((productId: string, delta: number) => {
    setCart(prev =>
      prev.map(i => {
        if (i.product.id !== productId) return i;
        const nq = i.quantity + delta;
        if (nq <= 0) return null as any;
        if (nq > i.product.stock) { toast.warn("Ombor yetarli emas"); return i; }
        return { ...i, quantity: nq };
      }).filter(Boolean)
    );
  }, [toast]);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartQty = useCallback((productId: string) =>
    cart.find(i => i.product.id === productId)?.quantity ?? 0, [cart]);

  // ── Pricing ────────────────────────────────────────────
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.product.price * i.quantity, 0), [cart]);

  const [discountType, setDiscountType] = useState<DiscountType>("fixed");
  const [discountVal, setDiscountVal]   = useState(0);

  const discountAmount = useMemo(() => {
    if (!discountVal) return 0;
    if (discountType === "percent") return Math.round(subtotal * discountVal / 100);
    return Math.min(discountVal, subtotal);
  }, [subtotal, discountVal, discountType]);

  const total = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);

  // ── Payment ────────────────────────────────────────────
  const [paymentType, setPaymentType] = useState<PaymentType>("cash");
  const [cashAmount, setCashAmount]   = useState(0);
  const [cardAmount, setCardAmount]   = useState(0);

  const change = useMemo(() => {
    if (paymentType === "cash") return Math.max(0, cashAmount - total);
    return 0;
  }, [paymentType, cashAmount, total]);

  const splitValid = useMemo(() => {
    if (paymentType !== "split") return true;
    return Math.round(cashAmount + cardAmount) >= Math.round(total);
  }, [paymentType, cashAmount, cardAmount, total]);

  const paymentValid = useMemo(() => {
    if (!cart.length) return false;
    if (paymentType === "cash") return cashAmount >= total;
    if (paymentType === "card") return true;
    return splitValid;
  }, [cart, paymentType, cashAmount, total, splitValid]);

  // ── Checkout ───────────────────────────────────────────
  const [selling, setSelling]   = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

  const handleSell = useCallback(async () => {
    if (selling || !paymentValid) return;
    if (!warehouseId) { toast.error("Sklad tanlanmagan"); return; }
    if (!cart.length)  { toast.error("Savat bo'sh"); return; }

    setSelling(true);
    const payload: SalePayload = {
      warehouse_id: warehouseId,
      customer_id:  customerId || undefined,
      items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, price: i.product.price })),
      payment_type: paymentType,
      cash_amount:  paymentType !== "card"  ? cashAmount : undefined,
      card_amount:  paymentType !== "cash"  ? cardAmount : undefined,
      total,
      discount:     discountAmount,
      discount_type: discountType,
    };

    try {
      const res = await api.sale(payload);
      setLastSaleId(res.id);
      toast.success(`Sotuv amalga oshdi! #${res.id.slice(-6).toUpperCase()}`);

      // Print receipt
      const customer = customers?.find(c => c.id === customerId);
      printReceipt({
        ...payload,
        id: res.id,
        items_detail: cart,
        warehouseName: selectedWarehouse?.name ?? "",
        customerName:  customer?.name,
      });

      clearCart();
      setDiscountVal(0);
      setCashAmount(0);
      setCardAmount(0);
      setCustomerId("");
      // Refresh stock
      await reloadProducts();
    } catch (e: any) {
      toast.error(e.message ?? "Sotuv amalga oshmadi");
    } finally {
      setSelling(false);
    }
  }, [selling, paymentValid, warehouseId, cart, customerId, paymentType, cashAmount, cardAmount, total, discountAmount, discountType, customers, selectedWarehouse, clearCart, reloadProducts, toast]);

  // ── Keyboard shortcuts ─────────────────────────────────
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Enter" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "SELECT") {
        handleSell();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSell]);

  // ── Retry on error ─────────────────────────────────────
  useEffect(() => {
    if (prodError) toast.error(`Mahsulotlar yuklanmadi: ${prodError}`);
  }, [prodError]);

  // ════════════════════════════════════════════════════════
  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: "var(--color-background-tertiary)",
      fontFamily: "var(--font-sans)", position: "relative",
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        input,select { font-family: inherit; font-size: 13px; padding: 7px 10px;
          border: 0.5px solid var(--color-border-secondary); border-radius: var(--border-radius-md);
          background: var(--color-background-primary); color: var(--color-text-primary); outline: none; }
        input:focus,select:focus { box-shadow: 0 0 0 2px var(--color-border-info); }
        button { font-family: inherit; font-size: 13px; border: 0.5px solid var(--color-border-secondary);
          border-radius: var(--border-radius-md); background: var(--color-background-secondary);
          color: var(--color-text-primary); cursor: pointer; padding: 6px 12px; }
        button:hover { background: var(--color-background-secondary); opacity: 0.85; }
        button:active { transform: scale(0.98); }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: var(--color-border-secondary); border-radius: 4px; }
      `}</style>

      <ToastStack toasts={toast.toasts} />

      {/* ── LEFT: Product panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{
          background: "var(--color-background-primary)",
          borderBottom: "0.5px solid var(--color-border-tertiary)",
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          {/* Warehouse selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--color-text-secondary)" }}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            {whLoading
              ? <div style={{ width: 140, height: 32, background: "var(--color-background-secondary)", borderRadius: 6, animation: "pulse 1.4s infinite" }} />
              : <select
                  value={warehouseId}
                  onChange={e => setWarehouseId(e.target.value)}
                  style={{ minWidth: 140, borderColor: !warehouseId ? "var(--color-border-warning)" : undefined, fontWeight: warehouseId ? 500 : 400 }}
                >
                  <option value="">Sklad tanlang *</option>
                  {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
            }
          </div>

          {/* Search */}
          <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              ref={searchRef}
              value={searchRaw}
              onChange={e => setSearchRaw(e.target.value)}
              placeholder="Qidirish... (Ctrl+F)"
              disabled={!warehouseId}
              style={{ width: "100%", paddingLeft: 30, boxSizing: "border-box" }}
            />
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div style={{ display: "flex", gap: 6, overflowX: "auto", flex: 1 }}>
              {["all", ...categories].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    flexShrink: 0, fontSize: 12, padding: "5px 12px",
                    background: category === cat ? "var(--color-background-info)" : "var(--color-background-secondary)",
                    color: category === cat ? "var(--color-text-info)" : "var(--color-text-secondary)",
                    border: `0.5px solid ${category === cat ? "var(--color-border-info)" : "var(--color-border-tertiary)"}`,
                    fontWeight: category === cat ? 500 : 400,
                  }}
                >
                  {cat === "all" ? "Barchasi" : cat}
                </button>
              ))}
            </div>
          )}

          {/* Product count */}
          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", flexShrink: 0 }}>
            {filteredProducts.length} ta
          </span>
        </div>

        {/* Product grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {!warehouseId ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: 12, opacity: 0.3 }}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Sklad tanlang</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Mahsulotlar ko'rsatish uchun yuqoridan sklad tanlang</div>
            </div>
          ) : prodLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : prodError ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--color-text-danger)" }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>Mahsulotlar yuklanmadi</div>
              <button onClick={reloadProducts} style={{ fontSize: 12, padding: "6px 14px" }}>Qayta urinish</button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)" }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Mahsulot topilmadi</div>
              {search && <button onClick={() => setSearchRaw("")} style={{ fontSize: 12, marginTop: 8, color: "var(--color-text-info)", border: "none", background: "none", cursor: "pointer" }}>Tozalash</button>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
              {filteredProducts.map(p => (
                <ProductCard
                  key={p.id} product={p}
                  inCart={cartQty(p.id)}
                  onClick={() => addToCart(p)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart & checkout ── */}
      <div style={{
        width: 340, flexShrink: 0,
        background: "var(--color-background-primary)",
        borderLeft: "0.5px solid var(--color-border-tertiary)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>

        {/* Cart header */}
        <div style={{ padding: "12px 16px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--color-text-secondary)" }}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>Savat</span>
            {cart.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, background: "var(--color-background-info)", color: "var(--color-text-info)", padding: "2px 7px", borderRadius: 99, border: "0.5px solid var(--color-border-info)" }}>
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} style={{ fontSize: 11, color: "var(--color-text-danger)", border: "none", background: "none", cursor: "pointer" }}>
              Tozalash
            </button>
          )}
        </div>

        {/* Cart items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px" }}>
          {cart.length === 0 ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.2, marginBottom: 8 }}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              <div style={{ fontSize: 13 }}>Savat bo'sh</div>
            </div>
          ) : (
            cart.map(item => (
              <CartRow
                key={item.product.id} item={item}
                maxQty={item.product.stock}
                onQty={d => changeQty(item.product.id, d)}
                onRemove={() => removeFromCart(item.product.id)}
              />
            ))
          )}
        </div>

        {/* Bottom: form + checkout */}
        <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0, background: "var(--color-background-secondary)" }}>

          {/* Customer */}
          <div style={{ display: "flex", gap: 6 }}>
            <select
              value={customerId} onChange={e => setCustomerId(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Mijoz (ixtiyoriy)</option>
              {customers?.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ""}</option>)}
            </select>
            <button onClick={() => setShowNewCustomer(true)} style={{ padding: "6px 10px", fontSize: 18, lineHeight: 1 }} title="Yangi mijoz">+</button>
          </div>

          {/* Discount */}
          {cart.length > 0 && (
            <div style={{ display: "flex", gap: 6 }}>
              <select value={discountType} onChange={e => setDiscountType(e.target.value as DiscountType)} style={{ width: 80 }}>
                <option value="fixed">So'm</option>
                <option value="percent">%</option>
              </select>
              <input
                type="number" min={0} max={discountType === "percent" ? 100 : subtotal}
                placeholder={discountType === "percent" ? "Chegirma %" : "Chegirma so'm"}
                value={discountVal || ""}
                onChange={e => setDiscountVal(parseFloat(e.target.value) || 0)}
                style={{ flex: 1 }}
              />
            </div>
          )}

          {/* Totals */}
          {cart.length > 0 && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                <span>Mahsulotlar ({cart.reduce((s,i)=>s+i.quantity,0)} ta)</span>
                <span>{fmt(subtotal)} so'm</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-warning)", marginBottom: 4 }}>
                  <span>Chegirma</span><span>− {fmt(discountAmount)} so'm</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 8, marginTop: 4 }}>
                <span>Jami</span><span>{fmt(total)} so'm</span>
              </div>
            </div>
          )}

          {/* Payment type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {([
              { key: "cash",  label: "Naqd"    },
              { key: "card",  label: "Karta"   },
              { key: "split", label: "Aralash" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPaymentType(key)}
                style={{
                  fontSize: 12, padding: "8px 4px", fontWeight: paymentType === key ? 500 : 400,
                  background: paymentType === key ? "var(--color-background-info)" : "var(--color-background-primary)",
                  color: paymentType === key ? "var(--color-text-info)" : "var(--color-text-secondary)",
                  border: `${paymentType === key ? "1.5px" : "0.5px"} solid ${paymentType === key ? "var(--color-border-info)" : "var(--color-border-tertiary)"}`,
                }}
              >{label}</button>
            ))}
          </div>

          {/* Payment inputs */}
          {paymentType === "cash" && cart.length > 0 && (
            <div>
              <input
                type="number" min={0} placeholder="Qabul qilingan summa"
                value={cashAmount || ""}
                onChange={e => setCashAmount(parseFloat(e.target.value) || 0)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
              {cashAmount > 0 && cashAmount >= total && (
                <div style={{ fontSize: 12, color: "var(--color-text-success)", marginTop: 4 }}>
                  Qaytim: {fmt(change)} so'm
                </div>
              )}
            </div>
          )}

          {paymentType === "split" && cart.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                type="number" min={0} placeholder="Naqd summa"
                value={cashAmount || ""}
                onChange={e => setCashAmount(parseFloat(e.target.value) || 0)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
              <input
                type="number" min={0} placeholder="Karta summa"
                value={cardAmount || ""}
                onChange={e => setCardAmount(parseFloat(e.target.value) || 0)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
              {!splitValid && (cashAmount > 0 || cardAmount > 0) && (
                <div style={{ fontSize: 12, color: "var(--color-text-danger)" }}>
                  Yetishmaydi: {fmt(total - cashAmount - cardAmount)} so'm
                </div>
              )}
            </div>
          )}

          {/* Sell button */}
          <button
            onClick={handleSell}
            disabled={selling || !cart.length || !paymentValid || !warehouseId}
            style={{
              width: "100%", padding: "12px", fontSize: 14, fontWeight: 500,
              background: (selling || !cart.length || !paymentValid || !warehouseId)
                ? "var(--color-background-secondary)" : "var(--color-background-info)",
              color: (selling || !cart.length || !paymentValid || !warehouseId)
                ? "var(--color-text-tertiary)" : "var(--color-text-info)",
              border: `0.5px solid ${(selling || !cart.length || !paymentValid || !warehouseId) ? "var(--color-border-tertiary)" : "var(--color-border-info)"}`,
              borderRadius: "var(--border-radius-md)",
              cursor: (selling || !cart.length || !paymentValid || !warehouseId) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.15s",
            }}
          >
            {selling
              ? <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite" }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeDasharray="40" strokeDashoffset="10"/></svg>
                  Saqlanmoqda...
                </>
              : <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                  Sotish — {fmt(total)} so'm
                </>
            }
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "center" }}>
            Enter → sotish · Ctrl+F → qidirish
          </div>
        </div>
      </div>

      {/* New customer modal */}
      {showNewCustomer && (
        <NewCustomerModal
          onSave={c => {
            reloadCustomers();
            setCustomerId(c.id);
            setShowNewCustomer(false);
            toast.success(`${c.name} qo'shildi`);
          }}
          onClose={() => setShowNewCustomer(false)}
        />
      )}
    </div>
  );
}
