# LOC Audit Implementation Plan - 2026-04-14

## Purpose

Run a real LOC audit of Pax Fluxia without collapsing into file-by-file bureaucracy.

This is still a technical audit. The difference is that the output should emphasize leverage:

- what is canonical
- what is drifting or duplicated
- what is misleading or stale
- what is strategically interesting
- what is underused and could become a stronger feature or UX surface

## Scope

Audit the live codebase first:

- `common/src`
- `pax-fluxia/src`
- `pax-server/src`

Use current docs only as architectural context:

- `.agent/AGENT.md`
- the three audit prompt docs
- active queue, master plan, and session notes
- recent territory, lane, transport, and UI plans only where they define current direction

Ignore generated and vendor output unless it is actively shaping runtime behavior.

## Operating Mode

Work subsystem by subsystem, not as one giant undifferentiated read.

Recommended order:

1. `common/src`
2. client config, state, and settings surfaces
3. territory, lanes, rendering, motion
4. multiplayer and server boundaries
5. remaining support code

Every live file gets a quick technical read and a lightweight classification:

- `canonical`
- `adapter`
- `presentation`
- `orchestration`
- `compatibility`
- `experimental`
- `dead/suspect`

Go deeper only when the signal is high:

- important truth owner
- drift risk
- duplicate implementation
- misleading name or contract
- stale but still influential code
- half-built feature surface
- architecture blockage

## Core Audit Questions

For every meaningful file and major symbol, ask:

1. What does this own?
2. Is it the right owner?
3. What depends on it?
4. Is it active, transitional, duplicated, misleading, or dead?
5. What breaks if removed?
6. Does it reveal a stronger feature, UX surface, or cleaner architecture move?

Keep a running ledger of:

- canonical truths
- duplicate or drifting truths
- dead or misleading code
- feature seeds
- cleanup opportunities
- cross-file tensions

## Technical Rules

- Distinguish `FACT`, `INFERENCE`, and `HYPOTHESIS`.
- Prefer code truth over comments and plans when they conflict.
- Treat UI labels and surfaced controls as product contracts.
- Treat SP/MP divergence, UI/runtime divergence, and doc/code divergence as high-signal findings.
- Treat fake configurability, hidden runtime controls, and dead active-looking code as priority findings.
- Do not summarize every file equally. Spend depth where leverage is highest.

## Output

Produce one compact report with these sections:

### Canonical Core

- the most important truth-owning systems
- where they really live
- where ownership is confused

### Best Technical Findings

- highest-value drift
- duplication
- misleading naming
- dead code
- boundary problems

### Most Interesting Opportunities

- systems that are more powerful than their current surface
- half-built or underused ideas that could become strong features or tools

### Best Cleanup Moves

- smallest structural changes that would improve clarity, trust, or iteration speed

### Top 10 Next Moves

- ranked mix of fixes, consolidations, deletions, and feature explorations

## Default Deliverable Style

Keep the output compact and sharp.

This is a LOC audit with insight bias, not a vibes pass and not a mechanical inventory.
