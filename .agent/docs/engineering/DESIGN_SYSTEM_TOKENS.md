---
date created: 2026-06-13
last updated: 2026-06-13
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-06-13/2026-06-13_design-system-and-polish-plan.md
superseding docs:
---

# Pax Design-System Token Contract

The single source of truth for how UI-chrome tokens are structured and themed.
"UI-chrome" = the HUD, settings, menus. This is **separate** from the
game-render theme system (`lib/config/themes.ts` + territory-render JSONs),
which is out of scope here.

## Three tiers

| Tier | Prefix | Lives in | Who sets it | Who reads it |
|------|--------|----------|-------------|--------------|
| 1 — Primitive / theme | `--pax-*` | `design-system/pax-theme.css` (inside `[data-pax-theme]` blocks) | The active theme | Tier 2 only |
| 2 — Semantic / role | `--pax-ui-*` | `app.css :root` | Maps Tier 1 → roles | Components |
| 3 — Component | `--<component>-*` | the component's own `<style>` | The component | That component |

**The rule:** components consume **Tier 2 (`--pax-ui-*`) only**. Never a raw value,
never `--pax-*` directly, never a deprecated third-namespace token. A component
that needs a knob no role provides defines a Tier-3 token that references Tier 2.

Why this shape: a theme rewrites Tier 1; Tier 2 roles flow the new values through
to every component automatically. Components never need to know which theme is
active. This is what makes the system "themeable" without editing component CSS.

## Themeable manifest (what a theme may override — all Tier 1)

A theme is a `[data-pax-theme="<id>"]` block in `pax-theme.css`. It may override
any of these axes. It need not override all — it overrides what it changes; the
rest inherits from the `:root` / `aurelia-drift` base.

1. **Color** — `--pax-color-*` (void/panel/control surfaces, text tones, accent
   cyan/gold, danger). Player-signal colors (`--pax-color-player-*`) are a
   game-signal axis: themes should leave them unless intentionally reskinning
   player identity.
2. **Typography** — `--pax-font-*` (brand/ui/label/copy/data roles),
   `--pax-type-*` sizes, `--pax-type-*-scale` multipliers.
3. **Spacing / density** — `--pax-space-*`, `--pax-gap-*`, `--pax-pad-*`,
   `--pax-panel-padding`, `--pax-panel-gap`, `--pax-topbar-height`.
4. **Shape, borders & flourishes** — `--pax-radius-*`, `--pax-rounded-corner-*`,
   `--pax-border-width*`, `--pax-border-*` colors, `--pax-border-*-gradient`
   (the gold-gradient edge recipe).
5. **Glow / FX** — `--pax-shadow-*`, `--pax-glass-blur`, `--pax-glass-opacity`,
   the `--pax-surface-*` composed backgrounds.
6. **Icons** — `--pax-icon-size`, `--pax-icon-stroke`, `--pax-icon-scale`.

System axes a theme may also touch but usually leaves alone:
- **Motion** — `--pax-motion-fast/base/slow`.
- **Z-index** — `--pax-z-*` (stacking order is structural; reskins rarely change it).

## Naming rules

- Primitive: `--pax-<axis>-<role>[-variant]` (e.g. `--pax-color-accent-gold-strong`).
- Semantic: `--pax-ui-<role>` (e.g. `--pax-ui-accent-warm`, `--pax-ui-panel-bg`).
- Component: `--<component>-<role>` scoped in the component (e.g. `--toggle-knob-bg`).
- Units in the value, not the name. Sizes that scale use `calc(base * --pax-*-scale)`.

## Deprecated — slated for removal via consumer migration

These exist today and must NOT be used by new code. Consumers migrate to the
canonical token (right column) surface-by-surface, with visual verification;
the deprecated token is deleted once it has zero consumers.

| Deprecated (app.css third namespace) | Canonical replacement |
|--------------------------------------|-----------------------|
| `--color-void-*`, `--color-accent-*`, `--color-text-*` | `--pax-ui-*` color roles |
| `--font-display` / `--font-data` / `--font-body` / `--font-pasti` | `--pax-ui-font-*` |
| `--text-xs..3xl`, `--title-size`, `--label-size` | `--pax-ui-*` type roles (Tier-1 `--pax-type-*`) |
| `--space-1..12`, `--panel-padding`, `--panel-gap` | `--pax-ui-pad-*` / `--pax-ui-gap-*` |
| `--radius-sm/md/lg` (4/8/12px — diverge from scale) | `--pax-ui-radius-*` |
| `--glass-*`, `--glow-cyan`, `--glow-soft` | `--pax-ui-glow` / `--pax-ui-shadow*` |
| `--border-subtle`, `--border-accent` | `--pax-ui-border*` |
| `--transition-fast/base/slow` | `--pax-ui-motion-*` (add) or `--pax-motion-*` |
| `--pax-ui-cut-corner-*` (misnomer — resolves to rounded) | `--pax-ui-rounded-corner-*` / `--pax-ui-radius-*` |

Note: several third-namespace color/radius tokens hold values that **diverge**
from the design system (e.g. `--color-accent-cyan: #00ffff` vs the Aurelia teal
`#55e7ef`; `--radius-sm: 4px` vs the 8px scale floor). Migrating their consumers
will shift those surfaces onto the system palette/scale — an intended congruence
change that needs per-surface visual verification.

## Status (2026-06-13)
- **Namespace unified to one `--pax-*` family.** The semantic tier was renamed
  `--hud-*` → `--pax-ui-*` across all definitions and 768 references (build PASS).
  The in-game HUD now reads a single coherent namespace.
- Tiers 1 and 2 are wired; z-index and border-width axes added.
- The Tailwind `@theme` block at the top of `pax-theme.css` generates utility
  classes for the HUD-tier primitives. It is vestigial under the chosen
  pure-token-CSS direction and is slated for removal once the HUD-tier primitives
  stop using Tailwind utility classes (Stage 3).
- **Remaining deprecated third namespace** (`--color-*`, `--space-*`, `--text-*`,
  `--radius-sm/md/lg`, `--transition-*`, `--font-display/data/body`, `--glass-*`,
  `--glow-*`, `--border-subtle/accent`) is now confined to: the **landing/marketing
  site** (`lib/components/landing-site/*`, ~148 refs), **archived dead code**
  (`lib/components/ui/_archived/*`, ~40 refs), one live control (`RangeDual.svelte`),
  and the demoted `aurelia-hud` package. Disposition of the landing site is a
  scope decision (its values intentionally diverge from the in-game HUD).
