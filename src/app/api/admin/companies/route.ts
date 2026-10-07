import bcrypt from "bcryptjs";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb, isValidCompanySlug } from "@/lib/server/firebase-admin";
import { forbidden, isPlatformAdmin } from "@/lib/server/platform-admin";

export const runtime = "nodejs";
const DAY = 86400000;

// /[slug] marshruti bilan to'qnashmasligi uchun band nomlar
const RESERVED = [
  "admin", "api", "login", "cash", "employees", "expenses", "history", "inventory-audit",
  "production", "products", "profile", "recipes", "reports", "sales", "settings", "staff",
  "stock-in", "stock-out", "system-gen", "transfers", "users", "warehouses",
];

const ts = (v: any): number | null => v?.toMillis?.() ?? null;
const bad = (message: string, status = 400) => NextResponse.json({ message }, { status });

export async function GET(request: Request) {
  if (!isPlatformAdmin(request)) return forbidden();
  const db = getAdminDb();
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  const [cs, us, ds] = await Promise.all([
    db.collection("companies").get(),
    db.collection("users").select("company_id", "last_login_at").get(),
    db.doc(`dailyStats/${today}`).get(),
  ]);

  const per: Record<string, { users: number; active7: number }> = {};
  let activeUsers7 = 0;
  let activeUsers30 = 0;
  us.forEach((d) => {
    const x = d.data();
    const c = (per[x.company_id] ??= { users: 0, active7: 0 });
    c.users++;
    const t = ts(x.last_login_at) ?? 0;
    if (t > now - 7 * DAY) { c.active7++; activeUsers7++; }
    if (t > now - 30 * DAY) activeUsers30++;
  });

  const companies = cs.docs.map((d) => {
    const x = d.data();
    const expires = ts(x.expires_at);
    let state: "trial" | "active" | "expired" | "blocked" = x.plan === "trial" ? "trial" : "active";
    if (x.status !== "active") state = "blocked";
    else if (expires !== null && expires < now) state = "expired";
    const u = per[d.id] ?? { users: 0, active7: 0 };
    return {
      id: d.id,
      name: x.name ?? "",
      slug: x.slug ?? "",
      state,
      expires_at: expires,
      last_active_at: ts(x.last_active_at),
      login_count: x.login_count ?? 0,
      users: u.users,
      active7: u.active7,
    };
  }).sort((a, b) => (b.last_active_at ?? 0) - (a.last_active_at ?? 0));

  const count = (s: string) => companies.filter((c) => c.state === s).length;
  return NextResponse.json({
    companies,
    stats: {
      companies: companies.length,
      trial: count("trial"),
      active: count("active"),
      expired: count("expired"),
      blocked: count("blocked"),
      users: us.size,
      activeUsers7,
      activeUsers30,
      loginsToday: ds.data()?.logins ?? 0,
    },
  });
}

export async function POST(request: Request) {
  if (!isPlatformAdmin(request)) return forbidden();
  try {
    const b = await request.json();
    const slug = String(b.slug ?? "").trim().toLowerCase();
    const name = String(b.name ?? "").trim();
    const username = String(b.username ?? "").trim();
    const password = String(b.password ?? "");
    const trialDays = Math.min(Math.max(Number(b.trialDays) || 30, 1), 365);

    if (!isValidCompanySlug(slug) || slug.length < 3 || slug.length > 40)
      return bad("Korxona ID notogri (3-40 belgi, kichik harf, raqam, chiziqcha).");
    if (RESERVED.includes(slug)) return bad("Bu ID tizim uchun band.");
    if (!name || name.length > 100) return bad("Korxona nomini kiriting.");
    if (!username || username.length > 100) return bad("Login notogri.");
    if (password.length < 6 || password.length > 100) return bad("Parol kamida 6 belgi bolishi kerak.");

    const db = getAdminDb();
    const dup = await db.collection("companies").where("slug", "==", slug).limit(1).get();
    if (!dup.empty) return bad("Bu korxona ID band.", 409);

    const companyRef = db.collection("companies").doc();
    const userRef = db.collection("users").doc();
    const batch = db.batch();
    batch.set(companyRef, {
      id: companyRef.id,
      name,
      slug,
      status: "active",
      plan: "trial",
      expires_at: Timestamp.fromMillis(Date.now() + trialDays * DAY),
      created_at: FieldValue.serverTimestamp(),
      login_count: 0,
    });
    batch.set(userRef, {
      id: userRef.id,
      company_id: companyRef.id,
      username,
      password_hash: await bcrypt.hash(password, 12),
      role: "Admin",
      status: "active",
      created_at: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return NextResponse.json({ ok: true, id: companyRef.id }, { status: 201 });
  } catch {
    return bad("Korxona yaratishda xatolik.", 500);
  }
}