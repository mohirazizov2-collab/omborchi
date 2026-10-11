"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock3,
  Wallet,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Download,
  Moon,
  Sun,
  MoreHorizontal,
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
  RefreshCw,
  Plus,
  Loader2,
} from "lucide-react";

import { initializeApp, deleteApp } from "firebase/app";
import { createUserWithEmailAndPassword, deleteUser, getAuth, signOut, type UserCredential } from "firebase/auth";
import { addMonths } from "date-fns";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { firebaseConfig } from "@/firebase/config";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { companyAuthEmail, isFounder } from "@/lib/tenancy";
import { onSnapshot } from "firebase/firestore";

/* =========================================================
   TYPES
========================================================= */

type CompanyStatus = "active" | "suspended" | "trial";

type Plan = {
  id: number;
  name: string;
  price: number;
  duration_days: number;
};

type Payment = {
  id: number;
  amount: number;
  paid_at: string;
  method: string;
};

type Subscription = {
  id: number;
  plan: string;
  start_date: string;
  end_date: string;
  status: string;
};

type Company = {
  id: string;
  firestore_id: string;
  name: string;
  owner_name: string;
  phone: string;
  status: CompanyStatus;
  plan: string;
  plan_price: number;
  created_at: string;
  expires_at: string;
  total_paid: number;
  users_count: number;
  payments: Payment[];
  subscriptions: Subscription[];
};

/* =========================================================
   DEMO DATA
   Backend ulanganda shu massiv API dan keladi.
========================================================= */

const initialCompanies: Company[] = [];

/* =========================================================
   HELPERS
========================================================= */

function money(value: number) {
  return new Intl.NumberFormat("uz-UZ").format(value) + " so'm";
}

function dateFormat(value: string) {
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

/* =========================================================
   FIRESTORE
========================================================= */

function normalizeFirestoreDate(
  value: unknown,
  fallback = new Date().toISOString()
): string {
  if (!value) return fallback;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value.toISOString();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const parsed = (value as { toDate: () => Date }).toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime())
      ? parsed.toISOString()
      : fallback;
  }

  return fallback;
}

