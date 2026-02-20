
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
import { UserPlus, MoreHorizontal, ShieldCheck, Loader2, UserX, Mail, User, AlertCircle, Info } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function UsersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();
  const router = useRouter();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    role: "Omborchi"
  });

  const isSuperAdmin = role === "Super Admin";

  // Role Guard
  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.push("/");
    }
  }, [isSuperAdmin, authLoading, router]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users");
  }, [db, user]);
  
  const { data: usersList, isLoading } = useCollection(usersQuery);

  const handleAddUser = () => {
    if (!db || !formData.email || !formData.displayName) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Iltimos, barcha maydonlarni to'ldiring.",
      });
      return;
    }

    setIsSaving(true);
    // Note: Creating actual Auth user from client without signing out is not possible.
    // We add them to Firestore. The Super Admin must create the Auth account in console.
    const newUserRef = doc(collection(db, "users"));
    const userData = {
      id: newUserRef.id,
      displayName: formData.displayName,
      email: formData.email,
      role: formData.role,
      status: "Pending", // Pending until they sign up or admin creates in console
      createdAt: new Date().toISOString()
    };

    setDoc(newUserRef, userData)
      .then(() => {
        toast({
          title: "Muvaffaqiyatli",
          description: "Foydalanuvchi profili yaratildi. Endi Firebase Console orqali Auth akkauntini oching.",
        });
        setIsDialogOpen(false);
        setFormData({ displayName: "", email: "", role: "Omborchi" });
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: newUserRef.path,
          operation: 'create',
          requestResourceData: userData
        }));
      })
      .finally(() => setIsSaving(false));
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
              <Button className="gap-2 font-black uppercase tracking-widest text-[10px] h-11 rounded-xl">
                <UserPlus className="w-4 h-4" /> {t.users.invite}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] border-white/5 bg-black/90 backdrop-blur-2xl text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight">Yangi foydalanuvchi qo'shish</DialogTitle>
                <CardDescription className="text-white/50">
                  Foydalanuvchini tizimga biriktirish. Login va parolni Firebase Console-da yaratish kerak.
                </CardDescription>
              </DialogHeader>
              
              <Alert variant="default" className="bg-primary/10 border-primary/20 text-white">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="text-[10px] font-black uppercase tracking-widest">Diqqat</AlertTitle>
                <AlertDescription className="text-xs opacity-70">
                  Xavfsizlik nuqtai nazaridan, yangi foydalanuvchi uchun <b>Firebase Console -> Authentication</b> bo'limida login va parol ochib bering.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">To'liq ism</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                    <Input 
                      className="pl-10 h-12 rounded-2xl bg-white/5 border-white/10"
                      value={formData.displayName} 
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      placeholder="Masalan: Azizbek Karimov" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">Elektron pochta</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                    <Input 
                      className="pl-10 h-12 rounded-2xl bg-white/5 border-white/10"
                      type="email"
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="email@example.com" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-1 text-white/50">Rol</Label>
                  <Select 
                    onValueChange={(val) => setFormData({...formData, role: val})}
                    value={formData.role}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-white/5 border-white/10">
                      <SelectValue placeholder="Rolni tanlang" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-white/10 bg-black/90 text-white">
                      <SelectItem value="Super Admin">Super Admin</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Omborchi">Omborchi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" className="rounded-xl h-11" onClick={() => setIsDialogOpen(false)}>{t.actions.cancel}</Button>
                <Button onClick={handleAddUser} disabled={isSaving} className="rounded-xl h-11 px-8 font-black uppercase tracking-widest text-[10px] bg-primary text-white">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Qo'shish"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card className="border-none glass-card overflow-hidden">
            <CardContent className="p-0">
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] uppercase bg-muted/30 text-muted-foreground font-black tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Foydalanuvchi</th>
                      <th className="px-6 py-5">{t.users.role}</th>
                      <th className="px-6 py-5">Holat</th>
                      <th className="px-6 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {usersList && usersList.map((u: any) => (
                      <tr key={u.id} className="hover:bg-primary/[0.02] transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10 border border-white/5">
                              <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">
                                {u.displayName ? u.displayName.split(' ').map((n: string) => n[0]).join('') : (u.email ? u.email[0].toUpperCase() : 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-black text-foreground tracking-tight">{u.displayName || 'Noma\'lum foydalanuvchi'}</span>
                              <span className="text-[10px] text-muted-foreground font-bold">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            <span className="text-xs font-black uppercase tracking-wider">{u.role || 'Xodim'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <Badge variant={u.status === "Active" ? "default" : "outline"} className="rounded-lg font-black text-[8px] uppercase px-2 py-0.5">
                            {u.status || 'Active'}
                          </Badge>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(!usersList || usersList.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-6 py-32 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <UserX className="w-12 h-12 opacity-10" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Hozircha foydalanuvchilar yo'q.</p>
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
