"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, LogOut, UserRound } from "lucide-react";

type Company = { name: string; slug: string; status: "active" | "inactive" };
type State = "loading" | "not-found" | "inactive" | "ready" | "authenticated" | "error";

export function CompanyLogin({ slug }: { slug: string }) {
  const [state, setState] = useState<State>("loading");
  const [company, setCompany] = useState<Company | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadCompany() {
      try {
        const [companyResponse, sessionResponse] = await Promise.all([
          fetch(`/api/auth/company/${encodeURIComponent(slug)}`, { cache: "no-store" }),
          fetch(`/api/auth/session?slug=${encodeURIComponent(slug)}`, { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (companyResponse.status === 404) return setState("not-found");
        if (!companyResponse.ok) return setState("error");

        const { company: loadedCompany } = await companyResponse.json();
        setCompany(loadedCompany);
        if (loadedCompany.status !== "active") return setState("inactive");

        if (sessionResponse.ok) {
          const session = await sessionResponse.json();
          if (session.user.company_id === undefined) return setState("ready");
          if (session.user.company_id) setRole(session.user.role);
          return setState("authenticated");
        }
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }
    loadCompany();
    return () => { cancelled = true; };
  }, [slug]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Login yoki parol noto'g'ri.");
        return;
      }
      setPassword("");
      setRole(data.user.role);
      setState("authenticated");
    } catch {
      setError("Tarmoqqa ulanib bolmadi. Qayta urinib koring.");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setRole("");
    setUsername("");
    setPassword("");
    setState("ready");
  };

  const title = company?.name || "Omborchi AI";
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f7fb] px-4 py-8 font-body text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(37,99,235,0.15),transparent_30%),radial-gradient(circle_at_85%_85%,rgba(13,148,136,0.12),transparent_28%)]" />
      <div className="relative w-full max-w-[440px]">
        <Brand />
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)] sm:p-9">
          {state === "loading" && <LoadingState />}
          {state === "not-found" && <MessageState title="Korxona topilmadi." description="URL manzilini tekshiring yoki korxona administratori bilan boglaning." />}
          {state === "inactive" && <MessageState title="Bu korxona akkaunti faol emas." description="Yordam uchun Omborchi AI administratori bilan boglaning." />}
          {state === "error" && <MessageState title="Xizmatga ulanib bolmadi." description="Birozdan song qayta urinib koring." />}
          {state === "authenticated" && (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><LockKeyhole className="h-6 w-6" /></div>
              <p className="mt-6 text-sm font-semibold text-slate-500">{title}</p>
              <h1 className="mt-1 font-headline text-2xl font-bold">Tizimga muvaffaqiyatli kirildi</h1>
              <p className="mt-3 text-sm text-slate-500">Sizning rolingiz: <span className="font-semibold text-slate-700">{role}</span></p>
              <button onClick={logout} className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"><LogOut className="h-4 w-4" /> Chiqish</button>
            </div>
          )}
          {state === "ready" && company && (
            <form onSubmit={login} className="space-y-5" noValidate>
              <div className="text-center">
                <p className="text-sm font-semibold text-blue-600">{company.name}</p>
                <h1 className="mt-2 font-headline text-2xl font-bold tracking-tight">Tizimga kirish</h1>
                <p className="mt-2 text-sm text-slate-500">Hisobingiz malumotlarini kiriting</p>
              </div>
              {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
              <Field label="Login" icon={<UserRound className="h-4 w-4" />}>
                <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required maxLength={100} placeholder="admin" className="h-12 w-full bg-transparent pr-4 text-sm outline-none placeholder:text-slate-400" />
              </Field>
              <Field label="Password" icon={<LockKeyhole className="h-4 w-4" />}>
                <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={256} placeholder="••••••••" className="h-12 w-full bg-transparent pr-11 text-sm outline-none placeholder:text-slate-400" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Passwordni yashirish" : "Passwordni korsatish"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </Field>
              <button disabled={submitting} className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold tracking-wide text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "KIRISH"}
              </button>
              <p className="text-center text-xs text-slate-500">Parolni unutdingizmi? Korxona administratoriga murojaat qiling.</p>
            </form>
          )}
        </section>
        <p className="mt-6 text-center text-xs font-medium text-slate-400">© 2026 Omborchi AI. Xavfsiz korxona boshqaruvi.</p>
      </div>
    </main>
  );
}

function Brand() {
  return <div className="mb-7 flex items-center justify-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-600/25">OA</div><span className="font-headline text-xl font-bold tracking-tight">OMBORCHI AI</span></div>;
}

function LoadingState() {
  return <div className="flex min-h-64 flex-col items-center justify-center gap-4"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /><p className="text-sm font-medium text-slate-500">Korxona aniqlanmoqda...</p></div>;
}

function MessageState({ title, description }: { title: string; description: string }) {
  return <div className="min-h-64 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><LockKeyhole className="h-5 w-5" /></div><h1 className="mt-5 font-headline text-xl font-bold">{title}</h1><p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-500">{description}</p></div>;
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-slate-700">{label}</span><span className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50 pl-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10"><span className="mr-2 text-slate-400">{icon}</span>{children}</span></label>;
}
