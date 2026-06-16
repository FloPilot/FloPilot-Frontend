import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Email + password only. We do not use Firebase Dynamic Links or
 * signInWithEmailLink, so the Dynamic Links shutdown notice in the
 * Firebase console does not affect this app.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

function assertConfig() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error(
      "Missing Firebase config. Copy frontend/.env.local.example to .env.local and run backend/scripts/setup-firebase-auth.sh"
    );
  }
}

let app: FirebaseApp;
let auth: Auth;

export function getFirebaseApp() {
  if (!getApps().length) {
    assertConfig();
    app = initializeApp(firebaseConfig);
  }
  return app ?? getApps()[0];
}

export function getFirebaseAuth() {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function isFirebaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}
