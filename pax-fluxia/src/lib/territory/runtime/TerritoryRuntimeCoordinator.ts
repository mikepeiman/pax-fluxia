import { log } from '$lib/utils/logger';
import type { TransitionSnapshotRecorder } from '../devtools/TransitionSnapshotRecorder';
import type { TerritoryFrameInput } from '../contracts/TerritoryFrameInput';
import type { TerritoryPresentationFrame } from '../contracts/PresentationContracts';
import type { TerritoryRuntimeDiagnostics } from '../contracts/DiagnosticsContracts';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type { TransitionSnapshot } from '../contracts/TransitionContracts';
import { normalizeTerritoryFrameInput } from './TerritoryConfigNormalizer';
import { validateTerritoryModeSelection } from './TerritoryCompatibilityMatrix';
import {
    createInitialTerritoryRuntimeState,
    type TerritoryRuntimeState,
} from './TerritoryRuntimeState';
import { OwnershipLayerCoordinator } from '../layers/ownership/OwnershipLayerCoordinator';
import { GeometryLayerCoordinator } from '../layers/geometry/GeometryLayerCoordinator';
import { TransitionLayerCoordinator } from '../layers/transition/TransitionLayerCoordinator';
import { PresentationLayerCoordinator } from '../layers/presentation/PresentationLayerCoordinator';
import { TerritoryWorker } from './TerritoryWorker';

function shouldEmitGeometrySnapshotDump(): boolean {
    return Boolean(
        (globalThis as Record<string, unknown>).__PAX_TERRITORY_GEOMETRY_DUMP__,
    );
}

export interface TerritoryRuntimeOutput {
    ownership: OwnershipSnapshot;
    geometry: GeometrySnapshot;
    transition: TransitionSnapshot;
    activeFrontPlan: import('../layers/transition/ActiveFrontTransition').ActiveFrontTransitionPlan | null;
    presentation: TerritoryPresentationFrame;
    diagnostics: TerritoryRuntimeDiagnostics;
}

export class TerritoryRuntimeCoordinator {
    private state: TerritoryRuntimeState = createInitialTerritoryRuntimeState();
    private lastLogMs = 0;
    private frameCount = 0;
    private geometryDumped = false;
    private snapshotRecorder: TransitionSnapshotRecorder | null = null;

    /** Attach a debug snapshot recorder (optional, dev-only) */
    setSnapshotRecorder(recorder: TransitionSnapshotRecorder): void {
        this.snapshotRecorder = recorder;
    }

    /** One-shot: dump prev + current geometry snapshots to downloadable JSON */
    private dumpGeometrySnapshots(prev: GeometrySnapshot | null, current: GeometrySnapshot): void {
        if (this.geometryDumped || !shouldEmitGeometrySnapshotDump()) return;
        this.geometryDumped = true;

        const serializeSnapshot = (snap: GeometrySnapshot | null) => {
            if (!snap) return null;
            return {
                version: snap.version,
                sourceMode: snap.sourceMode,
                ownershipVersion: snap.ownershipVersion,
                territoryRegions: snap.territoryRegions.map(r => ({
                    ownerId: r.ownerId,
                    pointCount: r.points.length,
                    points: r.points.slice(0, 10), // first 10 for shape understanding
                    samplePoint: r.points[0],
                })),
                frontierPolylines: snap.frontierPolylines.map(p => ({
                    ownerPairKey: p.ownerPairKey,
                    pointCount: p.points.length,
                    points: p.points, // full polyline — these are small enough
                })),
                worldBorderPolylines: snap.worldBorderPolylines.map(p => ({
                    ownerPairKey: p.ownerPairKey,
                    pointCount: p.points.length,
                    points: p.points,
                })),
                regionCount: snap.territoryRegions.length,
                frontierCount: snap.frontierPolylines.length,
                worldBorderCount: snap.worldBorderPolylines.length,
            };
        };

        const dump = {
            capturedAt: new Date().toISOString(),
            previous: serializeSnapshot(prev),
            current: serializeSnapshot(current),
        };

        const json = JSON.stringify(dump, null, 2);
        log.renderer(
            'Territory',
            `GEOMETRY DUMP READY: ${json.length} bytes captured for explicit dev diagnostics`,
        );

        try {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'geometry-snapshot-dump.json';
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // Non-browser environment — console dump is sufficient
        }
    }

    constructor(
        private readonly ownershipLayer = new OwnershipLayerCoordinator(),
        geometryLayer = new GeometryLayerCoordinator(),
        private readonly transitionLayer = new TransitionLayerCoordinator(),
        private readonly presentationLayer = new PresentationLayerCoordinator(),
        private readonly worker = new TerritoryWorker(geometryLayer),
    ) { }

    reset(): void {
        this.state = createInitialTerritoryRuntimeState();
        this.frameCount = 0;
    }

