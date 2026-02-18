<script lang="ts">
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
  import SpeedControls from "$lib/components/ui/SpeedControls.svelte";
  import Leaderboard from "$lib/components/ui/Leaderboard.svelte";
  import ResultsModal from "$lib/components/ui/ResultsModal.svelte";
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

  let showSurrenderModal = $state(false);
  let showEliminatedModal = $state(false);
  let hasSeenElimination = $state(false);
  let showStatsOverlay = $state(false);

  // Auto-show elimination modal when player is eliminated
  const isEliminated = $derived(activeGameStore.isLocalPlayerEliminated());
  $effect(() => {
    if (isEliminated && !hasSeenElimination) {
      hasSeenElimination = true;
      showEliminatedModal = true;
    }
  });

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
            onclick={() => activeGameStore.playAgain()}
          >
            {#if activeGameStore.restartVoteInfo}
              Restart ({activeGameStore.restartVoteInfo.votes}/{activeGameStore
                .restartVoteInfo.needed})
            {:else}
              Restart
            {/if}
          </button>
          <button
            class="btn btn--danger btn--sm"
            onclick={() => (showSurrenderModal = true)}
          >
            Quit
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

  <!-- Quit Game Modal (3 options) -->
  {#if showSurrenderModal}
    <div class="modal-overlay" role="dialog" aria-modal="true">
      <div class="surrender-modal glass-panel">
        <h3 class="surrender-modal__title">Quit Game?</h3>
        <p class="surrender-modal__desc">Choose how to end your campaign.</p>
        <div class="surrender-modal__actions quit-actions">
          <button
            class="btn btn--primary btn--md"
            onclick={() => {
              showSurrenderModal = false;
              showStatsOverlay = true;
            }}
          >
            📊 View Stats
            <span class="btn-sub">Peek at standings</span>
          </button>
          <button
            class="btn btn--ghost btn--md"
            onclick={() => {
              showSurrenderModal = false;
              activeGameStore.surrenderAndSpectate();
            }}
          >
            👁 Surrender & Watch
            <span class="btn-sub">Stay connected, spectate</span>
          </button>
          <button
            class="btn btn--danger btn--md"
            onclick={() => {
              showSurrenderModal = false;
              activeGameStore.surrenderAndLeave();
            }}
          >
            🚪 Surrender & Leave
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

  <!-- Stats Overlay (peek at standings without ending game) -->
  {#if showStatsOverlay}
    <div class="modal-overlay" role="dialog" aria-modal="true">
      <ResultsModal />
      <button
        class="close-stats-btn btn btn--ghost btn--sm"
        onclick={() => (showStatsOverlay = false)}
      >
        ✕ Close
      </button>
    </div>
  {/if}

  <!-- Spectator Banner -->
  {#if activeGameStore.isSpectating}
    <div class="spectator-banner">👁 SPECTATING</div>
  {/if}

  <!-- Elimination Modal -->
  {#if showEliminatedModal}
    <div class="modal-overlay" role="dialog" aria-modal="true">
      <div class="surrender-modal glass-panel">
        <h3 class="surrender-modal__title">💀 Eliminated</h3>
        <p class="surrender-modal__desc">
          You have been wiped from the galaxy.
        </p>
        <div class="surrender-modal__actions">
          <button
            class="btn btn--primary btn--md"
            onclick={() => {
              showEliminatedModal = false;
            }}
          >
            👁 Spectate
            <span class="btn-sub">Watch the galaxy burn</span>
          </button>
          <button
            class="btn btn--ghost btn--md"
            onclick={() => {
              showEliminatedModal = false;
              gameStore.surrender();
            }}
          >
            🏁 End Game
            <span class="btn-sub">View results & graphs</span>
          </button>
        </div>
      </div>
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

  .surrender-modal {
    padding: var(--space-6, 24px);
    max-width: 340px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4, 16px);
    text-align: center;
  }

  .surrender-modal__title {
    font-size: 1.2rem;
    margin: 0;
    color: var(--color-text-primary, #fff);
    letter-spacing: 0.08em;
  }

  .surrender-modal__desc {
    font-size: var(--text-sm, 0.875rem);
    color: var(--color-text-muted, #888);
    margin: 0;
  }

  .surrender-modal__actions {
    display: flex;
    gap: var(--space-3, 12px);
    width: 100%;
  }

  .surrender-modal__actions .btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: var(--space-3, 12px) var(--space-4, 16px);
  }

  .btn-sub {
    font-size: 0.65rem;
    opacity: 0.6;
    font-weight: 400;
  }

  .surrender-modal__cancel {
    opacity: 0.5;
    font-size: var(--text-xs, 0.75rem);
  }

  .quit-actions {
    flex-direction: column;
  }

  .close-stats-btn {
    position: absolute;
    top: var(--space-4, 16px);
    right: var(--space-4, 16px);
    z-index: 1001;
    color: var(--color-text-primary, #fff);
  }

  .spectator-banner {
    position: fixed;
    top: var(--space-4, 16px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 900;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid var(--color-accent-cyan, #44eeff);
    color: var(--color-accent-cyan, #44eeff);
    padding: var(--space-2, 8px) var(--space-5, 20px);
    border-radius: 9999px;
    font-size: var(--text-xs, 0.75rem);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    pointer-events: none;
    animation: spectate-pulse 2s ease-in-out infinite;
  }

  @keyframes spectate-pulse {
    0%,
    100% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
  }
</style>
