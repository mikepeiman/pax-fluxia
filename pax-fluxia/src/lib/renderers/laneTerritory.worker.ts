// ============================================================================
// LaneTerritoryWorker — Connection-Aware Influence territory computation
// ============================================================================
// ALL connections are influence lanes (not just same-owner).
// Each lane propagates influence from BOTH endpoint stars.
// ============================================================================

interface StarData {
    x: number; y: number;
    r: number; g: number; b: number;
    ownerIdx: number; ships: number;
    maskRadius: number;  // exclusion radius (ownership ring circumference)
}

interface LaneSeg {
    x1: number; y1: number;
    x2: number; y2: number;
    ownerA: number; ownerB: number;
    shipsA: number; shipsB: number;
}

interface WorkerInput {
    canvasW: number; canvasH: number;
    stars: StarData[]; numOwners: number; ownerRGB: number[];
    alpha: number; lanes: LaneSeg[];
    laneInfluence: number; laneWidth: number; directFalloff: number;
    pressure: number; threshold: number;
    borderWidth: number; borderAlpha: number; borderBrighten: number;
    pattern: string; patternScale: number; patternRotation: number;
    boardLeft: number; boardTop: number; boardRight: number; boardBottom: number;
    fadeDistCanvas: number;
    // Hex grid overlay params (in canvas px, already downscaled by resolution)
    hexSize: number;     // side length of hex cell
    hexGap: number;      // gap between hex cells
    hexLine: number;     // outline line thickness (visual, NOT halved)
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
    const {
        canvasW, canvasH, stars, numOwners, ownerRGB,
        alpha, lanes, laneInfluence, laneWidth, directFalloff,
        pressure, threshold,
        borderWidth, borderAlpha, borderBrighten,
        pattern, patternScale, patternRotation,
        boardLeft, boardTop, boardRight, boardBottom, fadeDistCanvas,
        hexSize, hexGap, hexLine,
    } = e.data;

    const numStars = stars.length;
    const numLanes = lanes.length;
    const laneWidthSq = laneWidth * laneWidth;

