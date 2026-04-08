"use client";

import { useState, useMemo } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ShoppingCart, Search, Loader2, Plus, Minus, 
  Barcode, Wallet, ArrowLeftRight
} from "lucide-react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useScanner } from "@/hooks/use-scanner";
import { cn } from "@/lib/utils";

export default function POSPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user, assignedWarehouseId } = useUser(); // Foydalanuvchiga biriktirilgan ombor ID-si
  
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Mahsulotlarni va Ombor qoldig'ini yuklash
  const productsQuery = useMemoFirebase(() => db ? collection(db, "products") : null, [db]);
  const { data: products } = useCollection(productsQuery);

  const inventoryQuery = useMemoFirebase(() => db ? collection(db, "inventory") : null, [db]);
  const { data: inventory } = useCollection(inventoryQuery);

  // 2. Skayner mantiqi
  useScanner(async (barcode) => {
    const product = products?.find(p => p.barcode === barcode || p.sku === barcode);
    if (product) addToCart(product);
  });

  const addToCart = (product: any) => {
    // Ombor qoldig'ini tekshirish
    const stockItem = inventory?.find(inv => inv.productId === product.id && inv.warehouseId === assignedWarehouseId);
    const currentStock = stockItem?.stock || 0;

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentQtyInCart = existing ? existing.quantity : 0;

      if (currentQtyInCart >= currentStock) {
        toast({ variant: "destructive", title: "Omborda yetarli emas!", description: `Qoldiq: ${currentStock}` });
        return prev;
      }

      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  // 3. SOTUVNI YAKUNLASH (HISOBOT VA OMBORDAN YECHISH)
  const handleCheckout = async () => {
    if (!db || !user || !assignedWarehouseId || cart.length === 0) {
      toast({ variant: "destructive", title: "Xatolik", description: "Ombor biriktirilmagan yoki savat bo'sh" });
      return;
    }

    setIsSubmitting(true);

    try {
      await runTransaction(db, async (transaction) => {
        // Har bir mahsulot uchun ombor qoldig'ini yangilash
        for (const item of cart) {
          const invDocId = `${assignedWarehouseId}_${item.id}`; // Inventory hujjati ID-si formati
          const invRef = doc(db, "inventory", invDocId);
          
          const invSnap = await transaction.get(invRef);
          if (!invSnap.exists()) throw new Error(`${item.name} omborda topilmadi!`);

          const newStock = invSnap.data().stock - item.quantity;
          if (newStock < 0) throw new Error(`${item.name} uchun yetarli qoldiq yo'q!`);

          // 1. Ombordan mahsulotni ayiramiz
          transaction.update(invRef, { stock: newStock });
        }

        // 2. Hisobotni (Sales) Dashboard uchun yozamiz
        const saleRef = doc(collection(db, "sales"));
        transaction.set(saleRef, {
          items: cart,
          totalAmount: cart.reduce((sum, i) => sum + (i.price * i.quantity), 0),
          warehouseId: assignedWarehouseId, // Qaysi ombor hisobotiga tushishi
          sellerId: user.uid,
          sellerName: user.displayName,
          createdAt: serverTimestamp(),
          status: "completed"
        });
      });

      setCart([]);
      toast({ title: "Sotuv muvaffaqiyatli!", description: "Ombor yangilandi va hisobot yuborildi." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Sotuvda xatolik", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSum = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <OmniSidebar />
      <main className="flex-1 p-6 flex gap-6">
        
        {/* CHAP TOMON: QIDIRUV */}
        <div className="flex-1">
          <Card className="rounded-3xl border-none shadow-sm mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Nomi yoki shtrix-kodi bo'yicha..." 
                  className="pl-12 h-14 bg-slate-50 border-none rounded-2xl text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-6">
                {products?.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6).map(p => (
                  <button 
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="flex flex-col p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all text-left"
                  >
                    <span className="font-bold text-slate-800">{p.name}</span>
                    <span className="text-blue-600 font-black mt-2">{p.price?.toLocaleString()} so'm</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Barcode className="text-emerald-600" />
              <p className="text-sm font-bold text-emerald-700">SKAYNER AKTIV</p>
            </div>
            <p className="text-[10px] font-bold text-emerald-400 uppercase">Ombor ID: {assignedWarehouseId || 'Tanlanmagan'}</p>
          </div>
        </div>

        {/* O'NG TOMON: CHECK (SAVAT) */}
        <Card className="w-[400px] rounded-[2.5rem] border-none shadow-xl flex flex-col h-[calc(100vh-3rem)]">
          <CardContent className="p-6 flex-1 flex flex-col overflow-hidden">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <ShoppingCart className="text-blue-600" /> SAVATCHA
            </h2>

            <div className="flex-1 overflow-y-auto space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.price?.toLocaleString()} so'm</p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                    <button onClick={() => {
                      if(item.quantity > 1) setCart(cart.map(i => i.id === item.id ? {...i, quantity: i.quantity - 1} : i));
                      else setCart(cart.filter(i => i.id !== item.id));
                    }} className="p-1"><Minus className="w-3 h-3" /></button>
                    <span className="w-6 text-center font-bold">{item.quantity}</span>
                    <button onClick={() => addToCart(item)} className="p-1"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <p className="text-slate-400 font-bold uppercase text-xs">Jami:</p>
                <p className="text-3xl font-black text-blue-600">{totalSum.toLocaleString()} <span className="text-sm">so'm</span></p>
              </div>
              <Button 
                onClick={handleCheckout}
                disabled={isSubmitting || cart.length === 0}
                className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-lg font-black"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : "TO'LOVNI QABUL QILISH"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
