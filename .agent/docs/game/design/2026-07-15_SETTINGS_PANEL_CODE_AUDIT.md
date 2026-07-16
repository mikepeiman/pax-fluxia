# Settings Panel Code Audit — GameSettingsPanel.svelte and its satellites

**Date:** 2026-07-15 · **Commissioned by user:** "In no way does it appear this file has been
properly audited. I command a proper audit now. I want maximum component decomposition, maximum
DRY elegance, maximum single-function config sync and storage."

Scope: `GameSettingsPanel.svelte` (2,600 lines), `panelSync.ts` (677), `settingsState.ts` (150),
`animLockMath.ts` (153), `configTransfer.ts`, the 15 `ControlsSection-*` children, and the
persistence keyspace. Every finding below is verified by grep against the whole repo, not inferred.

---

## STATUS (2026-07-15, end of session) — phases 0 and 1 are DONE

| Phase | State | Commits |
|---|---|---|
| 0 — dead code + the 3 rulings | **done** | `1e25b5c55` |
| 1a — one anim-lock math | **done** | `b7ba45d96` |
| 1b — transferRate → Economy | **done** | `1caad18ed` |
| 1c — visuals store retired | **done** | `da45238bb` |
| 1d — invalidation tags | **done** | `9a441234b` |
| 2 — the single settingsStore | open | — |
| 3 — shell decomposition | open | — |
| 4 — CSS tokens + Tailwind | open | — |

**User rulings received (§5):** config import/export → *"it is meant to be a 'game mod'-type user
feature"* → surfaced as `ConfigTransferPanel.svelte` (Interface → Import / Export). Reset-to-defaults
→ surfaced there too, behind a 2-click confirm. Debug ship-count → resurrected in Diagnostics →
Debug Tools.

**Two findings got WORSE on contact — the audit understated them:**

1. **§1d's ladder was not merely ugly, it was WRONG.** It listed `PERIMETER_FIELD_` (excised) while
   missing `CELL_GRID_` (32 config keys) and `GRID_GRADIENT_` (30) entirely — so applying a theme,
   preset, or imported config that tuned either family never repainted the map. Live edits masked it
   because `ControlsSection-Territory.debouncedConfigUpdate` bumps unconditionally. Fixed with the
   registry tags; `settingsInvalidation.test.ts` now proves totality over every territory-visual key.
2. **§1a's duplicate was double-writing.** `ControlsSection-Timing` called panelSync's config-mutating
   copy *and then* wrote every returned value again via `setAnimValue`.

**One thing the audit got wrong:** §1's table called the visuals store merely "redundant". It was
worse — boot order (`applyPanelToConfig` then `applyVisuals`) silently decided which of the two
persisted copies of each value the user got. And the migration's own test caught a real defect in
it: `loadPanelSettings` ran every migration *inside* `if (a panel store exists)`, so a user with a
visuals store and no panel store (someone who only ever changed the background from the main menu)
would have lost it.

Everything below is the original audit, unedited.

---

## §1 Direct answers to the user's questions

### 1a. "Why so many imports for synchronizing the panel?"

Because there is not one synchronization system — there are **five parallel persisted stores**,
each with its own localStorage key, its own load/save pair, and its own reactive mirror inside
the component:

| Store | localStorage key | Mirror in component | Verdict |
|---|---|---|---|
| panel | `pax-fluxia-panel-settings` | `panel` $state | The real one (universal pattern) |
| visuals | `pax-fluxia-visuals` | `vis` $state | **Redundant** — all 5 keys (CONNECTION_WIDTH/ALPHA, CONNECTION_SHADOW_WIDTH/ALPHA, BG_IMAGE_URL) are already in RESOLVED_PANEL_CONFIG_MAP (settingsDefs.ts:351-354, 559) |
| anim locks | `pax-anim-lock-ratios` + `-modes` | `animLockRatios`/`animLockModes` $state | Legitimate feature state (not config values) but split across 2 keys |
| tier | `pax-fluxia-settings-tier` | `activeTier` $state | Fine, trivial |
| combat tuning | `pax-fluxia-combat-tuning` | none | **DEAD** — `loadCombatTuning`/`saveCombatTuning` (panelSync.ts:108,119) have zero callers repo-wide |

Plus **six ad-hoc nav keys** written by raw localStorage calls scattered through the component
(`pax-fluxia-active-section`, `-settings-show-all`, `-settings-subsections`,
`-settings-section-by-category`, `-settings-open-category`, and TIER via panelSync).

So no — this is not the universal sync pattern; it is the universal pattern **plus every
predecessor it was supposed to replace, still alive**. The import block you quoted is the
fossil record. The answer to "is this not possible with the specified universal pattern?" is
**yes, almost all of it is**: visuals fold into the panel map (delete the store, migrate the key
once), combat tuning is deleted outright, and the nav keys belong in one `settingsNav` module
with a single persisted object.

