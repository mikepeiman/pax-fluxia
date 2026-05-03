# Feature And Task Queue - 2026-05-03

## Active

- PVV4 transition improvement planning:
  - user reports the mode is already close to acceptable
  - objective is visual/performance polish, not plan purity
  - use isolated experiment bets, not additive unsystematic tweaks
- Worktree status:
  - worktree: `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia`
  - branch: `codex/render-infra/pvv4-transition-bets`
  - canonical tracked handoff:
    - `.agent/docs/project/process/worktree-handoffs/2026-05-03_pvv4-transition-bets_handoff.md`

## Today

- Added worktree rule:
  - `.agent/rules/worktree-protocols.md`
- Started tracked handoff:
  - `.agent/docs/project/process/worktree-handoffs/2026-05-03_pvv4-transition-bets_handoff.md`
- Added prerequisite PVV4 runtime-compatibility shim:
  - `pax-fluxia/src/lib/territory/layers/geometry/registry.ts`
  - `pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.ts`
- Key intended experiment order:
  1. time-profile refinement
  2. motion-isolation tightening
  3. local path shaping
  4. correspondence stabilization
  5. special-case polish
- Validation note:
  - normal `bun run build` / `bunx vite build` / `bunx svelte-check` are currently blocked by missing local install/generated state in this worktree
