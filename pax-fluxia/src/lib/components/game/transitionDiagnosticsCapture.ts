/**
 * Transition-diagnostics capture — the dev-tooling subsystem that records a
 * conquest as a before/during/after frame bundle and hands it to
 * transitionSnapshotRecorder. Inert unless the recorder is enabled.
 *
 * Extracted from GameCanvas.svelte (Stage 5). The subsystem owns all of its own
 * capture state; live engine state that changes every frame (the Pixi app, the
 * territory container, the stable presented frame) is read through `deps`
 * getters rather than captured at construction, because a value snapshotted at
 * mount would go stale on the first frame.
 */
import * as PIXI from "pixi.js";
import type { StarState, StarConnection } from "$lib/types/game.types";
import {
    buildPerimeterFieldRenderFamilyGeometry,
    buildOwnershipSnapshotFromStars,
} from "$lib/territory/families/buildFamilyGeometry";
import type { RenderFamilyActiveTransition } from "$lib/territory/families/RenderFamilyTypes";
import { getRenderFamily } from "$lib/territory/families/renderFamilyRegistry";
import { CellGridPhaseEdgesFamily } from "$lib/territory/families/cellGrid/CellGridPhaseEdgesFamily";
import { CellGridPhaseFieldFamily } from "$lib/territory/families/cellGrid/CellGridPhaseFieldFamily";
import { GridGradientFamily } from "$lib/territory/families/gridGradient/GridGradientFamily";
import { ownershipSnapshotHasPreviousConquestOwners } from "$lib/territory/transitions/renderFamilyPreviousFrame";
import { normalizePerimeterFieldGeometrySource } from "$lib/territory/geometry/geometrySource";
import type {
    OwnershipSnapshot,
    TerritoryConquestEvent,
} from "$lib/territory/contracts/OwnershipContracts";
import type { ResolvedGeometrySnapshot } from "$lib/territory/contracts/GeometryContracts";
import { transitionSnapshotRecorder } from "$lib/territory/devtools/TransitionSnapshotRecorder";
import { measurePerf, recordPerfEvent } from "$lib/perf/perfProbe";

export type TransitionDiagnosticCapturedFrame = {
    geometry: ResolvedGeometrySnapshot;
    ownership: OwnershipSnapshot;
    canvas: HTMLCanvasElement;
    mode: string;
    debugSnapshot: Record<string, unknown> | null;
};

export type TransitionDiagnosticCapturedTransitionFrame = {
    frameIndex: number;
    progress: number;
    canvas: HTMLCanvasElement;
    debugSnapshot: Record<string, unknown> | null;
};

export type TransitionDiagnosticCaptureSession = {
    key: string;
    mode: string;
    conquestEvents: readonly TerritoryConquestEvent[];
    previousFrame: TransitionDiagnosticCapturedFrame;
    frames: TransitionDiagnosticCapturedTransitionFrame[];
};

export type TransitionDiagnosticFrameInput = {
    activeMode: string;
    activeTransition: RenderFamilyActiveTransition | null;
    stars: ReadonlyArray<StarState>;
    lanes: ReadonlyArray<StarConnection>;
    geometry?: ResolvedGeometrySnapshot | null;
    ownership?: OwnershipSnapshot | null;
    debugSnapshot?: Record<string, unknown> | null;
};

export type TransitionDiagnosticPrevFrame = {
    key: string;
    geometry: ResolvedGeometrySnapshot;
    ownership: OwnershipSnapshot;
};

/**
 * Live engine state, read per call. Getters (not values) because every one of
 * these changes across the lifetime of the capture subsystem.
 */
export interface TransitionDiagnosticsCaptureDeps {
    getApp: () => PIXI.Application | null;
    getVoronoiContainer: () => PIXI.Container | null;
    /** fxOrchestrator.gameTime — the FX clock, not wall time. */
    getGameTimeMs: () => number;
    /** Generated map extent, used to rebuild a reverted previous geometry. */
    getMapWorldSize: () => { width: number; height: number };
    /** Presented territory extent, used to frame the canvas extract. */
    getTerritoryWorldSize: () => { width: number; height: number };
    /** The last stably-presented frame, reused as the previous frame when it matches. */
    getStableGeometry: () => ResolvedGeometrySnapshot | null;
    getStableOwnership: () => OwnershipSnapshot | null;
    getRenderFamilyModeConfigSource: (
        mode: string,
    ) => Record<string, unknown> | undefined;
    getCurrentRenderFamilyGeometry: (
        stars: ReadonlyArray<StarState>,
        lanes: ReadonlyArray<StarConnection>,
        configSource?: Record<string, unknown>,
    ) => ResolvedGeometrySnapshot;
    buildRenderFamilyOwnershipSnapshot: (
        stars: ReadonlyArray<StarState>,
        activeTransition: RenderFamilyActiveTransition | null,
    ) => OwnershipSnapshot;
    summarizeTransitionOwnersForLog: (
        transition: RenderFamilyActiveTransition | null,
        starsToRead: ReadonlyArray<StarState>,
    ) => ReadonlyArray<Record<string, unknown>>;
    logGridGradientTransition: (
        stage: string,
        data: Record<string, unknown>,
    ) => void;
}

