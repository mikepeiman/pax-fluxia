import type { StarConnection, StarState } from '$lib/types/game.types';
import {
    buildTerritoryGeometryCacheKeyParts,
    readNormalizedTerritoryGeometryTunables,
} from '../geometry/geometryTuning';
import { normalizePerimeterFieldGeometrySource } from '../geometry/geometrySource';
import { buildTerritorySpatialTopologySignature } from '../geometry/spatialTopologySignature';

export interface RenderFamilyGeometryCacheKeyStats {
    readonly hitCount: number;
    readonly missCount: number;
    readonly lastStarCount: number;
    readonly lastLaneCount: number;
    readonly lastFingerprint: string | null;
}

export interface RenderFamilyGeometryCacheKeyBuildInput {
    readonly stars: ReadonlyArray<StarState>;
    readonly lanes: ReadonlyArray<StarConnection>;
    readonly source: Record<string, unknown>;
    readonly worldWidth: number;
    readonly worldHeight: number;
    readonly visualEpoch: number;
}

interface RenderFamilyGeometryCacheKeyEntry {
    readonly stars: ReadonlyArray<StarState>;
    readonly lanes: ReadonlyArray<StarConnection>;
    readonly starCount: number;
    readonly laneCount: number;
    readonly topologySignature: string;
    readonly ownershipSignature: string;
    readonly fingerprint: string;
    readonly key: string;
}

function buildOwnershipSignature(stars: ReadonlyArray<StarState>): string {
    let signature = '';
    for (const star of stars) {
        signature += `${star.id}:${star.ownerId ?? ''}|`;
    }
    return signature;
}

export function buildRenderFamilyGeometryFingerprint(params: {
    readonly source: Record<string, unknown>;
    readonly worldWidth: number;
    readonly worldHeight: number;
    readonly visualEpoch: number;
}): string {
    const geometryTunables = readNormalizedTerritoryGeometryTunables(
        params.source,
    );
    return [
        params.visualEpoch,
        params.worldWidth,
        params.worldHeight,
        normalizePerimeterFieldGeometrySource(
            params.source.PERIMETER_FIELD_GEOMETRY_SOURCE,
        ),
        params.source.TERRITORY_GEOMETRY_MODE ?? '',
        params.source.TERRITORY_ENGINE_METHOD ?? '',
        (params.source as { __GEOMETRY_REFRESH_TOKEN?: unknown })
            .__GEOMETRY_REFRESH_TOKEN ?? 0,
        ...buildTerritoryGeometryCacheKeyParts(geometryTunables),
    ].join(':');
}

export class RenderFamilyGeometryCacheKeyBuilder {
    private lastEntry: RenderFamilyGeometryCacheKeyEntry | null = null;
    private hitCount = 0;
    private missCount = 0;

    build(input: RenderFamilyGeometryCacheKeyBuildInput): string {
        const fingerprint = buildRenderFamilyGeometryFingerprint({
            source: input.source,
            worldWidth: input.worldWidth,
            worldHeight: input.worldHeight,
            visualEpoch: input.visualEpoch,
        });
        const topologySignature = buildTerritorySpatialTopologySignature(
            input.stars,
            input.lanes,
        );
        const ownershipSignature = buildOwnershipSignature(input.stars);
        const cached = this.lastEntry;
        if (
            cached &&
            cached.stars === input.stars &&
            cached.lanes === input.lanes &&
            cached.starCount === input.stars.length &&
            cached.laneCount === input.lanes.length &&
            cached.topologySignature === topologySignature &&
            cached.ownershipSignature === ownershipSignature &&
            cached.fingerprint === fingerprint
        ) {
            this.hitCount += 1;
            return cached.key;
        }

        let key = `${fingerprint}:topo=${topologySignature}:owners=${ownershipSignature}:`;
        for (const star of input.stars) {
            key += `${star.id}:${star.ownerId ?? ''}:${star.x}:${star.y}|`;
        }
        key += '::';
        for (const lane of input.lanes) {
            key += `${lane.sourceId}->${lane.targetId}|`;
        }

        this.missCount += 1;
        this.lastEntry = {
            stars: input.stars,
            lanes: input.lanes,
            starCount: input.stars.length,
            laneCount: input.lanes.length,
            topologySignature,
            ownershipSignature,
            fingerprint,
            key,
        };
        return key;
    }

    getStats(): RenderFamilyGeometryCacheKeyStats {
        return {
            hitCount: this.hitCount,
            missCount: this.missCount,
            lastStarCount: this.lastEntry?.starCount ?? 0,
            lastLaneCount: this.lastEntry?.laneCount ?? 0,
            lastFingerprint: this.lastEntry?.fingerprint ?? null,
        };
    }

    reset(): void {
        this.lastEntry = null;
        this.hitCount = 0;
        this.missCount = 0;
    }
}
