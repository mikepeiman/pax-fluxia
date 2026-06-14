<script lang="ts">
  // Server-free HUD chrome preview for design iteration.
  // Renders the real game-hud panel chrome (.pf-hud-panel) + design-system
  // controls with mock data, so the HUD can be styled without a live match.
  import "../../../app.css";
  import HudPanel from "$lib/components/game-hud/HudPanel.svelte";
  import {
    PaxHudSegmentedControl,
    PaxHudButton,
    PaxHudIconButton,
  } from "$lib/design-system";

  let speed = $state("1");
  const speedOptions = [
    { value: "0", label: "Pause", icon: "pause" },
    { value: "1", label: "1x", icon: "play-1" },
    { value: "2", label: "2x", icon: "play-2" },
    { value: "4", label: "4x", icon: "play-4" },
    { value: "10", label: "10x", icon: "play-10" },
  ];

  const standings = [
    { rank: 1, name: "You", color: "#46d98a", ships: 2556, inf: 1743, stars: 25, you: true },
    { rank: 2, name: "AI 3", color: "#aa66ff", ships: 1742, inf: 1212, stars: 14 },
    { rank: 3, name: "AI 1", color: "#ff4466", ships: 1212, inf: 1183, stars: 16 },
    { rank: 4, name: "AI 2", color: "#ff8844", ships: 1183, inf: 1134, stars: 13 },
    { rank: 5, name: "AI 4", color: "#44ff88", ships: 1134, inf: 1120, stars: 12 },
    { rank: 6, name: "AI 5", color: "#4488ff", ships: 1102, inf: 986, stars: 10 },
  ];

  const starStats = [
    { label: "Star Type", value: "Production" },
    { label: "Control", value: "You" },
    { label: "Population", value: "3 / 3" },
    { label: "Defense", value: "●●●" },
    { label: "Development", value: "4" },
    { label: "Pressure", value: "Low · 18%" },
  ];

  const events = [
    "Turn 128 — You gained control of Delta Pavonis.",
    "Turn 128 — AI 2 completed Development on Thalor Prime.",
    "Turn 127 — Trade convoy detected near Quorin Belt.",
  ];
</script>

<div class="hud-preview">
  <div class="hud-preview__bar">
    <strong>HUD chrome preview</strong>
    <span>/dev/hud-preview · design iteration surface (no match required)</span>
  </div>

  <div class="hud-preview__rail">
    <HudPanel title="Player Standings" eyebrow="Live">
      {#snippet actions()}
        <PaxHudIconButton icon="chevron-up" title="Collapse" onclick={() => {}} />
      {/snippet}
      <table class="standings">
        <thead>
          <tr><th>#</th><th>Player</th><th>Ships</th><th>Inf</th><th>Stars</th></tr>
        </thead>
        <tbody>
          {#each standings as p}
            <tr class:is-you={p.you}>
              <td class="rank">{p.rank}</td>
              <td class="player"><span class="dot" style:background={p.color}></span>{p.name}</td>
              <td class="num">{p.ships.toLocaleString()}</td>
              <td class="num">{p.inf.toLocaleString()}</td>
              <td class="num">{p.stars}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </HudPanel>

    <HudPanel title="Star View" eyebrow="Aurelia">
      <dl class="stats">
        {#each starStats as s}
          <div class="stat-row"><dt>{s.label}</dt><dd>{s.value}</dd></div>
        {/each}
      </dl>
    </HudPanel>

    <HudPanel title="Game Speed" eyebrow="Tempo">
      <PaxHudSegmentedControl
        value={speed}
        options={speedOptions}
        ariaLabel="Game speed"
        density="compact"
        iconSize={17}
        onValueChange={(v) => (speed = v)}
      />
    </HudPanel>

    <HudPanel title="Event Feed" eyebrow="Recent">
      <ul class="feed">
        {#each events as e}<li>{e}</li>{/each}
      </ul>
    </HudPanel>

    <div class="row">
      <PaxHudButton label="Primary" intent="primary" onclick={() => {}} />
      <PaxHudButton label="Neutral" onclick={() => {}} />
      <PaxHudButton label="Danger" danger onclick={() => {}} />
    </div>
  </div>
</div>

<style>
  .hud-preview {
    min-height: 100vh;
    padding: 24px;
    background:
      radial-gradient(circle at 70% 20%, rgba(85, 231, 239, 0.08), transparent 45%),
      radial-gradient(circle at 20% 80%, rgba(246, 196, 105, 0.08), transparent 45%),
      var(--pax-color-void);
    box-sizing: border-box;
  }

  .hud-preview__bar {
    display: flex;
    gap: 12px;
    align-items: baseline;
    margin-bottom: 20px;
    color: var(--pax-ui-text-soft);
    font-family: var(--pax-ui-font-ui);
    font-size: 13px;
  }
  .hud-preview__bar strong { color: var(--pax-ui-accent-warm); letter-spacing: 0.1em; text-transform: uppercase; }

  .hud-preview__rail {
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 340px;
    margin-left: auto;
  }

  .row { display: flex; gap: 8px; flex-wrap: wrap; }

  /* Standings table */
  .standings { width: 100%; border-collapse: collapse; font-family: var(--pax-ui-font-ui); }
  .standings th {
    text-align: right;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--pax-ui-text-dim);
    padding: 0 0 6px;
    font-weight: 600;
  }
  .standings th:nth-child(1), .standings th:nth-child(2) { text-align: left; }
  .standings td { padding: 5px 0; font-size: 13px; color: var(--pax-ui-text); }
  .standings .rank { color: var(--pax-ui-text-dim); width: 18px; }
  .standings .player { display: flex; align-items: center; gap: 7px; color: var(--pax-ui-text-strong); }
  .standings .num { text-align: right; font-family: var(--pax-ui-font-data); }
  .standings .dot { width: 9px; height: 9px; border-radius: 999px; box-shadow: 0 0 8px currentColor; }
  .standings tr.is-you td { color: var(--pax-ui-accent-warm); }
  .standings tr.is-you .player { color: var(--pax-ui-accent-warm-strong); }

  /* Star stats */
  .stats { margin: 0; display: flex; flex-direction: column; gap: 2px; }
  .stat-row {
    display: flex; justify-content: space-between; align-items: baseline;
    padding: 5px 0; font-family: var(--pax-ui-font-ui); font-size: 13px;
  }
  .stat-row dt { color: var(--pax-ui-text-soft); margin: 0; }
  .stat-row dd { color: var(--pax-ui-text-strong); margin: 0; font-family: var(--pax-ui-font-data); }

  /* Event feed */
  .feed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .feed li {
    font-family: var(--pax-ui-font-copy); font-size: 12.5px; line-height: 1.4;
    color: var(--pax-ui-text-soft); padding-left: 12px; position: relative;
  }
  .feed li::before {
    content: ""; position: absolute; left: 0; top: 7px;
    width: 5px; height: 5px; border-radius: 999px; background: var(--pax-ui-accent);
  }
</style>
