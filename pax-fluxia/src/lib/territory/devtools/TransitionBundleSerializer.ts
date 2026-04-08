// ── Territory Transition Bundle Serializer ──────────────────────────────────
// Converts TransitionDebugBundle → downloadable files.
// Uses canvas.toBlob() for PNG encoding and <a download> for file saving.
//
// Bundles contain HTMLCanvasElement (rendered from geometry data),
// not ImageBitmap (captured from PIXI canvas).
//
// JSON exports use compact serializers (downsampled polylines) to keep files usable.

import type { TransitionDebugBundle } from './TransitionSnapshotRecorder';
import { compositeOverlayOnScreenshot } from './TransitionDebugOverlay';
import {
    compactGeometrySnapshotForExport,
    compactFrontierTopologyForExport,
    filePrefixFromIsoTimestamp,
} from './snapshotExport';

// ── Canvas-to-Blob Helpers ──────────────────────────────────────────────────

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
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

function canvasToImageBitmap(canvas: HTMLCanvasElement): Promise<ImageBitmap> {
    return createImageBitmap(canvas);
}

// ── Composite Sheet Builder ─────────────────────────────────────────────────

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
    const panelW = panels[0].canvas.width;
    const panelH = panels[0].canvas.height;
    const labelHeight = 24;

    const composite = document.createElement('canvas');
    composite.width = panelW * cols;
    composite.height = (panelH + labelHeight) * rows;
    const ctx = composite.getContext('2d')!;

    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, composite.width, composite.height);

    for (let i = 0; i < panels.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * panelW;
        const y = row * (panelH + labelHeight);

        ctx.fillStyle = '#222222';
        ctx.fillRect(x, y, panelW, labelHeight);
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#CCCCCC';
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
        exportNote: 'Compact: section points downsampled; use pointsSampled + bounds.',
        prevTopology: compactFrontierTopologyForExport(
            ctx.previousGeometry?.frontierTopology ?? null,
        ),
        nextTopology: compactFrontierTopologyForExport(
            ctx.nextGeometry?.frontierTopology ?? null,
        ),
    };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Download a single bundle as individual PNG files + meta.json.
 * Filenames: `YYYY-MM-DD-hhmmss_...` first, then role; transition frames use `_frame_NN_`.
 */
export async function downloadBundle(
    bundle: TransitionDebugBundle,
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
): Promise<void> {
    const prefix = filePrefixFromIsoTimestamp(bundle.timestamp);
    const panels: { label: string; canvas: HTMLCanvasElement }[] = [];

    if (bundle.prevCanvas) {
        panels.push({ label: 'Previous geometry', canvas: bundle.prevCanvas });
        const blob = await canvasToBlob(bundle.prevCanvas);
        triggerDownload(blob, `${prefix}_prev-geometry.png`);
    }

    if (bundle.nextCanvas) {
        panels.push({ label: 'Next geometry', canvas: bundle.nextCanvas });
        const blob = await canvasToBlob(bundle.nextCanvas);
        triggerDownload(blob, `${prefix}_next-geometry.png`);
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
        const blob = await canvasToBlob(overlayCanvas);
        triggerDownload(blob, `${prefix}_frontier-diff-overlay.png`);
    }

    if (panels.length > 0) {
        const composite = buildCompositeSheet(panels);
        const blob = await canvasToBlob(composite);
        triggerDownload(blob, `${prefix}_composite.png`);
    }

    if (bundle.transitionFrames && bundle.transitionFrames.length > 0) {
        for (let i = 0; i < bundle.transitionFrames.length; i++) {
            const { progress, canvas: frameCanvas } = bundle.transitionFrames[i];
            const pctStr = Math.round(progress * 100).toString().padStart(3, '0');
            const blob = await canvasToBlob(frameCanvas);
            triggerDownload(blob, `${prefix}_frame_${String(i).padStart(2, '0')}_t${pctStr}.png`);
            await new Promise(resolve => setTimeout(resolve, 80));
        }
    }

    const metaBlob = new Blob(
        [JSON.stringify(bundle.meta, null, 2)],
        { type: 'application/json' },
    );
    triggerDownload(metaBlob, `${prefix}_meta.json`);

    const topologyObj = serializeTopologyPairCompact(bundle);
    const topologyStr = JSON.stringify(topologyObj, null, 2);
    const topologyBlob = new Blob([topologyStr], { type: 'application/json' });
    triggerDownload(topologyBlob, `${prefix}_topology.json`);

    const compactGeo = {
        exportKind: 'compact' as const,
        polylineDiffSemantics: bundle.meta.polylineDiffSemantics,
        conquestEvents: bundle.context.conquestEvents,
        previousGeometry: compactGeometrySnapshotForExport(bundle.context.previousGeometry ?? null),
        nextGeometry: compactGeometrySnapshotForExport(bundle.context.nextGeometry),
    };
    const geometryStr = JSON.stringify(compactGeo, (k, v) => {
        if (v instanceof Map) return Object.fromEntries(v);
        return v;
    }, 2);

    triggerDownload(
        new Blob([geometryStr], { type: 'application/json' }),
        `${prefix}_geometry_snapshot.json`,
    );

    console.log(
        `[SnapshotRecorder] downloaded bundle: ${prefix} (${panels.length} panels + json; compact geo ~${geometryStr.length} chars)`,
    );
}

export async function downloadAllBundles(
    bundles: readonly TransitionDebugBundle[],
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
): Promise<void> {
    for (const bundle of bundles) {
        await downloadBundle(bundle, starPositions);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.log(`[SnapshotRecorder] downloaded all ${bundles.length} bundles`);
}
