# Settings Surface — Full-Scope Wiring & Data Audit

**Date:** 2026-07-14
**Scope:** every settings control component under `src/lib/components/ui/settings/`, plus
`GameSettingsPanel.svelte`, `settingsDefs.ts`, `settingsState.ts`, `panelSync.ts`,
`settingMetadata.ts`, `settingsSearch.ts`, `settingsRegistry.ts`, `settingsTaxonomy.ts`, the
settings-relevant parts of `GameContainer.svelte`, and the design-system `Pax*` row primitives.
**Method:** READ-ONLY source analysis. No builds, tests, or browser. Every claim carries `file:line`.
**Companion:** starts from `2026-07-14_SETTINGS_HUD_AUDIT_DOSSIER.md` (CSS layers, resize theories,
mount tree, palettes) and does **not** re-derive it. The resize/collapse mechanism is being
root-caused separately; this document notes related structure only.
**In-flight (NOT flagged as findings, per commission):** `TERRITORY_FILL_TRANSITION_MODE` /
`pvFrontline` removal; the `ui` log-channel toggle gap (already fixed today via
`settingsDefs.LOG_CATEGORIES` + totality test `settingsDefs.test.ts:30-34`).

All paths below are relative to `pax-fluxia/src/lib/` unless absolute. App root:
`C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia`.

---

## 0. Headline findings (read this first)

