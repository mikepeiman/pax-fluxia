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
- Implemented `Approach A` / bet 1:
  - `pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.ts`
  - PVV4-only sample-time easing with exact endpoint preservation
- Key intended experiment order:
  1. time-profile refinement
  2. motion-isolation tightening
  3. local path shaping
  4. correspondence stabilization
  5. special-case polish
- Validation note:
  - local dependency resolution is now present, but repo validation remains noisy due unrelated failures
  - recurring `TransitionDebugPanel.svelte` import failure was fixed in `GameContainer.svelte`
  - recurrence cause: diagnostics-shell migration deleted the panel on some branch lines while older `GameContainer.svelte` consumers survived; later re-add on a separate branch masked the drift inconsistently across worktrees
  - recurring `geometryTuning.ts` named-export drift was fixed by restoring the local geometry-tuning contract expected by `GameCanvas.svelte` and the territory settings UI
  - the intended bottom-right diagnostics icon shortcut is restored by wiring `TopBar` back to `openDiagnostics()` in `GameContainer.svelte`
  - `bun run build` now succeeds end to end in this worktree
  - `bun run check` currently reports broad pre-existing type errors outside this branch scope

