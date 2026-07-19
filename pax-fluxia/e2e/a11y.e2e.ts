import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Accessibility BASELINE (megaplan Phase 0). This captures the current WCAG
// 2.x A/AA findings on covered chrome as *debt*, not accepted compliance — the
// suite records violations and stays green. Phase 1 flips the covered surfaces
// to a hard gate (`expect(violations).toEqual([])`) once they are cleaned.
//
// Findings are written to test-results/a11y-baseline/<surface>.json (gitignored)
// and attached to the HTML report so the debt is reviewable per surface.

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scanAndRecord(
  page: import("@playwright/test").Page,
  testInfo: import("@playwright/test").TestInfo,
  surface: string,
) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const violations = results.violations;

  const summary = violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    help: v.help,
  }));

  const outPath = resolve(testInfo.project.outputDir, "a11y-baseline", `${surface}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify({ surface, violations }, null, 2), "utf-8");
  await testInfo.attach(`a11y-${surface}`, {
    body: JSON.stringify(summary, null, 2),
    contentType: "application/json",
  });

  // eslint-disable-next-line no-console
  console.log(
    `[a11y baseline] ${surface}: ${violations.length} rule(s) ` +
      `(${violations.reduce((n, v) => n + v.nodes.length, 0)} node(s)) — ` +
      (summary.map((s) => `${s.id}[${s.impact}]`).join(", ") || "clean"),
  );

  // Debt capture only — do NOT fail the build yet. Assert the scan ran.
  expect(Array.isArray(violations)).toBe(true);
}

// One representative desktop project is enough for the baseline; expand per
// surface as the redesign lands.
test.describe("accessibility baseline (debt capture)", () => {
  test("landing (/) WCAG A/AA baseline", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1440", "baseline captured on desktop-1440 only");
    await page.goto("/");
    await page.getByRole("button", { name: /play the alpha/i }).first().waitFor();
    await scanAndRecord(page, testInfo, "landing");
  });

  test("game shell (/play) WCAG A/AA baseline", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1440", "baseline captured on desktop-1440 only");
    await page.goto("/play");
    await page.waitForFunction(() => window.__PAX_HOME_ROUTE_READY__ === true, {
      timeout: 30_000,
    });
    await page
      .waitForFunction(() => window.__PAX_GAME_SHELL_DIAG__?.gameContainerMounted === true, {
        timeout: 30_000,
      })
      .catch(() => {});
    await scanAndRecord(page, testInfo, "play");
  });
});
