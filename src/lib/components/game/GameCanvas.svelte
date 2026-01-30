<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import * as PIXI from "pixi.js";
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import { log } from "$lib/utils/logger";
    import type { StarState } from "$lib/types/game.types";

    // ============================================================================
    // PixiJS Application
    // ============================================================================

    let canvasContainer: HTMLDivElement;
    let app: PIXI.Application | null = null;
    let starGraphics: Map<string, PIXI.Graphics> = new Map();
    let starLabels: Map<string, PIXI.Text> = new Map();
    let linkGraphics: PIXI.Graphics | null = null;
    let starsContainer: PIXI.Container | null = null;
    let labelsContainer: PIXI.Container | null = null;

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

        // Create graphics layers (order matters: links below stars)
        linkGraphics = new PIXI.Graphics();
        app.stage.addChild(linkGraphics);

        starsContainer = new PIXI.Container();
        app.stage.addChild(starsContainer);

        labelsContainer = new PIXI.Container();
        app.stage.addChild(labelsContainer);

        log.success(
            "GameCanvas",
            `PixiJS initialized (${app.screen.width}x${app.screen.height})`,
        );

        // Initial render
        if (gameStore.snapshot) {
            renderStars(gameStore.snapshot.stars);
        }

        // Handle window resize
        window.addEventListener("resize", handleResize);
    });

    onDestroy(() => {
        log.sys("GameCanvas", "Destroying PixiJS application");

        window.removeEventListener("resize", handleResize);

        if (app) {
            app.destroy(true, { children: true });
            app = null;
        }

        starGraphics.clear();
        starLabels.clear();
        linkGraphics = null;
        starsContainer = null;
        labelsContainer = null;
    });

    // ============================================================================
    // Rendering
    // ============================================================================

    function handleResize() {
        if (app) {
            app.resize();
            log.data(
                "GameCanvas",
                `Resized to ${app.screen.width}x${app.screen.height}`,
            );
        }
    }

    function getPlayerColor(ownerId: string): number {
        return PLAYER_COLORS[ownerId] ?? 0x888888;
    }

    function renderStars(stars: StarState[]) {
        if (!app || !starsContainer || !labelsContainer) return;

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

        // Update or create star graphics
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

            // Outer glow ring
            graphics.circle(star.x, star.y, radius + 8);
            graphics.fill({ color, alpha: 0.15 });

            // Main star body
            graphics.circle(star.x, star.y, radius);
            graphics.fill({ color, alpha: 0.6 });
            graphics.stroke({ color, width: 2, alpha: 1 });

            // Inner core
            graphics.circle(star.x, star.y, radius * 0.4);
            graphics.fill({ color: 0xffffff, alpha: 0.3 });

            // Update label
            label.text = String(star.activeShips);
            label.x = star.x;
            label.y = star.y;
        });

        // Render flow links
        renderFlowLinks(stars);
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

            // Draw flow line
            linkGraphics!.moveTo(source.x, source.y);
            linkGraphics!.lineTo(target.x, target.y);
            linkGraphics!.stroke({ color, width: 2, alpha: 0.5 });

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

    // ============================================================================
    // Reactive Updates
    // ============================================================================

    // Watch for snapshot changes
    $effect(() => {
        const snapshot = gameStore.snapshot;
        if (snapshot && app) {
            renderStars(snapshot.stars);
        }
    });
</script>

<div class="game-canvas" bind:this={canvasContainer}></div>

<style>
    .game-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    .game-canvas :global(canvas) {
        display: block;
        width: 100% !important;
        height: 100% !important;
    }
</style>
