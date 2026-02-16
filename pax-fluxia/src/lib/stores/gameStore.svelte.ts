// ============================================================================
// Game Store - Svelte 5 Runes-based state management
// Delegates all core logic to @pax/common shared engine (GameEngine.tick)
// ============================================================================

import type {
    GameView,
    GameSpeed,
    GameSettings,
    GameState,
    StarId,
    PlayerState,
    GameHistoryEntry
} from '$lib/types/game.types';
import type {
    GameInput,
    IssueOrderInput,
    CancelOrderInput,
    SetDeferredOrderInput,
    TickEvents,
    EngineConfig,
    StarType
} from '@pax/common';
import {
    GameEngine as SharedEngine,
    GameRoomState,
    StarSchema,
    ConnectionSchema,
    PlayerSchema,
    STAR_TYPE_STATS,
    DEFAULT_ENGINE_CONFIG,
    generateMap
} from '@pax/common';
import type { AIConfig } from '@pax/common';
import { AI, createAI, DEFAULT_AI_CONFIG } from '@pax/common';
import { combatLog } from '$lib/stores/combatLogStore';
import { audio } from '$lib/audio/AudioManager';
import { GAME_CONFIG, buildEngineConfig } from '$lib/config/game.config';
import { activeGameStore } from '$lib/stores/activeGameStore.svelte';

// ============================================================================
// Constants
// ============================================================================

const HUMAN_PLAYER_ID = 'human-player';

const PLAYER_COLORS = [
    '#4488ff', // Blue (human)
    '#ff4466', // Red
    '#44ff88', // Green
    '#ffcc44', // Yellow
    '#aa66ff', // Purple
    '#ff8844'  // Orange
];

const DEFAULT_SETTINGS: GameSettings = {
    playerCount: 6,
    difficulty: 'normal',
    minLinksPerStar: 1,
    maxLinksPerStar: 6
};

// ============================================================================
// Internal State (not reactive, not exposed)
// ============================================================================

/** The local GameRoomState (Colyseus Schema) that the shared engine mutates */
let state: GameRoomState | null = null;

/** AI player instances */
let aiPlayers: Map<string, AI> = new Map();

/** Tick loop interval */
let tickIntervalId: ReturnType<typeof setInterval> | null = null;

/** Progress animation frame */
let progressRafId: number | null = null;

/** Tick timing */
let lastTickTime = 0;
let tickIntervalMs = 1200;

/** Stats tracking */
let startTime = 0;
let peakFleetSize = 0;
let starsCaptured = 0;

/** History for endgame charts */
let history: GameHistoryEntry[] = [];

// ============================================================================
// Reactive State (Runes)
// ============================================================================

/** Current application view */
let currentView = $state<GameView>('menu');

/** Game settings from menu */
let settings = $state<GameSettings>({ ...DEFAULT_SETTINGS });

/** Latest game state snapshot (plain objects, consumed by UI) */
let snapshot = $state<GameState | null>(null);

/** Tick progress for metronome (0-1) */
let tickProgress = $state<number>(0);

/** Session ID to force component remounts */
let sessionId = $state(0);

/** Whether the game has been started (START button pressed) */
let hasStarted = $state(false);

// ============================================================================
// Derived State
// ============================================================================

const speed = $derived(snapshot?.speed ?? 0);
const isPaused = $derived(snapshot?.isPaused ?? true);
const winner = $derived(snapshot?.winner ?? null);
const humanPlayer = $derived(
    snapshot?.players.find((p: PlayerState) => !p.isAI) ?? null
);
const leaderboard = $derived(
    [...(snapshot?.players ?? [])]
        .filter((p: PlayerState) => !p.isEliminated)
        .sort((a: PlayerState, b: PlayerState) => (b.totalShips ?? 0) - (a.totalShips ?? 0))
);

// ============================================================================
// State → Snapshot Converter
// ============================================================================

/**
 * Convert GameRoomState (Colyseus Schema) → GameState (plain objects for UI).
 * This is the bridge between the shared engine's schema and the UI layer.
 */
