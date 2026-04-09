# Markdown master index (git-tracked `*.md`)

**Canonical enumeration** for idea mining: one row per tracked markdown file at HEAD, with category rules, git first/last touch, and Mar22/Mar24 **tree membership** (same refs as `MARKDOWN_FULL_MANIFEST_VS_HEAD.md`).

- **Full data (CSV):** [MARKDOWN_MASTER_INDEX.csv](./MARKDOWN_MASTER_INDEX.csv)
- **Generator:** `_generate_markdown_master_index.ps1`
- **Post-mortem / pipeline:** [IDEA_MINING_PIPELINE_POSTMORTEM.md](./IDEA_MINING_PIPELINE_POSTMORTEM.md)

**Excluded from this audit index:** any repo path containing `bmad` (case-insensitive), including `.agent/workflows/bmad-*` and recovered filenames.

**Basename recovery (not exhaustive):** `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/` - see that README.

## Snapshot refs

| Flag | Ref | Meaning |
|------|-----|---------|
| in_tree_mar22 | `504bf6442304a8cda1bbedfe0ee5af5fab7e6694` | Path present in tree at end 2026-03-22 |
| in_tree_mar24 | `c4a30769fbed427282787371836731dbb15c6dd9` | Path present in tree at end 2026-03-24 |

## Counts by category

| category | files |
|----------|-------|
| agent_other | 18 |
| agent_rules | 25 |
| agentic | 98 |
| atlas | 18 |
| common | 6 |
| docs_archive | 376 |
| docs_atlas_mirror | 7 |
| docs_other | 1 |
| engineering | 5 |
| game_other | 13 |
| game_territory | 28 |
| gemini | 2 |
| implementation_plans | 17 |
| other | 1 |
| pax_fluxia | 5 |
| plans | 32 |
| process | 14 |
| project_decisions | 2 |
| project_other | 8 |
| project_postmortems | 12 |
| research | 129 |
| review_reconcile | 11 |
| root_readme | 1 |
| sessions | 50 |
| WIP | 16 |

**Total indexed:** 895

## Regenerate

```powershell
powershell -NoProfile -File .agent/docs/project/implementation-plans/2026-04-08/doc-audit/_generate_markdown_master_index.ps1
```

