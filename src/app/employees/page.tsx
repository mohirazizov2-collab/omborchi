"use client";

import { useState, useMemo } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, Search, Loader2, UserPlus, 
  Briefcase, Trash2, Edit2, DollarSign 
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, deleteDoc, doc, addDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function StaffManagementPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal va Form holatlari
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", position: "", salary: "", hireDate: "" });

  // 1. Ma'lumotlarni yuklash
  const staffQuery = useMemoFirebase(() => db ? collection(db, "staff") : null, [db]);
  const { data: staffList, isLoading } = useCollection(staffQuery);

  // 2. Qidiruv logikasi
  const filteredStaff = useMemo(() => {
    return staffList?.filter(s => 
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.position?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [staffList, searchQuery]);

  // 3. Jami oylik hisobi
  const totalPayroll = useMemo(() => {
    return staffList?.reduce((sum, s) => sum + (Number(s.salary) || 0), 0) || 0;
  }, [staffList]);

  // 4. Qo'shish yoki Tahrirlash funksiyasi
  const handleSubmit = async () => {
    if (!db || !formData.name || !formData.salary) return;

    try {
      if (editingId) {
        // Tahrirlash
        await updateDoc(doc(db, "staff", editingId), formData);
        toast({ title: "Muvaffaqiyatli yangilandi" });
      } else {
        // Yangi qo'shish
        await addDoc(collection(db, "staff"), formData);
        toast({ title: "Yangi ishchi qo'shildi" });
      }
      closeModal();
    } catch (error) {
      toast({ title: "Xatolik yuz berdi", variant: "destructive" });
    }
  };

  // 5. O'chirish funksiyasi
  const handleDelete = async (id: string) => {
    if (!db || !confirm("Ishchini o'chirasizmi?")) return;
    try {
      await deleteDoc(doc(db, "staff", id));
      toast({ title: "Ishchi o'chirildi" });
    } catch (error) {
      toast({ title: "O'chirishda xatolik", variant: "destructive" });
    }
  };

  const openEditModal = (worker: any) => {
    setEditingId(worker.id);
    setFormData({ 
      name: worker.name, 
      position: worker.position, 
      salary: worker.salary, 
      hireDate: worker.hireDate || "" 
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: "", position: "", salary: "", hireDate: "" });
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <OmniSidebar />
      <main className="flex-1 p-6 lg:p-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Users className="text-blue-600" /> ISHCHILAR RO'YXATI
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-widest">Xodimlar boshqaruvi va moliya</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="bg-emerald-50 p-2 rounded-xl">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Jami oylik fondi</p>
                <p className="text-lg font-black text-slate-800">{totalPayroll.toLocaleString()} so'm</p>
              </div>
            </div>

            <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 rounded-2xl h-12 px-6 font-bold shadow-lg">
                  <UserPlus className="w-4 h-4 mr-2" /> ISHCHI QO'SHISH
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Tahrirlash" : "Yangi ishchi qo'shish"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Input placeholder="F.I.SH" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <Input placeholder="Lavozimi" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
                  <Input type="number" placeholder="Oylik maoshi" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
                  <Input type="date" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} />
                </div>
                <DialogFooter>
                  <Button onClick={handleSubmit} className="w-full bg-blue-600 rounded-xl">{editingId ? "Saqlash" : "Qo'shish"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* SEARCH BAR */}
        <Card className="rounded-[2rem] border-none shadow-sm mb-6 overflow-hidden">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input 
                placeholder="Ishchi ismi yoki lavozimi bo'yicha qidirish..." 
                className="pl-12 h-12 bg-slate-50 border-none rounded-2xl text-slate-700"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* STAFF TABLE */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-widest">
                  <th className="px-8 py-5">F.I.SH</th>
                  <th className="px-8 py-5">Lavozimi</th>
                  <th className="px-8 py-5 text-center">Oylik maoshi</th>
                  <th className="px-8 py-5 text-center">Sana</th>
                  <th className="px-8 py-5 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStaff?.map((worker) => (
                  <tr key={worker.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 uppercase">
                          {worker.name?.charAt(0)}
                        </div>
                        <p className="font-bold text-slate-800">{worker.name}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">{worker.position}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-black text-xs">
                        {Number(worker.salary).toLocaleString()} so'm
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center text-xs text-slate-400 font-medium">
                      {worker.hireDate || "—"}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(worker)} className="w-9 h-9 rounded-xl text-slate-400 hover:text-blue-600">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(worker.id)} className="w-9 h-9 rounded-xl text-slate-400 hover:text-rose-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredStaff?.length === 0 && (
            <div className="py-20 text-center opacity-20">
              <Users className="w-16 h-16 mx-auto mb-4" />
              <p className="font-black text-xs uppercase">Ishchilar topilmadi</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