function toGameState(s: GameRoomState): GameState {
    const players: PlayerState[] = [];
    s.players.forEach((p: PlayerSchema) => {
        players.push({
            id: p.sessionId,
            name: p.name,
            color: p.color,
            isAI: p.isAI,
            isEliminated: p.isEliminated,
            starCount: p.starCount,
            totalShips: p.totalShips,
            activeShips: p.activeShips,
            damagedShips: p.damagedShips,
        });
    });

    const stars = Array.from(s.stars.values()).map(star => ({
        id: star.id,
        x: star.x,
        y: star.y,
        radius: star.radius,
        ownerId: star.ownerId,
        activeShips: star.activeShips,
        damagedShips: star.damagedShips,
        starType: star.starType as StarType,
        productionRate: star.productionRate,
        repairRate: star.repairRate,
        transferRate: star.transferRate,
        activationRate: star.activationRate,
        defensivePosture: star.defensivePosture,
        defenseStrength: star.defenseStrength,
        lastCombatTick: star.lastCombatTick,
        targetId: star.targetId || null,
        queuedOrderTargetId: star.queuedOrderTargetId || null,
        productionOverflow: star.productionOverflow,
        repairOverflow: star.repairOverflow,
        icon: star.icon,
    }));

    const connections = Array.from(s.connections).map(c => ({
        sourceId: c.sourceId,
        targetId: c.targetId,
        distance: c.distance,
    }));

    // Find winner
    let winnerPlayer: PlayerState | null = null;
    if (s.phase === 'ended') {
        const alive = players.filter(p => !p.isEliminated);
        if (alive.length === 1) {
            winnerPlayer = alive[0];
        }
    }

    return {
        tick: s.tick,
        tickProgress: 0, // Will be set by progress loop
        isPaused: s.isPaused,
        speed: s.speed as GameSpeed,
        phase: s.phase as any,
        players,
        stars,
        connections,
        winner: winnerPlayer,
    };
}

// ============================================================================
// Game Loop Helpers
// ============================================================================

function scheduleTick(): void {
    stopTick();
    if (!state) return;

    tickIntervalMs = Math.max(100, GAME_CONFIG.BASE_TICK_MS / (state.speed || 1));

    tickIntervalId = setInterval(() => {
        executeTick();
    }, tickIntervalMs);

    lastTickTime = Date.now();
    startProgressLoop();
}

function stopTick(): void {
    if (tickIntervalId) {
        clearInterval(tickIntervalId);
        tickIntervalId = null;
    }
    if (progressRafId) {
        cancelAnimationFrame(progressRafId);
        progressRafId = null;
    }
}

function startProgressLoop(): void {
    if (progressRafId) cancelAnimationFrame(progressRafId);

    function updateProgress() {
        if (!state || state.isPaused) {
            tickProgress = 0;
            return;
        }
        const elapsed = Date.now() - lastTickTime;
        tickProgress = Math.min(elapsed / tickIntervalMs, 1);
        progressRafId = requestAnimationFrame(updateProgress);
    }
    progressRafId = requestAnimationFrame(updateProgress);
}

function executeTick(): void {
    if (!state) return;

    // Build engine config from live GAME_CONFIG values
    const engineCfg = buildEngineConfig();

    // Run AI evaluations first
    runAI(engineCfg);

    // Execute shared engine tick (mutates state in place)
    const events: TickEvents = SharedEngine.tick(state, engineCfg);

    // Feed tick events to animation pipeline
    if (events) {
        activeGameStore.pushTickEvents(events);
    }

    // Record history
    recordHistory();

    // Update snapshot for UI
    snapshot = toGameState(state);

    // Play tick sound
    audio.tick();

    // Track stats
    const totalShips = Array.from(state.stars.values())
        .reduce((sum, s) => sum + s.activeShips + s.damagedShips, 0);
    if (totalShips > peakFleetSize) peakFleetSize = totalShips;

    // Check for game over
    if (state.phase === 'ended') {
        snapshot = toGameState(state);
        stopTick();
        currentView = 'results';
    }

    lastTickTime = Date.now();
}

