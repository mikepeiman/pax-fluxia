---
description: Worktree branch protocol for branch setup, live handoff logging, and commit/push discipline
trigger: always_on
---

# Worktree Protocols

## Purpose

When operating in a dedicated worktree, keep the branch shippable, handoff-ready, and resumable without rereading the full chat.

## Immediate Requirements

At the start of work on a dedicated worktree or detached checkout:

1. Attach the worktree to a named branch immediately.
2. Create a tracked handoff document under:
   - `.agent/docs/project/process/worktree-handoffs/`
3. Use a filename that includes the date and branch focus.
4. Start the handoff document with an `Inception Summary` section that contains:
   - the initial user prompt
   - the stated focus of the branch
   - the worktree path
   - the branch name
   - the starting repo/worktree state

## Handoff Document Requirements

The handoff document is a live operational log, not a retrospective summary.

It must be updated with every concrete action that changes understanding, files, git state, validation status, or next steps.

Every action entry must state:

- what was done
- exact files or paths involved
- why it was done
- what purpose it serves for the branch goal
- what was learned or changed
- what validation was performed, or what remains unverified

## Documentation Rules

- Keep tracked documentation current as the work evolves.
- Do not use gitignored `sessions/` paths as the canonical reference from tracked docs.
- If a local session note is useful but ignored, mirror the durable facts into a tracked document.
- Keep the current day's queue updated with:
  - active goal
  - current branch
  - canonical handoff document path
  - current best hypothesis / next experiment

## Git Discipline

- If a chat exchange results in code or documentation changes, commit before ending the turn.
- Push the active branch after each commit.
- Record each commit in the handoff document with:
  - commit hash
  - commit message
  - push status
  - purpose of that checkpoint

## Branch Focus Discipline

- The handoff document must always state the current branch focus in plain language.
- If the focus changes, add a dated scope-change entry explaining:
  - the old focus
  - the new focus
  - why the change was necessary

## Experiment Discipline

For experimental visual or performance work:

- isolate one meaningful bet at a time
- record the hypothesis before or with the implementation
- record whether the result was a keep, revert, or unresolved outcome
- record the exact cases or scenarios used to judge the bet

## Handoff Standard

At any point, another agent should be able to open the handoff document and know:

- what the branch is for
- what has already been tried
- what files matter
- what changed and why
- what remains risky
- what should happen next
