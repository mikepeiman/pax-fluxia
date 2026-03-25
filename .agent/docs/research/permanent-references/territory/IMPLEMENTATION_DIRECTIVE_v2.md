## Remaining-Only Plan (Post-Reality Check)

### Summary
You are correct: a large portion is already done.  
From current code, the following are materially implemented: original chunks **1-3, 5-8, 10, 12**, plus major parts of **13-14** (canonical routing/smoothing/validation and UI/runtime mode wiring in [DistanceFieldTerritoryRenderer.ts](C:\Users\mikep\Desktop\WebDev\PRISM-Atlas-DART v1\pax-fluxia\src\lib\renderers\DistanceFieldTerritoryRenderer.ts), [frontierGraph.ts](C:\Users\mikep\Desktop\WebDev\PRISM-Atlas-DART v1\pax-fluxia\src\lib\renderers\frontierGraph.ts), [strokeMeshBorders.ts](C:\Users\mikep\Desktop\WebDev\PRISM-Atlas-DART v1\pax-fluxia\src\lib\renderers\strokeMeshBorders.ts)).  

What remains is the final reliability path to eliminate the current **“no borders in Production Mesh”** failure, then complete fill/morph finalization.

### Remaining Implementation Chunks
1. **R1 (finishes original 14): Canonical Publish Reliability**
   - Make canonical publish atomic and snapshot-stable: build -> validate -> publish in one state transition.
   - Separate canonical published state from legacy published state (no shared fingerprint/cross-clobber).
   - Canonical selection must not depend on transient vector overlay draw readiness.
   - Done when Production Mesh always has a deterministic source decision each frame.

2. **R2 (finishes original 13/14): Non-Blank Source Ladder**
   - Enforce strict source order:
     1. canonical current published  
     2. canonical last valid published  
     3. legacy published  
     4. none
   - Never hide mesh if any rung has non-empty polylines.
   - Done when Production Mesh cannot go blank while a published source exists.

3. **R3 (finishes original 11/13): Canonical Polyline Safety Net**
   - Add “smoothing collapse” fallback: if smoothing/linearization drops contour quality below thresholds, revert that contour to raw extracted shape.
   - Keep per-pair/contour boundaries strict; forbid pair-global stitching regressions.
   - Done when canonical pipeline never emits empty/degenerate output from valid published owner-grid input.

4. **R4 (finishes original 8/14): Diagnostics + Assertion Discipline**
   - Add explicit failure reasons for publish/select stages (single structured payload, one fingerprinted warning per unique failure).
   - Keep alignment assert diagnostic-only (disabled in production runtime path).
   - Done when console output is sparse, causal, and directly actionable.

5. **R5 (finishes original 4/9/14): Border Lock Acceptance Gate**
   - Run fixed validation matrix on a pinned map + preset:
     - static high zoom
     - continuous pan/zoom
     - conquest transitions
     - resize/transposition
     - reload
   - Gate passes only if: no mode cycling, no blank borders, no staircase artifacts comparable to current failures.
   - Done when Border Lock is objectively green and reproducible.

6. **R6 (original 15): Canonical Fill Backfill**
   - Make canonical visible fill derived from canonical frontier geometry truth.
   - Validate fill-border coincidence under zoom and transitions.
   - Done when canonical fill/border drift is eliminated.

7. **R7 (original 16): Final Modes + Regression + Default Flip**
   - Preserve Fade Blend, complete Boundary Morph as distinct mode on stable frontier correspondence.
   - Full regression matrix across legacy and canonical modes, settings/theme/preset/import, tick/conquest behavior.
   - Flip defaults only after matrix is green.
   - Done when spec is complete and stable with no known border regressions.

### Important Remaining Interface/Type Additions
- `BorderPublishFailureReason` (enum-like union).
- `BorderPublishDiagnostics` payload (publish phase + select phase + snapshot IDs + counts).
- Separate canonical/legacy published cache structs (internal only; no new user-facing control required).

### Test Plan
- **Must-pass for Border Lock (R5):**
  - Production Mesh renders on first stable frame after map load.
  - No repeated `[DF_BORDER][MESH] no active polylines...` in healthy run.
  - No production-path alignment assertion spam.
  - No border mode cycling under zoom/pan/conquest.
- **Must-pass for final spec (R6-R7):**
  - Canonical fill/border coincidence.
  - Distinct, stable Fade Blend vs Boundary Morph behavior.
  - Legacy modes unchanged as references.

### Assumptions / Defaults
- Keep existing canonical UI controls and legacy engines as-is.
- Prioritize border visibility/stability completion (R1-R5) before fill/morph completion (R6-R7).
- Do not flip canonical production defaults until R5 gate is green.
