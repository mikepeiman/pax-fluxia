import { describe, expect, it } from 'vitest';
import { normalizeTerritoryRenderModeId } from './territoryRenderModeCatalog';

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
