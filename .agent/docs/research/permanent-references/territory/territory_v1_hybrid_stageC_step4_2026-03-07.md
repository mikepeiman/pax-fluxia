# Territory Rendering V1 Hybrid - Stage C Step 4 (2026-03-07)

## Scope
Step 4 of the approved execution order:
- Promote geometry borders as the canonical border renderer path (under two-pass ownership)
- Keep field-border path as explicit fallback ladder
- Preserve fill alignment contract and ownership snapshot identity

## Implemented Changes
1. Added explicit border renderer routing contract:
- `BorderRendererId = 'field' | 'geometry'`
- `DF_BORDER_RENDERER_CANONICAL` (set to `'geometry'`)
- `resolveBorderRenderer(...)` to choose canonical/fallback path deterministically.

2. Promoted geometry border rendering to canonical execution path:
- In two-pass mode, border pass now branches by renderer id:
  - `field`: use boundary-distance texture stroke (`updateTwoPassBorderUniforms` + border mesh)
  - `geometry`: run centerline/fitted-path overlay (`renderBorderFamilyOverlay`) from the same ownership snapshot contract.

3. Preserved fallback ladder behavior:
- If two-pass resources are unavailable (or renderer missing), pipeline still falls back safely to field/inline paths.
- Geometry path remains gated by `DF_VECTOR_BORDERS_ENABLED` for this stage.

4. Added alignment guardrail for straight geometry fitting:
- Straightening/simplify tolerance now clamps to a fraction of ownership-cell size.
- Prevents geometry borders from drifting visibly off the ownership fill boundary at high simplify/straighten settings.

5. Cleanup and structure:
- Removed dead debug-gating dependency from canonical path dispatch.
- Kept border-family interface in place (`straight` active, `curved`/`segmented` still deterministic stubs).

## Why this step exists
This step transitions border quality from texture-edge appearance toward canonical geometry stroke rendering while preserving the single ownership truth source. It also keeps a deterministic fallback to field borders so runtime failures do not break territory visibility.

## Notes
- This stage does **not** yet deliver GPU mesh-lerp correspondence morphing for border geometry; that remains Step 5.
- Existing fill morph blend (ping-pong ownership textures) remains active and aligned.
