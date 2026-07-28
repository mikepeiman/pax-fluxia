<script lang="ts">
  /**
   * PaxChassis — a real vector HUD shell that UI controls are laid out ON TOP of,
   * rather than a CSS box with a border.
   *
   * Each `kind` draws a genuinely different physical object:
   *   arcade  — cabinet plate: chamfered corners, bolt studs, side vent ribs,
   *             double neon stroke, animated scanline sweep
   *   aurelia — engraved brass frame: filigree corner flourishes, inner hairline,
   *             top cartouche, diamond studs
   *   glass   — refracted pane: bevel highlight, caustic light streak, frosted body
   *   plain   — no chassis (themes that shouldn't have one)
   *
   * Texture is procedurally generated with feTurbulence — real generative imagery,
   * no bitmaps, resolution-independent, and it re-tints with the theme.
   */
  interface Props {
    kind?: "arcade" | "aurelia" | "glass" | "plain";
    /** unique-per-instance so SVG filter/gradient ids never collide */
    uid: string;
    label?: string;
  }
  let { kind = "plain", uid, label }: Props = $props();
</script>

{#if kind !== "plain"}
  <div class="chassis" data-kind={kind} aria-hidden="true">
    <!-- procedural surface texture: fractal noise, tinted by the theme -->
    <svg class="chassis__tex" preserveAspectRatio="none" viewBox="0 0 100 100">
      <defs>
        <filter id="{uid}-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={kind === "glass" ? "0.012 0.03" : "0.9"}
            numOctaves={kind === "glass" ? "3" : "2"}
            seed="7"
            result="n"
          />
          {#if kind === "glass"}
            <!-- caustic-like banding from the noise field -->
            <feColorMatrix in="n" type="matrix"
              values="0 0 0 0 0.55  0 0 0 0 0.85  0 0 0 0 1  0 0 0 0.5 0" />
            <feGaussianBlur stdDeviation="0.6" />
          {:else}
            <feColorMatrix in="n" type="saturate" values="0" />
          {/if}
        </filter>
      </defs>
      <rect width="100" height="100" filter="url(#{uid}-grain)" />
    </svg>

    {#if kind === "arcade"}
      <!-- Raster frame (border-image 9-slice). If the texture 404s this layer is
           simply invisible and the vector plate below still draws the shell. -->
      <span class="ch-raster"></span>
      <!-- ARCADE CABINET PLATE -------------------------------------------- -->
      <svg class="chassis__edge" preserveAspectRatio="none" viewBox="0 0 200 120">
        <!-- outer chamfered plate: cut TL, notched TR shoulder, cut BR -->
        <path
          class="ch-plate"
          d="M0,14 L14,0 L138,0 L146,8 L200,8 L200,104 L188,120 L10,120 L0,110 Z"
          vector-effect="non-scaling-stroke"
        />
        <path
          class="ch-plate-inner"
          d="M5,16 L16,5 L136,5 L144,13 L195,13 L195,102 L186,115 L12,115 L5,107 Z"
          vector-effect="non-scaling-stroke"
        />
      </svg>
      <!-- fixed-size greebles so they stay crisp at any panel size -->
      <svg class="ch-bolt ch-bolt--tr" viewBox="0 0 12 12"><circle cx="6" cy="6" r="3.2" /><circle cx="6" cy="6" r="1.1" class="ch-bolt-core" /></svg>
      <svg class="ch-bolt ch-bolt--bl" viewBox="0 0 12 12"><circle cx="6" cy="6" r="3.2" /><circle cx="6" cy="6" r="1.1" class="ch-bolt-core" /></svg>
      <svg class="ch-vent" viewBox="0 0 26 8"><path d="M0 1h26M0 4h26M0 7h20" vector-effect="non-scaling-stroke" /></svg>
      <span class="ch-sweep"></span>

    {:else if kind === "aurelia"}
      <!-- ENGRAVED BRASS FRAME --------------------------------------------- -->
      <svg class="chassis__edge" preserveAspectRatio="none" viewBox="0 0 200 120">
        <rect class="ch-rule" x="1" y="1" width="198" height="118" rx="10" vector-effect="non-scaling-stroke" />
        <rect class="ch-rule ch-rule--inner" x="6" y="6" width="188" height="108" rx="7" vector-effect="non-scaling-stroke" />
      </svg>
      <!-- filigree flourishes, drawn once and mirrored into all four corners -->
      {#each ["tl", "tr", "bl", "br"] as pos}
        <svg class="ch-fil ch-fil--{pos}" viewBox="0 0 40 40">
          <path
            d="M2,20 C2,10 10,2 20,2 M6,20 C6,12 12,6 20,6
               M2,20 C8,20 12,16 12,10 M20,2 C20,8 24,12 30,12"
            vector-effect="non-scaling-stroke"
          />
          <circle cx="12.5" cy="10.5" r="1.6" class="ch-stud" />
        </svg>
      {/each}
      {#if label}
        <span class="ch-cartouche">
          <svg viewBox="0 0 120 22" preserveAspectRatio="none">
            <path d="M4,21 L10,3 L110,3 L116,21 Z" vector-effect="non-scaling-stroke" />
          </svg>
          <em>{label}</em>
        </span>
      {/if}

    {:else if kind === "glass"}
      <!-- REFRACTED GLASS PANE --------------------------------------------- -->
      <svg class="chassis__edge" preserveAspectRatio="none" viewBox="0 0 200 120">
        <defs>
          <linearGradient id="{uid}-bevel" x1="0" y1="0" x2="0.7" y2="1">
            <stop offset="0" stop-color="#fff" stop-opacity="0.75" />
            <stop offset="0.35" stop-color="#fff" stop-opacity="0.10" />
            <stop offset="1" stop-color="#fff" stop-opacity="0.02" />
          </linearGradient>
          <linearGradient id="{uid}-caustic" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="var(--accent-strong)" stop-opacity="0" />
            <stop offset="0.5" stop-color="var(--accent-strong)" stop-opacity="0.34" />
            <stop offset="1" stop-color="var(--frame-strong)" stop-opacity="0" />
          </linearGradient>
          <filter id="{uid}-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
        </defs>
        <rect x="0.75" y="0.75" width="198.5" height="118.5" rx="16"
          fill="none" stroke="url(#{uid}-bevel)" stroke-width="2" vector-effect="non-scaling-stroke" />
        <!-- light streak raking across the pane -->
        <path d="M18,120 L96,0 L112,0 L34,120 Z" fill="url(#{uid}-caustic)" opacity="0.5" filter="url(#{uid}-soft)" />
      </svg>
      <span class="ch-prism"></span>
    {/if}
  </div>
{/if}

<style>
  .chassis {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    border-radius: inherit;
  }
  /* the arcade raster frame carries its own outer bloom, which must not be clipped */
  [data-kind="arcade"].chassis { overflow: visible; }
  .chassis__tex,
  .chassis__edge {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
  .chassis__tex { opacity: var(--ch-tex-op, 0.05); mix-blend-mode: overlay; }

  /* ---------------- arcade ---------------- */
  /* The raster frame now supersedes the drawn plate — rendering both doubled the
     outline. The vector paths are kept (not deleted) so removing the texture
     restores the fully-drawn shell. */
  [data-kind="arcade"] .chassis__edge,
  [data-kind="arcade"] .ch-bolt,
  [data-kind="arcade"] .ch-vent { display: none; }
  [data-kind="arcade"] .ch-plate {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.6;
    filter: drop-shadow(0 0 5px var(--accent-glow));
  }
  [data-kind="arcade"] .ch-plate-inner {
    fill: none;
    stroke: var(--frame);
    stroke-width: 0.75;
    opacity: 0.55;
  }
  .ch-bolt { position: absolute; width: 11px; height: 11px; }
  .ch-bolt circle { fill: none; stroke: var(--frame); stroke-width: 1; opacity: 0.8; }
  .ch-bolt .ch-bolt-core { fill: var(--accent); stroke: none; opacity: 0.9; }
  .ch-bolt--tr { top: 13px; right: 9px; }
  .ch-bolt--bl { left: 9px; bottom: 11px; }
  .ch-vent {
    position: absolute; right: 10px; bottom: 14px; width: 24px; height: 8px;
    stroke: var(--frame); stroke-width: 1; opacity: 0.45; fill: none;
  }
  /* a slow bloom sweep — the cabinet feels powered */
  .ch-sweep {
    position: absolute; inset: 0;
    background: linear-gradient(100deg, transparent 42%, color-mix(in srgb, var(--accent) 22%, transparent) 50%, transparent 58%);
    transform: translateX(-100%);
    animation: ch-sweep 7s ease-in-out infinite;
  }
  @keyframes ch-sweep {
    0%, 62% { transform: translateX(-100%); }
    92%, 100% { transform: translateX(100%); }
  }

  /* raster frame: source is 1536x1024, ornament (bolts / chamfer / vent ribs)
     lives in the outer ~270px, so that is the 9-slice inset. The middle is not
     filled — the panel's own surface shows through. */
  .ch-raster {
    position: absolute;
    inset: -34px;
    border: 46px solid transparent;
    border-image: url("/textures/neon-arcade/panel-frame.png") 270 300 300 270 / 46px / 0 stretch;
    pointer-events: none;
  }
  /* the plate texture replaces the procedural grain when the file is present */
  [data-kind="arcade"] .chassis__tex {
    background: url("/textures/neon-arcade/plate-tile.png") repeat;
    background-size: 300px 300px;
  }
  [data-kind="arcade"] .chassis__tex > rect { display: none; }

  /* ---------------- aurelia ---------------- */
  [data-kind="aurelia"] .ch-rule {
    fill: none;
    stroke: var(--frame);
    stroke-width: 1.2;
    opacity: 0.85;
  }
  [data-kind="aurelia"] .ch-rule--inner { stroke-width: 0.6; opacity: 0.4; }
  .ch-fil {
    position: absolute; width: 34px; height: 34px;
    fill: none; stroke: var(--frame-strong); stroke-width: 1; opacity: 0.75;
  }
  .ch-fil .ch-stud { fill: var(--frame-strong); stroke: none; opacity: 0.9; }
  .ch-fil--tl { top: 3px; left: 3px; }
  .ch-fil--tr { top: 3px; right: 3px; transform: scaleX(-1); }
  .ch-fil--bl { bottom: 3px; left: 3px; transform: scaleY(-1); }
  .ch-fil--br { bottom: 3px; right: 3px; transform: scale(-1); }
  .ch-cartouche {
    position: absolute; top: -1px; left: 50%; transform: translateX(-50%);
    width: 132px; height: 20px; display: grid; place-items: center;
  }
  .ch-cartouche svg { position: absolute; inset: 0; width: 100%; height: 100%; fill: var(--screen-solid); stroke: var(--frame); stroke-width: 1; }
  .ch-cartouche em {
    position: relative; font-style: normal; font-family: var(--font-brand);
    font-size: 8.5px; letter-spacing: 0.24em; text-transform: uppercase;
    color: var(--frame-strong); padding-top: 2px;
  }

  /* ---------------- glass ---------------- */
  [data-kind="glass"] { backdrop-filter: blur(1px); }
  .ch-prism {
    position: absolute; inset: 0;
    background:
      linear-gradient(158deg, color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent 34%),
      linear-gradient(28deg, color-mix(in srgb, var(--frame) 12%, transparent) 0%, transparent 30%);
  }

  @media (prefers-reduced-motion: reduce) {
    .ch-sweep { animation: none; opacity: 0.25; transform: none; }
  }
</style>
