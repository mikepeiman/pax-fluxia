<script lang="ts">
  import "../../../app.css";
  import { goto } from "$app/navigation";

  interface Player {
    id: string; name: string; color: string; sigil: SigilName;
    active: number; total: number; stars: number; prod: number; isLocal?: boolean;
  }
  type SigilName = "command" | "hex" | "tri" | "pent" | "diamond" | "ring";

  const players: Player[] = [
    { id: "you", name: "You", color: "#4aa3ff", sigil: "command", active: 686, total: 686, stars: 25, prod: 25, isLocal: true },
    { id: "ai3", name: "AI 3", color: "#ff9a4a", sigil: "hex", active: 412, total: 423, stars: 14, prod: 14 },
    { id: "ai4", name: "AI 4", color: "#34e0a0", sigil: "tri", active: 358, total: 374, stars: 13, prod: 13 },
    { id: "ai5", name: "AI 5", color: "#b16bff", sigil: "pent", active: 350, total: 375, stars: 13, prod: 13 },
    { id: "ai1", name: "AI 1", color: "#ff5a6a", sigil: "diamond", active: 347, total: 362, stars: 11, prod: 11 },
    { id: "ai2", name: "AI 2", color: "#ffc24a", sigil: "ring", active: 340, total: 349, stars: 11, prod: 11 },
  ];

  const renderModes = [
    { id: "vector", label: "Vector", desc: "Flat filled regions, crisp borders" },
    { id: "edges", label: "Edges", desc: "Glowing phase boundaries" },
    { id: "ember", label: "Ember", desc: "Particle lattice over regions" },
    { id: "field", label: "Field", desc: "Smooth gradient field" },
    { id: "grad", label: "Grad", desc: "Gradient grid fill" },
    { id: "off", label: "Off", desc: "No territory render" },
  ];

  const speeds = [
    { id: "pause", label: "Pause" }, { id: "1", label: "1×" }, { id: "2", label: "2×" },
    { id: "4", label: "4×" }, { id: "10", label: "10×" },
  ];

  let activeMode = $state("vector");
  let speed = $state("pause");
  let shipFocus = $state<"active" | "total">("active");
  let selectedId = $state<string | null>(null);
  let blendedBorders = $state(true);
  let saturation = $state(2.0);
  let alpha = $state(0.41);
  let borderWidth = $state(5);

  const sorted = $derived(
    [...players].sort((a, b) => (shipFocus === "active" ? b.active - a.active : b.total - a.total)),
  );
  const leader = $derived(
    Math.max(...players.map((p) => (shipFocus === "active" ? p.active : p.total))),
  );
  const totals = $derived(
    players.reduce(
      (acc, p) => ({ active: acc.active + p.active, total: acc.total + p.total, stars: acc.stars + p.stars, prod: acc.prod + p.prod }),
      { active: 0, total: 0, stars: 0, prod: 0 },
    ),
  );
  const pct = (v: number, min: number, max: number) => ((v - min) / (max - min)) * 100;

  const star = { name: "Star 38", type: "Attack", owner: players[1], active: 24, damaged: 4, prod: 1, repair: 20, transfer: 0.1, activation: 0.5 };
  const integrity = Math.round(((star.active - star.damaged) / star.active) * 100);

  const GR = 29;
  const GC = 2 * Math.PI * GR;
  const gaugeOff = GC * (1 - integrity / 100);

  function back() {
    if (typeof history !== "undefined" && history.length > 1) history.back();
    else void goto("/themes");
  }
</script>

<svelte:head><title>Pax Fluxia — Nebula Veil (gold standard)</title></svelte:head>

