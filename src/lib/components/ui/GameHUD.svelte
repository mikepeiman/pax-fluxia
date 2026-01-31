<script lang="ts">
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import TickOrb from "./TickOrb.svelte";
  import TickMetronome from "./TickMetronome.svelte";
  import SpeedControls from "./SpeedControls.svelte";
  import Leaderboard from "./Leaderboard.svelte";
  import ResultsModal from "./ResultsModal.svelte";

  const winner = $derived(gameStore.winner);
</script>

<div class="hud-overlay no-select">
  <!-- Top Left: Telemetry -->
  <div class="hud-top-left">
    <div class="telemetry glass-panel">
      <TickOrb progress={gameStore.tickProgress} />
      <div class="fps font-data">60 FPS</div>
    </div>
  </div>

  <!-- Top Right: Leaderboard -->
  <div class="hud-top-right">
    <Leaderboard players={gameStore.leaderboard} />
  </div>

  <!-- Bottom Left: Command Deck -->
  <div class="hud-bottom-left">
    <div class="command-deck glass-panel">
      <SpeedControls
        speed={gameStore.speed}
        isPaused={gameStore.isPaused}
        onSpeedChange={gameStore.setSpeed}
        onPause={gameStore.pauseGame}
        onResume={gameStore.resumeGame}
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

  <!-- Results Modal -->
  {#if winner}
    <div class="modal-overlay">
      <ResultsModal />
    </div>
  {/if}
</div>

<style>
  .telemetry {
    padding: var(--space-3) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 180px;
  }

  .fps {
    font-size: var(--text-xs);
    color: var(--color-text-dim);
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
</style>
