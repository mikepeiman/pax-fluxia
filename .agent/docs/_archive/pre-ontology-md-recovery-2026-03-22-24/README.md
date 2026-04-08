# Pre-ontology Markdown recovery (Mar 22-24, 2026)

**Generated:** 2026-04-08 15:33

Historical snapshots: `504bf64` (end Mar 22), `ff5c3df` (end Mar 23), `c4a3076` (end Mar 24).

## What was archived

For each **basename** `*.md` that appeared under those trees: if the blob **SHA** was **not** already present in **any** current `HEAD` file with the **same basename** (case-insensitive), one copy was written under `files/`.

When several historical paths or snapshots produced different blobs for the same basename, **one** blob was kept: **largest size**, then **newer snapshot** (Mar24 > Mar23 > Mar22).

## Layout

- `files/` - recovered markdown (flat; names from original basename; rare collision -> numeric suffix).
- `MANIFEST.tsv` - basename, blob SHA, size, winning snapshot, source path at that snapshot.

## Regenerate

From repo root:

```powershell
powershell -NoProfile -File .agent/docs/_archive/_scripts/build_pre_ontology_md_archive.ps1
```

## Atlas Harness (optional)

Use MCP atlas-harness `file_list` / `file_read` to spot-check, or `code_references` after re-homing content. Bulk extraction uses git + this script.

## Caveat

Same basename in different folders may have been different documents; this archive keeps **one** body per basename. Use `MANIFEST.tsv` and `git show <blob>` for other SHAs if needed.