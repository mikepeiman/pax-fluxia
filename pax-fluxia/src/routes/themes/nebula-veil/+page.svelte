<script lang="ts">
  import "../../../app.css";
  import { goto } from "$app/navigation";

  // ---- data (game-true naming; illustrative values) ----
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
    { id: "vector", label: "Vector" }, { id: "edges", label: "Edges" },
    { id: "ember", label: "Ember" }, { id: "field", label: "Field" },
    { id: "grad", label: "Grad" }, { id: "off", label: "Off" },
  ];

  const speeds = [
    { id: "pause", label: "Pause" }, { id: "1", label: "1×" }, { id: "2", label: "2×" },
    { id: "4", label: "4×" }, { id: "10", label: "10×" },
  ];

  // ---- interactive state ----
  let activeMode = $state("vector");
  let speed = $state("pause");
  let shipFocus = $state<"active" | "total">("active");
  let selectedId = $state<string | null>(null);
  let blendedBorders = $state(true);
  let starMargin = $state(185);
  let starBias = $state(1.1);
  let extent = $state(135);

  const sorted = $derived(
    [...players].sort((a, b) =>
      shipFocus === "active" ? b.active - a.active : b.total - a.total,
    ),
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

  // selected star (Attack star owned by AI 3)
  const star = { name: "Star 38", type: "Attack", owner: players[1], active: 24, damaged: 4, prod: 1, repair: 20, transfer: 0.1, activation: 0.5 };
  const integrity = Math.round(((star.active - star.damaged) / star.active) * 100);

  // gauge geometry
  const GR = 26;
  const GC = 2 * Math.PI * GR;
  const gaugeOffset = (v: number) => GC * (1 - v / 100);

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
    {:else if name === "pause"}<path d="M9 6v12M15 6v12" stroke-width="2.4" />
    {:else if name === "play"}<path d="M8 5l11 7-11 7z" />
    {:else if name === "vector"}<circle cx="6" cy="8" r="1.6" /><circle cx="18" cy="7" r="1.6" /><circle cx="12" cy="17.5" r="1.6" /><path d="M7.4 8.7l3.4 7M16.7 8l-4 8M7.3 8.3l9.6-.9" />
    {:else if name === "edges"}<path d="M12 3l8 4.6v8.8L12 21l-8-4.6V7.6z" />
    {:else if name === "ember"}<path d="M12 3.5v3.5M12 17v3.5M3.5 12H7M17 12h3.5" /><circle cx="12" cy="12" r="2.2" />
    {:else if name === "field"}<rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 10h16M4 16h16M10 4v16M16 4v16" />
    {:else if name === "grad"}<path d="M6 7.5h12M6 12h9M6 16.5h6" />
    {:else if name === "off"}<circle cx="12" cy="12" r="8" /><path d="M6.5 6.5l11 11" />
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
    <div class="lead__brand"><h1>Nebula Veil</h1><span>Crisp · esports</span></div>
    <p class="lead__note">
      The same console, taken from token-variant to shippable. What's new: a real inline-SVG icon
      set (no emoji), per-player <b>sigils</b> for identity + colourblind read, a circular
      <b>integrity gauge</b>, live sorting / selection / sliders, and full hover · active · focus
      states. Everything is interactive — click modes, sort the table, drag a slider, tab through it.
    </p>
  </header>

  <section class="screen">
    <!-- ===================== TOPBAR ===================== -->
    <div class="tb">
      <div class="tb__brand">
        <button class="iconbtn" title="Main menu" aria-label="Main menu">{@render icon("menu", 18)}</button>
        <span class="tb__sigil" style="color:{players[0].color}">{@render sigil("command", 18)}</span>
        <span class="tb__title">Pax Fluxia</span>
        <span class="tb__map">arena-further</span>
      </div>

      <div class="tb__match">
        <div class="tb__stat tb__stat--live"><span>Tick</span><strong class="mono">0</strong></div>
        <div class="tb__pause">{@render icon("pause", 12)} Paused</div>
        <div class="tb__stat"><span>Selected</span><strong class="sel">Star 38</strong></div>
      </div>

      <div class="tb__diag" title="Diagnostics — hidden outside dev builds">
        <span class="tb__tag">Dev</span><span class="mono">120 fps</span><span class="mono">2,569 ships</span>
      </div>

      <div class="tb__modes" role="group" aria-label="Territory render mode">
        {#each renderModes as m}
          <button class="mode" class:mode--active={activeMode === m.id} onclick={() => (activeMode = m.id)} title={m.label}>
            {@render icon(m.id, 15)}<span>{m.label}</span>
          </button>
        {/each}
      </div>

      <button class="tb__badge" title="Collapse player standings">
        <span class="tb__badge-sig" style="color:{players[0].color}">{@render sigil("command", 14)}</span>
        <span>You</span><strong class="mono">686</strong>{@render icon("chevron-down", 14)}
      </button>
    </div>

    <div class="body">
      <!-- ===================== SETTINGS ===================== -->
      <aside class="settings" aria-label="Settings">
        <label class="search">
          {@render icon("search", 16)}
          <input type="text" placeholder="Search settings…" />
        </label>

        <div class="cat">{@render icon("edges", 17)}<h2>Territory &amp; Render</h2></div>
        <div class="subtabs" role="tablist">
          <button class="subtab subtab--active" role="tab" aria-selected="true">All</button>
          <button class="subtab" role="tab" aria-selected="false">Topology</button>
          <button class="subtab" role="tab" aria-selected="false">Render</button>
          <button class="subtab" role="tab" aria-selected="false">Frontier</button>
        </div>

        <div class="eyebrow">Territory Topology</div>
        <p class="grouplbl">Topology Rules</p>

        <div class="ctrl">
          <div class="ctrl__head"><span>Minimum Star Margin</span><span class="mono val">{starMargin} px</span></div>
          <input class="range" type="range" min="60" max="260" bind:value={starMargin}
            style="--val:{pct(starMargin, 60, 260)}%" aria-label="Minimum star margin" />
        </div>
        <div class="ctrl">
          <div class="ctrl__head"><span>Star Bias</span><span class="mono val">{starBias.toFixed(2)}</span></div>
          <input class="range" type="range" min="0.5" max="2" step="0.05" bind:value={starBias}
            style="--val:{pct(starBias, 0.5, 2)}%" aria-label="Star bias" />
        </div>
        <div class="ctrl">
          <div class="ctrl__head"><span>Extent Beyond Map</span><span class="mono val">{extent} px</span></div>
          <input class="range" type="range" min="0" max="300" bind:value={extent}
            style="--val:{pct(extent, 0, 300)}%" aria-label="Extent beyond map" />
        </div>

        <div class="gated"><span class="gated__t"><span class="switch" aria-hidden="true"></span> Corridor Virtual Sites</span><span class="gated__h">6 controls hidden</span></div>
        <div class="gated"><span class="gated__t"><span class="switch" aria-hidden="true"></span> Disconnect Gaps</span><span class="gated__h">2 controls hidden</span></div>

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
          <input class="range" type="range" min="100" max="5000" step="50" value="1400"
            style="--val:{pct(1400, 100, 5000)}%" aria-label="Tick duration" />
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
                  class:is-selected={selectedId === p.id}
                  style="--pc:{p.color}"
                  onclick={() => (selectedId = selectedId === p.id ? null : p.id)}
                  aria-pressed={selectedId === p.id}
                >
                  <span class="std__who">
                    <span class="std__rank mono">{i + 1}</span>
                    <span class="std__sig" style="color:{p.color}">{@render sigil(p.sigil, 15)}</span>
                    <span class="std__name">{p.name}</span>
                  </span>
                  <span class="mono">{p.active}</span>
                  <span class="mono">{p.total}</span>
                  <span class="mono">{p.stars}</span>
                  <span class="mono std__prod">+{p.prod}</span>
                  <span class="std__meter" style="--w:{(value / leader) * 100}%"></span>
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
            <div class="gauge" role="img" aria-label={`Integrity ${integrity} percent`}>
              <svg viewBox="0 0 64 64">
                <circle class="gauge__track" cx="32" cy="32" r={GR} />
                <circle class="gauge__val" cx="32" cy="32" r={GR}
                  style="--circ:{GC}; --off:{gaugeOffset(integrity)}" />
              </svg>
              <span class="gauge__type" style="color:#34e0a0">{@render icon("atk-star", 22)}</span>
            </div>
            <div class="star__id">
              <div class="star__name">{star.name}</div>
              <div class="star__meta">
                <span class="star__type" style="color:#34e0a0">{star.type}</span>
                <span class="star__owner"><span style="color:{star.owner.color}">{@render sigil(star.owner.sigil, 12)}</span> {star.owner.name}</span>
              </div>
              <div class="star__integ"><span class="mono">{integrity}%</span> integrity</div>
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
    <h2>What makes this "gold standard"</h2>
    <ul>
      <li>{@render icon("edges", 15)}<span><b>Real icon set.</b> Every glyph is inline stroke-SVG on a 24-grid — no emoji, no unicode. That single change is most of the jump from "decent" to "pro".</span></li>
      <li>{@render icon("command", 15)}<span><b>Player sigils.</b> Each player carries a geometric emblem, not just a colour — identity that survives colourblindness and small sizes.</span></li>
      <li>{@render icon("target", 15)}<span><b>Data gets designed.</b> A circular integrity gauge with a load sweep, and per-row meters under the standings — numbers earn a visual, not just a column.</span></li>
      <li>{@render icon("active", 15)}<span><b>Every state is handled.</b> Hover, active, selected, focus-visible (tab through it), disabled. Sort the table, drag a slider, flip a toggle — it all responds.</span></li>
    </ul>
    <p class="gs__foot">Single-theme by design (this is the Nebula Veil build). Next: lock this as the bar, then bring Aurelia / Cyber Flux / Starglass / Broadcast up to it — reusing this icon + sigil + gauge kit.</p>
  </footer>
</div>

<style>
  .nv {
    color-scheme: dark;
    --ground: #06070f;
    --screen-bg: #070912;
    --panel-bg: linear-gradient(180deg, rgba(15,19,34,0.94), rgba(10,12,22,0.96));
    --panel-brd: rgba(126,150,210,0.20);
    --panel-brd-hi: rgba(130,170,255,0.45);
    --hair: rgba(126,150,210,0.14);
    --inset: rgba(16,22,40,0.85);
    --track: #141b30;

    --text-strong: #eef2fb;
    --text: rgba(210,220,242,0.92);
    --muted: rgba(158,172,205,0.86);
    --dim: rgba(112,124,156,0.82);

    --accent: #3aa0ff;
    --accent-strong: #86c4ff;
    --frame: #8b93b8;
    --on-accent: #04070f;

    --font-ui: "Rajdhani", "Segoe UI", system-ui, sans-serif;
    --font-brand: "Bahnschrift", "Rajdhani", sans-serif;
    --font-data: "JetBrains Mono", "Cascadia Mono", ui-monospace, monospace;

    min-height: 100vh;
    background:
      radial-gradient(ellipse at 12% 4%, rgba(150,90,230,0.12), transparent 40%),
      radial-gradient(ellipse at 88% 2%, rgba(60,140,255,0.12), transparent 40%),
      radial-gradient(ellipse at 78% 96%, rgba(255,170,70,0.08), transparent 44%),
      var(--ground);
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 15px;
    line-height: 1.5;
    letter-spacing: 0.01em;
    padding: 40px clamp(16px, 4vw, 64px) 72px;
  }
  .nv { box-sizing: border-box; }
  .nv :global(*) { box-sizing: border-box; }

  .mono { font-family: var(--font-data); font-variant-numeric: tabular-nums; }
  .ic { display: block; flex-shrink: 0; }
  .sig { display: block; }

  :where(.nv button, .nv input, .nv .std__row):focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 2px;
    border-radius: 8px;
  }

  .back {
    position: fixed; top: 18px; left: 18px; z-index: 10;
    display: inline-flex; align-items: center; gap: 6px;
    font: 600 13px/1 var(--font-ui); letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--muted); background: var(--inset); cursor: pointer;
    border: 1px solid var(--panel-brd); border-radius: 999px; padding: 8px 15px 8px 11px;
    transition: color .15s, border-color .15s, transform .15s;
  }
  .back:hover { color: var(--text-strong); border-color: var(--panel-brd-hi); transform: translateX(-2px); }

  /* ---- lead ---- */
  .lead { max-width: 1180px; margin: 0 auto 26px; }
  .lead__kicker { margin: 0 0 12px; font-size: 12px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--accent); }
  .lead__brand { display: flex; align-items: baseline; gap: 15px; flex-wrap: wrap; }
  .lead__brand h1 { margin: 0; font-family: var(--font-brand); font-weight: 600; font-size: clamp(30px, 5vw, 50px); letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-strong); }
  .lead__brand span { font-size: 13px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--frame); }
  .lead__note { max-width: 66ch; margin: 12px 0 0; color: var(--muted); font-size: 15.5px; line-height: 1.6; }
  .lead__note b { color: var(--text-strong); font-weight: 600; }

  /* ---- screen ---- */
  .screen {
    max-width: 1180px; margin: 0 auto; background: var(--screen-bg);
    border: 1px solid var(--panel-brd); border-radius: 16px; overflow: hidden;
    box-shadow: 0 24px 60px rgba(0,0,0,0.5);
  }

  .iconbtn {
    display: grid; place-items: center; width: 34px; height: 34px; cursor: pointer;
    color: var(--muted); background: var(--inset);
    border: 1px solid var(--panel-brd); border-radius: 9px;
    transition: color .15s, border-color .15s, background .15s;
  }
  .iconbtn:hover { color: var(--text-strong); border-color: var(--panel-brd-hi); }
  .iconbtn.sm { width: 28px; height: 28px; border-radius: 8px; }

  /* topbar */
  .tb { display: flex; align-items: center; gap: 18px; height: 58px; padding: 0 14px; background: linear-gradient(180deg, rgba(13,17,32,0.96), rgba(8,10,20,0.97)); border-bottom: 1px solid var(--panel-brd); }
  .tb__brand { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .tb__sigil { display: inline-flex; }
  .tb__title { font-family: var(--font-brand); font-size: 17px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-strong); }
  .tb__map { font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); padding-left: 10px; border-left: 1px solid var(--hair); }

  .tb__match { display: flex; align-items: center; gap: 15px; margin: 0 auto; }
  .tb__stat { display: flex; align-items: baseline; gap: 7px; }
  .tb__stat span { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--dim); }
  .tb__stat strong { font-family: var(--font-data); font-size: 16px; color: var(--text-strong); font-weight: 500; }
  .tb__stat--live strong { color: var(--accent-strong); }
  .tb__stat .sel { font-family: var(--font-ui); color: var(--accent-strong); font-weight: 600; }
  .tb__pause { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); border: 1px solid rgba(58,160,255,0.4); border-radius: 999px; padding: 4px 11px; background: rgba(58,160,255,0.08); }

  .tb__diag { display: flex; align-items: center; gap: 9px; flex-shrink: 0; padding: 4px 9px; border-radius: 8px; background: rgba(0,0,0,0.28); }
  .tb__tag { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); border: 1px solid var(--hair); border-radius: 4px; padding: 1px 5px; }
  .tb__diag .mono { font-size: 12px; color: var(--dim); }

  .tb__modes { display: flex; gap: 3px; flex-shrink: 0; }
  .mode { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-ui); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); cursor: pointer; background: var(--inset); border: 1px solid var(--hair); border-radius: 8px; padding: 6px 9px; transition: color .15s, border-color .15s, background .15s; }
  .mode:hover { color: var(--text-strong); border-color: var(--panel-brd); }
  .mode--active { color: var(--on-accent); background: var(--accent); border-color: var(--accent); font-weight: 600; }

  .tb__badge { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; cursor: pointer; font-family: var(--font-ui); font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-strong); padding: 6px 12px; border-radius: 999px; border: 1px solid var(--panel-brd-hi); background: rgba(58,160,255,0.10); transition: background .15s; }
  .tb__badge:hover { background: rgba(58,160,255,0.18); }
  .tb__badge .mono { color: var(--accent-strong); }
  .tb__badge-sig { display: inline-flex; }

  /* body */
  .body { display: grid; grid-template-columns: 326px 1fr 314px; min-height: 610px; }

  /* settings */
  .settings { background: var(--panel-bg); border-right: 1px solid var(--hair); padding: 15px; display: flex; flex-direction: column; gap: 12px; }
  .search { display: flex; align-items: center; gap: 9px; border: 1px solid var(--panel-brd); border-radius: 9px; padding: 0 11px; height: 38px; color: var(--dim); background: var(--inset); }
  .search input { flex: 1; border: 0; background: transparent; color: var(--text); font: inherit; font-size: 13px; outline: none; }
  .search input::placeholder { color: var(--dim); }
  .cat { display: flex; align-items: center; gap: 9px; color: var(--accent); }
  .cat h2 { margin: 0; font-size: 14px; font-weight: 600; letter-spacing: 0.13em; text-transform: uppercase; color: var(--text-strong); }
  .subtabs { display: flex; gap: 5px; flex-wrap: wrap; }
  .subtab { font-size: 10.5px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--muted); padding: 5px 11px; border-radius: 999px; border: 1px solid var(--hair); cursor: pointer; background: transparent; transition: color .15s, border-color .15s; }
  .subtab:hover { color: var(--text-strong); border-color: var(--panel-brd); }
  .subtab--active { color: var(--on-accent); background: var(--accent); border-color: var(--accent); font-weight: 600; }
  .eyebrow { display: flex; align-items: center; gap: 8px; margin-top: 3px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); }
  .eyebrow::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(58,160,255,0.4), transparent); }
  .grouplbl { margin: 8px 0 2px; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--dim); }

  .ctrl { display: flex; flex-direction: column; gap: 8px; }
  .ctrl__head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .ctrl__head span:first-child { font-size: 13.5px; color: var(--text); }
  .val { font-size: 13px; color: var(--text-strong); }

  /* real range input */
  .range { -webkit-appearance: none; appearance: none; width: 100%; height: 18px; background: transparent; cursor: pointer; margin: 0; }
  .range::-webkit-slider-runnable-track { height: 4px; border-radius: 999px; background: linear-gradient(90deg, var(--accent) 0 var(--val), var(--track) var(--val) 100%); }
  .range::-moz-range-track { height: 4px; border-radius: 999px; background: var(--track); }
  .range::-moz-range-progress { height: 4px; border-radius: 999px; background: var(--accent); }
  .range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 13px; height: 13px; margin-top: -4.5px; border-radius: 999px; background: var(--accent-strong); border: 2px solid var(--screen-bg); box-shadow: 0 0 0 1px rgba(58,160,255,0.5); transition: transform .12s; }
  .range::-moz-range-thumb { width: 13px; height: 13px; border-radius: 999px; background: var(--accent-strong); border: 2px solid var(--screen-bg); box-shadow: 0 0 0 1px rgba(58,160,255,0.5); }
  .range:hover::-webkit-slider-thumb { transform: scale(1.15); }

  .gated { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 0; border-top: 1px solid var(--hair); }
  .gated__t { display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--muted); }
  .gated__h { font-size: 11px; color: var(--dim); font-style: italic; }

  .switch { width: 38px; height: 21px; border-radius: 999px; background: var(--track); border: 1px solid var(--hair); position: relative; flex-shrink: 0; transition: background .15s, border-color .15s; }
  .switch::after { content: ""; position: absolute; width: 15px; height: 15px; border-radius: 999px; background: var(--dim); top: 2px; left: 2px; transition: left .15s, background .15s; }
  .switch--on { background: rgba(58,160,255,0.28); border-color: var(--accent); }
  .switch--on::after { left: 19px; background: var(--accent-strong); }
  .togglerow { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 0; border-top: 1px solid var(--hair); background: none; border-left: 0; border-right: 0; border-bottom: 0; cursor: pointer; color: var(--text); font: inherit; }
  .togglerow > span:first-child { font-size: 13.5px; }

  /* map */
  .map { position: relative; display: grid; place-items: center; overflow: hidden;
    background:
      radial-gradient(ellipse at 26% 28%, rgba(150,90,230,0.16), transparent 40%),
      radial-gradient(ellipse at 74% 24%, rgba(60,150,255,0.16), transparent 40%),
      radial-gradient(ellipse at 32% 82%, rgba(52,224,208,0.10), transparent 40%),
      radial-gradient(ellipse at 80% 80%, rgba(255,190,74,0.10), transparent 42%),
      radial-gradient(circle 1px at 40% 40%, rgba(255,255,255,0.22) 1px, transparent 0),
      radial-gradient(circle 1px at 62% 66%, rgba(255,255,255,0.16) 1px, transparent 0),
      radial-gradient(circle 1px at 24% 70%, rgba(255,255,255,0.14) 1px, transparent 0),
      #080a14;
  }
  .map__tag { text-align: center; color: var(--dim); font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; padding: 13px 20px; border: 1px dashed var(--hair); border-radius: 12px; background: rgba(6,8,18,0.55); }
  .map__tag b { display: block; color: var(--muted); margin-bottom: 4px; letter-spacing: 0.13em; }

  /* rail */
  .rail { background: var(--screen-bg); border-left: 1px solid var(--hair); padding: 13px; display: flex; flex-direction: column; gap: 13px; }
  .panel { background: var(--panel-bg); border: 1px solid var(--panel-brd); border-radius: 13px; padding: 13px 14px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
  .panel__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
  .panel__eyebrow { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); }
  .panel__title { margin: 3px 0 0; font-size: 15px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-strong); }
  .tools { display: flex; gap: 5px; }
  .livedot { width: 7px; height: 7px; border-radius: 999px; background: var(--accent); box-shadow: 0 0 7px var(--accent); animation: nv-pulse 2.4s ease-in-out infinite; }
  @keyframes nv-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

  .seg { display: flex; gap: 3px; border: 1px solid var(--hair); border-radius: 999px; padding: 3px; }
  .seg button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; font-family: var(--font-ui); font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); cursor: pointer; background: transparent; border: 0; border-radius: 999px; padding: 6px 4px; transition: color .15s, background .15s; }
  .seg button:hover { color: var(--text-strong); }
  .seg button.on { color: var(--on-accent); background: var(--accent); font-weight: 600; }
  .seg--sm { width: 132px; flex: none; }
  .seg--sm button { padding: 5px 4px; }

  .sliderlbl { display: flex; align-items: baseline; justify-content: space-between; margin: 13px 0 8px; }
  .sliderlbl span:first-child { font-size: 13px; color: var(--text); }
  .sliderlbl .mono { font-size: 13px; color: var(--text-strong); }

  /* standings */
  .std__bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .std__tick { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim); }
  .std__tick strong { color: var(--text); margin-left: 4px; font-weight: 500; }
  .std__cols { display: grid; grid-template-columns: 1.8fr 0.85fr 0.85fr 0.7fr 0.8fr; gap: 4px; padding: 0 8px 6px; font-size: 9.5px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--dim); }
  .std__cols span:not(:first-child) { text-align: right; }
  .std__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
  .std__list li { display: block; }
  .std__row {
    position: relative; width: 100%; display: grid; grid-template-columns: 1.8fr 0.85fr 0.85fr 0.7fr 0.8fr; gap: 4px; align-items: center;
    padding: 8px; border: 0; border-left: 2px solid var(--pc); border-radius: 8px; cursor: pointer;
    font-family: var(--font-data); font-size: 12.5px; color: var(--text);
    background: linear-gradient(90deg, color-mix(in srgb, var(--pc) 12%, transparent), transparent 68%);
    transition: background .15s, transform .1s;
    overflow: hidden;
  }
  .std__row > span:not(.std__who):not(.std__meter) { text-align: right; }
  .std__row:hover { background: linear-gradient(90deg, color-mix(in srgb, var(--pc) 20%, transparent), transparent 70%); }
  .std__row.is-local { background: linear-gradient(90deg, color-mix(in srgb, var(--pc) 22%, transparent), transparent 72%); }
  .std__row.is-selected { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pc) 70%, transparent); }
  .std__who { display: flex; align-items: center; gap: 7px; font-family: var(--font-ui); letter-spacing: 0.02em; text-align: left; }
  .std__rank { font-size: 11px; color: var(--dim); width: 11px; }
  .std__sig { display: inline-flex; }
  .std__name { color: var(--text-strong); }
  .std__prod { color: var(--muted); }
  .std__meter { position: absolute; left: 8px; right: 8px; bottom: 3px; height: 2px; border-radius: 999px; background: color-mix(in srgb, var(--pc) 22%, transparent); }
  .std__meter::after { content: ""; position: absolute; left: 0; top: 0; height: 100%; width: var(--w); border-radius: 999px; background: var(--pc); }
  .std__totals { display: grid; grid-template-columns: 1.8fr 0.85fr 0.85fr 0.7fr 0.8fr; gap: 4px; padding: 10px 8px 2px; margin-top: 6px; border-top: 1px solid var(--hair); font-family: var(--font-data); font-size: 12px; color: var(--muted); }
  .std__totals span:not(:first-child) { text-align: right; }
  .std__totals span:first-child { font-family: var(--font-ui); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim); }

  /* star view */
  .star__hero { display: flex; align-items: center; gap: 14px; margin-bottom: 13px; }
  .gauge { position: relative; width: 64px; height: 64px; flex-shrink: 0; }
  .gauge svg { width: 64px; height: 64px; transform: rotate(-90deg); }
  .gauge__track { fill: none; stroke: var(--track); stroke-width: 4; }
  .gauge__val { fill: none; stroke: var(--accent); stroke-width: 4; stroke-linecap: round; stroke-dasharray: var(--circ); stroke-dashoffset: var(--off); animation: gauge-in 1.1s cubic-bezier(.2,.8,.2,1); }
  @keyframes gauge-in { from { stroke-dashoffset: var(--circ); } to { stroke-dashoffset: var(--off); } }
  .gauge__type { position: absolute; inset: 0; display: grid; place-items: center; }
  .star__id { min-width: 0; }
  .star__name { font-size: 17px; font-weight: 600; color: var(--text-strong); }
  .star__meta { display: flex; align-items: center; gap: 10px; margin-top: 2px; font-size: 12px; color: var(--muted); }
  .star__type { font-weight: 600; }
  .star__owner { display: inline-flex; align-items: center; gap: 5px; }
  .star__integ { margin-top: 5px; font-size: 12px; color: var(--dim); }
  .star__integ .mono { color: var(--accent-strong); font-size: 13px; }

  .star__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--hair); border-radius: 9px; overflow: hidden; }
  .cell { background: var(--inset); padding: 9px 10px; }
  .cell__k { display: flex; align-items: center; gap: 5px; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--dim); }
  .cell__v { display: block; font-size: 18px; color: var(--text-strong); margin-top: 3px; }
  .star__targets { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--hair); display: flex; flex-direction: column; gap: 7px; }
  .kv { display: flex; align-items: baseline; justify-content: space-between; }
  .kv span:first-child { font-size: 12px; color: var(--muted); }
  .kv .mono { font-size: 13px; color: var(--text-strong); }
  .kv .none { color: var(--dim); }

  /* gold-standard footer */
  .gs { max-width: 1180px; margin: 34px auto 0; }
  .gs h2 { margin: 0 0 16px; font-size: 13px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--accent); }
  .gs ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .gs li { display: flex; gap: 11px; font-size: 14px; color: var(--muted); line-height: 1.5; padding: 14px 16px; border: 1px solid var(--hair); border-radius: 12px; background: color-mix(in srgb, var(--text-strong) 2.5%, transparent); }
  .gs li > :global(svg) { color: var(--accent); flex-shrink: 0; margin-top: 2px; }
  .gs b { color: var(--text-strong); font-weight: 600; }
  .gs__foot { max-width: 66ch; margin: 18px 0 0; font-size: 13px; color: var(--dim); line-height: 1.6; }

  @media (max-width: 1000px) { .body { grid-template-columns: 1fr; } .gs ul { grid-template-columns: 1fr; } }
  @media (prefers-reduced-motion: reduce) {
    .livedot { animation: none; }
    .gauge__val { animation: none; }
    .back, .mode, .iconbtn, .subtab, .seg button, .std__row, .switch, .switch::after { transition: none; }
  }
</style>
