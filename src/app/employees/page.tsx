"use client";

import { useState } from "react";
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
import { Loader2, CheckCircle2, UserRound, Phone, MapPin, Briefcase, CalendarDays } from "lucide-react";
import { useFirestore } from "@/firebase";
import { collection, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Tip ──────────────────────────────────────────────────────────

export interface WorkerFormData {
  // Shaxsiy
  surname:      string;
  name:         string;
  patronymic:   string;
  dob:          string;
  gender:       "Male" | "Female";
  // Ish
  position:     string;
  department:   string;
  hireDate:     string;
  salary:       string;
  schedule:     string;
  // Aloqa
  phone:        string;
  phone2:       string;
  address:      string;
  // Qo'shimcha
  note:         string;
  // Dastur holati
  isEmployee:   boolean;
  isSupplier:   boolean;
  isGuest:      boolean;
  status:       "active" | "inactive";
  // Login yo'q — faqat ma'lumot
  hasLogin:     false;
  role:         "Ishchi";
  permissions: {};
}

const POSITIONS = [
  "Ishchi", "Usta", "Smenachi", "Qorovul", "Haydovchi",
  "Tozalovchi", "Elektrik", "Slesarь", "Mexanik", "Boshqa",
];

const DEPARTMENTS = [
  "Ishlab chiqarish", "Ombor", "Transport", "Xavfsizlik",
  "Xizmat ko'rsatish", "Boshqa",
];

const SCHEDULES = ["5/2", "2/2", "3/3", "Smenali", "To'liq kun", "Qisman"];

const initialWorker: WorkerFormData = {
  surname: "", name: "", patronymic: "",
  dob: "", gender: "Male",
  position: "Ishchi", department: "Ishlab chiqarish",
  hireDate: new Date().toISOString().slice(0, 10),
  salary: "", schedule: "5/2",
  phone: "", phone2: "", address: "",
  note: "",
  isEmployee: true, isSupplier: false, isGuest: false,
  status: "active",
  hasLogin: false,
  role: "Ishchi",
  permissions: {},
};

// ─── Komponent ────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
  initialData?: Partial<WorkerFormData>;
}

