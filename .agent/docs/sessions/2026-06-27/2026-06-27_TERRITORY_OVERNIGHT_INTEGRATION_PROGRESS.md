# Territory Overnight Integration Progress, Plain-English Version

Rewritten: 2026-06-28 14:26:50 -04:00
Original report timestamp: 2026-06-27T16:25:06-04:00
Branch: `codex/territory-overnight-integration`
Worktree: `C:\Users\mikep\.codex\worktrees\territory-overnight-integration\pax-fluxia`

This document replaces the earlier internal-style progress log with a shorter
human-readable report. The detailed commit history still contains the full
technical record. This version focuses on what changed, what matters in the app,
what failed, and what remains unresolved.

## Terms Used Here

- Geometry means the computed territory shapes: filled areas, borders between
  players, and world-edge borders.
- Border structure means the app's record of which border segments connect into
  which closed territory outlines.
- Grid Gradient is the user-facing territory render mode that paints territory
  through a grid/texture approach.
- PVV4 means the current vector Power Voronoi target. In source code this is
  mostly represented by `resolved_power_voronoi` and the maintained 0319 geometry
  compiler.
- 0319 is a historical source-code name for the maintained Power Voronoi geometry
  compiler. It is not a user-facing product name.
- PVV2 is legacy renderer/code language. It still exists in older source files,
  but it should not be described as the target for the current vector-mode work.
- A background worker is a separate JavaScript thread used to do expensive
  preparation without blocking the game's drawing loop.
- A cache is stored work that can be reused later. A fixed-size cache keeps only
  a limited number of entries so memory cannot grow forever.
- An automatic geometry checker is code that rejects bad territory shapes before
  the transition system relies on them. The source-code name for one of these
  checkers is `resolvedGeometryOracle`, but reports should call it a geometry
  checker.

## What Actually Improved

1. Same-star recaptures are safer.

   Active territory FX transitions are now keyed by exact conquest identity:
   game tick, conquered star, previous owner, and new owner.

   Plain result: if one player captures a star and another player quickly
   recaptures the same star, the first animation finishing should no longer shut
   down the newer animation. Each capture animation now has its own identity.

2. Territory transition timing now follows game speed.

   The transition duration now uses the active game tick length after speed
   changes, rather than always assuming the base tick length.

   Plain result: territory transitions should stay more aligned with the game
   when the simulation speed changes.

3. Grid Gradient now carries richer geometry data through its background worker.

   Earlier wording: "Reliable topology now crosses the worker boundary with
   vertices, sections, loops, indexes, diagnostics, and reliability flags."

   Plain version: Grid Gradient's background worker now receives enough border
   structure to say whether the resulting territory shapes are safe for exact
   transitions. If the worker receives only a minimal payload, the app marks it
   as not safe for exact transition planning instead of pretending it is exact.

   Why this matters: a worker-generated Grid Gradient result should not quietly
   lose important border information and then be treated as if it were a perfect
   before/after geometry pair.

4. Geometry cache reuse became more careful.

   The app now checks more of the real map inputs before reusing previously
   computed territory geometry. That includes star coordinates/radius, lane
   layout, world bounds, and important geometry settings.

   Plain result: if map shape inputs change, the app is less likely to reuse an
   old territory result that no longer matches the map.

5. Grid Gradient memory growth was bounded.

   Earlier wording used "LRU cache." Plain version: the unbounded stored
   owner-grid maps were replaced by a small fixed-size cache. When it fills up,
   it discards the entry that has gone unused the longest.

   Why this matters: repeated Grid Gradient planning should not keep accumulating
   stored grid data forever.

6. More bad geometry cases are rejected automatically.

   The automatic geometry checker now catches more classes of bad territory
   output, including duplicate physical borders, crossed/self-intersecting
   outlines, bad world-edge ownership, missing border-map entries, and mismatched
   border-map geometry.

   Plain result: the app has stronger guardrails against drawing or animating
   territory from internally inconsistent shape data.

7. Transition reliability failures are now surfaced to benchmarks.

   If the transition planner cannot safely use exact before/after geometry, the
   benchmark output can report the reason. Examples include missing paired
   geometry, unsafe previous geometry, unsafe next geometry, or geometry changes
   without a matching conquest event.

   Plain result: when a transition silently falls back to a simpler path, the
   benchmark should say so instead of hiding the fallback.

8. Star capture flash render path was cleaned up.

   This is not the conquered star's owner-color change. It is the short white
   flash effect drawn on top of the star after conquest. That flash pulse was
   moved out of the main star shape redraw. The flash now uses a small overlay
   whose shape can be reused while only its opacity changes.

   Plain result: the visible capture flash still exists, and one unnecessary
   repeated redraw path is avoided. This is a small local cleanup, not a major
   game-performance fix.

9. Some heavy conquest work was moved out of the immediate render frame.

   Conquest presentation work that does not need to happen inside the current
   draw call was moved onto an asynchronous queue.

   Plain result from the measured Grid Gradient gameplay benchmark: one run
   before this change hit a 100ms worst frame; the comparable run after the
   change had a 50ms worst frame. That is not a full smoothness fix, but it was a
   real improvement in the measured case.

10. Benchmark measurement became more honest.

   The benchmark now separates "the game spent time rendering" from "the browser
   did not deliver the next frame quickly."

   Plain result: the latest measurements show that much of the remaining
   stutter-looking frame timing is not explained by the measured territory render
   work alone. That changes the next investigation target.

## Corrections To Earlier Bad Wording

1. "PVV2 and 0319 pass lane data into the fingerprint."

   Correct version: the current vector target is PVV4 through
   `resolved_power_voronoi` and the maintained 0319 compiler. PVV2 is legacy
   code language. The improvement was that lane layout became part of the
   geometry comparison key, so territory geometry is recomputed when lane inputs
   change.

