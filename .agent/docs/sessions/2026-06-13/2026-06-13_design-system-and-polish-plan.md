---
date created: 2026-06-13
last updated: 2026-06-13
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-06-13/2026-06-13_HUD_REDESIGN_WORK_REPORT_worktree-4b02.md
  - .agent/docs/sessions/2026-06-12/2026-06-12_consolidation-pause-handoff.md
superseding docs:
---

# 2026-06-13 — Design System & UI Polish Plan

## Purpose (user's words)

> "Fully tokenized, themeable design system in place, uses best practices, as
> simple as possible (no needless complexity, only what is needed). Current
> design & style is improved; it is not yet polished or congruent enough. The
> layout(s), and every component and atom will need to be individually
> considered and designed and developed."

Two intentions:
1. **System** — a tokenized, themeable design system; best-practice; minimal.
2. **Polish** — improve the actual rendered design; make layout, every
   component, and every atom congruent.

This plan sequences **system foundation first, surface polish second**, because
polishing components on top of a conflicting cascade means redoing the polish.

## Audit findings (evidence-grounded, 2026-06-13)

Three deep audits were run against the merged consolidation tree. The system
has good bones (a real `--pax-*` token foundation) but three systemic defects.

### Defect 1 — Token system is 2-tier, incomplete, and leaky
- Tokens exist as primitive `--pax-*` (`design-system/pax-theme.css`, 187 lines)
  → semantic `--hud-*` aliases (`app.css`). Good start.
- **No component/role tier.** Button "intent" (neutral/primary/selected/danger)
  is expressed as hardcoded Tailwind classes inside `variants/hud.ts`, not
  role tokens.
- **~170 hardcoded rgba/hex values bypass tokens** — 124 in `hud.css`, ~25 in
  `app.css`, ~19 across `PaxSettings*`/`PaxColorSwatch` components.
- **Z-index untokenized** — 8 scattered values (2, 5, 20, 25, 33, 34, 100, 200).
- **Type-scale multipliers defined but unused** — `--pax-type-scale` etc. exist;
  variants use arbitrary `text-[0.58rem]` values instead.
- **Duplicate token layers** — `app.css` also defines `--color-*`, `--text-*`,
  `--space-*` that shadow `--pax-*`. Three namespaces, unclear which to use.
- **Second orthogonal token system** — `aurelia-hud/aurelia-hud-theme.css`
  (~40 tokens, `--color-hull`, `--shadow-glow-*`) not integrated with pax-theme.
  (aurelia-hud is demo-only per the branch report.)
- **Theming mechanism is sound but color-only** — `data-pax-theme="<id>"` on the
  root + CSS override blocks. Only colors switch; spacing/radius/motion are
  locked. Themes: `aurelia-drift` (default), `cyber-flux` (accents only).

### Defect 2 — Primitives split into two incompatible halves
- **"HUD tier"** (PaxHudButton/Panel/Rail/Range/Segmented/Select/TextInput/
  Tooltip): clean, driven by `variants/hud.ts` (tailwind-variants). ~72%
  token-based, consistent.
- **"Settings tier"** (PaxSettingsDrawer/InfoRow/PickerRow/RangeRow/ToggleRow,
  PaxColorSwatchButton): hardcoded inline CSS — padding `8/9/10/12/14px`,
  inline rgba gradients, `border-radius` via raw `var(--hud-radius-*)`. ~28%
  token-based. **Does not use the variant system at all.** Two styling
  strategies in one library (violates single-pattern rule).
- **Callback API inconsistent** — `onclick` (buttons) vs `onValueChange`
  (segmented/select) vs `onInput` (range/text) vs `onChange`+`onToggle` (toggle
  row accepts both as an alias hack; there is a post-mortem about it).
- **Thin passthrough wrappers** — `game-hud/HudIconButton|HudPanel|HudRail`
  only add a `pf-*` class prefix over the Pax primitive.
- **Missing primitives** — no checkbox, radio group, tabs, modal/dialog, badge,
  card, number stepper. Game-hud has ad-hoc modals not in the system.
- **A11y gaps** — PaxHudTextInput has no aria-label path; toggle switch lacks a
  focus indicator; picker row uses non-standard `role="listbox"`.

### Defect 3 — `hud.css` (2043 lines) is four conflicting passes
Evolved as Base (rounded) → **Aurelia Drift** (hard-cut angular, `border-radius:0`,
clip-path polygons) → **Rounded Correction** (reverts to rounded via `::after`
mask-gradient borders) → **Refinement** (re-inflates padding, adds scale tokens).
- **No `@layer` isolation** — four passes fight by source order alone. The same
  selector (`.pf-hud-panel`) is redefined at lines 14, 30, 916, 933, 1667, 1896.
- **Dead code** — 8+ `clip-path` declarations are unreachable (the rounded
  correction wins). The `--hud-cut-corner-*` token is a **misnomer**: it aliases
  to rounded insets; 17 consumers still reference it.
