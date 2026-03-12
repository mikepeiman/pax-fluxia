import { GAME_CONFIG } from '$lib/config/game.config';
import {
    renderDistanceFieldTerritory,
    resetDistanceFieldTerritoryCache,
} from '$lib/renderers/DistanceFieldTerritoryRenderer';
import {
    renderPowerVoronoi,
    resetPowerVoronoiCache,
} from '$lib/renderers/PowerVoronoiRenderer';
import { renderPVV3, resetPVV3Cache } from '$lib/renderers/PVV3Renderer';
import { log } from '$lib/utils/logger';
import { executeFG2Stage } from './methods/fg2SeedGraph';
import {
    DEFAULT_TERRITORY_DYNAMIC_METHOD,
    DEFAULT_TERRITORY_HYBRID_PLAN,
    DEFAULT_TERRITORY_STATIC_METHOD,
    TERRITORY_DYNAMIC_METHOD_BY_ID,
    TERRITORY_HYBRID_PLAN_BY_ID,
    TERRITORY_PIPELINE_STAGE_ORDER,
    TERRITORY_STATIC_METHOD_BY_ID,
} from './registry';
import type {
    TerritoryDynamicMethodId,
    TerritoryEngineInput,
    TerritoryEngineMode,
    TerritoryHybridPlanId,
    TerritoryLegacyAdapterId,
    TerritoryMethodSelection,
    TerritoryPipelineArtifacts,
    TerritoryPipelineStageId,
    TerritoryStageTraceStep,
    TerritoryStaticMethodId,
    TerritoryTraceRun,
} from './types';

interface StageRuntimeContext {
    input: TerritoryEngineInput;
    selection: TerritoryMethodSelection;
    artifacts: TerritoryPipelineArtifacts;
}

interface InteractiveRunState {
    fingerprint: string;
    selectionKey: string;
    runId: number;
    startedAtMs: number;
    startedWallMs: number;
    steps: TerritoryStageTraceStep[];
    artifacts: TerritoryPipelineArtifacts;
    nextStageIndex: number;
    lastAdvanceToken: number;
}

let traceRunCounter = 0;
let lastTraceRun: TerritoryTraceRun | null = null;
let lastLoggedSelectionKey: string | null = null;
let interactiveRunState: InteractiveRunState | null = null;
const adapterFallbackLogged = new Set<string>();

function resolveEngineMode(rawValue: unknown): TerritoryEngineMode {
    if (rawValue === 'static' || rawValue === 'dynamic' || rawValue === 'hybrid') {
        return rawValue;
    }
    return 'static';
}

function resolveStaticMethodId(rawValue: unknown): TerritoryStaticMethodId {
    if (typeof rawValue !== 'string') return DEFAULT_TERRITORY_STATIC_METHOD;
    return Object.prototype.hasOwnProperty.call(TERRITORY_STATIC_METHOD_BY_ID, rawValue)
        ? (rawValue as TerritoryStaticMethodId)
        : DEFAULT_TERRITORY_STATIC_METHOD;
}

function resolveDynamicMethodId(rawValue: unknown): TerritoryDynamicMethodId {
    if (typeof rawValue !== 'string') return DEFAULT_TERRITORY_DYNAMIC_METHOD;
    return Object.prototype.hasOwnProperty.call(TERRITORY_DYNAMIC_METHOD_BY_ID, rawValue)
        ? (rawValue as TerritoryDynamicMethodId)
        : DEFAULT_TERRITORY_DYNAMIC_METHOD;
}

function resolveHybridPlanId(rawValue: unknown): TerritoryHybridPlanId {
    if (typeof rawValue !== 'string') return DEFAULT_TERRITORY_HYBRID_PLAN;
    return Object.prototype.hasOwnProperty.call(TERRITORY_HYBRID_PLAN_BY_ID, rawValue)
        ? (rawValue as TerritoryHybridPlanId)
        : DEFAULT_TERRITORY_HYBRID_PLAN;
}

