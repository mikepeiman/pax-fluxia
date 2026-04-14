import JSZip from 'jszip';
import type { TransitionDebugBundle } from './TransitionSnapshotRecorder';
import { compositeOverlayOnScreenshot } from './TransitionDebugOverlay';
import {
    compactGeometrySnapshotForExport,
    compactFrontierTopologyForExport,
    filePrefixFromIsoTimestamp,
} from './snapshotExport';

export const DIAGNOSTIC_INTERMEDIATE_PROGRESS_VALUES = [
    1 / 6,
    2 / 6,
    3 / 6,
    4 / 6,
    5 / 6,
] as const;

type TransitionFrameEntry = NonNullable<TransitionDebugBundle['transitionFrames']>[number];

export interface DiagnosticPackageFrame {
    progress: number;
    filename: string;
    sourceIndex: number;
}

interface DiagnosticPackageManifest {
    exportKind: 'transition_diagnostic_package';
    bundleId: string;
    timestamp: string;
    transitionId: string;
    conquestEvents: TransitionDebugBundle['conquestEvents'];
    selectedFrames: DiagnosticPackageFrame[];
    notes: string[];
    modes: TransitionDebugBundle['meta']['modes'];
    previousOwnershipVersion: string;
    nextOwnershipVersion: string;
    previousGeometry: unknown;
    nextGeometry: unknown;
    previousTopology: unknown;
    nextTopology: unknown;
    starPositions: Record<string, { x: number; y: number }>;
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

function canvasToImageBitmap(canvas: HTMLCanvasElement): Promise<ImageBitmap> {
    return createImageBitmap(canvas);
}

function buildCompositeSheet(
    panels: { label: string; canvas: HTMLCanvasElement }[],
): HTMLCanvasElement {
    if (panels.length === 0) {
        const empty = document.createElement('canvas');
        empty.width = 200;
        empty.height = 100;
        return empty;
    }

    const cols = 3;
    const rows = Math.ceil(panels.length / cols);
    const panelWidth = panels[0].canvas.width;
    const panelHeight = panels[0].canvas.height;
    const labelHeight = 24;

    const composite = document.createElement('canvas');
    composite.width = panelWidth * cols;
    composite.height = (panelHeight + labelHeight) * rows;
    const ctx = composite.getContext('2d');
    if (!ctx) return composite;

    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, composite.width, composite.height);

    for (let i = 0; i < panels.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * panelWidth;
        const y = row * (panelHeight + labelHeight);

        ctx.fillStyle = '#222222';
        ctx.fillRect(x, y, panelWidth, labelHeight);
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#cccccc';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(panels[i].label, x + 8, y + labelHeight / 2);

        ctx.drawImage(panels[i].canvas, x, y + labelHeight);
    }

    return composite;
}

function serializeTopologyPairCompact(bundle: TransitionDebugBundle) {
    const ctx = bundle.context;
    return {
        conquestEvents: ctx.conquestEvents,
        exportNote: 'Compact: section points are downsampled; use pointsSampled and bounds.',
        prevTopology: compactFrontierTopologyForExport(
            ctx.previousGeometry?.frontierTopology ?? null,
        ),
        nextTopology: compactFrontierTopologyForExport(
            ctx.nextGeometry?.frontierTopology ?? null,
        ),
    };
}

function serializeStarPositions(
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
): Record<string, { x: number; y: number }> {
    return Object.fromEntries(
        [...starPositions.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([starId, point]) => [starId, point]),
    );
}

export function selectDiagnosticIntermediateFrames(
    frames: readonly TransitionFrameEntry[] | null | undefined,
    targets = DIAGNOSTIC_INTERMEDIATE_PROGRESS_VALUES,
): DiagnosticPackageFrame[] {
    if (!frames || frames.length === 0) return [];

    const interiorFrames = frames
        .map((frame, index) => ({ frame, index }))
        .filter(({ frame }) => frame.progress > 0 && frame.progress < 1);

    const usedIndexes = new Set<number>();
    const selected: DiagnosticPackageFrame[] = [];

    for (const target of targets) {
        let best: { frame: TransitionFrameEntry; index: number } | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (const candidate of interiorFrames) {
            if (usedIndexes.has(candidate.index)) continue;
            const distance = Math.abs(candidate.frame.progress - target);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = candidate;
            }
        }

        if (!best) continue;
        usedIndexes.add(best.index);
        const pctString = Math.round(best.frame.progress * 100)
            .toString()
            .padStart(3, '0');
        selected.push({
            progress: best.frame.progress,
            filename: `frame_${String(selected.length + 1).padStart(2, '0')}_t${pctString}.png`,
            sourceIndex: best.index,
        });
    }

    return selected.sort((a, b) => a.progress - b.progress);
}

