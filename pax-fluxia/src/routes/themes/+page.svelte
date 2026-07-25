<script lang="ts">
  import "../../app.css";
  import { goto } from "$app/navigation";
  import { flip } from "svelte/animate";
  // The REAL shipped design-system components. They read --pax-ui-* tokens,
  // which the .stage block below aliases onto each lab theme — so what you see
  // here is the actual component under the actual theme, not a lookalike.
  import {
    PaxHudButton,
    PaxHudIconButton,
    PaxHudPanel,
    PaxHudRange,
    PaxHudSegmentedControl,
    PaxHudSelect,
    PaxHudTextInput,
    PaxInfoHint,
    PaxSettingsToggleRow,
    PaxSettingsRangeRow,
    PaxSettingsInfoRow,
    type PaxHudSegmentedOption,
  } from "$lib/design-system";

  type SigilName = "command" | "hex" | "tri" | "pent" | "diamond" | "ring";
  interface Player {
    id: string; name: string; color: string; sigil: SigilName;
    active: number; total: number; stars: number; prod: number; isLocal?: boolean;
  }

  const players: Player[] = [
    { id: "you", name: "You", color: "#4aa3ff", sigil: "command", active: 686, total: 686, stars: 25, prod: 25, isLocal: true },
    { id: "ai3", name: "AI 3", color: "#ff9a4a", sigil: "hex", active: 412, total: 423, stars: 14, prod: 14 },
    { id: "ai4", name: "AI 4", color: "#34e0a0", sigil: "tri", active: 358, total: 374, stars: 13, prod: 13 },
    { id: "ai5", name: "AI 5", color: "#b16bff", sigil: "pent", active: 350, total: 375, stars: 13, prod: 13 },
    { id: "ai1", name: "AI 1", color: "#ff5a6a", sigil: "diamond", active: 347, total: 362, stars: 11, prod: 11 },
    { id: "ai2", name: "AI 2", color: "#ffc24a", sigil: "ring", active: 340, total: 349, stars: 11, prod: 11 },
  ];

  const THEMES = [
    { id: "nebula-veil", name: "Nebula Veil", tag: "Lead", sw: ["#080a14", "#3aa0ff", "#b16bff"] },
    { id: "nebula-veil-v1", name: "Nebula Veil", tag: "v1 · predecessor", sw: ["#0a0c16", "#3aa0ff", "#8b93b8"] },
    { id: "aurelia-drift", name: "Aurelia Drift", tag: "Regal", sw: ["#081216", "#f6c469", "#55e7ef"] },
    { id: "neon-arcade", name: "Neon Arcade", tag: "Synthwave", sw: ["#05010c", "#ff2bbb", "#00e5ff"] },
    { id: "cyber-flux", name: "Cyber Flux", tag: "Neon", sw: ["#08040f", "#ff3cc0", "#22e6ff"] },
    { id: "starglass-prime", name: "Starglass Prime", tag: "Glass", sw: ["#0c1238", "#6fe6ff", "#9d8bff"] },
    { id: "broadcast-minimal", name: "Broadcast Minimal", tag: "Light", sw: ["#eceef1", "#2f6fe0", "#45536b"] },
  ];

  const renderModes = [
    { id: "vector", label: "Vector", desc: "Flat filled regions, crisp borders" },
    { id: "edges", label: "Edges", desc: "Glowing phase boundaries only" },
    { id: "ember", label: "Ember", desc: "Particle lattice over regions" },
    { id: "field", label: "Field", desc: "Smooth gradient influence field" },
    { id: "grad", label: "Grad", desc: "Gradient grid fill" },
    { id: "off", label: "Off", desc: "No territory render — bare starfield" },
  ];

  // Speed colours are semantic (per gamespeed.png): normal→blue, tactical→green,
  // high→purple, extreme→orange. Pause is neutral.
  const speeds = [
    { id: "pause", label: "Pause", tone: "var(--spd-pause)" },
    { id: "1", label: "1×", tone: "var(--spd-normal)" },
    { id: "2", label: "2×", tone: "var(--spd-fast)" },
    { id: "4", label: "4×", tone: "var(--spd-high)" },
    { id: "10", label: "10×", tone: "var(--spd-extreme)" },
  ];

  let theme = $state("nebula-veil");
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
  const leader = $derived(Math.max(...players.map((p) => (shipFocus === "active" ? p.active : p.total))));
  const totals = $derived(
    players.reduce(
      (acc, p) => ({ active: acc.active + p.active, total: acc.total + p.total, stars: acc.stars + p.stars, prod: acc.prod + p.prod }),
      { active: 0, total: 0, stars: 0, prod: 0 },
    ),
  );
  const pct = (v: number, min: number, max: number) => ((v - min) / (max - min)) * 100;

  // transfer/activation are stored as fractions; display as true percent (×100).
  const star = { name: "Star 38", type: "Attack", owner: players[1], active: 24, damaged: 4, prod: 1, repair: 20, transfer: 0.1, activation: 0.5 };
  const integrity = Math.round(((star.active - star.damaged) / star.active) * 100);
  const GR = 29;
  const GC = 2 * Math.PI * GR;
  const gaugeOff = GC * (1 - integrity / 100);

  const activeModeMeta = $derived(renderModes.find((m) => m.id === activeMode));

  // ---- live state for the real design-system components ----
  let dsSegment = $state("two");
  let dsSpeed = $state("1");
  let dsText = $state("Kepler Reach");
  let dsSelect = $state("balanced");
  let dsToggleA = $state(true);
  let dsToggleB = $state(false);
  let dsRange = $state(64);
  let dsSettingRange = $state(1.35);
  let dsPrimary = $state(true);

  const dsSegmentOptions: PaxHudSegmentedOption[] = [
    { value: "one", label: "One" },
    { value: "two", label: "Two" },
    { value: "three", label: "Three" },
  ];
  const dsSpeedOptions: PaxHudSegmentedOption[] = [
    { value: "0", label: "Pause", icon: "pause" },
    { value: "1", label: "1x", icon: "play-1" },
    { value: "2", label: "2x", icon: "play-2" },
    { value: "4", label: "4x", icon: "play-4" },
  ];
  const dsSelectOptions = [
    { value: "balanced", label: "Balanced" },
    { value: "aggressive", label: "Aggressive" },
    { value: "turtle", label: "Turtle" },
  ];

  function back() {
    if (typeof history !== "undefined" && history.length > 1) history.back();
    else void goto("/play");
  }
</script>

<svelte:head><title>Pax Fluxia — Theme Lab</title></svelte:head>

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
    {:else if name === "layers"}<path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z" /><path d="M4 12l8 4.3 8-4.3M4 15.7l8 4.3 8-4.3" />
    {:else if name === "pause"}<path d="M9 6v12M15 6v12" stroke-width="2.4" />
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

