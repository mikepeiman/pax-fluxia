<script lang="ts">
  import { onMount } from "svelte";
  import type { Component } from "svelte";
  import "../app.css";
  import LandingPage from "$lib/components/landing/LandingPage.svelte";
  import { audioManager } from "$lib/services/audioManager.svelte";
  import { log } from "$lib/utils/logger";

  declare global {
    interface Window {
      __PAX_HOME_ROUTE_READY__?: boolean;
      __PAX_GAME_SHELL_DIAG__?: {
        showGame: boolean;
        isGameShellLoading: boolean;
        gameShellErrorMessage: string | null;
        hasGameContainerComponent: boolean;
      };
    }
  }

  let showGame = $state(false);
  let isGameShellLoading = $state(false);
  let gameShellErrorMessage = $state<string | null>(null);
  let gameContainerComponent = $state<Component | null>(null);
  let benchmarkDisposer: (() => void) | null = null;
  let gameContainerLoadPromise: Promise<void> | null = null;
  let gameShellWarmupStarted = false;

  const GAME_SHELL_MAX_IMPORT_ATTEMPTS = import.meta.env.DEV ? 2 : 1;
  const GAME_SHELL_RETRY_DELAY_MS = 300;

  function waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function describeGameShellLoadError(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return "The game shell failed to load. Please try again.";
  }

  async function loadGameContainerModule(): Promise<void> {
    let lastError: unknown = null;
    for (
      let attempt = 1;
      attempt <= GAME_SHELL_MAX_IMPORT_ATTEMPTS;
      attempt += 1
    ) {
      try {
        const module = await import("$lib/components/game/GameContainer.svelte");
        gameContainerComponent = module.default;
        gameShellErrorMessage = null;
        if (attempt > 1) {
          log.sys("LandingRoute", "Game shell loaded after retry", { attempt });
        }
        return;
      } catch (error) {
        lastError = error;
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
    if (gameContainerComponent) return;
    if (!gameContainerLoadPromise) {
      gameContainerLoadPromise = loadGameContainerModule().finally(() => {
        if (!gameContainerComponent) {
          gameContainerLoadPromise = null;
        }
      });
    }
    await gameContainerLoadPromise;
  }

  async function openGameShell(
    trigger: "play" | "query" | "benchmark" | "warmup" = "play",
  ): Promise<boolean> {
    const interactiveOpen = trigger !== "warmup";
    if (showGame && gameContainerComponent) return true;

    if (interactiveOpen) {
      isGameShellLoading = true;
      gameShellErrorMessage = null;
    }

    try {
      await ensureGameShellLoaded();
      if (interactiveOpen) {
        showGame = true;
      }
      return true;
    } catch (error) {
      if (interactiveOpen) {
        showGame = false;
        gameShellErrorMessage = describeGameShellLoadError(error);
      }
      return false;
    } finally {
      if (interactiveOpen) {
        isGameShellLoading = false;
      }
    }
  }

  function scheduleGameShellWarmup() {
    if (!import.meta.env.DEV || gameShellWarmupStarted || typeof window === "undefined") {
      return;
    }
    gameShellWarmupStarted = true;
    const warmup = () => {
      void openGameShell("warmup");
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => warmup(), { timeout: 1500 });
      return;
    }
    window.setTimeout(warmup, 250);
  }

  $effect(() => {
    if (typeof window === "undefined") return;
    window.__PAX_GAME_SHELL_DIAG__ = {
      showGame,
      isGameShellLoading,
      gameShellErrorMessage,
      hasGameContainerComponent: Boolean(gameContainerComponent),
    };
  });

  onMount(() => {
    audioManager.init();
    if (typeof window !== "undefined") {
      window.__PAX_HOME_ROUTE_READY__ = true;
    }
    const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
    const benchmarkEnabled = url?.searchParams.get("bench") === "1";
    scheduleGameShellWarmup();
    const openShell = async () => {
      await openGameShell(benchmarkEnabled ? "benchmark" : "query");
    };
    if (url?.searchParams.get("showGame") === "1") {
      void openShell();
    }
    if (benchmarkEnabled) {
      void import("$lib/perf/benchmarkBridge").then(({ installBenchmarkBridge }) => {
        benchmarkDisposer?.();
        benchmarkDisposer = installBenchmarkBridge({
          openGameShell: openShell,
          ensureGameShellLoaded,
        });
      });
    }
    return () => {
      if (typeof window !== "undefined") {
        delete window.__PAX_HOME_ROUTE_READY__;
        delete window.__PAX_GAME_SHELL_DIAG__;
      }
      benchmarkDisposer?.();
      benchmarkDisposer = null;
    };
  });

  function handlePlay() {
    audioManager.play("play");
    // In production, redirect to play subdomain; in dev, toggle in-page
    const isProd =
      typeof window !== "undefined" &&
      window.location.hostname === "paxfluxia.com";
    if (isProd) {
      window.location.href = "https://play.paxfluxia.com";
    } else {
      void openGameShell("play");
    }
  }
</script>

<svelte:head>
  <!-- Google Fonts -->
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
  {#if showGame && gameContainerComponent}
    <gameContainerComponent></gameContainerComponent>
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
        <p class="game-shell-status__title">Loading command bridge…</p>
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
</style>
