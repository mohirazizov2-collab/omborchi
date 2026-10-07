import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/server/firebase-admin";

export async function recordLogin(companyId: string, userId: string) {
  try {
    const db = getAdminDb();
    const day = new Date().toISOString().slice(0, 10);
    const batch = db.batch();
    batch.set(db.doc(`users/${userId}`), {
      last_login_at: FieldValue.serverTimestamp(),
      login_count: FieldValue.increment(1),
    }, { merge: true });
    batch.set(db.doc(`companies/${companyId}`), {
      last_active_at: FieldValue.serverTimestamp(),
      login_count: FieldValue.increment(1),
    }, { merge: true });
    batch.set(db.doc(`dailyStats/${day}`), {
      day,
      logins: FieldValue.increment(1),
    }, { merge: true });
    await batch.commit();
  } catch {
    // statistika xatosi kirishni to'xtatmasligi kerak
  }
}