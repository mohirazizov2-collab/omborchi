import { NextResponse } from "next/server";
import { findLoginCompany } from "@/lib/server/company-login-store";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const company = await findLoginCompany(slug);
    if (!company) return NextResponse.json({ code: "COMPANY_NOT_FOUND" }, { status: 404 });

    return NextResponse.json({
      company: { name: company.name, slug: company.slug, status: company.status },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ code: "SERVICE_UNAVAILABLE" }, { status: 503 });
  }
}
