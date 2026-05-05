import type { TransitionDebugBundle } from './TransitionSnapshotRecorder';
import { renderPerimeterFieldDiagnosticCanvas } from '../families/perimeterField/perimeterFieldDiagnostics';
import type { PerimeterFieldDebugSnapshot } from '../families/perimeterField/buildPerimeterFieldScene';
import type { PowerVoronoiDiagnosticBundle } from '../pvCanonical/contracts';
import type { ActiveFrontRuntimeDebugState } from '../layers/transition/TransitionLayerCoordinator';
import {
    boundsOf,
    compactFrontierTopologyForExport,
    compactGeometrySnapshotForExport,
    downsamplePoints,
} from './snapshotExport';

export interface DiagnosticPackageFrameRef {
    progress: number;
    filename: string;
    sourceIndex: number;
}

export interface TransitionDiagnosticsAdapterData {
    exportKind: string;
    previousGeometry: unknown;
    nextGeometry: unknown;
    previousTopology: unknown;
    nextTopology: unknown;
    starPositions: Record<string, { x: number; y: number }>;
    captureDiagnostics?: unknown;
}

export interface TransitionDiagnosticsExportAdapter {
    readonly kind: string;
    matches(value: unknown): boolean;
    buildData(
        bundle: TransitionDebugBundle,
        selectedFrames: readonly DiagnosticPackageFrameRef[],
    ): TransitionDiagnosticsAdapterData;
    renderCanvas(args: {
        baseCanvas: HTMLCanvasElement | null;
        diagnostics: unknown;
        phase: 'previous' | 'next' | 'transition';
        sourceIndex?: number;
    }): HTMLCanvasElement | null;
}

interface PerimeterFieldCaptureFrameDiagnostics {
    fullSnapshot: PerimeterFieldDebugSnapshot | null;
    compactSnapshot: Record<string, unknown> | null;
}

interface PerimeterFieldCaptureTransitionDiagnostics
    extends PerimeterFieldCaptureFrameDiagnostics {
    frameIndex: number;
    progress: number;
}

interface PerimeterFieldLiveCaptureDiagnostics {
    kind: 'perimeter_field_live_capture';
    previousFrame: PerimeterFieldCaptureFrameDiagnostics;
    nextFrame: PerimeterFieldCaptureFrameDiagnostics;
    transitionFrames: PerimeterFieldCaptureTransitionDiagnostics[];
}

interface ActiveFrontLiveCaptureDiagnostics {
    kind: 'active_front_live_capture';
    activeFrontDebug: ActiveFrontRuntimeDebugState | null;
    activeFrontPlan: Record<string, unknown> | null;
}

function roundCoord(value: number): number {
    return Math.round(value * 100) / 100;
}

function buildAffectedOwnerSet(bundle: TransitionDebugBundle): Set<string> {
    const owners = new Set<string>();
    for (const event of bundle.conquestEvents) {
        owners.add(event.previousOwner);
        owners.add(event.newOwner);
    }
    return owners;
}

function compactPerimeterFieldGeometry(
    geometry: TransitionDebugBundle['context']['nextGeometry'] | null | undefined,
    affectedOwners: ReadonlySet<string>,
): unknown {
    if (!geometry) return null;
    return {
        version: geometry.version,
        sourceMode: geometry.sourceMode,
        sourceStyle: geometry.sourceStyle,
        ownershipVersion: geometry.ownershipVersion,
        geometryFamily: geometry.geometryFamily,
        sourceMethod: geometry.sourceMethod,
        territoryRegions: geometry.territoryRegions
            .filter((region) => affectedOwners.has(region.ownerId))
            .map((region) => ({
                regionId: region.regionId,
                ownerId: region.ownerId,
                starIds: [...(region.starIds ?? [])].sort(),
                confidence: region.confidence,
                pointCount: region.points.length,
                bounds: boundsOf(region.points),
                pointsSampled: downsamplePoints(region.points, 24).map(
                    ([x, y]) => [roundCoord(x), roundCoord(y)] as const,
                ),
            })),
        shellLoops: geometry.shellLoops
            .filter(
                (loop) =>
                    loop.classification === 'outer' &&
                    Boolean(loop.ownerId) &&
                    affectedOwners.has(loop.ownerId),
            )
            .map((loop) => ({
                shellLoopId: loop.shellLoopId,
                shellId: loop.shellId,
                ownerId: loop.ownerId,
                starIds: [...(loop.starIds ?? [])].sort(),
                confidence: loop.confidence,
                pointCount: loop.points.length,
                bounds: boundsOf(loop.points),
                pointsSampled: downsamplePoints(loop.points, 24).map(
                    ([x, y]) => [roundCoord(x), roundCoord(y)] as const,
                ),
            })),
    };
}

