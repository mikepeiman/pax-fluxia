import { describe, expect, it } from 'vitest';
import { GEOMETRY_MODE_BY_ID, GEOMETRY_MODES } from './registry';

describe('geometry mode registry', () => {
    it('registers the power-core candidate without making it the first mode', () => {
        expect(GEOMETRY_MODES.map((mode) => mode.id)).toEqual([
            'unified_vector',
            'resolved_power_voronoi',
            'power_core_candidate',
        ]);
        expect(GEOMETRY_MODE_BY_ID.get('power_core_candidate')?.label).toBe(
            'Power Core Candidate',
        );
    });
});
