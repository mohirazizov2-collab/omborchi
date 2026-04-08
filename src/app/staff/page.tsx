"use client";
import { useState, useMemo } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, UserPlus, Edit2, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

export default function StaffPage() {
  const db = useFirestore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialForm = {
    surname: "", name: "", patronymic: "", gender: "Male", 
    dob: "", position: "", email: "", phone: "", address: "",
    isEmployee: true, isSupplier: false, isGuest: false, permissions: []
  };
  const [formData, setFormData] = useState(initialForm);

  const staffQuery = useMemoFirebase(() => db ? collection(db, "staff") : null, [db]);
  const { data: staffList, isLoading } = useCollection(staffQuery);

  const handleSubmit = async () => {
    if (!db || !formData.email) return;
    if (editingId) await updateDoc(doc(db, "staff", editingId), { ...formData, updatedAt: serverTimestamp() });
    else await addDoc(collection(db, "staff"), { ...formData, createdAt: serverTimestamp() });
    setIsModalOpen(false);
    setFormData(initialForm);
  };

  return (
    <div className="flex min-h-screen bg-[#f1f5f9]">
      <OmniSidebar />
      <main className="flex-1 p-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-black flex items-center gap-2"><ShieldCheck className="text-blue-600"/> XODIMLAR</h1>
          <Button onClick={() => { setEditingId(null); setFormData(initialForm); setIsModalOpen(true); }} className="bg-orange-500"><UserPlus className="mr-2 w-4 h-4" /> FOYDALANUVCHI QO'SHISH</Button>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle className="text-center border-b pb-2">Персональная карточка</DialogTitle></DialogHeader>
            <Tabs defaultValue="main">
              <TabsList className="grid grid-cols-5 text-[10px]">
                <TabsTrigger value="main">Основные сведения</TabsTrigger>
                <TabsTrigger value="extra">Дополнительные</TabsTrigger>
                <TabsTrigger value="passport">Паспорт/Лицензия</TabsTrigger>
                <TabsTrigger value="photo">Фото</TabsTrigger>
                <TabsTrigger value="med">Медкнижки</TabsTrigger>
              </TabsList>
              
              <TabsContent value="main" className="grid grid-cols-2 gap-6 p-4">
                <div className="space-y-3">
                  <Input placeholder="Фамилия" value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} />
                  <Input placeholder="Имя" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <Input placeholder="Отчество" value={formData.patronymic} onChange={e => setFormData({...formData, patronymic: e.target.value})} />
                  <Input type="date" placeholder="Дата рождения" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <Input placeholder="Адрес" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  <Input placeholder="Телефон" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  <Input placeholder="E-mail" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  <Input placeholder="Должность" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
                </div>
                <div className="col-span-2 flex gap-4 border-t pt-4">
                   <label className="flex items-center gap-2"><Checkbox checked={formData.isEmployee} onCheckedChange={v => setFormData({...formData, isEmployee: !!v})} /> Сотрудник</label>
                   <label className="flex items-center gap-2"><Checkbox checked={formData.isSupplier} onCheckedChange={v => setFormData({...formData, isSupplier: !!v})} /> Поставщик</label>
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Отмена</Button>
              <Button onClick={handleSubmit} className="bg-slate-200 text-black hover:bg-slate-300">Сохранить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase">
              <tr><th className="p-4">Foydalanuvchi</th><th className="p-4">Roli</th><th className="p-4">Login</th><th className="p-4 text-right">Amallar</th></tr>
            </thead>
            <tbody>
              {staffList?.length ? staffList.map(w => (
                <tr key={w.id} className="border-t">
                  <td className="p-4 font-bold">{w.surname} {w.name}</td>
                  <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-[10px]">{w.position}</span></td>
                  <td className="p-4">{w.email}</td>
                  <td className="p-4 text-right"><Button variant="ghost" size="icon" onClick={() => { setEditingId(w.id); setFormData(w); setIsModalOpen(true); }}><Edit2 className="w-4 h-4"/></Button></td>
                </tr>
              )) : <tr><td colSpan={4} className="p-10 text-center text-slate-400">Ma'lumot topilmadi</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
