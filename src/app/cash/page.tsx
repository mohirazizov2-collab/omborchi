"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection, getDocs, addDoc, query, where,
  orderBy, limit, serverTimestamp, doc, updateDoc,
  increment, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

// ============ TYPES ============
interface Warehouse {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  warehouseId?: string;
  skladId?: string;
  omborId?: string;
  imageUrl?: string;
}

interface CartItem extends Product {
  quantity: number;
  customPrice: number;
}

interface SaleItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  subtotal: number;
}

interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  paymentMethod: "cash" | "card" | "transfer";
  cashierName: string;
  cashierId: string;
  warehouseId: string;
  warehouseName?: string;
  cashGiven?: number;
  change?: number;
  createdAt: any;
}

type TabType = "pos" | "history" | "payments" | "report";
type PayMethod = "cash" | "card" | "transfer";

// ============ UTILS ============
const fmt = (n: number) =>
  new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";

const fmtDate = (ts: any) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("uz-UZ");
};

const todayRange = () => {
  const s = new Date(); s.setHours(0, 0, 0, 0);
  const e = new Date(); e.setHours(23, 59, 59, 999);
  return { start: Timestamp.fromDate(s), end: Timestamp.fromDate(e) };
};

const PAY_CONFIG = {
  cash:     { label: "Naqd",     icon: "₩", color: "#22c55e", bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.25)" },
  card:     { label: "Karta",    icon: "▣", color: "#6366f1", bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.25)" },
  transfer: { label: "O'tkazma", icon: "⇄", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
};

// ============ MAIN ============
export default function CashPage() {
  const { user } = useAuth();

  const [warehouses, setWarehouses]           = useState<Warehouse[]>([]);
  const [activeWh, setActiveWh]               = useState<Warehouse | null>(null);
  const [showWhModal, setShowWhModal]         = useState(false);
  const [whLoading, setWhLoading]             = useState(true);

  const [allProducts, setAllProducts]         = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [search, setSearch]                   = useState("");
  const [selectedCat, setSelectedCat]         = useState("all");

  const [cart, setCart]                       = useState<CartItem[]>([]);
  const [payMethod, setPayMethod]             = useState<PayMethod>("cash");
  const [cashGiven, setCashGiven]             = useState(0);

  const [loading, setLoading]                 = useState(false);
  const [toast, setToast]                     = useState<{msg:string;type:"ok"|"err"}|null>(null);
  const [tab, setTab]                         = useState<TabType>("pos");
  const [showReceipt, setShowReceipt]         = useState(false);
  const [lastSale, setLastSale]               = useState<Sale|null>(null);
  const [customPriceItem, setCustomPriceItem] = useState<CartItem|null>(null);
  const [tempPrice, setTempPrice]             = useState("");

  const [sales, setSales]                     = useState<Sale[]>([]);
  const [report, setReport] = useState({
    totalRevenue: 0, cashRevenue: 0, cardRevenue: 0, transferRevenue: 0,
    salesCount: 0, itemsSold: 0,
    topProducts: [] as {name:string;qty:number;revenue:number}[],
  });

  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const showToast = (msg: string, type: "ok"|"err" = "ok") => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  // ─── Fetch warehouses (try multiple collection names) ───
  const fetchWarehouses = useCallback(async () => {
    setWhLoading(true);
    try {
      const names = ["warehouses", "skladlar", "omborlar"];
      let data: Warehouse[] = [];
      for (const name of names) {
        const snap = await getDocs(collection(db, name));
        if (!snap.empty) {
          data = snap.docs.map(d => {
            const r = d.data() as any;
            return {
              id: d.id,
              name: r.name || r.nomi || r.nom || d.id,
              address: r.address || r.manzil || "",
              phone: r.phone || r.telefon || "",
            };
          });
          break;
        }
      }
      setWarehouses(data);
      if (data.length > 0) setActiveWh(data[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setWhLoading(false);
    }
  }, []);

  // ─── Fetch ALL products (no warehouse filter — show everything) ───
  const fetchProducts = useCallback(async (wh: Warehouse | null) => {
    setProductsLoading(true);
    try {
      const snap = await getDocs(collection(db, "products"));
      let data: Product[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));

      // If warehouse selected, try filtering by various field names
      if (wh && data.length > 0) {
        const fields = ["warehouseId", "skladId", "omborId", "warehouse_id", "sklad_id"];
        for (const field of fields) {
          const filtered = data.filter((p: any) => p[field] === wh.id);
          if (filtered.length > 0) { data = filtered; break; }
        }
        // If no match found by any field, show ALL products
      }

      setAllProducts(data);
    } catch (e) {
      console.error(e);
      showToast("Mahsulotlarni yuklashda xato", "err");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const fetchSales = useCallback(async () => {
    try {
      const q = query(collection(db, "sales"), orderBy("createdAt", "desc"), limit(50));
      const snap = await getDocs(q);
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    } catch (e) { console.error(e); }
  }, []);

  const fetchReport = useCallback(async () => {
    try {
      const { start, end } = todayRange();
      const q = query(collection(db, "sales"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end)
      );
      const snap = await getDocs(q);
      const daySales = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale));
      let total=0, cash=0, card=0, transfer=0, items=0;
      const pmap: Record<string,{name:string;qty:number;revenue:number}> = {};
      for (const s of daySales) {
        total += s.total;
        if (s.paymentMethod === "cash") cash += s.total;
        else if (s.paymentMethod === "card") card += s.total;
        else transfer += s.total;
        for (const it of s.items || []) {
          items += it.quantity;
          if (!pmap[it.id]) pmap[it.id] = { name: it.name, qty: 0, revenue: 0 };
          pmap[it.id].qty += it.quantity;
          pmap[it.id].revenue += it.subtotal;
        }
      }
      setReport({
        totalRevenue: total, cashRevenue: cash, cardRevenue: card,
        transferRevenue: transfer, salesCount: daySales.length, itemsSold: items,
        topProducts: Object.values(pmap).sort((a,b) => b.revenue - a.revenue).slice(0, 5),
      });
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchWarehouses(); fetchSales(); fetchReport(); }, []);
  useEffect(() => { fetchProducts(activeWh); }, [activeWh]);

  const selectWarehouse = (wh: Warehouse) => {
    if (activeWh?.id !== wh.id) { setCart([]); setCashGiven(0); }
    setActiveWh(wh);
    setShowWhModal(false);
    showToast(`${wh.name} tanlandi`);
  };

  // ─── Cart logic ───
  const addToCart = (p: Product) => {
    if (p.stock <= 0) return;
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) {
        if (ex.quantity >= p.stock) { showToast("Omborda yetarli emas", "err"); return prev; }
        return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity+1 } : i);
      }
      return [...prev, { ...p, quantity: 1, customPrice: p.price }];
    });
  };
  const removeFromCart = (id: string) => setCart(p => p.filter(i => i.id !== id));
  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart(p => p.map(i => i.id === id ? { ...i, quantity: Math.min(qty, i.stock) } : i));
  };
  const clearCart = () => { setCart([]); setCashGiven(0); };

  const total = cart.reduce((s, i) => s + i.customPrice * i.quantity, 0);
  const change = cashGiven - total;

  const openCustomPrice = (item: CartItem) => { setCustomPriceItem(item); setTempPrice(String(item.customPrice)); };
  const applyCustomPrice = () => {
    if (!customPriceItem) return;
    const p = parseFloat(tempPrice);
    if (isNaN(p) || p < 0) return;
    setCart(prev => prev.map(i => i.id === customPriceItem.id ? { ...i, customPrice: p } : i));
    setCustomPriceItem(null); setTempPrice("");
  };

  // ─── Checkout ───
  const handleCheckout = async () => {
    if (!cart.length) return;
    if (payMethod === "cash" && cashGiven < total) { showToast("Naqd pul yetarli emas!", "err"); return; }
    setLoading(true);
    try {
      const saleData = {
        items: cart.map(i => ({
          id: i.id, name: i.name, price: i.customPrice,
          originalPrice: i.price, quantity: i.quantity,
          subtotal: i.customPrice * i.quantity,
        })),
        total, paymentMethod: payMethod,
        cashGiven: payMethod === "cash" ? cashGiven : total,
        change: payMethod === "cash" ? Math.max(0, change) : 0,
        cashierName: user?.displayName || user?.email || "Cashier",
        cashierId: user?.uid || "",
        warehouseId: activeWh?.id || "default",
        warehouseName: activeWh?.name || "",
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "sales"), saleData);
      await Promise.all(
        cart.map(i => updateDoc(doc(db, "products", i.id), { stock: increment(-i.quantity) }))
      );
      setLastSale({ id: ref.id, ...saleData } as any);
      setShowReceipt(true);
      showToast("Sotuv muvaffaqiyatli amalga oshirildi!");
      clearCart();
      fetchProducts(activeWh);
      fetchSales();
      fetchReport();
    } catch (e) {
      console.error(e);
      showToast("Xatolik yuz berdi!", "err");
    } finally { setLoading(false); }
  };

  // ─── Filters ───
  const categories = ["all", ...Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)))];
  const filtered = allProducts.filter(p => {
    const ms = p.name?.toLowerCase().includes(search.toLowerCase());
    const mc = selectedCat === "all" || p.category === selectedCat;
    return ms && mc;
  });

  const TABS: {key:TabType;label:string}[] = [
    {key:"pos",      label:"Sotuv"},
    {key:"history",  label:"Tarix"},
    {key:"payments", label:"To'lovlar"},
    {key:"report",   label:"Hisobot"},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        :root {
          --bg:#f0f2f7;
          --surface:#ffffff;
          --sidebar:#1c2032;
          --sidebar2:#242840;
          --border:#e4e7ef;
          --border2:#c9cfe0;
          --text:#0f1523;
          --text2:#374151;
          --muted:#8993ab;
          --accent:#4f46e5;
          --accent2:#4338ca;
          --accentbg:#eef2ff;
          --success:#22c55e;
          --danger:#ef4444;
          --warn:#f59e0b;
          --r:12px;
          --rs:8px;
        }
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg)}

        .root{min-height:100vh;background:var(--bg);color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;display:flex;flex-direction:column}

        /* TOPBAR */
        .topbar{height:54px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 18px;gap:14px;position:sticky;top:0;z-index:100;flex-shrink:0}
        .logo{display:flex;align-items:center;gap:9px;margin-right:4px;flex-shrink:0}
        .logo-icon{width:34px;height:34px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:#fff;letter-spacing:-.5px}
        .logo-text{font-size:16px;font-weight:800;color:var(--text);letter-spacing:-.4px}

        .tab-nav{display:flex;gap:2px;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:3px;flex-shrink:0}
        .tab-btn{padding:6px 16px;border-radius:7px;border:none;background:transparent;color:var(--muted);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
        .tab-btn:hover{color:var(--text);background:rgba(0,0,0,.04)}
        .tab-btn.active{background:var(--surface);color:var(--accent);box-shadow:0 1px 4px rgba(0,0,0,.1)}

        .wh-pill{display:flex;align-items:center;gap:7px;padding:6px 14px 6px 10px;background:var(--accentbg);border:1.5px solid #c7d2fe;border-radius:20px;cursor:pointer;transition:all .15s;margin-left:auto;white-space:nowrap;flex-shrink:0}
        .wh-pill:hover{border-color:var(--accent);background:#e0e7ff}
        .wh-pill-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0}
        .wh-pill-name{font-size:12px;font-weight:700;color:var(--accent);max-width:160px;overflow:hidden;text-overflow:ellipsis}
        .wh-pill-arrow{font-size:10px;color:var(--accent)}
        .topbar-user{font-size:12px;font-weight:600;color:var(--muted);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0}

        /* TOAST */
        .toast{position:fixed;top:62px;left:50%;transform:translateX(-50%);z-index:999;padding:10px 22px;border-radius:20px;font-size:13px;font-weight:700;animation:toastIn .2s ease;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.12)}
        .toast.ok{background:#dcfce7;color:#15803d;border:1px solid #bbf7d0}
        .toast.err{background:#fee2e2;color:#dc2626;border:1px solid #fecaca}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

        /* POS */
        .pos-layout{display:flex;flex:1;height:calc(100vh - 54px);overflow:hidden}

        /* Products panel */
        .products-panel{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}

        .products-toolbar{padding:12px 14px;display:flex;flex-direction:column;gap:9px;background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0}

        .wh-bar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--accentbg);border:1px solid #c7d2fe;border-radius:var(--rs);cursor:pointer;transition:border-color .15s}
        .wh-bar:hover{border-color:var(--accent)}
        .wh-bar-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0}
        .wh-bar-label{font-size:10px;color:#818cf8;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
        .wh-bar-name{font-size:13px;font-weight:700;color:var(--accent);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .wh-bar-count{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;color:#818cf8;background:#e0e7ff;padding:2px 8px;border-radius:20px}
        .wh-bar-change{font-size:11px;font-weight:700;color:var(--accent);white-space:nowrap}

        .search-wrap{position:relative}
        .search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:13px;pointer-events:none}
        .search-input{width:100%;background:var(--bg);border:1.5px solid var(--border);border-radius:var(--rs);padding:9px 12px 9px 34px;color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;outline:none;transition:border-color .15s}
        .search-input::placeholder{color:var(--muted)}
        .search-input:focus{border-color:var(--accent);background:#fff}

        .cats{display:flex;gap:5px;flex-wrap:wrap}
        .cat-pill{padding:4px 12px;border-radius:20px;border:1.5px solid var(--border);background:transparent;color:var(--muted);font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;text-transform:uppercase;letter-spacing:.4px}
        .cat-pill:hover{color:var(--text);border-color:var(--border2)}
        .cat-pill.active{background:var(--accent);border-color:var(--accent);color:#fff}

        .products-grid{flex:1;overflow-y:auto;padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;align-content:start}
        .products-grid::-webkit-scrollbar{width:4px}
        .products-grid::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

        .prod-card{background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r);padding:12px;cursor:pointer;transition:all .15s;text-align:left;display:flex;flex-direction:column;gap:7px;position:relative;overflow:hidden}
        .prod-card:hover{border-color:var(--accent);box-shadow:0 0 0 3px rgba(79,70,229,.08);transform:translateY(-1px)}
        .prod-card:active{transform:scale(.97)}
        .prod-card.out{opacity:.4;cursor:not-allowed;filter:grayscale(1)}

        .prod-img{width:100%;aspect-ratio:1;background:linear-gradient(135deg,#eef2ff,#f5f3ff);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:26px;border:1px solid #e0e7ff}
        .prod-name{font-size:12px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .prod-price{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:var(--accent)}
        .prod-stock{font-size:10px;font-weight:600;color:var(--muted);font-family:'JetBrains Mono',monospace}
        .prod-stock.low{color:var(--danger)}
        .prod-stock.gone{color:var(--danger)}

        .prod-cart-badge{position:absolute;top:7px;right:7px;width:18px;height:18px;background:var(--accent);border-radius:50%;font-size:10px;font-weight:800;color:#fff;display:flex;align-items:center;justify-content:center}

        .skeleton{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:shimmer 1.2s infinite;border-radius:7px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

        .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--muted);padding:60px 20px;text-align:center;gap:8px;font-size:13px;font-weight:500;grid-column:1/-1}
        .empty-icon{font-size:38px;opacity:.4}

        /* CART PANEL */
        .cart-panel{width:330px;background:var(--sidebar);display:flex;flex-direction:column;flex-shrink:0}

        .cart-header{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .cart-title-row{display:flex;align-items:center;gap:8px}
        .cart-title{font-size:14px;font-weight:800;color:#f1f5f9;letter-spacing:-.3px}
        .cart-badge{background:var(--accent);color:#fff;font-size:10px;font-weight:800;min-width:20px;height:20px;padding:0 5px;border-radius:10px;display:flex;align-items:center;justify-content:center}
        .cart-clear-btn{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.2);border-radius:6px;padding:4px 10px;color:#fca5a5;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s}
        .cart-clear-btn:hover{background:rgba(239,68,68,.22)}

        .cart-list{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px}
        .cart-list::-webkit-scrollbar{width:3px}
        .cart-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}

        .cart-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:rgba(255,255,255,.2);padding:40px 20px;text-align:center}
        .cart-empty-icon{font-size:38px}
        .cart-empty-text{font-size:12px;font-weight:600}

        .cart-item{background:var(--sidebar2);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px}

        .ci-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
        .ci-name{font-size:12px;font-weight:700;color:#f1f5f9;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ci-remove{width:18px;height:18px;background:rgba(239,68,68,.12);border:none;border-radius:4px;color:#fca5a5;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .ci-remove:hover{background:rgba(239,68,68,.25)}

        .ci-price-btn{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:5px 8px;display:flex;align-items:center;gap:6px;cursor:pointer;transition:border-color .15s;width:100%}
        .ci-price-btn:hover{border-color:rgba(79,70,229,.5)}
        .ci-price-main{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:#a5b4fc}
        .ci-price-orig{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,.25);text-decoration:line-through}
        .ci-price-edit{margin-left:auto;font-size:10px;color:rgba(255,255,255,.25)}

        .ci-bottom{display:flex;align-items:center;justify-content:space-between}
        .qty-ctrl{display:flex;align-items:center;gap:6px}
        .qty-btn{width:26px;height:26px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:6px;color:#f1f5f9;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .1s;line-height:1;font-family:monospace}
        .qty-btn:hover{background:rgba(79,70,229,.2);border-color:rgba(79,70,229,.4)}
        .qty-val{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;width:24px;text-align:center;color:#f1f5f9}
        .ci-subtotal{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#f1f5f9}

        /* Payment section */
        .payment-section{padding:14px;border-top:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;gap:10px;flex-shrink:0}
        .total-row{display:flex;align-items:baseline;justify-content:space-between}
        .total-label{font-size:10px;font-weight:700;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.7px}
        .total-amount{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:#f1f5f9;letter-spacing:-.5px}

        .pay-methods{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
        .pay-btn{padding:8px 4px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:rgba(255,255,255,.4);font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:3px}
        .pay-btn:hover{color:#f1f5f9;background:rgba(255,255,255,.08)}
        .pay-btn-icon{font-size:14px}

        .cash-section{display:flex;flex-direction:column;gap:6px}
        .num-input{width:100%;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);border-radius:8px;padding:10px 12px;color:#f1f5f9;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:600;outline:none;transition:border-color .15s}
        .num-input:focus{border-color:rgba(79,70,229,.6)}
        .num-input::placeholder{color:rgba(255,255,255,.2);font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:400}

        .change-row{display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-radius:7px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700}
        .change-row.pos{background:rgba(34,197,94,.1);color:#4ade80;border:1px solid rgba(34,197,94,.2)}
        .change-row.neg{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)}

        .quick-amounts{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
        .quick-amt{padding:6px 4px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:6px;color:rgba(255,255,255,.4);font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;cursor:pointer;transition:all .12s;text-align:center}
        .quick-amt:hover{border-color:rgba(79,70,229,.4);color:#a5b4fc;background:rgba(79,70,229,.1)}

        .checkout-btn{width:100%;padding:14px;background:var(--accent);border:none;border-radius:10px;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:800;cursor:pointer;transition:all .15s;letter-spacing:-.2px}
        .checkout-btn:hover{background:var(--accent2);transform:translateY(-1px);box-shadow:0 4px 20px rgba(79,70,229,.4)}
        .checkout-btn:active{transform:translateY(0)}
        .checkout-btn:disabled{background:rgba(255,255,255,.06);color:rgba(255,255,255,.2);cursor:not-allowed;transform:none;box-shadow:none}

        /* PAGE CONTENT */
        .page{flex:1;overflow-y:auto;padding:22px 24px;max-width:1100px;width:100%;margin:0 auto}
        .page::-webkit-scrollbar{width:4px}
        .page::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

        .page-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
        .page-title{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-.5px}
        .refresh-btn{padding:7px 16px;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--rs);color:var(--muted);font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s}
        .refresh-btn:hover{color:var(--accent);border-color:var(--accent);background:var(--accentbg)}

        .kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:20px}
        .kpi-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px}
        .kpi-label{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
        .kpi-val{font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700}

        .sale-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px;margin-bottom:10px;transition:border-color .15s}
        .sale-card:hover{border-color:var(--border2)}
        .sc-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
        .sc-id{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted)}
        .sc-date{font-size:11px;color:var(--muted);margin-top:3px}
        .sc-cashier{font-size:11px;color:var(--text2);margin-top:2px;font-weight:600}
        .sc-total{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:var(--accent)}

        .pay-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;border:1px solid;font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:.2px;margin-top:5px}
        .sc-items{border-top:1px solid var(--border);padding-top:10px;display:flex;flex-direction:column;gap:4px}
        .sc-item-row{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);font-family:'JetBrains Mono',monospace}

        .pay-sum-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px}
        .pay-sum-card{border-radius:var(--r);border:1px solid;padding:16px}
        .pay-sum-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
        .pay-sum-val{font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700}

        .bar-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:18px;margin-bottom:12px}
        .bar-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:14px}
        .bar-track{height:10px;background:var(--bg);border-radius:5px;overflow:hidden;display:flex;gap:2px}
        .bar-seg{height:100%;border-radius:3px}
        .bar-legend{display:flex;gap:16px;margin-top:10px;flex-wrap:wrap}
        .bar-legend-item{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);font-weight:600}
        .bar-dot{width:8px;height:8px;border-radius:50%}

        .top-row{display:flex;align-items:center;gap:12px;margin-bottom:12px}
        .top-rank{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--muted);width:20px;flex-shrink:0}
        .top-info{flex:1}
        .top-name-row{display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:var(--text);margin-bottom:5px}
        .top-qty{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);font-weight:400}
        .top-bar{height:4px;background:var(--bg);border-radius:2px}
        .top-bar-fill{height:100%;background:var(--accent);border-radius:2px}
        .top-revenue{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent);margin-top:4px}

        /* MODALS */
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:200;padding:16px;backdrop-filter:blur(4px);animation:fadeIn .15s ease}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}

        .wh-modal{background:var(--surface);border:1px solid var(--border);border-radius:20px;width:100%;max-width:480px;overflow:hidden;animation:slideUp .2s ease;box-shadow:0 20px 60px rgba(0,0,0,.15)}
        .wh-modal-hdr{padding:20px 20px 16px;border-bottom:1px solid var(--border)}
        .wh-modal-title{font-size:17px;font-weight:800;color:var(--text);letter-spacing:-.4px;margin-bottom:4px}
        .wh-modal-sub{font-size:12px;color:var(--muted)}

        .wh-list{padding:12px;display:flex;flex-direction:column;gap:6px;max-height:380px;overflow-y:auto}
        .wh-list::-webkit-scrollbar{width:3px}
        .wh-list::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

        .wh-item{display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bg);border:1.5px solid var(--border);border-radius:var(--r);cursor:pointer;transition:all .15s;font-family:'Plus Jakarta Sans',sans-serif;text-align:left;width:100%}
        .wh-item:hover{border-color:var(--accent);background:var(--accentbg)}
        .wh-item.selected{border-color:var(--accent);background:var(--accentbg)}

        .wh-item-icon{width:42px;height:42px;border-radius:10px;background:#eef2ff;border:1px solid #c7d2fe;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
        .wh-item-info{flex:1;min-width:0}
        .wh-item-name{font-size:14px;font-weight:700;color:var(--text)}
        .wh-item.selected .wh-item-name{color:var(--accent)}
        .wh-item-addr{font-size:11px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

        .wh-item-check{width:22px;height:22px;border-radius:50%;border:2px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;transition:all .15s}
        .wh-item.selected .wh-item-check{background:var(--accent);border-color:var(--accent);color:#fff}

        .wh-modal-footer{padding:12px 20px;border-top:1px solid var(--border)}
        .cancel-btn{width:100%;padding:10px;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;color:var(--muted);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s}
        .cancel-btn:hover{color:var(--text);border-color:var(--border2)}

        .modal-box{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:22px;width:100%;max-width:340px;animation:slideUp .2s ease;box-shadow:0 20px 60px rgba(0,0,0,.15)}
        .modal-title{font-size:16px;font-weight:800;color:var(--text);letter-spacing:-.3px;margin-bottom:4px}
        .modal-sub{font-size:12px;color:var(--muted);margin-bottom:14px}
        .light-input{width:100%;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:12px 14px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700;outline:none;transition:border-color .15s}
        .light-input:focus{border-color:var(--accent)}
        .light-input::placeholder{color:var(--muted);font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;font-weight:400}
        .modal-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}
        .m-cancel{padding:11px;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;color:var(--muted);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s}
        .m-cancel:hover{color:var(--text);border-color:var(--border2)}
        .m-confirm{padding:11px;background:var(--accent);border:none;border-radius:10px;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:800;cursor:pointer;transition:opacity .15s}
        .m-confirm:hover{opacity:.9}

        .receipt-box{background:#fff;border-radius:18px;padding:22px;width:100%;max-width:310px;animation:slideUp .2s ease;box-shadow:0 20px 60px rgba(0,0,0,.15);border:1px solid #e5e7eb}
        .r-hdr{text-align:center;margin-bottom:16px}
        .r-icon{font-size:40px;margin-bottom:6px}
        .r-title{font-size:17px;font-weight:800;color:#111;letter-spacing:-.4px}
        .r-id{font-family:'JetBrains Mono',monospace;font-size:10px;color:#9ca3af;margin-top:3px}
        .r-cashier{font-size:11px;color:#9ca3af;margin-top:2px}
        .r-wh{font-size:11px;color:#6366f1;margin-top:3px;font-weight:700}
        .r-divider{border:none;border-top:1.5px dashed #e5e7eb;margin:12px 0}
        .r-row{display:flex;justify-content:space-between;font-size:12px;color:#374151;margin-bottom:5px}
        .r-row.bold{font-weight:800;font-size:16px;color:#111;margin-top:2px}
        .r-row.muted{color:#9ca3af}
        .r-thanks{text-align:center;font-size:11px;color:#d1d5db;margin-top:12px}
        .r-close{width:100%;margin-top:16px;padding:12px;background:#111827;color:#fff;border:none;border-radius:10px;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:800;cursor:pointer}
        .r-close:hover{background:#374151}
      `}</style>

      <div className="root">
        {/* ── TOPBAR ── */}
        <header className="topbar">
          <div className="logo">
            <div className="logo-icon">K</div>
            <span className="logo-text">Kassa</span>
          </div>

          <nav className="tab-nav">
            {TABS.map(t => (
              <button key={t.key} className={`tab-btn${tab===t.key?" active":""}`} onClick={()=>setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </nav>

          <button className="wh-pill" onClick={()=>setShowWhModal(true)}>
            <span className="wh-pill-dot"/>
            <span className="wh-pill-name">
              {whLoading ? "Yuklanmoqda…" : activeWh ? activeWh.name : "Ombor tanlang"}
            </span>
            <span className="wh-pill-arrow">▾</span>
          </button>

          <div className="topbar-user">{user?.displayName||user?.email||"Cashier"}</div>
        </header>

        {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

        {/* ══════ POS ══════ */}
        {tab==="pos" && (
          <div className="pos-layout">
            <div className="products-panel">
              <div className="products-toolbar">
                <div className="wh-bar" onClick={()=>setShowWhModal(true)}>
                  <span className="wh-bar-dot"/>
                  <span className="wh-bar-label">Ombor</span>
                  <span className="wh-bar-name">{activeWh ? activeWh.name : "Tanlanmagan"}</span>
                  {allProducts.length>0 && <span className="wh-bar-count">{allProducts.length} ta</span>}
                  <span className="wh-bar-change">O'zgartirish ▾</span>
                </div>
                <div className="search-wrap">
                  <span className="search-icon">🔍</span>
                  <input className="search-input" placeholder="Mahsulot qidirish…" value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <div className="cats">
                  {categories.map(c=>(
                    <button key={c} className={`cat-pill${selectedCat===c?" active":""}`} onClick={()=>setSelectedCat(c)}>
                      {c==="all"?"Barchasi":c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="products-grid">
                {productsLoading
                  ? Array.from({length:12}).map((_,i)=>(
                      <div key={i} className="prod-card" style={{cursor:"default"}}>
                        <div className="skeleton" style={{width:"100%",aspectRatio:"1",borderRadius:8}}/>
                        <div className="skeleton" style={{height:12,borderRadius:4}}/>
                        <div className="skeleton" style={{height:10,width:"60%",borderRadius:4}}/>
                      </div>
                    ))
                  : filtered.length===0
                  ? <div className="empty-state"><div className="empty-icon">📦</div><div>Mahsulot topilmadi</div></div>
                  : filtered.map(p=>{
                      const inCart = cart.find(i=>i.id===p.id);
                      return (
                        <button key={p.id} className={`prod-card${p.stock<=0?" out":""}`} onClick={()=>addToCart(p)} disabled={p.stock<=0}>
                          {inCart && <span className="prod-cart-badge">{inCart.quantity}</span>}
                          <div className="prod-img">📦</div>
                          <div className="prod-name">{p.name}</div>
                          <div className="prod-price">{fmt(p.price)}</div>
                          <div className={`prod-stock${p.stock<=0?" gone":p.stock<=5?" low":""}`}>
                            {p.stock<=0 ? "Tugagan" : `Qoldi: ${p.stock}`}
                          </div>
                        </button>
                      );
                    })}
              </div>
            </div>

            {/* CART */}
            <div className="cart-panel">
              <div className="cart-header">
                <div className="cart-title-row">
                  <span className="cart-title">Savat</span>
                  {cart.length>0 && <span className="cart-badge">{cart.length}</span>}
                </div>
                {cart.length>0 && <button className="cart-clear-btn" onClick={clearCart}>Tozalash</button>}
              </div>

              <div className="cart-list">
                {cart.length===0
                  ? <div className="cart-empty"><div className="cart-empty-icon">🛒</div><div className="cart-empty-text">Savat bo'sh</div></div>
                  : cart.map(item=>(
                    <div key={item.id} className="cart-item">
                      <div className="ci-top">
                        <span className="ci-name">{item.name}</span>
                        <button className="ci-remove" onClick={()=>removeFromCart(item.id)}>✕</button>
                      </div>
                      <button className="ci-price-btn" onClick={()=>openCustomPrice(item)}>
                        <span className="ci-price-main">{fmt(item.customPrice)}</span>
                        {item.customPrice!==item.price && <span className="ci-price-orig">{fmt(item.price)}</span>}
                        <span className="ci-price-edit">✏</span>
                      </button>
                      <div className="ci-bottom">
                        <div className="qty-ctrl">
                          <button className="qty-btn" onClick={()=>updateQty(item.id,item.quantity-1)}>−</button>
                          <span className="qty-val">{item.quantity}</span>
                          <button className="qty-btn" onClick={()=>updateQty(item.id,item.quantity+1)}>+</button>
                        </div>
                        <span className="ci-subtotal">{fmt(item.customPrice*item.quantity)}</span>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="payment-section">
                <div className="total-row">
                  <span className="total-label">Jami to'lov</span>
                  <span className="total-amount">{fmt(total)}</span>
                </div>

                <div className="pay-methods">
                  {(Object.entries(PAY_CONFIG) as [PayMethod,typeof PAY_CONFIG.cash][]).map(([key,cfg])=>(
                    <button key={key} className="pay-btn"
                      style={payMethod===key?{background:cfg.bg,borderColor:cfg.border,color:cfg.color}:{}}
                      onClick={()=>setPayMethod(key)}
                    >
                      <span className="pay-btn-icon">{cfg.icon}</span>
                      {cfg.label}
                    </button>
                  ))}
                </div>

                {payMethod==="cash" && (
                  <div className="cash-section">
                    <input className="num-input" type="number" placeholder="Berilgan pul miqdori"
                      value={cashGiven||""} onChange={e=>setCashGiven(Number(e.target.value))}/>
                    {cashGiven>0 && (
                      <div className={`change-row ${change>=0?"pos":"neg"}`}>
                        <span>Qaytim:</span>
                        <span>{fmt(Math.max(0,change))}</span>
                      </div>
                    )}
                    <div className="quick-amounts">
                      {[10000,20000,50000,100000,200000,500000].map(a=>(
                        <button key={a} className="quick-amt" onClick={()=>setCashGiven(a)}>{a/1000}K</button>
                      ))}
                    </div>
                  </div>
                )}

                <button className="checkout-btn" onClick={handleCheckout}
                  disabled={loading||cart.length===0||(payMethod==="cash"&&cashGiven<total)}>
                  {loading ? "Amalga oshirilmoqda…" : cart.length===0 ? "Savat bo'sh" : `✓ To'lash — ${fmt(total)}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════ HISTORY ══════ */}
        {tab==="history" && (
          <div className="page">
            <div className="page-hdr">
              <div className="page-title">So'nggi sotuvlar</div>
              <button className="refresh-btn" onClick={fetchSales}>↻ Yangilash</button>
            </div>
            {sales.length===0
              ? <div className="empty-state" style={{gridColumn:"unset"}}><div className="empty-icon">📋</div><div>Sotuvlar yo'q</div></div>
              : sales.map(sale=>(
                <div key={sale.id} className="sale-card">
                  <div className="sc-top">
                    <div>
                      <div className="sc-id">#{sale.id.slice(-10)}</div>
                      <div className="sc-date">{fmtDate(sale.createdAt)}</div>
                      <div className="sc-cashier">{sale.cashierName}</div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:5}}>
                        <div className="pay-badge" style={{color:PAY_CONFIG[sale.paymentMethod]?.color||"#888",background:PAY_CONFIG[sale.paymentMethod]?.bg,borderColor:PAY_CONFIG[sale.paymentMethod]?.border}}>
                          {PAY_CONFIG[sale.paymentMethod]?.icon} {PAY_CONFIG[sale.paymentMethod]?.label}
                        </div>
                        {sale.warehouseName && (
                          <span style={{fontSize:10,color:"#6366f1",background:"#eef2ff",border:"1px solid #c7d2fe",borderRadius:20,padding:"3px 8px",fontWeight:700}}>
                            🏪 {sale.warehouseName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="sc-total">{fmt(sale.total)}</div>
                  </div>
                  <div className="sc-items">
                    {sale.items?.map((it,i)=>(
                      <div key={i} className="sc-item-row"><span>{it.name} × {it.quantity}</span><span>{fmt(it.subtotal)}</span></div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ══════ PAYMENTS ══════ */}
        {tab==="payments" && (
          <div className="page">
            <div className="page-hdr">
              <div className="page-title">To'lovlar ro'yxati</div>
              <button className="refresh-btn" onClick={fetchSales}>↻ Yangilash</button>
            </div>
            <div className="pay-sum-grid">
              {(Object.entries(PAY_CONFIG) as [PayMethod,typeof PAY_CONFIG.cash][]).map(([key,cfg])=>{
                const val = sales.filter(s=>s.paymentMethod===key).reduce((a,s)=>a+s.total,0);
                return (
                  <div key={key} className="pay-sum-card" style={{background:cfg.bg,borderColor:cfg.border}}>
                    <div className="pay-sum-label" style={{color:cfg.color}}>{cfg.icon} {cfg.label}</div>
                    <div className="pay-sum-val" style={{color:cfg.color}}>{fmt(val)}</div>
                  </div>
                );
              })}
            </div>
            {sales.map(sale=>(
              <div key={sale.id} className="sale-card" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div className="sc-id">#{sale.id.slice(-10)}</div>
                  <div className="sc-date">{fmtDate(sale.createdAt)}</div>
                  <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{sale.items?.length} ta mahsulot</div>
                  {sale.warehouseName && <div style={{fontSize:10,color:"#6366f1",marginTop:4,fontWeight:700}}>🏪 {sale.warehouseName}</div>}
                  {sale.paymentMethod==="cash"&&sale.change!==undefined&&(
                    <div style={{fontSize:10,color:"#9ca3af",marginTop:2,fontFamily:"'JetBrains Mono',monospace"}}>Qaytim: {fmt(sale.change)}</div>
                  )}
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="sc-total">{fmt(sale.total)}</div>
                  <div className="pay-badge" style={{color:PAY_CONFIG[sale.paymentMethod]?.color||"#888",background:PAY_CONFIG[sale.paymentMethod]?.bg,borderColor:PAY_CONFIG[sale.paymentMethod]?.border}}>
                    {PAY_CONFIG[sale.paymentMethod]?.icon} {PAY_CONFIG[sale.paymentMethod]?.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════ REPORT ══════ */}
        {tab==="report" && (
          <div className="page">
            <div className="page-hdr">
              <div className="page-title">Kunlik hisobot</div>
              <button className="refresh-btn" onClick={fetchReport}>↻ Yangilash</button>
            </div>

            <div className="kpi-grid">
              {[
                {label:"Jami daromad",  value:fmt(report.totalRevenue),   color:"#4f46e5"},
                {label:"Sotuvlar",      value:report.salesCount+" ta",     color:"#6366f1"},
                {label:"Sotilgan dona", value:report.itemsSold+" dona",    color:"#8b5cf6"},
                {label:"Naqd",          value:fmt(report.cashRevenue),     color:"#22c55e"},
                {label:"Karta",         value:fmt(report.cardRevenue),     color:"#6366f1"},
                {label:"O'tkazma",      value:fmt(report.transferRevenue), color:"#f59e0b"},
              ].map(k=>(
                <div key={k.label} className="kpi-card">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-val" style={{color:k.color}}>{k.value}</div>
                </div>
              ))}
            </div>

            {report.totalRevenue>0 && (
              <div className="bar-card">
                <div className="bar-title">To'lov usullari taqsimoti</div>
                <div className="bar-track">
                  {report.cashRevenue>0 && <div className="bar-seg" style={{width:`${(report.cashRevenue/report.totalRevenue)*100}%`,background:"#22c55e"}}/>}
                  {report.cardRevenue>0 && <div className="bar-seg" style={{width:`${(report.cardRevenue/report.totalRevenue)*100}%`,background:"#6366f1"}}/>}
                  {report.transferRevenue>0 && <div className="bar-seg" style={{width:`${(report.transferRevenue/report.totalRevenue)*100}%`,background:"#f59e0b"}}/>}
                </div>
                <div className="bar-legend">
                  {[["#22c55e","Naqd"],["#6366f1","Karta"],["#f59e0b","O'tkazma"]].map(([c,l])=>(
                    <div key={l} className="bar-legend-item"><div className="bar-dot" style={{background:c}}/>{l}</div>
                  ))}
                </div>
              </div>
            )}

            {report.topProducts.length>0 && (
              <div className="bar-card">
                <div className="bar-title">🏆 Eng ko'p sotilgan mahsulotlar</div>
                {report.topProducts.map((p,i)=>(
                  <div key={i} className="top-row">
                    <span className="top-rank">#{i+1}</span>
                    <div className="top-info">
                      <div className="top-name-row">
                        <span>{p.name}</span>
                        <span className="top-qty">{p.qty} dona</span>
                      </div>
                      <div className="top-bar">
                        <div className="top-bar-fill" style={{width:`${(p.revenue/report.topProducts[0].revenue)*100}%`}}/>
                      </div>
                      <div className="top-revenue">{fmt(p.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {report.salesCount===0 && <div className="empty-state" style={{gridColumn:"unset"}}><div className="empty-icon">📊</div><div>Bugun sotuvlar yo'q</div></div>}
          </div>
        )}

        {/* ══════ WAREHOUSE MODAL ══════ */}
        {showWhModal && (
          <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowWhModal(false)}}>
            <div className="wh-modal">
              <div className="wh-modal-hdr">
                <div className="wh-modal-title">Ombor tanlang</div>
                <div className="wh-modal-sub">Sotuv qaysi ombordan amalga oshirilishini belgilang</div>
              </div>
              <div className="wh-list">
                {warehouses.length===0
                  ? <div className="empty-state" style={{padding:"30px 0",gridColumn:"unset"}}><div className="empty-icon">🏪</div><div>Omborlar topilmadi</div></div>
                  : warehouses.map(wh=>{
                      const isSel = activeWh?.id===wh.id;
                      return (
                        <button key={wh.id} className={`wh-item${isSel?" selected":""}`} onClick={()=>selectWarehouse(wh)}>
                          <div className="wh-item-icon">🏪</div>
                          <div className="wh-item-info">
                            <div className="wh-item-name">{wh.name}</div>
                            {wh.address && <div className="wh-item-addr">{wh.address}</div>}
                            {wh.phone && <div className="wh-item-addr">📞 {wh.phone}</div>}
                          </div>
                          <div className="wh-item-check">{isSel?"✓":""}</div>
                        </button>
                      );
                    })}
              </div>
              <div className="wh-modal-footer">
                <button className="cancel-btn" onClick={()=>setShowWhModal(false)}>Bekor qilish</button>
              </div>
            </div>
          </div>
        )}

        {/* ══════ CUSTOM PRICE MODAL ══════ */}
        {customPriceItem && (
          <div className="overlay" onClick={e=>{if(e.target===e.currentTarget){setCustomPriceItem(null);setTempPrice("")}}}>
            <div className="modal-box">
              <div className="modal-title">Narxni o'zgartirish</div>
              <div className="modal-sub">{customPriceItem.name} · Asl: {fmt(customPriceItem.price)}</div>
              <input className="light-input" type="number" value={tempPrice}
                onChange={e=>setTempPrice(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&applyCustomPrice()}
                placeholder="Yangi narx (so'm)" autoFocus/>
              <div className="modal-btns">
                <button className="m-cancel" onClick={()=>{setCustomPriceItem(null);setTempPrice("")}}>Bekor</button>
                <button className="m-confirm" onClick={applyCustomPrice}>Saqlash</button>
              </div>
            </div>
          </div>
        )}

        {/* ══════ RECEIPT MODAL ══════ */}
        {showReceipt && lastSale && (
          <div className="overlay">
            <div className="receipt-box">
              <div className="r-hdr">
                <div className="r-icon">🧾</div>
                <div className="r-title">Chek</div>
                <div className="r-id">#{lastSale.id?.slice(-10)}</div>
                <div className="r-cashier">{lastSale.cashierName}</div>
                {lastSale.warehouseName && <div className="r-wh">🏪 {lastSale.warehouseName}</div>}
              </div>
              <hr className="r-divider"/>
              {lastSale.items?.map((it:any,i:number)=>(
                <div key={i} className="r-row"><span>{it.name} × {it.quantity}</span><span>{fmt(it.subtotal)}</span></div>
              ))}
              <hr className="r-divider"/>
              <div className="r-row bold"><span>Jami:</span><span>{fmt(lastSale.total)}</span></div>
              <div className="r-row muted"><span>To'lov:</span><span>{PAY_CONFIG[lastSale.paymentMethod]?.label}</span></div>
              {lastSale.paymentMethod==="cash" && (
                <>
                  <div className="r-row muted"><span>Berildi:</span><span>{fmt((lastSale as any).cashGiven)}</span></div>
                  <div className="r-row bold"><span>Qaytim:</span><span>{fmt((lastSale as any).change)}</span></div>
                </>
              )}
              <div className="r-thanks">Xarid uchun rahmat! 🙏</div>
              <button className="r-close" onClick={()=>setShowReceipt(false)}>Yopish</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
