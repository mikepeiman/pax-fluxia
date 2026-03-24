/**
 * territory/compiler/frontierStage.ts
 *
 * Stage 2: Build the singular canonical FrontierGraph from MetricState.
 *
 * For each lane (connection), uses the ANALYTICAL LANE SPLIT formula:
 *
 *   t = (d_V(v) − d_U(u) + w) / (2w)
 *
 * where d_U(u) = best-owner distance at source star,
 *       d_V(v) = best-owner distance at target star,
 *       w      = lane traversal weight.
 *
 * This completely replaces the legacy CX virtual-corridor-site approach.
 * Each owner-pair frontier edge is stored ONCE in the FrontierGraph.
 *
 * Rules:
 * - Zero PIXI imports
 * - Zero rendering calls
 * - No CX virtual sites
 * - Deterministic: same inputs → same output
 */

import type { Star, Connection } from '@pax/common';
import type {
    MetricState,
    FrontierGraph,
    FrontierNode,
    FrontierEdge,
    FrontierCompilerConfig,
    CompileError,
} from './types';

/** Result of evaluating ownership on a single lane. */
interface LaneSplitResult {
    isSplit: boolean;
    ownerIdxU: number; // winner at t=0 (source star)
    ownerIdxV: number; // winner at t=1 (target star)
    splitT: number | null; // exact parameter in (0,1) where ownership changes
}

/**
 * Canonical lane split formula (NotebookLM analytical implementation).
 *
 * Evaluates graph-distance competition along lane parameter t ∈ [0,1].
 * Guarantees lane-exclusivity: a lane is either single-owner or split once
 * between exactly two players. No third player can appear on a lane interior.
 */
function evaluateLaneOwnership(
    distU_U: number, // best-owner-at-U's distance to star U
    distV_V: number, // best-owner-at-V's distance to star V
    ownerIdxU: number,
    ownerIdxV: number,
    laneWeight: number,
): LaneSplitResult {
    // Case 1: Same owner at both endpoints — entire lane belongs to that player.
    // Shortest-path invariant: if a player owns both ends, their distance field
    // dominates the interior. No third player can cross.
    if (ownerIdxU === ownerIdxV) {
        return { isSplit: false, ownerIdxU, ownerIdxV, splitT: null };
    }

    // Case 2: Different owners. Solve D_U(t) = D_V(t):
    //   distU_U + t*w = distV_V + (1-t)*w
    //   2t*w = distV_V - distU_U + w
    //   t = (distV_V - distU_U + w) / (2w)
    const w = Math.max(1, laneWeight);
    const t = (distV_V - distU_U + w) / (2 * w);

    if (t > 0 && t < 1) {
        return { isSplit: true, ownerIdxU, ownerIdxV, splitT: t };
    }

    // Fallback: tie-point fell outside (0,1) — use midpoint for topological safety.
    // This can happen with extreme MSR offsets but must never produce a null boundary.
    return { isSplit: true, ownerIdxU, ownerIdxV, splitT: 0.5 };
}

function makePairId(a: number, b: number): string {
    return `${Math.min(a, b)}:${Math.max(a, b)}`;
}

function makeNodeId(x: number, y: number, pairId: string): string {
    const rx = Math.round(x * 10) / 10;
    const ry = Math.round(y * 10) / 10;
    return `fn:${pairId}:${rx},${ry}`;
}

/**
 * Execute the frontier stage.
 * Returns FrontierGraph on success or CompileError.
 */
