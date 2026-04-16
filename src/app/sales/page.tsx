"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ─── Types ────────────────────────────────────────────────
export interface Warehouse { id: string; name: string; location?: string; }
export interface Product   { id: string; name: string; price: number; stock: number; category: string; barcode?: string; image?: string; sku?: string; }
export interface Customer  { id: string; name: string; phone?: string; }
export type PaymentType   = "cash" | "card" | "split";
export type DiscountType  = "percent" | "fixed";
export interface CartItem  { product: Product; quantity: number; }
export interface Transaction {
  id: string;
  date: Date;
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

// ─── Mock Data ────────────────────────────────────────────
const MOCK_WAREHOUSES: Warehouse[] = [
  { id: "w1", name: "Asosiy Sklad",   location: "Chilonzor" },
  { id: "w2", name: "Shimoliy Filial", location: "Yunusobod" },
  { id: "w3", name: "Janubiy Filial",  location: "Sergeli"   },
];

const MOCK_PRODUCTS: Record<string, Product[]> = {
  w1: [
    { id: "p1",  name: "iPhone 15 Pro",       price: 14500000, stock: 8,  category: "Telefonlar",   sku: "IP15P", barcode: "111" },
    { id: "p2",  name: "Samsung Galaxy S24",   price: 11200000, stock: 12, category: "Telefonlar",   sku: "SGS24", barcode: "112" },
    { id: "p3",  name: "Xiaomi 14",            price: 8900000,  stock: 5,  category: "Telefonlar",   sku: "XI14",  barcode: "113" },
    { id: "p4",  name: "AirPods Pro 2",        price: 3200000,  stock: 15, category: "Quloqliklar",  sku: "APP2",  barcode: "114" },
    { id: "p5",  name: "Samsung Buds3",        price: 1850000,  stock: 20, category: "Quloqliklar",  sku: "SB3",   barcode: "115" },
    { id: "p6",  name: "iPad Air M2",          price: 9800000,  stock: 4,  category: "Planshetlar",  sku: "IPA",   barcode: "116" },
    { id: "p7",  name: "Samsung Tab S9",       price: 8700000,  stock: 3,  category: "Planshetlar",  sku: "STS9",  barcode: "117" },
    { id: "p8",  name: "Apple Watch SE",       price: 3500000,  stock: 7,  category: "Aksessuarlar", sku: "AWSE",  barcode: "118" },
    { id: "p9",  name: "Magsafe Zaryadlovchi", price:  650000,  stock: 30, category: "Aksessuarlar", sku: "MGSF",  barcode: "119" },
    { id: "p10", name: "USB-C Kabel 2m",       price:  85000,   stock: 50, category: "Aksessuarlar", sku: "USBC",  barcode: "120" },
    { id: "p11", name: "OnePlus 12",           price: 9100000,  stock: 0,  category: "Telefonlar",   sku: "OP12",  barcode: "121" },
    { id: "p12", name: "Sony WH-1000XM5",     price: 4200000,  stock: 6,  category: "Quloqliklar",  sku: "SONY",  barcode: "122" },
  ],
  w2: [
    { id: "p1",  name: "iPhone 15 Pro",       price: 14500000, stock: 3,  category: "Telefonlar",   sku: "IP15P", barcode: "111" },
    { id: "p3",  name: "Xiaomi 14",            price: 8900000,  stock: 2,  category: "Telefonlar",   sku: "XI14",  barcode: "113" },
    { id: "p4",  name: "AirPods Pro 2",        price: 3200000,  stock: 8,  category: "Quloqliklar",  sku: "APP2",  barcode: "114" },
    { id: "p6",  name: "iPad Air M2",          price: 9800000,  stock: 1,  category: "Planshetlar",  sku: "IPA",   barcode: "116" },
    { id: "p9",  name: "Magsafe Zaryadlovchi", price:  650000,  stock: 15, category: "Aksessuarlar", sku: "MGSF",  barcode: "119" },
    { id: "p10", name: "USB-C Kabel 2m",       price:  85000,   stock: 25, category: "Aksessuarlar", sku: "USBC",  barcode: "120" },
  ],
  w3: [
    { id: "p2",  name: "Samsung Galaxy S24",  price: 11200000, stock: 6,  category: "Telefonlar",   sku: "SGS24", barcode: "112" },
    { id: "p5",  name: "Samsung Buds3",       price: 1850000,  stock: 10, category: "Quloqliklar",  sku: "SB3",   barcode: "115" },
    { id: "p7",  name: "Samsung Tab S9",      price: 8700000,  stock: 2,  category: "Planshetlar",  sku: "STS9",  barcode: "117" },
    { id: "p8",  name: "Apple Watch SE",      price: 3500000,  stock: 4,  category: "Aksessuarlar", sku: "AWSE",  barcode: "118" },
    { id: "p10", name: "USB-C Kabel 2m",      price:  85000,   stock: 40, category: "Aksessuarlar", sku: "USBC",  barcode: "120" },
    { id: "p12", name: "Sony WH-1000XM5",    price: 4200000,  stock: 3,  category: "Quloqliklar",  sku: "SONY",  barcode: "122" },
  ],
};

const MOCK_CUSTOMERS: Customer[] = [
  { id: "c1", name: "Jasur Toshmatov",  phone: "+998901234567" },
  { id: "c2", name: "Nilufar Yusupova", phone: "+998931234567" },
  { id: "c3", name: "Bobur Aliyev",     phone: "+998911234567" },
];

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n));

