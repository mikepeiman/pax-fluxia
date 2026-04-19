import { writable } from 'svelte/store';

export interface MetaballGridStats {
    readonly requestedSpacingPx: number;
    readonly effectiveSpacingPx: number;
    readonly totalCells: number;
    readonly emittableCells: number;
    readonly paintedCells: number;
    readonly lastUpdateMs: number;
    readonly emaUpdateMs: number;
    readonly lastFrameSkipped: boolean;
    readonly frameCount: number;
    readonly skippedFrameCount: number;
}

const INITIAL: MetaballGridStats = {
    requestedSpacingPx: 0,
    effectiveSpacingPx: 0,
    totalCells: 0,
    emittableCells: 0,
    paintedCells: 0,
    lastUpdateMs: 0,
    emaUpdateMs: 0,
    lastFrameSkipped: false,
    frameCount: 0,
    skippedFrameCount: 0,
};

export const metaballGridStats = writable<MetaballGridStats>(INITIAL);

export function updateMetaballGridStats(
    patch: Partial<MetaballGridStats>,
): void {
    metaballGridStats.update((prev) => ({ ...prev, ...patch }));
}

export function resetMetaballGridStats(): void {
    metaballGridStats.set(INITIAL);
}
