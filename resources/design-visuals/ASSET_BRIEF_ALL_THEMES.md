# Pax Fluxia — raster asset briefs (keeper themes)

Everything here is a **material or a frame**, never a whole mockup. Mockups can't be
composited; materials can.

Files go in `pax-fluxia/static/textures/<theme>/` using the **exact filenames** given.
The chassis wires them by name, and falls back to the drawn vector shell if a file is absent.

Each slot has **three variations** — generate whichever appeals, or all three and we pick.
Variation A is the safe read, B pushes the material, C is the risk.

---

## Shared boilerplate

Append to **every** prompt:

> flat orthographic front view, no perspective, no camera tilt, centered, no text, no lettering,
> no logos, no watermark, no UI controls drawn in, even lighting, game-asset sheet quality, 4k

Negative prompt for **every** generation:

> perspective, 3d camera angle, text, letters, numbers, watermark, signature, people, hands,
> jpeg artifacts, blurry, busy background, existing UI widgets, mockup, screenshot

**9-slice rule (frames only):** all ornament must sit inside the outer ~20 % of the image, and
the middle must stay empty/flat. Anything in the centre gets stretched into mush.

---

# 1 · NEON ARCADE — re-rolls only

The existing set works. Two files are worth re-generating.

### `glow-sprite.png` — 1024², **replaces current**
The current one is purple-leaning and slightly lumpy. Keep it on **black** (black is what
makes `mix-blend-mode: screen` read as transparent) — do *not* ask for transparency.

- **A** > Perfectly circular radial bloom, centred, hot magenta #ff2bbb core fading smoothly to pure black at the edges, even falloff, no banding, radially symmetrical, pure black background
- **B** > Circular neon bloom with a small white-hot centre core, magenta #ff2bbb mid-falloff, cyan #00e5ff faint outer fringe, smooth, pure black background
- **C** > Soft hexagonal lens-flare bloom, magenta core with subtle anamorphic horizontal streak, pure black background

### `star-sigils.png` — 1536×256, transparent, 6 cells of 256
Order left→right is **fixed**: basic, transfer, attack, defense, repair, production.

- **A** > Six neon glyphs in one row on transparent, evenly spaced, one per square cell: grey circle outline, blue seven-sided ring, green triangle, red square, purple hexagon, yellow pentagon — all glowing neon tube outlines, even stroke weight, hollow centres
- **B** > Same six shapes as thin double-line outlines with a bright inner core and soft outer bloom, arcade cabinet marquee style
- **C** > Same six shapes rendered as segmented LED-style outlines, each edge broken into short dashes, glowing

---

# 2 · AURELIA DRIFT — regal, engraved brass

Palette: brass/gold `#f6c469`, warm highlight `#ffe3a3`, cyan signal `#55e7ef`, ground `#03080b`.
The feel is an **engraved instrument**, not sci-fi. Think antique orrery, astrolabe, banknote
guilloche.

### `panel-frame.png` — 1536×1024, transparent centre
- **A** > Ornate engraved brass picture frame, polished gold, fine acanthus-leaf filigree at each corner, a double hairline rule following the inner edge, small diamond studs at the corner joins, hollow transparent centre, ornament confined to the outer border
- **B** > Art-nouveau brass frame with flowing vine filigree in the corners, a thin beaded inner rule, warm specular highlights on the metal, hollow centre
- **C** > Astrolabe-inspired brass frame: engraved degree ticks running along the inner edge like a measuring scale, small rosette medallions at the corners, hollow centre

### `plate-tile.png` — 512² seamless
- **A** > Seamless tileable brushed brass plate, very fine circular grain, faint patina in the low areas, warm gold, low contrast, tiles with no visible seam
- **B** > Seamless aged parchment with a faint gold-leaf sheen, subtle fibre texture, warm cream, very low contrast
- **C** > Seamless engraved guilloche pattern like banknote security printing, hairline gold lines on near-black, extremely fine, low contrast

### `cartouche.png` — 640×160, transparent
Sits at the top edge of a panel and carries the panel title.
- **A** > Engraved brass cartouche plate, symmetrical, gently tapered ends, a thin inner rule, small scroll flourishes at each end, hollow centre for text
- **B** > Ribbon banner in brass with folded ends and an engraved border, hollow centre
- **C** > Hexagonal brass name-plate with bevelled edges and two rivets, hollow centre

