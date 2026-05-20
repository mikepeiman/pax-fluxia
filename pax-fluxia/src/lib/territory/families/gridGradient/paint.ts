import * as PIXI from 'pixi.js';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import { adjustColorHSL, blendColors } from '$lib/utils/colorUtils';
import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';
import type { RenderFamilyInput } from '../RenderFamilyTypes';
import type { GridGradientCellShape } from './config';
import { buildGridGradientNoisePolygon } from './gridGradientScene';
import type { GridGradientSettings } from './settings';

export interface GridGradientPalette {
    readonly ownerColorIdx: Map<string, number>;
    readonly fillHexByColorIdx: number[];
    readonly fillColorByOwnerId: Map<string, number>;
    readonly colorByOwnerId: Map<string, number>;
}

export function buildGridGradientPalette(params: {
    readonly colorUtils: ColorUtils;
    readonly input: RenderFamilyInput;
    readonly geometry: ResolvedGeometrySnapshot;
    readonly settings: GridGradientSettings;
}): GridGradientPalette {
    const ownerColorIdx = new Map<string, number>();
    const fillHexByColorIdx: number[] = [];
    const fillColorByOwnerId = new Map<string, number>();
    const colorByOwnerId = new Map<string, number>();
    const ensureOwner = (ownerId: string | null | undefined): void => {
        if (!ownerId || ownerColorIdx.has(ownerId)) return;
        const idx = fillHexByColorIdx.length;
        const base = params.colorUtils.getPlayerColor(ownerId);
        const fill = adjustColorHSL(
            base,
            params.settings.fillSaturation,
            params.settings.fillLightness,
        );
        const border = adjustColorHSL(
            base,
            params.settings.borderSaturation,
            params.settings.borderLightness,
        );
        ownerColorIdx.set(ownerId, idx);
        fillColorByOwnerId.set(ownerId, fill);
        colorByOwnerId.set(ownerId, border);
        fillHexByColorIdx.push(fill);
    };
    for (const star of params.input.stars) ensureOwner(star.ownerId);
    for (const region of params.geometry.territoryRegions) ensureOwner(region.ownerId);
    for (const entry of params.input.activeTransition?.events ?? []) {
        ensureOwner(entry.event.previousOwner);
        ensureOwner(entry.event.newOwner);
    }
    return {
        ownerColorIdx,
        fillHexByColorIdx,
        fillColorByOwnerId,
        colorByOwnerId,
    };
}

export function drawGridGradientCell(params: {
    readonly graphics: PIXI.Graphics;
    readonly shape: GridGradientCellShape;
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly sizePx: number;
    readonly color: number;
    readonly alpha: number;
}): void {
    const radius = params.sizePx * 0.5;
    if (params.shape === 'circle') {
        params.graphics.circle(params.x, params.y, radius).fill({
            color: params.color,
            alpha: params.alpha,
        });
        return;
    }
    if (params.shape === 'noise') {
        params.graphics
            .poly(
                buildGridGradientNoisePolygon({
                    x: params.x,
                    y: params.y,
                    radiusPx: radius,
                    cellId: params.id,
                }),
            )
            .fill({ color: params.color, alpha: params.alpha });
        return;
    }
    params.graphics
        .rect(params.x - radius, params.y - radius, params.sizePx, params.sizePx)
        .fill({ color: params.color, alpha: params.alpha });
}

export function drawGridGradientVectorBorders(params: {
    readonly graphics: PIXI.Graphics;
    readonly geometry: ResolvedGeometrySnapshot;
    readonly settings: GridGradientSettings;
    readonly colorByOwnerId: ReadonlyMap<string, number>;
}): number {
    if (
        !params.settings.vectorBordersEnabled ||
        params.settings.borderWidthPx <= 0 ||
        params.settings.borderAlpha <= 0
    ) {
        return 0;
    }
    const ladder = params.geometry.diagnostics.stageLadder;
    const frontierPolylines =
        ladder?.displayFrontierPolylines ?? params.geometry.frontierPolylines;
    const worldPolylines =
        ladder?.displayWorldBorderPolylines ?? params.geometry.worldBorderPolylines;
    let count = 0;
    const strokePolyline = (polyline: {
        ownerA: string;
        ownerB: string;
        points: readonly [number, number][];
        closed?: boolean;
    }): void => {
        if (polyline.points.length < 2) return;
        const colorA = params.colorByOwnerId.get(polyline.ownerA);
        const colorB =
            polyline.ownerB === '__world__'
                ? colorA
                : params.colorByOwnerId.get(polyline.ownerB);
        if (colorA === undefined && colorB === undefined) return;
        const color =
            colorA !== undefined && colorB !== undefined && colorA !== colorB
                ? blendColors(colorA, colorB, 0.5)
                : colorA ?? colorB ?? 0xffffff;
        const [startX, startY] = polyline.points[0];
        params.graphics.moveTo(startX, startY);
        for (let i = 1; i < polyline.points.length; i += 1) {
            const [x, y] = polyline.points[i];
            params.graphics.lineTo(x, y);
        }
        if (polyline.closed) params.graphics.closePath();
        params.graphics.stroke({
            color,
            alpha: params.settings.borderAlpha,
            width: params.settings.borderWidthPx,
            cap: 'round',
            join: 'round',
        });
        count += 1;
    };

    for (const polyline of frontierPolylines) strokePolyline(polyline);
    for (const polyline of worldPolylines) strokePolyline(polyline);
    return count;
}

export function drawGridGradientSolidFill(params: {
    readonly graphics: PIXI.Graphics;
    readonly geometry: ResolvedGeometrySnapshot;
    readonly settings: GridGradientSettings;
    readonly fillColorByOwnerId: ReadonlyMap<string, number>;
}): number {
    if (params.settings.fillAlpha <= 0) return 0;

    const regions =
        params.geometry.diagnostics.stageLadder?.resolvedRegions ??
        params.geometry.territoryRegions;
    let count = 0;
    for (const region of regions) {
        if (region.points.length < 3) continue;
        const color = params.fillColorByOwnerId.get(region.ownerId);
        if (color === undefined) continue;

        params.graphics.beginPath();
        const [startX, startY] = region.points[0];
        params.graphics.moveTo(startX, startY);
        for (let i = 1; i < region.points.length; i += 1) {
            const [x, y] = region.points[i];
            params.graphics.lineTo(x, y);
        }
        params.graphics.closePath();
        params.graphics.fill({
            color,
            alpha: params.settings.fillAlpha,
        });
        count += 1;
    }
    return count;
}
