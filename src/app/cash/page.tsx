"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
} from "firebase/firestore";
import { app } from "@/lib/firebase";

// ─────────────────────────────────────────────
// FIREBASE
// ─────────────────────────────────────────────
const auth = getAuth(app);
const db   = getFirestore(app);

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type Role = "cashier" | "seller" | "admin" | "master";

interface StaffDoc {
  uid: string;
  name: string;
  email: string;
  role: Role;
  warehouseId?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  barcode?: string;
  unit: string;
  stock: number;
  warehouseId: string;
  color?: string;
}

interface OrderItem {
  product: Product;
  qty: number;
  discount: number;
}

interface ActiveOrder {
  id: string;
  items: OrderItem[];
  createdAt: Date;
  note: string;
}

type PaymentMethod = "cash" | "card" | "mixed";

interface PaymentState {
  method: PaymentMethod;
  cashGiven: number;
  cardAmount: number;
  cashAmount: number;
}

interface SaleRecord {
  id: string;
  cashierName: string;
  total: number;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  items: { name: string; qty: number; price: number }[];
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";

const genId = () =>
  Math.random().toString(36).slice(2, 7).toUpperCase();

const calcSubtotal = (items: OrderItem[]) =>
  items.reduce((s, i) => s + i.product.price * i.qty * (1 - i.discount / 100), 0);

const CATEGORY_COLORS: Record<string, string> = {
  Elektronika: "#6366f1",
  "Kiyim-kechak": "#0ea5e9",
  "Oziq-ovqat": "#22c55e",
  Maishiy: "#f59e0b",
  Kosmetika: "#ec4899",
  Sport: "#f97316",
};
const colorFor = (cat: string) => CATEGORY_COLORS[cat] ?? "#94a3b8";

// ─────────────────────────────────────────────
// NUMPAD
// ─────────────────────────────────────────────

function NumPad({ onKey }: { onKey: (k: string) => void }) {
  const keys = ["7","8","9","4","5","6","1","2","3","00","0","⌫"];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
      {keys.map(k => (
        <button
          key={k}
          onClick={() => onKey(k)}
          style={{
            padding:"14px 0", background:"#1e2235", border:"1px solid #2a2d45",
            borderRadius:8, color:"#e2e8f0", fontSize:16,
            fontFamily:"'JetBrains Mono',monospace", cursor:"pointer",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#252a40")}
          onMouseLeave={e => (e.currentTarget.style.background = "#1e2235")}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function CashPage() {

  // ── Auth ──
  const [fbUser,      setFbUser]      = useState<FirebaseUser | null>(null);
  const [staff,       setStaff]       = useState<StaffDoc | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Login form ──
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy,  setLoginBusy]  = useState(false);

  // ── Catalog ──
  const [products,        setProducts]        = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [activeCategory,  setActiveCategory]  = useState("Barchasi");
  const [search,          setSearch]          = useState("");

  // ── Barcode ──
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Order ──
  const [order, setOrder] = useState<ActiveOrder>({
    id: genId(), items: [], createdAt: new Date(), note: "",
  });
  const [selectedLine, setSelectedLine] = useState<string | null>(null);

  // ── Payment ──
  const [showPayment, setShowPayment] = useState(false);
  const [payment,     setPayment]     = useState<PaymentState>({
    method:"cash", cashGiven:0, cardAmount:0, cashAmount:0,
  });
  const [payInput, setPayInput] = useState("0");
  const [payBusy,  setPayBusy]  = useState(false);

  // ── Admin ──
  const [showAdmin,    setShowAdmin]    = useState(false);
  const [sales,        setSales]        = useState<SaleRecord[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);

  // ── Clock ──
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ─────────────────────────────────────────────
  // AUTH LISTENER — Firebase Auth state
  // ─────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);
      if (user) {
        try {
          const snap = await getDoc(doc(db, "staff", user.uid));
          if (snap.exists()) {
            setStaff({ uid: user.uid, ...(snap.data() as Omit<StaffDoc, "uid">) });
          } else {
            // Staff doc yo'q — master admin deb qabul qilamiz
            setStaff({
              uid:   user.uid,
              name:  user.displayName ?? user.email ?? "Admin",
              email: user.email ?? "",
              role:  "master",
            });
          }
        } catch {
          setStaff({
            uid:   user.uid,
            name:  user.displayName ?? user.email ?? "Admin",
            email: user.email ?? "",
            role:  "master",
          });
        }
      } else {
        setStaff(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // ─────────────────────────────────────────────
  // PRODUCTS — Firestore real-time
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!staff) return;
    setProductsLoading(true);

    const q = staff.warehouseId
      ? query(collection(db, "products"), where("warehouseId", "==", staff.warehouseId))
      : query(collection(db, "products"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Product[] = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Product, "id">),
          color: colorFor(d.data().category ?? ""),
        }));
        setProducts(list);
        setProductsLoading(false);
      },
      (err) => {
        console.error("Products error:", err);
        setProductsLoading(false);
      }
    );
    return () => unsub();
  }, [staff]);

  // ─────────────────────────────────────────────
  // BARCODE SCANNER — keyboard listener
  // ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!staff) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Enter" && barcodeBuffer.length >= 4) {
        const found = products.find(p => p.barcode === barcodeBuffer);
        if (found) addToOrder(found);
        setBarcodeBuffer("");
        return;
      }
      if (e.key.length === 1 && /[\d\w]/.test(e.key)) {
        setBarcodeBuffer(prev => prev + e.key);
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => setBarcodeBuffer(""), 300);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [staff, barcodeBuffer, products]);

  // ─────────────────────────────────────────────
  // COMPUTED
  // ─────────────────────────────────────────────
  const isAdmin = staff
    ? ["admin","master"].includes(staff.role) || staff.email === "f2472839@gmail.com"
    : false;

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category)));
    return ["Barchasi", ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== "Barchasi")
      list = list.filter(p => p.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.barcode?.includes(q) ||
        String(p.price).includes(q)
      );
    }
    return list;
  }, [products, activeCategory, search]);

  const subtotal = useMemo(() => calcSubtotal(order.items), [order.items]);
  const totalQty = useMemo(() => order.items.reduce((s,i) => s+i.qty, 0), [order.items]);
  const numVal   = parseInt(payInput || "0");
  const change   = payment.method === "cash" ? numVal - subtotal : 0;

  // ─────────────────────────────────────────────
  // AUTH ACTIONS
  // ─────────────────────────────────────────────
  const handleLogin = useCallback(async () => {
    if (!email || !password) return;
    setLoginBusy(true);
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (["auth/user-not-found","auth/wrong-password","auth/invalid-credential"].includes(code))
        setLoginError("Email yoki parol noto'g'ri");
      else if (code === "auth/too-many-requests")
        setLoginError("Ko'p urinish. Keyinroq sinang.");
      else if (code === "auth/invalid-email")
        setLoginError("Email formati noto'g'ri");
      else
        setLoginError("Kirish xatosi: " + code);
    } finally {
      setLoginBusy(false);
    }
  }, [email, password]);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    setOrder({ id:genId(), items:[], createdAt:new Date(), note:"" });
    setShowPayment(false);
    setShowAdmin(false);
  }, []);

  // ─────────────────────────────────────────────
  // ORDER ACTIONS
  // ─────────────────────────────────────────────
  const addToOrder = useCallback((product: Product) => {
    if (product.stock === 0) return;
    setOrder(prev => {
      const idx = prev.items.findIndex(i => i.product.id === product.id);
      if (idx >= 0) {
        const items = [...prev.items];
        if (items[idx].qty < product.stock)
          items[idx] = { ...items[idx], qty: items[idx].qty + 1 };
        return { ...prev, items };
      }
      return { ...prev, items: [...prev.items, { product, qty:1, discount:0 }] };
    });
    setSelectedLine(product.id);
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items
        .map(i => {
          if (i.product.id !== productId) return i;
          const q = i.qty + delta;
          if (q <= 0) return null;
          if (q > i.product.stock) return i;
          return { ...i, qty: q };
        })
        .filter(Boolean) as OrderItem[],
    }));
  }, []);

  const setLineDiscount = useCallback((productId: string, d: number) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.product.id === productId
          ? { ...i, discount: Math.min(100, Math.max(0, d)) }
          : i
      ),
    }));
  }, []);

  const removeItem = useCallback((productId: string) => {
    setOrder(prev => ({ ...prev, items: prev.items.filter(i => i.product.id !== productId) }));
    setSelectedLine(null);
  }, []);

  const clearOrder = useCallback(() => {
    setOrder({ id:genId(), items:[], createdAt:new Date(), note:"" });
    setSelectedLine(null);
  }, []);

  // ─────────────────────────────────────────────
  // PAYMENT — Firestore'ga yozish
  // ─────────────────────────────────────────────
  const openPayment = () => {
    setPayment({ method:"cash", cashGiven:0, cardAmount:0, cashAmount:subtotal });
    setPayInput(String(subtotal));
    setShowPayment(true);
  };

  const handleNumKey = (k: string) => {
    setPayInput(prev => {
      if (k === "⌫") return prev.length > 1 ? prev.slice(0,-1) : "0";
      if (k === "00") return prev === "0" ? "0" : prev + "00";
      return prev === "0" ? k : prev + k;
    });
  };

  const confirmPayment = async () => {
    if (!staff || subtotal === 0 || payBusy) return;
    if (payment.method === "cash" && numVal < subtotal) return;
    setPayBusy(true);
    try {
      // 1) Savdoni Firestore'ga yoz
      await addDoc(collection(db, "sales"), {
        cashierUid:    staff.uid,
        cashierName:   staff.name,
        warehouseId:   staff.warehouseId ?? "default",
        total:         subtotal,
        paymentMethod: payment.method,
        cashGiven:     payment.method === "cash" ? numVal : 0,
        change:        payment.method === "cash" ? Math.max(0, numVal - subtotal) : 0,
        cardAmount:    payment.method === "card" ? subtotal : payment.method === "mixed" ? payment.cardAmount : 0,
        note:          order.note,
        orderId:       order.id,
        items: order.items.map(i => ({
          productId: i.product.id,
          name:      i.product.name,
          price:     i.product.price,
          qty:       i.qty,
          discount:  i.discount,
          subtotal:  Math.round(i.product.price * i.qty * (1 - i.discount / 100)),
        })),
        createdAt: serverTimestamp(),
      });

      // 2) Har mahsulotning stock ini kamayt
      await Promise.all(
        order.items.map(i =>
          updateDoc(doc(db, "products", i.product.id), {
            stock: increment(-i.qty),
          })
        )
      );

      setShowPayment(false);
      clearOrder();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Xato yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setPayBusy(false);
    }
  };

  // ─────────────────────────────────────────────
  // ADMIN — savdolar
  // ─────────────────────────────────────────────
  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const q = query(collection(db,"sales"), orderBy("createdAt","desc"), limit(100));
      const snap = await getDocs(q);
      setSales(snap.docs.map(d => {
        const data = d.data();
        return {
          id:            d.id,
          cashierName:   data.cashierName ?? "—",
          total:         data.total ?? 0,
          paymentMethod: data.paymentMethod ?? "cash",
          createdAt:     data.createdAt?.toDate?.() ?? new Date(),
          items:         data.items ?? [],
        };
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setSalesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showAdmin && isAdmin) loadSales();
  }, [showAdmin, isAdmin, loadSales]);

  // ─────────────────────────────────────────────
  // LOADING SCREEN
  // ─────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={centerFlex}>
        <div style={{ color:"#475569", fontSize:13, letterSpacing:2 }}>YUKLANMOQDA...</div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // LOGIN SCREEN
  // ─────────────────────────────────────────────
  if (!fbUser || !staff) {
    return (
      <div style={{ ...centerFlex, background:"#080b14",
        fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif" }}>
        {/* grid bg */}
        <div style={{
          position:"fixed", inset:0, opacity:.04, pointerEvents:"none",
          backgroundImage:"linear-gradient(#6366f1 1px,transparent 1px),linear-gradient(90deg,#6366f1 1px,transparent 1px)",
          backgroundSize:"40px 40px",
        }}/>

        <div style={{
          background:"#0d1120", border:"1px solid #1e2440", borderRadius:20,
          padding:"44px 40px", width:400, position:"relative",
          boxShadow:"0 0 80px rgba(99,102,241,.12)",
        }}>
          <div style={{ position:"absolute", top:0, left:40, right:40, height:2,
            background:"linear-gradient(90deg,transparent,#6366f1,transparent)", borderRadius:999 }}/>

          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ fontSize:11, letterSpacing:4, color:"#475569", marginBottom:8, fontWeight:500 }}>
              KASSA TIZIMI
            </div>
            <div style={{ fontSize:26, fontWeight:700, color:"#e2e8f0", letterSpacing:-.5 }}>Kirish</div>
            <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>
              Faqat vakolatli xodimlar uchun
            </div>
          </div>

          {[
            { label:"Email", value:email, setter:setEmail, type:"email", ph:"email@example.com" },
            { label:"Parol", value:password, setter:setPassword, type:"password", ph:"••••••••" },
          ].map(f => (
            <div key={f.label} style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:"#475569", marginBottom:6, letterSpacing:1, fontWeight:500 }}>
                {f.label}
              </div>
              <input
                type={f.type}
                placeholder={f.ph}
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={inputStyle}
              />
            </div>
          ))}

          {loginError && (
            <div style={{ fontSize:12, color:"#f87171", marginBottom:12, padding:"8px 12px",
              background:"rgba(248,113,113,.1)", borderRadius:7, border:"1px solid rgba(248,113,113,.2)" }}>
              {loginError}
            </div>
          )}

          <button onClick={handleLogin} disabled={loginBusy} style={{
            width:"100%", padding:13, marginTop:4,
            background: loginBusy ? "#2d3556" : "linear-gradient(135deg,#6366f1,#818cf8)",
            border:"none", borderRadius:9, color:"white",
            fontSize:14, fontWeight:600, cursor: loginBusy ? "not-allowed" : "pointer",
          }}>
            {loginBusy ? "Kirilmoqda..." : "Kirish →"}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // POS INTERFACE
  // ─────────────────────────────────────────────
  return (
    <div style={{
      height:"100vh", background:"#080b14", display:"flex", flexDirection:"column",
      fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif", color:"#e2e8f0", overflow:"hidden",
    }}>

      {/* ── TOPBAR ── */}
      <div style={{
        height:52, background:"#0d1120", borderBottom:"1px solid #1a1e30",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 16px", flexShrink:0,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:11, letterSpacing:3, color:"#6366f1", fontWeight:700 }}>KASSA</span>
          <div style={{ width:1, height:20, background:"#1e2440" }}/>
          <span style={{ fontSize:13, color:"#94a3b8" }}>
            <b style={{ color:"#e2e8f0", fontWeight:500 }}>{staff.name}</b>
          </span>
          <span style={{
            fontSize:11, padding:"3px 9px", borderRadius:5, fontWeight:600,
            background: isAdmin ? "rgba(99,102,241,.15)" : "rgba(34,197,94,.1)",
            color: isAdmin ? "#a5b4fc" : "#4ade80",
            border:`1px solid ${isAdmin ? "rgba(99,102,241,.3)" : "rgba(34,197,94,.2)"}`,
          }}>
            {staff.role.toUpperCase()}
          </span>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:12, color:"#475569", fontFamily:"'JetBrains Mono',monospace" }}>
            {now.toLocaleTimeString("uz-UZ")}
          </span>
          {isAdmin && (
            <button onClick={() => setShowAdmin(true)} style={{
              padding:"5px 14px", background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.25)",
              borderRadius:7, color:"#a5b4fc", fontSize:12, cursor:"pointer", fontWeight:500,
            }}>Admin panel</button>
          )}
          <button onClick={handleLogout} style={{
            padding:"5px 14px", background:"transparent", border:"1px solid #1e2440",
            borderRadius:7, color:"#64748b", fontSize:12, cursor:"pointer",
          }}>Chiqish</button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ═══ LEFT: ORDER ═══ */}
        <div style={{
          width:310, background:"#0a0d1a", borderRight:"1px solid #1a1e30",
          display:"flex", flexDirection:"column", flexShrink:0,
        }}>
          {/* header */}
          <div style={{ padding:"12px 16px", borderBottom:"1px solid #1a1e30", background:"#0d1120",
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12, color:"#6366f1",
              fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>#{order.id}</span>
            <span style={{ fontSize:11, color:"#2d3556" }}>
              {order.createdAt.toLocaleTimeString("uz-UZ")}
            </span>
          </div>

          {/* items */}
          <div style={{ flex:1, overflowY:"auto", padding:8 }}>
            {order.items.length === 0 ? (
              <div style={{ textAlign:"center", marginTop:60, color:"#2d3556" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🛒</div>
                <div style={{ fontSize:13 }}>Mahsulot qo'shing</div>
              </div>
            ) : order.items.map(item => {
              const sel      = selectedLine === item.product.id;
              const lineTotal = item.product.price * item.qty * (1 - item.discount / 100);
              return (
                <div
                  key={item.product.id}
                  onClick={() => setSelectedLine(p => p === item.product.id ? null : item.product.id)}
                  style={{
                    padding:"10px 12px", borderRadius:9, marginBottom:4, cursor:"pointer",
                    background: sel ? "rgba(99,102,241,.07)" : "transparent",
                    border:`1px solid ${sel ? "rgba(99,102,241,.2)" : "transparent"}`,
                    transition:"all .15s",
                  }}
                >
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, color:"#e2e8f0", fontWeight:500, marginBottom:2,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {item.product.name}
                      </div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <span style={{ fontSize:12, color:"#6366f1", fontFamily:"'JetBrains Mono',monospace" }}>
                          {fmt(item.product.price)}
                        </span>
                        {item.discount > 0 && (
                          <span style={{ fontSize:10, color:"#f59e0b",
                            background:"rgba(245,158,11,.1)", padding:"1px 5px", borderRadius:4 }}>
                            -{item.discount}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign:"right", marginLeft:8, flexShrink:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0",
                        fontFamily:"'JetBrains Mono',monospace" }}>
                        {fmt(lineTotal)}
                      </div>
                      <div style={{ fontSize:11, color:"#475569" }}>×{item.qty} {item.product.unit}</div>
                    </div>
                  </div>

                  {sel && (
                    <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #1a1e30",
                      display:"flex", gap:6 }}>
                      <button onClick={e => { e.stopPropagation(); updateQty(item.product.id,-1); }} style={ctrlBtn}>−</button>
                      <span style={{ flex:1, textAlign:"center", fontSize:14, fontWeight:700,
                        color:"#e2e8f0", fontFamily:"'JetBrains Mono',monospace", lineHeight:"32px" }}>
                        {item.qty}
                      </span>
                      <button onClick={e => { e.stopPropagation(); updateQty(item.product.id,1); }} style={ctrlBtn}>+</button>
                      {isAdmin && (
                        <input
                          type="number" min="0" max="100"
                          value={item.discount}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setLineDiscount(item.product.id, parseInt(e.target.value)||0)}
                          placeholder="%"
                          style={{ ...ctrlBtn, width:48, background:"rgba(245,158,11,.08)",
                            borderColor:"rgba(245,158,11,.2)", color:"#f59e0b", textAlign:"center" }}
                        />
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); removeItem(item.product.id); }}
                        style={{ ...ctrlBtn, borderColor:"rgba(248,113,113,.2)",
                          color:"#f87171", background:"rgba(248,113,113,.05)" }}>✕</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* footer */}
          <div style={{ padding:"12px 16px", borderTop:"1px solid #1a1e30", background:"#0d1120" }}>
            <div style={{ display:"flex", gap:6, marginBottom:10 }}>
              <button onClick={clearOrder}
                style={{ ...actionBtn, flex:1, color:"#f87171", borderColor:"rgba(248,113,113,.2)" }}>
                Tozalash
              </button>
              <button onClick={() => {
                const n = prompt("Izoh kiriting:");
                if (n !== null) setOrder(o => ({ ...o, note:n }));
              }} style={{ ...actionBtn, flex:1 }}>
                {order.note ? "✎ Izoh" : "+ Izoh"}
              </button>
            </div>

            <div style={{ fontSize:12, color:"#475569", marginBottom:4,
              display:"flex", justifyContent:"space-between" }}>
              <span>Mahsulotlar:</span>
              <span style={{ color:"#94a3b8" }}>{totalQty} ta</span>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              margin:"10px 0 12px" }}>
              <span style={{ fontSize:14, color:"#94a3b8" }}>Jami:</span>
              <span style={{ fontSize:20, fontWeight:700, color:"#e2e8f0",
                fontFamily:"'JetBrains Mono',monospace" }}>
                {fmt(subtotal)}
              </span>
            </div>

            <button
              onClick={openPayment}
              disabled={order.items.length === 0}
              style={{
                width:"100%", padding:"13px 0",
                background: order.items.length
                  ? "linear-gradient(135deg,#6366f1,#818cf8)" : "#1a1e30",
                border:"none", borderRadius:10,
                color: order.items.length ? "white" : "#2d3556",
                fontSize:14, fontWeight:700,
                cursor: order.items.length ? "pointer" : "not-allowed",
                letterSpacing:.5, transition:"all .2s",
              }}>
              TO'LASH →
            </button>
          </div>
        </div>

        {/* ═══ RIGHT: CATALOG ═══ */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* categories */}
          <div style={{
            height:48, borderBottom:"1px solid #1a1e30", background:"#0d1120",
            display:"flex", alignItems:"center", gap:4, padding:"0 12px",
            overflowX:"auto", flexShrink:0,
          }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                padding:"6px 16px", borderRadius:7, border:"1px solid",
                borderColor: activeCategory===cat ? "rgba(99,102,241,.4)" : "#1e2440",
                background:  activeCategory===cat ? "rgba(99,102,241,.1)" : "transparent",
                color:       activeCategory===cat ? "#a5b4fc" : "#475569",
                fontSize:12, fontWeight: activeCategory===cat ? 600 : 400,
                cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"all .15s",
              }}>{cat}</button>
            ))}
          </div>

          {/* search */}
          <div style={{ padding:"10px 14px", borderBottom:"1px solid #1a1e30",
            background:"#0a0d1a", flexShrink:0 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nomi, shtrix-kod yoki narx..."
              style={inputStyle}
            />
          </div>

          {/* product grid */}
          <div style={{
            flex:1, overflowY:"auto", padding:12,
            display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",
            gap:10, alignContent:"start",
          }}>
            {productsLoading ? (
              <div style={{ gridColumn:"1/-1", textAlign:"center", marginTop:60, color:"#2d3556" }}>
                <div style={{ fontSize:13 }}>Yuklanmoqda...</div>
              </div>
            ) : filteredProducts.map(product => {
              const inOrder = order.items.find(i => i.product.id === product.id);
              const c = product.color ?? "#6366f1";
              return (
                <button
                  key={product.id}
                  onClick={() => addToOrder(product)}
                  disabled={product.stock === 0}
                  style={{
                    background: inOrder ? `${c}12` : "#0d1120",
                    border:`1px solid ${inOrder ? c+"40" : "#1e2440"}`,
                    borderRadius:12, padding:"14px 10px 12px",
                    cursor: product.stock===0 ? "not-allowed" : "pointer",
                    textAlign:"left", transition:"all .15s",
                    position:"relative", opacity: product.stock===0 ? .4 : 1,
                  }}
                  onMouseEnter={e => { if(product.stock>0) e.currentTarget.style.borderColor=c+"80"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=inOrder?c+"40":"#1e2440"; }}
                >
                  {inOrder && (
                    <div style={{
                      position:"absolute", top:7, right:7,
                      background:c, color:"white", fontSize:10, fontWeight:700,
                      padding:"2px 6px", borderRadius:5, fontFamily:"'JetBrains Mono',monospace",
                    }}>×{inOrder.qty}</div>
                  )}
                  <div style={{ width:8, height:8, borderRadius:"50%", background:c, marginBottom:8 }}/>
                  <div style={{ fontSize:12, color:"#e2e8f0", fontWeight:500, lineHeight:1.35,
                    marginBottom:6, minHeight:32 }}>
                    {product.name}
                  </div>
                  <div style={{ fontSize:13, color:c, fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>
                    {fmt(product.price)}
                  </div>
                  <div style={{ fontSize:10, color:"#2d3556", marginTop:3 }}>
                    Qoldiq: {product.stock} {product.unit}
                  </div>
                </button>
              );
            })}
            {!productsLoading && filteredProducts.length === 0 && (
              <div style={{ gridColumn:"1/-1", textAlign:"center", marginTop:60, color:"#2d3556" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
                <div>Mahsulot topilmadi</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ PAYMENT MODAL ═══ */}
      {showPayment && (
        <div style={overlay}>
          <div style={{ ...card, width:440 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <span style={{ fontSize:16, fontWeight:700 }}>To'lov</span>
              <span style={{ fontSize:18, fontWeight:700, color:"#6366f1",
                fontFamily:"'JetBrains Mono',monospace" }}>{fmt(subtotal)}</span>
            </div>

            <div style={{ display:"flex", gap:6, marginBottom:16 }}>
              {(["cash","card","mixed"] as PaymentMethod[]).map(m => (
                <button key={m} onClick={() => setPayment(p => ({ ...p, method:m }))} style={{
                  flex:1, padding:"9px 0", borderRadius:8, border:"1px solid",
                  borderColor: payment.method===m ? "rgba(99,102,241,.5)" : "#1e2440",
                  background:  payment.method===m ? "rgba(99,102,241,.1)" : "transparent",
                  color:       payment.method===m ? "#a5b4fc" : "#475569",
                  fontSize:12, fontWeight:600, cursor:"pointer",
                }}>
                  {m==="cash"?"💵 Naqd":m==="card"?"💳 Karta":"🔀 Aralash"}
                </button>
              ))}
            </div>

            <div style={{ background:"#080b14", border:"1px solid #1e2440", borderRadius:10,
              padding:"12px 16px", marginBottom:14, textAlign:"right" }}>
              <div style={{ fontSize:11, color:"#475569", marginBottom:4 }}>
                {payment.method==="cash"?"Berilgan naqd":payment.method==="card"?"Karta summasi":"Naqd qismi"}
              </div>
              <div style={{ fontSize:26, fontWeight:700, color:"#e2e8f0",
                fontFamily:"'JetBrains Mono',monospace" }}>
                {new Intl.NumberFormat("uz-UZ").format(numVal)} so'm
              </div>
            </div>

            <NumPad onKey={handleNumKey} />

            {payment.method === "cash" && (
              <div style={{
                marginTop:14, padding:"10px 14px", borderRadius:8,
                display:"flex", justifyContent:"space-between",
                background: change>=0 ? "rgba(34,197,94,.08)" : "rgba(248,113,113,.08)",
                border:`1px solid ${change>=0?"rgba(34,197,94,.2)":"rgba(248,113,113,.2)"}`,
              }}>
                <span style={{ fontSize:13, color:"#475569" }}>Qaytim:</span>
                <span style={{ fontSize:14, fontWeight:700, fontFamily:"'JetBrains Mono',monospace",
                  color: change>=0?"#4ade80":"#f87171" }}>
                  {fmt(Math.max(0,change))}
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
                disabled={(payment.method==="cash" && numVal<subtotal) || payBusy}
                style={{
                  flex:2, padding:13, border:"none", borderRadius:9,
                  fontSize:14, fontWeight:700, cursor:"pointer",
                  background: payBusy
                    ? "#1a1e30"
                    : (payment.method!=="cash"||numVal>=subtotal)
                      ? "linear-gradient(135deg,#22c55e,#4ade80)" : "#1a1e30",
                  color: (!payBusy && (payment.method!=="cash"||numVal>=subtotal)) ? "white" : "#2d3556",
                }}>
                {payBusy ? "Saqlanmoqda..." : "✓ Tasdiqlash"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADMIN MODAL ═══ */}
      {showAdmin && isAdmin && (
        <div style={overlay}>
          <div style={{ ...card, width:740, maxHeight:"85vh", display:"flex", flexDirection:"column" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <span style={{ fontSize:16, fontWeight:700 }}>Admin panel — Savdolar tarixi</span>
              <button onClick={() => setShowAdmin(false)} style={{
                background:"transparent", border:"1px solid #1e2440",
                borderRadius:7, color:"#475569", fontSize:12, padding:"5px 12px", cursor:"pointer",
              }}>✕ Yopish</button>
            </div>

            {/* stats */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
              {[
                { label:"Jami savdolar", value:`${sales.length} ta` },
                { label:"Umumiy tushum", value: fmt(sales.reduce((s,o)=>s+o.total,0)) },
                { label:"O'rtacha chek", value: sales.length
                    ? fmt(sales.reduce((s,o)=>s+o.total,0)/sales.length) : "—" },
              ].map(stat => (
                <div key={stat.label} style={{ background:"#080b14", border:"1px solid #1e2440",
                  borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:11, color:"#475569", marginBottom:4 }}>{stat.label}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0",
                    fontFamily:"'JetBrains Mono',monospace" }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* list */}
            <div style={{ flex:1, overflowY:"auto" }}>
              {salesLoading ? (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#475569" }}>
                  Yuklanmoqda...
                </div>
              ) : sales.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#2d3556" }}>
                  Hali savdo yo'q
                </div>
              ) : sales.map(s => (
                <div key={s.id} style={{
                  padding:"11px 14px", borderRadius:9, border:"1px solid #1e2440",
                  marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center",
                }}>
                  <div>
                    <div style={{ fontSize:13, color:"#e2e8f0", fontWeight:500 }}>
                      {s.cashierName}
                      <span style={{ color:"#2d3556", fontSize:11, marginLeft:8,
                        fontFamily:"'JetBrains Mono',monospace" }}>
                        #{s.id.slice(0,8)}
                      </span>
                    </div>
                    <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>
                      {s.items.slice(0,3).map((i:{name:string;qty:number}) =>
                        `${i.name} ×${i.qty}`).join(", ")}
                      {s.items.length > 3 && ` +${s.items.length-3} ta`}
                    </div>
                    <div style={{ fontSize:10, color:"#2d3556", marginTop:2 }}>
                      {s.createdAt.toLocaleString("uz-UZ")}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0, marginLeft:16 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#6366f1",
                      fontFamily:"'JetBrains Mono',monospace" }}>
                      {fmt(s.total)}
                    </div>
                    <div style={{ fontSize:11, color:"#475569" }}>
                      {s.paymentMethod==="cash"?"Naqd":s.paymentMethod==="card"?"Karta":"Aralash"}
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

// ─────────────────────────────────────────────
// SHARED STYLES
// ─────────────────────────────────────────────

const centerFlex: React.CSSProperties = {
  display:"flex", alignItems:"center", justifyContent:"center",
  minHeight:"100vh", background:"#080b14",
  fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif",
};

const inputStyle: React.CSSProperties = {
  width:"100%", padding:"10px 14px", background:"#080b14",
  border:"1px solid #1e2440", borderRadius:8, color:"#e2e8f0",
  fontSize:13, outline:"none", boxSizing:"border-box",
  fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif",
};

const ctrlBtn: React.CSSProperties = {
  width:32, height:32, borderRadius:7, border:"1px solid #1e2440",
  background:"#0d1120", color:"#94a3b8", fontSize:16, cursor:"pointer",
  display:"flex", alignItems:"center", justifyContent:"center",
  fontFamily:"'JetBrains Mono',monospace",
};

const actionBtn: React.CSSProperties = {
  padding:"7px 12px", background:"transparent", border:"1px solid #1e2440",
  borderRadius:7, color:"#475569", fontSize:12, cursor:"pointer",
};

const overlay: React.CSSProperties = {
  position:"fixed", inset:0, background:"rgba(0,0,0,.75)", backdropFilter:"blur(4px)",
  display:"flex", alignItems:"center", justifyContent:"center", zIndex:200,
};

const card: React.CSSProperties = {
  background:"#0d1120", border:"1px solid #1e2440", borderRadius:16,
  padding:28, boxShadow:"0 0 60px rgba(0,0,0,.5)",
};
