
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { UserPlus, Trash2, ShieldCheck, Loader2, UserX, Mail, User, Lock, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();
  const router = useRouter();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    role: "Omborchi"
  });

  const isSuperAdmin = role === "Super Admin";

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.push("/");
    }
  }, [isSuperAdmin, authLoading, router]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users");
  }, [db, user]);
  
  const { data: rawUsersList, isLoading } = useCollection(usersQuery);
  const usersList = (rawUsersList || []).filter((u: any) => u.email !== "f2472839@gmail.com");

  const handleAddUser = async () => {
    if (!db || !formData.email || !formData.displayName || !formData.password) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Iltimos, barcha maydonlarni to'ldiring.",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Parol kamida 6 ta belgidan iborat bo'lishi kerak.",
      });
      return;
    }

    setIsSaving(true);
    let secondaryApp;
    
    try {
      const secondaryAppName = `SecondaryApp_${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        formData.email, 
        formData.password
      );
      
      const newUid = userCredential.user.uid;

      const userData = {
        id: newUid,
        displayName: formData.displayName,
        email: formData.email,
        role: formData.role,
        status: "Active",
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "users", newUid), userData);
      await signOut(secondaryAuth);

      toast({
        title: "Muvaffaqiyatli",
        description: `${formData.displayName} uchun kirish ruxsati yaratildi.`,
      });
      
      setIsDialogOpen(false);
      setFormData({ displayName: "", email: "", password: "", role: "Omborchi" });
    } catch (error: any) {
      let message = "Foydalanuvchini yaratishda xatolik yuz berdi.";
      if (error.code === 'auth/email-already-in-use') message = "Ushbu elektron pochta manzili allaqachon ro'yxatdan o'tgan.";
      toast({ variant: "destructive", title: "Xatolik", description: message });
    } finally {
      if (secondaryApp) deleteApp(secondaryApp).catch(() => {});
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!db || !confirm("Ushbu foydalanuvchi profilini o'chirishni tasdiqlaysizmi? (Eslatma: Bu faqat Firestore profilini o'chiradi)")) return;
    
    setIsDeleting(userId);
    try {
      await deleteDoc(doc(db, "users", userId));
      toast({ title: "O'chirildi", description: "Foydalanuvchi profili muvaffaqiyatli o'chirildi." });
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik", description: "O'chirishda xato yuz berdi." });
    } finally {
      setIsDeleting(null);
    }
  };

  if (authLoading || !isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto bg-background">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground">{t.users.title}</h1>
            <p className="text-muted-foreground mt-1 font-medium">{t.users.description}</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-black uppercase tracking-widest text-[10px] h-11 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95">
                <UserPlus className="w-4 h-4" /> {t.users.invite}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-md p-8 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <UserPlus className="text-primary w-6 h-6" /> {t.users.invite}
                </DialogTitle>
                <CardDescription className="font-medium pt-2">
                  Yangi foydalanuvchi uchun kirish ma'lumotlarini yarating.
                </CardDescription>
              </DialogHeader>
              
              <div className="space-y-5 py-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">To'liq ism</Label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      className="pl-11 h-12 rounded-2xl bg-background/50 border-border/40 font-bold"
                      value={formData.displayName} 
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      placeholder="Azizbek Karimov" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">Elektron pochta</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      className="pl-11 h-12 rounded-2xl bg-background/50 border-border/40 font-bold"
                      type="email"
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="email@ombor.uz" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">Parol (Kirish uchun)</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      className="pl-11 pr-11 h-12 rounded-2xl bg-background/50 border-border/40 font-bold"
                      type={showPassword ? "text" : "password"}
                      value={formData.password} 
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="••••••" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">Rol</Label>
                  <Select 
                    onValueChange={(val) => setFormData({...formData, role: val})}
                    value={formData.role}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold">
                      <SelectValue placeholder="Rolni tanlang" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/40">
                      <SelectItem value="Admin" className="font-bold">Admin</SelectItem>
                      <SelectItem value="Omborchi" className="font-bold">Omborchi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button variant="ghost" className="rounded-2xl h-12 font-bold px-6" onClick={() => setIsDialogOpen(false)}>{t.actions.cancel}</Button>
                <Button onClick={handleAddUser} disabled={isSaving} className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-[10px] bg-primary text-white border-none shadow-xl shadow-primary/20">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isSaving ? "Yaratilmoqda..." : "Tasdiqlash"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-32 opacity-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : (
          <Card className="border-none glass-card overflow-hidden bg-card/40 backdrop-blur-2xl rounded-[3rem]">
            <CardContent className="p-0">
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] uppercase bg-muted/30 text-muted-foreground font-black tracking-[0.2em]">
                    <tr>
                      <th className="px-10 py-6">Foydalanuvchi</th>
                      <th className="px-6 py-6">{t.users.role}</th>
                      <th className="px-6 py-6">Holat</th>
                      <th className="px-10 py-6 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {usersList && usersList.map((u: any) => (
                      <tr key={u.id} className="hover:bg-primary/[0.02] transition-colors group">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border border-white/5 shadow-sm">
                              <AvatarFallback className="bg-primary/10 text-primary font-black text-sm">
                                {u.displayName ? u.displayName.split(' ').map((n: string) => n[0]).join('') : (u.email ? u.email[0].toUpperCase() : 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-black text-foreground tracking-tight text-base">{u.displayName || 'Noma\'lum'}</span>
                              <span className="text-[11px] text-muted-foreground font-bold opacity-60">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              u.role === "Admin" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                            )}>
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-wider">{u.role || 'Omborchi'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <Badge variant="outline" className="rounded-xl font-black text-[9px] uppercase px-3 py-1 bg-emerald-500/10 text-emerald-500 border-none shadow-sm">
                            {u.status || 'Active'}
                          </Badge>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-rose-500 hover:bg-rose-500/10"
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={isDeleting === u.id}
                          >
                            {isDeleting === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(!usersList || usersList.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-6 py-40 text-center">
                          <div className="flex flex-col items-center gap-4 text-muted-foreground opacity-10">
                            <UserX className="w-20 h-20" />
                            <p className="text-[12px] font-black uppercase tracking-[0.4em]">Hozircha foydalanuvchilar yo'q</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
