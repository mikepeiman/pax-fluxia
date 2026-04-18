import {
    AUTHORED_MAP_SCHEMA_VERSION,
    AUTHORED_NEUTRAL_OWNER_ID,
    type AuthoredMapDefinition,
    type AuthoredMeasurementAnchor,
    type AuthoredMeasurementSnapKind,
    type MapValidationIssue,
} from './types';

function issue(
    severity: 'error' | 'warning',
    code: string,
    message: string,
    path?: string,
    relatedIds?: string[],
): MapValidationIssue {
    return { severity, code, message, path, relatedIds };
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function oddQToCube(q: number, r: number): { x: number; y: number; z: number } {
    const x = q;
    const z = r - (q - (q & 1)) / 2;
    const y = -x - z;
    return { x, y, z };
}

function hexTileDistance(
    leftQ: number,
    leftR: number,
    rightQ: number,
    rightR: number,
): number {
    const left = oddQToCube(leftQ, leftR);
    const right = oddQToCube(rightQ, rightR);
    return Math.max(
        Math.abs(left.x - right.x),
        Math.abs(left.y - right.y),
        Math.abs(left.z - right.z),
    );
}

function validateAnchor(
    anchor: AuthoredMeasurementAnchor,
    which: 'start' | 'end',
    starIds: Set<string>,
    laneIds: Set<string>,
    issues: MapValidationIssue[],
    measurementId: string,
) {
    const path = `measurements.${measurementId}.${which}`;
    if (!isFiniteNumber(anchor.x) || !isFiniteNumber(anchor.y)) {
        issues.push(issue('error', 'measurement_anchor_position_invalid', `Measurement ${measurementId} ${which} anchor has invalid coordinates`, path, [measurementId]));
    }

    const snapKind = anchor.snapKind as AuthoredMeasurementSnapKind | undefined;
    if (!snapKind || !['star', 'lane', 'free'].includes(snapKind)) {
        issues.push(issue('error', 'measurement_anchor_snap_kind_invalid', `Measurement ${measurementId} ${which} anchor has invalid snap kind`, `${path}.snapKind`, [measurementId]));
        return;
    }

    if (snapKind === 'star' && (!anchor.starId || !starIds.has(anchor.starId))) {
        issues.push(issue('error', 'measurement_anchor_star_missing', `Measurement ${measurementId} ${which} anchor references missing star`, `${path}.starId`, [measurementId, anchor.starId ?? '']));
    }

    if (snapKind === 'lane' && (!anchor.laneId || !laneIds.has(anchor.laneId))) {
        issues.push(issue('error', 'measurement_anchor_lane_missing', `Measurement ${measurementId} ${which} anchor references missing lane`, `${path}.laneId`, [measurementId, anchor.laneId ?? '']));
    }
}

export function validateAuthoredMapDefinition(map: AuthoredMapDefinition): MapValidationIssue[] {
    const issues: MapValidationIssue[] = [];
    const starsWithGrid: Array<{ id: string; gridQ: number; gridR: number }> = [];

    if (!map.metadata?.name?.trim()) {
        issues.push(issue('error', 'metadata_name_required', 'Map metadata.name is required', 'metadata.name'));
    }

    if (!map.metadata?.mapId?.trim()) {
        issues.push(issue('error', 'metadata_map_id_required', 'Map metadata.mapId is required', 'metadata.mapId'));
    }

    if (map.metadata?.version !== AUTHORED_MAP_SCHEMA_VERSION) {
        issues.push(issue('warning', 'metadata_version_mismatch', `Map schema version ${map.metadata?.version ?? 'unknown'} does not match expected ${AUTHORED_MAP_SCHEMA_VERSION}`, 'metadata.version'));
    }

    const factionIds = new Set<string>();
    for (const faction of map.factions ?? []) {
        if (!faction.id?.trim()) {
            issues.push(issue('error', 'faction_id_required', 'Faction slot id is required', 'factions'));
            continue;
        }
        if (factionIds.has(faction.id)) {
            issues.push(issue('error', 'faction_duplicate', `Duplicate faction slot id "${faction.id}"`, `factions.${faction.id}`, [faction.id]));
        }
        factionIds.add(faction.id);
    }

    const starIds = new Set<string>();
    for (const star of map.stars ?? []) {
        if (!star.id?.trim()) {
            issues.push(issue('error', 'star_id_required', 'Star id is required', 'stars'));
            continue;
        }
        if (starIds.has(star.id)) {
            issues.push(issue('error', 'star_duplicate', `Duplicate star id "${star.id}"`, `stars.${star.id}`, [star.id]));
        }
        starIds.add(star.id);
        if (!isFiniteNumber(star.x) || !isFiniteNumber(star.y)) {
            issues.push(issue('error', 'star_position_invalid', `Star "${star.id}" has invalid coordinates`, `stars.${star.id}`, [star.id]));
        }
        const hasGridQ = isFiniteNumber(star.gridQ);
        const hasGridR = isFiniteNumber(star.gridR);
        if (hasGridQ !== hasGridR) {
            issues.push(issue('error', 'star_grid_coords_incomplete', `Star "${star.id}" must provide both gridQ and gridR when grid coordinates are authored`, `stars.${star.id}`, [star.id]));
        } else if (hasGridQ && hasGridR) {
            starsWithGrid.push({
                id: star.id,
                gridQ: star.gridQ!,
                gridR: star.gridR!,
            });
        }
        if (star.ownerId && star.ownerId !== AUTHORED_NEUTRAL_OWNER_ID && !factionIds.has(star.ownerId)) {
            issues.push(issue('error', 'star_owner_missing_faction', `Star "${star.id}" references missing faction slot "${star.ownerId}"`, `stars.${star.id}.ownerId`, [star.id, star.ownerId]));
        }
    }

    for (let index = 0; index < starsWithGrid.length; index += 1) {
        const left = starsWithGrid[index]!;
        for (let compareIndex = index + 1; compareIndex < starsWithGrid.length; compareIndex += 1) {
            const right = starsWithGrid[compareIndex]!;
            const tileDistance = hexTileDistance(left.gridQ, left.gridR, right.gridQ, right.gridR);
            if (tileDistance < 2) {
                issues.push(issue(
                    'error',
                    'star_spacing_too_close',
                    `Stars "${left.id}" and "${right.id}" are closer than the 2-tile minimum spacing`,
                    'stars',
                    [left.id, right.id],
                ));
            }
        }
    }

    const laneIds = new Set<string>();
    const lanePairs = new Set<string>();
    for (const lane of map.connections ?? []) {
        if (!lane.id?.trim()) {
            issues.push(issue('error', 'lane_id_required', 'Lane id is required', 'connections'));
            continue;
        }
        if (laneIds.has(lane.id)) {
            issues.push(issue('error', 'lane_duplicate', `Duplicate lane id "${lane.id}"`, `connections.${lane.id}`, [lane.id]));
        }
        laneIds.add(lane.id);

        if (!starIds.has(lane.sourceId) || !starIds.has(lane.targetId)) {
            issues.push(issue('error', 'lane_missing_star', `Lane "${lane.id}" references a missing star`, `connections.${lane.id}`, [lane.id, lane.sourceId, lane.targetId]));
        }
        if (lane.sourceId === lane.targetId) {
            issues.push(issue('error', 'lane_self_loop', `Lane "${lane.id}" cannot connect a star to itself`, `connections.${lane.id}`, [lane.id, lane.sourceId]));
        }
        const pairKey = [lane.sourceId, lane.targetId].sort().join('|');
        if (lanePairs.has(pairKey)) {
            issues.push(issue('error', 'lane_duplicate_pair', `Duplicate lane pair "${pairKey}"`, `connections.${lane.id}`, [lane.id, pairKey]));
        }
        lanePairs.add(pairKey);

        if (lane.pathMode === 'manual' && lane.laneWaypoints && lane.laneWaypoints.some(([x, y]) => !isFiniteNumber(x) || !isFiniteNumber(y))) {
            issues.push(issue('error', 'lane_waypoint_invalid', `Lane "${lane.id}" has invalid manual waypoints`, `connections.${lane.id}.laneWaypoints`, [lane.id]));
        }
    }

    if (map.stars.length > 0 && map.connections.length > 0) {
        const adjacency = new Map<string, Set<string>>();
        for (const starId of starIds) adjacency.set(starId, new Set<string>());
        for (const lane of map.connections) {
            adjacency.get(lane.sourceId)?.add(lane.targetId);
            adjacency.get(lane.targetId)?.add(lane.sourceId);
        }
        const firstStar = map.stars[0]?.id;
        if (firstStar) {
            const visited = new Set<string>([firstStar]);
            const queue = [firstStar];
            while (queue.length > 0) {
                const current = queue.shift()!;
                for (const next of adjacency.get(current) ?? []) {
                    if (visited.has(next)) continue;
                    visited.add(next);
                    queue.push(next);
                }
            }
            if (visited.size !== starIds.size) {
                const orphanIds = [...starIds].filter((starId) => !visited.has(starId));
                issues.push(issue('warning', 'topology_disconnected', `Map contains disconnected stars: ${orphanIds.join(', ')}`, 'connections', orphanIds));
            }
        }
    }

    const measurementIds = new Set<string>();
    const generatedLaneIds = new Set<string>();
    for (const measurement of map.measurements ?? []) {
        if (!measurement.id?.trim()) {
            issues.push(issue('error', 'measurement_id_required', 'Measurement id is required', 'measurements'));
            continue;
        }
        if (measurementIds.has(measurement.id)) {
            issues.push(issue('error', 'measurement_duplicate', `Duplicate measurement id "${measurement.id}"`, `measurements.${measurement.id}`, [measurement.id]));
        }
        measurementIds.add(measurement.id);

        validateAnchor(measurement.start, 'start', starIds, laneIds, issues, measurement.id);
        validateAnchor(measurement.end, 'end', starIds, laneIds, issues, measurement.id);

        if (
            measurement.mode === 'generated'
            && measurement.relatedLaneId
            && generatedLaneIds.has(measurement.relatedLaneId)
        ) {
            issues.push(issue('warning', 'measurement_generated_duplicate_lane', `Multiple generated measurements target lane "${measurement.relatedLaneId}"`, `measurements.${measurement.id}`, [measurement.id, measurement.relatedLaneId]));
        }

        if (measurement.mode === 'generated' && measurement.relatedLaneId) {
            generatedLaneIds.add(measurement.relatedLaneId);
        }
    }

    return issues;
}
