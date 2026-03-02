// ============================================================================
// ContourTerritoryWorker — Vector territory via marching squares
// ============================================================================
// Pipeline:
//   1. Build low-res ownership grid (nearest-star Voronoi)
//   2. For each owner, create binary mask
//   3. Extract boundary via marching squares with INTEGER edge keys
//   4. Chain edges into closed polygons
//   5. Simplify (Douglas-Peucker) + smooth (Chaikin)
//   6. Return polygon arrays per owner
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

// ── Edge identification ──
// Each edge in the grid is uniquely identified by integer coordinates:
//   Horizontal edge at row gy, between columns gx and gx+1:  "H:gx:gy"
//   Vertical edge at column gx, between rows gy and gy+1:    "V:gx:gy"
// Edge midpoints in world coords:
//   H:gx:gy → ((gx+0.5)*cellW, gy*cellH)
//   V:gx:gy → (gx*cellW, (gy+0.5)*cellH)

function edgeKey(type: 'H' | 'V', gx: number, gy: number): string {
    return `${type}:${gx}:${gy}`;
}

function edgeMidpoint(type: 'H' | 'V', gx: number, gy: number, cellW: number, cellH: number): [number, number] {
    if (type === 'H') {
        return [(gx + 0.5) * cellW, gy * cellH];
    } else {
        return [gx * cellW, (gy + 0.5) * cellH];
    }
}

// Marching squares edge table for binary grid
// Cell corners: TL(gx,gy) TR(gx+1,gy) BR(gx+1,gy+1) BL(gx,gy+1)
// Bits: TL=8, TR=4, BR=2, BL=1
// Edges: top=H:gx:gy, right=V:gx+1:gy, bottom=H:gx:gy+1, left=V:gx:gy
// Each case returns pairs of connected edges [from, to, from, to, ...]
type EdgeSpec = ['H' | 'V', number, number]; // [type, dx, dy] relative to cell (gx, gy)

const TOP: EdgeSpec = ['H', 0, 0];
const RIGHT: EdgeSpec = ['V', 1, 0];
const BOTTOM: EdgeSpec = ['H', 0, 1];
const LEFT: EdgeSpec = ['V', 0, 0];

// For each of the 16 cases, list edge pairs that form segments
// Each pair: [fromEdge, toEdge]
const MS_CASES: [EdgeSpec, EdgeSpec][][] = [
    [],                          // 0: all outside
    [[BOTTOM, LEFT]],            // 1: BL
    [[RIGHT, BOTTOM]],           // 2: BR
    [[RIGHT, LEFT]],             // 3: BL+BR
    [[TOP, RIGHT]],              // 4: TR
    [[TOP, LEFT], [RIGHT, BOTTOM]], // 5: TR+BL (saddle)
    [[TOP, BOTTOM]],             // 6: TR+BR
    [[TOP, LEFT]],               // 7: TL missing
    [[LEFT, TOP]],               // 8: TL
    [[BOTTOM, TOP]],             // 9: TL+BL
    [[LEFT, BOTTOM], [TOP, RIGHT]], // 10: TL+BR (saddle)
    [[RIGHT, TOP]],              // 11: BL missing
    [[LEFT, RIGHT]],             // 12: TL+TR
    [[BOTTOM, RIGHT]],           // 13: BR missing
    [[LEFT, BOTTOM]],            // 14: BL missing
    [],                          // 15: all inside
];

// ── Douglas-Peucker path simplification ──
function simplifyPath(points: number[], tolerance: number): number[] {
    const n = points.length / 2;
    if (n <= 2) return points;

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
        return left.slice(0, -2).concat(right);
    }

    return [sx, sy, ex, ey];
}

