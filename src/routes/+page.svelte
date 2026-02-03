<script lang="ts">
  import "../app.css";
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import MainMenu from "$lib/components/ui/MainMenu.svelte";
  import GameHUD from "$lib/components/ui/GameHUD.svelte";
  import ResultsModal from "$lib/components/ui/ResultsModal.svelte";
  import GameCanvas from "$lib/components/game/GameCanvas.svelte";
  import DebugPanel from "$lib/components/ui/DebugPanel.svelte";
  import CombatPanel from "$lib/components/ui/CombatPanel.svelte";
  import CombatDebugPanel from "$lib/components/ui/CombatDebugPanel.svelte";
  import StarsPanel from "$lib/components/ui/StarsPanel.svelte";

  // Debug panel toggle state
  let showDebug = $state(false);

  function handleKeyDown(event: KeyboardEvent) {
    // Backtick key toggles debug panel
    if (event.key === "`" || event.key === "~") {
      event.preventDefault();
      showDebug = !showDebug;
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

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
    <div class="game-layout">
      <div class="area-log">
        <StarsPanel />
      </div>
      <div class="area-canvas">
        {#key gameStore.sessionId}
          <GameCanvas />
        {/key}
      </div>
      <div class="area-footer">
        <GameHUD />
      </div>
    </div>
    <!-- Debug panels - visible with ` key -->
    <div class="debug-overlay" class:visible={showDebug}>
      <CombatDebugPanel />
    </div>
    <CombatPanel visible={showDebug} />
    <DebugPanel visible={showDebug} />
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

  .game-layout {
    display: grid;
    grid-template-columns: 320px 1fr;
    grid-template-rows: 1fr auto;
    grid-template-areas:
      "log canvas"
      "log footer";
    height: 100vh;
    width: 100vw;
  }

  .area-log {
    grid-area: log;
    overflow: hidden;
  }

  .area-canvas {
    grid-area: canvas;
    position: relative;
    overflow: hidden;
  }

  .area-footer {
    grid-area: footer;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: var(--space-4);
    background: rgba(10, 10, 15, 0.8);
    border-top: 1px solid #334;
  }

  .debug-overlay {
    position: fixed;
    top: 10px;
    right: 340px;
    z-index: 1000;
    width: 300px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .debug-overlay.visible {
    opacity: 1;
    pointer-events: auto;
  }
</style>
