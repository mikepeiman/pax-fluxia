<script lang="ts">
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
  import SpeedControls from "./SpeedControls.svelte";
  import Leaderboard from "./Leaderboard.svelte";
  import ResultsModal from "./ResultsModal.svelte";
  import { GAME_CONFIG } from "$lib/config/game.config";
  import { browser } from "$app/environment";

  const winner = $derived(activeGameStore.phase === "results");

  // Transfer rate control (display as %, store as decimal)
  let transferPercent = $state(Math.round(GAME_CONFIG.TRANSFER_RATE * 100));

  // Collapsible state with localStorage persistence
  const LS_KEY = "pax-controls-collapsed";
  let isCollapsed = $state(
    browser ? localStorage.getItem(LS_KEY) === "true" : false,
  );

  function toggleCollapsed() {
    isCollapsed = !isCollapsed;
    if (browser) {
      localStorage.setItem(LS_KEY, String(isCollapsed));
    }
  }

  function handleTransferChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = parseInt(target.value);
    transferPercent = value;
    GAME_CONFIG.TRANSFER_RATE = value / 100; // Convert % to decimal
  }
</script>

<div class="hud-footer no-select">
  <!-- Left: Leaderboard -->
  <div class="footer-left">
    <Leaderboard players={activeGameStore.players} />
  </div>

  <!-- Right: Controls -->
  <div class="footer-right">
    <div class="command-deck glass-panel">
      <button class="command-deck__header" onclick={toggleCollapsed}>
        <span class="command-deck__title">Controls</span>
        <span class="collapse-icon">{isCollapsed ? "▶" : "▼"}</span>
      </button>

      {#if !isCollapsed}
        <SpeedControls
          speed={activeGameStore.speed}
          isPaused={activeGameStore.isPaused}
          hasStarted={activeGameStore.phase === "playing"}
          onSpeedChange={activeGameStore.setSpeed}
          onPause={activeGameStore.pauseGame}
          onResume={activeGameStore.resumeGame}
          onStart={() => activeGameStore.startGame()}
        />

        <!-- Transfer Rate Slider -->
        <div class="flow-control">
          <label class="flow-label" for="transfer-slider">
            Transfer: <span class="flow-value">{transferPercent}%</span>
          </label>
          <input
            type="range"
            id="transfer-slider"
            min="10"
            max="100"
            step="5"
            value={transferPercent}
            oninput={handleTransferChange}
            class="flow-slider"
          />
        </div>

        <div class="system-controls">
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
      {/if}
    </div>
  </div>

  <!-- Results Modal (overlay) -->
  {#if winner}
    <div class="modal-overlay">
      <ResultsModal />
    </div>
  {/if}
</div>

<style>
  .hud-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
    gap: var(--space-4);
  }

  .footer-left {
    flex-shrink: 0;
  }

  .footer-right {
    flex-shrink: 0;
  }

  .command-deck {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .command-deck__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: inherit;
  }

  .command-deck__title {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .command-deck__header:hover .collapse-icon {
    color: var(--color-accent-cyan);
  }

  .collapse-icon {
    font-size: var(--text-xs);
    color: var(--color-text-dim);
    transition: color var(--transition-fast);
  }

  .system-controls {
    display: flex;
    gap: var(--space-2);
  }

  .flow-control {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .flow-label {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    display: flex;
    justify-content: space-between;
  }

  .flow-value {
    color: var(--color-accent-cyan);
    font-weight: bold;
  }

  .flow-slider {
    width: 100%;
    height: 6px;
    accent-color: var(--color-accent-cyan);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
  }
</style>
