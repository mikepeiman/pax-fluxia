<script lang="ts">
  import "../app.css";
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import MainMenu from "$lib/components/ui/MainMenu.svelte";
  import GameHUD from "$lib/components/ui/GameHUD.svelte";
  import ResultsModal from "$lib/components/ui/ResultsModal.svelte";
  import GameCanvas from "$lib/components/game/GameCanvas.svelte";
  import DebugPanel from "$lib/components/ui/DebugPanel.svelte";
  import CombatDebugPanel from "$lib/components/ui/CombatDebugPanel.svelte";
  import StarsPanel from "$lib/components/ui/StarsPanel.svelte";

  // Panel visibility states
  let showDebug = $state(false);
  let showStarsDrawer = $state(true);

  function handleKeyDown(event: KeyboardEvent) {
    // Backtick key toggles debug panel
    if (event.key === "`" || event.key === "~") {
      event.preventDefault();
      showDebug = !showDebug;
    }
    // Tab key toggles stars drawer
    if (event.key === "Tab" && gameStore.currentView === "game") {
      event.preventDefault();
      showStarsDrawer = !showStarsDrawer;
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
    <div class="game-layout" class:drawer-open={showStarsDrawer}>
      <!-- Left Column: Controls + Logs -->
      <div class="area-left">
        <div class="area-controls">
          <CombatDebugPanel />
        </div>
        <div class="area-logs">
          <div class="logs-header">📋 Combat Logs</div>
          <div class="logs-content">
            <!-- Combat execution logs will go here -->
            <div class="log-placeholder">
              Execute an attack to see formula breakdown
            </div>
          </div>
        </div>
      </div>

      <!-- Center: Game Canvas -->
      <div class="area-canvas">
        {#key gameStore.sessionId}
          <GameCanvas />
        {/key}
      </div>

      <!-- Right Drawer: Stars Panel -->
      <div class="area-drawer" class:open={showStarsDrawer}>
        <button
          class="drawer-toggle"
          onclick={() => (showStarsDrawer = !showStarsDrawer)}
        >
          {showStarsDrawer ? "◀" : "▶"}
        </button>
        <div class="drawer-content">
          <StarsPanel />
        </div>
      </div>

      <!-- Footer -->
      <div class="area-footer">
        <GameHUD />
      </div>
    </div>

    <!-- System Debug Panel (bottom right) -->
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
    grid-template-columns: 320px 1fr 0px;
    grid-template-rows: 1fr auto;
    grid-template-areas:
      "left canvas drawer"
      "footer footer footer";
    height: 100vh;
    width: 100vw;
    transition: grid-template-columns 0.3s ease;
  }

  .game-layout.drawer-open {
    grid-template-columns: 320px 1fr 280px;
  }

  .area-left {
    grid-area: left;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: rgba(10, 10, 15, 0.95);
    border-right: 1px solid #334;
  }

  .area-controls {
    flex: 0 0 auto;
    max-height: 50%;
    overflow-y: auto;
    border-bottom: 1px solid #334;
  }

  .area-logs {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .logs-header {
    padding: 10px 12px;
    background: #1a1a25;
    border-bottom: 1px solid #334;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    font-weight: bold;
    color: #fff;
  }

  .logs-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: #888;
  }

  .log-placeholder {
    color: #556;
    font-style: italic;
    text-align: center;
    padding: 20px;
  }

  .area-canvas {
    grid-area: canvas;
    position: relative;
    overflow: hidden;
  }

  .area-drawer {
    grid-area: drawer;
    position: relative;
    background: rgba(10, 10, 15, 0.95);
    border-left: 1px solid #334;
    overflow: visible; /* Allow button to stick out */
    z-index: 20;
    width: 0;
    transition: width 0.3s ease;
  }

  .area-drawer.open {
    width: 280px;
  }

  .drawer-toggle {
    position: absolute;
    left: -24px;
    top: 50%;
    transform: translateY(-50%);
    width: 24px;
    height: 48px;
    background: #1a1a25;
    border: 1px solid #334;
    border-right: none;
    border-radius: 4px 0 0 4px;
    color: #888;
    cursor: pointer;
    font-size: 12px;
    z-index: 10;
  }

  .drawer-toggle:hover {
    background: #252535;
    color: #fff;
  }

  .drawer-content {
    height: 100%;
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
</style>