function resolveMethodSelection(): TerritoryMethodSelection {
    const mode = resolveEngineMode(GAME_CONFIG.TERRITORY_ENGINE_MODE);
    const staticMethodId = resolveStaticMethodId(
        GAME_CONFIG.TERRITORY_ENGINE_STATIC_METHOD,
    );
    const dynamicMethodId = resolveDynamicMethodId(
        GAME_CONFIG.TERRITORY_ENGINE_DYNAMIC_METHOD,
    );
    const hybridPlanId = resolveHybridPlanId(GAME_CONFIG.TERRITORY_ENGINE_HYBRID_PLAN);

    if (mode === 'dynamic') {
        const dynamicMethod = TERRITORY_DYNAMIC_METHOD_BY_ID[dynamicMethodId];
        return {
            mode,
            staticMethodId: dynamicMethod.anchorStaticMethodId,
            dynamicMethodId,
            hybridPlanId,
            adapter: dynamicMethod.adapter,
            implementedStages: dynamicMethod.implementedStages,
        };
    }

    if (mode === 'hybrid') {
        const hybridPlan = TERRITORY_HYBRID_PLAN_BY_ID[hybridPlanId];
        return {
            mode,
            staticMethodId: hybridPlan.staticMethodId,
            dynamicMethodId: hybridPlan.dynamicMethodId,
            hybridPlanId,
            adapter: hybridPlan.adapter,
            implementedStages: hybridPlan.implementedStages,
        };
    }

    const staticMethod = TERRITORY_STATIC_METHOD_BY_ID[staticMethodId];
    return {
        mode,
        staticMethodId,
        dynamicMethodId,
        hybridPlanId,
        adapter: staticMethod.adapter,
        implementedStages: staticMethod.implementedStages,
    };
}

function selectionKey(selection: TerritoryMethodSelection): string {
    return `${selection.mode}:${selection.staticMethodId}:${selection.dynamicMethodId}:${selection.hybridPlanId}:${selection.adapter}`;
}

function normalizeAdvanceToken(rawValue: unknown): number {
    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) return 0;
    return Math.max(0, Math.floor(rawValue));
}

function countOwners(stars: TerritoryEngineInput['stars']): number {
    const owners = new Set<string>();
    for (const star of stars) {
        owners.add(star.ownerId || '__unknown__');
    }
    return owners.size;
}

function hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return hash;
}

function buildInputFingerprint(
    selection: TerritoryMethodSelection,
    input: TerritoryEngineInput,
): string {
    let starHash = 0;
    for (const star of input.stars) {
        starHash ^= hashString(`${star.id}:${star.ownerId}:${Math.round(star.x)}:${Math.round(star.y)}`);
    }

    let connectionHash = 0;
    const connections = input.connections ?? [];
    for (const connection of connections) {
        connectionHash ^=
            hashString(`${connection.sourceId}:${connection.targetId}`) +
            Math.round(connection.distance ?? 0);
    }

    return [
        selectionKey(selection),
        input.stars.length,
        connections.length,
        input.worldWidth,
        input.worldHeight,
        starHash,
        connectionHash,
    ].join('|');
}

function runLegacyAdapter(adapter: TerritoryLegacyAdapterId, input: TerritoryEngineInput): void {
    if (adapter === 'legacy_pvv2') {
        renderPowerVoronoi(
            input.stars,
            input.container,
            input.colorUtils,
            input.worldWidth,
            input.worldHeight,
            input.connections,
        );
        return;
    }

    if (adapter === 'legacy_pvv3') {
        renderPVV3(
            input.stars,
            input.container,
            input.colorUtils,
            input.worldWidth,
            input.worldHeight,
            input.connections,
        );
        return;
    }

    const previousDfToggle = GAME_CONFIG.TERRITORY_DISTANCE_FIELD;
    GAME_CONFIG.TERRITORY_DISTANCE_FIELD = true;
    try {
        renderDistanceFieldTerritory(
            input.stars,
            input.container,
            input.colorUtils,
            input.worldWidth,
            input.worldHeight,
            input.connections,
            input.renderer,
        );
    } finally {
        GAME_CONFIG.TERRITORY_DISTANCE_FIELD = previousDfToggle;
    }
}

