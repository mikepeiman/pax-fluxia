// ============================================================================
// MetaballRenderer — CPU-computed influence field territory rendering
// ============================================================================
//
// Renders organic, blobby territory regions by computing influence fields
// on a coarse grid (CPU), then rendering colored rectangles via PIXI Graphics.
//
// Corridor (CX) & DX disconnect virtuals: affect **geom/borders only** (excluded from infReal),
// so lanes and disconnect pins move boundaries without bloating or tinting fill.
//
// Fill is drawn only where **geom** (`infGeom`, incl. CX/DX) and **real stars** (`infReal`) agree
// on the winning cluster — so CX can move borders without painting fill into corridor-only cells.
// Softness (alpha / runner) still uses `infReal` only. **METABALL_BLUR** targets either fill
// `Graphics` only (default) or fill + borders via **METABALL_BLUR_AFFECTS_BORDERS** (one filtered layer).
//
// PERFORMANCE: Grid computation only runs when fingerprint changes (ownership
// changes on tick). The render loop call is cheap — just a fingerprint check.
// ============================================================================

import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState, StarConnection } from '$lib/types/game.types';
import { findConnectedClustersOptimized } from './territoryUtils';
import type { ColorUtils } from './RenderContext';
import { chaikinSmoothPolyline } from './geometry/chaikin';
import { computeDisconnectVirtuals } from './territoryFeatures';
import { buildCorridorVirtualSites } from '$lib/territory/corridor/buildCorridorVirtualSites';
import { getLanePolyline } from '$lib/lanes/lanePolylineCache';

// ── Cache ──────────────────────────────────────────────────────────────────

let cachedFingerprint = '';
/** Used only when METABALL_BLUR_AFFECTS_BORDERS && blur > 0 (single blur pass over fill + strokes). */
let metaballLayer: PIXI.Container | null = null;
let territoryGraphics: PIXI.Graphics | null = null;
let borderGraphics: PIXI.Graphics | null = null;
let cachedBlurFilter: PIXI.BlurFilter | null = null;
let cachedBlurStrength = -1;
let cachedGeomField: Float32Array | null = null;
let cachedRealField: Float32Array | null = null;
let cachedOwnerGridGeom: Int16Array | null = null;
let cachedMsrOwnerGrid: Int16Array | null = null;
let cachedColCenters: Float32Array | null = null;
let cachedRowCenters: Float32Array | null = null;

function ensureFloatBuffer(buf: Float32Array | null, length: number): Float32Array {
    if (!buf || buf.length !== length) return new Float32Array(length);
    buf.fill(0);
    return buf;
}

function ensureInt16Buffer(buf: Int16Array | null, length: number, fillValue = -1): Int16Array {
    if (!buf || buf.length !== length) {
        const next = new Int16Array(length);
        next.fill(fillValue);
        return next;
    }
    buf.fill(fillValue);
    return buf;
}

function ensureCenters(
    buf: Float32Array | null,
    length: number,
    origin: number,
    cellSize: number,
): Float32Array {
    const next = !buf || buf.length !== length ? new Float32Array(length) : buf;
    for (let i = 0; i < length; i++) {
        next[i] = origin + (i + 0.5) * cellSize;
    }
    return next;
}

/** Flat container children vs wrapped layer — must run whenever blur-unify toggles or blur strength crosses zero. */
function ensureMetaballParenting(
    container: PIXI.Container,
    unifiedBlur: boolean,
    blurStrength: number,
): void {
    if (!territoryGraphics) territoryGraphics = new PIXI.Graphics();
    if (!borderGraphics) borderGraphics = new PIXI.Graphics();

    const useLayer = unifiedBlur && blurStrength > 0;

    if (useLayer) {
        if (!metaballLayer) metaballLayer = new PIXI.Container();
        territoryGraphics.removeFromParent();
        borderGraphics.removeFromParent();
        metaballLayer.addChild(territoryGraphics);
        metaballLayer.addChild(borderGraphics);
        metaballLayer.removeFromParent();
        container.addChild(metaballLayer);
        metaballLayer.visible = true;
        territoryGraphics.visible = true;
        borderGraphics.visible = true;
    } else {
        if (metaballLayer) {
            territoryGraphics.removeFromParent();
            borderGraphics.removeFromParent();
            metaballLayer.removeFromParent();
            metaballLayer.destroy({ children: false });
            metaballLayer = null;
        }
        territoryGraphics.removeFromParent();
        borderGraphics.removeFromParent();
        container.addChild(territoryGraphics);
        container.addChild(borderGraphics);
        territoryGraphics.visible = true;
        borderGraphics.visible = true;
    }
}

export interface MetaballRenderOptions {
    /** When set, enables combat/recency border boosts from Star lastCombatTick / lastAttackTick */
    gameTick?: number;
    /** Explicit family-built influence scene; when present the renderer skips legacy sample discovery. */
    sceneInput?: MetaballSceneInput;
}

// ── Falloff Functions ──────────────────────────────────────────────────────

function falloffInverseSquare(dist: number, radius: number): number {
    const d = dist / radius;
    return 1 / (1 + d * d);
}

function falloffGaussian(dist: number, radius: number): number {
    const sigma = radius / 1.2;
    const d = dist / sigma;
    return Math.exp(-0.5 * d * d);
}

function falloffSmoothstep(dist: number, radius: number): number {
    const effectiveRadius = radius * 1.5;
    const t = Math.max(0, Math.min(1, 1 - dist / effectiveRadius));
    return t * t * (3 - 2 * t);
}

type FalloffFn = (dist: number, radius: number) => number;
const FALLOFF_MAP: Record<string, FalloffFn> = {
    'inverse-square': falloffInverseSquare,
    'gaussian': falloffGaussian,
    'smoothstep': falloffSmoothstep,
};

// ── Color ─────────────────────────────────────────────────────────────────

