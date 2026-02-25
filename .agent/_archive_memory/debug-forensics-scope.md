# Debug Forensics Scope

## CRITICAL: Never limit bug investigation to the most recent commit

When a user reports a bug or regression:

1. **Do NOT assume** the issue was caused by the most recent commit
2. **The user does NOT exhaustively check every feature** after every change
3. **Bugs may have been introduced many iterations ago** and only noticed now
4. **Use `git log` and `git bisect`** to trace when a function/behavior last changed
5. **Compare against known-good commits**, not just the diff from last commit

## Forensic Investigation Order

1. Check `git log --oneline -20` for recent history
2. Use `git log -p --follow -- <file>` to trace changes to the affected file
3. Compare the function/block across multiple commits, not just HEAD vs HEAD~1
4. If the user says "this used to work", find the last commit where it worked

## Anti-Pattern

```
USER: "Feature X is broken"
AGENT: "I didn't touch that file in my last commit, so it can't be from me"
```

This is WRONG. The user may not have noticed until now. Investigate broadly.
