// ============================================================================
// PixelTerritoryWorker — Off-thread pixel territory computation
// ============================================================================
// Receives star positions, config, and canvas dimensions.
// Computes the full pixel array (hierarchical adaptive resolution) and posts
// back a Uint8ClampedArray + ownerGrid as Transferable (zero-copy).
// ============================================================================

const SQRT3 = Math.sqrt(3);
function hexDistToEdge(px: number, py: number, size: number): number {
    const q = (2.0 / 3.0 * px) / size;
    const r = (-1.0 / 3.0 * px + SQRT3 / 3.0 * py) / size;
    const s = -q - r;
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    const cx = size * (3.0 / 2.0 * rq);
    const cy = size * (SQRT3 / 2.0 * rq + SQRT3 * rr);
    const ddx = Math.abs(px - cx), ddy = Math.abs(py - cy);
    const halfH = SQRT3 / 2.0 * size;
    const dRight = size - ddx;
    const dHoriz = halfH - ddy;
    const dDiag = (SQRT3 * size - ddy - SQRT3 * ddx) / 2.0;
    return Math.max(0, Math.min(dRight, dHoriz, dDiag));
}

interface StarData {
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    ownerIdx: number;
    ships: number;     // activeShips + damagedShips for pressure
    angles: number[];  // connection angles in radians for lane constraint
}

interface CorridorSeg {
    x1: number; y1: number;
    x2: number; y2: number;
    ownerIdx: number;
    halfW: number; // capsule half-width in canvas pixels
}

interface WorkerInput {
    canvasW: number;
    canvasH: number;
    stars: StarData[];
    numOwners: number;
    ownerRGB: number[]; // flat array: [r0,g0,b0, r1,g1,b1, ...]
    alpha: number;
    edgeBlend: number;
    corridorBoost: number;
    corridorSegs: CorridorSeg[];
    laneConstrain: number;  // 0=off, 1=strict — penalty for off-lane directions
    pressure: number;        // 0=off, 1=full — ship-count boundary shifting
    borderWidth: number;
    borderAlpha: number;
    borderBrighten: number;
    pattern: string;
    patternScale: number;
    patternRotation: number;
    boardLeft: number;
    boardTop: number;
    boardRight: number;
    boardBottom: number;
    fadeDistCanvas: number;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
    const d = e.data;
    const {
        canvasW, canvasH, stars, numOwners, ownerRGB,
        alpha, edgeBlend, corridorBoost, corridorSegs,
        laneConstrain, pressure,
        borderWidth, borderAlpha, borderBrighten,
        pattern, patternScale, patternRotation,
        boardLeft, boardTop, boardRight, boardBottom, fadeDistCanvas,
    } = d;

