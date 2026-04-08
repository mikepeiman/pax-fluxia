// ── Territory Transition Debug Overlay Renderer ─────────────────────────────
// Renders diagnostic overlays onto a 2D canvas showing frontier diffs,
// conquest markers, and transition plan data.
//
// Pure functions — no PIXI dependency. Draws onto CanvasRenderingContext2D
// so overlays can be composited with canvas screenshots.

import type { FrontierPolylineShape } from '../contracts/GeometryContracts';
import type { TerritoryConquestEvent } from '../contracts/OwnershipContracts';
import type { FrontierDiffResult } from './TransitionSnapshotRecorder';

// ── Overlay Colors ──────────────────────────────────────────────────────────

const COLORS = {
    driftedFrontier: '#FF2222',       // thick red — same key, points moved
    staticFrontier: '#22CC22',        // thick green
    appearedKeyOrSeg: '#FF8800',      // orange — new key or extra segment (not "birth")
    removedKeyOrSeg: '#AA44FF',       // purple dashed — key gone or fewer segments
    conquestStar: '#FFFF00',         // yellow
    anchorPoint: '#00FFFF',          // cyan
    labelText: '#FFFFFF',            // white
    labelShadow: '#000000',          // black shadow for readability
} as const;

const LINE_WIDTHS = {
    drifted: 6,
    staticPoly: 3,
    appeared: 5,
    removed: 5,
    anchor: 8,
} as const;

// ── Polyline Drawing ────────────────────────────────────────────────────────

function drawPolyline(
    ctx: CanvasRenderingContext2D,
    points: readonly [number, number][],
    color: string,
    lineWidth: number,
    dashed = false,
): void {
    if (points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dashed) {
        ctx.setLineDash([8, 6]);
    } else {
        ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawCircle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    fillColor: string,
    strokeColor?: string,
): void {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string = COLORS.labelText,
): void {
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    // Shadow for readability
    ctx.fillStyle = COLORS.labelShadow;
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

// ── Public Overlay Functions ────────────────────────────────────────────────

/**
 * Render polyline diff overlay (structural multiset diff by ownerPairKey + segment index).
 * See `polylineDiffSemantics` on bundle meta — not transition "birth/death".
 */
export function renderChangedFrontierOverlay(
    ctx: CanvasRenderingContext2D,
    diff: FrontierDiffResult,
    conquestEvents: readonly TerritoryConquestEvent[],
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
): void {
    for (const poly of diff.staticPolylines) {
        drawPolyline(ctx, poly.points, COLORS.staticFrontier, LINE_WIDTHS.staticPoly);
    }

    for (const poly of diff.removedKeyOrSegment) {
        drawPolyline(ctx, poly.points, COLORS.removedKeyOrSeg, LINE_WIDTHS.removed, true);
    }

    for (const poly of diff.appearedKeyOrSegment) {
        drawPolyline(ctx, poly.points, COLORS.appearedKeyOrSeg, LINE_WIDTHS.appeared);
    }

    for (const poly of diff.drifted) {
        drawPolyline(ctx, poly.points, COLORS.driftedFrontier, LINE_WIDTHS.drifted);
    }

    // Draw conquest star markers
    for (const evt of conquestEvents) {
        const pos = starPositions.get(evt.starId);
        if (pos) {
            // Outer ring
            drawCircle(ctx, pos.x, pos.y, 14, 'transparent', COLORS.conquestStar);
            // Inner dot
            drawCircle(ctx, pos.x, pos.y, 6, COLORS.conquestStar);
            // Label
            drawLabel(ctx, `★ ${evt.starId}`, pos.x + 18, pos.y - 6, COLORS.conquestStar);
            drawLabel(ctx, `${evt.previousOwner} → ${evt.newOwner}`, pos.x + 18, pos.y + 8, COLORS.conquestStar);
        }
    }
}

/**
 * Render a legend box in the corner of the canvas.
 */
export function renderOverlayLegend(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
): void {
    const entries = [
        { color: COLORS.driftedFrontier, label: 'Drifted (same segment, moved)' },
        { color: COLORS.staticFrontier, label: 'Static polyline' },
        { color: COLORS.appearedKeyOrSeg, label: 'Appeared key/extra segment' },
        { color: COLORS.removedKeyOrSeg, label: 'Removed key/missing segment' },
        { color: COLORS.conquestStar, label: 'Conquest star' },
    ];

    const lineHeight = 18;
    const padding = 8;
    const boxWidth = 180;
    const boxHeight = entries.length * lineHeight + padding * 2;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(x, y, boxWidth, boxHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, boxWidth, boxHeight);

    // Entries
    for (let i = 0; i < entries.length; i++) {
        const ey = y + padding + i * lineHeight;
        // Color swatch
        ctx.fillStyle = entries[i].color;
        ctx.fillRect(x + padding, ey + 2, 14, 10);
        // Label
        ctx.font = '11px monospace';
        ctx.fillStyle = COLORS.labelText;
        ctx.fillText(entries[i].label, x + padding + 20, ey + 11);
    }
}

/**
 * Compose a screenshot bitmap with a frontier diff overlay.
 * Returns a new canvas with the composite.
 */
export function compositeOverlayOnScreenshot(
    bitmap: ImageBitmap,
    diff: FrontierDiffResult,
    conquestEvents: readonly TerritoryConquestEvent[],
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
    showLegend = true,
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d')!;

    // Draw screenshot base
    ctx.drawImage(bitmap, 0, 0);

    // Draw overlays
    renderChangedFrontierOverlay(ctx, diff, conquestEvents, starPositions);

    // Diff summary header (top-left)
    const summary = `Δ drifted=${diff.drifted.length} appeared=${diff.appearedKeyOrSegment.length} removed=${diff.removedKeyOrSegment.length} static=${diff.staticPolylines.length}`;
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(8, 8, ctx.measureText(summary).width + 12, 22);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(summary, 14, 13);

    // Legend
    if (showLegend) {
        renderOverlayLegend(ctx, 10, canvas.height - 110);
    }

    return canvas;
}
