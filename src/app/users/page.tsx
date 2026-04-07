"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  UserPlus, Trash2, Loader2, ChevronDown, ChevronUp,
  AlertTriangle, Package, Truck, TrendingUp, Building2,
  History, FileText, DollarSign, Users, Settings,
  Check, Shield, Crown, Edit2, RefreshCw, Search, X,
} from "lucide-react";

import { useFirestore, useUser } from "@/firebase";
import {
  collection, doc, setDoc, deleteDoc, getDocs,
  query, updateDoc, where, writeBatch,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";

// ─── SECTIONS ───────────────────────────────────────────────────────────────

export const SECTIONS = [
  { id: "products",   label: "Товары",       icon: Package,    description: "Mahsulotlarni boshqarish" },
  { id: "stockIn",    label: "Поступление",  icon: Truck,      description: "Kirim qilish" },
  { id: "stockOut",   label: "Списание",     icon: TrendingUp, description: "Chiqim qilish" },
  { id: "warehouses", label: "Склады",       icon: Building2,  description: "Skladlarni boshqarish" },
  { id: "movements",  label: "Движения",     icon: History,    description: "Harakatlar tarixi" },
  { id: "reports",    label: "Отчеты",       icon: FileText,   description: "Hisobotlar" },
  { id: "expenses",   label: "Расходы",      icon: DollarSign, description: "Xarajatlar" },
  { id: "users",      label: "Пользователи", icon: Users,      description: "Foydalanuvchilar" },
  { id: "settings",   label: "Настройки",    icon: Settings,   description: "Tizim sozlamalari" },
];

// ─── ROLES ───────────────────────────────────────────────────────────────────

export const ROLES = [
  {
    id: "super_admin",
    label: "Super Admin",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    dotColor: "bg-purple-500",
    icon: Crown,
    description: "Barcha bo'limlarga to'liq kirish",
  },
  {
    id: "admin",
    label: "Admin",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    dotColor: "bg-blue-500",
    icon: Shield,
    description: "Settings va Users bundan mustasno",
  },
  {
    id: "warehouse_manager",
    label: "Omborchi",
    color: "bg-green-100 text-green-700 border-green-200",
    dotColor: "bg-green-500",
    icon: Package,
    description: "Sklad, mahsulot va hisobotlar",
  },
  {
    id: "seller",
    label: "Sotuvchi",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    dotColor: "bg-yellow-500",
    icon: TrendingUp,
    description: "Faqat sotish va mahsulotlarni ko'rish",
  },
  {
    id: "accountant",
    label: "Buxgalter",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    dotColor: "bg-orange-500",
    icon: DollarSign,
    description: "Xarajatlar va moliyaviy hisobotlar",
  },
  {
    id: "observer",
    label: "Kuzatuvchi",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    dotColor: "bg-gray-400",
    icon: FileText,
    description: "Faqat ko'rish huquqi",
  },
];

export type RoleId = typeof ROLES[number]["id"];

// Har bir rol uchun ruxsatlar (iiko logikasi)
const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  super_admin: {
    products: true, stockIn: true, stockOut: true, warehouses: true,
    movements: true, reports: true, expenses: true, users: true, settings: true,
  },
  admin: {
    products: true, stockIn: true, stockOut: true, warehouses: true,
    movements: true, reports: true, expenses: true, users: false, settings: false,
  },
  warehouse_manager: {
    products: true, stockIn: true, stockOut: true, warehouses: true,
    movements: true, reports: true, expenses: false, users: false, settings: false,
  },
  seller: {
    products: true, stockIn: false, stockOut: true, warehouses: false,
    movements: true, reports: false, expenses: false, users: false, settings: false,
  },
  accountant: {
    products: false, stockIn: false, stockOut: false, warehouses: false,
    movements: true, reports: true, expenses: true, users: false, settings: false,
  },
  observer: {
    products: true, stockIn: false, stockOut: false, warehouses: false,
    movements: true, reports: true, expenses: false, users: false, settings: false,
  },
};

