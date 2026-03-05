

# Architectural Transfer Pre-Check

## The Problem This Solves

When porting a behavior from System A to System B, the default cognitive mode is **decomposition**: break the feature into parts, reimplement each part. This works when A and B share the same architecture. It fails silently when they don't, because decomposition doesn't surface **emergent differences** — properties that arise from how the system works, not from any individual component.

Example: A polygon renderer's "don't draw polygon X" naturally results in adjacent polygons filling the space. A fragment shader's "discard pixel X" results in nothing. Both implement "skip rendering for owner X." Both are correct at the component level. The emergent behavior is completely different. Decomposition can't catch this because it's not a part-level error.

## When To Apply

**Before implementing any feature that is being ported, adapted, or translated from one system/context to another.** This includes:
- Porting between different rendering architectures
- Reimplementing a library's behavior with different primitives
- Translating a design pattern across languages with different semantics
- Moving logic from server to client (or vice versa)
- Replacing a subsystem while preserving external behavior

## The Pre-Check (3 Questions)

### 1. Counterfactual: What changes at the system level?
"If I remove the original system and substitute the new one, what **emergent properties** change — even if every individual component is reimplemented correctly?"

This forces you out of decomposition and into systems thinking. The answer reveals architectural differences that no amount of correct part-level porting will address.

### 2. Perspective Simulation: What does the user experience?
"Walk through the user's experience step by step. At each point where the feature acts, what does the user **perceive**? Not what the code does — what the user sees, hears, or experiences."

This catches the gap between "technically correct output" and "actually correct behavior." If you can't trace from code to user experience, you don't understand the feature well enough to port it.

### 3. Absence Test: What fills the void?
"Where the original feature **removes, hides, or suppresses** something — what fills that space in System A? Does the same thing fill that space in System B? If not, what does?"

This is the specific check for the "discard trap" generalized: any time a feature works by *not doing something*, the thing that fills the gap depends on the surrounding system. Different system = different gap-filler = different behavior.

## Why Three Questions, Not One

Each question activates a different reasoning operation:
- **Counterfactual Analysis** → surfaces system-level differences
- **Perspective Simulation** → grounds the analysis in user-observable reality
- **Absence Test (a form of Surprising Absence Detection)** → catches the specific class of bug where "doing nothing" behaves differently across systems

The decomposition-only approach would not have surfaced any of these. The combination catches what decomposition misses: emergent differences, experiential gaps, and void-filling assumptions.

## Key Insight

**Decomposition is necessary but insufficient for cross-architecture work.** It tells you WHAT the parts are. It cannot tell you whether reassembling those parts in a different system produces the same emergent behavior. You must pair it with at least one integrative operation (systems thinking, perspective simulation, or counterfactual analysis) to catch architectural mismatches.

</MEMORY>
