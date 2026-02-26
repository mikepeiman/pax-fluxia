// ============================================================================
// PixelTerritoryRenderer — Contiguous territory fill by nearest star ownership
// ============================================================================
//
// The original territory rendering approach: renders to a low-res offscreen
// canvas where every pixel is colored by the nearest owned star's player color.
// Creates smooth, contiguous territory regions where connected friendly stars
// naturally appear visually merged.
//
// Performance optimizations over the original:
// - Spatial grid acceleration for nearest-star lookup (O(1) amortized vs O(n))
// - Fingerprint-based caching — only regenerates on ownership change
// - Low-res offscreen canvas with linear upscale
// - Optional edge blending for soft territory boundaries
// ============================================================================

import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState } from '$lib/types/game.types';
import type { ColorUtils } from './RenderContext';

/** Cached state to avoid unnecessary regeneration */
let cachedFingerprint = '';
let cachedSprite: PIXI.Sprite | null = null;
let cachedTexture: PIXI.Texture | null = null;
let cachedBlurFilter: PIXI.BlurFilter | null = null;
let cachedBlurStrength = -1;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build ownership fingerprint — only regenerate when this changes. */
function buildFingerprint(stars: StarState[]): string {
    let fp = '';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}|`;
    }
    // Include config values that affect rendering
    fp += `:${GAME_CONFIG.VORONOI_ALPHA}:${GAME_CONFIG.VORONOI_RESOLUTION}`;
    fp += `:${GAME_CONFIG.VORONOI_EDGE_BLEND}:${GAME_CONFIG.VORONOI_SATURATION}`;
    fp += `:${GAME_CONFIG.VORONOI_LIGHTNESS}:${GAME_CONFIG.TERRITORY_PIXEL}`;
    fp += `:${GAME_CONFIG.VORONOI_BORDER_WIDTH}:${GAME_CONFIG.VORONOI_BORDER_ALPHA}`;
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
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
    return [h, s, l];
}

/** Convert HSL to RGB. */
function hslToRGB(h: number, s: number, l: number): [number, number, number] {
    if (s === 0) {
        const v = Math.round(l * 255);
        return [v, v, v];
    }
    function hue2rgb(p: number, q: number, t: number): number {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hn = h / 360;
    return [
        Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
        Math.round(hue2rgb(p, q, hn) * 255),
        Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
    ];
}

/** Adjust color via HSL saturation + lightness multipliers. */
function adjustColorHSL(
    r: number, g: number, b: number,
    satMult: number, lightMult: number,
): [number, number, number] {
    const [h, s, l] = rgbToHSL(r, g, b);
    return hslToRGB(h, Math.min(1, s * satMult), Math.min(1, l * lightMult));
}

// ── Spatial Grid for fast nearest-star lookup ──────────────────────────────

interface StarEntry {
    x: number;
    y: number;
    rgb: [number, number, number];
    ownerId: string;
    idx: number;
}

/**
 * Build a spatial grid for O(1) amortized nearest-star lookups.
 * Each cell stores indices into the starData array.
 */
function buildSpatialGrid(
    starData: StarEntry[],
    canvasW: number,
    canvasH: number,
    cellSize: number,
): { grid: number[][]; cols: number; rows: number; cellSize: number } {
    const cols = Math.ceil(canvasW / cellSize);
    const rows = Math.ceil(canvasH / cellSize);
    const grid: number[][] = new Array(cols * rows);
    for (let i = 0; i < grid.length; i++) grid[i] = [];

    for (const s of starData) {
        // Add star to its cell and neighboring cells for search radius coverage
        const cx = Math.floor(s.x / cellSize);
        const cy = Math.floor(s.y / cellSize);
        const searchRadius = 3; // cells to add star into
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                    grid[ny * cols + nx].push(s.idx);
                }
            }
        }
    }

    return { grid, cols, rows, cellSize };
}

// ── Main Renderer ──────────────────────────────────────────────────────────

/**
 * Render pixel territory overlay.
 * Only regenerates the offscreen canvas when ownership changes.
 */
export function renderPixelTerritory(
    stars: StarState[],
    container: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
): void {
    if (!GAME_CONFIG.TERRITORY_PIXEL) {
        if (cachedSprite) cachedSprite.visible = false;
        return;
    }

    const fingerprint = buildFingerprint(stars);

    // Skip regeneration if nothing changed
    if (fingerprint === cachedFingerprint && cachedSprite) {
        cachedSprite.visible = true;
        // Still update blur in case it changed
        applyBlur();
        return;
    }

    cachedFingerprint = fingerprint;

    // Only consider owned stars
    const ownedStars = stars.filter(s => s.ownerId);
    if (ownedStars.length === 0) {
        if (cachedSprite) cachedSprite.visible = false;
        return;
    }

    // Resolution: lower = faster, higher = sharper
    const resolution = GAME_CONFIG.VORONOI_RESOLUTION ?? 4;
    const canvasW = Math.ceil(worldWidth / resolution);
    const canvasH = Math.ceil(worldHeight / resolution);
    const alpha = GAME_CONFIG.VORONOI_ALPHA ?? 0.15;
    const edgeBlend = GAME_CONFIG.VORONOI_EDGE_BLEND ?? 0;
    const satMult = GAME_CONFIG.VORONOI_SATURATION ?? 1.0;
    const lightMult = GAME_CONFIG.VORONOI_LIGHTNESS ?? 1.0;
    const borderWidth = GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 0;
    const borderAlpha = GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.3;
    const borderBrighten = GAME_CONFIG.VORONOI_BORDER_BRIGHTEN ?? 1.5;

    // Pre-compute star data at canvas scale
    const starData: StarEntry[] = ownedStars.map((s, i) => {
        const rawRgb = hexToRGB(colorUtils.getPlayerColor(s.ownerId!));
        const rgb = (satMult !== 1.0 || lightMult !== 1.0)
            ? adjustColorHSL(rawRgb[0], rawRgb[1], rawRgb[2], satMult, lightMult)
            : rawRgb;
        return {
            x: s.x / resolution,
            y: s.y / resolution,
            rgb,
            ownerId: s.ownerId!,
            idx: i,
        };
    });

    // Build spatial grid for acceleration
    const cellSize = Math.max(20, Math.ceil(Math.max(canvasW, canvasH) / 8));
    const spatial = buildSpatialGrid(starData, canvasW, canvasH, cellSize);

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(canvasW, canvasH);
    const pixels = imageData.data;

    // Scaled border width for low-res canvas
    const borderW = borderWidth / resolution;

    // For each pixel, find nearest owned star and color it
    for (let py = 0; py < canvasH; py++) {
        for (let px = 0; px < canvasW; px++) {
            // Use spatial grid to find candidates
            const gcx = Math.floor(px / spatial.cellSize);
            const gcy = Math.floor(py / spatial.cellSize);
            const cellIdx = gcy * spatial.cols + gcx;
            const candidates = (cellIdx >= 0 && cellIdx < spatial.grid.length)
                ? spatial.grid[cellIdx]
                : null;

            let minDist = Infinity;
            let nearestIdx = 0;

            if (candidates && candidates.length > 0) {
                // Fast path: use spatial grid
                for (let i = 0; i < candidates.length; i++) {
                    const s = starData[candidates[i]];
                    const dx = px - s.x;
                    const dy = py - s.y;
                    const dist = dx * dx + dy * dy;
                    if (dist < minDist) {
                        minDist = dist;
                        nearestIdx = candidates[i];
                    }
                }
            } else {
                // Fallback: brute force
                for (let i = 0; i < starData.length; i++) {
                    const dx = px - starData[i].x;
                    const dy = py - starData[i].y;
                    const dist = dx * dx + dy * dy;
                    if (dist < minDist) {
                        minDist = dist;
                        nearestIdx = i;
                    }
                }
            }

            const nearest = starData[nearestIdx];
            let [r, g, b] = nearest.rgb;
            let pixelAlpha = alpha;

            // Edge blend: reduce alpha near territory boundaries
            if (edgeBlend > 0) {
                let secondMinDist = Infinity;
                for (let i = 0; i < starData.length; i++) {
                    if (starData[i].ownerId === nearest.ownerId) continue;
                    const dx = px - starData[i].x;
                    const dy = py - starData[i].y;
                    const dist = dx * dx + dy * dy;
                    if (dist < secondMinDist) secondMinDist = dist;
                }
                if (secondMinDist < Infinity) {
                    const d1 = Math.sqrt(minDist);
                    const d2 = Math.sqrt(secondMinDist);
                    const edgeDist = (d2 - d1) / (d1 + d2 + 0.001);
                    const blendFactor = Math.min(1, edgeDist / (edgeBlend * 0.1));
                    pixelAlpha *= blendFactor;
                }
            }

            // Border detection: brightened border at territory edges
            if (borderW > 0) {
                let secondMinDist = Infinity;
                for (let i = 0; i < starData.length; i++) {
                    if (starData[i].ownerId === nearest.ownerId) continue;
                    const dx = px - starData[i].x;
                    const dy = py - starData[i].y;
                    const dist = dx * dx + dy * dy;
                    if (dist < secondMinDist) secondMinDist = dist;
                }
                if (secondMinDist < Infinity) {
                    const d1 = Math.sqrt(minDist);
                    const d2 = Math.sqrt(secondMinDist);
                    const diff = Math.abs(d2 - d1);
                    if (diff < borderW) {
                        // On border: brighten and increase alpha
                        const t = 1 - diff / borderW;
                        r = Math.min(255, Math.round(r * (1 + (borderBrighten - 1) * t)));
                        g = Math.min(255, Math.round(g * (1 + (borderBrighten - 1) * t)));
                        b = Math.min(255, Math.round(b * (1 + (borderBrighten - 1) * t)));
                        pixelAlpha = Math.max(pixelAlpha, borderAlpha * t);
                    }
                }
            }

            const idx = (py * canvasW + px) * 4;
            pixels[idx] = r;
            pixels[idx + 1] = g;
            pixels[idx + 2] = b;
            pixels[idx + 3] = Math.round(pixelAlpha * 255);
        }
    }

    ctx.putImageData(imageData, 0, 0);

    // Create PIXI texture from canvas
    if (cachedTexture) cachedTexture.destroy(true);
    cachedTexture = PIXI.Texture.from(canvas);
    cachedTexture.source.scaleMode = 'linear';

    // Create or update sprite
    if (!cachedSprite) {
        cachedSprite = new PIXI.Sprite(cachedTexture);
        container.addChild(cachedSprite);
    } else {
        cachedSprite.texture = cachedTexture;
        if (!cachedSprite.parent) container.addChild(cachedSprite);
    }

    cachedSprite.width = worldWidth;
    cachedSprite.height = worldHeight;
    cachedSprite.visible = true;

    applyBlur();
}

// ── Blur ───────────────────────────────────────────────────────────────────

function applyBlur(): void {
    if (!cachedSprite) return;
    const blur = GAME_CONFIG.VORONOI_BLUR ?? 4;
    if (blur > 0) {
        if (cachedBlurStrength !== blur) {
            cachedBlurFilter = new PIXI.BlurFilter({ strength: blur, quality: 3 });
            cachedBlurStrength = blur;
        }
        cachedSprite.filters = cachedBlurFilter ? [cachedBlurFilter] : [];
    } else {
        cachedSprite.filters = [];
        cachedBlurFilter = null;
        cachedBlurStrength = -1;
    }
}

// ── Cache Reset ────────────────────────────────────────────────────────────

/** Reset cached data (call on game session change). */
export function resetPixelTerritoryCache(): void {
    cachedFingerprint = '';
    if (cachedSprite) {
        if (cachedSprite.parent) cachedSprite.parent.removeChild(cachedSprite);
        cachedSprite.destroy();
        cachedSprite = null;
    }
    if (cachedTexture) {
        cachedTexture.destroy(true);
        cachedTexture = null;
    }
    cachedBlurFilter = null;
    cachedBlurStrength = -1;
}
