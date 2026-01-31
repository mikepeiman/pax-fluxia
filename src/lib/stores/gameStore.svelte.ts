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

// Default settings
const DEFAULT_SETTINGS: GameSettings = {
    map: 'empire',
    playerCount: 2,
    difficulty: 'normal'
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
        .sort((a: PlayerState, b: PlayerState) => b.totalShips - a.totalShips)
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
function startGame(): void {
    // Destroy existing engine if any
    if (engine) {
        engine.destroy();
    }

    // Create new engine
    sessionId++;
    engine = createEngine({
        settings,
        humanPlayerId: HUMAN_PLAYER_ID
    });

    // Set up callbacks
    engine.setOnTick((state: GameState) => {
        snapshot = state;

        // Check for game over
        if (state.winner) {
            currentView = 'results';
        }
    });

    engine.setOnTickProgress((progress: number) => {
        tickProgress = progress;
    });

    // Initial state
    snapshot = engine.getState();

    // Navigate to game view
    currentView = 'game';

    // Start the engine
    engine.start();
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
        engine.resume();
        snapshot = engine.getState();
    }
}

/** Restart the game */
function restart(): void {
    startGame();
}

/** Set game speed */
function setSpeed(newSpeed: GameSpeed): void {
    if (engine) {
        engine.setSpeed(newSpeed);
        snapshot = engine.getState();
    }
}

/** Issue attack order (create flow link) - returns true if successful */
function issueOrder(sourceId: StarId, targetId: StarId): boolean {
    if (engine) {
        return engine.createLink(sourceId, targetId);
    }
    return false;
}

/** Cancel attack order */
function cancelOrder(starId: StarId): void {
    if (engine) {
        engine.cancelLink(starId);
    }
}

/** Surrender the game */
function surrender(): void {
    if (engine) {
        engine.pause();
    }
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

/** Force update config (e.g. from DebugPanel) */
function updateConfig(): void {
    if (engine) {
        engine.updateConfig();
    }
}

// ============================================================================
// Export Store
// ============================================================================

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

    // Actions
    setView,
    updateSettings,
    startGame,
    pauseGame,
    resumeGame,
    setSpeed,
    issueOrder,
    cancelOrder,
    surrender,
    playAgain,
    returnToMenu,
    restart,
    getStats,
    updateConfig
};
