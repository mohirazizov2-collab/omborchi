"use client";
 
import { useState, useEffect } from "react";
import {
  Eye, EyeOff, Loader2, Camera,
  Settings, UserPlus
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
 
// ─── 4 ta rol ───────────────────────────────────────────────────────────────
type Role = "SuperAdmin" | "Admin" | "Kassir" | "Seller";
 
const ROLES: { value: Role; label: string; desc: string; color: string }[] = [
  {
    value: "SuperAdmin",
    label: "Super Admin",
    desc: "Tizimning to'liq nazorati. Barcha sozlamalar va boshqa adminlarni boshqarish.",
    color: "text-amber-700 bg-amber-50 border-amber-300",
  },
  {
    value: "Admin",
    label: "Admin",
    desc: "Xodimlar, moliya va hisobotlarni ko'rish va tahrirlash.",
    color: "text-violet-700 bg-violet-50 border-violet-300",
  },
  {
    value: "Kassir",
    label: "Kassir",
    desc: "Kassa operatsiyalari va to'lovlarni qayta ishlash.",
    color: "text-cyan-700 bg-cyan-50 border-cyan-300",
  },
  {
    value: "Seller",
    label: "Seller",
    desc: "Savdo operatsiyalari va mahsulotlar ro'yxatini ko'rish.",
    color: "text-green-700 bg-green-50 border-green-300",
  },
];
 
// ─── Ruxsatlar ierarxiyasi ────────────────────────────────────────────────
function buildPermissions(role: Role) {
  const base = {
    tizim:      { foydalanuvchilar: false, sozlamalar: false },
    inventar:   { mahsulotlar: false },
    moliya:     { xarajatlar: false, hisobot: false },
    nakladnolar:{ kirim: false, chiqim: false },
    analitika:  { dashboard: false },
    kassa:      { operatsiya: false },
  };
 
  switch (role) {
    case "SuperAdmin":
      return {
        tizim:      { foydalanuvchilar: true,  sozlamalar: true },
        inventar:   { mahsulotlar: true },
        moliya:     { xarajatlar: true,  hisobot: true },
        nakladnolar:{ kirim: true,  chiqim: true },
        analitika:  { dashboard: true },
        kassa:      { operatsiya: true },
      };
    case "Admin":
      return {
        tizim:      { foydalanuvchilar: true,  sozlamalar: false },
        inventar:   { mahsulotlar: true },
        moliya:     { xarajatlar: true,  hisobot: true },
        nakladnolar:{ kirim: true,  chiqim: true },
        analitika:  { dashboard: true },
        kassa:      { operatsiya: false },
      };
    case "Kassir":
      return {
        ...base,
        inventar:   { mahsulotlar: true },
        analitika:  { dashboard: true },
        kassa:      { operatsiya: true },
      };
    case "Seller":
    default:
      return {
        ...base,
        inventar: { mahsulotlar: true },
        analitika: { dashboard: true },
      };
  }
}
 
// ─── Komponent ───────────────────────────────────────────────────────────────
export default function UsersManagementPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
 
  const [formData, setFormData] = useState({
    lastName:  "",
    firstName: "",
    email:     "",
    password:  "",
    position:  "Sotuvchi",
    role:      "Seller" as Role,
  });
 
  useEffect(() => { setMounted(true); }, []);
 
  const handleSave = async () => {
    if (!db) return;
 
    if (!formData.email.includes(".") || !formData.email.includes("@")) {
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
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;
      const permissions = buildPermissions(formData.role);
 
      await setDoc(doc(db, "users", uid), {
        lastName:  formData.lastName,
        firstName: formData.firstName,
        email:     formData.email,
        position:  formData.position,
        role:      formData.role,
        fullName:  `${formData.lastName} ${formData.firstName}`.trim(),
        permissions,
        createdAt: serverTimestamp(),
      });
 
      if (adminEmail) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      }
 
      toast({ title: "Muvaffaqiyatli!", description: `${formData.firstName} tizimga qo'shildi.` });
      setFormData({ lastName: "", firstName: "", email: "", password: "", position: "Sotuvchi", role: "Seller" });
 
    } catch (e: any) {
      let msg = e.message;
      if (e.code === "auth/email-already-in-use") msg = "Bu email band!";
      if (e.code === "auth/invalid-email")        msg = "Email formati noto'g'ri!";
      toast({ variant: "destructive", title: "Firebase Xatosi", description: msg });
    } finally {
      setIsSaving(false);
    }
  };
 
  if (!mounted) return null;
 
  const selectedRole = ROLES.find(r => r.value === formData.role)!;
 
  return (
    <div className="min-h-screen bg-[#d6dae3] p-6 lg:p-10 font-mono text-slate-800">
      <div className="max-w-3xl mx-auto bg-[#e8eaef] rounded shadow-2xl border border-[#bcc1cc] overflow-hidden">
 
        {/* ── IIKO HEADER ── */}
        <div className="bg-[#2b3a5c] px-3 py-2 flex items-center justify-between border-b border-[#1a2744]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center text-white font-black text-[11px] italic">ii</div>
            <span className="text-[10px] font-bold text-[#c8d4f0] uppercase tracking-[0.12em] italic">
              Foydalanuvchilar — Xodimlarni boshqarish
            </span>
          </div>
          <Settings className="w-3.5 h-3.5 text-[#6b7fa8]" />
        </div>
 
        {/* ── TOOLBAR ── */}
        <div className="bg-[#e0e3e9] px-2 py-1.5 border-b border-[#bcc1cc] flex items-center gap-1">
          {["Fayl", "Ko'rish", "Hisobot"].map(m => (
            <button key={m} className="text-[10px] text-slate-600 px-2.5 py-1 hover:bg-[#d0d4dc] rounded-sm">
              {m}
            </button>
          ))}
        </div>
 
        <div className="p-6 space-y-5">
 
          {/* ── AVATAR PREVIEW ── */}
          <div className="flex items-center gap-4 p-3 bg-white border border-[#bcc1cc] rounded-sm">
            <div className="w-12 h-12 bg-[#d0d4dc] border border-dashed border-[#adb3c0] rounded flex items-center justify-center text-slate-400">
              <Camera size={18} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-700">
                {formData.lastName || "Familiya"} {formData.firstName || "Ism"}
              </p>
              <p className="text-[9px] font-bold uppercase text-blue-600 tracking-widest mt-0.5">{formData.position}</p>
              <span className={`inline-block mt-1 text-[9px] font-black uppercase px-2 py-0.5 border rounded-sm tracking-wider ${selectedRole.color}`}>
                {selectedRole.label}
              </span>
            </div>
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 
            {/* ── CHAP: Shaxsiy ── */}
            <div className="space-y-1">
              <div className="bg-[#dce0e8] px-2 py-1 border border-[#bcc1cc] border-b-0 rounded-t-sm">
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">Asosiy ma'lumotlar</span>
              </div>
              <div className="bg-white border border-[#bcc1cc] p-4 space-y-3 rounded-b-sm">
                {[
                  { label: "Familiya", field: "lastName",  ph: "Karimov" },
                  { label: "Ism",      field: "firstName", ph: "Ali" },
                ].map(({ label, field, ph }) => (
                  <div key={field} className="space-y-0.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{label}</Label>
                    <Input
                      className="h-8 text-[11px] bg-[#f0f2f7] border-[#bcc1cc] rounded-sm font-mono"
                      placeholder={ph}
                      value={(formData as any)[field]}
                      onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="space-y-0.5">
                  <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Lavozim</Label>
                  <Select value={formData.position} onValueChange={v => setFormData({ ...formData, position: v })}>
                    <SelectTrigger className="h-8 text-[11px] bg-[#f0f2f7] border-[#bcc1cc] rounded-sm font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Menejer", "Kassir", "Sotuvchi", "Omborchi", "Hisobchi"].map(p => (
                        <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
 
            {/* ── O'NG: Tizim ── */}
            <div className="space-y-1">
              <div className="bg-[#dce0e8] px-2 py-1 border border-[#bcc1cc] border-b-0 rounded-t-sm">
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">Tizim ruxsatlari</span>
              </div>
              <div className="bg-[#eef2fb] border border-blue-200 p-4 space-y-3 rounded-b-sm">
                <div className="space-y-0.5">
                  <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Email (Login)</Label>
                  <Input
                    type="email"
                    className="h-8 text-[11px] bg-white border-[#bcc1cc] rounded-sm font-mono"
                    placeholder="ali@company.uz"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Parol</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      className="h-8 text-[11px] bg-white border-[#bcc1cc] rounded-sm font-mono pr-8"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-blue-600"
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
 
                {/* ── 4 ta rol ── */}
                <div className="space-y-0.5">
                  <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Tizimdagi roli</Label>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    {ROLES.map(role => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: role.value })}
                        className={`text-left px-2.5 py-2 border rounded-sm transition-all text-[9px] font-black uppercase tracking-wider
                          ${formData.role === role.value
                            ? `${role.color} ring-1 ring-offset-0 ring-current`
                            : "bg-white border-[#bcc1cc] text-slate-500 hover:border-slate-400"
                          }`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                  {/* Tanlangan rol tavsifi */}
                  <p className="text-[9px] text-slate-500 mt-1.5 px-1 leading-relaxed">
                    ✓ {selectedRole.desc}
                  </p>
                </div>
              </div>
            </div>
          </div>
 
          {/* ── ACTION BUTTONS ── */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#bcc1cc]">
            <Button
              variant="outline"
              className="h-8 px-5 text-[9px] font-black uppercase tracking-widest border-[#bcc1cc] bg-[#e8eaef] hover:bg-[#d8dce6] rounded-sm"
              onClick={() => setFormData({ lastName: "", firstName: "", email: "", password: "", position: "Sotuvchi", role: "Seller" })}
            >
              Bekor qilish
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 px-8 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-widest rounded-sm shadow"
            >
              {isSaving
                ? <Loader2 className="animate-spin w-3.5 h-3.5" />
                : <span className="flex items-center gap-1.5"><UserPlus size={12} /> Saqlash</span>
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
 
