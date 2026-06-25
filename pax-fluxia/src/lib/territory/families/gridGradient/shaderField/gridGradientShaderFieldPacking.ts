import type { GridVRole } from '../../cellGrid/cellGridTypes';
import { renderCellGridScene } from '../../cellGrid/renderCellGridScene';
import type { BuildGridGradientShaderFieldTexturePlanParams, GridGradientShaderFieldTexturePlan } from './gridGradientShaderFieldTypes';

const ROLE_BYTE: Record<GridVRole, number> = {
    outside: 0,
    native: 1,
    dispossessed: 2,
    emergent: 3,
    vacating: 4,
};

const TRANSPARENT_OWNER_INDEX = 0;

function clamp01(value: number): number {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
}

function packU16(value: number, out: Uint8Array, offset: number): void {
    const v = Math.max(0, Math.min(65535, value | 0));
    out[offset] = v & 0xff;
    out[offset + 1] = (v >> 8) & 0xff;
}

function packHexColor(hex: number, alpha: number, out: Uint8Array, offset: number): void {
    out[offset] = (hex >> 16) & 0xff;
    out[offset + 1] = (hex >> 8) & 0xff;
    out[offset + 2] = hex & 0xff;
    out[offset + 3] = Math.round(clamp01(alpha) * 255);
}

function hashCellByte(ix: number, iy: number): number {
    let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263);
    h ^= h >>> 13;
    h = Math.imul(h, 1274126177);
    h ^= h >>> 16;
    return (h >>> 24) & 0xff;
}

function resolveDistanceBand(params: {
    distancePx: number;
    ownerMaxDistancePx: number;
    borderOffsetPx: number;
}): number {
    const borderOffsetPx = Math.max(0, params.borderOffsetPx);
    const distancePx = Number.isFinite(params.distancePx) ? params.distancePx : params.ownerMaxDistancePx;
    if (!Number.isFinite(distancePx) || distancePx < borderOffsetPx) return 0;
    const maxDistance = Math.max(borderOffsetPx + 0.001, Number.isFinite(params.ownerMaxDistancePx) ? params.ownerMaxDistancePx : distancePx);
    const t = (distancePx - borderOffsetPx) / (maxDistance - borderOffsetPx);
    return Math.round(clamp01(t) * 255);
}

function buildPalette(params: BuildGridGradientShaderFieldTexturePlanParams): {
    ownerPaletteIndexByColorIdx: Int32Array;
    ownerIdByPaletteIndex: Array<string | null>;
    paletteTextureData: Uint8Array;
    paletteSize: number;
} {
    const fillColors = params.palette.fillHexByColorIdx;
    const paletteSize = Math.max(1, fillColors.length + 1);
    const paletteTextureData = new Uint8Array(paletteSize * 4);
    const ownerPaletteIndexByColorIdx = new Int32Array(fillColors.length);
    const ownerIdByPaletteIndex: Array<string | null> = [null];

    packHexColor(0x000000, 0, paletteTextureData, 0);

    for (let colorIdx = 0; colorIdx < fillColors.length; colorIdx += 1) {
        const paletteIndex = colorIdx + 1;
        ownerPaletteIndexByColorIdx[colorIdx] = paletteIndex;
        packHexColor(fillColors[colorIdx] ?? 0xffffff, 1, paletteTextureData, paletteIndex * 4);
        ownerIdByPaletteIndex[paletteIndex] = null;
    }

    for (const [ownerId, colorIdx] of params.palette.ownerColorIdx.entries()) {
        const paletteIndex = colorIdx + 1;
        ownerIdByPaletteIndex[paletteIndex] = ownerId;
    }

    return {
        ownerPaletteIndexByColorIdx,
        ownerIdByPaletteIndex,
        paletteTextureData,
        paletteSize,
    };
}

