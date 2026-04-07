"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  UserRound, Search, Plus, Loader2, Trash2, 
  Phone, Mail, MapPin, Hash, Calendar, 
  UserCheck, Truck, UserPlus, Save, X 
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function IikoStaffPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const router = useRouter();
  const { user, role, isUserLoading } = useUser();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = role === "Super Admin" || role === "Admin";

  // Iiko "Personalnaya kartochka" strukturasiga mos state
  const [formData, setFormData] = useState({
    lastName: "",       // Familiya
    firstName: "",      // Ism
    middleName: "",     // Otchestvo
    tabelId: "",        // Tabelniy nomer
    address: "",        // Adres
    phone: "",          // Telefon
    mobile: "",         // Mob. telefon
    email: "",          // E-mail
    position: "Menejer", // Doljnost
    birthDate: "",      // Data rojdeniya
    isEmployee: true,   // Sotrudnik
    isSupplier: false,  // Postavshik
    isGuest: false,     // Gost
    priceCategory: "Vse tsenovie kategorii"
  });

  // Ma'lumotlarni yuklash
  const employeesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "employees");
  }, [db, user]);

  const { data: employees, isLoading } = useCollection(employeesQuery);

  // Qidiruv mantiqi
  const filteredEmployees = useMemo(() => {
    return employees?.filter(e => 
      e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.tabelId.includes(searchQuery)
    ) || [];
  }, [employees, searchQuery]);

  // Saqlash funksiyasi
  const handleSave = async () => {
    if (!db || !user || !formData.lastName || !formData.firstName) {
      toast({ variant: "destructive", title: "Xatolik", description: "Ism va familiyani to'ldiring" });
      return;
    }
    
    setIsSaving(true);
    const id = doc(collection(db, "employees")).id;
    
    // Iiko formatidagi qisqa ism (Petrov K.S.)
    const systemName = `${formData.lastName} ${formData.firstName.charAt(0)}.${formData.middleName ? formData.middleName.charAt(0) + '.' : ''}`;
    
    const payload = {
      ...formData,
      id,
      fullName: `${formData.lastName} ${formData.firstName} ${formData.middleName}`.trim(),
      systemName,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "employees", id), payload);
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Muvaffaqiyatli", description: "Xodim kartochkasi saqlandi." });
    } catch (e) {
      toast({ variant: "destructive", title: "Xato", description: "Saqlashda xatolik yuz berdi." });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      lastName: "", firstName: "", middleName: "", tabelId: "",
      address: "", phone: "", mobile: "", email: "",
      position: "Menejer", birthDate: "",
      isEmployee: true, isSupplier: false, isGuest: false,
      priceCategory: "Vse tsenovie kategorii"
    });
  };

  const handleDelete = async (id: string) => {
    if (!db || !confirm("Ushbu kartochkani o'chirishni tasdiqlaysizmi?")) return;
    try {
      await deleteDoc(doc(db, "employees", id));
      toast({ title: "O'chirildi", description: "Xodim ma'lumotlari o'chirildi." });
    } catch (e) {
      toast({ variant: "destructive", title: "Xato", description: "O'chirishda xatolik." });
    }
  };

  if (isUserLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-[#f0f2f5] font-body">
      <OmniSidebar />
      <main className="flex-1 p-6">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Personal kartochkasi</h1>
            <p className="text-xs text-slate-500 font-medium">Sklad va ishlab chiqarish xodimlari reyestri</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#0078d4] hover:bg-[#005a9e] text-white rounded-none h-10 px-6 flex gap-2 items-center text-xs font-bold uppercase tracking-wider">
                <Plus className="w-4 h-4" /> Qo'shish
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[850px] p-0 border-none rounded-lg overflow-hidden bg-[#f3f3f3]">
              <DialogHeader className="bg-white p-4 border-b">
                <DialogTitle className="text-sm font-normal text-slate-600 flex items-center justify-center">
                   Personalnaya kartochka
                </DialogTitle>
              </DialogHeader>

              <div className="p-6 space-y-6">
                {/* Tabs Style (iiko design) */}
                <div className="flex border-b border-slate-300 gap-1 overflow-x-auto">
                   <div className="bg-white px-4 py-2 text-xs border border-b-0 border-slate-300 rounded-t-md">Osnovnie svedeniya</div>
                   <div className="px-4 py-2 text-xs opacity-50">Dopolnitelnie</div>
                   <div className="px-4 py-2 text-xs opacity-50">Pasport/Litsenziya</div>
                </div>

                <div className="grid grid-cols-2 gap-10">
                  {/* Chap ustun */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] text-right">Familiya:</Label>
                      <Input className="col-span-2 h-7 text-xs rounded-none border-slate-300" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] text-right">Ism:</Label>
                      <Input className="col-span-2 h-7 text-xs rounded-none border-slate-300" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] text-right">Otasining ismi:</Label>
                      <Input className="col-span-2 h-7 text-xs rounded-none border-slate-300" value={formData.middleName} onChange={e => setFormData({...formData, middleName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] text-right">Tabel № / Kod:</Label>
                      <Input className="col-span-2 h-7 text-xs rounded-none border-slate-300" value={formData.tabelId} onChange={e => setFormData({...formData, tabelId: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] text-right">Tug'ilgan sana:</Label>
                      <Input type="date" className="col-span-2 h-7 text-xs rounded-none border-slate-300" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                    </div>
                  </div>

                  {/* O'ng ustun */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] text-right">Adres:</Label>
                      <Input className="col-span-2 h-7 text-xs rounded-none border-slate-300" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] text-right">Telefon:</Label>
                      <Input className="col-span-2 h-7 text-xs rounded-none border-slate-300" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] text-right">Mob. telefon:</Label>
                      <Input className="col-span-2 h-7 text-xs rounded-none border-slate-300" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] text-right">E-mail:</Label>
                      <Input className="col-span-2 h-7 text-xs rounded-none border-slate-300" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] text-right">Lavozimi:</Label>
                      <select 
                        className="col-span-2 h-7 text-xs border border-slate-300 bg-white px-1 outline-none"
                        value={formData.position}
                        onChange={e => setFormData({...formData, position: e.target.value})}
                      >
                        <option>Menejer</option>
                        <option>Sklad mudiri</option>
                        <option>Buxgalter</option>
                        <option>Haydovchi</option>
                        <option>Ishchi</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Checkbox qatori (Iiko original mantiq) */}
                <div className="grid grid-cols-2 gap-10 pt-4 border-t border-slate-300">
                  <div className="space-y-2">
                     <div className="flex items-center space-x-2">
                        <Checkbox id="emp" checked={formData.isEmployee} onCheckedChange={(v) => setFormData({...formData, isEmployee: !!v})} />
                        <Label htmlFor="emp" className="text-[11px] font-medium">Sotrudnik (Xodim)</Label>
                     </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="sup" checked={formData.isSupplier} onCheckedChange={(v) => setFormData({...formData, isSupplier: !!v})} />
                        <Label htmlFor="sup" className="text-[11px] font-medium">Postavshik (Yetkazib beruvchi)</Label>
                     </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="gst" checked={formData.isGuest} onCheckedChange={(v) => setFormData({...formData, isGuest: !!v})} />
                        <Label htmlFor="gst" className="text-[11px] font-medium">Gost (Mehmon)</Label>
                     </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-[#e1e1e1] p-3 gap-2 border-t">
                <Button className="h-8 rounded-none px-6 bg-white text-black border border-slate-400 text-xs hover:bg-slate-100" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />} Saxranit
                </Button>
                <Button className="h-8 rounded-none px-6 bg-white text-black border border-slate-400 text-xs hover:bg-slate-100" onClick={() => setIsDialogOpen(false)}>
                   <X className="w-3 h-3 mr-2" /> Otmena
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {/* Qidiruv paneli */}
        <div className="bg-white p-3 mb-6 flex items-center gap-4 border border-slate-200 shadow-sm">
           <div className="relative flex-1 max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <Input 
               placeholder="Qidirish (ism yoki tabel raqami)..." 
               className="pl-10 h-9 text-xs rounded-none bg-slate-50 border-slate-200"
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
             />
           </div>
        </div>

        {/* Xodimlar ro'yxati (Tabel ko'rinishida yoki Kartochka) */}
        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {filteredEmployees.map((emp: any) => (
               <Card key={emp.id} className="rounded-none border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
                 <CardContent className="p-4">
                   <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 bg-slate-100 flex items-center justify-center text-slate-500">
                         <UserRound className="w-6 h-6" />
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:bg-rose-50" onClick={() => handleDelete(emp.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                   </div>
                   <h3 className="font-bold text-sm text-slate-800 truncate">{emp.systemName}</h3>
                   <p className="text-[10px] text-slate-500 mb-4">{emp.position}</p>
                   
                   <div className="space-y-1.5 border-t pt-3">
                      <div className="flex justify-between text-[10px]">
                         <span className="text-slate-400">Tabel №:</span>
                         <span className="font-bold">{emp.tabelId}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {emp.isEmployee && <Badge className="text-[8px] bg-emerald-50 text-emerald-600 border-emerald-100 rounded-none">XODIM</Badge>}
                        {emp.isSupplier && <Badge className="text-[8px] bg-blue-50 text-blue-600 border-blue-100 rounded-none">YETKAZIB BERUVCHI</Badge>}
                        {emp.isGuest && <Badge className="text-[8px] bg-slate-100 text-slate-600 border-none rounded-none">MEHMON</Badge>}
                      </div>
                   </div>
                 </CardContent>
               </Card>
             ))}
          </div>
        )}
      </main>
    </div>
  );
}
