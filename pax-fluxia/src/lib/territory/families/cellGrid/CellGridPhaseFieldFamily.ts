import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarState } from '$lib/types/game.types';
import { adjustColorHSL, blendColors } from '$lib/utils/colorUtils';
import type {
    ResolvedGeometrySnapshot,
} from '../../contracts/GeometryContracts';
import { normalizePerimeterFieldGeometrySource } from '../../geometry/geometrySource';
import {
    buildOwnershipSnapshotFromStars,
    buildPerimeterFieldRenderFamilyGeometry,
} from '../buildFamilyGeometry';
import {
    readConstraintAlignedTerritoryGeometryFromSnapshot,
    resolveConstraintAlignedTerritoryGeometry,
    type ConstraintAlignedTerritoryGeometry,
    type ConstraintAlignedFrontierPolyline,
} from '../../geometry/resolveConstraintAlignedTerritoryGeometry';
import { buildInsetTerritoryRegions } from '../../geometry/buildInsetTerritoryRegions';
import type {
    RenderFamily,
    RenderFamilyInput,
    RenderFamilyOutput,
} from '../RenderFamilyTypes';
import { buildGridClassification } from './buildGridClassification';
import {
    computeDualPassBlendAlphas,
    findActiveFrontierRange,
} from './cellGridActiveFrontier';
import {
    computeSharedBoundaryCornerRadius,
    trimOpenPolylineEndpoints,
} from './edgeShaping';
import {
    resetCellGridStats,
    updateCellGridStats,
} from './cellGridStats';
import { cellGridPhaseFieldModeDefaults } from './config';
import type {
    GridAdjacency,
    GridClassification,
    GridDistribution,
    GridFlipTransition,
    GridOriginMode,
    GridOwnedStar,
    GridRenderCell,
    GridVStar,
    GridWaveGeometry,
    GridWavePlan,
    GridWaveSeeding,
} from './cellGridTypes';
import {
    buildCellGridPlanKey,
    summarizeCellGridFrontier,
} from './cellGridRuntime';
import { planGridWave } from './planGridWave';
import { renderCellGridScene } from './renderCellGridScene';

type GridCellShape = 'square' | 'circle' | 'diamond' | 'hex';
type GridBorderMode = 'off' | 'per_cell' | 'territory_edge';
type GridWaveEase =
    | 'linear'
    | 'ease_in'
    | 'ease_out'
    | 'ease_in_out'
    | 'back_out'
    | 'elastic_out';

const SQRT3 = Math.sqrt(3);

const HEX_VERTICES_POINTY: ReadonlyArray<readonly [number, number]> = (() => {
    const out: Array<[number, number]> = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        out.push([Math.sin(angle), -Math.cos(angle)]);
    }
    return out;
})();

const CELL_GRID_PHASE_FIELD_TUNABLE_KEYS = [
    'CELL_GRID_SPACING_PX',
    'CELL_GRID_PATTERN_SPACING_PX',
    'CELL_GRID_ORIGIN_MODE',
    'CELL_GRID_DISTRIBUTION',
    'CELL_GRID_POSITION_JITTER',
    'CELL_GRID_MAX_CELLS',
    'CELL_GRID_INWARD_OFFSET_PX',
    'CELL_GRID_CELL_SHAPE',
    'CELL_GRID_CELL_INSET_PX',
    'CELL_GRID_CELL_CORNER_PX',
    'CELL_GRID_BORDER_MODE',
    'CELL_GRID_BORDER_BLEND',
    'CELL_GRID_EDGE_SMOOTHING_PASSES',
    'CELL_GRID_EDGE_TRIM_PX',
    'CELL_GRID_BORDER_CHAIKIN_PASSES',
    'CELL_GRID_ADJACENCY',
    'CELL_GRID_WAVE_GEOMETRY',
    'CELL_GRID_WAVE_SEEDING',
    'CELL_GRID_FLIP_TRANSITION',
    'CELL_GRID_FLIP_WINDOW',
    'CELL_GRID_WAVE_EASE',
    'CELL_GRID_FLIP_WINDOW_JITTER',
    'CELL_GRID_PHASE_FIELD_FINISH_FADE_START',
    'CELL_GRID_PHASE_FIELD_FINISH_FADE_END',
    'CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_START',
    'CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_END',
    'CELL_GRID_PHASE_FIELD_FINAL_CELL_SIZE_PX',
    'CELL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT',
    'CELL_GRID_PHASE_FIELD_FRONTIER_FADE_START',
    'CELL_GRID_PHASE_FIELD_FRONTIER_FADE_END',
    'TERRITORY_SURFACE_BORDER_ENABLED',
    'TERRITORY_SURFACE_BORDER_WIDTH',
    'TERRITORY_SURFACE_SATURATION',
    'TERRITORY_SURFACE_LIGHTNESS',
    'TERRITORY_SURFACE_ALPHA',
    'TERRITORY_SURFACE_BORDER_ALPHA',
    'TERRITORY_SURFACE_BORDER_SATURATION',
    'TERRITORY_SURFACE_BORDER_LIGHTNESS',
    'PERIMETER_FIELD_GEOMETRY_SOURCE',
] as const;

const PROGRESS_QUANT_STEPS = 2048;

interface PhaseFieldPlanSettings {
    readonly spacingPx: number;
    readonly originMode: GridOriginMode;
    readonly distribution: GridDistribution;
    readonly positionJitter: number;
    readonly maxCells: number;
    readonly adjacency: GridAdjacency;
    readonly waveGeometry: GridWaveGeometry;
    readonly waveSeeding: GridWaveSeeding;
    readonly geometrySource: string | null;
}

interface CachedPlan {
    readonly planKey: string;
    readonly classification: GridClassification;
    readonly wavePlan: GridWavePlan;
    readonly prevGeometry: ResolvedGeometrySnapshot;
    readonly prevOwnedStars: readonly GridOwnedStar[];
    readonly nextOwnedStars: readonly GridOwnedStar[];
    readonly prevResolvedGeometry: ConstraintAlignedTerritoryGeometry;
    readonly nextResolvedGeometry: ConstraintAlignedTerritoryGeometry;
    readonly classificationBuildMs: number;
    readonly wavePlanBuildMs: number;
    readonly planBuildMs: number;
    readonly nextGeometryRef: ResolvedGeometrySnapshot;
}

interface CachedPatternClassification {
    readonly key: string;
    readonly classification: GridClassification;
}

type GeometryFillSource = Pick<ConstraintAlignedTerritoryGeometry, 'territoryRegions'>;
type OwnershipSide = 'prev' | 'next';

function clamp01(value: number): number {
    return value < 0 ? 0 : value > 1 ? 1 : value;
}

function normalizeWindow(value: number, start: number, end: number): number {
    const clampedValue = clamp01(value);
    const clampedStart = clamp01(start);
    const clampedEnd = clamp01(end);
    if (clampedEnd <= clampedStart) {
        return clampedValue >= clampedEnd ? 1 : 0;
    }
    return clamp01((clampedValue - clampedStart) / (clampedEnd - clampedStart));
}

function smoothstep01(value: number): number {
    const t = clamp01(value);
    return t * t * (3 - 2 * t);
}

function lerp(from: number, to: number, t: number): number {
    return from + (to - from) * t;
}

function quantizePatternSpacingPx(raw: number): number {
    const clamped = Math.max(1, Math.min(64, Math.round(raw)));
    if (clamped <= 24) return clamped;
    return Math.max(24, Math.min(64, 24 + Math.round((clamped - 24) / 4) * 4));
}

function quantProgress(value: number): number {
    if (!Number.isFinite(value)) return 0;
    if (value <= 0) return 0;
    if (value >= 1) return PROGRESS_QUANT_STEPS;
    return Math.round(value * PROGRESS_QUANT_STEPS);
}

function easeProgress(ease: GridWaveEase, t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    switch (ease) {
        case 'linear':
            return t;
        case 'ease_in':
            return t * t;
        case 'ease_out':
            return 1 - (1 - t) * (1 - t);
        case 'ease_in_out':
            return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) * (-2 * t + 2) / 2;
        case 'back_out': {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        }
        case 'elastic_out': {
            const c4 = (2 * Math.PI) / 3;
            return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        }
    }
}

function hash01(id: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) {
        h ^= id.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return ((h >>> 0) % 100000) / 100000;
}

function applyFlipTimeJitter(
    wavePlan: GridWavePlan,
    jitterAmount: number,
): GridWavePlan {
    if (jitterAmount <= 0 || wavePlan.flipTimeByVId.size === 0) {
        return wavePlan;
    }
    const shifted = new Map<string, number>();
    for (const [vId, t] of wavePlan.flipTimeByVId) {
        const jitter = (hash01(vId) * 2 - 1) * jitterAmount;
        const next = t + jitter;
        shifted.set(vId, next < 0 ? 0 : next > 1 ? 1 : next);
    }
    return {
        perEvent: wavePlan.perEvent,
        flipTimeByVId: shifted,
        orderedTransitionVIds: wavePlan.orderedTransitionVIds,
        orderedFlipTimes: wavePlan.orderedFlipTimes,
    };
}

function readTunableNumber(
    input: RenderFamilyInput,
    key: string,
    fallback: number,
): number {
    const value = input.tunables.get(key);
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : fallback;
}

function readTunableBoolean(
    input: RenderFamilyInput,
    key: string,
    fallback: boolean,
): boolean {
    const value = input.tunables.get(key);
    return typeof value === 'boolean' ? value : fallback;
}

function readTunableString<T extends string>(
    input: RenderFamilyInput,
    key: string,
    fallback: T,
    allowed: readonly T[],
): T {
    const value = input.tunables.get(key);
    if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
        return value as T;
    }
    return fallback;
}

function spacingToDensityCellsPerMpx(spacingPx: number): number {
    if (!Number.isFinite(spacingPx) || spacingPx <= 0) return 0;
    return 1_000_000 / (spacingPx * spacingPx);
}

function buildSessionKey(input: RenderFamilyInput): string {
    const starIds = [...input.stars]
        .map((star) => star.id)
        .sort((a, b) => a.localeCompare(b))
        .join('|');
    return `${input.world.width}x${input.world.height}:${starIds}`;
}

function buildTransitionKey(input: RenderFamilyInput): string {
    return input.activeTransition?.sessionKey ?? 'steady';
}

function revertStarsWithEvents(
    stars: ReadonlyArray<StarState>,
    events: ReadonlyArray<{ event: { starId: string; previousOwner: string } }>,
): StarState[] {
    const overrides = new Map<string, string>();
    for (const entry of events) {
        overrides.set(entry.event.starId, entry.event.previousOwner);
    }
    return stars.map((star) => {
        const ownerId = overrides.get(star.id);
        return ownerId === undefined ? { ...star } : { ...star, ownerId };
    });
}

function revertStarsForTransition(input: RenderFamilyInput): StarState[] {
    return revertStarsWithEvents(input.stars, input.activeTransition?.events ?? []);
}

