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
import { Loader2, CheckCircle2, UserRound, Phone, Briefcase } from "lucide-react";
import { useFirestore } from "@/firebase";
import { collection, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

// ─── Tip ──────────────────────────────────────────────────────────

export interface WorkerFormData {
  surname:    string;
  name:       string;
  patronymic: string;
  dob:        string;
  gender:     "Male" | "Female";
  position:   string;
  department: string;
  hireDate:   string;
  salary:     string;
  schedule:   string;
  phone:      string;
  phone2:     string;
  address:    string;
  note:       string;
  isEmployee: boolean;
  isSupplier: boolean;
  isGuest:    boolean;
  status:     "active" | "inactive";
  hasLogin:   false;
  role:       "Ishchi";
  permissions: Record<string, never>;
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

  const set = (key: keyof WorkerFormData, val: unknown) =>
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

        <DialogHeader className="bg-slate-50 px-5 py-3 border-b shrink-0">
          <DialogTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <UserRound className="w-4 h-4 text-orange-500" />
            {editingId ? "Ishchini tahrirlash" : "Yangi ishchi qo'shish"}
            <span className="ml-auto text-[11px] font-normal bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full border border-orange-100">
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
              <Briefcase className="w-3 h-3" /> Ish ma&apos;lumotlari
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
                Ta&apos;minotchi
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
