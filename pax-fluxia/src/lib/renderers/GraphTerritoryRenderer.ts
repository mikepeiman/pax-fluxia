// ============================================================================
// GraphTerritoryRenderer — Graph-constrained territory with barrier walls
// ============================================================================
//
// 4th territory render mode. Enemy connection lanes act as HARD BARRIERS
// that territory cannot cross. Uses a Web Worker for zero main-thread blocking.
//
// Key difference from PixelTerritoryRenderer:
//   - Builds "barrier segments" from ALL connections between different-owner stars
//   - Worker tests line-of-sight from each pixel to each star
//   - If a barrier blocks the view, that star can't claim the pixel
//   - Result: territory naturally follows the connection graph topology
// ============================================================================

import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState, StarConnection } from '$lib/types/game.types';
import type { ColorUtils } from './RenderContext';
import GraphWorker from './graphTerritory.worker?worker';

// ── Cache ──
let cachedFingerprint = '';
let cachedSprite: PIXI.Sprite | null = null;
let cachedTexture: PIXI.Texture | null = null;
let cachedBlurFilter: PIXI.BlurFilter | null = null;
let cachedBlurStrength = -1;

// ── Worker state ──
let worker: Worker | null = null;
let workerBusy = false;
let pendingContainer: PIXI.Container | null = null;
let pendingTotalW = 0;
let pendingTotalH = 0;
let pendingPadding = 0;

// ── Helpers ──

