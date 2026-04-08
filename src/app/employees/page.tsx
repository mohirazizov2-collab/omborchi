"use client";

import { useState, useMemo } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, Search, Loader2, UserPlus, 
  Briefcase, Trash2, Edit2, DollarSign,
  Key, ShieldCheck, Lock, Phone, MapPin
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, deleteDoc, doc, addDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

// Zavod Rollari
const ROLES = ["Admin", "Omborchi", "Menejer", "Sotuvchi"];

// Tizimdagi bo'limlar (Ruxsatnomalar)
const PERMISSIONS = [
  { id: "p_sales", label: "Sotuv bo'limi" },
  { id: "p_stock", label: "Ombor bo'limi" },
  { id: "p_staff", label: "Xodimlar boshqaruvi" },
  { id: "p_reports", label: "Hisobotlar (Analitika)" },
  { id: "p_finance", label: "Moliya / Kassa" },
  { id: "p_production", label: "Ishlab chiqarish (Sex)" },
];

export default function StaffManagementPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // IIKO + Auth + Permissions Forma holati
  const [formData, setFormData] = useState({
    surname: "",
    name: "",
    patronymic: "",
    position: "",
    salary: "",
    phone: "",
    address: "",
    // Auth qismi
    email: "", 
    password: "",
    role: "Sotuvchi",
    // Bo'limlarga ruxsatlar
    permissions: [] as string[],
    hireDate: new Date().toISOString().split('T')[0],
    isEmployee: true,
  });

  // 1. Firebase ma'lumotlarni yuklash
  const staffQuery = useMemoFirebase(() => db ? collection(db, "staff") : null, [db]);
  const { data: staffList, isLoading } = useCollection(staffQuery);

  // 2. Qidiruv
  const filteredStaff = useMemo(() => {
    return staffList?.filter(s => 
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.surname?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [staffList, searchQuery]);

  // Permissionlarni boshqarish
  const togglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(id => id !== permId)
        : [...prev.permissions, permId]
    }));
  };

  // 3. Saqlash funksiyasi
  const handleSubmit = async () => {
    if (!db || !formData.email || !formData.name) {
      toast({ title: "Login va Ismni to'ldirish shart!", variant: "destructive" });
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, "staff", editingId), formData);
        toast({ title: "Xodim va tizim huquqlari yangilandi" });
      } else {
        await addDoc(collection(db, "staff"), formData);
        toast({ title: "Yangi foydalanuvchi muvaffaqiyatli qo'shildi" });
      }
      closeModal();
    } catch (error) {
      toast({ title: "Xatolik yuz berdi", variant: "destructive" });
    }
  };

  const openEditModal = (worker: any) => {
    setEditingId(worker.id);
    setFormData({ ...worker });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      surname: "", name: "", patronymic: "", position: "",
      salary: "", phone: "", address: "", email: "", password: "",
      role: "Sotuvchi", permissions: [],
      hireDate: new Date().toISOString().split('T')[0],
      isEmployee: true,
    });
  };

  const handleDelete = async (id: string) => {
    if (!db || !confirm("Ushbu foydalanuvchini o'chirmoqchimisiz?")) return;
    await deleteDoc(doc(db, "staff", id));
    toast({ title: "Foydalanuvchi o'chirildi" });
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="flex min-h-screen bg-[#f1f5f9]">
      <OmniSidebar />
      <main className="flex-1 p-6 lg:p-10">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <ShieldCheck className="text-blue-600" /> XODIMLAR VA ROLLARI
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Super Admin: f2472839@gmail.com</p>
          </div>

          <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 rounded-xl h-12 px-6 font-bold shadow-lg shadow-orange-100">
                <UserPlus className="w-4 h-4 mr-2" /> FOYDALANUVCHI QO'SHISH
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="bg-slate-100 p-4 border-b">
                <DialogTitle className="text-sm font-bold text-slate-600 uppercase tracking-tight flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Foydalanuvchi xavfsizlik kartochkasi
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="w-full justify-start rounded-none bg-slate-50 border-b h-11 p-0">
                  <TabsTrigger value="personal" className="px-6 text-[10px] font-black uppercase data-[state=active]:bg-white">1. Shaxsiy ma'lumotlar</TabsTrigger>
                  <TabsTrigger value="auth" className="px-6 text-[10px] font-black uppercase data-[state=active]:bg-white">2. Login & Roli</TabsTrigger>
                  <TabsTrigger value="access" className="px-6 text-[10px] font-black uppercase data-[state=active]:bg-white">3. Kirish huquqlari</TabsTrigger>
                </TabsList>

                {/* TAB 1: SHAXSIY */}
                <TabsContent value="personal" className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-400 text-right uppercase">Familiya</label>
                        <Input className="col-span-2 h-9 text-xs" value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-400 text-right uppercase">Ism</label>
                        <Input className="col-span-2 h-9 text-xs" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-400 text-right uppercase">Lavozimi</label>
                        <Input className="col-span-2 h-9 text-xs" placeholder="Zavod lavozimi" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-400 text-right uppercase">Telefon</label>
                        <Input className="col-span-2 h-9 text-xs" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-400 text-right uppercase">Maoshi</label>
                        <Input type="number" className="col-span-2 h-9 text-xs" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-2 text-right">
                         <div className="col-start-2 col-span-2 flex items-center gap-2 mt-2">
                           <Checkbox id="emp" checked={formData.isEmployee} onCheckedChange={(v) => setFormData({...formData, isEmployee: !!v})} />
                           <label htmlFor="emp" className="text-[10px] font-bold text-slate-600 uppercase cursor-pointer">Shtatdagi xodim</label>
                         </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: AUTH */}
                <TabsContent value="auth" className="p-6 space-y-4">
                   <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex gap-3 items-center mb-4">
                     <Key className="w-5 h-5 text-amber-500" />
                     <p className="text-[11px] font-medium text-amber-700">Ushbu email va parol tizimga kirish uchun xizmat qiladi.</p>
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Login (Email)</label>
                        <Input className="h-10 text-xs" placeholder="example@mail.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Parol</label>
                        <Input type="password" title="Xavfsiz parol kiriting" className="h-10 text-xs" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                      </div>
                   </div>
                   <div className="space-y-2 max-w-sm">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tizimdagi asosiy roli</label>
                      <Select onValueChange={(v) => setFormData({...formData, role: v})} value={formData.role}>
                        <SelectTrigger className="h-10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                   </div>
                </TabsContent>

                {/* TAB 3: PERMISSIONS */}
                <TabsContent value="access" className="p-6">
                  <div className="mb-4">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-tight">Bo'limlarga ruxsat berish</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Xodim tizimga kirganda qaysi tugmalar ochiq bo'lishini tanlang:</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {PERMISSIONS.map((perm) => (
                      <div key={perm.id} className="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                        <Checkbox 
                          id={perm.id} 
                          checked={formData.permissions.includes(perm.id)} 
                          onCheckedChange={() => togglePermission(perm.id)}
                        />
                        <label htmlFor={perm.id} className="text-[11px] font-bold text-slate-600 cursor-pointer">{perm.label}</label>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="bg-slate-50 p-4 border-t gap-2">
                <Button variant="outline" onClick={closeModal} className="h-10 text-xs font-bold uppercase rounded-xl">Bekor qilish</Button>
                <Button onClick={handleSubmit} className="h-10 text-xs font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-10">
                  {editingId ? "Yangilash" : "Saqlash va yaratish"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* SEARCH & TABLE */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              placeholder="Xodimlarni qidirish..." 
              className="pl-11 h-11 bg-white border-none shadow-sm rounded-xl text-xs"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Foydalanuvchi</th>
                <th className="px-6 py-4">Tizimdagi roli</th>
                <th className="px-6 py-4">Login (Email)</th>
                <th className="px-6 py-4 text-center">Ruxsatlar</th>
                <th className="px-6 py-4 text-right">Boshqaruv</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStaff?.map((worker) => (
                <tr key={worker.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center font-black text-blue-600 text-[10px]">
                        {worker.surname?.charAt(0)}{worker.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{worker.surname} {worker.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{worker.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${
                      worker.email === 'f2472839@gmail.com' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {worker.email === 'f2472839@gmail.com' ? 'SUPER ADMIN' : worker.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-500">{worker.email}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-1">
                      {worker.email === 'f2472839@gmail.com' ? (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-black">ALL ACCESS</span>
                      ) : (
                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[9px] font-black">
                          {worker.permissions?.length || 0} TA BO'LIM
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(worker)} className="w-8 h-8 rounded-lg hover:text-blue-600"><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        disabled={worker.email === 'f2472839@gmail.com'}
                        onClick={() => handleDelete(worker.id)} 
                        className="w-8 h-8 rounded-lg hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
