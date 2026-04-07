"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  ShieldCheck, Save, X, ChevronRight 
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function IikoStaffPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isSuperAdmin = user?.email === "f2472839@gmail.com";

  const [formData, setFormData] = useState({
    lastName: "", firstName: "", middleName: "", tabelId: "",
    address: "", phone: "", mobile: "", email: "",
    position: "Menejer", isEmployee: true
  });

  // Rasmdagi barcha bo'limlar ierarxiyasi
  const [permissions, setPermissions] = useState({
    analitika: { dashboard: false, harakatlar: false, hisobotlar: false },
    nakladnolar: { kirim: false, chiqim: false },
    inventar: { mahsulotlar: false, omborlar: false, inventarizatsiya: false },
    ishlabChiqarish: { retseptlar: false, tayyorlash: false },
    moliya: { xarajatlar: false, ishchilar: false },
    tizim: { foydalanuvchilar: false, sozlamalar: false }
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      if (!isSuperAdmin && !user.permissions?.tizim?.foydalanuvchilar) {
        toast({ variant: "destructive", title: "Ruxsat yo'q", description: "Sizda 'Foydalanuvchilar' bo'limiga ruxsat mavjud emas." });
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
    if (!db || !user || !formData.lastName || !formData.firstName || !formData.email) {
      toast({ variant: "destructive", title: "Xato", description: "Barcha asosiy maydonlarni to'ldiring" });
      return;
    }
    
    setIsSaving(true);
    const id = doc(collection(db, "employees")).id;
    const systemName = `${formData.lastName} ${formData.firstName.charAt(0)}.`;
    
    const payload = {
      ...formData,
      id,
      fullName: `${formData.lastName} ${formData.firstName} ${formData.middleName}`.trim(),
      systemName,
      permissions, // Rasmda ko'rsatilgan barcha ruxsatlar
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "employees", id), payload);
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Muvaffaqiyatli", description: "Xodim va ruxsatnomalar saqlandi." });
    } catch (e) {
      toast({ variant: "destructive", title: "Xato", description: "Saqlashda xatolik." });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ lastName: "", firstName: "", middleName: "", tabelId: "", address: "", phone: "", mobile: "", email: "", position: "Menejer", isEmployee: true });
    setPermissions({
      analitika: { dashboard: false, harakatlar: false, hisobotlar: false },
      nakladnolar: { kirim: false, chiqim: false },
      inventar: { mahsulotlar: false, omborlar: false, inventarizatsiya: false },
      ishlabChiqarish: { retseptlar: false, tayyorlash: false },
      moliya: { xarajatlar: false, ishchilar: false },
      tizim: { foydalanuvchilar: false, sozlamalar: false }
    });
  };

  const PermissionGroup = ({ title, items, stateKey }: any) => (
    <div className="space-y-2 border-b border-slate-200 pb-3 mb-3 last:border-0">
      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
        <ChevronRight className="w-3 h-3" /> {title}
      </h5>
      <div className="grid grid-cols-2 gap-2 pl-2">
        {Object.keys(items).map((key) => (
          <div key={key} className="flex items-center space-x-2">
            <Checkbox 
              id={`${stateKey}-${key}`} 
              checked={permissions[stateKey][key]} 
              onCheckedChange={(v) => setPermissions({
                ...permissions, 
                [stateKey]: { ...permissions[stateKey], [key]: !!v }
              })} 
            />
            <Label htmlFor={`${stateKey}-${key}`} className="text-[11px] capitalize cursor-pointer">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );

  if (isUserLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-[#f0f2f5] font-body">
      <OmniSidebar />
      <main className="flex-1 p-6">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Xodimlar va Ruxsatlar</h1>
            <p className="text-xs text-slate-500 font-medium">Tizim ma'muriyati bo'limi</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#0078d4] hover:bg-[#005a9e] rounded-none h-10 px-6 flex gap-2 items-center text-xs font-bold uppercase">
                <Plus className="w-4 h-4" /> Foydalanuvchi qo'shish
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[950px] p-0 border-none rounded-lg overflow-hidden bg-[#f3f3f3]">
              <DialogHeader className="bg-white p-4 border-b">
                <DialogTitle className="text-sm font-normal text-slate-600 text-center flex items-center justify-center gap-2">
                   <ShieldCheck className="w-4 h-4 text-blue-600" /> Tizimga kirish huquqlarini sozlash
                </DialogTitle>
              </DialogHeader>

              <div className="p-6 grid grid-cols-5 gap-6 max-h-[70vh] overflow-y-auto">
                {/* Chap ustun: Asosiy Ma'lumotlar */}
                <div className="col-span-2 space-y-4 bg-white p-4 border rounded-md shadow-sm h-fit">
                   <h4 className="text-xs font-bold border-b pb-2 mb-4">Shaxsiy ma'lumotlar</h4>
                   <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Familiya va Ism</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Familiya" className="h-8 text-xs rounded-none" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                        <Input placeholder="Ism" className="h-8 text-xs rounded-none" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Email (Tizimga kirish uchun login)</Label>
                      <Input placeholder="email@gmail.com" className="h-8 text-xs rounded-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Lavozimi</Label>
                      <select className="w-full h-8 text-xs border border-slate-300 bg-white px-2 outline-none" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>
                        <option>Admin</option>
                        <option>Menejer</option>
                        <option>Omborchi</option>
                        <option>Buxgalter</option>
                        <option>Ishchi</option>
                      </select>
                    </div>
                   </div>
                </div>

                {/* O'ng ustun: Ruxsatnomalar ierarxiyasi (Rasmdagi bo'limlar) */}
                <div className="col-span-3 bg-white p-4 border rounded-md shadow-sm">
                   <h4 className="text-xs font-bold border-b pb-2 mb-4 text-blue-600">Bo'limlarga ruxsat berish</h4>
                   <div className="grid grid-cols-1 gap-1">
                      <PermissionGroup title="Analitika" stateKey="analitika" items={permissions.analitika} />
                      <PermissionGroup title="Nakladnolar" stateKey="nakladnolar" items={permissions.nakladnolar} />
                      <PermissionGroup title="Inventar boshqaruvi" stateKey="inventar" items={permissions.inventar} />
                      <PermissionGroup title="Ishlab chiqarish" stateKey="ishlabChiqarish" items={permissions.ishlabChiqarish} />
                      <PermissionGroup title="Moliya" stateKey="moliya" items={permissions.moliya} />
                      <PermissionGroup title="Tizim ma'muriyati" stateKey="tizim" items={permissions.tizim} />
                   </div>
                </div>
              </div>

              <DialogFooter className="bg-[#e1e1e1] p-3 gap-2 border-t">
                <Button className="h-9 rounded-none px-8 bg-[#0078d4] text-white text-xs hover:bg-[#005a9e] font-bold" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} SAQLASH
                </Button>
                <Button className="h-9 rounded-none px-8 bg-white text-black border border-slate-400 text-xs" onClick={() => setIsDialogOpen(false)}>
                   BEKOR QILISH
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {/* Qidiruv Paneli */}
        <div className="bg-white p-3 mb-6 border border-slate-200 shadow-sm flex items-center gap-4">
           <div className="relative flex-1 max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <Input placeholder="Foydalanuvchilarni qidirish..." className="pl-10 h-10 text-xs rounded-none border-slate-200" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
           </div>
        </div>

        {/* Xodimlar Kartochkalari */}
        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {filteredEmployees.map((emp: any) => (
               <Card key={emp.id} className="rounded-none border-slate-200 shadow-sm bg-white overflow-hidden group">
                 <div className="h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                 <CardContent className="p-5">
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 flex items-center justify-center rounded-lg">
                         <UserRound className="w-7 h-7" />
                      </div>
                      {isSuperAdmin && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => handleDelete(emp.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                   </div>
                   <h3 className="font-bold text-base text-slate-800">{emp.fullName}</h3>
                   <p className="text-[11px] text-slate-500 mb-4">{emp.email}</p>
                   
                   <div className="space-y-3 border-t pt-4 mt-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-bold uppercase">Roli:</span>
                        <Badge className="bg-slate-100 text-slate-700 rounded-none border-none text-[9px] uppercase">{emp.position}</Badge>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Ruxsatlar:</p>
                        <div className="flex flex-wrap gap-1">
                          {emp.permissions?.analitika?.dashboard && <Badge className="bg-emerald-50 text-emerald-600 text-[8px] border-none">Analitika</Badge>}
                          {emp.permissions?.inventar?.mahsulotlar && <Badge className="bg-blue-50 text-blue-600 text-[8px] border-none">Inventar</Badge>}
                          {emp.permissions?.ishlabChiqarish?.retseptlar && <Badge className="bg-purple-50 text-purple-600 text-[8px] border-none">Ishlab chiqarish</Badge>}
                          {emp.permissions?.moliya?.xarajatlar && <Badge className="bg-amber-50 text-amber-600 text-[8px] border-none">Moliya</Badge>}
                        </div>
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
