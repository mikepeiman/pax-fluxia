# Feature And Task Queue - 2026-04-19

- Save the unified AI planner / strategic survey plan artifact in `.agent/docs/plans/2026-04-19/`.
- Make a docs-first checkpoint commit for the AI unification workstream.
- Unify multiplayer and single-player AI execution into one shared `common` planner path.
- Add per-seat AI mode and difficulty wiring from menu and lobby into runtime settings.
- Implement a once-per-tick `StrategicSurvey` that runs after battle resolution and feeds all AI personas.
- Add shared AI modes, fair-skill difficulties, tactical capabilities, and verification coverage.
- Status: core implementation completed and verified in `common`, `pax-fluxia`, and `pax-server`.
- Follow-up: bias AI toward must-attack expansion, eliminate low-value shuttle loops, and sanitize post-conquest reverse orders.
- Follow-up: constrain attack surge headings to the forward lane direction when cached lane polylines begin with a backward tangent.
- Follow-up: add self-play batch tooling and broader scenario coverage after merge.

