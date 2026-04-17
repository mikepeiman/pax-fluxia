import JSZip from 'jszip';
import type { TerritoryConquestEvent } from '../contracts/OwnershipContracts';
import type {
    PerimeterFieldDebugSample,
    PerimeterFieldDebugSnapshot,
} from '../families/perimeterField/buildPerimeterFieldScene';
import { compactPerimeterFieldDebugSnapshot } from '../families/perimeterField/perimeterFieldDiagnostics';
import { filePrefixFromIsoTimestamp } from './snapshotExport';

type SamplePoint = {
    x: number;
    y: number;
};

export interface PerimeterFieldPackageFrame {
    frameIndex: number;
    progress: number;
    canvas: HTMLCanvasElement;
    debugSnapshot: PerimeterFieldDebugSnapshot | null;
}

export interface PerimeterFieldConquestPackageParams {
    label: string;
    timestamp: string;
    conquestEvents: readonly TerritoryConquestEvent[];
    previousFrame: PerimeterFieldPackageFrame;
    transitionFrames: readonly PerimeterFieldPackageFrame[];
    nextFrame?: PerimeterFieldPackageFrame | null;
    starPositions: ReadonlyMap<string, { x: number; y: number }>;
    arrowWidth: number;
    selectedFrameIndex: number;
    onionSkinCount: number;
    strobeStride: number;
}

type ConquestOverlayEvent = TerritoryConquestEvent & {
    attackerStarIds?: readonly string[];
};

function hexToCss(hex: number, alpha = 1): string {
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }, 100);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('canvas.toBlob returned null'));
            },
            'image/png',
        );
    });
}

function drawArrow(
    ctx: CanvasRenderingContext2D,
    start: SamplePoint,
    end: SamplePoint,
    color: number,
    alpha: number,
    width: number,
): void {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length <= 1e-6) return;

    const nx = dx / length;
    const ny = dy / length;
    const wingX = -ny;
    const wingY = nx;
    const headLength = Math.max(8, width * 3.2);
    const wingLength = Math.max(4, width * 1.9);

    ctx.save();
    ctx.strokeStyle = hexToCss(color, alpha);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
        end.x - nx * headLength + wingX * wingLength,
        end.y - ny * headLength + wingY * wingLength,
    );
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
        end.x - nx * headLength - wingX * wingLength,
        end.y - ny * headLength - wingY * wingLength,
    );
    ctx.stroke();
    ctx.restore();
}

