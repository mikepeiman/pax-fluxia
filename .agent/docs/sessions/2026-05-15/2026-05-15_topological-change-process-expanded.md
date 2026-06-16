# Topological Change Process, Expanded

Date: 2026-05-15

Purpose: explain the current PRE|POST frontier topology and active-front transition process in exact Pax Fluxia terms, identify misleading terms, and mark current spec risks.

## Red Team Conclusions

1. `loop-closure` and `endpoint` are compiler bookkeeping labels, not Pax Fluxia domain concepts.

2. `endpoint` is especially suspect. In `buildFrontierMap.ts`, `endpoint` means "a polyline endpoint not classified as a three-way junction, world-border endpoint, or loop-start closure." In `buildFrontierTopology.ts`, it is converted to `world_intersection`. That conversion can turn an unclassified or degenerate endpoint into a stable transition anchor. That is likely wrong.

3. `loop-closure` is also suspect. It means "the first vertex key of a closed chain-walk loop." It is then converted to `world_corner`. A loop closing at its start does not prove the point is a world corner.

4. "Stable anchor" in current code is not the same as Change Anchor. A stable anchor is any PRE and POST topology vertex with the same ID and nearly the same coordinate. A Change Anchor should be the local boundary coordinate where a specific changed active front begins or ends.

5. The current chain walk does not truly solve branches. At a branch it chooses the first sorted unused incident section. That is deterministic by string order, not by game geometry.

6. Current split support is incomplete. It handles exactly `1 PRE : 2 POST` and `2 PRE : 1 POST`, not the general valid cases `1:M`, `M:1`, or `M:N`.

7. The current "two-star sibling" logic is a special-case workaround. The correct model is region membership: all stars in the affected PRE and POST regions matter, not only the other star in a two-star region.

8. The hidden TV correspondence branch is a design smell. The code compares arc-length PRE sampling against a lower-travel monotone PRE sample set and only uses the lower-travel result if it beats the arc-length result by a hardcoded threshold. A deterministic transition machine should expose the objective directly, not silently choose between methods.

## Current Pipeline

### 1. Geometry Produces Frontier Polylines

The geometry layer computes territory borders as point arrays. These point arrays are the physical PRE or POST borders on the map.

Relevant files:

- `pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts`
- `pax-fluxia/src/lib/territory/compiler/buildFrontierMap.ts`
- `pax-fluxia/src/lib/territory/compiler/chainWalkCore.ts`

The important output for transition is not just a polygon fill. It is a frontier topology: identified vertices, identified border sections, and region loops built from those sections.

### 2. Segment Endpoint Keys

Definition: a segment endpoint key is a string ID made from an endpoint coordinate.

Implementation: `ptKey(x, y)` rounds the coordinate to two decimal places and returns a string like `123.45,678.90`.

Code reference: `pax-fluxia/src/lib/territory/compiler/chainWalkCore.ts:13`

Important distinction: a vector segment already has endpoint coordinates. The code is not creating a new geometric point. It is creating an identity record so other code can say "these segment endpoints are the same vertex."

### 3. Frontier-Map Vertices

Current code symbol: `CanonicalVertex`.

Translation: this is a frontier-map vertex record.

It contains:

- `id`: coordinate key from `ptKey`
- `x`, `y`: world coordinate
- `degree`: how many chain-walk segments touch it
- `kind`: compiler classification

Code reference: `pax-fluxia/src/lib/territory/compiler/buildFrontierMap.ts:132`

There is no useful "non-canonical vertex" distinction in the transition explanation. The meaningful distinction is source geometry versus topology record:

- Source geometry: raw border point arrays.
- Topology record: named vertices and named border sections built from those arrays.

### 4. Vertex Kind Classification

`buildFrontierMap` classifies a vertex with this order:

1. If the key is in `junctionVertexKeys`, mark `junction-3way`.
2. Else if the key is an endpoint of a world-border polyline, mark `frontier-mapedge`.
3. Else if the key is the first junction key of a closed chain-walk loop, mark `loop-closure`.
4. Else mark `endpoint`.

