"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, type User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore, collection, getDocs, addDoc, doc, getDoc, updateDoc, increment,
  serverTimestamp, query, orderBy, limit, onSnapshot, where,
} from "firebase/firestore";
import { app } from "@/lib/firebase";

const auth = getAuth(app);
const db   = getFirestore(app);

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

const fmt = (n: number) =>
  new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";

const genId = () =>
  Math.random().toString(36).slice(2, 7).toUpperCase();

export default function CashPage() {
  const [fbUser,setFbUser]=useState<FirebaseUser|null>(null);
  const [staff,setStaff]=useState<StaffDoc|null>(null);
  const [authLoading,setAuthLoading]=useState(true);

  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");

  const [products,setProducts]=useState<Product[]>([]);
  const [order,setOrder]=useState<ActiveOrder>({
    id:genId(),items:[],createdAt:new Date(),note:""
  });

  const [barcodeBuffer,setBarcodeBuffer]=useState("");
  const barcodeTimer=useRef<any>(null);

  const subtotal = useMemo(() =>
    order.items.reduce((s,i)=>s+i.product.price*i.qty,0), [order.items]);

  const numVal = Number("0") || 0;

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,async user=>{
      setFbUser(user);
      if(user){
        const snap=await getDoc(doc(db,"staff",user.uid));
        if(snap.exists()){
          setStaff({uid:user.uid,...snap.data() as any});
        }
      } else setStaff(null);
      setAuthLoading(false);
    });
    return ()=>unsub();
  },[]);

  useEffect(()=>{
    if(!staff)return;
    const q=query(collection(db,"products"));
    const unsub=onSnapshot(q,snap=>{
      setProducts(snap.docs.map(d=>({id:d.id,...d.data() as any})));
    });
    return ()=>unsub();
  },[staff]);

  useEffect(()=>{
    const handler=(e:KeyboardEvent)=>{
      if(e.key==="Enter"){
        const found=products.find(p=>p.barcode===barcodeBuffer);
        if(found)addToOrder(found);
        setBarcodeBuffer("");
        return;
      }
      if(e.key.length===1)setBarcodeBuffer(p=>p+e.key);
    };
    window.addEventListener("keydown",handler);
    return ()=>window.removeEventListener("keydown",handler);
  },[products]);

  const addToOrder=(product:Product)=>{
    setOrder(prev=>{
      const f=prev.items.find(i=>i.product.id===product.id);
      if(f)f.qty++;
      else prev.items.push({product,qty:1,discount:0});
      return {...prev};
    });
  };

  const confirmPayment=async()=>{
    const current=[...order.items];
    await addDoc(collection(db,"sales"),{
      total:subtotal,
      items:current.map(i=>({
        name:i.product.name,qty:i.qty,price:i.product.price
      })),
      createdAt:serverTimestamp()
    });

    await Promise.all(current.map(i=>
      updateDoc(doc(db,"products",i.product.id),{
        stock:increment(-i.qty)
      }).catch(()=>null)
    ));

    setOrder({id:genId(),items:[],createdAt:new Date(),note:""});
  };

  if(authLoading)return <div>Loading...</div>;

  if(!fbUser)return (
    <div>
      <input onChange={e=>setEmail(e.target.value)} placeholder="email"/>
      <input onChange={e=>setPassword(e.target.value)} placeholder="password"/>
      <button onClick={()=>signInWithEmailAndPassword(auth,email,password)}>Login</button>
    </div>
  );

  return (
    <div>
      <h2>POS</h2>
      <div>Total: {fmt(subtotal)}</div>

      {products.map(p=>(
        <button key={p.id} onClick={()=>addToOrder(p)}>
          {p.name}
        </button>
      ))}

      <button onClick={confirmPayment}>PAY</button>
      <button onClick={()=>signOut(auth)}>Logout</button>
    </div>
  );
}
"""

path = Path('/mnt/data/CashPage.tsx')
path.write_text(code)

str(path)
