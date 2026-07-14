/**
 * Interaction lookup caches — the read models that pointer hit-testing, the
 * interaction overlay and the order queue all consult every frame:
 *
 *   - stars by id
 *   - a uniform-grid spatial index for star hit-testing
 *   - lane adjacency, and lane-key -> connection
 *
 * Rebuilt only when the underlying stars/connections array identity changes,
 * so calling ensure() per frame is cheap.
 *
 * Extracted from GameCanvas.svelte (Stage 5). Self-contained: it reads the game
 * store directly and holds no reference back into the component.
 */
import { mapTranspose } from "$lib/stores/mapTranspose.svelte";
import { GAME_CONFIG } from "$lib/config/game.config";
import type { StarState, StarConnection } from "$lib/types/game.types";

const STAR_HIT_INDEX_CELL_PX = 96;

export type InteractionCacheSource = () => {
    stars: ReadonlyArray<StarState>;
    connections: ReadonlyArray<StarConnection>;
};

export interface InteractionCaches {
    /** Rebuild from the live store if its arrays changed, then hand them back. */
    ensure: () => {
        stars: ReadonlyArray<StarState>;
        connections: ReadonlyArray<StarConnection>;
    };
    /** Rebuild from explicit arrays (the render path already holds them). */
    rebuild: (
        stars: ReadonlyArray<StarState>,
        connections: ReadonlyArray<StarConnection>,
    ) => void;
    getStarById: (starId: string) => StarState | null;
    /** Does NOT ensure() — callers in a hot path ensure once, then ask repeatedly. */
    hasStar: (starId: string) => boolean;
    getStarsById: () => ReadonlyMap<string, StarState>;
    areStarsConnected: (sourceId: string, targetId: string) => boolean;
    findConnectionByLaneKey: (laneKey: string) => StarConnection | null;
    /**
     * Stars whose hit radius covers the grid cell containing this world point.
     * A candidate set, not a hit: callers still distance-test against
     * resolveHitRadius.
     */
    getHitCandidates: (
        worldX: number,
        worldY: number,
    ) => ReadonlyArray<StarState>;
    resolveHitRadius: (star: StarState) => number;
    /** The one place that knows the lane-key format for an unordered pair. */
    getLaneKeyForPair: (a: string, b: string) => string;
    clear: () => void;
}

/**
 * @param readSource returns the live stars/connections. Injected rather than
 * imported so the caches can be exercised without a populated game store.
 */
export function createInteractionCaches(
    readSource: InteractionCacheSource,
): InteractionCaches {
    let starsSource: ReadonlyArray<StarState> | null = null;
    let connectionsSource: ReadonlyArray<StarConnection> | null = null;
    const starsById = new Map<string, StarState>();
    const connectionAdjacency = new Map<string, Set<string>>();
    const laneKeyToConnection = new Map<string, StarConnection>();
    const starHitIndex = new Map<string, StarState[]>();

    function starHitIndexKey(cellX: number, cellY: number): string {
        return `${cellX}:${cellY}`;
    }

    function resolveHitRadius(star: StarState): number {
        return GAME_CONFIG.STAR_HIT_RADIUS ?? Math.max(star.radius * 2, 40);
    }

    function getLaneKeyForPair(a: string, b: string): string {
        return a <= b ? `${a}|${b}` : `${b}|${a}`;
    }

    function rebuild(
        stars: ReadonlyArray<StarState>,
        connections: ReadonlyArray<StarConnection>,
    ): void {
        if (stars !== starsSource) {
            starsSource = stars;
            starsById.clear();
            starHitIndex.clear();
            for (const star of stars) {
                starsById.set(star.id, star);
                const hitRadius = resolveHitRadius(star);
                const minCellX = Math.floor(
                    (mapTranspose.x(star) - hitRadius) / STAR_HIT_INDEX_CELL_PX,
                );
                const maxCellX = Math.floor(
                    (mapTranspose.x(star) + hitRadius) / STAR_HIT_INDEX_CELL_PX,
                );
                const minCellY = Math.floor(
                    (mapTranspose.y(star) - hitRadius) / STAR_HIT_INDEX_CELL_PX,
                );
                const maxCellY = Math.floor(
                    (mapTranspose.y(star) + hitRadius) / STAR_HIT_INDEX_CELL_PX,
                );
                for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
                    for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
                        const key = starHitIndexKey(cellX, cellY);
                        const bucket = starHitIndex.get(key) ?? [];
                        bucket.push(star);
                        starHitIndex.set(key, bucket);
                    }
                }
            }
        }
        if (connections !== connectionsSource) {
            connectionsSource = connections;
            connectionAdjacency.clear();
            laneKeyToConnection.clear();
            for (const connection of connections) {
                const sourceNeighbors =
                    connectionAdjacency.get(connection.sourceId) ??
                    new Set<string>();
                sourceNeighbors.add(connection.targetId);
                connectionAdjacency.set(connection.sourceId, sourceNeighbors);
                const laneKey = getLaneKeyForPair(
                    connection.sourceId,
                    connection.targetId,
                );
                if (!laneKeyToConnection.has(laneKey)) {
                    laneKeyToConnection.set(laneKey, connection);
                }
            }
        }
    }

    function ensure(): {
        stars: ReadonlyArray<StarState>;
        connections: ReadonlyArray<StarConnection>;
    } {
        const { stars, connections } = readSource();
        rebuild(stars, connections);
        return { stars, connections };
    }

    return {
        ensure,
        rebuild,
        getStarById: (starId) => {
            ensure();
            return starsById.get(starId) ?? null;
        },
        hasStar: (starId) => starsById.has(starId),
        getStarsById: () => starsById,
        areStarsConnected: (sourceId, targetId) => {
            ensure();
            return Boolean(connectionAdjacency.get(sourceId)?.has(targetId));
        },
        findConnectionByLaneKey: (laneKey) => {
            ensure();
            return laneKeyToConnection.get(laneKey) ?? null;
        },
        getHitCandidates: (worldX, worldY) =>
            starHitIndex.get(
                starHitIndexKey(
                    Math.floor(worldX / STAR_HIT_INDEX_CELL_PX),
                    Math.floor(worldY / STAR_HIT_INDEX_CELL_PX),
                ),
            ) ?? [],
        resolveHitRadius,
        getLaneKeyForPair,
        clear: () => {
            starsSource = null;
            connectionsSource = null;
            starsById.clear();
            connectionAdjacency.clear();
            laneKeyToConnection.clear();
            starHitIndex.clear();
        },
    };
}
