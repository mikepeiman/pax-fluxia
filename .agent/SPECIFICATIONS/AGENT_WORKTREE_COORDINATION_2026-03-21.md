# Agent Worktree Coordination (2026-03-21)

## Goal

Run multiple agents in parallel without branch collisions or accidental edits to
the active project.

## Standard Setup Per Agent

1. Create one branch per agent using `codex/` prefix.
2. Create one dedicated worktree per branch.
3. Keep each agent scoped to a single architecture slice.
4. Require atomic commits with clear messages.

## Command Template

```powershell
# from repo root
git worktree add -b codex/<agent-slice> "C:\path\to\<agent-worktree>" master
```

Example:

```powershell
git worktree add -b codex/territory-vfx "C:\Users\mikep\Desktop\WebDev\PRISM-territory-vfx" master
```

## Slice Ownership Matrix

- Agent A: `contracts/` and mode IDs
- Agent B: `runtime/` (`TerritoryRuntimeCoordinator`, `TerritoryWorker`, cache)
- Agent C: `layers/ownership` + `layers/geometry`
- Agent D: `layers/transition` + `layers/presentation`
- Agent E: `integration/` + `vfx/`

## Merge Discipline

1. Rebase each branch on latest `master` before merge.
2. Merge smallest, lowest-conflict slices first:
   1. Contracts
   2. Runtime shell
   3. Layer implementations
   4. Integration + VFX
3. After each merge:
   - Run `bun run check`
   - Smoke test one conquest event and one mode swap
4. If conflicts hit the same file family, pause and assign a single resolver
   agent for that family.

## Guardrails

- Do not edit files outside assigned slice unless explicitly requested.
- Keep legacy adapters quarantined under `src/lib/territory/adapters/legacy`.
- Keep canonical names in imports when both alias + legacy names exist.
- Record any rename in
  `src/lib/territory/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md`.

## Done Criteria Per Agent

- Branch has only intended files changed.
- Commits are logically grouped and reversible.
- `bun run check` output contains no new errors from that slice.
