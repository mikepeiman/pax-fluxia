import { describe, expect, it } from 'vitest';
import {
    deriveStableRegionId,
    deriveRegionFallbackId,
    isVirtualSiteId,
    hashString32,
} from './regionIdentity';

describe('isVirtualSiteId', () => {
    it('flags synthetic constraint sites and not real stars', () => {
        expect(isVirtualSiteId('corridor_12')).toBe(true);
        expect(isVirtualSiteId('disconnect_3')).toBe(true);
        expect(isVirtualSiteId('msr_support_7')).toBe(true);
        expect(isVirtualSiteId('star-42')).toBe(false);
        expect(isVirtualSiteId('42')).toBe(false);
    });
});

describe('deriveStableRegionId', () => {
    it('is independent of star-id order', () => {
        const a = deriveStableRegionId('red', ['s3', 's1', 's2']);
        const b = deriveStableRegionId('red', ['s1', 's2', 's3']);
        const c = deriveStableRegionId('red', ['s2', 's3', 's1']);
        expect(a).toBe(b);
        expect(b).toBe(c);
    });

    it('does not depend on geometry/centroid — stable under conquest morph', () => {
        // The same owner + same star set yields the same id no matter how the
        // territory's polygon shifts. This is the property the centroid-hash
        // anti-pattern lacked (its id drifted as geometry moved).
        const before = deriveStableRegionId('red', ['s1', 's2']);
        const afterMorph = deriveStableRegionId('red', ['s1', 's2']);
        expect(afterMorph).toBe(before);
    });

    it('produces distinct ids for distinct star sets without iteration-order suffixes', () => {
        const r1 = deriveStableRegionId('red', ['s1', 's2']);
        const r2 = deriveStableRegionId('red', ['s3', 's4']);
        expect(r1).not.toBe(r2);
        // No ":0"/":1" collision-suffix counters — ids are pure functions of
        // their inputs, independent of build/iteration order (adversary fix #2).
        expect(r1).not.toMatch(/:\d+$/);
        expect(r2).not.toMatch(/:\d+$/);
    });

    it('anchors identity on real stars, ignoring virtual sites', () => {
        const withVirtual = deriveStableRegionId('red', [
            's1',
            'corridor_9',
            's2',
            'msr_support_2',
        ]);
        const realOnly = deriveStableRegionId('red', ['s1', 's2']);
        expect(withVirtual).toBe(realOnly);
    });

    it('falls back to the full set only when no real anchors exist', () => {
        const id = deriveStableRegionId('red', ['corridor_1', 'disconnect_2']);
        expect(id).toBe('region:red:corridor_1+disconnect_2');
    });

    it('returns an :empty marker for a truly empty set', () => {
        expect(deriveStableRegionId('red', [])).toBe('region:red:empty');
    });

    it('keys by owner', () => {
        expect(deriveStableRegionId('red', ['s1'])).not.toBe(
            deriveStableRegionId('blue', ['s1']),
        );
    });
});

describe('deriveRegionFallbackId', () => {
    it('is stable for a given polygon and distinct per geometry', () => {
        const poly1: [number, number][] = [
            [0, 0],
            [10, 0],
            [10, 10],
        ];
        const poly2: [number, number][] = [
            [0, 0],
            [20, 0],
            [20, 20],
        ];
        expect(deriveRegionFallbackId('red', poly1)).toBe(
            deriveRegionFallbackId('red', poly1),
        );
        expect(deriveRegionFallbackId('red', poly1)).not.toBe(
            deriveRegionFallbackId('red', poly2),
        );
    });

    it('quantizes to 2dp so sub-centipixel jitter does not change the id', () => {
        const a: [number, number][] = [
            [0, 0],
            [10, 0],
            [10, 10],
        ];
        const b: [number, number][] = [
            [0.001, 0.001],
            [10.001, 0],
            [10, 10],
        ];
        expect(deriveRegionFallbackId('red', a)).toBe(
            deriveRegionFallbackId('red', b),
        );
    });
});

describe('hashString32', () => {
    it('is deterministic, distinct per input, and 8 hex chars', () => {
        expect(hashString32('abc')).toBe(hashString32('abc'));
        expect(hashString32('abc')).toMatch(/^[0-9a-f]{8}$/);
        expect(hashString32('abc')).not.toBe(hashString32('abd'));
    });
});
