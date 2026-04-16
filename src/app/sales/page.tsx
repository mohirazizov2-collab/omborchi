"use client";
 
/**
 * POS (Point of Sale) Module — Demo version with mock data
 * Features:
 *  - 3 ta sklad (mock data)
 *  - Mahsulot grid + kategoriya filter
 *  - Savat (qty +/−, ×, Tozalash)
 *  - Chegirma (so'm / %)
 *  - To'lov: Naqd (qaytim), Karta, Aralash
 *  - Sotish → Chek modal, ombor kamayadi
 *  - Hisobot tab: daromad, top mahsulotlar, tranzaksiyalar
 */
 
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
 
// localStorage cart
const CART_KEY = "pos_cart_v3";
function loadCartFromLS(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]"); } catch { return []; }
}
function saveCartToLS(cart: CartItem[]) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
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
  return {
    toasts,
    success: (t: string) => add("success", t),
    error:   (t: string) => add("error", t),
    warn:    (t: string) => add("warn", t),
  };
}
 
// ─── Sub-components ───────────────────────────────────────
 
function ToastStack({ toasts }: { toasts: ToastMsg[] }) {
  const colorMap = {
    success: { bg: "var(--color-background-success)", color: "var(--color-text-success)", border: "var(--color-border-success)" },
    error:   { bg: "var(--color-background-danger)",  color: "var(--color-text-danger)",  border: "var(--color-border-danger)"  },
    warn:    { bg: "var(--color-background-warning)", color: "var(--color-text-warning)", border: "var(--color-border-warning)" },
  };
  return (
    <div style={{ position: "fixed", top: 12, right: 12, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map(t => {
        const c = colorMap[t.type];
        return (
          <div key={t.id} style={{ padding: "10px 16px", borderRadius: "var(--border-radius-md)", background: c.bg, color: c.color, border: `0.5px solid ${c.border}`, fontSize: 13, fontWeight: 500, minWidth: 220, maxWidth: 320, boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}>
            {t.text}
          </div>
        );
      })}
    </div>
  );
}
 
function SkeletonCard() {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: 12, animation: "pulse 1.4s ease-in-out infinite" }}>
      <div style={{ height: 72, borderRadius: 8, background: "var(--color-border-tertiary)", marginBottom: 8 }} />
      <div style={{ height: 12, borderRadius: 6, background: "var(--color-border-tertiary)", marginBottom: 6, width: "80%" }} />
      <div style={{ height: 12, borderRadius: 6, background: "var(--color-border-tertiary)", width: "50%" }} />
    </div>
  );
}
 
function ProductCard({ product, inCart, onClick }: { product: Product; inCart: number; onClick: () => void }) {
  const outOfStock = product.stock <= 0;
  const lowStock   = product.stock > 0 && product.stock <= 3;
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
        opacity: outOfStock ? 0.4 : 1,
        textAlign: "left", display: "flex", flexDirection: "column",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (!outOfStock) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ""; }}
    >
      {inCart > 0 && (
        <div style={{ position: "absolute", top: 0, right: 0, background: "#185FA5", color: "#E6F1FB", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: "0 12px 0 8px" }}>{inCart}</div>
      )}
      <div style={{ height: 72, background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "var(--color-text-tertiary)", overflow: "hidden" }}>
        {product.name[0]?.toUpperCase()}
      </div>
      <div style={{ padding: "8px 10px 10px" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.3, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {product.name}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: inCart > 0 ? "#185FA5" : "#3B6D11" }}>
          {fmt(product.price)} so'm
        </div>
        <div style={{ fontSize: 11, marginTop: 2, color: outOfStock ? "var(--color-text-danger)" : lowStock ? "var(--color-text-warning)" : "var(--color-text-tertiary)" }}>
          {outOfStock ? "Tugagan" : lowStock ? `⚠ ${product.stock} ta` : `${product.stock} ta`}
        </div>
      </div>
    </button>
  );
}
 
