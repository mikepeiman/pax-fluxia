const TERRITORY_CONFIG_PREFIXES = [
    'TERRITORY_',
    'PERIMETER_FIELD_',
    'METABALL_',
    'GRID_GRADIENT_',
    'VORONOI_',
    'MODIFIED_VORONOI_',
    'DF_',
] as const;

const TERRITORY_CONFIG_EXACT_KEYS = new Set([
    'FRONTIER_RESOLUTION',
    'CHAIKIN_BOUNDARY_PAD',
    'CHAIKIN_BOUNDARY_EPS',
    'MIN_COLOR_LIGHTNESS',
]);

function isTerritoryFingerprintKey(key: string): boolean {
    if (TERRITORY_CONFIG_EXACT_KEYS.has(key)) return true;
    return TERRITORY_CONFIG_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function buildTerritoryConfigFingerprint(
    config: Record<string, unknown>,
    runtime?: {
        geometryRefreshToken?: unknown;
        visualEpoch?: unknown;
    },
): string {
    const parts = Object.keys(config)
        .filter((key) => isTerritoryFingerprintKey(key))
        .sort()
        .map((key) => `${key}=${JSON.stringify(config[key])}`);

    if (runtime && 'geometryRefreshToken' in runtime) {
        parts.push(
            `__GEOMETRY_REFRESH_TOKEN=${JSON.stringify(runtime.geometryRefreshToken)}`,
        );
    }
    if (runtime && 'visualEpoch' in runtime) {
        parts.push(
            `__TERRITORY_VISUAL_EPOCH=${JSON.stringify(runtime.visualEpoch)}`,
        );
    }

    return parts.join('|');
}
