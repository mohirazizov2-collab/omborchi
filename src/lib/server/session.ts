import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "omborchi_ai_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

export type SessionPayload = {
  user_id: string;
  company_id: string;
  role: string;
  exp: number;
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 32) return value;
  // Local-only value so /farrux-mebel can be tested before deployment setup.
  // Production never falls back and therefore cannot issue a predictable cookie.
  if (process.env.NODE_ENV !== "production") {
    return "omborchi-ai-local-development-session-secret-2026";
  }
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters.");
  }
  return value;
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSession(payload: Omit<SessionPayload, "exp">) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS })).toString("base64url");
  return `${body}.${signature(body)}`;
}

export function readSession(token?: string): SessionPayload | null {
  if (!token) return null;
  const [body, receivedSignature] = token.split(".");
  if (!body || !receivedSignature) return null;

  const expectedSignature = signature(body);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.user_id || !payload.company_id || !payload.role || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const sessionCookie = {
  name: SESSION_COOKIE,
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  },
};
