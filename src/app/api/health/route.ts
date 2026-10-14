import { db } from "@/db";
import { sql } from "drizzle-orm";
import {
  classifyDatabaseIssue,
  getDatabaseStatus,
} from "@/server/runtime-status";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, env: getDatabaseStatus() });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        env: getDatabaseStatus(),
        issue: classifyDatabaseIssue(error),
      },
      { status: 500 },
    );
  }
}
