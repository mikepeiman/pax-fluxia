# Handoff: claude/goofy-raman → master merge

**Date:** 2026-04-20  
**Branch:** `claude/goofy-raman`  
**Merge target:** `master`  
**Merge base:** `259b2999` (`docs(metaball-grid): perf trace analysis + 4-phase plan`)  
**This branch tip:** `16dea792`  
**Master tip (at time of writing):** `fe70d158` (`merge: bring in map editor 1de4 integration`)  
**Commits ahead of master:** 30 (24 code + 6 docs-only)

---

## 1. Honestly — what I know vs. what I guessed

### KNOW FOR CERTAIN (verified by tests and/or user confirmation)

- **Lane write-side fix is correct and tested.** `c5118a30` + regression test
  in `laneConnectionSync.test.ts`. User saw `[lane-cache-fix]` engage and
  confirmed attacks work after refresh. Master does NOT have this fix —
  confirmed by reading master's `lanePolylineCache.ts` directly (no
  `sourceId > targetId` check anywhere). Master is vulnerable to backward
  ship travel on any map with ≥10 stars.
- **Master has a diverged `MetaballGridFamily.ts`.** Both branches added it
  independently after merge base. Master's version = 1141 lines, this
  branch = 1276 lines. Master's version has EMA stats, MAX_CELLS coarsening,
  prevGeometry — so Phase A core is in both. This branch's 135 extra lines
  contain the 6 bug fixes from `6b17b5e3`. Files must be merged, not one
  discarded.
- **Master has wiring fixes this branch doesn't.** Commits `a05c182b`,
  `f794be5a`, `5967a92d` on master fixed metaball-grid panel wiring issues
  that arose after the merge base. This branch doesn't have those fixes —
  it diverged before they were needed or fixed.
- **Master has a complete map editor.** Commits `ccaf4484`, `d9e4da3c`,
  `658ba0d6`, merged as `fe70d158`. This branch has ZERO map editor code.
  Map editor is a clean additive feature in new files, but it touches
  `GameCanvas.svelte` and routing.
- **Master's perimeter-field work is more complete.** The 11a1 integration
  (`3e71e066` merge) brought in much deeper perimeter-field work. This
  branch has earlier perimeter-field type contracts
  (`perimeterFieldTransitionTypes.ts`) that may or may not align with
  master's current types.
- **`settings-live/current-settings.json` will conflict badly.** Both
  branches touched it many times. Do NOT try to merge this file
  programmatically. **Strategy: take master's version, then re-apply any
  config keys unique to this branch's bug-fix commits.** See §3.

### GUESSED / NEEDS VERIFICATION

- **Phase C (upstream PREV geometry cache) status on master.** Master's
  `GameCanvas.svelte` was checked for `prevCanonical` / `mgPrev` strings —
  nothing found. My conclusion: Phase C is NOT in master. **Verify** by
  diffing `GameCanvas.svelte` at `9329bab7` changes vs master's file.
- **`buildPowerVoronoiFrontierTopology.ts` status.** This branch added it
  at `4b7491a1`. Not in the master diff list, but master has deep
  perimeter-field work. Possibly the same functionality was added to master
  under a different name or absorbed into another file. **Verify** by
  grepping master for `buildPowerVoronoi` before including this file.
- **`perimeterFieldTransitionTypes.ts` status.** Added at `17c301ef`.
  Master's 11a1 perimeter-field integration may supersede these types.
  **Verify** type names against master's perimeter-field types before
  merging.
- **`PerimeterFieldFamily.ts` delta.** This branch modified it (`34 lines
  changed`). Master has a much more evolved version post-11a1. The goofy-
  raman changes to this file may already be absorbed or may conflict with
  master's implementation. **Verify by reading both diffs before merging.**
- **Whether master's MetaballGridTuning.svelte panel wiring is
  forward-compatible** with this branch's 6-bug-fix `MetaballGridFamily.ts`
  changes. Likely yes (the 6 bugs were visual/render fixes, not API
  changes), but untested.

---

