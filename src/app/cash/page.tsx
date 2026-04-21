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
  [key: string]: any;
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
const getPrice = (p: Product): number => {
  const candidates = [p.salePrice, p.price, p.narx, p.baho, p.cost];
  for (const c of candidates) {
    const n = Number(c);
    if (!isNaN(n) && n > 0) return n;
  }
  return 0;
};
 
const getStock = (p: Product): number => {
  const keys = ["stock","qoldiq","miqdor","quantity","balance","remainder","count","amount","total_stock","stockCount","inventoryCount","kolvo","ostatok"];
  for (const k of keys) {
    if (p[k] !== undefined && p[k] !== null) {
      const n = Number(p[k]);
      if (!isNaN(n)) return n;
    }
  }
  return 9999; // Agar stock field yo'q bo'lsa - mavjud deb hisoblaymiz
};
 
const getCategory = (p: Product): string =>
  p.category || p.kategoriya || p.cat || p.tip || p.tur || p.type || "Boshqa";
 
const fmt = (n: number) =>
  isNaN(n) ? "0 so'm" : new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";
 
const fmtDate = (ts: any) => {
  if (!ts) return "—";
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("uz-UZ");
  } catch { return "—"; }
};
 
const todayRange = () => {
  const s = new Date(); s.setHours(0, 0, 0, 0);
  const e = new Date(); e.setHours(23, 59, 59, 999);
  return { start: Timestamp.fromDate(s), end: Timestamp.fromDate(e) };
};
 
const PAY_CONFIG = {
  cash:     { label: "Naqd",     icon: "💵", color: "#10b981", bg: "rgba(16,185,129,.15)",  border: "rgba(16,185,129,.3)" },
  card:     { label: "Karta",    icon: "💳", color: "#6366f1", bg: "rgba(99,102,241,.15)", border: "rgba(99,102,241,.3)" },
  transfer: { label: "O'tkazma", icon: "🏦", color: "#f59e0b", bg: "rgba(245,158,11,.15)", border: "rgba(245,158,11,.3)" },
};
 
const CAT_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16"];
const catColor = (cat: string) => CAT_COLORS[Math.abs(cat.split("").reduce((a,c)=>a+c.charCodeAt(0),0)) % CAT_COLORS.length];
 
// ============ PDF CHEK YARATISH ============
const generateReceiptHTML = (sale: any): string => {
  const PAY_LABELS: Record<string, string> = { cash: "Naqd pul", card: "Karta", transfer: "O\'tkazma" };
  const date = new Date().toLocaleString("uz-UZ");
  const rows = sale.items?.map((it: any) => `
    <tr>
      <td style="padding:4px 2px;border-bottom:1px dashed #e5e7eb;font-size:11px">${it.name}</td>
      <td style="padding:4px 2px;border-bottom:1px dashed #e5e7eb;text-align:center;font-size:11px">${it.quantity}</td>
      <td style="padding:4px 2px;border-bottom:1px dashed #e5e7eb;text-align:right;font-size:11px;white-space:nowrap">${new Intl.NumberFormat("uz-UZ").format(it.price)}</td>
      <td style="padding:4px 2px;border-bottom:1px dashed #e5e7eb;text-align:right;font-size:11px;font-weight:700;white-space:nowrap">${new Intl.NumberFormat("uz-UZ").format(it.subtotal)}</td>
    </tr>
  `).join("") || "";
 
  return `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Chek #${sale.id?.slice(-8) || "000"}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    color: #111;
    background: #fff;
    width: 72mm;
    padding: 4mm;
  }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .dashed { border-top: 1.5px dashed #555; margin: 6px 0; }
  .logo { font-size: 18px; font-weight: 900; letter-spacing: 1px; margin-bottom: 2px; }
  .sub { font-size: 9px; color: #555; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 9px; text-align: left; padding: 4px 2px; border-bottom: 2px solid #111; color: #444; }
  th:nth-child(2) { text-align: center; }
  th:nth-child(3), th:nth-child(4) { text-align: right; }
  .total-section { margin-top: 6px; }
  .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
  .total-row.main { font-size: 15px; font-weight: 900; border-top: 2px solid #111; padding-top: 6px; margin-top: 2px; }
  .pay-info { background: #f3f4f6; border-radius: 4px; padding: 6px 8px; margin: 8px 0; }
  .pay-row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
  .pay-row.change { font-weight: 700; font-size: 13px; color: #059669; }
  .footer { text-align: center; font-size: 9px; color: #888; margin-top: 10px; }
  .barcode { font-size: 9px; letter-spacing: 3px; color: #333; margin-top: 4px; }
  @media print {
    body { width: 100%; padding: 0; }
    @page { margin: 2mm; }
  }
</style>
</head>
<body>
  <div class="center">
    <div class="logo">OMBORCHI.UZ</div>
    <div class="sub">Savdo boshqaruv tizimi</div>
    <div class="sub">${date}</div>
    ${sale.warehouseName ? `<div class="sub" style="font-weight:700">🏪 ${sale.warehouseName}</div>` : ""}
    <div class="sub">Kassir: <strong>${sale.cashierName}</strong></div>
    <div class="sub">Chek: <strong>#${sale.id?.slice(-10) || "—"}</strong></div>
  </div>
  <div class="dashed"></div>
  <table>
    <thead>
      <tr>
        <th>Mahsulot</th>
        <th style="text-align:center">Dona</th>
        <th style="text-align:right">Narx</th>
        <th style="text-align:right">Summa</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total-section">
    <div class="total-row main">
      <span>JAMI:</span>
      <span>${new Intl.NumberFormat("uz-UZ").format(sale.total)} so'm</span>
    </div>
  </div>
  <div class="pay-info">
    <div class="pay-row">
      <span>To'lov usuli:</span>
      <span class="bold">${PAY_LABELS[sale.paymentMethod] || sale.paymentMethod}</span>
    </div>
    ${sale.paymentMethod === "cash" ? `
    <div class="pay-row">
      <span>Berildi:</span>
      <span>${new Intl.NumberFormat("uz-UZ").format(sale.cashGiven || 0)} so'm</span>
    </div>
    <div class="pay-row change">
      <span>Qaytim:</span>
      <span>${new Intl.NumberFormat("uz-UZ").format(Math.max(0, sale.change || 0))} so'm</span>
    </div>` : ""}
  </div>
  <div class="dashed"></div>
  <div class="footer">
    <div>Xarid uchun rahmat! 🙏</div>
    <div style="margin-top:3px">www.omborchi.uz</div>
    <div class="barcode">||||| ${sale.id?.slice(-8) || "00000000"} |||||</div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;
};
 
// ============ TERMAL PRINTER (ESC/POS) ============
const printThermal = async (sale: any): Promise<boolean> => {
  // Web Serial API orqali termal printer
  if (!("serial" in navigator)) {
    return false;
  }
  try {
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });
    const writer = port.writable.getWriter();
 
    const ESC = 0x1B;
    const GS = 0x1D;
    const LF = 0x0A;
 
    const encode = (text: string) => new TextEncoder().encode(text);
    const cmd = (...bytes: number[]) => new Uint8Array(bytes);
 
    // Initialize
    await writer.write(cmd(ESC, 0x40));
    // Center align
    await writer.write(cmd(ESC, 0x61, 0x01));
    // Bold on
    await writer.write(cmd(ESC, 0x45, 0x01));
    await writer.write(encode("OMBORCHI.UZ\n"));
    await writer.write(cmd(ESC, 0x45, 0x00));
    await writer.write(encode("Savdo boshqaruv tizimi\n"));
    await writer.write(encode(new Date().toLocaleString("uz-UZ") + "\n"));
    if (sale.warehouseName) await writer.write(encode(sale.warehouseName + "\n"));
    await writer.write(encode("Kassir: " + sale.cashierName + "\n"));
    await writer.write(encode("Chek: #" + (sale.id?.slice(-10) || "—") + "\n"));
    await writer.write(encode("--------------------------------\n"));
 
    // Left align
    await writer.write(cmd(ESC, 0x61, 0x00));
 
    for (const item of (sale.items || [])) {
      const name = item.name.slice(0, 20).padEnd(20);
      const qty = String(item.quantity).padStart(3);
      const sum = new Intl.NumberFormat("uz-UZ").format(item.subtotal).padStart(9);
      await writer.write(encode(`${name}${qty}${sum}\n`));
    }
 
    await writer.write(encode("--------------------------------\n"));
    // Bold + double size for total
    await writer.write(cmd(ESC, 0x45, 0x01));
    await writer.write(cmd(GS, 0x21, 0x11));
    const total = new Intl.NumberFormat("uz-UZ").format(sale.total);
    await writer.write(encode(`JAMI: ${total} so'm\n`));
    await writer.write(cmd(GS, 0x21, 0x00));
    await writer.write(cmd(ESC, 0x45, 0x00));
 
    const PAY_LABELS: Record<string, string> = { cash: "Naqd pul", card: "Karta", transfer: "O\'tkazma" };
    await writer.write(encode(`To'lov: ${PAY_LABELS[sale.paymentMethod] || sale.paymentMethod}\n`));
 
    if (sale.paymentMethod === "cash") {
      await writer.write(encode(`Berildi: ${new Intl.NumberFormat("uz-UZ").format(sale.cashGiven || 0)} so'm\n`));
      await writer.write(encode(`Qaytim:  ${new Intl.NumberFormat("uz-UZ").format(Math.max(0, sale.change || 0))} so'm\n`));
    }
 
    await writer.write(encode("--------------------------------\n"));
    await writer.write(cmd(ESC, 0x61, 0x01));
    await writer.write(encode("Xarid uchun rahmat!\n"));
    await writer.write(encode("www.omborchi.uz\n"));
    // Feed and cut
    await writer.write(cmd(LF, LF, LF));
    await writer.write(cmd(GS, 0x56, 0x00)); // Full cut
 
    writer.releaseLock();
    await port.close();
    return true;
  } catch (err) {
    console.error("Thermal printer error:", err);
    return false;
  }
};
 
