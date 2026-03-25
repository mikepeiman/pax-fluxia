# Onboarding & Protocol Index

**Project:** Pax Fluxia
**Status:** Active Development (Alpha)

---

## 🗺️ Navigation

### 🏗️ Project Structure
- **`common/`**: Shared game logic (engine, combat, types, schemas)
- **`pax-fluxia/`**: Client Application (SvelteKit + PixiJS)
- **`pax-server/`**: Game Server (Node.js + Colyseus)
- **`.atlas/`**: The Architecture Map (Single Source of Truth)
  - `GAME_SPECIFICATION.md` ⭐ (Comprehensive game spec)
  - `DEVELOPMENT_HISTORY.md` (Build history & roadmap)
  - `PRD_ACTIVE.md` (Product Specs)
  - `FEATURE_STATUS.md` (Current status & backlog)
  - `MECHANICS.md` (Combat Logic)
  - `DECISIONS.md` (Architectural Decisions)
  - `00_PHYSICAL_MAP.md` → `04_FUNCTIONAL_STORY.md` (Atlas Maps)
- **`.agent/rules/`**: ⚖️ Canonical Agent Rules (10 files)
- **`.agent/.skills/`**: Portable Skill Library
- **`reference/`**: Legacy code and research

---

## 📜 Protocols (The "Law")

### 1. The Trigger Matrix (Mandatory)
**Rule:** You must plan Atlas updates **BEFORE** writing code.
- *Touching Files?* → Update Map 00.
- *New Export?* → Update Map 01.
- *New Data?* → Update Map 02.
- *New Event?* → Update Map 03.

### 2. D.A.R.T. Method
- **D**ialect: Think, identify assumptions, check understanding. Bias towards dialogue!
- **A**tomic: Small, testable changes.
- **R**epair: Self-correct errors immediately.
- **T**hreat-Model: List risks before coding.

### 3. Visual Telemetry
- **NO** `console.log`.
- **YES** `import { log } from '$lib/utils/logger'`.

### 4. Git Policy
- Commit with `git ac "message"` after every code/doc change.
- Always push: `git push origin master`.
- **NEVER** use `&&` in PowerShell.

### 5. Document Everything
- Every idea, fix, or roadmap feature must be recorded in `.atlas/`.

---

## 🚀 Getting Started
1. Read `.atlas/GAME_SPECIFICATION.md` for full game spec.
2. Read `.atlas/DEVELOPMENT_HISTORY.md` for build context.
3. Check `.atlas/FEATURE_STATUS.md` for current state.
4. Review `.agent/rules/` for all agent behavioral rules.

---

*This file is the entry point for all new agents.*