- **Scale tokens only honored in the last pass** — the Aurelia pass hardcodes
  `0.54rem`/`0.78rem`, so type/label/data scale controls are inconsistent.
- **Border/gradient duplicated** — the gold gradient is re-declared inline 8×
  and only shared via token 3×; hardcoded hex (`#fff0ba`, `#fff2c4`) in button
  states ignore theme.
- **13 distinct border-radius values** (10/11/12/14px + tokens) — no normalization.
- **Layout shell** — `GameContainer` master grid is sound (6 grid variants +
  mobile breakpoints), topbar is inside the grid. Main risk is fixed topbar
  height + the mobile `!important` cluster (9+).

### How findings map to the two intentions
- Intention 1 (system) ⇐ Defect 1 (tokens) + Defect 2 (primitives).
- Intention 2 (polish/congruence) ⇐ Defect 3 (cascade) + per-surface visual work.

## Proposed plan (dependency-ordered stages)

Each stage: plan-first, smallest correct change, `bun run check` + `bun run build`
gate, then **user visual verification** before the next stage. No deletions of
user-facing controls without explicit instruction (AGENT.md 4.4).

### Stage 0 — Reliability gate (small)
Fix the unsafe dev game-shell import retry in `routes/+page.svelte`
(`GAME_SHELL_MAX_IMPORT_ATTEMPTS` retry can re-init Pixi → "Extension type
environment already has a handler"). Makes visual iteration reliable.
*Exit:* clean load, build passes.

### Stage 1 — Token architecture consolidation (intention 1 foundation)
- Define the **token contract** in one doc + one file: tiers = primitive
  (`--pax-*` raw) → semantic (`--hud-*` roles) → component (only where a
  component genuinely needs its own knob).
- Collapse the duplicate `app.css` `--color-*`/`--text-*`/`--space-*` layer into
  a single source of truth (keep `--pax-*` raw + `--hud-*` semantic; retire the
  third namespace). *"As simple as possible."*
- Add a **z-index token scale** (`--z-base/dropdown/rail/panel/modal/toast`).
- Resolve the **type-scale multipliers**: either consume them uniformly or delete
  them (decide by whether responsive type scaling is wanted).
- Decide the **aurelia-hud token layer** fate (retire / isolate) so there is one
  token system.
- Pin the **theme contract**: which token groups a theme may override (see
  Decision B below).
*Exit:* one documented token model; build + no visual regression.

### Stage 2 — Cascade consolidation: collapse `hud.css` (intention 2 foundation)
- Rebuild `hud.css` into **one coherent `@layer` structure** (base → components →
  state/overrides). Bake the **final rounded gold-gradient look once**; delete the
  Aurelia hard-cut pass and the dead clip-paths.
- Replace `--hud-cut-corner-*` (misnomer) with semantic radius tokens; remove the
  alias and its 17 consumers.
- Replace the 8 inline gradient redeclarations + hardcoded hex with shared
  border/surface tokens. Soften the dark falloff (report deficiency B).
- Normalize the 13 radius values onto the 4-step radius scale.
- Make scale tokens apply uniformly (the conflicting pass is gone).
*Exit:* `hud.css` is single-layer, token-driven; build + visual parity.

### Stage 3 — Primitive layer unification (intention 1 completion)
- Choose **one styling strategy** (Decision A) and bring the Settings tier onto
  it; kill inline hardcoded gradients/padding → tokens.
- Unify the **callback prop API** (one convention); remove the onChange/onToggle
  alias hack.
- Resolve the **thin game-hud wrappers** (collapse or justify).
- Add **only the primitives the real UI needs** (likely: a real toggle/checkbox,
  a modal/dialog for cancel-order/confirm, possibly tabs for settings). Not a
  component library for its own sake.
- A11y pass on interactive primitives.
*Exit:* one primitive system, consistent API; each primitive rendered in the
`/dev/ui-test` route; build.

### Stage 4 — Layout shell + per-surface polish (intention 2, the visual pass)
"Every layout, component, atom individually considered," per surface, against the
Aurelia Drift reference. Each is its own design pass + user verification:
- 4a. **Settings rail** — collapsed stub / icon rail / expanded label rail; panel
  opens to the right; active icon highlighted; remove redundant entry points.
- 4b. **Topbar** — compact, no stacking, rounded shell. (slice fix already landed.)
- 4c. **Right tactical rail** — Player Standings alignment, Game Speed, Star View
  readability + **real selected-star binding** (report deficiencies E/F).
- 4d. **Bottom command bar + Quick Access** — centered, semantic collapse,
  unlabeled dock (deficiency G).
- 4e. **Themes + Appearance panels** — split Themes (select/library/CRUD) from
  Appearance (font roles, type/icon scale); typography controls under Appearance.

### Stage 5 — Icon + typography normalization (intention 2 consistency)
Semantic icon registry; normalize all HUD icons through `HudIcon`; tune default
font roles + scale values; no mixed emoji/glyph. (deficiency H.)

### Stage 6 — Final validation + docs
Build + targeted audits; if permitted, browser check at 1280/1600/1920 widths;
update handoff with changed files + residual risks.

## Open decisions (need user input — they fork the foundation)

### Decision A — One styling strategy for primitives
The library currently runs **two**: tailwind-variants (`variants/hud.ts`) for the
HUD tier, and inline token-CSS for the Settings tier. "As simple as possible"
requires picking one.
- **Option A1 — Pure token-CSS** (recommended): drop tailwind-variants; every
  primitive styles via semantic-token CSS + a tiny variant helper. No build-tool
  coupling, no utility-class indirection, most portable. The HUD is "primarily
  token/component driven, not utility-class driven" per the branch report — this
  matches intent.
- **Option A2 — Tailwind-variants everywhere**: migrate the Settings tier onto
  `variants/hud.ts`. More concise for variant matrices, but couples the system to
  Tailwind v4 + tailwind-variants and keeps utility indirection.

### Decision B — Theme scope  → RESOLVED: FULL THEMING
User chose maximal scope (broader than the two options offered). A theme may
override **all** of these axes:
- **Color** (surfaces, text, accents, player signals, danger)
- **Typography** (font roles + size/scale)
- **Borders & flourishes** (border gradients, widths, corner radius, decorative
  edges)
- **Glow / FX** (shadows, glows, blur/glass)
- **Spacing / density** (padding, gap, panel rhythm, control heights)
- **Icons** (icon family/set, size, stroke)

Implication: the semantic (`--hud-*`) tier must expose every one of these axes as
theme-overridable token groups, and the theme contract enumerates the full
overridable manifest. Non-themeable raw constants stay in the primitive tier.
This is the crux of the whole system — Stage 1 designs this taxonomy first.

### Decision C — Starting point / sequencing
- **Option C1 — Foundation-first** (recommended): Stages 0→1→2→3 then polish.
  Polish lands on a stable cascade and is not redone.
- **Option C2 — Surface-first**: polish the visible HUD now (Stage 4) on the
  current cascade, refactor tokens/cascade under it later. Faster visible
  payoff, higher rework risk.

## Progress log

- **Decisions (2026-06-13):** A = pure token-CSS; B = full theming (all 6 axes);
  C = foundation-first.
- **Stage 0 — DONE** (`230fd3f1c`): single-attempt game-shell import, no retry
  (Pixi double-registration fix). Build PASS.
- **Stage 1 — architecture DONE** (`c21300b66`): token contract doc
  (`DESIGN_SYSTEM_TOKENS.md`), z-index + border-width axes, `--hud-motion-*`,
  third-namespace deprecation banner. Additive, zero visual change, build PASS.
  *Remaining Stage-1 migration work (eliminating the deprecated third namespace +
  ~170 hardcoded values) folds into Stages 2/3, per-surface with verification.*
- **Namespace unification — DONE** (commits `8469c97c0`, `bf881e475`, `ea242ce27`):
  per user directive ("one coherent token namespace, nothing competing"). The
  whole live app now reads one `--pax-*` family: raw `--pax-<axis>-*` (theme) +
  semantic `--pax-ui-*` (roles). Eliminated the `--hud-*`/`--pax-*` split (768
  refs renamed) AND the entire third namespace (`--color-*`, `--space-*`,
  `--radius-*`, `--font-*`, `--transition-*` — deleted from app.css). Landing
  page (148 refs) + RangeDual migrated; divergent values resolved onto the
  system (#00ffff→teal, 4px→scale). Added status roles (success/warning),
  accent-dim, space-5. check 0 errors, build PASS.
  - Out of scope (demoted): `aurelia-hud-theme.css` keeps its own `--color-*`
    tokens (still @imported globally) — candidate to retire/relocate later.
  - Dead `_archived/*` retains harmless dangling refs (never rendered).
- **Visual reference updated:** user supplied 4 polished HUD mockups (2026-06-13)
  as the target aesthetic; `aurelia-hud` package demoted to a loose echo.
- **Next — Stage 2 (hud.css collapse + visual rebuild toward the mockups):** the
  first big *visual* change. Collapse the 4 cascade passes into one `@layer`,
  bake the final rounded gold look once, kill dead clip-paths + the cut-corner
  misnomer, and start matching the supplied mockups surface-by-surface. Remaining
  hardcoded inline values (hud.css gradients/hex; landing decorative hex; keep
  external-brand hex like Svelte/Discord) get tokenized during this rebuild.

## Notes
- The **game-render theme system** (`config/themes.ts` + ~70 territory-render
  JSONs) is a **separate, mature** subsystem and is out of scope here. Only the
  **UI-chrome design system** is covered. Naming collision ("theme") is a known
  source of confusion; keep them distinct in any new docs/controls.
- Save/load map/game surface (F-70, B-58) remains a dropped feature from merge 2
  — tracked separately in the pause handoff, not part of this plan.
