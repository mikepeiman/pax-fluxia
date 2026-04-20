# Plan: Mode-Reactive Diagnostics Panel + Grid-Mode Geometry Overlay

## Purpose

User's own words: *"Diagnostics panel should show relevant diagnostics for
the active mode. It should reactively change options based on render mode
(and any other relevant info, eg. could be geometry mode) 'Show underlying
geometry' does not work anymore, at least not in current mode
(metaball-grid)"*

Two problems, one shape:

1. **Grid mode has no "Show underlying geometry" equivalent.** The control
   exists only inside `PerimeterFieldTuning.svelte` and its consumer
   (`GameCanvas.svelte:2099-2160`) hard-checks `activeMode ===
   'perimeter_field'`. When the user is in `metaball_grid` the toggle is
   simply not present — which reads as "doesn't work" for anyone who
   expected a unified debug affordance.
2. **Each family's panel is siloed.** Adding diagnostics means cloning into
   every `*Tuning.svelte`. There is no shared "Diagnostics" section that
   reacts to the active family.

## Current State (inventory 2026-04-20)

### Metaball-Perimeter-Field

- Debug overlays (PIXI): geometry loops (cyan), vstars (glyphs + halo),
  trajectory lines, labels.
- Numeric readouts: scrub/replay frame counter.
- Panel toggles in `PerimeterFieldTuning.svelte:725-890`: show geometry,
  show vstars, enable transition preview, replay source, scrub slider.
- Consumer: `GameCanvas.svelte:renderPerimeterFieldDebugOverlay` (lines
  2099-2160) — gated on `activeMode === 'perimeter_field'`.

### Metaball-Grid

- Debug overlays: **none**.
- Numeric readouts: `metaballGridStats` store — painted/emittable/total
  cells, requested/effective spacing, frame time EMA, frame counts.
- Panel readouts in `MetaballGridTuning.svelte:722-745`: the stats above.
- No toggles, no PIXI overlay consumer, no log tags.
- Comment at `renderMetaballGridScene.ts:69`: *"debug overlay can verify
  offset behavior when we wire it"* — deferred.

## Proposed Design

### 1. Shared `FamilyDiagnostics` interface

New file: `pax-fluxia/src/lib/territory/familyDiagnostics.ts`

```ts
export interface FamilyDiagnosticsContract {
    /** Unique family id, matches `resolveActiveStyleId()` output. */
    familyId: 'perimeter_field' | 'metaball_grid' | string;
    /** Toggles surfaced in the shared Diagnostics panel. */
    toggles: Array<{
        key: string;             // panel/config key
        label: string;           // UI label
        help?: string;
        configKey: string;       // GAME_CONFIG key
        panelKey: string;        // PANEL_CONFIG_MAP key
    }>;
    /** Numeric readouts surfaced in the shared Diagnostics panel. */
    readouts: Array<{ key: string; label: string; format?: (v: any) => string }>;
    /** PIXI overlay render hook — called each frame when overlay toggles are on. */
    renderOverlay?: (ctx: FamilyOverlayContext) => void;
}

export interface FamilyOverlayContext {
    graphics: PIXI.Graphics;
    snapshot: unknown;           // family-specific snapshot
    activeToggles: Record<string, boolean>;
}
```

Each family module (perimeter-field, metaball-grid, future) exports a
`contract` constant that the shared diagnostics panel and GameCanvas
consume.

### 2. Shared `DiagnosticsPanel.svelte`

New file: `pax-fluxia/src/lib/components/ui/settings/DiagnosticsPanel.svelte`

- Reads the active family id.
- Looks up the contract for that family.
- Renders one block per toggle (binding to `panel.*` via `updatePanel`).
- Renders one block per readout.
- If the family has no contract (or an empty one), shows a neutral
  placeholder: *"No diagnostics wired for {familyId} yet."*

### 3. Consumer wiring in `GameCanvas.svelte`

Replace the hardcoded `renderPerimeterFieldDebugOverlay` with a
family-dispatch call:

```ts
const contract = familyDiagnosticsContracts.get(resolveActiveStyleId());
contract?.renderOverlay?.({ graphics, snapshot, activeToggles });
```

The perimeter-field's existing overlay code moves into its contract's
`renderOverlay`. Grid's new overlay (below) registers the same way.

### 4. Grid-mode "underlying geometry" overlay — minimum viable

For metaball-grid, "underlying geometry" should render:

- **Classification grid markers** — one small glyph per vstar, colored by
  role (`native` = solid dot, `dispossessed` = square, `emergent` =
  triangle-up, `vacating` = triangle-down). Optional alpha by flip-time
  proximity.
- **Ownership-geometry underlayer outline** — the same boundary loop
  perimeter-field draws. Grid mode derives from the same ownership
  snapshot.
- **Wave seed vector** — an arrow from the winner's footprint centroid
  through the current wave front, so the direction of the flip wave is
  visible.

These are sufficient to answer "is the classification correct?" and "is
the wave going where I expect?" — the two questions the perimeter-field
overlay answers for that family.

### 5. Panel reactivity

Per AGENT.md §4.5 (slider reactivity), the toggle UI reads
`panel.diagnostics.{familyId}.{toggleKey}` and writes through
`updatePanel`. `syncPanelFromConfig` pulls each toggle's config value. When
the active family changes, Svelte's reactivity re-evaluates the contract
lookup and swaps the panel's toggle set.

## Stages

1. **Stage 1 (contract + perimeter-field migration):** Introduce the
   `FamilyDiagnosticsContract` interface. Move perimeter-field's toggles
   and `renderOverlay` into its contract. Replace
   `PerimeterFieldTuning.svelte`'s debug section with a `<DiagnosticsPanel>`
   mount. Visual parity — no user-observable change in perimeter-field
   mode.
2. **Stage 2 (grid minimum viable):** Implement grid contract with the
   three overlays. Add toggles. Wire the overlay into grid-mode frames.
   User can now flip on "Show underlying geometry" in grid mode.
3. **Stage 3 (consolidation):** Remove the duplicated debug sections from
   individual `*Tuning.svelte` files. Only the gameplay-tuning sliders
   stay family-local; all diagnostics live in the shared panel.

## Verification

- Toggle each overlay in both modes; confirm it draws what it claims.
- Confirm that switching render mode while the panel is open updates the
  available toggles without reload.
- `bun test` stays green; `bun run build` passes type-check.
- No regressions to existing perimeter-field debug overlays (they should
  render identically after the contract migration).

## Out of Scope

- Other families (`metaball-chunks`, etc.) can adopt the contract later.
  Empty contract is allowed.
- Keyboard shortcuts for toggles — nice-to-have, not in this plan.
- Performance instrumentation beyond what currently exists.

## Risks

- Svelte 5 reactivity across the family boundary — needs a writable store
  for the active contract, not just a `$derived` in case overlay state is
  modified by the render loop.
- Moving the perimeter-field overlay out of `GameCanvas.svelte` must
  preserve the exact PIXI draw order. Plan: keep overlay layering in
  GameCanvas; only the draw function moves.

## Open Questions

1. **Role glyph set for grid classification** — user preference: solid
   dot / square / triangles, or something else?
2. **"Wave seed vector" is informative but noisy** — optional toggle, or
   always-on when "Show underlying geometry" is enabled?
3. **Should the shared panel also show the `log.sys` / `log.error` flags
   (`window.logFlags.*`)?** They're runtime-toggleable from console; a GUI
   surface would save time.
