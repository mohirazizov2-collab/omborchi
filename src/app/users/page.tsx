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
  History, FileText, DollarSign, Users, Settings, Check, Shield
} from "lucide-react";

import { useFirestore, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, getDocs, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";

// ===================== SECTIONS =====================

const SECTIONS = [
  { id: "products",   label: "Товары",       icon: Package },
  { id: "stockIn",    label: "Поступление",  icon: Truck },
  { id: "stockOut",   label: "Списание",     icon: TrendingUp },
  { id: "warehouses", label: "Склады",       icon: Building2 },
  { id: "movements",  label: "Движения",     icon: History },
  { id: "reports",    label: "Отчеты",       icon: FileText },
  { id: "expenses",   label: "Расходы",      icon: DollarSign },
  { id: "users",      label: "Пользователи", icon: Users },
  { id: "settings",   label: "Настройки",    icon: Settings },
];

// ===================== ROLES =====================

const ROLES: Record<string, { label: string; color: string; permissions: string[] }> = {
  "Super Admin": {
    label: "Super Admin",
    color: "bg-purple-100 text-purple-700",
    permissions: SECTIONS.map(s => s.id),
  },
  "Администратор": {
    label: "Администратор",
    color: "bg-blue-100 text-blue-700",
    permissions: SECTIONS.map(s => s.id),
  },
  "Кладовщик": {
    label: "Кладовщик",
    color: "bg-green-100 text-green-700",
    permissions: ["products","stockIn","stockOut","movements","reports","expenses","warehouses"],
  },
  "Продавец": {
    label: "Продавец",
    color: "bg-yellow-100 text-yellow-700",
    permissions: ["products","stockOut","movements","reports"],
  },
  "Бухгалтер": {
    label: "Бухгалтер",
    color: "bg-orange-100 text-orange-700",
    permissions: ["expenses","reports","movements"],
  },
  "Наблюдатель": {
    label: "Наблюдатель",
    color: "bg-gray-100 text-gray-600",
    permissions: ["products","movements","reports"],
  },
};

// ===================== HELPERS =====================

function buildPermissions(role: string): Record<string, boolean> {
  const allowed = ROLES[role]?.permissions ?? [];
  const perms: Record<string, boolean> = {};
  SECTIONS.forEach(s => { perms[s.id] = allowed.includes(s.id); });
  return perms;
}

const DEFAULT_ROLE = "Кладовщик";

const EMPTY_FORM = {
  displayName: "",
  email: "",
  password: "",
  role: DEFAULT_ROLE,
  assignedWarehouseId: "all",
  permissions: buildPermissions(DEFAULT_ROLE),
};

// ===================== PAGE =====================

export default function UsersPage() {
  const { toast }           = useToast();
  const db                  = useFirestore();
  const { role, isUserLoading } = useUser();
  const router              = useRouter();

  const [isDialogOpen,    setIsDialogOpen]    = useState(false);
  const [isSaving,        setIsSaving]        = useState(false);
  const [searchQuery,     setSearchQuery]     = useState("");
  const [expandedUserId,  setExpandedUserId]  = useState<string | null>(null);
  const [deletingId,      setDeletingId]      = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData]               = useState(EMPTY_FORM);
  const [usersList, setUsersList]             = useState<any[]>([]);
  const [isLoading, setIsLoading]             = useState(true);

  const isSuperAdmin = role === "Super Admin";

  // ===================== AUTH GUARD =====================
  useEffect(() => {
    if (isUserLoading) return;
    if (!isSuperAdmin) router.replace("/");
  }, [isSuperAdmin, isUserLoading, router]);

  // ===================== LOAD USERS =====================
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
    if (db && isSuperAdmin) {
      loadUsers();
    }
  }, [db, isSuperAdmin]);

  // ===================== FORM HANDLERS =====================

  const handleRoleChange = (newRole: string) => {
    setFormData(prev => ({
      ...prev,
      role: newRole,
      permissions: buildPermissions(newRole),
    }));
  };

  const togglePermission = (sectionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [sectionId]: !prev.permissions[sectionId],
      },
    }));
  };

  const toggleAll = (value: boolean) => {
    const perms: Record<string, boolean> = {};
    SECTIONS.forEach(s => { perms[s.id] = value; });
    setFormData(prev => ({ ...prev, permissions: perms }));
  };

  const allEnabled  = SECTIONS.every(s => formData.permissions[s.id]);
  const noneEnabled = SECTIONS.every(s => !formData.permissions[s.id]);

  // ===================== ADD USER =====================
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
      const auth   = getAuth(secondaryApp);

      const cred = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );

      await setDoc(doc(db, "users", cred.user.uid), {
        displayName:         formData.displayName.trim(),
        email:               formData.email.trim(),
        role:                formData.role,
        assignedWarehouseId: formData.assignedWarehouseId,
        permissions:         formData.permissions,
        id:                  cred.user.uid,
        createdAt:           new Date().toISOString(),
      });

      await signOut(auth);

      toast({ title: "Foydalanuvchi yaratildi ✓" });
      setIsDialogOpen(false);
      setFormData(EMPTY_FORM);
      await loadUsers(); // Reload users list

    } catch (e: any) {
      console.error("Add user error:", e);
      const msg =
        e?.code === "auth/email-already-in-use" ? "Bu email allaqachon ro'yxatdan o'tgan" :
        e?.code === "auth/weak-password"         ? "Parol juda oddiy" :
        e?.code === "auth/invalid-email"         ? "Email formati noto'g'ri" :
        e?.message || "Xatolik yuz berdi";
      toast({ variant: "destructive", title: msg });
    } finally {
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch (err) { console.error("Error deleting app:", err); }
      }
      setIsSaving(false);
    }
  };

  // ===================== DELETE =====================
  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId || !db) return;
    setDeletingId(confirmDeleteId);
    setConfirmDeleteId(null);
    try {
      await deleteDoc(doc(db, "users", confirmDeleteId));
      toast({ title: "Foydalanuvchi o'chirildi" });
      await loadUsers(); // Reload users list
    } catch (error) {
      console.error("Delete error:", error);
      toast({ variant: "destructive", title: "O'chirishda xatolik" });
    } finally {
      setDeletingId(null);
    }
  };

  // ===================== FILTER =====================
  const filtered = useMemo(() =>
    usersList.filter(u => {
      const q = searchQuery.toLowerCase();
      return (
        u?.email?.toLowerCase().includes(q) ||
        u?.displayName?.toLowerCase().includes(q) ||
        u?.role?.toLowerCase().includes(q)
      );
    }),
    [usersList, searchQuery]
  );

  // ===================== GUARDS =====================
  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-gray-400" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  // ===================== UI =====================
  return (
    <div className="flex min-h-screen bg-gray-50">
      <OmniSidebar />

      <main className="flex-1 p-6 max-w-3xl">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Foydalanuvchilar</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {usersList.length} ta foydalanuvchi
            </p>
          </div>
          <Button onClick={() => { setFormData(EMPTY_FORM); setIsDialogOpen(true); }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Qo'shish
          </Button>
        </div>

        {/* SEARCH */}
        <Input
          placeholder="Ism, email yoki rol bo'yicha qidirish..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="mb-4"
        />

        {/* LIST */}
        {isLoading ? (
          <div className="flex justify-center mt-16">
            <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center mt-16">
            Foydalanuvchilar topilmadi
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((u: any) => {
              const isOpen    = expandedUserId === u.id;
              const permCount = Object.values(u.permissions ?? {}).filter(Boolean).length;
              const roleColor = ROLES[u.role]?.color ?? "bg-gray-100 text-gray-600";

              return (
                <React.Fragment key={u.id}>
                  <div className="p-4 border rounded-xl flex justify-between items-center bg-white shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                        {(u.displayName || u.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold">{u.displayName || "—"}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {u.role === "Super Admin" && (
                            <Shield className="w-3 h-3 text-purple-600" />
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor}`}>
                            {u.role}
                          </span>
                          <span className="text-xs text-gray-400">
                            · {permCount} bo'lim
                          </span>
                        </div>
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
                        disabled={deletingId === u.id}
                        onClick={() => setConfirmDeleteId(u.id)}
                      >
                        {deletingId === u.id
                          ? <Loader2 className="animate-spin w-4 h-4" />
                          : <Trash2 className="w-4 h-4 text-red-400" />}
                      </Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-4 py-3 bg-white border border-t-0 rounded-b-xl shadow-sm -mt-1">
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                        Ruxsat berilgan bo'limlar ({permCount}/{SECTIONS.length})
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {SECTIONS.map(s => {
                          const has  = u.permissions?.[s.id];
                          const Icon = s.icon;
                          return (
                            <div
                              key={s.id}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium ${
                                has
                                  ? "bg-green-50 text-green-700"
                                  : "bg-gray-50 text-gray-400"
                              }`}
                            >
                              <Icon className="w-3 h-3 flex-shrink-0" />
                              <span>{s.label}</span>
                              {has && <Check className="w-3 h-3 ml-auto" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </main>

      {/* ADD USER DIALOG */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={open => { if (!isSaving) setIsDialogOpen(open); }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yangi foydalanuvchi</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
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
              <Input
                placeholder="Parol * (kamida 6 belgi)"
                type="password"
                value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Rol
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(ROLES).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleChange(r)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      formData.role === r
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {r === "Super Admin" && <Shield className="w-3 h-3" />}
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Bo'lim ruxsatlari
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAll(true)}
                    className="text-xs text-blue-600 hover:underline disabled:text-gray-300"
                  >
                    Hammasi
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => toggleAll(false)}
                    className="text-xs text-red-500 hover:underline disabled:text-gray-300"
                  >
                    Hech biri
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {SECTIONS.map(s => {
                  const has  = formData.permissions[s.id];
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => togglePermission(s.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                        has
                          ? "bg-green-50 border-green-200 text-green-800"
                          : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        has ? "bg-green-100" : "bg-gray-100"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="flex-1">{s.label}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        has
                          ? "bg-green-500 border-green-500"
                          : "border-gray-300"
                      }`}>
                        {has && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400 mt-2">
                {Object.values(formData.permissions).filter(Boolean).length}/{SECTIONS.length} bo'lim tanlangan
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4 sticky bottom-0 bg-white pt-3 border-t">
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Bekor qilish
            </Button>
            <Button onClick={handleAddUser} disabled={isSaving}>
              {isSaving && <Loader2 className="animate-spin mr-2 w-4 h-4" />}
              Foydalanuvchi yaratish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              O'chirishni tasdiqlang
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Foydalanuvchi Firestore'dan o'chiriladi. Bu amalni qaytarib bo'lmaydi.
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