// ── Chaikin smoothing (closed polygon) ──
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
            out.push(x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25);
            out.push(x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75);
        }
        pts = out;
    }
    return pts;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
    const { gridW, gridH, worldW, worldH, stars, numOwners, ownerRGB, simplify, smooth } = e.data;

    const cellW = worldW / gridW;
    const cellH = worldH / gridH;

    // ── Step 1: Build ownership grid ──
    const grid = new Int8Array(gridW * gridH).fill(-1);

    for (let gy = 0; gy < gridH; gy++) {
        const wy = (gy + 0.5) * cellH;
        for (let gx = 0; gx < gridW; gx++) {
            const wx = (gx + 0.5) * cellW;
            let minDist = Infinity;
            let winner = -1;
            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                const ddx = wx - s.x;
                const ddy = wy - s.y;
                const distSq = ddx * ddx + ddy * ddy;
                if (distSq < minDist) {
                    minDist = distSq;
                    winner = s.ownerIdx;
                }
            }
            grid[gy * gridW + gx] = winner;
        }
    }

    // ── Step 2: For each owner, extract boundary polygons ──
    // Collect unique owner indices
    const ownerSet = new Set<number>();
    for (let i = 0; i < grid.length; i++) {
        if (grid[i] >= 0) ownerSet.add(grid[i]);
    }

    const results: PolygonResult[] = [];

    for (const ownerIdx of ownerSet) {
        // Build binary mask: 1 = this owner, 0 = not
        // Use a padded grid (1 cell border of 0s) to ensure closed contours
        const padW = gridW + 2;
        const padH = gridH + 2;
        const mask = new Uint8Array(padW * padH); // all 0 by default

        for (let gy = 0; gy < gridH; gy++) {
            for (let gx = 0; gx < gridW; gx++) {
                if (grid[gy * gridW + gx] === ownerIdx) {
                    mask[(gy + 1) * padW + (gx + 1)] = 1;
                }
            }
        }

        // Marching squares on the padded binary mask
        // Collect directed edges: from → to
        const edgeFrom = new Map<string, string>();   // fromKey → toKey
        const edgeCoords = new Map<string, [number, number]>(); // edgeKey → world coords

        for (let gy = 0; gy < padH - 1; gy++) {
            for (let gx = 0; gx < padW - 1; gx++) {
                const tl = mask[gy * padW + gx];
                const tr = mask[gy * padW + gx + 1];
                const br = mask[(gy + 1) * padW + gx + 1];
                const bl = mask[(gy + 1) * padW + gx];

                const caseIdx = (tl << 3) | (tr << 2) | (br << 1) | bl;
                const pairs = MS_CASES[caseIdx];
                if (pairs.length === 0) continue;

                for (const [fromSpec, toSpec] of pairs) {
                    const fgx = gx + fromSpec[1];
                    const fgy = gy + fromSpec[2];
                    const tgx = gx + toSpec[1];
                    const tgy = gy + toSpec[2];

                    const fKey = edgeKey(fromSpec[0], fgx, fgy);
                    const tKey = edgeKey(toSpec[0], tgx, tgy);

                    edgeFrom.set(fKey, tKey);

                    // Compute world coordinates (offset by -1 for padding)
                    if (!edgeCoords.has(fKey)) {
                        const [wx, wy] = edgeMidpoint(fromSpec[0], fgx - 1, fgy - 1, cellW, cellH);
                        edgeCoords.set(fKey, [wx, wy]);
                    }
                    if (!edgeCoords.has(tKey)) {
                        const [wx, wy] = edgeMidpoint(toSpec[0], tgx - 1, tgy - 1, cellW, cellH);
                        edgeCoords.set(tKey, [wx, wy]);
                    }
                }
            }
        }

        // ── Step 3: Chain directed edges into closed polygons ──
        const used = new Set<string>();

        for (const startKey of edgeFrom.keys()) {
            if (used.has(startKey)) continue;

            const polygon: number[] = [];
            let currentKey = startKey;
            let safety = 0;

            while (safety++ < 50000) {
                if (used.has(currentKey)) {
                    // We've looped back — closed polygon
                    break;
                }
                used.add(currentKey);

                const coords = edgeCoords.get(currentKey);
                if (coords) {
                    polygon.push(coords[0], coords[1]);
                }

                const nextKey = edgeFrom.get(currentKey);
                if (!nextKey) break;
                currentKey = nextKey;
            }

            if (polygon.length >= 6) { // At least 3 points
                let processed = polygon;
                if (simplify > 0) {
                    processed = simplifyPath(processed, simplify * cellW * 0.05);
                }
                if (smooth > 0 && processed.length >= 6) {
                    processed = chaikinSmooth(processed, smooth);
                }
                results.push({ ownerIdx, fillPoints: processed });
            }
        }
    }

    (self as any).postMessage({ polygons: results, numOwners, ownerRGB });
};
