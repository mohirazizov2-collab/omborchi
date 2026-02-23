"use client";

import { useState, useMemo, useEffect } from "react";
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
  Calculator, 
  Phone, 
  Briefcase,
  Wallet,
  ArrowUpRight,
  Download,
  Percent,
  Clock,
  Coins
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc, addDoc } from "firebase/firestore";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function EmployeesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPayrollOpen, setIsPayrollOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = role === "Super Admin" || role === "Admin";

  const [formData, setFormData] = useState({
    fullName: "",
    position: "",
    department: "Logistika",
    baseSalary: "5000000",
    overtimeHourlyRate: "50000",
    taxRate: "12",
    standardHours: "160",
    phoneNumber: ""
  });

  const [payrollData, setPayrollData] = useState({
    workingHours: "160",
    overtimeHours: "0",
    bonus: "0",
    deductions: "0"
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
      department: formData.department,
      baseSalary: parseFloat(formData.baseSalary),
      overtimeHourlyRate: parseFloat(formData.overtimeHourlyRate),
      taxRate: parseFloat(formData.taxRate),
      standardHours: parseFloat(formData.standardHours),
      phoneNumber: formData.phoneNumber,
      hiredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDoc(employeeRef, newEmployee)
      .then(() => {
        setIsDialogOpen(false);
        setFormData({ 
          fullName: "", 
          position: "", 
          department: "Logistika",
          baseSalary: "5000000", 
          overtimeHourlyRate: "50000",
          taxRate: "12",
          standardHours: "160",
          phoneNumber: "" 
        });
        toast({ title: "Muvaffaqiyatli", description: "Xodim qo'shildi." });
      })
      .finally(() => setIsSaving(false));
  };

  const calculatePayroll = (emp: any, pData: any) => {
    const base = emp.baseSalary || 0;
    const overtimePay = (parseFloat(pData.overtimeHours) || 0) * (emp.overtimeHourlyRate || 0);
    const bonus = parseFloat(pData.bonus) || 0;
    const ded = parseFloat(pData.deductions) || 0;
    
    const brutto = base + overtimePay + bonus;
    const taxAmount = brutto * ((emp.taxRate || 0) / 100);
    const netto = Math.max(0, brutto - taxAmount - ded);

    return { brutto, taxAmount, netto };
  };

  const handleSavePayroll = async () => {
    if (!db || !selectedEmployee) return;
    setIsSaving(true);

    const { brutto, taxAmount, netto } = calculatePayroll(selectedEmployee, payrollData);
    
    const payrollRecord = {
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.fullName,
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      ...payrollData,
      workingHours: parseFloat(payrollData.workingHours),
      overtimeHours: parseFloat(payrollData.overtimeHours),
      bonus: parseFloat(payrollData.bonus),
      deductions: parseFloat(payrollData.deductions),
      brutto,
      taxAmount,
      netto,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "payrolls"), payrollRecord);
      toast({ title: "Saqlandi", description: "Maosh hisoboti muvaffaqiyatli saqlandi." });
      setIsPayrollOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik", description: "Saqlashda xato." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!db || !confirm("Xodimni o'chirishni tasdiqlaysizmi?")) return;
    const ref = doc(db, "employees", id);
    deleteDocumentNonBlocking(ref);
  };

  const exportPayrollPDF = async (emp: any, pData: any) => {
    const { brutto, taxAmount, netto } = calculatePayroll(emp, pData);
    const jsPDFLib = (await import("jspdf")).default;
    const doc = new jsPDFLib();

    doc.setFontSize(20);
    doc.text("MAOSH VARAQASI", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Xodim: ${emp.fullName}`, 20, 40);
    doc.text(`Lavozimi: ${emp.position}`, 20, 47);
    doc.text(`Davr: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`, 20, 54);

    doc.line(20, 60, 190, 60);
    doc.text("Asosiy maosh:", 20, 70); doc.text(`${emp.baseSalary.toLocaleString()} so'm`, 140, 70);
    doc.text("Ortiqcha ish haqi:", 20, 77); doc.text(`${((parseFloat(pData.overtimeHours) || 0) * (emp.overtimeHourlyRate || 0)).toLocaleString()} so'm`, 140, 77);
    doc.text("Bonuslar:", 20, 84); doc.text(`${(parseFloat(pData.bonus) || 0).toLocaleString()} so'm`, 140, 84);
    doc.setFont("helvetica", "bold");
    doc.text("BRUTTO JAMI:", 20, 94); doc.text(`${brutto.toLocaleString()} so'm`, 140, 94);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Soliq (${emp.taxRate}%):`, 20, 104); doc.text(`- ${taxAmount.toLocaleString()} so'm`, 140, 104);
    doc.text("Boshqa ayirmalar:", 20, 111); doc.text(`- ${(parseFloat(pData.deductions) || 0).toLocaleString()} so'm`, 140, 111);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("NETTO (QO'LGA):", 20, 125); doc.text(`${netto.toLocaleString()} so'm`, 140, 125);

    doc.save(`Payroll_${emp.fullName}_${Date.now()}.pdf`);
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
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.employees.fullName}</Label>
                    <Input 
                      className="h-12 rounded-2xl bg-background/50"
                      value={formData.fullName} 
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      placeholder="Aziz Karimov" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.employees.position}</Label>
                      <Input 
                        className="h-12 rounded-2xl bg-background/50"
                        value={formData.position} 
                        onChange={(e) => setFormData({...formData, position: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.payroll.department}</Label>
                      <Input 
                        className="h-12 rounded-2xl bg-background/50"
                        value={formData.department} 
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.employees.baseSalary}</Label>
                      <Input 
                        type="number"
                        className="h-12 rounded-2xl bg-background/50"
                        value={formData.baseSalary} 
                        onChange={(e) => setFormData({...formData, baseSalary: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.payroll.hourlyRate}</Label>
                      <Input 
                        type="number"
                        className="h-12 rounded-2xl bg-background/50"
                        value={formData.overtimeHourlyRate} 
                        onChange={(e) => setFormData({...formData, overtimeHourlyRate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.payroll.taxRate}</Label>
                      <Input 
                        type="number"
                        className="h-12 rounded-2xl bg-background/50"
                        value={formData.taxRate} 
                        onChange={(e) => setFormData({...formData, taxRate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Telefon</Label>
                      <Input 
                        className="h-12 rounded-2xl bg-background/50"
                        value={formData.phoneNumber} 
                        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-8">
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>{t.actions.cancel}</Button>
                  <Button className="rounded-2xl h-12 px-8 bg-primary text-white font-black" onClick={handleSave} disabled={isSaving}>
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Xodimlarni qidirish..." 
                className="pl-12 h-12 rounded-2xl bg-background/50" 
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
                            <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase border-none bg-muted/30">
                              {emp.position}
                            </Badge>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-rose-500"
                              onClick={() => handleDelete(emp.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50 flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3" /> {t.payroll.department}
                          </p>
                          <p className="text-xs font-bold">{emp.department || '---'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50 flex items-center gap-1.5">
                            <Wallet className="w-3 h-3" /> {t.employees.baseSalary}
                          </p>
                          <p className="text-sm font-black text-primary">
                            {(emp.baseSalary || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20">
                         <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase opacity-40">Soliq stavkasi</span>
                            <span className="text-[11px] font-bold text-muted-foreground">{emp.taxRate || 12}%</span>
                         </div>
                         <Button 
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setIsPayrollOpen(true);
                            }}
                            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all gap-2"
                          >
                            <Calculator className="w-3.5 h-3.5" /> {t.payroll.calculate}
                         </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Payroll Dialog */}
        <Dialog open={isPayrollOpen} onOpenChange={setIsPayrollOpen}>
          <DialogContent className="rounded-[2.5rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-xl p-8 shadow-2xl">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                <Coins className="text-primary w-6 h-6" /> {selectedEmployee?.fullName} - {t.payroll.title}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.payroll.hours}</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    <Input 
                      type="number" 
                      className="pl-10 h-12 rounded-xl bg-background/50 border-border/40 font-bold"
                      value={payrollData.workingHours}
                      onChange={(e) => setPayrollData({...payrollData, workingHours: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.payroll.overtimeHours}</Label>
                  <Input 
                    type="number" 
                    className="h-12 rounded-xl bg-background/50 border-border/40 font-bold"
                    value={payrollData.overtimeHours}
                    onChange={(e) => setPayrollData({...payrollData, overtimeHours: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.employees.bonus}</Label>
                    <Input 
                      type="number" 
                      className="h-12 rounded-xl bg-background/50 border-border/40 font-bold"
                      value={payrollData.bonus}
                      onChange={(e) => setPayrollData({...payrollData, bonus: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.employees.deductions}</Label>
                    <Input 
                      type="number" 
                      className="h-12 rounded-xl bg-background/50 border-border/40 font-bold"
                      value={payrollData.deductions}
                      onChange={(e) => setPayrollData({...payrollData, deductions: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 rounded-[2rem] p-6 space-y-4 border border-primary/10">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase opacity-40">{t.payroll.brutto}</p>
                  <p className="text-xl font-black text-foreground">
                    {calculatePayroll(selectedEmployee || {}, payrollData).brutto.toLocaleString()} so'm
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase opacity-40">{t.payroll.tax} ({selectedEmployee?.taxRate}%)</p>
                  <p className="text-lg font-bold text-rose-500">
                    - {calculatePayroll(selectedEmployee || {}, payrollData).taxAmount.toLocaleString()} so'm
                  </p>
                </div>
                <div className="pt-4 border-t border-primary/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">{t.payroll.netto}</p>
                  <p className="text-3xl font-black text-primary font-headline">
                    {calculatePayroll(selectedEmployee || {}, payrollData).netto.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-primary/60 uppercase">so'm (UZS)</p>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-10 gap-3">
              <Button 
                variant="outline" 
                className="rounded-2xl h-12 font-bold px-6 border-border/50"
                onClick={() => exportPayrollPDF(selectedEmployee, payrollData)}
              >
                <Download className="w-4 h-4 mr-2" /> PDF
              </Button>
              <Button 
                className="rounded-2xl h-12 px-10 bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20"
                onClick={handleSavePayroll}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                {t.payroll.savePayroll}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.main>
    </div>
  );
}