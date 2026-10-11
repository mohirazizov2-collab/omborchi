import "server-only";

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { firebaseConfig } from "@/firebase/config";

const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID ??
  process.env.GCLOUD_PROJECT ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
  firebaseConfig.projectId;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!projectId) {
  throw new Error("Firebase Admin project ID is not configured.");
}
if ((clientEmail && !privateKey) || (!clientEmail && privateKey)) {
  throw new Error("Both Firebase Admin client email and private key must be configured together.");
}

const existingApp = getApps().find((app) => app.name === "omborchi-admin");
const adminApp =
  existingApp ??
  initializeApp(
    {
      credential:
        clientEmail && privateKey
          ? cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, "\n"),
            })
          : applicationDefault(),
      projectId,
    },
    "omborchi-admin"
  );

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
