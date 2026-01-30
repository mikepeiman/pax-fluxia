<script lang="ts">
  import "../app.css";
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import MainMenu from "$lib/components/ui/MainMenu.svelte";
  import GameHUD from "$lib/components/ui/GameHUD.svelte";
  import ResultsModal from "$lib/components/ui/ResultsModal.svelte";
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
    <!-- Game Canvas will be added in Phase 3 -->
    <div class="game-placeholder">
      <p class="font-display">Game Canvas (Phase 3)</p>
    </div>
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

  .game-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(
        circle at 30% 40%,
        rgba(68, 136, 255, 0.1) 0%,
        transparent 40%
      ),
      radial-gradient(
        circle at 70% 60%,
        rgba(255, 68, 102, 0.1) 0%,
        transparent 40%
      ),
      var(--color-void-deep);
    color: var(--color-text-dim);
  }
</style>
