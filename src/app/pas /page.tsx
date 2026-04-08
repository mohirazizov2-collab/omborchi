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
import { collection, doc, runTransaction, serverTimestamp, getDoc } from "firebase/firestore";
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

  // 1. Ma'lumotlarni yuklash (Real-time)
  const productsQuery = useMemoFirebase(() => db ? collection(db, "products") : null, [db]);
  const { data: products } = useCollection(productsQuery);

  const inventoryQuery = useMemoFirebase(() => db ? collection(db, "inventory") : null, [db]);
  const { data: inventory } = useCollection(inventoryQuery);

  // 2. Savatga qo'shish mantiqi (Callback orqali optimallashtirilgan)
  const addToCart = useCallback((product: any) => {
    if (!assignedWarehouseId) {
      toast({ variant: "destructive", title: "Xatolik", description: "Sizga ombor biriktirilmagan!" });
      return;
    }

    const stockItem = inventory?.find(inv => 
      inv.productId === product.id && inv.warehouseId === assignedWarehouseId
    );
    const currentStock = stockItem?.stock || 0;

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentQty = existing ? existing.quantity : 0;

      if (currentQty >= currentStock) {
        toast({ 
          variant: "destructive", 
          title: "Zaxira yetarli emas", 
          description: `Omborda jami ${currentStock} ta bor. Savatda: ${currentQty}` 
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
    } else {
      toast({ variant: "destructive", title: "Topilmadi", description: `"${barcode}" kodi bazada yo'q.` });
    }
  });

  // 4. Qidiruv mantiqi
  const filteredProducts = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return products?.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.sku?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [products, searchQuery]);

  // 5. Sotuvni yakunlash (Tranzaksiya bilan)
  const handleCheckout = async () => {
    if (!db || !user || !assignedWarehouseId || cart.length === 0) return;

    setIsSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        let totalCalculated = 0;

        for (const item of cart) {
          // Xavfsizlik uchun narxni va zaxirani bazadan qayta tekshiramiz
          const invRef = doc(db, "inventory", `${assignedWarehouseId}_${item.id}`);
          const prodRef = doc(db, "products", item.id);
          
          const [invSnap, prodSnap] = await Promise.all([
            transaction.get(invRef),
            transaction.get(prodRef)
          ]);

          if (!invSnap.exists()) throw new Error(`${item.name} omborda topilmadi!`);
          
          const actualStock = invSnap.data().stock;
          const actualPrice = prodSnap.data().price || 0;

          if (actualStock < item.quantity) {
            throw new Error(`${item.name} uchun qoldiq yetarli emas!`);
          }

          // Zaxirani ayirish
          transaction.update(invRef, { stock: actualStock - item.quantity });
          totalCalculated += (actualPrice * item.quantity);
        }

        // Sotuv hisobotini yaratish
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
      toast({ title: "Muvaffaqiyatli!", description: "Sotuv amalga oshirildi va kassa yangilandi." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Xatolik", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSum = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans">
      <OmniSidebar />
      <main className="flex-1 p-4 lg:p-6 flex flex-col lg:flex-row gap-6">
        
        {/* CHAP TOMON: QIDIRUV */}
        <div className="flex-1 space-y-4">
          <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input 
                  placeholder="Mahsulot nomi yoki kodi..." 
                  className="pl-12 h-14 bg-slate-50 border-none rounded-2xl text-lg font-medium focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              {searchQuery.length >= 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 animate-in fade-in slide-in-from-top-2">
                  {filteredProducts?.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => { addToCart(p); setSearchQuery(""); }}
                      className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all text-left"
                    >
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{p.sku || 'Noma’lum'}</p>
                      </div>
                      <p className="font-black text-blue-600 whitespace-nowrap ml-2">
                        {p.price?.toLocaleString()} <span className="text-[10px]">so'm</span>
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div className={cn(
              "p-4 rounded-2xl border flex items-center gap-3 transition-colors",
              assignedWarehouseId ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"
            )}>
              <Barcode className="w-5 h-5" />
              <div>
                <p className="text-[10px] font-black uppercase opacity-60">Skayner</p>
                <p className="text-xs font-bold">{assignedWarehouseId ? "Aktiv" : "Faol emas"}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center gap-3">
              <PackageSearch className="w-5 h-5" />
              <div>
                <p className="text-[10px] font-black uppercase opacity-60">Ombor</p>
                <p className="text-xs font-bold truncate max-w-[120px]">{assignedWarehouseId || "Biriktirilmagan"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* O'NG TOMON: SAVATCHA */}
        <Card className="w-full lg:w-[420px] rounded-[2.5rem] border-none shadow-2xl flex flex-col h-[calc(100vh-3rem)] sticky top-6">
          <CardContent className="p-6 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <ShoppingCart className="text-blue-600 w-6 h-6" /> SAVAT
              </h2>
              <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">
                {cart.length} ta mahsulot
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all group">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                    <p className="text-[11px] font-bold text-blue-600">
                      {(item.price * item.quantity).toLocaleString()} so'm
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white rounded-xl border border-slate-100 p-1 shadow-sm">
                      <button 
                        onClick={() => {
                          if(item.quantity > 1) setCart(cart.map(i => i.id === item.id ? {...i, quantity: i.quantity - 1} : i));
                          else setCart(cart.filter(i => i.id !== item.id));
                        }}
                        className="p-1 hover:bg-slate-100 rounded-lg"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-black">{item.quantity}</span>
                      <button 
                        onClick={() => addToCart(item)}
                        className="p-1 hover:bg-slate-100 rounded-lg"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button 
                      onClick={() => setCart(cart.filter(i => i.id !== item.id))}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                  <ShoppingCart className="w-20 h-20 mb-4" />
                  <p className="font-black text-xs uppercase">Savat bo'sh</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Jami summa</p>
                  <p className="text-3xl font-black text-slate-800">
                    {totalSum.toLocaleString()} <span className="text-sm font-medium">so'm</span>
                  </p>
                </div>
                <div className="bg-blue-600/10 p-4 rounded-2xl text-blue-600">
                  <Wallet className="w-7 h-7" />
                </div>
              </div>

              <Button 
                onClick={handleCheckout}
                disabled={cart.length === 0 || isSubmitting || !assignedWarehouseId}
                className={cn(
                  "w-full h-16 rounded-[1.5rem] text-lg font-black transition-all",
                  assignedWarehouseId 
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 active:scale-[0.98]" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
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
