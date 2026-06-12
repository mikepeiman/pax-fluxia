import type { MapDiagnosticMeasurement } from '../types';
import {
    attachLaneWaypointsToConnections,
    type MapConnection,
    type MapLaneMode,
} from '../mapgen';
import { resolveMeasurementSegment } from './measurement';
import {
    AUTHORED_NEUTRAL_OWNER_ID,
    type AuthoredFactionSlot,
    type AuthoredMapDefinition,
    type AuthoredOwnerId,
    type RuntimeAuthoredMap,
    type RuntimeAuthoredStar,
} from './types';

export interface ResolveRuntimeMapOptions {
    playerIds: string[];
    startingShips?: number;
    mapLaneMode?: MapLaneMode;
    mapgenLaneMarginPx?: number;
    scaleLegacyIfSmall?: boolean;
    targetWidth?: number;
    targetHeight?: number;
    paddingRatio?: number;
    spacingMultiplier?: number;
}

function buildFactionRemap(
    factions: AuthoredFactionSlot[],
    stars: AuthoredMapDefinition['stars'],
    playerIds: string[],
): Map<string, string> {
    const remap = new Map<string, string>();
    const authoredFactionIds =
        factions.length > 0
            ? factions.map((faction) => faction.id)
            : [...new Set(stars.map((star) => star.ownerId ?? AUTHORED_NEUTRAL_OWNER_ID))]
                .filter((ownerId) => ownerId !== AUTHORED_NEUTRAL_OWNER_ID)
                .sort();
    const playerIdSet = new Set(playerIds);
    const shouldUseIdentity = authoredFactionIds.some((factionId) => playerIdSet.has(factionId));

    if (shouldUseIdentity) {
        for (const factionId of authoredFactionIds) {
            remap.set(factionId, factionId);
        }
        return remap;
    }

    authoredFactionIds.forEach((factionId, index) => {
        remap.set(factionId, playerIds[index] ?? AUTHORED_NEUTRAL_OWNER_ID);
    });
    return remap;
}

function scalePoint(
    x: number,
    y: number,
    scaleX: number,
    scaleY: number,
    offsetX: number,
    offsetY: number,
): [number, number] {
    return [x * scaleX + offsetX, y * scaleY + offsetY];
}

export function resolveRuntimeMap(
    map: AuthoredMapDefinition,
    options: ResolveRuntimeMapOptions,
): RuntimeAuthoredMap {
    const maxX = Math.max(0, ...map.stars.map((star) => star.x));
    const maxY = Math.max(0, ...map.stars.map((star) => star.y));
    const scaleLegacyIfSmall = options.scaleLegacyIfSmall ?? true;
    const targetWidth = options.targetWidth ?? 1600;
    const targetHeight = options.targetHeight ?? 900;
    const paddingRatio = options.paddingRatio ?? 0.075;
    const spacingMultiplier = options.spacingMultiplier ?? 1;
    const needsScale = scaleLegacyIfSmall && maxX < 1000 && maxY < 600;
    const scaleX = needsScale ? (targetWidth * (1 - paddingRatio * 2)) / Math.max(1, maxX) * spacingMultiplier : 1;
    const scaleY = needsScale ? (targetHeight * (1 - paddingRatio * 2)) / Math.max(1, maxY) * spacingMultiplier : 1;
    const offsetX = needsScale ? targetWidth * paddingRatio : 0;
    const offsetY = needsScale ? targetHeight * paddingRatio : 0;
    const startingShips = options.startingShips ?? 40;

    const factionRemap = buildFactionRemap(map.factions, map.stars, options.playerIds);

    const stars: RuntimeAuthoredStar[] = map.stars.map((star) => {
        const [x, y] = scalePoint(star.x, star.y, scaleX, scaleY, offsetX, offsetY);
        const authoredOwnerId = (star.ownerId ?? AUTHORED_NEUTRAL_OWNER_ID) as AuthoredOwnerId;
        const runtimeOwnerId =
            authoredOwnerId === AUTHORED_NEUTRAL_OWNER_ID
                ? AUTHORED_NEUTRAL_OWNER_ID
                : (factionRemap.get(authoredOwnerId) ?? AUTHORED_NEUTRAL_OWNER_ID);

        return {
            ...star,
            x,
            y,
            ownerId: runtimeOwnerId,
            activeShips: star.activeShips ?? startingShips,
            damagedShips: star.damagedShips ?? 0,
        };
    });

    const starsById = new Map(stars.map((star) => [star.id, star]));
    const autoConnections: MapConnection[] = [];
    const connections: MapConnection[] = map.connections.map((lane) => {
        const source = starsById.get(lane.sourceId);
        const target = starsById.get(lane.targetId);
        const laneWaypoints = lane.laneWaypoints?.map(([x, y]) =>
            scalePoint(x, y, scaleX, scaleY, offsetX, offsetY),
        );
        const connection: MapConnection = {
            sourceId: lane.sourceId,
            targetId: lane.targetId,
            distance: lane.distance ?? (source && target ? Math.hypot(target.x - source.x, target.y - source.y) : 0),
            laneWaypoints,
            lanePathKind: lane.lanePathKind,
            laneConstraintStatus: lane.laneConstraintStatus,
        };
        if (!laneWaypoints || laneWaypoints.length < 2) {
            autoConnections.push(connection);
        }
        return connection;
    });

    if (autoConnections.length > 0) {
        attachLaneWaypointsToConnections(
            stars.map((star) => ({ id: star.id, x: star.x, y: star.y })),
            autoConnections,
            options.mapLaneMode ?? 'curved',
            options.mapgenLaneMarginPx ?? 0,
        );
    }

    const runtimeStarPositions = new Map(stars.map((star) => [star.id, { x: star.x, y: star.y }]));
    const measurements: MapDiagnosticMeasurement[] = (map.measurements ?? []).map((measurement) =>
        resolveMeasurementSegment(measurement, runtimeStarPositions),
    );

    return {
        metadata: map.metadata,
        factions: map.factions,
        stars,
        connections,
        diagnostics: {
            measurements,
        },
        factionRemap: Object.fromEntries(factionRemap.entries()),
    };
}
