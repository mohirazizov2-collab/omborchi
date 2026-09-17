import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, isValidCompanySlug } from "../lib/server/firebase-admin";

dotenv.config({ path: ".env.local" });

async function seed() {
  const slug = (process.env.SEED_COMPANY_SLUG || "farrux-mebel").trim().toLowerCase();
  const companyName = (process.env.SEED_COMPANY_NAME || "Farrux Mebel").trim();
  const username = (process.env.SEED_USERNAME || "admin").trim();
  // Requested local test credentials: admin / 123456. Production deployments
  // must explicitly supply SEED_PASSWORD and replace this initial password.
  const password = process.env.SEED_PASSWORD || (process.env.NODE_ENV === "production" ? undefined : "123456");

  if (!isValidCompanySlug(slug) || !companyName || !username || !password) {
    throw new Error("SEED_COMPANY_SLUG, SEED_COMPANY_NAME, SEED_USERNAME va SEED_PASSWORD kiritilishi shart.");
  }

  const db = getAdminDb();
  const companies = await db.collection("companies").where("slug", "==", slug).limit(1).get();
  const companyRef = companies.empty ? db.collection("companies").doc() : companies.docs[0]!.ref;
  await companyRef.set({ id: companyRef.id, name: companyName, slug, status: "active" }, { merge: true });

  const users = await db.collection("users")
    .where("company_id", "==", companyRef.id)
    .where("username", "==", username)
    .limit(1)
    .get();
  const userRef = users.empty ? db.collection("users").doc() : users.docs[0]!.ref;
  await userRef.set({
    id: userRef.id,
    company_id: companyRef.id,
    username,
    password_hash: await bcrypt.hash(password, 12),
    role: "Admin",
    status: "active",
    created_at: FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`Seed completed: /${slug} — ${username}`);
}

seed().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
});
