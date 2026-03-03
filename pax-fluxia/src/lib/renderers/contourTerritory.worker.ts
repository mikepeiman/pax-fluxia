// ============================================================================
// ContourTerritoryWorker — Vector territory via marching squares
// ============================================================================
// Pipeline:
//   1. Build low-res ownership grid (nearest-star Voronoi)
//   2. Apply periphery hull ownership (force edges along perimeter lanes)
//   3. For each owner, create binary mask
//   4. Extract boundary via marching squares with INTEGER edge keys
//   5. Chain edges into closed polygons → raw polygons
//   6. F-135: Detect multi-owner junction vertices, apply angle pull-back
//   7. Simplify (Douglas-Peucker)
//   8. Smooth (Chaikin) — defaults OFF per D-33
//   9. Round sharp corners (angle-aware arc insertion)
//  10. Return polygon arrays per owner
// ============================================================================

interface StarData {
    x: number;
    y: number;
    ownerIdx: number;
    id: string;
}

interface ConnectionData {
    fromId: string;
    toId: string;
}

interface WorkerInput {
    gridW: number;
    gridH: number;
    worldW: number;
    worldH: number;
    stars: StarData[];
    connections: ConnectionData[];
    numOwners: number;
    ownerRGB: number[];     // flat [r,g,b, r,g,b, ...]
    simplify: number;       // Douglas-Peucker tolerance
    smooth: number;         // Chaikin iterations
    cornerRadius: number;   // Corner rounding radius in grid cells (0=off)
    cornerThreshold: number;// Angle below which to round (degrees)
    peripheryStrength: number; // 0=off, 1=full periphery hull override
    peripheryInset: number; // px inset from lane
    junctionCorrection: number; // F-135: angle equalization strength (0=off, 1=full)
}

interface PolygonResult {
    ownerIdx: number;
    fillPoints: number[];   // flat [x,y, x,y, ...] in world coords
}

// ── Edge identification ──
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

// Marching squares edge table
type EdgeSpec = ['H' | 'V', number, number];
const TOP: EdgeSpec = ['H', 0, 0];
const RIGHT: EdgeSpec = ['V', 1, 0];
const BOTTOM: EdgeSpec = ['H', 0, 1];
const LEFT: EdgeSpec = ['V', 0, 0];

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

// ── Polygon area (shoelace formula) ──
function polygonArea(points: number[]): number {
    const n = points.length / 2;
    if (n < 3) return 0;
    let area = 0;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i * 2] * points[j * 2 + 1];
        area -= points[j * 2] * points[i * 2 + 1];
    }
    return Math.abs(area) / 2;
}

// ── Angle-aware corner rounding ──
// Scans polygon for sharp corners (angle < threshold) and replaces them with arcs
function roundCorners(points: number[], radiusWorld: number, thresholdDeg: number): number[] {
    const n = points.length / 2;
    if (n < 3 || radiusWorld <= 0) return points;

    const thresholdRad = thresholdDeg * (Math.PI / 180);
    const ARC_SEGMENTS = 6; // segments per rounded corner arc
    const minEdgeLen = radiusWorld * 2; // skip rounding if edges are too short
    const result: number[] = [];

    for (let i = 0; i < n; i++) {
        const prev = ((i - 1) + n) % n;
        const next = (i + 1) % n;

        const px = points[prev * 2], py = points[prev * 2 + 1];
        const cx = points[i * 2], cy = points[i * 2 + 1];
        const nx = points[next * 2], ny = points[next * 2 + 1];

        // Vectors from corner to prev and next
        const v1x = px - cx, v1y = py - cy;
        const v2x = nx - cx, v2y = ny - cy;
        const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
        const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

        // Skip rounding if edges are too short (prevents self-intersection)
        if (len1 < minEdgeLen || len2 < minEdgeLen) {
            result.push(cx, cy);
            continue;
        }

        // Angle between edges
        const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

        if (angle >= thresholdRad) {
            // Not sharp enough — keep original vertex
            result.push(cx, cy);
            continue;
        }

        // Clamp radius to not exceed half the edge length
        const maxR = Math.min(len1 * 0.4, len2 * 0.4, radiusWorld);

        // Points where the arc starts and ends (along each edge, offset from corner)
        const t1 = maxR / len1;
        const t2 = maxR / len2;
        const arcStartX = cx + v1x * t1, arcStartY = cy + v1y * t1;
        const arcEndX = cx + v2x * t2, arcEndY = cy + v2y * t2;

        // Insert arc points via lerp through the corner
        // Use quadratic Bezier with corner as control point
        for (let s = 0; s <= ARC_SEGMENTS; s++) {
            const t = s / ARC_SEGMENTS;
            // Quadratic Bezier: (1-t)²·start + 2(1-t)t·corner + t²·end
            const omt = 1 - t;
            const bx = omt * omt * arcStartX + 2 * omt * t * cx + t * t * arcEndX;
            const by = omt * omt * arcStartY + 2 * omt * t * cy + t * t * arcEndY;
            result.push(bx, by);
        }
    }

    return result;
}

