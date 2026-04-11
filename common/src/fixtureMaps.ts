// ============================================================================
// Fixture map registry
// Shared canonical registry for deterministic map cases used in renderer,
// parity, and future custom-map/editor validation work.
//
// Phase 1 foundation:
// - fixture metadata lives in /common
// - entries currently point at curated saved-map JSON assets already in repo
// - loading/validation pipelines can grow around this registry later
// ============================================================================

export interface FixtureMapDescriptor {
    id: string;
    name: string;
    purpose: string;
    tags: string[];
    resourcePath: string;
    notes?: string[];
}

export const FIXTURE_MAPS: FixtureMapDescriptor[] = [
    {
        id: 'lane_clearance_curvy',
        name: 'Lane Clearance - Curvy',
        purpose: 'Curved-lane clearance case for lane-path parity, territory corridor sampling, and travel-path validation.',
        tags: ['lanes', 'curved-lanes', 'parity', 'territory'],
        resourcePath: 'common/resources/saved-maps/apr_10_curvy.json',
        notes: [
            'Initial fixture registry entry referencing an existing curated saved map.',
            'Useful for validating that curved lane centerlines survive SP/MP serialization intact.',
        ],
    },
    {
        id: 'lane_clearance_curvy_2',
        name: 'Lane Clearance - Curvy 2',
        purpose: 'Second curved-lane comparison case for topology and visual regression checks.',
        tags: ['lanes', 'curved-lanes', 'parity', 'comparison'],
        resourcePath: 'common/resources/saved-maps/apr_10_curvy2.json',
    },
    {
        id: 'arena_power',
        name: 'Arena Power',
        purpose: 'Compact arena-style stress case for contested frontiers and renderer comparison.',
        tags: ['arena', 'territory', 'renderer-comparison'],
        resourcePath: 'common/resources/saved-maps/arena_power.json',
    },
    {
        id: 'arena_early_mid',
        name: 'Arena Early Mid',
        purpose: 'Mid-density frontier case for transition and ownership-shape review.',
        tags: ['arena', 'frontiers', 'transitions'],
        resourcePath: 'common/resources/saved-maps/arena_early-mid.json',
    },
];

export function getFixtureMapById(id: string): FixtureMapDescriptor | undefined {
    return FIXTURE_MAPS.find((fixture) => fixture.id === id);
}
