---
date created: 2026-06-18
owner: UI design
goal: a COMPLETE, fully-implemented design system — every UI surface derives from
      tokens/variants/components; no orphans; full user-facing control.
status: in progress — foundations built, migration + control panels outstanding
---

# Pax Fluxia — Design System Handoff

The bar is explicit and non-negotiable: **a complete, fully-implemented design
system.** Every font/size/weight/color/spacing/control comes from a single source;
nothing hardcoded at a call site; the user has full control where it matters.
This doc is the working contract — findings, what's done, and everything still
open, with enough detail to execute without re-discovery.

Companion docs:
- `2026-06-18_UI_POLISH_SPRINT.md` — annotated-screenshot defect catalog (RAIL/SET/AUD/MODAL items).
- `2026-06-18_TYPOGRAPHY_AUDIT.md` — typography fragmentation counts + plan.
- `.agent/rules/design-agent.md` — the operating rule (fix the SOURCE, never the instance).

---

## 1. Where the system lives (the single sources)
- **Tokens:** `src/lib/design-system/pax-theme.css` (`--pax-font-*`, `--pax-type-*`, scales, NEW `--pax-weight-*`), surfaced as `--pax-ui-*` in `src/app.css`. Global element styles also in `app.css` (e.g. `select option` contrast).
- **Variants (tailwind-variants):** `src/lib/design-system/variants/hud.ts` — `hudButton`, `hudRange`, `hudField`, `hudPanel`, `hudTooltip`, `hudSegmentedControl`, `hudRail`.
- **Components:** `src/lib/design-system/components/Pax*.svelte`.
- **Settings bridge CSS:** `src/lib/components/ui/settings/panel-shared.css`.

