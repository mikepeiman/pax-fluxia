import type { TransitionDebugBundle } from './TransitionSnapshotRecorder';
import { renderPerimeterFieldDiagnosticCanvas } from '../families/perimeterField/perimeterFieldDiagnostics';
import type { PerimeterFieldDebugSnapshot } from '../families/perimeterField/buildPerimeterFieldScene';
import type { PowerVoronoiDiagnosticBundle } from '../pvCanonical/contracts';
import type { ActiveFrontRuntimeDebugState } from '../layers/transition/TransitionLayerCoordinator';
import type { FrontierTopology } from '../contracts/FrontierTopologyContracts';
import type {
    ActiveFrontPairDiagnostic,
    ActiveFrontTransitionPlan,
} from '../layers/transition/ActiveFrontTransition';
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
        bundle: TransitionDebugBundle;
        baseCanvas: HTMLCanvasElement | null;
        diagnostics: unknown;
        phase: 'previous' | 'next' | 'transition';
        sourceIndex?: number;
    }): HTMLCanvasElement | null;
    renderSupplementalCanvases?(
        bundle: TransitionDebugBundle,
    ): { filename: string; label: string; canvas: HTMLCanvasElement }[];
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

const AF_COLORS = {
    panelBg: 'rgba(10, 16, 28, 0.82)',
    panelBorder: 'rgba(79, 217, 255, 0.55)',
    title: '#eef8ff',
    summary: '#c8d5f2',
    prevPath: '#ff73c6',
    nextPath: '#f0b400',
    activeFront: '#52ff8f',
    changeAnchor: '#3cdcff',
    defectAnchor: '#ff4d6d',
    defectPath: '#ff8c42',
    correspondence: 'rgba(60, 220, 255, 0.52)',
    text: '#f4f7ff',
    shadow: '#10131d',
} as const;

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

function createCanvasLike(
    width: number,
    height: number,
    baseCanvas: HTMLCanvasElement | null,
): HTMLCanvasElement | null {
    if (baseCanvas) return cloneCanvas(baseCanvas);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, width, height);
    return canvas;
}

function drawCanvasPolyline(
    ctx: CanvasRenderingContext2D,
    points: readonly [number, number][],
    color: string,
    lineWidth: number,
    dashed = false,
): void {
    if (points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dashed) {
        ctx.setLineDash([8, 5]);
    }
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.stroke();
    ctx.restore();
}

function drawCanvasCircle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    stroke: string,
    fill = 'transparent',
    lineWidth = 2,
): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();
}

function drawCanvasSquare(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    fill: string,
): void {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - size / 2, y - size / 2, size, size);
    ctx.restore();
}

function drawCanvasLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color = AF_COLORS.text,
    font = '11px "JetBrains Mono", Consolas, monospace',
): void {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = AF_COLORS.shadow;
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
}

function polylineArcLengths(points: readonly [number, number][]): number[] {
    const lengths = [0];
    for (let i = 1; i < points.length; i += 1) {
        const [ax, ay] = points[i - 1];
        const [bx, by] = points[i];
        lengths.push(lengths[i - 1] + Math.hypot(bx - ax, by - ay));
    }
    return lengths;
}

function samplePolylineAtNormalizedT(
    points: readonly [number, number][],
    t: number,
): [number, number] {
    if (points.length === 0) return [0, 0];
    if (points.length === 1) return [points[0][0], points[0][1]];
    const clamped = Math.max(0, Math.min(1, t));
    const lengths = polylineArcLengths(points);
    const total = lengths[lengths.length - 1];
    if (total <= 0) return [points[0][0], points[0][1]];
    const target = total * clamped;
    for (let i = 1; i < lengths.length; i += 1) {
        if (lengths[i] < target) continue;
        const segmentLength = lengths[i] - lengths[i - 1];
        const localT =
            segmentLength <= 0 ? 0 : (target - lengths[i - 1]) / segmentLength;
        const [ax, ay] = points[i - 1];
        const [bx, by] = points[i];
        return [ax + (bx - ax) * localT, ay + (by - ay) * localT];
    }
    const last = points[points.length - 1];
    return [last[0], last[1]];
}

function buildTopologyPathPoints(
    topology: FrontierTopology | null,
    sectionIds: readonly string[],
    anchorStartId: string,
): [number, number][] {
    if (!topology || sectionIds.length === 0) return [];
    const out: [number, number][] = [];
    let currentVertexId: string | null = anchorStartId;
    for (const sectionId of sectionIds) {
        const section = topology.sections.get(sectionId);
        if (!section) continue;
        let points = section.points;
        if (currentVertexId === section.endVertexId) {
            points = [...section.points].reverse();
            currentVertexId = section.startVertexId;
        } else {
            currentVertexId = section.endVertexId;
        }
        if (out.length === 0) {
            out.push(...points);
        } else {
            out.push(...points.slice(1));
        }
    }
    return out;
}

