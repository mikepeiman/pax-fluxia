---
name: coding-standards
description: |
  The 6-Step Specification Protocol for code generation. Use before writing any
  component, function, or module. Ensures consistent code quality, proper documentation,
  and clear contracts. Includes Svelte 5 patterns and educational code principles.
metadata:
  author: metabrain
  version: "1.0"
---

# Coding Standards & 6-Step Protocol

**Directive:** Do not write a single line of code until you have mentally filled out the 6-Step Protocol.

---

## THE 6-STEP PROTOCOL

For every component/function/module:

### 1. Identity
**What is this?**
- Name & single responsibility
- One sentence description

### 2. Attributes
**What data does it possess?**
- Props/parameters with types
- Internal state variables
- Derived values

### 3. Pattern
**How is it built?**
- Framework patterns (Svelte 5 Runes, React Hooks, etc.)
- Styling approach (Tailwind, CSS Modules)
- Composition strategy

### 4. Connections
**What does it touch?**
- Imports (internal & external)
- Dependencies injected
- Stores accessed

### 5. Interface
**How does it connect?**
- Events dispatched
- Callbacks expected
- Bindings exposed

### 6. Outcome
**What is the result?**
- Success criteria
- Expected output/behavior
- Validation checks

---

## Code as Teaching Material

Every function should pass this test:
> *"Could a junior developer learn from this code?"*

**If NO** → You are creating technical debt.
**If YES** → You are building a knowledge base.

---

## The Annotation Hierarchy

```typescript
/**
 * MODULE-LEVEL: What this file does and why it exists
 */

/**
 * FUNCTION-LEVEL: Purpose, parameters, return value
 * @param input - Clear description of expected input
 * @returns Clear description of output
 */
function processData(input: DataType): ResultType {
    // INLINE: Non-obvious logic explanation
    // WHY we're doing this, not WHAT we're doing
    
    // CROSS-REF: Links to related decisions
    // See LESSONS_LEARNED.md: "Database Real-Time Sync" post-mortem
}
```

---

## Svelte 5 Patterns (Runes Syntax)

```svelte
<script lang="ts">
  // Props: Use $props() rune
  let { value, onchange }: { value: string; onchange?: (v: string) => void } = $props();
  
  // State: Use $state() rune
  let count = $state(0);
  
  // Derived: Use $derived() rune (replaces $: reactive statements)
  let doubled = $derived(count * 2);
  
  // Effects: Use $effect() rune (replaces $: side effects)
  $effect(() => {
    console.log('Count changed:', count);
  });
</script>
```

**Key Rules:**
- NO legacy `export let` syntax
- NO `$:` reactive statements
- Use `$state`, `$derived`, `$effect` exclusively

---

## Educational Code Checklist

Before submitting any code:

- [ ] **Purpose is clear**: Function name answers "What does this do?"
- [ ] **Inputs documented**: Not just types, but *meaning* and constraints
- [ ] **Side effects explicit**: No hidden database writes or API calls
- [ ] **Edge cases annotated**: Comments where things could break
- [ ] **Cross-references added**: Links to related code decisions
