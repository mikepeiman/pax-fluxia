import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import type {
    PerimeterFieldDebugSample,
    PerimeterFieldDebugSnapshot,
} from './buildPerimeterFieldScene';
import type { TransitionPlan } from './perimeterFieldTransitionTypes';

function hexToCss(hex: number, alpha = 1): string {
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darken(hex: number, factor = 0.42): number {
    const r = Math.max(0, Math.min(255, Math.round(((hex >> 16) & 0xff) * factor)));
    const g = Math.max(0, Math.min(255, Math.round(((hex >> 8) & 0xff) * factor)));
    const b = Math.max(0, Math.min(255, Math.round((hex & 0xff) * factor)));
    return (r << 16) | (g << 8) | b;
}

function getPerimeterDebugLoops(
    geometry: CanonicalGeometrySnapshot,
): ReadonlyArray<ReadonlyArray<[number, number]>> {
    const outerLoops = geometry.shellLoops
        .filter((loop) => loop.classification === 'outer')
        .map((loop) => loop.points);
    return outerLoops.length > 0
        ? outerLoops
        : geometry.territoryRegions.map((region) => region.points);
}

function getSampleAccentColor(sample: PerimeterFieldDebugSample): number {
    const role = sample.transitionRole ?? sample.debugState;
    switch (role) {
        case 'target':
            return 0xff5bd1;
        case 'preserved':
            return 0xf7d154;
        case 'mover':
            return 0xffc145;
        case 'appearing':
            return 0x6ee7a7;
        case 'disappearing':
            return 0xff8c82;
        case 'transition-old':
            return 0xff8c82;
        case 'transition-new':
            return 0x6ee7a7;
        case 'static':
        default:
            return 0x47d7ff;
    }
}

function buildSampleLabel(sample: PerimeterFieldDebugSample): string | null {
    if (sample.label) return sample.label;
    if (sample.moverId) return sample.moverId;
    if (sample.sampleIndex == null) return sample.vId ?? null;

    const labelPrefix =
        sample.debugState === 'transition-old'
            ? 'O'
            : sample.debugState === 'transition-new'
              ? 'N'
              : sample.debugState === 'target'
                ? 'T'
                : sample.debugState === 'preserved'
                  ? 'K'
                  : sample.debugState === 'mover'
                    ? 'P'
                    : sample.debugState === 'appearing'
                      ? 'A'
                      : sample.debugState === 'disappearing'
                        ? 'D'
                        : 'S';
    return `${labelPrefix}${sample.sampleIndex}`;
}

function getLabelOffset(sample: PerimeterFieldDebugSample): { x: number; y: number } {
    switch (sample.debugState) {
        case 'transition-old':
        case 'disappearing':
            return { x: -11, y: -11 };
        case 'transition-new':
        case 'appearing':
            return { x: 11, y: 11 };
        case 'target':
            return { x: 11, y: -11 };
        case 'mover':
            return { x: 0, y: -13 };
        case 'preserved':
            return { x: -12, y: 12 };
        case 'static':
        default:
            return { x: -10, y: 10 };
    }
}

function drawClosedPolyline(
    ctx: CanvasRenderingContext2D,
    points: ReadonlyArray<[number, number]>,
    color: number,
    alpha: number,
    width: number,
): void {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0]![0], points[0]![1]);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i]![0], points[i]![1]);
    }
    ctx.closePath();
    ctx.strokeStyle = hexToCss(color, alpha);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

function drawFallbackX(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
): void {
    ctx.save();
    ctx.strokeStyle = hexToCss(0xff3b30, 0.95);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 2.5, y - 2.5);
    ctx.lineTo(x + 2.5, y + 2.5);
    ctx.moveTo(x + 2.5, y - 2.5);
    ctx.lineTo(x - 2.5, y + 2.5);
    ctx.stroke();
    ctx.restore();
}

function buildStarPath(
    x: number,
    y: number,
    outerRadius: number,
    innerRadius: number,
    spikeCount = 5,
): Path2D {
    const path = new Path2D();
    const startAngle = -Math.PI / 2;
    for (let i = 0; i < spikeCount; i++) {
        const outerAngle = startAngle + (i * Math.PI * 2) / spikeCount;
        const innerAngle = outerAngle + Math.PI / spikeCount;
        const outerX = x + Math.cos(outerAngle) * outerRadius;
        const outerY = y + Math.sin(outerAngle) * outerRadius;
        const innerX = x + Math.cos(innerAngle) * innerRadius;
        const innerY = y + Math.sin(innerAngle) * innerRadius;
        if (i === 0) {
            path.moveTo(outerX, outerY);
        } else {
            path.lineTo(outerX, outerY);
        }
        path.lineTo(innerX, innerY);
    }
    path.closePath();
    return path;
}

