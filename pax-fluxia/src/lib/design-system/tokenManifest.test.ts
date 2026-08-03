/**
 * tokenManifest.test — guards the single-CSS-token-root contract.
 *
 * Contract (DESIGN_SYSTEM_TOKENS.md):
 *   - Tier 1 (`--pax-*` primitives) and Tier 2 (`--pax-ui-*` semantic roles)
 *     both live in `design-system/pax-theme.css`.
 *   - `app.css` contains only imports, fonts, reset, and global utilities —
 *     NO `--pax-ui-*` definitions. It may *consume* them via `var(--pax-ui-*)`.
 *   - Every id in `PAX_THEME_IDS` has a `[data-pax-theme="<id>"]` block, and
 *     every block corresponds to a real id — the registry and the stylesheet
 *     cannot drift apart.
 *   - Every theme answers the SAME token surface. A theme that omits a token
 *     silently inherits the previous theme's value, which is how "themes" end
 *     up looking near-identical.
 *
 * This test prevents the contract from silently drifting back to the old
 * two-token-root state (Tier 2 in app.css, Tier 1 in pax-theme.css) where
 * the source of a role value was non-obvious.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PAX_THEME_IDS, PAX_THEMES, DEFAULT_PAX_THEME_ID } from './theme';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAX_THEME_CSS = readFileSync(path.join(HERE, 'pax-theme.css'), 'utf-8');
const APP_CSS = readFileSync(
    path.resolve(HERE, '..', '..', 'app.css'),
    'utf-8',
);

/** Every `--pax-ui-<name>:` definition (the colon excludes `var()` references). */
const TIER2_DEF = /--pax-ui-[a-z-]+:/g;
const TIER2_DEFINITIONS = PAX_THEME_CSS.match(TIER2_DEF) ?? [];

/** The body of each `[data-pax-theme="<id>"] { … }` block, keyed by id. */
function themeBlocks(): Map<string, string> {
    const blocks = new Map<string, string>();
    const re = /\[data-pax-theme="([a-z-]+)"\]\s*\{([^}]*)\}/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(PAX_THEME_CSS)) !== null) {
        blocks.set(match[1]!, match[2]!);
    }
    return blocks;
}

/** Tier-1 token names declared inside a block body. */
function declaredTokens(body: string): Set<string> {
    return new Set((body.match(/--pax-[a-z0-9-]+(?=\s*:)/g) ?? []));
}

describe('token manifest — single CSS token root', () => {
    it('pax-theme.css defines the Tier-2 semantic roles', () => {
        expect(TIER2_DEFINITIONS.length).toBeGreaterThan(60);
    });

    it('app.css defines NO Tier-2 roles (it may only consume them)', () => {
        const appDefs = APP_CSS.match(TIER2_DEF) ?? [];
        expect(appDefs, `app.css must not define --pax-ui-* roles:\n${appDefs.join('\n')}`).toEqual([]);
    });

    it('every registered theme has a [data-pax-theme] block', () => {
        for (const id of PAX_THEME_IDS) {
            expect(PAX_THEME_CSS, `missing CSS block for theme "${id}"`).toContain(
                `[data-pax-theme="${id}"]`,
            );
        }
    });

    it('every [data-pax-theme] block is a registered theme', () => {
        const registered = new Set<string>(PAX_THEME_IDS);
        const orphans = [...themeBlocks().keys()].filter((id) => !registered.has(id));
        expect(orphans, `CSS blocks with no entry in PAX_THEME_IDS:\n${orphans.join('\n')}`).toEqual([]);
    });

    it('the default theme is registered and described', () => {
        expect(PAX_THEME_IDS).toContain(DEFAULT_PAX_THEME_ID);
        expect(PAX_THEMES[DEFAULT_PAX_THEME_ID]).toBeDefined();
    });

    it('every theme answers the same Tier-1 token surface', () => {
        // A token a theme forgets is a token it silently inherits from whichever
        // block ran last — the exact failure mode that made earlier "themes"
        // look near-identical. The lead theme defines the required surface.
        const blocks = themeBlocks();
        const lead = declaredTokens(blocks.get(DEFAULT_PAX_THEME_ID) ?? '');
        expect(lead.size, 'lead theme block not found or empty').toBeGreaterThan(40);

        const gaps: string[] = [];
        for (const id of PAX_THEME_IDS) {
            if (id === DEFAULT_PAX_THEME_ID) continue;
            const declared = declaredTokens(blocks.get(id) ?? '');
            for (const token of lead) {
                if (!declared.has(token)) gaps.push(`${id} is missing ${token}`);
            }
        }
        expect(gaps, `themes must re-cast the full token surface:\n${gaps.join('\n')}`).toEqual([]);
    });

    it('Tier-2 roles are re-resolved on every themed element, not only :root', () => {
        // Custom properties substitute at computed-value time. If the Tier-2
        // mapping were declared only on `:root`, an element that re-declares
        // Tier 1 below the root would inherit :root's already-resolved value
        // and keep the wrong theme. The mapping block must match
        // `[data-pax-theme]` itself.
        const tier2Selector = /:root,\s*\[data-pax-theme\]\s*\{/;
        expect(
            tier2Selector.test(PAX_THEME_CSS),
            'the Tier-2 role block must be selected by `:root, [data-pax-theme]`',
        ).toBe(true);
    });

    it('every Tier-2 role maps to a Tier-1 primitive (no raw literal values)', () => {
        // Each `--pax-ui-*: <value>;` line must reference `var(--pax-...)` or
        // `color-mix(... var(--pax- ...) ...)` — never a bare hex/px/number.
        const defBlock = /--pax-ui-[a-z-]+:\s*([^;]+);/g;
        let m: RegExpExecArray | null;
        const offenders: string[] = [];
        while ((m = defBlock.exec(PAX_THEME_CSS)) !== null) {
            const value = m[1]!.trim();
            // color-mix and var() both reference Tier-1; anything else is a raw literal.
            if (!value.includes('var(--pax-') && !value.includes('color-mix(')) {
                offenders.push(`${m[0]}  ←  raw value, no Tier-1 reference`);
            }
        }
        expect(offenders, `Tier-2 roles must map to Tier-1, not raw literals:\n${offenders.join('\n')}`).toEqual([]);
    });
});
