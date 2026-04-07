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
  Settings, ChevronDown, ChevronUp
} from "lucide-react";

import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";

// ===================== DATA =====================

const AVAILABLE_SECTIONS = [
  { id: "products", label: "Товары", icon: Package },
  { id: "stockIn", label: "Поступление", icon: Truck },
  { id: "stockOut", label: "Списание", icon: TrendingUp },
  { id: "warehouses", label: "Склады", icon: Building2 },
  { id: "movements", label: "Движения", icon: History },
  { id: "reports", label: "Отчеты", icon: FileText },
  { id: "expenses", label: "Расходы", icon: DollarSign },
  { id: "users", label: "Пользователи", icon: Users },
  { id: "settings", label: "Настройки", icon: Settings },
];

const ROLE_PRESETS: Record<string, { permissions: string[] }> = {
  "Администратор": { permissions: AVAILABLE_SECTIONS.map(s => s.id) },
  "Кладовщик": { permissions: ["products","stockIn","stockOut","movements","reports","expenses","warehouses"] },
  "Продавец": { permissions: ["products","stockOut","movements","reports"] },
  "Бухгалтер": { permissions: ["expenses","reports","movements"] },
  "Наблюдатель": { permissions: ["products","movements","reports"] }
};

const DEFAULT_ROLE = "Кладовщик";

function buildPermissions(role: string): Record<string, boolean> {
  const preset = ROLE_PRESETS[role];
  const perms: Record<string, boolean> = {};
  AVAILABLE_SECTIONS.forEach(s => {
    perms[s.id] = preset ? preset.permissions.includes(s.id) : false;
  });
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
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role, isUserLoading } = useUser();
  const router = useRouter();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState(EMPTY_FORM);

  const isSuperAdmin = role === "Super Admin";

  // ===================== AUTH CHECK =====================
  useEffect(() => {
    if (isUserLoading) return;
    if (!isSuperAdmin) {
      router.replace("/");
    }
  }, [isSuperAdmin, isUserLoading, router]);

  // ===================== PERMISSIONS AUTO =====================
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      permissions: buildPermissions(prev.role),
    }));
  }, [formData.role]);

  // ===================== FIREBASE QUERY =====================
  const usersQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, "users");
  }, [db]);

  const { data: usersList = [], isLoading } = useCollection(usersQuery);

  // ===================== ADD USER =====================
  const handleAddUser = async () => {
    if (!formData.email.trim() || !formData.password.trim()) {
      toast({ variant: "destructive", title: "Email va parol kiritilishi shart" });
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
        ...formData,
        email: formData.email.trim(),
        id: cred.user.uid,
        createdAt: new Date().toISOString(),
      });

      await signOut(auth);

      toast({ title: "Foydalanuvchi yaratildi ✓" });
      setIsDialogOpen(false);
      setFormData(EMPTY_FORM);

    } catch (e: any) {
      const msg =
        e?.code === "auth/email-already-in-use"
          ? "Bu email allaqachon ro'yxatdan o'tgan"
          : e?.code === "auth/weak-password"
          ? "Parol kamida 6 ta belgidan iborat bo'lishi kerak"
          : "Xatolik yuz berdi";
      toast({ variant: "destructive", title: msg });
    } finally {
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch {}
      }
      setIsSaving(false);
    }
  };

  // ===================== DELETE =====================
  const handleDelete = async (id: string) => {
    if (!confirm("Foydalanuvchini o'chirishni tasdiqlaysizmi?")) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "users", id));
      toast({ title: "O'chirildi" });
    } catch {
      toast({ variant: "destructive", title: "O'chirishda xatolik" });
    } finally {
      setDeletingId(null);
    }
  };

  // ===================== FILTER =====================
  const filtered = useMemo(() =>
    (usersList as any[]).filter(u =>
      u?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u?.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [usersList, searchQuery]
  );

  // ===================== LOADING / GUARD =====================
  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  // ===================== UI =====================
  return (
    <div className="flex">
      <OmniSidebar />

      <main className="flex-1 p-6 max-w-3xl">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">Foydalanuvchilar</h1>
          <Button onClick={() => { setFormData(EMPTY_FORM); setIsDialogOpen(true); }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Qo'shish
          </Button>
        </div>

        {/* SEARCH */}
        <Input
          placeholder="Qidirish (email yoki ism)..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="mb-4"
        />

        {/* LIST */}
        {isLoading ? (
          <div className="flex justify-center mt-10">
            <Loader2 className="animate-spin w-6 h-6" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center mt-10">
            Foydalanuvchilar topilmadi
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((u: any) => {
              const isOpen = expandedUserId === u.id;
              const permCount = Object.values(u.permissions || {}).filter(Boolean).length;

              return (
                <React.Fragment key={u.id}>
                  <div className="p-3 border rounded-lg flex justify-between items-center bg-white">
                    <div>
                      <div className="font-medium">{u.displayName || "—"}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                      <div className="text-xs text-blue-500 mt-0.5">{u.role}</div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setExpandedUserId(isOpen ? null : u.id)}
                      >
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={deletingId === u.id}
                        onClick={() => handleDelete(u.id)}
                      >
                        {deletingId === u.id
                          ? <Loader2 className="animate-spin w-4 h-4" />
                          : <Trash2 className="w-4 h-4 text-red-500" />
                        }
                      </Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-4 py-3 bg-gray-50 border border-t-0 rounded-b-lg text-xs space-y-1">
                      <div className="font-medium text-gray-700 mb-1">
                        Ruxsatlar ({permCount}/{AVAILABLE_SECTIONS.length}):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {AVAILABLE_SECTIONS.map(s => {
                          const hasAccess = u.permissions?.[s.id];
                          return (
                            <span
                              key={s.id}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                hasAccess
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-400 line-through"
                              }`}
                            >
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

      {/* ADD DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={open => { if (!isSaving) setIsDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi foydalanuvchi</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Ism *"
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

            {/* Role selector */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Rol</label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(ROLE_PRESETS).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, role: r }))}
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

            {/* Permissions preview */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Ruxsatlar</label>
              <div className="flex flex-wrap gap-1">
                {AVAILABLE_SECTIONS.map(s => {
                  const hasAccess = formData.permissions[s.id];
                  return (
                    <span
                      key={s.id}
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        hasAccess
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Bekor qilish
            </Button>
            <Button onClick={handleAddUser} disabled={isSaving}>
              {isSaving && <Loader2 className="animate-spin mr-2 w-4 h-4" />}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
