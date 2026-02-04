<script lang="ts">
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import SpeedControls from "./SpeedControls.svelte";
  import Leaderboard from "./Leaderboard.svelte";
  import ResultsModal from "./ResultsModal.svelte";

  const winner = $derived(gameStore.winner);
</script>

<div class="hud-footer no-select">
  <!-- Left: Leaderboard -->
  <div class="footer-left">
    <Leaderboard players={gameStore.leaderboard} />
  </div>

  <!-- Right: Controls -->
  <div class="footer-right">
    <div class="command-deck glass-panel">
      <SpeedControls
        speed={gameStore.speed}
        isPaused={gameStore.isPaused}
        hasStarted={gameStore.hasStarted}
        onSpeedChange={gameStore.setSpeed}
        onPause={gameStore.pauseGame}
        onResume={gameStore.resumeGame}
        onStart={gameStore.beginGame}
      />

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

  .system-controls {
    display: flex;
    gap: var(--space-2);
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
