"use client";

import React from "react"; // ✅ FIX
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  UserPlus, Trash2, Loader2, UserX, Eye, EyeOff,
  Warehouse, Settings, Package, Truck, TrendingUp,
  Building2, History, FileText, DollarSign, Users,
  Shield, ChevronDown, ChevronUp, Edit2, X, Search, CheckCircle2
} from "lucide-react";

import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
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

const ROLE_PRESETS: any = {
  "Администратор": { permissions: AVAILABLE_SECTIONS.map(s => s.id) },
  "Кладовщик": { permissions: ["products","stockIn","stockOut","movements","reports","expenses","warehouses"] },
  "Продавец": { permissions: ["products","stockOut","movements","reports"] },
  "Бухгалтер": { permissions: ["expenses","reports","movements"] },
  "Наблюдатель": { permissions: ["products","movements","reports"] }
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

  const [formData, setFormData] = useState<any>({
    displayName: "",
    email: "",
    password: "",
    role: "Кладовщик",
    assignedWarehouseId: "all",
    permissions: {}
  });

  const isSuperAdmin = role === "Super Admin";

  // ===================== AUTH CHECK =====================
  useEffect(() => {
    if (!isUserLoading && !isSuperAdmin) {
      router.push("/");
    }
  }, [isSuperAdmin, isUserLoading]);

  // ===================== PERMISSIONS AUTO =====================
  useEffect(() => {
    const preset = ROLE_PRESETS[formData.role];
    if (!preset) return;

    const perms: any = {};
    AVAILABLE_SECTIONS.forEach(s => {
      perms[s.id] = preset.permissions.includes(s.id);
    });

    setFormData((p: any) => ({ ...p, permissions: perms }));

  }, [formData.role]);

  // ===================== FIREBASE =====================
  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "users");
  }, [db]);

  const { data: usersList = [], isLoading } = useCollection(usersQuery);

  // ===================== ADD USER =====================
  const handleAddUser = async () => {
    if (!formData.email || !formData.password) return;

    setIsSaving(true);

    let app: any;

    try {
      app = initializeApp(firebaseConfig, "secondary");
      const auth = getAuth(app);

      const cred = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      await setDoc(doc(db, "users", cred.user.uid), {
        ...formData,
        id: cred.user.uid,
        createdAt: new Date().toISOString()
      });

      await signOut(auth);

      toast({ title: "Created" });
      setIsDialogOpen(false);

    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      if (app) deleteApp(app);
      setIsSaving(false);
    }
  };

  // ===================== DELETE =====================
  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "users", id));
  };

  // ===================== FILTER =====================
  const filtered = usersList.filter((u: any) =>
    u?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ===================== LOADING =====================
  if (isUserLoading || !isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  // ===================== UI =====================
  return (
    <div className="flex">
      <OmniSidebar />

      <main className="flex-1 p-6">

        {/* HEADER */}
        <div className="flex justify-between mb-4">
          <h1 className="text-xl font-bold">Users</h1>

          <Button onClick={() => setIsDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        {/* SEARCH */}
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* TABLE */}
        {isLoading ? (
          <Loader2 className="animate-spin mt-10" />
        ) : (
          <div className="mt-4 space-y-2">

            {filtered.map((u: any) => {
              const isOpen = expandedUserId === u.id;

              return (
                <React.Fragment key={u.id}>
                  
                  <div className="p-3 border rounded flex justify-between">

                    <div>
                      <div>{u.displayName}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="icon" onClick={() =>
                        setExpandedUserId(isOpen ? null : u.id)
                      }>
                        {isOpen ? <ChevronUp /> : <ChevronDown />}
                      </Button>

                      <Button size="icon" onClick={() => handleDelete(u.id)}>
                        <Trash2 />
                      </Button>
                    </div>

                  </div>

                  {isOpen && (
                    <div className="p-3 bg-gray-100 text-xs">
                      Permissions: {Object.keys(u.permissions || {}).length}
                    </div>
                  )}

                </React.Fragment>
              );
            })}

          </div>
        )}

      </main>

      {/* ADD DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>

          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Name"
            value={formData.displayName}
            onChange={(e) =>
              setFormData({ ...formData, displayName: e.target.value })
            }
          />

          <Input
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />

          <Input
            placeholder="Password"
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />

          <DialogFooter>
            <Button onClick={handleAddUser} disabled={isSaving}>
              {isSaving && <Loader2 className="animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

    </div>
  );
}
