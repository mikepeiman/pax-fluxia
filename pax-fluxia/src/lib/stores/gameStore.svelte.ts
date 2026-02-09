// ============================================================================
// Game Store - Svelte 5 Runes-based state management
// ============================================================================

import type {
    GameView,
    GameSpeed,
    GameSettings,
    GameState,
    StarId,
    AILevel,
    PlayerState
} from '$lib/types/game.types';

import { GameEngine, createEngine } from '$lib/engine/GameEngine';
import { combatLog } from '$lib/stores/combatLogStore';
import { audio } from '$lib/audio/AudioManager';
import { GAME_CONFIG } from '$lib/config/game.config';
import { activeGameStore } from '$lib/stores/activeGameStore.svelte';

// Default settings
const DEFAULT_SETTINGS: GameSettings = {
    map: 'empire',
    playerCount: 6,
    difficulty: 'normal',
    minLinksPerStar: 1,
    maxLinksPerStar: 6
};

// Human player ID (constant)
const HUMAN_PLAYER_ID = 'human-player';

// ============================================================================
// Reactive State (Runes)
// ============================================================================

/** Current application view */
let currentView = $state<GameView>('menu');

/** Game settings from menu */
let settings = $state<GameSettings>({ ...DEFAULT_SETTINGS });

/** Latest game state snapshot from engine */
let snapshot = $state<GameState | null>(null);

/** Tick progress for metronome (0-1) */
let tickProgress = $state<number>(0);

/** The game engine instance */
let engine: GameEngine | null = null;

/** Session ID to force component remounts */
let sessionId = $state(0);

/** Whether the game has been started (START button pressed) */
let hasStarted = $state(false);

// ============================================================================
// Derived State
// ============================================================================

/** Current game speed */
const speed = $derived(snapshot?.speed ?? 0);

/** Whether game is paused */
const isPaused = $derived(snapshot?.isPaused ?? true);

/** Current winner (if any) */
const winner = $derived(snapshot?.winner ?? null);

/** Human player state */
const humanPlayer = $derived(
    snapshot?.players.find((p: PlayerState) => !p.isAI) ?? null
);

/** Sorted leaderboard */
const leaderboard = $derived(
    [...(snapshot?.players ?? [])]
        .filter((p: PlayerState) => !p.isEliminated)
        .sort((a: PlayerState, b: PlayerState) => (b.totalShips ?? 0) - (a.totalShips ?? 0))
);

// ============================================================================
// Actions
// ============================================================================

/** Navigate to a view */
function setView(view: GameView): void {
    currentView = view;
}

/** Update game settings */
function updateSettings(partial: Partial<GameSettings>): void {
    settings = { ...settings, ...partial };
}

/** Start a new game */
async function startGame(): Promise<void> {
    // Destroy existing engine if any
    if (engine) {
        engine.destroy();
    }

    // Initialize audio (requires user gesture - game start counts)
    await audio.init();

    // Clear combat log from previous game
    combatLog.clear();

    // Create new engine
    sessionId++;
    engine = createEngine({
        settings,
        humanPlayerId: HUMAN_PLAYER_ID
    });

    // Set up callbacks
    engine.setOnTick((state: GameState) => {
        snapshot = state;

        // Play tick sound
        audio.tick();

        // Check for game over
        if (state.winner) {
            currentView = 'results';
        }
    });

    engine.setOnTickProgress((progress: number) => {
        tickProgress = progress;
    });

    // Feed tick events into the unified pipeline
    engine.setOnTickEvents((events) => {
        activeGameStore.pushTickEvents(events);
    });

    // Initial state
    snapshot = engine.getState();

    // Navigate to game view
    currentView = 'game';

    // Don't auto-start - game begins paused, player presses START or spacebar
    // engine.start();
    snapshot = engine.getState();
}

/** Pause the game */
function pauseGame(): void {
    if (engine) {
        engine.pause();
        snapshot = engine.getState();
    }
}

/** Resume the game */
function resumeGame(): void {
    if (engine) {
        // If not started yet, call beginGame instead
        if (!hasStarted) {
            beginGame();
            return;
        }
        engine.resume();
        snapshot = engine.getState();
    }
}

/** Restart the game */
function restart(): void {
    hasStarted = false; // Reset so START button shows again
    startGame();
}

