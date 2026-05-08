import type { TransitionDebugBundle } from './TransitionSnapshotRecorder';
import { renderPerimeterFieldDiagnosticCanvas } from '../families/perimeterField/perimeterFieldDiagnostics';
import type { PerimeterFieldDebugSnapshot } from '../families/perimeterField/buildPerimeterFieldScene';
import type { PowerVoronoiDiagnosticBundle } from '../pvCanonical/contracts';
import type { ActiveFrontRuntimeDebugState } from '../layers/transition/TransitionLayerCoordinator';
import type { FrontierTopology } from '../contracts/FrontierTopologyContracts';
import type {
    ActiveFrontMonotonicCorrespondence,
    ActiveFrontPairDiagnostic,
    ActiveFrontTransitionPlan,
} from '../layers/transition/ActiveFrontTransition';
import { getActiveFrontMonotonicCorrespondence } from '../layers/transition/ActiveFrontTransition';
import {
    boundsOf,
    compactFrontierTopologyForExport,
    compactGeometrySnapshotForExport,
    downsamplePoints,
} from './snapshotExport';
import {
    ACTIVE_FRONT_DEBUG_COLORS as AF_COLORS,
    ACTIVE_FRONT_LEGEND_ITEMS,
    activeFrontColorToCssHex,
} from './activeFrontDebugStyle';

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

const AF_CANVAS_COLORS = {
    panelBg: 'rgba(10, 16, 28, 0.82)',
    panelBorder: 'rgba(79, 217, 255, 0.55)',
    title: '#eef8ff',
    summary: '#c8d5f2',
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
    color = AF_CANVAS_COLORS.text,
    font = '11px "JetBrains Mono", Consolas, monospace',
): void {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = AF_CANVAS_COLORS.shadow;
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
    const x = 14;
    const y = 14;
    const width = 372;
    const height = 28 + lines.length * 14 + ACTIVE_FRONT_LEGEND_ITEMS.length * 16 + 12;

    ctx.save();
    ctx.fillStyle = AF_CANVAS_COLORS.panelBg;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = AF_CANVAS_COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    drawCanvasLabel(ctx, 'AF Diagnostics', x + 10, y + 8, AF_CANVAS_COLORS.title, 'bold 12px "JetBrains Mono", Consolas, monospace');
    lines.forEach((line, index) => {
        drawCanvasLabel(ctx, line, x + 10, y + 24 + index * 14, AF_CANVAS_COLORS.summary, '10px "JetBrains Mono", Consolas, monospace');
    });
    ACTIVE_FRONT_LEGEND_ITEMS.forEach((item, index) => {
        const rowY = y + 24 + lines.length * 14 + 10 + index * 16;
        if (item.kind === 'ring') {
            drawCanvasCircle(ctx, x + 20, rowY + 6, 4.5, activeFrontColorToCssHex(item.color));
        } else if (item.kind === 'square') {
            drawCanvasSquare(ctx, x + 20, rowY + 6, 9, activeFrontColorToCssHex(item.color));
        } else if (item.kind === 'diamond') {
            ctx.save();
            ctx.translate(x + 20, rowY + 6);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = activeFrontColorToCssHex(item.color);
            ctx.fillRect(-4.5, -4.5, 9, 9);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(-4.5, -4.5, 9, 9);
            ctx.restore();
        } else if (item.kind === 'dot') {
            drawCanvasCircle(
                ctx,
                x + 20,
                rowY + 6,
                3.2,
                activeFrontColorToCssHex(item.color),
                activeFrontColorToCssHex(item.color),
                1,
            );
        } else {
            drawCanvasPolyline(
                ctx,
                [
                    [x + 8, rowY + 6],
                    [x + 32, rowY + 6],
                ],
                activeFrontColorToCssHex(item.color),
                item.kind === 'thick' ? 5 : 3,
                item.kind === 'dashed',
            );
        }
        drawCanvasLabel(ctx, item.label, x + 42, rowY, AF_CANVAS_COLORS.text, '10px "JetBrains Mono", Consolas, monospace');
    });
    ctx.restore();
}

function buildConquestFocusPoints(
    bundle: TransitionDebugBundle,
): { id: string; point: [number, number] }[] {
    const out: { id: string; point: [number, number] }[] = [];
    const seen = new Set<string>();
    for (const event of bundle.conquestEvents) {
        const ids = [event.starId, event.attackerStarId, ...(event.attackerStarIds ?? [])];
        for (const id of ids) {
            if (!id || seen.has(id)) continue;
            const point = bundle.starPositions.get(id);
            if (!point) continue;
            seen.add(id);
            out.push({ id, point: [point.x, point.y] });
        }
    }
    return out;
}

function minDistanceToFocus(
    points: readonly [number, number][],
    focusPoints: readonly { id: string; point: [number, number] }[],
): number {
    if (points.length === 0 || focusPoints.length === 0) return Number.POSITIVE_INFINITY;
    let best = Number.POSITIVE_INFINITY;
    for (const [x, y] of points) {
        for (const focus of focusPoints) {
            const dx = x - focus.point[0];
            const dy = y - focus.point[1];
            best = Math.min(best, Math.hypot(dx, dy));
        }
    }
    return best;
}

