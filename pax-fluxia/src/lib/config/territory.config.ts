import { gameplayConfigDefaults } from './gameplay.config';
import { territoryFrontierConfigDefaults } from '../territory/frontier/config';
import { cellGridFamilyConfigDefaults } from '../territory/families/cellGrid/config';
import { gridGradientFamilyConfigDefaults } from '../territory/families/gridGradient/config';
import { perimeterFieldFamilyConfigDefaults } from '../territory/families/perimeterField/config';

export const territoryConfigDefaults = {

    TERRITORY_TRANSITION_MS: gameplayConfigDefaults.BASE_TICK_MS,
    TERRITORY_TRANSITION_BIND_TO_TICK: true,
    TERRITORY_CONQUEST_FRONT_MODE: 'radial' as const,
    TERRITORY_MORPH_COMPLETE_PCT: 92,
    TERRITORY_FILL_MODE: 'frontier' as const,
    TERRITORY_FILL_TRANSITION_MODE: 'pv_frontline' as const,
    TERRITORY_BORDER_TRANSITION_MODE: 'off' as const,
    TERRITORY_STYLE_MODE: 'vector' as const,
    TERRITORY_CLUSTER_SPLIT: false,
    TERRITORY_RENDER_MODE: 'ember_lattice',
    VORONOI_ALPHA: 0.23,
    VORONOI_BORDER_WIDTH: 2,
    VORONOI_BORDER_ALPHA: 0.35,
    VORONOI_BORDER_SMOOTH: 2,
    // ── Shared territory surface style ──────────────────────────────────────
    // Fill/border appearance for EVERY render mode (power_vector, phase_edges,
    // ember_lattice, phase_field, grid_gradient all read these). They were
    // declared inside the metaball family's config until that family's last
    // renderer was deleted — a family owning the shared surface style was
    // always a misplacement, and it left the keys homed in a dead directory.
    TERRITORY_SURFACE_FILL_ENABLED: true,
    TERRITORY_SURFACE_ALPHA: 0.5,
    TERRITORY_SURFACE_SATURATION: 1.05,
    TERRITORY_SURFACE_LIGHTNESS: 0.65,
    TERRITORY_SURFACE_BORDER_ENABLED: true,
    TERRITORY_SURFACE_BORDER_WIDTH: 5,
    TERRITORY_SURFACE_BORDER_ALPHA: 1,
    TERRITORY_SURFACE_BORDER_SATURATION: 2,
    TERRITORY_SURFACE_BORDER_LIGHTNESS: 0.35,
    // Opponent-blended borders ON by default — USER-CONFIRMED improvement
    // (2026-07-08): shared frontiers render as the 50/50 mix of both owners'
    // colors instead of one side's (lexicographic ownerA) color.
    TERRITORY_SURFACE_BORDER_BLEND: true,
    CHAIKIN_BOUNDARY_PAD: 50,
    CHAIKIN_BOUNDARY_EPS: 6,
    TERRITORY_BORDER_TRANSITION: 'none',
    FRONTIER_RESOLUTION: 1,
    TERRITORY_GEOMETRY_MODE: 'resolved_power_voronoi' as const,
    MODIFIED_VORONOI_STAR_MARGIN: 0,
    TERRITORY_MSR_STAR_BIAS: 0,
    TERRITORY_MSR_STAR_POWER_ENABLED: false,
    TERRITORY_MSR_STAR_POWER_MODE: 'linear',
    TERRITORY_MSR_STAR_POWER_GAIN: 1,
    TERRITORY_MSR_STAR_POWER_EXPONENT: 2,
    TERRITORY_MSR_STAR_POWER_CAP_PX: 500,
    // 2026-07-02: constraints SHELVED by user — corridor/disconnect virtual
    // sites off by default. They inflated 172 stars to 1,929 diagram sites
    // (11x): 17.6ms full diagrams and 44-104 transition ramps per capture of
    // pure virtual churn. Re-enable via these toggles when constraints resume.
    MODIFIED_VORONOI_CORRIDOR_ENABLED: false,
    MODIFIED_VORONOI_CORRIDOR_SPACING: 10,
    TERRITORY_CX_COUNT: 0,
    TERRITORY_CX_WEIGHT: 0.5,
    TERRITORY_CX_CONTEST_MIDPOINT_VSTARS: true,
    TERRITORY_CX_CONTEST_PAIR_COUNT: 1,
    TERRITORY_CX_CONTEST_PAIR_WEIGHT: 0.5,
    TERRITORY_CX_CONTEST_PAIR_SPACING: 45,
    MODIFIED_VORONOI_DISCONNECT_ENABLED: false,
    MODIFIED_VORONOI_DISCONNECT_DISTANCE: 295,
    TERRITORY_DX_WEIGHT: 3,
    ...territoryFrontierConfigDefaults,
    ...cellGridFamilyConfigDefaults,
    ...gridGradientFamilyConfigDefaults,
    ...perimeterFieldFamilyConfigDefaults,
} as const;
