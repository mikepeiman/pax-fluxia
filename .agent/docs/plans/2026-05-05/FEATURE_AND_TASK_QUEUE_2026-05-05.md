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

## Today

- Created dated session docs:
  - `.agent/docs/sessions/2026-05-05/2026-05-05_Chat.md`
  - `.agent/docs/sessions/2026-05-05/2026-05-05_Session.md`
  - `.agent/docs/sessions/2026-05-05/2026-05-05_Takeaways.md`
  - `.agent/docs/sessions/2026-05-05/2026-05-05_Decisions-and-Definitions.md`
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

## Next Most Useful Steps

1. Replace centroid-derived region IDs with graph/continuity-based identity.
2. Remove stale `pvv2:` residue from geometry/topology version strings.
3. Expand the diagnostic export pipeline to include:
   - raw frame input
   - normalized ownership snapshots
   - full transition runtime snapshot
4. Separate semantic IDs from coordinates for topology vertices and sections.