async function loadCompaniesFromFirestore(): Promise<Company[]> {
  const snapshot = await getDocs(collection(db, "companies"));

  const companies = await Promise.all(
    snapshot.docs.map(async (companyDoc) => {
      const data = companyDoc.data();

      const usersSnapshot = await getDocs(
        collection(db, "companies", companyDoc.id, "users")
      );

      // These collections are optional. A company does not need to have
      // payment/subscription subcollections for the admin panel to work.
      const paymentsSnapshot = await getDocs(
        collection(db, "companies", companyDoc.id, "payments")
      );

      const subscriptionsSnapshot = await getDocs(
        collection(db, "companies", companyDoc.id, "subscriptions")
      );

      const createdAt = normalizeFirestoreDate(
        data.createdAt ?? data.created_at
      );

      const expiresAt = normalizeFirestoreDate(
        data.subscriptionEndsAt ??
          data.subscriptionEnd ??
          data.subscription_end ??
          data.expiresAt ??
          data.expires_at,
        createdAt
      );

      const ownerUid = String(data.ownerUid ?? "");

      const ownerUser = ownerUid
        ? usersSnapshot.docs.find((userDoc) => userDoc.id === ownerUid)?.data()
        : undefined;

      const payments: Payment[] = paymentsSnapshot.docs.map(
        (paymentDoc, paymentIndex) => {
          const payment = paymentDoc.data();

          return {
            id: paymentIndex + 1,
            amount: Number(
              payment.amount ??
                payment.price ??
                payment.total ??
                0
            ),
            paid_at: normalizeFirestoreDate(
              payment.paid_at ??
                payment.paidAt ??
                payment.created_at ??
                payment.createdAt,
              createdAt
            ),
            method:
              String(
                payment.method ??
                  payment.payment_method ??
                  payment.paymentMethod ??
                  "Noma'lum"
              ),
          };
        }
      );

      const subscriptions: Subscription[] =
        subscriptionsSnapshot.docs.map(
          (subscriptionDoc, subscriptionIndex) => {
            const subscription = subscriptionDoc.data();

            return {
              id: subscriptionIndex + 1,
              plan:
                String(
                  subscription.plan ??
                    subscription.plan_name ??
                    data.plan ??
                    data.subscriptionPlan ??
                    (data.subscriptionType === "trial"
                      ? "Trial"
                      : "Paid")
                ),
              start_date: normalizeFirestoreDate(
                subscription.start_date ??
                  subscription.startDate ??
                  subscription.createdAt ??
                  data.createdAt,
                createdAt
              ),
              end_date: normalizeFirestoreDate(
                subscription.end_date ??
                  subscription.endDate ??
                  subscription.expiresAt ??
                  data.subscriptionEndsAt,
                expiresAt
              ),
              status: String(
                subscription.status ??
                  data.subscriptionStatus ??
                  "active"
              ),
            };
          }
        );

      const rawSubscriptionStatus = String(
        data.subscriptionStatus ??
          data.subscription_status ??
          data.status ??
          "active"
      ).toLowerCase();

      const rawSubscriptionType = String(
        data.subscriptionType ??
          data.subscription_type ??
          ""
      ).toLowerCase();

      let status: CompanyStatus = "active";

      if (
        rawSubscriptionStatus === "suspended" ||
        rawSubscriptionStatus === "blocked" ||
        rawSubscriptionStatus === "inactive"
      ) {
        status = "suspended";
      } else if (
        rawSubscriptionType === "trial" ||
        rawSubscriptionStatus === "trial" ||
        rawSubscriptionStatus === "trialing"
      ) {
        status = "trial";
      }

      const totalPaid = payments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );

      const ownerName = String(
        ownerUser?.fullName ??
          [ownerUser?.firstName, ownerUser?.lastName]
            .filter(Boolean)
            .join(" ") ??
          data.owner_name ??
          data.ownerName ??
          data.owner ??
          "—"
      ).trim() || "—";

      const plan =
        String(
          data.plan ??
            data.plan_name ??
            data.subscription_plan ??
            data.subscriptionPlan ??
            (rawSubscriptionType === "trial" ? "Trial" : "Paid")
        );

      const planPrice = Number(
        data.plan_price ??
          data.planPrice ??
          data.subscription_price ??
          data.subscriptionPrice ??
          0
      );

      return {
        id: companyDoc.id,
        firestore_id: companyDoc.id,
        name: String(
          data.name ??
            data.companyName ??
            data.company_name ??
            companyDoc.id
        ),
        owner_name: ownerName,
        phone: String(
          data.phone ??
            data.phoneNumber ??
            data.telephone ??
            ownerUser?.phone ??
            "—"
        ),
        status,
        plan,
        plan_price: planPrice,
        created_at: createdAt,
        expires_at: expiresAt,
        total_paid: Number(
          data.total_paid ??
            data.totalPaid ??
            totalPaid
        ),
        users_count: usersSnapshot.size,
        payments,
        subscriptions,
      };
    })
  );

  return companies;
}

