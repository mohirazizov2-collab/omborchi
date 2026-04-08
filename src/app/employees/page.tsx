"use client";
import { useState } from "react";
import { useScanner } from "@/hooks/use-scanner";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, doc, writeBatch, addDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ShoppingCart, Loader2 } from "lucide-react";

export default function SalePage() {
  const { db } = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // SKAYNER QILINGANDA
  useScanner(async (barcode) => {
    if (!db) return;
    
    // 1. Bazadan shtrix-kod orqali tavarni qidirish
    const q = query(collection(db, "products"), where("barcode", "==", barcode));
    const snap = await getDocs(q);

    if (snap.empty) {
      toast({ variant: "destructive", title: "Tavar topilmadi", description: "Bu shtrix-kod bazada yo'q" });
      return;
    }

    const product = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;

    // 2. Savatga qo'shish (agar bo'lsa sonini oshirish)
    setCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1, customPrice: product.salePrice }];
    });
  });

  // SOTUVNI AMALGA OSHIRISH
  const handleFinalizeSale = async () => {
    if (cart.length === 0 || !db || !user) return;
    setLoading(true);

    try {
      const batch = writeBatch(db);
      
      for (const item of cart) {
        // A. Ombor qoldig'ini kamaytirish
        const productRef = doc(db, "products", item.id);
        batch.update(productRef, {
          stock: (item.stock || 0) - item.qty
        });

        // B. Sotuv tarixiga yozish (Hisobot uchun)
        await addDoc(collection(db, "sales"), {
          productId: item.id,
          productName: item.name,
          soldPrice: Number(item.customPrice), // Sotuvchi o'zi belgilagan narx
          originalPrice: item.salePrice,
          quantity: item.qty,
          sellerId: user.uid,
          date: new Date().toISOString()
        });
      }

      await batch.commit();
      setCart([]);
      toast({ title: "Sotuv bajarildi ✅" });
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <ShoppingCart className="text-blue-600" /> KASSA (Sotuv)
        </h1>
        <div className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full font-bold animate-pulse">
          SKAYNER TAYYOR...
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Savat ro'yxati */}
        <div className="md:col-span-2 space-y-3">
          {cart.map((item, index) => (
            <Card key={index} className="border-none shadow-sm rounded-2xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{item.name}</h3>
                  <p className="text-[10px] text-slate-400">Shtrix-kod: {item.barcode}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Sotuvchi narxni o'zi o'zgartirishi mumkin bo'lgan joy */}
                  <div className="w-24">
                    <Label className="text-[10px]">Sotuv narxi</Label>
                    <Input 
                      type="number" 
                      value={item.customPrice} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setCart(prev => prev.map(p => p.id === item.id ? {...p, customPrice: val} : p));
                      }}
                      className="h-8 text-xs font-bold"
                    />
                  </div>
                  <div className="w-16">
                    <Label className="text-[10px]">Soni</Label>
                    <Input 
                      type="number" 
                      value={item.qty} 
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCart(prev => prev.map(p => p.id === item.id ? {...p, qty: val} : p));
                      }}
                      className="h-8 text-xs font-bold"
                    />
                  </div>
                  <Button variant="ghost" onClick={() => setCart(cart.filter(c => c.id !== item.id))}>
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Jami va Tasdiqlash */}
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-6 h-fit">
          <h2 className="font-black text-slate-900 mb-4">JAMI SAVDO</h2>
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Mahsulotlar:</span>
              <span className="font-bold">{cart.length} ta</span>
            </div>
            <div className="flex justify-between text-xl border-t pt-4">
              <span className="font-black">Summa:</span>
              <span className="font-black text-blue-600">
                {cart.reduce((a, b) => a + (Number(b.customPrice) * b.qty), 0).toLocaleString()} so'm
              </span>
            </div>
          </div>
          <Button 
            className="w-full h-14 rounded-2xl bg-blue-600 font-black"
            disabled={loading || cart.length === 0}
            onClick={handleFinalizeSale}
          >
            {loading ? <Loader2 className="animate-spin" /> : "SOTUVNI YAKUNLASH"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
