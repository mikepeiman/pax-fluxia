# Design Agent Rules — fix the SYSTEM, never the instance

> Pointer from AGENT.md. Read before any UI/design change. Short on purpose.

## The one rule
**A design system means defects are fixed ONCE, at the source, for every instance.**
When you see something wrong in one place, do NOT patch that place. Find the
underlying **component / variant / token** and fix it there so *all* instances
change together. An isolated per-instance edit is a bug in your process.

Ask, every time: "What is the single source that controls this everywhere?"
- Wrong color/spacing/size on a thing → a **token** (app.css `--pax-*`) or a
  **variant** (`design-system/variants/hud.ts`).
- A control looks/behaves wrong → its **component**
  (`design-system/components/Pax*.svelte`).
- A whole native element class (e.g. `<select>` option contrast) → a **global**
  rule (app.css), not one component.

## Where the system lives
- **Tokens:** `pax-fluxia/src/app.css` (`--pax-*`), plus global element styles.
- **Variants:** `pax-fluxia/src/lib/design-system/variants/hud.ts`
  (`hudButton`, `hudRange`, `hudField`, `hudPanel`, `hudTooltip`, …).
- **Components:** `pax-fluxia/src/lib/design-system/components/Pax*.svelte`.
- **Settings bridge:** `components/ui/settings/panel-shared.css`.

## Canonical controls (fix HERE, not at call sites)
- **Buttons / icon buttons:** `hudButton` variant + `PaxHudButton` / `PaxHudIconButton`.
- **Sliders:** `PaxHudRange` (+ `hudRange` variant); `PaxSettingsRangeRow` wraps it.
  Sliders are a single horizontal row: `LABEL [−][====][+] value`.
- **Dropdowns:** `PaxHudSelect` (native `<select>` — style `option` globally) and
  `PaxSettingsPickerRow` (custom menu — rendered in a `<Portal>` + `floatingMenu`
  action so it can't be clipped by `overflow`/`clip-path`).
- **Modals:** `use:modalDismiss` (Esc + backdrop close).

## Process
1. Identify the single source (token/variant/component/global) before editing.
2. Make the change there.
3. **Verify across instances** — grep every consumer; the fix must hold for all.
4. `bun run check`. Report "implemented; verify," with what changed and where.

## Standing reminders
- An attached image = a FULL design audit of everything visible (overflow,
  clipping, contrast, misalignment, weight, padding) — proactively, no arrows needed.
- "Consistent with the existing design system" is NOT a defense if the system
  itself is ugly/broken. Good design is the bar. Fixing the system to be good is
  the job — without being told twice.
- Scope: UI/design only (geometry/render engine is a different agent).
