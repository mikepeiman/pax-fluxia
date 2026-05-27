import { normalizePerimeterFieldGeometrySource } from '../territory/geometry/geometrySource';

export interface Geometry0319DebugSnapshot {
    territoryRenderMode: string | null;
    geometrySource: string | null;
    frontierResolution: number | null;
    starMargin: number | null;
    msrStarBias: number | null;
    corridorEnabled: boolean | null;
    corridorSpacing: number | null;
    cxCount: number | null;
    cxWeight: number | null;
    cxContestMidpointVstars: boolean | null;
    cxContestPairCount: number | null;
    cxContestPairWeight: number | null;
    cxContestPairSpacing: number | null;
    disconnectEnabled: boolean | null;
    disconnectDistance: number | null;
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

export function snapshotGeometry0319DebugConfig(
    source: Record<string, unknown>,
): Geometry0319DebugSnapshot {
    return {
        territoryRenderMode: asString(source.TERRITORY_RENDER_MODE),
        geometrySource: normalizePerimeterFieldGeometrySource(
            source.PERIMETER_FIELD_GEOMETRY_SOURCE,
        ),
        frontierResolution: asNumber(source.FRONTIER_RESOLUTION),
        starMargin: asNumber(source.MODIFIED_VORONOI_STAR_MARGIN),
        msrStarBias: asNumber(source.TERRITORY_MSR_STAR_BIAS),
        corridorEnabled: asBoolean(source.MODIFIED_VORONOI_CORRIDOR_ENABLED),
        corridorSpacing: asNumber(source.MODIFIED_VORONOI_CORRIDOR_SPACING),
        cxCount: asNumber(source.TERRITORY_CX_COUNT),
        cxWeight: asNumber(source.TERRITORY_CX_WEIGHT),
        cxContestMidpointVstars: asBoolean(source.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS),
        cxContestPairCount: asNumber(source.TERRITORY_CX_CONTEST_PAIR_COUNT),
        cxContestPairWeight: asNumber(source.TERRITORY_CX_CONTEST_PAIR_WEIGHT),
        cxContestPairSpacing: asNumber(source.TERRITORY_CX_CONTEST_PAIR_SPACING),
        disconnectEnabled: asBoolean(source.MODIFIED_VORONOI_DISCONNECT_ENABLED),
        disconnectDistance: asNumber(source.MODIFIED_VORONOI_DISCONNECT_DISTANCE),
        dxWeight: asNumber(source.TERRITORY_DX_WEIGHT),
        clusterSplit: asBoolean(source.TERRITORY_CLUSTER_SPLIT),
        chaikinPasses: asNumber(source.VORONOI_BORDER_SMOOTH),
        boundaryPad: asNumber(source.CHAIKIN_BOUNDARY_PAD),
        boundaryEps: asNumber(source.CHAIKIN_BOUNDARY_EPS),
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
        `geom=${fmtString(snapshot.geometrySource)}`,
        `frontier=${fmtNumber(snapshot.frontierResolution)}`,
        `msr=${fmtNumber(snapshot.starMargin)}`,
        `msrBias=${fmtNumber(snapshot.msrStarBias)}`,
        `corridor=${fmtBoolean(snapshot.corridorEnabled)}/${fmtNumber(snapshot.corridorSpacing)}`,
        `cx=${fmtNumber(snapshot.cxCount)}@${fmtNumber(snapshot.cxWeight)}`,
        `cxMid=${fmtBoolean(snapshot.cxContestMidpointVstars)}`,
        `cxPair=${fmtNumber(snapshot.cxContestPairCount)}@${fmtNumber(snapshot.cxContestPairWeight)}:${fmtNumber(snapshot.cxContestPairSpacing)}`,
        `dx=${fmtBoolean(snapshot.disconnectEnabled)}/${fmtNumber(snapshot.disconnectDistance)}@${fmtNumber(snapshot.dxWeight)}`,
        `cluster=${fmtBoolean(snapshot.clusterSplit)}`,
        `chaikin=${fmtNumber(snapshot.chaikinPasses)}`,
        `clip=${fmtNumber(snapshot.boundaryPad)}/${fmtNumber(snapshot.boundaryEps)}`,
    ].join(' ');
}
