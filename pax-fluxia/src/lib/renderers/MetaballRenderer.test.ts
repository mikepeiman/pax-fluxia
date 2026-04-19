import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState } from '$lib/types/game.types';
import { buildMetaballCacheFingerprint } from './MetaballRenderer';

const TEST_STARS: StarState[] = [
    {
        id: 'alpha',
        x: 100,
        y: 120,
        ownerId: 'p1',
        activeShips: 40,
        damagedShips: 0,
    } as StarState,
    {
        id: 'beta',
        x: 240,
        y: 180,
        ownerId: 'p2',
        activeShips: 35,
        damagedShips: 2,
    } as StarState,
];

describe('buildMetaballCacheFingerprint', () => {
    it('changes when scene influence radius changes', () => {
        const base = buildMetaballCacheFingerprint({
            stars: TEST_STARS,
            gameTick: 10,
            sceneFingerprint: 'scene-a',
            sceneInfluenceRadiusPx: 52,
        });
        const next = buildMetaballCacheFingerprint({
            stars: TEST_STARS,
            gameTick: 10,
            sceneFingerprint: 'scene-a',
            sceneInfluenceRadiusPx: 180,
        });

        expect(next).not.toBe(base);
    });

    it('changes when scene ownership margin changes', () => {
        const base = buildMetaballCacheFingerprint({
            stars: TEST_STARS,
            gameTick: 10,
            sceneFingerprint: 'scene-a',
            sceneOwnershipMarginPx: 0,
        });
        const next = buildMetaballCacheFingerprint({
            stars: TEST_STARS,
            gameTick: 10,
            sceneFingerprint: 'scene-a',
            sceneOwnershipMarginPx: 24,
        });

        expect(next).not.toBe(base);
    });

    it('changes when contested midpoint-pair settings change', () => {
        const originalCount = GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT;
        const originalWeight = GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT;

        try {
            GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT = 1;
            GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT = 0.25;
            const base = buildMetaballCacheFingerprint({
                stars: TEST_STARS,
                gameTick: 10,
                sceneFingerprint: 'scene-a',
            });

            GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT = 3;
            GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT = 0.8;
            const next = buildMetaballCacheFingerprint({
                stars: TEST_STARS,
                gameTick: 10,
                sceneFingerprint: 'scene-a',
            });

            expect(next).not.toBe(base);
        } finally {
            GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT = originalCount;
            GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT = originalWeight;
        }
    });
});
