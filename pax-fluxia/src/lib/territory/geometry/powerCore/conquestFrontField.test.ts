/**
 * conquestFrontField.test — the arrival-time-field conquest front. Validates the
 * geometry offline (no visuals): both modes cover the cell 0→1 monotonically
 * with single-owner parts and exact endpoints; radial actually curves (it is the
 * marched iso-contour, not a straight chord).
 */

import { describe, expect, it } from 'vitest';
import { splitCellByFront, type ConquestFront } from './conquestFrontField';
import type { PowerCell, Point } from './powerCoreTypes';

const SQUARE: Point[] = [
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
];

function cell(points: Point[]): PowerCell {
    return { siteId: 'star-x', ownerId: 'old', points } as PowerCell;
}

function polyArea(pts: readonly Point[]): number {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i]!;
        const [bx, by] = pts[(i + 1) % pts.length]!;
        s += ax * by - bx * ay;
    }
    return Math.abs(s / 2);
}

function incomingShare(parts: PowerCell[], ownerIn: string): number {
    let total = 0;
    let inArea = 0;
    for (const p of parts) {
        const a = polyArea(p.points);
        total += a;
        if (p.ownerId === ownerIn) inArea += a;
    }
    return total > 0 ? inArea / total : 0;
}

describe('conquestFrontField', () => {
    it('linear: single-owner parts, share 0→1 monotone, exact endpoints', () => {
        const front: ConquestFront = {
            mode: 'linear', dirX: 1, dirY: 0, originX: 0, originY: 0,
            starId: 'star-x', ownerIn: 'new', ownerOld: 'old',
        };
        let prev = -1;
        for (const q of [0, 0.25, 0.5, 0.75, 1]) {
            const parts = splitCellByFront(cell(SQUARE), front, q);
            for (const p of parts) expect(['new', 'old']).toContain(p.ownerId);
            const share = incomingShare(parts, 'new');
            expect(share).toBeGreaterThanOrEqual(prev - 1e-9);
            prev = share;
        }
        expect(incomingShare(splitCellByFront(cell(SQUARE), front, 0), 'new')).toBeLessThan(0.001);
        expect(incomingShare(splitCellByFront(cell(SQUARE), front, 1), 'new')).toBeGreaterThan(0.999);
        // Linear is the exact two-part convex split at a mid sweep.
        expect(splitCellByFront(cell(SQUARE), front, 0.5).length).toBe(2);
    });

    it('radial: curved marched front, full coverage 0→1, monotone', () => {
        const front: ConquestFront = {
            mode: 'radial', dirX: 1, dirY: 1, originX: -40, originY: -40,
            starId: 'star-x', ownerIn: 'new', ownerOld: 'old', subdiv: 6,
        };
        let prev = -Infinity;
        for (const q of [0.1, 0.3, 0.5, 0.7, 0.9]) {
            const parts = splitCellByFront(cell(SQUARE), front, q);
            for (const p of parts) expect(['new', 'old']).toContain(p.ownerId);
            const share = incomingShare(parts, 'new');
            expect(share).toBeGreaterThan(prev);
            prev = share;
        }
        expect(incomingShare(splitCellByFront(cell(SQUARE), front, 0), 'new')).toBeLessThan(0.03);
        expect(incomingShare(splitCellByFront(cell(SQUARE), front, 1), 'new')).toBeGreaterThan(0.97);
        // Radial marches the iso-contour → many sub-parts (a curve), not one chord.
        expect(splitCellByFront(cell(SQUARE), front, 0.5).length).toBeGreaterThan(2);
    });

    it('radial front differs from linear at the same progress (it curves)', () => {
        const common = {
            dirX: 1, dirY: 0, originX: -40, originY: 50,
            starId: 'star-x', ownerIn: 'new', ownerOld: 'old',
        };
        const lin = incomingShare(splitCellByFront(cell(SQUARE), { ...common, mode: 'linear' }, 0.5), 'new');
        const rad = incomingShare(splitCellByFront(cell(SQUARE), { ...common, mode: 'radial', subdiv: 6 }, 0.5), 'new');
        // Both are mid-ish, but the curved front encloses a different area than
        // the straight chord — proving it is genuinely a different front shape.
        expect(Math.abs(rad - lin)).toBeGreaterThan(0.02);
    });
});
