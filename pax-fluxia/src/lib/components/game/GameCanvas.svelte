<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { get } from "svelte/store";
    import * as PIXI from "pixi.js";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { animationStore } from "$lib/stores/animationStore.svelte";
    import { audioManager } from "$lib/services/audioManager.svelte";
    import { mapTranspose } from "$lib/stores/mapTranspose.svelte";
    import { log, setGamePaused } from "$lib/utils/logger";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { normalizeBgImagePath } from "$lib/config/bgManifest";
    import { resolvePixiRendererDiagnostics } from "$lib/renderers/pixiRendererDiagnostics";
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
        type TerritoryTransitionEntry,
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
        type StarOwnerTransition,
        type StarLabelView,
    } from "$lib/renderers/StarRenderer";
    import {
        renderConnections as renderConnectionsModule,
    } from "$lib/renderers/LaneRenderer";
    import { renderInteractionOverlay } from "$lib/renderers/InteractionOverlayRenderer";
    import {
        renderShips as renderShipsModule,
        type SurgeState,
        type ShipRenderState,
        type ShipRenderResources,
    } from "$lib/renderers/ShipRenderer";
    import { renderStarPower as renderStarPowerModule } from "$lib/renderers/StarPowerRenderer";
    // Legacy territory renderers + orchestrator + runtime bridge removed in the
    // cleanup campaign (Stage 3C — quarantine). Kept dispatch: power_vector,
    // grid_gradient, ember_lattice, phase_edges, phase_field.
    import { normalizeTerritoryRenderModeId } from "$lib/territory/ui/territoryRenderModeCatalog";
    import type { TerritoryModeSelection } from "$lib/territory/contracts/TerritoryModeSelection";
    import {
        getRenderFamily,
        registerRenderFamily,
        disposeAllRenderFamilies,
    } from "$lib/territory/families/renderFamilyRegistry";
    import {
        CellGridPhaseEdgesFamily,
        createCellGridPhaseEdgesFamily,
        createCellGridEmberLatticeFamily,
    } from "$lib/territory/families/cellGrid/CellGridPhaseEdgesFamily";
    import {
        CellGridPhaseFieldFamily,
        createCellGridPhaseFieldFamily,
    } from "$lib/territory/families/cellGrid/CellGridPhaseFieldFamily";
    import {
        cellGridPhaseEdgesGeometryDefaults,
        cellGridPhaseEdgesModeDefaults,
        cellGridPhaseFieldGeometryDefaults,
        cellGridPhaseFieldModeDefaults,
    } from "$lib/territory/families/cellGrid/config";
    import {
        cellGridStats,
        updateCellGridStats,
    } from "$lib/territory/families/cellGrid/cellGridStats";
    import { gridGradientStats } from "$lib/territory/families/gridGradient/gridGradientStats";
    import {
        GridGradientFamily,
        createGridGradientFamily,
    } from "$lib/territory/families/gridGradient/GridGradientFamily";
    import {
        createGridGradientTransitionTraceState,
        logGridGradientTransitionTrace,
    } from "$lib/territory/families/gridGradient/transitionTraceLogger";
    import { PowerVectorFamily, createPowerVectorFamily } from "$lib/territory/families/powerVector/PowerVectorFamily";
    import { buildRenderFamilyInput } from "$lib/territory/families/buildRenderFamilyInput";
    import {
        buildPerimeterFieldRenderFamilyGeometry,
        buildOwnershipSnapshotFromStars,
        computePowerCoreEndpointForFamily,
    } from "$lib/territory/families/buildFamilyGeometry";
    import type {
        RenderFamilyActiveTransition,
        RenderFamilyTransitionSession,
    } from "$lib/territory/families/RenderFamilyTypes";
    import { buildRenderFamilyTransitionLifecycle } from "$lib/territory/transitions/renderFamilyTransitionLifecycle";
    import { getTerritoryVisualEpoch } from "$lib/territory/bumpTerritoryVisualConfig";
    import {
        buildTerritoryGeometryCacheKeyParts,
        readNormalizedTerritoryGeometryTunables,
    } from "$lib/territory/geometry/geometryTuning";
    import {
        normalizePerimeterFieldGeometrySource,
        POWER_CORE_GEOMETRY_SOURCE,
    } from "$lib/territory/geometry/geometrySource";
    import {
        commitKineticEndpoint,
        kineticEndpointNeedsCommit,
        sampleKineticForFrame,
        resetKineticRuntimeBridge,
        getActiveKineticFrame,
        getKineticDiagnostics,
        getKineticPresentationNonce,
        setEndSnapFixMode,
    } from "$lib/territory/geometry/powerCore/kineticRuntimeBridge";
    import { setMorphCompleteAt } from "$lib/territory/geometry/powerCore/sampleKineticFrame";
    import type {
        OwnershipSnapshot,
        TerritoryConquestEvent,
    } from "$lib/territory/contracts/OwnershipContracts";
    import type { ResolvedGeometrySnapshot } from "$lib/territory/contracts/GeometryContracts";
    import type { TerritoryFrameInput } from "$lib/territory/contracts/TerritoryFrameInput";
    import { transitionSnapshotRecorder } from "$lib/territory/devtools/TransitionSnapshotRecorder";
    import {
        geometryTrace,
        summarizeOwners,
    } from "$lib/territory/devtools/geometryPipelineTrace";
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
    import { resolveEffectiveLaneMarginPx } from "$lib/lanes/laneMargin";
    import { measurePerf, recordPerfEvent } from "$lib/perf/perfProbe";
    import {
        resetTerritoryRenderStatus,
        setTerritoryRenderStatus,
    } from "$lib/stores/territoryRenderStatusStore";
    import { gameHudStatsStore } from "$lib/stores/gameHudStatsStore";
    import {
        buildTerritoryPresentationFrameKey,
        getTerritoryPresentationSpaceDiagnostics,
        localizeResolvedGeometrySnapshot,
        localizeTerritoryPresentationStars,
        type TerritoryPresentationFrame,
    } from "$lib/components/game/territoryPresentationSpace";
    import {
        createTransitionDiagnosticsCapture,
        type TransitionDiagnosticFrameInput,
    } from "$lib/components/game/transitionDiagnosticsCapture";
    import { createInteractionCaches } from "$lib/components/game/interactionCaches";
    import {
        createCameraModel,
        clampZoom,
        ZOOM_STEP,
    } from "$lib/components/game/cameraModel";
    import { createCanvasClientRectCache } from "$lib/components/game/canvasClientRect";
    import { createTerritoryPresentationQueue } from "$lib/components/game/territoryPresentationQueue";
    import { createInteractionOverlay } from "$lib/components/game/interactionOverlay";
    import {
        createOrderMutationQueue,
        removeQueuedOrderEntriesFromSource,
        type OrderDispatchMode,
    } from "$lib/components/game/orderMutationQueue";
    import {
        resolveCenteredViewportFrame,
        resolveContentFitWorldRect,
        resolveViewportWorldRect,
    } from "$lib/components/game/worldRect";

    // ============================================================================
    // PixiJS Application
    // ============================================================================

    let canvasContainer: HTMLDivElement;
    // bound from the markup; the overlay module reads it through a getter
    let interactionOverlayCanvas: HTMLCanvasElement | null = null;
    let app: PIXI.Application | null = null;

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
    let starLabels: Map<string, StarLabelView> = new Map();
    let starVisualKeys: Map<string, string> = new Map();
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
    let dragHoverTargetId: string | null = null;
    let orbGraphics: PIXI.Graphics | null = null; // For orb travel glow effects (needs Graphics)

    // FPS tracking
    let fpsFrameCount = 0;
    let fpsLastTime = performance.now();
    let currentFps = $state(0);
    let totalVisualShips = $state(0);

    $effect(() => {
        gameHudStatsStore.setStats({
            fps: currentFps,
            visualShips: totalVisualShips,
        });
    });

    // Ship Spawn Animation Tracking
    // Key: `${starId}-${shipIndex}`, Value: spawnTimestamp
    let shipSpawnTimers: Map<string, number> = new Map();
    let starShipCounts: Map<string, number> = new Map(); // Track previous counts

    // ── FX Orchestrator (V2 — manages all visual ship state via VSM) ────
    const fxOrchestrator = new FXOrchestrator();
    const TERRITORY_INPUT_PRIORITY_WINDOW_MS = 180;
    const ORDER_MUTATION_PRIORITY_WINDOW_MS = 320;
    const SHIP_RENDER_INPUT_YIELD_RESCUE_STALE_MS = 32;
    const CONNECTIONS_PRESENT_HEAVY_UPDATE_MS = 2;
    const CONNECTIONS_PRESENT_INTERACTIVE_MIN_CADENCE_MS = 96;
    const CONNECTIONS_PRESENT_IDLE_MIN_CADENCE_MS = 24;
    const CONNECTIONS_PRESENT_MAX_STALE_MS = 160;
    const CONNECTIONS_PRESENT_INPUT_HOLD_MAX_STALE_MS = 360;
    const STARS_PRESENT_HEAVY_UPDATE_MS = 2;
    const STARS_PRESENT_INTERACTIVE_MIN_CADENCE_MS = 80;
    const STARS_PRESENT_IDLE_MIN_CADENCE_MS = 48;
    const STARS_PRESENT_MAX_STALE_MS = 144;
    const STARS_PRESENT_INPUT_HOLD_MAX_STALE_MS = 320;
    const CONQUEST_PRESENT_TARGET_FRAME_MS = 1000 / 60;
    let territoryInputPriorityUntilMs = 0;
    let lastTerritoryUpdateStartedAtMs = 0;
    let lastTerritoryUpdateCostMs = 0;
    let lastTerritoryPresentedAtMs = 0;
    let territoryDeferralActive = false;
    let deferredTerritoryFrameCount = 0;
    let deferredTerritoryReason = "";
    let territoryCadenceSkipCount = 0;
    let territoryLastMode = "";
    let lastShipRenderStartedAtMs = 0;
    let lastShipRenderCostMs = 0;
    let lastShipRenderPresentedAtMs = 0;
    let shipRenderDeferralActive = false;
    let deferredShipRenderFrameCount = 0;
    let deferredShipRenderReason = "";
    let shipRenderCadenceSkipCount = 0;
    let lastConnectionsPresentCostMs = 0;
    let lastConnectionsPresentedAtMs = 0;
    let lastStarsPresentCostMs = 0;
    let lastStarsPresentedAtMs = 0;
    let renderFrameInputYieldCount = 0;
    let lastRenderFrameInputYieldStage = "";
    let lastRenderFrameInputYieldReason = "";
    let lastRenderFrameInputYieldAtMs = 0;
    let shipRenderYieldRescueCount = 0;
    let lastShipRenderContext = "";
    let lastShipRenderReason = "";
    const territoryPresentationQueue = createTerritoryPresentationQueue({
        logGridGradientTransition: (stage, data) =>
            logGridGradientTransition(stage, data),
        runTerritoryUpdate: (label, fn) => runTerritoryUpdate(label, fn),
    });
    const interactionCaches = createInteractionCaches(() => ({
        stars: activeGameStore.stars as StarState[],
        connections: activeGameStore.connections as StarConnection[],
    }));
    const canvasClientRect = createCanvasClientRectCache(() => canvasContainer);
    const interactionOverlay = createInteractionOverlay({
        getCanvas: () => interactionOverlayCanvas,
        getContainer: () => canvasContainer,
        getStageTransform: () =>
            app
                ? {
                      scaleX: app.stage.scale.x,
                      scaleY: app.stage.scale.y,
                      offsetX: app.stage.x,
                      offsetY: app.stage.y,
                  }
                : null,
        getCanvasRect: (reason) => canvasClientRect.get(reason),
        screenToWorld: (x, y) => screenToWorld(x, y),
        ensureStars: () => interactionCaches.ensure().stars,
        getStarsById: () => interactionCaches.getStarsById(),
        getInteraction: () => ({
            activeStarId,
            dragSourceId,
            dragHoverTargetId,
            isDragging,
            dragSourceCenterX,
            dragSourceCenterY,
            dragCurrentX,
            dragCurrentY,
            pendingOrders,
            deferredOrders,
        }),
        projectWorldPoint: toDisplayPoint,
        isLocalPlayerStar: (star) => isLocalPlayerStar(star),
        getColorUtils: () => colorUtils,
        getSessionId: () => activeGameStore.sessionId,
        onRendered: () =>
            setTerritoryRenderStatus({ arrowRenderer: "overlay_canvas" }),
    });
    const orderMutationQueue = createOrderMutationQueue({
        getInteraction: () => ({
            activeStarId,
            dragSourceId,
            pendingOrders,
            deferredOrders,
        }),
        getStarById: (starId) => interactionCaches.getStarById(starId),
        ensureStarCount: () => interactionCaches.ensure().stars.length,
        renderOverlayNow: () => interactionOverlay.renderNow(),
        noteInteractivePressure: (reason, windowMs) =>
            noteInteractivePressure(reason, windowMs),
        orderMutationPriorityWindowMs: ORDER_MUTATION_PRIORITY_WINDOW_MS,
    });

    /**
     * Bias the render loop toward input for a window: territory presents and
     * ship-render cadence check this deadline before doing heavy work. `kind`
     * is unused since its logging was removed; kept so call sites stay
     * self-describing.
     */
    function noteInteractivePressure(
        _kind?: string,
        durationMs = TERRITORY_INPUT_PRIORITY_WINDOW_MS,
    ): void {
        territoryInputPriorityUntilMs = Math.max(
            territoryInputPriorityUntilMs,
            performance.now() + durationMs,
        );
    }

    // Instrument-only probe (reported in the benchmark scheduler snapshot).
    function hasBrowserInputPending(): boolean {
        const scheduling = (navigator as Navigator & {
            scheduling?: { isInputPending?: () => boolean };
        }).scheduling;
        if (typeof scheduling?.isInputPending !== "function") return false;
        try {
            return scheduling.isInputPending();
        } catch {
            return false;
        }
    }

    // P0 (PowerCore plan): presentation never yields to input or throttles on a
    // cadence — visible territory truth is painted immediately, every frame. The
    // input-yield/cadence machinery this replaced traded stale visuals for
    // prettier frame tables (the proven overnight-branch regression class).
    function shouldYieldRenderFrameForInput(
        _frameStartedAtMs: number,
        _stage: string,
    ): boolean {
        return false;
    }

    function runTerritoryUpdate<T>(name: string, fn: () => T): T {
        const startedAt = performance.now();
        lastTerritoryUpdateStartedAtMs = startedAt;
        const result = measurePerf(name, fn);
        lastTerritoryUpdateCostMs = performance.now() - startedAt;
        lastTerritoryPresentedAtMs = performance.now();
        return result;
    }

    function runShipRender<T>(name: string, fn: () => T): T {
        const startedAt = performance.now();
        lastShipRenderStartedAtMs = startedAt;
        const result = measurePerf(name, fn);
        lastShipRenderCostMs = performance.now() - startedAt;
        lastShipRenderPresentedAtMs = performance.now();
        return result;
    }

    function clearShipRenderDeferralState(shipScheduler: {
        cadenceMs: number;
        staleMs: number;
    }): void {
        if (!shipRenderDeferralActive) return;


        shipRenderDeferralActive = false;
        deferredShipRenderFrameCount = 0;
        shipRenderCadenceSkipCount = 0;
        deferredShipRenderReason = "";
    }

    function presentShipsFrame(params: {
        stars: StarState[];
        starsById: Map<string, StarState>;
        tickProgress: number;
        nowMs: number;
        context: string;
        rescueStaleMs?: number;
    }): boolean {
        travelingShips = fxOrchestrator.vsm.travelingShips;
        const shipScheduler = shouldThrottleShipRenderCadence({
            nowMs: params.nowMs,
            isPaused: activeGameStore.isPaused,
            travelingShips: travelingShips.length,
        });
        const rescueStaleMs = params.rescueStaleMs ?? null;
        const rescueShipCadence =
            rescueStaleMs !== null &&
            travelingShips.length > 0 &&
            shipScheduler.staleMs >= rescueStaleMs;
        const deferShipRender =
            !activeGameStore.isPaused &&
            shipScheduler.defer &&
            !rescueShipCadence;

        if (deferShipRender) {
            deferredShipRenderFrameCount += 1;
            shipRenderCadenceSkipCount += 1;
            if (!shipRenderDeferralActive) {
                shipRenderDeferralActive = true;
                deferredShipRenderReason = shipScheduler.reason;


            }
            return false;
        }

        clearShipRenderDeferralState(shipScheduler);

        if (rescueShipCadence) {
            shipRenderYieldRescueCount += 1;
        }

        // Reset particle pool index for this frame
        shipParticleIndex = 0;
        // Clear orb travel graphics (drawn fresh each frame)
        if (orbGraphics) orbGraphics.clear();

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
            tickProgress: params.tickProgress,
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
        runShipRender("game.renderFrame.ships", () => {
            renderShipsModule(
                params.stars,
                params.starsById,
                shipState,
                shipRes,
                colorUtils,
            );
        });
        // Read back mutable state modified by the module
        nextShipId = shipState.nextShipId;
        shipParticleIndex = shipRes.shipParticleIndex;
        // Sync filtered array back to VSM so arrived ships are removed from the authoritative source
        fxOrchestrator.vsm.syncTravelingShips(shipState.travelingShips);
        lastShipRenderContext = params.context;
        lastShipRenderReason = rescueShipCadence
            ? `yield_rescue:${shipScheduler.reason}`
            : shipScheduler.reason;


        measurePerf("game.renderFrame.shipParticleUpdate", () => {
            for (let i = shipParticleIndex; i < shipParticlePool.length; i++) {
                shipParticlePool[i].alpha = 0;
            }
            if (shipParticleContainer) shipParticleContainer.update();
        });
        return true;
    }

    function maybeRenderShipsBeforeInputYield(params: {
        stars: StarState[];
        starsById: Map<string, StarState>;
        tickProgress: number;
        stage: string;
    }): void {
        if (activeGameStore.isPaused) return;
        if (fxOrchestrator.vsm.travelingShips.length === 0) return;
        presentShipsFrame({
            stars: params.stars,
            starsById: params.starsById,
            tickProgress: params.tickProgress,
            nowMs: performance.now(),
            context: `yield:${params.stage}`,
            rescueStaleMs: SHIP_RENDER_INPUT_YIELD_RESCUE_STALE_MS,
        });
    }

    function runConnectionsPresentation<T>(name: string, fn: () => T): T {
        const startedAt = performance.now();
        const result = measurePerf(name, fn);
        lastConnectionsPresentCostMs = performance.now() - startedAt;
        lastConnectionsPresentedAtMs = performance.now();
        return result;
    }

    function runStarsPresentation<T>(name: string, fn: () => T): T {
        const startedAt = performance.now();
        const result = measurePerf(name, fn);
        lastStarsPresentCostMs = performance.now() - startedAt;
        lastStarsPresentedAtMs = performance.now();
        return result;
    }

    function shouldThrottlePresentationLayer(params: {
        nowMs: number;
        isPaused: boolean;
        lastPresentedAtMs: number;
        lastCostMs: number;
        heavyUpdateMs: number;
        interactiveMinCadenceMs: number;
        idleMinCadenceMs: number;
        maxStaleMs: number;
        inputHoldMaxStaleMs: number;
        allowIdleCadence?: boolean;
    }): { defer: boolean; reason: string; cadenceMs: number; staleMs: number } {
        const staleMs =
            params.lastPresentedAtMs > 0
                ? params.nowMs - params.lastPresentedAtMs
                : Number.POSITIVE_INFINITY;
        return {
            defer: false,
            reason: "immediate",
            cadenceMs: 0,
            staleMs,
        };
    }
    function shouldThrottleTerritoryCadence(params: {
        nowMs: number;
        isPaused: boolean;
        configChanged: boolean;
        activeMode: string;
        pendingConquests: number;
    }): { defer: boolean; reason: string; cadenceMs: number; staleMs: number } {
        const staleMs =
            lastTerritoryPresentedAtMs > 0
                ? params.nowMs - lastTerritoryPresentedAtMs
                : Number.POSITIVE_INFINITY;
        return {
            defer: false,
            reason: "immediate",
            cadenceMs: 0,
            staleMs,
        };
    }

    function shouldThrottleShipRenderCadence(params: {
        nowMs: number;
        isPaused: boolean;
        travelingShips: number;
    }): { defer: boolean; reason: string; cadenceMs: number; staleMs: number } {
        const staleMs =
            lastShipRenderPresentedAtMs > 0
                ? params.nowMs - lastShipRenderPresentedAtMs
                : Number.POSITIVE_INFINITY;
        return {
            defer: false,
            reason: "immediate",
            cadenceMs: 0,
            staleMs,
        };
    }

    /**
     * World point -> display space. Thin adapter over mapTranspose (which is
     * per-axis) for the callers that need a point-to-point callback; the
     * transpose convention itself lives in the store, shared with the renderers.
     */
    function toDisplayPoint(point: { x: number; y: number }): {
        x: number;
        y: number;
    } {
        return { x: mapTranspose.x(point), y: mapTranspose.y(point) };
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

    function isGridGradientTransitionDebugEnabled(): boolean {
        return Boolean(
            (GAME_CONFIG as unknown as Record<string, unknown>)
                .GRID_GRADIENT_DEBUG_TRANSITIONS,
        );
    }

    const gridGradientTransitionTraceState =
        createGridGradientTransitionTraceState();
    const renderFamilyPendingPreviewStartedAtMsByKey = new Map<string, number>();

    function logGridGradientTransition(stage: string, data: Record<string, unknown>): void {
        logGridGradientTransitionTrace({
            enabled: isGridGradientTransitionDebugEnabled(),
            state: gridGradientTransitionTraceState,
            stage,
            label: stage,
            data,
        });
    }

    function syncRenderFamilyPendingPreviewStarts(params: {
        nowMs: number;
        pendingConquests: ReadonlyArray<import("@pax/common").ConquestEvent>;
        activeEntries: ReadonlyArray<TerritoryTransitionEntry>;
    }): ReadonlyMap<string, number> {
        const liveKeys = new Set<string>();
        for (const entry of params.activeEntries) {
            liveKeys.add(transitionIdentityKey(entry.event));
        }
        for (const conquest of params.pendingConquests) {
            const key = transitionIdentityKey(conquest);
            liveKeys.add(key);
            if (!renderFamilyPendingPreviewStartedAtMsByKey.has(key)) {
                renderFamilyPendingPreviewStartedAtMsByKey.set(key, params.nowMs);
            }
        }
        for (const key of [...renderFamilyPendingPreviewStartedAtMsByKey.keys()]) {
            if (!liveKeys.has(key)) {
                renderFamilyPendingPreviewStartedAtMsByKey.delete(key);
            }
        }
        return renderFamilyPendingPreviewStartedAtMsByKey;
    }

    function optionalArrayLength(value: unknown): number | null {
        return Array.isArray(value) ? value.length : null;
    }

    function summarizeRenderFamilyTransitionForLog(
        transition: RenderFamilyActiveTransition | null,
    ): Record<string, unknown> {
        if (!transition) {
            return {
                present: false,
                eventCount: 0,
            };
        }
        return {
            present: true,
            sessionKey: transition.sessionKey,
            eventCount: transition.events.length,
            progress: transition.progress,
            rawProgress: transition.rawProgress,
            startedAtMs: transition.startedAtMs,
            durationMs: transition.durationMs,
            events: transition.events.map((entry) => ({
                starId: entry.event.starId,
                previousOwner: entry.event.previousOwner,
                newOwner: entry.event.newOwner,
                startedAtMs: entry.startedAtMs,
                durationMs: entry.durationMs,
                progress: entry.progress,
                rawProgress: entry.rawProgress,
            })),
        };
    }

    function summarizeTransitionOwnersForLog(
        transition: RenderFamilyActiveTransition | null,
        starsToRead: ReadonlyArray<StarState>,
    ): ReadonlyArray<Record<string, unknown>> {
        if (!transition) return [];
        const ownerById = new Map<string, string | null>();
        for (const star of starsToRead) ownerById.set(star.id, star.ownerId ?? null);
        return transition.events.map((entry) => ({
            starId: entry.event.starId,
            expectedPreviousOwner: entry.event.previousOwner,
            expectedNewOwner: entry.event.newOwner,
            currentOwner: ownerById.get(entry.event.starId) ?? null,
        }));
    }

    function buildTerritoryPresentationRequestSignature(params: {
        activeMode: string;
        isPaused: boolean;
        currentTick: number | null | undefined;
        territoryConfigFp: string;
        territoryPresentationFrameKey: string;
        pendingConquests: ReadonlyArray<import("@pax/common").ConquestEvent>;
        transitionPresentationSignature: string;
        kineticNonce: number;
    }): string {
        const pendingConquestSig =
            params.pendingConquests.length > 0
                ? params.pendingConquests
                      .map((conquest) => transitionIdentityKey(conquest))
                      .sort()
                      .join("|")
                : "";
        return [
            params.activeMode,
            params.isPaused ? 1 : 0,
            params.currentTick ?? -1,
            pendingConquestSig,
            params.transitionPresentationSignature,
            // K2c/K3a: changes every frame while a kinetic morph is active so
            // morph frames are not deduped/cached (else conquests "snap").
            params.kineticNonce,
            params.territoryPresentationFrameKey,
            params.territoryConfigFp,
        ].join("::");
    }

    function buildRenderFamilyTransitionState(
        transitionNowMs: number,
        effectiveTickMs: number,
        pendingConquests: ReadonlyArray<import("@pax/common").ConquestEvent> = [],
    ): {
        activeTransition: RenderFamilyActiveTransition | null;
        activeSessions: readonly RenderFamilyTransitionSession[];
        transitionPresentationSignature: string;
    } {
        const activeEntries = territoryTransitions.getActiveEntries();
        const pendingPreviewStarts = syncRenderFamilyPendingPreviewStarts({
            nowMs: transitionNowMs,
            pendingConquests,
            activeEntries,
        });
        const lifecycle = buildRenderFamilyTransitionLifecycle({
            nowMs: transitionNowMs,
            effectiveTickMs,
            activeEntries,
            pendingConquests,
            pendingConquestStartedAtMsByKey: pendingPreviewStarts,
        });
        logGridGradientTransition("transition_lifecycle.after_build", {
            nowMs: transitionNowMs,
            effectiveTickMs,
            activeEntryCount: activeEntries.length,
            pendingConquestCount: pendingConquests.length,
            activeSessionCount: lifecycle.activeSessions.length,
            terminalFrameStarIds: lifecycle.terminalFrameStarIds,
            activeTransition:
                summarizeRenderFamilyTransitionForLog(lifecycle.activeTransition),
        });
        if (lifecycle.terminalFrameStarIds.length > 0) {
            logGridGradientTransition("transition_lifecycle.terminal_mark", {
                terminalFrameStarIds: lifecycle.terminalFrameStarIds,
            });
            territoryTransitions.markTerminalFrameRendered(
                lifecycle.terminalFrameStarIds,
            );
        }
        const activeTransition = lifecycle.activeTransition;
        if (!activeTransition) {
            logGridGradientTransition("transition_lifecycle.no_active_transition", {
                activeSessionCount: lifecycle.activeSessions.length,
                pendingConquestCount: pendingConquests.length,
            });
            return {
                activeTransition: null,
                activeSessions: lifecycle.activeSessions,
                transitionPresentationSignature: "",
            };
        }
        const frameSlot = Math.max(
            0,
            Math.floor(
                Math.max(0, transitionNowMs - activeTransition.startedAtMs) /
                    CONQUEST_PRESENT_TARGET_FRAME_MS,
            ),
        );
        const transitionPresentationSignature = [
            activeTransition.events
                .map((entry) =>
                    [
                        transitionIdentityKey(entry.event),
                        Math.max(1, Math.round(entry.durationMs)),
                    ].join("@"),
                )
                .sort()
                .join("|"),
            frameSlot,
        ].join("::");
        logGridGradientTransition("transition_lifecycle.active_transition", {
            frameSlot,
            transitionPresentationSignature,
            activeTransition: summarizeRenderFamilyTransitionForLog(activeTransition),
        });
        return {
            activeTransition,
            activeSessions: lifecycle.activeSessions,
            transitionPresentationSignature,
        };
    }

    function buildStarOwnerTransitionMap(
        sessions: readonly RenderFamilyTransitionSession[],
    ): ReadonlyMap<string, StarOwnerTransition> | undefined {
        if (sessions.length === 0) return undefined;
        const transitions = new Map<string, StarOwnerTransition>();
        for (const session of sessions) {
            for (const entry of session.events) {
                transitions.set(entry.event.starId, {
                    previousOwner: entry.event.previousOwner,
                    newOwner: entry.event.newOwner,
                    progress: entry.progress,
                });
            }
        }
        return transitions.size > 0 ? transitions : undefined;
    }

    function buildEdgeForwardRenderFamilyConfigSource(): Record<string, unknown> {
        return {
            // BOTH geometry AND presentation mode-defaults are FALLBACKS only — live
            // GAME_CONFIG wins LAST so the user's saved/tuned values persist (border/
            // fill/wave/spacing). Entering this mode primes its look into GAME_CONFIG
            // via primeCellGridPhaseEdgesTunables (which only writes keys the user
            // hasn't overridden), so the mode look is preserved while user edits stick.
            // (Previously mode-defaults spread LAST and clobbered user values every
            // frame — the long-standing "settings don't persist" bug.)
            ...cellGridPhaseEdgesGeometryDefaults,
            ...cellGridPhaseEdgesModeDefaults,
            ...(GAME_CONFIG as unknown as Record<string, unknown>),
        };
    }

    // Ember Lattice is a DISTINCT mode from Phase Edges. Unlike Phase Edges, it does
    // NOT apply `cellGridPhaseEdgesModeDefaults` (the locked edge-forward border/
    // fill/wave look) — its "dense lattice + inward heat grading" presentation is driven
    // by live config instead. This distinction existed at 040634c08 (split-ember) and was
    // lost when Ember was re-pointed at buildEdgeForwardRenderFamilyConfigSource, making
    // the two modes render identically. Restored here.
    function buildEmberLatticeRenderFamilyConfigSource(): Record<string, unknown> {
        return {
            // Geometry from live GAME_CONFIG (uniform across modes); geometry defaults are a
            // fallback only. Ember's presentation is GAME_CONFIG-driven (no mode defaults).
            ...cellGridPhaseEdgesGeometryDefaults,
            ...(GAME_CONFIG as unknown as Record<string, unknown>),
        };
    }

    function buildGridGradientRenderFamilyConfigSource(): Record<string, unknown> {
        return {
            // Geometry + presentation mode-defaults are FALLBACKS only; live GAME_CONFIG
            // wins LAST so user-saved values persist (matches phase_field/ember and the
            // edge-forward builder above). The old 0319 geometry-source pin is retired:
            // geometry is UNIFIED on PowerCore across all modes (2026-07-08,
            // user-verified in every render mode).
            ...cellGridPhaseEdgesGeometryDefaults,
            ...cellGridPhaseEdgesModeDefaults,
            ...(GAME_CONFIG as unknown as Record<string, unknown>),
        };
    }

    function buildPhaseFieldRenderFamilyConfigSource(): Record<string, unknown> {
        return {
            ...cellGridPhaseFieldGeometryDefaults,
            ...cellGridPhaseFieldModeDefaults,
            ...(GAME_CONFIG as unknown as Record<string, unknown>),
        };
    }

    function buildRenderFamilyModeConfigSourceUncached(
        mode: string,
    ): Record<string, unknown> | undefined {
        if (mode === "phase_edges") {
            return buildEdgeForwardRenderFamilyConfigSource();
        }
        if (mode === "ember_lattice") {
            return buildEmberLatticeRenderFamilyConfigSource();
        }
        if (mode === "phase_field") {
            return buildPhaseFieldRenderFamilyConfigSource();
        }
        if (mode === "grid_gradient") {
            return buildGridGradientRenderFamilyConfigSource();
        }
        return undefined;
    }

    // Perf (Grid Gradient): the render-family config source spreads the whole GAME_CONFIG
    // plus geometry/mode defaults into a new object, and is requested several times per
    // frame. The spread result only changes when a territory visual setting changes, which
    // already bumps __TERRITORY_VISUAL_EPOCH -- the same signal the render-family geometry
    // cache keys on. Memoize by (mode, epoch) so steady frames reuse one stable object
    // instead of rebuilding it. Invalidation is by epoch, so slider/theme/import changes
    // still apply immediately (no live-tuning regression).
    let renderFamilyModeConfigSourceCacheValue:
        | Record<string, unknown>
        | undefined;
    let renderFamilyModeConfigSourceCacheMode: string | null = null;
    let renderFamilyModeConfigSourceCacheEpoch = -1;

    function getRenderFamilyModeConfigSource(
        mode: string,
    ): Record<string, unknown> | undefined {
        const epoch = getTerritoryVisualEpoch();
        if (
            renderFamilyModeConfigSourceCacheMode === mode &&
            renderFamilyModeConfigSourceCacheEpoch === epoch
        ) {
            return renderFamilyModeConfigSourceCacheValue;
        }
        const built = buildRenderFamilyModeConfigSourceUncached(mode);
        renderFamilyModeConfigSourceCacheValue = built;
        renderFamilyModeConfigSourceCacheMode = mode;
        renderFamilyModeConfigSourceCacheEpoch = epoch;
        return built;
    }

    function modeUsesSharedRenderFamilyGeometry(mode: string): boolean {
        return (
            mode === "metaball" ||
            mode === "cell_grid" ||
            mode === "phase_edges" ||
            mode === "ember_lattice" ||
            mode === "phase_field" ||
            mode === "grid_gradient"
        );
    }

    function updateLiveCellGridTransitionDiagnostics(params: {
        activeTransition: RenderFamilyActiveTransition | null;
        effectiveTickMs: number;
    }): void {
        const activeEntries = territoryTransitions.getActiveEntries();
        const latestEntry =
            activeEntries.length > 0
                ? [...activeEntries].sort((a, b) => {
                      if (a.startTimeMs !== b.startTimeMs) {
                          return b.startTimeMs - a.startTimeMs;
                      }
                      return b.starId.localeCompare(a.starId);
                  })[0]!
                : null;
        updateCellGridStats({
            configuredTransitionMs:
                GAME_CONFIG.TERRITORY_TRANSITION_MS ?? null,
            bindTransitionToTick:
                GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK ?? false,
            effectiveTickMs: params.effectiveTickMs,
            latestEntryDurationMs: latestEntry?.durationMs ?? null,
            latestEntryStartedAtMs: latestEntry?.startTimeMs ?? null,
            activeTransitionDurationMs:
                params.activeTransition?.durationMs ?? null,
            activeTransitionStartedAtMs:
                params.activeTransition?.startedAtMs ?? null,
        });
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

        const snapshot = {
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

        return snapshot;
    }

    function resolveActiveTerritoryMode(): string {
        // Migrate any persisted legacy render-mode id (e.g. metaball_grid_phase_edges)
        // to its canonical name in place, so all downstream reads see the new id.
        // Inferring a mode from the retired per-renderer booleans is NOT done here:
        // that migration belongs to the theme-read boundary (normalizeThemeValues),
        // which is where legacy data actually enters. This is the render path.
        const normalizedMode = normalizeTerritoryRenderModeId(
            GAME_CONFIG.TERRITORY_RENDER_MODE,
        );
        if (normalizedMode !== GAME_CONFIG.TERRITORY_RENDER_MODE) {
            GAME_CONFIG.TERRITORY_RENDER_MODE = normalizedMode as typeof GAME_CONFIG.TERRITORY_RENDER_MODE;
        }
        return GAME_CONFIG.TERRITORY_RENDER_MODE ?? "none";
    }

    // ── Runtime territory instances (class-encapsulated, no module-level state) ─
    // Runtime territory bridge/controller/renderer (territory_runtime) removed in
    // Stage 3C — that mode is quarantined.
    let pipelineTraceFrame = 0;
    let renderFamilyGeometryCacheKey: string | null = null;
    let renderFamilyGeometryCache: ResolvedGeometrySnapshot | null = null;
    // K2c: per-frame session context for the kinetic transition runtime. Set
    // once per frame after the transition lifecycle is built (search
    // "kineticFrameContext"); read by the power_core geometry build's endpoint
    // collector so a commit uses THIS frame's session key + game clock.
    let kineticFrameActiveTransition: RenderFamilyActiveTransition | null = null;
    let kineticFrameNowMs = 0;
    let kineticFrameDurationMs = 0;
    let kineticFrameConquestFrontMode: "linear" | "radial" = "radial";
    // Conquest-frame spike fix (power_vector): when an ownership change lands,
    // only the CHEAP endpoint is committed on that frame (starts the sweep); the
    // ~10ms snapshot assembly is deferred to this deadline (a light mid-morph
    // frame), or to settle if the morph ends first. null = no rebuild pending.
    let pvSnapshotRebuildDueMs: number | null = null;
    let renderFamilyStableGeometryKey: string | null = null;
    let renderFamilyStableGeometry: ResolvedGeometrySnapshot | null = null;
    let renderFamilyStableOwnership: OwnershipSnapshot | null = null;

    // Dev-tooling conquest capture (see transitionDiagnosticsCapture.ts). Deps are
    // getters: every one of these changes after this line runs.
    const transitionDiagnostics = createTransitionDiagnosticsCapture({
        getApp: () => app,
        getVoronoiContainer: () => voronoiContainer,
        getGameTimeMs: () => fxOrchestrator.gameTime,
        getMapWorldSize: () => ({ width: GAME_WIDTH, height: GAME_HEIGHT }),
        getTerritoryWorldSize: () => ({
            width: territoryWorldWidth,
            height: territoryWorldHeight,
        }),
        getStableGeometry: () => renderFamilyStableGeometry,
        getStableOwnership: () => renderFamilyStableOwnership,
        getRenderFamilyModeConfigSource,
        getCurrentRenderFamilyGeometry,
        buildRenderFamilyOwnershipSnapshot,
        summarizeTransitionOwnersForLog,
        logGridGradientTransition,
    });

    function buildRenderFamilyGeometryCacheKey(
        stars: ReadonlyArray<StarState>,
        lanes: ReadonlyArray<StarConnection>,
        configSource?: Record<string, unknown>,
    ): string {
        const source =
            configSource ??
            (GAME_CONFIG as unknown as Record<string, unknown>);
        const geometryTunables =
            readNormalizedTerritoryGeometryTunables(source);
        let key = `${getTerritoryVisualEpoch()}:${GAME_WIDTH}:${GAME_HEIGHT}:`;
        key += `${normalizePerimeterFieldGeometrySource(source.PERIMETER_FIELD_GEOMETRY_SOURCE)}:${source.TERRITORY_GEOMETRY_MODE ?? ""}:`;
        key += `${(source as any).__GEOMETRY_REFRESH_TOKEN ?? 0}:`;
        key += `${buildTerritoryGeometryCacheKeyParts(geometryTunables).join(":")}:`;
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
        configSource?: Record<string, unknown>,
    ): ResolvedGeometrySnapshot {
        const source =
            configSource ??
            (GAME_CONFIG as unknown as Record<string, unknown>);
        const key = buildRenderFamilyGeometryCacheKey(stars, lanes, source);
        const __wasMiss =
            renderFamilyGeometryCacheKey !== key || !renderFamilyGeometryCache;
        if (renderFamilyGeometryCacheKey !== key || !renderFamilyGeometryCache) {
            renderFamilyGeometryCache = buildPerimeterFieldRenderFamilyGeometry({
                stars,
                lanes,
                worldWidth: GAME_WIDTH,
                worldHeight: GAME_HEIGHT,
                nowMs: fxOrchestrator.gameTime,
                ownership: buildOwnershipSnapshotFromStars(stars),
                geometrySource: normalizePerimeterFieldGeometrySource(
                    source.PERIMETER_FIELD_GEOMETRY_SOURCE,
                ),
                configSource: source,
                // K2c: only fires on the power_core source, only on a real
                // (cache-miss) rebuild = ownership change. Commits the new
                // settled state to the kinetic runtime, reusing this exact
                // endpoint (no second diagram compute).
                collectEndpoint: (endpoint) => {
                    commitKineticEndpoint({
                        endpoint,
                        stars,
                        activeTransition: kineticFrameActiveTransition,
                        nowMs: kineticFrameNowMs,
                        durationMs: kineticFrameDurationMs,
                        conquestFrontMode: kineticFrameConquestFrontMode,
                    });
                },
            });
            renderFamilyGeometryCacheKey = key;

        }
        if (geometryTrace.capturing) {
            const g = renderFamilyGeometryCache;
            geometryTrace.step("g", "geomcache", {
                hit: !__wasMiss,
                key: key.slice(-12),
            });
            if (g)
                geometryTrace.step("s", "snapshot", {
                    v: String(g.version ?? "").slice(0, 10),
                    srcMode: g.sourceMode,
                    method: g.sourceMethod,
                    fam: g.geometryFamily,
                    regions: g.territoryRegions.length,
                    fronts: g.frontierPolylines.length,
                    world: g.worldBorderPolylines.length,
                    shells: g.shells.length,
                    topo: g.diagnostics?.topologyReliable,
                    closed: g.diagnostics?.closureReliable,
                    owners: summarizeOwners(
                        g.territoryRegions.map((r) => r.ownerId),
                    ),
                });
        }
        return renderFamilyGeometryCache;
    }

    // Cache the last presented authoritative render-family frame so a new
    // conquest can diff against what was just on screen instead of falling back
    // to the last fully idle frame.
    function syncLiveRenderFamilyStableFrame(params: {
        activeTransition: RenderFamilyActiveTransition | null;
        stars: ReadonlyArray<StarState>;
        lanes: ReadonlyArray<StarConnection>;
        geometry: ResolvedGeometrySnapshot;
        configSource?: Record<string, unknown> | null;
        freezeDuringActiveTransition?: boolean;
    }): void {
        if (params.freezeDuringActiveTransition && params.activeTransition) {
            logGridGradientTransition("stable_frame.freeze_gate", {
                activeTransition:
                    summarizeRenderFamilyTransitionForLog(
                        params.activeTransition,
                    ),
                geometryVersion: params.geometry.version,
            });
            return;
        }
        const key = buildRenderFamilyGeometryCacheKey(
            params.stars,
            params.lanes,
            params.configSource ?? undefined,
        );
        if (
            renderFamilyStableGeometryKey === key &&
            renderFamilyStableGeometry === params.geometry &&
            renderFamilyStableOwnership
        ) {
            logGridGradientTransition("stable_frame.cache_unchanged_gate", {
                key,
                geometryVersion: params.geometry.version,
                ownershipVersion: renderFamilyStableOwnership.version,
            });
            return;
        }
        renderFamilyStableGeometryKey = key;
        renderFamilyStableGeometry = params.geometry;
        renderFamilyStableOwnership = buildOwnershipSnapshotFromStars(
            params.stars,
        );
        logGridGradientTransition("stable_frame.updated", {
            key,
            geometryVersion: renderFamilyStableGeometry.version,
            ownershipVersion: renderFamilyStableOwnership.version,
        });
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
    // Resize handling is split so a settings-menu open/close (which animates the
    // CSS grid every frame) stays smooth AND keeps the correct aspect ratio:
    //  - every frame: refitViewportNow() — cheap (resize backbuffer + uniform
    //    re-fit + territory frame), so the map tracks the container undistorted;
    //  - on settle (RESIZE_SETTLE_MS idle): the full handleResize() runs once for
    //    the heavy refresh (overlay re-render, world-bounds, nebula, logging).
    // Because the per-frame refit already lands on the correct fit, the settle
    // handleResize changes nothing visible → no snap.
    let resizeSettleTimer: ReturnType<typeof setTimeout> | null = null;
    const RESIZE_SETTLE_MS = 90;
    let lastTickGameTimeMs = 0; // Game-clock time at last tick (for tickProgress)
    let lastRenderedTickProgress = 0;

    // starsById cache — rebuilt only when star array identity changes (on tick events)
    const cachedStarsById = new Map<string, StarState>();
    let cachedStarsSource: StarState[] | null = null;

    // Previous frame cache removed — animations are event-driven (see POST_MORTEMS.md)

    // Zoom, pan, content bounds and camera animation (see cameraModel.ts).
    // The model owns the transform; app.stage is its projection.
    const camera = createCameraModel();

    /** Height of the bottom UI overlay — now 0 because CSS Grid sizes the canvas container */
    const BOTTOM_UI_INSET = 0;

    export function centerAndFit() {
        updateWorldBounds();
        if (app && app.stage) {
            camera.fitBaseScaleTo({
                width: app.screen.width,
                height: app.screen.height,
            });
            updateTerritoryViewportFrame();
        }
        // First call snaps instantly (no animation from 0,0)
        if (!camera.isInitialized()) {
            camera.snapToDefault();
            applyZoomTransform();
            return;
        }
        camera.animateToDefault();
    }

    /** Navigate to a specific star by centering the viewport on it */
    export function navigateToStar(starId: string, zoom: number = 2.5) {
        const stars = activeGameStore.stars;
        const star = stars?.find((s: any) => s.id === starId);
        if (!star || !app) return;

        const clampedZoom = clampZoom(zoom);

        // Use transposed coordinates
        const sx = mapTranspose.x(star);
        const sy = mapTranspose.y(star);

        camera.animateToWorldPoint({ x: sx, y: sy }, clampedZoom);

        log.canvas(
            "navigateToStar",
            `id=${starId} target=(${sx.toFixed(0)},${sy.toFixed(0)}) zoom=${clampedZoom.toFixed(2)}`,
        );
    }

    /** Advance camera animation one frame (called from render loop) */
    function stepCameraAnimation() {
        if (!camera.stepAnimation()) return;
        applyZoomTransform();
    }

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
    ): void {
        interactionCaches.ensure();
        if (
            !interactionCaches.hasStar(sourceId) ||
            !interactionCaches.hasStar(targetId)
        ) {
            return;
        }

        const key = `${sourceId}|${targetId}`;

        if (isDeferred) {
            // For deferred orders, allow one per enemy star
            removeQueuedOrderEntriesFromSource(sourceId, deferredOrders);
            pendingOrders.delete(`${targetId}|${sourceId}`);
            deferredOrders.delete(`${targetId}|${sourceId}`);
            deferredOrders.add(key);
        } else {
            // Remove any old order from source (source can only have one target)
            removeQueuedOrderEntriesFromSource(sourceId, pendingOrders);
            // Same-owner lane exclusivity is fixed behavior.
            pendingOrders.delete(`${targetId}|${sourceId}`);
            deferredOrders.delete(`${targetId}|${sourceId}`);
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
        dispatchMode: OrderDispatchMode = "queued",
        path = "game_canvas",
    ): number {
        const targetStar = interactionCaches.getStarById(targetId);
        if (targetStar) {
            audioManager.play(
                isLocalPlayerStar(targetStar) ? "move" : "attack",
            );
        }
        return orderMutationQueue.enqueue(
            { kind: "issue", sourceId, targetId, persist, path },
            dispatchMode,
        );
    }

    // Helper: Cancel order via unified store
    function doCancelOrder(
        starId: string,
        dispatchMode: OrderDispatchMode = "queued",
        path = "game_canvas",
    ): number {
        return orderMutationQueue.enqueue(
            { kind: "cancel", starId, path },
            dispatchMode,
        );
    }

    // Helper: Set deferred order via unified store
    function doSetDeferredOrder(
        sourceId: string,
        targetId: string,
        persist: boolean,
        dispatchMode: OrderDispatchMode = "queued",
        path = "game_canvas",
    ): number {
        const targetStar = interactionCaches.getStarById(targetId);
        if (targetStar) {
            audioManager.play(
                isLocalPlayerStar(targetStar) ? "move" : "attack",
            );
        }
        return orderMutationQueue.enqueue(
            { kind: "defer", sourceId, targetId, persist, path },
            dispatchMode,
        );
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

        log.success(
            "GameCanvas",
            `PixiJS initialized (${app.screen.width}x${app.screen.height})`,
        );
        if (linkGraphics) linkGraphics.visible = false;
        if (selectionOverlayGraphics) selectionOverlayGraphics.visible = false;
        if (dragPreviewGraphics) dragPreviewGraphics.visible = false;

        // Apply initial scale transformation
        handleResize();

        // Start animation loop
        startAnimationLoop();

        // Handle window resize
        window.addEventListener("resize", handleResize);
        window.addEventListener(
            "scroll",
            handleCanvasViewportGeometryChange,
            true,
        );
        visualViewportTarget?.addEventListener(
            "resize",
            handleCanvasViewportGeometryChange,
        );
        visualViewportTarget?.addEventListener(
            "scroll",
            handleCanvasViewportGeometryChange,
        );

        // Use ResizeObserver for more accurate container resize detection.
        // Debounced: during a rapid resize burst (e.g. the settings-menu slide
        // animating the grid every frame) the canvas CSS-stretches and we defer
        // the expensive full handleResize until the size settles, so the
        // animation stays smooth instead of recomputing the map every frame.
        resizeObserver = new ResizeObserver(() => {
            // Per frame: cheap refit so the map tracks the container at the correct
            // aspect throughout the animation (no horizontal stretch, ends on the
            // exact settle state → no snap).
            refitViewportNow();
            // On settle: the full handleResize refreshes the heavy bits (overlay
            // re-render, world-bounds, nebula, logging) once.
            if (resizeSettleTimer) clearTimeout(resizeSettleTimer);
            resizeSettleTimer = setTimeout(() => {
                resizeSettleTimer = null;
                handleResize();
            }, RESIZE_SETTLE_MS);
        });
        resizeObserver.observe(canvasContainer);
    });

    onDestroy(() => {
        log.sys("GameCanvas", "Destroying PixiJS application");
        // Restore telemetry logging when leaving the game (don't leave it paused-suppressed).
        setGamePaused(false);
        gameHudStatsStore.reset();
        resetKineticRuntimeBridge();

        window.removeEventListener("resize", handleResize);
        window.removeEventListener(
            "scroll",
            handleCanvasViewportGeometryChange,
            true,
        );
        visualViewportTarget?.removeEventListener(
            "resize",
            handleCanvasViewportGeometryChange,
        );
        visualViewportTarget?.removeEventListener(
            "scroll",
            handleCanvasViewportGeometryChange,
        );

        // F-107: Remove orientation listener and reset transpose flag
        if (orientationQuery) {
            orientationQuery.removeEventListener("change", onOrientationChange);
        }
        mapTranspose.active = false;

        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }
        if (resizeSettleTimer) {
            clearTimeout(resizeSettleTimer);
            resizeSettleTimer = null;
        }

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        // Must precede dropping the canvas ref: dispose() clears the surface.
        interactionOverlay.dispose();
        interactionOverlayCanvas = null;

        // Render families are held in a module-global registry. Dispose them
        // before destroying the Pixi app so a later GameCanvas mount cannot
        // reuse family instances whose Graphics were already destroyed.
        disposeAllRenderFamilies();

        if (app) {
            app.destroy(true, { children: true });
            app = null;
        }
        for (const label of rulerLabels) {
            label.destroy();
        }
        rulerLabels = [];
        territoryPresentationQueue.abort();
        interactionCaches.clear();
        resetTerritoryRenderStatus();

        starGraphics.clear();
        starLabels.clear();
        starVisualKeys.clear();
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
            // Pause ALL telemetry logging (except errors) while the game is paused.
            setGamePaused(isPaused);
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
            if (stars.length === 0) {
                interactionOverlay.clear();
                linkGraphics?.clear();
                dragPreviewGraphics?.clear();
            }
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
                lastRenderedTickProgress = tickProgress;
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

    // The camera-fit rect for the star map lives in the camera model.
    // Stable coordinate-space map extents rooted at (0,0).
    let GAME_WIDTH = 1600;
    let GAME_HEIGHT = 900;
    // Territory fill frame that is viewport-aligned but centered on the star map.
    let territoryWorldMinX = 0;
    let territoryWorldMinY = 0;
    let territoryWorldWidth = 1600;
    let territoryWorldHeight = 900;

    function getTerritoryPresentationFrame(): TerritoryPresentationFrame {
        return {
            minX: territoryWorldMinX,
            minY: territoryWorldMinY,
            width: territoryWorldWidth,
            height: territoryWorldHeight,
        };
    }

    /** Resolve configured map extents for the current display orientation. */
    function getConfiguredMapWorldSize(): {
        width?: number;
        height?: number;
    } {
        const configuredWidth =
            typeof GAME_CONFIG._MAP_WIDTH === "number" &&
            Number.isFinite(GAME_CONFIG._MAP_WIDTH) &&
            GAME_CONFIG._MAP_WIDTH > 0
                ? GAME_CONFIG._MAP_WIDTH
                : undefined;
        const configuredHeight =
            typeof GAME_CONFIG._MAP_HEIGHT === "number" &&
            Number.isFinite(GAME_CONFIG._MAP_HEIGHT) &&
            GAME_CONFIG._MAP_HEIGHT > 0
                ? GAME_CONFIG._MAP_HEIGHT
                : undefined;
        if (!configuredWidth || !configuredHeight) {
            return {};
        }
        return mapTranspose.active
            ? {
                  width: configuredHeight,
                  height: configuredWidth,
              }
            : {
                  width: configuredWidth,
                  height: configuredHeight,
              };
    }

    function updateWorldBounds() {
        const currentStars = activeGameStore.stars as StarState[];
        if (!currentStars || currentStars.length === 0) return;
        const displayPoints = currentStars.map((star) => ({
            x: mapTranspose.x(star),
            y: mapTranspose.y(star),
        }));
        const fitRect = resolveContentFitWorldRect(displayPoints);
        const configuredWorldSize = getConfiguredMapWorldSize();
        const worldRect = resolveViewportWorldRect({
            points: displayPoints,
            configuredWidth: configuredWorldSize.width,
            configuredHeight: configuredWorldSize.height,
        });

        camera.setContentBounds({
            minX: fitRect.minX,
            minY: fitRect.minY,
            width: fitRect.width,
            height: fitRect.height,
        });
        GAME_WIDTH = worldRect.width;
        GAME_HEIGHT = worldRect.height;

        log.canvas(
            "WorldBounds",
            `stars=${currentStars.length} fit=(${fitRect.minX.toFixed(0)},${fitRect.minY.toFixed(0)} ${fitRect.width.toFixed(0)}x${fitRect.height.toFixed(0)}) map=${GAME_WIDTH.toFixed(0)}x${GAME_HEIGHT.toFixed(0)} required=${worldRect.requiredWidth.toFixed(0)}x${worldRect.requiredHeight.toFixed(0)} source=${worldRect.source} transpose=${mapTranspose.active}`,
        );

    }

    function updateTerritoryViewportFrame() {
        if (!app) return;
        const fitScale = Math.max(camera.getBaseScale(), 0.000001);
        const contentCenter = camera.getContentCenter();
        const viewportFrame = resolveCenteredViewportFrame({
            centerX: contentCenter.x,
            centerY: contentCenter.y,
            viewportWidthPx: app.screen.width,
            viewportHeightPx: app.screen.height,
            scale: fitScale,
        });
        territoryWorldMinX = viewportFrame.minX;
        territoryWorldMinY = viewportFrame.minY;
        territoryWorldWidth = viewportFrame.width;
        territoryWorldHeight = viewportFrame.height;
        if (voronoiContainer) {
            const prevX = voronoiContainer.x;
            const prevY = voronoiContainer.y;
            // Map-space families (Phase Field, Grid Gradient) draw at absolute world
            // coords with the container parked at the stage origin, like the starmap;
            // presentation-local families draw frame-local and need the container at the
            // frame minimum. Writing the presentation-local minimum UNCONDITIONALLY here was
            // the resize / centerAndFit "second writer" that displaced map-space territory
            // from the starmap until the next present re-ran (the bug this fixes). See
            // TERRITORY_COORD_AND_WORLD_BORDER_UNIFICATION_2026-05-08.
            const resizeActiveMode = resolveActiveTerritoryMode();
            const containerAtMapOrigin =
                resizeActiveMode === "phase_field" ||
                resizeActiveMode === "grid_gradient";
            const nextContainerX = containerAtMapOrigin ? 0 : territoryWorldMinX;
            const nextContainerY = containerAtMapOrigin ? 0 : territoryWorldMinY;
            voronoiContainer.x = nextContainerX;
            voronoiContainer.y = nextContainerY;
            log.canvas(
                "TerritoryFrame",
                `voronoiContainer (${prevX.toFixed(2)},${prevY.toFixed(2)}) -> (${nextContainerX.toFixed(2)},${nextContainerY.toFixed(2)}) frame=${territoryWorldWidth.toFixed(0)}x${territoryWorldHeight.toFixed(0)} mode=${resizeActiveMode} mapOrigin=${containerAtMapOrigin}`,
            );
        }
    }

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
        const debugBounds = camera.getContentBounds();
        dbg.rect(
            debugBounds.minX,
            debugBounds.minY,
            debugBounds.width,
            debugBounds.height,
        );
        dbg.stroke({ color: 0xffff00, width: 3 });
        // Crosshair at content center
        const { x: cx, y: cy } = camera.getContentCenter();
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
        // Legacy renderer module caches removed in Stage 3C. Kept render families
        // manage their own lifecycle via the RenderFamily registry (dispose*),
        // so there is nothing to reset here now.
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
            camera.reset();
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
    const visualViewportTarget =
        typeof window !== "undefined" ? window.visualViewport : null;

    function onOrientationChange(e: MediaQueryListEvent) {
        viewportIsPortrait = e.matches;
        log.sys(
            "GameCanvas",
            `Orientation changed → viewport is now ${viewportIsPortrait ? "portrait" : "landscape"}`,
        );
        syncOrientationIfNeeded();
        handleResize();
    }

    function handleCanvasViewportGeometryChange() {
        canvasClientRect.invalidate();
    }

    if (orientationQuery) {
        orientationQuery.addEventListener("change", onOrientationChange);
    }

    function handleResize() {
        if (!app || !app.renderer) return;

        canvasClientRect.invalidate();
        app.resize();

        // F-107: Orientation is handled by matchMedia listener (onOrientationChange)

        // Recompute world bounds from star positions
        updateWorldBounds();

        // Calculate base scale to fit content bounding box in container
        const containerWidth = app.screen.width;
        const containerHeight = app.screen.height;

        camera.fitBaseScaleTo({
            width: containerWidth,
            height: containerHeight,
        });
        updateTerritoryViewportFrame();

        // Size nebula background to cover visible viewport (not just game world)
        const bgSprite = (app as any)._nebulaBgSprite as
            | PIXI.Sprite
            | undefined;
        if (bgSprite && bgSprite.texture) {
            const effectiveScale = camera.getEffectiveScale();
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
        canvasClientRect.get("resize");

        const canvasEl = canvasContainer;
        const resizeBounds = camera.getContentBounds();
        log.canvas(
            "handleResize",
            `container=${containerWidth.toFixed(0)}x${containerHeight.toFixed(0)} content=(${resizeBounds.minX.toFixed(0)},${resizeBounds.minY.toFixed(0)} ${resizeBounds.width.toFixed(0)}x${resizeBounds.height.toFixed(0)}) baseScale=${camera.getBaseScale().toFixed(4)} dpr=${window.devicePixelRatio} cssGrid(el)=${canvasEl?.clientWidth ?? "?"}x${canvasEl?.clientHeight ?? "?"} viewport=${window.innerWidth}x${window.innerHeight}`,
        );
        interactionOverlay.renderNow();
    }

    // Cheap per-frame refit run during a resize burst (e.g. the settings-menu
    // slide). It keeps the map at the CORRECT aspect on every frame so there is
    // no horizontal stretch and no snap when the full handleResize settles:
    //  - app.resize() syncs the WebGL backbuffer to the container (no CSS stretch)
    //  - baseScale re-fits content (contentWidth/Height are star-derived and do
    //    NOT change with the container, so updateWorldBounds can stay debounced)
    //  - app.stage.scale is uniform, so the scene never distorts
    //  - updateTerritoryViewportFrame keeps territory aligned every frame
    // The heavy parts (overlay re-render, world-bounds recompute, logging) stay in
    // the debounced full handleResize.
    function refitViewportNow() {
        if (!app || !app.renderer) return;
        canvasClientRect.invalidate();
        app.resize();
        camera.fitBaseScaleTo({
            width: app.screen.width,
            height: app.screen.height,
        });
        updateTerritoryViewportFrame();
        applyZoomTransform();
    }

    /**
     * Project the camera model onto the scene graph. The ONLY writer of the
     * app.stage transform.
     *
     * Pan is clamped before the transform is read, so the stage is positioned
     * once from the clamped value; the pre-extraction code wrote the stage from
     * the unclamped pan and then had clampPan() rewrite it, which lands on the
     * same place because the baseline does not depend on pan.
     */
    function applyZoomTransform() {
        if (!app) return;

        const cw = app.screen.width;
        const ch = app.screen.height;
        const viewport = { width: cw, height: ch };

        camera.clampPan(viewport);
        const transform = camera.getTransform(viewport);
        app.stage.scale.set(transform.scale, transform.scale);
        app.stage.x = transform.x;
        app.stage.y = transform.y;

        // Update bg sprite to cover visible viewport at current zoom
        const bgSprite = (app as any)._nebulaBgSprite as
            | PIXI.Sprite
            | undefined;
        if (bgSprite && bgSprite.texture) {
            const viewWorldW = cw / transform.scale;
            const viewWorldH = ch / transform.scale;
            const coverW = Math.max(GAME_WIDTH, viewWorldW) * 1.2;
            const coverH = Math.max(GAME_HEIGHT, viewWorldH) * 1.2;
            const texW = bgSprite.texture.width;
            const texH = bgSprite.texture.height;
            bgSprite.scale.set(Math.max(coverW / texW, coverH / texH));
        }
    }

    function handleWheel(event: WheelEvent) {
        noteInteractivePressure("wheel");
        log.input(
            `⚙ wheel deltaY=${event.deltaY.toFixed(0)} @(${event.clientX},${event.clientY})`,
        );
        event.preventDefault();
        if (!app) return;
        camera.cancelAnimation();

        const { x: screenX, y: screenY } = canvasClientRect.toLocalPoint(
            event.clientX,
            event.clientY,
            "wheel",
        );

        // World point under cursor BEFORE zoom
        const worldBefore = screenToWorld(screenX, screenY);

        const direction = event.deltaY < 0 ? 1 : -1;
        const oldZoom = camera.getZoomLevel();
        const newZoom = camera.setZoomClamped(oldZoom + direction * ZOOM_STEP);
        if (newZoom === oldZoom) return; // Hit limit

        // Keep worldBefore under the cursor at the new zoom.
        camera.setPanFromAnchor(
            { width: app.screen.width, height: app.screen.height },
            { x: screenX, y: screenY },
            worldBefore,
        );

        applyZoomTransform();
    }

    function resetZoom() {
        camera.reset();
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

    // P0 (PowerCore plan): territory presentation is always flushed immediately —
    // the background/message-channel/timeout scheduling alternatives were the
    // stale-display landmine the overnight branch re-enabled (150–700ms pending).
    function drawHex(g: PIXI.Graphics, x: number, y: number, r: number) {
        g.moveTo(x + r * Math.cos(0), y + r * Math.sin(0));
        for (let i = 1; i <= 6; i++) {
            g.lineTo(
                x + r * Math.cos((i * Math.PI) / 3),
                y + r * Math.sin((i * Math.PI) / 3),
            );
        }
    }

    function presentInteractionOverlayFrame(stars: StarState[]): void {
        const rendered = measurePerf(
            "game.renderFrame.interactionOverlay",
            () => {
                return interactionOverlay.renderNow();
            },
            {
                pendingOrders: pendingOrders.size,
                deferredOrders: deferredOrders.size,
                activeStarId,
                dragSourceId,
            },
        );
        if (!rendered) {
            return;
        }

    }

    function finalizeRenderFrame(params: {
        stars: StarState[];
        interactionOverlayPresented?: boolean;
    }): void {
        if (!params.interactionOverlayPresented) {
            presentInteractionOverlayFrame(params.stars);
        }
        orderMutationQueue.flushAcknowledgments();
        fpsFrameCount++;
        const now = performance.now();
        if (now - fpsLastTime >= 1000) {
            currentFps = Math.round((fpsFrameCount * 1000) / (now - fpsLastTime));
            fpsFrameCount = 0;
            fpsLastTime = now;
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
        const frameStartedAtMs = performance.now();
        pipelineTraceFrame += 1;

        // Reset state on new game session
        const currentSessionId = activeGameStore.sessionId;
        if (currentSessionId !== lastSessionId) {
            lastSessionId = currentSessionId;
            pendingOrders.clear();
            deferredOrders.clear();
            lastEnemyPassthrough = null;
            activeStarId = null;
            interactionOverlay.clear();
            visualShips.clear();
            visualDamagedShips.clear();
            fxOrchestrator.reset();
            resetTerritoryRenderCaches();
            activeSurges.clear();
            nextShipId = 0;
            starShipCounts.clear();
            shipSpawnTimers.clear();
            orderMutationQueue.reset();
            lastTerritoryUpdateStartedAtMs = 0;
            lastTerritoryUpdateCostMs = 0;
            lastTerritoryPresentedAtMs = 0;
            territoryDeferralActive = false;
            deferredTerritoryFrameCount = 0;
            deferredTerritoryReason = "";
            territoryCadenceSkipCount = 0;
            territoryLastMode = "";
            territoryPresentationQueue.reset();
            lastShipRenderStartedAtMs = 0;
            lastShipRenderCostMs = 0;
            lastShipRenderPresentedAtMs = 0;
            shipRenderDeferralActive = false;
            deferredShipRenderFrameCount = 0;
            deferredShipRenderReason = "";
            shipRenderCadenceSkipCount = 0;
            lastConnectionsPresentCostMs = 0;
            lastConnectionsPresentedAtMs = 0;
            lastStarsPresentCostMs = 0;
            lastStarsPresentedAtMs = 0;
            renderFrameInputYieldCount = 0;
            lastRenderFrameInputYieldStage = "";
            lastRenderFrameInputYieldReason = "";
            lastRenderFrameInputYieldAtMs = 0;
            shipRenderYieldRescueCount = 0;
            lastShipRenderContext = "";
            lastShipRenderReason = "";
            // B-57: Clear territory fills from previous game immediately so
            // old conquest state doesn't persist while paused after restart.
            if (voronoiContainer) {
                for (const child of voronoiContainer.children) {
                    if ((child as any).clear) (child as any).clear();
                }
            }
            // Restart-reset (the session block predates the PowerCore/kinetic
            // pipeline — every piece of it must reset here too, or the old
            // game leaks into the new one):
            // 1. The kinetic runtime singleton. fxOrchestrator.reset() above
            //    zeroed the FX game clock, so any surviving runtime/morph
            //    timestamps are from the old clock and never retire.
            resetKineticRuntimeBridge();
            kineticFrameActiveTransition = null;
            pvSnapshotRebuildDueMs = null;
            // 2. In-flight transition entries. cleanup() removes entries when
            //    nowMs >= startTimeMs + durationMs — impossible against the
            //    reset clock, so old-game entries would stay "active" forever
            //    and win the active-transition pick (highest tick), making
            //    every new-game conquest commit with the WRONG session — the
            //    "conquest snaps instead of animating after restart" defect.
            territoryTransitions.reset();
            renderFamilyPendingPreviewStartedAtMsByKey.clear();
            // 3. The resolved-geometry cache. Serving the old game's snapshot
            //    as the "stale" commit-frame geometry keeps the family's
            //    version-keyed idle caches matched to the old drawing — the
            //    "territory not redrawn until first conquest" defect.
            renderFamilyGeometryCache = null;
            renderFamilyGeometryCacheKey = null;
            // 4. The render families themselves (pooled morph fills, idle
            //    fill/border caches). They are lazily recreated on the next
            //    presentation, exactly like after onDestroy.
            disposeAllRenderFamilies();
            interactionCaches.clear();
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
        starLabels.forEach((labelView, id) => {
            if (!currentIds.has(id)) {
                labelsContainer!.removeChild(labelView.container);
                labelView.container.destroy();
                starLabels.delete(id);
            }
        });

        // Cache starsById between frames — only rebuild when star array identity changes (tick events)
        if (stars !== cachedStarsSource) {
            cachedStarsById.clear();
            for (const s of stars) cachedStarsById.set(s.id, s);
            cachedStarsSource = stars;
        }
        interactionCaches.rebuild(
            stars,
            activeGameStore.connections as StarConnection[],
        );
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

        // While paused, only skip territory presentation when the already
        // committed or queued semantic scene signature is unchanged.
        const isPausedNow = activeGameStore.isPaused;
        const activeTerritoryMode = resolveActiveTerritoryMode();
        const territoryGeometryFp = buildTerritoryGeometryCacheKeyParts(
            readNormalizedTerritoryGeometryTunables(
                GAME_CONFIG as unknown as Record<string, unknown>,
            ),
        ).join(":");
        const territoryPresentationFrame = getTerritoryPresentationFrame();
        const territoryPresentationFrameKey =
            buildTerritoryPresentationFrameKey(territoryPresentationFrame);
        // Cache key for the committed territory scene. Every part must be a value a
        // renderer actually READS — a key nobody consumes can only throw the caches
        // away for nothing. (This dropped the retired perimeter-field tunables, the
        // engine-method/render-families flags, and two duplicated parts.)
        const territoryConfigFp =
            `${normalizePerimeterFieldGeometrySource(GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE)}:${GAME_CONFIG.TERRITORY_GEOMETRY_MODE}:` +
            `${territoryGeometryFp}:` +
            `${GAME_CONFIG.TERRITORY_CLUSTER_SPLIT}:${GAME_CONFIG.VORONOI_BORDER_SMOOTH}:${GAME_CONFIG.VORONOI_ALPHA}:` +
            `${GAME_CONFIG.VORONOI_BORDER_WIDTH}:${GAME_CONFIG.VORONOI_BORDER_ALPHA}:` +
            `${GAME_CONFIG.TERRITORY_RENDER_MODE}:` +
            `${GAME_CONFIG.TERRITORY_TRANSITION_MS}:` +
            `${(GAME_CONFIG as any).__GEOMETRY_REFRESH_TOKEN ?? 0}:` +
            `${getTerritoryVisualEpoch()}`;
        const configChanged =
            territoryConfigFp !== (globalThis as any).__lastTerritoryConfigFp;
        if (configChanged)
            (globalThis as any).__lastTerritoryConfigFp = territoryConfigFp;
        if (configChanged) resetTerritoryRenderCaches();

        const renderFamilyTransitionState =
            buildRenderFamilyTransitionState(
                fxOrchestrator.gameTime,
                activeGameStore.effectiveTickMs,
                pendingTickEvents?.conquests ?? [],
            );

        // kineticFrameContext (K2c): stash this frame's transition session +
        // game clock so the power_core geometry build's collectEndpoint commits
        // with the correct session key, then sample the active morph. The
        // commit itself happens later this frame inside the geometry build (on
        // ownership change), so the first morph frame samples one tick later —
        // imperceptible, endpoint-exact. Nothing consumes the frame in K2c
        // (zero visual change); this drives the runtime + diagnostics only.
        kineticFrameActiveTransition = renderFamilyTransitionState.activeTransition;
        kineticFrameNowMs = fxOrchestrator.gameTime;
        // Duration is ALWAYS the tick-bound value (min of TERRITORY_TRANSITION_MS
        // and the tick when BIND_TO_TICK) so the sweep spans exactly one tick and
        // its end coincides with the settle. Do NOT use activeTransition.durationMs
        // — that fx-lifecycle value is not tick-capped.
        kineticFrameDurationMs = resolveTerritoryTransitionDurationMs(
            activeGameStore.effectiveTickMs,
        );
        kineticFrameConquestFrontMode =
            GAME_CONFIG.TERRITORY_CONQUEST_FRONT_MODE === "linear"
                ? "linear"
                : "radial";
        // Live-tune where conquest motion completes within the window (Territory
        // → Motion Completion). Injected into the pure kinetic sampler here.
        setMorphCompleteAt(
            (GAME_CONFIG.TERRITORY_MORPH_COMPLETE_PCT ?? 92) / 100,
        );
        // END_SNAP_FIX_EVAL: candidate-fix selector (topbar SNAPFIX toggle).
        setEndSnapFixMode(GAME_CONFIG.TERRITORY_END_SNAP_FIX ?? "off");
        sampleKineticForFrame(
            fxOrchestrator.gameTime,
            normalizePerimeterFieldGeometrySource(
                GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE,
            ) === POWER_CORE_GEOMETRY_SOURCE,
        );

        if (voronoiContainer) {
            const territoryPresentationSignature =
                buildTerritoryPresentationRequestSignature({
                    activeMode: activeTerritoryMode,
                    isPaused: isPausedNow,
                    currentTick: activeGameStore.currentTick,
                    territoryConfigFp,
                    territoryPresentationFrameKey,
                    pendingConquests: pendingTickEvents?.conquests ?? [],
                    transitionPresentationSignature:
                        renderFamilyTransitionState.transitionPresentationSignature,
                    kineticNonce: getKineticPresentationNonce(),
                });
            const pausedPresentationAlreadyCurrent =
                isPausedNow &&
                (territoryPresentationQueue.getLastCommittedSignature() ===
                    territoryPresentationSignature ||
                    territoryPresentationQueue.getPendingSignature() ===
                        territoryPresentationSignature);
            if (!pausedPresentationAlreadyCurrent) {
                const territoryScheduler = shouldThrottleTerritoryCadence({
                    nowMs: performance.now(),
                    isPaused: isPausedNow,
                    configChanged,
                    activeMode: activeTerritoryMode,
                    pendingConquests: pendingTickEvents?.conquests?.length ?? 0,
                });
                const deferTerritoryUpdate =
                    !isPausedNow && territoryScheduler.defer;
                if (activeTerritoryMode === "grid_gradient") {
                    logGridGradientTransition("territory_scheduler.decision", {
                        isPaused: isPausedNow,
                        configChanged,
                        pendingConquestCount:
                            pendingTickEvents?.conquests?.length ?? 0,
                        defer: deferTerritoryUpdate,
                        scheduler: territoryScheduler,
                        renderFamilyTransitionState: {
                            activeTransition:
                                summarizeRenderFamilyTransitionForLog(
                                    renderFamilyTransitionState.activeTransition,
                                ),
                            activeSessionCount:
                                renderFamilyTransitionState.activeSessions.length,
                            transitionPresentationSignature:
                                renderFamilyTransitionState
                                    .transitionPresentationSignature,
                        },
                    });
                }
                if (deferTerritoryUpdate) {
                    deferredTerritoryFrameCount += 1;
                    territoryCadenceSkipCount += 1;
                    if (!territoryDeferralActive) {
                        territoryDeferralActive = true;
                        deferredTerritoryReason = territoryScheduler.reason;


                    }
                } else {
                    if (territoryDeferralActive) {


                        territoryDeferralActive = false;
                        deferredTerritoryFrameCount = 0;
                        territoryCadenceSkipCount = 0;
                        deferredTerritoryReason = "";
                    }
                    voronoiContainer.visible = true;
                    territoryPresentationQueue.queue({
                        signature: territoryPresentationSignature,
                        activeMode: activeTerritoryMode,
                        isPaused: isPausedNow,
                        stars,
                        pendingConquests: pendingTickEvents?.conquests ?? [],
                        territoryScheduler,
                        run: () => {
            territoryLastMode = activeTerritoryMode;


            // Hide all children first — only the active renderer will re-show its own
            const activeVoronoiContainer = voronoiContainer!;
            const territoryPresentationWorldWidth =
                territoryPresentationFrame.width;
            const territoryPresentationWorldHeight =
                territoryPresentationFrame.height;
            // Most branch-derived territory families in current master render in
            // presentation-local space inside the viewport-aligned frame.
            // Phase Field is the exception: its working branch still consumes the
            // resolved map-space contract end-to-end, so adapt it separately in
            // its own case rather than forcing it through this localized path.
            const territoryPresentationStars =
                localizeTerritoryPresentationStars(
                    stars,
                    territoryPresentationFrame,
                );
            const localizePresentationGeometry = (
                geometry: ResolvedGeometrySnapshot | null | undefined,
            ): ResolvedGeometrySnapshot | null =>
                geometry
                    ? localizeResolvedGeometrySnapshot(
                          geometry,
                          territoryPresentationFrame,
                      )
                    : null;
            // Phase 0 diagnostic: capture container.position before the per-mode
            // case block. The preamble below sets it to (frame.minX, .minY); the
            // Phase Field case overrides to (0, 0). The post-switch log (below)
            // compares these so a misalignment shows up as a clear pre/post delta.
            const containerPosPreSwitchX = activeVoronoiContainer.x;
            const containerPosPreSwitchY = activeVoronoiContainer.y;
            activeVoronoiContainer.x = territoryPresentationFrame.minX;
            activeVoronoiContainer.y = territoryPresentationFrame.minY;
            for (const child of activeVoronoiContainer.children) {
                child.visible = false;
            }

            // Rendering is controlled by the Style dropdown (TERRITORY_RENDER_MODE).
            // FG2 geometry runs inside each style case via runFG2DataPipeline(),
            // which also populates trace data for the Trace Inspector.
            {
                // Resolve active render mode — check new enum first, fall back to old booleans
                const activeMode = activeTerritoryMode;
                const activeModeNeedsGeometry =
                    activeMode === "metaball" ||
                    activeMode === "cell_grid" ||
                    activeMode === "phase_edges" ||
                    activeMode === "ember_lattice" ||
                    activeMode === "phase_field" ||
                    activeMode === "grid_gradient" ||
                    activeMode === "power_vector";
                let geometryReady: boolean | null = activeModeNeedsGeometry
                    ? false
                    : null;
                let lastRenderFailure: string | null = null;
                const lanes = activeGameStore.connections as StarConnection[];
                const renderFamilyConfigSource =
                    getRenderFamilyModeConfigSource(activeMode);
                const activeRenderFamilyTransition =
                    renderFamilyTransitionState.activeTransition;
                const __pipePhase = activeRenderFamilyTransition
                    ? "transition"
                    : "steady";
                geometryTrace.begin({
                    mode: activeMode,
                    frame: pipelineTraceFrame,
                    phase: __pipePhase,
                    prog: activeRenderFamilyTransition?.progress ?? null,
                });
                if (geometryTrace.capturing) {
                    // renderFamilyConfigSource is undefined for non-family / 'none' modes
                    // (no config builder) — guard so the trace never throws.
                    const __cfg = (renderFamilyConfigSource ?? {}) as Record<
                        string,
                        unknown
                    >;
                    geometryTrace.step("cfg", "config", {
                        src: String(
                            __cfg.PERIMETER_FIELD_GEOMETRY_SOURCE ?? "",
                        ),
                        wave: String(__cfg.CELL_GRID_WAVE_GEOMETRY ?? ""),
                        flush: __cfg.CELL_GRID_BOUNDARY_FILL_FLUSH as
                            | boolean
                            | undefined,
                        border: String(
                            __cfg.TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE ?? "",
                        ),
                        outer: __cfg.TERRITORY_FRONTIER_OUTER_BORDER_ENABLED as
                            | boolean
                            | undefined,
                    });
                }
                const readFamilyGeometry = (): ResolvedGeometrySnapshot => {
                    const geometry = measurePerf(
                        `game.renderFrame.geometry.${activeMode}`,
                        () =>
                            getCurrentRenderFamilyGeometry(
                                stars,
                                lanes,
                                renderFamilyConfigSource,
                            ),
                    );
                    geometryReady = true;
                    return geometry;
                };
                // Conquest-frame spike fix (power_vector + power_core source):
                // the resolved snapshot costs ~10ms to assemble but is only
                // DRAWN at settle — during a morph the family renders kinetic
                // frames. On an ownership change: commit just the CHEAP endpoint
                // (~1ms, starts the sweep THIS frame, byte-identical to what the
                // snapshot build would commit), return the stale snapshot, and
                // run the full rebuild on a light mid-morph frame (or at settle
                // if the morph ends first). The rebuild's own collectEndpoint
                // commit is fingerprint-guarded → no double commit, no restart.
                const resolvePowerVectorGeometry =
                    (): ResolvedGeometrySnapshot => {
                        const powerCoreActive =
                            normalizePerimeterFieldGeometrySource(
                                renderFamilyConfigSource?.PERIMETER_FIELD_GEOMETRY_SOURCE ??
                                    GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE,
                            ) === POWER_CORE_GEOMETRY_SOURCE;
                        const stale = renderFamilyGeometryCache;
                        if (!powerCoreActive || !stale) {
                            return readFamilyGeometry();
                        }
                        if (kineticEndpointNeedsCommit(stars)) {
                            const endpoint = computePowerCoreEndpointForFamily({
                                stars,
                                lanes,
                                worldWidth: GAME_WIDTH,
                                worldHeight: GAME_HEIGHT,
                                configSource: renderFamilyConfigSource,
                            });
                            if (!endpoint) return readFamilyGeometry();
                            commitKineticEndpoint({
                                endpoint,
                                stars,
                                activeTransition: kineticFrameActiveTransition,
                                nowMs: kineticFrameNowMs,
                                durationMs: kineticFrameDurationMs,
                                conquestFrontMode: kineticFrameConquestFrontMode,
                            });
                            pvSnapshotRebuildDueMs = kineticFrameNowMs + 250;
                            geometryReady = true;
                            return stale;
                        }
                        if (pvSnapshotRebuildDueMs !== null) {
                            const morphActive = getActiveKineticFrame() !== null;
                            if (
                                kineticFrameNowMs >= pvSnapshotRebuildDueMs ||
                                !morphActive
                            ) {
                                pvSnapshotRebuildDueMs = null;
                                return readFamilyGeometry();
                            }
                            geometryReady = true;
                            return stale;
                        }
                        return readFamilyGeometry();
                    };
                let transitionDiagnosticFrameInput:
                    | TransitionDiagnosticFrameInput
                    | null = null;
                const transitionDiagnosticCaptureEnabled =
                    transitionSnapshotRecorder.isEnabled();

                // One-shot diagnostic: which render mode is active?
                if (!(globalThis as any).__RENDER_MODE_LOGGED) {
                    log.state(
                        "GameCanvas",
                        `territory style dispatch renderMode="${GAME_CONFIG.TERRITORY_RENDER_MODE}" activeMode="${activeMode}"`,
                    );
                    (globalThis as any).__RENDER_MODE_LOGGED = true;
                }

                const cellGridPhaseEdgesFamily =
                    getRenderFamily("phase_edges");
                if (
                    activeMode !== "phase_edges" &&
                    cellGridPhaseEdgesFamily instanceof
                        CellGridPhaseEdgesFamily &&
                    cellGridPhaseEdgesFamily.displayRoot.parent ===
                        activeVoronoiContainer
                ) {
                    activeVoronoiContainer.removeChild(
                        cellGridPhaseEdgesFamily.displayRoot,
                    );
                }
                const emberLatticeFamily = getRenderFamily(
                    "ember_lattice",
                );
                if (
                    activeMode !== "ember_lattice" &&
                    emberLatticeFamily instanceof CellGridPhaseEdgesFamily &&
                    emberLatticeFamily.displayRoot.parent === activeVoronoiContainer
                ) {
                    activeVoronoiContainer.removeChild(
                        emberLatticeFamily.displayRoot,
                    );
                }
                const cellGridPhaseFieldFamily =
                    getRenderFamily("phase_field");
                if (
                    activeMode !== "phase_field" &&
                    cellGridPhaseFieldFamily instanceof
                        CellGridPhaseFieldFamily &&
                    cellGridPhaseFieldFamily.displayRoot.parent ===
                        activeVoronoiContainer
                ) {
                    activeVoronoiContainer.removeChild(
                        cellGridPhaseFieldFamily.displayRoot,
                    );
                }
                const gridGradientFamily = getRenderFamily("grid_gradient");
                if (
                    activeMode !== "grid_gradient" &&
                    gridGradientFamily instanceof GridGradientFamily &&
                    gridGradientFamily.displayRoot.parent ===
                        activeVoronoiContainer
                ) {
                    activeVoronoiContainer.removeChild(
                        gridGradientFamily.displayRoot,
                    );
                }
                const powerVectorFamily = getRenderFamily("power_vector");
                if (
                    activeMode !== "power_vector" &&
                    powerVectorFamily instanceof PowerVectorFamily &&
                    powerVectorFamily.displayRoot.parent ===
                        activeVoronoiContainer
                ) {
                    activeVoronoiContainer.removeChild(
                        powerVectorFamily.displayRoot,
                    );
                }

                switch (activeMode) {
                    case "phase_edges": {
                        let fam = getRenderFamily("phase_edges");
                        if (!fam) {
                            registerRenderFamily(
                                createCellGridPhaseEdgesFamily(colorUtils),
                            );
                            fam = getRenderFamily("phase_edges")!;
                        }
                        const mg = fam as CellGridPhaseEdgesFamily;
                        const activeTransition = activeRenderFamilyTransition;
                        const ownership = measurePerf(
                            "game.renderFrame.ownership.phase_edges",
                            () =>
                                buildRenderFamilyOwnershipSnapshot(
                                    territoryPresentationStars,
                                    activeTransition,
                                ),
                        );
                        const geometry = readFamilyGeometry();
                        const diagnosticPrevFrame =
                            transitionDiagnosticCaptureEnabled
                                ? transitionDiagnostics.getPrevFrame({
                                      activeMode,
                                      activeTransition,
                                      stars,
                                      lanes,
                                  })
                                : null;
                        const mgInput = measurePerf(
                            "game.renderFrame.renderFamilyInput.phase_edges",
                            () =>
                                buildRenderFamilyInput({
                                    stars: territoryPresentationStars,
                                    lanes,
                                    worldMinX: territoryPresentationFrame.minX,
                                    worldMinY: territoryPresentationFrame.minY,
                                    worldWidth: territoryPresentationWorldWidth,
                                    worldHeight: territoryPresentationWorldHeight,
                                    nowMs: fxOrchestrator.gameTime,
                                    paused: isPausedNow,
                                    gameTick: activeGameStore.currentTick,
                                    ownership,
                                    geometry:
                                        localizePresentationGeometry(geometry),
                                    prevGeometry: localizePresentationGeometry(
                                        diagnosticPrevFrame?.geometry ?? null,
                                    ),
                                    renderer: app?.renderer ?? undefined,
                                    activeTransition,
                                    transitionSessions:
                                        renderFamilyTransitionState.activeSessions,
                                    tunableKeys: mg.tunableKeys,
                                    configSource: renderFamilyConfigSource,
                                }),
                        );
                        mg.update(mgInput);
                        updateLiveCellGridTransitionDiagnostics({
                            activeTransition,
                            effectiveTickMs: activeGameStore.effectiveTickMs,
                        });
                        if (mg.displayRoot.parent !== activeVoronoiContainer) {
                            activeVoronoiContainer.addChild(mg.displayRoot);
                        }
                        mg.displayRoot.visible = true;                        syncLiveRenderFamilyStableFrame({
                            activeTransition,
                            stars,
                            lanes,
                            geometry,
                            configSource: renderFamilyConfigSource,
                            freezeDuringActiveTransition: true,
                        });
                        if (transitionDiagnosticCaptureEnabled) {
                            transitionDiagnosticFrameInput = {
                                activeMode,
                                activeTransition,
                                stars,
                                lanes,
                                geometry,
                                ownership,
                            };
                        }
                        break;
                    }
                    case "ember_lattice": {
                        let fam = getRenderFamily("ember_lattice");
                        if (!fam) {
                            registerRenderFamily(
                                createCellGridEmberLatticeFamily(
                                    colorUtils,
                                ),
                            );
                            fam = getRenderFamily("ember_lattice")!;
                        }
                        const mg = fam as CellGridPhaseEdgesFamily;
                        const activeTransition = activeRenderFamilyTransition;
                        const ownership = measurePerf(
                            "game.renderFrame.ownership.ember_lattice",
                            () =>
                                buildRenderFamilyOwnershipSnapshot(
                                    territoryPresentationStars,
                                    activeTransition,
                                ),
                        );
                        const geometry = readFamilyGeometry();
                        const diagnosticPrevFrame =
                            transitionDiagnosticCaptureEnabled
                                ? transitionDiagnostics.getPrevFrame({
                                      activeMode,
                                      activeTransition,
                                      stars,
                                      lanes,
                                  })
                                : null;
                        const mgInput = measurePerf(
                            "game.renderFrame.renderFamilyInput.ember_lattice",
                            () =>
                                buildRenderFamilyInput({
                                    stars: territoryPresentationStars,
                                    lanes,
                                    worldMinX: territoryPresentationFrame.minX,
                                    worldMinY: territoryPresentationFrame.minY,
                                    worldWidth: territoryPresentationWorldWidth,
                                    worldHeight: territoryPresentationWorldHeight,
                                    nowMs: fxOrchestrator.gameTime,
                                    paused: isPausedNow,
                                    gameTick: activeGameStore.currentTick,
                                    ownership,
                                    geometry:
                                        localizePresentationGeometry(geometry),
                                    prevGeometry: localizePresentationGeometry(
                                        diagnosticPrevFrame?.geometry ?? null,
                                    ),
                                    renderer: app?.renderer ?? undefined,
                                    activeTransition,
                                    transitionSessions:
                                        renderFamilyTransitionState.activeSessions,
                                    tunableKeys: mg.tunableKeys,
                                    configSource: renderFamilyConfigSource,
                                }),
                        );
                        mg.update(mgInput);
                        updateLiveCellGridTransitionDiagnostics({
                            activeTransition,
                            effectiveTickMs: activeGameStore.effectiveTickMs,
                        });
                        if (mg.displayRoot.parent !== activeVoronoiContainer) {
                            activeVoronoiContainer.addChild(mg.displayRoot);
                        }
                        mg.displayRoot.visible = true;                        syncLiveRenderFamilyStableFrame({
                            activeTransition,
                            stars,
                            lanes,
                            geometry,
                            configSource: renderFamilyConfigSource,
                            freezeDuringActiveTransition: true,
                        });
                        if (transitionDiagnosticCaptureEnabled) {
                            transitionDiagnosticFrameInput = {
                                activeMode,
                                activeTransition,
                                stars,
                                lanes,
                                geometry,
                                ownership,
                            };
                        }
                        break;
                    }
                    case "phase_field": {
                        activeVoronoiContainer.x = 0;
                        activeVoronoiContainer.y = 0;
                        let fam = getRenderFamily("phase_field");
                        if (!fam) {
                            registerRenderFamily(
                                createCellGridPhaseFieldFamily(colorUtils),
                            );
                            fam = getRenderFamily("phase_field")!;
                        }
                        const mg = fam as CellGridPhaseFieldFamily;
                        const activeTransition = activeRenderFamilyTransition;
                        const ownership = measurePerf(
                            "game.renderFrame.ownership.phase_field",
                            () =>
                                buildRenderFamilyOwnershipSnapshot(
                                    stars,
                                    activeTransition,
                                ),
                        );
                        const geometry = readFamilyGeometry();
                        const diagnosticPrevFrame =
                            transitionDiagnostics.getPrevFrame({
                                activeMode,
                                activeTransition,
                                stars,
                                lanes,
                            });
                        const mgInput = measurePerf(
                            "game.renderFrame.renderFamilyInput.phase_field",
                            () =>
                                buildRenderFamilyInput({
                                    stars,
                                    lanes,
                                    worldWidth: GAME_WIDTH,
                                    worldHeight: GAME_HEIGHT,
                                    nowMs: fxOrchestrator.gameTime,
                                    paused: isPausedNow,
                                    gameTick: activeGameStore.currentTick,
                                    ownership,
                                    geometry,
                                    prevGeometry:
                                        diagnosticPrevFrame?.geometry ?? null,
                                    renderer: app?.renderer ?? undefined,
                                    activeTransition,
                                    transitionSessions:
                                        renderFamilyTransitionState.activeSessions,
                                    tunableKeys: mg.tunableKeys,
                                    configSource: renderFamilyConfigSource,
                                }),
                        );
                        mg.update(mgInput);
                        updateLiveCellGridTransitionDiagnostics({
                            activeTransition,
                            effectiveTickMs: activeGameStore.effectiveTickMs,
                        });
                        if (mg.displayRoot.parent !== activeVoronoiContainer) {
                            activeVoronoiContainer.addChild(mg.displayRoot);
                        }
                        mg.displayRoot.visible = true;                        syncLiveRenderFamilyStableFrame({
                            activeTransition,
                            stars,
                            lanes,
                            geometry,
                            configSource: renderFamilyConfigSource,
                        });
                        transitionDiagnosticFrameInput = {
                            activeMode,
                            activeTransition,
                            stars,
                            lanes,
                            geometry,
                            ownership,
                        };
                        break;
                    }
                    case "grid_gradient": {
                        // Grid Gradient draws in map-space (absolute world coords), so the
                        // container sits at the stage origin like Phase Field and the
                        // starmap — not at the presentation-local frame minimum. Without
                        // this, resize / centerAndFit slid the territory off the starmap.
                        activeVoronoiContainer.x = 0;
                        activeVoronoiContainer.y = 0;
                        let fam = getRenderFamily("grid_gradient");
                        if (!fam) {
                            registerRenderFamily(
                                createGridGradientFamily(colorUtils),
                            );
                            fam = getRenderFamily("grid_gradient")!;
                        }
                        const gg = fam as GridGradientFamily;
                        const activeTransition = activeRenderFamilyTransition;
                        logGridGradientTransition("case.grid_gradient.entry", {
                            activeTransition:
                                summarizeRenderFamilyTransitionForLog(
                                    activeTransition,
                                ),
                            activeSessionCount:
                                renderFamilyTransitionState.activeSessions.length,
                            transitionOwnersInPresentationStars:
                                summarizeTransitionOwnersForLog(
                                    activeTransition,
                                    territoryPresentationStars,
                                ),
                            transitionOwnersInFrameStars:
                                summarizeTransitionOwnersForLog(
                                    activeTransition,
                                    stars,
                                ),
                        });
                        const ownership = measurePerf(
                            "game.renderFrame.ownership.grid_gradient",
                            () =>
                                buildRenderFamilyOwnershipSnapshot(
                                    stars,
                                    activeTransition,
                                ),
                        );
                        logGridGradientTransition("case.grid_gradient.ownership", {
                            hasActiveTransition: Boolean(activeTransition),
                            ownershipVersion: ownership.version,
                            transitionOwners: activeTransition
                                ? activeTransition.events.map((entry) => ({
                                      starId: entry.event.starId,
                                      previousOwner:
                                          entry.event.previousOwner,
                                      newOwner: entry.event.newOwner,
                                      ownershipOwner:
                                          ownership.starOwners.get(
                                              entry.event.starId,
                                          ) ?? null,
                                  }))
                                : [],
                        });
                        const geometry = readFamilyGeometry();
                        logGridGradientTransition("case.grid_gradient.geometry", {
                            hasActiveTransition: Boolean(activeTransition),
                            geometryVersion: geometry.version,
                            displayBorderFingerprint:
                                geometry.diagnostics.stageLadder
                                    ?.displayBorderFingerprint ?? null,
                            regionCount: optionalArrayLength(
                                (geometry as unknown as Record<string, unknown>)
                                    .regions,
                            ),
                            frontierCount: optionalArrayLength(
                                (geometry as unknown as Record<string, unknown>)
                                    .frontiers,
                            ),
                        });
                        const diagnosticPrevFrame = activeTransition
                            ? transitionDiagnostics.getPrevFrame({
                                  activeMode,
                                  activeTransition,
                                  stars,
                                  lanes,
                              })
                            : null;
                        logGridGradientTransition("case.grid_gradient.prev_frame", {
                            hasActiveTransition: Boolean(activeTransition),
                            hasPrevFrame: Boolean(diagnosticPrevFrame),
                            prevFrameKey: diagnosticPrevFrame?.key ?? null,
                            prevGeometryVersion:
                                diagnosticPrevFrame?.geometry.version ?? null,
                            prevOwnershipVersion:
                                diagnosticPrevFrame?.ownership.version ?? null,
                        });
                        const ggInput = measurePerf(
                            "game.renderFrame.renderFamilyInput.grid_gradient",
                            () =>
                                buildRenderFamilyInput({
                                    stars,
                                    lanes,
                                    worldWidth: GAME_WIDTH,
                                    worldHeight: GAME_HEIGHT,
                                    nowMs: fxOrchestrator.gameTime,
                                    paused: isPausedNow,
                                    gameTick: activeGameStore.currentTick,
                                    ownership,
                                    geometry,
                                    prevGeometry:
                                        diagnosticPrevFrame?.geometry ?? null,
                                    renderer: app?.renderer ?? undefined,
                                    activeTransition,
                                    transitionSessions:
                                        activeTransition
                                            ? renderFamilyTransitionState.activeSessions
                                            : null,
                                    tunableKeys: gg.tunableKeys,
                                    configSource: renderFamilyConfigSource,
                                }),
                        );
                        logGridGradientTransition("case.grid_gradient.input", {
                            activeTransition:
                                summarizeRenderFamilyTransitionForLog(
                                    ggInput.activeTransition ?? null,
                                ),
                            transitionSessionCount:
                                ggInput.transitionSessions?.length ?? 0,
                            geometryVersion: ggInput.geometry?.version ?? null,
                            prevGeometryVersion:
                                ggInput.prevGeometry?.version ?? null,
                            world: ggInput.world,
                            starCount: ggInput.stars.length,
                            laneCount: ggInput.lanes.length,
                        });
                        gg.update(ggInput);
                        logGridGradientTransition("case.grid_gradient.after_update", {
                            hasActiveTransition: Boolean(activeTransition),
                            snapshot: gg.getDebugSnapshot(),
                        });
                        if (gg.displayRoot.parent !== activeVoronoiContainer) {
                            activeVoronoiContainer.addChild(gg.displayRoot);
                        }
                        gg.displayRoot.visible = true;                        syncLiveRenderFamilyStableFrame({
                            activeTransition,
                            stars,
                            lanes,
                            geometry,
                            configSource: renderFamilyConfigSource,
                            freezeDuringActiveTransition: true,
                        });
                        if (transitionDiagnosticCaptureEnabled) {
                            transitionDiagnosticFrameInput = {
                                activeMode,
                                activeTransition,
                                stars,
                                lanes,
                                geometry,
                                ownership,
                            };
                        }
                        break;
                    }
                    // Fallback: any unrecognised mode renders Power Vector (the
                    // default skin). Quarantined modes are already remapped to
                    // power_vector at the config boundary (normalizeTerritoryRender
                    // ModeId); this guards typos / stale ids so the map never blanks.
                    case "none":
                        // Off — no territory overlay (the pre-switch cleanup
                        // already hides the Power Vector display root).
                        break;
                    default:
                    case "power_vector": {
                        // K3a: PowerCore Vector skin — draws the kinetic runtime's
                        // live cells (frozen + morphing bubble) so conquest
                        // frontiers SWEEP. Falls back to the resolved snapshot
                        // when the runtime is inactive (source ≠ power_core).
                        let fam = getRenderFamily("power_vector");
                        if (!fam) {
                            registerRenderFamily(
                                createPowerVectorFamily(colorUtils),
                            );
                            fam = getRenderFamily("power_vector")!;
                        }
                        const pv = fam as PowerVectorFamily;
                        const activeTransition = activeRenderFamilyTransition;
                        const ownership = buildRenderFamilyOwnershipSnapshot(
                            territoryPresentationStars,
                            activeTransition,
                        );
                        // Deferred-snapshot resolve: cheap endpoint commit on the
                        // conquest frame; full rebuild lands on a light frame.
                        const geometry = resolvePowerVectorGeometry();
                        const pvInput = buildRenderFamilyInput({
                            stars: territoryPresentationStars,
                            lanes,
                            worldMinX: territoryPresentationFrame.minX,
                            worldMinY: territoryPresentationFrame.minY,
                            worldWidth: territoryPresentationWorldWidth,
                            worldHeight: territoryPresentationWorldHeight,
                            nowMs: fxOrchestrator.gameTime,
                            paused: isPausedNow,
                            gameTick: activeGameStore.currentTick,
                            ownership,
                            geometry: localizePresentationGeometry(geometry),
                            renderer: app?.renderer ?? undefined,
                            activeTransition,
                            transitionSessions:
                                renderFamilyTransitionState.activeSessions,
                            tunableKeys: pv.tunableKeys,
                        });
                        pv.update(pvInput);
                        if (pv.displayRoot.parent !== activeVoronoiContainer) {
                            activeVoronoiContainer.addChild(pv.displayRoot);
                        }
                        pv.displayRoot.visible = true;
                        break;
                    }
                }
                    // Phase 0 diagnostic: logs container pre/post position and
                    // geometry counts for the active family.
                    //
                    // One-shot on first present (log.canvas, always on): captures the
                    // critical init state — if Phase Field's container lands at (frame.minX,
                    // frame.minY) rather than (0,0) on first present, the offset bug is live.
                    //
                    // Per-frame detail (log.renderer): geometry counts and world-border
                    // endpoint sample. Gated on PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY so the
                    // user can enable it from the Perimeter Diagnostics panel without any
                    // console interaction.
                    if (activeModeNeedsGeometry) {
                        const containerPosPostSwitchX = activeVoronoiContainer.x;
                        const containerPosPostSwitchY = activeVoronoiContainer.y;
                        const oneShotKey = `__p0PresentLogged_${activeMode}`;
                        if (!(globalThis as any)[oneShotKey]) {
                            (globalThis as any)[oneShotKey] = true;
                            log.canvas(
                                "TerritoryPresent",
                                `INIT mode=${activeMode} container pre=(${containerPosPreSwitchX.toFixed(2)},${containerPosPreSwitchY.toFixed(2)}) post=(${containerPosPostSwitchX.toFixed(2)},${containerPosPostSwitchY.toFixed(2)}) frame=(${territoryPresentationFrame.minX.toFixed(2)},${territoryPresentationFrame.minY.toFixed(2)} ${territoryPresentationFrame.width.toFixed(0)}x${territoryPresentationFrame.height.toFixed(0)}) map=${GAME_WIDTH.toFixed(0)}x${GAME_HEIGHT.toFixed(0)}`,
                            );
                        }
                        if (GAME_CONFIG.PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY) {
                            const diagGeometry = getCurrentRenderFamilyGeometry(
                                stars,
                                lanes,
                                renderFamilyConfigSource,
                            );
                            const worldBorderCount =
                                diagGeometry.worldBorderPolylines?.length ?? 0;
                            const displayWorldBorderCount =
                                diagGeometry.worldBorderPolylines?.length ?? 0;
                            const displayFrontierCount =
                                diagGeometry.frontierPolylines?.length ?? 0;
                            const firstDisplayWorldBorder =
                                diagGeometry.worldBorderPolylines?.[0];
                            const firstPoint =
                                firstDisplayWorldBorder?.points?.[0];
                            const lastPoint =
                                firstDisplayWorldBorder?.points?.[
                                    firstDisplayWorldBorder.points.length - 1
                                ];
                            const fmtPt = (
                                p: readonly [number, number] | undefined,
                            ) =>
                                p
                                    ? `(${p[0].toFixed(2)},${p[1].toFixed(2)})`
                                    : "n/a";
                            log.renderer(
                                "TerritoryPresent",
                                `mode=${activeMode} container post=(${containerPosPostSwitchX.toFixed(2)},${containerPosPostSwitchY.toFixed(2)}) geomVer=${diagGeometry.version} src=${normalizePerimeterFieldGeometrySource(renderFamilyConfigSource?.PERIMETER_FIELD_GEOMETRY_SOURCE)} worldBorders=${worldBorderCount} displayWorldBorders=${displayWorldBorderCount} displayFrontiers=${displayFrontierCount} dwb0First=${fmtPt(firstPoint)} dwb0Last=${fmtPt(lastPoint)}`,
                            );
                        }
                    }
                    if (activeModeNeedsGeometry && !geometryReady) {
                        lastRenderFailure =
                            `${activeMode} requires resolved geometry, but none was supplied`;
                        log.error("GameCanvas", lastRenderFailure);
                    }
                    const msrDiagnostics = modeUsesSharedRenderFamilyGeometry(
                        activeMode,
                    )
                        ? getCurrentRenderFamilyGeometry(
                              stars,
                              activeGameStore.connections as StarConnection[],
                              getRenderFamilyModeConfigSource(activeMode),
                          ).diagnostics.minStarMargin
                        : null;
                    const msrStarBias = modeUsesSharedRenderFamilyGeometry(
                        activeMode,
                    )
                        ? (() => {
                              const value =
                                  readNormalizedTerritoryGeometryTunables(
                                      getRenderFamilyModeConfigSource(
                                          activeMode,
                                      ) ??
                                          (GAME_CONFIG as unknown as Record<
                                              string,
                                              unknown
                                          >),
                                  ).msrStarBias;
                              return Number.isFinite(value) ? value : null;
                          })()
                        : null;
                    const rendererDiagnostics = resolvePixiRendererDiagnostics(
                        app?.renderer,
                    );
                    if (geometryTrace.capturing) {
                        // family stats (read-only; the family already wrote them this frame)
                        if (activeMode === "grid_gradient") {
                            const st = get(gridGradientStats);
                            geometryTrace.step("fam", "family", {
                                backend: st.drawBackend,
                                total: st.totalCells,
                                emit: st.emittableCells,
                                painted: st.paintedCells,
                                active: st.activeTransitionCells,
                                // Full cold-load stage breakdown. The 3-6s first-load freeze
                                // shows in updateMs (TOTAL); the sub-stage ms pinpoint WHICH
                                // stage owns it (plan build is only ~49ms — not the freeze).
                                updateMs: st.lastUpdateMs,
                                classMs: st.lastClassificationBuildMs,
                                matMs: st.lastClassificationMaterializeMs,
                                distMs: st.lastDistanceBuildMs,
                                waveMs: st.lastWavePlanBuildMs,
                                sceneMs: st.lastSceneBuildMs,
                                texPackMs: st.lastTexturePackMs,
                                texUpMs: st.lastTextureUploadMs,
                                planHit: st.planCacheHit,
                                clock: st.clockSource,
                            });
                        } else if (activeMode.startsWith("metaball")) {
                            const st = get(cellGridStats);
                            geometryTrace.step("fam", "family", {
                                id: st.familyId,
                                total: st.totalCells,
                                emit: st.emittableCells,
                                painted: st.paintedCells,
                                fronts: st.frontierPolylineCount,
                                planMs: st.lastPlanBuildMs,
                                sceneMs: st.lastSceneBuildMs,
                                skipped: st.lastFrameSkipped,
                                clock: st.clockSource,
                            });
                        }
                        // transition (primitive fields only — events array is non-primitive)
                        const tr = summarizeRenderFamilyTransitionForLog(
                            activeRenderFamilyTransition,
                        );
                        geometryTrace.step("trn", "transition", {
                            present: tr.present as boolean,
                            eventCount: tr.eventCount as number,
                            progress: tr.progress as number | undefined,
                            rawProgress: tr.rawProgress as number | undefined,
                            startedAtMs: tr.startedAtMs as number | undefined,
                            durationMs: tr.durationMs as number | undefined,
                        });
                        // render outcome
                        geometryTrace.step("out", "render", {
                            needsGeom: activeModeNeedsGeometry,
                            ready: geometryReady,
                            fail: (lastRenderFailure ?? null) as string | null,
                        });
                    }
                    geometryTrace.end(fxOrchestrator.gameTime);
                    setTerritoryRenderStatus({
                        territoryMode: activeMode,
                        geometryReady,
                        rendererType: rendererDiagnostics.rendererType,
                        rendererTypeSource:
                            rendererDiagnostics.rendererTypeSource,
                        rendererConstructorName:
                            rendererDiagnostics.rendererConstructorName,
                        rendererReportedType:
                            rendererDiagnostics.rendererReportedType,
                        arrowRenderer: "overlay_canvas",
                        lastRenderFailure,
                        msrRequestedMarginPx:
                            msrDiagnostics?.summary.requestedMarginPx ?? null,
                        msrStarBias,
                        msrAnchorCount:
                            msrDiagnostics?.summary.anchorCount ?? 0,
                        msrIntervalCount:
                            msrDiagnostics?.summary.intervalCount ?? 0,
                        msrViolatedIntervalCount:
                            msrDiagnostics?.summary.violatedIntervalCount ?? 0,
                        msrAcceptedRepairCount:
                            msrDiagnostics?.summary.acceptedRepairCount ?? 0,
                        msrRejectedRepairCount:
                            msrDiagnostics?.summary.rejectedRepairCount ?? 0,
                        msrLastInvariantFailure:
                            msrDiagnostics?.summary.invariantFailures.at(-1) ??
                            null,
                    });
                    if (transitionDiagnosticFrameInput) {
                        measurePerf(
                            "game.renderFrame.territory.transitionDiagnosticSync",
                            () => {
                                transitionDiagnostics.sync(
                                    transitionDiagnosticFrameInput,
                                );
                            },
                        );
                    } else if (transitionDiagnostics.hasCapturedState()) {
                        transitionDiagnostics.reset();
                    }
                }
                    },
                });
            }
        } // end territory pause guard

        if (shouldYieldRenderFrameForInput(frameStartedAtMs, "after_territory")) {
            maybeRenderShipsBeforeInputYield({
                stars,
                starsById,
                tickProgress,
                stage: "after_territory",
            });
            finalizeRenderFrame({ stars });
            return;
        }


        // Render stars (static elements)
        const starsScheduler = shouldThrottlePresentationLayer({
            nowMs: performance.now(),
            isPaused: activeGameStore.isPaused,
            lastPresentedAtMs: lastStarsPresentedAtMs,
            lastCostMs: lastStarsPresentCostMs,
            heavyUpdateMs: STARS_PRESENT_HEAVY_UPDATE_MS,
            interactiveMinCadenceMs: STARS_PRESENT_INTERACTIVE_MIN_CADENCE_MS,
            idleMinCadenceMs: STARS_PRESENT_IDLE_MIN_CADENCE_MS,
            maxStaleMs: STARS_PRESENT_MAX_STALE_MS,
            inputHoldMaxStaleMs: STARS_PRESENT_INPUT_HOLD_MAX_STALE_MS,
            allowIdleCadence:
                !activeStarId &&
                !dragSourceId &&
                pendingConquests.size === 0 &&
                conquestFlashes.size === 0,
        });
        if (!starsScheduler.defer) {
            runStarsPresentation("game.renderFrame.stars", () => {
                renderStarsModule(
                    stars,
                    starsContainer!,
                    labelsContainer!,
                    { starGraphics, starLabels, starVisualKeys },
                    {
                        activeStarId,
                        dragSourceId,
                        pendingConquests,
                        conquestFlashes,
                        ownerTransitions: buildStarOwnerTransitionMap(
                            renderFamilyTransitionState.activeSessions,
                        ),
                        gameNowMs: fxOrchestrator.gameTime,
                        stageScale: app?.stage.scale.x ?? 1,
                    },
                    colorUtils,
                );
            });

        }

        if (shouldYieldRenderFrameForInput(frameStartedAtMs, "after_stars")) {
            maybeRenderShipsBeforeInputYield({
                stars,
                starsById,
                tickProgress,
                stage: "after_stars",
            });
            finalizeRenderFrame({ stars });
            return;
        }

        // Render connections (star network) - unified source
        const connections = activeGameStore.connections as StarConnection[];
        if (connections) {
            const connectionsScheduler = shouldThrottlePresentationLayer({
                nowMs: performance.now(),
                isPaused: activeGameStore.isPaused,
                lastPresentedAtMs: lastConnectionsPresentedAtMs,
                lastCostMs: lastConnectionsPresentCostMs,
                heavyUpdateMs: CONNECTIONS_PRESENT_HEAVY_UPDATE_MS,
                interactiveMinCadenceMs:
                    CONNECTIONS_PRESENT_INTERACTIVE_MIN_CADENCE_MS,
                idleMinCadenceMs: CONNECTIONS_PRESENT_IDLE_MIN_CADENCE_MS,
                maxStaleMs: CONNECTIONS_PRESENT_MAX_STALE_MS,
                inputHoldMaxStaleMs:
                    CONNECTIONS_PRESENT_INPUT_HOLD_MAX_STALE_MS,
            });
            if (!connectionsScheduler.defer) {
                runConnectionsPresentation(
                    "game.renderFrame.connections",
                    () => {
                        renderConnectionsModule(
                            connectionGraphics!,
                            stars,
                            connections,
                            starsById,
                            colorUtils,
                        );
                    },
                );

                }
            }
        }

        if (
            shouldYieldRenderFrameForInput(
                frameStartedAtMs,
                "after_connections",
            )
        ) {
            maybeRenderShipsBeforeInputYield({
                stars,
                starsById,
                tickProgress,
                stage: "after_connections",
            });
            finalizeRenderFrame({ stars });
            return;
        }

        // Render interaction overlay on a dedicated 2D canvas so command
        // feedback stays outside the heavier Pixi batch rebuild path.
        presentInteractionOverlayFrame(stars);

        if (
            shouldYieldRenderFrameForInput(
                frameStartedAtMs,
                "after_interaction_overlay",
            )
        ) {
            maybeRenderShipsBeforeInputYield({
                stars,
                starsById,
                tickProgress,
                stage: "after_interaction_overlay",
            });
            finalizeRenderFrame({ stars, interactionOverlayPresented: true });
            return;
        }

        // Process tick events (event-driven animations, not diff-based — see POST_MORTEMS.md)
        const tickEvents = measurePerf(
            "game.renderFrame.tickEvents.consume",
            () => activeGameStore.consumeTickEvents(),
        );

        // Clear combat tracking before processing new tick events
        // (starsInCombat is rebuilt each tick from CombatEvents)
        if (tickEvents) {
            // Existing event processing (transfers, conquests, combat log, etc.)
            measurePerf(
                "game.renderFrame.tickEvents.process",
                () => {
                    starsInCombat.clear();
                    processTickEvents(
                        stars,
                        tickEvents,
                        (activeGameStore.connections as StarConnection[]) || [],
                        starsById,
                    );
                },
                {
                    conquestCount: tickEvents.conquests.length,
                    combatCount: tickEvents.combats.length,
                },
            );

            // Record game-time at tick boundary for tickProgress computation
            lastTickGameTimeMs = fxOrchestrator.gameTime;

            // V2 SURGE: Create surge animations from CombatEvents
            // Each combat tick starts one pulse per attacker star
            measurePerf("game.renderFrame.tickEvents.surges", () => {
                for (const combat of tickEvents.combats) {
                    if (!combat.conquered) {
                        for (const attackerId of combat.attackerIds) {
                            const aStar = starsById.get(attackerId);
                            const dStar = starsById.get(combat.defenderId);
                            if (aStar && dStar) {
                                const rawLane = getDirectedLanePolyline(
                                    attackerId,
                                    combat.defenderId,
                                );
                                const trimmedLane =
                                    rawLane && rawLane.length >= 2
                                        ? trimLanePolylineToStarRims(
                                              rawLane,
                                              aStar,
                                              dStar,
                                              5,
                                          )
                                        : undefined;
                                const heading = computeLaneHeadingForNearside(
                                    aStar,
                                    dStar,
                                    trimmedLane && trimmedLane.length >= 2
                                        ? trimmedLane
                                        : undefined,
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
            });
        }

        if (
            shouldYieldRenderFrameForInput(frameStartedAtMs, "after_tick_events")
        ) {
            maybeRenderShipsBeforeInputYield({
                stars,
                starsById,
                tickProgress,
                stage: "after_tick_events",
            });
            finalizeRenderFrame({ stars, interactionOverlayPresented: true });
            return;
        }

        // Render all ships: orbiting (per-star) + traveling (in-flight lifecycle)
        // IMPORTANT: Always read from VSM to stay in sync — ShipRenderer replaces the array
        // with a filtered `stillTraveling` copy, which would disconnect from VSM's internal array.
        presentShipsFrame({
            stars,
            starsById,
            tickProgress,
            nowMs: performance.now(),
            context: "main",
        });

        // Count total visual ships for HUD
        let shipCount = 0;
        visualShips.forEach((ships) => (shipCount += ships.length));
        shipCount += travelingShips.length;
        visualDamagedShips.forEach((ships) => (shipCount += ships.length));
        totalVisualShips = shipCount;

        finalizeRenderFrame({ stars, interactionOverlayPresented: true });
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

    function worldToScreen(
        worldX: number,
        worldY: number,
    ): { x: number; y: number } {
        if (!app) return { x: worldX, y: worldY };
        const scale = app.stage.scale.x;
        return {
            x: worldX * scale + app.stage.x,
            y: worldY * scale + app.stage.y,
        };
    }

    function findBenchmarkSampleOrder():
        | { source: StarState; target: StarState }
        | null {
        const localPlayerId = activeGameStore.localPlayerId;
        if (!localPlayerId) return null;
        const { stars, connections } = interactionCaches.ensure();
        for (const source of stars) {
            if (source.ownerId !== localPlayerId) continue;
            for (const connection of connections) {
                const targetId =
                    connection.sourceId === source.id
                        ? connection.targetId
                        : connection.targetId === source.id
                          ? connection.sourceId
                          : null;
                if (!targetId) continue;
                const target = interactionCaches.getStarById(targetId);
                if (!target || target.ownerId === localPlayerId) continue;
                if (!activeGameStore.canIssueOrder(source.id, target.id)) continue;
                return { source, target };
            }
        }
        return null;
    }

    export function getBenchmarkStarClientPoint(
        starId: string,
    ):
        | {
              starId: string;
              clientX: number;
              clientY: number;
          }
        | null {
        if (!app || !canvasContainer) return null;
        interactionCaches.ensure();
        const star = interactionCaches.getStarById(starId);
        if (!star) return null;
        const rect = canvasClientRect.get("benchmark.starClientPoint");
        const point = worldToScreen(
            mapTranspose.x(star),
            mapTranspose.y(star),
        );
        return {
            starId: star.id,
            clientX: rect.left + point.x,
            clientY: rect.top + point.y,
        };
    }

    export function getBenchmarkOrderPointerPath():
        | {
              sourceId: string;
              targetId: string;
              sourceClientX: number;
              sourceClientY: number;
              targetClientX: number;
              targetClientY: number;
          }
        | null {
        if (!app || !canvasContainer) return null;
        const sampleOrder = findBenchmarkSampleOrder();
        if (!sampleOrder) return null;
        const sourcePoint = getBenchmarkStarClientPoint(sampleOrder.source.id);
        const targetPoint = getBenchmarkStarClientPoint(sampleOrder.target.id);
        if (!sourcePoint || !targetPoint) return null;
        return {
            sourceId: sampleOrder.source.id,
            targetId: sampleOrder.target.id,
            sourceClientX: sourcePoint.clientX,
            sourceClientY: sourcePoint.clientY,
            targetClientX: targetPoint.clientX,
            targetClientY: targetPoint.clientY,
        };
    }

    export function getBenchmarkTerritorySchedulerSnapshot():
        | Record<string, unknown>
        | null {
        const ownerStarCounts: Record<string, number> = {};
        for (const star of activeGameStore.stars as StarState[]) {
            const ownerId = star.ownerId ?? "__unowned__";
            ownerStarCounts[ownerId] = (ownerStarCounts[ownerId] ?? 0) + 1;
        }
        const benchmarkCellGridMode =
            GAME_CONFIG.TERRITORY_RENDER_MODE === "phase_edges" ||
            GAME_CONFIG.TERRITORY_RENDER_MODE === "ember_lattice" ||
            GAME_CONFIG.TERRITORY_RENDER_MODE === "phase_field"
                ? GAME_CONFIG.TERRITORY_RENDER_MODE
                : "phase_edges";
        const cellGridFamily = getRenderFamily(benchmarkCellGridMode);
        const cellGridDebug =
            cellGridFamily instanceof CellGridPhaseEdgesFamily ||
            cellGridFamily instanceof CellGridPhaseFieldFamily
                ? cellGridFamily.getDebugSnapshot()
                : null;
        const gridGradientFamily = getRenderFamily("grid_gradient");
        const gridGradientDebug =
            gridGradientFamily instanceof GridGradientFamily
                ? gridGradientFamily.getDebugSnapshot()
                : null;
        const rendererDiagnostics = resolvePixiRendererDiagnostics(app?.renderer);
        const travelingShipsSnapshot = [...fxOrchestrator.vsm.travelingShips]
            .slice()
            .sort((a, b) => a.id - b.id)
            .slice(0, 12)
            .map((ship) => ({
                id: ship.id,
                state: ship.state,
                fromStarId: ship.fromStarId ?? null,
                toStarId: ship.toStarId ?? null,
                x: Number(ship.x.toFixed(2)),
                y: Number(ship.y.toFixed(2)),
                alpha: Number(ship.alpha.toFixed(3)),
                scale: Number(ship.scale.toFixed(3)),
                departTime: Number(ship.departTime.toFixed(2)),
                travelDuration: Number(ship.travelDuration.toFixed(2)),
                departDuration: Number(ship.departDuration.toFixed(2)),
            }));
        const travelingShipsSampleHash = travelingShipsSnapshot
            .map(
                (ship) =>
                    `${ship.id}:${ship.state}:${ship.x.toFixed(1)},${ship.y.toFixed(1)}:${ship.alpha.toFixed(2)}:${ship.scale.toFixed(2)}`,
            )
            .join("|");
        return {
            currentTick: activeGameStore.currentTick ?? null,
            localPlayerId: activeGameStore.localPlayerId ?? null,
            renderMode: GAME_CONFIG.TERRITORY_RENDER_MODE,
            ownerStarCounts,
            cellGridDebug,
            gridGradientDebug,
            rendererDiagnostics,
            fxGameNowMs: Number(fxOrchestrator.gameTime.toFixed(2)),
            effectiveTickMs: activeGameStore.effectiveTickMs,
            tickProgress: Number(lastRenderedTickProgress.toFixed(4)),
            totalVisualShips,
            visualShipStars: visualShips.size,
            travelingShipCount: fxOrchestrator.vsm.travelingShips.length,
            travelingShipsSampleHash,
            travelingShipsSnapshot,
            browserInputPending: hasBrowserInputPending(),
            territoryInputPriorityUntilMs,
            lastTerritoryUpdateStartedAtMs,
            lastTerritoryUpdateCostMs,
            lastTerritoryPresentedAtMs,
            territoryDeferralActive,
            deferredTerritoryFrameCount,
            deferredTerritoryReason,
            territoryCadenceSkipCount,
            territoryLastMode,
            lastShipRenderStartedAtMs,
            lastShipRenderCostMs,
            lastShipRenderPresentedAtMs,
            shipRenderDeferralActive,
            deferredShipRenderFrameCount,
            deferredShipRenderReason,
            shipRenderCadenceSkipCount,
            shipRenderYieldRescueCount,
            lastShipRenderContext,
            lastShipRenderReason,
            renderFrameInputYieldCount,
            lastRenderFrameInputYieldStage,
            lastRenderFrameInputYieldReason,
            lastRenderFrameInputYieldAtMs,
            ...orderMutationQueue.getTelemetry(),
            territoryPresentationSpace:
                getTerritoryPresentationSpaceDiagnostics(),
            ...territoryPresentationQueue.getTelemetry(),
            ...getKineticDiagnostics(),
            transitionDiagnosticCaptureState: transitionDiagnostics.getCaptureState(),
        };
    }

    export function getTransitionDiagnosticCaptureState():
        | Record<string, unknown>
        | null {
        return transitionDiagnostics.getCaptureState();
    }

    export function resetTransitionDiagnosticCapture(): void {
        transitionDiagnostics.reset();
    }

    // Track last hitTest result to suppress duplicate logs
    let lastHitStarId: string | null | undefined = undefined; // undefined = never set

    function hitTestStar(screenX: number, screenY: number): StarState | null {
        const { stars } = interactionCaches.ensure();

        if (stars.length === 0) {
            if (lastHitStarId !== null) {
                log.input("hitTestStar MISS — stars array empty");
                lastHitStarId = null;
            }
            return null;
        }

        // Convert screen coordinates to world coordinates
        const { x, y } = screenToWorld(screenX, screenY);
        const candidates = interactionCaches.getHitCandidates(x, y);

        // Find the NEAREST star within a reasonable hit radius
        let nearest: StarState | null = null;
        let nearestDist = Infinity;

        for (const star of candidates) {
            const dist = distance(
                x,
                y,
                mapTranspose.x(star),
                mapTranspose.y(star),
            );
            const hitRadius = interactionCaches.resolveHitRadius(star);
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
                    `hitTest MISS — screen(${screenX.toFixed(0)},${screenY.toFixed(0)}) → world(${x.toFixed(0)},${y.toFixed(0)}), ${candidates.length}/${stars.length} candidates checked`,
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
            const p = toDisplayPoint({ x, y });
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
        const { connections } = interactionCaches.ensure();
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

        for (const connection of connections) {
            const a =
                connection.sourceId <= connection.targetId
                    ? connection.sourceId
                    : connection.targetId;
            const b =
                connection.sourceId <= connection.targetId
                    ? connection.targetId
                    : connection.sourceId;
            const laneKey = interactionCaches.getLaneKeyForPair(a, b);
            if (seen.has(laneKey)) continue;
            seen.add(laneKey);

            const source = interactionCaches.getStarById(a);
            const target = interactionCaches.getStarById(b);
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
                interactionCaches.findConnectionByLaneKey(relatedLaneKey)?.lanePathKind,
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
                    interactionCaches.findConnectionByLaneKey(relatedLaneKey)?.lanePathKind,
                );
            }
        }

        const measurement = buildRulerMeasurement(start, end, {
            laneMarginPx: resolveEffectiveLaneMarginPx(GAME_CONFIG),
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
        noteInteractivePressure("pointerdown");
        log.input(
            `▼ pointerDown btn=${event.button} @(${event.clientX},${event.clientY}) ptrType=${event.pointerType}`,
        );

        if (get(rulerTool).enabled && event.button === 0 && !isSpaceHeld) {
            const { x, y } = canvasClientRect.toLocalPoint(
                event.clientX,
                event.clientY,
                "pointerdown.ruler",
            );
            const point = resolveRulerPoint(
                x,
                y,
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
            pinchStartZoom = camera.getZoomLevel();
            const center = getPinchCenter();
            const localCenter = canvasClientRect.toLocalPoint(
                center.x,
                center.y,
                "pointerdown.pinch",
            );
            pinchCenterX = localCenter.x;
            pinchCenterY = localCenter.y;
            panStartScreenX = center.x;
            panStartScreenY = center.y;
            const pinchStartPan = camera.getPan();
            panStartOffsetX = pinchStartPan.x;
            panStartOffsetY = pinchStartPan.y;
            return;
        }

        const { x, y } = canvasClientRect.toLocalPoint(
            event.clientX,
            event.clientY,
            "pointerdown",
        );

        // Single-touch: check if we're touching empty space (no star nearby)
        // If so, enter pan mode for single-finger panning
        if (event.pointerType === "touch") {
            const earlyHit = hitTestStar(x, y);
            if (!earlyHit) {
                // No star nearby — single-finger pan
                isPanning = true;
                camera.cancelAnimation();
                panStartScreenX = event.clientX;
                panStartScreenY = event.clientY;
                const touchPanStart = camera.getPan();
                panStartOffsetX = touchPanStart.x;
                panStartOffsetY = touchPanStart.y;
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
                const localPoint = canvasClientRect.toLocalPoint(
                    startX,
                    startY,
                    "pointerdown.longPress",
                );
                const star = hitTestStar(localPoint.x, localPoint.y);
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
            const dragPanStart = camera.getPan();
            panStartOffsetX = dragPanStart.x;
            panStartOffsetY = dragPanStart.y;
            canvasContainer.style.cursor = "grabbing";
            return;
        }

        const star = hitTestStar(x, y);

        // FIX: Right Click to Cancel
        if (event.button === 2) {
            event.preventDefault();
            if (star && isLocalPlayerStar(star)) {
                // Queue the gameplay mutation so the optimistic cancel acknowledgment is not
                // blocked behind synchronous store/reactivity work on the input task.
                const requestId = doCancelOrder(
                    star.id,
                    "queued",
                    "pointerdown.rightclick",
                );
                // OPTIMISTIC UI: Remove from pending immediately
                removeQueuedOrderEntriesFromSource(star.id, pendingOrders);
                orderMutationQueue.recordLocalAcknowledgment({
                    kind: "cancel",
                    path: "pointerdown.rightclick",
                    sourceId: star.id,
                    activeStarId: null,
                    requestId,
                    dispatchMode: "queued",
                });
                log.success("GameCanvas", `Cancelled order on ${star.id}`);
            }
            // Also clear selection
            activeStarId = null;
            orderMutationQueue.recordLocalAcknowledgment({
                kind: "clear",
                path: "pointerdown.rightclick",
                sourceId: star?.id ?? null,
                activeStarId: null,
                dispatchMode: "immediate",
            });
            return;
        }

        // Always select star for info panel (any button, any owner)
        if (star) {
            selectedStarStore.select(star.id);
            audioManager.play("click");
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
            dragHoverTargetId = null;
            log.input(`pointerDown → DRAG START from owned star ${star.id}`);
            interactionOverlay.renderNow();
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
            dragHoverTargetId = null;
            log.input(
                `pointerDown → DRAG START from non-owned star ${star.id} (deferred mode)`,
            );
            interactionOverlay.renderNow();
        } else {
            // Desktop: empty space click (non-touch) — just reset drag
            isDragging = false;
            dragSourceId = null;
            dragStartX = x;
            dragStartY = y;
            dragHoverTargetId = null;
            log.input(`pointerDown → empty space, drag state reset`);
            interactionOverlay.renderNow();
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
        noteInteractivePressure();

        // Pinch zoom + 2-finger pan
        if (isPinching && activePointers.size >= 2) {
            clearLongPress();
            const dist = getPinchDist();
            if (pinchStartDist > 0) {
                const scale = dist / pinchStartDist;
                camera.setZoomClamped(pinchStartZoom * scale);

                // Also pan: track center movement
                const center = getPinchCenter();
                camera.panFromDrag(
                    panStartOffsetX,
                    panStartOffsetY,
                    center.x - panStartScreenX,
                    center.y - panStartScreenY,
                );

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
            camera.panFromDrag(
                panStartOffsetX,
                panStartOffsetY,
                event.clientX - panStartScreenX,
                event.clientY - panStartScreenY,
            );
            applyZoomTransform();
            return;
        }

        if (!isDragging || !dragSourceId) return;

        const dragPoint = canvasClientRect.toLocalPoint(
            event.clientX,
            event.clientY,
            "pointermove.drag",
        );
        dragCurrentX = dragPoint.x;
        dragCurrentY = dragPoint.y;

        // DRAG-THROUGH LOGIC:
        // If we hover a DIFFERENT star while dragging, issue order and continue drag from THERE
        const targetStar = hitTestStar(dragCurrentX, dragCurrentY);
        dragHoverTargetId = null;

        if (targetStar && targetStar.id !== dragSourceId) {
            const isConnected = interactionCaches.areStarsConnected(dragSourceId, targetStar.id);

            if (isConnected) {
                dragHoverTargetId = targetStar.id;
                const sourceStar = interactionCaches.getStarById(dragSourceId);
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
                        "queued",
                        "pointermove.dragThrough",
                    );
                    if (success) {
                        addPendingOrder(dragSourceId, targetStar.id);
                        orderMutationQueue.recordLocalAcknowledgment({
                            kind: "issue",
                            path: "pointermove.dragThrough",
                            sourceId: dragSourceId,
                            targetId: targetStar.id,
                            activeStarId: targetStar.id,
                            requestId: success,
                            dispatchMode: "queued",
                        });
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
                        "queued",
                        "pointermove.dragThrough",
                    );
                    if (success) {
                        // Add visual indicator for deferred order (dashed line)
                        addPendingOrder(dragSourceId, targetStar.id, true); // true = deferred
                        orderMutationQueue.recordLocalAcknowledgment({
                            kind: "defer",
                            path: "pointermove.dragThrough",
                            sourceId: dragSourceId,
                            targetId: targetStar.id,
                            activeStarId: targetStar.id,
                            requestId: success,
                            dispatchMode: "queued",
                        });
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
        noteInteractivePressure("pointerup");
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
            const { x, y } = canvasClientRect.toLocalPoint(
                event.clientX,
                event.clientY,
                "pointerup.touch",
            );
            const star = hitTestStar(x, y);
            const now = performance.now();

            if (
                star &&
                lastTapStarId === star.id &&
                now - lastTapTime < DOUBLE_TAP_MS
            ) {
                // Double-tap on same star → cancel orders
                if (isLocalPlayerStar(star)) {
                    const requestId = doCancelOrder(
                        star.id,
                        "queued",
                        "pointerup.doubletap",
                    );
                    removeQueuedOrderEntriesFromSource(star.id, pendingOrders);
                    orderMutationQueue.recordLocalAcknowledgment({
                        kind: "cancel",
                        path: "pointerup.doubletap",
                        sourceId: star.id,
                        activeStarId: null,
                        requestId,
                        dispatchMode: "queued",
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

        const { x, y } = canvasClientRect.toLocalPoint(
            event.clientX,
            event.clientY,
            "pointerup",
        );

        const targetStar = measurePerf(
            "game.input.pointerup.hitTest",
            () => hitTestStar(x, y),
            { x, y },
        );
        const movedSignificantly =
            isDragging &&
            (Math.abs(x - dragStartX) > 10 || Math.abs(y - dragStartY) > 10);

        // DRAG MODE: If we dragged significantly
        if (movedSignificantly && dragSourceId) {
            if (targetStar && targetStar.id !== dragSourceId) {
                const isConnected = interactionCaches.areStarsConnected(dragSourceId, targetStar.id);

                if (isConnected) {
                    // Issue order from drag
                    // Ctrl-click = order clears on conquest
                    const success = doIssueOrder(
                        dragSourceId,
                        targetStar.id,
                        !event.ctrlKey, // persist unless ctrl-click
                        "queued",
                        "pointerup.drag",
                    );
                    if (success) {
                        // OPTIMISTIC UI: Add immediately for instant arrow display
                        addPendingOrder(dragSourceId, targetStar.id);
                        orderMutationQueue.recordLocalAcknowledgment({
                            kind: "issue",
                            path: "pointerup.drag",
                            sourceId: dragSourceId,
                            targetId: targetStar.id,
                            activeStarId,
                            requestId: success,
                            dispatchMode: "queued",
                        });
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
                orderMutationQueue.recordLocalAcknowledgment({
                    kind: "select",
                    path: "pointerup.click.toggle",
                    targetId: targetStar.id,
                    activeStarId: null,
                    dispatchMode: "immediate",
                });
                log.input(`  Case 1: TOGGLE deselect ${targetStar.id}`);
            }
            // Case 2: Have a prior selection -> try to issue order, then select Y
            else if (activeStarId) {
                const previousActiveStarId = activeStarId;
                const isConnected = interactionCaches.areStarsConnected(
                    activeStarId,
                    targetStar.id,
                );

                if (isConnected) {
                    const activeStarSnapshot =
                        interactionCaches.getStarById(activeStarId);
                    // B-43 diagnostic: trace deferred order decision
                    const localPid = activeGameStore.localPlayerId;
                    log.input(
                        `[B43] click active=${activeStarId} target=${targetStar.id} connected=${isConnected} activeOwner=${activeStarSnapshot?.ownerId ?? "null"} localPid=${localPid} isLocal=${activeStarSnapshot ? isLocalPlayerStar(activeStarSnapshot) : "N/A"}`,
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
                            "queued",
                            "pointerup.click",
                        );
                        if (success) {
                            addPendingOrder(activeStarId, targetStar.id);
                            orderMutationQueue.recordLocalAcknowledgment({
                                kind: "issue",
                                path: "pointerup.click",
                                sourceId: activeStarId,
                                targetId: targetStar.id,
                                activeStarId,
                                requestId: success,
                                dispatchMode: "queued",
                            });
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
                            "queued",
                            "pointerup.click",
                        );
                        if (success) {
                            addPendingOrder(activeStarId, targetStar.id, true);
                            orderMutationQueue.recordLocalAcknowledgment({
                                kind: "defer",
                                path: "pointerup.click",
                                sourceId: activeStarId,
                                targetId: targetStar.id,
                                activeStarId,
                                requestId: success,
                                dispatchMode: "queued",
                            });
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
                orderMutationQueue.recordLocalAcknowledgment({
                    kind: "select",
                    path: "pointerup.click.handoff",
                    targetId: targetStar.id,
                    activeStarId: targetStar.id,
                    dispatchMode: "immediate",
                    extra: {
                        previousActiveStarId,
                    },
                });
            }
            // Case 3: No prior selection -> just select
            else {
                activeStarId = targetStar.id;
                orderMutationQueue.recordLocalAcknowledgment({
                    kind: "select",
                    path: "pointerup.click.new",
                    targetId: targetStar.id,
                    activeStarId: targetStar.id,
                    dispatchMode: "immediate",
                });
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
        noteInteractivePressure("rightclick");
        event.preventDefault();

        const { x, y } = canvasClientRect.toLocalPoint(
            event.clientX,
            event.clientY,
            "rightclick",
        );

        const star = measurePerf(
            "game.input.rightclick.hitTest",
            () => hitTestStar(x, y),
            { x, y },
        );

        if (star && isLocalPlayerStar(star) && star.targetId) {
            // Cancel order for this star
            const requestId = doCancelOrder(
                star.id,
                "queued",
                "contextmenu.rightclick",
            );
            removeQueuedOrderEntriesFromSource(star.id, pendingOrders);
            orderMutationQueue.recordLocalAcknowledgment({
                kind: "cancel",
                path: "contextmenu.rightclick",
                sourceId: star.id,
                targetId: star.targetId,
                activeStarId: null,
                requestId,
                dispatchMode: "queued",
            });
            log.state("GameCanvas", `Order cancelled for star ${star.id}`);
        } else if (
            star &&
            !isLocalPlayerStar(star) &&
            star.ownerId !== "neutral"
        ) {
            // Right-click on enemy star - cancel any deferred order
            if (orderMutationQueue.hasQueuedOrderEntryForSource(star.id)) {
                removeQueuedOrderEntriesFromSource(star.id, deferredOrders);
                orderMutationQueue.recordLocalAcknowledgment({
                    kind: "cancel",
                    path: "contextmenu.defer_cancel",
                    sourceId: star.id,
                    activeStarId: null,
                    dispatchMode: "immediate",
                });
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
        orderMutationQueue.recordLocalAcknowledgment({
            kind: "clear",
            path: "selection.clear",
            activeStarId: null,
            dispatchMode: "immediate",
        });
        log.state("GameCanvas", "Selection cleared");
    }

    function cancelDrag() {
        const hadTransientOverlayState =
            isDragging || Boolean(dragSourceId) || Boolean(dragHoverTargetId);
        isDragging = false;
        dragSourceId = null;
        dragHoverTargetId = null;

        // Reset order chain depth for audio
        orderChainDepth = 0;

        // Clear preview
        if (dragPreviewGraphics) {
            dragPreviewGraphics.clear();
        }
        if (hadTransientOverlayState) {
            interactionOverlay.renderNow();
        }
    }

    function renderDragPreview() {
        interactionOverlay.schedule("pointermove.dragPreview");
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
>
    <canvas
        class="interaction-overlay"
        aria-hidden="true"
        bind:this={interactionOverlayCanvas}
    ></canvas>
</div>

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

    .interaction-overlay {
        position: absolute;
        inset: 0;
        z-index: 6;
    }

    .fps-overlay {
        display: none;
    }
</style>