function CartRow({ item, onQty, onRemove, maxQty }: { item: CartItem; onQty: (d: number) => void; onRemove: () => void; maxQty: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product.name}</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 1 }}>{fmt(item.product.price)} × {item.quantity}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={() => onQty(-1)} style={{ width: 24, height: 24, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-primary)" }}>−</button>
        <span style={{ width: 24, textAlign: "center", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{item.quantity}</span>
        <button onClick={() => onQty(+1)} disabled={item.quantity >= maxQty} style={{ width: 24, height: 24, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: item.quantity >= maxQty ? "not-allowed" : "pointer", opacity: item.quantity >= maxQty ? 0.3 : 1, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-primary)" }}>+</button>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", minWidth: 64, textAlign: "right" }}>{fmt(item.product.price * item.quantity)}</div>
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 18, padding: "0 2px", lineHeight: 1 }}>×</button>
    </div>
  );
}
 
// ─── Receipt Modal ─────────────────────────────────────────
function ReceiptModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: 0, width: 320, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>🧾 Chek</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--color-text-tertiary)", padding: "0 4px" }}>×</button>
        </div>
        {/* Body */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, fontFamily: "monospace", fontSize: 12 }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>DO'KON CHEKI</div>
            <div style={{ color: "var(--color-text-secondary)", marginTop: 4 }}>#{tx.id}</div>
          </div>
          <div style={{ borderTop: "1px dashed var(--color-border-secondary)", borderBottom: "1px dashed var(--color-border-secondary)", padding: "8px 0", margin: "8px 0", color: "var(--color-text-secondary)", lineHeight: 1.8 }}>
            <div>Sana: {tx.date.toLocaleString("uz-UZ")}</div>
            <div>Sklad: {tx.warehouseName}</div>
            {tx.customerName && <div>Mijoz: {tx.customerName}</div>}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
            <thead>
              <tr style={{ color: "var(--color-text-tertiary)" }}>
                <th style={{ textAlign: "left", padding: "2px 0", fontWeight: 500 }}>Mahsulot</th>
                <th style={{ textAlign: "center", padding: "2px 4px", fontWeight: 500 }}>Soni</th>
                <th style={{ textAlign: "right", padding: "2px 0", fontWeight: 500 }}>Summa</th>
              </tr>
            </thead>
            <tbody>
              {tx.items.map(i => (
                <tr key={i.product.id} style={{ color: "var(--color-text-primary)" }}>
                  <td style={{ padding: "3px 0", verticalAlign: "top" }}>{i.product.name}</td>
                  <td style={{ textAlign: "center", padding: "3px 4px" }}>{i.quantity}</td>
                  <td style={{ textAlign: "right", padding: "3px 0", whiteSpace: "nowrap" }}>{fmt(i.product.price * i.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderTop: "1px dashed var(--color-border-secondary)", paddingTop: 8 }}>
            {tx.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-warning)", marginBottom: 4 }}>
                <span>Chegirma</span><span>− {fmt(tx.discount)} so'm</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14, color: "var(--color-text-primary)" }}>
              <span>JAMI</span><span>{fmt(tx.total)} so'm</span>
            </div>
            <div style={{ color: "var(--color-text-secondary)", marginTop: 4 }}>
              To'lov: {tx.paymentType === "cash" ? "Naqd" : tx.paymentType === "card" ? "Karta" : "Aralash"}
            </div>
            {tx.paymentType === "cash" && tx.cashAmount && tx.cashAmount > tx.total && (
              <div style={{ color: "var(--color-text-success)" }}>Qaytim: {fmt(tx.cashAmount - tx.total)} so'm</div>
            )}
          </div>
          <div style={{ textAlign: "center", marginTop: 12, color: "var(--color-text-tertiary)", borderTop: "1px dashed var(--color-border-secondary)", paddingTop: 8 }}>
            Rahmat! Yana keling! 🙏
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", fontSize: 13 }}>Yopish</button>
          <button
            onClick={() => {
              const w = window.open("", "_blank");
              if (!w) return;
              w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Chek</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font:12px monospace;padding:16px;max-width:280px}h2{text-align:center;font-size:14px;margin-bottom:8px}.d{border-top:1px dashed #000;margin:6px 0}table{width:100%}td{padding:2px 0}.t{font-weight:700;font-size:14px}</style></head><body><h2>DO'KON CHEKI</h2><div>#${tx.id}</div><div class="d"></div><div>Sana: ${tx.date.toLocaleString("uz-UZ")}</div><div>Sklad: ${tx.warehouseName}</div>${tx.customerName ? `<div>Mijoz: ${tx.customerName}</div>` : ""}<div class="d"></div><table><thead><tr><th style="text-align:left">Nomi</th><th>Soni</th><th style="text-align:right">Summa</th></tr></thead><tbody>${tx.items.map(i => `<tr><td>${i.product.name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${fmt(i.product.price * i.quantity)}</td></tr>`).join("")}</tbody></table><div class="d"></div>${tx.discount > 0 ? `<div>Chegirma: ${fmt(tx.discount)} so'm</div>` : ""}<div class="t">JAMI: ${fmt(tx.total)} so'm</div><div>To'lov: ${tx.paymentType === "cash" ? "Naqd" : tx.paymentType === "card" ? "Karta" : "Aralash"}</div><div class="d"></div><div style="text-align:center;margin-top:8px">Rahmat! Yana keling!</div></body></html>`);
              w.document.close();
              w.print();
            }}
            style={{ flex: 1, padding: "9px", fontSize: 13, background: "var(--color-background-info)", color: "var(--color-text-info)", border: "0.5px solid var(--color-border-info)" }}
          >
            🖨 Chop etish
          </button>
        </div>
      </div>
    </div>
  );
}
 
// ─── Report Tab ────────────────────────────────────────────
function ReportTab({ transactions }: { transactions: Transaction[] }) {
  const totalRevenue = useMemo(() => transactions.reduce((s, t) => s + t.total, 0), [transactions]);
  const totalDiscount = useMemo(() => transactions.reduce((s, t) => s + t.discount, 0), [transactions]);
  const totalItems = useMemo(() => transactions.reduce((s, t) => s + t.items.reduce((ss, i) => ss + i.quantity, 0), 0), [transactions]);
 
  const productSales = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    transactions.forEach(tx => {
      tx.items.forEach(i => {
        if (!map[i.product.id]) map[i.product.id] = { name: i.product.name, qty: 0, revenue: 0 };
        map[i.product.id].qty += i.quantity;
        map[i.product.id].revenue += i.product.price * i.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [transactions]);
 
  const paymentBreakdown = useMemo(() => {
    let cash = 0, card = 0, split = 0;
    transactions.forEach(tx => {
      if (tx.paymentType === "cash") cash += tx.total;
      else if (tx.paymentType === "card") card += tx.total;
      else split += tx.total;
    });
    return { cash, card, split };
  }, [transactions]);
 
  if (transactions.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)", gap: 8 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.25 }}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Hali sotuv yo'q</div>
        <div style={{ fontSize: 12 }}>Biror sotuv amalga oshirilgandan so'ng bu yerda ko'rinadi</div>
      </div>
    );
  }
 
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { label: "Jami daromad", value: `${fmt(totalRevenue)} so'm`, color: "var(--color-text-success)", bg: "var(--color-background-success)" },
          { label: "Jami sotuv", value: `${transactions.length} ta`, color: "var(--color-text-info)", bg: "var(--color-background-info)" },
          { label: "Jami mahsulot", value: `${totalItems} ta`, color: "var(--color-text-primary)", bg: "var(--color-background-secondary)" },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "14px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>
 
      {/* Payment breakdown */}
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 10 }}>To'lov usullari</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "💵 Naqd", val: paymentBreakdown.cash },
            { label: "💳 Karta", val: paymentBreakdown.card },
            { label: "🔀 Aralash", val: paymentBreakdown.split },
          ].map(({ label, val }) => val > 0 ? (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--color-text-primary)" }}>
              <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{fmt(val)} so'm</span>
            </div>
          ) : null)}
          {totalDiscount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-warning)", borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 6, marginTop: 2 }}>
              <span>Jami chegirma</span><span>− {fmt(totalDiscount)} so'm</span>
            </div>
          )}
        </div>
      </div>
 
      {/* Top products */}
      {productSales.length > 0 && (
        <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 10 }}>🏆 Top mahsulotlar</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {productSales.map((p, i) => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: i < 3 ? "#fff" : "var(--color-text-tertiary)", flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{p.qty} ta sotildi</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-success)", flexShrink: 0 }}>{fmt(p.revenue)} so'm</div>
              </div>
            ))}
          </div>
        </div>
      )}
 
      {/* Transactions */}
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 10 }}>📋 Tranzaksiyalar</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...transactions].reverse().map(tx => (
            <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  #{tx.id} · {tx.warehouseName}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                  {tx.date.toLocaleString("uz-UZ")} · {tx.items.reduce((s, i) => s + i.quantity, 0)} ta mahsulot
                  {tx.customerName ? ` · ${tx.customerName}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-success)" }}>{fmt(tx.total)} so'm</div>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{tx.paymentType === "cash" ? "Naqd" : tx.paymentType === "card" ? "Karta" : "Aralash"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
 
// ═════════════════════════════════════════════════════════
// MAIN POS COMPONENT
// ═════════════════════════════════════════════════════════
export default function POSPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"pos" | "report">("pos");
 
  // ── Warehouses ─────────────────────────────────────────
  const [warehouseId, setWarehouseId] = useState("");
  const warehouses = MOCK_WAREHOUSES;
  const selectedWarehouse = useMemo(() => warehouses.find(w => w.id === warehouseId) ?? null, [warehouseId]);
 
  // ── Products (mock, with local stock) ─────────────────
  const [stockOverride, setStockOverride] = useState<Record<string, Record<string, number>>>({});
 
  const products: Product[] = useMemo(() => {
    if (!warehouseId) return [];
    return (MOCK_PRODUCTS[warehouseId] ?? []).map(p => ({
      ...p,
      stock: stockOverride[warehouseId]?.[p.id] ?? p.stock,
    }));
  }, [warehouseId, stockOverride]);
 
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
 
  // ── Customers ──────────────────────────────────────────
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [customerId, setCustomerId] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
 
  // ── Search & filter ────────────────────────────────────
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchRaw, setSearchRaw] = useState("");
  const search   = useDebounce(searchRaw, 300);
  const [category, setCategory] = useState("all");
 
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
      return p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(search);
    });
  }, [products, search, category]);
 
  // Clear category when warehouse changes
  useEffect(() => { setCategory("all"); setSearchRaw(""); }, [warehouseId]);
 
  // ── Cart ───────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>(() => loadCartFromLS());
  useEffect(() => { saveCartToLS(cart); }, [cart]);
  useEffect(() => { if (warehouseId) setCart([]); }, [warehouseId]);
 
  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      const currentQty = existing?.quantity ?? 0;
      const liveStock  = stockOverride[warehouseId]?.[product.id] ?? product.stock;
      if (currentQty >= liveStock) {
        toast.warn(`"${product.name}" — omborda yetarli emas (${liveStock} ta)`);
        return prev;
      }
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  }, [toast, stockOverride, warehouseId]);
 
  const changeQty = useCallback((productId: string, delta: number) => {
    setCart(prev =>
      prev.map(i => {
        if (i.product.id !== productId) return i;
        const nq = i.quantity + delta;
        if (nq <= 0) return null as any;
        const liveStock = stockOverride[warehouseId]?.[i.product.id] ?? i.product.stock;
        if (nq > liveStock) { toast.warn("Ombor yetarli emas"); return i; }
        return { ...i, quantity: nq };
      }).filter(Boolean)
    );
  }, [toast, stockOverride, warehouseId]);
 
  const removeFromCart = useCallback((productId: string) => { setCart(prev => prev.filter(i => i.product.id !== productId)); }, []);
  const clearCart      = useCallback(() => setCart([]), []);
  const cartQty        = useCallback((productId: string) => cart.find(i => i.product.id === productId)?.quantity ?? 0, [cart]);
 
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
 
  const change     = useMemo(() => paymentType === "cash" ? Math.max(0, cashAmount - total) : 0, [paymentType, cashAmount, total]);
  const splitValid = useMemo(() => paymentType !== "split" || Math.round(cashAmount + cardAmount) >= Math.round(total), [paymentType, cashAmount, cardAmount, total]);
  const paymentValid = useMemo(() => {
    if (!cart.length) return false;
    if (paymentType === "cash") return cashAmount >= total;
    if (paymentType === "card") return true;
    return splitValid;
  }, [cart, paymentType, cashAmount, total, splitValid]);
 
  // ── Transactions & Receipt ─────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [selling, setSelling] = useState(false);
 
  const handleSell = useCallback(async () => {
    if (selling || !paymentValid) return;
    if (!warehouseId) { toast.error("Sklad tanlanmagan"); return; }
    if (!cart.length)  { toast.error("Savat bo'sh"); return; }
 
    setSelling(true);
    // Simulate slight delay
    await new Promise(r => setTimeout(r, 400));
 
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    const customer = customers.find(c => c.id === customerId);
 
    const tx: Transaction = {
      id,
      date: new Date(),
      warehouseId,
      warehouseName: selectedWarehouse?.name ?? "",
      items: cart.map(i => ({ ...i })),
      subtotal,
      discount: discountAmount,
      total,
      paymentType,
      cashAmount: paymentType !== "card" ? cashAmount : undefined,
      cardAmount: paymentType !== "cash" ? cardAmount : undefined,
      customerName: customer?.name,
    };
 
    reduceStock(cart);
    setTransactions(prev => [...prev, tx]);
    setReceipt(tx);
    toast.success(`Sotuv amalga oshdi! #${id}`);
 
    // Reset
    clearCart();
    setDiscountVal(0);
    setCashAmount(0);
    setCardAmount(0);
    setCustomerId("");
    setSelling(false);
  }, [selling, paymentValid, warehouseId, cart, customers, customerId, selectedWarehouse, subtotal, discountAmount, total, paymentType, cashAmount, cardAmount, reduceStock, clearCart, toast]);
 
  // ── Keyboard shortcuts ─────────────────────────────────
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Enter" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "SELECT") {
        handleSell();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSell]);
 
  // ══════════════════════════════════════════════════════
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)", position: "relative" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin   { to { transform: rotate(360deg); } }
        input,select { font-family: inherit; font-size: 13px; padding: 7px 10px;
          border: 0.5px solid var(--color-border-secondary); border-radius: var(--border-radius-md);
          background: var(--color-background-primary); color: var(--color-text-primary); outline: none; }
        input:focus,select:focus { box-shadow: 0 0 0 2px var(--color-border-info); }
        button { font-family: inherit; font-size: 13px; border: 0.5px solid var(--color-border-secondary);
          border-radius: var(--border-radius-md); background: var(--color-background-secondary);
          color: var(--color-text-primary); cursor: pointer; padding: 6px 12px; }
        button:hover { opacity: 0.85; }
        button:active { transform: scale(0.98); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--color-border-secondary); border-radius: 4px; }
      `}</style>
 
      <ToastStack toasts={toast.toasts} />
 
      {/* ── LEFT: Products ─────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
 
        {/* Top bar */}
        <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
 
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {([
              { key: "pos",    label: "🛒 Sotuv"  },
              { key: "report", label: "📊 Hisobot" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  fontSize: 12, padding: "6px 12px",
                  fontWeight: activeTab === key ? 600 : 400,
                  background: activeTab === key ? "var(--color-background-info)" : "var(--color-background-secondary)",
                  color: activeTab === key ? "var(--color-text-info)" : "var(--color-text-secondary)",
                  border: `${activeTab === key ? "1.5px" : "0.5px"} solid ${activeTab === key ? "var(--color-border-info)" : "var(--color-border-tertiary)"}`,
                }}
              >{label}</button>
            ))}
          </div>
 
          {activeTab === "pos" && (
            <>
              {/* Warehouse */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--color-text-secondary)" }}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <select
                  value={warehouseId}
                  onChange={e => setWarehouseId(e.target.value)}
                  style={{ minWidth: 150, borderColor: !warehouseId ? "var(--color-border-warning)" : undefined, fontWeight: warehouseId ? 500 : 400 }}
                >
                  <option value="">Sklad tanlang *</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.location})</option>)}
                </select>
              </div>
 
              {/* Search */}
              <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
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
 
              {/* Category filter */}
              {categories.length > 0 && (
                <div style={{ display: "flex", gap: 6, overflowX: "auto", flex: 1 }}>
                  {["all", ...categories].map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)} style={{
                      flexShrink: 0, fontSize: 12, padding: "5px 12px",
                      background: category === cat ? "var(--color-background-info)" : "var(--color-background-secondary)",
                      color:      category === cat ? "var(--color-text-info)" : "var(--color-text-secondary)",
                      border: `0.5px solid ${category === cat ? "var(--color-border-info)" : "var(--color-border-tertiary)"}`,
                      fontWeight: category === cat ? 500 : 400,
                    }}>
                      {cat === "all" ? "Barchasi" : cat}
                    </button>
                  ))}
                </div>
              )}
 
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", flexShrink: 0 }}>{filteredProducts.length} ta</span>
            </>
          )}
        </div>
 
        {/* Content */}
        {activeTab === "pos" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {!warehouseId ? (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)" }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: 12, opacity: 0.25 }}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Sklad tanlang</div>
                <div style={{ fontSize: 12 }}>Mahsulotlarni ko'rish uchun yuqoridan sklad tanlang</div>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  {warehouses.map(w => (
                    <button key={w.id} onClick={() => setWarehouseId(w.id)} style={{ fontSize: 12, padding: "7px 14px", background: "var(--color-background-info)", color: "var(--color-text-info)", border: "0.5px solid var(--color-border-info)" }}>
                      {w.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)" }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Mahsulot topilmadi</div>
                {search && <button onClick={() => setSearchRaw("")} style={{ fontSize: 12, marginTop: 8, color: "var(--color-text-info)", border: "none", background: "none", cursor: "pointer" }}>Tozalash</button>}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                {filteredProducts.map(p => (
                  <ProductCard key={p.id} product={p} inCart={cartQty(p.id)} onClick={() => addToCart(p)} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <ReportTab transactions={transactions} />
        )}
      </div>
 
      {/* ── RIGHT: Cart & Checkout ──────────────────────────── */}
      <div style={{ width: 340, flexShrink: 0, background: "var(--color-background-primary)", borderLeft: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
 
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
            <button onClick={clearCart} style={{ fontSize: 11, color: "var(--color-text-danger)", border: "none", background: "none", cursor: "pointer" }}>Tozalash</button>
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
                maxQty={stockOverride[warehouseId]?.[item.product.id] ?? item.product.stock}
                onQty={d => changeQty(item.product.id, d)}
                onRemove={() => removeFromCart(item.product.id)}
              />
            ))
          )}
        </div>
 
        {/* Bottom form */}
        <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0, background: "var(--color-background-secondary)" }}>
 
          {/* Customer */}
          <div style={{ display: "flex", gap: 6 }}>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} style={{ flex: 1 }}>
              <option value="">Mijoz (ixtiyoriy)</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ""}</option>)}
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
                <span>Mahsulotlar ({cart.reduce((s, i) => s + i.quantity, 0)} ta)</span>
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
              { key: "cash",  label: "💵 Naqd"    },
              { key: "card",  label: "💳 Karta"   },
              { key: "split", label: "🔀 Aralash" },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setPaymentType(key)} style={{
                fontSize: 12, padding: "8px 4px", fontWeight: paymentType === key ? 500 : 400,
                background: paymentType === key ? "var(--color-background-info)" : "var(--color-background-primary)",
                color: paymentType === key ? "var(--color-text-info)" : "var(--color-text-secondary)",
                border: `${paymentType === key ? "1.5px" : "0.5px"} solid ${paymentType === key ? "var(--color-border-info)" : "var(--color-border-tertiary)"}`,
              }}>{label}</button>
            ))}
          </div>
 
          {/* Cash input */}
          {paymentType === "cash" && cart.length > 0 && (
            <div>
              <input type="number" min={0} placeholder="Qabul qilingan summa" value={cashAmount || ""} onChange={e => setCashAmount(parseFloat(e.target.value) || 0)} style={{ width: "100%", boxSizing: "border-box" }} />
              {cashAmount > 0 && cashAmount >= total && (
                <div style={{ fontSize: 12, color: "var(--color-text-success)", marginTop: 4 }}>✓ Qaytim: {fmt(change)} so'm</div>
              )}
            </div>
          )}
 
          {/* Split input */}
          {paymentType === "split" && cart.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input type="number" min={0} placeholder="Naqd summa" value={cashAmount || ""} onChange={e => setCashAmount(parseFloat(e.target.value) || 0)} style={{ width: "100%", boxSizing: "border-box" }} />
              <input type="number" min={0} placeholder="Karta summa" value={cardAmount || ""} onChange={e => setCardAmount(parseFloat(e.target.value) || 0)} style={{ width: "100%", boxSizing: "border-box" }} />
              {!splitValid && (cashAmount > 0 || cardAmount > 0) && (
                <div style={{ fontSize: 12, color: "var(--color-text-danger)" }}>⚠ Yetishmaydi: {fmt(total - cashAmount - cardAmount)} so'm</div>
              )}
            </div>
          )}
 
          {/* Sell button */}
          <button
            onClick={handleSell}
            disabled={selling || !cart.length || !paymentValid || !warehouseId}
            style={{
              width: "100%", padding: "12px", fontSize: 14, fontWeight: 500,
              background: (selling || !cart.length || !paymentValid || !warehouseId) ? "var(--color-background-secondary)" : "var(--color-background-info)",
              color:      (selling || !cart.length || !paymentValid || !warehouseId) ? "var(--color-text-tertiary)" : "var(--color-text-info)",
              border: `0.5px solid ${(selling || !cart.length || !paymentValid || !warehouseId) ? "var(--color-border-tertiary)" : "var(--color-border-info)"}`,
              borderRadius: "var(--border-radius-md)",
              cursor: (selling || !cart.length || !paymentValid || !warehouseId) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s",
            }}
          >
            {selling
              ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite" }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeDasharray="40" strokeDashoffset="10"/></svg>Saqlanmoqda...</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>Sotish — {fmt(total)} so'm</>
            }
          </button>
 
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "center" }}>
            Enter → sotish · Ctrl+F → qidirish
          </div>
        </div>
      </div>
 
      {/* ── New Customer Modal ──────────────────────────────── */}
      {showNewCustomer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: 24, width: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: "var(--color-text-primary)" }}>Yangi mijoz qo'shish</div>
            <NewCustomerForm
              onSave={c => { setCustomers(prev => [...prev, c]); setCustomerId(c.id); setShowNewCustomer(false); toast.success(`${c.name} qo'shildi`); }}
              onClose={() => setShowNewCustomer(false)}
            />
          </div>
        </div>
      )}
 
      {/* ── Receipt Modal ───────────────────────────────────── */}
      {receipt && <ReceiptModal tx={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
 
// ─── New Customer Form ─────────────────────────────────────
function NewCustomerForm({ onSave, onClose }: { onSave: (c: Customer) => void; onClose: () => void }) {
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr]     = useState("");
 
  const save = () => {
    if (!name.trim()) { setErr("Ism kiritilishi shart"); return; }
    const c: Customer = { id: `c${Date.now()}`, name: name.trim(), phone: phone.trim() || undefined };
    onSave(c);
  };
 
  return (
    <>
      {err && <div style={{ color: "var(--color-text-danger)", fontSize: 12, marginBottom: 8 }}>{err}</div>}
      <input placeholder="Ism *" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", marginBottom: 10, boxSizing: "border-box" }} />
      <input placeholder="Telefon" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: "100%", marginBottom: 16, boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "7px 16px" }}>Bekor</button>
        <button onClick={save} style={{ padding: "7px 16px", background: "var(--color-background-info)", color: "var(--color-text-info)", border: "0.5px solid var(--color-border-info)", borderRadius: "var(--border-radius-md)", cursor: "pointer" }}>
          Saqlash
        </button>
      </div>
    </>
  );
}
 
