import { describe, expect, it } from 'vitest';
import { ANIM_SLIDERS, PANEL_CONFIG_MAP, CONFIG_TO_PANEL_KEY, derivePanelKey } from './settingsDefs';

describe('settingsDefs', () => {
    it('every ANIM_SLIDER configKey has a panel mapping in CONFIG_TO_PANEL_KEY', () => {
        const unmapped = ANIM_SLIDERS.filter(s => !CONFIG_TO_PANEL_KEY[s.key]);
        expect(unmapped.map(s => s.key)).toEqual([]);
    });

    it('PANEL_CONFIG_MAP has no duplicate configKeys', () => {
        const keys = PANEL_CONFIG_MAP.map(m => m.configKey);
        const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
        expect(dupes).toEqual([]);
    });

    it('derivePanelKey converts SCREAMING_SNAKE_CASE to camelCase', () => {
        expect(derivePanelKey('TERRITORY_TRANSITION_MS')).toBe('territoryTransitionMs');
        expect(derivePanelKey('ATTACK_SURGE_RAMP_MS')).toBe('attackSurgeRampMs');
        expect(derivePanelKey('BASE_TICK_MS')).toBe('baseTickMs');
        expect(derivePanelKey('DF_ALPHA')).toBe('dfAlpha');
        expect(derivePanelKey('SHOW_HEX_GRID')).toBe('showHexGrid');
    });

    it('entries without explicit panelKey auto-derive correctly', () => {
        const noExplicit = PANEL_CONFIG_MAP.filter(m => m.panelKey === undefined);
        for (const m of noExplicit) {
            const derived = derivePanelKey(m.configKey);
            expect(CONFIG_TO_PANEL_KEY[m.configKey]).toBe(derived);
        }
    });
});
