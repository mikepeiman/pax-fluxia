import { chaikinSmoothPolyline } from './geometry/chaikin';
import type {
    MetaballWorkerRequest,
    MetaballWorkerResponse,
    MetaballWorkerSample,
    MetaballWorkerStar,
    MetaballWorkerStroke,
} from './metaballGridWorkerTypes';

type MetaballCellWinner = {
    maxPlayer: number;
    maxInf: number;
    secondInf: number;
    secondPlayer: number;
};

type MergedSeg = { ax: number; ay: number; bx: number; by: number };

const EPS = 1e-4;

function rgbToHex(r: number, g: number, b: number): number {
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

function rgbToHSL(r: number, g: number, b: number): [number, number, number] {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
    return [h, s, l];
}

function hslToRGB(h: number, s: number, l: number): [number, number, number] {
    if (s === 0) {
        const v = Math.round(l * 255);
        return [v, v, v];
    }
    function hue2rgb(p: number, q: number, t: number): number {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hn = h / 360;
    return [
        Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
        Math.round(hue2rgb(p, q, hn) * 255),
        Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
    ];
}

function applyFillHSL(
    r: number,
    g: number,
    b: number,
    satMult: number,
    lightMult: number,
): [number, number, number] {
    if (satMult === 1 && lightMult === 1) return [r, g, b];
    const [h, s, l] = rgbToHSL(r, g, b);
    return hslToRGB(
        h,
        Math.max(0, Math.min(1, s * satMult)),
        Math.max(0, Math.min(1, l * lightMult)),
    );
}

function ensureCenters(length: number, origin: number, cellSize: number): Float32Array {
    const next = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        next[i] = origin + (i + 0.5) * cellSize;
    }
    return next;
}

function ensureRowStart(rows: number, cols: number): Int32Array {
    const rowStart = new Int32Array(rows);
    for (let row = 0; row < rows; row++) rowStart[row] = row * cols;
    return rowStart;
}

function accumulateSamplesIntoFields(params: {
    samples: readonly MetaballWorkerSample[];
    geomField: Float32Array;
    realField: Float32Array;
    numPlayers: number;
    cols: number;
    rows: number;
    gridOriginX: number;
    gridOriginY: number;
    cellSize: number;
    radius: number;
    colCenters: Float32Array;
    rowCenters: Float32Array;
    rowStart: Int32Array;
    falloffType: string;
}): void {
    const radius = params.radius;
    const radiusCutoff = radius * 2;
    const radiusCutoffSq = radiusCutoff * radiusCutoff;
    const inverseRadiusSq = radius > 0 ? 1 / (radius * radius) : 0;
    const gaussianSigma = radius / 1.2;
    const gaussianExponentScale =
        gaussianSigma > 0 ? -0.5 / (gaussianSigma * gaussianSigma) : 0;
    const smoothstepRadius = radius * 1.5;
    const inverseSmoothstepRadius =
        smoothstepRadius > 0 ? 1 / smoothstepRadius : 0;

    for (let sampleIdx = 0; sampleIdx < params.samples.length; sampleIdx++) {
        const sample = params.samples[sampleIdx]!;
        const minCol = Math.max(
            0,
            Math.floor((sample.x - radiusCutoff - params.gridOriginX) / params.cellSize),
        );
        const maxCol = Math.min(
            params.cols - 1,
            Math.floor((sample.x + radiusCutoff - params.gridOriginX) / params.cellSize),
        );
        const minRow = Math.max(
            0,
            Math.floor((sample.y - radiusCutoff - params.gridOriginY) / params.cellSize),
        );
        const maxRow = Math.min(
            params.rows - 1,
            Math.floor((sample.y + radiusCutoff - params.gridOriginY) / params.cellSize),
        );
        const isVirtual = sample.corridorVirtual || sample.disconnectVirtual;
        const playerIdx = sample.playerIdx;
        if (playerIdx < 0 || playerIdx >= params.numPlayers) continue;

        if (params.falloffType === 'gaussian') {
            for (let row = minRow; row <= maxRow; row++) {
                const py = params.rowCenters[row]!;
                const rowOffset = params.rowStart[row]!;
                const dy = py - sample.y;
                const dy2 = dy * dy;
                let fieldOffset = (rowOffset + minCol) * params.numPlayers + playerIdx;
                for (let col = minCol; col <= maxCol; col++, fieldOffset += params.numPlayers) {
                    const dx = params.colCenters[col]! - sample.x;
                    const dist2 = dx * dx + dy2;
                    if (dist2 > radiusCutoffSq) continue;
                    const value = Math.exp(dist2 * gaussianExponentScale) * sample.strength;
                    params.geomField[fieldOffset] += value;
                    if (!isVirtual) params.realField[fieldOffset] += value;
                }
            }
            continue;
        }

        if (params.falloffType === 'inverse-square') {
            for (let row = minRow; row <= maxRow; row++) {
                const py = params.rowCenters[row]!;
                const rowOffset = params.rowStart[row]!;
                const dy = py - sample.y;
                const dy2 = dy * dy;
                let fieldOffset = (rowOffset + minCol) * params.numPlayers + playerIdx;
                for (let col = minCol; col <= maxCol; col++, fieldOffset += params.numPlayers) {
                    const dx = params.colCenters[col]! - sample.x;
                    const dist2 = dx * dx + dy2;
                    if (dist2 > radiusCutoffSq) continue;
                    const value = sample.strength / (1 + dist2 * inverseRadiusSq);
                    params.geomField[fieldOffset] += value;
                    if (!isVirtual) params.realField[fieldOffset] += value;
                }
            }
            continue;
        }

        for (let row = minRow; row <= maxRow; row++) {
            const py = params.rowCenters[row]!;
            const dy = py - sample.y;
            const dy2 = dy * dy;
            const rowOffset = params.rowStart[row]!;
            let fieldOffset = (rowOffset + minCol) * params.numPlayers + playerIdx;
            for (let col = minCol; col <= maxCol; col++, fieldOffset += params.numPlayers) {
                const dx = params.colCenters[col]! - sample.x;
                const dist2 = dx * dx + dy2;
                if (dist2 > radiusCutoffSq) continue;
                const t = Math.max(
                    0,
                    Math.min(1, 1 - Math.sqrt(dist2) * inverseSmoothstepRadius),
                );
                const value = t * t * (3 - 2 * t) * sample.strength;
                params.geomField[fieldOffset] += value;
                if (!isVirtual) params.realField[fieldOffset] += value;
            }
        }
    }
}

function resolveMetaballCellWinner(
    field: Float32Array,
    offset: number,
    numPlayers: number,
    forcedPlayer: number,
    dominanceFilterOn: boolean,
    dominanceMinActive: number,
): MetaballCellWinner | null {
    let maxInf = 0;
    let maxPlayer = forcedPlayer >= 0 ? forcedPlayer : -1;
    let secondInf = 0;
    let secondPlayer = -1;

    if (forcedPlayer >= 0) {
        maxInf = field[offset + forcedPlayer] ?? 0;
        for (let p = 0; p < numPlayers; p++) {
            if (p === forcedPlayer) continue;
            const value = field[offset + p] ?? 0;
            if (value > secondInf) {
                secondInf = value;
                secondPlayer = p;
            }
        }
    } else {
        for (let p = 0; p < numPlayers; p++) {
            const value = field[offset + p] ?? 0;
            if (value > maxInf) {
                secondInf = maxInf;
                secondPlayer = maxPlayer;
                maxInf = value;
                maxPlayer = p;
            } else if (value > secondInf) {
                secondInf = value;
                secondPlayer = p;
            }
        }
        if (maxPlayer < 0) return null;
    }

    const denomRaw = maxInf + secondInf;
    const dominance = denomRaw > 1e-12 ? maxInf / denomRaw : 1;
    if (dominanceFilterOn && dominance < dominanceMinActive) return null;
    return { maxPlayer, maxInf, secondInf, secondPlayer };
}

function metaballBorderRgbForPair(
    leftOwner: number,
    rightOwner: number,
    playerColors: ReadonlyArray<readonly [number, number, number]>,
    borderSatMult: number,
    borderLightMult: number,
): [number, number, number] {
    const left = playerColors[leftOwner] ?? [255, 255, 255];
    const right =
        rightOwner >= 0 ? playerColors[rightOwner] ?? left : left;
    const baseR = (left[0] + right[0]) * 0.5;
    const baseG = (left[1] + right[1]) * 0.5;
    const baseB = (left[2] + right[2]) * 0.5;
    return applyFillHSL(baseR, baseG, baseB, borderSatMult, borderLightMult);
}

function mergeVerticalIntervals(intervals: readonly { y0: number; y1: number }[]): { y0: number; y1: number }[] {
    const sorted = [...intervals].sort((a, b) => a.y0 - b.y0);
    const merged: { y0: number; y1: number }[] = [];
    for (const interval of sorted) {
        const last = merged[merged.length - 1];
        if (!last || interval.y0 > last.y1 + EPS) merged.push({ ...interval });
        else last.y1 = Math.max(last.y1, interval.y1);
    }
    return merged;
}

function mergeHorizontalIntervals(intervals: readonly { x0: number; x1: number }[]): { x0: number; x1: number }[] {
    const sorted = [...intervals].sort((a, b) => a.x0 - b.x0);
    const merged: { x0: number; x1: number }[] = [];
    for (const interval of sorted) {
        const last = merged[merged.length - 1];
        if (!last || interval.x0 > last.x1 + EPS) merged.push({ ...interval });
        else last.x1 = Math.max(last.x1, interval.x1);
    }
    return merged;
}

function ptKey(x: number, y: number): string {
    return `${Math.round(x * 1000)}:${Math.round(y * 1000)}`;
}

function chainSegmentsToPolylines(segments: readonly MergedSeg[]): [number, number][][] {
    const remaining = segments.map((segment) => ({ ...segment }));
    const startMap = new Map<string, number[]>();
    const endMap = new Map<string, number[]>();

    const pushIndex = (map: Map<string, number[]>, key: string, index: number) => {
        const bucket = map.get(key);
        if (bucket) bucket.push(index);
        else map.set(key, [index]);
    };

    remaining.forEach((segment, index) => {
        pushIndex(startMap, ptKey(segment.ax, segment.ay), index);
        pushIndex(endMap, ptKey(segment.bx, segment.by), index);
    });

    const used = new Uint8Array(remaining.length);
    const chains: [number, number][][] = [];

    for (let index = 0; index < remaining.length; index++) {
        if (used[index]) continue;
        used[index] = 1;
        const segment = remaining[index]!;
        const chain: [number, number][] = [
            [segment.ax, segment.ay],
            [segment.bx, segment.by],
        ];

        let extended = true;
        while (extended) {
            extended = false;
            const head = chain[0]!;
            const tail = chain[chain.length - 1]!;

            const tailMatches = startMap.get(ptKey(tail[0], tail[1])) ?? [];
            for (const nextIndex of tailMatches) {
                if (used[nextIndex]) continue;
                const next = remaining[nextIndex]!;
                used[nextIndex] = 1;
                chain.push([next.bx, next.by]);
                extended = true;
                break;
            }
            if (extended) continue;

            const headMatches = endMap.get(ptKey(head[0], head[1])) ?? [];
            for (const prevIndex of headMatches) {
                if (used[prevIndex]) continue;
                const prev = remaining[prevIndex]!;
                used[prevIndex] = 1;
                chain.unshift([prev.ax, prev.ay]);
                extended = true;
                break;
            }
        }

        chains.push(chain);
    }

    return chains;
}

function distPointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq <= 1e-9) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const cx = ax + dx * t;
    const cy = ay + dy * t;
    return Math.hypot(px - cx, py - cy);
}

