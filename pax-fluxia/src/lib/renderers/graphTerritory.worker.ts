// ============================================================================
// GraphTerritoryWorker — Connection-graph-constrained territory computation
// ============================================================================
// Enemy connection lanes act as HARD BARRIERS. Territory cannot bleed past
// an enemy corridor. A pixel is owned by the nearest star whose line-of-sight
// (pixel → star) does NOT cross any enemy barrier segment.
//
// This creates natural encirclement, proper corridors, and territory shapes
// that follow the connection graph topology.
// ============================================================================

interface StarData {
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    ownerIdx: number;
    ships: number;
}

interface BarrierSeg {
    x1: number; y1: number;
    x2: number; y2: number;
}

interface CorridorSeg {
    x1: number; y1: number;
    x2: number; y2: number;
    ownerIdx: number;
    halfW: number;
}

interface WorkerInput {
    canvasW: number;
    canvasH: number;
    stars: StarData[];
    numOwners: number;
    ownerRGB: number[];
    alpha: number;
    barriers: BarrierSeg[];
    corridorSegs: CorridorSeg[];
    pressure: number;
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
    const {
        canvasW, canvasH, stars, numOwners, ownerRGB,
        alpha, barriers, corridorSegs, pressure,
        borderWidth, borderAlpha, borderBrighten,
        pattern, patternScale, patternRotation,
        boardLeft, boardTop, boardRight, boardBottom, fadeDistCanvas,
    } = e.data;

    const numStars = stars.length;
    const numBarriers = barriers.length;

    // ── Line segment intersection test ──
    // Returns true if segment (ax,ay)→(bx,by) crosses segment (cx,cy)→(dx,dy)
    function segmentsIntersect(
        ax: number, ay: number, bx: number, by: number,
        cx: number, cy: number, dx: number, dy: number,
    ): boolean {
        const dxAB = bx - ax, dyAB = by - ay;
        const dxCD = dx - cx, dyCD = dy - cy;
        const denom = dxAB * dyCD - dyAB * dxCD;
        if (Math.abs(denom) < 1e-10) return false; // parallel

        const t = ((cx - ax) * dyCD - (cy - ay) * dxCD) / denom;
        const u = ((cx - ax) * dyAB - (cy - ay) * dxAB) / denom;

        // Intersection at interior of both segments (exclude exact endpoints)
        return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
    }

    // ── Check if line from pixel to star crosses any barrier ──
    function isBlocked(px: number, py: number, sx: number, sy: number): boolean {
        for (let b = 0; b < numBarriers; b++) {
            const bar = barriers[b];
            if (segmentsIntersect(px, py, sx, sy, bar.x1, bar.y1, bar.x2, bar.y2)) {
                return true;
            }
        }
        return false;
    }

    // ── Capsule corridor check ──
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

    function corridorOwner(px: number, py: number): number {
        for (let i = 0; i < corridorSegs.length; i++) {
            const seg = corridorSegs[i];
            if (segDistSq(px, py, seg) <= seg.halfW * seg.halfW) {
                return seg.ownerIdx;
            }
        }
        return -1;
    }

    // ── Build owner → star indices ──
    const starsByOwner: number[][] = [];
    for (let oi = 0; oi < numOwners; oi++) starsByOwner.push([]);
    for (let i = 0; i < numStars; i++) {
        starsByOwner[stars[i].ownerIdx].push(i);
    }

    // ── Pattern rotation ──
    const ownerCos = new Float64Array(numOwners);
    const ownerSin = new Float64Array(numOwners);
    for (let oi = 0; oi < numOwners; oi++) {
        const angle = (oi * 137.508 * patternRotation * Math.PI) / 180;
        ownerCos[oi] = Math.cos(angle);
        ownerSin[oi] = Math.sin(angle);
    }

    // ── Pixel computation ──
    const pixels = new Uint8ClampedArray(canvasW * canvasH * 4);
    const ownerGrid = borderWidth > 0 ? new Uint8Array(canvasW * canvasH) : null;

    // Hierarchical: 8px tiles for coarse pass
    const TILE_SIZE = 8;
    const tilesW = Math.ceil(canvasW / TILE_SIZE);
    const tilesH = Math.ceil(canvasH / TILE_SIZE);
    const tileOwner = new Uint8Array(tilesW * tilesH);
    const tileR = new Uint8Array(tilesW * tilesH);
    const tileG = new Uint8Array(tilesW * tilesH);
    const tileB = new Uint8Array(tilesW * tilesH);

    // ── Find owner for a pixel with barrier checking ──
    function findOwner(px: number, py: number): number {
        // 1. Check corridor capsules first (guaranteed connectivity)
        const cOwner = corridorSegs.length > 0 ? corridorOwner(px, py) : -1;
        if (cOwner >= 0) return cOwner;

        // 2. Find nearest star NOT blocked by a barrier
        let nearestDistSq = Infinity;
        let winnerOi = 0;

        for (let i = 0; i < numStars; i++) {
            const s = stars[i];
            const dx = px - s.x;
            const dy = py - s.y;
            let distSq = dx * dx + dy * dy;

            // Pressure: scale distance inversely with ship count
            if (pressure > 0 && s.ships > 0) {
                const shipFactor = 1 + Math.log2(1 + s.ships) * 0.15 * pressure;
                distSq /= (shipFactor * shipFactor);
            }

            // Skip if already farther than best
            if (distSq >= nearestDistSq) continue;

            // Check if line of sight is blocked by an enemy barrier
            if (numBarriers > 0 && isBlocked(px, py, s.x, s.y)) continue;

            nearestDistSq = distSq;
            winnerOi = s.ownerIdx;
        }

        return winnerOi;
    }

    // Pass 1: Coarse tile ownership
    for (let ty = 0; ty < tilesH; ty++) {
        const centerY = (ty + 0.5) * TILE_SIZE;
        for (let tx = 0; tx < tilesW; tx++) {
            const centerX = (tx + 0.5) * TILE_SIZE;
            const tIdx = ty * tilesW + tx;
            const winnerOi = findOwner(centerX, centerY);
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

    // Pass 3: Fill pixels
    for (let ty = 0; ty < tilesH; ty++) {
        for (let tx = 0; tx < tilesW; tx++) {
            const tIdx = ty * tilesW + tx;
            const startX = tx * TILE_SIZE;
            const startY = ty * TILE_SIZE;
            const endX = Math.min(startX + TILE_SIZE, canvasW);
            const endY = Math.min(startY + TILE_SIZE, canvasH);

            if (!isBoundary[tIdx]) {
                // Interior tile: flood fill with tile color
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
                // Boundary tile: per-pixel ownership with barrier checking
                for (let py = startY; py < endY; py++) {
                    for (let px = startX; px < endX; px++) {
                        const winnerOi = findOwner(px, py);
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
