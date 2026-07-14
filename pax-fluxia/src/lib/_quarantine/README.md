# _quarantine — retired territory render code (cleanup campaign Stage 3C, 2026-07-13)

Legacy render-mode code, physically severed from the live game. Excluded from
`tsconfig.json` and from vitest (`vite.config.js` test.exclude), and referenced by
NO kept file — so it is neither type-checked, bundled, nor tested. Kept here (not
deleted) until the IP-absorption list in
`.agent/docs/plans/2026-07-13/2026-07-13_RENDER_MODE_VALUE_INVENTORY.md` is confirmed
done, then removed in one commit (git history is the permanent archive).

Contents: orchestrator (DY4/engine, incl. fg2SeedGraph), runtime, engine, render,
legacy (TerritoryLegacyBridge), integration bridges, the legacy renderers
(PowerVoronoi/PVV3/DY4/DistanceField/Modified/Voronoi/Pixel/Lane/Contour/Graph/
RefactoredPVV2 + workers), families-metaball (family/scene/transitions; the shared
metaballSceneBase + config stayed), OptimalTransportBorderTransition, and the
territory_engine trace diagnostics component.

DEFERRED (still in the live tree, dead but compiling): families/perimeterField +
its GameCanvas debug subsystem; the plain families/cellGrid/CellGridFamily (shares
the kept cellGrid infrastructure). See the master plan Stage 3C log.