function useDebounce<T>(value: T, delay = 300): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

const CART_KEY = "pos_cart_v3";
function loadCartFromLS(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]"); } catch { return []; }
}
function saveCartToLS(cart: CartItem[]) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
}

// ─── iiko Integratsiya ────────────────────────────────────
interface IIikoOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

interface IIikoOrder {
  id: string;
  timestamp: string;
  warehouseId: string;
  warehouseName: string;
  items: IIikoOrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentType: string;
  customerName?: string;
}

interface IIikoResponse {
  success: boolean;
  orderId?: string;
  error?: string;
  receiptNumber?: string;
}

class IikoLikeService {
  private apiUrl: string;
  private apiKey: string;
  private isOfflineMode: boolean;

  constructor() {
    this.apiUrl = localStorage.getItem('iiko_api_url') || 'https://api.iiko.com/v1';
    this.apiKey = localStorage.getItem('iiko_api_key') || '';
    this.isOfflineMode = localStorage.getItem('iiko_mode') !== 'online';
  }

  async sendOrder(order: IIikoOrder): Promise<IIikoResponse> {
    if (this.isOfflineMode) {
      this.saveToLocalQueue(order);
      return {
        success: true,
        orderId: `local_${order.id}`,
        receiptNumber: this.generateReceiptNumber()
      };
    }

    try {
      const response = await fetch(`${this.apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(order)
      });

      if (!response.ok) throw new Error('API so\'rovi muvaffaqiyatsiz');
      return await response.json();
    } catch (error) {
      console.error('iiko xatolik:', error);
      this.saveToLocalQueue(order);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Noma\'lum xatolik'
      };
    }
  }

  private saveToLocalQueue(order: IIikoOrder) {
    const queue = this.getQueue();
    queue.push({ ...order, queuedAt: new Date().toISOString(), retryCount: 0 });
    localStorage.setItem('iiko_pending_orders', JSON.stringify(queue));
  }

  private getQueue(): any[] {
    try {
      return JSON.parse(localStorage.getItem('iiko_pending_orders') || '[]');
    } catch {
      return [];
    }
  }

  private generateReceiptNumber(): string {
    const lastNum = parseInt(localStorage.getItem('last_receipt_num') || '0');
    const newNum = lastNum + 1;
    localStorage.setItem('last_receipt_num', newNum.toString());
    return `CH-${newNum.toString().padStart(6, '0')}`;
  }
}

// ─── Toast ────────────────────────────────────────────────
interface ToastMsg { id: number; type: "success" | "error" | "warn"; text: string; }
function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const counter = useRef(0);
  const add = useCallback((type: ToastMsg["type"], text: string) => {
    const id = ++counter.current;
    setToasts(p => [...p, { id, type, text }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200);
  }, []);
  return { toasts, success: (t: string) => add("success", t), error: (t: string) => add("error", t), warn: (t: string) => add("warn", t) };
}

function ToastStack({ toasts }: { toasts: ToastMsg[] }) {
  const colorMap = {
    success: { bg: "#DCFCE7", color: "#166534", border: "#86EFAC" },
    error: { bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5" },
    warn: { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  };
  return (
    <div style={{ position: "fixed", top: 12, right: 12, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map(t => {
        const c = colorMap[t.type];
        return (
          <div key={t.id} style={{ padding: "10px 16px", borderRadius: 12, background: c.bg, color: c.color, border: `1px solid ${c.border}`, fontSize: 13, fontWeight: 500, minWidth: 220, maxWidth: 320, boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}>
            {t.text}
          </div>
        );
      })}
    </div>
  );
}

function ProductCard({ product, inCart, onClick }: { product: Product; inCart: number; onClick: () => void }) {
  const outOfStock = product.stock <= 0;
  return (
    <button
      onClick={onClick}
      disabled={outOfStock}
      style={{
        background: inCart > 0 ? "#EFF6FF" : "#FFFFFF",
        border: `1px solid ${inCart > 0 ? "#3B82F6" : "#E5E7EB"}`,
        borderRadius: 12, padding: 0, overflow: "hidden",
        cursor: outOfStock ? "not-allowed" : "pointer",
        opacity: outOfStock ? 0.4 : 1, textAlign: "left",
        transition: "all 0.15s",
      }}
    >
      {inCart > 0 && (
        <div style={{ position: "absolute", top: 0, right: 0, background: "#3B82F6", color: "white", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: "0 12px 0 8px" }}>{inCart}</div>
      )}
      <div style={{ height: 72, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#9CA3AF" }}>
        {product.name[0]?.toUpperCase()}
      </div>
      <div style={{ padding: "8px 10px 10px" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#1F2937", marginBottom: 4 }}>{product.name}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: inCart > 0 ? "#2563EB" : "#16A34A" }}>
          {fmt(product.price)} so'm
        </div>
        <div style={{ fontSize: 11, marginTop: 2, color: outOfStock ? "#DC2626" : "#6B7280" }}>
          {outOfStock ? "Tugagan" : `${product.stock} ta`}
        </div>
      </div>
    </button>
  );
}

function CartRow({ item, onQty, onRemove, maxQty }: { item: CartItem; onQty: (d: number) => void; onRemove: () => void; maxQty: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid #E5E7EB" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#1F2937" }}>{item.product.name}</div>
        <div style={{ fontSize: 12, color: "#6B7280" }}>{fmt(item.product.price)} × {item.quantity}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={() => onQty(-1)} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #E5E7EB", background: "#F3F4F6", cursor: "pointer", fontSize: 16 }}>−</button>
        <span style={{ width: 24, textAlign: "center", fontSize: 13, fontWeight: 700 }}>{item.quantity}</span>
        <button onClick={() => onQty(1)} disabled={item.quantity >= maxQty} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #E5E7EB", background: "#F3F4F6", cursor: item.quantity >= maxQty ? "not-allowed" : "pointer", opacity: item.quantity >= maxQty ? 0.3 : 1, fontSize: 16 }}>+</button>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, minWidth: 64, textAlign: "right" }}>{fmt(item.product.price * item.quantity)}</div>
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>
    </div>
  );
}

function ReceiptModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
      <div style={{ background: "white", borderRadius: 16, width: 320, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>🧾 Chek</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, fontFamily: "monospace", fontSize: 12 }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>DO'KON CHEKI</div>
            <div style={{ color: "#6B7280", marginTop: 4 }}>#{tx.id}</div>
          </div>
          <div style={{ borderTop: "1px dashed #D1D5DB", borderBottom: "1px dashed #D1D5DB", padding: "8px 0", margin: "8px 0", lineHeight: 1.8 }}>
            <div>Sana: {tx.date.toLocaleString("uz-UZ")}</div>
            <div>Sklad: {tx.warehouseName}</div>
            {tx.customerName && <div>Mijoz: {tx.customerName}</div>}
          </div>
          <table style={{ width: "100%", marginBottom: 8 }}>
            <thead><tr style={{ color: "#6B7280" }}>
              <th style={{ textAlign: "left" }}>Mahsulot</th>
              <th style={{ textAlign: "center" }}>Soni</th>
              <th style={{ textAlign: "right" }}>Summa</th>
            </tr></thead>
            <tbody>
              {tx.items.map(i => (
                <tr key={i.product.id}>
                  <td style={{ padding: "3px 0" }}>{i.product.name}</td>
                  <td style={{ textAlign: "center", padding: "3px 4px" }}>{i.quantity}</td>
                  <td style={{ textAlign: "right", padding: "3px 0" }}>{fmt(i.product.price * i.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderTop: "1px dashed #D1D5DB", paddingTop: 8 }}>
            {tx.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#D97706", marginBottom: 4 }}>
                <span>Chegirma</span><span>− {fmt(tx.discount)} so'm</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14 }}>
              <span>JAMI</span><span>{fmt(tx.total)} so'm</span>
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #E5E7EB", display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", fontSize: 13, background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 8 }}>Yopish</button>
        </div>
      </div>
    </div>
  );
}

function ReportTab({ transactions }: { transactions: Transaction[] }) {
  const totalRevenue = useMemo(() => transactions.reduce((s, t) => s + t.total, 0), [transactions]);

  if (transactions.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF" }}>
        Hali sotuv yo'q
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
      <div style={{ background: "#F3F4F6", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: "#6B7280" }}>Jami daromad</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#16A34A" }}>{fmt(totalRevenue)} so'm</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[...transactions].reverse().map(tx => (
          <div key={tx.id} style={{ background: "white", borderRadius: 12, border: "1px solid #E5E7EB", padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600 }}>#{tx.id}</div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>{tx.date.toLocaleString("uz-UZ")}</div>
              </div>
              <div style={{ fontWeight: 700, color: "#16A34A" }}>{fmt(tx.total)} so'm</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
export default function POSPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"pos" | "report">("pos");
  const [warehouseId, setWarehouseId] = useState("");
  const [stockOverride, setStockOverride] = useState<Record<string, Record<string, number>>>({});
  const [searchRaw, setSearchRaw] = useState("");
  const search = useDebounce(searchRaw, 300);
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>(() => loadCartFromLS());
  const [discountType, setDiscountType] = useState<DiscountType>("fixed");
  const [discountVal, setDiscountVal] = useState(0);
  const [paymentType, setPaymentType] = useState<PaymentType>("cash");
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [selling, setSelling] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const warehouses = MOCK_WAREHOUSES;
  const selectedWarehouse = useMemo(() => warehouses.find(w => w.id === warehouseId) ?? null, [warehouseId]);

  const products: Product[] = useMemo(() => {
    if (!warehouseId) return [];
    return (MOCK_PRODUCTS[warehouseId] ?? []).map(p => ({
      ...p,
      stock: stockOverride[warehouseId]?.[p.id] ?? p.stock,
    }));
  }, [warehouseId, stockOverride]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => cats.add(p.category));
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q);
    });
  }, [products, search, category]);

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.product.price * i.quantity, 0), [cart]);
  const discountAmount = useMemo(() => {
    if (!discountVal) return 0;
    if (discountType === "percent") return Math.round(subtotal * discountVal / 100);
    return Math.min(discountVal, subtotal);
  }, [subtotal, discountVal, discountType]);
  const total = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);
  const change = useMemo(() => paymentType === "cash" ? Math.max(0, cashAmount - total) : 0, [paymentType, cashAmount, total]);
  const splitValid = useMemo(() => paymentType !== "split" || (cashAmount + cardAmount) >= total, [paymentType, cashAmount, cardAmount, total]);
  const paymentValid = useMemo(() => cart.length > 0 && (paymentType === "cash" ? cashAmount >= total : paymentType === "card" ? true : splitValid), [cart, paymentType, cashAmount, total, splitValid]);

  useEffect(() => { saveCartToLS(cart); }, [cart]);
  useEffect(() => { if (warehouseId) setCart([]); }, [warehouseId]);
  useEffect(() => { setCategory("all"); setSearchRaw(""); }, [warehouseId]);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      const currentQty = existing?.quantity ?? 0;
      const liveStock = stockOverride[warehouseId]?.[product.id] ?? product.stock;
      if (currentQty >= liveStock) {
        toast.warn(`Omborda yetarli emas (${liveStock} ta)`);
        return prev;
      }
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  }, [toast, stockOverride, warehouseId]);

  const changeQty = useCallback((productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i;
      const nq = i.quantity + delta;
      if (nq <= 0) return null;
      const liveStock = stockOverride[warehouseId]?.[i.product.id] ?? i.product.stock;
      if (nq > liveStock) { toast.warn("Ombor yetarli emas"); return i; }
      return { ...i, quantity: nq };
    }).filter(Boolean) as CartItem[]);
  }, [toast, stockOverride, warehouseId]);

  const removeFromCart = useCallback((productId: string) => setCart(prev => prev.filter(i => i.product.id !== productId)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const cartQty = useCallback((productId: string) => cart.find(i => i.product.id === productId)?.quantity ?? 0, [cart]);

  const reduceStock = useCallback((items: CartItem[]) => {
    setStockOverride(prev => {
      const wid = warehouseId;
      const updated = { ...(prev[wid] ?? {}) };
      items.forEach(i => {
        const currentStock = updated[i.product.id] ?? i.product.stock;
        updated[i.product.id] = Math.max(0, currentStock - i.quantity);
      });
      return { ...prev, [wid]: updated };
    });
  }, [warehouseId]);

  const iikoService = useMemo(() => new IikoLikeService(), []);

  const handleSell = useCallback(async () => {
    if (selling || !paymentValid || !warehouseId || !cart.length) return;

    setSelling(true);
    await new Promise(r => setTimeout(r, 400));

    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    const tx: Transaction = {
      id, date: new Date(), warehouseId, warehouseName: selectedWarehouse?.name ?? "",
      items: cart.map(i => ({ ...i })), subtotal, discount: discountAmount, total,
      paymentType, cashAmount: paymentType !== "card" ? cashAmount : undefined,
      cardAmount: paymentType !== "cash" ? cardAmount : undefined,
      customerName: MOCK_CUSTOMERS.find(c => c.id === customerId)?.name,
    };

    // iiko ga yuborish
    const iikoOrder: IIikoOrder = {
      id: tx.id, timestamp: tx.date.toISOString(), warehouseId: tx.warehouseId,
      warehouseName: tx.warehouseName,
      items: tx.items.map(i => ({ productId: i.product.id, productName: i.product.name, quantity: i.quantity, price: i.product.price, total: i.product.price * i.quantity })),
      subtotal: tx.subtotal, discount: tx.discount, total: tx.total, paymentType: tx.paymentType, customerName: tx.customerName,
    };
    await iikoService.sendOrder(iikoOrder);

    reduceStock(cart);
    setTransactions(prev => [...prev, tx]);
    setReceipt(tx);
    toast.success(`Sotuv amalga oshdi! #${id}`);

    clearCart();
    setDiscountVal(0);
    setCashAmount(0);
    setCardAmount(0);
    setCustomerId("");
    setSelling(false);
  }, [selling, paymentValid, warehouseId, cart, selectedWarehouse, subtotal, discountAmount, total, paymentType, cashAmount, cardAmount, customerId, reduceStock, clearCart, toast, iikoService]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Enter" && document.activeElement?.tagName !== "INPUT") handleSell();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSell]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#F9FAFB", fontFamily: "system-ui, -apple-system, sans-serif", position: "relative" }}>
      <ToastStack toasts={toast.toasts} />