<div class="stage" data-theme={theme}>
  <button class="back" type="button" onclick={back} title="Back to menu">
    {@render icon("chevron-left", 16)} Menu
  </button>

  <header class="lead">
    <p class="lead__kicker">Theme lab · one screen, every identity</p>
    <div class="lead__brand"><h1>Pax&nbsp;Fluxia</h1><span class="lead__tag">{THEMES.find((t) => t.id === theme)?.name}</span></div>
    <p class="lead__note">
      The exact same console, reskinned live. Switch themes to compare identity, material and type
      across all versions in place — including the Nebula Veil predecessor. Everything below is
      interactive: pick a render mode, sort the ladder, drag a slider, change speed.
    </p>
  </header>

  <!-- ============ theme switcher (sticky) ============ -->
  <div class="switch-bar" role="group" aria-label="Theme">
    {#each THEMES as t}
      <button class="tsw" class:on={theme === t.id} onclick={() => (theme = t.id)}>
        <span class="tsw__sw">{#each t.sw as c}<i style="background:{c}"></i>{/each}</span>
        <span class="tsw__meta"><span class="tsw__name">{t.name}</span><span class="tsw__tag">{t.tag}</span></span>
      </button>
    {/each}
  </div>

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
        <p class="hint">Off the topbar now. Each tile previews what the mode draws — selecting one updates the map.</p>
        <div class="modes" role="radiogroup" aria-label="Render mode">
          {#each renderModes as m}
            <button class="mtile" class:on={activeMode === m.id} role="radio" aria-checked={activeMode === m.id} onclick={() => (activeMode = m.id)} title={m.desc}>
              <span class="mtile__vis" data-mode={m.id}>
                {#if activeMode === m.id}<span class="mtile__check">{@render icon("check", 13)}</span>{/if}
              </span>
              <span class="mtile__label">{m.label}</span>
            </button>
          {/each}
        </div>
        <p class="mode-desc"><strong>{activeModeMeta?.label}</strong> — {activeModeMeta?.desc}</p>

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
      <div class="map" data-mode={activeMode} aria-label="Star map (unchanged)">
        <div class="map__tag"><b>Starmap</b>reacts to render mode · {activeModeMeta?.label}</div>
      </div>

      <!-- ===================== RAIL ===================== -->
      <div class="rail">
        <!-- speed -->
        <section class="panel">
          <div class="panel__head"><div><p class="panel__eyebrow">Tempo</p><h3 class="panel__title">Game Speed</h3></div></div>
          <div class="seg seg--speed" role="group" aria-label="Game speed">
            {#each speeds as s}
              <button class:on={speed === s.id} style="--spd:{s.tone}" onclick={() => (speed = s.id)}>
                {#if s.id === "pause"}{@render icon("pause", 13)}{/if}<span>{s.label}</span>
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
            {#each sorted as p, i (p.id)}
              {@const value = shipFocus === "active" ? p.active : p.total}
              <li animate:flip={{ duration: 320 }}>
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
                    <span class="std__rank mono">{i + 1}</span>
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
              <div class="star__meta"><span class="star__type" style="color:#34e0a0">{@render icon("atk-star", 13)} {star.type}</span></div>
              <div class="star__owner"><span class="std__chip star__ownerchip" style="--pc:{star.owner.color}">{@render sigil(star.owner.sigil, 12)}</span> {star.owner.name}</div>
            </div>
          </div>

          <div class="star__grid">
            <div class="cell"><span class="cell__k">{@render icon("active", 12)} Active</span><span class="cell__v mono">{star.active}</span></div>
            <div class="cell"><span class="cell__k">{@render icon("damaged", 12)} Damaged</span><span class="cell__v mono">{star.damaged}</span></div>
            <div class="cell"><span class="cell__k">{@render icon("prod", 12)} Prod</span><span class="cell__v mono">{star.prod}</span></div>
            <div class="cell"><span class="cell__k">{@render icon("repair", 12)} Repair</span><span class="cell__v mono">{star.repair}%</span></div>
            <div class="cell"><span class="cell__k">{@render icon("transfer", 12)} Transfer</span><span class="cell__v mono">{(star.transfer * 100).toFixed(0)}%</span></div>
            <div class="cell"><span class="cell__k">{@render icon("activation", 12)} Activate</span><span class="cell__v mono">{(star.activation * 100).toFixed(0)}%</span></div>
          </div>

          <div class="star__targets">
            <div class="kv"><span>Current target</span><span class="mono">Star 27</span></div>
            <div class="kv"><span>Queued target</span><span class="mono none">None</span></div>
          </div>
        </section>
      </div>
    </div>
  </section>

  <!-- ============ REAL design-system components under the active theme ============ -->
  <section class="ds">
    <header class="ds__head">
      <h2>Live design-system components</h2>
      <p>
        These are the <strong>actual shipped components</strong> from
        <code>$lib/design-system</code> — not redraws. The lab aliases each theme onto the
        <code>--pax-ui-*</code> tokens they consume, so this is a true read on how the real UI
        behaves under every identity. All of it is interactive.
      </p>
    </header>

    <div class="ds__grid">
      <div class="ds__cell">
        <span class="ds__label">PaxHudButton</span>
        <div class="ds__row">
          <PaxHudButton label="Primary" active={dsPrimary} onclick={() => (dsPrimary = !dsPrimary)} />
          <PaxHudButton label="Secondary" onclick={() => {}} />
          <PaxHudButton label="Danger" danger onclick={() => {}} />
          <PaxHudButton label="Disabled" disabled onclick={() => {}} />
        </div>
      </div>

      <div class="ds__cell">
        <span class="ds__label">PaxHudIconButton</span>
        <div class="ds__row">
          <PaxHudIconButton icon="menu" title="Menu" onclick={() => {}} />
          <PaxHudIconButton icon="settings" title="Settings" onclick={() => {}} />
          <PaxHudIconButton icon="dock-left" title="Dock left" onclick={() => {}} />
          <PaxHudIconButton icon="chevron-up" title="Collapse" onclick={() => {}} />
          <PaxHudIconButton icon="atlas-star" title="Stars" onclick={() => {}} />
        </div>
      </div>

      <div class="ds__cell">
        <span class="ds__label">PaxHudSegmentedControl</span>
        <div class="ds__stack">
          <PaxHudSegmentedControl value={dsSegment} options={dsSegmentOptions} ariaLabel="Example segments" onValueChange={(v) => (dsSegment = v)} />
          <PaxHudSegmentedControl value={dsSpeed} options={dsSpeedOptions} ariaLabel="Speed" density="compact" iconSize={15} onValueChange={(v) => (dsSpeed = v)} />
        </div>
      </div>

      <div class="ds__cell">
        <span class="ds__label">PaxHudTextInput · PaxHudSelect</span>
        <div class="ds__stack">
          <PaxHudTextInput value={dsText} label="Map name" placeholder="Search systems…" onInput={(v) => (dsText = v)} />
          <PaxHudSelect value={dsSelect} options={dsSelectOptions} label="AI strategy" hint="How the AI weighs attack vs defence." onValueChange={(v) => (dsSelect = v)} />
        </div>
      </div>

      <div class="ds__cell">
        <span class="ds__label">PaxHudRange</span>
        <PaxHudRange label="Tick Duration" value={dsRange} min={0} max={100} step={1} output={`${dsRange}%`} ariaLabel="Example range" onInput={(v) => (dsRange = v)} />
      </div>

      <div class="ds__cell">
        <span class="ds__label">PaxInfoHint <PaxInfoHint text="Tooltips open after 50ms — hover the ⓘ." /></span>
        <div class="ds__row ds__row--wrap">
          <span class="ds__chip">Alpha</span>
          <span class="ds__chip">Beta</span>
          <span class="ds__chip ds__chip--live"><i></i>Live</span>
          <span class="ds__chip ds__chip--num">42</span>
        </div>
      </div>

      <div class="ds__cell ds__cell--wide">
        <span class="ds__label">Settings rows — PaxSettingsToggleRow · PaxSettingsRangeRow · PaxSettingsInfoRow</span>
        <PaxSettingsToggleRow label="Blended Opponent Borders" checked={dsToggleA} description="Blend the seam where two players meet." onChange={(c) => (dsToggleA = c)} />
        <PaxSettingsToggleRow label="Bind Duration To Tick" checked={dsToggleB} meta={dsToggleB ? "On" : "Off"} onChange={(c) => (dsToggleB = c)} />
        <PaxSettingsRangeRow label="Star Bias" value={dsSettingRange} min={0.5} max={2} step={0.05} onInput={(v) => (dsSettingRange = v)} />
        <PaxSettingsInfoRow label="Render mode" value={activeModeMeta?.label ?? "—"} />
      </div>

      <div class="ds__cell ds__cell--wide">
        <span class="ds__label">PaxHudPanel — the real panel shell</span>
        <PaxHudPanel title="Fleet Command" eyebrow="Live match">
          {#snippet actions()}
            <PaxHudIconButton icon="chevron-up" title="Collapse" onclick={() => {}} />
          {/snippet}
          <p class="ds__panelcopy">
            The panel shell renders its own eyebrow, title and action slot. Under each theme it
            picks up that theme's surface, border and type — proving the token contract end to end.
          </p>
          <PaxHudRange label="Fleet spread" value={dsRange} min={0} max={100} step={1} output={`${dsRange}%`} ariaLabel="Fleet spread" onInput={(v) => (dsRange = v)} />
        </PaxHudPanel>
      </div>
    </div>
  </section>

  <footer class="foot">
    <p><b>One screen, every theme.</b> Nothing is hidden on a separate route — the switcher above reskins this exact console <em>and</em> the real components below. Each theme re-casts material (shape, depth, glow, brand type) and the two accent roles.</p>
  </footer>
</div>

<style>
  /* =====================================================================
     BASE TOKENS  (= Nebula Veil, the lead). Each [data-theme] re-casts.
     ===================================================================== */
  .stage {
    color-scheme: dark;
    --ground: #05060e;
    --screen-bg: #070912;
    /* always a plain colour — safe for color-mix()/border, which reject gradients */
    --screen-solid: #070912;
    --map-bg:
      radial-gradient(ellipse at 26% 28%, rgba(150,90,230,0.18), transparent 40%),
      radial-gradient(ellipse at 74% 24%, rgba(60,150,255,0.18), transparent 40%),
      radial-gradient(ellipse at 32% 82%, rgba(52,224,208,0.12), transparent 40%),
      radial-gradient(ellipse at 80% 80%, rgba(255,190,74,0.12), transparent 42%),
      radial-gradient(circle 1px at 40% 40%, rgba(255,255,255,0.24) 1px, transparent 0),
      radial-gradient(circle 1px at 62% 66%, rgba(255,255,255,0.16) 1px, transparent 0),
      radial-gradient(circle 1px at 24% 70%, rgba(255,255,255,0.14) 1px, transparent 0),
      #080a14;
    --panel-fill:
      radial-gradient(130% 90% at 50% -18%, rgba(58,160,255,0.12), transparent 60%),
      linear-gradient(180deg, rgba(22,28,50,0.92), rgba(11,14,26,0.96));
    --panel-blur: none;
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
    --frame-strong: #b7c0e0;
    --on-accent: #04070f;

    /* the "you" highlight — a translucent warm wash, distinct from every
       faction colour (leaderboards-3.png). --you-ink must follow the theme's
       own contrast direction: light on dark grounds, dark on light grounds. */
    --you-hi: #f2c05e;
    --you-hi-strong: #ffe3a3;
    --you-ink: #fbf2e0;

    /* semantic game-speed tones */
    --spd-pause: #8b93b8;
    --spd-normal: #4aa3ff;
    --spd-fast: #34e0a0;
    --spd-high: #b16bff;
    --spd-extreme: #ff9a4a;

    --font-ui: "Rajdhani", "Segoe UI", system-ui, sans-serif;
    --font-brand: "Bahnschrift", "Agency FB", "Rajdhani", sans-serif;
    --font-data: "JetBrains Mono", "Cascadia Mono", ui-monospace, monospace;
    --brand-weight: 700;
    --brand-spacing: 0.16em;

    /* material knobs */
    --cut: 14px;
    --panel-clip: polygon(0 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% 100%, 0 100%);
    --panel-radius: 0px;
    --screen-clip: polygon(0 0, calc(100% - 26px) 0, 100% 26px, 100% 100%, 0 100%);
    --screen-radius: 0px;
    --scan: 0.02;
    --bracket: 0.7;
    --edge-spread: 30%;
    --edge-op: 1;
    --panel-drop: drop-shadow(0 10px 22px rgba(0,0,0,0.45));
    --chip-radius: 6px;

    /* ---- alias the shipped design-system tokens onto the active lab theme,
       so the REAL Pax* components reskin with everything else ---- */
    --pax-ui-accent: var(--accent);
    --pax-ui-accent-strong: var(--accent-strong);
    --pax-ui-accent-warm: var(--frame);
    --pax-ui-accent-warm-strong: var(--frame-strong);
    --pax-ui-border: var(--brd);
    --pax-ui-border-strong: var(--brd-hi);
    --pax-ui-border-warm: var(--brd-hi);
    --pax-ui-divider: var(--hair);
    --pax-ui-text: var(--text);
    --pax-ui-text-strong: var(--text-strong);
    --pax-ui-text-soft: var(--muted);
    --pax-ui-text-muted: var(--muted);
    --pax-ui-text-dim: var(--dim);
    --pax-ui-panel-bg: var(--panel-fill);
    --pax-ui-panel-bg-strong: var(--panel-fill);
    --pax-ui-panel-bg-muted: var(--inset);
    --pax-ui-button-bg: var(--inset);
    --pax-ui-button-bg-hover: color-mix(in srgb, var(--accent) 14%, var(--inset));
    --pax-ui-button-bg-active: var(--accent);
    --pax-ui-font-ui: var(--font-ui);
    --pax-ui-font-label: var(--font-ui);
    --pax-ui-font-copy: var(--font-ui);
    --pax-ui-font-data: var(--font-data);
    --pax-ui-font-brand: var(--font-brand);
    --pax-ui-danger: #ff5a6a;
    --pax-ui-success: #34e0a0;
    --pax-ui-border-gradient: linear-gradient(135deg, var(--brd-hi), transparent 62%);
    --pax-ui-control-border-gradient: linear-gradient(135deg, var(--brd-hi), transparent 62%);
    --pax-ui-shadow: 0 14px 34px rgba(0,0,0,0.42);
    --pax-ui-shadow-soft: 0 6px 16px rgba(0,0,0,0.3);
    --pax-color-void: var(--screen-solid);
    --pax-color-control: var(--inset);
    --pax-color-control-hover: color-mix(in srgb, var(--accent) 14%, var(--inset));

    min-height: 100vh;
    background:
      radial-gradient(ellipse at 12% 2%, rgba(150,90,230,0.16), transparent 42%),
      radial-gradient(ellipse at 88% 0%, rgba(60,140,255,0.16), transparent 42%),
      radial-gradient(ellipse at 78% 98%, rgba(255,170,70,0.08), transparent 46%),
      var(--ground);
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 15px; line-height: 1.5; letter-spacing: 0.01em;
    padding: 34px clamp(16px, 4vw, 56px) 72px;
    transition: background 0.45s ease, color 0.3s ease;
  }
  .stage { box-sizing: border-box; }
  .stage :global(*) { box-sizing: border-box; }

  /* ============================ NEBULA VEIL v1 (flat predecessor) ============================
     Deliberately the "before": flat cards, no lit edge, no bracket, no
     scanline, no atmospheric depth, muted accent, plain map. */
  .stage[data-theme="nebula-veil-v1"] {
    --ground: #0a0c16; --screen-bg: #0a0c16; --screen-solid: #0a0c16;
    --map-bg:
      radial-gradient(circle 1px at 40% 40%, rgba(255,255,255,0.16) 1px, transparent 0),
      radial-gradient(circle 1px at 62% 66%, rgba(255,255,255,0.12) 1px, transparent 0),
      radial-gradient(circle 1px at 24% 70%, rgba(255,255,255,0.10) 1px, transparent 0),
      #0e111d;
    --panel-fill: #12162a;
    --brd: rgba(126,150,210,0.18); --brd-hi: rgba(126,166,255,0.34); --hair: rgba(126,150,210,0.12);
    --inset: #171c33; --track: #1b2138;
    --text-strong: #dde4f2; --text: rgba(198,208,230,0.9);
    --muted: rgba(150,162,190,0.82); --dim: rgba(106,116,144,0.8);
    --accent: #4a86c8; --accent-strong: #7aa9dd; --accent-glow: rgba(74,134,200,0.18);
    --panel-clip: none; --panel-radius: 10px; --cut: 0px;
    --screen-clip: none; --screen-radius: 12px;
    --scan: 0; --bracket: 0; --edge-op: 0;
    --panel-drop: none;
    --brand-weight: 600; --brand-spacing: 0.1em;
    --font-brand: "Rajdhani", "Segoe UI", system-ui, sans-serif;
  }
  .stage[data-theme="nebula-veil-v1"] { background: var(--ground); }
  .stage[data-theme="nebula-veil-v1"] .screen { filter: none; border: 1px solid var(--brd); }
  .stage[data-theme="nebula-veil-v1"] .panel { border: 1px solid var(--brd); }
  .stage[data-theme="nebula-veil-v1"] .livedot { box-shadow: none; }
  .stage[data-theme="nebula-veil-v1"] .gauge__val { filter: none; }
  .stage[data-theme="nebula-veil-v1"] .tb__sigil { filter: none; }
  .stage[data-theme="nebula-veil-v1"] .cmd--tick .cmd__v { text-shadow: none; font-size: 16px; }
  .stage[data-theme="nebula-veil-v1"] .lead__brand h1 { text-shadow: none; }
  .stage[data-theme="nebula-veil-v1"] .std__meter::after { box-shadow: none; }
  .stage[data-theme="nebula-veil-v1"] .subtab--active,
  .stage[data-theme="nebula-veil-v1"] .seg button.on { box-shadow: none; }

  /* ============================ AURELIA DRIFT ============================ */
  .stage[data-theme="aurelia-drift"] {
    --ground: #03080b; --screen-bg: #03080b; --screen-solid: #03080b;
    --map-bg:
      radial-gradient(ellipse at 28% 30%, rgba(85,231,239,0.16), transparent 42%),
      radial-gradient(ellipse at 74% 26%, rgba(246,196,105,0.16), transparent 42%),
      radial-gradient(circle 1px at 40% 42%, rgba(255,255,255,0.22) 1px, transparent 0),
      radial-gradient(circle 1px at 66% 62%, rgba(255,255,255,0.15) 1px, transparent 0),
      #05121a;
    --panel-fill:
      linear-gradient(180deg, rgba(4,20,24,0.95), rgba(2,10,15,0.96)),
      radial-gradient(circle at 16% 0%, rgba(85,231,239,0.10), transparent 42%),
      radial-gradient(circle at 86% 0%, rgba(246,196,105,0.12), transparent 45%);
    --brd: rgba(246,196,105,0.34); --brd-hi: rgba(246,196,105,0.66); --hair: rgba(246,196,105,0.18);
    --inset: rgba(5,24,29,0.72); --track: #101c21;
    --text-strong: rgba(255,247,224,0.98); --text: rgba(224,232,232,0.92);
    --muted: rgba(180,188,188,0.88); --dim: rgba(128,141,145,0.8);
    --accent: #55e7ef; --accent-strong: #9ff8ff; --accent-glow: rgba(85,231,239,0.5);
    --frame: #f6c469; --frame-strong: #ffe3a3; --on-accent: #03080b;
    --you-hi: #f6c469; --you-hi-strong: #ffe3a3; --you-ink: #fdf4e2;
    --font-brand: "Cinzel", Georgia, serif; --brand-weight: 700; --brand-spacing: 0.13em;
    --panel-clip: none; --panel-radius: 14px; --cut: 0px;
    --screen-clip: none; --screen-radius: 18px;
    --scan: 0; --bracket: 0;
  }

  /* ============================ NEON ARCADE SYNTHWAVE ============================
     Outline-first: near-black ground, transparent fills, everything drawn as a
     glowing stroke with real bloom. Synthwave grid horizon on the map. The
     opposite construction to Cyber Flux, which fills its panels. */
  .stage[data-theme="neon-arcade"] {
    --ground: #05010c; --screen-bg: #06010e; --screen-solid: #06010e;
    --map-bg:
      linear-gradient(0deg, rgba(255,43,187,0.22), transparent 46%),
      repeating-linear-gradient(0deg, transparent 0 38px, rgba(0,229,255,0.10) 38px 39px),
      repeating-linear-gradient(90deg, transparent 0 38px, rgba(255,43,187,0.09) 38px 39px),
      radial-gradient(ellipse at 50% 108%, rgba(255,43,187,0.35), transparent 52%),
      radial-gradient(circle 1px at 26% 22%, rgba(255,255,255,0.5) 1px, transparent 0),
      radial-gradient(circle 1px at 68% 34%, rgba(0,229,255,0.55) 1px, transparent 0),
      #07010f;
    /* transparent panels — the neon outline does the work */
    --panel-fill: linear-gradient(180deg, rgba(255,43,187,0.07), rgba(0,229,255,0.04));
    --brd: rgba(255,43,187,0.62); --brd-hi: #ff6bd0; --hair: rgba(255,43,187,0.28);
    --inset: rgba(20,2,34,0.72); --track: #2a0740;
    --text-strong: #ffffff; --text: rgba(255,235,250,0.94);
    --muted: rgba(226,178,232,0.88); --dim: rgba(163,116,190,0.85);
    --accent: #ff2bbb; --accent-strong: #ff8ade; --accent-glow: rgba(255,43,187,0.85);
    --frame: #00e5ff; --frame-strong: #a6f6ff; --on-accent: #0a0014;
    --you-hi: #ffe23c; --you-hi-strong: #fff7b0; --you-ink: #fffbe4;
    --spd-pause: #9a7ab8; --spd-normal: #00e5ff; --spd-fast: #38ffb0; --spd-high: #c04bff; --spd-extreme: #ff8a2b;
    --font-brand: "Agency FB", "Haettenschweiler", "Rajdhani", sans-serif;
    --brand-weight: 700; --brand-spacing: 0.2em;
    --panel-clip: none; --panel-radius: 4px; --cut: 0px;
    --screen-clip: none; --screen-radius: 6px;
    --scan: 0.05; --bracket: 0; --edge-op: 0;
    --panel-drop: drop-shadow(0 0 14px rgba(255,43,187,0.35));
  }
  /* outline + bloom everywhere */
  .stage[data-theme="neon-arcade"] .panel {
    border: 1.5px solid var(--brd);
    box-shadow: 0 0 12px rgba(255,43,187,0.5), inset 0 0 18px rgba(255,43,187,0.10);
  }
  .stage[data-theme="neon-arcade"] .screen { border: 1.5px solid var(--brd); box-shadow: 0 0 26px rgba(255,43,187,0.4); }
  .stage[data-theme="neon-arcade"] .panel__title,
  .stage[data-theme="neon-arcade"] .tb__title,
  .stage[data-theme="neon-arcade"] .lead__brand h1 { text-shadow: 0 0 12px var(--accent-glow), 0 0 26px rgba(255,43,187,0.5); }
  .stage[data-theme="neon-arcade"] .panel__eyebrow { color: var(--frame); text-shadow: 0 0 9px rgba(0,229,255,0.8); }
  /* segmented/tab actives are OUTLINED, not filled — the arcade signature */
  .stage[data-theme="neon-arcade"] .seg button.on,
  .stage[data-theme="neon-arcade"] .subtab--active {
    background: rgba(255,43,187,0.14); color: var(--accent-strong);
    box-shadow: inset 0 0 0 1.5px var(--accent), 0 0 12px var(--accent-glow);
    text-shadow: 0 0 8px var(--accent-glow);
  }
  .stage[data-theme="neon-arcade"] .seg--speed button.on {
    background: color-mix(in srgb, var(--spd) 16%, transparent); color: var(--spd);
    box-shadow: inset 0 0 0 1.5px var(--spd), 0 0 14px color-mix(in srgb, var(--spd) 75%, transparent);
    text-shadow: 0 0 8px color-mix(in srgb, var(--spd) 80%, transparent);
  }
  .stage[data-theme="neon-arcade"] .iconbtn,
  .stage[data-theme="neon-arcade"] .mtile { border-color: var(--brd); box-shadow: 0 0 8px rgba(255,43,187,0.28); }
  .stage[data-theme="neon-arcade"] .std__chip { box-shadow: inset 0 0 0 1.5px var(--pc), 0 0 10px color-mix(in srgb, var(--pc) 60%, transparent); }
  .stage[data-theme="neon-arcade"] .livedot { box-shadow: 0 0 12px var(--accent), 0 0 4px #fff; }

  /* ============================ CYBER FLUX ============================ */
  .stage[data-theme="cyber-flux"] {
    --ground: #06030c; --screen-bg: #06030c; --screen-solid: #06030c;
    --map-bg:
      linear-gradient(0deg, rgba(255,58,192,0.14), transparent 42%),
      repeating-linear-gradient(90deg, transparent 0 44px, rgba(34,230,255,0.06) 44px 45px),
      repeating-linear-gradient(0deg, transparent 0 44px, rgba(255,58,192,0.06) 44px 45px),
      radial-gradient(circle 1px at 30% 26%, rgba(255,255,255,0.25) 1px, transparent 0),
      #08040f;
    --panel-fill: linear-gradient(180deg, rgba(24,7,36,0.92), rgba(10,3,18,0.95));
    --brd: rgba(255,90,200,0.5); --brd-hi: rgba(255,120,215,0.85); --hair: rgba(255,90,200,0.24);
    --inset: rgba(30,8,42,0.72); --track: #1c0a2a;
    --text-strong: #ffe9fb; --text: rgba(238,225,245,0.92);
    --muted: rgba(206,180,214,0.85); --dim: rgba(150,120,165,0.82);
    --accent: #ff3cc0; --accent-strong: #ff8fe0; --accent-glow: rgba(255,60,190,0.6);
    --frame: #22e6ff; --frame-strong: #9ff8ff; --on-accent: #0a0012;
    --you-hi: #ffd23c; --you-hi-strong: #ffe98a; --you-ink: #fff6df;
    --spd-normal: #22e6ff; --spd-fast: #4dff9e; --spd-high: #c86bff; --spd-extreme: #ff8f3c; --spd-pause: #7d6fa0;
    --font-brand: "Agency FB", "Bahnschrift", sans-serif; --brand-weight: 700; --brand-spacing: 0.1em;
    --cut: 9px; --panel-radius: 0px; --scan: 0.035; --bracket: 0.85; --edge-spread: 42%;
  }

  /* ============================ STARGLASS PRIME ============================ */
  .stage[data-theme="starglass-prime"] {
    --ground: radial-gradient(ellipse at 50% -10%, #16204e, #0b1030 60%);
    --screen-bg: linear-gradient(180deg, #0e1642, #0a0f2e); --screen-solid: #0b1030;
    --map-bg:
      radial-gradient(ellipse at 28% 30%, rgba(111,230,255,0.22), transparent 44%),
      radial-gradient(ellipse at 74% 26%, rgba(157,139,255,0.24), transparent 44%),
      radial-gradient(circle 1px at 36% 38%, rgba(255,255,255,0.4) 1px, transparent 0),
      radial-gradient(circle 1px at 66% 60%, rgba(255,255,255,0.28) 1px, transparent 0),
      linear-gradient(180deg, #0e1546, #0b1030);
    --panel-fill: linear-gradient(180deg, rgba(150,175,255,0.16), rgba(80,105,190,0.07));
    --panel-blur: blur(9px);
    --brd: rgba(185,208,255,0.32); --brd-hi: rgba(210,226,255,0.6); --hair: rgba(185,208,255,0.18);
    --inset: rgba(130,160,235,0.14); --track: rgba(130,160,235,0.2);
    --text-strong: #f4f7ff; --text: rgba(222,232,255,0.94);
    --muted: rgba(188,202,238,0.9); --dim: rgba(150,166,210,0.82);
    --accent: #6fe6ff; --accent-strong: #c2f4ff; --accent-glow: rgba(111,230,255,0.5);
    --frame: #9d8bff; --frame-strong: #c7b8ff; --on-accent: #0b1030;
    --you-hi: #ffd884; --you-hi-strong: #ffeec4; --you-ink: #fff7e6;
    --spd-normal: #6fbcff; --spd-fast: #63e6c4; --spd-high: #b79cff; --spd-extreme: #ffab6b; --spd-pause: #8b9cc8;
    --font-brand: "Copperplate Gothic Light", "Rajdhani", sans-serif; --brand-weight: 400; --brand-spacing: 0.26em;
    --panel-clip: none; --panel-radius: 18px; --cut: 0px;
    --screen-clip: none; --screen-radius: 20px; --scan: 0; --bracket: 0;
  }

  /* ============================ BROADCAST MINIMAL (light) ============================ */
  .stage[data-theme="broadcast-minimal"] {
    color-scheme: light;
    --ground: #eaecef; --screen-bg: #f5f6f7; --screen-solid: #f5f6f7;
    --map-bg:
      radial-gradient(circle 1px at 30% 30%, rgba(40,50,70,0.18) 1px, transparent 0),
      radial-gradient(circle 1px at 62% 58%, rgba(40,50,70,0.13) 1px, transparent 0),
      radial-gradient(circle 1px at 80% 34%, rgba(40,50,70,0.13) 1px, transparent 0),
      linear-gradient(180deg, #eceef1, #e4e7eb);
    --panel-fill: #ffffff;
    --brd: rgba(24,30,42,0.14); --brd-hi: rgba(24,30,42,0.34); --hair: rgba(24,30,42,0.10);
    --inset: #eef1f4; --track: #dfe4ea;
    --text-strong: #111620; --text: #2b323d; --muted: #5a6472; --dim: #8b95a4;
    --accent: #2f6fe0; --accent-strong: #1b57c8; --accent-glow: rgba(47,111,224,0.28);
    --frame: #45536b; --frame-strong: #2c374a; --on-accent: #ffffff;
    --you-hi: #c98a12; --you-hi-strong: #8a5c00; --you-ink: #2a1f04;
    --spd-normal: #2f6fe0; --spd-fast: #1f9e63; --spd-high: #7b52d8; --spd-extreme: #e07a1f; --spd-pause: #8b95a4;
    --font-brand: "Haettenschweiler", "Franklin Gothic Demi", "Rajdhani", sans-serif; --brand-weight: 400; --brand-spacing: 0.03em;
    --panel-clip: none; --panel-radius: 8px; --cut: 0px;
    --screen-clip: none; --screen-radius: 10px; --scan: 0; --bracket: 0;
  }

  .mono { font-family: var(--font-data); font-variant-numeric: tabular-nums; }
  .ic { display: block; flex-shrink: 0; }
  .sig { display: block; }

  :where(.stage button, .stage input, .stage .std__row):focus-visible {
    outline: 2px solid var(--accent-strong); outline-offset: 3px;
  }

  .back {
    position: fixed; top: 16px; left: 16px; z-index: 20;
    display: inline-flex; align-items: center; gap: 6px; line-height: 1;
    font: 600 13px/1 var(--font-ui); letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--muted); background: var(--inset); cursor: pointer;
    border: 1px solid var(--brd); border-radius: 999px; padding: 8px 15px 8px 11px;
    transition: color .15s, border-color .15s, transform .15s;
  }
  .back:hover { color: var(--text-strong); border-color: var(--brd-hi); transform: translateX(-2px); }

  /* lead */
  .lead { max-width: 1200px; margin: 0 auto 22px; }
  .lead__kicker { margin: 0 0 10px; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--accent); }
  .lead__brand { display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; }
  .lead__brand h1 { margin: 0; font-family: var(--font-brand); font-weight: var(--brand-weight); font-size: clamp(30px, 5vw, 52px); letter-spacing: var(--brand-spacing); text-transform: uppercase; color: var(--text-strong); text-shadow: 0 0 28px color-mix(in srgb, var(--accent) 30%, transparent); }
  .lead__tag { font-size: 13px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--frame); }
  .lead__note { max-width: 70ch; margin: 11px 0 0; color: var(--muted); font-size: 15px; line-height: 1.6; }

  /* theme switch bar */
  .switch-bar { position: sticky; top: 8px; z-index: 15; max-width: 1200px; margin: 0 auto 18px; display: flex; gap: 8px; flex-wrap: wrap; padding: 8px; border: 1px solid var(--brd); border-radius: 14px; background: color-mix(in srgb, var(--screen-solid) 88%, transparent); backdrop-filter: blur(10px); }
  .tsw { flex: 1 1 160px; display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 8px 10px; border: 1px solid var(--hair); border-radius: 10px; background: var(--inset); color: var(--text); transition: border-color .15s, transform .12s, box-shadow .15s; }
  .tsw:hover { transform: translateY(-1px); border-color: var(--brd-hi); }
  .tsw.on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 0 16px var(--accent-glow); }
  .tsw__sw { display: flex; width: 34px; height: 22px; border-radius: 5px; overflow: hidden; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); }
  .tsw__sw i { flex: 1; }
  .tsw__meta { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
  .tsw__name { font-size: 12.5px; font-weight: 600; color: var(--text-strong); white-space: nowrap; }
  .tsw__tag { font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim); }

  /* screen */
  .screen {
    position: relative; max-width: 1200px; margin: 0 auto; background: var(--screen-bg);
    clip-path: var(--screen-clip); border-radius: var(--screen-radius);
    filter: drop-shadow(0 30px 60px rgba(0,0,0,0.5));
    transition: background 0.45s ease;
  }
  .screen::after {
    content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 3;
    background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.5) 3px 4px);
    opacity: var(--scan); mix-blend-mode: overlay;
  }

  .iconbtn { display: grid; place-items: center; width: 34px; height: 34px; cursor: pointer; color: var(--muted); background: var(--inset); border: 1px solid var(--brd); border-radius: 9px; transition: color .15s, border-color .15s, background .15s; }
  .iconbtn:hover { color: var(--text-strong); border-color: var(--brd-hi); background: color-mix(in srgb, var(--accent) 10%, transparent); }
  .iconbtn.sm { width: 28px; height: 28px; border-radius: 8px; }

  /* topbar */
  .tb { display: flex; align-items: center; gap: 20px; height: 60px; padding: 0 16px; background: color-mix(in srgb, var(--screen-solid) 86%, #000); border-bottom: 1px solid var(--brd); position: relative; z-index: 2; }
  .tb__brand { display: flex; align-items: center; gap: 11px; flex-shrink: 0; }
  .tb__sigil { display: inline-flex; filter: drop-shadow(0 0 6px currentColor); }
  .tb__title { font-family: var(--font-brand); font-size: 18px; font-weight: var(--brand-weight); letter-spacing: var(--brand-spacing); text-transform: uppercase; color: var(--text-strong); }
  .tb__map { font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); padding-left: 11px; border-left: 1px solid var(--hair); }

  .tb__command { display: flex; align-items: center; gap: 16px; margin: 0 auto; padding: 7px 20px; border-radius: 10px; background: color-mix(in srgb, var(--accent) 6%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
  .cmd { display: flex; align-items: baseline; gap: 8px; }
  .cmd--live { align-items: center; color: var(--accent); text-transform: uppercase; font-size: 12px; letter-spacing: 0.1em; line-height: 1; }
  .cmd__k { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--dim); }
  .cmd__v { font-family: var(--font-data); font-size: 16px; color: var(--text-strong); }
  .cmd--tick .cmd__v { font-size: 22px; color: var(--accent-strong); text-shadow: 0 0 14px var(--accent-glow); line-height: 1; }
  .cmd__sel { font-family: var(--font-ui); color: var(--accent-strong); font-weight: 600; }
  .cmd__sep { width: 1px; height: 22px; background: var(--hair); }

  .tb__right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
  .tb__diag { display: flex; align-items: center; gap: 9px; padding: 4px 9px; border-radius: 8px; background: color-mix(in srgb, var(--dim) 12%, transparent); }
  .tb__tag { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); border: 1px solid var(--hair); border-radius: 4px; padding: 1px 5px; }
  .tb__diag .mono { font-size: 12px; color: var(--dim); }
  .tb__badge { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; line-height: 1; font-family: var(--font-ui); font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-strong); padding: 6px 12px; border-radius: 999px; border: 1px solid var(--brd-hi); background: color-mix(in srgb, var(--accent) 10%, transparent); transition: background .15s; }
  .tb__badge:hover { background: color-mix(in srgb, var(--accent) 18%, transparent); }
  .tb__badge .mono { color: var(--accent-strong); }
  .tb__badge-sig { display: inline-flex; }

  /* body */
  .body { display: grid; grid-template-columns: 340px 1fr 320px; min-height: 616px; position: relative; z-index: 1; }

  /* settings */
  .settings { background: var(--panel-fill); border-right: 1px solid var(--hair); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .search { display: flex; align-items: center; gap: 9px; border: 1px solid var(--brd); border-radius: 9px; padding: 0 11px; height: 38px; color: var(--dim); background: var(--inset); }
  .search input { flex: 1; border: 0; background: transparent; color: var(--text); font: inherit; font-size: 13px; outline: none; }
  .search input::placeholder { color: var(--dim); }
  .cat { display: flex; align-items: center; gap: 9px; color: var(--accent); }
  .cat h2 { margin: 0; font-family: var(--font-brand); font-size: 15px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-strong); }
  .subtabs { display: flex; gap: 5px; flex-wrap: wrap; }
  .subtab { line-height: 1; font-size: 10.5px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--muted); padding: 6px 11px; border-radius: 999px; border: 1px solid var(--hair); cursor: pointer; background: transparent; transition: color .15s, border-color .15s; }
  .subtab:hover { color: var(--text-strong); border-color: var(--brd); }
  .subtab--active { color: var(--on-accent); background: var(--accent); border-color: var(--accent); font-weight: 600; box-shadow: 0 0 14px var(--accent-glow); }

  .eyebrow { display: flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent-strong); }
  .eyebrow__ix { font-family: var(--font-data); font-size: 10px; color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); border-radius: 4px; padding: 1px 4px; }
  .hint { margin: 0; font-size: 11.5px; line-height: 1.45; color: var(--dim); }
  .mode-desc { margin: 2px 0 0; font-size: 12px; color: var(--muted); }
  .mode-desc strong { color: var(--accent-strong); }

  /* render-mode preview tiles */
  .modes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .mtile { display: flex; flex-direction: column; gap: 6px; padding: 5px; cursor: pointer; background: var(--inset); border: 1px solid var(--brd); border-radius: 9px; transition: border-color .15s, box-shadow .15s, transform .1s; }
  .mtile:hover { border-color: var(--brd-hi); transform: translateY(-1px); }
  .mtile.on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 0 16px var(--accent-glow); }
  .mtile__vis { position: relative; height: 42px; border-radius: 6px; overflow: hidden; background: #0a0e1a; }
  .mtile__label { line-height: 1; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; text-align: center; color: var(--muted); }
  .mtile.on .mtile__label { color: var(--accent-strong); font-weight: 600; }
  .mtile__check { position: absolute; top: 3px; right: 3px; z-index: 2; display: grid; place-items: center; width: 17px; height: 17px; border-radius: 999px; background: var(--accent); color: var(--on-accent); box-shadow: 0 0 10px var(--accent-glow); }

  .mtile__vis[data-mode="vector"] { background: linear-gradient(118deg, #4aa3ff 0 46%, #ff9a4a 46% 74%, #34e0a0 74% 100%); }
  .mtile__vis[data-mode="edges"] { background:
      linear-gradient(118deg, transparent 44%, #6fe6ff 44.5% 47%, transparent 47.5%),
      linear-gradient(118deg, transparent 72%, #ffb36b 72.5% 75%, transparent 75.5%), #0a0e1a;
    box-shadow: inset 0 0 12px rgba(111,230,255,0.35); }
  .mtile__vis[data-mode="ember"] { background:
      radial-gradient(circle 1.4px at 22% 30%, #6fe6ff 60%, transparent),
      radial-gradient(circle 1.4px at 44% 62%, #4aa3ff 60%, transparent),
      radial-gradient(circle 1.4px at 68% 28%, #ff9a4a 60%, transparent),
      radial-gradient(circle 1.4px at 78% 66%, #34e0a0 60%, transparent),
      radial-gradient(circle 1.4px at 34% 80%, #b16bff 60%, transparent),
      radial-gradient(circle 1.4px at 60% 46%, #ffc24a 60%, transparent), #0a0e1a; }
  .mtile__vis[data-mode="field"] { background:
      radial-gradient(circle at 28% 36%, rgba(74,163,255,0.9), transparent 58%),
      radial-gradient(circle at 72% 62%, rgba(255,154,74,0.85), transparent 58%),
      radial-gradient(circle at 54% 24%, rgba(52,224,160,0.8), transparent 55%), #0a0e1a; filter: saturate(1.1); }
  .mtile__vis[data-mode="grad"] { background:
      repeating-linear-gradient(0deg, transparent 0 5px, rgba(255,255,255,0.06) 5px 6px),
      repeating-linear-gradient(90deg, transparent 0 5px, rgba(255,255,255,0.06) 5px 6px),
      linear-gradient(118deg, #b16bff, #4aa3ff 55%, #34e0a0); }
  .mtile__vis[data-mode="off"] { background:
      radial-gradient(circle 1px at 30% 40%, rgba(255,255,255,0.5), transparent),
      radial-gradient(circle 1px at 62% 66%, rgba(255,255,255,0.35), transparent),
      radial-gradient(circle 1px at 78% 30%, rgba(255,255,255,0.4), transparent), #0a0e1a; }

  .ctrl { display: flex; flex-direction: column; gap: 8px; }
  .ctrl__head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .ctrl__head span:first-child { font-size: 13.5px; color: var(--text); }
  .val { font-size: 13px; color: var(--text-strong); }

  .range { -webkit-appearance: none; appearance: none; width: 100%; height: 18px; background: transparent; cursor: pointer; margin: 0; }
  .range::-webkit-slider-runnable-track { height: 4px; border-radius: 999px; background: linear-gradient(90deg, var(--accent) 0 var(--val), var(--track) var(--val) 100%); }
  .range::-moz-range-track { height: 4px; border-radius: 999px; background: var(--track); }
  .range::-moz-range-progress { height: 4px; border-radius: 999px; background: var(--accent); }
  .range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 13px; height: 13px; margin-top: -4.5px; border-radius: 999px; background: var(--accent-strong); border: 2px solid var(--screen-solid); box-shadow: 0 0 8px var(--accent-glow); transition: transform .12s; }
  .range::-moz-range-thumb { width: 13px; height: 13px; border-radius: 999px; background: var(--accent-strong); border: 2px solid var(--screen-solid); box-shadow: 0 0 8px var(--accent-glow); }
  .range:hover::-webkit-slider-thumb { transform: scale(1.15); }

  .switch { width: 38px; height: 21px; border-radius: 999px; background: var(--track); border: 1px solid var(--hair); position: relative; flex-shrink: 0; transition: background .15s, border-color .15s; }
  .switch::after { content: ""; position: absolute; width: 15px; height: 15px; border-radius: 999px; background: var(--dim); top: 2px; left: 2px; transition: left .18s cubic-bezier(.3,1.4,.5,1), background .15s; }
  .switch--on { background: color-mix(in srgb, var(--accent) 28%, transparent); border-color: var(--accent); }
  .switch--on::after { left: 19px; background: var(--accent-strong); box-shadow: 0 0 8px var(--accent-glow); }
  .togglerow { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 0 0; margin-top: 2px; border-top: 1px solid var(--hair); background: none; border-left: 0; border-right: 0; border-bottom: 0; cursor: pointer; color: var(--text); font: inherit; }
  .togglerow > span:first-child { font-size: 13.5px; }

  /* map — reacts to render mode */
  .map { position: relative; display: grid; place-items: center; overflow: hidden; background: var(--map-bg); transition: background .45s ease, filter .4s ease; }
  .map[data-mode="off"] { filter: grayscale(0.75) brightness(0.72); }
  .map[data-mode="edges"] { filter: contrast(1.15) brightness(0.9); }
  .map[data-mode="ember"] { filter: saturate(1.25) brightness(1.05); }
  .map[data-mode="grad"] { filter: saturate(0.85) hue-rotate(-8deg); }
  .map__tag { text-align: center; color: var(--dim); font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; padding: 13px 20px; border: 1px dashed var(--hair); border-radius: 12px; background: color-mix(in srgb, var(--screen-solid) 65%, transparent); }
  .map__tag b { display: block; color: var(--muted); margin-bottom: 4px; letter-spacing: 0.13em; }

  /* rail */
  .rail { background: var(--screen-bg); border-left: 1px solid var(--hair); padding: 14px; display: flex; flex-direction: column; gap: 16px; }

  /* signature panel */
  .panel { position: relative; background: var(--panel-fill); backdrop-filter: var(--panel-blur); clip-path: var(--panel-clip); border-radius: var(--panel-radius); padding: 15px 16px 16px; filter: var(--panel-drop); transition: background .45s ease; }
  .panel::before { content: ""; position: absolute; top: 0; left: 0; right: var(--cut); height: 2px; opacity: var(--edge-op); background: linear-gradient(90deg, var(--accent) 0 var(--edge-spread), transparent 82%); box-shadow: 0 0 10px var(--accent-glow); }
  .panel::after { content: ""; position: absolute; left: 10px; bottom: 10px; width: 12px; height: 12px; border-left: 1.5px solid var(--brd-hi); border-bottom: 1.5px solid var(--brd-hi); opacity: var(--bracket); }
  .panel__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
  .panel__eyebrow { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent-strong); }
  .panel__title { margin: 3px 0 0; font-family: var(--font-brand); font-size: 16px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-strong); }
  .tools { display: flex; gap: 5px; }
  .livedot { width: 7px; height: 7px; border-radius: 999px; background: var(--accent); box-shadow: 0 0 8px var(--accent); animation: nv-pulse 2.2s ease-in-out infinite; }
  @keyframes nv-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

  /* segmented controls — icon+label optically centred */
  .seg { display: flex; gap: 3px; border: 1px solid var(--hair); border-radius: 999px; padding: 3px; }
  .seg button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; line-height: 1; font-family: var(--font-ui); font-size: 11.5px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); cursor: pointer; background: transparent; border: 0; border-radius: 999px; padding: 7px 6px; transition: color .15s, background .15s, box-shadow .15s; }
  .seg button > span { line-height: 1; display: inline-block; }
  .seg button:hover { color: var(--text-strong); }
  .seg button.on { color: var(--on-accent); background: var(--accent); font-weight: 600; box-shadow: 0 0 12px var(--accent-glow); }
  .seg--sm { width: 128px; flex: none; }
  /* game speed: active pill uses its semantic tone */
  .seg--speed button { padding: 8px 6px; }
  .seg--speed button.on { background: var(--spd); color: #06080e; box-shadow: 0 0 12px color-mix(in srgb, var(--spd) 55%, transparent); }

  .sliderlbl { display: flex; align-items: baseline; justify-content: space-between; margin: 14px 2px 8px 0; }
  .sliderlbl span:first-child { font-size: 13px; color: var(--text); }
  .sliderlbl .mono { font-size: 13px; color: var(--text-strong); }

  /* standings ladder */
  .std__bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .std__tick { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim); }
  .std__tick strong { color: var(--text); margin-left: 4px; font-weight: 500; }
  .std__cols { display: grid; grid-template-columns: 1.9fr 0.85fr 0.85fr 0.7fr 0.8fr; gap: 4px; padding: 0 9px 6px; font-size: 9.5px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--dim); }
  .std__cols span:not(:first-child) { text-align: right; }
  .std__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .std__list li { display: block; }
  .std__row {
    position: relative; width: 100%; display: grid; grid-template-columns: 1.9fr 0.85fr 0.85fr 0.7fr 0.8fr; gap: 4px; align-items: center;
    padding: 9px 9px 12px; border: 0; border-left: 2px solid var(--pc); border-radius: 8px; cursor: pointer;
    font-family: var(--font-data); font-size: 12.5px; color: var(--text);
    background: linear-gradient(90deg, color-mix(in srgb, var(--pc) 13%, transparent), transparent 66%);
    transition: background .15s, box-shadow .15s; overflow: hidden;
  }
  .std__row > span:not(.std__who):not(.std__meter) { text-align: right; }
  .std__row:hover { background: linear-gradient(90deg, color-mix(in srgb, var(--pc) 22%, transparent), transparent 70%); }
  .std__row.is-leader:not(.is-local) { background: linear-gradient(90deg, color-mix(in srgb, var(--pc) 24%, transparent), transparent 78%); }

  /* THE active-player highlight (leaderboards-3.png): a TRANSLUCENT warm
     gradient wash — the panel still reads through it. Legibility comes from
     the lit left edge, the inset ring and the glow, not from an opaque fill. */
  .std__row.is-local {
    border-left-color: var(--you-hi-strong);
    border-left-width: 3px;
    background:
      linear-gradient(90deg,
        color-mix(in srgb, var(--you-hi) 34%, transparent) 0%,
        color-mix(in srgb, var(--you-hi) 14%, transparent) 46%,
        color-mix(in srgb, var(--you-hi) 3%, transparent) 100%);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--you-hi) 42%, transparent),
      inset 10px 0 24px -12px var(--you-hi-strong),
      0 0 18px color-mix(in srgb, var(--you-hi) 22%, transparent);
  }
  .std__row.is-local:hover {
    background:
      linear-gradient(90deg,
        color-mix(in srgb, var(--you-hi) 46%, transparent) 0%,
        color-mix(in srgb, var(--you-hi) 20%, transparent) 46%,
        color-mix(in srgb, var(--you-hi) 5%, transparent) 100%);
  }
  /* ink follows the theme's own contrast direction; the name takes the highlight hue */
  .std__row.is-local > span.mono,
  .std__row.is-local .std__rank,
  .std__row.is-local .std__prod { color: var(--you-ink); }
  .std__row.is-local .std__name { color: var(--you-hi-strong); font-weight: 700; }
  .std__row.is-local .std__rank { opacity: 0.8; }
  .std__row.is-local .std__prod { opacity: 0.85; }

  .std__row.is-selected { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pc) 75%, transparent), 0 0 14px color-mix(in srgb, var(--pc) 22%, transparent); }
  .std__row.is-local.is-selected { box-shadow: inset 0 0 0 2px var(--you-hi-strong), 0 0 22px color-mix(in srgb, var(--you-hi) 45%, transparent); }
  .std__who { display: flex; align-items: center; gap: 8px; font-family: var(--font-ui); letter-spacing: 0.02em; text-align: left; }
  .std__rank { font-size: 11px; color: var(--dim); width: 13px; text-align: center; }
  .std__chip { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; color: var(--pc); background: color-mix(in srgb, var(--pc) 16%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pc) 45%, transparent); }
  /* faction sigil keeps the player's colour; ring brightens so it reads through the wash */
  .std__row.is-local .std__chip { background: color-mix(in srgb, var(--pc) 22%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pc) 75%, transparent); }
  .std__name { color: var(--text-strong); font-weight: 500; }
  .std__prod { color: var(--muted); }
  /* underline-as-gauge — flush to the row's bottom edge */
  .std__meter { position: absolute; left: 9px; right: 9px; bottom: 0; height: 2.5px; border-radius: 999px 999px 0 0; background: color-mix(in srgb, var(--pc) 20%, transparent); overflow: hidden; }
  .std__meter::after { content: ""; position: absolute; left: 0; top: 0; height: 100%; width: var(--w); border-radius: 999px 999px 0 0; background: var(--pc); box-shadow: 0 0 8px var(--pc); transition: width .32s cubic-bezier(.3,.9,.3,1); }
  .std__row.is-local .std__meter { background: color-mix(in srgb, var(--you-hi) 26%, transparent); }
  .std__row.is-local .std__meter::after { background: var(--you-hi-strong); box-shadow: 0 0 8px var(--you-hi); }
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

  /* ---- live design-system component board ---- */
  .ds { max-width: 1200px; margin: 30px auto 0; }
  .ds__head h2 { margin: 0 0 6px; font-family: var(--font-brand); font-size: 15px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent-strong); }
  .ds__head p { margin: 0 0 18px; max-width: 78ch; font-size: 13.5px; line-height: 1.6; color: var(--muted); }
  .ds__head strong { color: var(--text-strong); font-weight: 600; }
  .ds__head code { font-family: var(--font-data); font-size: 12.5px; color: var(--accent); }
  .ds__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .ds__cell { display: flex; flex-direction: column; gap: 10px; padding: 14px 15px 16px; border: 1px solid var(--hair); border-radius: var(--panel-radius, 10px); background: var(--panel-fill); }
  .ds__cell--wide { grid-column: 1 / -1; }
  .ds__label { display: flex; align-items: center; gap: 6px; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); font-family: var(--font-data); }
  .ds__row { display: flex; align-items: center; gap: 8px; }
  .ds__row--wrap { flex-wrap: wrap; }
  .ds__stack { display: flex; flex-direction: column; gap: 10px; }
  .ds__panelcopy { margin: 0 0 12px; font-size: 13px; line-height: 1.55; color: var(--muted); }
  .ds__chip { display: inline-flex; align-items: center; gap: 6px; line-height: 1; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--brd); background: var(--inset); font-size: 11.5px; letter-spacing: 0.04em; color: var(--text); }
  .ds__chip--live { color: var(--accent-strong); border-color: color-mix(in srgb, var(--accent) 55%, transparent); }
  .ds__chip--live i { width: 7px; height: 7px; border-radius: 999px; background: var(--accent); box-shadow: 0 0 8px var(--accent); }
  .ds__chip--num { font-family: var(--font-data); }

  .foot { max-width: 1200px; margin: 26px auto 0; padding-top: 18px; border-top: 1px solid var(--hair); }
  .foot p { margin: 0; max-width: 80ch; font-size: 13px; color: var(--dim); line-height: 1.6; }
  .foot b { color: var(--muted); }

  @media (max-width: 1040px) { .body { grid-template-columns: 1fr; } .tb__command { display: none; } .ds__grid { grid-template-columns: 1fr; } }
  @media (prefers-reduced-motion: reduce) {
    .livedot, .gauge__val { animation: none; }
    .stage, .screen, .map, .panel, .back, .mtile, .iconbtn, .subtab, .seg button, .std__row, .switch, .switch::after, .std__meter::after, .tsw { transition: none; }
  }
</style>
