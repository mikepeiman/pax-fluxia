/**
 * Interaction overlay — the 2D canvas layered over the Pixi stage that draws
 * order arrows, the selection ring and the drag preview.
 *
 * It is a pure PROJECTION of interaction state: it only ever reads that state,
 * never writes it. Which is why it takes a snapshot reader rather than owning
 * the state — the pointer handlers remain the single writer.
 *
 * Renders are keyed: a frame whose inputs hash to the last rendered key is
 * skipped. That gate is the reason this overlay can be re-rendered from pointer
 * handlers, the render loop, and resize without cost.
 *
 * Extracted from GameCanvas.svelte (Stage 5).
 */
import { renderInteractionOverlay } from "$lib/renderers/InteractionOverlayRenderer";
import { measurePerf } from "$lib/perf/perfProbe";
import type { StarState } from "$lib/types/game.types";
import type { CanvasClientRectSnapshot } from "./canvasClientRect";

export interface OverlayStageTransform {
    scaleX: number;
    scaleY: number;
    offsetX: number;
    offsetY: number;
}

/** Everything the overlay reads about the current interaction, per frame. */
export interface InteractionOverlaySnapshot {
    activeStarId: string | null;
    dragSourceId: string | null;
    dragHoverTargetId: string | null;
    isDragging: boolean;
    dragSourceCenterX: number;
    dragSourceCenterY: number;
    dragCurrentX: number;
    dragCurrentY: number;
    pendingOrders: ReadonlySet<string>;
    deferredOrders: ReadonlySet<string>;
}

export interface InteractionOverlayDeps {
    getCanvas: () => HTMLCanvasElement | null;
    getContainer: () => HTMLElement | null | undefined;
    /** Null when the Pixi app is not up yet; the overlay then does not render. */
    getStageTransform: () => OverlayStageTransform | null;
    getCanvasRect: (reason: string) => CanvasClientRectSnapshot;
    screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
    ensureStars: () => ReadonlyArray<StarState>;
    getStarsById: () => ReadonlyMap<string, StarState>;
    getInteraction: () => InteractionOverlaySnapshot;
    projectWorldPoint: (point: { x: number; y: number }) => {
        x: number;
        y: number;
    };
    isLocalPlayerStar: (star: StarState) => boolean;
    /** Getter, not a value: colorUtils is constructed after this factory runs. */
    getColorUtils: () => unknown;
    /** Session id, to drop a scheduled render that belongs to a finished game. */
    getSessionId: () => number;
    /** Called after a real (non-skipped) render lands. */
    onRendered: () => void;
}

export interface InteractionOverlay {
    /** Render immediately unless the render key is unchanged. Returns true if drawn. */
    renderNow: () => boolean;
    /** Coalesce a render into the next animation frame. */
    schedule: (reason: string) => void;
    /** Wipe the surface and drop the render key (so the next render is forced). */
    clear: () => void;
    /**
     * Teardown: clear, then release the cached 2D context. Must run BEFORE the
     * component drops its canvas ref, since clearing needs the canvas.
     */
    dispose: () => void;
}

function buildOrderKey(stars: ReadonlyArray<StarState>): string {
    let key = "";
    for (const star of stars) {
        if (star.targetId) {
            key += `s:${star.id}>${star.targetId}|`;
        }
        if (star.queuedOrderTargetId) {
            key += `q:${star.id}>${star.queuedOrderTargetId}|`;
        }
    }
    return key;
}

function buildSetKey(values: ReadonlySet<string>): string {
    if (values.size === 0) return "";
    return [...values].sort().join(",");
}

