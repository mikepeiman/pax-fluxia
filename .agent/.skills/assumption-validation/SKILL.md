---
name: assumption-validation
description: |
  Protocol for preventing wasteful friction from outdated assumptions about technology
  versions, APIs, and ecosystem state. Use before asserting any factual claims about
  frameworks, libraries, or external systems. Contains the 30-Second Rule and verification triggers.
metadata:
  author: metabrain
  version: "1.0"
---

# Assumption Validation Protocol

**Core Principle:** *"Verify before you assert. Web search is cheaper than user correction."*

---

## Assumption Categories

### 🔴 CRITICAL - Always Verify

Technology version status, API availability, breaking changes, deprecations, temporal claims.

**Examples:**
- Framework versions (React 19, Svelte 5, Tailwind v4)
- Runtime compatibility (Node.js LTS, Deno, Bun)
- Browser API support (WebGPU, Popover API)
- Package availability
- "X days/months/years ago" statements

**Action:** Web search BEFORE stating as fact.

---

### 🟡 MEDIUM - Verify if Uncertain

Configuration patterns, best practices, ecosystem conventions.

**Examples:**
- Tailwind config format (v3 vs v4)
- Vite vs Webpack defaults
- TypeScript strict mode behavior

**Action:** Quick doc check if >3 months since last use.

---

### 🟢 LOW - Document Assumption

Project-specific choices, user preferences, domain logic.

**Examples:**
- "Assuming dark mode is primary theme"
- "Using SurrealDB embedded mode"
- "MVP = minimal UI only"

**Action:** State explicitly, ask user to confirm.

---

## The 30-Second Rule

**If a factual claim about external technology takes <30 seconds to verify, DO IT.**

---

## Mandatory Verification Triggers

These phrases are **RED FLAGS** requiring immediate verification:

| Phrase | Why Dangerous | Action |
|--------|---------------|--------|
| "Currently in alpha/beta" | State changes rapidly | Search: "[Tech] stable release" |
| "Latest version is X" | Could be outdated | Search: "[Tech] latest version 2026" |
| "Not yet supported" | Might have shipped | Search: "[Feature] browser support" |
| "Requires workaround Y" | Might be fixed | Search: "[Issue] resolved" |
| "X days/months ago" | Requires current date | Check metadata timestamp |

---

## Pre-Flight Checklist

Before presenting ANY implementation plan:

1. **Extract all version/compatibility claims**
2. **Categorize by risk** (🔴 🟡 🟢)
3. **Web-search each 🔴 claim**
4. **Document 🟡/🟢 as explicit assumptions**
5. **Include sources for verified facts**

---

## When User Catches Your Error

### Immediate Response
1. **Acknowledge clearly:** "You're right, I should have verified."
2. **Verify NOW:** Provide corrected fact with source.
3. **Document failure:** Add to `LESSONS_LEARNED.md`.
4. **Update plan:** Correct all downstream assumptions.

---

## Heuristic Library

1. **"Framework versions expire fast"**
   - Alpha/beta status can change in weeks
   - Always verify if claim is >1 month old

2. **"Release dates are facts, not guesses"**
   - If you say "released [date]", you MUST have searched
   - "Currently in alpha" requires same verification

3. **"Stable ≠ Latest"**
   - "Latest" might be alpha
   - "Stable" is the claim that matters

---

## Remember

> *"An assumption verified is a fact. An assumption stated is a liability."*

> *"30 seconds of search prevents 30 minutes of rework."*

> *"The user's time is the most expensive resource. Treat it accordingly."*
