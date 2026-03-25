# Territory Architecture Documentation Set

## Files

- **MASTER_TERRITORY_ARCHITECTURE.md** – Canonical invariants, core responsibility map, implementation order. Start here.
- **COMPILER_CONTRACTS.md** – Data structures, stage guarantees, type definitions for the compile layer.
- **RENDER_AND_TRANSITIONS.md** – Renderer contract, cache builders, border families, transition rules.
- **LEGACY_QUARANTINE.md** – Historical patterns, rejected approaches, migration boundaries. Reference only when needed.

## For implementation AI agents

1. Open MASTER_TERRITORY_ARCHITECTURE.md first and reference it throughout.
2. When implementing a specific layer (compiler, render, transitions), consult the corresponding companion doc.
3. Do not reference LEGACY_QUARANTINE.md unless explicitly handling legacy code or understanding why patterns were rejected.
4. All implementation decisions should be justified by reference to MASTER_TERRITORY_ARCHITECTURE.md.
