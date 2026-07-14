// ============================================================================
// Geometry utilities barrel — shared across all territory renderers
// ============================================================================

export type {
    PowerSite, TerritoryCell, MergedTerritory,
    SharedPolyline, SharedBorderEdge, FrontierLoop,
} from './types';

export type { OwnerPolygonOutline } from './borderPipeline';

export {
    hexToRGB, rgbToHSL, hslToRGB, adjustColorHSL, blendColors,
} from '$lib/utils/colorUtils';

export { chaikinSmoothPolyline, chaikinSmoothPolygon } from './chaikin';

export {
    resamplePolygon, resamplePolyline, polygonCentroid, lerpPolygon,
    edgeKey, ptKey,
} from './polyUtils';

export {
    extractSharedEdges, chainSharedEdgesIntoPolylines, substituteSmoothedEdges,
    splitMergedOwnerOutlineEdges, chainUndirectedSegments,
} from './borderPipeline';

export {
    classifyEdge, walkBoundaryCW, assembleFrontierLoops,
} from './frontierLoops';

export {
    parameterizeAndAlign, lerpFrontierCPs,
    drawBorderPolylines, buildLerpedPolylines, renderInterpolatedBorders,
} from './morphUtils';

export { mergeSameOwnerCells } from './mergeUtils';

export type { WeldableTerritoryOutline } from './geometryModifiers';

export {
    applyMinStarMargin, smoothSharpVertices, applyDisconnectBuffer,
    weldContestedBoundaryVertices,
} from './geometryModifiers';
