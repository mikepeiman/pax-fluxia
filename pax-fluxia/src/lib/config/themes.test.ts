import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from './game.config';
import {
    applyTheme,
    extractTheme,
    filterThemeValues,
    type GameTheme,
} from './themes';

describe('themes', () => {
    it('filters internal runtime keys from theme payloads', () => {
        expect(
            filterThemeValues({
                SHIP_BASE_SIZE: 3,
                BG_IMAGE_URL: '',
                _MAP_WIDTH: 1760,
                __TERRITORY_VISUAL_EPOCH: 2,
                nested: { nope: true },
            }),
        ).toEqual({
            SHIP_BASE_SIZE: 3,
            BG_IMAGE_URL: '',
        });
    });

    it('omits and ignores internal runtime keys during snapshot and apply', () => {
        const runtimeConfig = GAME_CONFIG as unknown as Record<string, unknown>;
        const previousShipBaseSize = GAME_CONFIG.SHIP_BASE_SIZE;
        const previousMapWidth = GAME_CONFIG._MAP_WIDTH;
        const previousEpoch = runtimeConfig.__TERRITORY_VISUAL_EPOCH;

        try {
            GAME_CONFIG.SHIP_BASE_SIZE = 2.6;
            GAME_CONFIG._MAP_WIDTH = 1760;
            runtimeConfig.__TERRITORY_VISUAL_EPOCH = 9;

            const exported = extractTheme('Test', '');
            expect(exported.values).not.toHaveProperty('_MAP_WIDTH');
            expect(exported.values).not.toHaveProperty(
                '__TERRITORY_VISUAL_EPOCH',
            );

            const imported: GameTheme = {
                name: 'Imported',
                description: '',
                created: '2026-04-16T00:00:00.000Z',
                values: {
                    SHIP_BASE_SIZE: 4.4,
                    _MAP_WIDTH: 12,
                    __TERRITORY_VISUAL_EPOCH: 1,
                },
            };

            applyTheme(imported);

            expect(GAME_CONFIG.SHIP_BASE_SIZE).toBe(4.4);
            expect(GAME_CONFIG._MAP_WIDTH).toBe(1760);
            expect(runtimeConfig.__TERRITORY_VISUAL_EPOCH).toBe(9);
        } finally {
            GAME_CONFIG.SHIP_BASE_SIZE = previousShipBaseSize;
            GAME_CONFIG._MAP_WIDTH = previousMapWidth;
            runtimeConfig.__TERRITORY_VISUAL_EPOCH = previousEpoch;
        }
    });
});
