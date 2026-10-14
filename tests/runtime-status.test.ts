import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyDatabaseIssue } from "../src/server/runtime-status";

/**
 * These tests pin down the *diagnosis* the welcome screen shows. Getting this
 * wrong is not cosmetic: the production failure that motivated this work was a
 * reachable database with no tables being reported as "Database connection
 * failed", which sent the user chasing the wrong problem (and was a dead end).
 */

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  vi.restoreAllMocks();
});

/** Drizzle wraps driver failures: message on top, SQLSTATE code in `cause`. */
function drizzleWrappedError(message: string, cause: unknown): Error {
  return new Error(`Failed query: ${message}`, { cause });
}

describe("classifyDatabaseIssue", () => {
  it("reports a missing DATABASE_URL as incomplete setup, not as a broken connection", () => {
    delete process.env.DATABASE_URL;
    const issue = classifyDatabaseIssue(new Error("DATABASE_URL is not configured."));
    expect(issue.kind).toBe("missing_database_url");
    expect(issue.hint).toMatch(/Supabase/i);
  });

  it("recognises missing tables even when the wrapped error hides the SQLSTATE", () => {
    process.env.DATABASE_URL = "postgresql://user:pw@host:5432/db";
    const pgError = Object.assign(
      new Error('relation "profiles" does not exist'),
      { code: "42P01" },
    );
    const issue = classifyDatabaseIssue(
      drizzleWrappedError(
        'select "id" from "profiles" order by "profiles"."created_at" asc',
        pgError,
      ),
    );
    expect(issue.kind).toBe("schema_missing");
    expect(issue.title).toMatch(/tables are missing/i);
    expect(issue.hint).toMatch(/drizzle-kit push|LIFEOS_AUTO_SCHEMA/i);
  });

  it("explains a wrong password instead of blaming the network", () => {
    process.env.DATABASE_URL = "postgresql://user:pw@host:5432/db";
    const issue = classifyDatabaseIssue(
      drizzleWrappedError("select 1", {
        code: "28P01",
        message: 'password authentication failed for user "postgres"',
      }),
    );
    expect(issue.kind).toBe("connection_failed");
    expect(issue.body).toMatch(/password/i);
  });

  it("explains a timeout without leaking credentials", () => {
    process.env.DATABASE_URL = "postgresql://user:supersecret@host:5432/db";
    const issue = classifyDatabaseIssue(
      new Error("Connection terminated due to connection timeout"),
    );
    expect(issue.kind).toBe("connection_failed");
    expect(issue.body).toMatch(/did not answer in time|timeout/i);
    expect(JSON.stringify(issue)).not.toContain("supersecret");
  });

  it("always produces a title, a body, and an actionable hint", () => {
    process.env.DATABASE_URL = "postgresql://user:pw@host:5432/db";
    for (const error of [
      new Error("something exploded"),
      "plain string failure",
      null,
      undefined,
    ]) {
      const issue = classifyDatabaseIssue(error);
      expect(issue.title.length).toBeGreaterThan(3);
      expect(issue.body.length).toBeGreaterThan(10);
      expect(issue.hint.length).toBeGreaterThan(10);
    }
  });
});
