// ============================================================================
// Game Store - Svelte 5 Runes-based state management
// Delegates all core logic to @pax/common shared engine (GameEngine.tick)
// ============================================================================

import type {
    GameView,
    GameSpeed,
    GameSettings,
    GameState,
    MapDiagnosticMeasurement,
    StarId,
    PlayerState,
    GameHistoryEntry
} from '$lib/types/game.types';
import type { MapDefinition, SavedGame } from '$lib/types/map.types';
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
    MapMeasurementSchema,
    PointSchema,
    PlayerSchema,
    STAR_TYPE_STATS,
    DEFAULT_ENGINE_CONFIG,
    generateMap,
    generateConnections,
    getStarProductionPerTick,
    NEUTRAL_OWNER_ID,
    normalizeInitialOwnerId,
    normalizeUnownedStarsToNeutral,
} from '@pax/common';
import {
    AUTHORED_NEUTRAL_OWNER_ID,
    coerceAuthoredMapDefinition,
    normalizeAuthoredMapMetadata,
    resolveOrCreateAuthoredMapFamily,
    resolveRuntimeMap,
    validateAuthoredMapDefinition,
    type RuntimeAuthoredMap,
} from '@pax/common/maps';
import type { AIConfig } from '@pax/common';
import { AI, createAI, DEFAULT_AI_CONFIG } from '@pax/common';
import { combatLog } from '$lib/stores/combatLogStore';
import { audioManager } from '$lib/services/audioManager.svelte';
import { GAME_CONFIG, buildEngineConfig } from '$lib/config/game.config';
import { animationStore } from '$lib/stores/animationStore.svelte';
import { activeGameStore } from '$lib/stores/activeGameStore.svelte';
import { getBuiltinMaps, loadBuiltinMaps } from '$lib/config/builtinMaps';
import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';
import type { MapLaneMode } from '@pax/common/mapgen';
import {
    seedLanePolylineCacheFromMapGen,
    rebuildLanePolylineCache,
    canonicalUniConnections,
    clearLanePolylineCache,
} from '$lib/lanes/lanePolylineCache';
import { resolveEffectiveLaneMarginPx } from '$lib/lanes/laneMargin';
import { toLaneAwareConnections } from '$lib/lanes/laneConnectionSync';
import {
    PLAYER_PALETTE_DEFAULTS,
    buildPlayerPaletteHex,
} from '$lib/utils/playerPalette';
import { buildMainMenuPreview } from '$lib/utils/mainMenuPreview';
import {
    measurePerf,
    measurePerfAsync,
    recordPerfEvent,
} from '$lib/perf/perfProbe';
import {
    logPipelineStage,
    summarizeMapDefinition,
    summarizeConnections,
    summarizeSavedMapRemap,
    summarizeStars,
} from '$lib/perf/pipelineTelemetry';
import { log } from '$lib/utils/logger';

// ============================================================================
// Constants
// ============================================================================

const HUMAN_PLAYER_ID = 'human-player';
// Legacy fixed palette — kept as fallback only
const PLAYER_COLORS_LEGACY = [
    '#4488ff', // Blue (human)
    '#ff4466', // Red
    '#44ff88', // Green
    '#ffcc44', // Yellow
    '#aa66ff', // Purple
    '#ff8844'  // Orange
];

function generatePlayerColors(count: number): string[] {
    const generated = buildPlayerPaletteHex(
        PLAYER_PALETTE_DEFAULTS.anchorHue,
        count,
        PLAYER_PALETTE_DEFAULTS.saturation,
        PLAYER_PALETTE_DEFAULTS.lightness,
    );
    return generated.length > 0 ? generated : PLAYER_COLORS_LEGACY.slice(0, count);
}

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

/** Tick loop interval — stored on globalThis to survive HMR re-evaluation */
const _G = globalThis as any;
// Clear any leaked interval from previous HMR module instance
if (_G.__paxTickIntervalId) {
    clearInterval(_G.__paxTickIntervalId);
    _G.__paxTickIntervalId = null;
}
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
    const engineCfg = buildEngineConfig();
    // Pre-compute per-player production from owned stars
    const productionByPlayer = new Map<string, number>();
    s.stars.forEach((star) => {
        if (star.ownerId) {
            productionByPlayer.set(
                star.ownerId,
                (productionByPlayer.get(star.ownerId) ?? 0)
                    + getStarProductionPerTick(star as any, engineCfg),
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
        portalGroup: star.portalGroup || undefined,
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

    const connections = toLaneAwareConnections(Array.from(s.connections));
    const measurements: MapDiagnosticMeasurement[] = Array.from(s.mapMeasurements ?? []).map((measurement) => ({
        id: measurement.id,
        mode: measurement.mode as 'manual' | 'generated',
        preset: measurement.preset ? (measurement.preset as 'lane_length') : undefined,
        label: measurement.label || undefined,
        startX: measurement.startX,
        startY: measurement.startY,
        endX: measurement.endX,
        endY: measurement.endY,
        dx: measurement.dx,
        dy: measurement.dy,
        distance: measurement.distance,
        midX: measurement.midX,
        midY: measurement.midY,
        visibleByDefault: measurement.visibleByDefault,
        relatedLaneId: measurement.relatedLaneId || undefined,
        relatedLaneLabel: measurement.relatedLaneLabel || undefined,
        starPairLabel: measurement.starPairLabel || undefined,
    }));

    // Find winner
    let winnerPlayer: PlayerState | null = null;
    if (s.phase === 'ended') {
        const alive = players.filter(p => !p.isEliminated);
        if (alive.length === 1) {
            winnerPlayer = alive[0];
        }
    }

    const nextState = {
        tick: s.tick,
        tickProgress: 0, // Will be set by progress loop
        isPaused: s.isPaused,
        speed: s.speed as GameSpeed,
        phase: s.phase as any,
        players,
        stars,
        connections,
        mapDiagnostics: { measurements },
        winner: winnerPlayer,
    };
    logPipelineStage({
        context: 'GameStore',
        stage: 'schema_snapshot',
        from: 'GameRoomState',
        to: 'GameState',
        purpose: 'Publish UI-readable simulation state',
        summary:
            `${summarizeStars(stars)} ${summarizeConnections(connections)} ` +
            `players=${players.length} phase=${String(s.phase)}`,
        perfEventName: 'game.snapshot.publish',
        detail: {
            tick: s.tick,
            phase: s.phase,
            paused: s.isPaused,
            players: players.length,
        },
    });
    return nextState;
}

interface SnapshotOrderPatch {
    starId: string;
    targetId: string | null;
    queuedOrderTargetId: string | null;
}

function buildSnapshotOrderPatch(starId: string): SnapshotOrderPatch | null {
    if (!state) return null;
    const star = state.stars.get(starId);
    if (!star) return null;
    return {
        starId,
        targetId: star.targetId || null,
        queuedOrderTargetId: star.queuedOrderTargetId || null,
    };
}

function patchSnapshotOrderFields(
    currentSnapshot: GameState | null,
    patches: ReadonlyArray<SnapshotOrderPatch>,
): GameState | null {
    if (!currentSnapshot || patches.length === 0) return currentSnapshot;
    const patchMap = new Map(patches.map((patch) => [patch.starId, patch] as const));
    let changed = false;
    const nextStars = currentSnapshot.stars.map((star) => {
        const patch = patchMap.get(star.id);
        if (!patch) return star;
        if (
            star.targetId === patch.targetId &&
            star.queuedOrderTargetId === patch.queuedOrderTargetId
        ) {
            return star;
        }
        changed = true;
        return {
            ...star,
            targetId: patch.targetId,
            queuedOrderTargetId: patch.queuedOrderTargetId,
        };
    });
    if (!changed) return currentSnapshot;
    return {
        ...currentSnapshot,
        stars: nextStars,
    };
}

function publishOrderMutationSnapshot(params: {
    perfPrefix: string;
    stage: string;
    from: string;
    to: string;
    purpose: string;
    starIds: ReadonlyArray<string>;
    detail: Record<string, unknown>;
}): { mode: 'patched' | 'full' | 'unchanged'; changed: boolean } {
    if (!state) return { mode: 'unchanged', changed: false };
    const uniqueStarIds = [...new Set(params.starIds.filter(Boolean))];
    const patches = uniqueStarIds
        .map((starId) => buildSnapshotOrderPatch(starId))
        .filter((patch): patch is SnapshotOrderPatch => patch !== null);
    const nextSnapshot = measurePerf(
        `${params.perfPrefix}.patchSnapshot`,
        () => patchSnapshotOrderFields(snapshot, patches),
        {
            stage: params.stage,
            starIds: uniqueStarIds,
            patchCount: patches.length,
        },
    );
    if (nextSnapshot && nextSnapshot !== snapshot) {
        snapshot = nextSnapshot;
        logPipelineStage({
            channel: 'input',
            context: 'GameStore',
            stage: params.stage,
            from: params.from,
            to: params.to,
            purpose: params.purpose,
            detail: {
                ...params.detail,
                publishMode: 'patched',
                patchedStars: uniqueStarIds,
            },
        });
        return { mode: 'patched', changed: true };
    }

    const rebuiltSnapshot = measurePerf(
        `${params.perfPrefix}.fullSnapshot`,
        () => toGameState(state!),
        {
            stage: params.stage,
            starIds: uniqueStarIds,
            patchCount: patches.length,
        },
    );
    const changed =
        rebuiltSnapshot !== snapshot ||
        (rebuiltSnapshot?.tick ?? null) !== (snapshot?.tick ?? null);
    snapshot = rebuiltSnapshot;
    logPipelineStage({
        channel: 'input',
        context: 'GameStore',
        stage: params.stage,
        from: params.from,
        to: params.to,
        purpose: params.purpose,
        detail: {
            ...params.detail,
            publishMode: 'full',
            patchedStars: uniqueStarIds,
        },
    });
    return { mode: 'full', changed };
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
            _G.__paxTickIntervalId = tickIntervalId;
        }, firstDelay) as unknown as ReturnType<typeof setInterval>;
    } else {
        tickIntervalId = setInterval(() => {
            executeTick();
        }, tickIntervalMs);
    }
    _G.__paxTickIntervalId = tickIntervalId;

    if (!resumeOffsetMs) {
        lastTickTime = performance.now();
    }
}

