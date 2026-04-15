# Idea mining pipeline — post-mortem (2026-04-08)

## Original intent (architect)

- **Mine all useful ideas** from the full markdown corpus, not a short curated list.
- Use **March 22** and the **post–Mar 25 planning audit** as **time anchors** for what existed and what changed — not as “three random commits only.”
- **Every markdown file** should be **indexed**, **categorized**, and **dated**, then **queued for processing** (skim → deep read → idea extraction).

## What was built instead (and why that missed the mark)

| Expectation | What shipped | Failure mode |
|-------------|--------------|--------------|
| Full corpus | ~33 rows in `BRAINSTORMING_IDEAS_INDEX_FINAL.md` + partial bucket lists | **Synthesis**, not **enumeration**. |
| “March 22 pull” | `pre-ontology-md-recovery-2026-03-22-24/` with **25** files | Script = **basename-deduped** blobs at Mar22/23/24 tips **minus** anything whose SHA already matched HEAD **by basename** — **not** “all `.md` on Mar 22.” |
| Post–Mar 25 coverage | Doc A/B/C **session bands** under `.agent/docs/project/sessions/` | **Did not** treat `.agent/WIP Work-In-Progress/` as a first-class bucket; **did not** list every `.md` changed after 2026-03-25. |
| Category + date + queue | Jumpstart buckets + handoffs | **No** single table of **all** paths with **category**, **git dates**, and **processing_status**. |

**Root cause:** Success criteria drifted to **Render Family doc epic closure** (handoffs, FINAL, recommendations) instead of **exhaustive inventory → processing queue → idea ledger**.

## New success criteria (authoritative)

1. **`MARKDOWN_MASTER_INDEX.csv`** (+ summary `.md`) lists **every git-tracked `*.md`** (optional scope toggle in script) with: path, **category**, size, **first/last commit** touching the file, **presence at Mar22/Mar24 snapshot trees**, default `processing_status=unprocessed`.
2. **Idea rows** in brainstorming files are **annotations on top of** that inventory (reference full path + optional commit), **not** a substitute for it.
3. **Pre-ontology recovery** is documented as **basename-deduped historical recovery**, not “full Mar 22 export.”

## Where to look

- **Master index:** [MARKDOWN_MASTER_INDEX.md](./MARKDOWN_MASTER_INDEX.md) (summary) + `MARKDOWN_MASTER_INDEX.csv` (full rows).
- **Ideas-principle narrative (human-readable):** [TERRITORY_IDEA_CORPUS_NARRATIVE.md](./TERRITORY_IDEA_CORPUS_NARRATIVE.md) — prose digest; CSV = **queue**; `BRAINSTORMING_IDEAS_INDEX*` = **row ledger**.
- **Generator:** `_generate_markdown_master_index.ps1` (same folder as this file).
- **Historical path diff (no per-file dates):** [MARKDOWN_FULL_MANIFEST_VS_HEAD.md](./MARKDOWN_FULL_MANIFEST_VS_HEAD.md).
- **Basename recovery archive:** `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/`.

## Process going forward

1. Regenerate master index when the corpus grows (`powershell -NoProfile -File ..._generate_markdown_master_index.ps1`).
2. Agents/humans set `processing_status` / `notes` in the CSV (or a derived copy) as files are mined; fold findings into [TERRITORY_IDEA_CORPUS_NARRATIVE.md](./TERRITORY_IDEA_CORPUS_NARRATIVE.md) when axes need new prose.
3. New ideas get rows in `BRAINSTORMING_IDEAS_INDEX*.md` with **`inventory_path`** = repo-relative path from the master index.