function compactTopologySummary(
    topology:
        | TransitionDebugBundle['context']['prevFrontierTopology']
        | TransitionDebugBundle['context']['nextFrontierTopology']
        | null
        | undefined,
): unknown {
    if (!topology) return null;
    return {
        version: topology.version,
        ownershipVersion: topology.ownershipVersion,
        vertexCount: topology.vertices.size,
        sectionCount: topology.sections.size,
        loopCount: topology.loops.length,
    };
}

function serializeRelevantStarPositions(
    bundle: TransitionDebugBundle,
): Record<string, { x: number; y: number }> {
    const relevantIds = new Set<string>();
    for (const event of bundle.conquestEvents) {
        relevantIds.add(event.starId);
        const attackerStarIds = Array.isArray(
            (event as { attackerStarIds?: unknown }).attackerStarIds,
        )
            ? ((event as { attackerStarIds?: string[] }).attackerStarIds ?? [])
            : [];
        for (const attackerStarId of attackerStarIds) {
            relevantIds.add(attackerStarId);
        }
    }

    return Object.fromEntries(
        [...bundle.starPositions.entries()]
            .filter(([starId]) => relevantIds.has(starId))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([starId, point]) => [
                starId,
                { x: roundCoord(point.x), y: roundCoord(point.y) },
            ]),
    );
}

function renderPerimeterFieldExportCanvas(args: {
    baseCanvas: HTMLCanvasElement | null;
    snapshot: PerimeterFieldDebugSnapshot | null;
}): HTMLCanvasElement | null {
    if (!args.baseCanvas) return null;
    if (!args.snapshot) return args.baseCanvas;
    return renderPerimeterFieldDiagnosticCanvas({
        width: args.baseCanvas.width,
        height: args.baseCanvas.height,
        snapshot: args.snapshot,
        baseCanvas: args.baseCanvas,
        showGeometry: true,
        showVstars: true,
    });
}

function cloneCanvas(baseCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = baseCanvas.width;
    canvas.height = baseCanvas.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.drawImage(baseCanvas, 0, 0);
    }
    return canvas;
}

function renderActiveFrontDiagnosticCanvas(args: {
    baseCanvas: HTMLCanvasElement | null;
    diagnostics: ActiveFrontLiveCaptureDiagnostics;
}): HTMLCanvasElement | null {
    if (!args.baseCanvas) return null;
    const canvas = cloneCanvas(args.baseCanvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const debug = args.diagnostics.activeFrontDebug;
    const planSummary = debug?.planSummary ?? null;
    const lines = [
        `AF eval: ${debug?.evaluation ?? 'n/a'}`,
        `path: ${debug?.pathUsed ?? 'n/a'}`,
        `fronts: ${debug?.frontCount ?? 0} / collapses: ${debug?.collapseTargetCount ?? 0}`,
        `sampled: ${typeof debug?.sampledProgress === 'number' ? debug.sampledProgress.toFixed(3) : 'n/a'}`,
        `stable anchors: ${planSummary?.stableAnchorCount ?? 0} / pairs: ${planSummary?.pairCount ?? 0}`,
        `planned: ${planSummary?.plannedPairCount ?? 0} / defect pairs: ${planSummary?.defectPairCount ?? 0}`,
        `topology gaps: ${planSummary?.defectTopologyGapCount ?? 0} / split defects: ${planSummary?.defectUnsupportedSplitCount ?? 0}`,
        `no-span defects: ${planSummary?.defectNoChangeSpanCount ?? 0} / defect sections: ${planSummary?.defectSectionCount ?? 0}`,
    ];
    const panelWidth = 310;
    const lineHeight = 16;
    const panelHeight = lines.length * lineHeight + 18;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.74)';
    ctx.fillRect(12, 12, panelWidth, panelHeight);
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.72)';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, panelWidth, panelHeight);

    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let index = 0; index < lines.length; index += 1) {
        ctx.fillStyle = index === 0 ? '#67e8f9' : '#f8fafc';
        ctx.fillText(lines[index], 22, 22 + index * lineHeight);
    }
    return canvas;
}

