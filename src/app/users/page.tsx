
"use client";

import { useState } from "react";
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
import { UserPlus, MoreHorizontal, ShieldCheck, Loader2, UserX, Mail, User } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function UsersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, isUserLoading: authLoading } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    role: "Warehouse Worker"
  });

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
    const newUserRef = doc(collection(db, "users"));
    const userData = {
      id: newUserRef.id,
      displayName: formData.displayName,
      email: formData.email,
      role: formData.role,
      status: "Active",
      createdAt: new Date().toISOString()
    };

    setDoc(newUserRef, userData)
      .then(() => {
        toast({
          title: "Muvaffaqiyatli",
          description: "Foydalanuvchi profili yaratildi.",
        });
        setIsDialogOpen(false);
        setFormData({ displayName: "", email: "", role: "Warehouse Worker" });
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

  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto bg-background">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">{t.users.title}</h1>
            <p className="text-muted-foreground mt-1">{t.users.description}</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" /> {t.users.invite}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yangi foydalanuvchi qo'shish</DialogTitle>
                <CardDescription>
                  Foydalanuvchi ma'lumotlarini kiriting. Login parolni Firebase Console-da yaratishingiz kerak.
                </CardDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>To'liq ism</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      className="pl-10"
                      value={formData.displayName} 
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      placeholder="Masalan: Azizbek Karimov" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Elektron pochta</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      className="pl-10"
                      type="email"
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="email@example.com" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select 
                    onValueChange={(val) => setFormData({...formData, role: val})}
                    value={formData.role}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Rolni tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Super Admin">Super Admin</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Omborchi">Omborchi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t.actions.cancel}</Button>
                <Button onClick={handleAddUser} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Qo'shish"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {(isLoading || authLoading) ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Foydalanuvchi</th>
                      <th className="px-6 py-4 font-semibold">{t.users.role}</th>
                      <th className="px-6 py-4 font-semibold">Holat</th>
                      <th className="px-6 py-4 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {usersList && usersList.map((u: any) => (
                      <tr key={u.id} className="hover:bg-accent/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {u.displayName ? u.displayName.split(' ').map((n: string) => n[0]).join('') : (u.email ? u.email[0].toUpperCase() : 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">{u.displayName || 'Noma\'lum foydalanuvchi'}</span>
                              <span className="text-xs text-muted-foreground">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-blue-500" />
                            <span>{u.role || 'Xodim'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={u.status === "Active" ? "default" : "outline"}>
                            {u.status || 'Active'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(!usersList || usersList.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <UserX className="w-10 h-10 opacity-20" />
                            <p>Hozircha foydalanuvchilar yo'q.</p>
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
