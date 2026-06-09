import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Initialise the Admin SDK exactly once. In dev, Astro reloads modules, so we
// guard against double-initialisation with getApps().
function getAdminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0];

  const projectId = import.meta.env.FIREBASE_PROJECT_ID;
  const clientEmail = import.meta.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = import.meta.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin env vars. Set FIREBASE_PROJECT_ID, " +
        "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (see .env.example)."
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      // Env vars store newlines as the literal characters "\n".
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

let db: Firestore | null = null;

export function getDb(): Firestore {
  if (!db) db = getFirestore(getAdminApp());
  return db;
}
