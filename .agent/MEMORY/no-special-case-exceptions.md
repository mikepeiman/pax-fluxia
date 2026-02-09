# Avoid Special-Case Exceptions in Code

## CRITICAL: Code with special cases is a code smell

**When you find yourself writing `if (key === "SOMETHING_SPECIAL")` inside a generic loop, STOP and redesign.**

### Why This Matters
Special-case branches:
- Break the uniformity of data structures
- Create hidden coupling between the handler and specific keys
- Make the code fragile — adding a new key may require another exception
- Signal that your data model has inconsistent units or formats

### Rules
1. **Uniform data formats**: All values in a config object should use the same unit conventions. Don't mix percentages (25) with decimals (0.25) in the same map.
2. **Convert at boundaries**: If the UI needs percentages but logic needs decimals, store as decimal and multiply by 100 only in the display layer.
3. **If an exception exists, question the data model**: The exception usually means the data structure is wrong, not that the handler needs a special case.

### Anti-Pattern
```typescript
// BAD: special-case exception inside generic loop
values.forEach(([key, val]) => {
    if (key === "TRANSFER_RATE") {
        CONFIG[key] = val / 100;  // Why is this one different?
    } else {
        CONFIG[key] = val;
    }
});
```

### Correct Pattern
```typescript
// GOOD: uniform data, no exceptions needed
// All values stored in canonical format (decimals)
values.forEach(([key, val]) => {
    CONFIG[key] = val;
});

// UI layer handles display conversion
displayValue = storedValue * 100; // decimal → percentage for display only
```
