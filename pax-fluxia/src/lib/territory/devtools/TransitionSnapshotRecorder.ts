// ── Territory Transition Snapshot Recorder ──────────────────────────────────
// Debug-only tool: captures before/after geometry snapshots + diagnostic overlays
// on conquest events. Stores bundles in-memory; download on demand.
//
// Architecture: browser-resident. Before/after frames are rendered directly
// from GeometrySnapshot data via Canvas2D — zero transition interpolation.
// File output via <a download> triggered downloads.

import type { TerritoryConquestEvent, OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { GeometrySnapshot, FrontierPolylineShape } from '../contracts/GeometryContracts';
import type { FrontierTopology } from '../contracts/FrontierTopologyContracts';
import { computeGeometryTopologyDiff } from '../layers/transition/planners/GeometryTopologyDiff';
import type { TransitionSnapshot, FillTransitionPlan } from '../contracts/TransitionContracts';
import type { TerritoryModeSelection } from '../contracts/TerritoryModeSelection';
import type { TerritoryFrameInput } from '../contracts/TerritoryFrameInput';
import type { ActiveFrontTransitionPlan } from '../layers/transition/ActiveFrontTransition';
import { renderGeometryToCanvas, renderGeometryWithConquestMarkers } from './TransitionGeometryRenderer';
import type { OwnerColorResolver, GeometryRenderOptions } from './TransitionGeometryRenderer';
import { renderTransitionFrameSeries } from './TransitionFrontierFrameRenderer';
import type { FrameRenderOptions } from './TransitionFrontierFrameRenderer';
import { compactGeometrySnapshotForExport } from './snapshotExport';
import { buildConquestFilePrefix } from './conquestNaming';
import { writable } from 'svelte/store';

// ── Types ───────────────────────────────────────────────────────────────────

export interface SnapshotCaptureContext {
    frameInput: TerritoryFrameInput;
    conquestEvents: readonly TerritoryConquestEvent[];
    previousGeometry: GeometrySnapshot | null | undefined;
    nextGeometry: GeometrySnapshot;
    previousOwnership: OwnershipSnapshot | null | undefined;
    nextOwnership: OwnershipSnapshot;
    transition: TransitionSnapshot;
    fillPlan: FillTransitionPlan | null;
    /** Active front transition plan — enables multi-frame capture */
    activeFrontPlan: ActiveFrontTransitionPlan | null;
    /** Frontier topology pair — needed for vertex/anchor overlays */
    prevFrontierTopology: FrontierTopology | null;
    nextFrontierTopology: FrontierTopology | null;
    selection: TerritoryModeSelection;
    nowMs: number;
    /** Star world positions for overlay markers */
    starPositions: ReadonlyMap<string, { x: number; y: number }>;
    /** World dimensions for rendering */
    worldWidth: number;
    worldHeight: number;
    /** Optional mode-specific diagnostics captured from the runtime. */
    extraDiagnostics?: unknown;
}

/**
 * Polyline-level diff from `computeGeometryTopologyDiff` (ownerPairKey + segment index).
 * NOT the same as transition "birth/death" — see `polylineDiffSemantics` on meta.
 */
export interface FrontierDiffResult {
    drifted: FrontierPolylineShape[];
    staticPolylines: FrontierPolylineShape[];
    /** `spawned`: new ownerPairKey in next, or more segments than prev at same key */
    appearedKeyOrSegment: FrontierPolylineShape[];
    /** `vanished`: key missing in next, or fewer segments than prev at same key */
    removedKeyOrSegment: FrontierPolylineShape[];
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
    /**
     * Multi-frame transition captures at sampled progress values (0→1).
     * Null if no ActiveFrontTransitionPlan was available at capture time.
     */
    transitionFrames: { progress: number; canvas: HTMLCanvasElement }[] | null;
    /** Optional mode-specific diagnostics captured from the actual render path. */
    extraDiagnostics?: unknown;
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
    /** Explains polyline diff categories — not conceptual frontier birth/death */
    polylineDiffSemantics: string;
    changeSummary: {
        polylineDriftedCount: number;
        polylineStaticCount: number;
        polylineKeyOrSegmentAppearedCount: number;
        polylineKeyOrSegmentRemovedCount: number;
        affectedTerritoryCount: number;
    };
    files: string[];
}

export interface TransitionSnapshotRecorderState {
    enabled: boolean;
    bundles: readonly TransitionDebugBundle[];
    version: number;
}

export const transitionSnapshotRecorderStore = writable<TransitionSnapshotRecorderState>({
    enabled: false,
    bundles: [],
    version: 0,
});

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

    const drifted: FrontierPolylineShape[] = [];
    const staticPolylines: FrontierPolylineShape[] = [];
    const appearedKeyOrSegment: FrontierPolylineShape[] = [];
    const removedKeyOrSegment: FrontierPolylineShape[] = [];

    for (const entry of topologyDiff.frontiers) {
        const shape = {
            ownerPairKey: entry.ownerPairKey,
            points: entry.nextPoints ?? entry.previousPoints ?? [],
        } as unknown as FrontierPolylineShape;
        switch (entry.topology) {
            case 'static': staticPolylines.push(shape); break;
            case 'drifted': drifted.push(shape); break;
            case 'spawned': appearedKeyOrSegment.push(shape); break;
            case 'vanished': removedKeyOrSegment.push(shape); break;
        }
    }

    const { stats } = topologyDiff;
    console.log(
        `[SnapshotRecorder] DIFF (polyline index):` +
        ` static=${stats.staticFrontiers} drifted=${stats.driftedFrontiers}` +
        ` appearedKeyOrSeg=${stats.spawnedFrontiers} removedKeyOrSeg=${stats.vanishedFrontiers}` +
        ` | regions: static=${stats.staticRegions} drifted=${stats.driftedRegions}` +
        ` appeared=${stats.spawnedRegions} removed=${stats.vanishedRegions}`,
    );

    return { drifted, staticPolylines, appearedKeyOrSegment, removedKeyOrSegment };
}

