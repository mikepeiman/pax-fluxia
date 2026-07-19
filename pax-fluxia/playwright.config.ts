import { defineConfig, devices } from "@playwright/test";

// Automated browser + accessibility gate for the UI cutover (megaplan Phase 0
// tooling). Unit tests keep running under Bun's native runner (`bun test`),
// which matches *.test.ts / *.spec.ts — so Playwright specs are named *.e2e.ts
// and Bun ignores them. Run with: `bun run --cwd pax-fluxia test:e2e`.
//
// Viewport matrix mirrors the plan's required sizes (desktop, small desktop,
// tablet, mobile portrait, mobile landscape). Safe-area insets cannot be truly
// emulated by Chromium here; landscape/portrait mobile projects approximate the
// device box and safe-area handling is verified manually.

const PORT = 1420;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  // Baseline suite is small; keep it deterministic and fully serial-friendly.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  outputDir: "./test-results",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {
      name: "desktop-1440",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "desktop-1024",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } },
    },
    {
      name: "tablet-768",
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "mobile-portrait-390",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-landscape-844",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  // Vite client dev server (port 1420, strictPort). Landing + /play routes load
  // without the Colyseus backend, which is enough for baseline route smoke.
  webServer: {
    command: "bun run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
