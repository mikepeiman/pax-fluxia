import type { GeometrySnapshot } from '../../../contracts/GeometryContracts';

export interface FrontierCorrespondence {
    ownerPairKey: string;
    previousPoints: [number, number][];
    nextPoints: [number, number][];
}

export function planFrontierCorrespondence(
    previousGeometry: GeometrySnapshot,
    nextGeometry: GeometrySnapshot,
): FrontierCorrespondence[] {
    // Build multimap — multiple segments can share the same ownerPairKey
    const previousByPair = new Map<string, [number, number][][]>();
    for (const polyline of previousGeometry.frontierPolylines) {
        const arr = previousByPair.get(polyline.ownerPairKey);
        if (arr) arr.push(polyline.points);
        else previousByPair.set(polyline.ownerPairKey, [polyline.points]);
    }

    // Track segment index per key for matching
    const nextIndexByKey = new Map<string, number>();

    const correspondences: FrontierCorrespondence[] = [];
    for (const polyline of nextGeometry.frontierPolylines) {
        const idx = nextIndexByKey.get(polyline.ownerPairKey) ?? 0;
        nextIndexByKey.set(polyline.ownerPairKey, idx + 1);

        const prevSegments = previousByPair.get(polyline.ownerPairKey);
        const prevPoints = prevSegments?.[idx] ?? polyline.points;

        correspondences.push({
            ownerPairKey: polyline.ownerPairKey,
            previousPoints: prevPoints,
            nextPoints: polyline.points,
        });
    }

    return correspondences;
}