function stopTick(): void {
    if (tickIntervalId) {
        clearInterval(tickIntervalId);
        tickIntervalId = null;
        _G.__paxTickIntervalId = null;
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
        portalGroup: s.portalGroup || undefined,
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
    star.ownerId = normalizeInitialOwnerId(ownerId);
    star.starType = 'grey';
    star.portalGroup = '';
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
function addDebugConnection(
    sourceId: string,
    targetId: string,
    distanceOverride?: number,
    laneWaypoints?: Array<[number, number]>,
    lanePathKind?: 'straight' | 'angular' | 'curved',
    laneConstraintStatus?: string,
): void {
    const source = state!.stars.get(sourceId);
    const target = state!.stars.get(targetId);
    if (!source || !target) return;
    const distance = distanceOverride ?? Math.sqrt((source.x - target.x) ** 2 + (source.y - target.y) ** 2);

    const assignLaneData = (
        connection: ConnectionSchema,
        waypoints?: Array<[number, number]>,
        pathKind?: 'straight' | 'angular' | 'curved',
        constraintStatus?: string,
    ) => {
        connection.lanePathKind = pathKind ?? '';
        connection.laneConstraintStatus = constraintStatus ?? '';
        if (!waypoints || waypoints.length < 2) return;
        for (const [x, y] of waypoints) {
            const point = new PointSchema();
            point.x = x;
            point.y = y;
            connection.laneWaypoints.push(point);
        }
    };

    const c1 = new ConnectionSchema();
    c1.sourceId = sourceId;
    c1.targetId = targetId;
    c1.distance = distance;
    assignLaneData(c1, laneWaypoints, lanePathKind, laneConstraintStatus);
    state!.connections.push(c1);

    const c2 = new ConnectionSchema();
    c2.sourceId = targetId;
    c2.targetId = sourceId;
    c2.distance = distance;
    assignLaneData(
        c2,
        laneWaypoints ? [...laneWaypoints].reverse() : undefined,
        lanePathKind,
        laneConstraintStatus,
    );
    state!.connections.push(c2);
}

function setStateMeasurementsFromRuntimeMap(runtimeMap: RuntimeAuthoredMap): void {
    state!.mapMeasurements.length = 0;
    for (const measurement of runtimeMap.diagnostics.measurements) {
        const schemaMeasurement = new MapMeasurementSchema();
        schemaMeasurement.id = measurement.id;
        schemaMeasurement.mode = measurement.mode;
        schemaMeasurement.preset = measurement.preset ?? '';
        schemaMeasurement.label = measurement.label ?? '';
        schemaMeasurement.startX = measurement.startX;
        schemaMeasurement.startY = measurement.startY;
        schemaMeasurement.endX = measurement.endX;
        schemaMeasurement.endY = measurement.endY;
        schemaMeasurement.dx = measurement.dx;
        schemaMeasurement.dy = measurement.dy;
        schemaMeasurement.distance = measurement.distance;
        schemaMeasurement.midX = measurement.midX;
        schemaMeasurement.midY = measurement.midY;
        schemaMeasurement.visibleByDefault = measurement.visibleByDefault;
        schemaMeasurement.relatedLaneId = measurement.relatedLaneId ?? '';
        schemaMeasurement.relatedLaneLabel = measurement.relatedLaneLabel ?? '';
        schemaMeasurement.starPairLabel = measurement.starPairLabel ?? '';
        state!.mapMeasurements.push(schemaMeasurement);
    }
}

function buildRuntimeMapOptions(playerIds: string[]) {
    const isPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
    return {
        playerIds,
        startingShips: GAME_CONFIG.STARTING_SHIPS,
        mapLaneMode: (GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved') as MapLaneMode,
        mapgenLaneMarginPx: laneDClearancePx(),
        scaleLegacyIfSmall: true,
        targetWidth: isPortrait ? 900 : 1600,
        targetHeight: isPortrait ? 1600 : 900,
        spacingMultiplier: GAME_CONFIG.CLASSIC_MAP_SPACING ?? 1,
        paddingRatio: 0.075,
    } as const;
}

function applyRuntimeMapToState(runtimeMap: RuntimeAuthoredMap): void {
    for (const starData of runtimeMap.stars) {
        const stats = STAR_TYPE_STATS[starData.starType] || STAR_TYPE_STATS['grey'];
        const star = new StarSchema();
        star.id = starData.id;
        star.x = starData.x;
        star.y = starData.y;
        star.ownerId = normalizeInitialOwnerId(starData.ownerId);
        star.starType = starData.starType;
        star.portalGroup = starData.portalGroup ?? '';
        star.activeShips = starData.activeShips ?? GAME_CONFIG.STARTING_SHIPS;
        star.damagedShips = starData.damagedShips ?? 0;
        star.targetId = starData.targetId ?? '';
        star.productionRate = starData.productionRate ?? 1;
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
        star.lastAttackTick = -1;
        state!.stars.set(star.id, star);
    }

    for (const connection of runtimeMap.connections) {
        addDebugConnection(
            connection.sourceId,
            connection.targetId,
            connection.distance,
            connection.laneWaypoints,
            connection.lanePathKind,
            connection.laneConstraintStatus,
        );
    }

    setStateMeasurementsFromRuntimeMap(runtimeMap);
}

/** Lane margin: clearance for chords / sampled centerlines vs non-endpoint stars (`@pax/common` mapgen). */
function laneDClearancePx(): number {
    return resolveEffectiveLaneMarginPx(GAME_CONFIG);
}

function refreshLanePolylinesFromConfig(): void {
    measurePerf('game.refreshLanePolylinesFromConfig', () => {
        if (!state || state.stars.size < 2) return;
        const nodes = [...state.stars.values()].map((s) => ({ id: s.id, x: s.x, y: s.y }));
        const uni = canonicalUniConnections(state.connections);
        measurePerf('game.refreshLanePolylinesFromConfig.rebuildLanePolylineCache', () => {
            rebuildLanePolylineCache(
                nodes,
                uni,
                (GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved') as MapLaneMode,
                laneDClearancePx(),
            );
        });
        logPipelineStage({
            context: 'GameStore',
            stage: 'lane_cache_refresh',
            from: 'Live lane settings + current runtime map',
            to: 'Lane polyline cache',
            purpose: 'Rebuild authored lane paths after configuration changes',
            summary:
                `nodes=${nodes.length} connections=${uni.length} ` +
                `mode=${String(GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved')}`,
            perfEventName: 'game.laneCache.refreshed',
            detail: {
                nodes,
                connections: uni,
                laneMode: GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved',
                laneMarginPx: laneDClearancePx(),
            },
        });
        bumpTerritoryVisualConfig();
        snapshot = toGameState(state);
    });
}

/** Recompute Delaunay-based links from current star positions (same algorithm as mapgen). */
function rebuildConnectionsFromLaneClearance(): void {
    measurePerf('game.rebuildConnectionsFromLaneClearance', () => {
    if (!state || state.stars.size < 2) return;

    const nodes = [...state.stars.values()]
        .map((s) => ({ id: s.id, x: s.x, y: s.y }))
        .sort((a, b) => a.id.localeCompare(b.id));

    const minL = settings.minLinksPerStar ?? 1;
    const maxL = settings.maxLinksPerStar ?? 5;
    const lm = laneDClearancePx();
    const curveVsPruneBias = Math.min(
        1,
        Math.max(0, GAME_CONFIG.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS ?? 0.55),
    );
    /** Match `generateMap`: Phase 4 chord clearance × (1−bias); lane polylines use full lane margin. */
    const uni = generateConnections(nodes, Infinity, minL, maxL, lm, curveVsPruneBias);

    state.connections.length = 0;
    for (const c of uni) {
        addDebugConnection(c.sourceId, c.targetId);
    }
    measurePerf('game.rebuildConnectionsFromLaneClearance.rebuildLanePolylineCache', () => {
        rebuildLanePolylineCache(
            nodes,
            uni,
            (GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved') as MapLaneMode,
            laneDClearancePx(),
        );
    });
    logPipelineStage({
        context: 'GameStore',
        stage: 'connection_rebuild',
        from: 'Runtime star positions',
        to: 'Runtime connections + lane cache',
        purpose: 'Recompute connectivity and lane paths from current map layout',
        summary:
            `nodes=${nodes.length} connections=${uni.length} ` +
            `mode=${String(GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved')}`,
        perfEventName: 'game.connections.rebuilt',
        detail: {
            nodes,
            connections: uni,
            laneMode: GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved',
            laneMarginPx: laneDClearancePx(),
            minLinksPerStar: minL,
            maxLinksPerStar: maxL,
        },
    });
    bumpTerritoryVisualConfig();
    snapshot = toGameState(state);
    });
}

/** Debug A: 4 stars in triangle + dead-end (matches server initDebugMap) */
function initDebugMap(playerIds: string[], variant: string): void {
    measurePerf('game.initDebugMap', () => {
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

    const nodesDbg = [...state!.stars.values()].map((s) => ({ id: s.id, x: s.x, y: s.y }));
    const uniDbg = canonicalUniConnections(state!.connections);
   measurePerf('game.initDebugMap.rebuildLanePolylineCache', () => {
       rebuildLanePolylineCache(
           nodesDbg,
           uniDbg,
           (GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved') as MapLaneMode,
           laneDClearancePx(),
       );
   });
    });
}

/**
 * Generate a map preview from the real engine — no fake procedural code.
 * Returns ThumbnailStar[] + ThumbnailConnection[] ready for generateMapThumbnail().
 * Called by MainMenu to preview the random map before starting the game.
 */
function generateMapPreview(opts: {
    playerCount: number;
    starsPerPlayer: number;
    minLinksPerStar: number;
    maxLinksPerStar: number;
    starSpacing: number;
    mapBoardFit: number;
    neutralStarCount: number;
    specialStarPercentage: number;
}): {
    stars: Array<{ id: string; x: number; y: number; ownerId: string; starType?: string }>;
    connections: Array<{
        sourceId: string;
        targetId: string;
        laneWaypoints?: [number, number][];
        lanePathKind?: 'straight' | 'angular' | 'curved';
    }>;
} {
    const isPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
    const mapW = isPortrait ? 900 : 1600;
    const mapH = isPortrait ? 1600 : 900;
    const preview = buildMainMenuPreview({
        width: mapW,
        height: mapH,
        playerCount: opts.playerCount,
        starsPerPlayer: opts.starsPerPlayer,
        minLinksPerStar: opts.minLinksPerStar,
        maxLinksPerStar: opts.maxLinksPerStar,
        starSpacing: opts.starSpacing,
        mapBoardFit: opts.mapBoardFit,
        neutralStarCount: opts.neutralStarCount,
        specialStarPercentage: opts.specialStarPercentage,
        mapgenStarMarginPx: GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45,
        mapgenLaneMarginPx: laneDClearancePx(),
        mapgenLaneCurveVsPruneBias: Math.min(
            1,
            Math.max(0, GAME_CONFIG.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS ?? 0.55),
        ),
        mapLaneMode: (GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved') as MapLaneMode,
    });
    logPipelineStage({
        context: 'GameStore',
        stage: 'map_preview',
        from: 'MainMenu settings',
        to: 'MainMenu preview canvas',
        purpose: 'Generate representative map preview payload',
        summary:
            `${summarizeStars(preview.stars)} ${summarizeConnections(preview.connections)}`,
        perfEventName: 'game.mapPreview.generated',
        detail: {
            width: mapW,
            height: mapH,
            playerCount: opts.playerCount,
            starsPerPlayer: opts.starsPerPlayer,
        },
    });
    return preview;
}

/** Standard random map via generateMap() */
function initStandardMap(playerIds: string[]): void {
    measurePerf('game.initStandardMap', () => {
    // Match map aspect ratio to viewport — portrait screens get portrait maps
    const isPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
    const mapW = isPortrait ? 900 : 1600;
    const mapH = isPortrait ? 1600 : 900;

    const neutralCount = settings.neutralStarCount ?? 0;
    const result = measurePerf('game.initStandardMap.generateMap', () => generateMap({
        width: mapW,
        height: mapH,
        playerCount: playerIds.length,
        starsPerPlayer: GAME_CONFIG.STARS_PER_PLAYER,
        extraNeutralStars: neutralCount,
        spacingMultiplier: settings.starSpacing ?? 1.0,
        hexRadius: GAME_CONFIG.HEX_RADIUS ?? 50,
        minLinksPerStar: settings.minLinksPerStar ?? 1,
        maxLinksPerStar: settings.maxLinksPerStar ?? 5,
        boardFit: settings.mapBoardFit ?? 0,
        mapgenStarMarginPx: GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45,
        mapgenLaneMarginPx: laneDClearancePx(),
        mapgenLaneCurveVsPruneBias: Math.min(
            1,
            Math.max(0, GAME_CONFIG.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS ?? 0.55),
        ),
        mapLaneMode: (GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved') as MapLaneMode,
    }));
    logPipelineStage({
        context: 'GameStore',
        stage: 'map_generation',
        from: '@pax/common.generateMap',
        to: 'GameStore.initStandardMap',
        purpose: 'Materialize new procedural match topology',
        summary:
            `positions=${result.positions.length} connections=${result.connections.length} ` +
            `world=${result.width}x${result.height}`,
        perfEventName: 'game.map.generated',
        detail: {
            width: result.width,
            height: result.height,
            hexRadius: result.hexRadius,
            paddingX: result.paddingX,
            paddingY: result.paddingY,
            playerCount: playerIds.length,
        },
        logDetail: {
            width: result.width,
            height: result.height,
            hexRadius: result.hexRadius,
            paddingX: result.paddingX,
            paddingY: result.paddingY,
            playerCount: playerIds.length,
            positions: result.positions,
            connections: result.connections,
        },
    });

    // Store map gen metadata for debug grid overlay
    GAME_CONFIG._MAP_HEX_RADIUS = result.hexRadius;
    GAME_CONFIG._MAP_WIDTH = result.width;
    GAME_CONFIG._MAP_HEIGHT = result.height;
    GAME_CONFIG._MAP_PADDING_X = result.paddingX;
    GAME_CONFIG._MAP_PADDING_Y = result.paddingY;

    const starTypes: StarType[] = ['grey', 'yellow', 'blue', 'purple', 'red', 'green'];
    
    // Allocate exact number of stars per player + neutral pool
    const ownerIds: string[] = [];
    for (const pid of playerIds) {
        for (let s=0; s<GAME_CONFIG.STARS_PER_PLAYER; s++) {
            ownerIds.push(pid);
        }
    }
    for (let n=0; n<neutralCount; n++) {
        ownerIds.push('neutral');
    }

    // Shuffle ownership assigning to positions
    for (let i = ownerIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ownerIds[i], ownerIds[j]] = [ownerIds[j], ownerIds[i]];
    }

    const hasCapital = new Set<string>();

    result.positions.forEach((pos, i) => {
        const ownerId = ownerIds[i];
        
        let isCapital = false;
        if (ownerId !== 'neutral' && !hasCapital.has(ownerId)) {
            isCapital = true;
            hasCapital.add(ownerId);
        }
        
        const isSpecial = Math.random() * 100 < (settings.specialStarPercentage ?? 20);
        const typeIndex = isSpecial ? Math.floor(Math.random() * (starTypes.length - 1)) + 1 : 0;
        const starType = isCapital ? 'grey' as StarType : starTypes[typeIndex] as StarType;
        const stats = STAR_TYPE_STATS[starType] || STAR_TYPE_STATS['grey'];

        const star = new StarSchema();
        star.id = `star-${i}`;
        star.x = pos.x;
        star.y = pos.y;
        star.ownerId = ownerId;
        star.starType = starType;
        star.portalGroup = '';
        star.activeShips = ownerId === 'neutral' ? (settings.neutralShipsPerStar ?? 10) : GAME_CONFIG.STARTING_SHIPS;
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
    logPipelineStage({
        context: 'GameStore',
        stage: 'map_ownership_assignment',
        from: 'Generated positions + shuffled owner pool',
        to: 'Runtime star ownership/state',
        purpose: 'Assign owners, ship counts, and star types before topology enters the live match',
        summary:
            `${summarizeStars(Array.from(state!.stars.values()))} ` +
            `ownerPool=${ownerIds.length} capitals=${hasCapital.size}`,
        perfEventName: 'game.map.ownershipAssigned',
        detail: {
            ownerIds,
            stars: Array.from(state!.stars.values()).map((star) => ({
                id: star.id,
                x: star.x,
                y: star.y,
                ownerId: star.ownerId,
                starType: star.starType,
                activeShips: star.activeShips,
                damagedShips: star.damagedShips,
            })),
        },
    });

    // Create connections (bidirectional)
    for (const conn of result.connections) {
        addDebugConnection(conn.sourceId, conn.targetId);
    }
    measurePerf('game.initStandardMap.seedLanePolylineCache', () => {
        seedLanePolylineCacheFromMapGen(result.connections);
    });
    logPipelineStage({
        context: 'GameStore',
        stage: 'lane_cache_seed',
        from: 'Map generation lane-aware connections',
        to: 'Lane polyline cache',
        purpose: 'Seed authored lane geometry before territory and ship renderers consume the map',
        summary:
            `${summarizeConnections(result.connections)} ` +
            `mode=${String(GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved')}`,
        perfEventName: 'game.laneCache.seeded',
        detail: {
            laneConnections: result.connections,
            laneMode: GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved',
            laneMarginPx: GAME_CONFIG.MAPGEN_LANE_MARGIN_PX ?? 75,
        },
    });
    logPipelineStage({
        context: 'GameStore',
        stage: 'map_init',
        from: 'Map generation output',
        to: 'GameRoomState + lane cache',
        purpose: 'Seed runtime stars, connections, and authored lane geometry',
        summary:
            `${summarizeStars(Array.from(state!.stars.values()))} ` +
            `${summarizeConnections(result.connections)}`,
        perfEventName: 'game.map.runtimeInitialized',
        detail: {
            stars: Array.from(state!.stars.values()).map((star) => ({
                id: star.id,
                x: star.x,
                y: star.y,
                ownerId: star.ownerId,
                starType: star.starType,
                activeShips: star.activeShips,
                damagedShips: star.damagedShips,
            })),
            laneConnections: result.connections,
        },
        perfDetail: {
            starCount: state!.stars.size,
            laneConnectionCount: result.connections.length,
        },
    });
    });
}

// ============================================================================
// Map Save/Load (F-70)
// ============================================================================

let lastMapDefinition: MapDefinition | null = null;
let pendingSavedMap: MapDefinition | null = null;
let currentLoadedMap: MapDefinition | null = null;
let savedMaps: MapDefinition[] = $state(loadSavedMaps());

// F-148: Default map preference — auto-load a saved map on game start
let defaultMapName: string = $state(localStorage.getItem('pax_defaultMap') || '');

function loadSavedMaps(): MapDefinition[] {
    try {
        const raw = localStorage.getItem('pax_savedMaps');
        const parsed = raw ? JSON.parse(raw) : [];
        const userMaps: MapDefinition[] = Array.isArray(parsed)
            ? parsed.map((map) =>
                coerceAuthoredMapDefinition(map as MapDefinition, {
                    kind: 'legacy-json',
                }),
            )
            : [];

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

function coerceRepositoryMap(map: MapDefinition): MapDefinition {
    const normalized = coerceAuthoredMapDefinition(map as MapDefinition, {
        kind: 'legacy-json',
    });

    const isBuiltin = Boolean((map as { builtIn?: boolean }).builtIn);
    const explicitCategory = normalized.metadata.category;

    return {
        ...normalized,
        metadata: normalizeAuthoredMapMetadata({
            ...normalized.metadata,
            category: isBuiltin
                ? 'classic'
                : explicitCategory === 'classic' || explicitCategory === 'test'
                    ? explicitCategory
                    : 'custom',
        }),
    };
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
        const fsMaps: MapDefinition[] = (await res.json()).map((map: MapDefinition) =>
            coerceRepositoryMap(map),
        );
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
            logPipelineStage({
                context: 'GameStore',
                stage: 'filesystem_map_merge',
                from: '/__maps response',
                to: 'savedMaps cache',
                purpose: 'Merge discovered filesystem maps into the local saved-map catalog',
                summary: `added=${added} total=${savedMaps.length}`,
                perfEventName: 'game.maps.filesystemMerged',
                detail: {
                    discovered: fsMaps.map((map) => ({
                        name: map.metadata.name,
                        version: map.metadata.version,
                    })),
                },
            });
        }
    } catch { /* dev server may not be running */ }
}

// Trigger async filesystem load at module init
loadFilesystemMaps();

// Trigger async builtin maps load (fetch from /maps/)
async function loadBuiltinMapsAsync(): Promise<void> {
    try {
        const builtins = (await loadBuiltinMaps()).map((map) => coerceRepositoryMap(map));
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
            logPipelineStage({
                context: 'GameStore',
                stage: 'builtin_map_merge',
                from: '/maps catalog',
                to: 'savedMaps cache',
                purpose: 'Merge built-in authored maps into the local saved-map catalog',
                summary: `added=${added} total=${savedMaps.length}`,
                perfEventName: 'game.maps.builtinMerged',
                detail: {
                    discovered: builtins.map((map) => ({
                        name: map.metadata.name,
                        version: map.metadata.version,
                    })),
                },
            });
        }
    } catch (e) {
        log.error('GameStore', 'Failed to load built-in maps', e);
    }
}
loadBuiltinMapsAsync();

// ============================================================================
// Saved Games (in-progress snapshots) — B-58
// ============================================================================

let savedGames: SavedGame[] = $state(loadSavedGames());

function loadSavedGames(): SavedGame[] {
    try {
        const raw = localStorage.getItem('pax_savedGames');
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function persistSavedGamesList(): void {
    localStorage.setItem('pax_savedGames', JSON.stringify(savedGames));
}

function persistGameToFilesystem(game: SavedGame): void {
    try {
        fetch('/__games', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(game),
        }).catch(() => { /* dev server may not be running */ });
    } catch { /* noop */ }
}

function deleteGameFromFilesystem(id: string): void {
    try {
        fetch(`/__games?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
            .catch(() => { /* noop */ });
    } catch { /* noop */ }
}

/** Save current in-progress game as a SavedGame snapshot */
function saveCurrentGame(name: string, thumbnail?: string): void {
    const mapSnapshot = exportMapDefinition();
    if (!mapSnapshot || !state) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const starSnapshots: SavedGame['stars'] = [];
    state.stars.forEach((s) => {
        starSnapshots.push({
            id: s.id,
            ownerId: s.ownerId,
            activeShips: s.activeShips,
            damagedShips: s.damagedShips,
            targetId: s.targetId ?? '',
        });
    });
    const game: SavedGame = {
        id,
        name,
        createdAt: new Date().toISOString(),
        tick: state.tick,
        mapName: mapSnapshot.metadata.name ?? 'unsaved',
        mapSnapshot,
        stars: starSnapshots,
        ...(thumbnail ? { thumbnail } : {}),
    };
    savedGames = [game, ...savedGames];
    persistSavedGamesList();
    persistGameToFilesystem(game);
}

/** Delete a saved game by id */
function deleteSavedGame(id: string): void {
    savedGames = savedGames.filter(g => g.id !== id);
    persistSavedGamesList();
    deleteGameFromFilesystem(id);
}

/** Load a saved game into the pending slot (full restore on next startGame) */
function loadSavedGame(game: SavedGame, freshStart = false): void {
    if (freshStart) {
        // Strip game state — load map topology only
        pendingSavedMap = game.mapSnapshot;
    } else {
        // Full restore: use mapSnapshot but preserve live ship counts
        const restored: MapDefinition = {
            ...game.mapSnapshot,
            stars: game.mapSnapshot.stars.map((ms) => {
                const snap = game.stars.find(s => s.id === ms.id);
                return snap ? {
                    ...ms,
                    ownerId: snap.ownerId,
                    activeShips: snap.activeShips,
                    damagedShips: snap.damagedShips,
                    targetId: snap.targetId,
                } : ms;
            }),
        };
        pendingSavedMap = restored;
    }
}

function setDefaultMap(name: string): void {
    defaultMapName = name;
    localStorage.setItem('pax_defaultMap', name);
}

function clearDefaultMap(): void {
    defaultMapName = '';
    localStorage.removeItem('pax_defaultMap');
}

/** Export current map as a TOPOLOGY-ONLY MapDefinition (no live game state).
 * Ships reset to STARTING_SHIPS, no orders, no targets.
 */
function slugifyMapId(value: string): string {
    const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || `map-${Date.now()}`;
}

function getAuthoredStarById(starId: string): MapDefinition['stars'][number] | undefined {
    return currentLoadedMap?.stars.find((star) => star.id === starId);
}

function getAuthoredLaneByPair(sourceId: string, targetId: string): MapDefinition['connections'][number] | undefined {
    return currentLoadedMap?.connections.find((lane) => (
        (lane.sourceId === sourceId && lane.targetId === targetId)
        || (lane.sourceId === targetId && lane.targetId === sourceId)
    ));
}

function exportMeasurementDefinitions(): NonNullable<MapDefinition['measurements']> {
    if (currentLoadedMap?.measurements?.length) {
        return currentLoadedMap.measurements.map((measurement) => ({
            ...measurement,
            start: { ...measurement.start },
            end: { ...measurement.end },
        }));
    }

    return Array.from(state?.mapMeasurements ?? []).map((measurement) => ({
        id: measurement.id,
        mode: (measurement.mode as 'manual' | 'generated') ?? 'manual',
        preset: measurement.preset ? (measurement.preset as 'lane_length') : undefined,
        label: measurement.label || undefined,
        visibleByDefault: measurement.visibleByDefault,
        relatedLaneId: measurement.relatedLaneId || undefined,
        relatedLaneLabel: measurement.relatedLaneLabel || undefined,
        starPairLabel: measurement.starPairLabel || undefined,
        start: {
            x: measurement.startX,
            y: measurement.startY,
            snapKind: 'free',
        },
        end: {
            x: measurement.endX,
            y: measurement.endY,
            snapKind: 'free',
        },
    }));
}

function buildExportedMap(includeLiveState: boolean): MapDefinition | null {
    if (!state) return null;

    const now = new Date().toISOString();
    const stars: MapDefinition['stars'] = [];
    state.stars.forEach((starState) => {
        const authoredStar = getAuthoredStarById(starState.id);
        stars.push({
            id: starState.id,
            x: starState.x,
            y: starState.y,
            ownerId: authoredStar?.ownerId ?? starState.ownerId,
            starType: starState.starType as StarType,
            portalGroup: authoredStar?.portalGroup ?? (starState.portalGroup || undefined),
            activeShips: includeLiveState
                ? starState.activeShips
                : (authoredStar?.activeShips ?? GAME_CONFIG.STARTING_SHIPS),
            damagedShips: includeLiveState ? starState.damagedShips : 0,
            targetId: includeLiveState ? (starState.targetId || undefined) : undefined,
            productionRate: authoredStar?.productionRate,
            specialTraits: authoredStar?.specialTraits ? [...authoredStar.specialTraits] : undefined,
        });
    });

    const seenPairs = new Set<string>();
    const connections: MapDefinition['connections'] = [];
    for (let index = 0; index < state.connections.length; index++) {
        const connection = state.connections[index];
        const pairKey = [connection.sourceId, connection.targetId].sort().join('|');
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);

        const authoredLane = getAuthoredLaneByPair(connection.sourceId, connection.targetId);
        const laneSourceId = authoredLane?.sourceId ?? connection.sourceId;
        const laneTargetId = authoredLane?.targetId ?? connection.targetId;
        const orientedConnection =
            state.connections.find((candidate) =>
                candidate.sourceId === laneSourceId && candidate.targetId === laneTargetId,
            ) ?? connection;
        const laneWaypoints = orientedConnection.laneWaypoints.length >= 2
            ? Array.from(orientedConnection.laneWaypoints).map((point) => [point.x, point.y] as [number, number])
            : undefined;
        const pathMode = authoredLane?.pathMode ?? (laneWaypoints ? 'manual' : 'auto');
        const shouldPersistWaypoints = pathMode === 'manual';

        connections.push({
            id: authoredLane?.id ?? `lane-${connections.length}-${pairKey.replace(/\|/g, '-')}`,
            sourceId: laneSourceId,
            targetId: laneTargetId,
            distance: orientedConnection.distance,
            pathMode,
            laneWaypoints: shouldPersistWaypoints ? laneWaypoints : undefined,
            lanePathKind: shouldPersistWaypoints
                ? ((orientedConnection.lanePathKind || authoredLane?.lanePathKind || undefined) as MapDefinition['connections'][number]['lanePathKind'])
                : undefined,
            laneConstraintStatus: shouldPersistWaypoints
                ? ((orientedConnection.laneConstraintStatus || authoredLane?.laneConstraintStatus || undefined) as MapDefinition['connections'][number]['laneConstraintStatus'])
                : undefined,
        });
    }

    const baseName = currentLoadedMap?.metadata.name || 'Untitled';
    const metadata: MapDefinition['metadata'] = {
        mapId: currentLoadedMap?.metadata.mapId ?? slugifyMapId(baseName),
        name: baseName,
        author: currentLoadedMap?.metadata.author,
        description: currentLoadedMap?.metadata.description,
        version: currentLoadedMap?.metadata.version ?? 1,
        category: 'custom',
        createdAt: currentLoadedMap?.metadata.createdAt ?? now,
        updatedAt: now,
        tags: currentLoadedMap?.metadata.tags ? [...currentLoadedMap.metadata.tags] : undefined,
        importedFrom: { kind: 'editor', sourceId: currentLoadedMap?.metadata.mapId },
        autosaveRevisionId: currentLoadedMap?.metadata.autosaveRevisionId,
        autosaveSequence: currentLoadedMap?.metadata.autosaveSequence,
        thumbnailDataUrl: currentLoadedMap?.metadata.thumbnailDataUrl,
    };

    return {
        metadata,
        factions: currentLoadedMap?.factions?.map((faction) => ({ ...faction }))
            ?? [...new Set(stars.map((star) => star.ownerId ?? AUTHORED_NEUTRAL_OWNER_ID))]
                .filter((ownerId) => ownerId !== AUTHORED_NEUTRAL_OWNER_ID)
                .sort()
                .map((ownerId, order) => ({
                    id: ownerId!,
                    label: `Faction ${order + 1}`,
                    order,
                })),
        stars,
        connections,
        measurements: exportMeasurementDefinitions(),
        customRules: includeLiveState
            ? {
                ...(currentLoadedMap?.customRules ?? {}),
                tick: state.tick,
            }
            : currentLoadedMap?.customRules,
    };
}

function exportMapTopology(): MapDefinition | null {
    return buildExportedMap(false);
}

/** Export current game state as a MapDefinition (legacy — includes live state) */
function exportMapDefinition(): MapDefinition | null {
    return buildExportedMap(true);
}

function upsertSavedMapDefinition(map: MapDefinition): MapDefinition {
    const normalizedMap = coerceRepositoryMap(map);
    savedMaps = [normalizedMap, ...savedMaps.filter((savedMap) => savedMap.metadata.name !== normalizedMap.metadata.name)];
    persistSavedMaps();
    persistMapToFilesystem(normalizedMap);

    if (
        currentLoadedMap?.metadata.mapId === normalizedMap.metadata.mapId
        || currentLoadedMap?.metadata.name === normalizedMap.metadata.name
    ) {
        currentLoadedMap = normalizedMap;
    }
    const mapDefinition = {
        metadata: { name: 'Untitled', createdAt: new Date().toISOString(), version: 2 },
        stars, connections,
        customRules: { tick: state.tick },
    };
    logPipelineStage({
        context: 'GameStore',
        stage: 'map_export',
        from: 'GameRoomState',
        to: 'MapDefinition',
        purpose: 'Serialize current match topology and ownership snapshot',
        summary:
            `${summarizeStars(stars)} ${summarizeConnections(connections)}`,
        perfEventName: 'game.map.exported',
        detail: {
            tick: state.tick,
            version: mapDefinition.metadata.version,
        },
    });
    return mapDefinition;
}

/** Save current map TOPOLOGY with a name (B-58: topology only, no game state) */
function saveCurrentMap(name: string): void {
    const map = exportMapTopology();
    if (!map) return;
    const family = resolveOrCreateAuthoredMapFamily(
        {
            familyId: map.metadata.familyId,
            familyName: map.metadata.familyName,
            mapId: currentLoadedMap?.metadata.mapId ?? map.metadata.mapId,
            name: currentLoadedMap?.metadata.name ?? map.metadata.name,
        },
        currentLoadedMap?.metadata.familyName ?? currentLoadedMap?.metadata.name,
    );
    map.metadata = {
        ...map.metadata,
        mapId: map.metadata.mapId || slugifyMapId(name),
        name,
        category: 'custom',
        familyId: family.familyId,
        familyName: family.familyName,
        importedFrom: { kind: 'editor', sourceId: currentLoadedMap?.metadata.mapId },
        updatedAt: new Date().toISOString(),
    };
    upsertSavedMapDefinition(map);
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
    logPipelineStage({
        context: 'GameStore',
        stage: 'map_queue',
        from: 'Saved map library',
        to: 'Pending saved map slot',
        purpose: 'Select next topology to load on start',
        summary:
            `${summarizeStars(map.stars)} ${summarizeConnections(map.connections)}`,
        perfEventName: 'game.savedMap.queued',
        detail: {
            name: map.metadata.name,
            version: map.metadata.version,
        },
    });
}

/** Initialize from a saved MapDefinition */
function initSavedMap(playerIds: string[], map: MapDefinition): void {
    measurePerf('game.initSavedMap', () => {
    const starTypes: StarType[] = ['grey', 'yellow', 'blue', 'purple', 'red', 'green'];

    applyRuntimeMapToState(runtimeMap);
    currentLoadedMap = normalizedMap;

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
    // Calculate coordinate scale — classic maps use ~800×500 coordinate space;
    // scale to match current viewport if coordinates are in that range
    logPipelineStage({
        context: 'GameStore',
        stage: 'saved_map_remap',
        from: 'MapDefinition factions',
        to: 'Runtime player identities',
        purpose: 'Resolve saved ownership IDs into current player slots',
        summary: summarizeSavedMapRemap({
            factions: Array.from(mapFactions),
            playerIds,
            remap: factionRemap,
            isMidGameSave,
        }),
        perfEventName: 'game.savedMap.remapped',
        detail: {
            factions: Array.from(mapFactions),
            playerIds,
            remap: Object.fromEntries(factionRemap.entries()),
        },
    });

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
        const normalizedOwnerId = normalizeInitialOwnerId(s.ownerId);
        const ownerId =
            normalizedOwnerId === NEUTRAL_OWNER_ID
                ? NEUTRAL_OWNER_ID
                : (factionRemap.get(normalizedOwnerId) ?? normalizedOwnerId);
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
    const nodesSaved = [...state!.stars.values()].map((s) => ({ id: s.id, x: s.x, y: s.y }));
    const uniSaved = canonicalUniConnections(state!.connections);
    measurePerf('game.initSavedMap.rebuildLanePolylineCache', () => {
        rebuildLanePolylineCache(
            nodesSaved,
            uniSaved,
            (GAME_CONFIG.MAPGEN_LANE_MODE ?? 'curved') as MapLaneMode,
            laneDClearancePx(),
        );
    });
    logPipelineStage({
        context: 'GameStore',
        stage: 'saved_map_init',
        from: 'MapDefinition',
        to: 'GameRoomState + lane cache',
        purpose: 'Restore authored map topology into runtime state',
        summary:
            `${summarizeStars(Array.from(state!.stars.values()))} ` +
            `${summarizeConnections(map.connections)}`,
        perfEventName: 'game.savedMap.runtimeInitialized',
        detail: {
            name: map.metadata.name,
            version: map.metadata.version,
        },
    });
    });
}
function initializeState(): void {
    measurePerf('game.initializeState', () => {
    state = new GameRoomState();
    state.phase = 'playing'; // Will be set to paused via isPaused
    state.isPaused = true;
    state.speed = 1;
    state.tick = 0;
    currentLoadedMap = null;

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
    logPipelineStage({
        context: 'GameStore',
        stage: 'player_init',
        from: 'Menu settings',
        to: 'GameRoomState.players',
        purpose: 'Instantiate runtime player roster and palette',
        summary: `players=${playerIds.length} ai=${Math.max(0, playerIds.length - 1)}`,
        perfEventName: 'game.players.initialized',
        detail: {
            playerIds,
        },
    });

    // Generate map based on mapType
    const mapType = settings.mapType || 'standard';

    measurePerf('game.initializeState.mapInit', () => {
        if (mapType === 'debug' || mapType === 'debug-b') {
            initDebugMap(playerIds, mapType);
        } else if (pendingSavedMap) {
            initSavedMap(playerIds, pendingSavedMap);
            pendingSavedMap = null;
        } else if (defaultMapName) {
            const defaultMap = savedMaps.find(m => m.metadata.name === defaultMapName);
            if (defaultMap) {
                logPipelineStage({
                    context: 'GameStore',
                    stage: 'default_map_autoload',
                    from: 'Default map preference',
                    to: 'Saved map initialization',
                    purpose: 'Start the match from the preferred authored map',
                    summary: summarizeMapDefinition(defaultMap),
                    perfEventName: 'game.maps.defaultAutoloaded',
                });
                initSavedMap(playerIds, defaultMap);
            } else {
                log.error(
                    'GameStore',
                    `Default map "${defaultMapName}" not found; falling back to random generation`,
                    {
                        defaultMapName,
                        savedMapCount: savedMaps.length,
                    },
                );
                initStandardMap(playerIds);
            }
        } else {
            initStandardMap(playerIds);
        }
    });

    const normalizedUnownedCount = normalizeUnownedStarsToNeutral(state!.stars.values());
    if (normalizedUnownedCount > 0) {
        logPipelineStage({
            channel: 'state',
            context: 'GameStore',
            stage: 'normalize_unowned',
            from: 'Imported star ownership',
            to: 'Neutral-owned runtime stars',
            purpose: 'Repair unowned stars so ownership, geometry, and rendering remain valid',
            summary: `normalized=${normalizedUnownedCount}`,
            perfEventName: 'game.state.unownedNormalized',
            detail: {
                normalizedUnownedCount,
            },
        });
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
    measurePerf('game.initializeState.updatePlayerStats', () => {
        SharedEngine.updatePlayerStats(state!);
    });
    state!.isPaused = true;
    logPipelineStage({
        context: 'GameStore',
        stage: 'state_init',
        from: 'GameRoomState setup',
        to: 'Paused lobby-ready match state',
        purpose: 'Finalize runtime state before first lobby frame',
        summary:
            `${summarizeStars(Array.from(state!.stars.values()))} ` +
            `${summarizeConnections(Array.from(state!.connections))}`,
        perfEventName: 'game.state.initialized',
        detail: {
            players: state!.players.size,
            tick: state!.tick,
        },
    });
    });
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
    clearLanePolylineCache();
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

function applyPlayerColors(colors: string[]): void {
    const currentColors = state
        ? Array.from(state.players.values()).map((player) => player.color)
        : snapshot?.players.map((player) => player.color) ?? [];
    const unchanged =
        currentColors.length > 0 &&
        currentColors.every((color, index) => color === (colors[index] ?? color));
    if (unchanged) return;

    settings = { ...settings, playerColors: colors };
    if (!state) return;

    let index = 0;
    state.players.forEach((player: PlayerSchema) => {
        player.color = colors[index] ?? player.color;
        index++;
    });

    snapshot = toGameState(state);
    bumpTerritoryVisualConfig();
}

async function startGame(): Promise<void> {
    recordPerfEvent('game.startGame.requested');
    await measurePerfAsync('game.startGame', async () => {
        logPipelineStage({
            context: 'GameStore',
            stage: 'start_request',
            from: 'Menu or benchmark command',
            to: 'Game initialization pipeline',
            purpose: 'Transition into a fresh playable match state',
            perfEventName: 'game.startGame.pipelineStarted',
            detail: {
                currentView,
                hasStarted,
            },
        });
        destroyGame();
        (globalThis as any).__territoryRenderedWhilePaused = false;
        measurePerf('game.startGame.clearCombatLog', () => {
            combatLog.clear();
        });
        sessionId++;
        initializeState();
        measurePerf('game.startGame.initialSnapshot', () => {
            snapshot = toGameState(state!);
        });
        currentView = 'game';
        startTime = Date.now();
        logPipelineStage({
            context: 'GameStore',
            stage: 'start_complete',
            from: 'Game initialization pipeline',
            to: 'GameContainer lobby view',
            purpose: 'Expose initialized match to the UI',
            summary:
                `${summarizeStars(snapshot?.stars ?? [])} ` +
                `${summarizeConnections(snapshot?.connections ?? [])}`,
            perfEventName: 'game.startGame.completed',
            detail: {
                currentView,
                hasStarted,
            },
        });
    });
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

async function restart(): Promise<void> {
    hasStarted = false;
    await startGame();
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
    const targetBefore = state.stars.get(targetId);
    const targetBeforeTargetId = targetBefore?.targetId || null;
    const targetBeforeQueuedTargetId = targetBefore?.queuedOrderTargetId || null;

    const input: IssueOrderInput = {
        type: 'ISSUE_ORDER',
        sourceId,
        targetId,
        playerId: HUMAN_PLAYER_ID,
        persist: persistAfterConquest,
    };
    measurePerf('game.order.issue.engine', () => {
        SharedEngine.processInput(state!, input, {
            ALLOW_OPPOSING_ORDERS: GAME_CONFIG.ALLOW_OPPOSING_ORDERS,
        });
    }, {
        sourceId,
        targetId,
        persistAfterConquest: Boolean(persistAfterConquest),
    });
    const sourceAfter = state.stars.get(sourceId);
    const targetAfter = state.stars.get(targetId);
    const accepted = sourceAfter?.targetId === targetId;
    const affectedStarIds = [sourceId];
    if (
        targetAfter &&
        (
            targetBeforeTargetId !== (targetAfter.targetId || null) ||
            targetBeforeQueuedTargetId !== (targetAfter.queuedOrderTargetId || null)
        )
    ) {
        affectedStarIds.push(targetId);
    }
    const publishResult = publishOrderMutationSnapshot({
        perfPrefix: 'game.order.issue',
        stage: 'issue_order_publish',
        from: `Engine order mutation ${sourceId}`,
        to: 'GameState snapshot',
        purpose: 'Publish only the order-facing star fields needed for instant local command feedback',
        starIds: affectedStarIds,
        detail: {
            sourceId,
            targetId,
            persistAfterConquest: Boolean(persistAfterConquest),
            accepted,
        },
    });
    logPipelineStage({
        channel: 'input',
        context: 'GameStore',
        stage: 'issue_order',
        from: `Star ${sourceId}`,
        to: `Star ${targetId}`,
        purpose: 'Push a live player order into the engine and refresh UI immediately',
        perfEventName: 'game.order.issued',
        detail: {
            persistAfterConquest: Boolean(persistAfterConquest),
            localPlayerId: HUMAN_PLAYER_ID,
            accepted,
            publishMode: publishResult.mode,
        },
    });
    return accepted;
}

function cancelOrder(starId: StarId): void {
    if (!state) return;

    const input: CancelOrderInput = {
        type: 'CANCEL_ORDER',
        starId,
        playerId: HUMAN_PLAYER_ID,
    };
    measurePerf('game.order.cancel.engine', () => {
        SharedEngine.processInput(state!, input);
    }, {
        starId,
    });
    const starAfter = state.stars.get(starId);
    const accepted = Boolean(
        starAfter &&
        !starAfter.targetId &&
        !starAfter.queuedOrderTargetId,
    );
    const publishResult = publishOrderMutationSnapshot({
        perfPrefix: 'game.order.cancel',
        stage: 'cancel_order_publish',
        from: `Engine order mutation ${starId}`,
        to: 'GameState snapshot',
        purpose: 'Publish only the cancelled order state required for immediate local UI response',
        starIds: [starId],
        detail: {
            starId,
            accepted,
        },
    });
    logPipelineStage({
        channel: 'input',
        context: 'GameStore',
        stage: 'cancel_order',
        from: `Star ${starId}`,
        to: 'Engine order queue',
        purpose: 'Remove a live player order and refresh UI immediately',
        perfEventName: 'game.order.cancelled',
        detail: {
            localPlayerId: HUMAN_PLAYER_ID,
            accepted,
            publishMode: publishResult.mode,
        },
    });
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
    measurePerf('game.order.defer.engine', () => {
        SharedEngine.processInput(state!, input);
    }, {
        enemyStarId,
        nextTargetId,
        persistAfterConquest: Boolean(persistAfterConquest),
    });
    const enemyStarAfter = state.stars.get(enemyStarId);
    const accepted = enemyStarAfter?.queuedOrderTargetId === nextTargetId;
    const publishResult = publishOrderMutationSnapshot({
        perfPrefix: 'game.order.defer',
        stage: 'deferred_order_publish',
        from: `Engine deferred order mutation ${enemyStarId}`,
        to: 'GameState snapshot',
        purpose: 'Publish only the queued conquest order fields required for immediate deferred-order feedback',
        starIds: [enemyStarId],
        detail: {
            enemyStarId,
            nextTargetId,
            persistAfterConquest: Boolean(persistAfterConquest),
            accepted,
        },
    });
    logPipelineStage({
        channel: 'input',
        context: 'GameStore',
        stage: 'deferred_order',
        from: `Star ${enemyStarId}`,
        to: `Star ${nextTargetId}`,
        purpose: 'Queue a conquest-follow-up order and refresh the local deferred-order preview immediately',
        perfEventName: 'game.order.deferred',
        detail: {
            localPlayerId: HUMAN_PLAYER_ID,
            accepted,
            publishMode: publishResult.mode,
        },
    });
    return accepted;
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
    applyPlayerColors,
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
    upsertSavedMapDefinition,
    deleteSavedMap,
    loadSavedMap,

    // Game save/load (B-58)
    get savedGames() { return savedGames; },
    saveCurrentGame,
    deleteSavedGame,
    loadSavedGame,

    // Map preview (F-168)
    generateMapPreview,

    /** Rebuild lane graph from current star positions using MSR + lane buffer (paused / live tuning). */
    rebuildConnectionsFromLaneClearance,

    /** Apply the current effective lane-clearance config and rebuild lanes + links. */
    rebuildLaneConstraintsFromConfig: rebuildConnectionsFromLaneClearance,

    /** Recompute curved lane polylines from current stars + links (e.g. lane mode change). */
    refreshLanePolylinesFromConfig,

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
