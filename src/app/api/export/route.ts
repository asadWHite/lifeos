import { NextResponse } from "next/server";
import { getSession } from "@/server/session";
import { db } from "@/db";
import {
  assistantMessages,
  dailyCheckins,
  goals,
  preferences,
  profiles,
  sleepSessions,
  tasks,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Download everything LIFEOS stores for the current profile as JSON. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  const id = session.profile.id;
  const [prefs, goalRows, taskRows, sleepRows, checkinRows, messageRows] = await Promise.all([
    db.select().from(preferences).where(eq(preferences.profileId, id)),
    db.select().from(goals).where(eq(goals.profileId, id)),
    db.select().from(tasks).where(eq(tasks.profileId, id)),
    db.select().from(sleepSessions).where(eq(sleepSessions.profileId, id)),
    db.select().from(dailyCheckins).where(eq(dailyCheckins.profileId, id)),
    db.select().from(assistantMessages).where(eq(assistantMessages.profileId, id)),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    format: "lifeos-export-v1",
    profile: session.profile,
    preferences: prefs[0] ?? null,
    goals: goalRows,
    tasks: taskRows,
    sleepSessions: sleepRows,
    dailyCheckins: checkinRows,
    assistantMessages: messageRows,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="lifeos-export.json"`,
    },
  });
}
