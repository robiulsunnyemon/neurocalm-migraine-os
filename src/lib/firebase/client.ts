import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import {
  enableMultiTabIndexedDbPersistence,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let persistenceAttempted = false;

export function getFirebaseClient(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  googleProvider: GoogleAuthProvider;
} {
  const googleProvider = new GoogleAuthProvider();

  if (typeof window === "undefined" || !isFirebaseConfigured) {
    return { app: null, auth: null, firestore: null, googleProvider };
  }

  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);

    if (!persistenceAttempted && firestore) {
      persistenceAttempted = true;
      enableMultiTabIndexedDbPersistence(firestore).catch(() => {
        // Ignore if another tab holds persistence or browser doesn't support it
      });
    }
  }

  return { app, auth, firestore, googleProvider };
}
