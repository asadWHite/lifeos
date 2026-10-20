"use client";

/* Tiny typed fetch wrapper for client components. Never swallows errors:
 * callers always receive the failure so they can keep the user's input. */

export interface NewAchievement {
  key: string;
  title: string;
  description: string;
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: (T & { newAchievements?: NewAchievement[] }) | null;
  error: string | null;
}

export async function api<T = Record<string, unknown>>(
  path: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => null)) as (T & { error?: string; ok?: boolean }) | null;
    if (!res.ok) {
      return { ok: false, status: res.status, data: null, error: json?.error ?? `Request failed (${res.status}).` };
    }
    return { ok: true, status: res.status, data: json as T & { newAchievements?: NewAchievement[] }, error: null };
  } catch {
    return { ok: false, status: 0, data: null, error: "Network error — check your connection and try again." };
  }
}
