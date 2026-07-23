<script lang="ts">
  import "../../app.css";
  import { goto } from "$app/navigation";

  type ThemeId =
    | "aurelia-drift"
    | "cyber-flux"
    | "nebula-veil"
    | "starglass-prime"
    | "broadcast-minimal";

  interface ThemeMeta {
    id: ThemeId;
    name: string;
    mood: string;
    tag?: string;
    sw: [string, string, string];
  }

  const THEMES: ThemeMeta[] = [
    { id: "aurelia-drift", name: "Aurelia Drift", mood: "Regal · painterly", tag: "Current", sw: ["#081216", "#f6c469", "#55e7ef"] },
    { id: "cyber-flux", name: "Cyber Flux", mood: "High-energy · neon", sw: ["#08040f", "#ff3cc0", "#22e6ff"] },
    { id: "nebula-veil", name: "Nebula Veil", mood: "Crisp · esports", sw: ["#080a14", "#b16bff", "#3aa0ff"] },
    { id: "starglass-prime", name: "Starglass Prime", mood: "Airy · glass", sw: ["#0c1238", "#9d8bff", "#6fe6ff"] },
    { id: "broadcast-minimal", name: "Broadcast Minimal", mood: "Clean · light", sw: ["#eceef1", "#45536b", "#b8871c"] },
  ];

  let theme = $state<ThemeId>("aurelia-drift");
  const themeName = $derived(THEMES.find((t) => t.id === theme)?.name ?? theme);

  function goBack() {
    if (typeof history !== "undefined" && history.length > 1) history.back();
    else void goto("/play");
  }
</script>

<svelte:head><title>Pax Fluxia — Theme Lab</title></svelte:head>

