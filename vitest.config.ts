import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    globalSetup: ["tests/unit/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://sorteo:sorteo@localhost:5432/sorteo_test",
      DRAND_MODE: "mock",
      ENABLE_TEST_CLOCK: "false",
      NODE_ENV: "test",
    },
  },
});