## 2. Canonical controls — change HERE, never at the call site
| Control | Source of truth |
|---|---|
| Button / icon button | `hudButton` variant + `PaxHudButton` / `PaxHudIconButton` |
| Slider | `PaxHudRange` (+ `hudRange`); built-in −/+ nudges + click-to-type value; single row `LABEL [−][===][+] value`. `PaxSettingsRangeRow` is a thin data-attr wrapper. |
| Native dropdown | `PaxHudSelect` (native `<select>`; options styled globally in app.css) |
| Custom dropdown (rich items) | `PaxSettingsPickerRow` (ark-ui `<Portal>` + `floatingMenu` action → can't be clipped) |
| Modal/dialog | `use:modalDismiss` (Esc + backdrop close) |
| Tooltip / `?` hint | ark-ui `Tooltip` (PaxHudIconButton) / `PaxHudSelect hint` |

## 3. Done this session (design-system level)
- Settings nav collapsed to one category model (`settingsTaxonomy.ts`); rail/state-machine migrated (`settings-nav-consolidation.md`).
- Slider: rebuilt `PaxHudRange`/`hudRange` to a single row; nudges + editable value built in; toned down (muted/elegant); `orb-pair` stacked.
- Buttons: `hudButton` neutral hover feedback + softer sizing; Audio "Test" → icon button.
- Dropdowns: global `select option` contrast (app.css); `PaxSettingsPickerRow` portaled (no clipping).
- Modals: `modalDismiss` action on all in-game + map-editor modals; modal buttons fixed (subtext below, no overflow).
- Landing CTAs: scoped the leaked game-modal `:global(.btn*)` so landing buttons keep app.css styling.
- hud.css four-pass cascade collapsed to one rule/selector.
- Tokens: added `--pax-weight-*` (the missing axis).
- Rule: `.agent/rules/design-agent.md` + AGENT.md RULE 0.25 (system-first).

## 4. OUTSTANDING — the work to a COMPLETE system

### 4.1 Sliders (finish)
- [ ] **Double-nudge runtime check.** Code is verified single-nudge (`PaxSettingsRangeRow` has none; `PaxHudRange` exactly one −/+; `PerimeterField` set `nudge={false}`). User still reports doubles → reproduce on a CLEAN build (stop dev server, restart, hard-reload). If reproducible on a clean build, capture the DOM and trace the second source (it is NOT in the components above).
- [ ] **"Unuseably short" in narrow panels.** Audit the slider row at ~360px width; consider responsive label/value collapse or a min slider width.
- [ ] **P/R/A lock buttons** (`TerritoryTransitionTuning`): "need completely different presentation." Redesign (e.g. a single segmented Pin/Ratio/Anim control or icon cluster), as a reusable pattern.
- [ ] **Audit for other two-up rows** beyond `orb-pair`.

### 4.2 Typography — make EVERYTHING derive from tokens (see audit doc)
- [ ] **Densify the size scale** in pax-theme.css (the small-UI band .56–1rem is empty → ~70 orphans). Define the canonical set (e.g. 2xs..3xl + label/title) so every used size maps to a token.
- [ ] **Family decision:** keep Cinzel/Rajdhani/Inter/JetBrains; **remove or tokenize Exo & Orbitron** (orphan fonts, no token).
- [ ] **Migrate orphans → tokens** across ~30 files (hotspots: GameContainer 28, StarsPanel 23, ResultsModal 21, GameSettingsPanel 13…): raw `font-size`→`var(--pax-type-*)`, raw `font-family`→`var(--pax-ui-font-*)`, raw `font-weight`→`var(--pax-weight-*)`. ~hundreds of edits; do file-by-file with `bun run check` between.
- [ ] **Guardrail:** after migration, a grep for raw `font-size:`/`font-family:"`/`font-weight:[0-9]` outside pax-theme.css should be ~empty.
- [ ] **Dedicated Typography panel** (own settings section): per-role family + per-role weight + per-role size (absolute + scale). Expand `TypographyTokenPanel` (today: 3/5 families, scales only, no weight, not its own section).

### 4.3 Right-HUD rail (UI polish sprint §A)
- [ ] RAIL-4: redesign `PlayerStandingsPanel` cohesively (summary/headers/rows one grid); RAIL-3 headers too small; RAIL-1 borders-in-borders; RAIL-2 ACT/TOT toggle.
- [ ] RAIL-5: Game Speed button text not centered + borders-in-borders.
- [ ] RAIL-6: unwanted Star View divider. RAIL-7: Star View icon row padding + color + even stroke weight.
- [ ] RAIL-8: Tactical Overview = the collapsed-standings view → move to topbar; remove standalone card.

### 4.4 Settings polish (sprint §B/§D)
- [ ] SET-1: sub-nav chips too large/padded/rounded → compact.
- [ ] SET-3: export/action buttons need padding (verify after hudButton change).
- [ ] AUD-1: confirm File dropdown un-clipped (portal). AUD-2: "Test" pattern (done → icon). AUD-3: lighter sound-card treatment.

### 4.5 System hygiene
- [ ] Color/spacing audit (same method as typography): find raw hex/rgba + raw px spacing not from `--pax-*`; consolidate.
- [ ] Verify all dropdowns app-wide use a canonical component (no raw `<select>`/hand-rolled menus left).
- [ ] Remove dead `_archived/*` from audits/grep scope or delete.

## 5. Roadmap to "complete"
1. **Tokens complete** — finalize size scale + confirm weight/family/color/spacing token sets. (1 file.)
2. **Variants/components complete** — every control renders only from tokens/variants. (small N.)
3. **Migrate all call sites** — orphan font/color/spacing → tokens, file-by-file, green each step. (the bulk.)
4. **Control panels** — Typography panel (+ any other token-tuning surfaces) with full per-role control.
5. **Guardrail + verify** — grep proves no orphans; user visually signs off each surface.

## 6. Honesty notes for the next session
- The agent CANNOT verify runtime/visual state (no in-game headless access). `bun run check` proves types/markup, NOT appearance or behavior — the user verifies visually. Do not claim a visual fix "works"; say "implemented, please verify."
- Do NOT defer or shrink scope. The target is the full system. When a task is large, split into green increments and KEEP GOING — don't stop at the audit.
- Fix the SOURCE (token/variant/component/global), never one instance. Re-grep all consumers after each source change.
