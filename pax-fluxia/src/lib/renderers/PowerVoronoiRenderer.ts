// ============================================================================
// PowerVoronoiRenderer — F-138v2: Territory fill via weighted Voronoi (power diagram)
// ============================================================================
//
// FRESH implementation using d3-weighted-voronoi for gap-free territory rendering.
// Star margin is baked into the Voronoi as site weights — no post-processing needed.
//
// Architecture: Edge-graph aware. All boundary edges are shared between adjacent
// territories. Modifications move shared edges, not individual polygon vertices.
//
// Pipeline:
//   0. Build site array (owned stars + corridor virtuals + disconnect virtuals)
//   1. Power diagram via d3-weighted-voronoi (weight = starMargin²)
//   2. Build shared edge graph from cells
//   3. Merge: remove same-owner internal edges
//   4. Arc smoothing on shared edges (future)
//   5. Chaikin smoothing on shared edges (future)
//   6. Trace edges → polygon contours → PIXI render
//
// Performance: Only recomputed when ownership fingerprint changes.
// ============================================================================

import * as PIXI from 'pixi.js';
import { weightedVoronoi } from 'd3-weighted-voronoi';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState, StarConnection } from '$lib/types/game.types';
import { findConnectedClustersOptimized } from './territoryUtils';
import type { ColorUtils } from './RenderContext';
import { log } from '$lib/utils/logger';

// ── Types ──────────────────────────────────────────────────────────────────

/** A site in the power diagram — star or virtual point with weight. */
interface PowerSite {
    x: number;
    y: number;
    weight: number;
    ownerId: string;
    starId: string;
    virtual?: 'corridor' | 'disconnect';
}

/** Polygon output from the power diagram, augmented with ownership info. */
interface TerritoryCell {
    points: [number, number][];
    ownerId: string;
    siteId: string;
}

/** Merged polygon for same-owner territory rendering. */
interface MergedTerritory {
    points: number[][];     // [[x,y], ...] closed polygon
    ownerId: string;
    color: number;          // hex fill color
}

// ── Cache ──────────────────────────────────────────────────────────────────

let cachedFingerprint = '';
let fillGraphics: PIXI.Graphics | null = null;
let borderGraphics: PIXI.Graphics | null = null;

// ── Fingerprint ────────────────────────────────────────────────────────────