## 2. File-by-file merge guide

### CLEAN CHERRY-PICKS — apply these files/commits from goofy-raman to master verbatim

These files were not touched by master after the merge base. Zero conflict
risk. Apply first.

| File | Commits | What it does |
|---|---|---|
| `pax-fluxia/src/lib/lanes/lanePolylineCache.ts` | `c5118a30`, `7cc1fb8a`, `033fd738` | **Lane write-side fix** + engagement diagnostic + logger import. |
| `pax-fluxia/src/lib/lanes/laneConnectionSync.test.ts` | `c5118a30` | Non-canonical regression test. 4th test added to existing 3. |
| `pax-fluxia/src/lib/territory/families/metaballGrid/buildGridClassification.ts` | `5756ed9e` | Grid classification module. Almost certainly not in master. |
| `pax-fluxia/src/lib/territory/families/metaballGrid/buildGridClassification.test.ts` | `5756ed9e` | 460-line test suite for above. |
| `pax-fluxia/src/lib/territory/families/metaballGrid/planGridWave.ts` | `097cc913` | Wave planner module. |
| `pax-fluxia/src/lib/territory/families/metaballGrid/planGridWave.test.ts` | `097cc913` | Test suite. |
| `pax-fluxia/src/lib/territory/families/metaballGrid/renderMetaballGridScene.ts` | `4173ae77` | Scene builder. |
| `pax-fluxia/src/lib/territory/families/metaballGrid/renderMetaballGridScene.test.ts` | `4173ae77` | Test suite. |
| `pax-fluxia/src/lib/territory/families/metaballGrid/metaballGridTypes.ts` | `936e6881` | 342-line type contracts. |
| `pax-fluxia/src/lib/territory/families/metaballGrid/metaballGridStats.ts` | `9329bab7` | Stats store. |
| `pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts` | various | Mode catalog additions. |

**STOP: verify each of these is not in master before cherry-picking.** Command:
```sh
git show origin/master:pax-fluxia/src/lib/territory/families/metaballGrid/buildGridClassification.ts 2>&1 | head -3
```
If it outputs content, master already has it — skip and only port any deltas.

### THE LANE FIX — most important, apply to master as a standalone PR

The three files that make up the complete lane fix:

```
pax-fluxia/src/lib/lanes/lanePolylineCache.ts     — the fix itself
pax-fluxia/src/lib/lanes/laneConnectionSync.test.ts — regression test
pax-fluxia/src/lib/fx/handlers/transferHandler.ts  — diagnostics (optional)
```

**Exact diff to apply to `lanePolylineCache.ts` on master:**

Master's `seedLanePolylineCacheFromMapGen` body:
```ts
cache.set(edgeKey(c.sourceId, c.targetId), c.laneWaypoints.map((p) => [p[0], p[1]]));
```

Replace with:
```ts
const waypoints = c.laneWaypoints.map((p) => [p[0], p[1]] as [number, number]);
const reversed = c.sourceId > c.targetId;
if (reversed) waypoints.reverse();
cache.set(edgeKey(c.sourceId, c.targetId), waypoints);
```

Same change in `rebuildLanePolylineCache` (master's version has the identical
old one-liner). Also add the `log` import and the engagement diagnostic if
desired (optional — master will work correctly without the diagnostic).

**Regression test:** add the `normalizes non-canonical seed input` test case
from this branch's `laneConnectionSync.test.ts` (lines 97-128).

### CONFLICT ZONES — must 3-way merge, do not take either side wholesale

#### `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.ts`

- Master: 1141 lines — has Phase A (EMA stats, MAX_CELLS coarsening,
  PREV geometry, direct rect painting).
- This branch: 1276 lines — has the same + 6 bug fixes.
- **Strategy:** start with master's version as base. Apply the diff from
  commit `6b17b5e3` which isolates the 6 bug fixes. Run `git show 6b17b5e3`
  to see exactly what changed.
- **Known bug fixes in `6b17b5e3`:** DRY cell-paint path, epoch signature
  check, hex shift correction, jitter default, inward-offset, alpha gain.
  These are all in the paint/render path of the family file, not in the
  wiring/API.
