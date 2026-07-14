/**
 * Canvas client-rect cache.
 *
 * getBoundingClientRect() forces a layout flush, and pointer handling needs the
 * rect on every move event. So it is read once and held until something that can
 * actually move the canvas (resize, orientation change, viewport geometry
 * change) marks it dirty.
 *
 * Extracted from GameCanvas.svelte (Stage 5).
 */
import { measurePerf } from "$lib/perf/perfProbe";

export interface CanvasClientRectSnapshot {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

const EMPTY_RECT: CanvasClientRectSnapshot = {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
};

export interface CanvasClientRectCache {
    /** Mark the cached rect stale. Cheap; the re-read is deferred to next use. */
    invalidate: () => void;
    /** The canvas rect, re-reading from layout only when dirty. */
    get: (reason: string) => CanvasClientRectSnapshot;
    /** Client coords -> canvas-local coords, plus the rect used to convert. */
    toLocalPoint: (
        clientX: number,
        clientY: number,
        reason: string,
    ) => { x: number; y: number; rect: CanvasClientRectSnapshot };
}

/**
 * @param getElement the canvas container; a getter because it is bound after
 * mount and can be torn down while handlers still hold this cache.
 */
export function createCanvasClientRectCache(
    getElement: () => HTMLElement | null | undefined,
): CanvasClientRectCache {
    let cache: CanvasClientRectSnapshot | null = null;
    let dirty = true;

    function read(): CanvasClientRectSnapshot {
        const element = getElement();
        if (!element) return { ...EMPTY_RECT };
        const rect = element.getBoundingClientRect();
        return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
        };
    }

    function get(reason: string): CanvasClientRectSnapshot {
        if (!cache || dirty) {
            cache = measurePerf("game.input.clientRect.refresh", () => read(), {
                reason,
                dirty,
            });
            dirty = false;
        }
        return cache;
    }

    return {
        invalidate: () => {
            dirty = true;
        },
        get,
        toLocalPoint: (clientX, clientY, reason) => {
            const rect = get(reason);
            return {
                x: clientX - rect.left,
                y: clientY - rect.top,
                rect,
            };
        },
    };
}
