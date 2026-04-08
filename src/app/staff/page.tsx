"use client";

import { useState, useEffect } from "react";
import { 
  Eye, EyeOff, Save, Loader2, Mail, Lock, Camera, 
  Settings, ShieldCheck, UserPlus 
} from "lucide-react";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
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

  useEffect(() => { setMounted(true); }, []);

  const handleSave = async () => {
    if (!db || !formData.email || !formData.password) {
      toast({ variant: "destructive", title: "Xato", description: "Email va parol majburiy!" });
      return;
    }

    setIsSaving(true);
    const auth = getAuth();
    
    // Hozirgi admin sessiyasini saqlab qolish uchun emailni olamiz
    const adminEmail = auth.currentUser?.email;

    try {
      // 1. Yangi foydalanuvchi yaratish
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;

      // 2. Ruxsatlarni sizning Firestore Rules'ingizga 100% moslash
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

      // 3. Firestore-ga yozish
      await setDoc(doc(db, "users", uid), {
        lastName: formData.lastName,
        firstName: formData.firstName,
        middleName: formData.middleName,
        email: formData.email,
        position: formData.position,
        role: formData.role,
        fullName: `${formData.lastName} ${formData.firstName} ${formData.middleName}`.trim(),
        permissions: permissions,
        createdAt: serverTimestamp(),
      });

      toast({ title: "Muvaffaqiyatli!", description: "Xodim va ruxsatlar yaratildi." });
      
      // Formani tozalash
      setFormData({ lastName: "", firstName: "", middleName: "", email: "", password: "", position: "Sotuvchi", role: "User" });

    } catch (e: any) {
      let msg = e.message;
      if (msg.includes("email-already-in-use")) msg = "Bu email bazada bor!";
      toast({ variant: "destructive", title: "Xatolik!", description: msg });
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-4 lg:p-8 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300">
        
        {/* HEADER */}
        <div className="bg-[#e0e3e9] p-3 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-black text-xs shadow-lg">i</div>
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Xodim qo'shish (iiko style)</span>
          </div>
          <Settings className="w-4 h-4 text-slate-400" />
        </div>

        <Tabs defaultValue="main" className="w-full">
          <div className="bg-[#f8f9fb] border-b border-slate-200">
            <TabsList className="h-12 bg-transparent gap-0 p-0">
              <TabsTrigger value="main" className="rounded-none border-r h-full px-8 text-[10px] font-black uppercase data-[state=active]:bg-white">Ma'lumotlar</TabsTrigger>
              <TabsTrigger value="perms" className="rounded-none border-r h-full px-8 text-[10px] font-black uppercase data-[state=active]:bg-white">Ruxsatlar</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="main" className="p-10 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label className="text-[10px] font-black text-slate-400 text-right uppercase">Familiya</Label>
                  <Input className="col-span-2 h-10 text-xs bg-slate-50 border-slate-200" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label className="text-[10px] font-black text-slate-400 text-right uppercase">Ism</Label>
                  <Input className="col-span-2 h-10 text-xs bg-slate-50 border-slate-200" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label className="text-[10px] font-black text-slate-400 text-right uppercase">Lavozim</Label>
                  <Select value={formData.position} onValueChange={(v) => setFormData({...formData, position: v})}>
                    <SelectTrigger className="col-span-2 h-10 text-xs bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Menejer">Menejer</SelectItem>
                      <SelectItem value="Sotuvchi">Sotuvchi</SelectItem>
                      <SelectItem value="Kassir">Kassir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-[#f8faff] p-6 rounded-2xl border border-blue-50 space-y-4">
                <h4 className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4" /> Kirish ma'lumotlari
                </h4>
                <div className="space-y-4">
                  <Input className="h-10 text-xs bg-white border-slate-200" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} className="h-10 text-xs bg-white border-slate-200 pr-10" placeholder="Parol" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-300">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                    <SelectTrigger className="h-10 text-xs bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Super Admin</SelectItem>
                      <SelectItem value="User">Sotuvchi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="bg-[#f0f2f5] p-6 border-t border-slate-300 flex justify-end gap-4 px-10">
          <Button variant="outline" className="h-10 px-8 text-[10px] font-black border-slate-300 uppercase tracking-widest">Bekor qilish</Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="h-10 px-12 text-[10px] font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xl uppercase tracking-widest transition-all"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Saqlash</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}