function drawMarker(
    ctx: CanvasRenderingContext2D,
    point: SamplePoint,
    color: number,
    alpha: number,
    radius: number,
): void {
    ctx.save();
    ctx.fillStyle = hexToCss(color, alpha);
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function clipMiddleLabel(value: string, maxLength = 22): string {
    if (value.length <= maxLength) return value;
    const lead = Math.max(6, Math.floor((maxLength - 1) / 2));
    const tail = Math.max(6, maxLength - lead - 1);
    return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

function resolveSampleLabel(sample: PerimeterFieldDebugSample): string {
    if (typeof sample.id === 'string' && sample.id.length > 0) {
        return clipMiddleLabel(sample.id);
    }
    if (sample.sourceId) {
        return clipMiddleLabel(
            sample.sampleIndex != null
                ? `${sample.sourceId}:${sample.sampleIndex}`
                : sample.sourceId,
        );
    }
    if (sample.sampleIndex != null) {
        return `sample:${sample.sampleIndex}`;
    }
    return 'sample';
}

function getPackageSampleKey(sample: PerimeterFieldDebugSample): string {
    return (
        sample.id ??
        [
            sample.ownerId,
            sample.sourceId ?? 'source',
            sample.sampleIndex ?? 'sample',
        ].join(':')
    );
}

function drawLabel(
    ctx: CanvasRenderingContext2D,
    point: SamplePoint,
    label: string,
    color: number,
): void {
    ctx.save();
    ctx.font = '700 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const metrics = ctx.measureText(label);
    const width = Math.ceil(metrics.width + 10);
    const height = 18;
    const x = point.x;
    const y = point.y - 18;

    ctx.fillStyle = 'rgba(6, 10, 18, 0.88)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - height / 2, width, height, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = hexToCss(color, 1);
    ctx.fillText(label, x, y + 0.5);
    ctx.restore();
}

function drawConquestStars(
    ctx: CanvasRenderingContext2D,
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
    conquestEvents: readonly TerritoryConquestEvent[],
): void {
    for (const conquest of conquestEvents) {
        const target = starPositions.get(conquest.starId);
        if (target) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 243, 107, 0.95)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(target.x, target.y, 18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(target.x - 14, target.y);
            ctx.lineTo(target.x + 14, target.y);
            ctx.moveTo(target.x, target.y - 14);
            ctx.lineTo(target.x, target.y + 14);
            ctx.stroke();
            ctx.restore();
        }
        const attackerStarIds =
            (conquest as ConquestOverlayEvent).attackerStarIds ?? [];
        for (const attackerStarId of attackerStarIds) {
            const attacker = starPositions.get(attackerStarId);
            if (!attacker) continue;
            ctx.save();
            ctx.strokeStyle = 'rgba(120, 220, 255, 0.9)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(attacker.x, attacker.y, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

function drawGhostSamples(args: {
    ctx: CanvasRenderingContext2D;
    samples: ReadonlyArray<PerimeterFieldDebugSample>;
    alpha: number;
    radius: number;
    mode: 'past' | 'future';
}): void {
    for (const sample of args.samples) {
        const color = sample.ownerColor ?? 0xffffff;
        drawMarker(
            args.ctx,
            { x: sample.x, y: sample.y },
            color,
            args.alpha + (args.mode === 'future' ? 0.03 : 0),
            args.radius,
        );
    }
}

function renderTransitionFrameCanvas(args: {
    baseCanvas: HTMLCanvasElement;
    snapshot: PerimeterFieldDebugSnapshot | null;
    arrowWidth: number;
    starPositions: ReadonlyMap<string, { x: number; y: number }>;
    conquestEvents: readonly TerritoryConquestEvent[];
}): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = args.baseCanvas.width;
    canvas.height = args.baseCanvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.drawImage(args.baseCanvas, 0, 0);
    drawConquestStars(ctx, args.starPositions, args.conquestEvents);

    if (!args.snapshot) return canvas;

    for (const sample of args.snapshot.transitionSamples) {
        if (
            sample.pathStartX == null ||
            sample.pathStartY == null ||
            sample.pathEndX == null ||
            sample.pathEndY == null
        ) {
            continue;
        }

        const start = { x: sample.pathStartX, y: sample.pathStartY };
        const current = { x: sample.x, y: sample.y };
        const end = { x: sample.pathEndX, y: sample.pathEndY };

        drawArrow(ctx, start, end, sample.ownerColor, 0.6, args.arrowWidth);
        drawMarker(ctx, start, sample.ownerColor, 0.3, 3.2);
        drawMarker(ctx, end, sample.ownerColor, 0.6, 3.6);
        drawMarker(ctx, current, sample.ownerColor, 1, 4.2);
        drawLabel(ctx, current, resolveSampleLabel(sample), sample.ownerColor);
    }

    return canvas;
}

function renderArcSummaryCanvas(args: {
    baseCanvas: HTMLCanvasElement;
    previousSnapshot: PerimeterFieldDebugSnapshot | null;
    transitionSnapshots: ReadonlyArray<PerimeterFieldDebugSnapshot | null>;
    nextSnapshot: PerimeterFieldDebugSnapshot | null;
    arrowWidth: number;
    starPositions: ReadonlyMap<string, { x: number; y: number }>;
    conquestEvents: readonly TerritoryConquestEvent[];
}): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = args.baseCanvas.width;
    canvas.height = args.baseCanvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.drawImage(args.baseCanvas, 0, 0);
    drawConquestStars(ctx, args.starPositions, args.conquestEvents);

    const traces = new Map<
        string,
        {
            color: number;
            label: string;
            start: SamplePoint | null;
            end: SamplePoint | null;
            points: SamplePoint[];
        }
    >();

    for (const snapshot of args.transitionSnapshots) {
        if (!snapshot) continue;
        for (const sample of snapshot.transitionSamples) {
            const sampleKey =
                sample.id ??
                [
                    sample.ownerId,
                    sample.sourceId ?? 'source',
                    sample.sampleIndex ?? 'sample',
                ].join(':');
            const entry = traces.get(sampleKey) ?? {
                color: sample.ownerColor,
                label: resolveSampleLabel(sample),
                start:
                    sample.pathStartX != null && sample.pathStartY != null
                        ? { x: sample.pathStartX, y: sample.pathStartY }
                        : null,
                end:
                    sample.pathEndX != null && sample.pathEndY != null
                        ? { x: sample.pathEndX, y: sample.pathEndY }
                        : null,
                points: [],
            };
            entry.points.push({ x: sample.x, y: sample.y });
            traces.set(sampleKey, entry);
        }
    }

    for (const trace of traces.values()) {
        const points = [
            ...(trace.start ? [trace.start] : []),
            ...trace.points,
            ...(trace.end ? [trace.end] : []),
        ];
        if (points.length < 2) continue;

        ctx.save();
        ctx.strokeStyle = hexToCss(trace.color, 0.82);
        ctx.lineWidth = args.arrowWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(points[0]!.x, points[0]!.y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i]!.x, points[i]!.y);
        }
        ctx.stroke();
        ctx.restore();

        for (let i = 1; i < points.length - 1; i++) {
            drawMarker(ctx, points[i]!, trace.color, 0.55, 2.4);
        }
        drawMarker(ctx, points[0]!, trace.color, 0.3, 3.2);
        drawMarker(ctx, points[points.length - 1]!, trace.color, 1, 4.4);
        drawArrow(
            ctx,
            points[Math.max(0, points.length - 2)]!,
            points[points.length - 1]!,
            trace.color,
            1,
            args.arrowWidth,
        );
        drawLabel(
            ctx,
            points[points.length - 1]!,
            trace.label,
            trace.color,
        );
    }

    return canvas;
}

