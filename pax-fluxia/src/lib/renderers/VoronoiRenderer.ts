// ============================================================================
// VoronoiRenderer — Contiguous territory fill by nearest star ownership
// ============================================================================
//
// Renders a full-map territory overlay where every pixel is colored by the
// nearest owned star's player color. Creates contiguous territory regions
// similar to the original Pax Solaris.
//
// Performance: renders to a low-res offscreen canvas, only regenerates when
// star ownership fingerprint changes. Displayed as a single PIXI.Sprite.
// ============================================================================

import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState } from '$lib/types/game.types';
import type { ColorUtils } from './RenderContext';

/** Cached state to avoid unnecessary regeneration */
let cachedFingerprint = '';
let cachedSprite: PIXI.Sprite | null = null;
let cachedTexture: PIXI.Texture | null = null;

/**
 * Build ownership fingerprint — only regenerate when this changes.
 */
function buildFingerprint(stars: StarState[]): string {
    let fp = '';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}|`;
    }
    fp += `${GAME_CONFIG.VORONOI_ALPHA}:${GAME_CONFIG.VORONOI_RESOLUTION}:${GAME_CONFIG.VORONOI_EDGE_BLEND}`;
    fp += `:${GAME_CONFIG.VORONOI_BORDER_WIDTH}:${GAME_CONFIG.VORONOI_BORDER_ALPHA}`;
    return fp;
}

/**
 * Convert a numeric hex color (0xRRGGBB) to r,g,b components.
 */
function hexToRGB(hex: number): [number, number, number] {
    return [
        (hex >> 16) & 0xff,
        (hex >> 8) & 0xff,
        hex & 0xff,
    ];
}

/**
 * Render Voronoi territory overlay.
 * Only regenerates the offscreen canvas when ownership changes.
 */
export function renderVoronoi(
    stars: StarState[],
    voronoiContainer: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
): void {
    if (!GAME_CONFIG.SHOW_VORONOI) {
        if (cachedSprite && cachedSprite.parent) {
            cachedSprite.visible = false;
        }
        return;
    }

    const fingerprint = buildFingerprint(stars);

    // Skip regeneration if nothing changed
    if (fingerprint === cachedFingerprint && cachedSprite) {
        cachedSprite.visible = true;
        return;
    }

    cachedFingerprint = fingerprint;

    // Only consider owned stars for territory
    const ownedStars = stars.filter(s => s.ownerId);
    if (ownedStars.length === 0) {
        if (cachedSprite) cachedSprite.visible = false;
        return;
    }

    const resolution = GAME_CONFIG.VORONOI_RESOLUTION ?? 4;
    const canvasW = Math.ceil(worldWidth / resolution);
    const canvasH = Math.ceil(worldHeight / resolution);
    const alpha = GAME_CONFIG.VORONOI_ALPHA ?? 0.15;
    const edgeBlend = GAME_CONFIG.VORONOI_EDGE_BLEND ?? 0;
    const borderWidth = Math.round((GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 2) / resolution);
    const borderAlpha = GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.4;

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

    // Create ImageData for direct pixel manipulation
    const imageData = ctx.createImageData(canvasW, canvasH);
    const pixels = imageData.data;

    // Build ownership map (which star index owns each pixel)
    const ownerMap = new Int16Array(canvasW * canvasH);

    // Pass 1: Assign nearest star to each pixel
    for (let py = 0; py < canvasH; py++) {
        for (let px = 0; px < canvasW; px++) {
            let minDist = Infinity;
            let nearestIdx = 0;

            for (let i = 0; i < starData.length; i++) {
                const dx = px - starData[i].x;
                const dy = py - starData[i].y;
                const dist = dx * dx + dy * dy;
                if (dist < minDist) {
                    minDist = dist;
                    nearestIdx = i;
                }
            }

            ownerMap[py * canvasW + px] = nearestIdx;
        }
    }

    // Pass 2: Fill pixels with color + optional edge blend + borders
    for (let py = 0; py < canvasH; py++) {
        for (let px = 0; px < canvasW; px++) {
            const mapIdx = py * canvasW + px;
            const nearestIdx = ownerMap[mapIdx];
            const [r, g, b] = starData[nearestIdx].rgb;
            let pixelAlpha = alpha;

            // Edge blend: reduce alpha near territory boundaries
            if (edgeBlend > 0) {
                let secondMinDist = Infinity;
                const myDist = (() => {
                    const dx = px - starData[nearestIdx].x;
                    const dy = py - starData[nearestIdx].y;
                    return Math.sqrt(dx * dx + dy * dy);
                })();
                for (let i = 0; i < starData.length; i++) {
                    if (starData[i].ownerId === starData[nearestIdx].ownerId) continue;
                    const dx = px - starData[i].x;
                    const dy = py - starData[i].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < secondMinDist) secondMinDist = dist;
                }
                if (secondMinDist < Infinity) {
                    const edgeDist = (secondMinDist - myDist) / (myDist + secondMinDist + 0.001);
                    const blendFactor = Math.min(1, edgeDist / (edgeBlend * 0.1));
                    pixelAlpha *= blendFactor;
                }
            }

            // Check if this pixel is on a territory border
            let isBorder = false;
            if (borderWidth > 0 && borderAlpha > 0) {
                const myOwner = starData[nearestIdx].ownerId;
                // Check neighbors within border width
                for (let dy = -borderWidth; dy <= borderWidth && !isBorder; dy++) {
                    for (let dx = -borderWidth; dx <= borderWidth && !isBorder; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = px + dx;
                        const ny = py + dy;
                        if (nx < 0 || nx >= canvasW || ny < 0 || ny >= canvasH) continue;
                        const neighborIdx = ownerMap[ny * canvasW + nx];
                        if (starData[neighborIdx].ownerId !== myOwner) {
                            isBorder = true;
                        }
                    }
                }
            }

            const idx = mapIdx * 4;
            if (isBorder) {
                // Border pixels: bright white/light at higher alpha
                pixels[idx] = Math.min(255, r + 100);
                pixels[idx + 1] = Math.min(255, g + 100);
                pixels[idx + 2] = Math.min(255, b + 100);
                pixels[idx + 3] = Math.round(borderAlpha * 255);
            } else {
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
    cachedTexture.source.scaleMode = 'linear';

    // Create or update sprite
    if (!cachedSprite) {
        cachedSprite = new PIXI.Sprite(cachedTexture);
        voronoiContainer.addChild(cachedSprite);
    } else {
        cachedSprite.texture = cachedTexture;
    }

    cachedSprite.width = worldWidth;
    cachedSprite.height = worldHeight;
    cachedSprite.visible = true;
}

/**
 * Reset cached data (call on game session change).
 */
export function resetVoronoiCache(): void {
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
}
