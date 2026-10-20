import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUser } from "@/lib/auth";
import { todayInTz } from "@/lib/dates";
import type { User } from "@/db/schema";

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function jsonOk<T extends Record<string, unknown>>(data: T, init?: { status?: number }) {
  return NextResponse.json({ ok: true, ...data }, { status: init?.status ?? 200 });
}

/** Authenticated user for a route handler, or a ready 401 response. */
export async function requireUser(): Promise<{ user: User } | { response: NextResponse }> {
  const user = await getSessionUser();
  if (!user) return { response: jsonError(401, "Not authenticated") };
  return { user };
}

/** The user's "today" in their configured timezone. */
export function userToday(user: User): string {
  return todayInTz(user.timezone);
}

const DB_ERROR_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "57P01", "08006", "08001"]);

export function handleApiError(e: unknown, fallback = "Something went wrong") {
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return jsonError(422, first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input", {
      issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const code = (e as { code?: string } | null)?.code;
  if (code && DB_ERROR_CODES.has(code)) {
    console.error("[api] database connection failed:", code);
    return jsonError(503, "The LifeOS database can't be reached right now. Please try again shortly.");
  }
  console.error("[api]", fallback, e);
  return jsonError(500, fallback);
}
