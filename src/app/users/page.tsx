"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  UserRound, Search, Plus, Loader2, 
  ShieldCheck, Save, ChevronRight, Edit3 
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function IikoStaffPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialPermissions = {
    analitika: { dashboard: false, harakatlar: false, hisobotlar: false },
    nakladnolar: { kirim: false, chiqim: false },
    inventar: { mahsulotlar: false, omborlar: false, inventarizatsiya: false },
    ishlabChiqarish: { retseptlar: false, tayyorlash: false },
    moliya: { xarajatlar: false, ishchilar: false },
    tizim: { foydalanuvchilar: false, sozlamalar: false }
  };

  const initialForm = {
    lastName: "", firstName: "", middleName: "", email: "",
    position: "Menejer", role: "User"
  };

  const [formData, setFormData] = useState(initialForm);
  const [permissions, setPermissions] = useState(initialPermissions);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users"); 
  }, [db, user]);

  const { data: allUsers, isLoading } = useCollection(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => {
      const searchTarget = `${u.lastName || ''} ${u.firstName || ''} ${u.email || ''}`.toLowerCase();
      return searchTarget.includes(searchQuery.toLowerCase());
    });
  }, [allUsers, searchQuery]);

  // TAHRIRLASH FUNKSIYASI
  const handleEdit = (userData: any) => {
    setEditingId(userData.id);
    setFormData({
      lastName: userData.lastName || "",
      firstName: userData.firstName || "",
      middleName: userData.middleName || "",
      email: userData.email || "",
      position: userData.position || "Menejer",
      role: userData.role || "User"
    });
    // Agar foydalanuvchida permissions bo'lmasa, initial ishlatiladi
    setPermissions(userData.permissions || initialPermissions);
    setIsDialogOpen(true);
  };

  // SAQLASH FUNKSIYASI
  const handleSave = async () => {
    if (!db || !formData.email || !formData.firstName) {
      toast({ variant: "destructive", title: "Xato", description: "Ism va Email kiritilishi shart" });
      return;
    }
    
    setIsSaving(true);
    const id = editingId || doc(collection(db, "users")).id;
    
    const payload = {
      ...formData,
      id,
      fullName: `${formData.lastName} ${formData.firstName}`.trim(),
      permissions,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "users", id), payload, { merge: true });
      setIsDialogOpen(false);
      setEditingId(null);
      setFormData(initialForm);
      setPermissions(initialPermissions);
      toast({ title: "Muvaffaqiyatli", description: "Foydalanuvchi ma'lumotlari saqlandi." });
    } catch (e) {
      toast({ variant: "destructive", title: "Xato", description: "Firebase'ga yozishda xatolik." });
    } finally {
      setIsSaving(false);
    }
  };

  const PermissionGroup = ({ title, items, stateKey }: any) => (
    <div className="space-y-2 border-b border-slate-200 pb-2 mb-2 last:border-0">
      <h5 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
        <ChevronRight className="w-3 h-3" /> {title}
      </h5>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-4">
        {Object.keys(items).map((key) => (
          <div key={key} className="flex items-center space-x-2">
            <Checkbox 
              id={`${stateKey}-${key}`} 
              checked={permissions[stateKey as keyof typeof permissions][key as keyof (typeof permissions)['analitika']]} 
              onCheckedChange={(v) => {
                const newPerms = { ...permissions };
                (newPerms[stateKey as keyof typeof permissions] as any)[key] = !!v;
                setPermissions(newPerms);
              }} 
            />
            <Label htmlFor={`${stateKey}-${key}`} className="text-[11px] cursor-pointer capitalize">
              {key === 'dashboard' ? 'Asosiy oyna' : key}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f0f2f5]">
      <OmniSidebar />
      <main className="flex-1 p-6">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Foydalanuvchilar</h1>
            <p className="text-xs text-slate-500">Baza: Cloud Firestore / users</p>
          </div>

          <Button 
            onClick={() => { setEditingId(null); setFormData(initialForm); setPermissions(initialPermissions); setIsDialogOpen(true); }} 
            className="bg-[#0078d4] hover:bg-[#005a9e] rounded-none text-xs font-bold uppercase shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Yangi foydalanuvchi
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-[850px] p-0 bg-[#f3f3f3] overflow-hidden border-none shadow-2xl">
              <DialogHeader className="bg-white p-4 border-b">
                <DialogTitle className="text-sm font-bold flex items-center gap-2">
                   <ShieldCheck className="w-4 h-4 text-blue-600" /> 
                   {editingId ? "MA'LUMOTLARNI TAHRIRLASH" : "YANGI FOYDALANUVCHI"}
                </DialogTitle>
              </DialogHeader>

              <div className="p-6 grid grid-cols-5 gap-6">
                <div className="col-span-2 space-y-4">
                  <div className="bg-white p-4 border rounded shadow-sm space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase border-b pb-1 mb-2">Shaxsiy ma'lumotlar</h4>
                    <div>
                      <Label className="text-[11px]">Familiya</Label>
                      <Input className="h-8 text-xs focus-visible:ring-blue-500" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                    </div>
                    <div>
                      <Label className="text-[11px]">Ism</Label>
                      <Input className="h-8 text-xs" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                    </div>
                    <div>
                      <Label className="text-[11px]">Email (Login)</Label>
                      <Input className="h-8 text-xs" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    
                    {/* ROL TANLASH QISMI SHU YERDA */}
                    <div className="pt-2">
                      <Label className="text-[11px]">Tizimdagi roli</Label>
                      <Select 
                        value={formData.role} 
                        onValueChange={(v) => setFormData({...formData, role: v})}
                      >
                        <SelectTrigger className="h-8 text-xs bg-slate-50">
                          <SelectValue placeholder="Rolni tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="User">Sotuvchi (User)</SelectItem>
                          <SelectItem value="Kassir">Kassir</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="col-span-3 bg-white p-4 border rounded shadow-sm max-h-[60vh] overflow-y-auto custom-scrollbar">
                   <h4 className="text-[10px] font-black text-blue-600 border-b pb-2 mb-4 uppercase">Bo'limlarga ruxsatlar (Permissions)</h4>
                   <PermissionGroup title="Analitika" stateKey="analitika" items={permissions.analitika} />
                   <PermissionGroup title="Nakladnolar" stateKey="nakladnolar" items={permissions.nakladnolar} />
                   <PermissionGroup title="Inventar" stateKey="inventar" items={permissions.inventar} />
                   <PermissionGroup title="Ishlab chiqarish" stateKey="ishlabChiqarish" items={permissions.ishlabChiqarish} />
                   <PermissionGroup title="Moliya" stateKey="moliya" items={permissions.moliya} />
                   <PermissionGroup title="Tizim" stateKey="tizim" items={permissions.tizim} />
                </div>
              </div>

              <DialogFooter className="bg-[#e1e1e1] p-3 gap-2">
                <Button className="h-9 bg-[#0078d4] hover:bg-[#005a9e] text-white text-xs font-bold px-6" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />} SAQLASH
                </Button>
                <Button variant="outline" className="h-9 text-xs border-slate-300" onClick={() => setIsDialogOpen(false)}>BEKOR QILISH</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="bg-white p-3 mb-6 border shadow-sm flex items-center justify-between">
           <div className="relative max-w-md w-full">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <Input placeholder="Ism yoki email bo'yicha qidirish..." className="pl-10 h-10 text-xs rounded-none border-slate-200" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
           </div>
           <p className="text-[10px] font-bold text-slate-400 italic">Jami: {filteredUsers.length} ta</p>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {filteredUsers.map((u: any) => (
                <Card 
                  key={u.id} 
                  className="hover:shadow-md hover:border-blue-400 cursor-pointer transition-all border-slate-200" 
                  onClick={() => handleEdit(u)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded flex items-center justify-center",
                        u.role === "Admin" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                      )}>
                        <UserRound className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-800">{u.lastName} {u.firstName}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase">{u.role || "User"}</span>
                          <p className="text-[10px] text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </div>
                    <Edit3 className="w-4 h-4 text-slate-300" />
                  </CardContent>
                </Card>
             ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Yordamchi klass (cn)
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