const POLYLINE_DIFF_SEMANTICS =
    'Polyline diff compares `GeometrySnapshot.frontierPolylines` grouped by ownerPairKey and segment index. ' +
    '"appearedKeyOrSegment" = spawned: new key in next OR extra segment index vs prev. ' +
    '"removedKeyOrSegment" = vanished: key gone in next OR fewer segments. ' +
    'This is a structural multiset diff for debug overlays — not "birth" of a frontier in the transition spec.';

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

    private emitState(): void {
        transitionSnapshotRecorderStore.set({
            enabled: this.enabled,
            bundles: [...this.bundles],
            version: Date.now(),
        });
    }

    /** Enable/disable the recorder */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            console.log('[SnapshotRecorder] disabled');
        } else {
            console.log('[SnapshotRecorder] enabled — waiting for conquest events');
        }
        this.emitState();
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

        // Generate multi-frame transition sequence if topology + plan are available
        let transitionFrames: { progress: number; canvas: HTMLCanvasElement }[] | null = null;
        if (ctx.activeFrontPlan && ctx.prevFrontierTopology && ctx.nextFrontierTopology) {
            const frameOpts: FrameRenderOptions = {
                width: ctx.worldWidth,
                height: ctx.worldHeight,
                resolveColor,
                fillAlpha: 0.35,
                showVertexLabels: true,
                showAllVertices: true,
                transitionVertexCount:
                    ctx.frameInput.tunables.pvv4TransitionVertexCount,
            };
            try {
                transitionFrames = renderTransitionFrameSeries(
                    ctx.prevFrontierTopology,
                    ctx.nextFrontierTopology,
                    ctx.activeFrontPlan,
                    frameOpts,
                );
                console.log(`[SnapshotRecorder] generated ${transitionFrames.length} transition frames`);
            } catch (err) {
                console.warn('[SnapshotRecorder] frame generation failed:', err);
            }
        } else {
            console.log('[SnapshotRecorder] no activeFrontPlan/topology — skipping frame series');
        }

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

        const exportPrefix = buildConquestFilePrefix(
            timestamp,
            ctx.conquestEvents,
            transitionId,
        );
        const frameFiles = transitionFrames?.map((f, i) =>
            `${exportPrefix}_frame_${String(i).padStart(2, '0')}_t${Math.round(f.progress * 100).toString().padStart(3, '0')}.png`,
        ) ?? [];

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
            polylineDiffSemantics: POLYLINE_DIFF_SEMANTICS,
            changeSummary: {
                polylineDriftedCount: frontierDiff.drifted.length,
                polylineStaticCount: frontierDiff.staticPolylines.length,
                polylineKeyOrSegmentAppearedCount: frontierDiff.appearedKeyOrSegment.length,
                polylineKeyOrSegmentRemovedCount: frontierDiff.removedKeyOrSegment.length,
                affectedTerritoryCount,
            },
            files: [
                `${exportPrefix}_prev-geometry.png`,
                `${exportPrefix}_next-geometry.png`,
                `${exportPrefix}_frontier-diff-overlay.png`,
                `${exportPrefix}_composite.png`,
                ...frameFiles,
                `${exportPrefix}_meta.json`,
                `${exportPrefix}_01_frame_input.json`,
                `${exportPrefix}_02_ownership_prev.json`,
                `${exportPrefix}_02_ownership_next.json`,
                `${exportPrefix}_03_geometry_prev_full.json`,
                `${exportPrefix}_03_geometry_next_full.json`,
                `${exportPrefix}_04_topology_prev_full.json`,
                `${exportPrefix}_04_topology_next_full.json`,
                `${exportPrefix}_05_transition_snapshot.json`,
                `${exportPrefix}_05_transition_truth.json`,
                `${exportPrefix}_05_active_front_plan.json`,
                `${exportPrefix}_compact_diag.json`,
                `${exportPrefix}_compact_topology.json`,
                `${exportPrefix}_compact_geometry.json`,
            ],
        };

        const bundleId = exportPrefix;

        const bundle: TransitionDebugBundle = {
            id: bundleId,
            timestamp,
            conquestEvents: ctx.conquestEvents,
            context: ctx,
            prevCanvas,
            nextCanvas,
            frontierDiff,
            starPositions: ctx.starPositions,
            transitionFrames,
            extraDiagnostics: ctx.extraDiagnostics,
            meta,
        };

        this.bundles.push(bundle);
        if (this.bundles.length > this.maxBundles) {
            this.bundles.shift();
        }
        this.emitState();

        console.log(
            `[SnapshotRecorder] captured: ${bundleId}` +
            ` | drifted=${frontierDiff.drifted.length}` +
            ` | appearedKeyOrSeg=${frontierDiff.appearedKeyOrSegment.length}` +
            ` | removedKeyOrSeg=${frontierDiff.removedKeyOrSegment.length}` +
            ` | static=${frontierDiff.staticPolylines.length}` +
            ` | affected=${affectedTerritoryCount}` +
            ` | rendered ${ctx.worldWidth}x${ctx.worldHeight}`,
        );
    }

    capturePreRendered(params: {
        ctx: SnapshotCaptureContext;
        prevCanvas: HTMLCanvasElement | null;
        nextCanvas: HTMLCanvasElement | null;
        transitionFrames: { progress: number; canvas: HTMLCanvasElement }[] | null;
        extraDiagnostics?: unknown;
    }): void {
        if (!this.enabled) return;

        const ctx = params.ctx;
        const frontierDiff = diffFromProduction(ctx.previousGeometry, ctx.nextGeometry);

        const affectedOwners = new Set<string>();
        for (const evt of ctx.conquestEvents) {
            affectedOwners.add(evt.previousOwner);
            affectedOwners.add(evt.newOwner);
        }
        const affectedTerritoryCount = ctx.nextGeometry.territoryRegions
            .filter((r) => affectedOwners.has(r.ownerId))
            .length;

        const now = new Date();
        const timestamp = now.toISOString();
        const transitionId = ctx.transition.envelope?.transitionId ?? `snap:${ctx.nowMs}`;

        const exportPrefix = buildConquestFilePrefix(
            timestamp,
            ctx.conquestEvents,
            transitionId,
        );
        const frameFiles = params.transitionFrames?.map((f, i) =>
            `${exportPrefix}_frame_${String(i).padStart(2, '0')}_t${Math.round(f.progress * 100).toString().padStart(3, '0')}.png`,
        ) ?? [];

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
            polylineDiffSemantics: POLYLINE_DIFF_SEMANTICS,
            changeSummary: {
                polylineDriftedCount: frontierDiff.drifted.length,
                polylineStaticCount: frontierDiff.staticPolylines.length,
                polylineKeyOrSegmentAppearedCount:
                    frontierDiff.appearedKeyOrSegment.length,
                polylineKeyOrSegmentRemovedCount:
                    frontierDiff.removedKeyOrSegment.length,
                affectedTerritoryCount,
            },
            files: [
                `${exportPrefix}_prev-geometry.png`,
                `${exportPrefix}_next-geometry.png`,
                `${exportPrefix}_frontier-diff-overlay.png`,
                `${exportPrefix}_composite.png`,
                ...frameFiles,
                `${exportPrefix}_meta.json`,
                `${exportPrefix}_01_frame_input.json`,
                `${exportPrefix}_02_ownership_prev.json`,
                `${exportPrefix}_02_ownership_next.json`,
                `${exportPrefix}_03_geometry_prev_full.json`,
                `${exportPrefix}_03_geometry_next_full.json`,
                `${exportPrefix}_04_topology_prev_full.json`,
                `${exportPrefix}_04_topology_next_full.json`,
                `${exportPrefix}_05_transition_snapshot.json`,
                `${exportPrefix}_05_transition_truth.json`,
                `${exportPrefix}_05_active_front_plan.json`,
                `${exportPrefix}_compact_diag.json`,
                `${exportPrefix}_compact_topology.json`,
                `${exportPrefix}_compact_geometry.json`,
            ],
        };

        const bundleId = exportPrefix;
        const bundle: TransitionDebugBundle = {
            id: bundleId,
            timestamp,
            conquestEvents: ctx.conquestEvents,
            context: ctx,
            prevCanvas: params.prevCanvas,
            nextCanvas: params.nextCanvas,
            frontierDiff,
            starPositions: ctx.starPositions,
            transitionFrames: params.transitionFrames,
            extraDiagnostics: params.extraDiagnostics,
            meta,
        };

        this.bundles.push(bundle);
        if (this.bundles.length > this.maxBundles) {
            this.bundles.shift();
        }
        this.emitState();

        console.log(
            `[SnapshotRecorder] captured pre-rendered: ${bundleId}` +
            ` | drifted=${frontierDiff.drifted.length}` +
            ` | appearedKeyOrSeg=${frontierDiff.appearedKeyOrSegment.length}` +
            ` | removedKeyOrSeg=${frontierDiff.removedKeyOrSegment.length}` +
            ` | static=${frontierDiff.staticPolylines.length}` +
            ` | affected=${affectedTerritoryCount}` +
            ` | frames=${params.transitionFrames?.length ?? 0}`,
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
        this.emitState();
    }
}

// ── Singleton for global access ─────────────────────────────────────────────
export const transitionSnapshotRecorder = new TransitionSnapshotRecorder();
