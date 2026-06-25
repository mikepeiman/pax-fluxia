import { describe, expect, it } from 'vitest';
import {
    formatGeometry0319DebugConfig,
    snapshotGeometry0319DebugConfig,
} from './geometry0319Debug';

describe('geometry0319Debug', () => {
    it('captures the runtime geometry tuple from config-like input', () => {
        expect(
            snapshotGeometry0319DebugConfig({
                TERRITORY_RENDER_MODE: 'cell_grid',
                PERIMETER_FIELD_GEOMETRY_SOURCE: 'power_voronoi_0319',
                FRONTIER_RESOLUTION: 5,
                MODIFIED_VORONOI_STAR_MARGIN: 65,
                TERRITORY_MSR_STAR_BIAS: 0.75,
                MODIFIED_VORONOI_CORRIDOR_ENABLED: true,
                MODIFIED_VORONOI_CORRIDOR_SPACING: 20,
                TERRITORY_CX_COUNT: 0,
                TERRITORY_CX_WEIGHT: 0.5,
                TERRITORY_CX_CONTEST_MIDPOINT_VSTARS: false,
                TERRITORY_CX_CONTEST_PAIR_COUNT: 1,
                TERRITORY_CX_CONTEST_PAIR_WEIGHT: 0.5,
                TERRITORY_CX_CONTEST_PAIR_SPACING: 72,
                MODIFIED_VORONOI_DISCONNECT_ENABLED: false,
                MODIFIED_VORONOI_DISCONNECT_DISTANCE: 90,
                TERRITORY_DX_WEIGHT: 0.3,
                TERRITORY_CLUSTER_SPLIT: true,
                VORONOI_BORDER_SMOOTH: 2,
                CHAIKIN_BOUNDARY_PAD: 50,
                CHAIKIN_BOUNDARY_EPS: 6,
            }),
        ).toEqual({
            territoryRenderMode: 'cell_grid',
            geometrySource: 'power_voronoi_0319',
            frontierResolution: 5,
            starMargin: 65,
            msrStarBias: 0.75,
            corridorEnabled: true,
            corridorSpacing: 20,
            cxCount: 0,
            cxWeight: 0.5,
            cxContestMidpointVstars: false,
            cxContestPairCount: 1,
            cxContestPairWeight: 0.5,
            cxContestPairSpacing: 72,
            disconnectEnabled: false,
            disconnectDistance: 90,
            dxWeight: 0.3,
            clusterSplit: true,
            chaikinPasses: 2,
            boundaryPad: 50,
            boundaryEps: 6,
        });
    });

    it('formats a compact log summary', () => {
        const summary = formatGeometry0319DebugConfig({
            territoryRenderMode: 'perimeter_field',
            geometrySource: 'power_voronoi_0319',
            frontierResolution: 5,
            starMargin: 65,
            msrStarBias: 0.75,
            corridorEnabled: true,
            corridorSpacing: 20,
            cxCount: 0,
            cxWeight: 0.5,
            cxContestMidpointVstars: false,
            cxContestPairCount: 1,
            cxContestPairWeight: 0.5,
            cxContestPairSpacing: 72,
            disconnectEnabled: false,
            disconnectDistance: 90,
            dxWeight: 0.3,
            clusterSplit: true,
            chaikinPasses: 2,
            boundaryPad: 50,
            boundaryEps: 6,
        });

        expect(summary).toContain('mode=perimeter_field');
        expect(summary).toContain('frontier=5');
        expect(summary).toContain('msr=65');
        expect(summary).toContain('msrBias=0.75');
        expect(summary).toContain('cx=0@0.50');
        expect(summary).toContain('cxPair=1@0.50:72');
        expect(summary).toContain('dx=0/90@0.30');
    });
});
