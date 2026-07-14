import type { TransitionDebugBundle } from './TransitionSnapshotRecorder';
import type { PowerVoronoiDiagnosticBundle } from '../pvFrontline/contracts';
import {
    compactFrontierTopologyForExport,
    compactGeometrySnapshotForExport,
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

const powerVoronoiRuntimeAdapter: TransitionDiagnosticsExportAdapter = {
    kind: 'power_voronoi_runtime',
    matches(value: unknown): boolean {
        return (
            typeof value === 'object' &&
            value !== null &&
            (value as { kind?: unknown }).kind === 'power_voronoi_runtime'
        );
    },
    buildData(bundle) {
        const diagnostics = bundle.extraDiagnostics as PowerVoronoiDiagnosticBundle;
        return {
            exportKind: 'power_voronoi_runtime',
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
    powerVoronoiRuntimeAdapter,
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
