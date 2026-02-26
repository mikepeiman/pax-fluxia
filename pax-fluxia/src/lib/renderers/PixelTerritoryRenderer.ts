// ============================================================================
// PixelTerritoryRenderer — Contiguous territory fill by nearest star ownership
// ============================================================================
//
// The original territory rendering approach: renders to a low-res offscreen
// canvas where every pixel is colored by the nearest owned star's player color.
// Creates smooth, contiguous territory regions where connected friendly stars
// naturally appear visually merged.
//
// Faithful reproduction of commit 127d84f with tunable controls exposed.
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
    // Include ALL config values that affect pixel rendering
    fp += `:${GAME_CONFIG.PIXEL_ALPHA}:${GAME_CONFIG.PIXEL_RESOLUTION}`;
    fp += `:${GAME_CONFIG.PIXEL_EDGE_BLEND}:${GAME_CONFIG.PIXEL_BLUR}`;
    fp += `:${GAME_CONFIG.TERRITORY_PIXEL}`;
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

// ── Main Renderer ──────────────────────────────────────────────────────────

/**
 * Render pixel territory overlay.
 * Faithful reproduction of the original nearest-neighbor approach:
 * every pixel is colored by the nearest owned star's player color.
 * Only regenerates the offscreen canvas when ownership or config changes.
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

    // Resolution: higher number = faster but blockier (downscale factor)
    const resolution = GAME_CONFIG.PIXEL_RESOLUTION ?? 4;
    const canvasW = Math.ceil(worldWidth / resolution);
    const canvasH = Math.ceil(worldHeight / resolution);
    const alpha = GAME_CONFIG.PIXEL_ALPHA ?? 0.15;
    const edgeBlend = GAME_CONFIG.PIXEL_EDGE_BLEND ?? 0;

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;

    // Pre-compute star data at canvas scale
    const starData = ownedStars.map(s => ({
        x: s.x / resolution,
        y: s.y / resolution,
        rgb: hexToRGB(colorUtils.getPlayerColor(s.ownerId!)),
        ownerId: s.ownerId!,
    }));

    // Create ImageData for direct pixel manipulation (fast)
    const imageData = ctx.createImageData(canvasW, canvasH);
    const pixels = imageData.data;

    // For each pixel, find nearest owned star and color it
    // This is the EXACT algorithm from the original — brute force nearest neighbor
    for (let py = 0; py < canvasH; py++) {
        for (let px = 0; px < canvasW; px++) {
            let minDist = Infinity;
            let nearestIdx = 0;

            // Find nearest star (brute force — simple and correct)
            for (let i = 0; i < starData.length; i++) {
                const dx = px - starData[i].x;
                const dy = py - starData[i].y;
                const dist = dx * dx + dy * dy; // squared distance (no sqrt needed)
                if (dist < minDist) {
                    minDist = dist;
                    nearestIdx = i;
                }
            }

            const [r, g, b] = starData[nearestIdx].rgb;
            let pixelAlpha = alpha;

            // Optional edge blend: reduce alpha near territory boundaries
            if (edgeBlend > 0) {
                // Find second-nearest star of different owner
                let secondMinDist = Infinity;
                for (let i = 0; i < starData.length; i++) {
                    if (starData[i].ownerId === starData[nearestIdx].ownerId) continue;
                    const dx = px - starData[i].x;
                    const dy = py - starData[i].y;
                    const dist = dx * dx + dy * dy;
                    if (dist < secondMinDist) secondMinDist = dist;
                }
                if (secondMinDist < Infinity) {
                    const nearest = Math.sqrt(minDist);
                    const secondNearest = Math.sqrt(secondMinDist);
                    const edgeDist = (secondNearest - nearest) / (nearest + secondNearest + 0.001);
                    // edgeDist is 0 at boundary, ~1 deep inside territory
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
