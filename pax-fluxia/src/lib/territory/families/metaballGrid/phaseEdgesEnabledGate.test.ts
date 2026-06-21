/**
 * Regression guard for the Phase Edges / Ember COMPLETE-ABSENCE blank.
 *
 * Root cause (probe: geomRegions>0 but planPresent=false): the dedicated
 * MetaballGridPhaseEdgesFamily early-returned blank (cachedPlan never built) when the
 * legacy `METABALL_GRID_ENABLED` master gate was off, because the gate default only
 * enabled the old shared 'metaball_grid' mode — never the dedicated phase modes
 * (regression from f4bc81a93). Prior family tests masked this by forcing
 * METABALL_GRID_ENABLED:true in their config.
 *
 * Fix: the family renders when ITS OWN mode is the active render mode, regardless of
 * the legacy toggle.
 */
import { describe, expect, it } from 'vitest';
import type { StarConnection, StarState } from '$lib/types/game.types';
import { GAME_CONFIG } from '$lib/config/game.config';
import { territoryFrontierConfigDefaults } from '$lib/territory/frontier/config';
import { buildPerimeterFieldRenderFamilyGeometry } from '../buildFamilyGeometry';
import { buildRenderFamilyInput } from '../buildRenderFamilyInput';
import {
    createMetaballGridPhaseEdgesFamily,
    createMetaballGridEmberLatticeFamily,
} from './MetaballGridPhaseEdgesFamily';
import {
    metaballGridPhaseEdgesGeometryDefaults,
    metaballGridPhaseEdgesModeDefaults,
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

const STARS = [
    testStar('a', 180, 180, 'p1'),
    testStar('b', 460, 180, 'p2'),
    testStar('c', 320, 320, 'p1'),
];
const LANES: StarConnection[] = [
    { sourceId: 'a', targetId: 'b', distance: 280 },
    { sourceId: 'a', targetId: 'c', distance: 210 },
    { sourceId: 'b', targetId: 'c', distance: 210 },
];

function makeInput(family: { tunableKeys: ReadonlyArray<string> }) {
    const geometry = buildPerimeterFieldRenderFamilyGeometry({
        stars: STARS, lanes: LANES, worldWidth: 640, worldHeight: 360, nowMs: 1000,
        geometrySource: 'power_voronoi_0319', configSource: { TERRITORY_STYLE_MODE: 'vector' },
    } as never);
    // Deliberately does NOT force METABALL_GRID_ENABLED:true — reproduces the live config.
    const configSource: Record<string, unknown> = {
        ...(GAME_CONFIG as unknown as Record<string, unknown>),
        METABALL_GRID_SPACING_PX: 24,
        ...territoryFrontierConfigDefaults,
        ...metaballGridPhaseEdgesGeometryDefaults,
        ...metaballGridPhaseEdgesModeDefaults,
    };
    return buildRenderFamilyInput({
        stars: [...STARS], lanes: [...LANES], worldWidth: 640, worldHeight: 360,
        nowMs: 2500, gameTick: 2, ownership: null, geometry, prevGeometry: geometry,
        activeTransition: null, tunableKeys: family.tunableKeys, configSource,
    } as never);
}

describe('MetaballGridPhaseEdgesFamily legacy enabled gate', () => {
    it('renders when its own mode is active even though METABALL_GRID_ENABLED is OFF', () => {
        const savedEnabled = GAME_CONFIG.METABALL_GRID_ENABLED;
        const savedMode = GAME_CONFIG.TERRITORY_RENDER_MODE;
        try {
            (GAME_CONFIG as unknown as Record<string, unknown>).METABALL_GRID_ENABLED = false; // live broken state
            for (const create of [createMetaballGridPhaseEdgesFamily, createMetaballGridEmberLatticeFamily]) {
                const family = create({
                    getPlayerColor: (o: string) => (o === 'p1' ? 0x3366ff : 0xff6633),
                } as never);
                (GAME_CONFIG as unknown as Record<string, unknown>).TERRITORY_RENDER_MODE = (family as { id: string }).id;
                family.update(makeInput(family) as never);
                const f = family as unknown as Record<string, any>;
                expect(f.root.visible).toBe(true); // NOT the early-return blank
                expect(f.cachedPlan?.classification?.emittableVstars?.length ?? 0).toBeGreaterThan(0);
                family.dispose();
            }
        } finally {
            (GAME_CONFIG as unknown as Record<string, unknown>).METABALL_GRID_ENABLED = savedEnabled;
            (GAME_CONFIG as unknown as Record<string, unknown>).TERRITORY_RENDER_MODE = savedMode;
        }
    });

    it('still no-ops when METABALL_GRID_ENABLED is OFF and its mode is NOT active', () => {
        const savedEnabled = GAME_CONFIG.METABALL_GRID_ENABLED;
        const savedMode = GAME_CONFIG.TERRITORY_RENDER_MODE;
        try {
            (GAME_CONFIG as unknown as Record<string, unknown>).METABALL_GRID_ENABLED = false;
            (GAME_CONFIG as unknown as Record<string, unknown>).TERRITORY_RENDER_MODE = 'voronoi'; // different mode
            const family = createMetaballGridPhaseEdgesFamily({
                getPlayerColor: () => 0x3366ff,
            } as never);
            family.update(makeInput(family) as never);
            const f = family as unknown as Record<string, any>;
            expect(f.root.visible).toBe(false); // gate preserved when this family is inactive
            family.dispose();
        } finally {
            (GAME_CONFIG as unknown as Record<string, unknown>).METABALL_GRID_ENABLED = savedEnabled;
            (GAME_CONFIG as unknown as Record<string, unknown>).TERRITORY_RENDER_MODE = savedMode;
        }
    });
});
