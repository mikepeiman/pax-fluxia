import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import { GeometryLayerCoordinator } from '../layers/geometry/GeometryLayerCoordinator';
import { LayerCache } from './LayerCache';
import type {
    TerritoryWorkerGeometryRequest,
    TerritoryWorkerGeometryResponse,
} from './TerritoryWorkerProtocol';
import { buildTerritoryGeometryCacheKeyParts } from '../geometry/geometryTuning';
import { buildTerritorySpatialTopologySignature } from '../geometry/spatialTopologySignature';

interface CachedSpatialTopologySignature {
    readonly stars: TerritoryWorkerGeometryRequest['stars'];
    readonly lanes: TerritoryWorkerGeometryRequest['lanes'];
    readonly starCount: number;
    readonly laneCount: number;
    readonly boardLayoutKey: string | null;
    readonly signature: string;
}

function nowMs(): number {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
}

function buildWorkerCacheKey(
    request: TerritoryWorkerGeometryRequest,
    spatialTopologySignature: string,
): string {
    const t = request.tunables;
    return [
        request.selection.geometryMode,
        request.selection.styleMode,
        request.ownership.version,
        request.stars.length,
        request.lanes.length,
        spatialTopologySignature,
        request.world.width,
        request.world.height,
        // All geometry-affecting tunables must be in the cache key
        ...buildTerritoryGeometryCacheKeyParts(t),
    ].join('|');
}

export class TerritoryWorker {
    private readonly geometryLayer: GeometryLayerCoordinator;
    private readonly cache: LayerCache<string, GeometrySnapshot>;
    private cachedSpatialTopologySignature: CachedSpatialTopologySignature | null = null;
    private spatialTopologySignatureScanCount = 0;
    private spatialTopologySignatureScanMs = 0;
    private spatialTopologySignatureReuseCount = 0;
    private repeatedSpatialTopologySignatureScanCount = 0;
    private repeatedSpatialTopologySignatureScanMs = 0;
    private boardLayoutKeyUseCount = 0;
    private boardLayoutKeyChangeCount = 0;

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
        const spatialTopologySignature =
            this.resolveSpatialTopologySignature(request);
        const cacheKey = buildWorkerCacheKey(request, spatialTopologySignature);
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
        this.cachedSpatialTopologySignature = null;
        this.spatialTopologySignatureScanCount = 0;
        this.spatialTopologySignatureScanMs = 0;
        this.spatialTopologySignatureReuseCount = 0;
        this.repeatedSpatialTopologySignatureScanCount = 0;
        this.repeatedSpatialTopologySignatureScanMs = 0;
        this.boardLayoutKeyUseCount = 0;
        this.boardLayoutKeyChangeCount = 0;
    }

    stats() {
        const cacheStats = this.cache.stats();
        return {
            ...cacheStats,
            spatialTopologySignatureScanCount:
                this.spatialTopologySignatureScanCount,
            spatialTopologySignatureScanMs: this.spatialTopologySignatureScanMs,
            spatialTopologySignatureReuseCount:
                this.spatialTopologySignatureReuseCount,
            repeatedSpatialTopologySignatureScanCount:
                this.repeatedSpatialTopologySignatureScanCount,
            repeatedSpatialTopologySignatureScanMs:
                this.repeatedSpatialTopologySignatureScanMs,
            boardLayoutKeyUseCount: this.boardLayoutKeyUseCount,
            boardLayoutKeyChangeCount: this.boardLayoutKeyChangeCount,
            estimatedSpatialTopologySignatureScanMsSaved:
                this.spatialTopologySignatureScanCount > 0
                    ? this.spatialTopologySignatureReuseCount *
                      (this.spatialTopologySignatureScanMs /
                          this.spatialTopologySignatureScanCount)
                    : 0,
        };
    }

    private resolveSpatialTopologySignature(
        request: TerritoryWorkerGeometryRequest,
    ): string {
        const cached = this.cachedSpatialTopologySignature;
        const boardLayoutKey =
            typeof request.boardLayoutKey === 'string' &&
            request.boardLayoutKey.length > 0
                ? request.boardLayoutKey
                : null;

        if (boardLayoutKey) {
            this.boardLayoutKeyUseCount += 1;
            const signature = `board:${boardLayoutKey}`;
            if (
                cached &&
                cached.boardLayoutKey === boardLayoutKey &&
                cached.starCount === request.stars.length &&
                cached.laneCount === request.lanes.length
            ) {
                this.spatialTopologySignatureReuseCount += 1;
                return cached.signature;
            }
            if (cached && cached.boardLayoutKey !== boardLayoutKey) {
                this.boardLayoutKeyChangeCount += 1;
            }
            this.cachedSpatialTopologySignature = {
                stars: request.stars,
                lanes: request.lanes,
                starCount: request.stars.length,
                laneCount: request.lanes.length,
                boardLayoutKey,
                signature,
            };
            return signature;
        }

        if (
            cached &&
            cached.stars === request.stars &&
            cached.lanes === request.lanes &&
            cached.starCount === request.stars.length &&
            cached.laneCount === request.lanes.length
        ) {
            this.spatialTopologySignatureReuseCount += 1;
            return cached.signature;
        }

        const scanStartMs = nowMs();
        const signature = buildTerritorySpatialTopologySignature(
            request.stars,
            request.lanes,
        );
        const scanMs = nowMs() - scanStartMs;
        this.spatialTopologySignatureScanCount += 1;
        this.spatialTopologySignatureScanMs += scanMs;
        if (
            cached &&
            cached.starCount === request.stars.length &&
            cached.laneCount === request.lanes.length &&
            cached.signature === signature
        ) {
            this.repeatedSpatialTopologySignatureScanCount += 1;
            this.repeatedSpatialTopologySignatureScanMs += scanMs;
        }
        this.cachedSpatialTopologySignature = {
            stars: request.stars,
            lanes: request.lanes,
            starCount: request.stars.length,
            laneCount: request.lanes.length,
            boardLayoutKey: null,
            signature,
        };
        return signature;
    }
}
