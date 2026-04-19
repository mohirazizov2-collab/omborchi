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
interface Warehouse { id: string; name: string; address?: string; phone?: string }
interface Product {
  id: string; name: string;
  price?: number; salePrice?: number; cost?: number; narx?: number; baho?: number;
  stock?: number; qoldiq?: number; miqdor?: number;
  category?: string; kategoriya?: string;
  warehouseId?: string; skladId?: string; omborId?: string;
  imageUrl?: string;
}
interface CartItem extends Product { quantity: number; customPrice: number }
interface SaleItem { id: string; name: string; price: number; originalPrice?: number; quantity: number; subtotal: number }
interface Sale {
  id: string; items: SaleItem[]; total: number;
  paymentMethod: "cash" | "card" | "transfer";
  cashierName: string; cashierId: string;
  warehouseId: string; warehouseName?: string;
  cashGiven?: number; change?: number; createdAt: any;
}
 
type TabType = "pos" | "history" | "payments" | "report";
type PayMethod = "cash" | "card" | "transfer";
 
// ============ UTILS ============
// Robust price extractor — fixes NaN
const getPrice = (p: Product): number => {
  const candidates = [p.salePrice, p.price, p.narx, p.baho, p.cost];
  for (const c of candidates) {
    const n = Number(c);
    if (!isNaN(n) && n > 0) return n;
  }
  return 0;
};
 
// Robust stock extractor — fixes NaN / "Tugagan" issues
const getStock = (p: Product): number => {
  const candidates = [p.stock, p.qoldiq, p.miqdor];
  for (const c of candidates) {
    const n = Number(c);
    if (!isNaN(n)) return n;
  }
  return 0;
};
 
const getCategory = (p: Product) => p.category || p.kategoriya || "Boshqa";
 
const fmt = (n: number) =>
  isNaN(n) ? "0 so'm" : new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";
 
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
  cash:     { label: "Naqd",     icon: "💵", color: "#10b981", bg: "rgba(16,185,129,.12)",  border: "rgba(16,185,129,.25)" },
  card:     { label: "Karta",    icon: "💳", color: "#6366f1", bg: "rgba(99,102,241,.12)", border: "rgba(99,102,241,.25)" },
  transfer: { label: "O'tkazma", icon: "🏦", color: "#f59e0b", bg: "rgba(245,158,11,.12)", border: "rgba(245,158,11,.25)" },
};
 
// Category colors
const CAT_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16"];
const catColor = (cat: string) => CAT_COLORS[Math.abs(cat.split("").reduce((a,c)=>a+c.charCodeAt(0),0)) % CAT_COLORS.length];
 
