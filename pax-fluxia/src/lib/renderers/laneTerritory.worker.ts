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
    pressure: number;        // Ship-count influence boost (0=off, higher=stronger boundary shift)
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
    borderFeel: string;       // 'raw' | 'smooth' | 'angular'
    borderSmooth: number;     // smoothing iterations (0-5)
}

// ============================================================================
// Post-processing: morphological operations on ownerGrid
// ============================================================================

/**
 * Post-process the ownership grid to create different border "feel" styles.
 *
 * 'smooth': Majority-vote morphological filter. Each border pixel adopts the
 *           most common owner among its neighbors. Reduces jagged edges.
 *           Multiple iterations create progressively smoother borders.
 *
 * 'angular': Run-length stepping. Scans horizontal and vertical runs of the
 *            same owner and extends short runs to create clean geometric
 *            border segments with angular transitions.
 */
function postProcessOwnerGrid(
    grid: Uint8Array,
    w: number,
    h: number,
    feel: string,
    iterations: number,
): void {
    if (feel === 'smooth') {
        smoothBorders(grid, w, h, iterations);
    } else if (feel === 'angular') {
        angularBorders(grid, w, h, iterations);
    }
}

/**
 * Majority-vote smoothing with a 5×5 kernel and 3 internal passes per
 * user iteration. Much more aggressive than a single 3×3 pass.
 * Each border pixel adopts the most common owner in its neighborhood.
 */
function smoothBorders(grid: Uint8Array, w: number, h: number, iterations: number): void {
    const tmp = new Uint8Array(w * h);
    const RADIUS = 2; // 5×5 kernel
    const totalPasses = iterations * 3; // 3 internal passes per user iteration

    for (let iter = 0; iter < totalPasses; iter++) {
        tmp.set(grid);

        for (let y = RADIUS; y < h - RADIUS; y++) {
            for (let x = RADIUS; x < w - RADIUS; x++) {
                const idx = y * w + x;
                const me = grid[idx];

                // Quick border check (4-connected neighbors)
                if (grid[idx - w] === me && grid[idx + w] === me &&
                    grid[idx + 1] === me && grid[idx - 1] === me) continue;

                // Count neighbors in RADIUS×RADIUS neighborhood
                const counts = new Map<number, number>();
                for (let dy = -RADIUS; dy <= RADIUS; dy++) {
                    for (let dx = -RADIUS; dx <= RADIUS; dx++) {
                        const nIdx = (y + dy) * w + (x + dx);
                        const owner = grid[nIdx];
                        counts.set(owner, (counts.get(owner) ?? 0) + 1);
                    }
                }

                // Pick majority
                let maxCount = 0;
                let winner = me;
                for (const [owner, count] of counts) {
                    if (count > maxCount) {
                        maxCount = count;
                        winner = owner;
                    }
                }
                tmp[idx] = winner;
            }
        }

        grid.set(tmp);
    }
}

/**
 * Angular stepping: scan rows and columns, find short runs of an owner
 * sandwiched between longer runs of another owner, and absorb them.
 * This creates clean edges with fewer jagged transitions.
 * 'iterations' controls the minimum run length threshold.
 */
function angularBorders(grid: Uint8Array, w: number, h: number, iterations: number): void {
    const minRun = Math.max(3, iterations * 10); // aggressive: slider 1 = 10px, slider 5 = 50px

    // Horizontal pass: absorb short horizontal runs
    for (let y = 0; y < h; y++) {
        let runStart = 0;
        let runOwner = grid[y * w];

        for (let x = 1; x <= w; x++) {
            const cur = x < w ? grid[y * w + x] : 255; // sentinel
            if (cur === runOwner && x < w) continue;

            // End of run from runStart to x-1
            const runLen = x - runStart;

            if (runLen < minRun && runStart > 0 && x < w) {
                // Short run — absorb into the left neighbor's owner
                const leftOwner = grid[y * w + runStart - 1];
                for (let fill = runStart; fill < x; fill++) {
                    grid[y * w + fill] = leftOwner;
                }
            }

            runStart = x;
            runOwner = cur;
        }
    }

    // Vertical pass: absorb short vertical runs
    for (let x = 0; x < w; x++) {
        let runStart = 0;
        let runOwner = grid[x];

        for (let y = 1; y <= h; y++) {
            const cur = y < h ? grid[y * w + x] : 255;
            if (cur === runOwner && y < h) continue;

            const runLen = y - runStart;

            if (runLen < minRun && runStart > 0 && y < h) {
                const topOwner = grid[(runStart - 1) * w + x];
                for (let fill = runStart; fill < y; fill++) {
                    grid[fill * w + x] = topOwner;
                }
            }

            runStart = y;
            runOwner = cur;
        }
    }
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
    const {
        canvasW, canvasH, stars, numOwners, ownerRGB,
        alpha, lanes, laneInfluence, laneWidth, directFalloff,
        pressure, threshold,
        borderWidth, borderAlpha, borderBrighten,
        pattern, patternScale, patternRotation,
        boardLeft, boardTop, boardRight, boardBottom, fadeDistCanvas,
        borderFeel, borderSmooth,
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
                inf *= 1 + Math.log2(1 + s.ships) * 0.5 * pressure;
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
    // Always create ownerGrid when border or post-processing needs it
    const needsOwnerGrid = borderWidth > 0 || (borderFeel !== 'raw' && borderSmooth > 0);
    const ownerGrid = needsOwnerGrid ? new Uint8Array(canvasW * canvasH) : null;

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

    // ── Post-process ownerGrid: border feel ──
    if (ownerGrid && borderFeel !== 'raw' && borderSmooth > 0) {
        postProcessOwnerGrid(ownerGrid, canvasW, canvasH, borderFeel, borderSmooth);
        // Re-apply colors from post-processed ownerGrid
        for (let py = 0; py < canvasH; py++) {
            for (let px = 0; px < canvasW; px++) {
                const gi = py * canvasW + px;
                const owner = ownerGrid[gi];
                if (owner >= numOwners) continue; // skip unclaimed
                const pi = gi * 4;
                const r = ownerRGB[owner * 3];
                const g = ownerRGB[owner * 3 + 1];
                const b = ownerRGB[owner * 3 + 2];
                if (pixels[pi] !== r || pixels[pi + 1] !== g || pixels[pi + 2] !== b) {
                    pixels[pi] = r;
                    pixels[pi + 1] = g;
                    pixels[pi + 2] = b;
                    // Keep existing alpha
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
