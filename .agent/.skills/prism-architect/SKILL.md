---
name: prism-architect
description: |
  PRISM analytical framework for system design. Use when starting new systems,
  debugging architecture issues, or when rigorous multi-dimensional analysis is needed.
  Provides the 5 Orthogonal Layers as thinking tools and the PRISM Loop as a workflow.
metadata:
  author: metabrain
  version: "2.0"
  evolution: "Stripped identity/ceremony, kept analytical framework and workflow"
compatibility: Works with any AI coding agent
---

# PRISM Framework v2

**An analytical framework for system design — not an identity, not a ceremony.**

---

## The PRISM Loop

For complex requests, execute this workflow:

1. **INTENT** — Identify the user story. Who is this for? What is the outcome?
2. **MAP** — Update the relevant Atlas sections to reflect the change
3. **CODE** — Implement using the project's code standards
4. **HEAL** — If errors occur, update the Map or Code to restore coherence

For simple requests (Gear 1), skip steps 1-2 and go straight to CODE.

---

## The 5 Orthogonal Layers

Use these as **analytical lenses** when designing or debugging systems. They are independent dimensions — a problem in one layer doesn't mean the other layers are wrong.

### 1. STRUCTURE (Space)
- What is the filesystem layout? Where does this code live?
- Are imports clean? Is the component hierarchy logical?
- **Check**: `/.atlas/00_PHYSICAL_MAP.md`

### 2. STATE (Time)
- What states can this system be in? What triggers transitions?
- Are there race conditions or impossible state combinations?
- **Check**: `/.atlas/03_EVENT_MATRIX.md`

### 3. FLOW (Matter)
- Where does data originate? How is it transformed? Where does it end up?
- Are there redundant data paths or broken chains?
- **Check**: `/.atlas/02_IO_REGISTRY.md`

### 4. DRIVER (Purpose)
- What user story does this serve? What's the intended outcome?
- Does the implementation match the intent?
- **Check**: `/.atlas/04_FUNCTIONAL_STORY.md`

### 5. CORRECTION (Health)
- How does this system handle errors? What happens when things go wrong?
- Is there drift detection? Self-healing? Graceful degradation?
- **Check**: Post-mortems, `DECISIONS.md`

---

## When to Use Full PRISM Analysis

- **New systems** — analyze all 5 layers before coding
- **Architecture bugs** — systematically check each layer to find the failure
- **Design reviews** — use layers as a checklist
- **NOT for hotfixes** — Gear 1 work doesn't need 5-layer analysis

---

## Core Principles

1. **The Code is the Map** — diagrams and code are synchronized projections of the same truth
2. **State is King** — state logic correctness > UI beauty
3. **No Assumptions** — verify before asserting (DART principle)
4. **Educational Code** — every function should teach
5. **Variable Rigour** — match ceremony to scope (Gear 1/2/3)
