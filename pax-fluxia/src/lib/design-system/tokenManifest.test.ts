/**
 * tokenManifest.test — guards the single-CSS-token-root contract.
 *
 * Contract (DESIGN_SYSTEM_TOKENS.md):
 *   - Tier 1 (`--pax-*` primitives) and Tier 2 (`--pax-ui-*` semantic roles)
 *     both live in `design-system/pax-theme.css`.
 *   - `app.css` contains only imports, fonts, reset, and global utilities —
 *     NO `--pax-ui-*` definitions. It may *consume* them via `var(--pax-ui-*)`.
 *   - Both skins (`aurelia-drift`, `cyber-flux`) are defined as
 *     `[data-pax-theme="<id>"]` blocks in `pax-theme.css`.
 *
 * This test prevents the contract from silently drifting back to the old
 * two-token-root state (Tier 2 in app.css, Tier 1 in pax-theme.css) where
 * the source of a role value was non-obvious.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAX_THEME_CSS = readFileSync(path.join(HERE, 'pax-theme.css'), 'utf-8');
const APP_CSS = readFileSync(
    path.resolve(HERE, '..', '..', 'app.css'),
    'utf-8',
);

/** Every `--pax-ui-<name>:` definition (the colon excludes `var()` references). */
const TIER2_DEF = /--pax-ui-[a-z-]+:/g;
const TIER2_DEFINITIONS = PAX_THEME_CSS.match(TIER2_DEF) ?? [];

describe('token manifest — single CSS token root', () => {
    it('pax-theme.css defines the Tier-2 semantic roles', () => {
        expect(TIER2_DEFINITIONS.length).toBeGreaterThan(60);
    });

    it('app.css defines NO Tier-2 roles (it may only consume them)', () => {
        const appDefs = APP_CSS.match(TIER2_DEF) ?? [];
        expect(appDefs, `app.css must not define --pax-ui-* roles:\n${appDefs.join('\n')}`).toEqual([]);
    });

    it('both skins are present as [data-pax-theme] blocks', () => {
        expect(PAX_THEME_CSS).toContain('[data-pax-theme="aurelia-drift"]');
        expect(PAX_THEME_CSS).toContain('[data-pax-theme="cyber-flux"]');
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
