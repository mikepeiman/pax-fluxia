---
date created: 2026-06-23
owner: UI design (opus-hud)
status: LIVING QUEUE — the single place to find outstanding UI/design work
purpose: One durable, reconstituted list so this work never has to be re-found by hand.
sources (authoritative, read these for full detail):
  - .agent/docs/game/design/2026-06-18_DESIGN_SYSTEM_HANDOFF.md  (§4 OUTSTANDING is the master list)
  - .agent/docs/game/design/2026-06-18_UI_POLISH_SPRINT.md       (RAIL/SET/AUD/MODAL defect catalog — COMPLETE, backlog noted)
  - .agent/docs/game/design/2026-06-18_TYPOGRAPHY_AUDIT.md       (typography fragmentation plan)
  - .agent/rules/design-agent.md                                  (fix the SOURCE, never the instance)
---

# Pax Fluxia — UI / Design Outstanding Queue

The bar (non-negotiable, from the handoff): **a complete, fully-implemented design
system** — every font/size/weight/color/spacing/control from a single source, nothing
hardcoded at a call site, full user control where it matters.

This doc is the **living queue**. It reconciles the two 2026-06-18 design docs against
what has actually shipped since, plus newer items found in session. Update it as work
lands — don't let the queue scatter back into chat again.

**Honesty rule (carry forward):** `bun run check` proves types/markup, NOT appearance.
Visual fixes are "implemented — needs your visual sign-off", never "works".

---

## ✅ Shipped since the 2026-06-18 docs (do NOT redo)
- **Token migration — typography (family/weight/size), color, spacing** across the game app: orphans → `--pax-*` tokens; Exo & Orbitron loaded + tokenized; ghost `--pax-ui-*` variables eliminated. (autonomous token-coverage run)
- **Toggles/switches** rendered correctly (the near-invisible Developer-panel toggles fixed).
- **UI Polish Sprint — RAIL-1..8, SET-1, SET-2 (single-row sliders), SET-3, AUD-2, AUD-3** — all implemented (POLISH_SPRINT marked COMPLETE 2026-06-19). Standings Board redesigned cohesively.
- **Standings short-screen defect** — `@media (max-height:960px)` no longer hides the Totals footer + Tick/Focus toolbar (`925f45c71`).
- **FPS + Total-Ships topbar chip** restored (`925f45c71`).
- **Bottom-bar "View" button** now fits the map like the Star View fit button (`2c4c703f7`).
- **Settings panel no longer auto-unpauses** the game on close (`91ba5d799`).
- **Stray main-menu TopBar buttons** (fixed Settings/"?" floating over the menu) removed (`07bf44664`).

> ⚠️ All of the above (and everything below marked "implemented") still want the
> user's **in-game visual sign-off** — the agent cannot verify appearance headlessly.

---

## 🔲 OUTSTANDING — open work

### A. Sliders (handoff §4.1 — the only sprint area NOT fully closed)
- [ ] **A1. Slider thumb still bold/glowing.** `panel-shared.css` `input[type=range]::-webkit-slider-thumb` (gold + glow) overrides `hudRange`'s `accent-color`. Finish the tone-down: style the thumb in `PaxHudRange` scoped `<style>` or mute the panel-shared thumb. *(verify current state first — may be partly addressed.)*
- [ ] **A2. "Unusably short" sliders in narrow panels.** Audit the slider row at ~360px width; add responsive label/value collapse or a min slider width. Source: `PaxHudRange.svelte` / `hudRange` variant.
- [ ] **A3. P/R/A lock buttons** (`TerritoryTransitionTuning`) "need completely different presentation." Redesign as a reusable pattern (e.g. one segmented Pin/Ratio/Anim control or icon cluster).
- [ ] **A4. Audit other two-up rows** beyond `orb-pair` for the same single-row treatment.

### B. Typography control surface (handoff §4.2 — migration done, panel not)
- [ ] **B1. Dedicated Typography settings panel** (its own section): per-role **family + weight + size** (absolute + scale). Today `TypographyTokenPanel` covers only 3/5 families, scales only, no weight, and isn't its own section. Expand it.
- [ ] **B2. Guardrail verify.** Re-run the grep: raw `font-size:` / `font-family:"` / `font-weight:[0-9]` outside `pax-theme.css` should be ~empty. Close any stragglers from the migration.

### C. System hygiene (handoff §4.4/§4.5)
- [ ] **C1. AUD-1 systemic clip-path risk (backlog).** Any card using `clip-path: var(--pax-ui-rounded-corner-*)` clips a dropdown rendered inside it. Audit cards that contain a select + clip-path (territory tuning, etc.); ensure they use the portaled `PaxSettingsPickerRow` / `PaxHudSelect`.
- [ ] **C2. Dropdown canonicalization.** Verify every dropdown app-wide uses a canonical component — no raw `<select>` or hand-rolled menus left.
- [ ] **C3. Dead `_archived/*`** — remove from audit/grep scope or delete (needs sign-off to delete).
- [ ] **C4. Orphaned `src/lib/components/ui/TopBar.svelte`** — now unused after the menu-TopBar removal (`07bf44664`). Deletion candidate (the in-game topbar is `game-hud/HudTopbar.svelte`; `ui/hud/TopBar.svelte` and `aurelia-hud/TopBar.svelte` are different files).

### D. Decisions needed (your call — behavior/identity changes)
- [ ] **D1. GameSettingsPanel category accents.** The ~32 per-category accent hues were collapsed to ~5 semantic tokens during color migration. Keep consolidated, or restore per-category colour-coding as a small dedicated category-accent token set? (If restore: do it as tokens, not bespoke call-site values.)
- [ ] **D2. Bottom command bar "Map" vs "View" redundancy.** After the View fix, both "Map" (`map-location` icon) and "View" (`fit-view` icon) call `centerAndFit()` — functionally identical. Drop one, or repurpose one (e.g. "Map" → minimap/overview).

---

## How to use this queue
1. Pick an item; claim the files on `.agent/intra-agent-coordination.md` first.
2. Fix the **source** (token/variant/component/global), never one call site; re-grep all consumers.
3. `bun run check` green each step; commit by explicit pathspec; **push to origin/master**.
4. Check the box here + note the commit. When an area is fully closed, move it up to "Shipped".
