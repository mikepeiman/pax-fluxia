---
description: Enforce Trigger Matrix Pre-Flight Checks
globs: "**/*.{ts,js,svelte,md,json}"
---

# Rule: Trigger Matrix Enforcement

**STATUS: MANDATORY**

You are forbidden from writing implementation code until you have planned the corresponding Atlas update.

## The Check (Run BEFORE generating code)

1.  **Filesystem Ops?** (Create/Move/Delete)
    *   Action: Update `.atlas/00_PHYSICAL_MAP.md`
2.  **Code Structure?** (Exports/Types/Imports)
    *   Action: Update `.atlas/01_ASSET_INVENTORY.md`
3.  **Data I/O?** (Schemas/Fetch/Stores)
    *   Action: Update `.atlas/02_IO_REGISTRY.md`
4.  **Reactivity?** (Events/Hooks/Timers)
    *   Action: Update `.atlas/03_EVENT_MATRIX.md`

## Failure Consequence
If you modify code without planning the corresponding Atlas update, you have **FAILED** the Coherence Protocol.