function buildCellOwnerMaps(params: BuildGridGradientShaderFieldTexturePlanParams): {
    prevOwnerByCell: Uint16Array;
    nextOwnerByCell: Uint16Array;
} {
    const count = params.classification.cols * params.classification.rows;
    const prevOwnerByCell = new Uint16Array(count);
    const nextOwnerByCell = new Uint16Array(count);

    const typed = params.typedClassification;
    if (typed) {
        const ownerPaletteIndexByTypedIndex = new Int32Array(typed.ownerIdByIndex.length);
        ownerPaletteIndexByTypedIndex.fill(TRANSPARENT_OWNER_INDEX);
        for (let ownerIndex = 0; ownerIndex < typed.ownerIdByIndex.length; ownerIndex += 1) {
            const ownerId = typed.ownerIdByIndex[ownerIndex];
            const colorIdx = params.palette.ownerColorIdx.get(ownerId) ?? -1;
            ownerPaletteIndexByTypedIndex[ownerIndex] =
                colorIdx < 0 ? TRANSPARENT_OWNER_INDEX : colorIdx + 1;
        }
        for (let i = 0; i < count; i += 1) {
            const prevOwnerIndex = typed.prevOwnerIndexByCell[i] ?? -1;
            const nextOwnerIndex = typed.nextOwnerIndexByCell[i] ?? -1;
            prevOwnerByCell[i] = prevOwnerIndex < 0
                ? TRANSPARENT_OWNER_INDEX
                : ownerPaletteIndexByTypedIndex[prevOwnerIndex] ?? TRANSPARENT_OWNER_INDEX;
            nextOwnerByCell[i] = nextOwnerIndex < 0
                ? TRANSPARENT_OWNER_INDEX
                : ownerPaletteIndexByTypedIndex[nextOwnerIndex] ?? TRANSPARENT_OWNER_INDEX;
        }
        return { prevOwnerByCell, nextOwnerByCell };
    }

    for (const v of params.classification.vstars) {
        const i = v.iy * params.classification.cols + v.ix;
        const prevColorIdx = v.prevOwnerId === null
            ? -1
            : params.palette.ownerColorIdx.get(v.prevOwnerId) ?? -1;
        const nextColorIdx = v.nextOwnerId === null
            ? -1
            : params.palette.ownerColorIdx.get(v.nextOwnerId) ?? -1;
        prevOwnerByCell[i] =
            prevColorIdx < 0 ? TRANSPARENT_OWNER_INDEX : prevColorIdx + 1;
        nextOwnerByCell[i] =
            nextColorIdx < 0 ? TRANSPARENT_OWNER_INDEX : nextColorIdx + 1;
    }

    return { prevOwnerByCell, nextOwnerByCell };
}

/**
 * Pack all data needed by the shader-field backend.
 *
 * The shader backend intentionally does not build per-cell Pixi display objects.
 * It packs per-cell truth into textures and lets one field shader reconstruct marks.
 */
