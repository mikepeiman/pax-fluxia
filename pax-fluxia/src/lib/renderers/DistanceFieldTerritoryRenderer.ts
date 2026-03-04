// ============================================================================
// DistanceFieldTerritoryRenderer — Graph-metric distance field territory
// ============================================================================
//
// Computes multi-source Dijkstra on the star/lane graph for per-player
// distances. Rasterizes territory via lane projection into a texture with
// thick blended borders.
//
// Animation: lerp per-star distances between old and new states →
// re-rasterize per frame → border contour physically slides.
//
// No worker needed — Dijkstra for ~42 stars is microseconds.
// Rasterization at ~100K cells is <5ms.
// ============================================================================

import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState, StarConnection } from '$lib/types/game.types';
import type { ColorUtils } from './RenderContext';

// ── Types ──────────────────────────────────────────────────────────────────

interface LaneData {
    ax: number; ay: number;
    bx: number; by: number;
    len: number;
    starAIdx: number;
    starBIdx: number;
}

// ── State ──────────────────────────────────────────────────────────────────

let cachedOwnerFp = '';
let cachedConfigFp = '';
let cachedSprite: PIXI.Sprite | null = null;
let cachedTexture: PIXI.Texture | null = null;
let cachedBlurFilter: PIXI.BlurFilter | null = null;
let cachedBlurStrength = -1;

// Distance field: distToPlayer[starIdx][playerIdx] = graph distance
let currentDist: number[][] | null = null;
let prevDist: number[][] | null = null;
let currentPlayerIds: string[] = [];
let transitionStart = 0;
let isTransitioning = false;

// Lane index (rebuilt when connections change)
let laneArray: LaneData[] = [];
let laneCells: Map<string, number[]> = new Map();
let laneCellSize = 50;
let cachedConnFp = '';

// Reusable canvas for rasterization
let rasterCanvas: HTMLCanvasElement | null = null;

// ============================================================================
// Multi-Source Dijkstra — per-player distances
// ============================================================================
// Returns distToPlayer[starIdx][playerIdx] = shortest graph distance
// from star to nearest star owned by that player.

function computeDistToPlayer(
    stars: StarState[],
    connections: StarConnection[],
    playerIds: string[],
    metric: 'hops' | 'length',
): number[][] {
    const nStars = stars.length;
    const nPlayers = playerIds.length;
    const playerIdx = new Map<string, number>();
    for (let i = 0; i < nPlayers; i++) playerIdx.set(playerIds[i], i);

    // Build adjacency
    const starIdx = new Map<string, number>();
    for (let i = 0; i < nStars; i++) starIdx.set(stars[i].id, i);

    const adj: { neighbor: number; cost: number }[][] = new Array(nStars);
    for (let i = 0; i < nStars; i++) adj[i] = [];

    for (const conn of connections) {
        const a = starIdx.get(conn.sourceId);
        const b = starIdx.get(conn.targetId);
        if (a === undefined || b === undefined) continue;
        const cost = metric === 'hops' ? 1 : (conn.distance || 1);
        adj[a].push({ neighbor: b, cost });
        adj[b].push({ neighbor: a, cost });
    }

    // Initialize distances
    const dist: number[][] = new Array(nStars);
    for (let s = 0; s < nStars; s++) {
        dist[s] = new Array(nPlayers).fill(Infinity);
    }

    // Priority queue: [distance, starIdx, playerIdx]
    // Simple array — for 42 stars × 5 players = 210 seeds, this is fine
    const pq: [number, number, number][] = [];

    // Seed: each owned star has distance 0 to its own player
    for (let s = 0; s < nStars; s++) {
        const ownerId = stars[s].ownerId;
        if (!ownerId) continue;
        const pi = playerIdx.get(ownerId);
        if (pi === undefined) continue;
        dist[s][pi] = 0;
        pq.push([0, s, pi]);
    }

    pq.sort((a, b) => a[0] - b[0]);

    while (pq.length > 0) {
        const [d, si, pi] = pq.shift()!;

        // Skip if we already found a shorter path
        if (d > dist[si][pi]) continue;

        // Expand neighbors
        for (const { neighbor, cost } of adj[si]) {
            const nd = d + cost;
            if (nd < dist[neighbor][pi]) {
                dist[neighbor][pi] = nd;
                // Insert sorted (binary search would be faster but not needed at this scale)
                let inserted = false;
                for (let i = 0; i < pq.length; i++) {
                    if (nd < pq[i][0]) {
                        pq.splice(i, 0, [nd, neighbor, pi]);
                        inserted = true;
                        break;
                    }
                }
                if (!inserted) pq.push([nd, neighbor, pi]);
            }
        }
    }

    return dist;
}

