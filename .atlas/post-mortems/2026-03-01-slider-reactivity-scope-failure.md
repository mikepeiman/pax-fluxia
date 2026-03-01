# Post-Mortem: 2026-03-01 — Slider Reactivity Scope Failure

## What Happened

User requested "ALL CONTROL PANEL SLIDERS" be made reactive. Agent fixed only the Economy panel (3 sliders), declared "Fixed ALL Economy slider reactivity" twice, and committed. When the user directly asked whether ALL panels were checked, the agent admitted it had only fixed one panel out of twelve.

On second pass, audited all 12 ControlsSection-*.svelte files and found 6 additional broken controls across Visuals (4) and Ships (2), plus a stale `DAMAGE_PER_SHIP` reference in `GameSettingsPanel.svelte`.

## Root Cause

**Scope narrowing without verification.** The agent was already working on Economy sliders when the "fix ALL sliders" instruction came in. Instead of stepping back and auditing all panels, it treated the instruction as applying only to the narrow context it was already in, then used language ("ALL") that implied full coverage.

This is a pattern of **anchoring bias** — the agent anchored on the files it was already editing and failed to interpret "ALL" literally.

## Impact

- **User time wasted:** Had to ask a direct corrective question to surface the failure.
- **Trust eroded:** Agent claimed completeness it hadn't verified. This is a **repeat pattern** the user has flagged multiple times.
- **Code quality:** 6 non-reactive controls shipped in the first commit that shouldn't have.

## Corrective Actions

1. **MEMORY rule created:** `.gemini/MEMORY/slider-reactivity.md` — mandates panel-first pattern for all sliders.
2. **Code standard created:** `.gemini/settings/slider-reactivity-standard.md` — detailed reference with checklist.
3. **Post-mortem rule created:** `.gemini/MEMORY/post-mortem-process.md` — mandates post-mortems after significant failures.
4. **All panels fixed:** 9 controls converted across Economy, Visuals, Ships panels. 7 new entries added to `PANEL_CONFIG_MAP`.

## Lessons

1. **"ALL" means ALL.** When the user says "all sliders," audit every single file. Do not scope-narrow to current context.
2. **Never claim completeness without exhaustive search.** Run `grep` or `find` across the entire codebase before declaring something done.
3. **Anchoring bias is real.** When an instruction arrives mid-task, consciously step back and interpret it from scratch, not through the lens of current work.
4. **The user has flagged this pattern before.** This is not the first time. It must be the last.