// ── F-135: Junction Detection & Angle Pull-Back (v2) ──
// Detects junction points from the OWNERSHIP GRID (cell corners where ≥3
// distinct owners meet), then finds the nearest polygon vertex from each
// owner and moves them ALL to the corrected position.

interface RawPolygon {
    ownerIdx: number;
    points: number[];  // flat [x,y, x,y, ...] in world coords
}

/** Compute angle at vertex i of a polygon */
function vertexAngle(points: number[], idx: number): number {
    const n = points.length / 2;
    const prev = ((idx - 1) + n) % n;
    const next = (idx + 1) % n;

    const ax = points[prev * 2] - points[idx * 2];
    const ay = points[prev * 2 + 1] - points[idx * 2 + 1];
    const bx = points[next * 2] - points[idx * 2];
    const by = points[next * 2 + 1] - points[idx * 2 + 1];

    const dot = ax * bx + ay * by;
    const cross = ax * by - ay * bx;

    return Math.atan2(Math.abs(cross), dot); // 0..π
}

/**
 * F-135 v2: Grid-based junction detection + angle pull-back.
 * 
 * 1. Scan ownership grid for cell corners where ≥3 owners meet
 * 2. Convert junction grid position to world coordinates
 * 3. For each polygon, find the closest vertex within searchRadius
 * 4. Measure angles, find acutest owner
 * 5. Pull ALL nearby vertices toward the acute owner's bisector
 */