// ============================================================================
// Lane Spatial Index
// ============================================================================

function buildLaneIndex(
    stars: StarState[],
    connections: StarConnection[],
): void {
    const starIdx = new Map<string, number>();
    for (let i = 0; i < stars.length; i++) starIdx.set(stars[i].id, i);

    laneArray = [];
    for (const conn of connections) {
        const ai = starIdx.get(conn.sourceId);
        const bi = starIdx.get(conn.targetId);
        if (ai === undefined || bi === undefined) continue;
        const ax = stars[ai].x, ay = stars[ai].y;
        const bx = stars[bi].x, by = stars[bi].y;
        const len = Math.hypot(bx - ax, by - ay);
        laneArray.push({ ax, ay, bx, by, len, starAIdx: ai, starBIdx: bi });
    }

    // Cell size: average lane length / 2, clamped
    const avgLen = laneArray.reduce((s, l) => s + l.len, 0) / Math.max(1, laneArray.length);
    laneCellSize = Math.max(50, Math.min(200, avgLen / 2));

    // Build spatial grid
    laneCells = new Map();
    for (let li = 0; li < laneArray.length; li++) {
        const l = laneArray[li];
        const cx0 = Math.floor(Math.min(l.ax, l.bx) / laneCellSize);
        const cx1 = Math.floor(Math.max(l.ax, l.bx) / laneCellSize);
        const cy0 = Math.floor(Math.min(l.ay, l.by) / laneCellSize);
        const cy1 = Math.floor(Math.max(l.ay, l.by) / laneCellSize);
        for (let cx = cx0; cx <= cx1; cx++) {
            for (let cy = cy0; cy <= cy1; cy++) {
                const key = `${cx},${cy}`;
                if (!laneCells.has(key)) laneCells.set(key, []);
                laneCells.get(key)!.push(li);
            }
        }
    }
}

// ============================================================================
// Rasterization
// ============================================================================

function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

function projectOntoSegment(
    px: number, py: number,
    ax: number, ay: number, bx: number, by: number,
): { t: number; dist: number } {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { t: 0, dist: Math.hypot(px - ax, py - ay) };
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    return { t, dist: Math.hypot(px - cx, py - cy) };
}

