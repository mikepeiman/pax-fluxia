// ── Territory Transition Bundle Serializer ──────────────────────────────────
// Converts TransitionDebugBundle → downloadable files.
// Uses canvas.toBlob() for PNG encoding and <a download> for file saving.
//
// Bundles now contain HTMLCanvasElement (rendered from geometry data),
// not ImageBitmap (captured from PIXI canvas).

import type { TransitionDebugBundle } from './TransitionSnapshotRecorder';
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

// ── Canvas-to-ImageBitmap bridge (for overlay compositor) ───────────────────

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

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Download a single bundle as individual PNG files + meta.json.
 * Bundles contain clean geometry renders (HTMLCanvasElement), not PIXI captures.
 */
export async function downloadBundle(
    bundle: TransitionDebugBundle,
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
): Promise<void> {
    const prefix = bundle.id;
    const panels: { label: string; canvas: HTMLCanvasElement }[] = [];

    // 00-prev-geometry.png — clean previous ownership → geometry render
    if (bundle.prevCanvas) {
        panels.push({ label: '00 Previous Geometry', canvas: bundle.prevCanvas });
        const blob = await canvasToBlob(bundle.prevCanvas);
        triggerDownload(blob, `${prefix}_00-prev-geometry.png`);
    }

    // 01-next-geometry.png — clean next ownership → geometry render
    if (bundle.nextCanvas) {
        panels.push({ label: '01 Next Geometry', canvas: bundle.nextCanvas });
        const blob = await canvasToBlob(bundle.nextCanvas);
        triggerDownload(blob, `${prefix}_01-next-geometry.png`);
    }

    // 02-frontier-diff-overlay.png — next geometry + frontier diff overlay
    if (bundle.nextCanvas) {
        const nextBitmap = await canvasToImageBitmap(bundle.nextCanvas);
        const overlayCanvas = compositeOverlayOnScreenshot(
            nextBitmap,
            bundle.frontierDiff,
            bundle.conquestEvents,
            starPositions,
        );
        nextBitmap.close();
        panels.push({ label: '02 Frontier Diff Overlay', canvas: overlayCanvas });
        const blob = await canvasToBlob(overlayCanvas);
        triggerDownload(blob, `${prefix}_02-frontier-diff-overlay.png`);
    }

    // 03-composite.png — all panels in one image
    if (panels.length > 0) {
        const composite = buildCompositeSheet(panels);
        const blob = await canvasToBlob(composite);
        triggerDownload(blob, `${prefix}_03-composite.png`);
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
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.log(`[SnapshotRecorder] downloaded all ${bundles.length} bundles`);
}