### 1b. "What's `animLockMath` doing?"

It is the pure math behind the pin/ratio-lock buttons on animation sliders (pin a duration to
the tick, or lock its ratio to tick/anim-speed so it rescales when those change). It is tested
(`animLockMath.test.ts`) and it **belongs** — it's the one cleanly extracted module here.

The defect is next door: **`panelSync.ts:587-640` contains a second, independent implementation
of the same recalculation math** (`recalcAnimLocksOnTickChange`/`recalcAnimLocksOnAnimSpeedChange`),
duplicating animLockMath's clamp/round/unit logic line for line — except this copy also mutates
GAME_CONFIG as a side effect. GameSettingsPanel uses the pure one; the HUD Game Speed widget path
(`applyTickIntervalChange`, panelSync.ts:557) and `ControlsSection-Timing.svelte:101` use the
side-effectful copy. Two code paths compute lock rescaling depending on which control surface you
touched. If the rounding rules ever drift, tick changes from the HUD and from Settings will
disagree. **One must die: keep animLockMath (pure, tested), make panelSync call it.**

### 1c. "What is `syncVisualsFromConfig` doing in Settings UI? Does it belong?"

It copies 5 GAME_CONFIG keys into the redundant `vis` store described in 1a — a second write of
values the panel map already carries. It does not belong; it exists only because the visuals
store predates the map. Deleting the `vis` store deletes this function, `updateVisual`,
`loadVisuals`/`saveVisuals`/`applyVisuals`, VISUAL_DEFAULTS, and the `vis`/`updateVisual` props
threaded into ControlsSection-Visuals (twice — it's mounted in both `ui_appearance` and
`map_options`).

### 1d. "Is the key-prefix ladder in applyConfigPatch really necessary?"

The *purpose* is necessary; the *form* is a defect. `bumpTerritoryVisualConfig()` must fire when
a territory-visual key changes so renderers re-read config. But deciding "is this a territory
key" via a hand-maintained prefix ladder (`METABALL_`, `VORONOI_`, `MODIFIED_VORONOI_`, `DF_`,
`PERIMETER_FIELD_`…) is exactly the "settings are data, not the DOM" anti-pattern in write-path
form: the knowledge of *what a key affects* is hardcoded at one call site instead of living in
the registry. It silently rots — `PERIMETER_FIELD_` already points at the excised perimeterField
subsystem, and any future key family must remember to add itself here or its themes/presets
won't repaint. Note also the same ladder exists AGAIN in settingsState.ts:133
(`warnOnMissingTerritorySchemaCoverage`).

**Fix:** each registry row gets an `invalidates: 'territory' | 'bg' | …` tag (most auto-derivable
from configKey once, at registry build time); the write path fires domain effects from the tag.
One source of truth, and a totality test can prove no key is untagged.

### 1e. "Why are game mechanics (`transferRate`) imported into settings UI?"

`transferRate` is the last survivor of the old combat panel: a percentage display-mirror of
`GAME_CONFIG.TRANSFER_RATE`, kept as top-level component state and threaded into
ControlsSection-Economy (lines 1635-36). The comment at :253 admits it: "Only transferRate
display-state needs sync here." TRANSFER_RATE is already in the panel map (settingsDefs.ts:383).
The %↔decimal conversion is a display concern that belongs in the Economy section (or a
`display: percent` transform tag in the registry row). It should not exist in the shell at all.
`syncCombatValuesFromConfig` exists solely to serve it.

### 1f. "Is `importConfigJSON` dead? And `recalcAnimLocksOnAnimSpeedChange`?"

- **`importConfigJSON` — dead, and it's not alone.** The whole config-transfer feature has code,
  tests, and status state, but **no UI affordance anywhere in the repo**: `importConfigJSON`,
  `exportConfigMD`, `configStatus`, `configStatusColor` (:407-461), and the imported-but-never-
  called `exportConfigJSONBase` (:46) have zero template references. ControlsSection-Diagnostics'
  "Export All Packages" is a different feature (diagnostics packages). This is the inverse of a
  lying knob: a functioning feature with no knob.
- **`resetToDefaults` (:566) — dead.** The "nuclear reset" (clear all pax-* storage + reload) has
  no button anywhere.
- **`updateDebugShipCount` / `debugShipCount` / `lastDebugStarId` + the $effect (:377-399) — dead.**
  The debug ship-count slider's UI was removed at some point; the plumbing stayed.