{#snippet icon(name: string, size: number)}
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="ic" aria-hidden="true">
    {#if name === "menu"}<path d="M4 7h16M4 12h16M4 17h16" />
    {:else if name === "search"}<circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.8-4.8" />
    {:else if name === "chevron-down"}<path d="M6 9l6 6 6-6" />
    {:else if name === "chevron-up"}<path d="M6 15l6-6 6 6" />
    {:else if name === "chevron-left"}<path d="M14 6l-6 6 6 6" />
    {:else if name === "chevron-right"}<path d="M10 6l6 6-6 6" />
    {:else if name === "target"}<circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    {:else if name === "dock-left"}<rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M9.5 4.5v15" />
    {:else if name === "sliders"}<path d="M5 8h9M18 8h1M5 16h1M10 16h9" /><circle cx="16" cy="8" r="2" /><circle cx="8" cy="16" r="2" />
    {:else if name === "layers"}<path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z" /><path d="M4 12l8 4.3 8-4.3M4 15.7l8 4.3 8-4.3" />
    {:else if name === "pause"}<path d="M9 6v12M15 6v12" stroke-width="2.4" />
    {:else if name === "play"}<path d="M8 5l11 7-11 7z" />
    {:else if name === "check"}<path d="M5 12.5l4.5 4.5L19 7" stroke-width="2.2" />
    {:else if name === "crown"}<path d="M4 8l4 4 4-7 4 7 4-4-1.6 10H5.6z" />
    {:else if name === "active"}<path d="M3.5 11.2l17-6.5-6.5 17-3-7z" />
    {:else if name === "damaged"}<circle cx="12" cy="12" r="7" /><path d="M12 8l-2 4h4l-2 4" stroke-width="1.5" />
    {:else if name === "prod"}<circle cx="12" cy="12" r="3.2" /><path d="M12 4v2.4M12 17.6V20M4 12h2.4M17.6 12H20M6.2 6.2l1.7 1.7M16.1 16.1l1.7 1.7M17.8 6.2l-1.7 1.7M7.9 16.1l-1.7 1.7" stroke-width="1.4" />
    {:else if name === "repair"}<path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 5.5v4.2h-4.2" />
    {:else if name === "transfer"}<path d="M4 9.5h13l-3.2-3.2M20 14.5H7l3.2 3.2" />
    {:else if name === "activation"}<path d="M13 3l-7.5 10.5H11l-1 7.5 7.5-11.5H11z" />
    {:else if name === "atk-star"}<path d="M12 4.5l7.5 14H4.5z" />
    {/if}
  </svg>
{/snippet}

{#snippet sigil(name: SigilName, size: number)}
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" class="sig" aria-hidden="true">
    {#if name === "command"}<path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
    {:else if name === "hex"}<path d="M12 3l7.8 4.6v8.8L12 21l-7.8-4.6V7.6z" />
    {:else if name === "tri"}<path d="M12 4l8.5 15h-17z" />
    {:else if name === "pent"}<path d="M12 3l8.6 6.2-3.3 10H6.7l-3.3-10z" />
    {:else if name === "diamond"}<path d="M12 3l8.5 9-8.5 9-8.5-9z" />
    {:else if name === "ring"}<path fill-rule="evenodd" d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z" />
    {/if}
  </svg>
{/snippet}

<div class="nv">
  <button class="back" type="button" onclick={back} title="Back to Theme Lab">
    {@render icon("chevron-left", 16)} Themes
  </button>

  <header class="lead">
    <p class="lead__kicker">Gold standard · lead theme</p>
    <div class="lead__brand"><h1>Nebula&nbsp;Veil</h1><span class="lead__tag">Crisp · esports</span></div>
    <p class="lead__note">
      Rebuilt for a real visual leap — not a token swap. Angular clipped-corner HUD frames with
      lit edges and atmospheric depth, a bold hero <b>integrity gauge</b>, a glowing faction
      standings ladder, and the render modes relocated off the topbar into <b>preview tiles that
      show what each mode actually draws</b>. Everything is live — sort, select, drag, pick a mode.
    </p>
  </header>

  <section class="screen">
    <!-- ===================== TOPBAR (no render modes) ===================== -->
    <div class="tb">
      <div class="tb__brand">
        <button class="iconbtn" title="Main menu" aria-label="Main menu">{@render icon("menu", 18)}</button>
        <span class="tb__sigil" style="color:{players[0].color}">{@render sigil("command", 20)}</span>
        <span class="tb__title">Pax Fluxia</span>
        <span class="tb__map">arena-further</span>
      </div>

      <div class="tb__command">
        <div class="cmd cmd--tick"><span class="cmd__k">Tick</span><span class="cmd__v mono">0</span></div>
        <span class="cmd__sep"></span>
        <div class="cmd cmd--live">{@render icon("pause", 13)}<span>Paused</span></div>
        <span class="cmd__sep"></span>
        <div class="cmd"><span class="cmd__k">Selected</span><span class="cmd__v cmd__sel">Star 38</span></div>
      </div>

      <div class="tb__right">
        <div class="tb__diag" title="Diagnostics — hidden outside dev builds">
          <span class="tb__tag">Dev</span><span class="mono">120 fps</span><span class="mono">2,569 ships</span>
        </div>
        <button class="tb__badge" title="Collapse player standings">
          <span class="tb__badge-sig" style="color:{players[0].color}">{@render sigil("command", 14)}</span>
          <span>You</span><strong class="mono">686</strong>{@render icon("chevron-down", 14)}
        </button>
      </div>
    </div>

    <div class="body">
      <!-- ===================== SETTINGS: RENDER ===================== -->
      <aside class="settings" aria-label="Render settings">
        <label class="search">
          {@render icon("search", 16)}
          <input type="text" placeholder="Search settings…" />
        </label>

        <div class="cat">{@render icon("layers", 18)}<h2>Territory &amp; Render</h2></div>
        <div class="subtabs" role="tablist">
          <button class="subtab" role="tab" aria-selected="false">All</button>
          <button class="subtab" role="tab" aria-selected="false">Topology</button>
          <button class="subtab subtab--active" role="tab" aria-selected="true">Render</button>
          <button class="subtab" role="tab" aria-selected="false">Frontier</button>
        </div>

        <div class="eyebrow"><span class="eyebrow__ix">01</span> Render Mode</div>
        <p class="hint">Now lives here, off the topbar. Each tile previews what the mode draws on the map.</p>
        <div class="modes" role="radiogroup" aria-label="Render mode">
          {#each renderModes as m}
            <button
              class="mtile"
              class:on={activeMode === m.id}
              role="radio"
              aria-checked={activeMode === m.id}
              onclick={() => (activeMode = m.id)}
              title={m.desc}
            >
              <span class="mtile__vis" data-mode={m.id}>
                {#if activeMode === m.id}<span class="mtile__check">{@render icon("check", 13)}</span>{/if}
              </span>
              <span class="mtile__label">{m.label}</span>
            </button>
          {/each}
        </div>
        <p class="mode-desc"><strong>{renderModes.find((m) => m.id === activeMode)?.label}</strong> — {renderModes.find((m) => m.id === activeMode)?.desc}</p>

        <div class="eyebrow"><span class="eyebrow__ix">02</span> Territory Fill</div>
        <div class="ctrl">
          <div class="ctrl__head"><span>Saturation</span><span class="mono val">{saturation.toFixed(2)}</span></div>
          <input class="range" type="range" min="0" max="3" step="0.05" bind:value={saturation} style="--val:{pct(saturation, 0, 3)}%" aria-label="Saturation" />
        </div>
        <div class="ctrl">
          <div class="ctrl__head"><span>Alpha</span><span class="mono val">{alpha.toFixed(2)}</span></div>
          <input class="range" type="range" min="0" max="1" step="0.01" bind:value={alpha} style="--val:{pct(alpha, 0, 1)}%" aria-label="Alpha" />
        </div>
        <div class="ctrl">
          <div class="ctrl__head"><span>Border Width</span><span class="mono val">{borderWidth} px</span></div>
          <input class="range" type="range" min="0" max="12" step="0.5" bind:value={borderWidth} style="--val:{pct(borderWidth, 0, 12)}%" aria-label="Border width" />
        </div>
        <button class="togglerow" role="switch" aria-checked={blendedBorders} onclick={() => (blendedBorders = !blendedBorders)}>
          <span>Blended Opponent Borders</span>
          <span class="switch" class:switch--on={blendedBorders} aria-hidden="true"></span>
        </button>
      </aside>

      <!-- ===================== MAP ===================== -->
      <div class="map" aria-label="Star map (unchanged)">
        <div class="map__tag"><b>Starmap</b>out of scope for this pass</div>
      </div>

      <!-- ===================== RAIL ===================== -->
      <div class="rail">
        <!-- speed -->
        <section class="panel">
          <div class="panel__head"><div><p class="panel__eyebrow">Tempo</p><h3 class="panel__title">Game Speed</h3></div></div>
          <div class="seg" role="group" aria-label="Game speed">
            {#each speeds as s}
              <button class:on={speed === s.id} onclick={() => (speed = s.id)}>
                {#if s.id === "pause"}{@render icon("pause", 14)}{:else}{@render icon("play", 13)}{/if}
                <span>{s.label}</span>
              </button>
            {/each}
          </div>
          <div class="sliderlbl"><span>Tick Duration</span><span class="mono">1400 ms</span></div>
          <input class="range" type="range" min="100" max="5000" step="50" value="1400" style="--val:{pct(1400, 100, 5000)}%" aria-label="Tick duration" />
        </section>

        <!-- standings -->
        <section class="panel">
          <div class="panel__head">
            <div><p class="panel__eyebrow"><span class="livedot"></span>Live match</p><h3 class="panel__title">Player Standings</h3></div>
            <div class="tools">
              <button class="iconbtn sm" title="Dock left">{@render icon("dock-left", 15)}</button>
              <button class="iconbtn sm" title="Collapse">{@render icon("chevron-up", 15)}</button>
            </div>
          </div>

          <div class="std__bar">
            <span class="std__tick">Tick <strong class="mono">0</strong></span>
            <div class="seg seg--sm" role="group" aria-label="Ship emphasis">
              <button class:on={shipFocus === "active"} onclick={() => (shipFocus = "active")}>{@render icon("active", 12)}<span>Act</span></button>
              <button class:on={shipFocus === "total"} onclick={() => (shipFocus = "total")}>{@render icon("ring", 12)}<span>Tot</span></button>
            </div>
          </div>

          <div class="std__cols"><span>Player</span><span>Act</span><span>Tot</span><span>Star</span><span>Prod</span></div>
          <ul class="std__list">
            {#each sorted as p, i}
              {@const value = shipFocus === "active" ? p.active : p.total}
              <li>
                <button
                  class="std__row"
                  class:is-local={p.isLocal}
                  class:is-leader={i === 0}
                  class:is-selected={selectedId === p.id}
                  style="--pc:{p.color}; --w:{(value / leader) * 100}%"
                  onclick={() => (selectedId = selectedId === p.id ? null : p.id)}
                  aria-pressed={selectedId === p.id}
                >
                  <span class="std__who">
                    {#if i === 0}<span class="std__crown" style="color:{p.color}">{@render icon("crown", 13)}</span>{:else}<span class="std__rank mono">{i + 1}</span>{/if}
                    <span class="std__chip" style="--pc:{p.color}">{@render sigil(p.sigil, 15)}</span>
                    <span class="std__name">{p.name}</span>
                  </span>
                  <span class="mono">{p.active}</span>
                  <span class="mono">{p.total}</span>
                  <span class="mono">{p.stars}</span>
                  <span class="mono std__prod">+{p.prod}</span>
                  <span class="std__meter"></span>
                </button>
              </li>
            {/each}
          </ul>
          <div class="std__totals"><span>Totals</span><span class="mono">{totals.active.toLocaleString()}</span><span class="mono">{totals.total.toLocaleString()}</span><span class="mono">{totals.stars}</span><span class="mono">+{totals.prod}</span></div>
        </section>

        <!-- star view -->
        <section class="panel">
          <div class="panel__head">
            <div><p class="panel__eyebrow">Selection</p><h3 class="panel__title">Star View</h3></div>
            <div class="tools">
              <button class="iconbtn sm" title="Previous">{@render icon("chevron-left", 15)}</button>
              <button class="iconbtn sm" title="Recenter">{@render icon("target", 15)}</button>
              <button class="iconbtn sm" title="Next">{@render icon("chevron-right", 15)}</button>
            </div>
          </div>

          <div class="star__hero">
            <div class="gauge">
              <svg viewBox="0 0 76 76" aria-hidden="true">
                <g class="gauge__ticks">
                  {#each Array(30) as _, i}
                    <line x1="38" y1="6.5" x2="38" y2="10.5" transform="rotate({i * 12} 38 38)" />
                  {/each}
                </g>
                <circle class="gauge__track" cx="38" cy="38" r={GR} />
                <circle class="gauge__val" cx="38" cy="38" r={GR} style="--circ:{GC}; --off:{gaugeOff}" />
              </svg>
              <div class="gauge__center">
                <span class="gauge__pct mono">{integrity}<span class="gauge__unit">%</span></span>
                <span class="gauge__lbl">Integrity</span>
              </div>
            </div>
            <div class="star__id">
              <div class="star__name">{star.name}</div>
              <div class="star__meta">
                <span class="star__type" style="color:#34e0a0">{@render icon("atk-star", 13)} {star.type}</span>
              </div>
              <div class="star__owner"><span class="std__chip star__ownerchip" style="--pc:{star.owner.color}">{@render sigil(star.owner.sigil, 12)}</span> {star.owner.name}</div>
            </div>
          </div>

          <div class="star__grid">
            <div class="cell"><span class="cell__k">{@render icon("active", 12)} Active</span><span class="cell__v mono">{star.active}</span></div>
            <div class="cell"><span class="cell__k">{@render icon("damaged", 12)} Damaged</span><span class="cell__v mono">{star.damaged}</span></div>
            <div class="cell"><span class="cell__k">{@render icon("prod", 12)} Prod</span><span class="cell__v mono">{star.prod}</span></div>
            <div class="cell"><span class="cell__k">{@render icon("repair", 12)} Repair</span><span class="cell__v mono">{star.repair}%</span></div>
            <div class="cell"><span class="cell__k">{@render icon("transfer", 12)} Transfer</span><span class="cell__v mono">{star.transfer}%</span></div>
            <div class="cell"><span class="cell__k">{@render icon("activation", 12)} Activate</span><span class="cell__v mono">{star.activation}%</span></div>
          </div>

          <div class="star__targets">
            <div class="kv"><span>Current target</span><span class="mono">Star 27</span></div>
            <div class="kv"><span>Queued target</span><span class="mono none">None</span></div>
          </div>
        </section>
      </div>
    </div>
  </section>

  <footer class="gs">
    <h2>What changed from the first pass</h2>
    <ul>
      <li><span class="gs__n">A</span><span><b>A shape language.</b> Panels are angular clipped-corner HUD frames with a lit top edge and a corner bracket — a designed silhouette, not a default rounded card.</span></li>
      <li><span class="gs__n">B</span><span><b>Depth &amp; glow.</b> Atmospheric top-lit fills, a faint scanline field, and real bloom on live elements, sigils and the gauge arc — the muted flatness is gone.</span></li>
      <li><span class="gs__n">C</span><span><b>Hero components.</b> A big ticked integrity gauge with a sweep, and a glowing faction ladder where #1 gets a crown and a brighter bar.</span></li>
      <li><span class="gs__n">D</span><span><b>Render modes, done right.</b> Off the topbar entirely; in settings each mode is a live-looking preview tile — you can read Vector vs Edges vs Ember vs Field at a glance.</span></li>
    </ul>
    <p class="gs__foot">Single-theme by design. This is now the bar — the icon / sigil / gauge / frame kit is what the other four themes will be rebuilt against.</p>
  </footer>
</div>

<style>
  .nv {
    color-scheme: dark;
    --ground: #05060e;
    --screen-bg: #070912;
    --panel-fill:
      radial-gradient(130% 90% at 50% -18%, rgba(58,160,255,0.12), transparent 60%),
      linear-gradient(180deg, rgba(22,28,50,0.92), rgba(11,14,26,0.96));
    --brd: rgba(126,150,210,0.22);
    --brd-hi: rgba(130,175,255,0.5);
    --hair: rgba(126,150,210,0.14);
    --inset: rgba(14,20,38,0.9);
    --track: #131a30;

    --text-strong: #f2f6ff;
    --text: rgba(214,224,246,0.94);
    --muted: rgba(160,175,208,0.86);
    --dim: rgba(112,126,160,0.82);

    --accent: #3aa0ff;
    --accent-strong: #8ac7ff;
    --accent-glow: rgba(58,160,255,0.55);
    --frame: #8b93b8;
    --on-accent: #04070f;

    --font-ui: "Rajdhani", "Segoe UI", system-ui, sans-serif;
    --font-brand: "Bahnschrift", "Agency FB", "Rajdhani", sans-serif;
    --font-data: "JetBrains Mono", "Cascadia Mono", ui-monospace, monospace;

    --cut: 14px;
    --clip: polygon(0 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% 100%, 0 100%);

    min-height: 100vh;
    background:
      radial-gradient(ellipse at 12% 2%, rgba(150,90,230,0.16), transparent 42%),
      radial-gradient(ellipse at 88% 0%, rgba(60,140,255,0.16), transparent 42%),
      radial-gradient(ellipse at 78% 98%, rgba(255,170,70,0.08), transparent 46%),
      var(--ground);
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 15px; line-height: 1.5; letter-spacing: 0.01em;
    padding: 40px clamp(16px, 4vw, 64px) 72px;
  }
  .nv { box-sizing: border-box; }
  .nv :global(*) { box-sizing: border-box; }

  .mono { font-family: var(--font-data); font-variant-numeric: tabular-nums; }
  .ic { display: block; flex-shrink: 0; }
  .sig { display: block; }

  :where(.nv button, .nv input, .nv .std__row):focus-visible {
    outline: 2px solid var(--accent-strong); outline-offset: 3px;
  }

  .back {
    position: fixed; top: 18px; left: 18px; z-index: 10;
    display: inline-flex; align-items: center; gap: 6px;
    font: 600 13px/1 var(--font-ui); letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--muted); background: var(--inset); cursor: pointer;
    border: 1px solid var(--brd); border-radius: 999px; padding: 8px 15px 8px 11px;
    transition: color .15s, border-color .15s, transform .15s;
  }
  .back:hover { color: var(--text-strong); border-color: var(--brd-hi); transform: translateX(-2px); }

  /* lead */
  .lead { max-width: 1180px; margin: 0 auto 26px; }
  .lead__kicker { margin: 0 0 12px; font-size: 12px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--accent); }
  .lead__brand { display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; }
  .lead__brand h1 { margin: 0; font-family: var(--font-brand); font-weight: 700; font-size: clamp(34px, 6vw, 62px); letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-strong); text-shadow: 0 0 30px rgba(58,160,255,0.35); }
  .lead__tag { font-size: 13px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--frame); }
  .lead__note { max-width: 68ch; margin: 12px 0 0; color: var(--muted); font-size: 15.5px; line-height: 1.6; }
  .lead__note b { color: var(--text-strong); font-weight: 600; }

  /* screen */
  .screen {
    position: relative; max-width: 1180px; margin: 0 auto; background: var(--screen-bg);
    clip-path: polygon(0 0, calc(100% - 26px) 0, 100% 26px, 100% 100%, 0 100%);
    filter: drop-shadow(0 30px 60px rgba(0,0,0,0.55));
  }
  .screen::after {
    content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 3;
    background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.014) 3px 4px);
    mix-blend-mode: overlay;
  }

  .iconbtn { display: grid; place-items: center; width: 34px; height: 34px; cursor: pointer; color: var(--muted); background: var(--inset); border: 1px solid var(--brd); border-radius: 9px; transition: color .15s, border-color .15s, background .15s; }
  .iconbtn:hover { color: var(--text-strong); border-color: var(--brd-hi); background: rgba(58,160,255,0.10); }
  .iconbtn.sm { width: 28px; height: 28px; border-radius: 8px; }

  /* topbar */
  .tb { display: flex; align-items: center; gap: 20px; height: 60px; padding: 0 16px; background: linear-gradient(180deg, rgba(14,19,36,0.97), rgba(8,10,20,0.98)); border-bottom: 1px solid var(--brd); position: relative; z-index: 2; }
  .tb__brand { display: flex; align-items: center; gap: 11px; flex-shrink: 0; }
  .tb__sigil { display: inline-flex; filter: drop-shadow(0 0 6px currentColor); }
  .tb__title { font-family: var(--font-brand); font-size: 18px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-strong); }
  .tb__map { font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); padding-left: 11px; border-left: 1px solid var(--hair); }

  /* center command strip — gains room now the modes are gone */
  .tb__command { display: flex; align-items: center; gap: 16px; margin: 0 auto; padding: 7px 20px; border-radius: 10px; background: linear-gradient(180deg, rgba(58,160,255,0.06), rgba(58,160,255,0.02)); border: 1px solid rgba(58,160,255,0.18); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
  .cmd { display: flex; align-items: baseline; gap: 8px; }
  .cmd--live { align-items: center; color: var(--accent); text-transform: uppercase; font-size: 12px; letter-spacing: 0.1em; }
  .cmd__k { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--dim); }
  .cmd__v { font-family: var(--font-data); font-size: 16px; color: var(--text-strong); }
  .cmd--tick .cmd__v { font-size: 22px; color: var(--accent-strong); text-shadow: 0 0 14px var(--accent-glow); line-height: 1; }
  .cmd__sel { font-family: var(--font-ui); color: var(--accent-strong); font-weight: 600; }
  .cmd__sep { width: 1px; height: 22px; background: var(--hair); }

  .tb__right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
  .tb__diag { display: flex; align-items: center; gap: 9px; padding: 4px 9px; border-radius: 8px; background: rgba(0,0,0,0.3); }
  .tb__tag { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); border: 1px solid var(--hair); border-radius: 4px; padding: 1px 5px; }
  .tb__diag .mono { font-size: 12px; color: var(--dim); }
  .tb__badge { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-family: var(--font-ui); font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-strong); padding: 6px 12px; border-radius: 999px; border: 1px solid var(--brd-hi); background: rgba(58,160,255,0.1); transition: background .15s; }
  .tb__badge:hover { background: rgba(58,160,255,0.18); }
  .tb__badge .mono { color: var(--accent-strong); }
  .tb__badge-sig { display: inline-flex; }

  /* body */
  .body { display: grid; grid-template-columns: 340px 1fr 316px; min-height: 616px; position: relative; z-index: 1; }

  /* settings */
  .settings { background: linear-gradient(180deg, rgba(16,21,40,0.7), rgba(9,12,24,0.8)); border-right: 1px solid var(--hair); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .search { display: flex; align-items: center; gap: 9px; border: 1px solid var(--brd); border-radius: 9px; padding: 0 11px; height: 38px; color: var(--dim); background: var(--inset); }
  .search input { flex: 1; border: 0; background: transparent; color: var(--text); font: inherit; font-size: 13px; outline: none; }
  .search input::placeholder { color: var(--dim); }
  .cat { display: flex; align-items: center; gap: 9px; color: var(--accent); }
  .cat h2 { margin: 0; font-family: var(--font-brand); font-size: 15px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-strong); }
  .subtabs { display: flex; gap: 5px; flex-wrap: wrap; }
  .subtab { font-size: 10.5px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--muted); padding: 5px 11px; border-radius: 999px; border: 1px solid var(--hair); cursor: pointer; background: transparent; transition: color .15s, border-color .15s; }
  .subtab:hover { color: var(--text-strong); border-color: var(--brd); }
  .subtab--active { color: var(--on-accent); background: var(--accent); border-color: var(--accent); font-weight: 600; box-shadow: 0 0 14px rgba(58,160,255,0.4); }

  .eyebrow { display: flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent-strong); }
  .eyebrow__ix { font-family: var(--font-data); font-size: 10px; color: var(--accent); border: 1px solid rgba(58,160,255,0.4); border-radius: 4px; padding: 1px 4px; }
  .hint { margin: 0; font-size: 11.5px; line-height: 1.45; color: var(--dim); }
  .mode-desc { margin: 2px 0 0; font-size: 12px; color: var(--muted); }
  .mode-desc strong { color: var(--accent-strong); }

  /* render-mode preview tiles — each visual reflects the mode */
  .modes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .mtile { display: flex; flex-direction: column; gap: 6px; padding: 5px; cursor: pointer; background: var(--inset); border: 1px solid var(--brd); border-radius: 9px; transition: border-color .15s, box-shadow .15s, transform .1s; }
  .mtile:hover { border-color: var(--brd-hi); transform: translateY(-1px); }
  .mtile.on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 0 16px rgba(58,160,255,0.35); }
  .mtile__vis { position: relative; height: 42px; border-radius: 6px; overflow: hidden; background: #0a0e1a; }
  .mtile__label { font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; text-align: center; color: var(--muted); }
  .mtile.on .mtile__label { color: var(--accent-strong); font-weight: 600; }
  .mtile__check { position: absolute; top: 3px; right: 3px; z-index: 2; display: grid; place-items: center; width: 17px; height: 17px; border-radius: 999px; background: var(--accent); color: var(--on-accent); box-shadow: 0 0 10px var(--accent-glow); }

  /* mode visuals */
  .mtile__vis[data-mode="vector"] { background: linear-gradient(118deg, #4aa3ff 0 46%, #ff9a4a 46% 74%, #34e0a0 74% 100%); }
  .mtile__vis[data-mode="edges"] { background:
      linear-gradient(118deg, transparent 44%, #6fe6ff 44.5% 47%, transparent 47.5%),
      linear-gradient(118deg, transparent 72%, #ffb36b 72.5% 75%, transparent 75.5%),
      #0a0e1a;
    box-shadow: inset 0 0 12px rgba(111,230,255,0.35); }
  .mtile__vis[data-mode="ember"] { background:
      radial-gradient(circle 1.4px at 22% 30%, #6fe6ff 60%, transparent),
      radial-gradient(circle 1.4px at 44% 62%, #4aa3ff 60%, transparent),
      radial-gradient(circle 1.4px at 68% 28%, #ff9a4a 60%, transparent),
      radial-gradient(circle 1.4px at 78% 66%, #34e0a0 60%, transparent),
      radial-gradient(circle 1.4px at 34% 80%, #b16bff 60%, transparent),
      radial-gradient(circle 1.4px at 60% 46%, #ffc24a 60%, transparent),
      #0a0e1a; }
  .mtile__vis[data-mode="field"] { background:
      radial-gradient(circle at 28% 36%, rgba(74,163,255,0.9), transparent 58%),
      radial-gradient(circle at 72% 62%, rgba(255,154,74,0.85), transparent 58%),
      radial-gradient(circle at 54% 24%, rgba(52,224,160,0.8), transparent 55%),
      #0a0e1a;
    filter: saturate(1.1); }
  .mtile__vis[data-mode="grad"] { background:
      repeating-linear-gradient(0deg, transparent 0 5px, rgba(255,255,255,0.06) 5px 6px),
      repeating-linear-gradient(90deg, transparent 0 5px, rgba(255,255,255,0.06) 5px 6px),
      linear-gradient(118deg, #b16bff, #4aa3ff 55%, #34e0a0); }
  .mtile__vis[data-mode="off"] { background:
      radial-gradient(circle 1px at 30% 40%, rgba(255,255,255,0.5), transparent),
      radial-gradient(circle 1px at 62% 66%, rgba(255,255,255,0.35), transparent),
      radial-gradient(circle 1px at 78% 30%, rgba(255,255,255,0.4), transparent),
      #0a0e1a; }

  .ctrl { display: flex; flex-direction: column; gap: 8px; }
  .ctrl__head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .ctrl__head span:first-child { font-size: 13.5px; color: var(--text); }
  .val { font-size: 13px; color: var(--text-strong); }

  .range { -webkit-appearance: none; appearance: none; width: 100%; height: 18px; background: transparent; cursor: pointer; margin: 0; }
  .range::-webkit-slider-runnable-track { height: 4px; border-radius: 999px; background: linear-gradient(90deg, var(--accent) 0 var(--val), var(--track) var(--val) 100%); }
  .range::-moz-range-track { height: 4px; border-radius: 999px; background: var(--track); }
  .range::-moz-range-progress { height: 4px; border-radius: 999px; background: var(--accent); }
  .range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 13px; height: 13px; margin-top: -4.5px; border-radius: 999px; background: var(--accent-strong); border: 2px solid var(--screen-bg); box-shadow: 0 0 8px var(--accent-glow); transition: transform .12s; }
  .range::-moz-range-thumb { width: 13px; height: 13px; border-radius: 999px; background: var(--accent-strong); border: 2px solid var(--screen-bg); box-shadow: 0 0 8px var(--accent-glow); }
  .range:hover::-webkit-slider-thumb { transform: scale(1.15); }

  .switch { width: 38px; height: 21px; border-radius: 999px; background: var(--track); border: 1px solid var(--hair); position: relative; flex-shrink: 0; transition: background .15s, border-color .15s; }
  .switch::after { content: ""; position: absolute; width: 15px; height: 15px; border-radius: 999px; background: var(--dim); top: 2px; left: 2px; transition: left .15s, background .15s; }
  .switch--on { background: rgba(58,160,255,0.28); border-color: var(--accent); }
  .switch--on::after { left: 19px; background: var(--accent-strong); box-shadow: 0 0 8px var(--accent-glow); }
  .togglerow { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 0 0; margin-top: 2px; border-top: 1px solid var(--hair); background: none; border-left: 0; border-right: 0; border-bottom: 0; cursor: pointer; color: var(--text); font: inherit; }
  .togglerow > span:first-child { font-size: 13.5px; }

  /* map */
  .map { position: relative; display: grid; place-items: center; overflow: hidden;
    background:
      radial-gradient(ellipse at 26% 28%, rgba(150,90,230,0.18), transparent 40%),
      radial-gradient(ellipse at 74% 24%, rgba(60,150,255,0.18), transparent 40%),
      radial-gradient(ellipse at 32% 82%, rgba(52,224,208,0.12), transparent 40%),
      radial-gradient(ellipse at 80% 80%, rgba(255,190,74,0.12), transparent 42%),
      radial-gradient(circle 1px at 40% 40%, rgba(255,255,255,0.24) 1px, transparent 0),
      radial-gradient(circle 1px at 62% 66%, rgba(255,255,255,0.16) 1px, transparent 0),
      radial-gradient(circle 1px at 24% 70%, rgba(255,255,255,0.14) 1px, transparent 0),
      #080a14;
  }
  .map__tag { text-align: center; color: var(--dim); font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; padding: 13px 20px; border: 1px dashed var(--hair); border-radius: 12px; background: rgba(6,8,18,0.55); }
  .map__tag b { display: block; color: var(--muted); margin-bottom: 4px; letter-spacing: 0.13em; }

  /* rail */
  .rail { background: var(--screen-bg); border-left: 1px solid var(--hair); padding: 14px; display: flex; flex-direction: column; gap: 16px; }

  /* signature panel: clipped corner + lit top edge + corner bracket */
  .panel { position: relative; background: var(--panel-fill); clip-path: var(--clip); padding: 15px 15px 16px; filter: drop-shadow(0 10px 22px rgba(0,0,0,0.45)); }
  .panel::before { content: ""; position: absolute; top: 0; left: 0; right: var(--cut); height: 2px; background: linear-gradient(90deg, var(--accent) 0 30%, transparent 78%); box-shadow: 0 0 10px var(--accent-glow); }
  .panel::after { content: ""; position: absolute; left: 10px; bottom: 10px; width: 12px; height: 12px; border-left: 1.5px solid var(--brd-hi); border-bottom: 1.5px solid var(--brd-hi); opacity: 0.7; }
  .panel__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
  .panel__eyebrow { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent-strong); }
  .panel__title { margin: 3px 0 0; font-family: var(--font-brand); font-size: 16px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-strong); }
  .tools { display: flex; gap: 5px; }
  .livedot { width: 7px; height: 7px; border-radius: 999px; background: var(--accent); box-shadow: 0 0 8px var(--accent), 0 0 3px #fff; animation: nv-pulse 2.2s ease-in-out infinite; }
  @keyframes nv-pulse { 0%,100% { opacity: 1; box-shadow: 0 0 9px var(--accent), 0 0 3px #fff; } 50% { opacity: 0.4; box-shadow: 0 0 4px var(--accent); } }

  .seg { display: flex; gap: 3px; border: 1px solid var(--hair); border-radius: 999px; padding: 3px; }
  .seg button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; font-family: var(--font-ui); font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); cursor: pointer; background: transparent; border: 0; border-radius: 999px; padding: 6px 4px; transition: color .15s, background .15s; }
  .seg button:hover { color: var(--text-strong); }
  .seg button.on { color: var(--on-accent); background: var(--accent); font-weight: 600; box-shadow: 0 0 12px rgba(58,160,255,0.45); }
  .seg--sm { width: 132px; flex: none; }
  .seg--sm button { padding: 5px 4px; }

  .sliderlbl { display: flex; align-items: baseline; justify-content: space-between; margin: 13px 0 8px; }
  .sliderlbl span:first-child { font-size: 13px; color: var(--text); }
  .sliderlbl .mono { font-size: 13px; color: var(--text-strong); }

  /* standings ladder */
  .std__bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .std__tick { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim); }
  .std__tick strong { color: var(--text); margin-left: 4px; font-weight: 500; }
  .std__cols { display: grid; grid-template-columns: 1.9fr 0.85fr 0.85fr 0.7fr 0.8fr; gap: 4px; padding: 0 8px 6px; font-size: 9.5px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--dim); }
  .std__cols span:not(:first-child) { text-align: right; }
  .std__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .std__list li { display: block; }
  .std__row {
    position: relative; width: 100%; display: grid; grid-template-columns: 1.9fr 0.85fr 0.85fr 0.7fr 0.8fr; gap: 4px; align-items: center;
    padding: 9px 9px 11px; border: 0; border-left: 2px solid var(--pc); border-radius: 8px; cursor: pointer;
    font-family: var(--font-data); font-size: 12.5px; color: var(--text);
    background: linear-gradient(90deg, color-mix(in srgb, var(--pc) 13%, transparent), transparent 66%);
    transition: background .15s, box-shadow .15s;
    overflow: hidden;
  }
  .std__row > span:not(.std__who):not(.std__meter) { text-align: right; }
  .std__row:hover { background: linear-gradient(90deg, color-mix(in srgb, var(--pc) 22%, transparent), transparent 70%); }
  .std__row.is-leader { background: linear-gradient(90deg, color-mix(in srgb, var(--pc) 26%, transparent), color-mix(in srgb, var(--pc) 5%, transparent) 78%); box-shadow: inset 0 0 18px color-mix(in srgb, var(--pc) 12%, transparent); }
  .std__row.is-selected { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pc) 75%, transparent), 0 0 14px color-mix(in srgb, var(--pc) 20%, transparent); }
  .std__who { display: flex; align-items: center; gap: 8px; font-family: var(--font-ui); letter-spacing: 0.02em; text-align: left; }
  .std__rank { font-size: 11px; color: var(--dim); width: 13px; text-align: center; }
  .std__crown { display: inline-flex; width: 13px; filter: drop-shadow(0 0 5px currentColor); }
  .std__chip { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; color: var(--pc); background: color-mix(in srgb, var(--pc) 16%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pc) 45%, transparent); }
  .std__name { color: var(--text-strong); font-weight: 500; }
  .std__prod { color: var(--muted); }
  .std__meter { position: absolute; left: 9px; right: 9px; bottom: 4px; height: 2.5px; border-radius: 999px; background: color-mix(in srgb, var(--pc) 20%, transparent); overflow: hidden; }
  .std__meter::after { content: ""; position: absolute; left: 0; top: 0; height: 100%; width: var(--w); border-radius: 999px; background: var(--pc); box-shadow: 0 0 8px var(--pc); transition: width .3s ease; }
  .std__totals { display: grid; grid-template-columns: 1.9fr 0.85fr 0.85fr 0.7fr 0.8fr; gap: 4px; padding: 11px 9px 2px; margin-top: 6px; border-top: 1px solid var(--hair); font-family: var(--font-data); font-size: 12px; color: var(--muted); }
  .std__totals span:not(:first-child) { text-align: right; }
  .std__totals span:first-child { font-family: var(--font-ui); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim); }

  /* star view */
  .star__hero { display: flex; align-items: center; gap: 15px; margin-bottom: 14px; }
  .gauge { position: relative; width: 76px; height: 76px; flex-shrink: 0; }
  .gauge svg { width: 76px; height: 76px; transform: rotate(-90deg); }
  .gauge__ticks line { stroke: var(--hair); stroke-width: 1.5; }
  .gauge__track { fill: none; stroke: var(--track); stroke-width: 4; }
  .gauge__val { fill: none; stroke: var(--accent); stroke-width: 4; stroke-linecap: round; stroke-dasharray: var(--circ); stroke-dashoffset: var(--off); filter: drop-shadow(0 0 5px var(--accent-glow)); animation: gauge-in 1.1s cubic-bezier(.2,.8,.2,1); }
  @keyframes gauge-in { from { stroke-dashoffset: var(--circ); } to { stroke-dashoffset: var(--off); } }
  .gauge__center { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; line-height: 1; }
  .gauge__pct { font-size: 22px; color: var(--text-strong); }
  .gauge__unit { font-size: 11px; color: var(--accent-strong); margin-left: 1px; }
  .gauge__lbl { font-size: 7.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--dim); margin-top: 4px; }
  .star__id { min-width: 0; }
  .star__name { font-family: var(--font-brand); font-size: 19px; font-weight: 600; letter-spacing: 0.04em; color: var(--text-strong); }
  .star__meta { display: flex; align-items: center; gap: 10px; margin-top: 3px; font-size: 12px; }
  .star__type { display: inline-flex; align-items: center; gap: 5px; font-weight: 600; }
  .star__owner { display: inline-flex; align-items: center; gap: 7px; margin-top: 7px; font-size: 12.5px; color: var(--muted); }
  .star__ownerchip { width: 20px; height: 20px; }

  .star__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--hair); border-radius: 9px; overflow: hidden; }
  .cell { background: var(--inset); padding: 9px 10px; }
  .cell__k { display: flex; align-items: center; gap: 5px; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--dim); }
  .cell__v { display: block; font-size: 18px; color: var(--text-strong); margin-top: 3px; }
  .star__targets { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--hair); display: flex; flex-direction: column; gap: 7px; }
  .kv { display: flex; align-items: baseline; justify-content: space-between; }
  .kv span:first-child { font-size: 12px; color: var(--muted); }
  .kv .mono { font-size: 13px; color: var(--text-strong); }
  .kv .none { color: var(--dim); }

  /* footer */
  .gs { max-width: 1180px; margin: 34px auto 0; }
  .gs h2 { margin: 0 0 16px; font-family: var(--font-brand); font-size: 15px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent-strong); }
  .gs ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .gs li { display: flex; gap: 12px; font-size: 14px; color: var(--muted); line-height: 1.5; padding: 15px 16px; border: 1px solid var(--hair); border-radius: 12px; background: color-mix(in srgb, var(--text-strong) 2.5%, transparent); }
  .gs__n { flex-shrink: 0; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 6px; font-family: var(--font-data); font-size: 12px; font-weight: 600; color: var(--accent); border: 1px solid rgba(58,160,255,0.4); background: rgba(58,160,255,0.08); }
  .gs b { color: var(--text-strong); font-weight: 600; }
  .gs__foot { max-width: 68ch; margin: 18px 0 0; font-size: 13px; color: var(--dim); line-height: 1.6; }

  @media (max-width: 1000px) { .body { grid-template-columns: 1fr; } .gs ul { grid-template-columns: 1fr; } .tb__command { display: none; } }
  @media (prefers-reduced-motion: reduce) {
    .livedot, .gauge__val { animation: none; }
    .back, .mtile, .iconbtn, .subtab, .seg button, .std__row, .switch, .switch::after, .std__meter::after { transition: none; }
  }
</style>