function compactPowerVoronoiDiagnostics(
    diagnostics: PowerVoronoiDiagnosticBundle,
): unknown {
    const lastSample =
        diagnostics.frameEvaluationStage.sampledFrames[
            diagnostics.frameEvaluationStage.sampledFrames.length - 1
        ] ?? null;
    return {
        kind: diagnostics.kind,
        bundleId: diagnostics.bundleId,
        modeId: diagnostics.modeId,
        planId: diagnostics.planId,
        ownershipStage: {
            stageId: diagnostics.ownershipStage.stageId,
            summary: diagnostics.ownershipStage.summary,
            previousOwnershipVersion: diagnostics.ownershipStage.previousOwnership.version,
            nextOwnershipVersion: diagnostics.ownershipStage.nextOwnership.version,
        },
        geometryStage: {
            stageId: diagnostics.geometryStage.stageId,
            summary: diagnostics.geometryStage.summary,
            preGeometryVersion: diagnostics.geometryStage.preGeometry.version,
            postGeometryVersion: diagnostics.geometryStage.postGeometry.version,
        },
        transitionPlanningStage: {
            stageId: diagnostics.transitionPlanningStage.stageId,
            summary: diagnostics.transitionPlanningStage.summary,
            frontIds: diagnostics.transitionPlanningStage.transitionPlan.fronts.map(
                (front) => front.frontId,
            ),
            unaffectedLoopIds: [
                ...diagnostics.transitionPlanningStage.transitionPlan.unaffectedLoopIds,
            ],
        },
        frameEvaluationStage: {
            stageId: diagnostics.frameEvaluationStage.stageId,
            summary: diagnostics.frameEvaluationStage.summary,
            sampledFrames: diagnostics.frameEvaluationStage.sampledFrames.map((sample) => ({
                sampleId: sample.sampleId,
                progress: sample.progress,
                regions: sample.regions,
                frontlineCount: sample.transientFrontlines.length,
                matchesPreGeometry: sample.matchesPreGeometry,
                matchesPostGeometry: sample.matchesPostGeometry,
            })),
            lastSample:
                lastSample === null
                    ? null
                    : {
                          sampleId: lastSample.sampleId,
                          progress: lastSample.progress,
                          regions: lastSample.regions,
                          frontlineCount: lastSample.transientFrontlines.length,
                          matchesPreGeometry: lastSample.matchesPreGeometry,
                          matchesPostGeometry: lastSample.matchesPostGeometry,
                      },
        },
    };
}

const perimeterFieldAdapter: TransitionDiagnosticsExportAdapter = {
    kind: 'perimeter_field_live_capture',
    matches(value: unknown): boolean {
        return (
            typeof value === 'object' &&
            value !== null &&
            (value as { kind?: unknown }).kind === 'perimeter_field_live_capture'
        );
    },
    buildData(bundle, selectedFrames) {
        const diagnostics = bundle.extraDiagnostics as PerimeterFieldLiveCaptureDiagnostics;
        const affectedOwners = buildAffectedOwnerSet(bundle);
        return {
            exportKind: 'perimeter_field_compact',
            previousGeometry: compactPerimeterFieldGeometry(
                bundle.context.previousGeometry ?? null,
                affectedOwners,
            ),
            nextGeometry: compactPerimeterFieldGeometry(
                bundle.context.nextGeometry,
                affectedOwners,
            ),
            previousTopology: compactTopologySummary(
                bundle.context.previousGeometry?.frontierTopology ?? null,
            ),
            nextTopology: compactTopologySummary(
                bundle.context.nextGeometry?.frontierTopology ?? null,
            ),
            starPositions: serializeRelevantStarPositions(bundle),
            captureDiagnostics: {
                kind: diagnostics.kind,
                totalTransitionFrames: diagnostics.transitionFrames.length,
                previousFrame: diagnostics.previousFrame.compactSnapshot,
                nextFrame: diagnostics.nextFrame.compactSnapshot,
                selectedTransitionFrames: selectedFrames
                    .map((frame) => {
                        const source = diagnostics.transitionFrames[frame.sourceIndex];
                        if (!source) return null;
                        return {
                            frameIndex: source.frameIndex,
                            progress: source.progress,
                            snapshot: source.compactSnapshot,
                        };
                    })
                    .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
            },
        };
    },
    renderCanvas({ baseCanvas, diagnostics, phase, sourceIndex }) {
        const typed = diagnostics as PerimeterFieldLiveCaptureDiagnostics;
        if (!typed) return baseCanvas;
        if (phase === 'previous') {
            return renderPerimeterFieldExportCanvas({
                baseCanvas,
                snapshot: typed.previousFrame.fullSnapshot,
            });
        }
        if (phase === 'next') {
            return renderPerimeterFieldExportCanvas({
                baseCanvas,
                snapshot: typed.nextFrame.fullSnapshot,
            });
        }
        return renderPerimeterFieldExportCanvas({
            baseCanvas,
            snapshot:
                sourceIndex !== undefined
                    ? typed.transitionFrames[sourceIndex]?.fullSnapshot ?? null
                    : null,
        });
    },
};

