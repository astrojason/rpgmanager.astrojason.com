import { App, cert, getApps, initializeApp } from "firebase-admin/app";

let adminApp: App | null = null;

function getPrivateKey(): string {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!rawKey) {
    throw new Error("FIREBASE_PRIVATE_KEY is not set");
  }
  return rawKey.replace(/\\n/g, "\n");
}

export function getAdminApp(): App {
  if (adminApp) return adminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !clientEmail) {
    throw new Error("Missing Firebase admin environment variables");
  }

  adminApp =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: getPrivateKey(),
      }),
    });

  return adminApp;
}
