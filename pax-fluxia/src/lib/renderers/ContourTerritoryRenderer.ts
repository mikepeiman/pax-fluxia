// ============================================================================
// ContourTerritoryRenderer — Vector contour territory via PIXI.Graphics
// ============================================================================
// Unlike raster-based renderers (Pixel, Lane, Metaball) that produce sprites,
// this renderer draws vector polygons using PIXI.Graphics. The worker extracts
// ownership boundaries using marching squares and returns polygon arrays.
// Benefits: resolution-independent, lightweight, proper border styling.
// ============================================================================

import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState, StarConnection } from '$lib/types/game.types';
import { findConnectedClustersOptimized } from './territoryUtils';
import type { ColorUtils } from './RenderContext';
import ContourWorker from './contourTerritory.worker?worker';

// ── Cache ──
let cachedFingerprint = '';
let cachedGraphics: PIXI.Graphics | null = null;

// ── Worker state ──
let worker: Worker | null = null;
let workerBusy = false;
let pendingContainer: PIXI.Container | null = null;
let pendingColorUtils: ColorUtils | null = null;

// ── Helpers ──

function buildFingerprint(stars: StarState[]): string {
    let fp = '';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}|`;
    }
    fp += `:${GAME_CONFIG.CONTOUR_RESOLUTION}:${GAME_CONFIG.CONTOUR_SIMPLIFY}`;
    fp += `:${GAME_CONFIG.CONTOUR_SMOOTH}:${GAME_CONFIG.CONTOUR_FILL_ALPHA}`;
    fp += `:${GAME_CONFIG.CONTOUR_BORDER_WIDTH}:${GAME_CONFIG.CONTOUR_BORDER_ALPHA}`;
    fp += `:${GAME_CONFIG.CONTOUR_BORDER_BRIGHTEN}:${GAME_CONFIG.TERRITORY_CONTOUR}`;
    fp += `:${GAME_CONFIG.CONTOUR_SATURATION}:${GAME_CONFIG.CONTOUR_LIGHTNESS}`;
    fp += `:${GAME_CONFIG.TERRITORY_CLUSTER_SPLIT}`;
    fp += `:${GAME_CONFIG.CONTOUR_CORNER_RADIUS}:${GAME_CONFIG.CONTOUR_CORNER_THRESHOLD}`;
    fp += `:${GAME_CONFIG.CONTOUR_PERIPHERY_STRENGTH}:${GAME_CONFIG.CONTOUR_PERIPHERY_INSET}`;
    fp += `:${GAME_CONFIG.CONTOUR_JUNCTION_CORRECTION}`;
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
    const { polygons, numOwners, ownerRGB } = e.data;
    workerBusy = false;

    const container = pendingContainer;
    if (!container) return;

    // Create or reuse graphics
    if (!cachedGraphics) {
        cachedGraphics = new PIXI.Graphics();
        container.addChild(cachedGraphics);
    } else {
        cachedGraphics.clear();
        if (!cachedGraphics.parent) container.addChild(cachedGraphics);
    }

    const fillAlpha = GAME_CONFIG.CONTOUR_FILL_ALPHA;
    const borderWidth = GAME_CONFIG.CONTOUR_BORDER_WIDTH;
    const borderAlpha = GAME_CONFIG.CONTOUR_BORDER_ALPHA;
    const borderBrighten = GAME_CONFIG.CONTOUR_BORDER_BRIGHTEN;

    for (const poly of polygons) {
        const { ownerIdx, fillPoints } = poly;
        if (fillPoints.length < 6) continue; // Need at least 3 points

        const r = ownerRGB[ownerIdx * 3] ?? 128;
        const g = ownerRGB[ownerIdx * 3 + 1] ?? 128;
        const b = ownerRGB[ownerIdx * 3 + 2] ?? 128;
        const fillColor = (r << 16) | (g << 8) | b;

        // Draw filled polygon
        const path: PIXI.PointData[] = [];
        for (let i = 0; i < fillPoints.length; i += 2) {
            path.push({ x: fillPoints[i], y: fillPoints[i + 1] });
        }

        cachedGraphics.poly(path, true);
        cachedGraphics.fill({ color: fillColor, alpha: fillAlpha });

        // Draw border
        if (borderWidth > 0) {
            const br = Math.min(255, r + borderBrighten);
            const bg = Math.min(255, g + borderBrighten);
            const bb = Math.min(255, b + borderBrighten);
            const borderColor = (br << 16) | (bg << 8) | bb;

            cachedGraphics.poly(path, true);
            cachedGraphics.stroke({ width: borderWidth, color: borderColor, alpha: borderAlpha });
        }
    }

    cachedGraphics.visible = true;
}

// ── Main Renderer ──

export function renderContourTerritory(
    stars: StarState[],
    container: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections?: StarConnection[],
): void {
    if (!GAME_CONFIG.TERRITORY_CONTOUR) {
        if (cachedGraphics) cachedGraphics.visible = false;
        return;
    }

    const fingerprint = buildFingerprint(stars) + `:${worldWidth}:${worldHeight}`;

    if (fingerprint === cachedFingerprint && cachedGraphics) {
        cachedGraphics.visible = true;
        return;
    }

    if (workerBusy) {
        if (cachedGraphics) cachedGraphics.visible = true;
        return;
    }

    cachedFingerprint = fingerprint;

    const ownedStars = stars.filter(s => s.ownerId);
    if (ownedStars.length === 0) {
        if (cachedGraphics) cachedGraphics.visible = false;
        return;
    }

    // Build clusters
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

    // Build color array and star data
    const satMult = GAME_CONFIG.CONTOUR_SATURATION ?? 1.0;
    const lightMult = GAME_CONFIG.CONTOUR_LIGHTNESS ?? 1.0;
    const useHSL = satMult !== 1.0 || lightMult !== 1.0;

    const ownerRGBFlat: number[] = new Array(numClusters * 3);
    const starDataForWorker: { x: number; y: number; ownerIdx: number; id: string }[] = [];

    for (const s of ownedStars) {
        const rawRgb = hexToRGB(colorUtils.getPlayerColor(s.ownerId!));
        let rgb: [number, number, number];
        if (useHSL) {
            const [h, sat, l] = rgbToHSL(rawRgb[0], rawRgb[1], rawRgb[2]);
            rgb = hslToRGB(h, Math.min(1, sat * satMult), Math.min(1, l * lightMult));
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
            x: s.x,
            y: s.y,
            ownerIdx: ci,
            id: s.id,
        });
    }

    // Build connection data for worker
    const connectionData: { fromId: string; toId: string }[] = [];
    if (connections) {
        for (const c of connections) {
            connectionData.push({ fromId: c.sourceId, toId: c.targetId });
        }
    }

    // Initialize worker
    if (!worker) {
        worker = new ContourWorker();
        worker.onmessage = handleWorkerResult;
    }

    pendingContainer = container;
    pendingColorUtils = colorUtils;
    workerBusy = true;

    const gridRes = GAME_CONFIG.CONTOUR_RESOLUTION ?? 128;

    worker.postMessage({
        gridW: gridRes,
        gridH: Math.round(gridRes * (worldHeight / worldWidth)),
        worldW: worldWidth,
        worldH: worldHeight,
        stars: starDataForWorker,
        connections: connectionData,
        numOwners: numClusters,
        ownerRGB: ownerRGBFlat,
        simplify: GAME_CONFIG.CONTOUR_SIMPLIFY ?? 5,
        smooth: GAME_CONFIG.CONTOUR_SMOOTH ?? 2,
        cornerRadius: GAME_CONFIG.CONTOUR_CORNER_RADIUS ?? 0,
        cornerThreshold: GAME_CONFIG.CONTOUR_CORNER_THRESHOLD ?? 120,
        peripheryStrength: GAME_CONFIG.CONTOUR_PERIPHERY_STRENGTH ?? 0,
        peripheryInset: GAME_CONFIG.CONTOUR_PERIPHERY_INSET ?? 0,
        junctionCorrection: GAME_CONFIG.CONTOUR_JUNCTION_CORRECTION ?? 0.5,
    });

    if (cachedGraphics) cachedGraphics.visible = true;
}

// ── Cache Reset ──

export function resetContourTerritoryCache(): void {
    cachedFingerprint = '';
    if (cachedGraphics) {
        if (cachedGraphics.parent) cachedGraphics.parent.removeChild(cachedGraphics);
        cachedGraphics.destroy();
        cachedGraphics = null;
    }
    if (worker) {
        worker.terminate();
        worker = null;
    }
    workerBusy = false;
}
