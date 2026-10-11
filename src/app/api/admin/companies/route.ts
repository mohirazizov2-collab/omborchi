import { NextRequest, NextResponse } from "next/server";
import { addMonths } from "date-fns";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  AdminApiError,
  apiErrorResponse,
  readJsonObject,
  requiredText,
  requireSuperAdmin,
  validateCompanyId,
  validatePassword,
  validateUsername,
} from "@/lib/admin-api";
import { companyAuthEmail } from "@/lib/tenancy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let createdUid: string | undefined;
  try {
    const actor = await requireSuperAdmin(request);
    const body = await readJsonObject(request);
    const companyId = validateCompanyId(body.companyId);
    const username = validateUsername(body.username, companyId);
    const name = requiredText(body.name, "Korxona nomi");
    const ownerName =
      body.ownerName === undefined ? name : requiredText(body.ownerName, "Egasi");
    const phone =
      body.phone === undefined || body.phone === ""
        ? ""
        : requiredText(body.phone, "Telefon", 40);
    const password = validatePassword(body.password);
    const initialSubscription = body.initialSubscription;
    if (!["disabled", "trial", "paid"].includes(String(initialSubscription))) {
      throw new AdminApiError("Boshlang'ich obuna holatini tanlang.", 400);
    }

    const companyRef = adminDb.collection("companies").doc(companyId);
    const existing = await companyRef.get();
    if (existing.exists) throw new AdminApiError("Bu korxona ID allaqachon ishlatilgan.", 409);

    const email = companyAuthEmail(companyId, username);
    const authUser = await adminAuth.createUser({
      email,
      password,
      displayName: ownerName,
    });
    createdUid = authUser.uid;

    const now = new Date();
    const expiresAt =
      initialSubscription === "disabled" ? null : Timestamp.fromDate(addMonths(now, 1));
    const subscriptionStatus =
      initialSubscription === "trial"
        ? "trial"
        : initialSubscription === "paid"
          ? "active"
          : "suspended";
    const batch = adminDb.batch();
    batch.create(companyRef, {
      name,
      ownerName,
      phone,
      username,
      ownerUid: authUser.uid,
      companyStatus: "active",
      subscriptionStatus,
      subscriptionType: initialSubscription === "trial" ? "trial" : "paid",
      plan: "Basic",
      totalPaid: 0,
      ...(expiresAt ? { subscriptionEndsAt: expiresAt } : {}),
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
    });
    batch.create(companyRef.collection("users").doc(authUser.uid), {
      id: authUser.uid,
      uid: authUser.uid,
      firstName: ownerName,
      lastName: "",
      fullName: ownerName,
      phone,
      username,
      email,
      role: "Admin",
      companyId,
      status: "active",
      hasLogin: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.create(companyRef.collection("accountAuditLogs").doc(), {
      action: "company_and_owner_created",
      targetUid: authUser.uid,
      actorUid: actor.uid,
      companyId,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (expiresAt) {
      batch.create(companyRef.collection("subscriptions").doc(), {
        plan: "Basic",
        startDate: Timestamp.fromDate(now),
        endDate: expiresAt,
        status: subscriptionStatus,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: actor.uid,
      });
    }
    await batch.commit();

    return NextResponse.json({ companyId, ownerUid: authUser.uid }, { status: 201 });
  } catch (error) {
    if (createdUid) {
      try {
        await adminAuth.deleteUser(createdUid);
      } catch (cleanupError) {
        console.error("Failed to clean up company owner auth account:", cleanupError);
      }
    }
    return apiErrorResponse(error);
  }
}
