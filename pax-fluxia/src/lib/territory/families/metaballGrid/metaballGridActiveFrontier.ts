import type {
    GridClassification,
    GridVStar,
} from './metaballGridTypes';

export interface ActiveFrontierRange {
    readonly startIndex: number;
    readonly endIndex: number;
}

export interface OrderedTransitionFrontier {
    readonly orderedTransitionVIds: readonly string[];
    readonly orderedFlipTimes: readonly number[];
}

function clamp01(x: number): number {
    return x < 0 ? 0 : x > 1 ? 1 : x;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
    if (edge1 <= edge0) return x < edge0 ? 0 : 1;
    const t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
}

function compareVStars(a: GridVStar, b: GridVStar): number {
    return a.iy - b.iy || a.ix - b.ix || a.id.localeCompare(b.id);
}

export function buildOrderedTransitionFrontier(params: {
    classification: GridClassification;
    flipTimeByVId: ReadonlyMap<string, number>;
}): OrderedTransitionFrontier {
    const { classification, flipTimeByVId } = params;
    const entries: Array<{ readonly vId: string; readonly flipTime: number; readonly vstar: GridVStar }> = [];
    for (let i = 0; i < classification.emittableVstars.length; i++) {
        const vstar = classification.emittableVstars[i];
        if (vstar.role === 'native') continue;
        entries.push({
            vId: vstar.id,
            flipTime: flipTimeByVId.get(vstar.id) ?? 0,
            vstar,
        });
    }
    entries.sort((a, b) => a.flipTime - b.flipTime || compareVStars(a.vstar, b.vstar));
    return {
        orderedTransitionVIds: entries.map((entry) => entry.vId),
        orderedFlipTimes: entries.map((entry) => entry.flipTime),
    };
}

export function lowerBound(values: readonly number[], target: number): number {
    let lo = 0;
    let hi = values.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (values[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

export function upperBound(values: readonly number[], target: number): number {
    let lo = 0;
    let hi = values.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (values[mid] <= target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

export function findActiveFrontierRange(params: {
    orderedFlipTimes: readonly number[];
    progress: number;
    flipWindow: number;
}): ActiveFrontierRange {
    const { orderedFlipTimes, progress } = params;
    const flipWindow = Math.max(0, params.flipWindow);
    if (orderedFlipTimes.length === 0) {
        return { startIndex: 0, endIndex: 0 };
    }
    const startIndex = lowerBound(orderedFlipTimes, progress - flipWindow);
    const endIndex = upperBound(orderedFlipTimes, progress + flipWindow);
    return { startIndex, endIndex };
}

export function computeDualPassBlendAlphas(params: {
    progress: number;
    flipTime: number;
    flipWindow: number;
    strength: number;
    emitPrev: boolean;
    emitNext: boolean;
}): { prevAlpha: number; nextAlpha: number } {
    const s = smoothstep(
        params.flipTime - params.flipWindow,
        params.flipTime + params.flipWindow,
        params.progress,
    );
    const gain = clamp01(params.strength);
    return {
        prevAlpha: (1 - s) * (params.emitPrev ? 1 : 0) * gain,
        nextAlpha: s * (params.emitNext ? 1 : 0) * gain,
    };
}