    // ── Point-to-line-segment squared distance ──
    function segDistSq(px: number, py: number, seg: CorridorSeg): number {
        const dx = seg.x2 - seg.x1;
        const dy = seg.y2 - seg.y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 1) return (px - seg.x1) ** 2 + (py - seg.y1) ** 2;
        let t = ((px - seg.x1) * dx + (py - seg.y1) * dy) / lenSq;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const cx = seg.x1 + t * dx;
        const cy = seg.y1 + t * dy;
        return (px - cx) ** 2 + (py - cy) ** 2;
    }

    // ── Corridor capsule ownership check ──
    // Returns ownerIdx if point is inside any corridor capsule, -1 otherwise
    function corridorOwner(px: number, py: number): number {
        for (let i = 0; i < corridorSegs.length; i++) {
            const seg = corridorSegs[i];
            if (segDistSq(px, py, seg) <= seg.halfW * seg.halfW) {
                return seg.ownerIdx;
            }
        }
        return -1;
    }

    // ── Effective distance with lane constraint + pressure ──
    // Returns a modified distSq that penalizes off-lane directions
    // and discounts distance for high-ship-count stars.
    function effectiveDistSq(px: number, py: number, starIdx: number): number {
        const s = stars[starIdx];
        const dx = px - s.x;
        const dy = py - s.y;
        let distSq = dx * dx + dy * dy;

        // Pressure: scale distance inversely with ship count
        // More ships → smaller effective distance → larger territory
        if (pressure > 0 && s.ships > 0) {
            // Ships factor: log scale to prevent extreme values
            // A star with 100 ships gets ~2x distance reduction at pressure=1
            const shipFactor = 1 + Math.log2(1 + s.ships) * 0.15 * pressure;
            distSq /= (shipFactor * shipFactor);
        }

        // Lane constraint: penalize pixels NOT in direction of connections
        if (laneConstrain > 0 && s.angles.length > 0 && distSq > 1) {
            const pixelAngle = Math.atan2(dy, dx);

            // Find minimum angular distance to any connection direction
            let minAngleDiff = Math.PI; // worst case: opposite direction
            for (let a = 0; a < s.angles.length; a++) {
                let diff = Math.abs(pixelAngle - s.angles[a]);
                if (diff > Math.PI) diff = 2 * Math.PI - diff;
                if (diff < minAngleDiff) minAngleDiff = diff;
            }

            // Angular penalty: pixels far from any connection get inflated distance
            // At minAngleDiff=0 (on a connection): penalty=1 (no change)
            // At minAngleDiff=PI (opposite all connections): penalty up to 4x at laneConstrain=1
            const angleRatio = minAngleDiff / Math.PI; // 0-1
            const penalty = 1 + angleRatio * angleRatio * 3.0 * laneConstrain;
            distSq *= penalty;
        }

        return distSq;
    }

    const numStars = stars.length;
    const pixels = new Uint8ClampedArray(canvasW * canvasH * 4);

    // Build owner → star indices
    const starsByOwner: number[][] = [];
    for (let oi = 0; oi < numOwners; oi++) starsByOwner.push([]);
    for (let i = 0; i < numStars; i++) {
        starsByOwner[stars[i].ownerIdx].push(i);
    }

    // Pre-compute per-owner pattern rotation
    const ownerCos = new Float64Array(numOwners);
    const ownerSin = new Float64Array(numOwners);
    for (let oi = 0; oi < numOwners; oi++) {
        const angle = (oi * 137.508 * patternRotation * Math.PI) / 180;
        ownerCos[oi] = Math.cos(angle);
        ownerSin[oi] = Math.sin(angle);
    }

    // ── Hierarchical adaptive resolution ──
    const TILE_SIZE = 8;
    const tilesW = Math.ceil(canvasW / TILE_SIZE);
    const tilesH = Math.ceil(canvasH / TILE_SIZE);

    // Pass 1: Coarse ownership
    const tileOwner = new Uint8Array(tilesW * tilesH);
    const tileR = new Uint8Array(tilesW * tilesH);
    const tileG = new Uint8Array(tilesW * tilesH);
    const tileB = new Uint8Array(tilesW * tilesH);

    for (let ty = 0; ty < tilesH; ty++) {
        const centerY = (ty + 0.5) * TILE_SIZE;
        for (let tx = 0; tx < tilesW; tx++) {
            const centerX = (tx + 0.5) * TILE_SIZE;
            const tIdx = ty * tilesW + tx;
            let winnerOi = 0;

            // Check capsule corridors first (guaranteed connectivity)
            const cOwner = corridorSegs.length > 0 ? corridorOwner(centerX, centerY) : -1;
            if (cOwner >= 0) {
                winnerOi = cOwner;
            } else if (corridorBoost > 0 && numOwners > 1) {
                let bestInfluence = -1;
                for (let oi = 0; oi < numOwners; oi++) {
                    const indices = starsByOwner[oi];
                    let influence = 0;
                    let ownerMinDist = Infinity;
                    for (let j = 0; j < indices.length; j++) {
                        const distSq = effectiveDistSq(centerX, centerY, indices[j]);
                        if (distSq < ownerMinDist) ownerMinDist = distSq;
                        influence += distSq < 1 ? 1e12 : 1.0 / distSq;
                    }
                    const score = Math.pow(influence, corridorBoost) *
                        Math.pow(ownerMinDist < 1 ? 1e-12 : 1.0 / ownerMinDist, 1.0 - corridorBoost);
                    if (score > bestInfluence) {
                        bestInfluence = score;
                        winnerOi = oi;
                    }
                }
            } else {
                let nearestDistSq = Infinity;
                for (let i = 0; i < numStars; i++) {
                    const dist = effectiveDistSq(centerX, centerY, i);
                    if (dist < nearestDistSq) {
                        nearestDistSq = dist;
                        winnerOi = stars[i].ownerIdx;
                    }
                }
            }

            tileOwner[tIdx] = winnerOi;
            tileR[tIdx] = ownerRGB[winnerOi * 3];
            tileG[tIdx] = ownerRGB[winnerOi * 3 + 1];
            tileB[tIdx] = ownerRGB[winnerOi * 3 + 2];
        }
    }

    // Pass 2: Detect boundary tiles
    const isBoundary = new Uint8Array(tilesW * tilesH);
    for (let ty = 0; ty < tilesH; ty++) {
        for (let tx = 0; tx < tilesW; tx++) {
            const tIdx = ty * tilesW + tx;
            const my = tileOwner[tIdx];
            if (tx > 0 && tileOwner[tIdx - 1] !== my) { isBoundary[tIdx] = 1; continue; }
            if (tx < tilesW - 1 && tileOwner[tIdx + 1] !== my) { isBoundary[tIdx] = 1; continue; }
            if (ty > 0 && tileOwner[tIdx - tilesW] !== my) { isBoundary[tIdx] = 1; continue; }
            if (ty < tilesH - 1 && tileOwner[tIdx + tilesW] !== my) { isBoundary[tIdx] = 1; continue; }
        }
    }

    // Pass 3 & 4: Fill pixels
    const ownerGrid = borderWidth > 0 ? new Uint8Array(canvasW * canvasH) : null;

    for (let ty = 0; ty < tilesH; ty++) {
        for (let tx = 0; tx < tilesW; tx++) {
            const tIdx = ty * tilesW + tx;
            const startX = tx * TILE_SIZE;
            const startY = ty * TILE_SIZE;
            const endX = Math.min(startX + TILE_SIZE, canvasW);
            const endY = Math.min(startY + TILE_SIZE, canvasH);

            if (!isBoundary[tIdx]) {
                // Interior tile: flood fill
                const r = tileR[tIdx], g = tileG[tIdx], b = tileB[tIdx];
                const oi = tileOwner[tIdx];
                for (let py = startY; py < endY; py++) {
                    for (let px = startX; px < endX; px++) {
                        let pa = alpha;

                        // Edge fade
                        if (fadeDistCanvas > 0) {
                            let fm = 1.0;
                            if (px < boardLeft) fm = Math.min(fm, px / fadeDistCanvas);
                            else if (px > boardRight) fm = Math.min(fm, (canvasW - px) / fadeDistCanvas);
                            if (py < boardTop) fm = Math.min(fm, py / fadeDistCanvas);
                            else if (py > boardBottom) fm = Math.min(fm, (canvasH - py) / fadeDistCanvas);
                            pa *= Math.max(0, fm);
                        }

                        // Pattern
                        if (pattern !== 'none') {
                            const ps = patternScale;
                            const rpx = px * ownerCos[oi] - py * ownerSin[oi];
                            const rpy = px * ownerSin[oi] + py * ownerCos[oi];
                            if (pattern === 'stripes') {
                                pa *= ((Math.floor((rpx + rpy) / ps)) % 2 === 0) ? 1.0 : 0.35;
                            } else if (pattern === 'crosshatch') {
                                pa *= ((((rpx % ps) + ps) % ps) < 1 || (((rpy % ps) + ps) % ps) < 1) ? 1.0 : 0.3;
                            } else if (pattern === 'dots') {
                                const gx = ((((rpx % ps) + ps) % ps) - ps / 2);
                                const gy = ((((rpy % ps) + ps) % ps) - ps / 2);
                                pa *= (Math.sqrt(gx * gx + gy * gy) / (ps / 2)) < 0.5 ? 1.0 : 0.25;
                            } else if (pattern === 'hex') {
                                const d2e = hexDistToEdge(px, py, ps);
                                if (d2e < 1.5) pa *= 0.05;
                                else if (d2e < 3.0) pa = Math.min(1.0, pa * 2.5);
                            }
                        }

                        const idx = (py * canvasW + px) * 4;
                        pixels[idx] = r;
                        pixels[idx + 1] = g;
                        pixels[idx + 2] = b;
                        pixels[idx + 3] = Math.round(pa * 255);
                        if (ownerGrid) ownerGrid[py * canvasW + px] = oi;
                    }
                }
            } else {
                // Boundary tile: full per-pixel computation
                for (let py = startY; py < endY; py++) {
                    for (let px = startX; px < endX; px++) {
                        let winnerOi = 0;
                        let nearestDistSq = Infinity;

                        // Check capsule corridors first
                        const cOwner = corridorSegs.length > 0 ? corridorOwner(px, py) : -1;
                        if (cOwner >= 0) {
                            winnerOi = cOwner;
                            // Still need nearestDistSq for edge blend
                            for (let i = 0; i < numStars; i++) {
                                if (stars[i].ownerIdx !== cOwner) continue;
                                const ddx = px - stars[i].x;
                                const ddy = py - stars[i].y;
                                const d = ddx * ddx + ddy * ddy;
                                if (d < nearestDistSq) nearestDistSq = d;
                            }
                        } else if (corridorBoost > 0 && numOwners > 1) {
                            let bestInfluence = -1;
                            let bestNearestDistSq = Infinity;
                            for (let oi = 0; oi < numOwners; oi++) {
                                const indices = starsByOwner[oi];
                                let influence = 0;
                                let ownerMinDist = Infinity;
                                for (let j = 0; j < indices.length; j++) {
                                    const distSq = effectiveDistSq(px, py, indices[j]);
                                    if (distSq < ownerMinDist) ownerMinDist = distSq;
                                    influence += distSq < 1 ? 1e12 : 1.0 / distSq;
                                }
                                const score = Math.pow(influence, corridorBoost) *
                                    Math.pow(ownerMinDist < 1 ? 1e-12 : 1.0 / ownerMinDist, 1.0 - corridorBoost);
                                if (score > bestInfluence) {
                                    bestInfluence = score;
                                    winnerOi = oi;
                                    bestNearestDistSq = ownerMinDist;
                                }
                            }
                            nearestDistSq = bestNearestDistSq;
                        } else {
                            for (let i = 0; i < numStars; i++) {
                                const dist = effectiveDistSq(px, py, i);
                                if (dist < nearestDistSq) {
                                    nearestDistSq = dist;
                                    winnerOi = stars[i].ownerIdx;
                                }
                            }
                        }

                        const r = ownerRGB[winnerOi * 3];
                        const g = ownerRGB[winnerOi * 3 + 1];
                        const b = ownerRGB[winnerOi * 3 + 2];
                        let pa = alpha;

                        // Edge fade
                        if (fadeDistCanvas > 0) {
                            let fm = 1.0;
                            if (px < boardLeft) fm = Math.min(fm, px / fadeDistCanvas);
                            else if (px > boardRight) fm = Math.min(fm, (canvasW - px) / fadeDistCanvas);
                            if (py < boardTop) fm = Math.min(fm, py / fadeDistCanvas);
                            else if (py > boardBottom) fm = Math.min(fm, (canvasH - py) / fadeDistCanvas);
                            pa *= Math.max(0, fm);
                        }

                        // Edge blend (enemy boundaries only)
                        if (edgeBlend > 0) {
                            let secondMinDist = Infinity;
                            for (let i = 0; i < numStars; i++) {
                                if (stars[i].ownerIdx === winnerOi) continue;
                                const dx = px - stars[i].x;
                                const dy = py - stars[i].y;
                                const dist = dx * dx + dy * dy;
                                if (dist < secondMinDist) secondMinDist = dist;
                            }
                            if (secondMinDist < Infinity) {
                                const d1 = Math.sqrt(nearestDistSq);
                                const d2 = Math.sqrt(secondMinDist);
                                const edgeDist = (d2 - d1) / (d1 + d2 + 0.001);
                                const blendFactor = Math.min(1, edgeDist / (edgeBlend * 0.05));
                                pa *= blendFactor;
                            }
                        }

                        // Pattern
                        if (pattern !== 'none') {
                            const ps = patternScale;
                            const rpx = px * ownerCos[winnerOi] - py * ownerSin[winnerOi];
                            const rpy = px * ownerSin[winnerOi] + py * ownerCos[winnerOi];
                            if (pattern === 'stripes') {
                                pa *= ((Math.floor((rpx + rpy) / ps)) % 2 === 0) ? 1.0 : 0.35;
                            } else if (pattern === 'crosshatch') {
                                pa *= ((((rpx % ps) + ps) % ps) < 1 || (((rpy % ps) + ps) % ps) < 1) ? 1.0 : 0.3;
                            } else if (pattern === 'dots') {
                                const gx = ((((rpx % ps) + ps) % ps) - ps / 2);
                                const gy = ((((rpy % ps) + ps) % ps) - ps / 2);
                                pa *= (Math.sqrt(gx * gx + gy * gy) / (ps / 2)) < 0.5 ? 1.0 : 0.25;
                            } else if (pattern === 'hex') {
                                const d2e = hexDistToEdge(px, py, ps);
                                if (d2e < 1.5) pa *= 0.05;
                                else if (d2e < 3.0) pa = Math.min(1.0, pa * 2.5);
                            }
                        }

                        const idx = (py * canvasW + px) * 4;
                        pixels[idx] = r;
                        pixels[idx + 1] = g;
                        pixels[idx + 2] = b;
                        pixels[idx + 3] = Math.round(pa * 255);
                        if (ownerGrid) ownerGrid[py * canvasW + px] = winnerOi;
                    }
                }
            }
        }
    }

    // Border detection pass
    if (borderWidth > 0 && ownerGrid) {
        const bw = Math.max(1, Math.round(borderWidth));
        for (let py = bw; py < canvasH - bw; py++) {
            for (let px = bw; px < canvasW - bw; px++) {
                const gridIdx = py * canvasW + px;
                const myOwner = ownerGrid[gridIdx];
                let isBdr = false;
                for (let dd = 1; dd <= bw && !isBdr; dd++) {
                    if (px + dd < canvasW && ownerGrid[gridIdx + dd] !== myOwner) isBdr = true;
                    if (px - dd >= 0 && ownerGrid[gridIdx - dd] !== myOwner) isBdr = true;
                    if (py + dd < canvasH && ownerGrid[gridIdx + dd * canvasW] !== myOwner) isBdr = true;
                    if (py - dd >= 0 && ownerGrid[gridIdx - dd * canvasW] !== myOwner) isBdr = true;
                }
                if (isBdr) {
                    const idx = (py * canvasW + px) * 4;
                    pixels[idx] = Math.min(255, pixels[idx] + borderBrighten);
                    pixels[idx + 1] = Math.min(255, pixels[idx + 1] + borderBrighten);
                    pixels[idx + 2] = Math.min(255, pixels[idx + 2] + borderBrighten);
                    pixels[idx + 3] = Math.round(borderAlpha * 255);
                }
            }
        }
    }

    // Transfer pixel buffer back (zero-copy)
    (self as any).postMessage(
        { pixels: pixels.buffer, canvasW, canvasH },
        [pixels.buffer],
    );
};