function toOwnedStars(stars: ReadonlyArray<StarState>): GridOwnedStar[] {
    const out: GridOwnedStar[] = [];
    for (const star of stars) {
        if (star.ownerId !== null && star.ownerId !== undefined) {
            out.push({
                id: star.id,
                ownerId: star.ownerId,
                x: star.x,
                y: star.y,
            });
        }
    }
    return out;
}

function createPersistentRenderTexture(
    width: number,
    height: number,
): PIXI.RenderTexture {
    const texture = PIXI.RenderTexture.create({
        width: Math.max(1, Math.ceil(width)),
        height: Math.max(1, Math.ceil(height)),
        resolution: 1,
    });
    const source = texture.source as { scaleMode?: string; autoGarbageCollect?: boolean };
    if (source) {
        source.scaleMode = 'nearest';
        source.autoGarbageCollect = false;
    }
    return texture;
}

function drawFilledGridCell(
    graphics: PIXI.Graphics,
    cellShape: GridCellShape,
    x: number,
    y: number,
    half: number,
    size: number,
    cornerR: number,
    hexR: number,
    fillHex: number,
    alpha: number,
): void {
    if (alpha <= 0) return;
    if (cellShape === 'circle') {
        graphics.circle(x, y, half).fill({ color: fillHex, alpha });
        return;
    }
    if (cellShape === 'diamond') {
        graphics
            .poly([x, y - half, x + half, y, x, y + half, x - half, y])
            .fill({ color: fillHex, alpha });
        return;
    }
    if (cellShape === 'hex') {
        const pts: number[] = [];
        for (let i = 0; i < 6; i++) {
            pts.push(
                x + HEX_VERTICES_POINTY[i][0] * hexR,
                y + HEX_VERTICES_POINTY[i][1] * hexR,
            );
        }
        graphics.poly(pts).fill({ color: fillHex, alpha });
        return;
    }
    if (cornerR > 0) {
        graphics.roundRect(x - half, y - half, size, size, cornerR).fill({
            color: fillHex,
            alpha,
        });
        return;
    }
    graphics.rect(x - half, y - half, size, size).fill({ color: fillHex, alpha });
}

function drawStrokedGridCell(
    graphics: PIXI.Graphics,
    cellShape: GridCellShape,
    x: number,
    y: number,
    half: number,
    size: number,
    cornerR: number,
    hexR: number,
    strokeHex: number,
    alpha: number,
    width: number,
): void {
    if (alpha <= 0 || width <= 0) return;
    const strokeOpts = {
        color: strokeHex,
        alpha,
        width,
        cap: 'round' as const,
        join: 'round' as const,
    };
    if (cellShape === 'circle') {
        graphics.circle(x, y, half).stroke(strokeOpts);
        return;
    }
    if (cellShape === 'diamond') {
        graphics
            .poly([x, y - half, x + half, y, x, y + half, x - half, y])
            .stroke(strokeOpts);
        return;
    }
    if (cellShape === 'hex') {
        const pts: number[] = [];
        for (let i = 0; i < 6; i++) {
            pts.push(
                x + HEX_VERTICES_POINTY[i][0] * hexR,
                y + HEX_VERTICES_POINTY[i][1] * hexR,
            );
        }
        graphics.poly(pts).stroke(strokeOpts);
        return;
    }
    if (cornerR > 0) {
        graphics.roundRect(x - half, y - half, size, size, cornerR).stroke(strokeOpts);
        return;
    }
    graphics.rect(x - half, y - half, size, size).stroke(strokeOpts);
}

function chaikinOnce(pts: number[], closed: boolean): number[] {
    const n = pts.length >> 1;
    if (n < 3) return pts.slice();
    const out: number[] = [];
    const last = closed ? n : n - 1;
    if (!closed) out.push(pts[0], pts[1]);
    for (let i = 0; i < last; i++) {
        const i0 = i * 2;
        const i1 = ((i + 1) % n) * 2;
        const x0 = pts[i0];
        const y0 = pts[i0 + 1];
        const x1 = pts[i1];
        const y1 = pts[i1 + 1];
        out.push(
            x0 + 0.25 * (x1 - x0),
            y0 + 0.25 * (y1 - y0),
            x0 + 0.75 * (x1 - x0),
            y0 + 0.75 * (y1 - y0),
        );
    }
    if (!closed) out.push(pts[pts.length - 2], pts[pts.length - 1]);
    return out;
}

function chaikinSmooth(pts: number[], passes: number, closed: boolean): number[] {
    let current = pts;
    for (let i = 0; i < passes; i++) {
        current = chaikinOnce(current, closed);
    }
    return current;
}

function drawGeometryFill(params: {
    graphics: PIXI.Graphics;
    geometry: GeometryFillSource;
    resolveColor: (ownerId: string) => number;
    alpha: number;
}): void {
    const { graphics, geometry, resolveColor, alpha } = params;
    graphics.clear();
    for (const region of geometry.territoryRegions) {
        if (region.points.length < 3) continue;
        const color = resolveColor(region.ownerId);
        graphics.beginPath();
        graphics.moveTo(region.points[0][0], region.points[0][1]);
        for (let i = 1; i < region.points.length; i++) {
            graphics.lineTo(region.points[i][0], region.points[i][1]);
        }
        graphics.closePath();
        graphics.fill({ color, alpha });
    }
}

function drawResolvedBorderPolyline(params: {
    graphics: PIXI.Graphics;
    polyline: ConstraintAlignedFrontierPolyline;
    color: number;
    width: number;
    alpha: number;
}): void {
    const { graphics, polyline, color, width, alpha } = params;
    if (polyline.points.length < 2 || width <= 0 || alpha <= 0) return;
    graphics.beginPath();
    graphics.moveTo(polyline.points[0][0], polyline.points[0][1]);
    for (let i = 1; i < polyline.points.length; i++) {
        graphics.lineTo(polyline.points[i][0], polyline.points[i][1]);
    }
    if (polyline.closed) {
        graphics.lineTo(polyline.points[0][0], polyline.points[0][1]);
    }
    graphics.stroke({
        color,
        alpha,
        width,
        alignment: polyline.kind === 'world' ? 1 : 0.5,
        cap: 'round',
        join: 'round',
    });
}

function isPrevSideCell(
    cell: GridRenderCell,
    vstar: GridVStar | undefined,
    ownerColorIdx: ReadonlyMap<string, number>,
): boolean {
    if (!vstar || vstar.prevOwnerId === null) return false;
    const prevIdx = ownerColorIdx.get(vstar.prevOwnerId);
    if (prevIdx === undefined) return false;
    if (cell.pass === 'prev') return true;
    if (cell.pass === 'next') return false;
    return cell.colorIdx === prevIdx;
}

function buildRoleCounts(classification: GridClassification): Record<string, number> {
    return {
        native: classification.byRole.native.length,
        dispossessed: classification.byRole.dispossessed.length,
        emergent: classification.byRole.emergent.length,
        vacating: classification.byRole.vacating.length,
        outside: classification.byRole.outside.length,
    };
}

function buildOwnershipSceneCells(params: {
    classification: GridClassification;
    ownerColorIdx: ReadonlyMap<string, number>;
    side: OwnershipSide;
}): GridRenderCell[] {
    const cells: GridRenderCell[] = [];
    for (const vstar of params.classification.emittableVstars) {
        const ownerId =
            params.side === 'prev' ? vstar.prevOwnerId : vstar.nextOwnerId;
        if (!ownerId) continue;
        const colorIdx = params.ownerColorIdx.get(ownerId);
        if (colorIdx === undefined) continue;
        cells.push({
            vId: vstar.id,
            ix: vstar.ix,
            iy: vstar.iy,
            x: vstar.x,
            y: vstar.y,
            colorIdx,
            alpha: 1,
            strength: 1,
            pass: 'single',
            role: vstar.role,
        });
    }
    return cells;
}

function paintCellScene(params: {
    graphics: PIXI.Graphics;
    sceneCells: readonly GridRenderCell[];
    fillHexByColorIdx: readonly number[];
    cellShape: GridCellShape;
    cellSpacingPx: number;
    cellInsetPx: number;
    cellCornerPx: number;
    alphaMultiplier: number;
}): number {
    const g = params.graphics;
    g.clear();

    if (params.sceneCells.length === 0 || params.alphaMultiplier <= 0) {
        return 0;
    }

    const spacingPx = params.cellSpacingPx;
    const insetMax = spacingPx * 0.45;
    const cellInset = Math.min(params.cellInsetPx, insetMax);
    const cellSize = Math.max(1, spacingPx - cellInset * 2);
    const cellHalf = cellSize * 0.5;
    const cellCornerR =
        params.cellShape === 'square'
            ? Math.min(params.cellCornerPx, Math.max(0, cellHalf - 0.5))
            : 0;
    const cellHexR = cellSize / SQRT3;

    let painted = 0;
    for (const cell of params.sceneCells) {
        if (cell.alpha <= 0) continue;
        const fillHex = params.fillHexByColorIdx[cell.colorIdx];
        if (fillHex === undefined) continue;
        drawFilledGridCell(
            g,
            params.cellShape,
            cell.x,
            cell.y,
            cellHalf,
            cellSize,
            cellCornerR,
            cellHexR,
            fillHex,
            clamp01(cell.alpha * params.alphaMultiplier),
        );
        painted += 1;
    }

    return painted;
}

function buildTransitionCellMetrics(params: {
    schedulerSpacingPx: number;
    cellShape: GridCellShape;
    cellCornerPx: number;
    finalCellSizePx: number;
    finishSizeMix: number;
}): {
    size: number;
    half: number;
    cornerR: number;
    hexR: number;
} {
    const baseSize = Math.max(1, params.schedulerSpacingPx);
    const collapsedSize = Math.min(baseSize, Math.max(1, params.finalCellSizePx));
    const size = Math.max(1, lerp(baseSize, collapsedSize, params.finishSizeMix));
    const half = size * 0.5;
    const cornerR =
        params.cellShape === 'square'
            ? Math.min(params.cellCornerPx, Math.max(0, half - 0.5))
            : 0;
    return {
        size,
        half,
        cornerR,
        hexR: size / SQRT3,
    };
}

export class CellGridPhaseFieldFamily implements RenderFamily {
    readonly id = 'phase_field';
    readonly label = 'Cell Grid Phase Field';
    readonly tunableKeys: readonly string[] = CELL_GRID_PHASE_FIELD_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly baseMaskGraphics = new PIXI.Graphics();
    private readonly baseGraphics = new PIXI.Graphics();
    private readonly fallbackOverlayGraphics = new PIXI.Graphics();
    private readonly borderGraphics = new PIXI.Graphics();
    private readonly frontierGraphics = new PIXI.Graphics();
    private readonly prevSourceContainer = new PIXI.Container();
    private readonly prevSourceGraphics = new PIXI.Graphics();
    private readonly prevSourceMaskGraphics = new PIXI.Graphics();
    private readonly nextSourceContainer = new PIXI.Container();
    private readonly nextSourceGraphics = new PIXI.Graphics();
    private readonly nextSourceMaskGraphics = new PIXI.Graphics();
    private readonly maskSourceContainer = new PIXI.Container();
    private readonly maskSourceGraphics = new PIXI.Graphics();
    private readonly prevSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    private readonly nextSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    private readonly maskSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    private readonly colorUtils: ColorUtils;
    private readonly fillMaskGeometryCache = new WeakMap<
        ConstraintAlignedTerritoryGeometry,
        Map<string, GeometryFillSource>
    >();

