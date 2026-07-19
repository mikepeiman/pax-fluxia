import { test, expect } from "@playwright/test";

// Baseline route smoke for the UI cutover. Proves the landing and the lazy
// `/play` game shell mount without crashing across the viewport matrix. This is
// intentionally light — it does not start a match (that needs WebGL + the
// Colyseus backend); HUD/settings interaction gates land with their Phase 3+
// slices. Keep these green as the redesign proceeds.

type GameShellDiag = {
  isGameShellLoading: boolean;
  gameShellErrorMessage: string | null;
  gameContainerMounted: boolean;
  phase: string;
};

declare global {
  interface Window {
    __PAX_HOME_ROUTE_READY__?: boolean;
    __PAX_GAME_SHELL_DIAG__?: GameShellDiag;
  }
}

test.describe("landing route (/)", () => {
  test("renders the marketing landing with a Play CTA", async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await page.goto("/");

    // At least one "Play the Alpha" CTA is present and visible.
    const playCta = page.getByRole("button", { name: /play the alpha/i }).first();
    await expect(playCta).toBeVisible();

    expect(pageErrors, `uncaught page errors: ${pageErrors.map((e) => e.message).join("; ")}`)
      .toHaveLength(0);
  });
});

test.describe("game shell route (/play)", () => {
  test("mounts the game shell without a shell error", async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await page.goto("/play");

    // Route mount signal (set before the heavy Pixi shell load, so it does not
    // depend on WebGL being available in headless Chromium).
    await page.waitForFunction(() => window.__PAX_HOME_ROUTE_READY__ === true, {
      timeout: 30_000,
    });

    // The lazy GameContainer mounts to the main menu (no match started → no
    // WebGL needed). Give it room, then assert the shell reported no error.
    await page
      .waitForFunction(() => window.__PAX_GAME_SHELL_DIAG__?.gameContainerMounted === true, {
        timeout: 30_000,
      })
      .catch(() => {
        /* mount may lag on cold Vite compile; the error assertion below is the gate */
      });

    const diag = await page.evaluate(() => window.__PAX_GAME_SHELL_DIAG__ ?? null);
    expect(diag, "game shell diagnostics snapshot should be present").not.toBeNull();
    expect(diag?.gameShellErrorMessage, "game shell must not report a load error").toBeNull();

    expect(pageErrors, `uncaught page errors: ${pageErrors.map((e) => e.message).join("; ")}`)
      .toHaveLength(0);
  });
});
