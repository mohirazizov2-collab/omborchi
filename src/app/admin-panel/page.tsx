"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";

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
  id: number;
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

const initialCompanies: Company[] = [
  {
    id: 1,
    name: "Farrux Mebel",
    owner_name: "Farrux",
    phone: "+998 90 123 45 67",
    status: "active",
    plan: "Pro",
    plan_price: 1500000,
    created_at: "2026-01-12",
    expires_at: "2026-11-12",
    total_paid: 12000000,
    users_count: 8,
    payments: [
      {
        id: 1,
        amount: 1500000,
        paid_at: "2026-10-01",
        method: "Click",
      },
      {
        id: 2,
        amount: 1500000,
        paid_at: "2026-09-01",
        method: "Payme",
      },
    ],
    subscriptions: [
      {
        id: 1,
        plan: "Pro",
        start_date: "2026-10-01",
        end_date: "2026-11-01",
        status: "active",
      },
    ],
  },
  {
    id: 2,
    name: "Ideal Mebel",
    owner_name: "Azizbek",
    phone: "+998 91 555 22 11",
    status: "active",
    plan: "Basic",
    plan_price: 700000,
    created_at: "2026-02-03",
    expires_at: "2026-11-03",
    total_paid: 5600000,
    users_count: 5,
    payments: [
      {
        id: 3,
        amount: 700000,
        paid_at: "2026-10-03",
        method: "Payme",
      },
    ],
    subscriptions: [
      {
        id: 2,
        plan: "Basic",
        start_date: "2026-10-03",
        end_date: "2026-11-03",
        status: "active",
      },
    ],
  },
  {
    id: 3,
    name: "Royal Furniture",
    owner_name: "Jasur",
    phone: "+998 93 777 88 99",
    status: "trial",
    plan: "Pro",
    plan_price: 1500000,
    created_at: "2026-10-05",
    expires_at: "2026-10-19",
    total_paid: 0,
    users_count: 3,
    payments: [],
    subscriptions: [
      {
        id: 3,
        plan: "Pro Trial",
        start_date: "2026-10-05",
        end_date: "2026-10-19",
        status: "trial",
      },
    ],
  },
  {
    id: 4,
    name: "Mega Decor",
    owner_name: "Bekzod",
    phone: "+998 95 111 22 33",
    status: "suspended",
    plan: "Basic",
    plan_price: 700000,
    created_at: "2026-03-15",
    expires_at: "2026-09-15",
    total_paid: 4200000,
    users_count: 4,
    payments: [
      {
        id: 4,
        amount: 700000,
        paid_at: "2026-08-15",
        method: "Click",
      },
    ],
    subscriptions: [
      {
        id: 4,
        plan: "Basic",
        start_date: "2026-08-15",
        end_date: "2026-09-15",
        status: "expired",
      },
    ],
  },
  {
    id: 5,
    name: "Lux House",
    owner_name: "Muhammad",
    phone: "+998 97 444 55 66",
    status: "active",
    plan: "Enterprise",
    plan_price: 3000000,
    created_at: "2026-04-20",
    expires_at: "2026-12-20",
    total_paid: 21000000,
    users_count: 22,
    payments: [
      {
        id: 5,
        amount: 3000000,
        paid_at: "2026-10-20",
        method: "Bank",
      },
    ],
    subscriptions: [
      {
        id: 5,
        plan: "Enterprise",
        start_date: "2026-10-20",
        end_date: "2026-11-20",
        status: "active",
      },
    ],
  },
  {
    id: 6,
    name: "Modern Home",
    owner_name: "Sardor",
    phone: "+998 99 222 33 44",
    status: "active",
    plan: "Pro",
    plan_price: 1500000,
    created_at: "2026-05-11",
    expires_at: "2026-11-11",
    total_paid: 9000000,
    users_count: 11,
    payments: [],
    subscriptions: [],
  },
];

/* =========================================================
   HELPERS
========================================================= */

function money(value: number) {
  return new Intl.NumberFormat("uz-UZ").format(value) + " so'm";
}

function dateFormat(value: string) {
  return new Intl.DateTimeFormat("uz-UZ").format(new Date(value));
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
   PAGE
========================================================= */

export default function AdminDashboard() {
  const [companies, setCompanies] =
    useState<Company[]>(initialCompanies);

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

  const pageSize = 5;

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

  const growth = 18.7;

  /* =====================================================
     FILTER
  ===================================================== */

  const filteredCompanies = useMemo(() => {
    let result = [...companies];

    if (search.trim()) {
      const q = search.toLowerCase();

      result = result.filter(
        (company) =>
          company.name.toLowerCase().includes(q) ||
          company.owner_name.toLowerCase().includes(q) ||
          company.phone.toLowerCase().includes(q)
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

  function changeStatus(
    id: number,
    newStatus: CompanyStatus
  ) {
    setActionLoading(true);

    setTimeout(() => {
      setCompanies((old) =>
        old.map((company) =>
          company.id === id
            ? {
                ...company,
                status: newStatus,
              }
            : company
        )
      );

      setSelectedCompany((old) =>
        old
          ? {
              ...old,
              status: newStatus,
            }
          : null
      );

      setActionLoading(false);
    }, 400);
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
          {/* TITLE */}

          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              Umumiy ko'rinish
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              SaaS tizimingizdagi asosiy ko'rsatkichlar
            </p>
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

              <RevenueChart />
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

            <NewCompaniesChart />
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
                    <option value="Basic">Basic</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">
                      Enterprise
                    </option>
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

function RevenueChart() {
  const values = [
    4.2, 5.1, 6.4, 5.7, 8.2, 9.5, 8.9, 11.2, 12.4, 13.8,
    15.2, 18.4,
  ];

  const labels = [
    "Noy",
    "Dek",
    "Yan",
    "Fev",
    "Mar",
    "Apr",
    "May",
    "Iyun",
    "Iyl",
    "Avg",
    "Sen",
    "Okt",
  ];

  const max = Math.max(...values);

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

function NewCompaniesChart() {
  const values = [
    4, 7, 5, 9, 11, 8, 14, 12, 17, 19, 22, 28,
  ];

  const labels = [
    "Noy",
    "Dek",
    "Yan",
    "Fev",
    "Mar",
    "Apr",
    "May",
    "Iyun",
    "Iyl",
    "Avg",
    "Sen",
    "Okt",
  ];

  const max = Math.max(...values);

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