# Settings UI / HUD — Audit Dossier (data collection)

**Date:** 2026-07-14
**Status:** DATA ONLY — collected ahead of a full-scope Settings UI/HUD audit. Nothing here has been
acted on except where a commit is named. No fixes were applied to the layout system.
**Trigger:** user request during the post-cleanup pass — *"we WILL be performing a full-scope Settings
UI/HUD audit, as there are some very annoying issues that remain (settings panels resize themselves
within the containing column when some toggles are used)"*.

Collected read-only from source (no browser tooling — this project is human-eyes-only for visual
verification). Every claim below carries a `file:line` so the audit can start from evidence rather
than re-derive it.

---

## 0. The headline: this hunt is already in the code, unfinished

Two artifacts prove the resize symptom was investigated before and **never solved**. They are the
single most important context for the audit:

- **`GameSettingsPanel.svelte:1209-1258`** — `probePanelHeights`, a live `ResizeObserver` wired to
  `.controls-panel` / `.settings-shell` / `.settings-content` / `.section-panel` / `.section-body` /
  `.icon-toolbar`, logging to the pause-exempt `log.ui` channel. Its own header comment (`:1209-1212`)
  reads: *"TEMP DIAGNOSTIC (panel-collapse hunt) … Remove once the cause is found."* **Still present.**
- **`GameSettingsPanel.svelte:967-969`** — *"PAUSE-EXEMPT collapse trace: if a setting toggle (e.g.
  Show fill) makes the active section leave visibleSections, the panel jumps/collapses."*

Prior fix attempts are documented in place at `:1685-1689` and `:2216-2218`, both naming *"the
intermittent ~25% 'collapse' seen when certain toggles force a relayout."*

**The instrument already exists.** The audit should start by reading it, not by adding another.

---

## 1. Ranked theories for "panels resize themselves when some toggles are used"

### Theory 1 — `.section-body`'s 8px classic scrollbar appears/disappears (STRONGEST)

Three facts combine:

1. `GameSettingsPanel.svelte:2042-2050` — `.section-body { flex:1; overflow-y:auto; min-height:0; }`
   — a fixed-height scroll surface with **no `scrollbar-gutter`**.
2. `app.css:761-764` — a **global** `::-webkit-scrollbar { width: 8px; height: 8px; }`. Styling
   `::-webkit-scrollbar` with an explicit width forces Chrome to use **classic, layout-consuming**
   scrollbars (it disables overlay scrollbars). The 8px comes out of the content box.
3. `scrollbar-gutter: stable` appears **exactly once in the entire repo** — `hud.css:1215`, on
   `.pf-theme-library__list`, which is structurally parallel to `.section-body`. **The pattern is
   known here and was not applied to the settings body.**

**Mechanism:** a toggle reveals a subtree → content height crosses the container height → the 8px
scrollbar appears → the content box narrows by 8px → every `input[type="range"] { width:100% }`
(`panel-shared.css:174-175`) and `.mode-select { width:100% }` (`:219-224`) re-lays-out. Everything
in the panel visibly shifts.

**Why SOME toggles and not others** — the differentiator is subtree volume vs. remaining space:

| Toggle | control → `{#if}` | Added subtree | Crosses threshold? |
|---|---|---|---|
| "Show Halos" | `ControlsSection-Ships.svelte:329-335` → `336-495` | ~9 controls + nested block | **Very likely** |
| "Merge Ships Into Orb" | `ControlsSection-Surge.svelte:132-142` → `144-288` | ~10 ranges + 3 grids | **Very likely** |
| "Fleet Glow" | `ControlsSection-Ships.svelte:434-440` → `441-494` | 2–4 controls | Marginal |
| Border blend | `CellGridTuning.svelte:769-779` → `798-844` | 1–3 rows | Marginal |
| "Force-Reactive Surge" | `ControlsSection-Surge.svelte:50-60` → `62-76` | 1 row | **No** |

This also explains **intermittency**: the same toggle crosses the threshold at one panel height and
not another.

**Honest weakness:** this explains an 8px reflow of content *inside* the panel. It does **not** change
`.section-panel`'s own box. If the card itself changes size, this theory is incomplete.

### Theory 2 — Two competing subsection filters; the imperative one is non-reactive and direct-children-only

