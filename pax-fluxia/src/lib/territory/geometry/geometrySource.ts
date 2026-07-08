/**
 * Territory geometry source — UNIFIED on PowerCore (2026-07-08, user-directed).
 *
 * PowerCore is THE geometry engine for every render mode; the legacy 0319
 * ASSEMBLY selection is retired (the 0319 Stage-0 site/weight/clip builder is
 * still shared inside PowerCore, and the 0319 assembly remains ONLY as the
 * compile-error fallback path inside buildPerimeterFieldRenderFamilyGeometry).
 * All persisted/legacy source values auto-migrate at read boundaries via
 * normalizePerimeterFieldGeometrySource — there is no user-facing selector.
 */
export const PERIMETER_FIELD_AUTHORITY_GEOMETRY_SOURCE = 'power_voronoi_0319' as const;

/** PowerCore — the unified geometry source (the only live value). */
export const POWER_CORE_GEOMETRY_SOURCE = 'power_core' as const;

export type PerimeterFieldGeometrySourceId =
    | typeof PERIMETER_FIELD_AUTHORITY_GEOMETRY_SOURCE
    | typeof POWER_CORE_GEOMETRY_SOURCE;

export type LegacyPerimeterFieldGeometrySourceId = 'resolved_vector';

/**
 * Every value — including persisted 'power_voronoi_0319' and legacy aliases —
 * normalizes to PowerCore. This is the auto-migration for saved configs now
 * that the selector is removed.
 */
export function normalizePerimeterFieldGeometrySource(
    source: unknown,
): PerimeterFieldGeometrySourceId {
    void source;
    return POWER_CORE_GEOMETRY_SOURCE;
}

export function isLegacyPerimeterFieldGeometrySource(
    source: unknown,
): source is LegacyPerimeterFieldGeometrySourceId {
    return source === 'resolved_vector';
}
