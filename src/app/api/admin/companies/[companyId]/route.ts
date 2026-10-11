import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  AdminApiError,
  apiErrorResponse,
  readJsonObject,
  requireSuperAdmin,
  routeParam,
  validateCompanyId,
} from "@/lib/admin-api";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ companyId: string }> }
) {
  try {
    const actor = await requireSuperAdmin(request);
    const { companyId: rawCompanyId } = await context.params;
    const companyId = validateCompanyId(routeParam(rawCompanyId));
    const body = await readJsonObject(request);
    if (body.companyStatus !== "active" && body.companyStatus !== "inactive") {
      throw new AdminApiError("Kompaniya holatini tanlang.", 400);
    }

    const companyRef = adminDb.collection("companies").doc(companyId);
    const company = await companyRef.get();
    if (!company.exists) throw new AdminApiError("Kompaniya topilmadi.", 404);

    await companyRef.update({
      companyStatus: body.companyStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await companyRef.collection("accountAuditLogs").add({
      action: "company_status_changed",
      companyStatus: body.companyStatus,
      actorUid: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ companyId, companyStatus: body.companyStatus });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
