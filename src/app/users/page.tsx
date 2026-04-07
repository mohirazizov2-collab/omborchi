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
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Checkbox 
} from "@/components/ui/checkbox";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  ScrollArea 
} from "@/components/ui/scroll-area";
import { 
  UserPlus, 
  Trash2, 
  ShieldCheck, 
  Loader2, 
  UserX, 
  Mail, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Warehouse,
  Settings,
  Package,
  Truck,
  TrendingUp,
  Building2,
  History,
  FileText,
  DollarSign,
  Users,
  Key,
  ChevronDown,
  ChevronUp,
  Shield,
  CheckSquare,
  Square
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";
import { cn } from "@/lib/utils";

// Define available sections/modules
const AVAILABLE_SECTIONS = [
  { id: "products", label: "Mahsulotlar", icon: Package, description: "Mahsulotlarni boshqarish (qo'shish, tahrirlash, o'chirish)" },
  { id: "stockIn", label: "Kirim", icon: Truck, description: "Omborga kirim operatsiyalari" },
  { id: "stockOut", label: "Chiqim", icon: TrendingUp, description: "Ombor chiqim operatsiyalari" },
  { id: "warehouses", label: "Omborlar", icon: Building2, description: "Omborlarni boshqarish" },
  { id: "movements", label: "Harakatlar", icon: History, description: "Harakatlar tarixini ko'rish" },
  { id: "reports", label: "Hisobotlar", icon: FileText, description: "Hisobotlarni yaratish va ko'rish" },
  { id: "expenses", label: "Xarajatlar", icon: DollarSign, description: "Xarajatlarni boshqarish" },
  { id: "users", label: "Foydalanuvchilar", icon: Users, description: "Foydalanuvchilarni boshqarish" },
  { id: "settings", label: "Sozlamalar", icon: Settings, description: "Tizim sozlamalari" },
];

// Role presets
const ROLE_PRESETS = {
  "Admin": {
    label: "Admin",
    description: "To'liq huquqlar, barcha bo'limlarga ruxsat",
    permissions: AVAILABLE_SECTIONS.map(s => s.id)
  },
  "Omborchi": {
    label: "Omborchi",
    description: "Ombor operatsiyalari va hisobotlar",
    permissions: ["products", "stockIn", "stockOut", "movements", "reports", "expenses"]
  },
  "Sotuvchi": {
    label: "Sotuvchi",
    description: "Sotuv operatsiyalari va mahsulotlar",
    permissions: ["products", "stockOut", "movements", "reports"]
  },
  "Hisobchi": {
    label: "Hisobchi",
    description: "Xarajatlar va hisobotlar",
    permissions: ["expenses", "reports", "movements"]
  },
  "Kuzatuvchi": {
    label: "Kuzatuvchi",
    description: "Faqat ko'rish huquqi",
    permissions: ["products", "movements", "reports"]
  }
};

export default function UsersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role, isUserLoading: authLoading } = useUser();
  const router = useRouter();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [expandedPermissions, setExpandedPermissions] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    role: "Omborchi",
    assignedWarehouseId: "all",
    permissions: {} as Record<string, boolean>
  });

  const isSuperAdmin = role === "Super Admin";

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.push("/");
    }
  }, [isSuperAdmin, authLoading, router]);

  // Initialize permissions based on selected role
  useEffect(() => {
    const preset = ROLE_PRESETS[formData.role as keyof typeof ROLE_PRESETS];
    if (preset) {
      const newPermissions: Record<string, boolean> = {};
      AVAILABLE_SECTIONS.forEach(section => {
        newPermissions[section.id] = preset.permissions.includes(section.id);
      });
      setFormData(prev => ({ ...prev, permissions: newPermissions }));
    }
  }, [formData.role]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users");
  }, [db, user]);
  
  const { data: rawUsersList, isLoading } = useCollection(usersQuery);
  const usersList = (rawUsersList || []).filter((u: any) => u.email !== "f2472839@gmail.com");

  const warehousesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "warehouses");
  }, [db]);
  const { data: warehouses } = useCollection(warehousesQuery);

  const handlePermissionToggle = (sectionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [sectionId]: !prev.permissions[sectionId]
      }
    }));
  };

  const handleSelectAll = () => {
    const allSelected = AVAILABLE_SECTIONS.every(s => formData.permissions[s.id]);
    const newPermissions: Record<string, boolean> = {};
    AVAILABLE_SECTIONS.forEach(section => {
      newPermissions[section.id] = !allSelected;
    });
    setFormData(prev => ({ ...prev, permissions: newPermissions }));
  };

  const handleAddUser = async () => {
    if (!db || !formData.email || !formData.displayName || !formData.password) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Iltimos, barcha majburiy maydonlarni to'ldiring.",
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
        assignedWarehouseId: formData.assignedWarehouseId === "all" ? null : formData.assignedWarehouseId,
        permissions: formData.permissions,
        status: "Active",
        createdAt: new Date().toISOString(),
        createdBy: user?.uid
      };

      await setDoc(doc(db, "users", newUid), userData);
      await signOut(secondaryAuth);

      toast({
        title: "Muvaffaqiyatli",
        description: `${formData.displayName} uchun kirish ruxsati yaratildi.`,
      });
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      let message = "Foydalanuvchini yaratishda xatolik yuz berdi.";
      if (error.code === 'auth/email-already-in-use') message = "Ushbu elektron pochta manzili allaqachon ro'yxatdan o'tgan.";
      toast({ variant: "destructive", title: "Xatolik", description: message });
    } finally {
      if (secondaryApp) deleteApp(secondaryApp).catch(() => {});
      setIsSaving(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!db || !editingUser || !formData.displayName) return;

    setIsSaving(true);
    try {
      const userData = {
        displayName: formData.displayName,
        role: formData.role,
        assignedWarehouseId: formData.assignedWarehouseId === "all" ? null : formData.assignedWarehouseId,
        permissions: formData.permissions,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid
      };

      await setDoc(doc(db, "users", editingUser.id), userData, { merge: true });

      toast({
        title: "Muvaffaqiyatli",
        description: `${formData.displayName} ma'lumotlari yangilandi.`,
      });
      
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Xatolik", description: "Yangilashda xatolik yuz berdi." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (user: any) => {
    setEditingUser(user);
    setFormData({
      displayName: user.displayName || "",
      email: user.email || "",
      password: "",
      role: user.role || "Omborchi",
      assignedWarehouseId: user.assignedWarehouseId || "all",
      permissions: user.permissions || ROLE_PRESETS[user.role as keyof typeof ROLE_PRESETS]?.permissions.reduce((acc: any, p: string) => ({ ...acc, [p]: true }), {}) || {}
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!db || !confirm("Ushbu foydalanuvchi profilini o'chirishni tasdiqlaysizmi?")) return;
    
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

  const resetForm = () => {
    setFormData({
      displayName: "",
      email: "",
      password: "",
      role: "Omborchi",
      assignedWarehouseId: "all",
      permissions: {}
    });
    setEditingUser(null);
    setShowPassword(false);
  };

  const getRoleBadgeStyle = (userRole: string) => {
    switch (userRole) {
      case "Admin": return "bg-amber-500/10 text-amber-500";
      case "Sotuvchi": return "bg-green-500/10 text-green-500";
      case "Hisobchi": return "bg-purple-500/10 text-purple-500";
      case "Kuzatuvchi": return "bg-gray-500/10 text-gray-500";
      default: return "bg-blue-500/10 text-blue-500";
    }
  };

  const getPermissionCount = (permissions: Record<string, boolean>) => {
    if (!permissions) return 0;
    return Object.values(permissions).filter(Boolean).length;
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
            <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground flex items-center gap-2">
              <Users className="w-7 h-7 text-primary" />
              {t.users.title}
            </h1>
            <p className="text-muted-foreground mt-1 font-medium">{t.users.description}</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-black uppercase tracking-widest text-[10px] h-11 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95">
                <UserPlus className="w-4 h-4" /> {t.users.invite}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-2xl p-0 shadow-2xl overflow-hidden">
              <div className="p-8 pb-4 border-b border-border/20">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <UserPlus className="text-primary w-6 h-6" /> {t.users.invite}
                  </DialogTitle>
                  <DialogDescription className="font-medium pt-2">
                    Yangi foydalanuvchi uchun kirish ma'lumotlarini va ruxsatlarini belgilang.
                  </DialogDescription>
                </DialogHeader>
              </div>
              
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border/20 bg-transparent px-8">
                  <TabsTrigger value="basic" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    Asosiy ma'lumotlar
                  </TabsTrigger>
                  <TabsTrigger value="permissions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    Ruxsatlar
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="p-8 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">To'liq ism *</Label>
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
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">Elektron pochta *</Label>
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
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">Parol (Kirish uchun) *</Label>
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
                  <div className="grid grid-cols-2 gap-4">
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
                          {Object.entries(ROLE_PRESETS).map(([key, value]) => (
                            <SelectItem key={key} value={key} className="font-bold">
                              <div>
                                <div>{value.label}</div>
                                <div className="text-[9px] text-muted-foreground">{value.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">Biriktirilgan ombor</Label>
                      <Select 
                        onValueChange={(val) => setFormData({...formData, assignedWarehouseId: val})}
                        value={formData.assignedWarehouseId}
                      >
                        <SelectTrigger className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold">
                          <SelectValue placeholder="Ombor..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border/40">
                          <SelectItem value="all" className="font-bold">Barchasi (Admin)</SelectItem>
                          {warehouses?.map(w => (
                            <SelectItem key={w.id} value={w.id} className="font-bold">{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="permissions" className="p-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-black text-sm flex items-center gap-2">
                          <Shield className="w-4 h-4 text-primary" />
                          Bo'limlarga ruxsatlar
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Foydalanuvchi qaysi bo'limlardan foydalanishi mumkinligini belgilang
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-[10px] font-black rounded-lg"
                        onClick={handleSelectAll}
                      >
                        {AVAILABLE_SECTIONS.every(s => formData.permissions[s.id]) ? "Barchasini bekor qilish" : "Barchasini tanlash"}
                      </Button>
                    </div>
                    
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {AVAILABLE_SECTIONS.map((section) => {
                          const Icon = section.icon;
                          const isEnabled = formData.permissions[section.id];
                          return (
                            <div
                              key={section.id}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer hover:bg-muted/10",
                                isEnabled ? "border-primary/30 bg-primary/5" : "border-border/20"
                              )}
                              onClick={() => handlePermissionToggle(section.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                  isEnabled ? "bg-primary/20 text-primary" : "bg-muted/20 text-muted-foreground"
                                )}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-black text-sm">{section.label}</p>
                                  <p className="text-[9px] text-muted-foreground">{section.description}</p>
                                </div>
                              </div>
                              <Checkbox 
                                checked={isEnabled}
                                onCheckedChange={() => handlePermissionToggle(section.id)}
                                className="h-5 w-5 rounded-lg"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    
                    <div className="mt-4 p-3 bg-muted/10 rounded-xl">
                      <p className="text-[10px] font-black text-muted-foreground">
                        Tanlangan ruxsatlar: {getPermissionCount(formData.permissions)} / {AVAILABLE_SECTIONS.length}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="p-8 pt-4 gap-3 border-t border-border/20">
                <Button variant="ghost" className="rounded-2xl h-12 font-bold px-6" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Bekor qilish
                </Button>
                <Button onClick={handleAddUser} disabled={isSaving || !formData.displayName || !formData.email || !formData.password} 
                  className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-[10px] bg-primary text-white border-none shadow-xl shadow-primary/20">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isSaving ? "Yaratilmoqda..." : "Tasdiqlash"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsEditDialogOpen(open); }}>
            <DialogContent className="rounded-[2.5rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-2xl p-0 shadow-2xl overflow-hidden">
              <div className="p-8 pb-4 border-b border-border/20">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <ShieldCheck className="text-primary w-6 h-6" /> Foydalanuvchini tahrirlash
                  </DialogTitle>
                  <DialogDescription className="font-medium pt-2">
                    {editingUser?.displayName} uchun ruxsatlarni o'zgartiring.
                  </DialogDescription>
                </DialogHeader>
              </div>
              
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border/20 bg-transparent px-8">
                  <TabsTrigger value="basic" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    Asosiy ma'lumotlar
                  </TabsTrigger>
                  <TabsTrigger value="permissions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    Ruxsatlar
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="p-8 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">To'liq ism</Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input 
                        className="pl-11 h-12 rounded-2xl bg-background/50 border-border/40 font-bold"
                        value={formData.displayName} 
                        onChange={(e) => setFormData({...formData, displayName: e.target.value})}
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
                        disabled
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">Rol</Label>
                      <Select 
                        onValueChange={(val) => setFormData({...formData, role: val})}
                        value={formData.role}
                      >
                        <SelectTrigger className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {Object.entries(ROLE_PRESETS).map(([key, value]) => (
                            <SelectItem key={key} value={key}>{value.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest pl-1 opacity-50">Biriktirilgan ombor</Label>
                      <Select 
                        onValueChange={(val) => setFormData({...formData, assignedWarehouseId: val})}
                        value={formData.assignedWarehouseId}
                      >
                        <SelectTrigger className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="all">Barchasi (Admin)</SelectItem>
                          {warehouses?.map(w => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="permissions" className="p-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-black text-sm flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        Bo'limlarga ruxsatlar
                      </h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-[10px] font-black rounded-lg"
                        onClick={handleSelectAll}
                      >
                        {AVAILABLE_SECTIONS.every(s => formData.permissions[s.id]) ? "Barchasini bekor qilish" : "Barchasini tanlash"}
                      </Button>
                    </div>
                    
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {AVAILABLE_SECTIONS.map((section) => {
                          const Icon = section.icon;
                          const isEnabled = formData.permissions[section.id];
                          return (
                            <div
                              key={section.id}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer hover:bg-muted/10",
                                isEnabled ? "border-primary/30 bg-primary/5" : "border-border/20"
                              )}
                              onClick={() => handlePermissionToggle(section.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center",
                                  isEnabled ? "bg-primary/20 text-primary" : "bg-muted/20 text-muted-foreground"
                                )}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-black text-sm">{section.label}</p>
                                  <p className="text-[9px] text-muted-foreground">{section.description}</p>
                                </div>
                              </div>
                              <Checkbox checked={isEnabled} onCheckedChange={() => handlePermissionToggle(section.id)} className="h-5 w-5 rounded-lg" />
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="p-8 pt-4 gap-3 border-t border-border/20">
                <Button variant="ghost" className="rounded-2xl h-12 font-bold px-6" onClick={() => { setIsEditDialogOpen(false); resetForm(); }}>
                  Bekor qilish
                </Button>
                <Button onClick={handleUpdateUser} disabled={isSaving} 
                  className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-[10px] bg-primary text-white">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Saqlash
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
                      <th className="px-6 py-6">Mas'ul ombor</th>
                      <th className="px-6 py-6">Ruxsatlar</th>
                      <th className="px-10 py-6 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {usersList && usersList.map((u: any) => {
                      const assignedWh = warehouses?.find(w => w.id === u.assignedWarehouseId);
                      const permissionCount = getPermissionCount(u.permissions);
                      return (
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
                              <div className={cn("p-1.5 rounded-lg", getRoleBadgeStyle(u.role))}>
                                <ShieldCheck className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-black uppercase tracking-wider">{u.role || 'Omborchi'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-2">
                              <Warehouse className="w-3.5 h-3.5 text-muted-foreground/40" />
                              <span className="text-xs font-bold text-foreground/70">
                                {assignedWh ? assignedWh.name : 'Barcha omborlar'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <button
                              onClick={() => setExpandedPermissions(expandedPermissions === u.id ? null : u.id)}
                              className="flex items-center gap-2 text-xs font-bold text-primary/70 hover:text-primary transition-colors"
                            >
                              <Shield className="w-3.5 h-3.5" />
                              {permissionCount} ta ruxsat
                              {expandedPermissions === u.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {expandedPermissions === u.id && u.permissions && (
                              <div className="absolute mt-2 p-3 bg-card border border-border/20 rounded-xl shadow-xl z-10 min-w-[200px]">
                                <div className="space-y-1">
                                  {AVAILABLE_SECTIONS.map(section => (
                                    <div key={section.id} className="flex items-center gap-2 text-[10px]">
                                      {u.permissions[section.id] ? 
                                        <CheckSquare className="w-3 h-3 text-emerald-500" /> : 
                                        <Square className="w-3 h-3 text-muted-foreground/30" />
                                      }
                                      <span className={cn(u.permissions[section.id] ? "font-bold" : "opacity-40")}>
                                        {section.label}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-10 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-primary hover:bg-primary/10"
                                onClick={() => handleEditClick(u)}
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-rose-500 hover:bg-rose-500/10"
                                onClick={() => handleDeleteUser(u.id)}
                                disabled={isDeleting === u.id}
                              >
                                {isDeleting === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {(!usersList || usersList.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-6 py-40 text-center">
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