2. "Star spatial movement."

   Correct version: stars do not move during normal gameplay. The test changed a
   star coordinate on purpose to prove cached geometry would be invalidated if a
   map load, editor action, fixture, or setup change altered star positions.

3. "Render-family terminal-frame retirement."

   Correct version: when a capture animation finishes, it now closes only the
   exact capture animation it belongs to. It should not close a newer recapture
   animation for the same star.

4. "LRU."

   Correct version: fixed-size cache. It keeps recently used entries and discards
   the least recently used entry when it is full.

5. "Oracle."

   Correct version: automatic geometry checker. It is code that checks whether
   the computed territory shapes are internally consistent enough to trust.

6. Long test-command lists.

   Correct version: tests are supporting evidence, not the user-facing result.
   The useful summary is whether the app behavior improved, whether browser
   benchmarks show it, and whether tests/build/checks caught regressions.

## Validation That Actually Matters

The exhaustive command list from the original report is intentionally removed.
The meaningful validation is:

- Source checks passed after the committed slices: TypeScript/Svelte checks,
  production build, territory test groups, and graph rebuilds.
- Browser benchmarks were run for Grid Gradient gameplay, Grid Gradient conquest
  animation, and Grid Gradient transition diagnostics.
- Browser benchmark output repeatedly reported no transition fallback in the
  tested Grid Gradient capture scenarios.
- A screenshot check confirmed the Grid Gradient conquest flash was visible and
  the captured panels were not clipped in that benchmark viewport.
- The transition diagnostic benchmark produced a validated before/after capture
  package for a star capture, including the full transition range from start to
  finish.

Important caution: tests and benchmarks are still partial evidence. They do not
prove every game mode, every map, every browser, or every timing condition is
solved.

## Notable Findings

1. Frame cadence is still not solved.

   In the tested Grid Gradient conquest animation runs, the app often received
   frames roughly 35ms apart instead of consistently near 16.7ms for 60fps.

   The important finding is that measured territory drawing was usually small.
   One later run measured full frame rendering around a few milliseconds on
   average, while the browser still delivered frames late.

   Meaning: the remaining smoothness problem may involve browser scheduling,
   compositor behavior, headless Chrome behavior, Pixi timing, ships/particles,
   or unmeasured waits. It should not be assumed to be only territory geometry
   cost.

2. Driving the game loop from Pixi's ticker was tested and rejected.

   A scheduling experiment replaced the separate game animation loop with Pixi's
   ticker. In the measured benchmark, it made frame timing worse. The code change
   was not kept.

   Meaning: "use Pixi ticker for everything" is not currently supported by the
   benchmark evidence.

3. The transition diagnostic recorder is intentionally expensive.

   The recorder is useful for proving whether a transition's before/after
   geometry is correct, but it adds substantial work while recording.

   Meaning: diagnostic recording should stay off for ordinary gameplay and
   ordinary animation performance benchmarks.

4. `power_core_candidate` is not ready as a replacement mode.

   The candidate mode was added as a comparison/audit mode. It still emits the
   maintained 0319 output while attaching extra comparison data from a candidate
   shared-border algorithm.

   Meaning: it is useful for comparison and testing, but it should not be
   treated as the new default or a finished user-facing mode.

5. The report exposed an architecture concern.

   Any distinction where local/single-player geometry gets better correctness
   tracking than online/remote game geometry is suspicious. Geometry correctness
   should be a game-state property, not a separate rule for one play style.

   Meaning: the remaining architecture work should aim for one reliable geometry
   truth path across local and online game states.

## What Failed Or Was Not Proven

- The overall 60fps smoothness goal was not achieved.
- The Pixi ticker scheduling experiment was tried and rejected because it made
  the measured case worse.
- The power-core candidate path was not promoted and should not be promoted
  without more live-map evidence.
- Browser benchmark coverage was narrow. Most concrete browser evidence came
  from Grid Gradient gameplay, Grid Gradient conquest animation, and Grid
  Gradient transition diagnostics.
- External research was not completed during this specific implementation
  stretch. That means no web search, no outside technical-source review, and no
  external model/expert consultation. The work was based on local code, local
  docs, branch audits, tests, and local browser benchmarks.
- The older report over-emphasized internal test command lists and under-explained
  the real app effect.

## Remaining High-Value Work

1. Solve frame cadence from the browser's point of view.

   Measure why the browser delivers many frames around 35ms apart even when
   measured game rendering is low. This needs browser/compositor investigation,
   not only more geometry micro-optimization.

2. Remove architecture splits in geometry correctness.

   Geometry reliability should not depend on whether the game is local or online.
   The same correctness signals should be available wherever the same game state
   exists.

3. Finish exact transition fallback rules.

   Every transition mode should have clear rules for when it can run exactly and
   when it must use a simpler fallback. Those reasons should be visible in
   benchmark/playtest output.

4. Test beyond Grid Gradient.

   The strongest browser evidence so far is Grid Gradient. PVV4/vector mode and
   other transition modes need the same direct benchmark/playtest treatment.

5. Keep reports user-readable.

   Future reports should lead with app-visible behavior and measurable findings.
   Code names should appear only when needed to locate the implementation, and
   every code name should be defined in plain English.

## Bottom Line

Real progress was made on exact capture identity, safer geometry reuse, bounded
Grid Gradient memory, stronger geometry checking, better benchmark visibility,
and reducing one measured source of conquest-animation cost.

The core remaining problem is not solved: the game still needs a direct,
browser-grounded fix for frame cadence and smoothness across modes. The next work
should focus there while preserving the new correctness guardrails.
