/**
 * mapThumbnail.ts — shared offscreen canvas star-graph thumbnail generator.
 *
 * Used by:
 *  - Save Map / Save Game dialogs (in-game)
 *  - Main Menu random map preview + reshuffle (F-168)
 *
 * No PIXI dependency — pure Canvas 2D API.
 */
import { STAR_TYPE_STATS, type StarType } from '@pax/common';
import { defaultPlayerPaletteHex, fallbackPlayerColor } from '$lib/utils/playerPalette';
import { getPortalGroupCssColor, getPortalGroupLabel } from '$lib/utils/portalStyling';

export interface ThumbnailStar {
    id: string;
    x: number;
    y: number;
    ownerId: string;
    starType?: string;
    portalGroup?: string;
}

export interface ThumbnailConnection {
    sourceId: string;
    targetId: string;
    /** Mapgen centerline; when length > 2, draw as a polyline. */
    laneWaypoints?: [number, number][];
}

export interface ThumbnailOptions {
    /** Output width in px (default 240) */
    width?: number;
    /** Output height in px (default 135) */
    height?: number;
    /** Background color (default '#0a0a1a') */
    bg?: string;
    /** Lane color (default brighter slate-blue) */
    laneColor?: string;
    /** Lane width (default 1.65) */
    laneWidth?: number;
    /** Star radius in thumbnail px (default 5) */
    starRadius?: number;
    /** Player color resolver. If not provided, uses a default palette. */
    getPlayerColor?: (ownerId: string) => string;
    /** Padding fraction 0-1 (default 0.08) */
    padding?: number;
}

const DEFAULT_PALETTE = defaultPlayerPaletteHex();

function getOwnerColor(ownerId: string, getPlayerColor?: (id: string) => string): string {
    if (ownerId === 'neutral' || !ownerId) return '#556';
    if (getPlayerColor) return getPlayerColor(ownerId);
    return fallbackPlayerColor(ownerId) || DEFAULT_PALETTE[0];
}

function drawPortalThumbnailStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    ownerColor: string,
    portalGroup?: string,
): void {
    const portalColor = getPortalGroupCssColor(portalGroup);
    const label = getPortalGroupLabel(portalGroup);

    ctx.beginPath();
    ctx.arc(x, y, radius + 2.4, 0, Math.PI * 2);
    ctx.strokeStyle = `${ownerColor}66`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius + 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#050816';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = portalColor;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.68, 0, Math.PI * 2);
    ctx.fillStyle = '#0b1120';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.23, 0, Math.PI * 2);
    ctx.fillStyle = `${portalColor}66`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.13, 0, Math.PI * 2);
    ctx.fillStyle = '#010308';
    ctx.fill();

    ctx.strokeStyle = portalColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.56, Math.PI * 0.15, Math.PI * 1.35);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.38, Math.PI * 1.15, Math.PI * 2.15);
    ctx.stroke();

    ctx.fillStyle = portalColor;
    ctx.font = `bold ${Math.max(6, radius * 1.05)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 0.5);
}

/**
 * Render a star-graph to an offscreen canvas and return a PNG data URL.
 * Scales to fit the given width/height with uniform padding.
 */
export function generateMapThumbnail(
    stars: ThumbnailStar[],
    connections: ThumbnailConnection[],
    options: ThumbnailOptions = {}
): string {
    const {
        width = 240,
        height = 135,
        bg = '#0a0a1a',
        laneColor = 'rgba(191, 219, 254, 0.42)',
        laneWidth = 1.65,
        starRadius = 5,
        getPlayerColor,
        padding = 0.08,
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    if (!stars.length) return canvas.toDataURL('image/png');

    // Compute bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of stars) {
        if (s.x < minX) minX = s.x;
        if (s.y < minY) minY = s.y;
        if (s.x > maxX) maxX = s.x;
        if (s.y > maxY) maxY = s.y;
    }

    const padX = width * padding;
    const padY = height * padding;
    const drawW = width - padX * 2;
    const drawH = height - padY * 2;
    const worldW = maxX - minX || 1;
    const worldH = maxY - minY || 1;
    const scale = Math.min(drawW / worldW, drawH / worldH);
    // Center
    const offX = padX + (drawW - worldW * scale) / 2;
    const offY = padY + (drawH - worldH * scale) / 2;

    function toScreen(wx: number, wy: number): [number, number] {
        return [offX + (wx - minX) * scale, offY + (wy - minY) * scale];
    }

    // Build starById index
    const starById = new Map(stars.map(s => [s.id, s]));

    // Draw deduped connections (lanes)
    const drawn = new Set<string>();
    function traceConnections(): void {
        for (const conn of connections) {
            const key = [conn.sourceId, conn.targetId].sort().join('|');
            if (drawn.has(key)) continue;
            drawn.add(key);
            const src = starById.get(conn.sourceId);
            const tgt = starById.get(conn.targetId);
            if (!src || !tgt) continue;
            const wp = conn.laneWaypoints;
            if (wp && wp.length > 2) {
                const [fx, fy] = toScreen(wp[0][0], wp[0][1]);
                ctx.moveTo(fx, fy);
                for (let i = 1; i < wp.length; i++) {
                    const [px, py] = toScreen(wp[i][0], wp[i][1]);
                    ctx.lineTo(px, py);
                }
                continue;
            }
            const [sx, sy] = toScreen(src.x, src.y);
            const [tx, ty] = toScreen(tgt.x, tgt.y);
            ctx.moveTo(sx, sy);
            ctx.lineTo(tx, ty);
        }
    }

    ctx.beginPath();
    traceConnections();
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.18)';
    ctx.lineWidth = laneWidth * 2.35;
    ctx.stroke();

    drawn.clear();
    ctx.beginPath();
    traceConnections();
    ctx.strokeStyle = laneColor;
    ctx.lineWidth = laneWidth;
    ctx.stroke();

    // Draw stars
    for (const s of stars) {
        const [sx, sy] = toScreen(s.x, s.y);
        const ownerColor = getOwnerColor(s.ownerId, getPlayerColor);
        
        // Resolve starType color (fallback to grey)
        let typeHex = '#8899aa';
        if (s.starType && STAR_TYPE_STATS[s.starType as StarType]) {
            typeHex = '#' + STAR_TYPE_STATS[s.starType as StarType].color.toString(16).padStart(6, '0');
        }

        if (s.starType === 'portal') {
            drawPortalThumbnailStar(ctx, sx, sy, starRadius, ownerColor, s.portalGroup);
            continue;
        }

        // Star Core (Type Color)
        ctx.beginPath();
        ctx.arc(sx, sy, starRadius, 0, Math.PI * 2);
        ctx.fillStyle = typeHex;
        ctx.fill();

        // Inner Ring (Owner Color)
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = ownerColor;
        ctx.stroke();

        // Subtle Outer Glow (Owner Color)
        ctx.beginPath();
        ctx.arc(sx, sy, starRadius + 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = ownerColor + '66';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    return canvas.toDataURL('image/png');
}
