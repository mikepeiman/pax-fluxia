// ============================================================================
// Lane polylines — curved centerlines between star centers (mapgen + runtime).
// Single quadratic Bézier, binary search on perpendicular offset; samples checked
// vs obstacle centers at `clearance`. Falls back to straight [A,B].
// ============================================================================

import type { Connectable, MapConnection } from './types';

export type MapLaneMode = 'straight' | 'curved';

function hypot(dx: number, dy: number): number {
    return Math.sqrt(dx * dx + dy * dy);
}

function quadBezierPoint(
    ax: number, ay: number,
    cx: number, cy: number,
    bx: number, by: number,
    t: number,
): [number, number] {
    const mt = 1 - t;
    const x = mt * mt * ax + 2 * mt * t * cx + t * t * bx;
    const y = mt * mt * ay + 2 * mt * t * cy + t * t * by;
    return [x, y];
}

function bezierSamplesClear(
    ax: number, ay: number,
    cx: number, cy: number,
    bx: number, by: number,
    obstacles: Array<{ x: number; y: number }>,
    clearance: number,
): boolean {
    for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const [px, py] = quadBezierPoint(ax, ay, cx, cy, bx, by, t);
        for (const o of obstacles) {
            if (hypot(px - o.x, py - o.y) < clearance) return false;
        }
    }
    return true;
}

/**
 * Waypoints from star A center to star B center (inclusive endpoints).
 */
export function computeLaneWaypoints(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    obstacleCenters: Array<{ x: number; y: number }>,
    clearance: number,
    mode: MapLaneMode,
): Array<[number, number]> {
    if (mode === 'straight') {
        return [[ax, ay], [bx, by]];
    }

    const chord = hypot(bx - ax, by - ay);
    if (chord < 1) {
        return [[ax, ay], [bx, by]];
    }

    const mx = (ax + bx) * 0.5;
    const my = (ay + by) * 0.5;
    const ux = (bx - ax) / chord;
    const uy = (by - ay) / chord;
    const px = -uy;
    const py = ux;

    const dMax = Math.min(chord * 0.38, 220);
    let lo = 0;
    let hi = dMax;
    let best = 0;
    for (let iter = 0; iter < 14; iter++) {
        const mid = (lo + hi) * 0.5;
        const cx = mx + px * mid;
        const cy = my + py * mid;
        if (bezierSamplesClear(ax, ay, cx, cy, bx, by, obstacleCenters, clearance)) {
            best = mid;
            lo = mid;
        } else {
            hi = mid;
        }
    }

    if (best < chord * 0.02) {
        return [[ax, ay], [bx, by]];
    }

    const cx = mx + px * best;
    const cy = my + py * best;
    const steps = 16;
    const out: Array<[number, number]> = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        out.push(quadBezierPoint(ax, ay, cx, cy, bx, by, t));
    }
    return out;
}

export function attachLaneWaypointsToConnections<T extends Connectable>(
    nodes: T[],
    connections: MapConnection[],
    mode: MapLaneMode,
    clearance: number,
): void {
    const pos = new Map(nodes.map((n) => [n.id, n]));
    for (const c of connections) {
        const a = pos.get(c.sourceId);
        const b = pos.get(c.targetId);
        if (!a || !b) continue;
        const obstacles = nodes
            .filter((n) => n.id !== c.sourceId && n.id !== c.targetId)
            .map((n) => ({ x: n.x, y: n.y }));
        c.laneWaypoints = computeLaneWaypoints(
            a.x, a.y, b.x, b.y, obstacles, clearance, mode,
        );
    }
}
