
# Post-Mortem Process

## RULE: Conduct a post-mortem after every significant failure.

When the agent makes an error that the user has to correct — especially repeated errors, scope misses, or "declare done without verifying" failures — a post-mortem MUST be written.

### Where
- `.atlas/post-mortems/YYYY-MM-DD-<semantic-name>.md`
- Multiple post-mortems on the same day can be combined into one daily doc.

### Format
```markdown
# Post-Mortem: [Date] — [Short Title]

## What Happened
Factual description of the failure.

## Root Cause
Why it happened. Systemic, not surface-level.

## Impact
What was wasted — user time, trust, code quality.

## Corrective Actions
What was done to prevent recurrence (rules created, code standards, etc.).

## Lessons
What the agent should internalize for future work.
```

### When to Write
- When the user corrects the agent on something the agent should have caught
- When the agent declares something "done" that was not actually done
- When the same type of bug recurs after being "fixed"
- When the agent fails to follow an explicit instruction
