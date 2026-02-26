// ============================================================================
// PixelTerritoryRenderer — Contiguous territory fill by nearest star ownership
// ============================================================================
//
// Renders to a low-res offscreen canvas where every pixel is colored by the
// nearest owned star's player color. Creates smooth, contiguous territory
// regions where connected friendly stars naturally appear visually merged.
//
// CORRIDOR GUARANTEE: Same-owner stars get a distance discount
// (PIXEL_CORRIDOR_BOOST). This inflates friendly territory to ensure
// neighboring stars of the same player always have a visual corridor
// connecting them, even when enemy stars sit between them.
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
    fp += `:${GAME_CONFIG.PIXEL_ALPHA}:${GAME_CONFIG.PIXEL_RESOLUTION}`;
    fp += `:${GAME_CONFIG.PIXEL_EDGE_BLEND}:${GAME_CONFIG.PIXEL_BLUR}`;
    fp += `:${GAME_CONFIG.PIXEL_CORRIDOR_BOOST}:${GAME_CONFIG.TERRITORY_PIXEL}`;
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

// ── Star data ─────────────────────────────────────────────────────────────

interface StarEntry {
    x: number;
    y: number;
    rgb: [number, number, number];
    ownerId: string;
}

// ── Main Renderer ──────────────────────────────────────────────────────────

/**
 * Render pixel territory overlay.
 *
 * CORRIDOR GUARANTEE: When PIXEL_CORRIDOR_BOOST > 0, same-owner stars get
 * their effective distance reduced. This makes friendly territory "inflate"
 * and merge, ensuring neighboring same-player stars always have a connected
 * visual corridor between them — even when an enemy star sits in between.
 *
 * The slider goes from 0 (pure Voronoi, no boost) to 1 (maximum corridor,
 * friendly stars heavily favored). Default 0.3 gives natural-looking corridors
 * without distorting territory too much.
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
        applyBlur();
        return;
    }

    cachedFingerprint = fingerprint;

    // Only consider owned stars for territory
    const ownedStars = stars.filter(s => s.ownerId);
    if (ownedStars.length === 0) {
        if (cachedSprite) cachedSprite.visible = false;
        return;
    }

    // Config
    const resolution = GAME_CONFIG.PIXEL_RESOLUTION ?? 4;
    const canvasW = Math.ceil(worldWidth / resolution);
    const canvasH = Math.ceil(worldHeight / resolution);
    const alpha = GAME_CONFIG.PIXEL_ALPHA ?? 0.15;
    const edgeBlend = GAME_CONFIG.PIXEL_EDGE_BLEND ?? 0;
    const corridorBoost = GAME_CONFIG.PIXEL_CORRIDOR_BOOST ?? 0;
    const satMult = GAME_CONFIG.VORONOI_SATURATION ?? 1.0;
    const lightMult = GAME_CONFIG.VORONOI_LIGHTNESS ?? 1.0;
    const useHSL = satMult !== 1.0 || lightMult !== 1.0;

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;

    // Pre-compute star data at canvas scale, with HSL adjustment applied
    const starData: StarEntry[] = ownedStars.map(s => {
        const rawRgb = hexToRGB(colorUtils.getPlayerColor(s.ownerId!));
        const rgb = useHSL
            ? adjustColorHSL(rawRgb[0], rawRgb[1], rawRgb[2], satMult, lightMult)
            : rawRgb;
        return {
            x: s.x / resolution,
            y: s.y / resolution,
            rgb,
            ownerId: s.ownerId!,
        };
    });

    // Create ImageData for direct pixel manipulation
    const imageData = ctx.createImageData(canvasW, canvasH);
    const pixels = imageData.data;
    const numStars = starData.length;

    // Corridor boost: same-owner distance multiplier = 1 - boost
    // boost=0 → multiplier=1.0 (no effect, pure Voronoi)
    // boost=0.3 → multiplier=0.7 (friendly stars 30% "closer")
    // boost=0.6 → multiplier=0.4 (strong corridor guarantee)
    // boost=0.9 → multiplier=0.1 (extreme, almost faction-only)
    const friendlyMult = Math.max(0.05, 1.0 - corridorBoost);

    for (let py = 0; py < canvasH; py++) {
        for (let px = 0; px < canvasW; px++) {
            // PASS 1: Find the true nearest star (unmodified distances)
            let minDist = Infinity;
            let nearestIdx = 0;

            for (let i = 0; i < numStars; i++) {
                const dx = px - starData[i].x;
                const dy = py - starData[i].y;
                const dist = dx * dx + dy * dy;
                if (dist < minDist) {
                    minDist = dist;
                    nearestIdx = i;
                }
            }

            // PASS 2: If corridor boost enabled, re-evaluate with discount
            // Same-owner stars get their distances reduced, potentially
            // pulling the pixel into friendly territory
            if (corridorBoost > 0) {
                const nearestOwner = starData[nearestIdx].ownerId;
                let bestDist = minDist;
                let bestIdx = nearestIdx;

                for (let i = 0; i < numStars; i++) {
                    const dx = px - starData[i].x;
                    const dy = py - starData[i].y;
                    let dist = dx * dx + dy * dy;

                    // Apply same-owner discount
                    if (starData[i].ownerId === nearestOwner) {
                        dist *= friendlyMult * friendlyMult; // squared because dist is squared
                    }

                    if (dist < bestDist) {
                        bestDist = dist;
                        bestIdx = i;
                    }
                }

                nearestIdx = bestIdx;
            }

            const [r, g, b] = starData[nearestIdx].rgb;
            let pixelAlpha = alpha;

            // Optional edge blend: reduce alpha near territory boundaries
            if (edgeBlend > 0) {
                let secondMinDist = Infinity;
                for (let i = 0; i < numStars; i++) {
                    if (starData[i].ownerId === starData[nearestIdx].ownerId) continue;
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
    cachedTexture.source.scaleMode = 'linear'; // smooth upscale

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
    const blur = GAME_CONFIG.PIXEL_BLUR ?? 0;
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
