import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Server modules guard themselves with `server-only`, which throws outside
      // a React Server Component bundle. In tests (plain Node) we stub it so the
      // pure logic inside those modules stays unit-testable.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