function buildConnectionAdjacency(input: TerritoryEngineInput): Record<string, string[]> {
    const adjacency: Record<string, string[]> = {};
    for (const star of input.stars) {
        adjacency[star.id] = [];
    }

    for (const connection of input.connections ?? []) {
        if (adjacency[connection.sourceId]) {
            adjacency[connection.sourceId].push(connection.targetId);
        }
        if (adjacency[connection.targetId]) {
            adjacency[connection.targetId].push(connection.sourceId);
        }
    }

    return adjacency;
}

function executeStage(
    stageId: TerritoryPipelineStageId,
    runtime: StageRuntimeContext,
): TerritoryStageTraceStep {
    const startedAtMs = Date.now();
    const implemented = runtime.selection.implementedStages.includes(stageId);
    const summary: Record<string, unknown> = {
        implemented,
        mode: runtime.selection.mode,
        staticMethodId: runtime.selection.staticMethodId,
        dynamicMethodId: runtime.selection.dynamicMethodId,
        hybridPlanId: runtime.selection.hybridPlanId,
    };

    if (executeFG2Stage(stageId, runtime, summary)) {
        return {
            stageId,
            label: `${stageId}:${implemented ? 'implemented' : 'placeholder'}`,
            startedAtMs,
            durationMs: Date.now() - startedAtMs,
            implemented,
            summary,
        };
    }

    if (stageId === 'metric') {
        const distances = (runtime.input.connections ?? []).map((connection) =>
            Number(connection.distance ?? 0),
        );
        const averageLaneDistance =
            distances.length > 0
                ? distances.reduce((sum, value) => sum + value, 0) / distances.length
                : 0;

        runtime.artifacts.metric = {
            starCount: runtime.input.stars.length,
            connectionCount: runtime.input.connections?.length ?? 0,
            ownerCount: countOwners(runtime.input.stars),
            averageLaneDistance,
        };

        summary.starCount = runtime.input.stars.length;
        summary.connectionCount = runtime.input.connections?.length ?? 0;
        summary.ownerCount = countOwners(runtime.input.stars);
    }

    if (stageId === 'world_extension') {
        runtime.artifacts.world_extension = {
            width: runtime.input.worldWidth,
            height: runtime.input.worldHeight,
            area: runtime.input.worldWidth * runtime.input.worldHeight,
        };

        summary.worldWidth = runtime.input.worldWidth;
        summary.worldHeight = runtime.input.worldHeight;
    }

    if (stageId === 'seed') {
        const starById = new Map(runtime.input.stars.map((star) => [star.id, star]));
        const laneSeeds = (runtime.input.connections ?? [])
            .map((connection) => {
                const source = starById.get(connection.sourceId);
                const target = starById.get(connection.targetId);
                if (!source || !target) return null;

                return {
                    connectionId: `${connection.sourceId}:${connection.targetId}`,
                    x: (source.x + target.x) * 0.5,
                    y: (source.y + target.y) * 0.5,
                    ownerPair: [source.ownerId, target.ownerId].sort().join('::'),
                };
            })
            .filter((value): value is NonNullable<typeof value> => value !== null);

        runtime.artifacts.seed = {
            seedCount: laneSeeds.length,
            laneSeeds,
        };

        summary.seedCount = laneSeeds.length;
    }

    if (stageId === 'topology') {
        const adjacency = buildConnectionAdjacency(runtime.input);
        const contestedConnectionCount = (runtime.input.connections ?? []).filter(
            (connection) => {
                const source = runtime.input.stars.find((star) => star.id === connection.sourceId);
                const target = runtime.input.stars.find((star) => star.id === connection.targetId);
                return Boolean(source && target && source.ownerId !== target.ownerId);
            },
        ).length;

        runtime.artifacts.topology = {
            nodeCount: runtime.input.stars.length,
            adjacency,
            contestedConnectionCount,
        };

        summary.nodeCount = runtime.input.stars.length;
        summary.contestedConnectionCount = contestedConnectionCount;
    }

    if (stageId === 'geometry') {
        const seedArtifact = runtime.artifacts.seed as
            | { laneSeeds?: Array<{ x: number; y: number; ownerPair: string }> }
            | undefined;
        const geometrySegments = (seedArtifact?.laneSeeds ?? []).map((seed) => ({
            x1: seed.x - 8,
            y1: seed.y - 8,
            x2: seed.x + 8,
            y2: seed.y + 8,
            ownerPair: seed.ownerPair,
        }));

        runtime.artifacts.geometry = {
            segmentCount: geometrySegments.length,
            segments: geometrySegments,
        };

        summary.segmentCount = geometrySegments.length;
    }

    if (stageId === 'loop') {
        const ownerLoopCounts: Record<string, number> = {};
        for (const star of runtime.input.stars) {
            const owner = star.ownerId || '__unknown__';
            ownerLoopCounts[owner] = (ownerLoopCounts[owner] ?? 0) + 1;
        }

        runtime.artifacts.loop = {
            ownerLoopCounts,
            ownerCount: Object.keys(ownerLoopCounts).length,
        };

        summary.ownerLoopCount = Object.keys(ownerLoopCounts).length;
    }

    if (stageId === 'animation') {
        runtime.artifacts.animation = {
            mode: runtime.selection.mode,
            transitionProfile: runtime.selection.dynamicMethodId,
            timestamp: runtime.input.gameNowMs,
        };

        summary.transitionProfile = runtime.selection.dynamicMethodId;
    }

    if (stageId === 'render') {
        const fallbackKey = selectionKey(runtime.selection);
        if (!adapterFallbackLogged.has(fallbackKey)) {
            adapterFallbackLogged.add(fallbackKey);
            log.renderer(
                'TerritoryEngine',
                `bootstrap adapter path mode=${runtime.selection.mode} adapter=${runtime.selection.adapter} static=${runtime.selection.staticMethodId} dynamic=${runtime.selection.dynamicMethodId} hybrid=${runtime.selection.hybridPlanId}`,
            );
        }

        runLegacyAdapter(runtime.selection.adapter, runtime.input);

        runtime.artifacts.render = {
            adapter: runtime.selection.adapter,
            renderedAt: runtime.input.gameNowMs,
        };

        summary.adapter = runtime.selection.adapter;
    }

    return {
        stageId,
        label: `${stageId}:${implemented ? 'implemented' : 'placeholder'}`,
        startedAtMs,
        durationMs: Date.now() - startedAtMs,
        implemented,
        summary,
    };
}