function drawSamplePoints(
    ctx: CanvasRenderingContext2D,
    samples: ReadonlyArray<PerimeterFieldDebugSample>,
    alpha: number,
    radius: number,
): void {
    for (const sample of samples) {
        const fillColor = sample.ownerColor;
        const borderColor = darken(fillColor, 0.42);
        const accentColor = getSampleAccentColor(sample);
        const path = buildStarPath(
            sample.x,
            sample.y,
            radius,
            Math.max(1.2, radius * 0.45),
        );

        ctx.save();
        ctx.beginPath();
        ctx.arc(sample.x, sample.y, radius + 1.6, 0, Math.PI * 2);
        ctx.strokeStyle = hexToCss(accentColor, 0.56);
        ctx.lineWidth = Math.max(1, radius * 0.48);
        ctx.stroke();

        ctx.fillStyle = hexToCss(fillColor, Math.max(0.92, alpha));
        ctx.fill(path);
        ctx.strokeStyle = hexToCss(borderColor, 0.95);
        ctx.lineWidth = Math.max(0.9, radius * 0.32);
        ctx.stroke(path);
        ctx.restore();
    }
}

function drawPerimeterSampleTrajectories(
    ctx: CanvasRenderingContext2D,
    samples: ReadonlyArray<PerimeterFieldDebugSample>,
): void {
    for (const sample of samples) {
        if (
            sample.pathStartX == null ||
            sample.pathStartY == null ||
            sample.pathEndX == null ||
            sample.pathEndY == null
        ) {
            continue;
        }

        const accentColor = getSampleAccentColor(sample);
        const lineAlpha =
            sample.debugState === 'transition-old' ||
            sample.debugState === 'disappearing'
                ? 0.3
                : 0.42;

        ctx.save();
        ctx.strokeStyle = hexToCss(accentColor, lineAlpha);
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        ctx.moveTo(sample.pathStartX, sample.pathStartY);
        ctx.lineTo(sample.pathEndX, sample.pathEndY);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sample.pathStartX, sample.pathStartY, 1.4, 0, Math.PI * 2);
        ctx.strokeStyle = hexToCss(accentColor, 0.65);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.strokeStyle = hexToCss(accentColor, 0.78);
        ctx.strokeRect(sample.pathEndX - 1.6, sample.pathEndY - 1.6, 3.2, 3.2);
        ctx.restore();

        if (sample.startFallback) {
            drawFallbackX(ctx, sample.pathStartX, sample.pathStartY);
        }
        if (sample.endFallback) {
            drawFallbackX(ctx, sample.pathEndX, sample.pathEndY);
        }
    }
}

function drawPerimeterSampleLabels(
    ctx: CanvasRenderingContext2D,
    samples: ReadonlyArray<PerimeterFieldDebugSample>,
): void {
    ctx.save();
    ctx.font = '700 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const sample of samples) {
        const text = buildSampleLabel(sample);
        if (!text) continue;
        const offset = getLabelOffset(sample);
        const accentColor = getSampleAccentColor(sample);
        ctx.strokeStyle = hexToCss(0x081018, 1);
        ctx.lineWidth = 3;
        ctx.strokeText(text, sample.x + offset.x, sample.y + offset.y);
        ctx.fillStyle = hexToCss(accentColor, 1);
        ctx.fillText(text, sample.x + offset.x, sample.y + offset.y);
    }

    ctx.restore();
}

function drawTopologySections(
    ctx: CanvasRenderingContext2D,
    geometry: CanonicalGeometrySnapshot,
    sectionIds: ReadonlySet<string>,
    color: number,
    width: number,
    alpha: number,
): void {
    if (sectionIds.size === 0 || geometry.frontierTopology.sections.size === 0) return;
    for (const sectionId of [...sectionIds].sort()) {
        const section = geometry.frontierTopology.sections.get(sectionId);
        if (!section || section.points.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(section.points[0]![0], section.points[0]![1]);
        for (let i = 1; i < section.points.length; i++) {
            ctx.lineTo(section.points[i]![0], section.points[i]![1]);
        }
        ctx.strokeStyle = hexToCss(color, alpha);
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }
}

function drawChangedSections(
    ctx: CanvasRenderingContext2D,
    snapshot: PerimeterFieldDebugSnapshot,
): void {
    const plan = snapshot.transitionPlan;
    if (!plan) return;

    const displayVersion = snapshot.displayGeometry.version;
    const targetVersion = snapshot.transitionTargetGeometry?.version ?? null;
    if (displayVersion === plan.prevGeometry.version) {
        drawTopologySections(
            ctx,
            snapshot.displayGeometry,
            plan.changedSections.removedSectionIds,
            0xff8c82,
            3.6,
            0.85,
        );
    }
    if (displayVersion === plan.nextGeometry.version) {
        drawTopologySections(
            ctx,
            snapshot.displayGeometry,
            plan.changedSections.addedSectionIds,
            0x6ee7a7,
            3.6,
            0.85,
        );
    }
    if (targetVersion === plan.nextGeometry.version && snapshot.transitionTargetGeometry) {
        drawTopologySections(
            ctx,
            snapshot.transitionTargetGeometry,
            plan.changedSections.addedSectionIds,
            0x6ee7a7,
            3.2,
            0.75,
        );
    }
}

export function renderPerimeterFieldDiagnosticCanvas(args: {
    width: number;
    height: number;
    snapshot: PerimeterFieldDebugSnapshot;
    baseCanvas?: HTMLCanvasElement | null;
    snapshotMode?: PerimeterFieldSnapshotMode;
    showGeometry?: boolean;
    showVstars?: boolean;
    showIds?: boolean;
    showVectors?: boolean;
    transparentBackground?: boolean;
}): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = args.width;
    canvas.height = args.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return canvas;
    }

    if (!(args.transparentBackground ?? false)) {
        ctx.fillStyle = '#0b1117';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (args.baseCanvas) {
        ctx.drawImage(args.baseCanvas, 0, 0, canvas.width, canvas.height);
    }

    const renderState = resolveSnapshotRenderState(
        args.snapshot,
        args.snapshotMode ?? 'transition',
    );

    if (args.showGeometry ?? true) {
        for (const points of getPerimeterDebugLoops(renderState.primaryGeometry)) {
            drawClosedPolyline(ctx, points, 0x47d7ff, 0.85, 2);
        }
        if (renderState.secondaryGeometry) {
            for (const points of getPerimeterDebugLoops(renderState.secondaryGeometry)) {
                drawClosedPolyline(ctx, points, 0xff5bd1, 0.65, 2);
            }
        }
        drawChangedSections(ctx, args.snapshot);
    }

    if (args.showVstars ?? true) {
        if ((args.showVectors ?? true) && renderState.vectorSamples.length > 0) {
            drawPerimeterSampleTrajectories(ctx, renderState.vectorSamples);
        }
        drawSamplePoints(ctx, renderState.currentSamples, 0.95, 2.6);
        if (args.showIds ?? true) {
            drawPerimeterSampleLabels(ctx, renderState.currentSamples);
        }
        if (renderState.referenceSamples.length > 0) {
            drawSamplePoints(ctx, renderState.referenceSamples, 0.75, 2.3);
            if (args.showIds ?? true) {
                drawPerimeterSampleLabels(ctx, renderState.referenceSamples);
            }
        }
    }

    return canvas;
}

