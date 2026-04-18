<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import "../app.css";
  import LandingPage from "$lib/components/landing/LandingPage.svelte";
  import { audioManager } from "$lib/services/audioManager.svelte";

  onMount(() => {
    audioManager.init();
  });

  function handlePlay() {
    audioManager.play("play");
    const isProd =
      typeof window !== "undefined" &&
      window.location.hostname === "paxfluxia.com";
    if (isProd) {
      window.location.href = "https://play.paxfluxia.com";
      return;
    }
    void goto("/play");
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
  <LandingPage onPlay={handlePlay} />
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
