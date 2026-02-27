# HSLA-Native Color Standard

> **Status:** Proposed  
> **Priority:** High — affects visual identity, territory rendering, and player distinguishability

## Rationale

All primary color operations in the game **MUST** use HSLA (Hue, Saturation, Lightness, Alpha) as the canonical color space. Hex (`0xRRGGBB`) and CSS hex (`#rrggbb`) should only be used as **derivative output formats** when interfacing with:

- PIXI.js APIs (which accept `0xRRGGBB` integers)
- CSS/HTML elements (which accept `#rrggbb` strings)
- Colyseus schema serialization (which stores `string`)

## Benefits

1. **Guaranteed hue separation** — generating maximally-separated player hues is trivial (divide 360° by N)
2. **Intuitive adjustments** — saturation/lightness/hue controls map directly to underlying values
3. **Perceptual correctness** — HSL models human color perception; hex is machine encoding
4. **No repeated conversions** — current code converts hex→HSL→hex repeatedly in every render pass

## Core Type

```typescript
interface HSLA {
    h: number;  // 0-360 degrees
    s: number;  // 0-1
    l: number;  // 0-1
    a: number;  // 0-1 (default 1.0)
}
```

## Canonical Color Flow

```
Player Creation → HSLA (canonical) → stored in PlayerSchema as HSLA
                                    → convert to 0xRRGGBB only at PIXI render time
                                    → convert to #rrggbb only for CSS/DOM
```

## Refactor Scope Survey

### Files Requiring Changes (11 files)

| File | Current Usage | Change Required |
|------|--------------|-----------------|
| `colorUtils.ts` | Central hub. `getPlayerColor()` returns `0xRRGGBB`. HSL cache as secondary. | **PRIMARY** — flip to HSLA-native. `getPlayerColor()` → `getPlayerHSLA()`. Add `toPixiHex()` wrapper. |
| `RenderContext.ts` | `ColorUtils` interface defines `getPlayerColor(): number` | Update interface to HSLA-native with hex converter methods |
| `game.config.ts` | `UNOWNED_COLOR: 0x888888`, `CONTESTED_COLOR`, various hex defaults | Convert to HSLA literals |
| `StarRenderer.ts` | Uses `getPlayerColor()` → passes hex to PIXI | Use HSLA internally, convert at PIXI call site |
| `ShipRenderer.ts` | Same pattern, 4 call sites | Same |
| `LaneRenderer.ts` | Same pattern, 1 call site | Same |
| `VoronoiRenderer.ts` | `hexToRGB()` conversion before HSL processing | Eliminate double conversion, use HSLA directly |
| `PixelTerritoryRenderer.ts` | `hexToRGB()` → `rgbToHSL()` → adjust → `hslToRGB()` | Use HSLA directly, convert to RGB only for pixel buffer |
| `MetaballRenderer.ts` | `hexToRGB()` for shader data | Use HSLA, convert at shader boundary |
| `orbModes.ts` | Hex color constants for orb rendering | Convert to HSLA |
| `GameCanvas.svelte` | Color resolver passes hex | Update resolver to pass HSLA |
| `gameStore.svelte.ts` | `generatePlayerColors()` already HSLA-native internally | Store HSLA in PlayerSchema (or JSON-serialize) |
| `colorDistance.ts` | Color comparison utilities | Operate in HSLA space natively |

### Migration Strategy

1. **Phase 1 — Core type + colorUtils** (~2h)
   - Define `HSLA` type in `RenderContext.ts`
   - Refactor `colorUtils.ts` to be HSLA-native
   - Add `hslaToPixiHex()` and `hslaToCssHex()` converters
   
2. **Phase 2 — Renderers** (~3h)
   - Update all renderers to accept HSLA, convert at API boundary
   - Remove intermediate `hexToRGB()` → `rgbToHSL()` chains

3. **Phase 3 — Config + Schema** (~1h)
   - Convert hex defaults in `game.config.ts` to HSLA
   - Update `PlayerSchema.color` serialization

### Risk Assessment

> [!WARNING]
> PIXI.js only accepts `0xRRGGBB` integers for tint/color properties. Every PIXI call site needs a conversion wrapper. This is unavoidable but should be centralized in `colorUtils.ts`.

> [!NOTE]
> The `PlayerSchema.color` field is serialized as a CSS hex string for Colyseus multiplayer sync. The schema type stays string — we just convert at the boundary.
