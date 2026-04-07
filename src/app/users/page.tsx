"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  UserPlus, Trash2, Loader2,
  Package, Truck, TrendingUp,
  Building2, History, FileText, DollarSign, Users,
  Settings, ChevronDown, ChevronUp, AlertTriangle
} from "lucide-react";

import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";

// ===================== DATA =====================

const AVAILABLE_SECTIONS = [
  { id: "products",   label: "Товары",        icon: Package },
  { id: "stockIn",    label: "Поступление",   icon: Truck },
  { id: "stockOut",   label: "Списание",      icon: TrendingUp },
  { id: "warehouses", label: "Склады",        icon: Building2 },
  { id: "movements",  label: "Движения",      icon: History },
  { id: "reports",    label: "Отчеты",        icon: FileText },
  { id: "expenses",   label: "Расходы",       icon: DollarSign },
  { id: "users",      label: "Пользователи",  icon: Users },
  { id: "settings",   label: "Настройки",     icon: Settings },
];

const ROLE_PRESETS: Record<string, string[]> = {
  "Администратор": AVAILABLE_SECTIONS.map(s => s.id),
  "Кладовщик":     ["products","stockIn","stockOut","movements","reports","expenses","warehouses"],
  "Продавец":      ["products","stockOut","movements","reports"],
  "Бухгалтер":     ["expenses","reports","movements"],
  "Наблюдатель":   ["products","movements","reports"],
};

const DEFAULT_ROLE = "Кладовщик";

function buildPermissions(role: string): Record<string, boolean> {
  const allowed = ROLE_PRESETS[role] ?? [];
  const perms: Record<string, boolean> = {};
  AVAILABLE_SECTIONS.forEach(s => { perms[s.id] = allowed.includes(s.id); });
  return perms;
}

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

  const [formData, setFormData] = useState(EMPTY_FORM);

  const isSuperAdmin = role === "Super Admin";

  // ===================== AUTH GUARD =====================
  useEffect(() => {
    if (isUserLoading) return;
    if (!isSuperAdmin) router.replace("/");
  }, [isSuperAdmin, isUserLoading, router]);

  // ===================== FIREBASE QUERY =====================
  const usersQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, "users");
  }, [db]);

  const { data: usersList = [], isLoading } = useCollection(usersQuery ?? undefined);

  // ===================== HANDLERS =====================

  // Rol o'zgarganda permissions ham birga o'zgaradi — useEffect YO'Q
  const handleRoleChange = (newRole: string) => {
    setFormData(prev => ({
      ...prev,
      role: newRole,
      permissions: buildPermissions(newRole),
    }));
  };

  const handleField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
        displayName:        formData.displayName.trim(),
        email:              formData.email.trim(),
        role:               formData.role,
        assignedWarehouseId: formData.assignedWarehouseId,
        permissions:        formData.permissions,
        id:                 cred.user.uid,
        createdAt:          new Date().toISOString(),
      });

      await signOut(auth);

      toast({ title: "Foydalanuvchi yaratildi ✓" });
      setIsDialogOpen(false);
      setFormData(EMPTY_FORM);

    } catch (e: any) {
      const msg =
        e?.code === "auth/email-already-in-use" ? "Bu email allaqachon ro'yxatdan o'tgan" :
        e?.code === "auth/weak-password"         ? "Parol juda oddiy" :
        e?.code === "auth/invalid-email"         ? "Email formati noto'g'ri" :
                                                   "Xatolik yuz berdi";
      toast({ variant: "destructive", title: msg });
    } finally {
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch {}
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
    } catch {
      toast({ variant: "destructive", title: "O'chirishda xatolik" });
    } finally {
      setDeletingId(null);
    }
  };

  // ===================== FILTER =====================
  const filtered = useMemo(() =>
    (usersList as any[]).filter(u => {
      const q = searchQuery.toLowerCase();
      return (
        u?.email?.toLowerCase().includes(q) ||
        u?.displayName?.toLowerCase().includes(q)
      );
    }),
    [usersList, searchQuery]
  );

  // ===================== LOADING / GUARD =====================
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
          <h1 className="text-2xl font-bold">Foydalanuvchilar</h1>
          <Button onClick={() => { setFormData(EMPTY_FORM); setIsDialogOpen(true); }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Qo'shish
          </Button>
        </div>

        {/* SEARCH */}
        <Input
          placeholder="Ism yoki email bo'yicha qidirish..."
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

              return (
                <React.Fragment key={u.id}>

                  <div className="p-4 border rounded-xl flex justify-between items-center bg-white shadow-sm">
                    <div>
                      <div className="font-semibold">{u.displayName || "—"}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                        {u.role}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="icon" variant="ghost"
                        onClick={() => setExpandedUserId(isOpen ? null : u.id)}
                      >
                        {isOpen
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
                      </Button>

                      <Button
                        size="icon" variant="ghost"
                        disabled={deletingId === u.id}
                        onClick={() => setConfirmDeleteId(u.id)}
                      >
                        {deletingId === u.id
                          ? <Loader2 className="animate-spin w-4 h-4" />
                          : <Trash2 className="w-4 h-4 text-red-500" />}
                      </Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-4 py-3 bg-white border border-t-0 rounded-b-xl shadow-sm">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        Ruxsatlar ({permCount}/{AVAILABLE_SECTIONS.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {AVAILABLE_SECTIONS.map(s => {
                          const has = u.permissions?.[s.id];
                          return (
                            <span key={s.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              has
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-400 line-through"
                            }`}>
                              {s.label}
                            </span>
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

      {/* ===== ADD USER DIALOG ===== */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={open => { if (!isSaving) setIsDialogOpen(open); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi foydalanuvchi</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Ism *"
              value={formData.displayName}
              onChange={e => handleField("displayName", e.target.value)}
            />
            <Input
              placeholder="Email *"
              type="email"
              value={formData.email}
              onChange={e => handleField("email", e.target.value)}
            />
            <Input
              placeholder="Parol * (kamida 6 belgi)"
              type="password"
              value={formData.password}
              onChange={e => handleField("password", e.target.value)}
            />

            {/* ROL */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Rol</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(ROLE_PRESETS).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleChange(r)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      formData.role === r
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* PERMISSIONS PREVIEW */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Ruxsatlar</p>
              <div className="flex flex-wrap gap-1">
                {AVAILABLE_SECTIONS.map(s => {
                  const has = formData.permissions[s.id];
                  return (
                    <span key={s.id} className={`px-2 py-0.5 rounded-full text-xs ${
                      has
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-400"
                    }`}>
                      {s.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Bekor qilish
            </Button>
            <Button onClick={handleAddUser} disabled={isSaving}>
              {isSaving && <Loader2 className="animate-spin mr-2 w-4 h-4" />}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE CONFIRM DIALOG ===== */}
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
