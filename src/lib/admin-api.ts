import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { isFounder } from "@/lib/tenancy";
import { adminAuth, adminProjectId } from "@/lib/firebase-admin";

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string = "UNKNOWN"
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

/* =========================================================
   TOKEN
========================================================= */

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Token aud (project ID) server project bilan mos kelmasa, server konfiguratsiyasi
 * noto‘g‘ri yoki token boshqa project’niki. Bu foydalanuvchi xatosi emas.
 */
function assertTokenProject(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload) return; // yaroqsiz format — verifyIdToken TOKEN_INVALID qaytaradi

  const aud = typeof payload.aud === "string" ? payload.aud : undefined;
  const iss = typeof payload.iss === "string" ? payload.iss : undefined;
  const expectedIss = `https://securetoken.google.com/${adminProjectId}`;

  if ((aud && aud !== adminProjectId) || (iss && iss !== expectedIss)) {
    console.error(
      `[admin-api] PROJECT_MISMATCH: token aud=${aud} iss=${iss}, server project=${adminProjectId}`
    );
    throw new AdminApiError(
      `Firebase project mos emas: token "${aud ?? "?"}", server "${adminProjectId}". ` +
        `Server env yoki service account sozlamalarini tekshiring.`,
      500,
      "PROJECT_MISMATCH"
    );
  }
}

function getErrorCode(error: unknown): string {
  const e = error as { code?: unknown; errorInfo?: { code?: unknown } };
  if (typeof e?.code === "string") return e.code;
  if (typeof e?.errorInfo?.code === "string") return e.errorInfo.code;
  return "";
}

const TOKEN_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  "auth/id-token-expired": {
    status: 401,
    code: "TOKEN_EXPIRED",
    message: "Sessiya muddati tugagan. Qayta kiring.",
  },
  "auth/id-token-revoked": {
    status: 401,
    code: "TOKEN_REVOKED",
    message: "Sessiya bekor qilingan. Qayta kiring.",
  },
  "auth/user-disabled": {
    status: 403,
    code: "USER_DISABLED",
    message: "Foydalanuvchi o‘chirilgan.",
  },
  "auth/argument-error": {
    status: 401,
    code: "TOKEN_INVALID",
    message: "Token yaroqsiz yoki noto‘g‘ri formatda.",
  },
  "auth/invalid-id-token": {
    status: 401,
    code: "TOKEN_INVALID",
    message: "Token yaroqsiz.",
  },
};

/* =========================================================
   AUTH GUARD
========================================================= */

export async function requireSuperAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    throw new AdminApiError("Autentifikatsiya talab qilinadi.", 401, "AUTH_REQUIRED");
  }

  assertTokenProject(token);

  let decodedToken;
  try {
    // checkRevoked=true: Auth API’ga so‘rov yuboradi, service account ruxsati kerak
    decodedToken = await adminAuth.verifyIdToken(token, true);
  } catch (error) {
    const code = getErrorCode(error);
    console.error(`[admin-api] verifyIdToken failed: code=${code}`, error);

    const mapped = TOKEN_ERRORS[code];
    if (mapped) {
      throw new AdminApiError(mapped.message, mapped.status, mapped.code);
    }

    // Token bilan emas, server bilan bog‘liq xato (credential, IAM ruxsati, tarmoq)
    throw new AdminApiError(
      "Serverda autentifikatsiyani tekshirib bo‘lmadi. Server loglarini ko‘ring.",
      500,
      "AUTH_VERIFY_FAILED"
    );
  }

  if (!isFounder(decodedToken.email)) {
    throw new AdminApiError("Bu amal faqat Super Admin uchun.", 403, "FORBIDDEN");
  }

  return { uid: decodedToken.uid, email: decodedToken.email ?? "" };
}

/* =========================================================
   RESPONSE
========================================================= */

export function apiErrorResponse(error: unknown) {
  if (error instanceof AdminApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

  console.error("[admin-api] Unhandled error:", error);
  return NextResponse.json(
    { error: "Server xatoligi yuz berdi.", code: "INTERNAL" },
    { status: 500 }
  );
}

/* =========================================================
   INPUT VALIDATION
========================================================= */

export async function readJsonObject(request: NextRequest) {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new AdminApiError("So‘rov JSON formatida bo‘lishi kerak.", 400, "BAD_JSON");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AdminApiError("So‘rov ma’lumotlari noto‘g‘ri.", 400, "BAD_BODY");
  }
  return value as Record<string, unknown>;
}

export function requiredText(value: unknown, field: string, maxLength = 100) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new AdminApiError(
      `${field} majburiy va ${maxLength} belgidan oshmasligi kerak.`,
      400,
      "VALIDATION"
    );
  }
  return value.trim();
}

export function optionalText(value: unknown, field: string, maxLength = 100) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new AdminApiError(
      `${field} ${maxLength} belgidan oshmasligi kerak.`,
      400,
      "VALIDATION"
    );
  }
  return value.trim();
}

export function validateCompanyId(value: unknown) {
  const companyId = requiredText(value, "Korxona ID", 40).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(companyId)) {
    throw new AdminApiError("Korxona ID formatini tekshiring.", 400, "VALIDATION");
  }
  return companyId;
}

export function validateUsername(value: unknown, companyId: string) {
  const username = requiredText(value, "Login", 40).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) {
    throw new AdminApiError("Login 3–40 belgidan iborat bo‘lsin.", 400, "VALIDATION");
  }
  if (companyId.length + username.length > 59) {
    throw new AdminApiError(
      "Korxona ID va login uzunligi birgalikda 59 belgidan oshmasin.",
      400,
      "VALIDATION"
    );
  }
  return username;
}

export function validatePassword(value: unknown) {
  if (typeof value !== "string" || value.length < 12 || value.length > 128) {
    throw new AdminApiError(
      "Vaqtinchalik parol 12–128 belgidan iborat bo‘lishi kerak.",
      400,
      "VALIDATION"
    );
  }
  return value;
}

const EMPLOYEE_ROLES = [
  "Admin",
  "Menejer",
  "Sotuvchi",
  "Ombor boshlig'i",
  "Hisobchi",
  "Ishchi",
  "Omborchi",
  "Kassir",
] as const;

export function validateEmployeeRole(value: unknown) {
  if (typeof value !== "string" || !(EMPLOYEE_ROLES as readonly string[]).includes(value)) {
    throw new AdminApiError("Xodim roli ruxsat etilmagan.", 400, "VALIDATION");
  }
  return value;
}

export function routeParam(value: string) {
  return decodeURIComponent(value);
}
