import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length) return getApps()[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to .env.local.");
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export type CompanyRecord = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
};

export type UserRecord = {
  id: string;
  company_id: string;
  username: string;
  password_hash: string;
  role: string;
  status: "active" | "blocked";
  created_at: FirebaseFirestore.Timestamp;
};

export function isValidCompanySlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export async function findCompanyBySlug(slug: string): Promise<CompanyRecord | null> {
  if (!isValidCompanySlug(slug)) return null;

  const snapshot = await getAdminDb()
    .collection("companies")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0]!;
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    slug: data.slug,
    status: data.status === "active" ? "active" : "inactive",
  };
}
