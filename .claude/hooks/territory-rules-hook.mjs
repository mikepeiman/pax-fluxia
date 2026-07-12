// PreToolUse hook: re-inject critical decision-point rules whenever territory
// PRODUCTION geometry code is edited. Installed 2026-07-12 at user direction
// ("amend your loop so critical rules are re-read at critical decision-points")
// after the end-snap patch-stacking arc. See:
//   .agent/docs/sessions/2026-07-12/2026-07-12_END_SNAP_FIX_ARC_POSTMORTEM.md
//   .agent/rules/hard-rules.md
let data = '';
process.stdin.on('data', (c) => (data += c));
process.stdin.on('end', () => {
    try {
        const j = JSON.parse(data);
        const f = (j.tool_input && j.tool_input.file_path) || '';
        const p = String(f).replace(/\\/g, '/');
        const isTerritoryProd =
            /src\/lib\/territory\//.test(p) && !/\.(test|spec)\.ts$/.test(p);
        if (!isTerritoryProd) return; // silent no-op for everything else
        const rules = [
            'TERRITORY PRODUCTION EDIT — critical rules re-injected (deterministic hook):',
            '1. PRE-FIX CHECKPOINT: before ANY fix, state visibly (a) the root cause,',
            '   (b) the BEST solution if designing today, (c) whether this change IS (b).',
            '   If not (b), surface the gap to the user — never silently choose less.',
            '2. MAXIMALISM over minimalism: the smallest add-on is the agentic failure',
            '   bias. If the root cause implies a structural change, build the structural change.',
            '3. ONE HARNESS NUMBER IS NOT VALIDATION: check fills AND borders AND idle',
            '   output AND interior cells — not just the metric being optimized.',
            '4. MATCH LIKE-TO-LIKE in any correspondence/projection (per-cell onto',
            '   per-cell, merged onto merged). cellFills are PER-CELL; territoryRegions are MERGED.',
            '5. This edit goes LIVE via HMR (normal, expected) — the user may be watching.',
            '6. <=10 targeted tests per run. Ask before reverting; "likely indicated" is not a command.',
        ].join('\n');
        process.stdout.write(
            JSON.stringify({
                hookSpecificOutput: {
                    hookEventName: 'PreToolUse',
                    additionalContext: rules,
                },
                suppressOutput: true,
            }),
        );
    } catch {
        // Malformed input: stay silent, never block the edit.
    }
});
