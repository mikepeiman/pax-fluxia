<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import * as PIXI from "pixi.js";
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import { Star } from "$lib/engine/Star";
    import { log } from "$lib/utils/logger";
    import type { StarState, FleetState } from "$lib/engine/GameEngine";

    // Assets
    // We will draw procedurally for now to ensure perfect scaling

    // Props
    // No props passed, we consume gameStore direct

    // PIXI App
    let app: PIXI.Application | null = null;
    let canvasContainer: HTMLDivElement;

    // Containers
    let starsContainer: PIXI.Container;
    let linksContainer: PIXI.Container;
    let shipsContainer: PIXI.Container;
    let uiContainer: PIXI.Container;
    let labelsContainer: PIXI.Container; // New container for labels

    // Comparison State (to detect changes)
    let renderedStarIds = new Set<string>();
    let shipGraphics = new PIXI.Graphics(); // Single graphics for all ships (batching)
    let linkGraphics = new PIXI.Graphics(); // Single graphics for all links
    let dragPreviewGraphics = new PIXI.Graphics(); // For drag order lines

    // Cache Map for Star Graphics (draw once, update less often or just transform)
    const starGraphics = new Map<string, PIXI.Graphics>();
    const starLabels = new Map<string, PIXI.Container>();

    // Visual State for Ships (Interpolation)
    interface VisualShip {
        id: number;
        x: number;
        y: number;
        vx: number;
        vy: number;
        targetIndex: number; // For formation
        scale: number;
        alpha: number;
        spawnTime: number;
    }
    const visualShips = new Map<string, VisualShip[]>();
    const visualDamagedShips = new Map<string, VisualShip[]>();
    let nextShipId = 0;

    // Interaction State
    let isDragging = false;
    let dragSourceId: string | null = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragCurrentX = 0;
    let dragCurrentY = 0;

    let activeStarId: string | null = null; // Currently selected star

    // Optimistic UI State
    // We track pending orders to immediately show arrows before engine tick confirms
    const pendingOrders = new Set<string>(); // "source|target"

    // Animation Loop
    let animationFrameId: number;
    let lastTime = 0;
    let animationTime = 0;

    // Viewport State
    let currentScale = 1;
    let currentWidth = 1;
    let currentHeight = 1;

    // Helper: Player Colors
    function getPlayerColor(id: string): number {
        if (id?.includes("p1") || id === "player" || id === "human-player")
            return 0x3b82f6; // Blue
        if (id?.includes("ai")) return 0xef4444; // Red/Enemy?
        // Wait, reference had Green and Yellow too. Mapping might need to be dynamic or use gameStore colors?
        // sticking to simple mapping for now.
        if (id === "ai-2") return 0x22c55e; // Green
        if (id === "ai-3") return 0xeab308; // Yellow
        if (id === "ai-4") return 0xa855f7; // Purple
        return 0x6b7280; // Grey
    }

    // Helper: Orbit logic for ships
    function getOrbitSlot(
        index: number,
        cx: number,
        cy: number,
        radius: number,
        time: number,
    ) {
        // Spiral formation
        const ringSpacing = 4;
        const ringCapacity = 8;
        const ringIndex = Math.floor(index / ringCapacity);
        const ringPos = index % ringCapacity;

        const r = radius + 8 + ringIndex * ringSpacing;
        const angle =
            (ringPos / ringCapacity) * Math.PI * 2 +
            time * (0.5 / (ringIndex + 1));

        return {
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r,
        };
    }

    // Helper: Lerp
    function lerp(start: number, end: number, t: number) {
        return start * (1 - t) + end * t;
    }

    // Helper: Coordinate Transformation using PIXI Stage
    function getPointerWorldPos(event: PointerEvent | MouseEvent) {
        if (!app || !app.stage) return { x: 0, y: 0 };
        const rect = canvasContainer.getBoundingClientRect();
        const clientX = event.clientX - rect.left;
        const clientY = event.clientY - rect.top;

        // Transform screen -> world using stage transform
        // world = (screen - position) / scale
        const worldX = (clientX - app.stage.position.x) / app.stage.scale.x;
        const worldY = (clientY - app.stage.position.y) / app.stage.scale.y;

        return { x: worldX, y: worldY };
    }

    // Helper: Distance
    function distance(x1: number, y1: number, x2: number, y2: number) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    onMount(async () => {
        log.sys("GameCanvas", "Mounting PIXI...");

        // Initialize PIXI
        app = new PIXI.Application();

        // High resolution for crisp circles
        await app.init({
            resizeTo: canvasContainer,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            backgroundAlpha: 0,
        });

        if (canvasContainer) {
            canvasContainer.appendChild(app.canvas);
        }

        // Setup Layers
        linksContainer = new PIXI.Container();
        starsContainer = new PIXI.Container();
        shipsContainer = new PIXI.Container();
        labelsContainer = new PIXI.Container(); // Labels above stars
        uiContainer = new PIXI.Container();

        app.stage.addChild(linksContainer);
        app.stage.addChild(starsContainer);
        app.stage.addChild(labelsContainer); // Insert labels here
        app.stage.addChild(shipsContainer);
        app.stage.addChild(uiContainer);

        // Add batched graphics
        shipsContainer.addChild(shipGraphics);
        linksContainer.addChild(linkGraphics);
        uiContainer.addChild(dragPreviewGraphics);

        // Start Loop
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(renderLoop);

        // Resize Observer for responsive scaling
        const resizeObserver = new ResizeObserver(() => {
            if (app) app.resize();
        });
        resizeObserver.observe(canvasContainer);

        log.success("GameCanvas", "PIXI Initialized");

        return () => {
            resizeObserver.disconnect();
            if (app) app.destroy(true, { children: true });
        };
    });

    onDestroy(() => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
    });

    function renderLoop(time: number) {
        const dt = (time - lastTime) / 1000;
        lastTime = time;
        animationTime += dt;

        if (gameStore.snapshot) {
            // Update Canvas Scaling (Pan/Zoom to fit)
            updateViewTransform(gameStore.snapshot.stars);

            // Render Entities
            renderStars(gameStore.snapshot.stars);
            renderFlowLinks(gameStore.snapshot.stars);

            // Ships use interpolation based on tick progress
            renderShips(gameStore.snapshot.stars, gameStore.tickProgress);
            renderFleets(gameStore.snapshot.stars, gameStore.snapshot.fleets);

            // Prune old pending orders (if they are now in the snapshot connections)
            gameStore.snapshot.connections.forEach((c) => {
                const key = `${c.sourceId}|${c.targetId}`;
                if (pendingOrders.has(key)) {
                    pendingOrders.delete(key);
                }
            });
        }

        animationFrameId = requestAnimationFrame(renderLoop);
    }

    function updateViewTransform(stars: StarState[]) {
        if (!app || stars.length === 0) return;

        // Calculate bounds
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
        stars.forEach((s) => {
            minX = Math.min(minX, s.x - s.radius);
            minY = Math.min(minY, s.y - s.radius);
            maxX = Math.max(maxX, s.x + s.radius);
            maxY = Math.max(maxY, s.y + s.radius);
        });

        // Add padding
        const PADDING = 60;
        minX -= PADDING;
        minY -= PADDING;
        maxX += PADDING;
        maxY += PADDING;

        const worldWidth = maxX - minX;
        const worldHeight = maxY - minY;

        const screenWidth = app.screen.width;
        const screenHeight = app.screen.height;

        // Determine Scale to fit
        const scaleX = screenWidth / worldWidth;
        const scaleY = screenHeight / worldHeight;
        const scale = Math.min(scaleX, scaleY);
        currentScale = scale; // Store for inverse scaling of labels

        // Center it
        const offsetX = (screenWidth - worldWidth * scale) / 2;
        const offsetY = (screenHeight - worldHeight * scale) / 2;

        // Apply to Stage
        app.stage.scale.set(scale);
        app.stage.position.set(offsetX - minX * scale, offsetY - minY * scale);

        // Update global width/height for other uses
        currentWidth = screenWidth;
        currentHeight = screenHeight;
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

                // Active count (Center, Exo Font)
                const activeText = new PIXI.Text({
                    text: "0",
                    style: {
                        fontFamily: "Exo, sans-serif",
                        fontSize: 14,
                        fontWeight: "900",
                        fill: 0xffffff,
                        align: "center",
                        stroke: { color: 0x000000, width: 2 },
                        lineJoin: "round",
                    },
                });
                activeText.anchor.set(0.5, 0.5);
                activeText.label = "active";
                label.addChild(activeText);

                // Damaged count (Bottom)
                const damagedText = new PIXI.Text({
                    text: "0",
                    style: {
                        fontFamily: "Exo, sans-serif",
                        fontSize: 10,
                        fontWeight: "bold",
                        fill: 0xffaaaa,
                        align: "center",
                        stroke: { color: 0x000000, width: 2 },
                        lineJoin: "round",
                    },
                });
                damagedText.anchor.set(0.5, 0.5);
                damagedText.y = 16;
                damagedText.label = "damaged";
                damagedText.visible = false;
                label.addChild(damagedText);

                // Star ID label (Top)
                const idText = new PIXI.Text({
                    text: star.id.replace("star-", ""),
                    style: {
                        fontFamily: "Exo, sans-serif",
                        fontSize: 9,
                        fontWeight: "bold",
                        fill: 0x88aaff,
                        align: "center",
                        stroke: { color: 0x000000, width: 2 },
                        lineJoin: "round",
                    },
                });
                idText.anchor.set(0.5, 0.5);
                idText.position.y = -20;
                idText.label = "starId";
                label.addChild(idText);

                labelsContainer!.addChild(label);
                starLabels.set(star.id, label);
            }

            // Clear previous drawings
            graphics.clear();

            const ownerColor = getPlayerColor(star.ownerId);
            const isActive =
                star.id === activeStarId || star.id === dragSourceId;

            // Visual Size
            const radius = star.radius;
            const visualRadius = radius;

            // --- REVERT TO RING STYLE ---

            // 1. Black Background Fill (to hide lines behind)
            graphics.circle(star.x, star.y, visualRadius);
            graphics.fill({ color: 0x000000, alpha: 0.9 });

            // 2. Owner Ring (Stroke)
            graphics.stroke({
                color: ownerColor,
                width: isActive ? 4 : 3, // Ring style thickness
                alpha: 1,
            });

            // 3. Selection Highlight (Outer Ring)
            if (isActive) {
                graphics.circle(star.x, star.y, visualRadius + 6);
                graphics.stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
            }

            // Update labels
            const activeText = label.getChildByLabel("active") as PIXI.Text;
            const damagedText = label.getChildByLabel("damaged") as PIXI.Text;

            if (activeText) activeText.text = String(star.activeShips);

            if (damagedText) {
                damagedText.text = String(star.damagedShips);
                damagedText.visible = star.damagedShips > 0;
            }

            label.x = star.x;
            label.y = star.y;

            // Responsive Scaling
            const invScale = 1 / Math.max(currentScale, 0.2);
            label.scale.set(Math.pow(invScale, 0.7));
        });
    }

    function renderFlowLinks(stars: StarState[]) {
        if (!linkGraphics) return;

        linkGraphics.clear();
        linkGraphics.lineStyle = null;

        const allLinks = new Set<string>();

        // 1. Snapshot Flows (from star data)
        stars.forEach((s) => {
            if (s.targetId) {
                allLinks.add(`${s.id}|${s.targetId}`);
            }
        });

        // 2. Pending Orders (Optimistic)
        pendingOrders.forEach((key) => allLinks.add(key));

        // Refactor loop to iterate unique Links
        allLinks.forEach((linkKey) => {
            const [sId, tId] = linkKey.split("|");
            const source = stars.find((s) => s.id === sId);
            const target = stars.find((s) => s.id === tId);

            if (!source || !target) return;

            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const angle = Math.atan2(dy, dx);
            const dist = Math.sqrt(dx * dx + dy * dy);

            const padding = 8;
            const headLen = 16;
            const lineWidth = 2; // Keep thinner links logic (2px)

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

            // 1. Draw Shaft
            linkGraphics!.moveTo(startX, startY);
            linkGraphics!.lineTo(arrowBaseX, arrowBaseY);
            linkGraphics!.stroke({
                color,
                width: lineWidth,
                alpha: 0.4,
                cap: "round",
            });

            // 2. Draw Arrowhead
            const tipX = endX;
            const tipY = endY;

            const wing1X = tipX - headLen * Math.cos(angle - Math.PI / 6);
            const wing1Y = tipY - headLen * Math.sin(angle - Math.PI / 6);

            const wing2X = tipX - headLen * Math.cos(angle + Math.PI / 6);
            const wing2Y = tipY - headLen * Math.sin(angle + Math.PI / 6);

            linkGraphics!.beginPath();
            linkGraphics!.moveTo(tipX, tipY);
            linkGraphics!.lineTo(wing1X, wing1Y);
            linkGraphics!.lineTo(wing2X, wing2Y);
            linkGraphics!.closePath();

            linkGraphics!.fill({ color, alpha: 0.6 });
        });
    }

    function renderShips(stars: StarState[], tickProgress: number) {
        if (!shipGraphics) return;

        // Configuration for Physics
        const LERP_FACTOR = 0.1;

        stars.forEach((star) => {
            const color = getPlayerColor(star.ownerId);

            // 1. Manage Active Ships State
            let ships = visualShips.get(star.id) || [];
            const targetCount = star.activeShips;

            if (ships.length < targetCount) {
                const diff = targetCount - ships.length;
                for (let i = 0; i < diff; i++) {
                    const spawnIndex = ships.length;
                    ships.push({
                        id: nextShipId++,
                        x: star.x,
                        y: star.y,
                        vx: 0,
                        vy: 0,
                        targetIndex: spawnIndex,
                        scale: 0.1,
                        alpha: 0,
                        spawnTime: performance.now(),
                    });
                }
            } else if (ships.length > targetCount) {
                ships.length = targetCount;
            }
            visualShips.set(star.id, ships);

            // 2. Physics & Render Loop for Active Ships
            if (ships.length > 0) {
                const hasTarget = star.targetId !== null;
                const targetStar = hasTarget
                    ? stars.find((s) => s.id === star.targetId)
                    : null;
                const isAttack =
                    hasTarget &&
                    targetStar &&
                    targetStar.ownerId !== star.ownerId;

                let dirX = 0,
                    dirY = 0;
                if (targetStar) {
                    const dx = targetStar.x - star.x;
                    const dy = targetStar.y - star.y;
                    const d = Math.sqrt(dx * dx + dy * dy) || 1;
                    dirX = dx / d;
                    dirY = dy / d;
                }

                ships.forEach((ship, i) => {
                    ship.targetIndex = i;
                    const shipPhase = (ship.id % 17) / 17;

                    let targetX: number, targetY: number;

                    const slot = getOrbitSlot(
                        ship.targetIndex,
                        star.x,
                        star.y,
                        star.radius,
                        animationTime,
                    );
                    targetX = slot.x;
                    targetY = slot.y;

                    if (isAttack && targetStar) {
                        const phaseOffsetTime = tickProgress + shipPhase * 0.15;
                        const surgePulse = Math.sin(
                            Math.min(phaseOffsetTime, 1) * Math.PI,
                        );
                        const surgeMax = star.radius * 0.5;
                        targetX += dirX * surgePulse * surgeMax;
                        targetY += dirY * surgePulse * surgeMax;
                    }

                    ship.x = lerp(ship.x, targetX, LERP_FACTOR);
                    ship.y = lerp(ship.y, targetY, LERP_FACTOR);

                    ship.scale = lerp(ship.scale, 0.8, 0.1);
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

            // 3. Render Damaged Ships
            let damagedShips = visualDamagedShips.get(star.id) || [];
            const damageCount = star.damagedShips;

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
        const progress = gameStore.tickProgress;

        fleets.forEach((fleet) => {
            const source = stars.find((s) => s.id === fleet.sourceId);
            const target = stars.find((s) => s.id === fleet.targetId);
            if (!source || !target) return;

            const color = getPlayerColor(fleet.ownerId);
            const count = fleet.shipCount;
            const visualCount = Math.min(count, 5);

            for (let i = 0; i < visualCount; i++) {
                const lag = i * 0.02;
                const localProgress = Math.max(0, Math.min(1, progress - lag));

                const lx = lerp(source.x, target.x, localProgress);
                const ly = lerp(source.y, target.y, localProgress);
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
        shipGraphics.circle(x, y, size);
        shipGraphics.fill({ color, alpha });

        if (isDamaged) {
            shipGraphics.circle(x, y, size + 1);
            shipGraphics.stroke({ color: 0x222222, width: 1.5, alpha: 0.8 });
        }
    }

    // Input Handling
    function hitTestStar(x: number, y: number): StarState | null {
        const snapshot = gameStore.snapshot;
        if (!snapshot) return null;
        for (const star of snapshot.stars) {
            const dist = distance(x, y, star.x, star.y);
            if (dist <= Math.max(star.radius * 4, 80)) {
                return star;
            }
        }
        return null;
    }

    function handlePointerDown(event: PointerEvent) {
        if (!app) return;
        const { x, y } = getPointerWorldPos(event);
        const star = hitTestStar(x, y);

        if (event.button === 2) {
            // Right Click
            event.preventDefault();
            if (star && star.ownerId === "human-player") {
                gameStore.cancelOrder(star.id);
                pendingOrders.forEach((key) => {
                    if (key.startsWith(`${star.id}|`))
                        pendingOrders.delete(key);
                });
            }
            activeStarId = null;
            return;
        }

        if (star && star.ownerId === "human-player") {
            isDragging = true;
            dragSourceId = star.id;
            dragStartX = star.x;
            dragStartY = star.y;
            dragCurrentX = x;
            dragCurrentY = y;
        }
    }

    function handlePointerMove(event: PointerEvent) {
        if (!isDragging || !dragSourceId) return;
        const { x, y } = getPointerWorldPos(event);
        dragCurrentX = x;
        dragCurrentY = y;

        const targetStar = hitTestStar(dragCurrentX, dragCurrentY);
        if (targetStar && targetStar.id !== dragSourceId) {
            const snapshot = gameStore.snapshot;
            const isConnected = snapshot?.connections.some(
                (c) =>
                    (c.sourceId === dragSourceId &&
                        c.targetId === targetStar.id) ||
                    (c.sourceId === targetStar.id &&
                        c.targetId === dragSourceId),
            );

            if (isConnected) {
                const success = gameStore.issueOrder(
                    dragSourceId,
                    targetStar.id,
                );
                if (success) {
                    addPendingOrder(dragSourceId, targetStar.id);
                    dragSourceId = targetStar.id;
                    dragStartX = targetStar.x;
                    dragStartY = targetStar.y;
                    activeStarId = targetStar.id;
                }
            }
        }
        renderDragPreview();
    }

    function handlePointerUp(event: PointerEvent) {
        const { x, y } = getPointerWorldPos(event);
        const targetStar = hitTestStar(x, y);
        const movedSignificantly =
            isDragging &&
            (Math.abs(x - dragStartX) > 10 || Math.abs(y - dragStartY) > 10);

        if (movedSignificantly && dragSourceId) {
            if (targetStar && targetStar.id !== dragSourceId) {
                const success = gameStore.issueOrder(
                    dragSourceId,
                    targetStar.id,
                );
                if (success) addPendingOrder(dragSourceId, targetStar.id);
            }
            cancelDrag();
            return;
        }

        if (!movedSignificantly && targetStar) {
            if (activeStarId && activeStarId !== targetStar.id) {
                const activeStarSnapshot = gameStore.snapshot?.stars.find(
                    (s) => s.id === activeStarId,
                );
                if (activeStarSnapshot?.ownerId === "human-player") {
                    const success = gameStore.issueOrder(
                        activeStarId,
                        targetStar.id,
                    );
                    if (success) {
                        addPendingOrder(activeStarId, targetStar.id);
                        activeStarId = targetStar.id;
                    } else {
                        if (targetStar.ownerId === "human-player")
                            activeStarId = targetStar.id;
                    }
                } else {
                    if (targetStar.ownerId === "human-player")
                        activeStarId = targetStar.id;
                }
            } else if (targetStar.ownerId === "human-player") {
                activeStarId = targetStar.id;
            }
        } else if (!movedSignificantly && !targetStar) {
            activeStarId = null;
            cancelDrag();
        }
        cancelDrag();
    }

    function handleRightClick(event: MouseEvent) {
        event.preventDefault();
        const { x, y } = getPointerWorldPos(event);
        const star = hitTestStar(x, y);
        if (star && star.ownerId === "human-player" && star.targetId) {
            gameStore.cancelOrder(star.id);
        }
        activeStarId = null;
        cancelDrag();
    }

    function cancelDrag() {
        isDragging = false;
        dragSourceId = null;
        if (dragPreviewGraphics) dragPreviewGraphics.clear();
    }

    function addPendingOrder(source: string, target: string) {
        pendingOrders.add(`${source}|${target}`);
    }

    function renderDragPreview() {
        if (!dragPreviewGraphics || !isDragging || !dragSourceId) return;
        dragPreviewGraphics.clear();
        dragPreviewGraphics.moveTo(dragStartX, dragStartY);
        dragPreviewGraphics.lineTo(dragCurrentX, dragCurrentY);
        dragPreviewGraphics.stroke({ color: 0x00ffff, width: 3, alpha: 0.7 });
        dragPreviewGraphics.circle(dragCurrentX, dragCurrentY, 8);
        dragPreviewGraphics.stroke({ color: 0x00ffff, width: 2, alpha: 0.9 });
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            activeStarId = null;
            cancelDrag();
        }
    }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
    class="game-canvas"
    role="application"
    aria-label="Game canvas"
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