function drawActiveFrontHudLegend(
    ctx: CanvasRenderingContext2D,
    debug: ActiveFrontRuntimeDebugState | null,
): void {
    const lines = [
        `AF ${debug?.evaluation ?? 'idle'}`,
        `fronts=${debug?.frontCount ?? 0} pairs=${debug?.planSummary?.pairCount ?? 0}`,
        `no-motion=${debug?.planSummary?.noChangePairCount ?? 0} defects=${debug?.defectPairCount ?? 0}`,
    ];
    const items = [
        { label: 'PRE front path', color: AF_COLORS.prevPath, dashed: true },
        { label: 'POST front path', color: AF_COLORS.nextPath, dashed: false },
        { label: 'Active front span', color: AF_COLORS.activeFront, dashed: false, width: 5 },
        { label: 'Change anchor', color: AF_COLORS.changeAnchor, marker: 'circle' },
        { label: 'Defect anchor', color: AF_COLORS.defectAnchor, marker: 'square' },
        { label: 'Monotonic vertex path', color: AF_COLORS.correspondence, dashed: false },
    ] as const;
    const x = 14;
    const y = 14;
    const width = 280;
    const height = 28 + lines.length * 14 + items.length * 16 + 12;

    ctx.save();
    ctx.fillStyle = AF_COLORS.panelBg;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = AF_COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    drawCanvasLabel(ctx, 'AF Diagnostics', x + 10, y + 8, AF_COLORS.title, 'bold 12px "JetBrains Mono", Consolas, monospace');
    lines.forEach((line, index) => {
        drawCanvasLabel(ctx, line, x + 10, y + 24 + index * 14, AF_COLORS.summary, '10px "JetBrains Mono", Consolas, monospace');
    });
    items.forEach((item, index) => {
        const rowY = y + 24 + lines.length * 14 + 10 + index * 16;
        if ('marker' in item && item.marker === 'circle') {
            drawCanvasCircle(ctx, x + 20, rowY + 6, 4.5, item.color);
        } else if ('marker' in item && item.marker === 'square') {
            drawCanvasSquare(ctx, x + 20, rowY + 6, 9, item.color);
        } else {
            drawCanvasPolyline(
                ctx,
                [
                    [x + 8, rowY + 6],
                    [x + 32, rowY + 6],
                ],
                item.color,
                item.width ?? 3,
                item.dashed ?? false,
            );
        }
        drawCanvasLabel(ctx, item.label, x + 42, rowY, AF_COLORS.text, '10px "JetBrains Mono", Consolas, monospace');
    });
    ctx.restore();
}

function drawMonotonicCorrespondence(
    ctx: CanvasRenderingContext2D,
    prevPoints: readonly [number, number][],
    nextPoints: readonly [number, number][],
    startIndex: number,
    endIndex: number,
): void {
    if (prevPoints.length < 2 || nextPoints.length < 2) return;
    const maxIndex = Math.max(1, nextPoints.length - 1);
    const startT = Math.max(0, Math.min(1, startIndex / maxIndex));
    const endT = Math.max(startT, Math.min(1, endIndex / maxIndex));
    const count = Math.min(10, Math.max(4, endIndex - startIndex + 1));
    for (let i = 0; i < count; i += 1) {
        const t = count === 1 ? startT : startT + ((endT - startT) * i) / (count - 1);
        const prevPoint = samplePolylineAtNormalizedT(prevPoints, t);
        const nextPoint = samplePolylineAtNormalizedT(nextPoints, t);
        drawCanvasPolyline(ctx, [prevPoint, nextPoint], AF_COLORS.correspondence, 1.4);
        drawCanvasCircle(ctx, prevPoint[0], prevPoint[1], 2.3, AF_COLORS.changeAnchor, AF_COLORS.changeAnchor, 1);
        drawCanvasCircle(ctx, nextPoint[0], nextPoint[1], 2.3, AF_COLORS.changeAnchor, AF_COLORS.changeAnchor, 1);
    }
}

