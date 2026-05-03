# MSR Star Power And Sensor Plan - 2026-05-01

## Correction

The current `MSR` implementation is the wrong kind of geometry processing.

It currently:

1. solves the weighted Voronoi ownership partition
2. extracts frontiers
3. clips those frontiers against per-star circles
4. rebuilds fills from the clipped frontier graph

That is not "tuning geometry during construction." It is post-solve frontier mutilation.

## Key Semantic Point

In the Power Voronoi stage, giving every real star the same weight does **not**
change star-vs-star boundaries directly. It changes how strongly real stars
resist corridor / lane-pair / disconnect virtual sites.

So `MSR as star power` is meaningful, but its meaning is:

- how strongly real gameplay stars dominate virtual shaping sites in the power solve

not:

- how strongly stars overpower each other

## Intended Geometry Stages

The intended pipeline should be:

1. **Seed ownership geometry**
   - real stars + virtual shaping sites participate in the Power Voronoi solve
   - real stars keep influence
   - optional `MSR as star power` modifies star resistance to virtual sites

2. **Support local star clearance during the solve**
   - deterministic support/ring sites may be emitted around stars
   - these allocate breathing room before frontiers exist

3. **Extract frontier graph**
   - build shared frontiers / world frontiers from solved cells

4. **Sense residual MSR violations**
   - cast rays from each star
   - measure first frontier hit distance by angle

5. **Repair only failed sectors**
   - insert deterministic vertices
   - bend frontier along star-clearance arcs
   - rebuild topology / fills from the repaired graph

6. **Pass finalized geometry to rendering**

## Proposed Tunables

### Widget: `MSR as star power`

- `Enable MSR star power`
- `Star power mode`
  - `Linear`
  - `Squared`
  - `Exponent`
- `Star power gain`
- `Star power exponent`
- `Star power cap`

Meaning:

- convert `MSR` from pixels into real-star power-diagram weight
- affects real stars vs virtual shaping sites during the solve

### Additional geometry tunables likely needed

- `MSR support rays`
- `MSR support radius factor`
- `MSR support site weight`
- `MSR sensor rays`
- `MSR repair tolerance`
- `MSR arc step`

## Recommended Algorithm

### Stage A: derive local star clearance radius

For each owned star:

- start with requested `MSR`
- cap against world edges
- cap against nearest enemy star distance
- do **not** cap because of same-owner neighbors

This produces `localMSR[starId]`.

### Stage B: build real star sites with adjustable star power

Real stars remain in the Power Voronoi solve.

Weight formula:

- `realStarWeight = f(localMSR, starPowerMode, gain, exponent, cap)`

Possible function:

- `powerPx = clamp(localMSR * gain, 0, capPx)`
- `realStarWeight = powerPx ^ exponent`

Default compatibility mode:

- `Squared`, gain `1`, exponent `2`

### Stage C: emit MSR support ring sites

For each star:

- cast `N` rays evenly around the star
- on each ray, place a same-owner support site at:
  - `supportRadius = localMSR * supportRadiusFactor`
- assign support-site weight as a fraction of `realStarWeight`

Purpose:

- reserve local space around stars during the solve
- make the solver produce frontier geometry that already tends to stay outside the star-clearance envelope

### Stage D: solve Power Voronoi

Sites:

- real stars
- MSR support ring sites
- corridor virtual sites
- contested lane-pair virtual sites
- disconnect virtual sites

Solve weighted Voronoi on that full site set.

### Stage E: extract frontier graph

- build cells
- extract contested edges
- merge same-owner cells
- extract shared frontiers / world frontiers

### Stage F: sensor pass

For each owned star:

- cast `M` rays around the star
- for each ray, find the nearest intersection with any frontier involving that owner
- measure `distanceToFrontier(angle)`

If `distanceToFrontier(angle) < localMSR - tolerance`, mark that angular sector as failed.

### Stage G: deterministic sector repair

For each failed angular sector:

1. locate the frontier segment entering the star-clearance circle
2. locate the frontier segment exiting the circle
3. split both segments at circle intersections
4. insert arc vertices along the star-clearance circle between those intersection points
5. reconnect the frontier graph with the replacement arc

Important:

- repair only the specific violated sector
- never clip whole owner-pair polylines blindly
- snap vertices with explicit tolerances
- re-run graph cleanup after edits

### Stage H: graph rebuild and fill reconstruction

- split at intersections
- snap vertices within epsilon
- remove zero-length and duplicate segments
- rebuild loops
- rebuild fills from the repaired frontier graph

## Pseudocode