function buildDiagnosticManifest(
    bundle: TransitionDebugBundle,
    selectedFrames: readonly DiagnosticPackageFrame[],
): DiagnosticPackageManifest {
    const ctx = bundle.context;
    return {
        exportKind: 'transition_diagnostic_package',
        bundleId: bundle.id,
        timestamp: bundle.timestamp,
        transitionId: bundle.meta.transitionId,
        conquestEvents: bundle.conquestEvents,
        selectedFrames: [...selectedFrames],
        notes: [
            'Package contains PREV, NEXT, and up to 5 evenly spaced intermediate transition frames.',
            'Geometry and topology are compact exports intended for deterministic diagnosis and human inspection.',
            'If fewer than 5 interior transition frames were captured, selectedFrames contains the available subset.',
        ],
        modes: bundle.meta.modes,
        previousOwnershipVersion: bundle.meta.prevOwnershipVersion,
        nextOwnershipVersion: bundle.meta.nextOwnershipVersion,
        previousGeometry: compactGeometrySnapshotForExport(ctx.previousGeometry ?? null),
        nextGeometry: compactGeometrySnapshotForExport(ctx.nextGeometry),
        previousTopology: compactFrontierTopologyForExport(
            ctx.previousGeometry?.frontierTopology ?? null,
        ),
        nextTopology: compactFrontierTopologyForExport(
            ctx.nextGeometry?.frontierTopology ?? null,
        ),
        starPositions: serializeStarPositions(bundle.starPositions),
    };
}

function buildDiagnosticReadme(
    bundle: TransitionDebugBundle,
    selectedFrames: readonly DiagnosticPackageFrame[],
): string {
    const evt = bundle.conquestEvents[0];
    const conquestLine = evt
        ? `Conquest: ${evt.starId} ${evt.previousOwner} -> ${evt.newOwner}`
        : 'Conquest: unavailable';
    const frameLines = selectedFrames.length
        ? selectedFrames.map((frame) => `- ${frame.filename} (progress=${frame.progress.toFixed(3)})`)
        : ['- No intermediate transition frames were captured for this bundle.'];

    return [
        '# Transition Diagnostic Package',
        '',
        `Bundle ID: ${bundle.id}`,
        `Timestamp: ${bundle.timestamp}`,
        conquestLine,
        '',
        'Files:',
        '- prev.png',
        ...frameLines,
        '- next.png',
        '- diagnostic.json',
        '',
        'diagnostic.json contains compact previous/next geometry, compact previous/next topology, conquest metadata, modes, and star positions.',
    ].join('\n');
}

async function addCanvasToZip(zip: JSZip, path: string, canvas: HTMLCanvasElement): Promise<void> {
    const blob = await canvasToBlob(canvas);
    zip.file(path, await blob.arrayBuffer());
}

