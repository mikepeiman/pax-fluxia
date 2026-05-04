# Merge Note

- source worktree: `c2f3`
- source commit: `cad080942cd19c311f7954fe342e3213663ce1dd`
- merge intent: fold deltas into the canonical unsuffixed master doc, do not overwrite it

# 2026-04-28 Queue â€” worktree `c2f3`

## Active Epic

- Settings UI audit and reorganization
- Diagnostics unification into one Settings-owned surface
- Lower-right diagnostics launcher restoration and semantic HUD ownership cleanup
- Territory split into:
  - `Territory Modes & Transition`
  - `Territory Tuning & Constraints`
  - `Territory Styles`
- Semantic naming cleanup across code and UI for the new Power Voronoi path
- Territory tuning correctness and compute-lag fixes:
  - CX toggle lag
  - lane midpoint pair propagation
  - DX direction/semantics verification
  - requested vs applied MSR visibility

## Current Work Items

- Create merge-safe worktree session docs for `2026-04-28` â€” done
- Replace implicit Settings subsection scanning with explicit section/subsection metadata â€” done
- Rename top-level Settings sections:
  - `Map & Overlays` -> `Map Options & Tuning` â€” done
  - `Debug` -> `Diagnostics` â€” done
  - `Battle` -> `Combat Tuning` â€” done
- Re-home duplicated topology controls to their single owning section â€” mostly done
- Remove territory controls from Diagnostics â€” done
- Gate Perimeter Field diagnostics and controls by active render mode â€” done
- Replace floating diagnostics panel workflow with Settings-primary diagnostics deep-link â€” done
- Restore lower-right diagnostics launcher through a semantically named HUD floating-actions component â€” done
- Fix recorder bundle list visibility â€” done
- Fix `Ruler OFF` clearing behavior â€” done
- Fix render status so no selected mode remains `unknown` â€” improved in the Territory status path
- Add bounded topology compile feedback for heavy CX/DX/MSR tuning â€” done
- Verify live DX semantics and complete the internal PV id-stem migration â€” remaining
- Collapse the stale direct-runtime fill/border transition split into one semantically correct transition concept â€” remaining

## Risks / Watchlist

- Existing uncommitted territory-runtime changes in this worktree must be preserved and integrated, not reverted
- Top-level section reorg may affect local-storage persisted open section ids
- Renaming the new Power Voronoi mode path requires compatibility aliases for persisted settings
- Territory UI refactor must not regress mode gating for `perimeter_field`, `metaball_grid`, and existing comparison modes

## Additional Completed Work

- Removed stale `USE_RENDER_FAMILIES` compat gate from settings, config, persistence, and debug/fingerprint residue.
- Fixed the main `metaball_grid` transition-latency failure mode by holding PRE while the worker plan is pending and running a family-local visual clock once the plan arrives.

