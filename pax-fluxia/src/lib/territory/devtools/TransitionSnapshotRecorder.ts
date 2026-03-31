// ── Territory Transition Snapshot Recorder ──────────────────────────────────
// Debug-only tool: captures before/after geometry snapshots + diagnostic overlays
// on conquest events. Stores bundles in-memory; download on demand.
//
// Architecture: browser-resident. Before/after frames are rendered directly
// from GeometrySnapshot data via Canvas2D — zero transition interpolation.
// File output via <a download> triggered downloads.

import type { TerritoryConquestEvent, OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { GeometrySnapshot, FrontierPolylineShape } from '../contracts/GeometryContracts';
import { computeGeometryTopologyDiff } from '../layers/transition/planners/GeometryTopologyDiff';
import type { TransitionSnapshot, FillTransitionPlan } from '../contracts/TransitionContracts';
import type { TerritoryModeSelection } from '../contracts/TerritoryModeSelection';
import { renderGeometryToCanvas, renderGeometryWithConquestMarkers } from './TransitionGeometryRenderer';
import type { OwnerColorResolver, GeometryRenderOptions } from './TransitionGeometryRenderer';

// ── Types ───────────────────────────────────────────────────────────────────

export interface SnapshotCaptureContext {
    conquestEvents: readonly TerritoryConquestEvent[];
    previousGeometry: GeometrySnapshot | null | undefined;
    nextGeometry: GeometrySnapshot;
    previousOwnership: OwnershipSnapshot | null | undefined;
    nextOwnership: OwnershipSnapshot;
    transition: TransitionSnapshot;
    fillPlan: FillTransitionPlan | null;
    selection: TerritoryModeSelection;
    nowMs: number;
    /** Star world positions for overlay markers */
    starPositions: ReadonlyMap<string, { x: number; y: number }>;
    /** World dimensions for rendering */
    worldWidth: number;
    worldHeight: number;
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
    /** Clean geometry renders — NOT interpolated canvas captures */
    prevCanvas: HTMLCanvasElement | null;
    nextCanvas: HTMLCanvasElement | null;
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

// ── Frontier Diff — delegates to production GeometryTopologyDiff (D-91) ─────
// The diagnostic MUST use the exact same diff as the production transition
// pipeline. Never reimplement diff logic here.

function diffFromProduction(
    previousGeometry: GeometrySnapshot | null | undefined,
    nextGeometry: GeometrySnapshot,
): FrontierDiffResult {
    const topologyDiff = computeGeometryTopologyDiff(
        previousGeometry ?? null,
        nextGeometry,
    );

    // Map production topology categories → diagnostic display categories
    const changed: FrontierPolylineShape[] = [];
    const unchanged: FrontierPolylineShape[] = [];
    const inserted: FrontierPolylineShape[] = [];
    const deleted: FrontierPolylineShape[] = [];

    for (const entry of topologyDiff.frontiers) {
        const shape = {
            ownerPairKey: entry.ownerPairKey,
            points: entry.nextPoints ?? entry.previousPoints ?? [],
        } as unknown as FrontierPolylineShape;
        switch (entry.topology) {
            case 'static': unchanged.push(shape); break;
            case 'drifted': changed.push(shape); break;
            case 'spawned': inserted.push(shape); break;
            case 'vanished': deleted.push(shape); break;
        }
    }

    const { stats } = topologyDiff;
    console.log(
        `[SnapshotRecorder] DIFF (production):` +
        ` unchanged=${stats.staticFrontiers} changed=${stats.driftedFrontiers}` +
        ` inserted=${stats.spawnedFrontiers} deleted=${stats.vanishedFrontiers}` +
        ` | regions: unchanged=${stats.staticRegions} changed=${stats.driftedRegions}` +
        ` inserted=${stats.spawnedRegions} deleted=${stats.vanishedRegions}`,
    );

    return { changed, unchanged, inserted, deleted };
}

// ── Ownership helpers ───────────────────────────────────────────────────────

function buildOwnerMap(ownership: OwnershipSnapshot): ReadonlyMap<string, string> {
    // starOwners is Map<starId, ownerId>
    return ownership.starOwners;
}

// ── Recorder ────────────────────────────────────────────────────────────────

export class TransitionSnapshotRecorder {
    private bundles: TransitionDebugBundle[] = [];
    private maxBundles = 20;
    private enabled = false;
    private tickCounter = 0;
    private colorResolver: OwnerColorResolver | null = null;

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

    /** Set the color resolver for rendering territory fills */
    setColorResolver(resolver: OwnerColorResolver): void {
        this.colorResolver = resolver;
    }

    /** Increment tick counter (call once per frame) */
    tick(): void {
        this.tickCounter++;
    }

    /**
     * Capture a snapshot for a conquest event.
     * Renders CLEAN before/after geometry directly from GeometrySnapshot data.
     * Zero transition interpolation.
     */
    capture(ctx: SnapshotCaptureContext): void {
        if (!this.enabled) return;
        if (!this.colorResolver) {
            console.warn('[SnapshotRecorder] no color resolver set — cannot render geometry');
            return;
        }

        const resolveColor = this.colorResolver;

        // Build render options from world dimensions
        const renderOpts: GeometryRenderOptions = {
            width: ctx.worldWidth,
            height: ctx.worldHeight,
            resolveColor,
        };

        // Build ownership maps for star coloring
        const prevOwnerMap = ctx.previousOwnership ? buildOwnerMap(ctx.previousOwnership) : new Map<string, string>();
        const nextOwnerMap = buildOwnerMap(ctx.nextOwnership);

        // Render PREVIOUS geometry — clean, static, from pure data
        let prevCanvas: HTMLCanvasElement | null = null;
        if (ctx.previousGeometry) {
            prevCanvas = renderGeometryWithConquestMarkers(
                ctx.previousGeometry,
                ctx.starPositions,
                prevOwnerMap,
                ctx.conquestEvents,
                renderOpts,
            );
        }

        // Render NEXT geometry — clean, static, from pure data
        const nextCanvas = renderGeometryWithConquestMarkers(
            ctx.nextGeometry,
            ctx.starPositions,
            nextOwnerMap,
            ctx.conquestEvents,
            renderOpts,
        );

        // Compute frontier diff — delegates to production GeometryTopologyDiff (D-91)
        const frontierDiff = diffFromProduction(ctx.previousGeometry, ctx.nextGeometry);

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
                '00-prev-geometry.png', '01-next-geometry.png',
                '02-frontier-diff-overlay.png', '03-composite.png',
            ],
        };

        const bundleId = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}_star-${ctx.conquestEvents[0]?.starId}_${ctx.conquestEvents[0]?.previousOwner}_to_${ctx.conquestEvents[0]?.newOwner}`;

        const bundle: TransitionDebugBundle = {
            id: bundleId,
            timestamp,
            conquestEvents: ctx.conquestEvents,
            context: ctx,
            prevCanvas,
            nextCanvas,
            frontierDiff,
            starPositions: ctx.starPositions,
            meta,
        };

        this.bundles.push(bundle);
        if (this.bundles.length > this.maxBundles) {
            this.bundles.shift();
        }

        console.log(
            `[SnapshotRecorder] captured: ${bundleId}` +
            ` | changed=${frontierDiff.changed.length}` +
            ` | inserted=${frontierDiff.inserted.length}` +
            ` | deleted=${frontierDiff.deleted.length}` +
            ` | unchanged=${frontierDiff.unchanged.length}` +
            ` | affected=${affectedTerritoryCount}` +
            ` | rendered ${ctx.worldWidth}x${ctx.worldHeight}`,
        );
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
        this.bundles = [];
        console.log('[SnapshotRecorder] cleared all bundles');
    }
}

// ── Singleton for global access ─────────────────────────────────────────────
export const transitionSnapshotRecorder = new TransitionSnapshotRecorder();
