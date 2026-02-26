<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import * as PIXI from "pixi.js";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { animationStore } from "$lib/stores/animationStore.svelte";
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
    import { audio } from "$lib/audio/AudioManager";
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

    // React to animation speed changes from the UI slider
    $effect(() => {
        fxOrchestrator.setAnimationSpeed(animationStore.speedMs);
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
    const ZOOM_MIN = 0.1; // Allow zooming far out for large maps
    const ZOOM_MAX = 5.0;
    const ZOOM_STEP = 0.1; // Per scroll notch
    let isPanning = false; // Middle-mouse-button or spacebar pan
    let isSpaceHeld = false; // Spacebar held for pan mode
    let panStartScreenX = 0;
    let panStartScreenY = 0;
    let panStartOffsetX = 0;
    let panStartOffsetY = 0;

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
        audio.order(orderChainDepth);
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
        const bgImagePath =
            (typeof localStorage !== "undefined"
                ? localStorage.getItem("pax_bgImage")
                : null) || "pax-fluxia-bg-4.jpg";
        const bgTexture = await PIXI.Assets.load(`/assets/${bgImagePath}`);
        const bgSprite = new PIXI.Sprite(bgTexture);
        bgSprite.anchor.set(0.5, 0.5);
        bgSprite.alpha = 0.12;
        app.stage.addChildAt(bgSprite, 0); // Bottom-most layer
        // Size and position will be set in handleResize when GAME_WIDTH/HEIGHT are known
        (app as any)._nebulaBgSprite = bgSprite;

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
                // Compute tickProgress from game time (NOT wall clock)
                const gameNowMs = fxOrchestrator.gameTime;
                const tickProgress = isPaused
                    ? 0
                    : Math.min(
                          (gameNowMs - lastTickGameTimeMs) /
                              activeGameStore.effectiveTickMs,
                          1,
                      );
                renderFrame(stars, tickProgress);
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
    }

    // ============================================================================
    // Rendering
    // ============================================================================

    // Game world dimensions (dynamic — computed from star positions)
    let GAME_WIDTH = 1600;
    let GAME_HEIGHT = 900;

    /** Recompute world bounds from actual star positions + padding */
    function updateWorldBounds() {
        const currentStars = activeGameStore.stars as StarState[];
        if (!currentStars || currentStars.length === 0) return;
        let maxX = 0,
            maxY = 0;
        for (const s of currentStars) {
            if (s.x > maxX) maxX = s.x;
            if (s.y > maxY) maxY = s.y;
        }
        // Add padding (star radius + orbits)
        const pad = 80;
        GAME_WIDTH = maxX + pad;
        GAME_HEIGHT = maxY + pad;
    }

    function handleResize() {
        if (!app) return;

        app.resize();

        // Recompute world bounds from star positions
        updateWorldBounds();

        // Size nebula background to cover game world
        const bgSprite = (app as any)._nebulaBgSprite as
            | PIXI.Sprite
            | undefined;
        if (bgSprite && bgSprite.texture) {
            bgSprite.x = GAME_WIDTH / 2;
            bgSprite.y = GAME_HEIGHT / 2;
            // Cover: scale to fill world bounds
            const texW = bgSprite.texture.width;
            const texH = bgSprite.texture.height;
            const coverScale = Math.max(GAME_WIDTH / texW, GAME_HEIGHT / texH);
            bgSprite.scale.set(coverScale);
        }

        // Calculate base scale to fit game world in container
        const containerWidth = app.screen.width;
        const containerHeight = app.screen.height;

        const scaleX = containerWidth / GAME_WIDTH;
        const scaleY = containerHeight / GAME_HEIGHT;
        baseScale = Math.min(scaleX, scaleY); // Fit (not fill)

        // Apply combined scale + zoom
        applyZoomTransform();
    }

    function applyZoomTransform() {
        if (!app) return;

        const containerWidth = app.screen.width;
        const containerHeight = app.screen.height;
        const effectiveScale = baseScale * zoomLevel;

        app.stage.scale.set(effectiveScale, effectiveScale);

        // Center content, then apply pan offset
        const scaledWidth = GAME_WIDTH * effectiveScale;
        const scaledHeight = GAME_HEIGHT * effectiveScale;
        const centerX = (containerWidth - scaledWidth) / 2;
        const centerY = (containerHeight - scaledHeight) / 2;

        app.stage.x = centerX - panOffsetX * effectiveScale;
        app.stage.y = centerY - panOffsetY * effectiveScale;

        // Clamp pan so map edges stay roughly visible
        clampPan();
    }

    function clampPan() {
        if (!app) return;

        const containerWidth = app.screen.width;
        const containerHeight = app.screen.height;
        const effectiveScale = baseScale * zoomLevel;
        const scaledWidth = GAME_WIDTH * effectiveScale;
        const scaledHeight = GAME_HEIGHT * effectiveScale;

        // Allow panning up to 100% the world size beyond edges (unrestricted)
        const maxPanX = Math.max(
            0,
            (scaledWidth - containerWidth) / (2 * effectiveScale) +
                GAME_WIDTH * 1.0,
        );
        const maxPanY = Math.max(
            0,
            (scaledHeight - containerHeight) / (2 * effectiveScale) +
                GAME_HEIGHT * 1.0,
        );

        panOffsetX = Math.max(-maxPanX, Math.min(maxPanX, panOffsetX));
        panOffsetY = Math.max(-maxPanY, Math.min(maxPanY, panOffsetY));

        // Reapply position after clamp
        const centerX = (containerWidth - scaledWidth) / 2;
        const centerY = (containerHeight - scaledHeight) / 2;
        app.stage.x = centerX - panOffsetX * effectiveScale;
        app.stage.y = centerY - panOffsetY * effectiveScale;
    }

    function handleWheel(event: WheelEvent) {
        log.input(
            `⚙ wheel deltaY=${event.deltaY.toFixed(0)} @(${event.clientX},${event.clientY})`,
        );
        event.preventDefault();
        if (!app) return;

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
        const effectiveScale = baseScale * zoomLevel;
        const containerWidth = app.screen.width;
        const containerHeight = app.screen.height;
        const scaledWidth = GAME_WIDTH * effectiveScale;
        const scaledHeight = GAME_HEIGHT * effectiveScale;
        const centerX = (containerWidth - scaledWidth) / 2;
        const centerY = (containerHeight - scaledHeight) / 2;

        // worldBefore should equal screenToWorld(screenX, screenY) after transform
        // screenX = centerX - panOffsetX * effectiveScale + worldBefore.x * effectiveScale
        // => panOffsetX = (centerX + worldBefore.x * effectiveScale - screenX) / effectiveScale
        panOffsetX = worldBefore.x - (screenX - centerX) / effectiveScale;
        panOffsetY = worldBefore.y - (screenY - centerY) / effectiveScale;

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

        // Render territory overlay (contiguous fill above halos)
        if (voronoiContainer) {
            const mode = GAME_CONFIG.TERRITORY_MODE ?? "voronoi";

            // Always keep container visible — each renderer manages its own children
            voronoiContainer.visible = true;

            // Voronoi mode
            if (mode === "voronoi") {
                renderVoronoiModule(
                    stars,
                    voronoiContainer,
                    colorUtils,
                    GAME_WIDTH,
                    GAME_HEIGHT,
                );
            }

            // Metaball mode
            renderMetaballModule(
                stars,
                voronoiContainer,
                colorUtils,
                GAME_WIDTH,
                GAME_HEIGHT,
            );
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

    function hitTestStar(screenX: number, screenY: number): StarState | null {
        // Use activeGameStore for unified star access
        const stars = activeGameStore.stars as StarState[];

        if (stars.length === 0) {
            log.input("hitTestStar MISS — stars array empty");
            return null;
        }

        // Convert screen coordinates to world coordinates
        const { x, y } = screenToWorld(screenX, screenY);

        // Find the NEAREST star within a reasonable hit radius
        let nearest: StarState | null = null;
        let nearestDist = Infinity;

        for (const star of stars) {
            const dist = distance(x, y, star.x, star.y);
            // Hit radius: 2× visual radius or 40px minimum
            const hitRadius = Math.max(star.radius * 2, 40);
            if (dist <= hitRadius && dist < nearestDist) {
                nearest = star;
                nearestDist = dist;
            }
        }

        if (nearest) {
            log.input(
                `hitTest HIT → ${nearest.id} (owner=${nearest.ownerId}, dist=${nearestDist.toFixed(0)}, r=${nearest.radius})`,
            );
        } else {
            log.input(
                `hitTest MISS — screen(${screenX.toFixed(0)},${screenY.toFixed(0)}) → world(${x.toFixed(0)},${y.toFixed(0)}), ${stars.length} stars checked`,
            );
        }

        return nearest;
    }

    function handlePointerDown(event: PointerEvent) {
        if (!app) return;
        log.input(
            `▼ pointerDown btn=${event.button} @(${event.clientX},${event.clientY})`,
        );

        const rect = canvasContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Middle-click or Space+click: start pan
        if (event.button === 1) {
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
            // Start drag from this star
            isDragging = true;
            dragSourceId = star.id;
            // FIX: Use actual click position for movement detection
            dragStartX = x;
            dragStartY = y;
            // But use star center for visual drag preview line
            dragSourceCenterX = star.x;
            dragSourceCenterY = star.y;
            dragCurrentX = x;
            dragCurrentY = y;
            log.input(`pointerDown → DRAG START from owned star ${star.id}`);
        } else if (star) {
            // Clicked unowned star — reset drag state to prevent stale dragStartX/Y
            isDragging = false;
            dragSourceId = null;
            dragStartX = x;
            dragStartY = y;
            log.input(
                `pointerDown → unowned star ${star.id} (owner=${star.ownerId}), drag state reset`,
            );
        } else {
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
                const isTargetEnemy =
                    !isTargetMine && targetStar.ownerId !== "neutral";

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

                        // If target is enemy, track it for potential deferred order
                        if (isTargetEnemy) {
                            lastEnemyPassthrough = targetStar.id;
                        } else {
                            lastEnemyPassthrough = null;
                        }

                        // Chain continues from target
                        dragSourceId = targetStar.id;
                        dragStartX = dragCurrentX;
                        dragStartY = dragCurrentY;
                        dragSourceCenterX = targetStar.x;
                        dragSourceCenterY = targetStar.y;
                        activeStarId = targetStar.id;
                    }
                } else if (lastEnemyPassthrough === dragSourceId) {
                    // Dragging FROM an enemy star we're attacking - set deferred order!
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

                        // Continue chain
                        if (isTargetEnemy) {
                            lastEnemyPassthrough = targetStar.id;
                        } else {
                            lastEnemyPassthrough = null;
                        }

                        dragSourceId = targetStar.id;
                        dragStartX = dragCurrentX;
                        dragStartY = dragCurrentY;
                        dragSourceCenterX = targetStar.x;
                        dragSourceCenterY = targetStar.y;
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
                        activeStarSnapshot.ownerId !== "neutral"
                    ) {
                        // Enemy star → deferred order
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
                    target.x,
                    target.y,
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
    onpointerleave={() => {
        cancelDrag();
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
</style>
