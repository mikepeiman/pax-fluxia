import type {
    LaneConstraintStatus,
    LanePathKind,
    MapConnection,
} from '../mapgen';
import type { MapDiagnosticMeasurement, StarId, StarType } from '../types';

export const AUTHORED_MAP_SCHEMA_VERSION = 1;
export const AUTHORED_NEUTRAL_OWNER_ID = 'neutral';

export type AuthoredOwnerId = string;
export type AuthoredMapCategory = 'classic' | 'custom' | 'test';
export type AuthoredMeasurementMode = 'manual' | 'generated';
export type AuthoredMeasurementPreset = 'lane_length';
export type AuthoredMeasurementSnapKind = 'star' | 'lane' | 'free';
export type AuthoredLanePathMode = 'auto' | 'manual';

export interface AuthoredMapMetadata {
    mapId: string;
    name: string;
    author?: string;
    description?: string;
    version: number;
    category?: AuthoredMapCategory;
    familyId?: string;
    familyName?: string;
    editorHexRadius?: number;
    createdAt?: string;
    updatedAt?: string;
    tags?: string[];
    importedFrom?: {
        kind: 'classic' | 'legacy-json' | 'fixture' | 'builtin' | 'editor';
        sourceId?: string;
        sourcePath?: string;
    };
    autosaveRevisionId?: string;
    autosaveSequence?: number;
    thumbnailDataUrl?: string;
}

export interface AuthoredFactionSlot {
    id: string;
    label: string;
    color?: string;
    description?: string;
    order: number;
}

export interface AuthoredStar {
    id: StarId;
    x: number;
    y: number;
    gridQ?: number;
    gridR?: number;
    ownerId?: AuthoredOwnerId;
    starType: StarType;
    activeShips?: number;
    damagedShips?: number;
    targetId?: StarId;
    productionRate?: number;
    specialTraits?: string[];
}

export interface AuthoredLane {
    id: string;
    sourceId: StarId;
    targetId: StarId;
    distance?: number;
    pathMode?: AuthoredLanePathMode;
    laneWaypoints?: Array<[number, number]>;
    lanePathKind?: LanePathKind;
    laneConstraintStatus?: LaneConstraintStatus;
}

export interface AuthoredMeasurementAnchor {
    x: number;
    y: number;
    snapKind: AuthoredMeasurementSnapKind;
    starId?: string;
    laneId?: string;
    laneKey?: string;
    laneLabel?: string;
}

export interface AuthoredMeasurement {
    id: string;
    mode: AuthoredMeasurementMode;
    label?: string;
    visibleByDefault?: boolean;
    start: AuthoredMeasurementAnchor;
    end: AuthoredMeasurementAnchor;
    preset?: AuthoredMeasurementPreset;
    relatedLaneId?: string;
    starPairLabel?: string;
    relatedLaneLabel?: string;
}

export interface AuthoredMapDefinition {
    metadata: AuthoredMapMetadata;
    factions: AuthoredFactionSlot[];
    stars: AuthoredStar[];
    connections: AuthoredLane[];
    measurements?: AuthoredMeasurement[];
    customRules?: Record<string, unknown>;
}

export interface LegacyMapDefinition {
    metadata: {
        name: string;
        author?: string;
        description?: string;
        version?: number;
        editorHexRadius?: number;
        createdAt?: string;
    };
    stars: Array<{
        id: StarId;
        x: number;
        y: number;
        gridQ?: number;
        gridR?: number;
        ownerId?: string;
        starType: StarType;
        activeShips?: number;
        damagedShips?: number;
        targetId?: StarId;
        productionRate?: number;
        specialTraits?: string[];
    }>;
    connections: Array<{
        id?: string;
        sourceId: StarId;
        targetId: StarId;
        distance?: number;
        laneWaypoints?: Array<[number, number]>;
        lanePathKind?: LanePathKind;
        laneConstraintStatus?: LaneConstraintStatus;
    }>;
    measurements?: AuthoredMeasurement[];
    customRules?: Record<string, unknown>;
}

export type MapValidationIssueSeverity = 'error' | 'warning';

export interface MapValidationIssue {
    code: string;
    severity: MapValidationIssueSeverity;
    message: string;
    path?: string;
    relatedIds?: string[];
}

export interface RuntimeAuthoredStar extends AuthoredStar {
    ownerId: string;
}

export interface RuntimeAuthoredMap {
    metadata: AuthoredMapMetadata;
    factions: AuthoredFactionSlot[];
    stars: RuntimeAuthoredStar[];
    connections: MapConnection[];
    diagnostics: {
        measurements: MapDiagnosticMeasurement[];
    };
    factionRemap: Record<string, string>;
}