function buildFingerprint(stars: StarState[]): string {
    let fp = '';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}:${s.activeShips}|`;
    }
    fp += `:${GAME_CONFIG.GRAPH_ALPHA}:${GAME_CONFIG.GRAPH_RESOLUTION}`;
    fp += `:${GAME_CONFIG.GRAPH_BLUR}:${GAME_CONFIG.GRAPH_PRESSURE}`;
    fp += `:${GAME_CONFIG.GRAPH_BORDER_WIDTH}:${GAME_CONFIG.GRAPH_BORDER_ALPHA}`;
    fp += `:${GAME_CONFIG.GRAPH_BORDER_BRIGHTEN}:${GAME_CONFIG.GRAPH_EDGE_FADE}`;
    fp += `:${GAME_CONFIG.GRAPH_CORRIDOR_BOOST}:${GAME_CONFIG.TERRITORY_GRAPH}`;
    fp += `:${GAME_CONFIG.GRAPH_SATURATION}:${GAME_CONFIG.GRAPH_LIGHTNESS}`;
    fp += `:${GAME_CONFIG.GRAPH_PATTERN}:${GAME_CONFIG.GRAPH_PATTERN_SCALE}:${GAME_CONFIG.GRAPH_PATTERN_ROTATION}`;
    fp += `:${GAME_CONFIG.GRAPH_BARRIER_EXTENT}`;
    return fp;
}

function hexToRGB(hex: number): [number, number, number] {
    return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

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

function hslToRGB(h: number, s: number, l: number): [number, number, number] {
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    function hue2rgb(p: number, q: number, t: number): number {
        if (t < 0) t += 1; if (t > 1) t -= 1;
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

// ── Worker result handler ──

function handleWorkerResult(e: MessageEvent): void {
    const { pixels: pixelBuf, canvasW, canvasH } = e.data;
    const pixelData = new Uint8ClampedArray(pixelBuf);
    workerBusy = false;

    const container = pendingContainer;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;
    const imageData = new ImageData(pixelData, canvasW, canvasH);
    ctx.putImageData(imageData, 0, 0);

    if (cachedTexture) cachedTexture.destroy(true);
    cachedTexture = PIXI.Texture.from(canvas);
    cachedTexture.source.scaleMode = 'linear';

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

// ── Main Renderer ──

export function renderGraphTerritory(
    stars: StarState[],
    container: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections?: StarConnection[],
): void {
    if (!GAME_CONFIG.TERRITORY_GRAPH) {
        if (cachedSprite) cachedSprite.visible = false;
        return;
    }

    const fingerprint = buildFingerprint(stars);
    if (fingerprint === cachedFingerprint && cachedSprite) {
        cachedSprite.visible = true;
        applyBlur();
        return;
    }
    if (workerBusy) {
        if (cachedSprite) { cachedSprite.visible = true; applyBlur(); }
        return;
    }

    cachedFingerprint = fingerprint;

    const ownedStars = stars.filter(s => s.ownerId);
    if (ownedStars.length === 0) {
        if (cachedSprite) cachedSprite.visible = false;
        return;
    }

    // Config
    const resolution = GAME_CONFIG.GRAPH_RESOLUTION ?? 4;
    const edgeFadePx = GAME_CONFIG.GRAPH_EDGE_FADE ?? 200;
    const padding = edgeFadePx;
    const totalW = worldWidth + padding * 2;
    const totalH = worldHeight + padding * 2;
    const canvasW = Math.ceil(totalW / resolution);
    const canvasH = Math.ceil(totalH / resolution);
    const satMult = GAME_CONFIG.GRAPH_SATURATION ?? 1.0;
    const lightMult = GAME_CONFIG.GRAPH_LIGHTNESS ?? 1.0;
    const useHSL = satMult !== 1.0 || lightMult !== 1.0;
    const patternScale = Math.max(1, Math.round((GAME_CONFIG.GRAPH_PATTERN_SCALE ?? 4) / resolution));
    const barrierExtent = GAME_CONFIG.GRAPH_BARRIER_EXTENT ?? 1.5;

    // Build owner data
    const ownerSet = new Set<string>();
    for (const s of ownedStars) ownerSet.add(s.ownerId!);
    const owners = Array.from(ownerSet);
    const ownerIndexMap = new Map<string, number>();
    for (let i = 0; i < owners.length; i++) ownerIndexMap.set(owners[i], i);

    const ownerRGBFlat: number[] = new Array(owners.length * 3);
    const starDataForWorker: { x: number; y: number; r: number; g: number; b: number; ownerIdx: number; ships: number }[] = [];

    for (const s of ownedStars) {
        const rawRgb = hexToRGB(colorUtils.getPlayerColor(s.ownerId!));
        let rgb: [number, number, number];
        if (useHSL) {
            const [h, sat, l] = rgbToHSL(rawRgb[0], rawRgb[1], rawRgb[2]);
            rgb = hslToRGB(h, Math.min(1, sat * satMult), Math.min(1, l * lightMult));
        } else {
            rgb = rawRgb;
        }

        const oi = ownerIndexMap.get(s.ownerId!)!;
        if (ownerRGBFlat[oi * 3] === undefined) {
            ownerRGBFlat[oi * 3] = rgb[0];
            ownerRGBFlat[oi * 3 + 1] = rgb[1];
            ownerRGBFlat[oi * 3 + 2] = rgb[2];
        }

        starDataForWorker.push({
            x: (s.x + padding) / resolution,
            y: (s.y + padding) / resolution,
            r: rgb[0], g: rgb[1], b: rgb[2],
            ownerIdx: oi,
            ships: (s.activeShips ?? 0) + (s.damagedShips ?? 0),
        });
    }

    // ── Build barrier segments from enemy connections ──
    const barriers: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const corridorBoost = GAME_CONFIG.GRAPH_CORRIDOR_BOOST ?? 0;
    const corridorSegs: { x1: number; y1: number; x2: number; y2: number; ownerIdx: number; halfW: number }[] = [];

    if (connections) {
        const starById = new Map<string, StarState>();
        for (const s of ownedStars) starById.set(s.id, s);

        for (const conn of connections) {
            const a = starById.get(conn.sourceId);
            const b = starById.get(conn.targetId);
            if (!a || !b || !a.ownerId || !b.ownerId) continue;

            if (a.ownerId !== b.ownerId) {
                // ── Enemy connection → barrier segment ──
                // Extend the barrier perpendicular and beyond the endpoints
                // so it acts as a proper wall
                const ax = (a.x + padding) / resolution;
                const ay = (a.y + padding) / resolution;
                const bx = (b.x + padding) / resolution;
                const by = (b.y + padding) / resolution;

                // The barrier is the connection line itself, extended by barrierExtent
                const dx = bx - ax;
                const dy = by - ay;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const ext = len * (barrierExtent - 1) * 0.5;
                const nx = dx / len;
                const ny = dy / len;

                barriers.push({
                    x1: ax - nx * ext,
                    y1: ay - ny * ext,
                    x2: bx + nx * ext,
                    y2: by + ny * ext,
                });
            } else {
                // ── Same-owner connection → corridor capsule ──
                if (corridorBoost > 0) {
                    const oi = ownerIndexMap.get(a.ownerId);
                    if (oi === undefined) continue;
                    const x1 = (a.x + padding) / resolution;
                    const y1 = (a.y + padding) / resolution;
                    const x2 = (b.x + padding) / resolution;
                    const y2 = (b.y + padding) / resolution;
                    const linkDist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                    const halfW = Math.max(2, Math.min(30 / resolution, linkDist * 0.12 * corridorBoost));
                    corridorSegs.push({ x1, y1, x2, y2, ownerIdx: oi, halfW });
                }
            }
        }
    }

    // Initialize worker
    if (!worker) {
        worker = new GraphWorker();
        worker.onmessage = handleWorkerResult;
    }

    pendingContainer = container;
    pendingTotalW = totalW;
    pendingTotalH = totalH;
    pendingPadding = padding;
    workerBusy = true;

    worker.postMessage({
        canvasW, canvasH,
        stars: starDataForWorker,
        numOwners: owners.length,
        ownerRGB: ownerRGBFlat,
        alpha: GAME_CONFIG.GRAPH_ALPHA ?? 0.15,
        barriers,
        corridorSegs,
        pressure: GAME_CONFIG.GRAPH_PRESSURE ?? 0,
        borderWidth: GAME_CONFIG.GRAPH_BORDER_WIDTH ?? 1,
        borderAlpha: GAME_CONFIG.GRAPH_BORDER_ALPHA ?? 0.6,
        borderBrighten: GAME_CONFIG.GRAPH_BORDER_BRIGHTEN ?? 80,
        pattern: GAME_CONFIG.GRAPH_PATTERN ?? 'none',
        patternScale,
        patternRotation: GAME_CONFIG.GRAPH_PATTERN_ROTATION ?? 1,
        boardLeft: padding / resolution,
        boardTop: padding / resolution,
        boardRight: (padding + worldWidth) / resolution,
        boardBottom: (padding + worldHeight) / resolution,
        fadeDistCanvas: padding / resolution,
    });

    if (cachedSprite) { cachedSprite.visible = true; applyBlur(); }
}

// ── Blur ──

function applyBlur(): void {
    if (!cachedSprite) return;
    const blur = GAME_CONFIG.GRAPH_BLUR ?? 0;
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

// ── Cache Reset ──

export function resetGraphTerritoryCache(): void {
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
