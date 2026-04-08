"use client";

import { useState, useEffect } from "react";
import { 
  Eye, EyeOff, Save, Loader2, Camera, 
  Settings, ShieldCheck, UserPlus 
} from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useFirestore } from "@/firebase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UsersManagementPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    email: "",
    password: "",
    position: "Sotuvchi",
    role: "User",
  });

  useEffect(() => { setMounted(true); }, []);

  const handleSave = async () => {
    if (!db || !formData.email || !formData.password) {
      toast({ variant: "destructive", title: "Xato", description: "Ma'lumotlarni to'ldiring!" });
      return;
    }

    const adminPassword = prompt("Admin parolini kiriting (sessiyani saqlash uchun):");
    if (!adminPassword) return;

    setIsSaving(true);
    const auth = getAuth();
    const adminEmail = auth.currentUser?.email;

    try {
      // 1. Auth-da yaratish
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;

      // 2. Rollarga qarab ruxsatlar (Barcha rollar uchun)
      let permissions = {
        tizim: { foydalanuvchilar: false },
        inventar: { mahsulotlar: true },
        moliya: { xarajatlar: false },
        nakladnolar: { kirim: false },
        analitika: { dashboard: true }
      };

      if (formData.role === "Admin") {
        permissions = {
          tizim: { foydalanuvchilar: true },
          inventar: { mahsulotlar: true },
          moliya: { xarajatlar: true },
          nakladnolar: { kirim: true },
          analitika: { dashboard: true }
        };
      } else if (formData.position === "Menejer") {
        permissions.moliya.xarajatlar = true;
        permissions.nakladnolar.kirim = true;
      }

      // 3. Firestore-ga yozish
      await setDoc(doc(db, "users", uid), {
        ...formData,
        fullName: `${formData.lastName} ${formData.firstName}`.trim(),
        permissions,
        createdAt: serverTimestamp(),
      });

      // 4. Adminni qayta kirgizish
      if (adminEmail) await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

      toast({ title: "Muvaffaqiyatli!", description: "Yangi foydalanuvchi qo'shildi." });
      setFormData({ lastName: "", firstName: "", email: "", password: "", position: "Sotuvchi", role: "User" });

    } catch (e: any) {
      toast({ variant: "destructive", title: "Xatolik!", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden">
        <div className="bg-[#e0e3e9] p-3 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-black text-xs">i</div>
            <span className="text-[11px] font-black text-slate-700 uppercase">Foydalanuvchilar boshqaruvi</span>
          </div>
          <Settings className="w-4 h-4 text-slate-400" />
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-500 uppercase border-b pb-2">Shaxsiy ma'lumotlar</h3>
              <div>
                <Label className="text-[10px] font-black uppercase">Familiya</Label>
                <Input className="h-10 text-xs" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              </div>
              <div>
                <Label className="text-[10px] font-black uppercase">Ism</Label>
                <Input className="h-10 text-xs" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              </div>
              <div>
                <Label className="text-[10px] font-black uppercase">Lavozimi</Label>
                <Select value={formData.position} onValueChange={v => setFormData({...formData, position: v})}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Menejer">Menejer</SelectItem>
                    <SelectItem value="Kassir">Kassir</SelectItem>
                    <SelectItem value="Sotuvchi">Sotuvchi</SelectItem>
                    <SelectItem value="Omborchi">Omborchi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h3 className="text-sm font-black text-blue-600 uppercase border-b border-blue-100 pb-2">Tizim ruxsatlari</h3>
              <div>
                <Label className="text-[10px] font-black uppercase">Email (Login)</Label>
                <Input className="h-10 text-xs bg-white" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <Label className="text-[10px] font-black uppercase">Parol</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} className="h-10 text-xs bg-white" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-[10px] font-black uppercase">Tizimdagi roli</Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger className="h-10 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin (To'liq)</SelectItem>
                    <SelectItem value="User">Foydalanuvchi (Cheklangan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <Button variant="outline" className="h-10 uppercase text-[10px] font-black">Bekor qilish</Button>
            <Button onClick={handleSave} disabled={isSaving} className="h-10 bg-blue-600 px-10 uppercase text-[10px] font-black">
              {isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2" size={16} />} 
              Saqlash
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
