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

interface GridGradientBorderPolyline {
    readonly ownerA: string;
    readonly ownerB: string;
    readonly ownerPairKey?: string;
    readonly points: readonly [number, number][];
    readonly closed?: boolean;
}

export interface GridGradientVectorBorderChain {
    readonly ownerPairKey: string;
    readonly ownerA: string;
    readonly ownerB: string;
    readonly points: readonly [number, number][];
    readonly closed: boolean;
}

const WORLD_OWNER_IDS = new Set(['world', '__world__']);
const BORDER_JOIN_KEY_SCALE = 1000;

function isWorldOwner(ownerId: string | null | undefined): boolean {
    return !ownerId || WORLD_OWNER_IDS.has(ownerId);
}

function normalizeOwnerPair(
    polyline: GridGradientBorderPolyline,
): { ownerPairKey: string; ownerA: string; ownerB: string } {
    const keyOwners = polyline.ownerPairKey
        ?.split('|')
        .filter((ownerId) => ownerId.length > 0);
    const owners = (keyOwners?.length ? keyOwners : [polyline.ownerA, polyline.ownerB])
        .filter((ownerId) => !isWorldOwner(ownerId));
    const uniqueOwners = [...new Set(owners)];
    if (uniqueOwners.length <= 1) {
        const ownerA = uniqueOwners[0] ?? polyline.ownerA;
        return {
            ownerPairKey: `${ownerA}|world`,
            ownerA,
            ownerB: 'world',
        };
    }
    const [ownerA, ownerB] = uniqueOwners.sort((a, b) => a.localeCompare(b));
    return {
        ownerPairKey: `${ownerA}|${ownerB}`,
        ownerA: ownerA!,
        ownerB: ownerB!,
    };
}

function borderPointKey(point: readonly [number, number]): string {
    return [
        Math.round(point[0] * BORDER_JOIN_KEY_SCALE),
        Math.round(point[1] * BORDER_JOIN_KEY_SCALE),
    ].join(':');
}

function reversedPoints(
    points: readonly [number, number][],
): [number, number][] {
    return [...points].reverse().map(([x, y]) => [x, y]);
}

export function buildGridGradientVectorBorderChains(
    polylines: readonly GridGradientBorderPolyline[],
): GridGradientVectorBorderChain[] {
    const groups = new Map<string, GridGradientBorderPolyline[]>();
    const ownerByKey = new Map<string, { ownerA: string; ownerB: string }>();
    for (const polyline of polylines) {
        if (polyline.points.length < 2) continue;
        const normalized = normalizeOwnerPair(polyline);
        const group = groups.get(normalized.ownerPairKey);
        if (group) {
            group.push(polyline);
        } else {
            groups.set(normalized.ownerPairKey, [polyline]);
            ownerByKey.set(normalized.ownerPairKey, {
                ownerA: normalized.ownerA,
                ownerB: normalized.ownerB,
            });
        }
    }

    const chains: GridGradientVectorBorderChain[] = [];
    for (const [ownerPairKey, group] of groups) {
        const owners = ownerByKey.get(ownerPairKey);
        if (!owners) continue;
        const used = new Set<number>();
        const endpointMap = new Map<string, Array<{ index: number; at: 'start' | 'end' }>>();
        for (let index = 0; index < group.length; index += 1) {
            const points = group[index]!.points;
            const startKey = borderPointKey(points[0]!);
            const endKey = borderPointKey(points[points.length - 1]!);
            const startEntries = endpointMap.get(startKey) ?? [];
            startEntries.push({ index, at: 'start' });
            endpointMap.set(startKey, startEntries);
            const endEntries = endpointMap.get(endKey) ?? [];
            endEntries.push({ index, at: 'end' });
            endpointMap.set(endKey, endEntries);
        }

        const takeNext = (key: string): { index: number; at: 'start' | 'end' } | null =>
            endpointMap.get(key)?.find((entry) => !used.has(entry.index)) ?? null;

        const appendConnected = (points: [number, number][]): void => {
            while (points.length > 0) {
                const endKey = borderPointKey(points[points.length - 1]!);
                const next = takeNext(endKey);
                if (!next) return;
                used.add(next.index);
                const nextPoints = group[next.index]!.points;
                const oriented =
                    next.at === 'start' ? [...nextPoints] : reversedPoints(nextPoints);
                points.push(...oriented.slice(1).map(([x, y]) => [x, y] as [number, number]));
            }
        };

        const prependConnected = (points: [number, number][]): void => {
            while (points.length > 0) {
                const startKey = borderPointKey(points[0]!);
                const next = takeNext(startKey);
                if (!next) return;
                used.add(next.index);
                const nextPoints = group[next.index]!.points;
                const oriented =
                    next.at === 'start' ? reversedPoints(nextPoints) : [...nextPoints];
                points.unshift(
                    ...oriented
                        .slice(0, -1)
                        .map(([x, y]) => [x, y] as [number, number]),
                );
            }
        };

        for (let index = 0; index < group.length; index += 1) {
            if (used.has(index)) continue;
            const polyline = group[index]!;
            used.add(index);
            const points = polyline.points.map(([x, y]) => [x, y] as [number, number]);
            if (!polyline.closed) {
                appendConnected(points);
                prependConnected(points);
            }
            const endpointCloses =
                points.length > 2 &&
                borderPointKey(points[0]!) === borderPointKey(points[points.length - 1]!);
            const closed =
                Boolean(polyline.closed) ||
                endpointCloses;
            if (endpointCloses) {
                points.pop();
            }
            if (points.length < 2) continue;
            chains.push({
                ownerPairKey,
                ownerA: owners.ownerA,
                ownerB: owners.ownerB,
                points,
                closed,
            });
        }
    }

    return chains;
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
            params.settings.fillHueShiftDeg,
        );
        const border = adjustColorHSL(
            base,
            params.settings.borderSaturation,
            params.settings.borderLightness,
            params.settings.fillHueShiftDeg,
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
    const strokeChain = (chain: GridGradientVectorBorderChain): void => {
        if (chain.points.length < 2) return;
        const colorA = params.colorByOwnerId.get(chain.ownerA);
        const colorB = isWorldOwner(chain.ownerB)
            ? colorA
            : params.colorByOwnerId.get(chain.ownerB);
        if (colorA === undefined && colorB === undefined) return;
        const color =
            colorA !== undefined && colorB !== undefined && colorA !== colorB
                ? blendColors(colorA, colorB, 0.5)
                : colorA ?? colorB ?? 0xffffff;
        const [startX, startY] = chain.points[0];
        params.graphics.moveTo(startX, startY);
        for (let i = 1; i < chain.points.length; i += 1) {
            const [x, y] = chain.points[i];
            params.graphics.lineTo(x, y);
        }
        if (chain.closed) params.graphics.closePath();
        params.graphics.stroke({
            color,
            alpha: params.settings.borderAlpha,
            width: params.settings.borderWidthPx,
            cap: 'round',
            join: 'round',
        });
        count += 1;
    };

    for (const chain of buildGridGradientVectorBorderChains([
        ...frontierPolylines,
        ...worldPolylines,
    ])) {
        strokeChain(chain);
    }
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
