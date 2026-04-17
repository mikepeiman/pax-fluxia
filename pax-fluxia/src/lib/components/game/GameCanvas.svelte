<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { get } from "svelte/store";
    import * as PIXI from "pixi.js";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { animationStore } from "$lib/stores/animationStore.svelte";
    import { audioManager } from "$lib/services/audioManager.svelte";
    import { mapTranspose } from "$lib/stores/mapTranspose.svelte";
    import { log } from "$lib/utils/logger";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { resolveThemeRenderMode } from "$lib/config/themeRouting";
    import { normalizeBgImagePath } from "$lib/config/bgManifest";
    import {
        getOrbitSlot,
        getTotalOccupiedLayers,
        getOuterOrbitRadius,
        getFleetPositions,
        lerp,
        SHIP_ANIM,
        type VisualShipState,
        type ShipLifecycleState,
    } from "$lib/utils/render.utils";
    import { distance } from "$lib/utils/math.utils";
    import type {
        StarState,
        StarConnection,
        StarId,
    } from "$lib/types/game.types";
    import { STAR_TYPE_STATS, generateHexGrid } from "@pax/common";
    import { FXOrchestrator } from "$lib/fx/orchestrator";
    import {
        territoryTransitions,
        resolveTerritoryTransitionDurationMs,
    } from "$lib/fx/handlers/territoryTransitionHandler";
    import {
        createContainers,
        initShipRendering,
    } from "$lib/renderers/containerFactory";
    import type { StarType } from "@pax/common";

    import { selectedStarStore } from "$lib/stores/selectedStarStore.svelte";
    import { createColorUtils } from "$lib/renderers/colorUtils";
    import {
        renderStars as renderStarsModule,
        renderSelectionOverlay,
    } from "$lib/renderers/StarRenderer";
    import {
        renderConnections as renderConnectionsModule,
        renderOrderArrows as renderOrderArrowsModule,
    } from "$lib/renderers/LaneRenderer";
    import {
        renderShips as renderShipsModule,
        type SurgeState,
        type ShipRenderState,
        type ShipRenderResources,
    } from "$lib/renderers/ShipRenderer";
    import { renderStarPower as renderStarPowerModule } from "$lib/renderers/StarPowerRenderer";
    import {
        renderVoronoi as renderVoronoiModule,
        resetVoronoiCache,
    } from "$lib/renderers/VoronoiRenderer";
    import {
        resetMetaballCache,
    } from "$lib/renderers/MetaballRenderer";
    import {
        renderPixelTerritory as renderPixelTerritoryModule,
        resetPixelTerritoryCache,
    } from "$lib/renderers/PixelTerritoryRenderer";
    import {
        renderLaneTerritory as renderLaneTerritoryModule,
        resetLaneTerritoryCache,
    } from "$lib/renderers/LaneTerritoryRenderer";
    import {
        renderContourTerritory as renderContourTerritoryModule,
        resetContourTerritoryCache,
    } from "$lib/renderers/ContourTerritoryRenderer";
    import {
        renderModifiedVoronoi as renderModifiedVoronoiModule,
        resetModifiedVoronoiCache,
    } from "$lib/renderers/ModifiedVoronoiRenderer";
    import {
        renderPowerVoronoi as renderPowerVoronoiModule,
        resetPowerVoronoiCache,
        exportPowerVoronoiGeometrySnapshot,
    } from "$lib/renderers/PowerVoronoiRenderer";
    import {
        renderPVV2DY4 as renderPVV2DY4Module,
        resetPVV2DY4Cache,
    } from "$lib/renderers/PowerVoronoiRenderer_DY4";
    import {
        renderPVV3 as renderPVV3Module,
        resetPVV3Cache,
    } from "$lib/renderers/PVV3Renderer";
    import {
        renderDistanceFieldTerritory as renderDistanceFieldTerritoryModule,
        resetDistanceFieldTerritoryCache,
    } from "$lib/renderers/DistanceFieldTerritoryRenderer";
    import {
        renderTerritoryEngine,
        resetTerritoryEngineCaches,
        runFG2DataPipeline,
        extractCanonicalData,
    } from "$lib/territory/orchestrator";
    // ── Canonical territory layer (Phase 2: new architecture) ──────────────────
    import { GameCanvasBridge } from "$lib/territory/integration/GameCanvasBridge";
    import { readTerritoryRuntimeSettings } from "$lib/territory/integration/TerritorySettingsBridge";
    import {
        getRenderFamily,
        registerRenderFamily,
    } from "$lib/territory/families/renderFamilyRegistry";
    import { MetaballFamily, createMetaballFamily } from "$lib/territory/families/metaball/MetaballFamily";
    import { PerimeterFieldFamily, createPerimeterFieldFamily } from "$lib/territory/families/perimeterField/PerimeterFieldFamily";
    import { MetaballGridFamily, createMetaballGridFamily } from "$lib/territory/families/metaballGrid/MetaballGridFamily";
    import type { PerimeterFieldDebugSnapshot } from "$lib/territory/families/perimeterField/buildPerimeterFieldScene";
    import { compactPerimeterFieldDebugSnapshot } from "$lib/territory/families/perimeterField/perimeterFieldDiagnostics";
    import {
        resetPerimeterFieldDebugPlaybackState,
        setPerimeterFieldDebugPlaybackState,
    } from "$lib/territory/families/perimeterField/perimeterFieldDebugPlaybackStore";
    import { buildRenderFamilyInput } from "$lib/territory/families/buildRenderFamilyInput";
    import {
        buildPerimeterFieldRenderFamilyGeometry,
        buildOwnershipSnapshotFromStars,
    } from "$lib/territory/families/buildFamilyGeometry";
    import type { RenderFamilyActiveTransition } from "$lib/territory/families/RenderFamilyTypes";
    import { getTerritoryVisualEpoch } from "$lib/territory/bumpTerritoryVisualConfig";
    import { resolveTerritoryArchitectureRoute } from "$lib/territory/integration/TerritoryArchitectureRouter";
    import type {
        OwnershipSnapshot,
        TerritoryConquestEvent,
    } from "$lib/territory/contracts/OwnershipContracts";
    import type { CanonicalGeometrySnapshot } from "$lib/territory/contracts/GeometryContracts";
    import type { TerritoryFrameInput } from "$lib/territory/contracts/TerritoryFrameInput";
    import { TerritoryEngineController } from "$lib/territory/engine/TerritoryEngineController";
    import { TerritoryRenderer } from "$lib/territory/render/TerritoryRenderer";
    import { transitionSnapshotRecorder } from "$lib/territory/devtools/TransitionSnapshotRecorder";
    import { buildTerritoryConfigFingerprint } from "$lib/territory/buildTerritoryConfigFingerprint";
    import {
        buildRulerMeasurement,
        getRulerCssColor,
        getRulerMeasurement,
        rulerTool,
        type RulerLaneState,
        type RulerMeasurement,
        type RulerPoint,
    } from "$lib/territory/devtools/rulerTool";
    import { getDirectedLanePolyline } from "$lib/lanes/lanePolylineCache";
    import { trimLanePolylineToStarRims } from "$lib/lanes/laneGeometry";
    import { computeLaneHeadingForNearside } from "$lib/lanes/applyLaneTravelPath";

    // ============================================================================
    // PixiJS Application
    // ============================================================================

    let canvasContainer: HTMLDivElement;
    let app: PIXI.Application | null = null;
    let handlePerimeterFieldArtifactExport:
        | ((event: Event) => void)
        | null = null;
    let handlePerimeterFieldConquestPackageExport:
        | ((event: Event) => void)
        | null = null;
    let handlePerimeterFieldContactSheetExport:
        | ((event: Event) => void)
        | null = null;
    let handlePerimeterFieldCaptureClear:
        | ((event: Event) => void)
        | null = null;

    // Graphics layers
    let connectionGraphics: PIXI.Graphics | null = null;
    let dragPreviewGraphics: PIXI.Graphics;
    let selectionOverlayGraphics: PIXI.Graphics | null = null;
    let starsContainer: PIXI.Container | null = null;
    let glowContainer: PIXI.Container | null = null;
    let shipsContainer: PIXI.Container | null = null;
    let labelsContainer: PIXI.Container | null = null;

    // Graphics cache
    let starGraphics: Map<string, PIXI.Graphics> = new Map();
    let starLabels: Map<string, PIXI.Container> = new Map();
    let linkGraphics: PIXI.Graphics | null = null;
    let territoryGraphics: PIXI.Graphics | null = null;
    let voronoiContainer: PIXI.Container | null = null;
    let debugGraphics: PIXI.Graphics | null = null; // New debug layer
    let debugTextContainer: PIXI.Container | null = null;
    let rulerLabels: PIXI.Text[] = [];

    // ParticleContainer ship rendering (high-perf batched sprites)
    let shipCircleTexture: PIXI.Texture | null = null;
    let shipParticleContainer: PIXI.ParticleContainer | null = null;
    let shipParticlePool: PIXI.Particle[] = [];
    let shipParticleIndex = 0;

    // Star glow rendering
    let glowTexture: PIXI.Texture | null = null;
    let glowSprites: Map<string, PIXI.Sprite> = new Map();
    let orbGraphics: PIXI.Graphics | null = null; // For orb travel glow effects (needs Graphics)

    // FPS tracking
    let fpsFrameCount = 0;
    let fpsLastTime = performance.now();
    let currentFps = $state(0);
    let totalVisualShips = $state(0);

    // Ship Spawn Animation Tracking
    // Key: `${starId}-${shipIndex}`, Value: spawnTimestamp
    let shipSpawnTimers: Map<string, number> = new Map();
    let starShipCounts: Map<string, number> = new Map(); // Track previous counts

    // ── FX Orchestrator (V2 — manages all visual ship state via VSM) ────
    const fxOrchestrator = new FXOrchestrator();

    function clampUnitInterval(value: number): number {
        return Math.max(0, Math.min(1, value));
    }

    function transitionIdentityKey(
        conquest: import("@pax/common").ConquestEvent,
    ): string {
        return [
            conquest.tick,
            conquest.starId,
            conquest.previousOwner,
            conquest.newOwner,
        ].join(":");
    }

    function buildActiveRenderFamilyTransition(
        nowMs: number,
        effectiveTickMs: number,
        pendingConquests: ReadonlyArray<import("@pax/common").ConquestEvent> = [],
    ): RenderFamilyActiveTransition | null {
        const eventsByKey = new Map<string, RenderFamilyTransitionEvent>();

        for (const entry of territoryTransitions.getActiveEntries()) {
            const durationMs = Math.max(1, entry.durationMs);
            const rawProgress = (nowMs - entry.startTimeMs) / durationMs;
            if (rawProgress >= 1) continue;
            eventsByKey.set(transitionIdentityKey(entry.event), {
                event: entry.event,
                startedAtMs: entry.startTimeMs,
                durationMs,
                rawProgress,
                progress: clampUnitInterval(rawProgress),
            });
        }

        const previewDurationMs = resolveTerritoryTransitionDurationMs(
            effectiveTickMs,
        );
        if (previewDurationMs > 0) {
            for (const conquest of pendingConquests) {
                const key = transitionIdentityKey(conquest);
                if (eventsByKey.has(key)) continue;
                eventsByKey.set(key, {
                    event: conquest,
                    startedAtMs: nowMs,
                    durationMs: previewDurationMs,
                    rawProgress: 0,
                    progress: 0,
                });
            }
        }

        const events = [...eventsByKey.values()]
            .map((entry) => {
                const durationMs = Math.max(1, entry.durationMs);
                return {
                    event: entry.event,
                    startedAtMs: entry.startedAtMs,
                    durationMs,
                    rawProgress: entry.rawProgress,
                    progress: clampUnitInterval(entry.rawProgress),
                };
            })
            .sort((a, b) => a.startedAtMs - b.startedAtMs);

        if (events.length === 0) return null;

        const startedAtMs = Math.min(...events.map((event) => event.startedAtMs));
        const durationMs = Math.max(...events.map((event) => event.durationMs));
        const rawProgress = Math.max(...events.map((event) => event.rawProgress));

        return {
            conquestEvents: events.map((event) => event.event),
            events,
            startedAtMs,
            durationMs,
            rawProgress,
            progress: clampUnitInterval(rawProgress),
        };
    }

    function buildRenderFamilyOwnershipSnapshot(
        stars: ReadonlyArray<StarState>,
        activeTransition: RenderFamilyActiveTransition | null,
    ): OwnershipSnapshot {
        const starOwners = new Map<string, string>();
        for (const star of stars) {
            if (star.ownerId) {
                starOwners.set(star.id, star.ownerId);
            }
        }

        return {
            version: "render-family-live",
            starOwners,
            contestedLaneIds: [],
            conquestEvents:
                activeTransition?.events.map((entry) => ({
                    starId: entry.event.starId,
                    previousOwner: entry.event.previousOwner,
                    newOwner: entry.event.newOwner,
                    atMs: entry.startedAtMs,
                })) ?? [],
            virtualStars: [],
        };
    }

    type PerimeterFieldCapturedFrame = {
        geometry: CanonicalGeometrySnapshot;
        ownership: OwnershipSnapshot;
        canvas: HTMLCanvasElement;
        debugSnapshot: PerimeterFieldDebugSnapshot | null;
        compactDebugSnapshot: Record<string, unknown> | null;
    };

    type PerimeterFieldCapturedTransitionFrame = {
        frameIndex: number;
        progress: number;
        canvas: HTMLCanvasElement;
        debugSnapshot: PerimeterFieldDebugSnapshot | null;
        compactDebugSnapshot: Record<string, unknown> | null;
    };

    type PerimeterFieldCaptureSession = {
        key: string;
        conquestEvents: readonly TerritoryConquestEvent[];
        previousFrame: PerimeterFieldCapturedFrame;
        frames: PerimeterFieldCapturedTransitionFrame[];
    };

    type PerimeterFieldReplayBundle = {
        timestamp: string;
        label: string;
        conquestEvents: readonly TerritoryConquestEvent[];
        previousFrame: PerimeterFieldCapturedFrame;
        nextFrame: PerimeterFieldCapturedFrame;
        frames: ReadonlyArray<PerimeterFieldCapturedTransitionFrame>;
    };

    type PerimeterFieldDisplayedFrame = {
        frameIndex: number;
        progress: number;
        canvas: HTMLCanvasElement;
        debugSnapshot: PerimeterFieldDebugSnapshot | null;
    };

    type PerimeterFieldReplaySelection = {
        timestamp: string;
        label: string;
        frame: PerimeterFieldDisplayedFrame;
        frames: readonly PerimeterFieldDisplayedFrame[];
        selectedIndex: number;
        conquestEvents: readonly TerritoryConquestEvent[];
    };

    let perimeterFieldStableFrame: PerimeterFieldCapturedFrame | null = null;
    let perimeterFieldCaptureSession: PerimeterFieldCaptureSession | null =
        null;
    let perimeterFieldReplayHistory: PerimeterFieldReplayBundle[] = [];
    let perimeterFieldReplaySprite: PIXI.Sprite | null = null;
    let perimeterFieldReplayTexture: PIXI.Texture | null = null;
    let perimeterFieldDebugSnapshotOverride:
        | PerimeterFieldDebugSnapshot
        | null = null;

    function cloneCanvasFrame(
        source: HTMLCanvasElement,
    ): HTMLCanvasElement {
        const canvas = document.createElement("canvas");
        canvas.width = source.width;
        canvas.height = source.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.drawImage(source, 0, 0);
        }
        return canvas;
    }

    function clonePerimeterFieldDebugSnapshot(
        snapshot: PerimeterFieldDebugSnapshot | null,
    ): PerimeterFieldDebugSnapshot | null {
        if (!snapshot) return null;
        return {
            displayGeometry: snapshot.displayGeometry,
            transitionTargetGeometry: snapshot.transitionTargetGeometry,
            playerColors: snapshot.playerColors.map((entry) => [...entry] as const),
            staticSamples: snapshot.staticSamples.map((sample) => ({ ...sample })),
            targetStaticSamples: snapshot.targetStaticSamples.map((sample) => ({
                ...sample,
            })),
            transitionSamples: snapshot.transitionSamples.map((sample) => ({
                ...sample,
            })),
            effectiveProgress: snapshot.effectiveProgress,
        };
    }

    function buildPerimeterFieldTransitionCaptureKey(
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

    function buildPerimeterFieldConquestEvents(
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

    function capturePerimeterFieldLiveFrame(params: {
        family: PerimeterFieldFamily;
        geometry: CanonicalGeometrySnapshot;
        ownership: OwnershipSnapshot;
        debugSnapshot: PerimeterFieldDebugSnapshot | null;
    }): PerimeterFieldCapturedFrame | null {
        if (!app?.renderer) return null;
        const extracted = app.renderer.extract.canvas({
            target: params.family.displayRoot,
            frame: new PIXI.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
            clearColor: "#000000",
        }) as HTMLCanvasElement;
        return {
            geometry: params.geometry,
            ownership: params.ownership,
            canvas: cloneCanvasFrame(extracted),
            debugSnapshot: clonePerimeterFieldDebugSnapshot(
                params.debugSnapshot,
            ),
            compactDebugSnapshot: compactPerimeterFieldDebugSnapshot(
                params.debugSnapshot,
            ),
        };
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

    function recordPerimeterFieldTransitionFrame(
        session: PerimeterFieldCaptureSession,
        progress: number,
        frame: PerimeterFieldCapturedFrame,
    ): void {
        session.frames.push({
            frameIndex: session.frames.length + 1,
            progress,
            canvas: cloneCanvasFrame(frame.canvas),
            debugSnapshot: clonePerimeterFieldDebugSnapshot(
                frame.debugSnapshot,
            ),
            compactDebugSnapshot: frame.compactDebugSnapshot,
        });
    }

    function syncPerimeterFieldDebugPlaybackState(): void {
        setPerimeterFieldDebugPlaybackState({
            liveFrameCount: perimeterFieldCaptureSession
                ? perimeterFieldCaptureSession.frames.length + 1
                : 0,
            replayFrameCounts: [
                perimeterFieldReplayHistory[0]
                    ? perimeterFieldReplayHistory[0].frames.length + 2
                    : 0,
                perimeterFieldReplayHistory[1]
                    ? perimeterFieldReplayHistory[1].frames.length + 2
                    : 0,
                perimeterFieldReplayHistory[2]
                    ? perimeterFieldReplayHistory[2].frames.length + 2
                    : 0,
            ],
        });
    }

    function pushPerimeterFieldReplayBundle(bundle: PerimeterFieldReplayBundle) {
        perimeterFieldReplayHistory = [
            bundle,
            ...perimeterFieldReplayHistory,
        ].slice(0, 3);
        syncPerimeterFieldDebugPlaybackState();
    }

    function readSelectedPerimeterFieldConquestCapture(): {
        timestamp: string;
        label: string;
        conquestEvents: readonly TerritoryConquestEvent[];
        previousFrame: PerimeterFieldCapturedFrame;
        transitionFrames: readonly PerimeterFieldCapturedTransitionFrame[];
        nextFrame: PerimeterFieldCapturedFrame | null;
    } | null {
        const replaySlot = Math.max(
            0,
            Math.min(
                3,
                Math.round(GAME_CONFIG.PERIMETER_FIELD_DEBUG_REPLAY_SLOT ?? 0),
            ),
        );

        if (replaySlot > 0) {
            const replay = perimeterFieldReplayHistory[replaySlot - 1];
            if (!replay) return null;
            return {
                timestamp: replay.timestamp,
                label: replay.label,
                conquestEvents: replay.conquestEvents,
                previousFrame: replay.previousFrame,
                transitionFrames: replay.frames,
                nextFrame: replay.nextFrame,
            };
        }

        if (!perimeterFieldCaptureSession) return null;
        return {
            timestamp: new Date().toISOString(),
            label:
                perimeterFieldCaptureSession.conquestEvents[0] == null
                    ? "Live perimeter conquest"
                    : `${perimeterFieldCaptureSession.conquestEvents[0].previousOwner} -> ${perimeterFieldCaptureSession.conquestEvents[0].newOwner} @ ${perimeterFieldCaptureSession.conquestEvents[0].starId}`,
            conquestEvents: perimeterFieldCaptureSession.conquestEvents,
            previousFrame: perimeterFieldCaptureSession.previousFrame,
            transitionFrames: perimeterFieldCaptureSession.frames,
            nextFrame: null,
        };
    }

    function clampPerimeterFieldFrameIndex(
        frameIndex: number,
        frameCount: number,
    ): number {
        if (frameCount <= 0) return 0;
        return Math.max(0, Math.min(frameCount - 1, Math.round(frameIndex)));
    }

    function buildPerimeterFieldDisplayedFrames(
        previousFrame: PerimeterFieldCapturedFrame,
        frames: ReadonlyArray<PerimeterFieldCapturedTransitionFrame>,
        nextFrame?: PerimeterFieldCapturedFrame | null,
    ): PerimeterFieldDisplayedFrame[] {
        const displayedFrames = [
            {
                frameIndex: 0,
                progress: 0,
                canvas: previousFrame.canvas,
                debugSnapshot: previousFrame.debugSnapshot,
            },
            ...frames.map((frame) => ({
                frameIndex: frame.frameIndex,
                progress: frame.progress,
                canvas: frame.canvas,
                debugSnapshot: frame.debugSnapshot,
            })),
        ];
        if (nextFrame) {
            displayedFrames.push({
                frameIndex: displayedFrames.length,
                progress: 1,
                canvas: nextFrame.canvas,
                debugSnapshot: nextFrame.debugSnapshot,
            });
        }
        return displayedFrames;
    }

    function readSelectedPerimeterFieldReplaySelection():
        | PerimeterFieldReplaySelection
        | null {
        const previewEnabled =
            GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_ENABLED ?? false;
        if (!previewEnabled) return null;

        const replaySlot = Math.max(
            0,
            Math.min(
                3,
                Math.round(GAME_CONFIG.PERIMETER_FIELD_DEBUG_REPLAY_SLOT ?? 0),
            ),
        );

        if (replaySlot > 0) {
            const replay = perimeterFieldReplayHistory[replaySlot - 1];
            if (!replay) return null;
            const replayFrames = buildPerimeterFieldDisplayedFrames(
                replay.previousFrame,
                replay.frames,
                replay.nextFrame,
            );
            const selectedIndex = clampPerimeterFieldFrameIndex(
                GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_FRAME_INDEX ?? 0,
                replayFrames.length,
            );
            return {
                timestamp: replay.timestamp,
                label: replay.label,
                frame: replayFrames[selectedIndex]!,
                frames: replayFrames,
                selectedIndex,
                conquestEvents: replay.conquestEvents,
            };
        }

        if (perimeterFieldCaptureSession) {
            const liveFrames = buildPerimeterFieldDisplayedFrames(
                perimeterFieldCaptureSession.previousFrame,
                perimeterFieldCaptureSession.frames,
            );
            const selectedIndex = clampPerimeterFieldFrameIndex(
                GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_FRAME_INDEX ?? 0,
                liveFrames.length,
            );
            return {
                timestamp: new Date().toISOString(),
                label:
                    perimeterFieldCaptureSession.conquestEvents[0] == null
                        ? "Live perimeter conquest"
                        : `${perimeterFieldCaptureSession.conquestEvents[0].previousOwner} -> ${perimeterFieldCaptureSession.conquestEvents[0].newOwner} @ ${perimeterFieldCaptureSession.conquestEvents[0].starId}`,
                frame: liveFrames[selectedIndex]!,
                frames: liveFrames,
                selectedIndex,
                conquestEvents: perimeterFieldCaptureSession.conquestEvents,
            };
        }

        return null;
    }

    function applyPerimeterFieldReplayPresentation(params: {
        container: PIXI.Container;
        liveRoot: PIXI.Container;
    }): void {
        const selected = readSelectedPerimeterFieldReplaySelection();
        if (!selected) {
            params.liveRoot.visible = true;
            perimeterFieldDebugSnapshotOverride = null;
            if (perimeterFieldReplaySprite) {
                perimeterFieldReplaySprite.visible = false;
            }
            return;
        }

        if (!perimeterFieldReplaySprite) {
            perimeterFieldReplaySprite = new PIXI.Sprite();
            params.container.addChild(perimeterFieldReplaySprite);
        } else if (perimeterFieldReplaySprite.parent !== params.container) {
            params.container.addChild(perimeterFieldReplaySprite);
        }

        if (perimeterFieldReplayTexture) {
            perimeterFieldReplayTexture.destroy(true);
            perimeterFieldReplayTexture = null;
        }
        perimeterFieldReplayTexture = PIXI.Texture.from(selected.frame.canvas);
        perimeterFieldReplaySprite.texture = perimeterFieldReplayTexture;
        perimeterFieldReplaySprite.x = 0;
        perimeterFieldReplaySprite.y = 0;
        perimeterFieldReplaySprite.width = GAME_WIDTH;
        perimeterFieldReplaySprite.height = GAME_HEIGHT;
        perimeterFieldReplaySprite.visible = true;
        params.liveRoot.visible = false;
        perimeterFieldDebugSnapshotOverride = selected.frame.debugSnapshot;
    }

    function finalizePerimeterFieldCaptureSession(params: {
        frame: PerimeterFieldCapturedFrame;
        stars: ReadonlyArray<StarState>;
        nowMs: number;
    }): void {
        const session = perimeterFieldCaptureSession;
        if (!session) return;

        const lastFrame = session.frames[session.frames.length - 1] ?? null;
        if (!lastFrame || lastFrame.progress < 1 - 1e-6) {
            session.frames.push({
                frameIndex: session.frames.length + 1,
                progress: 1,
                canvas: cloneCanvasFrame(params.frame.canvas),
                debugSnapshot: clonePerimeterFieldDebugSnapshot(
                    params.frame.debugSnapshot,
                ),
                compactDebugSnapshot: params.frame.compactDebugSnapshot,
            });
        }

        const transitionFrames = [...session.frames];

        pushPerimeterFieldReplayBundle({
            timestamp: new Date().toISOString(),
            label:
                session.conquestEvents[0] == null
                    ? "Replay"
                    : `${session.conquestEvents[0].previousOwner} -> ${session.conquestEvents[0].newOwner} @ ${session.conquestEvents[0].starId}`,
            conquestEvents: session.conquestEvents.map((event) => ({
                ...event,
                attackerStarIds: [...event.attackerStarIds],
                attackerShipTransfers: [...event.attackerShipTransfers],
            })),
            previousFrame: {
                geometry: session.previousFrame.geometry,
                ownership: session.previousFrame.ownership,
                canvas: cloneCanvasFrame(session.previousFrame.canvas),
                debugSnapshot: clonePerimeterFieldDebugSnapshot(
                    session.previousFrame.debugSnapshot,
                ),
                compactDebugSnapshot:
                    session.previousFrame.compactDebugSnapshot,
            },
            nextFrame: {
                geometry: params.frame.geometry,
                ownership: params.frame.ownership,
                canvas: cloneCanvasFrame(params.frame.canvas),
                debugSnapshot: clonePerimeterFieldDebugSnapshot(
                    params.frame.debugSnapshot,
                ),
                compactDebugSnapshot: params.frame.compactDebugSnapshot,
            },
            frames: transitionFrames
                .filter((entry) => entry.progress > 0 && entry.progress < 1)
                .map((entry) => ({
                    frameIndex: entry.frameIndex,
                    progress: entry.progress,
                    canvas: cloneCanvasFrame(entry.canvas),
                    debugSnapshot: clonePerimeterFieldDebugSnapshot(
                        entry.debugSnapshot,
                    ),
                    compactDebugSnapshot: entry.compactDebugSnapshot,
                })),
        });

        transitionSnapshotRecorder.capturePreRendered({
            ctx: {
                conquestEvents: session.conquestEvents,
                previousGeometry: session.previousFrame.geometry,
                nextGeometry: params.frame.geometry,
                previousOwnership: session.previousFrame.ownership,
                nextOwnership: params.frame.ownership,
                transition: {
                    envelope: null as any,
                    fillFrame: null as any,
                    borderFrame: null as any,
                    geometryVersion: params.frame.geometry.version,
                },
                fillPlan: null,
                activeFrontPlan: null,
                prevFrontierTopology:
                    session.previousFrame.geometry.frontierTopology ?? null,
                nextFrontierTopology:
                    params.frame.geometry.frontierTopology ?? null,
                selection: {
                    geometryMode: "unified_vector",
                    fillTransitionMode: "active_front",
                    borderTransitionMode: "off",
                    ownershipMode: "star_ownership_snapshot",
                    styleMode: "canonical",
                },
                nowMs: params.nowMs,
                starPositions: buildStarPositionsMap(params.stars),
                worldWidth: GAME_WIDTH,
                worldHeight: GAME_HEIGHT,
            },
            prevCanvas: session.previousFrame.canvas,
            nextCanvas: params.frame.canvas,
            transitionFrames: transitionFrames.map((entry) => ({
                progress: entry.progress,
                canvas: entry.canvas,
            })),
            extraDiagnostics: {
                kind: "perimeter_field_live_capture",
                previousFrame: {
                    fullSnapshot: clonePerimeterFieldDebugSnapshot(
                        session.previousFrame.debugSnapshot,
                    ),
                    compactSnapshot:
                        session.previousFrame.compactDebugSnapshot,
                },
                nextFrame: {
                    fullSnapshot: clonePerimeterFieldDebugSnapshot(
                        params.frame.debugSnapshot,
                    ),
                    compactSnapshot: params.frame.compactDebugSnapshot,
                },
                transitionFrames: transitionFrames.map((entry) => ({
                    frameIndex: entry.frameIndex,
                    progress: entry.progress,
                    fullSnapshot: clonePerimeterFieldDebugSnapshot(
                        entry.debugSnapshot,
                    ),
                    compactSnapshot: entry.compactDebugSnapshot,
                })),
            },
        });

        perimeterFieldCaptureSession = null;
        syncPerimeterFieldDebugPlaybackState();
    }

    function syncPerimeterFieldDiagnosticCapture(params: {
        family: PerimeterFieldFamily;
        input: ReturnType<typeof buildRenderFamilyInput>;
        activeTransition: RenderFamilyActiveTransition | null;
        stars: ReadonlyArray<StarState>;
        nowMs: number;
    }): void {
        const perimeterCaptureEnabled =
            GAME_CONFIG.PERIMETER_FIELD_DEBUG_CAPTURE_ENABLED ?? false;
        const shouldCaptureDiagnostics =
            perimeterCaptureEnabled || transitionSnapshotRecorder.isEnabled();
        if (!shouldCaptureDiagnostics) {
            perimeterFieldStableFrame = null;
            perimeterFieldCaptureSession = null;
            perimeterFieldReplayHistory = [];
            perimeterFieldDebugSnapshotOverride = null;
            resetPerimeterFieldDebugPlaybackState();
            return;
        }

        if (!params.input.geometry) return;
        const liveFrame = capturePerimeterFieldLiveFrame({
            family: params.family,
            geometry: params.input.geometry,
            ownership: params.input.ownership,
            debugSnapshot: params.family.debugSnapshot,
        });
        if (!liveFrame) return;

        const transitionKey = buildPerimeterFieldTransitionCaptureKey(
            params.activeTransition,
        );
        if (!transitionKey || !params.activeTransition) {
            if (perimeterFieldCaptureSession) {
                finalizePerimeterFieldCaptureSession({
                    frame: liveFrame,
                    stars: params.stars,
                    nowMs: params.nowMs,
                });
            }
            perimeterFieldStableFrame = liveFrame;
            return;
        }

        if (
            !perimeterFieldCaptureSession ||
            perimeterFieldCaptureSession.key !== transitionKey
        ) {
            perimeterFieldCaptureSession = {
                key: transitionKey,
                conquestEvents: buildPerimeterFieldConquestEvents(
                    params.activeTransition,
                ),
                previousFrame: perimeterFieldStableFrame ?? liveFrame,
                frames: [],
            };
            syncPerimeterFieldDebugPlaybackState();
        }

        recordPerimeterFieldTransitionFrame(
            perimeterFieldCaptureSession,
            params.activeTransition.progress,
            liveFrame,
        );
        syncPerimeterFieldDebugPlaybackState();
    }

    function clearPerimeterFieldDiagnosticCaptures(): void {
        perimeterFieldStableFrame = null;
        perimeterFieldCaptureSession = null;
        perimeterFieldReplayHistory = [];
        perimeterFieldDebugSnapshotOverride = null;
        resetPerimeterFieldDebugPlaybackState();
        GAME_CONFIG.PERIMETER_FIELD_DEBUG_REPLAY_SLOT = 0;
        GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_FRAME_INDEX = 0;
    }

    function resolveActiveTerritoryMode(): string {
        return resolveThemeRenderMode(
            GAME_CONFIG as unknown as Record<string, unknown>,
        ) ?? "none";
    }

    async function exportPerimeterFieldGeometryArtifactFromLiveState(): Promise<void> {
        const activeMode = resolveActiveTerritoryMode();
        if (activeMode !== "perimeter_field") {
            log.warn(
                "PerimeterFieldArtifact",
                `export skipped: active mode is ${activeMode}`,
            );
            return;
        }

        const family = getRenderFamily("perimeter_field");
        if (!(family instanceof PerimeterFieldFamily)) {
            log.warn(
                "PerimeterFieldArtifact",
                "export skipped: perimeter_field family is unavailable",
            );
            return;
        }

        const snapshot =
            perimeterFieldDebugSnapshotOverride ?? family.debugSnapshot;
        if (!snapshot) {
            log.warn(
                "PerimeterFieldArtifact",
                "export skipped: no live perimeter-field debug snapshot is available",
            );
            return;
        }

        const stars = activeGameStore.stars as StarState[];
        const displayStars: StarState[] = mapTranspose.active
            ? stars.map((star) => ({
                  ...star,
                  x: mapTranspose.x(star),
                  y: mapTranspose.y(star),
              }))
            : stars.map((star) => ({ ...star }));
        const lanes = activeGameStore.connections as StarConnection[];

        const { downloadPerimeterFieldGeometryArtifact } = await import(
            "$lib/territory/devtools/perimeterFieldGeometryArtifact"
        );
        await downloadPerimeterFieldGeometryArtifact({
            snapshot,
            stars: displayStars,
            lanes,
            worldWidth: GAME_WIDTH,
            worldHeight: GAME_HEIGHT,
            activeMode,
            replayOverrideActive: Boolean(perimeterFieldDebugSnapshotOverride),
        });
    }

    async function exportPerimeterFieldConquestPackageFromLiveState(): Promise<void> {
        const activeMode = resolveActiveTerritoryMode();
        if (activeMode !== "perimeter_field") {
            log.warn(
                "PerimeterFieldPackage",
                `export skipped: active mode is ${activeMode}`,
            );
            return;
        }

        const capture = readSelectedPerimeterFieldConquestCapture();
        if (!capture || capture.transitionFrames.length === 0) {
            log.warn(
                "PerimeterFieldPackage",
                "export skipped: no captured conquest frames are available for the selected live/replay source",
            );
            return;
        }

        const payload = {
            timestamp: capture.timestamp,
            label: capture.label,
            conquestEvents: capture.conquestEvents,
            previousFrame: {
                frameIndex: 0,
                progress: 0,
                canvas: cloneCanvasFrame(capture.previousFrame.canvas),
                debugSnapshot: clonePerimeterFieldDebugSnapshot(
                    capture.previousFrame.debugSnapshot,
                ),
            },
            transitionFrames: capture.transitionFrames.map((frame) => ({
                frameIndex: frame.frameIndex,
                progress: frame.progress,
                canvas: cloneCanvasFrame(frame.canvas),
                debugSnapshot: clonePerimeterFieldDebugSnapshot(
                    frame.debugSnapshot,
                ),
            })),
            nextFrame: capture.nextFrame
                ? {
                      frameIndex: capture.transitionFrames.length + 1,
                      progress: 1,
                      canvas: cloneCanvasFrame(capture.nextFrame.canvas),
                      debugSnapshot: clonePerimeterFieldDebugSnapshot(
                          capture.nextFrame.debugSnapshot,
                      ),
                  }
                : null,
            starPositions: buildDisplayedStarPositionMap(),
            arrowWidth: GAME_CONFIG.PERIMETER_FIELD_DEBUG_VECTOR_WIDTH ?? 2.5,
            selectedFrameIndex:
                readSelectedPerimeterFieldReplaySelection()?.selectedIndex ?? 0,
            onionSkinCount:
                GAME_CONFIG.PERIMETER_FIELD_DEBUG_ONION_SKIN_COUNT ?? 0,
            strobeStride:
                GAME_CONFIG.PERIMETER_FIELD_DEBUG_STROBE_STRIDE ?? 0,
        };

        const { downloadPerimeterFieldConquestPackage } = await import(
            "$lib/territory/devtools/PerimeterFieldConquestPackage"
        );
        await downloadPerimeterFieldConquestPackage(payload);
    }

    async function exportPerimeterFieldConquestContactSheetFromLiveState(): Promise<void> {
        const activeMode = resolveActiveTerritoryMode();
        if (activeMode !== "perimeter_field") {
            log.warn(
                "PerimeterFieldContactSheet",
                `export skipped: active mode is ${activeMode}`,
            );
            return;
        }

        const capture = readSelectedPerimeterFieldConquestCapture();
        if (!capture || capture.transitionFrames.length === 0) {
            log.warn(
                "PerimeterFieldContactSheet",
                "export skipped: no captured conquest frames are available for the selected live/replay source",
            );
            return;
        }

        const payload = {
            timestamp: capture.timestamp,
            label: capture.label,
            conquestEvents: capture.conquestEvents,
            previousFrame: {
                frameIndex: 0,
                progress: 0,
                canvas: cloneCanvasFrame(capture.previousFrame.canvas),
                debugSnapshot: clonePerimeterFieldDebugSnapshot(
                    capture.previousFrame.debugSnapshot,
                ),
            },
            transitionFrames: capture.transitionFrames.map((frame) => ({
                frameIndex: frame.frameIndex,
                progress: frame.progress,
                canvas: cloneCanvasFrame(frame.canvas),
                debugSnapshot: clonePerimeterFieldDebugSnapshot(
                    frame.debugSnapshot,
                ),
            })),
            nextFrame: capture.nextFrame
                ? {
                      frameIndex: capture.transitionFrames.length + 1,
                      progress: 1,
                      canvas: cloneCanvasFrame(capture.nextFrame.canvas),
                      debugSnapshot: clonePerimeterFieldDebugSnapshot(
                          capture.nextFrame.debugSnapshot,
                      ),
                  }
                : null,
            starPositions: buildDisplayedStarPositionMap(),
            arrowWidth: GAME_CONFIG.PERIMETER_FIELD_DEBUG_VECTOR_WIDTH ?? 2.5,
            selectedFrameIndex:
                readSelectedPerimeterFieldReplaySelection()?.selectedIndex ?? 0,
            onionSkinCount:
                GAME_CONFIG.PERIMETER_FIELD_DEBUG_ONION_SKIN_COUNT ?? 0,
            strobeStride:
                GAME_CONFIG.PERIMETER_FIELD_DEBUG_STROBE_STRIDE ?? 0,
        };

        const { downloadPerimeterFieldConquestContactSheet } = await import(
            "$lib/territory/devtools/PerimeterFieldConquestPackage"
        );
        await downloadPerimeterFieldConquestContactSheet(payload);
    }

    // ── Canonical territory instances (class-encapsulated, no module-level state) ─
    let canonicalBridge: GameCanvasBridge | null = null;
    let canonicalBridgeFallbackLogged = false;
    let canonicalController: TerritoryEngineController | null = null;
    let canonicalControllerTransitionDurationMs: number | null = null;
    let canonicalRenderer: TerritoryRenderer | null = null;
    let renderFamilyGeometryCacheKey: string | null = null;
    let renderFamilyGeometryCache: CanonicalGeometrySnapshot | null = null;

    function buildCanonicalBridgeInput(
        stars: StarState[],
        runtimeSettings: ReturnType<typeof readTerritoryRuntimeSettings>,
    ): TerritoryFrameInput {
        return {
            tickId: activeGameStore.currentTick ?? 0,
            nowMs: fxOrchestrator.gameTime,
            stars,
            lanes: activeGameStore.connections as StarConnection[],
            players:
                activeGameStore.players?.map((player: { id: string }) => ({
                    id: player.id,
                })) ?? [],
            world: {
                width: GAME_WIDTH,
                height: GAME_HEIGHT,
            },
            selection: runtimeSettings.selection,
            tunables: runtimeSettings.tunables,
        };
    }

    function buildRenderFamilyGeometryCacheKey(
        stars: ReadonlyArray<StarState>,
        lanes: ReadonlyArray<StarConnection>,
    ): string {
        let key = `${getTerritoryVisualEpoch()}:${GAME_WIDTH}:${GAME_HEIGHT}:`;
        key += `${GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE}:`;
        key += `${GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN}:${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED}:`;
        key += `${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}:${GAME_CONFIG.TERRITORY_CX_COUNT}:${GAME_CONFIG.TERRITORY_CX_WEIGHT}:`;
        key += `${GAME_CONFIG.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS}:${GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT}:${GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT}:${GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED}:`;
        key += `${GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE}:${GAME_CONFIG.TERRITORY_DX_WEIGHT}:`;
        key += `${GAME_CONFIG.TERRITORY_CLUSTER_SPLIT}:${GAME_CONFIG.VORONOI_BORDER_SMOOTH}:`;
        key += `${GAME_CONFIG.CHAIKIN_BOUNDARY_PAD}:${GAME_CONFIG.CHAIKIN_BOUNDARY_EPS}:`;
        for (const star of stars) {
            key += `${star.id}:${star.ownerId ?? ""}:${star.x}:${star.y}|`;
        }
        key += "::";
        for (const lane of lanes) {
            key += `${lane.sourceId}->${lane.targetId}|`;
        }
        return key;
    }

    function getCurrentRenderFamilyGeometry(
        stars: ReadonlyArray<StarState>,
        lanes: ReadonlyArray<StarConnection>,
    ): CanonicalGeometrySnapshot {
        const key = buildRenderFamilyGeometryCacheKey(stars, lanes);
        if (renderFamilyGeometryCacheKey !== key || !renderFamilyGeometryCache) {
            renderFamilyGeometryCache = buildPerimeterFieldRenderFamilyGeometry({
                stars,
                lanes,
                worldWidth: GAME_WIDTH,
                worldHeight: GAME_HEIGHT,
                nowMs: fxOrchestrator.gameTime,
                ownership: buildOwnershipSnapshotFromStars(stars),
                geometrySource:
                    GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE ?? "power_voronoi_0319",
            });
            renderFamilyGeometryCacheKey = key;
        }
        return renderFamilyGeometryCache;
    }

    // React to animation speed changes from the UI slider
    $effect(() => {
        fxOrchestrator.setAnimationSpeed(animationStore.speedMs);
    });

    // F-107: When stars first populate, set map orientation and sync if needed
    let starsInitialized = false;
    $effect(() => {
        const stars = activeGameStore.stars as StarState[];
        if (!starsInitialized && stars.length > 0) {
            starsInitialized = true;
            requestAnimationFrame(() => {
                updateWorldBounds();
                // Set initial map orientation from generated dimensions
                mapIsPortrait = GAME_HEIGHT > GAME_WIDTH;
                log.sys(
                    "GameCanvas",
                    `Initial map: ${mapIsPortrait ? "portrait" : "landscape"} (${GAME_WIDTH}x${GAME_HEIGHT}), viewport: ${viewportIsPortrait ? "portrait" : "landscape"}`,
                );
                syncOrientationIfNeeded();
                handleResize();
            });
        }
    });
    // Physics State — backed by FXOrchestrator.vsm
    // These aliases let the render loop use the same variable names unchanged.
    let visualShips: Map<string, VisualShipState[]> =
        fxOrchestrator.vsm.orbitShipsMap;
    let visualDamagedShips: Map<string, VisualShipState[]> = new Map();
    let nextShipId = 0; // Unique counter

    // In-flight ships — backed by VSM
    let travelingShips: VisualShipState[] = fxOrchestrator.vsm.travelingShips;

    // Active surge animations — one per star, created from CombatEvents at tick boundary
    let activeSurges: Map<string, SurgeState> = new Map();

    // Tick-synced combat tracking — backed by VSM (used by handlers, NOT by surge V2)
    let starsInCombat: Set<string> = fxOrchestrator.vsm
        .starsInCombat as Set<string>;

    // Delayed star color change — backed by VSM
    let pendingConquests: Map<
        string,
        { previousOwner: string; transitionTime: number }
    > = fxOrchestrator.vsm.pendingConquestsMut as any;

    // Conquest flash — backed by VSM
    let conquestFlashes: Map<string, { startTime: number; duration: number }> =
        fxOrchestrator.vsm.conquestFlashesMut as any;

    // Animation state
    let animationFrameId: number | null = null;
    const emptyStarsMap = new Map<string, StarState>(); // Cached empty map — avoid per-frame allocation
    let resizeObserver: ResizeObserver | null = null;
    let lastTickGameTimeMs = 0; // Game-clock time at last tick (for tickProgress)

    // starsById cache — rebuilt only when star array identity changes (on tick events)
    const cachedStarsById = new Map<string, StarState>();
    let cachedStarsSource: StarState[] | null = null;

    // Previous frame cache removed — animations are event-driven (see POST_MORTEMS.md)

    // Zoom & Pan state
    let baseScale = 1; // Fit-to-screen scale (recalculated on resize)
    let zoomLevel = 1; // User zoom multiplier (1.0 = default fit)
    let panOffsetX = 0; // Pan offset in world coordinates
    let panOffsetY = 0;

    // ── Camera animation state ──
    let cameraAnimating = false;
    let targetZoom = 1;
    let targetPanX = 0;
    let targetPanY = 0;
    const CAMERA_EASE = 0.12; // Lerp factor per frame (0-1, higher = faster)
    const CAMERA_EPSILON = 0.001; // Stop threshold
    let cameraInitialized = false; // First centerAndFit is instant
    const ZOOM_MIN = 0.8; // Max zoom-out: 125% of gameboard visible
    const ZOOM_MAX = 5.0;

    /** Height of the bottom UI overlay — now 0 because CSS Grid sizes the canvas container */
    const BOTTOM_UI_INSET = 0;

    export function centerAndFit() {
        updateWorldBounds();
        if (app && app.stage) {
            const cw = app.screen.width;
            const ch = app.screen.height;
            baseScale = Math.min(cw / contentWidth, ch / contentHeight);
        }
        // First call snaps instantly (no animation from 0,0)
        if (!cameraInitialized) {
            zoomLevel = 1;
            panOffsetX = 0;
            panOffsetY = 0;
            targetZoom = 1;
            targetPanX = 0;
            targetPanY = 0;
            cameraAnimating = false;
            cameraInitialized = true;
            applyZoomTransform();
            return;
        }
        // Animate to default view
        targetZoom = 1;
        targetPanX = 0;
        targetPanY = 0;
        cameraAnimating = true;
    }

    /** Navigate to a specific star by centering the viewport on it */
    export function navigateToStar(starId: string, zoom: number = 2.5) {
        const stars = activeGameStore.stars;
        const star = stars?.find((s: any) => s.id === starId);
        if (!star || !app) return;

        const clampedZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));

        // Use transposed coordinates
        const sx = mapTranspose.x(star);
        const sy = mapTranspose.y(star);

        // Derive target panOffset so star ends up centered
        const cw = app.screen.width;
        const ch = app.screen.height;
        const es = baseScale * clampedZoom;
        const contentCenterX = contentMinX + contentWidth / 2;
        const contentCenterY = contentMinY + contentHeight / 2;
        const baselineX = cw / 2 - contentCenterX * es;
        const baselineY = ch / 2 - contentCenterY * es;
        const desiredStageX = cw / 2 - sx * es;
        const desiredStageY = ch / 2 - sy * es;

        targetZoom = clampedZoom;
        targetPanX = -(desiredStageX - baselineX) / es;
        targetPanY = -(desiredStageY - baselineY) / es;
        cameraAnimating = true;

        log.canvas(
            "navigateToStar",
            `id=${starId} target=(${sx.toFixed(0)},${sy.toFixed(0)}) zoom=${clampedZoom.toFixed(2)}`,
        );
    }

    /** Advance camera animation one frame (called from render loop) */
    function stepCameraAnimation() {
        if (!cameraAnimating) return;

        const dz = targetZoom - zoomLevel;
        const dx = targetPanX - panOffsetX;
        const dy = targetPanY - panOffsetY;

        // Check if close enough to snap
        if (
            Math.abs(dz) < CAMERA_EPSILON &&
            Math.abs(dx) < CAMERA_EPSILON &&
            Math.abs(dy) < CAMERA_EPSILON
        ) {
            zoomLevel = targetZoom;
            panOffsetX = targetPanX;
            panOffsetY = targetPanY;
            cameraAnimating = false;
        } else {
            zoomLevel += dz * CAMERA_EASE;
            panOffsetX += dx * CAMERA_EASE;
            panOffsetY += dy * CAMERA_EASE;
        }

        applyZoomTransform();
    }

    const ZOOM_STEP = 0.1; // Per scroll notch
    let isPanning = false; // Middle-mouse-button or spacebar pan
    let isSpaceHeld = false; // Spacebar held for pan mode
    let panStartScreenX = 0;
    let panStartScreenY = 0;
    let panStartOffsetX = 0;
    let panStartOffsetY = 0;

    // Multi-touch gesture state
    const activePointers = new Map<number, { x: number; y: number }>();
    let isPinching = false;
    let pinchStartDist = 0;
    let pinchStartZoom = 1;
    let pinchCenterX = 0;
    let pinchCenterY = 0;

    // Long-press and double-tap state
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let lastTapTime = 0;
    let lastTapStarId: string | null = null;
    const LONG_PRESS_MS = 500;
    const DOUBLE_TAP_MS = 300;

    function clearLongPress() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }

    function getPinchDist(): number {
        const pts = Array.from(activePointers.values());
        if (pts.length < 2) return 0;
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getPinchCenter(): { x: number; y: number } {
        const pts = Array.from(activePointers.values());
        if (pts.length < 2) return { x: 0, y: 0 };
        return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    }

    // Input state
    let isDragging = false;
    let dragSourceId: string | null = null;
    let dragStartX = 0; // Click position (for movement detection)
    let dragStartY = 0;
    let dragSourceCenterX = 0; // Star center (for visual preview)
    let dragSourceCenterY = 0;
    let dragCurrentX = 0;
    let dragCurrentY = 0;

    // Active star state (for click+click selection)
    let activeStarId: string | null = null;
    let pendingOrders: Set<string> = new Set(); // OPTIMISTIC UI: Track ordered links immediately
    let deferredOrders: Set<string> = new Set(); // Track deferred orders (through enemy stars)
    let lastSessionId: number = -1; // Track game session to reset state on new game

    // Track order chain depth for audio
    let orderChainDepth = 0;

    // Helper: Add pending order and clean up conflicting orders
    function addPendingOrder(
        sourceId: string,
        targetId: string,
        isDeferred: boolean = false,
    ) {
        // Validate both stars exist in current data source
        const currentStars = activeGameStore.stars as StarState[];
        if (currentStars.length === 0) return;

        const sourceExists = currentStars.some((s) => s.id === sourceId);
        const targetExists = currentStars.some((s) => s.id === targetId);
        if (!sourceExists || !targetExists) return;

        const key = `${sourceId}|${targetId}`;

        if (isDeferred) {
            // For deferred orders, allow one per enemy star
            deferredOrders.forEach((k) => {
                if (k.startsWith(`${sourceId}|`)) {
                    deferredOrders.delete(k);
                }
            });
            deferredOrders.add(key);
        } else {
            // Remove any old order from source (source can only have one target)
            pendingOrders.forEach((k) => {
                if (k.startsWith(`${sourceId}|`)) {
                    pendingOrders.delete(k);
                }
            });
            // Remove opposite flow for same-owner stars (A→B cancels B→A) unless opposing allowed
            if (!GAME_CONFIG.ALLOW_OPPOSING_ORDERS) {
                pendingOrders.delete(`${targetId}|${sourceId}`);
            }
            // Add new order
            pendingOrders.add(key);
        }

        // Play order sound (ascending notes for chains)
        audioManager.play("click");
        orderChainDepth++;
    }

    // ============================================================================
    // Color Utilities — Delegated to extracted module
    // ============================================================================
    const colorUtils = createColorUtils(
        (ownerId) => activeGameStore.getPlayerColor(ownerId) ?? undefined,
    );

    // Helper: Check if star is owned by local player
    function isLocalPlayerStar(star: StarState): boolean {
        return activeGameStore.isLocalStar(star as any);
    }

    // Helper: Issue order via unified store
    function doIssueOrder(
        sourceId: string,
        targetId: string,
        persist: boolean,
    ): boolean {
        const targetStar = activeGameStore.stars.find((s) => s.id === targetId);
        if (targetStar) {
            audioManager.play(
                isLocalPlayerStar(targetStar) ? "move" : "attack",
            );
        }
        activeGameStore.issueOrder(sourceId, targetId, persist);
        return true;
    }

    // Helper: Cancel order via unified store
    function doCancelOrder(starId: string): void {
        activeGameStore.cancelOrder(starId);
    }

    // Helper: Set deferred order via unified store
    function doSetDeferredOrder(
        sourceId: string,
        targetId: string,
        persist: boolean,
    ): boolean {
        const targetStar = activeGameStore.stars.find((s) => s.id === targetId);
        if (targetStar) {
            audioManager.play(
                isLocalPlayerStar(targetStar) ? "move" : "attack",
            );
        }
        activeGameStore.setDeferredOrder(sourceId, targetId, persist);
        return true;
    }

    // ============================================================================
    // Lifecycle
    // ============================================================================

    onMount(async () => {
        log.sys("GameCanvas", "Initializing PixiJS application");

        app = new PIXI.Application();

        await app.init({
            background: 0x000000,
            backgroundAlpha: 0,
            resizeTo: canvasContainer,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        // Append canvas to container
        canvasContainer.appendChild(app.canvas);

        // Create container hierarchy + textures via factory
        const containers = createContainers(app.stage);
        ({
            linkGraphics,
            starsContainer,
            glowContainer,
            shipsContainer,
            connectionGraphics,
            selectionOverlayGraphics,
            labelsContainer,
            dragPreviewGraphics,
            territoryGraphics,
            voronoiContainer,
        } = containers);
        const textures = initShipRendering(containers);
        shipCircleTexture = textures.shipCircle;
        glowTexture = textures.starGlow;
        shipParticleContainer = containers.shipParticleContainer;
        orbGraphics = containers.orbGraphics;

        // L5: Faint nebula background — uses same image as main menu
        // Respect "no background" choice: if BG_IMAGE_URL is empty, skip loading
        const bgImagePath = normalizeBgImagePath(GAME_CONFIG.BG_IMAGE_URL);
        if (bgImagePath !== GAME_CONFIG.BG_IMAGE_URL) {
            GAME_CONFIG.BG_IMAGE_URL = bgImagePath;
        }
        const bgSprite = new PIXI.Sprite();
        bgSprite.anchor.set(0.5, 0.5);
        bgSprite.alpha = GAME_CONFIG.BG_IMAGE_ALPHA ?? 0.5;
        app.stage.addChildAt(bgSprite, 0); // Bottom-most layer
        (app as any)._nebulaBgSprite = bgSprite;

        if (bgImagePath) {
            try {
                const bgTexture = await PIXI.Assets.load(
                    `/assets/${bgImagePath}`,
                );
                bgSprite.texture = bgTexture;
                bgSprite.visible = true;
            } catch {
                bgSprite.visible = false;
            }
        } else {
            bgSprite.visible = false;
        }
        // Size and position will be set in handleResize when GAME_WIDTH/HEIGHT are known

        // Live background swap via settings panel
        const handleBgChange = async (e: Event) => {
            const img = normalizeBgImagePath(
                (e as CustomEvent).detail as string,
            );
            const sprite = (app as any)?._nebulaBgSprite as
                | PIXI.Sprite
                | undefined;
            if (!sprite) return;
            if (!img) {
                sprite.visible = false;
                return;
            }
            try {
                const tex = await PIXI.Assets.load(`/assets/${img}`);
                sprite.texture = tex;
                sprite.visible = true;
                sprite.alpha = GAME_CONFIG.BG_IMAGE_ALPHA ?? 0.5;
                // Recalculate cover-scale for the new texture dimensions
                handleResize();
            } catch {
                sprite.visible = false;
            }
        };
        window.addEventListener("pax-bg-change", handleBgChange);

        // Live alpha adjustment via slider
        const handleBgAlpha = (e: Event) => {
            const alpha = (e as CustomEvent).detail as number;
            const sprite = (app as any)?._nebulaBgSprite as
                | PIXI.Sprite
                | undefined;
            if (sprite) sprite.alpha = alpha;
        };
        window.addEventListener("pax-bg-alpha-change", handleBgAlpha);

        handlePerimeterFieldArtifactExport = () => {
            void exportPerimeterFieldGeometryArtifactFromLiveState();
        };
        window.addEventListener(
            "pax-export-perimeter-field-geometry-artifact",
            handlePerimeterFieldArtifactExport,
        );
        handlePerimeterFieldConquestPackageExport = () => {
            void exportPerimeterFieldConquestPackageFromLiveState();
        };
        window.addEventListener(
            "pax-export-perimeter-field-conquest-package",
            handlePerimeterFieldConquestPackageExport,
        );
        handlePerimeterFieldContactSheetExport = () => {
            void exportPerimeterFieldConquestContactSheetFromLiveState();
        };
        window.addEventListener(
            "pax-export-perimeter-field-contact-sheet",
            handlePerimeterFieldContactSheetExport,
        );
        handlePerimeterFieldCaptureClear = () => {
            clearPerimeterFieldDiagnosticCaptures();
        };
        window.addEventListener(
            "pax-clear-perimeter-field-captures",
            handlePerimeterFieldCaptureClear,
        );

        log.success(
            "GameCanvas",
            `PixiJS initialized (${app.screen.width}x${app.screen.height})`,
        );

        // Apply initial scale transformation
        handleResize();

        // Start animation loop
        startAnimationLoop();

        // Handle window resize
        window.addEventListener("resize", handleResize);

        // Use ResizeObserver for more accurate container resize detection
        resizeObserver = new ResizeObserver(() => {
            handleResize();
        });
        resizeObserver.observe(canvasContainer);
    });

    onDestroy(() => {
        log.sys("GameCanvas", "Destroying PixiJS application");

        window.removeEventListener("resize", handleResize);
        if (handlePerimeterFieldArtifactExport) {
            window.removeEventListener(
                "pax-export-perimeter-field-geometry-artifact",
                handlePerimeterFieldArtifactExport,
            );
            handlePerimeterFieldArtifactExport = null;
        }
        if (handlePerimeterFieldConquestPackageExport) {
            window.removeEventListener(
                "pax-export-perimeter-field-conquest-package",
                handlePerimeterFieldConquestPackageExport,
            );
            handlePerimeterFieldConquestPackageExport = null;
        }
        if (handlePerimeterFieldContactSheetExport) {
            window.removeEventListener(
                "pax-export-perimeter-field-contact-sheet",
                handlePerimeterFieldContactSheetExport,
            );
            handlePerimeterFieldContactSheetExport = null;
        }
        if (handlePerimeterFieldCaptureClear) {
            window.removeEventListener(
                "pax-clear-perimeter-field-captures",
                handlePerimeterFieldCaptureClear,
            );
            handlePerimeterFieldCaptureClear = null;
        }

        // F-107: Remove orientation listener and reset transpose flag
        if (orientationQuery) {
            orientationQuery.removeEventListener("change", onOrientationChange);
        }
        mapTranspose.active = false;

        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        if (app) {
            app.destroy(true, { children: true });
            app = null;
        }
        for (const label of rulerLabels) {
            label.destroy();
        }
        rulerLabels = [];
        canonicalBridge?.reset();
        canonicalBridge = null;
        canonicalController = null;
        canonicalControllerTransitionDurationMs = null;
        canonicalRenderer = null;

        starGraphics.clear();
        starLabels.clear();
        linkGraphics = null;
        starsContainer = null;
        glowContainer = null;
        glowSprites.clear();
        glowTexture = null;
        shipsContainer = null;
        shipParticleContainer = null;
        orbGraphics = null;
        labelsContainer = null;
    });

    // ============================================================================
    // Animation Loop
    // ============================================================================

    function startAnimationLoop() {
        let lastTime = performance.now();

        const loop = (currentTime: number) => {
            lastTime = currentTime;

            // Tick FXClock per-frame (pause-aware game time for all ship animations)
            const isPaused = activeGameStore.isPaused;

            // Initialize lastTickGameTimeMs on first frame so tickProgress starts at 0
            if (lastTickGameTimeMs === 0)
                lastTickGameTimeMs = fxOrchestrator.gameTime;
            if (isPaused && !fxOrchestrator.clock.isPaused)
                fxOrchestrator.pause();
            if (!isPaused && fxOrchestrator.clock.isPaused)
                fxOrchestrator.resume();
            fxOrchestrator.update(
                currentTime,
                emptyStarsMap,
                activeGameStore.effectiveTickMs,
            );

            // Render the current frame from unified store
            const stars = activeGameStore.stars as StarState[];
            if (stars.length > 0 && app) {
                // Pre-map coordinates for display (applies transpose + axis flip if active)
                const displayStars: StarState[] = mapTranspose.active
                    ? stars.map((s) => ({
                          ...s,
                          x: mapTranspose.x(s),
                          y: mapTranspose.y(s),
                      }))
                    : stars;
                // Compute tickProgress from game time (NOT wall clock)
                const gameNowMs = fxOrchestrator.gameTime;
                const tickProgress = isPaused
                    ? 0
                    : Math.min(
                          (gameNowMs - lastTickGameTimeMs) /
                              activeGameStore.effectiveTickMs,
                          1,
                      );
                renderFrame(displayStars, tickProgress);
            }

            // Advance camera animation (lerp toward target each frame)
            stepCameraAnimation();

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
    }

    // ============================================================================
    // Rendering
    // ============================================================================

    // Content bounding box (dynamic — computed from star positions)
    // These describe the actual star content area, NOT starting at (0,0)
    let contentMinX = 0;
    let contentMinY = 0;
    let contentWidth = 1600;
    let contentHeight = 900;
    // Legacy aliases used by bg sprite sizing
    let GAME_WIDTH = 1600;
    let GAME_HEIGHT = 900;

    /** Recompute world bounds from display positions (respects transpose) */
    function updateWorldBounds() {
        const currentStars = activeGameStore.stars as StarState[];
        if (!currentStars || currentStars.length === 0) return;
        let minX = Infinity,
            minY = Infinity;
        let maxX = -Infinity,
            maxY = -Infinity;
        for (const s of currentStars) {
            const dx = mapTranspose.x(s);
            const dy = mapTranspose.y(s);
            if (dx < minX) minX = dx;
            if (dy < minY) minY = dy;
            if (dx > maxX) maxX = dx;
            if (dy > maxY) maxY = dy;
        }
        // Add padding (star radius + orbits)
        const pad = 80;
        contentMinX = minX - pad;
        contentMinY = minY - pad;
        contentWidth = maxX - minX + 2 * pad;
        contentHeight = maxY - minY + 2 * pad;
        // Legacy — used by bg sprite and territory renderers
        GAME_WIDTH = maxX + pad;
        GAME_HEIGHT = maxY + pad;

        log.canvas(
            "WorldBounds",
            `stars=${currentStars.length} min=(${minX.toFixed(0)},${minY.toFixed(0)}) max=(${maxX.toFixed(0)},${maxY.toFixed(0)}) content=(${contentMinX.toFixed(0)},${contentMinY.toFixed(0)} ${contentWidth.toFixed(0)}x${contentHeight.toFixed(0)}) transpose=${mapTranspose.active}`,
        );
    }

    /** DEBUG: Draw a bright yellow rectangle showing content bounds */
    function drawDebugWorldBounds() {
        if (!app) return;
        let dbg = (app as any)._debugBoundsGfx as PIXI.Graphics | undefined;
        if (!dbg) {
            dbg = new PIXI.Graphics();
            app.stage.addChild(dbg);
            (app as any)._debugBoundsGfx = dbg;
        }
        dbg.clear();
        // Yellow border around actual content bounds
        dbg.rect(contentMinX, contentMinY, contentWidth, contentHeight);
        dbg.stroke({ color: 0xffff00, width: 3 });
        // Crosshair at content center
        const cx = contentMinX + contentWidth / 2;
        const cy = contentMinY + contentHeight / 2;
        dbg.moveTo(cx - 30, cy).lineTo(cx + 30, cy);
        dbg.moveTo(cx, cy - 30).lineTo(cx, cy + 30);
        dbg.stroke({ color: 0xff00ff, width: 2 });
    }

    // ── F-107: Portrait Map Orientation ──────────────────────────────────
    // Simple approach:
    // 1. Track viewport orientation via matchMedia (fires reliably on rotation)
    // 2. Track current map orientation as a boolean
    // 3. Transpose star x↔y when they don't match
    let viewportIsPortrait =
        typeof window !== "undefined"
            ? window.matchMedia("(orientation: portrait)").matches
            : false;
    let mapIsPortrait = false; // Set when stars first load

    function resetTerritoryRenderCaches() {
        resetVoronoiCache();
        resetMetaballCache();
        resetPixelTerritoryCache();
        resetLaneTerritoryCache();
        resetContourTerritoryCache();
        resetModifiedVoronoiCache();
        resetPowerVoronoiCache();
        resetPVV2DY4Cache();
        resetPVV3Cache();
        resetTerritoryEngineCaches();
        resetDistanceFieldTerritoryCache();
    }

    /** Toggle the transpose flag — 90° CCW rotation matching physical device rotation */
    function transposeStarCoordinates() {
        // Set map width BEFORE toggling so the axis flip uses pre-transpose width
        mapTranspose.mapWidth = GAME_WIDTH;
        mapTranspose.active = !mapTranspose.active;
        // Flip the map orientation flag
        mapIsPortrait = !mapIsPortrait;
        // Reset territory caches since display positions changed
        resetTerritoryRenderCaches();
        // Clear ALL visual ship positions so they re-spawn at transposed coords
        // (ships store x/y, laneStartX/Y, laneEndX/Y in old coordinate space)
        visualDamagedShips.clear();
        visualShips.clear();
        travelingShips.length = 0;
        fxOrchestrator.vsm.travelingShips.length = 0;
        // Recompute world bounds with new display positions
        updateWorldBounds();
        log.sys(
            "GameCanvas",
            `Transposed stars → map is now ${mapIsPortrait ? "portrait" : "landscape"} (${GAME_WIDTH}x${GAME_HEIGHT})`,
        );
    }

    /** Transpose if viewport orientation doesn't match map orientation */
    function syncOrientationIfNeeded() {
        if (viewportIsPortrait !== mapIsPortrait) {
            transposeStarCoordinates();
            // Reset pan/zoom so map fully reframes
            zoomLevel = 1;
            panOffsetX = 0;
            panOffsetY = 0;
            log.sys(
                "GameCanvas",
                `Orientation synced: viewport=${viewportIsPortrait ? "portrait" : "landscape"}, map=${mapIsPortrait ? "portrait" : "landscape"}`,
            );
        }
    }

    // Listen for orientation changes via matchMedia (reliable on mobile)
    const orientationQuery =
        typeof window !== "undefined"
            ? window.matchMedia("(orientation: portrait)")
            : null;

    function onOrientationChange(e: MediaQueryListEvent) {
        viewportIsPortrait = e.matches;
        log.sys(
            "GameCanvas",
            `Orientation changed → viewport is now ${viewportIsPortrait ? "portrait" : "landscape"}`,
        );
        syncOrientationIfNeeded();
        handleResize();
    }

    if (orientationQuery) {
        orientationQuery.addEventListener("change", onOrientationChange);
    }

    function handleResize() {
        if (!app || !app.renderer) return;

        app.resize();

        // F-107: Orientation is handled by matchMedia listener (onOrientationChange)

        // Recompute world bounds from star positions
        updateWorldBounds();

        // Calculate base scale to fit content bounding box in container
        const containerWidth = app.screen.width;
        const containerHeight = app.screen.height;

        baseScale = Math.min(
            containerWidth / contentWidth,
            containerHeight / contentHeight,
        );

        // Size nebula background to cover visible viewport (not just game world)
        const bgSprite = (app as any)._nebulaBgSprite as
            | PIXI.Sprite
            | undefined;
        if (bgSprite && bgSprite.texture) {
            const effectiveScale = baseScale * zoomLevel;
            const viewWorldW = containerWidth / effectiveScale;
            const viewWorldH = containerHeight / effectiveScale;
            const coverW = Math.max(GAME_WIDTH, viewWorldW) * 1.2;
            const coverH = Math.max(GAME_HEIGHT, viewWorldH) * 1.2;
            bgSprite.x = GAME_WIDTH / 2;
            bgSprite.y = GAME_HEIGHT / 2;
            const texW = bgSprite.texture.width;
            const texH = bgSprite.texture.height;
            const coverScale = Math.max(coverW / texW, coverH / texH);
            bgSprite.scale.set(coverScale);
        }

        // Apply combined scale + zoom
        applyZoomTransform();

        const canvasEl = canvasContainer;
        log.canvas(
            "handleResize",
            `container=${containerWidth.toFixed(0)}x${containerHeight.toFixed(0)} content=(${contentMinX.toFixed(0)},${contentMinY.toFixed(0)} ${contentWidth.toFixed(0)}x${contentHeight.toFixed(0)}) baseScale=${baseScale.toFixed(4)} dpr=${window.devicePixelRatio} cssGrid(el)=${canvasEl?.clientWidth ?? "?"}x${canvasEl?.clientHeight ?? "?"} viewport=${window.innerWidth}x${window.innerHeight}`,
        );
    }

    function applyZoomTransform() {
        if (!app) return;

        const cw = app.screen.width;
        const ch = app.screen.height;
        const es = baseScale * zoomLevel;

        app.stage.scale.set(es, es);

        // Center on content bounding box, then apply pan offset
        const contentCenterX = contentMinX + contentWidth / 2;
        const contentCenterY = contentMinY + contentHeight / 2;
        const baselineX = cw / 2 - contentCenterX * es;
        const baselineY = ch / 2 - contentCenterY * es;

        app.stage.x = baselineX - panOffsetX * es;
        app.stage.y = baselineY - panOffsetY * es;

        // Update bg sprite to cover visible viewport at current zoom
        const bgSprite = (app as any)._nebulaBgSprite as
            | PIXI.Sprite
            | undefined;
        if (bgSprite && bgSprite.texture) {
            const viewWorldW = cw / es;
            const viewWorldH = ch / es;
            const coverW = Math.max(GAME_WIDTH, viewWorldW) * 1.2;
            const coverH = Math.max(GAME_HEIGHT, viewWorldH) * 1.2;
            const texW = bgSprite.texture.width;
            const texH = bgSprite.texture.height;
            bgSprite.scale.set(Math.max(coverW / texW, coverH / texH));
        }

        clampPan();
    }

    function clampPan() {
        if (!app) return;

        const cw = app.screen.width;
        const ch = app.screen.height;
        const es = baseScale * zoomLevel;
        const scaledContentW = contentWidth * es;
        const scaledContentH = contentHeight * es;

        // Only allow pan when zoomed-in content exceeds viewport
        const overflowX = Math.max(0, (scaledContentW - cw) / 2);
        const overflowY = Math.max(0, (scaledContentH - ch) / 2);
        const maxPanX = overflowX / es;
        const maxPanY = overflowY / es;

        panOffsetX = Math.max(-maxPanX, Math.min(maxPanX, panOffsetX));
        panOffsetY = Math.max(-maxPanY, Math.min(maxPanY, panOffsetY));

        // Reapply position after clamp
        const contentCenterX = contentMinX + contentWidth / 2;
        const contentCenterY = contentMinY + contentHeight / 2;
        const baselineX = cw / 2 - contentCenterX * es;
        const baselineY = ch / 2 - contentCenterY * es;
        app.stage.x = baselineX - panOffsetX * es;
        app.stage.y = baselineY - panOffsetY * es;
    }

    function handleWheel(event: WheelEvent) {
        log.input(
            `⚙ wheel deltaY=${event.deltaY.toFixed(0)} @(${event.clientX},${event.clientY})`,
        );
        event.preventDefault();
        if (!app) return;
        cameraAnimating = false; // Cancel any in-progress animation

        const rect = canvasContainer.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        // World point under cursor BEFORE zoom
        const worldBefore = screenToWorld(screenX, screenY);

        // Apply zoom
        const direction = event.deltaY < 0 ? 1 : -1;
        const oldZoom = zoomLevel;
        zoomLevel = Math.max(
            ZOOM_MIN,
            Math.min(ZOOM_MAX, zoomLevel + direction * ZOOM_STEP),
        );

        if (zoomLevel === oldZoom) return; // Hit limit

        // Anchor: adjust pan so the same world point stays under cursor
        // Must match the transform in applyZoomTransform (content-centered)
        const effectiveScale = baseScale * zoomLevel;
        const containerWidth = app.screen.width;
        const containerHeight = app.screen.height;
        const contentCenterX = contentMinX + contentWidth / 2;
        const contentCenterY = contentMinY + contentHeight / 2;
        const baselineX = containerWidth / 2 - contentCenterX * effectiveScale;
        const baselineY = containerHeight / 2 - contentCenterY * effectiveScale;

        // worldBefore should remain under cursor after transform:
        // screenX = baselineX - panOffsetX * es + worldBefore.x * es
        // => panOffsetX = worldBefore.x - (screenX - baselineX) / es
        panOffsetX = worldBefore.x - (screenX - baselineX) / effectiveScale;
        panOffsetY = worldBefore.y - (screenY - baselineY) / effectiveScale;

        applyZoomTransform();
    }

    function resetZoom() {
        zoomLevel = 1;
        panOffsetX = 0;
        panOffsetY = 0;
        applyZoomTransform();
    }

    function renderDebugGrid() {
        if (!starsContainer?.parent) return;

        if (!debugGraphics) {
            debugGraphics = new PIXI.Graphics();
            // Add above voronoiContainer so hex grid is visible over territory fills
            const stageParent = starsContainer.parent;
            const voronoiIdx = stageParent.children.indexOf(voronoiContainer!);
            stageParent.addChildAt(
                debugGraphics,
                voronoiIdx >= 0 ? voronoiIdx + 1 : stageParent.children.length,
            );
        }
        if (!debugTextContainer) {
            debugTextContainer = new PIXI.Container();
            const stageParent = starsContainer.parent;
            const debugIndex = stageParent.children.indexOf(debugGraphics!);
            stageParent.addChildAt(
                debugTextContainer,
                debugIndex >= 0 ? debugIndex + 1 : stageParent.children.length,
            );
        }

        debugGraphics.clear();
        if (debugTextContainer) {
            const children = debugTextContainer.removeChildren();
            for (const child of children) child.destroy();
        }

        if (GAME_CONFIG.SHOW_HEX_GRID && GAME_CONFIG._MAP_HEX_RADIUS > 0) {
            // Use exact same parameters that generated the map
            const hexRadius = GAME_CONFIG._MAP_HEX_RADIUS;
            const paddingX = GAME_CONFIG._MAP_PADDING_X;
            const paddingY = GAME_CONFIG._MAP_PADDING_Y;
            const gridWidth = GAME_CONFIG._MAP_WIDTH - paddingX * 2;
            const gridHeight = GAME_CONFIG._MAP_HEIGHT - paddingY * 2;

            const hexes = generateHexGrid(gridWidth, gridHeight, hexRadius);

            hexes.forEach((h) => {
                const cx = h.x + paddingX;
                const cy = h.y + paddingY;
                drawHex(debugGraphics!, cx, cy, hexRadius * 0.95);
            });

            debugGraphics.stroke({ width: 1, color: 0x00ff00, alpha: 0.3 });
        }

        renderRulerOverlay(debugGraphics);
    }

    function getPerimeterDebugLoops(
        geometry: CanonicalGeometrySnapshot,
    ): ReadonlyArray<ReadonlyArray<[number, number]>> {
        const shellLoops = geometry.shellLoops.filter(
            (loop) => loop.classification === "outer" && Boolean(loop.ownerId),
        );
        if (shellLoops.length > 0) {
            return shellLoops.map((loop) => loop.points);
        }
        return geometry.territoryRegions
            .filter((region) => Boolean(region.ownerId))
            .map((region) => region.points);
    }

    function drawClosedPolyline(
        g: PIXI.Graphics,
        points: ReadonlyArray<[number, number]>,
        color: number,
        alpha: number,
        width: number,
    ): void {
        if (points.length < 2) return;
        g.beginPath();
        g.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            g.lineTo(points[i][0], points[i][1]);
        }
        g.lineTo(points[0][0], points[0][1]);
        g.stroke({ color, alpha, width });
    }

    function drawSamplePoints(
        g: PIXI.Graphics,
        samples: ReadonlyArray<{
            id?: string;
            x: number;
            y: number;
            playerIdx?: number;
            ownerId?: string;
            ownerColor?: number;
            debugState?: string;
            sampleIndex?: number;
            pathStartX?: number;
            pathStartY?: number;
            pathEndX?: number;
            pathEndY?: number;
            startFallback?: boolean;
            endFallback?: boolean;
        }>,
        stateColor: number,
        alpha: number,
        radius: number,
    ): void {
        const darkenColor = (color: number, factor: number): number => {
            const r = Math.max(0, Math.min(255, Math.round(((color >> 16) & 0xff) * factor)));
            const g = Math.max(0, Math.min(255, Math.round(((color >> 8) & 0xff) * factor)));
            const b = Math.max(0, Math.min(255, Math.round((color & 0xff) * factor)));
            return (r << 16) | (g << 8) | b;
        };

        for (const sample of samples) {
            const fillColor =
                sample.ownerColor ??
                (sample.ownerId != null
                    ? colorUtils.getPlayerColor(sample.ownerId)
                    : stateColor);
            const borderColor = darkenColor(fillColor, 0.42);
            const outerRadius = radius;
            const innerRadius = Math.max(1.2, radius * 0.45);
            const spikeCount = 5;
            const startAngle = -Math.PI / 2;
            const points: number[] = [];

            for (let i = 0; i < spikeCount; i++) {
                const outerAngle =
                    startAngle + (i * Math.PI * 2) / spikeCount;
                const innerAngle = outerAngle + Math.PI / spikeCount;
                points.push(
                    sample.x + Math.cos(outerAngle) * outerRadius,
                    sample.y + Math.sin(outerAngle) * outerRadius,
                    sample.x + Math.cos(innerAngle) * innerRadius,
                    sample.y + Math.sin(innerAngle) * innerRadius,
                );
            }
            g.circle(sample.x, sample.y, outerRadius + 1.6);
            g.stroke({
                color: fillColor,
                alpha: 0.42,
                width: Math.max(0.8, radius * 0.42),
            });
            g.poly(points, true);
            g.fill({ color: fillColor, alpha: Math.max(0.92, alpha) });
            g.stroke({
                color: borderColor,
                alpha: 0.95,
                width: Math.max(0.9, radius * 0.32),
            });
        }
    }

    function drawPerimeterSampleTrajectories(
        g: PIXI.Graphics,
        samples: ReadonlyArray<{
            x: number;
            y: number;
            ownerColor?: number;
            ownerId?: string;
            debugState?: string;
            pathStartX?: number;
            pathStartY?: number;
            pathEndX?: number;
            pathEndY?: number;
            startFallback?: boolean;
            endFallback?: boolean;
        }>,
    ): void {
        const drawFallbackX = (x: number, y: number) => {
            g.moveTo(x - 2.5, y - 2.5);
            g.lineTo(x + 2.5, y + 2.5);
            g.moveTo(x + 2.5, y - 2.5);
            g.lineTo(x - 2.5, y + 2.5);
            g.stroke({ color: 0xff3b30, alpha: 0.95, width: 1.2 });
        };

        for (const sample of samples) {
            if (
                sample.pathStartX == null ||
                sample.pathStartY == null ||
                sample.pathEndX == null ||
                sample.pathEndY == null
            ) {
                continue;
            }

            const ownerColor =
                sample.ownerColor ??
                (sample.ownerId != null
                    ? colorUtils.getPlayerColor(sample.ownerId)
                    : 0xffffff);
            const lineAlpha =
                sample.debugState === "transition-old" ? 0.28 : 0.38;

            g.moveTo(sample.pathStartX, sample.pathStartY);
            g.lineTo(sample.pathEndX, sample.pathEndY);
            g.stroke({ color: ownerColor, alpha: lineAlpha, width: 1.15 });

            g.circle(sample.pathStartX, sample.pathStartY, 1.4);
            g.stroke({ color: ownerColor, alpha: 0.65, width: 1 });

            g.rect(sample.pathEndX - 1.6, sample.pathEndY - 1.6, 3.2, 3.2);
            g.stroke({ color: ownerColor, alpha: 0.72, width: 1 });

            if (sample.startFallback) {
                drawFallbackX(sample.pathStartX, sample.pathStartY);
            }
            if (sample.endFallback) {
                drawFallbackX(sample.pathEndX, sample.pathEndY);
            }
        }
    }

    function drawPerimeterSampleLabels(
        container: PIXI.Container,
        samples: ReadonlyArray<{
            x: number;
            y: number;
            sampleIndex?: number;
            ownerColor?: number;
            ownerId?: string;
            debugState?: string;
        }>,
    ): void {
        for (const sample of samples) {
            if (sample.sampleIndex == null) continue;
            const ownerColor =
                sample.ownerColor ??
                (sample.ownerId != null
                    ? colorUtils.getPlayerColor(sample.ownerId)
                    : 0xffffff);
            const labelPrefix =
                sample.debugState === "transition-old"
                    ? "O"
                    : sample.debugState === "transition-new"
                      ? "N"
                      : sample.debugState === "target"
                        ? "T"
                        : "S";
            const offsetX =
                sample.debugState === "transition-old"
                    ? -10
                    : sample.debugState === "transition-new"
                      ? 10
                      : sample.debugState === "target"
                        ? 10
                        : -10;
            const offsetY =
                sample.debugState === "transition-old"
                    ? -10
                    : sample.debugState === "transition-new"
                      ? 10
                      : sample.debugState === "target"
                        ? -10
                        : 10;
            const label = new PIXI.Text({
                text: `${labelPrefix}${sample.sampleIndex}`,
                style: {
                    fontFamily: "monospace",
                    fontSize: 10,
                    fontWeight: "700",
                    fill: ownerColor,
                    stroke: { color: 0x081018, width: 3 },
                },
            });
            label.anchor.set(0.5);
            label.x = sample.x + offsetX;
            label.y = sample.y + offsetY;
            container.addChild(label);
        }
    }

    function getPerimeterDiagnosticSampleKey(sample: {
        id?: string;
        ownerId?: string;
        sourceId?: string;
        sampleIndex?: number;
    }): string {
        return (
            sample.id ??
            [
                sample.ownerId ?? "owner",
                sample.sourceId ?? "source",
                sample.sampleIndex ?? "sample",
            ].join(":")
        );
    }

    function drawPerimeterGhostSamples(params: {
        graphics: PIXI.Graphics;
        samples: ReadonlyArray<{
            x: number;
            y: number;
            ownerColor?: number;
            ownerId?: string;
        }>;
        alpha: number;
        radius: number;
        mode: "past" | "future";
    }): void {
        for (const sample of params.samples) {
            const ownerColor =
                sample.ownerColor ??
                (sample.ownerId != null
                    ? colorUtils.getPlayerColor(sample.ownerId)
                    : 0xffffff);
            if (params.mode === "past") {
                params.graphics.circle(sample.x, sample.y, params.radius);
                params.graphics.fill({
                    color: ownerColor,
                    alpha: params.alpha,
                });
            } else {
                params.graphics.circle(sample.x, sample.y, params.radius + 0.5);
                params.graphics.stroke({
                    color: ownerColor,
                    alpha: params.alpha,
                    width: Math.max(0.8, params.radius * 0.45),
                });
            }
        }
    }

    function drawPerimeterFieldOnionSkin(params: {
        graphics: PIXI.Graphics;
        frames: readonly PerimeterFieldDisplayedFrame[];
        selectedIndex: number;
        ghostCount: number;
    }): void {
        const maxCount = Math.max(0, Math.round(params.ghostCount));
        if (maxCount <= 0) return;

        for (let offset = maxCount; offset >= 1; offset--) {
            const pastFrame = params.frames[params.selectedIndex - offset];
            const futureFrame = params.frames[params.selectedIndex + offset];
            const alpha = 0.08 + ((maxCount - offset + 1) / maxCount) * 0.18;
            const radius = 1.4 + ((maxCount - offset + 1) / maxCount) * 1.1;

            if (pastFrame?.debugSnapshot) {
                drawPerimeterGhostSamples({
                    graphics: params.graphics,
                    samples: pastFrame.debugSnapshot.transitionSamples,
                    alpha,
                    radius,
                    mode: "past",
                });
            }
            if (futureFrame?.debugSnapshot) {
                drawPerimeterGhostSamples({
                    graphics: params.graphics,
                    samples: futureFrame.debugSnapshot.transitionSamples,
                    alpha: alpha + 0.03,
                    radius,
                    mode: "future",
                });
            }
        }
    }

    function drawPerimeterFieldStrobeTrails(params: {
        graphics: PIXI.Graphics;
        frames: readonly PerimeterFieldDisplayedFrame[];
        selectedIndex: number;
        stride: number;
    }): void {
        const stride = Math.max(0, Math.round(params.stride));
        if (stride <= 0 || params.frames.length <= 1) return;

        const sampledFrameIndexes: number[] = [];
        for (let i = 0; i < params.frames.length; i += stride) {
            sampledFrameIndexes.push(i);
        }
        const lastIndex = params.frames.length - 1;
        if (!sampledFrameIndexes.includes(lastIndex)) {
            sampledFrameIndexes.push(lastIndex);
        }

        const traces = new Map<
            string,
            {
                color: number;
                points: Array<{ x: number; y: number; frameIndex: number }>;
            }
        >();

        for (const frameIndex of sampledFrameIndexes) {
            const snapshot = params.frames[frameIndex]?.debugSnapshot;
            if (!snapshot) continue;
            for (const sample of snapshot.transitionSamples) {
                const key = getPerimeterDiagnosticSampleKey(sample);
                const ownerColor =
                    sample.ownerColor ??
                    colorUtils.getPlayerColor(sample.ownerId);
                const entry = traces.get(key) ?? {
                    color: ownerColor,
                    points: [],
                };
                entry.points.push({
                    x: sample.x,
                    y: sample.y,
                    frameIndex,
                });
                traces.set(key, entry);
            }
        }

        for (const trace of traces.values()) {
            if (trace.points.length < 2) continue;
            trace.points.sort((a, b) => a.frameIndex - b.frameIndex);

            params.graphics.moveTo(trace.points[0]!.x, trace.points[0]!.y);
            for (let i = 1; i < trace.points.length; i++) {
                params.graphics.lineTo(
                    trace.points[i]!.x,
                    trace.points[i]!.y,
                );
            }
            params.graphics.stroke({
                color: trace.color,
                alpha: 0.24,
                width: Math.max(
                    0.9,
                    (GAME_CONFIG.PERIMETER_FIELD_DEBUG_VECTOR_WIDTH ?? 2.5) *
                        0.55,
                ),
            });

            for (const point of trace.points) {
                if (point.frameIndex === params.selectedIndex) continue;
                params.graphics.circle(point.x, point.y, 1.8);
                params.graphics.fill({
                    color: trace.color,
                    alpha: 0.18,
                });
            }
        }
    }

    function buildDisplayedStarPositionMap(): ReadonlyMap<
        string,
        { x: number; y: number; ownerId?: string | null }
    > {
        const stars = activeGameStore.stars as StarState[];
        const displayedStars = mapTranspose.active
            ? stars.map((star) => ({
                  ...star,
                  x: mapTranspose.x(star),
                  y: mapTranspose.y(star),
              }))
            : stars;
        const positions = new Map<
            string,
            { x: number; y: number; ownerId?: string | null }
        >();
        for (const star of displayedStars) {
            positions.set(star.id, {
                x: star.x,
                y: star.y,
                ownerId: star.ownerId,
            });
        }
        return positions;
    }

    function drawPerimeterConquestHighlights(params: {
        graphics: PIXI.Graphics;
        textContainer: PIXI.Container | null;
        conquestEvents: readonly TerritoryConquestEvent[];
    }): void {
        if (params.conquestEvents.length === 0) return;
        const starPositions = buildDisplayedStarPositionMap();

        for (const conquest of params.conquestEvents) {
            const target = starPositions.get(conquest.starId);
            if (!target) continue;

            const vectorColor =
                conquest.newOwner != null
                    ? colorUtils.getPlayerColor(conquest.newOwner)
                    : 0xfff36b;
            const targetColor = 0xfff36b;

            for (const attackerStarId of conquest.attackerStarIds) {
                const attacker = starPositions.get(attackerStarId);
                if (!attacker) continue;

                const dx = target.x - attacker.x;
                const dy = target.y - attacker.y;
                const length = Math.hypot(dx, dy);
                if (length <= 1e-6) continue;

                const nx = dx / length;
                const ny = dy / length;
                const endX = target.x - nx * 22;
                const endY = target.y - ny * 22;
                const wingX = -ny;
                const wingY = nx;

                params.graphics.moveTo(attacker.x, attacker.y);
                params.graphics.lineTo(endX, endY);
                params.graphics.stroke({
                    color: vectorColor,
                    alpha: 0.88,
                    width: 2.6,
                });

                params.graphics.moveTo(endX, endY);
                params.graphics.lineTo(
                    endX - nx * 12 + wingX * 6,
                    endY - ny * 12 + wingY * 6,
                );
                params.graphics.moveTo(endX, endY);
                params.graphics.lineTo(
                    endX - nx * 12 - wingX * 6,
                    endY - ny * 12 - wingY * 6,
                );
                params.graphics.stroke({
                    color: vectorColor,
                    alpha: 0.92,
                    width: 2.6,
                });

                params.graphics.circle(attacker.x, attacker.y, 11);
                params.graphics.stroke({
                    color: vectorColor,
                    alpha: 0.95,
                    width: 2.2,
                });
                params.graphics.circle(attacker.x, attacker.y, 16);
                params.graphics.stroke({
                    color: vectorColor,
                    alpha: 0.45,
                    width: 1.2,
                });

                if (params.textContainer) {
                    const label = new PIXI.Text({
                        text: "A",
                        style: {
                            fontFamily: "monospace",
                            fontSize: 12,
                            fontWeight: "700",
                            fill: vectorColor,
                            stroke: { color: 0x081018, width: 3 },
                        },
                    });
                    label.anchor.set(0.5);
                    label.x = attacker.x;
                    label.y = attacker.y - 22;
                    params.textContainer.addChild(label);
                }
            }

            params.graphics.circle(target.x, target.y, 16);
            params.graphics.stroke({
                color: targetColor,
                alpha: 0.98,
                width: 3,
            });
            params.graphics.circle(target.x, target.y, 24);
            params.graphics.stroke({
                color: targetColor,
                alpha: 0.45,
                width: 1.5,
            });
            params.graphics.moveTo(target.x - 18, target.y);
            params.graphics.lineTo(target.x + 18, target.y);
            params.graphics.moveTo(target.x, target.y - 18);
            params.graphics.lineTo(target.x, target.y + 18);
            params.graphics.stroke({
                color: targetColor,
                alpha: 0.85,
                width: 1.8,
            });

            if (params.textContainer) {
                const label = new PIXI.Text({
                    text: "T",
                    style: {
                        fontFamily: "monospace",
                        fontSize: 13,
                        fontWeight: "700",
                        fill: targetColor,
                        stroke: { color: 0x081018, width: 3 },
                    },
                });
                label.anchor.set(0.5);
                label.x = target.x;
                label.y = target.y - 28;
                params.textContainer.addChild(label);
            }
        }
    }

    function renderPerimeterFieldDebugOverlay(activeMode: string): void {
        if (activeMode !== "perimeter_field" || !debugGraphics) return;
        const showGeometry =
            GAME_CONFIG.PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY ?? false;
        const showVstars =
            GAME_CONFIG.PERIMETER_FIELD_DEBUG_SHOW_VSTARS ?? false;
        const replaySelection = readSelectedPerimeterFieldReplaySelection();
        const onionSkinCount = Math.max(
            0,
            Math.round(
                GAME_CONFIG.PERIMETER_FIELD_DEBUG_ONION_SKIN_COUNT ?? 0,
            ),
        );
        const strobeStride = Math.max(
            0,
            Math.round(GAME_CONFIG.PERIMETER_FIELD_DEBUG_STROBE_STRIDE ?? 0),
        );
        const showConquestHighlights =
            Boolean(replaySelection) &&
            (replaySelection?.conquestEvents.length ?? 0) > 0;
        const showMotionDiagnostics =
            Boolean(replaySelection) &&
            (onionSkinCount > 0 || strobeStride > 0);
        if (
            !showGeometry &&
            !showVstars &&
            !showConquestHighlights &&
            !showMotionDiagnostics
        ) {
            return;
        }

        const family = getRenderFamily("perimeter_field");
        if (!(family instanceof PerimeterFieldFamily)) return;
        const snapshot =
            perimeterFieldDebugSnapshotOverride ?? family.debugSnapshot;
        if (!snapshot) return;

        const scrubEnabled =
            (GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_ENABLED ?? false) &&
            Boolean(snapshot.transitionTargetGeometry);

        if (showGeometry) {
            for (const points of getPerimeterDebugLoops(
                snapshot.displayGeometry,
            )) {
                drawClosedPolyline(debugGraphics, points, 0x47d7ff, 0.85, 2);
            }
            if (scrubEnabled && snapshot.transitionTargetGeometry) {
                for (const points of getPerimeterDebugLoops(
                    snapshot.transitionTargetGeometry,
                )) {
                    drawClosedPolyline(
                        debugGraphics,
                        points,
                        0xff5bd1,
                        0.65,
                        2,
                    );
                }
            }
        }

        if (showMotionDiagnostics && replaySelection) {
            if (strobeStride > 0) {
                drawPerimeterFieldStrobeTrails({
                    graphics: debugGraphics,
                    frames: replaySelection.frames,
                    selectedIndex: replaySelection.selectedIndex,
                    stride: strobeStride,
                });
            }
            if (onionSkinCount > 0) {
                drawPerimeterFieldOnionSkin({
                    graphics: debugGraphics,
                    frames: replaySelection.frames,
                    selectedIndex: replaySelection.selectedIndex,
                    ghostCount: onionSkinCount,
                });
            }
        }

        if (showVstars) {
            drawPerimeterSampleTrajectories(
                debugGraphics,
                snapshot.transitionSamples,
            );
            drawSamplePoints(
                debugGraphics,
                snapshot.staticSamples,
                0x47d7ff,
                0.95,
                2.6,
            );
            if (scrubEnabled) {
                drawSamplePoints(
                    debugGraphics,
                    snapshot.targetStaticSamples,
                    0xff5bd1,
                    0.75,
                    2.3,
                );
            }
            drawSamplePoints(
                debugGraphics,
                snapshot.transitionSamples,
                0xfff36b,
                0.95,
                3.2,
            );
            if (debugTextContainer) {
                drawPerimeterSampleLabels(
                    debugTextContainer,
                    snapshot.staticSamples,
                );
                if (scrubEnabled) {
                    drawPerimeterSampleLabels(
                        debugTextContainer,
                        snapshot.targetStaticSamples,
                    );
                }
                drawPerimeterSampleLabels(
                    debugTextContainer,
                    snapshot.transitionSamples,
                );
            }
        }

        if (showConquestHighlights && replaySelection) {
            drawPerimeterConquestHighlights({
                graphics: debugGraphics,
                textContainer: debugTextContainer,
                conquestEvents: replaySelection.conquestEvents,
            });
        }
    }

    function drawHex(g: PIXI.Graphics, x: number, y: number, r: number) {
        g.moveTo(x + r * Math.cos(0), y + r * Math.sin(0));
        for (let i = 1; i <= 6; i++) {
            g.lineTo(
                x + r * Math.cos((i * Math.PI) / 3),
                y + r * Math.sin((i * Math.PI) / 3),
            );
        }
    }

    // Main render loop
    function renderFrame(stars: StarState[], tickProgress: number) {
        if (
            !app ||
            !starsContainer ||
            !labelsContainer ||
            !shipParticleContainer
        )
            return;

        // Reset state on new game session
        const currentSessionId = activeGameStore.sessionId;
        if (currentSessionId !== lastSessionId) {
            lastSessionId = currentSessionId;
            pendingOrders.clear();
            deferredOrders.clear();
            lastEnemyPassthrough = null;
            activeStarId = null;
            visualShips.clear();
            visualDamagedShips.clear();
            fxOrchestrator.reset();
            resetTerritoryRenderCaches();
            activeSurges.clear();
            nextShipId = 0;
            starShipCounts.clear();
            shipSpawnTimers.clear();
            // B-57: Clear territory fills from previous game immediately so
            // old conquest state doesn't persist while paused after restart.
            if (voronoiContainer) {
                for (const child of voronoiContainer.children) {
                    if ((child as any).clear) (child as any).clear();
                }
            }
            // Reset canonical bridge so it rebuilds for new map geometry
            canonicalBridge?.reset();
            canonicalBridge = null;
            canonicalController = null;
            canonicalRenderer = null;
            log.sys(
                "GameCanvas",
                `Session changed to ${currentSessionId}, state reset`,
            );
        }

        // Render Debug Grid (check every frame if config changes)
        // Optimization: Could check specific flag change, but lightweight enough
        renderDebugGrid();

        // Clear old star graphics that no longer exist
        const currentIds = new Set(stars.map((s) => s.id));
        starGraphics.forEach((graphics, id) => {
            if (!currentIds.has(id)) {
                starsContainer!.removeChild(graphics);
                graphics.destroy();
                starGraphics.delete(id);
            }
        });
        starLabels.forEach((label, id) => {
            if (!currentIds.has(id)) {
                labelsContainer!.removeChild(label);
                label.destroy();
                starLabels.delete(id);
            }
        });

        // Cache starsById between frames — only rebuild when star array identity changes (tick events)
        if (stars !== cachedStarsSource) {
            cachedStarsById.clear();
            for (const s of stars) cachedStarsById.set(s.id, s);
            cachedStarsSource = stars;
        }
        const starsById = cachedStarsById;
        const pendingTickEvents = activeGameStore.peekTickEvents();

        // Render territory overlay (bottommost layer — F-47 halos)
        if (territoryGraphics) {
            if (GAME_CONFIG.SHOW_STAR_POWER) {
                territoryGraphics.visible = true;
                renderStarPowerModule(stars, territoryGraphics, colorUtils);
            } else {
                territoryGraphics.clear();
                territoryGraphics.filters = [];
                territoryGraphics.visible = false;
            }
        }

        // Skip territory re-rendering when paused — nothing changes, saves
        // 200-300 log lines/sec from the fingerprint checks and stage logs.
        // We allow re-render when: (a) first frame after pause, or (b) config changed while paused.
        const isPausedNow = activeGameStore.isPaused;
        const activeTerritoryMode = resolveActiveTerritoryMode();
        const territoryConfigFp = buildTerritoryConfigFingerprint(
            GAME_CONFIG as unknown as Record<string, unknown>,
            {
                geometryRefreshToken:
                    (GAME_CONFIG as any).__GEOMETRY_REFRESH_TOKEN ?? 0,
                visualEpoch: getTerritoryVisualEpoch(),
            },
        );
        const configChanged =
            territoryConfigFp !== (globalThis as any).__lastTerritoryConfigFp;
        if (configChanged)
            (globalThis as any).__lastTerritoryConfigFp = territoryConfigFp;
        if (configChanged) resetTerritoryRenderCaches();

        if (
            isPausedNow &&
            (globalThis as any).__territoryRenderedWhilePaused &&
            !configChanged
        ) {
            // Territory already rendered once since pause and config unchanged — skip
        } else if (voronoiContainer) {
            if (isPausedNow)
                (globalThis as any).__territoryRenderedWhilePaused = true;
            if (!isPausedNow)
                (globalThis as any).__territoryRenderedWhilePaused = false;
            voronoiContainer.visible = true;

            // Hide all children first — only the active renderer will re-show its own
            for (const child of voronoiContainer.children) {
                child.visible = false;
            }

            // Rendering is controlled by the Style dropdown (TERRITORY_RENDER_MODE).
            // FG2 geometry runs inside each style case via runFG2DataPipeline(),
            // which also populates trace data for the Trace Inspector.
            {
                // Resolve active render mode — check new enum first, fall back to old booleans
                const activeMode = activeTerritoryMode;

                // One-shot diagnostic: which render mode is active?
                if (!(globalThis as any).__RENDER_MODE_LOGGED) {
                    console.log(
                        `[Territory Style Dispatch] TERRITORY_RENDER_MODE="${GAME_CONFIG.TERRITORY_RENDER_MODE}" → activeMode="${activeMode}"`,
                    );
                    (globalThis as any).__RENDER_MODE_LOGGED = true;
                }

                if (voronoiContainer) {
                    const metaballFamily = getRenderFamily("metaball");
                    if (
                        activeMode !== "metaball" &&
                        metaballFamily instanceof MetaballFamily &&
                        metaballFamily.displayRoot.parent === voronoiContainer
                    ) {
                        voronoiContainer.removeChild(metaballFamily.displayRoot);
                    }
                    const perimeterFieldFamily =
                        getRenderFamily("perimeter_field");
                    if (
                        activeMode !== "perimeter_field" &&
                        perimeterFieldFamily instanceof PerimeterFieldFamily &&
                        perimeterFieldFamily.displayRoot.parent ===
                            voronoiContainer
                    ) {
                        voronoiContainer.removeChild(
                            perimeterFieldFamily.displayRoot,
                        );
                    }
                }

                switch (activeMode) {
                    case "territory_engine":
                        renderTerritoryEngine({
                            stars,
                            container: voronoiContainer,
                            colorUtils,
                            worldWidth: GAME_WIDTH,
                            worldHeight: GAME_HEIGHT,
                            connections:
                                activeGameStore.connections as StarConnection[],
                            renderer: app?.renderer ?? undefined,
                            gameNowMs: fxOrchestrator.gameTime,
                        });
                        break;
                    case "vs_pvv3": {
                        const fg2Artifacts = runFG2DataPipeline({
                            stars,
                            container: voronoiContainer,
                            colorUtils,
                            worldWidth: GAME_WIDTH,
                            worldHeight: GAME_HEIGHT,
                            connections:
                                activeGameStore.connections as StarConnection[],
                            gameNowMs: fxOrchestrator.gameTime,
                        });
                        renderPVV3Module(
                            stars,
                            voronoiContainer,
                            colorUtils,
                            GAME_WIDTH,
                            GAME_HEIGHT,
                            activeGameStore.connections as StarConnection[],
                            extractCanonicalData(fg2Artifacts),
                        );
                        break;
                    }
                    case "power_voronoi": {
                        const fg2ArtifactsPV = runFG2DataPipeline({
                            stars,
                            container: voronoiContainer,
                            colorUtils,
                            worldWidth: GAME_WIDTH,
                            worldHeight: GAME_HEIGHT,
                            connections:
                                activeGameStore.connections as StarConnection[],
                            gameNowMs: fxOrchestrator.gameTime,
                        });
                        renderPowerVoronoiModule(
                            stars,
                            voronoiContainer,
                            colorUtils,
                            GAME_WIDTH,
                            GAME_HEIGHT,
                            activeGameStore.connections as StarConnection[],
                            extractCanonicalData(fg2ArtifactsPV),
                        );
                        break;
                    }
                    case "distance_field":
                        renderDistanceFieldTerritoryModule(
                            stars,
                            voronoiContainer,
                            colorUtils,
                            GAME_WIDTH,
                            GAME_HEIGHT,
                            activeGameStore.connections as StarConnection[],
                            app?.renderer ?? undefined,
                        );
                        break;
                    case "modified_voronoi":
                        renderModifiedVoronoiModule(
                            stars,
                            voronoiContainer,
                            colorUtils,
                            GAME_WIDTH,
                            GAME_HEIGHT,
                            activeGameStore.connections as StarConnection[],
                        );
                        break;
                    case "pvv2_dy4":
                        renderPVV2DY4Module(
                            stars,
                            voronoiContainer,
                            colorUtils,
                            GAME_WIDTH,
                            GAME_HEIGHT,
                            activeGameStore.connections as StarConnection[],
                        );
                        break;
                    case "voronoi":
                        renderVoronoiModule(
                            stars,
                            voronoiContainer,
                            colorUtils,
                            GAME_WIDTH,
                            GAME_HEIGHT,
                            activeGameStore.connections as StarConnection[],
                        );
                        break;
                    case "metaball": {
                        let fam = getRenderFamily("metaball");
                        if (!fam) {
                            registerRenderFamily(
                                createMetaballFamily(colorUtils),
                            );
                            fam = getRenderFamily("metaball")!;
                        }
                        const mf = fam as MetaballFamily;
                        const activeTransition =
                            buildActiveRenderFamilyTransition(
                                fxOrchestrator.gameTime,
                                activeGameStore.effectiveTickMs,
                                pendingTickEvents?.conquests ?? [],
                            );
                        mf.update(
                            buildRenderFamilyInput({
                                stars,
                                lanes: activeGameStore
                                    .connections as StarConnection[],
                                worldWidth: GAME_WIDTH,
                                worldHeight: GAME_HEIGHT,
                                nowMs: fxOrchestrator.gameTime,
                                paused: isPausedNow,
                                gameTick: activeGameStore.currentTick,
                                ownership: buildRenderFamilyOwnershipSnapshot(
                                    stars,
                                    activeTransition,
                                ),
                                renderer: app?.renderer ?? undefined,
                                activeTransition,
                                tunableKeys: mf.tunableKeys,
                            }),
                        );
                        if (mf.displayRoot.parent !== voronoiContainer) {
                            voronoiContainer.addChild(mf.displayRoot);
                        }
                        mf.displayRoot.visible = true;
                        break;
                    }
                    case "perimeter_field": {
                        let fam = getRenderFamily("perimeter_field");
                        if (!fam) {
                            registerRenderFamily(
                                createPerimeterFieldFamily(colorUtils),
                            );
                            fam = getRenderFamily("perimeter_field")!;
                        }
                        const pf = fam as PerimeterFieldFamily;
                        const activeTransition =
                            buildActiveRenderFamilyTransition(
                                fxOrchestrator.gameTime,
                                activeGameStore.effectiveTickMs,
                                pendingTickEvents?.conquests ?? [],
                            );
                        const captureTransition =
                            buildActiveRenderFamilyTransition(
                                fxOrchestrator.gameTime,
                                activeGameStore.effectiveTickMs,
                            );
                        const lanes = activeGameStore
                            .connections as StarConnection[];
                        const pfInput = buildRenderFamilyInput({
                            stars,
                            lanes,
                            worldWidth: GAME_WIDTH,
                            worldHeight: GAME_HEIGHT,
                            nowMs: fxOrchestrator.gameTime,
                            paused: isPausedNow,
                            gameTick: activeGameStore.currentTick,
                            ownership: buildRenderFamilyOwnershipSnapshot(
                                stars,
                                activeTransition,
                            ),
                            geometry: getCurrentRenderFamilyGeometry(
                                stars,
                                lanes,
                            ),
                            renderer: app?.renderer ?? undefined,
                            activeTransition,
                            tunableKeys: pf.tunableKeys,
                        });
                        pf.update(pfInput);
                        if (pf.displayRoot.parent !== voronoiContainer) {
                            voronoiContainer.addChild(pf.displayRoot);
                        }
                        pf.displayRoot.visible = true;
                        syncPerimeterFieldDiagnosticCapture({
                            family: pf,
                            input: pfInput,
                            activeTransition: captureTransition,
                            stars,
                            nowMs: fxOrchestrator.gameTime,
                        });
                        applyPerimeterFieldReplayPresentation({
                            container: voronoiContainer,
                            liveRoot: pf.displayRoot,
                        });
                        break;
                    }
                    case "metaball_grid": {
                        let fam = getRenderFamily("metaball_grid");
                        if (!fam) {
                            registerRenderFamily(
                                createMetaballGridFamily(colorUtils),
                            );
                            fam = getRenderFamily("metaball_grid")!;
                        }
                        const mg = fam as MetaballGridFamily;
                        const activeTransition =
                            buildActiveRenderFamilyTransition(
                                fxOrchestrator.gameTime,
                                activeGameStore.effectiveTickMs,
                                pendingTickEvents?.conquests ?? [],
                            );
                        const lanes = activeGameStore
                            .connections as StarConnection[];
                        const mgInput = buildRenderFamilyInput({
                            stars,
                            lanes,
                            worldWidth: GAME_WIDTH,
                            worldHeight: GAME_HEIGHT,
                            nowMs: fxOrchestrator.gameTime,
                            paused: isPausedNow,
                            gameTick: activeGameStore.currentTick,
                            ownership: buildRenderFamilyOwnershipSnapshot(
                                stars,
                                activeTransition,
                            ),
                            geometry: getCurrentRenderFamilyGeometry(
                                stars,
                                lanes,
                            ),
                            renderer: app?.renderer ?? undefined,
                            activeTransition,
                            tunableKeys: mg.tunableKeys,
                        });
                        mg.update(mgInput);
                        if (mg.displayRoot.parent !== voronoiContainer) {
                            voronoiContainer.addChild(mg.displayRoot);
                        }
                        mg.displayRoot.visible = true;
                        break;
                    }
                    case "pixel":
                        renderPixelTerritoryModule(
                            stars,
                            voronoiContainer,
                            colorUtils,
                            GAME_WIDTH,
                            GAME_HEIGHT,
                            activeGameStore.connections as StarConnection[],
                        );
                        break;
                    case "graph":
                        renderLaneTerritoryModule(
                            stars,
                            voronoiContainer,
                            colorUtils,
                            GAME_WIDTH,
                            GAME_HEIGHT,
                            activeGameStore.connections as StarConnection[],
                        );
                        break;
                    case "contour":
                        renderContourTerritoryModule(
                            stars,
                            voronoiContainer,
                            colorUtils,
                            GAME_WIDTH,
                            GAME_HEIGHT,
                            activeGameStore.connections as StarConnection[],
                        );
                        break;
                    case "territory_canonical": {
                        // ── CANONICAL ARCHITECTURE DISPATCH ─────────────────────────
                        const runtimeSettings = readTerritoryRuntimeSettings(
                            GAME_CONFIG as unknown as Record<string, unknown>,
                        );
                        const architectureRoute =
                            resolveTerritoryArchitectureRoute({
                                renderMode: activeMode,
                                architecturePath:
                                    GAME_CONFIG.TERRITORY_ARCHITECTURE_PATH,
                            });
                        const useCleanArchitecture =
                            architectureRoute.route ===
                            "canonical_clean_bridge";
                        let renderedByCanonicalBridge = false;

                        if (useCleanArchitecture && voronoiContainer) {
                            if (!canonicalBridge) {
                                canonicalBridge = new GameCanvasBridge(
                                    voronoiContainer,
                                    (ownerId) =>
                                        colorUtils.getPlayerColor(ownerId),
                                );
                            }

                            if (canonicalBridge) {
                                try {
                                    canonicalBridge.update(
                                        buildCanonicalBridgeInput(
                                            stars,
                                            runtimeSettings,
                                        ),
                                    );
                                    canonicalBridge.consumeVFXCommands();
                                    renderedByCanonicalBridge = true;
                                } catch (error) {
                                    if (!canonicalBridgeFallbackLogged) {
                                        canonicalBridgeFallbackLogged = true;
                                        console.warn(
                                            "[CanonicalBridge] Falling back to legacy canonical controller path:",
                                            error,
                                        );
                                    }
                                }
                            }
                        }
                        if (!useCleanArchitecture) {
                            canonicalBridge?.reset();
                            canonicalBridge = null;
                        }

                        if (renderedByCanonicalBridge) {
                            break;
                        }

                        // Legacy path (selected explicitly or clean path fallback on error).
                        // Lazily initialize controller and renderer per-container
                        if (
                            !canonicalController ||
                            canonicalControllerTransitionDurationMs !==
                                runtimeSettings.tunables.transitionDurationMs
                        ) {
                            canonicalController = new TerritoryEngineController(
                                {
                                    transitionDurationMs:
                                        runtimeSettings.tunables
                                            .transitionDurationMs,
                                },
                            );
                            canonicalControllerTransitionDurationMs =
                                runtimeSettings.tunables.transitionDurationMs;
                        }
                        if (!canonicalRenderer || !voronoiContainer) {
                            if (voronoiContainer) {
                                canonicalRenderer = new TerritoryRenderer(
                                    voronoiContainer,
                                    (ownerIdx, playerIds) => {
                                        const ownerId = playerIds[ownerIdx];
                                        return ownerId
                                            ? colorUtils.getPlayerColor(ownerId)
                                            : 0x888888;
                                    },
                                    activeGameStore.players?.map(
                                        (p: { id: string }) => p.id,
                                    ) ?? [],
                                );
                            }
                        }

                        if (
                            canonicalController &&
                            canonicalRenderer &&
                            voronoiContainer
                        ) {
                            const playerIds =
                                activeGameStore.players?.map(
                                    (p: { id: string }) => p.id,
                                ) ?? [];
                            canonicalRenderer.updatePlayerIds(playerIds);

                            const { state, transitionPlan } =
                                canonicalController.update(
                                    {
                                        stars,
                                        connections:
                                            activeGameStore.connections as StarConnection[],
                                        playerIds,
                                        worldWidth: GAME_WIDTH,
                                        worldHeight: GAME_HEIGHT,
                                        config: { family: "straight" },
                                    },
                                    fxOrchestrator.gameTime,
                                );

                            // One-shot Canonical debug log (not per-frame)
                            if (!(globalThis as any).__canonicalLoggedOnce) {
                                (globalThis as any).__canonicalLoggedOnce =
                                    true;
                                if (!state) {
                                    console.warn(
                                        "[Canonical🔍] state=null — compiler returned error or no stars",
                                    );
                                } else {
                                    console.log(
                                        `[Canonical🔍] state.kind=${state.kind}` +
                                            ` regions=${state.regions?.length ?? "?"}` +
                                            ` frontierEdges=${state.frontierGraph?.edges?.size ?? "?"}` +
                                            ` fittedFrontiers=${state.fittedFrontiers?.length ?? "?"}` +
                                            ` transitionActive=${state.transitionActive}`,
                                    );
                                }
                            }

                            if (state) {
                                canonicalRenderer.render(
                                    state,
                                    transitionPlan,
                                    fxOrchestrator.gameTime,
                                );
                            }
                        }
                        break;
                    }
                    // 'none' or unrecognized — no territory rendering
                }
            }
        } // end territory pause guard

        renderPerimeterFieldDebugOverlay(activeTerritoryMode);

        // Render stars (static elements)
        renderStarsModule(
            stars,
            starsContainer!,
            labelsContainer!,
            { starGraphics, starLabels },
            {
                activeStarId,
                dragSourceId,
                pendingConquests,
                conquestFlashes,
                gameNowMs: fxOrchestrator.gameTime,
            },
            colorUtils,
        );

        // Render connections (star network) - unified source
        const connections = activeGameStore.connections as StarConnection[];
        if (connections) {
            renderConnectionsModule(
                connectionGraphics!,
                stars,
                connections,
                starsById,
                colorUtils,
            );
        }

        // Render flow links
        renderOrderArrowsModule(
            linkGraphics!,
            stars,
            starsById,
            {
                pendingOrders,
                deferredOrders,
                isLocalPlayerStar,
                snapshotStars: activeGameStore.stars,
            },
            colorUtils,
        );

        // Reset particle pool index for this frame
        shipParticleIndex = 0;
        // Clear orb travel graphics (drawn fresh each frame)
        if (orbGraphics) orbGraphics.clear();

        // Process tick events (event-driven animations, not diff-based — see POST_MORTEMS.md)
        const tickEvents = activeGameStore.consumeTickEvents();

        // Clear combat tracking before processing new tick events
        // (starsInCombat is rebuilt each tick from CombatEvents)
        if (tickEvents) {
            // Existing event processing (transfers, conquests, combat log, etc.)
            starsInCombat.clear();
            processTickEvents(stars, tickEvents, connections || [], starsById);

            // Export local rendering states if snapshot recording is enabled
            const willCapture =
                activeTerritoryMode !== "perimeter_field" &&
                tickEvents.conquests.length > 0 &&
                transitionSnapshotRecorder.isEnabled();
            if (willCapture) {
                const prevGeometry = exportPowerVoronoiGeometrySnapshot("previous", "dy4:prev", "dy4:prev");
                const nextGeometry = exportPowerVoronoiGeometrySnapshot("current", "dy4:next", "dy4:next");
                console.log(`[GameCanvas] DY4 Snapshot attempt: conquests=${tickEvents.conquests.length}, prev=${!!prevGeometry}, next=${!!nextGeometry}`);
                
                if (prevGeometry && nextGeometry) {
                    const owners = new Map();
                    stars.forEach((s) => owners.set(s.id, s.ownerId));
                    const starPos = new Map();
                    stars.forEach((s) => starPos.set(s.id, { x: s.x, y: s.y }));
                    
                    const conquestsMap = tickEvents.conquests.map(c => ({ ...c, atMs: fxOrchestrator.gameTime }));

                    transitionSnapshotRecorder.setColorResolver((ownerId: string) => colorUtils.getPlayerColor(ownerId));
                    transitionSnapshotRecorder.capture({
                        conquestEvents: conquestsMap,
                        previousGeometry: prevGeometry,
                        nextGeometry: nextGeometry,
                        previousOwnership: { version: "1", starOwners: owners, contestedLaneIds: [], conquestEvents: conquestsMap, virtualStars: [] },
                        nextOwnership: { version: "2", starOwners: owners, contestedLaneIds: [], conquestEvents: conquestsMap, virtualStars: [] },
                        transition: { envelope: null as any, fillFrame: null as any, borderFrame: null as any, geometryVersion: "1" },
                        fillPlan: null,
                        selection: { geometryMode: "unified_vector", fillTransitionMode: "active_front", borderTransitionMode: "off", ownershipMode: "star_ownership_snapshot", styleMode: "canonical" },
                        nowMs: fxOrchestrator.gameTime,
                        starPositions: starPos,
                        worldWidth: GAME_WIDTH,
                        worldHeight: GAME_HEIGHT
                    });
                }
            }

            // Record game-time at tick boundary for tickProgress computation
            lastTickGameTimeMs = fxOrchestrator.gameTime;

            // V2 SURGE: Create surge animations from CombatEvents
            // Each combat tick starts one pulse per attacker star
            for (const combat of tickEvents.combats) {
                if (!combat.conquered) {
                    for (const attackerId of combat.attackerIds) {
                        const aStar = starsById.get(attackerId);
                        const dStar = starsById.get(combat.defenderId);
                        if (aStar && dStar) {
                            const rawLane = getDirectedLanePolyline(attackerId, combat.defenderId);
                            const trimmedLane = rawLane && rawLane.length >= 2
                                ? trimLanePolylineToStarRims(rawLane, aStar, dStar, 5)
                                : undefined;
                            const heading = computeLaneHeadingForNearside(
                                aStar,
                                dStar,
                                trimmedLane && trimmedLane.length >= 2 ? trimmedLane : undefined,
                            );
                            activeSurges.set(attackerId, {
                                startTime: fxOrchestrator.gameTime,
                                dirX: heading.ndx,
                                dirY: heading.ndy,
                            });
                        }
                    }
                }
            }
        }

        // Render all ships: orbiting (per-star) + traveling (in-flight lifecycle)
        // IMPORTANT: Always read from VSM to stay in sync — ShipRenderer replaces the array
        // with a filtered `stillTraveling` copy, which would disconnect from VSM's internal array.
        travelingShips = fxOrchestrator.vsm.travelingShips;
        const shipState: ShipRenderState = {
            visualShips,
            visualDamagedShips,
            travelingShips,
            starsInCombat,
            pendingConquests,
            activeSurges,
            nextShipId,
            gameNowMs: fxOrchestrator.gameTime,
            isPaused: activeGameStore.isPaused,
            effectiveTickMs: activeGameStore.effectiveTickMs,
            tickProgress,
        };
        const shipRes: ShipRenderResources = {
            shipCircleTexture: shipCircleTexture!,
            glowTexture: glowTexture!,
            shipParticleContainer: shipParticleContainer!,
            orbGraphics: orbGraphics!,
            glowContainer: glowContainer!,
            shipParticlePool,
            shipParticleIndex,
            glowSprites,
        };
        renderShipsModule(stars, starsById, shipState, shipRes, colorUtils);
        // Read back mutable state modified by the module
        nextShipId = shipState.nextShipId;
        shipParticleIndex = shipRes.shipParticleIndex;
        // Sync filtered array back to VSM so arrived ships are removed from the canonical source
        fxOrchestrator.vsm.syncTravelingShips(shipState.travelingShips);

        // Hide unused particles from pool
        for (let i = shipParticleIndex; i < shipParticlePool.length; i++) {
            shipParticlePool[i].alpha = 0;
        }
        if (shipParticleContainer) shipParticleContainer.update();

        // Selection hex overlay (above ships)
        if (selectionOverlayGraphics) {
            renderSelectionOverlay(
                stars,
                selectionOverlayGraphics,
                activeStarId,
                dragSourceId,
            );
        }

        // Count total visual ships for HUD
        let shipCount = 0;
        visualShips.forEach((ships) => (shipCount += ships.length));
        shipCount += travelingShips.length;
        visualDamagedShips.forEach((ships) => (shipCount += ships.length));
        totalVisualShips = shipCount;

        // FPS tracking (update every second)
        fpsFrameCount++;
        const now = performance.now();
        if (now - fpsLastTime >= 1000) {
            currentFps = Math.round(
                (fpsFrameCount * 1000) / (now - fpsLastTime),
            );
            fpsFrameCount = 0;
            fpsLastTime = now;
        }
    }

    // ============================================================================
    // Animation System — Event-Driven Ship Lifecycle
    // (POST_MORTEMS.md: animations driven by TickEvents, not state diffing)
    // ============================================================================

    /**
     * Process tick events through FXOrchestrator.
     * The orchestrator dispatches to registered handlers (core:transfer, core:combat, core:conquest)
     * which mutate state via VisualStateManager. Since local vars alias VSM collections,
     * the render loop sees updated state automatically.
     */
    function processTickEvents(
        stars: StarState[],
        events: import("@pax/common").TickEvents,
        connections: StarConnection[],
        starsById: Map<string, StarState>,
    ) {
        fxOrchestrator.processEvents(
            events,
            starsById,
            activeGameStore.effectiveTickMs,
        );
    }

    // ============================================================================
    // Input Handling
    // ============================================================================

    // Convert screen coordinates to game world coordinates (accounting for scale and offset)
    function screenToWorld(
        screenX: number,
        screenY: number,
    ): { x: number; y: number } {
        if (!app) return { x: screenX, y: screenY };

        const scale = app.stage.scale.x; // Uniform scale
        const offsetX = app.stage.x;
        const offsetY = app.stage.y;

        return {
            x: (screenX - offsetX) / scale,
            y: (screenY - offsetY) / scale,
        };
    }

    function transposePoint(x: number, y: number): { x: number; y: number } {
        if (!mapTranspose.active) return { x, y };
        return {
            x: y,
            y: mapTranspose.mapWidth - x,
        };
    }

    // Track last hitTest result to suppress duplicate logs
    let lastHitStarId: string | null | undefined = undefined; // undefined = never set

    function hitTestStar(screenX: number, screenY: number): StarState | null {
        // Use activeGameStore for unified star access
        const stars = activeGameStore.stars as StarState[];

        if (stars.length === 0) {
            if (lastHitStarId !== null) {
                log.input("hitTestStar MISS — stars array empty");
                lastHitStarId = null;
            }
            return null;
        }

        // Convert screen coordinates to world coordinates
        const { x, y } = screenToWorld(screenX, screenY);

        // Find the NEAREST star within a reasonable hit radius
        let nearest: StarState | null = null;
        let nearestDist = Infinity;

        for (const star of stars) {
            const dist = distance(
                x,
                y,
                mapTranspose.x(star),
                mapTranspose.y(star),
            );
            // Hit radius: configurable via STAR_HIT_RADIUS (default 50px)
            const hitRadius =
                GAME_CONFIG.STAR_HIT_RADIUS ?? Math.max(star.radius * 2, 40);
            if (dist <= hitRadius && dist < nearestDist) {
                nearest = star;
                nearestDist = dist;
            }
        }

        // Only log when the result changes (different star, or hit↔miss transition)
        const newId = nearest?.id ?? null;
        if (newId !== lastHitStarId) {
            if (nearest) {
                log.input(
                    `hitTest HIT → ${nearest.id} (owner=${nearest.ownerId}, dist=${nearestDist.toFixed(0)}, r=${nearest.radius})`,
                );
            } else {
                log.input(
                    `hitTest MISS — screen(${screenX.toFixed(0)},${screenY.toFixed(0)}) → world(${x.toFixed(0)},${y.toFixed(0)}), ${stars.length} stars checked`,
                );
            }
            lastHitStarId = newId;
        }

        return nearest;
    }

    function projectPointToSegment(
        px: number,
        py: number,
        ax: number,
        ay: number,
        bx: number,
        by: number,
    ): { x: number; y: number; distance: number } {
        const dx = bx - ax;
        const dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        if (lenSq <= 1e-6) {
            return {
                x: ax,
                y: ay,
                distance: Math.hypot(px - ax, py - ay),
            };
        }
        const t = Math.max(
            0,
            Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq),
        );
        const x = ax + dx * t;
        const y = ay + dy * t;
        return {
            x,
            y,
            distance: Math.hypot(px - x, py - y),
        };
    }

    function buildVisibleLanePolyline(
        source: StarState,
        target: StarState,
    ): [number, number][] {
        const raw =
            getDirectedLanePolyline(source.id, target.id) ?? [
                [source.x, source.y],
                [target.x, target.y],
            ];
        const displayPolyline = raw.map(([x, y]) => {
            const p = transposePoint(x, y);
            return [p.x, p.y] as [number, number];
        });
        const sourceRef = {
            x: mapTranspose.x(source),
            y: mapTranspose.y(source),
            radius: source.radius,
        };
        const targetRef = {
            x: mapTranspose.x(target),
            y: mapTranspose.y(target),
            radius: target.radius,
        };
        const ringGapForLane =
            GAME_CONFIG.STAR_RING_RADIUS +
            (GAME_CONFIG.STAR_RING_WIDTH ?? 2) * 0.5;
        const trimPad = Math.max(
            0,
            ringGapForLane - Math.min(source.radius, target.radius),
        );
        return trimLanePolylineToStarRims(
            displayPolyline,
            sourceRef,
            targetRef,
            trimPad,
        );
    }

    function hitTestLanePoint(
        screenX: number,
        screenY: number,
    ): RulerPoint | null {
        const { x, y } = screenToWorld(screenX, screenY);
        const stars = activeGameStore.stars as StarState[];
        const starsById = new Map(stars.map((star) => [star.id, star] as const));
        const seen = new Set<string>();
        const laneHitboxPx = get(rulerTool).laneHitboxPx;
        let best:
            | {
                  x: number;
                  y: number;
                  distance: number;
                  laneKey: string;
                  laneLabel: string;
              }
            | null = null;

        for (const connection of activeGameStore.connections as StarConnection[]) {
            const a =
                connection.sourceId <= connection.targetId
                    ? connection.sourceId
                    : connection.targetId;
            const b =
                connection.sourceId <= connection.targetId
                    ? connection.targetId
                    : connection.sourceId;
            const laneKey = `${a}|${b}`;
            if (seen.has(laneKey)) continue;
            seen.add(laneKey);

            const source = starsById.get(a);
            const target = starsById.get(b);
            if (!source || !target) continue;

            const polyline = buildVisibleLanePolyline(source, target);
            if (polyline.length < 2) continue;

            for (let i = 1; i < polyline.length; i++) {
                const [ax, ay] = polyline[i - 1];
                const [bx, by] = polyline[i];
                const projection = projectPointToSegment(x, y, ax, ay, bx, by);
                if (projection.distance > laneHitboxPx) continue;
                if (!best || projection.distance < best.distance) {
                    best = {
                        x: projection.x,
                        y: projection.y,
                        distance: projection.distance,
                        laneKey,
                        laneLabel: `${a} ↔ ${b}`,
                    };
                }
            }
        }

        if (!best) return null;
        return {
            x: best.x,
            y: best.y,
            snapKind: "lane",
            laneKey: best.laneKey,
            laneLabel: best.laneLabel,
        };
    }

    function resolveRulerPoint(screenX: number, screenY: number): RulerPoint {
        const star = hitTestStar(screenX, screenY);
        if (star) {
            return {
                x: mapTranspose.x(star),
                y: mapTranspose.y(star),
                snapKind: "star",
                starId: star.id,
            };
        }

        const lanePoint = hitTestLanePoint(screenX, screenY);
        if (lanePoint) return lanePoint;

        const world = screenToWorld(screenX, screenY);
        return {
            x: world.x,
            y: world.y,
            snapKind: "free",
        };
    }

    function mapLaneKindToRulerState(kind?: string): RulerLaneState {
        if (kind === "curved") return "curved";
        if (kind === "angular") return "bent";
        if (kind === "straight") return "straight";
        return "missing";
    }

    function findConnectionByLaneKey(laneKey: string): StarConnection | null {
        for (const connection of activeGameStore.connections as StarConnection[]) {
            const a =
                connection.sourceId <= connection.targetId
                    ? connection.sourceId
                    : connection.targetId;
            const b =
                connection.sourceId <= connection.targetId
                    ? connection.targetId
                    : connection.sourceId;
            if (`${a}|${b}` === laneKey) return connection;
        }
        return null;
    }

    function finalizeRulerMeasurement(
        start: RulerPoint,
        end: RulerPoint,
    ): RulerMeasurement {
        let relatedLaneKey: string | undefined;
        let relatedLaneLabel: string | undefined;
        let starPairLabel: string | undefined;
        let actualLaneState: RulerLaneState = "missing";

        if (start.starId && end.starId) {
            const a = start.starId <= end.starId ? start.starId : end.starId;
            const b = start.starId <= end.starId ? end.starId : start.starId;
            relatedLaneKey = `${a}|${b}`;
            relatedLaneLabel = `${a} ↔ ${b}`;
            starPairLabel = relatedLaneLabel;
            actualLaneState = mapLaneKindToRulerState(
                findConnectionByLaneKey(relatedLaneKey)?.lanePathKind,
            );
        } else {
            relatedLaneKey =
                start.laneKey && end.laneKey && start.laneKey === end.laneKey
                    ? start.laneKey
                    : start.laneKey ?? end.laneKey;
            relatedLaneLabel =
                start.laneLabel && end.laneLabel && start.laneLabel === end.laneLabel
                    ? start.laneLabel
                    : start.laneLabel ?? end.laneLabel;
            if (relatedLaneKey) {
                actualLaneState = mapLaneKindToRulerState(
                    findConnectionByLaneKey(relatedLaneKey)?.lanePathKind,
                );
            }
        }

        const measurement = buildRulerMeasurement(start, end, {
            laneMarginPx: GAME_CONFIG.MAPGEN_LANE_MARGIN_PX,
            starPairLabel,
            relatedLaneKey,
            relatedLaneLabel,
            actualLaneState,
        });

        log.canvas(
            "Ruler",
            `${measurement.distance.toFixed(2)}px ${measurement.starPairLabel ?? measurement.relatedLaneLabel ?? "free"}`,
            measurement,
        );

        return measurement;
    }

    function ensureRulerLabel(index: number): PIXI.Text | null {
        const stageParent = debugGraphics?.parent;
        if (!stageParent) return null;
        while (rulerLabels.length <= index) {
            const label = new PIXI.Text({
                text: "",
                style: {
                    fontFamily: "Consolas, Monaco, monospace",
                    fontSize: 12,
                    fill: 0xffffff,
                    fontWeight: "700",
                    align: "center",
                },
            });
            label.anchor.set(0.5);
            label.visible = false;
            rulerLabels.push(label);
            stageParent.addChild(label);
        }
        return rulerLabels[index];
    }

    function hideUnusedRulerLabels(fromIndex: number): void {
        for (let i = fromIndex; i < rulerLabels.length; i++) {
            rulerLabels[i].visible = false;
        }
    }

    function renderRulerOverlay(graphics: PIXI.Graphics): void {
        const state = get(rulerTool);
        const draftMeasurement = getRulerMeasurement(state);
        const color = getRulerCssColor(state);
        let labelIndex = 0;

        const drawPoint = (point: RulerPoint) => {
            graphics.circle(point.x, point.y, point.snapKind === "free" ? 6 : 8);
            graphics.fill({
                color,
                alpha: Math.max(0.18, state.color.a * 0.28),
            });
            graphics.stroke({ color, width: 2, alpha: state.color.a });

            graphics.moveTo(point.x - 10, point.y);
            graphics.lineTo(point.x + 10, point.y);
            graphics.moveTo(point.x, point.y - 10);
            graphics.lineTo(point.x, point.y + 10);
            graphics.stroke({
                color,
                width: 1.5,
                alpha: Math.max(0.65, state.color.a),
            });
        };

        const drawMeasuredSegment = (
            start: RulerPoint,
            end: RulerPoint,
            measurement: {
                distance: number;
                midX: number;
                midY: number;
            },
        ) => {
            graphics.moveTo(start.x, start.y);
            graphics.lineTo(end.x, end.y);
            graphics.stroke({ color, width: 2.5, alpha: state.color.a });
            drawPoint(start);
            drawPoint(end);

            const label = ensureRulerLabel(labelIndex++);
            if (!label) return;
            label.text = `${measurement.distance.toFixed(2)} px`;
            label.style.fill = color;
            label.position.set(measurement.midX, measurement.midY - 18);
            label.visible = true;

            const paddingX = 8;
            const paddingY = 4;
            const boxW = label.width + paddingX * 2;
            const boxH = label.height + paddingY * 2;
            graphics.roundRect(
                label.x - boxW * 0.5,
                label.y - boxH * 0.5,
                boxW,
                boxH,
                6,
            );
            graphics.fill({ color: 0x050812, alpha: 0.82 });
            graphics.stroke({
                color,
                width: 1,
                alpha: Math.max(0.7, state.color.a),
            });
        };

        if (state.mode === "persistent") {
            for (const measurement of state.measurements) {
                drawMeasuredSegment(measurement.start, measurement.end, measurement);
            }
        }

        if (state.start) {
            drawPoint(state.start);
        }

        if (draftMeasurement && state.start && state.end) {
            drawMeasuredSegment(state.start, state.end, draftMeasurement);
        }

        hideUnusedRulerLabels(labelIndex);
    }

    function handlePointerDown(event: PointerEvent) {
        if (!app) return;
        log.input(
            `▼ pointerDown btn=${event.button} @(${event.clientX},${event.clientY}) ptrType=${event.pointerType}`,
        );

        if (get(rulerTool).enabled && event.button === 0 && !isSpaceHeld) {
            const rect = canvasContainer.getBoundingClientRect();
            const point = resolveRulerPoint(
                event.clientX - rect.left,
                event.clientY - rect.top,
            );
            const placement = rulerTool.placePoint(point);
            if (placement.completed) {
                rulerTool.recordMeasurement(
                    finalizeRulerMeasurement(
                        placement.completed.start,
                        placement.completed.end,
                    ),
                );
            }
            event.preventDefault();
            return;
        }

        // Track active pointers for multi-touch
        activePointers.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });

        // 2+ fingers → start pinch zoom / pan, suppress single-touch actions
        if (activePointers.size >= 2) {
            clearLongPress();
            cancelDrag();
            isPinching = true;
            pinchStartDist = getPinchDist();
            pinchStartZoom = zoomLevel;
            const center = getPinchCenter();
            const rect = canvasContainer.getBoundingClientRect();
            pinchCenterX = center.x - rect.left;
            pinchCenterY = center.y - rect.top;
            panStartScreenX = center.x;
            panStartScreenY = center.y;
            panStartOffsetX = panOffsetX;
            panStartOffsetY = panOffsetY;
            return;
        }

        const rect = canvasContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Single-touch: check if we're touching empty space (no star nearby)
        // If so, enter pan mode for single-finger panning
        if (event.pointerType === "touch") {
            const earlyHit = hitTestStar(x, y);
            if (!earlyHit) {
                // No star nearby — single-finger pan
                isPanning = true;
                cameraAnimating = false;
                panStartScreenX = event.clientX;
                panStartScreenY = event.clientY;
                panStartOffsetX = panOffsetX;
                panStartOffsetY = panOffsetY;
                return;
            }
        }

        // Single-touch on a star: start long-press timer
        if (event.pointerType === "touch") {
            clearLongPress();
            const startX = event.clientX;
            const startY = event.clientY;
            longPressTimer = setTimeout(() => {
                longPressTimer = null;
                // Long-press: show star info
                const rect = canvasContainer.getBoundingClientRect();
                const star = hitTestStar(startX - rect.left, startY - rect.top);
                if (star) {
                    selectedStarStore.select(star.id);
                    // Dispatch star-info-toggle event for the info panel
                    window.dispatchEvent(
                        new CustomEvent("star-info-toggle", { detail: true }),
                    );
                }
                cancelDrag(); // prevent drag after long-press
            }, LONG_PRESS_MS);
        }

        // Middle-click or Space+click: start pan
        if (event.button === 1 || (isSpaceHeld && event.button === 0)) {
            event.preventDefault();
            isPanning = true;
            panStartScreenX = event.clientX;
            panStartScreenY = event.clientY;
            panStartOffsetX = panOffsetX;
            panStartOffsetY = panOffsetY;
            canvasContainer.style.cursor = "grabbing";
            return;
        }

        const star = hitTestStar(x, y);

        // Always select star for info panel (any button, any owner)
        if (star) {
            selectedStarStore.select(star.id);
            audioManager.play("click");
        }

        // FIX: Right Click to Cancel
        if (event.button === 2) {
            event.preventDefault();
            if (star && isLocalPlayerStar(star)) {
                doCancelOrder(star.id);
                // OPTIMISTIC UI: Remove from pending immediately
                pendingOrders.forEach((key) => {
                    if (key.startsWith(`${star.id}|`)) {
                        pendingOrders.delete(key);
                    }
                });
                log.success("GameCanvas", `Cancelled order on ${star.id}`);
            }
            // Also clear selection
            activeStarId = null;
            return;
        }

        if (star && isLocalPlayerStar(star)) {
            // Start drag from owned star — normal order chain
            isDragging = true;
            dragSourceId = star.id;
            // FIX: Use actual click position for movement detection
            dragStartX = x;
            dragStartY = y;
            // But use star center for visual drag preview line
            dragSourceCenterX = mapTranspose.x(star);
            dragSourceCenterY = mapTranspose.y(star);
            dragCurrentX = x;
            dragCurrentY = y;
            lastEnemyPassthrough = null;
            log.input(`pointerDown → DRAG START from owned star ${star.id}`);
        } else if (star) {
            // Start drag from non-owned star — deferred order chain
            isDragging = true;
            dragSourceId = star.id;
            dragStartX = x;
            dragStartY = y;
            dragSourceCenterX = mapTranspose.x(star);
            dragSourceCenterY = mapTranspose.y(star);
            dragCurrentX = x;
            dragCurrentY = y;
            lastEnemyPassthrough = star.id; // Mark as deferred anchor
            log.input(
                `pointerDown → DRAG START from non-owned star ${star.id} (deferred mode)`,
            );
        } else {
            // Desktop: empty space click (non-touch) — just reset drag
            isDragging = false;
            dragSourceId = null;
            dragStartX = x;
            dragStartY = y;
            log.input(`pointerDown → empty space, drag state reset`);
        }
    }

    // Track the last enemy star we passed through for deferred orders
    let lastEnemyPassthrough: StarId | null = null;

    function handlePointerMove(event: PointerEvent) {
        // Update pointer tracking
        if (activePointers.has(event.pointerId)) {
            activePointers.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
            });
        }

        // Pinch zoom + 2-finger pan
        if (isPinching && activePointers.size >= 2) {
            clearLongPress();
            const dist = getPinchDist();
            if (pinchStartDist > 0) {
                const scale = dist / pinchStartDist;
                const oldZoom = zoomLevel;
                zoomLevel = Math.max(
                    ZOOM_MIN,
                    Math.min(ZOOM_MAX, pinchStartZoom * scale),
                );

                // Also pan: track center movement
                const center = getPinchCenter();
                const effectiveScale = baseScale * zoomLevel;
                const dx = center.x - panStartScreenX;
                const dy = center.y - panStartScreenY;
                panOffsetX = panStartOffsetX - dx / effectiveScale;
                panOffsetY = panStartOffsetY - dy / effectiveScale;

                applyZoomTransform();
            }
            return;
        }

        // Cancel long-press if finger moved too far
        if (longPressTimer && event.pointerType === "touch") {
            const p = activePointers.get(event.pointerId);
            // We already updated p above, so check distance from original down
            const dx = event.clientX - dragStartX;
            const dy = event.clientY - dragStartY;
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                clearLongPress();
            }
        }

        // Pan mode: update pan offset based on mouse delta
        if (isPanning) {
            const effectiveScale = baseScale * zoomLevel;
            const dx = event.clientX - panStartScreenX;
            const dy = event.clientY - panStartScreenY;
            panOffsetX = panStartOffsetX - dx / effectiveScale;
            panOffsetY = panStartOffsetY - dy / effectiveScale;
            applyZoomTransform();
            return;
        }

        if (!isDragging || !dragSourceId) return;

        const rect = canvasContainer.getBoundingClientRect();
        dragCurrentX = event.clientX - rect.left;
        dragCurrentY = event.clientY - rect.top;

        // DRAG-THROUGH LOGIC:
        // If we hover a DIFFERENT star while dragging, issue order and continue drag from THERE
        const targetStar = hitTestStar(dragCurrentX, dragCurrentY);

        if (targetStar && targetStar.id !== dragSourceId) {
            // Validate connection first - use correct data source for multiplayer
            const connections = activeGameStore.connections as StarConnection[];
            const isConnected = connections.some(
                (c) =>
                    (c.sourceId === dragSourceId &&
                        c.targetId === targetStar.id) ||
                    (c.sourceId === targetStar.id &&
                        c.targetId === dragSourceId),
            );

            if (isConnected) {
                const stars = activeGameStore.stars as StarState[];
                const sourceStar = stars.find(
                    (s: StarState) => s.id === dragSourceId,
                );
                const localPlayerId = activeGameStore.localPlayerId;
                const isSourceMine = sourceStar?.ownerId === localPlayerId;
                const isTargetMine = targetStar.ownerId === localPlayerId;
                // Any non-owned star (enemy OR neutral) can anchor a deferred order chain
                const isTargetNonOwned = !isTargetMine;

                if (isSourceMine) {
                    // Dragging from my star - issue normal order
                    // Ctrl-click = order clears on conquest (inverts default persist=true)
                    const success = doIssueOrder(
                        dragSourceId,
                        targetStar.id,
                        !event.ctrlKey, // persist unless ctrl-click
                    );
                    if (success) {
                        addPendingOrder(dragSourceId, targetStar.id);
                        log.success(
                            "GameCanvas",
                            `Drag-through: ${dragSourceId} -> ${targetStar.id}`,
                        );

                        // Track any non-owned star as a deferred-order anchor
                        if (isTargetNonOwned) {
                            lastEnemyPassthrough = targetStar.id;
                        } else {
                            lastEnemyPassthrough = null;
                        }

                        // Chain continues from target
                        dragSourceId = targetStar.id;
                        dragStartX = dragCurrentX;
                        dragStartY = dragCurrentY;
                        dragSourceCenterX = mapTranspose.x(targetStar);
                        dragSourceCenterY = mapTranspose.y(targetStar);
                        activeStarId = targetStar.id;
                    }
                } else if (lastEnemyPassthrough === dragSourceId) {
                    // Dragging FROM a non-owned star we passed through - set deferred order
                    // Ctrl-click = order clears on conquest
                    const success = doSetDeferredOrder(
                        dragSourceId,
                        targetStar.id,
                        !event.ctrlKey, // persist unless ctrl-click
                    );
                    if (success) {
                        // Add visual indicator for deferred order (dashed line)
                        addPendingOrder(dragSourceId, targetStar.id, true); // true = deferred
                        log.success(
                            "GameCanvas",
                            `Deferred order set: ${dragSourceId} -> ${targetStar.id} (on capture)`,
                        );

                        // Continue chain: track non-owned targets for further deferred orders
                        if (isTargetNonOwned) {
                            lastEnemyPassthrough = targetStar.id;
                        } else {
                            lastEnemyPassthrough = null;
                        }

                        dragSourceId = targetStar.id;
                        dragStartX = dragCurrentX;
                        dragStartY = dragCurrentY;
                        dragSourceCenterX = mapTranspose.x(targetStar);
                        dragSourceCenterY = mapTranspose.y(targetStar);
                    }
                }
            }
        }

        // Render drag preview
        renderDragPreview();
    }

    function handlePointerUp(event: PointerEvent) {
        log.input(
            `▲ pointerUp btn=${event.button} @(${event.clientX},${event.clientY})`,
        );

        // Remove from active pointers
        activePointers.delete(event.pointerId);
        clearLongPress();

        // End pinch when fingers lift
        if (isPinching) {
            if (activePointers.size < 2) isPinching = false;
            return;
        }

        // Double-tap detection (cancel orders on star OR pause on empty space)
        if (event.pointerType === "touch") {
            const rect = canvasContainer.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const star = hitTestStar(x, y);
            const now = performance.now();

            if (
                star &&
                lastTapStarId === star.id &&
                now - lastTapTime < DOUBLE_TAP_MS
            ) {
                // Double-tap on same star → cancel orders
                if (isLocalPlayerStar(star)) {
                    doCancelOrder(star.id);
                    pendingOrders.forEach((key) => {
                        if (key.startsWith(star.id + "->"))
                            pendingOrders.delete(key);
                    });
                    log.success(
                        "GameCanvas",
                        `Double-tap cancel orders on ${star.id}`,
                    );
                }
                lastTapTime = 0;
                lastTapStarId = null;
                cancelDrag();
                return;
            }

            // F-95: Double-tap on EMPTY space → toggle pause/play
            if (
                !star &&
                lastTapStarId === null &&
                now - lastTapTime < DOUBLE_TAP_MS
            ) {
                if (activeGameStore.isPaused) {
                    activeGameStore.resumeGame();
                } else {
                    activeGameStore.pauseGame();
                }
                log.input(
                    `Double-tap empty space → ${activeGameStore.isPaused ? "PAUSED" : "RESUMED"}`,
                );
                lastTapTime = 0;
                cancelDrag();
                return;
            }

            lastTapTime = now;
            lastTapStarId = star?.id ?? null;
        }

        // End pan
        if (isPanning) {
            isPanning = false;
            canvasContainer.style.cursor = "crosshair";
            return;
        }

        const rect = canvasContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const targetStar = hitTestStar(x, y);
        const movedSignificantly =
            isDragging &&
            (Math.abs(x - dragStartX) > 10 || Math.abs(y - dragStartY) > 10);

        // DRAG MODE: If we dragged significantly
        if (movedSignificantly && dragSourceId) {
            if (targetStar && targetStar.id !== dragSourceId) {
                // Validate connection before issuing order
                const connections =
                    activeGameStore.connections as StarConnection[];
                const isConnected = connections.some(
                    (c) =>
                        (c.sourceId === dragSourceId &&
                            c.targetId === targetStar.id) ||
                        (c.sourceId === targetStar.id &&
                            c.targetId === dragSourceId),
                );

                if (isConnected) {
                    // Issue order from drag
                    // Ctrl-click = order clears on conquest
                    const success = doIssueOrder(
                        dragSourceId,
                        targetStar.id,
                        !event.ctrlKey, // persist unless ctrl-click
                    );
                    if (success) {
                        // OPTIMISTIC UI: Add immediately for instant arrow display
                        addPendingOrder(dragSourceId, targetStar.id);
                        log.success(
                            "GameCanvas",
                            `Drag order: ${dragSourceId} → ${targetStar.id}`,
                        );
                    }
                } else {
                    log.state(
                        "GameCanvas",
                        `Drag order rejected: ${dragSourceId} → ${targetStar.id} (not connected)`,
                    );
                }
            }
            cancelDrag();
            return;
        }

        // CLICK LOGIC (Not valid drag)
        // Model: Click any star to select. If prior selection X is connected to Y,
        // issue order (own star = move/attack, enemy star = deferred order).
        // If not connected, just select Y.
        if (!movedSignificantly && targetStar) {
            log.input(
                `pointerUp CLICK → target=${targetStar.id}, activeStarId=${activeStarId || "null"}, isDragging=${isDragging}, movedSig=${movedSignificantly}`,
            );

            // Case 1: Clicked same star -> TOGGLE (deselect)
            if (activeStarId === targetStar.id) {
                activeStarId = null;
                log.input(`  Case 1: TOGGLE deselect ${targetStar.id}`);
            }
            // Case 2: Have a prior selection -> try to issue order, then select Y
            else if (activeStarId) {
                const currentConnections =
                    activeGameStore.connections as StarConnection[];
                const isConnected = currentConnections.some(
                    (c) =>
                        (c.sourceId === activeStarId &&
                            c.targetId === targetStar.id) ||
                        (c.sourceId === targetStar.id &&
                            c.targetId === activeStarId),
                );

                if (isConnected) {
                    const currentStars = activeGameStore.stars as StarState[];
                    const activeStarSnapshot = currentStars.find(
                        (s) => s.id === activeStarId,
                    );
                    // B-43 diagnostic: trace deferred order decision
                    const localPid = activeGameStore.localPlayerId;
                    console.log(
                        `[B43] Click: active=${activeStarId} target=${targetStar.id} connected=${isConnected} activeOwner=${activeStarSnapshot?.ownerId} localPid=${localPid} isLocal=${activeStarSnapshot ? isLocalPlayerStar(activeStarSnapshot) : "N/A"}`,
                    );

                    if (
                        activeStarSnapshot &&
                        isLocalPlayerStar(activeStarSnapshot)
                    ) {
                        // Own star → normal order (attack or reinforce)
                        const success = doIssueOrder(
                            activeStarId,
                            targetStar.id,
                            !event.ctrlKey,
                        );
                        if (success) {
                            addPendingOrder(activeStarId, targetStar.id);
                            log.input(
                                `  Case 2a: ORDER issued ${activeStarId} → ${targetStar.id}`,
                            );
                        }
                    } else if (
                        activeStarSnapshot &&
                        !isLocalPlayerStar(activeStarSnapshot)
                    ) {
                        // Non-owned star (enemy OR neutral) → deferred order (activates on capture)
                        const success = doSetDeferredOrder(
                            activeStarId,
                            targetStar.id,
                            !event.ctrlKey,
                        );
                        if (success) {
                            addPendingOrder(activeStarId, targetStar.id, true);
                            log.input(
                                `  Case 2b: DEFERRED order ${activeStarId} → ${targetStar.id}`,
                            );
                        }
                    } else {
                        log.input(
                            `  Case 2c: no order (source=${activeStarId} owner=${activeStarSnapshot?.ownerId || "null"})`,
                        );
                    }
                } else {
                    log.input(
                        `  Case 2d: NOT CONNECTED ${activeStarId} ↛ ${targetStar.id}`,
                    );
                }

                // Always select the new star (whether order was issued or not)
                activeStarId = targetStar.id;
            }
            // Case 3: No prior selection -> just select
            else {
                activeStarId = targetStar.id;
                log.input(`  Case 3: SELECT ${targetStar.id}`);
            }
        } else if (!movedSignificantly && !targetStar) {
            log.input(
                `pointerUp CLICK → empty space, clearing selection (movedSig=${movedSignificantly})`,
            );
            clearSelection();
        } else {
            log.input(
                `pointerUp → no action (movedSig=${movedSignificantly}, target=${targetStar?.id || "null"}, dragSrc=${dragSourceId || "null"})`,
            );
        }

        cancelDrag();
    }

    function handleRightClick(event: MouseEvent) {
        event.preventDefault();

        const rect = canvasContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const star = hitTestStar(x, y);

        if (star && isLocalPlayerStar(star) && star.targetId) {
            // Cancel order for this star
            doCancelOrder(star.id);
            log.state("GameCanvas", `Order cancelled for star ${star.id}`);
        } else if (
            star &&
            !isLocalPlayerStar(star) &&
            star.ownerId !== "neutral"
        ) {
            // Right-click on enemy star - cancel any deferred order
            const key = Array.from(deferredOrders).find((k) =>
                k.startsWith(`${star.id}|`),
            );
            if (key) {
                deferredOrders.delete(key);
                log.state(
                    "GameCanvas",
                    `Deferred order cancelled for enemy star ${star.id}`,
                );
            }
        }

        // Right-click always clears selection
        clearSelection();
    }

    function clearSelection() {
        activeStarId = null;
        cancelDrag();
        log.state("GameCanvas", "Selection cleared");
    }

    function cancelDrag() {
        isDragging = false;
        dragSourceId = null;

        // Reset order chain depth for audio
        orderChainDepth = 0;

        // Clear preview
        if (dragPreviewGraphics) {
            dragPreviewGraphics.clear();
        }
    }

    function renderDragPreview() {
        if (!dragPreviewGraphics || !isDragging || !dragSourceId) return;

        dragPreviewGraphics.clear();

        // Convert current mouse position to world coordinates for drawing
        const cursorWorld = screenToWorld(dragCurrentX, dragCurrentY);

        // Draw line from star CENTER to cursor (not click position)
        dragPreviewGraphics.moveTo(dragSourceCenterX, dragSourceCenterY);
        dragPreviewGraphics.lineTo(cursorWorld.x, cursorWorld.y);
        dragPreviewGraphics.stroke({
            color: 0x00ffff,
            width: 3,
            alpha: 0.7,
        });

        // Draw circle at cursor
        dragPreviewGraphics.circle(cursorWorld.x, cursorWorld.y, 8);
        dragPreviewGraphics.stroke({
            color: 0x00ffff,
            width: 2,
            alpha: 0.9,
        });

        // Highlight target star if hovering AND valid connection exists
        const target = hitTestStar(dragCurrentX, dragCurrentY);
        if (target && target.id !== dragSourceId) {
            // Check connectivity
            // Check connectivity
            const currentConnections =
                activeGameStore.connections as StarConnection[];
            const isConnected = currentConnections.some(
                (c: StarConnection) =>
                    (c.sourceId === dragSourceId && c.targetId === target.id) ||
                    (c.sourceId === target.id && c.targetId === dragSourceId),
            );

            if (isConnected) {
                dragPreviewGraphics.circle(
                    mapTranspose.x(target),
                    mapTranspose.y(target),
                    target.radius + 15,
                );
                dragPreviewGraphics.stroke({
                    color: isLocalPlayerStar(target) ? 0x00ff00 : 0xff4466,
                    width: 3,
                    alpha: 0.8,
                });
            }
        }
    }

    // ============================================================================
    // Reactive Updates
    // ============================================================================

    // The animation loop handles rendering, no need for $effect

    function isEditableKeyboardTarget(target: EventTarget | null): boolean {
        const el = target as HTMLElement | null;
        if (!el) return false;
        const tag = el.tagName;
        return (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT" ||
            el.isContentEditable
        );
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (isEditableKeyboardTarget(event.target)) {
            return;
        }
        if (event.key === "Escape") {
            clearSelection();
        } else if (event.key === "Home") {
            // Reset zoom/pan to default fit-to-screen
            resetZoom();
        } else if (
            (event.key === " " || event.code === "Space") &&
            !event.repeat
        ) {
            // Spacebar = play/pause toggle (restores previous speed)
            event.preventDefault();
            if (activeGameStore.isPaused) {
                activeGameStore.resumeGame();
            } else {
                activeGameStore.pauseGame();
            }
        } else if (event.key === "p" || event.key === "P") {
            // P = pause/play toggle (alias)
            if (activeGameStore.isPaused) {
                activeGameStore.resumeGame();
            } else {
                activeGameStore.pauseGame();
            }
        }
    }

    function handleKeyUp(event: KeyboardEvent) {
        if (isEditableKeyboardTarget(event.target)) {
            return;
        }
        if (event.key === " " || event.code === "Space") {
            event.preventDefault();
        }
    }
