// ============================================================================
// Shared geometry types for territory rendering
// ============================================================================

/** A site in the power diagram — star or virtual point with weight. */
export interface PowerSite {
    x: number;
    y: number;
    weight: number;
    ownerId: string;
    starId: string;
    virtual?: 'corridor' | 'disconnect';
}

/** Polygon output from the power diagram, augmented with ownership info. */
export interface TerritoryCell {
    points: [number, number][];
    ownerId: string;
    siteId: string;
}

/** Merged polygon for same-owner territory rendering. */
export interface MergedTerritory {
    points: [number, number][];     // [[x,y], ...] closed polygon
    ownerId: string;
    color: number;          // hex fill color
}

/** A continuous polyline of chained shared border edges between two owners. */
export interface SharedPolyline {
    points: [number, number][];  // ordered points of the chained polyline
    ownerPairKey: string;        // sorted owner pair key for matching
    color: number;               // blended color for rendering
}

/** A border edge segment shared between two different owners. */
export interface SharedBorderEdge {
    x1: number; y1: number;
    x2: number; y2: number;
    ownerA: string;
    ownerB: string;
    colorA: number;
    colorB: number;
    siteIdA: string;  // star/cell identity on side A
    siteIdB: string;  // star/cell identity on side B
}

/** A continuous closed frontier loop for one player's territory boundary. */
export interface FrontierLoop {
    points: [number, number][];
    ownerId: string;
}
