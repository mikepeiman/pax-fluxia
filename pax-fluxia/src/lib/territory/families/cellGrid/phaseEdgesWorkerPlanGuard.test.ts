/**
 * Guards the worker-plan commit: an EMPTY async worker plan must never replace a
 * NON-empty cached plan. This is the robust safety net for the Phase Edges/Ember
 * complete-absence blank (node tests render because there is no Worker; the live
 * Worker can return a 0-cell plan that would otherwise blank the family).
 */
import { describe, expect, it } from 'vitest';
import type { StarConnection, StarState } from '$lib/types/game.types';
import { GAME_CONFIG } from '$lib/config/game.config';
import { territoryFrontierConfigDefaults } from '$lib/territory/frontier/config';
import { buildPerimeterFieldRenderFamilyGeometry } from '../buildFamilyGeometry';
import { buildRenderFamilyInput } from '../buildRenderFamilyInput';
import { createCellGridPhaseEdgesFamily } from './CellGridPhaseEdgesFamily';
import {
    cellGridPhaseEdgesGeometryDefaults,
    cellGridPhaseEdgesModeDefaults,
} from './config';

function testStar(id: string, x: number, y: number, ownerId: string): StarState {
    return {
        id, x, y, radius: 28, ownerId, starType: 'yellow',
        activeShips: 50, damagedShips: 0, productionOverflow: 0, repairOverflow: 0,
        lastCombatTick: -1, lastAttackTick: -1, targetId: null, queuedOrderTargetId: null,
        productionRate: 1, repairRate: 1, transferRate: 1, activationRate: 1,
        defensivePosture: 0, defenseStrength: 1,
    } as StarState;
}

function emptyClassification() {
    return {
        cols: 0, rows: 0, spacingPx: 24, requestedSpacingPx: 24,
        originMode: 'centered', distribution: 'square',
        vstars: [], emittableVstars: [],
        byRole: { native: [], dispossessed: [], emergent: [], vacating: [], outside: [] },
        dispossessedByEventId: {}, defaultEventId: '__default__',
    };
}

describe('CellGridPhaseEdgesFamily worker-plan guard', () => {
    it('does not replace a non-empty cached plan with an empty worker plan', () => {
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
        const geometry = buildPerimeterFieldRenderFamilyGeometry({
            stars, lanes, worldWidth: 640, worldHeight: 360, nowMs: 1000,
            geometrySource: 'power_voronoi_0319',
            configSource: { TERRITORY_STYLE_MODE: 'vector' },
        } as never);

        const family = createCellGridPhaseEdgesFamily({
            getPlayerColor: (o: string) => (o === 'p1' ? 0x3366ff : 0xff6633),
        } as never);

        const configSource: Record<string, unknown> = {
            ...(GAME_CONFIG as unknown as Record<string, unknown>),
            CELL_GRID_SPACING_PX: 24,
            ...territoryFrontierConfigDefaults,
            ...cellGridPhaseEdgesGeometryDefaults,
            ...cellGridPhaseEdgesModeDefaults,
        };

        const input = buildRenderFamilyInput({
            stars: [...stars], lanes: [...lanes],
            worldWidth: 640, worldHeight: 360, nowMs: 2500, gameTick: 2,
            ownership: null, geometry, prevGeometry: geometry, activeTransition: null,
            tunableKeys: family.tunableKeys, configSource,
        } as never);

        family.update(input as never);

        const f = family as unknown as Record<string, any>;
        const before = f.cachedPlan?.classification?.emittableVstars?.length ?? 0;
        expect(before).toBeGreaterThan(0); // sync plan produced cells

        // Inject an EMPTY worker response keyed to the current plan + session.
        const planKey = f.cachedPlan.planKey;
        f.latestPlanWorkerResponse = {
            requestId: 999, planKey,
            classification: emptyClassification(),
            wavePlan: null,
            classificationBuildMs: 0, wavePlanBuildMs: 0, planBuildMs: 0,
        };
        f.latestPlanWorkerMeta = {
            requestId: 999, sessionKey: f.sessionKey, planKey,
            prevGeometry: geometry, nextGeometryRef: geometry,
        };

        const committed = f.commitPendingWorkerPlan();

        expect(committed).toBe(false); // guard rejected the empty worker plan
        expect(f.cachedPlan?.classification?.emittableVstars?.length ?? 0).toBe(before);

        family.dispose();
    });
});
