// ── Territory Transition Snapshot Recorder ──────────────────────────────────
// Debug-only tool: captures before/after screenshots + diagnostic overlays
// on conquest events. Stores bundles in-memory; download on demand.
//
// Architecture: browser-resident. Screenshots via PIXI canvas capture.
// File output via <a download> triggered downloads.

import type { TerritoryConquestEvent, OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { GeometrySnapshot, FrontierPolylineShape } from '../contracts/GeometryContracts';
import type { TransitionSnapshot, FillTransitionPlan, BorderTransitionPlan } from '../contracts/TransitionContracts';
import type { TerritoryModeSelection } from '../contracts/TerritoryModeSelection';

// ── Types ───────────────────────────────────────────────────────────────────

export interface SnapshotCaptureContext {
    conquestEvents: readonly TerritoryConquestEvent[];
    previousGeometry: GeometrySnapshot | null | undefined;
    nextGeometry: GeometrySnapshot;
    previousOwnership: OwnershipSnapshot | null | undefined;
    nextOwnership: OwnershipSnapshot;
    transition: TransitionSnapshot;
    fillPlan: FillTransitionPlan | null;
    borderPlan: BorderTransitionPlan | null;
    selection: TerritoryModeSelection;
    nowMs: number;
    /** Star world positions for overlay markers */
    starPositions: ReadonlyMap<string, { x: number; y: number }>;
}

export interface FrontierDiffResult {
    changed: FrontierPolylineShape[];
    unchanged: FrontierPolylineShape[];
    inserted: FrontierPolylineShape[];
    deleted: FrontierPolylineShape[];
}

export interface TransitionDebugBundle {
    id: string;
    timestamp: string;
    conquestEvents: readonly TerritoryConquestEvent[];
    context: SnapshotCaptureContext;
    /** Canvas snapshots captured as ImageBitmap for later rendering */
    prevCanvasBitmap: ImageBitmap | null;
    nextCanvasBitmap: ImageBitmap | null;
    /** Computed frontier diff */
    frontierDiff: FrontierDiffResult;
    /** Star world positions for overlay markers */
    starPositions: ReadonlyMap<string, { x: number; y: number }>;
    /** Metadata for serialization */
    meta: TransitionDebugMeta;
}

export interface TransitionDebugMeta {
    timestamp: string;
    tick: number;
    transitionId: string;
    conquestEvents: readonly TerritoryConquestEvent[];
    prevOwnershipVersion: string;
    nextOwnershipVersion: string;
    prevGeometryFingerprint: string;
    nextGeometryFingerprint: string;
    modes: {
        geometry: string;
        fillTransition: string;
        borderTransition: string;
    };
    changeSummary: {
        changedFrontierCount: number;
        unchangedFrontierCount: number;
        insertedFrontierCount: number;
        deletedFrontierCount: number;
        affectedTerritoryCount: number;
    };
    files: string[];
}

// ── Frontier Diff ───────────────────────────────────────────────────────────

function diffFrontiers(
    prevPolylines: readonly FrontierPolylineShape[],
    nextPolylines: readonly FrontierPolylineShape[],
): FrontierDiffResult {
    const prevKeys = new Map<string, FrontierPolylineShape>();
    for (const p of prevPolylines) prevKeys.set(p.ownerPairKey, p);

    const nextKeys = new Map<string, FrontierPolylineShape>();
    for (const p of nextPolylines) nextKeys.set(p.ownerPairKey, p);

    const changed: FrontierPolylineShape[] = [];
    const unchanged: FrontierPolylineShape[] = [];
    const inserted: FrontierPolylineShape[] = [];
    const deleted: FrontierPolylineShape[] = [];

    // Check next against prev
    for (const [key, nextPoly] of nextKeys) {
        const prevPoly = prevKeys.get(key);
        if (!prevPoly) {
            inserted.push(nextPoly);
        } else if (polylinesDiffer(prevPoly.points, nextPoly.points)) {
            changed.push(nextPoly);
        } else {
            unchanged.push(nextPoly);
        }
    }

    // Check for deleted (in prev but not in next)
    for (const [key, prevPoly] of prevKeys) {
        if (!nextKeys.has(key)) {
            deleted.push(prevPoly);
        }
    }

    // Diagnostic logging
    console.log(
        `[SnapshotRecorder] DIFF: prev has ${prevKeys.size} frontiers, next has ${nextKeys.size}` +
        ` | same-ref=${prevPolylines === nextPolylines}` +
        ` | prev-keys=[${[...prevKeys.keys()].slice(0, 5).join(', ')}${prevKeys.size > 5 ? '...' : ''}]` +
        ` | next-keys=[${[...nextKeys.keys()].slice(0, 5).join(', ')}${nextKeys.size > 5 ? '...' : ''}]`,
    );
    if (changed.length > 0) {
        console.log(`[SnapshotRecorder] CHANGED frontiers: ${changed.map(p => p.ownerPairKey).join(', ')}`);
    }
    if (inserted.length > 0) {
        console.log(`[SnapshotRecorder] INSERTED frontiers: ${inserted.map(p => p.ownerPairKey).join(', ')}`);
    }
    if (deleted.length > 0) {
        console.log(`[SnapshotRecorder] DELETED frontiers: ${deleted.map(p => p.ownerPairKey).join(', ')}`);
    }

    return { changed, unchanged, inserted, deleted };
}

function polylinesDiffer(a: readonly [number, number][], b: readonly [number, number][]): boolean {
    if (a.length !== b.length) return true;
    for (let i = 0; i < a.length; i++) {
        if (Math.abs(a[i][0] - b[i][0]) > 0.5 || Math.abs(a[i][1] - b[i][1]) > 0.5) {
            return true;
        }
    }
    return false;
}

// ── Recorder ────────────────────────────────────────────────────────────────

export class TransitionSnapshotRecorder {
    private bundles: TransitionDebugBundle[] = [];
    private maxBundles = 20;
    private enabled = false;
    private captureCanvas: HTMLCanvasElement | null = null;
    private tickCounter = 0;

    /** Enable/disable the recorder */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            console.log('[SnapshotRecorder] disabled');
        } else {
            console.log('[SnapshotRecorder] enabled — waiting for conquest events');
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    /** Set the PIXI canvas reference for screenshot capture */
    setCanvas(canvas: HTMLCanvasElement): void {
        this.captureCanvas = canvas;
    }

    /** Increment tick counter (call once per frame) */
    tick(): void {
        this.tickCounter++;
    }

    /**
     * Capture a snapshot for a conquest event.
     * Called from TerritoryRuntimeCoordinator BEFORE the new frame is drawn,
     * so the canvas still shows the previous state.
     */
    async capture(ctx: SnapshotCaptureContext): Promise<void> {
        if (!this.enabled) return;

        // Capture the previous-state canvas (it hasn't been redrawn yet)
        let prevBitmap: ImageBitmap | null = null;
        if (this.captureCanvas) {
            try {
                prevBitmap = await createImageBitmap(this.captureCanvas);
            } catch (e) {
                console.warn('[SnapshotRecorder] failed to capture prev canvas:', e);
            }
        }

        // Compute frontier diff
        const prevPolylines = ctx.previousGeometry?.frontierPolylines ?? [];
        const nextPolylines = ctx.nextGeometry.frontierPolylines;
        const frontierDiff = diffFrontiers(prevPolylines, nextPolylines);

        // Compute affected territory count
        const affectedOwners = new Set<string>();
        for (const evt of ctx.conquestEvents) {
            affectedOwners.add(evt.previousOwner);
            affectedOwners.add(evt.newOwner);
        }
        const affectedTerritoryCount = ctx.nextGeometry.territoryRegions
            .filter(r => affectedOwners.has(r.ownerId))
            .length;

        // Build metadata
        const now = new Date();
        const timestamp = now.toISOString();
        const transitionId = ctx.transition.envelope?.transitionId ?? `snap:${ctx.nowMs}`;

        const meta: TransitionDebugMeta = {
            timestamp,
            tick: this.tickCounter,
            transitionId,
            conquestEvents: ctx.conquestEvents,
            prevOwnershipVersion: ctx.previousOwnership?.version ?? 'none',
            nextOwnershipVersion: ctx.nextOwnership.version,
            prevGeometryFingerprint: ctx.previousGeometry?.version ?? 'none',
            nextGeometryFingerprint: ctx.nextGeometry.version,
            modes: {
                geometry: ctx.selection.geometryMode,
                fillTransition: ctx.selection.fillTransitionMode,
                borderTransition: ctx.selection.borderTransitionMode,
            },
            changeSummary: {
                changedFrontierCount: frontierDiff.changed.length,
                unchangedFrontierCount: frontierDiff.unchanged.length,
                insertedFrontierCount: frontierDiff.inserted.length,
                deletedFrontierCount: frontierDiff.deleted.length,
                affectedTerritoryCount,
            },
            files: [
                '00-prev.png', '01-next.png',
                '02-prev-changed-frontiers.png', '03-next-changed-frontiers.png',
                '04-plan-anchors.png', '05-plan-rings.png', '06-composite.png',
            ],
        };

        const bundleId = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}_star-${ctx.conquestEvents[0]?.starId}_${ctx.conquestEvents[0]?.previousOwner}_to_${ctx.conquestEvents[0]?.newOwner}`;

        const bundle: TransitionDebugBundle = {
            id: bundleId,
            timestamp,
            conquestEvents: ctx.conquestEvents,
            context: ctx,
            prevCanvasBitmap: prevBitmap,
            nextCanvasBitmap: null, // Will be captured after next frame draws
            frontierDiff,
            starPositions: ctx.starPositions,
            meta,
        };

        this.bundles.push(bundle);
        if (this.bundles.length > this.maxBundles) {
            const removed = this.bundles.shift();
            removed?.prevCanvasBitmap?.close();
            removed?.nextCanvasBitmap?.close();
        }

        console.log(
            `[SnapshotRecorder] captured: ${bundleId}` +
            ` | changed=${frontierDiff.changed.length}` +
            ` | inserted=${frontierDiff.inserted.length}` +
            ` | deleted=${frontierDiff.deleted.length}` +
            ` | unchanged=${frontierDiff.unchanged.length}` +
            ` | affected territories=${affectedTerritoryCount}`,
        );
    }

    /**
     * Capture the "next state" canvas. Call this AFTER the new frame has been drawn.
     * Attaches to the most recent bundle that's missing its next bitmap.
     */
    async captureNextFrame(): Promise<void> {
        if (!this.enabled || !this.captureCanvas) return;

        const lastBundle = this.bundles[this.bundles.length - 1];
        if (!lastBundle || lastBundle.nextCanvasBitmap) return;

        try {
            lastBundle.nextCanvasBitmap = await createImageBitmap(this.captureCanvas);
            console.log(`[SnapshotRecorder] captured next-frame for: ${lastBundle.id}`);
        } catch (e) {
            console.warn('[SnapshotRecorder] failed to capture next canvas:', e);
        }
    }

    /** Get all stored bundles */
    getBundles(): readonly TransitionDebugBundle[] {
        return this.bundles;
    }

    /** Get bundle count */
    get count(): number {
        return this.bundles.length;
    }

    /** Clear all bundles */
    clear(): void {
        for (const b of this.bundles) {
            b.prevCanvasBitmap?.close();
            b.nextCanvasBitmap?.close();
        }
        this.bundles = [];
        console.log('[SnapshotRecorder] cleared all bundles');
    }
}

// ── Singleton for global access ─────────────────────────────────────────────
// The recorder instance. Injected into TerritoryRuntimeCoordinator.
export const transitionSnapshotRecorder = new TransitionSnapshotRecorder();
