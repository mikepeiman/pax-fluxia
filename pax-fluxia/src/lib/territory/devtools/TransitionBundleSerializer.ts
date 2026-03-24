// ── Territory Transition Bundle Serializer ──────────────────────────────────
// Converts TransitionDebugBundle → downloadable files.
// Uses canvas.toBlob() for PNG encoding and <a download> for file saving.

import type { TransitionDebugBundle, FrontierDiffResult } from './TransitionSnapshotRecorder';
import type { TerritoryConquestEvent } from '../contracts/OwnershipContracts';
import { compositeOverlayOnScreenshot } from './TransitionDebugOverlay';

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

function bitmapToCanvas(bitmap: ImageBitmap): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    return canvas;
}

function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Cleanup after a short delay to ensure download starts
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
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

    // Layout: 3 columns x 2 rows
    const cols = 3;
    const rows = Math.ceil(panels.length / cols);
    const panelW = panels[0].canvas.width;
    const panelH = panels[0].canvas.height;
    const labelHeight = 24;

    const composite = document.createElement('canvas');
    composite.width = panelW * cols;
    composite.height = (panelH + labelHeight) * rows;
    const ctx = composite.getContext('2d')!;

    // Dark background
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, composite.width, composite.height);

    for (let i = 0; i < panels.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * panelW;
        const y = row * (panelH + labelHeight);

        // Label bar
        ctx.fillStyle = '#222222';
        ctx.fillRect(x, y, panelW, labelHeight);
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#CCCCCC';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(panels[i].label, x + 8, y + labelHeight / 2);

        // Panel image
        ctx.drawImage(panels[i].canvas, x, y + labelHeight);
    }

    return composite;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Download a single bundle as individual PNG files + meta.json.
 * Files are downloaded separately (no zip library needed).
 */
export async function downloadBundle(
    bundle: TransitionDebugBundle,
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
): Promise<void> {
    const prefix = bundle.id;
    const panels: { label: string; canvas: HTMLCanvasElement }[] = [];

    // 00-prev.png
    if (bundle.prevCanvasBitmap) {
        const prevCanvas = bitmapToCanvas(bundle.prevCanvasBitmap);
        panels.push({ label: '00 Previous State', canvas: prevCanvas });
        const blob = await canvasToBlob(prevCanvas);
        triggerDownload(blob, `${prefix}_00-prev.png`);
    }

    // 01-next.png
    if (bundle.nextCanvasBitmap) {
        const nextCanvas = bitmapToCanvas(bundle.nextCanvasBitmap);
        panels.push({ label: '01 Next State', canvas: nextCanvas });
        const blob = await canvasToBlob(nextCanvas);
        triggerDownload(blob, `${prefix}_01-next.png`);
    }

    // 02-prev-changed-frontiers.png
    if (bundle.prevCanvasBitmap) {
        const overlayCanvas = compositeOverlayOnScreenshot(
            bundle.prevCanvasBitmap,
            bundle.frontierDiff,
            bundle.conquestEvents,
            starPositions,
        );
        panels.push({ label: '02 Prev + Changed Frontiers', canvas: overlayCanvas });
        const blob = await canvasToBlob(overlayCanvas);
        triggerDownload(blob, `${prefix}_02-prev-changed-frontiers.png`);
    }

    // 03-next-changed-frontiers.png
    if (bundle.nextCanvasBitmap) {
        const overlayCanvas = compositeOverlayOnScreenshot(
            bundle.nextCanvasBitmap,
            bundle.frontierDiff,
            bundle.conquestEvents,
            starPositions,
        );
        panels.push({ label: '03 Next + Changed Frontiers', canvas: overlayCanvas });
        const blob = await canvasToBlob(overlayCanvas);
        triggerDownload(blob, `${prefix}_03-next-changed-frontiers.png`);
    }

    // 06-composite.png
    if (panels.length > 0) {
        const composite = buildCompositeSheet(panels);
        const blob = await canvasToBlob(composite);
        triggerDownload(blob, `${prefix}_06-composite.png`);
    }

    // meta.json
    const metaBlob = new Blob(
        [JSON.stringify(bundle.meta, null, 2)],
        { type: 'application/json' },
    );
    triggerDownload(metaBlob, `${prefix}_meta.json`);

    console.log(`[SnapshotRecorder] downloaded bundle: ${prefix} (${panels.length} panels + meta.json)`);
}

/**
 * Download all bundles sequentially.
 */
export async function downloadAllBundles(
    bundles: readonly TransitionDebugBundle[],
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
): Promise<void> {
    for (const bundle of bundles) {
        await downloadBundle(bundle, starPositions);
        // Small delay between downloads to avoid browser throttling
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.log(`[SnapshotRecorder] downloaded all ${bundles.length} bundles`);
}
