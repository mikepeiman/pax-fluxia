<script lang="ts">
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";

  type UtilityMode = "overview" | "settings" | "overlays" | "legend";
  type RailSide = "right" | "left";
  type BottomMode = "full" | "compact" | "hidden";
  type Speed = "pause" | "1x" | "2x" | "4x";

  interface StarNode {
    id: string;
    name: string;
    x: number;
    y: number;
    owner: "self" | "rival" | "neutral";
    ships: number;
  }

  const utilityModes: Array<{ id: UtilityMode; label: string; icon: string }> = [
    { id: "overview", label: "Overview", icon: "ranking-star" },
    { id: "settings", label: "Settings", icon: "settings" },
    { id: "overlays", label: "Overlays", icon: "draw-polygon" },
    { id: "legend", label: "Legend", icon: "overlay-legend" },
  ];

  const speedOptions: Speed[] = ["pause", "1x", "2x", "4x"];
  const commandModes = ["Fleet", "Order", "Build", "Intel", "Diplomacy"];
  const legendItems = [
    { label: "Territories", icon: "map-location", tone: "cyan", value: "Visible" },
    { label: "Borders", icon: "border-all", tone: "gold", value: "Soft" },
    { label: "Orders", icon: "route", tone: "cyan", value: "Active" },
    { label: "Labels", icon: "font", tone: "muted", value: "On" },
  ];

  const stars: StarNode[] = [
    { id: "aurelia", name: "Aurelia", x: 43, y: 52, owner: "self", ships: 186 },
    { id: "solener", name: "Solener", x: 27, y: 38, owner: "self", ships: 96 },
    { id: "meridian", name: "Meridian", x: 25, y: 70, owner: "self", ships: 74 },
    { id: "orionis", name: "Orionis", x: 64, y: 49, owner: "rival", ships: 122 },
    { id: "thaler", name: "Thalor", x: 76, y: 34, owner: "rival", ships: 88 },
    { id: "quorin", name: "Quorin Belt", x: 60, y: 73, owner: "neutral", ships: 41 },
    { id: "zephyra", name: "Zephyra", x: 82, y: 74, owner: "rival", ships: 63 },
  ];

  const lanes = [
    ["solener", "aurelia", "friendly"],
    ["meridian", "aurelia", "friendly"],
    ["aurelia", "orionis", "active"],
    ["orionis", "thaler", "enemy"],
    ["orionis", "quorin", "contested"],
    ["quorin", "zephyra", "enemy"],
  ] as const;

  const standings = [
    { rank: 1, name: "Arcturus Pact", stars: 18, ships: 1248, tone: "self" },
    { rank: 2, name: "Sol Directorate", stars: 16, ships: 962, tone: "rival" },
    { rank: 3, name: "Veyron Collective", stars: 14, ships: 843, tone: "neutral" },
  ];

  let utilityMode = $state<UtilityMode>("overview");
  let railSide = $state<RailSide>("right");
  let bottomMode = $state<BottomMode>("full");
  let utilityCollapsed = $state(false);
  let tacticalCollapsed = $state(false);
  let speed = $state<Speed>("1x");
  let selectedStarId = $state("aurelia");
  let activeCommand = $state("Order");
  let legendOpen = $state(true);
  let confirmOpen = $state(false);

  const selectedStar = $derived(
    stars.find((star) => star.id === selectedStarId) ?? stars[0],
  );

  const shellClass = $derived(
    `rail-${railSide} bottom-${bottomMode} ${utilityCollapsed ? "utility-collapsed" : ""} ${tacticalCollapsed ? "tactical-collapsed" : ""}`,
  );

  function nodeById(id: string): StarNode {
    return stars.find((star) => star.id === id) ?? stars[0];
  }

  function cycleBottomMode() {
    bottomMode =
      bottomMode === "full" ? "compact" : bottomMode === "compact" ? "hidden" : "full";
  }
</script>

