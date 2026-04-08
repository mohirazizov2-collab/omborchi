"use client";

import { useState } from "react";
import { 
  Eye, EyeOff, Save, Loader2, User, 
  Mail, ShieldCheck, Briefcase, ChevronRight,
  Settings, Lock, CreditCard, Camera, FileText
} from "lucide-react";
import { doc, setDoc, collection } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
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
  const [activeTab, setActiveTab] = useState("main");

  // Sizning ma'lumotlaringiz o'zgarishsiz qoldi
  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
    email: "",
    password: "",
    position: "Menejer",
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
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;

      const { password, ...userData } = formData;
      await setDoc(doc(db, "users", uid), {
        ...userData,
        id: uid,
        fullName: `${formData.lastName} ${formData.firstName} ${formData.middleName}`.trim(),
        createdAt: new Date().toISOString(),
        permissions: {
          analitika: { dashboard: true, hisobotlar: true },
          inventar: { mahsulotlar: true },
          tizim: { foydalanuvchilar: false }
        }
      });

      toast({ title: "Saqlandi", description: "Xodim muvaffaqiyatli yaratildi." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Xato", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-4 lg:p-8 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300">
        
        {/* IIKO STYLE HEADER */}
        <div className="bg-[#e0e3e9] p-2 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">i</div>
            <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">Personal kartochka</span>
          </div>
          <button className="text-slate-500 hover:text-red-500 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>

        <Tabs defaultValue="main" className="w-full">
          <div className="bg-[#f8f9fb] border-b border-slate-200">
            <TabsList className="h-10 bg-transparent gap-0 p-0">
              <TabsTrigger value="main" className="rounded-none border-r border-slate-200 px-6 data-[state=active]:bg-white data-[state=active]:shadow-none text-[11px] font-medium">Asosiy ma'lumotlar</TabsTrigger>
              <TabsTrigger value="extra" className="rounded-none border-r border-slate-200 px-6 data-[state=active]:bg-white data-[state=active]:shadow-none text-[11px] font-medium">Qo'shimcha ma'lumotlar</TabsTrigger>
              <TabsTrigger value="docs" className="rounded-none border-r border-slate-200 px-6 data-[state=active]:bg-white data-[state=active]:shadow-none text-[11px] font-medium">Pasport/Litsenziya</TabsTrigger>
              <TabsTrigger value="pay" className="rounded-none border-r border-slate-200 px-6 data-[state=active]:bg-white data-[state=active]:shadow-none text-[11px] font-medium">To'lov</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="main" className="p-8 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              
              {/* CHAP TOMON: SHAXSIY */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-500 cursor-pointer transition-all">
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-[9px] font-bold">FOTO</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase leading-tight">
                      {formData.lastName || "FAMILIYA"} <br /> {formData.firstName || "ISM"}
                    </h3>
                    <p className="text-[10px] text-blue-600 font-bold tracking-widest mt-1 uppercase">{formData.position}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-[11px] text-slate-500 text-right">Familiya:</Label>
                    <Input className="col-span-2 h-8 text-xs bg-slate-50 border-slate-200 rounded-sm focus:ring-1 focus:ring-blue-400" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-[11px] text-slate-500 text-right">Ism:</Label>
                    <Input className="col-span-2 h-8 text-xs bg-slate-50 border-slate-200 rounded-sm" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-[11px] text-slate-500 text-right">Sharif:</Label>
                    <Input className="col-span-2 h-8 text-xs bg-slate-50 border-slate-200 rounded-sm" value={formData.middleName} onChange={e => setFormData({...formData, middleName: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-[11px] text-slate-500 text-right">Lavozim:</Label>
                    <Select value={formData.position} onValueChange={(v) => setFormData({...formData, position: v})}>
                      <SelectTrigger className="col-span-2 h-8 text-xs bg-slate-50 border-slate-200">
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

              {/* O'NG TOMON: ALOQA VA AUTH */}
              <div className="space-y-4 pt-4">
                <div className="bg-[#fcfdfe] p-6 rounded-xl border border-blue-50 space-y-4 shadow-inner">
                  <h4 className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-2 mb-4">
                    <Lock className="w-3 h-3" /> Tizimga kirish huquqlari
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-[10px] font-bold text-slate-400 ml-1">ELEKTRON POCHTA (LOGIN)</Label>
                      <div className="relative">
                        <Mail className="absolute left-2 top-2.5 w-3 h-3 text-slate-400" />
                        <Input className="h-8 text-xs pl-8 bg-white border-slate-200" placeholder="mail@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                      </div>
                    </div>

                    <div>
                      <Label className="text-[10px] font-bold text-slate-400 ml-1">PAROL</Label>
                      <div className="relative">
                        <Lock className="absolute left-2 top-2.5 w-3 h-3 text-slate-400" />
                        <Input type={showPassword ? "text" : "password"} className="h-8 text-xs pl-8 bg-white border-slate-200" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2 text-slate-400 hover:text-blue-500">
                          {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[10px] font-bold text-slate-400 ml-1">TIZIMDAGI ROLI</Label>
                      <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                        <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin (To'liq nazorat)</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="User">Sotuvchi (User)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* FOOTER ACTIONS */}
        <div className="bg-[#f0f2f5] p-4 border-t border-slate-300 flex justify-between items-center px-8">
          <button className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1">
            Ruxsatlarni tahrirlash <ChevronRight className="w-3 h-3" />
          </button>
          
          <div className="flex gap-3">
            <Button variant="outline" className="h-9 px-8 text-xs font-bold border-slate-300 text-slate-600 hover:bg-slate-100 uppercase">Bekor qilish</Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="h-9 px-10 text-xs font-bold bg-[#4a90e2] hover:bg-[#357abd] text-white shadow-lg uppercase"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="flex items-center gap-2"><Save className="w-3 h-3" /> Saqlash</span>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
