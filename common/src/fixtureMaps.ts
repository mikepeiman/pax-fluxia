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
        id: 'lane_clearance_triplet',
        name: 'Lane Clearance Triplet',
        purpose: 'Minimal curved-lane clearance case with one blocker star near the centerline and two anchored ownership clusters.',
        tags: ['fixtures', 'lanes', 'curved-lanes', 'parity', 'hand-authored'],
        resourcePath: 'common/resources/fixture-maps/lane_clearance_triplet.json',
        notes: [
            'Use this first when validating curved lane serialization and centerline reuse in territory/FX.',
            'The middle blocker star should force a visible detour when curved lanes are enabled.',
        ],
    },
    {
        id: 'same_owner_disconnect_gap',
        name: 'Same-Owner Disconnect Gap',
        purpose: 'Simple same-owner non-connected stress case for disconnect buffers, enemy bridge behavior, and frontier pressure.',
        tags: ['fixtures', 'disconnect', 'frontiers', 'hand-authored'],
        resourcePath: 'common/resources/fixture-maps/same_owner_disconnect_gap.json',
        notes: [
            'Two human stars share ownership but are intentionally not lane-connected.',
            'The center and right-side enemy holdings should make disconnect behavior obvious.',
        ],
    },
    {
        id: 'world_edge_frontier',
        name: 'World Edge Frontier',
        purpose: 'Near-border territory case for world-boundary frontiers, border rendering, and edge stability.',
        tags: ['fixtures', 'world-edge', 'frontiers', 'hand-authored'],
        resourcePath: 'common/resources/fixture-maps/world_edge_frontier.json',
        notes: [
            'Use this to inspect owner-to-world border handling and edge-adjacent fill continuity.',
        ],
    },
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
