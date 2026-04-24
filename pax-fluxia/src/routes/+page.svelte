<script lang="ts">
  import { onMount } from "svelte";
  import type { Component } from "svelte";
  import "../app.css";
  import LandingPage from "$lib/components/landing/LandingPage.svelte";
  import { audioManager } from "$lib/services/audioManager.svelte";

  let showGame = $state(false);
  let gameContainerComponent = $state<Component | null>(null);
  let benchmarkDisposer: (() => void) | null = null;
  let gameContainerLoadPromise: Promise<void> | null = null;

  async function ensureGameShellLoaded(): Promise<void> {
    if (gameContainerComponent) return;
    if (!gameContainerLoadPromise) {
      gameContainerLoadPromise = import(
        "$lib/components/game/GameContainer.svelte"
      ).then((module) => {
        gameContainerComponent = module.default;
      });
    }
    await gameContainerLoadPromise;
  }

  onMount(() => {
    audioManager.init();
    const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
    const benchmarkEnabled = url?.searchParams.get("bench") === "1";
    const openShell = async () => {
      showGame = true;
      await ensureGameShellLoaded();
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
      showGame = true;
      void ensureGameShellLoaded();
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
  {#if showGame}
    {#if gameContainerComponent}
      <gameContainerComponent />
    {/if}
  {:else}
    <LandingPage onPlay={handlePlay} />
  {/if}
  <script
    type="text/javascript"
    async
    src="https://subscribe-forms.beehiiv.com/attribution.js"
  ></script>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #000;
    color: #fff;
    font-family: "Inter", sans-serif;
  }
</style>
