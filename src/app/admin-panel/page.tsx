"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock3,
  Wallet,
  TrendingUp,
  Search,
  Filter,
  Download,
  Moon,
  Sun,
  Eye,
  Ban,
  Play,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  CalendarDays,
  Users,
  CreditCard,
  Plus,
  Loader2,
} from "lucide-react";
import { initializeApp, deleteApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
  type UserCredential,
} from "firebase/auth";
import { addMonths } from "date-fns";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { firebaseConfig } from "@/firebase/config";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { companyAuthEmail, isFounder } from "@/lib/tenancy";

/* =========================================================
   TYPES
========================================================= */

type CompanyStatus = "active" | "suspended" | "trial";

type Payment = {
  id: string;
  amount: number;
  paid_at: string;
  method: string;
};

type Subscription = {
  id: string;
  plan: string;
  start_date: string;
  end_date: string;
  status: string;
};

type Company = {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  status: CompanyStatus;
  plan: string;
  created_at: string;
  expires_at: string;
  total_paid: number;
};

/* =========================================================
   HELPERS
========================================================= */

function money(value: number) {
  return new Intl.NumberFormat("uz-UZ").format(value) + " so'm";
}

function dateFormat(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("uz-UZ").format(date);
}

function statusText(status: CompanyStatus) {
  if (status === "active") return "Faol";
  if (status === "suspended") return "To'xtatilgan";
  return "Trial";
}

function statusClass(status: CompanyStatus) {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
  }
  if (status === "suspended") {
    return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  }
  return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
}

/** Firestore Timestamp, Date, string yoki number ni ISO string ga aylantiradi. Yaroqsiz bo'lsa "". */
function toIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const d = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  }
  const d = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/**
 * Holat gate (provider.tsx) va rules bilan bir xil qoida bo'yicha.
 * active/trial bo'lmasa yoki muddat tugagan bo'lsa — bloklangan (suspended).
 */
function deriveStatus(raw: string, endIso: string): CompanyStatus {
  const s = raw.toLowerCase();
  const endMs = endIso ? new Date(endIso).getTime() : NaN;
  const expired = Number.isNaN(endMs) || endMs <= Date.now();

  if ((s !== "active" && s !== "trial") || expired) return "suspended";
  return s === "trial" ? "trial" : "active";
}

/* =========================================================
   FIRESTORE
========================================================= */

function mapCompany(id: string, data: DocumentData): Company {
  const createdAt = toIso(data.createdAt);
  const expiresAt = toIso(data.subscriptionEndsAt);
  const rawStatus = String(data.subscriptionStatus ?? "");

  return {
    id,
    name: String(data.name ?? id),
    owner_name: String(data.ownerName ?? "—"),
    phone: String(data.phone || "—"),
    status: deriveStatus(rawStatus, expiresAt),
    plan: String(data.plan ?? "Basic"),
    created_at: createdAt,
    expires_at: expiresAt,
    total_paid: Number(data.totalPaid ?? 0),
  };
}

async function loadCompanyDetails(companyId: string) {
  const [usersSnap, paymentsSnap, subsSnap] = await Promise.all([
    getDocs(collection(db, "companies", companyId, "users")),
    getDocs(collection(db, "companies", companyId, "payments")),
    getDocs(collection(db, "companies", companyId, "subscriptions")),
  ]);

  const payments: Payment[] = paymentsSnap.docs.map((d) => {
    const p = d.data();
    return {
      id: d.id,
      amount: Number(p.amount ?? 0),
      paid_at: toIso(p.paidAt ?? p.createdAt),
      method: String(p.method ?? "Noma'lum"),
    };
  });

  const subscriptions: Subscription[] = subsSnap.docs.map((d) => {
    const s = d.data();
    return {
      id: d.id,
      plan: String(s.plan ?? "Basic"),
      start_date: toIso(s.startDate),
      end_date: toIso(s.endDate),
      status: String(s.status ?? ""),
    };
  });

  return { usersCount: usersSnap.size, payments, subscriptions };
}

