# Mandatory Search Before Refactor

## TRIGGER: Any rename, variable rewiring, config key change, or interface modification

Before writing ANY code that changes a variable name, function name, config key, or type interface:

### 1. Run `pax-find` for the term being changed
```powershell
bun tools/pax-find.ts --config <CONFIG_KEY>
bun tools/pax-find.ts --refs <variable_or_function>
bun tools/pax-find.ts --imports <module_name>
```

### 2. Verify completeness
- Every reference returned must be accounted for
- If a reference is NOT being updated, state WHY explicitly
- If pax-find returns 0 results for a term you expect to exist, investigate — don't assume it's absent

### 3. After changes, re-run pax-find
Confirm:
- No stale references to the old name remain
- New name doesn't collide with existing names
- All import/export chains are intact

### Why This Rule Exists
- `WOBBLE_AMP` was hardcoded to `12` in two files while a config slider existed
- `travelingShips` was aliased in GameCanvas, disconnected by ShipRenderer
- `STAR_RENDER_RADIUS` was written by slider but never read by renderer
- ALL of these would have been caught by a single `pax-find --config` call

### Cost of Skipping
| Skipped | Consequence | Time wasted |
|---------|------------|-------------|
| Wobble search | Slider did nothing | 30+ min debugging |
| Reference trace | Ships invisible | 45+ min tracing pipeline |
| Config audit | Star radius slider broken | 20+ min investigating |
