"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { 
  Checkbox 
} from "@/components/ui/checkbox";
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
  Shield,
  Key,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit2,
  Save,
  X
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";
import { cn } from "@/lib/utils";

// iiko style sections
const AVAILABLE_SECTIONS = [
  { id: "products", label: "Товары", icon: Package, code: "PRD" },
  { id: "stockIn", label: "Поступление", icon: Truck, code: "INC" },
  { id: "stockOut", label: "Списание", icon: TrendingUp, code: "OUT" },
  { id: "warehouses", label: "Склады", icon: Building2, code: "WRH" },
  { id: "movements", label: "Движения", icon: History, code: "MOV" },
  { id: "reports", label: "Отчеты", icon: FileText, code: "RPT" },
  { id: "expenses", label: "Расходы", icon: DollarSign, code: "EXP" },
  { id: "users", label: "Пользователи", icon: Users, code: "USR" },
  { id: "settings", label: "Настройки", icon: Settings, code: "SET" },
];

// Role presets (iiko style)
const ROLE_PRESETS = {
  "Администратор": {
    label: "Администратор",
    description: "Полный доступ",
    permissions: AVAILABLE_SECTIONS.map(s => s.id)
  },
  "Кладовщик": {
    label: "Кладовщик",
    description: "Складские операции",
    permissions: ["products", "stockIn", "stockOut", "movements", "reports", "expenses", "warehouses"]
  },
  "Продавец": {
    label: "Продавец",
    description: "Продажи и товары",
    permissions: ["products", "stockOut", "movements", "reports"]
  },
  "Бухгалтер": {
    label: "Бухгалтер",
    description: "Расходы и отчеты",
    permissions: ["expenses", "reports", "movements"]
  },
  "Наблюдатель": {
    label: "Наблюдатель",
    description: "Только просмотр",
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
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    role: "Кладовщик",
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
        title: "Ошибка",
        description: "Заполните все обязательные поля.",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Пароль должен содержать минимум 6 символов.",
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
        title: "Успешно",
        description: `Пользователь ${formData.displayName} создан.`,
      });
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      let message = "Ошибка при создании пользователя.";
      if (error.code === 'auth/email-already-in-use') message = "Этот email уже зарегистрирован.";
      toast({ variant: "destructive", title: "Ошибка", description: message });
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
        title: "Успешно",
        description: `Данные пользователя ${formData.displayName} обновлены.`,
      });
      
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Ошибка", description: "Ошибка при обновлении." });
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
      role: user.role || "Кладовщик",
      assignedWarehouseId: user.assignedWarehouseId || "all",
      permissions: user.permissions || ROLE_PRESETS["Кладовщик"].permissions.reduce((acc: any, p: string) => ({ ...acc, [p]: true }), {})
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!db || !confirm("Удалить этого пользователя?")) return;
    
    setIsDeleting(userId);
    try {
      await deleteDoc(doc(db, "users", userId));
      toast({ title: "Удалено", description: "Пользователь удален." });
    } catch (err) {
      toast({ variant: "destructive", title: "Ошибка", description: "Ошибка при удалении." });
    } finally {
      setIsDeleting(null);
    }
  };

  const resetForm = () => {
    setFormData({
      displayName: "",
      email: "",
      password: "",
      role: "Кладовщик",
      assignedWarehouseId: "all",
      permissions: {}
    });
    setEditingUser(null);
    setShowPassword(false);
  };

  const getPermissionCount = (permissions: Record<string, boolean>) => {
    if (!permissions) return 0;
    return Object.values(permissions).filter(Boolean).length;
  };

  const filteredUsers = usersList?.filter((u: any) => {
    if (!searchQuery) return true;
    return u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           u.role?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (authLoading || !isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f0f0f0]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a5c3e]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f0f0f0]">
      <OmniSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* iiko style header */}
        <div className="bg-white border-b border-[#e0e0e0] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#1a1a1a] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1a5c3e]" />
                Пользователи
              </h1>
              <p className="text-xs text-[#666] mt-0.5">Управление учетными записями</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button className="bg-[#1a5c3e] hover:bg-[#144a32] text-white h-9 px-4 text-xs font-bold rounded-md shadow-none">
                  <UserPlus className="w-3.5 h-3.5 mr-2" />
                  Добавить пользователя
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-lg border-[#e0e0e0] bg-white text-[#1a1a1a] max-w-3xl p-0 shadow-xl">
                <div className="p-6 border-b border-[#e0e0e0]">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                      <UserPlus className="text-[#1a5c3e] w-5 h-5" />
                      Новый пользователь
                    </DialogTitle>
                  </DialogHeader>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-[#666]">ФИО *</Label>
                        <Input 
                          className="h-9 text-sm rounded-md border-[#d0d0d0] bg-white"
                          value={formData.displayName} 
                          onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                          placeholder="Иванов Иван Иванович" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-[#666]">Email *</Label>
                        <Input 
                          className="h-9 text-sm rounded-md border-[#d0d0d0] bg-white"
                          type="email"
                          value={formData.email} 
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="user@example.com" 
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-[#666]">Пароль *</Label>
                        <div className="relative">
                          <Input 
                            className="h-9 text-sm rounded-md border-[#d0d0d0] bg-white pr-9"
                            type={showPassword ? "text" : "password"}
                            value={formData.password} 
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            placeholder="••••••" 
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#1a5c3e]"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-[#666]">Роль</Label>
                        <Select 
                          onValueChange={(val) => setFormData({...formData, role: val})}
                          value={formData.role}
                        >
                          <SelectTrigger className="h-9 text-sm rounded-md border-[#d0d0d0] bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-md">
                            {Object.keys(ROLE_PRESETS).map((key) => (
                              <SelectItem key={key} value={key}>{ROLE_PRESETS[key as keyof typeof ROLE_PRESETS].label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-[#666]">Склад</Label>
                      <Select 
                        onValueChange={(val) => setFormData({...formData, assignedWarehouseId: val})}
                        value={formData.assignedWarehouseId}
                      >
                        <SelectTrigger className="h-9 text-sm rounded-md border-[#d0d0d0] bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-md">
                          <SelectItem value="all">Все склады</SelectItem>
                          {warehouses?.map(w => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Permissions section - iiko style table */}
                  <div className="border-t border-[#e0e0e0] pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-[10px] font-bold text-[#666] uppercase tracking-wider">Права доступа</Label>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-[9px] rounded-md border-[#d0d0d0]"
                        onClick={handleSelectAll}
                      >
                        {AVAILABLE_SECTIONS.every(s => formData.permissions[s.id]) ? "Снять все" : "Выбрать все"}
                      </Button>
                    </div>
                    
                    <div className="border border-[#e0e0e0] rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-[#f5f5f5] border-b border-[#e0e0e0]">
                          <tr className="text-[9px] font-bold text-[#666] uppercase">
                            <th className="px-3 py-2 text-left">Модуль</th>
                            <th className="px-3 py-2 text-left w-20">Доступ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e0e0e0]">
                          {AVAILABLE_SECTIONS.map((section) => {
                            const isEnabled = formData.permissions[section.id];
                            return (
                              <tr key={section.id} className="hover:bg-[#fafafa]">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <section.icon className="w-3.5 h-3.5 text-[#666]" />
                                    <span className="text-xs font-medium">{section.label}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <Checkbox 
                                    checked={isEnabled}
                                    onCheckedChange={() => handlePermissionToggle(section.id)}
                                    className="h-4 w-4 rounded border-[#d0d0d0]"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-3 text-right">
                      <span className="text-[9px] text-[#666]">
                        Выбрано: {getPermissionCount(formData.permissions)} / {AVAILABLE_SECTIONS.length}
                      </span>
                    </div>
                  </div>
                </div>
                
                <DialogFooter className="p-6 pt-0 gap-2">
                  <Button variant="outline" className="h-9 px-4 text-xs rounded-md border-[#d0d0d0]" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                    Отмена
                  </Button>
                  <Button onClick={handleAddUser} disabled={isSaving || !formData.displayName || !formData.email || !formData.password} 
                    className="h-9 px-5 text-xs font-bold rounded-md bg-[#1a5c3e] hover:bg-[#144a32] text-white">
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
                    Создать
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* iiko style toolbar */}
        <div className="bg-white border-b border-[#e0e0e0] px-6 py-3">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#999]" />
            <Input
              placeholder="Поиск..."
              className="h-8 pl-9 text-xs rounded-md border-[#d0d0d0] bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* iiko style table */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex justify-center py-32">
              <Loader2 className="w-8 h-8 animate-spin text-[#1a5c3e] opacity-30" />
            </div>
          ) : (
            <div className="bg-white border border-[#e0e0e0] rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#f5f5f5] border-b border-[#e0e0e0]">
                  <tr className="text-[10px] font-bold text-[#666] uppercase">
                    <th className="px-6 py-3 text-left">Пользователь</th>
                    <th className="px-6 py-3 text-left">Роль</th>
                    <th className="px-6 py-3 text-left">Склад</th>
                    <th className="px-6 py-3 text-left">Права</th>
                    <th className="px-6 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {filteredUsers && filteredUsers.map((u: any) => {
                    const assignedWh = warehouses?.find(w => w.id === u.assignedWarehouseId);
                    const permissionCount = getPermissionCount(u.permissions);
                    const isExpanded = expandedUserId === u.id;
                    
                    return (
                      <>
                        <tr key={u.id} className="hover:bg-[#fafafa] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 bg-[#1a5c3e]/10 rounded-md">
                                <AvatarFallback className="text-[#1a5c3e] text-xs font-bold">
                                  {u.displayName ? u.displayName.charAt(0).toUpperCase() : u.email?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-bold text-[#1a1a1a] text-sm">{u.displayName || '—'}</div>
                                <div className="text-[10px] text-[#999]">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium">{u.role || '—'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <Warehouse className="w-3 h-3 text-[#999]" />
                              <span className="text-xs">{assignedWh?.name || 'Все склады'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                              className="flex items-center gap-1.5 text-xs text-[#1a5c3e] hover:text-[#144a32]"
                            >
                              <Shield className="w-3 h-3" />
                              {permissionCount} прав
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7 rounded-md text-[#666] hover:text-[#1a5c3e] hover:bg-[#1a5c3e]/10"
                                onClick={() => handleEditClick(u)}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7 rounded-md text-[#666] hover:text-[#c62828] hover:bg-[#c62828]/10"
                                onClick={() => handleDeleteUser(u.id)}
                                disabled={isDeleting === u.id}
                              >
                                {isDeleting === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && u.permissions && (
                          <tr className="bg-[#fafafa]">
                            <td colSpan={5} className="px-6 py-3">
                              <div className="grid grid-cols-4 gap-2">
                                {AVAILABLE_SECTIONS.map(section => (
                                  <div key={section.id} className="flex items-center gap-2 text-[10px]">
                                    {u.permissions[section.id] ? 
                                      <CheckCircle2 className="w-3 h-3 text-[#1a5c3e]" /> : 
                                      <X className="w-3 h-3 text-[#999]" />
                                    }
                                    <span className={u.permissions[section.id] ? "font-medium" : "text-[#999]"}>
                                      {section.label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                  {(!filteredUsers || filteredUsers.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-[#999]">
                          <UserX className="w-12 h-12 opacity-20" />
                          <p className="text-xs font-medium">Нет пользователей</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Edit Dialog - iiko style */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsEditDialogOpen(open); }}>
          <DialogContent className="rounded-lg border-[#e0e0e0] bg-white text-[#1a1a1a] max-w-3xl p-0 shadow-xl">
            <div className="p-6 border-b border-[#e0e0e0]">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Edit2 className="text-[#1a5c3e] w-5 h-5" />
                  Редактирование пользователя
                </DialogTitle>
              </DialogHeader>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-[#666]">ФИО</Label>
                  <Input 
                    className="h-9 text-sm rounded-md border-[#d0d0d0] bg-white"
                    value={formData.displayName} 
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-[#666]">Email</Label>
                  <Input 
                    className="h-9 text-sm rounded-md border-[#d0d0d0] bg-[#f5f5f5]"
                    value={formData.email} 
                    disabled
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-[#666]">Роль</Label>
                  <Select 
                    onValueChange={(val) => setFormData({...formData, role: val})}
                    value={formData.role}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-md border-[#d0d0d0] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      {Object.keys(ROLE_PRESETS).map((key) => (
                        <SelectItem key={key} value={key}>{ROLE_PRESETS[key as keyof typeof ROLE_PRESETS].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-[#666]">Склад</Label>
                  <Select 
                    onValueChange={(val) => setFormData({...formData, assignedWarehouseId: val})}
                    value={formData.assignedWarehouseId}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-md border-[#d0d0d0] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="all">Все склады</SelectItem>
                      {warehouses?.map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="border-t border-[#e0e0e0] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-[10px] font-bold text-[#666] uppercase tracking-wider">Права доступа</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[9px] rounded-md border-[#d0d0d0]"
                    onClick={handleSelectAll}
                  >
                    {AVAILABLE_SECTIONS.every(s => formData.permissions[s.id]) ? "Снять все" : "Выбрать все"}
                  </Button>
                </div>
                
                <div className="border border-[#e0e0e0] rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f5f5f5] border-b border-[#e0e0e0]">
                      <tr className="text-[9px] font-bold text-[#666] uppercase">
                        <th className="px-3 py-2 text-left">Модуль</th>
                        <th className="px-3 py-2 text-left w-20">Доступ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0]">
                      {AVAILABLE_SECTIONS.map((section) => {
                        const isEnabled = formData.permissions[section.id];
                        return (
                          <tr key={section.id} className="hover:bg-[#fafafa]">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <section.icon className="w-3.5 h-3.5 text-[#666]" />
                                <span className="text-xs font-medium">{section.label}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <Checkbox 
                                checked={isEnabled}
                                onCheckedChange={() => handlePermissionToggle(section.id)}
                                className="h-4 w-4 rounded border-[#d0d0d0]"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <DialogFooter className="p-6 pt-0 gap-2">
              <Button variant="outline" className="h-9 px-4 text-xs rounded-md border-[#d0d0d0]" onClick={() => { setIsEditDialogOpen(false); resetForm(); }}>
                Отмена
              </Button>
              <Button onClick={handleUpdateUser} disabled={isSaving} 
                className="h-9 px-5 text-xs font-bold rounded-md bg-[#1a5c3e] hover:bg-[#144a32] text-white">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
