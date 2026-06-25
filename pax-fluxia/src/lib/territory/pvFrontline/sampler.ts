import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type { FillTransitionFrame } from '../contracts/TransitionContracts';
import { sampleActiveFrontTransition } from '../layers/transition/ActiveFrontTransition';
import type {
    PowerVoronoiFrontlineRuntime,
    PowerVoronoiSharedJunctionConsistency,
    PowerVoronoiTransitionFront,
    TransientTransitionFrontline,
} from './contracts';

type Vec2 = [number, number];

function distance(a: Vec2, b: Vec2): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function lerpPoint(a: Vec2, b: Vec2, t: number): Vec2 {
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
    ];
}

function buildTransientTransitionFrontline(
    front: PowerVoronoiTransitionFront,
    progress: number,
): TransientTransitionFrontline {
    const points = front.transitionVertices.map((vertex) =>
        lerpPoint(vertex.prePoint, vertex.postPoint, progress),
    );
    return {
        frontId: front.frontId,
        ownerPairKey: front.ownerPairKey,
        splitMode: front.splitMode,
        progress,
        points,
    };
}

function isFinitePoint(point: Vec2): boolean {
    return Number.isFinite(point[0]) && Number.isFinite(point[1]);
}

function buildSharedJunctionConsistency(
    fronts: readonly PowerVoronoiTransitionFront[],
    transientFrontlines: readonly TransientTransitionFrontline[],
): PowerVoronoiSharedJunctionConsistency[] {
    const samplesByVertex = new Map<
        string,
        {
            kind: PowerVoronoiTransitionFront['changeAnchorStart']['kind'];
            samples: {
                frontId: string;
                ownerPairKey: string;
                anchorRole: 'start' | 'end';
                point: Vec2;
            }[];
        }
    >();

    for (let index = 0; index < fronts.length; index += 1) {
        const front = fronts[index];
        const transientFrontline = transientFrontlines[index];
        if (!transientFrontline || transientFrontline.points.length === 0) continue;

        const endpoints = [
            {
                anchor: front.changeAnchorStart,
                anchorRole: 'start' as const,
                point: transientFrontline.points[0] as Vec2,
            },
            {
                anchor: front.changeAnchorEnd,
                anchorRole: 'end' as const,
                point: transientFrontline.points[transientFrontline.points.length - 1] as Vec2,
            },
        ];

        for (const endpoint of endpoints) {
            if (endpoint.anchor.kind !== 'junction_3way') continue;
            const bucket =
                samplesByVertex.get(endpoint.anchor.vertexId) ??
                {
                    kind: endpoint.anchor.kind,
                    samples: [],
                };
            bucket.samples.push({
                frontId: front.frontId,
                ownerPairKey: front.ownerPairKey,
                anchorRole: endpoint.anchorRole,
                point: endpoint.point,
            });
            samplesByVertex.set(endpoint.anchor.vertexId, bucket);
        }
    }

    return [...samplesByVertex.entries()]
        .filter(([, bucket]) => bucket.samples.length > 1)
        .map(([vertexId, bucket]) => {
            const referencePoint = bucket.samples[0]?.point ?? [0, 0];
            const finite = bucket.samples.every((sample) => isFinitePoint(sample.point));
            const maxDistance = bucket.samples.reduce(
                (max, sample) => Math.max(max, distance(referencePoint, sample.point)),
                0,
            );
            return {
                vertexId,
                kind: bucket.kind,
                sampleCount: bucket.samples.length,
                referencePoint,
                maxDistance,
                finite,
                consistent: finite && maxDistance <= 1e-6,
                samples: bucket.samples,
            };
        });
}

function pointsEqual(a: readonly Vec2[], b: readonly Vec2[]): boolean {
    if (a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1) {
        if (distance(a[index], b[index]) > 1e-6) {
            return false;
        }
    }
    return true;
}

function frameMatchesGeometry(
    fillFrame: FillTransitionFrame,
    geometry: GeometrySnapshot,
): boolean {
    if (fillFrame.regions.length !== geometry.territoryRegions.length) {
        return false;
    }

    const unused = new Set<number>(
        geometry.territoryRegions.map((_region, index) => index),
    );
    for (const frameRegion of fillFrame.regions) {
        let matchedIndex: number | null = null;
        for (const index of unused) {
            const geometryRegion = geometry.territoryRegions[index];
            if (
                geometryRegion.ownerId === frameRegion.ownerId &&
                pointsEqual(geometryRegion.points, frameRegion.points)
            ) {
                matchedIndex = index;
                break;
            }
        }
        if (matchedIndex === null) {
            return false;
        }
        unused.delete(matchedIndex);
    }

    return unused.size === 0;
}

function buildFillFrameFromGeometry(
    geometry: GeometrySnapshot,
): FillTransitionFrame {
    return {
        regions: geometry.territoryRegions.map((region) => ({
            ownerId: region.ownerId,
            points: region.points,
        })),
    };
}

export function samplePowerVoronoiFrontlineTransition(
    runtime: PowerVoronoiFrontlineRuntime,
    progress: number,
): FillTransitionFrame {
    const t = Math.max(0, Math.min(1, progress));
    const fillFrame =
        t <= 1e-6
            ? buildFillFrameFromGeometry(runtime.preGeometry)
            : t >= 1 - 1e-6
              ? buildFillFrameFromGeometry(runtime.postGeometry)
              : runtime.activeFrontPlan.fronts.length > 0
            ? sampleActiveFrontTransition(
                  runtime.activeFrontPlan,
                  runtime.preGeometry.frontierTopology,
                  runtime.postGeometry.frontierTopology,
                  t,
              )
            : buildFillFrameFromGeometry(runtime.postGeometry);
    const transientFrontlines = runtime.plan.fronts.map((front) =>
        buildTransientTransitionFrontline(front, t),
    );
    const sharedJunctionConsistency = buildSharedJunctionConsistency(
        runtime.plan.fronts,
        transientFrontlines,
    );
    const sampledFrame = {
        sampleId: `${runtime.plan.planId}:sample:${String(
            runtime.diagnostics.frameEvaluationStage.sampledFrames.length,
        ).padStart(2, '0')}`,
        progress: t,
        regions: fillFrame.regions.length,
        transientFrontlines,
        sharedJunctionConsistency,
        matchesPreGeometry: frameMatchesGeometry(fillFrame, runtime.preGeometry),
        matchesPostGeometry: frameMatchesGeometry(fillFrame, runtime.postGeometry),
    };

    runtime.diagnostics.frameEvaluationStage.currentFrame = fillFrame;
    runtime.diagnostics.frameEvaluationStage.sampledFrames.push(sampledFrame);
    runtime.diagnostics.frameEvaluationStage.summary = {
        sampledFrameCount: runtime.diagnostics.frameEvaluationStage.sampledFrames.length,
        lastProgress: t,
        lastFrontlineCount: transientFrontlines.length,
    };

    return fillFrame;
}
