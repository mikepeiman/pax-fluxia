

# Multiple Hypotheses Rule

## CRITICAL: Always consider multiple explanations before committing to one.

When investigating a bug or unexpected behavior:

1. **List at least 3 possible causes** before picking one
2. **Rank them by likelihood** based on evidence, not assumption
3. **Verify the most likely cause FIRST** — don't assume and move on
4. **Never say "this means X"** — say "this could be X, but also Y or Z"

### Bad Pattern
```
"The discrepancy means ships were added between ticks."
```

### Good Pattern
```
"Three possible causes, ranked:
1. Log presentation math is wrong (most code paths, most fragile)
2. Combat mechanics calculation error (arithmetic bug)
3. Unexpected reinforcements arriving (engine tick order)
Let me verify #1 first."
```

This applies to ALL debugging, not just combat logs.
