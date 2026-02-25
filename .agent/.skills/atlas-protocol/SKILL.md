---
name: atlas-protocol
description: |
  Lightweight architecture documentation protocol.
  Use when creating systems, modifying architecture, or during Gear 2-3 work.
  Replaces the old 5-view ceremony with incremental living documentation.
metadata:
  author: metabrain
  version: "2.0"
  evolution: "Simplified from 5 mandatory views to incremental living docs"
compatibility: Any project requiring architectural documentation
---

# Atlas Protocol v2

**Purpose:** The Atlas is the living X-ray of the software — maintained incrementally, not ceremonially.

---

## The Living Architecture Doc

Instead of 5 separate Mermaid-heavy views, maintain a single `/.atlas/` directory with focused documents updated incrementally as relevant:

| File | Contents | Update When |
|------|----------|-------------|
| `00_PHYSICAL_MAP.md` | File tree + purpose | New files/directories created |
| `01_ASSET_INVENTORY.md` | Functions, types, stores | New exports, major refactors |
| `02_IO_REGISTRY.md` | Data sources/sinks/transforms | Data flow changes |
| `03_EVENT_MATRIX.md` | Triggers, listeners, stories | New events or reactive chains |
| `04_FUNCTIONAL_STORY.md` | User story → technical trace | New features |
| `DECISIONS.md` | Architectural decisions log | Every design decision |
| `FEATURE_STATUS.md` | Bugs + planned features | Every bug fix or feature change |

---

## Variable Rigour

| Gear | Atlas Protocol |
|------|---------------|
| **Gear 1: Hotfix** | Update FEATURE_STATUS.md only. Atlas updates post-hoc. |
| **Gear 2: Feature** | Update relevant Atlas section(s) before coding. Not all 5 — just the affected ones. |
| **Gear 3: Deep Work** | Full Atlas review + update before coding. Design review with user. |

---

## Pre-Flight (Simplified Trigger Matrix)

Before writing code, scan for which docs need updating:

1. **New files?** → `00_PHYSICAL_MAP.md`
2. **New exports/types?** → `01_ASSET_INVENTORY.md`
3. **Data flow changes?** → `02_IO_REGISTRY.md`
4. **New events?** → `03_EVENT_MATRIX.md`

Not all items trigger every time. Only update what's relevant.

---

## Entropy Defense

Atlas Rot is the existential threat. Self-enforce:

1. **At commit time**: "Did I update the docs that changed?"
2. **If answer is no**: update before pushing
3. **If unsure**: err on the side of updating — a quick note is better than nothing
4. **Monthly review**: walk the Atlas against actual code (Raw Mode Drill)

---

## Quick Reference

```
/.atlas/
├── 00_PHYSICAL_MAP.md      # Structure (what's where)
├── 01_ASSET_INVENTORY.md   # Assets (exports, types)
├── 02_IO_REGISTRY.md       # Data flow (in/out)
├── 03_EVENT_MATRIX.md      # Events (triggers/listeners)
├── 04_FUNCTIONAL_STORY.md  # Stories (intent → implementation)
├── DECISIONS.md             # Decision log
├── DESIGN_RULES.md          # UI/UX rules
└── FEATURE_STATUS.md        # Bugs & features
```
