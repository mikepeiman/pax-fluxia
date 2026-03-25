// ── Merge Utilities: same-owner cell merging ──
//
// Extracted from PVV3Renderer.ts — pure geometry function, no renderer state.

import type { TerritoryCell, MergedTerritory } from './types';
import { edgeKey, ptKey } from './polyUtils';

export function mergeSameOwnerCells(
    cells: TerritoryCell[],
    clusterSplit: boolean,
    clusterMap: Map<string, number>,
): MergedTerritory[] {
    // Build cluster key per cell
    const clusterKeyOf = (cell: TerritoryCell) => {
        const cIdx = clusterMap.get(cell.siteId) ?? 0;
        return clusterSplit ? `${cell.ownerId}:${cIdx}` : cell.ownerId;
    };

    // Step 1: Count edges, track which cluster(s) share each edge
    const edgeCount = new Map<string, number>();
    const edgeClusters = new Map<string, Set<string>>();

    for (const cell of cells) {
        const ck = clusterKeyOf(cell);
        const pts = cell.points;
        for (let j = 0; j < pts.length - 1; j++) {
            const key = edgeKey(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
            edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
            if (!edgeClusters.has(key)) edgeClusters.set(key, new Set());
            edgeClusters.get(key)!.add(ck);
        }
    }

    // Step 2: Collect external edges per cluster
    type DEdge = { x1: number; y1: number; x2: number; y2: number };
    const clusterEdges = new Map<string, DEdge[]>();
    const clusterColor = new Map<string, number>();

    for (const cell of cells) {
        const ck = clusterKeyOf(cell);
        if (!clusterEdges.has(ck)) clusterEdges.set(ck, []);
        if (!clusterColor.has(ck)) clusterColor.set(ck, 0);

        const pts = cell.points;
        for (let j = 0; j < pts.length - 1; j++) {
            const key = edgeKey(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
            const count = edgeCount.get(key) ?? 0;
            const clusters = edgeClusters.get(key)!;
            // Internal: shared by 2+ cells of the SAME cluster → skip
            if (count >= 2 && clusters.size === 1) continue;
            clusterEdges.get(ck)!.push({
                x1: pts[j][0], y1: pts[j][1],
                x2: pts[j + 1][0], y2: pts[j + 1][1],
            });
        }
    }

    // Step 3: Chain edges into closed polygons
    const result: MergedTerritory[] = [];

    for (const [ck, edges] of clusterEdges) {
        if (edges.length === 0) continue;
        const ownerId = ck.split(':')[0];

        // Bidirectional adjacency
        type IEdge = { x1: number; y1: number; x2: number; y2: number; idx: number };
        const allEdges: IEdge[] = [];
        for (let i = 0; i < edges.length; i++) {
            const e = edges[i];
            allEdges.push({ ...e, idx: i });
            allEdges.push({ x1: e.x2, y1: e.y2, x2: e.x1, y2: e.y1, idx: i });
        }

        const adj = new Map<string, IEdge[]>();
        for (const ie of allEdges) {
            const k = ptKey(ie.x1, ie.y1);
            if (!adj.has(k)) adj.set(k, []);
            adj.get(k)!.push(ie);
        }

        const used = new Set<number>();
        for (let start = 0; start < edges.length; start++) {
            if (used.has(start)) continue;
            const chain: number[][] = [];
            const e0 = edges[start];
            used.add(start);
            chain.push([e0.x1, e0.y1]);
            chain.push([e0.x2, e0.y2]);

            const startPt = ptKey(e0.x1, e0.y1);
            let curEnd = ptKey(e0.x2, e0.y2);
            let safety = edges.length * 2;

            while (curEnd !== startPt && safety-- > 0) {
                const cands = adj.get(curEnd);
                if (!cands) break;
                let found = false;
                for (const c of cands) {
                    if (used.has(c.idx)) continue;
                    used.add(c.idx);
                    curEnd = ptKey(c.x2, c.y2);
                    chain.push([c.x2, c.y2]);
                    found = true;
                    break;
                }
                if (!found) break;
            }

            if (chain.length >= 3) {
                // Ensure closed
                if (chain[0][0] !== chain[chain.length - 1][0] ||
                    chain[0][1] !== chain[chain.length - 1][1]) {
                    chain.push([chain[0][0], chain[0][1]]);
                }
                result.push({ points: chain as [number, number][], ownerId, color: 0 });
            }
        }
    }

    return result;
}
