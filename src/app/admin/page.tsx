"use client";

import { useCallback, useEffect, useState } from "react";

type State = "trial" | "active" | "expired" | "blocked";
type Company = {
  id: string; name: string; slug: string; state: State;
  expires_at: number | null; last_active_at: number | null;
  login_count: number; users: number; active7: number;
};
type Stats = {
  companies: number; trial: number; active: number; expired: number; blocked: number;
  users: number; activeUsers7: number; activeUsers30: number; loginsToday: number;
};

const LABEL: Record<State, string> = { trial: "Test rejim", active: "Faol", expired: "Muddati tugagan", blocked: "Bloklangan" };
const COLOR: Record<State, string> = {
  trial: "bg-amber-500/15 text-amber-300",
  active: "bg-emerald-500/15 text-emerald-300",
  expired: "bg-red-500/15 text-red-300",
  blocked: "bg-slate-500/20 text-slate-300",
};
const input = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-blue-500";
const btn = "rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-80";

const fmt = (ms: number | null) =>
  ms ? new Date(ms).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" }) : "-";

function left(ms: number | null) {
  if (ms === null) return "Cheksiz";
  const d = Math.ceil((ms - Date.now()) / 86400000);
  return d >= 0 ? `${d} kun qoldi` : `${-d} kun oldin tugagan`;
}

async function call(url: string, method: string, body?: unknown) {
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || "Xatolik");
  return j;
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-wider text-slate-400">{title}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<{ companies: Company[]; stats: Stats } | null>(null);
  const [msg, setMsg] = useState("");
  const [login, setLogin] = useState({ username: "", password: "" });
  const [form, setForm] = useState({ slug: "", name: "", username: "admin", password: "", trialDays: "30" });

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/companies", { cache: "no-store" });
    if (!r.ok) { setAuthed(false); return; }
    setData(await r.json());
    setAuthed(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function doLogin() {
    try { await call("/api/admin/login", "POST", login); setMsg(""); await load(); }
    catch (e) { setMsg((e as Error).message); }
  }

  async function logout() {
    await call("/api/admin/login", "DELETE");
    setData(null); setAuthed(false);
  }

  async function create() {
    try {
      await call("/api/admin/companies", "POST", form);
      setMsg(`Yaratildi -> ID: ${form.slug} | Login: ${form.username} | Parol: ${form.password}`);
      setForm({ slug: "", name: "", username: "admin", password: "", trialDays: "30" });
      await load();
    } catch (e) { setMsg((e as Error).message); }
  }

  async function act(id: string, body: object) {
    try { await call(`/api/admin/companies/${id}`, "PATCH", body); await load(); }
    catch (e) { setMsg((e as Error).message); }
  }

  if (authed === null) return <div className="min-h-screen bg-slate-950 p-10 text-slate-400">Yuklanmoqda...</div>;

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-sm space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-xl font-bold text-white">Platforma admin</h1>
          <input className={input} placeholder="Login" value={login.username}
            onChange={(e) => setLogin({ ...login, username: e.target.value })} />
          <input className={input} type="password" placeholder="Parol" value={login.password}
            onChange={(e) => setLogin({ ...login, password: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && doLogin()} />
          {msg && <p className="text-sm text-red-400">{msg}</p>}
          <button onClick={doLogin} className="w-full rounded-xl bg-blue-500 py-3 text-sm font-bold text-white">KIRISH</button>
        </div>
      </div>
    );
  }

  const s = data!.stats;
  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-200 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Omborchi admin panel</h1>
          <div className="flex gap-2">
            <button onClick={load} className={`${btn} bg-white/10 text-white`}>Yangilash</button>
            <button onClick={logout} className={`${btn} bg-white/10 text-white`}>Chiqish</button>
          </div>
        </div>

        {msg && <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200">{msg}</div>}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Card title="Korxonalar" value={s.companies} />
          <Card title="Test rejimda" value={s.trial} />
          <Card title="Faol (tolagan)" value={s.active} />
          <Card title="Muddati tugagan" value={s.expired} />
          <Card title="Bloklangan" value={s.blocked} />
          <Card title="Jami userlar" value={s.users} />
          <Card title="7 kunda kirgan" value={s.activeUsers7} />
          <Card title="30 kunda kirgan" value={s.activeUsers30} />
          <Card title="Bugungi kirishlar" value={s.loginsToday} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 font-semibold text-white">{"Yangi korxona qo'shish"}</h2>
          <div className="grid gap-3 md:grid-cols-6">
            <input className={input} placeholder="Korxona ID (farrux-mebel)" value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <input className={input} placeholder="Korxona nomi" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={input} placeholder="Login" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <div className="flex gap-2">
              <input className={input} placeholder="Parol" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" title="Parol yaratish" className={`${btn} bg-white/10`}
                onClick={() => setForm({ ...form, password: crypto.randomUUID().slice(0, 8) })}>Gen</button>
            </div>
            <input className={input} type="number" placeholder="Test kunlari" value={form.trialDays}
              onChange={(e) => setForm({ ...form, trialDays: e.target.value })} />
            <button onClick={create} className="rounded-xl bg-blue-500 text-sm font-bold text-white">YARATISH</button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Korxona</th><th className="p-4">Holat</th><th className="p-4">Muddat</th>
                <th className="p-4">Userlar (7 kun)</th><th className="p-4">Kirishlar</th>
                <th className="p-4">Oxirgi faollik</th><th className="p-4">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {data!.companies.map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="p-4">
                    <div className="font-semibold text-white">{c.name}</div>
                    <div className="text-xs text-slate-500">/{c.slug}</div>
                  </td>
                  <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${COLOR[c.state]}`}>{LABEL[c.state]}</span></td>
                  <td className="p-4"><div>{left(c.expires_at)}</div><div className="text-xs text-slate-500">{fmt(c.expires_at)}</div></td>
                  <td className="p-4">{c.users} ({c.active7})</td>
                  <td className="p-4">{c.login_count}</td>
                  <td className="p-4">{fmt(c.last_active_at)}</td>
                  <td className="space-x-1 space-y-1 p-4">
                    <button className={`${btn} bg-emerald-500 text-white`} onClick={() => act(c.id, { action: "extend", days: 30, plan: "paid" })}>+1 oy</button>
                    <button className={`${btn} bg-amber-500 text-black`} onClick={() => act(c.id, { action: "extend", days: 7, plan: "trial" })}>+7 kun test</button>
                    <button className={`${btn} bg-white/10`} onClick={() => act(c.id, { action: "unlimited" })}>Cheksiz</button>
                    {c.state === "blocked"
                      ? <button className={`${btn} bg-blue-500 text-white`} onClick={() => act(c.id, { action: "unblock" })}>Ochish</button>
                      : <button className={`${btn} bg-red-500 text-white`} onClick={() => act(c.id, { action: "block" })}>Bloklash</button>}
                  </td>
                </tr>
              ))}
              {data!.companies.length === 0 && (
                <tr><td className="p-6 text-center text-slate-500" colSpan={7}>Hali korxona yoq</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}