<section class={`ui-test-shell ${shellClass}`} aria-label="Pax Fluxia HUD layout test">
  <div class="map-stage" aria-hidden="true">
    <svg class="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
      {#each lanes as [fromId, toId, kind]}
        {@const from = nodeById(fromId)}
        {@const to = nodeById(toId)}
        <line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          class={`lane lane--${kind}`}
        />
      {/each}
    </svg>

    <div class="region region--self">Arcturus<br />Pact</div>
    <div class="region region--rival">Sol<br />Directorate</div>

    {#each stars as star}
      <button
        type="button"
        class={`star-node star-node--${star.owner}`}
        class:selected={star.id === selectedStarId}
        style={`left:${star.x}%;top:${star.y}%;`}
        onclick={() => (selectedStarId = star.id)}
      >
        <span class="star-node__orb"><HudIcon name={star.owner === "neutral" ? "grey" : "yellow"} /></span>
        <span class="star-node__name">{star.name}</span>
        <span class="star-node__ships font-hud-data">{star.ships}</span>
      </button>
    {/each}
  </div>

  <div class="hud-grid">
    <header class="test-topbar hud-panel">
      <a class="back-link" href="/?showGame=1">
        <HudIcon name="chevron-left" />
        <span>Back to Game</span>
      </a>
      <div class="test-brand">
        <span class="test-brand__mark"><HudIcon name="yellow" /></span>
        <span>Pax Fluxia UI Test</span>
      </div>
      <div class="test-meta">
        <span>Turn <strong class="font-hud-data">67</strong></span>
        <span>Timer <strong class="font-hud-data">28:47</strong></span>
        <span>Selected <strong>{selectedStar.name}</strong></span>
      </div>
      <div class="test-actions">
        <button type="button" class="icon-btn" onclick={() => (railSide = railSide === "right" ? "left" : "right")}>
          <HudIcon name={railSide === "right" ? "dock-left" : "dock-right"} />
        </button>
        <button type="button" class="icon-btn" onclick={cycleBottomMode}>
          <HudIcon name="more" />
        </button>
      </div>
    </header>

    <aside class="utility-rail hud-panel">
      {#if utilityCollapsed}
        <button type="button" class="icon-btn" onclick={() => (utilityCollapsed = false)}>
          <HudIcon name="chevron-right" />
        </button>
        {#each utilityModes as mode}
          <button type="button" class:active={utilityMode === mode.id} class="icon-btn" onclick={() => (utilityMode = mode.id)}>
            <HudIcon name={mode.icon} />
          </button>
        {/each}
      {:else}
        <div class="panel-header">
          <div>
            <p>Utility</p>
            <span>{utilityMode}</span>
          </div>
          <button type="button" class="icon-btn" onclick={() => (utilityCollapsed = true)}>
            <HudIcon name="chevron-left" />
          </button>
        </div>
        <nav class="mode-tabs" aria-label="Utility modes">
          {#each utilityModes as mode}
            <button type="button" class:active={utilityMode === mode.id} onclick={() => (utilityMode = mode.id)}>
              <HudIcon name={mode.icon} />
              <span>{mode.label}</span>
            </button>
          {/each}
        </nav>
        <div class="panel-body">
          {#if utilityMode === "overview"}
            {@render InfoCard("Empire Snapshot", [["Stars", "18"], ["Ships", "1,248"], ["Income", "+62/tick"]])}
            {@render InfoCard("Pressure", [["North Front", "Stable"], ["East Front", "Hot"], ["Reserves", "Low"]])}
          {:else if utilityMode === "settings"}
            {@render ControlCard("Visual Tuning", ["Territory opacity", "Lane glow", "UI scale"])}
          {:else if utilityMode === "overlays"}
            {@render ControlCard("Overlay Controls", ["Territory", "Borders", "Orders", "Labels"])}
          {:else}
            {@render InfoCard("Legend", [["Cyan", "Player space"], ["Gold", "Selected"], ["Red", "Enemy pressure"]])}
          {/if}
        </div>
      {/if}
    </aside>

    <main class="map-hud" aria-label="Map widgets">
      <div class="map-control hud-panel">
        <button type="button" class="icon-btn"><HudIcon name="chevron-left" /></button>
        <span class="font-hud-data">100%</span>
        <button type="button" class="icon-btn"><HudIcon name="chevron-right" /></button>
        <button type="button" class="icon-btn"><HudIcon name="fit-view" /></button>
      </div>
      {#if legendOpen}
        <div class="floating-legend hud-panel">
          <div class="panel-header">
            <div>
              <p>Overlay Legend</p>
              <span>Map-relative layers</span>
            </div>
            <button type="button" class="icon-btn" onclick={() => (legendOpen = false)}><HudIcon name="close" /></button>
          </div>
          <div class="legend-list">
            {#each legendItems as item}
              <div class={`legend-row legend-row--${item.tone}`}>
                <span class="legend-row__icon"><HudIcon name={item.icon} size={15} /></span>
                <span class="legend-row__label">{item.label}</span>
                <span class="legend-row__value">{item.value}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      {#if confirmOpen}
        <div class="confirm hud-panel">
          <p>Cancel order at {selectedStar.name}?</p>
          <span>This is a mock confirmation surface for layout testing.</span>
          <div>
            <button type="button" onclick={() => (confirmOpen = false)}>Keep Order</button>
            <button type="button" onclick={() => (confirmOpen = false)}>Cancel Order</button>
          </div>
        </div>
      {/if}
    </main>

    <aside class="tactical-rail hud-panel">
      {#if tacticalCollapsed}
        <button type="button" class="icon-btn" onclick={() => (tacticalCollapsed = false)}>
          <HudIcon name="chevron-left" />
        </button>
        <HudIcon name="ranking-star" />
        <HudIcon name="timing" />
        <HudIcon name="fleet-star" />
      {:else}
        <div class="panel-header">
          <div>
            <p>Tactical Rail</p>
            <span>Decision stack</span>
          </div>
          <button type="button" class="icon-btn" onclick={() => (tacticalCollapsed = true)}>
            <HudIcon name="chevron-right" />
          </button>
        </div>
        <div class="panel-body">
          <section class="mini-card">
            <h3>Leaderboard</h3>
            {#each standings as row}
              <div class={`standings-row standings-row--${row.tone}`}>
                <span>{row.rank}</span><strong>{row.name}</strong><span class="font-hud-data">{row.ships}</span>
              </div>
            {/each}
          </section>
          <section class="mini-card">
            <h3>Game Speed</h3>
            <div class="speed-row">
              {#each speedOptions as option}
                <button type="button" class:active={speed === option} onclick={() => (speed = option)}>
                  {option}
                </button>
              {/each}
            </div>
          </section>
          <section class="mini-card">
            <h3>Star View</h3>
            <div class="star-summary">
              <span><HudIcon name="yellow" size={34} /></span>
              <div><strong>{selectedStar.name}</strong><small>{selectedStar.owner}</small></div>
            </div>
            {@render InfoCard("", [["Ships", String(selectedStar.ships)], ["Type", "Neutron"], ["Stability", "92%"]])}
          </section>
          <section class="mini-card">
            <h3>Current Order</h3>
            <p>Move fleet from {selectedStar.name} to Orionis.</p>
            <button type="button" onclick={() => (confirmOpen = true)}>Cancel Order</button>
          </section>
        </div>
      {/if}
    </aside>

    {#if bottomMode !== "hidden"}
      <footer class="command-dock hud-panel">
        {#if bottomMode === "full"}
          <div class="quick-stars">
            {#each stars.slice(0, 5) as star}
              <button type="button" onclick={() => (selectedStarId = star.id)}>
                <HudIcon name={star.owner === "neutral" ? "grey" : "yellow"} />
                <span>{star.name}</span>
                <strong class="font-hud-data">{star.ships}</strong>
              </button>
            {/each}
          </div>
        {/if}
        <nav class="command-modes" aria-label="Command modes">
          {#each commandModes as command}
            <button type="button" class:active={activeCommand === command} onclick={() => (activeCommand = command)}>
              {command}
            </button>
          {/each}
        </nav>
      </footer>
    {/if}
  </div>
</section>

{#snippet InfoCard(title = "", rows = [] as string[][])}
  <section class="mini-card">
    {#if title}<h3>{title}</h3>{/if}
    {#each rows as [label, value]}
      <div class="data-row"><span>{label}</span><strong>{value}</strong></div>
    {/each}
  </section>
{/snippet}

{#snippet ControlCard(title: string, rows: string[])}
  <section class="mini-card">
    <h3>{title}</h3>
    {#each rows as label}
      <label class="control-row"><span>{label}</span><input type="range" min="0" max="100" value="70" /></label>
    {/each}
  </section>
{/snippet}

<style>
  .ui-test-shell {
    --left-w: 292px;
    --right-w: 344px;
    --bottom-h: 104px;
    --gap: 14px;
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    background: #030711;
    color: var(--hud-text, #dbeafe);
    font-family: var(--hud-font-ui, Rajdhani, sans-serif);
  }
  .ui-test-shell.utility-collapsed { --left-w: 64px; }
  .ui-test-shell.tactical-collapsed { --right-w: 64px; }
  .ui-test-shell.bottom-compact { --bottom-h: 74px; }
  .ui-test-shell.bottom-hidden { --bottom-h: 0px; }
  .map-stage { position: absolute; inset: 0; background: radial-gradient(circle at 30% 48%, rgba(34, 211, 238, .24), transparent 30%), radial-gradient(circle at 70% 46%, rgba(251, 191, 36, .2), transparent 28%), linear-gradient(135deg, #020617, #071523 58%, #090611); }
  .map-lines { position: absolute; inset: 0; width: 100%; height: 100%; }
  .lane { stroke-width: .32; fill: none; }
  .lane--friendly { stroke: rgba(94, 230, 255, .42); }
  .lane--active { stroke: rgba(94, 230, 255, .92); stroke-dasharray: 1.4 .7; }
  .lane--enemy { stroke: rgba(255, 119, 119, .58); }
  .lane--contested { stroke: rgba(255, 200, 107, .72); stroke-dasharray: .8 .7; }
  .region { position: absolute; font-size: clamp(1.6rem, 3vw, 3.2rem); font-weight: 800; line-height: .9; letter-spacing: .08em; opacity: .18; text-align: center; text-transform: uppercase; }
  .region--self { left: 12%; top: 54%; color: #67e8f9; }
  .region--rival { right: 10%; top: 52%; color: #fbbf24; }
  .hud-grid { position: relative; z-index: 2; display: grid; min-height: 100vh; gap: var(--gap); padding: var(--gap); pointer-events: none; }
  .rail-right .hud-grid { grid-template: "top top top" 74px "left map right" minmax(0, 1fr) "bottom bottom bottom" var(--bottom-h) / var(--left-w) minmax(420px, 1fr) var(--right-w); }
  .rail-left .hud-grid { grid-template: "top top top" 74px "right map left" minmax(0, 1fr) "bottom bottom bottom" var(--bottom-h) / var(--right-w) minmax(420px, 1fr) var(--left-w); }
  .hud-panel { border: 1px solid transparent; border-radius: var(--hud-radius-md, 12px); background: linear-gradient(180deg, rgba(3, 23, 26, .94), rgba(1, 8, 13, .96)) padding-box, var(--hud-border-gradient, linear-gradient(135deg, rgba(255, 232, 170, .86), rgba(246, 196, 105, .5), rgba(1, 13, 16, .26), rgba(246, 196, 105, .58))) border-box; box-shadow: 0 24px 80px rgba(0, 0, 0, .38), inset 0 0 0 1px rgba(255, 232, 170, .035); backdrop-filter: blur(18px); pointer-events: auto; }
  .test-topbar { grid-area: top; display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto; align-items: center; gap: 16px; padding: 10px 14px; }
  .utility-rail { grid-area: left; overflow: hidden; }
  .tactical-rail { grid-area: right; overflow: hidden; }
  .map-hud { grid-area: map; position: relative; pointer-events: none; }
  .map-hud > * { pointer-events: auto; }
  .command-dock { grid-area: bottom; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 12px; overflow: hidden; }
  .back-link, .test-brand, .test-meta, .test-actions, .panel-header, .mode-tabs button, .icon-btn, .quick-stars button, .command-modes button, .speed-row button { display: flex; align-items: center; }
  .back-link { gap: 8px; height: 42px; padding: 0 12px; border: 1px solid rgba(94, 230, 255, .28); border-radius: 12px; color: #dff7ff; text-decoration: none; text-transform: uppercase; font-weight: 800; letter-spacing: .08em; }
  .test-brand { gap: 10px; color: #f9fafb; font-size: 1.08rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
  .test-brand__mark { color: #ffc86b; }
  .test-meta { justify-content: center; gap: 18px; min-width: 0; color: rgba(219, 234, 254, .76); }
  .test-meta strong { color: #fff; }
  .test-actions { justify-content: flex-end; gap: 8px; }
  .icon-btn { justify-content: center; width: 38px; height: 38px; border: 1px solid transparent; border-radius: var(--hud-radius-xs, 8px); background: linear-gradient(180deg, rgba(0, 21, 24, .88), rgba(0, 10, 13, .94)) padding-box, var(--hud-control-border-gradient, linear-gradient(135deg, rgba(255, 226, 155, .78), rgba(151, 102, 36, .4), rgba(0, 12, 15, .24), rgba(235, 181, 82, .52))) border-box; color: #ffe3a3; cursor: pointer; }
  .icon-btn:hover, .back-link:hover, .mode-tabs button:hover, .command-modes button:hover { border-color: rgba(94, 230, 255, .72); background: rgba(22, 37, 64, .92); }
  .panel-header { justify-content: space-between; gap: 10px; padding: 12px; border-bottom: 1px solid rgba(132, 190, 255, .14); }
  .panel-header p { margin: 0; color: #f8fafc; font-size: .82rem; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; }
  .panel-header span { color: rgba(148, 163, 184, .92); font-size: .72rem; text-transform: capitalize; }
  .mode-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 12px; }
  .mode-tabs button, .command-modes button, .speed-row button { justify-content: center; gap: 7px; min-height: 38px; border: 1px solid transparent; border-radius: var(--hud-radius-xs, 8px); background: linear-gradient(180deg, rgba(0, 21, 24, .86), rgba(0, 10, 13, .94)) padding-box, var(--hud-control-border-gradient, linear-gradient(135deg, rgba(255, 226, 155, .78), rgba(151, 102, 36, .4), rgba(0, 12, 15, .24), rgba(235, 181, 82, .52))) border-box; color: rgba(255, 235, 190, .88); padding: 9px 11px; font: inherit; cursor: pointer; }
  button.active, .active { border-color: rgba(94, 230, 255, .72) !important; background: rgba(94, 230, 255, .16) !important; color: #ecfeff !important; }
  .panel-body { display: grid; gap: 12px; max-height: calc(100vh - 180px); overflow: auto; padding: 12px; }
  .mini-card { display: grid; gap: 10px; padding: 14px; border: 1px solid transparent; border-radius: var(--hud-radius-sm, 10px); background: linear-gradient(180deg, rgba(0, 18, 21, .78), rgba(0, 9, 13, .88)) padding-box, var(--hud-control-border-gradient, linear-gradient(135deg, rgba(255, 226, 155, .66), rgba(151, 102, 36, .34), rgba(0, 12, 15, .22), rgba(235, 181, 82, .46))) border-box; }
  .mini-card h3 { margin: 0 0 2px; color: #ffc86b; font-size: .72rem; letter-spacing: .15em; text-transform: uppercase; }
  .mini-card p, .mini-card small { margin: 0; color: rgba(203, 213, 225, .86); }
  .data-row, .control-row, .standings-row { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px; color: rgba(203, 213, 225, .86); }
  .data-row strong, .standings-row strong { color: #f8fafc; }
  .control-row input { width: 104px; }
  .standings-row { grid-template-columns: 20px 1fr auto; }
  .standings-row--self { color: #67e8f9; }
  .standings-row--rival { color: #fbbf24; }
  .star-summary { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 10px; }
  .star-summary div { display: grid; gap: 2px; min-width: 0; }
  .star-summary small { display: block; color: rgba(180, 188, 188, .86); text-transform: capitalize; }
  .star-node { position: absolute; display: grid; justify-items: center; gap: 2px; transform: translate(-50%, -50%); border: 0; background: transparent; color: #e2e8f0; cursor: pointer; }
  .star-node__orb { display: grid; width: 44px; height: 44px; place-items: center; border: 1px solid rgba(148, 163, 184, .5); border-radius: 50%; background: rgba(2, 6, 23, .76); box-shadow: 0 0 24px rgba(94, 230, 255, .18); }
  .star-node--self .star-node__orb { border-color: rgba(94, 230, 255, .75); color: #67e8f9; }
  .star-node--rival .star-node__orb { border-color: rgba(251, 191, 36, .75); color: #fbbf24; }
  .star-node.selected .star-node__orb { outline: 4px solid rgba(94, 230, 255, .22); box-shadow: 0 0 42px rgba(94, 230, 255, .46); }
  .star-node__name { font-size: .72rem; font-weight: 700; text-shadow: 0 2px 8px #000; }
  .star-node__ships { padding: 1px 6px; border-radius: 999px; background: rgba(0, 0, 0, .55); color: #fff; font-size: .68rem; }
  .map-control { position: absolute; left: 0; bottom: 0; display: flex; align-items: center; gap: 8px; padding: 8px; }
  .floating-legend { position: absolute; top: 0; right: 0; display: grid; gap: 12px; width: min(306px, 42vw); padding: 14px; }
  .floating-legend .panel-header { min-height: 0; padding: 0 0 10px; }
  .legend-list { display: grid; gap: 8px; }
  .legend-row { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; gap: 9px; min-height: 36px; padding: 0 10px; border: 1px solid transparent; border-radius: var(--hud-radius-xs, 8px); background: linear-gradient(180deg, rgba(0, 18, 21, .78), rgba(0, 10, 13, .9)) padding-box, var(--hud-control-border-gradient, linear-gradient(135deg, rgba(255, 226, 155, .68), rgba(151, 102, 36, .34), rgba(0, 12, 15, .22), rgba(235, 181, 82, .44))) border-box; color: rgba(224, 232, 232, .9); }
  .legend-row__icon { display: inline-grid; place-items: center; color: #f6c469; }
  .legend-row--cyan .legend-row__icon { color: #55e7ef; }
  .legend-row--muted .legend-row__icon { color: rgba(180, 188, 188, .82); }
  .legend-row__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .72rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
  .legend-row__value { color: rgba(255, 227, 163, .82); font-family: var(--hud-font-data, monospace); font-size: .66rem; font-weight: 800; }
  .confirm { position: absolute; left: 50%; bottom: 24px; display: grid; gap: 10px; width: min(420px, 90%); padding: 16px; transform: translateX(-50%); }
  .confirm p { margin: 0; color: #fff; font-weight: 800; }
  .confirm span { color: rgba(203, 213, 225, .84); }
  .confirm div { display: flex; justify-content: flex-end; gap: 8px; }
  .confirm button, .mini-card button { min-height: 36px; border: 1px solid transparent; border-radius: var(--hud-radius-xs, 8px); background: linear-gradient(180deg, rgba(42, 35, 18, .88), rgba(3, 26, 28, .94)) padding-box, var(--hud-control-border-gradient, linear-gradient(135deg, rgba(255, 226, 155, .78), rgba(151, 102, 36, .42), rgba(0, 12, 15, .24), rgba(235, 181, 82, .54))) border-box; color: #ffedd5; padding: 8px 12px; font: inherit; cursor: pointer; }
  .speed-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .quick-stars { display: grid; grid-template-columns: repeat(5, minmax(92px, 1fr)); gap: 8px; min-width: 0; }
  .quick-stars button { gap: 8px; min-width: 0; border: 1px solid transparent; border-radius: var(--hud-radius-xs, 8px); background: linear-gradient(180deg, rgba(0, 18, 21, .78), rgba(0, 10, 13, .9)) padding-box, var(--hud-control-border-gradient, linear-gradient(135deg, rgba(255, 226, 155, .68), rgba(151, 102, 36, .34), rgba(0, 12, 15, .22), rgba(235, 181, 82, .44))) border-box; color: #e2e8f0; padding: 9px 11px; cursor: pointer; }
  .quick-stars span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .command-modes { display: grid; grid-template-columns: repeat(5, minmax(78px, 1fr)); gap: 8px; }
  .bottom-compact .command-dock { grid-template-columns: 1fr; }
  .bottom-compact .quick-stars { display: none; }
  @media (max-width: 1040px) {
    .rail-right .hud-grid, .rail-left .hud-grid { grid-template: "top top" 82px "left map" minmax(0, 1fr) "bottom bottom" var(--bottom-h) / 64px minmax(320px, 1fr); }
    .tactical-rail { display: none; }
    .test-meta { display: none; }
    .command-dock { grid-template-columns: 1fr; }
    .quick-stars { display: none; }
  }
</style>
