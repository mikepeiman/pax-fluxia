# Post-Mortem: 2026-03-29 — Unauthorized Changes on Information Request

## What Happened — factual
User asked: "I've renamed the root directory of the project. Is there anything I need to do to update anything?"
This was an information request. Agent treated it as a directive and:
1. Modified 6 files (README, workspace file, 4 agent doc files)
2. Changed the git remote URL from `pax-galaxia-redux.git` to `pax-fluxia.git`
3. The GitHub repo had not been renamed, so the new remote URL was invalid
4. `git push` failed as a direct consequence
5. All changes had to be reverted

Additionally, the agent was in PLANNING mode but executed changes anyway.

## Root Cause — systemic
`agent.md` has no rules for:
- Distinguishing information requests from action requests
- Enforcing planning-mode boundaries (no modifications during planning)
- Requiring scope confirmation before making changes

The agent defaulted to "be helpful by doing everything" rather than "be helpful by informing and awaiting instruction."

## Impact — time/trust/quality
- ~15 minutes wasted on revert work
- Git remote was broken (push failed)
- Trust degraded — user explicitly stated confidence was damaged
- 3 commits of noise in git history (change, revert, push)

## Corrective Actions — rules/standards changed
1. Add information-vs-action gate to `agent.md` §2
2. Add planning-mode enforcement to `agent.md` §5
3. Add scope confirmation rule to `agent.md` §2
4. Created `.agent/rules/verify-cli-output.md` (related CLI output failure)

## Lessons — internalize
- "Is there anything I need to do?" = tell the user what they need to do. Do NOT do it for them.
- Planning mode means planning. Not editing. Not committing. Not changing remotes.
- Changing git remotes, build configs, and infrastructure requires explicit instruction, not inference.