    private prevTexture: PIXI.RenderTexture | null = null;
    private nextTexture: PIXI.RenderTexture | null = null;
    private maskTexture: PIXI.RenderTexture | null = null;
    private textureWidth = 0;
    private textureHeight = 0;
    private sessionKey: string | null = null;
    private cachedPlan: CachedPlan | null = null;
    private cachedPatternClassification: CachedPatternClassification | null = null;
    private lastPlanParamsKey: string | null = null;
    private lastPaintSig: string | null = null;
    private lastPrevTextureSig: string | null = null;
    private lastNextTextureSig: string | null = null;
    private lastMaskTextureSig: string | null = null;
    private emaUpdateMs = 0;
    private frameCount = 0;
    private skippedFrameCount = 0;
    private lastDebugSnapshot: Record<string, unknown> | null = null;

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
        this.baseGraphics.mask = this.baseMaskGraphics;
        this.prevSourceGraphics.mask = this.prevSourceMaskGraphics;
        this.nextSourceGraphics.mask = this.nextSourceMaskGraphics;
        this.prevSourceContainer.addChild(this.prevSourceMaskGraphics);
        this.prevSourceContainer.addChild(this.prevSourceGraphics);
        this.nextSourceContainer.addChild(this.nextSourceMaskGraphics);
        this.nextSourceContainer.addChild(this.nextSourceGraphics);
        this.maskSourceContainer.addChild(this.maskSourceGraphics);
        this.prevSprite.mask = this.maskSprite;

