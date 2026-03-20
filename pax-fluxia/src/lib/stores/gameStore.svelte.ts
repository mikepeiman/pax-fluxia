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
import type { MapDefinition } from '$lib/types/map.types';
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
import { audioManager } from '$lib/services/audioManager.svelte';
import { GAME_CONFIG, buildEngineConfig } from '$lib/config/game.config';
import { animationStore } from '$lib/stores/animationStore.svelte';
import { activeGameStore } from '$lib/stores/activeGameStore.svelte';
import { getBuiltinMaps, loadBuiltinMaps } from '$lib/config/builtinMaps';

// ============================================================================
// Constants
// ============================================================================

const HUMAN_PLAYER_ID = 'human-player';

// ── Guaranteed hue-separated player colors ──
// Instead of a fixed palette that can have close hues, 
// generate colors with maximum hue separation for N players.
const HUMAN_HUE = 220; // Blue — always the human's hue
const BASE_SATURATION = 0.75;
const BASE_LIGHTNESS = 0.55;
const MIN_HUE_SEPARATION = 40; // degrees minimum between any two players

// ── RGB → CIELAB conversion for perceptual color distance ──

function srgbToLinear(c: number): number {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
    // sRGB → linear → XYZ (D65)
    const rl = srgbToLinear(r / 255);
    const gl = srgbToLinear(g / 255);
    const bl = srgbToLinear(b / 255);
    let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
    let y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / 1.00000;
    let z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883;
    const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    x = f(x); y = f(y); z = f(z);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** CIE76 ΔE: Euclidean distance in Lab space */
function deltaE(lab1: [number, number, number], lab2: [number, number, number]): number {
    return Math.sqrt(
        (lab1[0] - lab2[0]) ** 2 + (lab1[1] - lab2[1]) ** 2 + (lab1[2] - lab2[2]) ** 2,
    );
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r1: number, g1: number, b1: number;
    if (h < 60) { r1 = c; g1 = x; b1 = 0; }
    else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }
    return [
        Math.round((r1 + m) * 255),
        Math.round((g1 + m) * 255),
        Math.round((b1 + m) * 255),
    ];
}

/**
 * Generate N player colors with guaranteed perceptual separation.
 * Uses CIELAB ΔE (CIE76) to measure perceptual distance.
 * Human player always gets blue (hue 220).
 * AI colors are greedily selected to maximize minimum ΔE from all existing colors.
 */
function generatePlayerColors(count: number): string[] {
    const colors: string[] = [];
    const labs: [number, number, number][] = [];

    // Human always gets blue
    const humanRgb = hslToRgb(HUMAN_HUE, BASE_SATURATION, BASE_LIGHTNESS);
    colors.push(`#${humanRgb.map(c => c.toString(16).padStart(2, '0')).join('')}`);
    labs.push(rgbToLab(...humanRgb));

    if (count <= 1) return colors;

    // Generate candidate pool: 72 hues at 5° intervals (skip near-human zone ±25°)
    const candidates: { hue: number; rgb: [number, number, number]; lab: [number, number, number] }[] = [];
    for (let h = 0; h < 360; h += 5) {
        // Skip hues too close to human hue (within MIN_HUE_SEPARATION)
        const dist = Math.min(Math.abs(h - HUMAN_HUE), 360 - Math.abs(h - HUMAN_HUE));
        if (dist < MIN_HUE_SEPARATION) continue;
        const rgb = hslToRgb(h, BASE_SATURATION, BASE_LIGHTNESS);
        candidates.push({ hue: h, rgb, lab: rgbToLab(...rgb) });
    }

    // Greedy selection: pick candidate with max minimum ΔE to all chosen colors
    for (let pick = 1; pick < count; pick++) {
        let bestIdx = 0;
        let bestMinDE = -1;

        for (let c = 0; c < candidates.length; c++) {
            let minDE = Infinity;
            for (const chosen of labs) {
                const de = deltaE(candidates[c].lab, chosen);
                if (de < minDE) minDE = de;
            }
            if (minDE > bestMinDE) {
                bestMinDE = minDE;
                bestIdx = c;
            }
        }

        const winner = candidates[bestIdx];
        colors.push(`#${winner.rgb.map(c => c.toString(16).padStart(2, '0')).join('')}`);
        labs.push(winner.lab);
        // Remove winner from candidates so it can't be picked again
        candidates.splice(bestIdx, 1);
    }

    return colors;
}