export interface TransitionDiagnosticsCapture {
    /**
     * The pre-conquest frame for the active transition: the stable presented
     * frame when its owners still match, otherwise a geometry rebuilt from
     * ownership-reverted stars. Cached per transition key.
     */
    getPrevFrame: (params: {
        activeMode: string;
        activeTransition: RenderFamilyActiveTransition | null;
        stars: ReadonlyArray<StarState>;
        lanes: ReadonlyArray<StarConnection>;
    }) => TransitionDiagnosticPrevFrame | null;
    /** Advance the capture for this frame. No-op unless the recorder is enabled. */
    sync: (params: TransitionDiagnosticFrameInput) => void;
    getCaptureState: () => Record<string, unknown> | null;
    /** True when anything is held that reset() would clear. */
    hasCapturedState: () => boolean;
    reset: () => void;
}

function cloneCanvasFrame(source: HTMLCanvasElement): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
        ctx.drawImage(source, 0, 0);
    }
    return canvas;
}

function cloneTransitionDiagnosticSnapshot(
    snapshot: Record<string, unknown> | null,
): Record<string, unknown> | null {
    if (!snapshot) return null;
    if (typeof structuredClone === "function") {
        return structuredClone(snapshot);
    }
    return JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
}

function buildTransitionDiagnosticCaptureKey(
    activeTransition: RenderFamilyActiveTransition | null,
): string | null {
    const events = activeTransition?.events;
    if (!events?.length) return null;
    return events
        .map((entry) =>
            [
                entry.event.tick,
                entry.event.starId,
                entry.event.previousOwner,
                entry.event.newOwner,
                entry.startedAtMs,
            ].join(":"),
        )
        .join("|");
}

function buildTransitionDiagnosticConquestEvents(
    activeTransition: RenderFamilyActiveTransition,
): TerritoryConquestEvent[] {
    return activeTransition.events
        .map((entry) => ({
            ...entry.event,
            attackerStarIds: [...entry.event.attackerStarIds],
            attackerShipTransfers: [...entry.event.attackerShipTransfers],
            atMs: entry.startedAtMs,
        }))
        .sort((a, b) => {
            if (a.atMs !== b.atMs) return a.atMs - b.atMs;
            return a.starId.localeCompare(b.starId);
        });
}

function buildStarPositionsMap(
    stars: ReadonlyArray<StarState>,
): ReadonlyMap<string, { x: number; y: number }> {
    const starPositions = new Map<string, { x: number; y: number }>();
    for (const star of stars) {
        starPositions.set(star.id, { x: star.x, y: star.y });
    }
    return starPositions;
}

function revertStarsForTransitionDiagnostic(
    activeTransition: RenderFamilyActiveTransition,
    stars: ReadonlyArray<StarState>,
): StarState[] {
    const overrides = new Map<string, string>();
    for (const entry of activeTransition.events) {
        overrides.set(entry.event.starId, entry.event.previousOwner);
    }
    return stars.map((star) => {
        const ownerId = overrides.get(star.id);
        return ownerId === undefined ? { ...star } : { ...star, ownerId };
    });
}

function buildTransitionDiagnosticSelection(mode: string) {
    return {
        ownershipMode: "star_ownership_snapshot" as const,
        geometryMode: "unified_vector" as const,
        fillTransitionMode: "unified_topology" as const,
        borderTransitionMode: "off" as const,
        styleMode:
            mode === "distance_field"
                ? ("distance_field" as const)
                : mode === "pixel"
                  ? ("pixel" as const)
                  : ("vector" as const),
    };
}

function getTransitionDiagnosticModeDebugSnapshot(
    mode: string,
): Record<string, unknown> | null {
    if (
        mode === "cell_grid" ||
        mode === "phase_edges" ||
        mode === "ember_lattice" ||
        mode === "phase_field" ||
        mode === "grid_gradient"
    ) {
        const family = getRenderFamily(mode);
        if (
            family instanceof CellGridPhaseEdgesFamily ||
            family instanceof CellGridPhaseFieldFamily ||
            family instanceof GridGradientFamily
        ) {
            return cloneTransitionDiagnosticSnapshot(family.getDebugSnapshot());
        }
    }
    return null;
}