function compactTransitionPlan(plan: TransitionPlan): Record<string, unknown> {
    const removedSectionIds = [...plan.changedSections.removedSectionIds].sort();
    const addedSectionIds = [...plan.changedSections.addedSectionIds].sort();
    const straightMovers = plan.movers.filter((mover) => mover.pathType === 'straight').length;
    const arcMovers = plan.movers.length - straightMovers;
    return {
        conquestKey: plan.conquestKey,
        prevGeometryVersion: plan.prevGeometry.version,
        nextGeometryVersion: plan.nextGeometry.version,
        prevVCount: plan.prevVSet.length,
        nextVCount: plan.nextVSet.length,
        preservedVCount: plan.preservedVIds.size,
        preservedMatchKeyCount: plan.preservedMatchKeys.size,
        moverCount: plan.movers.length,
        straightMoverCount: straightMovers,
        arcMoverCount: arcMovers,
        appearingCount: plan.appearing.length,
        disappearingCount: plan.disappearing.length,
        removedSectionIds,
        addedSectionIds,
        unchangedSectionCount: plan.changedSections.unchangedSectionIds.size,
    };
}

function compactSample(sample: PerimeterFieldDebugSample): Record<string, unknown> {
    const round = (value: number): number => Math.round(value * 100) / 100;
    return {
        id: sample.id,
        ownerId: sample.ownerId,
        ownerColor: sample.ownerColor,
        sourceId: sample.sourceId ?? null,
        starIds: sample.starIds ?? null,
        vId: sample.vId ?? null,
        moverId: sample.moverId ?? null,
        transitionRole: sample.transitionRole ?? null,
        label: sample.label ?? null,
        playerIdx: sample.playerIdx,
        sampleIndex: sample.sampleIndex ?? null,
        x: round(sample.x),
        y: round(sample.y),
        strength: round(sample.strength),
        debugState: sample.debugState,
        pathStart:
            sample.pathStartX != null && sample.pathStartY != null
                ? [round(sample.pathStartX), round(sample.pathStartY)]
                : null,
        pathEnd:
            sample.pathEndX != null && sample.pathEndY != null
                ? [round(sample.pathEndX), round(sample.pathEndY)]
                : null,
        startFallback: Boolean(sample.startFallback),
        endFallback: Boolean(sample.endFallback),
    };
}

export function compactPerimeterFieldDebugSnapshot(
    snapshot: PerimeterFieldDebugSnapshot | null | undefined,
): Record<string, unknown> | null {
    if (!snapshot) return null;

    return {
        effectiveProgress: snapshot.effectiveProgress,
        displayGeometryVersion: snapshot.displayGeometry.version,
        transitionTargetGeometryVersion:
            snapshot.transitionTargetGeometry?.version ?? null,
        renderedSamples: snapshot.renderedSamples.map(compactSample),
        staticSamples: snapshot.staticSamples.map(compactSample),
        targetStaticSamples: snapshot.targetStaticSamples.map(compactSample),
        transitionSamples: snapshot.transitionSamples.map(compactSample),
        transitionPlan: snapshot.transitionPlan
            ? compactTransitionPlan(snapshot.transitionPlan)
            : null,
    };
}
