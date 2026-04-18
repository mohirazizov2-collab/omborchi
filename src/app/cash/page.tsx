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
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  warehouseId: string;
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
  cash:     { label: "Naqd",     icon: "₩", color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" },
  card:     { label: "Karta",    icon: "▣", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)" },
  transfer: { label: "O'tkazma", icon: "⇄", color: "#a855f7", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)" },
};
 
// ============ MAIN ============
export default function CashPage() {
  const { user } = useAuth();
 
  const [products, setProducts]             = useState<Product[]>([]);
  const [cart, setCart]                     = useState<CartItem[]>([]);
  const [search, setSearch]                 = useState("");
  const [selectedCat, setSelectedCat]       = useState("all");
  const [payMethod, setPayMethod]           = useState<PayMethod>("cash");
  const [cashGiven, setCashGiven]           = useState(0);
  const [loading, setLoading]               = useState(false);
  const [toast, setToast]                   = useState<{msg:string;type:"ok"|"err"}|null>(null);
  const [tab, setTab]                       = useState<TabType>("pos");
  const [showReceipt, setShowReceipt]       = useState(false);
  const [lastSale, setLastSale]             = useState<Sale|null>(null);
  const [recentSales, setRecentSales]       = useState<Sale[]>([]);
  const [payments, setPayments]             = useState<Sale[]>([]);
  const [customPriceItem, setCustomPriceItem] = useState<CartItem|null>(null);
  const [tempPrice, setTempPrice]           = useState("");
  const [report, setReport] = useState({
    totalRevenue:0, cashRevenue:0, cardRevenue:0, transferRevenue:0,
    salesCount:0, itemsSold:0,
    topProducts:[] as {name:string;qty:number;revenue:number}[],
  });
 
  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
 
  const showToast = (msg: string, type: "ok"|"err" = "ok") => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };
 
  // ===== FETCH =====
  const fetchProducts = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "products"));
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    } catch { showToast("Mahsulotlarni yuklashda xato", "err"); }
  }, []);
 
  const fetchSales = useCallback(async () => {
    try {
      const q = query(collection(db, "sales"), orderBy("createdAt","desc"), limit(40));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale));
      setRecentSales(data);
      setPayments(data);
    } catch {}
  }, []);
 
  const fetchReport = useCallback(async () => {
    try {
      const { start, end } = todayRange();
      const q = query(collection(db,"sales"), where("createdAt",">=",start), where("createdAt","<=",end));
      const snap = await getDocs(q);
      const sales = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale));
      let total=0, cash=0, card=0, transfer=0, items=0;
      const pmap: Record<string,{name:string;qty:number;revenue:number}> = {};
      for (const s of sales) {
        total += s.total;
        if (s.paymentMethod==="cash") cash+=s.total;
        else if (s.paymentMethod==="card") card+=s.total;
        else transfer+=s.total;
        for (const it of s.items||[]) {
          items += it.quantity;
          if (!pmap[it.id]) pmap[it.id]={name:it.name,qty:0,revenue:0};
          pmap[it.id].qty += it.quantity;
          pmap[it.id].revenue += it.subtotal;
        }
      }
      setReport({
        totalRevenue:total, cashRevenue:cash, cardRevenue:card, transferRevenue:transfer,
        salesCount:sales.length, itemsSold:items,
        topProducts:Object.values(pmap).sort((a,b)=>b.revenue-a.revenue).slice(0,5),
      });
    } catch {}
  }, []);
 
  useEffect(() => {
    fetchProducts(); fetchSales(); fetchReport();
  }, [fetchProducts, fetchSales, fetchReport]);
 
  // ===== CART =====
  const addToCart = (p: Product) => {
    if (p.stock<=0) return;
    setCart(prev => {
      const ex = prev.find(i=>i.id===p.id);
      if (ex) {
        if (ex.quantity>=p.stock) { showToast("Omborda yetarli mahsulot yo'q", "err"); return prev; }
        return prev.map(i=>i.id===p.id?{...i,quantity:i.quantity+1}:i);
      }
      return [...prev,{...p,quantity:1,customPrice:p.price}];
    });
  };
 
  const removeFromCart = (id:string) => setCart(p=>p.filter(i=>i.id!==id));
 
  const updateQty = (id:string, qty:number) => {
    if (qty<=0) { removeFromCart(id); return; }
    setCart(p=>p.map(i=>i.id===id?{...i,quantity:Math.min(qty,i.stock)}:i));
  };
 
  const clearCart = () => { setCart([]); setCashGiven(0); };
 
  const total = cart.reduce((s,i)=>s+i.customPrice*i.quantity,0);
  const change = cashGiven - total;
 
  // custom price
  const openCustomPrice = (item:CartItem) => { setCustomPriceItem(item); setTempPrice(String(item.customPrice)); };
  const applyCustomPrice = () => {
    if (!customPriceItem) return;
    const p = parseFloat(tempPrice);
    if (isNaN(p)||p<0) return;
    setCart(prev=>prev.map(i=>i.id===customPriceItem.id?{...i,customPrice:p}:i));
    setCustomPriceItem(null); setTempPrice("");
  };
 
  // ===== CHECKOUT =====
  const handleCheckout = async () => {
    if (!cart.length) return;
    if (payMethod==="cash"&&cashGiven<total) { showToast("Naqd pul yetarli emas!", "err"); return; }
    setLoading(true);
    try {
      const saleData = {
        items: cart.map(i=>({
          id:i.id, name:i.name, price:i.customPrice,
          originalPrice:i.price, quantity:i.quantity,
          subtotal:i.customPrice*i.quantity,
        })),
        total, paymentMethod:payMethod,
        cashGiven: payMethod==="cash"?cashGiven:total,
        change: payMethod==="cash"?Math.max(0,change):0,
        cashierName: user?.displayName||user?.email||"Cashier",
        cashierId: user?.uid||"",
        warehouseId: cart[0]?.warehouseId||"",
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db,"sales"), saleData);
      await Promise.all(cart.map(i=>updateDoc(doc(db,"products",i.id),{stock:increment(-i.quantity)})));
      setLastSale({id:ref.id,...saleData} as any);
      setShowReceipt(true);
      showToast("Sotuv muvaffaqiyatli amalga oshirildi!");
      clearCart();
      fetchProducts(); fetchSales(); fetchReport();
    } catch (e) {
      console.error(e);
      showToast("Xatolik yuz berdi!", "err");
    } finally { setLoading(false); }
  };
 
  // ===== FILTERS =====
  const categories = ["all",...Array.from(new Set(products.map(p=>p.category).filter(Boolean)))];
  const filtered = products.filter(p=>{
    const ms = p.name.toLowerCase().includes(search.toLowerCase());
    const mc = selectedCat==="all"||p.category===selectedCat;
    return ms&&mc;
  });
 
  const TABS: {key:TabType;label:string;icon:string}[] = [
    {key:"pos",label:"Sotuv",icon:"⊕"},
    {key:"history",label:"Tarix",icon:"◷"},
    {key:"payments",label:"To'lovlar",icon:"◈"},
    {key:"report",label:"Hisobot",icon:"◉"},
  ];
 
  // ===== RENDER =====
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
 
        :root {
          --bg:       #080c10;
          --surface:  #0d1117;
          --elevated: #131920;
          --border:   rgba(255,255,255,0.06);
          --border2:  rgba(255,255,255,0.1);
          --text:     #e8edf2;
          --muted:    #556070;
          --accent:   #00d4aa;
          --accent2:  #00a884;
          --danger:   #ff4d6a;
          --warn:     #f59e0b;
        }
 
        * { box-sizing: border-box; margin: 0; padding: 0; }
 
        .kassa-root {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Syne', sans-serif;
          overflow: hidden;
        }
 
        /* HEADER */
        .kassa-header {
          height: 52px;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(20px);
        }
 
        .kassa-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
 
        .kassa-logo-mark {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
          color: #000;
          letter-spacing: -0.5px;
        }
 
        .kassa-logo-text {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.3px;
          color: var(--text);
        }
 
        .kassa-nav {
          display: flex;
          gap: 2px;
          background: var(--elevated);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 3px;
        }
 
        .kassa-nav-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 7px;
          border: none;
          background: transparent;
          color: var(--muted);
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          letter-spacing: 0.2px;
        }
 
        .kassa-nav-btn:hover { color: var(--text); background: rgba(255,255,255,0.04); }
        .kassa-nav-btn.active {
          background: var(--accent);
          color: #000;
        }
 
        .kassa-user {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--muted);
          max-width: 130px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
 
        /* TOAST */
        .kassa-toast {
          position: fixed;
          top: 60px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 999;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          backdrop-filter: blur(20px);
          animation: toastIn 0.2s ease;
          white-space: nowrap;
        }
        .kassa-toast.ok  { background: rgba(0,212,170,0.15); border: 1px solid rgba(0,212,170,0.3); color: var(--accent); }
        .kassa-toast.err { background: rgba(255,77,106,0.15); border: 1px solid rgba(255,77,106,0.3); color: var(--danger); }
        @keyframes toastIn { from { opacity:0; transform: translateX(-50%) translateY(-8px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
 
        /* POS LAYOUT */
        .pos-layout {
          display: flex;
          height: calc(100vh - 52px);
        }
 
        /* PRODUCTS SIDE */
        .products-side {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-right: 1px solid var(--border);
        }
 
        .products-toolbar {
          padding: 12px;
          border-bottom: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: var(--surface);
        }
 
        .search-wrap {
          position: relative;
        }
 
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          font-size: 14px;
          pointer-events: none;
        }
 
        .kassa-search {
          width: 100%;
          background: var(--elevated);
          border: 1px solid var(--border2);
          border-radius: 10px;
          padding: 9px 12px 9px 36px;
          color: var(--text);
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s;
        }
 
        .kassa-search::placeholder { color: var(--muted); }
        .kassa-search:focus { border-color: var(--accent); }
 
        .cat-pills {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
 
        .cat-pill {
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid var(--border2);
          background: transparent;
          color: var(--muted);
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
 
        .cat-pill:hover { color: var(--text); border-color: var(--border2); }
        .cat-pill.active { background: var(--accent); border-color: var(--accent); color: #000; }
 
        .products-grid {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 8px;
          align-content: start;
        }
 
        .products-grid::-webkit-scrollbar { width: 4px; }
        .products-grid::-webkit-scrollbar-track { background: transparent; }
        .products-grid::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
 
        .product-card {
          background: var(--elevated);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: relative;
          overflow: hidden;
        }
 
        .product-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0,212,170,0.03), transparent);
          opacity: 0;
          transition: opacity 0.15s;
        }
 
        .product-card:hover { border-color: var(--accent); transform: translateY(-1px); }
        .product-card:hover::before { opacity: 1; }
        .product-card:active { transform: scale(0.97); }
        .product-card.out { opacity: 0.35; cursor: not-allowed; filter: grayscale(1); }
 
        .product-icon {
          width: 100%;
          aspect-ratio: 1;
          background: linear-gradient(135deg, rgba(0,212,170,0.08), rgba(0,212,170,0.02));
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          border: 1px solid rgba(0,212,170,0.08);
        }
 
        .product-name {
          font-size: 11px;
          font-weight: 600;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          letter-spacing: 0.1px;
        }
 
        .product-price {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          color: var(--accent);
        }
 
        .product-stock {
          font-size: 10px;
          color: var(--muted);
          font-family: 'JetBrains Mono', monospace;
        }
 
        .product-stock.low { color: var(--danger); }
 
        /* CART SIDE */
        .cart-side {
          width: 320px;
          background: var(--surface);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }
 
        .cart-header {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
 
        .cart-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.2px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
 
        .cart-count {
          background: var(--accent);
          color: #000;
          font-size: 10px;
          font-weight: 800;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
 
        .cart-clear {
          background: none;
          border: none;
          color: var(--danger);
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.15s;
        }
        .cart-clear:hover { opacity: 1; }
 
        .cart-items {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
 
        .cart-items::-webkit-scrollbar { width: 3px; }
        .cart-items::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
 
        .cart-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 8px;
          color: var(--muted);
        }
 
        .cart-empty-icon { font-size: 32px; opacity: 0.3; }
        .cart-empty-text { font-size: 12px; }
 
        .cart-item {
          background: var(--elevated);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: border-color 0.15s;
        }
 
        .cart-item:hover { border-color: var(--border2); }
 
        .cart-item-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 6px;
        }
 
        .cart-item-name {
          font-size: 11px;
          font-weight: 600;
          color: var(--text);
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
 
        .cart-remove {
          width: 18px;
          height: 18px;
          background: rgba(255,77,106,0.1);
          border: none;
          border-radius: 4px;
          color: var(--danger);
          font-size: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .cart-remove:hover { background: rgba(255,77,106,0.25); }
 
        .price-edit-btn {
          background: var(--bg);
          border: 1px solid var(--border2);
          border-radius: 6px;
          padding: 4px 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: border-color 0.15s;
          width: 100%;
        }
        .price-edit-btn:hover { border-color: var(--accent); }
 
        .price-main {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          color: var(--accent);
        }
 
        .price-original {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--muted);
          text-decoration: line-through;
        }
 
        .price-edit-icon {
          margin-left: auto;
          font-size: 10px;
          color: var(--muted);
        }
 
        .cart-item-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
 
        .qty-ctrl {
          display: flex;
          align-items: center;
          gap: 6px;
        }
 
        .qty-btn {
          width: 24px;
          height: 24px;
          background: var(--bg);
          border: 1px solid var(--border2);
          border-radius: 6px;
          color: var(--text);
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.1s;
          line-height: 1;
        }
        .qty-btn:hover { border-color: var(--accent); color: var(--accent); }
 
        .qty-val {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          width: 24px;
          text-align: center;
          color: var(--text);
        }
 
        .item-subtotal {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          color: var(--text);
        }
 
        /* PAYMENT SECTION */
        .payment-section {
          padding: 12px;
          border-top: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
 
        .total-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
 
        .total-label {
          font-size: 12px;
          color: var(--muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
 
        .total-amount {
          font-family: 'JetBrains Mono', monospace;
          font-size: 20px;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: -0.5px;
        }
 
        .pay-methods {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 5px;
        }
 
        .pay-method-btn {
          padding: 8px 4px;
          border-radius: 8px;
          border: 1px solid var(--border2);
          background: var(--elevated);
          color: var(--muted);
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }
 
        .pay-method-btn:hover { color: var(--text); }
 
        .pay-method-icon { font-size: 14px; }
 
        .cash-section { display: flex; flex-direction: column; gap: 6px; }
 
        .kassa-input {
          width: 100%;
          background: var(--elevated);
          border: 1px solid var(--border2);
          border-radius: 8px;
          padding: 9px 12px;
          color: var(--text);
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          font-weight: 600;
          outline: none;
          transition: border-color 0.15s;
        }
        .kassa-input:focus { border-color: var(--accent); }
        .kassa-input::placeholder { color: var(--muted); font-size: 12px; font-family: 'Syne', sans-serif; }
 
        .change-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          border-radius: 7px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
        }
 
        .change-row.pos { background: rgba(0,212,170,0.08); color: var(--accent); }
        .change-row.neg { background: rgba(255,77,106,0.08); color: var(--danger); }
 
        .quick-amounts {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
        }
 
        .quick-amt {
          padding: 5px;
          background: var(--elevated);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--muted);
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.12s;
          text-align: center;
        }
        .quick-amt:hover { border-color: var(--accent); color: var(--accent); }
 
        .checkout-btn {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          border: none;
          border-radius: 10px;
          color: #000;
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s;
          letter-spacing: 0.2px;
        }
 
        .checkout-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,212,170,0.3); }
        .checkout-btn:active { transform: translateY(0); }
        .checkout-btn:disabled {
          background: var(--elevated);
          color: var(--muted);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
 
        /* PAGE CONTENT */
        .page-content {
          height: calc(100vh - 52px);
          overflow-y: auto;
          padding: 20px;
        }
 
        .page-content::-webkit-scrollbar { width: 4px; }
        .page-content::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
 
        .page-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--text);
          letter-spacing: -0.5px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
 
        /* SALE CARDS */
        .sale-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 8px;
          transition: border-color 0.15s;
        }
        .sale-card:hover { border-color: var(--border2); }
 
        .sale-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }
 
        .sale-id { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); }
        .sale-date { font-size: 11px; color: var(--muted); margin-top: 2px; }
        .sale-cashier { font-size: 11px; color: var(--muted); margin-top: 1px; }
        .sale-total { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 700; color: var(--accent); }
 
        .pay-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          margin-top: 4px;
          border: 1px solid;
          font-family: 'Syne', sans-serif;
          letter-spacing: 0.3px;
        }
 
        .sale-items-list { border-top: 1px solid var(--border); padding-top: 8px; display: flex; flex-direction: column; gap: 3px; }
        .sale-item-row { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace; }
 
        /* KPI GRID */
        .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; }
        @media (min-width: 768px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
 
        .kpi-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px;
        }
 
        .kpi-label { font-size: 10px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .kpi-value { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 700; }
 
        /* BAR CHART */
        .bar-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
        .bar-label { font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 12px; }
        .bar-track { height: 8px; background: var(--elevated); border-radius: 4px; overflow: hidden; display: flex; gap: 1px; }
        .bar-seg { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
        .bar-legend { display: flex; gap: 14px; margin-top: 8px; }
        .bar-legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--muted); }
        .bar-dot { width: 8px; height: 8px; border-radius: 50%; }
 
        /* TOP PRODUCTS */
        .top-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
        .top-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .top-rank { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); width: 16px; }
        .top-info { flex: 1; }
        .top-name { font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 4px; display: flex; justify-content: space-between; }
        .top-qty { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); }
        .top-bar { height: 3px; background: var(--elevated); border-radius: 2px; }
        .top-bar-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.5s ease; }
        .top-revenue { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--accent); margin-top: 2px; }
 
        /* PAYMENTS SUMMARY */
        .pay-sum-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 12px; }
        .pay-sum-card { border-radius: 10px; border: 1px solid; padding: 12px; }
        .pay-sum-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .pay-sum-val { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; }
 
        /* MODALS */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 16px;
          backdrop-filter: blur(6px);
          animation: fadeIn 0.15s ease;
        }
 
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
 
        .modal-box {
          background: var(--surface);
          border: 1px solid var(--border2);
          border-radius: 16px;
          padding: 20px;
          width: 100%;
          max-width: 320px;
          animation: slideUp 0.2s ease;
        }
 
        @keyframes slideUp { from { transform: translateY(12px); opacity:0; } to { transform: translateY(0); opacity:1; } }
 
        .modal-title { font-size: 15px; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.3px; }
        .modal-sub { font-size: 11px; color: var(--muted); margin-bottom: 12px; }
 
        .modal-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }
        .modal-cancel { padding: 10px; background: var(--elevated); border: 1px solid var(--border2); border-radius: 8px; color: var(--text); font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .modal-cancel:hover { background: var(--bg); }
        .modal-confirm { padding: 10px; background: var(--accent); border: none; border-radius: 8px; color: #000; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 800; cursor: pointer; transition: opacity 0.15s; }
        .modal-confirm:hover { opacity: 0.85; }
 
        /* RECEIPT */
        .receipt-box {
          background: #fff;
          color: #1a1a1a;
          border-radius: 16px;
          padding: 20px;
          width: 100%;
          max-width: 300px;
          animation: slideUp 0.2s ease;
        }
 
        .receipt-header { text-align: center; margin-bottom: 14px; }
        .receipt-icon { font-size: 36px; margin-bottom: 4px; }
        .receipt-title { font-size: 16px; font-weight: 800; color: #1a1a1a; letter-spacing: -0.3px; }
        .receipt-id { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #888; margin-top: 2px; }
        .receipt-cashier { font-size: 11px; color: #888; }
 
        .receipt-divider { border: none; border-top: 1px dashed #ddd; margin: 10px 0; }
 
        .receipt-row { display: flex; justify-content: space-between; font-size: 12px; color: #333; margin-bottom: 4px; }
        .receipt-row.bold { font-weight: 800; font-size: 15px; color: #000; }
        .receipt-row.muted { color: #888; }
 
        .receipt-thanks { text-align: center; font-size: 11px; color: #aaa; margin-top: 10px; }
        .receipt-close { width: 100%; margin-top: 14px; padding: 11px; background: #1a1a1a; color: #fff; border: none; border-radius: 10px; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.15s; }
        .receipt-close:hover { background: #333; }
 
        .empty-state { text-align: center; color: var(--muted); padding: 60px 0; font-size: 13px; }
 
        .refresh-btn { background: var(--elevated); border: 1px solid var(--border2); border-radius: 8px; padding: 6px 12px; color: var(--muted); font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .refresh-btn:hover { color: var(--text); border-color: var(--accent); }
      `}</style>
 
      <div className="kassa-root">
        {/* HEADER */}
        <header className="kassa-header">
          <div className="kassa-logo">
            <div className="kassa-logo-mark">K</div>
            <span className="kassa-logo-text">Kassa</span>
          </div>
 
          <nav className="kassa-nav">
            {TABS.map(t => (
              <button
                key={t.key}
                className={`kassa-nav-btn${tab===t.key?" active":""}`}
                onClick={()=>setTab(t.key)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
 
          <div className="kassa-user">{user?.displayName||user?.email||"Cashier"}</div>
        </header>
 
        {/* TOAST */}
        {toast && (
          <div className={`kassa-toast ${toast.type}`}>{toast.msg}</div>
        )}
 
        {/* ===== POS ===== */}
        {tab==="pos" && (
          <div className="pos-layout">
            {/* Products */}
            <div className="products-side">
              <div className="products-toolbar">
                <div className="search-wrap">
                  <span className="search-icon">⊕</span>
                  <input
                    ref={searchRef}
                    className="kassa-search"
                    placeholder="Mahsulot qidirish..."
                    value={search}
                    onChange={e=>setSearch(e.target.value)}
                  />
                </div>
                <div className="cat-pills">
                  {categories.map(c=>(
                    <button
                      key={c}
                      className={`cat-pill${selectedCat===c?" active":""}`}
                      onClick={()=>setSelectedCat(c)}
                    >
                      {c==="all"?"Barchasi":c}
                    </button>
                  ))}
                </div>
              </div>
 
              <div className="products-grid">
                {filtered.map(p=>(
                  <button
                    key={p.id}
                    className={`product-card${p.stock<=0?" out":""}`}
                    onClick={()=>addToCart(p)}
                    disabled={p.stock<=0}
                  >
                    <div className="product-icon">📦</div>
                    <div className="product-name">{p.name}</div>
                    <div className="product-price">{fmt(p.price)}</div>
                    <div className={`product-stock${p.stock<=5?" low":""}`}>
                      {p.stock<=0?"Tugagan":`Qoldi: ${p.stock}`}
                    </div>
                  </button>
                ))}
                {filtered.length===0&&(
                  <div style={{gridColumn:"1/-1"}} className="empty-state">
                    Mahsulot topilmadi
                  </div>
                )}
              </div>
            </div>
 
            {/* Cart */}
            <div className="cart-side">
              <div className="cart-header">
                <div className="cart-title">
                  Savat
                  {cart.length>0&&<span className="cart-count">{cart.length}</span>}
                </div>
                {cart.length>0&&(
                  <button className="cart-clear" onClick={clearCart}>Tozalash</button>
                )}
              </div>
 
              <div className="cart-items">
                {cart.length===0&&(
                  <div className="cart-empty">
                    <div className="cart-empty-icon">⊙</div>
                    <div className="cart-empty-text">Savat bo'sh</div>
                  </div>
                )}
                {cart.map(item=>(
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-top">
                      <span className="cart-item-name">{item.name}</span>
                      <button className="cart-remove" onClick={()=>removeFromCart(item.id)}>✕</button>
                    </div>
 
                    <button className="price-edit-btn" onClick={()=>openCustomPrice(item)}>
                      <span className="price-main">{fmt(item.customPrice)}</span>
                      {item.customPrice!==item.price&&(
                        <span className="price-original">{fmt(item.price)}</span>
                      )}
                      <span className="price-edit-icon">✏</span>
                    </button>
 
                    <div className="cart-item-bottom">
                      <div className="qty-ctrl">
                        <button className="qty-btn" onClick={()=>updateQty(item.id,item.quantity-1)}>−</button>
                        <span className="qty-val">{item.quantity}</span>
                        <button className="qty-btn" onClick={()=>updateQty(item.id,item.quantity+1)}>+</button>
                      </div>
                      <span className="item-subtotal">{fmt(item.customPrice*item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>
 
              {/* Payment */}
              <div className="payment-section">
                <div className="total-row">
                  <span className="total-label">Jami to'lov</span>
                  <span className="total-amount">{fmt(total)}</span>
                </div>
 
                <div className="pay-methods">
                  {(Object.entries(PAY_CONFIG) as [PayMethod, typeof PAY_CONFIG.cash][]).map(([key,cfg])=>(
                    <button
                      key={key}
                      className="pay-method-btn"
                      style={payMethod===key?{
                        background:cfg.bg,
                        borderColor:cfg.border,
                        color:cfg.color,
                      }:{}}
                      onClick={()=>setPayMethod(key)}
                    >
                      <span className="pay-method-icon">{cfg.icon}</span>
                      {cfg.label}
                    </button>
                  ))}
                </div>
 
                {payMethod==="cash"&&(
                  <div className="cash-section">
                    <input
                      className="kassa-input"
                      type="number"
                      placeholder="Berilgan pul miqdori"
                      value={cashGiven||""}
                      onChange={e=>setCashGiven(Number(e.target.value))}
                    />
                    {cashGiven>0&&(
                      <div className={`change-row ${change>=0?"pos":"neg"}`}>
                        <span>Qaytim:</span>
                        <span>{fmt(Math.max(0,change))}</span>
                      </div>
                    )}
                    <div className="quick-amounts">
                      {[10000,20000,50000,100000,200000,500000].map(a=>(
                        <button key={a} className="quick-amt" onClick={()=>setCashGiven(a)}>
                          {a/1000}K
                        </button>
                      ))}
                    </div>
                  </div>
                )}
 
                <button
                  className="checkout-btn"
                  onClick={handleCheckout}
                  disabled={loading||cart.length===0||(payMethod==="cash"&&cashGiven<total)}
                >
                  {loading?"Amalga oshirilmoqda...":cart.length===0?"Savat bo'sh":`✓ To'lash — ${fmt(total)}`}
                </button>
              </div>
            </div>
          </div>
        )}
 
        {/* ===== HISTORY ===== */}
        {tab==="history"&&(
          <div className="page-content">
            <div className="page-title">◷ So'nggi sotuvlar</div>
            {recentSales.length===0&&<div className="empty-state">Sotuvlar yo'q</div>}
            {recentSales.map(sale=>(
              <div key={sale.id} className="sale-card">
                <div className="sale-card-top">
                  <div>
                    <div className="sale-id">#{sale.id.slice(-10)}</div>
                    <div className="sale-date">{fmtDate(sale.createdAt)}</div>
                    <div className="sale-cashier">{sale.cashierName}</div>
                    <div
                      className="pay-badge"
                      style={{
                        color: PAY_CONFIG[sale.paymentMethod]?.color||"#888",
                        background: PAY_CONFIG[sale.paymentMethod]?.bg||"transparent",
                        borderColor: PAY_CONFIG[sale.paymentMethod]?.border||"#333",
                      }}
                    >
                      {PAY_CONFIG[sale.paymentMethod]?.icon} {PAY_CONFIG[sale.paymentMethod]?.label}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div className="sale-total">{fmt(sale.total)}</div>
                  </div>
                </div>
                <div className="sale-items-list">
                  {sale.items?.map((it,i)=>(
                    <div key={i} className="sale-item-row">
                      <span>{it.name} × {it.quantity}</span>
                      <span>{fmt(it.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
 
        {/* ===== PAYMENTS ===== */}
        {tab==="payments"&&(
          <div className="page-content">
            <div className="page-title">◈ To'lovlar ro'yxati</div>
 
            <div className="pay-sum-grid">
              {(Object.entries(PAY_CONFIG) as [PayMethod,typeof PAY_CONFIG.cash][]).map(([key,cfg])=>{
                const val = payments.filter(s=>s.paymentMethod===key).reduce((a,s)=>a+s.total,0);
                return (
                  <div
                    key={key}
                    className="pay-sum-card"
                    style={{background:cfg.bg, borderColor:cfg.border}}
                  >
                    <div className="pay-sum-label" style={{color:cfg.color}}>{cfg.icon} {cfg.label}</div>
                    <div className="pay-sum-val" style={{color:cfg.color}}>{fmt(val)}</div>
                  </div>
                );
              })}
            </div>
 
            {payments.length===0&&<div className="empty-state">To'lovlar yo'q</div>}
            {payments.map(sale=>(
              <div key={sale.id} className="sale-card" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div className="sale-id">#{sale.id.slice(-10)}</div>
                  <div className="sale-date">{fmtDate(sale.createdAt)}</div>
                  <div className="sale-cashier">{sale.items?.length} ta mahsulot</div>
                  {sale.paymentMethod==="cash"&&sale.change!==undefined&&(
                    <div style={{fontSize:10,color:"var(--muted)",marginTop:2,fontFamily:"'JetBrains Mono',monospace"}}>
                      Qaytim: {fmt(sale.change)}
                    </div>
                  )}
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="sale-total">{fmt(sale.total)}</div>
                  <div
                    className="pay-badge"
                    style={{
                      color:PAY_CONFIG[sale.paymentMethod]?.color||"#888",
                      background:PAY_CONFIG[sale.paymentMethod]?.bg,
                      borderColor:PAY_CONFIG[sale.paymentMethod]?.border,
                    }}
                  >
                    {PAY_CONFIG[sale.paymentMethod]?.icon} {PAY_CONFIG[sale.paymentMethod]?.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
 
        {/* ===== REPORT ===== */}
        {tab==="report"&&(
          <div className="page-content">
            <div className="page-title" style={{justifyContent:"space-between"}}>
              <span>◉ Kunlik hisobot</span>
              <button className="refresh-btn" onClick={fetchReport}>↻ Yangilash</button>
            </div>
 
            <div className="kpi-grid">
              {[
                {label:"Jami daromad",  value:fmt(report.totalRevenue),    color:"var(--accent)"},
                {label:"Sotuvlar",      value:report.salesCount+" ta",      color:"#3b82f6"},
                {label:"Sotilgan dona", value:report.itemsSold+" dona",     color:"#a855f7"},
                {label:"Naqd",          value:fmt(report.cashRevenue),      color:"#10b981"},
                {label:"Karta",         value:fmt(report.cardRevenue),      color:"#3b82f6"},
                {label:"O'tkazma",      value:fmt(report.transferRevenue),  color:"#a855f7"},
              ].map(k=>(
                <div key={k.label} className="kpi-card">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value" style={{color:k.color}}>{k.value}</div>
                </div>
              ))}
            </div>
 
            {report.totalRevenue>0&&(
              <div className="bar-wrap">
                <div className="bar-label">To'lov usullari taqsimoti</div>
                <div className="bar-track">
                  {report.cashRevenue>0&&(
                    <div className="bar-seg" style={{width:`${(report.cashRevenue/report.totalRevenue)*100}%`,background:"#10b981"}} />
                  )}
                  {report.cardRevenue>0&&(
                    <div className="bar-seg" style={{width:`${(report.cardRevenue/report.totalRevenue)*100}%`,background:"#3b82f6"}} />
                  )}
                  {report.transferRevenue>0&&(
                    <div className="bar-seg" style={{width:`${(report.transferRevenue/report.totalRevenue)*100}%`,background:"#a855f7"}} />
                  )}
                </div>
                <div className="bar-legend">
                  {[["#10b981","Naqd"],["#3b82f6","Karta"],["#a855f7","O'tkazma"]].map(([c,l])=>(
                    <div key={l} className="bar-legend-item">
                      <div className="bar-dot" style={{background:c}} />
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            )}
 
            {report.topProducts.length>0&&(
              <div className="top-wrap">
                <div className="bar-label">🏆 Eng ko'p sotilgan</div>
                {report.topProducts.map((p,i)=>(
                  <div key={i} className="top-row">
                    <span className="top-rank">#{i+1}</span>
                    <div className="top-info">
                      <div className="top-name">
                        <span>{p.name}</span>
                        <span className="top-qty">{p.qty} dona</span>
                      </div>
                      <div className="top-bar">
                        <div className="top-bar-fill" style={{width:`${(p.revenue/report.topProducts[0].revenue)*100}%`}} />
                      </div>
                      <div className="top-revenue">{fmt(p.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
 
            {report.salesCount===0&&<div className="empty-state">Bugun sotuvlar yo'q</div>}
          </div>
        )}
 
        {/* ===== CUSTOM PRICE MODAL ===== */}
        {customPriceItem&&(
          <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget){setCustomPriceItem(null);setTempPrice("");}}}>
            <div className="modal-box">
              <div className="modal-title">Narxni o'zgartirish</div>
              <div className="modal-sub">{customPriceItem.name} · Asl: {fmt(customPriceItem.price)}</div>
              <input
                className="kassa-input"
                type="number"
                value={tempPrice}
                onChange={e=>setTempPrice(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&applyCustomPrice()}
                placeholder="Yangi narx (so'm)"
                autoFocus
                style={{fontSize:18,fontWeight:700}}
              />
              <div className="modal-btns">
                <button className="modal-cancel" onClick={()=>{setCustomPriceItem(null);setTempPrice("");}}>Bekor</button>
                <button className="modal-confirm" onClick={applyCustomPrice}>Saqlash</button>
              </div>
            </div>
          </div>
        )}
 
        {/* ===== RECEIPT MODAL ===== */}
        {showReceipt&&lastSale&&(
          <div className="modal-overlay">
            <div className="receipt-box">
              <div className="receipt-header">
                <div className="receipt-icon">🧾</div>
                <div className="receipt-title">Chek</div>
                <div className="receipt-id">#{lastSale.id?.slice(-10)}</div>
                <div className="receipt-cashier">{lastSale.cashierName}</div>
              </div>
 
              <hr className="receipt-divider" />
 
              {lastSale.items?.map((it:any,i:number)=>(
                <div key={i} className="receipt-row">
                  <span>{it.name} × {it.quantity}</span>
                  <span>{fmt(it.subtotal)}</span>
                </div>
              ))}
 
              <hr className="receipt-divider" />
 
              <div className="receipt-row bold">
                <span>Jami:</span><span>{fmt(lastSale.total)}</span>
              </div>
              <div className="receipt-row muted">
                <span>To'lov:</span>
                <span>{PAY_CONFIG[lastSale.paymentMethod]?.label||lastSale.paymentMethod}</span>
              </div>
              {lastSale.paymentMethod==="cash"&&(
                <>
                  <div className="receipt-row muted">
                    <span>Berildi:</span><span>{fmt((lastSale as any).cashGiven)}</span>
                  </div>
                  <div className="receipt-row" style={{fontWeight:700}}>
                    <span>Qaytim:</span><span>{fmt((lastSale as any).change)}</span>
                  </div>
                </>
              )}
 
              <div className="receipt-thanks">Xarid uchun rahmat! 🙏</div>
              <button className="receipt-close" onClick={()=>setShowReceipt(false)}>Yopish</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
 
