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
import { companyAuthEmail, companyIdFromAuthEmail } from "@/lib/tenancy";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ companyId: string; uid: string }> }
) {
  try {
    const actor = await requireSuperAdmin(request);
    const params = await context.params;
    const companyId = validateCompanyId(routeParam(params.companyId));
    const uid = routeParam(params.uid);
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) {
      throw new AdminApiError("Foydalanuvchi ID noto'g'ri.", 400);
    }
    const body = await readJsonObject(request);
    const userRef = adminDb.collection("companies").doc(companyId).collection("users").doc(uid);
    const [company, profile] = await Promise.all([
      adminDb.collection("companies").doc(companyId).get(),
      userRef.get(),
    ]);
    if (!company.exists) throw new AdminApiError("Kompaniya topilmadi.", 404);
    if (!profile.exists) throw new AdminApiError("Foydalanuvchi topilmadi.", 404);

    const data = profile.data() ?? {};
    const action = body.action;
    const authUser = await adminAuth.getUser(uid);
    if (companyIdFromAuthEmail(authUser.email) !== companyId) {
      throw new AdminApiError("Akkaunt tanlangan kompaniyaga tegishli emas.", 409);
    }

    if (action === "resetPassword") {
      const password = validatePassword(body.password);
      await adminAuth.updateUser(uid, { password });
      await adminAuth.revokeRefreshTokens(uid);
      await adminDb.collection("companies").doc(companyId).collection("accountAuditLogs").add({
        action: "password_reset",
        targetUid: uid,
        actorUid: actor.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true });
    }

    if (action === "status") {
      const status = body.status;
      if (status !== "active" && status !== "inactive") {
        throw new AdminApiError("Akkaunt holatini tanlang.", 400);
      }
      if (status === "inactive" && data.role === "Admin") {
        const activeAdmins = await adminDb
          .collection("companies")
          .doc(companyId)
          .collection("users")
          .get();
        const hasAnotherActiveAdmin = activeAdmins.docs.some(
          (entry) =>
            entry.id !== uid &&
            entry.data().role === "Admin" &&
            entry.data().status !== "inactive"
        );
        if (!hasAnotherActiveAdmin) {
          throw new AdminApiError("Kompaniyada kamida bitta faol Admin qolishi kerak.", 409);
        }
      }

      await adminAuth.updateUser(uid, { disabled: status === "inactive" });
      try {
        await userRef.update({
          status,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (error) {
        await adminAuth.updateUser(uid, { disabled: authUser.disabled ?? false });
        throw error;
      }
      await adminDb.collection("companies").doc(companyId).collection("accountAuditLogs").add({
        action: "account_status_changed",
        targetUid: uid,
        status,
        actorUid: actor.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, status });
    }

    if (action === "update") {
      const firstName = requiredText(body.firstName, "Ism");
      const lastName = requiredText(body.lastName, "Familiya");
      const username = validateUsername(body.username, companyId);
      const role = validateEmployeeRole(body.role);
      const phone = optionalText(body.phone, "Telefon", 40) ?? "";
      const position = optionalText(body.position, "Lavozim", 80) ?? "";
      if (data.role === "Admin" && role !== "Admin") {
        const companyUsers = await adminDb
          .collection("companies")
          .doc(companyId)
          .collection("users")
          .get();
        const hasAnotherActiveAdmin = companyUsers.docs.some(
          (entry) =>
            entry.id !== uid &&
            entry.data().role === "Admin" &&
            entry.data().status !== "inactive"
        );
        if (!hasAnotherActiveAdmin) {
          throw new AdminApiError("Kompaniyada kamida bitta faol Admin qolishi kerak.", 409);
        }
      }
      const email = companyAuthEmail(companyId, username);
      const oldAuth = {
        email: authUser.email,
        displayName: authUser.displayName,
        emailVerified: authUser.emailVerified,
      };

      await adminAuth.updateUser(uid, {
        email,
        displayName: `${firstName} ${lastName}`,
        emailVerified: false,
      });
      try {
        await userRef.update({
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`,
          username,
          email,
          phone,
          position,
          role,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (error) {
        await adminAuth.updateUser(uid, oldAuth);
        throw error;
      }
      await adminDb.collection("companies").doc(companyId).collection("accountAuditLogs").add({
        action: "account_updated",
        targetUid: uid,
        role,
        actorUid: actor.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true });
    }

    throw new AdminApiError("Akkaunt amali noto'g'ri.", 400);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
