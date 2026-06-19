<script lang="ts">
  import { onMount } from "svelte";
  import "../app.css";
  import LandingPage from "$lib/components/landing-site";
  import { audioManager } from "$lib/services/audioManager.svelte";
  import { log } from "$lib/utils/logger";
  import {
    type HomeRouteDiagSnapshot,
    getHomeRouteDiagSnapshot,
    installHomeRouteGlobalErrorHandlers,
    pushHomeRouteDiagError,
    pushHomeRouteDiagEvent,
    resetHomeRouteDiagnostics,
  } from "$lib/utils/homeRouteDiagnostics";
  import PaxFluxiaHud from "$lib/components/ui/HUD-package/PaxFluxiaHud.svelte";
  import {
    canAccessAudience,
    resolveAudienceAccess,
  } from "$lib/shell/audience";

  const EMPTY_HOME_ROUTE_DIAG: HomeRouteDiagSnapshot = {
    lastUpdatedAt: null,
    events: [],
    errors: [],
  };

  type GameShellDiagnosticsSnapshot = {
    showGame: boolean;
    isGameShellLoading: boolean;
    gameShellErrorMessage: string | null;
    hasGameContainerComponent: boolean;
    gameContainerMounted: boolean;
    phase: string;
    lastUpdatedAt: string | null;
    events: HomeRouteDiagSnapshot["events"];
    errors: HomeRouteDiagSnapshot["errors"];
  };

  type HomeRouteWindow = Window &
    typeof globalThis & {
      __PAX_HOME_ROUTE_READY__?: boolean;
      __PAX_GAME_SHELL_DIAG__?: GameShellDiagnosticsSnapshot;
    };

  type GameContainerModule =
    typeof import("$lib/components/game/GameContainer.svelte");

  let showGame = $state(false);
  let isGameShellLoading = $state(false);
  let gameShellErrorMessage = $state<string | null>(null);
  let gameContainerRenderPromise = $state<Promise<GameContainerModule> | null>(
    null,
  );
  let hasGameContainerComponent = $state(false);
  let gameContainerMounted = $state(false);
  let startupDiagnosticsOptIn = $state(false);
  let homeRouteDiagnostics = $state<HomeRouteDiagSnapshot>(
    EMPTY_HOME_ROUTE_DIAG,
  );
  let copyDiagnosticsFeedback = $state("");
  let benchmarkDisposer: (() => void) | null = null;
  let gameContainerLoadPromise: Promise<void> | null = null;
  let gameShellWarmupStarted = false;
  let audienceAccess = $state(
    resolveAudienceAccess({
      isDev: import.meta.env.DEV,
    }),
  );

  const recentHomeRouteEvents = $derived(
    [...homeRouteDiagnostics.events].slice(-6).reverse(),
  );
  const recentHomeRouteErrors = $derived(
    [...homeRouteDiagnostics.errors].slice(-4).reverse(),
  );
  const showStartupDiagnostics = $derived(
    canAccessAudience("internal", audienceAccess) &&
      (Boolean(gameShellErrorMessage) || startupDiagnosticsOptIn),
  );
  const gameShellPhase = $derived(
    showGame
      ? gameContainerMounted
        ? "mounted"
        : "show_game_requested"
      : isGameShellLoading
        ? "loading"
        : gameShellErrorMessage
          ? "error"
          : hasGameContainerComponent
            ? "component_ready"
            : "landing",
  );

  function getBrowserWindow(): HomeRouteWindow | null {
    return typeof window === "undefined" ? null : (window as HomeRouteWindow);
  }

  function recordHomeRouteEvent(
    kind: string,
    detail?: Record<string, unknown> | null,
  ) {
    homeRouteDiagnostics = pushHomeRouteDiagEvent(kind, detail);
  }

  function recordHomeRouteError(
    source: string,
    error: unknown,
    detail?: Record<string, unknown> | null,
  ) {
    homeRouteDiagnostics = pushHomeRouteDiagError(source, error, detail);
  }

  function refreshHomeRouteDiagnostics() {
    homeRouteDiagnostics = getHomeRouteDiagSnapshot();
  }

  function describeGameShellLoadError(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return "The game shell failed to load. Please try again.";
  }

  function setCopyDiagnosticsFeedback(message: string) {
    copyDiagnosticsFeedback = message;
    const browserWindow = getBrowserWindow();
    if (browserWindow) {
      browserWindow.setTimeout(() => {
        if (copyDiagnosticsFeedback === message) {
          copyDiagnosticsFeedback = "";
        }
      }, 1800);
    }
  }

  async function copyGameShellDiagnostics() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyDiagnosticsFeedback("Clipboard unavailable.");
      return;
    }

    try {
      const payload = JSON.stringify(
        getBrowserWindow()?.__PAX_GAME_SHELL_DIAG__ ?? {},
        null,
        2,
      );
      await navigator.clipboard.writeText(payload);
      recordHomeRouteEvent("diagnostics_copied", {
        bytes: payload.length,
      });
      setCopyDiagnosticsFeedback("Copied.");
    } catch (error) {
      recordHomeRouteError("copy_diagnostics", error);
      setCopyDiagnosticsFeedback("Copy failed.");
    }
  }

  async function loadGameContainerModule(): Promise<GameContainerModule> {
    // Single import attempt only — no retry. Importing the game shell pulls in
    // PixiJS, which registers global extension handlers as an import side
    // effect. If the import fails *after* those handlers register, retrying
    // re-runs the registration and throws "Extension type environment already
    // has a handler" — a worse, misleading failure that masks the real cause.
    // A retry can never safely recover this module, so we surface the first
    // error directly. (Previously DEV retried twice and could trigger exactly
    // this double-registration crash.)
    recordHomeRouteEvent("game_shell_import_attempt", {
      attempt: 1,
      maxAttempts: 1,
    });
    try {
      const module = await import("$lib/components/game/GameContainer.svelte");
      recordHomeRouteEvent("game_shell_import_succeeded", { attempt: 1 });
      return module;
    } catch (error) {
      recordHomeRouteError("game_shell_import_failed", error, {
        attempt: 1,
        maxAttempts: 1,
      });
      log.error("LandingRoute", "Game shell import failed", error);
      throw error;
    }
  }

  async function ensureGameShellLoaded(): Promise<void> {
    if (hasGameContainerComponent && gameContainerRenderPromise) {
      recordHomeRouteEvent("game_shell_component_already_ready", null);
      await gameContainerRenderPromise;
      return;
    }
    if (!gameContainerLoadPromise) {
      gameContainerRenderPromise = loadGameContainerModule();
      gameContainerLoadPromise = gameContainerRenderPromise
        .then(() => {
          hasGameContainerComponent = true;
          gameShellErrorMessage = null;
        })
        .catch((error) => {
          gameContainerRenderPromise = null;
          hasGameContainerComponent = false;
          throw error;
        })
        .finally(() => {
          if (!hasGameContainerComponent || !gameContainerRenderPromise) {
            gameContainerLoadPromise = null;
          }
        });
    } else {
      recordHomeRouteEvent("game_shell_import_reused_inflight_promise", null);
    }
    try {
      await gameContainerLoadPromise;
    } catch (error) {
      if (!hasGameContainerComponent) {
        gameContainerLoadPromise = null;
      }
      throw error;
    }
  }

  async function openGameShell(
    trigger: "play" | "query" | "benchmark" | "warmup" = "play",
  ): Promise<boolean> {
    const interactiveOpen = trigger !== "warmup";
    recordHomeRouteEvent("open_game_shell_requested", {
      trigger,
      interactiveOpen,
      showGame,
      hasGameContainerComponent,
    });
    if (showGame && hasGameContainerComponent && gameContainerRenderPromise) {
      recordHomeRouteEvent("open_game_shell_short_circuit", {
        trigger,
      });
      return true;
    }

    if (interactiveOpen) {
      isGameShellLoading = true;
      gameShellErrorMessage = null;
      gameContainerMounted = false;
    }

    try {
      await ensureGameShellLoaded();
      if (interactiveOpen) {
        showGame = true;
      }
      recordHomeRouteEvent("open_game_shell_succeeded", {
        trigger,
        interactiveOpen,
      });
      return true;
    } catch (error) {
      const message = describeGameShellLoadError(error);
      if (interactiveOpen) {
        showGame = false;
        gameShellErrorMessage = message;
        gameContainerMounted = false;
      }
      recordHomeRouteEvent("open_game_shell_failed", {
        trigger,
        interactiveOpen,
        message,
      });
      return false;
    } finally {
      if (interactiveOpen) {
        isGameShellLoading = false;
      }
    }
  }

  function scheduleGameShellWarmup() {
    const browserWindow = getBrowserWindow();
    if (!import.meta.env.DEV || gameShellWarmupStarted || !browserWindow) {
      return;
    }
    gameShellWarmupStarted = true;
    const warmup = () => {
      recordHomeRouteEvent("game_shell_warmup_started", null);
      void openGameShell("warmup");
    };
    if ("requestIdleCallback" in browserWindow) {
      recordHomeRouteEvent("game_shell_warmup_scheduled", {
        strategy: "requestIdleCallback",
      });
      browserWindow.requestIdleCallback(() => warmup(), { timeout: 1500 });
      return;
    }
    recordHomeRouteEvent("game_shell_warmup_scheduled", {
      strategy: "timeout",
    });
    setTimeout(warmup, 250);
  }

  $effect(() => {
    const browserWindow = getBrowserWindow();
    if (!browserWindow) return;
    browserWindow.__PAX_GAME_SHELL_DIAG__ = {
      showGame,
      isGameShellLoading,
      gameShellErrorMessage,
      hasGameContainerComponent,
      gameContainerMounted,
      phase: gameShellPhase,
      lastUpdatedAt: homeRouteDiagnostics.lastUpdatedAt,
      events: homeRouteDiagnostics.events,
      errors: homeRouteDiagnostics.errors,
    };
  });

  $effect(() => {
    if (typeof window === "undefined" || showGame) return;
    // Landing must never inherit the game shell's scroll lock if a mount/unmount
    // cycle was interrupted by a failed import or HMR edge case.
    window.document.body.classList.remove("game-active");
  });

  onMount(() => {
    audioManager.init();
    resetHomeRouteDiagnostics();
    refreshHomeRouteDiagnostics();

    const browserWindow = getBrowserWindow();
    const url = browserWindow ? new URL(browserWindow.location.href) : null;
    audienceAccess = resolveAudienceAccess({
      isDev: import.meta.env.DEV,
      searchParams: url?.searchParams ?? null,
    });
    const internalToolsEnabled = canAccessAudience("internal", audienceAccess);
    const benchmarkRequested = url?.searchParams.get("bench") === "1";
    const benchmarkEnabled =
      internalToolsEnabled && (import.meta.env.DEV || benchmarkRequested);
    startupDiagnosticsOptIn =
      internalToolsEnabled &&
      (url?.searchParams.get("startupDiag") === "1" ||
        url?.searchParams.get("diag") === "1");

    recordHomeRouteEvent("landing_route_mounted", {
      href: url?.toString() ?? null,
      dev: import.meta.env.DEV,
      benchmarkEnabled,
      internalToolsEnabled,
    });

    const removeGlobalErrorHandlers = installHomeRouteGlobalErrorHandlers(
      () => {
        refreshHomeRouteDiagnostics();
      },
    );

    const handleGameContainerMounted = () => {
      gameContainerMounted = true;
      refreshHomeRouteDiagnostics();
    };
    const handleGameContainerUnmounted = () => {
      gameContainerMounted = false;
      refreshHomeRouteDiagnostics();
    };

    if (browserWindow) {
      browserWindow.__PAX_HOME_ROUTE_READY__ = true;
      browserWindow.addEventListener(
        "pax-game-container-mounted",
        handleGameContainerMounted as EventListener,
      );
      browserWindow.addEventListener(
        "pax-game-container-unmounted",
        handleGameContainerUnmounted as EventListener,
      );
    }

    scheduleGameShellWarmup();

    const openShell = async () => {
      await openGameShell(benchmarkEnabled ? "benchmark" : "query");
    };

    const autoEnterGame =
      isGameHost(getHostname()) ||
      url?.searchParams.get("showGame") === "1";
    if (autoEnterGame) {
      recordHomeRouteEvent("auto_enter_game", {
        reason: isGameHost(getHostname()) ? "game_host" : "show_game_query",
        benchmarkEnabled,
      });
      void openShell();
    }

    if (benchmarkEnabled) {
      recordHomeRouteEvent("benchmark_bridge_requested", null);
      void import("$lib/perf/benchmarkBridge")
        .then(({ installBenchmarkBridge }) => {
          benchmarkDisposer?.();
          benchmarkDisposer = installBenchmarkBridge({
            openGameShell: openShell,
            ensureGameShellLoaded,
          });
          recordHomeRouteEvent("benchmark_bridge_installed", null);
        })
        .catch((error) => {
          recordHomeRouteError("benchmark_bridge_import_failed", error);
        });
    }

    return () => {
      if (browserWindow) {
        delete browserWindow.__PAX_HOME_ROUTE_READY__;
        delete browserWindow.__PAX_GAME_SHELL_DIAG__;
        browserWindow.removeEventListener(
          "pax-game-container-mounted",
          handleGameContainerMounted as EventListener,
        );
        browserWindow.removeEventListener(
          "pax-game-container-unmounted",
          handleGameContainerUnmounted as EventListener,
        );
      }
      removeGlobalErrorHandlers();
      benchmarkDisposer?.();
      benchmarkDisposer = null;
    };
  });

  /** The game app lives on its own subdomain; the landing site lives at the root. */
  const GAME_APP_URL = "https://play.paxfluxia.com";

  function getHostname(): string {
    return typeof window !== "undefined" ? window.location.hostname : "";
  }

  /** Public marketing site (paxfluxia.com). Play actions here hand off to the game app. */
  function isMarketingHost(host: string): boolean {
    return host === "paxfluxia.com" || host === "www.paxfluxia.com";
  }

  /** Game app subdomain (play.paxfluxia.com). The shell auto-loads here, not the landing. */
  function isGameHost(host: string): boolean {
    return host === "play.paxfluxia.com" || host.startsWith("play.");
  }

  function handlePlay() {
    audioManager.play("play");
    const host = getHostname();
    recordHomeRouteEvent("play_clicked", {
      host,
      href: typeof window !== "undefined" ? window.location.href : null,
    });
    // On the marketing site, send players to the game app. In local dev/preview
    // (and when already on the game host) there is no separate subdomain, so
    // load the shell inline instead.
    if (isMarketingHost(host)) {
      window.location.href = GAME_APP_URL;
    } else {
      void openGameShell("play");
    }
  }