function hexToRGB(hex: number): [number, number, number] {
    return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function rgbToHex(r: number, g: number, b: number): number {
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
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

function applyFillHSL(
    r: number,
    g: number,
    b: number,
    hueShift: number,
    satMult: number,
    lightMult: number,
): [number, number, number] {
    if (hueShift === 0 && satMult === 1 && lightMult === 1) return [r, g, b];
    const [h, s, l] = rgbToHSL(r, g, b);
    const nh = ((h + hueShift) % 360 + 360) % 360;
    const ns = Math.max(0, Math.min(1, s * satMult));
    const nl = Math.max(0, Math.min(1, l * lightMult));
    return hslToRGB(nh, ns, nl);
}

function applyBorderHSL(
    r: number,
    g: number,
    b: number,
    hueShift: number,
    satMult: number,
    lightMult: number,
): [number, number, number] {
    return applyFillHSL(r, g, b, hueShift, satMult, lightMult);
}

// ── Influence samples ─────────────────────────────────────────────────────

export interface MetaballInfluenceSample {
    id?: string;
    x: number;
    y: number;
    playerIdx: number;
    strength: number;
    /** CX / DX samples — excluded from infReal; only shape geom + borders */
    corridorVirtual?: boolean;
    disconnectVirtual?: boolean;
}

export interface MetaballSceneInput {
    ownedStars: ReadonlyArray<StarState>;
    clusterMap: ReadonlyMap<string, { clusterIdx: number; ownerId: string }>;
    playerColors: ReadonlyArray<readonly [number, number, number]>;
    clusterShips: ReadonlyArray<number>;
    samples: ReadonlyArray<MetaballInfluenceSample>;
    fingerprint?: string;
    influenceRadiusPx?: number;
    ownershipMarginPx?: number;
}

export function computeMetaballStarStrength(
    s: StarState,
    strengthMult: number,
): number {
    return (0.5 + Math.min(2.0, Math.log2(Math.max(1, s.activeShips + s.damagedShips)) * 0.2)) * strengthMult;
}

function buildCorridorSamples(
    connections: StarConnection[] | undefined,
    starById: Map<string, StarState>,
    clusterMap: ReadonlyMap<string, { clusterIdx: number; ownerId: string }>,
    strengthMult: number,
): MetaballInfluenceSample[] {
    const connectionList = connections ?? [];
    if (connectionList.length === 0) return [];
    const corridorEnabled = GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ?? true;
    const contestMidpointEnabled =
        GAME_CONFIG.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS ?? true;
    if (!corridorEnabled && !contestMidpointEnabled) return [];

    const spacing = Math.max(12, GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ?? 60);
    const cxCount = GAME_CONFIG.TERRITORY_CX_COUNT ?? 0;
    const cxWeight = Math.max(0, GAME_CONFIG.TERRITORY_CX_WEIGHT ?? 0.5);
    const cxContestPairCount =
        GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT ?? 1;
    const cxContestPairWeight = Math.max(
        0,
        GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT ?? 0.5,
    );
    const starMargin = Math.max(
        0,
        GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45,
    );

    const ownedStars = [...starById.values()].filter((s) => Boolean(s.ownerId));
    const sites = buildCorridorVirtualSites(
        ownedStars,
        connectionList,
        spacing,
        cxWeight,
        cxCount > 0 ? cxCount : undefined,
        getLanePolyline,
        contestMidpointEnabled,
        corridorEnabled,
        corridorEnabled,
        cxContestPairWeight,
        Math.max(1, Math.round(cxContestPairCount)),
        starMargin,
    );

    const out: MetaballInfluenceSample[] = [];
    for (const site of sites) {
        const sa = starById.get(site.sourceStarA);
        const sb = starById.get(site.sourceStarB);
        if (!sa || !sb) continue;

        const playerIdx = clusterMap.get(site.anchorStarId)?.clusterIdx;
        if (playerIdx === undefined) continue;

        const str =
            ((computeMetaballStarStrength(sa, strengthMult) +
                computeMetaballStarStrength(sb, strengthMult)) /
                2) *
            site.weight;
        out.push({
            x: site.x,
            y: site.y,
            playerIdx,
            strength: str,
            corridorVirtual: true,
        });
    }
    return out;
}

/**
 * DX disconnect virtuals: midpoint pins (nearest enemy) — **geom-only**, same presentation rule as CX.
 */
function buildDisconnectSamples(
    allStars: StarState[],
    ownedStars: StarState[],
    connections: StarConnection[] | undefined,
    clusterMap: ReadonlyMap<string, { clusterIdx: number; ownerId: string }>,
    strengthMult: number,
    starById: Map<string, StarState>,
): MetaballInfluenceSample[] {
    if (!GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED) return [];

    const connectionList = connections ?? [];
    const maxDist = GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ?? 400;
    const dxW = GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0.3;
    const virtuals = computeDisconnectVirtuals(
        ownedStars,
        allStars,
        connectionList,
        maxDist,
        dxW,
    );
    const out: MetaballInfluenceSample[] = [];

    for (const v of virtuals) {
        let nearestEnemy: StarState | null = null;
        let nearestD = Infinity;
        for (const s of allStars) {
            if (!s.ownerId || s.ownerId !== v.ownerId) continue;
            const d = Math.hypot(s.x - v.x, s.y - v.y);
            if (d < nearestD) {
                nearestD = d;
                nearestEnemy = s;
            }
        }
        if (!nearestEnemy) continue;
        const ci = clusterMap.get(nearestEnemy.id)?.clusterIdx;
        if (ci === undefined) continue;

        const sa = starById.get(v.sourceStarA);
        const sb = starById.get(v.sourceStarB);
        if (!sa || !sb) continue;
        const str =
            ((computeMetaballStarStrength(sa, strengthMult) +
                computeMetaballStarStrength(sb, strengthMult)) /
                2) *
            v.weight;

        out.push({
            x: v.x,
            y: v.y,
            playerIdx: ci,
            strength: str,
            disconnectVirtual: true,
        });
    }
    return out;
}

// ── Fingerprint ─────────────────────────────────────────────────────────────

function shipInfluenceBucket(s: StarState): number {
    const n = Math.max(0, (s.activeShips ?? 0) + (s.damagedShips ?? 0));
    if (n <= 0) return 0;
    return Math.min(31, Math.floor(Math.log2(n)));
}

function combatActivityBucket(s: StarState, gameTick: number | undefined): number {
    if (gameTick === undefined) return 0;
    const w = GAME_CONFIG.METABALL_COMBAT_BORDER_TICKS ?? 0;
    if (w <= 0) return 0;
    const lc = s.lastCombatTick ?? -9e8;
    const la = s.lastAttackTick ?? -9e8;
    if (gameTick - lc < w) return 2;
    if (gameTick - la < w) return 1;
    return 0;
}

export function buildMetaballCacheFingerprint(params: {
    stars: StarState[];
    gameTick: number | undefined;
    sceneFingerprint?: string;
    sceneInfluenceRadiusPx?: number;
    sceneOwnershipMarginPx?: number;
}): string {
    const {
        stars,
        gameTick,
        sceneFingerprint,
        sceneInfluenceRadiusPx,
        sceneOwnershipMarginPx,
    } = params;
    let fp = '';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}:${shipInfluenceBucket(s)}:${combatActivityBucket(s, gameTick)}|`;
    }
    const effectiveInfluenceRadius =
        sceneInfluenceRadiusPx ?? GAME_CONFIG.METABALL_INFLUENCE_RADIUS;
    const effectiveOwnershipMargin =
        sceneOwnershipMarginPx ?? GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN;
    fp += `${effectiveInfluenceRadius}:${GAME_CONFIG.METABALL_FALLOFF}`;
    fp += `:${GAME_CONFIG.METABALL_BLEND_SHARPNESS}:${GAME_CONFIG.METABALL_ALPHA}`;
    fp += `:${GAME_CONFIG.METABALL_FILL_ENABLED ? 1 : 0}`;
    fp += `:${GAME_CONFIG.METABALL_CELL_SIZE}:${GAME_CONFIG.METABALL_THRESHOLD}`;
    fp += `:${GAME_CONFIG.METABALL_STRENGTH_MULT}:${GAME_CONFIG.METABALL_EDGE_FADE}`;
    fp += `:${GAME_CONFIG.METABALL_COVERAGE}`;
    fp += `:${GAME_CONFIG.METABALL_BLUR}:${GAME_CONFIG.METABALL_BLUR_AFFECTS_BORDERS ? 1 : 0}:${GAME_CONFIG.TERRITORY_METABALL}`;
    fp += `:${GAME_CONFIG.METABALL_BORDER_ENABLED ? 1 : 0}`;
    fp += `:${GAME_CONFIG.METABALL_BORDER_WIDTH}:${GAME_CONFIG.METABALL_BORDER_ALPHA}`;
    fp += `:${GAME_CONFIG.METABALL_SATURATION}:${GAME_CONFIG.METABALL_LIGHTNESS}`;
    fp += `:${GAME_CONFIG.METABALL_BORDER_SATURATION}:${GAME_CONFIG.METABALL_BORDER_LIGHTNESS}`;
    fp += `:${GAME_CONFIG.METABALL_CHAIKIN_PASSES}`;
    fp += `:${GAME_CONFIG.METABALL_FILL_FOLLOWS_GEOM ? 1 : 0}`;
    fp += `:${GAME_CONFIG.METABALL_COMBAT_BORDER_TICKS}:${GAME_CONFIG.METABALL_COMBAT_BORDER_PROXIMITY_PX}`;
    fp += `:${GAME_CONFIG.METABALL_COMBAT_BORDER_WIDTH_BOOST}`;
    fp += `:${GAME_CONFIG.METABALL_COMBAT_BORDER_ALPHA_BOOST}:${GAME_CONFIG.METABALL_BORDER_FORCE_RATIO}`;
    fp += `:msr${effectiveOwnershipMargin}`;
    fp += `:cx${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED}:${GAME_CONFIG.TERRITORY_CX_COUNT}:${GAME_CONFIG.TERRITORY_CX_WEIGHT}:${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}:${GAME_CONFIG.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS ? 1 : 0}:${GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT}:${GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT}`;
    fp += `:dx${GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED}:${GAME_CONFIG.TERRITORY_DX_WEIGHT}:${GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE}`;
    if (sceneFingerprint) {
        fp += `:scene:${sceneFingerprint}`;
    }
    return fp;
}

function buildColorFingerprint(
    stars: StarState[],
    colorUtils: ColorUtils,
): string {
    const seenOwners = new Set<string>();
    let fp = '';

    for (const star of stars) {
        const ownerId = star.ownerId;
        if (!ownerId || seenOwners.has(ownerId)) continue;
        seenOwners.add(ownerId);
        fp += `${ownerId}:${colorUtils.getPlayerColor(ownerId)}|`;
    }

    return fp;
}

// ── Border geometry: merge collinear grid edges, chain, Chaikin, stroke joins ─

const EPS = 1e-4;

/** Pixel-snap grid coordinates so orthogonal segments chain at exact corners */
function ptKey(x: number, y: number): string {
    return `${Math.round(x * 1000) / 1000}|${Math.round(y * 1000) / 1000}`;
}

function distPointToSegment(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
): number {
    const vx = bx - ax;
    const vy = by - ay;
    const wx = px - ax;
    const wy = py - ay;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return Math.hypot(px - ax, py - ay);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(px - bx, py - by);
    const t = c1 / c2;
    const qx = ax + t * vx;
    const qy = ay + t * vy;
    return Math.hypot(px - qx, py - qy);
}

function segmentNearHotCombat(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    lo: number,
    ro: number,
    gameTick: number | undefined,
    combatWindowTicks: number,
    ownedStars: StarState[],
    clusterMap: ReadonlyMap<string, { clusterIdx: number; ownerId: string }>,
    proximityPx: number,
): boolean {
    if (gameTick === undefined || combatWindowTicks <= 0) return false;
    const clusters =
        lo >= 0 && ro >= 0 ? [lo, ro] : lo >= 0 ? [lo] : ro >= 0 ? [ro] : [];
    if (clusters.length === 0) return false;
    for (const s of ownedStars) {
        if (!s.ownerId) continue;
        const ci = clusterMap.get(s.id)?.clusterIdx;
        if (ci === undefined || !clusters.includes(ci)) continue;
        const lc = s.lastCombatTick ?? -9e8;
        const la = s.lastAttackTick ?? -9e8;
        if (gameTick - lc >= combatWindowTicks && gameTick - la >= combatWindowTicks)
            continue;
        if (distPointToSegment(s.x, s.y, ax, ay, bx, by) < proximityPx) return true;
    }
    return false;
}

type MetaballCellWinner = {
    maxPlayer: number;
    maxInf: number;
    secondInf: number;
    secondPlayer: number;
};

/** Resolve winning cluster for one grid cell from a pre-built influence vector */
function resolveMetaballCellWinner(
    inf: Float32Array,
    offset: number,
    numPlayers: number,
    forcedPlayer: number,
    dominanceFilterOn: boolean,
    dominanceMinActive: number,
): MetaballCellWinner | null {
    let maxInf = 0;
    let maxPlayer = forcedPlayer >= 0 ? forcedPlayer : -1;
    let secondInf = 0;
    let secondPlayer = -1;

    if (forcedPlayer >= 0) {
        maxInf = inf[offset + forcedPlayer];
        for (let p = 0; p < numPlayers; p++) {
            if (p === forcedPlayer) continue;
            const value = inf[offset + p];
            if (value > secondInf) {
                secondInf = value;
                secondPlayer = p;
            }
        }
    } else {
        for (let p = 0; p < numPlayers; p++) {
            const value = inf[offset + p];
            if (value > maxInf) {
                secondInf = maxInf;
                secondPlayer = maxPlayer;
                maxInf = value;
                maxPlayer = p;
            } else if (value > secondInf) {
                secondInf = value;
                secondPlayer = p;
            }
        }
        if (maxPlayer < 0) return null;
    }

    const denomRaw = maxInf + secondInf;
    const dominance = denomRaw > 1e-12 ? maxInf / denomRaw : 1;
    if (dominanceFilterOn && dominance < dominanceMinActive) return null;

    return { maxPlayer, maxInf, secondInf, secondPlayer };
}

/** Border tint: 50/50 mix for two factions; single owner when one side is void (-1) */
function metaballBorderRgbForPair(
    lo: number,
    ro: number,
    playerColors: [number, number, number][],
    borderSatMult: number,
    borderLightMult: number,
): [number, number, number] {
    const aIdx = lo >= 0 ? lo : ro;
    if (lo < 0 || ro < 0) {
        const c = playerColors[aIdx];
        return applyBorderHSL(c[0], c[1], c[2], 0, borderSatMult, borderLightMult);
    }
    const a = playerColors[lo];
    const b = playerColors[ro];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const mz = (a[2] + b[2]) / 2;
    return applyBorderHSL(mx, my, mz, 0, borderSatMult, borderLightMult);
}

type MergedSeg = { ax: number; ay: number; bx: number; by: number };

function mergeVerticalIntervals(
    intervals: { y0: number; y1: number }[],
): { y0: number; y1: number }[] {
    if (!intervals.length) return [];
    intervals.sort((a, b) => a.y0 - b.y0);
    const out: { y0: number; y1: number }[] = [];
    let cur = { ...intervals[0] };
    for (let i = 1; i < intervals.length; i++) {
        const n = intervals[i];
        if (n.y0 <= cur.y1 + EPS) cur.y1 = Math.max(cur.y1, n.y1);
        else {
            out.push(cur);
            cur = { ...n };
        }
    }
    out.push(cur);
    return out;
}

function mergeHorizontalIntervals(
    intervals: { x0: number; x1: number }[],
): { x0: number; x1: number }[] {
    if (!intervals.length) return [];
    intervals.sort((a, b) => a.x0 - b.x0);
    const out: { x0: number; x1: number }[] = [];
    let cur = { ...intervals[0] };
    for (let i = 1; i < intervals.length; i++) {
        const n = intervals[i];
        if (n.x0 <= cur.x1 + EPS) cur.x1 = Math.max(cur.x1, n.x1);
        else {
            out.push(cur);
            cur = { ...n };
        }
    }
    out.push(cur);
    return out;
}

function chainSegmentsToPolylines(segments: MergedSeg[]): [number, number][][] {
    if (!segments.length) return [];
    const adj = new Map<string, MergedSeg[]>();
    const addAdj = (k: string, s: MergedSeg) => {
        const list = adj.get(k);
        if (list) list.push(s);
        else adj.set(k, [s]);
    };
    for (const s of segments) {
        const ka = ptKey(s.ax, s.ay);
        const kb = ptKey(s.bx, s.by);
        addAdj(ka, s);
        addAdj(kb, s);
    }

    const used = new Set<MergedSeg>();
    const polylines: [number, number][][] = [];

    const otherEnd = (s: MergedSeg, from: [number, number]): [number, number] => {
        const fx = from[0], fy = from[1];
        if (Math.hypot(s.ax - fx, s.ay - fy) < EPS) return [s.bx, s.by];
        return [s.ax, s.ay];
    };

    for (const start of segments) {
        if (used.has(start)) continue;
        used.add(start);
        const path: [number, number][] = [[start.ax, start.ay], [start.bx, start.by]];
        let head: [number, number] = [start.ax, start.ay];
        let tail: [number, number] = [start.bx, start.by];

        const extend = (end: 'head' | 'tail') => {
            for (;;) {
                const pt = end === 'head' ? head : tail;
                const key = ptKey(pt[0], pt[1]);
                const candidates = adj.get(key) ?? [];
                let nextSeg: MergedSeg | null = null;
                for (const s of candidates) {
                    if (used.has(s)) continue;
                    nextSeg = s;
                    break;
                }
                if (!nextSeg) break;
                used.add(nextSeg);
                const nxt = otherEnd(nextSeg, pt);
                if (end === 'head') {
                    path.unshift(nxt);
                    head = nxt;
                } else {
                    path.push(nxt);
                    tail = nxt;
                }
            }
        };

        extend('tail');
        extend('head');
        polylines.push(path);
    }

    return polylines;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Svelte-friendly entry: explicit 7th arg avoids `.svelte` checkers that mishandle
 * optional trailing option bags on `renderMetaball`.
 */
export function renderMetaballScene(
    stars: StarState[],
    container: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections: StarConnection[] | undefined,
    gameTick: number | undefined,
): void {
    renderMetaballImpl(
        stars,
        container,
        colorUtils,
        worldWidth,
        worldHeight,
        connections,
        { gameTick },
    );
}

export function renderMetaball(
    stars: StarState[],
    container: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections?: StarConnection[],
    options?: MetaballRenderOptions,
): void {
    renderMetaballImpl(stars, container, colorUtils, worldWidth, worldHeight, connections, options);
}

function renderMetaballImpl(
    stars: StarState[],
    container: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections?: StarConnection[],
    options?: MetaballRenderOptions,
): void {
    const sceneInput = options?.sceneInput;
    const show =
        Boolean(sceneInput) ||
        GAME_CONFIG.TERRITORY_RENDER_MODE === 'metaball' ||
        GAME_CONFIG.TERRITORY_METABALL;
    const gameTick = options?.gameTick;
    const blurStrengthCfg = Math.max(0, GAME_CONFIG.METABALL_BLUR ?? 0);
    const blurUnifiesBorders = !!GAME_CONFIG.METABALL_BLUR_AFFECTS_BORDERS;

    if (!show) {
        if (metaballLayer) metaballLayer.visible = false;
        if (territoryGraphics) territoryGraphics.visible = false;
        if (borderGraphics) borderGraphics.visible = false;
        return;
    }

    ensureMetaballParenting(container, blurUnifiesBorders, blurStrengthCfg);
    if (!territoryGraphics || !borderGraphics) return;

    const fingerprint =
        buildMetaballCacheFingerprint({
            stars,
            gameTick,
            sceneFingerprint: sceneInput?.fingerprint,
            sceneInfluenceRadiusPx: sceneInput?.influenceRadiusPx,
            sceneOwnershipMarginPx: sceneInput?.ownershipMarginPx,
        }) +
        `:${worldWidth}:${worldHeight}` +
        `:colors:${buildColorFingerprint(stars, colorUtils)}`;
    if (fingerprint === cachedFingerprint) {
        applyBlurFilter();
        return;
    }
    cachedFingerprint = fingerprint;

    const ownedStars = sceneInput
        ? [...sceneInput.ownedStars]
        : stars.filter(s => s.ownerId);
    if (ownedStars.length === 0) {
        if (metaballLayer) metaballLayer.visible = false;
        else {
            territoryGraphics!.visible = false;
            borderGraphics!.visible = false;
        }
        return;
    }

    const radius = sceneInput?.influenceRadiusPx ?? GAME_CONFIG.METABALL_INFLUENCE_RADIUS ?? 120;
    const falloffType = GAME_CONFIG.METABALL_FALLOFF ?? 'inverse-square';
    const sharpness = GAME_CONFIG.METABALL_BLEND_SHARPNESS ?? 3.0;
    const fillEnabled = GAME_CONFIG.METABALL_FILL_ENABLED ?? true;
    const bordersEnabled = GAME_CONFIG.METABALL_BORDER_ENABLED ?? true;
    const alpha = fillEnabled ? (GAME_CONFIG.METABALL_ALPHA ?? 0.5) : 0;
    const cellSize = GAME_CONFIG.METABALL_CELL_SIZE ?? 8;
    const rawDominanceThresh = GAME_CONFIG.METABALL_THRESHOLD ?? 0.52;
    /** ≤0.5 disables filter; above 0.5 requires winner share of (w1+w2) at least this */
    const dominanceFilterOn = rawDominanceThresh > 0.5 + 1e-9;
    const dominanceMinActive = dominanceFilterOn
        ? Math.min(0.999, Math.max(0.5000001, rawDominanceThresh))
        : 0;
    const strengthMult = GAME_CONFIG.METABALL_STRENGTH_MULT ?? 1.0;
    const edgeFade = GAME_CONFIG.METABALL_EDGE_FADE ?? 3.0;
    const borderWidth = bordersEnabled
        ? (GAME_CONFIG.METABALL_BORDER_WIDTH ?? 1.5)
        : 0;
    const borderAlpha = bordersEnabled
        ? (GAME_CONFIG.METABALL_BORDER_ALPHA ?? 0.6)
        : 0;
    const falloffFn = FALLOFF_MAP[falloffType] ?? falloffInverseSquare;
    const fillSatMult = GAME_CONFIG.METABALL_SATURATION ?? 1.0;
    const fillLightMult = GAME_CONFIG.METABALL_LIGHTNESS ?? 1.0;
    const fillFollowsGeom = GAME_CONFIG.METABALL_FILL_FOLLOWS_GEOM ?? false;
    const borderSatMult = GAME_CONFIG.METABALL_BORDER_SATURATION ?? 1.0;
    const borderLightMult = GAME_CONFIG.METABALL_BORDER_LIGHTNESS ?? 1.0;
    const chaikinPasses = Math.max(0, Math.min(4, Math.round(GAME_CONFIG.METABALL_CHAIKIN_PASSES ?? 0)));
    const combatTicks = Math.max(0, GAME_CONFIG.METABALL_COMBAT_BORDER_TICKS ?? 0);
    const combatWBoost = Math.max(0, GAME_CONFIG.METABALL_COMBAT_BORDER_WIDTH_BOOST ?? 0);
    const combatABoost = Math.max(0, GAME_CONFIG.METABALL_COMBAT_BORDER_ALPHA_BOOST ?? 0);
    const forceRatioScale = Math.max(0, GAME_CONFIG.METABALL_BORDER_FORCE_RATIO ?? 0);

    const starById = new Map<string, StarState>();
    for (const s of ownedStars) starById.set(s.id, s);

    const clusterMap = sceneInput
        ? sceneInput.clusterMap
        : findConnectedClustersOptimized(ownedStars, connections ?? [], starById);

    const clusterValues = Array.from(clusterMap.values());
    const numClusters = sceneInput
        ? sceneInput.playerColors.length
        : clusterValues.length > 0
          ? Math.max(...clusterValues.map(c => c.clusterIdx)) + 1
          : 0;

    const playerColors: [number, number, number][] = sceneInput
        ? sceneInput.playerColors.map((color) => [color[0], color[1], color[2]])
        : (() => {
              const clusterOwnerMap = new Map<number, string>();
              for (const [, info] of clusterMap) {
                  if (!clusterOwnerMap.has(info.clusterIdx)) {
                      clusterOwnerMap.set(info.clusterIdx, info.ownerId);
                  }
              }

              const colors: [number, number, number][] = new Array(numClusters);
              for (const [ci, ownerId] of clusterOwnerMap) {
                  colors[ci] = hexToRGB(colorUtils.getPlayerColor(ownerId));
              }
              return colors;
          })();

    const ownedStarClusters = ownedStars
        .map((star) => {
            const clusterIdx = clusterMap.get(star.id)?.clusterIdx;
            return clusterIdx === undefined || clusterIdx < 0
                ? null
                : { x: star.x, y: star.y, clusterIdx };
        })
        .filter((entry): entry is { x: number; y: number; clusterIdx: number } => entry !== null);

    const clusterShips = sceneInput
        ? Float32Array.from(sceneInput.clusterShips)
        : (() => {
              const ships = new Float32Array(numClusters);
              for (const s of ownedStars) {
                  const ci = clusterMap.get(s.id)?.clusterIdx;
                  if (ci !== undefined) {
                      ships[ci] += (s.activeShips ?? 0) + (s.damagedShips ?? 0);
                  }
              }
              return ships;
          })();

    const combatProximityCfg = GAME_CONFIG.METABALL_COMBAT_BORDER_PROXIMITY_PX ?? 0;
    const combatProximityPx =
        combatProximityCfg > 0 ? combatProximityCfg : (GAME_CONFIG.METABALL_INFLUENCE_RADIUS ?? radius);
    const msrPx = Math.max(
        0,
        sceneInput?.ownershipMarginPx ?? GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 0,
    );

    const coverage = GAME_CONFIG.METABALL_COVERAGE ?? 0.3;
    const pad = Math.max(worldWidth, worldHeight) * coverage;
    const gridOriginX = -pad;
    const gridOriginY = -pad;
    const gridW = worldWidth + pad * 2;
    const gridH = worldHeight + pad * 2;

    const cols = Math.ceil(gridW / cellSize);
    const rows = Math.ceil(gridH / cellSize);

    const starData: MetaballInfluenceSample[] = sceneInput
        ? [...sceneInput.samples]
        : (() => {
              const data: MetaballInfluenceSample[] = ownedStars.map(s => ({
                  x: s.x,
                  y: s.y,
                  playerIdx: clusterMap.get(s.id)?.clusterIdx ?? 0,
                  strength: computeMetaballStarStrength(s, strengthMult),
              }));
              data.push(...buildCorridorSamples(connections, starById, clusterMap, strengthMult));
              data.push(
                  ...buildDisconnectSamples(
                      stars,
                      ownedStars,
                      connections,
                      clusterMap,
                      strengthMult,
                      starById,
                  ),
              );
              return data;
          })();

    const cellCount = cols * rows;
    const ownerGridGeom = ensureInt16Buffer(cachedOwnerGridGeom, cellCount, -1);
    cachedOwnerGridGeom = ownerGridGeom;
    const colCenters = ensureCenters(cachedColCenters, cols, gridOriginX, cellSize);
    cachedColCenters = colCenters;
    const rowCenters = ensureCenters(cachedRowCenters, rows, gridOriginY, cellSize);
    cachedRowCenters = rowCenters;
    const numPlayers = numClusters;
    const geomField = ensureFloatBuffer(cachedGeomField, cellCount * numPlayers);
    cachedGeomField = geomField;
    const realField = ensureFloatBuffer(cachedRealField, cellCount * numPlayers);
    cachedRealField = realField;
    const msrOwnerGrid =
        msrPx > 0
            ? ensureInt16Buffer(cachedMsrOwnerGrid, cellCount, -1)
            : null;
    if (msrOwnerGrid) cachedMsrOwnerGrid = msrOwnerGrid;

    territoryGraphics.clear();
    borderGraphics.clear();

    const rCut = radius * 2;
    const rCut2 = rCut * rCut;
    const rowStart = new Int32Array(rows);
    for (let row = 0; row < rows; row++) rowStart[row] = row * cols;

    for (let sampleIdx = 0; sampleIdx < starData.length; sampleIdx++) {
        const sample = starData[sampleIdx];
        const minCol = Math.max(0, Math.floor((sample.x - rCut - gridOriginX) / cellSize));
        const maxCol = Math.min(cols - 1, Math.floor((sample.x + rCut - gridOriginX) / cellSize));
        const minRow = Math.max(0, Math.floor((sample.y - rCut - gridOriginY) / cellSize));
        const maxRow = Math.min(rows - 1, Math.floor((sample.y + rCut - gridOriginY) / cellSize));
        const playerIdx = sample.playerIdx;
        const isVirtual = sample.corridorVirtual || sample.disconnectVirtual;
        for (let row = minRow; row <= maxRow; row++) {
            const py = rowCenters[row];
            const dy = py - sample.y;
            const rowOffset = rowStart[row];
            for (let col = minCol; col <= maxCol; col++) {
                const dx = colCenters[col] - sample.x;
                const dist2 = dx * dx + dy * dy;
                if (dist2 > rCut2) continue;
                const value = falloffFn(Math.sqrt(dist2), radius) * sample.strength;
                const fieldOffset = (rowOffset + col) * numPlayers + playerIdx;
                geomField[fieldOffset] += value;
                if (!isVirtual) realField[fieldOffset] += value;
            }
        }
    }

    if (msrOwnerGrid) {
        const msr2 = msrPx * msrPx;
        for (let row = 0; row < rows; row++) {
            const py = rowCenters[row];
            const rowOffset = rowStart[row];
            for (let col = 0; col < cols; col++) {
                const px = colCenters[col];
                let bestCluster = -1;
                let bestDist2 = msr2 + 1;
                for (let i = 0; i < ownedStarClusters.length; i++) {
                    const star = ownedStarClusters[i];
                    const dx = px - star.x;
                    const dy = py - star.y;
                    const dist2 = dx * dx + dy * dy;
                    if (dist2 > msr2 || dist2 >= bestDist2) continue;
                    bestDist2 = dist2;
                    bestCluster = star.clusterIdx;
                }
                msrOwnerGrid[rowOffset + col] = bestCluster;
            }
        }
    }

    for (let row = 0; row < rows; row++) {
        const drawY = gridOriginY + row * cellSize;
        const rowOffset = rowStart[row];
        for (let col = 0; col < cols; col++) {
            const idx = rowOffset + col;
            const forcedPlayer = msrOwnerGrid ? msrOwnerGrid[idx] : -1;
            const offset = idx * numPlayers;
            const wGeom = resolveMetaballCellWinner(
                geomField,
                offset,
                numPlayers,
                forcedPlayer,
                dominanceFilterOn,
                dominanceMinActive,
            );
            if (!wGeom) continue;
            ownerGridGeom[idx] = wGeom.maxPlayer;

            let realWinner: MetaballCellWinner | null = null;
            if (!fillFollowsGeom) {
                realWinner = resolveMetaballCellWinner(
                    realField,
                    offset,
                    numPlayers,
                    forcedPlayer,
                    dominanceFilterOn,
                    dominanceMinActive,
                );
                if (!realWinner || realWinner.maxPlayer !== wGeom.maxPlayer) continue;
            }

            const fillWinner = fillFollowsGeom ? wGeom : realWinner;
            if (!fillWinner) continue;

            let r: number, g: number, b: number;
            const topColor = playerColors[fillWinner.maxPlayer];
            r = topColor[0];
            g = topColor[1];
            b = topColor[2];

            if (fillWinner.secondPlayer >= 0 && fillWinner.secondInf > 1e-9) {
                const total = fillWinner.maxInf + fillWinner.secondInf;
                let blendFactor = fillWinner.maxInf / total;
                const lo = 0.5 - 0.5 / sharpness;
                const hi = 0.5 + 0.5 / sharpness;
                blendFactor = Math.max(0, Math.min(1, (blendFactor - lo) / (hi - lo)));
                if (blendFactor < 0.99) {
                    const secondColor = playerColors[fillWinner.secondPlayer];
                    r = secondColor[0] + (topColor[0] - secondColor[0]) * blendFactor;
                    g = secondColor[1] + (topColor[1] - secondColor[1]) * blendFactor;
                    b = secondColor[2] + (topColor[2] - secondColor[2]) * blendFactor;
                }
            }

            [r, g, b] = applyFillHSL(r, g, b, 0, fillSatMult, fillLightMult);

            const fadeAlpha = Math.min(1, fillWinner.maxInf * edgeFade) * alpha;
            if (fadeAlpha < 0.01) continue;

            territoryGraphics.rect(gridOriginX + col * cellSize, drawY, cellSize, cellSize);
            territoryGraphics.fill({ color: rgbToHex(r, g, b), alpha: fadeAlpha });
        }
    }

    if (borderWidth > 0 && borderAlpha > 0) {
        type VKey = string;
        const verticalMap = new Map<VKey, { y0: number; y1: number }[]>();
        const horizontalMap = new Map<VKey, { x0: number; x1: number }[]>();

        const pushV = (bx: number, lo: number, ro: number, y0: number, y1: number) => {
            const key = `${bx}:${lo}:${ro}`;
            const list = verticalMap.get(key);
            const seg = { y0, y1 };
            if (list) list.push(seg);
            else verticalMap.set(key, [seg]);
        };
        const pushH = (by: number, lo: number, ro: number, x0: number, x1: number) => {
            const key = `${by}:${lo}:${ro}`;
            const list = horizontalMap.get(key);
            const seg = { x0, x1 };
            if (list) list.push(seg);
            else horizontalMap.set(key, [seg]);
        };

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const owner = ownerGridGeom[row * cols + col];
                if (owner < 0) continue;

                if (col > 0) {
                    const lOwner = ownerGridGeom[row * cols + col - 1];
                    if (lOwner < 0) {
                        const bx = gridOriginX + col * cellSize;
                        const y0 = gridOriginY + row * cellSize;
                        const y1 = gridOriginY + (row + 1) * cellSize;
                        pushV(bx, owner, -1, y0, y1);
                    }
                }

                if (row > 0) {
                    const tOwner = ownerGridGeom[(row - 1) * cols + col];
                    if (tOwner < 0) {
                        const by = gridOriginY + row * cellSize;
                        const x0 = gridOriginX + col * cellSize;
                        const x1 = gridOriginX + (col + 1) * cellSize;
                        pushH(by, owner, -1, x0, x1);
                    }
                }

                if (col + 1 < cols) {
                    const rOwner = ownerGridGeom[row * cols + col + 1];
                    if (rOwner >= 0 && rOwner !== owner) {
                        const bx = gridOriginX + (col + 1) * cellSize;
                        const y0 = gridOriginY + row * cellSize;
                        const y1 = gridOriginY + (row + 1) * cellSize;
                        pushV(bx, owner, rOwner, y0, y1);
                    } else if (rOwner < 0) {
                        const bx = gridOriginX + (col + 1) * cellSize;
                        const y0 = gridOriginY + row * cellSize;
                        const y1 = gridOriginY + (row + 1) * cellSize;
                        pushV(bx, owner, -1, y0, y1);
                    }
                }

                if (row + 1 < rows) {
                    const bOwner = ownerGridGeom[(row + 1) * cols + col];
                    if (bOwner >= 0 && bOwner !== owner) {
                        const by = gridOriginY + (row + 1) * cellSize;
                        const x0 = gridOriginX + col * cellSize;
                        const x1 = gridOriginX + (col + 1) * cellSize;
                        pushH(by, owner, bOwner, x0, x1);
                    } else if (bOwner < 0) {
                        const by = gridOriginY + (row + 1) * cellSize;
                        const x0 = gridOriginX + col * cellSize;
                        const x1 = gridOriginX + (col + 1) * cellSize;
                        pushH(by, owner, -1, x0, x1);
                    }
                }
            }
        }

        interface BorderSeg {
            ax: number;
            ay: number;
            bx: number;
            by: number;
            color: number;
            lo: number;
            ro: number;
        }
        const allSegs: BorderSeg[] = [];

        for (const [key, intervals] of verticalMap) {
            const [xs, o0, o1] = key.split(':');
            const x = +xs;
            const lo = +o0;
            const ro = +o1;
            const merged = mergeVerticalIntervals(intervals);
            const [br, bg, bb] = metaballBorderRgbForPair(
                lo,
                ro,
                playerColors,
                borderSatMult,
                borderLightMult,
            );
            const color = rgbToHex(br, bg, bb);
            for (const iv of merged) {
                allSegs.push({ ax: x, ay: iv.y0, bx: x, by: iv.y1, color, lo, ro });
            }
        }

        for (const [key, intervals] of horizontalMap) {
            const [ys, o0, o1] = key.split(':');
            const y = +ys;
            const lo = +o0;
            const ro = +o1;
            const merged = mergeHorizontalIntervals(intervals);
            const [br, bg, bb] = metaballBorderRgbForPair(
                lo,
                ro,
                playerColors,
                borderSatMult,
                borderLightMult,
            );
            const color = rgbToHex(br, bg, bb);
            for (const iv of merged) {
                allSegs.push({ ax: iv.x0, ay: y, bx: iv.x1, by: y, color, lo, ro });
            }
        }

        const byStyle = new Map<string, BorderSeg[]>();
        for (const s of allSegs) {
            const combatNear = segmentNearHotCombat(
                s.ax,
                s.ay,
                s.bx,
                s.by,
                s.lo,
                s.ro,
                gameTick,
                combatTicks,
                ownedStars,
                clusterMap,
                combatProximityPx,
            );
            const sa = clusterShips[s.lo] ?? 0;
            const sb = clusterShips[s.ro] ?? 0;
            const sum = sa + sb + 1;
            const imbalance = Math.abs(sa - sb) / sum;
            const wMul = 1 + (combatNear ? combatWBoost : 0) + forceRatioScale * imbalance;
            const aMul = 1 + (combatNear ? combatABoost : 0) + forceRatioScale * imbalance * 0.5;
            const w = wMul * borderWidth;
            const a = Math.min(1, borderAlpha * aMul);
            const sk = `${s.color}:${w.toFixed(2)}:${a.toFixed(3)}`;
            const list = byStyle.get(sk);
            if (list) list.push(s);
            else byStyle.set(sk, [s]);
        }

        for (const [sk, segs] of byStyle) {
            const parts = sk.split(':');
            const color = +parts[0];
            const w = +parts[1];
            const a = +parts[2];
            const baseSegs: MergedSeg[] = segs.map(({ ax, ay, bx, by }) => ({ ax, ay, bx, by }));
            const chains = chainSegmentsToPolylines(baseSegs);
            borderGraphics.beginPath();
            let drewStroke = false;
            for (const raw of chains) {
                let pts: [number, number][] = raw;
                if (chaikinPasses > 0 && pts.length >= 3) {
                    pts = chaikinSmoothPolyline(pts, chaikinPasses);
                }
                if (pts.length < 2) continue;
                drewStroke = true;
                borderGraphics.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i < pts.length; i++) {
                    borderGraphics.lineTo(pts[i][0], pts[i][1]);
                }
            }
            if (drewStroke) {
                borderGraphics.stroke({
                    width: w,
                    color,
                    alpha: a,
                    cap: 'butt',
                    join: 'miter',
                    miterLimit: 10,
                });
            }
        }
    }

    applyBlurFilter();
}

function applyBlurFilter(): void {
    const blurStrength = Math.max(0, GAME_CONFIG.METABALL_BLUR ?? 0);
    const unified = !!GAME_CONFIG.METABALL_BLUR_AFFECTS_BORDERS;

    if (blurStrength <= 0) {
        if (territoryGraphics) territoryGraphics.filters = [];
        if (metaballLayer) metaballLayer.filters = [];
        cachedBlurFilter = null;
        cachedBlurStrength = -1;
        return;
    }

    if (!cachedBlurFilter || cachedBlurStrength !== blurStrength) {
        cachedBlurFilter = new PIXI.BlurFilter({ strength: blurStrength, quality: 2 });
        cachedBlurStrength = blurStrength;
    }

    if (unified && metaballLayer) {
        metaballLayer.filters = [cachedBlurFilter!];
        if (territoryGraphics) territoryGraphics.filters = [];
    } else {
        if (metaballLayer) metaballLayer.filters = [];
        if (territoryGraphics) territoryGraphics.filters = [cachedBlurFilter!];
    }
}

export function resetMetaballCache(): void {
    cachedFingerprint = '';
    cachedBlurFilter = null;
    cachedBlurStrength = -1;
    if (metaballLayer) {
        metaballLayer.removeFromParent();
        metaballLayer.destroy({ children: true });
        metaballLayer = null;
        territoryGraphics = null;
        borderGraphics = null;
    } else {
        if (territoryGraphics) {
            territoryGraphics.removeFromParent();
            territoryGraphics.destroy();
            territoryGraphics = null;
        }
        if (borderGraphics) {
            borderGraphics.removeFromParent();
            borderGraphics.destroy();
            borderGraphics = null;
        }
    }
}
