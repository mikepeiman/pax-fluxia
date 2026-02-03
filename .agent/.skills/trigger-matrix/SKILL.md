---
name: trigger-matrix
description: |
  Pre-flight enforcement system before code generation. Use before writing ANY code
  to check if Atlas updates are required. Contains the Trigger Matrix for determining
  which documentation files need updates based on the type of change being made.
metadata:
  author: metabrain
  version: "1.0"
---

# Trigger Matrix Protocol

**STATUS: MANDATORY ENFORCEMENT**

You are forbidden from writing implementation code until you have run your intended actions against the Trigger Matrix.

---

## The 3-Step Circuit Breaker

### 1. PRE-FLIGHT
- Analyze your intended code changes
- Compare against the Trigger Matrix (see `references/triggers.json`)
- If ANY match found, plan the Atlas update

### 2. EXECUTION
- Write the implementation code

### 3. COMMIT
- Apply the Atlas updates
- Verify code matches plan

---

## Quick Check (Run Before Every Code Generation)

Ask yourself these 4 questions:

1. **"Does this code touch the Filesystem?"**
   - Creating, renaming, moving, deleting files/directories?
   - *Yes?* → Update `00_PHYSICAL_MAP.md` (cartography)

2. **"Does this code introduce a new Function/Type?"**
   - New exports, changed signatures, new interfaces?
   - *Yes?* → Update `01_ASSET_INVENTORY.md` (inventory)

3. **"Does this code move Data?"**
   - New schemas, API calls, database queries, stores?
   - *Yes?* → Update `02_IO_REGISTRY.md` (plumbing)

4. **"Does this code React to something?"**
   - New event listeners, lifecycle hooks, timers, subscriptions?
   - *Yes?* → Update `03_EVENT_MATRIX.md` (nervous_system)

---

## Trigger Categories

### FILESYSTEM_OPS → cartography.md
- Creating a new file
- Renaming a file or folder
- Moving a file
- Deleting a file
- Creating a new directory

### CODE_STRUCTURE → inventory.md
- Exporting a new function
- Exporting a new class or interface
- Changing parameters of an exported function
- Changing the return type of an exported function
- Importing a new dependency (internal or external)

### DATA_IO → plumbing.md
- Defining a new Zod/Valibot schema
- Writing a fetch() or axios call
- Defining a database query (SQL/Prisma/SurrealDB)
- Reading/Writing to LocalStorage or Cookies
- Creating or modifying a Global Store

### REACTIVITY → nervous_system.md
- Adding an Event Listener (window, document, element)
- Using a Lifecycle Hook (onMount, useEffect, onDestroy)
- Defining a Custom Event dispatcher
- Creating a Timer (setTimeout, setInterval)
- Subscribing to a Stream or Observable

### INTENT → stories.md
- Starting a new Feature request
- Refactoring a user-facing flow
- Marking a story as 'Verified' or 'Complete'

---

## Failure Consequence

> **IF YOU FAIL TO UPDATE THE ATLAS FOR ANY OF THESE TRIGGERS, YOU HAVE FAILED THE COHERENCE PROTOCOL.**
