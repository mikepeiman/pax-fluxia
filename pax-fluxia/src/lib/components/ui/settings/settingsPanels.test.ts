/**
 * settingsPanels.test — every utility panel must be FINDABLE.
 *
 * The theme picker, typography drawer and the rest were declared only inside
 * `GameSettingsPanel.svelte`, so the search index (built from SETTINGS_SECTIONS)
 * never saw them. Searching "theme" or "appearance" returned zero results and
 * the HUD skin picker could only be reached by knowing which category chip to
 * click — a feature that exists but cannot be found.
 *
 * These tests hold the line: a panel that is not reachable by typing its own
 * name is a defect, not a preference.
 */
import { describe, expect, it } from 'vitest';
import { SETTINGS_PANELS, isSettingsPanelId, settingsPanelsForCategory } from './settingsPanels';
import { SETTINGS_CATEGORIES } from './settingsTaxonomy';
import { SETTINGS_SECTIONS } from './settingsRegistry';
import { searchSettings } from './settingsSearch';

describe('settings utility panels', () => {
    it('every panel is reachable by searching its own label', () => {
        const unreachable: string[] = [];
        for (const panel of SETTINGS_PANELS) {
            const hits = searchSettings(panel.label, 24);
            if (!hits.some((hit) => hit.kind === 'panel' && hit.sectionId === panel.id)) {
                unreachable.push(`${panel.id} ("${panel.label}")`);
            }
        }
        expect(unreachable, `panels not findable by name:\n${unreachable.join('\n')}`).toEqual([]);
    });

    it('every keyword a player would type reaches its panel', () => {
        const misses: string[] = [];
        for (const panel of SETTINGS_PANELS) {
            for (const keyword of panel.keywords) {
                const hits = searchSettings(keyword, 24);
                if (!hits.some((hit) => hit.kind === 'panel' && hit.sectionId === panel.id)) {
                    misses.push(`${panel.id} <- "${keyword}"`);
                }
            }
        }
        expect(misses, `keywords that do not reach their panel:\n${misses.join('\n')}`).toEqual([]);
    });

    it('"theme" surfaces the theme panels above every config setting', () => {
        // The defect that started this: the entry point to every HUD theme
        // matched nothing at all. The bar is not "Appearance is #1" — "Themes"
        // is an exact title match and deserves the top slot — it is that both
        // theme panels beat any config row that merely mentions the word.
        const hits = searchSettings('theme', 24);
        expect(hits.length).toBeGreaterThan(0);

        const themeSystemRank = hits.findIndex(
            (hit) => hit.kind === 'panel' && hit.sectionId === 'ui_theme_system',
        );
        expect(themeSystemRank, 'Theme System not in results for "theme"').toBeGreaterThanOrEqual(0);

        const firstNonPanel = hits.findIndex((hit) => hit.kind !== 'panel');
        if (firstNonPanel >= 0) {
            expect(
                themeSystemRank,
                `a ${hits[firstNonPanel]!.kind} result outranked the Theme System panel for "theme"`,
            ).toBeLessThan(firstNonPanel);
        }
    });

    it('a partial query still reaches the panel', () => {
        // Users type fragments. "appea" must work, not just the whole word —
        // and it must keep working now the panel is called "Theme System": the
        // word people used to navigate by lives on in its keywords.
        const hits = searchSettings('appea', 24);
        expect(
            hits.some((hit) => hit.kind === 'panel' && hit.sectionId === 'ui_theme_system'),
            'partial query "appea" did not reach Theme System',
        ).toBe(true);
    });

    it('every panel belongs to a real category', () => {
        const categoryIds = new Set(SETTINGS_CATEGORIES.map((category) => category.id));
        const orphans = SETTINGS_PANELS.filter((panel) => !categoryIds.has(panel.category));
        expect(orphans.map((panel) => panel.id)).toEqual([]);
    });

    it('every category has chips — sections or panels — so none vanishes from the rail', () => {
        // A category shows SETTINGS_SECTIONS or bespoke panels; `chipsForCategory`
        // concatenates both. With neither it renders nothing and silently
        // disappears from the rail, which is how a new category gets lost.
        // Asserted over ALL categories rather than the two that happened to be
        // panel-backed when this was written.
        const empty = SETTINGS_CATEGORIES.filter(
            (category) =>
                category.sections.length === 0 &&
                settingsPanelsForCategory(category.id).length === 0,
        );
        expect(
            empty.map((category) => category.id),
            'categories with no sections and no panels would not appear in the rail',
        ).toEqual([]);
    });

    it('keeps the theme surfaces where a player would look for them', () => {
        const themePanels = settingsPanelsForCategory('themes').map((panel) => panel.id);
        expect(themePanels, 'Themes is a top-level category and must own the theme library')
            .toContain('ui_themes');
    });

    it('panel ids never collide with section ids', () => {
        // `activeSectionId` holds either kind; a collision would route to the
        // wrong surface.
        const sectionIds = new Set<string>(SETTINGS_SECTIONS.map((section) => section.id));
        const collisions = SETTINGS_PANELS.filter((panel) => sectionIds.has(panel.id));
        expect(collisions.map((panel) => panel.id)).toEqual([]);
    });

    it('isSettingsPanelId accepts every panel and rejects sections', () => {
        for (const panel of SETTINGS_PANELS) expect(isSettingsPanelId(panel.id)).toBe(true);
        for (const section of SETTINGS_SECTIONS) expect(isSettingsPanelId(section.id)).toBe(false);
        expect(isSettingsPanelId(null)).toBe(false);
        expect(isSettingsPanelId('nope')).toBe(false);
    });
});
