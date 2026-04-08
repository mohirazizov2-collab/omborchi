"use client";

import { useState, useEffect } from "react";
import { 
  Eye, EyeOff, Save, Loader2, Mail, Lock, Camera, 
  Settings, ChevronRight, ShieldCheck 
} from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
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

  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
    email: "",
    password: "",
    position: "Sotuvchi",
    role: "User",
    phone: ""
  });

  const handleSave = async () => {
    if (!db || !formData.email || !formData.password) {
      toast({ variant: "destructive", title: "Xato", description: "Email va parol majburiy!" });
      return;
    }

    setIsSaving(true);
    const auth = getAuth();
    // Admin sessiyasini eslab qolish (yangi xodim yaratilganda admin chiqib ketmasligi uchun)
    const currentAdmin = auth.currentUser;

    try {
      // 1. Firebase Auth-da foydalanuvchi yaratish
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;

      // 2. Firestore-da ruxsatnomalar bilan hujjat yaratish
      // Bu qismini sizning Rules'ingizdagi hasPermission funksiyasiga mosladim
      const permissions = formData.role === "Admin" ? {
        tizim: { foydalanuvchilar: true },
        inventar: { mahsulotlar: true },
        moliya: { xarajatlar: true },
        nakladnolar: { kirim: true },
        analitika: { dashboard: true }
      } : {
        tizim: { foydalanuvchilar: false },
        inventar: { mahsulotlar: true }, // Sotuvchi omborni ko'ra olishi kerak
        moliya: { xarajatlar: false },
        nakladnolar: { kirim: false },
        analitika: { dashboard: true }
      };

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

      toast({ title: "Muvaffaqiyatli!", description: `${formData.firstName} tizimga qo'shildi.` });
      
      // Formani tozalash
      setFormData({
        lastName: "", firstName: "", middleName: "",
        email: "", password: "", position: "Sotuvchi",
        role: "User", phone: ""
      });

    } catch (e: any) {
      toast({ variant: "destructive", title: "Xatolik!", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-4 lg:p-8 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300">
        
        {/* HEADER */}
        <div className="bg-[#e0e3e9] p-2 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs shadow-inner">i</div>
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Personal kartochka</span>
          </div>
          <Settings className="w-4 h-4 text-slate-400" />
        </div>

        <Tabs defaultValue="main" className="w-full">
          <div className="bg-[#f8f9fb] border-b border-slate-200">
            <TabsList className="h-10 bg-transparent gap-0 p-0">
              <TabsTrigger value="main" className="rounded-none border-r border-slate-200 px-6 text-[10px] font-black uppercase tracking-tighter data-[state=active]:bg-white">Asosiy</TabsTrigger>
              <TabsTrigger value="perms" className="rounded-none border-r border-slate-200 px-6 text-[10px] font-black uppercase tracking-tighter data-[state=active]:bg-white">Huquqlar</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="main" className="p-8 m-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              
              {/* SHAXSIY MA'LUMOTLAR */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-[8px] font-black uppercase">FOTO</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase leading-none">
                      {formData.lastName || "FAMILIYA"} <br /> 
                      <span className="text-blue-600">{formData.firstName || "ISM"}</span>
                    </h3>
                    <p className="text-[9px] font-black text-slate-400 tracking-widest mt-2 uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-500" /> {formData.position}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* FAMILIYA */}
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-[10px] font-black text-slate-500 text-right uppercase">Familiya:</Label>
                    <Input className="col-span-2 h-9 text-xs bg-slate-50 border-slate-200 rounded-md" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                  {/* ISM */}
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-[10px] font-black text-slate-500 text-right uppercase">Ism:</Label>
                    <Input className="col-span-2 h-9 text-xs bg-slate-50 border-slate-200 rounded-md" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  {/* LAVOZIM */}
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-[10px] font-black text-slate-500 text-right uppercase">Lavozim:</Label>
                    <Select value={formData.position} onValueChange={(v) => setFormData({...formData, position: v})}>
                      <SelectTrigger className="col-span-2 h-9 text-xs bg-slate-50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Menejer">Menejer</SelectItem>
                        <SelectItem value="Kassir">Kassir</SelectItem>
                        <SelectItem value="Sotuvchi">Sotuvchi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* TIZIMGA KIRISH (LOGIN/PASS) */}
              <div className="space-y-4">
                <div className="bg-[#fcfdfe] p-6 rounded-2xl border border-blue-100 shadow-sm space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2 mb-2">
                    <Lock className="w-3 h-3" /> Akkaunt sozlamalari
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-[9px] font-black text-slate-400 ml-1 uppercase">Elektron pochta (Login)</Label>
                      <Input className="h-9 text-xs bg-white border-slate-200" placeholder="pochta@mail.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>

                    <div>
                      <Label className="text-[9px] font-black text-slate-400 ml-1 uppercase">Maxfiy parol</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} className="h-9 text-xs bg-white border-slate-200 pr-10" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[9px] font-black text-slate-400 ml-1 uppercase">Tizimdagi roli</Label>
                      <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                        <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
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
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* FOOTER */}
        <div className="bg-[#f8f9fb] p-4 border-t border-slate-300 flex justify-between items-center px-8">
          <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Tizim holati: Online
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" className="h-9 px-6 text-[10px] font-black border-slate-300 text-slate-600 uppercase tracking-widest">Bekor qilish</Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="h-9 px-10 text-[10px] font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg uppercase tracking-widest"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="flex items-center gap-2"><Save className="w-3 h-3" /> Saqlash</span>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
