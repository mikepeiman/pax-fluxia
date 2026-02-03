<script lang="ts">
  import "../app.css";
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import MainMenu from "$lib/components/ui/MainMenu.svelte";
  import ResultsModal from "$lib/components/ui/ResultsModal.svelte";
  import GameCanvas from "$lib/components/game/GameCanvas.svelte";
  import DebugPanel from "$lib/components/ui/DebugPanel.svelte";
  import CombatDebugPanel from "$lib/components/ui/CombatDebugPanel.svelte";
  import StarsPanel from "$lib/components/ui/StarsPanel.svelte";
  import Leaderboard from "$lib/components/ui/Leaderboard.svelte";
  import SpeedControls from "$lib/components/ui/SpeedControls.svelte";
  import CombatLogPanel from "$lib/components/ui/CombatLogPanel.svelte";

  // Panel visibility states
  let showDebug = $state(false);

  function handleKeyDown(event: KeyboardEvent) {
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
    href="https://fonts.googleapis.com/css2?family=Exo:wght@400;700;900&family=Montserrat:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<main class="app-container">
  {#if gameStore.currentView === "menu"}
    <MainMenu />
  {:else if gameStore.currentView === "game"}
    <div class="game-layout">
      <!-- MAIN CANVAS AREA -->
      <div class="area-canvas">
        <GameCanvas />

        <!-- Overlays -->
        {#if showDebug}
          <DebugPanel onClose={() => (showDebug = false)} />
        {/if}

        {#if gameStore.winner}
          <div class="modal-overlay">
            <ResultsModal />
          </div>
        {/if}

        <!-- BOTTOM LEFT OVERLAY: Logs + Controls -->
        <!-- "Move combat log above gamecontrols bottom left" -->
        <div class="overlay-bottom-left">
          <div class="logs-wrapper">
            <CombatLogPanel />
          </div>

          <div class="controls-wrapper glass-panel">
            <SpeedControls
              speed={gameStore.speed}
              isPaused={gameStore.isPaused}
              onSpeedChange={gameStore.setSpeed}
              onPause={gameStore.pauseGame}
              onResume={gameStore.resumeGame}
            />
            <div class="action-buttons">
              <button
                class="btn btn--ghost btn--sm"
                onclick={() => gameStore.playAgain()}
              >
                Restart
              </button>
              <button
                class="btn btn--danger btn--sm"
                onclick={() => gameStore.surrender()}
              >
                Surrender
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT SIDEBAR -->
      <div class="area-right">
        <!-- 1. Commanders -->
        <div class="panel-section section-commanders">
          <Leaderboard players={gameStore.leaderboard} />
        </div>

        <!-- 2. Stars Panel (Empire Info & Lists) -->
        <div class="panel-section section-stars">
          <StarsPanel />
        </div>

        <!-- 3. Combat Tuning (Moved from Overlay to fill empty space) -->
        <div class="panel-section section-tuning">
          <CombatDebugPanel />
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: #000;
    color: #fff;
    font-family: "Montserrat", sans-serif;
  }

  :global(h1, h2, h3, h4, .ship-count, .value, .tick, .star-id) {
    font-family: "Exo", sans-serif;
  }

  .app-container {
    width: 100vw;
    height: 100vh;
  }

  /* GRID LAYOUT V3 - CORRECTED */
  .game-layout {
    display: grid;
    grid-template-columns: 1fr 320px; /* Canvas | Right Sidebar */
    grid-template-areas: "canvas right";
    height: 100vh;
    width: 100vw;
  }

  /* AREA: Canvas */
  .area-canvas {
    grid-area: canvas;
    position: relative; /* Anchor for absolute overlays */
    background: #050510;
    overflow: hidden;
  }

  /* AREA: Right Sidebar */
  .area-right {
    grid-area: right;
    background: rgba(10, 10, 15, 0.95);
    border-left: 1px solid #334;
    display: flex;
    flex-direction: column;
    padding: 10px;
    gap: 15px;
    z-index: 20;
    box-shadow: -5px 0 20px rgba(0, 0, 0, 0.5);
    overflow-y: auto;
  }

  .panel-section {
    flex-shrink: 0; /* Prevent sections from collapsing weirdly */
  }

  .section-stars {
    flex: 1; /* Allow stars panel to take remaining space if needed */
    min-height: 200px; /* But ensure it has space */
  }

  /* OVERLAYS (Floating above Canvas) */
  .modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    pointer-events: auto;
  }

  .overlay-bottom-left {
    position: absolute;
    bottom: 20px;
    left: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 320px;
    z-index: 50;
    pointer-events: none; /* Let clicks pass through gaps */
  }
  .overlay-bottom-left > * {
    pointer-events: auto;
  }

  .logs-wrapper {
    max-height: 70vh; /* Expanded height */
    overflow-y: auto;
    background: rgba(10, 10, 15, 0.9);
    border-radius: 8px;
    border: 1px solid #334;
    display: flex;
    flex-direction: column;
  }

  .controls-wrapper {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
  }

  /* Utilities */
  .glass-panel {
    background: rgba(20, 20, 30, 0.8);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  }

  .btn {
    flex: 1;
    padding: 8px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    transition: all 0.2s;
  }

  .btn--ghost {
    background: transparent;
    border: 1px solid #556;
    color: #889;
  }
  .btn--ghost:hover {
    border-color: #fff;
    color: #fff;
  }

  .btn--danger {
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.5);
    color: #fca5a5;
  }
  .btn--danger:hover {
    background: rgba(239, 68, 68, 0.4);
    color: #fff;
  }
</style>
