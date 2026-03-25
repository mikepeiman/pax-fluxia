# Exhaustive Reference Cleanup

## CRITICAL RULE: When renaming, removing, or replacing any variable, function, import, or type:

**You MUST search the ENTIRE codebase for ALL references and resolve them in a single pass.**

### When This Applies
- Removing an import (e.g., `gameStore` from a file)
- Renaming a variable or function
- Replacing one API with another (e.g., `gameStore.x` → `activeGameStore.x`)
- Deleting a function or type that others depend on

### Process
1. **Before making the change**, search for ALL usages across the affected file(s)
2. Use `Select-String` or `grep_search` to find every occurrence
3. **Fix ALL occurrences in one edit**, not incrementally
4. **Verify** no references remain after the edit

### Anti-Pattern
```
❌ Fix one reference → user finds another → fix that → user finds another
```

### Correct Pattern
```
✅ Search all references → fix ALL at once → verify zero remain
```

This rule exists because partial cleanup causes runtime crashes that the user must discover manually.
