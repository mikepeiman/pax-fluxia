import {
    disablePerfCapture,
    enablePerfCapture,
    isPerfUserTimingEnabled,
    resetPerfCapture,
    setPerfUserTimingEnabled,
    snapshotPerfCapture,
} from "$lib/perf/perfProbe";
import { summarizeFramePerfAttribution } from "$lib/perf/frameAttribution";
import { buildDiagnosticBundleForInspection } from "$lib/territory/devtools/TransitionBundleSerializer";
import { transitionSnapshotRecorder } from "$lib/territory/devtools/TransitionSnapshotRecorder";
import { normalizeTerritoryRenderModeId } from "$lib/territory/ui/territoryRenderModeCatalog";
import { logFlags } from "$lib/utils/logger";

interface FrameStats {
    frameCount: number;
    avgFrameMs: number;
    medianFrameMs: number;
    p95FrameMs: number;
    p99FrameMs: number;
    minFrameMs: number;
    maxFrameMs: number;
    durationMs: number;
    startedAtMs: number;
    endedAtMs: number;
    frameBudgetMs: number;
    overBudgetCount: number;
    over20MsCount: number;
    over33MsCount: number;
    observedFps: number;
    cadenceBuckets: {
        under12Ms: number;
        under18Ms: number;
        under25Ms: number;
        under40Ms: number;
        over40Ms: number;
    };
    warmupDurationMs: number;
    warmupFrameCount: number;
    warmupMaxFrameMs: number;
    warmupOver20MsCount: number;
    slowFrames: Array<{
        index: number;
        frameMs: number;
        startAtMs: number;
        endAtMs: number;
        perfAttribution: ReturnType<typeof summarizeFramePerfAttribution>;
    }>;
}

interface BenchmarkOrderPointerPath {
    sourceId: string;
    targetId: string;
    sourceClientX: number;
    sourceClientY: number;
    targetClientX: number;
    targetClientY: number;
}

interface BenchmarkStarClientPoint {
    starId: string;
    clientX: number;
    clientY: number;
    localX?: number;
    localY?: number;
    worldX?: number;
    worldY?: number;
    hitStarId?: string | null;
    hitMatches?: boolean;
}

interface BenchmarkCanvasApi {
    getBenchmarkOrderPointerPath?: () => BenchmarkOrderPointerPath | null;
    getBenchmarkStarClientPoint?: (
        starId: string,
    ) => BenchmarkStarClientPoint | null;
    resetBenchmarkInteractionState?: () => Record<string, unknown> | null;
    getBenchmarkTerritorySchedulerSnapshot?: () => Record<string, unknown> | null;
    getTransitionDiagnosticCaptureState?: () => Record<string, unknown> | null;
    resetTransitionDiagnosticCapture?: () => void;
}

type RuntimeDeps = {
    GAME_CONFIG: typeof import("$lib/config/game.config").GAME_CONFIG;
    activeGameStore: typeof import("$lib/stores/activeGameStore.svelte").activeGameStore;
    gameStore: typeof import("$lib/stores/gameStore.svelte").gameStore;
};

