// ============================================================================
// LaneTerritoryWorker — Connection-Aware Influence territory computation
// ============================================================================
// Fundamentally different from distance-based approaches (Voronoi, Pixel, Graph).
// Instead of "which star is closest?", asks "which player has the strongest
// influence here?" — where influence propagates ALONG CONNECTION LANES like
// pipes/rivers, not equally in all directions.
//
// Result: organic territory that elongates along connections toward friendly
// neighbors and narrows between unconnected directions.
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

interface LaneSeg {
    x1: number; y1: number;
    x2: number; y2: number;
    ownerIdx: number;
}

interface WorkerInput {
    canvasW: number;
    canvasH: number;
    stars: StarData[];
    numOwners: number;
    ownerRGB: number[];
    alpha: number;
    lanes: LaneSeg[];
    laneInfluence: number;   // How much stronger lane influence is vs direct (1-10)
    laneWidth: number;       // Half-width of the influence corridor in canvas px
    directFalloff: number;   // How fast direct star influence fades (0.5-5)
    pressure: number;        // Ship-count influence boost (0-1)
    threshold: number;       // Minimum influence to claim territory (0-0.5)
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
        alpha, lanes, laneInfluence, laneWidth, directFalloff,
        pressure, threshold,
        borderWidth, borderAlpha, borderBrighten,
        pattern, patternScale, patternRotation,
        boardLeft, boardTop, boardRight, boardBottom, fadeDistCanvas,
    } = e.data;

    const numStars = stars.length;
    const numLanes = lanes.length;
    const laneWidthSq = laneWidth * laneWidth;

    // ── Point-to-segment distance squared ──
    function segDistSq(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 1) return (px - x1) ** 2 + (py - y1) ** 2;
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const cx = x1 + t * dx;
        const cy = y1 + t * dy;
        return (px - cx) ** 2 + (py - cy) ** 2;
    }

    // ── Build owner → star indices and owner → lane indices ──
    const starsByOwner: number[][] = [];
    const lanesByOwner: number[][] = [];
    for (let oi = 0; oi < numOwners; oi++) {
        starsByOwner.push([]);
        lanesByOwner.push([]);
    }
    for (let i = 0; i < numStars; i++) starsByOwner[stars[i].ownerIdx].push(i);
    for (let i = 0; i < numLanes; i++) lanesByOwner[lanes[i].ownerIdx].push(i);

    // ── Pattern rotation ──
    const ownerCos = new Float64Array(numOwners);
    const ownerSin = new Float64Array(numOwners);
    for (let oi = 0; oi < numOwners; oi++) {
        const angle = (oi * 137.508 * patternRotation * Math.PI) / 180;
        ownerCos[oi] = Math.cos(angle);
        ownerSin[oi] = Math.sin(angle);
    }

    // ── Compute influence for a pixel ──
    // Returns ownerIdx of the dominant player, or -1 if below threshold
    const infBuf = new Float64Array(numOwners);

    function computeOwner(px: number, py: number): number {
        // Reset influence buffer
        for (let oi = 0; oi < numOwners; oi++) infBuf[oi] = 0;

        // 1. Direct star influence (weak radial falloff)
        for (let i = 0; i < numStars; i++) {
            const s = stars[i];
            const dx = px - s.x;
            const dy = py - s.y;
            const distSq = dx * dx + dy * dy;

            // Inverse-distance influence with configurable falloff
            // directFalloff controls how fast it attenuates
            let inf = 1.0 / (1.0 + distSq * directFalloff * 0.0001);

            // Pressure: boost influence for high-ship stars
            if (pressure > 0 && s.ships > 0) {
                inf *= 1 + Math.log2(1 + s.ships) * 0.1 * pressure;
            }

            infBuf[s.ownerIdx] += inf;
        }

        // 2. Lane influence (strong along connections — the key differentiator!)
        //    For each same-owner connection lane, pixels near the lane get a big boost
        for (let i = 0; i < numLanes; i++) {
            const lane = lanes[i];
            const dSq = segDistSq(px, py, lane.x1, lane.y1, lane.x2, lane.y2);

            // Only apply if pixel is within lane corridor width
            if (dSq < laneWidthSq) {
                // Smooth falloff from center of lane to edge
                const ratio = dSq / laneWidthSq;
                // Cosine-like smooth falloff: 1 at center, 0 at edge
                const laneInf = (1.0 - ratio) * (1.0 - ratio) * laneInfluence;
                infBuf[lane.ownerIdx] += laneInf;
            }
        }

        // Find dominant player
        let maxInf = threshold;
        let winner = -1;
        for (let oi = 0; oi < numOwners; oi++) {
            if (infBuf[oi] > maxInf) {
                maxInf = infBuf[oi];
                winner = oi;
            }
        }

        return winner;
    }

    // ── Pixel computation with hierarchical tiles ──
    const pixels = new Uint8ClampedArray(canvasW * canvasH * 4);
    const ownerGrid = borderWidth > 0 ? new Uint8Array(canvasW * canvasH) : null;

    const TILE_SIZE = 8;
    const tilesW = Math.ceil(canvasW / TILE_SIZE);
    const tilesH = Math.ceil(canvasH / TILE_SIZE);
    const tileOwner = new Int8Array(tilesW * tilesH); // -1 for unclaimed
    const tileR = new Uint8Array(tilesW * tilesH);
    const tileG = new Uint8Array(tilesW * tilesH);
    const tileB = new Uint8Array(tilesW * tilesH);

    // Pass 1: Coarse tile ownership
    for (let ty = 0; ty < tilesH; ty++) {
        const centerY = (ty + 0.5) * TILE_SIZE;
        for (let tx = 0; tx < tilesW; tx++) {
            const centerX = (tx + 0.5) * TILE_SIZE;
            const tIdx = ty * tilesW + tx;
            const winner = computeOwner(centerX, centerY);
            tileOwner[tIdx] = winner;
            if (winner >= 0) {
                tileR[tIdx] = ownerRGB[winner * 3];
                tileG[tIdx] = ownerRGB[winner * 3 + 1];
                tileB[tIdx] = ownerRGB[winner * 3 + 2];
            }
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
            const tOwner = tileOwner[tIdx];

            if (!isBoundary[tIdx]) {
                if (tOwner < 0) continue; // unclaimed tile
                const r = tileR[tIdx], g = tileG[tIdx], b = tileB[tIdx];
                for (let py = startY; py < endY; py++) {
                    for (let px = startX; px < endX; px++) {
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
                            const ps = patternScale;
                            const rpx = px * ownerCos[tOwner] - py * ownerSin[tOwner];
                            const rpy = px * ownerSin[tOwner] + py * ownerCos[tOwner];
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
                        if (ownerGrid) ownerGrid[py * canvasW + px] = tOwner;
                    }
                }
            } else {
                // Boundary tile: per-pixel influence computation
                for (let py = startY; py < endY; py++) {
                    for (let px = startX; px < endX; px++) {
                        const winner = computeOwner(px, py);
                        if (winner < 0) continue;

                        const r = ownerRGB[winner * 3];
                        const g = ownerRGB[winner * 3 + 1];
                        const b = ownerRGB[winner * 3 + 2];
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

                        const idx = (py * canvasW + px) * 4;
                        pixels[idx] = r;
                        pixels[idx + 1] = g;
                        pixels[idx + 2] = b;
                        pixels[idx + 3] = Math.round(pa * 255);
                        if (ownerGrid) ownerGrid[py * canvasW + px] = winner;
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

    (self as any).postMessage(
        { pixels: pixels.buffer, canvasW, canvasH },
        [pixels.buffer],
    );
};