        this.root.addChild(this.baseMaskGraphics);
        this.root.addChild(this.baseGraphics);
        this.root.addChild(this.fallbackOverlayGraphics);
        this.root.addChild(this.nextSprite);
        this.root.addChild(this.prevSprite);
        this.root.addChild(this.maskSprite);
        this.root.addChild(this.borderGraphics);
        this.root.addChild(this.frontierGraphics);
    }

    get displayRoot(): PIXI.Container {
        return this.root;
    }

    getDebugSnapshot(): Record<string, unknown> | null {
        return this.lastDebugSnapshot;
    }

    private resetState(): void {
        this.cachedPlan = null;
        this.cachedPatternClassification = null;
        this.lastPlanParamsKey = null;
        this.lastPaintSig = null;
        this.lastPrevTextureSig = null;
        this.lastNextTextureSig = null;
        this.lastMaskTextureSig = null;
        this.emaUpdateMs = 0;
        this.frameCount = 0;
        this.skippedFrameCount = 0;
        this.lastDebugSnapshot = null;
        this.destroyTextures();
        resetCellGridStats();
    }

    private destroyTextures(): void {
        this.prevTexture?.destroy(true);
        this.nextTexture?.destroy(true);
        this.maskTexture?.destroy(true);
        this.prevTexture = null;
        this.nextTexture = null;
        this.maskTexture = null;
        this.textureWidth = 0;
        this.textureHeight = 0;
    }

    private ensureTextures(width: number, height: number): void {
        const nextWidth = Math.max(1, Math.ceil(width));
        const nextHeight = Math.max(1, Math.ceil(height));
        if (
            this.prevTexture &&
            this.nextTexture &&
            this.maskTexture &&
            this.textureWidth === nextWidth &&
            this.textureHeight === nextHeight
        ) {
            return;
        }
        this.destroyTextures();
        this.prevTexture = createPersistentRenderTexture(nextWidth, nextHeight);
        this.nextTexture = createPersistentRenderTexture(nextWidth, nextHeight);
        this.maskTexture = createPersistentRenderTexture(nextWidth, nextHeight);
        this.textureWidth = nextWidth;
        this.textureHeight = nextHeight;
        this.prevSprite.texture = this.prevTexture;
        this.nextSprite.texture = this.nextTexture;
        this.maskSprite.texture = this.maskTexture;
        this.prevSprite.position.set(0, 0);
        this.nextSprite.position.set(0, 0);
        this.maskSprite.position.set(0, 0);
    }

    private readPlanSettings(input: RenderFamilyInput): PhaseFieldPlanSettings {
        return {
            spacingPx: Math.max(
                4,
                readTunableNumber(
                    input,
                    'CELL_GRID_SPACING_PX',
                    GAME_CONFIG.CELL_GRID_SPACING_PX ?? 32,
                ),
            ),
            originMode: readTunableString<GridOriginMode>(
                input,
                'CELL_GRID_ORIGIN_MODE',
                (GAME_CONFIG.CELL_GRID_ORIGIN_MODE as GridOriginMode | undefined) ??
                    'centered',
                ['centered', 'corner'],
            ),
            distribution: readTunableString<GridDistribution>(
                input,
                'CELL_GRID_DISTRIBUTION',
                (GAME_CONFIG.CELL_GRID_DISTRIBUTION as GridDistribution | undefined) ??
                    'square',
                ['square', 'hex_offset', 'jittered'],
            ),
            positionJitter: Math.max(
                0,
                Math.min(
                    0.5,
                    readTunableNumber(
                        input,
                        'CELL_GRID_POSITION_JITTER',
                        GAME_CONFIG.CELL_GRID_POSITION_JITTER ?? 0,
                    ),
                ),
            ),
            maxCells: Math.max(
                0,
                Math.round(
                    readTunableNumber(
                        input,
                        'CELL_GRID_MAX_CELLS',
                        GAME_CONFIG.CELL_GRID_MAX_CELLS ?? 0,
                    ),
                ),
            ),
            adjacency: readTunableString<GridAdjacency>(
                input,
                'CELL_GRID_ADJACENCY',
                (GAME_CONFIG.CELL_GRID_ADJACENCY as GridAdjacency | undefined) ?? '8',
                ['4', '8'],
            ),
            waveGeometry: readTunableString<GridWaveGeometry>(
                input,
                'CELL_GRID_WAVE_GEOMETRY',
                (GAME_CONFIG.CELL_GRID_WAVE_GEOMETRY as GridWaveGeometry | undefined) ??
                    'pre_to_post_frontier',
                [
                    'grid_bfs',
                    'euclidean_band',
                    'conquered_star_radial',
                    'pre_to_post_frontier',
                ],
            ),
            waveSeeding: readTunableString<GridWaveSeeding>(
                input,
                'CELL_GRID_WAVE_SEEDING',
                (GAME_CONFIG.CELL_GRID_WAVE_SEEDING as GridWaveSeeding | undefined) ??
                    'winner_natives',
                [
                    'winner_natives',
                    'conquered_star_center',
                    'winner_nearest_edge',
                ],
            ),
            geometrySource: normalizePerimeterFieldGeometrySource(
                input.configSource?.PERIMETER_FIELD_GEOMETRY_SOURCE ??
                    GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE,
            ),
        };
    }

    private buildCachedPlan(
        input: RenderFamilyInput,
        currentGeometry: ResolvedGeometrySnapshot,
        settings: PhaseFieldPlanSettings,
        requestedMarginPx: number,
    ): CachedPlan {
        const transitionKey = buildTransitionKey(input);
        let prevGeometry = currentGeometry;
        let prevStars = input.stars;
        let prevOwnedStars = toOwnedStars(input.stars);
        const nextOwnedStars = toOwnedStars(input.stars);
        const conquestEvents = input.activeTransition?.conquestEvents ?? [];

        if (input.activeTransition?.events.length) {
            const revertedStars = revertStarsForTransition(input);
            prevStars = revertedStars;
            prevOwnedStars = toOwnedStars(revertedStars);
            prevGeometry =
                input.prevGeometry ??
                buildPerimeterFieldRenderFamilyGeometry({
                    stars: revertedStars,
                    lanes: input.lanes,
                    worldWidth: input.world.width,
                    worldHeight: input.world.height,
                    nowMs: input.nowMs,
                    ownership: buildOwnershipSnapshotFromStars(revertedStars),
                    geometrySource: settings.geometrySource,
                    configSource:
                        input.configSource as Record<string, unknown> | undefined,
                });
        }

        const prevResolvedGeometry =
            readConstraintAlignedTerritoryGeometryFromSnapshot(prevGeometry) ??
            resolveConstraintAlignedTerritoryGeometry({
                geometry: prevGeometry,
                stars: prevStars,
                requestedMarginPx,
                preferSharedBoundaryResolution: true,
            });
        const nextResolvedGeometry =
            readConstraintAlignedTerritoryGeometryFromSnapshot(currentGeometry) ??
            resolveConstraintAlignedTerritoryGeometry({
                geometry: currentGeometry,
                stars: input.stars,
                requestedMarginPx,
                preferSharedBoundaryResolution: true,
            });
        const prevGeometryForClassification: ResolvedGeometrySnapshot = {
            ...prevGeometry,
            territoryRegions: prevResolvedGeometry.territoryRegions,
        };
        const nextGeometryForClassification: ResolvedGeometrySnapshot = {
            ...currentGeometry,
            territoryRegions: nextResolvedGeometry.territoryRegions,
        };

        const geometryVersion =
            input.activeTransition?.events.length && prevGeometry !== currentGeometry
                ? `${prevGeometry.version}->${currentGeometry.version}`
                : currentGeometry.version;
        const planKey = buildCellGridPlanKey({
            transitionKey,
            geometryVersion,
            geometrySource: settings.geometrySource,
            spacingPx: settings.spacingPx,
            originMode: settings.originMode,
            distribution: settings.distribution,
            positionJitter: settings.positionJitter,
            maxCells: settings.maxCells,
            adjacency: settings.adjacency,
            waveGeometry: settings.waveGeometry,
            waveSeeding: settings.waveSeeding,
        });
        const resolveStarPosition = (() => {
            const byId = new Map<string, { x: number; y: number }>();
            for (const star of input.stars) {
                byId.set(star.id, { x: star.x, y: star.y });
            }
            return (starId: string): { x: number; y: number } | null =>
                byId.get(starId) ?? null;
        })();

        const classificationStartMs = performance.now();
        const classification = buildGridClassification({
            world: input.world,
            spacingPx: settings.spacingPx,
            originMode: settings.originMode,
            prevGeometry: prevGeometryForClassification,
            nextGeometry: nextGeometryForClassification,
            conquestEvents,
            resolveStarPosition,
            prevOwnedStars,
            nextOwnedStars,
            maxCells: settings.maxCells > 0 ? settings.maxCells : undefined,
            distribution: settings.distribution,
            positionJitter: settings.positionJitter,
        });
        const classificationBuildMs = performance.now() - classificationStartMs;

        const wavePlanStartMs = performance.now();
        const wavePlan = planGridWave({
            classification,
            seeding: settings.waveSeeding,
            geometry: settings.waveGeometry,
            adjacency: settings.adjacency,
            conquestEvents,
            resolveStarPosition,
        });
        const wavePlanBuildMs = performance.now() - wavePlanStartMs;

        return {
            planKey,
            classification,
            wavePlan,
            prevGeometry,
            prevOwnedStars,
            nextOwnedStars,
            prevResolvedGeometry,
            nextResolvedGeometry,
            classificationBuildMs,
            wavePlanBuildMs,
            planBuildMs: classificationBuildMs + wavePlanBuildMs,
            nextGeometryRef: currentGeometry,
        };
    }

    private resolvePatternClassification(params: {
        input: RenderFamilyInput;
        cached: CachedPlan;
        settings: PhaseFieldPlanSettings;
        patternSpacingPx: number;
    }): CachedPatternClassification {
        const key = [
            buildTransitionKey(params.input),
            params.cached.prevGeometry.version,
            params.cached.nextGeometryRef.version,
            params.cached.prevResolvedGeometry.appliedMarginPx.toFixed(2),
            params.cached.nextResolvedGeometry.appliedMarginPx.toFixed(2),
            params.patternSpacingPx.toFixed(2),
            params.settings.originMode,
            params.settings.distribution,
            params.settings.positionJitter.toFixed(3),
        ].join('|');
        if (this.cachedPatternClassification?.key === key) {
            return this.cachedPatternClassification;
        }

        const prevGeometryForClassification: ResolvedGeometrySnapshot = {
            ...params.cached.prevGeometry,
            territoryRegions: params.cached.prevResolvedGeometry.territoryRegions,
        };
        const nextGeometryForClassification: ResolvedGeometrySnapshot = {
            ...params.cached.nextGeometryRef,
            territoryRegions: params.cached.nextResolvedGeometry.territoryRegions,
        };
        const starPositions = new Map<string, { x: number; y: number }>();
        for (const star of params.input.stars) {
            starPositions.set(star.id, { x: star.x, y: star.y });
        }

        const classification = buildGridClassification({
            world: params.input.world,
            spacingPx: params.patternSpacingPx,
            originMode: params.settings.originMode,
            prevGeometry: prevGeometryForClassification,
            nextGeometry: nextGeometryForClassification,
            conquestEvents: params.input.activeTransition?.conquestEvents ?? [],
            resolveStarPosition: (starId: string) => starPositions.get(starId) ?? null,
            prevOwnedStars: params.cached.prevOwnedStars,
            nextOwnedStars: params.cached.nextOwnedStars,
            distribution: params.settings.distribution,
            positionJitter: params.settings.positionJitter,
        });
        this.cachedPatternClassification = {
            key,
            classification,
        };
        return this.cachedPatternClassification;
    }

    private resolveFillMaskGeometry(
        geometry: ConstraintAlignedTerritoryGeometry,
        inwardOffsetPx: number,
    ): GeometryFillSource {
        if (inwardOffsetPx <= 0) {
            return geometry;
        }

        let cache = this.fillMaskGeometryCache.get(geometry);
        if (!cache) {
            cache = new Map<string, GeometryFillSource>();
            this.fillMaskGeometryCache.set(geometry, cache);
        }

        const key = inwardOffsetPx.toFixed(2);
        const cached = cache.get(key);
        if (cached) {
            return cached;
        }

        const fillGeometry = {
            territoryRegions: buildInsetTerritoryRegions({
                territoryRegions: geometry.territoryRegions,
                insetPx: inwardOffsetPx,
            }),
        } satisfies GeometryFillSource;
        cache.set(key, fillGeometry);
        return fillGeometry;
    }

    private renderPatternTexture(params: {
        renderer: PIXI.Renderer;
        texture: PIXI.RenderTexture;
        patternGraphics: PIXI.Graphics;
        maskGraphics: PIXI.Graphics;
        container: PIXI.Container;
        geometry: GeometryFillSource;
        sceneCells: readonly GridRenderCell[];
        fillHexByColorIdx: readonly number[];
        cellShape: GridCellShape;
        cellSpacingPx: number;
        cellInsetPx: number;
        cellCornerPx: number;
        alphaMultiplier: number;
    }): number {
        const painted = paintCellScene({
            graphics: params.patternGraphics,
            sceneCells: params.sceneCells,
            fillHexByColorIdx: params.fillHexByColorIdx,
            cellShape: params.cellShape,
            cellSpacingPx: params.cellSpacingPx,
            cellInsetPx: params.cellInsetPx,
            cellCornerPx: params.cellCornerPx,
            alphaMultiplier: params.alphaMultiplier,
        });
        drawGeometryFill({
            graphics: params.maskGraphics,
            geometry: params.geometry,
            resolveColor: () => 0xffffff,
            alpha: 1,
        });
        params.renderer.render({
            container: params.container,
            target: params.texture,
            clear: true,
        });
        return painted;
    }

    private renderPrevMaskTexture(params: {
        renderer: PIXI.Renderer;
        texture: PIXI.RenderTexture;
        scene: readonly GridRenderCell[];
        classification: GridClassification;
        ownerColorIdx: ReadonlyMap<string, number>;
        cellShape: GridCellShape;
        size: number;
        half: number;
        cornerR: number;
        hexR: number;
        alphaMultiplier: number;
    }): number {
        const byId = new Map<string, GridVStar>();
        for (const vstar of params.classification.vstars) {
            byId.set(vstar.id, vstar);
        }
        const g = this.maskSourceGraphics;
        g.clear();
        let painted = 0;
        for (const cell of params.scene) {
            const vstar = byId.get(cell.vId);
            if (!isPrevSideCell(cell, vstar, params.ownerColorIdx)) continue;
            drawFilledGridCell(
                g,
                params.cellShape,
                cell.x,
                cell.y,
                params.half,
                params.size,
                params.cornerR,
                params.hexR,
                0xffffff,
                clamp01(cell.alpha * params.alphaMultiplier),
            );
            painted += 1;
        }
        params.renderer.render({
            container: this.maskSourceContainer,
            target: params.texture,
            clear: true,
        });
        return painted;
    }

    private drawBorderOverlay(params: {
        classification: GridClassification;
        sceneCells: readonly GridRenderCell[];
        ownerColorIdx: ReadonlyMap<string, number>;
        borderHexByColorIdx: readonly number[];
        cellShape: GridCellShape;
        borderMode: GridBorderMode;
        borderBlend: boolean;
        borderWidth: number;
        borderAlpha: number;
        cellInsetPx: number;
        cellCornerPx: number;
        inwardOffsetPx: number;
        edgeTrimPx: number;
        sharedEdgeSmoothingPasses: number;
        borderChaikinPasses: number;
    }): void {
        const g = this.borderGraphics;
        g.clear();

        if (
            params.borderMode === 'off' ||
            params.borderWidth <= 0 ||
            params.borderAlpha <= 0
        ) {
            return;
        }

        const spacingPx = params.classification.spacingPx;
        const insetMax = spacingPx * 0.45;
        const nativeInset = Math.min(params.cellInsetPx, insetMax);
        const boundaryInset = Math.min(
            params.cellInsetPx +
                Math.max(0, params.inwardOffsetPx) +
                params.edgeTrimPx,
            insetMax,
        );
        const nativeSize = spacingPx - nativeInset * 2;
        const nativeHalf = nativeSize * 0.5;
        const nativeCornerR =
            params.cellShape === 'square'
                ? Math.min(params.cellCornerPx, nativeHalf)
                : 0;
        const nativeHexR = nativeSize / SQRT3;
        const boundarySize = spacingPx - boundaryInset * 2;
        const boundaryHalf = boundarySize * 0.5;
        const boundaryCornerR = computeSharedBoundaryCornerRadius({
            cellShape: params.cellShape,
            baseCornerPx: params.cellCornerPx,
            halfSizePx: boundaryHalf,
            smoothingPasses: params.sharedEdgeSmoothingPasses,
        });
        const boundaryHexR = boundarySize / SQRT3;
        const cols = params.classification.cols;
        const rows = params.classification.rows;
        const vstarCount = params.classification.vstars.length;
        const effectiveColorIdxByGridIdx = new Int32Array(vstarCount);
        effectiveColorIdxByGridIdx.fill(-1);

        for (let i = 0; i < vstarCount; i++) {
            const vstar = params.classification.vstars[i];
            const ownerId = vstar.nextOwnerId ?? vstar.prevOwnerId;
            const idx = ownerId ? params.ownerColorIdx.get(ownerId) : undefined;
            effectiveColorIdxByGridIdx[i] = idx === undefined ? -1 : idx;
        }

        for (const cell of params.sceneCells) {
            if (cell.alpha <= 0) continue;
            if (cell.ix < 0 || cell.ix >= cols || cell.iy < 0 || cell.iy >= rows) {
                continue;
            }
            effectiveColorIdxByGridIdx[cell.iy * cols + cell.ix] = cell.colorIdx;
        }

        const drawTerritoryEdgeOnly = params.borderMode === 'territory_edge';
        const drawBlendedEdges =
            drawTerritoryEdgeOnly &&
            params.borderBlend &&
            params.classification.distribution === 'square';

        for (const cell of params.sceneCells) {
            if (cell.alpha <= 0) continue;
            if (drawBlendedEdges) continue;
            if (drawTerritoryEdgeOnly && cell.ix >= 0 && cell.iy >= 0) {
                const self = cell.colorIdx;
                const neighbourDiffers = (nx: number, ny: number): boolean => {
                    if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return true;
                    return effectiveColorIdxByGridIdx[ny * cols + nx] !== self;
                };
                const isEdge =
                    neighbourDiffers(cell.ix - 1, cell.iy) ||
                    neighbourDiffers(cell.ix + 1, cell.iy) ||
                    neighbourDiffers(cell.ix, cell.iy - 1) ||
                    neighbourDiffers(cell.ix, cell.iy + 1);
                if (!isEdge) continue;
            }
            const borderHex = params.borderHexByColorIdx[cell.colorIdx];
            if (borderHex === undefined) continue;
            const isBoundary = cell.role !== 'native';
            drawStrokedGridCell(
                g,
                params.cellShape,
                cell.x,
                cell.y,
                isBoundary ? boundaryHalf : nativeHalf,
                isBoundary ? boundarySize : nativeSize,
                isBoundary ? boundaryCornerR : nativeCornerR,
                isBoundary ? boundaryHexR : nativeHexR,
                borderHex,
                params.borderAlpha,
                params.borderWidth,
            );
        }

        if (!drawBlendedEdges) {
            return;
        }

        const originOffset =
            params.classification.originMode === 'centered' ? spacingPx * 0.5 : 0;
        const trueHalf = spacingPx * 0.5;
        const vCols = cols + 1;
        const vertexX = (vertexId: number): number => {
            const ivx = vertexId % vCols;
            return ivx * spacingPx + originOffset - trueHalf;
        };
        const vertexY = (vertexId: number): number => {
            const ivx = vertexId % vCols;
            const ivy = (vertexId - ivx) / vCols;
            return ivy * spacingPx + originOffset - trueHalf;
        };

        interface BoundaryEdge {
            readonly v0: number;
            readonly v1: number;
        }

        const edgesByPair = new Map<string, BoundaryEdge[]>();
        const pushEdge = (a: number, b: number, v0: number, v1: number): void => {
            const lo = a < b ? a : b;
            const hi = a < b ? b : a;
            const key = `${lo}|${hi}`;
            let list = edgesByPair.get(key);
            if (!list) {
                list = [];
                edgesByPair.set(key, list);
            }
            list.push({ v0, v1 });
        };

        for (let iy = 0; iy < rows; iy++) {
            for (let ix = 0; ix < cols; ix++) {
                const selfIdx = effectiveColorIdxByGridIdx[iy * cols + ix];
                if (selfIdx < 0) continue;
                if (ix + 1 < cols) {
                    const rightIdx = effectiveColorIdxByGridIdx[iy * cols + ix + 1];
                    if (rightIdx >= 0 && rightIdx !== selfIdx) {
                        pushEdge(
                            selfIdx,
                            rightIdx,
                            iy * vCols + (ix + 1),
                            (iy + 1) * vCols + (ix + 1),
                        );
                    }
                }
                if (iy + 1 < rows) {
                    const downIdx = effectiveColorIdxByGridIdx[(iy + 1) * cols + ix];
                    if (downIdx >= 0 && downIdx !== selfIdx) {
                        pushEdge(
                            selfIdx,
                            downIdx,
                            (iy + 1) * vCols + ix,
                            (iy + 1) * vCols + (ix + 1),
                        );
                    }
                }
            }
        }

        const strokeOpts = {
            color: 0xffffff,
            alpha: params.borderAlpha,
            width: params.borderWidth,
            cap: 'round' as const,
            join: 'round' as const,
        };
        const totalBorderChaikinPasses = Math.max(
            0,
            Math.min(
                6,
                params.sharedEdgeSmoothingPasses + params.borderChaikinPasses,
            ),
        );

        for (const [key, edges] of edgesByPair) {
            if (edges.length === 0) continue;
            const separator = key.indexOf('|');
            const aIdx = Number(key.slice(0, separator));
            const bIdx = Number(key.slice(separator + 1));
            const hexA = params.borderHexByColorIdx[aIdx];
            const hexB = params.borderHexByColorIdx[bIdx];
            if (hexA === undefined || hexB === undefined) continue;
            strokeOpts.color = blendColors(hexA, hexB, 0.5);

            const adjacency = new Map<number, Array<[number, number]>>();
            for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
                const { v0, v1 } = edges[edgeIndex];
                let listA = adjacency.get(v0);
                if (!listA) {
                    listA = [];
                    adjacency.set(v0, listA);
                }
                listA.push([v1, edgeIndex]);
                let listB = adjacency.get(v1);
                if (!listB) {
                    listB = [];
                    adjacency.set(v1, listB);
                }
                listB.push([v0, edgeIndex]);
            }

            const usedEdge = new Uint8Array(edges.length);
            const drawChain = (vertexChain: number[], closed: boolean): void => {
                if (vertexChain.length < 2) return;
                let points: number[] = [];
                for (const vertexId of vertexChain) {
                    points.push(vertexX(vertexId), vertexY(vertexId));
                }
                if (totalBorderChaikinPasses > 0) {
                    points = chaikinSmooth(points, totalBorderChaikinPasses, closed);
                }
                if (!closed && params.edgeTrimPx > 0) {
                    points = trimOpenPolylineEndpoints(points, params.edgeTrimPx);
                }
                g.moveTo(points[0], points[1]);
                for (let i = 2; i < points.length; i += 2) {
                    g.lineTo(points[i], points[i + 1]);
                }
                if (closed) {
                    g.lineTo(points[0], points[1]);
                }
                g.stroke(strokeOpts);
            };

            const walkFrom = (startVertex: number): number[] => {
                const chain: number[] = [startVertex];
                let current = startVertex;
                while (true) {
                    const neighbours = adjacency.get(current);
                    if (!neighbours) break;
                    let nextVertex = -1;
                    let nextEdge = -1;
                    for (const [otherVertex, edgeIndex] of neighbours) {
                        if (usedEdge[edgeIndex]) continue;
                        nextVertex = otherVertex;
                        nextEdge = edgeIndex;
                        break;
                    }
                    if (nextEdge < 0) break;
                    usedEdge[nextEdge] = 1;
                    chain.push(nextVertex);
                    current = nextVertex;
                }
                return chain;
            };

            for (const [vertexId, list] of adjacency) {
                if (list.length === 2) continue;
                while (list.some(([, edgeIndex]) => !usedEdge[edgeIndex])) {
                    const chain = walkFrom(vertexId);
                    if (chain.length < 2) break;
                    drawChain(chain, false);
                }
            }

            for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
                if (usedEdge[edgeIndex]) continue;
                const { v0 } = edges[edgeIndex];
                const chain = walkFrom(v0);
                if (chain.length < 2) continue;
                const closed = chain[chain.length - 1] === v0;
                if (closed) {
                    chain.pop();
                }
                drawChain(chain, closed);
            }
        }
    }

    private drawConstraintAlignedTerritoryBorderOverlay(params: {
        geometry: ConstraintAlignedTerritoryGeometry;
        ownerColorIdx: ReadonlyMap<string, number>;
        borderHexByColorIdx: readonly number[];
        borderWidth: number;
        borderAlpha: number;
    }): void {
        const g = this.borderGraphics;
        g.clear();
        if (params.borderWidth <= 0 || params.borderAlpha <= 0) return;

        for (const polyline of params.geometry.displayFrontierPolylines) {
            const ownerAIdx = params.ownerColorIdx.get(polyline.ownerA);
            const ownerBIdx = params.ownerColorIdx.get(polyline.ownerB);
            const ownerAHex =
                ownerAIdx === undefined ? undefined : params.borderHexByColorIdx[ownerAIdx];
            const ownerBHex =
                ownerBIdx === undefined ? undefined : params.borderHexByColorIdx[ownerBIdx];
            const color =
                ownerAHex !== undefined && ownerBHex !== undefined
                    ? blendColors(ownerAHex, ownerBHex, 0.5)
                    : ownerAHex ?? ownerBHex;
            if (color === undefined) continue;
            drawResolvedBorderPolyline({
                graphics: g,
                polyline,
                color,
                width: params.borderWidth,
                alpha: params.borderAlpha,
            });
        }

        for (const polyline of params.geometry.displayWorldBorderPolylines) {
            const ownerIdx = params.ownerColorIdx.get(polyline.ownerA);
            const color =
                ownerIdx === undefined ? undefined : params.borderHexByColorIdx[ownerIdx];
            if (color === undefined) continue;
            drawResolvedBorderPolyline({
                graphics: g,
                polyline,
                color,
                width: params.borderWidth,
                alpha: params.borderAlpha,
            });
        }
    }

    private updateDebugSnapshot(params: {
        input: RenderFamilyInput;
        cached: CachedPlan;
        settings: PhaseFieldPlanSettings;
        frontierDiagnostics: ReturnType<typeof summarizeCellGridFrontier>;
        rawProgress: number;
        easedProgress: number;
        activeWindowCount: number;
        compositeMode: 'render_texture_mask' | 'vector_fallback' | 'steady';
        paintedCells: number;
    }): void {
        this.lastDebugSnapshot = {
            familyId: this.id,
            familyLabel: this.label,
            sessionKey: this.sessionKey,
            planKey: params.cached.planKey,
            tick: params.input.gameTick ?? null,
            paused: params.input.paused ?? false,
            activeTransitionEventCount: params.input.activeTransition?.events.length ?? 0,
            geometryVersion: params.cached.nextGeometryRef.version,
            prevGeometryVersion: params.cached.prevGeometry.version,
            requestedSpacingPx: params.settings.spacingPx,
            effectiveSpacingPx: params.cached.classification.spacingPx,
            distribution: params.cached.classification.distribution,
            totalCells: params.cached.classification.vstars.length,
            emittableCells: params.cached.classification.emittableVstars.length,
            roleCounts: buildRoleCounts(params.cached.classification),
            rawProgress: params.rawProgress,
            easedProgress: params.easedProgress,
            activeWindowCount: params.activeWindowCount,
            transitionTotalCount: params.frontierDiagnostics.transitionTotalCount,
            paintedCells: params.paintedCells,
            compositeMode: params.compositeMode,
            frontierDiagnostics: params.frontierDiagnostics,
        };
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const startMs = performance.now();
        const nextSessionKey = buildSessionKey(input);
        if (this.sessionKey !== nextSessionKey) {
            this.sessionKey = nextSessionKey;
            this.resetState();
        }

        const currentGeometry = input.geometry;
        if (!currentGeometry) {
            this.root.visible = false;
            resetCellGridStats();
            return { container: this.root };
        }

        const settings = this.readPlanSettings(input);
        const transitionKey = buildTransitionKey(input);
        const requestedStarMarginPx = Math.max(
            0,
            Number(
                (input.configSource?.MODIFIED_VORONOI_STAR_MARGIN as number | undefined) ??
                    GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ??
                    0,
            ) || 0,
        );
        const requestedPlanKey = [
            transitionKey,
            currentGeometry.version,
            input.prevGeometry?.version ?? '',
            settings.spacingPx,
            settings.originMode,
            settings.distribution,
            settings.positionJitter,
            settings.maxCells,
            settings.adjacency,
            settings.waveGeometry,
            settings.waveSeeding,
            settings.geometrySource ?? '',
            requestedStarMarginPx.toFixed(2),
        ].join('|');

        if (
            !this.cachedPlan ||
            this.lastPlanParamsKey !== requestedPlanKey
        ) {
            this.cachedPlan = this.buildCachedPlan(
                input,
                currentGeometry,
                settings,
                requestedStarMarginPx,
            );
            this.lastPlanParamsKey = requestedPlanKey;
            this.lastPaintSig = null;
        }

        const cached = this.cachedPlan;
        const prevResolvedGeometry = cached.prevResolvedGeometry;
        const currentResolvedGeometry = cached.nextResolvedGeometry;
        const fillAlpha = clamp01(
            readTunableNumber(input, 'TERRITORY_SURFACE_ALPHA', GAME_CONFIG.TERRITORY_SURFACE_ALPHA ?? 0.5),
        );
        const satMult = Math.max(
            0,
            readTunableNumber(
                input,
                'TERRITORY_SURFACE_SATURATION',
                GAME_CONFIG.TERRITORY_SURFACE_SATURATION ?? 1,
            ),
        );
        const lightMult = Math.max(
            0,
            readTunableNumber(
                input,
                'TERRITORY_SURFACE_LIGHTNESS',
                GAME_CONFIG.TERRITORY_SURFACE_LIGHTNESS ?? 1,
            ),
        );
        const borderAlpha = clamp01(
            readTunableNumber(
                input,
                'TERRITORY_SURFACE_BORDER_ALPHA',
                GAME_CONFIG.TERRITORY_SURFACE_BORDER_ALPHA ?? 0.6,
            ),
        );
        const borderEnabled = readTunableBoolean(
            input,
            'TERRITORY_SURFACE_BORDER_ENABLED',
            GAME_CONFIG.TERRITORY_SURFACE_BORDER_ENABLED ?? true,
        );
        const borderWidth = Math.max(
            0,
            readTunableNumber(
                input,
                'TERRITORY_SURFACE_BORDER_WIDTH',
                GAME_CONFIG.TERRITORY_SURFACE_BORDER_WIDTH ?? 3,
            ),
        );
        const borderSatMult = Math.max(
            0,
            readTunableNumber(
                input,
                'TERRITORY_SURFACE_BORDER_SATURATION',
                GAME_CONFIG.TERRITORY_SURFACE_BORDER_SATURATION ?? 1,
            ),
        );
        const borderLightMult = Math.max(
            0,
            readTunableNumber(
                input,
                'TERRITORY_SURFACE_BORDER_LIGHTNESS',
                GAME_CONFIG.TERRITORY_SURFACE_BORDER_LIGHTNESS ?? 1,
            ),
        );
        const cellShape = readTunableString<GridCellShape>(
            input,
            'CELL_GRID_CELL_SHAPE',
            (GAME_CONFIG.CELL_GRID_CELL_SHAPE as GridCellShape | undefined) ?? 'square',
            ['square', 'circle', 'diamond', 'hex'],
        );
        const patternSpacingPx = quantizePatternSpacingPx(
            readTunableNumber(
                input,
                'CELL_GRID_PATTERN_SPACING_PX',
                ((GAME_CONFIG as unknown as Record<string, unknown>)
                    .CELL_GRID_PATTERN_SPACING_PX as number | undefined) ??
                    cellGridPhaseFieldModeDefaults.CELL_GRID_PATTERN_SPACING_PX,
            ),
        );
        const cellInsetPx = Math.max(
            0,
            readTunableNumber(
                input,
                'CELL_GRID_CELL_INSET_PX',
                GAME_CONFIG.CELL_GRID_CELL_INSET_PX ?? 0,
            ),
        );
        const cellCornerPx = Math.max(
            0,
            readTunableNumber(
                input,
                'CELL_GRID_CELL_CORNER_PX',
                GAME_CONFIG.CELL_GRID_CELL_CORNER_PX ?? 0,
            ),
        );
        const inwardOffsetPx = Math.max(
            0,
            readTunableNumber(
                input,
                'CELL_GRID_INWARD_OFFSET_PX',
                GAME_CONFIG.CELL_GRID_INWARD_OFFSET_PX ?? 0,
            ),
        );
        const borderMode = readTunableString<GridBorderMode>(
            input,
            'CELL_GRID_BORDER_MODE',
            (GAME_CONFIG.CELL_GRID_BORDER_MODE as GridBorderMode | undefined) ??
                cellGridPhaseFieldModeDefaults.CELL_GRID_BORDER_MODE,
            ['off', 'per_cell', 'territory_edge'],
        );
        const borderBlend = readTunableBoolean(
            input,
            'CELL_GRID_BORDER_BLEND',
            GAME_CONFIG.CELL_GRID_BORDER_BLEND ??
                cellGridPhaseFieldModeDefaults.CELL_GRID_BORDER_BLEND,
        );
        const sharedEdgeSmoothingPasses = Math.max(
            0,
            Math.min(
                4,
                Math.round(
                    readTunableNumber(
                        input,
                        'CELL_GRID_EDGE_SMOOTHING_PASSES',
                        GAME_CONFIG.CELL_GRID_EDGE_SMOOTHING_PASSES ??
                            cellGridPhaseFieldModeDefaults.CELL_GRID_EDGE_SMOOTHING_PASSES,
                    ),
                ),
            ),
        );
        const edgeTrimPx = Math.max(
            0,
            readTunableNumber(
                input,
                'CELL_GRID_EDGE_TRIM_PX',
                GAME_CONFIG.CELL_GRID_EDGE_TRIM_PX ??
                    cellGridPhaseFieldModeDefaults.CELL_GRID_EDGE_TRIM_PX,
            ),
        );
        const borderChaikinPasses = Math.max(
            0,
            Math.min(
                4,
                Math.round(
                    readTunableNumber(
                        input,
                        'CELL_GRID_BORDER_CHAIKIN_PASSES',
                        GAME_CONFIG.CELL_GRID_BORDER_CHAIKIN_PASSES ??
                            cellGridPhaseFieldModeDefaults.CELL_GRID_BORDER_CHAIKIN_PASSES,
                    ),
                ),
            ),
        );
        const waveEase = readTunableString<GridWaveEase>(
            input,
            'CELL_GRID_WAVE_EASE',
            (GAME_CONFIG.CELL_GRID_WAVE_EASE as GridWaveEase | undefined) ??
                'ease_in_out',
            ['linear', 'ease_in', 'ease_out', 'ease_in_out', 'back_out', 'elastic_out'],
        );
        const flipTransition = readTunableString<GridFlipTransition>(
            input,
            'CELL_GRID_FLIP_TRANSITION',
            (GAME_CONFIG.CELL_GRID_FLIP_TRANSITION as GridFlipTransition | undefined) ??
                'dual_pass_blend',
            ['hard', 'lerp_per_cell', 'dual_pass_blend'],
        );
        const flipWindow = Math.max(
            0,
            readTunableNumber(
                input,
                'CELL_GRID_FLIP_WINDOW',
                GAME_CONFIG.CELL_GRID_FLIP_WINDOW ?? 0.14,
            ),
        );
        const flipTimeJitter = Math.max(
            0,
            Math.min(
                0.5,
                readTunableNumber(
                    input,
                    'CELL_GRID_FLIP_WINDOW_JITTER',
                    GAME_CONFIG.CELL_GRID_FLIP_WINDOW_JITTER ?? 0,
                ),
            ),
        );
        const phaseFieldFinishFadeStart = clamp01(
            readTunableNumber(
                input,
                'CELL_GRID_PHASE_FIELD_FINISH_FADE_START',
                GAME_CONFIG.CELL_GRID_PHASE_FIELD_FINISH_FADE_START ?? 0.82,
            ),
        );
        const phaseFieldFinishFadeEnd = clamp01(
            readTunableNumber(
                input,
                'CELL_GRID_PHASE_FIELD_FINISH_FADE_END',
                GAME_CONFIG.CELL_GRID_PHASE_FIELD_FINISH_FADE_END ?? 1,
            ),
        );
        const phaseFieldSizeCollapseStart = clamp01(
            readTunableNumber(
                input,
                'CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_START',
                GAME_CONFIG.CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_START ?? 0.72,
            ),
        );
        const phaseFieldSizeCollapseEnd = clamp01(
            readTunableNumber(
                input,
                'CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_END',
                GAME_CONFIG.CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_END ?? 1,
            ),
        );
        const phaseFieldFinalCellSizePx = Math.max(
            1,
            readTunableNumber(
                input,
                'CELL_GRID_PHASE_FIELD_FINAL_CELL_SIZE_PX',
                GAME_CONFIG.CELL_GRID_PHASE_FIELD_FINAL_CELL_SIZE_PX ?? 1,
            ),
        );
        const phaseFieldFrontierHighlight = readTunableBoolean(
            input,
            'CELL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT',
            GAME_CONFIG.CELL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT ?? true,
        );
        const phaseFieldFrontierFadeStart = clamp01(
            readTunableNumber(
                input,
                'CELL_GRID_PHASE_FIELD_FRONTIER_FADE_START',
                GAME_CONFIG.CELL_GRID_PHASE_FIELD_FRONTIER_FADE_START ?? 0.8,
            ),
        );
        const phaseFieldFrontierFadeEnd = clamp01(
            readTunableNumber(
                input,
                'CELL_GRID_PHASE_FIELD_FRONTIER_FADE_END',
                GAME_CONFIG.CELL_GRID_PHASE_FIELD_FRONTIER_FADE_END ?? 0.96,
            ),
        );
        const useConstraintAlignedCenterlineBorders =
            borderEnabled &&
            borderMode === 'territory_edge' &&
            borderBlend &&
            borderWidth > 0 &&
            borderAlpha > 0;

        const frontierDiagnostics = summarizeCellGridFrontier({
            orderedFlipTimes: cached.wavePlan.orderedFlipTimes,
            flipWindow,
        });
        const rawProgress = input.activeTransition?.progress ?? 1;
        const normalizedProgress = clamp01(rawProgress);
        const easedProgress = easeProgress(waveEase, rawProgress);
        const finishFadeMix = smoothstep01(
            normalizeWindow(
                normalizedProgress,
                phaseFieldFinishFadeStart,
                phaseFieldFinishFadeEnd,
            ),
        );
        const prevMaskAlphaMultiplier = 1 - finishFadeMix;
        const finishSizeMix = smoothstep01(
            normalizeWindow(
                normalizedProgress,
                phaseFieldSizeCollapseStart,
                phaseFieldSizeCollapseEnd,
            ),
        );
        const frontierFadeMix = smoothstep01(
            normalizeWindow(
                normalizedProgress,
                phaseFieldFrontierFadeStart,
                phaseFieldFrontierFadeEnd,
            ),
        );
        const frontierAlphaMultiplier = 1 - frontierFadeMix;
        const effectiveWavePlan = applyFlipTimeJitter(cached.wavePlan, flipTimeJitter);
        const activeRange = findActiveFrontierRange({
            orderedFlipTimes: effectiveWavePlan.orderedFlipTimes,
            progress: easedProgress,
            flipWindow,
        });
        const hasTransition = (input.activeTransition?.events.length ?? 0) > 0;

        const baseOwners = new Set<string>();
        for (const region of prevResolvedGeometry.territoryRegions) {
            baseOwners.add(region.ownerId);
        }
        for (const region of currentResolvedGeometry.territoryRegions) {
            baseOwners.add(region.ownerId);
        }
        const ownerIds = [...baseOwners].sort((a, b) => a.localeCompare(b));
        const ownerColorIdx = new Map<string, number>();
        const fillHexByColorIdx: number[] = [];
        const frontierHexByColorIdx: number[] = [];
        for (let i = 0; i < ownerIds.length; i++) {
            const ownerId = ownerIds[i]!;
            ownerColorIdx.set(ownerId, i);
            const baseHex = this.colorUtils.getPlayerColor(ownerId);
            fillHexByColorIdx[i] = adjustColorHSL(baseHex, satMult, lightMult);
            frontierHexByColorIdx[i] = adjustColorHSL(
                baseHex,
                borderSatMult,
                borderLightMult,
            );
        }
        const patternCache = this.resolvePatternClassification({
            input,
            cached,
            settings,
            patternSpacingPx,
        });
        const patternClassification = patternCache.classification;
        const prevFillGeometry = this.resolveFillMaskGeometry(
            prevResolvedGeometry,
            inwardOffsetPx,
        );
        const currentFillGeometry = this.resolveFillMaskGeometry(
            currentResolvedGeometry,
            inwardOffsetPx,
        );

        const paintSig = [
            cached.planKey,
            currentGeometry.version,
            cached.prevGeometry.version,
            hasTransition ? 'transition' : 'steady',
            quantProgress(easedProgress),
            quantProgress(normalizedProgress),
            fillAlpha.toFixed(3),
            patternSpacingPx.toFixed(2),
            patternClassification.spacingPx.toFixed(2),
            cellShape,
            cellInsetPx.toFixed(2),
            cellCornerPx.toFixed(2),
            inwardOffsetPx.toFixed(2),
            borderMode,
            borderBlend ? '1' : '0',
            borderEnabled ? '1' : '0',
            borderWidth.toFixed(2),
            borderAlpha.toFixed(3),
            requestedStarMarginPx.toFixed(2),
            sharedEdgeSmoothingPasses,
            edgeTrimPx.toFixed(2),
            borderChaikinPasses,
            satMult.toFixed(3),
            lightMult.toFixed(3),
            borderSatMult.toFixed(3),
            borderLightMult.toFixed(3),
            phaseFieldFinishFadeStart.toFixed(3),
            phaseFieldFinishFadeEnd.toFixed(3),
            phaseFieldSizeCollapseStart.toFixed(3),
            phaseFieldSizeCollapseEnd.toFixed(3),
            phaseFieldFinalCellSizePx.toFixed(2),
            phaseFieldFrontierHighlight ? '1' : '0',
            phaseFieldFrontierFadeStart.toFixed(3),
            phaseFieldFrontierFadeEnd.toFixed(3),
            input.renderer ? 'rt' : 'fallback',
        ].join('|');

        if (this.lastPaintSig === paintSig) {
            this.frameCount += 1;
            this.skippedFrameCount += 1;
            const lastUpdateMs = performance.now() - startMs;
            this.emaUpdateMs =
                this.emaUpdateMs <= 0
                    ? lastUpdateMs
                    : this.emaUpdateMs * 0.85 + lastUpdateMs * 0.15;
            updateCellGridStats({
                familyId: this.id,
                familyLabel: this.label,
                geometrySource: settings.geometrySource,
                waveGeometry: settings.waveGeometry,
                waveSeeding: settings.waveSeeding,
                borderMode,
                borderBlend,
                transitionEventCount: input.activeTransition?.events.length ?? 0,
                requestedSpacingPx: settings.spacingPx,
                effectiveSpacingPx: cached.classification.spacingPx,
                requestedDensityCellsPerMpx: spacingToDensityCellsPerMpx(settings.spacingPx),
                effectiveDensityCellsPerMpx: spacingToDensityCellsPerMpx(
                    cached.classification.spacingPx,
                ),
                totalCells: cached.classification.vstars.length,
                emittableCells: cached.classification.emittableVstars.length,
                lastUpdateMs,
                emaUpdateMs: this.emaUpdateMs,
                lastFrameSkipped: true,
                frameCount: this.frameCount,
                skippedFrameCount: this.skippedFrameCount,
                lastClassificationBuildMs: cached.classificationBuildMs,
                lastWavePlanBuildMs: cached.wavePlanBuildMs,
                lastPlanBuildMs: cached.planBuildMs,
                renderCacheMode: input.renderer ? 'steady_texture' : 'live_vectors',
                activeWindowCount: Math.max(
                    0,
                    activeRange.endIndex - activeRange.startIndex,
                ),
                transitionTotalCount: frontierDiagnostics.transitionTotalCount,
                fastPathUsed: false,
                fallbackReason: 'paint_signature_match',
                rawProgress,
                easedProgress,
            });
            return { container: this.root };
        }

        this.root.visible = true;
        this.baseGraphics.visible = false;
        this.fallbackOverlayGraphics.visible = false;
        this.prevSprite.visible = false;
        this.nextSprite.visible = false;
        this.maskSprite.visible = false;
        this.baseMaskGraphics.clear();
        this.borderGraphics.clear();
        this.frontierGraphics.clear();

        let paintedCells = 0;
        let sceneBuildMs = 0;
        let paintMs = 0;
        let compositeMode: 'render_texture_mask' | 'vector_fallback' | 'steady' =
            'steady';
        let borderSceneCells: readonly GridRenderCell[] = [];
        const nextOwnershipScene = buildOwnershipSceneCells({
            classification: patternClassification,
            ownerColorIdx,
            side: 'next',
        });

        if (hasTransition) {
            const sceneStartMs = performance.now();
            const transitionScene = renderCellGridScene({
                classification: cached.classification,
                wavePlan: effectiveWavePlan,
                progress: easedProgress,
                flipTransition,
                flipWindow,
                strength: 1,
                inwardOffsetPx,
                ownerColorIdx,
                includeNativeCells: false,
            });
            sceneBuildMs = performance.now() - sceneStartMs;

            if (
                !useConstraintAlignedCenterlineBorders &&
                borderEnabled &&
                borderMode !== 'off' &&
                borderWidth > 0 &&
                borderAlpha > 0
            ) {
                const borderSceneStartMs = performance.now();
                const borderScene = renderCellGridScene({
                    classification: cached.classification,
                    wavePlan: effectiveWavePlan,
                    progress: easedProgress,
                    flipTransition,
                    flipWindow,
                    strength: 1,
                    inwardOffsetPx,
                    ownerColorIdx,
                    includeNativeCells: true,
                });
                borderSceneCells = borderScene.cells;
                sceneBuildMs += performance.now() - borderSceneStartMs;
            }

            const transitionMetrics = buildTransitionCellMetrics({
                schedulerSpacingPx: cached.classification.spacingPx,
                cellShape,
                cellCornerPx,
                finalCellSizePx: phaseFieldFinalCellSizePx,
                finishSizeMix,
            });
            const transitionSize = transitionMetrics.size;
            const transitionHalf = transitionMetrics.half;
            const transitionCornerR = transitionMetrics.cornerR;
            const transitionHexR = transitionMetrics.hexR;

            const paintStartMs = performance.now();
            if (input.renderer) {
                this.ensureTextures(input.world.width, input.world.height);
                const prevOwnershipScene = buildOwnershipSceneCells({
                    classification: patternClassification,
                    ownerColorIdx,
                    side: 'prev',
                });
                const prevTextureSig = [
                    cached.planKey,
                    cached.prevGeometry.version,
                    prevResolvedGeometry.appliedMarginPx.toFixed(2),
                    fillAlpha.toFixed(3),
                    satMult.toFixed(3),
                    lightMult.toFixed(3),
                    patternSpacingPx.toFixed(2),
                    patternClassification.spacingPx.toFixed(2),
                    cellShape,
                    cellInsetPx.toFixed(2),
                    cellCornerPx.toFixed(2),
                    inwardOffsetPx.toFixed(2),
                ].join('|');
                if (this.prevTexture && this.lastPrevTextureSig !== prevTextureSig) {
                    this.renderPatternTexture({
                        renderer: input.renderer,
                        texture: this.prevTexture,
                        patternGraphics: this.prevSourceGraphics,
                        maskGraphics: this.prevSourceMaskGraphics,
                        container: this.prevSourceContainer,
                        geometry: prevFillGeometry,
                        sceneCells: prevOwnershipScene,
                        fillHexByColorIdx,
                        cellShape,
                        cellSpacingPx: patternClassification.spacingPx,
                        cellInsetPx,
                        cellCornerPx,
                        alphaMultiplier: fillAlpha,
                    });
                    this.lastPrevTextureSig = prevTextureSig;
                }

                const nextTextureSig = [
                    cached.planKey,
                    currentGeometry.version,
                    currentResolvedGeometry.appliedMarginPx.toFixed(2),
                    fillAlpha.toFixed(3),
                    satMult.toFixed(3),
                    lightMult.toFixed(3),
                    patternSpacingPx.toFixed(2),
                    patternClassification.spacingPx.toFixed(2),
                    cellShape,
                    cellInsetPx.toFixed(2),
                    cellCornerPx.toFixed(2),
                    inwardOffsetPx.toFixed(2),
                ].join('|');
                if (this.nextTexture && this.lastNextTextureSig !== nextTextureSig) {
                    paintedCells = this.renderPatternTexture({
                        renderer: input.renderer,
                        texture: this.nextTexture,
                        patternGraphics: this.nextSourceGraphics,
                        maskGraphics: this.nextSourceMaskGraphics,
                        container: this.nextSourceContainer,
                        geometry: currentFillGeometry,
                        sceneCells: nextOwnershipScene,
                        fillHexByColorIdx,
                        cellShape,
                        cellSpacingPx: patternClassification.spacingPx,
                        cellInsetPx,
                        cellCornerPx,
                        alphaMultiplier: fillAlpha,
                    });
                    this.lastNextTextureSig = nextTextureSig;
                } else {
                    paintedCells = nextOwnershipScene.length;
                }

                const maskTextureSig = [
                    cached.planKey,
                    quantProgress(easedProgress),
                    quantProgress(normalizedProgress),
                    flipTransition,
                    flipWindow.toFixed(3),
                    prevMaskAlphaMultiplier.toFixed(3),
                    transitionSize.toFixed(2),
                    transitionCornerR.toFixed(2),
                ].join('|');
                if (this.maskTexture && this.lastMaskTextureSig !== maskTextureSig) {
                    paintedCells = this.renderPrevMaskTexture({
                        renderer: input.renderer,
                        texture: this.maskTexture,
                        scene: transitionScene.cells,
                        classification: cached.classification,
                        ownerColorIdx,
                        cellShape,
                        size: transitionSize,
                        half: transitionHalf,
                        cornerR: transitionCornerR,
                        hexR: transitionHexR,
                        alphaMultiplier: prevMaskAlphaMultiplier,
                    });
                    this.lastMaskTextureSig = maskTextureSig;
                } else {
                    paintedCells = transitionScene.cells.length;
                }

                this.prevSprite.visible = true;
                this.nextSprite.visible = true;
                this.maskSprite.visible = true;
                compositeMode = 'render_texture_mask';
            } else {
                paintedCells = paintCellScene({
                    graphics: this.baseGraphics,
                    sceneCells: nextOwnershipScene,
                    fillHexByColorIdx,
                    cellShape,
                    cellSpacingPx: patternClassification.spacingPx,
                    cellInsetPx,
                    cellCornerPx,
                    alphaMultiplier: fillAlpha,
                });
                drawGeometryFill({
                    graphics: this.baseMaskGraphics,
                    geometry: currentFillGeometry,
                    resolveColor: () => 0xffffff,
                    alpha: 1,
                });
                this.baseGraphics.visible = true;
                this.fallbackOverlayGraphics.clear();

                const byId = new Map<string, GridVStar>();
                for (const vstar of cached.classification.vstars) {
                    byId.set(vstar.id, vstar);
                }

                for (const cell of transitionScene.cells) {
                    const vstar = byId.get(cell.vId);
                    if (!isPrevSideCell(cell, vstar, ownerColorIdx)) continue;
                    const fillHex =
                        fillHexByColorIdx[cell.colorIdx] ??
                        this.colorUtils.getPlayerColor(vstar?.prevOwnerId ?? 'human-player');
                    drawFilledGridCell(
                        this.fallbackOverlayGraphics,
                        cellShape,
                        cell.x,
                        cell.y,
                        transitionHalf,
                        transitionSize,
                        transitionCornerR,
                        transitionHexR,
                        fillHex,
                        clamp01(cell.alpha * prevMaskAlphaMultiplier),
                    );
                    paintedCells += 1;
                }
                this.fallbackOverlayGraphics.visible = true;
                compositeMode = 'vector_fallback';
            }

            const activeWindowCount = Math.max(
                0,
                activeRange.endIndex - activeRange.startIndex,
            );
            if (activeWindowCount > 0 && phaseFieldFrontierHighlight) {
                const byId = new Map<string, GridVStar>();
                for (const vstar of cached.classification.vstars) {
                    byId.set(vstar.id, vstar);
                }
                const frontierAlphaMult =
                    borderMode === 'territory_edge'
                        ? 1
                        : borderMode === 'per_cell'
                          ? 0.8
                          : 0.55;
                for (let i = activeRange.startIndex; i < activeRange.endIndex; i++) {
                    const vId = effectiveWavePlan.orderedTransitionVIds[i];
                    if (!vId) continue;
                    const vstar = byId.get(vId);
                    if (!vstar || vstar.nextOwnerId === null) continue;
                    const nextIdx = ownerColorIdx.get(vstar.nextOwnerId);
                    if (nextIdx === undefined) continue;
                    const flipTime = effectiveWavePlan.flipTimeByVId.get(vId) ?? 0;
                    const frontierWidth = Math.max(0.0001, flipWindow);
                    const proximity = Math.max(
                        0,
                        1 - Math.abs(easedProgress - flipTime) / frontierWidth,
                    );
                    if (proximity <= 0) continue;
                    const frontierHexBase =
                        frontierHexByColorIdx[nextIdx] ?? fillHexByColorIdx[nextIdx];
                    const frontierHex = borderBlend
                        ? blendColors(frontierHexBase, 0xffffff, 0.18)
                        : frontierHexBase;
                    const { nextAlpha } = computeDualPassBlendAlphas({
                        progress: easedProgress,
                        flipTime,
                        flipWindow,
                        strength: 1,
                        emitPrev: vstar.prevOwnerId !== null,
                        emitNext: vstar.nextOwnerId !== null,
                    });
                    const alpha = clamp01(
                        Math.max(nextAlpha, proximity * borderAlpha * frontierAlphaMult) *
                            frontierAlphaMultiplier,
                    );
                    if (alpha <= 0) continue;
                    drawFilledGridCell(
                        this.frontierGraphics,
                        cellShape,
                        vstar.x,
                        vstar.y,
                        transitionHalf,
                        transitionSize,
                        transitionCornerR,
                        transitionHexR,
                        frontierHex,
                        alpha,
                    );
                }
            }
            paintMs = performance.now() - paintStartMs;
        } else {
            const paintStartMs = performance.now();
            if (input.renderer) {
                this.ensureTextures(input.world.width, input.world.height);
                const nextTextureSig = [
                    cached.planKey,
                    currentGeometry.version,
                    currentResolvedGeometry.appliedMarginPx.toFixed(2),
                    fillAlpha.toFixed(3),
                    satMult.toFixed(3),
                    lightMult.toFixed(3),
                    patternSpacingPx.toFixed(2),
                    patternClassification.spacingPx.toFixed(2),
                    cellShape,
                    cellInsetPx.toFixed(2),
                    cellCornerPx.toFixed(2),
                    inwardOffsetPx.toFixed(2),
                ].join('|');
                if (this.nextTexture && this.lastNextTextureSig !== nextTextureSig) {
                    paintedCells = this.renderPatternTexture({
                        renderer: input.renderer,
                        texture: this.nextTexture,
                        patternGraphics: this.nextSourceGraphics,
                        maskGraphics: this.nextSourceMaskGraphics,
                        container: this.nextSourceContainer,
                        geometry: currentFillGeometry,
                        sceneCells: nextOwnershipScene,
                        fillHexByColorIdx,
                        cellShape,
                        cellSpacingPx: patternClassification.spacingPx,
                        cellInsetPx,
                        cellCornerPx,
                        alphaMultiplier: fillAlpha,
                    });
                    this.lastNextTextureSig = nextTextureSig;
                } else {
                    paintedCells = nextOwnershipScene.length;
                }
                this.nextSprite.visible = true;
            } else {
                paintedCells = paintCellScene({
                    graphics: this.baseGraphics,
                    sceneCells: nextOwnershipScene,
                    fillHexByColorIdx,
                    cellShape,
                    cellSpacingPx: patternClassification.spacingPx,
                    cellInsetPx,
                    cellCornerPx,
                    alphaMultiplier: fillAlpha,
                });
                drawGeometryFill({
                    graphics: this.baseMaskGraphics,
                    geometry: currentFillGeometry,
                    resolveColor: () => 0xffffff,
                    alpha: 1,
                });
                this.baseGraphics.visible = true;
            }
            if (
                !useConstraintAlignedCenterlineBorders &&
                borderEnabled &&
                borderMode !== 'off' &&
                borderWidth > 0 &&
                borderAlpha > 0
            ) {
                const borderSceneStartMs = performance.now();
                const borderScene = renderCellGridScene({
                    classification: cached.classification,
                    wavePlan: effectiveWavePlan,
                    progress: easedProgress,
                    flipTransition,
                    flipWindow,
                    strength: 1,
                    inwardOffsetPx,
                    ownerColorIdx,
                    includeNativeCells: true,
                });
                borderSceneCells = borderScene.cells;
                sceneBuildMs += performance.now() - borderSceneStartMs;
            }
            paintMs = performance.now() - paintStartMs;
            compositeMode = 'steady';
        }

        if (useConstraintAlignedCenterlineBorders) {
            this.drawConstraintAlignedTerritoryBorderOverlay({
                geometry: currentResolvedGeometry,
                ownerColorIdx,
                borderHexByColorIdx: frontierHexByColorIdx,
                borderWidth,
                borderAlpha,
            });
        } else if (borderSceneCells.length > 0) {
            this.drawBorderOverlay({
                classification: cached.classification,
                sceneCells: borderSceneCells,
                ownerColorIdx,
                borderHexByColorIdx: frontierHexByColorIdx,
                cellShape,
                borderMode,
                borderBlend,
                borderWidth,
                borderAlpha,
                cellInsetPx,
                cellCornerPx,
                inwardOffsetPx,
                edgeTrimPx,
                sharedEdgeSmoothingPasses,
                borderChaikinPasses,
            });
        }

        this.frameCount += 1;
        this.lastPaintSig = paintSig;

        const lastUpdateMs = performance.now() - startMs;
        this.emaUpdateMs =
            this.emaUpdateMs <= 0
                ? lastUpdateMs
                : this.emaUpdateMs * 0.85 + lastUpdateMs * 0.15;

        this.updateDebugSnapshot({
            input,
            cached,
            settings,
            frontierDiagnostics,
            rawProgress,
            easedProgress,
            activeWindowCount: Math.max(0, activeRange.endIndex - activeRange.startIndex),
            compositeMode,
            paintedCells,
        });

        updateCellGridStats({
            familyId: this.id,
            familyLabel: this.label,
            geometrySource: settings.geometrySource,
            waveGeometry: settings.waveGeometry,
            waveSeeding: settings.waveSeeding,
            borderMode,
            borderBlend,
            edgeSmoothingPasses: sharedEdgeSmoothingPasses,
            edgeTrimPx,
            borderChaikinPasses,
            disconnectEnabled:
                (input.configSource?.MODIFIED_VORONOI_DISCONNECT_ENABLED as boolean | undefined) ??
                (GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ?? false),
            disconnectDistance:
                (input.configSource?.MODIFIED_VORONOI_DISCONNECT_DISTANCE as number | undefined) ??
                (GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ?? 0),
            dxWeight:
                (input.configSource?.TERRITORY_DX_WEIGHT as number | undefined) ??
                (GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0),
            transitionEventCount: input.activeTransition?.events.length ?? 0,
            requestedSpacingPx: settings.spacingPx,
            effectiveSpacingPx: cached.classification.spacingPx,
            requestedDensityCellsPerMpx: spacingToDensityCellsPerMpx(settings.spacingPx),
            effectiveDensityCellsPerMpx: spacingToDensityCellsPerMpx(
                cached.classification.spacingPx,
            ),
            totalCells: cached.classification.vstars.length,
            emittableCells: cached.classification.emittableVstars.length,
            paintedCells,
            lastUpdateMs,
            emaUpdateMs: this.emaUpdateMs,
            lastFrameSkipped: false,
            frameCount: this.frameCount,
            skippedFrameCount: this.skippedFrameCount,
            lastClassificationBuildMs: cached.classificationBuildMs,
            lastWavePlanBuildMs: cached.wavePlanBuildMs,
            lastPlanBuildMs: cached.planBuildMs,
            lastSceneBuildMs: sceneBuildMs,
            lastPaintMs: paintMs,
            planWorkerPending: false,
            holdingForPlan: false,
            visualTransitionActive: false,
            visibleFrameState: 'steady',
            clockSource: 'scheduler',
            renderCacheMode: input.renderer ? 'steady_texture' : 'live_vectors',
            activeWindowCount: Math.max(0, activeRange.endIndex - activeRange.startIndex),
            transitionTotalCount: frontierDiagnostics.transitionTotalCount,
            promotedToActiveCount: 0,
            demotedToSettledCount: 0,
            transitionSpriteWrites: paintedCells,
            fastPathUsed: false,
            fallbackReason:
                compositeMode === 'vector_fallback'
                    ? 'renderer unavailable'
                    : compositeMode === 'steady'
                      ? null
                      : 'phase_field_composite',
            configuredTransitionMs: GAME_CONFIG.TERRITORY_TRANSITION_MS ?? null,
            bindTransitionToTick:
                GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK ?? false,
            activeTransitionDurationMs: input.activeTransition?.durationMs ?? null,
            activeTransitionStartedAtMs: input.activeTransition?.startedAtMs ?? null,
            schedulerRawProgress: input.activeTransition?.progress ?? null,
            rawProgress,
            easedProgress,
            requestedPlanPending: false,
            flipTimeMin: frontierDiagnostics.min,
            flipTimeP25: frontierDiagnostics.p25,
            flipTimeP50: frontierDiagnostics.p50,
            flipTimeP75: frontierDiagnostics.p75,
            flipTimeP95: frontierDiagnostics.p95,
            flipTimeMax: frontierDiagnostics.max,
            flipTimeBins: frontierDiagnostics.bins,
            frontierVisibleStartProgress:
                frontierDiagnostics.visibleStartProgress,
            frontierVisibleEndProgress: frontierDiagnostics.visibleEndProgress,
            frontierVisibleLifetimeProgress:
                frontierDiagnostics.visibleLifetimeProgress,
            frontierVisibleLifetimeMs:
                frontierDiagnostics.visibleLifetimeProgress !== null &&
                input.activeTransition?.durationMs
                    ? frontierDiagnostics.visibleLifetimeProgress *
                      input.activeTransition.durationMs
                    : null,
        });

        return { container: this.root };
    }

    dispose(): void {
        this.sessionKey = null;
        this.resetState();
        if (this.root.parent) {
            this.root.parent.removeChild(this.root);
        }
        this.root.destroy({
            children: true,
        });
    }
}

export function createCellGridPhaseFieldFamily(
    colorUtils: ColorUtils,
): CellGridPhaseFieldFamily {
    return new CellGridPhaseFieldFamily(colorUtils);
}
