

# Visual Output Rule

## MANDATORY: Simulate the Visual Output Before Writing Rendering Code

When writing any rendering code (shaders, draw calls, visibility logic):

**BEFORE writing code, answer in plain language:**
1. What does the user SEE at pixels where this code runs?
2. What SHOULD the user see at those pixels?
3. If I'm removing/skipping something, what fills that space?

**If you cannot answer #3, you do not understand the feature well enough to implement it.**

## The Discard Trap

In polygon renderers, "don't draw polygon X" = adjacent polygons fill the space.
In fragment shaders, "don't draw pixel X" = nothing is there. Background shows through.

These are NOT equivalent. Never assume a polygon renderer pattern works the same way in a fragment shader.

## Mechanical Porting Is Not Engineering

Porting a feature from one renderer to another requires understanding the *visual intent*, not just the *code pattern*. Ask: "What does the user see?" — not "What does the code do?"

</MEMORY>
