/**
 * Shared setup for integration tests (§8.2): each suite gets its own
 * temporary SQLite database file, migrated with the project's real
 * migrations (including the RecipeLine XOR triggers), and torn down
 * afterwards. Not itself a test file (no .test.ts suffix), so Vitest's
 * include glob does not try to run it directly.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface TestDatabase {
  databaseUrl: string;
  dbPath: string;
  cleanup: () => void;
}

const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");

/** Creates a fresh, fully-migrated SQLite database file under the OS temp
 * directory and returns its `file:` URL. Call `cleanup()` in `afterAll` to
 * remove the file (and any -journal/-wal/-shm siblings SQLite leaves). */
export function createTestDatabase(): TestDatabase {
  const dbPath = path.join(
    os.tmpdir(),
    `costing-planner-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
  );
  const databaseUrl = `file:${dbPath}`;

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });

  return {
    databaseUrl,
    dbPath,
    cleanup: () => {
      for (const suffix of ["", "-journal", "-wal", "-shm"]) {
        const candidate = dbPath + suffix;
        if (fs.existsSync(candidate)) {
          fs.rmSync(candidate);
        }
      }
    },
  };
}
