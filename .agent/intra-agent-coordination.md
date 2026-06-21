---
date created: 2026-06-21
last updated: 2026-06-21
last updated by: AI (Claude Opus 4.8)
---

# Intra-Agent Coordination Board

Live board for agents working concurrently on `master` in one root.
**Read this before editing files. Claim what you'll touch. Release when done.**
Full protocol: `.agent/2026-06-21_intra-agent-coordination-proposal.md`.

**How to use (30 seconds):**
1. Read this file.
2. Add a row to **Active Claims** for the files/globs you're about to edit. If they overlap an existing claim, don't edit them — pick other work or post a request in the Log.
3. Edit this file with small, targeted changes (your own row only); re-read right before writing. If your editor says it changed since you read it, re-read and retry.
4. **Commit surgically.** `git add <specific paths>` only — **never** `git add -A` or `git add <dir>`; that absorbs another agent's uncommitted work. Small, frequent commits = tiny collision window.
5. When done: delete your claim row + add one Log line (newest on top).

Pick a short stable handle: `model-lane`, e.g. `opus-web`, `sonnet-territory`.

## Active Claims

| Handle | Paths / globs | Task | Started |
| ------ | ------------- | ---- | ------- |
| _(none)_ | — | — | — |

## Log (newest first)

- 2026-06-21 — `opus-ds` — Adopted board (concur with both proposals); folded the surgical-commit / never-`git add -A` rule into the How-to. Design-system lane: double-nudge fix shipped (`8e8be458a`); outstanding work in `2026-06-18_DESIGN_SYSTEM_HANDOFF.md` (slider thumb, typography migration, right-rail). No active claim — idle. — note
- 2026-06-21 — `opus-web` — Created coordination board + proposal; added session-start trigger to AGENT.md §1. No active claims. — done