export function buildGridGradientShaderFieldTexturePlan(
    params: BuildGridGradientShaderFieldTexturePlanParams,
): GridGradientShaderFieldTexturePlan {
    const packStartMs = performance.now();
    const cols = params.classification.cols;
    const rows = params.classification.rows;
    const totalCells = cols * rows;
    const firstCell = params.classification.vstars[0];
    const gridOriginX = firstCell
        ? firstCell.x - params.classification.spacingPx * 0.5
        : 0;
    const gridOriginY = firstCell
        ? firstCell.y - params.classification.spacingPx * 0.5
        : 0;

    const paletteStartMs = performance.now();
    const palette = buildPalette(params);
    const paletteBuildMs = performance.now() - paletteStartMs;

    const ownerMapStartMs = performance.now();
    const ownerMaps = buildCellOwnerMaps(params);
    const ownerMapBuildMs = performance.now() - ownerMapStartMs;

    const ownerTextureData = new Uint8Array(totalCells * 4);
    const metricsTextureData = new Uint8Array(totalCells * 4);

    let activeTransitionCells = 0;
    let activeDrawableTransitionCells = 0;
    let activeOffsetZoneTransitionCells = 0;
    let outsideCells = 0;

    if (params.typedClassification && params.flipTimeByteByCell) {
        const typed = params.typedClassification;
        for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
            const ownerOffset = cellIndex * 4;
            const metricsOffset = cellIndex * 4;
            const prevOwner = ownerMaps.prevOwnerByCell[cellIndex] ?? TRANSPARENT_OWNER_INDEX;
            const nextOwner = ownerMaps.nextOwnerByCell[cellIndex] ?? TRANSPARENT_OWNER_INDEX;

            packU16(prevOwner, ownerTextureData, ownerOffset);
            packU16(nextOwner, ownerTextureData, ownerOffset + 2);

            const ownerIndex = params.ownerIndexByCell[cellIndex] ?? -1;
            const distancePx =
                params.distanceField.nearestBoundaryPxByCell[cellIndex] ?? 0;
            const maxDistance =
                ownerIndex >= 0
                    ? params.ownerMaxDistancePxByIndex[ownerIndex] ?? distancePx
                    : distancePx;
            const distanceBand = resolveDistanceBand({
                distancePx,
                ownerMaxDistancePx: maxDistance,
                borderOffsetPx: params.settings.borderOffsetPx,
            });
            metricsTextureData[metricsOffset] = distanceBand;
            const roleByte = typed.roleCodeByCell[cellIndex] ?? 0;
            const ix = cellIndex % cols;
            const iy = Math.floor(cellIndex / cols);
            metricsTextureData[metricsOffset + 1] =
                params.flipTimeByteByCell[cellIndex] ?? 0;
            metricsTextureData[metricsOffset + 2] = roleByte;
            metricsTextureData[metricsOffset + 3] = hashCellByte(ix, iy);

            if (roleByte !== ROLE_BYTE.native && roleByte !== ROLE_BYTE.outside) {
                activeTransitionCells += 1;
                activeDrawableTransitionCells += 1;
                if (params.settings.borderOffsetPx > 0 && distanceBand <= 0) {
                    activeOffsetZoneTransitionCells += 1;
                }
            }
            if (roleByte === ROLE_BYTE.outside) outsideCells += 1;
        }
    } else {
        for (const v of params.classification.vstars) {
            const cellIndex = v.iy * cols + v.ix;
            const ownerOffset = cellIndex * 4;
            const metricsOffset = cellIndex * 4;
            const prevOwner = ownerMaps.prevOwnerByCell[cellIndex] ?? TRANSPARENT_OWNER_INDEX;
            const nextOwner = ownerMaps.nextOwnerByCell[cellIndex] ?? TRANSPARENT_OWNER_INDEX;

            packU16(prevOwner, ownerTextureData, ownerOffset);
            packU16(nextOwner, ownerTextureData, ownerOffset + 2);

            const ownerIndex = params.ownerIndexByCell[cellIndex] ?? -1;
            const distancePx = params.distanceField.nearestBoundaryPxByCell[cellIndex] ?? 0;
            const maxDistance = ownerIndex >= 0 ? params.ownerMaxDistancePxByIndex[ownerIndex] ?? distancePx : distancePx;
            const distanceBand = resolveDistanceBand({
                distancePx,
                ownerMaxDistancePx: maxDistance,
                borderOffsetPx: params.settings.borderOffsetPx,
            });
            metricsTextureData[metricsOffset] = distanceBand;

            const roleByte = ROLE_BYTE[v.role] ?? 0;
            metricsTextureData[metricsOffset + 1] =
                Math.round(
                    clamp01(
                        params.wavePlan.flipTimeByVId.get(v.id) ??
                            (v.role === 'native' ? 1 : 0),
                    ) * 255,
                );
            metricsTextureData[metricsOffset + 2] = roleByte;
            metricsTextureData[metricsOffset + 3] = hashCellByte(v.ix, v.iy);

            if (roleByte !== ROLE_BYTE.native && roleByte !== ROLE_BYTE.outside) {
                activeTransitionCells += 1;
                activeDrawableTransitionCells += 1;
                if (params.settings.borderOffsetPx > 0 && distanceBand <= 0) {
                    activeOffsetZoneTransitionCells += 1;
                }
            }
            if (roleByte === ROLE_BYTE.outside) outsideCells += 1;
        }
    }

    return {
        planKey: params.planKey,
        presentationKey: params.presentationKey,
        cols,
        rows,
        worldMinX: 0,
        worldMinY: 0,
        worldWidth: params.world.width,
        worldHeight: params.world.height,
        gridOriginX,
        gridOriginY,
        spacingPx: params.classification.spacingPx,
        requestedSpacingPx: params.classification.requestedSpacingPx,
        ownerTextureData,
        metricsTextureData,
        paletteTextureData: palette.paletteTextureData,
        paletteSize: palette.paletteSize,
        ownerIdByPaletteIndex: palette.ownerIdByPaletteIndex,
        totalCells,
        emittableCells:
            params.typedClassification?.emittableCellIndices.length ??
            params.classification.emittableVstars.length,
        activeTransitionCells,
        activeDrawableTransitionCells,
        activeOffsetZoneTransitionCells,
        outsideCells,
        texturePackMs: performance.now() - packStartMs,
        distanceBuildMs: params.distanceBuildMs ?? 0,
        ownerSummaryBuildMs: params.ownerSummaryBuildMs ?? ownerMapBuildMs + paletteBuildMs,
        textureBytes: ownerTextureData.byteLength + metricsTextureData.byteLength + palette.paletteTextureData.byteLength,
    };
}

/**
 * Optional utility for parity testing: reconstruct a single effective owner index
 * from the packed textures at a hard progress threshold.
 */
export function resolvePackedOwnerIndexAtProgress(params: {
    plan: GridGradientShaderFieldTexturePlan;
    cellIndex: number;
    progress: number;
}): number {
    const ownerOffset = params.cellIndex * 4;
    const metricsOffset = params.cellIndex * 4;
    const prev = params.plan.ownerTextureData[ownerOffset] | (params.plan.ownerTextureData[ownerOffset + 1] << 8);
    const next = params.plan.ownerTextureData[ownerOffset + 2] | (params.plan.ownerTextureData[ownerOffset + 3] << 8);
    const flip = params.plan.metricsTextureData[metricsOffset + 1] / 255;
    return params.progress >= flip ? next : prev;
}

/**
 * Keep this import reachable in tests, and document that the shader packer is
 * semantically paired with the existing scene builder even though it bypasses
 * per-frame scene-cell painting for production rendering.
 */
export const __gridGradientShaderFieldSceneBuilder = renderCellGridScene;