`GameSettingsPanel.svelte:1154-1168` toggles `.is-hidden-by-subsection` imperatively
(→ `display:none !important` at `:2173-2175`). Three distinct defects:

- **(a) Non-reactive.** It runs only on the action's `update()` (`:1185-1192`, via `queueMicrotask` at
  `:1174`) — when `sectionId`/`activeSubsection` change. It does **not** re-run when a toggle
  mounts/unmounts a child, so a remounted `data-subsection-id` child arrives **without** the hide
  class and reappears — content grows.
- **(b) Direct children only.** In `TerritorySurfaceStyleTuning.svelte:304`, the
  `.territory-style-stack` wrapper makes `data-subsection-id="fill"` (`:306`) and `"border"` (`:443`)
  **grandchildren** → `node.children` never sees them → **the imperative filter is a silent no-op for
  `territory_styles`**, which instead filters by `{#if}` unmount (`:104-106`). So mechanism A
  (`display:none`) and mechanism B (`{#if}` unmount) coexist and behave differently. **A structural
  "some sections, not others" split.**
- **(c) `:1159` — the "All" view still hides.** "All" passes `activeSubsection: "all"` (`:1441`) but
  `applySubsectionFilter` reads `activeSubsections[sectionId]` **first**, so the `?? activeSubsection`
  fallback is dead whenever state is set.

This is the same family as the standing rule *"settings are data, not the DOM"* — a second writer of
layout state living outside Svelte's reactivity.

### Theory 3 — A literal self-resize of the column

`GameContainer.svelte:315-329` — opening a category **overwrites the user's chosen width and persists
it**:
```js
if (hasOpenSections && settingsPanelWidth < SETTINGS_PANEL_SECTION_DEFAULT) {
    settingsPanelWidth = SETTINGS_PANEL_SECTION_DEFAULT;   // 640
    localStorage.setItem(SETTINGS_PANEL_STORAGE_KEY, String(settingsPanelWidth));
```
Fires only when width < 640 → one-time, then never again. The most literal reading of "resizes
itself", but column-level and triggered by category open, not an in-section toggle.

### Theory 4 — Transitions on layout properties (intentional)

`GameSettingsPanel.svelte:2531-2533` — `.settings-shell { transition: grid-template-columns 0.22s
ease, width 0.22s ease; }`; `GameContainer.svelte:1713` and `hud.css:856` — `transition: width 0.22s
ease`. On ribbon-expand/dock toggles `--settings-ribbon-width` animates 68↔216 and **every panel
resizes over 220ms, by design**. If "toggles" includes the expand chevron or dock switch, this is the
answer and it is intentional.

### Ruled out

- **`:has()`** — zero occurrences repo-wide.
- **The documented "Show fill → leaves visibleSections" theory (`:967-975`) is now STALE.**
  `isSectionVisible` (`:865-867`) filters by **tier only** ("now filters by TIER only", `:864`). No
  ordinary toggle can trigger that fallback anymore. The trace and probe are leftovers from a
  superseded diagnosis.
- **Row primitives are clean** — `PaxSettingsToggleRow.svelte:69/72` (`min-width:0`,
  `grid-template-columns: 38px minmax(0,1fr) auto`), `PaxSettingsRangeRow.svelte:81`,
  `PaxSettingsSegmentedRow.svelte:64/77`.

### What could NOT be determined from source alone

- **Whether the symptom is a width or a height change.** The height chain is fully guarded (every link
  from `.game-layout`'s `100dvh` down to `.section-body` carries `min-height:0` + `height:100%`/
  `flex:1`), so **no mechanism was found by which an ordinary in-section toggle resizes
  `.section-panel`'s own box.** If the card itself resizes, the source does not account for it.
- Whether "toggles" means checkboxes only, or includes the chevron/dock switch (which resize by design).

### The check that confirms or kills Theory 1 (no code changes needed)

1. Enable the **`ui`** log channel (pause-exempt — the settings panel pauses the game, which mutes
   `log.canvas`; that is why the probe never surfaced).
2. Open **Fleet & Star Visuals → Halos**, toggle **"Show Halos"**. Watch `settings-probe`.
   - `.section-body h=` and `.section-panel h=` constant but contents shift → **Theory 1 confirmed**;
     fix is `scrollbar-gutter: stable` on `.section-body`.
   - `.section-panel h=` or `.controls-panel h=` changes → the height chain **is** breaking; Theory 1 dead.
   - Nothing logs → the resize is below `.section-body`; the probe's selectors are too shallow.