/* =========================================================
   PAGE
========================================================= */

const PAGE_SIZE = 5;

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const founderAccess = isFounder(user?.email);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [dark, setDark] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CompanyStatus>("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "income-high" | "income-low">("newest");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Modal faqat ID saqlaydi; ma'lumot doim companies dan olinadi
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedId) ?? null,
    [companies, selectedId]
  );

  // Modal uchun qo'shimcha ma'lumotlar (faqat modal ochilganda yuklanadi)
  const [details, setDetails] = useState<{
    usersCount: number;
    payments: Payment[];
    subscriptions: Subscription[];
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailMessage, setDetailMessage] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const [companyForm, setCompanyForm] = useState({
    name: "",
    ownerName: "",
    phone: "",
    companyId: "",
    username: "",
    password: "",
  });
  const [companyFormLoading, setCompanyFormLoading] = useState(false);
  const [companyFormMessage, setCompanyFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  /* ---------- Auth himoyasi ---------- */

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!founderAccess) router.replace("/");
  }, [founderAccess, isUserLoading, router, user]);

  /* ---------- Ro'yxat: faqat companies kuzatiladi ---------- */

  useEffect(() => {
    if (isUserLoading || !user || !founderAccess) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "companies"),
      (snap) => {
        setCompanies(snap.docs.map((d) => mapCompany(d.id, d.data())));
        setLoadError("");
        setLoading(false);
      },
      (error) => {
        console.error("Companies listener failed:", error);
        setLoadError("Kompaniyalar Firestore'dan kuzatilmayapti. Ruxsatlarni tekshiring.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [founderAccess, isUserLoading, user]);

  /* ---------- Modal ochilganda detallarni yuklash ---------- */

  useEffect(() => {
    if (!selectedId) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    setDetailsLoading(true);
    setDetails(null);
    loadCompanyDetails(selectedId)
      .then((d) => {
        if (!cancelled) setDetails(d);
      })
      .catch((error) => {
        console.error("Company details failed:", error);
        if (!cancelled) setDetailMessage("Batafsil ma'lumotni yuklab bo'lmadi.");
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  function openCompany(id: string) {
    setDetailMessage("");
    setPaymentAmount("");
    setPaymentMethod("");
    setSelectedId(id);
  }

  function closeModal() {
    setSelectedId(null);
  }

  /* ---------- Statistika ---------- */

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter((c) => c.status === "active").length;
  const suspendedCompanies = companies.filter((c) => c.status === "suspended").length;
  const trialCompanies = companies.filter((c) => c.status === "trial").length;
  const totalIncome = companies.reduce((sum, c) => sum + c.total_paid, 0);

  /* ---------- Filtr va saralash ---------- */

  const filteredCompanies = useMemo(() => {
    let result = [...companies];
    const term = search.trim().toLowerCase();

    if (term) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.owner_name.toLowerCase().includes(term) ||
          c.phone.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (planFilter !== "all") {
      result = result.filter((c) => c.plan === planFilter);
    }

    const time = (v: string) => new Date(v).getTime() || 0;
    result.sort((a, b) => {
      if (sort === "newest") return time(b.created_at) - time(a.created_at);
      if (sort === "oldest") return time(a.created_at) - time(b.created_at);
      if (sort === "income-high") return b.total_paid - a.total_paid;
      return a.total_paid - b.total_paid;
    });
    return result;
  }, [companies, search, statusFilter, planFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE));
  const currentCompanies = filteredCompanies.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  /* ---------- Amallar ---------- */

  /**
   * Holatni o'zgartirish. Faollashtirishda obuna muddati tugagan bo'lsa,
   * 1 oylik yangi muddat beriladi va tarix yoziladi.
   */
  async function changeStatus(company: Company, newStatus: CompanyStatus) {
    setActionLoading(true);
    setActionError("");
    try {
      const companyRef = doc(db, "companies", company.id);

      if (newStatus === "suspended") {
        await updateDoc(companyRef, {
          subscriptionStatus: "suspended",
          updatedAt: serverTimestamp(),
        });
        return;
      }

      // active: muddat tugagan bo'lsa yangilaymiz
      const endMs = company.expires_at ? new Date(company.expires_at).getTime() : NaN;
      const expired = Number.isNaN(endMs) || endMs <= Date.now();

      if (!expired) {
        await updateDoc(companyRef, {
          subscriptionStatus: "active",
          subscriptionType: "paid",
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const start = new Date();
      const end = addMonths(start, 1);
      const batch = writeBatch(db);
      batch.update(companyRef, {
        subscriptionStatus: "active",
        subscriptionType: "paid",
        subscriptionEndsAt: Timestamp.fromDate(end),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, "companies", company.id, "subscriptions")), {
        plan: company.plan,
        startDate: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        status: "active",
        createdAt: serverTimestamp(),
        createdBy: user?.uid ?? null,
      });
      await batch.commit();
    } catch (error) {
      console.error("Status update failed:", error);
      setActionError(
        error instanceof Error
          ? `Holatni saqlab bo'lmadi: ${error.message}`
          : "Holatni Firebase'ga saqlab bo'lmadi."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function recordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCompany || !founderAccess) return;

    const amount = Number(paymentAmount);
    const method = paymentMethod.trim();
    if (!Number.isFinite(amount) || amount <= 0 || !method) {
      setDetailMessage("To'lov summasi va usulini to'g'ri kiriting.");
      return;
    }

    setActionLoading(true);
    setDetailMessage("");
    try {
      const companyRef = doc(db, "companies", selectedCompany.id);
      const paymentRef = doc(collection(db, "companies", selectedCompany.id, "payments"));
      const batch = writeBatch(db);
      batch.set(paymentRef, {
        amount,
        method,
        paidAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        createdBy: user?.uid ?? null,
      });
      batch.update(companyRef, {
        totalPaid: increment(amount),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();

      setPaymentAmount("");
      setPaymentMethod("");
      // Ro'yxat onSnapshot orqali o'zi yangilanadi; detallarni qayta yuklaymiz
      const fresh = await loadCompanyDetails(selectedCompany.id);
      setDetails(fresh);
      setDetailMessage("To'lov saqlandi.");
    } catch (error) {
      console.error("Payment save failed:", error);
      setDetailMessage(
        error instanceof Error
          ? `To'lovni saqlab bo'lmadi: ${error.message}`
          : "To'lovni saqlab bo'lmadi."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function extendSubscription() {
    if (!selectedCompany || !founderAccess) return;
    const company = selectedCompany;

    setActionLoading(true);
    setDetailMessage("");
    try {
      const now = new Date();
      const currentEnd = company.expires_at ? new Date(company.expires_at) : now;
      const start = Number.isNaN(currentEnd.getTime()) || currentEnd < now ? now : currentEnd;
      const end = addMonths(start, 1);

      const batch = writeBatch(db);
      batch.update(doc(db, "companies", company.id), {
        subscriptionStatus: "active",
        subscriptionType: "paid",
        subscriptionEndsAt: Timestamp.fromDate(end),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, "companies", company.id, "subscriptions")), {
        plan: company.plan,
        startDate: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        status: "active",
        createdAt: serverTimestamp(),
        createdBy: user?.uid ?? null,
      });
      await batch.commit();

      const fresh = await loadCompanyDetails(company.id);
      setDetails(fresh);
      setDetailMessage("Obuna bir oyga uzaytirildi.");
    } catch (error) {
      console.error("Subscription extension failed:", error);
      setDetailMessage(
        error instanceof Error
          ? `Obunani uzaytirib bo'lmadi: ${error.message}`
          : "Obunani saqlab bo'lmadi."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function createCompanyAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !founderAccess) return;

    const id = companyForm.companyId.trim().toLowerCase();
    const username = companyForm.username.trim().toLowerCase();
    const name = companyForm.name.trim();
    const ownerName = companyForm.ownerName.trim();
    const phone = companyForm.phone.trim();

    const fail = (text: string) => setCompanyFormMessage({ type: "error", text });

    if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(id)) {
      return fail("Korxona ID 3–40 ta kichik lotin harfi, raqam yoki tire bo'lishi kerak.");
    }
    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) {
      return fail("Login 3–40 ta kichik lotin harfi, raqam yoki . _ - belgilaridan iborat bo'lishi kerak.");
    }
    if (id.length + username.length > 59) {
      return fail("Korxona ID va login uzunligi birgalikda 59 belgidan oshmasligi kerak.");
    }
    if (!name) return fail("Korxona nomini kiriting.");
    if (companyForm.password.length < 6) {
      return fail("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
    }

    setCompanyFormLoading(true);
    setCompanyFormMessage(null);

    let secondaryApp: ReturnType<typeof initializeApp> | undefined;
    let createdUser: UserCredential | undefined;
    let companySaved = false;

    try {
      const companyRef = doc(db, "companies", id);
      if ((await getDoc(companyRef)).exists()) {
        return fail("Bu korxona ID allaqachon ishlatilgan.");
      }

      const authEmail = companyAuthEmail(id, username);
      secondaryApp = initializeApp(firebaseConfig, `company-${Date.now()}`);
      createdUser = await createUserWithEmailAndPassword(
        getAuth(secondaryApp),
        authEmail,
        companyForm.password
      );

      const endsAt = addMonths(new Date(), 1);
      const batch = writeBatch(db);

      batch.set(companyRef, {
        name,
        ownerName: ownerName || name,
        phone,
        username,
        ownerUid: createdUser.user.uid,
        subscriptionStatus: "trial",
        subscriptionType: "trial",
        plan: "Basic",
        totalPaid: 0,
        subscriptionEndsAt: Timestamp.fromDate(endsAt),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });
      batch.set(doc(db, "companies", id, "users", createdUser.user.uid), {
        firstName: ownerName || name,
        lastName: "",
        fullName: ownerName || name,
        phone,
        username,
        email: authEmail,
        role: "Admin",
        companyId: id,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, "companies", id, "subscriptions")), {
        plan: "Basic",
        startDate: Timestamp.fromDate(new Date()),
        endDate: Timestamp.fromDate(endsAt),
        status: "trial",
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      await batch.commit();
      companySaved = true;

      setCompanyForm({
        name: "",
        ownerName: "",
        phone: "",
        companyId: "",
        username: "",
        password: "",
      });
      setCompanyFormMessage({
        type: "success",
        text: `Korxona saqlandi. Login: ${authEmail}`,
      });
    } catch (error) {
      console.error("Company creation failed:", error);
      if (createdUser?.user && !companySaved) {
        try {
          await deleteUser(createdUser.user);
        } catch (cleanupError) {
          console.error("Orphaned auth account cleanup failed:", cleanupError);
        }
      }
      setCompanyFormMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Korxonani yaratishda xatolik.",
      });
    } finally {
      if (secondaryApp) {
        try {
          await signOut(getAuth(secondaryApp));
          await deleteApp(secondaryApp);
        } catch (cleanupError) {
          console.error("Temp app cleanup failed:", cleanupError);
        }
      }
      setCompanyFormLoading(false);
    }
  }

  /* ---------- CSV ---------- */

  function exportCSV() {
    const headers = [
      "Korxona",
      "Egasi",
      "Telefon",
      "Tarif",
      "Holat",
      "Ro'yxatdan o'tgan",
      "Obuna tugashi",
      "Jami to'lov",
    ];
    const rows = filteredCompanies.map((c) => [
      c.name,
      c.owner_name,
      c.phone,
      c.plan,
      statusText(c.status),
      dateFormat(c.created_at),
      dateFormat(c.expires_at),
      c.total_paid,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "omborchi-korxonalar.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  /* ---------- Yuklanish holati ---------- */

  if (isUserLoading || !user || !founderAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className={dark ? "dark min-h-screen bg-[#0b0f19] text-white" : "min-h-screen bg-slate-50 text-slate-900"}>
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-[#0b0f19]/90">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Building2 size={23} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-xs text-slate-500">SaaS boshqaruv paneli</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className="rounded-xl border border-slate-200 p-2.5 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <div className="hidden items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 md:flex dark:border-slate-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                SA
              </div>
              <div>
                <p className="text-sm font-semibold">Super Admin</p>
                <p className="text-[11px] text-slate-500">Tizim egasi</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-8">
        {loading && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
            Firestore ma'lumotlari yuklanmoqda...
          </div>
        )}
        {loadError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {loadError}
          </div>
        )}
        {actionError && (
          <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {actionError}
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold">Umumiy ko'rinish</h2>
          <p className="mt-1 text-sm text-slate-500">SaaS tizimingizdagi asosiy ko'rsatkichlar</p>
        </div>

        {/* YANGI KORXONA */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-bold">Yangi korxona qo'shish</h3>
              <p className="text-sm text-slate-500">Bu yerda korxona uchun avtomatik login va parol yaratiladi.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Plus size={15} />
              <span>Admin login yaratish</span>
            </div>
          </div>

          <form onSubmit={createCompanyAccount} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Korxona nomi</label>
              <input
                value={companyForm.name}
                onChange={(e) => setCompanyForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Masalan: Oqila Tech"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Egasi</label>
              <input
                value={companyForm.ownerName}
                onChange={(e) => setCompanyForm((p) => ({ ...p, ownerName: e.target.value }))}
                placeholder="Mas'ul shaxs"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Telefon</label>
              <input
                type="tel"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+998 90 123 45 67"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Korxona ID</label>
              <input
                value={companyForm.companyId}
                onChange={(e) => setCompanyForm((p) => ({ ...p, companyId: e.target.value }))}
                placeholder="oqila-tech"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Login</label>
              <input
                value={companyForm.username}
                onChange={(e) => setCompanyForm((p) => ({ ...p, username: e.target.value }))}
                placeholder="admin"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Parol</label>
              <input
                type="password"
                value={companyForm.password}
                onChange={(e) => setCompanyForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                required
                minLength={6}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={companyFormLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {companyFormLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {companyFormLoading ? "Yaratilmoqda..." : "Yaratish"}
              </button>
            </div>
          </form>

          {companyFormMessage && (
            <div
              className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
                companyFormMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"
              }`}
            >
              {companyFormMessage.text}
            </div>
          )}
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <StatCard title="Jami korxonalar" value={totalCompanies} icon={<Building2 size={21} />} />
          <StatCard title="Faol" value={activeCompanies} icon={<CheckCircle2 size={21} />} green />
          <StatCard title="To'xtatilgan" value={suspendedCompanies} icon={<XCircle size={21} />} red />
          <StatCard title="Trial" value={trialCompanies} icon={<Clock3 size={21} />} yellow />
          <StatCard title="Jami daromad" value={money(totalIncome)} icon={<CreditCard size={21} />} blue />
          <StatCard title="Korxonalar soni" value={totalCompanies} icon={<TrendingUp size={21} />} />
        </div>

        {/* TABLE */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h3 className="font-bold">Korxonalar</h3>
                <p className="text-xs text-slate-500">Tizimdan foydalanayotgan barcha tashkilotlar</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Qidirish..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 md:w-64 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <Filter size={16} />
                  Filtr
                </button>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  <Download size={16} />
                  CSV
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 md:grid-cols-3 dark:border-slate-800">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as "all" | CompanyStatus);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="all">Barcha holatlar</option>
                  <option value="active">Faol</option>
                  <option value="suspended">To'xtatilgan</option>
                  <option value="trial">Trial</option>
                </select>
                <select
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="all">Barcha tariflar</option>
                  <option value="Basic">Basic</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="newest">Eng yangi</option>
                  <option value="oldest">Eng eski</option>
                  <option value="income-high">Daromad: yuqori</option>
                  <option value="income-low">Daromad: past</option>
                </select>
              </div>
            )}
          </div>

          {/* DESKTOP */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="px-5 py-4">Korxona</th>
                  <th className="px-5 py-4">Egasi / Telefon</th>
                  <th className="px-5 py-4">Tarif</th>
                  <th className="px-5 py-4">Holati</th>
                  <th className="px-5 py-4">Ro'yxatdan o'tgan</th>
                  <th className="px-5 py-4">Obuna tugashi</th>
                  <th className="px-5 py-4">Jami to'lov</th>
                  <th className="px-5 py-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {currentCompanies.map((company) => (
                  <tr key={company.id} className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                          {company.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold">{company.name}</p>
                          <p className="text-xs text-slate-500">ID: #{company.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium">{company.owner_name}</p>
                      <p className="text-xs text-slate-500">{company.phone}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold dark:bg-slate-800">
                        {company.plan}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(company.status)}`}>
                        {statusText(company.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{dateFormat(company.created_at)}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{dateFormat(company.expires_at)}</td>
                    <td className="px-5 py-4 text-sm font-bold">{money(company.total_paid)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        {company.status === "suspended" ? (
                          <button
                            disabled={actionLoading}
                            title="Faollashtirish"
                            onClick={() => changeStatus(company, "active")}
                            className="rounded-lg p-2 text-emerald-500 hover:bg-emerald-50 disabled:opacity-40 dark:hover:bg-emerald-500/10"
                          >
                            <Play size={17} />
                          </button>
                        ) : (
                          <button
                            disabled={actionLoading}
                            title="To'xtatish"
                            onClick={() => changeStatus(company, "suspended")}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-500/10"
                          >
                            <Ban size={17} />
                          </button>
                        )}
                        <button
                          title="Batafsil"
                          onClick={() => openCompany(company.id)}
                          className="rounded-lg p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                        >
                          <Eye size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE */}
          <div className="divide-y divide-slate-200 lg:hidden dark:divide-slate-800">
            {currentCompanies.map((company) => (
              <div key={company.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      {company.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{company.name}</p>
                      <p className="text-xs text-slate-500">{company.owner_name}</p>
                      <p className="text-xs text-slate-500">{company.phone}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(company.status)}`}>
                    {statusText(company.status)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-slate-500">Tarif</p><p className="font-semibold">{company.plan}</p></div>
                  <div><p className="text-slate-500">Jami to'lov</p><p className="font-semibold">{money(company.total_paid)}</p></div>
                  <div><p className="text-slate-500">Ro'yxatdan o'tgan</p><p className="font-semibold">{dateFormat(company.created_at)}</p></div>
                  <div><p className="text-slate-500">Obuna</p><p className="font-semibold">{dateFormat(company.expires_at)}</p></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openCompany(company.id)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-sm font-medium dark:border-slate-700"
                  >
                    <Eye size={16} />
                    Batafsil
                  </button>
                  {company.status === "suspended" ? (
                    <button
                      disabled={actionLoading}
                      onClick={() => changeStatus(company, "active")}
                      className="rounded-xl bg-emerald-50 px-4 py-2 text-emerald-600 disabled:opacity-40 dark:bg-emerald-500/10"
                    >
                      <Play size={17} />
                    </button>
                  ) : (
                    <button
                      disabled={actionLoading}
                      onClick={() => changeStatus(company, "suspended")}
                      className="rounded-xl bg-red-50 px-4 py-2 text-red-600 disabled:opacity-40 dark:bg-red-500/10"
                    >
                      <Ban size={17} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 p-4 sm:flex-row dark:border-slate-800">
            <p className="text-xs text-slate-500">{filteredCompanies.length} ta korxona ko'rsatilyapti</p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"
              >
                <ChevronLeft size={17} />
              </button>
              <span className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-bold">{selectedCompany.name}</h2>
                <p className="text-xs text-slate-500">Korxona #{selectedCompany.id}</p>
              </div>
              <button onClick={closeModal} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InfoItem icon={<Building2 size={17} />} label="Korxona" value={selectedCompany.name} />
                <InfoItem icon={<Users size={17} />} label="Egasi" value={selectedCompany.owner_name} />
                <InfoItem icon={<Phone size={17} />} label="Telefon" value={selectedCompany.phone} />
                <InfoItem icon={<CreditCard size={17} />} label="Tarif" value={selectedCompany.plan} />
                <InfoItem icon={<CalendarDays size={17} />} label="Ro'yxatdan o'tgan" value={dateFormat(selectedCompany.created_at)} />
                <InfoItem icon={<CalendarDays size={17} />} label="Obuna tugashi" value={dateFormat(selectedCompany.expires_at)} />
                <InfoItem icon={<Users size={17} />} label="Foydalanuvchilar" value={detailsLoading ? "..." : `${details?.usersCount ?? 0} ta`} />
                <InfoItem icon={<Wallet size={17} />} label="Jami to'lov" value={money(selectedCompany.total_paid)} />
              </div>

              {/* HOLAT */}
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Korxona holati</p>
                    <p className="text-xs text-slate-500">Korxonaning tizimga kirish holatini boshqaring</p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(selectedCompany.status)}`}>
                    {statusText(selectedCompany.status)}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  {selectedCompany.status === "suspended" ? (
                    <button
                      disabled={actionLoading}
                      onClick={() => changeStatus(selectedCompany, "active")}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Play size={16} />
                      Faollashtirish
                    </button>
                  ) : (
                    <button
                      disabled={actionLoading}
                      onClick={() => changeStatus(selectedCompany, "suspended")}
                      className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <Ban size={16} />
                      To'xtatish
                    </button>
                  )}
                </div>
              </div>

              {/* TO'LOVLAR */}
              <div>
                <h3 className="mb-3 font-bold">To'lovlar tarixi</h3>
                <form
                  onSubmit={recordPayment}
                  className="mb-4 grid gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="To'lov summasi"
                    aria-label="To'lov summasi"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                    required
                  />
                  <input
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder="To'lov usuli"
                    aria-label="To'lov usuli"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                    required
                  />
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Saqlash
                  </button>
                </form>

                {detailsLoading ? (
                  <div className="p-6 text-center text-sm text-slate-500">Yuklanmoqda...</div>
                ) : !details || details.payments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
                    To'lovlar mavjud emas
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    {details.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between border-b border-slate-200 p-4 last:border-0 dark:border-slate-800">
                        <div>
                          <p className="font-semibold">{money(p.amount)}</p>
                          <p className="text-xs text-slate-500">{dateFormat(p.paid_at)}</p>
                        </div>
                        <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-slate-800">{p.method}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* OBUNA TARIXI */}
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-bold">Obuna tarixi</h3>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={extendSubscription}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Bir oyga uzaytirish
                  </button>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  {!details || details.subscriptions.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">Obuna tarixi mavjud emas.</p>
                  ) : (
                    details.subscriptions.map((s) => (
                      <div key={s.id} className="grid grid-cols-1 gap-3 border-b border-slate-200 p-4 last:border-0 md:grid-cols-4 dark:border-slate-800">
                        <div><p className="text-xs text-slate-500">Tarif</p><p className="font-semibold">{s.plan}</p></div>
                        <div><p className="text-xs text-slate-500">Boshlanish</p><p className="font-medium">{dateFormat(s.start_date)}</p></div>
                        <div><p className="text-xs text-slate-500">Tugash</p><p className="font-medium">{dateFormat(s.end_date)}</p></div>
                        <div><p className="text-xs text-slate-500">Holat</p><p className="font-medium">{s.status}</p></div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {detailMessage && (
                <p role="status" className="rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
                  {detailMessage}
                </p>
              )}

              <button
                onClick={closeModal}
                className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function StatCard({
  title,
  value,
  icon,
  green,
  red,
  yellow,
  blue,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  green?: boolean;
  red?: boolean;
  yellow?: boolean;
  blue?: boolean;
}) {
  let iconClass = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  if (green) iconClass = "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
  if (red) iconClass = "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400";
  if (yellow) iconClass = "bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400";
  if (blue) iconClass = "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>{icon}</div>
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className="mt-1 break-words text-xl font-bold">{value}</p>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="font-semibold">{value}</p>
    </div>
  );
}