# Territory Engine Glossary And Mental Model

## Core Terms

| Term | Meaning |
|---|---|
| Frontier | The shared boundary between two neighboring players’ territories |
| Holding | One connected owned territory component for one player |
| Component | A connected region in the ownership partition; in gameplay language, a holding |
| Backend | The execution/runtime surface that consumes territory artifacts and renders them |
| Route | The fully resolved live path: mode + chosen method(s) + backend |
| Static mode | A route that resolves only the settled frontier geometry |
| Dynamic mode | A route that resolves update behavior across change and pins its own static anchor |
| Hybrid mode | A route that chooses both a static and dynamic leg together |
| Artifact | Any structured output of a territory pipeline stage |
| Trace mode | A mode that publishes stage artifacts and summaries for inspection |
| Step mode | A mode that advances the territory pipeline one stage at a time |

## Territory Truth Terms

| Term | Planning Use |
|---|---|
| Canonical geometry | The one shared geometry source that both fills and borders must use |
| Ownership partition | The full division of the map into player-owned regions with no gaps |
| Enclave | One player’s holding surrounded by other players’ territory |
| Cutout | A render-time negative space operation used to display an enclosed neighboring region correctly |
| Loop | A closed contour extracted from geometry or face walking |
| Holding identity | The stable tracking of one connected owned region across updates |

## Method Families

| Family | Meaning |
|---|---|
| `FG*` | Static frontier-generation methods |
| `DY*` | Dynamic update methods |
| `HY*` | Hybrid orchestration plans |

## Backends

| Backend | Meaning |
|---|---|
| `PVV2` | Maintained backend and comparator runtime |
| `PVV3` | Maintained active runtime/backend and frontier-first renderer host |
| `DF` | Maintained field-oriented backend and comparator runtime |

## Mental Model

The territory engine should be understood as a pipeline:

1. Compute the ownership metric.
2. Extend or clip it to the world boundary.
3. Generate seeds or equivalent boundary hints.
4. Build topology.
5. Convert topology into geometry.
6. Publish loops or holdings.
7. Build animation state if needed.
8. Render the result in a backend.

The method families answer different questions:

- `FG*`: what should the settled geometry be?
- `DY*`: how should it change over time?
- `HY*`: how should a static and dynamic strategy be paired?

The backends answer a separate question:

- how does the system draw and inspect the result?

## Terminology Rules For This Bundle

- Prefer `holding` over `shell` when discussing gameplay territory.
- Keep `shell` only when describing current code symbols or render-specific contour structures.
- Do not treat `hole` as gameplay truth. In gameplay terms, it is simply another player’s territory inside the partition.
- Use `TerritoryBackendId` in planning language, even though current code still says `TerritoryLegacyAdapterId`.
