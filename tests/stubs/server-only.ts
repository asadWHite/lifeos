/**
 * Test stub for the `server-only` package.
 *
 * Next.js resolves `server-only` to an empty module for server components and
 * to a throwing module for client bundles. Vitest runs plain Node, where the
 * throwing variant would be picked — making server modules untestable. This
 * stub lets unit tests import the pure logic inside server modules safely.
 */
export {};
