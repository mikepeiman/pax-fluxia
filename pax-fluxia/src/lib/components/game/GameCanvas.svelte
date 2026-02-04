<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import * as PIXI from "pixi.js";
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import { log } from "$lib/utils/logger";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        getOrbitSlot,
        getFleetPositions,
        lerp,
        type VisualShipState,
    } from "$lib/utils/render.utils";
    import { distance } from "$lib/utils/math.utils";
    import type {
        StarState,
        StarConnection,
        FleetState,
        StarId,
    } from "$lib/types/game.types";
    import { Star } from "$lib/engine/Star";
    import { audio } from "$lib/audio/AudioManager";

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
    let shipGraphics: PIXI.Graphics | null = null;
    let linkGraphics: PIXI.Graphics | null = null;
    let debugGraphics: PIXI.Graphics | null = null; // New debug layer

    // Ship Spawn Animation Tracking
    // Key: `${starId}-${shipIndex}`, Value: spawnTimestamp
    let shipSpawnTimers: Map<string, number> = new Map();
    let starShipCounts: Map<string, number> = new Map(); // Track previous counts

    // Physics State
    // Map<StarId, VisualShipState[]>
    let visualShips: Map<string, VisualShipState[]> = new Map();
    let visualDamagedShips: Map<string, VisualShipState[]> = new Map();
    let nextShipId = 0; // Unique counter

    // Animation state
    let animationTime = 0;
    let animationFrameId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

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
        // Validate both stars exist in current snapshot
        const snapshot = gameStore.snapshot;
        if (!snapshot) return;

        const sourceExists = snapshot.stars.some((s) => s.id === sourceId);
        const targetExists = snapshot.stars.some((s) => s.id === targetId);
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

        // Create graphics layers (order matters: connections → links → stars → ships → labels → drag)
        connectionGraphics = new PIXI.Graphics();
        app.stage.addChild(connectionGraphics);

        linkGraphics = new PIXI.Graphics();
        app.stage.addChild(linkGraphics);

        starsContainer = new PIXI.Container();
        app.stage.addChild(starsContainer);

        shipsContainer = new PIXI.Container();
        app.stage.addChild(shipsContainer);

        shipGraphics = new PIXI.Graphics();
        shipsContainer.addChild(shipGraphics);

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
        shipGraphics = null;
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
            animationTime += deltaTime;

            // Render the current frame
            const snapshot = gameStore.snapshot;
            if (snapshot && app) {
                renderFrame(snapshot.stars, gameStore.tickProgress);
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
    }

    // ============================================================================
    // Rendering
    // ============================================================================

    // Game world dimensions (fixed, map is generated at this size)
    const GAME_WIDTH = 1600;
    const GAME_HEIGHT = 900;

    function handleResize() {
        if (!app) return;

        app.resize();

        // Calculate scale to fit game world in container while maintaining aspect ratio
        const containerWidth = app.screen.width;
        const containerHeight = app.screen.height;

        const scaleX = containerWidth / GAME_WIDTH;
        const scaleY = containerHeight / GAME_HEIGHT;
        const scale = Math.min(scaleX, scaleY); // Fit (not fill)

        // Apply scale to stage
        app.stage.scale.set(scale, scale);

        // Center the scaled content
        const scaledWidth = GAME_WIDTH * scale;
        const scaledHeight = GAME_HEIGHT * scale;
        app.stage.x = (containerWidth - scaledWidth) / 2;
        app.stage.y = (containerHeight - scaledHeight) / 2;
    }

    function getPlayerColor(ownerId: string): number {
        return PLAYER_COLORS[ownerId] ?? 0x888888;
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
        if (!app || !starsContainer || !labelsContainer || !shipGraphics)
            return;

        // Reset state on new game session
        const currentSessionId = gameStore.sessionId;
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

        // Render stars (static elements)
        renderStars(stars);

        // Render connections (star network)
        const snapshot = gameStore.snapshot;
        if (snapshot?.connections) {
            renderConnections(stars, snapshot.connections);
        }

        // Render flow links
        renderFlowLinks(stars);

        // NOTE: Pending orders cleanup is now handled in renderFlowLinks()

        // Render traveling fleets (authoritative)
        if (snapshot?.fleets) {
            shipGraphics?.clear(); // Clear once before drawing any ships (fleets + orbiting)
            renderFleets(stars, snapshot.fleets);
        } else {
            shipGraphics?.clear();
        }

        // Render animated ships (orbiting)
        renderShips(stars, tickProgress);
    }

    function renderConnections(
        stars: StarState[],
        connections: StarConnection[],
    ) {
        if (!connectionGraphics) return;

        connectionGraphics.clear();

        // Draw connections (static graph) - BOLD BRIGHT WHITE
        connections.forEach((conn) => {
            const source = stars.find((s) => s.id === conn.sourceId);
            const target = stars.find((s) => s.id === conn.targetId);
            if (!source || !target) return;

            connectionGraphics!.moveTo(source.x, source.y);
            connectionGraphics!.lineTo(target.x, target.y);
        });

        // Draw all connection lines in one stroke
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
            const typeStats = Star.TYPE_STATS[star.starType];
            const typeColor = typeStats ? typeStats.color : 0xffffff;

            graphics.circle(star.x, star.y, radius);
            graphics.fill({ color: typeColor, alpha: 0.3 }); // Inner type color
            graphics.stroke({ color, width: isActive ? 4 : 2, alpha: 1 }); // Owner border

            // Inner core (brighter when producing)
            const coreAlpha = 0.3 + Math.sin(animationTime * 3) * 0.1;
            graphics.circle(star.x, star.y, radius * 0.4);
            graphics.fill({ color: 0xffffff, alpha: coreAlpha });

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

    function renderFlowLinks(stars: StarState[]) {
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
        const starsById = new Map(stars.map((s) => [s.id, s]));
        pendingOrders.forEach((key) => {
            const [sourceId, targetId] = key.split("|");
            const source = starsById.get(sourceId);

            // Remove if source doesn't exist or no longer owned by human
            if (!source || source.ownerId !== "human-player") {
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
            const headLen = 25; // Length of arrowhead
            const lineWidth = 6;

            // Start: Source Edge
            const startDist = source.radius + padding;
            // End: Target Edge (minus head length to place head correctly)
            const endDist = dist - (target.radius + padding);

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

        // Clean up deferred orders for stars that have been captured by human
        deferredOrders.forEach((key) => {
            const [sourceId] = key.split("|");
            const source = starsById.get(sourceId);
            // If the star is now owned by human, the queued order has executed - remove it
            if (source && source.ownerId === "human-player") {
                deferredOrders.delete(key);
            }
        });

        // Also sync with actual queuedOrderTargetId from snapshot
        const snapshotStars = gameStore.snapshot?.stars || [];
        deferredOrders.forEach((key) => {
            const [sourceId, targetId] = key.split("|");
            const star = snapshotStars.find((s) => s.id === sourceId);
            // Remove if star doesn't have this queued order anymore
            if (star && star.queuedOrderTargetId !== targetId) {
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
            const endDist = dist - (target.radius + padding);

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

    function renderShips(stars: StarState[], tickProgress: number) {
        if (!shipGraphics) return;

        // Configuration for Physics
        const LERP_FACTOR = 0.1; // Smoothness (0.1 = smooth, 0.5 = snappy)

        stars.forEach((star) => {
            const color = getPlayerColor(star.ownerId);

            // 1. Manage Active Ships State
            let ships = visualShips.get(star.id) || [];
            const targetCount = star.activeShips;

            // SPWAN: If we need more ships, add them
            if (ships.length < targetCount) {
                const diff = targetCount - ships.length;
                for (let i = 0; i < diff; i++) {
                    const spawnIndex = ships.length; // Will be valid index
                    // Start at center of star
                    ships.push({
                        id: nextShipId++,
                        x: star.x,
                        y: star.y,
                        vx: 0,
                        vy: 0,
                        targetIndex: spawnIndex,
                        scale: 0.1, // Start tiny
                        alpha: 0,
                        spawnTime: performance.now(),
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
                    ship.targetIndex = i;

                    // Per-ship phase offset for organic variation
                    const shipPhase = (ship.id % 17) / 17; // 0-1 unique per ship

                    let targetX: number, targetY: number;

                    // === All ships stay in ORBIT, with optional surge offset ===
                    const slot = getOrbitSlot(
                        ship.targetIndex,
                        star.x,
                        star.y,
                        star.radius,
                        animationTime,
                    );
                    targetX = slot.x;
                    const shipMultiplier = slot.multiplier;
                    targetY = slot.y;

                    // ATTACK MODE: Egg-shaped pulse - ships facing target surge forward
                    // Ships at back stay at orbit radius (don't cross planetary valence)
                    if (isAttack && targetStar) {
                        // Calculate ship's position relative to star center
                        const shipDx = slot.x - star.x;
                        const shipDy = slot.y - star.y;
                        const shipDist =
                            Math.sqrt(shipDx * shipDx + shipDy * shipDy) || 1;

                        // Normalize ship position vector
                        const shipNormX = shipDx / shipDist;
                        const shipNormY = shipDy / shipDist;

                        // Dot product with target direction = how much ship faces target
                        // +1 = facing target, -1 = facing away, 0 = perpendicular
                        const facingFactor =
                            shipNormX * dirX + shipNormY * dirY;

                        // Only surge ships facing target (facingFactor > 0)
                        // Use smooth transition: max(0, facingFactor)^2 for softer falloff
                        const surgeFactor = Math.max(0, facingFactor) ** 1.5;

                        // Per-ship phase offset for staggered surge
                        const phaseOffsetTime = tickProgress + shipPhase * 0.12;
                        const surgePulse = Math.sin(
                            Math.min(phaseOffsetTime, 1) * Math.PI,
                        );

                        // Subtle surge: max displacement toward target
                        // Front ships get full surge, back ships get none
                        const surgeMax = star.radius * 0.4;
                        targetX += dirX * surgePulse * surgeMax * surgeFactor;
                        targetY += dirY * surgePulse * surgeMax * surgeFactor;
                    }

                    // TRANSFER MODE: For now, same as idle (ships stay until fleet system)
                    // Future: Separate fleet visuals will show traveling ships

                    // Smooth interpolation to target
                    ship.x = lerp(ship.x, targetX, LERP_FACTOR);
                    ship.y = lerp(ship.y, targetY, LERP_FACTOR);

                    const TARGET_SCALE = 0.8;
                    ship.scale = lerp(ship.scale, TARGET_SCALE, 0.1);
                    ship.alpha = lerp(ship.alpha, 1, 0.1);

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
                    damagedShips.push({
                        id: nextShipId++,
                        x: star.x + (Math.random() - 0.5) * 20,
                        y: star.y + (Math.random() - 0.5) * 20,
                        vx: 0,
                        vy: 0,
                        targetIndex: i,
                        scale: 0.1,
                        alpha: 0,
                        spawnTime: performance.now(),
                    });
                }
            } else if (damagedShips.length > damageCount) {
                damagedShips.length = damageCount;
            }
            visualDamagedShips.set(star.id, damagedShips);

            damagedShips.forEach((ship, i) => {
                // Damaged ships float randomly near center
                const angle =
                    animationTime * 0.5 +
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
    }

    function renderFleets(stars: StarState[], fleets: FleetState[]) {
        if (!shipGraphics) return;

        // Progress is globally driven by game tick progress (0 -> 1)
        const progress = gameStore.tickProgress;

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
        if (!shipGraphics) return;

        const size = 3 * scale;

        // Apply white tinting based on multiplier (1 = normal, 2 = slightly white, etc.)
        // Blend rate: 0.30 per log2 power, max blend: 1.0 (full white for very high stacks)
        let finalColor = color;
        if (multiplier > 1) {
            const blendAmount = Math.min(1.0, Math.log2(multiplier) * 0.3);
            const r = (color >> 16) & 0xff;
            const g = (color >> 8) & 0xff;
            const b = color & 0xff;
            const newR = Math.round(r + (255 - r) * blendAmount);
            const newG = Math.round(g + (255 - g) * blendAmount);
            const newB = Math.round(b + (255 - b) * blendAmount);
            finalColor = (newR << 16) | (newG << 8) | newB;
        }

        // Use shapes for high-multiplier ships (better visual distinction)
        if (multiplier > 1) {
            // Draw polygon: sides increase with multiplier (triangle -> square -> pentagon -> hex...)
            const sides = Math.min(8, 3 + Math.floor(Math.log2(multiplier)));
            drawPolygon(shipGraphics, x, y, size, sides, animationTime);
            shipGraphics.fill({ color: finalColor, alpha });
        } else {
            // Regular circle for single ships
            shipGraphics.circle(x, y, size);
            shipGraphics.fill({ color: finalColor, alpha });
        }

        // Damaged ships get a dark border indicator
        if (isDamaged) {
            shipGraphics.circle(x, y, size + 1);
            shipGraphics.stroke({ color: 0x222222, width: 1.5, alpha: 0.8 });
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
        const snapshot = gameStore.snapshot;
        if (!snapshot) return null;

        // Convert screen coordinates to world coordinates
        const { x, y } = screenToWorld(screenX, screenY);

        for (const star of snapshot.stars) {
            const dist = distance(x, y, star.x, star.y);
            // FIX: Enlarge hit target (4x radius or 80px min)
            // Make it excessively clickable
            if (dist <= Math.max(star.radius * 4, 80)) {
                return star;
            }
        }
        return null;
    }

    function handlePointerDown(event: PointerEvent) {
        if (!app) return;

        const rect = canvasContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const star = hitTestStar(x, y);

        // FIX: Right Click to Cancel
        if (event.button === 2) {
            event.preventDefault();
            if (star && star.ownerId === "human-player") {
                gameStore.cancelOrder(star.id);
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

        if (star && star.ownerId === "human-player") {
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
        if (!isDragging || !dragSourceId) return;

        const rect = canvasContainer.getBoundingClientRect();
        dragCurrentX = event.clientX - rect.left;
        dragCurrentY = event.clientY - rect.top;

        // DRAG-THROUGH LOGIC:
        // If we hover a DIFFERENT star while dragging, issue order and continue drag from THERE
        const targetStar = hitTestStar(dragCurrentX, dragCurrentY);

        if (targetStar && targetStar.id !== dragSourceId) {
            // Validate connection first
            const snapshot = gameStore.snapshot;
            const isConnected = snapshot?.connections.some(
                (c) =>
                    (c.sourceId === dragSourceId &&
                        c.targetId === targetStar.id) ||
                    (c.sourceId === targetStar.id &&
                        c.targetId === dragSourceId),
            );

            if (isConnected) {
                const sourceStar = snapshot?.stars.find(
                    (s) => s.id === dragSourceId,
                );
                const humanPlayerId = snapshot?.players.find(
                    (p) => !p.isAI,
                )?.id;
                const isSourceMine = sourceStar?.ownerId === humanPlayerId;
                const isTargetMine = targetStar.ownerId === humanPlayerId;
                const isTargetEnemy =
                    !isTargetMine && targetStar.ownerId !== "neutral";

                if (isSourceMine) {
                    // Dragging from my star - issue normal order
                    // Ctrl-click = order clears on conquest (inverts default persist=true)
                    const success = gameStore.issueOrder(
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
                    const success = gameStore.setDeferredOrder(
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
                // Issue order from drag
                // Ctrl-click = order clears on conquest
                const success = gameStore.issueOrder(
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
            }
            cancelDrag();
            return;
        }

        // CLICK LOGIC (Not valid drag)
        if (!movedSignificantly && targetStar) {
            // Case 1: Active Star Selected -> Click OTHER star (Issue Order)
            if (activeStarId && activeStarId !== targetStar.id) {
                const activeStarSnapshot = gameStore.snapshot?.stars.find(
                    (s) => s.id === activeStarId,
                );

                // If we own the source, we can send to ANY target (Self or Enemy)
                if (activeStarSnapshot?.ownerId === "human-player") {
                    // Ctrl-click = order clears on conquest
                    const success = gameStore.issueOrder(
                        activeStarId,
                        targetStar.id,
                        !event.ctrlKey, // persist unless ctrl-click
                    );
                    if (success) addPendingOrder(activeStarId, targetStar.id);

                    if (success) {
                        activeStarId = targetStar.id; // Chain selection
                    } else {
                        // Failed (not connected?) -> select the target if ours
                        if (targetStar.ownerId === "human-player") {
                            activeStarId = targetStar.id;
                        }
                    }
                } else if (
                    activeStarSnapshot?.ownerId !== "human-player" &&
                    activeStarSnapshot?.ownerId !== "neutral"
                ) {
                    // Selected star is enemy - try to set deferred order
                    const isConnected = gameStore.snapshot?.connections.some(
                        (c) =>
                            (c.sourceId === activeStarId &&
                                c.targetId === targetStar.id) ||
                            (c.sourceId === targetStar.id &&
                                c.targetId === activeStarId),
                    );
                    if (isConnected) {
                        const success = gameStore.setDeferredOrder(
                            activeStarId,
                            targetStar.id,
                            !event.ctrlKey,
                        );
                        if (success) {
                            addPendingOrder(activeStarId, targetStar.id, true);
                            log.success(
                                "GameCanvas",
                                `Deferred order via click: ${activeStarId} -> ${targetStar.id}`,
                            );
                            activeStarId = targetStar.id; // Chain to next
                        }
                    }
                } else {
                    // Previous selection wasn't ours, just select new one
                    if (targetStar.ownerId === "human-player") {
                        activeStarId = targetStar.id;
                    } else if (targetStar.ownerId !== "neutral") {
                        // Can select enemy stars for chaining deferred orders
                        activeStarId = targetStar.id;
                    }
                }
            }
            // Case 2: No active selection or clicked same -> Select
            else if (targetStar.ownerId === "human-player") {
                activeStarId = targetStar.id;
                log.state("GameCanvas", `Star ${targetStar.id} selected`);
            } else if (targetStar.ownerId !== "neutral") {
                // Allow selecting enemy stars to set up deferred order chains
                activeStarId = targetStar.id;
                log.state(
                    "GameCanvas",
                    `Enemy star ${targetStar.id} selected for deferred orders`,
                );
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

        if (star && star.ownerId === "human-player" && star.targetId) {
            // Cancel order for this star
            gameStore.cancelOrder(star.id);
            log.state("GameCanvas", `Order cancelled for star ${star.id}`);
        } else if (
            star &&
            star.ownerId !== "human-player" &&
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
            const snapshot = gameStore.snapshot;
            const isConnected = snapshot?.connections.some(
                (c) =>
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
                    color:
                        target.ownerId === "human-player" ? 0x00ff00 : 0xff4466,
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
        } else if (event.key === " " || event.code === "Space") {
            // Spacebar = pause/play toggle
            event.preventDefault();
            if (gameStore.isPaused) {
                gameStore.resumeGame();
            } else {
                gameStore.pauseGame();
            }
        }
    }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
    class="game-canvas"
    role="application"
    aria-label="Game canvas - click or drag from your stars to attack"
    bind:this={canvasContainer}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointerleave={() => cancelDrag()}
    oncontextmenu={handleRightClick}
></div>

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
</style>
