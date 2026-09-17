import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

const slug = (process.env.SEED_COMPANY_SLUG || "farrux-mebel").trim().toLowerCase();
const companyName = (process.env.SEED_COMPANY_NAME || "Farrux Mebel").trim();
const username = (process.env.SEED_USERNAME || "admin").trim();
const password = process.env.SEED_PASSWORD || (process.env.NODE_ENV === "production" ? undefined : "123456");
const isValidSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

if (!isValidSlug || !companyName || !username || !password) {
  throw new Error("SEED_COMPANY_SLUG, SEED_COMPANY_NAME, SEED_USERNAME va SEED_PASSWORD kiritilishi shart.");
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!projectId || !clientEmail || !privateKey) {
  if (process.env.NODE_ENV !== "production") {
    console.log("Local development account is ready: /farrux-mebel — admin / 123456");
    process.exit(0);
  }
  const missing = [!projectId && "FIREBASE_PROJECT_ID", !clientEmail && "FIREBASE_CLIENT_EMAIL", !privateKey && "FIREBASE_PRIVATE_KEY"].filter(Boolean).join(", ");
  throw new Error(`Firebase Admin sozlanmagan. .env.local ga quyidagi Service Account kalitlarini qoshish kerak: ${missing}`);
}

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);

const companies = await db.collection("companies").where("slug", "==", slug).limit(1).get();
const companyRef = companies.empty ? db.collection("companies").doc() : companies.docs[0].ref;
await companyRef.set({ id: companyRef.id, name: companyName, slug, status: "active" }, { merge: true });

const users = await db.collection("users")
  .where("company_id", "==", companyRef.id)
  .where("username", "==", username)
  .limit(1)
  .get();
const userRef = users.empty ? db.collection("users").doc() : users.docs[0].ref;
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
