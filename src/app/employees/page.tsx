
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  UserRound, 
  Search, 
  Plus, 
  Loader2, 
  Trash2, 
  DollarSign, 
  Phone, 
  Briefcase,
  Wallet,
  ArrowUpRight
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";

export default function EmployeesPage() {
  const { t } = useLanguage();
  const db = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = role === "Super Admin" || role === "Admin";

  const [formData, setFormData] = useState({
    fullName: "",
    position: "",
    baseSalary: "0",
    bonus: "0",
    deductions: "0",
    phoneNumber: ""
  });

  const employeesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "employees");
  }, [db, user]);
  const { data: employees, isLoading } = useCollection(employeesQuery);

  const filteredEmployees = useMemo(() => {
    return employees?.filter(e => {
      return e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
             e.position.toLowerCase().includes(searchQuery.toLowerCase());
    }) || [];
  }, [employees, searchQuery]);

  const handleSave = () => {
    if (!db || !user || !formData.fullName) return;
    
    setIsSaving(true);
    const employeeId = doc(collection(db, "employees")).id;
    const employeeRef = doc(db, "employees", employeeId);
    
    const newEmployee = {
      id: employeeId,
      fullName: formData.fullName,
      position: formData.position,
      baseSalary: parseFloat(formData.baseSalary),
      bonus: parseFloat(formData.bonus),
      deductions: parseFloat(formData.deductions),
      phoneNumber: formData.phoneNumber,
      hiredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDoc(employeeRef, newEmployee)
      .then(() => {
        setIsDialogOpen(false);
        setFormData({ fullName: "", position: "", baseSalary: "0", bonus: "0", deductions: "0", phoneNumber: "" });
      })
      .finally(() => setIsSaving(false));
  };

  const handleDelete = (id: string) => {
    if (!db) return;
    const ref = doc(db, "employees", id);
    deleteDocumentNonBlocking(ref);
  };

  const calculateTotal = (base: string, bonus: string, ded: string) => {
    return parseFloat(base) + parseFloat(bonus) - parseFloat(ded);
  };

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 p-6 md:p-10 overflow-y-auto page-transition"
      >
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground">{t.employees.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">{t.employees.description}</p>
          </div>
          
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl premium-button shadow-xl shadow-primary/20 bg-primary text-white border-none">
                  <Plus className="w-4 h-4" /> {t.employees.addNew}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-lg p-8 shadow-2xl">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <UserRound className="text-primary w-6 h-6" /> {t.employees.addNew}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">{t.employees.fullName}</Label>
                    <Input 
                      className="h-12 rounded-2xl bg-background/50 border-border/40"
                      value={formData.fullName} 
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      placeholder="Aziz Karimov" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">{t.employees.position}</Label>
                      <Input 
                        className="h-12 rounded-2xl bg-background/50 border-border/40"
                        value={formData.position} 
                        onChange={(e) => setFormData({...formData, position: e.target.value})}
                        placeholder="Omborchi" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">{t.employees.phoneNumber}</Label>
                      <Input 
                        className="h-12 rounded-2xl bg-background/50 border-border/40"
                        value={formData.phoneNumber} 
                        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                        placeholder="+998 90 123 45 67" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">{t.employees.baseSalary}</Label>
                      <Input 
                        type="number"
                        className="h-12 rounded-2xl bg-background/50 border-border/40"
                        value={formData.baseSalary} 
                        onChange={(e) => setFormData({...formData, baseSalary: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">{t.employees.bonus}</Label>
                      <Input 
                        type="number"
                        className="h-12 rounded-2xl bg-background/50 border-border/40"
                        value={formData.bonus} 
                        onChange={(e) => setFormData({...formData, bonus: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">{t.employees.deductions}</Label>
                      <Input 
                        type="number"
                        className="h-12 rounded-2xl bg-background/50 border-border/40"
                        value={formData.deductions} 
                        onChange={(e) => setFormData({...formData, deductions: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Jami hisoblangan:</span>
                    <span className="text-xl font-black text-primary">{calculateTotal(formData.baseSalary, formData.bonus, formData.deductions).toLocaleString()} so'm</span>
                  </div>
                </div>
                <DialogFooter className="mt-10 gap-2">
                  <Button variant="ghost" className="rounded-2xl h-12" onClick={() => setIsDialogOpen(false)}>{t.actions.cancel}</Button>
                  <Button className="rounded-2xl h-12 px-8 bg-primary text-white font-black uppercase tracking-widest text-[10px] border-none shadow-xl shadow-primary/20" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.actions.save}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </header>

        <Card className="border-none glass-card mb-8 bg-card/40 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input 
                placeholder="Xodimlarni qidirish..." 
                className="pl-12 h-12 rounded-2xl bg-background/50 border-border/40 focus:border-primary/50 transition-all font-medium" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {(isLoading || authLoading) ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredEmployees.map((emp: any, idx) => (
                <motion.div
                  key={emp.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[2.5rem] hover:bg-card/60 transition-all group overflow-hidden">
                    <CardContent className="pt-8 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <UserRound className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-black text-lg tracking-tight">{emp.fullName}</h3>
                            <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase border-none bg-muted/30 opacity-60">
                              {emp.position}
                            </Badge>
                          </div>
                        </div>
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(emp.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50 flex items-center gap-1.5">
                            <Phone className="w-3 h-3" /> {t.employees.phoneNumber}
                          </p>
                          <p className="text-xs font-bold">{emp.phoneNumber || '---'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50 flex items-center gap-1.5">
                            <Wallet className="w-3 h-3" /> {t.employees.totalSalary}
                          </p>
                          <p className="text-sm font-black text-emerald-500">
                            {(emp.baseSalary + emp.bonus - emp.deductions).toLocaleString()} so'm
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20">
                         <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase opacity-40">Oylik hisobot</span>
                            <span className="text-[11px] font-bold text-muted-foreground">O'z vaqtida hisoblangan</span>
                         </div>
                         <Button variant="ghost" size="sm" className="h-8 px-3 rounded-xl text-[10px] font-black uppercase bg-primary/10 text-primary">
                            Batafsil <ArrowUpRight className="w-3 h-3 ml-1.5" />
                         </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredEmployees.length === 0 && (
              <div className="col-span-full py-32 text-center opacity-10">
                <UserRound className="w-16 h-16 mx-auto mb-4" />
                <p className="text-[12px] font-black uppercase tracking-[0.4em]">Xodimlar topilmadi</p>
              </div>
            )}
          </div>
        )}
      </motion.main>
    </div>
  );
}
