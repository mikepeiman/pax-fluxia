import { describe, expect, it } from 'vitest';
import { getOrbitSlot } from './render.utils';

// The orbit fast path replaces per-ship Math.cos/Math.sin with cached base-angle
// trig combined with per-layer ring-rotation trig via the angle-addition identity.
// These tests prove the direction vector still equals cos/sin of the returned
// angle exactly (within float epsilon) across indices, times, and ship counts.
describe('getOrbitSlot (cached-trig fast path)', () => {
    it('direction matches cos/sin of the returned angle (no bias)', () => {
        let checked = 0;
        for (let time = 0; time <= 5000; time += 137) {
            for (let totalShips = 1; totalShips <= 60; totalShips += 7) {
                for (let index = 0; index < totalShips; index += 1) {
                    const slot = getOrbitSlot(
                        index,
                        100,
                        200,
                        12,
                        time,
                        undefined,
                        0,
                        totalShips,
                    );
                    expect(slot.ndx).toBeCloseTo(Math.cos(slot.angle), 9);
                    expect(slot.ndy).toBeCloseTo(Math.sin(slot.angle), 9);
                    expect(slot.ndx * slot.ndx + slot.ndy * slot.ndy).toBeCloseTo(
                        1,
                        9,
                    );
                    expect(slot.x).toBeCloseTo(100 + slot.ndx * slot.radius, 6);
                    expect(slot.y).toBeCloseTo(200 + slot.ndy * slot.radius, 6);
                    checked += 1;
                }
            }
        }
        expect(checked).toBeGreaterThan(200);
    });

    it('direction matches cos/sin of the angle with directional bias active', () => {
        for (let index = 0; index < 40; index += 1) {
            const slot = getOrbitSlot(index, 0, 0, 12, 1234, Math.PI / 3, 0.6, 40);
            expect(slot.ndx).toBeCloseTo(Math.cos(slot.angle), 9);
            expect(slot.ndy).toBeCloseTo(Math.sin(slot.angle), 9);
        }
    });

    it('is deterministic across repeated calls (cache reuse is consistent)', () => {
        const a = getOrbitSlot(5, 50, 50, 12, 999, undefined, 0, 30);
        const b = getOrbitSlot(5, 50, 50, 12, 999, undefined, 0, 30);
        expect(b.x).toBe(a.x);
        expect(b.y).toBe(a.y);
        expect(b.ndx).toBe(a.ndx);
        expect(b.ndy).toBe(a.ndy);
        expect(b.layer).toBe(a.layer);
        expect(b.radius).toBe(a.radius);
    });
});