Code reference: `pax-fluxia/src/lib/territory/compiler/buildFrontierMap.ts:32`

Plain meanings:

- `junction-3way`: three or more territories meet here.
- `frontier-mapedge`: a territory border touches the map boundary here.
- `loop-closure`: compiler noticed that a walked region loop returned to its starting point.
- `endpoint`: compiler did not classify this endpoint.

Red Team note: `endpoint` should not be silently converted to a stable world intersection. It should be treated as unclassified until proven otherwise.

### 5. Frontier Sections

Definition: a FrontierSection is one shared border section between two topology vertices.

It exists once. Two owners do not get separate copies.

Each section contains:

- start vertex ID
- end vertex ID
- left owner
- right owner
- point array from start to end
- owner pair key
- left and right star influence

Code reference: `pax-fluxia/src/lib/territory/contracts/FrontierTopologyContracts.ts:62`

### 6. Topology Conversion

`buildFrontierTopology` converts frontier-map records into the `FrontierTopology` contract consumed by transition.

Code reference: `pax-fluxia/src/lib/territory/compiler/buildFrontierTopology.ts:97`

Current questionable mappings:

- `junction-3way` becomes `junction_3way`
- `frontier-mapedge` becomes `world_intersection`
- `loop-closure` becomes `world_corner`
- `endpoint` becomes `world_intersection`

Red Team note: the last two mappings are not justified by the names alone.

### 7. Indexes

Definition: indexing means building lookup maps so later code can find sections without scanning every section.

`sectionsByOwnerPair`: owner pair key to section IDs.

Purpose: find every border section between the same two owners.

`sectionsByVertex`: vertex ID to section IDs.

Purpose: walk from one border section to adjacent border sections at the same topology vertex.

`sectionsByOwner`: owner ID to section IDs.

Purpose: find every section touching a player.

Code reference: `pax-fluxia/src/lib/territory/compiler/buildFrontierTopology.ts:124`

### 8. Stable Anchors

Current code term: stable anchors.

Definition: stable anchors are topology vertices that exist in both PRE and POST with the same ID, allowed kind, and coordinate distance under tolerance.

Allowed kinds:

- `junction_3way`
- `world_intersection`
- `world_corner`

Code reference: `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:1491`

Red Team note: because `endpoint` can become `world_intersection`, some unclassified endpoints can become stable anchors.

### 9. Chain Building Between Stable Anchors

Current function: `buildChainsBetweenAnchors`.

Definition: a chain is an ordered list of FrontierSections connecting one stable anchor to another stable anchor.

Algorithm:

1. Put every section ID in `unusedSections`.
2. Sort stable anchor IDs.
3. For each stable anchor, read all sections touching that anchor.
4. For each touching section not yet used, start a chain.
5. At the current vertex, list sections touching that vertex.
6. Remove the section just walked from that candidate list.
7. Remove sections already used elsewhere.
8. Sort the remaining candidate section IDs.
9. Pick the first candidate.
10. Add it to the chain and mark it used.
11. Move to the other endpoint of that section.
12. Stop when the walk reaches another stable anchor or cannot continue.
13. Remove immediate backtracking pairs.
14. Sort the two anchor IDs so the chain has a stable key.
15. Build the chain point array by concatenating oriented section points.

Code reference: `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:1513`

Branch handling: if more than one valid outgoing section exists at a vertex, current code picks the first sorted section ID. It does not choose by owner continuity, region loop membership, conquest event, shortest path, or local border-change evidence. That is brittle.

Definition: an unused incident section is a real FrontierSection touching the current vertex that has not already been assigned to a chain in this chain-building pass.

### 10. Grouping By Anchor Pair

After chains are built, they are grouped by `anchorStartId|anchorEndId`.

Purpose: compare PRE and POST chains that connect the same two stable anchors.

Code reference: `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:1734`

Red Team note: this is broader than Change Anchor matching. At this stage the code is comparing chains between stable topology vertices, not yet between actual local Change Anchors.

