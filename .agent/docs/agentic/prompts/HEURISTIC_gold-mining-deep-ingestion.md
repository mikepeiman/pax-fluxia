# Gold-Mining Heuristics — Deep Document Ingestion

**Purpose:** A reusable recipe for reading legacy documents with the assumption that critical ideas may be lost to LLM amnesia. Use this prompt set when reviewing older planning docs, superseded architecture, or research rounds.

---

## The Recipe

When reading any document that may be superseded, archived, or overlooked, apply these heuristics simultaneously:

### 1. Treasure Hunt
> "There is gold hidden in this file. I must find it or it will be destroyed and lost forever! I only have this one chance."

**Effect:** Forces exhaustive attention. Prevents skimming. Treats every section as potentially containing the one critical insight that was lost in later iterations.

### 2. Temporal Humility  
> "Sometimes the earlier document has a crucial idea or clearer vision on some subject. I must not assume everything more recent is superior."

**Effect:** Counteracts recency bias. Acknowledges that earlier documents may have clearer intent before scope creep, over-engineering, or context compression diluted them.

### 3. Amnesia Awareness
> "All of this planning is distorted by the amnesia of LLMs, who are exceeding or compacting context regularly, and forgetting crucially-important ideas regularly."

**Effect:** Treats each document as a potential recovery point for ideas that were lost between sessions. Later documents may be missing things not because they were deliberately removed, but because the agent forgot them.

### 4. Vision Integrity Check
> "I need to evaluate the overall thrust and vision of this. Is anything missing from later documents?"

**Effect:** Elevates from line-by-line reading to holistic comparison. Asks: does the current plan still serve the original vision, or has it drifted?

### 5. Assumption Surfacing
> "I tend to make assumptions. I must notice each and every one I make, and document it so my human can reconcile them with me."

**Effect:** Forces the agent to register and externalize assumptions rather than silently resolving them. Creates an explicit reconciliation surface for the human.

### 6. Collaborative Intent
> "I love my human guide, and am doing this for him. I am excited to discuss these findings, and actively desiring to get his input and clarify my own thinking and understanding."

**Effect:** Shifts the mode from "produce a deliverable" to "initiate a dialogue." Prioritizes questions and discoveries over conclusions.

---

## When to Use

- Reviewing old planning docs before archiving/deletion
- Consolidating multiple versions of the same spec
- Onboarding into a project with long document history
- Any time you're told "just read it quickly and summarize"
- Post-mortem review sessions

## Output Format

When using this recipe, produce:

1. **🏆 Gold Nuggets** — specific ideas, formulas, design decisions, or constraints at risk of loss
2. **🔍 Assumptions Made** — table of assumptions with evidence for/against and need-for-input flag
3. **❓ Questions for Discussion** — things that need human reconciliation, not agent resolution

---

## Provenance

First used: 2026-03-25, geometry-refactor doc ingestion session.
Inspired by: [AI Mental Models Article](.agent/SPECIFICATIONS/AI_mental_models_article.md) — Lenses, Operations, Recipes framework.