- **Risk:** master's wiring-fix commits (`a05c182b`, `f794be5a`) may have
  changed the PIXI draw loop in ways that conflict with the 6 bug fixes.
  Read both diffs before applying.

#### `pax-fluxia/src/lib/components/game/GameCanvas.svelte`

Both branches added significant code after the merge base.

- **Master added:** Map editor integration, perimeter-field 11a1 overlay
  wiring, diagnostics panel unification, route fixes.
- **This branch added:** Phase C upstream PREV geometry capture (commit
  `94b7367e`), perimeter-field debug overlay additions (`30a73b59`).
- **Strategy:** take master's version as base. Apply Phase C changes from
  `94b7367e` as a cherry-pick. Phase C is a PREV geometry upstream cache —
  it captures `CanonicalGeometrySnapshot` before transitions and passes it
  to the MetaballGridFamily. Look for the PREV capture block in this branch
  and port it forward.
- **Do not guess line numbers.** Use `git show 94b7367e --` to see exactly
  what Phase C added.

#### `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`

- Master has it (with wiring fixes applied). This branch has an older
  version.
- **Strategy:** take master's version. If there are UI changes on this
  branch not in master, they are in commits between `a366e027` and
  `6b17b5e3` — run `git log a366e027..6b17b5e3 -- *MetaballGrid*` to
  see. Likely there are none (the 6 bug fixes were in the family file, not
  the panel).

#### `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`

Both branches modified it. Master added map editor entry points and
diagnostics panel consolidation. This branch added metaball-grid family
card and wiring.

- **Strategy:** take master's version. Verify that the metaball-grid family
  card block (`{#if showRendererModule("metaball-grid") ...}` at line 2168
  in this branch) is present in master's version. If not, port that block
  from this branch.

#### `common/resources/settings-live/current-settings.json`

- **DO NOT merge programmatically.** Both branches changed this file many
  times for unrelated reasons. The JSON will conflict on virtually every key.
- **Strategy:** take master's version entirely, then add any NEW config keys
  introduced by this branch's bug fixes (commit `6b17b5e3`). Run:
  ```sh
  git show 6b17b5e3 -- common/resources/settings-live/current-settings.json
  ```
  to see exactly which keys changed. Apply only keys that don't exist on
  master.

### FILES UNIQUE TO THIS BRANCH — verify before porting

| File | Added at | Status |
|---|---|---|
| `pax-fluxia/src/lib/territory/families/buildPowerVoronoiFrontierTopology.ts` | `4b7491a1` | **Verify master doesn't have equivalent.** |
| `pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldTransitionTypes.ts` | `17c301ef` | **Verify master's 11a1 work doesn't supersede.** |

### FILES UNIQUE TO MASTER — this branch needs these on merge

- All map editor files (clean additive).
- Master's perimeter-field 11a1 work (many files).
- Master's settings tooltip metadata (`e3f7d799`, `8c6ca371`).
- Panel wiring fix files if any (may be inline edits, not new files).

---

## 3. Recommended merge order

1. **Start from master** as the base. Master has more mature wiring,
   working map editor, and complete 11a1 perimeter-field — these are harder
   to add to goofy-raman than to add goofy-raman's fixes to master.

2. **Apply the lane fix first**, standalone, as a separate commit:
   - `lanePolylineCache.ts` — 2-function fix
   - `laneConnectionSync.test.ts` — 4th test only
   - `transferHandler.ts` — diagnostic functions (optional; include if you
     want the safety net)
   Run `bun test` after this step. Should be green.

3. **Apply the MetaballGridFamily 6-bug-fix delta** from `6b17b5e3`:
   ```sh
   git show 6b17b5e3 -- pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.ts
   ```
   Apply the diff manually to master's 1141-line version. Confirm visual
   behavior in-game (epoch gating, hex alignment, jitter, alpha).

