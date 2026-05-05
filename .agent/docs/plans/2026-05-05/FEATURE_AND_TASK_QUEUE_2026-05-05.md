# Feature And Task Queue - 2026-05-05

## Active

- Branch:
  - `codex/render-infra/pvv4-transition-bets`
- Worktree:
  - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia`
- Canonical tracked handoff:
  - `.agent/docs/project/process/worktree-handoffs/2026-05-03_pvv4-transition-bets_handoff.md`
- Active goal:
  - document the architecture/data-shape dialogue losslessly
  - convert the dialogue into durable decisions and corrected definitions
  - identify the root semantic failures currently undermining PVV4 continuity and diagnostics
  - replace the ad hoc branch-bet framing with a versioned territory-runtime recovery plan

## Today

- Created dated session docs:
  - `.agent/docs/sessions/2026-05-05/2026-05-05_Chat.md`
  - `.agent/docs/sessions/2026-05-05/2026-05-05_Session.md`
  - `.agent/docs/sessions/2026-05-05/2026-05-05_Takeaways.md`
  - `.agent/docs/sessions/2026-05-05/2026-05-05_Decisions-and-Definitions.md`
- Created versioned plan doc:
  - `.agent/docs/sessions/2026-05-05/2026-05-05_territory-runtime-recovery-plan_v1.md`
- Created revised versioned plan doc:
  - `.agent/docs/sessions/2026-05-05/2026-05-05_territory-runtime-recovery-plan_v2.md`
- Created clarified versioned plan doc:
  - `.agent/docs/sessions/2026-05-05/2026-05-05_territory-runtime-recovery-plan_v3.md`
- Session docs are now intended to be tracked directly in `.agent/docs/sessions/`.
- Scope of the logged dialogue:
  - ownership -> geometry -> topology -> transition data-shape trace
  - PVV4 vs phase/perimeter family architecture
  - exported diagnostic artifact semantics
  - region-ID / topology-ID / stale-version naming failures
- Confirmed by code trace:
  - vector geometry region IDs are still centroid-derived:
    - `region:${ownerId}:${roundedCentroid}`
    - file:
      - `pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts`
  - geometry/topology versions still carry stale `pvv2:` fingerprint residue:
    - files:
      - `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts`
      - `pax-fluxia/src/lib/territory/layers/geometry/planners/GeometryFingerprint.ts`
      - `pax-fluxia/src/lib/territory/compiler/buildFrontierTopology.ts`
  - topology identity is still coordinate-composite:
    - vertex IDs are coordinate strings
    - section IDs are coordinate-composite strings
  - transition recorder/export begins after raw gameplay graph normalization:
    - files:
      - `pax-fluxia/src/lib/territory/devtools/TransitionSnapshotRecorder.ts`
      - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts`
  - field families still bypass shared truth:
    - `GameCanvas` builds a thin ownership snapshot
    - `contestedLaneIds` is hard-coded to `[]`
    - family-local PREV reconstruction remains in the phase-field path
  - live PVV4 still treats `fillFrame` as the real moving payload while leaving `borderFrame` empty

## Current Best Read

- The live region-ID scheme is structurally wrong for continuity:
  - centroid-based identity guarantees churn during ordinary conquest geometry changes
- The live version/fingerprint naming still carries obsolete `pvv2:` residue:
  - semantically wrong
  - misleading in diagnostics
- Export artifacts are not yet sufficient to explain one conquest from raw source frame to rendered transition:
  - raw `stars[]`
  - raw `lanes[]`
  - raw frame input
  - full ownership snapshots
  - full transition snapshot
  are missing from the exported package
- `virtualStars` are not a valid shared PV transition primitive and should be removed from the shared transition contract
- whole-region birth is invalid, and region collapse is only legitimate when the final star set of a region disappears on that tick
- existing topology sections between 3-way/world-edge junctions are likely the correct coarse structural unit for transition planning
- DX should likely evolve from midpoint-oriented virtual-site nudging into an explicit disconnect-zone construct
- the recovery plan needed stronger implementation gating and clearer shared-truth definitions, so `v3` now adds:
  - locked conquest casebook before motion work
  - precise foundational-section definition
  - first deterministic eligible-frontier-envelope rule
  - explicit DX zone descriptor

## Next Most Useful Steps

1. Sweep semantic debt on active paths:
   - centroid region IDs
   - `pvv2:` residue
   - misleading tuning names
   - misleading diagnostics names
2. Expand the diagnostic export pipeline to include:
   - raw frame input
   - normalized ownership snapshots
   - full transition runtime snapshot
3. Move field families onto the shared ownership/geometry/transition truth pipeline.
4. Rebuild PV transition logic around explicit stable anchors, explicit change anchors, explicit split planning, and truthful `borderFrame`.
5. Separate semantic IDs from coordinates for topology vertices and sections.
6. Add real per-section/per-point star influence attribution so conquest-local active-front bounds can be selected deterministically.
7. Replace heuristic-only DX with an explicit disconnect-zone model after shared truth is unified.
8. Do not begin runtime motion changes until the conquest casebook and end-to-end truth exports are in place.
9. Normalize geometry constraints and tuning before more PV transition tuning:
   - separate `starWeight` from `MSR`
   - separate `LP` from `CX`
   - move `DX` to explicit zone truth
10. Add diagnostics freeze-on-unclassified mode so classification holes stop silently degrading into snap.

## Latest Update

- Created:
  - `.agent/docs/sessions/2026-05-05/2026-05-05_territory-runtime-recovery-plan_v4.md`
- `v4` adds:
  - explicit shared definitions for:
    - `starWeight`
    - `MSR`
    - `CX`
    - `LP`
    - `DX`
  - a diagnostics mode that freezes on unclassified foundational sections
- Latest code-trace confirmation:
  - `MSR` is still only partially represented as a site-weight proxy
  - `starWeight` and `MSR` are still semantically conflated
  - contested-lane pair logic is still mixed under `CX` naming
  - `DX` is still only a virtual-site heuristic
  - PV transition still lacks a freeze-on-unclassified diagnostics trap