export function executeFrontierStage(
    stars: Star[],
    connections: Connection[],
    metric: MetricState,
    config: FrontierCompilerConfig = { worldBounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 } },
): FrontierGraph | CompileError {
    try {
        const nodes = new Map<string, FrontierNode>();
        const edges = new Map<string, FrontierEdge>();
        const adjacency = new Map<string, string[]>();

        const starIndexById = new Map<string, number>();
        stars.forEach((s, i) => starIndexById.set(s.id, i));

        // Track owner-pair edges so each pair is stored exactly once.
        // Per a lane, pairId → nodeId chain (for linking sequential split points).
        const pairEdgeCounter = new Map<string, number>();

        for (const conn of connections) {
            const uIdx = starIndexById.get(conn.sourceId);
            const vIdx = starIndexById.get(conn.targetId);
            if (uIdx == null || vIdx == null) continue;

            const starU = stars[uIdx];
            const starV = stars[vIdx];
            const w = Math.max(1, conn.distance);

            const nodeU = metric.top2ByStar[uIdx];
            const nodeV = metric.top2ByStar[vIdx];

            // No ownership info → skip
            if (!nodeU.best || !nodeV.best) continue;

            const ownerIdxU = nodeU.best.ownerIdx;
            const ownerIdxV = nodeV.best.ownerIdx;

            // Distance from dominant owner of U to star U (graph distance)
            const distU_U = nodeU.best.distance;
            // Distance from dominant owner of V to star V
            const distV_V = nodeV.best.distance;

            const result = evaluateLaneOwnership(distU_U, distV_V, ownerIdxU, ownerIdxV, w);

            if (!result.isSplit || result.splitT == null) continue;

            // Compute world-coordinate split point
            const splitX = starU.x + (starV.x - starU.x) * result.splitT;
            const splitY = starU.y + (starV.y - starU.y) * result.splitT;

            const pairId = makePairId(ownerIdxU, ownerIdxV);
            const nodeId = makeNodeId(splitX, splitY, pairId);

            if (!nodes.has(nodeId)) {
                nodes.set(nodeId, {
                    id: nodeId,
                    x: splitX,
                    y: splitY,
                    ownerA: Math.min(ownerIdxU, ownerIdxV),
                    ownerB: Math.max(ownerIdxU, ownerIdxV),
                    pairId,
                });
                adjacency.set(nodeId, []);
            }

            // Track count for this pair to generate unique edge IDs
            const edgeCount = pairEdgeCounter.get(pairId) ?? 0;
            pairEdgeCounter.set(pairId, edgeCount + 1);

            // Lane split nodes are isolated until regionStage links them via
            // junction walking — adjacency is built in regionStage after sorting.
        }

        // Second pass: for each owner pair, sort their nodes spatially and link them
        // into edges (this produces the polyline segments the region stage will close).
        const nodesByPair = new Map<string, FrontierNode[]>();
        for (const node of nodes.values()) {
            const arr = nodesByPair.get(node.pairId) ?? [];
            arr.push(node);
            nodesByPair.set(node.pairId, arr);
        }

        for (const [pairId, pairNodes] of nodesByPair) {
            if (pairNodes.length < 2) continue;

            // Sort by angle from centroid for consistent ordering
            const cx = pairNodes.reduce((s, n) => s + n.x, 0) / pairNodes.length;
            const cy = pairNodes.reduce((s, n) => s + n.y, 0) / pairNodes.length;
            pairNodes.sort((a, b) =>
                Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
            );

            // Link consecutive nodes into edges
            const ownerA = pairNodes[0].ownerA;
            const ownerB = pairNodes[0].ownerB;
            for (let i = 0; i < pairNodes.length - 1; i++) {
                const na = pairNodes[i];
                const nb = pairNodes[i + 1];
                const edgeId = `fe:${pairId}:${i}`;
                edges.set(edgeId, {
                    id: edgeId,
                    a: na.id,
                    b: nb.id,
                    ownerA,
                    ownerB,
                    pairId,
                });
                // Update adjacency
                adjacency.get(na.id)?.push(nb.id);
                adjacency.get(nb.id)?.push(na.id);
            }
        }

        return { nodes, edges, adjacency };
    } catch (err) {
        return {
            kind: 'error',
            stage: 'frontier',
            message: err instanceof Error ? err.message : String(err),
            recoverable: false,
        } satisfies CompileError;
    }
}
