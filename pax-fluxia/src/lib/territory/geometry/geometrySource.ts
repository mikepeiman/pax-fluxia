export const PERIMETER_FIELD_AUTHORITY_GEOMETRY_SOURCE = 'power_voronoi_0319' as const;

export type PerimeterFieldGeometrySourceId =
    typeof PERIMETER_FIELD_AUTHORITY_GEOMETRY_SOURCE;

export type LegacyPerimeterFieldGeometrySourceId = 'resolved_vector';

// `resolved_vector` is retained only as a persisted-config alias.
// Live perimeter-field geometry must resolve through the 0319 authority path.
export function normalizePerimeterFieldGeometrySource(
    _source: unknown,
): PerimeterFieldGeometrySourceId {
    return PERIMETER_FIELD_AUTHORITY_GEOMETRY_SOURCE;
}

export function isLegacyPerimeterFieldGeometrySource(
    source: unknown,
): source is LegacyPerimeterFieldGeometrySourceId {
    return source === 'resolved_vector';
}