// Legacy fixed palette — kept as fallback only
const PLAYER_COLORS_LEGACY = [
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


/** Tick timing */
let lastTickTime = 0;
let lastTickGameTime = 0;  // Game-clock time at last tick (for tickProgress)
let tickIntervalMs = 1200;
let pausedElapsed = 0;  // How far into current tick when paused (ms)

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

/** Latest game state snapshot (plain objects, consumed by UI).
 *  Uses $state.raw to avoid deep-proxying the entire GameState tree.
 *  Reactivity triggers on reassignment (each tick), not on deep property access. */
let snapshot = $state.raw<GameState | null>(null);

/** Tick progress — for UI-only consumers (Leaderboard progress bar).
 *  Animation code in GameCanvas uses its own game-time-based computation. */
function getTickProgress(): number {
    if (!state || state.isPaused) return 0;
    const elapsed = performance.now() - lastTickTime;
    return Math.min(elapsed / tickIntervalMs, 1);
}

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
    // Pre-compute per-player production from owned stars
    const productionByPlayer = new Map<string, number>();
    s.stars.forEach((star) => {
        if (star.ownerId) {
            productionByPlayer.set(
                star.ownerId,
                (productionByPlayer.get(star.ownerId) ?? 0) + (star.productionRate ?? 0),
            );
        }
    });

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
            production: productionByPlayer.get(p.sessionId) ?? 0,
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
        lastAttackTick: star.lastAttackTick ?? -1,
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

function scheduleTick(resumeOffsetMs = 0): void {
    stopTick();
    if (!state) return;

    tickIntervalMs = Math.max(GAME_CONFIG.MIN_TICK_MS, GAME_CONFIG.BASE_TICK_MS / (state.speed || 1));

    // On resume, lastTickTime is set BEFORE calling this so tickProgress picks up where it froze.
    // If resuming mid-tick, schedule a shorter first tick for the remaining time,
    // then switch to regular interval.
    const firstDelay = resumeOffsetMs > 0 ? Math.max(1, tickIntervalMs - resumeOffsetMs) : tickIntervalMs;

    if (resumeOffsetMs > 0 && firstDelay < tickIntervalMs) {
        // Resume: short first tick for remaining time
        tickIntervalId = setTimeout(() => {
            executeTick();
            // Now start regular interval
            tickIntervalId = setInterval(() => {
                executeTick();
            }, tickIntervalMs);
        }, firstDelay) as unknown as ReturnType<typeof setInterval>;
    } else {
        tickIntervalId = setInterval(() => {
            executeTick();
        }, tickIntervalMs);
    }

    if (!resumeOffsetMs) {
        lastTickTime = performance.now();
    }
}

function stopTick(): void {
    if (tickIntervalId) {
        clearInterval(tickIntervalId);
        tickIntervalId = null;
    }
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
    audioManager.play('tick');

    // Track stats
    const totalShips = Array.from(state.stars.values())
        .reduce((sum, s) => sum + s.activeShips + s.damagedShips, 0);
    if (totalShips > peakFleetSize) peakFleetSize = totalShips;

    // Check for game over
    if (state.phase === 'ended') {
        snapshot = toGameState(state);
        stopTick();
        // F-62: keep view as 'game' — overlay ResultsModal shows over the map
    }

    lastTickTime = performance.now();
}

function runAI(engineCfg: EngineConfig): void {
    if (!state) return;

    const aiConfig: AIConfig = {
        AI_MUST_ATTACK_RATIO: GAME_CONFIG.AI_MUST_ATTACK_RATIO,
        AI_ATTACK_UPPER_BOUNDS: GAME_CONFIG.AI_ATTACK_UPPER_BOUNDS,
        AI_ATTACK_STICKINESS: GAME_CONFIG.AI_ATTACK_STICKINESS,
        AI_EVALUATION_FREQUENCY: GAME_CONFIG.AI_EVALUATION_FREQUENCY,
        AI_TACTICAL_AGGRESSION: GAME_CONFIG.AI_TACTICAL_AGGRESSION,
        AI_RANDOM_AGGRESSION: GAME_CONFIG.AI_RANDOM_AGGRESSION,
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
        lastAttackTick: s.lastAttackTick ?? -1,
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

/** Helper: create a star and add to state */
function createDebugStar(id: string, x: number, y: number, ownerId: string): void {
    const stats = STAR_TYPE_STATS['grey'];
    const star = new StarSchema();
    star.id = id;
    star.x = x;
    star.y = y;
    star.ownerId = ownerId;
    star.starType = 'grey';
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
}

/** Helper: add bidirectional connection */
function addDebugConnection(sourceId: string, targetId: string): void {
    const source = state!.stars.get(sourceId);
    const target = state!.stars.get(targetId);
    if (!source || !target) return;
    const distance = Math.sqrt((source.x - target.x) ** 2 + (source.y - target.y) ** 2);

    const c1 = new ConnectionSchema();
    c1.sourceId = sourceId;
    c1.targetId = targetId;
    c1.distance = distance;
    state!.connections.push(c1);

    const c2 = new ConnectionSchema();
    c2.sourceId = targetId;
    c2.targetId = sourceId;
    c2.distance = distance;
    state!.connections.push(c2);
}

/** Debug A: 4 stars in triangle + dead-end (matches server initDebugMap) */
function initDebugMap(playerIds: string[], variant: string): void {
    const cx = 800, cy = 450, spread = 250;
    const humanId = playerIds[0] || 'human-player';
    const aiId = playerIds[1] || 'ai-1';

    if (variant === 'debug-b') {
        // Debug B: linear chain of 5-6 stars
        createDebugStar('star-0', 200, 350, humanId);
        createDebugStar('star-1', 450, 250, aiId);
        createDebugStar('star-2', 700, 300, 'neutral');
        createDebugStar('star-3', 950, 400, playerIds[2] || 'neutral');
        createDebugStar('star-4', 1200, 450, playerIds[3] || 'neutral');
        if (playerIds.length > 4) {
            createDebugStar('star-5', 350, 550, playerIds[4] || 'neutral');
        }

        addDebugConnection('star-0', 'star-1');
        addDebugConnection('star-1', 'star-2');
        addDebugConnection('star-2', 'star-3');
        addDebugConnection('star-3', 'star-4');
        if (playerIds.length > 4) {
            addDebugConnection('star-0', 'star-5');
        }
    } else {
        // Debug A: triangle + dead-end
        createDebugStar('star-0', cx, cy - spread, humanId);       // Top
        createDebugStar('star-1', cx - spread, cy + spread * 0.6, aiId);  // Bottom-left
        createDebugStar('star-2', cx + spread, cy + spread * 0.6, 'neutral'); // Bottom-right
        createDebugStar('star-3', cx + spread * 1.2, cy - spread * 0.8, 'neutral'); // Far top-right

        addDebugConnection('star-0', 'star-1');
        addDebugConnection('star-1', 'star-2');
        addDebugConnection('star-2', 'star-0');
        addDebugConnection('star-0', 'star-3');
    }
}

/** Standard random map via generateMap() */
function initStandardMap(playerIds: string[]): void {
    // Match map aspect ratio to viewport — portrait screens get portrait maps
    const isPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
    const mapW = isPortrait ? 900 : 1600;
    const mapH = isPortrait ? 1600 : 900;

    const result = generateMap({
        width: mapW,
        height: mapH,
        playerCount: playerIds.length,
        starsPerPlayer: GAME_CONFIG.STARS_PER_PLAYER,
        spacingMultiplier: settings.starSpacing ?? 1.0,
        hexRadius: GAME_CONFIG.HEX_RADIUS ?? 50,
        minLinksPerStar: settings.minLinksPerStar ?? 1,
        maxLinksPerStar: settings.maxLinksPerStar ?? 5,
    });

    // Store map gen metadata for debug grid overlay
    GAME_CONFIG._MAP_HEX_RADIUS = result.hexRadius;
    GAME_CONFIG._MAP_WIDTH = result.width;
    GAME_CONFIG._MAP_HEIGHT = result.height;
    GAME_CONFIG._MAP_PADDING_X = result.paddingX;
    GAME_CONFIG._MAP_PADDING_Y = result.paddingY;

    // Randomize which position gets which owner via shuffled indices
    const starTypes: StarType[] = ['grey', 'yellow', 'blue', 'purple', 'red', 'green'];
    const totalStars = result.positions.length;
    const ownerIndices = Array.from({ length: totalStars }, (_, i) => i);
    for (let i = ownerIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ownerIndices[i], ownerIndices[j]] = [ownerIndices[j], ownerIndices[i]];
    }

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

    // Create connections (bidirectional)
    for (const conn of result.connections) {
        addDebugConnection(conn.sourceId, conn.targetId);
    }
}

// ============================================================================
// Map Save/Load (F-70)
// ============================================================================

let lastMapDefinition: MapDefinition | null = null;
let pendingSavedMap: MapDefinition | null = null;
let savedMaps: MapDefinition[] = $state(loadSavedMaps());

// F-148: Default map preference — auto-load a saved map on game start
let defaultMapName: string = $state(localStorage.getItem('pax_defaultMap') || '');

function loadSavedMaps(): MapDefinition[] {
    try {
        const raw = localStorage.getItem('pax_savedMaps');
        const userMaps: MapDefinition[] = raw ? JSON.parse(raw) : [];

        // Merge built-in maps (builtIn flag set), dedup by name
        const builtins = getBuiltinMaps();
        const userNames = new Set(userMaps.map(m => m.metadata.name));
        const merged = [...userMaps];
        for (const bm of builtins) {
            if (!userNames.has(bm.metadata.name)) {
                merged.push(bm);
            }
        }
        return merged;
    } catch { return getBuiltinMaps(); }
}

function persistSavedMaps(): void {
    localStorage.setItem('pax_savedMaps', JSON.stringify(savedMaps));
}

/** Save a single map to filesystem (fire-and-forget) */
function persistMapToFilesystem(map: MapDefinition): void {
    try {
        fetch('/__maps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(map),
        }).catch(() => { /* dev server may not be running */ });
    } catch { /* noop */ }
}

/** Delete a map from filesystem (fire-and-forget) */
function deleteMapFromFilesystem(name: string): void {
    try {
        fetch(`/__maps?name=${encodeURIComponent(name)}`, {
            method: 'DELETE',
        }).catch(() => { /* dev server may not be running */ });
    } catch { /* noop */ }
}

/** Load maps from filesystem and merge with localStorage (async, called once at init) */
async function loadFilesystemMaps(): Promise<void> {
    try {
        const res = await fetch('/__maps');
        if (!res.ok) return;
        const fsMaps: MapDefinition[] = await res.json();
        if (!fsMaps.length) return;

        // Merge: filesystem maps that aren't already in localStorage
        const existingNames = new Set(savedMaps.map(m => m.metadata.name));
        let added = 0;
        for (const fsMap of fsMaps) {
            if (!existingNames.has(fsMap.metadata.name)) {
                savedMaps = [...savedMaps, fsMap];
                existingNames.add(fsMap.metadata.name);
                added++;
            }
        }
        if (added > 0) {
            persistSavedMaps(); // sync localStorage with filesystem discoveries
            console.log(`[MAP] Loaded ${added} map(s) from filesystem`);
        }
    } catch { /* dev server may not be running */ }
}

// Trigger async filesystem load at module init
loadFilesystemMaps();

// Trigger async builtin maps load (fetch from /maps/)
async function loadBuiltinMapsAsync(): Promise<void> {
    try {
        const builtins = await loadBuiltinMaps();
        if (!builtins.length) return;
        const existingNames = new Set(savedMaps.map(m => m.metadata.name));
        let added = 0;
        for (const bm of builtins) {
            if (!existingNames.has(bm.metadata.name)) {
                savedMaps = [...savedMaps, bm];
                existingNames.add(bm.metadata.name);
                added++;
            }
        }
        if (added > 0) {
            console.log(`[MAP] Merged ${added} built-in map(s) from /maps/`);
        }
    } catch (e) {
        console.warn('[MAP] Failed to load built-in maps:', e);
    }
}
loadBuiltinMapsAsync();

function setDefaultMap(name: string): void {
    defaultMapName = name;
    localStorage.setItem('pax_defaultMap', name);
}

function clearDefaultMap(): void {
    defaultMapName = '';
    localStorage.removeItem('pax_defaultMap');
}

/** Export current game state as a MapDefinition */
function exportMapDefinition(): MapDefinition | null {
    if (!state) return null;
    const stars: MapDefinition['stars'] = [];
    state.stars.forEach((s) => {
        stars.push({
            id: s.id, x: s.x, y: s.y,
            ownerId: s.ownerId,
            starType: s.starType as StarType,
            activeShips: s.activeShips,
            damagedShips: s.damagedShips,
            targetId: s.targetId || undefined,
        });
    });
    const connSet = new Set<string>();
    const connections: MapDefinition['connections'] = [];
    for (let i = 0; i < state.connections.length; i++) {
        const c = state.connections[i];
        const key = [c.sourceId, c.targetId].sort().join('|');
        if (!connSet.has(key)) {
            connSet.add(key);
            connections.push({ sourceId: c.sourceId, targetId: c.targetId, distance: c.distance });
        }
    }
    return {
        metadata: { name: 'Untitled', createdAt: new Date().toISOString(), version: 2 },
        stars, connections,
        customRules: { tick: state.tick },
    };
}

/** Save current map with a name */
function saveCurrentMap(name: string): void {
    const map = exportMapDefinition();
    if (!map) return;
    map.metadata.name = name;
    // Replace if same name exists
    savedMaps = savedMaps.filter(m => m.metadata.name !== name);
    savedMaps = [map, ...savedMaps];
    persistSavedMaps();
    persistMapToFilesystem(map);
}

/** Delete a saved map by name */
function deleteSavedMap(name: string): void {
    // Block deletion of built-in maps
    const map = savedMaps.find(m => m.metadata.name === name);
    if (map && (map as any).builtIn) return;

    savedMaps = savedMaps.filter(m => m.metadata.name !== name);
    persistSavedMaps();
    deleteMapFromFilesystem(name);
}

/** Set a saved map to be loaded on next startGame() */
function loadSavedMap(map: MapDefinition): void {
    pendingSavedMap = map;
}

/** Initialize from a saved MapDefinition */
function initSavedMap(playerIds: string[], map: MapDefinition): void {
    const starTypes: StarType[] = ['grey', 'yellow', 'blue', 'purple', 'red', 'green'];

    // Build faction → playerID remap table
    // Mid-game saves use runtime IDs ('human-player', 'ai-1') — use identity map.
    // Classic maps use custom faction IDs ('player-A', 'player-B') — remap alphabetically.
    const factionRemap = new Map<string, string>();
    const mapFactions = new Set<string>();
    for (const s of map.stars) {
        if (s.ownerId && s.ownerId !== 'neutral' && s.ownerId !== '') {
            mapFactions.add(s.ownerId);
        }
    }

    // Detect mid-game saves: if ANY saved ownerId matches a runtime playerID, use identity
    const playerIdSet = new Set(playerIds);
    const isMidGameSave = Array.from(mapFactions).some(f => playerIdSet.has(f));

    if (isMidGameSave) {
        // Identity map — ownerIds already correct, don't remap
        for (const faction of mapFactions) {
            factionRemap.set(faction, faction);
        }
    } else {
        // Classic map format — remap alphabetically to runtime playerIds
        const sortedFactions = Array.from(mapFactions).sort();
        sortedFactions.forEach((faction, i) => {
            if (i < playerIds.length) {
                factionRemap.set(faction, playerIds[i]);
            } else {
                factionRemap.set(faction, 'neutral');
            }
        });
    }
    // B-43 diagnostic: trace faction remap
    console.log(`[MAP] Factions found: [${Array.from(mapFactions).join(', ')}] | isMidGameSave=${isMidGameSave}`);
    console.log(`[B43/MAP] Player IDs: [${playerIds.join(', ')}]`);
    factionRemap.forEach((playerId, faction) => {
        console.log(`[B43/MAP]   ${faction} → ${playerId}`);
    });

    // Calculate coordinate scale — classic maps use ~800×500 coordinate space;
    // scale to match current viewport if coordinates are in that range
    const maxX = Math.max(...map.stars.map(s => s.x));
    const maxY = Math.max(...map.stars.map(s => s.y));
    const isPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
    const targetW = isPortrait ? 900 : 1600;
    const targetH = isPortrait ? 1600 : 900;
    // Only scale if the map is small (legacy), leave modern maps as-is
    const needsScale = maxX < 1000 && maxY < 600;
    const spacingMult = GAME_CONFIG.CLASSIC_MAP_SPACING ?? 1.0;
    const scaleX = needsScale ? (targetW * 0.85) / (maxX || 1) * spacingMult : 1;
    const scaleY = needsScale ? (targetH * 0.85) / (maxY || 1) * spacingMult : 1;
    const offsetX = needsScale ? targetW * 0.075 : 0;
    const offsetY = needsScale ? targetH * 0.075 : 0;

    map.stars.forEach((s: MapDefinition['stars'][0]) => {
        const isNeutral = !s.ownerId || s.ownerId === 'neutral' || s.ownerId === '';
        const ownerId = isNeutral ? 'neutral' : (factionRemap.get(s.ownerId) ?? s.ownerId);
        const starType = s.starType || starTypes[Math.floor(Math.random() * starTypes.length)];
        const stats = STAR_TYPE_STATS[starType] || STAR_TYPE_STATS['grey'];
        const star = new StarSchema();
        star.id = s.id;
        star.x = s.x * scaleX + offsetX;
        star.y = s.y * scaleY + offsetY;
        star.ownerId = ownerId;
        star.starType = starType;
        star.activeShips = s.activeShips ?? GAME_CONFIG.STARTING_SHIPS;
        star.damagedShips = s.damagedShips ?? 0;
        star.targetId = s.targetId ?? '';
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
    for (const conn of map.connections) {
        addDebugConnection(conn.sourceId, conn.targetId);
    }
}
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

    // Generate hue-separated colors for all players
    const generatedColors = generatePlayerColors(settings.playerCount);

    // Create players
    playerIds.forEach((id, i) => {
        const player = new PlayerSchema();
        player.sessionId = id;
        player.name = i === 0 ? 'You' : `AI ${i}`;
        player.color = settings.playerColors?.[i] ?? generatedColors[i] ?? '#888888';
        player.isAI = i > 0;
        player.isEliminated = false;
        player.starCount = 0;
        player.totalShips = 0;
        player.activeShips = 0;
        player.damagedShips = 0;
        state!.players.set(id, player);
    });

    // Generate map based on mapType
    const mapType = settings.mapType || 'standard';

    if (mapType === 'debug' || mapType === 'debug-b') {
        // Fixed debug maps — deterministic positions for testing
        initDebugMap(playerIds, mapType);
    } else if (pendingSavedMap) {
        // Load saved map definition (explicit user action)
        initSavedMap(playerIds, pendingSavedMap);
        pendingSavedMap = null;
    } else if (defaultMapName) {
        // F-148: Auto-load default map if preference is set
        const defaultMap = savedMaps.find(m => m.metadata.name === defaultMapName);
        if (defaultMap) {
            console.log(`[MAP] Auto-loading default map: "${defaultMapName}"`);
            initSavedMap(playerIds, defaultMap);
        } else {
            console.warn(`[MAP] Default map "${defaultMapName}" not found, generating random`);
            initStandardMap(playerIds);
        }
    } else {
        initStandardMap(playerIds);
    }

    // Snapshot map for restart (F-71)
    lastMapDefinition = exportMapDefinition();

    // Initialize AI players
    aiPlayers.clear();
    state!.players.forEach((p: PlayerSchema) => {
        if (p.isAI) {
            const ai = createAI(p.sessionId, (settings.difficulty as any) ?? 'normal');
            aiPlayers.set(p.sessionId, ai);
        }
    });

    // Tally initial player stats (starCount, activeShips, etc.) for leaderboard
    // Cannot use SharedEngine.tick() — it returns early when isPaused=true
    SharedEngine.updatePlayerStats(state!);
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

    // Reset territory render flag so territory draws immediately on load (B-50)
    (globalThis as any).__territoryRenderedWhilePaused = false;

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
        // Save how far into the current tick we are
        pausedElapsed = performance.now() - lastTickTime;
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
        // Restore lastTickTime so tickProgress resumes from where it froze
        lastTickTime = performance.now() - pausedElapsed;
        scheduleTick(pausedElapsed);
        pausedElapsed = 0;
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
        // Preserve tick progress across speed change to avoid visual disjoint.
        // Calculate how far into the current tick we are (0-1), then map that
        // same progress ratio to the new tick interval.
        const now = performance.now();
        const elapsed = now - lastTickTime;
        const oldTickMs = tickIntervalMs;
        const progress = Math.min(1, elapsed / oldTickMs);

        state.speed = newSpeed;
        snapshot = toGameState(state);

        if (!state.isPaused && hasStarted) {
            // Compute new interval
            const newTickMs = Math.max(GAME_CONFIG.MIN_TICK_MS, GAME_CONFIG.BASE_TICK_MS / (newSpeed || 1));
            tickIntervalMs = newTickMs;

            // Map progress to new interval: pretend we started (progress * newTickMs) ago
            const newElapsed = progress * newTickMs;
            lastTickTime = now - newElapsed;
            const remaining = Math.max(1, newTickMs - newElapsed);

            // Reschedule: fire next tick after the remaining time, then regular interval
            stopTick();
            tickIntervalId = setTimeout(() => {
                executeTick();
                tickIntervalId = setInterval(() => {
                    executeTick();
                }, tickIntervalMs);
            }, remaining) as unknown as ReturnType<typeof setInterval>;
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
    SharedEngine.processInput(state, input, { ALLOW_OPPOSING_ORDERS: GAME_CONFIG.ALLOW_OPPOSING_ORDERS });

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
    // F-62: keep view as 'game' — overlay shows results
}

function playAgain(reuseMap: boolean = true): void {
    if (reuseMap && lastMapDefinition) {
        pendingSavedMap = lastMapDefinition;
    }
    startGame();
}

function returnToMenu(): void {
    destroyGame();
    snapshot = null;

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
    return snapshot?.tick ?? 0;
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

function toggleAllowOpposingOrders(): void {
    GAME_CONFIG.ALLOW_OPPOSING_ORDERS = !GAME_CONFIG.ALLOW_OPPOSING_ORDERS;
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
    get tickProgress() { return getTickProgress(); },
    get speed() { return speed; },
    get isPaused() { return isPaused; },
    get winner() { return winner; },
    get humanPlayer() { return humanPlayer; },
    get leaderboard() { return leaderboard; },
    get sessionId() { return sessionId; },
    get hasStarted() { return hasStarted; },
    get retainOrderOnConquest() { return GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST; },
    get allowOpposingOrders() { return GAME_CONFIG.ALLOW_OPPOSING_ORDERS; },

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
    toggleAllowOpposingOrders,
    debugSetStarShips,

    // Map save/load (F-70)
    get savedMaps() { return savedMaps; },
    get lastMapDefinition() { return lastMapDefinition; },
    saveCurrentMap,
    deleteSavedMap,
    loadSavedMap,

    // F-148: Default map preference
    get defaultMapName() { return defaultMapName; },
    setDefaultMap,
    clearDefaultMap,
};

// ============================================================================
// HMR Cleanup
// ============================================================================
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        destroyGame();
    });
}