3. Control: **"Force-Reactive Surge"** (adds 1 row) should **not** resize. If it does, subtree volume
   is not the differentiator and Theory 1 is wrong.

---

## 2. Systemic root causes (distinct from instance bugs)

1. **`GameSettingsPanel.svelte`'s single `<style>` block is 1,119 lines of CSS in 3–4 stacked,
   self-overriding layers**, labelled by their own comments: base (`:1664-2176`), mobile
   (`:2177-2210`), *"Aurelia Drift correction layer"* (`:2212-2505`), *"Settings ownership correction:
   the rail is the master component"* (`:2506-2783`). Re-declaration counts **within that one block**:

   | Selector | Times redeclared |
   |---|---|
   | `:global(.icon-btn)` | **24 rule blocks** |
   | `:global(.icon-toolbar-control)` | 11 |
   | `:global(.controls-panel--ribbon-expanded …)` | 10 |
   | `.icon-toolbar` | 5 |
   | `.icon-toolbar__controls` | 5 |
   | `.settings-content` | 5 |
   | `.icon-label` | 4 |
   | `.settings-shell` | 3 |
   | `.section-panel` | 3 |
   | `.section-body` | 3 |
   | `.controls-panel` | 3 |

   All at specificity (0,1,0), so **the last one silently wins**. This is the single biggest structural
   problem in the settings UI and the reason layout behaviour is hard to predict.

2. **The containing column is a content-sized `auto` track** — `GameContainer.svelte:1208`:
   `grid-template-columns: 1fr auto auto`. It is pinned *only* because `.area-controls` happens to
   carry an inline px width + `flex-shrink:0` + `overflow:hidden`. Nothing structural guarantees it.

3. **`.section-body` scrolls without a stable gutter** while the app forces classic 8px scrollbars.
   The fix pattern exists at `hud.css:1215` and was not applied here.

4. **Two competing subsection filters** (imperative class writer vs. `{#if}` unmount) — see Theory 2.

5. **`.settings-content` targets a grid area that may not exist.** The last `.settings-shell` rule
   (`:2518`) collapses the template to a single `"rail"` track, but `.settings-content` keeps
   `grid-area: content` (`:1702`) — so with no category open it is auto-placed into an implicit
   **`auto`-sized** row.

6. **The ribbon width 68/216 is declared 4× as a CSS custom property** (`:1666, :1677, :2508, :2515`)
   **and again as raw hardcoded values** in `GameContainer.svelte:1841`
   (`grid-template-columns: 68px minmax(0,1fr)`) and `:1846` — unlinked to the variable. Undocumented
   drift risk.

---

## 3. Structural inventory

### Scale

| Area | Files | LOC |
|---|---|---|
| `components/ui/settings/` | 29 | 12,082 |
| `components/ui/` (settings-related root) | 12 | 6,006 |
| `components/game-hud/` | 16 | 1,963 |
| CSS: `GameSettingsPanel` `<style>` | — | 1,119 |
| CSS: `hud.css` | — | 1,765 |
| CSS: `GameContainer` `<style>` | — | 963 |
| CSS: `panel-shared.css` | — | 375 |
| CSS: `app.css` | — | 808 |

Largest components: `GameSettingsPanel.svelte` 2,783 · `ControlsSection-Ships.svelte` 1,291 ·
`CellGridTuning.svelte` 1,202 · `ControlsSection-Territory.svelte` 1,150 ·
`ControlsSection-Diagnostics.svelte` 1,033.

### Mount tree (abridged)

The real mount root is **`components/game/GameContainer.svelte`** (2,145 LOC), not anything in
`game-hud/`.

