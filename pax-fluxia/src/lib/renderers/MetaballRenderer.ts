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
import {
    logPipelineStage,
    summarizeRendererMetrics,
    summarizeScene,
} from '$lib/perf/pipelineTelemetry';
import { measurePerf, recordPerfEvent } from '$lib/perf/perfProbe';
import type { StarState, StarConnection } from '$lib/types/game.types';
import { findConnectedClustersOptimized } from './territoryUtils';
import type { ColorUtils } from './RenderContext';
import { chaikinSmoothPolyline } from './geometry/chaikin';
import type {
    MetaballWorkerRequest,
    MetaballWorkerResponse,
    MetaballWorkerSample,
    MetaballWorkerStar,
} from './metaballGridWorkerTypes';
import { computeDisconnectVirtuals } from './territoryFeatures';
import { buildCorridorVirtualSites } from '$lib/territory/corridor/buildCorridorVirtualSites';
import { getLanePolyline } from '$lib/lanes/lanePolylineCache';
import {
    buildTerritoryGeometryCacheKeyParts,
    readNormalizedTerritoryGeometryTunables,
    type TerritoryGeometryTunables,
} from '$lib/territory/geometry/geometryTuning';

// ── Cache ──────────────────────────────────────────────────────────────────

let cachedFingerprint = '';
let metaballLayer: PIXI.Container | null = null;
let territorySprite: PIXI.Sprite | null = null;
let territoryTexture: PIXI.Texture | null = null;
let territoryTextureSource: PIXI.BufferImageSource | null = null;
let territoryPixelBuffer: Uint8Array | null = null;
let borderGraphics: PIXI.Graphics | null = null;
let cachedBlurFilter: PIXI.BlurFilter | null = null;
let cachedBlurStrength = -1;
let cachedGeomField: Float32Array | null = null;
let cachedRealField: Float32Array | null = null;
let cachedOwnerGridGeom: Int16Array | null = null;
let cachedMsrOwnerGrid: Int16Array | null = null;
let cachedColCenters: Float32Array | null = null;
let cachedRowCenters: Float32Array | null = null;
let cachedRowStart: Int32Array | null = null;
let cachedStaticGeomField: Float32Array | null = null;
let cachedStaticRealField: Float32Array | null = null;
let cachedDynamicGeomField: Float32Array | null = null;
let cachedDynamicRealField: Float32Array | null = null;
let cachedStaticFingerprint = '';
let cachedDynamicFingerprint = '';
let cachedGridCols = -1;
let cachedGridRows = -1;
let cachedGridCellSize = -1;
let cachedGridOriginX = 0;
let cachedGridOriginY = 0;

function readNormalizedGeometryTunables(): TerritoryGeometryTunables {
    return readNormalizedTerritoryGeometryTunables(
        GAME_CONFIG as unknown as Record<string, unknown>,
    );
}

type MetaballWorkerRuntimeState = {
    worker: Worker | null;
    activeRequestId: number;
    nextRequestId: number;
    activeFingerprint: string;
    loadedStaticFieldFingerprint: string;
    queuedRequest: MetaballWorkerRequest | null;
    latestResponse: MetaballWorkerResponse | null;
};

function createMetaballWorkerRuntimeState(): MetaballWorkerRuntimeState {
    return {
        worker: null,
        activeRequestId: 0,
        nextRequestId: 1,
        activeFingerprint: '',
        loadedStaticFieldFingerprint: '',
        queuedRequest: null,
        latestResponse: null,
    };
}

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
function ensureInt32Buffer(buf: Int32Array | null, length: number): Int32Array {
    return !buf || buf.length !== length ? new Int32Array(length) : buf;
}

function ensureUint8Buffer(buf: Uint8Array | null, length: number): Uint8Array {
    if (!buf || buf.length !== length) return new Uint8Array(length);
    buf.fill(0);
    return buf;
}

function ensureMetaballParenting(
    container: PIXI.Container,
    unifiedBlur: boolean,
    blurStrength: number,
): void {
    if (!territorySprite) territorySprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    if (!borderGraphics) borderGraphics = new PIXI.Graphics();

    const useLayer = unifiedBlur && blurStrength > 0;
    if (useLayer) {
        if (!metaballLayer) metaballLayer = new PIXI.Container();
        territorySprite.removeFromParent();
        borderGraphics.removeFromParent();
        metaballLayer.addChild(territorySprite);
        metaballLayer.addChild(borderGraphics);
        metaballLayer.removeFromParent();
        container.addChild(metaballLayer);
        metaballLayer.visible = true;
    } else {
        if (metaballLayer) {
            territorySprite.removeFromParent();
            borderGraphics.removeFromParent();
            metaballLayer.removeFromParent();
            metaballLayer.destroy({ children: false });
            metaballLayer = null;
        }
        territorySprite.removeFromParent();
        borderGraphics.removeFromParent();
        container.addChild(territorySprite);
        container.addChild(borderGraphics);
    }

    territorySprite.visible = true;
    borderGraphics.visible = true;
}

function ensureTerritoryTexture(
    cols: number,
    rows: number,
    cellSize: number,
    gridOriginX: number,
    gridOriginY: number,
): Uint8Array {
    const pixelCount = cols * rows * 4;
    const needsRebuild =
        !territoryTextureSource ||
        !territoryTexture ||
        !territorySprite ||
        cachedGridCols !== cols ||
        cachedGridRows !== rows;

    territoryPixelBuffer = ensureUint8Buffer(
        territoryPixelBuffer,
        pixelCount,
    );

    if (needsRebuild) {
        territoryTexture?.destroy(true);
        territoryTextureSource = new PIXI.BufferImageSource({
            resource: territoryPixelBuffer,
            width: cols,
            height: rows,
            format: 'rgba8unorm',
            alphaMode: 'no-premultiply-alpha',
            scaleMode: 'nearest',
            autoGarbageCollect: false,
        });
        territoryTexture = new PIXI.Texture({ source: territoryTextureSource });
        territorySprite ??= new PIXI.Sprite(territoryTexture);
        territorySprite.texture = territoryTexture;
    }
    const nextTextureSource = territoryTextureSource!;
    const nextTexture = territoryTexture!;
    const nextSprite = territorySprite!;
    nextTextureSource.resource = territoryPixelBuffer;

    nextSprite.position.set(gridOriginX, gridOriginY);
    nextSprite.scale.set(cellSize, cellSize);
    nextSprite.visible = true;
    nextSprite.texture = nextTexture;
    cachedGridCols = cols;
    cachedGridRows = rows;
    cachedGridCellSize = cellSize;
    cachedGridOriginX = gridOriginX;
    cachedGridOriginY = gridOriginY;

    return territoryPixelBuffer;
}

function uploadTerritoryTexture(): void {
    territoryTextureSource?.update();
}

export interface MetaballRenderOptions {
    /** When set, enables combat/recency border boosts from Star lastCombatTick / lastAttackTick */
    gameTick?: number;
    /** Explicit family-built influence scene; when present the renderer skips legacy sample discovery. */
    sceneInput?: MetaballSceneInput;
    /** Optional instance-owned runtime; when omitted the legacy singleton runtime is used. */
    runtime?: MetaballRendererRuntime;
    /** Optional metrics sink used by benchmark tooling. */
    metrics?: MetaballRenderMetrics;
}

