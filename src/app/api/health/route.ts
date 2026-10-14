import { db, getPool } from "@/db";
import { sql } from "drizzle-orm";
import { checkSchemaReady, isAutoSchemaEnabled } from "@/db/bootstrap";
import {
  classifyDatabaseIssue,
  getDatabaseStatus,
  schemaMissingIssue,
} from "@/server/runtime-status";

export const dynamic = "force-dynamic";

/**
 * Truthful health check: it reports both halves that a working LIFEOS needs —
 * a reachable database *and* the LIFEOS tables. (The old version only ran
 * `select 1`, so it said "ok" on an empty database where the app was unusable.)
 */
export async function GET() {
  const env = getDatabaseStatus();
  try {
    await db.execute(sql`select 1`);
    const schema = await checkSchemaReady(getPool());

    if (!schema.ready) {
      return Response.json(
        {
          ok: false,
          connected: true,
          schemaReady: false,
          autoSchema: isAutoSchemaEnabled(),
          env,
          issue: schemaMissingIssue(),
        },
        { status: 500 },
      );
    }

    return Response.json({
      ok: true,
      connected: true,
      schemaReady: true,
      autoSchema: isAutoSchemaEnabled(),
      env,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        connected: false,
        schemaReady: false,
        autoSchema: isAutoSchemaEnabled(),
        env,
        issue: classifyDatabaseIssue(error),
      },
      { status: 500 },
    );
  }
}
