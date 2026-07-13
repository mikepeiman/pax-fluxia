// ============================================================================
// Geometry kernel — the SINGLE home for shared geometry primitives.
// Consolidated during the 2026-07-13 cleanup campaign (Stage 1). Add new shared
// primitives HERE; never re-hand-roll shoelace/Chaikin/etc. in a consumer.
// ============================================================================
export { shoelace, signedArea, polygonArea, type Vec2 } from './polygonArea';
export {
    ptKey,
    chaikinSmoothPolyline,
    chaikinSmoothPolygon,
    chaikinFlat,
    chaikinFlatOnce,
} from './chaikin';
