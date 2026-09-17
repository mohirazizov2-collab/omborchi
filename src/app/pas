"use client";

import { useState, useMemo, useCallback } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ShoppingCart, Search, Loader2, Plus, Minus, 
  Barcode, Wallet, Trash2, PackageSearch
} from "lucide-react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useScanner } from "@/hooks/use-scanner";
import { cn } from "@/lib/utils";

export default function POSPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user, assignedWarehouseId } = useUser(); 
  
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Ma'lumotlarni yuklash
  const productsQuery = useMemoFirebase(() => db ? collection(db, "products") : null, [db]);
  const { data: products } = useCollection(productsQuery);

  const inventoryQuery = useMemoFirebase(() => db ? collection(db, "inventory") : null, [db]);
  const { data: inventory } = useCollection(inventoryQuery);

  // 2. Savatga qo'shish mantiqi
  const addToCart = useCallback((product: any) => {
    if (!assignedWarehouseId) {
      toast({ variant: "destructive", title: "Xatolik", description: "Sizga ombor biriktirilmagan!" });
      return;
    }

    // Ombordagi joriy qoldiqni topish
    const stockKey = `${assignedWarehouseId}_${product.id}`;
    const stockItem = inventory?.find(inv => inv.id === stockKey);
    const currentStock = stockItem?.stock || 0;

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentQty = existing ? existing.quantity : 0;

      if (currentQty >= currentStock) {
        toast({ 
          variant: "destructive", 
          title: "Zaxira yetarli emas", 
          description: `Omborda jami ${currentStock} ta bor.` 
        });
        return prev;
      }

      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, [assignedWarehouseId, inventory, toast]);

  // 3. Skayner mantiqi
  useScanner(async (barcode) => {
    const product = products?.find(p => p.barcode === barcode || p.sku === barcode);
    if (product) {
      addToCart(product);
      setSearchQuery("");
      toast({ title: "Qo'shildi", description: product.name });
    }
  });

  // 4. Qidiruv mantiqi
  const filteredProducts = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return products?.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.sku?.toLowerCase().includes(q) ||
      p.barcode?.includes(q)
    ).slice(0, 8);
  }, [products, searchQuery]);

  // 5. Sotuvni yakunlash
  const handleCheckout = async () => {
    if (!db || !user || !assignedWarehouseId || cart.length === 0) return;

    setIsSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        let totalCalculated = 0;

        for (const item of cart) {
          const invRef = doc(db, "inventory", `${assignedWarehouseId}_${item.id}`);
          const invSnap = await transaction.get(invRef);

          if (!invSnap.exists()) throw new Error(`${item.name} omborda topilmadi!`);
          
          const actualStock = invSnap.data().stock;
          if (actualStock < item.quantity) {
            throw new Error(`${item.name} uchun qoldiq yetarli emas!`);
          }

          transaction.update(invRef, { stock: actualStock - item.quantity });
          totalCalculated += (item.price * item.quantity);
        }

        const saleRef = doc(collection(db, "sales"));
        transaction.set(saleRef, {
          items: cart,
          totalAmount: totalCalculated,
          warehouseId: assignedWarehouseId,
          sellerId: user.uid,
          sellerName: user.displayName || user.email,
          createdAt: serverTimestamp(),
          status: "completed"
        });
      });

      setCart([]);
      toast({ title: "Muvaffaqiyatli!", description: "Sotuv amalga oshirildi." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Xatolik", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSum = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <OmniSidebar />
      <main className="flex-1 p-4 lg:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* CHAP: QIDIRUV VA MAHSULOTLAR */}
        <div className="flex-1 space-y-6">
          <header>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Savdo Kassasi</h1>
            <p className="text-slate-500 font-medium">Mahsulotlarni tanlang yoki skanerlang</p>
          </header>

          <Card className="rounded-[2rem] border-none shadow-xl shadow-blue-500/5 bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input 
                  placeholder="Nomi, SKU yoki Barcode..." 
                  className="pl-12 h-16 bg-slate-50 border-none rounded-2xl text-lg font-bold focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {searchQuery.length >= 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {filteredProducts?.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => { addToCart(p); setSearchQuery(""); }}
                      className="flex items-center justify-between p-4 bg-white border-2 border-slate-50 rounded-2xl hover:border-blue-500 hover:bg-blue-50/30 transition-all group text-left"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{p.barcode || p.sku}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-black text-blue-600">
                          {p.price?.toLocaleString()} <span className="text-[10px]">UZS</span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* STATUS BAR */}
          <div className="grid grid-cols-2 gap-4">
            <div className={cn(
              "p-4 rounded-3xl border-2 flex items-center gap-4 transition-all",
              assignedWarehouseId ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"
            )}>
              <div className={cn("p-2 rounded-xl", assignedWarehouseId ? "bg-emerald-500/10" : "bg-rose-500/10")}>
                <Barcode className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase opacity-60">Skayner Holati</p>
                <p className="text-sm font-bold">{assignedWarehouseId ? "Aktiv & Tayyor" : "Faol emas"}</p>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-blue-50 border-2 border-blue-100 text-blue-700 flex items-center gap-4">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <PackageSearch className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase opacity-60">Joriy Ombor</p>
                <p className="text-sm font-bold truncate max-w-[150px]">{assignedWarehouseId || "Biriktirilmagan"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* O'NG: SAVATCHA */}
        <Card className="w-full lg:w-[450px] rounded-[3rem] border-none shadow-2xl flex flex-col h-[calc(100vh-4rem)] sticky top-8 bg-white overflow-hidden">
          <CardContent className="p-8 flex-1 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-2xl text-white">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                SAVAT
              </h2>
              <span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-black">
                {cart.length} TA
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2 custom-scrollbar">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                    <p className="text-xs font-black text-blue-600">
                      {(item.price * item.quantity).toLocaleString()} UZS
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                      <button 
                        onClick={() => {
                          if(item.quantity > 1) setCart(cart.map(i => i.id === item.id ? {...i, quantity: i.quantity - 1} : i));
                          else setCart(cart.filter(i => i.id !== item.id));
                        }}
                        className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-black">{item.quantity}</span>
                      <button 
                        onClick={() => addToCart(item)}
                        className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button 
                      onClick={() => setCart(cart.filter(i => i.id !== item.id))}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                  <div className="p-6 bg-slate-50 rounded-full mb-4">
                    <ShoppingCart className="w-12 h-12" />
                  </div>
                  <p className="font-black text-xs uppercase tracking-widest">Savat bo'sh</p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-1">Umumiy summa</p>
                  <p className="text-4xl font-black text-slate-900 leading-none">
                    {totalSum.toLocaleString()} <span className="text-lg font-bold text-slate-400">UZS</span>
                  </p>
                </div>
                <div className="bg-blue-600/10 p-4 rounded-3xl text-blue-600">
                  <Wallet className="w-8 h-8" />
                </div>
              </div>

              <Button 
                onClick={handleCheckout}
                disabled={cart.length === 0 || isSubmitting || !assignedWarehouseId}
                className={cn(
                  "w-full h-20 rounded-[2rem] text-xl font-black transition-all shadow-2xl",
                  assignedWarehouseId 
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-[0.98]" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>YUBORILMOQDA...</span>
                  </div>
                ) : (
                  "SOTUVNI YAKUNLASH"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
