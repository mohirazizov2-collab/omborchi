import { collection, doc, type Firestore } from "firebase/firestore";

const FOUNDER_EMAILS = ["f2472839@gmail.com"];

export function isFounder(email?: string | null) {
  return !!email && FOUNDER_EMAILS.includes(email.toLowerCase());
}

export function tenantCollection(
  db: Firestore,
  companyId: string | null | undefined,
  name: string
) {
  return companyId
    ? collection(db, "companies", companyId, name)
    : collection(db, name);
}

export function tenantDoc(
  db: Firestore,
  companyId: string | null | undefined,
  collectionName: string,
  documentId: string
) {
  return companyId
    ? doc(db, "companies", companyId, collectionName, documentId)
    : doc(db, collectionName, documentId);
}

export function companyAuthEmail(companyId: string, username: string) {
  const safeCompanyId = companyId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const safeUsername = username.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  const localPart = `co-${safeCompanyId}__${safeUsername}`;
  if (localPart.length > 64) {
    throw new Error("Korxona ID va login uzunligi birgalikda 59 belgidan oshmasligi kerak.");
  }
  return `${localPart}@accounts.omborchi.uz`;
}

export function companyLoginEmail(companyId: string, username: string) {
  return companyAuthEmail(companyId, username);
}

export function companyIdFromAuthEmail(email?: string | null) {
  const match = email?.match(/^co-([a-z0-9][a-z0-9-]{2,39})__.+@accounts\.omborchi\.uz$/i);
  return match?.[1]?.toLowerCase() ?? null;
}
