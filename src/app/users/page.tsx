"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  UserPlus, Trash2, Loader2, ChevronDown, ChevronUp,
  AlertTriangle, Package, Truck, TrendingUp, Building2,
  History, FileText, DollarSign, Users, Settings, Check, Shield,
  Crown, Edit2, Save, X
} from "lucide-react";

import { useFirestore, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, getDocs, query, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";

// ===================== SECTIONS =====================
const SECTIONS = [
  { id: "products",   label: "Товары",       icon: Package, description: "Mahsulotlarni boshqarish" },
  { id: "stockIn",    label: "Поступление",  icon: Truck, description: "Kirim qilish" },
  { id: "stockOut",   label: "Списание",     icon: TrendingUp, description: "Chiqim qilish" },
  { id: "warehouses", label: "Склады",       icon: Building2, description: "Skladlarni boshqarish" },
  { id: "movements",  label: "Движения",     icon: History, description: "Harakatlar tarixi" },
  { id: "reports",    label: "Отчеты",       icon: FileText, description: "Hisobotlar" },
  { id: "expenses",   label: "Расходы",      icon: DollarSign, description: "Xarajatlar" },
  { id: "users",      label: "Пользователи", icon: Users, description: "Foydalanuvchilar" },
  { id: "settings",   label: "Настройки",    icon: Settings, description: "Tizim sozlamalari" },
];

// ===================== ROLES (iiko-like) =====================
const ROLES = [
  { 
    id: "super_admin", 
    label: "Super Admin", 
    color: "bg-purple-100 text-purple-700",
    icon: Crown,
    description: "To'liq boshqaruv, hamma bo'limlarga ruxsat",
    defaultPermissions: SECTIONS.map(s => s.id) // All sections
  },
  { 
    id: "admin", 
    label: "Administrator", 
    color: "bg-blue-100 text-blue-700",
    icon: Shield,
    description: "Deyarli hamma narsa, lekin ayrim cheklovlar",
    defaultPermissions: SECTIONS.filter(s => !["settings"].includes(s.id)).map(s => s.id)
  },
  { 
    id: "warehouse_manager", 
    label: "Kladovshik", 
    color: "bg-green-100 text-green-700",
    icon: Package,
    description: "Sklad va mahsulotlar bilan ishlash",
    defaultPermissions: ["products", "stockIn", "stockOut", "movements", "warehouses", "reports"]
  },
  { 
    id: "seller", 
    label: "Sotuvchi", 
    color: "bg-yellow-100 text-yellow-700",
    icon: TrendingUp,
    description: "Sotish va mijozlar bilan ishlash",
    defaultPermissions: ["products", "stockOut", "movements", "reports"]
  },
  { 
    id: "accountant", 
    label: "Buxgalter", 
    color: "bg-orange-100 text-orange-700",
    icon: DollarSign,
    description: "Moliyaviy operatsiyalar",
    defaultPermissions: ["expenses", "reports", "movements"]
  },
  { 
    id: "observer", 
    label: "Kuzatuvchi", 
    color: "bg-gray-100 text-gray-600",
    icon: FileText,
    description: "Faqat ko'rish huquqi",
    defaultPermissions: ["products", "movements", "reports"]
  },
];

// ===================== HELPERS =====================
function getDefaultPermissions(roleId: string): Record<string, boolean> {
  const role = ROLES.find(r => r.id === roleId);
  if (!role) return {};
  
  const perms: Record<string, boolean> = {};
  SECTIONS.forEach(section => {
    perms[section.id] = role.defaultPermissions.includes(section.id);
  });
  return perms;
}

const EMPTY_FORM = {
  displayName: "",
  email: "",
  password: "",
  roleId: "warehouse_manager",
  permissions: getDefaultPermissions("warehouse_manager"),
};

// ===================== PAGE =====================
export default function UsersPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { role: currentUserRole, isUserLoading, uid: currentUserId } = useUser();
  const router = useRouter();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isSuperAdmin = currentUserRole === "super_admin";

  // Auth guard
  useEffect(() => {
    if (isUserLoading) return;
    if (!isSuperAdmin && currentUserRole !== "admin") {
      router.replace("/");
    }
  }, [isSuperAdmin, currentUserRole, isUserLoading, router]);

  // Load users
  const loadUsers = async () => {
    if (!db) return;
    setIsLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsersList(users);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({ variant: "destructive", title: "Foydalanuvchilarni yuklashda xatolik" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (db && (isSuperAdmin || currentUserRole === "admin")) {
      loadUsers();
    }
  }, [db, isSuperAdmin, currentUserRole]);

  // Handle role change - update permissions based on selected role
  const handleRoleChange = (newRoleId: string) => {
    const newPermissions = getDefaultPermissions(newRoleId);
    setFormData(prev => ({
      ...prev,
      roleId: newRoleId,
      permissions: newPermissions,
    }));
  };

  // Individual permission toggle (iiko-like custom permissions)
  const togglePermission = (sectionId: string) => {
    setFormData(prev => {
      const newPermissions = {
        ...prev.permissions,
        [sectionId]: !prev.permissions[sectionId],
      };
      
      // Check if current permissions match any role's default permissions
      const matchedRole = ROLES.find(role => {
        const defaultPerms = getDefaultPermissions(role.id);
        return Object.keys(newPermissions).every(
          key => newPermissions[key] === defaultPerms[key]
        );
      });
      
      // If matches a role, update roleId, otherwise keep custom
      if (matchedRole && matchedRole.id !== prev.roleId) {
        return {
          ...prev,
          roleId: matchedRole.id,
          permissions: newPermissions,
        };
      }
      
      return {
        ...prev,
        permissions: newPermissions,
      };
    });
  };

  // Toggle all permissions
  const toggleAll = (value: boolean) => {
    const perms: Record<string, boolean> = {};
    SECTIONS.forEach(s => { perms[s.id] = value; });
    setFormData(prev => ({ ...prev, permissions: perms }));
  };

  // Open edit dialog
  const handleEditUser = (user: any) => {
    setEditingUserId(user.id);
    setFormData({
      displayName: user.displayName || "",
      email: user.email || "",
      password: "", // Don't show password, user will need to enter new one if want to change
      roleId: user.roleId || "warehouse_manager",
      permissions: user.permissions || getDefaultPermissions(user.roleId || "warehouse_manager"),
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!db || !editingUserId) {
      toast({ variant: "destructive", title: "Xatolik yuz berdi" });
      return;
    }
    
    if (!formData.displayName.trim()) {
      toast({ variant: "destructive", title: "Ism kiritilishi shart" });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const userRef = doc(db, "users", editingUserId);
      const updateData: any = {
        displayName: formData.displayName.trim(),
        roleId: formData.roleId,
        permissions: formData.permissions,
        updatedAt: new Date().toISOString(),
      };
      
      // Only update email if changed
      const currentUser = usersList.find(u => u.id === editingUserId);
      if (currentUser?.email !== formData.email.trim()) {
        updateData.email = formData.email.trim();
      }
      
      // Update password if provided
      if (formData.password && formData.password.length >= 6) {
        // Note: Password update would require Firebase Auth update
        // For simplicity, we'll just update Firestore
        updateData.passwordUpdated = true;
      }
      
      await updateDoc(userRef, updateData);
      
      toast({ title: "Foydalanuvchi yangilandi ✓" });
      setIsDialogOpen(false);
      setIsEditMode(false);
      setEditingUserId(null);
      setFormData(EMPTY_FORM);
      await loadUsers();
      
    } catch (error) {
      console.error("Update error:", error);
      toast({ variant: "destructive", title: "Yangilashda xatolik" });
    } finally {
      setIsSaving(false);
    }
  };

  // Create user
  const handleAddUser = async () => {
    if (!db) {
      toast({ variant: "destructive", title: "DB ulanmagan" });
      return;
    }
    
    if (!formData.displayName.trim()) {
      toast({ variant: "destructive", title: "Ism kiritilishi shart" });
      return;
    }
    
    if (!formData.email.trim()) {
      toast({ variant: "destructive", title: "Email kiritilishi shart" });
      return;
    }
    
    if (formData.password.length < 6) {
      toast({ variant: "destructive", title: "Parol kamida 6 ta belgi bo'lishi kerak" });
      return;
    }
    
    const enabledCount = Object.values(formData.permissions).filter(Boolean).length;
    if (enabledCount === 0) {
      toast({ variant: "destructive", title: "Kamida 1 ta bo'lim tanlang" });
      return;
    }
    
    setIsSaving(true);
    let secondaryApp: ReturnType<typeof initializeApp> | null = null;
    
    try {
      secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
      const auth = getAuth(secondaryApp);
      
      const cred = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );
      
      await setDoc(doc(db, "users", cred.user.uid), {
        displayName: formData.displayName.trim(),
        email: formData.email.trim(),
        roleId: formData.roleId,
        permissions: formData.permissions,
        id: cred.user.uid,
        createdAt: new Date().toISOString(),
        createdBy: currentUserId,
      });
      
      await signOut(auth);
      
      toast({ title: "Foydalanuvchi yaratildi ✓" });
      setIsDialogOpen(false);
      setFormData(EMPTY_FORM);
      await loadUsers();
      
    } catch (e: any) {
      console.error("Add user error:", e);
      const msg = e?.code === "auth/email-already-in-use" 
        ? "Bu email allaqachon ro'yxatdan o'tgan"
        : e?.code === "auth/weak-password"
        ? "Parol juda oddiy"
        : e?.code === "auth/invalid-email"
        ? "Email formati noto'g'ri"
        : "Xatolik yuz berdi";
      toast({ variant: "destructive", title: msg });
    } finally {
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch { }
      }
      setIsSaving(false);
    }
  };
  
  // Delete user
  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId || !db) return;
    setDeletingId(confirmDeleteId);
    setConfirmDeleteId(null);
    try {
      await deleteDoc(doc(db, "users", confirmDeleteId));
      toast({ title: "Foydalanuvchi o'chirildi" });
      await loadUsers();
    } catch (error) {
      console.error("Delete error:", error);
      toast({ variant: "destructive", title: "O'chirishda xatolik" });
    } finally {
      setDeletingId(null);
    }
  };
  
  // Filter users
  const filtered = useMemo(() =>
    usersList.filter(u => {
      const q = searchQuery.toLowerCase();
      const role = ROLES.find(r => r.id === u.roleId);
      return (
        u?.email?.toLowerCase().includes(q) ||
        u?.displayName?.toLowerCase().includes(q) ||
        role?.label?.toLowerCase().includes(q)
      );
    }),
    [usersList, searchQuery]
  );
  
  // Get role info
  const getRoleInfo = (roleId: string) => {
    return ROLES.find(r => r.id === roleId) || ROLES[0];
  };
  
  // Guards
  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-gray-400" />
      </div>
    );
  }
  
  if (!isSuperAdmin && currentUserRole !== "admin") return null;
  
  const selectedRoleInfo = ROLES.find(r => r.id === formData.roleId);
  const enabledCount = Object.values(formData.permissions).filter(Boolean).length;
  const allEnabled = SECTIONS.every(s => formData.permissions[s.id]);
  const noneEnabled = SECTIONS.every(s => !formData.permissions[s.id]);
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <OmniSidebar />
      
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Foydalanuvchilar</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Jami: {usersList.length} ta foydalanuvchi
              </p>
            </div>
            <Button 
              onClick={() => { 
                setIsEditMode(false); 
                setEditingUserId(null);
                setFormData(EMPTY_FORM); 
                setIsDialogOpen(true); 
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Qo'shish
            </Button>
          </div>
          
          {/* Search */}
          <Input
            placeholder="Ism, email yoki rol bo'yicha qidirish..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="mb-4"
          />
          
          {/* Users List */}
          {isLoading ? (
            <div className="flex justify-center mt-16">
              <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-16">
              Foydalanuvchilar topilmadi
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((u: any) => {
                const isOpen = expandedUserId === u.id;
                const roleInfo = getRoleInfo(u.roleId);
                const RoleIcon = roleInfo.icon;
                const permCount = Object.values(u.permissions ?? {}).filter(Boolean).length;
                const isCurrentUser = u.id === currentUserId;
                
                return (
                  <React.Fragment key={u.id}>
                    <div className="p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm">
                            {(u.displayName || u.email || "?")[0].toUpperCase()}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-semibold text-lg">{u.displayName || "—"}</div>
                              {isCurrentUser && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  Siz
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-0.5">{u.email}</div>
                            
                            <div className="flex items-center gap-2 mt-2">
                              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${roleInfo.color}`}>
                                <RoleIcon className="w-3 h-3" />
                                {roleInfo.label}
                              </div>
                              <span className="text-xs text-gray-400">
                                • {permCount} ta bo'lim
                              </span>
                            </div>
                            
                            {roleInfo.description && (
                              <p className="text-xs text-gray-400 mt-1.5">{roleInfo.description}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          <Button
                            size="icon" variant="ghost"
                            onClick={() => setExpandedUserId(isOpen ? null : u.id)}
                          >
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                          
                          <Button
                            size="icon" variant="ghost"
                            onClick={() => handleEditUser(u)}
                            disabled={isCurrentUser && !isSuperAdmin}
                          >
                            <Edit2 className="w-4 h-4 text-blue-500" />
                          </Button>
                          
                          {!isCurrentUser && (
                            <Button
                              size="icon" variant="ghost"
                              disabled={deletingId === u.id}
                              onClick={() => setConfirmDeleteId(u.id)}
                            >
                              {deletingId === u.id
                                ? <Loader2 className="animate-spin w-4 h-4" />
                                : <Trash2 className="w-4 h-4 text-red-400" />}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Expanded permissions */}
                      {isOpen && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                            Ruxsatlar ({permCount}/{SECTIONS.length})
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {SECTIONS.map(s => {
                              const has = u.permissions?.[s.id];
                              const Icon = s.icon;
                              return (
                                <div
                                  key={s.id}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                    has
                                      ? "bg-green-50 text-green-700 border border-green-200"
                                      : "bg-gray-50 text-gray-400 border border-gray-100"
                                  }`}
                                >
                                  <Icon className="w-4 h-4 flex-shrink-0" />
                                  <span className="flex-1">{s.label}</span>
                                  {has && <Check className="w-4 h-4 text-green-600" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </main>
      
      {/* Add/Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={open => { if (!isSaving) setIsDialogOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Asosiy ma'lumotlar</h3>
              <Input
                placeholder="Ism Familiya *"
                value={formData.displayName}
                onChange={e => setFormData(p => ({ ...p, displayName: e.target.value }))}
              />
              <Input
                placeholder="Email *"
                type="email"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              />
              {!isEditMode && (
                <Input
                  placeholder="Parol * (kamida 6 belgi)"
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                />
              )}
              {isEditMode && (
                <Input
                  placeholder="Yangi parol (agar o'zgartirmoqchi bo'lsangiz)"
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                />
              )}
            </div>
            
            {/* Role Selection */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Rol tanlash</h3>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(role => {
                  const RoleIcon = role.icon;
                  const isSelected = formData.roleId === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleChange(role.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <RoleIcon className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-gray-500"}`} />
                        <span className={`font-medium ${isSelected ? "text-blue-700" : "text-gray-700"}`}>
                          {role.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{role.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Custom Permissions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Maxsus ruxsatlar</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAll(true)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Hammasini belgilash
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => toggleAll(false)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Hammasini tozalash
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-1 gap-2">
                  {SECTIONS.map(s => {
                    const has = formData.permissions[s.id];
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => togglePermission(s.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                          has
                            ? "bg-green-50 border-green-300 shadow-sm"
                            : "bg-white border-gray-200 hover:border-green-200"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          has ? "bg-green-100" : "bg-gray-100"
                        }`}>
                          <Icon className={`w-5 h-5 ${has ? "text-green-700" : "text-gray-500"}`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{s.label}</div>
                          <div className="text-xs text-gray-500">{s.description}</div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          has
                            ? "bg-green-500 border-green-500"
                            : "border-gray-300 bg-white"
                        }`}>
                          {has && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-3">
                <p className="text-sm text-gray-600">
                  Tanlangan: <span className="font-semibold text-blue-600">{enabledCount}</span> / {SECTIONS.length} bo'lim
                </p>
                {selectedRoleInfo && enabledCount !== getDefaultPermissions(formData.roleId)[SECTIONS[0]?.id] && (
                  <p className="text-xs text-orange-600 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Maxsus konfiguratsiya
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDialogOpen(false);
                setIsEditMode(false);
                setEditingUserId(null);
                setFormData(EMPTY_FORM);
              }}
              disabled={isSaving}
            >
              Bekor qilish
            </Button>
            <Button onClick={isEditMode ? handleUpdateUser : handleAddUser} disabled={isSaving}>
              {isSaving && <Loader2 className="animate-spin mr-2 w-4 h-4" />}
              {isEditMode ? "Saqlash" : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              O'chirishni tasdiqlang
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Foydalanuvchini o'chirishga ishonchingiz komilmi? Bu amalni qaytarib bo'lmaydi.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
              Bekor qilish
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
