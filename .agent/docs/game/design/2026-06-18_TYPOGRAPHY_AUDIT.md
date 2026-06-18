---
date created: 2026-06-18
owner: UI design
scope: pax-fluxia/src/lib/components + design-system + app.css (excludes _archived)
---

# Typography Audit — real counts + fragmentation

You were right: typography is **heavily fragmented and orphaned**. Hard numbers below.

## The token system that SHOULD be the single source
`lib/design-system/pax-theme.css`:
- **Families (5):** `--pax-font-brand` Cinzel · `--pax-font-ui` Rajdhani · `--pax-font-label` Rajdhani · `--pax-font-copy` Inter · `--pax-font-data` JetBrains Mono.
- **Sizes (9):** `--pax-type-` xs .75 · sm .875 · base 1 · lg 1.25 · xl 1.5 · 2xl 2 · 3xl 3 · title 3.2 · label .65 (rem).
- **Scales (4):** type / title / label / data scale multipliers.
- **Weights: ZERO tokens exist.**

## What's actually used (the fragmentation)

| Axis | Tokens | Distinct values in use | Orphans |
|---|---|---|---|
| **Font size** | 9 | **~80** (70 raw `font-size:` + ~10 Tailwind `text-[..]`) | **~71** |
| **Font family** | 5 | 6 real families hardcoded as raw strings | 17 files bypass tokens; **Exo & Orbitron aren't even tokens** |
| **Font weight** | 0 | **7** (300,400,500,600,700,800,900; 700 used 118×, 800 ×48, 600 ×37) | all 7 (no tokens) |

### Size orphans (sample, by frequency)
`10px ×36 · 1rem ×33 · 11px ×26 · 0.62rem ×13 · 0.9rem ×12 · 0.82rem ×12 · 0.8rem ×11 · 0.76rem ×11 · 9px ×10 · 0.84rem ×10 · 0.7rem ×10 …` — ~70 unique, clustered between .56rem and 1rem where the 9-token scale has almost nothing (only label .65, xs .75, sm .875). **The scale is too sparse in the small-UI range, so everyone invented their own size.**

### Family orphans
- 17 component files write `font-family: "Rajdhani"…` / `"Inter"` / `"JetBrains Mono"` literally instead of `var(--pax-ui-font-*)`.
- **Exo** (×14) and **Orbitron** (×3) are used but have **no token** — true orphan fonts that escape the system entirely. Plus `Cinzel` literal (×3), `"Pasti"` referenced in the brand stack.

### Migration hotspots (raw `font-size` count per file)
GameContainer 28 · StarsPanel 23 · ResultsModal 21 · GameSettingsPanel 13 · MultiplayerPanel 12 · MapEditorToolRail 12 · StarInfoPanel 10 · MainMenu 9 · TopBar 9 · Leaderboard 9. (Several `_archived/*` excluded.)

## Typography controls exposed today
`TypographyTokenPanel.svelte` ("Typography Token Lab", in the Interface→Appearance panel):
- 3 family pickers (Brand / Interface / Labels) — but only 3 of the 5 family roles, and they don't touch Exo/Orbitron orphans.
- 4 scale sliders (UI / Titles / Labels / Data) — multipliers only, not absolute sizes.
- Icon-collection picker.
- **Missing:** copy & data family roles, any weight control, absolute size control, and it isn't its own panel.

## Recommendation
1. **Add the missing axis — weight tokens** (`--pax-weight-regular/medium/semibold/bold/extrabold/black` = 400/500/600/700/800/900). Quick, unblocks consolidation.
2. **Densify the size scale** in the small-UI band (add e.g. `2xs .625`, `xs+ .8125`, etc.) so the ~70 orphans can map to ~12 real tokens — then migrate.
3. **Decide the family set:** keep Cinzel/Rajdhani/Inter/JetBrains; **kill or tokenize Exo & Orbitron** (orphans).
4. **Migrate** raw `font-size`/`font-family`/`font-weight` → tokens, file by file (hotspots first). Large (~hundreds of edits) → staged, not one-shot.
5. **Promote typography to its OWN settings panel** with full control: per-role family, per-role weight, per-role size (absolute + scale). Expand `TypographyTokenPanel` into a dedicated section.

Done now: weight tokens added (step 1). Steps 2–5 are the staged follow-up.
