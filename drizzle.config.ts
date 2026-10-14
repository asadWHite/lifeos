import { defineConfig } from "drizzle-kit";

/**
 * Push schema to any environment by setting DATABASE_URL:
 *   DATABASE_URL="postgres://..." npx drizzle-kit push
 * Falls back to the local dev database. drizzle-kit auto-loads .env.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
