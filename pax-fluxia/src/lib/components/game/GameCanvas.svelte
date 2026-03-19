<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import * as PIXI from "pixi.js";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { animationStore } from "$lib/stores/animationStore.svelte";
    import { audioManager } from "$lib/services/audioManager.svelte";
    import { mapTranspose } from "$lib/stores/mapTranspose.svelte";
    import { log } from "$lib/utils/logger";
    import { GAME_CONFIG } from "$lib/config/game.config";
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
        renderMetaball as renderMetaballModule,
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
    } from "$lib/renderers/PowerVoronoiRenderer";
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
    } from "$lib/territory-engine";
    // ── Canonical territory layer (Phase 2: new architecture) ──────────────────
    import { TerritoryEngineController } from "$lib/territory/engine/TerritoryEngineController";
    import { TerritoryRenderer } from "$lib/territory/render/TerritoryRenderer";

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

    // ── Canonical territory instances (class-encapsulated, no module-level state) ─
    let canonicalController: TerritoryEngineController | null = null;
    let canonicalRenderer: TerritoryRenderer | null = null;

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
        const bgImagePath = GAME_CONFIG.BG_IMAGE_URL;
        const bgSprite = new PIXI.Sprite();
        bgSprite.anchor.set(0.5, 0.5);
        bgSprite.alpha = 0.12;
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
            const img = (e as CustomEvent).detail as string;
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
            } catch {
                sprite.visible = false;
            }
        };
        window.addEventListener("pax-bg-change", handleBgChange);

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

    /** Toggle the transpose flag — 90° CCW rotation matching physical device rotation */
    function transposeStarCoordinates() {
        // Set map width BEFORE toggling so the axis flip uses pre-transpose width
        mapTranspose.mapWidth = GAME_WIDTH;
        mapTranspose.active = !mapTranspose.active;
        // Flip the map orientation flag
        mapIsPortrait = !mapIsPortrait;
        // Reset territory caches since display positions changed
        resetVoronoiCache();
        resetMetaballCache();
        resetPixelTerritoryCache();
        resetLaneTerritoryCache();
        resetContourTerritoryCache();
        resetModifiedVoronoiCache();
        resetPowerVoronoiCache();
        resetTerritoryEngineCaches();
        resetDistanceFieldTerritoryCache();
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
            starsContainer.parent.addChildAt(debugGraphics, 0); // Background layer
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
            resetVoronoiCache();
            resetMetaballCache();
            resetPixelTerritoryCache();
            resetLaneTerritoryCache();
            resetContourTerritoryCache();
            resetModifiedVoronoiCache();
            resetPowerVoronoiCache();
            resetTerritoryEngineCaches();
            resetDistanceFieldTerritoryCache();
            activeSurges.clear();
            nextShipId = 0;
            starShipCounts.clear();
            shipSpawnTimers.clear();
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
            renderStarPowerModule(stars, territoryGraphics, colorUtils);
        }

        // Render territory overlays — only call the active renderer
        if (voronoiContainer) {
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
                        renderMetaballModule(
                            stars,
                            voronoiContainer,
                            colorUtils,
                            GAME_WIDTH,
                            GAME_HEIGHT,
                            activeGameStore.connections as StarConnection[],
                        );
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
                        // ── NEW CANONICAL PIPELINE ──────────────────────────────────
                        // Lazily initialize controller and renderer per-container
                        if (!canonicalController) {
                            canonicalController = new TerritoryEngineController(
                                { transitionDurationMs: 600 },
                            );
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

                            // One-shot diagnostic
                            if (!(globalThis as any).__canonicalDiagLogged) {
                                (globalThis as any).__canonicalDiagLogged =
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
                                    if (state.regions?.length === 0) {
                                        console.warn(
                                            "[Canonical🔍] regions=0 — regionStage produced no closed loops",
                                        );
                                    }
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
        }

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
                            const dx = dStar.x - aStar.x;
                            const dy = dStar.y - aStar.y;
                            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                            activeSurges.set(attackerId, {
                                startTime: fxOrchestrator.gameTime,
                                dirX: dx / dist,
                                dirY: dy / dist,
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

    function handlePointerDown(event: PointerEvent) {
        if (!app) return;
        log.input(
            `▼ pointerDown btn=${event.button} @(${event.clientX},${event.clientY}) ptrType=${event.pointerType}`,
        );

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

    function handleKeyDown(event: KeyboardEvent) {
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