function recordTransitionDiagnosticFrame(
    session: TransitionDiagnosticCaptureSession,
    progress: number,
    frame: TransitionDiagnosticCapturedFrame,
): void {
    session.frames.push({
        frameIndex: session.frames.length + 1,
        progress,
        canvas: cloneCanvasFrame(frame.canvas),
        debugSnapshot: cloneTransitionDiagnosticSnapshot(frame.debugSnapshot),
    });
}

export function createTransitionDiagnosticsCapture(
    deps: TransitionDiagnosticsCaptureDeps,
): TransitionDiagnosticsCapture {
    let stableFrame: TransitionDiagnosticCapturedFrame | null = null;
    let captureSession: TransitionDiagnosticCaptureSession | null = null;
    let captureState: Record<string, unknown> | null = null;
    let prevKey: string | null = null;
    let prevGeometry: ResolvedGeometrySnapshot | null = null;
    let prevOwnership: OwnershipSnapshot | null = null;

    function resetCaptureState(): void {
        stableFrame = null;
        captureSession = null;
        captureState = {
            status: "idle",
        };
    }

    function reset(): void {
        resetCaptureState();
        prevKey = null;
        prevGeometry = null;
        prevOwnership = null;
    }

    function hasCapturedState(): boolean {
        return Boolean(
            stableFrame || captureSession || prevGeometry || prevOwnership,
        );
    }

    function captureLiveFrame(params: {
        target: PIXI.Container;
        geometry: ResolvedGeometrySnapshot;
        ownership: OwnershipSnapshot;
        mode: string;
        debugSnapshot?: Record<string, unknown> | null;
    }): TransitionDiagnosticCapturedFrame | null {
        const app = deps.getApp();
        if (!app?.renderer) return null;
        const territoryWorld = deps.getTerritoryWorldSize();
        const extracted = app.renderer.extract.canvas({
            target: params.target,
            frame: new PIXI.Rectangle(
                0,
                0,
                territoryWorld.width,
                territoryWorld.height,
            ),
            clearColor: "#000000",
        }) as HTMLCanvasElement;
        return {
            geometry: params.geometry,
            ownership: params.ownership,
            canvas: cloneCanvasFrame(extracted),
            mode: params.mode,
            debugSnapshot: cloneTransitionDiagnosticSnapshot(
                params.debugSnapshot ?? null,
            ),
        };
    }

    function getPrevFrame(params: {
        activeMode: string;
        activeTransition: RenderFamilyActiveTransition | null;
        stars: ReadonlyArray<StarState>;
        lanes: ReadonlyArray<StarConnection>;
    }): TransitionDiagnosticPrevFrame | null {
        const key = buildTransitionDiagnosticCaptureKey(params.activeTransition);
        if (!key || !params.activeTransition) {
            deps.logGridGradientTransition("prev_frame.no_transition_key", {
                key,
                hasActiveTransition: Boolean(params.activeTransition),
            });
            prevKey = null;
            prevGeometry = null;
            prevOwnership = null;
            return null;
        }
        if (prevKey !== key || !prevGeometry || !prevOwnership) {
            const stableGeometry = deps.getStableGeometry();
            const stableOwnership = deps.getStableOwnership();
            const stableFrameMatchesTransition =
                !!stableGeometry &&
                ownershipSnapshotHasPreviousConquestOwners({
                    activeTransition: params.activeTransition,
                    ownership: stableOwnership,
                });
            deps.logGridGradientTransition("prev_frame.cache_gate", {
                transitionKey: key,
                hasStableGeometry: Boolean(stableGeometry),
                hasStableOwnership: Boolean(stableOwnership),
                stableFrameMatchesTransition,
                stableGeometryVersion: stableGeometry?.version ?? null,
                stableOwnershipVersion: stableOwnership?.version ?? null,
                transitionOwners: deps.summarizeTransitionOwnersForLog(
                    params.activeTransition,
                    params.stars,
                ),
            });
            if (stableFrameMatchesTransition && stableGeometry && stableOwnership) {
                prevKey = key;
                prevGeometry = stableGeometry;
                prevOwnership = stableOwnership;
                recordPerfEvent("territory.renderFamily.prevFrame", {
                    source: "presented_frame_cache",
                    transitionKey: key,
                    geometryVersion: stableGeometry.version,
                    ownershipVersion: stableOwnership.version,
                });
                deps.logGridGradientTransition(
                    "prev_frame.using_presented_cache",
                    {
                        transitionKey: key,
                        geometryVersion: stableGeometry.version,
                        ownershipVersion: stableOwnership.version,
                    },
                );
            } else {
                const revertedStars = revertStarsForTransitionDiagnostic(
                    params.activeTransition,
                    params.stars,
                );
                const ownership = buildOwnershipSnapshotFromStars(revertedStars);
                const configSource = deps.getRenderFamilyModeConfigSource(
                    params.activeMode,
                );
                const mapWorld = deps.getMapWorldSize();
                const geometry = measurePerf(
                    "game.renderFrame.tickEvents.capture.prevGeometry",
                    () =>
                        buildPerimeterFieldRenderFamilyGeometry({
                            stars: revertedStars,
                            lanes: params.lanes,
                            worldWidth: mapWorld.width,
                            worldHeight: mapWorld.height,
                            nowMs: deps.getGameTimeMs(),
                            ownership,
                            geometrySource: normalizePerimeterFieldGeometrySource(
                                configSource?.PERIMETER_FIELD_GEOMETRY_SOURCE,
                            ),
                            configSource,
                        }),
                );
                prevKey = key;
                prevGeometry = geometry;
                prevOwnership = ownership;
                recordPerfEvent("territory.renderFamily.prevFrame", {
                    source: "transition_rebuild",
                    reason: stableGeometry
                        ? "stable_previous_owner_mismatch"
                        : "missing_stable_frame",
                    transitionKey: key,
                    geometryVersion: geometry.version,
                    ownershipVersion: ownership.version,
                });
                deps.logGridGradientTransition("prev_frame.rebuilt", {
                    transitionKey: key,
                    reason: stableGeometry
                        ? "stable_previous_owner_mismatch"
                        : "missing_stable_frame",
                    geometryVersion: geometry.version,
                    ownershipVersion: ownership.version,
                    revertedOwners: deps.summarizeTransitionOwnersForLog(
                        params.activeTransition,
                        revertedStars,
                    ),
                });
            }
        }
        deps.logGridGradientTransition("prev_frame.return", {
            transitionKey: key,
            geometryVersion: prevGeometry?.version ?? null,
            ownershipVersion: prevOwnership?.version ?? null,
        });
        return {
            key,
            geometry: prevGeometry,
            ownership: prevOwnership,
        };
    }

    function sync(params: TransitionDiagnosticFrameInput): void {
        if (!transitionSnapshotRecorder.isEnabled()) {
            reset();
            return;
        }
        const activeVoronoiContainer = deps.getVoronoiContainer();
        const app = deps.getApp();
        if (!activeVoronoiContainer || !app?.renderer) {
            captureState = {
                status: "blocked",
                reason: "renderer_unavailable",
                activeMode: params.activeMode,
            };
            return;
        }

        const transitionKey = buildTransitionDiagnosticCaptureKey(
            params.activeTransition,
        );
        const prevFrame = getPrevFrame({
            activeMode: params.activeMode,
            activeTransition: params.activeTransition,
            stars: params.stars,
            lanes: params.lanes,
        });
        const ownership =
            params.ownership ??
            deps.buildRenderFamilyOwnershipSnapshot(
                params.stars,
                params.activeTransition,
            );
        const geometry =
            params.geometry ??
            measurePerf("game.renderFrame.tickEvents.capture.geometry", () =>
                deps.getCurrentRenderFamilyGeometry(
                    params.stars,
                    params.lanes,
                    deps.getRenderFamilyModeConfigSource(params.activeMode),
                ),
            );
        const liveFrame = measurePerf(
            "game.renderFrame.tickEvents.capture.extract",
            () =>
                captureLiveFrame({
                    target: activeVoronoiContainer,
                    geometry,
                    ownership,
                    mode: params.activeMode,
                    debugSnapshot:
                        params.debugSnapshot ??
                        getTransitionDiagnosticModeDebugSnapshot(
                            params.activeMode,
                        ),
                }),
        );
        if (!liveFrame) {
            captureState = {
                status: "blocked",
                reason: "frame_capture_failed",
                activeMode: params.activeMode,
                transitionKey,
            };
            return;
        }

        if (!transitionKey || !params.activeTransition) {
            if (captureSession) {
                const session = captureSession;
                const territoryWorld = deps.getTerritoryWorldSize();
                const finalizedTransitionFrames = [
                    ...session.frames.map((entry) => ({
                        progress: entry.progress,
                        canvas: entry.canvas,
                        frameIndex: entry.frameIndex,
                        debugSnapshot: entry.debugSnapshot,
                    })),
                    {
                        progress: 1,
                        canvas: cloneCanvasFrame(liveFrame.canvas),
                        frameIndex: session.frames.length + 1,
                        debugSnapshot: cloneTransitionDiagnosticSnapshot(
                            liveFrame.debugSnapshot,
                        ),
                    },
                ];
                measurePerf("game.renderFrame.tickEvents.capture.finalize", () => {
                    transitionSnapshotRecorder.capturePreRendered({
                        ctx: {
                            conquestEvents: session.conquestEvents,
                            previousGeometry: session.previousFrame.geometry,
                            nextGeometry: liveFrame.geometry,
                            previousOwnership: session.previousFrame.ownership,
                            nextOwnership: liveFrame.ownership,
                            transition: {
                                envelope: null as any,
                                fillFrame: null as any,
                                borderFrame: null as any,
                                geometryVersion: liveFrame.geometry.version,
                            },
                            fillPlan: null,
                            activeFrontPlan: null,
                            prevFrontierTopology:
                                session.previousFrame.geometry
                                    .frontierTopology ?? null,
                            nextFrontierTopology:
                                liveFrame.geometry.frontierTopology ?? null,
                            selection: buildTransitionDiagnosticSelection(
                                session.mode,
                            ),
                            nowMs: deps.getGameTimeMs(),
                            starPositions: buildStarPositionsMap(params.stars),
                            worldWidth: territoryWorld.width,
                            worldHeight: territoryWorld.height,
                        },
                        prevCanvas: session.previousFrame.canvas,
                        nextCanvas: liveFrame.canvas,
                        transitionFrames: finalizedTransitionFrames.map(
                            (entry) => ({
                                progress: entry.progress,
                                canvas: entry.canvas,
                            }),
                        ),
                        extraDiagnostics: {
                            kind: "territory_live_capture",
                            mode: session.mode,
                            previousFrame: session.previousFrame.debugSnapshot,
                            nextFrame: liveFrame.debugSnapshot,
                            transitionFrames: finalizedTransitionFrames.map(
                                (entry) => ({
                                    frameIndex: entry.frameIndex,
                                    progress: entry.progress,
                                    snapshot: entry.debugSnapshot,
                                }),
                            ),
                        },
                    });
                });
                captureState = {
                    status: "finalized",
                    activeMode: session.mode,
                    transitionKey: session.key,
                    frameCount: finalizedTransitionFrames.length,
                    previousGeometryVersion: session.previousFrame.geometry.version,
                    nextGeometryVersion: liveFrame.geometry.version,
                    bundleCount: transitionSnapshotRecorder.count,
                };
                captureSession = null;
            } else {
                captureState = {
                    status: "stable",
                    activeMode: params.activeMode,
                    geometryVersion: liveFrame.geometry.version,
                };
            }
            stableFrame = liveFrame;
            return;
        }

        const conquestEvents = buildTransitionDiagnosticConquestEvents(
            params.activeTransition,
        );
        if (!captureSession || captureSession.key !== transitionKey) {
            const previousFrame = stableFrame
                ? {
                      ...stableFrame,
                      geometry: prevFrame?.geometry ?? liveFrame.geometry,
                      ownership: prevFrame?.ownership ?? liveFrame.ownership,
                      mode: params.activeMode,
                  }
                : {
                      ...liveFrame,
                      geometry: prevFrame?.geometry ?? liveFrame.geometry,
                      ownership: prevFrame?.ownership ?? liveFrame.ownership,
                      mode: params.activeMode,
                  };
            captureSession = {
                key: transitionKey,
                mode: params.activeMode,
                conquestEvents,
                previousFrame,
                frames: [],
            };
        } else {
            captureSession.conquestEvents = conquestEvents;
        }

        const session = captureSession;
        const quantizedProgress =
            Math.round((params.activeTransition.progress ?? 0) * 1000) / 1000;
        const lastProgress =
            session.frames[session.frames.length - 1]?.progress ?? -1;
        if (quantizedProgress > lastProgress) {
            recordTransitionDiagnosticFrame(
                session,
                quantizedProgress,
                liveFrame,
            );
        }
        captureState = {
            status: "capturing",
            activeMode: params.activeMode,
            transitionKey,
            conquestCount: session.conquestEvents.length,
            frameCount: session.frames.length,
            progress: quantizedProgress,
            hasStableFrame: Boolean(stableFrame),
            previousGeometryVersion: session.previousFrame.geometry.version,
            nextGeometryVersion: liveFrame.geometry.version,
        };
    }

    return {
        getPrevFrame,
        sync,
        getCaptureState: () => captureState,
        hasCapturedState,
        reset,
    };
}
