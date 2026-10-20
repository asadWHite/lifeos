import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { authSessions, users, type User } from "@/db/schema";
import { eq, gt, and } from "drizzle-orm";

/* Real session-based authentication.
 * - Password accounts use scrypt-hashed credentials.
 * - Google sign-in uses the standard OAuth 2.0 authorization-code flow
 *   (see /api/auth/google routes). No fake auth anywhere. */

export const SESSION_COOKIE = "lifeos_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split(":");
    if (scheme !== "scrypt" || !salt || !hash) return false;
    const candidate = scryptSync(password, salt, 32);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(authSessions).values({ token, userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(authSessions).where(eq(authSessions.token, token)).catch(() => {});
  }
  jar.delete(SESSION_COOKIE);
}

/** Returns the authenticated user or null. Degrades to null when the
 *  database is unreachable so pages render a signed-out state with a
 *  diagnostic instead of crashing. */
export async function getSessionUser(): Promise<User | null> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const rows = await db
      .select({ user: users })
      .from(authSessions)
      .innerJoin(users, eq(authSessions.userId, users.id))
      .where(and(eq(authSessions.token, token), gt(authSessions.expiresAt, new Date())))
      .limit(1);
    return rows[0]?.user ?? null;
  } catch (e) {
    console.error("[auth] session lookup failed (database reachable?)", e instanceof Error ? e.message : "unknown");
    return null;
  }
}

/* Google sign-in is handled by Firebase Authentication:
 * client SDK (src/lib/firebase.ts) → verified ID token exchange at
 * /api/auth/firebase (src/lib/firebase-token.ts), which calls
 * createSession() above. No client secrets live in this codebase. */