function renderOnionSkinCanvas(args: {
    frames: ReadonlyArray<{
        canvas: HTMLCanvasElement;
        debugSnapshot: PerimeterFieldDebugSnapshot | null;
    }>;
    selectedIndex: number;
    ghostCount: number;
}): HTMLCanvasElement | null {
    const ghostCount = Math.max(0, Math.round(args.ghostCount));
    if (ghostCount <= 0 || args.frames.length === 0) return null;

    const selectedIndex = Math.max(
        0,
        Math.min(args.frames.length - 1, Math.round(args.selectedIndex)),
    );
    const selectedFrame = args.frames[selectedIndex]!;
    const canvas = document.createElement('canvas');
    canvas.width = selectedFrame.canvas.width;
    canvas.height = selectedFrame.canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(selectedFrame.canvas, 0, 0);

    for (let offset = ghostCount; offset >= 1; offset--) {
        const pastFrame = args.frames[selectedIndex - offset];
        const futureFrame = args.frames[selectedIndex + offset];
        const alpha = 0.08 + ((ghostCount - offset + 1) / ghostCount) * 0.18;
        const radius = 1.4 + ((ghostCount - offset + 1) / ghostCount) * 1.1;

        if (pastFrame?.debugSnapshot) {
            drawGhostSamples({
                ctx,
                samples: pastFrame.debugSnapshot.transitionSamples,
                alpha,
                radius,
                mode: 'past',
            });
        }

        if (futureFrame?.debugSnapshot) {
            drawGhostSamples({
                ctx,
                samples: futureFrame.debugSnapshot.transitionSamples,
                alpha,
                radius,
                mode: 'future',
            });
        }
    }

    return canvas;
}

