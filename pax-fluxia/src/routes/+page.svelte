<script lang="ts">
  import "../app.css";
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
  import MainMenu from "$lib/components/ui/MainMenu.svelte";
  import ResultsModal from "$lib/components/ui/ResultsModal.svelte";
  import GameCanvas from "$lib/components/game/GameCanvas.svelte";
  import CombatDebugPanel from "$lib/components/ui/CombatDebugPanel.svelte";
  import Leaderboard from "$lib/components/ui/Leaderboard.svelte";
  import SpeedControls from "$lib/components/ui/SpeedControls.svelte";
  import StarsPanel from "$lib/components/ui/StarsPanel.svelte";
  import AudioSettings from "$lib/components/ui/AudioSettings.svelte";
  import type { PlayerState } from "$lib/types/game.types";

  // Panel visibility states
  let showAudioSettings = $state(false);
  let showSurrenderModal = $state(false);

  // Derived leaderboard - use activeGameStore for unified access
  const leaderboardPlayers = $derived.by(() => {
    const players = activeGameStore.players as PlayerState[];
    return [...players]
      .filter((p: PlayerState) => !p.isEliminated)
      .sort(
        (a: PlayerState, b: PlayerState) =>
          (b.totalShips ?? 0) - (a.totalShips ?? 0),
      );
  });
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
    href="https://fonts.googleapis.com/css2?family=Exo:wght@400;700;900&family=Montserrat:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<main class="app-container">
  {#if gameStore.currentView === "menu"}
    <MainMenu />
  {:else if gameStore.currentView === "results"}
    <!-- GAME OVER SCREEN -->
    <div class="results-view">
      <ResultsModal />
    </div>
  {:else if gameStore.currentView === "game"}
    <!-- Audio Settings Modal -->
    <AudioSettings
      visible={showAudioSettings}
      onClose={() => (showAudioSettings = false)}
    />

    <div class="game-layout">
      <!-- MAIN CANVAS AREA -->
      <div class="area-canvas">
        <GameCanvas />

        <!-- Overlays -->

        <!-- TOP LEFT: Stars Panel (was Combat Logs, then StarInfoPanel) -->
        <div class="overlay-top-left">
          <StarsPanel />
        </div>

        {#if gameStore.winner || (activeGameStore.phase as string) === "ended"}
          <div class="modal-overlay">
            <ResultsModal />
          </div>
        {/if}

        <!-- BOTTOM LEFT OVERLAY: Game Controls -->
        <div class="overlay-bottom-left">
          <div class="controls-wrapper glass-panel">
            <SpeedControls
              speed={activeGameStore.speed}
              isPaused={activeGameStore.isPaused}
              hasStarted={activeGameStore.phase === "playing"}
              onSpeedChange={(speed) => activeGameStore.setSpeed(speed)}
              onPause={() => activeGameStore.pauseGame()}
              onResume={() => activeGameStore.resumeGame()}
              onStart={() => activeGameStore.startGame()}
            />

            <div class="action-buttons">
              <button
                class="btn btn--ghost btn--sm"
                onclick={() => activeGameStore.playAgain()}
              >
                Restart
              </button>
              <button
                class="btn btn--ghost btn--sm"
                onclick={() => (showAudioSettings = true)}
                title="Audio Settings"
              >
                🔊
              </button>
              <button
                class="btn btn--danger btn--sm"
                onclick={() => (showSurrenderModal = true)}
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT SIDEBAR -->
      <div class="area-right">
        <!-- 1. Commanders -->
        <div class="panel-section section-commanders">
          <Leaderboard players={leaderboardPlayers} />
        </div>

        <!-- 2. Combat Tuning (fills remaining space) -->
        <div class="panel-section section-tuning">
          <CombatDebugPanel />
        </div>
      </div>
    </div>

    <!-- Surrender Confirmation Modal -->
    {#if showSurrenderModal}
      <div class="modal-overlay" role="dialog" aria-modal="true">
        <div class="surrender-modal glass-panel">
          <h3 class="surrender-modal__title">Surrender?</h3>
          <p class="surrender-modal__desc">Choose how to end your campaign.</p>
          <div class="surrender-modal__actions">
            <button
              class="btn btn--primary btn--md"
              onclick={() => {
                showSurrenderModal = false;
                gameStore.surrender();
              }}
            >
              🏁 End Game
              <span class="btn-sub">View results & graphs</span>
            </button>
            <button
              class="btn btn--ghost btn--md"
              onclick={() => {
                showSurrenderModal = false;
                gameStore.returnToMenu();
              }}
            >
              🚪 Abandon
              <span class="btn-sub">Return to main menu</span>
            </button>
          </div>
          <button
            class="btn btn--ghost btn--sm surrender-modal__cancel"
            onclick={() => (showSurrenderModal = false)}
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}
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

  /* RESULTS VIEW - Full screen centered results */
  .results-view {
    width: 100vw;
    height: 100vh;
    background: linear-gradient(180deg, #050510 0%, #0a0a1a 50%, #050510 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* GRID LAYOUT V6 - Fully Responsive */
  .game-layout {
    display: grid;
    grid-template-columns: 1fr minmax(250px, 320px); /* Canvas | Right Sidebar */
    grid-template-areas: "canvas right";
    height: 100vh;
    width: 100vw;
    transition:
      margin-left 0.2s ease,
      width 0.2s ease;
  }

  /* Responsive: narrower sidebar on smaller viewports */
  @media (max-width: 1400px) {
    .game-layout {
      grid-template-columns: 1fr 280px;
    }
  }

  @media (max-width: 1100px) {
    .game-layout {
      grid-template-columns: 1fr 240px;
    }
  }

  /* Very narrow: hide sidebar, full canvas */
  @media (max-width: 800px) {
    .game-layout {
      grid-template-columns: 1fr;
      grid-template-areas: "canvas";
    }
    .area-right {
      display: none;
    }
  }

  /* AREA: Canvas */
  .area-canvas {
    grid-area: canvas;
    position: relative; /* Anchor for absolute overlays */
    background: #050510;
    overflow: hidden;
    /* Ensure canvas fills available space */
    min-width: 0;
    min-height: 0;
  }

  /* AREA: Right Sidebar */
  .area-right {
    grid-area: right;
    background: rgba(10, 10, 15, 0.95);
    border-left: 1px solid #334;
    display: flex;
    flex-direction: column;
    padding: 10px;
    gap: 10px;
    z-index: 20;
    box-shadow: -5px 0 20px rgba(0, 0, 0, 0.5);
    overflow-y: auto;
    /* Prevent sidebar from growing too wide */
    max-width: 320px;
  }

  .panel-section {
    flex-shrink: 0; /* Prevent sections from collapsing weirdly */
  }

  .section-tuning {
    flex: 1; /* Fill remaining space */
    overflow: hidden; /* Inner section-body handles scroll */
    min-height: 200px;
    display: flex;
    flex-direction: column;
  }

  /* OVERLAYS (Floating above Canvas) */
  .overlay-top-left {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 30;
    pointer-events: auto;
  }

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
    width: 280px;
    z-index: 50;
    pointer-events: none; /* Let clicks pass through gaps */
  }
  .overlay-bottom-left > * {
    pointer-events: auto;
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

  .btn--primary {
    background: rgba(59, 130, 246, 0.3);
    border: 1px solid rgba(59, 130, 246, 0.6);
    color: #93c5fd;
  }
  .btn--primary:hover {
    background: rgba(59, 130, 246, 0.5);
    color: #fff;
  }

  .btn--md {
    padding: 12px 16px;
    font-size: 13px;
  }

  .surrender-modal {
    padding: 24px;
    max-width: 340px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
  }
  .surrender-modal__title {
    font-size: 1.2rem;
    margin: 0;
    color: #fff;
    letter-spacing: 0.08em;
  }
  .surrender-modal__desc {
    font-size: 0.875rem;
    color: #888;
    margin: 0;
  }
  .surrender-modal__actions {
    display: flex;
    gap: 12px;
    width: 100%;
  }
  .surrender-modal__actions .btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .btn-sub {
    font-size: 0.65rem;
    opacity: 0.6;
    font-weight: 400;
    text-transform: none;
  }
  .surrender-modal__cancel {
    opacity: 0.5;
    font-size: 0.75rem;
  }
</style>