/* =========================================================
   PAGE
========================================================= */

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const founderAccess = isFounder(user?.email);

  const [companies, setCompanies] =
    useState<Company[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [dark, setDark] = useState(false);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<"all" | CompanyStatus>("all");

  const [planFilter, setPlanFilter] = useState("all");

  const [sort, setSort] = useState<
    "newest" | "oldest" | "income-high" | "income-low"
  >("newest");

  const [page, setPage] = useState(1);

  const [selectedCompany, setSelectedCompany] =
    useState<Company | null>(null);

  const [showFilters, setShowFilters] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    companyId: "",
    username: "",
    password: "",
  });
  const [companyFormLoading, setCompanyFormLoading] = useState(false);
  const [companyFormMessage, setCompanyFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const pageSize = 5;

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!founderAccess) {
      router.replace("/");
    }
  }, [founderAccess, isUserLoading, router, user]);

  useEffect(() => {
    if (isUserLoading || !user || !founderAccess) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let latestLoad = 0;

    const load = async () => {
      const loadId = ++latestLoad;
      try {
        setLoading(true);
        setLoadError("");

        const data = await loadCompaniesFromFirestore();

        if (!cancelled && loadId === latestLoad) {
          setCompanies(data);
        }
      } catch (error) {
        console.error("Admin panel Firestore error:", error);

        if (!cancelled && loadId === latestLoad) {
          setLoadError(
            "Ma'lumotlarni Firestore'dan yuklashda xatolik yuz berdi."
          );
        }
      } finally {
        if (!cancelled && loadId === latestLoad) {
          setLoading(false);
        }
      }
    };

    const unsubscribe = onSnapshot(
      collection(db, "companies"),
      () => {
        void load();
      },
      (error) => {
        console.error("Admin panel company listener failed:", error);
        setLoadError(
          "Kompaniyalar Firestore'dan kuzatilmayapti. Ruxsatlarni tekshiring."
        );
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [founderAccess, isUserLoading, user]);

  /* =====================================================
     STATISTICS
  ===================================================== */

  const totalCompanies = companies.length;

  const activeCompanies = companies.filter(
    (c) => c.status === "active"
  ).length;

  const suspendedCompanies = companies.filter(
    (c) => c.status === "suspended"
  ).length;

  const trialCompanies = companies.filter(
    (c) => c.status === "trial"
  ).length;

  const monthlyIncome = companies.reduce(
    (sum, company) => {
      const currentMonth = new Date().getMonth();

      return (
        sum +
        company.payments
          .filter(
            (payment) =>
              new Date(payment.paid_at).getMonth() === currentMonth
          )
          .reduce((s, p) => s + p.amount, 0)
      );
    },
    0
  );

  const totalIncome = companies.reduce(
    (sum, company) => sum + company.total_paid,
    0
  );

  const currentMonth = new Date();
  const currentMonthRevenue = companies.reduce(
    (sum, company) =>
      sum +
      company.payments
        .filter((payment) => {
          const date = new Date(payment.paid_at);
          return (
            date.getFullYear() === currentMonth.getFullYear() &&
            date.getMonth() === currentMonth.getMonth()
          );
        })
        .reduce((paymentSum, payment) => paymentSum + payment.amount, 0),
    0
  );

  const previousMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() - 1,
    1
  );

  const previousMonthRevenue = companies.reduce(
    (sum, company) =>
      sum +
      company.payments
        .filter((payment) => {
          const date = new Date(payment.paid_at);
          return (
            date.getFullYear() === previousMonth.getFullYear() &&
            date.getMonth() === previousMonth.getMonth()
          );
        })
        .reduce((paymentSum, payment) => paymentSum + payment.amount, 0),
    0
  );

  const growth =
    previousMonthRevenue > 0
      ? ((currentMonthRevenue - previousMonthRevenue) /
          previousMonthRevenue) *
        100
      : currentMonthRevenue > 0
        ? 100
        : 0;

  const revenueChartData = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 12 }, (_, index) => {
      const monthDate = new Date(
        now.getFullYear(),
        now.getMonth() - (11 - index),
        1
      );

      const value = companies.reduce(
        (sum, company) =>
          sum +
          company.payments
            .filter((payment) => {
              const date = new Date(payment.paid_at);
              return (
                date.getFullYear() === monthDate.getFullYear() &&
                date.getMonth() === monthDate.getMonth()
              );
            })
            .reduce(
              (paymentSum, payment) => paymentSum + payment.amount,
              0
            ),
        0
      );

      return {
        label: monthDate.toLocaleDateString("uz-UZ", {
          month: "short",
        }),
        value,
      };
    });
  }, [companies]);

  const newCompaniesChartData = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 12 }, (_, index) => {
      const monthDate = new Date(
        now.getFullYear(),
        now.getMonth() - (11 - index),
        1
      );

      const value = companies.filter((company) => {
        const date = new Date(company.created_at);

        return (
          date.getFullYear() === monthDate.getFullYear() &&
          date.getMonth() === monthDate.getMonth()
        );
      }).length;

      return {
        label: monthDate.toLocaleDateString("uz-UZ", {
          month: "short",
        }),
        value,
      };
    });
  }, [companies]);

  /* =====================================================
     FILTER
  ===================================================== */

  const filteredCompanies = useMemo(() => {
    let result = [...companies];

    if (search.trim()) {
      const searchTerm = search.toLowerCase();

      result = result.filter(
        (company) =>
          company.name.toLowerCase().includes(searchTerm) ||
          company.owner_name.toLowerCase().includes(searchTerm) ||
          company.phone.toLowerCase().includes(searchTerm)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(
        (company) => company.status === statusFilter
      );
    }

    if (planFilter !== "all") {
      result = result.filter(
        (company) => company.plan === planFilter
      );
    }

    result.sort((a, b) => {
      if (sort === "newest") {
        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
      }

      if (sort === "oldest") {
        return (
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
        );
      }

      if (sort === "income-high") {
        return b.total_paid - a.total_paid;
      }

      return a.total_paid - b.total_paid;
    });

    return result;
  }, [companies, search, statusFilter, planFilter, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCompanies.length / pageSize)
  );

  const currentCompanies = filteredCompanies.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  /* =====================================================
     COMPANY ACTIONS
  ===================================================== */

  async function changeStatus(id: string, newStatus: CompanyStatus) {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "companies", id), {
        subscriptionStatus: newStatus,
      });
      setSelectedCompany((old) =>
        old && old.id === id ? { ...old, status: newStatus } : old
      );
    } catch (err) {
      console.error("Holatni yangilashda xato:", err);
      alert("Holatni saqlab bo'lmadi. Ruxsatni tekshiring.");
    } finally {
      setActionLoading(false);
    }
  }

  async function createCompanyAccount(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!user || !founderAccess) return;

    const normalizedId = companyForm.companyId.trim().toLowerCase();
    const normalizedUsername = companyForm.username.trim().toLowerCase();
    const normalizedName = companyForm.name.trim();

    if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(normalizedId)) {
      setCompanyFormMessage({
        type: "error",
        text: "Korxona ID 3–40 ta kichik lotin harfi, raqam yoki tire bo‘lishi kerak.",
      });
      return;
    }

    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(normalizedUsername)) {
      setCompanyFormMessage({
        type: "error",
        text: "Login 3–40 ta kichik lotin harfi, raqam yoki . _ - belgilaridan iborat bo‘lishi kerak.",
      });
      return;
    }

    if (normalizedId.length + normalizedUsername.length > 59) {
      setCompanyFormMessage({
        type: "error",
        text: "Korxona ID va login uzunligi birgalikda 59 belgidan oshmasligi kerak.",
      });
      return;
    }

    if (!normalizedName) {
      setCompanyFormMessage({
        type: "error",
        text: "Korxona nomini kiriting.",
      });
      return;
    }

    if (companyForm.password.length < 6) {
      setCompanyFormMessage({
        type: "error",
        text: "Parol kamida 6 ta belgidan iborat bo‘lishi kerak.",
      });
      return;
    }

    setCompanyFormLoading(true);
    setCompanyFormMessage(null);

    let secondaryApp: ReturnType<typeof initializeApp> | undefined;
    let createdUser: UserCredential | undefined;

    try {
      const companyRef = doc(db, "companies", normalizedId);
      const existingCompany = await getDoc(companyRef);

      if (existingCompany.exists()) {
        setCompanyFormMessage({
          type: "error",
          text: "Bu korxona ID allaqachon ishlatilgan.",
        });
        return;
      }

      const authEmail = companyAuthEmail(normalizedId, normalizedUsername);
      secondaryApp = initializeApp(firebaseConfig, `company-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      createdUser = await createUserWithEmailAndPassword(
        secondaryAuth,
        authEmail,
        companyForm.password
      );

      const endsAt = addMonths(new Date(), 1);
      const userRef = doc(
        db,
        "companies",
        normalizedId,
        "users",
        createdUser.user.uid
      );

      const batch = writeBatch(db);
      batch.set(companyRef, {
        name: normalizedName,
        username: normalizedUsername,
        ownerUid: createdUser.user.uid,
        subscriptionStatus: "active",
        subscriptionType: "trial",
        subscriptionEndsAt: Timestamp.fromDate(endsAt),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });
      batch.set(userRef, {
        firstName: normalizedName,
        lastName: "",
        fullName: normalizedName,
        username: normalizedUsername,
        email: authEmail,
        role: "Admin",
        companyId: normalizedId,
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      const refreshedCompanies = await loadCompaniesFromFirestore();
      setCompanies(refreshedCompanies);
      setCompanyForm({ name: "", companyId: "", username: "", password: "" });
      setCompanyFormMessage({
        type: "success",
        text: `Korxona yaratildi. Login: ${authEmail}`,
      });
    } catch (error) {
      console.error("Company creation failed:", error);
      if (createdUser?.user) {
        try {
          await deleteUser(createdUser.user);
        } catch (cleanupError) {
          console.error("Failed to remove orphaned auth account:", cleanupError);
        }
      }
      setCompanyFormMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Korxonani yaratishda xatolik yuz berdi.",
      });
    } finally {
      if (secondaryApp) {
        try {
          await signOut(getAuth(secondaryApp));
        } catch (cleanupError) {
          console.error("Failed to sign out temp company account:", cleanupError);
        }
        try {
          await deleteApp(secondaryApp);
        } catch (cleanupError) {
          console.error("Failed to delete temp Firebase app:", cleanupError);
        }
      }
      setCompanyFormLoading(false);
    }
  }

  /* =====================================================
     CSV EXPORT
  ===================================================== */

  function exportCSV() {
    const headers = [
      "Korxona",
      "Egasi",
      "Telefon",
      "Tarif",
      "Holat",
      "Royxatdan o'tgan",
      "Obuna tugashi",
      "Jami to'lov",
    ];

    const rows = filteredCompanies.map((company) => [
      company.name,
      company.owner_name,
      company.phone,
      company.plan,
      statusText(company.status),
      company.created_at,
      company.expires_at,
      company.total_paid,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "omborchi-korxonalar.csv";

    link.click();

    URL.revokeObjectURL(url);
  }

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
    <div
      className={
        dark
          ? "dark min-h-screen bg-[#0b0f19] text-white"
          : "min-h-screen bg-slate-50 text-slate-900"
      }
    >
      <div className="min-h-screen">
        {/* ===============================================
            HEADER
        =============================================== */}

        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-[#0b0f19]/90">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 md:px-8">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Building2 size={23} />
                </div>

                <div>
                  <h1 className="text-xl font-bold">
                    Admin Dashboard
                  </h1>

                  <p className="text-xs text-slate-500">
                    SaaS boshqaruv paneli
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDark(!dark)}
                className="rounded-xl border border-slate-200 p-2.5 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                {dark ? (
                  <Sun size={19} />
                ) : (
                  <Moon size={19} />
                )}
              </button>

              <div className="hidden items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 md:flex dark:border-slate-700">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  SA
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Super Admin
                  </p>

                  <p className="text-[11px] text-slate-500">
                    Tizim egasi
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ===============================================
            MAIN
        =============================================== */}

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

          {/* TITLE */}

          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              Umumiy ko'rinish
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              SaaS tizimingizdagi asosiy ko'rsatkichlar
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-lg font-bold">Yangi korxona qo&apos;shish</h3>
                <p className="text-sm text-slate-500">
                  Bu yerda korxona uchun avtomatik login va parol yaratiladi.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Plus size={15} />
                <span>Admin login yaratish</span>
              </div>
            </div>

            <form onSubmit={createCompanyAccount} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2 xl:col-span-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Korxona nomi</label>
                <input
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Masalan: Oqila Tech"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Korxona ID</label>
                <input
                  value={companyForm.companyId}
                  onChange={(e) => setCompanyForm((prev) => ({ ...prev, companyId: e.target.value }))}
                  placeholder="oqila-tech"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Login</label>
                <input
                  value={companyForm.username}
                  onChange={(e) => setCompanyForm((prev) => ({ ...prev, username: e.target.value }))}
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
                  onChange={(e) => setCompanyForm((prev) => ({ ...prev, password: e.target.value }))}
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

          {/* =============================================
              STAT CARDS
          ============================================= */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <StatCard
              title="Jami korxonalar"
              value={totalCompanies}
              icon={<Building2 size={21} />}
            />

            <StatCard
              title="Faol"
              value={activeCompanies}
              icon={<CheckCircle2 size={21} />}
              green
            />

            <StatCard
              title="To'xtatilgan"
              value={suspendedCompanies}
              icon={<XCircle size={21} />}
              red
            />

            <StatCard
              title="Trial"
              value={trialCompanies}
              icon={<Clock3 size={21} />}
              yellow
            />

            <StatCard
              title="Bu oy daromad"
              value={money(monthlyIncome)}
              icon={<Wallet size={21} />}
              blue
            />

            <StatCard
              title="Jami daromad"
              value={money(totalIncome)}
              icon={<CreditCard size={21} />}
              blue
            />

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <TrendingUp size={21} />
              </div>

              <p className="text-xs font-medium text-slate-500">
                O'sish
              </p>

              <div className="mt-1 flex items-center gap-1">
                <span className="text-2xl font-bold text-emerald-600">
                  ↑ {growth}%
                </span>
              </div>

              <p className="mt-1 text-[11px] text-slate-400">
                oldingi oyga nisbatan
              </p>
            </div>
          </div>

          {/* =============================================
              CHARTS
          ============================================= */}

          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
            {/* Revenue chart */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="font-bold">
                    Oylik daromad dinamikasi
                  </h3>

                  <p className="text-xs text-slate-500">
                    Oxirgi 12 oy
                  </p>
                </div>

                <TrendingUp
                  size={20}
                  className="text-emerald-500"
                />
              </div>

              <RevenueChart data={revenueChartData} />
            </div>

            {/* Donut */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold">
                Korxonalar holati
              </h3>

              <p className="text-xs text-slate-500">
                Faol / to'xtatilgan / trial
              </p>

              <div className="mt-6 flex items-center justify-center">
                <DonutChart
                  active={activeCompanies}
                  suspended={suspendedCompanies}
                  trial={trialCompanies}
                />
              </div>

              <div className="mt-6 space-y-3">
                <Legend
                  label="Faol"
                  value={activeCompanies}
                  className="bg-emerald-500"
                />

                <Legend
                  label="To'xtatilgan"
                  value={suspendedCompanies}
                  className="bg-red-500"
                />

                <Legend
                  label="Trial"
                  value={trialCompanies}
                  className="bg-yellow-500"
                />
              </div>
            </div>
          </div>

          {/* =============================================
              NEW COMPANIES
          ============================================= */}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-bold">
              Yangi qo'shilgan korxonalar
            </h3>

            <p className="text-xs text-slate-500">
              Oylar bo'yicha
            </p>

            <NewCompaniesChart data={newCompaniesChartData} />
          </div>

          {/* =============================================
              COMPANY TABLE
          ============================================= */}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* TABLE HEADER */}

            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h3 className="font-bold">
                    Korxonalar
                  </h3>

                  <p className="text-xs text-slate-500">
                    Tizimdan foydalanayotgan barcha tashkilotlar
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

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
                    onClick={() =>
                      setShowFilters(!showFilters)
                    }
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

              {/* FILTERS */}

              {showFilters && (
                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 md:grid-cols-3 dark:border-slate-800">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(
                        e.target.value as
                          | "all"
                          | CompanyStatus
                      );
                      setPage(1);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="all">
                      Barcha holatlar
                    </option>
                    <option value="active">Faol</option>
                    <option value="suspended">
                      To'xtatilgan
                    </option>
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
                    <option value="all">
                      Barcha tariflar
                    </option>
                    <option value="Trial">Trial</option>
                    <option value="Paid">Paid</option>
                  </select>

                  <select
                    value={sort}
                    onChange={(e) =>
                      setSort(
                        e.target.value as
                          | "newest"
                          | "oldest"
                          | "income-high"
                          | "income-low"
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="newest">
                      Eng yangi
                    </option>
                    <option value="oldest">
                      Eng eski
                    </option>
                    <option value="income-high">
                      Daromad: yuqori
                    </option>
                    <option value="income-low">
                      Daromad: past
                    </option>
                  </select>
                </div>
              )}
            </div>

            {/* DESKTOP TABLE */}

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="px-5 py-4">
                      Korxona
                    </th>

                    <th className="px-5 py-4">
                      Egasi / Telefon
                    </th>

                    <th className="px-5 py-4">
                      Tarif
                    </th>

                    <th className="px-5 py-4">
                      Holati
                    </th>

                    <th className="px-5 py-4">
                      Ro'yxatdan o'tgan
                    </th>

                    <th className="px-5 py-4">
                      Obuna tugashi
                    </th>

                    <th className="px-5 py-4">
                      Jami to'lov
                    </th>

                    <th className="px-5 py-4 text-right">
                      Amallar
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {currentCompanies.map((company) => (
                    <tr
                      key={company.id}
                      className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                            {company.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <p className="font-semibold">
                              {company.name}
                            </p>

                            <p className="text-xs text-slate-500">
                              ID: #{company.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium">
                          {company.owner_name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {company.phone}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold dark:bg-slate-800">
                          {company.plan}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(
                            company.status
                          )}`}
                        >
                          {statusText(company.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {dateFormat(company.created_at)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {dateFormat(company.expires_at)}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold">
                        {money(company.total_paid)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          {company.status === "active" ? (
                            <button
                              title="To'xtatish"
                              onClick={() =>
                                changeStatus(
                                  company.id,
                                  "suspended"
                                )
                              }
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                              <Ban size={17} />
                            </button>
                          ) : (
                            <button
                              title="Faollashtirish"
                              onClick={() =>
                                changeStatus(
                                  company.id,
                                  "active"
                                )
                              }
                              className="rounded-lg p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                            >
                              <Play size={17} />
                            </button>
                          )}

                          <button
                            title="Batafsil"
                            onClick={() =>
                              setSelectedCompany(company)
                            }
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
                <div
                  key={company.id}
                  className="p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                        {company.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <p className="font-semibold">
                          {company.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {company.owner_name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {company.phone}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                        company.status
                      )}`}
                    >
                      {statusText(company.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500">
                        Tarif
                      </p>
                      <p className="font-semibold">
                        {company.plan}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Jami to'lov
                      </p>
                      <p className="font-semibold">
                        {money(company.total_paid)}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Ro'yxatdan o'tgan
                      </p>
                      <p className="font-semibold">
                        {dateFormat(company.created_at)}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Obuna
                      </p>
                      <p className="font-semibold">
                        {dateFormat(company.expires_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() =>
                        setSelectedCompany(company)
                      }
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-sm font-medium dark:border-slate-700"
                    >
                      <Eye size={16} />
                      Batafsil
                    </button>

                    {company.status === "active" ? (
                      <button
                        onClick={() =>
                          changeStatus(
                            company.id,
                            "suspended"
                          )
                        }
                        className="rounded-xl bg-red-50 px-4 py-2 text-red-600 dark:bg-red-500/10"
                      >
                        <Ban size={17} />
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          changeStatus(
                            company.id,
                            "active"
                          )
                        }
                        className="rounded-xl bg-emerald-50 px-4 py-2 text-emerald-600 dark:bg-emerald-500/10"
                      >
                        <Play size={17} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* PAGINATION */}

            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 p-4 sm:flex-row dark:border-slate-800">
              <p className="text-xs text-slate-500">
                {filteredCompanies.length} ta korxona
                ko'rsatilyapti
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() =>
                    setPage((p) => Math.max(1, p - 1))
                  }
                  className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"
                >
                  <ChevronLeft size={17} />
                </button>

                <span className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">
                  {page} / {totalPages}
                </span>

                <button
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((p) =>
                      Math.min(totalPages, p + 1)
                    )
                  }
                  className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ===============================================
          COMPANY DETAIL MODAL
      =============================================== */}

      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            {/* HEADER */}

            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-bold">
                  {selectedCompany.name}
                </h2>

                <p className="text-xs text-slate-500">
                  Korxona #{selectedCompany.id}
                </p>
              </div>

              <button
                onClick={() => setSelectedCompany(null)}
                className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-5">
              {/* INFO */}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InfoItem
                  icon={<Building2 size={17} />}
                  label="Korxona"
                  value={selectedCompany.name}
                />

                <InfoItem
                  icon={<Users size={17} />}
                  label="Egasi"
                  value={selectedCompany.owner_name}
                />

                <InfoItem
                  icon={<Phone size={17} />}
                  label="Telefon"
                  value={selectedCompany.phone}
                />

                <InfoItem
                  icon={<CreditCard size={17} />}
                  label="Tarif"
                  value={selectedCompany.plan}
                />

                <InfoItem
                  icon={<CalendarDays size={17} />}
                  label="Ro'yxatdan o'tgan"
                  value={dateFormat(
                    selectedCompany.created_at
                  )}
                />

                <InfoItem
                  icon={<CalendarDays size={17} />}
                  label="Obuna tugashi"
                  value={dateFormat(
                    selectedCompany.expires_at
                  )}
                />

                <InfoItem
                  icon={<Users size={17} />}
                  label="Foydalanuvchilar"
                  value={`${selectedCompany.users_count} ta`}
                />

                <InfoItem
                  icon={<Wallet size={17} />}
                  label="Jami to'lov"
                  value={money(
                    selectedCompany.total_paid
                  )}
                />
              </div>

              {/* STATUS */}

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      Korxona holati
                    </p>

                    <p className="text-xs text-slate-500">
                      Korxonaning tizimga kirish holatini
                      boshqaring
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(
                      selectedCompany.status
                    )}`}
                  >
                    {statusText(selectedCompany.status)}
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  {selectedCompany.status !== "active" && (
                    <button
                      disabled={actionLoading}
                      onClick={() =>
                        changeStatus(
                          selectedCompany.id,
                          "active"
                        )
                      }
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Play size={16} />
                      Faollashtirish
                    </button>
                  )}

                  {selectedCompany.status === "active" && (
                    <button
                      disabled={actionLoading}
                      onClick={() =>
                        changeStatus(
                          selectedCompany.id,
                          "suspended"
                        )
                      }
                      className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <Ban size={16} />
                      To'xtatish
                    </button>
                  )}
                </div>
              </div>

              {/* PAYMENTS */}

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold">
                    To'lovlar tarixi
                  </h3>

                  <button className="flex items-center gap-1 text-xs text-blue-600">
                    <RefreshCw size={13} />
                    Yangilash
                  </button>
                </div>

                {selectedCompany.payments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
                    To'lovlar mavjud emas
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    {selectedCompany.payments.map(
                      (payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between border-b border-slate-200 p-4 last:border-0 dark:border-slate-800"
                        >
                          <div>
                            <p className="font-semibold">
                              {money(payment.amount)}
                            </p>

                            <p className="text-xs text-slate-500">
                              {dateFormat(
                                payment.paid_at
                              )}
                            </p>
                          </div>

                          <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-slate-800">
                            {payment.method}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* SUBSCRIPTIONS */}

              <div>
                <h3 className="mb-3 font-bold">
                  Obuna tarixi
                </h3>

                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  {selectedCompany.subscriptions.map(
                    (subscription) => (
                      <div
                        key={subscription.id}
                        className="grid grid-cols-1 gap-3 border-b border-slate-200 p-4 last:border-0 md:grid-cols-4 dark:border-slate-800"
                      >
                        <div>
                          <p className="text-xs text-slate-500">
                            Tarif
                          </p>

                          <p className="font-semibold">
                            {subscription.plan}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Boshlanish
                          </p>

                          <p className="font-medium">
                            {dateFormat(
                              subscription.start_date
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Tugash
                          </p>

                          <p className="font-medium">
                            {dateFormat(
                              subscription.end_date
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Holat
                          </p>

                          <p className="font-medium">
                            {subscription.status}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* CLOSE */}

              <button
                onClick={() => setSelectedCompany(null)}
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
   STAT CARD
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
  let iconClass =
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

  if (green)
    iconClass =
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";

  if (red)
    iconClass =
      "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400";

  if (yellow)
    iconClass =
      "bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400";

  if (blue)
    iconClass =
      "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
      >
        {icon}
      </div>

      <p className="text-xs font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 break-words text-xl font-bold">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}

        <span className="text-xs">
          {label}
        </span>
      </div>

      <p className="font-semibold">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   LEGEND
========================================================= */

function Legend({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${className}`}
        />

        <span className="text-sm text-slate-600 dark:text-slate-300">
          {label}
        </span>
      </div>

      <span className="text-sm font-bold">
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   REVENUE CHART
========================================================= */

function RevenueChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const values = data.map((item) => item.value);
  const labels = data.map((item) => item.label);

  const max = Math.max(...values, 1);

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - (value / max) * 85;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="relative h-64 w-full">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full overflow-visible"
      >
        {[20, 40, 60, 80].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800"
            strokeWidth="0.4"
          />
        ))}

        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          className="text-blue-600"
          strokeWidth="1.8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-slate-400">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   DONUT CHART
========================================================= */

function DonutChart({
  active,
  suspended,
  trial,
}: {
  active: number;
  suspended: number;
  trial: number;
}) {
  const total = active + suspended + trial;

  const activePercent =
    total > 0 ? (active / total) * 100 : 0;

  const suspendedPercent =
    total > 0 ? (suspended / total) * 100 : 0;

  const trialPercent =
    total > 0 ? (trial / total) * 100 : 0;

  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  const activeLength =
    (activePercent / 100) * circumference;

  const suspendedLength =
    (suspendedPercent / 100) * circumference;

  const trialLength =
    (trialPercent / 100) * circumference;

  return (
    <div className="relative h-48 w-48">
      <svg
        viewBox="0 0 120 120"
        className="-rotate-90"
      >
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="currentColor"
          strokeWidth="13"
          className="text-slate-100 dark:text-slate-800"
        />

        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="currentColor"
          strokeWidth="13"
          className="text-emerald-500"
          strokeDasharray={`${activeLength} ${circumference}`}
        />

        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="currentColor"
          strokeWidth="13"
          className="text-red-500"
          strokeDasharray={`${suspendedLength} ${circumference}`}
          strokeDashoffset={-activeLength}
        />

        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="currentColor"
          strokeWidth="13"
          className="text-yellow-500"
          strokeDasharray={`${trialLength} ${circumference}`}
          strokeDashoffset={
            -(activeLength + suspendedLength)
          }
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">
          {total}
        </span>

        <span className="text-xs text-slate-500">
          korxona
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   NEW COMPANIES BAR CHART
========================================================= */

function NewCompaniesChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const values = data.map((item) => item.value);
  const labels = data.map((item) => item.label);

  const max = Math.max(...values, 1);

  return (
    <div className="mt-6 flex h-56 items-end gap-2 overflow-x-auto pb-6">
      {values.map((value, index) => (
        <div
          key={index}
          className="group flex min-w-[38px] flex-1 flex-col items-center justify-end gap-2"
        >
          <span className="text-[10px] font-semibold opacity-0 transition group-hover:opacity-100">
            {value}
          </span>

          <div
            className="w-full max-w-[44px] rounded-t-lg bg-blue-500 transition-all hover:bg-blue-600"
            style={{
              height: `${(value / max) * 150}px`,
            }}
          />

          <span className="text-[10px] text-slate-400">
            {labels[index]}
          </span>
        </div>
      ))}
    </div>
  );
}