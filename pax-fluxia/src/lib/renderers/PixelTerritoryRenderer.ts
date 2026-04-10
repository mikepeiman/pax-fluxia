// ============================================================================
// PixelTerritoryRenderer — Web Worker-accelerated territory fill
// ============================================================================
//
// Renders contiguous territory regions using a Web Worker for zero main-thread
// blocking. The computation (hierarchical adaptive resolution) runs entirely
// off-thread. The main thread just manages the PIXI sprite and dispatches work.
//
// CORRIDOR GUARANTEE: Same-owner stars get a distance discount
// (PIXEL_CORRIDOR_BOOST). This inflates friendly territory to ensure
// neighboring stars of the same player always have a visual corridor
// connecting them, even when enemy stars sit between them.
// ============================================================================

import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState, StarConnection } from '$lib/types/game.types';
import { findConnectedClustersOptimized } from './territoryUtils';
import type { ColorUtils } from './RenderContext';
import PixelWorker from './pixelTerritory.worker?worker';

/** Cached state */
let cachedFingerprint = '';
let cachedSprite: PIXI.Sprite | null = null;
let cachedTexture: PIXI.Texture | null = null;
let cachedBlurFilter: PIXI.BlurFilter | null = null;
let cachedBlurStrength = -1;

/** Worker state */
let worker: Worker | null = null;
let workerBusy = false;
let pendingContainer: PIXI.Container | null = null;
let pendingTotalW = 0;
let pendingTotalH = 0;
let pendingPadding = 0;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build ownership fingerprint — only regenerate when this changes. */
function buildFingerprint(stars: StarState[]): string {
    let fp = '';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}:${s.activeShips}|`;
    }
    fp += `:${GAME_CONFIG.PIXEL_ALPHA}:${GAME_CONFIG.PIXEL_RESOLUTION}`;
    fp += `:${GAME_CONFIG.PIXEL_EDGE_BLEND}:${GAME_CONFIG.PIXEL_BLUR}`;
    fp += `:${GAME_CONFIG.PIXEL_CORRIDOR_BOOST}:${GAME_CONFIG.TERRITORY_PIXEL}`;
    fp += `:${GAME_CONFIG.PIXEL_SATURATION}:${GAME_CONFIG.PIXEL_LIGHTNESS}`;
    fp += `:${GAME_CONFIG.PIXEL_HUE_SHIFT}:${GAME_CONFIG.PIXEL_BORDER_WIDTH}`;
    fp += `:${GAME_CONFIG.PIXEL_BORDER_ALPHA}:${GAME_CONFIG.PIXEL_BORDER_BRIGHTEN}`;
    fp += `:${GAME_CONFIG.PIXEL_PATTERN}:${GAME_CONFIG.PIXEL_PATTERN_SCALE}:${GAME_CONFIG.PIXEL_PATTERN_ROTATION}`;
    fp += `:${GAME_CONFIG.PIXEL_EDGE_FADE}`;
    fp += `:${GAME_CONFIG.PIXEL_LANE_CONSTRAIN}:${GAME_CONFIG.PIXEL_PRESSURE}`;
    fp += `:${GAME_CONFIG.TERRITORY_CLUSTER_SPLIT}`;
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

// ── Worker result handler ──────────────────────────────────────────────────

function handleWorkerResult(e: MessageEvent): void {
    const { pixels: pixelBuf, canvasW, canvasH } = e.data;
    const pixelData = new Uint8ClampedArray(pixelBuf);

    workerBusy = false;


    const container = pendingContainer;
    if (!container) return;

    // Create canvas from pixel data
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;
    const imageData = new ImageData(pixelData, canvasW, canvasH);
    ctx.putImageData(imageData, 0, 0);

    // Create PIXI texture
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

    cachedSprite.width = pendingTotalW;
    cachedSprite.height = pendingTotalH;
    cachedSprite.x = -pendingPadding;
    cachedSprite.y = -pendingPadding;
    cachedSprite.visible = true;

    applyBlur();
}

// ── Main Renderer ──────────────────────────────────────────────────────────

/**
 * Render pixel territory overlay using a Web Worker.
 * 
 * The main thread prepares star data and config, dispatches to worker,
 * and shows the cached sprite until the worker delivers results.
 * Zero main-thread blocking.
 */
export function renderPixelTerritory(
    stars: StarState[],
    container: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections?: StarConnection[],
): void {
    if (!GAME_CONFIG.TERRITORY_PIXEL) {
        if (cachedSprite) cachedSprite.visible = false;
        return;
    }


    const fingerprint = buildFingerprint(stars) + `:${worldWidth}:${worldHeight}`;

    // Skip if nothing changed or worker is busy
    if (fingerprint === cachedFingerprint && cachedSprite) {
        cachedSprite.visible = true;
        applyBlur();
        return;
    }

    // If worker is busy, show cached sprite while waiting
    if (workerBusy) {
        if (cachedSprite) {
            cachedSprite.visible = true;
            applyBlur();
        }
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
    const edgeFadePx = GAME_CONFIG.PIXEL_EDGE_FADE ?? 200;
    const padding = edgeFadePx;
    const totalW = worldWidth + padding * 2;
    const totalH = worldHeight + padding * 2;
    const canvasW = Math.ceil(totalW / resolution);
    const canvasH = Math.ceil(totalH / resolution);
    const satMult = GAME_CONFIG.PIXEL_SATURATION ?? 1.0;
    const lightMult = GAME_CONFIG.PIXEL_LIGHTNESS ?? 1.0;
    const useHSL = satMult !== 1.0 || lightMult !== 1.0;
    const hueShift = GAME_CONFIG.PIXEL_HUE_SHIFT ?? 0;
    const patternScale = Math.max(1, Math.round((GAME_CONFIG.PIXEL_PATTERN_SCALE ?? 4) / resolution));

    // Build star lookup and connected clusters
    const starById = new Map<string, StarState>();
    for (const s of ownedStars) starById.set(s.id, s);

    const clusterMap = findConnectedClustersOptimized(
        ownedStars,
        connections ?? [],
        starById,
    );

    const clusterValues = Array.from(clusterMap.values());
    const numClusters = clusterValues.length > 0
        ? Math.max(...clusterValues.map(c => c.clusterIdx)) + 1
        : 0;

    const starDataForWorker: { x: number; y: number; r: number; g: number; b: number; ownerIdx: number; ships: number; angles: number[] }[] = [];

    // Precompute connection angles per star (for lane constraint)
    const starAngleMap = new Map<string, number[]>();
    if (connections) {
        for (const conn of connections) {
            const a = starById.get(conn.sourceId);
            const b = starById.get(conn.targetId);
            if (!a || !b) continue;
            const angleAB = Math.atan2(b.y - a.y, b.x - a.x);
            if (!starAngleMap.has(a.id)) starAngleMap.set(a.id, []);
            starAngleMap.get(a.id)!.push(angleAB);
            const angleBA = Math.atan2(a.y - b.y, a.x - b.x);
            if (!starAngleMap.has(b.id)) starAngleMap.set(b.id, []);
            starAngleMap.get(b.id)!.push(angleBA);
        }
    }

    // Build flat cluster RGB array (same color for same-player clusters)
    const ownerRGBFlat: number[] = new Array(numClusters * 3);

    for (const s of ownedStars) {
        const rawRgb = hexToRGB(colorUtils.getPlayerColor(s.ownerId!));
        let rgb: [number, number, number];
        if (useHSL || hueShift !== 0) {
            const [h, sat, l] = rgbToHSL(rawRgb[0], rawRgb[1], rawRgb[2]);
            const newH = (h + hueShift) % 360;
            rgb = hslToRGB(newH, Math.min(1, sat * satMult), Math.min(1, l * lightMult));
        } else {
            rgb = rawRgb;
        }

        const ci = clusterMap.get(s.id)?.clusterIdx ?? 0;
        if (ownerRGBFlat[ci * 3] === undefined) {
            ownerRGBFlat[ci * 3] = rgb[0];
            ownerRGBFlat[ci * 3 + 1] = rgb[1];
            ownerRGBFlat[ci * 3 + 2] = rgb[2];
        }

        starDataForWorker.push({
            x: (s.x + padding) / resolution,
            y: (s.y + padding) / resolution,
            r: rgb[0],
            g: rgb[1],
            b: rgb[2],
            ownerIdx: ci,
            ships: (s.activeShips ?? 0) + (s.damagedShips ?? 0),
            angles: starAngleMap.get(s.id) ?? [],
        });
    }

    // Initialize worker lazily
    if (!worker) {
        worker = new PixelWorker();
        worker.onmessage = handleWorkerResult;
    }

    // Store rendering context for when worker returns
    pendingContainer = container;
    pendingTotalW = totalW;
    pendingTotalH = totalH;
    pendingPadding = padding;
    workerBusy = true;


    // Corridor capsules: same-owner full segment; cross-owner split at midpoint (matches CX virtual split)
    const corridorBoost = GAME_CONFIG.PIXEL_CORRIDOR_BOOST ?? 0;
    const corridorSegs: { x1: number; y1: number; x2: number; y2: number; ownerIdx: number; halfW: number }[] = [];
    if (corridorBoost > 0 && connections) {
        for (const conn of connections) {
            const a = starById.get(conn.sourceId);
            const b = starById.get(conn.targetId);
            if (!a || !b || !a.ownerId || !b.ownerId) continue;
            const x1 = (a.x + padding) / resolution;
            const y1 = (a.y + padding) / resolution;
            const x2 = (b.x + padding) / resolution;
            const y2 = (b.y + padding) / resolution;
            const linkDist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const halfW = Math.max(2, Math.min(30 / resolution, linkDist * 0.12 * corridorBoost));

            if (a.ownerId === b.ownerId) {
                const ci = clusterMap.get(a.id)?.clusterIdx;
                if (ci === undefined) continue;
                corridorSegs.push({ x1, y1, x2, y2, ownerIdx: ci, halfW });
            } else {
                const ciA = clusterMap.get(a.id)?.clusterIdx;
                const ciB = clusterMap.get(b.id)?.clusterIdx;
                if (ciA === undefined || ciB === undefined) continue;
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                corridorSegs.push({ x1, y1, x2: mx, y2: my, ownerIdx: ciA, halfW });
                corridorSegs.push({ x1: mx, y1: my, x2, y2, ownerIdx: ciB, halfW });
            }
        }
    }

    // Dispatch to worker
    worker.postMessage({
        canvasW,
        canvasH,
        stars: starDataForWorker,
        numOwners: numClusters,
        ownerRGB: ownerRGBFlat,
        alpha: GAME_CONFIG.PIXEL_ALPHA ?? 0.15,
        edgeBlend: GAME_CONFIG.PIXEL_EDGE_BLEND ?? 0,
        corridorBoost,
        corridorSegs,
        laneConstrain: GAME_CONFIG.PIXEL_LANE_CONSTRAIN ?? 0,
        pressure: GAME_CONFIG.PIXEL_PRESSURE ?? 0,
        borderWidth: GAME_CONFIG.PIXEL_BORDER_WIDTH ?? 0,
        borderAlpha: GAME_CONFIG.PIXEL_BORDER_ALPHA ?? 0.6,
        borderBrighten: GAME_CONFIG.PIXEL_BORDER_BRIGHTEN ?? 80,
        pattern: GAME_CONFIG.PIXEL_PATTERN ?? 'none',
        patternScale,
        patternRotation: GAME_CONFIG.PIXEL_PATTERN_ROTATION ?? 1,
        boardLeft: padding / resolution,
        boardTop: padding / resolution,
        boardRight: (padding + worldWidth) / resolution,
        boardBottom: (padding + worldHeight) / resolution,
        fadeDistCanvas: padding / resolution,
    });

    // Show cached sprite while worker computes
    if (cachedSprite) {
        cachedSprite.visible = true;
        applyBlur();
    }
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
    if (worker) {
        worker.terminate();
        worker = null;
    }
    workerBusy = false;
}