function runAI(engineCfg: EngineConfig): void {
    if (!state) return;

    const aiConfig: AIConfig = {
        AI_MUST_ATTACK_RATIO: GAME_CONFIG.AI_MUST_ATTACK_RATIO,
        AI_ATTACK_UPPER_BOUNDS: GAME_CONFIG.AI_ATTACK_UPPER_BOUNDS,
        AI_ATTACK_STICKINESS: GAME_CONFIG.AI_ATTACK_STICKINESS,
        AI_EVALUATION_FREQUENCY: GAME_CONFIG.AI_EVALUATION_FREQUENCY,
        AI_TACTICAL_AGGRESSION: GAME_CONFIG.AI_TACTICAL_AGGRESSION,
    };

    // Convert schema to plain Star[] and Connection[] for AI
    const stars = Array.from(state.stars.values()).map(s => ({
        id: s.id,
        x: s.x,
        y: s.y,
        radius: s.radius,
        ownerId: s.ownerId,
        activeShips: s.activeShips,
        damagedShips: s.damagedShips,
        starType: s.starType as StarType,
        productionRate: s.productionRate,
        repairRate: s.repairRate,
        transferRate: s.transferRate,
        activationRate: s.activationRate,
        defensivePosture: s.defensivePosture,
        defenseStrength: s.defenseStrength,
        lastCombatTick: s.lastCombatTick,
        targetId: s.targetId || null,
        queuedOrderTargetId: s.queuedOrderTargetId || null,
        productionOverflow: s.productionOverflow,
        repairOverflow: s.repairOverflow,
    }));

    const connections = Array.from(state.connections).map(c => ({
        sourceId: c.sourceId,
        targetId: c.targetId,
        distance: c.distance,
    }));

    // Run each AI
    aiPlayers.forEach((ai) => {
        const decisions = ai.evaluate(stars, connections, aiConfig);
        for (const decision of decisions) {
            if (decision.targetId) {
                SharedEngine.processInput(state!, {
                    type: 'ISSUE_ORDER',
                    sourceId: decision.sourceId,
                    targetId: decision.targetId,
                    playerId: ai.playerId,
                });
            } else {
                SharedEngine.processInput(state!, {
                    type: 'CANCEL_ORDER',
                    starId: decision.sourceId,
                    playerId: ai.playerId,
                });
            }
        }
    });
}

function recordHistory(): void {
    if (!state) return;
    const entry: GameHistoryEntry = {
        tick: state.tick,
        players: [],
    };
    state.players.forEach((p: PlayerSchema) => {
        entry.players.push({
            id: p.sessionId,
            starCount: p.starCount,
            totalShips: p.totalShips,
        });
    });
    history.push(entry);
}

// ============================================================================
// Map Initialization
// ============================================================================

