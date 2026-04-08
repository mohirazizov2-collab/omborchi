"use client";
import { useState } from "react";
import { useScanner } from "@/hooks/use-scanner";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, doc, writeBatch } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Truck, Loader2, Save } from "lucide-react";

export default function InboundPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useScanner(async (barcode) => {
    if (!db) return;
    const q = query(collection(db, "products"), where("barcode", "==", barcode));
    const snap = await getDocs(q);

    if (snap.empty) {
      toast({ variant: "destructive", title: "Yangi tavar!", description: "Bu kod bazada yo'q. Avval tavar sozlamalaridan qo'shing." });
      return;
    }

    const product = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
    setItems(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  });

  const handleSaveInventory = async () => {
    if (items.length === 0 || !db) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      items.forEach(item => {
        const ref = doc(db, "products", item.id);
        batch.update(ref, { stock: (item.stock || 0) + Number(item.qty) });
      });
      await batch.commit();
      setItems([]);
      toast({ title: "Ombor yangilandi ✅" });
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik yuz berdi" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 bg-[#f8fafc] min-h-screen">
      <h1 className="text-2xl font-black flex items-center gap-2 text-slate-800">
        <Truck className="text-blue-600" /> OMBORGA KIRIM (Inbound)
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item, idx) => (
            <Card key={idx} className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{item.name}</h3>
                  <p className="text-xs text-slate-400">Joriy qoldiq: {item.stock} ta</p>
                </div>
                <div className="flex items-center gap-3">
                   <Label className="text-xs font-bold">Qancha keldi:</Label>
                   <Input 
                    type="number" 
                    value={item.qty} 
                    onChange={e => setItems(prev => prev.map(p => p.id === item.id ? {...p, qty: e.target.value} : p))}
                    className="w-20 h-9 rounded-xl font-bold" 
                   />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-[2rem] border-none shadow-lg p-6 h-fit bg-white">
           <p className="text-sm text-slate-500 mb-4">Skayner orqali o'qitilgan tavarlar soni: <b>{items.length} ta</b></p>
           <Button 
            className="w-full h-12 rounded-2xl bg-blue-600 font-bold" 
            onClick={handleSaveInventory}
            disabled={loading || items.length === 0}
           >
             {loading ? <Loader2 className="animate-spin" /> : "OMBORGA QO'SHISH"}
           </Button>
        </Card>
      </div>
    </div>
  );
}
