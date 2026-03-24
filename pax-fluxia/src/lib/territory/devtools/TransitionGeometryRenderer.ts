// ── Clean Geometry Renderer for Debug Snapshots ─────────────────────────────
// Renders a GeometrySnapshot directly to a Canvas2D, producing a clean
// "ownership → geometry" image with ZERO transition interpolation.
// Used by the snapshot recorder to generate definitive before/after frames.
//
// This is a pure Canvas2D renderer — no PIXI dependency.

import type { GeometrySnapshot, TerritoryRegionShape, FrontierPolylineShape } from '../contracts/GeometryContracts';
import type { TerritoryConquestEvent } from '../contracts/OwnershipContracts';

// ── Types ───────────────────────────────────────────────────────────────────

export type OwnerColorResolver = (ownerId: string) => number;

export interface GeometryRenderOptions {
    width: number;
    height: number;
    resolveColor: OwnerColorResolver;
    fillAlpha?: number;         // default 0.35
    borderWidth?: number;       // default 2.5
    borderAlpha?: number;       // default 0.7
    worldBorderWidth?: number;  // default 2
    worldBorderAlpha?: number;  // default 0.5
    backgroundColor?: string;   // default '#111111'
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function hexToCSS(hex: number, alpha = 1): string {
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darken(hex: number, factor = 0.5): number {
    const r = Math.floor(((hex >> 16) & 0xff) * factor);
    const g = Math.floor(((hex >> 8) & 0xff) * factor);
    const b = Math.floor((hex & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
}

// ── Fill Renderer ───────────────────────────────────────────────────────────

function drawRegionFill(
    ctx: CanvasRenderingContext2D,
    region: TerritoryRegionShape,
    color: number,
    alpha: number,
): void {
    if (region.points.length < 3) return;

    ctx.beginPath();
    ctx.moveTo(region.points[0][0], region.points[0][1]);
    for (let i = 1; i < region.points.length; i++) {
        ctx.lineTo(region.points[i][0], region.points[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = hexToCSS(color, alpha);
    ctx.fill();
}

// ── Border Renderer ─────────────────────────────────────────────────────────

function drawFrontierBorder(
    ctx: CanvasRenderingContext2D,
    polyline: FrontierPolylineShape,
    color: number,
    width: number,
    alpha: number,
): void {
    if (polyline.points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(polyline.points[0][0], polyline.points[0][1]);
    for (let i = 1; i < polyline.points.length; i++) {
        ctx.lineTo(polyline.points[i][0], polyline.points[i][1]);
    }
    ctx.strokeStyle = hexToCSS(color, alpha);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

// ── Star Marker ─────────────────────────────────────────────────────────────

function drawStarMarker(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: number,
    radius = 4,
): void {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = hexToCSS(color, 0.8);
    ctx.fill();
    ctx.strokeStyle = hexToCSS(darken(color, 0.4), 1);
    ctx.lineWidth = 1;
    ctx.stroke();
}

// ── Main Render Function ────────────────────────────────────────────────────

/**
 * Render a GeometrySnapshot to a fresh canvas using Canvas2D.
 * Produces a clean, definitive state image — zero transition artifacts.
 *
 * Draw order: background → fills → borders → world borders → star markers
 */
export function renderGeometryToCanvas(
    geometry: GeometrySnapshot,
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
    ownerIds: ReadonlyMap<string, string>,  // starId → ownerId
    options: GeometryRenderOptions,
): HTMLCanvasElement {
    const {
        width,
        height,
        resolveColor,
        fillAlpha = 0.35,
        borderWidth = 2.5,
        borderAlpha = 0.7,
        worldBorderWidth = 2,
        worldBorderAlpha = 0.5,
        backgroundColor = '#111111',
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // 2. Territory fills
    for (const region of geometry.territoryRegions) {
        const color = resolveColor(region.ownerId);
        drawRegionFill(ctx, region, color, fillAlpha);
    }

    // 3. Shared frontier borders (darker version of the avg color)
    for (const poly of geometry.frontierPolylines) {
        // Use a neutral dark color for shared borders
        drawFrontierBorder(ctx, poly, 0x888888, borderWidth, borderAlpha);
    }

    // 4. World border polylines
    for (const poly of geometry.worldBorderPolylines) {
        // Derive color from the owner by parsing ownerPairKey
        const ownerKey = poly.ownerPairKey.split('|')[0] ?? '';
        const color = resolveColor(ownerKey);
        drawFrontierBorder(ctx, poly, darken(color, 0.6), worldBorderWidth, worldBorderAlpha);
    }

    // 5. Star position markers
    for (const [starId, pos] of starPositions) {
        const ownerId = ownerIds.get(starId);
        const color = ownerId ? resolveColor(ownerId) : 0xAAAAAA;
        drawStarMarker(ctx, pos.x, pos.y, color);
    }

    // Label: geometry version + region count
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const info = `${geometry.territoryRegions.length} regions · ${geometry.frontierPolylines.length} frontiers · ${geometry.sourceMode}`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(8, height - 28, ctx.measureText(info).width + 12, 20);
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(info, 14, height - 24);

    return canvas;
}

/**
 * Render a GeometrySnapshot with conquest event highlighting.
 * Draws the clean geometry + marked conquest stars (large yellow markers).
 */
export function renderGeometryWithConquestMarkers(
    geometry: GeometrySnapshot,
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
    ownerIds: ReadonlyMap<string, string>,
    conquestEvents: readonly TerritoryConquestEvent[],
    options: GeometryRenderOptions,
): HTMLCanvasElement {
    const canvas = renderGeometryToCanvas(geometry, starPositions, ownerIds, options);
    const ctx = canvas.getContext('2d')!;

    // Highlight conquest stars
    for (const evt of conquestEvents) {
        const pos = starPositions.get(evt.starId);
        if (!pos) continue;

        // Outer glow ring
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner conquest dot
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
        ctx.fill();

        // Label
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        const label = `★ ${evt.previousOwner}→${evt.newOwner}`;
        const lw = ctx.measureText(label).width;
        ctx.fillRect(pos.x + 22, pos.y - 8, lw + 6, 16);
        ctx.fillStyle = '#FFFF00';
        ctx.fillText(label, pos.x + 25, pos.y + 4);
    }

    return canvas;
}