function drawMonotonicCorrespondence(
    ctx: CanvasRenderingContext2D,
    correspondence: ActiveFrontMonotonicCorrespondence,
): void {
    const pairCount = Math.min(correspondence.prevFront.length, correspondence.postFront.length);
    if (pairCount === 0) return;
    for (let i = 0; i < pairCount; i += 1) {
        const prevPoint = correspondence.prevFront[i]!;
        const nextPoint = correspondence.postFront[i]!;
        drawCanvasPolyline(ctx, [prevPoint, nextPoint], AF_CANVAS_COLORS.correspondence, 1.4);
        drawCanvasCircle(
            ctx,
            prevPoint[0],
            prevPoint[1],
            2.3,
            activeFrontColorToCssHex(AF_COLORS.transitionVertex),
            activeFrontColorToCssHex(AF_COLORS.transitionVertex),
            1,
        );
        drawCanvasCircle(
            ctx,
            nextPoint[0],
            nextPoint[1],
            2.3,
            activeFrontColorToCssHex(AF_COLORS.transitionVertex),
            activeFrontColorToCssHex(AF_COLORS.transitionVertex),
            1,
        );
    }
}

function drawCanvasDiamond(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    fill: string,
): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = fill;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();
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
    const focusPoints = buildConquestFocusPoints(bundle);

    drawActiveFrontHudLegend(ctx, debug);

    for (const focus of focusPoints) {
        drawCanvasCircle(
            ctx,
            focus.point[0],
            focus.point[1],
            11,
            activeFrontColorToCssHex(AF_COLORS.changeAnchor),
            'transparent',
            3,
        );
        drawCanvasLabel(
            ctx,
            focus.id,
            focus.point[0] + 12,
            focus.point[1] - 10,
            activeFrontColorToCssHex(AF_COLORS.changeAnchor),
            'bold 11px "JetBrains Mono", Consolas, monospace',
        );
    }

    if (!plan || !prevTopology || !nextTopology) {
        drawCanvasLabel(ctx, 'No active-front plan/topology available for reference frame.', 18, 170, '#ffb4b4');
        return canvas;
    }

    for (const front of plan.fronts as ActiveFrontTransitionPlan['fronts']) {
        for (const prevPath of front.prevPaths) {
            drawCanvasPolyline(ctx, prevPath.points, activeFrontColorToCssHex(AF_COLORS.prevFront), 3, true);
        }
        for (const nextPath of front.nextPaths) {
            drawCanvasPolyline(ctx, nextPath.points, activeFrontColorToCssHex(AF_COLORS.activeSection), 3, false);
        }

        const correspondence = getActiveFrontMonotonicCorrespondence(front);
        if (correspondence) {
            drawCanvasPolyline(ctx, correspondence.activeFront, activeFrontColorToCssHex(AF_COLORS.activeFront), 5, false);
            const startPoint = correspondence.changeAnchors.startPoint;
            const endPoint = correspondence.changeAnchors.endPoint;
            drawCanvasDiamond(ctx, startPoint[0], startPoint[1], 11, activeFrontColorToCssHex(AF_COLORS.changeAnchor));
            drawCanvasDiamond(ctx, endPoint[0], endPoint[1], 11, activeFrontColorToCssHex(AF_COLORS.changeAnchor));
            drawCanvasLabel(ctx, 'CA', startPoint[0] + 8, startPoint[1] - 12, activeFrontColorToCssHex(AF_COLORS.changeAnchor));
            drawCanvasLabel(ctx, 'CA', endPoint[0] + 8, endPoint[1] - 12, activeFrontColorToCssHex(AF_COLORS.changeAnchor));
            drawMonotonicCorrespondence(ctx, correspondence);
        }
    }

    const defectPairs = (plan.diagnostics.pairDiagnostics as ActiveFrontPairDiagnostic[])
        .filter(
            (pair) =>
                pair.outcome === 'defect_topology_gap' ||
                pair.outcome === 'defect_unsupported_split_mode',
        )
        .map((pair) => {
            const prevPaths = pair.prevPathSectionIds.map((pathSectionIds) =>
                buildTopologyPathPoints(prevTopology, pathSectionIds, pair.anchorStartId),
            );
            const nextPaths = pair.nextPathSectionIds.map((pathSectionIds) =>
                buildTopologyPathPoints(nextTopology, pathSectionIds, pair.anchorStartId),
            );
            const distance = Math.min(
                ...[...prevPaths, ...nextPaths].map((points) =>
                    minDistanceToFocus(points, focusPoints),
                ),
            );
            return { pair, prevPaths, nextPaths, distance };
        })
        .sort((a, b) => a.distance - b.distance);

    const closestDefectDistance = defectPairs[0]?.distance ?? Number.POSITIVE_INFINITY;
    const visibleDefects = defectPairs.filter(
        (entry, index) =>
            focusPoints.length === 0 ||
            index === 0 ||
            entry.distance <= closestDefectDistance + 160,
    );

    for (const entry of visibleDefects) {
        const { pair, prevPaths, nextPaths } = entry;
        for (const points of prevPaths) {
            drawCanvasPolyline(ctx, points, activeFrontColorToCssHex(AF_COLORS.prevFront), 2, true);
        }

        for (const points of nextPaths) {
            const defectColor =
                pair.outcome === 'defect_unsupported_split_mode'
                    ? AF_COLORS.defectSplitMerge
                    : AF_COLORS.defectMissingFrontier;
            drawCanvasPolyline(ctx, points, activeFrontColorToCssHex(defectColor), 3, false);
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
                activeFrontColorToCssHex(AF_COLORS.defectAnchor),
            );
        }
        if (endVertex) {
            drawCanvasSquare(
                ctx,
                endVertex.point[0],
                endVertex.point[1],
                10,
                activeFrontColorToCssHex(AF_COLORS.defectAnchor),
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
