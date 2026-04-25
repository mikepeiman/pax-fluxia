<script lang="ts">
  import { onMount } from "svelte";
  import "../app.css";
  import LandingPage from "$lib/components/landing/LandingPage.svelte";
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

  const EMPTY_HOME_ROUTE_DIAG: HomeRouteDiagSnapshot = {
    lastUpdatedAt: null,
    events: [],
    errors: [],
  };

  declare global {
    interface Window {
      __PAX_HOME_ROUTE_READY__?: boolean;
      __PAX_GAME_SHELL_DIAG__?: {
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
    }
  }

  type GameContainerModule = typeof import(
    "$lib/components/game/GameContainer.svelte"
  );

  let showGame = $state(false);
  let isGameShellLoading = $state(false);
  let gameShellErrorMessage = $state<string | null>(null);
  let gameContainerRenderPromise = $state<Promise<GameContainerModule> | null>(
    null,
  );
  let hasGameContainerComponent = $state(false);
  let gameContainerMounted = $state(false);
  let homeRouteDebugVisible = $state(false);
  let homeRouteDiagnostics = $state<HomeRouteDiagSnapshot>(EMPTY_HOME_ROUTE_DIAG);
  let copyDiagnosticsFeedback = $state("");
  let benchmarkDisposer: (() => void) | null = null;
  let gameContainerLoadPromise: Promise<void> | null = null;
  let gameShellWarmupStarted = false;

  const recentHomeRouteEvents = $derived(
    [...homeRouteDiagnostics.events].slice(-6).reverse(),
  );
  const recentHomeRouteErrors = $derived(
    [...homeRouteDiagnostics.errors].slice(-4).reverse(),
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

  const GAME_SHELL_MAX_IMPORT_ATTEMPTS = import.meta.env.DEV ? 2 : 1;
  const GAME_SHELL_RETRY_DELAY_MS = 300;

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

  function waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function describeGameShellLoadError(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return "The game shell failed to load. Please try again.";
  }

  function setCopyDiagnosticsFeedback(message: string) {
    copyDiagnosticsFeedback = message;
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
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
      const payload = JSON.stringify(window.__PAX_GAME_SHELL_DIAG__ ?? {}, null, 2);
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
    let lastError: unknown = null;
    for (
      let attempt = 1;
      attempt <= GAME_SHELL_MAX_IMPORT_ATTEMPTS;
      attempt += 1
    ) {
      recordHomeRouteEvent("game_shell_import_attempt", {
        attempt,
        maxAttempts: GAME_SHELL_MAX_IMPORT_ATTEMPTS,
      });
      try {
        const module = await import("$lib/components/game/GameContainer.svelte");
        recordHomeRouteEvent("game_shell_import_succeeded", {
          attempt,
        });
        if (attempt > 1) {
          log.sys("LandingRoute", "Game shell loaded after retry", { attempt });
        }
        return module;
      } catch (error) {
        lastError = error;
        recordHomeRouteError("game_shell_import_failed", error, {
          attempt,
          maxAttempts: GAME_SHELL_MAX_IMPORT_ATTEMPTS,
        });
        log.error(
          "LandingRoute",
          `Game shell import failed (${attempt}/${GAME_SHELL_MAX_IMPORT_ATTEMPTS})`,
          error,
        );
        if (attempt < GAME_SHELL_MAX_IMPORT_ATTEMPTS) {
          await waitMs(GAME_SHELL_RETRY_DELAY_MS);
        }
      }
    }
    throw lastError;
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
    if (
      !import.meta.env.DEV ||
      gameShellWarmupStarted ||
      typeof window === "undefined"
    ) {
      return;
    }
    gameShellWarmupStarted = true;
    const warmup = () => {
      recordHomeRouteEvent("game_shell_warmup_started", null);
      void openGameShell("warmup");
    };
    if ("requestIdleCallback" in window) {
      recordHomeRouteEvent("game_shell_warmup_scheduled", {
        strategy: "requestIdleCallback",
      });
      window.requestIdleCallback(() => warmup(), { timeout: 1500 });
      return;
    }
    recordHomeRouteEvent("game_shell_warmup_scheduled", {
      strategy: "timeout",
    });
    window.setTimeout(warmup, 250);
  }

  $effect(() => {
    if (typeof window === "undefined") return;
    window.__PAX_GAME_SHELL_DIAG__ = {
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

  onMount(() => {
    audioManager.init();
    resetHomeRouteDiagnostics();
    refreshHomeRouteDiagnostics();

    const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
    const benchmarkEnabled = url?.searchParams.get("bench") === "1";
    homeRouteDebugVisible =
      import.meta.env.DEV || url?.searchParams.get("diag") === "1";

    recordHomeRouteEvent("landing_route_mounted", {
      href: url?.toString() ?? null,
      dev: import.meta.env.DEV,
      benchmarkEnabled,
    });

    const removeGlobalErrorHandlers = installHomeRouteGlobalErrorHandlers(() => {
      refreshHomeRouteDiagnostics();
    });

    const handleGameContainerMounted = () => {
      gameContainerMounted = true;
      refreshHomeRouteDiagnostics();
    };
    const handleGameContainerUnmounted = () => {
      gameContainerMounted = false;
      refreshHomeRouteDiagnostics();
    };

    if (typeof window !== "undefined") {
      window.__PAX_HOME_ROUTE_READY__ = true;
      window.addEventListener(
        "pax-game-container-mounted",
        handleGameContainerMounted as EventListener,
      );
      window.addEventListener(
        "pax-game-container-unmounted",
        handleGameContainerUnmounted as EventListener,
      );
    }

    scheduleGameShellWarmup();

    const openShell = async () => {
      await openGameShell(benchmarkEnabled ? "benchmark" : "query");
    };

    if (url?.searchParams.get("showGame") === "1") {
      recordHomeRouteEvent("show_game_query_detected", {
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
      if (typeof window !== "undefined") {
        delete window.__PAX_HOME_ROUTE_READY__;
        delete window.__PAX_GAME_SHELL_DIAG__;
        window.removeEventListener(
          "pax-game-container-mounted",
          handleGameContainerMounted as EventListener,
        );
        window.removeEventListener(
          "pax-game-container-unmounted",
          handleGameContainerUnmounted as EventListener,
        );
      }
      removeGlobalErrorHandlers();
      benchmarkDisposer?.();
      benchmarkDisposer = null;
    };
  });

  function handlePlay() {
    audioManager.play("play");
    const isProd =
      typeof window !== "undefined" &&
      window.location.hostname === "paxfluxia.com";
    recordHomeRouteEvent("play_clicked", {
      isProd,
      href: typeof window !== "undefined" ? window.location.href : null,
    });
    if (isProd) {
      window.location.href = "https://play.paxfluxia.com";
    } else {
      void openGameShell("play");
    }
  }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;700&family=Rajdhani:wght@500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

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
      aria-live="polite"
    >
      {#if isGameShellLoading}
        <p class="game-shell-status__title">Loading command bridge...</p>
        <p class="game-shell-status__detail">
          Initializing the game shell without interrupting the landing page.
        </p>
      {/if}

      {#if gameShellErrorMessage}
        <p class="game-shell-status__title">Game shell load failed</p>
        <p class="game-shell-status__detail">{gameShellErrorMessage}</p>
        <button class="game-shell-status__retry" onclick={() => void openGameShell("play")}>
          Retry loading game
        </button>
      {/if}
    </div>
  {/if}

  {#if homeRouteDebugVisible || gameShellErrorMessage}
    <details class="game-shell-diag-dock" open={Boolean(gameShellErrorMessage)}>
      <summary>Shell diag</summary>
      <div class="game-shell-diag-dock__body">
        <div class="game-shell-diag-dock__meta">
          <span>phase: <code>{gameShellPhase}</code></span>
          <span>showGame: <code>{showGame ? "true" : "false"}</code></span>
          <span>component: <code>{hasGameContainerComponent ? "ready" : "missing"}</code></span>
          <span>mounted: <code>{gameContainerMounted ? "true" : "false"}</code></span>
          <span>updated: <code>{homeRouteDiagnostics.lastUpdatedAt ?? "none"}</code></span>
        </div>

        <div class="game-shell-diag-dock__actions">
          <button class="game-shell-diag-dock__button" onclick={copyGameShellDiagnostics}>
            Copy diagnostics
          </button>
          {#if copyDiagnosticsFeedback}
            <span class="game-shell-diag-dock__feedback">{copyDiagnosticsFeedback}</span>
          {/if}
        </div>

        {#if gameShellErrorMessage}
          <div class="game-shell-diag-dock__section">
            <p class="game-shell-diag-dock__section-title">Current error</p>
            <p class="game-shell-diag-dock__message">{gameShellErrorMessage}</p>
          </div>
        {/if}

        <div class="game-shell-diag-dock__section">
          <p class="game-shell-diag-dock__section-title">Recent events</p>
          {#if recentHomeRouteEvents.length === 0}
            <p class="game-shell-diag-dock__empty">No events captured yet.</p>
          {:else}
            {#each recentHomeRouteEvents as event}
              <div class="game-shell-diag-dock__entry">
                <p class="game-shell-diag-dock__entry-title">{event.kind}</p>
                <p class="game-shell-diag-dock__entry-time">{event.at}</p>
                {#if event.detail}
                  <pre>{JSON.stringify(event.detail, null, 2)}</pre>
                {/if}
              </div>
            {/each}
          {/if}
        </div>

        <div class="game-shell-diag-dock__section">
          <p class="game-shell-diag-dock__section-title">Recent errors</p>
          {#if recentHomeRouteErrors.length === 0}
            <p class="game-shell-diag-dock__empty">No errors captured.</p>
          {:else}
            {#each recentHomeRouteErrors as error}
              <div class="game-shell-diag-dock__entry game-shell-diag-dock__entry--error">
                <p class="game-shell-diag-dock__entry-title">
                  {error.source}: {error.message}
                </p>
                <p class="game-shell-diag-dock__entry-time">{error.at}</p>
                {#if error.resourceUrl}
                  <p class="game-shell-diag-dock__resource">{error.resourceUrl}</p>
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
    src="https://subscribe-forms.beehiiv.com/attribution.js"
  ></script>
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
    background:
      linear-gradient(180deg, rgba(8, 18, 28, 0.94), rgba(4, 10, 18, 0.96));
    box-shadow:
      0 18px 48px rgba(0, 0, 0, 0.45),
      inset 0 0 0 1px rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(12px);
  }

  .game-shell-status__title {
    margin: 0;
    font-family: "Rajdhani", sans-serif;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #f3f8ff;
  }

  .game-shell-status__detail {
    margin: 8px 0 0;
    font-size: 0.92rem;
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

  .game-shell-diag-dock {
    position: fixed;
    left: 24px;
    bottom: 24px;
    z-index: 41;
    width: min(520px, calc(100vw - 32px));
    border: 1px solid rgba(255, 196, 111, 0.38);
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(28, 18, 8, 0.94), rgba(16, 10, 4, 0.96));
    box-shadow:
      0 18px 48px rgba(0, 0, 0, 0.42),
      inset 0 0 0 1px rgba(255, 255, 255, 0.04);
    overflow: hidden;
    backdrop-filter: blur(12px);
  }

  .game-shell-diag-dock summary {
    cursor: pointer;
    list-style: none;
    padding: 12px 14px;
    font-family: "Rajdhani", sans-serif;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #ffe3bf;
    background: rgba(255, 196, 111, 0.08);
  }

  .game-shell-diag-dock summary::-webkit-details-marker {
    display: none;
  }

  .game-shell-diag-dock__body {
    display: grid;
    gap: 12px;
    padding: 14px;
  }

  .game-shell-diag-dock__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    font-size: 0.82rem;
    color: rgba(255, 228, 191, 0.82);
  }

  .game-shell-diag-dock__meta code,
  .game-shell-diag-dock__entry pre {
    font-family: "JetBrains Mono", monospace;
  }

  .game-shell-diag-dock__actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .game-shell-diag-dock__button {
    padding: 8px 12px;
    border: 1px solid rgba(255, 196, 111, 0.45);
    border-radius: 999px;
    background: rgba(255, 196, 111, 0.12);
    color: #fff0d7;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .game-shell-diag-dock__feedback {
    font-size: 0.8rem;
    color: rgba(255, 228, 191, 0.78);
  }

  .game-shell-diag-dock__section {
    display: grid;
    gap: 8px;
  }

  .game-shell-diag-dock__section-title {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 210, 149, 0.78);
  }

  .game-shell-diag-dock__message,
  .game-shell-diag-dock__empty {
    margin: 0;
    font-size: 0.88rem;
    color: rgba(255, 240, 215, 0.85);
  }

  .game-shell-diag-dock__entry {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border: 1px solid rgba(255, 196, 111, 0.18);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
  }

  .game-shell-diag-dock__entry--error {
    border-color: rgba(255, 119, 119, 0.32);
    background: rgba(82, 18, 18, 0.2);
  }

  .game-shell-diag-dock__entry-title,
  .game-shell-diag-dock__entry-time,
  .game-shell-diag-dock__resource {
    margin: 0;
  }

  .game-shell-diag-dock__entry-title {
    font-size: 0.88rem;
    color: #fff1dc;
  }

  .game-shell-diag-dock__entry-time,
  .game-shell-diag-dock__resource {
    font-size: 0.76rem;
    color: rgba(255, 228, 191, 0.72);
    word-break: break-word;
  }

  .game-shell-diag-dock__entry pre {
    margin: 0;
    padding: 8px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.28);
    font-size: 0.72rem;
    white-space: pre-wrap;
    word-break: break-word;
    color: rgba(245, 249, 255, 0.88);
  }

  @media (max-width: 900px) {
    .game-shell-status,
    .game-shell-diag-dock {
      right: 12px;
      left: 12px;
      width: auto;
    }

    .game-shell-diag-dock {
      bottom: 132px;
    }
  }
</style>
