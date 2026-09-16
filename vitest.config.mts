import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", "src/__tests__/integration/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/budgeting/**/*.ts"],
    },
  },
});
