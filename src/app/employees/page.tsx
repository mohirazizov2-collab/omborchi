"use client";

import { useState, useMemo } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, Search, Loader2, UserPlus, 
  Briefcase, Trash2, Edit2, DollarSign,
  Phone, MapPin, Calendar
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

// Zavod yo'nalishidagi lavozimlar
const FACTORY_POSITIONS = [
  "Sex boshlig'i",
  "Katta texnolog",
  "Operator (Stanok)",
  "Sifat nazoratchisi (OTK)",
  "Ombor mudiri",
  "Mexanik",
  "Elektrik",
  "Qadoqlovchi",
  "Yordamchi ishchi",
  "Haydovchi"
];

export default function StaffManagementPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal va Form holatlari
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // IIKO uslubidagi kengaytirilgan forma
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    patronymic: "",
    position: "",
    salary: "",
    phone: "",
    address: "",
    birthDate: "",
    hireDate: new Date().toISOString().split('T')[0],
    isEmployee: true,
    isSupplier: false
  });

  // 1. Ma'lumotlarni yuklash
  const staffQuery = useMemoFirebase(() => db ? collection(db, "staff") : null, [db]);
  const { data: staffList, isLoading } = useCollection(staffQuery);

  // 2. Qidiruv logikasi
  const filteredStaff = useMemo(() => {
    return staffList?.filter(s => 
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.surname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.position?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [staffList, searchQuery]);

  // 3. Jami oylik hisobi
  const totalPayroll = useMemo(() => {
    return staffList?.reduce((sum, s) => sum + (Number(s.salary) || 0), 0) || 0;
  }, [staffList]);

  // 4. Qo'shish yoki Tahrirlash
  const handleSubmit = async () => {
    if (!db || !formData.name || !formData.surname || !formData.position) {
      toast({ title: "Ma'lumotlarni to'liq kiriting", variant: "destructive" });
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, "staff", editingId), formData);
        toast({ title: "Xodim ma'lumotlari yangilandi" });
      } else {
        await addDoc(collection(db, "staff"), formData);
        toast({ title: "Yangi xodim qo'shildi" });
      }
      closeModal();
    } catch (error) {
      toast({ title: "Xatolik yuz berdi", variant: "destructive" });
    }
  };

  // 5. O'chirish
  const handleDelete = async (id: string) => {
    if (!db || !confirm("Ushbu xodimni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await deleteDoc(doc(db, "staff", id));
      toast({ title: "Muvaffaqiyatli o'chirildi" });
    } catch (error) {
      toast({ title: "Xatolik", variant: "destructive" });
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
      name: "", surname: "", patronymic: "", position: "",
      salary: "", phone: "", address: "", birthDate: "",
      hireDate: new Date().toISOString().split('T')[0],
      isEmployee: true, isSupplier: false
    });
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="flex min-h-screen bg-[#f1f5f9]">
      <OmniSidebar />
      <main className="flex-1 p-6 lg:p-10">
        
        {/* HEADER & ANALYTICS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Users className="text-blue-600" /> XODIMLAR (IIKO STYLE)
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-widest">Ishlab chiqarish va zavod boshqaruvi</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="bg-emerald-50 p-2 rounded-xl">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Oylik fondi</p>
                <p className="text-lg font-black text-slate-800">{totalPayroll.toLocaleString()} so'm</p>
              </div>
            </div>

            <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 rounded-xl h-12 px-6 font-bold shadow-lg shadow-orange-100">
                  <UserPlus className="w-4 h-4 mr-2" /> XODIM QO'SHISH
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl rounded-xl p-0 overflow-hidden border-none">
                <DialogHeader className="bg-slate-100 p-4 border-b">
                  <DialogTitle className="text-sm font-bold text-slate-600 uppercase tracking-tight">
                    {editingId ? "Xodim kartochkasini tahrirlash" : "Yangi xodimni ro'yxatga olish"}
                  </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="main" className="w-full">
                  <TabsList className="w-full justify-start rounded-none bg-slate-50 border-b h-10 p-0">
                    <TabsTrigger value="main" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-white px-6 text-xs font-bold text-slate-500">ASOSIY MA'LUMOTLAR</TabsTrigger>
                    <TabsTrigger value="contact" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-white px-6 text-xs font-bold text-slate-500">ALOQA & MANZIL</TabsTrigger>
                  </TabsList>

                  <TabsContent value="main" className="p-6">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      {/* Chap ustun */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 items-center gap-2">
                          <label className="text-[11px] font-bold text-slate-500 text-right uppercase">Familiya</label>
                          <Input className="col-span-2 h-8 text-xs border-slate-200" value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-2">
                          <label className="text-[11px] font-bold text-slate-500 text-right uppercase">Ism</label>
                          <Input className="col-span-2 h-8 text-xs border-slate-200" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-2">
                          <label className="text-[11px] font-bold text-slate-500 text-right uppercase">Sharif</label>
                          <Input className="col-span-2 h-8 text-xs border-slate-200" value={formData.patronymic} onChange={e => setFormData({...formData, patronymic: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-2 pt-4">
                          <div className="flex items-center space-x-2 col-start-2 col-span-2">
                            <Checkbox id="emp" checked={formData.isEmployee} onCheckedChange={(v) => setFormData({...formData, isEmployee: !!v})} />
                            <label htmlFor="emp" className="text-[10px] font-bold text-slate-600 uppercase cursor-pointer">Xodim (Sotrudnik)</label>
                          </div>
                        </div>
                      </div>

                      {/* O'ng ustun */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 items-center gap-2">
                          <label className="text-[11px] font-bold text-slate-500 text-right uppercase">Lavozim</label>
                          <div className="col-span-2">
                            <Select onValueChange={(v) => setFormData({...formData, position: v})} value={formData.position}>
                              <SelectTrigger className="h-8 text-xs border-slate-200">
                                <SelectValue placeholder="Tanlang..." />
                              </SelectTrigger>
                              <SelectContent>
                                {FACTORY_POSITIONS.map(pos => (
                                  <SelectItem key={pos} value={pos} className="text-xs">{pos}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-2">
                          <label className="text-[11px] font-bold text-slate-500 text-right uppercase">Maosh</label>
                          <Input type="number" className="col-span-2 h-8 text-xs border-slate-200" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-2">
                          <label className="text-[11px] font-bold text-slate-500 text-right uppercase">Ishga sana</label>
                          <Input type="date" className="col-span-2 h-8 text-xs border-slate-200" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-2 pt-4">
                          <div className="flex items-center space-x-2 col-start-2 col-span-2">
                            <Checkbox id="sup" checked={formData.isSupplier} onCheckedChange={(v) => setFormData({...formData, isSupplier: !!v})} />
                            <label htmlFor="sup" className="text-[10px] font-bold text-slate-600 uppercase cursor-pointer">Postavshik</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="contact" className="p-6 space-y-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-[11px] font-bold text-slate-500 text-right uppercase">Telefon</label>
                      <Input className="col-span-3 h-8 text-xs border-slate-200" value={formData.phone} placeholder="+998" onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-[11px] font-bold text-slate-500 text-right uppercase">Manzil</label>
                      <Input className="col-span-3 h-8 text-xs border-slate-200" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-[11px] font-bold text-slate-500 text-right uppercase">Tug'ilgan kuni</label>
                      <Input type="date" className="col-span-3 h-8 text-xs border-slate-200" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter className="bg-slate-50 p-4 border-t gap-2">
                  <Button variant="outline" onClick={closeModal} className="h-9 text-xs font-bold uppercase rounded-lg">Bekor qilish</Button>
                  <Button onClick={handleSubmit} className="h-9 text-xs font-bold uppercase bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-8">Saqlash</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* SEARCH BAR */}
        <Card className="rounded-[1.5rem] border-none shadow-sm mb-6 overflow-hidden">
          <CardContent className="p-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input 
                placeholder="Xodim familiyasi yoki lavozimi bo'yicha qidirish..." 
                className="pl-12 h-11 bg-slate-50 border-none rounded-xl text-slate-700"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* STAFF TABLE */}
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-6 py-4">Xodim ma'lumotlari</th>
                  <th className="px-6 py-4">Lavozimi</th>
                  <th className="px-6 py-4">Aloqa</th>
                  <th className="px-6 py-4 text-center">Oylik maoshi</th>
                  <th className="px-6 py-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff?.map((worker) => (
                  <tr key={worker.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center font-black text-orange-600 text-xs uppercase">
                          {worker.surname?.charAt(0)}{worker.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-none">{worker.surname} {worker.name}</p>
                          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Sana: {worker.hireDate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-100 rounded-md">
                          <Briefcase className="w-3 h-3 text-slate-500" />
                        </div>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">{worker.position}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {worker.phone || "—"}</div>
                        <div className="flex items-center gap-1.5 text-slate-400"><MapPin className="w-3 h-3" /> {worker.address || "Manzil yo'q"}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-md font-black text-[11px]">
                        {Number(worker.salary).toLocaleString()} UZS
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(worker)} className="w-8 h-8 rounded-lg hover:bg-blue-50 hover:text-blue-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(worker.id)} className="w-8 h-8 rounded-lg hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredStaff?.length === 0 && (
            <div className="py-20 text-center opacity-30">
              <Users className="w-12 h-12 mx-auto mb-3" />
              <p className="font-bold text-xs uppercase tracking-widest">Ma'lumot topilmadi</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