- **`recalcAnimLocksOnAnimSpeedChange` — alive but duplicated** (see 1b). The local one at :518 is
  called at :206; the panelSync copy is called by ControlsSection-Timing. Not dead code —
  worse: two of them.

---

## §2 Findings inventory (beyond the questions)

**F1 — Prop-drilling of the sync surface.** Every section receives up to 13 props
(`panel, updatePanel, animLockModes, animLockRatios, animValues, getAnimValue, setAnimValue,
formatAnimValue, pinValueToTickDuration, lockRatioToTick, lockRatioToAnimSpeed, syncFromConfig,
…`). That is a store pretending to be props. It's why every new section costs a 12-line
invocation and why the sectionContent snippet is a 180-line if/else chain.

**F2 — The section dispatch chain (:1580-1759).** 20 `{:else if sec?.id === …}` branches mapping
section id → component + props. The registry (`settingsRegistry.ts`) already knows every section;
it should carry the component reference and per-section prop needs. Data, not DOM.

**F3 — Four config-write paths with different semantics.**
1. `updatePanel` → setSetting (panel+config+persist+telemetry)
2. `debouncedConfigUpdate` in ControlsSection-Territory (config first, then updatePanel → writes
   config AGAIN via setSetting, then bump; also not debounced despite the name — the `_delayMs`
   param is ignored)
3. `setAnimValue` → config + syncPanelKey (panel persist, NO telemetry, no bump)
4. `applyConfigPatch` → setSettingsFromConfigPatch (config+panel+telemetry) + bump ladder + bg events
Each writes config and panel in different orders with different side effects. The double-write
sweep flagged in the 2026-07-14 dossier is this same family.

**F4 — `syncAllFromConfig` calls `applyTimingBindingsAndLocks` which calls `syncAnimValuesFromConfig`,
and then `syncRuntimeViewsFromConfig` calls `syncAnimValuesFromConfig` again** — the sync graph is
a tangle of overlapping partial syncs (`syncVisualsFromConfig`, `syncCombatValuesFromConfig`,
`syncAnimValuesFromConfig`, `syncRuntimeViewsFromConfig`, `syncAllFromConfig`,
`syncPanelFromConfigPatch`, plus panelSync's own `syncPanelFromConfig` — a SEVENTH, unused by this
component). There should be exactly one.

**F5 — `animValues` mirror.** A third reactive copy of config (config → panel → animValues) kept
because GAME_CONFIG isn't reactive. A single reactive settings store keyed by configKey makes
`panel`, `animValues`, `vis`, and `transferRate` one object.

**F6 — panelSync is three modules in a trenchcoat.** Persistence (load/save×5), migrations
(~200 lines of key renames + policy versions), and live sync/tick propagation
(`applyTickIntervalChange`, duplicate recalc math, TICK_INTERVAL_CHANGED_EVENT). Migrations
deserve their own module (`settingsMigrations.ts`) with the version-stamp pattern generalized.

**F7 — `logRefresh` fragility.** Parent declares `logRefresh = $state(0)` (:404) and passes it
down; ControlsSection-Logging mutates its own prop copy (`logRefresh++`). Works only because the
child's binding is local; the parent state never changes and has no writer. Should be child-local
state, not a prop.

**F8 — Dead/duplicate exports in panelSync:** `loadCombatTuning`/`saveCombatTuning` (no callers),
`configKeyToPanelKey` (:672 — trivial wrapper over CONFIG_TO_PANEL_KEY; check callers before
delete), `syncPanelFromConfig` (:465 — overlaps settingsState.syncPanelFromConfigPatch).

**F9 — CSS.** The one-layer rewrite (2026-07-14) fixed the correctness class (single declaration
per selector, definite height chain, clip discipline, one scroll surface). What remains is bulk:
~830 lines of bespoke CSS in one component, with spacing/typography/color values inline instead
of tokens, while Tailwind v4 (`tailwindcss@4.3`, vite plugin) is installed and the design system
(`$lib/design-system` PaxHud*) already exists.

---

## §3 Target architecture

### 3a. One settings store (the single-function sync)

`src/lib/components/ui/settings/settingsStore.svelte.ts` — the ONLY module that touches
GAME_CONFIG and localStorage for settings:

```
values: $state<Record<ConfigKey, unknown>>   // ONE reactive mirror, keyed by configKey
set(configKey, value)     // config write + mirror + persist + telemetry + domain effects (from registry tag)
applyPatch(patch)         // themes/presets/import — same pipeline, batched persist, one effects pass
syncFromConfig()          // config -> mirror, the ONE read-back (replaces all seven partial syncs)
hydrate()                 // boot path (subsumes hydrateConfigFromPersistedUiSettings)
```

- Sections consume it via context/module import — **prop drilling ends**; a section's invocation
  becomes `<Section id="economy" />`.
