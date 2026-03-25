/**
 * territory/compiler/metricStage.ts
 *
 * Stage 1: Graph-native ownership metric.
 *
 * Implements multi-source top-2 Dijkstra on the star–lane graph.
 * MSR (Minimum Star Radius) is applied as a negative seed offset:
 * owned stars seed at distance -msrRadius, pushing tie-points outward.
 *
 * Rules:
 * - Zero PIXI imports
 * - Zero rendering calls
 * - Deterministic: same inputs → same output
 * - Returns MetricState | CompileError (never throws, never fallback geometry)
 */

import type { Star, Connection } from '@pax/common';
import type { MetricState, MetricTruthNode, NodeDistance, MetricCompilerConfig, CompileError } from './types';

/** Simple min-heap priority queue for Dijkstra. */
class MinHeap {
    private heap: { starIdx: number; ownerIdx: number; dist: number }[] = [];

    push(item: { starIdx: number; ownerIdx: number; dist: number }): void {
        this.heap.push(item);
        this._bubbleUp(this.heap.length - 1);
    }

    pop(): { starIdx: number; ownerIdx: number; dist: number } | undefined {
        if (this.heap.length === 0) return undefined;
        const top = this.heap[0];
        const last = this.heap.pop()!;
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this._siftDown(0);
        }
        return top;
    }

    get size(): number { return this.heap.length; }

    private _bubbleUp(i: number): void {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.heap[parent].dist <= this.heap[i].dist) break;
            [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
            i = parent;
        }
    }

    private _siftDown(i: number): void {
        const n = this.heap.length;
        while (true) {
            let smallest = i;
            const l = 2 * i + 1;
            const r = 2 * i + 2;
            if (l < n && this.heap[l].dist < this.heap[smallest].dist) smallest = l;
            if (r < n && this.heap[r].dist < this.heap[smallest].dist) smallest = r;
            if (smallest === i) break;
            [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
            i = smallest;
        }
    }
}

/**
 * Execute the metric stage: multi-source top-2 Dijkstra.
 * Returns MetricState on success or CompileError on fatal failure.
 */
export function executeMetricStage(
    stars: Star[],
    connections: Connection[],
    playerIds: string[],
    config: MetricCompilerConfig = {}
): MetricState | CompileError {
    try {
        const n = stars.length;
        const msrOffset = -(config.minStarRadius ?? 0); // negative = push tie-points outward

        // Map star IDs to indices for O(1) lookup
        const starIndexById = new Map<string, number>();
        stars.forEach((s, i) => starIndexById.set(s.id, i));

        const playerIndexById = new Map<string, number>();
        playerIds.forEach((pid, i) => playerIndexById.set(pid, i));

        // Build adjacency list: starIdx → [{neighborIdx, weight}]
        const adjacency: { neighborIdx: number; weight: number }[][] = Array.from({ length: n }, () => []);
        for (const conn of connections) {
            const uIdx = starIndexById.get(conn.sourceId);
            const vIdx = starIndexById.get(conn.targetId);
            if (uIdx == null || vIdx == null) continue;
            const weight = Math.max(1, conn.distance); // minimum weight = 1
            adjacency[uIdx].push({ neighborIdx: vIdx, weight });
            adjacency[vIdx].push({ neighborIdx: uIdx, weight });
        }

        // top2ByStar[starIdx] = { best: NodeDistance|null, second: NodeDistance|null }
        const top2ByStar: MetricTruthNode[] = Array.from({ length: n }, () => ({ best: null, second: null }));

        // dist[ownerIdx][starIdx] = shortest graph distance from ownerIdx's sources to starIdx
        const dist: number[][] = playerIds.map(() => new Array(n).fill(Infinity));

        const pq = new MinHeap();

        // Seed all owned stars for each player
        for (let starIdx = 0; starIdx < n; starIdx++) {
            const star = stars[starIdx];
            const ownerIdx = playerIndexById.get(star.ownerId ?? '');
            if (ownerIdx == null) continue; // unowned star — no seed
            const seedDist = msrOffset; // negative offset for MSR
            dist[ownerIdx][starIdx] = seedDist;
            pq.push({ starIdx, ownerIdx, dist: seedDist });
        }

        // Multi-source top-2 Dijkstra
        while (pq.size > 0) {
            const { starIdx, ownerIdx, dist: d } = pq.pop()!;

            // Stale entry check
            if (d > dist[ownerIdx][starIdx]) continue;

            // Update top-2 at this node
            const node = top2ByStar[starIdx];
            const nd: NodeDistance = { ownerIdx, distance: d };
            if (node.best === null || d < node.best.distance) {
                if (node.best !== null && node.best.ownerIdx !== ownerIdx) {
                    node.second = node.best;
                }
                node.best = nd;
            } else if (node.best.ownerIdx !== ownerIdx) {
                if (node.second === null || d < node.second.distance) {
                    node.second = nd;
                }
            }

            // Relax neighbors
            for (const { neighborIdx, weight } of adjacency[starIdx]) {
                const newDist = d + weight;
                if (newDist < dist[ownerIdx][neighborIdx]) {
                    dist[ownerIdx][neighborIdx] = newDist;
                    pq.push({ starIdx: neighborIdx, ownerIdx, dist: newDist });
                }
            }
        }

        return {
            top2ByStar,
            playerIds,
            starCount: n,
        };
    } catch (err) {
        return {
            kind: 'error',
            stage: 'metric',
            message: err instanceof Error ? err.message : String(err),
            recoverable: false,
        } satisfies CompileError;
    }
}