<div class="page" data-preview-theme={theme}>
  <button class="back-link" type="button" onclick={goBack} title="Back to menu">
    <span aria-hidden="true">‹</span> Back
  </button>

  <header class="pitch">
    <p class="pitch__kicker">Theme lab · one console, five identities</p>
    <div class="pitch__brand">
      <h1>Pax Fluxia</h1>
      <span class="sub">{themeName}</span>
    </div>
    <p class="pitch__lede">
      A theme isn't a hue swap. Each of these re-casts the <b>whole physical treatment</b> — the
      ground, the border language, the glow, the corner radius, the brand type, and which pigments
      fill the two accent roles. The three <b>laws</b> below never change; only the material does.
      Pick a theme to reskin the entire console.
    </p>

    <div class="themes">
      <p class="themes__label">Choose a theme — the console reskins live</p>
      <div class="theme-grid" role="group" aria-label="Theme">
        {#each THEMES as t}
          <button
            class="theme-btn"
            type="button"
            aria-pressed={theme === t.id}
            onclick={() => (theme = t.id)}
          >
            <span class="theme-btn__sw">
              {#each t.sw as c}<i style="background:{c}"></i>{/each}
            </span>
            <span class="theme-btn__name">{t.name}</span>
            <span class="theme-btn__mood">{t.mood}</span>
            {#if t.tag}<span class="theme-btn__tag">{t.tag}</span>{/if}
          </button>
        {/each}
      </div>
    </div>

    <div class="laws">
      <div class="law"><span class="law__n">Law 01</span><h3>Accent has meaning</h3><p>Two roles, always: the <b>frame</b> pigment is architecture (edge, brand, where you are); the <b>live</b> pigment is interaction (active toggles, selection, values worth reading). The hues change per theme — the roles never do.</p></div>
      <div class="law"><span class="law__n">Law 02</span><h3>One border per panel</h3><p>Grouping comes from spacing, then a hairline, then an eyebrow — a nested border only for something pressable. Star View's six boxed tiles become one hairline grid.</p></div>
      <div class="law"><span class="law__n">Law 03</span><h3>Silence the inactive</h3><p>One control per line, calm track, no thumb glow. Gated groups collapse to a single line when their master is off, instead of a wall of dead sliders.</p></div>
    </div>
  </header>

  <!-- ======================= THE SCREEN ======================= -->
  <section class="screen" aria-label="Redesigned game chrome">
    <div class="topbar">
      <div class="tb-brand">
        <div class="tb-menu" title="Main menu">☰</div>
        <div class="tb-mark" aria-hidden="true"></div>
        <div class="tb-title">Pax Fluxia</div>
        <div class="tb-map">arena-further</div>
      </div>
      <div class="tb-match">
        <div class="tb-stat tb-stat--live"><span class="k">Tick</span><span class="v">0</span></div>
        <div class="tb-pause"><span class="glyph">▮▮</span> Paused</div>
        <div class="tb-stat"><span class="k">Selected</span><span class="v tb-stat__sel">Star 38</span></div>
      </div>
      <div class="tb-diag" title="Diagnostics — hidden outside dev by default">
        <span class="tag">Dev</span><span class="m">120 fps</span><span class="m">2,569 ships</span>
      </div>
      <div class="tb-modes" role="group" aria-label="Territory render mode">
        <button class="tb-mode tb-mode--active">Vector</button>
        <button class="tb-mode">Edges</button><button class="tb-mode">Ember</button>
        <button class="tb-mode">Field</button><button class="tb-mode">Grad</button><button class="tb-mode">Off</button>
      </div>
      <div class="tb-badge" title="Collapse player standings">
        <span class="dot"></span><span>You</span><span class="n">686</span><span aria-hidden="true">▾</span>
      </div>
    </div>

    <div class="screen-body">
      <aside class="settings" aria-label="Settings">
        <div class="settings__search">🔍 Search settings…</div>
        <div class="settings__cat"><span class="ico">◎</span><h2>Territory &amp; Render</h2></div>
        <div class="subtabs">
          <button class="subtab subtab--active">All</button><button class="subtab">Topology</button>
          <button class="subtab">Render</button><button class="subtab">Frontier</button><button class="subtab">Transition</button>
        </div>
        <div class="sec-eyebrow">Territory Topology</div>
        <div class="group__label">Topology Rules</div>
        <div class="ctrl"><div class="ctrl__head"><span class="ctrl__label">Minimum Star Margin</span><span class="ctrl__value unit">185&thinsp;px</span></div><div class="range"><div class="range__track"></div><div class="range__fill" style="width:46%"></div><div class="range__thumb" style="left:46%"></div></div></div>
        <div class="ctrl"><div class="ctrl__head"><span class="ctrl__label">Star Bias</span><span class="ctrl__value">1.10</span></div><div class="range"><div class="range__track"></div><div class="range__fill" style="width:55%"></div><div class="range__thumb" style="left:55%"></div></div></div>
        <div class="ctrl"><div class="ctrl__head"><span class="ctrl__label">Extent Beyond Map</span><span class="ctrl__value unit">135&thinsp;px</span></div><div class="range"><div class="range__track"></div><div class="range__fill" style="width:34%"></div><div class="range__thumb" style="left:34%"></div></div></div>
        <div class="gated"><span class="gated__title"><span class="switch"></span> Corridor Virtual Sites</span><span class="gated__hidden">6 controls hidden</span></div>
        <div class="gated"><span class="gated__title"><span class="switch"></span> Disconnect Gaps</span><span class="gated__hidden">2 controls hidden</span></div>
        <div class="toggle-row"><span class="toggle-row__label">Blended Opponent Borders</span><span class="switch switch--on"></span></div>
      </aside>

      <div class="map" aria-label="Star map (unchanged)">
        <div class="map__label"><b>Starmap</b>out of scope for this pass</div>
      </div>

      <div class="rail">
        <section class="panel">
          <div class="panel__head"><div><div class="panel__eyebrow">Tempo</div><h3 class="panel__title">Game Speed</h3></div></div>
          <div class="seg-ctrl"><button class="on">▮▮ Pause</button><button>1×</button><button>2×</button><button>4×</button><button>10×</button></div>
          <div class="speed__slider-label"><span class="k">Tick Duration</span><span class="v">1400 ms</span></div>
          <div class="range"><div class="range__track"></div><div class="range__fill" style="width:27%"></div><div class="range__thumb" style="left:27%"></div></div>
        </section>

        <section class="panel">
          <div class="panel__head"><div><div class="panel__eyebrow"><span class="live"></span>Live match</div><h3 class="panel__title">Player Standings</h3></div><div class="panel__tools"><span class="icon-btn" title="Dock left">◧</span><span class="icon-btn" title="Collapse">▴</span></div></div>
          <div class="stand__toolbar"><span class="stand__tick">Tick <b>0</b></span><div class="seg-ctrl stand__seg"><button class="on">✈ Act</button><button>◯ Tot</button></div></div>
          <div class="stand__cols"><span>Player</span><span>Act</span><span>Tot</span><span>Star</span><span>Prod</span><span>%</span></div>
          <ul class="stand__list">
            <li class="stand__row stand__row--local" style="--pc:var(--p-blue)"><span class="stand__player"><span class="stand__rank">1</span><span class="stand__pdot"></span><span class="stand__name">You</span></span><span>686</span><span>686</span><span>25</span><span>+25</span><span class="pct">100%</span></li>
            <li class="stand__row" style="--pc:var(--p-orange)"><span class="stand__player"><span class="stand__rank">2</span><span class="stand__pdot"></span><span class="stand__name">AI 3</span></span><span>412</span><span>423</span><span>14</span><span>+14</span><span class="pct">97%</span></li>
            <li class="stand__row" style="--pc:var(--p-green)"><span class="stand__player"><span class="stand__rank">3</span><span class="stand__pdot"></span><span class="stand__name">AI 4</span></span><span>358</span><span>374</span><span>13</span><span>+13</span><span class="pct">96%</span></li>
            <li class="stand__row" style="--pc:var(--p-purple)"><span class="stand__player"><span class="stand__rank">4</span><span class="stand__pdot"></span><span class="stand__name">AI 5</span></span><span>350</span><span>375</span><span>13</span><span>+13</span><span class="pct">93%</span></li>
            <li class="stand__row" style="--pc:var(--p-red)"><span class="stand__player"><span class="stand__rank">5</span><span class="stand__pdot"></span><span class="stand__name">AI 1</span></span><span>347</span><span>362</span><span>11</span><span>+11</span><span class="pct">96%</span></li>
          </ul>
          <div class="stand__totals"><span>Totals</span><span>2,493</span><span>2,569</span><span>87</span><span>+87</span><span></span></div>
        </section>

        <section class="panel">
          <div class="panel__head"><div><div class="panel__eyebrow">Selection</div><h3 class="panel__title">Star View</h3></div><div class="panel__tools"><span class="icon-btn">‹</span><span class="icon-btn">◎</span><span class="icon-btn">›</span></div></div>
          <div class="star__id"><div class="star__orb"></div><div><div class="star__name">Star 38</div><div class="star__meta"><span class="atk">Attack</span> · AI 3</div></div></div>
          <div class="star__grid">
            <div class="star__cell"><div class="k">Active</div><div class="v">24</div></div>
            <div class="star__cell"><div class="k">Damaged</div><div class="v">0</div></div>
            <div class="star__cell"><div class="k">Prod</div><div class="v">1</div></div>
            <div class="star__cell"><div class="k">Repair</div><div class="v">20%</div></div>
            <div class="star__cell"><div class="k">Transfer</div><div class="v">0.1%</div></div>
            <div class="star__cell"><div class="k">Activate</div><div class="v">0.5%</div></div>
          </div>
          <div class="star__targets"><div class="star__kv"><span class="k">Current target</span><span class="v">Star 27</span></div><div class="star__kv"><span class="k">Queued target</span><span class="v none">None</span></div></div>
        </section>
      </div>
    </div>
  </section>

  <section class="details">
    <h2>Detail — the control row</h2>
    <p>"Sliders too crowded, remove the glow, neutral palette." Fixed at the component, so it lands across every section and every theme at once — the label stops fighting the slider for horizontal space and the thumb stops glowing.</p>
    <div class="ba">
      <div class="ba__col before"><div class="ba__tag">Before</div>
        <div class="old-row"><div class="old-row__label">Lane Midpoint Pair Count</div><div class="old-nudge">−</div><div class="old-range"><div class="old-range__track"></div><div class="old-range__thumb"></div></div><div class="old-nudge">+</div><div class="old-row__val">1</div></div>
        <div class="old-row"><div class="old-row__label">Corridor Sample Count</div><div class="old-nudge">−</div><div class="old-range"><div class="old-range__track"></div><div class="old-range__thumb" style="left:35%"></div></div><div class="old-nudge">+</div><div class="old-row__val">Auto</div></div>
        <p class="ba__note">Label wraps, five zones per line, glow reads as "selected" when nothing is.</p>
      </div>
      <div class="ba__col after"><div class="ba__tag">After</div>
        <div class="ctrl"><div class="ctrl__head"><span class="ctrl__label">Lane Midpoint Pair Count</span><span class="ctrl__value">1</span></div><div class="range"><div class="range__track"></div><div class="range__fill" style="width:10%"></div><div class="range__thumb" style="left:10%"></div></div></div>
        <div class="ctrl"><div class="ctrl__head"><span class="ctrl__label">Corridor Sample Count</span><span class="ctrl__value">Auto</span></div><div class="range"><div class="range__track"></div><div class="range__fill" style="width:35%"></div><div class="range__thumb" style="left:35%"></div></div></div>
        <p class="ba__note">One line for label + value, full-width calm track, nudges move to hover / keyboard.</p>
      </div>
    </div>
    <ul class="callouts">
      <li><span class="m">TB</span><span><b>Topbar earns its hierarchy.</b> The four-cell "You / Active / Total / Stars" block is gone — it duplicated the standings. The centre carries only match-state; fps &amp; ships drop to a dim "Dev" readout that hides outside dev builds.</span></li>
      <li><span class="m">SV</span><span><b>Star View loses three border levels.</b> Six boxed tiles become one hairline grid; the target box becomes a plain key–value list.</span></li>
      <li><span class="m">TH</span><span><b>The theme carries through everything.</b> Nothing in the markup is theme-specific — the standings tint, the slider fill, the brand type and the ground all re-derive from the active theme's tokens.</span></li>
    </ul>
  </section>

  <p class="footnote">
    <b>Live in-app:</b> this route renders with the real bundled faces (Cinzel, Rajdhani, JetBrains&nbsp;Mono) plus a distinct brand face per theme (Agency&nbsp;FB, Bahnschrift, Copperplate Gothic, Haettenschweiler). <b>Token model:</b> mirrors <b>pax-theme.css</b> — Aurelia Drift and Cyber Flux already live there; Nebula Veil, Starglass Prime and Broadcast Minimal would drop in as new <b>[data-pax-theme]</b> blocks. The starmap is a placeholder. This is a design lab — nothing here is wired to the live game yet.
  </p>
</div>

<style>
  .page {
    color-scheme: dark;

    /* ground & atmosphere */
    --page-bg:
      radial-gradient(ellipse at 18% -8%, rgba(85,231,239,0.07), transparent 48%),
      radial-gradient(ellipse at 92% 4%, rgba(246,196,105,0.06), transparent 44%),
      #03080b;
    --screen-bg: #03080b;
    --topbar-bg: linear-gradient(180deg, rgba(6,24,28,0.96), rgba(3,14,18,0.96));
    --map-bg:
      radial-gradient(circle at 32% 38%, rgba(85,231,239,0.09), transparent 44%),
      radial-gradient(circle at 72% 66%, rgba(246,196,105,0.09), transparent 46%),
      radial-gradient(circle 1px at 20% 30%, rgba(255,255,255,0.20) 1px, transparent 0),
      radial-gradient(circle 1px at 55% 60%, rgba(255,255,255,0.15) 1px, transparent 0),
      radial-gradient(circle 1px at 78% 28%, rgba(255,255,255,0.16) 1px, transparent 0),
      radial-gradient(circle 1px at 40% 78%, rgba(255,255,255,0.12) 1px, transparent 0),
      #081216;

    /* panels */
    --panel-bg:
      linear-gradient(180deg, rgba(4,20,24,0.94), rgba(2,10,15,0.96)),
      radial-gradient(circle at 18% 0%, rgba(85,231,239,0.10), transparent 42%),
      radial-gradient(circle at 85% 0%, rgba(246,196,105,0.11), transparent 45%);
    --panel-border: rgba(246,196,105,0.34);
    --panel-border-strong: rgba(246,196,105,0.66);
    --panel-glow: 0 22px 58px rgba(2,6,23,0.52), inset 0 1px 0 rgba(255,232,170,0.10);
    --panel-radius: 12px;
    --divider: rgba(246,196,105,0.18);

    /* text */
    --text-strong: rgba(255,247,224,0.97);
    --text: rgba(224,232,232,0.90);
    --text-muted: rgba(180,188,188,0.88);
    --text-dim: rgba(128,141,145,0.78);

    /* accents: LIVE (interactive) + FRAME (architecture) */
    --accent: #55e7ef;
    --accent-strong: #9ff8ff;
    --frame: #f6c469;
    --frame-strong: #ffe3a3;
    --on-accent: #03080b;

    /* controls */
    --inset: rgba(5,24,29,0.72);
    --track: #101c21;
    --chip-border: rgba(246,196,105,0.20);
    --glow: 8px;

    /* player / faction signals */
    --p-blue: #4488ff; --p-red: #ff4466; --p-green: #44ff88;
    --p-yellow: #ffcc44; --p-purple: #aa66ff; --p-orange: #ff8844;

    /* brand wordmark */
    --brand-font: "Cinzel", Georgia, "Times New Roman", serif;
    --brand-weight: 700; --brand-style: normal;
    --brand-spacing: 0.14em; --brand-transform: uppercase;

    --font-ui: "Rajdhani", "Segoe UI", system-ui, sans-serif;
    --font-data: "JetBrains Mono", "Cascadia Mono", ui-monospace, monospace;
  }

  /* ============================ CYBER FLUX ============================ */
  .page[data-preview-theme="cyber-flux"] {
    --page-bg:
      radial-gradient(ellipse at 50% 118%, rgba(255,58,192,0.18), transparent 55%),
      radial-gradient(ellipse at 50% 120%, rgba(34,230,255,0.14), transparent 60%),
      #06030c;
    --screen-bg: #06030c;
    --topbar-bg: linear-gradient(180deg, rgba(18,6,26,0.95), rgba(8,3,14,0.96));
    --map-bg:
      linear-gradient(0deg, rgba(255,58,192,0.14), transparent 40%),
      repeating-linear-gradient(90deg, transparent 0 46px, rgba(34,230,255,0.05) 46px 47px),
      repeating-linear-gradient(0deg, transparent 0 46px, rgba(255,58,192,0.05) 46px 47px),
      radial-gradient(circle 1px at 30% 24%, rgba(255,255,255,0.25) 1px, transparent 0),
      radial-gradient(circle 1px at 68% 44%, rgba(255,255,255,0.18) 1px, transparent 0),
      #08040f;
    --panel-bg: linear-gradient(180deg, rgba(20,6,30,0.90), rgba(9,3,16,0.94));
    --panel-border: rgba(255,90,200,0.55);
    --panel-border-strong: rgba(255,120,215,0.85);
    --panel-glow: 0 0 22px rgba(255,50,180,0.28), 0 0 34px rgba(34,230,255,0.12), inset 0 0 14px rgba(255,60,190,0.10);
    --panel-radius: 3px;
    --divider: rgba(255,90,200,0.24);
    --text-strong: #ffe9fb; --text: rgba(238,225,245,0.92);
    --text-muted: rgba(206,180,214,0.85); --text-dim: rgba(150,120,165,0.8);
    --accent: #ff3cc0; --accent-strong: #ff8fe0;
    --frame: #22e6ff; --frame-strong: #9ff8ff;
    --on-accent: #0a0012;
    --inset: rgba(30,8,42,0.7); --track: #1c0a2a;
    --chip-border: rgba(255,90,200,0.35); --glow: 12px;
    --p-blue: #3ad0ff; --p-red: #ff3d6e; --p-green: #4dff9e;
    --p-yellow: #ffd23c; --p-purple: #c86bff; --p-orange: #ff8f3c;
    --brand-font: "Agency FB", "Bahnschrift", "Rajdhani", sans-serif;
    --brand-weight: 700; --brand-style: normal; --brand-spacing: 0.16em;
  }

  /* ============================ NEBULA VEIL ============================ */
  .page[data-preview-theme="nebula-veil"] {
    --page-bg:
      radial-gradient(ellipse at 15% 8%, rgba(150,90,230,0.14), transparent 42%),
      radial-gradient(ellipse at 85% 6%, rgba(60,140,255,0.14), transparent 42%),
      radial-gradient(ellipse at 78% 92%, rgba(255,180,70,0.10), transparent 46%),
      #06070f;
    --screen-bg: #06070f;
    --topbar-bg: linear-gradient(180deg, rgba(12,15,26,0.96), rgba(7,9,17,0.97));
    --map-bg:
      radial-gradient(ellipse at 24% 26%, rgba(150,90,230,0.16), transparent 40%),
      radial-gradient(ellipse at 74% 22%, rgba(60,150,255,0.16), transparent 40%),
      radial-gradient(ellipse at 30% 82%, rgba(52,224,208,0.12), transparent 40%),
      radial-gradient(ellipse at 80% 80%, rgba(255,190,74,0.12), transparent 42%),
      radial-gradient(circle 1px at 40% 40%, rgba(255,255,255,0.22) 1px, transparent 0),
      radial-gradient(circle 1px at 62% 66%, rgba(255,255,255,0.16) 1px, transparent 0),
      #080a14;
    --panel-bg: linear-gradient(180deg, rgba(13,17,30,0.92), rgba(9,11,20,0.94));
    --panel-border: rgba(126,150,210,0.22);
    --panel-border-strong: rgba(126,166,255,0.5);
    --panel-glow: 0 12px 34px rgba(0,0,0,0.55);
    --panel-radius: 12px;
    --divider: rgba(126,150,210,0.16);
    --text-strong: #eef2fb; --text: rgba(212,222,242,0.9);
    --text-muted: rgba(160,174,205,0.86); --text-dim: rgba(116,128,158,0.8);
    --accent: #3aa0ff; --accent-strong: #86c4ff;
    --frame: #8b93b8; --frame-strong: #b7c0e0;
    --on-accent: #05070f;
    --inset: rgba(16,22,38,0.85); --track: #131a2c;
    --chip-border: rgba(126,150,210,0.24); --glow: 6px;
    --p-blue: #4aa3ff; --p-red: #ff5a6a; --p-green: #34e0a0;
    --p-yellow: #ffc24a; --p-purple: #b16bff; --p-orange: #ff9a4a;
    --brand-font: "Bahnschrift", "Rajdhani", sans-serif;
    --brand-weight: 600; --brand-style: normal; --brand-spacing: 0.16em;
  }

  /* ============================ STARGLASS PRIME ============================ */
  .page[data-preview-theme="starglass-prime"] {
    --page-bg:
      radial-gradient(ellipse at 20% -6%, rgba(111,230,255,0.16), transparent 48%),
      radial-gradient(ellipse at 88% 6%, rgba(157,139,255,0.18), transparent 48%),
      linear-gradient(180deg, #0c123a, #0a0f2c);
    --screen-bg: linear-gradient(180deg, #0c1238, #090d28);
    --topbar-bg: linear-gradient(180deg, rgba(30,40,88,0.55), rgba(14,20,52,0.6));
    --map-bg:
      radial-gradient(ellipse at 26% 30%, rgba(111,230,255,0.20), transparent 42%),
      radial-gradient(ellipse at 74% 26%, rgba(157,139,255,0.22), transparent 42%),
      radial-gradient(ellipse at 62% 82%, rgba(120,180,255,0.14), transparent 44%),
      radial-gradient(circle 1px at 34% 36%, rgba(255,255,255,0.35) 1px, transparent 0),
      radial-gradient(circle 1px at 66% 60%, rgba(255,255,255,0.25) 1px, transparent 0),
      linear-gradient(180deg, #0d1440, #0b1030);
    --panel-bg: linear-gradient(180deg, rgba(120,150,225,0.14), rgba(60,80,150,0.08));
    --panel-border: rgba(180,205,255,0.28);
    --panel-border-strong: rgba(200,220,255,0.55);
    --panel-glow: 0 20px 50px rgba(4,10,44,0.5), inset 0 1px 0 rgba(255,255,255,0.16);
    --panel-radius: 16px;
    --divider: rgba(180,205,255,0.18);
    --text-strong: #f2f6ff; --text: rgba(220,230,252,0.92);
    --text-muted: rgba(184,198,232,0.88); --text-dim: rgba(140,156,200,0.82);
    --accent: #6fe6ff; --accent-strong: #bff4ff;
    --frame: #9d8bff; --frame-strong: #c7b8ff;
    --on-accent: #0b1030;
    --inset: rgba(120,150,225,0.12); --track: rgba(120,150,225,0.16);
    --chip-border: rgba(180,205,255,0.26); --glow: 10px;
    --p-blue: #62b6ff; --p-red: #ff7a94; --p-green: #63e6c4;
    --p-yellow: #ffd884; --p-purple: #b79cff; --p-orange: #ffab6b;
    --brand-font: "Copperplate Gothic Light", "Rajdhani", sans-serif;
    --brand-weight: 400; --brand-style: normal; --brand-spacing: 0.28em;
  }

  /* ============================ BROADCAST MINIMAL (light) ============================ */
  .page[data-preview-theme="broadcast-minimal"] {
    color-scheme: light;
    --page-bg:
      radial-gradient(ellipse at 90% -10%, rgba(201,151,31,0.08), transparent 40%),
      #eef0f2;
    --screen-bg: #f5f6f7;
    --topbar-bg: #ffffff;
    --map-bg:
      radial-gradient(circle 1px at 30% 30%, rgba(40,50,70,0.16) 1px, transparent 0),
      radial-gradient(circle 1px at 62% 58%, rgba(40,50,70,0.12) 1px, transparent 0),
      radial-gradient(circle 1px at 80% 34%, rgba(40,50,70,0.12) 1px, transparent 0),
      linear-gradient(180deg, #eceef1, #e6e9ed);
    --panel-bg: #ffffff;
    --panel-border: rgba(24,30,42,0.12);
    --panel-border-strong: rgba(24,30,42,0.28);
    --panel-glow: 0 8px 24px rgba(20,32,60,0.08);
    --panel-radius: 8px;
    --divider: rgba(24,30,42,0.10);
    --text-strong: #12161d; --text: #2b323d;
    --text-muted: #566172; --text-dim: #8a94a3;
    --accent: #b8871c; --accent-strong: #9a6f12;
    --frame: #45536b; --frame-strong: #2c374a;
    --on-accent: #ffffff;
    --inset: #eef1f4; --track: #e3e7ec;
    --chip-border: rgba(24,30,42,0.16); --glow: 0;
    --p-blue: #2f6fe0; --p-red: #d83a52; --p-green: #1f9e63;
    --p-yellow: #c99a1a; --p-purple: #7b52d8; --p-orange: #e07a1f;
    --brand-font: "Haettenschweiler", "Franklin Gothic Demi", "Rajdhani", sans-serif;
    --brand-weight: 400; --brand-style: normal; --brand-spacing: 0.02em;
  }

  .page { box-sizing: border-box; }
  .page :global(*) { box-sizing: border-box; }

  .page {
    min-height: 100vh;
    background: var(--page-bg);
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 15px; line-height: 1.5; letter-spacing: 0.01em;
    padding: 40px clamp(16px, 4vw, 64px) 80px;
    transition: background 0.4s ease, color 0.4s ease;
  }

  .back-link {
    position: fixed; top: 18px; left: 18px; z-index: 10;
    display: inline-flex; align-items: center; gap: 6px;
    font-family: var(--font-ui); font-size: 13px; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer;
    color: var(--text-muted); background: var(--inset);
    border: 1px solid var(--panel-border); border-radius: 999px; padding: 8px 15px 8px 12px;
    box-shadow: var(--panel-glow); transition: color .15s ease, border-color .15s ease, transform .15s ease;
  }
  .back-link:hover { color: var(--text-strong); border-color: var(--panel-border-strong); transform: translateX(-2px); }
  .back-link span { font-size: 16px; line-height: 1; }

  /* pitch */
  .pitch { max-width: 1180px; margin: 0 auto 30px; }
  .pitch__kicker { font-size: 12px; letter-spacing: 0.34em; text-transform: uppercase; color: var(--accent); margin: 0 0 14px; }
  .pitch__brand { display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; margin: 0 0 6px; }
  .pitch__brand h1 {
    font-family: var(--brand-font); font-weight: var(--brand-weight); font-style: var(--brand-style);
    font-size: clamp(30px, 5vw, 52px); letter-spacing: var(--brand-spacing); text-transform: var(--brand-transform);
    color: var(--text-strong); margin: 0; text-wrap: balance;
  }
  .pitch__brand .sub { font-size: 14px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--frame); }
  .pitch__lede { max-width: 64ch; color: var(--text-muted); font-size: 16px; line-height: 1.6; margin: 12px 0 0; }
  .pitch__lede b { color: var(--text-strong); font-weight: 600; }

  /* theme switcher */
  .themes { max-width: 1180px; margin: 26px auto 0; }
  .themes__label { font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--text-dim); margin: 0 0 12px; }
  .theme-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
  .theme-btn {
    text-align: left; cursor: pointer; font-family: var(--font-ui); color: var(--text);
    background: var(--panel-bg); border: 1px solid var(--panel-border);
    border-radius: var(--panel-radius); padding: 12px 13px 13px; transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease;
  }
  .theme-btn:hover { transform: translateY(-2px); border-color: var(--panel-border-strong); }
  .theme-btn[aria-pressed="true"] { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), var(--panel-glow); }
  .theme-btn__sw { display: flex; height: 26px; border-radius: 6px; overflow: hidden; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.08); }
  .theme-btn__sw i { flex: 1; }
  .theme-btn__name { display: block; font-size: 13.5px; font-weight: 600; color: var(--text-strong); letter-spacing: 0.02em; }
  .theme-btn__mood { display: block; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-dim); margin-top: 2px; }
  .theme-btn__tag { display: inline-block; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); border: 1px solid var(--chip-border); border-radius: 4px; padding: 1px 5px; margin-top: 8px; }

  /* laws */
  .laws { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 1180px; margin: 22px auto 0; }
  .law { background: color-mix(in srgb, var(--text-strong) 3%, transparent); border: 1px solid var(--divider); border-radius: var(--panel-radius); padding: 14px 16px; }
  .law__n { font-family: var(--font-data); font-size: 11.5px; color: var(--accent); letter-spacing: 0.1em; }
  .law h3 { margin: 5px 0; font-size: 15px; font-weight: 600; color: var(--text-strong); }
  .law p { margin: 0; font-size: 13px; color: var(--text-muted); line-height: 1.5; }

  /* the screen */
  .screen {
    max-width: 1180px; margin: 30px auto 0; background: var(--screen-bg);
    border: 1px solid var(--panel-border); border-radius: calc(var(--panel-radius) + 4px);
    box-shadow: var(--panel-glow); overflow: hidden;
    transition: background 0.4s ease, border-color 0.4s ease;
  }

  .topbar { display: flex; align-items: center; gap: 18px; height: 60px; padding: 0 16px; background: var(--topbar-bg); border-bottom: 1px solid var(--panel-border); }
  .tb-brand { display: flex; align-items: center; gap: 11px; flex-shrink: 0; }
  .tb-menu { width: 34px; height: 34px; display: grid; place-items: center; cursor: pointer; border: 1px solid var(--panel-border); border-radius: calc(var(--panel-radius) - 2px); background: var(--inset); color: var(--frame); font-size: 15px; }
  .tb-mark { width: 20px; height: 20px; border-radius: 999px; border: 2px solid var(--frame); box-shadow: 0 0 var(--glow) color-mix(in srgb, var(--frame) 60%, transparent), inset 0 0 6px color-mix(in srgb, var(--frame) 40%, transparent); }
  .tb-title { font-family: var(--brand-font); font-size: 17px; font-weight: var(--brand-weight); font-style: var(--brand-style); letter-spacing: var(--brand-spacing); text-transform: uppercase; color: var(--text-strong); }
  .tb-map { font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-dim); padding-left: 11px; border-left: 1px solid var(--divider); }

  .tb-match { display: flex; align-items: center; gap: 16px; margin: 0 auto; }
  .tb-stat { display: flex; align-items: baseline; gap: 7px; }
  .tb-stat .k { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-dim); }
  .tb-stat .v { font-family: var(--font-data); font-size: 16px; color: var(--text-strong); }
  .tb-stat--live .v { color: var(--accent-strong); }
  .tb-stat__sel { font-family: var(--font-ui); color: var(--accent-strong); }
  .tb-pause { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent); border-radius: 999px; padding: 5px 12px; background: color-mix(in srgb, var(--accent) 8%, transparent); }
  .tb-pause .glyph { font-size: 9px; letter-spacing: -1px; }

  .tb-diag { display: flex; align-items: center; gap: 10px; flex-shrink: 0; padding: 4px 10px; border-radius: calc(var(--panel-radius) - 2px); background: color-mix(in srgb, var(--text-dim) 10%, transparent); }
  .tb-diag .tag { font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-dim); border: 1px solid var(--divider); border-radius: 4px; padding: 1px 5px; }
  .tb-diag .m { font-family: var(--font-data); font-size: 12px; color: var(--text-dim); }

  .tb-modes { display: flex; gap: 4px; flex-shrink: 0; }
  .tb-mode { font-family: var(--font-ui); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); cursor: pointer; background: var(--inset); border: 1px solid var(--divider); border-radius: calc(var(--panel-radius) - 2px); padding: 6px 10px; transition: all .15s ease; }
  .tb-mode:hover { color: var(--text-strong); border-color: var(--panel-border); }
  .tb-mode--active { color: var(--on-accent); background: var(--accent); border-color: var(--accent); font-weight: 600; box-shadow: 0 0 calc(var(--glow) + 2px) color-mix(in srgb, var(--accent) 50%, transparent); }

  .tb-badge { display: inline-flex; align-items: center; gap: 9px; flex-shrink: 0; cursor: pointer; font-family: var(--font-ui); font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-strong); padding: 7px 14px; border-radius: 999px; border: 1px solid var(--panel-border-strong); background: color-mix(in srgb, var(--frame) 12%, var(--inset)); }
  .tb-badge .dot { width: 9px; height: 9px; border-radius: 999px; background: var(--p-blue); box-shadow: 0 0 var(--glow) var(--p-blue); }
  .tb-badge .n { font-family: var(--font-data); color: var(--frame-strong); }

  .screen-body { display: grid; grid-template-columns: 330px 1fr 316px; min-height: 620px; }

  .settings { background: var(--panel-bg); border-right: 1px solid var(--divider); padding: 16px; display: flex; flex-direction: column; gap: 13px; overflow: hidden; }
  .settings__search { display: flex; align-items: center; gap: 9px; border: 1px solid var(--panel-border); border-radius: calc(var(--panel-radius) - 2px); padding: 9px 12px; color: var(--text-dim); font-size: 13px; background: var(--inset); }
  .settings__cat { display: flex; align-items: center; gap: 10px; }
  .settings__cat .ico { color: var(--frame); font-size: 16px; }
  .settings__cat h2 { margin: 0; font-size: 14px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-strong); }
  .subtabs { display: flex; gap: 6px; flex-wrap: wrap; }
  .subtab { font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); padding: 5px 11px; border-radius: 999px; border: 1px solid var(--divider); cursor: pointer; background: transparent; }
  .subtab--active { color: var(--on-accent); background: var(--accent); border-color: var(--accent); font-weight: 600; }
  .sec-eyebrow { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); }
  .sec-eyebrow::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 40%, transparent), transparent); }
  .group__label { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-dim); margin: 12px 0 6px; }

  .ctrl { margin-bottom: 13px; }
  .ctrl__head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
  .ctrl__label { font-size: 13.5px; color: var(--text); }
  .ctrl__value { font-family: var(--font-data); font-size: 13px; color: var(--text-strong); }
  .ctrl__value.unit { color: var(--text-muted); }

  .range { position: relative; height: 20px; display: flex; align-items: center; }
  .range__track { position: absolute; inset: 50% 0 auto 0; transform: translateY(-50%); height: 4px; border-radius: 999px; background: var(--track); }
  .range__fill { position: absolute; left: 0; top: 50%; transform: translateY(-50%); height: 4px; border-radius: 999px; background: var(--accent); }
  .range__thumb { position: absolute; top: 50%; transform: translate(-50%,-50%); width: 13px; height: 13px; border-radius: 999px; background: var(--accent-strong); border: 2px solid var(--screen-bg); }

  .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 0; border-top: 1px solid var(--divider); }
  .toggle-row__label { font-size: 13.5px; color: var(--text); }
  .switch { width: 40px; height: 22px; border-radius: 999px; background: var(--track); border: 1px solid var(--divider); position: relative; flex-shrink: 0; }
  .switch::after { content: ""; position: absolute; width: 16px; height: 16px; border-radius: 999px; background: var(--text-dim); top: 2px; left: 2px; }
  .switch--on { background: color-mix(in srgb, var(--accent) 24%, transparent); border-color: var(--accent); }
  .switch--on::after { left: 20px; background: var(--accent-strong); }

  .gated { border-top: 1px solid var(--divider); display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; }
  .gated__title { display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--text-muted); }
  .gated__hidden { font-size: 11px; color: var(--text-dim); font-style: italic; }

  .map { position: relative; background: var(--map-bg); display: grid; place-items: center; overflow: hidden; transition: background .4s ease; }
  .map__label { text-align: center; color: var(--text-dim); font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; padding: 14px 22px; border: 1px dashed var(--divider); border-radius: var(--panel-radius); background: color-mix(in srgb, var(--screen-bg) 55%, transparent); }
  .map__label b { display: block; color: var(--text-muted); margin-bottom: 4px; letter-spacing: 0.14em; }

  .rail { background: var(--screen-bg); border-left: 1px solid var(--divider); padding: 14px; display: flex; flex-direction: column; gap: 14px; overflow: hidden; }
  .panel { background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: var(--panel-radius); box-shadow: var(--panel-glow); padding: 14px 15px; }
  .panel__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
  .panel__eyebrow { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); display: flex; align-items: center; gap: 7px; }
  .panel__eyebrow .live { width: 7px; height: 7px; border-radius: 999px; background: var(--accent); box-shadow: 0 0 var(--glow) var(--accent); animation: pf-pulse 2.4s ease-in-out infinite; }
  @keyframes pf-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
  .panel__title { margin: 3px 0 0; font-size: 15px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-strong); }
  .panel__tools { display: flex; gap: 6px; }
  .icon-btn { width: 28px; height: 28px; display: grid; place-items: center; cursor: pointer; border: 1px solid var(--divider); border-radius: calc(var(--panel-radius) - 2px); background: var(--inset); color: var(--text-muted); font-size: 12px; }

  .seg-ctrl { display: flex; gap: 4px; border: 1px solid var(--divider); border-radius: 999px; padding: 3px; }
  .seg-ctrl button { flex: 1; font-family: var(--font-ui); font-size: 11.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-muted); cursor: pointer; background: transparent; border: 0; border-radius: 999px; padding: 6px 4px; }
  .seg-ctrl button.on { color: var(--on-accent); background: var(--accent); font-weight: 600; }

  .stand__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .stand__tick { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-dim); }
  .stand__tick b { font-family: var(--font-data); color: var(--text); margin-left: 4px; }
  .stand__seg { width: 128px; }
  .stand__cols, .stand__row, .stand__totals { display: grid; grid-template-columns: 1.7fr 0.9fr 0.9fr 0.7fr 0.8fr 0.8fr; gap: 4px; align-items: center; }
  .stand__cols { font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-dim); padding: 0 8px 6px; }
  .stand__cols span:not(:first-child), .stand__row span:not(.stand__player), .stand__totals span:not(:first-child) { text-align: right; }
  .stand__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
  .stand__row { position: relative; padding: 8px; border-radius: calc(var(--panel-radius) - 2px); font-family: var(--font-data); font-size: 12.5px; color: var(--text); background: linear-gradient(90deg, color-mix(in srgb, var(--pc) 12%, transparent), transparent 70%); border-left: 2px solid var(--pc); }
  .stand__row--local { background: linear-gradient(90deg, color-mix(in srgb, var(--pc) 22%, transparent), transparent 72%); }
  .stand__player { display: flex; align-items: center; gap: 8px; font-family: var(--font-ui); letter-spacing: 0.02em; }
  .stand__rank { font-family: var(--font-data); font-size: 11px; color: var(--text-dim); width: 12px; }
  .stand__pdot { width: 8px; height: 8px; border-radius: 999px; background: var(--pc); box-shadow: 0 0 calc(var(--glow) - 2px) var(--pc); }
  .stand__name { color: var(--text-strong); }
  .stand__row .pct { color: var(--text-muted); }
  .stand__totals { padding: 10px 8px 2px; margin-top: 6px; border-top: 1px solid var(--divider); font-family: var(--font-data); font-size: 12px; color: var(--text-muted); }
  .stand__totals span:first-child { font-family: var(--font-ui); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-dim); }

  .speed__slider-label { display: flex; align-items: baseline; justify-content: space-between; margin: 14px 0 8px; }
  .speed__slider-label .k { font-size: 13px; color: var(--text); }
  .speed__slider-label .v { font-family: var(--font-data); font-size: 13px; color: var(--text-strong); }

  .star__id { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .star__orb { width: 42px; height: 42px; border-radius: 999px; border: 2px solid var(--p-green); box-shadow: 0 0 calc(var(--glow) + 4px) color-mix(in srgb, var(--p-green) 40%, transparent), inset 0 0 10px color-mix(in srgb, var(--p-green) 25%, transparent); flex-shrink: 0; }
  .star__name { font-size: 17px; font-weight: 600; color: var(--text-strong); }
  .star__meta { font-size: 12px; color: var(--text-muted); }
  .star__meta .atk { color: var(--p-green); }
  .star__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--divider); border-radius: calc(var(--panel-radius) - 2px); overflow: hidden; }
  .star__cell { background: var(--inset); padding: 10px 11px; }
  .star__cell .k { font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-dim); }
  .star__cell .v { font-family: var(--font-data); font-size: 18px; color: var(--text-strong); margin-top: 3px; }
  .star__targets { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--divider); display: flex; flex-direction: column; gap: 7px; }
  .star__kv { display: flex; align-items: baseline; justify-content: space-between; }
  .star__kv .k { font-size: 12px; color: var(--text-muted); }
  .star__kv .v { font-family: var(--font-data); font-size: 13px; color: var(--text-strong); }
  .star__kv .v.none { color: var(--text-dim); }

  .details { max-width: 1180px; margin: 42px auto 0; }
  .details > h2 { font-size: 13px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--accent); margin: 0 0 4px; }
  .details > p { color: var(--text-muted); max-width: 64ch; margin: 0 0 20px; font-size: 15px; }
  .ba { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .ba__col { background: var(--panel-bg); border: 1px solid var(--divider); border-radius: var(--panel-radius); padding: 18px; }
  .ba__col.after { border-color: color-mix(in srgb, var(--accent) 40%, transparent); }
  .ba__tag { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 16px; }
  .ba__col.before .ba__tag { color: var(--text-dim); }
  .ba__col.after .ba__tag { color: var(--accent); }
  .ba__note { color: var(--text-dim); font-size: 12.5px; margin: 12px 0 0; }
  .old-row { display: grid; grid-template-columns: 1fr auto auto auto; gap: 8px; align-items: center; margin-bottom: 12px; }
  .old-row__label { font-size: 12.5px; color: var(--text-muted); line-height: 1.2; }
  .old-nudge { width: 24px; height: 24px; display: grid; place-items: center; border: 1px solid var(--divider); border-radius: 6px; color: var(--text-dim); font-size: 13px; }
  .old-range { position: relative; width: 90px; height: 22px; }
  .old-range__track { position: absolute; inset: 50% 0 auto 0; transform: translateY(-50%); height: 5px; border-radius: 999px; background: linear-gradient(90deg, color-mix(in srgb, var(--frame) 60%, transparent), color-mix(in srgb, var(--frame) 10%, transparent)); }
  .old-range__thumb { position: absolute; top: 50%; left: 45%; transform: translate(-50%,-50%); width: 16px; height: 16px; border-radius: 999px; background: var(--frame); box-shadow: 0 0 12px var(--frame), 0 0 4px var(--frame-strong); }
  .old-row__val { font-family: var(--font-data); font-size: 13px; color: var(--text-strong); min-width: 44px; text-align: right; }

  .callouts { list-style: none; margin: 22px 0 0; padding: 0; display: grid; gap: 10px; }
  .callouts li { display: flex; gap: 12px; font-size: 14px; color: var(--text-muted); line-height: 1.5; }
  .callouts .m { flex-shrink: 0; width: 24px; height: 22px; border-radius: 6px; display: grid; place-items: center; font-family: var(--font-data); font-size: 10px; color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); }
  .callouts b { color: var(--text-strong); font-weight: 600; }

  .footnote { max-width: 1180px; margin: 40px auto 0; padding-top: 20px; border-top: 1px solid var(--divider); font-size: 13px; color: var(--text-dim); line-height: 1.6; }
  .footnote b { color: var(--text-muted); }

  @media (max-width: 1000px) { .screen-body { grid-template-columns: 1fr; } }
  @media (max-width: 900px) { .theme-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 820px) { .laws { grid-template-columns: 1fr; } }
  @media (max-width: 720px) { .ba { grid-template-columns: 1fr; } }
  @media (prefers-reduced-motion: reduce) {
    .panel__eyebrow .live { animation: none; }
    .page, .screen, .map, .theme-btn, .back-link { transition: none; }
  }
</style>
