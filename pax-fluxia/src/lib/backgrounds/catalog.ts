import type {
    BackgroundCapabilityMatrix,
    BackgroundModeDefinition,
    BackgroundModeId,
    BackgroundTunableDef,
} from './types';

const SHARED_TUNABLES: readonly BackgroundTunableDef[] = [
    {
        key: 'intensity',
        label: 'Intensity',
        min: 0,
        max: 1.5,
        step: 0.05,
        defaultValue: 0.5,
    },
    {
        key: 'animationSpeed',
        label: 'Animation Speed',
        min: 0,
        max: 2,
        step: 0.05,
        defaultValue: 1,
    },
    {
        key: 'scale',
        label: 'Scale',
        min: 0.35,
        max: 2.5,
        step: 0.05,
        defaultValue: 1,
    },
    {
        key: 'edgeSoftness',
        label: 'Edge Softness',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.55,
    },
    {
        key: 'vignette',
        label: 'Vignette',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.2,
    },
];

function surfaceDefaults(
    menu: Record<string, number>,
    game: Record<string, number>,
): Readonly<Record<'menu' | 'game', Record<string, number>>> {
    return { menu, game };
}

export const BACKGROUND_MODE_CATALOG: readonly BackgroundModeDefinition[] = [
    {
        id: 'legacy_image',
        label: 'Legacy Image',
        description: 'Compatibility mode for existing static image backgrounds.',
        supportsMenu: true,
        supportsGame: true,
        sharedTunables: [],
        modeTunables: [],
        defaultsBySurface: surfaceDefaults({}, {}),
        requiredLayers: [],
        runtimeSupport: ['all'],
    },
    {
        id: 'nebula_veil',
        label: 'Nebula Veil',
        description: 'A soft drifting interior veil with restrained color drift.',
        supportsMenu: true,
        supportsGame: true,
        sharedTunables: SHARED_TUNABLES,
        modeTunables: [
            { key: 'density', label: 'Density', min: 0, max: 1, step: 0.05, defaultValue: 0.45 },
            { key: 'driftSpeed', label: 'Drift', min: 0, max: 2, step: 0.05, defaultValue: 0.65 },
            { key: 'contrast', label: 'Contrast', min: 0, max: 1, step: 0.05, defaultValue: 0.35 },
            { key: 'parallaxDepth', label: 'Parallax', min: 0, max: 1, step: 0.05, defaultValue: 0.25 },
        ],
        defaultsBySurface: surfaceDefaults(
            {
                intensity: 0.48,
                animationSpeed: 0.7,
                scale: 1,
                edgeSoftness: 0.75,
                vignette: 0.3,
                density: 0.38,
                driftSpeed: 0.55,
                contrast: 0.26,
                parallaxDepth: 0.24,
            },
            {
                intensity: 0.42,
                animationSpeed: 0.75,
                scale: 0.95,
                edgeSoftness: 0.6,
                vignette: 0.12,
                density: 0.3,
                driftSpeed: 0.6,
                contrast: 0.2,
                parallaxDepth: 0.18,
            },
        ),
        requiredLayers: ['interior'],
        runtimeSupport: [
            'menu',
            'power_voronoi_canonical',
            'metaball_grid_phase_edges',
            'metaball_grid_ember_lattice',
            'metaball_grid_phase_field',
        ],
        primary: true,
    },
    {
        id: 'banner_light',
        label: 'Banner Light',
        description: 'Broad ceremonial light sweeps with low-frequency motion.',
        supportsMenu: true,
        supportsGame: true,
        sharedTunables: SHARED_TUNABLES,
        modeTunables: [
            { key: 'bandCount', label: 'Bands', min: 1, max: 6, step: 1, defaultValue: 3 },
            { key: 'sweepAngle', label: 'Angle', min: -180, max: 180, step: 5, defaultValue: -20 },
            { key: 'sweepWidth', label: 'Width', min: 0.05, max: 0.9, step: 0.05, defaultValue: 0.3 },
            { key: 'sweepSpeed', label: 'Sweep Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.55 },
        ],
        defaultsBySurface: surfaceDefaults(
            {
                intensity: 0.38,
                animationSpeed: 0.55,
                scale: 1,
                edgeSoftness: 0.82,
                vignette: 0.24,
                bandCount: 3,
                sweepAngle: -12,
                sweepWidth: 0.36,
                sweepSpeed: 0.42,
            },
            {
                intensity: 0.34,
                animationSpeed: 0.5,
                scale: 1,
                edgeSoftness: 0.58,
                vignette: 0.1,
                bandCount: 2,
                sweepAngle: -16,
                sweepWidth: 0.25,
                sweepSpeed: 0.48,
            },
        ),
        requiredLayers: ['interior'],
        runtimeSupport: [
            'menu',
            'power_voronoi_canonical',
            'metaball_grid_phase_edges',
            'metaball_grid_ember_lattice',
            'metaball_grid_phase_field',
        ],
        primary: true,
    },
    {
        id: 'shadow_mist',
        label: 'Shadow Mist',
        description: 'Low-alpha shadow haze with rare dim glints.',
        supportsMenu: true,
        supportsGame: true,
        sharedTunables: SHARED_TUNABLES,
        modeTunables: [
            { key: 'mistDensity', label: 'Mist Density', min: 0, max: 1, step: 0.05, defaultValue: 0.5 },
            { key: 'curlAmount', label: 'Curl', min: 0, max: 1, step: 0.05, defaultValue: 0.4 },
            { key: 'glintRate', label: 'Glint Rate', min: 0, max: 1, step: 0.05, defaultValue: 0.2 },
            { key: 'falloff', label: 'Falloff', min: 0, max: 1, step: 0.05, defaultValue: 0.55 },
        ],
        defaultsBySurface: surfaceDefaults(
            {
                intensity: 0.44,
                animationSpeed: 0.5,
                scale: 1.08,
                edgeSoftness: 0.8,
                vignette: 0.42,
                mistDensity: 0.52,
                curlAmount: 0.38,
                glintRate: 0.15,
                falloff: 0.64,
            },
            {
                intensity: 0.34,
                animationSpeed: 0.45,
                scale: 1.02,
                edgeSoftness: 0.62,
                vignette: 0.22,
                mistDensity: 0.45,
                curlAmount: 0.34,
                glintRate: 0.1,
                falloff: 0.58,
            },
        ),
        requiredLayers: ['interior'],
        runtimeSupport: [
            'menu',
            'power_voronoi_canonical',
            'metaball_grid_phase_edges',
            'metaball_grid_ember_lattice',
            'metaball_grid_phase_field',
        ],
        primary: true,
    },
    {
        id: 'starlit_dust',
        label: 'Starlit Dust',
        description: 'Sparse motes with subtle twinkle and depth spread.',
        supportsMenu: false,
        supportsGame: true,
        sharedTunables: SHARED_TUNABLES,
        modeTunables: [
            { key: 'particleDensity', label: 'Particle Density', min: 0, max: 1, step: 0.05, defaultValue: 0.32 },
            { key: 'sizeRange', label: 'Size Range', min: 0.1, max: 1, step: 0.05, defaultValue: 0.42 },
            { key: 'twinkleRate', label: 'Twinkle', min: 0, max: 1, step: 0.05, defaultValue: 0.35 },
            { key: 'depthSpread', label: 'Depth Spread', min: 0, max: 1, step: 0.05, defaultValue: 0.5 },
        ],
        defaultsBySurface: surfaceDefaults({}, {
            intensity: 0.46,
            animationSpeed: 0.9,
            scale: 1,
            edgeSoftness: 0.48,
            vignette: 0.08,
            particleDensity: 0.3,
            sizeRange: 0.35,
            twinkleRate: 0.28,
            depthSpread: 0.45,
        }),
        requiredLayers: ['particles'],
        runtimeSupport: [
            'power_voronoi_canonical',
            'metaball_grid_phase_edges',
            'metaball_grid_ember_lattice',
            'metaball_grid_phase_field',
        ],
        primary: true,
    },
    {
        id: 'leyline_flow',
        label: 'Leyline Flow',
        description: 'Animated line currents tracing the owned space.',
        supportsMenu: false,
        supportsGame: true,
        sharedTunables: SHARED_TUNABLES,
        modeTunables: [
            { key: 'lineDensity', label: 'Line Density', min: 0, max: 1, step: 0.05, defaultValue: 0.35 },
            { key: 'flowSpeed', label: 'Flow Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.7 },
            { key: 'warpAmount', label: 'Warp', min: 0, max: 1, step: 0.05, defaultValue: 0.35 },
            { key: 'lineThickness', label: 'Thickness', min: 0.1, max: 1, step: 0.05, defaultValue: 0.28 },
        ],
        defaultsBySurface: surfaceDefaults({}, {
            intensity: 0.44,
            animationSpeed: 0.85,
            scale: 1,
            edgeSoftness: 0.52,
            vignette: 0.08,
            lineDensity: 0.3,
            flowSpeed: 0.65,
            warpAmount: 0.28,
            lineThickness: 0.24,
        }),
        requiredLayers: ['interior'],
        runtimeSupport: [
            'power_voronoi_canonical',
            'metaball_grid_phase_edges',
            'metaball_grid_ember_lattice',
            'metaball_grid_phase_field',
        ],
        primary: true,
    },
    {
        id: 'ember_kingdom',
        label: 'Ember Kingdom',
        description: 'Warm embers with light heat shimmer and restrained glow.',
        supportsMenu: false,
        supportsGame: true,
        sharedTunables: SHARED_TUNABLES,
        modeTunables: [
            { key: 'emberDensity', label: 'Ember Density', min: 0, max: 1, step: 0.05, defaultValue: 0.3 },
            { key: 'riseSpeed', label: 'Rise Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.85 },
            { key: 'heatDistortion', label: 'Heat Distortion', min: 0, max: 1, step: 0.05, defaultValue: 0.25 },
            { key: 'sparkLifetime', label: 'Spark Lifetime', min: 0.1, max: 1, step: 0.05, defaultValue: 0.45 },
        ],
        defaultsBySurface: surfaceDefaults({}, {
            intensity: 0.5,
            animationSpeed: 0.95,
            scale: 1,
            edgeSoftness: 0.45,
            vignette: 0.12,
            emberDensity: 0.28,
            riseSpeed: 0.75,
            heatDistortion: 0.2,
            sparkLifetime: 0.4,
        }),
        requiredLayers: ['interior', 'particles'],
        runtimeSupport: [
            'power_voronoi_canonical',
            'metaball_grid_phase_edges',
            'metaball_grid_ember_lattice',
            'metaball_grid_phase_field',
        ],
        primary: true,
    },
    {
        id: 'frost_veins',
        label: 'Frost Veins',
        description: 'Cold wash with crystalline twinkle and soft pulse.',
        supportsMenu: false,
        supportsGame: true,
        sharedTunables: SHARED_TUNABLES,
        modeTunables: [
            { key: 'flakeDensity', label: 'Flake Density', min: 0, max: 1, step: 0.05, defaultValue: 0.28 },
            { key: 'glintFrequency', label: 'Glint Frequency', min: 0, max: 1, step: 0.05, defaultValue: 0.3 },
            { key: 'crystalSharpness', label: 'Crystal Sharpness', min: 0, max: 1, step: 0.05, defaultValue: 0.45 },
            { key: 'pulseSoftness', label: 'Pulse Softness', min: 0, max: 1, step: 0.05, defaultValue: 0.55 },
        ],
        defaultsBySurface: surfaceDefaults({}, {
            intensity: 0.42,
            animationSpeed: 0.78,
            scale: 1,
            edgeSoftness: 0.5,
            vignette: 0.08,
            flakeDensity: 0.24,
            glintFrequency: 0.22,
            crystalSharpness: 0.4,
            pulseSoftness: 0.62,
        }),
        requiredLayers: ['interior', 'particles'],
        runtimeSupport: [
            'power_voronoi_canonical',
            'metaball_grid_phase_edges',
            'metaball_grid_ember_lattice',
            'metaball_grid_phase_field',
        ],
        primary: true,
    },
    {
        id: 'storm_current',
        label: 'Storm Current',
        description: 'Charged specks and frontier crawl with rare flashes.',
        supportsMenu: false,
        supportsGame: true,
        sharedTunables: SHARED_TUNABLES,
        modeTunables: [
            { key: 'chargeDensity', label: 'Charge Density', min: 0, max: 1, step: 0.05, defaultValue: 0.35 },
            { key: 'arcFrequency', label: 'Arc Frequency', min: 0, max: 1, step: 0.05, defaultValue: 0.3 },
            { key: 'crawlSpeed', label: 'Crawl Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.8 },
            { key: 'frontierWidth', label: 'Frontier Width', min: 0.1, max: 1, step: 0.05, defaultValue: 0.35 },
        ],
        defaultsBySurface: surfaceDefaults({}, {
            intensity: 0.48,
            animationSpeed: 1,
            scale: 1,
            edgeSoftness: 0.38,
            vignette: 0.08,
            chargeDensity: 0.3,
            arcFrequency: 0.22,
            crawlSpeed: 0.75,
            frontierWidth: 0.32,
        }),
        requiredLayers: ['particles', 'frontier'],
        runtimeSupport: [
            'power_voronoi_canonical',
            'metaball_grid_phase_edges',
            'metaball_grid_ember_lattice',
            'metaball_grid_phase_field',
        ],
        primary: true,
    },
];

export const BACKGROUND_MODE_BY_ID = new Map(
    BACKGROUND_MODE_CATALOG.map((definition) => [definition.id, definition]),
);

export const PRIMARY_BACKGROUND_MODE_IDS = BACKGROUND_MODE_CATALOG.filter(
    (definition) => definition.primary,
).map((definition) => definition.id);

export const MENU_BACKGROUND_MODE_IDS = BACKGROUND_MODE_CATALOG.filter(
    (definition) => definition.primary && definition.supportsMenu,
).map((definition) => definition.id);

export const GAME_BACKGROUND_MODE_IDS = BACKGROUND_MODE_CATALOG.filter(
    (definition) => definition.primary && definition.supportsGame,
).map((definition) => definition.id);

export const DEFAULT_MENU_BACKGROUND_MODE_ID: BackgroundModeId = 'nebula_veil';
export const DEFAULT_GAME_BACKGROUND_MODE_ID: BackgroundModeId = 'legacy_image';

export const BACKGROUND_CAPABILITY_MATRIX: BackgroundCapabilityMatrix = {
    none: [],
    territory_canonical: [],
    power_voronoi_canonical: GAME_BACKGROUND_MODE_IDS,
    territory_engine: [],
    metaball_grid: [],
    metaball_grid_phase_edges: GAME_BACKGROUND_MODE_IDS,
    metaball_grid_ember_lattice: GAME_BACKGROUND_MODE_IDS,
    metaball_grid_phase_field: GAME_BACKGROUND_MODE_IDS,
    distance_field: [],
    perimeter_field: [],
    vs_pvv3: [],
    voronoi: [],
    metaball: [],
    pixel: [],
    graph: [],
    contour: [],
    power_voronoi: [],
    modified_voronoi: [],
    pvv2_dy4: [],
};

export function getSupportedBackgroundModeIdsForRenderMode(
    renderMode: string | null | undefined,
): readonly BackgroundModeId[] {
    if (!renderMode) return BACKGROUND_CAPABILITY_MATRIX.none;
    return BACKGROUND_CAPABILITY_MATRIX[renderMode] ?? BACKGROUND_CAPABILITY_MATRIX.none;
}

export function isBackgroundModeSupportedForRenderMode(
    renderMode: string | null | undefined,
    modeId: BackgroundModeId,
): boolean {
    if (modeId === 'legacy_image') return true;
    return getSupportedBackgroundModeIdsForRenderMode(renderMode).includes(modeId);
}
