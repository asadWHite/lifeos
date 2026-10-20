"use client";

/* Centralized Firebase client module (browser-only).
 * - Config comes exclusively from NEXT_PUBLIC_FIREBASE_* env vars — Firebase
 *   Web SDK keys are designed to be public; security is enforced by Firebase
 *   Auth + authorized domains, not by hiding the apiKey.
 * - Initializes exactly once (getApps/getApp), never throws at import time,
 *   and never touches browser APIs during SSR. */
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  type Auth,
  type User,
} from "firebase/auth";

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

function readConfig(): { config: FirebaseWebConfig | null; missing: string[] } {
  const env = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
  const missing = Object.entries({
    NEXT_PUBLIC_FIREBASE_API_KEY: env.apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: env.authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: env.projectId,
    NEXT_PUBLIC_FIREBASE_APP_ID: env.appId,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) return { config: null, missing };
  return { config: env as FirebaseWebConfig, missing: [] };
}

export function firebaseStatus(): { configured: boolean; missing: string[] } {
  return { configured: readConfig().config !== null, missing: readConfig().missing };
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

/** Initialized auth, or null when Firebase isn't configured / we're not in a browser. */
export function getFirebaseAuth(): Auth | null {
  if (typeof window === "undefined") return null;
  if (cachedAuth) return cachedAuth;
  const { config } = readConfig();
  if (!config) return null;
  try {
    cachedApp = getApps().length > 0 ? getApp() : initializeApp(config);
    cachedAuth = getAuth(cachedApp);
    return cachedAuth;
  } catch (e) {
    console.error("[firebase] initialization failed", e instanceof Error ? e.message : "unknown");
    return null;
  }
}

export function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

export async function signInWithGooglePopup(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw Object.assign(new Error("Firebase is not configured"), { code: "auth/not-configured" });
  const result = await signInWithPopup(auth, googleProvider());
  return result.user;
}

/** Redirect fallback when popups are blocked. Returns null (page navigates away). */
export async function signInWithGoogleRedirect(): Promise<null> {
  const auth = getFirebaseAuth();
  if (!auth) throw Object.assign(new Error("Firebase is not configured"), { code: "auth/not-configured" });
  await signInWithRedirect(auth, googleProvider());
  return null;
}

/** Resolve a pending redirect sign-in after returning from Google. */
export async function resolveGoogleRedirect(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  const result = await getRedirectResult(auth);
  return result?.user ?? null;
}

/** Session restoration hook: resolves immediately with the current user (or null),
 *  waiting for Firebase's async persistence restore. */
export function waitForFirebaseUser(timeoutMs = 4000): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsub();
      resolve(auth.currentUser);
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (user) => {
      clearTimeout(timer);
      unsub();
      resolve(user);
    });
  });
}

export async function firebaseSignOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  try {
    await fbSignOut(auth);
  } catch {
    /* best-effort; LifeOS session is the source of truth */
  }
}

/* Human-readable, non-sensitive diagnostics for common Auth errors. */
export function firebaseAuthErrorMessage(code: string | undefined): string {
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "The Google window was closed before sign-in finished. Nothing changed — try again when ready.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. We'll use a full-page redirect instead.";
    case "auth/unauthorized-domain":
      return "This domain isn't authorized in the Firebase project. Add it in Firebase Console → Authentication → Settings → Authorized domains.";
    case "auth/operation-not-allowed":
      return "Google sign-in isn't enabled in the Firebase project (Authentication → Sign-in method → Google).";
    case "auth/network-request-failed":
      return "Network error while contacting Google. Check your connection and try again.";
    case "auth/not-configured":
      return "Firebase is not configured in this deployment (missing NEXT_PUBLIC_FIREBASE_* variables).";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";
    default:
      return "Google sign-in failed. Please try again.";
  }
}
