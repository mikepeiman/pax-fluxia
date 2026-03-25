# DRY Principles

## CRITICAL: Never duplicate data or logic

**When you find yourself creating a second source of the same data, STOP and refactor.**

### Common Violations
- Two config objects with the same keys but different values (e.g. `defaultValues` + `neutralValues`)
- Repeated if/else branches for the same condition
- Copy-pasting a function with minor modifications instead of parameterizing
- Storing the same value in different formats across different locations

### Rules
1. **One source of truth** for every piece of data
2. **One code path** for every behavior — parameterize, don't duplicate
3. **Derive, don't store** — if a value can be computed from another, compute it
4. If you need the same data in two formats (e.g., decimal for logic, percentage for UI), store in **one canonical format** and convert at the boundary (display layer)

### Before Creating a New Data Structure
Ask: "Does this data already exist somewhere?" If yes, reference the existing source instead of creating a copy.
