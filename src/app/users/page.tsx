"use client";

import { useState } from "react";
import { 
  Eye, EyeOff, Save, Loader2, UserPlus, 
  Mail, ShieldCheck, UserCircle 
} from "lucide-react";
import { 
  collection, doc, setDoc, getFirestore 
} from "firebase/firestore";
import { useFirestore } from "@/firebase"; // Sizning firebase hook'ingiz
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

export default function IikoStaffPage() {
  const { toast } = useToast();
  const db = useFirestore();
  
  // --- STATE-LAR ---
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState([]); // Ruxsatlar uchun

  const initialForm = {
    lastName: "",
    firstName: "",
    middleName: "",
    email: "",
    password: "",
    position: "Menejer",
    role: "User"
  };

  const [formData, setFormData] = useState(initialForm);

  // --- SAQLASH FUNKSIYASI ---
  const handleSave = async () => {
    if (!db || !formData.email || !formData.firstName) {
      toast({ 
        variant: "destructive", 
        title: "Xato", 
        description: "Ism va Email to'ldirilishi shart!" 
      });
      return;
    }

    // Yangi foydalanuvchi bo'lsa parolni tekshirish
    if (!editingId && (!formData.password || formData.password.length < 6)) {
      toast({ 
        variant: "destructive", 
        title: "Xato", 
        description: "Parol kamida 6 ta belgidan iborat bo'lishi kerak!" 
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const id = editingId || doc(collection(db, "users")).id;
      
      // Parolni Firestore'ga yozmaslik uchun ajratib olamiz
      const { password, ...userDataToSave } = formData; 

      const payload = {
        ...userDataToSave,
        id,
        fullName: `${formData.lastName} ${formData.firstName}`.trim(),
        permissions,
        updatedAt: new Date().toISOString(),
        status: "active"
      };

      // 1. Firestore'da profil yaratish
      await setDoc(doc(db, "users", id), payload, { merge: true });
      
      /* 💡 ESLATMA: Haqiqiy Auth tizimida bu yerda parolni Firebase Auth'ga yozish kerak.
         Buni odatda Firebase Cloud Functions (Admin SDK) orqali qilish xavfsizroq.
      */

      toast({ 
        title: "Muvaffaqiyatli", 
        description: `${formData.firstName} tizimga qo'shildi.` 
      });

      // Formani tozalash
      setIsDialogOpen(false);
      setEditingId(null);
      setFormData(initialForm);
      setShowPassword(false);

    } catch (e: any) {
      toast({ 
        variant: "destructive", 
        title: "Tizim xatosi", 
        description: e.message 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-slate-50/50 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-600 rounded-2xl text-white">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase">Xodim qo'shish</h2>
          <p className="text-xs text-slate-500">Tizimga kirish huquqiga ega yangi profil yarating</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SHAXSIY MA'LUMOTLAR BLOQI */}
        <div className="md:col-span-2 space-y-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4 flex items-center gap-2">
            <UserCircle className="w-3 h-3" /> Shaxsiy ma'lumotlar
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[11px] font-bold text-slate-600 ml-1">Email (Login)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input 
                  type="email" 
                  className="h-10 text-sm pl-10 rounded-xl bg-slate-50 border-none focus-visible:ring-blue-500" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="name@company.uz"
                />
              </div>
            </div>

            {/* PAROL MAYDONI */}
            {!editingId && (
              <div>
                <Label className="text-[11px] font-bold text-slate-600 ml-1">Parol</Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input 
                    type={showPassword ? "text" : "password"}
                    className="h-10 text-sm pl-10 pr-10 rounded-xl bg-slate-50 border-none focus-visible:ring-blue-500" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    placeholder="Min. 6 ta belgi"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <Label className="text-[11px] font-bold text-slate-600 ml-1">Ism</Label>
              <Input 
                className="h-10 text-sm rounded-xl bg-slate-50 border-none focus-visible:ring-blue-500" 
                value={formData.firstName} 
                onChange={e => setFormData({...formData, firstName: e.target.value})} 
              />
            </div>

            <div>
              <Label className="text-[11px] font-bold text-slate-600 ml-1">Familiya</Label>
              <Input 
                className="h-10 text-sm rounded-xl bg-slate-50 border-none focus-visible:ring-blue-500" 
                value={formData.lastName} 
                onChange={e => setFormData({...formData, lastName: e.target.value})} 
              />
            </div>

            <div className="md:col-span-2">
              <Label className="text-[11px] font-bold text-slate-600 ml-1">Tizimdagi roli</Label>
              <Select 
                value={formData.role} 
                onValueChange={(v) => setFormData({...formData, role: v})}
              >
                <SelectTrigger className="h-11 text-sm bg-slate-50 border-none rounded-xl focus:ring-blue-500">
                  <SelectValue placeholder="Rolni tanlang" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100">
                  <SelectItem value="Admin" className="focus:bg-blue-50">Admin (To'liq nazorat)</SelectItem>
                  <SelectItem value="Manager" className="focus:bg-blue-50">Manager (Hisobotlar)</SelectItem>
                  <SelectItem value="User" className="focus:bg-blue-50">Sotuvchi (Kassa)</SelectItem>
                  <SelectItem value="Kassir" className="focus:bg-blue-50">Kassir (Faqat to'lov)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="md:col-span-2 h-14 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          {isSaving ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" /> SAQLASH VA YARATISH
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