      {/* LEFT PANEL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: "white", borderBottom: "1px solid #E5E7EB", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setActiveTab("pos")} style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8, background: activeTab === "pos" ? "#EFF6FF" : "#F3F4F6", border: activeTab === "pos" ? "1px solid #3B82F6" : "1px solid #E5E7EB", fontWeight: activeTab === "pos" ? 600 : 400 }}>🛒 Sotuv</button>
            <button onClick={() => setActiveTab("report")} style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8, background: activeTab === "report" ? "#EFF6FF" : "#F3F4F6", border: activeTab === "report" ? "1px solid #3B82F6" : "1px solid #E5E7EB", fontWeight: activeTab === "report" ? 600 : 400 }}>📊 Hisobot</button>
          </div>

          {activeTab === "pos" && (
            <>
              <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} style={{ padding: "6px 10px", fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB", minWidth: 150 }}>
                <option value="">Sklad tanlang *</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>

              <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
                <input ref={searchRef} value={searchRaw} onChange={e => setSearchRaw(e.target.value)} placeholder="Qidirish... (Ctrl+F)" disabled={!warehouseId} style={{ width: "100%", padding: "6px 10px 6px 30px", fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }} />
              </div>

              <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                <button onClick={() => setCategory("all")} style={{ padding: "4px 12px", fontSize: 11, borderRadius: 20, background: category === "all" ? "#3B82F6" : "#F3F4F6", color: category === "all" ? "white" : "#374151", border: "none" }}>Barchasi</button>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} style={{ padding: "4px 12px", fontSize: 11, borderRadius: 20, background: category === cat ? "#3B82F6" : "#F3F4F6", color: category === cat ? "white" : "#374151", border: "none" }}>{cat}</button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Content */}
        {activeTab === "pos" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {!warehouseId ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center", color: "#9CA3AF" }}>
                  <div style={{ fontSize: 14, marginBottom: 8 }}>Sklad tanlang</div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    {warehouses.map(w => <button key={w.id} onClick={() => setWarehouseId(w.id)} style={{ padding: "8px 16px", background: "#3B82F6", color: "white", border: "none", borderRadius: 8 }}>{w.name}</button>)}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                {filteredProducts.map(p => <ProductCard key={p.id} product={p} inCart={cartQty(p.id)} onClick={() => addToCart(p)} />)}
              </div>
            )}
          </div>
        ) : (
          <ReportTab transactions={transactions} />
        )}
      </div>

      {/* RIGHT PANEL - CART */}
      <div style={{ width: 340, flexShrink: 0, background: "white", borderLeft: "1px solid #E5E7EB", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>🛒 Savat</span>
          {cart.length > 0 && <button onClick={clearCart} style={{ fontSize: 11, color: "#DC2626", border: "none", background: "none", cursor: "pointer" }}>Tozalash</button>}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px" }}>
          {cart.length === 0 ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF" }}>Savat bo'sh</div>
          ) : (
            cart.map(item => (
              <CartRow key={item.product.id} item={item} maxQty={stockOverride[warehouseId]?.[item.product.id] ?? item.product.stock} onQty={d => changeQty(item.product.id, d)} onRemove={() => removeFromCart(item.product.id)} />
            ))
          )}
        </div>

        <div style={{ borderTop: "1px solid #E5E7EB", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {cart.length > 0 && (
            <>
              <div style={{ display: "flex", gap: 6 }}>
                <select value={discountType} onChange={e => setDiscountType(e.target.value as DiscountType)} style={{ width: 80, padding: "6px", fontSize: 12, borderRadius: 6, border: "1px solid #E5E7EB" }}>
                  <option value="fixed">So'm</option>
                  <option value="percent">%</option>
                </select>
                <input type="number" min={0} placeholder="Chegirma" value={discountVal || ""} onChange={e => setDiscountVal(parseFloat(e.target.value) || 0)} style={{ flex: 1, padding: "6px", fontSize: 12, borderRadius: 6, border: "1px solid #E5E7EB" }} />
              </div>

              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span>Mahsulotlar</span><span>{fmt(subtotal)} so'm</span></div>
                {discountAmount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#D97706" }}><span>Chegirma</span><span>− {fmt(discountAmount)} so'm</span></div>}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, borderTop: "1px solid #E5E7EB", paddingTop: 8, marginTop: 4 }}><span>Jami</span><span>{fmt(total)} so'm</span></div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <button onClick={() => setPaymentType("cash")} style={{ padding: "8px", fontSize: 12, borderRadius: 6, background: paymentType === "cash" ? "#EFF6FF" : "#F3F4F6", border: paymentType === "cash" ? "1px solid #3B82F6" : "1px solid #E5E7EB" }}>💵 Naqd</button>
                <button onClick={() => setPaymentType("card")} style={{ padding: "8px", fontSize: 12, borderRadius: 6, background: paymentType === "card" ? "#EFF6FF" : "#F3F4F6", border: paymentType === "card" ? "1px solid #3B82F6" : "1px solid #E5E7EB" }}>💳 Karta</button>
                <button onClick={() => setPaymentType("split")} style={{ padding: "8px", fontSize: 12, borderRadius: 6, background: paymentType === "split" ? "#EFF6FF" : "#F3F4F6", border: paymentType === "split" ? "1px solid #3B82F6" : "1px solid #E5E7EB" }}>🔀 Aralash</button>
              </div>

              {paymentType === "cash" && (
                <input type="number" min={0} placeholder="Qabul qilingan summa" value={cashAmount || ""} onChange={e => setCashAmount(parseFloat(e.target.value) || 0)} style={{ padding: "8px", fontSize: 12, borderRadius: 6, border: "1px solid #E5E7EB" }} />
              )}
              {paymentType === "split" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input type="number" min={0} placeholder="Naqd summa" value={cashAmount || ""} onChange={e => setCashAmount(parseFloat(e.target.value) || 0)} style={{ padding: "8px", fontSize: 12, borderRadius: 6, border: "1px solid #E5E7EB" }} />
                  <input type="number" min={0} placeholder="Karta summa" value={cardAmount || ""} onChange={e => setCardAmount(parseFloat(e.target.value) || 0)} style={{ padding: "8px", fontSize: 12, borderRadius: 6, border: "1px solid #E5E7EB" }} />
                </div>
              )}

              <button onClick={handleSell} disabled={selling || !paymentValid} style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 500, borderRadius: 8, background: "#3B82F6", color: "white", border: "none", cursor: selling || !paymentValid ? "not-allowed" : "pointer", opacity: selling || !paymentValid ? 0.5 : 1 }}>
                Sotish — {fmt(total)} so'm
              </button>
            </>
          )}
        </div>
      </div>

      {receipt && <ReceiptModal tx={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