interface BenchmarkBridgeApi {
    openGameShell: () => Promise<void>;
    enablePerfCapture: () => void;
    disablePerfCapture: () => void;
    setPerfUserTimingEnabled: (enabled: boolean) => void;
    isPerfUserTimingEnabled: () => boolean;
    resetPerfCapture: () => void;
    snapshotPerfCapture: () => ReturnType<typeof snapshotPerfCapture>;
    getPerfEventCursor: () => number;
    getPerfEventsSince: (
        sinceIndex: number,
        limit?: number,
    ) => Array<Record<string, unknown>>;
    findPerfEventSince: (
        sinceIndex: number,
        name: string,
        detailMatchers?: Record<string, unknown>,
    ) => Record<string, unknown> | null;
    setLogFlags: (flags: Partial<typeof logFlags>) => void;
    getLogFlags: () => Record<string, boolean>;
    restartSinglePlayerGame: () => Promise<void>;
    loadMapDefinition: (mapDefinition: Record<string, unknown>) => Promise<boolean>;
    loadSavedMapByName: (mapName: string) => Promise<boolean>;
    listSavedMaps: () => Promise<
        Array<{
            name: string;
            starCount: number;
            laneCount: number;
            runtimeConnectionCount: number;
            builtIn: boolean;
        }>
    >;
    waitForSavedMaps: (
        minCount?: number,
        timeoutMs?: number,
    ) => Promise<Record<string, unknown>>;
    beginGameplay: (
        timeoutMs?: number,
        minimumTickAdvance?: number,
    ) => Promise<Record<string, unknown>>;
    pauseGameplay: () => Promise<void>;
    getStateSummary: () => Promise<Record<string, unknown>>;
    waitForGameplayStart: (
        timeoutMs?: number,
        minimumTickAdvance?: number,
    ) => Promise<Record<string, unknown>>;
    resolveSampleOrder: () => Promise<Record<string, unknown> | null>;
    prepareConquestDiagnosticOrder: () => Promise<Record<string, unknown> | null>;
    issueSampleOrder: () => Promise<Record<string, unknown> | null>;
    cancelSampleOrder: () => Promise<Record<string, unknown> | null>;
    issueOrderDirect: (
        sourceId: string,
        targetId: string,
        persistAfterConquest?: boolean,
    ) => Promise<boolean>;
    cancelOrderDirect: (starId: string) => Promise<void>;
    collectFrameStats: (durationMs?: number, warmupMs?: number) => Promise<FrameStats>;
    setTerritoryMode: (mode: string) => Promise<string>;
    waitForRenderMode: (
        mode: string,
        timeoutMs?: number,
    ) => Promise<Record<string, unknown>>;
    ensureTerritoryMode: (
        mode: string,
    ) => Promise<Record<string, unknown>>;
    getOrderPointerPath: () => Promise<BenchmarkOrderPointerPath | null>;
    getStarClientPoint: (
        starId: string,
    ) => Promise<BenchmarkStarClientPoint | null>;
    resetInteractionState: () => Promise<Record<string, unknown> | null>;
    getStarState: (starId: string) => Promise<Record<string, unknown> | null>;
    getOrderStatus: (sourceId: string) => Promise<Record<string, unknown> | null>;
    getTerritorySchedulerSnapshot: () => Promise<Record<string, unknown> | null>;
    setTransitionRecorderEnabled: (enabled: boolean) => Promise<boolean>;
    clearTransitionRecorderBundles: () => Promise<void>;
    getTransitionRecorderSummary: () => Promise<Record<string, unknown>>;
    getTransitionDiagnosticCaptureState: () => Promise<Record<string, unknown> | null>;
    getLatestTransitionDiagnosticBundle: () => Promise<Record<string, unknown> | null>;
    waitForTransitionBundle: (
        previousCount: number,
        timeoutMs?: number,
    ) => Promise<Record<string, unknown>>;
}

declare global {
    interface Window {
        __PAX_BENCH__?: BenchmarkBridgeApi;
        __PAX_GAME_CANVAS__?: BenchmarkCanvasApi | null;
    }
}

let runtimeDepsPromise: Promise<RuntimeDeps> | null = null;

async function loadRuntimeDeps(): Promise<RuntimeDeps> {
    if (!runtimeDepsPromise) {
        runtimeDepsPromise = Promise.all([
            import("$lib/config/game.config"),
            import("$lib/stores/activeGameStore.svelte"),
            import("$lib/stores/gameStore.svelte"),
        ]).then(([configModule, activeStoreModule, gameStoreModule]) => ({
            GAME_CONFIG: configModule.GAME_CONFIG,
            activeGameStore: activeStoreModule.activeGameStore,
            gameStore: gameStoreModule.gameStore,
        }));
    }
    return await runtimeDepsPromise;
}

function sampleQuantile(values: readonly number[], quantile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.round((sorted.length - 1) * quantile)),
    );
    return sorted[index] ?? 0;
}

function nextAnimationFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeTransitionRecorder(): Record<string, unknown> {
    const bundles = transitionSnapshotRecorder.getBundles();
    const latest = bundles[bundles.length - 1] ?? null;
    const canvasApi = window.__PAX_GAME_CANVAS__ ?? null;
    return {
        enabled: transitionSnapshotRecorder.isEnabled(),
        bundleCount: bundles.length,
        latestBundleId: latest?.id ?? null,
        latestTransitionId: latest?.meta.transitionId ?? null,
        latestTimestamp: latest?.timestamp ?? null,
        latestFrameCount: latest?.transitionFrames?.length ?? 0,
        latestConquestCount: latest?.conquestEvents.length ?? 0,
        captureState:
            canvasApi?.getTransitionDiagnosticCaptureState?.() ?? null,
    };
}

async function settleAfterShellOpen(): Promise<void> {
    await nextAnimationFrame();
    await nextAnimationFrame();
}

async function settleFrames(count = 3): Promise<void> {
    for (let i = 0; i < count; i += 1) {
        await nextAnimationFrame();
    }
}

async function getStateSummary(): Promise<Record<string, unknown>> {
    const { GAME_CONFIG, activeGameStore, gameStore } = await loadRuntimeDeps();
    const stars = activeGameStore.stars ?? [];
    const connections = activeGameStore.connections ?? [];
    const players = activeGameStore.players ?? [];
    const ownerStarCounts: Record<string, number> = {};
    for (const star of stars) {
        const ownerId = star.ownerId ?? "__unowned__";
        ownerStarCounts[ownerId] = (ownerStarCounts[ownerId] ?? 0) + 1;
    }
    return {
        phase: activeGameStore.phase,
        currentView: gameStore.currentView,
        hasStarted: gameStore.hasStarted,
        paused: activeGameStore.isPaused,
        localPlayerId: activeGameStore.localPlayerId,
        tick: activeGameStore.currentTick,
        stars: stars.length,
        connections: connections.length,
        players: players.length,
        playerIds: players.map((player: { id?: string | null }) => player.id ?? null),
        ownerStarCounts,
        renderMode: GAME_CONFIG.TERRITORY_RENDER_MODE,
        tickDiagnostics:
            typeof gameStore.getTickDiagnostics === "function"
                ? gameStore.getTickDiagnostics()
                : null,
    };
}

async function findSampleOrder(): Promise<{
    sourceId: string;
    targetId: string;
} | null> {
    const { activeGameStore } = await loadRuntimeDeps();
    const localPlayerId = activeGameStore.localPlayerId;
    if (!localPlayerId) return null;

    const stars = activeGameStore.stars ?? [];
    const connections = activeGameStore.connections ?? [];
    const starsById = new Map(stars.map((star) => [star.id, star]));

    const getOtherEndpoint = (
        sourceId: string,
        connection: { sourceId: string; targetId: string },
    ): string | null => {
        if (connection.sourceId === sourceId) return connection.targetId;
        if (connection.targetId === sourceId) return connection.sourceId;
        return null;
    };

    for (const source of stars) {
        if (source.ownerId !== localPlayerId) continue;
        for (const connection of connections) {
            const targetId = getOtherEndpoint(source.id, connection);
            if (!targetId) continue;
            const target = starsById.get(targetId);
            if (!target || target.ownerId === localPlayerId) continue;
            if (!activeGameStore.canIssueOrder(source.id, target.id)) continue;
            return { sourceId: source.id, targetId: target.id };
        }
    }

    return null;
}

