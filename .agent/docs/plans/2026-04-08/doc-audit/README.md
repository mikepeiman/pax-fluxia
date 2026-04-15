# Doc audit artifacts (2026-04-08)

Canonical **markdown inventory** and **2026-04-08 session** docs for the territory idea-mining reboot live here (not under `project/process/`).

| Artifact | Role |
|----------|------|
| [MARKDOWN_MASTER_INDEX.csv](./MARKDOWN_MASTER_INDEX.csv) | One row per git-tracked `.md` at HEAD (spreadsheet-friendly; UTF-8 BOM). |
| [MARKDOWN_MASTER_INDEX.md](./MARKDOWN_MASTER_INDEX.md) | Short summary + category counts + regen command. |
| [MARKDOWN_FULL_MANIFEST_VS_HEAD.md](./MARKDOWN_FULL_MANIFEST_VS_HEAD.md) | Historical snapshot trees vs HEAD (path-level diff). |
| [IDEA_MINING_PIPELINE_POSTMORTEM.md](./IDEA_MINING_PIPELINE_POSTMORTEM.md) | Why enumeration vs synthesis diverged; success criteria. |
| [TERRITORY_IDEA_CORPUS_NARRATIVE.md](./TERRITORY_IDEA_CORPUS_NARRATIVE.md) | Prose digest of ideas by axis. |
| [2026-04-08_session_work_summary_and_prompt_log.md](./2026-04-08_session_work_summary_and_prompt_log.md) | Human-readable session record. |

**Excluded from generated indexes:** any repo path containing `bmad` (case-insensitive), e.g. `.agent/workflows/bmad-*`.

**Regenerate** (from repo root):

```powershell
powershell -NoProfile -File .agent/docs/project/implementation-plans/2026-04-08/doc-audit/_generate_markdown_master_index.ps1
powershell -NoProfile -File .agent/docs/project/implementation-plans/2026-04-08/doc-audit/_generate_markdown_manifest_index.ps1
```

**Entry hub** for assignees: [territory-rendering-jumpstart.md](../territory-rendering-jumpstart.md) (§0). Engineering inventory + strategy: [territory-rendering-overview.md](../territory-rendering-overview.md). **Impl** sequencing: [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](../TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md). Planning audit hub: [PLANNING_DOCS_AUDIT.md](../../process/PLANNING_DOCS_AUDIT.md).