function correctJunctions(
    rawPolygons: RawPolygon[],
    grid: Int8Array,
    gridW: number,
    gridH: number,
    cellW: number,
    cellH: number,
    strength: number,
): void {
    if (strength <= 0 || rawPolygons.length < 2) return;

    // Search radius: how far from a grid junction to look for polygon vertices
    const searchRadius = Math.sqrt(cellW * cellW + cellH * cellH) * 1.5;

    // Step 1: Find junction corners on the ownership grid
    // A grid corner at (cx, cy) is bordered by cells (cx-1,cy-1), (cx,cy-1), (cx-1,cy), (cx,cy)
    interface Junction {
        wx: number;  // world x
        wy: number;  // world y
        owners: Set<number>;
    }
    const junctions: Junction[] = [];

    for (let cy = 1; cy < gridH; cy++) {
        for (let cx = 1; cx < gridW; cx++) {
            const owners = new Set<number>();
            const tl = grid[(cy - 1) * gridW + (cx - 1)];
            const tr = grid[(cy - 1) * gridW + cx];
            const bl = grid[cy * gridW + (cx - 1)];
            const br = grid[cy * gridW + cx];

            if (tl >= 0) owners.add(tl);
            if (tr >= 0) owners.add(tr);
            if (bl >= 0) owners.add(bl);
            if (br >= 0) owners.add(br);

            if (owners.size >= 3) {
                junctions.push({
                    wx: cx * cellW,
                    wy: cy * cellH,
                    owners,
                });
            }
        }
    }

    if (junctions.length === 0) return;

    // Step 2: For each junction, find nearest vertex per polygon and apply correction
    for (const junc of junctions) {
        // Find the closest vertex in each polygon within searchRadius
        interface NearbyVertex {
            polyIdx: number;
            vertIdx: number;
            ownerIdx: number;
            distSq: number;
        }
        const nearby: NearbyVertex[] = [];

        for (let pi = 0; pi < rawPolygons.length; pi++) {
            const poly = rawPolygons[pi];
            if (!junc.owners.has(poly.ownerIdx)) continue;

            const n = poly.points.length / 2;
            let bestDist = searchRadius * searchRadius;
            let bestVi = -1;

            for (let vi = 0; vi < n; vi++) {
                const dx = poly.points[vi * 2] - junc.wx;
                const dy = poly.points[vi * 2 + 1] - junc.wy;
                const dSq = dx * dx + dy * dy;
                if (dSq < bestDist) {
                    bestDist = dSq;
                    bestVi = vi;
                }
            }

            if (bestVi >= 0) {
                nearby.push({
                    polyIdx: pi,
                    vertIdx: bestVi,
                    ownerIdx: poly.ownerIdx,
                    distSq: bestDist,
                });
            }
        }

        // Need at least 3 polygons from distinct owners near this junction
        const nearbyOwners = new Set(nearby.map(n => n.ownerIdx));
        if (nearbyOwners.size < 3) continue;

        // Step 3: Measure angle at each polygon's nearest vertex, find the acutest
        let minAngle = Infinity;
        let acuteEntry: NearbyVertex | null = null;

        for (const nv of nearby) {
            const poly = rawPolygons[nv.polyIdx];
            const n = poly.points.length / 2;
            if (n < 3) continue;

            const angle = vertexAngle(poly.points, nv.vertIdx);
            if (angle < minAngle) {
                minAngle = angle;
                acuteEntry = nv;
            }
        }

        if (!acuteEntry) continue;

        // Step 4: Compute pull direction — bisector of the acute owner's incident edges
        const acutePoly = rawPolygons[acuteEntry.polyIdx];
        const acuteN = acutePoly.points.length / 2;
        const vi = acuteEntry.vertIdx;
        const prevIdx = ((vi - 1) + acuteN) % acuteN;
        const nextIdx = (vi + 1) % acuteN;

        const jx = acutePoly.points[vi * 2];
        const jy = acutePoly.points[vi * 2 + 1];

        const toPrevX = acutePoly.points[prevIdx * 2] - jx;
        const toPrevY = acutePoly.points[prevIdx * 2 + 1] - jy;
        const toNextX = acutePoly.points[nextIdx * 2] - jx;
        const toNextY = acutePoly.points[nextIdx * 2 + 1] - jy;

        const lenPrev = Math.sqrt(toPrevX * toPrevX + toPrevY * toPrevY);
        const lenNext = Math.sqrt(toNextX * toNextX + toNextY * toNextY);
        if (lenPrev < 0.001 || lenNext < 0.001) continue;

        // Bisector into the acute owner's territory
        const bisX = toPrevX / lenPrev + toNextX / lenNext;
        const bisY = toPrevY / lenPrev + toNextY / lenNext;
        const bisLen = Math.sqrt(bisX * bisX + bisY * bisY);
        if (bisLen < 0.001) continue;

        // Pull distance scaled by angle deficit and strength
        const idealAngle = (2 * Math.PI) / nearbyOwners.size;
        const deficit = Math.max(0, idealAngle - minAngle);
        const pullDistance = (deficit / idealAngle) * cellW * strength;

        if (pullDistance < 0.01) continue;

        // New junction position
        const newJx = jx + (bisX / bisLen) * pullDistance;
        const newJy = jy + (bisY / bisLen) * pullDistance;

        // Step 5: Move ALL nearby polygon vertices to the new position
        for (const nv of nearby) {
            const poly = rawPolygons[nv.polyIdx];
            poly.points[nv.vertIdx * 2] = newJx;
            poly.points[nv.vertIdx * 2 + 1] = newJy;
        }
    }
}

