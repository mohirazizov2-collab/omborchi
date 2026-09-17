import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { clearFailedLogins, isLoginRateLimited, registerFailedLogin } from "@/lib/server/login-rate-limit";
import { findLoginCompany, findLoginUser, isValidCompanySlug } from "@/lib/server/company-login-store";
import { createSession, sessionCookie } from "@/lib/server/session";

export const runtime = "nodejs";

function rateLimitKey(request: Request, slug: string) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `${ip}:${slug}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!isValidCompanySlug(slug) || !username || !password || username.length > 100 || password.length > 256) {
      return NextResponse.json({ message: "Login yoki parol noto'g'ri." }, { status: 401 });
    }

    const limiterKey = rateLimitKey(request, slug);
    if (isLoginRateLimited(limiterKey)) {
      return NextResponse.json({ message: "Juda kop urinish qilindi. 15 daqiqadan song qayta urinib koring." }, { status: 429 });
    }

    const company = await findLoginCompany(slug);
    if (!company) return NextResponse.json({ message: "Korxona topilmadi." }, { status: 404 });
    if (company.status !== "active") {
      return NextResponse.json({ message: "Bu korxona akkaunti faol emas." }, { status: 403 });
    }

    const user = await findLoginUser(company.id, username);
    if (!user) {
      registerFailedLogin(limiterKey);
      return NextResponse.json({ message: "Login yoki parol noto'g'ri." }, { status: 401 });
    }
    if (user.status !== "active") {
      return NextResponse.json({ message: "Hisob vaqtincha bloklangan." }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      registerFailedLogin(limiterKey);
      return NextResponse.json({ message: "Login yoki parol noto'g'ri." }, { status: 401 });
    }

    clearFailedLogins(limiterKey);
    const response = NextResponse.json({
      authenticated: true,
      user: { id: user.id, role: user.role },
    });
    response.cookies.set(sessionCookie.name, createSession({ user_id: user.id, company_id: company.id, role: user.role }), sessionCookie.options);
    return response;
  } catch {
    return NextResponse.json({ message: "Tizimga kirishda xatolik yuz berdi." }, { status: 500 });
  }
}