// ============ MAIN ============
export default function CashPage() {
  const { user } = useAuth();
 
  const [warehouses, setWarehouses]       = useState<Warehouse[]>([]);
  const [activeWh, setActiveWh]           = useState<Warehouse | null>(null);
  const [showWhModal, setShowWhModal]     = useState(false);
  const [whLoading, setWhLoading]         = useState(true);
 
  const [allProducts, setAllProducts]         = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [search, setSearch]                   = useState("");
  const [selectedCat, setSelectedCat]         = useState("all");
 
  const [cart, setCart]         = useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [cashGiven, setCashGiven] = useState(0);
 
  const [loading, setLoading]       = useState(false);
  const [toast, setToast]           = useState<{msg:string;type:"ok"|"err"}|null>(null);
  const [tab, setTab]               = useState<TabType>("pos");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale]       = useState<Sale|null>(null);
  const [customPriceItem, setCustomPriceItem] = useState<CartItem|null>(null);
  const [tempPrice, setTempPrice]             = useState("");
 
  const [sales, setSales] = useState<Sale[]>([]);
  const [report, setReport] = useState({
    totalRevenue: 0, cashRevenue: 0, cardRevenue: 0, transferRevenue: 0,
    salesCount: 0, itemsSold: 0,
    topProducts: [] as {name:string;qty:number;revenue:number}[],
  });
 
  // Inventory map: productId → stock in selected warehouse
  const [inventoryMap, setInventoryMap] = useState<Record<string, number>>({});
 
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const showToast = (msg: string, type: "ok"|"err" = "ok") => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };
 
  // ─── Fetch warehouses ───
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
            return { id: d.id, name: r.name || r.nomi || r.nom || d.id, address: r.address || r.manzil || "", phone: r.phone || r.telefon || "" };
          });
          break;
        }
      }
      setWarehouses(data);
      if (data.length > 0) setActiveWh(data[0]);
    } catch (e) { console.error(e); }
    finally { setWhLoading(false); }
  }, []);
 
  // ─── Fetch inventory for selected warehouse ───
  const fetchInventory = useCallback(async (wh: Warehouse | null) => {
    if (!wh) { setInventoryMap({}); return; }
    try {
      // Try "inventory" collection with warehouseId filter
      const invRef = collection(db, "inventory");
      const invSnap = await getDocs(query(invRef, where("warehouseId", "==", wh.id)));
      if (!invSnap.empty) {
        const map: Record<string, number> = {};
        invSnap.docs.forEach(d => {
          const data = d.data() as any;
          map[data.productId] = Number(data.stock || data.qoldiq || data.miqdor || 0);
        });
        setInventoryMap(map);
        return;
      }
      // Fallback: no separate inventory collection, use product fields
      setInventoryMap({});
    } catch (e) {
      setInventoryMap({});
    }
  }, []);
 
  // ─── Fetch products ───
  const fetchProducts = useCallback(async (wh: Warehouse | null) => {
    setProductsLoading(true);
    try {
      const snap = await getDocs(collection(db, "products"));
      let data: Product[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
 
      // Filter by warehouse if possible
      if (wh && data.length > 0) {
        const fields = ["warehouseId", "skladId", "omborId", "warehouse_id", "sklad_id"];
        for (const field of fields) {
          const filtered = data.filter((p: any) => p[field] === wh.id);
          if (filtered.length > 0) { data = filtered; break; }
        }
      }
 
      setAllProducts(data);
    } catch (e) {
      console.error(e);
      showToast("Mahsulotlarni yuklashda xato", "err");
    } finally { setProductsLoading(false); }
  }, []);
 
  // ─── Get effective stock for a product in selected warehouse ───
  const getEffectiveStock = useCallback((p: Product): number => {
    // First check inventory map (separate inventory collection)
    if (inventoryMap[p.id] !== undefined) return inventoryMap[p.id];
    // Fallback to product fields
    return getStock(p);
  }, [inventoryMap]);
 
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
      const q = query(collection(db, "sales"), where("createdAt", ">=", start), where("createdAt", "<=", end));
      const snap = await getDocs(q);
      const daySales = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale));
      let total=0,cash=0,card=0,transfer=0,items=0;
      const pmap: Record<string,{name:string;qty:number;revenue:number}> = {};
      for (const s of daySales) {
        total += s.total;
        if (s.paymentMethod==="cash") cash+=s.total;
        else if (s.paymentMethod==="card") card+=s.total;
        else transfer+=s.total;
        for (const it of s.items||[]) {
          items+=it.quantity;
          if (!pmap[it.id]) pmap[it.id]={name:it.name,qty:0,revenue:0};
          pmap[it.id].qty+=it.quantity;
          pmap[it.id].revenue+=it.subtotal;
        }
      }
      setReport({ totalRevenue:total,cashRevenue:cash,cardRevenue:card,transferRevenue:transfer,salesCount:daySales.length,itemsSold:items, topProducts:Object.values(pmap).sort((a,b)=>b.revenue-a.revenue).slice(0,5) });
    } catch (e) { console.error(e); }
  }, []);
 
  useEffect(() => { fetchWarehouses(); fetchSales(); fetchReport(); }, []);
  useEffect(() => { fetchProducts(activeWh); fetchInventory(activeWh); }, [activeWh]);
 
  const selectWarehouse = (wh: Warehouse) => {
    if (activeWh?.id !== wh.id) { setCart([]); setCashGiven(0); }
    setActiveWh(wh);
    setShowWhModal(false);
    showToast(`✓ ${wh.name} tanlandi`);
  };
 
  // ─── Cart logic ───
  const addToCart = (p: Product) => {
    const stock = getEffectiveStock(p);
    if (stock <= 0) return;
    const price = getPrice(p);
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) {
        if (ex.quantity >= stock) { showToast("Omborda yetarli emas!", "err"); return prev; }
        return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...p, quantity: 1, customPrice: price }];
    });
  };
 
  const removeFromCart = (id: string) => setCart(p => p.filter(i => i.id !== id));
  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart(p => p.map(i => {
      if (i.id !== id) return i;
      const stock = getEffectiveStock(i);
      return { ...i, quantity: Math.min(qty, stock) };
    }));
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
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.customPrice, originalPrice: getPrice(i), quantity: i.quantity, subtotal: i.customPrice * i.quantity })),
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
      await Promise.all(cart.map(i => updateDoc(doc(db, "products", i.id), { stock: increment(-i.quantity) })));
      setLastSale({ id: ref.id, ...saleData } as any);
      setShowReceipt(true);
      showToast("✓ Sotuv muvaffaqiyatli!");
      clearCart();
      fetchProducts(activeWh);
      fetchInventory(activeWh);
      fetchSales();
      fetchReport();
    } catch (e) { console.error(e); showToast("Xatolik yuz berdi!", "err"); }
    finally { setLoading(false); }
  };
 
  // ─── Filters — only show products WITH stock in selected warehouse ───
  const categories = ["all", ...Array.from(new Set(allProducts.map(p => getCategory(p)).filter(Boolean)))];
 
  const filtered = allProducts.filter(p => {
    const stock = getEffectiveStock(p);
    if (stock <= 0) return false; // ← faqat mavjud mahsulotlar
    const ms = p.name?.toLowerCase().includes(search.toLowerCase());
    const mc = selectedCat === "all" || getCategory(p) === selectedCat;
    return ms && mc;
  });
 
  const TABS: {key:TabType;label:string;icon:string}[] = [
    {key:"pos",label:"Sotuv",icon:"🛒"},
    {key:"history",label:"Tarix",icon:"📋"},
    {key:"payments",label:"To'lovlar",icon:"💳"},
    {key:"report",label:"Hisobot",icon:"📊"},
  ];
 
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
 
        :root {
          --bg: #0d0f17;
          --bg2: #141620;
          --surface: #1a1d2e;
          --surface2: #212438;
          --surface3: #272a3f;
          --border: rgba(255,255,255,.06);
          --border2: rgba(255,255,255,.12);
          --text: #f0f2ff;
          --text2: #a0a8cc;
          --muted: #5c6494;
          --accent: #6366f1;
          --accent2: #818cf8;
          --accentbg: rgba(99,102,241,.12);
          --success: #10b981;
          --danger: #ef4444;
          --warn: #f59e0b;
          --r: 14px;
          --rs: 10px;
          --font: 'Outfit', sans-serif;
          --mono: 'JetBrains Mono', monospace;
          --cart-w: 340px;
        }
 
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
        body { background: var(--bg); color: var(--text); font-family: var(--font) }
 
        /* ── SCROLLBAR ── */
        ::-webkit-scrollbar { width: 3px; height: 3px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px }
 
        /* ── ROOT ── */
        .root { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg) }
 
        /* ══ TOPBAR ══ */
        .topbar {
          height: 58px; display: flex; align-items: center; padding: 0 20px; gap: 12px;
          background: var(--surface); border-bottom: 1px solid var(--border);
          position: sticky; top: 0; z-index: 100; flex-shrink: 0;
          backdrop-filter: blur(20px);
        }
 
        .logo { display: flex; align-items: center; gap: 10px; flex-shrink: 0; margin-right: 6px }
        .logo-mark {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 16px; color: #fff;
          box-shadow: 0 4px 16px rgba(99,102,241,.4);
        }
        .logo-text { font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -.5px }
 
        /* Tab nav */
        .tab-nav { display: flex; gap: 2px; background: var(--bg2); border-radius: 10px; padding: 3px; flex-shrink: 0 }
        .tab-btn {
          padding: 6px 18px; border-radius: 8px; border: none;
          background: transparent; color: var(--muted);
          font-family: var(--font); font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all .2s; white-space: nowrap;
          display: flex; align-items: center; gap: 5px;
        }
        .tab-btn:hover { color: var(--text2) }
        .tab-btn.active {
          background: var(--surface2); color: var(--text);
          box-shadow: 0 1px 6px rgba(0,0,0,.3);
        }
        .tab-btn .tab-icon { font-size: 14px }
 
        .topbar-right { margin-left: auto; display: flex; align-items: center; gap: 10px }
 
        .wh-pill {
          display: flex; align-items: center; gap: 7px;
          padding: 7px 14px 7px 10px;
          background: var(--accentbg); border: 1px solid rgba(99,102,241,.25);
          border-radius: 20px; cursor: pointer; transition: all .2s; flex-shrink: 0;
        }
        .wh-pill:hover { border-color: var(--accent); background: rgba(99,102,241,.18) }
        .wh-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 6px var(--accent) }
        .wh-name { font-size: 12px; font-weight: 700; color: var(--accent2); max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
        .wh-arrow { font-size: 9px; color: var(--muted) }
 
        .user-chip {
          font-size: 12px; font-weight: 600; color: var(--muted);
          background: var(--surface2); border: 1px solid var(--border);
          padding: 5px 12px; border-radius: 20px;
        }
 
        /* ══ TOAST ══ */
        .toast {
          position: fixed; top: 68px; left: 50%; transform: translateX(-50%);
          z-index: 999; padding: 10px 24px; border-radius: 30px;
          font-size: 13px; font-weight: 700; white-space: nowrap;
          backdrop-filter: blur(20px);
          animation: toastIn .25s cubic-bezier(.34,1.56,.64,1);
          box-shadow: 0 8px 32px rgba(0,0,0,.3);
        }
        .toast.ok { background: rgba(16,185,129,.15); color: #34d399; border: 1px solid rgba(16,185,129,.25) }
        .toast.err { background: rgba(239,68,68,.15); color: #f87171; border: 1px solid rgba(239,68,68,.25) }
        @keyframes toastIn {
          from { opacity:0; transform:translateX(-50%) translateY(-12px) scale(.9) }
          to   { opacity:1; transform:translateX(-50%) translateY(0) scale(1) }
        }
 
        /* ══ POS LAYOUT ══ */
        .pos-layout { display: flex; flex: 1; height: calc(100vh - 58px); overflow: hidden }
 
        /* Products panel */
        .products-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden }
 
        .prod-toolbar {
          padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;
          background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0;
        }
 
        .wh-bar {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; background: var(--accentbg);
          border: 1px solid rgba(99,102,241,.2); border-radius: var(--rs);
          cursor: pointer; transition: all .2s;
        }
        .wh-bar:hover { border-color: rgba(99,102,241,.4); background: rgba(99,102,241,.16) }
        .wh-bar-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .6px }
        .wh-bar-name { font-size: 13px; font-weight: 700; color: var(--accent2); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
        .wh-bar-count {
          font-family: var(--mono); font-size: 10px; font-weight: 600;
          color: var(--accent2); background: rgba(99,102,241,.15);
          padding: 2px 8px; border-radius: 20px;
        }
        .wh-bar-btn {
          font-size: 11px; font-weight: 700; color: var(--accent);
          padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(99,102,241,.25);
          background: rgba(99,102,241,.08); white-space: nowrap; transition: all .15s;
        }
        .wh-bar:hover .wh-bar-btn { background: rgba(99,102,241,.2) }
 
        .search-wrap { position: relative }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 13px; pointer-events: none }
        .search-input {
          width: 100%; background: var(--bg2); border: 1.5px solid var(--border);
          border-radius: var(--rs); padding: 10px 12px 10px 36px;
          color: var(--text); font-family: var(--font); font-size: 13px;
          outline: none; transition: all .2s;
        }
        .search-input::placeholder { color: var(--muted) }
        .search-input:focus { border-color: rgba(99,102,241,.5); background: var(--surface2) }
 
        .cats { display: flex; gap: 5px; flex-wrap: wrap }
        .cat-pill {
          padding: 5px 13px; border-radius: 20px; border: 1.5px solid var(--border);
          background: transparent; color: var(--muted);
          font-family: var(--font); font-size: 11px; font-weight: 700;
          cursor: pointer; transition: all .2s; text-transform: uppercase; letter-spacing: .4px;
        }
        .cat-pill:hover { color: var(--text2); border-color: var(--border2) }
        .cat-pill.active { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 2px 12px rgba(99,102,241,.35) }
 
        /* Products grid */
        .products-grid {
          flex: 1; overflow-y: auto; padding: 14px;
          display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
          gap: 10px; align-content: start; background: var(--bg);
        }
 
        /* Product card */
        .prod-card {
          background: var(--surface); border: 1.5px solid var(--border);
          border-radius: var(--r); padding: 12px 10px 10px;
          cursor: pointer; transition: all .22s cubic-bezier(.34,1.56,.64,1);
          text-align: left; display: flex; flex-direction: column; gap: 7px;
          position: relative; overflow: hidden;
          animation: cardIn .3s ease both;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(10px) scale(.97) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        .prod-card::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(99,102,241,.05), transparent);
          opacity: 0; transition: opacity .2s;
        }
        .prod-card:hover {
          border-color: rgba(99,102,241,.4);
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 8px 28px rgba(0,0,0,.35), 0 0 0 1px rgba(99,102,241,.15);
        }
        .prod-card:hover::before { opacity: 1 }
        .prod-card:active { transform: scale(.97); transition-duration: .1s }
 
        /* category color bar */
        .prod-cat-bar {
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          border-radius: var(--r) var(--r) 0 0;
        }
 
        .prod-img {
          width: 100%; aspect-ratio: 1; border-radius: 10px;
          background: var(--surface2); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; transition: transform .2s;
          flex-shrink: 0;
        }
        .prod-card:hover .prod-img { transform: scale(1.06) }
 
        .prod-name { font-size: 11.5px; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
        .prod-price { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--accent2) }
        .prod-stock-row { display: flex; align-items: center; justify-content: space-between }
        .prod-stock {
          font-size: 10px; font-weight: 600; color: var(--success);
          background: rgba(16,185,129,.1); padding: 2px 7px; border-radius: 20px;
        }
        .prod-stock.low { color: var(--warn); background: rgba(245,158,11,.1) }
 
        .prod-cart-badge {
          position: absolute; top: 8px; right: 8px;
          width: 20px; height: 20px; background: var(--accent);
          border-radius: 50%; font-size: 10px; font-weight: 800;
          color: #fff; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(99,102,241,.5);
          animation: badgePop .25s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes badgePop {
          from { transform: scale(0) }
          to   { transform: scale(1) }
        }
 
        /* Skeleton */
        .skeleton {
          background: linear-gradient(90deg, var(--surface2) 25%, var(--surface3) 50%, var(--surface2) 75%);
          background-size: 200% 100%; animation: shimmer 1.4s ease infinite; border-radius: 8px;
        }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
 
        .empty-state {
          grid-column: 1/-1; display: flex; flex-direction: column; align-items: center;
          justify-content: center; color: var(--muted); padding: 80px 20px;
          text-align: center; gap: 10px;
        }
        .empty-icon { font-size: 44px; opacity: .5 }
        .empty-text { font-size: 14px; font-weight: 600 }
 
        /* ══ CART PANEL ══ */
        .cart-panel {
          width: var(--cart-w); background: var(--surface); display: flex; flex-direction: column;
          flex-shrink: 0; border-left: 1px solid var(--border);
        }
 
        .cart-header {
          padding: 16px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
        }
        .cart-title-row { display: flex; align-items: center; gap: 9px }
        .cart-title { font-size: 15px; font-weight: 800; color: var(--text) }
        .cart-count {
          min-width: 22px; height: 22px; padding: 0 6px; background: var(--accent);
          border-radius: 11px; font-size: 11px; font-weight: 800; color: #fff;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(99,102,241,.4);
        }
        .cart-clear {
          background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.2);
          border-radius: 7px; padding: 5px 10px; color: #f87171;
          font-family: var(--font); font-size: 11px; font-weight: 700;
          cursor: pointer; transition: all .15s;
        }
        .cart-clear:hover { background: rgba(239,68,68,.2) }
 
        .cart-list { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 7px }
 
        .cart-empty {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 12px; color: var(--muted);
        }
        .cart-empty-icon { font-size: 42px; opacity: .35 }
        .cart-empty-text { font-size: 13px; font-weight: 600 }
 
        /* Cart item */
        .cart-item {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: var(--rs); padding: 10px;
          display: flex; flex-direction: column; gap: 8px;
          animation: itemIn .2s ease;
          transition: border-color .15s;
        }
        .cart-item:hover { border-color: var(--border2) }
        @keyframes itemIn {
          from { opacity:0; transform:translateX(12px) }
          to   { opacity:1; transform:translateX(0) }
        }
 
        .ci-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px }
        .ci-name { font-size: 12px; font-weight: 700; color: var(--text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
        .ci-del {
          width: 20px; height: 20px; background: rgba(239,68,68,.1); border: none;
          border-radius: 5px; color: #f87171; font-size: 10px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background .15s;
        }
        .ci-del:hover { background: rgba(239,68,68,.22) }
 
        .ci-price-btn {
          width: 100%; background: var(--surface3); border: 1px solid var(--border);
          border-radius: 7px; padding: 6px 9px; display: flex; align-items: center; gap: 7px;
          cursor: pointer; transition: border-color .15s;
        }
        .ci-price-btn:hover { border-color: rgba(99,102,241,.4) }
        .ci-price { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--accent2) }
        .ci-orig { font-family: var(--mono); font-size: 10px; color: var(--muted); text-decoration: line-through }
        .ci-edit { margin-left: auto; font-size: 11px; color: var(--muted) }
 
        .ci-bottom { display: flex; align-items: center; justify-content: space-between }
        .qty-ctrl { display: flex; align-items: center; gap: 7px }
        .qty-btn {
          width: 28px; height: 28px; background: var(--surface3);
          border: 1px solid var(--border); border-radius: 7px;
          color: var(--text); font-size: 15px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all .15s; line-height: 1; font-family: var(--mono);
        }
        .qty-btn:hover { background: var(--accentbg); border-color: rgba(99,102,241,.4); color: var(--accent2) }
        .qty-val { font-family: var(--mono); font-size: 14px; font-weight: 700; width: 26px; text-align: center }
        .ci-subtotal { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--text) }
 
        /* ── Payment section ── */
        .pay-section {
          padding: 14px; border-top: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 11px; flex-shrink: 0;
        }
 
        .total-row { display: flex; align-items: baseline; justify-content: space-between }
        .total-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .7px }
        .total-amount { font-family: var(--mono); font-size: 22px; font-weight: 800; color: var(--text) }
 
        .pay-methods { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px }
        .pay-btn {
          padding: 9px 4px; border-radius: 9px; border: 1.5px solid var(--border);
          background: var(--surface2); color: var(--muted);
          font-family: var(--font); font-size: 11px; font-weight: 700;
          cursor: pointer; transition: all .2s; display: flex; flex-direction: column; align-items: center; gap: 4px;
        }
        .pay-btn:hover { color: var(--text2); border-color: var(--border2) }
        .pay-btn-icon { font-size: 15px }
 
        .cash-wrap { display: flex; flex-direction: column; gap: 7px }
        .num-input {
          width: 100%; background: var(--surface2); border: 1.5px solid var(--border);
          border-radius: 9px; padding: 11px 13px; color: var(--text);
          font-family: var(--mono); font-size: 16px; font-weight: 700; outline: none; transition: border-color .2s;
        }
        .num-input:focus { border-color: rgba(99,102,241,.5) }
        .num-input::placeholder { color: var(--muted); font-family: var(--font); font-size: 12px; font-weight: 400 }
 
        .change-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 7px 11px; border-radius: 8px;
          font-family: var(--mono); font-size: 12px; font-weight: 700;
        }
        .change-row.pos { background: rgba(16,185,129,.1); color: #34d399; border: 1px solid rgba(16,185,129,.2) }
        .change-row.neg { background: rgba(239,68,68,.1); color: #f87171; border: 1px solid rgba(239,68,68,.2) }
 
        .quick-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 4px }
        .quick-btn {
          padding: 6px 4px; background: var(--surface3); border: 1px solid var(--border);
          border-radius: 6px; color: var(--muted); font-family: var(--mono);
          font-size: 10px; font-weight: 700; cursor: pointer; transition: all .15s; text-align: center;
        }
        .quick-btn:hover { border-color: rgba(99,102,241,.35); color: var(--accent2); background: var(--accentbg) }
 
        .checkout-btn {
          width: 100%; padding: 14px; border-radius: 11px; border: none;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; font-family: var(--font); font-size: 14px; font-weight: 800;
          cursor: pointer; transition: all .2s; letter-spacing: -.2px;
          box-shadow: 0 4px 20px rgba(99,102,241,.3);
        }
        .checkout-btn:hover:not(:disabled) {
          transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,.45);
          background: linear-gradient(135deg, #7c3aed, #6366f1);
        }
        .checkout-btn:active:not(:disabled) { transform: translateY(0); transition-duration: .1s }
        .checkout-btn:disabled { background: var(--surface3); color: var(--muted); cursor: not-allowed; box-shadow: none }
 
        /* ══ PAGE (history/payments/report) ══ */
        .page { flex: 1; overflow-y: auto; padding: 24px; max-width: 1060px; width: 100%; margin: 0 auto }
        .page-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px }
        .page-title { font-size: 20px; font-weight: 800; letter-spacing: -.5px }
        .refresh-btn {
          padding: 8px 16px; background: var(--surface2); border: 1px solid var(--border2);
          border-radius: var(--rs); color: var(--muted); font-family: var(--font);
          font-size: 12px; font-weight: 700; cursor: pointer; transition: all .15s;
        }
        .refresh-btn:hover { color: var(--accent2); border-color: rgba(99,102,241,.4) }
 
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(160px,1fr)); gap: 10px; margin-bottom: 22px }
        .kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 18px; transition: border-color .15s }
        .kpi-card:hover { border-color: var(--border2) }
        .kpi-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px }
        .kpi-val { font-family: var(--mono); font-size: 18px; font-weight: 700 }
 
        .sale-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; margin-bottom: 10px; transition: all .15s; animation: cardIn .3s ease }
        .sale-card:hover { border-color: var(--border2) }
        .sc-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px }
        .sc-id { font-family: var(--mono); font-size: 10px; color: var(--muted) }
        .sc-date { font-size: 11px; color: var(--muted); margin-top: 3px }
        .sc-cashier { font-size: 11px; font-weight: 600; color: var(--text2); margin-top: 3px }
        .sc-total { font-family: var(--mono); font-size: 16px; font-weight: 700; color: var(--accent2) }
        .pay-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700;
          border: 1px solid; font-family: var(--font); margin-top: 5px;
        }
        .sc-items { border-top: 1px solid var(--border); padding-top: 10px; display: flex; flex-direction: column; gap: 5px }
        .sc-item-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--text2); font-family: var(--mono) }
 
        .pay-sum-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 22px }
        .pay-sum-card { border-radius: var(--r); border: 1px solid; padding: 18px }
        .pay-sum-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px }
        .pay-sum-val { font-family: var(--mono); font-size: 16px; font-weight: 800 }
 
        .bar-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; margin-bottom: 14px }
        .bar-title { font-size: 13px; font-weight: 700; margin-bottom: 16px }
        .bar-track { height: 10px; background: var(--bg2); border-radius: 5px; overflow: hidden; display: flex; gap: 2px }
        .bar-seg { height: 100%; border-radius: 3px; transition: width .6s ease }
        .bar-legend { display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap }
        .bar-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text2); font-weight: 600 }
        .bar-dot { width: 8px; height: 8px; border-radius: 50% }
        .top-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px }
        .top-rank { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--muted); width: 22px; flex-shrink: 0 }
        .top-info { flex: 1 }
        .top-name-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 5px }
        .top-qty { font-family: var(--mono); font-size: 11px; color: var(--muted); font-weight: 400 }
        .top-bar { height: 4px; background: var(--bg2); border-radius: 2px }
        .top-bar-fill { height: 100%; background: linear-gradient(90deg,#6366f1,#8b5cf6); border-radius: 2px; transition: width .6s ease }
        .top-revenue { font-family: var(--mono); font-size: 11px; color: var(--accent2); margin-top: 4px }
 
        /* ══ MODALS ══ */
        .overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.6);
          display: flex; align-items: center; justify-content: center;
          z-index: 200; padding: 16px; backdrop-filter: blur(8px);
          animation: fadeIn .18s ease;
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
 
        .wh-modal {
          background: var(--surface); border: 1px solid var(--border2);
          border-radius: 22px; width: 100%; max-width: 480px; overflow: hidden;
          animation: modalUp .25s cubic-bezier(.34,1.56,.64,1);
          box-shadow: 0 24px 64px rgba(0,0,0,.5);
        }
        @keyframes modalUp {
          from { transform: translateY(20px) scale(.96); opacity:0 }
          to   { transform: translateY(0) scale(1); opacity:1 }
        }
        .wh-modal-hdr { padding: 22px 20px 18px; border-bottom: 1px solid var(--border) }
        .wh-modal-title { font-size: 18px; font-weight: 800; letter-spacing: -.4px; margin-bottom: 4px }
        .wh-modal-sub { font-size: 12px; color: var(--muted) }
 
        .wh-list { padding: 12px; display: flex; flex-direction: column; gap: 6px; max-height: 380px; overflow-y: auto }
        .wh-item {
          display: flex; align-items: center; gap: 13px;
          padding: 14px 16px; background: var(--surface2);
          border: 1.5px solid var(--border); border-radius: var(--r);
          cursor: pointer; transition: all .2s; text-align: left; width: 100%;
          font-family: var(--font);
        }
        .wh-item:hover { border-color: rgba(99,102,241,.4); background: var(--accentbg) }
        .wh-item.sel { border-color: var(--accent); background: rgba(99,102,241,.12) }
        .wh-item-icon {
          width: 44px; height: 44px; border-radius: 11px;
          background: var(--surface3); border: 1px solid var(--border2);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
        }
        .wh-item.sel .wh-item-icon { background: var(--accentbg); border-color: rgba(99,102,241,.25) }
        .wh-item-info { flex: 1; min-width: 0 }
        .wh-item-name { font-size: 14px; font-weight: 700; color: var(--text) }
        .wh-item.sel .wh-item-name { color: var(--accent2) }
        .wh-item-addr { font-size: 11px; color: var(--muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
        .wh-check {
          width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border2);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; flex-shrink: 0; transition: all .2s;
        }
        .wh-item.sel .wh-check { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 2px 10px rgba(99,102,241,.4) }
 
        .wh-modal-foot { padding: 12px 20px; border-top: 1px solid var(--border) }
        .cancel-btn {
          width: 100%; padding: 11px; background: var(--surface2);
          border: 1.5px solid var(--border); border-radius: 10px; color: var(--muted);
          font-family: var(--font); font-size: 13px; font-weight: 700; cursor: pointer; transition: all .15s;
        }
        .cancel-btn:hover { color: var(--text); border-color: var(--border2) }
 
        .modal-box {
          background: var(--surface); border: 1px solid var(--border2);
          border-radius: 20px; padding: 24px; width: 100%; max-width: 340px;
          animation: modalUp .25s cubic-bezier(.34,1.56,.64,1);
          box-shadow: 0 24px 64px rgba(0,0,0,.5);
        }
        .modal-title { font-size: 17px; font-weight: 800; letter-spacing: -.3px; margin-bottom: 4px }
        .modal-sub { font-size: 12px; color: var(--muted); margin-bottom: 16px }
        .modal-input {
          width: 100%; background: var(--bg2); border: 1.5px solid var(--border);
          border-radius: 10px; padding: 13px 14px; color: var(--text);
          font-family: var(--mono); font-size: 20px; font-weight: 700; outline: none; transition: border-color .2s;
        }
        .modal-input:focus { border-color: rgba(99,102,241,.5); background: var(--surface2) }
        .modal-input::placeholder { color: var(--muted); font-family: var(--font); font-size: 13px; font-weight: 400 }
        .modal-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px }
        .m-cancel { padding: 11px; background: var(--surface2); border: 1.5px solid var(--border); border-radius: 10px; color: var(--muted); font-family: var(--font); font-size: 13px; font-weight: 700; cursor: pointer; transition: all .15s }
        .m-cancel:hover { color: var(--text) }
        .m-confirm {
          padding: 11px; background: linear-gradient(135deg,#6366f1,#8b5cf6); border: none;
          border-radius: 10px; color: #fff; font-family: var(--font); font-size: 13px; font-weight: 800;
          cursor: pointer; transition: opacity .15s; box-shadow: 0 3px 12px rgba(99,102,241,.35);
        }
        .m-confirm:hover { opacity: .9 }
 
        /* Receipt */
        .receipt-box {
          background: #0f1117; border: 1px solid rgba(255,255,255,.08);
          border-radius: 20px; padding: 24px; width: 100%; max-width: 310px;
          animation: modalUp .25s cubic-bezier(.34,1.56,.64,1);
          box-shadow: 0 24px 64px rgba(0,0,0,.7);
        }
        .r-hdr { text-align: center; margin-bottom: 18px }
        .r-icon { font-size: 44px; margin-bottom: 8px }
        .r-title { font-size: 18px; font-weight: 800; letter-spacing: -.4px }
        .r-id { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-top: 4px }
        .r-cashier { font-size: 11px; color: var(--muted); margin-top: 3px }
        .r-wh { font-size: 11px; color: var(--accent2); margin-top: 4px; font-weight: 700 }
        .r-divider { border: none; border-top: 1.5px dashed rgba(255,255,255,.08); margin: 14px 0 }
        .r-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--text2); margin-bottom: 6px; font-family: var(--mono) }
        .r-row.bold { font-weight: 800; font-size: 16px; color: var(--text); margin-top: 3px }
        .r-row.muted { color: var(--muted) }
        .r-thanks { text-align: center; font-size: 11px; color: var(--muted); margin-top: 14px }
        .r-close {
          width: 100%; margin-top: 18px; padding: 13px;
          background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff; border: none;
          border-radius: 11px; font-family: var(--font); font-size: 13px; font-weight: 800;
          cursor: pointer; box-shadow: 0 4px 16px rgba(99,102,241,.35); transition: opacity .15s;
        }
        .r-close:hover { opacity: .9 }
      `}</style>
 
      <div className="root">
        {/* ── TOPBAR ── */}
        <header className="topbar">
          <div className="logo">
            <div className="logo-mark">K</div>
            <span className="logo-text">Kassa</span>
          </div>
          <nav className="tab-nav">
            {TABS.map(t => (
              <button key={t.key} className={`tab-btn${tab===t.key?" active":""}`} onClick={()=>setTab(t.key)}>
                <span className="tab-icon">{t.icon}</span>{t.label}
              </button>
            ))}
          </nav>
          <div className="topbar-right">
            <button className="wh-pill" onClick={()=>setShowWhModal(true)}>
              <span className="wh-dot"/>
              <span className="wh-name">
                {whLoading?"Yuklanmoqda…":activeWh?activeWh.name:"Ombor tanlang"}
              </span>
              <span className="wh-arrow">▾</span>
            </button>
            <div className="user-chip">{user?.displayName||user?.email||"Cashier"}</div>
          </div>
        </header>
 
        {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
 
        {/* ══ POS ══ */}
        {tab==="pos" && (
          <div className="pos-layout">
            <div className="products-panel">
              <div className="prod-toolbar">
                {/* Warehouse bar */}
                <div className="wh-bar" onClick={()=>setShowWhModal(true)}>
                  <span style={{fontSize:16}}>🏪</span>
                  <span className="wh-bar-label">Ombor</span>
                  <span className="wh-bar-name">{activeWh?activeWh.name:"Tanlanmagan"}</span>
                  {filtered.length>0&&<span className="wh-bar-count">{filtered.length} ta</span>}
                  <span className="wh-bar-btn">O'zgartirish ▾</span>
                </div>
                <div className="search-wrap">
                  <span className="search-icon">🔍</span>
                  <input className="search-input" placeholder="Mahsulot qidirish…" value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <div className="cats">
                  {categories.map(c=>(
                    <button key={c} className={`cat-pill${selectedCat===c?" active":""}`}
                      onClick={()=>setSelectedCat(c)}
                      style={selectedCat===c&&c!=="all"?{background:catColor(c),borderColor:catColor(c)}:{}}
                    >
                      {c==="all"?"Barchasi":c}
                    </button>
                  ))}
                </div>
              </div>
 
              <div className="products-grid">
                {productsLoading
                  ? Array.from({length:16}).map((_,i)=>(
                      <div key={i} className="prod-card" style={{cursor:"default",animationDelay:`${i*.03}s`}}>
                        <div className="skeleton" style={{width:"100%",aspectRatio:"1",borderRadius:10}}/>
                        <div className="skeleton" style={{height:12,borderRadius:4,marginTop:2}}/>
                        <div className="skeleton" style={{height:11,width:"55%",borderRadius:4}}/>
                      </div>
                    ))
                  : filtered.length===0
                  ? (
                    <div className="empty-state">
                      <div className="empty-icon">📦</div>
                      <div className="empty-text">
                        {activeWh ? `${activeWh.name}da mavjud mahsulot topilmadi` : "Ombor tanlanmagan"}
                      </div>
                    </div>
                  )
                  : filtered.map((p,idx)=>{
                      const stock = getEffectiveStock(p);
                      const price = getPrice(p);
                      const inCart = cart.find(i=>i.id===p.id);
                      const cat = getCategory(p);
                      const color = catColor(cat);
                      return (
                        <button key={p.id} className="prod-card"
                          style={{animationDelay:`${Math.min(idx*.025,.4)}s`}}
                          onClick={()=>addToCart(p)}
                        >
                          <div className="prod-cat-bar" style={{background:color}}/>
                          {inCart && <span className="prod-cart-badge">{inCart.quantity}</span>}
                          <div className="prod-img">
                            {p.imageUrl
                              ? <img src={p.imageUrl} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:10}}/>
                              : "📦"
                            }
                          </div>
                          <div className="prod-name">{p.name}</div>
                          <div className="prod-price">{fmt(price)}</div>
                          <div className="prod-stock-row">
                            <div className={`prod-stock${stock<=5?" low":""}`}>
                              {stock<=5?`⚠ ${stock} qoldi`:`✓ ${stock} ta`}
                            </div>
                          </div>
                        </button>
                      );
                    })
                }
              </div>
            </div>
 
            {/* ── CART ── */}
            <div className="cart-panel">
              <div className="cart-header">
                <div className="cart-title-row">
                  <span className="cart-title">Savat</span>
                  {cart.length>0&&<span className="cart-count">{cart.length}</span>}
                </div>
                {cart.length>0&&<button className="cart-clear" onClick={clearCart}>Tozalash</button>}
              </div>
 
              <div className="cart-list">
                {cart.length===0
                  ? <div className="cart-empty"><div className="cart-empty-icon">🛒</div><div className="cart-empty-text">Savat bo'sh</div></div>
                  : cart.map(item=>(
                    <div key={item.id} className="cart-item">
                      <div className="ci-top">
                        <span className="ci-name">{item.name}</span>
                        <button className="ci-del" onClick={()=>removeFromCart(item.id)}>✕</button>
                      </div>
                      <button className="ci-price-btn" onClick={()=>openCustomPrice(item)}>
                        <span className="ci-price">{fmt(item.customPrice)}</span>
                        {item.customPrice!==getPrice(item)&&<span className="ci-orig">{fmt(getPrice(item))}</span>}
                        <span className="ci-edit">✏</span>
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
                  ))
                }
              </div>
 
              <div className="pay-section">
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
                      <span className="pay-btn-icon">{cfg.icon}</span>{cfg.label}
                    </button>
                  ))}
                </div>
                {payMethod==="cash"&&(
                  <div className="cash-wrap">
                    <input className="num-input" type="number" placeholder="Berilgan pul miqdori (so'm)"
                      value={cashGiven||""} onChange={e=>setCashGiven(Number(e.target.value))}/>
                    {cashGiven>0&&(
                      <div className={`change-row ${change>=0?"pos":"neg"}`}>
                        <span>Qaytim:</span><span>{fmt(Math.max(0,change))}</span>
                      </div>
                    )}
                    <div className="quick-grid">
                      {[10000,20000,50000,100000,200000,500000].map(a=>(
                        <button key={a} className="quick-btn" onClick={()=>setCashGiven(a)}>
                          {a>=1000000?a/1000000+"mln":a/1000+"K"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button className="checkout-btn" onClick={handleCheckout}
                  disabled={loading||cart.length===0||(payMethod==="cash"&&cashGiven<total)}>
                  {loading?"⏳ Amalga oshirilmoqda…":cart.length===0?"Savat bo'sh":`✓ To'lash — ${fmt(total)}`}
                </button>
              </div>
            </div>
          </div>
        )}
 
        {/* ══ HISTORY ══ */}
        {tab==="history"&&(
          <div className="page">
            <div className="page-hdr">
              <div className="page-title">So'nggi sotuvlar</div>
              <button className="refresh-btn" onClick={fetchSales}>↻ Yangilash</button>
            </div>
            {sales.length===0
              ? <div className="empty-state" style={{gridColumn:"unset"}}><div className="empty-icon">📋</div><div className="empty-text">Sotuvlar yo'q</div></div>
              : sales.map(sale=>(
                <div key={sale.id} className="sale-card">
                  <div className="sc-top">
                    <div>
                      <div className="sc-id">#{sale.id.slice(-10)}</div>
                      <div className="sc-date">{fmtDate(sale.createdAt)}</div>
                      <div className="sc-cashier">{sale.cashierName}</div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:5}}>
                        <div className="pay-badge" style={{color:PAY_CONFIG[sale.paymentMethod]?.color,background:PAY_CONFIG[sale.paymentMethod]?.bg,borderColor:PAY_CONFIG[sale.paymentMethod]?.border}}>
                          {PAY_CONFIG[sale.paymentMethod]?.icon} {PAY_CONFIG[sale.paymentMethod]?.label}
                        </div>
                        {sale.warehouseName&&<span style={{fontSize:10,color:"#818cf8",background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.2)",borderRadius:20,padding:"3px 8px",fontWeight:700}}>🏪 {sale.warehouseName}</span>}
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
              ))
            }
          </div>
        )}
 
        {/* ══ PAYMENTS ══ */}
        {tab==="payments"&&(
          <div className="page">
            <div className="page-hdr">
              <div className="page-title">To'lovlar ro'yxati</div>
              <button className="refresh-btn" onClick={fetchSales}>↻ Yangilash</button>
            </div>
            <div className="pay-sum-grid">
              {(Object.entries(PAY_CONFIG) as [PayMethod,typeof PAY_CONFIG.cash][]).map(([key,cfg])=>{
                const val=sales.filter(s=>s.paymentMethod===key).reduce((a,s)=>a+s.total,0);
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
                  <div style={{fontSize:11,color:"var(--text2)",marginTop:2}}>{sale.items?.length} ta mahsulot</div>
                  {sale.warehouseName&&<div style={{fontSize:10,color:"#818cf8",marginTop:4,fontWeight:700}}>🏪 {sale.warehouseName}</div>}
                  {sale.paymentMethod==="cash"&&sale.change!==undefined&&(
                    <div style={{fontSize:10,color:"var(--muted)",marginTop:2,fontFamily:"var(--mono)"}}>Qaytim: {fmt(sale.change)}</div>
                  )}
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="sc-total">{fmt(sale.total)}</div>
                  <div className="pay-badge" style={{color:PAY_CONFIG[sale.paymentMethod]?.color,background:PAY_CONFIG[sale.paymentMethod]?.bg,borderColor:PAY_CONFIG[sale.paymentMethod]?.border}}>
                    {PAY_CONFIG[sale.paymentMethod]?.icon} {PAY_CONFIG[sale.paymentMethod]?.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
 
        {/* ══ REPORT ══ */}
        {tab==="report"&&(
          <div className="page">
            <div className="page-hdr">
              <div className="page-title">Kunlik hisobot</div>
              <button className="refresh-btn" onClick={fetchReport}>↻ Yangilash</button>
            </div>
            <div className="kpi-grid">
              {[
                {label:"Jami daromad",value:fmt(report.totalRevenue),color:"#818cf8"},
                {label:"Sotuvlar",value:report.salesCount+" ta",color:"#6366f1"},
                {label:"Sotilgan dona",value:report.itemsSold+" dona",color:"#8b5cf6"},
                {label:"Naqd",value:fmt(report.cashRevenue),color:"#10b981"},
                {label:"Karta",value:fmt(report.cardRevenue),color:"#6366f1"},
                {label:"O'tkazma",value:fmt(report.transferRevenue),color:"#f59e0b"},
              ].map(k=>(
                <div key={k.label} className="kpi-card">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-val" style={{color:k.color}}>{k.value}</div>
                </div>
              ))}
            </div>
            {report.totalRevenue>0&&(
              <div className="bar-card">
                <div className="bar-title">To'lov usullari taqsimoti</div>
                <div className="bar-track">
                  {report.cashRevenue>0&&<div className="bar-seg" style={{width:`${(report.cashRevenue/report.totalRevenue)*100}%`,background:"#10b981"}}/>}
                  {report.cardRevenue>0&&<div className="bar-seg" style={{width:`${(report.cardRevenue/report.totalRevenue)*100}%`,background:"#6366f1"}}/>}
                  {report.transferRevenue>0&&<div className="bar-seg" style={{width:`${(report.transferRevenue/report.totalRevenue)*100}%`,background:"#f59e0b"}}/>}
                </div>
                <div className="bar-legend">
                  {[["#10b981","Naqd"],["#6366f1","Karta"],["#f59e0b","O'tkazma"]].map(([c,l])=>(
                    <div key={l} className="bar-legend-item"><div className="bar-dot" style={{background:c}}/>{l}</div>
                  ))}
                </div>
              </div>
            )}
            {report.topProducts.length>0&&(
              <div className="bar-card">
                <div className="bar-title">🏆 Eng ko'p sotilgan mahsulotlar</div>
                {report.topProducts.map((p,i)=>(
                  <div key={i} className="top-row">
                    <span className="top-rank">#{i+1}</span>
                    <div className="top-info">
                      <div className="top-name-row"><span>{p.name}</span><span className="top-qty">{p.qty} dona</span></div>
                      <div className="top-bar"><div className="top-bar-fill" style={{width:`${(p.revenue/report.topProducts[0].revenue)*100}%`}}/></div>
                      <div className="top-revenue">{fmt(p.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {report.salesCount===0&&<div className="empty-state" style={{gridColumn:"unset"}}><div className="empty-icon">📊</div><div className="empty-text">Bugun sotuvlar yo'q</div></div>}
          </div>
        )}
 
        {/* ══ WAREHOUSE MODAL ══ */}
        {showWhModal&&(
          <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowWhModal(false)}}>
            <div className="wh-modal">
              <div className="wh-modal-hdr">
                <div className="wh-modal-title">Ombor tanlang</div>
                <div className="wh-modal-sub">Faqat tanlangan ombordan sotuv amalga oshiriladi</div>
              </div>
              <div className="wh-list">
                {warehouses.length===0
                  ? <div className="empty-state" style={{padding:"30px 0",gridColumn:"unset"}}><div className="empty-icon">🏪</div><div className="empty-text">Omborlar topilmadi</div></div>
                  : warehouses.map(wh=>{
                      const isSel=activeWh?.id===wh.id;
                      return (
                        <button key={wh.id} className={`wh-item${isSel?" sel":""}`} onClick={()=>selectWarehouse(wh)}>
                          <div className="wh-item-icon">🏪</div>
                          <div className="wh-item-info">
                            <div className="wh-item-name">{wh.name}</div>
                            {wh.address&&<div className="wh-item-addr">{wh.address}</div>}
                            {wh.phone&&<div className="wh-item-addr">📞 {wh.phone}</div>}
                          </div>
                          <div className="wh-check">{isSel?"✓":""}</div>
                        </button>
                      );
                    })
                }
              </div>
              <div className="wh-modal-foot">
                <button className="cancel-btn" onClick={()=>setShowWhModal(false)}>Bekor qilish</button>
              </div>
            </div>
          </div>
        )}
 
        {/* ══ CUSTOM PRICE MODAL ══ */}
        {customPriceItem&&(
          <div className="overlay" onClick={e=>{if(e.target===e.currentTarget){setCustomPriceItem(null);setTempPrice("")}}}>
            <div className="modal-box">
              <div className="modal-title">Narxni o'zgartirish</div>
              <div className="modal-sub">{customPriceItem.name} · Asl narx: {fmt(getPrice(customPriceItem))}</div>
              <input className="modal-input" type="number" value={tempPrice}
                onChange={e=>setTempPrice(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&applyCustomPrice()}
                placeholder="Yangi narx" autoFocus/>
              <div className="modal-btns">
                <button className="m-cancel" onClick={()=>{setCustomPriceItem(null);setTempPrice("")}}>Bekor</button>
                <button className="m-confirm" onClick={applyCustomPrice}>Saqlash</button>
              </div>
            </div>
          </div>
        )}
 
        {/* ══ RECEIPT ══ */}
        {showReceipt&&lastSale&&(
          <div className="overlay">
            <div className="receipt-box">
              <div className="r-hdr">
                <div className="r-icon">🧾</div>
                <div className="r-title">Chek</div>
                <div className="r-id">#{lastSale.id?.slice(-10)}</div>
                <div className="r-cashier">{lastSale.cashierName}</div>
                {lastSale.warehouseName&&<div className="r-wh">🏪 {lastSale.warehouseName}</div>}
              </div>
              <hr className="r-divider"/>
              {lastSale.items?.map((it:any,i:number)=>(
                <div key={i} className="r-row"><span>{it.name} × {it.quantity}</span><span>{fmt(it.subtotal)}</span></div>
              ))}
              <hr className="r-divider"/>
              <div className="r-row bold"><span>Jami:</span><span>{fmt(lastSale.total)}</span></div>
              <div className="r-row muted"><span>To'lov:</span><span>{PAY_CONFIG[lastSale.paymentMethod]?.icon} {PAY_CONFIG[lastSale.paymentMethod]?.label}</span></div>
              {lastSale.paymentMethod==="cash"&&(
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
 