export async function downloadBundle(
    bundle: TransitionDebugBundle,
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
): Promise<void> {
    const prefix = filePrefixFromIsoTimestamp(bundle.timestamp);
    const panels: { label: string; canvas: HTMLCanvasElement }[] = [];

    if (bundle.prevCanvas) {
        panels.push({ label: 'Previous geometry', canvas: bundle.prevCanvas });
        triggerDownload(await canvasToBlob(bundle.prevCanvas), `${prefix}_prev-geometry.png`);
    }

    if (bundle.nextCanvas) {
        panels.push({ label: 'Next geometry', canvas: bundle.nextCanvas });
        triggerDownload(await canvasToBlob(bundle.nextCanvas), `${prefix}_next-geometry.png`);
    }

    if (bundle.nextCanvas) {
        const nextBitmap = await canvasToImageBitmap(bundle.nextCanvas);
        const overlayCanvas = compositeOverlayOnScreenshot(
            nextBitmap,
            bundle.frontierDiff,
            bundle.conquestEvents,
            starPositions,
        );
        nextBitmap.close();
        panels.push({ label: 'Polyline diff overlay', canvas: overlayCanvas });
        triggerDownload(await canvasToBlob(overlayCanvas), `${prefix}_frontier-diff-overlay.png`);
    }

    if (panels.length > 0) {
        const composite = buildCompositeSheet(panels);
        triggerDownload(await canvasToBlob(composite), `${prefix}_composite.png`);
    }

    if (bundle.transitionFrames && bundle.transitionFrames.length > 0) {
        for (let i = 0; i < bundle.transitionFrames.length; i++) {
            const { progress, canvas } = bundle.transitionFrames[i];
            const pctString = Math.round(progress * 100).toString().padStart(3, '0');
            triggerDownload(
                await canvasToBlob(canvas),
                `${prefix}_frame_${String(i).padStart(2, '0')}_t${pctString}.png`,
            );
            await new Promise((resolve) => setTimeout(resolve, 80));
        }
    }

    triggerDownload(
        new Blob([JSON.stringify(bundle.meta, null, 2)], { type: 'application/json' }),
        `${prefix}_meta.json`,
    );

    triggerDownload(
        new Blob([JSON.stringify(serializeTopologyPairCompact(bundle), null, 2)], {
            type: 'application/json',
        }),
        `${prefix}_topology.json`,
    );

    const compactGeometry = {
        exportKind: 'compact' as const,
        polylineDiffSemantics: bundle.meta.polylineDiffSemantics,
        conquestEvents: bundle.context.conquestEvents,
        previousGeometry: compactGeometrySnapshotForExport(bundle.context.previousGeometry ?? null),
        nextGeometry: compactGeometrySnapshotForExport(bundle.context.nextGeometry),
    };
    const geometryString = JSON.stringify(
        compactGeometry,
        (_key, value) => (value instanceof Map ? Object.fromEntries(value) : value),
        2,
    );
    triggerDownload(
        new Blob([geometryString], { type: 'application/json' }),
        `${prefix}_geometry_snapshot.json`,
    );

    console.log(
        `[SnapshotRecorder] downloaded bundle: ${prefix} (${panels.length} panels + json; compact geo ~${geometryString.length} chars)`,
    );
}

export async function downloadDiagnosticPackage(
    bundle: TransitionDebugBundle,
): Promise<void> {
    const prefix = filePrefixFromIsoTimestamp(bundle.timestamp);
    const zip = new JSZip();
    const selectedFrames = selectDiagnosticIntermediateFrames(bundle.transitionFrames);
    const manifest = buildDiagnosticManifest(bundle, selectedFrames);

    zip.file('README.md', buildDiagnosticReadme(bundle, selectedFrames));
    zip.file('diagnostic.json', JSON.stringify(manifest, null, 2));

    if (bundle.prevCanvas) {
        await addCanvasToZip(zip, 'prev.png', bundle.prevCanvas);
    }

    for (const frame of selectedFrames) {
        const source = bundle.transitionFrames?.[frame.sourceIndex];
        if (!source) continue;
        await addCanvasToZip(zip, frame.filename, source.canvas);
    }

    if (bundle.nextCanvas) {
        await addCanvasToZip(zip, 'next.png', bundle.nextCanvas);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    triggerDownload(blob, `${prefix}_transition-diagnostic-package.zip`);
    console.log(
        `[SnapshotRecorder] downloaded diagnostic package: ${prefix} (${selectedFrames.length} intermediates)`,
    );
}

export async function downloadAllBundles(
    bundles: readonly TransitionDebugBundle[],
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
): Promise<void> {
    for (const bundle of bundles) {
        await downloadBundle(bundle, starPositions);
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    console.log(`[SnapshotRecorder] downloaded all ${bundles.length} bundles`);
}

export async function downloadAllDiagnosticPackages(
    bundles: readonly TransitionDebugBundle[],
): Promise<void> {
    for (const bundle of bundles) {
        await downloadDiagnosticPackage(bundle);
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    console.log(`[SnapshotRecorder] downloaded all ${bundles.length} diagnostic packages`);
}