export function createInteractionOverlay(
    deps: InteractionOverlayDeps,
): InteractionOverlay {
    let ctx: CanvasRenderingContext2D | null = null;
    let animationFrameId: number | null = null;
    let lastRenderKey: string | null = null;

    /**
     * The drag line's live end, in world space. Null unless a drag is actually
     * in flight — the render key and the draw call must agree on that, so both
     * read it from here.
     */
    function dragCurrentWorld(
        interaction: InteractionOverlaySnapshot,
    ): { x: number; y: number } | null {
        if (!interaction.isDragging || !interaction.dragSourceId) return null;
        return deps.screenToWorld(
            interaction.dragCurrentX,
            interaction.dragCurrentY,
        );
    }

    function syncSurface(): { width: number; height: number } | null {
        const canvas = deps.getCanvas();
        if (!canvas || !deps.getContainer()) return null;
        const rect = deps.getCanvasRect("interactionOverlay.surface");
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const pixelWidth = Math.max(1, Math.round(width * dpr));
        const pixelHeight = Math.max(1, Math.round(height * dpr));
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
        }
        ctx ??= canvas.getContext("2d");
        if (!ctx) return null;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { width, height };
    }

    function clear(): void {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        const canvas = deps.getCanvas();
        if (!canvas) {
            lastRenderKey = null;
            return;
        }
        const surfaceCtx = ctx ?? canvas.getContext("2d");
        if (!surfaceCtx) {
            lastRenderKey = null;
            return;
        }
        ctx = surfaceCtx;
        surfaceCtx.save();
        surfaceCtx.setTransform(1, 0, 0, 1, 0, 0);
        surfaceCtx.clearRect(0, 0, canvas.width, canvas.height);
        surfaceCtx.restore();
        lastRenderKey = null;
    }

    function buildRenderKey(params: {
        stars: ReadonlyArray<StarState>;
        surface: { width: number; height: number };
        transform: OverlayStageTransform;
        interaction: InteractionOverlaySnapshot;
    }): string {
        const { transform, interaction } = params;
        const dragWorld = dragCurrentWorld(interaction);
        return [
            params.surface.width,
            params.surface.height,
            transform.scaleX.toFixed(3),
            transform.scaleY.toFixed(3),
            transform.offsetX.toFixed(1),
            transform.offsetY.toFixed(1),
            interaction.activeStarId ?? "",
            interaction.dragSourceId ?? "",
            interaction.dragHoverTargetId ?? "",
            interaction.isDragging ? "1" : "0",
            interaction.dragSourceCenterX.toFixed(1),
            interaction.dragSourceCenterY.toFixed(1),
            dragWorld ? dragWorld.x.toFixed(1) : "",
            dragWorld ? dragWorld.y.toFixed(1) : "",
            buildSetKey(interaction.pendingOrders),
            buildSetKey(interaction.deferredOrders),
            buildOrderKey(params.stars),
        ].join("::");
    }

    function renderNow(): boolean {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        const transform = deps.getStageTransform();
        if (!transform) return false;
        const surface = syncSurface();
        if (!surface || !ctx) return false;

        const stars = deps.ensureStars();
        const interaction = deps.getInteraction();
        const renderKey = buildRenderKey({
            stars,
            surface,
            transform,
            interaction,
        });
        if (renderKey === lastRenderKey) return false;

        const dragWorld = dragCurrentWorld(interaction);
        renderInteractionOverlay({
            ctx,
            canvasWidth: surface.width,
            canvasHeight: surface.height,
            stars: stars as StarState[],
            starsById: deps.getStarsById(),
            pendingOrders: interaction.pendingOrders,
            deferredOrders: interaction.deferredOrders,
            activeStarId: interaction.activeStarId,
            dragSourceId: interaction.dragSourceId,
            dragHoverTargetId: interaction.dragHoverTargetId,
            isDragging: interaction.isDragging,
            dragSourceCenter: dragWorld
                ? {
                      x: interaction.dragSourceCenterX,
                      y: interaction.dragSourceCenterY,
                  }
                : null,
            dragCurrentWorld: dragWorld,
            transform,
            projectWorldPoint: deps.projectWorldPoint,
            isLocalPlayerStar: deps.isLocalPlayerStar,
            colorUtils: deps.getColorUtils(),
        } as Parameters<typeof renderInteractionOverlay>[0]);
        lastRenderKey = renderKey;
        deps.onRendered();
        return true;
    }

    function schedule(reason: string): void {
        if (animationFrameId !== null) return;
        const scheduledSessionId = deps.getSessionId();
        const interaction = deps.getInteraction();
        animationFrameId = requestAnimationFrame(() => {
            animationFrameId = null;
            measurePerf(
                "game.input.dragPreview.present",
                () => {
                    // A render queued before a new game must not paint the old one.
                    if (scheduledSessionId !== deps.getSessionId()) {
                        clear();
                        return;
                    }
                    renderNow();
                },
                {
                    reason,
                    isDragging: interaction.isDragging,
                    dragSourceId: interaction.dragSourceId,
                    dragHoverTargetId: interaction.dragHoverTargetId,
                },
            );
        });
    }

    return {
        renderNow,
        schedule,
        clear,
        dispose: () => {
            clear();
            ctx = null;
        },
    };
}
