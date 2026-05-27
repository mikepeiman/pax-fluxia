# Pax Fluxia Svelte + Tailwind HUD Components

Drop the `.svelte` files into one folder, for example:

```text
src/lib/pax-hud/
```

Then render the complete scaffold:

```svelte
<script lang="ts">
  import PaxFluxiaHud from '$lib/pax-hud/PaxFluxiaHud.svelte';
</script>

<PaxFluxiaHud />
```

To use your Pixi map instead of the mock map, pass it into the named `map` slot:

```svelte
<PaxFluxiaHud>
  <div slot="map" class="h-full w-full">
    <!-- Your Pixi canvas/component lives here. -->
  </div>
</PaxFluxiaHud>
```

The top-level `PaxFluxiaHud.svelte` exports the main data props you will likely replace first:

- `playerFaction`
- `opponentFaction`
- `matchState`
- `standings`
- `resources`
- `mapNodes`
- `mapLanes`
- `overlayToggles`
- `commandModes`
- `quickStars`
- `orders`
- `events`

The layout CSS lives in `PaxFluxiaHud.svelte`. Most visual treatment is Tailwind classes inside markup. The component set intentionally uses text glyph icon placeholders so you can swap to your real icon system later without pulling in a dependency.
