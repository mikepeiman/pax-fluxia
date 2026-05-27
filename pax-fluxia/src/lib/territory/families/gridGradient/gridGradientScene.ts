import { blendColors } from '$lib/utils/colorUtils';
import type {
    GridClassification,
    GridRenderCell,
    GridVRole,
    GridVStar,
} from '../metaballGrid/metaballGridTypes';
import type {
    OwnershipGridFrontierDistanceField,
} from '$lib/territory/frontier';
import type {
    GridGradientBorderDotStyle,
    GridGradientCellShape,
} from './config';

const INF = 1_000_000_000;

export interface GridGradientSizingParams {
    readonly distancePx: number;
    readonly ownerMaxDistancePx: number;
    readonly edgeSizePx: number;
    readonly centerSizePx: number;
    readonly curvePower: number;
    readonly borderOffsetPx: number;
}

export interface GridGradientBorderDot {
    readonly x: number;
    readonly y: number;
    readonly color: number;
    readonly alpha: number;
    readonly sizePx: number;
    readonly style: GridGradientBorderDotStyle;
    readonly ownerId: string | null;
}

export interface BuildGridGradientBorderDotsParams {
    readonly classification: GridClassification;
    readonly colorByOwnerId: ReadonlyMap<string, number>;
    readonly dotSizePx: number;
    readonly style: GridGradientBorderDotStyle;
    readonly alpha: number;
}

export interface GridGradientOwnerDistanceSummary {
    readonly ownerMaxDistancePxByIndex: readonly number[];
    readonly ownerIndexByCell: Int32Array;
}

function clamp01(value: number): number {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
}

export function resolveGridGradientCellSize(
    params: GridGradientSizingParams,
): number {
    const edgeSizePx = Math.max(0.5, params.edgeSizePx);
    const centerSizePx = Math.max(edgeSizePx, params.centerSizePx);
    const borderOffsetPx = Math.max(0, params.borderOffsetPx);
    const distancePx = Number.isFinite(params.distancePx)
        ? params.distancePx
        : params.ownerMaxDistancePx;

    if (distancePx < borderOffsetPx) return 0;

    const usableMax = Math.max(
        borderOffsetPx + 0.001,
        Number.isFinite(params.ownerMaxDistancePx)
            ? params.ownerMaxDistancePx
            : distancePx,
    );
    const rawT = (distancePx - borderOffsetPx) / (usableMax - borderOffsetPx);
    const curved = Math.pow(clamp01(rawT), Math.max(0.05, params.curvePower));
    return edgeSizePx + (centerSizePx - edgeSizePx) * curved;
}

export function isGridGradientTransitionRole(role: GridVRole): boolean {
    return role !== 'native' && role !== 'outside';
}

export function resolveGridGradientTransitionFloorSizePx(params: {
    readonly spacingPx: number;
    readonly edgeSizePx: number;
    readonly centerSizePx: number;
}): number {
    const edgeSizePx = Math.max(0.5, params.edgeSizePx);
    const centerSizePx = Math.max(edgeSizePx, params.centerSizePx);
    const spacingFloorPx = Math.max(edgeSizePx, Math.min(3, params.spacingPx * 0.5));
    return Math.min(centerSizePx, spacingFloorPx);
}

export function resolveGridGradientDrawableCellSize(
    params: GridGradientSizingParams & {
        readonly role: GridVRole;
        readonly spacingPx: number;
    },
): number {
    const baseSizePx = resolveGridGradientCellSize(params);
    if (!isGridGradientTransitionRole(params.role)) return baseSizePx;
    return Math.max(
        baseSizePx,
        resolveGridGradientTransitionFloorSizePx({
            spacingPx: params.spacingPx,
            edgeSizePx: params.edgeSizePx,
            centerSizePx: params.centerSizePx,
        }),
    );
}