export interface MetaballRenderMetrics {
    solveMs: number;
    textureUploadMs: number;
    borderMs: number;
    totalMs: number;
    reusedFingerprint: boolean;
    workerRequestMs?: number;
    workerPostMs?: number;
    workerCommitMs?: number;
    workerStaticCacheHit?: boolean;
    workerStaticBuildMs?: number;
    workerDynamicBuildMs?: number;
    workerClassificationMs?: number;
    workerStrokeBuildMs?: number;
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
    staticSamples?: ReadonlyArray<MetaballInfluenceSample>;
    dynamicSamples?: ReadonlyArray<MetaballInfluenceSample>;
    samples: ReadonlyArray<MetaballInfluenceSample>;
    staticFingerprint?: string;
    dynamicFingerprint?: string;
    sceneFingerprint?: string;
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
    connections: ReadonlyArray<StarConnection> | undefined,
    starById: Map<string, StarState>,
    clusterMap: ReadonlyMap<string, { clusterIdx: number; ownerId: string }>,
    strengthMult: number,
): MetaballInfluenceSample[] {
    const connectionList = connections ?? [];
    if (connectionList.length === 0) return [];
    const tunables = readNormalizedGeometryTunables();
    const corridorEnabled = tunables.corridorEnabled;
    const contestMidpointEnabled = tunables.cxContestMidpointVstars;
    if (!corridorEnabled && !contestMidpointEnabled) return [];

    const spacing = tunables.corridorSpacing;
    const cxCount = tunables.corridorCount;
    const cxWeight = tunables.corridorWeight;
    const cxContestPairWeight = tunables.cxContestPairWeight;
    const cxContestPairCount = tunables.cxContestPairCount;
    const cxContestPairSpacing = tunables.cxContestPairSpacing;

    const ownedStars = [...starById.values()].filter((s) => Boolean(s.ownerId));
    const sites = buildCorridorVirtualSites(
        [...ownedStars],
        [...connectionList],
        spacing,
        cxWeight,
        cxCount > 0 ? cxCount : undefined,
        getLanePolyline,
        contestMidpointEnabled,
        corridorEnabled,
        corridorEnabled,
        cxContestPairWeight,
        cxContestPairCount,
        cxContestPairSpacing,
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
    allStars: ReadonlyArray<StarState>,
    ownedStars: ReadonlyArray<StarState>,
    connections: ReadonlyArray<StarConnection> | undefined,
    clusterMap: ReadonlyMap<string, { clusterIdx: number; ownerId: string }>,
    strengthMult: number,
    starById: Map<string, StarState>,
): MetaballInfluenceSample[] {
    const tunables = readNormalizedGeometryTunables();
    if (!tunables.disconnectEnabled) return [];

    const connectionList = connections ?? [];
    const maxDist = tunables.disconnectDistance;
    const dxW = tunables.disconnectWeight;
    const virtuals = computeDisconnectVirtuals(
        [...ownedStars],
        [...allStars],
        [...connectionList],
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

function buildFingerprint(
    stars: ReadonlyArray<StarState>,
    gameTick: number | undefined,
    sceneFingerprint?: string,
): string {
    const tunables = readNormalizedGeometryTunables();
    let fp = '';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}:${shipInfluenceBucket(s)}:${combatActivityBucket(s, gameTick)}|`;
    }
    fp += `${GAME_CONFIG.METABALL_INFLUENCE_RADIUS}:${GAME_CONFIG.METABALL_FALLOFF}`;
    fp += `:${GAME_CONFIG.METABALL_BLEND_SHARPNESS}:${GAME_CONFIG.METABALL_ALPHA}`;
    fp += `:${GAME_CONFIG.METABALL_CELL_SIZE}:${GAME_CONFIG.METABALL_THRESHOLD}`;
    fp += `:${GAME_CONFIG.METABALL_STRENGTH_MULT}:${GAME_CONFIG.METABALL_EDGE_FADE}`;
    fp += `:${GAME_CONFIG.METABALL_COVERAGE}`;
    fp += `:${GAME_CONFIG.METABALL_BLUR}:${GAME_CONFIG.METABALL_BLUR_AFFECTS_BORDERS ? 1 : 0}:${GAME_CONFIG.TERRITORY_METABALL}`;
    fp += `:${GAME_CONFIG.METABALL_BORDER_WIDTH}:${GAME_CONFIG.METABALL_BORDER_ALPHA}`;
    fp += `:${GAME_CONFIG.METABALL_SATURATION}:${GAME_CONFIG.METABALL_LIGHTNESS}`;
    fp += `:${GAME_CONFIG.METABALL_BORDER_SATURATION}:${GAME_CONFIG.METABALL_BORDER_LIGHTNESS}`;
    fp += `:${GAME_CONFIG.METABALL_CHAIKIN_PASSES}`;
    fp += `:${GAME_CONFIG.METABALL_FILL_FOLLOWS_GEOM ? 1 : 0}`;
    fp += `:${GAME_CONFIG.METABALL_COMBAT_BORDER_TICKS}:${GAME_CONFIG.METABALL_COMBAT_BORDER_PROXIMITY_PX}`;
    fp += `:${GAME_CONFIG.METABALL_COMBAT_BORDER_WIDTH_BOOST}`;
    fp += `:${GAME_CONFIG.METABALL_COMBAT_BORDER_ALPHA_BOOST}:${GAME_CONFIG.METABALL_BORDER_FORCE_RATIO}`;
    fp += `:geom:${buildTerritoryGeometryCacheKeyParts(tunables).join(':')}`;
    if (sceneFingerprint) {
        fp += `:scene:${sceneFingerprint}`;
    }
    return fp;
}

export function buildMetaballCacheFingerprint(params: {
    stars: ReadonlyArray<StarState>;
    gameTick: number | undefined;
    sceneFingerprint?: string;
    sceneInfluenceRadiusPx?: number;
    sceneOwnershipMarginPx?: number;
}): string {
    let fingerprint = buildFingerprint(
        params.stars,
        params.gameTick,
        params.sceneFingerprint,
    );
    if (params.sceneInfluenceRadiusPx !== undefined) {
        fingerprint += `:sceneRadius:${Math.round(params.sceneInfluenceRadiusPx)}`;
    }
    if (params.sceneOwnershipMarginPx !== undefined) {
        fingerprint += `:sceneMargin:${Math.round(params.sceneOwnershipMarginPx)}`;
    }
    return fingerprint;
}

function buildColorFingerprint(
    stars: ReadonlyArray<StarState>,
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

function buildSampleFingerprint(
    samples: ReadonlyArray<MetaballInfluenceSample>,
    playerColors: ReadonlyArray<readonly [number, number, number]>,
    clusterShips: ArrayLike<number>,
): string {
    let fingerprint = '';
    for (let i = 0; i < playerColors.length; i++) {
        const color = playerColors[i] ?? [0, 0, 0];
        fingerprint += `c${i}:${color[0]}:${color[1]}:${color[2]}:${Math.round(
            clusterShips[i] ?? 0,
        )}|`;
    }
    return fingerprint + buildInfluenceFingerprint(samples);
}

function buildInfluenceFingerprint(
    samples: ReadonlyArray<MetaballInfluenceSample>,
): string {
    let fingerprint = '';
    for (const sample of samples) {
        fingerprint += `${sample.id ?? ''}:${sample.playerIdx}:${Math.round(
            sample.x * 10,
        )}:${Math.round(sample.y * 10)}:${Math.round(sample.strength * 1000)}:${
            sample.corridorVirtual ? 1 : 0
        }:${sample.disconnectVirtual ? 1 : 0}|`;
    }
    return fingerprint;
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
    ownedStars: ReadonlyArray<StarState>,
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

type MetaballRuntimeState = {
    cachedFingerprint: string;
    metaballLayer: PIXI.Container | null;
    territorySprite: PIXI.Sprite | null;
    territoryTexture: PIXI.Texture | null;
    territoryTextureSource: PIXI.BufferImageSource | null;
    territoryPixelBuffer: Uint8Array | null;
    borderGraphics: PIXI.Graphics | null;
    cachedBlurFilter: PIXI.BlurFilter | null;
    cachedBlurStrength: number;
    cachedGeomField: Float32Array | null;
    cachedRealField: Float32Array | null;
    cachedOwnerGridGeom: Int16Array | null;
    cachedMsrOwnerGrid: Int16Array | null;
    cachedColCenters: Float32Array | null;
    cachedRowCenters: Float32Array | null;
    cachedRowStart: Int32Array | null;
    cachedStaticGeomField: Float32Array | null;
    cachedStaticRealField: Float32Array | null;
    cachedDynamicGeomField: Float32Array | null;
    cachedDynamicRealField: Float32Array | null;
    cachedStaticFingerprint: string;
    cachedDynamicFingerprint: string;
    cachedGridCols: number;
    cachedGridRows: number;
    cachedGridCellSize: number;
    cachedGridOriginX: number;
    cachedGridOriginY: number;
};

function createRuntimeState(): MetaballRuntimeState {
    return {
        cachedFingerprint: '',
        metaballLayer: null,
        territorySprite: null,
        territoryTexture: null,
        territoryTextureSource: null,
        territoryPixelBuffer: null,
        borderGraphics: null,
        cachedBlurFilter: null,
        cachedBlurStrength: -1,
        cachedGeomField: null,
        cachedRealField: null,
        cachedOwnerGridGeom: null,
        cachedMsrOwnerGrid: null,
        cachedColCenters: null,
        cachedRowCenters: null,
        cachedRowStart: null,
        cachedStaticGeomField: null,
        cachedStaticRealField: null,
        cachedDynamicGeomField: null,
        cachedDynamicRealField: null,
        cachedStaticFingerprint: '',
        cachedDynamicFingerprint: '',
        cachedGridCols: -1,
        cachedGridRows: -1,
        cachedGridCellSize: -1,
        cachedGridOriginX: 0,
        cachedGridOriginY: 0,
    };
}

function readRuntimeState(): MetaballRuntimeState {
    return {
        cachedFingerprint,
        metaballLayer,
        territorySprite,
        territoryTexture,
        territoryTextureSource,
        territoryPixelBuffer,
        borderGraphics,
        cachedBlurFilter,
        cachedBlurStrength,
        cachedGeomField,
        cachedRealField,
        cachedOwnerGridGeom,
        cachedMsrOwnerGrid,
        cachedColCenters,
        cachedRowCenters,
        cachedRowStart,
        cachedStaticGeomField,
        cachedStaticRealField,
        cachedDynamicGeomField,
        cachedDynamicRealField,
        cachedStaticFingerprint,
        cachedDynamicFingerprint,
        cachedGridCols,
        cachedGridRows,
        cachedGridCellSize,
        cachedGridOriginX,
        cachedGridOriginY,
    };
}

function writeRuntimeState(state: MetaballRuntimeState): void {
    cachedFingerprint = state.cachedFingerprint;
    metaballLayer = state.metaballLayer;
    territorySprite = state.territorySprite;
    territoryTexture = state.territoryTexture;
    territoryTextureSource = state.territoryTextureSource;
    territoryPixelBuffer = state.territoryPixelBuffer;
    borderGraphics = state.borderGraphics;
    cachedBlurFilter = state.cachedBlurFilter;
    cachedBlurStrength = state.cachedBlurStrength;
    cachedGeomField = state.cachedGeomField;
    cachedRealField = state.cachedRealField;
    cachedOwnerGridGeom = state.cachedOwnerGridGeom;
    cachedMsrOwnerGrid = state.cachedMsrOwnerGrid;
    cachedColCenters = state.cachedColCenters;
    cachedRowCenters = state.cachedRowCenters;
    cachedRowStart = state.cachedRowStart;
    cachedStaticGeomField = state.cachedStaticGeomField;
    cachedStaticRealField = state.cachedStaticRealField;
    cachedDynamicGeomField = state.cachedDynamicGeomField;
    cachedDynamicRealField = state.cachedDynamicRealField;
    cachedStaticFingerprint = state.cachedStaticFingerprint;
    cachedDynamicFingerprint = state.cachedDynamicFingerprint;
    cachedGridCols = state.cachedGridCols;
    cachedGridRows = state.cachedGridRows;
    cachedGridCellSize = state.cachedGridCellSize;
    cachedGridOriginX = state.cachedGridOriginX;
    cachedGridOriginY = state.cachedGridOriginY;
}

export class MetaballRendererRuntime {
    private state: MetaballRuntimeState = createRuntimeState();
    private workerState: MetaballWorkerRuntimeState =
        createMetaballWorkerRuntimeState();

    activate(): void {
        writeRuntimeState(this.state);
    }

    capture(): void {
        this.state = readRuntimeState();
    }

    getWorkerState(): MetaballWorkerRuntimeState {
        return this.workerState;
    }

    dispose(): void {
        this.activate();
        resetMetaballCacheInternal();
        this.capture();
        this.workerState.worker?.terminate();
        this.workerState = createMetaballWorkerRuntimeState();
    }
}

const defaultMetaballRuntime = new MetaballRendererRuntime();

export function createMetaballRuntime(): MetaballRendererRuntime {
    return new MetaballRendererRuntime();
}

function accumulateSamplesIntoFields(params: {
    samples: ReadonlyArray<MetaballInfluenceSample>;
    geomField: Float32Array;
    realField: Float32Array;
    numPlayers: number;
    cols: number;
    rows: number;
    gridOriginX: number;
    gridOriginY: number;
    cellSize: number;
    radius: number;
    colCenters: Float32Array;
    rowCenters: Float32Array;
    rowStart: Int32Array;
    falloffType: string;
}): void {
    const radius = params.radius;
    const radiusCutoff = radius * 2;
    const radiusCutoffSq = radiusCutoff * radiusCutoff;
    const numPlayers = params.numPlayers;
    const colCenters = params.colCenters;
    const rowCenters = params.rowCenters;
    const rowStart = params.rowStart;
    const geomField = params.geomField;
    const realField = params.realField;
    const falloffType = params.falloffType;
    const inverseRadiusSq = radius > 0 ? 1 / (radius * radius) : 0;
    const gaussianSigma = radius / 1.2;
    const gaussianExponentScale =
        gaussianSigma > 0 ? -0.5 / (gaussianSigma * gaussianSigma) : 0;
    const smoothstepRadius = radius * 1.5;
    const inverseSmoothstepRadius =
        smoothstepRadius > 0 ? 1 / smoothstepRadius : 0;

    for (let sampleIdx = 0; sampleIdx < params.samples.length; sampleIdx++) {
        const sample = params.samples[sampleIdx]!;
        const minCol = Math.max(
            0,
            Math.floor(
                (sample.x - radiusCutoff - params.gridOriginX) / params.cellSize,
            ),
        );
        const maxCol = Math.min(
            params.cols - 1,
            Math.floor(
                (sample.x + radiusCutoff - params.gridOriginX) / params.cellSize,
            ),
        );
        const minRow = Math.max(
            0,
            Math.floor(
                (sample.y - radiusCutoff - params.gridOriginY) / params.cellSize,
            ),
        );
        const maxRow = Math.min(
            params.rows - 1,
            Math.floor(
                (sample.y + radiusCutoff - params.gridOriginY) / params.cellSize,
            ),
        );
        const playerIdx = sample.playerIdx;
        const isVirtual = sample.corridorVirtual || sample.disconnectVirtual;
        if (falloffType === 'gaussian') {
            for (let row = minRow; row <= maxRow; row++) {
                const py = rowCenters[row]!;
                const rowOffset = rowStart[row]!;
                const dy = py - sample.y;
                const dy2 = dy * dy;
                let fieldOffset = (rowOffset + minCol) * numPlayers + playerIdx;
                if (isVirtual) {
                    for (let col = minCol; col <= maxCol; col++, fieldOffset += numPlayers) {
                        const dx = colCenters[col]! - sample.x;
                        const dist2 = dx * dx + dy2;
                        if (dist2 > radiusCutoffSq) continue;
                        geomField[fieldOffset] +=
                            Math.exp(dist2 * gaussianExponentScale) * sample.strength;
                    }
                    continue;
                }
                for (let col = minCol; col <= maxCol; col++, fieldOffset += numPlayers) {
                    const dx = colCenters[col]! - sample.x;
                    const dist2 = dx * dx + dy2;
                    if (dist2 > radiusCutoffSq) continue;
                    const value =
                        Math.exp(dist2 * gaussianExponentScale) * sample.strength;
                    geomField[fieldOffset] += value;
                    realField[fieldOffset] += value;
                }
            }
            continue;
        }
        if (falloffType === 'inverse-square') {
            for (let row = minRow; row <= maxRow; row++) {
                const py = rowCenters[row]!;
                const rowOffset = rowStart[row]!;
                const dy = py - sample.y;
                const dy2 = dy * dy;
                let fieldOffset = (rowOffset + minCol) * numPlayers + playerIdx;
                if (isVirtual) {
                    for (let col = minCol; col <= maxCol; col++, fieldOffset += numPlayers) {
                        const dx = colCenters[col]! - sample.x;
                        const dist2 = dx * dx + dy2;
                        if (dist2 > radiusCutoffSq) continue;
                        geomField[fieldOffset] +=
                            sample.strength / (1 + dist2 * inverseRadiusSq);
                    }
                    continue;
                }
                for (let col = minCol; col <= maxCol; col++, fieldOffset += numPlayers) {
                    const dx = colCenters[col]! - sample.x;
                    const dist2 = dx * dx + dy2;
                    if (dist2 > radiusCutoffSq) continue;
                    const value =
                        sample.strength / (1 + dist2 * inverseRadiusSq);
                    geomField[fieldOffset] += value;
                    realField[fieldOffset] += value;
                }
            }
            continue;
        }
        for (let row = minRow; row <= maxRow; row++) {
            const py = rowCenters[row]!;
            const dy = py - sample.y;
            const dy2 = dy * dy;
            const rowOffset = rowStart[row]!;
            let fieldOffset = (rowOffset + minCol) * numPlayers + playerIdx;
            if (isVirtual) {
                for (let col = minCol; col <= maxCol; col++, fieldOffset += numPlayers) {
                    const dx = colCenters[col]! - sample.x;
                    const dist2 = dx * dx + dy2;
                    if (dist2 > radiusCutoffSq) continue;
                    const t = Math.max(
                        0,
                        Math.min(1, 1 - Math.sqrt(dist2) * inverseSmoothstepRadius),
                    );
                    geomField[fieldOffset] +=
                        t * t * (3 - 2 * t) * sample.strength;
                }
                continue;
            }
            for (let col = minCol; col <= maxCol; col++, fieldOffset += numPlayers) {
                const dx = colCenters[col]! - sample.x;
                const dist2 = dx * dx + dy * dy;
                if (dist2 > radiusCutoffSq) continue;
                const t = Math.max(
                    0,
                    Math.min(1, 1 - Math.sqrt(dist2) * inverseSmoothstepRadius),
                );
                const value = t * t * (3 - 2 * t) * sample.strength;
                geomField[fieldOffset] += value;
                realField[fieldOffset] += value;
            }
        }
    }
}

function resolveCombinedCellWinner(
    primaryField: Float32Array | null,
    secondaryField: Float32Array | null,
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

    const readValue = (playerIdx: number): number =>
        (primaryField ? primaryField[offset + playerIdx] : 0) +
        (secondaryField ? secondaryField[offset + playerIdx] : 0);

    if (forcedPlayer >= 0) {
        maxInf = readValue(forcedPlayer);
        for (let p = 0; p < numPlayers; p++) {
            if (p === forcedPlayer) continue;
            const value = readValue(p);
            if (value > secondInf) {
                secondInf = value;
                secondPlayer = p;
            }
        }
    } else {
        for (let p = 0; p < numPlayers; p++) {
            const value = readValue(p);
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

function shouldUseMetaballWorker(): boolean {
    return typeof window !== 'undefined' && typeof Worker !== 'undefined';
}

function ensureMetaballWorker(runtime: MetaballRendererRuntime): Worker | null {
    if (!shouldUseMetaballWorker()) return null;
    const workerState = runtime.getWorkerState();
    if (workerState.worker) return workerState.worker;
    const worker = new Worker(
        new URL('./metaballGrid.worker.ts', import.meta.url),
        { type: 'module' },
    );
    worker.onmessage = (event: MessageEvent<MetaballWorkerResponse>) => {
        const response = event.data;
        workerState.latestResponse = response;
        if (workerState.activeRequestId === response.requestId) {
            workerState.activeRequestId = 0;
            workerState.activeFingerprint = '';
        }
        if (workerState.queuedRequest) {
            const nextRequest = workerState.queuedRequest;
            workerState.queuedRequest = null;
            workerState.activeRequestId = nextRequest.requestId;
            workerState.activeFingerprint = nextRequest.fingerprint;
            worker.postMessage(nextRequest);
        }
    };
    worker.onerror = (event: ErrorEvent) => {
        recordPerfEvent('territory.metaballRenderer.workerError', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
        });
        workerState.worker = null;
        workerState.activeRequestId = 0;
        workerState.activeFingerprint = '';
        workerState.loadedStaticFieldFingerprint = '';
        workerState.queuedRequest = null;
        workerState.latestResponse = null;
    };
    workerState.worker = worker;
    return worker;
}

function toWorkerSample(sample: MetaballInfluenceSample): MetaballWorkerSample {
    return {
        id: sample.id,
        x: sample.x,
        y: sample.y,
        playerIdx: sample.playerIdx,
        strength: sample.strength,
        corridorVirtual: sample.corridorVirtual,
        disconnectVirtual: sample.disconnectVirtual,
    };
}

function buildWorkerOwnedStars(
    ownedStars: ReadonlyArray<StarState>,
    clusterMap: ReadonlyMap<string, { clusterIdx: number }>,
): MetaballWorkerStar[] {
    const workerStars: MetaballWorkerStar[] = [];
    for (const star of ownedStars) {
        const clusterIdx = clusterMap.get(star.id)?.clusterIdx;
        if (clusterIdx === undefined || clusterIdx < 0) continue;
        workerStars.push({
            x: star.x,
            y: star.y,
            clusterIdx,
            lastCombatTick: star.lastCombatTick,
            lastAttackTick: star.lastAttackTick,
        });
    }
    return workerStars;
}

function buildMetaballWorkerRequest(params: {
    requestId: number;
    fingerprint: string;
    staticFieldFingerprint: string;
    dynamicFieldFingerprint: string;
    includeStaticSamples: boolean;
    worldWidth: number;
    worldHeight: number;
    gameTick: number | undefined;
    radius: number;
    falloffType: string;
    sharpness: number;
    alpha: number;
    cellSize: number;
    dominanceFilterOn: boolean;
    dominanceMinActive: number;
    edgeFade: number;
    borderWidth: number;
    borderAlpha: number;
    fillSatMult: number;
    fillLightMult: number;
    fillFollowsGeom: boolean;
    borderSatMult: number;
    borderLightMult: number;
    chaikinPasses: number;
    combatTicks: number;
    combatWBoost: number;
    combatABoost: number;
    forceRatioScale: number;
    combatProximityPx: number;
    msrPx: number;
    coverage: number;
    playerColors: [number, number, number][];
    clusterShips: ArrayLike<number>;
    ownedStars: ReadonlyArray<StarState>;
    clusterMap: ReadonlyMap<string, { clusterIdx: number }>;
    staticSamples: ReadonlyArray<MetaballInfluenceSample>;
    dynamicSamples: ReadonlyArray<MetaballInfluenceSample>;
}): MetaballWorkerRequest {
    return {
        requestId: params.requestId,
        fingerprint: params.fingerprint,
        staticFieldFingerprint: params.staticFieldFingerprint,
        dynamicFieldFingerprint: params.dynamicFieldFingerprint,
        config: {
            worldWidth: params.worldWidth,
            worldHeight: params.worldHeight,
            gameTick: params.gameTick,
            radius: params.radius,
            falloffType: params.falloffType,
            sharpness: params.sharpness,
            alpha: params.alpha,
            cellSize: params.cellSize,
            dominanceFilterOn: params.dominanceFilterOn,
            dominanceMinActive: params.dominanceMinActive,
            edgeFade: params.edgeFade,
            borderWidth: params.borderWidth,
            borderAlpha: params.borderAlpha,
            fillSatMult: params.fillSatMult,
            fillLightMult: params.fillLightMult,
            fillFollowsGeom: params.fillFollowsGeom,
            borderSatMult: params.borderSatMult,
            borderLightMult: params.borderLightMult,
            chaikinPasses: params.chaikinPasses,
            combatTicks: params.combatTicks,
            combatWBoost: params.combatWBoost,
            combatABoost: params.combatABoost,
            forceRatioScale: params.forceRatioScale,
            combatProximityPx: params.combatProximityPx,
            msrPx: params.msrPx,
            coverage: params.coverage,
        },
        playerColors: params.playerColors.map((color) => [color[0], color[1], color[2]]),
        clusterShips: Array.from(params.clusterShips, (ships) => Number(ships ?? 0)),
        ownedStars: buildWorkerOwnedStars(params.ownedStars, params.clusterMap),
        staticSamples: params.includeStaticSamples
            ? params.staticSamples.map(toWorkerSample)
            : null,
        dynamicSamples: params.dynamicSamples.map(toWorkerSample),
    };
}

function enqueueMetaballWorkerRequest(
    runtime: MetaballRendererRuntime,
    request: MetaballWorkerRequest,
): void {
    const worker = ensureMetaballWorker(runtime);
    if (!worker) return;
    const workerState = runtime.getWorkerState();
    if (workerState.activeFingerprint === request.fingerprint) return;
    if (workerState.queuedRequest?.fingerprint === request.fingerprint) return;
    if (workerState.activeRequestId !== 0) {
        workerState.queuedRequest = request;
        if (request.staticSamples) {
            workerState.loadedStaticFieldFingerprint = request.staticFieldFingerprint;
        }
        logPipelineStage({
            channel: 'renderer',
            context: 'MetaballRenderer',
            stage: 'worker_request_queued',
            from: 'MetaballSceneInput',
            to: 'Queued worker request',
            purpose: 'Hold the newest metaball solve request while a previous worker solve is still active',
            perfEventName: 'territory.metaballRenderer.workerRequestQueued',
            perfDetail: {
                requestId: request.requestId,
                fingerprint: request.fingerprint,
                staticSampleCount: request.staticSamples?.length ?? 0,
                dynamicSampleCount: request.dynamicSamples.length,
            },
            logDetail: {
                requestId: request.requestId,
                fingerprint: request.fingerprint,
                staticFieldFingerprint: request.staticFieldFingerprint,
                dynamicFieldFingerprint: request.dynamicFieldFingerprint,
                config: request.config,
                staticSamples: request.staticSamples,
                dynamicSamples: request.dynamicSamples,
                ownedStars: request.ownedStars,
            },
        });
        return;
    }
    workerState.activeRequestId = request.requestId;
    workerState.activeFingerprint = request.fingerprint;
    if (request.staticSamples) {
        workerState.loadedStaticFieldFingerprint = request.staticFieldFingerprint;
    }
    logPipelineStage({
        channel: 'renderer',
        context: 'MetaballRenderer',
        stage: 'worker_request_posted',
        from: 'MetaballSceneInput',
        to: 'Metaball grid worker',
        purpose: 'Dispatch the latest cached scene field to the worker for async solve and stroke extraction',
        perfEventName: 'territory.metaballRenderer.workerRequestPosted',
        perfDetail: {
            requestId: request.requestId,
            fingerprint: request.fingerprint,
            staticSampleCount: request.staticSamples?.length ?? 0,
            dynamicSampleCount: request.dynamicSamples.length,
        },
        logDetail: {
            requestId: request.requestId,
            fingerprint: request.fingerprint,
            staticFieldFingerprint: request.staticFieldFingerprint,
            dynamicFieldFingerprint: request.dynamicFieldFingerprint,
            config: request.config,
            playerColors: request.playerColors,
            clusterShips: request.clusterShips,
            ownedStars: request.ownedStars,
            staticSamples: request.staticSamples,
            dynamicSamples: request.dynamicSamples,
        },
    });
    worker.postMessage(request);
}

function commitMetaballWorkerResponse(
    response: MetaballWorkerResponse,
    metrics: MetaballRenderMetrics,
): void {
    if (!territorySprite || !borderGraphics) return;
    const textureUploadStart = performance.now();
    const territoryPixels = ensureTerritoryTexture(
        response.cols,
        response.rows,
        response.cellSize,
        response.gridOriginX,
        response.gridOriginY,
    );
    territoryPixels.set(new Uint8Array(response.pixels));
    uploadTerritoryTexture();
    metrics.textureUploadMs = performance.now() - textureUploadStart;

    const borderDrawStart = performance.now();
    borderGraphics.clear();
    for (const stroke of response.strokes) {
        borderGraphics.beginPath();
        let drewStroke = false;
        for (const path of stroke.paths) {
            if (path.length < 4) continue;
            drewStroke = true;
            borderGraphics.moveTo(path[0]!, path[1]!);
            for (let index = 2; index < path.length; index += 2) {
                borderGraphics.lineTo(path[index]!, path[index + 1]!);
            }
        }
        if (drewStroke) {
            borderGraphics.stroke({
                width: stroke.width,
                color: stroke.color,
                alpha: stroke.alpha,
                cap: 'butt',
                join: 'miter',
                miterLimit: 10,
            });
        }
    }
    metrics.borderMs = response.borderMs + (performance.now() - borderDrawStart);
    metrics.solveMs = response.solveMs;
    metrics.workerStaticCacheHit = response.staticCacheHit;
    metrics.workerStaticBuildMs = response.staticBuildMs;
    metrics.workerDynamicBuildMs = response.dynamicBuildMs;
    metrics.workerClassificationMs = response.classificationMs;
    metrics.workerStrokeBuildMs = response.strokeBuildMs;
    logPipelineStage({
        channel: 'renderer',
        context: 'MetaballRenderer',
        stage: 'worker_response_commit',
        from: 'Metaball grid worker',
        to: 'Texture upload + border graphics',
        purpose: 'Commit the solved worker field into the Pixi fill texture and stroke layer',
        summary: summarizeRendererMetrics(metrics),
        perfEventName: 'territory.metaballRenderer.workerResponseCommitted',
        perfDetail: {
            requestId: response.requestId,
            fingerprint: response.fingerprint,
            cellCount: response.cellCount,
            staticCacheHit: response.staticCacheHit,
            textureUploadMs: metrics.textureUploadMs,
            borderMs: metrics.borderMs,
            solveMs: metrics.solveMs,
        },
        logDetail: {
            requestId: response.requestId,
            fingerprint: response.fingerprint,
            cols: response.cols,
            rows: response.rows,
            cellSize: response.cellSize,
            gridOriginX: response.gridOriginX,
            gridOriginY: response.gridOriginY,
            cellCount: response.cellCount,
            numPlayers: response.numPlayers,
            staticSampleCount: response.staticSampleCount,
            dynamicSampleCount: response.dynamicSampleCount,
            staticCacheHit: response.staticCacheHit,
            staticBuildMs: response.staticBuildMs,
            dynamicBuildMs: response.dynamicBuildMs,
            classificationMs: response.classificationMs,
            strokeBuildMs: response.strokeBuildMs,
            metrics,
            strokes: response.strokes.map((stroke) => ({
                color: stroke.color,
                alpha: stroke.alpha,
                width: stroke.width,
                pathCount: stroke.paths.length,
            })),
        },
    });
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Svelte-friendly entry: explicit 7th arg avoids `.svelte` checkers that mishandle
 * optional trailing option bags on `renderMetaball`.
 */
export function renderMetaballScene(
    stars: ReadonlyArray<StarState>,
    container: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections: ReadonlyArray<StarConnection> | undefined,
    gameTick: number | undefined,
): void {
    defaultMetaballRuntime.activate();
    renderMetaballImpl(
        stars,
        container,
        colorUtils,
        worldWidth,
        worldHeight,
        connections,
        { gameTick },
        defaultMetaballRuntime,
    );
    defaultMetaballRuntime.capture();
}

export function renderMetaball(
    stars: ReadonlyArray<StarState>,
    container: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections?: ReadonlyArray<StarConnection>,
    options?: MetaballRenderOptions,
): void {
    const runtime = options?.runtime ?? defaultMetaballRuntime;
    runtime.activate();
    renderMetaballImpl(
        stars,
        container,
        colorUtils,
        worldWidth,
        worldHeight,
        connections,
        options,
        runtime,
    );
    runtime.capture();
}

function renderMetaballImpl(
    stars: ReadonlyArray<StarState>,
    container: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections?: ReadonlyArray<StarConnection>,
    options?: MetaballRenderOptions,
    runtime: MetaballRendererRuntime = defaultMetaballRuntime,
): void {
    const sceneInput = options?.sceneInput;
    const metrics = options?.metrics ?? {
        solveMs: 0,
        textureUploadMs: 0,
        borderMs: 0,
        totalMs: 0,
        reusedFingerprint: false,
    };
    const totalStart = performance.now();
    metrics.solveMs = 0;
    metrics.textureUploadMs = 0;
    metrics.borderMs = 0;
    metrics.totalMs = 0;
    metrics.reusedFingerprint = false;
    metrics.workerRequestMs = 0;
    metrics.workerPostMs = 0;
    metrics.workerCommitMs = 0;
    metrics.workerStaticCacheHit = undefined;
    metrics.workerStaticBuildMs = 0;
    metrics.workerDynamicBuildMs = 0;
    metrics.workerClassificationMs = 0;
    metrics.workerStrokeBuildMs = 0;
    const show =
        Boolean(sceneInput) ||
        GAME_CONFIG.TERRITORY_RENDER_MODE === 'metaball' ||
        GAME_CONFIG.TERRITORY_METABALL;
    const gameTick = options?.gameTick;
    const blurStrengthCfg = Math.max(0, GAME_CONFIG.METABALL_BLUR ?? 0);
    const blurUnifiesBorders = !!GAME_CONFIG.METABALL_BLUR_AFFECTS_BORDERS;

    if (!show) {
        if (metaballLayer) metaballLayer.visible = false;
        if (territorySprite) territorySprite.visible = false;
        if (borderGraphics) borderGraphics.visible = false;
        return;
    }

    ensureMetaballParenting(container, blurUnifiesBorders, blurStrengthCfg);
    if (!territorySprite || !borderGraphics) return;

    const fingerprint =
        buildFingerprint(
            stars,
            gameTick,
            sceneInput?.sceneFingerprint ?? sceneInput?.fingerprint,
        ) +
        `:${worldWidth}:${worldHeight}` +
        `:colors:${buildColorFingerprint(stars, colorUtils)}`;
    if (fingerprint === cachedFingerprint) {
        metrics.reusedFingerprint = true;
        metrics.totalMs = performance.now() - totalStart;
        logPipelineStage({
            channel: 'renderer',
            context: 'MetaballRenderer',
            stage: 'render_skip',
            from: 'Scene fingerprint',
            to: 'Existing GPU resources',
            purpose: 'Reuse cached metaball presentation when scene fingerprint is unchanged',
            summary:
                `${summarizeScene(sceneInput ?? {})} ` +
                summarizeRendererMetrics(metrics),
            perfEventName: 'territory.metaball.rendererSkipped',
        });
        applyBlurFilter();
        return;
    }
    const ownedStars = sceneInput
        ? sceneInput.ownedStars
        : stars.filter((s) => s.ownerId);
    if (ownedStars.length === 0) {
        if (metaballLayer) metaballLayer.visible = false;
        else {
            territorySprite.visible = false;
            borderGraphics!.visible = false;
        }
        logPipelineStage({
            channel: 'renderer',
            context: 'MetaballRenderer',
            stage: 'render_empty',
            from: 'Scene input',
            to: 'Hidden territory layer',
            purpose: 'Skip render work when there are no owned stars to visualize',
            summary: summarizeScene(sceneInput ?? {}),
            perfEventName: 'territory.metaball.rendererEmpty',
        });
        return;
    }

    const solveStart = performance.now();
    const radius = sceneInput?.influenceRadiusPx ?? GAME_CONFIG.METABALL_INFLUENCE_RADIUS ?? 120;
    const falloffType = GAME_CONFIG.METABALL_FALLOFF ?? 'inverse-square';
    const sharpness = GAME_CONFIG.METABALL_BLEND_SHARPNESS ?? 3.0;
    const alpha = GAME_CONFIG.METABALL_ALPHA ?? 0.5;
    const cellSize = GAME_CONFIG.METABALL_CELL_SIZE ?? 8;
    const rawDominanceThresh = GAME_CONFIG.METABALL_THRESHOLD ?? 0.52;
    /** ≤0.5 disables filter; above 0.5 requires winner share of (w1+w2) at least this */
    const dominanceFilterOn = rawDominanceThresh > 0.5 + 1e-9;
    const dominanceMinActive = dominanceFilterOn
        ? Math.min(0.999, Math.max(0.5000001, rawDominanceThresh))
        : 0;
    const strengthMult = GAME_CONFIG.METABALL_STRENGTH_MULT ?? 1.0;
    const edgeFade = GAME_CONFIG.METABALL_EDGE_FADE ?? 3.0;
    const borderWidth = GAME_CONFIG.METABALL_BORDER_WIDTH ?? 1.5;
    const borderAlpha = GAME_CONFIG.METABALL_BORDER_ALPHA ?? 0.6;
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
        : findConnectedClustersOptimized(
              [...ownedStars],
              connections ? [...connections] : [],
              starById,
          );

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
        ? sceneInput.clusterShips
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

    const cellCount = cols * rows;
    const gridFieldSize = cellCount * Math.max(1, numClusters);
    const gridShapeChanged =
        cachedGridCols !== cols ||
        cachedGridRows !== rows ||
        cachedGridCellSize !== cellSize ||
        Math.abs(cachedGridOriginX - gridOriginX) > 1e-6 ||
        Math.abs(cachedGridOriginY - gridOriginY) > 1e-6;
    const numPlayers = numClusters;

    const staticSamples: ReadonlyArray<MetaballInfluenceSample> =
        sceneInput?.staticSamples ??
        (sceneInput
            ? sceneInput.samples
            : (() => {
                  const data: MetaballInfluenceSample[] = ownedStars.map((s) => ({
                      id: `star:${s.id}`,
                      x: s.x,
                      y: s.y,
                      playerIdx: clusterMap.get(s.id)?.clusterIdx ?? 0,
                      strength: computeMetaballStarStrength(s, strengthMult),
                  }));
                  data.push(
                      ...buildCorridorSamples(
                          connections,
                          starById,
                          clusterMap,
                          strengthMult,
                      ),
                  );
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
              })());
    const dynamicSamples: ReadonlyArray<MetaballInfluenceSample> =
        sceneInput?.dynamicSamples ?? [];
    const staticFieldFingerprint = buildInfluenceFingerprint(staticSamples);
    const dynamicFieldFingerprint =
        dynamicSamples.length > 0 ? buildInfluenceFingerprint(dynamicSamples) : '';

    if (shouldUseMetaballWorker()) {
        const workerState = runtime.getWorkerState();
        const requestId = workerState.nextRequestId++;
        const includeStaticSamples =
            workerState.loadedStaticFieldFingerprint !== staticFieldFingerprint;
        const workerRequestStart = performance.now();
        const workerRequest = measurePerf(
            'territory.metaballRenderer.workerBuildRequest',
            () =>
                buildMetaballWorkerRequest({
                    requestId,
                    fingerprint,
                    staticFieldFingerprint,
                    dynamicFieldFingerprint,
                    includeStaticSamples,
                    worldWidth,
                    worldHeight,
                    gameTick,
                    radius,
                    falloffType,
                    sharpness,
                    alpha,
                    cellSize,
                    dominanceFilterOn,
                    dominanceMinActive,
                    edgeFade,
                    borderWidth,
                    borderAlpha,
                    fillSatMult,
                    fillLightMult,
                    fillFollowsGeom,
                    borderSatMult,
                    borderLightMult,
                    chaikinPasses,
                    combatTicks,
                    combatWBoost,
                    combatABoost,
                    forceRatioScale,
                    combatProximityPx,
                    msrPx,
                    coverage,
                    playerColors,
                    clusterShips,
                    ownedStars,
                    clusterMap,
                    staticSamples,
                    dynamicSamples,
                }),
            {
                includeStaticSamples,
                staticSamples: staticSamples.length,
                dynamicSamples: dynamicSamples.length,
            },
        );
        metrics.workerRequestMs = performance.now() - workerRequestStart;
        const workerPostStart = performance.now();
        measurePerf(
            'territory.metaballRenderer.workerPostMessage',
            () => enqueueMetaballWorkerRequest(runtime, workerRequest),
            {
                includeStaticSamples,
                staticSamples: staticSamples.length,
                dynamicSamples: dynamicSamples.length,
            },
        );
        metrics.workerPostMs = performance.now() - workerPostStart;

        const readyResponse = workerState.latestResponse;
        if (readyResponse && readyResponse.fingerprint === fingerprint) {
            const workerCommitStart = performance.now();
            measurePerf(
                'territory.metaballRenderer.workerCommit',
                () => commitMetaballWorkerResponse(readyResponse, metrics),
                {
                    staticCacheHit: readyResponse.staticCacheHit,
                    staticBuildMs: readyResponse.staticBuildMs,
                    dynamicBuildMs: readyResponse.dynamicBuildMs,
                    classificationMs: readyResponse.classificationMs,
                    strokeBuildMs: readyResponse.strokeBuildMs,
                },
            );
            metrics.workerCommitMs = performance.now() - workerCommitStart;
            cachedFingerprint = fingerprint;
            workerState.latestResponse = null;
            applyBlurFilter();
            metrics.totalMs = performance.now() - totalStart;
            recordPerfEvent('territory.metaballRenderer.workerSolve', {
                staticCacheHit: readyResponse.staticCacheHit,
                staticBuildMs: readyResponse.staticBuildMs,
                dynamicBuildMs: readyResponse.dynamicBuildMs,
                classificationMs: readyResponse.classificationMs,
                strokeBuildMs: readyResponse.strokeBuildMs,
                solveMs: readyResponse.solveMs,
                borderMs: readyResponse.borderMs,
                workerRequestMs: metrics.workerRequestMs,
                workerPostMs: metrics.workerPostMs,
                workerCommitMs: metrics.workerCommitMs,
                staticSamples: readyResponse.staticSampleCount,
                dynamicSamples: readyResponse.dynamicSampleCount,
            });
            logPipelineStage({
                channel: 'renderer',
                context: 'MetaballRenderer',
                stage: 'render_commit',
                from: 'MetaballSceneInput',
                to: 'Texture sprite + border graphics',
                purpose: 'Commit worker-solved territory presentation on the main thread',
                summary:
                    `${summarizeScene(sceneInput ?? {})} ` +
                    summarizeRendererMetrics(metrics),
                perfEventName: 'territory.metaball.rendererCommitted',
                detail: {
                    worldWidth,
                    worldHeight,
                    workerSolve: 1,
                    cellCount: readyResponse.cellCount,
                    staticSamples: readyResponse.staticSampleCount,
                    dynamicSamples: readyResponse.dynamicSampleCount,
                },
            });
            return;
        }

        metrics.totalMs = performance.now() - totalStart;
        logPipelineStage({
            channel: 'renderer',
            context: 'MetaballRenderer',
            stage: 'render_deferred',
            from: 'MetaballSceneInput',
            to: 'Worker solve queue',
            purpose: 'Defer expensive metaball solve to a worker so input and UI remain responsive',
            summary:
                `${summarizeScene(sceneInput ?? {})} ` +
                summarizeRendererMetrics(metrics),
            detail: {
                worldWidth,
                worldHeight,
                activeRequestId: workerState.activeRequestId,
                queuedFingerprint: workerState.queuedRequest?.fingerprint ?? null,
            },
        });
        applyBlurFilter();
        return;
    }

    const ownerGridGeom = ensureInt16Buffer(cachedOwnerGridGeom, cellCount, -1);
    cachedOwnerGridGeom = ownerGridGeom;
    const colCenters = ensureCenters(cachedColCenters, cols, gridOriginX, cellSize);
    cachedColCenters = colCenters;
    const rowCenters = ensureCenters(cachedRowCenters, rows, gridOriginY, cellSize);
    cachedRowCenters = rowCenters;
    const rowStart = ensureInt32Buffer(cachedRowStart, rows);
    for (let row = 0; row < rows; row++) rowStart[row] = row * cols;
    cachedRowStart = rowStart;
    const geomField = ensureFloatBuffer(cachedGeomField, gridFieldSize);
    cachedGeomField = geomField;
    const realField = ensureFloatBuffer(cachedRealField, gridFieldSize);
    cachedRealField = realField;
    const msrOwnerGrid =
        msrPx > 0
            ? ensureInt16Buffer(cachedMsrOwnerGrid, cellCount, -1)
            : null;
    if (msrOwnerGrid) cachedMsrOwnerGrid = msrOwnerGrid;

    const rebuildStaticField =
        gridShapeChanged ||
        !cachedStaticGeomField ||
        !cachedStaticRealField ||
        cachedStaticGeomField.length !== gridFieldSize ||
        cachedStaticRealField.length !== gridFieldSize ||
        cachedStaticFingerprint !== staticFieldFingerprint;
    if (rebuildStaticField) {
        cachedStaticGeomField = ensureFloatBuffer(cachedStaticGeomField, gridFieldSize);
        cachedStaticRealField = ensureFloatBuffer(cachedStaticRealField, gridFieldSize);
        accumulateSamplesIntoFields({
            samples: staticSamples,
            geomField: cachedStaticGeomField,
            realField: cachedStaticRealField,
            numPlayers,
            cols,
            rows,
            gridOriginX,
            gridOriginY,
            cellSize,
            radius,
            colCenters,
            rowCenters,
            rowStart,
            falloffType,
        });
        cachedStaticFingerprint = staticFieldFingerprint;
    }

    const rebuildDynamicField =
        gridShapeChanged ||
        !cachedDynamicGeomField ||
        !cachedDynamicRealField ||
        cachedDynamicGeomField.length !== gridFieldSize ||
        cachedDynamicRealField.length !== gridFieldSize ||
        cachedDynamicFingerprint !== dynamicFieldFingerprint;
    if (rebuildDynamicField) {
        cachedDynamicGeomField = ensureFloatBuffer(cachedDynamicGeomField, gridFieldSize);
        cachedDynamicRealField = ensureFloatBuffer(cachedDynamicRealField, gridFieldSize);
        if (dynamicSamples.length > 0) {
            accumulateSamplesIntoFields({
                samples: dynamicSamples,
                geomField: cachedDynamicGeomField,
                realField: cachedDynamicRealField,
                numPlayers,
                cols,
                rows,
                gridOriginX,
                gridOriginY,
                cellSize,
                radius,
                colCenters,
                rowCenters,
                rowStart,
                falloffType,
            });
        }
        cachedDynamicFingerprint = dynamicFieldFingerprint;
    }

    const staticGeomField = cachedStaticGeomField!;
    const staticRealField = cachedStaticRealField!;
    const dynamicGeomField = cachedDynamicGeomField!;
    const dynamicRealField = cachedDynamicRealField!;
    for (let i = 0; i < gridFieldSize; i++) {
        geomField[i] = staticGeomField[i] + dynamicGeomField[i];
        realField[i] = staticRealField[i] + dynamicRealField[i];
    }

    const territoryPixels = ensureTerritoryTexture(
        cols,
        rows,
        cellSize,
        gridOriginX,
        gridOriginY,
    );
    borderGraphics.clear();
    territoryPixels.fill(0);

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

            const pixelOffset = idx * 4;
            territoryPixels[pixelOffset] = Math.max(0, Math.min(255, Math.round(r)));
            territoryPixels[pixelOffset + 1] = Math.max(
                0,
                Math.min(255, Math.round(g)),
            );
            territoryPixels[pixelOffset + 2] = Math.max(
                0,
                Math.min(255, Math.round(b)),
            );
            territoryPixels[pixelOffset + 3] = Math.max(
                0,
                Math.min(255, Math.round(fadeAlpha * 255)),
            );
        }
    }

    metrics.solveMs = performance.now() - solveStart;
    const textureUploadStart = performance.now();
    uploadTerritoryTexture();
    metrics.textureUploadMs = performance.now() - textureUploadStart;

    const borderStart = performance.now();
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
    metrics.borderMs = performance.now() - borderStart;

    cachedFingerprint = fingerprint;
    applyBlurFilter();
    metrics.totalMs = performance.now() - totalStart;
    logPipelineStage({
        channel: 'renderer',
        context: 'MetaballRenderer',
        stage: 'render_commit',
        from: 'MetaballSceneInput',
        to: 'Texture sprite + border graphics',
        purpose: 'Solve grid ownership field and upload visual presentation',
        summary:
            `${summarizeScene(sceneInput ?? {})} ` +
            summarizeRendererMetrics(metrics),
        perfEventName: 'territory.metaball.rendererCommitted',
        detail: {
            worldWidth,
            worldHeight,
        },
    });
}

function applyBlurFilter(): void {
    const blurStrength = Math.max(0, GAME_CONFIG.METABALL_BLUR ?? 0);
    const unified = !!GAME_CONFIG.METABALL_BLUR_AFFECTS_BORDERS;

    if (blurStrength <= 0) {
        if (territorySprite) territorySprite.filters = [];
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
        if (territorySprite) territorySprite.filters = [];
    } else {
        if (metaballLayer) metaballLayer.filters = [];
        if (territorySprite) territorySprite.filters = [cachedBlurFilter!];
    }
}

function resetMetaballCacheInternal(): void {
    cachedFingerprint = '';
    cachedBlurFilter = null;
    cachedBlurStrength = -1;
    cachedGeomField = null;
    cachedRealField = null;
    cachedOwnerGridGeom = null;
    cachedMsrOwnerGrid = null;
    cachedColCenters = null;
    cachedRowCenters = null;
    cachedRowStart = null;
    cachedStaticGeomField = null;
    cachedStaticRealField = null;
    cachedDynamicGeomField = null;
    cachedDynamicRealField = null;
    cachedStaticFingerprint = '';
    cachedDynamicFingerprint = '';
    cachedGridCols = -1;
    cachedGridRows = -1;
    cachedGridCellSize = -1;
    cachedGridOriginX = 0;
    cachedGridOriginY = 0;
    territoryPixelBuffer = null;
    territoryTextureSource = null;
    territoryTexture?.destroy(true);
    territoryTexture = null;
    if (metaballLayer) {
        metaballLayer.removeFromParent();
        metaballLayer.destroy({ children: true });
        metaballLayer = null;
        territorySprite = null;
        borderGraphics = null;
    } else {
        if (territorySprite) {
            territorySprite.removeFromParent();
            territorySprite.destroy();
            territorySprite = null;
        }
        if (borderGraphics) {
            borderGraphics.removeFromParent();
            borderGraphics.destroy();
            borderGraphics = null;
        }
    }
}

export function resetMetaballCache(): void {
    defaultMetaballRuntime.activate();
    resetMetaballCacheInternal();
    defaultMetaballRuntime.capture();
}
