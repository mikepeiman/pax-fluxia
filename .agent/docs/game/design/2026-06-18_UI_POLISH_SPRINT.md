---
date created: 2026-06-18
status: backlog — design polish sprint
owner: UI design
source: annotated screenshots (right HUD rail, surrender modal, settings)
---

# UI Polish Sprint — clumsy/unpolished design cleanup

tl;dr from the user: "a LOT of clumsy, unpolished design." Catalogued below by
surface, each with location + the fix. **Modals item (§C) is DONE this pass;
everything else is backlog for the next sprint.**

---

## A. Right-side HUD rail (Player Standings · Game Speed · Star View · Tactical Overview)

A1. **Borders within borders / bad spacing.** The rail panels have an outer
panel border AND inner card borders (FOCUS summary card, player rows). Reads
busy and boxy. → Flatten: drop inner card borders; group with spacing + a single
hairline divider, not nested boxes. (Same "no boxes-in-boxes" rule we applied to
settings rows.)
- Components: `PlayerStandingsPanel.svelte`, the FOCUS summary card, `GameSpeedPanel`, `SelectedStarPanel`, the Tactical Overview card.

A2. **"Weird little word" — the FOCUS ACT/TOT toggle.** The ACT/TOT pill and the
column headers (ACT/TOT/STAR/PROD) are tiny and cramped; the toggle reads as a
stray word. → Give the toggle real affordance + label spacing; align/size the
column headers properly.

A3. **Terribly tiny text with no padding.** The FOCUS summary
("600 active / 600 total / 15 stars / Tick 0") and the standings rows use
too-small type with no internal padding. → Bump font sizes a step; add row
padding (vertical breathing room).

A4. **Text not vertically centered.** Standings rows (rank number, player name,
values) aren't vertically centered within the row. → `align-items: center` on
the row grid; fix line-height.

A5. **Unwanted divider.** A divider is rendered where it shouldn't be (around the
Star View header / between panels). → Remove it.

A6. **Star View selection-icon row: uneven padding.** The prev/focus/fit/cancel/
next icons touch the bottom divider but are padded on top. → Symmetric vertical
padding; vertically center the icon row in its band.

A7. **Tactical Overview — unclear purpose.** The three "200 / 5" cards at the
bottom have no labels; "what is the function and purpose of this?" → Either label
them clearly (what are 200 and 5 per card — active/stars per player?) or remove
the card if it duplicates Player Standings. Decide intent first (question whether
it should exist).

## B. Settings panel

B1. **Sub-nav chips too large / too padded / too rounded.** (Developer category:
DIAGNOSTICS/LOGGING/AI + ALL/OVERLAYS/MEASUREMENTS/RECORDER & BUNDLES/EXPORTS/
MODE DIAGNOSTICS.) → Make chips compact: less padding, smaller radius, smaller
min-height. They should read as dense sub-nav, not big pill buttons.
- Component: `GameSettingsPanel.svelte` `.subsection-chip` (+ the category chip row).

B2. **Slider label above slider wastes vertical space → single row.** PaxHudRange
stacks the label above the slider; sliders (Hue/Saturation/Lightness/Alpha, and
all PaxSettingsRangeRow sliders) should be ONE row: `Label [−][====][+] value`.
→ Change `hudRange` layout from stacked (meta above control) to a single inline
row. Design-system change → affects every slider (good — consistency).
- Files: `PaxHudRange.svelte`, `variants/hud.ts` (`hudRange` slots), `PaxSettingsRangeRow.svelte`.

B3. **Buttons without padding.** (Exports: EXPORT ALL PACKAGES / DOWNLOAD ALL
FILES / CLEAR BUNDLES / REFRESH LIVE VALUES; also the "buttons without padding"
note.) → Add horizontal + vertical padding to these action buttons (likely
`.btn-xs`/`.btn-export`/`.btn-import` or the diagnostics action buttons).

## C. Modals — DONE this pass

C1. **Esc closes every modal.** ✅
C2. **Click outside (backdrop) closes the modal.** ✅
- Added a reusable `use:modalDismiss` action (`$lib/actions/modalDismiss.ts`):
  Escape (capture-phase, always) + backdrop click. Applied to GameContainer's
  Results / Surrender / Restart / Exit modals and the map-editor Confirm /
  Duplicate / Preview dialogs. AudioSettings and BackgroundSelectModal already
  did both.

---

## Suggested order
1. B2 (single-row sliders) — biggest visual win, one design-system change, hits every slider.
2. A1–A4 (rail flatten + spacing + centering) — the busiest surface.
3. B1 + B3 (chip sizing, button padding) — quick.
4. A5–A7 (divider, icon-row padding, Tactical Overview decision).
