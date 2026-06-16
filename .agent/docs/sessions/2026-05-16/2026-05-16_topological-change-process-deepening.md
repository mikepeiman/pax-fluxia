# Topological Change Process: Deepening And Clarification

Date: 2026-05-16

Scope: PVV4 active-front transition planning in Pax Fluxia.

Purpose: describe what the current code actually does, in plain Pax Fluxia terms, so we can use the description as a lens for removing excess complexity, finding wrong concepts, and designing a better transition method.

This is not a final design spec. It is a code-grounded explanation of the current process and its weak points.

Primary code references:

- `pax-fluxia/src/lib/territory/compiler/chainWalkCore.ts`
- `pax-fluxia/src/lib/territory/compiler/buildFrontierMap.ts`
- `pax-fluxia/src/lib/territory/compiler/buildFrontierTopology.ts`
- `pax-fluxia/src/lib/territory/contracts/FrontierTopologyContracts.ts`
- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`

## Vocabulary Used In This Document

- PRE: the territory geometry before a conquest tick.
- POST: the territory geometry after that conquest tick.
- Region: one connected territory body belonging to one player.
- Border/frontier: a line where two players' territories meet, or where one player meets the world edge.
- Frontier section: one stored border piece between two stored topology vertices.
- Topology vertex: a stored graph node at a border junction or world boundary contact. The current code also creates some bookkeeping vertices that need scrutiny.
- Three-way junction, or 3V: a point where three or more territory regions meet.
- Stable topology vertex: a topology vertex whose ID and position are present in both PRE and POST within tolerance.
- Change Anchor: the real coordinate at the end of local border change. A stable topology vertex is not automatically a Change Anchor.
- Chain: a sequence of frontier sections walked from one stable topology vertex to another.
- Active front: the border portion that is supposed to move during the transition - the portions of border that differ from PRE to POST
- Transition Vertex, or TV: one sampled point on an active front that moves from PRE to POST.
- Owner pair key: the two owners on either side of a frontier section, sorted into a string such as `AI5|human-player`.
- Section influence: code data that says which star most strongly affects each side of a frontier section.

## Part 1: Short Process List

This is the compact nine-step view, updated to match the current code.

1. Build PRE and POST frontier topology from territory geometry.

    Territory geometry produces owner-owner and owner-world border polylines. Those polylines are converted into topology vertices, frontier sections, and region loops.

2. Identify stored topology vertices shared by PRE and POST.

    The transition planner looks for topology vertices with the same ID in PRE and POST, with allowed vertex kinds, whose coordinates are still close enough.

3. Build frontier chains between shared topology vertices.

    Starting from each shared topology vertex, the planner walks unused frontier sections until it reaches another shared topology vertex.

4. Group PRE and POST chains by their endpoint pair.

    A PRE chain and a POST chain are considered related if they connect the same two shared topology vertices.

5. Filter chains to conquest-relevant anchor pairs.

    If conquest events exist, the planner keeps only chain pairs whose frontier sections appear to touch the conquered star, attacking star, or a special previous two-star-region star.

6. Classify PRE|POST chain count.

    The planner accepts `1 PRE : 1 POST`, `1 PRE : 2 POST`, and `2 PRE : 1 POST`. Other counts become a planner defect. Missing PRE or missing POST also becomes a planner defect.

7. Detect the changed interval on the selected chain.

    The planner compares point distances between PRE and POST chain geometry. It finds the first and last points whose distance exceeds a threshold.

8. Convert changed intervals into active fronts and TVs.

    For `1:1` cases, the changed interval is expanded into a local window. The planner samples PRE and POST TV positions inside that window. The renderer moves TVs from PRE to POST.

9. Render by starting from POST topology and replacing active-front section coordinates.

    The renderer starts with POST section geometry, replaces active section coordinates with the moving TV-derived geometry, then rebuilds territory fill loops from those sections.

Short critique:

- The process is not truly region-first.
- Stable topology vertices and Change Anchors are still partly conflated.
- Chain walking through branches is too simple.
- Split/merge support is limited to `1:2` and `2:1`.
- The later region-level repair path can hide earlier planner failures.
- TV matching is not a single unconditional shortest-travel solver; it contains a thresholded branch.

## Part 2: Expanded Current-Code Process

### 1. Territory geometry creates frontier polylines

The geometry layer starts from owned stars and power-Voronoi territory results. It builds:

- owner-owner frontiers, where two players touch;
- owner-world frontiers, where territory touches the world boundary;
- merged territory shapes, which are filled regions;
- a frontier map and frontier topology, which give IDs to borders and graph vertices.

Relevant code:

- `compiler_UnifiedVectorGeometry.ts` calls `buildFrontierTopologyFromGeometry`.
- `buildFrontierTopologyFromGeometry` calls `buildFrontierTopology`.

Meaning in game terms:

The map is turned from colored territory polygons into named border pieces and named border junctions. Transition planning needs those names so PRE and POST can be compared.

// I wonder if we have any glitches here? Would a simpler method work better? For PRE & POST, try this:
// 1. Compare all regions by ID; single out any that are different 

### 2. Chain-walk input uses endpoint coordinate keys

`chainWalkCore.ts` defines `ptKey(x, y)` as:

```ts
return `${+x.toFixed(2)},${+y.toFixed(2)}`;
```

This means many topology identities begin as rounded coordinate strings.

Meaning in game terms:

The code says, "if two border endpoints round to the same coordinate key, treat them as the same graph point."

Risk:

Coordinate-key identity is not the same as semantic identity. A true 3V and a coincident bookkeeping endpoint can look the same to this machinery.

### 3. `executeChainWalk` builds per-owner loops from polylines

`executeChainWalk` combines shared frontiers and world frontiers into one list. It parses each polyline into:

- its two owners;
- its owner pair key;
- start coordinate key;
- end coordinate key;
- source polyline index.

Then it builds a junction map:

- key: endpoint coordinate key;
- value: all polyline ends touching that key.

Then, for each owner, it walks from one owned polyline to the next through matching endpoint keys until it either closes a loop or cannot continue.

Meaning in game terms:

The code tries to rebuild each player's territory outline by following connected border pieces.

Important detail:

This walk is a loop-builder for region fills. It was not originally designed as a precise transition-correspondence solver.

### 4. `buildFrontierMap` turns walk results into vertices, edges, and loops

`buildFrontierMap.ts` consumes the chain-walk result.

It creates vertex records from endpoint coordinate keys. A vertex is classified as:

- `junction-3way`, if its key came from the 3V detector;
- `frontier-mapedge`, if it is an endpoint on a world-border polyline;
- `loop-closure`, if it was the starting key of a closed loop;
- `endpoint`, if none of the above applies.

Meaning in game terms:

The code attempts to label the role of each border graph point.

Red-team note:

`loop-closure` and `endpoint` are not Pax Fluxia gameplay concepts. They are bookkeeping outcomes of the chain walk. Treating them as real transition anchors can create false stability.

### 5. `buildFrontierTopology` maps those records into transition-facing topology

`buildFrontierTopology.ts` converts the frontier map into `FrontierTopology`.

Current vertex-kind conversion:

- `junction-3way` becomes `junction_3way`.
- `frontier-mapedge` becomes `world_intersection`.
- `loop-closure` becomes `world_corner`.
- `endpoint` becomes `world_intersection`.
- unknown kinds become `world_intersection`.

Meaning in game terms:

The transition planner sees only a smaller set of topology vertex kinds. Some bookkeeping labels are promoted into apparently real world-boundary vertices.

Risk:

`endpoint -> world_intersection` is especially suspect. It can let an unclassified endpoint become a stable transition anchor.

### 6. `FrontierTopology` stores the graph used by transitions

The transition-facing topology stores:

- `vertices`: topology vertices by ID;
- `sections`: frontier sections by ID;
- `loops`: region loops, where each loop references ordered sections;
- `sectionsByOwnerPair`: owner pair key -> section IDs;
- `sectionsByVertex`: topology vertex ID -> incident section IDs;
- `sectionsByOwner`: owner ID -> section IDs.

Meaning in game terms:

The code has a graph of the map's borders. A frontier section is a shared border piece. It exists once. Region loops reference those sections instead of owning separate copies.

What "index" means here:

- Index by owner pair: build a lookup table for all border sections between the same two owners.
- Index by vertex: build a lookup table for all border sections touching one topology vertex.
- Index by owner: build a lookup table for all border sections where that owner is on either side.

### 7. The transition planner receives PRE and POST topology

`planActiveFrontTransition` receives:

- PRE frontier topology;
- POST frontier topology;
- ownership/conquest events;
- stars;
- previous regions;
- next regions;
- transition tunables.

Meaning in game terms:

The planner has two maps: before conquest and after conquest. Its job is to decide which border parts move and how.

### 8. Stable topology vertices are found by ID, kind, and coordinate distance

`findStableAnchors(prev, next, eps)` does this:

1. Iterate every PRE topology vertex.
2. Ignore it unless its kind is in `STABLE_ANCHOR_KINDS`.
3. Find the POST vertex with the same ID.
4. Ignore it unless POST kind is also allowed.
5. Measure PRE coordinate to POST coordinate.
6. If distance is within `stableAnchorEps`, keep that vertex ID.

Current allowed kinds:

- `junction_3way`;
- `world_intersection`;
- `world_corner`.

Meaning in game terms:

The code finds border graph points that appear unchanged from PRE to POST.

Critical distinction:

A stable topology vertex is only a candidate boundary for chain walking. It is not necessarily a Change Anchor. A Change Anchor should be a local coordinate where the changing border stops changing.

Hard invariant:

Change Anchor discovery must be branch-exhaustive. Starting from a known changed point on a border, the planner must walk outward in both directions along every possible branch of the local frontier graph until it finds every real PRE|POST matching coordinate that bounds the active front. If one branch reaches a matching coordinate and another branch remains changed, both outcomes must be represented. The planner must not stop after the first matching branch, and it must not choose one branch merely because of sorted section order.

Implication:

A moving 3V is not a Change Anchor. If a matched 3V changes coordinates, it is an internal transition constraint or a shared moving junction for adjacent active fronts. The Change Anchors for those active fronts are still the unmoving PRE|POST matching coordinates found by exhaustive outward branch walking.

Second hard invariant:

After Change Anchors are found, the planner must explicitly coordinate the PRE and POST pieces of the active front before it creates TVs. A Change Anchor pair only defines the outer bounds of local motion. It does not prove that one PRE path and one POST path have already been correctly paired inside those bounds.

Required intermediate product:

The planner needs an active-front correspondence record for each local changed border. That record must state which PRE border pieces and which POST border pieces correspond inside the Change Anchors, including valid `1:1`, `1:M`, `M:1`, and `M:N` cases. It must also state any internal moving 3Vs or branch points that must be shared across adjacent active fronts. TVs are generated only after this PRE|POST active-front correspondence is known.

### 9. PRE and POST chains are built between stable topology vertices

`buildChainsBetweenAnchors(topo, anchors)` does this:

1. Put all frontier sections in an `unusedSections` set.
2. Sort stable topology vertex IDs.
3. For each stable vertex, list incident section IDs.
4. For each incident section that is still unused, begin a chain.
5. At the current topology vertex, find candidate next sections:
   - incident to current vertex;
   - not the section just walked;
   - still unused.
6. Sort candidate section IDs.
7. Choose the first candidate.
8. Mark that section used.
9. Move to the section's other topology vertex.
10. Stop if the new current vertex is stable.
11. Remove immediate backtracking pairs.
12. Sort the chain orientation by endpoint IDs.
13. Concatenate section points into one chain point array.

Meaning in game terms:

The code tries to make border paths between apparently unchanged graph points.

Branch weakness:

At a branch, the current code does not solve "which path is the correct local border?" It sorts possible next sections and picks the first unused one. That is deterministic, but deterministic does not mean correct.

### 10. Chains are grouped by endpoint pair

`groupChainsByAnchorPair` builds a key:

```ts
anchorStartId + "|" + anchorEndId
```

It groups every PRE and POST chain under that key.

Meaning in game terms:

If PRE has a border path between stable points A and B, and POST has a border path between stable points A and B, the planner treats them as candidates for correspondence.

Risk:

This assumes endpoint-pair identity is enough. It is not enough when a region has multiple local border changes, when a 3V moves, or when a branch walk chose the wrong path.

### 11. The planner filters to conquest-relevant anchor pairs

If there are no conquest events, all chain groups are kept.

If conquest events exist, the planner keeps only groups where a section appears to touch the conquest.

`pathsTouchConquest` checks whether a path contains a section where:

- either side owner equals the conquest previous owner or new owner; and
- either side's section influence references a relevant star.

Relevant stars are:

- conquered star;
- attacker star;
- all attacker stars in the event;
- the other star in a previous two-star region that included the conquered star.

Meaning in game terms:

The planner tries to ignore unrelated borders by asking whether a frontier section is near the star ownership change.

Red-team note:

The "other star in a previous two-star region" rule is a special-case workaround. Region membership should carry this meaning directly.

### 12. PRE|POST chain count determines supported shape class

`detectSplitMode(prevCount, nextCount)` accepts:

- `1 PRE : 1 POST` -> normal;
- `1 PRE : 2 POST` -> split;
- `2 PRE : 1 POST` -> merge.

Anything else is not supported by this planner.

If one side is missing entirely:

- PRE exists and POST does not -> planner defect;
- POST exists and PRE does not -> planner defect;
- code labels this as `defect_topology_gap`.

Meaning in game terms:

The planner only understands one path becoming one path, one path becoming two, or two paths becoming one.

Risk:

Valid conquests can require `1:M`, `M:1`, or `M:N`. The current count classifier cannot describe those cases.

### 13. Changed interval detection uses point-to-polyline distance

For `1:1`, `findChangeSpanForPaths`:

1. Uses POST chain points as the scanned point list.
2. Uses PRE chain points as the comparison polyline.
3. Computes each POST point's minimum distance to the PRE polyline.
4. Finds the first point whose distance is greater than `changeSpanEps`.
5. Finds the last point whose distance is greater than `changeSpanEps`.
6. Returns that start/end index range.

For `1:2`, it scans the single PRE path against both POST paths.

For `2:1`, it scans the single POST path against both PRE paths.

Meaning in game terms:

The code asks, "which part of this border path is visibly different from the corresponding path on the other frame?"

Red-team note:

This is a geometric distance test. It does not know the conquest's true changed region. It can be fooled by wrong path selection, reversed sections, branch confusion, or broad moved geometry.

### 14. Change-span padding expands the changed interval

`applyChangeSpanPadding` expands the start and end indexes by `changeSpanPadPoints`, clamped to the available point count.

Meaning in game terms:

The planner deliberately includes a few extra border points around the detected changed region.

Risk:

Padding can hide an imprecise Change Anchor. It may make a transition more forgiving, but it can also broaden motion beyond the minimum changed frontier.

### 15. `LocalChangeWindow` converts changed indexes into PRE|POST arc positions

For normal `1:1` cases, `buildLocalChangeWindow`:

1. Gets PRE chain points and POST chain points.
2. Builds an arc-length table for each path.
3. Scans PRE points against POST points to find a PRE changed span.
4. Scans POST points against PRE points to find a POST changed span.
5. If both spans exist, each span is bracketed by one neighboring point.
6. The bracketed PRE indexes are converted to fractions of PRE path length.
7. The bracketed POST indexes are converted to fractions of POST path length.
8. The POST bracket indexes are stored as the current active point index window.
9. The PRE and POST fractions are stored as the positions used to sample TVs.

Meaning in game terms:

The code finds a local moving window on the chain, then records where that window begins and ends on both PRE and POST paths.

Plain language for "param":

The code uses a 0-to-1 distance fraction along a polyline. `0` means start of the chain. `1` means end of the chain. `0.5` means halfway by arc length, not halfway by array index.

Critical concern:

The current code derives effective Change Anchors from changed spans. The intended concept is stricter: a Change Anchor is the last matching local coordinate before the border starts diverging, and the first matching coordinate after it stops diverging. That is similar, but not identical.

### 16. One-sided changed-span repair exists inside `buildLocalChangeWindow`

If both PRE and POST changed spans are not found, the code still sometimes builds a window:

- if the base side is POST, it uses POST indexes and copies the same 0-to-1 fractions to PRE;
- if the base side is PRE, it uses PRE indexes and maps those fractions onto POST.

Meaning in game terms:

The code tries to produce a transition window even when the two-way comparison was incomplete.

Risk:

This can produce plausible-looking but wrong correspondence. It is not a proof that the same local border was identified on both frames.

### 17. Active sections are selected from POST path geometry

`buildSectionSpans` stores each POST path section's point-index range in the concatenated POST chain.

For normal `1:1`, if the changed span overlaps a POST section's point range, that section ID is marked active.

"Active" means:

During rendering, that section's coordinates may be overwritten by moving transition geometry for the current frame.

For `1:2` and `2:1`, the code marks the whole POST path active.

Risk:

Whole-path activation for split/merge cases can redraw large border sections even when only a small local interval should move.

### 18. TVs are generated only for normal `1:1` active fronts

`getActiveFrontMonotonicCorrespondence` returns `null` for split/merge modes.

For normal fronts, it:

1. Gets the active-front window.
2. Samples POST TV points between POST start/end arc fractions.
3. Samples PRE TV points between PRE start/end arc fractions.
4. Builds a denser set of PRE candidates.
5. Runs `buildMonotoneMinimumTravelFront`.
6. Compares the travel cost of minimum-travel PRE points versus arc-length PRE points.
7. Uses minimum-travel PRE points only if they are at least 15 percent lower travel cost.
8. Lerps chosen PRE TV points to POST TV points at the current transition progress.
9. Forces the first and last active TV to the POST endpoints.

Meaning in game terms:

The code creates a row of moving points along the active front and moves them from an old border shape to a new border shape.

Important defect lens:

The shortest-travel TV solver is not unconditional. A threshold decides whether it is used. That makes the system harder to reason about.

### 19. Active front geometry is written back into POST chains

`buildInterpolatedActiveFrontPath`:

1. Starts with a copy of the full POST chain point array.
2. Gets active TV geometry at the current progress.
3. Finds the POST point-index window from `LocalChangeWindow`.
4. Resamples the active TV polyline to match the number of POST points in that window.
5. Replaces those POST points with the moving points.
6. Returns the modified POST chain.

Meaning in game terms:

The rendered transition is POST geometry with the active part temporarily bent toward PRE and then released toward POST over time.

Risk:

If the point-index window is too narrow or too broad, the visible TV distribution and the actual moving border diverge from the intended minimum changed frontier.

### 20. Split/merge interpolation uses separate whole-front helpers

For `1:2`, the code splits the single PRE chain by nearest relation to the two POST chains, then lerps whole fronts.

For `2:1`, the code projects two PRE chains onto the single POST chain, sorts by POST position, then lerps whole front.

Meaning in game terms:

Split/merge modes are not using the same TV machinery as the normal `1:1` mode.

Risk:

This is a second transition system inside the same planner. It can produce broad redraws, rotations, or path borrowing.

### 21. A region-level repair path runs after anchor-pair planning

The code path is currently named `planRegionLevelActiveFrontFallbacks`. The name says "fallback"; the behavior should be treated as a repair path for unmatched PRE-only and POST-only topology gaps.

It:

1. Finds diagnostics where PRE paths exist but POST paths do not.
2. Finds diagnostics where POST paths exist but PRE paths do not.
3. Builds source entries from PRE-side region fronts near conquest events.
4. For each POST-only path, checks whether it touches conquest influence.
5. Selects a nearby PRE source path.
6. Creates a new active front using the whole POST path.
7. Marks the relevant diagnostic as `planned_region_front`.

Meaning in game terms:

When anchor-pair matching fails, the code tries to pair unmatched old borders with unmatched new borders near a conquest.

Risk:

This can "borrow" a border from the wrong region if region membership is not used as the governing constraint. It can turn a planner defect into a moving front, which hides the original error.

### 22. Collapse planning is separate from active-front planning

`planCollapseTargets` handles vanished regions, especially one-star islands. This is not the same as topological-change detection.

Meaning in game terms:

If a region ceases to exist, it should collapse. If a region remains but changes boundary, it should transition. These are separate cases.

### 23. Diagnostics report planner outcomes, but the process itself remains hard to inspect

Current diagnostics can show:

- stable anchors;
- pair diagnostics;
- active fronts;
- no-motion fronts;
- defect fronts;
- TVs;
- CA-like labels;
- trace frames.

Remaining diagnostic gap:

The code still does not expose enough of the intermediate decisions:

- which stable topology vertices were considered but rejected;
- which branch candidates existed during chain walk;
- why one branch was chosen;
- which region loop each chain belongs to;
- which PRE and POST region membership sets were compared;
- whether a Change Anchor was true local last-match or just a bracketed changed-span coordinate;
- whether TV correspondence used arc-length PRE or minimum-travel PRE.

## Part 3: Deep ELI5 And New-Hire Walk-Through

This section explains the same process more slowly and more concretely. It intentionally repeats key ideas from different angles.

### 3A. Explain It Like I'm 5

1. Imagine the map is colored paper.

2. Each player owns some colored paper areas.

3. The border between two colors is a line.

4. When a star is conquered, some colored paper changes shape.

5. PRE is the old paper shape.

6. POST is the new paper shape.

7. We want the old shape to slide smoothly into the new shape.

8. We do not want the whole map to wiggle.

9. We only want the changed border to move.

10. To know what changed, the code first cuts every border into named pieces.

11. A named border piece is a frontier section.

12. A place where border pieces meet is a topology vertex.

13. A true three-player meeting point is a 3V.

14. A place where territory hits the world edge is a world-boundary topology vertex.

15. The code also creates some bookkeeping points. Those are not necessarily meaningful map features.

16. The code compares the old named points to the new named points.

17. If a named point is still in the same place, the code calls it stable.

18. Stable means "probably did not move."

19. Stable does not automatically mean "this is where the moving border should stop."

20. The moving border should stop at Change Anchors.

21. A Change Anchor is the last point where old and new still agree before the change begins, and the first point where they agree again after the change ends.

22. The code then walks from one stable point to another stable point.

23. That walk creates a chain of border pieces.

24. A chain can be too long if the walk turns down the wrong path.

25. A chain can be wrong if a branch exists and the code picks the wrong branch.

26. The code groups old and new chains if they have the same two stable endpoints.

27. Then it asks, "does this chain touch the conquest?"

28. It checks the owners and star influence stored on the chain's border pieces.

29. If it seems relevant, the chain is allowed to become part of the transition plan.

30. Next, it checks whether there is one old chain and one new chain.

31. That is the easiest case.

32. It also supports one old chain becoming two new chains.

33. It also supports two old chains becoming one new chain.

34. It does not fully support many old chains becoming many new chains.

35. If the old chain or new chain is missing, the planner says this pair is defective.

36. After picking a chain pair, the code compares old points and new points.

37. It finds the part where old and new are far apart.

38. That far-apart part is the changed interval.

39. The code expands that interval slightly.

40. Then it turns that interval into a window on the old border and a window on the new border.

41. The ends of that window are treated as the active front's endpoints.

42. The code samples TVs along the old window.

43. It samples the same number of TVs along the new window.

44. During animation, each old TV moves toward its matching new TV.

45. The moving TVs form the moving active front.

46. The renderer starts with the POST map.

47. It temporarily replaces the active part with the moving TV line.

48. As time passes, the moving line reaches the POST line.

49. If the planner chose the right window, the transition looks local and smooth.

50. If the planner chose a wrong chain, the transition can rotate, stretch, or redraw too much border.

51. If the planner chose wrong Change Anchors, TVs do not cover the full real changed front.

52. If the planner missed a region that changed shape but kept the same owner, another player's transition can wrongly borrow that border.

53. If a vanished one-star region is detected, it should collapse instead of trying to frontier-lerp.

54. If a region remains but its border changes, it should transition its own border.

55. The central question is simple: "which exact local border changed, and what are its true unchanged endpoints?"

### 3B. Explain It Like I'm A New-Hire Junior

1. The active-front transition system does not directly compare filled polygons first.

2. It mostly compares frontier topology: graph nodes and graph edges extracted from PRE and POST geometry.

3. A graph edge is `FrontierSection`.

4. A graph node is `FrontierVertex`.

5. Region fills are represented by `RegionLoop`, which references ordered section IDs.

6. This is architecturally good in principle because shared borders exist once.

7. The problem is that transition planning depends heavily on how correctly that graph is built and walked.

8. The earliest identity source is usually a rounded coordinate key from a polyline endpoint.

9. The chain walk creates owner loops by connecting polylines whose endpoint keys match.

10. That means topology identity can inherit rounding and endpoint-classification errors.

11. `buildFrontierMap` classifies endpoint keys using available context.

12. It can classify a point as a true 3V, world-boundary contact, loop-closure bookkeeping point, or generic endpoint.

13. `buildFrontierTopology` maps those classifications into transition-facing vertex kinds.

14. The current mapping promotes generic endpoints into `world_intersection`.

15. That promotion is dangerous because `world_intersection` is considered stable-anchor eligible.

16. Stable-anchor eligibility is currently controlled by `STABLE_ANCHOR_KINDS`.

17. The planner only considers `junction_3way`, `world_intersection`, and `world_corner` stable enough to bracket chains.

18. Because generic endpoints can become `world_intersection`, unproven endpoints can enter the transition planner as stable vertices.

19. `findStableAnchors` is strict about same ID and coordinate distance.

20. It is not strict about semantic proof that a vertex is a true 3V or true world point.

21. After finding stable topology vertices, the planner builds chains.

22. Chain building is graph traversal over `sectionsByVertex`.

23. The traversal uses an `unusedSections` set.

24. "Unused section" means "a frontier section not yet consumed by a chain in this topology traversal."

25. "Incident section" means "a frontier section whose start or end vertex is the current topology vertex."

26. The walk starts from a stable topology vertex and an unused incident section.

27. It repeatedly moves across one frontier section to the next topology vertex.

28. At each vertex, it asks which unused incident section can be walked next.

29. If several candidates exist, it sorts the section IDs and picks the first.

30. This is a major simplification.

31. It does not ask which candidate belongs to the same local border change.

32. It does not ask which candidate belongs to the same region loop.

33. It does not ask which candidate minimizes TV travel.

34. It only imposes a stable deterministic choice.

35. Deterministic branch choice can still be the wrong branch.

36. The result of this walk is a `ChainPath`.

37. A `ChainPath` stores endpoint topology vertex IDs, section IDs, point arrays, and per-section point-index spans.

38. The code then groups chains by the two endpoint IDs.

39. A group key is "same start stable vertex, same end stable vertex."

40. This is useful but incomplete.

41. Two chains with the same stable endpoints can still represent the wrong local border if the branch walk was wrong.

42. Two chains can also represent different region-loop responsibilities even if their endpoint pair matches.

43. The conquest-relevance filter then tries to discard unrelated chains.

44. It uses owner IDs and star influence from sections.

45. It checks whether the section's owners include the old or new conquest owner.

46. It checks whether section influence references the conquered star or attacker star.

47. It also includes the other star in a previous two-star region around the conquered star.

48. That two-star rule exists because some two-star-region cases need both stars considered.

49. It is not a clean substitute for region membership.

50. Region membership should answer "which PRE region did this star belong to?" and "which POST region owns this area now?"

51. After filtering, the planner compares how many PRE chains and POST chains exist for each endpoint pair.

52. `1:1` is treated as normal.

53. `1:2` and `2:1` are treated as supported split/merge modes.

54. All other counts are marked unsupported.

55. This is narrower than the game can produce.

56. Valid topology can require `1:M`, `M:1`, or `M:N` active-front correspondence.

57. If PRE exists but POST does not, or POST exists but PRE does not, the code marks a topology-gap defect.

58. "Topology gap" does not mean Pax Fluxia has an empty physical gap.

59. It means this planner did not find both sides of a corresponding chain group.

60. For a normal `1:1` chain pair, the planner finds changed intervals by distance.

61. It scans POST points against the PRE polyline and finds points farther than `changeSpanEps`.

62. It records first and last far points.

63. It pads that point range.

64. Then it computes a two-way local change window.

65. It scans PRE against POST and POST against PRE.

66. If both scans find changed intervals, the code brackets each interval by one neighbor.

67. Bracketing by one neighbor tries to include the last unchanged point on either side.

68. Those bracketed points currently function as local Change Anchors.

69. This is close to the intended concept but still indirect.

70. The intended concept is to locate local equality/divergence directly: walk from the stable outer topology vertices inward until PRE and POST stop matching, and use that last match as the Change Anchor.

71. The code then converts bracketed point indexes into arc-length fractions.

72. An arc-length fraction is a 0-to-1 coordinate along a chain by distance.

73. This is used because PRE and POST chains may have different numbers of raw points.

74. TV sampling uses these fractions to sample equal TV counts on both paths.

75. The current TV path code samples POST TVs first.

76. It samples arc-length PRE TVs second.

77. It also computes a denser PRE candidate set.

78. It chooses a monotone minimum-travel PRE set only if that set's travel cost beats arc-length sampling by a threshold.

79. This threshold is an implementation branch that weakens the spec.

80. If minimum travel is the required behavior, it should be the primary solver, not a conditional alternative.

81. The renderer does not draw arbitrary TV data directly into fills.

82. It takes POST chain geometry and replaces the active point-index window with the moving TV polyline.

83. The replacement polyline is resampled to the number of POST points in that window.

84. If the active window is wrong, TV display can look correct while the fill border still changes incorrectly.

85. If the active window is too narrow, parts of the real moving border have no TVs.

86. If the active window is too broad, whole border sections can redraw.

87. If the PRE path is mismatched to the POST path, TVs travel long nonlocal paths.

88. Split/merge modes bypass the normal TV correspondence and use whole-front lerp helpers.

89. That means split/merge behavior is not fully aligned with the normal active-front design.

90. After primary planning, the region-level repair path tries to pair unmatched PRE-only and POST-only paths.

91. That repair path is useful as a diagnostic clue but dangerous as hidden transition behavior.

92. If it pairs the wrong PRE source to a POST path, it can animate the wrong border.

93. A better system should classify changed regions first.

94. Region-first means identify which PRE and POST regions changed star membership, ownership, or boundary topology before matching arbitrary anchor-pair chains.

95. For same-owner topology-changed regions, that region should own its own transition.

96. No other front transition should consume its border.

97. 3Vs touching that region must be coordinated across all adjacent active fronts.

98. A moving 3V is not a static endpoint; it is a shared moving coordinate used by each adjacent front for the same frame.

99. This suggests that Change Anchors and moving 3Vs need to be planned as shared transition constraints, not isolated per-chain decorations.

100. The clean target is: region/classification first, changed local border second, exact Change Anchors third, TV correspondence fourth, render rebuild fifth.

## Process Weak Points To Use As An Audit Lens

1. Endpoint identity is coordinate-key based.

    Rounded coordinate keys are useful for joining polylines, but they are weak as semantic identity.

2. Bookkeeping vertices can become stable transition anchors.

    `endpoint` and `loop-closure` are not game concepts. Their current conversion can make them look like real topology vertices.

3. Stable topology vertex and Change Anchor are not cleanly separated.

    The planner first finds stable graph vertices, then derives local active-front endpoints from changed spans. The distinction exists in code but remains easy to confuse in diagnostics and planning language.

4. Branch traversal is underspecified.

    Choosing the first sorted unused incident section is not a robust local-border matching algorithm.

5. Region ownership is not the first planning authority.

    The current planner builds anchor-pair chains first, then filters by conquest relevance, then runs a later region-level repair path.

6. Split/merge handling is too narrow.

    `1:2` and `2:1` are special cases. The game can create `1:M`, `M:1`, and `M:N` local transformations.

7. The normal mode and split/merge mode use different interpolation methods.

    This means tuning or fixing TVs for normal fronts does not automatically fix split/merge fronts.

8. TV matching contains a hidden algorithm choice.

    It uses minimum-travel PRE samples only if they beat arc-length samples by a threshold. That is not a single deterministic transition rule.

9. Active section selection is POST-side and point-index-window based.

    If POST path selection is wrong, the renderer writes moving geometry into the wrong place.

10. Repair paths can hide defects.

    A later repair path can turn a missing correspondence into a planned active front. That may keep rendering alive, but it can also obscure the exact bug.

## Candidate Simplification Direction

This is not implementation work in this document. It is the analysis direction the document supports.

1. Make region diff the first step.

    Compare PRE and POST regions by owner, star membership, and boundary loops before planning active fronts.

2. Classify region cases explicitly.

    Examples: unchanged region, changed-owner region, same-owner topology-changed region, appeared region, vanished region, split region, merged region.

3. Let regions own their changed borders.

    If a region remains owned by the same player but its boundary changes, it should plan its own PRE|POST transition. Its border should not be consumed by another conquest front.

4. Treat 3Vs as shared moving constraints when needed.

    If adjacent fronts meet at a moving 3V, each front must use the same 3V coordinate for the same transition frame.

5. Derive Change Anchors from local equality, not just broad stable topology vertices.

    Walk or match PRE|POST border geometry to find where the local frontier stops matching. The last matching coordinate before divergence is a Change Anchor.

    This search must be branch-exhaustive. From each known changed border location, inspect every incident frontier branch in both outward directions until all bounding PRE|POST matching coordinates have been found. A branch point cannot be treated as resolved until every outgoing candidate branch has either produced a Change Anchor, joined an already-resolved active front, or been classified as a real planner defect.

6. Coordinate PRE and POST active-front sections.

    A pair of Change Anchors defines the local transition boundary, but the planner still has to determine which PRE border pieces correspond to which POST border pieces inside that boundary. This step must produce explicit correspondence for `1:1`, `1:M`, `M:1`, and `M:N` cases before TV distribution. It must preserve shared internal moving 3Vs so adjacent active fronts use the same moving coordinate at the same animation frame.

7. Generalize split/merge.

    Replace `1:2` and `2:1` special handling with component matching that can represent `1:M`, `M:1`, and `M:N`.

8. Use one TV correspondence objective.

    The TV solver should explicitly minimize local travel under monotone order, endpoint constraints, and region/border ownership constraints. It should not silently choose between unrelated modes based on a threshold unless that threshold is itself a named tuning control.

9. Make each stage inspectable.

    Diagnostics should show region diff, candidate stable topology vertices, chain walk branch choices, chosen chains, local Change Anchor derivation, active section windows, and final TV correspondence.

## Questions This Document Should Help Us Ask

1. Which vertices are true 3Vs or world contacts, and which are bookkeeping endpoints?

2. Which stable topology vertices are used only to form a search window, and which coordinates become actual Change Anchors?

3. Did the chain walk have a branch, and if so, why was one branch chosen?

4. Which PRE region and POST region does each chain belong to?

5. Does the active front belong to the region whose ownership or topology changed?

6. Is a same-owner, topology-changed region being transitioned by itself, or is its border being borrowed by another front?

7. Are all valid split/merge counts represented, or did the planner mark a valid game case as unsupported?

8. Are TVs distributed over the full active front between true Change Anchors?

9. Are TV paths local and short, or do they cross the region because PRE|POST correspondence is wrong?

10. Does the renderer replace exactly the active front and no more?