function initializeState(): void {
    state = new GameRoomState();
    state.phase = 'playing'; // Will be set to paused via isPaused
    state.isPaused = true;
    state.speed = 1;
    state.tick = 0;

    const playerIds: string[] = [HUMAN_PLAYER_ID];
    for (let i = 1; i < settings.playerCount; i++) {
        playerIds.push(`ai-${i}`);
    }

    // Create players
    playerIds.forEach((id, i) => {
        const player = new PlayerSchema();
        player.sessionId = id;
        player.name = i === 0 ? 'You' : `AI ${i}`;
        player.color = settings.playerColors?.[i] ?? PLAYER_COLORS[i % PLAYER_COLORS.length];
        player.isAI = i > 0;
        player.isEliminated = false;
        player.starCount = 0;
        player.totalShips = 0;
        player.activeShips = 0;
        player.damagedShips = 0;
        state!.players.set(id, player);
    });

    // Generate map
    const result = generateMap({
        width: 1600,
        height: 900,
        playerCount: playerIds.length,
        starsPerPlayer: GAME_CONFIG.STARS_PER_PLAYER,
        spacingMultiplier: settings.starSpacing ?? 1.0,
        hexRadius: GAME_CONFIG.HEX_RADIUS ?? 50,
        minLinksPerStar: settings.minLinksPerStar ?? 1,
        maxLinksPerStar: settings.maxLinksPerStar ?? 5,
    });

    // Randomize which position gets which owner via shuffled indices.
    // IMPORTANT: positions must stay in original order because generateMap()
    // assigns IDs star-0..N matching position indices, and connections reference those IDs.
    const starTypes: StarType[] = ['grey', 'yellow', 'blue', 'purple', 'red', 'green'];
    const totalStars = result.positions.length;
    const ownerIndices = Array.from({ length: totalStars }, (_, i) => i);
    for (let i = ownerIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ownerIndices[i], ownerIndices[j]] = [ownerIndices[j], ownerIndices[i]];
    }

    // Create stars from positions (mirrors server GameRoom.createStar)
    result.positions.forEach((pos, i) => {
        const ownerIdx = ownerIndices[i];
        const ownerId = playerIds[ownerIdx % playerIds.length];
        const isCapital = ownerIdx < playerIds.length;
        const starType = isCapital
            ? 'grey' as StarType
            : starTypes[Math.floor(Math.random() * starTypes.length)];
        const stats = STAR_TYPE_STATS[starType] || STAR_TYPE_STATS['grey'];

        const star = new StarSchema();
        star.id = `star-${i}`;
        star.x = pos.x;
        star.y = pos.y;
        star.ownerId = ownerId;
        star.starType = starType;
        star.activeShips = GAME_CONFIG.STARTING_SHIPS;
        star.damagedShips = 0;
        star.productionRate = 1;
        star.repairRate = stats.repairRate;
        star.transferRate = stats.transferRate;
        star.activationRate = stats.activationRate;
        star.defensivePosture = stats.defensivePosture;
        star.defenseStrength = stats.defenseStrength;
        star.radius = 25;
        star.icon = '🌟';
        star.productionOverflow = 0;
        star.repairOverflow = 0;
        star.lastCombatTick = -1;
        state!.stars.set(star.id, star);
    });

    // Create connections (bidirectional, mirrors server GameRoom.addConnection)
    for (const conn of result.connections) {
        const source = state!.stars.get(conn.sourceId);
        const target = state!.stars.get(conn.targetId);
        if (!source || !target) continue;

        const distance = Math.sqrt((source.x - target.x) ** 2 + (source.y - target.y) ** 2);

        const conn1 = new ConnectionSchema();
        conn1.sourceId = conn.sourceId;
        conn1.targetId = conn.targetId;
        conn1.distance = distance;
        state!.connections.push(conn1);

        const conn2 = new ConnectionSchema();
        conn2.sourceId = conn.targetId;
        conn2.targetId = conn.sourceId;
        conn2.distance = distance;
        state!.connections.push(conn2);
    }

    // Initialize AI players
    aiPlayers.clear();
    state!.players.forEach((p: PlayerSchema) => {
        if (p.isAI) {
            const ai = createAI(p.sessionId, (settings.difficulty as any) ?? 'normal');
            aiPlayers.set(p.sessionId, ai);
        }
    });

    // Update initial player stats
    SharedEngine.tick(state!, buildEngineConfig()); // Tick 0 updates player stats
    state!.tick = 0; // Reset tick since we only wanted the side-effect
    state!.isPaused = true;
}

// ============================================================================
// Cleanup
// ============================================================================

function destroyGame(): void {
    stopTick();
    state = null;
    aiPlayers.clear();
    history = [];
    peakFleetSize = 0;
    starsCaptured = 0;
}

// ============================================================================
// Actions
// ============================================================================

function setView(view: GameView): void {
    currentView = view;
}

function updateSettings(partial: Partial<GameSettings>): void {
    settings = { ...settings, ...partial };
}

async function startGame(): Promise<void> {
    // Destroy existing game if any
    destroyGame();

    // Initialize audio
    await audio.init();

    // Clear combat log
    combatLog.clear();

    // Create new game state
    sessionId++;
    initializeState();

    // Initial snapshot
    snapshot = toGameState(state!);

    // Navigate to game
    currentView = 'game';
    startTime = Date.now();
}

