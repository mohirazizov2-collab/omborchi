import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { isFounder } from "@/lib/tenancy";
import { adminAuth } from "@/lib/firebase-admin";

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export async function requireSuperAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (!token) throw new AdminApiError("Autentifikatsiya talab qilinadi.", 401);

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token, true);
  } catch (error) {
    console.error("Admin API token verification failed:", error);
    throw new AdminApiError("Sessiya yaroqsiz yoki muddati tugagan.", 401);
  }

  if (!isFounder(decodedToken.email)) {
    throw new AdminApiError("Bu amal faqat Super Admin uchun.", 403);
  }

  return { uid: decodedToken.uid, email: decodedToken.email ?? "" };
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof AdminApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Super Admin API request failed:", error);
  return NextResponse.json({ error: "Server xatoligi yuz berdi." }, { status: 500 });
}

export async function readJsonObject(request: NextRequest) {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new AdminApiError("So'rov JSON formatida bo'lishi kerak.", 400);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AdminApiError("So'rov ma'lumotlari noto'g'ri.", 400);
  }
  return value as Record<string, unknown>;
}

export function requiredText(
  value: unknown,
  field: string,
  maxLength = 100
) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new AdminApiError(`${field} majburiy va ${maxLength} belgidan oshmasligi kerak.`, 400);
  }
  return value.trim();
}

export function optionalText(value: unknown, field: string, maxLength = 100) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new AdminApiError(`${field} ${maxLength} belgidan oshmasligi kerak.`, 400);
  }
  return value.trim();
}

export function validateCompanyId(value: unknown) {
  const companyId = requiredText(value, "Korxona ID", 40).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(companyId)) {
    throw new AdminApiError("Korxona ID formatini tekshiring.", 400);
  }
  return companyId;
}

export function validateUsername(value: unknown, companyId: string) {
  const username = requiredText(value, "Login", 40).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) {
    throw new AdminApiError("Login 3–40 belgidan iborat bo'lsin.", 400);
  }
  if (companyId.length + username.length > 59) {
    throw new AdminApiError("Korxona ID va login uzunligi birgalikda 59 belgidan oshmasin.", 400);
  }
  return username;
}

export function validatePassword(value: unknown) {
  if (typeof value !== "string" || value.length < 12 || value.length > 128) {
    throw new AdminApiError("Vaqtinchalik parol 12–128 belgidan iborat bo'lishi kerak.", 400);
  }
  return value;
}

export function validateEmployeeRole(value: unknown) {
  const roles = [
    "Admin",
    "Menejer",
    "Sotuvchi",
    "Ombor boshlig'i",
    "Hisobchi",
    "Ishchi",
    "Omborchi",
    "Kassir",
  ];
  if (typeof value !== "string" || !roles.includes(value)) {
    throw new AdminApiError("Xodim roli ruxsat etilmagan.", 400);
  }
  return value;
}

export function routeParam(value: string) {
  return decodeURIComponent(value);
}
