# Repo Multi-Agent Concurrency Protocol

## Purpose

This protocol defines how multiple agents should work concurrently in the `PRISM-Atlas-DART v1` repository without clobbering each other's branches, working trees, artifacts, or integration notes.

The main failure mode to avoid is simple: **multiple agents using the same checkout directory**. In this repo, that causes branch switches, auto-stash churn, conflicted `.atlas` docs, and ambiguous session history.

## Non-Negotiable Rules

1. One agent, one worktree, one branch.
2. Never switch branches inside a checkout another agent may be using.
3. Never rely on auto-stash as a coordination mechanism.
4. Do not concurrently edit shared tracker files unless you are the designated integrator.
5. If the worktree branch changes unexpectedly, stop and inspect before doing more git operations.

## Required Topology

Use a single base repo plus separate sibling worktrees.

Example:

```powershell
git -C "C:\Users\mikep\Desktop\WebDev\PRISM-Atlas-DART v1" worktree add "..\PRISM-codex-fg2" codex/territory-engine-epic-fg2-face-walk
git -C "C:\Users\mikep\Desktop\WebDev\PRISM-Atlas-DART v1" worktree add "..\PRISM-agent-pvv3" agent/antigravity/2026-03-12-pvv3-smoothing
```

Each agent session must then use its own worktree path as its `cwd`.

## Branch Rules

- Use one branch per agent per epic slice.
- Branch names should encode both the actor and the task.
- Do not share a live feature branch across agents.

Examples:
- `codex/territory-engine-epic-fg2-face-walk`
- `codex/territory-engine-epic-hy1-delta-core`
- `agent/antigravity/2026-03-12-pvv3-smoothing`

## Ownership Model

Split concurrent work by subsystem, not by arbitrary file grabs.

Recommended decomposition for this repo:
- Agent A: `pax-fluxia/src/lib/territory-engine/` frontier geometry and canonical topology
- Agent B: `pax-fluxia/src/lib/renderers/` renderer adapters, smoothing, transitions, PIXI output
- Agent C: settings panels, diagnostics UI, interactive step mode, trace views
- Agent D: benchmark harnesses, map stress fixtures, validation scripts, perf instrumentation
- Agent E: server/shared contracts only if a feature actually crosses client/server boundaries

Avoid assigning two agents to the same subsystem at the same time unless one is review-only.

## Shared Files That Must Not Be Edited Concurrently

These files are conflict magnets and should have a single designated writer at a time:
- `.atlas/DECISIONS.md`
- `.atlas/FEATURE_STATUS.md`
- `.atlas/MECHANICS.md`
- `.agent/WIP Work-In-Progress/SESSION_YYYY-MM-DD.md`
- `.agent/WIP Work-In-Progress/CHAT_YYYY-MM-DD.md`
- `.agent/AGENT.md`

## Documentation Protocol

### Per-agent working notes
Each agent writes to its own files only.

Recommended locations:
- `.agent/WIP Work-In-Progress/agents/<agent-id>/SESSION_<date>.md`
- `.agent/WIP Work-In-Progress/permanent-references/<domain>/<agent-id>_<topic>_<date>.md`

Examples:
- `.agent/WIP Work-In-Progress/agents/codex/SESSION_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/codex_fg2_face_walk_2026-03-12.md`

### Shared canon updates
Only the designated integrator updates:
- `.atlas/DECISIONS.md`
- `.atlas/FEATURE_STATUS.md`
- `.atlas/MECHANICS.md`

This should happen after a branch slice is reviewed or integrated, not during parallel feature work.

## Integration Model

Use one integration branch or one designated integrator agent.

Suggested flow:
1. Each agent commits self-contained checkpoints on its own branch.
2. The integrator reviews the branch or cherry-picks the commit set.
3. The integrator updates shared `.atlas` docs in one pass.
4. Targeted checks run on the integrated result.
5. Only then does the result move toward `master`.

Preferred integration branch examples:
- `codex/territory-engine-integration`
- `codex/pvv3-integration`

## Commit Discipline

Each agent should commit small slices with messages that describe the architectural unit landed.

Examples:
- `FG2 epic step 3: add junction and boundary anchor closure`
- `FG2 epic step 4: scaffold half-edge loop walks`
- `PVV3 smoothing step 2: stabilize shared-boundary transition state`

Do not accumulate large uncommitted sessions if another agent is active in the repo.

## Conflict Prevention Rules

1. Never start a new agent in the same checkout path as another active agent.
2. Before doing any git work, inspect `git status --short --branch`.
3. If the reported branch is not the branch you expect, stop immediately.
4. If a stash appears unexpectedly, record its exact name before any recovery action.
5. Do not `reset --hard`, `checkout --`, or blindly `stash pop` in a shared repo.

## Recovery Protocol

If an agent detects unexpected branch movement, merge state, or stash churn:

1. Run `git status --short --branch`.
2. Run `git stash list -n 5`.
3. Record the current branch, HEAD, and stash names in a note.
4. Stop further git mutations unless you are explicitly performing recovery.
5. Recover work selectively onto the correct branch or worktree.

## Tooling Guidance

For Codex-style agents in this repo:
- Use `atlas-harness` for file/process/git operations when available.
- Fail fast if the MCP server is unavailable and the task depends on it.
- Prefer repo-local process commands with explicit `git -C <repo>` calls when branch state must be unambiguous.

## Minimum Startup Checklist For Every Agent

Before substantive work begins:
1. Confirm the worktree path.
2. Confirm the current branch.
3. Confirm no unexpected stash or merge state.
4. Confirm the subsystem ownership for this session.
5. Confirm where this agent's session and permanent-reference artifacts will be written.

## Recommended Immediate Adoption For This Repo

1. Stop sharing `C:\Users\mikep\Desktop\WebDev\PRISM-Atlas-DART v1` as the live working directory for multiple agents.
2. Create separate sibling worktrees per active branch.
3. Move per-agent session logs out of the shared single daily file pattern.
4. Reserve `.atlas` updates for integration passes only.
5. Keep one human or one agent responsible for integration.

## Short Version

- Separate worktree per agent
- Separate branch per agent
- Separate artifact files per agent
- Single integrator for shared docs
- No branch switching inside shared checkouts
