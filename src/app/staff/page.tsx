"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  ShoppingCart, Search, Loader2, Plus, Minus, 
  Barcode, Wallet, Trash2, PackageSearch, 
  Printer, CreditCard, Banknote, User as UserIcon,
  X, ChevronRight, LayoutGrid
} from "lucide-react";
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function POSPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const userContext = useUser(); // Xatolikni oldini olish uchun obyekt sifatida olamiz
  const { data: products, loading } = useCollection("products");
  
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // iiko style: Tanlangan kategoriya (ixtiyoriy)
  const [activeCategory, setActiveCategory] = useState("Hammasi");

  // Client-side exception'ni oldini olish uchun tekshiruv
  if (!userContext) return <div className="h-screen flex items-center justify-center bg-[#f0f2f5]"><Loader2 className="animate-spin text-blue-600" /></div>;

  const filteredProducts = products?.filter((p: any) => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.includes(searchQuery)
  ) || [];

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string, fullDelete = false) => {
    setCart(prev => prev.reduce((acc: any[], item) => {
      if (item.id === id) {
        if (fullDelete || item.quantity === 1) return acc;
        acc.push({ ...item, quantity: item.quantity - 1 });
      } else {
        acc.push(item);
      }
      return acc;
    }, []));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async (method: 'naqd' | 'karta') => {
    if (cart.length === 0 || !db) return;
    setIsProcessing(true);
    try {
      await addDoc(collection(db, "sales"), {
        items: cart,
        total: totalAmount,
        paymentMethod: method,
        sellerId: userContext.user?.uid || "unknown",
        createdAt: serverTimestamp(),
      });
      
      toast({ title: "Sotuv bajarildi", description: "Chek chiqarishga tayyor." });
      setCart([]);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Xato", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#1e222d] text-slate-200 overflow-hidden font-sans">
      
      {/* CHAP PANELA: MAHSULOTLAR (Dark Iiko Theme) */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden border-r border-slate-700">
        <div className="flex items-center gap-4 mb-6 bg-[#2a2f3b] p-3 rounded-xl border border-slate-700">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Qidirish..." 
              className="pl-10 h-10 bg-[#1e222d] border-slate-600 focus:border-blue-500 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="ghost" className="text-slate-400 hover:text-white"><Barcode /></Button>
        </div>

        {/* KATEGORIYALAR (iiko style) */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          {["Hammasi", "Ichimliklar", "Ovqatlar", "Desertlar"].map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all ${activeCategory === cat ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-[#2a2f3b] border-slate-700 text-slate-400'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pr-2">
          {loading ? (
            <div className="col-span-full flex items-center justify-center h-40"><Loader2 className="animate-spin" /></div>
          ) : filteredProducts.map((p: any) => (
            <button 
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-[#2a2f3b] p-3 rounded-xl border border-slate-700 hover:border-blue-500 transition-all flex flex-col text-left group relative active:scale-95"
            >
              <div className="w-full aspect-square bg-[#1e222d] rounded-lg mb-3 flex items-center justify-center text-slate-600 group-hover:text-blue-500 transition-colors">
                <LayoutGrid className="w-8 h-8" />
              </div>
              <span className="text-[11px] font-bold text-slate-300 uppercase truncate w-full">{p.name}</span>
              <span className="text-blue-400 font-black text-sm mt-1">{p.price.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* O'NG PANELA: CHECK (White/Grey Contrast) */}
      <div className="w-[380px] bg-[#f8f9fb] flex flex-col shadow-2xl text-slate-800">
        <div className="p-5 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600">
            <UserIcon className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-tighter">{userContext.user?.email?.split('@')[0] || "KASSIR"}</span>
          </div>
          <div className="text-[11px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">KASSA №1</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm animate-in fade-in zoom-in duration-200">
              <div className="flex-1">
                <div className="text-[11px] font-black text-slate-700 uppercase leading-tight mb-1">{item.name}</div>
                <div className="text-[10px] text-slate-400 font-bold">{item.price.toLocaleString()} UZS</div>
              </div>
              <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <button onClick={() => removeFromCart(item.id)} className="p-2 hover:bg-slate-200 transition-colors"><Minus className="w-3 h-3" /></button>
                <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                <button onClick={() => addToCart(item)} className="p-2 hover:bg-slate-200 transition-colors"><Plus className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* TO'LOV QISMI */}
        <div className="p-6 bg-white border-t-2 border-dashed border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Jami:</span>
            <span className="text-2xl font-black text-blue-600 tracking-tighter">{totalAmount.toLocaleString()} <span className="text-xs">UZS</span></span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => handleCheckout('naqd')}
              disabled={cart.length === 0 || isProcessing}
              className="h-16 bg-[#2a2f3b] hover:bg-[#1e222d] text-white flex flex-col gap-1 rounded-2xl shadow-xl transition-all active:translate-y-1"
            >
              <Banknote className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase">Naqd Pul</span>
            </Button>
            <Button 
              onClick={() => handleCheckout('karta')}
              disabled={cart.length === 0 || isProcessing}
              className="h-16 bg-blue-600 hover:bg-blue-700 text-white flex flex-col gap-1 rounded-2xl shadow-xl transition-all active:translate-y-1"
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase">Plastik</span>
            </Button>
          </div>

          <Button variant="ghost" className="w-full text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-red-500">
            <Trash2 className="w-3 h-3 mr-2" /> Savatni tozalash
          </Button>
        </div>
      </div>
    </div>
  );
}