const activeFrontLiveCaptureAdapter: TransitionDiagnosticsExportAdapter = {
    kind: 'active_front_live_capture',
    matches(value: unknown): boolean {
        return (
            typeof value === 'object' &&
            value !== null &&
            (value as { kind?: unknown }).kind === 'active_front_live_capture'
        );
    },
    buildData(bundle) {
        const diagnostics = bundle.extraDiagnostics as ActiveFrontLiveCaptureDiagnostics;
        return {
            exportKind: 'active_front_live_capture',
            previousGeometry: compactGeometrySnapshotForExport(
                bundle.context.previousGeometry ?? null,
            ),
            nextGeometry: compactGeometrySnapshotForExport(
                bundle.context.nextGeometry,
            ),
            previousTopology: compactFrontierTopologyForExport(
                bundle.context.previousGeometry?.frontierTopology ?? null,
            ),
            nextTopology: compactFrontierTopologyForExport(
                bundle.context.nextGeometry?.frontierTopology ?? null,
            ),
            starPositions: Object.fromEntries(
                [...bundle.starPositions.entries()].map(([starId, point]) => [
                    starId,
                    point,
                ]),
            ),
            captureDiagnostics: diagnostics,
        };
    },
    renderCanvas({ baseCanvas, diagnostics }) {
        return renderActiveFrontDiagnosticCanvas({
            baseCanvas,
            diagnostics: diagnostics as ActiveFrontLiveCaptureDiagnostics,
        });
    },
};

const powerVoronoiCanonicalAdapter: TransitionDiagnosticsExportAdapter = {
    kind: 'power_voronoi_canonical',
    matches(value: unknown): boolean {
        return (
            typeof value === 'object' &&
            value !== null &&
            (value as { kind?: unknown }).kind === 'power_voronoi_canonical'
        );
    },
    buildData(bundle) {
        const diagnostics = bundle.extraDiagnostics as PowerVoronoiDiagnosticBundle;
        return {
            exportKind: 'power_voronoi_canonical',
            previousGeometry: compactGeometrySnapshotForExport(
                bundle.context.previousGeometry ?? null,
            ),
            nextGeometry: compactGeometrySnapshotForExport(
                bundle.context.nextGeometry,
            ),
            previousTopology: compactFrontierTopologyForExport(
                bundle.context.previousGeometry?.frontierTopology ?? null,
            ),
            nextTopology: compactFrontierTopologyForExport(
                bundle.context.nextGeometry?.frontierTopology ?? null,
            ),
            starPositions: Object.fromEntries(
                [...bundle.starPositions.entries()].map(([starId, point]) => [
                    starId,
                    point,
                ]),
            ),
            captureDiagnostics:
                diagnostics &&
                typeof diagnostics === 'object' &&
                'ownershipStage' in diagnostics
                    ? compactPowerVoronoiDiagnostics(diagnostics)
                    : bundle.extraDiagnostics,
        };
    },
    renderCanvas({ baseCanvas }) {
        return baseCanvas;
    },
};

const ADAPTERS: readonly TransitionDiagnosticsExportAdapter[] = [
    perimeterFieldAdapter,
    activeFrontLiveCaptureAdapter,
    powerVoronoiCanonicalAdapter,
];

export function resolveTransitionDiagnosticsExportAdapter(
    diagnostics: unknown,
): TransitionDiagnosticsExportAdapter | null {
    for (const adapter of ADAPTERS) {
        if (adapter.matches(diagnostics)) {
            return adapter;
        }
    }
    return null;
}
