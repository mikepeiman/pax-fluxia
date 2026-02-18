<script lang="ts">
  import "../app.css";
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
  import { multiplayerStore } from "$lib/stores/multiplayerStore.svelte";
  import MainMenu from "$lib/components/ui/MainMenu.svelte";
  import ResultsModal from "$lib/components/ui/ResultsModal.svelte";
  import GameCanvas from "$lib/components/game/GameCanvas.svelte";
  import GameSettingsPanel from "$lib/components/ui/GameSettingsPanel.svelte";
  import Leaderboard from "$lib/components/ui/Leaderboard.svelte";
  import SpeedControls from "$lib/components/ui/SpeedControls.svelte";
  import StarsPanel from "$lib/components/ui/StarsPanel.svelte";
  import StarInfoPanel from "$lib/components/ui/StarInfoPanel.svelte";
  import AudioSettings from "$lib/components/ui/AudioSettings.svelte";
  import TopBar from "$lib/components/ui/TopBar.svelte";
  import type { PlayerState } from "$lib/types/game.types";

  let roomIdCopied = $state(false);
  function copyRoomId() {
    if (multiplayerStore.roomId) {
      navigator.clipboard.writeText(multiplayerStore.roomId);
      roomIdCopied = true;
      setTimeout(() => (roomIdCopied = false), 1500);
    }
  }

  // Panel visibility states
  let showAudioSettings = $state(false);
  let showSurrenderModal = $state(false);
  let showStarInfoPanel = $state(
    typeof localStorage !== "undefined" &&
      localStorage.getItem("pax-show-star-info") === "true",
  );

  // Listen for StarInfoPanel toggle from GameSettingsPanel
  if (typeof window !== "undefined") {
    window.addEventListener("pax-star-info-toggle", ((e: CustomEvent) => {
      showStarInfoPanel = e.detail;
    }) as EventListener);
  }

  // ── Resizable sidebar (F-53) ──
  const SIDEBAR_STORAGE_KEY = "pax-sidebar-width";
  const SIDEBAR_MIN = 280;
  const SIDEBAR_MAX = 600;
  const SIDEBAR_DEFAULT = 380;

  function loadSidebarWidth(): number {
    if (typeof localStorage === "undefined") return SIDEBAR_DEFAULT;
    const v = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (v) {
      const n = parseInt(v);
      if (!isNaN(n)) return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, n));
    }
    return SIDEBAR_DEFAULT;
  }

  let sidebarWidth = $state(loadSidebarWidth());
  let isResizing = $state(false);

  function startResize(e: PointerEvent) {
    e.preventDefault();
    isResizing = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    function onMove(ev: PointerEvent) {
      const delta = startX - ev.clientX; // dragging left = wider
      sidebarWidth = Math.max(
        SIDEBAR_MIN,
        Math.min(SIDEBAR_MAX, startWidth + delta),
      );
    }

    function onUp() {
      isResizing = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth));
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

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
  <TopBar
    onSettingsClick={() => (showAudioSettings = true)}
    onHelpClick={() => alert("Help & controls guide coming soon!")}
  />

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

        <!-- TOP CENTER: Room ID Badge (MP only) -->
        {#if multiplayerStore.isConnected && multiplayerStore.roomId}
          <div class="overlay-top-center">
            <button
              class="room-id-badge glass-panel w-full h-full"
              onclick={copyRoomId}
              title="Click to copy Room ID"
            >
              <span class="room-id-label">ROOM</span>
              <code class="room-id-code">{multiplayerStore.roomId}</code>
              <span class="room-id-icon">{roomIdCopied ? "✓" : "📋"}</span>
            </button>
          </div>
        {/if}

        <!-- TOP LEFT: Optional debugging panels -->
        <div class="overlay-top-left">
          {#if showStarInfoPanel}
            <StarInfoPanel />
          {/if}
        </div>

        {#if gameStore.winner || activeGameStore.phase === "results"}
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

      <!-- LEFT CONTROLS COLUMN (settings panels) -->
      <div class="area-controls">
        <div class="panel-section section-tuning">
          <GameSettingsPanel />
        </div>
      </div>

      <!-- RIGHT SIDEBAR (leaderboard + info) -->
      <div class="area-right" style="width: {sidebarWidth}px;">
        <!-- Resize handle -->
        <div
          class="resize-handle"
          class:active={isResizing}
          onpointerdown={startResize}
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize"
        ></div>
        <!-- 1. Commanders -->
        <div class="panel-section section-commanders">
          <Leaderboard players={leaderboardPlayers} />
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
                activeGameStore.surrender();
              }}
            >
              🏁 End Game
              <span class="btn-sub">View results & graphs</span>
            </button>
            <button
              class="btn btn--ghost btn--md"
              onclick={() => {
                showSurrenderModal = false;
                activeGameStore.returnToMenu();
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

  /* GRID LAYOUT V7 - Two-Column Right Side */
  .game-layout {
    display: grid;
    grid-template-columns: 1fr auto auto; /* Canvas | Controls | Right Sidebar */
    grid-template-areas: "canvas controls right";
    height: 100vh;
    width: 100vw;
    transition:
      margin-left 0.2s ease,
      width 0.2s ease;
  }

  /* Responsive: narrower sidebar on smaller viewports */
  @media (max-width: 1400px) {
    .game-layout {
      grid-template-columns: 1fr auto;
    }
  }

  @media (max-width: 1100px) {
    .game-layout {
      grid-template-columns: 1fr auto;
    }
  }

  /* Very narrow: hide sidebars, full canvas */
  @media (max-width: 800px) {
    .game-layout {
      grid-template-columns: 1fr;
      grid-template-areas: "canvas";
    }
    .area-right,
    .area-controls {
      display: none;
    }
  }

  /* AREA: Controls Column */
  .area-controls {
    grid-area: controls;
    background: rgba(10, 10, 15, 0.95);
    border-left: 1px solid #223;
    display: flex;
    flex-direction: column;
    padding: 10px;
    gap: 10px;
    z-index: 20;
    overflow-y: auto;
    width: 340px;
    min-width: 280px;
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
    position: relative;
    background: rgba(10, 10, 15, 0.95);
    border-left: 1px solid #334;
    display: flex;
    flex-direction: column;
    padding: 10px;
    gap: 10px;
    z-index: 20;
    box-shadow: -5px 0 20px rgba(0, 0, 0, 0.5);
    overflow-y: auto;
    flex-shrink: 0;
  }

  /* Drag-to-resize handle */
  .resize-handle {
    position: absolute;
    top: 0;
    left: -3px;
    width: 6px;
    height: 100%;
    cursor: col-resize;
    z-index: 25;
    background: transparent;
    transition: background 0.15s;
  }
  .resize-handle:hover,
  .resize-handle.active {
    background: rgba(0, 224, 255, 0.3);
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
  .overlay-top-center {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    pointer-events: auto;
  }

  .room-id-badge {
    display: flex;
    z-index: 10;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    cursor: pointer;
    border: 1px solid rgba(0, 255, 255, 0.25);
    transition: all 0.2s ease;
    font-family: inherit;
    color: #fff;
    width: 100%;
    height: 100%;
  }
  .room-id-badge:hover {
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 0 12px rgba(0, 255, 255, 0.15);
  }
  .room-id-label {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
  }
  .room-id-code {
    font-family: monospace;
    font-size: 0.8rem;
    color: #00ffff;
    letter-spacing: 0.05em;
  }
  .room-id-icon {
    font-size: 0.75rem;
    opacity: 0.6;
  }

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
