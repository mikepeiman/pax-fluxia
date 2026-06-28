import type { StarConnection, StarState } from '$lib/types/game.types';
import {
    buildTerritoryGeometryCacheKeyParts,
    readNormalizedTerritoryGeometryTunables,
} from '../geometry/geometryTuning';
import { normalizePerimeterFieldGeometrySource } from '../geometry/geometrySource';
import { buildTerritorySpatialTopologySignature } from '../geometry/spatialTopologySignature';

export interface RenderFamilyGeometryCacheKeyStats {
    readonly buildCount: number;
    readonly hitCount: number;
    readonly missCount: number;
    readonly lastStarCount: number;
    readonly lastLaneCount: number;
    readonly lastFingerprint: string | null;
    readonly topologySignatureScanCount: number;
    readonly topologySignatureScanMs: number;
    readonly topologySignatureReuseCount: number;
    readonly estimatedTopologySignatureScanMsSaved: number;
    readonly repeatedTopologySignatureScanCount: number;
    readonly repeatedTopologySignatureScanMs: number;
    readonly lastTopologySignatureScanMs: number;
    readonly averageTopologySignatureScanMs: number;
    readonly boardLayoutKeyUseCount: number;
}

export interface RenderFamilyGeometryCacheKeyBuildInput {
    readonly stars: ReadonlyArray<StarState>;
    readonly lanes: ReadonlyArray<StarConnection>;
    readonly boardLayoutKey?: string;
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
    readonly boardLayoutKey: string | null;
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

function nowMs(): number {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
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
    private buildCount = 0;
    private hitCount = 0;
    private missCount = 0;
    private topologySignatureScanCount = 0;
    private topologySignatureScanMs = 0;
    private topologySignatureReuseCount = 0;
    private repeatedTopologySignatureScanCount = 0;
    private repeatedTopologySignatureScanMs = 0;
    private lastTopologySignatureScanMs = 0;
    private boardLayoutKeyUseCount = 0;

    build(input: RenderFamilyGeometryCacheKeyBuildInput): string {
        this.buildCount += 1;
        const fingerprint = buildRenderFamilyGeometryFingerprint({
            source: input.source,
            worldWidth: input.worldWidth,
            worldHeight: input.worldHeight,
            visualEpoch: input.visualEpoch,
        });
        const boardLayoutKey =
            typeof input.boardLayoutKey === 'string' &&
            input.boardLayoutKey.length > 0
                ? input.boardLayoutKey
                : null;
        const cached = this.lastEntry;
        const canReuseTopologySignature =
            !boardLayoutKey &&
            cached &&
            cached.stars === input.stars &&
            cached.lanes === input.lanes &&
            cached.starCount === input.stars.length &&
            cached.laneCount === input.lanes.length;
        let topologySignature: string;
        let topologyScanMs = 0;
        if (boardLayoutKey) {
            topologySignature = `fixed-board:${boardLayoutKey}`;
            this.boardLayoutKeyUseCount += 1;
        } else if (canReuseTopologySignature) {
            topologySignature = cached.topologySignature;
            this.topologySignatureReuseCount += 1;
        } else {
            const topologyScanStartMs = nowMs();
            topologySignature = buildTerritorySpatialTopologySignature(
                input.stars,
                input.lanes,
            );
            topologyScanMs = nowMs() - topologyScanStartMs;
            this.topologySignatureScanCount += 1;
            this.topologySignatureScanMs += topologyScanMs;
            this.lastTopologySignatureScanMs = topologyScanMs;
        }
        const ownershipSignature = buildOwnershipSignature(input.stars);
        const repeatedTopologyScan =
            !boardLayoutKey &&
            cached &&
            !canReuseTopologySignature &&
            cached.starCount === input.stars.length &&
            cached.laneCount === input.lanes.length &&
            cached.topologySignature === topologySignature;
        if (repeatedTopologyScan) {
            this.repeatedTopologySignatureScanCount += 1;
            this.repeatedTopologySignatureScanMs += topologyScanMs;
        }
        const samePhysicalLayout = boardLayoutKey
            ? cached?.boardLayoutKey === boardLayoutKey
            : cached?.stars === input.stars &&
              cached?.lanes === input.lanes &&
              cached?.starCount === input.stars.length &&
              cached?.laneCount === input.lanes.length;
        if (
            cached &&
            samePhysicalLayout &&
            cached.topologySignature === topologySignature &&
            cached.ownershipSignature === ownershipSignature &&
            cached.fingerprint === fingerprint
        ) {
            this.hitCount += 1;
            return cached.key;
        }

        let key = `${fingerprint}:topo=${topologySignature}:owners=${ownershipSignature}:`;
        if (!boardLayoutKey) {
            for (const star of input.stars) {
                key += `${star.id}:${star.ownerId ?? ''}:${star.x}:${star.y}|`;
            }
            key += '::';
            for (const lane of input.lanes) {
                key += `${lane.sourceId}->${lane.targetId}|`;
            }
        }

        this.missCount += 1;
        this.lastEntry = {
            stars: input.stars,
            lanes: input.lanes,
            starCount: input.stars.length,
            laneCount: input.lanes.length,
            boardLayoutKey,
            topologySignature,
            ownershipSignature,
            fingerprint,
            key,
        };
        return key;
    }

    getStats(): RenderFamilyGeometryCacheKeyStats {
        return {
            buildCount: this.buildCount,
            hitCount: this.hitCount,
            missCount: this.missCount,
            lastStarCount: this.lastEntry?.starCount ?? 0,
            lastLaneCount: this.lastEntry?.laneCount ?? 0,
            lastFingerprint: this.lastEntry?.fingerprint ?? null,
            topologySignatureScanCount: this.topologySignatureScanCount,
            topologySignatureScanMs: this.topologySignatureScanMs,
            topologySignatureReuseCount: this.topologySignatureReuseCount,
            estimatedTopologySignatureScanMsSaved:
                this.topologySignatureScanCount > 0
                    ? this.topologySignatureReuseCount *
                      (this.topologySignatureScanMs /
                          this.topologySignatureScanCount)
                    : 0,
            repeatedTopologySignatureScanCount:
                this.repeatedTopologySignatureScanCount,
            repeatedTopologySignatureScanMs: this.repeatedTopologySignatureScanMs,
            lastTopologySignatureScanMs: this.lastTopologySignatureScanMs,
            averageTopologySignatureScanMs:
                this.topologySignatureScanCount > 0
                    ? this.topologySignatureScanMs / this.topologySignatureScanCount
                    : 0,
            boardLayoutKeyUseCount: this.boardLayoutKeyUseCount,
        };
    }

    reset(): void {
        this.lastEntry = null;
        this.buildCount = 0;
        this.hitCount = 0;
        this.missCount = 0;
        this.topologySignatureScanCount = 0;
        this.topologySignatureScanMs = 0;
        this.topologySignatureReuseCount = 0;
        this.repeatedTopologySignatureScanCount = 0;
        this.repeatedTopologySignatureScanMs = 0;
        this.lastTopologySignatureScanMs = 0;
        this.boardLayoutKeyUseCount = 0;
    }
}
