import { describe, expect, it } from 'vitest';
import {
    buildThemeDisplayName,
    ensureUniqueThemeDisplayName,
    resolveThemeBaseName,
} from './themeNames';

describe('themeNames', () => {
    it('cleans semantic slugs and appends the saved date', () => {
        expect(
            buildThemeDisplayName({
                providedName: 'apr_15_metaball',
                createdAt: '2026-04-16T16:40:14.000Z',
            }),
        ).toBe('Apr 15 Metaball (2026-04-16)');
    });

    it('uses the source filename when the provided name is generic', () => {
        expect(
            buildThemeDisplayName({
                providedName: 'Custom',
                sourceName:
                    'pax-theme-Custom-2026-02-19T22-47-29 keeper, Arrow conquest.json',
                createdAt: '2026-02-19T22:47:29.292Z',
            }),
        ).toBe('Arrow Conquest (2026-02-19)');
    });

    it('expands compact date slugs into readable semantic names', () => {
        expect(
            resolveThemeBaseName({
                providedName: '0227_tweaked',
                createdAt: '2026-02-28T00:25:33.579Z',
            }),
        ).toBe('Feb 27 Tweaked');

        expect(
            resolveThemeBaseName({
                providedName: '2026-03-07-default',
                createdAt: '2026-03-08T01:11:32.600Z',
            }),
        ).toBe('Mar 07 Default');
    });

    it('generates a semantic fallback from render mode when no useful name exists', () => {
        expect(
            buildThemeDisplayName({
                providedName: 'Custom',
                createdAt: '2026-02-17T01:10:51.661Z',
                values: {
                    TERRITORY_GRAPH: true,
                },
            }),
        ).toBe('Graph Theme (2026-02-17)');
    });

    it('adds time when the same semantic name already exists', () => {
        expect(
            ensureUniqueThemeDisplayName(
                'Arrow Conquest (2026-02-19)',
                new Set(['Arrow Conquest (2026-02-19)']),
                {
                    createdAt: '2026-02-19T22:47:29.292Z',
                    providedName: 'Arrow Conquest',
                },
            ),
        ).toBe('Arrow Conquest (2026-02-19 22:47)');
    });
});
