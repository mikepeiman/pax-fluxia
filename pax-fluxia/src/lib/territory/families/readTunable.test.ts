import { describe, it, expect } from 'vitest';
import type { RenderFamilyInput } from './RenderFamilyTypes';
import { readTunableBoolean, readTunableNumber, readTunableString } from './readTunable';

function inputWith(tunables: Record<string, unknown>): RenderFamilyInput {
    return { tunables: new Map(Object.entries(tunables)) } as unknown as RenderFamilyInput;
}

describe('readTunable', () => {
    describe('readTunableNumber', () => {
        it('returns the value when it is a finite number', () => {
            expect(readTunableNumber(inputWith({ K: 12.5 }), 'K', 99)).toBe(12.5);
        });

        it('accepts zero and negatives rather than treating them as absent', () => {
            expect(readTunableNumber(inputWith({ K: 0 }), 'K', 99)).toBe(0);
            expect(readTunableNumber(inputWith({ K: -3 }), 'K', 99)).toBe(-3);
        });

        it('falls back when the key is missing', () => {
            expect(readTunableNumber(inputWith({}), 'K', 99)).toBe(99);
        });

        it('falls back for NaN and Infinity — a non-finite value must never reach geometry', () => {
            expect(readTunableNumber(inputWith({ K: NaN }), 'K', 99)).toBe(99);
            expect(readTunableNumber(inputWith({ K: Infinity }), 'K', 99)).toBe(99);
            expect(readTunableNumber(inputWith({ K: -Infinity }), 'K', 99)).toBe(99);
        });

        it('falls back for a wrong-typed value rather than coercing it', () => {
            expect(readTunableNumber(inputWith({ K: '12' }), 'K', 99)).toBe(99);
            expect(readTunableNumber(inputWith({ K: true }), 'K', 99)).toBe(99);
            expect(readTunableNumber(inputWith({ K: null }), 'K', 99)).toBe(99);
        });
    });

    describe('readTunableBoolean', () => {
        it('returns the value when it is a boolean', () => {
            expect(readTunableBoolean(inputWith({ K: true }), 'K', false)).toBe(true);
            expect(readTunableBoolean(inputWith({ K: false }), 'K', true)).toBe(false);
        });

        it('falls back when the key is missing', () => {
            expect(readTunableBoolean(inputWith({}), 'K', true)).toBe(true);
        });

        it('does NOT accept truthy/falsy stand-ins — only real booleans', () => {
            expect(readTunableBoolean(inputWith({ K: 1 }), 'K', false)).toBe(false);
            expect(readTunableBoolean(inputWith({ K: 0 }), 'K', true)).toBe(true);
            expect(readTunableBoolean(inputWith({ K: 'true' }), 'K', false)).toBe(false);
        });
    });

    describe('readTunableString', () => {
        const allowed = ['square', 'hex_offset'] as const;

        it('returns the value when it is in the allowed set', () => {
            expect(readTunableString(inputWith({ K: 'hex_offset' }), 'K', 'square', allowed)).toBe(
                'hex_offset',
            );
        });

        it('falls back for a string outside the allowed set', () => {
            expect(readTunableString(inputWith({ K: 'triangles' }), 'K', 'square', allowed)).toBe(
                'square',
            );
        });

        it('falls back when the key is missing or wrong-typed', () => {
            expect(readTunableString(inputWith({}), 'K', 'square', allowed)).toBe('square');
            expect(readTunableString(inputWith({ K: 7 }), 'K', 'square', allowed)).toBe('square');
        });
    });
});
