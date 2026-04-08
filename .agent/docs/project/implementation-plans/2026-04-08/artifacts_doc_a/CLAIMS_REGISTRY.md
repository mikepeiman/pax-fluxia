# Claims registry — Doc A (v1)

**Schema:** `claim_id | claim | source_path | strength (H/M/L) | verify how`

| ID | Claim | Source | Str | Verify |
|----|--------|--------|-----|--------|
| C-PVV2-01 | Commit `8dce88c` is the best known working PVV2 + DY4 OT conquest transition baseline. | `PVV2_REFERENCE_COMMIT.md` | H | `git show 8dce88c:...`; user visual on replay worktree. |
| C-PVV2-02 | Hybrid (HY2 Seed+Delta) pins fills at 3-ways/edges; pure Dynamic/PVV2 does not. | `PVV2_REFERENCE_COMMIT.md` | H | Compare modes at ref commit vs current; geometry probes. |
| C-PVV2-03 | PVV2 at ref is monolithic; modular 4-layer needs *translation*, not paste. | `PVV2_REFERENCE_COMMIT.md` | M | Architecture diff vs `territory/` package. |
| C-ARCH-01 | Ownership → Geometry → Transition → Presentation is the documented clean stack. | `TERRITORY_ARCHITECTURE.md` | M | Code: `TerritoryRuntimeCoordinator` + layer registries. |
| C-ARCH-02 | Transition layer has been the primary failure locus in recent agent work. | Jumpstart + unified plan + session meta | M | Human ground truth + transition devtools usage. |
| C-CONQ-01 | Fills should follow frontier truth; stable borders should not jitter; timing tick-bound. | `CONQUEST_ANIMATION_SPEC.md` | H | Visual + recorder snapshots. |
| C-PLAN-01 | Render Family model: shared ownership; one family owns GPU/vector/grid internals. | `TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md` | H | Impl 0 gate + coordinator wiring (future). |
| C-PLAN-02 | DistanceFieldFamily first after Impl 0. | Unified plan II.5 | M | Impl sequencing. |
| C-ATLAS-01 | Atlas `MECHANICS` may carry terminology/diagnostic sections absent from non-atlas copy. | `TRANCHE_A_FINDINGS.md` | M | Diff `.atlas/MECHANICS.md` vs `.agent/docs/game/design/MECHANICS.md`. |
| C-GEM-01 | Gemini memory points at `.agent/context/*.md` deep dives. | `.gemini/MEMORY/agent-context.md` | L | Glob those paths; update memory if stale. |
