export interface TerritoryGeometryFingerprintStar {
    id: string;
    ownerId?: string | null;
}

export interface TerritoryGeometryFingerprintSettings {
    starWeight: number;
    msrPx: number;
    clusterSplit: boolean;
    cxEnabled: boolean;
    cxSpacingPx: number;
    cxPointCount: number;
    cxWeight: number;
    lpMidpointPairEnabled: boolean;
    lpPairCount: number;
    lpPairSpacingPx: number;
    lpPairWeight: number;
    dxEnabled: boolean;
    dxMaxDistancePx: number;
    dxWeight: number;
    chaikinPasses: number;
}

export function buildTerritoryGeometryFingerprintCore(
    stars: ReadonlyArray<TerritoryGeometryFingerprintStar>,
    config: TerritoryGeometryFingerprintSettings,
): string {
    let fp = 'power_voronoi:';
    for (const star of stars) {
        fp += `${star.id}:${star.ownerId ?? ''}|`;
    }
    fp += `:sw${config.starWeight}`;
    fp += `:msr${config.msrPx}`;
    fp += `:cs${config.clusterSplit ? 1 : 0}`;
    fp += `:cxe${config.cxEnabled ? 1 : 0}`;
    fp += `:cxS${config.cxSpacingPx}`;
    fp += `:cxN${config.cxPointCount}`;
    fp += `:cxW${config.cxWeight}`;
    fp += `:lpm${config.lpMidpointPairEnabled ? 1 : 0}`;
    fp += `:lpN${config.lpPairCount}`;
    fp += `:lpS${config.lpPairSpacingPx}`;
    fp += `:lpW${config.lpPairWeight}`;
    fp += `:dxe${config.dxEnabled ? 1 : 0}`;
    fp += `:dxD${config.dxMaxDistancePx}`;
    fp += `:dxW${config.dxWeight}`;
    fp += `:ch${config.chaikinPasses}`;
    return fp;
}
