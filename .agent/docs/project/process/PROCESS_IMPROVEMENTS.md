# Human-Agent Process Improvements

**Created**: 2026-03-01
**Purpose**: Track improvements to the human-agent collaboration workflow.

---

## PI-1: Git Commit Discipline (2026-03-01)

**Problem**: Agent completed 4 items without committing. User had to flag the issue.
**Root cause**: No commit trigger after each completed feature/fix.
**Fix**: Commit after every completed item, not at end of sprint.
**Rule**: `git ac "message"` followed by `git push origin master` after every code change.

## PI-2: Archive Review Audit (2026-03-01)

**Problem**: Critical always-on rules (`git-version-control`, `no-console-log`, `never-remove-user-controls`) were in `_archive_rules/` instead of active `rules/`.
**Root cause**: Previous session archived them incorrectly or an archive purge was overzealous.
**Fix**: Restored 4 rules to active. Created this process doc to track such issues.
**Recommendation**: Archive should only contain rules that are explicitly disabled by user, not "always_on" rules.

## PI-3: Documentation as Continuous Activity (2026-03-01)

**Problem**: Agent was not maintaining SESSION, CHAT, and FEATURE docs during work.
**Root cause**: Documentation treated as post-task activity instead of continuous activity.
**Fix**: User established 4 mandatory docs to maintain:
1. `SESSION_YYYY-MM-DD.md` — all work items and commits
2. `FEATURE_IDEAS.md` — all feature/roadmap ideas
3. `CHAT_YYYY-MM-DD.md` — dialogue summary
4. `PROCESS_IMPROVEMENTS.md` — this doc (human-agent workflow improvements)

## PI-4: Red-Team Proposals Before Implementation (2026-03-01)

**Problem**: Agent proposed 3 options for F-107 map rotation. User rejected all 3 and proposed a better approach.
**Root cause**: Agent didn't consider the user's domain expertise in the option space.
**Fix**: When user proposes an approach, red-team it honestly rather than replacing it with agent-generated alternatives. User ideas often contain domain insight the agent lacks.
**Good pattern**: "Here's what works about your idea, here's what might break, here's a refinement."

---