function segmentNearHotCombat(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    leftOwner: number,
    rightOwner: number,
    gameTick: number | undefined,
    combatTicks: number,
    ownedStars: readonly MetaballWorkerStar[],
    combatProximityPx: number,
): boolean {
    if (gameTick === undefined || combatTicks <= 0) return false;
    for (const star of ownedStars) {
        if (star.clusterIdx !== leftOwner && star.clusterIdx !== rightOwner) continue;
        const combatAge = gameTick - (star.lastCombatTick ?? -9e8);
        const attackAge = gameTick - (star.lastAttackTick ?? -9e8);
        if (combatAge >= combatTicks && attackAge >= combatTicks) continue;
        if (distPointToSegment(star.x, star.y, ax, ay, bx, by) <= combatProximityPx) {
            return true;
        }
    }
    return false;
}

function solveMetaballFrame(input: MetaballWorkerRequest): Omit<MetaballWorkerResponse, 'requestId' | 'fingerprint'> {
    const totalStart = performance.now();
    const { config } = input;
    const numPlayers = input.playerColors.length;
    const pad = Math.max(config.worldWidth, config.worldHeight) * config.coverage;
    const gridOriginX = -pad;
    const gridOriginY = -pad;
    const gridW = config.worldWidth + pad * 2;
    const gridH = config.worldHeight + pad * 2;
    const cols = Math.ceil(gridW / config.cellSize);
    const rows = Math.ceil(gridH / config.cellSize);
    const cellCount = cols * rows;
    const gridFieldSize = cellCount * Math.max(1, numPlayers);
    const colCenters = ensureCenters(cols, gridOriginX, config.cellSize);
    const rowCenters = ensureCenters(rows, gridOriginY, config.cellSize);
    const rowStart = ensureRowStart(rows, cols);
    const geomField = new Float32Array(gridFieldSize);
    const realField = new Float32Array(gridFieldSize);

    accumulateSamplesIntoFields({
        samples: input.staticSamples,
        geomField,
        realField,
        numPlayers,
        cols,
        rows,
        gridOriginX,
        gridOriginY,
        cellSize: config.cellSize,
        radius: config.radius,
        colCenters,
        rowCenters,
        rowStart,
        falloffType: config.falloffType,
    });
    if (input.dynamicSamples.length > 0) {
        accumulateSamplesIntoFields({
            samples: input.dynamicSamples,
            geomField,
            realField,
            numPlayers,
            cols,
            rows,
            gridOriginX,
            gridOriginY,
            cellSize: config.cellSize,
            radius: config.radius,
            colCenters,
            rowCenters,
            rowStart,
            falloffType: config.falloffType,
        });
    }

    const territoryPixels = new Uint8Array(cellCount * 4);
    const ownerGridGeom = new Int16Array(cellCount);
    ownerGridGeom.fill(-1);
    const msrOwnerGrid = config.msrPx > 0 ? new Int16Array(cellCount) : null;
    if (msrOwnerGrid) {
        msrOwnerGrid.fill(-1);
        const msr2 = config.msrPx * config.msrPx;
        for (let row = 0; row < rows; row++) {
            const py = rowCenters[row]!;
            const rowOffset = rowStart[row]!;
            for (let col = 0; col < cols; col++) {
                const px = colCenters[col]!;
                let bestCluster = -1;
                let bestDist2 = msr2 + 1;
                for (const star of input.ownedStars) {
                    const dx = px - star.x;
                    const dy = py - star.y;
                    const dist2 = dx * dx + dy * dy;
                    if (dist2 > msr2 || dist2 >= bestDist2) continue;
                    bestDist2 = dist2;
                    bestCluster = star.clusterIdx;
                }
                msrOwnerGrid[rowOffset + col] = bestCluster;
            }
        }
    }

    for (let row = 0; row < rows; row++) {
        const rowOffset = rowStart[row]!;
        for (let col = 0; col < cols; col++) {
            const idx = rowOffset + col;
            const forcedPlayer = msrOwnerGrid ? msrOwnerGrid[idx]! : -1;
            const offset = idx * numPlayers;
            const geomWinner = resolveMetaballCellWinner(
                geomField,
                offset,
                numPlayers,
                forcedPlayer,
                config.dominanceFilterOn,
                config.dominanceMinActive,
            );
            if (!geomWinner) continue;
            ownerGridGeom[idx] = geomWinner.maxPlayer;

            let realWinner: MetaballCellWinner | null = null;
            if (!config.fillFollowsGeom) {
                realWinner = resolveMetaballCellWinner(
                    realField,
                    offset,
                    numPlayers,
                    forcedPlayer,
                    config.dominanceFilterOn,
                    config.dominanceMinActive,
                );
                if (!realWinner || realWinner.maxPlayer !== geomWinner.maxPlayer) continue;
            }

            const fillWinner = config.fillFollowsGeom ? geomWinner : realWinner;
            if (!fillWinner) continue;

            let [r, g, b] = input.playerColors[fillWinner.maxPlayer] ?? [0, 0, 0];
            if (fillWinner.secondPlayer >= 0 && fillWinner.secondInf > 1e-9) {
                const total = fillWinner.maxInf + fillWinner.secondInf;
                let blendFactor = fillWinner.maxInf / total;
                const lo = 0.5 - 0.5 / config.sharpness;
                const hi = 0.5 + 0.5 / config.sharpness;
                blendFactor = Math.max(0, Math.min(1, (blendFactor - lo) / (hi - lo)));
                if (blendFactor < 0.99) {
                    const secondColor = input.playerColors[fillWinner.secondPlayer] ?? [r, g, b];
                    r = secondColor[0] + (r - secondColor[0]) * blendFactor;
                    g = secondColor[1] + (g - secondColor[1]) * blendFactor;
                    b = secondColor[2] + (b - secondColor[2]) * blendFactor;
                }
            }

            [r, g, b] = applyFillHSL(r, g, b, config.fillSatMult, config.fillLightMult);
            const fadeAlpha = Math.min(1, fillWinner.maxInf * config.edgeFade) * config.alpha;
            if (fadeAlpha < 0.01) continue;

            const pixelOffset = idx * 4;
            territoryPixels[pixelOffset] = Math.max(0, Math.min(255, Math.round(r)));
            territoryPixels[pixelOffset + 1] = Math.max(0, Math.min(255, Math.round(g)));
            territoryPixels[pixelOffset + 2] = Math.max(0, Math.min(255, Math.round(b)));
            territoryPixels[pixelOffset + 3] = Math.max(
                0,
                Math.min(255, Math.round(fadeAlpha * 255)),
            );
        }
    }

    const solveMs = performance.now() - totalStart;
    const borderStart = performance.now();
    const strokes: MetaballWorkerStroke[] = [];

    if (config.borderWidth > 0 && config.borderAlpha > 0) {
        const verticalMap = new Map<string, { y0: number; y1: number }[]>();
        const horizontalMap = new Map<string, { x0: number; x1: number }[]>();
        const pushInterval = <T>(map: Map<string, T[]>, key: string, value: T) => {
            const list = map.get(key);
            if (list) list.push(value);
            else map.set(key, [value]);
        };

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const owner = ownerGridGeom[row * cols + col]!;
                if (owner < 0) continue;
                if (col > 0) {
                    const leftOwner = ownerGridGeom[row * cols + col - 1]!;
                    if (leftOwner < 0) {
                        pushInterval(verticalMap, `${gridOriginX + col * config.cellSize}:${owner}:-1`, {
                            y0: gridOriginY + row * config.cellSize,
                            y1: gridOriginY + (row + 1) * config.cellSize,
                        });
                    }
                }
                if (row > 0) {
                    const topOwner = ownerGridGeom[(row - 1) * cols + col]!;
                    if (topOwner < 0) {
                        pushInterval(horizontalMap, `${gridOriginY + row * config.cellSize}:${owner}:-1`, {
                            x0: gridOriginX + col * config.cellSize,
                            x1: gridOriginX + (col + 1) * config.cellSize,
                        });
                    }
                }
                if (col + 1 < cols) {
                    const rightOwner = ownerGridGeom[row * cols + col + 1]!;
                    const bx = gridOriginX + (col + 1) * config.cellSize;
                    if (rightOwner >= 0 && rightOwner !== owner) {
                        pushInterval(verticalMap, `${bx}:${owner}:${rightOwner}`, {
                            y0: gridOriginY + row * config.cellSize,
                            y1: gridOriginY + (row + 1) * config.cellSize,
                        });
                    } else if (rightOwner < 0) {
                        pushInterval(verticalMap, `${bx}:${owner}:-1`, {
                            y0: gridOriginY + row * config.cellSize,
                            y1: gridOriginY + (row + 1) * config.cellSize,
                        });
                    }
                }
                if (row + 1 < rows) {
                    const bottomOwner = ownerGridGeom[(row + 1) * cols + col]!;
                    const by = gridOriginY + (row + 1) * config.cellSize;
                    if (bottomOwner >= 0 && bottomOwner !== owner) {
                        pushInterval(horizontalMap, `${by}:${owner}:${bottomOwner}`, {
                            x0: gridOriginX + col * config.cellSize,
                            x1: gridOriginX + (col + 1) * config.cellSize,
                        });
                    } else if (bottomOwner < 0) {
                        pushInterval(horizontalMap, `${by}:${owner}:-1`, {
                            x0: gridOriginX + col * config.cellSize,
                            x1: gridOriginX + (col + 1) * config.cellSize,
                        });
                    }
                }
            }
        }

        type BorderSeg = {
            ax: number;
            ay: number;
            bx: number;
            by: number;
            color: number;
            width: number;
            alpha: number;
        };
        const byStyle = new Map<string, BorderSeg[]>();

        const pushBorderSeg = (
            leftOwner: number,
            rightOwner: number,
            ax: number,
            ay: number,
            bx: number,
            by: number,
        ) => {
            const [r, g, b] = metaballBorderRgbForPair(
                leftOwner,
                rightOwner,
                input.playerColors,
                config.borderSatMult,
                config.borderLightMult,
            );
            const color = rgbToHex(r, g, b);
            const combatNear = segmentNearHotCombat(
                ax,
                ay,
                bx,
                by,
                leftOwner,
                rightOwner,
                config.gameTick,
                config.combatTicks,
                input.ownedStars,
                config.combatProximityPx,
            );
            const sa = input.clusterShips[leftOwner] ?? 0;
            const sb = input.clusterShips[rightOwner] ?? 0;
            const sum = sa + sb + 1;
            const imbalance = Math.abs(sa - sb) / sum;
            const width =
                (1 + (combatNear ? config.combatWBoost : 0) + config.forceRatioScale * imbalance) *
                config.borderWidth;
            const alpha = Math.min(
                1,
                config.borderAlpha *
                    (1 +
                        (combatNear ? config.combatABoost : 0) +
                        config.forceRatioScale * imbalance * 0.5),
            );
            const styleKey = `${color}:${width.toFixed(2)}:${alpha.toFixed(3)}`;
            pushInterval(byStyle, styleKey, { ax, ay, bx, by, color, width, alpha });
        };

        for (const [key, intervals] of verticalMap) {
            const [xs, leftOwnerStr, rightOwnerStr] = key.split(':');
            const x = Number(xs);
            const leftOwner = Number(leftOwnerStr);
            const rightOwner = Number(rightOwnerStr);
            const merged = mergeVerticalIntervals(intervals);
            for (const interval of merged) {
                pushBorderSeg(leftOwner, rightOwner, x, interval.y0, x, interval.y1);
            }
        }

        for (const [key, intervals] of horizontalMap) {
            const [ys, leftOwnerStr, rightOwnerStr] = key.split(':');
            const y = Number(ys);
            const leftOwner = Number(leftOwnerStr);
            const rightOwner = Number(rightOwnerStr);
            const merged = mergeHorizontalIntervals(intervals);
            for (const interval of merged) {
                pushBorderSeg(leftOwner, rightOwner, interval.x0, y, interval.x1, y);
            }
        }

        for (const [styleKey, segments] of byStyle) {
            const [colorPart, widthPart, alphaPart] = styleKey.split(':');
            const chains = chainSegmentsToPolylines(
                segments.map(({ ax, ay, bx, by }) => ({ ax, ay, bx, by })),
            );
            const paths: number[][] = [];
            for (const chain of chains) {
                let points: [number, number][] = chain;
                if (config.chaikinPasses > 0 && points.length >= 3) {
                    points = chaikinSmoothPolyline(points, config.chaikinPasses);
                }
                if (points.length < 2) continue;
                const flat: number[] = [];
                for (const [x, y] of points) {
                    flat.push(x, y);
                }
                paths.push(flat);
            }
            if (paths.length > 0) {
                strokes.push({
                    color: Number(colorPart),
                    width: Number(widthPart),
                    alpha: Number(alphaPart),
                    paths,
                });
            }
        }
    }

    return {
        cols,
        rows,
        cellSize: config.cellSize,
        gridOriginX,
        gridOriginY,
        pixels: territoryPixels.buffer,
        strokes,
        solveMs,
        borderMs: performance.now() - borderStart,
        cellCount,
        numPlayers,
        staticSampleCount: input.staticSamples.length,
        dynamicSampleCount: input.dynamicSamples.length,
    };
}

self.onmessage = (event: MessageEvent<MetaballWorkerRequest>) => {
    const input = event.data;
    const solved = solveMetaballFrame(input);
    const response: MetaballWorkerResponse = {
        requestId: input.requestId,
        fingerprint: input.fingerprint,
        ...solved,
    };
    (self as unknown as Worker).postMessage(response, [response.pixels]);
};
