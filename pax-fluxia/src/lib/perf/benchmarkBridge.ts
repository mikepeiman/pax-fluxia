import {
    disablePerfCapture,
    enablePerfCapture,
    resetPerfCapture,
    snapshotPerfCapture,
} from "$lib/perf/perfProbe";
import { logFlags } from "$lib/utils/logger";

interface FrameStats {
    frameCount: number;
    avgFrameMs: number;
    p95FrameMs: number;
    maxFrameMs: number;
    durationMs: number;
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
}

interface BenchmarkCanvasApi {
    getBenchmarkOrderPointerPath?: () => BenchmarkOrderPointerPath | null;
    getBenchmarkStarClientPoint?: (
        starId: string,
    ) => BenchmarkStarClientPoint | null;
    getBenchmarkTerritorySchedulerSnapshot?: () => Record<string, unknown> | null;
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
    loadSavedMapByName: (mapName: string) => Promise<boolean>;
    listSavedMaps: () => Promise<
        Array<{
            name: string;
            starCount: number;
            connectionCount: number;
            builtIn: boolean;
        }>
    >;
    beginGameplay: () => Promise<void>;
    pauseGameplay: () => Promise<void>;
    getStateSummary: () => Promise<Record<string, unknown>>;
    resolveSampleOrder: () => Promise<Record<string, unknown> | null>;
    issueSampleOrder: () => Promise<Record<string, unknown> | null>;
    cancelSampleOrder: () => Promise<Record<string, unknown> | null>;
    issueOrderDirect: (
        sourceId: string,
        targetId: string,
        persistAfterConquest?: boolean,
    ) => Promise<boolean>;
    cancelOrderDirect: (starId: string) => Promise<void>;
    collectFrameStats: (durationMs?: number) => Promise<FrameStats>;
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
    getOrderStatus: (sourceId: string) => Promise<Record<string, unknown> | null>;
    getTerritorySchedulerSnapshot: () => Promise<Record<string, unknown> | null>;
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

async function collectFrameStats(durationMs = 2000): Promise<FrameStats> {
    const samples: number[] = [];
    const startedAt = performance.now();
    let previousFrameAt = startedAt;

    return await new Promise<FrameStats>((resolve) => {
        const step = (now: number) => {
            samples.push(now - previousFrameAt);
            previousFrameAt = now;
            if (now - startedAt < durationMs) {
                requestAnimationFrame(step);
                return;
            }

            const measured = samples.slice(1);
            const total = measured.reduce((sum, value) => sum + value, 0);
            resolve({
                frameCount: measured.length,
                avgFrameMs: measured.length > 0 ? total / measured.length : 0,
                p95FrameMs: sampleQuantile(measured, 0.95),
                maxFrameMs: measured.length > 0 ? Math.max(...measured) : 0,
                durationMs: performance.now() - startedAt,
            });
        };

        requestAnimationFrame(step);
    });
}

async function waitForRenderMode(
    mode: string,
    timeoutMs = 5000,
): Promise<Record<string, unknown>> {
    const deadline = performance.now() + timeoutMs;
    let attempts = 0;
    let state = await getStateSummary();
    while (performance.now() < deadline) {
        if (state.renderMode === mode) {
            return { matches: true, attempts, state };
        }
        attempts += 1;
        await settleFrames(2);
        await waitMs(40);
        state = await getStateSummary();
    }
    return { matches: state.renderMode === mode, attempts, state };
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

    window.__PAX_BENCH__ = {
        openGameShell,
        enablePerfCapture,
        disablePerfCapture,
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
        loadSavedMapByName: async (mapName) => {
            await openGameShell();
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
                    connectionCount: Array.isArray(map.connections)
                        ? map.connections.length
                        : 0,
                    builtIn: Boolean(map.builtIn),
                }))
                .sort(
                    (left, right) =>
                        right.starCount - left.starCount ||
                        right.connectionCount - left.connectionCount ||
                        left.name.localeCompare(right.name),
                );
        },
        beginGameplay: async () => {
            await openGameShell();
            const { activeGameStore } = await loadRuntimeDeps();
            activeGameStore.startGame();
            await settleAfterShellOpen();
        },
        pauseGameplay: async () => {
            const { activeGameStore } = await loadRuntimeDeps();
            activeGameStore.pauseGame();
            await settleAfterShellOpen();
        },
        getStateSummary,
        resolveSampleOrder: async () => {
            return await findSampleOrder();
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
            GAME_CONFIG.TERRITORY_RENDER_MODE = mode as never;
            await settleFrames();
            return GAME_CONFIG.TERRITORY_RENDER_MODE;
        },
        waitForRenderMode,
        ensureTerritoryMode: async (mode) => {
            const actualMode = await window.__PAX_BENCH__!.setTerritoryMode(mode);
            const waitResult = await waitForRenderMode(mode);
            const state = (waitResult.state as Record<string, unknown>) ?? (await getStateSummary());
            return {
                requestedMode: mode,
                actualMode,
                state,
                matches: waitResult.matches === true && state.renderMode === mode,
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
    };

    return () => {
        if (window.__PAX_BENCH__) {
            delete window.__PAX_BENCH__;
        }
    };
}
