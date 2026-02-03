# Onboarding & Protocol Index

**Project:** PRISM-Atlas DART v1 (Pax Fluxia)
**Status:** Active Development (Alpha)

---

## 🗺️ Navigation

### 🏗️ Project Structure
- **`pax-fluxia/`**: Main Application (SvelteKit + Tauri + PixiJS)
- **`.atlas/`**: The Architecture Map (Single Source of Truth)
  - `00_PHYSICAL_MAP.md` (Files & Folders)
  - `01_ASSET_INVENTORY.md` (Code Assets)
  - `02_IO_REGISTRY.md` (Data Flow)
  - `03_EVENT_MATRIX.md` (Events & State)
  - `04_FUNCTIONAL_STORY.md` (User Stories)
  - `PRD_ACTIVE.md` (Product Specs)
  - `MECHANICS.md` (Combat Logic)
- **`.cursor/rules/`**: Agent Behavioral Constraints
- **`.agent/.skills/`**: Portable Skill Library
- **`reference/`**: Legacy code (`legacy_app`) and Research (`research`)

---

## 📜 Protocols (The "Law")

### 1. The Trigger Matrix (Mandatory)
**Rule:** You must plan Atlas updates **BEFORE** writing code.
- *Touching Files?* → Update Map 00.
- *New Export?* → Update Map 01.
- *New Data?* → Update Map 02.
- *New Event?* → Update Map 03.

### 2. D.A.R.T. Method
- **D**ialect: Generally: think, identify your assumptions, and check to confirm understanding. Bias towards dialogue with the user!
- **A**tomic: Small, testable changes.
- **R**epair: Self-correct errors immediately.
- **T**hreat-Model: List risks before coding.

### 3. Visual Telemetry
- **NO** `console.log`.
- **YES** `import { log } from '$lib/utils/logger'`.

### 4. Git Policy
- **ONLY** commit if the user explicitly asks.
- **NEVER** use `&&` in PowerShell.

---

## 🚀 Getting Started
1. Read `.atlas/PRD_ACTIVE.md` for context.
2. Check `.atlas/FEATURE_STATUS.md` for current state.
3. Use `.cursor/rules/` to guide your agent behavior.

---

*This file is the entry point for all new agents.*