1. **A real "lying config" bug ships today.** The **Aggressor Advantage** slider
   (`components/ui/settings/ControlsSection-Battle.svelte:53-60`) writes `GAME_CONFIG.AGGRESSOR_ADVANTAGE`
   twice per drag — once correctly inverse-transformed via `updatePanel('defense',…)`, then again raw —
   and the **raw write wins**. The value the simulation reads is the reciprocal of what the schema
   intends, and it **flips again on reload** (see §1 / §6-#1). This is the exact class the config
   cleanup found ("lying knobs"), now live in the UI.
2. **One control silently forgets on reload.** *Grid Gradient transition trace*
   (`ControlsSection-Logging.svelte:24-28`) writes `GAME_CONFIG` only, never persists → reverts every
   reload (§1 / §4 / §6-#2).
3. **Duplicate controls write the same key from two visible places** — `TERRITORY_CONQUEST_FRONT_MODE`
   and `VORONOI_BORDER_SMOOTH` each have two live editors; six `CELL_GRID_*` controls are rendered
   **twice on screen at once** in Phase-Field mode (§1 / §6-#3, #4).
4. **A near-universal redundant double-write pattern**: almost every handler does
   `GAME_CONFIG.X = value` *and* `updatePanel(panelKey, value)` — and `updatePanel` already writes
   `GAME_CONFIG`. Harmless for direct keys, actively wrong for the one inverse key (finding #1). It is
   also the mechanism that makes finding #1 possible (§3).
5. **Dead data & dead code are extensive**: `STAR_LABEL_SLIDERS` renders nowhere; ~15 search/metadata
   entries name config keys that no longer exist; `settingsSearch.ts` still special-cases 5 deleted
   `TERRITORY_ENGINE_*` / `VS_TRANSITION_MODE` keys; `GameSettingsPanel` carries a whole reset /
   import / export / debug-ship-count surface that is never rendered (§2).

Everything below substantiates these with an exhaustive census.

---

## 1. Control wiring census

### 1.1 How writes and persistence actually work (traced)

- **`updatePanel(panelKey, value)`** (`GameSettingsPanel.svelte:224-226`) → `setSetting`
  (`settingsState.ts:55-65`) → **(a)** `applyMappedSetting` (`:18-53`) looks `panelKey` up in
  `RESOLVED_PANEL_CONFIG_MAP` and, if found, writes `GAME_CONFIG[configKey] = value` (applying
  `transform:'inverse'` → `1/value` for the handful of inverse keys); **(b)** `persist(nextPanel)` =
  `savePanelSettings` (`panelSync.ts:376-384`) → **synchronous** `localStorage.setItem('pax-fluxia-panel-settings', …)`
  on every call, no debounce.
- **On reload**, `hydrateConfigFromPersistedUiSettings` (`panelSync.ts:411-459`) → `loadPanelSettings`
  + `applyPanelToConfig` (`:392-402`) re-applies every persisted `panel[panelKey]` back into
  `GAME_CONFIG` **before any render path reads it**. A `panelKey` with **no** map entry is silently
  skipped — its value stays in localStorage but never re-reaches `GAME_CONFIG`. **That skip is the
  only real "reverts on reload" mechanism.**
- **Consequence:** a handler that calls `updatePanel` with a **mapped** key persists correctly, and its
  own extra `GAME_CONFIG.X = value` is redundant. A handler that writes `GAME_CONFIG` **without**
  `updatePanel` does **not** persist → reverts on reload.

Write paths observed across the surface:

| Path | Where | Persists to panel LS? | Notes |
|---|---|---|---|
| `updatePanel` → `setSetting` | most gameplay/visual sections | Yes | canonical path |
| direct `GAME_CONFIG.X = value` (paired w/ `updatePanel`) | Travel/Surge/Conquest/Economy/Ships/Visuals/Battle/AI | Yes (via the paired call) | redundant double-write |
| direct `GAME_CONFIG.X = value` (NO `updatePanel`) | `ControlsSection-Logging.svelte:24-28` | **No** | reverts on reload (#2) |
| local `debouncedConfigUpdate` / `updateConfig` / `writeConfig` (all call `updatePanel`) | Territory / FrontierFx / CellGrid / GridGradient / SurfaceStyle | Yes | territory persists — suspected reload-revert does **not** exist |
| `setAnimValue` → `syncPanelKey` (writes `panel` + `savePanelSettings` directly, bypasses `setSetting`) | anim-lock sliders (Timing / Territory transition) | Yes | parallel pipeline (§3) |
| `updateVisual` → `vis` obj + `applyVisuals` | Visuals lane/bg controls | Yes (`pax-fluxia-visuals`) | separate channel; writes `CONNECTION_*` + `BG_IMAGE_URL` |
| `audioManager.set*()` | `ControlsSection-Audio` + `AudioSettings` modal | Yes (`pax-fluxia-audio-config`) **and** panel LS | dual channel (§4) |
| `logFlags[k] = …` (Proxy persists) | `ControlsSection-Logging` channel toggles | Yes (`pax_logFlags`, `logger.ts:52-58`) | not `GAME_CONFIG` |
| local store / util | Players palette, Diagnostics overlays/ruler/recorder, Transpose | own LS keys | out of the panel/config system |

### 1.2 Anomaly census (the defects — full control tables are in §1.3)

| # | Anomaly | Evidence | Class |
|---|---|---|---|
| **A** | **Inverse-transform stomp (lying config).** `updateCombatValue` calls `updatePanel('defense', v)` → `GAME_CONFIG.AGGRESSOR_ADVANTAGE = 1/v`, then line 59 unconditionally overwrites `= v`. Raw value wins live; on reload `applyPanelToConfig` maps `panel.defense`→`1/v` again, so the effective value **flips between sessions**. | `ControlsSection-Battle.svelte:53-60`; schema `settingsDefs.ts:177` (`defense`,`inverse`); `settingsState.ts:37-39` | duplicate-path + transform mismatch |
| **B** | **Persistence gap.** *Grid Gradient transition trace* writes `GAME_CONFIG.GRID_GRADIENT_DEBUG_TRANSITIONS` directly, no `updatePanel`, no LS write. Key *is* mapped (`settingsDefs.ts:452`) but the map is never exercised → reverts every reload. | `ControlsSection-Logging.svelte:17-28, 71-78` | GAME_CONFIG-only, no persistence |
| **C** | **Duplicate control, same key (×2).** `TERRITORY_CONQUEST_FRONT_MODE`: "Front Shape" in Territory *modes* view **and** in SurfaceStyle *border* section. `VORONOI_BORDER_SMOOTH`: "Border Rounding" (modes) **and** "Geometry Smooth Passes" (styles). Both pairs render together in the default `view="all"`. | `ControlsSection-Territory.svelte:530-546` & `TerritorySurfaceStyleTuning.svelte:483-505`; `ControlsSection-Territory.svelte:549-562` & `TerritorySurfaceStyleTuning.svelte:449-462` | duplicate writers |
| **D** | **Six duplicate controls visible simultaneously.** In Phase-Field mode, `CellGridTuning` and `TerritorySurfaceStyleTuning` are stacked in the same card and both render Cell Shape, Cell Inset, Inward Offset, Square Corner, Border Mode, Border Blend — two on-screen widgets writing the identical `CELL_GRID_*` key at once. | mount `ControlsSection-Territory.svelte:1007-1010`; e.g. `CellGridTuning.svelte:704-713` vs `TerritorySurfaceStyleTuning.svelte:328-341` | duplicate writers |
| **E** | **Triple-write.** SurfaceStyle "Front Shape" writes `GAME_CONFIG.TERRITORY_CONQUEST_FRONT_MODE` directly (`:495-498`), then `onUpdate`=`debouncedConfigUpdate` writes it again (`ControlsSection-Territory.svelte:187`), whose `updatePanel` writes it a third time. | `TerritorySurfaceStyleTuning.svelte:495-503` | redundant writes |
| **F** | **Fake debounce.** `queueTopology{Slider,Toggle}Update` call `updatePanel` (which writes `GAME_CONFIG` synchronously) *before* scheduling the rAF/timeout `GAME_CONFIG[key]=value`; the deferred write is a no-op re-write. Only `bumpTerritoryVisualConfig()` (repaint) is actually deferred; the naming/comments are wrong. | `ControlsSection-Territory.svelte:217-270` | architectural mislabel |
| **G** | **Hidden coupled write.** GridGradient "Position Jitter" `onInput` also silently writes `GRID_GRADIENT_DISTRIBUTION` (`'jittered'`/`'square'`); no Distribution control exists to reveal it. | `GridGradientTuning.svelte:282-285` | invisible side effect |
| **H** | **Defensive-read gaps.** `panel.staticOrbits`, `panel.showSelectionHex`, `panel.showHexGrid` read the panel value with **no** `?? GAME_CONFIG.X` fallback (unlike every sibling). Ships' vertical-layout / universal-color guards read `GAME_CONFIG.STAR_LABEL_LAYOUT` / `…COLOR_MODE` directly rather than `panel.*`. Cosmetic (panel is hydrated pre-mount) but breaks the convention. | `ControlsSection-Visuals.svelte:344,353`; `ControlsSection-Diagnostics.svelte:299`; `ControlsSection-Ships.svelte:855,885` | read/write key mismatch (soft) |

**No true "lying knob" (checked/value reading a different key than the write)** was found in any file —
the on-screen knobs read the same key their handler writes. Finding **A** is subtler: the knob and its
persisted `panel.defense` are self-consistent; it is the **config the game reads** that is wrong.
**No unmapped-panelKey writes** were found (every `panel.X` reference resolves — guarded by
`settingsDefs.test.ts:73-84`).

### 1.3 Per-component control tables (condensed; anomaly rows called out)

Legend: **DW** = redundant double-write (direct `GAME_CONFIG` + `updatePanel`, same value, harmless);
**OK** = single clean path. Full row-by-row line cites for every one of the ~250 controls were produced
during the audit; only anomalies and per-file summaries are reproduced here for length.

| Component (section id) | # controls | Write path | Anomalies |
|---|---|---|---|
| `ControlsSection-Timing` (match_flow) | 5 | bespoke handlers + `setAnimValue` for the transition slider | anim-slider pipeline bypass (§3); Animation Speed reads `animationStore.speedMs` (3-way mirror) |
| `ControlsSection-Battle` (combat_tuning) | 11 (loop) | `updateCombatValue` (DW) | **A — AGGRESSOR_ADVANTAGE inverse stomp** (`:53-60`) |
| `ControlsSection-AI` (ai) | 6 (loop) | `updateAIValue` (DW) | none (no inverse keys) |
| `ControlsSection-Economy` (economy) | 8 | inline (DW) | none (percent scaling consistent) |
| `ControlsSection-Travel` (travel_orders) | 23 | inline (DW) | none |
| `ControlsSection-Surge` (effects) | 18 | inline (DW) | none |
| `ControlsSection-Conquest` (conquest) | 21 | inline (DW) | none |
| `ControlsSection-Ships` (fleet_star_visuals) | 80+ | `writePanelConfig` (DW) + 3 composite-scale fns | H (Ships guards read GAME_CONFIG); subsections match registry 1:1 |
| `ControlsSection-Visuals` (map_options + ui_appearance) | 18 | mix of inline (DW), `updateVisual` (vis channel), `updateLanePath` (OK) | H (`staticOrbits`,`showSelectionHex`); `numberTransitionMs` fallback literal `120` (`:291`) |
| `ControlsSection-Diagnostics` (diagnostics) | ~20 | 2 config toggles (DW, mapped, persist) + many local-store/overlay controls | H (`showHexGrid`); `live-settings-dump` orphan wrapper (§2, §5) |
| `ControlsSection-Logging` (logging) | 15 + 1 | `logFlags` Proxy (persists) + 1 GAME_CONFIG-only | **B — GG trace reverts on reload** (`:24-28`) |
| `ControlsSection-Audio` (audio) | ~45 | `audioManager.set*` + `updatePanel` (dual persist) | dual-source-of-truth (§4); parallels `AudioSettings.svelte` modal |
| `ControlsSection-Players` (players) | 6 | local palette util (own LS) | none (correctly local) |
| `ControlsSection-Territory` modes/tuning/styles | 6 / 15 / (hosts sub-cards) | `debouncedConfigUpdate` / `queueTopology*` (DW, all mapped, persist) | **C, F**; dead renderer-module state (§2-A3) |
| `ControlsSection-FrontierFx` (frontier_fx) | 10 | `updateConfig` (DW, mapped) | none |
| `CellGridTuning` (styles sub) | ~40 | `writeConfig` (DW) | **D** (6 dups); **A5 dead** Border-Chaikin (`:799-812`) |
| `GridGradientTuning` (styles sub) | ~30 | `writeConfig` (DW) | **G** hidden Distribution coupling (`:282-285`) |
| `TerritorySurfaceStyleTuning` + `TerritorySlaWidget` (styles sub) | ~25 | `onUpdate`=`debouncedConfigUpdate` | **C, D, E**; `data-subsection-id` grandchildren (§5) |

---

## 2. Dead / orphaned settings data & code

| Item | Evidence | Status |
|---|---|---|
| **`STAR_LABEL_SLIDERS`** — 22-entry slider array | `settingsDefs.ts:117-139` | **No `.svelte` consumer.** Only `settingMetadata.ts:83` spreads its labels into search records. As a *rendered slider group* it is dead; star-label sliders are hand-built in `ControlsSection-Ships.svelte`. |
| **Deleted `TERRITORY_ENGINE_*` / `VS_TRANSITION_MODE` special-cases** | `settingsSearch.ts:88-94` (`isTerritoryRuntimeRecord`) | **Dead.** `TERRITORY_ENGINE_MODE / _STATIC_METHOD / _DYNAMIC_METHOD / _HYBRID_PLAN / _TRACE_MODE / _STEP_MODE / _STEP_ADVANCE_TOKEN` and `VS_TRANSITION_MODE` exist **only** in `config/builtin-themes/*.json` snapshots — **not** in `game.config.ts`. The search routing that names them can never resolve to a live control. |
| **Search/metadata entries naming deleted config keys** | `settingMetadata.ts` territory/timing scopes | **Dead search results.** Keys present *only* in `settingMetadata.ts` (verified absent from `game.config.ts`): `VS_TRANSITION_MODE` (`:325`), `BORDER_TRANS_RESAMPLE_N` (`:332`), `BORDER_TRANS_OVERSHOOT` (`:333`), `BORDER_TRANS_EASING` (`:548`), `TERRITORY_MORPH_CONTROL_POINTS` (`:549`), `DF_MORPH_EASING` (`:550`), `TERRITORY_BOUNDARY_MODE` (`:551`), `NEUTRAL_TERRITORY_TRANSPARENT` (`:553`), `VORONOI_SATURATION` (`:561`), `VORONOI_LIGHTNESS` (`:562`), `TERRITORY_MIN_DOMINANCE` (`:564`), `TERRITORY_ENGINE_TRACE_MODE` (`:565-566`), `TERRITORY_ENGINE_STEP_MODE` (`:567`), `TERRITORY_ENGINE_STEP_ADVANCE_TOKEN` (`:568`), `TERRITORY_TRANSITION_SETTLE_PCT` (`:582`, the *"End Settle"* entry whose help still describes the **deleted metaball** transition). Each produces a search hit that navigates to a control that no longer renders. **No test guards this** — the totality test (`settingsDefs.test.ts:86-102`) only checks `GAME_CONFIG.X` accesses inside `settings/*.svelte`, never the string keys in `settingMetadata.ts`. |
| **`CELL_GRID_PATTERN_SPACING_PX`** orphaned map entry | `settingsDefs.ts:418`; removal noted `CellGridTuning.svelte:644-646` | **Orphaned mapping.** No control writes it anymore (the Pattern-Spacing control was deliberately removed). |
| **Dead reset/import/export/debug surface in `GameSettingsPanel`** | `resetToDefaults` (`:566`), `exportConfigMD` (`:410`), `importConfigJSON` (`:424`), `exportConfigJSONBase` import (`:46`), `updateDebugShipCount`/`debugShipCount` + its `$effect` (`:377-399`), `configStatus`/`configStatusColor` (`:407-408`) | **All defined, none referenced in the template** (whole-file grep: each identifier appears only at its definition). An entire nuclear-reset + config-JSON/MD import-export + debug-ship-count feature set is dead weight. |
| **Dead combat-tuning persistence** | `loadCombatTuning`/`saveCombatTuning` (`panelSync.ts:108-127`); `STORAGE_KEY='pax-fluxia-combat-tuning'` (`:22`) | **Zero callers** repo-wide. The key is only referenced to be *removed* in `resetToDefaults`. Legacy dead path. |
| **Dead renderer-module state (A3)** | `TERRITORY_RENDERER_MODULE_PANEL_KEY`, `activeRendererModule`, `rendererModules()`, `setActiveRendererModule` (`ControlsSection-Territory.svelte:121-136, 447-490`) | Defined but **no chip UI binds to them** in that file's template (the equivalents in `CellGridTuning.svelte:612-619` / `GridGradientTuning.svelte:118-125` *are* rendered). |
| **Unreachable control (A5)** | `CellGridTuning.svelte:799-812` "Border Chaikin Passes" | Gated by `usesBorderChaikinControl()` (`:268-275`) which returns `false` in Phase-Field mode, but its enclosing block (`:702`) only renders *in* Phase-Field mode — mutually exclusive → **never renders**. The live writer is `TerritorySurfaceStyleTuning.svelte:563-578`. |
| **`RangeDual.svelte`** | consumer `main-menu/GameMapPanel.svelte:4,236` only | Not a settings-surface component (confirms dossier note); no settings-tree consumer. |
| **`selectFrontierTransition`** | `ControlsSection-Territory.svelte:407-413` | Only invoked internally in the `pv_frontline` migration fallback (`:359`); no direct UI control calls it. Possibly orphaned — flagged, not confirmed (writes the in-flight `TERRITORY_FILL_TRANSITION_MODE`). |

---

## 3. State ownership map

### 3.1 `GAME_CONFIG` — the shared mutable object (≈8 independent writer families)

`GAME_CONFIG` is a plain object (not `$state`). Writers:
1. `applyMappedSetting` via `updatePanel`/`setSetting` (`settingsState.ts:39-42`).
2. Every `ControlsSection-*` handler's **direct** `GAME_CONFIG.X = value` (Travel/Surge/Conquest/
   Economy/Ships/Visuals/Battle/AI + territory helpers) — the redundant leg of the double-write.
3. `applyPanelToConfig` at startup + `onMount` (`panelSync.ts:392-402`, `GameSettingsPanel.svelte:131`).
4. `setAnimValue` (`GameSettingsPanel.svelte:560-563`).
5. `applyTimingBindingsAndLocks` (`:176-222`) — writes `BASE_TICK_MS`, `ANIMATION_SPEED_MS`,
   `TERRITORY_TRANSITION_MS`.
6. `applyVisuals` (`panelSync.ts:162-176`) — `CONNECTION_*`, `BG_IMAGE_URL`.
7. `setSettingsFromConfigPatch` / theme + category-preset apply (`settingsState.ts:80-110`,
   `GameSettingsPanel.svelte:295-342`).
8. `audioManager.set*` (`ControlsSection-Audio` + `AudioSettings` modal).

**Read-modify-write races:** none within a single handler, but finding **A** is a within-handler
last-writer-wins race between two legs of the *same* handler. The Timing "Animation Speed" value is
**triple-mirrored** (`animationStore.speedMs` with its own LS key, `GAME_CONFIG.ANIMATION_SPEED_MS`,
`panel.animSpeed`) kept in lockstep only by convention (`ControlsSection-Timing.svelte:96-108`).

### 3.2 `panel` — persisted panel state (`$state` in `GameSettingsPanel`)

Single owner is the component, but written from six code paths: `updatePanel`/`setSetting`;
`setAnimValue`→`syncPanelKey` (`:550-558`, writes `panel` **directly**, bypassing `setSetting`/schema);
`applyTimingBindingsAndLocks` (`:182-216`); `syncAllFromConfig`→`syncPanelFromConfigPatch`;
`applyConfigPatch`→`setSettingsFromConfigPatch`; `updateTransferRate` (`:369-374`). The
`setAnimValue`/`syncPanelKey` pathway is a **parallel write pipeline** distinct from the schema-driven
`setSetting` used everywhere else — architectural inconsistency (harmless today; no inverse anim keys).

### 3.3 Effect-chain risks (`GameSettingsPanel`)

| `$effect` | Reads | Writes | Risk |
|---|---|---|---|
| `:958-976` | `activeSectionId`, `visibleSections` | **`activeSectionId`** | Effect writes state it reads. Fires only on tier change now (`isSectionVisible` is tier-only, `:865-867`); the dossier's "Show fill leaves visibleSections" trigger is **dead**. The `log.ui("settings-fallback",…)` + probe here are leftovers of a superseded diagnosis. |
| `:1034-1048` | `activeSubsections`, `sectionSubsections` | **`activeSubsections`** | Normalizes invalid subsection → `"all"`. Guarded by `changed`; terminates. Pairs with the persist effect below on the same state. |
| `:798-804` | `activeSubsections` | LS `pax-fluxia-settings-subsections` | write-only persist; re-runs whenever the normalizer mutates the state. |
| `:767-773`, `:794-797`, `:806-813` | respective state | LS keys | write-only persist effects (fine). |
| `:389-399` | `selectedStarStore.id` | `debugShipCount` | debug-ship feature is otherwise dead (§2). |

### 3.4 DOM-as-source-of-truth violations ("settings are data, not the DOM")

| Site | What it does |
|---|---|
| `applySubsectionFilter` (`GameSettingsPanel.svelte:1154-1168`) | Imperatively toggles `.is-hidden-by-subsection` by reading `node.children[*].dataset.subsectionId`. **Direct-children only** and **non-reactive** (runs on action `update()` via `queueMicrotask`, `:1170-1199`). This is the dossier's Theory-2 second layout writer. |
| `registerSectionBody` + `sectionBodyNodes` Map (`:1026, 1170-1199`) | Stores live `HTMLElement` refs keyed by section id — layout state held as DOM handles. |
| `enhanceSettingMetadata` (`settingMetadata.ts:712-741`) | `MutationObserver` + `querySelectorAll` + `textContent` to attach `title` tooltips after render. |
| `resolveSearchTargetElement` (`GameSettingsPanel.svelte:1063-1101`) | Finds the scroll target by `querySelector([data-setting-config-key])` then fuzzy `textContent` matching. |
| `findExistingDescription` (`settingMetadata.ts:656-669`) | Reads sibling `.var-desc`/`.row-bottom` `textContent` as the tooltip source. |

The search/tooltip system therefore depends on every control rendering `data-setting-config-key` on its
label element (`PaxSettingsToggleRow.svelte:52`, `PaxSettingsSegmentedRow.svelte:44`,
`PaxSettingsRangeRow.svelte:61`). Controls that don't (e.g. `AudioSettings` native inputs) are invisible
to search/tooltips.

---

## 4. Persistence integrity

### 4.1 localStorage key inventory

| Key | Owner | Purpose | Notes |
|---|---|---|---|
| `pax-fluxia-panel-settings` | `panelSync.PANEL_STORAGE_KEY` | main panel state blob | migrations run on load (§4.2) |
| `pax-fluxia-visuals` | `VISUALS_STORAGE_KEY` | lane/bg visuals (`vis`) | normalizes `bgImage` path |
| `pax-anim-lock-ratios` + `…-modes` | `ANIM_LOCK_STORAGE_KEY` (+ `'-modes'` suffix) | anim-lock ratios / modes | two keys, one constant + suffix |
| `pax-fluxia-settings-tier` | `TIER_STORAGE_KEY` | basic/advanced/developer | **default is `developer`** (`panelSync.ts:648-653`) |
| `pax-fluxia-combat-tuning` | `STORAGE_KEY` | **DEAD** | no reader/writer (§2) |
| `pax_logFlags` | `logger.ts:17` (Proxy) | log channel flags | underscore, not hyphen — still `pax*`-prefixed so reset catches it |
| `pax-fluxia-audio-config` | `audioManager` | audio volumes/files/offsets | **overlaps** panel LS AUDIO_* keys (§4.3) |
| `pax-fluxia-active-section` | `GameSettingsPanel:659` | last open section | |
| `pax-fluxia-settings-show-all` | `:660` | "All" view flag | |
| `pax-fluxia-settings-subsections` | `:661` | per-section chip selection | |
| `pax-fluxia-settings-section-by-category` | `:666` | per-category remembered section | |
| `pax-fluxia-settings-open-category` | `:703` | open category | |
| `pax-settings-panel-width` | `GameContainer:266` | settings column width | **auto-clobbered to 640** (§4.4) |
| `pax-sidebar-width` | `GameContainer:262` | right sidebar width | |
| `pax-settings-open`, `pax-settings-ribbon-expanded`, `pax-sidebar-side`, `pax-controls-side`, `pax-pause-on-settings`, `pax-leaderboard-collapsed`, `pax-show-star-info`, `pax-fluxia-menuTheme` | `GameContainer` (`:174-224, 98-118`) | misc UI chrome | all `pax*`-prefixed |
| player-palette key | `$lib/utils/playerPalette` | player colors | own dedicated key |

### 4.2 Migration / versioning

- Panel migrations run on every `loadPanelSettings` (`panelSync.ts:318-359`): `PANEL_KEY_RENAMES` (8
  legacy renames), lane-margin split, `metaballGrid*`→`cellGrid*`, surface key renames
  (`LEGACY_SURFACE_PANEL_KEY_RENAMES`), and policy-versioned migrations
  (`TERRITORY_TRANSITION_POLICY_VERSION=1`, `TERRITORY_MODE_SPLIT_POLICY_VERSION=1`,
  `CONQUEST_FRONT_POLICY_VERSION=2`).
- **There is no top-level schema/version stamp on the panel blob** — migrations are keyed by presence of
  individual legacy keys + separate `*PolicyVersion` fields inside the blob. Fragile but functional; a
  new rename must remember to add both a rename map entry and (if defaulting) a policy version.
- Migration math has unit coverage (`panelSync.test.ts`) for the transition-timing normalizer only.

### 4.3 Incompatible-shape / dual-write keys

- **AUDIO_* dual persistence.** Every audio control persists through **two** independent systems:
  `audioManager`'s `pax-fluxia-audio-config` **and** the panel's `pax-fluxia-panel-settings` (all AUDIO_*
  keys are in `PANEL_CONFIG_MAP` `settingsDefs.ts:560-607`, and `ControlsSection-Audio` calls
  `updatePanel` in addition to `audioManager.set*`). Both write the same `GAME_CONFIG.AUDIO_*` keys.
  Whichever load path runs last on startup wins if they ever diverge. Plus the standalone
  `AudioSettings.svelte` modal writes **only** through `audioManager`, so it can update
  `pax-fluxia-audio-config` without touching panel LS. Latent double-source-of-truth.
- `pax-anim-lock-ratios` vs `pax-anim-lock-ratios-modes`: two blobs keyed by the same slider ids; a
  partial write to one is not validated against the other (`panelSync.ts:486-522`).

### 4.4 Width clobber (structural, from GameContainer)

`setSettingsSectionActivity` and `openSettingsSection` (`GameContainer.svelte:315-329, 336-344`)
overwrite the user's saved `settingsPanelWidth` to `SETTINGS_PANEL_SECTION_DEFAULT` (640) and **persist
it** whenever a section opens below 640. The saved default is 520 (`:269`), so the first time a user
opens any section their chosen width is silently bumped to 640 forever. (Dossier Theory 3 — column
self-resize; confirmed a one-way persistent clobber.)

### 4.5 `resetToDefaults` coverage

Would clear all `pax`/`PAX`-prefixed keys plus explicit non-prefixed ones (`panelSync` keys, anim-lock)
— all current keys are `pax*`-prefixed, so coverage is complete. **But the function is never wired to a
control** (§2), so the nuclear reset is unreachable from the UI.

---

## 5. Structural / consistency findings (not in the dossier)

| # | Finding | Evidence |
|---|---|---|
| S1 | **`ControlsSectionVisuals` mounted for two section ids** with the same prop contract — `ui_appearance` (below `HudThemePanel`) and `map_options`. Two entry points to one component; edits to one context affect both. | `GameSettingsPanel.svelte:1489-1495` & `:1638-1644` |
| S2 | **`ControlsSectionTerritory` mounted three times** (`view="modes"|"tuning"|"styles"`) with divergent prop subsets (`hideRenderModeSelector`, `showCategoryThemeBar`, `activeSubsection`, `systemTitle`). The `styles` view hosts `CategoryThemeBar`, `CellGridTuning`, `GridGradientTuning`, `TerritorySurfaceStyleTuning`. | `:1569-1620` |
| S3 | **Two parallel audio surfaces**: `AudioSettings.svelte` modal (writes via `audioManager` only) and `ControlsSection-Audio` (writes via `audioManager` **and** `updatePanel`). Different persistence footprints for "the same" settings. | `AudioSettings.svelte:54,173-236`; `ControlsSection-Audio.svelte` |
| S4 | **Three different subsection mechanisms coexist**: (a) imperative `.is-hidden-by-subsection` class on **direct** children (`applySubsectionFilter`), (b) `{#if}`-based family gating inside territory components, (c) the reactive `$effect` normalizer (`:1034-1048`). They behave differently (non-reactive vs reactive; direct-child vs family), the dossier's Theory-2 split. | `GameSettingsPanel.svelte:1154-1168`, territory components, `:1034-1048` |
| S5 | **`data-subsection-id` mismatches (both directions).** `territory_styles` chips are **render-mode ids** (`power_vector/phase_edges/ember_lattice/phase_field/grid_gradient`, catalog-derived at `settingsRegistry.ts:167-173`), but `TerritorySurfaceStyleTuning` emits `data-subsection-id="fill"` / `"border"` (`:301,417`) — ids matching **no chip**, and rendered as **grandchildren** of the section body (nested under `.territory-style-stack`, `:299`) so the direct-children-only imperative filter never touches them anyway. Separately, `SettingsDumpDiagnosticsControls` emits `data-subsection-id="live-settings-dump"` (`:47`) with **no matching diagnostics chip** — reachable only in the "All" view. All other sections' `data-subsection-id` ↔ chip mappings match 1:1 (Ships ×12, Visuals ×4, Audio ×3, Diagnostics ×5). | as cited |
| S6 | **Two sources for the render-mode id list.** The `territory_styles` chips derive from the catalog (`resolveTerritoryRenderModeOptions`, `settingsRegistry.ts:167`), but `ControlsSection-Territory` hardcodes a parallel `RENDER_MODE_SUBSECTION_IDS` set (`:373-379`). Drift risk if the catalog changes. | as cited |
| S7 | **Inconsistent control primitives for the same semantic.** Settings sections use the tokenized `Pax*` rows; `AudioSettings.svelte` uses raw native `<input type=range>`/`<select>` (`:186-224`); Diagnostics mixes `Pax*` rows with bespoke buttons. Native controls also lack the `data-setting-config-key` search hook. | `AudioSettings.svelte:186,222`; `ControlsSection-Diagnostics.svelte` |
| S8 | **Tier model.** Default tier is `developer` (`panelSync.ts:648`), so all sections show by default; the tier filter (`isSectionVisible`, tier-only) only bites when a user downshifts. Several developer-grade surfaces sit in **`basic`/`advanced`** tiers: `territory_styles`/`territory_tuning`/`frontier_fx` are `basic` (`settingsRegistry.ts:146-174`) yet expose shader/frontier/Chaikin internals; `map_options` is `basic` yet exposes MSR/lane-margin topology. Only `diagnostics`/`logging`/`ai` are `developer`. If a user ever selects `basic`, they still see deep render internals. |
| S9 | **Accessibility (brief, factual).** `Pax*` rows are sound: `PaxSettingsToggleRow` uses a visually-hidden real `<input type=checkbox>` inside a `<label>` with `aria-hidden` on the visual switch (`:39-48`); `PaxSettingsSegmentedRow`/`PaxSettingsRangeRow` pass `ariaLabel`. Gaps: category/subsection chips are `PaxHudButton` with `title` + an `active` prop but **no `aria-pressed`/`aria-current`** exposed here (`GameSettingsPanel.svelte:1296-1433`); search-result rows are `<button>` (OK); `AudioSettings` native inputs rely on adjacent `<span>` labels, not `<label for>`. |

---

## 6. Severity-ranked summary (top 10)

| # | Defect | Evidence | User-visible consequence | Root-cause fix shape |
|---|---|---|---|---|
| 1 | **Aggressor Advantage inverse stomp** | `ControlsSection-Battle.svelte:53-60`; schema `settingsDefs.ts:177` | The combat balance value the sim uses is the **reciprocal** of intended, and **changes between sessions** (live = raw, post-reload = inverted). Silent gameplay corruption. | Delete the trailing direct `GAME_CONFIG[configKey]=value` write; let `updatePanel` be the sole writer so the schema `inverse` transform is authoritative. (Systemic: remove the redundant direct leg everywhere — see #4.) |
| 2 | **Grid-Gradient trace reverts on reload** | `ControlsSection-Logging.svelte:24-28,71-78` | Dev enables the trace, reloads, it's silently off again. | Route through `updatePanel('gridGradientDebugTransitions', v)` (key already mapped); or pass `panel`/`updatePanel` into the Logging section like every other section. |
| 3 | **Duplicate live editors for one key** (`TERRITORY_CONQUEST_FRONT_MODE`, `VORONOI_BORDER_SMOOTH`) | `ControlsSection-Territory.svelte:530-546,549-562` & `TerritorySurfaceStyleTuning.svelte:449-462,483-505` | Two controls for the same setting on screen; changing one leaves the other stale until re-render — user distrust. | One owner per key. Render the control once (the modes view) and remove the styles-view duplicate, or derive both from a single shared control component. |
| 4 | **Universal redundant double-write** | every `ControlsSection-*` handler + `settingsState.ts:39-42` | No direct symptom, but it is the mechanism behind #1 and doubles write/`localStorage` churn on every slider tick. | Make `updatePanel` the single write path (as `ControlsSection-Visuals.updateLanePath` `:120-124` already proves works); delete direct `GAME_CONFIG` legs. |
| 5 | **Six controls rendered twice in Phase-Field mode** | mount `ControlsSection-Territory.svelte:1007-1010`; `CellGridTuning` vs `TerritorySurfaceStyleTuning` (§1.2-D) | Duplicated Cell Shape/Inset/Offset/Corner/Border-Mode/Blend widgets; edits appear to "not stick" as the twin shows the old value. | Give each `CELL_GRID_*` control a single owning component; gate the other by family so only one renders. |
| 6 | **Dead search/metadata keys** (~15) incl. `VS_TRANSITION_MODE`, `TERRITORY_ENGINE_*`, `TERRITORY_TRANSITION_SETTLE_PCT`/"End Settle", `VORONOI_SATURATION/LIGHTNESS`, `BORDER_TRANS_*`, `TERRITORY_BOUNDARY_MODE` | `settingsSearch.ts:88-94`; `settingMetadata.ts:325,332-333,548-568,582` | Search returns results that jump to a section and highlight nothing (the dossier's "search doesn't take me to the setting"). | Delete the dead entries; add a test that every `settingMetadata`/`settingsSearch` config key exists in `game.config.ts` (extend `settingsDefs.test.ts:86-102` beyond `GAME_CONFIG.X` DOM accesses). |
| 7 | **Dead reset/import/export/debug surface** | `GameSettingsPanel.svelte:46,377-399,410,424,566` | None (invisible), but ~200 lines of unreachable handlers mask what the panel actually does and carry a live nuclear-reset function. | Delete the dead functions/state/imports; if reset/export is wanted, wire it to a real control. |
| 8 | **Audio dual/triple source-of-truth** | `ControlsSection-Audio` + `audioManager` (`pax-fluxia-audio-config`) + `AudioSettings.svelte` | Volume/mute set in the modal vs the panel can diverge; whichever loads last wins after reload. | One audio store as the single writer of `GAME_CONFIG.AUDIO_*` and its own persistence; the panel and modal both drive that store, neither writes `updatePanel` for audio. |
| 9 | **Fake debounce on topology sliders** | `ControlsSection-Territory.svelte:217-270` | Dragging heavy topology sliders re-triangulates every input event (only the repaint is deferred, not the value write) — the perf win the naming implies is not delivered. | Actually debounce the `GAME_CONFIG` write **and** the `bumpTerritoryVisualConfig` behind the timeout; don't let `updatePanel` write synchronously first. |
| 10 | **Settings-panel width self-clobber** | `GameContainer.svelte:315-329,336-344` | User's chosen narrower settings width is silently overwritten to 640 (and persisted) the first time they open any section. | Treat 640 as a **minimum for display** (clamp the rendered width) without mutating/persisting the user's stored preference. |

Runners-up worth fixing in the same pass: `STAR_LABEL_SLIDERS` dead array (`settingsDefs.ts:117-139`);
dead `saveCombatTuning`/`STORAGE_KEY` path; unreachable `CellGridTuning` Border-Chaikin control
(`:799-812`); hidden `GRID_GRADIENT_DISTRIBUTION` coupling (`GridGradientTuning.svelte:282-285`);
`live-settings-dump` orphan subsection wrapper.

---

## 7. Not determinable from source alone (honest list)

- **Whether the AUDIO_* dual-persistence ever actually diverges in practice** — depends on
  `audioManager`'s constructor load order vs `hydrateConfigFromPersistedUiSettings` at runtime, which the
  static read cannot sequence with certainty.
- **Whether `selectFrontierTransition` (`ControlsSection-Territory.svelte:407-413`) is truly dead** — no
  UI caller exists in the 9 territory files, but it writes the in-flight `TERRITORY_FILL_TRANSITION_MODE`
  and may be reachable via a component outside the audited set. Flagged, not confirmed.
- **The runtime effect of the redundant double-writes on `localStorage` throughput during a drag** —
  each `onInput` triggers a synchronous `savePanelSettings` (+ `dumpSettings`); whether this is a
  measurable jank source needs a profile, which is out of scope (human-eyes-only; no browser tooling).
- **Whether any theme/category-preset apply path re-introduces the deleted keys** listed in §2 — the
  `config/builtin-themes/*.json` snapshots still contain `TERRITORY_ENGINE_*` etc.; how `parseConfigImport`
  / `applyConfigPatch` handle unknown keys on import was not exhaustively traced here.
- **The resize/collapse mechanism itself** — deliberately left to the parallel root-cause effort; this
  audit only maps the structural contributors (§3.4 second layout writer, §4.4 width clobber, §5-S4/S5).
- **Exact per-control line cites for all ~250 controls** — the full row-by-row tables were produced during
  the census; §1.3 condenses them to per-file summaries + every anomaly. The anomalies carry precise
  `file:line`; the non-anomalous "redundant double-write" rows are uniform per file.
