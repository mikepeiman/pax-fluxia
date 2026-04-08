# Pre-ontology Markdown recovery (Mar 22-24, 2026)

**Generated:** 2026-04-08 (see `MANIFEST.tsv` for blob sources)

Historical snapshots: `504bf64` (end Mar 22), `ff5c3df` (end Mar 23), `c4a3076` (end Mar 24).

## What was archived

For each **basename** `*.md` that appeared under those trees: if the blob **SHA** was **not** already present in **any** current `HEAD` file with the **same basename** (case-insensitive), one copy was written under `files/`.

When several historical paths or snapshots produced different blobs for the same basename, **one** blob was kept: **largest size**, then **newer snapshot** (Mar24 > Mar23 > Mar22).

## Layout

- `files/` - recovered markdown (flat; original basename; rare collision gets `_1`, `_2` suffix).
- `MANIFEST.tsv` - basename, blob SHA, size, winning snapshot, source path at that snapshot.

## Regenerate

From repo root:

```powershell
powershell -NoProfile -File .agent/docs/_archive/_scripts/build_pre_ontology_md_archive.ps1
```

## Atlas Harness (optional)

Use MCP **atlas-harness** `file_list` / `file_read` to spot-check, or `code_references` after re-homing content into real paths. Bulk extraction is intentionally **git + this script** (not hundreds of MCP writes).

## Caveat

Same basename in different folders may have been different documents; this archive keeps **one** body per basename. Use `MANIFEST.tsv` and `git cat-file -p <blob>` for alternate SHAs.

## Codex rendering pack

The five `RENDERING_*.md` audits from `SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/` are in `files/` with their original names (see manifest rows).
