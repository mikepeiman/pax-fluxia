<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import * as PIXI from "pixi.js";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { animationStore } from "$lib/stores/animationStore.svelte";
    import { audioManager } from "$lib/services/audioManager.svelte";
    import { mapTranspose } from "$lib/stores/mapTranspose.svelte";
    import { log } from "$lib/utils/logger";
    import { GAME_CONFIG } from "$lib/config/game.config";
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
        renderMetaballScene as renderMetaballModule,
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
    import { buildRenderFamilyInput } from "$lib/territory/families/buildRenderFamilyInput";
    import { getTerritoryVisualEpoch } from "$lib/territory/bumpTerritoryVisualConfig";
    import { resolveTerritoryArchitectureRoute } from "$lib/territory/integration/TerritoryArchitectureRouter";
    import type { TerritoryFrameInput } from "$lib/territory/contracts/TerritoryFrameInput";
    import { TerritoryEngineController } from "$lib/territory/engine/TerritoryEngineController";
    import { TerritoryRenderer } from "$lib/territory/render/TerritoryRenderer";
    import { transitionSnapshotRecorder } from "$lib/territory/devtools/TransitionSnapshotRecorder";
    import { diagnosticsUi } from "$lib/territory/devtools/diagnosticsUi";
    import {
        buildRulerMeasurement,
        getRulerCssColor,
        getRulerMeasurement,
        rulerTool,
        type RulerLaneState,
        type RulerMeasurement,
        type RulerPoint,
    } from "$lib/territory/devtools/rulerTool";
    import type { MapDiagnostics, MapRulerFixture } from "$lib/types/map.types";
    import { getDirectedLanePolyline } from "$lib/lanes/lanePolylineCache";
    import { trimLanePolylineToStarRims } from "$lib/lanes/laneGeometry";
    import { computeLaneHeadingForNearside } from "$lib/lanes/applyLaneTravelPath";
    import { get } from "svelte/store";

    // ============================================================================
    // PixiJS Application
    // ============================================================================

    let canvasContainer: HTMLDivElement;
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
    let starLabels: Map<string, PIXI.Container> = new Map();
    let linkGraphics: PIXI.Graphics | null = null;
    let territoryGraphics: PIXI.Graphics | null = null;
    let voronoiContainer: PIXI.Container | null = null;
    let debugGraphics: PIXI.Graphics | null = null; // New debug layer
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
    let scaleRulerWorldPx = $state(100);
    let scaleRulerScreenPx = $state(100);

    // Ship Spawn Animation Tracking
    // Key: `${starId}-${shipIndex}`, Value: spawnTimestamp
    let shipSpawnTimers: Map<string, number> = new Map();
    let starShipCounts: Map<string, number> = new Map(); // Track previous counts

    // ── FX Orchestrator (V2 — manages all visual ship state via VSM) ────
    const fxOrchestrator = new FXOrchestrator();

    // ── Canonical territory instances (class-encapsulated, no module-level state) ─
    let canonicalBridge: GameCanvasBridge | null = null;
    let canonicalBridgeFallbackLogged = false;
    let canonicalController: TerritoryEngineController | null = null;
    let canonicalControllerTransitionDurationMs: number | null = null;
    let canonicalRenderer: TerritoryRenderer | null = null;

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

    // React to animation speed changes from the UI slider
    $effect(() => {
        fxOrchestrator.setAnimationSpeed(animationStore.speedMs);
    });

    let lastDiagnosticsOpen = false;
    let lastDiagnosticsHeight = 0;
    $effect(() => {
        const diagnostics = $diagnosticsUi;
        if (!app) {
            lastDiagnosticsOpen = diagnostics.open;
            lastDiagnosticsHeight = diagnostics.height;
            return;
        }

        const heightChanged = diagnostics.height !== lastDiagnosticsHeight;
        const openChanged = diagnostics.open !== lastDiagnosticsOpen;
        if (heightChanged || openChanged) {
            handleResize();
            if (diagnostics.open && !lastDiagnosticsOpen) {
                centerAndFit();
            }
            lastDiagnosticsOpen = diagnostics.open;
            lastDiagnosticsHeight = diagnostics.height;
        }
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

    function getBottomUiInsetPx(): number {
        const diagnostics = get(diagnosticsUi);
        return diagnostics.open ? diagnostics.height : 0;
    }

    function getViewportMetrics() {
        if (!app) {
            return {
                width: 0,
                height: 0,
                usableHeight: 0,
                centerX: 0,
                centerY: 0,
                bottomInset: 0,
            };
        }
        const width = app.screen.width;
        const height = app.screen.height;
        const bottomInset = getBottomUiInsetPx();
        const usableHeight = Math.max(120, height - bottomInset);
        return {
            width,
            height,
            usableHeight,
            centerX: width * 0.5,
            centerY: usableHeight * 0.5,
            bottomInset,
        };
    }

    export function centerAndFit() {
        updateWorldBounds();
        if (app && app.stage) {
            const viewport = getViewportMetrics();
            baseScale = Math.min(
                viewport.width / contentWidth,
                viewport.usableHeight / contentHeight,
            );
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
        const viewport = getViewportMetrics();
        const es = baseScale * clampedZoom;
        const contentCenterX = contentMinX + contentWidth / 2;
        const contentCenterY = contentMinY + contentHeight / 2;
        const baselineX = viewport.centerX - contentCenterX * es;
        const baselineY = viewport.centerY - contentCenterY * es;
        const desiredStageX = viewport.centerX - sx * es;
        const desiredStageY = viewport.centerY - sy * es;

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

    function updateScaleRuler(effectiveScale: number) {
        const candidates = [
            10, 20, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 800,
            1000, 1200,
        ];
        const minScreenPx = 72;
        const maxScreenPx = 180;
        const targetScreenPx = 120;

        let bestWorld = candidates[0];
        let bestScreen = Math.max(1, bestWorld * effectiveScale);
        let bestScore = Number.POSITIVE_INFINITY;

        for (const worldPx of candidates) {
            const screenPx = Math.max(1, worldPx * effectiveScale);
            const distancePenalty = Math.abs(screenPx - targetScreenPx);
            const rangePenalty =
                screenPx < minScreenPx
                    ? minScreenPx - screenPx
                    : screenPx > maxScreenPx
                      ? screenPx - maxScreenPx
                      : 0;
            const score = rangePenalty * 2 + distancePenalty;
            if (score < bestScore) {
                bestScore = score;
                bestWorld = worldPx;
                bestScreen = screenPx;
            }
        }

        scaleRulerWorldPx = Math.round(bestWorld);
        scaleRulerScreenPx = Math.round(bestScreen);
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
        const viewport = getViewportMetrics();
        const containerWidth = viewport.width;
        const containerHeight = viewport.height;

        baseScale = Math.min(
            containerWidth / contentWidth,
            viewport.usableHeight / contentHeight,
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
            `container=${containerWidth.toFixed(0)}x${containerHeight.toFixed(0)} usableH=${viewport.usableHeight.toFixed(0)} inset=${viewport.bottomInset.toFixed(0)} content=(${contentMinX.toFixed(0)},${contentMinY.toFixed(0)} ${contentWidth.toFixed(0)}x${contentHeight.toFixed(0)}) baseScale=${baseScale.toFixed(4)} dpr=${window.devicePixelRatio} cssGrid(el)=${canvasEl?.clientWidth ?? "?"}x${canvasEl?.clientHeight ?? "?"} viewport=${window.innerWidth}x${window.innerHeight}`,
        );
    }

    function applyZoomTransform() {
        if (!app) return;

        const viewport = getViewportMetrics();
        const cw = viewport.width;
        const ch = viewport.height;
        const es = baseScale * zoomLevel;

        app.stage.scale.set(es, es);

        // Center on content bounding box, then apply pan offset
        const contentCenterX = contentMinX + contentWidth / 2;
        const contentCenterY = contentMinY + contentHeight / 2;
        const baselineX = viewport.centerX - contentCenterX * es;
        const baselineY = viewport.centerY - contentCenterY * es;

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
        updateScaleRuler(es);
    }

    function clampPan() {
        if (!app) return;

        const viewport = getViewportMetrics();
        const cw = viewport.width;
        const es = baseScale * zoomLevel;
        const scaledContentW = contentWidth * es;
        const scaledContentH = contentHeight * es;

        // Keep a small vertical slack even when the board almost fits so the
        // map is easier to inspect under overlays and at low zoom.
        const overflowX = Math.max(0, (scaledContentW - cw) / 2);
        const overflowY = Math.max(
            Math.max(24, viewport.bottomInset * 0.5),
            (scaledContentH - viewport.usableHeight) / 2,
        );
        const maxPanX = overflowX / es;
        const maxPanY = overflowY / es;

        panOffsetX = Math.max(-maxPanX, Math.min(maxPanX, panOffsetX));
        panOffsetY = Math.max(-maxPanY, Math.min(maxPanY, panOffsetY));

        // Reapply position after clamp
        const contentCenterX = contentMinX + contentWidth / 2;
        const contentCenterY = contentMinY + contentHeight / 2;
        const baselineX = viewport.centerX - contentCenterX * es;
        const baselineY = viewport.centerY - contentCenterY * es;
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
        const viewport = getViewportMetrics();
        const containerWidth = viewport.width;
        const contentCenterX = contentMinX + contentWidth / 2;
        const contentCenterY = contentMinY + contentHeight / 2;
        const baselineX = containerWidth / 2 - contentCenterX * effectiveScale;
        const baselineY = viewport.centerY - contentCenterY * effectiveScale;

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

        debugGraphics.clear();

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
        const territoryConfigFp =
            `${GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN}:${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED}:` +
            `${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}:${GAME_CONFIG.TERRITORY_CX_COUNT}:${GAME_CONFIG.TERRITORY_CX_WEIGHT}:` +
            `${GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED}:${GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE}:${GAME_CONFIG.TERRITORY_DX_WEIGHT}:` +
            `${GAME_CONFIG.TERRITORY_CLUSTER_SPLIT}:${GAME_CONFIG.VORONOI_BORDER_SMOOTH}:${GAME_CONFIG.VORONOI_ALPHA}:` +
            `${GAME_CONFIG.VORONOI_BORDER_WIDTH}:${GAME_CONFIG.VORONOI_BORDER_ALPHA}:${GAME_CONFIG.TERRITORY_GEOMETRY_MODE}:` +
            `${GAME_CONFIG.TERRITORY_ENGINE_METHOD}:${GAME_CONFIG.TERRITORY_RENDER_MODE}:` +
            `${GAME_CONFIG.USE_RENDER_FAMILIES}:` +
            `${(GAME_CONFIG as any).__GEOMETRY_REFRESH_TOKEN ?? 0}:` +
            `${getTerritoryVisualEpoch()}`;
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
                let activeMode = GAME_CONFIG.TERRITORY_RENDER_MODE;
                if (!activeMode) {
                    // No explicit render mode set — fall back to old boolean flags
                    // Backward compat: check old boolean flags
                    if (GAME_CONFIG.TERRITORY_PVV3) activeMode = "vs_pvv3";
                    else if (GAME_CONFIG.TERRITORY_POWER_VORONOI)
                        activeMode = "power_voronoi";
                    else if (GAME_CONFIG.TERRITORY_DISTANCE_FIELD)
                        activeMode = "distance_field";
                    else if (GAME_CONFIG.TERRITORY_VORONOI)
                        activeMode = "voronoi";
                    else if (GAME_CONFIG.TERRITORY_METABALL)
                        activeMode = "metaball";
                    else if (GAME_CONFIG.TERRITORY_PIXEL) activeMode = "pixel";
                    else if (GAME_CONFIG.TERRITORY_GRAPH) activeMode = "graph";
                    else if (GAME_CONFIG.TERRITORY_CONTOUR)
                        activeMode = "contour";
                    else if (GAME_CONFIG.TERRITORY_ENGINE_ENABLED)
                        activeMode = "territory_engine";
                }

                // One-shot diagnostic: which render mode is active?
                if (!(globalThis as any).__RENDER_MODE_LOGGED) {
                    console.log(
                        `[Territory Style Dispatch] TERRITORY_RENDER_MODE="${GAME_CONFIG.TERRITORY_RENDER_MODE}" → activeMode="${activeMode}"`,
                    );
                    (globalThis as any).__RENDER_MODE_LOGGED = true;
                }

                if (
                    (!GAME_CONFIG.USE_RENDER_FAMILIES ||
                        activeMode !== "metaball") &&
                    voronoiContainer
                ) {
                    const mf = getRenderFamily("metaball");
                    if (
                        mf instanceof MetaballFamily &&
                        mf.displayRoot.parent === voronoiContainer
                    ) {
                        voronoiContainer.removeChild(mf.displayRoot);
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
                    case "metaball":
                        if (
                            GAME_CONFIG.USE_RENDER_FAMILIES &&
                            voronoiContainer
                        ) {
                            let fam = getRenderFamily("metaball");
                            if (!fam) {
                                registerRenderFamily(
                                    createMetaballFamily(colorUtils),
                                );
                                fam = getRenderFamily("metaball")!;
                            }
                            const mf = fam as MetaballFamily;
                            mf.update(
                                buildRenderFamilyInput({
                                    stars,
                                    lanes: activeGameStore
                                        .connections as StarConnection[],
                                    worldWidth: GAME_WIDTH,
                                    worldHeight: GAME_HEIGHT,
                                    nowMs: fxOrchestrator.gameTime,
                                    gameTick: activeGameStore.currentTick,
                                }),
                            );
                            if (mf.displayRoot.parent !== voronoiContainer) {
                                voronoiContainer.addChild(mf.displayRoot);
                            }
                            mf.displayRoot.visible = true;
                        } else {
                            renderMetaballModule(
                                stars,
                                voronoiContainer,
                                colorUtils,
                                GAME_WIDTH,
                                GAME_HEIGHT,
                                activeGameStore.connections as StarConnection[],
                                activeGameStore.currentTick,
                            );
                        }
                        break;
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
            const willCapture = tickEvents.conquests.length > 0 && transitionSnapshotRecorder.isEnabled();
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
                        activeFrontPlan: null,
                        prevFrontierTopology: null,
                        nextFrontierTopology: null,
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

    // Track last hitTest result to suppress duplicate logs
    let lastHitStarId: string | null | undefined = undefined; // undefined = never set

    function transposePoint(x: number, y: number): { x: number; y: number } {
        if (!mapTranspose.active) return { x, y };
        return {
            x: y,
            y: mapTranspose.mapWidth - x,
        };
    }

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
            GAME_CONFIG.STAR_RING_RADIUS + (GAME_CONFIG.STAR_RING_WIDTH ?? 2) * 0.5;
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

    function hitTestLanePoint(screenX: number, screenY: number): RulerPoint | null {
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

    interface ResolvedMapRulerFixture {
        start: RulerPoint;
        end: RulerPoint | null;
        distance: number | null;
        midX: number;
        midY: number;
        labelText: string;
        alpha: number;
        color: string;
    }

    function getMapFixtureColor(diagnostics: MapDiagnostics | null): {
        color: string;
        alpha: number;
    } {
        const fixtureColor = diagnostics?.rulerColor;
        if (!fixtureColor) {
            return {
                color: "hsla(42, 96%, 68%, 0.96)",
                alpha: 0.96,
            };
        }
        return {
            color: `hsla(${fixtureColor.h}, ${fixtureColor.s}%, ${fixtureColor.l}%, ${fixtureColor.a})`,
            alpha: fixtureColor.a,
        };
    }

    function resolveMapRulerFixture(
        fixture: MapRulerFixture,
        diagnostics: MapDiagnostics | null,
    ): ResolvedMapRulerFixture | null {
        const stars = activeGameStore.stars as StarState[];
        const starsById = new Map(stars.map((star) => [star.id, star] as const));
        const startStar = starsById.get(fixture.startStarId);
        if (!startStar) return null;

        const { color, alpha } = getMapFixtureColor(diagnostics);
        const start: RulerPoint = {
            x: mapTranspose.x(startStar),
            y: mapTranspose.y(startStar),
            snapKind: "star",
            starId: startStar.id,
        };

        const connection = findConnectionByLaneKey(fixture.laneKey);
        if (!connection) {
            return {
                start,
                end: null,
                distance: null,
                midX: start.x,
                midY: start.y,
                labelText:
                    fixture.label
                    ?? (fixture.expectedDistancePx !== undefined
                        ? `${Math.round(fixture.expectedDistancePx)} px · missing`
                        : "missing"),
                alpha,
                color,
            };
        }

        const sourceId =
            connection.sourceId <= connection.targetId
                ? connection.sourceId
                : connection.targetId;
        const targetId =
            connection.sourceId <= connection.targetId
                ? connection.targetId
                : connection.sourceId;
        const source = starsById.get(sourceId);
        const target = starsById.get(targetId);
        if (!source || !target) return null;

        const polyline = buildVisibleLanePolyline(source, target);
        if (polyline.length < 2) return null;

        let best:
            | {
                  x: number;
                  y: number;
                  distance: number;
              }
            | null = null;
        for (let index = 1; index < polyline.length; index++) {
            const [ax, ay] = polyline[index - 1];
            const [bx, by] = polyline[index];
            const projection = projectPointToSegment(
                start.x,
                start.y,
                ax,
                ay,
                bx,
                by,
            );
            if (!best || projection.distance < best.distance) {
                best = projection;
            }
        }
        if (!best) return null;

        const end: RulerPoint = {
            x: best.x,
            y: best.y,
            snapKind: "lane",
            laneKey: fixture.laneKey,
            laneLabel: `${sourceId} ↔ ${targetId}`,
        };

        return {
            start,
            end,
            distance: best.distance,
            midX: start.x + (end.x - start.x) * 0.5,
            midY: start.y + (end.y - start.y) * 0.5,
            labelText:
                fixture.label
                ?? (fixture.expectedDistancePx !== undefined
                    ? `${Math.round(fixture.expectedDistancePx)} px`
                    : `${best.distance.toFixed(2)} px`),
            alpha,
            color,
        };
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
        const diagnostics = activeGameStore.mapDiagnostics;
        const resolvedFixtures =
            diagnostics?.rulerFixtures
                ?.map((fixture) => resolveMapRulerFixture(fixture, diagnostics))
                .filter(
                    (
                        fixture,
                    ): fixture is ResolvedMapRulerFixture => fixture !== null,
                ) ?? [];
        let labelIndex = 0;

        const drawPoint = (
            point: RulerPoint,
            pointColor: string,
            alpha: number,
        ) => {
            graphics.circle(point.x, point.y, point.snapKind === "free" ? 6 : 8);
            graphics.fill({
                color: pointColor,
                alpha: Math.max(0.18, alpha * 0.28),
            });
            graphics.stroke({ color: pointColor, width: 2, alpha });

            graphics.moveTo(point.x - 10, point.y);
            graphics.lineTo(point.x + 10, point.y);
            graphics.moveTo(point.x, point.y - 10);
            graphics.lineTo(point.x, point.y + 10);
            graphics.stroke({
                color: pointColor,
                width: 1.5,
                alpha: Math.max(0.65, alpha),
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
            segmentColor: string,
            alpha: number,
            labelText?: string,
        ) => {
            graphics.moveTo(start.x, start.y);
            graphics.lineTo(end.x, end.y);
            graphics.stroke({ color: segmentColor, width: 2.5, alpha });
            drawPoint(start, segmentColor, alpha);
            drawPoint(end, segmentColor, alpha);

            const label = ensureRulerLabel(labelIndex++);
            if (!label) return;
            label.text = labelText ?? `${measurement.distance.toFixed(2)} px`;
            label.style.fill = segmentColor;
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
                color: segmentColor,
                width: 1,
                alpha: Math.max(0.7, alpha),
            });
        };

        const drawPointLabel = (
            point: RulerPoint,
            labelText: string,
            labelColor: string,
            alpha: number,
        ) => {
            drawPoint(point, labelColor, alpha);
            const label = ensureRulerLabel(labelIndex++);
            if (!label) return;
            label.text = labelText;
            label.style.fill = labelColor;
            label.position.set(point.x, point.y - 22);
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
                color: labelColor,
                width: 1,
                alpha: Math.max(0.7, alpha),
            });
        };

        for (const fixture of resolvedFixtures) {
            if (fixture.end && fixture.distance !== null) {
                drawMeasuredSegment(
                    fixture.start,
                    fixture.end,
                    fixture,
                    fixture.color,
                    fixture.alpha,
                    fixture.labelText,
                );
            } else {
                drawPointLabel(
                    fixture.start,
                    fixture.labelText,
                    fixture.color,
                    fixture.alpha,
                );
            }
        }

        if (state.mode === "persistent") {
            for (const measurement of state.measurements) {
                drawMeasuredSegment(
                    measurement.start,
                    measurement.end,
                    measurement,
                    color,
                    state.color.a,
                );
            }
        }

        if (state.start) {
            drawPoint(state.start, color, state.color.a);
        }

        if (draftMeasurement && state.start && state.end) {
            drawMeasuredSegment(
                state.start,
                state.end,
                draftMeasurement,
                color,
                state.color.a,
            );
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

<!-- Debug Overlay -->
<div class="debug-overlay-bar">
    <div class="fps-overlay">
        {currentFps} FPS · {totalVisualShips.toLocaleString()} ships
    </div>
    <div class="scale-ruler" aria-label={`Scale ruler: ${scaleRulerWorldPx} pixels`}>
        <div class="scale-ruler__label">{scaleRulerWorldPx}px</div>
        <div class="scale-ruler__bar" style={`width: ${scaleRulerScreenPx}px;`}>
            <span class="scale-ruler__tick scale-ruler__tick--start"></span>
            <span class="scale-ruler__tick scale-ruler__tick--mid"></span>
            <span class="scale-ruler__tick scale-ruler__tick--end"></span>
        </div>
    </div>
</div>

<style>
    .debug-overlay-bar {
        position: fixed;
        top: 8px;
        left: 8px;
        z-index: 9999;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        pointer-events: none;
        user-select: none;
    }

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
        font-family: "Consolas", "Monaco", monospace;
        font-size: 11px;
        color: #0f0;
        background: rgba(0, 0, 0, 0.6);
        padding: 3px 8px;
        border-radius: 4px;
        pointer-events: none;
        user-select: none;
    }
    .scale-ruler {
        min-width: 112px;
        font-family: "Consolas", "Monaco", monospace;
        color: #8fd6ff;
        background: rgba(0, 0, 0, 0.6);
        padding: 3px 10px 5px;
        border-radius: 4px;
    }
    .scale-ruler__label {
        font-size: 10px;
        line-height: 1.1;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }
    .scale-ruler__bar {
        position: relative;
        height: 10px;
        border-top: 2px solid currentColor;
    }
    .scale-ruler__tick {
        position: absolute;
        top: -2px;
        width: 1px;
        height: 8px;
        background: currentColor;
    }
    .scale-ruler__tick--start {
        left: 0;
    }
    .scale-ruler__tick--mid {
        left: 50%;
        transform: translateX(-0.5px);
        height: 6px;
    }
    .scale-ruler__tick--end {
        right: 0;
    }
    @media (max-width: 1024px) {
        .debug-overlay-bar {
            display: none;
        }
    }
</style>