```
GameContainer (.game-layout grid, :1194-1252)
├─ AudioSettings.svelte            (:790 — modal, SEPARATE from ControlsSection-Audio)
├─ .area-topbar → HudTopbar        (:805)
├─ StatusBar (ui/hud — legacy)     (:822)
├─ .area-canvas → GameCanvas       (:830)
├─ {#if showSettingsPanel} .area-controls   (:889, transition:slide axis x 220ms)
│    └─ SettingsRibbon → GameSettingsPanel
│         └─ {#snippet sectionContent} routed by sec.id  (:1481-1659)
│              ├─ transition        → ControlsSectionTerritory (view="modes")
│              ├─ territory_tuning  → ControlsSectionTerritory (view="tuning")
│              ├─ territory_styles  → ControlsSectionTerritory (view="styles")
│              │     └─ CategoryThemeBar, CellGridTuning, GridGradientTuning,
│              │        TerritorySurfaceStyleTuning → TerritorySlaWidget ×2
│              ├─ map_options       → ControlsSectionVisuals  (2nd mount of same component)
│              └─ … 18 more sections
└─ .area-right → PlayerStandingsPanel, GameSpeedPanel, SelectedStarPanel, QuickAccessDock
```

### Findings worth deciding on (not defects yet — questions for the audit)

- **Two parallel audio-settings surfaces**: `AudioSettings.svelte` (694 LOC, standalone modal mounted
  by GameContainer) and `ControlsSection-Audio.svelte` (339 LOC, the `audio` section). Two
  implementations of "audio settings" reachable by different entry points.
- **Legacy and current HUD coexist in one render tree**: GameContainer imports from both
  `$lib/components/ui/hud/*` (StatusBar, StarNav, StarInfoPanel, SpeedControls, Leaderboard,
  ResultsModal, HudIcon) and `$lib/components/game-hud/*`. Which is canonical is undecided.
- **Three independent hardcoded colour palettes**, none using `--pax-*` tokens:
  `settingsRegistry.ts:54-241` (17 hex category colours), `settingsTaxonomy.ts:44-109` (8 more,
  overlapping but not identical), `game-hud/viewModels.ts:10-16` (7 star-type badge colours).
- **`RangeDual.svelte`** (120 LOC) sits in the settings-adjacent `ui/` root with zero consumers in the
  settings tree (only `main-menu/GameMapPanel.svelte`).
- **`app.css:653-674`** defines `.hud-overlay` / `.hud-top-left` / `.hud-top-right` with zero
  consumers anywhere in `src`.
- **Magic-number px repetition** across settings+HUD layout rules: `12px` ×28, `8px` ×21, `18px` ×15,
  `16px` ×14, `32px` ×13, `34px` ×9, `28px` ×8, `68px` ×5 — literals rather than `var(--pax-space-*)`.
  Note `panel-shared.css` control-level rules ARE well tokenized; it is the layout skeleton that is not.

---

## 4. Config-layer findings from the same pass (ALREADY FIXED — recorded for context)

The settings surface was carrying knobs for renderers deleted during the cleanup campaign. Fixed
2026-07-14:

- `5d6bbfcd4` — deleted the dead legacy render-mode selection path (35 keys), incl. an unreachable
  "Perimeter Inward Offset" control gated on a family its only call site can never pass.
- `1dbebba52` — purged 135 dead renderer knobs and **two lying knobs the user could actually drag**:
  "End Settle" (its help text described the deleted metaball transition) and the 5 "VS Transition"
  sliders. `territory.config.ts` 217 → 61 lines.
- `850c319db` — unified `readTunable` (4 copies → 1); deleted the metaball family; moved the shared
  `TERRITORY_SURFACE_*` keys out of it into `territory.config.ts`.

**Method worth reusing in the UI audit:** classify each control by **who reads it**, not by its name
or label. A key is real only if code outside (config declarations | settings UI | theme data | tests)
consumes it. That test is what exposed the lying knobs; the same question applied to *components*
(who renders this? can that gate ever be true?) is the right lens for the UI audit.

---

## 5. Suggested audit order

1. **Read the existing probe output first** (§1, the confirm/kill check). It costs nothing and it
   decides between "8px gutter" and "the height chain is breaking" — a fork the source cannot resolve.
2. **Collapse the 4 stacked CSS layers in `GameSettingsPanel.svelte`** into one. Everything else in
   the panel is unpredictable until the last-rule-wins pile is gone. This is the big one.
3. **Resolve the two subsection filters into one declarative mechanism** (settings are data, not the DOM).
4. Decide the coexistence questions: legacy `ui/hud/*` vs `game-hud/*`; two audio surfaces.
5. Tokenize the layout skeleton (ribbon width, spacing, the three colour palettes).