export function StaffWorkerForm({ open, onClose, editingId, initialData }: Props) {
  const db = useFirestore();
  const { toast } = useToast();

  const [form, setForm] = useState<WorkerFormData>({
    ...initialWorker,
    ...initialData,
  });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("personal");

  const set = (key: keyof WorkerFormData, val: any) =>
    setForm(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!form.name || !form.surname) {
      toast({ title: "Xatolik", description: "Ism va Familiya majburiy!", variant: "destructive" });
      return;
    }
    if (!db) return;
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "staff", editingId), {
          ...form, updatedAt: serverTimestamp(),
        });
        toast({ title: "Yangilandi ✓" });
      } else {
        await addDoc(collection(db, "staff"), {
          ...form, createdAt: serverTimestamp(),
        });
        toast({ title: "Qo'shildi ✓" });
      }
      onClose();
    } catch {
      toast({ title: "Xatolik", description: "Saqlashda muammo", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[88vh] flex flex-col">

        {/* Header */}
        <DialogHeader className="bg-slate-50 px-5 py-3 border-b shrink-0">
          <DialogTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <UserRound className="w-4 h-4 text-orange-500" />
            {editingId ? "Ishchini tahrirlash" : "Yangi ishchi qo'shish"}
            <span className="ml-auto text-[11px] font-normal text-slate-400 bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full border border-orange-100">
              Login talab qilinmaydi
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="shrink-0 w-full justify-start rounded-none bg-slate-100 border-b px-2">
            <TabsTrigger value="personal" className="text-xs gap-1">
              <UserRound className="w-3 h-3" /> Shaxsiy
            </TabsTrigger>
            <TabsTrigger value="work" className="text-xs gap-1">
              <Briefcase className="w-3 h-3" /> Ish ma'lumotlari
            </TabsTrigger>
            <TabsTrigger value="contact" className="text-xs gap-1">
              <Phone className="w-3 h-3" /> Aloqa
            </TabsTrigger>
          </TabsList>

          {/* ── Shaxsiy ma'lumotlar ── */}
          <TabsContent value="personal" className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <WField label="Familiya *">
                <Input value={form.surname} onChange={e => set("surname", e.target.value)} placeholder="Karimov" />
              </WField>
              <WField label="Ism *">
                <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Jasur" />
              </WField>
              <WField label="Otasining ismi">
                <Input value={form.patronymic} onChange={e => set("patronymic", e.target.value)} placeholder="Aliyevich" />
              </WField>
              <WField label="Tug'ilgan sana">
                <Input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} />
              </WField>
              <WField label="Jins">
                <Select value={form.gender} onValueChange={v => set("gender", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Erkak</SelectItem>
                    <SelectItem value="Female">Ayol</SelectItem>
                  </SelectContent>
                </Select>
              </WField>
              <WField label="Holat">
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Faol</SelectItem>
                    <SelectItem value="inactive">Nofaol</SelectItem>
                  </SelectContent>
                </Select>
              </WField>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex gap-6">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <Checkbox checked={form.isEmployee} onCheckedChange={v => set("isEmployee", !!v)} />
                Xodim
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <Checkbox checked={form.isSupplier} onCheckedChange={v => set("isSupplier", !!v)} />
                Ta'minotchi
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <Checkbox checked={form.isGuest} onCheckedChange={v => set("isGuest", !!v)} />
                Mehmon
              </label>
            </div>
          </TabsContent>

          {/* ── Ish ma'lumotlari ── */}
          <TabsContent value="work" className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <WField label="Lavozim">
                <Select value={form.position} onValueChange={v => set("position", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </WField>
              <WField label="Bo'lim">
                <Select value={form.department} onValueChange={v => set("department", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </WField>
              <WField label="Ishga qabul sanasi">
                <Input type="date" value={form.hireDate} onChange={e => set("hireDate", e.target.value)} />
              </WField>
              <WField label="Maosh (so'm)">
                <Input
                  type="number"
                  value={form.salary}
                  onChange={e => set("salary", e.target.value)}
                  placeholder="2 500 000"
                />
              </WField>
              <WField label="Ish grafigi">
                <Select value={form.schedule} onValueChange={v => set("schedule", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCHEDULES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </WField>
            </div>
          </TabsContent>

          {/* ── Aloqa ── */}
          <TabsContent value="contact" className="flex-1 overflow-y-auto p-5">
            <div className="space-y-4 max-w-md">
              <WField label="Asosiy telefon">
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+998 90 123 45 67" />
              </WField>
              <WField label="Qo'shimcha telefon">
                <Input value={form.phone2} onChange={e => set("phone2", e.target.value)} placeholder="+998 91 ..." />
              </WField>
              <WField label="Yashash manzili">
                <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Toshkent sh., Chilonzor t., ..." />
              </WField>
              <WField label="Izoh">
                <textarea
                  value={form.note}
                  onChange={e => set("note", e.target.value)}
                  placeholder="Qo'shimcha ma'lumot..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </WField>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="bg-slate-50 px-5 py-3 border-t shrink-0 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            Bu xodimga dasturga kirish huquqi berilmaydi
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Bekor qilish</Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-1"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCircle2 className="w-4 h-4" />}
              Saqlash
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Yordamchi ────────────────────────────────────────────────────

function WField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}


// ==================================================================
// FAYL 2: page.tsx (StaffManagementPage)
// (Xodimlar ro'yxati va tizim foydalanuvchilarini boshqarish sahifasi)
// ==================================================================

"use client";

import { useState, useMemo } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
// import { StaffWorkerForm } from "./StaffWorkerForm"; // Odatda shunday import qilinadi

// Eslatma: Quyidagi importlar loyihangiz tuzilmasiga qarab farq qilishi mumkin.
// Berilgan kodda bu importlar mavjud edi, ularni saqlab qoldim.
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Checkbox } from "@/components/ui/checkbox";
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
// } from "@/components/ui/select";
// import {
//   Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
// } from "@/components/ui/dialog";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
// import { cn } from "@/lib/utils"; // Yuqorida import qilingan

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
  hasLogin: boolean;          // Login ochilganmi
  loginEmail: string;         // Login uchun email
  uid?: string;               // Firebase Auth UID
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

// Jadvalda rollarni ko'rsatish uchun yordamchi komponent (Fayl 2 ichida edi)
function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    "Super Admin": "bg-purple-100 text-purple-700 border-purple-200",
    "Admin": "bg-blue-100 text-blue-700 border-blue-200",
    "Menejer": "bg-indigo-100 text-indigo-700 border-indigo-200",
    "Sotuvchi": "bg-orange-100 text-orange-700 border-orange-200",
    "Ombor boshlig'i": "bg-amber-100 text-amber-700 border-amber-200",
    "Hisobchi": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Ishchi": "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-tight", styles[role])}>
      {role}
    </span>
  );
}

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
                    <td colSpan={isSuperAdmin ? 7 : 6} className="text-center py-12 text-slate-400 text-sm">
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

            {/* Jadval footeri (Berilgan kodda kesilgan edi, o'z holicha qoldi) */}
            <div className="border-t border-slate-100 px-4 py-2 bg-slate-50 flex items-center gap-4 text-xs text-slate-500">
               {/* Bu yerda odatda paginatsiya bo'ladi */}
               Jami: {filtered.length} ta yozuv ko'rsatilmoqda
            </div>
          </div>
        </div>
      </main>

      {/* ── FOYDALANUVCHI QO'SHISH/TAHRIRLASH MODALI (page.tsx ichidagi) ── */}
      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b bg-slate-50 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base shrink-0">
              <UserCog className="w-5 h-5 text-blue-600" />
              {editingId ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi qo'shish"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="shrink-0 justify-start rounded-none border-b bg-white px-6">
              <TabsTrigger value="main" className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent pb-3 pt-3 text-xs">
                Asosiy ma'lumotlar
              </TabsTrigger>
              <TabsTrigger value="permissions" className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent pb-3 pt-3 text-xs">
                Ruxsatlar tarmog'i
              </TabsTrigger>
            </TabsList>

            {/* Asosiy ma'lumotlar Tab */}
            <TabsContent value="main" className="flex-1 overflow-y-auto p-6 m-0">
              <div className="grid grid-cols-3 gap-x-5 gap-y-4">
                {/* Shaxsiy */}
                <div className="col-span-3 pb-1 border-b">
                  <h3 className="text-sm font-semibold text-slate-800">Shaxsiy ma'lumotlar</h3>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Familiya *</Label>
                  <Input size={1} value={formData.surname} onChange={e => setFormData(p=>({...p, surname: e.target.value}))} placeholder="Usmonov" className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Ism *</Label>
                  <Input value={formData.name} onChange={e => setFormData(p=>({...p, name: e.target.value}))} placeholder="Anvar" className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Otasining ismi</Label>
                  <Input value={formData.patronymic} onChange={e => setFormData(p=>({...p, patronymic: e.target.value}))} placeholder="Akmalovich" className="h-9 text-sm" />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Telefon</Label>
                  <Input value={formData.phone} onChange={e => setFormData(p=>({...p, phone: e.target.value}))} placeholder="+998 90 ..." className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Lavozim</Label>
                  <Input value={formData.position} onChange={e => setFormData(p=>({...p, position: e.target.value}))} placeholder="Katta sotuvchi" className="h-9 text-sm" />
                </div>
                 <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Holat</Label>
                  <Select value={formData.status} onValueChange={v => setFormData(p=>({...p, status: v as any}))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Faol</SelectItem>
                      <SelectItem value="inactive">Nofaol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tizimga kirish */}
                <div className="col-span-3 mt-4 pb-1 border-b flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-slate-800">Tizimga kirish (Login)</h3>
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="hasLogin" checked={formData.hasLogin} onCheckedChange={checked => setFormData(p=>({...p, hasLogin: !!checked}))} />
                    <Label htmlFor="hasLogin" className="text-xs font-medium text-blue-700 cursor-pointer">Login ruxsatini yoish</Label>
                  </div>
                </div>

                {formData.hasLogin && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Rol *</Label>
                      <Select value={formData.role} onValueChange={handleRoleChange}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.filter(r => r !== "Ishchi").map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Login (Email) *</Label>
                      <Input
                        type="email"
                        value={formData.loginEmail}
                        onChange={e => setFormData(p=>({...p, loginEmail: e.target.value}))}
                        placeholder="anvar@ombor.uz"
                        className="h-9 text-sm"
                        disabled={!!editingId} // Emailni tahrirlab bo'lmaydi (Firebase Auth cheklovi)
                      />
                    </div>
                    {!editingId && (
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Parol *</Label>
                        <div className="relative">
                          <Input
                            type={showPass ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="******"
                            className="h-9 text-sm pr-8"
                          />
                          <Button variant="ghost" size="icon" onClick={()=>setShowPass(!showPass)} className="absolute right-0 top-0 h-9 w-8 text-slate-400">
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                    {editingId && (
                       <div className="col-span-3 flex items-center gap-2 bg-blue-50 border border-blue-100 p-3 rounded-lg text-blue-700 mt-1">
                           <KeyRound className="w-5 h-5 shrink-0" />
                           <div className="text-xs">
                               <p className="font-semibold">Parolni yangilash</p>
                               <p className="opacity-90">Foydalanuvchi parolini faqat o'zi profil sozlamalaridan yoki "Parolni unutdingizmi?" orqali tiklashi mumkin.</p>
                           </div>
                       </div>
                    )}
                  </>
                )}
                
                 {/* Turlar */}
                <div className="col-span-3 mt-4 pb-1 border-b flex items-center gap-6">
                   <h3 className="text-sm font-semibold text-slate-800">Tizimdagi turi</h3>
                   <div className="flex items-center gap-4">
                    {[
                        { key: "isEmployee", label: "Xodim" },
                        { key: "isSupplier", label: "Ta'minotchi xodimi" },
                        { key: "isGuest",    label: "Mehmon" },
                    ].map(type => (
                        <label key={type.key} className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox checked={(formData as any)[type.key]} onCheckedChange={v => setFormData(p=>({...p, [type.key]: !!v}))} />
                            {type.label}
                        </label>
                    ))}
                   </div>
                </div>

              </div>
            </TabsContent>

            {/* Ruxsatlar Tab */}
            <TabsContent value="permissions" className="flex-1 overflow-y-auto p-0 m-0 bg-slate-50">
               {!formData.hasLogin ? (
                   <div className="flex flex-col h-full items-center justify-center gap-3 text-slate-400 border-t bg-white">
                       <Lock className="w-10 h-10 opacity-50" />
                       <p className="text-sm">Ruxsatlarni belgilash uchun avval "Login ruxsatini yoqish"ni belgilang.</p>
                   </div>
               ) : (
                  <div className="p-6 space-y-3">
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-3 text-amber-800 mb-4">
                        <LayoutGrid className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="text-xs">
                            <p className="font-semibold">Standart ruxsatlar yuklangan</p>
                            <p className="opacity-90">"{formData.role}" roli uchun standart ruxsatlar o'rnatildi. Quyida ularni g'ayrioddiy holatlar uchun o'zgartirishingiz mumkin.</p>
                        </div>
                    </div>

                    {ALL_MODULES.map((module) => {
                      const modulePermissions = formData.permissions[module.key] ?? [];
                      const allChecked = MODULE_ACTIONS.every(a => modulePermissions.includes(a));
                      const someChecked = MODULE_ACTIONS.some(a => modulePermissions.includes(a)) && !allChecked;
                      const isExpanded = expandedModules[module.key];

                      return (
                        <div key={module.key} className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                          {/* Modul Header */}
                          <div className={cn("px-4 py-2.5 flex items-center gap-3 border-b border-slate-100", isExpanded ? "bg-slate-50/50" : "")}>
                            <Checkbox
                              id={`mod-${module.key}`}
                              checked={allChecked ? true : someChecked ? "indeterminate" : false}
                              onCheckedChange={(checked) => toggleModule(module.key, !!checked)}
                            />
                            <Label
                              htmlFor={`mod-${module.key}`}
                              className="text-sm font-medium text-slate-800 flex-1 cursor-pointer"
                            >
                              {module.label}
                            </Label>
                            
                            <div className="text-[11px] text-slate-400 mr-2">
                                {modulePermissions.length} / {MODULE_ACTIONS.length} ruxsat
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExpandedModules(p => ({ ...p, [module.key]: !isExpanded }))}
                              className="w-8 h-8 text-slate-400"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>

                          {/* Amallar (Kengaytirilganda) */}
                          {isExpanded && (
                            <div className="px-4 py-3 grid grid-cols-4 gap-4 bg-white">
                              {MODULE_ACTIONS.map((action) => {
                                const id = `perm-${module.key}-${action}`;
                                return (
                                  <div key={action} className="flex items-center gap-2.5">
                                    <Checkbox
                                      id={id}
                                      checked={modulePermissions.includes(action)}
                                      onCheckedChange={() => toggleAction(module.key, action)}
                                    />
                                    <Label htmlFor={id} className="text-xs text-slate-600 cursor-pointer">
                                      {ACTION_LABELS[action]}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
               )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="px-6 py-3 border-t bg-slate-50 shrink-0">
            <Button variant="outline" size="sm" onClick={closeModal} disabled={loading}>
              Bekor qilish
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 min-w-[100px]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {editingId ? "Yangilash" : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* O'chirishni tasdiqlash dialogi (Kesilgan kodda yo'q edi, lekin mantiqan kerak) */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="max-w-md">
              <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-rose-600">
                      <Trash2 className="w-5 h-5" />
                      O'chirishni tasdiqlang
                  </DialogTitle>
              </DialogHeader>
              <div className="py-2 text-sm text-slate-600">
                  Haqiqatan ham ushbu xodimni tizimdan o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
              </div>
              <DialogFooter className="mt-4 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Bekor qilish</Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>O'chirish</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

    </div>
  );
}