</script>

<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<div
    class="game-canvas"
    role="application"
    aria-label="Game canvas - click or drag from your stars to attack"
    bind:this={canvasContainer}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointerleave={(e) => {
        activePointers.delete(e.pointerId);
        clearLongPress();
        cancelDrag();
        if (isPinching && activePointers.size < 2) isPinching = false;
        if (isPanning) {
            isPanning = false;
            canvasContainer.style.cursor = "crosshair";
        }
    }}
    oncontextmenu={handleRightClick}
    onwheel={handleWheel}
></div>

<!-- FPS / Ship Count Overlay -->
<div class="fps-overlay">
    {currentFps} FPS · {totalVisualShips.toLocaleString()} ships
</div>

<style>
    .game-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        cursor: crosshair;
        touch-action: none;
        z-index: 2;
    }

    .game-canvas :global(canvas) {
        display: block;
        width: 100% !important;
        height: 100% !important;
        pointer-events: none;
    }

    .fps-overlay {
        position: fixed;
        top: 8px;
        left: 8px;
        z-index: 9999;
        font-family: "Consolas", "Monaco", monospace;
        font-size: 11px;
        color: #0f0;
        background: rgba(0, 0, 0, 0.6);
        padding: 3px 8px;
        border-radius: 4px;
        pointer-events: none;
        user-select: none;
    }
    @media (max-width: 1024px) {
        .fps-overlay {
            display: none;
        }
    }
</style>