export function resolveGridGradientTransitionScale(params: {
    readonly role: GridVRole;
    readonly alpha: number;
}): number {
    if (params.role === 'native') return 1;
    const alpha = clamp01(params.alpha);
    if (alpha <= 0) return 0;
    return 0.28 + 0.72 * Math.sqrt(alpha);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
    if (edge0 === edge1) return value < edge0 ? 0 : 1;
    const t = clamp01((value - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
}

export function resolveGridGradientTransitionBlendT(params: {
    readonly progress: number;
    readonly flipTime?: number;
    readonly flipWindow?: number;
}): number {
    const progress = clamp01(params.progress);
    if (!Number.isFinite(params.flipTime)) return progress;
    const flipTime = clamp01(params.flipTime ?? 0.5);
    const flipWindow = Math.max(0.28, params.flipWindow ?? 0.28);
    return smoothstep(flipTime - flipWindow, flipTime + flipWindow, progress);
}

export function resolveGridGradientTransitionSideAlphas(params: {
    readonly role: GridVRole;
    readonly progress: number;
    readonly flipTime?: number;
    readonly flipWindow?: number;
}): { prevAlpha: number; nextAlpha: number } {
    const t = resolveGridGradientTransitionBlendT(params);
    if (params.role === 'outside') return { prevAlpha: 0, nextAlpha: 0 };
    if (params.role === 'native') return { prevAlpha: 0, nextAlpha: 1 };
    if (params.role === 'emergent') return { prevAlpha: 0, nextAlpha: t };
    if (params.role === 'vacating') return { prevAlpha: 1 - t, nextAlpha: 0 };
    return { prevAlpha: 1 - t, nextAlpha: t };
}

export function buildGridGradientOwnerDistanceSummary(params: {
    readonly classification: GridClassification;
    readonly ownerIndexByOwnerId: ReadonlyMap<string, number>;
    readonly distanceField: OwnershipGridFrontierDistanceField;
}): GridGradientOwnerDistanceSummary {
    const ownerIndexByCell = new Int32Array(
        params.classification.cols * params.classification.rows,
    );
    ownerIndexByCell.fill(-1);
    const ownerMaxDistancePxByIndex: number[] = [];

    for (const v of params.classification.vstars) {
        const cellIndex = v.iy * params.classification.cols + v.ix;
        const ownerIndex =
            v.nextOwnerId === null
                ? -1
                : params.ownerIndexByOwnerId.get(v.nextOwnerId) ?? -1;
        ownerIndexByCell[cellIndex] = ownerIndex;
        if (ownerIndex < 0) continue;
        const distancePx =
            params.distanceField.nearestBoundaryPxByCell[cellIndex] ?? INF;
        if (!Number.isFinite(distancePx) || distancePx >= INF) continue;
        ownerMaxDistancePxByIndex[ownerIndex] = Math.max(
            ownerMaxDistancePxByIndex[ownerIndex] ?? 0,
            distancePx,
        );
    }

    return { ownerMaxDistancePxByIndex, ownerIndexByCell };
}

export function buildOwnerIndexByCell(params: {
    readonly classification: GridClassification;
    readonly ownerIndexByOwnerId: ReadonlyMap<string, number>;
}): Int32Array {
    const ownerIndexByCell = new Int32Array(
        params.classification.cols * params.classification.rows,
    );
    ownerIndexByCell.fill(-1);

    for (const v of params.classification.vstars) {
        const ownerIndex =
            v.nextOwnerId === null
                ? -1
                : params.ownerIndexByOwnerId.get(v.nextOwnerId) ?? -1;
        ownerIndexByCell[v.iy * params.classification.cols + v.ix] =
            ownerIndex;
    }

    return ownerIndexByCell;
}

export function buildGridGradientBorderDots(
    params: BuildGridGradientBorderDotsParams,
): GridGradientBorderDot[] {
    const { classification, colorByOwnerId, dotSizePx, style, alpha } = params;
    const dots: GridGradientBorderDot[] = [];
    const spacing = classification.spacingPx;

    const getCell = (ix: number, iy: number): GridVStar | null => {
        if (ix < 0 || iy < 0 || ix >= classification.cols || iy >= classification.rows) {
            return null;
        }
        return classification.vstars[iy * classification.cols + ix] ?? null;
    };

    const emitPair = (a: GridVStar, b: GridVStar): void => {
        const ownerA = a.nextOwnerId;
        const ownerB = b.nextOwnerId;
        if (!ownerA || !ownerB || ownerA === ownerB) return;
        const colorA = colorByOwnerId.get(ownerA);
        const colorB = colorByOwnerId.get(ownerB);
        if (colorA === undefined || colorB === undefined) return;

        const midX = (a.x + b.x) * 0.5;
        const midY = (a.y + b.y) * 0.5;
        if (style === 'blended') {
            dots.push({
                x: midX,
                y: midY,
                color: blendColors(colorA, colorB, 0.5),
                alpha,
                sizePx: dotSizePx,
                style,
                ownerId: null,
            });
            return;
        }

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const length = Math.max(0.001, Math.hypot(dx, dy));
        const inset = Math.min(spacing * 0.25, dotSizePx * 0.65);
        const ux = (dx / length) * inset;
        const uy = (dy / length) * inset;
        dots.push({
            x: midX - ux,
            y: midY - uy,
            color: colorA,
            alpha,
            sizePx: dotSizePx,
            style,
            ownerId: ownerA,
        });
        dots.push({
            x: midX + ux,
            y: midY + uy,
            color: colorB,
            alpha,
            sizePx: dotSizePx,
            style,
            ownerId: ownerB,
        });
    };

    for (let iy = 0; iy < classification.rows; iy += 1) {
        for (let ix = 0; ix < classification.cols; ix += 1) {
            const here = getCell(ix, iy);
            if (!here) continue;
            const right = getCell(ix + 1, iy);
            if (right) emitPair(here, right);
            const down = getCell(ix, iy + 1);
            if (down) emitPair(here, down);
        }
    }

    return dots;
}

function hash01(value: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < value.length; i += 1) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0) / 0x1_0000_0000;
}

export function buildGridGradientNoisePolygon(params: {
    readonly x: number;
    readonly y: number;
    readonly radiusPx: number;
    readonly cellId: string;
}): number[] {
    const points: number[] = [];
    const vertexCount = 8;
    for (let i = 0; i < vertexCount; i += 1) {
        const angle = (Math.PI * 2 * i) / vertexCount;
        const jitter = 0.78 + hash01(`${params.cellId}:${i}`) * 0.36;
        const radius = Math.max(0.1, params.radiusPx * jitter);
        points.push(
            params.x + Math.cos(angle) * radius,
            params.y + Math.sin(angle) * radius,
        );
    }
    return points;
}

export function isGridGradientCellShape(
    value: unknown,
): value is GridGradientCellShape {
    return value === 'circle' || value === 'square' || value === 'noise';
}

export function resolveRenderedOwnerId(cell: GridRenderCell): string {
    return `${cell.colorIdx}`;
}
