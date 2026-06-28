import { log } from '../../utils/logger';
import type { TransitionSnapshotRecorder } from '../devtools/TransitionSnapshotRecorder';
import type { TerritoryFrameInput } from '../contracts/TerritoryFrameInput';
import type { TerritoryPresentationFrame } from '../contracts/PresentationContracts';
import type { TerritoryRuntimeDiagnostics } from '../contracts/DiagnosticsContracts';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type { TerritoryModeSelection } from '../contracts/TerritoryModeSelection';
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

export interface TerritoryRuntimeOutput {
    ownership: OwnershipSnapshot;
    geometry: GeometrySnapshot;
    transition: TransitionSnapshot;
    activeFrontPlan:
        import('../layers/transition/ActiveFrontTransition').ActiveFrontTransitionPlan | null;
    presentation: TerritoryPresentationFrame;
    diagnostics: TerritoryRuntimeDiagnostics;
}

export class TerritoryRuntimeCoordinator {
    private state: TerritoryRuntimeState = createInitialTerritoryRuntimeState();
    private lastLogMs = 0;
    private frameCount = 0;
    private geometryDumped = false;
    private snapshotRecorder: TransitionSnapshotRecorder | null = null;

    constructor(
        private readonly ownershipLayer = new OwnershipLayerCoordinator(),
        geometryLayer = new GeometryLayerCoordinator(),
        private readonly transitionLayer = new TransitionLayerCoordinator(),
        private readonly presentationLayer = new PresentationLayerCoordinator(),
        private readonly worker = new TerritoryWorker(geometryLayer),
    ) {}

    setSnapshotRecorder(recorder: TransitionSnapshotRecorder): void {
        this.snapshotRecorder = recorder;
    }

    reset(): void {
        this.state = createInitialTerritoryRuntimeState();
        this.frameCount = 0;
    }

    getWorkerStats(): ReturnType<TerritoryWorker['stats']> {
        return this.worker.stats();
    }

