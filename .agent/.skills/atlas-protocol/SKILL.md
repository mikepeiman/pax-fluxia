---
name: atlas-protocol
description: |
  Atlas documentation protocol for maintaining synchronized project documentation.
  Use when creating, modifying, or deleting files, functions, data flows, events, or user stories.
  Provides templates for the 5 Atlas views required before code implementation.
metadata:
  author: metabrain
  version: "1.0"
compatibility: Any project requiring architectural documentation
---

# Atlas Protocol

**Purpose:** The Atlas is the "X-Ray" of the software—a living documentation artifact that must be maintained in sync with code.

---

## The 5 Required Views

When asked to "Update the Atlas," generate these views:

### VIEW A: THE PHYSICAL MAP (Space)
- **File:** `/.atlas/00_PHYSICAL_MAP.md`
- **Data:** Filepath, Alias Path, and Purpose
- **Format:** `graph TD` (Mermaid)
- **Goal:** No "magic imports." Absolute location clarity.

### VIEW B: THE ASSET INVENTORY (Matter)
- **File:** `/.atlas/01_ASSET_INVENTORY.md`
- **Data:** Functions, Variables, Stores, Types
- **Format:** `classDiagram` (Mermaid)
- **Goal:** Every exported symbol documented.

### VIEW C: THE I/O REGISTRY (Boundaries)
- **File:** `/.atlas/02_IO_REGISTRY.md`
- **Data:** Sources, Sinks, Transformations
- **Format:** `flowchart LR` (Mermaid)
- **Goal:** Clear data boundaries and flow.

### VIEW D: THE EVENT MATRIX (Time/Causality)
- **File:** `/.atlas/03_EVENT_MATRIX.md`
- **Data:** Triggers, Listeners, Linked Stories
- **Format:** Table
- **Goal:** Every reactive connection mapped.

### VIEW E: FUNCTIONAL STORIES (Narratives)
- **File:** `/.atlas/04_FUNCTIONAL_STORY.md`
- **Data:** User Story → Technical Trace
- **Format:** `sequenceDiagram` (Mermaid)
- **Goal:** The "red thread" from intent to implementation.

---

## Mandatory Rule

> **The Atlas must be updated BEFORE code implementation, not after.**

See `templates/` directory for view templates.

---

## Quick Reference

```
/.atlas/
├── 00_PHYSICAL_MAP.md      # Structure (Space)
├── 01_ASSET_INVENTORY.md   # Assets (Matter)
├── 02_IO_REGISTRY.md       # I/O Boundaries
├── 03_EVENT_MATRIX.md      # Events (Time)
└── 04_FUNCTIONAL_STORY.md  # Stories (Intent)
```
