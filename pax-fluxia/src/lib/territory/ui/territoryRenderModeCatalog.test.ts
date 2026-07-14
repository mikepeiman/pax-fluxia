import { describe, expect, it } from 'vitest';
import {
    TERRITORY_RENDER_MODE_CATALOG,
    normalizeTerritoryRenderModeId,
    resolveTerritoryRenderModeOptions,
} from './territoryRenderModeCatalog';
import { getTopbarTerritoryModeOptions } from './territoryModeShortcuts';

const KEPT = ['power_vector', 'grid_gradient', 'ember_lattice', 'phase_edges', 'phase_field'];
const QUARANTINED = [
    'territory_runtime', 'power_voronoi_runtime', 'territory_engine', 'vs_pvv3',
    'power_voronoi', 'modified_voronoi', 'pvv2_dy4', 'voronoi', 'distance_field',
    'perimeter_field', 'metaball', 'cell_grid', 'pixel', 'graph', 'contour',
];

describe('normalizeTerritoryRenderModeId — Stage 3 quarantine remap', () => {
    it('kept modes are unchanged', () => {
        for (const id of KEPT) expect(normalizeTerritoryRenderModeId(id)).toBe(id);
    });
    it('every quarantined mode resolves to power_vector (never crash/blank)', () => {
        for (const id of QUARANTINED) {
            expect(normalizeTerritoryRenderModeId(id)).toBe('power_vector');
        }
    });
    it('rename aliases still resolve, then fall through quarantine (metaball_grid → cell_grid → power_vector)', () => {
        expect(normalizeTerritoryRenderModeId('metaball_grid')).toBe('power_vector');
        expect(normalizeTerritoryRenderModeId('metaball_grid_phase_field')).toBe('phase_field');
    });
    it('null/undefined/Off pass through', () => {
        expect(normalizeTerritoryRenderModeId(null)).toBe(null);
        expect(normalizeTerritoryRenderModeId(undefined)).toBe(undefined);
        expect(normalizeTerritoryRenderModeId('none')).toBe('none');
    });
});

describe('catalog shape — Stage 7 acceptance gate', () => {
    it('lists exactly the keep-set (+ Off)', () => {
        expect(TERRITORY_RENDER_MODE_CATALOG.map((def) => def.id).sort()).toEqual(
            [...KEPT, 'none'].sort(),
        );
    });

    it('presents the default mode first and Off last', () => {
        const ids = TERRITORY_RENDER_MODE_CATALOG.map((def) => def.id);
        expect(ids[0]).toBe('power_vector');
        expect(ids[ids.length - 1]).toBe('none');
    });

    it('every entry carries a unique, nonempty chip label', () => {
        const labels = TERRITORY_RENDER_MODE_CATALOG.map((def) => def.shortLabel);
        for (const label of labels) expect(label.trim().length).toBeGreaterThan(0);
        expect(new Set(labels).size).toBe(labels.length);
    });
});

describe('topbar chips — the catalog is the single source of truth', () => {
    it('every selectable catalog mode IS a chip (no hand list, no dropdown remainder)', () => {
        const selectable = resolveTerritoryRenderModeOptions()
            .filter((option) => option.selectable)
            .map((option) => option.id);
        expect(getTopbarTerritoryModeOptions().map((option) => option.id)).toEqual(selectable);
    });

    it('chips expose the catalog labels verbatim', () => {
        for (const chip of getTopbarTerritoryModeOptions()) {
            const def = TERRITORY_RENDER_MODE_CATALOG.find((d) => d.id === chip.id);
            expect(def, chip.id).toBeDefined();
            expect(chip.shortLabel).toBe(def!.shortLabel);
            expect(chip.displayLabel).toBe(def!.label);
        }
    });
});
