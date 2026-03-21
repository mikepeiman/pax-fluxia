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
    const previousByPair = new Map(
        previousGeometry.frontierPolylines.map((polyline) => [
            polyline.ownerPairKey,
            polyline.points,
        ]),
    );

    const correspondences: FrontierCorrespondence[] = [];
    for (const polyline of nextGeometry.frontierPolylines) {
        correspondences.push({
            ownerPairKey: polyline.ownerPairKey,
            previousPoints: previousByPair.get(polyline.ownerPairKey) ?? polyline.points,
            nextPoints: polyline.points,
        });
    }

    return correspondences;
}
