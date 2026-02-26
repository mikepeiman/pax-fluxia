// ============================================================================
// PixelTerritoryRenderer — Contiguous territory fill by nearest star ownership
// ============================================================================
//
// The original territory rendering approach: renders to a low-res offscreen
// canvas where every pixel is colored by the nearest owned star's player color.
// Creates smooth, contiguous territory regions where connected friendly stars
// naturally appear visually merged.
//
// Power-weighted blending mode: instead of hard nearest-neighbor, blends colors
// from multiple nearby stars using weight = 1/dist^power. This naturally
// produces rounded, organic border curves. Higher power = sharper (more like
// classic Voronoi), lower power = softer/rounder borders.
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
    fp += `:${GAME_CONFIG.PIXEL_BLEND_POWER}:${GAME_CONFIG.TERRITORY_PIXEL}`;
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

// ── Star data for rendering ───────────────────────────────────────────────

interface StarEntry {
    x: number;
    y: number;
    rgb: [number, number, number];
    ownerId: string;
}

// ── Main Renderer ──────────────────────────────────────────────────────────

/**
 * Render pixel territory overlay.
 * When PIXEL_BLEND_POWER > 0, uses power-weighted color blending for rounded
 * borders. When 0, uses classic hard nearest-neighbor (angular Voronoi edges).
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
    const blendPower = GAME_CONFIG.PIXEL_BLEND_POWER ?? 0;

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;

    // Pre-compute star data at canvas scale
    const starData: StarEntry[] = ownedStars.map(s => ({
        x: s.x / resolution,
        y: s.y / resolution,
        rgb: hexToRGB(colorUtils.getPlayerColor(s.ownerId!)),
        ownerId: s.ownerId!,
    }));

    // Create ImageData for direct pixel manipulation
    const imageData = ctx.createImageData(canvasW, canvasH);
    const pixels = imageData.data;
    const numStars = starData.length;

    // Choose rendering path based on blend power
    if (blendPower > 0) {
        // ── Power-weighted blending ──
        // For each pixel, compute weight = 1/dist^power for each star,
        // then blend colors proportionally. This naturally rounds borders.
        const power = blendPower;

        for (let py = 0; py < canvasH; py++) {
            for (let px = 0; px < canvasW; px++) {
                let totalWeight = 0;
                let rSum = 0, gSum = 0, bSum = 0;

                for (let i = 0; i < numStars; i++) {
                    const s = starData[i];
                    const dx = px - s.x;
                    const dy = py - s.y;
                    const distSq = dx * dx + dy * dy;

                    // Avoid division by zero — pixel right on a star
                    if (distSq < 1) {
                        // Pixel is on top of this star — use its color directly
                        rSum = s.rgb[0];
                        gSum = s.rgb[1];
                        bSum = s.rgb[2];
                        totalWeight = 1;
                        break;
                    }

                    // weight = 1 / dist^power = 1 / (distSq^(power/2))
                    const weight = 1.0 / Math.pow(distSq, power * 0.5);
                    totalWeight += weight;
                    rSum += s.rgb[0] * weight;
                    gSum += s.rgb[1] * weight;
                    bSum += s.rgb[2] * weight;
                }

                let pixelAlpha = alpha;

                // Optional edge blend
                if (edgeBlend > 0 && totalWeight > 0) {
                    // Find dominant star — if close to 50/50 blend we're at a border
                    let maxWeight = 0;
                    for (let i = 0; i < numStars; i++) {
                        const s = starData[i];
                        const dx = px - s.x;
                        const dy = py - s.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < 1) { maxWeight = 1; break; }
                        const w = 1.0 / Math.pow(distSq, power * 0.5);
                        if (w > maxWeight) maxWeight = w;
                    }
                    // dominance = how much the strongest star dominates (0.5 = even split, 1 = total domination)
                    const dominance = totalWeight > 0 ? maxWeight / totalWeight : 1;
                    // At borders, dominance ≈ 0.5; deep inside territory, dominance ≈ 1
                    const edgeFactor = Math.min(1, (dominance - 0.3) / (edgeBlend * 0.07));
                    pixelAlpha *= Math.max(0, edgeFactor);
                }

                const idx = (py * canvasW + px) * 4;
                if (totalWeight > 0) {
                    const invWeight = 1 / totalWeight;
                    pixels[idx] = Math.round(rSum * invWeight);
                    pixels[idx + 1] = Math.round(gSum * invWeight);
                    pixels[idx + 2] = Math.round(bSum * invWeight);
                    pixels[idx + 3] = Math.round(pixelAlpha * 255);
                }
            }
        }
    } else {
        // ── Classic nearest-neighbor (original algorithm) ──
        for (let py = 0; py < canvasH; py++) {
            for (let px = 0; px < canvasW; px++) {
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

                const [r, g, b] = starData[nearestIdx].rgb;
                let pixelAlpha = alpha;

                // Optional edge blend
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
