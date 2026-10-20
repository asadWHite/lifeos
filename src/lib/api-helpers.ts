import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUser } from "@/lib/auth";
import { ensureSchema } from "@/db/bootstrap";
import { resolvePostgresUrl } from "@/lib/supabase";
import { todayInTz } from "@/lib/dates";
import type { User } from "@/db/schema";

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/** Safe diagnostic tag: standard network/pg error codes only (never messages,
 *  which could theoretically embed connection details). */
function diagCode(e: unknown): string | null {
  const code = (e as { code?: unknown } | null)?.code;
  if (typeof code === "string" && /^(E[A-Z_]+|[0-9A-Z]{5})$/.test(code)) return code;
  const name = (e as { name?: unknown } | null)?.name;
  return typeof name === "string" ? name.slice(0, 40) : null;
}

export function jsonOk<T extends Record<string, unknown>>(data: T, init?: { status?: number }) {
  return NextResponse.json({ ok: true, ...data }, { status: init?.status ?? 200 });
}

/** Authenticated user for a route handler, or a ready 401/503 response. */
export async function requireUser(): Promise<{ user: User } | { response: NextResponse }> {
  try {
    await ensureSchema();
  } catch (e) {
    console.error("[api] schema bootstrap failed");
    return { response: handleApiError(e, "The LifeOS database can't be reached right now.") };
  }
  const user = await getSessionUser();
  if (!user) return { response: jsonError(401, "Not authenticated") };
  return { user };
}

/** The user's "today" in their configured timezone. */
export function userToday(user: User): string {
  return todayInTz(user.timezone);
}

const DB_ERROR_CODES = new Set([
  "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN",
  "ENETUNREACH", "EHOSTUNREACH", "EPIPE", "3D000", "57P01", "08006", "08001", "57P03",
]);

function isDbConnectionError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const code = (e as { code?: string }).code;
  if (code && DB_ERROR_CODES.has(code)) return true;
  // Node ≥ 20 wraps dual-stack failures in AggregateError (e.errors[]).
  const inner = (e as { errors?: unknown[] }).errors;
  if (Array.isArray(inner)) return inner.some(isDbConnectionError);
  const msg = (e as { message?: string }).message ?? "";
  return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|EAI_AGAIN|connection terminated|does not exist|timeout exceeded/i.test(msg);
}

export function handleApiError(e: unknown, fallback = "Something went wrong") {
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return jsonError(422, first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input", {
      issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  if (isDbConnectionError(e)) {
    console.error("[api] database connection failed");
    return jsonError(503, "The LifeOS database can't be reached right now. Please try again shortly.");
  }
  // Deterministic config check: with no resolvable Postgres connection
  // string, database failures are configuration problems by definition —
  // report them honestly as 503.
  if (!resolvePostgresUrl().url) {
    console.error("[api] no Postgres connection string configured");
    return jsonError(503, "The LifeOS database isn't configured on this deployment yet.", { diag: "DATABASE_URL_MISSING" });
  }
  console.error("[api]", fallback, e);
  const diag = diagCode(e);
  return jsonError(500, fallback, diag ? { diag } : {});
}