/** Begin the game (START button pressed or spacebar when paused and not started) */
function beginGame(): void {
    if (engine && !hasStarted) {
        hasStarted = true;
        engine.start();
        snapshot = engine.getState();
    }
}

/** Set game speed */
function setSpeed(newSpeed: GameSpeed): void {
    if (engine) {
        engine.setSpeed(newSpeed);
        snapshot = engine.getState();
    }
}

/** Issue attack order (create flow link)
 * @param sourceId - Source star ID
 * @param targetId - Target star ID
 * @param persistAfterConquest - If false (ctrl-click), order clears when star is captured
 * @returns true if successful
 */
function issueOrder(sourceId: StarId, targetId: StarId, persistAfterConquest?: boolean): boolean {
    if (engine) {
        const result = engine.createLink(sourceId, targetId, persistAfterConquest);
        // INSTANT UI: Refresh snapshot immediately (don't wait for tick)
        if (result) {
            snapshot = engine.getState();
        }
        return result;
    }
    return false;
}

/** Cancel attack order */
function cancelOrder(starId: StarId): void {
    if (engine) {
        engine.cancelLink(starId);
        // INSTANT UI: Refresh snapshot immediately (don't wait for tick)
        snapshot = engine.getState();
    }
}

/** Set deferred order on enemy star (executes when captured)
 * @param enemyStarId - Enemy star to set order on
 * @param nextTargetId - Where to attack after capturing
 * @param persistAfterConquest - If false (ctrl-click), order clears if star is captured again
 */
function setDeferredOrder(enemyStarId: StarId, nextTargetId: StarId, persistAfterConquest?: boolean): boolean {
    if (engine) {
        const result = engine.setDeferredOrder(enemyStarId, nextTargetId, persistAfterConquest);
        if (result) {
            snapshot = engine.getState();
        }
        return result;
    }
    return false;
}

/** Surrender the game */
function surrender(): void {
    if (engine) {
        // Stop the game
        engine.pause();
        // Trigger surrender logic - eliminates human and picks winner
        engine.surrender();
        // Update snapshot to reflect the surrender state
        snapshot = engine.getState();
    }
    // Navigate to results screen
    currentView = 'results';
}

/** Play again with same settings */
function playAgain(): void {
    startGame();
}



/** Return to main menu */
function returnToMenu(): void {
    // Destroy engine
    if (engine) {
        engine.destroy();
        engine = null;
    }

    snapshot = null;
    tickProgress = 0;
    currentView = 'menu';
}

/** Get engine stats for results screen */
function getStats() {
    if (engine) {
        return engine.getStats();
    }
    return {
        elapsedMs: 0,
        totalTicks: 0,
        peakFleetSize: 0,
        starsCaptured: 0
    };
}

/** Get stats history for endgame charts */
function getHistory() {
    if (engine) {
        return engine.getStatsHistory();
    }
    return [];
}

/** Force update config (e.g. from DebugPanel) */
function updateConfig(): void {
    if (engine) {
        engine.updateConfig();
    }
}

// ============================================================================
// Export Store
// ============================================================================

/** Toggle RETAIN_ORDER_ON_CONQUEST setting */
function toggleRetainOrderOnConquest(): void {
    GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST = !GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST;
}

export const gameStore = {
    // Reactive getters (use these in components with gameStore.xxx)
    get currentView() { return currentView; },
    get settings() { return settings; },
    get snapshot() { return snapshot; },
    get tickProgress() { return tickProgress; },
    get speed() { return speed; },
    get isPaused() { return isPaused; },
    get winner() { return winner; },
    get humanPlayer() { return humanPlayer; },
    get leaderboard() { return leaderboard; },
    get sessionId() { return sessionId; },
    get hasStarted() { return hasStarted; },
    get retainOrderOnConquest() { return GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST; },

    // Actions
    setView,
    updateSettings,
    startGame,
    pauseGame,
    resumeGame,
    setSpeed,
    issueOrder,
    cancelOrder,
    setDeferredOrder,
    surrender,
    playAgain,
    returnToMenu,
    restart,
    getStats,
    getHistory,
    updateConfig,
    beginGame,
    toggleRetainOrderOnConquest
};
