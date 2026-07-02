export const PERIMETER_FIELD_AUTHORITY_GEOMETRY_SOURCE = 'power_voronoi_0319' as const;

/** PowerCore (P1b): selectable A/B alternative assembly. NOT the default. */
export const POWER_CORE_GEOMETRY_SOURCE = 'power_core' as const;

export type PerimeterFieldGeometrySourceId =
    | typeof PERIMETER_FIELD_AUTHORITY_GEOMETRY_SOURCE
    | typeof POWER_CORE_GEOMETRY_SOURCE;

export type LegacyPerimeterFieldGeometrySourceId = 'resolved_vector';

// `resolved_vector` is retained only as a persisted-config alias.
// Live perimeter-field geometry resolves through the 0319 authority path
// unless PowerCore is explicitly selected (PERIMETER_FIELD_GEOMETRY_SOURCE
// = 'power_core').
export function normalizePerimeterFieldGeometrySource(
    source: unknown,
): PerimeterFieldGeometrySourceId {
    return source === POWER_CORE_GEOMETRY_SOURCE
        ? POWER_CORE_GEOMETRY_SOURCE
        : PERIMETER_FIELD_AUTHORITY_GEOMETRY_SOURCE;
}

export function isLegacyPerimeterFieldGeometrySource(
    source: unknown,
): source is LegacyPerimeterFieldGeometrySourceId {
    return source === 'resolved_vector';
}