    function segInfo(px: number, py: number, x1: number, y1: number, x2: number, y2: number): [number, number] {
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 1) return [(px - x1) ** 2 + (py - y1) ** 2, 0];
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const cx = x1 + t * dx, cy = y1 + t * dy;
        return [(px - cx) ** 2 + (py - cy) ** 2, t];
    }

    // ── Star mask: precompute squared mask radii ──
    const maskRadiiSq = new Float64Array(numStars);
    for (let i = 0; i < numStars; i++) {
        maskRadiiSq[i] = stars[i].maskRadius * stars[i].maskRadius;
    }

    function isInsideStarMask(px: number, py: number): boolean {
        for (let i = 0; i < numStars; i++) {
            const s = stars[i];
            const dx = px - s.x, dy = py - s.y;
            if (dx * dx + dy * dy < maskRadiiSq[i]) return true;
        }
        return false;
    }

    // ── Pattern rotation ──
    const ownerCos = new Float64Array(numOwners);
    const ownerSin = new Float64Array(numOwners);
    for (let oi = 0; oi < numOwners; oi++) {
        const angle = (oi * 137.508 * patternRotation * Math.PI) / 180;
        ownerCos[oi] = Math.cos(angle);
        ownerSin[oi] = Math.sin(angle);
    }

    // ── Hex grid: perpendicular distance from pixel to nearest hex edge ──
    // Returns distance in canvas pixels. 0 = on the edge, large = at center.
    // Flat-top hexagons.
    const SQRT3 = Math.sqrt(3);

    function hexDistToEdge(px: number, py: number, size: number): number {
        // Axial coordinates (flat-top hex)
        const q = (2.0 / 3.0 * px) / size;
        const r = (-1.0 / 3.0 * px + SQRT3 / 3.0 * py) / size;
        const s = -q - r;

        // Cube coordinate rounding
        let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
        const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
        if (dq > dr && dq > ds) rq = -rr - rs;
        else if (dr > ds) rr = -rq - rs;

        // Hex center in pixel coords
        const cx = size * (3.0 / 2.0 * rq);
        const cy = size * (SQRT3 / 2.0 * rq + SQRT3 * rr);

        // Distance from pixel to hex center, measured against hex edges
        const ddx = Math.abs(px - cx);
        const ddy = Math.abs(py - cy);
        const halfH = SQRT3 / 2.0 * size;

        // Perpendicular distance to each hex face (flat-top):
        const dRight = size - ddx;
        const dHoriz = halfH - ddy;
        const dDiag = (SQRT3 * size - ddy - SQRT3 * ddx) / 2.0;

        return Math.max(0, Math.min(dRight, dHoriz, dDiag));
    }

    // ── Hex outline: only draw from ONE side to prevent doubled lines ──
    // We check if this pixel's hex center has a "lower" canonical ID than
    // the neighbor across each edge. If our cell is the "lower" one, we
    // draw the outline on our side. Otherwise we skip.
    // Simpler approach: halve the lineWidth so each side contributes half.
    const hexHalfLine = hexLine * 0.5;

    // ── Influence computation ──
    const infBuf = new Float64Array(numOwners);

    function computeOwner(px: number, py: number): number {
        for (let oi = 0; oi < numOwners; oi++) infBuf[oi] = 0;

        for (let i = 0; i < numStars; i++) {
            const s = stars[i];
            const dx = px - s.x, dy = py - s.y;
            const distSq = dx * dx + dy * dy;
            let inf = 1.0 / (1.0 + distSq * directFalloff * directFalloff * 0.001);
            if (pressure > 0 && s.ships > 0) {
                inf *= 1 + Math.log2(1 + s.ships) * 0.1 * pressure;
            }
            infBuf[s.ownerIdx] += inf;
        }

        for (let i = 0; i < numLanes; i++) {
            const lane = lanes[i];
            const [dSq, t] = segInfo(px, py, lane.x1, lane.y1, lane.x2, lane.y2);
            if (dSq < laneWidthSq) {
                const perpRatio = dSq / laneWidthSq;
                const perpFalloff = (1.0 - perpRatio) * (1.0 - perpRatio);
                let factorA = 1.0, factorB = 1.0;
                if (pressure > 0) {
                    factorA = 1 + Math.log2(1 + lane.shipsA) * 0.15 * pressure;
                    factorB = 1 + Math.log2(1 + lane.shipsB) * 0.15 * pressure;
                }
                infBuf[lane.ownerA] += (1.0 - t) * perpFalloff * laneInfluence * factorA;
                infBuf[lane.ownerB] += t * perpFalloff * laneInfluence * factorB;
            }
        }

        let maxInf = threshold;
        let winner = -1;
        for (let oi = 0; oi < numOwners; oi++) {
            if (infBuf[oi] > maxInf) { maxInf = infBuf[oi]; winner = oi; }
        }
        return winner;
    }

    // ── Pixel computation ──
    const pixels = new Uint8ClampedArray(canvasW * canvasH * 4);
    const ownerGrid = borderWidth > 0 ? new Uint8Array(canvasW * canvasH) : null;

    const TILE_SIZE = 8;
    const tilesW = Math.ceil(canvasW / TILE_SIZE);
    const tilesH = Math.ceil(canvasH / TILE_SIZE);
    const tileOwner = new Int8Array(tilesW * tilesH);
    const tileR = new Uint8Array(tilesW * tilesH);
    const tileG = new Uint8Array(tilesW * tilesH);
    const tileB = new Uint8Array(tilesW * tilesH);

    for (let ty = 0; ty < tilesH; ty++) {
        const cY = (ty + 0.5) * TILE_SIZE;
        for (let tx = 0; tx < tilesW; tx++) {
            const cX = (tx + 0.5) * TILE_SIZE;
            const tIdx = ty * tilesW + tx;
            const w = computeOwner(cX, cY);
            tileOwner[tIdx] = w;
            if (w >= 0) {
                tileR[tIdx] = ownerRGB[w * 3];
                tileG[tIdx] = ownerRGB[w * 3 + 1];
                tileB[tIdx] = ownerRGB[w * 3 + 2];
            }
        }
    }

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

    // ── Render pixel helper ──
    const useHex = pattern === 'hex' && hexSize > 0;

    function renderPixel(px: number, py: number, winner: number, r: number, g: number, b: number): void {
        // Star masking: skip pixels inside any star's ownership ring
        if (isInsideStarMask(px, py)) return;

        let pa = alpha;

        if (fadeDistCanvas > 0) {
            let fm = 1.0;
            if (px < boardLeft) fm = Math.min(fm, px / fadeDistCanvas);
            else if (px > boardRight) fm = Math.min(fm, (canvasW - px) / fadeDistCanvas);
            if (py < boardTop) fm = Math.min(fm, py / fadeDistCanvas);
            else if (py > boardBottom) fm = Math.min(fm, (canvasH - py) / fadeDistCanvas);
            pa *= Math.max(0, fm);
        }

        if (pattern !== 'none') {
            if (useHex) {
                // Hex grid outline
                const distToEdge = hexDistToEdge(px, py, hexSize);

                if (hexGap > 0 && distToEdge < hexGap * 0.5) {
                    // In the gap between hex cells — make transparent
                    pa *= 0.05;
                } else if (distToEdge < hexHalfLine + hexGap * 0.5) {
                    // On the hex outline — brighten (halved so lines don't double)
                    pa = Math.min(1.0, pa * 2.5);
                }
                // else: interior — keep normal alpha
            } else {
                const ps = patternScale;
                const rpx = px * ownerCos[winner] - py * ownerSin[winner];
                const rpy = px * ownerSin[winner] + py * ownerCos[winner];
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
        }

        const idx = (py * canvasW + px) * 4;
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = Math.round(pa * 255);
        if (ownerGrid) ownerGrid[py * canvasW + px] = winner;
    }

    // Fill pixels
    for (let ty = 0; ty < tilesH; ty++) {
        for (let tx = 0; tx < tilesW; tx++) {
            const tIdx = ty * tilesW + tx;
            const startX = tx * TILE_SIZE, startY = ty * TILE_SIZE;
            const endX = Math.min(startX + TILE_SIZE, canvasW);
            const endY = Math.min(startY + TILE_SIZE, canvasH);
            const tOwner = tileOwner[tIdx];

            if (!isBoundary[tIdx]) {
                if (tOwner < 0) continue;
                const r = tileR[tIdx], g = tileG[tIdx], b = tileB[tIdx];
                for (let py = startY; py < endY; py++) {
                    for (let px = startX; px < endX; px++) {
                        renderPixel(px, py, tOwner, r, g, b);
                    }
                }
            } else {
                for (let py = startY; py < endY; py++) {
                    for (let px = startX; px < endX; px++) {
                        const winner = computeOwner(px, py);
                        if (winner < 0) continue;
                        renderPixel(px, py, winner, ownerRGB[winner * 3], ownerRGB[winner * 3 + 1], ownerRGB[winner * 3 + 2]);
                    }
                }
            }
        }
    }

    // Border detection
    if (borderWidth > 0 && ownerGrid) {
        const bw = Math.max(1, Math.round(borderWidth));
        for (let py = bw; py < canvasH - bw; py++) {
            for (let px = bw; px < canvasW - bw; px++) {
                const gIdx = py * canvasW + px;
                const myOwner = ownerGrid[gIdx];
                let isBdr = false;
                for (let dd = 1; dd <= bw && !isBdr; dd++) {
                    if (px + dd < canvasW && ownerGrid[gIdx + dd] !== myOwner) isBdr = true;
                    if (px - dd >= 0 && ownerGrid[gIdx - dd] !== myOwner) isBdr = true;
                    if (py + dd < canvasH && ownerGrid[gIdx + dd * canvasW] !== myOwner) isBdr = true;
                    if (py - dd >= 0 && ownerGrid[gIdx - dd * canvasW] !== myOwner) isBdr = true;
                }
                if (isBdr) {
                    const idx = gIdx * 4;
                    pixels[idx] = Math.min(255, pixels[idx] + borderBrighten);
                    pixels[idx + 1] = Math.min(255, pixels[idx + 1] + borderBrighten);
                    pixels[idx + 2] = Math.min(255, pixels[idx + 2] + borderBrighten);
                    pixels[idx + 3] = Math.round(borderAlpha * 255);
                }
            }
        }
    }

    (self as any).postMessage(
        { pixels: pixels.buffer, canvasW, canvasH },
        [pixels.buffer],
    );
};
