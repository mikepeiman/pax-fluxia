// ============================================================================
// Shared geometry types for territory rendering — RE-EXPORT SHIM
//
// Definitive definitions live in powerVoronoiTerritoryGeometryGenerator.ts
// This file re-exports them for backward compatibility with renderers.
// ============================================================================

export type {
    PowerSite,
    TerritoryCell,
    MergedTerritory,
    SharedPolyline,
    SharedBorderEdge,
    FrontierLoop,
} from '$lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator';