### `rule-divider.png` — 1024×48, transparent
- **A** > Horizontal engraved brass divider, a thin double line with a small diamond at the centre and tapered ends fading to nothing
- **B** > Horizontal filigree divider, symmetrical scrollwork radiating from a central rosette, gold on transparent
- **C** > Fine chain-link engraved rule, evenly repeating, gold, seamless left to right

### `glow-sprite.png` — 1024²
- **A** > Perfectly circular warm bloom, gold #f6c469 core fading smoothly to pure black, even falloff, no banding, pure black background
- **B** > Circular bloom with a warm white centre and gold mid-tones, faint candle-like flicker texture, pure black background
- **C** > Soft starburst bloom with four faint diffraction spikes, gold, pure black background

---

# 3 · NEBULA VEIL — crisp, technical, esports

Palette: azure `#3aa0ff`, pale azure `#8ac7ff`, steel `#8b93b8`, ground `#05060e`.
The feel is **precision instrumentation** — machined, cool, restrained. Deliberately the least
ornamented of the three. Restraint is the identity; do not let it drift decorative.

### `panel-frame.png` — 1536×1024, transparent centre
- **A** > Machined dark-steel HUD frame, precise thin azure edge line, small right-angle bracket marks at each corner, two tiny alignment notches on the top edge, hollow transparent centre, ornament confined to the outer border
- **B** > Anodised aluminium instrument bezel, crisp chamfered inner edge catching a cool highlight, four small hex screws at the corners, hollow centre
- **C** > Minimal technical frame: a single hairline azure rule with short tick marks at measured intervals along each edge, like a ruler, hollow centre

### `plate-tile.png` — 512² seamless
- **A** > Seamless tileable dark anodised aluminium, very fine horizontal brushed grain, cool blue-grey, extremely low contrast, no visible seam
- **B** > Seamless carbon-fibre weave, very dark blue-black, tight weave, subtle specular, low contrast
- **C** > Seamless micro-perforated metal mesh, tiny regular holes, dark steel, very low contrast

### `nebula-veil-bg.jpg` — 2048×1024 (map backdrop, no transparency)
- **A** > Deep space nebula, violet and azure clouds with a teal fringe, scattered white stars, dark, soft, no planets, no text
- **B** > Cool blue-violet gas cloud with visible filament structure, dense starfield, very dark overall
- **C** > Distant galaxy field, faint azure dust lanes, mostly black with sparse bright stars

### `edge-rail.png` — 1024×96, transparent
The topbar/settings edge treatment. **Keep the lit band centred vertically** — that is what
makes the measured crop reliable.
- **A** > Horizontal machined steel rail, a thin azure light line running its length, small evenly-spaced tick marks, seamless left to right, lit band centred vertically
- **B** > Thin technical rail with alternating long and short measurement ticks, azure on dark steel, seamless
- **C** > Narrow channel rail with a recessed azure light strip and tiny indicator dots at intervals, seamless

### `glow-sprite.png` — 1024²
- **A** > Perfectly circular bloom, azure #3aa0ff core fading smoothly to pure black, tight even falloff, no banding, pure black background
- **B** > Small tight circular bloom with a white-hot pinpoint centre and azure halo, pure black background
- **C** > Circular bloom with a faint concentric ring at the mid-falloff, like a targeting reticle glow, azure, pure black background

---

# 4 · BROADCAST MINIMAL — **no assets, deliberately**

Its identity is the *absence* of material: flat white surfaces, hairline rules, one accent, real
typographic hierarchy. Adding texture here would destroy the contrast with the other three.
The only thing worth generating is a favicon-scale mark, and that is not a HUD asset.

---

## Wiring (once files land)

Drop into `static/textures/<theme>/`, tell me, and I wire them the same way Neon Arcade was:

```css
[data-kind="aurelia"] {
  border-image: url("/textures/aurelia-drift/panel-frame.png") 300 fill / 52px stretch;
}
```

Edge rails get their crop **measured, not guessed** — I run a canvas probe to find the lit band
and compute `background-size`/`background-position` from it, the way the Neon Arcade bezel was fixed.
