import { GAME_CONFIG } from "$lib/config/game.config";
import conquestFixtureMap from "../../../../common/resources/fixture-maps/metaball_conquest_lane_push.json";

export type InAppConquestBenchmarkMode =
    | "cell_grid"
    | "phase_field"
    | "grid_gradient"
    | "distance_field"
    | "vs_pvv3"
    | "pixel";

export interface InAppConquestBenchmarkSummary {
    scenarioId: "conquest_animation" | "conquest_diagnostic";
    mode: InAppConquestBenchmarkMode;
    effectiveTransitionMs: number;
    targetFrames60fps: number;
    minimumFrames30fps: number;
    captureDurationMs: number;
    frameStats: Record<string, unknown>;
    sampleOrder: Record<string, unknown> | null;
    stateBefore: Record<string, unknown>;
    stateAfter: Record<string, unknown>;
    recorderSummary: Record<string, unknown>;
    bundleSummary?: Record<string, unknown> | null;
}

export const IN_APP_CONQUEST_BENCHMARK_MODES: Array<{
    id: InAppConquestBenchmarkMode;
    label: string;
}> = [
    { id: "cell_grid", label: "Metaball Grid" },
    { id: "phase_field", label: "Metaball Grid Phase Field" },
    { id: "grid_gradient", label: "Grid Gradient" },
    { id: "distance_field", label: "Distance Field" },
    { id: "vs_pvv3", label: "VS PVV3" },
    { id: "pixel", label: "Pixel" },
];

const TARGET_FRAME_MS_60FPS = 1000 / 60;
const MAX_FRAME_MS_30FPS = 1000 / 30;
const MIN_CAPTURE_DURATION_MS = 1600;
const CAPTURE_PADDING_MS = 250;
const DIAGNOSTIC_BUNDLE_TIMEOUT_MS = 12000;

function waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBenchmarkBridge(): NonNullable<Window["__PAX_BENCH__"]> {
    const bridge = window.__PAX_BENCH__;
    if (!bridge) {
        throw new Error(
            "Benchmark bridge is unavailable. Open the app in the dev shell so the perf bridge can attach.",
        );
    }
    return bridge;
}

export function resolveConquestTransitionTargets(): {
    effectiveTransitionMs: number;
    targetFrames60fps: number;
    minimumFrames30fps: number;
    captureDurationMs: number;
} {
    const tickMs = Math.max(1, Number(GAME_CONFIG.BASE_TICK_MS ?? 1500));
    const configuredTransitionMs = Math.max(
        1,
        Number(GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 400),
    );
    const effectiveTransitionMs = GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK
        ? tickMs
        : configuredTransitionMs;
    return {
        effectiveTransitionMs,
        targetFrames60fps: Math.max(
            1,
            Math.ceil(effectiveTransitionMs / TARGET_FRAME_MS_60FPS),
        ),
        minimumFrames30fps: Math.max(
            1,
            Math.ceil(effectiveTransitionMs / MAX_FRAME_MS_30FPS),
        ),
        captureDurationMs: Math.max(
            MIN_CAPTURE_DURATION_MS,
            Math.ceil(effectiveTransitionMs + CAPTURE_PADDING_MS),
        ),
    };
}

async function prepareScenario(
    mode: InAppConquestBenchmarkMode,
): Promise<{
    bridge: NonNullable<Window["__PAX_BENCH__"]>;
    stateBefore: Record<string, unknown>;
    sampleOrder: Record<string, unknown>;
    captureDurationMs: number;
    effectiveTransitionMs: number;
    targetFrames60fps: number;
    minimumFrames30fps: number;
}> {
    const bridge = getBenchmarkBridge();
    await bridge.openGameShell();
    await waitMs(80);
    bridge.resetPerfCapture();
    const loaded = await bridge.loadMapDefinition(
        conquestFixtureMap as Record<string, unknown>,
    );
    if (!loaded) {
        throw new Error("Could not load the conquest benchmark fixture map.");
    }
    await bridge.ensureTerritoryMode(mode);
    const gameplayPrep = await bridge.beginGameplay(6000, 1);
    if (!gameplayPrep?.started) {
        throw new Error(
            `Gameplay did not start for ${mode}: ${JSON.stringify(gameplayPrep)}`,
        );
    }
    await waitMs(600);
    const sampleOrder = await bridge.prepareConquestDiagnosticOrder();
    if (!sampleOrder?.sourceId || !sampleOrder?.targetId) {
        throw new Error("Could not resolve a conquest benchmark order.");
    }
    return {
        bridge,
        stateBefore: (await bridge.getStateSummary()) as Record<string, unknown>,
        sampleOrder: sampleOrder as Record<string, unknown>,
        ...resolveConquestTransitionTargets(),
    };
}

