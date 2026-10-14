import "server-only";

import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

const projectId =
  readEnv("FIREBASE_ADMIN_PROJECT_ID") ??
  readEnv("GCLOUD_PROJECT") ??
  readEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");

if (!projectId) {
  throw new Error(
    "Firebase Admin project ID sozlanmagan. FIREBASE_ADMIN_PROJECT_ID ni server env'ga qo‘shing."
  );
}

const clientEmail = readEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
const rawPrivateKey = readEnv("FIREBASE_ADMIN_PRIVATE_KEY");

if (Boolean(clientEmail) !== Boolean(rawPrivateKey)) {
  throw new Error(
    "FIREBASE_ADMIN_CLIENT_EMAIL va FIREBASE_ADMIN_PRIVATE_KEY birga berilishi kerak."
  );
}

// Klient project ID bilan server project ID mos kelishini ogohlantirish
const clientProjectId = readEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
if (clientProjectId && clientProjectId !== projectId) {
  console.warn(
    `[firebase-admin] Project mos emas: klient="${clientProjectId}", server="${projectId}".`
  );
}

// Service account boshqa project’dan bo‘lsa, ogohlantirish
if (clientEmail && !clientEmail.endsWith(`@${projectId}.iam.gserviceaccount.com`)) {
  console.warn(
    `[firebase-admin] Service account (${clientEmail}) project "${projectId}" ga tegishli emas ko‘rinadi.`
  );
}

const APP_NAME = "omborchi-admin";
const existingApp = getApps().find((app) => app.name === APP_NAME);

const adminApp: App =
  existingApp ??
  initializeApp(
    {
      credential:
        clientEmail && rawPrivateKey
          ? cert({
              projectId,
              clientEmail,
              privateKey: rawPrivateKey.replace(/\\n/g, "\n"),
            })
          : applicationDefault(),
      projectId,
    },
    APP_NAME
  );

export const adminProjectId = projectId;
export const adminCredentialType = clientEmail ? "service-account" : "application-default";

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

console.info(
  `[firebase-admin] project=${projectId} credential=${adminCredentialType}`
);
