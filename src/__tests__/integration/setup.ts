// Runs once before the integration test file(s). Points Prisma at a
// throwaway SQLite file (never the dev database) and pushes the current
// schema onto it, so these tests always start from a known-empty schema.
import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

const testDbPath = path.join(process.cwd(), "prisma", "test.db");
const testDatabaseUrl = `file:${testDbPath}`;

// Start from a clean file each run rather than using `--force-reset`
// (which some tooling refuses to run non-interactively as a safety
// measure) — deleting a throwaway test-only file first has the same
// effect.
for (const file of [testDbPath, `${testDbPath}-journal`]) {
  if (existsSync(file)) unlinkSync(file);
}

process.env.DATABASE_URL = testDatabaseUrl;

execSync("npx prisma migrate deploy", {
  cwd: process.cwd(),
  env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  stdio: "pipe",
});