function buildTraceRun(
    runId: number,
    startedAtMs: number,
    startedWallMs: number,
    selection: TerritoryMethodSelection,
    steps: TerritoryStageTraceStep[],
    artifacts: TerritoryPipelineArtifacts,
    input: TerritoryEngineInput,
): TerritoryTraceRun {
    return {
        runId,
        startedAtMs,
        totalDurationMs: Date.now() - startedWallMs,
        selection,
        steps,
        meta: {
            stars: input.stars.length,
            connections: input.connections?.length ?? 0,
            adapter: selection.adapter,
            mode: selection.mode,
            artifacts: Object.keys(artifacts),
        },
    };
}

function runFullPipeline(
    input: TerritoryEngineInput,
    selection: TerritoryMethodSelection,
    traceEnabled: boolean,
): void {
    const runId = ++traceRunCounter;
    const startedAtMs = input.gameNowMs;
    const startedWallMs = Date.now();
    const artifacts: TerritoryPipelineArtifacts = {};
    const runtime: StageRuntimeContext = {
        input,
        selection,
        artifacts,
    };

    const steps: TerritoryStageTraceStep[] = [];
    for (const stageId of TERRITORY_PIPELINE_STAGE_ORDER) {
        const step = executeStage(stageId, runtime);
        if (traceEnabled) {
            steps.push(step);
        }
    }

    if (!traceEnabled) {
        return;
    }

    lastTraceRun = buildTraceRun(
        runId,
        startedAtMs,
        startedWallMs,
        selection,
        steps,
        artifacts,
        input,
    );
}

