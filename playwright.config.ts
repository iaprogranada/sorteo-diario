import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  workers: 1,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", locale: "es-ES", screenshot: "only-on-failure" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