function renderStrobeTrailCanvas(args: {
    baseCanvas: HTMLCanvasElement;
    frames: ReadonlyArray<{
        debugSnapshot: PerimeterFieldDebugSnapshot | null;
    }>;
    selectedIndex: number;
    stride: number;
    arrowWidth: number;
}): HTMLCanvasElement | null {
    const stride = Math.max(0, Math.round(args.stride));
    if (stride <= 0 || args.frames.length <= 1) return null;

    const canvas = document.createElement('canvas');
    canvas.width = args.baseCanvas.width;
    canvas.height = args.baseCanvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(args.baseCanvas, 0, 0);

    const sampledFrameIndexes: number[] = [];
    for (let i = 0; i < args.frames.length; i += stride) {
        sampledFrameIndexes.push(i);
    }
    const lastIndex = args.frames.length - 1;
    if (!sampledFrameIndexes.includes(lastIndex)) {
        sampledFrameIndexes.push(lastIndex);
    }

    const traces = new Map<
        string,
        {
            color: number;
            points: Array<{ x: number; y: number; frameIndex: number }>;
        }
    >();

    for (const frameIndex of sampledFrameIndexes) {
        const snapshot = args.frames[frameIndex]?.debugSnapshot;
        if (!snapshot) continue;
        for (const sample of snapshot.transitionSamples) {
            const key = getPackageSampleKey(sample);
            const entry = traces.get(key) ?? {
                color: sample.ownerColor ?? 0xffffff,
                points: [],
            };
            entry.points.push({ x: sample.x, y: sample.y, frameIndex });
            traces.set(key, entry);
        }
    }

    for (const trace of traces.values()) {
        if (trace.points.length < 2) continue;
        trace.points.sort((a, b) => a.frameIndex - b.frameIndex);

        ctx.save();
        ctx.strokeStyle = hexToCss(trace.color, 0.24);
        ctx.lineWidth = Math.max(0.9, args.arrowWidth * 0.55);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(trace.points[0]!.x, trace.points[0]!.y);
        for (let i = 1; i < trace.points.length; i++) {
            ctx.lineTo(trace.points[i]!.x, trace.points[i]!.y);
        }
        ctx.stroke();
        ctx.restore();

        for (const point of trace.points) {
            if (point.frameIndex === args.selectedIndex) continue;
            drawMarker(
                ctx,
                { x: point.x, y: point.y },
                trace.color,
                0.18,
                1.8,
            );
        }
    }

    return canvas;
}

function buildRenderedConquestFrames(
    params: PerimeterFieldConquestPackageParams,
): Array<{
    filename: string;
    label: string;
    progress: number;
    canvas: HTMLCanvasElement;
    snapshot: Record<string, unknown> | null;
}> {
    const frames: Array<{
        filename: string;
        label: string;
        progress: number;
        canvas: HTMLCanvasElement;
        snapshot: Record<string, unknown> | null;
    }> = [];

    const previousCanvas = renderTransitionFrameCanvas({
        baseCanvas: params.previousFrame.canvas,
        snapshot: params.previousFrame.debugSnapshot,
        arrowWidth: params.arrowWidth,
        starPositions: params.starPositions,
        conquestEvents: params.conquestEvents,
    });
    frames.push({
        filename: 'frames/frame_000_prev.png',
        label: 'PREV',
        progress: params.previousFrame.progress,
        canvas: previousCanvas,
        snapshot: compactPerimeterFieldDebugSnapshot(
            params.previousFrame.debugSnapshot,
        ),
    });

    for (let i = 0; i < params.transitionFrames.length; i++) {
        const frame = params.transitionFrames[i]!;
        const canvas = renderTransitionFrameCanvas({
            baseCanvas: frame.canvas,
            snapshot: frame.debugSnapshot,
            arrowWidth: params.arrowWidth,
            starPositions: params.starPositions,
            conquestEvents: params.conquestEvents,
        });
        const pct = Math.round(frame.progress * 1000)
            .toString()
            .padStart(4, '0');
        frames.push({
            filename: `frames/frame_${String(i + 1).padStart(3, '0')}_t${pct}.png`,
            label: `F${frame.frameIndex} · t=${frame.progress.toFixed(3)}`,
            progress: frame.progress,
            canvas,
            snapshot: compactPerimeterFieldDebugSnapshot(frame.debugSnapshot),
        });
    }

    if (params.nextFrame) {
        const nextCanvas = renderTransitionFrameCanvas({
            baseCanvas: params.nextFrame.canvas,
            snapshot: params.nextFrame.debugSnapshot,
            arrowWidth: params.arrowWidth,
            starPositions: params.starPositions,
            conquestEvents: params.conquestEvents,
        });
        frames.push({
            filename: 'frames/frame_final_next.png',
            label: 'NEXT',
            progress: params.nextFrame.progress,
            canvas: nextCanvas,
            snapshot: compactPerimeterFieldDebugSnapshot(
                params.nextFrame.debugSnapshot,
            ),
        });
    }

    return frames;
}

