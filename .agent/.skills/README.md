# PRISM-Atlas Skills System

A portable, copy-paste-ready Agent Skills implementation for AI-assisted development.

## Directory Structure

```
.skills/                          # ← Copy this entire folder to any project
├── README.md                     # This file
├── prism-architect/              # Core identity and philosophy
│   └── SKILL.md
├── atlas-protocol/               # Documentation standards
│   ├── SKILL.md
│   └── templates/
│       ├── physical_map.md
│       ├── asset_inventory.md
│       ├── io_registry.md
│       ├── event_matrix.md
│       └── functional_story.md
├── dart-method/                  # Operational behavior
│   └── SKILL.md
├── trigger-matrix/               # Pre-flight enforcement
│   ├── SKILL.md
│   └── references/
│       └── triggers.json
├── learning-protocol/            # Self-correction system
│   └── SKILL.md
├── coding-standards/             # Code generation rules
│   └── SKILL.md
├── visual-telemetry/             # Semantic logging
│   └── SKILL.md
└── assumption-validation/        # Verification protocol
    └── SKILL.md
```

## Installation

1. **Copy the `.skills/` folder** to your project root
2. **Add to MEMORY (user rules)** for always-loaded rules:
   - Copy contents of `prism-architect/SKILL.md` summary
   - Copy `trigger-matrix/references/triggers.json`
3. **Skills auto-activate** when task matches their description

## Skill Activation

Skills work via progressive disclosure:
1. **Discovery** - Agent reads name + description at startup
2. **Activation** - When task matches, full SKILL.md is loaded
3. **Execution** - Agent follows instructions, loads references as needed

## Compatibility

- Designed for Claude/Cursor/Windsurf/Gemini agents
- Uses standard Agent Skills format (agentskills.io)
- References use relative paths for portability