function rasterize(
    stars: StarState[],
    distToPlayer: number[][],
    playerIds: string[],
    colorUtils: ColorUtils,
    worldWidth: number, worldHeight: number,
    resolution: number, alpha: number,
    borderWidth: number, borderSoftness: number,
    borderAlpha: number, borderBrighten: number,
    hueShift: number, satMult: number, lightMult: number,
    padding: number, rounding: number,
): HTMLCanvasElement {
    const totalW = worldWidth + padding * 2;
    const totalH = worldHeight + padding * 2;
    const canvasW = Math.ceil(totalW / resolution);
    const canvasH = Math.ceil(totalH / resolution);
    const totalPixels = canvasW * canvasH;

    if (!rasterCanvas) rasterCanvas = document.createElement('canvas');
    rasterCanvas.width = canvasW;
    rasterCanvas.height = canvasH;
    const ctx = rasterCanvas.getContext('2d')!;
    const imageData = ctx.createImageData(canvasW, canvasH);
    const pixels = imageData.data;

    const nPlayers = playerIds.length;

    // Precompute player colors (with HSLA adjustment)
    const playerColors: [number, number, number][] = [];
    for (const pid of playerIds) {
        const hex = colorUtils.getPlayerColor(pid);
        let r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff;
        const rn = r / 255, gn = g / 255, bn = b / 255;
        const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
            else if (max === gn) h = ((bn - rn) / d + 2) / 6;
            else h = ((rn - gn) / d + 4) / 6;
        }
        h = ((h + hueShift / 360) % 1 + 1) % 1;
        s = Math.min(1, s * satMult);
        l = Math.min(1, l * lightMult);
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
        g = Math.round(hue2rgb(p, q, h) * 255);
        b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
        playerColors.push([r, g, b]);
    }

    // ================================================================
    // PASS 1: Compute per-pixel ownership
    // ================================================================
    const ownerGrid = new Int8Array(totalPixels).fill(-1);
    const fadeGrid = new Float32Array(totalPixels);

    for (let py = 0; py < canvasH; py++) {
        for (let px = 0; px < canvasW; px++) {
            const worldX = px * resolution - padding;
            const worldY = py * resolution - padding;

            // Edge fade
            const edgeDist = Math.min(worldX, worldY, worldWidth - worldX, worldHeight - worldY);
            if (edgeDist < 0) continue;
            const fade = edgeDist < padding ? edgeDist / padding : 1;
            if (fade <= 0) continue;

            const gi = py * canvasW + px;
            fadeGrid[gi] = fade;

            // Find nearest lane via spatial index
            const cx = Math.floor(worldX / laneCellSize);
            const cy = Math.floor(worldY / laneCellSize);
            let bestLaneIdx = -1, bestLaneDist = Infinity, bestT = 0;

            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const cell = laneCells.get(`${cx + dx},${cy + dy}`);
                    if (!cell) continue;
                    for (const li of cell) {
                        const lane = laneArray[li];
                        const proj = projectOntoSegment(worldX, worldY, lane.ax, lane.ay, lane.bx, lane.by);
                        if (proj.dist < bestLaneDist) {
                            bestLaneDist = proj.dist;
                            bestLaneIdx = li;
                            bestT = proj.t;
                        }
                    }
                }
            }

            // Compute per-player graph distance at this pixel
            let bestPlayer = -1, bestD = Infinity;

            if (bestLaneIdx >= 0) {
                const lane = laneArray[bestLaneIdx];
                const tL = bestT;
                for (let pi = 0; pi < nPlayers; pi++) {
                    const da = distToPlayer[lane.starAIdx][pi] + tL * lane.len;
                    const db = distToPlayer[lane.starBIdx][pi] + (1 - tL) * lane.len;
                    const d = Math.min(da, db);
                    if (d < bestD) {
                        bestD = d; bestPlayer = pi;
                    }
                }
            } else {
                let nearestStar = 0, nearDist = Infinity;
                for (let si = 0; si < stars.length; si++) {
                    const d = Math.hypot(worldX - stars[si].x, worldY - stars[si].y);
                    if (d < nearDist) { nearDist = d; nearestStar = si; }
                }
                for (let pi = 0; pi < nPlayers; pi++) {
                    const d = distToPlayer[nearestStar][pi] + nearDist;
                    if (d < bestD) {
                        bestD = d; bestPlayer = pi;
                    }
                }
            }

            ownerGrid[gi] = bestPlayer;
        }
    }

    // ================================================================
    // PASS 2: Morphological smoothing (majority-vote mode filter)
    // Each pass: for every pixel, if the majority of its 3×3 neighbors
    // belong to a different player, change this pixel's owner.
    // This rounds sharp corners and removes thin jutting triangles.
    // ================================================================
    if (rounding > 0) {
        const temp = new Int8Array(totalPixels);
        const counts = new Uint8Array(nPlayers);
        for (let pass = 0; pass < rounding; pass++) {
            temp.set(ownerGrid);
            for (let py = 1; py < canvasH - 1; py++) {
                const rowStart = py * canvasW;
                for (let px = 1; px < canvasW - 1; px++) {
                    const gi = rowStart + px;
                    const current = temp[gi];
                    if (current < 0) continue;

                    // Count 3×3 neighborhood owners
                    counts.fill(0);
                    const above = gi - canvasW;
                    const below = gi + canvasW;
                    let o: number;
                    o = temp[above - 1]; if (o >= 0) counts[o]++;
                    o = temp[above]; if (o >= 0) counts[o]++;
                    o = temp[above + 1]; if (o >= 0) counts[o]++;
                    o = temp[gi - 1]; if (o >= 0) counts[o]++;
                    counts[current]++;   // center pixel
                    o = temp[gi + 1]; if (o >= 0) counts[o]++;
                    o = temp[below - 1]; if (o >= 0) counts[o]++;
                    o = temp[below]; if (o >= 0) counts[o]++;
                    o = temp[below + 1]; if (o >= 0) counts[o]++;

                    // Find majority owner
                    let bestOwner = current;
                    let bestCount = counts[current];
                    for (let i = 0; i < nPlayers; i++) {
                        if (counts[i] > bestCount) {
                            bestCount = counts[i];
                            bestOwner = i;
                        }
                    }
                    ownerGrid[gi] = bestOwner;
                }
            }
        }
    }

    // ================================================================
    // PASS 3: Border distance via fast 2-pass Chamfer distance transform
    // O(2N) total — each pixel touched exactly twice regardless of border width.
    // Stores: borderDist[gi] = distance to nearest different-owner pixel (in grid px)
    //         borderNeighbor[gi] = owner of that nearest different-owner pixel
    // ================================================================
    const borderDistGrid = new Float32Array(totalPixels).fill(9999);
    const borderNeighborGrid = new Int8Array(totalPixels).fill(-1);
    const bwGrid = borderWidth / resolution;
    const bsGrid = borderSoftness / resolution;
    const maxBorderGrid = bwGrid + bsGrid + 2;

    if (borderWidth > 0 && borderAlpha > 0) {
        // Seed: mark pixels adjacent to a different-owner pixel as distance 0
        for (let py = 1; py < canvasH - 1; py++) {
            for (let px = 1; px < canvasW - 1; px++) {
                const gi = py * canvasW + px;
                const owner = ownerGrid[gi];
                if (owner < 0) continue;
                // Check 4-connected neighbors for different owner
                const above = ownerGrid[gi - canvasW];
                const below = ownerGrid[gi + canvasW];
                const left = ownerGrid[gi - 1];
                const right = ownerGrid[gi + 1];
                if ((above >= 0 && above !== owner) ||
                    (below >= 0 && below !== owner) ||
                    (left >= 0 && left !== owner) ||
                    (right >= 0 && right !== owner)) {
                    borderDistGrid[gi] = 0;
                    // Pick the different neighbor for color blending
                    if (above >= 0 && above !== owner) borderNeighborGrid[gi] = above;
                    else if (below >= 0 && below !== owner) borderNeighborGrid[gi] = below;
                    else if (left >= 0 && left !== owner) borderNeighborGrid[gi] = left;
                    else borderNeighborGrid[gi] = right;
                }
            }
        }

        // Forward pass (top-left to bottom-right)
        for (let py = 1; py < canvasH; py++) {
            for (let px = 1; px < canvasW; px++) {
                const gi = py * canvasW + px;
                if (borderDistGrid[gi] > maxBorderGrid) {
                    // Check top and left neighbors
                    const above = gi - canvasW;
                    const left = gi - 1;
                    if (borderDistGrid[above] + 1 < borderDistGrid[gi]) {
                        borderDistGrid[gi] = borderDistGrid[above] + 1;
                        borderNeighborGrid[gi] = borderNeighborGrid[above];
                    }
                    if (borderDistGrid[left] + 1 < borderDistGrid[gi]) {
                        borderDistGrid[gi] = borderDistGrid[left] + 1;
                        borderNeighborGrid[gi] = borderNeighborGrid[left];
                    }
                }
            }
        }

        // Backward pass (bottom-right to top-left)
        for (let py = canvasH - 2; py >= 0; py--) {
            for (let px = canvasW - 2; px >= 0; px--) {
                const gi = py * canvasW + px;
                if (borderDistGrid[gi] > 0) {
                    const below = gi + canvasW;
                    const right = gi + 1;
                    if (borderDistGrid[below] + 1 < borderDistGrid[gi]) {
                        borderDistGrid[gi] = borderDistGrid[below] + 1;
                        borderNeighborGrid[gi] = borderNeighborGrid[below];
                    }
                    if (borderDistGrid[right] + 1 < borderDistGrid[gi]) {
                        borderDistGrid[gi] = borderDistGrid[right] + 1;
                        borderNeighborGrid[gi] = borderNeighborGrid[right];
                    }
                }
            }
        }
    }

    // ================================================================
    // PASS 4: Colorize from smoothed ownership + distance-based borders
    // ================================================================
    for (let py = 0; py < canvasH; py++) {
        for (let px = 0; px < canvasW; px++) {
            const gi = py * canvasW + px;
            const owner = ownerGrid[gi];
            if (owner < 0) continue;
            const fade = fadeGrid[gi];
            if (fade <= 0) continue;

            const [cr, cg, cb] = playerColors[owner];
            let fr = cr, fg = cg, fb = cb;
            let borderMask = 0;

            // Border blending from distance transform
            const bDist = borderDistGrid[gi];
            const bNeighbor = borderNeighborGrid[gi];
            if (bNeighbor >= 0 && bDist < bwGrid + bsGrid) {
                borderMask = smoothstep(bwGrid + bsGrid, 0, bDist) * borderAlpha;
                if (borderMask > 0) {
                    const [sr, sg, sb] = playerColors[bNeighbor];
                    const brt = borderBrighten;
                    const br = (Math.min(255, cr + brt) + Math.min(255, sr + brt)) / 2;
                    const bg = (Math.min(255, cg + brt) + Math.min(255, sg + brt)) / 2;
                    const bb = (Math.min(255, cb + brt) + Math.min(255, sb + brt)) / 2;
                    fr = Math.round(cr + (br - cr) * borderMask);
                    fg = Math.round(cg + (bg - cg) * borderMask);
                    fb = Math.round(cb + (bb - cb) * borderMask);
                }
            }

            const pixelAlpha = Math.min(1, alpha + borderMask * (1 - alpha));
            const idx = gi * 4;
            pixels[idx] = fr;
            pixels[idx + 1] = fg;
            pixels[idx + 2] = fb;
            pixels[idx + 3] = Math.round(pixelAlpha * fade * 255);
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return rasterCanvas;
}

// ============================================================================
// Lerp utility for distance arrays
// ============================================================================

function lerpDistArrays(
    prev: number[][], curr: number[][], t: number
): number[][] {
    const nStars = prev.length;
    const nPlayers = prev[0].length;
    const result: number[][] = new Array(nStars);
    for (let s = 0; s < nStars; s++) {
        result[s] = new Array(nPlayers);
        for (let p = 0; p < nPlayers; p++) {
            const a = prev[s][p], b = curr[s][p];
            // Handle Infinity: if either is Infinity, ease toward the finite one
            if (a === Infinity && b === Infinity) {
                result[s][p] = Infinity;
            } else if (a === Infinity) {
                // Player didn't exist before — ease in with a large penalty
                result[s][p] = b + (1 - t) * 1000;
            } else if (b === Infinity) {
                // Player lost all stars — ease out
                result[s][p] = a + t * 1000;
            } else {
                result[s][p] = a + (b - a) * t;
            }
        }
    }
    return result;
}

// ============================================================================
// Fingerprints
// ============================================================================

function buildOwnerFp(stars: StarState[]): string {
    let fp = '';
    for (const s of stars) fp += `${s.id}:${s.ownerId ?? ''}|`;
    return fp;
}

function buildConfigFp(): string {
    return `${GAME_CONFIG.DF_RESOLUTION}:${GAME_CONFIG.DF_ALPHA}:${GAME_CONFIG.DF_BORDER_WIDTH}:`
        + `${GAME_CONFIG.DF_BORDER_SOFTNESS}:${GAME_CONFIG.DF_BORDER_ALPHA}:${GAME_CONFIG.DF_BORDER_BRIGHTEN}:`
        + `${GAME_CONFIG.DF_BLUR}:${GAME_CONFIG.DF_HUE}:${GAME_CONFIG.DF_ROUNDING}:`
        + `${GAME_CONFIG.DF_SATURATION}:${GAME_CONFIG.DF_LIGHTNESS}:`
        + `${GAME_CONFIG.DF_DISTANCE_METRIC}:${GAME_CONFIG.TERRITORY_TRANSITION_MS}:${GAME_CONFIG.DF_EDGE_FADE}`;
}

function buildConnFp(connections: StarConnection[]): string {
    let fp = '';
    for (const c of connections) fp += `${c.sourceId}-${c.targetId}|`;
    return fp;
}

// ============================================================================
// Blur helper
// ============================================================================

function applyBlur(): void {
    if (!cachedSprite) return;
    const blur = GAME_CONFIG.DF_BLUR ?? 0;
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

// ============================================================================
// Main Renderer
// ============================================================================

export function renderDistanceFieldTerritory(
    stars: StarState[],
    container: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections?: StarConnection[],
): void {
    if (!GAME_CONFIG.TERRITORY_DISTANCE_FIELD) {
        if (cachedSprite) cachedSprite.visible = false;
        return;
    }

    const now = performance.now();
    const conns = connections ?? [];
    const transitionMs = GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 400;

    // ── Rebuild lane index if connections changed ──
    const connFp = buildConnFp(conns);
    if (connFp !== cachedConnFp) {
        buildLaneIndex(stars, conns);
        cachedConnFp = connFp;
    }

    // ── Check if ownership changed → recompute Dijkstra ──
    const ownerFp = buildOwnerFp(stars);
    const ownerChanged = ownerFp !== cachedOwnerFp;

    if (ownerChanged) {
        cachedOwnerFp = ownerFp;

        // Build player list
        const playerSet = new Set<string>();
        for (const s of stars) if (s.ownerId) playerSet.add(s.ownerId);
        const newPlayerIds = Array.from(playerSet).sort();

        // Compute new distances
        const metric = (GAME_CONFIG.DF_DISTANCE_METRIC ?? 'hops') as 'hops' | 'length';
        const newDist = computeDistToPlayer(stars, conns, newPlayerIds, metric);

        // Start transition if we have previous data and transition is enabled
        if (currentDist && transitionMs > 0 && currentPlayerIds.length === newPlayerIds.length
            && currentPlayerIds.every((id, i) => id === newPlayerIds[i])) {
            prevDist = currentDist;
            transitionStart = now;
            isTransitioning = true;
        }

        currentDist = newDist;
        currentPlayerIds = newPlayerIds;
    }

    if (!currentDist || currentPlayerIds.length === 0) {
        if (cachedSprite) cachedSprite.visible = false;
        return;
    }

    // ── Determine which distances to rasterize ──
    let renderDist = currentDist;

    if (isTransitioning && prevDist && transitionMs > 0) {
        const elapsed = now - transitionStart;
        const rawT = Math.min(1, elapsed / transitionMs);
        const eased = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

        if (rawT >= 1) {
            isTransitioning = false;
            prevDist = null;
        } else {
            renderDist = lerpDistArrays(prevDist, currentDist, eased);
        }
    }

    // ── Check if config changed (needs re-rasterize even if ownership didn't) ──
    const configFp = buildConfigFp();
    const needsRender = ownerChanged || isTransitioning || configFp !== cachedConfigFp;
    if (!needsRender && cachedSprite) {
        cachedSprite.visible = true;
        applyBlur();
        return;
    }
    cachedConfigFp = configFp;

    // ── Rasterize ──
    const resolution = GAME_CONFIG.DF_RESOLUTION ?? 4;
    const fillAlpha = GAME_CONFIG.DF_ALPHA ?? 0.3;
    const borderWidth = GAME_CONFIG.DF_BORDER_WIDTH ?? 15;
    const borderSoftness = GAME_CONFIG.DF_BORDER_SOFTNESS ?? 8;
    const borderAlpha = GAME_CONFIG.DF_BORDER_ALPHA ?? 0.8;
    const borderBrighten = GAME_CONFIG.DF_BORDER_BRIGHTEN ?? 40;
    const hueShift = GAME_CONFIG.DF_HUE ?? 0;
    const satMult = GAME_CONFIG.DF_SATURATION ?? 0.7;
    const lightMult = GAME_CONFIG.DF_LIGHTNESS ?? 0.5;
    const edgeFade = GAME_CONFIG.DF_EDGE_FADE ?? 200;
    const rounding = GAME_CONFIG.DF_ROUNDING ?? 8;
    const padding = edgeFade;

    const canvas = rasterize(
        stars, renderDist, currentPlayerIds, colorUtils,
        worldWidth, worldHeight,
        resolution, fillAlpha, borderWidth, borderSoftness,
        borderAlpha, borderBrighten, hueShift, satMult, lightMult, padding, rounding,
    );

    // ── Update PIXI sprite ──
    if (cachedTexture) cachedTexture.destroy(true);
    cachedTexture = PIXI.Texture.from(canvas);
    cachedTexture.source.scaleMode = 'linear';

    const totalW = worldWidth + padding * 2;
    const totalH = worldHeight + padding * 2;

    if (!cachedSprite) {
        cachedSprite = new PIXI.Sprite(cachedTexture);
        container.addChild(cachedSprite);
    } else {
        cachedSprite.texture = cachedTexture;
        if (!cachedSprite.parent) container.addChild(cachedSprite);
    }

    cachedSprite.width = totalW;
    cachedSprite.height = totalH;
    cachedSprite.x = -padding;
    cachedSprite.y = -padding;
    cachedSprite.visible = true;
    applyBlur();
}

// ============================================================================
// Cache Reset
// ============================================================================

export function resetDistanceFieldTerritoryCache(): void {
    cachedOwnerFp = '';
    cachedConfigFp = '';
    cachedConnFp = '';
    currentDist = null;
    prevDist = null;
    isTransitioning = false;
    transitionStart = 0;
    currentPlayerIds = [];

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
    rasterCanvas = null;
    laneArray = [];
    laneCells = new Map();
}
