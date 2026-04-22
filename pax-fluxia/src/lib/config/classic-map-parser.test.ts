import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseClassicMap } from '$lib/config/classic-map-parser';

function loadClassicMapText(fileName: string): string {
    return readFileSync(
        path.resolve(process.cwd(), '..', 'resources', 'pax-galaxia-maps', fileName),
        'utf8',
    );
}

describe('classic-map-parser portal support', () => {
    it('parses Boxed numeric star types as portal groups', () => {
        const parsed = parseClassicMap('Boxed', loadClassicMapText('Boxed.txt'));
        const portals = parsed.stars.filter((star) => star.starType === 'portal');

        expect(portals).toHaveLength(4);
        expect(portals.map((star) => star.portalGroup)).toEqual(['2', '3', '3', '2']);
    });

    it('preserves portal groups with more than two members', () => {
        const parsed = parseClassicMap('DSpokes', loadClassicMapText('DSpokes.txt'));
        const portals = parsed.stars.filter((star) => star.starType === 'portal');
        const groupCounts = portals.reduce<Record<string, number>>((counts, star) => {
            const portalGroup = star.portalGroup ?? '?';
            counts[portalGroup] = (counts[portalGroup] ?? 0) + 1;
            return counts;
        }, {});

        expect(groupCounts['2']).toBe(4);
        expect(groupCounts['3']).toBe(2);
    });
});
