---
date created: 2026-07-19
last updated: 2026-07-19
last updated by: opus-ui-cutover
---

# Vision — Unified Theme/Preset Manager (advanced/developer feature)

**User-authored direction (2026-07-19), captured for a later slice — not yet built.**

The per-section "Manage {category} Themes" preset bars (`CategoryThemeBar`) are
confusing in the regular settings UI ("I never specified a special mode for just
AI behavior"). Rather than keep them inline or delete them, the user wants them
to evolve into ONE **full-screen theme-management modal** that:

- Manages themes/presets **both per-section AND overall** (full-config) — i.e.
  the per-category presets (`categoryKeys.ts` partition) and the full-config
  presets (`fullConfigPresets.ts`) live under one manager.
- Provides a **better UI to tune the relevant settings** from within the manager
  (not just save/load — actually edit).
- **Shows a snapshot of what a saved preset contains** (inspect the values a
  preset holds before/without applying).
- Is treated as an **"advanced" / "developer" feature**, gated OUT of the regular
  default UI (behind the dev/advanced tier).

## Relationship to current work
- Issue #2 fixes already landed the data foundation: complete category partition
  (`categoryKeys.ts` + coverage test) and full-config named presets
  (`fullConfigPresets.ts`, Config Presets UI in ConfigTransferPanel).
- This manager is the PRESENTATION layer over that data — fits the cutover plan's
  Phase 5 (settings presentation redesign) and the advanced/dev-tier gating.

## Open questions for the design pass
- Entry point (where the advanced/dev toggle reveals it).
- How per-section vs overall presets are organized in one modal.
- Inline tuning surface (reuse existing section controls vs a compact editor).
- Snapshot/diff view format (list of keys+values; diff vs current live config).
