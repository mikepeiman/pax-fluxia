import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import type {
    PerimeterFieldDebugSample,
    PerimeterFieldDebugSnapshot,
} from './buildPerimeterFieldScene';

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
        const path = buildStarPath(
            sample.x,
            sample.y,
            radius,
            Math.max(1.2, radius * 0.45),
        );

        ctx.save();
        ctx.beginPath();
        ctx.arc(sample.x, sample.y, radius + 1.6, 0, Math.PI * 2);
        ctx.strokeStyle = hexToCss(fillColor, 0.42);
        ctx.lineWidth = Math.max(0.8, radius * 0.42);
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

        const lineAlpha = sample.debugState === 'transition-old' ? 0.28 : 0.38;

        ctx.save();
        ctx.strokeStyle = hexToCss(sample.ownerColor, lineAlpha);
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        ctx.moveTo(sample.pathStartX, sample.pathStartY);
        ctx.lineTo(sample.pathEndX, sample.pathEndY);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sample.pathStartX, sample.pathStartY, 1.4, 0, Math.PI * 2);
        ctx.strokeStyle = hexToCss(sample.ownerColor, 0.65);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.strokeStyle = hexToCss(sample.ownerColor, 0.72);
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
        if (sample.sampleIndex == null) continue;
        const labelPrefix =
            sample.debugState === 'transition-old'
                ? 'O'
                : sample.debugState === 'transition-new'
                  ? 'N'
                  : '';
        const offsetX =
            sample.debugState === 'transition-old'
                ? -8
                : sample.debugState === 'transition-new'
                  ? 8
                  : 0;
        const offsetY =
            sample.debugState === 'transition-old'
                ? -8
                : sample.debugState === 'transition-new'
                  ? 8
                  : -8;

        const text = `${labelPrefix}${sample.sampleIndex}`;
        ctx.strokeStyle = hexToCss(0x081018, 1);
        ctx.lineWidth = 3;
        ctx.strokeText(text, sample.x + offsetX, sample.y + offsetY);
        ctx.fillStyle = hexToCss(sample.ownerColor, 1);
        ctx.fillText(text, sample.x + offsetX, sample.y + offsetY);
    }

    ctx.restore();
}

export function renderPerimeterFieldDiagnosticCanvas(args: {
    width: number;
    height: number;
    snapshot: PerimeterFieldDebugSnapshot;
    baseCanvas?: HTMLCanvasElement | null;
    showGeometry?: boolean;
    showVstars?: boolean;
}): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = args.width;
    canvas.height = args.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return canvas;
    }

    ctx.fillStyle = '#0b1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (args.baseCanvas) {
        ctx.drawImage(args.baseCanvas, 0, 0, canvas.width, canvas.height);
    }

    if (args.showGeometry ?? true) {
        for (const points of getPerimeterDebugLoops(args.snapshot.displayGeometry)) {
            drawClosedPolyline(ctx, points, 0x47d7ff, 0.85, 2);
        }
        if (args.snapshot.transitionTargetGeometry) {
            for (const points of getPerimeterDebugLoops(
                args.snapshot.transitionTargetGeometry,
            )) {
                drawClosedPolyline(ctx, points, 0xff5bd1, 0.65, 2);
            }
        }
    }

    if (args.showVstars ?? true) {
        drawPerimeterSampleTrajectories(ctx, args.snapshot.transitionSamples);
        drawSamplePoints(ctx, args.snapshot.staticSamples, 0.95, 2.6);
        if (args.snapshot.transitionTargetGeometry) {
            drawSamplePoints(ctx, args.snapshot.targetStaticSamples, 0.75, 2.3);
        }
        drawSamplePoints(ctx, args.snapshot.transitionSamples, 0.95, 3.2);
        drawPerimeterSampleLabels(ctx, args.snapshot.transitionSamples);
    }

    return canvas;
}

function compactSample(sample: PerimeterFieldDebugSample): Record<string, unknown> {
    return {
        id: sample.id,
        ownerId: sample.ownerId,
        ownerColor: sample.ownerColor,
        playerIdx: sample.playerIdx,
        sampleIndex: sample.sampleIndex ?? null,
        x: sample.x,
        y: sample.y,
        strength: sample.strength,
        debugState: sample.debugState,
        pathStart:
            sample.pathStartX != null && sample.pathStartY != null
                ? [sample.pathStartX, sample.pathStartY]
                : null,
        pathEnd:
            sample.pathEndX != null && sample.pathEndY != null
                ? [sample.pathEndX, sample.pathEndY]
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
        staticSamples: snapshot.staticSamples.map(compactSample),
        targetStaticSamples: snapshot.targetStaticSamples.map(compactSample),
        transitionSamples: snapshot.transitionSamples.map(compactSample),
    };
}
