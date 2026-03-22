import { describe, expect, it } from 'vitest';
import { resolveTerritoryArchitectureRoute } from './TerritoryArchitectureRouter';

describe('resolveTerritoryArchitectureRoute', () => {
    it('routes canonical style to clean bridge when architecture is clean', () => {
        const decision = resolveTerritoryArchitectureRoute({
            renderMode: 'territory_canonical',
            architecturePath: 'clean',
        });

        expect(decision.route).toBe('canonical_clean_bridge');
        expect(decision.isCanonicalStyle).toBe(true);
    });

    it('routes canonical style to legacy bridge when architecture is legacy', () => {
        const decision = resolveTerritoryArchitectureRoute({
            renderMode: 'territory_canonical',
            architecturePath: 'legacy',
        });

        expect(decision.route).toBe('canonical_legacy_bridge');
        expect(decision.isCanonicalStyle).toBe(true);
    });

    it('routes non-canonical style to legacy renderer regardless of architecture toggle', () => {
        const cleanDecision = resolveTerritoryArchitectureRoute({
            renderMode: 'distance_field',
            architecturePath: 'clean',
        });
        const legacyDecision = resolveTerritoryArchitectureRoute({
            renderMode: 'distance_field',
            architecturePath: 'legacy',
        });

        expect(cleanDecision.route).toBe('legacy_style_renderer');
        expect(legacyDecision.route).toBe('legacy_style_renderer');
        expect(cleanDecision.isCanonicalStyle).toBe(false);
        expect(legacyDecision.isCanonicalStyle).toBe(false);
    });

    it('defaults to canonical clean route for missing values', () => {
        const decision = resolveTerritoryArchitectureRoute({});
        expect(decision.route).toBe('canonical_clean_bridge');
    });
});
