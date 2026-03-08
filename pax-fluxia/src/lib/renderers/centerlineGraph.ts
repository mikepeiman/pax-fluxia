/**
 * centerlineGraph.ts
 *
 * Deterministic extraction of owner-pair centerline graphs from an ownership lattice.
 *
 * This module is intentionally renderer-agnostic so different border families
 * (straight / curved / segmented) can reuse the same canonical centerline graph.
 */

export interface CenterlineNode {
    id: string;
    x: number;
    y: number;
}

export interface CenterlineGraphPair {
    /** Stable owner-pair key in ascending owner index order. */
    pairId: string;
    ownerA: number;
    ownerB: number;
    /** Node id -> node payload. */
    nodes: Map<string, CenterlineNode>;
    /** Node id -> sorted neighboring node ids. */
    adjacency: Map<string, string[]>;
}

interface PairEdgeSample {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

function makePairId(ownerA: number, ownerB: number): string {
    return `pair:${ownerA}:${ownerB}`;
}

function makeNodeId(pairId: string, x: number, y: number): string {
    return `node:${pairId}:${x}:${y}`;
}

function compareNodesByGridPosition(a: CenterlineNode, b: CenterlineNode): number {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
}

/**
 * Convert an ownership grid into owner-pair centerline graphs.
 *
 * Determinism guarantees:
 * - owner-pairs are emitted in stable ascending `(ownerA, ownerB)` order
 * - node ids are stable (`node:pair:a:b:x:y`)
 * - adjacency neighbor lists are sorted by grid position
 */
export function buildCenterlineGraphsFromOwnerGrid(
    ownerGrid: Int16Array,
    gridW: number,
    gridH: number,
): CenterlineGraphPair[] {
    const pairEdges = new Map<string, PairEdgeSample[]>();

    const addPairEdge = (
        ownerA: number,
        ownerB: number,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
    ): void => {
        if (ownerA < 0 || ownerB < 0 || ownerA === ownerB) return;
        const a = Math.min(ownerA, ownerB);
        const b = Math.max(ownerA, ownerB);
        const pairId = makePairId(a, b);

        let edges = pairEdges.get(pairId);
        if (!edges) {
            edges = [];
            pairEdges.set(pairId, edges);
        }

        edges.push({ x1, y1, x2, y2 });
    };

    // Emit lattice edges where ownership changes between adjacent cells.
    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            const owner = ownerGrid[y * gridW + x];
            if (owner < 0) continue;

            if (x + 1 < gridW) {
                const rightOwner = ownerGrid[y * gridW + x + 1];
                if (rightOwner >= 0 && rightOwner !== owner) {
                    addPairEdge(owner, rightOwner, x + 1, y, x + 1, y + 1);
                }
            }

            if (y + 1 < gridH) {
                const downOwner = ownerGrid[(y + 1) * gridW + x];
                if (downOwner >= 0 && downOwner !== owner) {
                    addPairEdge(owner, downOwner, x, y + 1, x + 1, y + 1);
                }
            }
        }
    }

    const out: CenterlineGraphPair[] = [];
    const sortedPairIds = [...pairEdges.keys()].sort((a, b) => a.localeCompare(b));

    for (const pairId of sortedPairIds) {
        const edges = pairEdges.get(pairId);
        if (!edges || edges.length === 0) continue;

        const parts = pairId.split(':');
        const ownerA = Number(parts[1]);
        const ownerB = Number(parts[2]);

        const nodesByCoord = new Map<string, CenterlineNode>();
        const nodesById = new Map<string, CenterlineNode>();
        const adjacencySets = new Map<string, Set<string>>();

        const ensureNode = (x: number, y: number): CenterlineNode => {
            const coordKey = `${x},${y}`;
            const existing = nodesByCoord.get(coordKey);
            if (existing) return existing;

            const node: CenterlineNode = {
                id: makeNodeId(pairId, x, y),
                x,
                y,
            };

            nodesByCoord.set(coordKey, node);
            nodesById.set(node.id, node);
            return node;
        };

        const addAdjacency = (fromNodeId: string, toNodeId: string): void => {
            let neighbors = adjacencySets.get(fromNodeId);
            if (!neighbors) {
                neighbors = new Set<string>();
                adjacencySets.set(fromNodeId, neighbors);
            }
            neighbors.add(toNodeId);
        };

        for (const edge of edges) {
            const nodeA = ensureNode(edge.x1, edge.y1);
            const nodeB = ensureNode(edge.x2, edge.y2);
            addAdjacency(nodeA.id, nodeB.id);
            addAdjacency(nodeB.id, nodeA.id);
        }

        const adjacency = new Map<string, string[]>();
        for (const [nodeId, neighbors] of adjacencySets.entries()) {
            const sortedNeighbors = [...neighbors].sort((a, b) => {
                const na = nodesById.get(a);
                const nb = nodesById.get(b);
                if (!na || !nb) return a.localeCompare(b);
                return compareNodesByGridPosition(na, nb);
            });
            adjacency.set(nodeId, sortedNeighbors);
        }

        out.push({
            pairId,
            ownerA,
            ownerB,
            nodes: nodesById,
            adjacency,
        });
    }

    return out;
}