async function prepareConquestDiagnosticOrder(): Promise<{
    sourceId: string;
    targetId: string;
    sourceBeforeActiveShips: number;
    sourceBeforeDamagedShips: number;
    targetBeforeActiveShips: number;
    targetBeforeDamagedShips: number;
    preparedSourceActiveShips: number;
    preparedTargetActiveShips: number;
    preparedTargetDamagedShips: number;
} | null> {
    const { activeGameStore, gameStore } = await loadRuntimeDeps();
    const order = await findSampleOrder();
    if (!order) return null;

    const stars = activeGameStore.stars ?? [];
    const source = stars.find((star) => star.id === order.sourceId);
    const target = stars.find((star) => star.id === order.targetId);
    if (!source || !target) return null;

    const preparedSourceActiveShips = Math.max(
        240,
        source.activeShips ?? 0,
        (target.activeShips ?? 0) * 240,
    );
    gameStore.debugSetStarForce(order.sourceId, preparedSourceActiveShips, 0);
    gameStore.debugSetStarForce(order.targetId, 0, 0);
    await settleFrames(2);

    return {
        sourceId: order.sourceId,
        targetId: order.targetId,
        sourceBeforeActiveShips: source.activeShips ?? 0,
        sourceBeforeDamagedShips: source.damagedShips ?? 0,
        targetBeforeActiveShips: target.activeShips ?? 0,
        targetBeforeDamagedShips: target.damagedShips ?? 0,
        preparedSourceActiveShips,
        preparedTargetActiveShips: 0,
        preparedTargetDamagedShips: 0,
    };
}

async function collectFrameStats(
    durationMs = 2000,
    warmupMs = 0,
): Promise<FrameStats> {
    const samples: Array<{
        index: number;
        frameMs: number;
        startAtMs: number;
        endAtMs: number;
    }> = [];
    const startedAt = performance.now();
    let previousFrameAt = startedAt;
    const frameBudgetMs = 1000 / 60;
    const warmupDeadlineAt = startedAt + Math.max(0, warmupMs);
    const measuredDeadlineAt = warmupDeadlineAt + Math.max(0, durationMs);

    return await new Promise<FrameStats>((resolve) => {
        const step = (now: number) => {
            samples.push({
                index: samples.length,
                frameMs: now - previousFrameAt,
                startAtMs: previousFrameAt,
                endAtMs: now,
            });
            previousFrameAt = now;
            if (now < measuredDeadlineAt) {
                requestAnimationFrame(step);
                return;
            }

            const postFirstSample = samples.slice(1);
            const warmupSamples = postFirstSample.filter(
                (sample) => sample.endAtMs <= warmupDeadlineAt,
            );
            const measured = postFirstSample.filter(
                (sample) => sample.endAtMs > warmupDeadlineAt,
            );
            const frameDurations = measured.map((sample) => sample.frameMs);
            const total = frameDurations.reduce((sum, value) => sum + value, 0);
            const measuredStartedAtMs =
                measured[0]?.startAtMs ?? warmupDeadlineAt;
            const perfEvents = snapshotPerfCapture()?.events ?? [];
            resolve({
                frameCount: measured.length,
                avgFrameMs: measured.length > 0 ? total / measured.length : 0,
                medianFrameMs: sampleQuantile(frameDurations, 0.5),
                p95FrameMs: sampleQuantile(frameDurations, 0.95),
                p99FrameMs: sampleQuantile(frameDurations, 0.99),
                minFrameMs:
                    frameDurations.length > 0 ? Math.min(...frameDurations) : 0,
                maxFrameMs:
                    frameDurations.length > 0 ? Math.max(...frameDurations) : 0,
                durationMs: previousFrameAt - measuredStartedAtMs,
                startedAtMs: measuredStartedAtMs,
                endedAtMs: previousFrameAt,
                frameBudgetMs,
                overBudgetCount: measured.filter(
                    (sample) => sample.frameMs > frameBudgetMs,
                ).length,
                over20MsCount: measured.filter((sample) => sample.frameMs > 20).length,
                over33MsCount: measured.filter((sample) => sample.frameMs > 33).length,
                observedFps:
                    total > 0 && measured.length > 0
                        ? (measured.length * 1000) / total
                        : 0,
                cadenceBuckets: {
                    under12Ms: measured.filter((sample) => sample.frameMs < 12).length,
                    under18Ms: measured.filter(
                        (sample) => sample.frameMs >= 12 && sample.frameMs < 18,
                    ).length,
                    under25Ms: measured.filter(
                        (sample) => sample.frameMs >= 18 && sample.frameMs < 25,
                    ).length,
                    under40Ms: measured.filter(
                        (sample) => sample.frameMs >= 25 && sample.frameMs < 40,
                    ).length,
                    over40Ms: measured.filter((sample) => sample.frameMs >= 40).length,
                },
                warmupDurationMs: Math.max(0, measuredStartedAtMs - startedAt),
                warmupFrameCount: warmupSamples.length,
                warmupMaxFrameMs:
                    warmupSamples.length > 0
                        ? Math.max(...warmupSamples.map((sample) => sample.frameMs))
                        : 0,
                warmupOver20MsCount: warmupSamples.filter(
                    (sample) => sample.frameMs > 20,
                ).length,
                slowFrames: [...measured]
                    .sort((a, b) => b.frameMs - a.frameMs)
                    .slice(0, 10)
                    .map((sample) => ({
                        index: measured.indexOf(sample),
                        frameMs: Number(sample.frameMs.toFixed(3)),
                        startAtMs: Number(sample.startAtMs.toFixed(3)),
                        endAtMs: Number(sample.endAtMs.toFixed(3)),
                        perfAttribution: summarizeFramePerfAttribution(
                            perfEvents,
                            sample,
                        ),
                    })),
            });
        };

        requestAnimationFrame(step);
    });
}

