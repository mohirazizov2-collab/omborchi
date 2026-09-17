import { findCompanyBySlug as findFirestoreCompany, getAdminDb, isValidCompanySlug, type CompanyRecord, type UserRecord } from "@/lib/server/firebase-admin";

const hasAdminCredentials = () => Boolean(
  process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY,
);

// This is intentionally development-only. It lets the requested login flow be
// tested locally without placing a service-account private key on a developer's machine.
const localCompany: CompanyRecord = {
  id: "local-farrux-mebel",
  name: "Farrux Mebel",
  slug: "farrux-mebel",
  status: "active",
};

const localUser = {
  id: "local-admin",
  company_id: localCompany.id,
  username: "admin",
  // bcrypt hash for the local-only test password: 123456
  password_hash: "$2a$12$t.T0Pkseiy.hS.i8c3hUaO/PfVlRtkcQP20yzCgHdLKoZ.s6hiznu",
  role: "Admin",
  status: "active",
} as Omit<UserRecord, "created_at">;

export async function findLoginCompany(slug: string) {
  if (hasAdminCredentials()) return findFirestoreCompany(slug);
  if (process.env.NODE_ENV !== "production" && slug === localCompany.slug) return localCompany;
  return null;
}

export async function findLoginUser(companyId: string, username: string): Promise<Omit<UserRecord, "created_at"> | null> {
  if (!hasAdminCredentials()) {
    return process.env.NODE_ENV !== "production" && companyId === localUser.company_id && username === localUser.username
      ? localUser
      : null;
  }

  const users = await getAdminDb()
    .collection("users")
    .where("company_id", "==", companyId)
    .where("username", "==", username)
    .limit(1)
    .get();
  if (users.empty) return null;
  const doc = users.docs[0]!;
  return { id: doc.id, ...doc.data() } as Omit<UserRecord, "created_at">;
}

export { isValidCompanySlug };
