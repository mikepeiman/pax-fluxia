import type { TerritoryRegionShape } from '$lib/territory/contracts/GeometryContracts';
import type { BackgroundSelection } from '../types';

export interface RegionBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}

export function hashString(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function clamp01(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(0, Math.min(1, value));
}

export function clampAlpha(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(0.98, value));
}

export function read(
    selection: BackgroundSelection,
    key: string,
    fallback: number,
): number {
    const value = selection.tunables[key];
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : fallback;
}

export function readStrength(
    selection: BackgroundSelection,
    key: string,
    fallback: number,
    minimum = 0,
): number {
    return Math.max(minimum, read(selection, key, fallback));
}

export function readAnimationRate(
    selection: BackgroundSelection,
    fallback = 1,
): number {
    return Math.max(0, read(selection, 'animationSpeed', fallback));
}

export function readFeatureScale(
    selection: BackgroundSelection,
    fallback = 1,
): number {
    return Math.max(0.1, read(selection, 'scale', fallback));
}

export function computeBounds(region: TerritoryRegionShape): RegionBounds {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const point of region.points) {
        minX = Math.min(minX, point[0]);
        minY = Math.min(minY, point[1]);
        maxX = Math.max(maxX, point[0]);
        maxY = Math.max(maxY, point[1]);
    }
    return {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
    };
}

export function traceRegion(
    ctx: CanvasRenderingContext2D,
    region: TerritoryRegionShape,
): void {
    if (region.points.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(region.points[0]![0], region.points[0]![1]);
    for (let index = 1; index < region.points.length; index += 1) {
        const point = region.points[index]!;
        ctx.lineTo(point[0], point[1]);
    }
    ctx.closePath();
}

export function randomUnit(seed: number): number {
    const next = Math.sin(seed * 91.371) * 43758.5453123;
    return next - Math.floor(next);
}

export function samplePolylinePoint(
    points: readonly [number, number][],
    progress: number,
): [number, number] {
    if (points.length === 0) return [0, 0];
    if (points.length === 1) return points[0]!;
    const clamped = Math.max(0, Math.min(0.9999, progress));
    const scaled = clamped * points.length;
    const startIndex = Math.floor(scaled) % points.length;
    const endIndex = (startIndex + 1) % points.length;
    const local = scaled - Math.floor(scaled);
    const start = points[startIndex]!;
    const end = points[endIndex]!;
    return [
        start[0] + (end[0] - start[0]) * local,
        start[1] + (end[1] - start[1]) * local,
    ];
}