### 11. Conquest-Relevant Filtering

If there are no conquest events, all anchor-pair keys are considered.

If conquest events exist, a chain is considered relevant if it touches a conquest event.

Current test:

1. The section must touch either previous owner or new owner.
2. The section's left or right influence must mention a relevant star ID.
3. Relevant star IDs include the conquered star.
4. Relevant star IDs include attacker star IDs.
5. Relevant star IDs include the other star from the conquered star's previous two-star region.

Code references:

- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:1844`
- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:1911`
- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:1962`

Red Team note: "sibling star" is not a good term. The actual meaning is "the other star in the conquered star's previous two-star region." The whole special case should be replaced by region membership logic.

### 12. PRE|POST Chain Count Classification

Current function: `detectSplitMode`.

Current cases:

- `1 PRE : 1 POST` becomes `none`
- `1 PRE : 2 POST` becomes `1to2`
- `2 PRE : 1 POST` becomes `2to1`
- anything else is `defect_unsupported_split_mode`

Code reference: `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:1743`

Red Team note: valid topology changes can be `1:M`, `M:1`, or `M:N`. The current two-only split/merge support is incomplete.

### 13. Missing Side Classification

Current label: `defect_topology_gap`.

Definition in current code: a stable-anchor pair has at least one chain on PRE or POST, but zero chains on the other side.

Code reference: `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:330`

Why this can happen even though Change Anchors should imply a section exists:

At this stage the code has not found true Change Anchors. It is using broad stable-anchor pairs. A broad stable-anchor pair can exist on one side and not the other because the region graph took a different branch, the same border was split by new topology, or the section exists under a different anchor pair after conquest.

Red Team note: this label should not be explained as a missing section between true Change Anchors. It is a missing counterpart for a current broad stable-anchor chain.

### 14. Changed Interval Detection

Current function: `findChangeSpanForPaths`.

Plain term: scanned side.

Bad current term: base side.

Definition: the scanned side is the side whose points are tested for distance from the other side.

Current choices:

- `1:1`: scan POST points against the PRE polyline.
- `1:2`: scan PRE points against both POST polylines.
- `2:1`: scan POST points against both PRE polylines.

For every point on the scanned side:

1. Compute distance to the nearest point on the comparison polyline or polylines.
2. Find the first point with distance greater than `changeSpanEps`.
3. Find the last point with distance greater than `changeSpanEps`.
4. That inclusive index range is the raw changed interval.

Code references:

- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:1754`
- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:1997`

### 15. Local Change Window And Change Anchors

Current function: `buildLocalChangeWindow`.

Definition: a LocalChangeWindow stores where the moving active front begins and ends along the PRE and POST chain.

Current internal term: param.

Translation: param is a 0..1 arc-length fraction along a chain. `0` is the start of the chain. `1` is the end of the chain.

Current 1:1 process:

1. Compare PRE points to POST and find the changed PRE interval.
2. Compare POST points to PRE and find the changed POST interval.
3. Expand each changed interval by one neighboring point on each side when possible.
4. Convert those PRE interval endpoints into PRE arc-length fractions.
5. Convert those POST interval endpoints into POST arc-length fractions.
6. Store those four fractions plus the POST endpoint indices.

Code reference: `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:2010`

Spec interpretation:

Change Anchors should be the local coordinates where the border stops matching and starts changing. In practical terms: the last conforming coordinate before divergence and the first conforming coordinate after divergence.

Red Team note: current implementation uses interval bracketing to approximate that. It is close to the intended idea for simple 1:1 cases, but the terminology hides the actual requirement and can fail when the broad path is wrong.

### 16. Active Sections

Definition: active sections are POST FrontierSections whose local point ranges will be replaced by moving TV geometry during the transition.

Current function: `buildSectionSpans`.

Current 1:1 process:

1. Look at every section in the POST chain.
2. Compute whether the section's point-index range overlaps the changed POST interval.
3. If it overlaps, add the section ID to `activeSectionIds`.
4. Store the exact point-index overlap as `activeStartIndex` and `activeEndIndex`.

Current split/merge process:

1. If split mode is `1to2` or `2to1`, mark the whole POST path active.

Code reference: `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:2113`

What "active" does in rendered reality:

1. `sampleActiveFrontSectionGeometry` starts with every NEXT section as static geometry.
2. For each active section, it computes the active TV front for the current progress.
3. It replaces only the active interval inside that section with corresponding TV points.
4. Region loops are rebuilt from the resulting per-frame section geometry.

Code reference: `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:1171`

### 17. Transition Vertices

Current function: `getActiveFrontMonotonicCorrespondence`.

Definition: Transition Vertices are equal-count points on the PRE and POST active fronts. During transition, each PRE TV moves to its corresponding POST TV.

Current process for 1:1:

1. Read the LocalChangeWindow.
2. Sample POST between the POST start and end fractions.
3. Sample PRE between the PRE start and end fractions.
4. Build a denser PRE candidate point list.
5. Compute a monotone minimum-travel PRE point list against the sampled POST points.
6. Compare travel cost between arc-length PRE sampling and minimum-travel PRE sampling.
7. Use minimum-travel only if it is at least 15 percent cheaper.
8. Linearly interpolate each chosen PRE TV to its corresponding POST TV.
9. Force the first and last active TV to the POST endpoint coordinates.

Code reference: `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:2300`

Red Team note: step 7 is a hidden decision branch. The correct contract should name one solver objective and use it consistently.

### 18. Split And Merge TV Gap

Current `getActiveFrontMonotonicCorrespondence` returns `null` for split modes.

Code reference: `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:2305`

Instead, split and merge use whole-front helpers:

- `splitByNearest`
- `mergeByNearest`
- `lerpMonotonicWholeFront`

Red Team note: this means split/merge transitions are not using the same TV correspondence contract as 1:1 active fronts.

### 19. Rendering The Transition

Current function: `sampleActiveFrontTransition`.

Process:

1. Build per-frame section geometry from the active-front plan.
2. Start from NEXT topology.
3. Rebuild every NEXT region loop from the per-frame section geometry.
4. Add PRE island collapse loops if any.
5. Return fill regions for rendering.

Code reference: `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:1334`

Red Team note: using NEXT topology as the base is reasonable only if every changed PRE|POST section has been matched correctly and every topology-changed same-owner region has its own planned transition. If not, NEXT topology can borrow or redraw borders in visually wrong ways.

## Corrective Plan For Same-Owner Topology-Changed Regions

1. Build PRE and POST region identity from owner ID plus star membership.

2. Detect regions whose owner and star set are unchanged but whose border loop changed.

3. Create a region-owned transition scope for each such region before conquest-front matching.

4. Inside that scope, compare the PRE loop and POST loop and find local unchanged runs and changed runs.

5. Define Change Anchors at the last conforming coordinate before divergence and first conforming coordinate after divergence for each changed run.

6. Split the region boundary at true Change Anchors and at any affected three-way junction.

7. Create one active front for each local changed run.

8. Reserve the involved sections and junction coordinates so conquest-front planning cannot consume them for another player's transition.

9. When a three-way junction moves because of the region-owned transition, emit one shared per-frame junction coordinate and make every attached active front use that same moving endpoint.

10. Replace exact `1:2` and `2:1` handling with general `1:M`, `M:1`, and `M:N` matching inside the same local topology-change scope.

11. Replace `endpoint` and `loop-closure` as stable transition anchors. `endpoint` should become a classification defect unless proven to be a real world intersection. `loop-closure` should not become a world corner unless the coordinate is actually a world corner.

## Better Names

Current code term: `base`.

Better term: scanned side.

Current code term: stable anchor.

Better term: shared topology vertex.

Current code term: LocalChangeWindow.

Better semantic term: active-front local Change Anchor range.

Current code term: sibling star.

Better term: other star in the conquered star's previous region, but the real fix is region membership.

Current code symbol: `CanonicalVertex`.

Better explanation: frontier-map vertex record.