export function getRoleById(roleId: string) {
  return ROLES.find(r => r.id === roleId) ?? ROLES[2];
}

export function getPermissions(roleId: string): Record<string, boolean> {
  return { ...(ROLE_PERMISSIONS[roleId] ?? ROLE_PERMISSIONS.observer) };
}

/**
 * usePermission – sidebar va sahifalarda ruxsatni tekshirish uchun hook
 * Misol: const canView = usePermission("products");
 */
export function usePermission(sectionId: string): boolean {
  const { role, permissions } = useUser();
  
  // Agar permissions field mavjud bo'lsa, undan foydalan (migratsiya uchun)
  if (permissions && typeof permissions === 'object') {
    return permissions[sectionId] ?? false;
  }
  
  // Aks holda roldan olish
  const rolePerms = ROLE_PERMISSIONS[role ?? "observer"];
  return rolePerms?.[sectionId] ?? false;
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { role: currentUserRole, isUserLoading, uid: currentUserId, permissions: currentUserPerms } = useUser();
  const router = useRouter();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    roleId: "warehouse_manager",
  });

  const isSuperAdmin = currentUserRole === "super_admin";
  const canManageUsers = currentUserPerms?.users === true || isSuperAdmin;

  // Auth guard
  useEffect(() => {
    if (isUserLoading) return;
    if (!canManageUsers) router.replace("/");
  }, [canManageUsers, isUserLoading, router]);

  // Load users
  const loadUsers = async () => {
    if (!db) return;
    setIsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "users")));
      setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error loading users:", error);
      toast({ variant: "destructive", title: "Foydalanuvchilarni yuklashda xatolik" });
    } finally {
      setIsLoading(false);
    }
  };

  // Migrate old users - add permissions field based on role
  const migrateUsers = async () => {
    if (!db) return;
    setIsMigrating(true);
    try {
      const snap = await getDocs(query(collection(db, "users")));
      const batch = writeBatch(db);
      let updatedCount = 0;

      for (const docSnap of snap.docs) {
        const userData = docSnap.data();
        const needsUpdate = !userData.permissions || Object.keys(userData.permissions || {}).length === 0;
        
        if (needsUpdate) {
          const roleId = userData.roleId || userData.role || "observer";
          const permissions = getPermissions(roleId);
          const userRef = doc(db, "users", docSnap.id);
          batch.update(userRef, {
            permissions,
            roleId: roleId,
            migrated: true,
          });
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
        toast({ title: `${updatedCount} ta foydalanuvchi yangilandi ✓` });
        await loadUsers();
      } else {
        toast({ title: "Barcha foydalanuvchilar yangilangan" });
      }
    } catch (error) {
      console.error("Migration error:", error);
      toast({ variant: "destructive", title: "Migratsiyada xatolik" });
    } finally {
      setIsMigrating(false);
    }
  };

  useEffect(() => {
    if (db && canManageUsers) {
      loadUsers();
    }
  }, [db, canManageUsers]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const openAdd = () => {
    setIsEditMode(false);
    setEditingUserId(null);
    setFormData({ displayName: "", email: "", password: "", roleId: "warehouse_manager" });
    setIsDialogOpen(true);
  };

  const openEdit = (user: any) => {
    setIsEditMode(true);
    setEditingUserId(user.id);
    setFormData({
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      password: "",
      roleId: user.roleId ?? "warehouse_manager",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isSaving) return;
    setIsDialogOpen(false);
    setIsEditMode(false);
    setEditingUserId(null);
  };

  const handleAdd = async () => {
    if (!db) return;
    if (!formData.displayName.trim()) return toast({ variant: "destructive", title: "Ism kiritilishi shart" });
    if (!formData.email.trim())       return toast({ variant: "destructive", title: "Email kiritilishi shart" });
    if (formData.password.length < 6) return toast({ variant: "destructive", title: "Parol kamida 6 belgi bo'lishi kerak" });

    setIsSaving(true);
    let secondaryApp: ReturnType<typeof initializeApp> | null = null;
    try {
      secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
      const auth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);

      const permissions = getPermissions(formData.roleId);

      await setDoc(doc(db, "users", cred.user.uid), {
        id: cred.user.uid,
        displayName: formData.displayName.trim(),
        email: formData.email.trim(),
        roleId: formData.roleId,
        permissions: permissions,
        createdAt: new Date().toISOString(),
        createdBy: currentUserId,
      });

      await signOut(auth);
      toast({ title: "Foydalanuvchi yaratildi ✓" });
      closeDialog();
      await loadUsers();
    } catch (e: any) {
      console.error("Add error:", e);
      const msg =
        e?.code === "auth/email-already-in-use" ? "Bu email allaqachon ro'yxatdan o'tgan" :
        e?.code === "auth/weak-password"         ? "Parol juda oddiy" :
        e?.code === "auth/invalid-email"         ? "Email formati noto'g'ri" :
                                                   "Xatolik yuz berdi";
      toast({ variant: "destructive", title: msg });
    } finally {
      if (secondaryApp) { try { await deleteApp(secondaryApp); } catch {} }
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!db || !editingUserId) return;
    if (!formData.displayName.trim()) return toast({ variant: "destructive", title: "Ism kiritilishi shart" });

    setIsSaving(true);
    try {
      const permissions = getPermissions(formData.roleId);
      
      await updateDoc(doc(db, "users", editingUserId), {
        displayName: formData.displayName.trim(),
        roleId: formData.roleId,
        permissions: permissions,
        updatedAt: new Date().toISOString(),
      });
      toast({ title: "Foydalanuvchi yangilandi ✓" });
      closeDialog();
      await loadUsers();
    } catch (error) {
      console.error("Update error:", error);
      toast({ variant: "destructive", title: "Yangilashda xatolik" });
    } finally {
      setIsSaving(false);
    }
  };

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

  // ── FILTER ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return usersList.filter(u => {
      const role = getRoleById(u.roleId);
      return (
        u?.email?.toLowerCase().includes(q) ||
        u?.displayName?.toLowerCase().includes(q) ||
        role.label.toLowerCase().includes(q)
      );
    });
  }, [usersList, searchQuery]);

  // Rol statistikasi
  const roleStats = useMemo(() => {
    const stats: Record<string, number> = {};
    ROLES.forEach(r => { stats[r.id] = 0; });
    usersList.forEach(u => {
      if (stats[u.roleId] !== undefined) stats[u.roleId]++;
    });
    return stats;
  }, [usersList]);

  // ─────────────────────────────────────────────────────────────────────────

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin w-8 h-8 text-gray-400" />
      </div>
    );
  }
  if (!canManageUsers) return null;

  const selectedRole = getRoleById(formData.roleId);
  const RoleIcon = selectedRole.icon;
  const selectedPerms = getPermissions(formData.roleId);
  const permCount = Object.values(selectedPerms).filter(Boolean).length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OmniSidebar />

      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Foydalanuvchilar</h1>
              <p className="text-sm text-gray-500 mt-0.5">Jami: {usersList.length} ta</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={migrateUsers} disabled={isMigrating}>
                {isMigrating ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                )}
                Yangilash
              </Button>
              <Button size="sm" onClick={openAdd}>
                <UserPlus className="w-4 h-4 mr-1.5" />
                Qo'shish
              </Button>
            </div>
          </div>

          {/* Rol statistikasi */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-5">
            {ROLES.map(role => {
              const count = roleStats[role.id] || 0;
              const Icon = role.icon;
              return (
                <div key={role.id} className={`border rounded-xl px-3 py-2.5 flex flex-col gap-1 ${count > 0 ? role.color : "bg-white border-gray-100 text-gray-300"}`}>
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium truncate">{role.label}</span>
                  </div>
                  <div className="text-xl font-bold">{count}</div>
                </div>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Ism, email yoki rol bo'yicha qidirish..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Users list */}
          {isLoading ? (
            <div className="flex justify-center mt-20">
              <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center mt-20 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Foydalanuvchilar topilmadi</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((u: any) => {
                const isOpen = expandedUserId === u.id;
                const roleInfo = getRoleById(u.roleId ?? "warehouse_manager");
                const RIcon = roleInfo.icon;
                const isCurrentUser = u.id === currentUserId;
                const userPerms = u.permissions || getPermissions(u.roleId);
                const permCountUser = Object.values(userPerms).filter(Boolean).length;

                return (
                  <div key={u.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(u.displayName || u.email || "?")[0].toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">{u.displayName || "—"}</span>
                          {isCurrentUser && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Siz</span>
                          )}
                          {u.migrated && (
                            <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">Yangilangan</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{u.email}</div>
                        <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border mt-1 ${roleInfo.color}`}>
                          <RIcon className="w-3 h-3" />
                          {roleInfo.label}
                          <span className="opacity-60">• {permCountUser} bo'lim</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setExpandedUserId(isOpen ? null : u.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                        >
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEdit(u)}
                          disabled={isCurrentUser && !isSuperAdmin}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 disabled:opacity-30"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isCurrentUser && (
                          <button
                            disabled={deletingId === u.id}
                            onClick={() => setConfirmDeleteId(u.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 disabled:opacity-30"
                          >
                            {deletingId === u.id
                              ? <Loader2 className="animate-spin w-4 h-4" />
                              : <Trash2 className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded: permissions */}
                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 border-t bg-gray-50">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                          Ruxsatlar — {roleInfo.label}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                          {SECTIONS.map(s => {
                            const has = userPerms[s.id];
                            const Icon = s.icon;
                            return (
                              <div
                                key={s.id}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
                                  has
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-white text-gray-300 border-gray-100"
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="flex-1">{s.label}</span>
                                {has && <Check className="w-3.5 h-3.5 text-green-500" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={open => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi qo'shish"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">

            {/* Basic info */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Asosiy ma'lumotlar
              </label>
              <Input
                placeholder="Ism Familiya *"
                value={formData.displayName}
                onChange={e => setFormData(p => ({ ...p, displayName: e.target.value }))}
              />
              <Input
                placeholder="Email *"
                type="email"
                value={formData.email}
                disabled={isEditMode}
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
            </div>

            {/* Role selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Rol tanlash
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(role => {
                  const Icon = role.icon;
                  const isSelected = formData.roleId === role.id;
                  const rolePerms = getPermissions(role.id);
                  const rolePermCount = Object.values(rolePerms).filter(Boolean).length;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, roleId: role.id }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? "bg-blue-100" : "bg-gray-100"}`}>
                          <Icon className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-gray-500"}`} />
                        </div>
                        <span className={`font-semibold text-sm ${isSelected ? "text-blue-700" : "text-gray-700"}`}>
                          {role.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-snug">{role.description}</p>
                      <p className="text-xs font-medium mt-1.5 text-gray-500">{rolePermCount} ta bo'lim</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview: what this role can access */}
            <div className="bg-gray-50 rounded-xl p-3 border">
              <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                <RoleIcon className="w-3.5 h-3.5" />
                {selectedRole.label} — ruxsatlar ({permCount}/{SECTIONS.length})
              </p>
              <div className="grid grid-cols-3 gap-1">
                {SECTIONS.map(s => {
                  const has = selectedPerms[s.id];
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs ${
                        has ? "bg-green-100 text-green-700" : "bg-white text-gray-300 border border-gray-100"
                      }`}
                    >
                      <Icon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{s.label}</span>
                      {has && <Check className="w-3 h-3 ml-auto flex-shrink-0 text-green-500" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} disabled={isSaving}>
              Bekor qilish
            </Button>
            <Button onClick={isEditMode ? handleUpdate : handleAdd} disabled={isSaving}>
              {isSaving && <Loader2 className="animate-spin mr-2 w-4 h-4" />}
              {isEditMode ? "Saqlash" : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ────────────────────────────────────────────────── */}
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
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>Bekor qilish</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>O'chirish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
