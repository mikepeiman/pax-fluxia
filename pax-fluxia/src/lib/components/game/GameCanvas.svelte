<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import * as PIXI from "pixi.js";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { log } from "$lib/utils/logger";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        getOrbitSlot,
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
        FleetState,
        StarId,
    } from "$lib/types/game.types";
    import { Star } from "$lib/engine/Star";
    import { STAR_TYPE_STATS } from "@pax/common";
    import { executeConquestTransfer } from "$lib/animations/conquest";
    import type { StarType } from "@pax/common";
    import { audio } from "$lib/audio/AudioManager";
    import { selectedStarStore } from "$lib/stores/selectedStarStore.svelte";
    // animationStore is deprecated — ship animations handled via unified lifecycle
    import { ANIM_CONFIG } from "$lib/stores/animationStore";

    // ============================================================================
    // PixiJS Application
    // ============================================================================

    let canvasContainer: HTMLDivElement;
    let app: PIXI.Application | null = null;

    // Graphics layers
    let connectionGraphics: PIXI.Graphics | null = null;
    let dragPreviewGraphics: PIXI.Graphics | null = null;
    let starsContainer: PIXI.Container | null = null;
    let shipsContainer: PIXI.Container | null = null;
    let labelsContainer: PIXI.Container | null = null;

    // Game logic imports
    import { HexGrid } from "$lib/engine/HexGrid";

    // Graphics cache
    let starGraphics: Map<string, PIXI.Graphics> = new Map();
    let starLabels: Map<string, PIXI.Container> = new Map();
    let linkGraphics: PIXI.Graphics | null = null;
    let debugGraphics: PIXI.Graphics | null = null; // New debug layer

    // ParticleContainer ship rendering (high-perf batched sprites)
    let shipCircleTexture: PIXI.Texture | null = null;
    let shipParticleContainer: PIXI.ParticleContainer | null = null;
    let shipParticlePool: PIXI.Particle[] = [];
    let shipParticleIndex = 0;
    let orbGraphics: PIXI.Graphics | null = null; // For orb travel glow effects (needs Graphics)

    // FPS tracking
    let fpsFrameCount = 0;
    let fpsLastTime = performance.now();
    let currentFps = 0;
    let totalVisualShips = 0;

    // Ship Spawn Animation Tracking
    // Key: `${starId}-${shipIndex}`, Value: spawnTimestamp
    let shipSpawnTimers: Map<string, number> = new Map();
    let starShipCounts: Map<string, number> = new Map(); // Track previous counts

    // Physics State
    // Map<StarId, VisualShipState[]>
    let visualShips: Map<string, VisualShipState[]> = new Map();
    let visualDamagedShips: Map<string, VisualShipState[]> = new Map();
    let nextShipId = 0; // Unique counter

    // In-flight ships (departing, traveling, arriving)
    let travelingShips: VisualShipState[] = [];

    // Per-star attack ramp-in progress (0→1, advances per-frame only when unpaused)
    let attackRampProgress: Map<string, number> = new Map();
    let lastSurgeFrameTime: number = 0; // For computing per-frame delta

    // Tick-synced combat tracking: stars only surge when CombatEvent confirms active combat
    let starsInCombat: Set<string> = new Set();
    // Direction lock for mid-surge target changes: complete cycle before reorienting
    let surgeLockedDir: Map<
        string,
        { x: number; y: number; targetId: string }
    > = new Map();

    // Animation state
    let animationTime = 0;
    let animationFrameId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

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
            // Remove opposite flow for same-owner stars (A→B cancels B→A)
            pendingOrders.delete(`${targetId}|${sourceId}`);
            // Add new order
            pendingOrders.add(key);
        }

        // Play order sound (ascending notes for chains)
        audio.order(orderChainDepth);
        orderChainDepth++;
    }

    // Player colors (must match engine)
    const PLAYER_COLORS: Record<string, number> = {
        "human-player": 0x4488ff,
        "ai-1": 0xff4466,
        "ai-2": 0x44ff88,
        "ai-3": 0xffcc44,
        "ai-4": 0xaa66ff,
        "ai-5": 0xff8844,
    };

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
            background: 0x0a0a12,
            resizeTo: canvasContainer,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        // Append canvas to container
        canvasContainer.appendChild(app.canvas);

        // Create graphics layers
        // Layer order (bottom to top): links → stars → ships → connections → labels → drag
        // Connections render ABOVE ships so lanes remain visible under dense ship clusters
        linkGraphics = new PIXI.Graphics();
        app.stage.addChild(linkGraphics);

        starsContainer = new PIXI.Container();
        app.stage.addChild(starsContainer);

        shipsContainer = new PIXI.Container();
        app.stage.addChild(shipsContainer);

        // Create 128px circle texture with radial gradient for anti-aliased ship rendering
        const texSize = 128;
        const texCanvas = document.createElement("canvas");
        texCanvas.width = texSize;
        texCanvas.height = texSize;
        const ctx = texCanvas.getContext("2d")!;
        const grad = ctx.createRadialGradient(
            texSize / 2,
            texSize / 2,
            0,
            texSize / 2,
            texSize / 2,
            texSize / 2,
        );
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.85, "rgba(255,255,255,1)");
        grad.addColorStop(0.95, "rgba(255,255,255,0.6)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(texSize / 2, texSize / 2, texSize / 2, 0, Math.PI * 2);
        ctx.fill();
        shipCircleTexture = PIXI.Texture.from(texCanvas);
        shipCircleTexture.source.scaleMode = "linear";

        // Single ParticleContainer for all ship rendering (outlines + fills + damage indicators)
        // Outlines are backing circles drawn BEFORE fills in the same batch
        shipParticleContainer = new PIXI.ParticleContainer({
            texture: shipCircleTexture,
            dynamicProperties: {
                position: true,
                color: true,
                vertex: true, // needed for scale changes
            },
            roundPixels: true,
        });
        shipsContainer.addChild(shipParticleContainer);

        // Orb travel effects need Graphics (variable-radius glow circles)
        orbGraphics = new PIXI.Graphics();
        shipsContainer.addChild(orbGraphics);

        connectionGraphics = new PIXI.Graphics();
        app.stage.addChild(connectionGraphics);

        labelsContainer = new PIXI.Container();
        app.stage.addChild(labelsContainer);

        dragPreviewGraphics = new PIXI.Graphics();
        app.stage.addChild(dragPreviewGraphics);

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
            const deltaTime = (currentTime - lastTime) / 1000; // in seconds
            lastTime = currentTime;

            // Freeze all animations when paused (orbits, glow, ship positions)
            const isPaused = activeGameStore.isPaused;
            if (!isPaused) {
                animationTime += deltaTime;
            }

            // Render the current frame from unified store
            const stars = activeGameStore.stars as StarState[];
            if (stars.length > 0 && app) {
                renderFrame(stars, activeGameStore.tickProgress);
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

    function getPlayerColor(ownerId: string): number {
        // Use ?? (not ||) — 0x000000 is a valid color, || would treat it as falsy
        return (
            activeGameStore.getPlayerColor(ownerId) ??
            PLAYER_COLORS[ownerId] ??
            0x888888
        );
    }

    // Helper to safely parse color from config (string/number/object)
    function parseColor(input: any): number {
        if (typeof input === "number") return input;
        if (typeof input === "string") {
            if (input.startsWith("#")) return parseInt(input.slice(1), 16);
            if (input.startsWith("0x")) return parseInt(input, 16);
            return parseInt(input);
        }
        if (typeof input === "object" && input !== null) {
            // Tweakpane object {r, g, b} (0-255 or 0-1?) usually 0-255 for 'pico'
            // Assuming r,g,b are 0-255
            if ("r" in input && "g" in input && "b" in input) {
                return (input.r << 16) + (input.g << 8) + input.b;
            }
        }
        return 0xffffff;
    }
    function renderDebugGrid() {
        if (!starsContainer?.parent) return;

        if (!debugGraphics) {
            debugGraphics = new PIXI.Graphics();
            starsContainer.parent.addChildAt(debugGraphics, 0); // Background layer
        }

        debugGraphics.clear();

        if (GAME_CONFIG.SHOW_HEX_GRID) {
            // Replicate Engine Grid Config
            const width = 1600;
            const height = 900;
            const hexRadius = GAME_CONFIG.HEX_RADIUS || 60;
            const paddingX = 250;
            const paddingY = 120;
            const offsetX = paddingX;
            const offsetY = paddingY;

            const grid = new HexGrid({
                width: width - paddingX * 2,
                height: height - paddingY * 2,
                radius: hexRadius,
                offset: 0,
            });

            const hexes = grid.generate();

            debugGraphics.stroke({ width: 2, color: 0x00ff00, alpha: 0.5 });

            hexes.forEach((h) => {
                const cx = h.x + offsetX;
                const cy = h.y + offsetY;
                drawHex(debugGraphics!, cx, cy, hexRadius * 0.95); // Slightly smaller to see gaps
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

        // Build star lookup ONCE per frame (was built 4x per frame = major GC pressure)
        const starsById = new Map(stars.map((s) => [s.id, s]));

        // Render stars (static elements)
        renderStars(stars);

        // Render connections (star network) - unified source
        const connections = activeGameStore.connections as StarConnection[];
        if (connections) {
            renderConnections(stars, connections, starsById);
        }

        // Render flow links
        renderOrderArrows(stars, starsById);

        // NOTE: Pending orders cleanup is now handled in renderOrderArrows()

        // Reset particle pool index for this frame
        shipParticleIndex = 0;
        // Clear orb travel graphics (drawn fresh each frame)
        if (orbGraphics) orbGraphics.clear();

        // Process tick events (event-driven animations, not diff-based — see POST_MORTEMS.md)
        const tickEvents = activeGameStore.consumeTickEvents();

        // Clear combat tracking before processing new tick events
        // (starsInCombat is rebuilt each tick from CombatEvents)
        if (tickEvents) {
            starsInCombat.clear();
            processTickEvents(stars, tickEvents, connections || [], starsById);
        }

        // Render all ships: orbiting (per-star) + traveling (in-flight lifecycle)
        renderShips(stars, tickProgress, starsById);

        // Hide unused particles from pool
        for (let i = shipParticleIndex; i < shipParticlePool.length; i++) {
            shipParticlePool[i].alpha = 0;
        }
        if (shipParticleContainer) shipParticleContainer.update();

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

    function renderConnections(
        stars: StarState[],
        connections: StarConnection[],
        starsById: Map<string, StarState>,
    ) {
        if (!connectionGraphics) return;

        connectionGraphics.clear();

        // starsById passed in from renderFrame (no allocation needed)

        // Collect all lane segments (reused for both shadow and foreground passes)
        const segments: { x1: number; y1: number; x2: number; y2: number }[] =
            [];

        connections.forEach((conn) => {
            const source = starsById.get(conn.sourceId);
            const target = starsById.get(conn.targetId);
            if (!source || !target) return;

            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const laneDist = Math.sqrt(dx * dx + dy * dy);
            if (laneDist < 1) return;

            const ndx = dx / laneDist;
            const ndy = dy / laneDist;

            // Collect gap intervals [tStart, tEnd] along the lane (0..1 parameterization)
            const gaps: [number, number][] = [];

            // Gap at source and target star edges (lanes terminate at star boundary)
            const srcGap = source.radius / laneDist;
            const tgtGap = target.radius / laneDist;
            gaps.push([0, srcGap]);
            gaps.push([1 - tgtGap, 1]);

            // Check all other stars for proximity to this lane
            for (const star of stars) {
                if (star.id === conn.sourceId || star.id === conn.targetId)
                    continue;

                const ax = star.x - source.x;
                const ay = star.y - source.y;
                const t = (ax * ndx + ay * ndy) / laneDist;

                if (t <= 0 || t >= 1) continue;

                const projX = source.x + ndx * t * laneDist;
                const projY = source.y + ndy * t * laneDist;
                const perpDist = Math.sqrt(
                    (star.x - projX) ** 2 + (star.y - projY) ** 2,
                );

                const clearance = star.radius + 6;
                if (perpDist < clearance) {
                    const halfChord = Math.sqrt(
                        Math.max(
                            0,
                            clearance * clearance - perpDist * perpDist,
                        ),
                    );
                    const gapStart = Math.max(0, t - halfChord / laneDist);
                    const gapEnd = Math.min(1, t + halfChord / laneDist);
                    gaps.push([gapStart, gapEnd]);
                }
            }

            // Sort gaps by start and merge overlapping
            gaps.sort((a, b) => a[0] - b[0]);
            const merged: [number, number][] = [];
            for (const gap of gaps) {
                if (
                    merged.length > 0 &&
                    gap[0] <= merged[merged.length - 1][1]
                ) {
                    merged[merged.length - 1][1] = Math.max(
                        merged[merged.length - 1][1],
                        gap[1],
                    );
                } else {
                    merged.push([...gap]);
                }
            }

            // Collect segments between gaps
            let segStart = 0;
            for (const [gStart, gEnd] of merged) {
                if (segStart < gStart) {
                    segments.push({
                        x1: source.x + ndx * segStart * laneDist,
                        y1: source.y + ndy * segStart * laneDist,
                        x2: source.x + ndx * gStart * laneDist,
                        y2: source.y + ndy * gStart * laneDist,
                    });
                }
                segStart = gEnd;
            }
            if (segStart < 1) {
                segments.push({
                    x1: source.x + ndx * segStart * laneDist,
                    y1: source.y + ndy * segStart * laneDist,
                    x2: target.x,
                    y2: target.y,
                });
            }
        });

        // Pass 1: Dark shadow/border (wider, dark, semi-transparent)
        const shadowWidth =
            GAME_CONFIG.CONNECTION_WIDTH + GAME_CONFIG.CONNECTION_SHADOW_WIDTH;
        for (const seg of segments) {
            connectionGraphics.moveTo(seg.x1, seg.y1);
            connectionGraphics.lineTo(seg.x2, seg.y2);
        }
        connectionGraphics.stroke({
            color: 0x000000,
            width: shadowWidth,
            alpha: GAME_CONFIG.CONNECTION_SHADOW_ALPHA,
            cap: "round",
        });

        // Pass 2: Foreground lane stroke
        for (const seg of segments) {
            connectionGraphics.moveTo(seg.x1, seg.y1);
            connectionGraphics.lineTo(seg.x2, seg.y2);
        }
        connectionGraphics.stroke({
            color: parseColor(GAME_CONFIG.CONNECTION_COLOR),
            width: GAME_CONFIG.CONNECTION_WIDTH,
            alpha: GAME_CONFIG.CONNECTION_ALPHA,
            cap: "round",
        });
    }

    function renderStars(stars: StarState[]) {
        stars.forEach((star) => {
            let graphics = starGraphics.get(star.id);
            let label = starLabels.get(star.id);

            if (!graphics) {
                graphics = new PIXI.Graphics();
                starsContainer!.addChild(graphics);
                starGraphics.set(star.id, graphics);
            }

            if (!label) {
                // Create container for stacked labels - OFFSET from star with leash
                label = new PIXI.Container();

                // Leash line graphics (drawn first, behind text)
                const leashGraphics = new PIXI.Graphics();
                leashGraphics.label = "leash";
                label.addChild(leashGraphics);

                // Star ID label (Top) - LARGER for readability
                const idText = new PIXI.Text({
                    text: star.id.replace("star-", "#"),
                    style: {
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 14,
                        fontWeight: "bold",
                        fill: 0x88aaff,
                        align: "center",
                        stroke: { color: 0x000000, width: 3 },
                    },
                    resolution: 2,
                });
                idText.anchor.set(0.5, 0.5);
                idText.position.y = 0;
                idText.label = "starId";
                label.addChild(idText);

                // Active count (Middle, Bright) - LARGER for readability
                const activeText = new PIXI.Text({
                    text: "0",
                    style: {
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 22,
                        fontWeight: "bold",
                        fill: 0xffffff,
                        align: "center",
                        stroke: { color: 0x000000, width: 3 },
                    },
                    resolution: 2,
                });
                activeText.anchor.set(0.5, 0.5);
                activeText.position.y = 18;
                activeText.label = "active";
                label.addChild(activeText);

                // Damaged count (Bottom, Dimmer) - LARGER for readability
                const damagedText = new PIXI.Text({
                    text: "0",
                    style: {
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 16,
                        fontWeight: "bold",
                        fill: 0xff8888,
                        align: "center",
                        stroke: { color: 0x000000, width: 2 },
                    },
                    resolution: 2,
                });
                damagedText.anchor.set(0.5, 0.5);
                damagedText.position.y = 38;
                damagedText.label = "damaged";
                label.addChild(damagedText);

                labelsContainer!.addChild(label);
                starLabels.set(star.id, label);
            }

            // Clear previous drawings
            graphics.clear();

            const color = getPlayerColor(star.ownerId);
            const radius = star.radius;
            const isActive =
                star.id === activeStarId || star.id === dragSourceId;

            // Active star selection highlight (hex border)
            if (isActive) {
                drawHexBorder(
                    graphics,
                    star.x,
                    star.y,
                    radius + 20,
                    0x00ffff,
                    3,
                );
            }

            // Outer glow ring (pulses slightly, stronger when active)
            const glowPulse = 1 + Math.sin(animationTime * 2) * 0.1;
            const glowAlpha = isActive ? 0.25 : 0.12;
            graphics.circle(star.x, star.y, (radius + 8) * glowPulse);
            graphics.fill({ color, alpha: glowAlpha });

            // Main star body
            // Base color from StarType
            const typeStats =
                STAR_TYPE_STATS[
                    star.starType as import("@pax/common").StarType
                ];
            const typeColor = typeStats ? typeStats.color : 0xffffff;

            graphics.circle(star.x, star.y, radius);
            graphics.fill({ color: typeColor, alpha: 0.3 }); // Inner type color
            graphics.stroke({ color, width: isActive ? 4 : 2, alpha: 1 }); // Owner border

            // Inner type icon (geometric shape based on star type)
            const iconAlpha = 0.5 + Math.sin(animationTime * 3) * 0.1;
            const iconSize = radius * 0.35;
            drawTypeIcon(
                graphics,
                star.x,
                star.y,
                iconSize,
                star.starType,
                iconAlpha,
                typeColor,
            );

            // Update labels
            const activeText = label.getChildByLabel("active") as PIXI.Text;
            const damagedText = label.getChildByLabel("damaged") as PIXI.Text;
            const leashGraphics = label.getChildByLabel(
                "leash",
            ) as PIXI.Graphics;

            if (activeText) activeText.text = String(star.activeShips);

            if (damagedText) {
                // ALWAYS show damaged count, even if 0, per request
                damagedText.text = String(star.damagedShips);
                damagedText.visible = true;
            }

            // Label offset from star center (bottom-right diagonal)
            const labelOffsetX = 45;
            const labelOffsetY = 35;

            // Position label offset from star
            label.x = star.x + labelOffsetX;
            label.y = star.y + labelOffsetY;

            // Draw leash line from star edge to label
            if (leashGraphics) {
                leashGraphics.clear();
                // Line goes from star edge (at angle) to label origin
                // Since label is positioned at offset, the line start is relative to label
                const starEdgeX = -labelOffsetX + radius * 0.7; // From label's perspective
                const starEdgeY = -labelOffsetY + radius * 0.7;
                leashGraphics.moveTo(starEdgeX, starEdgeY);
                leashGraphics.lineTo(-5, -5); // To just before label center
                leashGraphics.stroke({ color: 0x666688, width: 1, alpha: 0.6 });
            }
        });
    }

    function renderOrderArrows(
        stars: StarState[],
        starsById: Map<string, StarState>,
    ) {
        if (!linkGraphics) return;

        linkGraphics.clear();

        // Build set of confirmed orders from star snapshot
        const confirmedOrders = new Map<string, string>(); // sourceId -> targetId
        stars.forEach((s) => {
            if (s.targetId) {
                confirmedOrders.set(s.id, s.targetId);
            }
        });

        // Clean up stale pending orders:
        // 1. Remove if source now has a confirmed target (snapshot overrides pending)
        // 2. Remove if source no longer exists
        // starsById passed in from renderFrame (no allocation needed)
        pendingOrders.forEach((key) => {
            const [sourceId, targetId] = key.split("|");
            const source = starsById.get(sourceId);

            // Remove if source doesn't exist or no longer owned by local player
            if (!source || !isLocalPlayerStar(source)) {
                pendingOrders.delete(key);
                return;
            }

            // Remove if source now has a confirmed target (any target)
            if (confirmedOrders.has(sourceId)) {
                pendingOrders.delete(key);
            }
        });

        // Draw all confirmed orders (authoritative)
        const allLinks = new Set<string>();
        confirmedOrders.forEach((targetId, sourceId) => {
            allLinks.add(`${sourceId}|${targetId}`);
        });

        // Add remaining pending orders (optimistic, not yet confirmed)
        pendingOrders.forEach((key) => allLinks.add(key));

        // Render unique arrows
        allLinks.forEach((linkKey) => {
            const [sId, tId] = linkKey.split("|");
            const source = stars.find((s) => s.id === sId);
            const target = stars.find((s) => s.id === tId);

            if (!source || !target) return;

            // Porting canvasArrow logic to PixiJS
            // Logic: Line from (TargetRadius + HeadLen) to (SourceRadius)

            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const angle = Math.atan2(dy, dx);
            const dist = Math.sqrt(dx * dx + dy * dy);

            const padding = 10;
            const headLen = 30; // Length of arrowhead
            const lineWidth = 6;

            // Start: Source Edge
            const startDist = source.radius + padding;
            // Full extent: Target Edge
            const fullEndDist = dist - (target.radius + padding);
            // Apply arrow length fraction (0.5 = halfway)
            const endDist =
                startDist +
                (fullEndDist - startDist) * GAME_CONFIG.ARROW_LENGTH_FRACTION;

            // Calculate points
            const startX = source.x + Math.cos(angle) * startDist;
            const startY = source.y + Math.sin(angle) * startDist;

            const endX = source.x + Math.cos(angle) * endDist;
            const endY = source.y + Math.sin(angle) * endDist;

            const arrowBaseX = source.x + Math.cos(angle) * (endDist - headLen);
            const arrowBaseY = source.y + Math.sin(angle) * (endDist - headLen);

            const color = getPlayerColor(source.ownerId);

            // 1. Draw Shaft (Solid for now, gradient simulation hard in basic Graphics stroke)
            // Ideally we'd fade it out near the target, but a solid bold line is clear.
            linkGraphics!.moveTo(startX, startY);
            linkGraphics!.lineTo(arrowBaseX, arrowBaseY);
            linkGraphics!.stroke({
                color,
                width: lineWidth,
                alpha: 0.6, // Slightly transparent shaft
                cap: "round",
            });

            // 2. Draw Arrowhead (Filled Triangle) at End
            // Vertices relative to arrow tip (endX, endY)
            // We want the tip at 'endX', base at 'arrowBaseX' roughly?
            // Actually, let's use the explicit geometry from reference:
            // "headlen * Math.cos(angle - Math.PI / 6)"

            // Tip
            const tipX = endX;
            const tipY = endY;

            // Wings
            const wing1X = tipX - headLen * Math.cos(angle - Math.PI / 6);
            const wing1Y = tipY - headLen * Math.sin(angle - Math.PI / 6);

            const wing2X = tipX - headLen * Math.cos(angle + Math.PI / 6);
            const wing2Y = tipY - headLen * Math.sin(angle + Math.PI / 6);

            // Draw Head
            linkGraphics!.beginPath(); // Pixi Graphics doesn't need beginPath usually for shapes but poly does
            linkGraphics!.moveTo(tipX, tipY);
            linkGraphics!.lineTo(wing1X, wing1Y);
            linkGraphics!.lineTo(wing2X, wing2Y);
            linkGraphics!.closePath();

            linkGraphics!.fill({ color, alpha: 1.0 }); // Solid bold head
        });

        // ============================================================================
        // Render Deferred Orders (dashed lines, transparent)
        // ============================================================================

        // Clean up deferred orders for stars that have been captured by local player
        deferredOrders.forEach((key) => {
            const [sourceId] = key.split("|");
            const source = starsById.get(sourceId);
            // If the star is now owned by local player, the queued order has executed - remove it
            if (source && isLocalPlayerStar(source)) {
                deferredOrders.delete(key);
            }
        });

        // Also sync with actual queuedOrderTargetId from snapshot
        // Only remove if server has a DIFFERENT non-empty queued order
        // (empty = server hasn't confirmed yet, keep our optimistic order)
        const snapshotStars = activeGameStore.stars;
        deferredOrders.forEach((key) => {
            const [sourceId, targetId] = key.split("|");
            const star = snapshotStars.find((s) => s.id === sourceId);
            if (
                star &&
                star.queuedOrderTargetId &&
                star.queuedOrderTargetId !== targetId
            ) {
                // Server has a different queued order for this star — remove stale local one
                deferredOrders.delete(key);
            }
        });

        // Render deferred orders with dashed appearance
        deferredOrders.forEach((linkKey) => {
            const [sId, tId] = linkKey.split("|");
            const source = stars.find((s) => s.id === sId);
            const target = stars.find((s) => s.id === tId);

            if (!source || !target) return;

            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const angle = Math.atan2(dy, dx);
            const dist = Math.sqrt(dx * dx + dy * dy);

            const padding = 10;
            const headLen = 20;
            const lineWidth = 4;

            const startDist = source.radius + padding;
            const fullEndDist = dist - (target.radius + padding);
            const endDist =
                startDist +
                (fullEndDist - startDist) * GAME_CONFIG.ARROW_LENGTH_FRACTION;

            const startX = source.x + Math.cos(angle) * startDist;
            const startY = source.y + Math.sin(angle) * startDist;
            const endX = source.x + Math.cos(angle) * endDist;
            const endY = source.y + Math.sin(angle) * endDist;

            // Draw dashed line (simulate with short segments)
            const dashLen = 15;
            const gapLen = 10;
            const totalLen = endDist - startDist;
            let currentDist = 0;

            const humanColor = 0x4488ff; // Human player color

            while (currentDist < totalLen - headLen) {
                const segStart = startDist + currentDist;
                const segEnd = Math.min(
                    segStart + dashLen,
                    startDist + totalLen - headLen,
                );

                const x1 = source.x + Math.cos(angle) * segStart;
                const y1 = source.y + Math.sin(angle) * segStart;
                const x2 = source.x + Math.cos(angle) * segEnd;
                const y2 = source.y + Math.sin(angle) * segEnd;

                linkGraphics!.moveTo(x1, y1);
                linkGraphics!.lineTo(x2, y2);
                linkGraphics!.stroke({
                    color: humanColor,
                    width: lineWidth,
                    alpha: 0.4,
                    cap: "round",
                });

                currentDist += dashLen + gapLen;
            }

            // Draw small arrowhead
            const tipX = endX;
            const tipY = endY;
            const wing1X = tipX - headLen * Math.cos(angle - Math.PI / 6);
            const wing1Y = tipY - headLen * Math.sin(angle - Math.PI / 6);
            const wing2X = tipX - headLen * Math.cos(angle + Math.PI / 6);
            const wing2Y = tipY - headLen * Math.sin(angle + Math.PI / 6);

            linkGraphics!.moveTo(tipX, tipY);
            linkGraphics!.lineTo(wing1X, wing1Y);
            linkGraphics!.lineTo(wing2X, wing2Y);
            linkGraphics!.closePath();
            linkGraphics!.fill({ color: humanColor, alpha: 0.5 });
        });
    }

    // ============================================================================
    // Animation System — Event-Driven Ship Lifecycle
    // (POST_MORTEMS.md: animations driven by TickEvents, not state diffing)
    // ============================================================================

    /**
     * Process tick events to create ship travel animations.
     * Uses explicit TransferEvent/ConquestEvent data instead of diff-based detection.
     */
    function processTickEvents(
        stars: StarState[],
        events: import("@pax/common").TickEvents,
        connections: StarConnection[],
        starsById: Map<string, StarState>,
    ) {
        // starsById passed in from renderFrame
        const now = performance.now();

        // Process COMBAT events → populate starsInCombat set for tick-synced surge
        for (const combat of events.combats) {
            // All attacking stars are in combat
            for (const attackerId of combat.attackerIds) {
                starsInCombat.add(attackerId);
            }
            // Defender star is also in combat
            starsInCombat.add(combat.defenderId);
        }

        // Process TRANSFER events → ship travel animations
        for (const transfer of events.transfers) {
            const source = starsById.get(transfer.sourceId);
            const target = starsById.get(transfer.targetId);
            if (!source || !target) continue;

            const count = Math.floor(transfer.shipCount);
            const ships = visualShips.get(transfer.sourceId) || [];

            // Calculate lane geometry
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const ndx = dx / dist;
            const ndy = dy / dist;

            const laneStartX = source.x + ndx * (source.radius + 5);
            const laneStartY = source.y + ndy * (source.radius + 5);
            const laneEndX = target.x - ndx * (target.radius + 5);
            const laneEndY = target.y - ndy * (target.radius + 5);

            // Tick-synchronized timing: all ships arrive at half-tick regardless of distance
            const halfTick = activeGameStore.effectiveTickMs / 2;
            const departFraction = GAME_CONFIG.DEPART_FRACTION ?? 0.3;
            const departDuration = halfTick * departFraction;
            const travelDuration = halfTick * (1 - departFraction);
            const jitterMax = GAME_CONFIG.DEPART_JITTER_MS ?? 80;
            const laneOffsetPx = GAME_CONFIG.LANE_OFFSET_PX ?? 8;

            const shipsToMove = Math.min(count, ships.length);

            // === Departure selection based on DEPART_MODE ===
            const mode = GAME_CONFIG.DEPART_MODE || "nearside";
            let departingShips: typeof ships;

            if (mode === "lifo") {
                // LIFO: newest ships depart first (splice from end)
                departingShips = ships.splice(
                    ships.length - shipsToMove,
                    shipsToMove,
                );
            } else if (mode === "fifo") {
                // FIFO: oldest ships depart first (sort by id ascending, take lowest)
                ships.sort((a, b) => a.id - b.id);
                departingShips = ships.splice(0, shipsToMove);
            } else {
                // NEARSIDE: use orbit SLOT positions for dot product, not mid-settle ship.x/y
                ships.forEach((s) => {
                    // Compute where this ship's orbit slot IS (its target position)
                    const slot = getOrbitSlot(
                        s.targetIndex,
                        source.x,
                        source.y,
                        source.radius,
                        0, // static position for scoring
                        Math.atan2(ndy, ndx), // bias toward target
                        GAME_CONFIG.ORBIT_BIAS_STRENGTH ?? 0.6,
                    );
                    // Dot product of slot position relative to star center vs target direction
                    const slotDx = slot.x - source.x;
                    const slotDy = slot.y - source.y;
                    const dot = slotDx * ndx + slotDy * ndy;
                    // Layer weight: outer layers depart first
                    const layerWeight =
                        1 + s.targetIndex / Math.max(1, ships.length);
                    (s as any)._departScore = dot * layerWeight;
                });
                ships.sort(
                    (a, b) => (b as any)._departScore - (a as any)._departScore,
                );
                departingShips = ships.splice(0, shipsToMove);
            }
            // Re-index remaining ships' targetIndex after splice
            for (let j = 0; j < ships.length; j++) {
                ships[j].targetIndex = j;
            }

            for (const ship of departingShips) {
                // Capture departure origin for absolute interpolation
                ship.departFromX = ship.x;
                ship.departFromY = ship.y;
                ship.state = "departing";
                ship.fromStarId = transfer.sourceId;
                ship.toStarId = transfer.targetId;
                ship.departTime =
                    now +
                    Math.random() *
                        Math.min(jitterMax, 300 / Math.max(1, shipsToMove));
                ship.travelDuration = travelDuration;
                ship.departDuration = departDuration;
                ship.laneStartX = laneStartX;
                ship.laneStartY = laneStartY;
                ship.laneEndX = laneEndX;
                ship.laneEndY = laneEndY;
                // Per-ship perpendicular offset for organic variation
                ship.laneOffset = (Math.random() - 0.5) * laneOffsetPx * 2;
                ship.staggerDelay = 0;
                ship.ownerId = transfer.ownerId;
                travelingShips.push(ship);
            }
            visualShips.set(transfer.sourceId, ships);
        }

        // Process CONQUEST events → scatter/retreat animations
        for (const conquest of events.conquests) {
            const conqueredStar = starsById.get(conquest.starId);
            if (!conqueredStar) continue;

            const ships = visualShips.get(conquest.starId) || [];
            if (ships.length === 0) continue;

            // Use explicit scatter data from ConquestEvent
            if (
                conquest.scatterTargetIds &&
                conquest.scatterTargetIds.length > 0
            ) {
                let shipsAnimated = 0;
                for (let t = 0; t < conquest.scatterTargetIds.length; t++) {
                    const targetId = conquest.scatterTargetIds[t];
                    const targetStar = starsById.get(targetId);
                    if (!targetStar) continue;

                    const shipCount = conquest.scatterShipCounts?.[t] ?? 1;
                    const count = Math.min(
                        shipCount,
                        ships.length - shipsAnimated,
                    );

                    for (let i = 0; i < count; i++) {
                        if (shipsAnimated >= ships.length) break;
                        const ship = ships[shipsAnimated];
                        const dx = targetStar.x - conqueredStar.x;
                        const dy = targetStar.y - conqueredStar.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const ndx = dx / dist;
                        const ndy = dy / dist;

                        ship.state = "departing";
                        ship.departFromX = ship.x;
                        ship.departFromY = ship.y;
                        ship.fromStarId = conquest.starId;
                        ship.toStarId = targetId;
                        ship.departTime =
                            now +
                            Math.random() *
                                (GAME_CONFIG.DEPART_JITTER_MS ?? 60);
                        // Scatter uses tick-synced timing (urgent — faster depart)
                        const scatterHalfTick =
                            activeGameStore.effectiveTickMs / 2;
                        const scatterDepartFrac =
                            (GAME_CONFIG.DEPART_FRACTION ?? 0.3) * 0.5;
                        ship.departDuration =
                            scatterHalfTick * scatterDepartFrac;
                        ship.travelDuration =
                            scatterHalfTick * (1 - scatterDepartFrac);
                        ship.laneStartX =
                            conqueredStar.x + ndx * (conqueredStar.radius + 5);
                        ship.laneStartY =
                            conqueredStar.y + ndy * (conqueredStar.radius + 5);
                        ship.laneEndX =
                            targetStar.x - ndx * (targetStar.radius + 5);
                        ship.laneEndY =
                            targetStar.y - ndy * (targetStar.radius + 5);
                        ship.laneOffset =
                            (Math.random() - 0.5) *
                            (GAME_CONFIG.LANE_OFFSET_PX ?? 8) *
                            2;
                        ship.staggerDelay = 0;
                        ship.ownerId = conquest.previousOwner;
                        travelingShips.push(ship);
                        shipsAnimated++;
                    }
                }
                ships.splice(0, shipsAnimated);
                // Captured ships stay — update their owner color
                for (const s of ships) s.ownerId = conquest.newOwner;
                visualShips.set(conquest.starId, ships);
            } else if (conquest.retreatTargetId) {
                // Single retreat target
                const retreatStar = starsById.get(conquest.retreatTargetId);
                if (retreatStar) {
                    const escapeCount = Math.min(
                        Math.floor(conquest.shipsEscaped),
                        ships.length,
                    );
                    for (let i = 0; i < escapeCount; i++) {
                        const ship = ships.pop()!;
                        const dx = retreatStar.x - conqueredStar.x;
                        const dy = retreatStar.y - conqueredStar.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const ndx = dx / dist;
                        const ndy = dy / dist;

                        ship.state = "departing";
                        ship.departFromX = ship.x;
                        ship.departFromY = ship.y;
                        ship.fromStarId = conquest.starId;
                        ship.toStarId = conquest.retreatTargetId!;
                        ship.departTime =
                            now +
                            Math.random() *
                                (GAME_CONFIG.DEPART_JITTER_MS ?? 60);
                        // Retreat uses tick-synced timing (urgent — faster depart)
                        const retreatHalfTick =
                            activeGameStore.effectiveTickMs / 2;
                        const retreatDepartFrac =
                            (GAME_CONFIG.DEPART_FRACTION ?? 0.3) * 0.5;
                        ship.departDuration =
                            retreatHalfTick * retreatDepartFrac;
                        ship.travelDuration =
                            retreatHalfTick * (1 - retreatDepartFrac);
                        ship.laneStartX =
                            conqueredStar.x + ndx * (conqueredStar.radius + 5);
                        ship.laneStartY =
                            conqueredStar.y + ndy * (conqueredStar.radius + 5);
                        ship.laneEndX =
                            retreatStar.x - ndx * (retreatStar.radius + 5);
                        ship.laneEndY =
                            retreatStar.y - ndy * (retreatStar.radius + 5);
                        ship.laneOffset =
                            (Math.random() - 0.5) *
                            (GAME_CONFIG.LANE_OFFSET_PX ?? 8) *
                            2;
                        ship.staggerDelay = 0;
                        ship.ownerId = conquest.previousOwner;
                        travelingShips.push(ship);
                    }
                    // Captured ships stay — update their owner color
                    for (const s of ships) s.ownerId = conquest.newOwner;
                    visualShips.set(conquest.starId, ships);
                }
            } else {
                // No escape — keep captured ships, update their owner color
                const capturedCount = Math.floor(conquest.shipsCaptured);
                // Keep up to capturedCount ships, remove the rest
                if (ships.length > capturedCount) {
                    ships.length = capturedCount;
                }
                for (const s of ships) s.ownerId = conquest.newOwner;
                visualShips.set(conquest.starId, ships);
            }

            // ── ATTACKER SHIPS: Strategy-dispatched conquest transfer ──
            if (conquest.attackerStarId && conquest.shipsTransferred > 0) {
                const attackerStar = starsById.get(conquest.attackerStarId);
                if (attackerStar) {
                    const atkShips =
                        visualShips.get(conquest.attackerStarId) || [];
                    const transferCount = Math.min(
                        conquest.shipsTransferred,
                        atkShips.length,
                    );

                    if (transferCount > 0) {
                        const result = executeConquestTransfer({
                            ships: atkShips,
                            attackerStar,
                            conqueredStar,
                            transferCount,
                            newOwner: conquest.newOwner,
                            now: performance.now(),
                            effectiveTickMs: activeGameStore.effectiveTickMs,
                            attackerStarId: conquest.attackerStarId,
                            conqueredStarId: conquest.starId,
                        });

                        // Departing ships enter the travel pipeline (travel mode)
                        for (const ship of result.departing) {
                            travelingShips.push(ship);
                        }

                        // Arriving ships go directly to conquered star orbit (immediate/surge mode)
                        if (result.arriving.length > 0) {
                            const destShips =
                                visualShips.get(conquest.starId) || [];
                            for (const ship of result.arriving) {
                                ship.targetIndex = destShips.length;
                                destShips.push(ship);
                            }
                            visualShips.set(conquest.starId, destShips);
                        }

                        // Update attacker star with remaining ships
                        visualShips.set(
                            conquest.attackerStarId,
                            result.remaining,
                        );
                    }
                }
            }

            // ── AUTO-SLOWMO: Temporarily slow animations for conquest tuning ──
            if (GAME_CONFIG.CONQUEST_SLOWMO_ENABLED) {
                const originalSpeed = GAME_CONFIG.ANIMATION_SPEED_MS;
                GAME_CONFIG.ANIMATION_SPEED_MS =
                    originalSpeed * GAME_CONFIG.CONQUEST_SLOWMO_FACTOR;
                setTimeout(() => {
                    GAME_CONFIG.ANIMATION_SPEED_MS = originalSpeed;
                }, GAME_CONFIG.CONQUEST_SLOWMO_DURATION_MS);
            }
        }
    }

    /**
     * Render in-flight ships through their lifecycle phases.
     * Called from renderShips after orbiting ships.
     */
    function renderTravelingShips(
        stars: StarState[],
        starsById: Map<string, StarState>,
    ) {
        if (!shipParticleContainer) return;

        const now = performance.now();
        // starsById passed in from renderShips (no allocation needed)

        // When paused, shift all departTimes forward so ships freeze in place
        const isPaused = activeGameStore.isPaused;
        if (isPaused) {
            const dt = now - (renderTravelingShips as any)._lastNow;
            if (dt > 0) {
                for (const ship of travelingShips) {
                    ship.departTime += dt;
                }
            }
        }
        (renderTravelingShips as any)._lastNow = now;

        // Process each traveling ship
        const stillTraveling: VisualShipState[] = [];

        // When ORB_TRAVEL is on, we track groups of traveling ships by route
        // key = `${fromStarId}->${toStarId}`, value = { ships, avgX, avgY, color, count }
        const orbGroups: Map<
            string,
            {
                ships: VisualShipState[];
                sumX: number;
                sumY: number;
                count: number;
                color: number;
                ownerId: string;
            }
        > = new Map();

        for (const ship of travelingShips) {
            const elapsed = now - ship.departTime;

            // Skip ships that haven't started yet (stagger delay)
            if (elapsed < 0) {
                stillTraveling.push(ship);
                // Still draw at current position (orbit slot)
                const color = getPlayerColor(ship.ownerId);
                drawShip(ship.x, ship.y, color, ship.scale, ship.alpha, false);
                continue;
            }

            const color = getPlayerColor(ship.ownerId);

            if (ship.state === "departing") {
                // Phase 1: Ease out of orbit toward lane start
                // Absolute interpolation from saved departure origin
                // Use ship's per-event departDuration (tick-synced)
                const departProgress = Math.min(
                    1,
                    elapsed /
                        (ship.departDuration || SHIP_ANIM.DEPART_DURATION),
                );
                // easeInOutQuad: smooth departure (soft peel from orbit, eases into lane)
                const eased =
                    departProgress < 0.5
                        ? 2 * departProgress * departProgress
                        : 1 - Math.pow(-2 * departProgress + 2, 2) / 2;

                ship.x =
                    ship.departFromX +
                    (ship.laneStartX - ship.departFromX) * eased;
                ship.y =
                    ship.departFromY +
                    (ship.laneStartY - ship.departFromY) * eased;
                ship.scale = 0.8 + 0.1 * eased; // Grow slightly as departing
                ship.alpha = 1; // Always visible

                if (departProgress >= 1) {
                    ship.x = ship.laneStartX;
                    ship.y = ship.laneStartY;
                    ship.state = "traveling";
                    ship.departTime = now; // Reset timer for travel phase
                }

                // In ORB mode, departing ships converge to lane start — draw individually but fade out near end
                if (GAME_CONFIG.ORB_TRAVEL && departProgress > 0.7) {
                    // Fade into the orb as departure nears completion
                    const fadeToOrb = (departProgress - 0.7) / 0.3;
                    ship.alpha = 1 - fadeToOrb; // Fully invisible at departProgress=1
                }

                // In ORB mode, skip drawing ships that have fully faded
                if (GAME_CONFIG.ORB_TRAVEL && ship.alpha <= 0.01) {
                    stillTraveling.push(ship);
                } else {
                    drawShip(
                        ship.x,
                        ship.y,
                        color,
                        ship.scale,
                        ship.alpha,
                        false,
                    );
                    stillTraveling.push(ship);
                }
            } else if (ship.state === "traveling") {
                // Phase 2: Stream along the lane with magnetic pull toward destination
                const travelProgress = Math.min(
                    1,
                    elapsed / ship.travelDuration,
                );

                // easeInCubic: magnetic pull toward destination
                const eased = travelProgress * travelProgress * travelProgress;

                // Base lane position
                const baseX =
                    ship.laneStartX + (ship.laneEndX - ship.laneStartX) * eased;
                const baseY =
                    ship.laneStartY + (ship.laneEndY - ship.laneStartY) * eased;

                // Perpendicular offset for organic variation (fades at endpoints)
                const laneNdx = ship.laneEndX - ship.laneStartX;
                const laneNdy = ship.laneEndY - ship.laneStartY;
                const laneDist =
                    Math.sqrt(laneNdx * laneNdx + laneNdy * laneNdy) || 1;
                const perpX = -laneNdy / laneDist; // perpendicular
                const perpY = laneNdx / laneDist;
                // Offset fades near endpoints for smooth entry/exit
                const edgeFade = Math.min(
                    travelProgress * 4,
                    (1 - travelProgress) * 4,
                    1,
                );

                // Sinusoidal wobble: 2-3 oscillations along path, per-ship phase
                const wobbleAmp = GAME_CONFIG.WOBBLE_AMP ?? 12;
                const wobbleFreq = 2.5 + (ship.id % 7) * 0.3; // 2.5-4.6 waves
                const wobblePhase = ((ship.id % 13) / 13) * Math.PI * 2;
                const wobble =
                    wobbleAmp > 0
                        ? Math.sin(
                              travelProgress * wobbleFreq * Math.PI * 2 +
                                  wobblePhase,
                          ) *
                          wobbleAmp *
                          edgeFade
                        : 0;

                ship.x = baseX + perpX * (ship.laneOffset * edgeFade + wobble);
                ship.y = baseY + perpY * (ship.laneOffset * edgeFade + wobble);

                // Ships stay fully visible during travel — no fade pulse
                ship.alpha = 1;
                ship.scale = 0.9;

                if (travelProgress >= 1) {
                    // Arrive at destination — position at fragmentation boundary
                    // (outside the outermost orbit ring, on the nearside from source)
                    const destStar = starsById.get(ship.toStarId!);
                    if (destStar) {
                        const destShips = visualShips.get(destStar.id) || [];
                        // Fragmentation boundary: just outside outermost occupied orbit ring
                        const outerR = getOuterOrbitRadius(
                            destStar.radius,
                            destShips.length + 1,
                        );
                        const fragBoundary = outerR + 8; // 8px outside outermost ring
                        // Direction from source to dest (arrival angle)
                        const arrDx = ship.laneEndX - destStar.x;
                        const arrDy = ship.laneEndY - destStar.y;
                        const arrDist =
                            Math.sqrt(arrDx * arrDx + arrDy * arrDy) || 1;
                        // Place ship at fragmentation boundary on the arrival side
                        ship.x = destStar.x + (arrDx / arrDist) * fragBoundary;
                        ship.y = destStar.y + (arrDy / arrDist) * fragBoundary;

                        ship.state = "orbiting";
                        ship.fromStarId = null;
                        ship.toStarId = null;
                        ship.arriveStarId = null;
                        ship.alpha = 0.5;
                        ship.scale = 0.3;
                        ship.targetIndex = destShips.length;
                        // Set settle fields for arc interpolation
                        const arrAngle = Math.atan2(
                            ship.y - destStar.y,
                            ship.x - destStar.x,
                        );
                        const arrR = Math.sqrt(
                            (ship.x - destStar.x) ** 2 +
                                (ship.y - destStar.y) ** 2,
                        );
                        // Stagger settle across tick based on ARRIVAL_SPREAD
                        const arrivalSpread = GAME_CONFIG.ARRIVAL_SPREAD ?? 1.0;
                        const tickMs = activeGameStore.effectiveTickMs || 1000;
                        const staggerWindow = tickMs * arrivalSpread;
                        const staggerOffset =
                            destShips.length > 0
                                ? (destShips.length /
                                      Math.max(1, destShips.length + 1)) *
                                  staggerWindow
                                : 0;
                        ship.settleStartTime =
                            performance.now() + staggerOffset;
                        ship.settleStartAngle = arrAngle;
                        ship.settleStartRadius = arrR;
                        destShips.push(ship);
                        visualShips.set(destStar.id, destShips);
                    } else {
                        ship.x = ship.laneEndX;
                        ship.y = ship.laneEndY;
                    }
                    // Don't push to stillTraveling — ship is now managed by renderShips
                } else {
                    if (GAME_CONFIG.ORB_TRAVEL) {
                        // Group into orbs — don't draw individually
                        const routeKey = `${ship.fromStarId}->${ship.toStarId}`;
                        let group = orbGroups.get(routeKey);
                        if (!group) {
                            group = {
                                ships: [],
                                sumX: 0,
                                sumY: 0,
                                count: 0,
                                color,
                                ownerId: ship.ownerId,
                            };
                            orbGroups.set(routeKey, group);
                        }
                        group.ships.push(ship);
                        group.sumX += ship.x;
                        group.sumY += ship.y;
                        group.count++;
                    } else {
                        drawShip(
                            ship.x,
                            ship.y,
                            color,
                            ship.scale,
                            ship.alpha,
                            false,
                        );
                    }
                    stillTraveling.push(ship);
                }
            }
        }

        // Draw orbs for grouped traveling ships
        if (GAME_CONFIG.ORB_TRAVEL && orbGroups.size > 0 && orbGraphics) {
            const G = GAME_CONFIG; // shorthand for readability
            for (const [, group] of orbGroups) {
                const cx = group.sumX / group.count;
                const cy = group.sumY / group.count;
                const shipCount = group.count;

                // Orb radius scales with sqrt of ship count for visual balance
                const baseRadius =
                    G.ORB_BASE_RADIUS +
                    Math.sqrt(shipCount) * G.ORB_RADIUS_SCALE;

                // Intensity scales with ship count (brighter = more ships)
                const intensity =
                    Math.min(1.0, 0.4 + Math.sqrt(shipCount) * 0.06) *
                    G.ORB_GLOW_MULT;

                // Draw outer glow (large, faint)
                const glowRadius = baseRadius * G.ORB_OUTER_SCALE;
                orbGraphics.circle(cx, cy, glowRadius);
                orbGraphics.fill({
                    color: group.color,
                    alpha: intensity * G.ORB_OUTER_ALPHA,
                });

                // Draw middle glow
                const midRadius = baseRadius * G.ORB_MID_SCALE;
                orbGraphics.circle(cx, cy, midRadius);
                orbGraphics.fill({
                    color: group.color,
                    alpha: intensity * G.ORB_MID_ALPHA,
                });

                // Draw inner orb (bright core)
                orbGraphics.circle(cx, cy, baseRadius);
                orbGraphics.fill({
                    color: 0xffffff,
                    alpha: intensity * G.ORB_CORE_ALPHA,
                });

                // Draw orb body (player colored)
                const coreRadius = baseRadius * G.ORB_CORE_SCALE;
                orbGraphics.circle(cx, cy, coreRadius);
                orbGraphics.fill({
                    color: group.color,
                    alpha: intensity * 0.9,
                });

                // Bright center dot
                const dotRadius = Math.max(1.5, baseRadius * 0.3);
                orbGraphics.circle(cx, cy, dotRadius);
                orbGraphics.fill({
                    color: 0xffffff,
                    alpha: Math.min(1, intensity * G.ORB_CENTER_ALPHA),
                });
            }
        }

        travelingShips = stillTraveling;
    }

    /**
     * Cubic ease in-out for smooth animation
     */
    function easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function renderShips(
        stars: StarState[],
        tickProgress: number,
        starsById: Map<string, StarState>,
    ) {
        if (!shipParticleContainer) return;

        stars.forEach((star) => {
            const color = getPlayerColor(star.ownerId);

            // 1. Manage Active Ships State
            let ships = visualShips.get(star.id) || [];
            // Count ships in-flight TO this star — don't pre-spawn at center
            let inFlightToStar = 0;
            for (const ts of travelingShips) {
                if (ts.toStarId === star.id) inFlightToStar++;
            }
            const actualCount = Math.max(0, star.activeShips - inFlightToStar);
            const maxVisual = GAME_CONFIG.MAX_VISUAL_SHIPS ?? 100;
            const targetCount = Math.min(actualCount, maxVisual);
            // Density multiplier: how many real ships each visual ship represents
            const starMultiplier =
                targetCount > 0 ? actualCount / targetCount : 1;

            // SPWAN: If we need more ships, add them
            if (ships.length < targetCount) {
                const diff = targetCount - ships.length;
                for (let i = 0; i < diff; i++) {
                    const spawnIndex = ships.length;
                    // Spawn at orbit-edge angle (random position on correct orbit ring)
                    const spawnAngle = Math.random() * Math.PI * 2;
                    const spawnR = star.radius + 8; // Just outside star surface
                    const now = performance.now();
                    ships.push({
                        id: nextShipId++,
                        x: star.x + Math.cos(spawnAngle) * spawnR,
                        y: star.y + Math.sin(spawnAngle) * spawnR,
                        vx: 0,
                        vy: 0,
                        targetIndex: spawnIndex,
                        scale: 0.3,
                        alpha: 0.5,
                        spawnTime: now,
                        state: "orbiting" as const,
                        fromStarId: null,
                        toStarId: null,
                        departTime: 0,
                        travelDuration: 0,
                        departDuration: 0,
                        laneStartX: 0,
                        laneStartY: 0,
                        laneEndX: 0,
                        laneEndY: 0,
                        departFromX: 0,
                        departFromY: 0,
                        arriveToX: 0,
                        arriveToY: 0,
                        arriveStarId: null,
                        laneOffset: 0,
                        staggerDelay: 0,
                        ownerId: star.ownerId,
                        // Spawned ships settle immediately (no stagger)
                        settleStartTime: now,
                        settleStartAngle: spawnAngle,
                        settleStartRadius: spawnR,
                    });
                }
            }
            // DESPAWN: If we have too many, truncate
            else if (ships.length > targetCount) {
                ships.length = targetCount;
            }

            visualShips.set(star.id, ships);

            // 2. Physics & Render Loop for Active Ships
            if (ships.length > 0) {
                // Determine behavior mode
                const hasTarget = star.targetId !== null;
                const targetStar = hasTarget
                    ? stars.find((s) => s.id === star.targetId)
                    : null;
                const isTransfer =
                    hasTarget &&
                    targetStar &&
                    targetStar.ownerId === star.ownerId;
                const isAttack =
                    hasTarget &&
                    targetStar &&
                    targetStar.ownerId !== star.ownerId;

                // Calculate direction to target (for facing edge / transfer flow)
                let dirX = 0,
                    dirY = 0;
                let dist = 1;
                if (targetStar) {
                    dirX = targetStar.x - star.x;
                    dirY = targetStar.y - star.y;
                    dist = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
                    dirX /= dist;
                    dirY /= dist;
                }

                // Perpendicular for path variation
                const perpX = -dirY;
                const perpY = dirX;

                ships.forEach((ship, i) => {
                    // When targetIndex changes, reset settle from current position
                    if (ship.targetIndex !== i) {
                        ship.settleStartTime = performance.now();
                        ship.settleStartAngle = Math.atan2(
                            ship.y - star.y,
                            ship.x - star.x,
                        );
                        ship.settleStartRadius = Math.sqrt(
                            (ship.x - star.x) ** 2 + (ship.y - star.y) ** 2,
                        );
                    }
                    ship.targetIndex = i;

                    // Per-ship phase offset for organic variation
                    const shipPhase = (ship.id % 17) / 17; // 0-1 unique per ship

                    let targetX: number, targetY: number;

                    // === All ships stay in ORBIT, with optional surge offset ===
                    const orbitTime = GAME_CONFIG.STATIC_ORBITS
                        ? 0
                        : animationTime;
                    // Calculate orbit bias — ships face the target direction
                    const biasAngle = targetStar
                        ? Math.atan2(
                              targetStar.y - star.y,
                              targetStar.x - star.x,
                          )
                        : undefined;
                    // Calculate orbit bias strength — supports oscillation mode
                    let biasStrength: number;
                    if (!targetStar) {
                        biasStrength = 0;
                    } else if (GAME_CONFIG.ORBIT_BIAS_OSCILLATE) {
                        // Oscillate between min and max using sine wave relative to time
                        const freq = GAME_CONFIG.ORBIT_BIAS_FREQ ?? 1.0;
                        const effectiveTick = activeGameStore.effectiveTickMs;
                        const phase = Math.sin(
                            (animationTime / effectiveTick) *
                                freq *
                                Math.PI *
                                2,
                        );
                        const min = GAME_CONFIG.ORBIT_BIAS_MIN ?? 0;
                        const max = GAME_CONFIG.ORBIT_BIAS_MAX ?? 1;
                        biasStrength = min + (max - min) * (phase * 0.5 + 0.5);
                    } else {
                        biasStrength = GAME_CONFIG.ORBIT_BIAS_STRENGTH ?? 0.6;
                    }
                    const slot = getOrbitSlot(
                        ship.targetIndex,
                        star.x,
                        star.y,
                        star.radius,
                        orbitTime,
                        biasAngle,
                        biasStrength,
                    );
                    targetX = slot.x;
                    const shipMultiplier = slot.multiplier * starMultiplier;
                    targetY = slot.y;

                    // ATTACK MODE: Egg-shaped pulse - ships facing target surge forward
                    // Ships at back stay at orbit radius (don't cross planetary valence)
                    // TICK-SYNCED: only surge when CombatEvent confirms active combat
                    if (isAttack && targetStar && starsInCombat.has(star.id)) {
                        const gamePaused = activeGameStore.isPaused;

                        // Direction lock: if target changed mid-surge, keep old direction
                        // until tickProgress returns near 0 (surge cycle complete)
                        let useDirX = dirX;
                        let useDirY = dirY;
                        const lockedDir = surgeLockedDir.get(star.id);

                        if (lockedDir && lockedDir.targetId !== star.targetId) {
                            // Target changed — use locked direction until cycle completes
                            if (tickProgress < 0.1) {
                                // Cycle complete (near start of new tick) — unlock and use new direction
                                surgeLockedDir.set(star.id, {
                                    x: dirX,
                                    y: dirY,
                                    targetId: star.targetId!,
                                });
                            } else {
                                // Mid-cycle — keep old direction
                                useDirX = lockedDir.x;
                                useDirY = lockedDir.y;
                            }
                        } else if (!lockedDir) {
                            // First surge for this star — lock current direction
                            surgeLockedDir.set(star.id, {
                                x: dirX,
                                y: dirY,
                                targetId: star.targetId!,
                            });
                        }

                        // Initialize ramp for newly attacking stars
                        if (!attackRampProgress.has(star.id)) {
                            attackRampProgress.set(star.id, 0);
                        }

                        // Advance ramp only when unpaused (delta-based, pause-safe)
                        const rampDuration =
                            GAME_CONFIG.ATTACK_SURGE_RAMP_MS ?? 300;
                        let rampFactor = 1;
                        if (rampDuration > 0) {
                            let rampVal = attackRampProgress.get(star.id)!;
                            if (!gamePaused && lastSurgeFrameTime > 0) {
                                const frameDelta =
                                    performance.now() - lastSurgeFrameTime;
                                rampVal = Math.min(
                                    1,
                                    rampVal + frameDelta / rampDuration,
                                );
                                attackRampProgress.set(star.id, rampVal);
                            }
                            // easeOutCubic for natural acceleration
                            rampFactor = 1 - Math.pow(1 - rampVal, 3);
                        }

                        // Surge displacement: freezes naturally during pause
                        // (tickProgress frozen by engine, ramp doesn't advance)
                        const shipDx = slot.x - star.x;
                        const shipDy = slot.y - star.y;
                        const shipDist =
                            Math.sqrt(shipDx * shipDx + shipDy * shipDy) || 1;

                        const shipNormX = shipDx / shipDist;
                        const shipNormY = shipDy / shipDist;

                        // Dot product with LOCKED target direction
                        const facingFactor =
                            shipNormX * useDirX + shipNormY * useDirY;

                        // Only surge ships facing target (facingFactor > 0)
                        const surgeFactor = Math.max(0, facingFactor) ** 1.5;

                        // Surge pulse: shape power controls curve (1=sine, >1=sharper peak, <1=flatter)
                        const rawPulse = Math.sin(tickProgress * Math.PI);
                        const surgeShape = GAME_CONFIG.ATTACK_SURGE_SHAPE ?? 1;
                        const surgePulse =
                            surgeShape === 1
                                ? rawPulse
                                : Math.pow(rawPulse, surgeShape);
                        const phaseAmplitude =
                            0.75 + 0.25 * Math.sin(shipPhase * Math.PI * 2);

                        // Subtle surge: max displacement toward target
                        let surgeMax =
                            star.radius *
                            (GAME_CONFIG.ATTACK_SURGE_MULT ?? 0.4);

                        // Proportional surge: scale by force disparity
                        if (
                            GAME_CONFIG.ATTACK_SURGE_PROPORTIONAL &&
                            targetStar
                        ) {
                            const myShips = star.activeShips || 1;
                            const theirShips = targetStar.activeShips || 1;
                            const ratio = myShips / theirShips;
                            const cofactor =
                                GAME_CONFIG.ATTACK_SURGE_FORCE_COFACTOR ?? 0.5;
                            const forceBoost =
                                1 + Math.log2(Math.max(0.25, ratio)) * cofactor;
                            surgeMax *= Math.max(0.2, forceBoost);
                        }

                        // Apply: pulse × amplitude-phase × max × facing × ramp
                        targetX +=
                            useDirX *
                            surgePulse *
                            phaseAmplitude *
                            surgeMax *
                            surgeFactor *
                            rampFactor;
                        targetY +=
                            useDirY *
                            surgePulse *
                            phaseAmplitude *
                            surgeMax *
                            surgeFactor *
                            rampFactor;
                    } else {
                        // Not in active combat — clear ramp and direction lock
                        attackRampProgress.delete(star.id);
                        surgeLockedDir.delete(star.id);
                    }

                    // TRANSFER MODE: For now, same as idle (ships stay until fleet system)
                    // Future: Separate fleet visuals will show traveling ships

                    // Time-based polar arc interpolation (never crosses star)
                    const now = performance.now();
                    const elapsed = now - ship.settleStartTime;
                    const settleDur = (ship as any).conquestSettle
                        ? (GAME_CONFIG.CONQUEST_SETTLE_MS ?? 500)
                        : GAME_CONFIG.SETTLE_DURATION_MS || 150;
                    const t = Math.max(0, Math.min(1, elapsed / settleDur));
                    // easeOutCubic: fast start, smooth deceleration
                    const ease = 1 - Math.pow(1 - t, 3);

                    if (t < 1) {
                        // Convert target to polar relative to star center
                        const targetAngle = Math.atan2(
                            targetY - star.y,
                            targetX - star.x,
                        );
                        const targetRadius = Math.sqrt(
                            (targetX - star.x) ** 2 + (targetY - star.y) ** 2,
                        );

                        // Interpolate radius
                        const curRadius =
                            ship.settleStartRadius +
                            (targetRadius - ship.settleStartRadius) * ease;

                        // Interpolate angle (shortest arc — never through center)
                        let angleDelta = targetAngle - ship.settleStartAngle;
                        // Normalize to [-PI, PI] for shortest path
                        while (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
                        while (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;
                        const curAngle =
                            ship.settleStartAngle + angleDelta * ease;

                        ship.x = star.x + Math.cos(curAngle) * curRadius;
                        ship.y = star.y + Math.sin(curAngle) * curRadius;
                        ship.scale = 0.3 + 0.5 * ease; // 0.3 -> 0.8
                        ship.alpha = 0.5 + 0.5 * ease; // 0.5 -> 1.0
                    } else {
                        // Fully settled — snap to exact target
                        ship.x = targetX;
                        ship.y = targetY;
                        ship.scale = 0.8;
                        ship.alpha = 1;
                    }

                    drawShip(
                        ship.x,
                        ship.y,
                        color,
                        ship.scale,
                        ship.alpha,
                        false,
                        shipMultiplier,
                    );
                });
            }

            // 3. Render Damaged Ships? (Similar loop, maybe static offset)
            let damagedShips = visualDamagedShips.get(star.id) || [];
            const damageCount = star.damagedShips;

            // Sync count
            if (damagedShips.length < damageCount) {
                const diff = damageCount - damagedShips.length;
                for (let i = 0; i < diff; i++) {
                    const spawnAngle = Math.random() * Math.PI * 2;
                    const spawnR = star.radius + 6;
                    const now = performance.now();
                    damagedShips.push({
                        id: nextShipId++,
                        x: star.x + Math.cos(spawnAngle) * spawnR,
                        y: star.y + Math.sin(spawnAngle) * spawnR,
                        vx: 0,
                        vy: 0,
                        targetIndex: i,
                        scale: 0.1,
                        alpha: 0,
                        spawnTime: now,
                        state: "orbiting" as const,
                        fromStarId: null,
                        toStarId: null,
                        departTime: 0,
                        travelDuration: 0,
                        departDuration: 0,
                        laneStartX: 0,
                        laneStartY: 0,
                        laneEndX: 0,
                        laneEndY: 0,
                        departFromX: 0,
                        departFromY: 0,
                        arriveToX: 0,
                        arriveToY: 0,
                        arriveStarId: null,
                        laneOffset: 0,
                        staggerDelay: 0,
                        ownerId: star.ownerId,
                        settleStartTime: now,
                        settleStartAngle: spawnAngle,
                        settleStartRadius: spawnR,
                    });
                }
            } else if (damagedShips.length > damageCount) {
                damagedShips.length = damageCount;
            }
            visualDamagedShips.set(star.id, damagedShips);

            damagedShips.forEach((ship, i) => {
                // Damaged ships float randomly near center
                const damageTime = GAME_CONFIG.STATIC_ORBITS
                    ? 0
                    : animationTime;
                const angle =
                    damageTime * 0.5 +
                    (i * Math.PI * 2) / Math.max(damagedShips.length, 1);
                const radius = 15;
                const tx = star.x + Math.cos(angle) * radius;
                const ty = star.y + Math.sin(angle) * radius;

                ship.x = lerp(ship.x, tx, 0.05);
                ship.y = lerp(ship.y, ty, 0.05);
                ship.scale = lerp(ship.scale, 0.7, 0.1);
                ship.alpha = lerp(ship.alpha, 0.8, 0.1);

                drawShip(ship.x, ship.y, color, ship.scale, ship.alpha, true);
            });
        });

        // Render in-flight ships (departing, traveling, arriving)
        renderTravelingShips(stars, starsById);

        // Update frame timestamp for surge ramp delta (must be AFTER all stars processed)
        lastSurgeFrameTime = performance.now();
    }

    function renderFleets(stars: StarState[], fleets: FleetState[]) {
        if (!shipParticleContainer) return;

        // Progress is globally driven by game tick progress (0 -> 1)
        const progress = activeGameStore.tickProgress;

        fleets.forEach((fleet) => {
            const source = stars.find((s) => s.id === fleet.sourceId);
            const target = stars.find((s) => s.id === fleet.targetId);

            if (!source || !target) return;

            const color = getPlayerColor(fleet.ownerId);

            // Interpolate position
            // Draw cluster of ships
            const count = fleet.shipCount;
            const visualCount = Math.min(count, 5);

            for (let i = 0; i < visualCount; i++) {
                // Add slight spread/trail
                const lag = i * 0.02;
                const localProgress = Math.max(0, Math.min(1, progress - lag));

                const lx = lerp(source.x, target.x, localProgress);
                const ly = lerp(source.y, target.y, localProgress);

                // Add organic jitter
                const jitterX = Math.sin(animationTime * 10 + i) * 5;
                const jitterY = Math.cos(animationTime * 10 + i) * 5;

                drawShip(lx + jitterX, ly + jitterY, color, 1.0, 1.0, false);
            }
        });
    }

    function drawShip(
        x: number,
        y: number,
        color: number,
        scale: number,
        alpha: number,
        isDamaged: boolean,
        multiplier: number = 1,
    ) {
        if (!shipParticleContainer || !shipCircleTexture) return;

        // Apply global ship scale multiplier
        const globalScale = GAME_CONFIG.SHIP_SCALE_MULT ?? 1.0;
        const pixelSize = 3 * scale * globalScale;
        const spriteScale = (pixelSize * 2) / 128;

        // Hue-brighten: increase brightness within the player's own hue (not toward white)
        // This preserves color identity while showing power level
        let finalColor = color;
        if (multiplier > 1) {
            const glowIntensity = GAME_CONFIG.SHIP_GLOW_INTENSITY ?? 0.3;
            const blendAmount = Math.min(
                1.0,
                Math.log2(multiplier) * glowIntensity,
            );
            const r = (color >> 16) & 0xff;
            const g = (color >> 8) & 0xff;
            const b = color & 0xff;
            // Find the dominant channel and boost all proportionally
            const maxC = Math.max(r, g, b, 1);
            const boost = 1 + blendAmount * (255 / maxC - 1);
            const newR = Math.min(255, Math.round(r * boost));
            const newG = Math.min(255, Math.round(g * boost));
            const newB = Math.min(255, Math.round(b * boost));
            finalColor = (newR << 16) | (newG << 8) | newB;
        }

        // === Outline: backing circle (same texture, slightly larger, raw player color) ===
        if (GAME_CONFIG.SHIP_OUTLINE_ON !== false) {
            const outlinePx = GAME_CONFIG.SHIP_OUTLINE_PX ?? 1.0;
            const outlineScale = ((pixelSize + outlinePx) * 2) / 128;
            let outlineP: PIXI.Particle;
            if (shipParticleIndex < shipParticlePool.length) {
                outlineP = shipParticlePool[shipParticleIndex];
            } else {
                outlineP = new PIXI.Particle({
                    texture: shipCircleTexture,
                    anchorX: 0.5,
                    anchorY: 0.5,
                });
                shipParticlePool.push(outlineP);
                shipParticleContainer.addParticle(outlineP);
            }
            outlineP.x = x;
            outlineP.y = y;
            outlineP.scaleX = outlineScale;
            outlineP.scaleY = outlineScale;
            outlineP.tint = color; // Always raw player color
            outlineP.alpha = alpha;
            shipParticleIndex++;
        }

        // === Fill circle (may be hue-brightened for multiplier) ===
        let particle: PIXI.Particle;
        if (shipParticleIndex < shipParticlePool.length) {
            particle = shipParticlePool[shipParticleIndex];
        } else {
            particle = new PIXI.Particle({
                texture: shipCircleTexture,
                anchorX: 0.5,
                anchorY: 0.5,
            });
            shipParticlePool.push(particle);
            shipParticleContainer.addParticle(particle);
        }
        particle.x = x;
        particle.y = y;
        particle.scaleX = spriteScale;
        particle.scaleY = spriteScale;
        particle.tint = finalColor;
        particle.alpha = alpha;
        shipParticleIndex++;

        // Damaged ships: slightly larger dark backing circle
        if (isDamaged) {
            const dmgScale = ((pixelSize + 2) * 2) / 128;
            let dmgP: PIXI.Particle;
            if (shipParticleIndex < shipParticlePool.length) {
                dmgP = shipParticlePool[shipParticleIndex];
            } else {
                dmgP = new PIXI.Particle({
                    texture: shipCircleTexture,
                    anchorX: 0.5,
                    anchorY: 0.5,
                });
                shipParticlePool.push(dmgP);
                shipParticleContainer.addParticle(dmgP);
            }
            dmgP.x = x;
            dmgP.y = y;
            dmgP.scaleX = dmgScale;
            dmgP.scaleY = dmgScale;
            dmgP.tint = 0x222222;
            dmgP.alpha = 0.5;
            shipParticleIndex++;
        }
    }

    // Helper: Draw a polygon shape for stacked ships
    function drawPolygon(
        g: PIXI.Graphics,
        x: number,
        y: number,
        radius: number,
        sides: number,
        rotation: number,
    ) {
        g.moveTo(
            x + Math.cos(rotation - Math.PI / 2) * radius,
            y + Math.sin(rotation - Math.PI / 2) * radius,
        );
        for (let i = 1; i <= sides; i++) {
            const angle = rotation + (i / sides) * Math.PI * 2 - Math.PI / 2;
            g.lineTo(
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius,
            );
        }
        g.closePath();
    }

    // Draw hexagonal border around a point
    // ============================================================================
    // Geometric Type Icons
    // ============================================================================

    // Star type → polygon sides: green=3 (attack), red=4 (defense),
    // yellow=5 (prod), purple=6 (repair), blue=7 (move), grey=0 (circle)
    const TYPE_SIDES: Record<string, number> = {
        green: 3,
        red: 4,
        yellow: 5,
        purple: 6,
        blue: 7,
        grey: 0,
    };

    function drawTypeIcon(
        g: PIXI.Graphics,
        cx: number,
        cy: number,
        size: number,
        starType: string,
        alpha: number,
        color: number,
    ) {
        const sides = TYPE_SIDES[starType] ?? 0;
        if (sides === 0) {
            // Grey = circle (default)
            g.circle(cx, cy, size);
            g.fill({ color: 0xffffff, alpha });
            return;
        }

        // Draw regular polygon
        const angleStep = (2 * Math.PI) / sides;
        const startAngle = -Math.PI / 2; // Point up
        g.moveTo(
            cx + size * Math.cos(startAngle),
            cy + size * Math.sin(startAngle),
        );
        for (let i = 1; i <= sides; i++) {
            const angle = startAngle + angleStep * i;
            g.lineTo(cx + size * Math.cos(angle), cy + size * Math.sin(angle));
        }
        g.fill({ color, alpha });
        g.stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.6 });
    }

    // ============================================================================
    // Hex Border (active star indicator)
    // ============================================================================

    function drawHexBorder(
        graphics: PIXI.Graphics,
        cx: number,
        cy: number,
        radius: number,
        color: number,
        lineWidth: number,
    ) {
        const a = (2 * Math.PI) / 6;
        // FIXED: Static border instead of distracting pulse (was out of sync with tick rate)

        graphics.moveTo(cx + radius * Math.cos(0), cy + radius * Math.sin(0));
        for (let i = 1; i <= 6; i++) {
            graphics.lineTo(
                cx + radius * Math.cos(a * i),
                cy + radius * Math.sin(a * i),
            );
        }
        graphics.stroke({ color, width: lineWidth, alpha: 0.9 });
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

        if (stars.length === 0) return null;

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
        return nearest;
    }

    function handlePointerDown(event: PointerEvent) {
        if (!app) return;

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

            // DO NOT set activeStarId here - wait for Click logic regarding selection.
            // But we can highlight drag source.
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
            // Case 1: Clicked same star -> TOGGLE (deselect)
            if (activeStarId === targetStar.id) {
                activeStarId = null;
                log.state(
                    "GameCanvas",
                    `Star ${targetStar.id} deselected (toggle)`,
                );
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
                            log.success(
                                "GameCanvas",
                                `Deferred order: ${activeStarId} → ${targetStar.id}`,
                            );
                        }
                    }
                }

                // Always select the new star (whether order was issued or not)
                activeStarId = targetStar.id;
            }
            // Case 3: No prior selection -> just select
            else {
                activeStarId = targetStar.id;
                log.state("GameCanvas", `Star ${targetStar.id} selected`);
            }
        } else if (!movedSignificantly && !targetStar) {
            clearSelection();
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
    {currentFps} FPS · {totalVisualShips.toLocaleString()} ships · {shipParticleIndex}
    sprites
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