async function waitForRenderMode(
    mode: string,
    timeoutMs = 5000,
): Promise<Record<string, unknown>> {
    const expectedMode = String(normalizeTerritoryRenderModeId(mode));
    const deadline = performance.now() + timeoutMs;
    let attempts = 0;
    let state = await getStateSummary();
    while (performance.now() < deadline) {
        if (state.renderMode === expectedMode) {
            return { matches: true, attempts, state, expectedMode };
        }
        attempts += 1;
        await settleFrames(2);
        await waitMs(40);
        state = await getStateSummary();
    }
    return { matches: state.renderMode === expectedMode, attempts, state, expectedMode };
}

export function installBenchmarkBridge(params: {
    openGameShell: () => void | Promise<void>;
    ensureGameShellLoaded?: () => Promise<void>;
    getCanvasApi?: () => BenchmarkCanvasApi | null;
}): () => void {
    if (typeof window === "undefined") return () => {};

    const openGameShell = async (): Promise<void> => {
        await params.openGameShell();
        if (params.ensureGameShellLoaded) {
            await params.ensureGameShellLoaded();
        }
        await settleAfterShellOpen();
    };

    const waitForSavedMaps = async (
        minCount = 1,
        timeoutMs = 8_000,
    ): Promise<Record<string, unknown>> => {
        await openGameShell();
        const startedAt = performance.now();
        let count = 0;
        while (performance.now() - startedAt < timeoutMs) {
            const { gameStore } = await loadRuntimeDeps();
            count = gameStore.savedMaps.length;
            if (count >= minCount) {
                return {
                    ready: true,
                    count,
                    minCount,
                    elapsedMs: performance.now() - startedAt,
                };
            }
            await waitMs(100);
        }

        const { gameStore } = await loadRuntimeDeps();
        count = gameStore.savedMaps.length;
        return {
            ready: count >= minCount,
            count,
            minCount,
            elapsedMs: performance.now() - startedAt,
        };
    };

    const waitForGameplayStart = async (
        timeoutMs = 6_000,
        minimumTickAdvance = 1,
    ): Promise<Record<string, unknown>> => {
        await openGameShell();
        const initialState = await getStateSummary();
        const initialTick = Number(initialState.tick ?? 0);
        const requiredTick = initialTick + Math.max(0, minimumTickAdvance);
        const startedAt = performance.now();
        let attempts = 0;
        let state = initialState;

        while (performance.now() - startedAt < timeoutMs) {
            const phase = String(state.phase ?? "");
            const currentView = String(state.currentView ?? "");
            const hasStarted = state.hasStarted === true;
            const paused = state.paused === true;
            const tick = Number(state.tick ?? 0);
            const tickAdvanced = tick >= requiredTick;
            if (
                phase === "playing" &&
                currentView === "game" &&
                hasStarted &&
                !paused &&
                tickAdvanced
            ) {
                return {
                    started: true,
                    attempts,
                    elapsedMs: performance.now() - startedAt,
                    initialTick,
                    requiredTick,
                    state,
                };
            }
            attempts += 1;
            await settleFrames(2);
            await waitMs(40);
            state = await getStateSummary();
        }

        return {
            started: false,
            attempts,
            elapsedMs: performance.now() - startedAt,
            initialTick,
            requiredTick,
            state,
        };
    };

    window.__PAX_BENCH__ = {
        openGameShell,
        enablePerfCapture,
        disablePerfCapture,
        setPerfUserTimingEnabled,
        isPerfUserTimingEnabled,
        resetPerfCapture,
        snapshotPerfCapture,
        getPerfEventCursor: () =>
            globalThis.__PAX_PERF_STATE__?.events.length ?? 0,
        getPerfEventsSince: (sinceIndex, limit = 200) => {
            const events = globalThis.__PAX_PERF_STATE__?.events ?? [];
            return events
                .slice(Math.max(0, sinceIndex), Math.max(0, sinceIndex) + limit)
                .map((event) => ({
                    ...event,
                }));
        },
        findPerfEventSince: (sinceIndex, name, detailMatchers = {}) => {
            const events = globalThis.__PAX_PERF_STATE__?.events ?? [];
            outer: for (
                let index = Math.max(0, sinceIndex);
                index < events.length;
                index += 1
            ) {
                const event = events[index];
                if (event.name !== name) continue;
                for (const [key, expected] of Object.entries(detailMatchers)) {
                    const actual = (event.detail as Record<string, unknown> | undefined)?.[key];
                    if (actual !== expected) {
                        continue outer;
                    }
                }
                return {
                    index,
                    ...event,
                };
            }
            return null;
        },
        setLogFlags: (flags) => {
            for (const [key, value] of Object.entries(flags)) {
                if (key in logFlags && typeof value === "boolean") {
                    (logFlags as Record<string, boolean>)[key] = value;
                }
            }
        },
        getLogFlags: () => ({ ...(logFlags as Record<string, boolean>) }),
        restartSinglePlayerGame: async () => {
            await openGameShell();
            const { gameStore } = await loadRuntimeDeps();
            await gameStore.restart();
            await settleAfterShellOpen();
        },
        loadMapDefinition: async (mapDefinition) => {
            await openGameShell();
            if (
                !mapDefinition ||
                !Array.isArray(mapDefinition.stars) ||
                !Array.isArray(mapDefinition.connections)
            ) {
                return false;
            }
            const { gameStore } = await loadRuntimeDeps();
            gameStore.loadSavedMap(mapDefinition as never);
            await gameStore.startGame();
            await settleAfterShellOpen();
            return true;
        },
        loadSavedMapByName: async (mapName) => {
            await openGameShell();
            await waitForSavedMaps(1, 8_000);
            const { gameStore } = await loadRuntimeDeps();
            const savedMap = gameStore.savedMaps.find(
                (entry: { metadata?: { name?: string | null } }) =>
                    entry.metadata?.name === mapName,
            );
            if (!savedMap) {
                return false;
            }
            gameStore.loadSavedMap(savedMap);
            await gameStore.startGame();
            await settleAfterShellOpen();
            return true;
        },
        listSavedMaps: async () => {
            await openGameShell();
            await waitForSavedMaps(1, 8_000);
            const { gameStore } = await loadRuntimeDeps();
            return [...gameStore.savedMaps]
                .map((map: {
                    metadata?: { name?: string | null };
                    stars?: unknown[];
                    connections?: unknown[];
                    builtIn?: boolean;
                }) => ({
                    name: map.metadata?.name ?? 'unnamed',
                    starCount: Array.isArray(map.stars) ? map.stars.length : 0,
                    laneCount: Array.isArray(map.connections)
                        ? map.connections.length
                        : 0,
                    runtimeConnectionCount: Array.isArray(map.connections)
                        ? map.connections.length * 2
                        : 0,
                    builtIn: Boolean(map.builtIn),
                }))
                .sort(
                    (left, right) =>
                        right.starCount - left.starCount ||
                        right.laneCount - left.laneCount ||
                        right.runtimeConnectionCount - left.runtimeConnectionCount ||
                        left.name.localeCompare(right.name),
                );
        },
        waitForSavedMaps,
        beginGameplay: async (timeoutMs = 6_000, minimumTickAdvance = 1) => {
            await openGameShell();
            const { activeGameStore } = await loadRuntimeDeps();
            activeGameStore.startGame();
            return await waitForGameplayStart(timeoutMs, minimumTickAdvance);
        },
        pauseGameplay: async () => {
            const { activeGameStore } = await loadRuntimeDeps();
            activeGameStore.pauseGame();
            await settleAfterShellOpen();
        },
        getStateSummary,
        waitForGameplayStart,
        resolveSampleOrder: async () => {
            return await findSampleOrder();
        },
        prepareConquestDiagnosticOrder: async () => {
            return await prepareConquestDiagnosticOrder();
        },
        issueSampleOrder: async () => {
            const { activeGameStore } = await loadRuntimeDeps();
            const order = await findSampleOrder();
            if (!order) return null;
            if (!activeGameStore.canIssueOrder(order.sourceId, order.targetId)) {
                return null;
            }
            activeGameStore.issueOrder(order.sourceId, order.targetId, false);
            return order;
        },
        cancelSampleOrder: async () => {
            const { activeGameStore } = await loadRuntimeDeps();
            const order = await findSampleOrder();
            if (!order) return null;
            activeGameStore.cancelOrder(order.sourceId);
            return { starId: order.sourceId };
        },
        issueOrderDirect: async (
            sourceId,
            targetId,
            persistAfterConquest = false,
        ) => {
            const { activeGameStore } = await loadRuntimeDeps();
            if (!activeGameStore.canIssueOrder(sourceId, targetId)) {
                return false;
            }
            activeGameStore.issueOrder(
                sourceId,
                targetId,
                persistAfterConquest,
            );
            return true;
        },
        cancelOrderDirect: async (starId) => {
            const { activeGameStore } = await loadRuntimeDeps();
            activeGameStore.cancelOrder(starId);
        },
        collectFrameStats,
        setTerritoryMode: async (mode) => {
            const { GAME_CONFIG } = await loadRuntimeDeps();
            const expectedMode = String(normalizeTerritoryRenderModeId(mode));
            GAME_CONFIG.TERRITORY_RENDER_MODE = expectedMode as never;
            await settleFrames();
            return GAME_CONFIG.TERRITORY_RENDER_MODE;
        },
        waitForRenderMode,
        ensureTerritoryMode: async (mode) => {
            const expectedMode = String(normalizeTerritoryRenderModeId(mode));
            const actualMode = await window.__PAX_BENCH__!.setTerritoryMode(mode);
            const waitResult = await waitForRenderMode(mode);
            const state = (waitResult.state as Record<string, unknown>) ?? (await getStateSummary());
            return {
                requestedMode: mode,
                expectedMode,
                actualMode,
                state,
                matches:
                    waitResult.matches === true && state.renderMode === expectedMode,
                attempts: waitResult.attempts ?? 0,
            };
        },
        getOrderPointerPath: async () => {
            await openGameShell();
            await settleFrames();
            const canvasApi =
                params.getCanvasApi?.() ?? window.__PAX_GAME_CANVAS__ ?? null;
            return canvasApi?.getBenchmarkOrderPointerPath?.() ?? null;
        },
        getStarClientPoint: async (starId) => {
            await openGameShell();
            await settleFrames();
            const canvasApi =
                params.getCanvasApi?.() ?? window.__PAX_GAME_CANVAS__ ?? null;
            return canvasApi?.getBenchmarkStarClientPoint?.(starId) ?? null;
        },
        resetInteractionState: async () => {
            await openGameShell();
            await settleFrames();
            const canvasApi =
                params.getCanvasApi?.() ?? window.__PAX_GAME_CANVAS__ ?? null;
            return canvasApi?.resetBenchmarkInteractionState?.() ?? null;
        },
        getStarState: async (starId) => {
            const { activeGameStore } = await loadRuntimeDeps();
            const star = (activeGameStore.stars ?? []).find(
                (entry: { id: string }) => entry.id === starId,
            );
            if (!star) return null;
            return {
                id: star.id,
                ownerId: star.ownerId ?? null,
                activeShips: star.activeShips ?? 0,
                damagedShips: star.damagedShips ?? 0,
                targetId: star.targetId ?? null,
                queuedOrderTargetId: star.queuedOrderTargetId ?? null,
                starType: star.starType ?? null,
                productionRate: star.productionRate ?? null,
                repairRate: star.repairRate ?? null,
                transferRate: star.transferRate ?? null,
            };
        },
        getOrderStatus: async (sourceId) => {
            const { activeGameStore } = await loadRuntimeDeps();
            const star = (activeGameStore.stars ?? []).find(
                (entry: { id: string }) => entry.id === sourceId,
            );
            if (!star) return null;
            return {
                sourceId,
                targetId: star.targetId ?? null,
                queuedOrderTargetId: star.queuedOrderTargetId ?? null,
                ownerId: star.ownerId ?? null,
                tick: activeGameStore.currentTick,
            };
        },
        getTerritorySchedulerSnapshot: async () => {
            const canvasApi =
                params.getCanvasApi?.() ?? window.__PAX_GAME_CANVAS__ ?? null;
            return canvasApi?.getBenchmarkTerritorySchedulerSnapshot?.() ?? null;
        },
        setTransitionRecorderEnabled: async (enabled) => {
            transitionSnapshotRecorder.setEnabled(enabled);
            const canvasApi =
                params.getCanvasApi?.() ?? window.__PAX_GAME_CANVAS__ ?? null;
            canvasApi?.resetTransitionDiagnosticCapture?.();
            return transitionSnapshotRecorder.isEnabled();
        },
        clearTransitionRecorderBundles: async () => {
            transitionSnapshotRecorder.clear();
            const canvasApi =
                params.getCanvasApi?.() ?? window.__PAX_GAME_CANVAS__ ?? null;
            canvasApi?.resetTransitionDiagnosticCapture?.();
        },
        getTransitionRecorderSummary: async () => {
            return summarizeTransitionRecorder();
        },
        getTransitionDiagnosticCaptureState: async () => {
            const canvasApi =
                params.getCanvasApi?.() ?? window.__PAX_GAME_CANVAS__ ?? null;
            return canvasApi?.getTransitionDiagnosticCaptureState?.() ?? null;
        },
        getLatestTransitionDiagnosticBundle: async () => {
            const bundles = transitionSnapshotRecorder.getBundles();
            const latest = bundles[bundles.length - 1] ?? null;
            if (!latest) return null;
            return buildDiagnosticBundleForInspection(latest);
        },
        waitForTransitionBundle: async (previousCount, timeoutMs = 12000) => {
            const deadline = performance.now() + timeoutMs;
            while (performance.now() < deadline) {
                const summary = summarizeTransitionRecorder();
                if (Number(summary.bundleCount ?? 0) > previousCount) {
                    return {
                        matched: true,
                        ...summary,
                    };
                }
                await waitMs(32);
            }
            return {
                matched: false,
                ...summarizeTransitionRecorder(),
            };
        },
    };

    return () => {
        if (window.__PAX_BENCH__) {
            delete window.__PAX_BENCH__;
        }
    };
}
