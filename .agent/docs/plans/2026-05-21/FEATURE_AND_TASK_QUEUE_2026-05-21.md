# Feature And Task Queue - 2026-05-21

## Active

- Keep the shadcn-based Pax Fluxia HUD theme-system plan implementation-ready and concise.

## Completed

- Read the user-supplied plan at `C:/Users/mikep/Downloads/Pax Fluxia/pax_fluxia_shadcn_theme_system_approach.md`.
- Checked current repo state for shadcn, Tailwind, theme storage, built-in theme loading, HUD tokens, and existing Theme Library wiring.
- Checked current shadcn-svelte docs for CLI, SvelteKit installation, components.json, and registry constraints.
- Produced and then merged the split implementation, phase, and architecture artifacts into `.agent/docs/plans/2026-05-21/PAX_SHADCN_THEME_SYSTEM_PLAN_2026-05-21.md`.
- Recorded current repo reality: Tailwind and shadcn are absent, while SvelteKit is already present in static SPA mode for Tauri.
- Added SvelteKit, Colyseus, and Tauri implications to the merged plan.

## Next Useful Follow-Ups

- Run a protected Phase 0 setup spike in source.
- Decide whether HUD presets are shown in the current Theme Library list or a separate HUD Presets segment.
- Decide whether Tailwind adoption is acceptable for the game HUD layer.
- Decide whether Steam distribution uses only a remote Colyseus server or a bundled sidecar mode.
