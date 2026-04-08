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
import { collection, deleteDoc, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

// Rollar va Bo'limlar
const ROLES = ["Admin", "Omborchi", "Menejer", "Sotuvchi"];
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
  const [loading, setLoading] = useState(false); // Tugma uchun yuklanish holati

  // Boshlang'ich forma holati
  const initialForm = {
    surname: "",
    name: "",
    patronymic: "",
    position: "",
    salary: "",
    phone: "",
    address: "",
    email: "", 
    password: "",
    role: "Sotuvchi",
    permissions: [] as string[],
    hireDate: new Date().toISOString().split('T')[0],
    isEmployee: true,
  };

  const [formData, setFormData] = useState(initialForm);

  // 1. Firebase ma'lumotlarni yuklash
  const staffQuery = useMemoFirebase(() => db ? collection(db, "staff") : null, [db]);
  const { data: staffList, isLoading } = useCollection(staffQuery);

  // 2. Qidiruv logikasi
  const filteredStaff = useMemo(() => {
    if (!staffList) return [];
    return staffList.filter(s => 
      (s.name + " " + s.surname).toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase())
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

  // 3. Saqlash funksiyasi (ASOSIY QISM)
  const handleSubmit = async () => {
    // Validatsiya
    if (!formData.email || !formData.name || !formData.surname) {
      toast({ title: "Xatolik", description: "Email, Ism va Familiyani to'ldirish shart!", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (!db) return;

      const cleanData = {
        ...formData,
        updatedAt: serverTimestamp(),
        salary: Number(formData.salary) || 0
      };

      if (editingId) {
        await updateDoc(doc(db, "staff", editingId), cleanData);
        toast({ title: "Muvaffaqiyatli", description: "Xodim ma'lumotlari yangilandi." });
      } else {
        await addDoc(collection(db, "staff"), { ...cleanData, createdAt: serverTimestamp() });
        toast({ title: "Muvaffaqiyatli", description: "Yangi xodim qo'shildi." });
      }
      closeModal();
    } catch (error: any) {
      console.error(error);
      toast({ title: "Xatolik yuz berdi", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 4. O'chirish funksiyasi
  const handleDelete = async (id: string) => {
    if (!confirm("Ushbu foydalanuvchini o'chirib tashlamoqchimisiz?")) return;
    
    try {
      if (!db) return;
      await deleteDoc(doc(db, "staff", id));
      toast({ title: "O'chirildi", description: "Foydalanuvchi tizimdan olib tashlandi." });
    } catch (error) {
      toast({ title: "Xatolik", description: "O'chirishda xato yuz berdi.", variant: "destructive" });
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
    setFormData(initialForm);
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
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 underline">Super Admin: f2472839@gmail.com</p>
          </div>

          <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 rounded-xl h-12 px-6 font-bold shadow-lg shadow-orange-100">
                <UserPlus className="w-4 h-4 mr-2" /> FOYDALANUVCHI QO'SHISH
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="bg-slate-100 p-4 border-b">
                <DialogTitle className="text-sm font-bold text-slate-600 uppercase tracking-tight flex items-center gap-2">
                  <Lock className="w-4 h-4" /> {editingId ? "Tahrirlash" : "Xavfsizlik kartochkasi"}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="w-full justify-start rounded-none bg-slate-50 border-b h-11 p-0">
                  <TabsTrigger value="personal" className="px-6 text-[10px] font-black uppercase">1. Shaxsiy</TabsTrigger>
                  <TabsTrigger value="auth" className="px-6 text-[10px] font-black uppercase">2. Kirish (Login)</TabsTrigger>
                  <TabsTrigger value="access" className="px-6 text-[10px] font-black uppercase">3. Huquqlar</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Familiya</label>
                        <Input value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} className="h-9" />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Ism</label>
                        <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-9" />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Lavozim</label>
                        <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="h-9" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Telefon</label>
                        <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-9" />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Maosh (UZS)</label>
                        <Input type="number" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} className="h-9" />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Checkbox id="isEmp" checked={formData.isEmployee} onCheckedChange={(v) => setFormData({...formData, isEmployee: !!v})} />
                        <label htmlFor="isEmp" className="text-[10px] font-bold text-slate-600 uppercase">Shtatda</label>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="auth" className="p-6 space-y-4">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="grid gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Email (Login)</label>
                        <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="h-10" placeholder="pochta@zavod.uz" />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Parol</label>
                        <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="h-10" />
                      </div>
                   </div>
                   <div className="grid gap-2 max-w-[200px]">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Tizimdagi Roli</label>
                      <Select onValueChange={(v) => setFormData({...formData, role: v})} value={formData.role}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                   </div>
                </TabsContent>

                <TabsContent value="access" className="p-6 grid grid-cols-2 gap-3">
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
                </TabsContent>
              </Tabs>

              <DialogFooter className="bg-slate-50 p-4 border-t gap-2">
                <Button variant="outline" onClick={closeModal} disabled={loading}>Bekor qilish</Button>
                <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? "Yangilash" : "Saqlash")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* SEARCH BAR */}
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

        {/* TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Foydalanuvchi</th>
                <th className="px-6 py-4">Roli</th>
                <th className="px-6 py-4">Login</th>
                <th className="px-6 py-4 text-center">Ruxsatlar</th>
                <th className="px-6 py-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStaff.map((worker) => (
                <tr key={worker.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-[10px]">
                        {worker.name?.charAt(0)}{worker.surname?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{worker.surname} {worker.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{worker.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[9px] font-bold ${worker.email === 'f2472839@gmail.com' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                      {worker.email === 'f2472839@gmail.com' ? 'SUPER' : worker.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{worker.email}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-[9px] font-black">
                      {worker.email === 'f2472839@gmail.com' ? "FULL" : `${worker.permissions?.length || 0} BO'LIM`}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(worker)} className="hover:text-blue-600"><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        disabled={worker.email === 'f2472839@gmail.com'}
                        onClick={() => handleDelete(worker.id)} 
                        className="hover:text-rose-600"
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
