

# Complete Lossless Chat Documentation

## MANDATORY: Every chat session MUST be documented in a daily session file.

**File**: `.agent/WIP Work-In-Progress/SESSION_YYYY-MM-DD.md`

## What to Document

Every session file must capture ALL of the following, with NO information loss:

| Category | What to Capture |
|----------|-----------------|
| User requests | Exact requests, in the user's words |
| Design discussions | Ideas explored, options considered, rationale for choices |
| Architecture decisions | What approach was chosen and WHY |
| Bugs found | Symptoms, root cause, fix applied |
| Commits made | Hash, message, what changed |
| Reverts/rollbacks | What was reverted, why, what was lost |
| Feature progress | What was started, completed, or blocked |
| Config changes | Any new GAME_CONFIG values, defaults, ranges |
| UI changes | New controls, layout changes, toggle behavior |
| Unresolved items | Carry-forward bugs, open questions, next steps |

## When to Document

- **At session start**: Create the file with date and initial context
- **During work**: Append key decisions and changes as they happen
- **Before commits**: Note what's being committed and why
- **At session end**: Summarize status, blockers, and next steps

## Format

```markdown
# Session YYYY-MM-DD

## Context
[What we started with, what the user wanted to work on]

## Work Log
### [Timestamp or Sequence]
- **User Request**: [exact words]
- **Action Taken**: [what was done]
- **Result**: [outcome]
- **Commit**: `hash` — message

## Decisions Made
- [Decision]: [Rationale]

## Carry-Forward
- [ ] Unresolved item 1
- [ ] Unresolved item 2
```

## Failure Mode

If a user's idea, request, or design discussion is NOT captured in the session file, the documentation protocol has FAILED. Context loss across sessions is unacceptable — it forces the user to repeat themselves and wastes their time.

