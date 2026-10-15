"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dailyCheckins, sleepSessions } from "@/db/schema";
import { requireSession } from "@/server/session";
import { checkinSchema, sleepCorrectionSchema } from "@/lib/validation";
import { minutesBetween, todayInTz } from "@/lib/time";
import { MAX_SESSION_MINUTES, sessionNeedsCorrection, validateSessionTimes } from "@/lib/sleep";
import * as demo from "@/server/demo";

const D = demo.isDemoMode;
function refresh() { revalidatePath("/", "layout"); }

export type SleepResult =
  | { ok: true }
  | { ok: true; needsCorrection: boolean; sessionId: string }
  | { ok: false; error: string; needsCorrection?: boolean; sessionId?: string };

export async function startSleepAction(): Promise<SleepResult> {
  try {
    const session = await requireSession();
    if (D()) {
      if (demo.demoGetActiveSleep(session.profile.id)) return { ok: false, error: "Already tracking." };
      demo.demoStartSleep(session.profile.id);
      refresh(); return { ok: true };
    }
    const active = await db.select().from(sleepSessions).where(and(eq(sleepSessions.profileId, session.profile.id), isNull(sleepSessions.endedAt))).limit(1);
    if (active.length > 0) return { ok: false, error: "Already tracking." };
    await db.insert(sleepSessions).values({ profileId: session.profile.id, startedAt: new Date() });
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not start sleep tracking." }; }
}

export async function wakeUpAction(): Promise<SleepResult> {
  try {
    const session = await requireSession();
    const now = new Date();
    if (D()) {
      const active = demo.demoGetActiveSleep(session.profile.id);
      if (!active) return { ok: false, error: "No active session." };
      const dur = minutesBetween(new Date(active.startedAt), now);
      if (dur > MAX_SESSION_MINUTES) return { ok: false, error: "Session over 20h — correct the times.", needsCorrection: true, sessionId: active.id };
      const result = validateSessionTimes(new Date(active.startedAt), now);
      if (!result.ok) return { ok: false, error: result.error };
      demo.demoEndSleep(active.id, now, result.durationMinutes);
      refresh();
      if (sessionNeedsCorrection(result.durationMinutes)) return { ok: true, needsCorrection: true, sessionId: active.id };
      return { ok: true };
    }
    const active = await db.select().from(sleepSessions).where(and(eq(sleepSessions.profileId, session.profile.id), isNull(sleepSessions.endedAt))).limit(1);
    const row = active[0];
    if (!row) return { ok: false, error: "No active session." };
    const duration = minutesBetween(new Date(row.startedAt), now);
    if (duration > MAX_SESSION_MINUTES) return { ok: false, error: "Session over 20h — correct the times.", needsCorrection: true, sessionId: row.id };
    const result = validateSessionTimes(new Date(row.startedAt), now);
    if (!result.ok) return { ok: false, error: result.error };
    await db.update(sleepSessions).set({ endedAt: now, durationMinutes: result.durationMinutes }).where(eq(sleepSessions.id, row.id));
    refresh();
    if (sessionNeedsCorrection(result.durationMinutes)) return { ok: true, needsCorrection: true, sessionId: row.id };
    return { ok: true };
  } catch { return { ok: false, error: "Could not finish the session." }; }
}

export async function correctSleepAction(raw: unknown): Promise<SleepResult> {
  try {
    const session = await requireSession();
    const input = sleepCorrectionSchema.parse(raw);
    const start = new Date(input.startedAt), end = new Date(input.endedAt);
    const result = validateSessionTimes(start, end);
    if (!result.ok) return { ok: false, error: result.error, needsCorrection: true, sessionId: input.id };
    if (D()) {
      demo.demoCorrectSleep(input.id, session.profile.id, start, end, result.durationMinutes);
      refresh(); return { ok: true };
    }
    await db.update(sleepSessions).set({ startedAt: start, endedAt: end, durationMinutes: result.durationMinutes, manual: true }).where(eq(sleepSessions.id, input.id));
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not save the correction." }; }
}

export async function deleteSleepAction(id: string): Promise<SleepResult> {
  try {
    const session = await requireSession();
    if (D()) { demo.demoDeleteSleep(id, session.profile.id); refresh(); return { ok: true }; }
    await db.delete(sleepSessions).where(and(eq(sleepSessions.id, id), eq(sleepSessions.profileId, session.profile.id)));
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not delete the session." }; }
}

export async function saveCheckinAction(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const input = checkinSchema.parse(raw);
    const day = todayInTz(session.profile.timezone);
    if (D()) {
      const patch: Record<string, unknown> = {};
      if (input.energy !== undefined) patch.energy = input.energy ?? null;
      if (input.activityMinutes !== undefined) patch.activityMinutes = input.activityMinutes ?? null;
      if (input.note !== undefined) patch.note = input.note ?? null;
      demo.demoUpsertCheckin(session.profile.id, day, patch);
      refresh(); return { ok: true };
    }
    const values = { profileId: session.profile.id, day, energy: input.energy??null, activityMinutes: input.activityMinutes??null, note: input.note??null };
    await db.insert(dailyCheckins).values(values).onConflictDoUpdate({
      target: [dailyCheckins.profileId, dailyCheckins.day],
      set: { ...(input.energy !== undefined ? { energy: input.energy??null } : {}), ...(input.activityMinutes !== undefined ? { activityMinutes: input.activityMinutes??null } : {}), ...(input.note !== undefined ? { note: input.note??null } : {}) },
    });
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "Could not save." }; }
}