function initializeInteractiveRun(
    input: TerritoryEngineInput,
    selection: TerritoryMethodSelection,
    advanceToken: number,
): InteractiveRunState {
    return {
        fingerprint: buildInputFingerprint(selection, input),
        selectionKey: selectionKey(selection),
        runId: ++traceRunCounter,
        startedAtMs: input.gameNowMs,
        startedWallMs: Date.now(),
        steps: [],
        artifacts: {},
        nextStageIndex: 0,
        lastAdvanceToken: advanceToken,
    };
}

function publishInteractiveTrace(
    input: TerritoryEngineInput,
    selection: TerritoryMethodSelection,
    run: InteractiveRunState,
): void {
    lastTraceRun = buildTraceRun(
        run.runId,
        run.startedAtMs,
        run.startedWallMs,
        selection,
        run.steps,
        run.artifacts,
        input,
    );
}

export function getLastTerritoryTraceRun(): TerritoryTraceRun | null {
    return lastTraceRun;
}

export function resetTerritoryEngineCaches(): void {
    resetPowerVoronoiCache();
    resetPVV3Cache();
    resetDistanceFieldTerritoryCache();
    lastTraceRun = null;
    lastLoggedSelectionKey = null;
    interactiveRunState = null;
}

export function renderTerritoryEngine(input: TerritoryEngineInput): void {
    const selection = resolveMethodSelection();
    const selectionId = selectionKey(selection);
    const traceEnabled = Boolean(GAME_CONFIG.TERRITORY_ENGINE_TRACE_MODE ?? false);
    const stepModeEnabled = Boolean(GAME_CONFIG.TERRITORY_ENGINE_STEP_MODE ?? false);
    const advanceToken = normalizeAdvanceToken(
        GAME_CONFIG.TERRITORY_ENGINE_STEP_ADVANCE_TOKEN,
    );

    if (lastLoggedSelectionKey !== selectionId) {
        lastLoggedSelectionKey = selectionId;
        log.renderer(
            'TerritoryEngine',
            `active mode=${selection.mode} static=${selection.staticMethodId} dynamic=${selection.dynamicMethodId} hybrid=${selection.hybridPlanId} adapter=${selection.adapter}`,
        );
    }

    if (!stepModeEnabled) {
        interactiveRunState = null;
        runFullPipeline(input, selection, traceEnabled);
        return;
    }

    const fingerprint = buildInputFingerprint(selection, input);
    const requiresReset =
        !interactiveRunState ||
        interactiveRunState.fingerprint !== fingerprint ||
        interactiveRunState.selectionKey !== selectionId;

    if (requiresReset) {
        interactiveRunState = initializeInteractiveRun(input, selection, advanceToken);
    }

    if (!interactiveRunState) {
        return;
    }

    const runtime: StageRuntimeContext = {
        input,
        selection,
        artifacts: interactiveRunState.artifacts,
    };

    let stageExecuted = false;

    // Bootstrap by executing the first stage immediately for visibility.
    if (interactiveRunState.nextStageIndex === 0) {
        const stageId = TERRITORY_PIPELINE_STAGE_ORDER[interactiveRunState.nextStageIndex];
        const step = executeStage(stageId, runtime);
        interactiveRunState.steps.push(step);
        interactiveRunState.nextStageIndex += 1;
        stageExecuted = true;
    } else if (
        advanceToken !== interactiveRunState.lastAdvanceToken &&
        interactiveRunState.nextStageIndex < TERRITORY_PIPELINE_STAGE_ORDER.length
    ) {
        interactiveRunState.lastAdvanceToken = advanceToken;
        const stageId = TERRITORY_PIPELINE_STAGE_ORDER[interactiveRunState.nextStageIndex];
        const step = executeStage(stageId, runtime);
        interactiveRunState.steps.push(step);
        interactiveRunState.nextStageIndex += 1;
        stageExecuted = true;
    }

    if (!stageExecuted && interactiveRunState.nextStageIndex >= TERRITORY_PIPELINE_STAGE_ORDER.length) {
        interactiveRunState.lastAdvanceToken = advanceToken;
    }

    if (traceEnabled || stepModeEnabled) {
        publishInteractiveTrace(input, selection, interactiveRunState);
    }
}
