"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import { createUserWithEmailAndPassword, deleteUser, getAuth, signOut, type UserCredential } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import { addMonths, format } from "date-fns";
import { Building2, Loader2, Plus, RefreshCw, Users, UserCheck, PauseCircle, PlayCircle } from "lucide-react";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirebase, useUser } from "@/firebase";
import { firebaseConfig } from "@/firebase/config";
import { companyAuthEmail } from "@/lib/tenancy";
import { isFounder } from "@/lib/tenancy";
import { useRouter } from "next/navigation";

type Company = {
  id: string;
  name: string;
  username: string;
  ownerUid: string;
  subscriptionStatus: "active" | "suspended";
  subscriptionType: "trial" | "paid";
  subscriptionEndsAt?: Timestamp;
  createdAt?: Timestamp;
};

type Account = { companyId?: string; lastSeenAt?: Timestamp };

const toDate = (value?: Timestamp) => value?.toDate?.() ?? null;

export default function AdminPage() {
  const { firebaseApp, firestore } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  const founderAccess = isFounder(user?.email);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [subscriptionType, setSubscriptionType] = useState<"trial" | "paid">("trial");

  const fetchData = useCallback(async () => {
    if (!firestore) return;
    setLoading(true);
    setError("");
    try {
      const companySnapshot = await getDocs(collection(firestore, "companies"));
      const companyRecords = companySnapshot.docs.map((snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
      } as Company));
      const tenantAccountSnapshots = await Promise.all(
        companyRecords.map((company) => getDocs(collection(firestore, "companies", company.id, "users")))
      );
      const accountSnapshot = await getDocs(collection(firestore, "users"));
      setCompanies(companyRecords);
      setAccounts([
        ...accountSnapshot.docs.map((snapshot) => snapshot.data() as Account),
        ...tenantAccountSnapshots.flatMap((snapshot) => snapshot.docs.map((entry) => entry.data() as Account)),
      ]);
    } catch (cause) {
      console.error("Admin panel data load failed:", cause);
      setError("Ma’lumotlarni yuklab bo‘lmadi. Firestore ruxsatlarini tekshiring.");
    } finally {
      setLoading(false);
    }
  }, [firestore]);

  useEffect(() => {
    if (founderAccess) void fetchData();
  }, [fetchData, founderAccess]);

  useEffect(() => {
    if (user && !founderAccess) router.replace("/");
  }, [founderAccess, router, user]);

  const activeUsers = useMemo(() => {
    const threshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return accounts.filter((account) => {
      const seenAt = toDate(account.lastSeenAt);
      return seenAt !== null && seenAt.getTime() >= threshold;
    }).length;
  }, [accounts]);

  const createCompany = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firebaseApp || !firestore || !user || !founderAccess) return;
    const normalizedId = companyId.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(normalizedId)) {
      setError("Korxona ID 3–40 ta kichik lotin harfi, raqam yoki tire bo‘lsin.");
      return;
    }
    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(normalizedUsername)) {
      setError("Login 3–40 ta kichik lotin harfi, raqam yoki . _ - belgilaridan iborat bo‘lsin.");
      return;
    }
    if (normalizedId.length + normalizedUsername.length > 59) {
      setError("Korxona ID va login uzunligi birgalikda 59 belgidan oshmasin.");
      return;
    }
    if (password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo‘lishi kerak.");
      return;
    }

    setSaving(true);
    setError("");
    let secondaryApp: ReturnType<typeof initializeApp> | undefined;
    let accountCreated: UserCredential | undefined;
    try {
      const companyRef = doc(firestore, "companies", normalizedId);
      const existing = await getDoc(companyRef);
      if (existing.exists()) {
        setError("Bu korxona ID allaqachon ishlatilgan.");
        return;
      }

      secondaryApp = initializeApp(firebaseConfig, `company-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      accountCreated = await createUserWithEmailAndPassword(
        secondaryAuth,
        companyAuthEmail(normalizedId, normalizedUsername),
        password
      );

      const endsAt = addMonths(new Date(), 1);
      const userRef = doc(firestore, "companies", normalizedId, "users", accountCreated.user.uid);
      const batch = writeBatch(firestore);
      batch.set(companyRef, {
        name: companyName.trim(),
        username: normalizedUsername,
        ownerUid: accountCreated.user.uid,
        subscriptionStatus: "active",
        subscriptionType,
        subscriptionEndsAt: Timestamp.fromDate(endsAt),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });
      batch.set(userRef, {
        firstName: companyName.trim(),
        lastName: "",
        fullName: companyName.trim(),
        username: normalizedUsername,
        email: companyAuthEmail(normalizedId, normalizedUsername),
        role: "Admin",
        companyId: normalizedId,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
      setCompanyName("");
      setCompanyId("");
      setUsername("");
      setPassword("");
      await fetchData();
    } catch (cause) {
      console.error("Company creation failed:", cause);
      if (accountCreated?.user) {
        try {
          await deleteUser(accountCreated.user);
        } catch (cleanupError) {
          console.error("Failed to remove orphaned Firebase Auth account:", cleanupError);
        }
      }
      setError(cause instanceof Error ? cause.message : "Korxonani yaratishda xatolik yuz berdi.");
    } finally {
      if (secondaryApp) {
        try {
          await signOut(getAuth(secondaryApp));
        } catch (cleanupError) {
          console.error("Failed to sign out temporary company account:", cleanupError);
        }
        try {
          await deleteApp(secondaryApp);
        } catch (cleanupError) {
          console.error("Failed to delete temporary Firebase app:", cleanupError);
        }
      }
      setSaving(false);
    }
  };

  const changeSubscription = async (company: Company, action: "extend" | "pause" | "resume") => {
    if (!firestore || !founderAccess) return;
    try {
      const ref = doc(firestore, "companies", company.id);
      if (action === "pause") {
        await updateDoc(ref, { subscriptionStatus: "suspended" });
      } else {
        const existingEnd = toDate(company.subscriptionEndsAt);
        const base = existingEnd && existingEnd.getTime() > Date.now() ? existingEnd : new Date();
        await updateDoc(ref, {
          subscriptionStatus: "active",
          subscriptionType: "paid",
          subscriptionEndsAt: Timestamp.fromDate(addMonths(base, 1)),
        });
      }
      await fetchData();
    } catch (cause) {
      console.error("Subscription update failed:", cause);
      setError(cause instanceof Error ? cause.message : "Obunani yangilab bo‘lmadi.");
    }
  };

  if (!founderAccess) {
    return <div className="p-8 text-center font-semibold">Sahifa ochilmoqda...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <OmniSidebar />
      <main className="flex-1 min-w-0 p-5 pt-20 md:p-8 md:pt-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Super Admin paneli</h1>
            <p className="text-sm text-muted-foreground mt-1">Korxonalar, foydalanish va obunalarni boshqarish</p>
          </div>
          <Button variant="outline" onClick={() => void fetchData()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Yangilash
          </Button>
        </div>

        {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Jami korxonalar</CardTitle><Building2 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-3xl font-bold">{loading ? "—" : companies.length}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Jami foydalanuvchilar</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-3xl font-bold">{loading ? "—" : accounts.length}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Faol (30 kun)</CardTitle><UserCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-3xl font-bold">{loading ? "—" : activeUsers}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Yangi korxona qo‘shish</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createCompany} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="companyName">Korxona nomi</Label><Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="companyId">Korxona ID</Label><Input id="companyId" value={companyId} onChange={(e) => setCompanyId(e.target.value)} pattern="[a-zA-Z0-9][a-zA-Z0-9-]{2,39}" required /></div>
              <div className="space-y-2"><Label htmlFor="username">Admin login</Label><Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" required /></div>
              <div className="space-y-2"><Label htmlFor="password">Boshlang‘ich parol</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} autoComplete="new-password" required /></div>
              <div className="space-y-2"><Label htmlFor="subscriptionType">Boshlang‘ich obuna</Label><select id="subscriptionType" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={subscriptionType} onChange={(e) => setSubscriptionType(e.target.value as "trial" | "paid")}><option value="trial">1 oy sinov</option><option value="paid">1 oy obuna</option></select></div>
              <div className="flex items-end"><Button type="submit" disabled={saving} className="w-full">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Korxona yaratish</Button></div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Korxonalar va obunalar</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : companies.length === 0 ? <p className="text-sm text-muted-foreground">Hozircha korxonalar yo‘q.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">Korxona</th><th className="p-3">ID</th><th className="p-3">Login</th><th className="p-3">Obuna holati</th><th className="p-3">Tugash sanasi</th><th className="p-3">Amal</th></tr></thead>
                  <tbody>{companies.map((company) => {
                    const end = toDate(company.subscriptionEndsAt);
                    const isActive = company.subscriptionStatus === "active" && !!end && end.getTime() > Date.now();
                    return <tr key={company.id} className="border-b last:border-0">
                      <td className="p-3 font-semibold">{company.name}</td><td className="p-3 font-mono">{company.id}</td><td className="p-3">{company.username}</td>
                      <td className="p-3"><span className={isActive ? "text-emerald-600" : "text-destructive"}>{isActive ? (company.subscriptionType === "trial" ? "Sinov faol" : "Faol") : company.subscriptionStatus === "suspended" ? "To‘xtatilgan" : "Muddati tugagan"}</span></td>
                      <td className="p-3">{end ? format(end, "dd.MM.yyyy") : "—"}</td>
                      <td className="p-3"><div className="flex gap-2">
                        {company.subscriptionStatus === "suspended" ? <Button size="sm" variant="outline" onClick={() => void changeSubscription(company, "resume")}><PlayCircle className="mr-1 h-4 w-4" /> Yoqish + 1 oy</Button> : <Button size="sm" variant="outline" onClick={() => void changeSubscription(company, "extend")}><PlayCircle className="mr-1 h-4 w-4" /> + 1 oy</Button>}
                        {company.subscriptionStatus !== "suspended" && <Button size="sm" variant="ghost" onClick={() => void changeSubscription(company, "pause")} aria-label={`${company.name} obunasini to‘xtatish`}><PauseCircle className="h-4 w-4" /></Button>}
                      </div></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">Faol foydalanuvchilar — oxirgi 30 kunda tizimga kirgan hisoblar. Yangi hisoblar kirganda faollik sanasi avtomatik yangilanadi.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
