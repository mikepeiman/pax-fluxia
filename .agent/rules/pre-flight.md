---
description: Atlas documentation pre-flight check before code changes
globs: "**/*.{ts,js,svelte}"
---

# Pre-Flight Check (Variable Rigour)

## Choose Your Gear
| Gear | When | Atlas Update |
|------|------|-------------|
| **1: Hotfix** | Bug fixes, < 50 lines | Post-hoc |
| **2: Feature** | New features, UI work | Incremental (before code) |
| **3: Deep Work** | Architecture, new systems | Atlas-first + user approval |

## Pre-Code Checklist (Gear 2+)
1. **Filesystem ops?** → Update physical map
2. **New exports/types?** → Update asset inventory
3. **Data flow changes?** → Update I/O section
4. **New events/reactivity?** → Update event section

## Self-Enforcement
At commit time: "Did I update the docs that changed?" If not, update before pushing.

## Document Everything
All implementation decisions, naming changes, and architectural choices go into `.atlas/DECISIONS.md`.
