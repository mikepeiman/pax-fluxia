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
let cachedBlurFilter: PIXI.BlurFilter | null = null;
let cachedBlurStrength = -1;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build ownership fingerprint — only regenerate when this changes. */
function buildFingerprint(stars: StarState[]): string {
    let fp = '';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}|`;
    }
    fp += `${GAME_CONFIG.VORONOI_ALPHA}:${GAME_CONFIG.VORONOI_BORDER_WIDTH}`;
    fp += `:${GAME_CONFIG.VORONOI_BORDER_ALPHA}:${GAME_CONFIG.VORONOI_BORDER_BRIGHTEN}`;
    fp += `:${GAME_CONFIG.VORONOI_SATURATION}:${GAME_CONFIG.VORONOI_LIGHTNESS}`;
    fp += `:${GAME_CONFIG.VORONOI_GLOW_RADIUS}:${GAME_CONFIG.VORONOI_GLOW_ALPHA}:${GAME_CONFIG.VORONOI_GLOW_LAYERS}`;
    fp += `:${GAME_CONFIG.VORONOI_BLUR}:${GAME_CONFIG.VORONOI_SMOOTHING}`;
    fp += `:${GAME_CONFIG.VORONOI_GRADIENT_BLEND}:${GAME_CONFIG.VORONOI_BLEND_WIDTH}`;
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

/** Blend two RGB colors by factor t (0=colorA, 1=colorB). */
function blendRGB(
    a: [number, number, number],
    b: [number, number, number],
    t: number,
): [number, number, number] {
    return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
    ];
}

// ── Chaikin Smoothing ──────────────────────────────────────────────────────

/**
 * Apply Chaikin's corner-cutting algorithm to smooth a polygon.
 * Each iteration replaces every edge with two new points at 25%/75%,
 * producing increasingly rounded contours.
 * @param polygon Array of [x, y] vertices (closed: first === last)
 * @param iterations Number of smoothing passes (0 = no change)
 */
function chaikinSmooth(polygon: number[][], iterations: number): number[][] {
    if (iterations <= 0 || polygon.length < 3) return polygon;

    // Work with open polygon (remove closing point if present)
    let pts = polygon.slice();
    const isClosed = pts.length > 1 &&
        pts[0][0] === pts[pts.length - 1][0] &&
        pts[0][1] === pts[pts.length - 1][1];
    if (isClosed) pts = pts.slice(0, -1);

    for (let iter = 0; iter < iterations; iter++) {
        const n = pts.length;
        const next: number[][] = [];
        for (let i = 0; i < n; i++) {
            const p0 = pts[i];
            const p1 = pts[(i + 1) % n];
            next.push([
                0.75 * p0[0] + 0.25 * p1[0],
                0.75 * p0[1] + 0.25 * p1[1],
            ]);
            next.push([
                0.25 * p0[0] + 0.75 * p1[0],
                0.25 * p0[1] + 0.75 * p1[1],
            ]);
        }
        pts = next;
    }

    // Re-close
    if (isClosed && pts.length > 0) {
        pts.push([pts[0][0], pts[0][1]]);
    }
    return pts;
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
    if (!GAME_CONFIG.SHOW_VORONOI || !GAME_CONFIG.TERRITORY_VORONOI) {
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
    const borderBrighten = GAME_CONFIG.VORONOI_BORDER_BRIGHTEN ?? 80;
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

    const smoothingIter = GAME_CONFIG.VORONOI_SMOOTHING ?? 2;

    for (let i = 0; i < ownedStars.length; i++) {
        const cell = voronoi.cellPolygon(i);
        if (!cell || cell.length < 3) continue;

        // Apply Chaikin smoothing
        const smoothed = chaikinSmooth(cell, smoothingIter);

        const color = starColors[i];
        cellGraphics.poly(smoothed.flat());
        cellGraphics.fill({ color: color.hex, alpha });
    }

    // ── Draw territory borders / gradient blending ──
    const gradientBlend = GAME_CONFIG.VORONOI_GRADIENT_BLEND ?? true;
    const blendWidth = GAME_CONFIG.VORONOI_BLEND_WIDTH ?? 30;

    if ((borderWidth > 0 && borderAlpha > 0) || gradientBlend) {
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

            for (let j = 0; j < cell.length - 1; j++) {
                const [x1, y1] = cell[j];
                const [x2, y2] = cell[j + 1];

                // Find neighbor via midpoint probe
                const dx = x2 - x1;
                const dy = y2 - y1;
                const nx = dy;
                const ny = -dx;
                const len = Math.sqrt(nx * nx + ny * ny) || 1;
                const nnx = nx / len;
                const nny = ny / len;
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                const probeX = mx + nnx * 0.5;
                const probeY = my + nny * 0.5;

                const neighborIdx = delaunay.find(probeX, probeY);
                if (neighborIdx !== i && neighborIdx < ownedStars.length) {
                    const ownerN = ownedStars[neighborIdx].ownerId;
                    if (ownerN !== ownerI) {
                        // ── Hard border line (always draws when borderWidth > 0) ──
                        if (borderWidth > 0 && borderAlpha > 0) {
                            const borderColor = rgbToHex(
                                Math.min(255, starColors[i].rgb[0] + borderBrighten),
                                Math.min(255, starColors[i].rgb[1] + borderBrighten),
                                Math.min(255, starColors[i].rgb[2] + borderBrighten),
                            );
                            borderGraphics.moveTo(x1, y1);
                            borderGraphics.lineTo(x2, y2);
                            borderGraphics.stroke({ width: borderWidth, color: borderColor, alpha: borderAlpha });
                        }

                        // ── Gradient blend strips (independent of border) ──
                        if (gradientBlend) {
                            const strips = 6;
                            const halfWidth = blendWidth / 2;
                            for (let s = 0; s < strips; s++) {
                                const t = (s + 0.5) / strips;
                                const offset = -halfWidth + t * blendWidth;
                                const blendT = t;
                                const blended = blendRGB(starColors[i].rgb, starColors[neighborIdx].rgb, blendT);
                                const blendColor = rgbToHex(blended[0], blended[1], blended[2]);
                                const stripAlpha = borderAlpha * (1 - Math.abs(t - 0.5) * 2) * 0.6;

                                borderGraphics.moveTo(
                                    x1 + nnx * offset,
                                    y1 + nny * offset,
                                );
                                borderGraphics.lineTo(
                                    x2 + nnx * offset,
                                    y2 + nny * offset,
                                );
                                borderGraphics.stroke({
                                    width: blendWidth / strips + 1,
                                    color: blendColor,
                                    alpha: stripAlpha,
                                });
                            }
                        }
                    }
                }
            }
        }
    } else if (borderGraphics) {
        borderGraphics.clear();
    }

    // ── Apply GPU blur for smooth territory edges (cached) ──
    const blurStrength = GAME_CONFIG.VORONOI_BLUR ?? 8;
    if (blurStrength > 0) {
        if (!cachedBlurFilter || cachedBlurStrength !== blurStrength) {
            cachedBlurFilter = new PIXI.BlurFilter({ strength: blurStrength, quality: 4 });
            cachedBlurStrength = blurStrength;
        }
        voronoiContainer.filters = [cachedBlurFilter];
    } else {
        cachedBlurFilter = null;
        cachedBlurStrength = -1;
        voronoiContainer.filters = [];
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
    cachedBlurFilter = null;
    cachedBlurStrength = -1;
}
