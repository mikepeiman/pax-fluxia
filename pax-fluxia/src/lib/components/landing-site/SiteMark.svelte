<script lang="ts">
  // Pax Fluxia emblem: a star node with flows radiating out along fixed lanes —
  // the game's core idea in a single mark. Cyan→magenta gradient ties it to the
  // site identity. Each instance gets a unique gradient id so multiple marks on
  // one page (header + footer) don't collide.
  let { size = 30 }: { size?: number } = $props();
  const uid = "pfm-" + Math.random().toString(36).slice(2, 8);
  const spokes = [0, 60, 120, 180, 240, 300];
</script>

<svg
  class="site-mark"
  width={size}
  height={size}
  viewBox="0 0 48 48"
  fill="none"
  aria-hidden="true">
  <defs>
    <linearGradient id={uid} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--site-cyan)" />
      <stop offset="1" stop-color="var(--site-magenta)" />
    </linearGradient>
  </defs>

  <!-- HUD ring around the node -->
  <circle cx="24" cy="24" r="20" stroke={`url(#${uid})`} stroke-width="1.4" opacity="0.45" />

  <!-- radiating flow lanes -->
  {#each spokes as deg}
    <line
      x1="24"
      y1="24"
      x2={24 + 19 * Math.cos((deg * Math.PI) / 180)}
      y2={24 + 19 * Math.sin((deg * Math.PI) / 180)}
      stroke={`url(#${uid})`}
      stroke-width="2"
      stroke-linecap="round"
      opacity="0.85" />
  {/each}

  <!-- star core -->
  <circle cx="24" cy="24" r="6.5" fill={`url(#${uid})`} />
  <circle cx="24" cy="24" r="3" fill="#fff" opacity="0.9" />
</svg>

<style>
  .site-mark {
    display: block;
    filter: drop-shadow(0 0 8px rgba(47, 227, 255, 0.4));
  }
</style>
