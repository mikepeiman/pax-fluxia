import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import { GeometryLayerCoordinator } from '../layers/geometry/GeometryLayerCoordinator';
import { LayerCache } from './LayerCache';
import type {
    TerritoryWorkerGeometryRequest,
    TerritoryWorkerGeometryResponse,
} from './TerritoryWorkerProtocol';

function buildWorkerCacheKey(request: TerritoryWorkerGeometryRequest): string {
    const t = request.tunables;
    return [
        request.selection.geometryMode,
        request.selection.styleMode,
        request.ownership.version,
        request.stars.length,
        request.lanes.length,
        request.world.width,
        request.world.height,
        // All geometry-affecting tunables must be in the cache key
        t.geometrySmoothingPasses,
        t.frontierResolution,
        t.starMargin,
        t.corridorEnabled,
        t.corridorSpacing,
        t.corridorCount,
        t.corridorWeight,
        t.disconnectEnabled,
        t.disconnectDistance,
        t.disconnectWeight,
        t.clusterSplitThreshold,
        t.boundaryPad,
        t.boundaryEps,
    ].join('|');
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
