"use client";

import { useState, useMemo } from "react";
import { 
  ShoppingCart, Search, Loader2, Plus, Minus, 
  Barcode, Wallet, Trash2, PackageSearch, 
  ChevronLeft, Printer, CreditCard, Banknote
} from "lucide-react";
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function POSPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const { data: products, loading } = useCollection("products");
  
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Qidiruv mantiqi
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p: any) => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.includes(searchQuery)
    );
  }, [products, searchQuery]);

  // Savatchaga qo'shish
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

  // Savatchadan o'chirish yoki kamaytirish
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

  // To'lovni yakunlash (Checkout)
  const handleCheckout = async (method: 'naqd' | 'karta') => {
    if (cart.length === 0 || !db || !user) return;

    setIsProcessing(true);
    try {
      // 1. Sotuvni bazaga yozish
      await addDoc(collection(db, "sales"), {
        items: cart,
        total: totalAmount,
        paymentMethod: method,
        sellerId: user.uid,
        sellerName: user.displayName || "Xodim",
        createdAt: serverTimestamp(),
      });

      // 2. Ombor qoldig'ini kamaytirish (Inventory update)
      for (const item of cart) {
        const productRef = doc(db, "products", item.id);
        await updateDoc(productRef, {
          stock: increment(-item.quantity)
        });
      }

      toast({ title: "Sotuv yakunlandi!", description: `Chek chop etishga tayyor. Jami: ${totalAmount.toLocaleString()} so'm` });
      setCart([]);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Xatolik!", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden font-sans">
      
      {/* CHAP TOMON: MAHSULOTLAR RO'YXATI */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Mahsulot nomi yoki shtrix-kod..." 
              className="pl-10 h-10 bg-slate-50 border-none focus-visible:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-10 gap-2 border-slate-300">
            <Barcode className="w-4 h-4" /> Skaner
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pr-2">
          {loading ? (
            <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" /></div>
          ) : filteredProducts.map((p: any) => (
            <div 
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group"
            >
              <div className="aspect-square bg-slate-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {p.image ? <img src={p.image} alt="" className="object-cover w-full h-full" /> : <PackageSearch className="w-8 h-8 text-slate-200" />}
              </div>
              <h3 className="text-xs font-bold text-slate-700 truncate mb-1">{p.name}</h3>
              <p className="text-blue-600 font-black text-sm">{p.price.toLocaleString()} <span className="text-[10px]">so'm</span></p>
              <div className="mt-2 text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Omborda: {p.stock} ta</div>
            </div>
          ))}
        </div>
      </div>

      {/* O'NG TOMON: SAVATCHA VA TO'LOV (iiko style) */}
      <div className="w-[400px] bg-white border-l border-slate-200 flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-[#f8f9fb]">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <span className="font-black text-slate-700 uppercase text-xs tracking-widest">Joriy Savat</span>
          </div>
          <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded-full">{cart.length} TA</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2 opacity-50">
              <ShoppingCart className="w-12 h-12" />
              <p className="text-xs font-bold uppercase">Savat bo'sh</p>
            </div>
          ) : cart.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-50 hover:bg-slate-50 transition-colors group">
              <div className="flex-1">
                <h4 className="text-[11px] font-bold text-slate-700 line-clamp-1 uppercase">{item.name}</h4>
                <p className="text-[10px] text-slate-400">{item.price.toLocaleString()} x {item.quantity}</p>
              </div>
              <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden h-8">
                <button onClick={() => removeFromCart(item.id)} className="px-2 hover:bg-red-50 text-slate-400 hover:text-red-500"><Minus className="w-3 h-3" /></button>
                <span className="px-2 text-xs font-bold border-x border-slate-100 min-w-[30px] text-center">{item.quantity}</span>
                <button onClick={() => addToCart(item)} className="px-2 hover:bg-green-50 text-slate-400 hover:text-green-500"><Plus className="w-3 h-3" /></button>
              </div>
              <button onClick={() => removeFromCart(item.id, true)} className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>

        {/* TO'LOV BO'LIMI */}
        <div className="p-6 bg-[#f8f9fb] border-t border-slate-200 space-y-4">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Umumiy summa:</span>
            <span className="text-2xl font-black text-slate-800 leading-none">{totalAmount.toLocaleString()} <span className="text-xs">UZS</span></span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              disabled={cart.length === 0 || isProcessing}
              onClick={() => handleCheckout('naqd')}
              className="h-14 bg-emerald-600 hover:bg-emerald-700 flex flex-col gap-1 shadow-lg shadow-emerald-100"
            >
              <Banknote className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase">NAQD PUL</span>
            </Button>
            <Button 
              disabled={cart.length === 0 || isProcessing}
              onClick={() => handleCheckout('karta')}
              className="h-14 bg-blue-600 hover:bg-blue-700 flex flex-col gap-1 shadow-lg shadow-blue-100"
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase">PLASTIK</span>
            </Button>
          </div>
          
          <Button variant="outline" className="w-full h-10 border-slate-300 text-slate-500 gap-2 font-bold text-[10px] uppercase">
            <Printer className="w-4 h-4" /> Chekni chop etish
          </Button>
        </div>
      </div>
    </div>
  );
}
