# Pre-ontology Markdown recovery (Mar 22-24, 2026)

**Generated:** 2026-04-08 15:41

Historical snapshots: `504bf64` (end Mar 22), `ff5c3df` (end Mar 23), `c4a3076` (end Mar 24).

## What this is **not**

This folder is **basename-deduped historical recovery**, not a **full export** of every markdown file that existed on 2026-03-22 (or Mar 23–24). Many paths never appear here when the same basename already matches a `HEAD` blob. For **exhaustive mining** of the current corpus, use the tracked-file inventory: [MARKDOWN_MASTER_INDEX.md](../../project/implementation-plans/2026-04-08/doc-audit/MARKDOWN_MASTER_INDEX.md) (+ `MARKDOWN_MASTER_INDEX.csv`) and the pipeline note [IDEA_MINING_PIPELINE_POSTMORTEM.md](../../project/implementation-plans/2026-04-08/doc-audit/IDEA_MINING_PIPELINE_POSTMORTEM.md).

## What was archived

For each **basename** `*.md` that appeared under those trees: if the blob **SHA** was **not** already present in **any** current `HEAD` file with the **same basename** (case-insensitive), one copy was written under `files/`.

When several historical paths or snapshots produced different blobs for the same basename, **one** blob was kept: **largest size**, then **newer snapshot** (Mar24 > Mar23 > Mar22).

## Exclusions

Legacy framework paths are **not** included; only Pax Fluxia / project-adjacent markdown.

## Layout

- `files/` - recovered markdown (flat; names from original basename; rare collision -> numeric suffix).
- `MANIFEST.tsv` - basename, blob SHA, size, winning snapshot, source path at that snapshot.
- `RECOVERED_LEGACY_DOC_LIST.md` - same inventory as a readable table (for documentation audits).

## Regenerate

From repo root:

```powershell
powershell -NoProfile -File .agent/docs/_archive/_scripts/build_pre_ontology_md_archive.ps1
```

## Atlas Harness (optional)

Use MCP atlas-harness `file_list` / `file_read` to spot-check, or `code_references` after re-homing content. Bulk extraction uses git + this script.

## Caveat

Same basename in different folders may have been different documents; this archive keeps **one** body per basename. Use `MANIFEST.tsv` and `git show <blob>` for other SHAs if needed.