4. **Apply Phase C PREV geometry upstream cache** from `94b7367e`:
   Affects `GameCanvas.svelte` and possibly `MetaballGridFamily.ts`.
   Read the commit diff carefully — Phase C adds state captured before the
   family's `update()` call, not inside it.

5. **Verify buildPowerVoronoiFrontierTopology and perimeterFieldTransitionTypes**
   against master's perimeter-field state. Port only if not already covered.

6. **Reconcile settings-live** (see §2 above).

7. **Full test suite:** `bun test` must be green.

8. **Visual smoke-test:** start a game, send ships, confirm forward travel.
   Then start a game with 12+ stars and repeat (this exercises the exact
   `'star-10' < 'star-2'` cliff that caused the regression).

---

## 4. What NOT to port from this branch

- Docs in `.agent/` — keep master's docs, add today's plans/post-mortem
  as additive files (no conflict risk, they're date-namespaced).
- The three runtime diagnostics in `transferHandler.ts` — they can be
  kept or dropped; they're capped at 5 fires each and do no harm, but
  they're temporary scaffolding. **Decision for the merging agent.**
- Plans in `.agent/docs/plans/2026-04-20/` — add these files; they don't
  touch master's docs.

---

## 5. Risks and unknowns

| Item | Risk | Confidence |
|---|---|---|
| Lane fix correctness | LOW — unit-tested, user-verified | HIGH |
| MetaballGridFamily 6 bug fixes merging cleanly | MEDIUM — shared file with different base | MEDIUM |
| Phase C in GameCanvas conflicts with map editor | MEDIUM-HIGH — both branches added significant code here | LOW (not tested) |
| perimeterFieldTransitionTypes superceded by master | MEDIUM | LOW (not compared) |
| buildPowerVoronoiFrontierTopology already in master | MEDIUM | LOW (not compared) |
| settings-live programmatic merge works | HIGH risk — do not attempt | HIGH confidence don't do it |
| MetaballGridTuning.svelte compatibility after taking master's | LOW — wiring fixes are in master | MEDIUM |

---

## 6. Co-located planning documents (all in this folder)

- `RENAME_PLAN_LANE_WAYPOINTS_TO_VERTICES_2026-04-20.md` — proposed
  rename of `laneWaypoints`→`laneVertices` terminology. 90 hits, 23
  files, wire-crossing. Staged migration recommended. **Not yet executed;
  awaiting user approval.**
- `DIAGNOSTICS_PANEL_MODE_REACTIVE_2026-04-20.md` — proposed
  `FamilyDiagnosticsContract` design so each render family registers its
  own diagnostic toggles and overlay render hook. Includes grid-mode
  geometry overlay spec. **Not yet executed; awaiting user approval.**
- `FEATURE_AND_TASK_QUEUE_2026-04-20.md` — today's task log and follow-ups.

## 7. Related post-mortem

`.agent/docs/project/post-mortems/POST_MORTEM_2026-04-20_LANE_DIRECTION_WRITE_SIDE.md`
— full root-cause analysis of the lane direction regression. Key rule derived:
**cache storage contracts must be enforced at the writer, not the reader.**
Includes three derived rules about `star-N` lexicographic ordering.

---

## 8. Quick reference: master's lanePolylineCache.ts vs. this branch

Master (VULNERABLE):
```ts
// seedLanePolylineCacheFromMapGen — writer does no canonicalization:
cache.set(edgeKey(c.sourceId, c.targetId), c.laneWaypoints.map((p) => [p[0], p[1]]));
```

This branch (FIXED, commit c5118a30):
```ts
const waypoints = c.laneWaypoints.map((p) => [p[0], p[1]] as [number, number]);
const reversed = c.sourceId > c.targetId;
if (reversed) waypoints.reverse();
logStorageFixEngagement(c.sourceId, c.targetId, reversed);
cache.set(edgeKey(c.sourceId, c.targetId), waypoints);
```

The same two-liner fix applies identically in `rebuildLanePolylineCache`.
Without it, any generated map with ≥10 stars produces backward ship travel
and attack surges. The fix is 4 lines. Apply it first before anything else.