// ── Periphery hull ownership ──
// For connected same-owner stars at the map edge, force ownership
// of the exterior region (between their lane and the map boundary)
function applyPeripheryOwnership(
    grid: Int8Array,
    gridW: number,
    gridH: number,
    cellW: number,
    cellH: number,
    stars: StarData[],
    connections: ConnectionData[],
    strength: number,
    insetPx: number,
): void {
    if (strength <= 0 || connections.length === 0) return;

    // Build star lookup by id
    const starById = new Map<string, StarData>();
    for (const s of stars) starById.set(s.id, s);

    // Find peripheral stars (those in the outer 15% of the map)
    const worldW = gridW * cellW;
    const worldH = gridH * cellH;
    const edgeThresholdX = worldW * 0.15;
    const edgeThresholdY = worldH * 0.15;

    function isPeripheral(s: StarData): boolean {
        return s.x < edgeThresholdX || s.x > worldW - edgeThresholdX ||
            s.y < edgeThresholdY || s.y > worldH - edgeThresholdY;
    }

    // For each connection between two same-owner peripheral stars,
    // paint the exterior side of the lane
    for (const conn of connections) {
        const a = starById.get(conn.fromId);
        const b = starById.get(conn.toId);
        if (!a || !b) continue;
        if (a.ownerIdx !== b.ownerIdx || a.ownerIdx < 0) continue;

        const aPeripheral = isPeripheral(a);
        const bPeripheral = isPeripheral(b);
        if (!aPeripheral && !bPeripheral) continue;

        // Find the exterior side: the side of the lane facing the nearest map edge
        // Lane direction vector
        const ldx = b.x - a.x;
        const ldy = b.y - a.y;
        const laneLen = Math.sqrt(ldx * ldx + ldy * ldy);
        if (laneLen < 0.001) continue;

        // Lane midpoint
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;

        // Perpendicular (outward normal — towards nearest edge)
        // Two candidates: (ldy, -ldx) and (-ldy, ldx)
        const n1x = ldy / laneLen, n1y = -ldx / laneLen;

        // Pick the perpendicular that points toward the nearest map edge
        const test1x = midX + n1x * 10;
        const test1y = midY + n1y * 10;
        const test2x = midX - n1x * 10;
        const test2y = midY - n1y * 10;

        const distToEdge1 = Math.min(test1x, worldW - test1x, test1y, worldH - test1y);
        const distToEdge2 = Math.min(test2x, worldW - test2x, test2y, worldH - test2y);

        const outNx = distToEdge1 < distToEdge2 ? n1x : -n1x;
        const outNy = distToEdge1 < distToEdge2 ? n1y : -n1y;

        const ownerIdx = a.ownerIdx;

        // For each grid cell, check if it's on the exterior side of this lane
        // and closer to this lane than to the interior
        for (let gy = 0; gy < gridH; gy++) {
            const wy = (gy + 0.5) * cellH;
            for (let gx = 0; gx < gridW; gx++) {
                const wx = (gx + 0.5) * cellW;

                // Project onto lane segment
                const apx = wx - a.x, apy = wy - a.y;
                const t = Math.max(0, Math.min(1, (apx * ldx + apy * ldy) / (laneLen * laneLen)));
                const projX = a.x + t * ldx;
                const projY = a.y + t * ldy;

                // Vector from projection point to grid cell
                const toPointX = wx - projX;
                const toPointY = wy - projY;

                // Dot with outward normal — positive means exterior side
                const side = toPointX * outNx + toPointY * outNy;

                if (side > -insetPx) {
                    // This cell is on the exterior side of the lane
                    const distToLane = Math.sqrt(toPointX * toPointX + toPointY * toPointY);

                    // Only fill within a narrow band around the lane,
                    // and only if the cell is near the map edge
                    const distToMapEdge = Math.min(wx, worldW - wx, wy, worldH - wy);
                    const bandWidth = laneLen * 0.4;

                    if (distToLane < bandWidth && distToMapEdge < edgeThresholdX) {
                        if (strength >= 1.0 || Math.random() < strength) {
                            grid[gy * gridW + gx] = ownerIdx;
                        }
                    }
                }
            }
        }
    }
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
    const {
        gridW, gridH, worldW, worldH, stars, connections, numOwners, ownerRGB,
        simplify, smooth, cornerRadius, cornerThreshold,
        peripheryStrength, peripheryInset, junctionCorrection
    } = e.data;

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

    // ── Step 1b: Apply periphery hull ownership ──
    if (peripheryStrength > 0 && connections.length > 0) {
        applyPeripheryOwnership(
            grid, gridW, gridH, cellW, cellH,
            stars, connections, peripheryStrength, peripheryInset,
        );
    }

    // ── Step 2: For each owner, extract RAW boundary polygons ──
    const ownerSet = new Set<number>();
    for (let i = 0; i < grid.length; i++) {
        if (grid[i] >= 0) ownerSet.add(grid[i]);
    }

    // Pass 1: Extract raw polygons for ALL owners (no simplify/smooth/round yet)
    const rawPolygons: RawPolygon[] = [];

    for (const ownerIdx of ownerSet) {
        // Build padded binary mask
        const padW = gridW + 2;
        const padH = gridH + 2;
        const mask = new Uint8Array(padW * padH);

        for (let gy = 0; gy < gridH; gy++) {
            for (let gx = 0; gx < gridW; gx++) {
                if (grid[gy * gridW + gx] === ownerIdx) {
                    mask[(gy + 1) * padW + (gx + 1)] = 1;
                }
            }
        }

        // Marching squares on padded mask
        const edgeFrom = new Map<string, string>();
        const edgeCoords = new Map<string, [number, number]>();

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

        // ── Chain directed edges into closed polygons ──
        const used = new Set<string>();

        for (const startKey of edgeFrom.keys()) {
            if (used.has(startKey)) continue;

            const polygon: number[] = [];
            let currentKey = startKey;
            let safety = 0;

            while (safety++ < 50000) {
                if (used.has(currentKey)) break;
                used.add(currentKey);

                const coords = edgeCoords.get(currentKey);
                if (coords) polygon.push(coords[0], coords[1]);

                const nextKey = edgeFrom.get(currentKey);
                if (!nextKey) break;
                currentKey = nextKey;
            }

            if (polygon.length >= 6) {
                // Skip tiny polygon fragments (less than ~4 grid cells)
                const minArea = cellW * cellH * 4;
                if (polygonArea(polygon) < minArea) continue;

                rawPolygons.push({ ownerIdx, points: polygon });
            }
        }
    }

    // ── Step 3: F-135 Junction correction (across ALL owner polygons) ──
    if (junctionCorrection > 0) {
        correctJunctions(rawPolygons, grid, gridW, gridH, cellW, cellH, junctionCorrection);
    }

    // ── Step 4: Post-process each polygon (simplify, smooth, round) ──
    const results: PolygonResult[] = [];

    for (const raw of rawPolygons) {
        let processed = raw.points;

        // Simplify first (remove redundant marching-squares vertices)
        if (simplify > 0) {
            processed = simplifyPath(processed, simplify * cellW * 0.05);
        }
        // Smooth next (Chaikin subdivision) — D-33: defaults OFF (slider=0)
        if (smooth > 0 && processed.length >= 6) {
            processed = chaikinSmooth(processed, smooth);
        }
        // Corner rounding LAST — so arcs survive and aren't eliminated
        if (cornerRadius > 0 && processed.length >= 6) {
            const radiusWorld = cornerRadius * Math.max(cellW, cellH);
            processed = roundCorners(processed, radiusWorld, cornerThreshold);
        }
        results.push({ ownerIdx: raw.ownerIdx, fillPoints: processed });
    }

    (self as any).postMessage({ polygons: results, numOwners, ownerRGB });
};