```ts
type StarPowerParams = {
  enabled: boolean;
  mode: "linear" | "squared" | "exponent";
  gain: number;
  exponent: number;
  capPx: number;
};

type MsrSupportParams = {
  supportRayCount: number;
  supportRadiusFactor: number;   // e.g. 0.9
  supportWeightFactor: number;   // e.g. 0.35 of real star weight
};

type MsrSensorParams = {
  sensorRayCount: number;
  repairTolerancePx: number;
  arcStepPx: number;
  snapEpsilonPx: number;
  intersectionEpsilonPx: number;
};

function buildGeometryWithMsr(params): TerritoryGeometryData {
  const localMsr = computeLocalMsrByStar(
    params.stars,
    params.requestedMsr,
    params.world,
  );

  const realStarSites = params.stars
    .filter(isOwnedStar)
    .map(star => buildRealStarSite(star, localMsr.get(star.id), params.starPower));

  const msrSupportSites = buildMsrSupportSites(
    params.stars,
    localMsr,
    params.starPower,
    params.msrSupport,
  );

  const corridorSites = buildCorridorVirtualSites(...);
  const lanePairSites = buildLanePairVirtualSites(...);
  const disconnectSites = buildDisconnectVirtualSites(...);

  const solvedCells = solveWeightedVoronoi([
    ...realStarSites,
    ...msrSupportSites,
    ...corridorSites,
    ...lanePairSites,
    ...disconnectSites,
  ]);

  const frontierGraph = buildFrontierGraphFromCells(solvedCells, params.world);

  const msrViolations = senseMsrViolations(
    frontierGraph,
    params.stars,
    localMsr,
    params.msrSensor,
  );

  const repairedFrontierGraph = repairMsrViolations(
    frontierGraph,
    msrViolations,
    params.stars,
    localMsr,
    params.msrSensor,
  );

  const cleanedFrontierGraph = normalizeFrontierGraph(
    repairedFrontierGraph,
    params.msrSensor,
  );

  return rebuildTerritoryGeometry(cleanedFrontierGraph, solvedCells);
}

function buildRealStarSite(star, localMsrPx, starPowerParams): PowerSite {
  const weight = starPowerParams.enabled
    ? convertMsrToStarWeight(localMsrPx, starPowerParams)
    : 0;

  return {
    kind: "real-star",
    x: star.x,
    y: star.y,
    ownerId: star.ownerId,
    starId: star.id,
    weight,
  };
}

function buildMsrSupportSites(stars, localMsr, starPower, support): PowerSite[] {
  const out: PowerSite[] = [];

  for (const star of ownedStars(stars)) {
    const radius = localMsr.get(star.id) ?? 0;
    if (radius <= 0) continue;

    const realWeight = starPower.enabled
      ? convertMsrToStarWeight(radius, starPower)
      : 0;

    for (let i = 0; i < support.supportRayCount; i++) {
      const angle = (Math.PI * 2 * i) / support.supportRayCount;
      const supportRadius = radius * support.supportRadiusFactor;
      out.push({
        kind: "msr-support",
        x: star.x + Math.cos(angle) * supportRadius,
        y: star.y + Math.sin(angle) * supportRadius,
        ownerId: star.ownerId,
        starId: `${star.id}:msr:${i}`,
        weight: realWeight * support.supportWeightFactor,
      });
    }
  }

  return out;
}

function senseMsrViolations(frontierGraph, stars, localMsr, sensor): Violation[] {
  const violations: Violation[] = [];

  for (const star of ownedStars(stars)) {
    const radius = localMsr.get(star.id) ?? 0;
    if (radius <= 0) continue;

    const samples = [];
    for (let i = 0; i < sensor.sensorRayCount; i++) {
      const angle = (Math.PI * 2 * i) / sensor.sensorRayCount;
      const hit = castRayToNearestRelevantFrontier(frontierGraph, star, angle);
      samples.push({ angle, hitDistancePx: hit?.distancePx ?? Infinity });
    }

    const failedSectors = groupFailedAngularRuns(samples, radius, sensor.repairTolerancePx);
    for (const sector of failedSectors) {
      violations.push({ starId: star.id, sector });
    }
  }

  return violations;
}

function repairMsrViolations(frontierGraph, violations, stars, localMsr, sensor): FrontierGraph {
  let graph = cloneFrontierGraph(frontierGraph);

  for (const violation of violations) {
    const star = getStarById(stars, violation.starId);
    const radius = localMsr.get(star.id) ?? 0;

    const entryExit = findSectorEntryExitIntersections(
      graph,
      star,
      radius,
      violation.sector,
      sensor,
    );

    if (!entryExit) continue;

    const arcPoints = buildArcPoints(
      star.x,
      star.y,
      radius,
      entryExit.entryPoint,
      entryExit.exitPoint,
      sensor.arcStepPx,
    );

    graph = replaceFrontierSectorWithArc(
      graph,
      entryExit,
      arcPoints,
      sensor.snapEpsilonPx,
    );
  }

  return graph;
}
```

## Recommendation

Do **not** try to save the current post-clip-only model.

Implement the redesign in this order:

1. restore real-star influence in the weighted solve
2. add `MSR as star power` controls
3. add MSR support ring sites
4. add ray-based MSR sensing diagnostics
5. add sector repair only for residual violations

That preserves foundational Power Voronoi ownership while making `MSR`
deterministic and tunable as geometry.

## Implementation Status

Implemented on 2026-05-01:

1. restored real-star influence in the weighted solve via configurable `MSR as star power`
2. added the surfaced `MSR as star power` controls
3. added solve-stage same-owner MSR support ring sites
4. added ray-based residual violation sensing before repair
5. kept deterministic circle-bending repair, but currently apply it as a residual gated pass rather than full sector-grouped graph surgery

So the active code now matches the architecture direction, but the residual repair stage is still the simplified version of the plan rather than the full sector-by-sector graph rewrite.
