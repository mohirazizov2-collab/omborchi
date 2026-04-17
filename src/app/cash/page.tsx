"use client";
 
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
 
// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
 
type Role = "seller" | "superadmin";
 
interface User {
  id: string;
  login: string;
  password: string;
  role: Role;
  name: string;
}
 
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  barcode?: string;
  unit: string;
  stock: number;
  color: string;
}
 
interface OrderItem {
  product: Product;
  qty: number;
  discount: number; // 0-100 percentage
}
 
interface Order {
  id: string;
  items: OrderItem[];
  createdAt: Date;
  cashier: string;
  note: string;
}
 
type PaymentMethod = "cash" | "card" | "mixed";
 
interface PaymentState {
  method: PaymentMethod;
  cashGiven: number;
  cardAmount: number;
  cashAmount: number;
}
 
// ─────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────
 
const USERS: User[] = [
  { id: "u1", login: "admin", password: "admin123", role: "superadmin", name: "Super Admin" },
  { id: "u2", login: "sotuvchi", password: "1234", role: "seller", name: "Sarvar Toshmatov" },
  { id: "u3", login: "seller2", password: "1234", role: "seller", name: "Dilnoza Yusupova" },
];
 
const CATEGORIES = ["Barchasi", "Elektronika", "Kiyim-kechak", "Oziq-ovqat", "Maishiy", "Kosmetika", "Sport"];
 
const PRODUCTS: Product[] = [
  { id: "p1",  name: "Samsung Galaxy S24", price: 8_500_000, category: "Elektronika",    barcode: "4891234560001", unit: "dona", stock: 12, color: "#6366f1" },
  { id: "p2",  name: "Airpods Pro 2",       price: 2_900_000, category: "Elektronika",    barcode: "4891234560002", unit: "dona", stock: 5,  color: "#6366f1" },
  { id: "p3",  name: "Noutbuk HP 15s",      price: 9_200_000, category: "Elektronika",    barcode: "4891234560003", unit: "dona", stock: 3,  color: "#6366f1" },
  { id: "p4",  name: "USB-C Kabel",         price: 45_000,    category: "Elektronika",    barcode: "4891234560004", unit: "dona", stock: 80, color: "#6366f1" },
  { id: "p5",  name: "Erkaklar ko'ylagi",   price: 189_000,   category: "Kiyim-kechak",   barcode: "4891234560005", unit: "dona", stock: 30, color: "#0ea5e9" },
  { id: "p6",  name: "Jins shim",           price: 320_000,   category: "Kiyim-kechak",   barcode: "4891234560006", unit: "dona", stock: 18, color: "#0ea5e9" },
  { id: "p7",  name: "Sport poyabzal",      price: 650_000,   category: "Kiyim-kechak",   barcode: "4891234560007", unit: "dona", stock: 9,  color: "#0ea5e9" },
  { id: "p8",  name: "Non (1kg)",           price: 7_000,     category: "Oziq-ovqat",     barcode: "4891234560008", unit: "kg",   stock: 200,color: "#22c55e" },
  { id: "p9",  name: "Sut (1L)",            price: 12_000,    category: "Oziq-ovqat",     barcode: "4891234560009", unit: "litr", stock: 60, color: "#22c55e" },
  { id: "p10", name: "Yog' (0.5L)",         price: 28_000,    category: "Oziq-ovqat",     barcode: "4891234560010", unit: "dona", stock: 45, color: "#22c55e" },
  { id: "p11", name: "Shakar (1kg)",        price: 14_000,    category: "Oziq-ovqat",     barcode: "4891234560011", unit: "kg",   stock: 100,color: "#22c55e" },
  { id: "p12", name: "Kir yuvish kukuni",   price: 38_000,    category: "Maishiy",        barcode: "4891234560012", unit: "dona", stock: 55, color: "#f59e0b" },
  { id: "p13", name: "Idish yuvish vosita", price: 22_000,    category: "Maishiy",        barcode: "4891234560013", unit: "dona", stock: 70, color: "#f59e0b" },
  { id: "p14", name: "Labada",              price: 85_000,    category: "Kosmetika",      barcode: "4891234560014", unit: "dona", stock: 40, color: "#ec4899" },
  { id: "p15", name: "Atir (50ml)",         price: 450_000,   category: "Kosmetika",      barcode: "4891234560015", unit: "dona", stock: 15, color: "#ec4899" },
  { id: "p16", name: "Futbol to'pi",        price: 280_000,   category: "Sport",          barcode: "4891234560016", unit: "dona", stock: 7,  color: "#f97316" },
  { id: "p17", name: "Velosiped", price: 2_400_000, category: "Sport", barcode: "4891234560017", unit: "dona", stock: 4, color: "#f97316" },
];
 
// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
 
const fmt = (n: number) =>
  new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";
 
const genId = () => Math.random().toString(36).slice(2, 9).toUpperCase();
 
const calcSubtotal = (items: OrderItem[]) =>
  items.reduce((sum, i) => sum + i.product.price * i.qty * (1 - i.discount / 100), 0);
 
// ─────────────────────────────────────────────
// SUBCOMPONENTS
// ─────────────────────────────────────────────
 
// Numpad for payment
function NumPad({ onKey }: { onKey: (k: string) => void }) {
  const keys = ["7","8","9","4","5","6","1","2","3","00","0","⌫"];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
      {keys.map(k => (
        <button key={k} onClick={() => onKey(k)} style={{
          padding:"14px 0", background:"#1e2235", border:"1px solid #2a2d45",
          borderRadius:8, color:"#e2e8f0", fontSize:16, fontFamily:"'JetBrains Mono',monospace",
          cursor:"pointer", transition:"background .1s",
        }}
          onMouseEnter={e => (e.currentTarget.style.background="#252a40")}
          onMouseLeave={e => (e.currentTarget.style.background="#1e2235")}
        >{k}</button>
      ))}
    </div>
  );
}
 
// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
 
export default function CashPage() {
  // ── Auth ──
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginData, setLoginData] = useState({ login: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("seller");
 
  // ── Catalog ──
  const [activeCategory, setActiveCategory] = useState("Barchasi");
  const [search, setSearch] = useState("");
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 
  // ── Order ──
  const [order, setOrder] = useState<Order>({
    id: genId(), items: [], createdAt: new Date(), cashier: "", note: "",
  });
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
 
  // ── Payment modal ──
  const [showPayment, setShowPayment] = useState(false);
  const [payment, setPayment] = useState<PaymentState>({
    method: "cash", cashGiven: 0, cardAmount: 0, cashAmount: 0,
  });
  const [paymentInput, setPaymentInput] = useState("0");
 
  // ── Admin modals ──
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [completedOrders, setCompletedOrders] = useState<(Order & { total: number; payment: PaymentState })[]>([]);
 
  // ── Clock ──
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
 
  // ─── Barcode scanner support ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!currentUser) return;
      if (e.key === "Enter" && barcodeBuffer.length > 4) {
        const found = PRODUCTS.find(p => p.barcode === barcodeBuffer);
        if (found) addToOrder(found);
        setBarcodeBuffer("");
        return;
      }
      if (e.key.length === 1) {
        setBarcodeBuffer(prev => prev + e.key);
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => setBarcodeBuffer(""), 300);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentUser, barcodeBuffer]);
 
  // ─── Filtered products ───
  const filteredProducts = useMemo(() => {
    let list = PRODUCTS;
    if (activeCategory !== "Barchasi") list = list.filter(p => p.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.barcode?.includes(q) ||
        p.price.toString().includes(q)
      );
    }
    return list;
  }, [activeCategory, search]);
 
  // ─── Order calculations ───
  const subtotal = useMemo(() => calcSubtotal(order.items), [order.items]);
  const totalQty = useMemo(() => order.items.reduce((s, i) => s + i.qty, 0), [order.items]);
 
  // ─── Auth ───
  const handleLogin = useCallback(() => {
    const user = USERS.find(
      u => u.login === loginData.login.trim() &&
           u.password === loginData.password &&
           u.role === selectedRole
    );
    if (user) {
      setCurrentUser(user);
      setOrder(o => ({ ...o, cashier: user.name, id: genId(), createdAt: new Date() }));
      setLoginError("");
    } else {
      setLoginError("Login, parol yoki rol noto'g'ri");
    }
  }, [loginData, selectedRole]);
 
  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setOrder({ id: genId(), items: [], createdAt: new Date(), cashier: "", note: "" });
    setLoginData({ login: "", password: "" });
    setShowPayment(false);
    setShowAdminPanel(false);
  }, []);
 
  // ─── Order management ───
  const addToOrder = useCallback((product: Product) => {
    setOrder(prev => {
      const existing = prev.items.findIndex(i => i.product.id === product.id);
      if (existing >= 0) {
        const items = [...prev.items];
        if (items[existing].qty < product.stock) {
          items[existing] = { ...items[existing], qty: items[existing].qty + 1 };
        }
        return { ...prev, items };
      }
      if (product.stock === 0) return prev;
      return { ...prev, items: [...prev.items, { product, qty: 1, discount: 0 }] };
    });
    setSelectedLine(product.id);
  }, []);
 
  const updateQty = useCallback((productId: string, delta: number) => {
    setOrder(prev => {
      const items = prev.items
        .map(i => {
          if (i.product.id !== productId) return i;
          const newQty = i.qty + delta;
          if (newQty <= 0) return null;
          if (newQty > i.product.stock) return i;
          return { ...i, qty: newQty };
        })
        .filter(Boolean) as OrderItem[];
      return { ...prev, items };
    });
  }, []);
 
  const setDiscount = useCallback((productId: string, discount: number) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.product.id === productId ? { ...i, discount: Math.min(100, Math.max(0, discount)) } : i
      ),
    }));
  }, []);
 
  const removeItem = useCallback((productId: string) => {
    setOrder(prev => ({ ...prev, items: prev.items.filter(i => i.product.id !== productId) }));
    setSelectedLine(null);
  }, []);
 
  const clearOrder = useCallback(() => {
    setOrder(prev => ({ ...prev, items: [], id: genId(), createdAt: new Date(), note: "" }));
    setSelectedLine(null);
  }, []);
 
  // ─── Payment logic ───
  const openPayment = () => {
    setPayment({ method: "cash", cashGiven: 0, cardAmount: 0, cashAmount: subtotal });
    setPaymentInput(subtotal.toString());
    setShowPayment(true);
  };
 
  const handleNumKey = (k: string) => {
    setPaymentInput(prev => {
      if (k === "⌫") return prev.length > 1 ? prev.slice(0, -1) : "0";
      if (k === "00") return prev === "0" ? "0" : prev + "00";
      if (prev === "0") return k;
      return prev + k;
    });
  };
 
  const numVal = parseInt(paymentInput || "0");
  const change = payment.method === "cash" ? numVal - subtotal : 0;
 
  const confirmPayment = () => {
    if (subtotal === 0) return;
    if (payment.method === "cash" && numVal < subtotal) return;
    const completed = {
      ...order,
      total: subtotal,
      payment: {
        ...payment,
        cashGiven: numVal,
        cashAmount: payment.method === "mixed" ? payment.cashAmount : payment.method === "cash" ? numVal : 0,
        cardAmount: payment.method === "mixed" ? payment.cardAmount : payment.method === "card" ? subtotal : 0,
      },
    };
    setCompletedOrders(prev => [completed, ...prev]);
    setShowPayment(false);
    clearOrder();
  };
 
  // ─────────────────────────────────────────────
  // LOGIN SCREEN
  // ─────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div style={{
        minHeight: "100vh", background: "#080b14",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
      }}>
        {/* grid lines bg */}
        <div style={{
          position:"fixed", inset:0, opacity:.04,
          backgroundImage:"linear-gradient(#6366f1 1px, transparent 1px),linear-gradient(90deg,#6366f1 1px,transparent 1px)",
          backgroundSize:"40px 40px", pointerEvents:"none",
        }}/>
 
        <div style={{
          background:"#0d1120", border:"1px solid #1e2440",
          borderRadius:20, padding:"44px 40px", width:400,
          boxShadow:"0 0 80px rgba(99,102,241,.12)",
          position:"relative",
        }}>
          {/* top accent line */}
          <div style={{ position:"absolute", top:0, left:40, right:40, height:2, background:"linear-gradient(90deg,transparent,#6366f1,transparent)", borderRadius:999 }}/>
 
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ fontSize:11, letterSpacing:4, color:"#475569", marginBottom:8, fontWeight:500 }}>KASSA TIZIMI v2.0</div>
            <div style={{ fontSize:26, fontWeight:700, color:"#e2e8f0", letterSpacing:-.5 }}>Kirish</div>
            <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>Faqat vakolatli xodimlar uchun</div>
          </div>
 
          {/* Role selector */}
          <div style={{ display:"flex", background:"#080b14", borderRadius:10, padding:4, marginBottom:24, border:"1px solid #1e2440" }}>
            {(["seller","superadmin"] as Role[]).map(r => (
              <button key={r} onClick={() => setSelectedRole(r)} style={{
                flex:1, padding:"9px 0", borderRadius:7, border:"none", cursor:"pointer",
                background: selectedRole === r ? "#1e2440" : "transparent",
                color: selectedRole === r ? "#a5b4fc" : "#475569",
                fontSize:13, fontWeight: selectedRole === r ? 600 : 400, transition:"all .2s",
              }}>
                {r === "seller" ? "Sotuvchi" : "Super Admin"}
              </button>
            ))}
          </div>
 
          {[
            { label:"Login", key:"login", type:"text", placeholder:"login kiriting" },
            { label:"Parol", key:"password", type:"password", placeholder:"••••••••" },
          ].map(f => (
            <div key={f.key} style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:"#475569", marginBottom:6, letterSpacing:1, fontWeight:500 }}>{f.label}</div>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={(loginData as Record<string,string>)[f.key]}
                onChange={e => setLoginData(prev => ({ ...prev, [f.key]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{
                  width:"100%", padding:"11px 14px", background:"#080b14",
                  border:"1px solid #1e2440", borderRadius:9, color:"#e2e8f0",
                  fontSize:14, outline:"none", boxSizing:"border-box",
                  fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif",
                }}
              />
            </div>
          ))}
 
          {loginError && (
            <div style={{ fontSize:12, color:"#f87171", marginBottom:12, padding:"8px 12px", background:"rgba(248,113,113,.1)", borderRadius:7, border:"1px solid rgba(248,113,113,.2)" }}>
              {loginError}
            </div>
          )}
 
          <button onClick={handleLogin} style={{
            width:"100%", padding:13, marginTop:4,
            background:"linear-gradient(135deg,#6366f1,#818cf8)",
            border:"none", borderRadius:9, color:"white",
            fontSize:14, fontWeight:600, cursor:"pointer", letterSpacing:.3,
          }}>
            Kirish →
          </button>
 
          <div style={{ marginTop:20, textAlign:"center", fontSize:12, color:"#2d3556" }}>
            Demo: sotuvchi / 1234 &nbsp;|&nbsp; admin / admin123
          </div>
        </div>
      </div>
    );
  }
 
  const isSuperAdmin = currentUser.role === "superadmin";
 
  // ─────────────────────────────────────────────
  // POS MAIN INTERFACE
  // ─────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh", background: "#080b14",
      display: "flex", flexDirection: "column",
      fontFamily: "'IBM Plex Sans','Segoe UI',sans-serif",
      color: "#e2e8f0", overflow: "hidden",
    }}>
 
      {/* ── TOPBAR ── */}
      <div style={{
        height: 52, background: "#0d1120", borderBottom: "1px solid #1a1e30",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", flexShrink: 0,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ fontSize:11, letterSpacing:3, color:"#6366f1", fontWeight:700 }}>KASSA</div>
          <div style={{ width:1, height:20, background:"#1e2440" }}/>
          <div style={{ fontSize:13, color:"#94a3b8" }}>
            Smena: <span style={{ color:"#e2e8f0", fontWeight:500 }}>{currentUser.name}</span>
          </div>
          <div style={{
            fontSize:11, padding:"3px 8px", borderRadius:5, fontWeight:600,
            background: isSuperAdmin ? "rgba(99,102,241,.15)" : "rgba(34,197,94,.1)",
            color: isSuperAdmin ? "#a5b4fc" : "#4ade80",
            border: `1px solid ${isSuperAdmin ? "rgba(99,102,241,.3)" : "rgba(34,197,94,.2)"}`,
          }}>
            {isSuperAdmin ? "SUPER ADMIN" : "SOTUVCHI"}
          </div>
        </div>
 
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <div style={{ fontSize:13, color:"#475569", fontFamily:"'JetBrains Mono',monospace" }}>
            {now.toLocaleTimeString("uz-UZ")} &nbsp;
            <span style={{ color:"#2d3556" }}>{now.toLocaleDateString("uz-UZ")}</span>
          </div>
          {isSuperAdmin && (
            <button onClick={() => setShowAdminPanel(true)} style={{
              padding:"5px 14px", background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.25)",
              borderRadius:7, color:"#a5b4fc", fontSize:12, cursor:"pointer", fontWeight:500,
            }}>
              Admin panel
            </button>
          )}
          <button onClick={handleLogout} style={{
            padding:"5px 14px", background:"transparent", border:"1px solid #1e2440",
            borderRadius:7, color:"#64748b", fontSize:12, cursor:"pointer",
          }}>
            Chiqish
          </button>
        </div>
      </div>
 
      {/* ── BODY ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
 
        {/* ── LEFT: ORDER PANEL ── */}
        <div style={{
          width:320, background:"#0a0d1a", borderRight:"1px solid #1a1e30",
          display:"flex", flexDirection:"column", flexShrink:0,
        }}>
          {/* Order header */}
          <div style={{ padding:"12px 16px", borderBottom:"1px solid #1a1e30", background:"#0d1120" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <span style={{ fontSize:11, color:"#475569" }}>Buyurtma </span>
                <span style={{ fontSize:12, color:"#6366f1", fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>#{order.id}</span>
              </div>
              <span style={{ fontSize:11, color:"#2d3556" }}>
                {order.createdAt.toLocaleTimeString("uz-UZ")}
              </span>
            </div>
          </div>
 
          {/* Order items */}
          <div style={{ flex:1, overflowY:"auto", padding:8 }}>
            {order.items.length === 0 ? (
              <div style={{ textAlign:"center", marginTop:60, color:"#2d3556" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🛒</div>
                <div style={{ fontSize:13 }}>Mahsulot qo'shing</div>
              </div>
            ) : order.items.map(item => (
              <div
                key={item.product.id}
                onClick={() => setSelectedLine(prev => prev === item.product.id ? null : item.product.id)}
                style={{
                  padding:"10px 12px", borderRadius:9, marginBottom:4, cursor:"pointer",
                  background: selectedLine === item.product.id ? "rgba(99,102,241,.08)" : "transparent",
                  border: selectedLine === item.product.id ? "1px solid rgba(99,102,241,.2)" : "1px solid transparent",
                  transition:"all .15s",
                }}
              >
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, color:"#e2e8f0", fontWeight:500, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {item.product.name}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:12, color:"#6366f1", fontFamily:"'JetBrains Mono',monospace" }}>
                        {fmt(item.product.price)}
                      </span>
                      {item.discount > 0 && (
                        <span style={{ fontSize:10, color:"#f59e0b", background:"rgba(245,158,11,.1)", padding:"1px 5px", borderRadius:4 }}>
                          -{item.discount}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", marginLeft:8, flexShrink:0 }}>
                    <div style={{ fontSize:13, color:"#e2e8f0", fontWeight:600, fontFamily:"'JetBrains Mono',monospace" }}>
                      {fmt(item.product.price * item.qty * (1 - item.discount / 100))}
                    </div>
                    <div style={{ fontSize:11, color:"#475569" }}>x{item.qty} {item.product.unit}</div>
                  </div>
                </div>
 
                {/* Expanded controls */}
                {selectedLine === item.product.id && (
                  <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #1a1e30", display:"flex", gap:6 }}>
                    <button onClick={e => { e.stopPropagation(); updateQty(item.product.id, -1); }} style={ctrlBtn}>−</button>
                    <span style={{ flex:1, textAlign:"center", fontSize:14, fontWeight:700, color:"#e2e8f0", fontFamily:"'JetBrains Mono',monospace", lineHeight:"32px" }}>{item.qty}</span>
                    <button onClick={e => { e.stopPropagation(); updateQty(item.product.id, 1); }} style={ctrlBtn}>+</button>
                    {isSuperAdmin && (
                      <input
                        type="number" min="0" max="100"
                        value={item.discount}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setDiscount(item.product.id, parseInt(e.target.value) || 0)}
                        placeholder="%"
                        style={{ ...ctrlBtn, width:48, textAlign:"center", fontFamily:"'JetBrains Mono',monospace", background:"rgba(245,158,11,.08)", borderColor:"rgba(245,158,11,.2)", color:"#f59e0b" }}
                      />
                    )}
                    <button onClick={e => { e.stopPropagation(); removeItem(item.product.id); }} style={{ ...ctrlBtn, borderColor:"rgba(248,113,113,.2)", color:"#f87171", background:"rgba(248,113,113,.05)" }}>✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
 
          {/* Order footer */}
          <div style={{ padding:"12px 16px", borderTop:"1px solid #1a1e30", background:"#0d1120" }}>
            <div style={{ display:"flex", gap:6, marginBottom:12 }}>
              <button onClick={clearOrder} style={{ ...actionBtn, flex:1, color:"#f87171", borderColor:"rgba(248,113,113,.2)" }}>
                Tozalash
              </button>
              <button
                onClick={() => setOrder(o => ({ ...o, note: prompt("Izoh kiriting:") || o.note }))}
                style={{ ...actionBtn, flex:1 }}
              >
                Izoh
              </button>
            </div>
 
            <div style={{ fontSize:12, color:"#475569", marginBottom:6, display:"flex", justifyContent:"space-between" }}>
              <span>Mahsulotlar soni:</span><span style={{ color:"#94a3b8" }}>{totalQty} ta</span>
            </div>
            <div style={{ fontSize:12, color:"#475569", marginBottom:10, display:"flex", justifyContent:"space-between" }}>
              <span>Buyurtma ID:</span>
              <span style={{ color:"#6366f1", fontFamily:"'JetBrains Mono',monospace" }}>#{order.id}</span>
            </div>
 
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <span style={{ fontSize:14, color:"#94a3b8", fontWeight:500 }}>Jami:</span>
              <span style={{ fontSize:20, color:"#e2e8f0", fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>
                {fmt(subtotal)}
              </span>
            </div>
 
            <button
              onClick={openPayment}
              disabled={order.items.length === 0}
              style={{
                width:"100%", padding:"13px 0",
                background: order.items.length ? "linear-gradient(135deg,#6366f1,#818cf8)" : "#1a1e30",
                border:"none", borderRadius:10, color: order.items.length ? "white" : "#2d3556",
                fontSize:14, fontWeight:700, cursor: order.items.length ? "pointer" : "not-allowed",
                letterSpacing:.5, transition:"all .2s",
              }}
            >
              TO'LASH →
            </button>
          </div>
        </div>
 
        {/* ── CENTER: CATALOG ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
 
          {/* Category tabs */}
          <div style={{
            height:48, borderBottom:"1px solid #1a1e30", background:"#0d1120",
            display:"flex", alignItems:"center", gap:4, padding:"0 12px", overflowX:"auto", flexShrink:0,
          }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                padding:"6px 16px", borderRadius:7, border:"1px solid",
                borderColor: activeCategory === cat ? "rgba(99,102,241,.4)" : "#1e2440",
                background: activeCategory === cat ? "rgba(99,102,241,.1)" : "transparent",
                color: activeCategory === cat ? "#a5b4fc" : "#475569",
                fontSize:12, fontWeight: activeCategory === cat ? 600 : 400,
                cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"all .15s",
              }}>{cat}</button>
            ))}
          </div>
 
          {/* Search */}
          <div style={{ padding:"10px 14px", borderBottom:"1px solid #1a1e30", background:"#0a0d1a", flexShrink:0 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Mahsulot nomi, shtrix-kod yoki narx..."
              style={{
                width:"100%", padding:"9px 14px", background:"#0d1120",
                border:"1px solid #1e2440", borderRadius:8, color:"#e2e8f0",
                fontSize:13, outline:"none", boxSizing:"border-box",
                fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif",
              }}
            />
          </div>
 
          {/* Product grid */}
          <div style={{
            flex:1, overflowY:"auto", padding:12,
            display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))", gap:10, alignContent:"start",
          }}>
            {filteredProducts.map(product => {
              const inOrder = order.items.find(i => i.product.id === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => addToOrder(product)}
                  disabled={product.stock === 0}
                  style={{
                    background: inOrder ? `${product.color}12` : "#0d1120",
                    border: `1px solid ${inOrder ? product.color + "40" : "#1e2440"}`,
                    borderRadius:12, padding:"14px 10px 12px",
                    cursor: product.stock === 0 ? "not-allowed" : "pointer",
                    textAlign:"left", transition:"all .15s", position:"relative",
                    opacity: product.stock === 0 ? .4 : 1,
                  }}
                  onMouseEnter={e => { if (product.stock > 0) e.currentTarget.style.borderColor = product.color + "80"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = inOrder ? product.color + "40" : "#1e2440"; }}
                >
                  {inOrder && (
                    <div style={{
                      position:"absolute", top:8, right:8,
                      background: product.color, color:"white",
                      fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:5,
                      fontFamily:"'JetBrains Mono',monospace",
                    }}>×{inOrder.qty}</div>
                  )}
                  <div style={{ width:8, height:8, borderRadius:"50%", background:product.color, marginBottom:8 }}/>
                  <div style={{ fontSize:12, color:"#e2e8f0", fontWeight:500, lineHeight:1.35, marginBottom:6, minHeight:32 }}>
                    {product.name}
                  </div>
                  <div style={{ fontSize:13, color: product.color, fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>
                    {fmt(product.price)}
                  </div>
                  <div style={{ fontSize:10, color:"#2d3556", marginTop:3 }}>
                    Qoldiq: {product.stock} {product.unit}
                  </div>
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <div style={{ gridColumn:"1/-1", textAlign:"center", marginTop:60, color:"#2d3556" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
                <div>Mahsulot topilmadi</div>
              </div>
            )}
          </div>
        </div>
      </div>
 
      {/* ── PAYMENT MODAL ── */}
      {showPayment && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.75)", backdropFilter:"blur(4px)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:100,
        }}>
          <div style={{
            background:"#0d1120", border:"1px solid #1e2440", borderRadius:16,
            width:440, padding:28, boxShadow:"0 0 60px rgba(0,0,0,.5)",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0" }}>To'lov</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#6366f1", fontFamily:"'JetBrains Mono',monospace" }}>
                {fmt(subtotal)}
              </div>
            </div>
 
            {/* Payment method */}
            <div style={{ display:"flex", gap:6, marginBottom:18 }}>
              {(["cash","card","mixed"] as PaymentMethod[]).map(m => (
                <button key={m} onClick={() => setPayment(p => ({ ...p, method: m }))} style={{
                  flex:1, padding:"9px 0", borderRadius:8, border:"1px solid",
                  borderColor: payment.method === m ? "rgba(99,102,241,.5)" : "#1e2440",
                  background: payment.method === m ? "rgba(99,102,241,.1)" : "transparent",
                  color: payment.method === m ? "#a5b4fc" : "#475569",
                  fontSize:12, fontWeight:600, cursor:"pointer",
                }}>
                  { m === "cash" ? "💵 Naqd" : m === "card" ? "💳 Karta" : "🔀 Aralash" }
                </button>
              ))}
            </div>
 
            {/* Amount input */}
            <div style={{
              background:"#080b14", border:"1px solid #1e2440", borderRadius:10,
              padding:"12px 16px", marginBottom:14, textAlign:"right",
            }}>
              <div style={{ fontSize:11, color:"#475569", marginBottom:4 }}>
                { payment.method === "cash" ? "Berilgan naqd pul" : payment.method === "card" ? "Karta summasi" : "Naqd qismi" }
              </div>
              <div style={{ fontSize:26, fontWeight:700, color:"#e2e8f0", fontFamily:"'JetBrains Mono',monospace" }}>
                {new Intl.NumberFormat("uz-UZ").format(parseInt(paymentInput) || 0)} so'm
              </div>
            </div>
 
            <NumPad onKey={handleNumKey} />
 
            {/* Change display */}
            {payment.method === "cash" && (
              <div style={{
                marginTop:14, padding:"10px 14px", borderRadius:8,
                background: change >= 0 ? "rgba(34,197,94,.08)" : "rgba(248,113,113,.08)",
                border: `1px solid ${change >= 0 ? "rgba(34,197,94,.2)" : "rgba(248,113,113,.2)"}`,
                display:"flex", justifyContent:"space-between",
              }}>
                <span style={{ fontSize:13, color:"#475569" }}>Qaytim:</span>
                <span style={{ fontSize:14, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color: change >= 0 ? "#4ade80" : "#f87171" }}>
                  {fmt(Math.max(0, change))}
                </span>
              </div>
            )}
 
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <button onClick={() => setShowPayment(false)} style={{
                flex:1, padding:13, background:"transparent", border:"1px solid #1e2440",
                borderRadius:9, color:"#475569", fontSize:13, cursor:"pointer",
              }}>Bekor</button>
              <button
                onClick={confirmPayment}
                disabled={payment.method === "cash" && numVal < subtotal}
                style={{
                  flex:2, padding:13,
                  background: (payment.method !== "cash" || numVal >= subtotal)
                    ? "linear-gradient(135deg,#22c55e,#4ade80)" : "#1a1e30",
                  border:"none", borderRadius:9,
                  color: (payment.method !== "cash" || numVal >= subtotal) ? "white" : "#2d3556",
                  fontSize:14, fontWeight:700, cursor:"pointer",
                }}
              >
                ✓ Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* ── ADMIN PANEL MODAL ── */}
      {showAdminPanel && isSuperAdmin && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.8)", backdropFilter:"blur(4px)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:100,
        }}>
          <div style={{
            background:"#0d1120", border:"1px solid #1e2440", borderRadius:16,
            width:700, maxHeight:"80vh", padding:28, overflow:"hidden", display:"flex", flexDirection:"column",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0" }}>Admin panel — Savdolar tarixi</div>
              <button onClick={() => setShowAdminPanel(false)} style={{
                background:"transparent", border:"1px solid #1e2440",
                borderRadius:7, color:"#475569", fontSize:12, padding:"5px 12px", cursor:"pointer",
              }}>✕ Yopish</button>
            </div>
 
            {/* Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
              {[
                { label:"Jami savdolar", value: completedOrders.length + " ta" },
                { label:"Umumiy tushum", value: fmt(completedOrders.reduce((s,o) => s+o.total, 0)) },
                { label:"O'rtacha chek", value: completedOrders.length ? fmt(completedOrders.reduce((s,o) => s+o.total, 0)/completedOrders.length) : "—" },
              ].map(stat => (
                <div key={stat.label} style={{ background:"#080b14", border:"1px solid #1e2440", borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:11, color:"#475569", marginBottom:4 }}>{stat.label}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0", fontFamily:"'JetBrains Mono',monospace" }}>{stat.value}</div>
                </div>
              ))}
            </div>
 
            {/* Orders list */}
            <div style={{ flex:1, overflowY:"auto" }}>
              {completedOrders.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#2d3556" }}>Hali savdo yo'q</div>
              ) : completedOrders.map((o, idx) => (
                <div key={idx} style={{
                  padding:"12px 14px", borderRadius:9, border:"1px solid #1e2440",
                  marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center",
                }}>
                  <div>
                    <div style={{ fontSize:13, color:"#e2e8f0", fontWeight:500 }}>
                      #{o.id} — {o.cashier}
                    </div>
                    <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>
                      {o.items.map(i => `${i.product.name} x${i.qty}`).join(", ")}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#6366f1", fontFamily:"'JetBrains Mono',monospace" }}>
                      {fmt(o.total)}
                    </div>
                    <div style={{ fontSize:11, color:"#475569" }}>
                      {o.payment.method === "cash" ? "Naqd" : o.payment.method === "card" ? "Karta" : "Aralash"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 
// ─── Shared button styles ───
const ctrlBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 7, border: "1px solid #1e2440",
  background: "#0d1120", color: "#94a3b8", fontSize: 16, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "'JetBrains Mono',monospace",
};
 
const actionBtn: React.CSSProperties = {
  padding: "7px 12px", background: "transparent", border: "1px solid #1e2440",
  borderRadius: 7, color: "#475569", fontSize: 12, cursor: "pointer",
};