</script>

<main>
  {#if showGame && gameContainerRenderPromise}
    {#await gameContainerRenderPromise then GameContainerModule}
      <GameContainerModule.default />
    {/await}
  {:else}
    <LandingPage onPlay={handlePlay} />
  {/if}

  {#if !showGame && (isGameShellLoading || gameShellErrorMessage)}
    <div
      class="game-shell-status"
      role={gameShellErrorMessage ? "alert" : "status"}
      aria-live="polite">
      {#if isGameShellLoading}
        <p class="game-shell-status__title">Loading command bridge...</p>
        <p class="game-shell-status__detail">
          Initializing the game shell without interrupting the landing page.
        </p>
      {/if}

      {#if gameShellErrorMessage}
        <p class="game-shell-status__title">Game shell load failed</p>
        <p class="game-shell-status__detail">{gameShellErrorMessage}</p>
        <button
          class="game-shell-status__retry"
          onclick={() => void openGameShell("play")}>
          Retry loading game
        </button>
      {/if}

      {#if showStartupDiagnostics}
        <details
          class="startup-diagnostics startup-diagnostics--inline"
          open={Boolean(gameShellErrorMessage)}>
          <summary>Startup diagnostics</summary>
          <div class="startup-diagnostics__body">
            <div class="startup-diagnostics__meta">
              <span>phase: <code>{gameShellPhase}</code></span>
              <span>showGame: <code>{showGame ? "true" : "false"}</code></span>
              <span>
                component:
                <code>{hasGameContainerComponent ? "ready" : "missing"}</code>
              </span>
              <span>
                mounted: <code>{gameContainerMounted ? "true" : "false"}</code>
              </span>
              <span>
                updated: <code
                  >{homeRouteDiagnostics.lastUpdatedAt ?? "none"}</code>
              </span>
            </div>

            <div class="startup-diagnostics__actions">
              <button
                class="startup-diagnostics__button"
                onclick={copyGameShellDiagnostics}>
                Copy startup diagnostics
              </button>
              {#if copyDiagnosticsFeedback}
                <span class="startup-diagnostics__feedback">
                  {copyDiagnosticsFeedback}
                </span>
              {/if}
            </div>

            <div class="startup-diagnostics__section">
              <p class="startup-diagnostics__section-title">Recent events</p>
              {#if recentHomeRouteEvents.length === 0}
                <p class="startup-diagnostics__empty">
                  No events captured yet.
                </p>
              {:else}
                {#each recentHomeRouteEvents as event}
                  <div class="startup-diagnostics__entry">
                    <p class="startup-diagnostics__entry-title">{event.kind}</p>
                    <p class="startup-diagnostics__entry-time">{event.at}</p>
                    {#if event.detail}
                      <pre>{JSON.stringify(event.detail, null, 2)}</pre>
                    {/if}
                  </div>
                {/each}
              {/if}
            </div>

            <div class="startup-diagnostics__section">
              <p class="startup-diagnostics__section-title">Recent errors</p>
              {#if recentHomeRouteErrors.length === 0}
                <p class="startup-diagnostics__empty">No errors captured.</p>
              {:else}
                {#each recentHomeRouteErrors as error}
                  <div
                    class="startup-diagnostics__entry startup-diagnostics__entry--error">
                    <p class="startup-diagnostics__entry-title">
                      {error.source}: {error.message}
                    </p>
                    <p class="startup-diagnostics__entry-time">{error.at}</p>
                    {#if error.resourceUrl}
                      <p class="startup-diagnostics__resource">
                        {error.resourceUrl}
                      </p>
                    {/if}
                    {#if error.detail}
                      <pre>{JSON.stringify(error.detail, null, 2)}</pre>
                    {/if}
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        </details>
      {/if}
    </div>
  {/if}

  {#if !showGame && startupDiagnosticsOptIn && !isGameShellLoading && !gameShellErrorMessage}
    <details class="startup-diagnostics startup-diagnostics--standalone">
      <summary>Startup diagnostics</summary>
      <div class="startup-diagnostics__body">
        <div class="startup-diagnostics__meta">
          <span>phase: <code>{gameShellPhase}</code></span>
          <span>showGame: <code>{showGame ? "true" : "false"}</code></span>
          <span>
            component:
            <code>{hasGameContainerComponent ? "ready" : "missing"}</code>
          </span>
          <span
            >mounted: <code>{gameContainerMounted ? "true" : "false"}</code
            ></span>
          <span>
            updated: <code>{homeRouteDiagnostics.lastUpdatedAt ?? "none"}</code>
          </span>
        </div>

        <div class="startup-diagnostics__actions">
          <button
            class="startup-diagnostics__button"
            onclick={copyGameShellDiagnostics}>
            Copy startup diagnostics
          </button>
          {#if copyDiagnosticsFeedback}
            <span class="startup-diagnostics__feedback"
              >{copyDiagnosticsFeedback}</span>
          {/if}
        </div>

        <div class="startup-diagnostics__section">
          <p class="startup-diagnostics__section-title">Recent events</p>
          {#if recentHomeRouteEvents.length === 0}
            <p class="startup-diagnostics__empty">No events captured yet.</p>
          {:else}
            {#each recentHomeRouteEvents as event}
              <div class="startup-diagnostics__entry">
                <p class="startup-diagnostics__entry-title">{event.kind}</p>
                <p class="startup-diagnostics__entry-time">{event.at}</p>
                {#if event.detail}
                  <pre>{JSON.stringify(event.detail, null, 2)}</pre>
                {/if}
              </div>
            {/each}
          {/if}
        </div>

        <div class="startup-diagnostics__section">
          <p class="startup-diagnostics__section-title">Recent errors</p>
          {#if recentHomeRouteErrors.length === 0}
            <p class="startup-diagnostics__empty">No errors captured.</p>
          {:else}
            {#each recentHomeRouteErrors as error}
              <div
                class="startup-diagnostics__entry startup-diagnostics__entry--error">
                <p class="startup-diagnostics__entry-title">
                  {error.source}: {error.message}
                </p>
                <p class="startup-diagnostics__entry-time">{error.at}</p>
                {#if error.resourceUrl}
                  <p class="startup-diagnostics__resource">
                    {error.resourceUrl}
                  </p>
                {/if}
                {#if error.detail}
                  <pre>{JSON.stringify(error.detail, null, 2)}</pre>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </details>
  {/if}

  <script
    type="text/javascript"
    async
    src="https://subscribe-forms.beehiiv.com/attribution.js"></script>
</main>

<style>
  main {
    position: relative;
    min-height: 100vh;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    background: #000;
    color: #fff;
    font-family: "Inter", sans-serif;
  }

  .game-shell-status {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 40;
    max-width: min(420px, calc(100vw - 32px));
    padding: 14px 16px;
    border: 1px solid rgba(108, 204, 255, 0.45);
    border-radius: 14px;
    background: linear-gradient(
      180deg,
      rgba(8, 18, 28, 0.94),
      rgba(4, 10, 18, 0.96)
    );
    box-shadow:
      0 18px 48px rgba(0, 0, 0, 0.45),
      inset 0 0 0 1px rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(12px);
  }

  .game-shell-status__title {
    margin: 0;
    font-family: "Rajdhani", sans-serif;
    font-size: var(--pax-type-base);
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #f3f8ff;
  }

  .game-shell-status__detail {
    margin: 8px 0 0;
    font-size: var(--pax-type-sm-plus);
    line-height: 1.45;
    color: rgba(222, 234, 246, 0.86);
  }

  .game-shell-status__retry {
    margin-top: 12px;
    padding: 10px 14px;
    border: 1px solid rgba(139, 212, 255, 0.55);
    border-radius: 999px;
    background: rgba(56, 128, 184, 0.18);
    color: #f6fbff;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .game-shell-status__retry:hover {
    background: rgba(73, 152, 214, 0.26);
  }

  .startup-diagnostics {
    position: fixed;
    left: 24px;
    bottom: 24px;
    z-index: 41;
    width: min(520px, calc(100vw - 32px));
    border: 1px solid rgba(255, 196, 111, 0.38);
    border-radius: 16px;
    background: linear-gradient(
      180deg,
      rgba(28, 18, 8, 0.94),
      rgba(16, 10, 4, 0.96)
    );
    box-shadow:
      0 18px 48px rgba(0, 0, 0, 0.42),
      inset 0 0 0 1px rgba(255, 255, 255, 0.04);
    overflow: hidden;
    backdrop-filter: blur(12px);
  }

  .startup-diagnostics--inline {
    position: static;
    width: 100%;
    margin-top: 14px;
    border-color: rgba(108, 204, 255, 0.2);
    background: linear-gradient(
      180deg,
      rgba(12, 18, 28, 0.72),
      rgba(8, 14, 24, 0.78)
    );
    box-shadow: none;
  }

  .startup-diagnostics summary {
    cursor: pointer;
    list-style: none;
    padding: 12px 14px;
    font-family: "Rajdhani", sans-serif;
    font-size: var(--pax-type-base);
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #ffe3bf;
    background: rgba(255, 196, 111, 0.08);
  }

  .startup-diagnostics summary::-webkit-details-marker {
    display: none;
  }

  .startup-diagnostics__body {
    display: grid;
    gap: 12px;
    padding: 14px;
  }

  .startup-diagnostics__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    font-size: var(--pax-type-xs-plus);
    color: rgba(255, 228, 191, 0.82);
  }

  .startup-diagnostics__meta code,
  .startup-diagnostics__entry pre {
    font-family: "JetBrains Mono", monospace;
  }

  .startup-diagnostics__actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .startup-diagnostics__button {
    padding: 8px 12px;
    border: 1px solid rgba(255, 196, 111, 0.45);
    border-radius: 999px;
    background: rgba(255, 196, 111, 0.12);
    color: #fff0d7;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .startup-diagnostics__feedback {
    font-size: var(--pax-type-xs-plus);
    color: rgba(255, 228, 191, 0.78);
  }

  .startup-diagnostics__section {
    display: grid;
    gap: 8px;
  }

  .startup-diagnostics__section-title {
    margin: 0;
    font-size: var(--pax-type-xs-plus);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 210, 149, 0.78);
  }

  .startup-diagnostics__empty {
    margin: 0;
    font-size: var(--pax-type-sm);
    color: rgba(255, 240, 215, 0.85);
  }

  .startup-diagnostics__entry {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border: 1px solid rgba(255, 196, 111, 0.18);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
  }

  .startup-diagnostics__entry--error {
    border-color: rgba(255, 119, 119, 0.32);
    background: rgba(82, 18, 18, 0.2);
  }

  .startup-diagnostics__entry-title,
  .startup-diagnostics__entry-time,
  .startup-diagnostics__resource {
    margin: 0;
  }

  .startup-diagnostics__entry-title {
    font-size: var(--pax-type-sm);
    color: #fff1dc;
  }

  .startup-diagnostics__entry-time,
  .startup-diagnostics__resource {
    font-size: var(--pax-type-xs);
    color: rgba(255, 228, 191, 0.72);
    word-break: break-word;
  }

  .startup-diagnostics__entry pre {
    margin: 0;
    padding: 8px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.28);
    font-size: var(--pax-type-xs);
    white-space: pre-wrap;
    word-break: break-word;
    color: rgba(245, 249, 255, 0.88);
  }

  @media (max-width: 900px) {
    .game-shell-status,
    .startup-diagnostics {
      right: 12px;
      left: 12px;
      width: auto;
    }

    .startup-diagnostics--standalone {
      bottom: 132px;
    }
  }
</style>
