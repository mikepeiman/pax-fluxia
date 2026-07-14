import type { RenderFamilyInput } from './RenderFamilyTypes';

/**
 * Typed reads of a render family's live tunables.
 *
 * `input.tunables` is an untyped `Map<string, unknown>` fed from the live config
 * source, so every family has to validate what it pulls out. Each accessor keeps
 * the value only if it is actually of the expected type, and falls back
 * otherwise — a tunable that has been removed, is mistyped, or arrives as NaN
 * must never reach the geometry.
 *
 * These lived as four byte-identical private copies (metaball scene base,
 * CellGrid Phase Edges, CellGrid Phase Field, Grid Gradient settings) until the
 * cleanup campaign unified them here.
 */

export function readTunableNumber(
    input: RenderFamilyInput,
    key: string,
    fallback: number,
): number {
    const value = input.tunables.get(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function readTunableBoolean(
    input: RenderFamilyInput,
    key: string,
    fallback: boolean,
): boolean {
    const value = input.tunables.get(key);
    return typeof value === 'boolean' ? value : fallback;
}

/** Reads a string tunable, accepting it only if it is one of `allowed`. */
export function readTunableString<T extends string>(
    input: RenderFamilyInput,
    key: string,
    fallback: T,
    allowed: readonly T[],
): T {
    const value = input.tunables.get(key);
    if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
        return value as T;
    }
    return fallback;
}
