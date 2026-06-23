---
date created: 2026-06-21
last updated: 2026-06-21
last updated by: AI (Claude Opus 4.8)
relevant prior docs: .agent/docs/_review-reconcile/AGENT_WORKTREE_COORDINATION_2026-03-21.md; .agent/MULTI_LANE_WORKTREE_GUIDE.md
superseding docs: —
---

# Proposal: Single-File Intra-Agent Coordination

**Context.** All agents now work on `master` in one project root (separate branches/worktrees retired — found inefficient). The live risk is collision: two agents editing the same files at once, duplicating work, or clobbering each other. The fix is one shared board everyone reads before touching files.

**Mechanism — one file: `.agent/intra-agent-coordination.md`. Two sections:**
- **Active Claims** — a small table of who is editing what *right now*: `handle · paths/globs · task · started`. A claim is a soft lock.
- **Log** — append-only, newest on top. One line per finished unit of work, handoff, request, or blocker.

**Protocol — 6 rules:**
1. **Read first.** At session start, and again before editing any file, read the board.
2. **Claim before you edit.** Add a row to Active Claims (handle, the paths/globs you'll touch, one-line task). If your paths overlap an existing claim, do **not** edit them — pick other work, or post a request in the Log and wait for release.
3. **Write small, re-read first.** Add/remove only your own row; re-read immediately before writing. If your editor reports the file changed since you read it (Claude Code's `Edit` does this automatically), re-read and retry — that stale-read check is the concurrency guard.
4. **Commit by explicit pathspec — the git index is SHARED.** Staging is not per-agent: `git add` then a bare `git commit` can sweep your staged files into another agent's commit (or theirs into yours — observed live on 2026-06-21). Commit atomically with `git commit -- <your exact paths>` (stage any *new* files first, then `git commit -- <paths>`). **Never** `git add -A`, `git add <dir>`, or `git commit -a`. Small, frequent commits keep the collision window tiny. **Always `git push` to `origin/master` immediately after committing** — every commit goes to the remote; never leave local-only commits (never push to `live`).
5. **Release when done.** Delete your claim row and add a one-line Log entry.
6. **Keep it terse and current.** Claims = live intent only; clear stale claims (finished or abandoned) freely. Detail belongs in session docs, not here.

**Handles.** Use a short, stable id: model + lane, e.g. `opus-web`, `sonnet-territory`, or whatever the user assigns.

**Why this works.** Single human-readable source, zero tooling. Overlap is visible *before* damage. The "file changed since read" check turns ordinary edits into optimistic locks. Supersedes the worktree model in `AGENT_WORKTREE_COORDINATION_2026-03-21.md`.

**Trigger.** One line added to `AGENT.md §1` directs every agent to read + claim on the board at session start. Without that pointer the board is inert; with it, coordination is automatic.

**Limits (honest).** This prevents *file* collisions and duplicated effort; it is not transactional and will not stop two agents who ignore the board. It assumes agents claim narrowly and release promptly.
