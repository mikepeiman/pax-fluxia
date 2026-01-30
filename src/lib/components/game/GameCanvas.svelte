<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import * as PIXI from "pixi.js";
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import { log } from "$lib/utils/logger";
    import {
        getOrbitPositions,
        getSurgePositions,
    } from "$lib/utils/render.utils";
    import { distance } from "$lib/utils/math.utils";
    import type { StarState } from "$lib/types/game.types";

    // ============================================================================
    // PixiJS Application
    // ============================================================================

    let canvasContainer: HTMLDivElement;
    let app: PIXI.Application | null = null;

    // Graphics layers
    let linkGraphics: PIXI.Graphics | null = null;
    let dragPreviewGraphics: PIXI.Graphics | null = null;
    let starsContainer: PIXI.Container | null = null;
    let shipsContainer: PIXI.Container | null = null;
    let labelsContainer: PIXI.Container | null = null;

    // Graphics cache
    let starGraphics: Map<string, PIXI.Graphics> = new Map();
    let starLabels: Map<string, PIXI.Text> = new Map();
    let shipGraphics: PIXI.Graphics | null = null;

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

        // Create graphics layers (order matters: links → stars → ships → labels → drag)
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

    function renderFrame(stars: StarState[], tickProgress: number) {
        if (!app || !starsContainer || !labelsContainer || !shipGraphics)
            return;

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

        // Render flow links
        renderFlowLinks(stars);

        // Render animated ships
        renderShips(stars, tickProgress);
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
                label = new PIXI.Text({
                    text: "",
                    style: {
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 14,
                        fontWeight: "bold",
                        fill: 0xffffff,
                        align: "center",
                    },
                });
                label.anchor.set(0.5, 0.5);
                labelsContainer!.addChild(label);
                starLabels.set(star.id, label);
            }

            // Clear previous drawings
            graphics.clear();

            const color = getPlayerColor(star.ownerId);
            const radius = star.radius;

            // Outer glow ring (pulses slightly)
            const glowPulse = 1 + Math.sin(animationTime * 2) * 0.1;
            graphics.circle(star.x, star.y, (radius + 8) * glowPulse);
            graphics.fill({ color, alpha: 0.12 });

            // Main star body
            graphics.circle(star.x, star.y, radius);
            graphics.fill({ color, alpha: 0.5 });
            graphics.stroke({ color, width: 2, alpha: 1 });

            // Inner core (brighter when producing)
            const coreAlpha = 0.3 + Math.sin(animationTime * 3) * 0.1;
            graphics.circle(star.x, star.y, radius * 0.4);
            graphics.fill({ color: 0xffffff, alpha: coreAlpha });

            // Update label
            label.text = String(star.activeShips);
            label.x = star.x;
            label.y = star.y;
        });
    }

    function renderFlowLinks(stars: StarState[]) {
        if (!linkGraphics) return;

        linkGraphics.clear();

        // Draw lines from stars with targets
        stars.forEach((source) => {
            if (!source.targetId) return;

            const target = stars.find((s) => s.id === source.targetId);
            if (!target) return;

            const color = getPlayerColor(source.ownerId);

            // Draw flow line (dashed effect via alpha)
            const dashPhase = animationTime * 2;
            linkGraphics!.moveTo(source.x, source.y);
            linkGraphics!.lineTo(target.x, target.y);
            linkGraphics!.stroke({ color, width: 2, alpha: 0.3 });

            // Draw arrowhead at target
            const angle = Math.atan2(target.y - source.y, target.x - source.x);
            const arrowSize = 10;
            const arrowX = target.x - Math.cos(angle) * (target.radius + 15);
            const arrowY = target.y - Math.sin(angle) * (target.radius + 15);

            linkGraphics!.moveTo(arrowX, arrowY);
            linkGraphics!.lineTo(
                arrowX - Math.cos(angle - 0.4) * arrowSize,
                arrowY - Math.sin(angle - 0.4) * arrowSize,
            );
            linkGraphics!.moveTo(arrowX, arrowY);
            linkGraphics!.lineTo(
                arrowX - Math.cos(angle + 0.4) * arrowSize,
                arrowY - Math.sin(angle + 0.4) * arrowSize,
            );
            linkGraphics!.stroke({ color, width: 2, alpha: 0.8 });
        });
    }

    function renderShips(stars: StarState[], tickProgress: number) {
        if (!shipGraphics) return;

        shipGraphics.clear();

        stars.forEach((star) => {
            const color = getPlayerColor(star.ownerId);

            if (star.targetId) {
                // SURGE: Ships are attacking, show them moving
                const target = stars.find((s) => s.id === star.targetId);
                if (target) {
                    const surgeShips = getSurgePositions(
                        star.x,
                        star.y,
                        target.x,
                        target.y,
                        star.radius,
                        target.radius,
                        Math.ceil(star.activeShips * 0.3), // Show 30% as "in transit"
                        tickProgress,
                        animationTime,
                    );

                    surgeShips.forEach((ship) => {
                        // Draw ship as triangle
                        drawShip(
                            ship.x,
                            ship.y,
                            ship.rotation,
                            color,
                            ship.scale,
                            ship.alpha,
                        );
                    });
                }
            }

            // ORBIT: Remaining ships orbit the star
            const orbitCount = star.targetId
                ? Math.ceil(star.activeShips * 0.5) // Half orbit when attacking
                : star.activeShips; // All orbit when idle

            const orbitShips = getOrbitPositions(
                star.x,
                star.y,
                star.radius,
                orbitCount,
                animationTime,
                0.3, // Orbit speed
            );

            orbitShips.forEach((ship) => {
                drawShip(ship.x, ship.y, ship.rotation, color, 0.8, 0.8);
            });
        });
    }

    function drawShip(
        x: number,
        y: number,
        rotation: number,
        color: number,
        scale: number,
        alpha: number,
    ) {
        if (!shipGraphics) return;

        const size = 4 * scale;

        // Draw simple triangle ship
        const tipX = x + Math.cos(rotation) * size;
        const tipY = y + Math.sin(rotation) * size;
        const leftX = x + Math.cos(rotation + 2.5) * size * 0.7;
        const leftY = y + Math.sin(rotation + 2.5) * size * 0.7;
        const rightX = x + Math.cos(rotation - 2.5) * size * 0.7;
        const rightY = y + Math.sin(rotation - 2.5) * size * 0.7;

        shipGraphics!.moveTo(tipX, tipY);
        shipGraphics!.lineTo(leftX, leftY);
        shipGraphics!.lineTo(rightX, rightY);
        shipGraphics!.lineTo(tipX, tipY);
        shipGraphics!.fill({ color, alpha });
    }

    // ============================================================================
    // Input Handling
    // ============================================================================

    function hitTestStar(x: number, y: number): StarState | null {
        const snapshot = gameStore.snapshot;
        if (!snapshot) return null;

        for (const star of snapshot.stars) {
            const dist = distance(x, y, star.x, star.y);
            if (dist <= star.radius + 10) {
                // 10px tolerance
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

        // Only allow dragging from own stars
        if (star && star.ownerId === "human-player") {
            isDragging = true;
            dragSourceId = star.id;
            dragStartX = star.x;
            dragStartY = star.y;
            dragCurrentX = x;
            dragCurrentY = y;

            log.state("GameCanvas", `Drag started from star ${star.id}`);
        }
    }

    function handlePointerMove(event: PointerEvent) {
        if (!isDragging) return;

        const rect = canvasContainer.getBoundingClientRect();
        dragCurrentX = event.clientX - rect.left;
        dragCurrentY = event.clientY - rect.top;

        // Render drag preview
        renderDragPreview();
    }

    function handlePointerUp(event: PointerEvent) {
        if (!isDragging || !dragSourceId) {
            cancelDrag();
            return;
        }

        const rect = canvasContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const targetStar = hitTestStar(x, y);

        if (targetStar && targetStar.id !== dragSourceId) {
            // Issue order
            gameStore.issueOrder(dragSourceId, targetStar.id);
            log.success(
                "GameCanvas",
                `Order issued: ${dragSourceId} → ${targetStar.id}`,
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

        if (star && star.ownerId === "human-player" && star.targetId) {
            // Cancel order
            gameStore.cancelOrder(star.id);
            log.state("GameCanvas", `Order cancelled for star ${star.id}`);
        }

        cancelDrag();
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
        if (!dragPreviewGraphics || !isDragging) return;

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

        // Highlight target star if hovering
        const target = hitTestStar(dragCurrentX, dragCurrentY);
        if (target && target.id !== dragSourceId) {
            dragPreviewGraphics.circle(target.x, target.y, target.radius + 15);
            dragPreviewGraphics.stroke({
                color: target.ownerId === "human-player" ? 0x00ff00 : 0xff4466,
                width: 3,
                alpha: 0.8,
            });
        }
    }

    // ============================================================================
    // Reactive Updates
    // ============================================================================

    // The animation loop handles rendering, no need for $effect
</script>

<div
    class="game-canvas"
    role="application"
    aria-label="Game canvas - drag from your stars to attack"
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
