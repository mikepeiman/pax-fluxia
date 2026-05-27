import { describe, expect, it } from 'vitest';
import type { StarConnection, StarState } from '$lib/types/game.types';
import {
    buildPerimeterFieldRenderFamilyGeometry,
    buildPowerVoronoi0319Settings,
} from './buildFamilyGeometry';

function testStar(
    id: string,
    x: number,
    y: number,
    ownerId: string,
): StarState {
    return {
        id,
        x,
        y,
        radius: 28,
        ownerId,
        starType: 'yellow',
        activeShips: 50,
        damagedShips: 0,
        productionOverflow: 0,
        repairOverflow: 0,
        lastCombatTick: -1,
        lastAttackTick: -1,
        targetId: null,
        queuedOrderTargetId: null,
        productionRate: 1,
        repairRate: 1,
        transferRate: 1,
        activationRate: 1,
        defensivePosture: 0,
        defenseStrength: 1,
    };
}

describe('buildPowerVoronoi0319Settings', () => {
    it('respects mode-scoped DX overrides from the supplied config source', () => {
        const settings = buildPowerVoronoi0319Settings({
            lanes: [{ sourceId: 'a', targetId: 'b', distance: 120 }],
            worldWidth: 640,
            worldHeight: 360,
            configSource: {
                MODIFIED_VORONOI_DISCONNECT_ENABLED: true,
                MODIFIED_VORONOI_DISCONNECT_DISTANCE: 295,
                TERRITORY_DX_WEIGHT: 0.3,
            },
        });

        expect(settings.disconnectEnabled).toBe(true);
        expect(settings.disconnectDistance).toBe(295);
        expect(settings.dxWeight).toBe(0.3);
    });

    it('respects CX, lane-pair, DX, and MSR tuning from one config source', () => {
        const settings = buildPowerVoronoi0319Settings({
            lanes: [{ sourceId: 'a', targetId: 'b', distance: 120 }],
            worldWidth: 640,
            worldHeight: 360,
            configSource: {
                MODIFIED_VORONOI_STAR_MARGIN: 82,
                TERRITORY_MSR_STAR_BIAS: 1.4,
                MODIFIED_VORONOI_CORRIDOR_ENABLED: true,
                MODIFIED_VORONOI_CORRIDOR_SPACING: 12,
                TERRITORY_CX_COUNT: 4,
                TERRITORY_CX_WEIGHT: 0.75,
                TERRITORY_CX_CONTEST_MIDPOINT_VSTARS: true,
                TERRITORY_CX_CONTEST_PAIR_COUNT: 2,
                TERRITORY_CX_CONTEST_PAIR_SPACING: 64,
                TERRITORY_CX_CONTEST_PAIR_WEIGHT: 1.8,
                MODIFIED_VORONOI_DISCONNECT_ENABLED: true,
                MODIFIED_VORONOI_DISCONNECT_DISTANCE: 310,
                TERRITORY_DX_WEIGHT: 2.2,
            },
        });

        expect(settings.starMargin).toBe(82);
        expect(settings.msrStarBias).toBe(1.4);
        expect(settings.corridorEnabled).toBe(true);
        expect(settings.corridorSpacing).toBe(12);
        expect(settings.cxCount).toBe(4);
        expect(settings.cxWeight).toBe(0.75);
        expect(settings.cxContestMidpointVstars).toBe(true);
        expect(settings.cxContestPairCount).toBe(2);
        expect(settings.cxContestPairSpacing).toBe(64);
        expect(settings.cxContestPairWeight).toBe(1.8);
        expect(settings.disconnectEnabled).toBe(true);
        expect(settings.disconnectDistance).toBe(310);
        expect(settings.dxWeight).toBe(2.2);
    });
});

describe('buildPerimeterFieldRenderFamilyGeometry', () => {
    it('normalizes the legacy resolved-vector source to the 0319 authority path', () => {
        const stars = [
            testStar('a', 180, 180, 'p1'),
            testStar('b', 460, 180, 'p2'),
            testStar('c', 320, 320, 'p1'),
        ];
        const lanes: StarConnection[] = [
            { sourceId: 'a', targetId: 'b', distance: 280 },
            { sourceId: 'a', targetId: 'c', distance: 210 },
            { sourceId: 'b', targetId: 'c', distance: 210 },
        ];
        const configSource = {
            PERIMETER_FIELD_GEOMETRY_SOURCE: 'resolved_vector',
            MODIFIED_VORONOI_STAR_MARGIN: 75,
            MODIFIED_VORONOI_CORRIDOR_ENABLED: true,
            MODIFIED_VORONOI_CORRIDOR_SPACING: 10,
            TERRITORY_CX_COUNT: 3,
            TERRITORY_CX_WEIGHT: 1,
            TERRITORY_CX_CONTEST_MIDPOINT_VSTARS: true,
            TERRITORY_CX_CONTEST_PAIR_COUNT: 1,
            TERRITORY_CX_CONTEST_PAIR_SPACING: 75,
            TERRITORY_CX_CONTEST_PAIR_WEIGHT: 1,
            MODIFIED_VORONOI_DISCONNECT_ENABLED: true,
            MODIFIED_VORONOI_DISCONNECT_DISTANCE: 295,
            TERRITORY_DX_WEIGHT: 3,
            VORONOI_BORDER_SMOOTH: 2,
            TERRITORY_STYLE_MODE: 'vector',
        };

        const authority = buildPerimeterFieldRenderFamilyGeometry({
            stars,
            lanes,
            worldWidth: 640,
            worldHeight: 360,
            nowMs: 1000,
            geometrySource: 'power_voronoi_0319',
            configSource,
        });
        const legacyAlias = buildPerimeterFieldRenderFamilyGeometry({
            stars,
            lanes,
            worldWidth: 640,
            worldHeight: 360,
            nowMs: 1000,
            geometrySource: 'resolved_vector',
            configSource,
        });

        expect(legacyAlias.version).toBe(authority.version);
        expect(legacyAlias.territoryRegions).toHaveLength(
            authority.territoryRegions.length,
        );
        expect(legacyAlias.frontierPolylines).toHaveLength(
            authority.frontierPolylines.length,
        );
        expect(legacyAlias.diagnostics.stageLadder).toEqual(
            authority.diagnostics.stageLadder,
        );
        expect(legacyAlias.diagnostics.stageLadder).toBeTruthy();
    });
});
