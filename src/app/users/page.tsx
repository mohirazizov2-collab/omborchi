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
  ShieldCheck, Save, X 
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
  const { user, isUserLoading } = useUser();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Super Admin tekshiruvi
  const isSuperAdmin = user?.email === "f2472839@gmail.com";

  // Form State
  const [formData, setFormData] = useState({
    lastName: "", firstName: "", middleName: "", tabelId: "",
    address: "", phone: "", mobile: "", email: "",
    position: "Menejer", birthDate: "",
    isEmployee: true, isSupplier: false, isGuest: false,
  });

  // Ruxsatnomalar state (Faqat Super Admin boshqaradi)
  const [permissions, setPermissions] = useState({
    canAccessStaff: true,
    canAccessInventory: false,
    canAccessAnalytics: false,
    canAccessInvoices: false,
    role: "User"
  });

  // Xavfsizlik: Agar foydalanuvchi Super Admin bo'lmasa va ruxsati bo'lmasa - dashboardga haydash
  useEffect(() => {
    if (!isUserLoading && user) {
      if (!isSuperAdmin && !user.permissions?.canAccessStaff) {
        toast({ variant: "destructive", title: "Ruxsat yo'q", description: "Sizda bu bo'limga kirish huquqi mavjud emas." });
        router.push("/dashboard");
      }
    }
  }, [user, isUserLoading, isSuperAdmin]);

  const employeesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "employees");
  }, [db, user]);

  const { data: employees, isLoading } = useCollection(employeesQuery);

  const filteredEmployees = useMemo(() => {
    return employees?.filter(e => 
      e.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.tabelId?.includes(searchQuery)
    ) || [];
  }, [employees, searchQuery]);

  const handleSave = async () => {
    if (!db || !user || !formData.lastName || !formData.firstName) {
      toast({ variant: "destructive", title: "Xato", description: "Ism va familiyani to'ldiring" });
      return;
    }
    
    setIsSaving(true);
    const id = doc(collection(db, "employees")).id;
    const systemName = `${formData.lastName} ${formData.firstName.charAt(0)}.${formData.middleName ? formData.middleName.charAt(0) + '.' : ''}`;
    
    const payload = {
      ...formData,
      id,
      fullName: `${formData.lastName} ${formData.firstName} ${formData.middleName}`.trim(),
      systemName,
      permissions: isSuperAdmin ? permissions : { canAccessStaff: true }, // Super Admin bo'lsa tanlanganlarni, bo'lmasa default ruxsatni saqlaydi
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "employees", id), payload);
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Muvaffaqiyatli", description: "Xodim va uning ruxsatnomalari saqlandi." });
    } catch (e) {
      toast({ variant: "destructive", title: "Xato", description: "Saqlashda xatolik." });
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
    });
    setPermissions({ canAccessStaff: true, canAccessInventory: false, canAccessAnalytics: false, canAccessInvoices: false, role: "User" });
  };

  if (isUserLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-[#f0f2f5] font-body">
      <OmniSidebar />
      <main className="flex-1 p-6">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Personal kartochkasi</h1>
            <p className="text-xs text-slate-500 font-medium">Xodimlar va tizim ruxsatnomalari</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#0078d4] hover:bg-[#005a9e] rounded-none h-10 px-6 flex gap-2 items-center text-xs font-bold uppercase">
                <Plus className="w-4 h-4" /> Yangi foydalanuvchi
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[850px] p-0 border-none rounded-lg overflow-hidden bg-[#f3f3f3]">
              <DialogHeader className="bg-white p-4 border-b">
                <DialogTitle className="text-sm font-normal text-slate-600 text-center">
                   Personalnaya kartochka / Ruxsatnomalar
                </DialogTitle>
              </DialogHeader>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-10">
                  {/* Asosiy Ma'lumotlar */}
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
                      <Label className="text-[11px] text-right">Email (Login):</Label>
                      <Input className="col-span-2 h-7 text-xs rounded-none border-slate-300" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] text-right">Lavozimi:</Label>
                      <select className="col-span-2 h-7 text-xs border border-slate-300 bg-white px-1 outline-none" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>
                        <option>Menejer</option>
                        <option>Sklad mudiri</option>
                        <option>Buxgalter</option>
                      </select>
                    </div>
                  </div>

                  {/* Ruxsatnomalar (Faqat Super Admin ko'radi) */}
                  <div className={`space-y-4 p-4 border rounded-md ${isSuperAdmin ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 opacity-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-bold text-blue-800 uppercase">Tizimga ruxsatlar</h4>
                    </div>
                    
                    {!isSuperAdmin ? (
                       <p className="text-[10px] text-slate-500 italic">Ruxsatlarni faqat Super Admin boshqara oladi.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="p_staff" checked={permissions.canAccessStaff} onCheckedChange={(v) => setPermissions({...permissions, canAccessStaff: !!v})} />
                          <Label htmlFor="p_staff" className="text-[11px]">Xodimlar bo'limi (Staff)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="p_inv" checked={permissions.canAccessInventory} onCheckedChange={(v) => setPermissions({...permissions, canAccessInventory: !!v})} />
                          <Label htmlFor="p_inv" className="text-[11px]">Sklad / Inventarizatsiya</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="p_ana" checked={permissions.canAccessAnalytics} onCheckedChange={(v) => setPermissions({...permissions, canAccessAnalytics: !!v})} />
                          <Label htmlFor="p_ana" className="text-[11px]">Analitika va Hisobotlar</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="p_invc" checked={permissions.canAccessInvoices} onCheckedChange={(v) => setPermissions({...permissions, canAccessInvoices: !!v})} />
                          <Label htmlFor="p_invc" className="text-[11px]">Invoyslar (Sotuv/Xarid)</Label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-[#e1e1e1] p-3 gap-2 border-t">
                <Button className="h-8 rounded-none px-6 bg-[#0078d4] text-white text-xs hover:bg-[#005a9e]" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />} Saxranit
                </Button>
                <Button className="h-8 rounded-none px-6 bg-white text-black border border-slate-400 text-xs" onClick={() => setIsDialogOpen(false)}>
                   Otmena
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {/* Qidiruv */}
        <div className="bg-white p-3 mb-6 border border-slate-200 shadow-sm flex items-center gap-4">
           <div className="relative flex-1 max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <Input placeholder="Ism yoki tabel bo'yicha qidiruv..." className="pl-10 h-9 text-xs rounded-none border-slate-200" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
           </div>
        </div>

        {/* Xodimlar ro'yxati */}
        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {filteredEmployees.map((emp: any) => (
               <Card key={emp.id} className="rounded-none border-slate-200 shadow-sm bg-white">
                 <CardContent className="p-4">
                   <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 bg-slate-100 flex items-center justify-center text-slate-500">
                         <UserRound className="w-6 h-6" />
                      </div>
                      {isSuperAdmin && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500" onClick={() => handleDelete(emp.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                   </div>
                   <h3 className="font-bold text-sm text-slate-800 truncate">{emp.systemName}</h3>
                   <p className="text-[10px] text-slate-500 mb-2">{emp.email}</p>
                   
                   <div className="space-y-1.5 border-t pt-3 mt-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Ruxsatlar:</p>
                      <div className="flex flex-wrap gap-1">
                        {emp.permissions?.canAccessInventory && <Badge className="text-[7px] bg-blue-50 text-blue-600">Sklad</Badge>}
                        {emp.permissions?.canAccessAnalytics && <Badge className="text-[7px] bg-purple-50 text-purple-600">Analitika</Badge>}
                        {emp.permissions?.canAccessStaff && <Badge className="text-[7px] bg-green-50 text-green-600">Staff</Badge>}
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