- panelKey survives only inside the storage adapter (legacy key migration on load; store
  internally by configKey going forward).
- Domain effects (`bumpTerritoryVisualConfig`, bg events, tick propagation) fire from registry
  `invalidates` tags — the prefix ladders are deleted.
- Anim locks: `animLocks.svelte.ts` owning {modes, ratios} + persistence, calling animLockMath;
  panelSync's duplicate recalc functions deleted; the HUD widget calls the same store function.
- A totality test proves: every registry row has a real config key (exists), every config key a
  section claims is in the registry, every row's invalidates tag resolves.

### 3b. Component decomposition

```
GameSettingsPanel.svelte      → thin shell: grid container + open/close wiring   (~120 lines)
  SettingsRail.svelte         → category icon toolbar + action tools
  SettingsSearch.svelte       → search input + results list + navigate/flash logic
  SettingsSectionHost.svelte  → section head, chips, subsection nav, section-body,
                                registerSectionBody/subsection filter
  settingsNav.svelte.ts       → category/section/subsection/showAll state + ONE persisted object
                                (replaces 5 raw localStorage keys + their load functions)
  sectionRenderer             → registry-driven: settingsRegistry rows carry `component`;
                                the 20-branch snippet chain becomes one <Component /> lookup
```

Utility panels (Appearance/Themes/SaveLoad/Stats/Hotkeys/Help/Typography) become registry rows
with `kind: 'utility'` instead of a parallel INTERFACE_PANELS/TYPOGRAPHY_PANELS/UTILITY_PANEL_CATEGORY
triplet of consts.

### 3c. CSS strategy

- **Keep bespoke, in the shell:** the load-bearing structural layer — the grid
  (named areas `"content rail"`), the definite height chain, `overflow: clip` discipline, the one
  scroll surface, the 0.22s track glide. This is exactly what Tailwind is bad at expressing
  auditable invariants for, and it just survived a three-round bug hunt. Do not churn it.
- **Tokenize:** promote the panel's colors/spacing/radii to `--pax-settings-*` variables in
  app.css (grep-verified against the ghost-variable rule) and register them in Tailwind v4's
  `@theme` so utilities and bespoke CSS share one palette.
- **Tailwind for the leaves:** as each child component is extracted (rail buttons, chips, search
  row, result rows), its flex/spacing/typography CSS converts to utilities; the extracted
  component deletes its slice of the 830-line block. Conversion rides the decomposition — no
  big-bang restyle, every step gate-checked (svelte-check 0 warnings catches orphaned selectors).
- **Design system:** interactive elements are already PaxHudButton/PaxHudIconButton; extraction
  should push remaining raw `<button class="…">` (search clear, search result rows) into
  PaxHud* variants — fix the system, not the instance.

---

## §4 Migration plan (each phase independently shippable, gates after each)

- **Phase 0 — dead code (needs 2 rulings, §5):** delete importConfigJSON/exportConfigMD/
  configStatus*/exportConfigJSONBase (or surface them), resetToDefaults (or surface it),
  debugShipCount family, loadCombatTuning/saveCombatTuning, logRefresh parent state.
- **Phase 1 — kill duplicates:** panelSync recalc math → animLockMath; visuals store folded into
  the map (one-time localStorage migration `pax-fluxia-visuals` → panel keys); transferRate into
  Economy; prefix ladders → registry `invalidates` tags + totality test.
- **Phase 2 — settingsStore:** one mirror keyed by configKey; the seven partial syncs collapse to
  `syncFromConfig()`; sections consume the store (prop drilling removed section by section);
  panelSync splits into storage adapter + settingsMigrations.
- **Phase 3 — shell decomposition:** SettingsRail / SettingsSearch / SettingsSectionHost /
  settingsNav; registry-driven section rendering; utility panels become registry rows.
- **Phase 4 — CSS:** tokens → @theme; per-extracted-component Tailwind conversion.

Risk notes: Phase 1's visuals migration and Phase 2 touch the persistence clobber class
([[settings-value-persistence-mode-default-clobber]]) — each needs a boot-order test (saved value
survives reload) before landing. The layout CSS (§3c bullet 1) is explicitly out of scope for
restyling.

## §5 Rulings needed from the user

1. **Config import/export (JSON/MD download + file import):** dead feature with tests but no UI.
   Surface it (a Diagnostics subsection already named "Exports" exists) or delete it?
2. **Reset-to-defaults (nuclear localStorage wipe + reload):** currently unreachable. Surface it
   (fits Diagnostics or Interface) or delete?
3. **Debug ship-count slider** (set selected star's ships directly): UI long gone. Delete, or
   resurrect in Diagnostics?
