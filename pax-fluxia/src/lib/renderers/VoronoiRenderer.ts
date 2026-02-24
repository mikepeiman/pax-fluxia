// ============================================================================
// VoronoiRenderer — Contiguous territory fill via d3-delaunay polygons
// ============================================================================
//
// Renders per-star Voronoi cells as filled PixiJS polygons, colored by owner.
// Uses d3-delaunay for O(n log n) Voronoi computation (~1ms for 20 stars).
//
// Performance: Voronoi diagram is only recomputed when ownership fingerprint
// changes (typically once per tick when a conquest occurs).
// ============================================================================

import * as PIXI from 'pixi.js';
import { Delaunay } from 'd3-delaunay';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState } from '$lib/types/game.types';
import type { ColorUtils } from './RenderContext';

// ── Cache ──────────────────────────────────────────────────────────────────

let cachedFingerprint = '';
let cellGraphics: PIXI.Graphics | null = null;
let borderGraphics: PIXI.Graphics | null = null;
let glowGraphics: PIXI.Graphics | null = null;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build ownership fingerprint — only regenerate when this changes. */
function buildFingerprint(stars: StarState[]): string {
    let fp = '';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}|`;
    }
    fp += `${GAME_CONFIG.VORONOI_ALPHA}:${GAME_CONFIG.VORONOI_BORDER_WIDTH}`;
    fp += `:${GAME_CONFIG.VORONOI_BORDER_ALPHA}`;
    fp += `:${GAME_CONFIG.VORONOI_SATURATION}:${GAME_CONFIG.VORONOI_LIGHTNESS}`;
    return fp;
}

/** Convert a numeric hex color (0xRRGGBB) to r,g,b components. */
function hexToRGB(hex: number): [number, number, number] {
    return [
        (hex >> 16) & 0xff,
        (hex >> 8) & 0xff,
        hex & 0xff,
    ];
}

/** Convert RGB (0-255) to HSL (h:0-360, s:0-1, l:0-1). */
function rgbToHSL(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [h * 360, s, l];
}

/** Convert HSL (h:0-360, s:0-1, l:0-1) back to RGB (0-255). */
function hslToRGB(h: number, s: number, l: number): [number, number, number] {
    h /= 360;
    if (s === 0) {
        const v = Math.round(l * 255);
        return [v, v, v];
    }
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
        Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
        Math.round(hue2rgb(p, q, h) * 255),
        Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    ];
}

/** Adjust RGB color via HSL saturation + lightness multipliers. */
function adjustColorHSL(
    r: number, g: number, b: number,
    satMult: number, lightMult: number,
): [number, number, number] {
    const [h, s, l] = rgbToHSL(r, g, b);
    const newS = Math.min(1, Math.max(0, s * satMult));
    const newL = Math.min(1, Math.max(0, l * lightMult));
    return hslToRGB(h, newS, newL);
}

/** Pack r,g,b (0-255) into 0xRRGGBB. */
function rgbToHex(r: number, g: number, b: number): number {
    return (r << 16) | (g << 8) | b;
}

// ── Main Renderer ──────────────────────────────────────────────────────────

/**
 * Render Voronoi territory overlay using d3-delaunay polygon cells.
 * Only regenerates when star ownership changes.
 */
export function renderVoronoi(
    stars: StarState[],
    voronoiContainer: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
): void {
    if (!GAME_CONFIG.SHOW_VORONOI) {
        voronoiContainer.visible = false;
        return;
    }

    voronoiContainer.visible = true;

    const fingerprint = buildFingerprint(stars);

    // Skip regeneration if nothing changed
    if (fingerprint === cachedFingerprint && cellGraphics) {
        return;
    }

    cachedFingerprint = fingerprint;

    // Only consider owned stars for territory
    const ownedStars = stars.filter(s => s.ownerId);
    if (ownedStars.length === 0) {
        voronoiContainer.visible = false;
        return;
    }

    const alpha = GAME_CONFIG.VORONOI_ALPHA ?? 0.15;
    const borderWidth = GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 2;
    const borderAlpha = GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.4;
    const satMult = GAME_CONFIG.VORONOI_SATURATION ?? 1.0;
    const lightMult = GAME_CONFIG.VORONOI_LIGHTNESS ?? 0.7;

    // Extend bounds so territory bleeds past map edges
    const pad = Math.max(worldWidth, worldHeight) * 0.5;
    const bounds: [number, number, number, number] = [
        -pad, -pad,
        worldWidth + pad, worldHeight + pad,
    ];

    // ── Compute Voronoi diagram via d3-delaunay ──
    const points = ownedStars.map(s => [s.x, s.y] as [number, number]);
    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi(bounds);

    // Pre-compute adjusted colors per star
    const starColors: { hex: number; rgb: [number, number, number] }[] = ownedStars.map(s => {
        const rawRgb = hexToRGB(colorUtils.getPlayerColor(s.ownerId!));
        const rgb = adjustColorHSL(rawRgb[0], rawRgb[1], rawRgb[2], satMult, lightMult);
        return { hex: rgbToHex(rgb[0], rgb[1], rgb[2]), rgb };
    });

    // ── Draw filled cells ──
    if (!cellGraphics) {
        cellGraphics = new PIXI.Graphics();
        voronoiContainer.addChild(cellGraphics);
    }
    cellGraphics.clear();

    for (let i = 0; i < ownedStars.length; i++) {
        const cell = voronoi.cellPolygon(i);
        if (!cell || cell.length < 3) continue;

        const color = starColors[i];
        cellGraphics.poly(cell.flat());
        cellGraphics.fill({ color: color.hex, alpha });
    }

    // ── Draw territory borders ──
    if (borderWidth > 0 && borderAlpha > 0) {
        if (!borderGraphics) {
            borderGraphics = new PIXI.Graphics();
            voronoiContainer.addChild(borderGraphics);
        }
        borderGraphics.clear();

        // Find edges between cells of different owners
        for (let i = 0; i < ownedStars.length; i++) {
            const cell = voronoi.cellPolygon(i);
            if (!cell || cell.length < 3) continue;

            const ownerI = ownedStars[i].ownerId;

            // Check each edge of this cell against neighbors
            for (let j = 0; j < cell.length - 1; j++) {
                const [x1, y1] = cell[j];
                const [x2, y2] = cell[j + 1];

                // Find which neighbor shares this edge (midpoint test)
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;

                // Nudge midpoint slightly toward the neighboring cell to find its owner
                const dx = x2 - x1;
                const dy = y2 - y1;
                // Normal to edge, pointing outward from cell center
                const nx = dy;
                const ny = -dx;
                const len = Math.sqrt(nx * nx + ny * ny) || 1;
                const probeX = mx + (nx / len) * 0.5;
                const probeY = my + (ny / len) * 0.5;

                const neighborIdx = delaunay.find(probeX, probeY);
                if (neighborIdx !== i && neighborIdx < ownedStars.length) {
                    const ownerN = ownedStars[neighborIdx].ownerId;
                    if (ownerN !== ownerI) {
                        // This is a border between different owners
                        const borderColor = rgbToHex(
                            Math.min(255, starColors[i].rgb[0] + 80),
                            Math.min(255, starColors[i].rgb[1] + 80),
                            Math.min(255, starColors[i].rgb[2] + 80),
                        );
                        borderGraphics.moveTo(x1, y1);
                        borderGraphics.lineTo(x2, y2);
                        borderGraphics.stroke({ width: borderWidth, color: borderColor, alpha: borderAlpha });
                    }
                }
            }
        }
    } else if (borderGraphics) {
        borderGraphics.clear();
    }

    // ── Territory glow bleed (faint radial per-player centroid) ──
    if (!glowGraphics) {
        glowGraphics = new PIXI.Graphics();
        voronoiContainer.addChild(glowGraphics);
    }
    glowGraphics.clear();

    // Group stars by owner for centroid glow
    const ownerGroups = new Map<string, { xs: number[]; ys: number[]; rgb: [number, number, number] }>();
    for (let i = 0; i < ownedStars.length; i++) {
        const oid = ownedStars[i].ownerId!;
        let g = ownerGroups.get(oid);
        if (!g) {
            g = { xs: [], ys: [], rgb: starColors[i].rgb };
            ownerGroups.set(oid, g);
        }
        g.xs.push(ownedStars[i].x);
        g.ys.push(ownedStars[i].y);
    }

    for (const [, group] of ownerGroups) {
        const cx = group.xs.reduce((a, b) => a + b, 0) / group.xs.length;
        const cy = group.ys.reduce((a, b) => a + b, 0) / group.ys.length;
        const glowRadius = Math.max(worldWidth, worldHeight) * 0.3;
        const [r, g, b] = group.rgb;
        const color = rgbToHex(r, g, b);

        // Draw concentric circles with decreasing alpha (approximates radial gradient)
        const layers = 4;
        for (let l = layers; l >= 1; l--) {
            const frac = l / layers;
            const layerAlpha = 0.03 * (1 - frac + 0.2);
            glowGraphics.circle(cx, cy, glowRadius * frac);
            glowGraphics.fill({ color, alpha: layerAlpha });
        }
    }
}

// ── Cache Reset ────────────────────────────────────────────────────────────

/** Reset cached data (call on game session change). */
export function resetVoronoiCache(): void {
    cachedFingerprint = '';
    if (cellGraphics) {
        if (cellGraphics.parent) cellGraphics.parent.removeChild(cellGraphics);
        cellGraphics.destroy();
        cellGraphics = null;
    }
    if (borderGraphics) {
        if (borderGraphics.parent) borderGraphics.parent.removeChild(borderGraphics);
        borderGraphics.destroy();
        borderGraphics = null;
    }
    if (glowGraphics) {
        if (glowGraphics.parent) glowGraphics.parent.removeChild(glowGraphics);
        glowGraphics.destroy();
        glowGraphics = null;
    }
}
