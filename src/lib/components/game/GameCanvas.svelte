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
    } from "$lib/types/game.types";

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

    // Input state
    let isDragging = false;
    let dragSourceId: string | null = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragCurrentX = 0;
    let dragCurrentY = 0;

    // Active star state (for click+click selection)
    // Active star state (for click+click selection)
    let activeStarId: string | null = null;
    let pendingOrders: Set<string> = new Set(); // OPTIMISTIC UI: Track ordered links immediately

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

        // Start animation loop
        startAnimationLoop();

        // Handle window resize
        window.addEventListener("resize", handleResize);
    });

    onDestroy(() => {
        log.sys("GameCanvas", "Destroying PixiJS application");

        window.removeEventListener("resize", handleResize);

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

    function handleResize() {
        if (app) {
            app.resize();
        }
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

        // OPTIMISTIC UI: Clear pending orders that are now confirmed in snapshot
        if (snapshot?.connections) {
            snapshot.connections.forEach((c) =>
                pendingOrders.delete(`${c.sourceId}|${c.targetId}`),
            );
        }

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
                // Create container for stacked labels
                label = new PIXI.Container();

                // Active count (Top, Bright) - ALWAYS VISIBLE
                const activeText = new PIXI.Text({
                    text: "0",
                    style: {
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 16,
                        fontWeight: "bold",
                        fill: 0xffffff,
                        align: "center",
                        stroke: { color: 0x000000, width: 2 },
                    },
                });
                activeText.anchor.set(0.5, 0.5);
                activeText.label = "active"; // Tag for retrieval
                label.addChild(activeText);

                // Damaged count (Bottom, Dimmer) - ALWAYS VISIBLE
                const damagedText = new PIXI.Text({
                    text: "0",
                    style: {
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 12,
                        fontWeight: "bold",
                        fill: 0xff8888, // Reddish tint
                        align: "center",
                        stroke: { color: 0x000000, width: 2 },
                    },
                });
                damagedText.anchor.set(0.5, 0.5);
                damagedText.y = 16; // Offset downwards
                damagedText.label = "damaged";
                label.addChild(damagedText);

                // Icon (Top, above active count)
                const iconText = new PIXI.Text({
                    text: "",
                    style: {
                        fontSize: 24,
                        align: "center",
                    },
                });
                iconText.anchor.set(0.5, 0.5);
                iconText.position.y = -35;
                iconText.label = "icon";
                label.addChild(iconText);

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
            graphics.circle(star.x, star.y, radius);
            graphics.fill({ color, alpha: 0.5 });
            graphics.stroke({ color, width: isActive ? 3 : 2, alpha: 1 });

            // Inner core (brighter when producing)
            const coreAlpha = 0.3 + Math.sin(animationTime * 3) * 0.1;
            graphics.circle(star.x, star.y, radius * 0.4);
            graphics.fill({ color: 0xffffff, alpha: coreAlpha });

            // Update labels
            const activeText = label.getChildByLabel("active") as PIXI.Text;
            const damagedText = label.getChildByLabel("damaged") as PIXI.Text;
            const iconText = label.getChildByLabel("icon") as PIXI.Text;

            if (activeText) activeText.text = String(star.activeShips);

            if (damagedText) {
                // ALWAYS show damaged count, even if 0, per request
                damagedText.text = String(star.damagedShips);
                damagedText.visible = true;
            }

            if (iconText && star.icon) {
                iconText.text = star.icon;
            }

            label.x = star.x;
            label.y = star.y;
        });
    }

    function renderFlowLinks(stars: StarState[]) {
        if (!linkGraphics) return;

        linkGraphics.clear();

        // Draw active flow indicators using Vector Arrow style
        // Draw active flow indicators using Vector Arrow style
        const allLinks = new Set<string>();

        // 1. Snapshot Connections
        const snapshot = gameStore.snapshot;
        if (snapshot?.connections) {
            snapshot.connections.forEach((c) =>
                allLinks.add(`${c.sourceId}|${c.targetId}`),
            );
        }

        // 2. Pending Orders (Optimistic)
        pendingOrders.forEach((key) => allLinks.add(key));

        stars.forEach((source) => {
            // Find targets based on Links (not just property)
            // We need to iterate LINKS, not source.targetId property (which is just one).
            // Wait, the ENGINE supports multi-target? No, Star.ts has `_targetId`. Single target.
            // But UI should follow the single target property from star?
            // Actually, `snapshot.connections` is the list of active links.
            // `source.targetId` should match.
            // BUT, for optimistic UI, we might have a pending order that isn't in `source.targetId` yet.
            // So we iterate `allLinks`.
        });

        // Refactor loop to iterate unique Links
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
                ships.forEach((ship, i) => {
                    // Update target index to explicitly match current array position (organic shuffle)
                    ship.targetIndex = i;

                    const slot = getOrbitSlot(
                        ship.targetIndex,
                        star.x,
                        star.y,
                        star.radius,
                        animationTime,
                    );

                    // Simple Lerp to target
                    ship.x = lerp(ship.x, slot.x, LERP_FACTOR);
                    ship.y = lerp(ship.y, slot.y, LERP_FACTOR);

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
    ) {
        if (!shipGraphics) return;

        const size = 3 * scale;

        // Draw filled circle for ship
        shipGraphics.circle(x, y, size);
        shipGraphics.fill({ color, alpha });

        // Damaged ships get a dark border indicator
        if (isDamaged) {
            shipGraphics.circle(x, y, size + 1);
            shipGraphics.stroke({ color: 0x222222, width: 1.5, alpha: 0.8 });
        }
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
        const pulseRadius = radius + Math.sin(animationTime * 4) * 3; // Pulse effect

        graphics.moveTo(
            cx + pulseRadius * Math.cos(0),
            cy + pulseRadius * Math.sin(0),
        );
        for (let i = 1; i <= 6; i++) {
            graphics.lineTo(
                cx + pulseRadius * Math.cos(a * i),
                cy + pulseRadius * Math.sin(a * i),
            );
        }
        graphics.stroke({ color, width: lineWidth, alpha: 0.9 });
    }

    // ============================================================================
    // Input Handling
    // ============================================================================

    function hitTestStar(x: number, y: number): StarState | null {
        const snapshot = gameStore.snapshot;
        if (!snapshot) return null;

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
            dragStartX = star.x;
            dragStartY = star.y;
            dragCurrentX = x;
            dragCurrentY = y;

            // DO NOT set activeStarId here - wait for Click logic regarding selection.
            // But we can highlight drag source.
        }
    }

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
                // Issue instant order
                const success = gameStore.issueOrder(
                    dragSourceId,
                    targetStar.id,
                );
                if (success) {
                    log.success(
                        "GameCanvas",
                        `Drag-through: ${dragSourceId} -> ${targetStar.id}`,
                    );

                    // Chain reaction: Drag continues FROM this new star
                    dragSourceId = targetStar.id;
                    dragStartX = targetStar.x;
                    dragStartY = targetStar.y;

                    // Optional: Set active too?
                    activeStarId = targetStar.id;
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
                // Issue order from drag
                gameStore.issueOrder(dragSourceId, targetStar.id);
                pendingOrders.add(`${dragSourceId}|${targetStar.id}`);
                log.success(
                    "GameCanvas",
                    `Drag order: ${dragSourceId} → ${targetStar.id}`,
                );
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
                    const success = gameStore.issueOrder(
                        activeStarId,
                        targetStar.id,
                    );
                    if (success)
                        pendingOrders.add(`${activeStarId}-${targetStar.id}`);

                    if (success) {
                        activeStarId = targetStar.id; // Chain selection
                    } else {
                        // Failed (not connected?) -> select the target if ours
                        if (targetStar.ownerId === "human-player") {
                            activeStarId = targetStar.id;
                        }
                    }
                } else {
                    // Previous selection wasn't ours, just select new one
                    if (targetStar.ownerId === "human-player") {
                        activeStarId = targetStar.id;
                    }
                }
            }
            // Case 2: No active selection or clicked same -> Select
            else if (targetStar.ownerId === "human-player") {
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

        if (star && star.ownerId === "human-player" && star.targetId) {
            // Cancel order for this star
            gameStore.cancelOrder(star.id);
            log.state("GameCanvas", `Order cancelled for star ${star.id}`);
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

        // Clear preview
        if (dragPreviewGraphics) {
            dragPreviewGraphics.clear();
        }
    }

    function renderDragPreview() {
        if (!dragPreviewGraphics || !isDragging || !dragSourceId) return;

        dragPreviewGraphics.clear();

        // Draw line from source to cursor
        dragPreviewGraphics.moveTo(dragStartX, dragStartY);
        dragPreviewGraphics.lineTo(dragCurrentX, dragCurrentY);
        dragPreviewGraphics.stroke({
            color: 0x00ffff,
            width: 3,
            alpha: 0.7,
        });

        // Draw circle at cursor
        dragPreviewGraphics.circle(dragCurrentX, dragCurrentY, 8);
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
