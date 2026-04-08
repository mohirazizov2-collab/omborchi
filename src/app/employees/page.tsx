"use client";

import { useState, useMemo } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, UserPlus, Trash2, Edit2, ShieldCheck, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, deleteDoc, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function StaffManagementPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const initialForm = {
    surname: "", name: "", patronymic: "", dob: "",
    gender: "Male", position: "Menejer", phone: "", mobile: "",
    email: "", address: "", role: "Sotuvchi", 
    permissions: [] as string[], isEmployee: true, isSupplier: false, isGuest: false
  };

  const [formData, setFormData] = useState(initialForm);

  const staffQuery = useMemoFirebase(() => db ? collection(db, "staff") : null, [db]);
  const { data: staffList, isLoading, error } = useCollection(staffQuery);

  const filteredStaff = useMemo(() => {
    if (!staffList) return [];
    return staffList.filter(s => 
      `${s?.name} ${s?.surname}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [staffList, searchQuery]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialForm);
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.name) {
      toast({ title: "Xatolik", description: "Email va Ism majburiy!", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db!, "staff", editingId), { ...formData, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db!, "staff"), { ...formData, createdAt: serverTimestamp() });
      }
      toast({ title: "Muvaffaqiyatli saqlandi" });
      closeModal();
    } catch (e: any) {
      toast({ title: "Xatolik", description: "Ruxsat yo'q yoki baza xatosi", variant: "destructive" });
    } finally { setLoading(false); }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-[#f1f5f9]">
      <OmniSidebar />
      <main className="flex-1 p-6 lg:p-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-blue-600" /> XODIMLAR VA ROLLARI
          </h1>
          <Button onClick={() => setIsModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 rounded-xl h-12">
            <UserPlus className="w-4 h-4 mr-2" /> FOYDALANUVCHI QO'SHISH
          </Button>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            <DialogHeader className="bg-slate-50 p-4 border-b">
              <DialogTitle className="text-center font-bold text-slate-700">Персональная карточка</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="main" className="w-full">
              <TabsList className="w-full justify-start rounded-none bg-slate-100 border-b overflow-x-auto">
                <TabsTrigger value="main">Основные сведения</TabsTrigger>
                <TabsTrigger value="extra">Дополнительные</TabsTrigger>
                <TabsTrigger value="passport">Паспорт/Лицензия</TabsTrigger>
                <TabsTrigger value="photo">Фото</TabsTrigger>
                <TabsTrigger value="med">Медкнижки</TabsTrigger>
              </TabsList>

              <TabsContent value="main" className="p-6">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold">Фамилия:</span><Input value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} /></div>
                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold">Имя:</span><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold">Отчество:</span><Input value={formData.patronymic} onChange={e => setFormData({...formData, patronymic: e.target.value})} /></div>
                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold">Пол:</span>
                      <Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Male">Мужской</SelectItem><SelectItem value="Female">Женский</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold">Дата рожд:</span><Input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} /></div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold">Адрес:</span><Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold">Телефон:</span><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold">E-mail:</span><Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                    <div className="flex items-center gap-2"><span className="w-32 text-xs font-bold">Должность:</span>
                      <Select value={formData.position} onValueChange={v => setFormData({...formData, position: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Menejer">Менеджер</SelectItem><SelectItem value="Sotuvchi">Продавец</SelectItem><SelectItem value="Admin">Админ</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-6 border-t pt-4">
                   <label className="flex items-center gap-2 text-xs font-bold"><Checkbox checked={formData.isEmployee} onCheckedChange={v => setFormData({...formData, isEmployee: !!v})} /> Сотрудник</label>
                   <label className="flex items-center gap-2 text-xs font-bold"><Checkbox checked={formData.isSupplier} onCheckedChange={v => setFormData({...formData, isSupplier: !!v})} /> Поставщик</label>
                   <label className="flex items-center gap-2 text-xs font-bold"><Checkbox checked={formData.isGuest} onCheckedChange={v => setFormData({...formData, isGuest: !!v})} /> Гость</label>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="bg-slate-50 p-4 border-t gap-2">
              <Button variant="outline" onClick={closeModal}>Отмена</Button>
              <Button onClick={handleSubmit} disabled={loading} className="bg-slate-200 text-black border hover:bg-slate-300">Сохранить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ma'lumotlar jadvali */}
        <div className="bg-white rounded-2xl shadow-sm border mt-6 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr><th className="px-6 py-4">Foydalanuvchi</th><th className="px-6 py-4">Roli</th><th className="px-6 py-4 text-right">Amallar</th></tr>
            </thead>
            <tbody className="divide-y">
              {filteredStaff.map((worker) => (
                <tr key={worker.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold">{worker.surname} {worker.name}</td>
                  <td className="px-6 py-4"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{worker.position}</span></td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingId(worker.id); setFormData(worker); setIsModalOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStaff.length === 0 && <div className="p-10 text-center text-slate-400">Ma'lumot topilmadi</div>}
        </div>
      </main>
    </div>
  );
}
