# Semantic Renaming Policy

## Principle: Projects Evolve, Terminology Must Evolve With Them

As projects develop, concepts, intentions, and purposes evolve. What was once called "flow" might become "transfer". What was "controls" might really be a "tuning panel". **Terminology must stay aligned with reality.**

## When to Rename

Propose or execute renaming whenever:

### 1. **Semantic Mismatch Identified**
- A variable/component name no longer accurately describes what it does
- User terminology differs from code terminology
- Example: `FLOW_PERCENTAGE` → `TRANSFER_RATE` when "flow" concept evolved into "transfer"

### 2. **Terminology Change Provided**
- User explicitly states new preferred terminology
- Example: User says "Call it Control Panel, not Tuning Panel"
- **Adopt user's terminology as the source of truth**

### 3. **Source of Confusion Identified**
- A naming conflict causes bugs or developer confusion
- Multiple things with similar names serve different purposes
- Example: Element class `controls-wrapper` vs user's term "Control Panel" causing confusion about which UI element is being discussed

### 4. **Synthesis or Divergence of Concepts**
- Two concepts merge → rename to unified term
- One concept splits → rename to distinguish
- Example: Combat mechanics and AI behavior were once grouped, then separated into distinct tuning panels

## Renaming Best Practices

### Scope
- Rename **comprehensively** - all references, not just some
- Include: variables, functions, classes, comments, CSS classes, filenames
- Document the rename in commit message

### Execution
1. **Search** - use grep to find all occurrences
2. **Plan** - identify all files that need changes
3. **Execute** - make changes atomically (one commit)
4. **Verify** - ensure no broken references remain

### User Names Take Priority
When user provides terminology:
- ✅ Adopt it immediately
- ✅ Rename code to match user's mental model
- ❌ Do not argue for "technical accuracy" over user's preferred terms

## Examples from This Project

### Successful Renames
- `FLOW_PERCENTAGE → TRANSFER_RATE` - terminology evolved from "flow" to "transfer"
- `MIN_FLOW_SHIPS → MIN_SHIPS_PER_TRANSFER` - clarified the renamed concept
- `calculateFlowAmount → calculateTransferAmount` - function matched new terminology

### Names Requiring User Clarification
- "Control Panel" vs "Tuning Panel" - user specified "Control Panel" as correct term
- "controls-wrapper" (CSS) vs "Control Panel" (user term) - CSS class caused confusion

## Documentation

When semantic renaming occurs, update:
1. ✅ Code (variables, functions, classes)
2. ✅ Comments and JSDoc
3. ✅ CSS classes if applicable
4. ✅ Commit messages explaining the rename
5. ✅ Git history stays intact - renaming is visible in diffs
