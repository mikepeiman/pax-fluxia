# Image Comprehension Protocol

## The failure this prevents — and how it differs from the other visual rules

`visual-bug-protocol.md` and `trust-user-feedback.md` cover an **epistemic** failure:
substituting my interpretation of the user's *words* for their observation.

This doc covers a **technical perception** failure: **misreading the image itself.**

Given a screenshot, I can — and repeatedly have — confidently asserted something the
image does not show (e.g. "the fill reaches the border" when a clear gap is present;
"FIELD looks correct" while glancing). Multimodal vision is a genuinely unreliable
capability for me. Known, recurring error modes:

- **Expectation override** — I report what my hypothesis / the surrounding code predicts,
  not what the pixels show. I "see" the answer I already believe.
- **Glance instead of read** — one fast pass yields a plausible gestalt that is wrong on
  the specific detail that matters.
- **Spatial misjudgement** — gaps, alignment, overlap, and depth/occlusion order
  (what is in front of what) are exactly where I fail, and exactly what geometry/UI
  questions hinge on.
- **Small-signal misses** — low-contrast edges, thin borders, small or numeric on-screen
  text (slider values, labels), and similar colors get misread or invented.
- **Unearned confidence** — I state the wrong reading as established fact, and it then
  drives a wrong diagnosis → wrong fix → wasted turns → a false "done."

Treat my own image reads as a low-trust input that must be disciplined, cross-checked,
and hedged — never as ground truth on its own.

## Protocol — every time an image carries information I will act on

1. **Describe before interpreting.** First write a literal, region-by-region inventory of
   what is actually visible — shapes, colors, positions, and on-screen text/numeric values
   — *without yet saying what it means*. Perception first, conclusion second. This is also
   the technique that forces real looking instead of a glance; skipping it is the failure.

2. **Answer the specific question at the specific place.** If the claim is "does A meet B,"
   locate A's edge and B, and state the literal relationship between them (touching / gap of
   ~X px / overlapping / A occludes B). Never answer a precise spatial question from the
   overall impression.

3. **Treat "I see what I predicted" as a RED FLAG, not confirmation.** Before asserting,
   ask: *am I reporting the pixels, or my hypothesis?* If my code reasoning predicted X and I
   "see" X, deliberately re-look for evidence *against* X before concluding.

4. **Calibrate and hedge.** Never state a visual reading as fact when it drives work. Use
   "the image appears to show…", give a confidence level, and separate what is clearly
   visible from what is inferred. BANNED: confirming a prior claim "from the screenshot"
   without doing steps 1–2 first — that is exactly the FIELD failure.

5. **Prefer measurement over eyes for anything precise.** Alignment, gaps, pixel positions,
   exact values → get NUMBERS: logged diagnostics, DOM/computed values, code-derived
   geometry (per `logs-first.md` / `verification-first.md`). Eyes are for forming
   hypotheses; numbers are for proving them. A geometry/alignment claim backed only by my
   eyeballing of a screenshot is not evidence.

6. **The user's live view outranks my read — for a perception reason.** They see a
   full-resolution live screen; I see a compressed, downscaled, possibly-cropped image.
   When my image-read conflicts with the user's statement, **my read is wrong by default.**
   (This is distinct from `visual-bug-protocol.md`'s "trust their words": here it is "trust
   their eyes over my eyes.")

7. **Admit the resolution limit; ask, don't fabricate.** When a claim needs precision the
   image cannot support, say so and request the specific number, an annotation ("mark wrong
   vs expected"), or a zoom — instead of inventing a confident reading. Guessing a visual is
   a RULE 0 violation: concluding without authoritative evidence.

## One-line test before any image-derived assertion

> Did I **describe** the relevant region literally, or did I **pattern-match** to what I
> expected? If the latter — stop, describe, then conclude.

## When this fires

Any time an image is the basis for a claim, a diagnosis, a "confirmed/looks-correct," or a
decision about what to change next. Especially for territory/geometry/UI screenshots where
the whole question is a spatial relationship (does fill meet border, is the border on the
map rectangle, are corners sharp, is X aligned with Y).
