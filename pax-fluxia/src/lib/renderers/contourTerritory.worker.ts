// ============================================================================
// ContourTerritoryWorker — Vector territory via marching squares
// ============================================================================
// Unlike pixel/lane/metaball workers that produce raster bitmaps,
// this worker produces VECTOR polygon data:
//   1. Build low-res ownership grid (nearest-star Voronoi)
//   2. Extract contour boundaries via marching squares
//   3. Simplify paths (Douglas-Peucker)
//   4. Optional Chaikin smoothing
//   5. Return polygon arrays per owner
// ============================================================================

interface StarData {
    x: number;
    y: number;
    ownerIdx: number;
}

interface WorkerInput {
    gridW: number;
    gridH: number;
    worldW: number;
    worldH: number;
    stars: StarData[];
    numOwners: number;
    ownerRGB: number[];     // flat [r,g,b, r,g,b, ...]
    simplify: number;       // Douglas-Peucker tolerance
    smooth: number;         // Chaikin iterations
}

interface PolygonResult {
    ownerIdx: number;
    fillPoints: number[];   // flat [x,y, x,y, ...] in world coords
}

// ── Marching Squares lookup table ──
// Each cell has 4 corners: TL, TR, BR, BL
// Bit-mask: TL=8, TR=4, BR=2, BL=1
// Edge midpoints: top=0, right=1, bottom=2, left=3
const MS_EDGES: number[][] = [
    [],           // 0: all outside
    [2, 3],       // 1: BL inside
    [1, 2],       // 2: BR inside
    [1, 3],       // 3: BL+BR inside
    [0, 1],       // 4: TR inside
    [0, 1, 2, 3], // 5: TR+BL (ambiguous — saddle, use simple)
    [0, 2],       // 6: TR+BR inside
    [0, 3],       // 7: TR+BR+BL inside
    [0, 3],       // 8: TL inside
    [0, 2],       // 9: TL+BL inside
    [0, 1, 2, 3], // 10: TL+BR (ambiguous — saddle)
    [0, 1],       // 11: TL+BL+BR inside
    [1, 3],       // 12: TL+TR inside
    [1, 2],       // 13: TL+TR+BL inside
    [2, 3],       // 14: TL+TR+BR inside
    [],           // 15: all inside
];

// ── Douglas-Peucker path simplification ──
function simplifyPath(points: number[], tolerance: number): number[] {
    const n = points.length / 2;
    if (n <= 2) return points;

    // Find point with max distance from line between first and last
    let maxDist = 0;
    let maxIdx = 0;
    const sx = points[0], sy = points[1];
    const ex = points[(n - 1) * 2], ey = points[(n - 1) * 2 + 1];
    const dx = ex - sx, dy = ey - sy;
    const lenSq = dx * dx + dy * dy;

    for (let i = 1; i < n - 1; i++) {
        const px = points[i * 2], py = points[i * 2 + 1];
        let dist: number;
        if (lenSq < 0.0001) {
            dist = Math.sqrt((px - sx) ** 2 + (py - sy) ** 2);
        } else {
            const t = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lenSq));
            const cx = sx + t * dx, cy = sy + t * dy;
            dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
        }
        if (dist > maxDist) {
            maxDist = dist;
            maxIdx = i;
        }
    }

    if (maxDist > tolerance) {
        const left = simplifyPath(points.slice(0, (maxIdx + 1) * 2), tolerance);
        const right = simplifyPath(points.slice(maxIdx * 2), tolerance);
        // Merge, removing duplicate middle point
        return left.slice(0, -2).concat(right);
    }

    return [sx, sy, ex, ey];
}

