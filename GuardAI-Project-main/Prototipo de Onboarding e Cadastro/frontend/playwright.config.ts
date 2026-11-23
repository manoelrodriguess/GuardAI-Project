import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  expect: { timeout: 10_000 },
  timeout: 60_000,
  use: { baseURL: "http://127.0.0.1:5174", channel: process.platform === "win32" ? "msedge" : undefined, trace: "retain-on-failure" },
  webServer: [
    { command: process.platform === "win32" ? '"..\\backend\\.venv\\Scripts\\python.exe" "..\\backend\\test_server.py"' : '"../backend/.venv/bin/python" "../backend/test_server.py"', url: "http://127.0.0.1:8011/api/health", reuseExistingServer: false },
    { command: "npm run dev -- --port 5174", url: "http://127.0.0.1:5174", reuseExistingServer: false, env: { GUARDAI_API_TARGET: "http://127.0.0.1:8011" } },
  ],
})
