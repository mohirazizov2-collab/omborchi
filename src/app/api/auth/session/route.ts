import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findLoginCompany } from "@/lib/server/company-login-store";
import { readSession, sessionCookie } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const token = (await cookies()).get(sessionCookie.name)?.value;
    const session = readSession(token);
    if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });

    const slug = new URL(request.url).searchParams.get("slug");
    if (slug) {
      const company = await findLoginCompany(slug);
      if (!company || company.id !== session.company_id) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }
    }
    return NextResponse.json({ authenticated: true, user: session });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
