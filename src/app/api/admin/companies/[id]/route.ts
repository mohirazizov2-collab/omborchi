import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { forbidden, isPlatformAdmin } from "@/lib/server/platform-admin";

export const runtime = "nodejs";
const DAY = 86400000;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isPlatformAdmin(request)) return forbidden();
  try {
    const { id } = await params;
    const b = await request.json();
    const ref = getAdminDb().doc(`companies/${id}`);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ message: "Korxona topilmadi." }, { status: 404 });

    switch (b.action) {
      case "extend": {
        const days = Math.min(Math.max(Number(b.days) || 30, 1), 3650);
        const current = (snap.data()!.expires_at as Timestamp | undefined)?.toMillis?.() ?? 0;
        const base = Math.max(Date.now(), current);
        await ref.update({
          expires_at: Timestamp.fromMillis(base + days * DAY),
          plan: b.plan === "trial" ? "trial" : "paid",
          status: "active",
        });
        break;
      }
      case "block":
        await ref.update({ status: "inactive" });
        break;
      case "unblock":
        await ref.update({ status: "active" });
        break;
      case "unlimited":
        await ref.update({ expires_at: null, plan: "paid", status: "active" });
        break;
      default:
        return NextResponse.json({ message: "Noma'lum amal." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Xatolik yuz berdi." }, { status: 500 });
  }
}