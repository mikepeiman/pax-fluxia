---
trigger: always_on
description: Mandatory session documentation and chat logging rules
globs: "**/*.md"
---

# Session Memory Rules

## Rule 1: Daily Session Notes

**File:** `.agent/WIP Work-In-Progress/SESSION_YYYY-MM-DD.md`

### Creation
- Create at **session start**, not session end
- Date = today's date (from system clock)

### During Work — Append Immediately
After every completed task (commit, fix, feature, refactor), append a summary to the session doc **before moving to the next task**. Include:
- Commit hash + one-line description
- Root cause (for fixes) or design rationale (for features)
- Key files modified, LOC ranges, and key functi9on/variable names touched or changed
- Any deferred work


### Structure
```markdown
# Session YYYY-MM-DD

## Focus: [main themes]

### Commits
| Hash | Description |
|------|-------------|
| `abc1234` | description |

### 1. [Task Name]
2-4 line summary: what, why, how.
Key files: list of modified files.

### Deferred Work
- Items noted but not started
```

### End of Session
- Verify all commits from `git log --oneline --after="YYYY-MM-DDT00:00:00" --before="YYYY-MM-DDT23:59:59"` are reflected
- Fill any gaps

## Rule 2: Daily Chat Log

**File:** `.agent/WIP Work-In-Progress/CHAT_YYYY-MM-DD.md`

### Purpose
Lossless record of every user prompt, preserving intent and context.

### Rules
- **Create at session start** alongside the session notes
- **Every single user prompt** is captured verbatim — no paraphrasing, no summarizing
- **Pasted logs/errors**: truncate to essential lines only. Format:
  ```
  > [USER pasted terminal output — truncated]
  > Key error: `<the actual error message>`
  > Reference: `<file:line>` 
  ```
- **User ideas/brainstorms**: capture with full fidelity, tag with `#idea`
- Prefix each entry with timestamp: `## HH:MM`
- Agent responses are NOT logged (they're in conversation history)