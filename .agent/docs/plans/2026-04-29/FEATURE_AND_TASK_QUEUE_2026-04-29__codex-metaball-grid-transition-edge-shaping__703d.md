# Feature And Task Queue - 2026-04-29

## Active

- Implement the "new Perplexity transition render mode ideas v2" plan in the live `metaball_grid` render-family path instead of creating a parallel territory runtime.
- Extend `pax-fluxia/src/lib/territory/families/metaballGrid/planGridWave.ts` from seed/rank-only wave planning into a richer phase-field flip-time planner.
- Add two new phase geometries:
  - `conquered_star_radial`
  - `pre_to_post_frontier`
- Keep legacy `grid_bfs` and `euclidean_band` modes available as fallbacks and comparison baselines.
- Update the settings UI and defaults so the new frontier-driven mode is the default shipped path.

## Completed This Session

- Verified the active governing docs before editing:
  - `.agent/AGENT.md`
  - `.agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md`
  - `.agent/docs/plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md`
  - `C:\Users\mikep\Documents\Obsidian Vault\2026-04-29 new Perplexity transition render mode ideas v2.md`
- Confirmed that `metaball_grid` is the current render-family runtime already on the family shell, so the implementation belongs there first.
- Implemented new phase-field planning and supporting attribution/config/UI/test updates.

## Validation

- Passed targeted Bun tests:
  - `bun test pax-fluxia/src/lib/territory/families/metaballGrid/buildGridClassification.test.ts pax-fluxia/src/lib/territory/families/metaballGrid/planGridWave.test.ts pax-fluxia/src/lib/territory/families/metaballGrid/renderMetaballGridScene.test.ts pax-fluxia/src/lib/territory/families/metaballGrid/metaballGridRuntime.test.ts`
- Client-wide compile check was not fully available in this workspace:
  - `bun run --cwd pax-fluxia check` failed because `svelte-kit` was not on PATH for the script environment.
  - `bun x svelte-check --tsconfig ./tsconfig.json` failed because `.svelte-kit/tsconfig.json` and `@sveltejs/adapter-static` were not available locally.

## Follow-Up

- Verify in-app that `pre_to_post_frontier` visually pushes the conquest front from old border to new border on representative maps.
- Compare the new default against `conquered_star_radial`, `grid_bfs`, and `euclidean_band` for feel, readability, and performance.
- If visual parity with the external concept still needs stronger locality, consider a later local-bounds/static-underlay split instead of reintroducing full-map per-frame work.
- Merge handoff note for `master` is recorded at:
  - `.agent/docs/plans/2026-04-29/MERGE_HANDOFF_2026-04-29_metaball-grid-transition-edge-shaping.md`
- Merge agent must explicitly set shipped `metaball_grid` defaults for borders and DX:
  - `METABALL_GRID_BORDER_MODE = 'territory_edge'`
  - `METABALL_GRID_BORDER_BLEND = true`
  - `METABALL_GRID_BORDER_CHAIKIN_PASSES = 4`
  - `MODIFIED_VORONOI_DISCONNECT_ENABLED = true`
  - `MODIFIED_VORONOI_DISCONNECT_DISTANCE = 295`
- Known caveats to carry into merge:
  - `METABALL_GRID_EDGE_TRIM_PX` is unfinished and should stay `0`
  - the territory fill toggle currently appears broken and needs a small audit before ship
  - superseding Settings Panels ontology/refactor + custom dropdown work should absorb the new variables coherently instead of copying the current panel verbatim

