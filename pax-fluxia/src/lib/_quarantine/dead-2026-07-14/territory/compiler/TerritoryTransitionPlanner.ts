/**
 * territory/compiler/TerritoryTransitionPlanner.ts
 *
 * Compute structural correspondences between previous and target
 * CompiledTerritoryState for smooth morph animation.
 *
 * Phase 1: Stub implementation — returns a minimal TransitionPlan
 * with direct pairId-to-pairId correspondences where pair IDs match,
 * and empty arrays for spawned/vanished pairs.
 * Full optimal-transport correspondence will be added in Phase 2.
 *
 * Rules:
 * - Zero PIXI imports
 * - Zero rendering calls
 * - Static output — no clock state, no animation state
 */

import type {
    CompiledTerritoryStateOk,
    TransitionPlan,
    FrontierCorrespondence,
    FrontierEdge,
    CompileError,
} from './types';

/**
 * Extract control points from a frontier edge (its two endpoint world coords).
 */
function edgeControlPoints(
    edge: FrontierEdge,
    state: CompiledTerritoryStateOk,
): number[][] {
    const nodeA = state.frontierGraph.nodes.get(edge.a);
    const nodeB = state.frontierGraph.nodes.get(edge.b);
    if (!nodeA || !nodeB) return [];
    return [[nodeA.x, nodeA.y], [nodeB.x, nodeB.y]];
}

/**
 * Plan a morph transition between two compiled territory states.
 * Returns a static TransitionPlan (computed once, consumed per-frame by renderer).
 */
export function planTransition(
    prevState: CompiledTerritoryStateOk,
    nextState: CompiledTerritoryStateOk,
    startedAtMs: number,
    durationMs: number,
): TransitionPlan | CompileError {
    try {
        const correspondences: FrontierCorrespondence[] = [];

        // Build a lookup of prev edges by pairId
        const prevEdgesByPair = new Map<string, FrontierEdge[]>();
        for (const edge of prevState.frontierGraph.edges.values()) {
            const arr = prevEdgesByPair.get(edge.pairId) ?? [];
            arr.push(edge);
            prevEdgesByPair.set(edge.pairId, arr);
        }

        // Match next edges to prev edges by pairId (stub: 1:1 by pairId, first match)
        for (const nextEdge of nextState.frontierGraph.edges.values()) {
            const prevCandidates = prevEdgesByPair.get(nextEdge.pairId);
            if (!prevCandidates || prevCandidates.length === 0) {
                // New frontier (spawn) — no prev correspondence; renderer fades in
                continue;
            }

            // Stub: match by closest endpoint to minimize travel distance
            let bestPrev = prevCandidates[0];
            let bestDist = Infinity;
            const nextNA = nextState.frontierGraph.nodes.get(nextEdge.a);
            if (nextNA) {
                for (const prevEdge of prevCandidates) {
                    const prevNA = prevState.frontierGraph.nodes.get(prevEdge.a);
                    if (!prevNA) continue;
                    const d = Math.hypot(nextNA.x - prevNA.x, nextNA.y - prevNA.y);
                    if (d < bestDist) { bestDist = d; bestPrev = prevEdge; }
                }
            }

            correspondences.push({
                prevEdgeId: bestPrev.id,
                nextEdgeId: nextEdge.id,
                pairId: nextEdge.pairId,
                prevControlPoints: edgeControlPoints(bestPrev, prevState),
                nextControlPoints: edgeControlPoints(nextEdge, nextState),
            });
        }

        return {
            startedAtMs,
            durationMs,
            prevState,
            nextState,
            frontierCorrespondences: correspondences,
        };
    } catch (err) {
        return {
            kind: 'error',
            stage: 'transition',
            message: err instanceof Error ? err.message : String(err),
            recoverable: true,
        } satisfies CompileError;
    }
}
