---
date: 2026-07-04
status: PROPOSAL + Phase 0 shipped (invariant guard)
about: Permanently eliminating the Svelte settings / conditional-state bug family
---

# Killing the settings conditional-state bug family

## What the family actually is (grounded)

Every settings bug we keep hitting is one of two shapes, and both come from the
same root: **a setting is defined implicitly and redundantly, and correctness
depends on humans keeping ~6 parallel lists in sync AND on which conditional
template branch happens to mount.**

A setting is only "real" if it is wired in ALL of:
1. the config type + default (`game.config.ts`),
2. the rendered control (`settingConfigKey="X"` / `configSat=…` in a `.svelte`),
3. the persistence map (`settingsDefs.PANEL_CONFIG_MAP`, panelKey↔configKey),
4. the theme category (`categoryThemes.ts`),
5. the search index (`settingMetadata.SCOPE_LABEL_META`),
6. reachable through the render-mode `{#if}` chain that decides which card mounts.

Two failure sub-classes fall out:

- **Registry drift** — the parallel lists disagree. → "searchable but not
  reachable", "reachable but not searchable", "changes don't persist", "ghost
  key that matches nothing". (The guard below found **22** live instances,
  incl. the whole `TERRITORY_SURFACE_*` family being unsearchable.)
- **Conditional coverage gaps** — a mode falls through every `{#if supportsXCard()}`
  predicate and renders nothing (the Chaikin/`power_vector` bug: the control
  existed but no card mounted it).

The subtle amplifier: **features that reason about settings by inspecting the
mounted DOM** (search targeting, live filter, "reveal on select") break whenever
a conditional hides the target. That is why global search had to stop trusting
the DOM.

## The principle (the innovation, stated plainly)

> Settings are **data**, not code. The template is a **pure projection** of that
> data. A **test proves the projection is total.** Never reason about a setting
> from the mounted DOM.

Concretely: invert the source of truth. Today the template is the authority (a
setting exists if some component renders it under some `{#if}`), and the 5
registries are hand-copies. Flip it — one declarative registry is the authority;
config defaults, search index, persistence map, theme membership, AND the
rendered control are all DERIVED from it; a guard test makes drift impossible.

## Four pillars

1. **One declarative registry.** Each setting defined ONCE:
   `{ key, type, default, min/max/step|options, label, help, group, appliesToModes[], panelKey }`.
2. **Derive every projection** from it: config defaults/types, search index,
   persistence map, theme categories. Delete the hand-copies.
3. **Data-driven rendering.** A generic `<SettingControl descriptor/>` renders the
   right `Pax*Row` by `type`. A card renders `registry.where(s => s.section===X && s.appliesToMode(mode))`
   — NOT a hand-written `{#if supportsFooCard()}`. A mode with no card becomes
   impossible by construction (coverage is total).
4. **Invariant tests** as the guarantee (drift + mode×setting coverage + referential integrity).

## Staging (safe; the UI works and can't be visually verified here)

- **Phase 0 — SHIPPED:** `settingsWiringInvariant.test.ts`. Extracts every rendered
  `settingConfigKey`/`config*` and asserts each is searchable + persistable.
  Caught 22 pre-existing gaps (baselined in `KNOWN_UNWIRED`, shrink-to-zero). Now
  blocks any NEW half-wired setting. Zero render risk.
- **Phase 1 — registry as authority for the DERIVED lists.** Build the descriptor
  registry; generate the search index + persistence map + theme membership from it;
  delete the hand-lists one at a time, each guarded by Phase 0. This alone fixes all
  22 gaps for free and ends registry drift.
- **Phase 2 — data-driven rendering** for the worst offender first (territory surface
  card: replace the `supportsRuntimeSurfaceStyleCard()/Shared()/GridGradient()` chain
  with a registry filter), then generalize. Kills the coverage-gap sub-class.
- **Phase 3 — mode×setting coverage test** (every render-mode maps to ≥1 card) once
  predicates are data.

Recommendation: do Phase 1 next (systemic, deletes the parallel lists, auto-fixes
the 22). Phase 2 is the larger, visually-verified step.