    update(rawInput: TerritoryFrameInput): TerritoryRuntimeOutput {
        const startedAtMs = Date.now();
        const diagnostics: TerritoryRuntimeDiagnostics = {
            startedAtMs,
            finishedAtMs: startedAtMs,
            messages: [],
            modeDiagnostics: null,
        };

        const input = normalizeTerritoryFrameInput(rawInput);
        const selection = this.resolveSelection(input.selection);
        const compatibility = validateTerritoryModeSelection(selection);
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
            selection,
            previousSnapshot: this.state.previousOwnership,
        });

        const geometryResult = this.worker.computeGeometrySync({
            requestId: `territory:${input.tickId}:${input.nowMs}`,
            nowMs: input.nowMs,
            boardLayoutKey: input.boardLayoutKey,
            stars: input.stars,
            lanes: input.lanes,
            world: input.world,
            tunables: input.tunables,
            ownership,
            selection,
            previousGeometry: this.state.previousGeometry,
        });
        const geometry = geometryResult.geometry;

        const resolvedPowerVoronoiPair =
            selection.fillTransitionMode === 'pv_frontline' &&
            ownership.conquestEvents.length > 0 &&
            this.state.previousOwnership
                ? {
                      preGeometry: this.worker.computeGeometrySync({
                      requestId: `territory:pv-prev:${input.tickId}:${input.nowMs}`,
                      nowMs: input.nowMs,
                      boardLayoutKey: input.boardLayoutKey,
                      stars: input.stars,
                      lanes: input.lanes,
                      world: input.world,
                          tunables: input.tunables,
                          ownership: this.state.previousOwnership,
                          selection,
                          previousGeometry: this.state.previousGeometry,
                      }).geometry,
                      postGeometry: geometry,
                      previousOwnership: this.state.previousOwnership,
                      nextOwnership: ownership,
                  }
                : null;

        const transition = this.transitionLayer.compute({
            nowMs: input.nowMs,
            tunables: input.tunables,
            selection,
            ownership,
            previousOwnership: this.state.previousOwnership,
            geometry,
            previousGeometry: this.state.previousGeometry,
            previousTransition: this.state.previousTransition,
            activeFillPlan: this.state.activeFillPlan,
            activeFrontPlan: this.state.activeFrontPlan,
            activePvFrontlineTransition:
                this.state.activePvFrontlineTransition,
            resolvedPowerVoronoiPair,
            transitionPrevTopology: this.state.transitionPrevTopology,
        });
        diagnostics.modeDiagnostics =
            transition.activePvFrontlineTransition?.diagnostics ?? null;
        diagnostics.transitionFallbackReason =
            transition.fallbackReason ?? null;
        if (transition.fallbackReason) {
            diagnostics.messages.push({
                level: 'warn',
                source: 'TransitionLayerCoordinator',
                message: `Transition fallback: ${transition.fallbackReason}`,
            });
        }

        const presentation = this.presentationLayer.compute({
            nowMs: input.nowMs,
            ownership,
            geometry,
            transition: transition.snapshot,
            selection,
            tunables: input.tunables,
        });

        this.frameCount += 1;
        this.snapshotRecorder?.tick();
        const logNow = Date.now();
        const envelope = transition.snapshot.envelope;

        if (ownership.conquestEvents.length > 0) {
            log.renderer(
                'Territory',
                `CONQUEST: ${ownership.conquestEvents.length} event(s)` +
                    ` | geom: ${geometry.territoryRegions.length} regions, ${geometry.frontierPolylines.length} frontiers` +
                    ` | version: ${geometry.version.slice(0, 50)}`,
            );
            this.dumpGeometrySnapshots(this.state.previousGeometry ?? null, geometry);

            const starPositions = new Map<string, { x: number; y: number }>();
            for (const star of input.stars) {
                starPositions.set(star.id, { x: star.x, y: star.y });
            }

            this.snapshotRecorder?.capture({
                conquestEvents: ownership.conquestEvents,
                previousGeometry:
                    resolvedPowerVoronoiPair?.preGeometry ??
                    this.state.previousGeometry,
                nextGeometry: resolvedPowerVoronoiPair?.postGeometry ?? geometry,
                previousOwnership: this.state.previousOwnership,
                nextOwnership: ownership,
                transition: transition.snapshot,
                fillPlan: transition.activeFillPlan,
                activeFrontPlan: transition.activeFrontPlan ?? null,
                prevFrontierTopology:
                    resolvedPowerVoronoiPair?.preGeometry.frontierTopology ??
                    this.state.previousGeometry?.frontierTopology ??
                    null,
                nextFrontierTopology:
                    resolvedPowerVoronoiPair?.postGeometry.frontierTopology ??
                    geometry.frontierTopology ??
                    null,
                selection,
                nowMs: input.nowMs,
                starPositions,
                worldWidth: input.world.width,
                worldHeight: input.world.height,
                extraDiagnostics: diagnostics.modeDiagnostics ?? undefined,
            });
        }

        if (envelope && !this.state.previousTransition?.envelope) {
            log.renderer(
                'Territory',
                `TRANSITION START: duration=${envelope.durationMs}ms` +
                    ` | fill=${transition.activeFillPlan?.sourceMode ?? selection.fillTransitionMode}`,
            );
        }
        if (!envelope && this.state.previousTransition?.envelope) {
            log.renderer('Territory', 'TRANSITION COMPLETE');
        }

        if (logNow - this.lastLogMs > 1000) {
            this.lastLogMs = logNow;
            log.renderer(
                'Territory',
                `f=${this.frameCount}` +
                    ` | owners=${ownership.starOwners.size} conquests=${ownership.conquestEvents.length}` +
                    ` | regions=${geometry.territoryRegions.length} frontiers=${geometry.frontierPolylines.length}` +
                    ` | cached=${geometryResult.fromCache}` +
                    ` | fills=${presentation.fills.length} borders=${presentation.borders.length}` +
                    ` | transition=${envelope ? `p=${envelope.progress.toFixed(2)}` : 'none'}` +
                    ` | modes: g=${selection.geometryMode} ft=${selection.fillTransitionMode}`,
            );
        }

        this.state = {
            previousOwnership: ownership,
            previousGeometry: geometry,
            previousTransition: transition.snapshot,
            activeFillPlan: transition.activeFillPlan,
            activeFrontPlan: transition.activeFrontPlan ?? null,
            activePvFrontlineTransition:
                transition.activePvFrontlineTransition ?? null,
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

    private resolveSelection(
        selection: TerritoryModeSelection,
    ): TerritoryModeSelection {
        if (selection.fillTransitionMode !== 'pv_frontline') {
            return selection;
        }
        return {
            ...selection,
            ownershipMode: 'star_ownership_snapshot',
            geometryMode: 'resolved_power_voronoi',
            fillTransitionMode: 'pv_frontline',
            borderTransitionMode: 'off',
            styleMode: 'vector',
        };
    }

    private dumpGeometrySnapshots(
        prev: GeometrySnapshot | null,
        current: GeometrySnapshot,
    ): void {
        if (this.geometryDumped) return;
        this.geometryDumped = true;

        const serializeSnapshot = (snap: GeometrySnapshot | null) => {
            if (!snap) return null;
            return {
                version: snap.version,
                sourceMode: snap.sourceMode,
                ownershipVersion: snap.ownershipVersion,
                territoryRegions: snap.territoryRegions.map((region) => ({
                    ownerId: region.ownerId,
                    pointCount: region.points.length,
                    points: region.points.slice(0, 10),
                    samplePoint: region.points[0],
                })),
                frontierPolylines: snap.frontierPolylines.map((polyline) => ({
                    ownerPairKey: polyline.ownerPairKey,
                    pointCount: polyline.points.length,
                    points: polyline.points,
                })),
                worldBorderPolylines: snap.worldBorderPolylines.map((polyline) => ({
                    ownerPairKey: polyline.ownerPairKey,
                    pointCount: polyline.points.length,
                    points: polyline.points,
                })),
                regionCount: snap.territoryRegions.length,
                frontierCount: snap.frontierPolylines.length,
                worldBorderCount: snap.worldBorderPolylines.length,
            };
        };

        const json = JSON.stringify(
            {
                capturedAt: new Date().toISOString(),
                previous: serializeSnapshot(prev),
                current: serializeSnapshot(current),
            },
            null,
            2,
        );

        // Diagnostic only — opt-in via the `renderer` log category (toggle it in the
        // Logging/Diagnostics panel). The automatic Chrome file download and raw
        // console.log that previously fired on the first conquest are removed.
        log.renderer(
            'Territory',
            `GEOMETRY SNAPSHOT DUMP (${json.length} bytes)`,
            json,
        );
    }
}
