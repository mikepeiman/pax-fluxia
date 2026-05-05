export interface TerritoryGeometryFingerprintStar {
    id: string;
    ownerId?: string | null;
}

export interface TerritoryGeometryFingerprintSettings {
    starMargin: number;
    clusterSplit: boolean;
    corridorEnabled: boolean;
    corridorSpacing: number;
    cxCount: number;
    cxWeight: number;
    cxContestPairSpacing?: number;
    disconnectEnabled: boolean;
    disconnectDistance: number;
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
    fp += `:m${config.starMargin}`;
    fp += `:cs${config.clusterSplit ? 1 : 0}`;
    fp += `:ce${config.corridorEnabled ? 1 : 0}`;
    fp += `:csp${config.corridorSpacing}`;
    fp += `:cxN${config.cxCount}`;
    fp += `:cxW${config.cxWeight}`;
    fp += `:cxPS${config.cxContestPairSpacing ?? config.starMargin}`;
    fp += `:de${config.disconnectEnabled ? 1 : 0}`;
    fp += `:dd${config.disconnectDistance}`;
    fp += `:dxW${config.dxWeight}`;
    fp += `:ch${config.chaikinPasses}`;
    return fp;
}
