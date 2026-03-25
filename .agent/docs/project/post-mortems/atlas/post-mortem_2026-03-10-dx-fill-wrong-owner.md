# Post-Mortem: 2026-03-10 — DX Fill Assigned to Same-Owner Instead of Enemy

## What Happened
User said: "DX should be filled by...neighboring enemy territories to fill the gap."
Agent coded: `nearest real owner` — which assigns disconnect cells back to the SAME owner (blue), defeating the purpose of disconnect.

## Root Cause
Agent treated "fill the gap" as an engineering problem to solve independently, rather than parsing the user's exact words ("neighboring enemy territories") as the specification. The phrase "neighboring enemy territories" is unambiguous — it specifies ENEMY. Agent substituted own framing ("nearest real owner fills the void") without verifying it produces enemy assignment.

This is a direct violation of AGENT.md 2.3: "User words are specifications — parse as requirements, not symptoms."

## Impact
- One wasted commit with wrong DX behavior
- User had to correct agent TWICE:
  1. Original instruction clearly said "neighboring enemy territories" — agent coded "nearest real owner" (same owner)
  2. User provided screenshots showing incorrect result AND explicit correction in plain language — only THEN did agent implement "nearest enemy"
- Agent did NOT self-correct from screenshots — required explicit user re-statement
- This is a compounding failure: ignoring clear instructions, then requiring hand-holding to fix

## Corrective Actions
- Fixed: nearest ENEMY owner assignment (skip same-owner stars in distance search)
- Rule reinforcement: when user specifies WHO should fill a space, that IS the algorithm

## Lessons
- "Nearest real owner" ≠ "nearest enemy owner." The user said ENEMY. Parse EXACTLY.
- When implementing a feature the user described, map their nouns directly to code: "enemy territories" → filter for different owner.
