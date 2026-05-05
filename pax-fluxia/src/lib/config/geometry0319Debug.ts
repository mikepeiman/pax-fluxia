export interface Geometry0319DebugSnapshot {
    useRenderFamilies: boolean | null;
    territoryRenderMode: string | null;
    geometrySource: string | null;
    frontierResolution: number | null;
    starWeight: number | null;
    msrPx: number | null;
    cxEnabled: boolean | null;
    cxSpacingPx: number | null;
    cxPointCount: number | null;
    cxWeight: number | null;
    lpMidpointPairEnabled: boolean | null;
    lpPairCount: number | null;
    lpPairSpacingPx: number | null;
    lpPairWeight: number | null;
    dxEnabled: boolean | null;
    dxMaxDistancePx: number | null;
    dxWeight: number | null;
    clusterSplit: boolean | null;
    chaikinPasses: number | null;
    boundaryPad: number | null;
    boundaryEps: number | null;
}

function asBoolean(value: unknown): boolean | null {
    return typeof value === 'boolean' ? value : null;
}

function asNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function firstNumber(...values: unknown[]): number | null {
    for (const value of values) {
        const numeric = asNumber(value);
        if (numeric !== null) return numeric;
    }
    return null;
}

function firstBoolean(...values: unknown[]): boolean | null {
    for (const value of values) {
        const bool = asBoolean(value);
        if (bool !== null) return bool;
    }
    return null;
}

export function snapshotGeometry0319DebugConfig(
    source: Record<string, unknown>,
): Geometry0319DebugSnapshot {
    return {
        useRenderFamilies: asBoolean(source.USE_RENDER_FAMILIES),
        territoryRenderMode: asString(source.TERRITORY_RENDER_MODE),
        geometrySource:
            asString(source.geometrySource) ??
            asString(source.PERIMETER_FIELD_GEOMETRY_SOURCE),
        frontierResolution: firstNumber(
            source.frontierResolution,
            source.FRONTIER_RESOLUTION,
        ),
        starWeight: firstNumber(
            source.starWeight,
            source.MODIFIED_VORONOI_STAR_MARGIN,
        ),
        msrPx: firstNumber(
            source.msrPx,
            source.TERRITORY_MSR_PX,
            source.MODIFIED_VORONOI_STAR_MARGIN,
        ),
        cxEnabled: firstBoolean(
            source.cxEnabled,
            source.MODIFIED_VORONOI_CORRIDOR_ENABLED,
        ),
        cxSpacingPx: firstNumber(
            source.cxSpacingPx,
            source.MODIFIED_VORONOI_CORRIDOR_SPACING,
        ),
        cxPointCount: firstNumber(source.cxPointCount, source.TERRITORY_CX_COUNT),
        cxWeight: firstNumber(source.cxWeight, source.TERRITORY_CX_WEIGHT),
        lpMidpointPairEnabled: firstBoolean(
            source.lpMidpointPairEnabled,
            source.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS,
        ),
        lpPairCount: firstNumber(
            source.lpPairCount,
            source.TERRITORY_CX_CONTEST_PAIR_COUNT,
        ),
        lpPairSpacingPx: firstNumber(
            source.lpPairSpacingPx,
            source.TERRITORY_CX_CONTEST_PAIR_SPACING,
        ),
        lpPairWeight: firstNumber(
            source.lpPairWeight,
            source.TERRITORY_CX_CONTEST_PAIR_WEIGHT,
        ),
        dxEnabled: firstBoolean(
            source.dxEnabled,
            source.MODIFIED_VORONOI_DISCONNECT_ENABLED,
        ),
        dxMaxDistancePx: firstNumber(
            source.dxMaxDistancePx,
            source.MODIFIED_VORONOI_DISCONNECT_DISTANCE,
        ),
        dxWeight: firstNumber(source.dxWeight, source.TERRITORY_DX_WEIGHT),
        clusterSplit: firstBoolean(source.clusterSplit, source.TERRITORY_CLUSTER_SPLIT),
        chaikinPasses: firstNumber(source.chaikinPasses, source.VORONOI_BORDER_SMOOTH),
        boundaryPad: firstNumber(source.boundaryPad, source.CHAIKIN_BOUNDARY_PAD),
        boundaryEps: firstNumber(source.boundaryEps, source.CHAIKIN_BOUNDARY_EPS),
    };
}

function fmtBoolean(value: boolean | null): string {
    if (value === null) return '-';
    return value ? '1' : '0';
}

function fmtNumber(value: number | null): string {
    if (value === null) return '-';
    return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

function fmtString(value: string | null): string {
    return value ?? '-';
}

export function formatGeometry0319DebugConfig(
    snapshot: Geometry0319DebugSnapshot,
): string {
    return [
        `mode=${fmtString(snapshot.territoryRenderMode)}`,
        `families=${fmtBoolean(snapshot.useRenderFamilies)}`,
        `geom=${fmtString(snapshot.geometrySource)}`,
        `frontier=${fmtNumber(snapshot.frontierResolution)}`,
        `starW=${fmtNumber(snapshot.starWeight)}`,
        `msr=${fmtNumber(snapshot.msrPx)}`,
        `cx=${fmtBoolean(snapshot.cxEnabled)}/${fmtNumber(snapshot.cxSpacingPx)}/${fmtNumber(snapshot.cxPointCount)}@${fmtNumber(snapshot.cxWeight)}`,
        `lp=${fmtBoolean(snapshot.lpMidpointPairEnabled)}/${fmtNumber(snapshot.lpPairCount)}@${fmtNumber(snapshot.lpPairWeight)}:${fmtNumber(snapshot.lpPairSpacingPx)}`,
        `dx=${fmtBoolean(snapshot.dxEnabled)}/${fmtNumber(snapshot.dxMaxDistancePx)}@${fmtNumber(snapshot.dxWeight)}`,
        `cluster=${fmtBoolean(snapshot.clusterSplit)}`,
        `chaikin=${fmtNumber(snapshot.chaikinPasses)}`,
        `clip=${fmtNumber(snapshot.boundaryPad)}/${fmtNumber(snapshot.boundaryEps)}`,
    ].join(' ');
}
