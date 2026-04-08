"use client";

import { useState, useEffect } from "react";
import { 
  Eye, EyeOff, Loader2, Settings, ShieldCheck, UserPlus, Camera 
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

export default function IikoStaffPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
    email: "",
    password: "",
    position: "Sotuvchi",
    role: "User",
  });

  // "Application error"ning oldini olish uchun
  useEffect(() => { setMounted(true); }, []);

  const handleSave = async () => {
    if (!db || !formData.email || !formData.password) {
      toast({ variant: "destructive", title: "Xato", description: "Email va parol majburiy!" });
      return;
    }

    setIsSaving(true);
    const auth = getAuth();
    
    // Hozirgi adminning sessiyasini saqlab qolish uchun (Logout bo'lib ketmaslik uchun)
    const adminEmail = auth.currentUser?.email;
    const adminPassword = prompt("Admin parolini kiriting (sessiyani saqlash uchun):");

    if (!adminPassword) {
      setIsSaving(false);
      return;
    }

    try {
      // 1. Yangi xodimni Auth-da yaratish
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;

      // 2. Ruxsatlarni ierarxiyasi (Firebase Rules-ga mos)
      const permissions = formData.role === "Admin" ? {
        tizim: { foydalanuvchilar: true },
        inventar: { mahsulotlar: true },
        moliya: { xarajatlar: true },
        nakladnolar: { kirim: true },
        analitika: { dashboard: true, hisobotlar: true }
      } : {
        tizim: { foydalanuvchilar: false },
        inventar: { mahsulotlar: true },
        moliya: { xarajatlar: false },
        nakladnolar: { kirim: false },
        analitika: { dashboard: true, hisobotlar: false }
      };

      // 3. Firestore-da xodim ma'lumotlarini saqlash
      await setDoc(doc(db, "users", uid), {
        ...formData,
        fullName: `${formData.lastName} ${formData.firstName}`.trim(),
        permissions: permissions,
        createdAt: serverTimestamp(),
      });

      // 4. Admin sessiyasini qayta tiklash (Logout bo'lib ketishni oldini oladi)
      if (adminEmail) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      }

      toast({ title: "Tayyor!", description: "Xodim muvaffaqiyatli qo'shildi." });
      setFormData({ lastName: "", firstName: "", middleName: "", email: "", password: "", position: "Sotuvchi", role: "User" });

    } catch (e: any) {
      let msg = e.message;
      if (msg.includes("email-already-in-use")) msg = "Bu xodim allaqachon mavjud!";
      toast({ variant: "destructive", title: "Xatolik!", description: msg });
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6 lg:p-10 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden">
        
        {/* IIKO STYLE HEADER */}
        <div className="bg-[#e0e3e9] p-3 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-black text-xs">i</div>
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest italic">Xodim kartochkasi</span>
          </div>
          <Settings className="w-4 h-4 text-slate-400" />
        </div>

        <Tabs defaultValue="main" className="w-full">
          <div className="bg-[#f8f9fb] border-b border-slate-200">
            <TabsList className="h-12 bg-transparent gap-0 p-0">
              <TabsTrigger value="main" className="rounded-none border-r h-full px-8 text-[10px] font-black uppercase data-[state=active]:bg-white">Asosiy ma'lumotlar</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="main" className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                    <Camera className="w-8 h-8" />
                    <span className="text-[8px] font-black uppercase mt-1">FOTO</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase">{formData.lastName || "FAMILIYA"}</h3>
                    <p className="text-blue-600 text-xs font-black uppercase tracking-widest">{formData.position}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-[10px] font-black text-slate-400 text-right uppercase">Familiya</Label>
                    <Input className="col-span-2 h-10 text-xs bg-slate-50" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-[10px] font-black text-slate-400 text-right uppercase">Ism</Label>
                    <Input className="col-span-2 h-10 text-xs bg-slate-50" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="bg-[#f8faff] p-8 rounded-3xl border border-blue-50 space-y-6 shadow-inner">
                <h4 className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Tizim ruxsatlari
                </h4>
                <div className="space-y-4">
                  <Input className="h-10 text-xs bg-white" placeholder="Email (Login)" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} className="h-10 text-xs bg-white pr-10" placeholder="Maxfiy parol" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-300">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                    <SelectTrigger className="h-10 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Super Admin (To'liq ruxsat)</SelectItem>
                      <SelectItem value="User">Sotuvchi (Cheklangan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="bg-[#f0f2f5] p-6 border-t border-slate-300 flex justify-end gap-4 px-10">
          <Button variant="outline" className="h-10 px-8 text-[10px] font-black uppercase border-slate-300">Bekor qilish</Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="h-10 px-12 text-[10px] font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xl uppercase transition-all"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Saqlash</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}
