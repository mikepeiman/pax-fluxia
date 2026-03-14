# Territory Recovery Mesh Exposure + Perf Hotfix Note (2026-03-08)

## User-reported symptoms
- Borders appear clean only momentarily, then look jagged during most frames.
- Perf trace shows heavy GPU program/shader overhead (`getProgramParameter`, `generateProgram`).

## Root causes addressed
1. **Mesh overwrite path during morph**
- In `renderMeshBorderOverlay`, fallback logic was active whenever morph was active and a record lacked morph source.
- In non-canonical legacy-driven mesh mode, this caused mesh visibility to be replaced by fallback vector graphics for many frames.

2. **Shader program churn**
- `createStrokeMeshShader(...)` compiled the GL program repeatedly through `compileHighShaderGlProgram(...)`.
- This can trigger expensive shader/program work in-frame.

## Fixes
1. **Expose mesh as authoritative in normal path**
- Morph fallback is now gated to canonical mode only:
  - `enableMorphFallback = useCanonical && morphActive`
- Mesh visibility no longer gets globally replaced in legacy mesh mode.

2. **Cache stroke mesh GL program**
- Added cached program singleton in `strokeMeshBorders.ts`:
  - `cachedStrokeMeshGlProgram`
  - `getStrokeMeshGlProgram()`
- `createStrokeMeshShader(...)` now reuses cached program instead of recompiling.

## Expected effect
- Borders should remain on the mesh path instead of being repeatedly overwritten by jagged fallback during normal play.
- Reduced shader compilation churn and better frame stability.

## Follow-up
- If jaggedness still dominates after this, next step is canonical frontier production routing (not legacy polyline source), because legacy lattice centerlines are inherently staircase.
