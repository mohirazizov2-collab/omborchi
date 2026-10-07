import { NextResponse } from "next/server";
import { clearFailedLogins, isLoginRateLimited, registerFailedLogin } from "@/lib/server/login-rate-limit";
import { adminCookie, checkAdminCredentials, createAdminToken } from "@/lib/server/platform-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `platform:${ip}`;
  if (isLoginRateLimited(key)) {
    return NextResponse.json({ message: "Juda kop urinish. Keyinroq urinib koring." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const ok = await checkAdminCredentials(String(body.username ?? ""), String(body.password ?? ""));
    if (!ok) {
      registerFailedLogin(key);
      return NextResponse.json({ message: "Login yoki parol notogri." }, { status: 401 });
    }
    clearFailedLogins(key);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(adminCookie.name, createAdminToken(), adminCookie.options);
    return res;
  } catch {
    return NextResponse.json({ message: "Xatolik yuz berdi." }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookie.name, "", { ...adminCookie.options, maxAge: 0 });
  return res;
}