import type { MapDiagnosticMeasurement } from '../types';
import {
    type AuthoredLane,
    type AuthoredMapDefinition,
    type AuthoredMeasurement,
} from './types';

function laneLabel(map: AuthoredMapDefinition, lane: AuthoredLane): string {
    const source = map.stars.find((star) => star.id === lane.sourceId);
    const target = map.stars.find((star) => star.id === lane.targetId);
    return `${source?.id ?? lane.sourceId} ↔ ${target?.id ?? lane.targetId}`;
}

export function buildLaneMeasurementId(laneId: string): string {
    return `measurement-${laneId}`;
}

export function generateLaneMeasurements(
    map: AuthoredMapDefinition,
    laneIds?: readonly string[],
): AuthoredMeasurement[] {
    const allowedLaneIds = laneIds ? new Set(laneIds) : null;
    const measurements: AuthoredMeasurement[] = [];

    for (const lane of map.connections) {
        if (allowedLaneIds && !allowedLaneIds.has(lane.id)) {
            continue;
        }

        const source = map.stars.find((star) => star.id === lane.sourceId);
        const target = map.stars.find((star) => star.id === lane.targetId);
        if (!source || !target) {
            continue;
        }

        const label = laneLabel(map, lane);
        measurements.push({
            id: buildLaneMeasurementId(lane.id),
            mode: 'generated',
            preset: 'lane_length',
            relatedLaneId: lane.id,
            relatedLaneLabel: label,
            starPairLabel: label,
            label,
            visibleByDefault: true,
            start: {
                x: source.x,
                y: source.y,
                snapKind: 'star',
                starId: source.id,
            },
            end: {
                x: target.x,
                y: target.y,
                snapKind: 'star',
                starId: target.id,
            },
        });
    }

    return measurements;
}

export function resolveMeasurementSegment(
    measurement: AuthoredMeasurement,
    starsById: Map<string, { x: number; y: number }>,
): MapDiagnosticMeasurement {
    const startSource = measurement.start.starId
        ? starsById.get(measurement.start.starId)
        : undefined;
    const endSource = measurement.end.starId
        ? starsById.get(measurement.end.starId)
        : undefined;
    const startX = startSource?.x ?? measurement.start.x;
    const startY = startSource?.y ?? measurement.start.y;
    const endX = endSource?.x ?? measurement.end.x;
    const endY = endSource?.y ?? measurement.end.y;
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.hypot(dx, dy);

    return {
        id: measurement.id,
        mode: measurement.mode,
        preset: measurement.preset,
        label: measurement.label ?? measurement.relatedLaneLabel ?? measurement.starPairLabel,
        startX,
        startY,
        endX,
        endY,
        dx,
        dy,
        distance,
        midX: startX + dx * 0.5,
        midY: startY + dy * 0.5,
        visibleByDefault: measurement.visibleByDefault ?? true,
        relatedLaneId: measurement.relatedLaneId,
        relatedLaneLabel: measurement.relatedLaneLabel,
        starPairLabel: measurement.starPairLabel,
    };
}