function buildFingerprint(stars: StarState[]): string {
    let fp = 'powerV2:';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}|`;
    }
    fp += `${GAME_CONFIG.VORONOI_ALPHA}:${GAME_CONFIG.VORONOI_BORDER_WIDTH}`;
    fp += `:${GAME_CONFIG.VORONOI_BORDER_ALPHA}:${GAME_CONFIG.VORONOI_SATURATION}`;
    fp += `:${GAME_CONFIG.VORONOI_LIGHTNESS}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN}`;
    fp += `:${GAME_CONFIG.TERRITORY_CLUSTER_SPLIT}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}`;
    return fp;
}

// ── Color Helpers ──────────────────────────────────────────────────────────

function hexToRGB(hex: number): [number, number, number] {
    return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

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

function hslToRGB(h: number, s: number, l: number): [number, number, number] {
    h /= 360;
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
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

function adjustColorHSL(hex: number, satMult: number, lightMult: number): number {
    const [r, g, b] = hexToRGB(hex);
    const [h, s, l] = rgbToHSL(r, g, b);
    const [nr, ng, nb] = hslToRGB(
        h,
        Math.min(1, Math.max(0, s * satMult)),
        Math.min(1, Math.max(0, l * lightMult)),
    );
    return (nr << 16) | (ng << 8) | nb;
}

// ── Edge Key Helpers ───────────────────────────────────────────────────────

/** Canonical edge key — direction-independent, snapped to 2dp. */
function edgeKey(x1: number, y1: number, x2: number, y2: number): string {
    const ax = +x1.toFixed(2), ay = +y1.toFixed(2);
    const bx = +x2.toFixed(2), by = +y2.toFixed(2);
    if (ax < bx || (ax === bx && ay < by)) return `${ax},${ay}-${bx},${by}`;
    return `${bx},${by}-${ax},${ay}`;
}

function ptKey(x: number, y: number): string {
    return `${+x.toFixed(2)},${+y.toFixed(2)}`;
}

// ── Cell Merging ───────────────────────────────────────────────────────────

function mergeSameOwnerCells(
    cells: TerritoryCell[],
    clusterSplit: boolean,
    clusterMap: Map<string, number>,
): MergedTerritory[] {
    // Build cluster key per cell
    const clusterKeyOf = (cell: TerritoryCell) => {
        const cIdx = clusterMap.get(cell.siteId) ?? 0;
        return clusterSplit ? `${cell.ownerId}:${cIdx}` : cell.ownerId;
    };

    // Step 1: Count edges, track which cluster(s) share each edge
    const edgeCount = new Map<string, number>();
    const edgeClusters = new Map<string, Set<string>>();

    for (const cell of cells) {
        const ck = clusterKeyOf(cell);
        const pts = cell.points;
        for (let j = 0; j < pts.length - 1; j++) {
            const key = edgeKey(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
            edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
            if (!edgeClusters.has(key)) edgeClusters.set(key, new Set());
            edgeClusters.get(key)!.add(ck);
        }
    }

    // Step 2: Collect external edges per cluster
    type DEdge = { x1: number; y1: number; x2: number; y2: number };
    const clusterEdges = new Map<string, DEdge[]>();
    const clusterColor = new Map<string, number>();

    for (const cell of cells) {
        const ck = clusterKeyOf(cell);
        if (!clusterEdges.has(ck)) clusterEdges.set(ck, []);
        if (!clusterColor.has(ck)) clusterColor.set(ck, 0);

        const pts = cell.points;
        for (let j = 0; j < pts.length - 1; j++) {
            const key = edgeKey(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
            const count = edgeCount.get(key) ?? 0;
            const clusters = edgeClusters.get(key)!;
            // Internal: shared by 2+ cells of the SAME cluster → skip
            if (count >= 2 && clusters.size === 1) continue;
            clusterEdges.get(ck)!.push({
                x1: pts[j][0], y1: pts[j][1],
                x2: pts[j + 1][0], y2: pts[j + 1][1],
            });
        }
    }

    // Step 3: Chain edges into closed polygons
    const result: MergedTerritory[] = [];

    for (const [ck, edges] of clusterEdges) {
        if (edges.length === 0) continue;
        const ownerId = ck.split(':')[0];

        // Bidirectional adjacency
        type IEdge = { x1: number; y1: number; x2: number; y2: number; idx: number };
        const allEdges: IEdge[] = [];
        for (let i = 0; i < edges.length; i++) {
            const e = edges[i];
            allEdges.push({ ...e, idx: i });
            allEdges.push({ x1: e.x2, y1: e.y2, x2: e.x1, y2: e.y1, idx: i });
        }

        const adj = new Map<string, IEdge[]>();
        for (const ie of allEdges) {
            const k = ptKey(ie.x1, ie.y1);
            if (!adj.has(k)) adj.set(k, []);
            adj.get(k)!.push(ie);
        }

        const used = new Set<number>();
        for (let start = 0; start < edges.length; start++) {
            if (used.has(start)) continue;
            const chain: number[][] = [];
            const e0 = edges[start];
            used.add(start);
            chain.push([e0.x1, e0.y1]);
            chain.push([e0.x2, e0.y2]);

            const startPt = ptKey(e0.x1, e0.y1);
            let curEnd = ptKey(e0.x2, e0.y2);
            let safety = edges.length * 2;

            while (curEnd !== startPt && safety-- > 0) {
                const cands = adj.get(curEnd);
                if (!cands) break;
                let found = false;
                for (const c of cands) {
                    if (used.has(c.idx)) continue;
                    used.add(c.idx);
                    curEnd = ptKey(c.x2, c.y2);
                    chain.push([c.x2, c.y2]);
                    found = true;
                    break;
                }
                if (!found) break;
            }

            if (chain.length >= 3) {
                // Ensure closed
                if (chain[0][0] !== chain[chain.length - 1][0] ||
                    chain[0][1] !== chain[chain.length - 1][1]) {
                    chain.push([chain[0][0], chain[0][1]]);
                }
                result.push({ points: chain, ownerId, color: 0 });
            }
        }
    }

    return result;
}

// ── Main Renderer ──────────────────────────────────────────────────────────

export function renderPowerVoronoi(
    stars: StarState[],
    voronoiContainer: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections?: StarConnection[],
): void {
    const fp = buildFingerprint(stars);
    if (fp === cachedFingerprint) return;
    cachedFingerprint = fp;

    const alpha = GAME_CONFIG.VORONOI_ALPHA ?? 0.25;
    const borderWidth = GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 1.5;
    const borderAlpha = GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.4;
    const satMult = GAME_CONFIG.VORONOI_SATURATION ?? 1.0;
    const lightMult = GAME_CONFIG.VORONOI_LIGHTNESS ?? 0.7;
    const starMargin = GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45;

    // ── Stage 0: Build site array ──────────────────────────────────────────
    const ownedStars = stars.filter(s => s.ownerId);
    if (ownedStars.length < 2) return;

    const sites: PowerSite[] = ownedStars.map(s => ({
        x: s.x,
        y: s.y,
        weight: starMargin * starMargin,    // power diagram weight
        ownerId: s.ownerId!,
        starId: s.id,
    }));

    // Corridor virtual sites
    if (GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED && connections) {
        const spacing = GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ?? 60;
        const starMap = new Map(ownedStars.map(s => [s.id, s]));
        for (const conn of connections) {
            const sA = starMap.get(conn.sourceId);
            const sB = starMap.get(conn.targetId);
            if (!sA || !sB || sA.ownerId !== sB.ownerId) continue;

            const dx = sB.x - sA.x, dy = sB.y - sA.y;
            const dist = Math.hypot(dx, dy);
            if (dist < spacing) continue;

            const steps = Math.floor(dist / spacing);
            for (let step = 1; step < steps; step++) {
                const t = step / steps;
                sites.push({
                    x: sA.x + dx * t,
                    y: sA.y + dy * t,
                    weight: starMargin * starMargin * 0.5,  // half-weight for corridors
                    ownerId: sA.ownerId!,
                    starId: `corridor_${conn.sourceId}_${conn.targetId}_${step}`,
                    virtual: 'corridor',
                });
            }
        }
    }

    // TODO Phase 2: Disconnect virtual enemy sites

    // ── Stage 1: Power diagram ─────────────────────────────────────────────
    const pad = 50;
    const clip: [number, number][] = [
        [-pad, -pad],
        [worldWidth + pad, -pad],
        [worldWidth + pad, worldHeight + pad],
        [-pad, worldHeight + pad],
    ];

    const wv = weightedVoronoi()
        .x((d: PowerSite) => d.x)
        .y((d: PowerSite) => d.y)
        .weight((d: PowerSite) => d.weight)
        .clip(clip);

    const polygons = wv(sites);

    // Convert to TerritoryCell array
    const cells: TerritoryCell[] = [];
    for (let i = 0; i < polygons.length; i++) {
        const poly = polygons[i];
        if (!poly || poly.length < 3) continue;
        const site = (poly as any).site?.originalObject as PowerSite | undefined;
        if (!site) continue;

        // Ensure closed polygon
        const pts: [number, number][] = poly.map((p: number[]) => [p[0], p[1]] as [number, number]);
        if (pts.length > 0 && (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1])) {
            pts.push([pts[0][0], pts[0][1]]);
        }

        cells.push({
            points: pts,
            ownerId: site.ownerId,
            siteId: site.starId,
        });
    }

    log.sys('PowerVoronoi', `${cells.length} cells from ${sites.length} sites (${sites.filter(s => s.virtual).length} virtual)`);

    // ── Stage 2: Build cluster map ─────────────────────────────────────────
    const clusterMap = new Map<string, number>();
    if (GAME_CONFIG.TERRITORY_CLUSTER_SPLIT && connections) {
        const starById = new Map(ownedStars.map(s => [s.id, s]));
        const clusters = findConnectedClustersOptimized(ownedStars, connections, starById);
        for (const [starId, info] of clusters) {
            clusterMap.set(starId, info.clusterIdx);
        }
        // Virtual corridor sites inherit source star cluster
        for (const site of sites) {
            if (site.virtual === 'corridor') {
                const sourceId = site.starId.split('_')[1]; // corridor_{sourceId}_{targetId}_{step}
                const srcCluster = clusterMap.get(sourceId);
                if (srcCluster !== undefined) clusterMap.set(site.starId, srcCluster);
            }
        }
    }

    // ── Stage 3: Merge same-owner cells ────────────────────────────────────
    const merged = mergeSameOwnerCells(cells, GAME_CONFIG.TERRITORY_CLUSTER_SPLIT, clusterMap);

    // Assign colors
    for (const territory of merged) {
        const rawColor = colorUtils.getPlayerColor(territory.ownerId);
        territory.color = adjustColorHSL(rawColor, satMult, lightMult);
    }

    log.sys('PowerVoronoi', `Merged to ${merged.length} territories`);

    // ── Stage 4: Render ────────────────────────────────────────────────────
    if (!fillGraphics) {
        fillGraphics = new PIXI.Graphics();
        voronoiContainer.addChild(fillGraphics);
    }
    fillGraphics.clear();

    for (const territory of merged) {
        fillGraphics.poly(territory.points.flat());
        fillGraphics.fill({ color: territory.color, alpha });
    }

    // Borders
    if (borderWidth > 0 && borderAlpha > 0) {
        if (!borderGraphics) {
            borderGraphics = new PIXI.Graphics();
            voronoiContainer.addChild(borderGraphics);
        }
        borderGraphics.clear();

        for (const territory of merged) {
            const [r, g, b] = hexToRGB(territory.color);
            const borderColor = (Math.min(255, r + 40) << 16) |
                (Math.min(255, g + 40) << 8) |
                Math.min(255, b + 40);
            const pts = territory.points;
            if (pts.length > 1) {
                borderGraphics.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i < pts.length; i++) {
                    borderGraphics.lineTo(pts[i][0], pts[i][1]);
                }
                borderGraphics.closePath();
                borderGraphics.stroke({ width: borderWidth, color: borderColor, alpha: borderAlpha });
            }
        }
    } else if (borderGraphics) {
        borderGraphics.clear();
    }
}

// ── Cache Reset ────────────────────────────────────────────────────────────

export function resetPowerVoronoiCache(): void {
    cachedFingerprint = '';
    if (fillGraphics) {
        if (fillGraphics.parent) fillGraphics.parent.removeChild(fillGraphics);
        fillGraphics.destroy();
        fillGraphics = null;
    }
    if (borderGraphics) {
        if (borderGraphics.parent) borderGraphics.parent.removeChild(borderGraphics);
        borderGraphics.destroy();
        borderGraphics = null;
    }
}
