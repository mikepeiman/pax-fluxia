import type { StarType } from '../types';
import {
    AUTHORED_MAP_SCHEMA_VERSION,
    AUTHORED_NEUTRAL_OWNER_ID,
    type AuthoredFactionSlot,
    type AuthoredMapDefinition,
    type AuthoredLane,
    type LegacyMapDefinition,
} from './types';
import { normalizeAuthoredMapDefinition } from './metadata';

function slugify(value: string): string {
    const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || `map-${Date.now()}`;
}

function buildFactionsFromOwners(owners: Iterable<string>): AuthoredFactionSlot[] {
    const unique = [...new Set(owners)]
        .filter((ownerId) => ownerId && ownerId !== AUTHORED_NEUTRAL_OWNER_ID)
        .sort();

    return unique.map((ownerId, index) => ({
        id: ownerId,
        label: `Faction ${index + 1}`,
        order: index,
    }));
}

function createLaneId(sourceId: string, targetId: string, index: number): string {
    return `lane-${index}-${[sourceId, targetId].sort().join('-')}`;
}

export function importLegacyMapDefinition(
    legacyMap: LegacyMapDefinition,
    source: AuthoredMapDefinition['metadata']['importedFrom'] = {
        kind: 'legacy-json',
    },
): AuthoredMapDefinition {
    const createdAt = legacyMap.metadata.createdAt ?? new Date().toISOString();
    const factions = buildFactionsFromOwners(
        legacyMap.stars.map((star) => star.ownerId ?? AUTHORED_NEUTRAL_OWNER_ID),
    );
    const mapId = slugify(legacyMap.metadata.name);

    return {
        metadata: {
            mapId,
            name: legacyMap.metadata.name,
            author: legacyMap.metadata.author,
            description: legacyMap.metadata.description,
            version: AUTHORED_MAP_SCHEMA_VERSION,
            category: undefined,
            editorHexRadius: legacyMap.metadata.editorHexRadius,
            createdAt,
            updatedAt: createdAt,
            importedFrom: source,
        },
        factions,
        stars: legacyMap.stars.map((star) => ({
            ...star,
            ownerId: star.ownerId ?? AUTHORED_NEUTRAL_OWNER_ID,
            gridQ: star.gridQ,
            gridR: star.gridR,
        })),
        connections: legacyMap.connections.map((connection, index) => ({
            id: connection.id ?? createLaneId(connection.sourceId, connection.targetId, index),
            sourceId: connection.sourceId,
            targetId: connection.targetId,
            distance: connection.distance,
            pathMode: connection.laneWaypoints?.length ? 'manual' : 'auto',
            laneWaypoints: connection.laneWaypoints,
            lanePathKind: connection.lanePathKind,
            laneConstraintStatus: connection.laneConstraintStatus,
        })),
        measurements: legacyMap.measurements ?? [],
        customRules: legacyMap.customRules,
    };
}

export function isAuthoredMapDefinition(value: unknown): value is AuthoredMapDefinition {
    return (
        typeof value === 'object'
        && value !== null
        && 'metadata' in value
        && 'stars' in value
        && 'connections' in value
        && 'factions' in value
    );
}

export function coerceAuthoredMapDefinition(
    value: AuthoredMapDefinition | LegacyMapDefinition,
    source: AuthoredMapDefinition['metadata']['importedFrom'] = {
        kind: 'legacy-json',
    },
): AuthoredMapDefinition {
    return normalizeAuthoredMapDefinition(
        isAuthoredMapDefinition(value)
            ? value
            : importLegacyMapDefinition(value, source),
    );
}

export function createEmptyAuthoredMap(name = 'Untitled Map'): AuthoredMapDefinition {
    const now = new Date().toISOString();
    const mapId = slugify(name);
    return {
        metadata: {
            mapId,
            name,
            version: AUTHORED_MAP_SCHEMA_VERSION,
            category: 'custom',
            editorHexRadius: undefined,
            createdAt: now,
            updatedAt: now,
            importedFrom: { kind: 'editor' },
        },
        factions: Array.from({ length: 6 }, (_, index) => ({
            id: `slot-${index + 1}`,
            label: `Faction ${index + 1}`,
            order: index,
        })),
        stars: [],
        connections: [],
        measurements: [],
    };
}

export function parseAuthoredMapJson(text: string): AuthoredMapDefinition {
    return JSON.parse(text) as AuthoredMapDefinition;
}

export function serializeAuthoredMap(map: AuthoredMapDefinition): string {
    return JSON.stringify(map, null, 2);
}

export function normalizeLegacyConnectionDistance(
    source: { x: number; y: number },
    target: { x: number; y: number },
    distance?: number,
): number {
    if (typeof distance === 'number' && Number.isFinite(distance)) {
        return distance;
    }
    return Math.hypot(target.x - source.x, target.y - source.y);
}

export function createLegacyClassicMap(
    name: string,
    stars: LegacyMapDefinition['stars'],
    connections: LegacyMapDefinition['connections'],
): LegacyMapDefinition {
    return {
        metadata: {
            name,
            author: 'Pax Galaxia Classic',
            version: AUTHORED_MAP_SCHEMA_VERSION,
            createdAt: '2020-01-01T00:00:00Z',
        },
        stars: stars.map((star) => ({
            ...star,
            ownerId: star.ownerId ?? AUTHORED_NEUTRAL_OWNER_ID,
            starType: star.starType as StarType,
        })),
        connections,
    };
}
