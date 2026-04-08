"use client";
 
import { useState, useMemo } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck, UserPlus, Search, Loader2, Edit2, Trash2,
  Lock, Eye, EyeOff, Users, KeyRound, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, UserCog, Building2, LayoutGrid,
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import {
  collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import {
  getAuth, createUserWithEmailAndPassword, updatePassword,
  deleteUser as deleteFirebaseUser,
} from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
 
// ─── Konstantlar ───────────────────────────────────────────────────────────────
 
const ROLES = [
  "Super Admin",
  "Admin",
  "Menejer",
  "Sotuvchi",
  "Ombor boshlig'i",
  "Hisobchi",
  "Ishchi",
] as const;
type Role = (typeof ROLES)[number];
 
// Barcha bo'limlar — Super Admin qaysi rolga qaysi bo'lim ko'rinishini belgilaydi
const ALL_MODULES = [
  { key: "dashboard",       label: "Bosh sahifa (Dashboard)" },
  { key: "sales",           label: "Sotuv" },
  { key: "inventory",       label: "Inventarizatsiya" },
  { key: "warehouse",       label: "Ombor" },
  { key: "products",        label: "Mahsulotlar" },
  { key: "staff",           label: "Xodimlar" },
  { key: "finance",         label: "Moliya / Kassa" },
  { key: "reports",         label: "Hisobotlar" },
  { key: "settings",        label: "Sozlamalar" },
  { key: "suppliers",       label: "Ta'minotchilar" },
  { key: "clients",         label: "Mijozlar" },
  { key: "production",      label: "Ishlab chiqarish" },
] as const;
type ModuleKey = (typeof ALL_MODULES)[number]["key"];
 
// Har bir modul uchun mumkin bo'lgan amallar
const MODULE_ACTIONS = ["view", "create", "edit", "delete"] as const;
type Action = (typeof MODULE_ACTIONS)[number];
 
const ACTION_LABELS: Record<Action, string> = {
  view:   "Ko'rish",
  create: "Yaratish",
  edit:   "Tahrirlash",
  delete: "O'chirish",
};
 
// Ruxsat tuzilmasi: { dashboard: ["view","create",...], ... }
type Permissions = Partial<Record<ModuleKey, Action[]>>;
 
// Standart ruxsatlar — rolga qarab
const DEFAULT_PERMISSIONS: Record<Role, Permissions> = {
  "Super Admin":    Object.fromEntries(ALL_MODULES.map(m => [m.key, [...MODULE_ACTIONS]])) as Permissions,
  "Admin":          Object.fromEntries(ALL_MODULES.map(m => [m.key, ["view","create","edit"] as Action[]])) as Permissions,
  "Menejer":        { dashboard:["view"], sales:["view","create","edit"], products:["view"], clients:["view","create","edit"], reports:["view"] },
  "Sotuvchi":       { dashboard:["view"], sales:["view","create"], products:["view"], clients:["view"] },
  "Ombor boshlig'i":{ dashboard:["view"], warehouse:["view","create","edit","delete"], inventory:["view","create","edit"], products:["view"] },
  "Hisobchi":       { dashboard:["view"], finance:["view","create","edit"], reports:["view","create"] },
  "Ishchi":         { dashboard:["view"] },
};
 
// ─── Tiplar ────────────────────────────────────────────────────────────────────
 
interface StaffMember {
  id: string;
  // Asosiy ma'lumotlar
  surname: string;
  name: string;
  patronymic: string;
  dob: string;
  gender: string;
  position: string;
  phone: string;
  email: string;
  address: string;
  // Login
  role: Role;
  hasLogin: boolean;         // Login ochilganmi
  loginEmail: string;        // Login uchun email
  uid?: string;              // Firebase Auth UID
  // Ruxsatlar
  permissions: Permissions;
  // Tur
  isEmployee: boolean;
  isSupplier: boolean;
  isGuest: boolean;
  // Meta
  status: "active" | "inactive";
  createdAt?: any;
  updatedAt?: any;
}
 
type FormData = Omit<StaffMember, "id" | "createdAt" | "updatedAt">;
 
const initialForm: FormData = {
  surname: "", name: "", patronymic: "", dob: "", gender: "Male",
  position: "Sotuvchi", phone: "", email: "", address: "",
  role: "Sotuvchi", hasLogin: false, loginEmail: "",
  permissions: DEFAULT_PERMISSIONS["Sotuvchi"],
  isEmployee: true, isSupplier: false, isGuest: false,
  status: "active",
};
 
// ─── ASOSIY KOMPONENT ──────────────────────────────────────────────────────────
 
export default function StaffManagementPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role: currentUserRole } = useUser();
 
  const isSuperAdmin = currentUserRole === "Super Admin";
 
  // ── Holat ──
  const [searchQuery, setSearchQuery]     = useState("");
  const [filterRole, setFilterRole]       = useState<"all" | Role>("all");
  const [filterStatus, setFilterStatus]   = useState<"all"|"active"|"inactive">("all");
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [loading, setLoading]             = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showPass, setShowPass]           = useState(false);
  const [password, setPassword]           = useState("");
  const [formData, setFormData]           = useState<FormData>(initialForm);
  const [activeTab, setActiveTab]         = useState("main");
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
 
  // ── Firebase ──
  const staffQuery = useMemoFirebase(() => db ? collection(db, "staff") : null, [db]);
  const { data: staffList, isLoading } = useCollection(staffQuery);
 
  // ── Filtrlangan ro'yxat ──
  const filtered = useMemo(() => {
    if (!staffList) return [];
    let list = staffList as unknown as StaffMember[];
    if (filterRole !== "all") list = list.filter(s => s.role === filterRole);
    if (filterStatus !== "all") list = list.filter(s => s.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        `${s.surname} ${s.name} ${s.patronymic}`.toLowerCase().includes(q) ||
        s.loginEmail?.toLowerCase().includes(q) ||
        s.phone?.includes(q)
      );
    }
    return list;
  }, [staffList, searchQuery, filterRole, filterStatus]);
 
  // ── Statistika ──
  const stats = useMemo(() => ({
    total:    (staffList?.length ?? 0),
    active:   (staffList as unknown as StaffMember[] ?? []).filter(s => s.status === "active").length,
    withLogin:(staffList as unknown as StaffMember[] ?? []).filter(s => s.hasLogin).length,
  }), [staffList]);
 
  // ── Modal ochish ──
  const openCreate = () => {
    setFormData(initialForm);
    setPassword("");
    setEditingId(null);
    setActiveTab("main");
    setIsModalOpen(true);
  };
 
  const openEdit = (member: StaffMember) => {
    setFormData({
      surname: member.surname ?? "",
      name: member.name ?? "",
      patronymic: member.patronymic ?? "",
      dob: member.dob ?? "",
      gender: member.gender ?? "Male",
      position: member.position ?? "",
      phone: member.phone ?? "",
      email: member.email ?? "",
      address: member.address ?? "",
      role: member.role ?? "Sotuvchi",
      hasLogin: member.hasLogin ?? false,
      loginEmail: member.loginEmail ?? "",
      permissions: member.permissions ?? DEFAULT_PERMISSIONS[member.role ?? "Sotuvchi"],
      isEmployee: member.isEmployee ?? true,
      isSupplier: member.isSupplier ?? false,
      isGuest: member.isGuest ?? false,
      status: member.status ?? "active",
    });
    setPassword("");
    setEditingId(member.id);
    setActiveTab("main");
    setIsModalOpen(true);
  };
 
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setPassword("");
    setFormData(initialForm);
  };
 
  // ── Rol o'zgarganda standart ruxsatlarni yuklash ──
  const handleRoleChange = (role: Role) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: DEFAULT_PERMISSIONS[role],
    }));
  };
 
  // ── Ruxsat toggle ──
  const toggleAction = (moduleKey: ModuleKey, action: Action) => {
    setFormData(prev => {
      const current: Action[] = prev.permissions[moduleKey] ?? [];
      const has = current.includes(action);
      const updated = has ? current.filter(a => a !== action) : [...current, action];
      return {
        ...prev,
        permissions: { ...prev.permissions, [moduleKey]: updated },
      };
    });
  };
 
  const toggleModule = (moduleKey: ModuleKey, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleKey]: checked ? [...MODULE_ACTIONS] : [],
      },
    }));
  };
 
  // ── Saqlash ──
  const handleSubmit = async () => {
    if (!formData.name || !formData.surname) {
      toast({ title: "Xatolik", description: "Ism va Familiya majburiy!", variant: "destructive" });
      return;
    }
    if (formData.hasLogin && !editingId && (!formData.loginEmail || !password)) {
      toast({ title: "Xatolik", description: "Login va parol majburiy!", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let uid = formData.uid;
 
      // Firebase Auth — yangi login yaratish
      if (formData.hasLogin && !editingId && formData.loginEmail && password) {
        const auth = getAuth();
        const cred = await createUserWithEmailAndPassword(auth, formData.loginEmail, password);
        uid = cred.user.uid;
      }
 
      const payload = { ...formData, uid, updatedAt: serverTimestamp() };
 
      if (editingId) {
        await updateDoc(doc(db!, "staff", editingId), payload);
        toast({ title: "Yangilandi ✓" });
      } else {
        await addDoc(collection(db!, "staff"), { ...payload, createdAt: serverTimestamp() });
        toast({ title: "Qo'shildi ✓" });
      }
      closeModal();
    } catch (e: any) {
      const msg = e?.code === "auth/email-already-in-use"
        ? "Bu email allaqachon ishlatilmoqda"
        : e?.code === "auth/weak-password"
        ? "Parol kamida 6 ta belgidan iborat bo'lishi kerak"
        : "Saqlashda xatolik yuz berdi";
      toast({ title: "Xatolik", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
 
  // ── O'chirish ──
  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "staff", id));
      toast({ title: "O'chirildi" });
      setDeleteConfirm(null);
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };
 
  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );
 
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="flex min-h-screen bg-[#f1f5f9]">
      <OmniSidebar />
 
      <main className="flex-1 flex flex-col overflow-hidden">
 
        {/* ── TOP BAR ── */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 flex-wrap">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h1 className="text-base font-semibold text-slate-800">Xodimlar va foydalanuvchilar</h1>
          <div className="flex-1" />
          {isSuperAdmin && (
            <Button
              size="sm"
              onClick={openCreate}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-1"
            >
              <UserPlus className="w-4 h-4" /> Foydalanuvchi qo'shish
            </Button>
          )}
        </div>
 
        {/* ── STATISTIKA ── */}
        <div className="px-6 py-4 grid grid-cols-3 gap-3">
          {[
            { label: "Jami xodim",    value: stats.total,     icon: <Users className="w-4 h-4" />,    color: "text-slate-700" },
            { label: "Faol",          value: stats.active,    icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-600" },
            { label: "Logini bor",    value: stats.withLogin, icon: <KeyRound className="w-4 h-4" />, color: "text-blue-600" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-3">
              <span className={cn("opacity-60", color)}>{icon}</span>
              <div>
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className={cn("text-xl font-semibold", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>
 
        {/* ── FILTER + SEARCH ── */}
        <div className="px-6 pb-3 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Qidirish..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-9 w-56 text-sm border-slate-200"
            />
          </div>
          <Select value={filterRole} onValueChange={v => setFilterRole(v as any)}>
            <SelectTrigger className="w-44 h-9 text-sm border-slate-200">
              <SelectValue placeholder="Barcha rollar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha rollar</SelectItem>
              {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
            <SelectTrigger className="w-36 h-9 text-sm border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
              <SelectItem value="active">Faol</SelectItem>
              <SelectItem value="inactive">Nofaol</SelectItem>
            </SelectContent>
          </Select>
        </div>
 
        {/* ── JADVAL ── */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Xodim</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-32">Lavozim</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-32">Rol</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-40">Login (email)</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-20">Holat</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-20">Login</th>
                  {isSuperAdmin && (
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-24">Amallar</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                      Xodimlar topilmadi
                    </td>
                  </tr>
                ) : (
                  filtered.map((member) => {
                    const m = member as StaffMember;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 text-sm">
                            {m.surname} {m.name} {m.patronymic}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{m.phone}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{m.position}</td>
                        <td className="px-4 py-3">
                          <RoleBadge role={m.role} />
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 truncate">
                          {m.loginEmail || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "text-[11px] px-2 py-0.5 rounded-full font-medium",
                            m.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-400"
                          )}>
                            {m.status === "active" ? "Faol" : "Nofaol"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {m.hasLogin
                            ? <Lock className="w-4 h-4 text-blue-500 mx-auto" />
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        {isSuperAdmin && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => openEdit(m)}
                                className="w-7 h-7 text-slate-400 hover:text-blue-600"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => setDeleteConfirm(m.id)}
                                className="w-7 h-7 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
 
            <div className="border-t border-slate-100 px-4 py-2 bg-slate-50 flex items-center gap-4 text-xs text-slate-500">
              <span>Jami: <strong className="text-slate-700">{filtered.length}</strong> ta</span>
            </div>
          </div>
        </div>
      </main>
 
      {/* ════════ MODAL: Xodim qo'shish / tahrirlash ════════ */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="bg-slate-50 px-5 py-3 border-b shrink-0">
            <DialogTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <UserCog className="w-4 h-4 text-blue-600" />
              {editingId ? "Xodimni tahrirlash" : "Yangi xodim qo'shish"}
            </DialogTitle>
          </DialogHeader>
 
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="shrink-0 w-full justify-start rounded-none bg-slate-100 border-b px-2 overflow-x-auto">
              <TabsTrigger value="main"        className="text-xs">Asosiy ma'lumotlar</TabsTrigger>
              <TabsTrigger value="login"       className="text-xs">Login / Kirish</TabsTrigger>
              {isSuperAdmin && (
                <TabsTrigger value="permissions" className="text-xs">Ruxsatlar</TabsTrigger>
              )}
              <TabsTrigger value="extra"       className="text-xs">Qo'shimcha</TabsTrigger>
            </TabsList>
 
            {/* ── Tab 1: Asosiy ma'lumotlar ── */}
            <TabsContent value="main" className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Familiya *">
                  <Input value={formData.surname} onChange={e => setFormData(p => ({...p, surname: e.target.value}))} placeholder="Karimov" />
                </Field>
                <Field label="Ism *">
                  <Input value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="Jasur" />
                </Field>
                <Field label="Otasining ismi">
                  <Input value={formData.patronymic} onChange={e => setFormData(p => ({...p, patronymic: e.target.value}))} placeholder="Aliyevich" />
                </Field>
                <Field label="Tug'ilgan sana">
                  <Input type="date" value={formData.dob} onChange={e => setFormData(p => ({...p, dob: e.target.value}))} />
                </Field>
                <Field label="Jins">
                  <Select value={formData.gender} onValueChange={v => setFormData(p => ({...p, gender: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Erkak</SelectItem>
                      <SelectItem value="Female">Ayol</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Lavozim">
                  <Select value={formData.position} onValueChange={v => setFormData(p => ({...p, position: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Telefon">
                  <Input value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="+998 90 123 45 67" />
                </Field>
                <Field label="E-mail (shaxsiy)">
                  <Input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} placeholder="jasur@gmail.com" />
                </Field>
                <Field label="Manzil" className="col-span-2">
                  <Input value={formData.address} onChange={e => setFormData(p => ({...p, address: e.target.value}))} placeholder="Toshkent sh., Chilonzor t." />
                </Field>
              </div>
 
              {/* Tur */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex gap-6">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <Checkbox checked={formData.isEmployee} onCheckedChange={v => setFormData(p => ({...p, isEmployee: !!v}))} />
                  Xodim
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <Checkbox checked={formData.isSupplier} onCheckedChange={v => setFormData(p => ({...p, isSupplier: !!v}))} />
                  Ta'minotchi
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <Checkbox checked={formData.isGuest} onCheckedChange={v => setFormData(p => ({...p, isGuest: !!v}))} />
                  Mehmon
                </label>
              </div>
 
              {/* Holat */}
              <div className="mt-4 flex items-center gap-3">
                <Label className="text-xs font-medium text-slate-600">Holat:</Label>
                <Select value={formData.status} onValueChange={v => setFormData(p => ({...p, status: v as any}))}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Faol</SelectItem>
                    <SelectItem value="inactive">Nofaol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
 
            {/* ── Tab 2: Login / Kirish ── */}
            <TabsContent value="login" className="flex-1 overflow-y-auto p-5">
              <div className="max-w-md space-y-5">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 leading-relaxed">
                  <Lock className="w-4 h-4 inline mr-1 opacity-70" />
                  Login ochilgan xodimlar dasturga email va parol orqali kiradi. Login ochilmagan oddiy ishchilar faqat ma'lumotlar ro'yxatida ko'rinadi.
                </div>
 
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={formData.hasLogin}
                    onCheckedChange={v => setFormData(p => ({...p, hasLogin: !!v}))}
                  />
                  <span className="text-sm font-medium text-slate-700">Login ochish (dasturga kirish huquqi berish)</span>
                </label>
 
                {formData.hasLogin && (
                  <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                    <Field label="Login email *">
                      <Input
                        type="email"
                        value={formData.loginEmail}
                        onChange={e => setFormData(p => ({...p, loginEmail: e.target.value}))}
                        placeholder="xodim@zavod.uz"
                        disabled={!!editingId} // tahrirlashda email o'zgartirilmaydi
                      />
                      {editingId && (
                        <p className="text-[11px] text-slate-400 mt-1">Login email tahrirlashda o'zgartirilmaydi</p>
                      )}
                    </Field>
 
                    {!editingId && (
                      <Field label="Parol *">
                        <div className="relative">
                          <Input
                            type={showPass ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Kamida 6 ta belgi"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                          >
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </Field>
                    )}
 
                    <Field label="Rol (dasturda qanday rol berilsin)">
                      <Select value={formData.role} onValueChange={v => handleRoleChange(v as Role)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => (
                            <SelectItem key={r} value={r}>
                              <div className="flex items-center gap-2">
                                <RoleBadge role={r} small />
                                <span>{r}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Rol tanlaganda standart ruxsatlar avtomatik o'rnatiladi. "Ruxsatlar" tabida qo'shimcha sozlash mumkin.
                      </p>
                    </Field>
                  </div>
                )}
              </div>
            </TabsContent>
 
            {/* ── Tab 3: Ruxsatlar (faqat Super Admin) ── */}
            {isSuperAdmin && (
              <TabsContent value="permissions" className="flex-1 overflow-y-auto p-5">
                {!formData.hasLogin ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                    <Lock className="w-8 h-8 opacity-30" />
                    <p className="text-sm">Avval "Login ochish" ni yoqing</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-blue-600" />
                        Bo'lim ruxsatlari — {formData.role}
                      </p>
                      <button
                        onClick={() => {
                          const allOn = ALL_MODULES.every(m =>
                            MODULE_ACTIONS.every(a => formData.permissions[m.key]?.includes(a))
                          );
                          const newPerms: Permissions = {};
                          ALL_MODULES.forEach(m => {
                            newPerms[m.key] = allOn ? [] : [...MODULE_ACTIONS];
                          });
                          setFormData(p => ({...p, permissions: newPerms}));
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Hammasini belgilash / olib tashlash
                      </button>
                    </div>
 
                    {ALL_MODULES.map(module => {
                      const modulePerms = formData.permissions[module.key] ?? [];
                      const allChecked = MODULE_ACTIONS.every(a => modulePerms.includes(a));
                      const someChecked = MODULE_ACTIONS.some(a => modulePerms.includes(a));
                      const isExpanded = expandedModules[module.key];
 
                      return (
                        <div key={module.key} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors",
                              allChecked && "bg-blue-50/60"
                            )}
                            onClick={() => setExpandedModules(p => ({...p, [module.key]: !isExpanded}))}
                          >
                            <Checkbox
                              checked={allChecked}
                              onCheckedChange={v => toggleModule(module.key as ModuleKey, !!v)}
                              onClick={e => e.stopPropagation()}
                              className={someChecked && !allChecked ? "opacity-50" : ""}
                            />
                            <span className="flex-1 text-sm font-medium text-slate-700">{module.label}</span>
                            <div className="flex items-center gap-1 mr-2">
                              {MODULE_ACTIONS.map(a => (
                                <span
                                  key={a}
                                  className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded",
                                    modulePerms.includes(a)
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-slate-100 text-slate-300"
                                  )}
                                >
                                  {ACTION_LABELS[a]}
                                </span>
                              ))}
                            </div>
                            {isExpanded
                              ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                          </div>
 
                          {isExpanded && (
                            <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 flex gap-4">
                              {MODULE_ACTIONS.map(action => (
                                <label key={action} className="flex items-center gap-2 text-xs cursor-pointer">
                                  <Checkbox
                                    checked={modulePerms.includes(action)}
                                    onCheckedChange={() => toggleAction(module.key as ModuleKey, action)}
                                  />
                                  <span className="text-slate-600">{ACTION_LABELS[action]}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            )}
 
            {/* ── Tab 4: Qo'shimcha ── */}
            <TabsContent value="extra" className="flex-1 overflow-y-auto p-5">
              <div className="max-w-md space-y-4 text-sm text-slate-500">
                <p className="text-xs text-slate-400">
                  Passport, litsenziya, tibbiy kitob, sertifikat va boshqa hujjatlarni bu yerga qo'shishingiz mumkin.
                  Bu bo'lim keyingi versiyada to'liq ishga tushiriladi.
                </p>
                <div className="border border-dashed border-slate-200 rounded-xl h-32 flex items-center justify-center text-slate-300 text-xs">
                  Fayl yuklash (tez orada)
                </div>
              </div>
            </TabsContent>
          </Tabs>
 
          <DialogFooter className="bg-slate-50 px-5 py-3 border-t shrink-0 flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={closeModal}>Bekor qilish</Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCircle2 className="w-4 h-4" />}
              {editingId ? "Yangilash" : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* ════════ O'chirish tasdiqlash ════════ */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-rose-600">
              <Trash2 className="w-4 h-4" /> O'chirishni tasdiqlang
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Bu xodimni o'chirsangiz, barcha ma'lumotlari ham o'chadi. Firebase Auth logini saqlanadi — uni Auth panelidan qo'lda o'chiring.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Yo'q</Button>
            <Button
              size="sm"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Ha, o'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
 
// ─── Yordamchi komponentlar ────────────────────────────────────────────────────
 
function Field({
  label, children, className,
}: {
  label: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}
 
const ROLE_COLORS: Record<string, string> = {
  "Super Admin":      "bg-rose-100 text-rose-700",
  "Admin":            "bg-orange-100 text-orange-700",
  "Menejer":          "bg-blue-100 text-blue-700",
  "Sotuvchi":         "bg-emerald-100 text-emerald-700",
  "Ombor boshlig'i":  "bg-purple-100 text-purple-700",
  "Hisobchi":         "bg-amber-100 text-amber-700",
  "Ishchi":           "bg-slate-100 text-slate-500",
};
 
function RoleBadge({ role, small }: { role: string; small?: boolean }) {
  return (
    <span className={cn(
      "inline-block font-medium rounded-full",
      small ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5",
      ROLE_COLORS[role] ?? "bg-slate-100 text-slate-500"
    )}>
      {role}
    </span>
  );
}
