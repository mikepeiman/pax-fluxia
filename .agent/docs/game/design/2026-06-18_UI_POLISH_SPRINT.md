---
date created: 2026-06-18
revised: 2026-06-18 (corrected arrow mapping per user; prior version mis-read A3/A4/A7)
status: backlog — design polish sprint
owner: UI design
source: annotated screenshots
---

# UI Polish Sprint — corrected catalog

Each item is atomic and independently addressable. **Modals (§C) are DONE.**
Everything else is backlog.

> Correction note: the first version mis-read two arrows. A3 was NOT the
> standings rows (rows are GOOD — do not touch). A4 was NOT the standings at all
> — the arrow pointed ~80px away at the Game Speed buttons. Fixed below.

---

## A. Right-side HUD rail

### RAIL-1 — Borders within borders + bad spacing (panel chrome)
- **Points to:** the Player Standings panel header + its two top-right icon buttons.
- **Issue:** outer panel border + inner bordered cards = boxes-in-boxes; cramped padding.
- **Fix:** remove inner borders; group with spacing + at most one hairline divider.
- **File:** `game-hud/PlayerStandingsPanel.svelte`, `HudPanel.svelte`.

### RAIL-2 — "Weird little word": the FOCUS ACT/TOT toggle
- **Points to:** the small ACT / TOT toggle in the FOCUS row.
- **Issue:** reads as a stray cramped word, no real toggle affordance.
- **Fix:** give it proper segmented-toggle styling + label spacing.
- **File:** `PlayerStandingsPanel.svelte` (`pf-standings__focus`).

### RAIL-3 — Standings COLUMN HEADERS too tiny / no padding (NOT the rows)
- **Points to:** the column header row `Player · Act · Tot · Star · Prod · %`.
- **Issue:** header text is too small with no padding. **The data ROWS are good — DO NOT change them.**
- **File:** `PlayerStandingsPanel.svelte` (`pf-standings__columns`).

### RAIL-4 — Standings is incoherent as a whole: SUMMARY/TOTALS vs columns
- **Issue:** the summary/totals row (`600 active · 600 total · 15 stars · Tick 0`,
  `pf-standings__summary`) uses a **different layout + column alignment** than the
  column headers and rows (which share a 6-col grid). That inconsistency is the
  real problem.
- **Fix (directive):** **design the whole `PlayerStandingsPanel` cohesively** —
  summary, headers, and rows on ONE consistent column/grid/type system. Not a
  pile of part-fixes; one deliberate component design. (RAIL-1/2/3 fall out of this.)
- **File:** `PlayerStandingsPanel.svelte`.

### RAIL-5 — Game Speed buttons: inner text not vertically centered + borders-in-borders
- **Points to:** the Game Speed row (`PAUSE · 1X · 2X · 4X · 10X`) — this is what the
  "not vertically centered text" arrow actually pointed at (~80px from standings).
- **Issue:** button inner text isn't vertically centered; nested borders look bad.
- **Fix:** vertically center button content; drop the inner border nesting.
- **File:** `game-hud/GameSpeedPanel.svelte` (+ `SpeedControls` if shared).

### RAIL-6 — Unwanted divider (Star View)
- **Points to:** a divider around the Star View header / between panels.
- **Fix:** remove it.
- **File:** `game-hud/SelectedStarPanel.svelte` / `HudPanel.svelte`.

### RAIL-7 — Star View selection-icon row: padding + color + line weight
- **Points to:** the prev / focus / fit / cancel / next icon row in Star View.
- **Issues:** (a) icons touch the bottom divider but are padded on top — asymmetric;
  (b) **color the icons** for visual distinction; (c) **even line/stroke weight** —
  they currently look inconsistent.
- **Fix:** symmetric vertical padding + vertically center the row; per-action color;
  normalize icon stroke weight/size.
- **File:** `SelectedStarPanel.svelte` (actions snippet) + `HudIconButton`.

### RAIL-8 — Tactical Overview = the COLLAPSED standings (relocate to topbar)
- **Points to:** the three `200 / 5` cards at the bottom of the sidebar.
- **Decision (user):** this compact card IS a compact leaderboard/standings.
  It should appear **in place of the expanded standings when collapsed, in the
  topbar** — not as an always-visible separate card.
- **Fix:** when `leaderboardCollapsed`, render the compact tactical-overview view
  (in the topbar / where standings was); when expanded, the full panel. Remove the
  standalone bottom card.
- **Files:** `GameContainer.svelte` (`leaderboardCollapsed`, `tacticalOverviewPlayers`,
  the `tactical-overview-card`), `HudTopbar.svelte` (`standingsCollapsed` badge).

## B. Settings panel

### SET-1 — Sub-nav chips too large / too padded / too rounded
- **Fix:** compact chips — less padding, smaller radius, smaller min-height.
- **File:** `GameSettingsPanel.svelte` (`.subsection-chip`, category chip row).

### SET-2 — Slider label above slider → single row
- **Issue:** PaxHudRange stacks label above the slider (wasted vertical space).
- **Fix:** one row — `Label  [−][======][+]  value`. Change `hudRange` layout from
  stacked to inline; hits every slider (consistency win).
- **Files:** `PaxHudRange.svelte`, `variants/hud.ts` (`hudRange`), `PaxSettingsRangeRow.svelte`.

### SET-3 — Action buttons without padding (Exports)
- **Points to:** EXPORT ALL PACKAGES / DOWNLOAD ALL FILES / CLEAR BUNDLES / REFRESH LIVE VALUES.
- **Fix:** add horizontal + vertical padding.
- **File:** the diagnostics/exports action buttons (`.btn-export`/`.btn-import`/`.btn-xs`).

## C. Modals — DONE
- Esc (always) + backdrop-click close, via `use:modalDismiss` ($lib/actions/modalDismiss.ts),
  on all in-game + map-editor modals.

---

## Images received vs. not (honesty check)
- **Right rail** — received, annotated → RAIL-1..8.
- **Settings: Developer chips / Sliders / Exports** — received, annotated → SET-1..3.
- **Surrender modal** — received but **UNannotated**; read as context for the
  dismiss request. No design feedback was attached. (Modal itself looks clean.)
- **Restart Match modal** — NOT received as an image this round.
- **Audio settings panel** — NOT received as an image this round.

## Suggested order
1. RAIL-4 (redesign standings whole) — folds in RAIL-1/2/3.
2. SET-2 (single-row sliders) — one change, every slider.
3. RAIL-8 (tactical overview → collapsed standings in topbar).
4. RAIL-5 (game speed buttons), RAIL-7 (star-view icons), RAIL-6 (divider).
5. SET-1, SET-3 (chips, button padding).