function pauseGame(): void {
    if (state) {
        state.isPaused = true;
        stopTick();
        snapshot = toGameState(state);
    }
}

function resumeGame(): void {
    if (state) {
        if (!hasStarted) {
            beginGame();
            return;
        }
        state.isPaused = false;
        snapshot = toGameState(state);
        scheduleTick();
    }
}

function restart(): void {
    hasStarted = false;
    startGame();
}

function beginGame(): void {
    if (state && !hasStarted) {
        hasStarted = true;
        state.isPaused = false;
        state.phase = 'playing';
        snapshot = toGameState(state);
        scheduleTick();
    }
}

function setSpeed(newSpeed: GameSpeed): void {
    if (state) {
        state.speed = newSpeed;
        snapshot = toGameState(state);
        // Re-schedule tick at new interval
        if (!state.isPaused) {
            scheduleTick();
        }
    }
}

function issueOrder(sourceId: StarId, targetId: StarId, persistAfterConquest?: boolean): boolean {
    if (!state) return false;

    const input: IssueOrderInput = {
        type: 'ISSUE_ORDER',
        sourceId,
        targetId,
        playerId: HUMAN_PLAYER_ID,
        persist: persistAfterConquest,
    };
    SharedEngine.processInput(state, input);

    // Instant UI update
    snapshot = toGameState(state);
    return true;
}

function cancelOrder(starId: StarId): void {
    if (!state) return;

    const input: CancelOrderInput = {
        type: 'CANCEL_ORDER',
        starId,
        playerId: HUMAN_PLAYER_ID,
    };
    SharedEngine.processInput(state, input);

    // Instant UI update
    snapshot = toGameState(state);
}

function setDeferredOrder(enemyStarId: StarId, nextTargetId: StarId, persistAfterConquest?: boolean): boolean {
    if (!state) return false;

    const input: SetDeferredOrderInput = {
        type: 'SET_DEFERRED_ORDER',
        starId: enemyStarId,
        targetId: nextTargetId,
        playerId: HUMAN_PLAYER_ID,
        persist: persistAfterConquest,
    };
    SharedEngine.processInput(state, input);
    return true;
}

function surrender(): void {
    if (state) {
        // Pause and eliminate human
        state.isPaused = true;
        stopTick();

        // Eliminate human player
        const human = state.players.get(HUMAN_PLAYER_ID);
        if (human) {
            human.isEliminated = true;
        }

        // Remove ownership of human stars
        state.stars.forEach(star => {
            if (star.ownerId === HUMAN_PLAYER_ID) {
                star.ownerId = '';
                star.targetId = '';
            }
        });

        // End game
        state.phase = 'ended';
        snapshot = toGameState(state);
    }
    currentView = 'results';
}

function playAgain(): void {
    startGame();
}

function returnToMenu(): void {
    destroyGame();
    snapshot = null;
    tickProgress = 0;
    hasStarted = false;
    currentView = 'menu';
}

function getStats() {
    return {
        elapsedMs: startTime ? Date.now() - startTime : 0,
        totalTicks: state?.tick ?? 0,
        peakFleetSize,
        starsCaptured,
    };
}

function getTick(): number {
    return state?.tick ?? 0;
}

function getHistory() {
    return history;
}

function updateConfig(): void {
    // Re-schedule tick with updated GAME_CONFIG values (e.g. BASE_TICK_MS changed)
    if (state && !state.isPaused && state.speed > 0) {
        scheduleTick();
    }
}

function toggleRetainOrderOnConquest(): void {
    GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST = !GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST;
}

function debugSetStarShips(starId: string, count: number): void {
    if (!state) return;
    const star = state.stars.get(starId);
    if (star) {
        star.activeShips = count;
        snapshot = toGameState(state);
    }
}

// ============================================================================
// Export Store (identical shape to previous version)
// ============================================================================

export const gameStore = {
    // Reactive getters
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
    getTick,
    updateConfig,
    beginGame,
    toggleRetainOrderOnConquest,
    debugSetStarShips,
};

// ============================================================================
// HMR Cleanup
// ============================================================================
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        destroyGame();
    });
}
