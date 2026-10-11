import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  AdminApiError,
  apiErrorResponse,
  optionalText,
  readJsonObject,
  requireSuperAdmin,
  requiredText,
  routeParam,
  validateCompanyId,
  validateEmployeeRole,
  validatePassword,
  validateUsername,
} from "@/lib/admin-api";
import { companyAuthEmail } from "@/lib/tenancy";

export const runtime = "nodejs";

function timestampToIso(value: unknown) {
  if (!value || typeof value !== "object" || !("toDate" in value)) return null;
  const date = (value as { toDate: () => Date }).toDate();
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ companyId: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { companyId: rawCompanyId } = await context.params;
    const companyId = validateCompanyId(routeParam(rawCompanyId));
    const companyRef = adminDb.collection("companies").doc(companyId);
    const company = await companyRef.get();
    if (!company.exists) throw new AdminApiError("Kompaniya topilmadi.", 404);

    const users = await companyRef.collection("users").get();
    return NextResponse.json({
      users: users.docs.map((snapshot) => {
        const data = snapshot.data();
        return {
          uid: snapshot.id,
          firstName: String(data.firstName ?? ""),
          lastName: String(data.lastName ?? ""),
          fullName: String(data.fullName ?? `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim()),
          username: String(data.username ?? ""),
          email: String(data.email ?? ""),
          phone: String(data.phone ?? ""),
          position: String(data.position ?? ""),
          role: String(data.role ?? "Ishchi"),
          status: data.status === "inactive" ? "inactive" : "active",
          createdAt: timestampToIso(data.createdAt),
          lastSeenAt: timestampToIso(data.lastSeenAt),
        };
      }),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ companyId: string }> }
) {
  let createdUid: string | undefined;
  try {
    const actor = await requireSuperAdmin(request);
    const { companyId: rawCompanyId } = await context.params;
    const companyId = validateCompanyId(routeParam(rawCompanyId));
    const body = await readJsonObject(request);
    const companyRef = adminDb.collection("companies").doc(companyId);
    const company = await companyRef.get();
    if (!company.exists) throw new AdminApiError("Kompaniya topilmadi.", 404);

    const firstName = requiredText(body.firstName, "Ism");
    const lastName = requiredText(body.lastName, "Familiya");
    const username = validateUsername(body.username, companyId);
    const password = validatePassword(body.password);
    const role = validateEmployeeRole(body.role);
    const phone = optionalText(body.phone, "Telefon", 40) ?? "";
    const position = optionalText(body.position, "Lavozim", 80) ?? "";
    if (body.status !== undefined && body.status !== "active" && body.status !== "inactive") {
      throw new AdminApiError("Akkaunt holatini tanlang.", 400);
    }
    const email = companyAuthEmail(companyId, username);
    const authUser = await adminAuth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      disabled: body.status === "inactive",
    });
    createdUid = authUser.uid;

    const batch = adminDb.batch();
    batch.create(companyRef.collection("users").doc(authUser.uid), {
      id: authUser.uid,
      uid: authUser.uid,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email,
      username,
      companyId,
      phone,
      position,
      role,
      status: body.status === "inactive" ? "inactive" : "active",
      hasLogin: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.create(companyRef.collection("accountAuditLogs").doc(), {
      action: "employee_created",
      targetUid: authUser.uid,
      username,
      role,
      actorUid: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return NextResponse.json({ uid: authUser.uid }, { status: 201 });
  } catch (error) {
    if (createdUid) {
      try {
        await adminAuth.deleteUser(createdUid);
      } catch (cleanupError) {
        console.error("Failed to clean up employee auth account:", cleanupError);
      }
    }
    return apiErrorResponse(error);
  }
}
