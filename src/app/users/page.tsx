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
    // 1. Validatsiya
    if (!db) return;
    if (!formData.email.includes('.') || !formData.email.includes('@')) {
      toast({ variant: "destructive", title: "Xato", description: "Email formatini to'g'ri kiriting (masalan: xodim@gmail.com)" });
      return;
    }
    if (formData.password.length < 6) {
      toast({ variant: "destructive", title: "Xato", description: "Parol kamida 6 ta belgi bo'lsin!" });
      return;
    }

    const adminPassword = prompt("Admin parolini kiriting (Sessiyani saqlash uchun):");
    if (!adminPassword) return;

    setIsSaving(true);
    const auth = getAuth();
    const adminEmail = auth.currentUser?.email;

    try {
      // 2. Auth-da yangi foydalanuvchi ochish
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;

      // 3. Rollarga qarab ruxsatlar ierarxiyasi
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

      // 4. Firestore-ga ma'lumotlarni yozish
      await setDoc(doc(db, "users", uid), {
        lastName: formData.lastName,
        firstName: formData.firstName,
        email: formData.email,
        position: formData.position,
        role: formData.role,
        fullName: `${formData.lastName} ${formData.firstName}`.trim(),
        permissions,
        createdAt: serverTimestamp(),
      });

      // 5. Admin sessiyasini qayta tiklash
      if (adminEmail) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      }

      toast({ title: "Muvaffaqiyatli!", description: `${formData.firstName} tizimga qo'shildi.` });
      setFormData({ lastName: "", firstName: "", email: "", password: "", position: "Sotuvchi", role: "User" });

    } catch (e: any) {
      let msg = e.message;
      if (e.code === 'auth/email-already-in-use') msg = "Bu email band!";
      if (e.code === 'auth/invalid-email') msg = "Email formati noto'g'ri!";
      toast({ variant: "destructive", title: "Firebase Xatosi", description: msg });
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6 lg:p-10 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden">
        
        {/* IIKO STYLE HEADER */}
        <div className="bg-[#e0e3e9] p-3 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-black text-xs">i</div>
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest italic">Foydalanuvchilar (Xodimlar)</span>
          </div>
          <Settings className="w-4 h-4 text-slate-400" />
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* CHAP TOMON: Shaxsiy */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase border-b pb-2 tracking-widest">Asosiy ma'lumotlar</h3>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300">
                  <Camera size={20} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase">{formData.lastName || "Familiya"}</p>
                  <p className="text-blue-600 text-[10px] font-bold uppercase">{formData.position}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Familiya</Label>
                  <Input className="h-9 text-xs" placeholder="Kiriting..." value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Ism</Label>
                  <Input className="h-9 text-xs" placeholder="Kiriting..." value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Lavozimi</Label>
                  <Select value={formData.position} onValueChange={v => setFormData({...formData, position: v})}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50">
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
            </div>

            {/* O'NG TOMON: Tizim */}
            <div className="space-y-4 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
              <h3 className="text-[10px] font-black text-blue-500 uppercase border-b border-blue-100 pb-2 tracking-widest">Tizim ruxsatlari</h3>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Email (Login)</Label>
                  <Input className="h-9 text-xs bg-white" placeholder="email@gmail.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Parol</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} className="h-9 text-xs bg-white" placeholder="******" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400">
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Tizimdagi roli</Label>
                  <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin (To'liq ruxsat)</SelectItem>
                      <SelectItem value="User">User (Cheklangan ruxsat)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" className="h-9 px-6 text-[10px] font-black uppercase border-slate-300">Bekor qilish</Button>
            <Button onClick={handleSave} disabled={isSaving} className="h-9 px-10 bg-blue-600 hover:bg-blue-700 text-white shadow-lg text-[10px] font-black uppercase">
              {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <span className="flex items-center gap-2"><UserPlus size={14} /> Saqlash</span>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
