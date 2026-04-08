"use client";

import { useState, useMemo, useEffect } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ShoppingCart, Search, Loader2, Plus, Minus, 
  Barcode, Wallet, Trash2, PackageSearch, AlertCircle
} from "lucide-react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useScanner } from "@/hooks/use-scanner";
import { cn } from "@/lib/utils";

export default function POSPage() {
  const { toast } = useToast();
  const db = useFirestore();
  // Foydalanuvchining assignedWarehouseId ma'lumotini olamiz
  const { user, assignedWarehouseId } = useUser(); 
  
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Ma'lumotlarni yuklash
  const productsQuery = useMemoFirebase(() => db ? collection(db, "products") : null, [db]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const inventoryQuery = useMemoFirebase(() => db ? collection(db, "inventory") : null, [db]);
  const { data: inventory } = useCollection(inventoryQuery);

  // 2. Qidiruv mantiqi (Nomi, SKU yoki Barcode bo'yicha)
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return products?.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.sku?.toLowerCase().includes(q) || 
      p.barcode === searchQuery
    ).slice(0, 8);
  }, [products, searchQuery]);

  // 3. Savatga qo'shish (Zaxira tekshiruvi bilan)
  const addToCart = (product: any) => {
    if (!assignedWarehouseId) {
      toast({ variant: "destructive", title: "Xatolik", description: "Sizga ombor biriktirilmagan!" });
      return;
    }

    // Ombordagi qoldiqni topish
    const stockItem = inventory?.find(inv => inv.productId === product.id && inv.warehouseId === assignedWarehouseId);
    const currentStock = stockItem?.stock || 0;

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentQty = existing ? existing.quantity : 0;

      if (currentQty >= currentStock) {
        toast({ variant: "destructive", title: "Zaxira yetarli emas", description: `Omborda jami ${currentStock} ta bor.` });
        return prev;
      }

      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  // 4. Skayner mantiqi
  useScanner(async (barcode) => {
    const product = products?.find(p => p.barcode === barcode || p.sku === barcode);
    if (product) {
      addToCart(product);
      setSearchQuery(""); // Qidiruvni tozalash
    } else {
      toast({ variant: "destructive", title: "Topilmadi", description: "Shtrix-kod bazada yo'q" });
    }
  });

  // 5. Sotuvni yakunlash
  const handleCheckout = async () => {
    if (!db || !user || !assignedWarehouseId || cart.length === 0) return;

    setIsSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        for (const item of cart) {
          const invDocId = `${assignedWarehouseId}_${item.id}`;
          const invRef = doc(db, "inventory", invDocId);
          const invSnap = await transaction.get(invRef);

          if (!invSnap.exists()) throw new Error(`${item.name} omborda mavjud emas!`);
          
          const newStock = invSnap.data().stock - item.quantity;
          if (newStock < 0) throw new Error(`${item.name} yetarli emas!`);

          transaction.update(invRef, { stock: newStock });
        }

        const saleRef = doc(collection(db, "sales"));
        transaction.set(saleRef, {
          items: cart,
          totalAmount: cart.reduce((sum, i) => sum + (i.price * i.quantity), 0),
          warehouseId: assignedWarehouseId,
          sellerId: user.uid,
          sellerName: user.displayName || user.email,
          createdAt: serverTimestamp(),
          status: "completed"
        });
      });

      setCart([]);
      toast({ title: "Sotuv yakunlandi!", description: "Ombor yangilandi va hisobot saqlandi." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Xatolik", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSum = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="flex min-h-screen bg-[#f1f5f9]">
      <OmniSidebar />
      <main className="flex-1 p-4 lg:p-8 flex flex-col lg:flex-row gap-6 mt-2">
        
        {/* CHAP TOMON: QIDIRUV VA MAHSULOTLAR */}
        <div className="flex-1 space-y-4">
          <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input 
                  placeholder="Mahsulot nomi, kodi yoki shtrix-kodini yozing..." 
                  className="pl-12 h-14 bg-slate-50 border-none rounded-2xl text-lg font-medium focus-visible:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              {searchQuery && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {filteredProducts?.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => { addToCart(p); setSearchQuery(""); }}
                      className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.sku || 'KODSIZ'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-blue-600">{p.price?.toLocaleString()} so'm</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* STATUS PANEL */}
          <div className="grid grid-cols-2 gap-4">
            <div className={cn(
              "p-4 rounded-2xl border flex items-center justify-between",
              assignedWarehouseId ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg text-white", assignedWarehouseId ? "bg-emerald-500" : "bg-amber-500")}>
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase opacity-60">Skayner Holati</p>
                  <p className="text-xs font-bold">{assignedWarehouseId ? "Skayner tayyor" : "Ombor biriktirilmagan"}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-2 rounded-lg text-white">
                  <PackageSearch className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase opacity-60">Ombor ID</p>
                  <p className="text-xs font-bold text-blue-700">{assignedWarehouseId || "ANIQLANMADI"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* O'NG TOMON: SAVATCHA (CHECK) */}
        <Card className="w-full lg:w-[450px] rounded-[2.5rem] border-none shadow-2xl bg-white flex flex-col h-[calc(100vh-6rem)]">
          <CardContent className="p-6 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <ShoppingCart className="text-blue-600" /> SAVATCHA
              </h2>
              <Badge variant="secondary" className="bg-slate-100 text-slate-500 rounded-lg">{cart.length} tur</Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl group transition-all">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm leading-tight mb-1">{item.name}</p>
                    <p className="text-[11px] font-black text-blue-600">{(item.price * item.quantity).toLocaleString()} so'm</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white rounded-xl border border-slate-100 p-1">
                      <button onClick={() => {
                        if(item.quantity > 1) setCart(cart.map(i => i.id === item.id ? {...i, quantity: i.quantity - 1} : i));
                        else setCart(cart.filter(i => i.id !== item.id));
                      }} className="p-1 hover:bg-slate-100 rounded-lg transition-all"><Minus className="w-3 h-3 text-slate-400" /></button>
                      <span className="w-8 text-center text-xs font-black text-slate-700">{item.quantity}</span>
                      <button onClick={() => addToCart(item)} className="p-1 hover:bg-slate-100 rounded-lg transition-all"><Plus className="w-3 h-3 text-slate-400" /></button>
                    </div>
                    <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="p-2 text-slate-300 hover:text-rose-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                  <ShoppingCart className="w-16 h-16 mb-4" />
                  <p className="font-black text-xs uppercase tracking-tighter">Hozircha savat bo'sh</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Jami to'lov:</p>
                  <p className="text-3xl font-black text-slate-800">{totalSum.toLocaleString()} <span className="text-sm font-medium">so'm</span></p>
                </div>
                <div className="bg-blue-600/10 p-3 rounded-2xl">
                  <Wallet className="text-blue-600 w-6 h-6" />
                </div>
              </div>

              <Button 
                onClick={handleCheckout}
                disabled={cart.length === 0 || isSubmitting || !assignedWarehouseId}
                className={cn(
                  "w-full h-16 rounded-[1.5rem] text-lg font-black shadow-xl transition-all active:scale-95",
                  assignedWarehouseId ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-200 text-slate-400"
                )}
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : "SOTUVNI YAKUNLASH"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// Yordamchi Badge komponenti (agar shadcn'da bo'lmasa)
function Badge({ children, className }: any) {
  return <span className={cn("px-2 py-1 text-[10px] font-bold uppercase", className)}>{children}</span>;
}
