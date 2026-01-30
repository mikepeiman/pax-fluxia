<script lang="ts">
  import "../app.css";
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import MainMenu from "$lib/components/ui/MainMenu.svelte";
  import GameHUD from "$lib/components/ui/GameHUD.svelte";
  import ResultsModal from "$lib/components/ui/ResultsModal.svelte";
  import GameCanvas from "$lib/components/game/GameCanvas.svelte";
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
    href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<main class="app-container">
  {#if gameStore.currentView === "menu"}
    <MainMenu />
  {:else if gameStore.currentView === "game"}
    <GameCanvas />
    <GameHUD />
  {:else if gameStore.currentView === "results"}
    <ResultsModal />
  {/if}
</main>

<style>
  .app-container {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    position: relative;
  }
</style>
