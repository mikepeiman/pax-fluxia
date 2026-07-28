# Neon Arcade — raster asset brief

What to generate, where each file goes, and the exact prompt. Everything here is a
**material or a frame**, never a whole mockup — mockups can't be composited, materials can.

Drop finished files in `pax-fluxia/static/textures/neon-arcade/` using the exact filenames below;
the chassis wires them by name.

## Global rules for every prompt
Append this to each prompt:

> flat orthographic front view, no perspective, no camera tilt, centered, no text, no lettering,
> no logos, no watermark, no UI controls drawn in, transparent or pure black background,
> even lighting, game-asset sheet quality, 4k

And append a negative prompt:

> negative: perspective, 3d camera angle, text, letters, numbers, watermark, signature, people,
> hands, drop shadow on background, jpeg artifacts, blurry, busy background, existing UI widgets

---

## 1 — `plate-tile.png`  (seamless material, 512×512)
**Placement:** tiled fill behind every rail panel; replaces the current `feTurbulence` grain.
CSS: `background-image: url(...); background-repeat: repeat;` at 8–14 % opacity, `mix-blend-mode: overlay`.

> Seamless tileable texture of black anodised acrylic arcade cabinet panel, very fine
> horizontal brushed grain, faint dust speckle, subtle magenta and cyan sheen catching the
> surface, extremely dark near-black base, low contrast, tiles perfectly with no visible seam

## 2 — `panel-frame.png`  (9-slice frame, 512×512, transparent)
**Placement:** the panel shell itself, via `border-image: url(...) 96 fill / 96px stretch;`
Corners must occupy the outer 96 px so 9-slice stretching never distorts them.

> Neon arcade HUD panel frame, hot magenta outer tube glow with a thin cyan inner line,
> chamfered top-left corner, small notched shoulder on the top-right edge, two round bolt
> studs, three short vent ribs bottom-right, hollow transparent centre, symmetrical margins,
> the ornament confined to the outer 96 pixels of the image

## 3 — `bezel-top.png`  (edge strip, 1024×128, transparent)
**Placement:** the topbar — `background: url(...) top center / auto 100% repeat-x;`

> Horizontal arcade marquee bezel strip, dark metal rail with a magenta neon tube running its
> length, small cyan indicator lamps at even intervals, thin chrome lip along the bottom edge,
> seamless left-to-right so it can repeat

## 4 — `glow-sprite.png`  (radial bloom, 256×256, transparent)
**Placement:** additive bloom under active controls and the live dot —
`background-blend-mode: screen`, scaled per element.

> Soft circular bloom of magenta light fading to transparent, no hard edge, pure additive
> glow on black, perfectly radially symmetrical

## 5 — `grid-horizon.jpg`  (map backdrop, 2048×1024)
**Placement:** the starmap ground layer behind the render modes.

> Synthwave grid horizon receding to a vanishing point, magenta grid lines on black, cyan
> haze at the horizon line, dark starfield above, no sun disc, no mountains, no text

## 6 — `star-sigils.png`  (icon sheet, 1536×256, transparent — 6 cells of 256)
**Placement:** the canonical star types, sliced by `background-position`.
Order left→right must be: **basic, transfer, attack, defense, repair, production**.

> Six neon glyphs in one row on black, evenly spaced, each in its own square cell:
> grey circle outline, blue seven-sided ring, green triangle, red square, purple hexagon,
> yellow pentagon — all drawn as glowing neon tube outlines of even stroke weight, hollow
> centres, no fill

---

## Wiring (once files exist)
In `PaxChassis.svelte`, the `arcade` branch swaps its drawn plate for:

```css
[data-kind="arcade"] {
  border-image: url("/textures/neon-arcade/panel-frame.png") 96 fill / 96px stretch;
}
[data-kind="arcade"] .chassis__tex {
  background: url("/textures/neon-arcade/plate-tile.png") repeat;
  opacity: 0.12;
  mix-blend-mode: overlay;
}
```

Keep the SVG chassis as the fallback: if a texture 404s the vector shell still renders, so the
UI never degrades to a plain box.

## Which parts should stay vector, and why
Do **not** replace these with images — they must stay crisp and theme-reactive:
- all control-level geometry (buttons, toggles, sliders, segmented rails)
- the integrity gauge arc and the standings meters (they encode live values)
- focus rings

Raster earns its place on **large, static, textural surfaces** — the panel frame, the marquee
bezel, the map backdrop. That split keeps the UI sharp at any zoom while giving the chrome
genuine material.