// ── Chaikin smoothing ──
function chaikinSmooth(points: number[], iterations: number): number[] {
    let pts = points;
    for (let iter = 0; iter < iterations; iter++) {
        const n = pts.length / 2;
        if (n < 3) break;
        const out: number[] = [];
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const x0 = pts[i * 2], y0 = pts[i * 2 + 1];
            const x1 = pts[j * 2], y1 = pts[j * 2 + 1];
            // Q point (25% along segment)
            out.push(x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25);
            // R point (75% along segment)
            out.push(x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75);
        }
        pts = out;
    }
    return pts;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
    const { gridW, gridH, worldW, worldH, stars, numOwners, ownerRGB, simplify, smooth } = e.data;

    // Scale factors: grid coords → world coords
    const cellW = worldW / gridW;
    const cellH = worldH / gridH;

    // ── Step 1: Build ownership grid (nearest-star Voronoi) ──
    const grid = new Int8Array(gridW * gridH).fill(-1);

    for (let gy = 0; gy < gridH; gy++) {
        const wy = (gy + 0.5) * cellH;
        for (let gx = 0; gx < gridW; gx++) {
            const wx = (gx + 0.5) * cellW;
            let minDist = Infinity;
            let winner = -1;
            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                const dx = wx - s.x;
                const dy = wy - s.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < minDist) {
                    minDist = distSq;
                    winner = s.ownerIdx;
                }
            }
            grid[gy * gridW + gx] = winner;
        }
    }

    // ── Step 2: Extract contour polygons per owner via marching squares ──
    // For each owner, collect boundary segments then chain into polygons.

    const ownerSegments = new Map<number, Map<string, [number, number, number, number]>>();

    for (let gy = 0; gy < gridH - 1; gy++) {
        for (let gx = 0; gx < gridW - 1; gx++) {
            const tl = grid[gy * gridW + gx];
            const tr = grid[gy * gridW + gx + 1];
            const br = grid[(gy + 1) * gridW + gx + 1];
            const bl = grid[(gy + 1) * gridW + gx];

            // For each owner present in this cell, check marching squares
            const owners = new Set<number>();
            if (tl >= 0) owners.add(tl);
            if (tr >= 0) owners.add(tr);
            if (br >= 0) owners.add(br);
            if (bl >= 0) owners.add(bl);

            for (const owner of owners) {
                // Build mask for this owner
                let mask = 0;
                if (tl === owner) mask |= 8;
                if (tr === owner) mask |= 4;
                if (br === owner) mask |= 2;
                if (bl === owner) mask |= 1;

                const edges = MS_EDGES[mask];
                if (edges.length < 2) continue;

                // Edge midpoints in world coords
                const midpoints: [number, number][] = [
                    [(gx + 0.5) * cellW, gy * cellH],          // top
                    [(gx + 1) * cellW, (gy + 0.5) * cellH],    // right
                    [(gx + 0.5) * cellW, (gy + 1) * cellH],    // bottom
                    [gx * cellW, (gy + 0.5) * cellH],          // left
                ];

                // Create segments (pairs of edge indices → line segments)
                for (let s = 0; s < edges.length; s += 2) {
                    const [x1, y1] = midpoints[edges[s]];
                    const [x2, y2] = midpoints[edges[s + 1]];

                    if (!ownerSegments.has(owner)) {
                        ownerSegments.set(owner, new Map());
                    }
                    // Key by start point for chaining
                    const key = `${x1.toFixed(1)},${y1.toFixed(1)}`;
                    ownerSegments.get(owner)!.set(key, [x1, y1, x2, y2]);
                }
            }
        }
    }

    // ── Step 3: Chain segments into polygons ──
    const results: PolygonResult[] = [];

    for (const [ownerIdx, segments] of ownerSegments) {
        const used = new Set<string>();
        const polygons: number[][] = [];

        for (const [startKey, seg] of segments) {
            if (used.has(startKey)) continue;

            const polygon: number[] = [seg[0], seg[1]];
            used.add(startKey);
            let cx = seg[2], cy = seg[3];
            polygon.push(cx, cy);

            // Follow chain
            let safety = 0;
            while (safety++ < 10000) {
                const nextKey = `${cx.toFixed(1)},${cy.toFixed(1)}`;
                const next = segments.get(nextKey);
                if (!next || used.has(nextKey)) break;

                used.add(nextKey);
                cx = next[2];
                cy = next[3];
                polygon.push(cx, cy);

                // Check if we've closed the loop
                if (Math.abs(cx - polygon[0]) < 0.5 && Math.abs(cy - polygon[1]) < 0.5) {
                    break;
                }
            }

            if (polygon.length >= 6) { // At least 3 points
                polygons.push(polygon);
            }
        }

        // For each polygon: simplify then smooth
        for (const poly of polygons) {
            let processed = poly;
            if (simplify > 0) {
                processed = simplifyPath(processed, simplify * cellW * 0.1);
            }
            if (smooth > 0 && processed.length >= 6) {
                processed = chaikinSmooth(processed, smooth);
            }
            results.push({ ownerIdx, fillPoints: processed });
        }
    }

    // Also create fill polygons for interior (non-boundary) regions.
    // For each owner, find convex hull of all their grid cells as a fallback fill.
    // The marching squares polygons above handle boundaries; we need interior fills too.
    // We'll send the boundary polygons and let the main thread use them as both fill and border.

    (self as any).postMessage({ polygons: results, numOwners, ownerRGB });
};
