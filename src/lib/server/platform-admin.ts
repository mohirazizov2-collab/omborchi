import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const adminCookie = {
  name: "omborchi_platform",
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 8,
  },
};

function secret() {
  const s = process.env.PLATFORM_ADMIN_SECRET;
  if (!s || s.length < 32) throw new Error("PLATFORM_ADMIN_SECRET sozlanmagan");
  return s;
}

const sign = (v: string) => crypto.createHmac("sha256", secret()).update(v).digest("hex");

export function createAdminToken() {
  const payload = `admin.${Date.now() + adminCookie.options.maxAge * 1000}`;
  return `${payload}.${sign(payload)}`;
}

function verifyAdminToken(token?: string) {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  const exp = Number(payload.split(".")[1]);
  return Number.isFinite(exp) && exp > Date.now();
}

export function isPlatformAdmin(request: Request) {
  const m = (request.headers.get("cookie") ?? "").match(/(?:^|;\s*)omborchi_platform=([^;]+)/);
  try {
    return verifyAdminToken(m?.[1]);
  } catch {
    return false;
  }
}

export const forbidden = () => NextResponse.json({ message: "Ruxsat yoq" }, { status: 403 });

export async function checkAdminCredentials(username: string, password: string) {
  const u = process.env.PLATFORM_ADMIN_USER;
  const b64 = process.env.PLATFORM_ADMIN_HASH_B64;
  if (!u || !b64) return false;
  const hash = Buffer.from(b64, "base64").toString("utf8");
  const passOk = await bcrypt.compare(password, hash);
  return username === u && passOk;
}