export async function runInAppConquestAnimationScenario(
    mode: InAppConquestBenchmarkMode,
): Promise<InAppConquestBenchmarkSummary> {
    const prep = await prepareScenario(mode);
    await prep.bridge.clearTransitionRecorderBundles();
    await prep.bridge.setTransitionRecorderEnabled(false);
    const issued = await prep.bridge.issueOrderDirect(
        String(prep.sampleOrder.sourceId),
        String(prep.sampleOrder.targetId),
        true,
    );
    if (!issued) {
        throw new Error("The conquest animation benchmark order was rejected.");
    }
    const frameStats = (await prep.bridge.collectFrameStats(
        prep.captureDurationMs,
        0,
    )) as unknown as Record<string, unknown>;
    return {
        scenarioId: "conquest_animation",
        mode,
        effectiveTransitionMs: prep.effectiveTransitionMs,
        targetFrames60fps: prep.targetFrames60fps,
        minimumFrames30fps: prep.minimumFrames30fps,
        captureDurationMs: prep.captureDurationMs,
        frameStats,
        sampleOrder: prep.sampleOrder,
        stateBefore: prep.stateBefore,
        stateAfter: (await prep.bridge.getStateSummary()) as Record<string, unknown>,
        recorderSummary:
            (await prep.bridge.getTransitionRecorderSummary()) as Record<
                string,
                unknown
            >,
    };
}

export async function runInAppConquestDiagnosticScenario(
    mode: InAppConquestBenchmarkMode,
): Promise<InAppConquestBenchmarkSummary> {
    const prep = await prepareScenario(mode);
    await prep.bridge.clearTransitionRecorderBundles();
    await prep.bridge.setTransitionRecorderEnabled(true);
    const previousBundleCount = Number(
        (
            (await prep.bridge.getTransitionRecorderSummary()) as Record<
                string,
                unknown
            >
        ).bundleCount ?? 0,
    );
    try {
        const issued = await prep.bridge.issueOrderDirect(
            String(prep.sampleOrder.sourceId),
            String(prep.sampleOrder.targetId),
            true,
        );
        if (!issued) {
            throw new Error("The conquest diagnostic benchmark order was rejected.");
        }
        const frameStats = (await prep.bridge.collectFrameStats(
            prep.captureDurationMs,
            0,
        )) as unknown as Record<string, unknown>;
        const bundle =
            (await prep.bridge.waitForTransitionBundle(
                previousBundleCount,
                Math.max(
                    DIAGNOSTIC_BUNDLE_TIMEOUT_MS,
                    prep.captureDurationMs + 6000,
                ),
            )) as Record<string, unknown> | null;
        return {
            scenarioId: "conquest_diagnostic",
            mode,
            effectiveTransitionMs: prep.effectiveTransitionMs,
            targetFrames60fps: prep.targetFrames60fps,
            minimumFrames30fps: prep.minimumFrames30fps,
            captureDurationMs: prep.captureDurationMs,
            frameStats,
            sampleOrder: prep.sampleOrder,
            stateBefore: prep.stateBefore,
            stateAfter:
                (await prep.bridge.getStateSummary()) as Record<string, unknown>,
            recorderSummary:
                (await prep.bridge.getTransitionRecorderSummary()) as Record<
                    string,
                    unknown
                >,
            bundleSummary: bundle,
        };
    } finally {
        await prep.bridge.setTransitionRecorderEnabled(false);
    }
}
