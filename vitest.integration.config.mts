import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: false,
    include: ["src/__tests__/integration/**/*.test.ts"],
    setupFiles: ["src/__tests__/integration/setup.ts"],
    // These hit a real (throwaway) SQLite file via Prisma, so run them
    // one at a time rather than in parallel worker processes.
    fileParallelism: false,
  },
});
