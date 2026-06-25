import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import { GeometryLayerCoordinator } from '../layers/geometry/GeometryLayerCoordinator';
import { LayerCache } from './LayerCache';
import type {
    TerritoryWorkerGeometryRequest,
    TerritoryWorkerGeometryResponse,
} from './TerritoryWorkerProtocol';
import { buildTerritoryGeometryCacheKeyParts } from '../geometry/geometryTuning';

function buildWorkerCacheKey(request: TerritoryWorkerGeometryRequest): string {
    const t = request.tunables;
    return [
        request.selection.geometryMode,
        request.selection.styleMode,
        request.ownership.version,
        request.stars.length,
        request.lanes.length,
        buildSpatialTopologySignature(request),
        request.world.width,
        request.world.height,
        // All geometry-affecting tunables must be in the cache key
        ...buildTerritoryGeometryCacheKeyParts(t),
    ].join('|');
}

function hashString(hash: number, value: string): number {
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    hash ^= 0x1f;
    return Math.imul(hash, 16777619);
}

function hashNumber(hash: number, value: number): number {
    return hashString(
        hash,
        Number.isFinite(value) ? value.toFixed(3) : String(value),
    );
}

function buildSpatialTopologySignature(
    request: TerritoryWorkerGeometryRequest,
): string {
    let hash = 2166136261;
    for (const star of request.stars) {
        hash = hashString(hash, star.id);
        hash = hashNumber(hash, star.x);
        hash = hashNumber(hash, star.y);
        hash = hashNumber(hash, star.radius);
    }
    hash ^= 0x7c;
    hash = Math.imul(hash, 16777619);
    for (const lane of request.lanes) {
        hash = hashString(hash, lane.sourceId);
        hash = hashString(hash, lane.targetId);
        hash = hashNumber(hash, lane.distance);
        hash = hashString(hash, lane.lanePathKind ?? '');
        hash = hashString(hash, lane.laneConstraintStatus ?? '');
        const waypoints = lane.laneWaypoints ?? [];
        hash = hashNumber(hash, waypoints.length);
        for (const [x, y] of waypoints) {
            hash = hashNumber(hash, x);
            hash = hashNumber(hash, y);
        }
    }
    return (hash >>> 0).toString(36);
}

export class TerritoryWorker {
    private readonly geometryLayer: GeometryLayerCoordinator;
    private readonly cache: LayerCache<string, GeometrySnapshot>;

    constructor(
        geometryLayer = new GeometryLayerCoordinator(),
        cache = new LayerCache<string, GeometrySnapshot>(),
    ) {
        this.geometryLayer = geometryLayer;
        this.cache = cache;
    }

    computeGeometrySync(
        request: TerritoryWorkerGeometryRequest,
    ): TerritoryWorkerGeometryResponse {
        const cacheKey = buildWorkerCacheKey(request);
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return {
                requestId: request.requestId,
                geometry: cached,
                fromCache: true,
            };
        }

        const geometry = this.geometryLayer.compute({
            nowMs: request.nowMs,
            stars: request.stars,
            lanes: request.lanes,
            world: request.world,
            tunables: request.tunables,
            ownership: request.ownership,
            selection: request.selection,
            previousSnapshot: request.previousGeometry,
        });

        this.cache.set(cacheKey, geometry);

        return {
            requestId: request.requestId,
            geometry,
            fromCache: false,
        };
    }

    async computeGeometry(
        request: TerritoryWorkerGeometryRequest,
    ): Promise<TerritoryWorkerGeometryResponse> {
        return Promise.resolve(this.computeGeometrySync(request));
    }

    clearCache(): void {
        this.cache.clear();
    }

    stats() {
        return this.cache.stats();
    }
}