function renderContactSheetCanvas(args: {
    label: string;
    timestamp: string;
    frames: ReadonlyArray<{
        label: string;
        progress: number;
        canvas: HTMLCanvasElement;
    }>;
}): HTMLCanvasElement {
    const tileCount = Math.max(1, args.frames.length);
    const cols = Math.min(3, tileCount);
    const rows = Math.ceil(tileCount / cols);
    const tileWidth = args.frames[0]?.canvas.width ?? 400;
    const tileHeight = args.frames[0]?.canvas.height ?? 240;
    const cellHeaderHeight = 26;
    const titleHeight = 42;

    const canvas = document.createElement('canvas');
    canvas.width = tileWidth * cols;
    canvas.height = titleHeight + rows * (tileHeight + cellHeaderHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.fillStyle = '#0b1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#121b24';
    ctx.fillRect(0, 0, canvas.width, titleHeight);
    ctx.font = '700 16px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d7e6f3';
    ctx.fillText(args.label, 14, 17);
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(215, 230, 243, 0.72)';
    ctx.fillText(args.timestamp, 14, 31);

    for (let i = 0; i < args.frames.length; i++) {
        const frame = args.frames[i]!;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * tileWidth;
        const y = titleHeight + row * (tileHeight + cellHeaderHeight);

        ctx.fillStyle = '#17222e';
        ctx.fillRect(x, y, tileWidth, cellHeaderHeight);
        ctx.fillStyle = '#d7e6f3';
        ctx.font = '700 12px monospace';
        ctx.fillText(frame.label, x + 10, y + cellHeaderHeight / 2);
        ctx.drawImage(frame.canvas, x, y + cellHeaderHeight, tileWidth, tileHeight);
    }

    return canvas;
}

export async function downloadPerimeterFieldConquestPackage(
    params: PerimeterFieldConquestPackageParams,
): Promise<void> {
    const prefix = filePrefixFromIsoTimestamp(params.timestamp);
    const zip = new JSZip();
    const renderedFrames = buildRenderedConquestFrames(params);
    const diagnosticFrames = [
        {
            canvas: params.previousFrame.canvas,
            debugSnapshot: params.previousFrame.debugSnapshot,
        },
        ...params.transitionFrames.map((frame) => ({
            canvas: frame.canvas,
            debugSnapshot: frame.debugSnapshot,
        })),
        ...(params.nextFrame
            ? [
                  {
                      canvas: params.nextFrame.canvas,
                      debugSnapshot: params.nextFrame.debugSnapshot,
                  },
              ]
            : []),
    ];
    const frameEntries = renderedFrames.map((frame) => ({
        filename: frame.filename,
        progress: frame.progress,
        snapshot: frame.snapshot,
    }));

    for (const frame of renderedFrames) {
        zip.file(frame.filename, await (await canvasToBlob(frame.canvas)).arrayBuffer());
    }

    const arcSummaryCanvas = renderArcSummaryCanvas({
        baseCanvas: params.previousFrame.canvas,
        previousSnapshot: params.previousFrame.debugSnapshot,
        transitionSnapshots: params.transitionFrames.map(
            (frame) => frame.debugSnapshot,
        ),
        nextSnapshot: params.nextFrame?.debugSnapshot ?? null,
        arrowWidth: params.arrowWidth,
        starPositions: params.starPositions,
        conquestEvents: params.conquestEvents,
    });
    await zip.file(
        'summary/conquest_arc_summary.png',
        await (await canvasToBlob(arcSummaryCanvas)).arrayBuffer(),
    );
    const contactSheetCanvas = renderContactSheetCanvas({
        label: params.label,
        timestamp: params.timestamp,
        frames: renderedFrames,
    });
    await zip.file(
        'summary/contact_sheet.png',
        await (await canvasToBlob(contactSheetCanvas)).arrayBuffer(),
    );
    const onionSkinCanvas = renderOnionSkinCanvas({
        frames: diagnosticFrames,
        selectedIndex: params.selectedFrameIndex,
        ghostCount: params.onionSkinCount,
    });
    if (onionSkinCanvas) {
        await zip.file(
            'summary/onion_skin_selected.png',
            await (await canvasToBlob(onionSkinCanvas)).arrayBuffer(),
        );
    }
    const strobeTrailCanvas = renderStrobeTrailCanvas({
        baseCanvas: params.previousFrame.canvas,
        frames: diagnosticFrames,
        selectedIndex: Math.max(
            0,
            Math.min(diagnosticFrames.length - 1, params.selectedFrameIndex),
        ),
        stride: params.strobeStride,
        arrowWidth: params.arrowWidth,
    });
    if (strobeTrailCanvas) {
        await zip.file(
            'summary/strobe_trail.png',
            await (await canvasToBlob(strobeTrailCanvas)).arrayBuffer(),
        );
    }

    zip.file(
        'README.md',
        [
            '# Perimeter Field Conquest Package',
            '',
            `Label: ${params.label}`,
            `Timestamp: ${params.timestamp}`,
            `Frames exported: ${frameEntries.length}`,
            '',
            'Contents:',
            '- `frames/frame_000_prev.png`: final frame before the conquest transition begins',
            '- `frames/frame_###_tXXXX.png`: every captured transition frame with previous/current/next vstar markers',
            '- `frames/frame_final_next.png`: final NEXT frame when available',
            '- `summary/conquest_arc_summary.png`: prior-frame base with every vstar arc and intermediate sampled positions',
            '- `summary/contact_sheet.png`: a glanceable board of the full conquest frame sequence',
            '- `summary/onion_skin_selected.png`: selected scrub frame with past/future ghost positions when onion skin is enabled',
            '- `summary/strobe_trail.png`: sampled-frame trail summary when strobe stride is enabled',
            '- `manifest.json`: conquest metadata, frame list, and compact snapshots',
        ].join('\n'),
    );

    zip.file(
        'manifest.json',
        JSON.stringify(
            {
                exportKind: 'perimeter_field_conquest_package',
                label: params.label,
                timestamp: params.timestamp,
                arrowWidth: params.arrowWidth,
                selectedFrameIndex: params.selectedFrameIndex,
                onionSkinCount: params.onionSkinCount,
                strobeStride: params.strobeStride,
                conquestEvents: params.conquestEvents,
                starPositions: Object.fromEntries(
                    [...params.starPositions.entries()].map(([starId, point]) => [
                        starId,
                        { x: round(point.x), y: round(point.y) },
                    ]),
                ),
                frames: frameEntries,
            },
            null,
            2,
        ),
    );

    const blob = await zip.generateAsync({ type: 'blob' });
    triggerDownload(blob, `${prefix}_perimeter-field-conquest-package.zip`);
}

export async function downloadPerimeterFieldConquestContactSheet(
    params: PerimeterFieldConquestPackageParams,
): Promise<void> {
    const prefix = filePrefixFromIsoTimestamp(params.timestamp);
    const renderedFrames = buildRenderedConquestFrames(params);
    const contactSheetCanvas = renderContactSheetCanvas({
        label: params.label,
        timestamp: params.timestamp,
        frames: renderedFrames,
    });
    triggerDownload(
        await canvasToBlob(contactSheetCanvas),
        `${prefix}_perimeter-field-contact-sheet.png`,
    );
}
