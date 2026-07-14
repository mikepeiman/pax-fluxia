import { describe, expect, it } from 'vitest';
import {
    auditThemeRouting,
    groupThemesByRenderFamily,
    normalizeThemeValues,
    resolveThemeRenderMode,
} from './themeRouting';

describe('themeRouting', () => {
    it('returns null when no territory routing keys are present', () => {
        expect(resolveThemeRenderMode({ SHIP_BASE_SIZE: 3 })).toBeNull();
    });

    it('mirrors the runtime compatibility inference order', () => {
        expect(
            resolveThemeRenderMode({
                TERRITORY_GRAPH: true,
                TERRITORY_METABALL: true,
            }),
        ).toBe('metaball');
    });

    it('normalizes older boolean themes to an explicit TERRITORY_RENDER_MODE', () => {
        expect(
            normalizeThemeValues({
                TERRITORY_GRAPH: true,
                GRAPH_ALPHA: 0.5,
            }),
        ).toMatchObject({
            TERRITORY_GRAPH: true,
            TERRITORY_RENDER_MODE: 'graph',
        });
    });

    it('preserves an explicit TERRITORY_RENDER_MODE when present', () => {
        expect(
            normalizeThemeValues({
                TERRITORY_RENDER_MODE: 'perimeter_field',
                TERRITORY_GRAPH: true,
            }),
        ).toMatchObject({
            TERRITORY_RENDER_MODE: 'perimeter_field',
            TERRITORY_GRAPH: true,
        });
    });

    it('marks themes without any territory mode as agnostic', () => {
        const audit = auditThemeRouting({
            SHIP_BASE_SIZE: 3,
            LABEL_ANIM_MODE: 'rolling',
        });

        expect(audit.status).toBe('agnostic');
        expect(audit.familyId).toBe('agnostic');
    });

    it('marks older boolean themes as compat-inferred and documents normalization', () => {
        const audit = auditThemeRouting({
            TERRITORY_GRAPH: true,
            SHIP_BASE_SIZE: 3,
        });

        expect(audit.renderMode).toBe('graph');
        expect(audit.status).toBe('compat-inferred');
        expect(audit.familyId).toBe('legacy');
        expect(audit.notes.join(' ')).toContain('without normalization');
    });

    it('flags themes saved against a mode retired by the quarantine', () => {
        const audit = auditThemeRouting({
            TERRITORY_RENDER_MODE: 'metaball',
            VS_TRANSITION_MODE: 'metaball_six_slice_burst',
        });

        expect(audit.status).toBe('needs-editing');
        expect(audit.familyId).toBe('legacy');
        expect(audit.notes.join(' ')).toContain(
            'not in the current render-mode catalog',
        );
    });

    it('flags kept-mode themes carrying a transition id that gets coerced', () => {
        const audit = auditThemeRouting({
            TERRITORY_RENDER_MODE: 'power_vector',
            VS_TRANSITION_MODE: 'metaball_lane_push',
        });

        expect(audit.status).toBe('needs-editing');
        expect(audit.familyId).toBe('power-vector');
        expect(audit.notes.join(' ')).toContain('coerced');
    });

    it('accepts explicit themes that match current routing and transition rules', () => {
        const audit = auditThemeRouting({
            TERRITORY_RENDER_MODE: 'power_vector',
            VS_TRANSITION_MODE: 'no_loser',
        });

        expect(audit.status).toBe('wired');
        expect(audit.familyId).toBe('power-vector');
    });

    it('groups every kept cell-grid skin under one family', () => {
        for (const mode of ['phase_edges', 'ember_lattice', 'phase_field']) {
            expect(
                auditThemeRouting({
                    TERRITORY_RENDER_MODE: mode,
                    VS_TRANSITION_MODE: 'no_loser',
                }),
            ).toMatchObject({ status: 'wired', familyId: 'cell-grid' });
        }
    });

    it('groups themes by resolved render family order', () => {
        const groups = groupThemesByRenderFamily([
            { name: 'graph legacy', values: { TERRITORY_GRAPH: true } },
            { name: 'agnostic pack', values: { SHIP_BASE_SIZE: 3 } },
            {
                name: 'edges explicit',
                values: {
                    TERRITORY_RENDER_MODE: 'phase_edges',
                    VS_TRANSITION_MODE: 'no_loser',
                },
            },
            {
                name: 'pv explicit',
                values: {
                    TERRITORY_RENDER_MODE: 'power_vector',
                    VS_TRANSITION_MODE: 'no_loser',
                },
            },
        ]);

        expect(groups.map((group) => group.id)).toEqual([
            'power-vector',
            'cell-grid',
            'legacy',
            'agnostic',
        ]);
    });
});