function drawActiveFrontReferenceFrame(
    bundle: TransitionDebugBundle,
): HTMLCanvasElement | null {
    const baseCanvas = bundle.nextCanvas ?? bundle.prevCanvas ?? null;
    const canvas = createCanvasLike(
        baseCanvas?.width ?? bundle.context.worldWidth,
        baseCanvas?.height ?? bundle.context.worldHeight,
        baseCanvas,
    );
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const debug = (bundle.extraDiagnostics as ActiveFrontLiveCaptureDiagnostics | null)
        ?.activeFrontDebug ?? null;
    const plan = bundle.context.activeFrontPlan;
    const prevTopology = bundle.context.prevFrontierTopology;
    const nextTopology = bundle.context.nextFrontierTopology;

    drawActiveFrontHudLegend(ctx, debug);

    if (!plan || !prevTopology || !nextTopology) {
        drawCanvasLabel(ctx, 'No active-front plan/topology available for reference frame.', 18, 170, '#ffb4b4');
        return canvas;
    }

    for (const front of plan.fronts as ActiveFrontTransitionPlan['fronts']) {
        for (const prevPath of front.prevPaths) {
            drawCanvasPolyline(ctx, prevPath.points, AF_COLORS.prevPath, 3, true);
        }
        for (const nextPath of front.nextPaths) {
            drawCanvasPolyline(ctx, nextPath.points, AF_COLORS.nextPath, 3, false);
        }

        if (front.splitMode === 'none' && front.changeSpan.base === 'next' && front.nextPaths[0]) {
            const basePath = front.nextPaths[0].points;
            const startIndex = Math.max(0, Math.min(front.changeSpan.startIndex, basePath.length - 1));
            const endIndex = Math.max(startIndex, Math.min(front.changeSpan.endIndex, basePath.length - 1));
            const activePoints = basePath.slice(startIndex, endIndex + 1);
            drawCanvasPolyline(ctx, activePoints, AF_COLORS.activeFront, 5, false);
            const startPoint = basePath[startIndex];
            const endPoint = basePath[endIndex];
            drawCanvasCircle(ctx, startPoint[0], startPoint[1], 6, AF_COLORS.changeAnchor);
            drawCanvasCircle(ctx, endPoint[0], endPoint[1], 6, AF_COLORS.changeAnchor);
            drawCanvasLabel(ctx, 'CA', startPoint[0] + 8, startPoint[1] - 12, AF_COLORS.changeAnchor);
            drawCanvasLabel(ctx, 'CA', endPoint[0] + 8, endPoint[1] - 12, AF_COLORS.changeAnchor);
            if (front.prevPaths[0]) {
                drawMonotonicCorrespondence(
                    ctx,
                    front.prevPaths[0].points,
                    front.nextPaths[0].points,
                    startIndex,
                    endIndex,
                );
            }
        }
    }

    for (const pair of plan.diagnostics.pairDiagnostics as ActiveFrontPairDiagnostic[]) {
        if (
            pair.outcome !== 'defect_topology_gap' &&
            pair.outcome !== 'defect_unsupported_split_mode'
        ) {
            continue;
        }

        for (const pathSectionIds of pair.prevPathSectionIds) {
            const points = buildTopologyPathPoints(
                prevTopology,
                pathSectionIds,
                pair.anchorStartId,
            );
            drawCanvasPolyline(ctx, points, AF_COLORS.prevPath, 2, true);
        }

        for (const pathSectionIds of pair.nextPathSectionIds) {
            const points = buildTopologyPathPoints(
                nextTopology,
                pathSectionIds,
                pair.anchorStartId,
            );
            drawCanvasPolyline(ctx, points, AF_COLORS.defectPath, 3, false);
        }

        const startVertex = nextTopology.vertices.get(pair.anchorStartId)
            ?? prevTopology.vertices.get(pair.anchorStartId);
        const endVertex = nextTopology.vertices.get(pair.anchorEndId)
            ?? prevTopology.vertices.get(pair.anchorEndId);
        if (startVertex) {
            drawCanvasSquare(
                ctx,
                startVertex.point[0],
                startVertex.point[1],
                10,
                AF_COLORS.defectAnchor,
            );
        }
        if (endVertex) {
            drawCanvasSquare(
                ctx,
                endVertex.point[0],
                endVertex.point[1],
                10,
                AF_COLORS.defectAnchor,
            );
        }
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

    drawActiveFrontHudLegend(ctx, args.diagnostics.activeFrontDebug);
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
    renderSupplementalCanvases(bundle) {
        const reference = drawActiveFrontReferenceFrame(bundle);
        if (!reference) return [];
        return [
            {
                filename: 'render/front_reference.png',
                label: 'PRE|POST front reference',
                canvas: reference,
            },
        ];
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