// ============ BROWSER PRINT (chek oynasi) ============
const printBrowser = (sale: any) => {
  const html = generateReceiptHTML(sale);
  const win = window.open("", "_blank", "width=360,height=700");
  if (!win) {
    alert("Pop-up bloklangan! Brauzer sozlamalarida ruxsat bering.");
    return;
  }
  win.document.write(html);
  win.document.close();
};
 
// ============ PDF YUKLASH ============
const downloadPDF = (sale: any) => {
  const html = generateReceiptHTML(sale);
  // jsPDF o'rniga iframe + print to PDF usuli
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch {}
    setTimeout(() => document.body.removeChild(iframe), 3000);
  }, 500);
};
 
// ============ MAIN ============
export default function CashPage() {
  const { user } = useAuth();
 
  const [warehouses, setWarehouses]   = useState<Warehouse[]>([]);
  const [activeWh, setActiveWh]       = useState<Warehouse | null>(null);
  const [showWhModal, setShowWhModal] = useState(false);
  const [whLoading, setWhLoading]     = useState(true);
 
  const [allProducts, setAllProducts]         = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [search, setSearch]                   = useState("");
  const [selectedCat, setSelectedCat]         = useState("all");
 
  const [cart, setCart]           = useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [cashGiven, setCashGiven] = useState(0);
 
  const [loading, setLoading]         = useState(false);
  const [toast, setToast]             = useState<{msg:string;type:"ok"|"err"|"info"}|null>(null);
  const [tab, setTab]                 = useState<TabType>("pos");
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
  const [inventoryMap, setInventoryMap] = useState<Record<string, number>>({});
 
  const toastRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const showToast = useCallback((msg: string, type: "ok"|"err"|"info" = "ok") => {
    setToast({ msg, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3500);
  }, []);
 
  // ============ WAREHOUSES ============
  const fetchWarehouses = useCallback(async () => {
    setWhLoading(true);
    try {
      const names = ["warehouses","skladlar","omborlar","warehouse","sklad","ombor","Warehouses"];
      let data: Warehouse[] = [];
      for (const name of names) {
        try {
          const snap = await getDocs(collection(db, name));
          if (!snap.empty) {
            data = snap.docs.map(d => {
              const r = d.data() as any;
              return {
                id: d.id,
                name: r.name||r.nomi||r.nom||r.title||r.ism||d.id,
                address: r.address||r.manzil||"",
                phone: r.phone||r.telefon||r.tel||""
              };
            });
            break;
          }
        } catch {}
      }
      setWarehouses(data);
      if (data.length > 0) setActiveWh(data[0]);
    } catch (e) { console.error(e); }
    finally { setWhLoading(false); }
  }, []);
 
  // ============ INVENTORY ============
  const fetchInventory = useCallback(async (wh: Warehouse | null) => {
    if (!wh) { setInventoryMap({}); return; }
    try {
      const cols = ["inventory","inventories","stock","stocks","Inventory"];
      for (const c of cols) {
        try {
          const snap = await getDocs(query(collection(db, c), where("warehouseId","==",wh.id)));
          if (!snap.empty) {
            const map: Record<string,number> = {};
            snap.docs.forEach(d => {
              const r = d.data() as any;
              const pid = r.productId||r.product_id||r.mahsulotId||r.itemId;
              if (pid) map[pid] = Number(r.stock||r.qoldiq||r.miqdor||r.quantity||r.amount||0);
            });
            setInventoryMap(map);
            return;
          }
        } catch {}
      }
      setInventoryMap({});
    } catch { setInventoryMap({}); }
  }, []);
 
  // ============ PRODUCTS - TO'LIQ TUZATILGAN ============
  const fetchProducts = useCallback(async (wh: Warehouse | null) => {
    setProductsLoading(true);
    try {
      const cols = ["products","mahsulotlar","tovarlar","items","product","Products","Mahsulotlar","goods"];
      let rawData: Product[] = [];
 
      for (const colName of cols) {
        try {
          const snap = await getDocs(collection(db, colName));
          if (!snap.empty) {
            rawData = snap.docs.map(d => {
              const r = d.data() as any;
              // Nom - barcha variantlar
              const name =
                r.name || r.nomi || r.nom || r.title || r.mahsulot ||
                r.tovar || r.naimenovanie || r.productName || r.item_name ||
                `Mahsulot #${d.id.slice(-4)}`;
              // Narx - barcha variantlar
              const price =
                Number(r.salePrice || r.price || r.narx || r.baho ||
                r.sotishNarxi || r.selling_price || r.sellingPrice ||
                r.cost || r.stoimost || 0);
              // Kategoriya
              const category =
                r.category || r.kategoriya || r.cat || r.tip ||
                r.tur || r.type || r.gruppe || "";
 
              return {
                ...r,           // barcha maydonlar
                id: d.id,       // id ustidan yozamiz
                name,
                price,
                salePrice: price,
                category,
                kategoriya: category,
                // Stock maydonlarini saqlaymiz
                stock: r.stock,
                qoldiq: r.qoldiq,
                miqdor: r.miqdor,
                imageUrl: r.imageUrl||r.image||r.img||r.rasm||r.photo||"",
              } as Product;
            });
            console.log(`✅ "${colName}" dan ${rawData.length} ta mahsulot`);
            break;
          }
        } catch (e) {
          console.warn(`"${colName}" topilmadi`);
        }
      }
 
      // Ombor bo'yicha filter
      if (wh && rawData.length > 0) {
        const whFields = ["warehouseId","skladId","omborId","warehouse_id","sklad_id","whId","ombor_id"];
        for (const f of whFields) {
          const filtered = rawData.filter(p => p[f] === wh.id);
          if (filtered.length > 0) {
            rawData = filtered;
            break;
          }
        }
      }
 
      setAllProducts(rawData);
    } catch (e) {
      console.error("fetchProducts xato:", e);
      showToast("Mahsulotlarni yuklashda xato!", "err");
    } finally {
      setProductsLoading(false); // HAR DOIM false ga o'tkazamiz
    }
  }, [showToast]);
 
  const getEffectiveStock = useCallback((p: Product): number => {
    if (inventoryMap[p.id] !== undefined) return inventoryMap[p.id];
    return getStock(p);
  }, [inventoryMap]);
 
  const fetchSales = useCallback(async () => {
    try {
      const q = query(collection(db,"sales"), orderBy("createdAt","desc"), limit(100));
      const snap = await getDocs(q);
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    } catch (e) { console.error(e); }
  }, []);
 
  const fetchReport = useCallback(async () => {
    try {
      const { start, end } = todayRange();
      const q = query(collection(db,"sales"), where("createdAt",">=",start), where("createdAt","<=",end));
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
          items += it.quantity;
          if (!pmap[it.id]) pmap[it.id]={name:it.name,qty:0,revenue:0};
          pmap[it.id].qty += it.quantity;
          pmap[it.id].revenue += it.subtotal;
        }
      }
      setReport({
        totalRevenue:total, cashRevenue:cash, cardRevenue:card,
        transferRevenue:transfer, salesCount:daySales.length, itemsSold:items,
        topProducts: Object.values(pmap).sort((a,b)=>b.revenue-a.revenue).slice(0,5)
      });
    } catch (e) { console.error(e); }
  }, []);
 
  useEffect(() => { fetchWarehouses(); fetchSales(); fetchReport(); }, []);
  useEffect(() => {
    if (!whLoading) { fetchProducts(activeWh); fetchInventory(activeWh); }
  }, [activeWh, whLoading]);
 
  const selectWarehouse = (wh: Warehouse) => {
    if (activeWh?.id !== wh.id) { setCart([]); setCashGiven(0); }
    setActiveWh(wh);
    setShowWhModal(false);
    showToast(`✓ ${wh.name} tanlandi`);
  };
 
  const addToCart = (p: Product) => {
    const stock = getEffectiveStock(p);
    const price = getPrice(p);
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) {
        if (stock < 9999 && ex.quantity >= stock) {
          showToast("Omborda yetarli emas!", "err");
          return prev;
        }
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
      return { ...i, quantity: stock < 9999 ? Math.min(qty, stock) : qty };
    }));
  };
  const clearCart = () => { setCart([]); setCashGiven(0); };
 
  const total   = cart.reduce((s, i) => s + i.customPrice * i.quantity, 0);
  const change  = cashGiven - total;
 
  const openCustomPrice = (item: CartItem) => {
    setCustomPriceItem(item);
    setTempPrice(String(item.customPrice));
  };
  const applyCustomPrice = () => {
    if (!customPriceItem) return;
    const p = parseFloat(tempPrice);
    if (isNaN(p) || p < 0) return;
    setCart(prev => prev.map(i => i.id === customPriceItem.id ? { ...i, customPrice: p } : i));
    setCustomPriceItem(null); setTempPrice("");
  };
 
  // ============ CHECKOUT + AVTOMATIK CHEK ============
  const handleCheckout = async () => {
    if (!cart.length) return;
    if (payMethod === "cash" && cashGiven < total) {
      showToast("Naqd pul yetarli emas!", "err");
      return;
    }
    setLoading(true);
    try {
      const saleData = {
        items: cart.map(i => ({
          id: i.id, name: i.name,
          price: i.customPrice, originalPrice: getPrice(i),
          quantity: i.quantity, subtotal: i.customPrice * i.quantity
        })),
        total,
        paymentMethod: payMethod,
        cashGiven: payMethod === "cash" ? cashGiven : total,
        change: payMethod === "cash" ? Math.max(0, change) : 0,
        cashierName: user?.displayName || user?.email || "Cashier",
        cashierId: user?.uid || "",
        warehouseId: activeWh?.id || "default",
        warehouseName: activeWh?.name || "",
        createdAt: serverTimestamp(),
      };
 
      const ref = await addDoc(collection(db, "sales"), saleData);
 
      // Stock kamaytirish
      await Promise.all(cart.map(async (i) => {
        const stock = getEffectiveStock(i);
        if (stock < 9999) {
          try { await updateDoc(doc(db, "products", i.id), { stock: increment(-i.quantity) }); } catch {}
        }
      }));
 
      const completedSale = { id: ref.id, ...saleData };
      setLastSale(completedSale as any);
 
      // Savat tozalash
      clearCart();
 
      // ===== AVTOMATIK CHEK CHIQARISH =====
      // 1. Avval termal printer ga urinib ko'ramiz
      const thermalOk = await printThermal(completedSale);
 
      if (!thermalOk) {
        // 2. Termal yo'q - brauzer orqali chek oynasi
        printBrowser(completedSale);
        showToast("✓ Sotuv amalga oshdi! Chek oynasi ochildi.", "ok");
      } else {
        showToast("✓ Sotuv amalga oshdi! Chek printerga yuborildi.", "ok");
      }
 
      // 3. Receipt modal ni ko'rsatamiz
      setShowReceipt(true);
 
      fetchProducts(activeWh);
      fetchInventory(activeWh);
      fetchSales();
      fetchReport();
    } catch (e) {
      console.error(e);
      showToast("Xatolik yuz berdi!", "err");
    } finally {
      setLoading(false);
    }
  };
 
  // ============ FILTER - STOCK TEKSHIRUVISIZ ============
  const categories = ["all", ...Array.from(new Set(allProducts.map(p => getCategory(p)).filter(Boolean)))];
 
  const filtered = allProducts.filter(p => {
    const name = (p.name || "").toLowerCase();
    const ms = !search || name.includes(search.toLowerCase());
    const mc = selectedCat === "all" || getCategory(p) === selectedCat;
    return ms && mc;
    // Stock bo'yicha FILTER YO'Q - barcha mahsulotlar ko'rinadi
  });
 
  const TABS: {key:TabType;label:string;icon:string}[] = [
    {key:"pos",    label:"Sotuv",    icon:"🛒"},
    {key:"history",label:"Tarix",    icon:"📋"},
    {key:"payments",label:"To'lovlar",icon:"💳"},
    {key:"report", label:"Hisobot",  icon:"📊"},
  ];
 
  // ============ STYLES ============
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
 
    :root {
      --bg:      #0d0f17;
      --bg2:     #141620;
      --surface: #1a1d2e;
      --sur2:    #212438;
      --sur3:    #272a3f;
      --border:  rgba(255,255,255,.07);
      --bord2:   rgba(255,255,255,.13);
      --text:    #f0f2ff;
      --text2:   #a0a8cc;
      --muted:   #5c6494;
      --accent:  #6366f1;
      --acc2:    #818cf8;
      --accbg:   rgba(99,102,241,.12);
      --ok:      #10b981;
      --danger:  #ef4444;
      --warn:    #f59e0b;
      --r:       14px;
      --rs:      10px;
      --font:    'Outfit', sans-serif;
      --mono:    'JetBrains Mono', monospace;
      --cart-w:  340px;
    }
 
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
 
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
    }
 
    /* scrollbar */
    ::-webkit-scrollbar { width: 3px; height: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--bord2); border-radius: 2px; }
 
    /* ========== ROOT ========== */
    .root { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
 
    /* ========== TOPBAR ========== */
    .topbar {
      height: 56px; flex-shrink: 0;
      display: flex; align-items: center; gap: 12px; padding: 0 18px;
      background: var(--surface); border-bottom: 1px solid var(--border);
      z-index: 100;
    }
    .logo { display: flex; align-items: center; gap: 9px; margin-right: 4px; flex-shrink: 0; }
    .logo-mark {
      width: 34px; height: 34px; border-radius: 9px;
      background: linear-gradient(135deg,#6366f1,#8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-weight: 900; font-size: 15px; color: #fff;
      box-shadow: 0 3px 14px rgba(99,102,241,.4);
    }
    .logo-text { font-size: 16px; font-weight: 800; letter-spacing: -.4px; }
    .tab-nav {
      display: flex; gap: 2px;
      background: var(--bg2); border-radius: 9px; padding: 3px;
    }
    .tab-btn {
      padding: 5px 16px; border-radius: 7px; border: none;
      background: transparent; color: var(--muted);
      font-family: var(--font); font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all .18s;
      display: flex; align-items: center; gap: 5px; white-space: nowrap;
    }
    .tab-btn:hover { color: var(--text2); }
    .tab-btn.active {
      background: var(--sur2); color: var(--text);
      box-shadow: 0 1px 5px rgba(0,0,0,.3);
    }
    .topbar-right { margin-left: auto; display: flex; align-items: center; gap: 9px; }
    .wh-pill {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 13px 6px 9px;
      background: var(--accbg); border: 1px solid rgba(99,102,241,.25);
      border-radius: 20px; cursor: pointer; transition: all .18s;
    }
    .wh-pill:hover { border-color: var(--accent); background: rgba(99,102,241,.18); }
    .wh-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 5px var(--accent); }
    .wh-name { font-size: 11px; font-weight: 700; color: var(--acc2); max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .user-chip {
      font-size: 11px; font-weight: 600; color: var(--muted);
      background: var(--sur2); border: 1px solid var(--border);
      padding: 5px 11px; border-radius: 20px;
    }
 
    /* ========== TOAST ========== */
    .toast {
      position: fixed; top: 66px; left: 50%; transform: translateX(-50%);
      z-index: 9999; padding: 10px 22px; border-radius: 30px;
      font-size: 12px; font-weight: 700; white-space: nowrap;
      animation: toastIn .25s cubic-bezier(.34,1.56,.64,1);
      box-shadow: 0 8px 28px rgba(0,0,0,.35);
    }
    .toast.ok   { background: rgba(16,185,129,.15); color: #34d399; border: 1px solid rgba(16,185,129,.25); }
    .toast.err  { background: rgba(239,68,68,.15);  color: #f87171; border: 1px solid rgba(239,68,68,.25); }
    .toast.info { background: rgba(99,102,241,.15); color: #818cf8; border: 1px solid rgba(99,102,241,.25); }
    @keyframes toastIn {
      from { opacity:0; transform: translateX(-50%) translateY(-10px) scale(.92); }
      to   { opacity:1; transform: translateX(-50%) translateY(0) scale(1); }
    }
 
    /* ========== POS LAYOUT ========== */
    .pos-layout { display: flex; flex: 1; min-height: 0; overflow: hidden; }
 
    /* ---- Products panel ---- */
    .products-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
 
    .prod-toolbar {
      padding: 12px 14px; flex-shrink: 0;
      display: flex; flex-direction: column; gap: 9px;
      background: var(--surface); border-bottom: 1px solid var(--border);
    }
    .wh-bar {
      display: flex; align-items: center; gap: 9px;
      padding: 9px 13px;
      background: var(--accbg); border: 1px solid rgba(99,102,241,.18);
      border-radius: var(--rs); cursor: pointer; transition: all .18s;
    }
    .wh-bar:hover { border-color: rgba(99,102,241,.4); background: rgba(99,102,241,.16); }
    .wh-bar-lbl { font-size: 9px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .6px; }
    .wh-bar-name { font-size: 12px; font-weight: 700; color: var(--acc2); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .wh-bar-cnt { font-family: var(--mono); font-size: 10px; font-weight: 600; color: var(--acc2); background: rgba(99,102,241,.15); padding: 2px 8px; border-radius: 20px; }
    .wh-bar-btn { font-size: 10px; font-weight: 700; color: var(--accent); padding: 3px 9px; border-radius: 6px; border: 1px solid rgba(99,102,241,.25); background: rgba(99,102,241,.08); }
    .search-wrap { position: relative; }
    .search-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 12px; pointer-events: none; }
    .search-inp {
      width: 100%; background: var(--bg2); border: 1.5px solid var(--border);
      border-radius: var(--rs); padding: 9px 11px 9px 34px;
      color: var(--text); font-family: var(--font); font-size: 13px; outline: none; transition: all .18s;
    }
    .search-inp::placeholder { color: var(--muted); }
    .search-inp:focus { border-color: rgba(99,102,241,.5); background: var(--sur2); }
    .cats { display: flex; gap: 5px; flex-wrap: wrap; }
    .cat-pill {
      padding: 4px 12px; border-radius: 20px;
      border: 1.5px solid var(--border); background: transparent;
      color: var(--muted); font-family: var(--font); font-size: 10px; font-weight: 700;
      cursor: pointer; transition: all .18s; text-transform: uppercase; letter-spacing: .4px;
    }
    .cat-pill:hover { color: var(--text2); border-color: var(--bord2); }
    .cat-pill.active { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 2px 10px rgba(99,102,241,.35); }
 
    /* ---- Products grid ---- */
    .products-grid {
      flex: 1; overflow-y: auto; min-height: 0;
      padding: 12px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
      gap: 9px;
      align-content: start;
      background: var(--bg);
    }
 
    /* ========== SKELETON ========== */
    .skel-card {
      background: var(--surface);
      border: 1.5px solid var(--border);
      border-radius: var(--r);
      padding: 11px 9px 9px;
      display: flex; flex-direction: column; gap: 7px;
    }
    .skel-line {
      border-radius: 5px;
      background: linear-gradient(90deg, var(--sur2) 25%, var(--sur3) 50%, var(--sur2) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.3s ease infinite;
    }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
 
    /* ========== PRODUCT CARD - TO'LIQ TUZATILGAN ========== */
    .prod-card {
      /* Reset button */
      appearance: none;
      -webkit-appearance: none;
      border: none;
      outline: none;
      cursor: pointer;
      text-align: left;
      font-family: var(--font);
 
      /* Layout */
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: relative;
      overflow: hidden;
 
      /* Visual */
      background: var(--surface) !important;
      border: 1.5px solid var(--border);
      border-radius: var(--r);
      padding: 11px 9px 9px;
 
      /* TEXT - MUHIM */
      color: var(--text) !important;
      -webkit-text-fill-color: var(--text) !important;
 
      /* Animation */
      animation: cardIn .28s ease both;
      transition: border-color .2s, transform .2s, box-shadow .2s;
    }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(8px) scale(.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .prod-card:hover {
      border-color: rgba(99,102,241,.45);
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 8px 24px rgba(0,0,0,.4);
    }
    .prod-card:active {
      transform: scale(.97);
      transition-duration: .08s;
    }
    .prod-card:disabled {
      opacity: .45;
      cursor: not-allowed;
      transform: none !important;
    }
 
    .prod-cat-bar {
      position: absolute; top: 0; left: 0; right: 0; height: 3px;
      border-radius: var(--r) var(--r) 0 0;
    }
 
    .prod-img {
      width: 100%; aspect-ratio: 1;
      border-radius: 9px;
      background: var(--sur2);
      border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      font-size: 26px;
      overflow: hidden;
      transition: transform .18s;
      flex-shrink: 0;
    }
    .prod-card:hover .prod-img { transform: scale(1.05); }
 
    /* MATN STILLARI - ANIQ BELGILANGAN */
    .prod-name {
      font-size: 11.5px !important;
      font-weight: 700 !important;
      color: #f0f2ff !important;
      -webkit-text-fill-color: #f0f2ff !important;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
      width: 100%;
      line-height: 1.3;
      opacity: 1 !important;
    }
    .prod-price {
      font-family: var(--mono) !important;
      font-size: 11.5px !important;
      font-weight: 700 !important;
      color: #818cf8 !important;
      -webkit-text-fill-color: #818cf8 !important;
      display: block;
      opacity: 1 !important;
    }
    .prod-stock {
      display: inline-block;
      font-size: 9.5px; font-weight: 600;
      padding: 2px 7px; border-radius: 20px;
    }
    .prod-stock.ok   { color: #10b981 !important; -webkit-text-fill-color: #10b981 !important; background: rgba(16,185,129,.12); }
    .prod-stock.low  { color: #f59e0b !important; -webkit-text-fill-color: #f59e0b !important; background: rgba(245,158,11,.12); }
    .prod-stock.none { color: #ef4444 !important; -webkit-text-fill-color: #ef4444 !important; background: rgba(239,68,68,.12); }
 
    .prod-badge {
      position: absolute; top: 8px; right: 8px;
      width: 20px; height: 20px;
      background: var(--accent); border-radius: 50%;
      font-size: 10px; font-weight: 800; color: #fff !important;
      -webkit-text-fill-color: #fff !important;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(99,102,241,.5);
      animation: badgePop .22s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes badgePop { from { transform: scale(0); } to { transform: scale(1); } }
 
    .empty-state {
      grid-column: 1 / -1;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: var(--muted); padding: 60px 20px; text-align: center; gap: 10px;
    }
    .empty-ico  { font-size: 40px; opacity: .45; }
    .empty-txt  { font-size: 13px; font-weight: 600; }
    .empty-hint { font-size: 11px; color: var(--muted); opacity: .7; }
 
    /* ========== CART PANEL ========== */
    .cart-panel {
      width: var(--cart-w); flex-shrink: 0;
      background: var(--surface); border-left: 1px solid var(--border);
      display: flex; flex-direction: column;
      height: 100%; overflow: hidden;
    }
    .cart-hdr {
      padding: 14px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid var(--border);
    }
    .cart-title-row { display: flex; align-items: center; gap: 8px; }
    .cart-title { font-size: 14px; font-weight: 800; }
    .cart-cnt {
      min-width: 20px; height: 20px; padding: 0 5px;
      background: var(--accent); border-radius: 10px;
      font-size: 10px; font-weight: 800; color: #fff;
      display: flex; align-items: center; justify-content: center;
    }
    .cart-clear {
      background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.2);
      border-radius: 7px; padding: 4px 9px;
      color: #f87171; font-family: var(--font); font-size: 10px; font-weight: 700;
      cursor: pointer; transition: background .15s;
    }
    .cart-clear:hover { background: rgba(239,68,68,.2); }
 
    .cart-list {
      flex: 1; overflow-y: auto; min-height: 0;
      padding: 9px; display: flex; flex-direction: column; gap: 6px;
    }
    .cart-empty {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 10px; color: var(--muted);
    }
    .cart-empty-ico { font-size: 38px; opacity: .3; }
    .cart-empty-txt { font-size: 12px; font-weight: 600; }
 
    .cart-item {
      background: var(--sur2); border: 1px solid var(--border);
      border-radius: var(--rs); padding: 9px;
      display: flex; flex-direction: column; gap: 7px;
      animation: itemIn .18s ease;
    }
    @keyframes itemIn { from { opacity:0; transform: translateX(10px); } to { opacity:1; transform: translateX(0); } }
    .ci-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 7px; }
    .ci-name { font-size: 11.5px; font-weight: 700; color: var(--text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ci-del {
      width: 19px; height: 19px; border: none; border-radius: 5px;
      background: rgba(239,68,68,.1); color: #f87171;
      font-size: 9px; cursor: pointer; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: background .12s;
    }
    .ci-del:hover { background: rgba(239,68,68,.22); }
    .ci-price-btn {
      width: 100%; background: var(--sur3); border: 1px solid var(--border);
      border-radius: 7px; padding: 5px 8px;
      display: flex; align-items: center; gap: 6px; cursor: pointer; transition: border-color .15s;
    }
    .ci-price-btn:hover { border-color: rgba(99,102,241,.4); }
    .ci-price { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--acc2); }
    .ci-orig  { font-family: var(--mono); font-size: 9px; color: var(--muted); text-decoration: line-through; }
    .ci-edit  { margin-left: auto; font-size: 10px; color: var(--muted); }
    .ci-bottom { display: flex; align-items: center; justify-content: space-between; }
    .qty-ctrl  { display: flex; align-items: center; gap: 6px; }
    .qty-btn {
      width: 26px; height: 26px; border: 1px solid var(--border);
      border-radius: 7px; background: var(--sur3); color: var(--text);
      font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all .12s; font-family: var(--mono);
    }
    .qty-btn:hover { background: var(--accbg); border-color: rgba(99,102,241,.4); color: var(--acc2); }
    .qty-val { font-family: var(--mono); font-size: 13px; font-weight: 700; width: 24px; text-align: center; }
    .ci-sub  { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--text); }
 
    /* ---- Pay section ---- */
    .pay-section {
      padding: 12px; flex-shrink: 0;
      border-top: 1px solid var(--border);
      display: flex; flex-direction: column; gap: 10px;
      background: var(--surface);
    }
    .total-row { display: flex; align-items: baseline; justify-content: space-between; }
    .total-lbl { font-size: 9px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .7px; }
    .total-amt { font-family: var(--mono); font-size: 22px; font-weight: 800; color: var(--text); }
    .pay-methods { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; }
    .pay-btn {
      padding: 8px 3px; border-radius: 9px; border: 1.5px solid var(--border);
      background: var(--sur2); color: var(--muted);
      font-family: var(--font); font-size: 10.5px; font-weight: 700;
      cursor: pointer; transition: all .18s;
      display: flex; flex-direction: column; align-items: center; gap: 3px;
    }
    .pay-btn:hover { color: var(--text2); border-color: var(--bord2); }
    .pay-btn-ico { font-size: 14px; }
    .cash-wrap { display: flex; flex-direction: column; gap: 6px; }
    .num-inp {
      width: 100%; background: var(--sur2); border: 1.5px solid var(--border);
      border-radius: 9px; padding: 10px 12px;
      color: var(--text); font-family: var(--mono); font-size: 15px; font-weight: 700;
      outline: none; transition: border-color .18s;
    }
    .num-inp:focus { border-color: rgba(99,102,241,.5); }
    .num-inp::placeholder { color: var(--muted); font-family: var(--font); font-size: 11px; font-weight: 400; }
    .change-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 10px; border-radius: 8px;
      font-family: var(--mono); font-size: 11px; font-weight: 700;
    }
    .change-row.pos { background: rgba(16,185,129,.1); color: #34d399; border: 1px solid rgba(16,185,129,.2); }
    .change-row.neg { background: rgba(239,68,68,.1); color: #f87171; border: 1px solid rgba(239,68,68,.2); }
    .quick-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 4px; }
    .quick-btn {
      padding: 5px 3px; background: var(--sur3); border: 1px solid var(--border);
      border-radius: 6px; color: var(--muted);
      font-family: var(--mono); font-size: 10px; font-weight: 700;
      cursor: pointer; transition: all .12s; text-align: center;
    }
    .quick-btn:hover { border-color: rgba(99,102,241,.35); color: var(--acc2); background: var(--accbg); }
    .checkout-btn {
      width: 100%; padding: 13px; border-radius: 11px; border: none;
      background: linear-gradient(135deg,#6366f1,#8b5cf6);
      color: #fff; font-family: var(--font); font-size: 13px; font-weight: 800;
      cursor: pointer; transition: all .18s; letter-spacing: -.2px;
      box-shadow: 0 4px 18px rgba(99,102,241,.3);
    }
    .checkout-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(99,102,241,.45); }
    .checkout-btn:active:not(:disabled) { transform: translateY(0); transition-duration: .08s; }
    .checkout-btn:disabled { background: var(--sur3); color: var(--muted); cursor: not-allowed; box-shadow: none; }
 
    /* ========== PAGE (tarix/hisobot) ========== */
    .page { flex: 1; overflow-y: auto; padding: 22px; max-width: 1060px; width: 100%; margin: 0 auto; }
    .page-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .page-title { font-size: 19px; font-weight: 800; letter-spacing: -.4px; }
    .refresh-btn {
      padding: 7px 14px; background: var(--sur2); border: 1px solid var(--bord2);
      border-radius: var(--rs); color: var(--muted);
      font-family: var(--font); font-size: 11px; font-weight: 700; cursor: pointer; transition: all .14s;
    }
    .refresh-btn:hover { color: var(--acc2); border-color: rgba(99,102,241,.4); }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(155px,1fr)); gap: 9px; margin-bottom: 20px; }
    .kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; transition: border-color .14s; }
    .kpi-card:hover { border-color: var(--bord2); }
    .kpi-lbl { font-size: 9.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 7px; }
    .kpi-val { font-family: var(--mono); font-size: 17px; font-weight: 700; }
    .sale-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 14px; margin-bottom: 9px; transition: border-color .14s; animation: cardIn .25s ease; }
    .sale-card:hover { border-color: var(--bord2); }
    .sc-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .sc-id   { font-family: var(--mono); font-size: 9.5px; color: var(--muted); }
    .sc-date { font-size: 10.5px; color: var(--muted); margin-top: 2px; }
    .sc-cashier { font-size: 10.5px; font-weight: 600; color: var(--text2); margin-top: 2px; }
    .sc-total { font-family: var(--mono); font-size: 15px; font-weight: 700; color: var(--acc2); }
    .pay-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 9px; border-radius: 20px; font-size: 9.5px; font-weight: 700;
      border: 1px solid; font-family: var(--font); margin-top: 4px;
    }
    .sc-items { border-top: 1px solid var(--border); padding-top: 9px; display: flex; flex-direction: column; gap: 4px; }
    .sc-item-row { display: flex; justify-content: space-between; font-size: 11px; color: var(--text2); font-family: var(--mono); }
    .pay-sum-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 20px; }
    .pay-sum-card { border-radius: var(--r); border: 1px solid; padding: 16px; }
    .pay-sum-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 7px; }
    .pay-sum-val { font-family: var(--mono); font-size: 15px; font-weight: 800; }
    .bar-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 18px; margin-bottom: 12px; }
    .bar-title { font-size: 12px; font-weight: 700; margin-bottom: 14px; }
    .bar-track { height: 9px; background: var(--bg2); border-radius: 5px; overflow: hidden; display: flex; gap: 2px; }
    .bar-seg { height: 100%; border-radius: 3px; transition: width .6s ease; }
    .bar-legend { display: flex; gap: 14px; margin-top: 10px; flex-wrap: wrap; }
    .bar-legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text2); font-weight: 600; }
    .bar-dot { width: 7px; height: 7px; border-radius: 50%; }
    .top-row { display: flex; align-items: center; gap: 11px; margin-bottom: 12px; }
    .top-rank { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--muted); width: 20px; flex-shrink: 0; }
    .top-info { flex: 1; }
    .top-name-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin-bottom: 4px; }
    .top-qty { font-family: var(--mono); font-size: 10px; color: var(--muted); font-weight: 400; }
    .top-bar { height: 4px; background: var(--bg2); border-radius: 2px; }
    .top-bar-fill { height: 100%; background: linear-gradient(90deg,#6366f1,#8b5cf6); border-radius: 2px; transition: width .6s ease; }
    .top-revenue { font-family: var(--mono); font-size: 10px; color: var(--acc2); margin-top: 3px; }
 
    /* ========== MODALS ========== */
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.65);
      display: flex; align-items: center; justify-content: center;
      z-index: 200; padding: 14px; backdrop-filter: blur(10px);
      animation: fadeIn .16s ease;
    }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes modalUp {
      from { transform: translateY(18px) scale(.95); opacity:0; }
      to   { transform: translateY(0) scale(1); opacity:1; }
    }
 
    .wh-modal {
      background: var(--surface); border: 1px solid var(--bord2);
      border-radius: 20px; width: 100%; max-width: 460px; overflow: hidden;
      animation: modalUp .22s cubic-bezier(.34,1.56,.64,1);
      box-shadow: 0 24px 60px rgba(0,0,0,.55);
    }
    .wh-modal-hdr { padding: 20px 18px 16px; border-bottom: 1px solid var(--border); }
    .wh-modal-ttl { font-size: 17px; font-weight: 800; letter-spacing: -.4px; margin-bottom: 3px; }
    .wh-modal-sub { font-size: 11px; color: var(--muted); }
    .wh-list { padding: 10px; display: flex; flex-direction: column; gap: 5px; max-height: 360px; overflow-y: auto; }
    .wh-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; background: var(--sur2);
      border: 1.5px solid var(--border); border-radius: var(--r);
      cursor: pointer; transition: all .18s; text-align: left; width: 100%; font-family: var(--font);
    }
    .wh-item:hover { border-color: rgba(99,102,241,.4); background: var(--accbg); }
    .wh-item.sel { border-color: var(--accent); background: rgba(99,102,241,.12); }
    .wh-item-ico { width: 42px; height: 42px; border-radius: 10px; background: var(--sur3); border: 1px solid var(--bord2); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
    .wh-item-info { flex: 1; min-width: 0; }
    .wh-item-name { font-size: 13px; font-weight: 700; color: var(--text); }
    .wh-item.sel .wh-item-name { color: var(--acc2); }
    .wh-item-addr { font-size: 10px; color: var(--muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .wh-check { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--bord2); display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; transition: all .18s; }
    .wh-item.sel .wh-check { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 2px 9px rgba(99,102,241,.4); }
    .wh-modal-foot { padding: 10px 18px; border-top: 1px solid var(--border); }
    .cancel-btn { width: 100%; padding: 10px; background: var(--sur2); border: 1.5px solid var(--border); border-radius: 9px; color: var(--muted); font-family: var(--font); font-size: 12px; font-weight: 700; cursor: pointer; transition: all .14s; }
    .cancel-btn:hover { color: var(--text); border-color: var(--bord2); }
 
    .modal-box {
      background: var(--surface); border: 1px solid var(--bord2);
      border-radius: 18px; padding: 22px; width: 100%; max-width: 320px;
      animation: modalUp .22s cubic-bezier(.34,1.56,.64,1);
      box-shadow: 0 24px 60px rgba(0,0,0,.55);
    }
    .modal-ttl { font-size: 16px; font-weight: 800; letter-spacing: -.3px; margin-bottom: 3px; }
    .modal-sub { font-size: 11px; color: var(--muted); margin-bottom: 14px; }
    .modal-inp {
      width: 100%; background: var(--bg2); border: 1.5px solid var(--border);
      border-radius: 9px; padding: 12px 13px;
      color: var(--text); font-family: var(--mono); font-size: 18px; font-weight: 700;
      outline: none; transition: border-color .18s;
    }
    .modal-inp:focus { border-color: rgba(99,102,241,.5); background: var(--sur2); }
    .modal-inp::placeholder { color: var(--muted); font-family: var(--font); font-size: 12px; font-weight: 400; }
    .modal-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 14px; }
    .m-cancel { padding: 10px; background: var(--sur2); border: 1.5px solid var(--border); border-radius: 9px; color: var(--muted); font-family: var(--font); font-size: 12px; font-weight: 700; cursor: pointer; transition: color .14s; }
    .m-cancel:hover { color: var(--text); }
    .m-confirm { padding: 10px; background: linear-gradient(135deg,#6366f1,#8b5cf6); border: none; border-radius: 9px; color: #fff; font-family: var(--font); font-size: 12px; font-weight: 800; cursor: pointer; transition: opacity .14s; box-shadow: 0 3px 10px rgba(99,102,241,.35); }
    .m-confirm:hover { opacity: .9; }
 
    /* ========== RECEIPT MODAL ========== */
    .receipt-box {
      background: #0c0e1a; border: 1px solid rgba(255,255,255,.09);
      border-radius: 20px; padding: 22px; width: 100%; max-width: 310px;
      animation: modalUp .22s cubic-bezier(.34,1.56,.64,1);
      box-shadow: 0 24px 60px rgba(0,0,0,.75);
    }
    .r-hdr { text-align: center; margin-bottom: 16px; }
    .r-ico  { font-size: 40px; margin-bottom: 7px; }
    .r-ttl  { font-size: 17px; font-weight: 800; letter-spacing: -.4px; }
    .r-id   { font-family: var(--mono); font-size: 9px; color: var(--muted); margin-top: 3px; }
    .r-cashier { font-size: 10px; color: var(--muted); margin-top: 2px; }
    .r-wh   { font-size: 10px; color: var(--acc2); margin-top: 3px; font-weight: 700; }
    .r-div  { border: none; border-top: 1.5px dashed rgba(255,255,255,.08); margin: 12px 0; }
    .r-row  { display: flex; justify-content: space-between; font-size: 11px; color: var(--text2); margin-bottom: 5px; font-family: var(--mono); }
    .r-row.bold  { font-weight: 800; font-size: 15px; color: var(--text); margin-top: 2px; }
    .r-row.muted { color: var(--muted); }
    .r-thanks { text-align: center; font-size: 10px; color: var(--muted); margin-top: 12px; }
 
    /* CHEK TUGMALARI - PDF + Printer + Yopish */
    .r-btns { display: flex; flex-direction: column; gap: 6px; margin-top: 16px; }
    .r-btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .r-btn {
      padding: 11px; border-radius: 10px;
      font-family: var(--font); font-size: 12px; font-weight: 800;
      cursor: pointer; transition: all .15s;
      display: flex; align-items: center; justify-content: center; gap: 5px;
    }
    .r-btn-print {
      background: rgba(99,102,241,.15); border: 1px solid rgba(99,102,241,.3); color: #818cf8;
    }
    .r-btn-print:hover { background: rgba(99,102,241,.25); }
    .r-btn-pdf {
      background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.25); color: #f87171;
    }
    .r-btn-pdf:hover { background: rgba(239,68,68,.22); }
    .r-btn-thermal {
      background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.25); color: #fbbf24;
    }
    .r-btn-thermal:hover { background: rgba(245,158,11,.22); }
    .r-btn-close {
      background: linear-gradient(135deg,#6366f1,#8b5cf6); border: none; color: #fff;
      box-shadow: 0 3px 14px rgba(99,102,241,.35);
    }
    .r-btn-close:hover { opacity: .9; transform: translateY(-1px); }
 
    /* Printer status indicator */
    .printer-status {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 10px; border-radius: 8px; margin-top: 8px;
      font-size: 10px; font-weight: 600;
    }
    .printer-status.connected { background: rgba(16,185,129,.1); color: #34d399; border: 1px solid rgba(16,185,129,.2); }
    .printer-status.disconnected { background: rgba(99,102,241,.1); color: #818cf8; border: 1px solid rgba(99,102,241,.2); }
  `;
 
  return (
    <>
      <style>{css}</style>
 
      <div className="root">
        {/* ===== TOPBAR ===== */}
        <header className="topbar">
          <div className="logo">
            <div className="logo-mark">K</div>
            <span className="logo-text">Kassa</span>
          </div>
          <nav className="tab-nav">
            {TABS.map(t => (
              <button
                key={t.key}
                className={`tab-btn${tab === t.key ? " active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </nav>
          <div className="topbar-right">
            <button className="wh-pill" onClick={() => setShowWhModal(true)}>
              <span className="wh-dot" />
              <span className="wh-name">
                {whLoading ? "Yuklanmoqda…" : activeWh ? activeWh.name : "Ombor tanlang"}
              </span>
              <span style={{fontSize:8, color:"var(--muted)"}}>▾</span>
            </button>
            <div className="user-chip">{user?.displayName || user?.email || "Cashier"}</div>
          </div>
        </header>
 
        {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
 
        {/* ===== POS ===== */}
        {tab === "pos" && (
          <div className="pos-layout">
 
            {/* --- Products --- */}
            <div className="products-panel">
              <div className="prod-toolbar">
                <div className="wh-bar" onClick={() => setShowWhModal(true)}>
                  <span style={{fontSize:15}}>🏪</span>
                  <span className="wh-bar-lbl">Ombor</span>
                  <span className="wh-bar-name">{activeWh ? activeWh.name : "Tanlanmagan"}</span>
                  {allProducts.length > 0 && <span className="wh-bar-cnt">{filtered.length} ta</span>}
                  <span className="wh-bar-btn">O'zgartirish ▾</span>
                </div>
                <div className="search-wrap">
                  <span className="search-ico">🔍</span>
                  <input
                    className="search-inp"
                    placeholder="Mahsulot qidirish…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {categories.length > 1 && (
                  <div className="cats">
                    {categories.map(c => (
                      <button
                        key={c}
                        className={`cat-pill${selectedCat === c ? " active" : ""}`}
                        onClick={() => setSelectedCat(c)}
                        style={selectedCat === c && c !== "all" ? {background: catColor(c), borderColor: catColor(c)} : {}}
                      >
                        {c === "all" ? "Barchasi" : c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
 
              <div className="products-grid">
                {productsLoading ? (
                  Array.from({length: 18}).map((_, i) => (
                    <div key={i} className="skel-card" style={{animationDelay:`${i * .03}s`}}>
                      <div className="skel-line" style={{width:"100%", aspectRatio:"1", borderRadius:9}} />
                      <div className="skel-line" style={{height:13, borderRadius:4}} />
                      <div className="skel-line" style={{height:12, width:"60%", borderRadius:4}} />
                      <div className="skel-line" style={{height:10, width:"40%", borderRadius:4}} />
                    </div>
                  ))
                ) : filtered.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-ico">📦</div>
                    <div className="empty-txt">
                      {allProducts.length === 0
                        ? "Mahsulotlar topilmadi"
                        : search
                        ? `"${search}" topilmadi`
                        : "Bu kategoriyada mahsulot yo'q"}
                    </div>
                    {allProducts.length === 0 && (
                      <div className="empty-hint">Firebase'da "products" collectionini tekshiring</div>
                    )}
                  </div>
                ) : (
                  filtered.map((p, idx) => {
                    const stock    = getEffectiveStock(p);
                    const price    = getPrice(p);
                    const inCart   = cart.find(i => i.id === p.id);
                    const cat      = getCategory(p);
                    const color    = catColor(cat);
                    const noStock  = stock < 9999 && stock <= 0;
                    const lowStock = stock < 9999 && stock > 0 && stock <= 5;
                    const unknown  = stock >= 9999;
 
                    return (
                      <button
                        key={p.id}
                        className="prod-card"
                        style={{animationDelay: `${Math.min(idx * .022, .45)}s`}}
                        onClick={() => addToCart(p)}
                        disabled={noStock}
                        title={p.name}
                      >
                        <div className="prod-cat-bar" style={{background: color}} />
                        {inCart && <span className="prod-badge">{inCart.quantity}</span>}
 
                        <div className="prod-img">
                          {p.imageUrl
                            ? <img src={p.imageUrl} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:9}} />
                            : <span>📦</span>
                          }
                        </div>
 
                        <span className="prod-name">{p.name || "Nomi yo'q"}</span>
                        <span className="prod-price">{price > 0 ? fmt(price) : "—"}</span>
 
                        <div>
                          {noStock  ? <span className="prod-stock none">✗ Tugagan</span>
                          : lowStock ? <span className="prod-stock low">⚠ {stock} ta</span>
                          : unknown  ? <span className="prod-stock ok">✓ Mavjud</span>
                          :            <span className="prod-stock ok">✓ {stock} ta</span>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
 
            {/* --- Cart --- */}
            <div className="cart-panel">
              <div className="cart-hdr">
                <div className="cart-title-row">
                  <span className="cart-title">Savat</span>
                  {cart.length > 0 && <span className="cart-cnt">{cart.length}</span>}
                </div>
                {cart.length > 0 && (
                  <button className="cart-clear" onClick={clearCart}>Tozalash</button>
                )}
              </div>
 
              <div className="cart-list">
                {cart.length === 0 ? (
                  <div className="cart-empty">
                    <div className="cart-empty-ico">🛒</div>
                    <div className="cart-empty-txt">Savat bo'sh</div>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="cart-item">
                      <div className="ci-top">
                        <span className="ci-name">{item.name}</span>
                        <button className="ci-del" onClick={() => removeFromCart(item.id)}>✕</button>
                      </div>
                      <button className="ci-price-btn" onClick={() => openCustomPrice(item)}>
                        <span className="ci-price">{fmt(item.customPrice)}</span>
                        {item.customPrice !== getPrice(item) && (
                          <span className="ci-orig">{fmt(getPrice(item))}</span>
                        )}
                        <span className="ci-edit">✏</span>
                      </button>
                      <div className="ci-bottom">
                        <div className="qty-ctrl">
                          <button className="qty-btn" onClick={() => updateQty(item.id, item.quantity - 1)}>−</button>
                          <span className="qty-val">{item.quantity}</span>
                          <button className="qty-btn" onClick={() => updateQty(item.id, item.quantity + 1)}>+</button>
                        </div>
                        <span className="ci-sub">{fmt(item.customPrice * item.quantity)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
 
              {/* Payment */}
              <div className="pay-section">
                <div className="total-row">
                  <span className="total-lbl">Jami to'lov</span>
                  <span className="total-amt">{fmt(total)}</span>
                </div>
 
                <div className="pay-methods">
                  {(Object.entries(PAY_CONFIG) as [PayMethod, typeof PAY_CONFIG.cash][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      className="pay-btn"
                      style={payMethod === key ? {background:cfg.bg, borderColor:cfg.border, color:cfg.color} : {}}
                      onClick={() => setPayMethod(key)}
                    >
                      <span className="pay-btn-ico">{cfg.icon}</span>
                      {cfg.label}
                    </button>
                  ))}
                </div>
 
                {payMethod === "cash" && (
                  <div className="cash-wrap">
                    <input
                      className="num-inp"
                      type="number"
                      placeholder="Berilgan pul (so'm)"
                      value={cashGiven || ""}
                      onChange={e => setCashGiven(Number(e.target.value))}
                    />
                    {cashGiven > 0 && (
                      <div className={`change-row ${change >= 0 ? "pos" : "neg"}`}>
                        <span>Qaytim:</span>
                        <span>{fmt(Math.max(0, change))}</span>
                      </div>
                    )}
                    <div className="quick-grid">
                      {[10000,20000,50000,100000,200000,500000].map(a => (
                        <button key={a} className="quick-btn" onClick={() => setCashGiven(a)}>
                          {a >= 1000000 ? a/1000000+"mln" : a/1000+"K"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
 
                <button
                  className="checkout-btn"
                  onClick={handleCheckout}
                  disabled={loading || cart.length === 0 || (payMethod === "cash" && cashGiven < total)}
                >
                  {loading
                    ? "⏳ Amalga oshirilmoqda…"
                    : cart.length === 0
                    ? "Savat bo'sh"
                    : `✓ To'lash — ${fmt(total)}`}
                </button>
              </div>
            </div>
          </div>
        )}
 
        {/* ===== HISTORY ===== */}
        {tab === "history" && (
          <div className="page">
            <div className="page-hdr">
              <div className="page-title">So'nggi sotuvlar</div>
              <button className="refresh-btn" onClick={fetchSales}>↻ Yangilash</button>
            </div>
            {sales.length === 0 ? (
              <div className="empty-state" style={{gridColumn:"unset"}}>
                <div className="empty-ico">📋</div>
                <div className="empty-txt">Sotuvlar yo'q</div>
              </div>
            ) : (
              sales.map(sale => (
                <div key={sale.id} className="sale-card">
                  <div className="sc-top">
                    <div>
                      <div className="sc-id">#{sale.id.slice(-10)}</div>
                      <div className="sc-date">{fmtDate(sale.createdAt)}</div>
                      <div className="sc-cashier">{sale.cashierName}</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>
                        <div className="pay-badge" style={{color:PAY_CONFIG[sale.paymentMethod]?.color, background:PAY_CONFIG[sale.paymentMethod]?.bg, borderColor:PAY_CONFIG[sale.paymentMethod]?.border}}>
                          {PAY_CONFIG[sale.paymentMethod]?.icon} {PAY_CONFIG[sale.paymentMethod]?.label}
                        </div>
                        {sale.warehouseName && (
                          <span style={{fontSize:9.5,color:"#818cf8",background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.2)",borderRadius:20,padding:"2px 7px",fontWeight:700}}>
                            🏪 {sale.warehouseName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div className="sc-total">{fmt(sale.total)}</div>
                      <div style={{display:"flex",gap:5,marginTop:5,justifyContent:"flex-end"}}>
                        <button
                          onClick={() => printBrowser(sale)}
                          style={{padding:"3px 9px",background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.25)",borderRadius:6,color:"#818cf8",fontSize:10,fontWeight:700,cursor:"pointer"}}
                        >🖨️ Chek</button>
                        <button
                          onClick={() => downloadPDF(sale)}
                          style={{padding:"3px 9px",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:6,color:"#f87171",fontSize:10,fontWeight:700,cursor:"pointer"}}
                        >📄 PDF</button>
                      </div>
                    </div>
                  </div>
                  <div className="sc-items">
                    {sale.items?.map((it, i) => (
                      <div key={i} className="sc-item-row">
                        <span>{it.name} × {it.quantity}</span>
                        <span>{fmt(it.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
 
        {/* ===== PAYMENTS ===== */}
        {tab === "payments" && (
          <div className="page">
            <div className="page-hdr">
              <div className="page-title">To'lovlar ro'yxati</div>
              <button className="refresh-btn" onClick={fetchSales}>↻ Yangilash</button>
            </div>
            <div className="pay-sum-grid">
              {(Object.entries(PAY_CONFIG) as [PayMethod, typeof PAY_CONFIG.cash][]).map(([key, cfg]) => {
                const val = sales.filter(s => s.paymentMethod === key).reduce((a,s) => a + s.total, 0);
                return (
                  <div key={key} className="pay-sum-card" style={{background:cfg.bg, borderColor:cfg.border}}>
                    <div className="pay-sum-lbl" style={{color:cfg.color}}>{cfg.icon} {cfg.label}</div>
                    <div className="pay-sum-val" style={{color:cfg.color}}>{fmt(val)}</div>
                  </div>
                );
              })}
            </div>
            {sales.map(sale => (
              <div key={sale.id} className="sale-card" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div className="sc-id">#{sale.id.slice(-10)}</div>
                  <div className="sc-date">{fmtDate(sale.createdAt)}</div>
                  <div style={{fontSize:10.5,color:"var(--text2)",marginTop:2}}>{sale.items?.length} ta mahsulot</div>
                  {sale.warehouseName && (
                    <div style={{fontSize:9.5,color:"#818cf8",marginTop:3,fontWeight:700}}>🏪 {sale.warehouseName}</div>
                  )}
                  {sale.paymentMethod === "cash" && sale.change !== undefined && (
                    <div style={{fontSize:9.5,color:"var(--muted)",marginTop:2,fontFamily:"var(--mono)"}}>
                      Qaytim: {fmt(sale.change)}
                    </div>
                  )}
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="sc-total">{fmt(sale.total)}</div>
                  <div className="pay-badge" style={{color:PAY_CONFIG[sale.paymentMethod]?.color, background:PAY_CONFIG[sale.paymentMethod]?.bg, borderColor:PAY_CONFIG[sale.paymentMethod]?.border}}>
                    {PAY_CONFIG[sale.paymentMethod]?.icon} {PAY_CONFIG[sale.paymentMethod]?.label}
                  </div>
                  <div style={{display:"flex",gap:4,marginTop:5,justifyContent:"flex-end"}}>
                    <button
                      onClick={() => printBrowser(sale)}
                      style={{padding:"3px 9px",background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.25)",borderRadius:6,color:"#818cf8",fontSize:10,fontWeight:700,cursor:"pointer"}}
                    >🖨️</button>
                    <button
                      onClick={() => downloadPDF(sale)}
                      style={{padding:"3px 9px",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:6,color:"#f87171",fontSize:10,fontWeight:700,cursor:"pointer"}}
                    >📄</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
 
        {/* ===== REPORT ===== */}
        {tab === "report" && (
          <div className="page">
            <div className="page-hdr">
              <div className="page-title">Kunlik hisobot</div>
              <button className="refresh-btn" onClick={fetchReport}>↻ Yangilash</button>
            </div>
            <div className="kpi-grid">
              {[
                {label:"Jami daromad",  value:fmt(report.totalRevenue),     color:"#818cf8"},
                {label:"Sotuvlar",      value:report.salesCount+" ta",       color:"#6366f1"},
                {label:"Sotilgan dona", value:report.itemsSold+" dona",      color:"#8b5cf6"},
                {label:"Naqd",          value:fmt(report.cashRevenue),       color:"#10b981"},
                {label:"Karta",         value:fmt(report.cardRevenue),       color:"#6366f1"},
                {label:"O'tkazma",      value:fmt(report.transferRevenue),   color:"#f59e0b"},
              ].map(k => (
                <div key={k.label} className="kpi-card">
                  <div className="kpi-lbl">{k.label}</div>
                  <div className="kpi-val" style={{color:k.color}}>{k.value}</div>
                </div>
              ))}
            </div>
            {report.totalRevenue > 0 && (
              <div className="bar-card">
                <div className="bar-title">To'lov usullari taqsimoti</div>
                <div className="bar-track">
                  {report.cashRevenue > 0 && <div className="bar-seg" style={{width:`${(report.cashRevenue/report.totalRevenue)*100}%`,background:"#10b981"}}/>}
                  {report.cardRevenue > 0 && <div className="bar-seg" style={{width:`${(report.cardRevenue/report.totalRevenue)*100}%`,background:"#6366f1"}}/>}
                  {report.transferRevenue > 0 && <div className="bar-seg" style={{width:`${(report.transferRevenue/report.totalRevenue)*100}%`,background:"#f59e0b"}}/>}
                </div>
                <div className="bar-legend">
                  {[["#10b981","Naqd"],["#6366f1","Karta"],["#f59e0b","O'tkazma"]].map(([c,l]) => (
                    <div key={l} className="bar-legend-item">
                      <div className="bar-dot" style={{background:c}}/>{l}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {report.topProducts.length > 0 && (
              <div className="bar-card">
                <div className="bar-title">🏆 Eng ko'p sotilgan mahsulotlar</div>
                {report.topProducts.map((p, i) => (
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
            {report.salesCount === 0 && (
              <div className="empty-state" style={{gridColumn:"unset"}}>
                <div className="empty-ico">📊</div>
                <div className="empty-txt">Bugun sotuvlar yo'q</div>
              </div>
            )}
          </div>
        )}
 
        {/* ===== WAREHOUSE MODAL ===== */}
        {showWhModal && (
          <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowWhModal(false); }}>
            <div className="wh-modal">
              <div className="wh-modal-hdr">
                <div className="wh-modal-ttl">Ombor tanlang</div>
                <div className="wh-modal-sub">Faqat tanlangan ombordan sotuv amalga oshiriladi</div>
              </div>
              <div className="wh-list">
                {warehouses.length === 0 ? (
                  <div className="empty-state" style={{padding:"28px 0",gridColumn:"unset"}}>
                    <div className="empty-ico">🏪</div>
                    <div className="empty-txt">Omborlar topilmadi</div>
                  </div>
                ) : (
                  warehouses.map(wh => {
                    const isSel = activeWh?.id === wh.id;
                    return (
                      <button key={wh.id} className={`wh-item${isSel ? " sel" : ""}`} onClick={() => selectWarehouse(wh)}>
                        <div className="wh-item-ico">🏪</div>
                        <div className="wh-item-info">
                          <div className="wh-item-name">{wh.name}</div>
                          {wh.address && <div className="wh-item-addr">{wh.address}</div>}
                          {wh.phone   && <div className="wh-item-addr">📞 {wh.phone}</div>}
                        </div>
                        <div className="wh-check">{isSel ? "✓" : ""}</div>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="wh-modal-foot">
                <button className="cancel-btn" onClick={() => setShowWhModal(false)}>Bekor qilish</button>
              </div>
            </div>
          </div>
        )}
 
        {/* ===== CUSTOM PRICE MODAL ===== */}
        {customPriceItem && (
          <div className="overlay" onClick={e => { if (e.target === e.currentTarget) { setCustomPriceItem(null); setTempPrice(""); } }}>
            <div className="modal-box">
              <div className="modal-ttl">Narxni o'zgartirish</div>
              <div className="modal-sub">{customPriceItem.name} · Asl narx: {fmt(getPrice(customPriceItem))}</div>
              <input
                className="modal-inp"
                type="number"
                value={tempPrice}
                onChange={e => setTempPrice(e.target.value)}
                onKeyDown={e => e.key === "Enter" && applyCustomPrice()}
                placeholder="Yangi narx"
                autoFocus
              />
              <div className="modal-btns">
                <button className="m-cancel" onClick={() => { setCustomPriceItem(null); setTempPrice(""); }}>Bekor</button>
                <button className="m-confirm" onClick={applyCustomPrice}>Saqlash</button>
              </div>
            </div>
          </div>
        )}
 
        {/* ===== RECEIPT MODAL ===== */}
        {showReceipt && lastSale && (
          <div className="overlay">
            <div className="receipt-box">
              <div className="r-hdr">
                <div className="r-ico">🧾</div>
                <div className="r-ttl">Sotuv amalga oshdi!</div>
                <div className="r-id">#{lastSale.id?.slice(-10)}</div>
                <div className="r-cashier">{lastSale.cashierName}</div>
                {lastSale.warehouseName && <div className="r-wh">🏪 {lastSale.warehouseName}</div>}
              </div>
 
              <hr className="r-div" />
 
              {lastSale.items?.map((it: any, i: number) => (
                <div key={i} className="r-row">
                  <span>{it.name} × {it.quantity}</span>
                  <span>{fmt(it.subtotal)}</span>
                </div>
              ))}
 
              <hr className="r-div" />
 
              <div className="r-row bold"><span>Jami:</span><span>{fmt(lastSale.total)}</span></div>
              <div className="r-row muted">
                <span>To'lov:</span>
                <span>{PAY_CONFIG[lastSale.paymentMethod]?.icon} {PAY_CONFIG[lastSale.paymentMethod]?.label}</span>
              </div>
 
              {lastSale.paymentMethod === "cash" && (
                <>
                  <div className="r-row muted">
                    <span>Berildi:</span><span>{fmt((lastSale as any).cashGiven)}</span>
                  </div>
                  <div className="r-row bold">
                    <span>Qaytim:</span><span>{fmt((lastSale as any).change)}</span>
                  </div>
                </>
              )}
 
              <div className="r-thanks">Xarid uchun rahmat! 🙏</div>
 
              {/* Printer status */}
              {"serial" in navigator ? (
                <div className="printer-status connected">
                  <span>🖨️</span> Termal printer ulash mumkin
                </div>
              ) : (
                <div className="printer-status disconnected">
                  <span>ℹ️</span> Brauzer chop etish orqali ishlaydi
                </div>
              )}
 
              <div className="r-btns">
                <div className="r-btn-row">
                  {/* Brauzer chek oynasi */}
                  <button
                    className="r-btn r-btn-print"
                    onClick={() => printBrowser(lastSale)}
                  >
                    🖨️ Chek
                  </button>
 
                  {/* PDF chiqarish */}
                  <button
                    className="r-btn r-btn-pdf"
                    onClick={() => downloadPDF(lastSale)}
                  >
                    📄 PDF
                  </button>
                </div>
 
                {/* Termal printer */}
                {"serial" in navigator && (
                  <button
                    className="r-btn r-btn-thermal"
                    onClick={async () => {
                      const ok = await printThermal(lastSale as any);
                      if (ok) showToast("✓ Termal printerga yuborildi!", "ok");
                      else showToast("Printer ulanmadi. Chek oynasini ishlating.", "info");
                    }}
                  >
                    🏷️ Termal printer (ESC/POS)
                  </button>
                )}
 
                <button
                  className="r-btn r-btn-close"
                  onClick={() => setShowReceipt(false)}
                >
                  ✓ Yopish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
 
