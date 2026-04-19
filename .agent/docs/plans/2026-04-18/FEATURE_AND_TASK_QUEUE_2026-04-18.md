# Daily Queue — 2026-04-18

## Active task

**metaball-grid perf + tuning surface expansion.** Prior session shipped MG5→MG-BORDER v2. This session: performance analysis, research, and planning for Phase A/B/C perf work. Detailed plan: `./METABALL_GRID_PERF_PLAN_2026-04-18.md`. Branch: `claude/goofy-raman`.

## Completed today

- [x] MG-PERF-ANALYSIS — DevTools perf traces captured by user at 16px + 4px spacings; bottom-up breakdown recorded.
- [x] MG-PERF-RESEARCH — Web-research pass on PixiJS 8 high-throughput patterns, JFA, metaball splat-and-threshold, WebGPU status in 2026. Report archived in `METABALL_GRID_PERF_PLAN_2026-04-18.md` §Research.
- [x] MG-PERF-AUDIT — Local audit of current vstar distribution knobs, per-frame cost, existing tunables, prior metaball compositor. Results in §Current-State.

## Proposed next (pending user direction)

- [ ] MG-PERF-PHASE-A — tuning surface expansion (distribution modes, jitter, cell cap, cell-count readout, dirty-flag repaint gate, ParticleContainer backend option). Effort: 3-4h.
- [ ] MG-PERF-PHASE-B — two-layer caching architecture (static RenderTexture baked from natives + dynamic overlay for dispossessed cells). Effort: 1-2 days. The real architectural fix.
- [ ] MG-PERF-UNDERLAYER-CAPTURE — lift PREV geometry capture upstream into `GameCanvas` so transitions stop triggering a full Power-Voronoi rebuild. Effort: ~1 day. Blocks dense-spacing usability; perf traces show it dominates at 4px.
- [ ] MG-PERF-PHASE-C (stretch) — true metaball mode via splat-and-threshold OR JFA-based territory field. Effort: 1-5 days depending on direction.

## Checkpoint progression (from 2026-04-17)

- [x] MG0..MG6 (plan, types, classification, wave, scene, family, settings panel)
- [x] MG-REVERT+MOAT+PERF
- [x] MG-PERF v3 (compositor bypass)
- [x] MG-STYLE v1 (HSLA + shapes + easing + jitter)
- [x] MG-BORDER v1 (hex cell + centered-blended)
- [x] MG-BORDER v2 (joined corners + Chaikin + pointy-top hex)
- [ ] MG7 — Acceptance tests (deferred until Phase A/B land)
- [ ] MG8 — Perf bench + default (will use Phase A cell-count readout as the bench surface)
- [ ] MG9 — Paused debug overlay (partly subsumed by Phase A cell-count/frame-ms readout)

## Notes

- User is authorized to push today's doc commit.
- `settings-live/current-settings.json` has unrelated local edits (user tuning) — include in doc commit per AGENT.md §6.1.