    update(rawInput: TerritoryFrameInput): TerritoryRuntimeOutput {
        const startedAtMs = Date.now();
        const diagnostics: TerritoryRuntimeDiagnostics = {
            startedAtMs,
            finishedAtMs: startedAtMs,
            messages: [],
        };

        const input = normalizeTerritoryFrameInput(rawInput);
        const compatibility = validateTerritoryModeSelection(input.selection);
        for (const warning of compatibility.warnings) {
            diagnostics.messages.push({
                level: 'warn',
                source: 'TerritoryCompatibilityMatrix',
                message: warning,
            });
        }

        const ownership = this.ownershipLayer.compute({
            nowMs: input.nowMs,
            stars: input.stars,
            lanes: input.lanes,
            selection: input.selection,
            previousSnapshot: this.state.previousOwnership,
        });

        const geometryResult = this.worker.computeGeometrySync({
            requestId: `territory:${input.tickId}:${input.nowMs}`,
            nowMs: input.nowMs,
            stars: input.stars,
            lanes: input.lanes,
            world: input.world,
            tunables: input.tunables,
            ownership,
            selection: input.selection,
            previousGeometry: this.state.previousGeometry,
        });
        const geometry = geometryResult.geometry;

        const transition = this.transitionLayer.compute({
            nowMs: input.nowMs,
            tunables: input.tunables,
            ownership,
            geometry,
            previousGeometry: this.state.previousGeometry,
            previousTransition: this.state.previousTransition,
            activeFillPlan: this.state.activeFillPlan,
            activeFrontPlan: this.state.activeFrontPlan,
            transitionPrevTopology: this.state.transitionPrevTopology,
            selection: input.selection,
        });

        const presentation = this.presentationLayer.compute({
            nowMs: input.nowMs,
            ownership,
            geometry,
            transition: transition.snapshot,
            selection: input.selection,
            tunables: input.tunables,
        });

        // ── Diagnostic logging ─────────────────────────────────────────────
        this.frameCount++;
        this.snapshotRecorder?.tick();
        const logNow = Date.now();
        const envelope = transition.snapshot.envelope;

        // Always log conquest + transition lifecycle events
        if (ownership.conquestEvents.length > 0) {
            log.renderer('Territory',
                `CONQUEST: ${ownership.conquestEvents.length} event(s)` +
                ` | geom: ${geometry.territoryRegions.length} regions, ${geometry.frontierPolylines.length} frontiers` +
                ` | version: ${geometry.version.slice(0, 50)}`,
            );
            if (shouldEmitGeometrySnapshotDump()) {
                this.dumpGeometrySnapshots(
                    this.state.previousGeometry ?? null,
                    geometry,
                );
            }

            // Capture debug snapshot — renders clean geometry to canvas, no transitions
            const starPositions = new Map<string, { x: number; y: number }>();
            for (const s of input.stars) starPositions.set(s.id, { x: s.x, y: s.y });

            this.snapshotRecorder?.capture({
                conquestEvents: ownership.conquestEvents,
                previousGeometry: this.state.previousGeometry,
                nextGeometry: geometry,
                previousOwnership: this.state.previousOwnership,
                nextOwnership: ownership,
                transition: transition.snapshot,
                fillPlan: transition.activeFillPlan,
                activeFrontPlan: transition.activeFrontPlan ?? null,
                prevFrontierTopology: this.state.previousGeometry?.frontierTopology ?? null,
                nextFrontierTopology: geometry.frontierTopology ?? null,
                selection: input.selection,
                nowMs: input.nowMs,
                starPositions,
                worldWidth: input.world.width,
                worldHeight: input.world.height,
            });
        }
        if (envelope && !this.state.previousTransition?.envelope) {
            log.renderer('Territory',
                `TRANSITION START: duration=${envelope.durationMs}ms` +
                ` | fill=${transition.activeFillPlan?.sourceMode ?? 'none'}`,
            );
        }
        if (!envelope && this.state.previousTransition?.envelope) {
            log.renderer('Territory', 'TRANSITION COMPLETE');
        }

        // Throttled general stats (once per second)
        if (logNow - this.lastLogMs > 1000) {
            this.lastLogMs = logNow;
            log.renderer('Territory',
                `f=${this.frameCount}` +
                ` | owners=${ownership.starOwners.size} conquests=${ownership.conquestEvents.length}` +
                ` | regions=${geometry.territoryRegions.length} frontiers=${geometry.frontierPolylines.length}` +
                ` | cached=${geometryResult.fromCache}` +
                ` | fills=${presentation.fills.length} borders=${presentation.borders.length}` +
                ` | transition=${envelope ? `p=${envelope.progress.toFixed(2)}` : 'none'}` +
                ` | modes: g=${input.selection.geometryMode} ft=${input.selection.fillTransitionMode}`,
            );
        }

        this.state = {
            previousOwnership: ownership,
            previousGeometry: geometry,
            previousTransition: transition.snapshot,
            activeFillPlan: transition.activeFillPlan,
            activeFrontPlan: transition.activeFrontPlan ?? null,
            transitionPrevTopology: transition.transitionPrevTopology ?? null,
        };

        diagnostics.finishedAtMs = Date.now();

        return {
            ownership,
            geometry,
            transition: transition.snapshot,
            activeFrontPlan: transition.activeFrontPlan ?? null,
            presentation,
            diagnostics,
        };
    }
}
