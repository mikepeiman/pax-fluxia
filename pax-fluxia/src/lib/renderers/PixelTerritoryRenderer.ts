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
let lastRenderTime = 0;
let lastRenderDuration = 0;

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
    fp += `:${GAME_CONFIG.PIXEL_HUE_SHIFT}:${GAME_CONFIG.PIXEL_BORDER_WIDTH}`;
    fp += `:${GAME_CONFIG.PIXEL_BORDER_ALPHA}:${GAME_CONFIG.PIXEL_BORDER_BRIGHTEN}`;
    fp += `:${GAME_CONFIG.PIXEL_PATTERN}:${GAME_CONFIG.PIXEL_PATTERN_SCALE}:${GAME_CONFIG.PIXEL_PATTERN_ROTATION}`;
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

    // ── ADAPTIVE THROTTLE ──
    // Wait at least 5× the last render duration before recomputing.
    // At resolution=1 (~1.2s render), this means ~6s between recomputes.
    // At resolution=4 (~50ms render), ~250ms. Prevents main thread blocking.
    const now = performance.now();
    const minWait = Math.max(500, lastRenderDuration * 5);
    if (cachedSprite && (now - lastRenderTime) < minWait) {
        cachedSprite.visible = true;
        applyBlur();
        return;
    }
    const renderStart = performance.now();

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
    const hueShift = GAME_CONFIG.PIXEL_HUE_SHIFT ?? 0;
    const borderWidth = GAME_CONFIG.PIXEL_BORDER_WIDTH ?? 0;
    const borderAlpha = GAME_CONFIG.PIXEL_BORDER_ALPHA ?? 0.6;
    const borderBrighten = GAME_CONFIG.PIXEL_BORDER_BRIGHTEN ?? 80;
    const pattern = GAME_CONFIG.PIXEL_PATTERN ?? 'none';
    // Normalize to world-space so pattern looks the same at any resolution
    const patternScale = Math.max(1, Math.round((GAME_CONFIG.PIXEL_PATTERN_SCALE ?? 4) / resolution));

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;

    // Pre-compute star data at canvas scale, with HSL adjustment applied
    const starData: StarEntry[] = ownedStars.map(s => {
        const rawRgb = hexToRGB(colorUtils.getPlayerColor(s.ownerId!));
        let rgb: [number, number, number];
        if (useHSL || hueShift !== 0) {
            const [h, sat, l] = rgbToHSL(rawRgb[0], rawRgb[1], rawRgb[2]);
            const newH = (h + hueShift) % 360;
            rgb = hslToRGB(newH, Math.min(1, sat * satMult), Math.min(1, l * lightMult));
        } else {
            rgb = rawRgb;
        }
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

    // Build unique owner list for faction-based influence
    const ownerSet = new Set<string>();
    for (const s of starData) ownerSet.add(s.ownerId);
    const owners = Array.from(ownerSet);
    const numOwners = owners.length;

    // Pre-group stars by owner for fast lookup
    const starsByOwner: Map<string, number[]> = new Map();
    for (const owner of owners) starsByOwner.set(owner, []);
    for (let i = 0; i < numStars; i++) {
        starsByOwner.get(starData[i].ownerId)!.push(i);
    }

    // Pre-compute per-owner RGB (first star of that owner — they share colors)
    const ownerRGB: Map<string, [number, number, number]> = new Map();
    const ownerIndex: Map<string, number> = new Map();
    for (let oi = 0; oi < owners.length; oi++) {
        const owner = owners[oi];
        ownerRGB.set(owner, starData[starsByOwner.get(owner)![0]].rgb);
        ownerIndex.set(owner, oi);
    }

    // Pre-compute per-owner pattern rotation (golden angle for max separation)
    const patternRotation = GAME_CONFIG.PIXEL_PATTERN_ROTATION ?? 1;
    const ownerCos = new Float64Array(owners.length);
    const ownerSin = new Float64Array(owners.length);
    for (let oi = 0; oi < owners.length; oi++) {
        const angle = (oi * 137.508 * patternRotation * Math.PI) / 180;
        ownerCos[oi] = Math.cos(angle);
        ownerSin[oi] = Math.sin(angle);
    }

    // =====================================================================
    // HIERARCHICAL ADAPTIVE RESOLUTION
    // =====================================================================
    // Instead of computing expensive faction influence for every pixel:
    // 1. Coarse pass: determine ownership at low res (cheap)
    // 2. Detect boundary tiles: coarse cells with different-owner neighbors
    // 3. Interior tiles: flood-fill with owner color (instant)
    // 4. Boundary tiles: expensive per-pixel computation only here (~10-15%)
    // =====================================================================

    const TILE_SIZE = 8; // coarse tile size in output pixels
    const tilesW = Math.ceil(canvasW / TILE_SIZE);
    const tilesH = Math.ceil(canvasH / TILE_SIZE);

    // ── Pass 1: Coarse ownership (center of each tile) ──
    const tileOwner = new Uint8Array(tilesW * tilesH);
    const tileRGB = new Uint8Array(tilesW * tilesH * 3);

    for (let ty = 0; ty < tilesH; ty++) {
        const centerY = (ty + 0.5) * TILE_SIZE;
        for (let tx = 0; tx < tilesW; tx++) {
            const centerX = (tx + 0.5) * TILE_SIZE;
            const tIdx = ty * tilesW + tx;

            let winnerIdx = 0;
            let winnerOwner: string;

            if (corridorBoost > 0 && numOwners > 1) {
                let bestInfluence = -1;
                let bestOwner = owners[0];
                for (let oi = 0; oi < numOwners; oi++) {
                    const owner = owners[oi];
                    const indices = starsByOwner.get(owner)!;
                    let influence = 0;
                    let ownerMinDist = Infinity;
                    for (const si of indices) {
                        const dx = centerX - starData[si].x;
                        const dy = centerY - starData[si].y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < ownerMinDist) ownerMinDist = distSq;
                        influence += distSq < 1 ? 1e12 : 1.0 / distSq;
                    }
                    const score = Math.pow(influence, corridorBoost) *
                        Math.pow(ownerMinDist < 1 ? 1e-12 : 1.0 / ownerMinDist, 1.0 - corridorBoost);
                    if (score > bestInfluence) {
                        bestInfluence = score;
                        bestOwner = owner;
                    }
                }
                winnerOwner = bestOwner;
            } else {
                let nearestDistSq = Infinity;
                for (let i = 0; i < numStars; i++) {
                    const dx = centerX - starData[i].x;
                    const dy = centerY - starData[i].y;
                    const dist = dx * dx + dy * dy;
                    if (dist < nearestDistSq) {
                        nearestDistSq = dist;
                        winnerIdx = i;
                    }
                }
                winnerOwner = starData[winnerIdx].ownerId;
            }

            tileOwner[tIdx] = ownerIndex.get(winnerOwner)!;
            const rgb = ownerRGB.get(winnerOwner)!;
            tileRGB[tIdx * 3] = rgb[0];
            tileRGB[tIdx * 3 + 1] = rgb[1];
            tileRGB[tIdx * 3 + 2] = rgb[2];
        }
    }

    // ── Pass 2: Detect boundary tiles ──
    const isBoundaryTile = new Uint8Array(tilesW * tilesH);
    for (let ty = 0; ty < tilesH; ty++) {
        for (let tx = 0; tx < tilesW; tx++) {
            const tIdx = ty * tilesW + tx;
            const myOwner = tileOwner[tIdx];
            // Check 4-neighbors
            if (tx > 0 && tileOwner[tIdx - 1] !== myOwner) { isBoundaryTile[tIdx] = 1; continue; }
            if (tx < tilesW - 1 && tileOwner[tIdx + 1] !== myOwner) { isBoundaryTile[tIdx] = 1; continue; }
            if (ty > 0 && tileOwner[tIdx - tilesW] !== myOwner) { isBoundaryTile[tIdx] = 1; continue; }
            if (ty < tilesH - 1 && tileOwner[tIdx + tilesW] !== myOwner) { isBoundaryTile[tIdx] = 1; continue; }
        }
    }

    // ── Pass 3 & 4: Fill pixels ──
    // Ownership grid for border detection
    const ownerGrid = borderWidth > 0 ? new Uint8Array(canvasW * canvasH) : null;

    for (let ty = 0; ty < tilesH; ty++) {
        for (let tx = 0; tx < tilesW; tx++) {
            const tIdx = ty * tilesW + tx;
            const startX = tx * TILE_SIZE;
            const startY = ty * TILE_SIZE;
            const endX = Math.min(startX + TILE_SIZE, canvasW);
            const endY = Math.min(startY + TILE_SIZE, canvasH);

            if (!isBoundaryTile[tIdx]) {
                // ── INTERIOR TILE: flood fill with single color ──
                const r = tileRGB[tIdx * 3];
                const g = tileRGB[tIdx * 3 + 1];
                const b = tileRGB[tIdx * 3 + 2];
                const oi = tileOwner[tIdx];

                for (let py = startY; py < endY; py++) {
                    for (let px = startX; px < endX; px++) {
                        let pa = alpha;

                        // Pattern modulation with per-owner rotation
                        if (pattern !== 'none') {
                            const ps = patternScale;
                            // Rotate coordinates by owner's angle
                            const rpx = px * ownerCos[oi] - py * ownerSin[oi];
                            const rpy = px * ownerSin[oi] + py * ownerCos[oi];
                            if (pattern === 'stripes') {
                                pa *= ((Math.floor((rpx + rpy) / ps)) % 2 === 0) ? 1.0 : 0.35;
                            } else if (pattern === 'crosshatch') {
                                pa *= ((((rpx % ps) + ps) % ps) < 1 || (((rpy % ps) + ps) % ps) < 1) ? 1.0 : 0.3;
                            } else if (pattern === 'dots') {
                                const gx = ((((rpx % ps) + ps) % ps) - ps / 2);
                                const gy = ((((rpy % ps) + ps) % ps) - ps / 2);
                                pa *= (Math.sqrt(gx * gx + gy * gy) / (ps / 2)) < 0.5 ? 1.0 : 0.25;
                            }
                        }

                        const idx = (py * canvasW + px) * 4;
                        pixels[idx] = r;
                        pixels[idx + 1] = g;
                        pixels[idx + 2] = b;
                        pixels[idx + 3] = Math.round(pa * 255);
                        if (ownerGrid) ownerGrid[py * canvasW + px] = oi;
                    }
                }
            } else {
                // ── BOUNDARY TILE: full per-pixel computation ──
                for (let py = startY; py < endY; py++) {
                    for (let px = startX; px < endX; px++) {
                        let winnerOwner: string;
                        let winnerRgb: [number, number, number];
                        let nearestDistSq = Infinity;

                        if (corridorBoost > 0 && numOwners > 1) {
                            let bestInfluence = -1;
                            let bestOwner = owners[0];
                            let bestNearestDistSq = Infinity;
                            for (let oi = 0; oi < numOwners; oi++) {
                                const owner = owners[oi];
                                const indices = starsByOwner.get(owner)!;
                                let influence = 0;
                                let ownerMinDist = Infinity;
                                for (const si of indices) {
                                    const dx = px - starData[si].x;
                                    const dy = py - starData[si].y;
                                    const distSq = dx * dx + dy * dy;
                                    if (distSq < ownerMinDist) ownerMinDist = distSq;
                                    influence += distSq < 1 ? 1e12 : 1.0 / distSq;
                                }
                                const score = Math.pow(influence, corridorBoost) *
                                    Math.pow(ownerMinDist < 1 ? 1e-12 : 1.0 / ownerMinDist, 1.0 - corridorBoost);
                                if (score > bestInfluence) {
                                    bestInfluence = score;
                                    bestOwner = owner;
                                    bestNearestDistSq = ownerMinDist;
                                }
                            }
                            winnerOwner = bestOwner;
                            winnerRgb = ownerRGB.get(bestOwner)!;
                            nearestDistSq = bestNearestDistSq;
                        } else {
                            let nearestIdx = 0;
                            for (let i = 0; i < numStars; i++) {
                                const dx = px - starData[i].x;
                                const dy = py - starData[i].y;
                                const dist = dx * dx + dy * dy;
                                if (dist < nearestDistSq) {
                                    nearestDistSq = dist;
                                    nearestIdx = i;
                                }
                            }
                            winnerOwner = starData[nearestIdx].ownerId;
                            winnerRgb = starData[nearestIdx].rgb;
                        }

                        const [r, g, b] = winnerRgb;
                        let pixelAlpha = alpha;

                        // Edge blend (only at boundaries, only between enemies)
                        if (edgeBlend > 0) {
                            let secondMinDist = Infinity;
                            for (let i = 0; i < numStars; i++) {
                                if (starData[i].ownerId === winnerOwner) continue;
                                const dx = px - starData[i].x;
                                const dy = py - starData[i].y;
                                const dist = dx * dx + dy * dy;
                                if (dist < secondMinDist) secondMinDist = dist;
                            }
                            if (secondMinDist < Infinity) {
                                const d1 = Math.sqrt(nearestDistSq);
                                const d2 = Math.sqrt(secondMinDist);
                                const edgeDist = (d2 - d1) / (d1 + d2 + 0.001);
                                const blendFactor = Math.min(1, edgeDist / (edgeBlend * 0.05));
                                pixelAlpha *= blendFactor;
                            }
                        }

                        // Pattern modulation with per-owner rotation
                        if (pattern !== 'none') {
                            const ps = patternScale;
                            const woIdx = ownerIndex.get(winnerOwner)!;
                            const rpx = px * ownerCos[woIdx] - py * ownerSin[woIdx];
                            const rpy = px * ownerSin[woIdx] + py * ownerCos[woIdx];
                            if (pattern === 'stripes') {
                                pixelAlpha *= ((Math.floor((rpx + rpy) / ps)) % 2 === 0) ? 1.0 : 0.35;
                            } else if (pattern === 'crosshatch') {
                                pixelAlpha *= ((((rpx % ps) + ps) % ps) < 1 || (((rpy % ps) + ps) % ps) < 1) ? 1.0 : 0.3;
                            } else if (pattern === 'dots') {
                                const gx = ((((rpx % ps) + ps) % ps) - ps / 2);
                                const gy = ((((rpy % ps) + ps) % ps) - ps / 2);
                                pixelAlpha *= (Math.sqrt(gx * gx + gy * gy) / (ps / 2)) < 0.5 ? 1.0 : 0.25;
                            }
                        }

                        const idx = (py * canvasW + px) * 4;
                        pixels[idx] = r;
                        pixels[idx + 1] = g;
                        pixels[idx + 2] = b;
                        pixels[idx + 3] = Math.round(pixelAlpha * 255);
                        if (ownerGrid) ownerGrid[py * canvasW + px] = ownerIndex.get(winnerOwner)!;
                    }
                }
            }
        }
    }

    // ── Border detection pass (ownership-based) ──
    if (borderWidth > 0 && ownerGrid) {
        const bw = Math.max(1, Math.round(borderWidth));
        for (let py = bw; py < canvasH - bw; py++) {
            for (let px = bw; px < canvasW - bw; px++) {
                const gridIdx = py * canvasW + px;
                const myOwner = ownerGrid[gridIdx];

                let isBorder = false;
                for (let d = 1; d <= bw && !isBorder; d++) {
                    if (px + d < canvasW && ownerGrid[gridIdx + d] !== myOwner) isBorder = true;
                    if (px - d >= 0 && ownerGrid[gridIdx - d] !== myOwner) isBorder = true;
                    if (py + d < canvasH && ownerGrid[gridIdx + d * canvasW] !== myOwner) isBorder = true;
                    if (py - d >= 0 && ownerGrid[gridIdx - d * canvasW] !== myOwner) isBorder = true;
                }

                if (isBorder) {
                    const idx = (py * canvasW + px) * 4;
                    pixels[idx] = Math.min(255, pixels[idx] + borderBrighten);
                    pixels[idx + 1] = Math.min(255, pixels[idx + 1] + borderBrighten);
                    pixels[idx + 2] = Math.min(255, pixels[idx + 2] + borderBrighten);
                    pixels[idx + 3] = Math.round(borderAlpha * 255);
                }
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

    // Record render duration for adaptive throttle
    lastRenderDuration = performance.now() - renderStart;
    lastRenderTime = performance.now();
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
