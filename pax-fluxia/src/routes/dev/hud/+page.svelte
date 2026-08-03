<script lang="ts">
  /**
   * /dev/hud — the REAL HUD, every theme, one screen.
   *
   * The theme lab at /themes proves *designs*. This proves the *shipped
   * components*: PaxHudTopbar, the speed panel, the standings, the star view,
   * the render-mode picker and the whole design-system set, mounted from the
   * real modules against fixed fixture data and driven by the real
   * `paxThemeState`. Nothing here is a redraw.
   *
   * Two jobs:
   *  1. Human — compare all four identities on the actual UI, side by side,
   *     without booting a match.
   *  2. Machine — `bun run ui:audit -- --scene=hud` points at this route and
   *     computes true WCAG contrast on every text node under every theme. That
   *     is the deterministic answer to "is this readable", replacing eyeballing.
   *
   * Fixtures are frozen on purpose: a moving number makes screenshot diffs
   * useless.
   */
  import "../../../app.css";
  import { goto } from "$app/navigation";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import PaxHudTopbar from "$lib/components/hud/PaxHudTopbar.svelte";
  import PaxHudSpeedPanel from "$lib/components/hud/PaxHudSpeedPanel.svelte";
  import PaxHudStandingsPanel from "$lib/components/hud/PaxHudStandingsPanel.svelte";
  import SelectedStarPanel from "$lib/components/game-hud/SelectedStarPanel.svelte";
  import HudThemePanel from "$lib/components/game-hud/HudThemePanel.svelte";
  import RenderModePicker from "$lib/components/ui/settings/RenderModePicker.svelte";
  import {
    buildPlayerStandings,
    buildSelectedStarViewModel,
  } from "$lib/components/game-hud/viewModels";
  import { resolveTerritoryRenderModeOptions } from "$lib/territory/ui/territoryRenderModeCatalog";
  import {
    PAX_THEME_IDS,
    PAX_THEMES,
    paxThemeState,
    PaxHudButton,
    PaxHudIconButton,
    PaxHudPanel,
    PaxHudRange,
    PaxHudSegmentedControl,
    PaxHudSelect,
    PaxHudTextInput,
    PaxInfoHint,
    PaxSettingsInfoRow,
    PaxSettingsRangeRow,
    PaxSettingsToggleRow,
    type PaxHudSegmentedOption,
    type PaxThemeId,
  } from "$lib/design-system";
  import type { PlayerState, StarState } from "$lib/types/game.types";

  // ---------------------------------------------------------------- fixtures
  const players = [
    { id: "you", name: "You", color: "#4aa3ff", isAI: false, isEliminated: false, starCount: 25, totalShips: 686, activeShips: 686, damagedShips: 0, production: 25 },
    { id: "ai3", name: "AI 3", color: "#ff9a4a", isAI: true, isEliminated: false, starCount: 14, totalShips: 423, activeShips: 412, damagedShips: 11, production: 14 },
    { id: "ai4", name: "AI 4", color: "#34e0a0", isAI: true, isEliminated: false, starCount: 13, totalShips: 374, activeShips: 358, damagedShips: 16, production: 13 },
    { id: "ai5", name: "AI 5", color: "#b16bff", isAI: true, isEliminated: false, starCount: 13, totalShips: 375, activeShips: 350, damagedShips: 25, production: 13 },
    { id: "ai1", name: "AI 1", color: "#ff5a6a", isAI: true, isEliminated: false, starCount: 11, totalShips: 362, activeShips: 347, damagedShips: 15, production: 11 },
    { id: "ai2", name: "AI 2", color: "#ffc24a", isAI: true, isEliminated: false, starCount: 11, totalShips: 349, activeShips: 340, damagedShips: 9, production: 11 },
  ] as unknown as PlayerState[];

  const stars = [
    {
      id: "star-38",
      x: 0,
      y: 0,
      radius: 25,
      ownerId: "ai3",
      starType: "green",
      activeShips: 24,
      damagedShips: 4,
      productionOverflow: 0,
      repairOverflow: 0,
      lastCombatTick: 0,
      lastAttackTick: 0,
      targetId: "star-27",
      queuedOrderTargetId: null,
      productionRate: 1,
      // Stored as FRACTIONS (0.1 = 10%) — the units the real engine ships.
      repairRate: 20,
      transferRate: 0.1,
      activationRate: 0.5,
      defensivePosture: 1,
      defenseStrength: 1,
    },
  ] as unknown as StarState[];

  const standings = buildPlayerStandings(players, "you");
  const selectedStar = buildSelectedStarViewModel("star-38", stars, players, "you");
  const renderModeOptions = resolveTerritoryRenderModeOptions();

  // ---------------------------------------------------------------- state
  let speed = $state(1);
  let isPaused = $state(true);
  let tickIntervalMs = $state(1400);
  let renderMode = $state("power_vector");
  let standingsCollapsed = $state(false);
  let settingsOpen = $state(true);

  let dsSegment = $state("two");
  let dsText = $state("Kepler Reach");
  let dsSelect = $state("balanced");
  let dsToggleA = $state(true);
  let dsToggleB = $state(false);
  let dsFleetSpread = $state(64);
  let dsStarBias = $state(1.35);
  let dsPrimary = $state(true);

  const dsSegmentOptions: PaxHudSegmentedOption[] = [
    { value: "one", label: "One" },
    { value: "two", label: "Two" },
    { value: "three", label: "Three" },
  ];
  const dsSelectOptions = [
    { value: "balanced", label: "Balanced" },
    { value: "aggressive", label: "Aggressive" },
    { value: "turtle", label: "Turtle" },
  ];

  $effect(() => {
    paxThemeState.hydrate();
  });

  function selectTheme(themeId: PaxThemeId) {
    paxThemeState.setTheme(themeId);
  }

  function back() {
    if (typeof history !== "undefined" && history.length > 1) history.back();
    else void goto("/play");
  }
</script>

<svelte:head><title>Pax Fluxia — HUD review</title></svelte:head>

<div class="hudlab">
  <header class="hudlab__lead">
    <button class="hudlab__back" type="button" onclick={back}>
      <HudIcon name="chevron-left" size={14} /> Back
    </button>
    <div>
      <p class="hudlab__kicker">HUD review · the shipped components, every theme</p>
      <h1>{PAX_THEMES[paxThemeState.current].name}</h1>
      <p class="hudlab__note">{PAX_THEMES[paxThemeState.current].intent}</p>
    </div>
  </header>

  <!-- Real theme state, not a local copy: switching here is exactly what the
       Appearance settings panel does in a live match. -->
  <div class="hudlab__switch" role="group" aria-label="Theme">
    {#each PAX_THEME_IDS as themeId}
      {@const theme = PAX_THEMES[themeId]}
      <button
        type="button"
        class="hudlab__tsw"
        class:hudlab__tsw--on={paxThemeState.current === themeId}
        data-theme-id={themeId}
        onclick={() => selectTheme(themeId)}
      >
        <span class="hudlab__sw" aria-hidden="true">
          <i style:background={theme.accent.system}></i>
          <i style:background={theme.accent.selection}></i>
          <i style:background={theme.accent.danger}></i>
        </span>
        <span class="hudlab__tswname">{theme.name}</span>
      </button>
    {/each}
  </div>

  <section class="hudlab__screen" data-shot="screen">
    <div data-shot="topbar">
      <PaxHudTopbar
        {settingsOpen}
        {standingsCollapsed}
        players={standings}
        {selectedStar}
        currentTick={0}
        speed={speed as never}
        {isPaused}
        mapName="arena-further"
        onMenuClick={() => {}}
        onSettingsClick={() => (settingsOpen = !settingsOpen)}
        onToggleStandings={() => (standingsCollapsed = !standingsCollapsed)}
      />
    </div>

    <div class="hudlab__body">
      <aside class="hudlab__settings" data-shot="settings" aria-label="Render settings">
        <RenderModePicker
          value={renderMode}
          options={renderModeOptions}
          hint="The active renderer family for territory fills and borders. Each tile previews what that mode draws."
          onValueChange={(value) => (renderMode = value)}
        />
        <PaxSettingsRangeRow
          label="Star Bias"
          value={dsStarBias}
          min={0.5}
          max={2}
          step={0.05}
          onInput={(value) => (dsStarBias = value)}
        />
        <PaxSettingsToggleRow
          label="Blended Opponent Borders"
          checked={dsToggleA}
          description="Blend the seam where two players meet."
          onChange={(checked) => (dsToggleA = checked)}
        />
        <PaxSettingsToggleRow
          label="Frontier Emphasis"
          checked={dsToggleB}
          meta={dsToggleB ? "On" : "Off"}
          onChange={(checked) => (dsToggleB = checked)}
        />
        <PaxSettingsInfoRow label="Render mode" value={renderMode} />
      </aside>

      <div class="hudlab__map" aria-label="Star map stand-in">
        <p>Starmap — not themed. The map is rendered by PixiJS and owns its own visuals.</p>
      </div>

      <div class="hudlab__rail">
        <div data-shot="panel-speed">
          <PaxHudSpeedPanel
            speed={speed as never}
            {isPaused}
            hasStarted={true}
            {tickIntervalMs}
            onSpeedChange={(next) => (speed = next)}
            onPause={() => (isPaused = true)}
            onResume={() => (isPaused = false)}
            onStart={() => (isPaused = false)}
            onTickIntervalChange={(ms) => (tickIntervalMs = ms)}
          />
        </div>

        <div data-shot="panel-standings">
          <PaxHudStandingsPanel
            players={standings}
            dockSide="right"
            currentTick={0}
            highlightedPlayerId="ai3"
            onToggleDockSide={() => {}}
            onCollapse={() => (standingsCollapsed = true)}
          />
        </div>

        <div data-shot="panel-star">
          <SelectedStarPanel
            star={selectedStar}
            canCycleOwnedStars
            onCenterStar={() => {}}
            onFitMap={() => {}}
            onPreviousOwnedStar={() => {}}
            onNextOwnedStar={() => {}}
            onCancelOrder={() => {}}
          />
        </div>
      </div>
    </div>
  </section>

  <section class="hudlab__ds">
    <h2>Design-system components</h2>
    <div class="hudlab__grid">
      <div class="hudlab__cell" data-shot="ds-buttons">
        <span class="hudlab__label">PaxHudButton</span>
        <div class="hudlab__row">
          <PaxHudButton label="Primary" active={dsPrimary} onclick={() => (dsPrimary = !dsPrimary)} />
          <PaxHudButton label="Secondary" onclick={() => {}} />
          <PaxHudButton label="Danger" danger onclick={() => {}} />
          <PaxHudButton label="Disabled" disabled onclick={() => {}} />
        </div>
      </div>

      <div class="hudlab__cell" data-shot="ds-icons">
        <span class="hudlab__label">PaxHudIconButton</span>
        <div class="hudlab__row">
          <PaxHudIconButton icon="menu" title="Menu" onclick={() => {}} />
          <PaxHudIconButton icon="settings" title="Settings" onclick={() => {}} />
          <PaxHudIconButton icon="dock-left" title="Dock left" onclick={() => {}} />
          <PaxHudIconButton icon="chevron-up" title="Collapse" onclick={() => {}} />
          <PaxHudIconButton icon="atlas-star" title="Stars" onclick={() => {}} />
        </div>
      </div>

      <div class="hudlab__cell" data-shot="ds-segmented">
        <span class="hudlab__label">PaxHudSegmentedControl</span>
        <PaxHudSegmentedControl
          value={dsSegment}
          options={dsSegmentOptions}
          ariaLabel="Example segments"
          onValueChange={(value) => (dsSegment = value)}
        />
      </div>

      <div class="hudlab__cell" data-shot="ds-fields">
        <span class="hudlab__label">PaxHudTextInput · PaxHudSelect</span>
        <PaxHudTextInput value={dsText} label="Map name" placeholder="Search systems…" onInput={(value) => (dsText = value)} />
        <PaxHudSelect
          value={dsSelect}
          options={dsSelectOptions}
          label="AI strategy"
          hint="How the AI weighs attack against defence."
          onValueChange={(value) => (dsSelect = value)}
        />
      </div>

      <div class="hudlab__cell" data-shot="ds-panel">
        <span class="hudlab__label">PaxHudPanel <PaxInfoHint text="Tooltips open after a short delay — hover the mark." /></span>
        <PaxHudPanel title="Fleet Command" eyebrow="Live match">
          {#snippet actions()}
            <PaxHudIconButton icon="chevron-up" title="Collapse" onclick={() => {}} />
          {/snippet}
          <p class="hudlab__copy">
            The panel shell renders its own eyebrow, title and action slot, and picks up the
            active theme's surface, border, corner radius and type.
          </p>
          <PaxHudRange
            label="Fleet spread"
            value={dsFleetSpread}
            min={0}
            max={100}
            step={1}
            output={`${dsFleetSpread}%`}
            ariaLabel="Fleet spread"
            onInput={(value) => (dsFleetSpread = value)}
          />
        </PaxHudPanel>
      </div>

      <div class="hudlab__cell" data-shot="ds-themes">
        <span class="hudlab__label">HudThemePanel — the shipped picker</span>
        <HudThemePanel />
      </div>
    </div>
  </section>
</div>

<style>
  .hudlab {
    box-sizing: border-box;
    min-height: 100vh;
    padding: 28px clamp(16px, 4vw, 48px) 64px;
    background: var(--pax-color-void);
    color: var(--pax-ui-text);
    font-family: var(--pax-ui-font-ui);
  }
  .hudlab :global(*) { box-sizing: border-box; }

  .hudlab__lead {
    display: flex;
    align-items: flex-start;
    gap: var(--pax-gap-lg);
    max-width: 1280px;
    margin: 0 auto var(--pax-space-5);
  }

  .hudlab__back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    padding: 8px 14px;
    cursor: pointer;
    color: var(--pax-ui-text-muted);
    background: var(--pax-ui-button-bg);
    border: 1px solid var(--pax-ui-border);
    border-radius: var(--pax-ui-radius-sm);
    font: inherit;
    font-size: var(--pax-type-xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .hudlab__back:hover { color: var(--pax-ui-text-strong); border-color: var(--pax-ui-border-strong); }

  .hudlab__kicker {
    margin: 0 0 6px;
    color: var(--pax-ui-accent-strong);
    font-size: var(--pax-type-xs);
    letter-spacing: 0.26em;
    text-transform: uppercase;
  }

  .hudlab h1 {
    margin: 0;
    font-family: var(--pax-ui-font-brand);
    font-weight: var(--pax-ui-brand-weight);
    letter-spacing: var(--pax-ui-brand-tracking);
    font-size: clamp(26px, 4vw, 42px);
    text-transform: uppercase;
    color: var(--pax-ui-text-strong);
    text-shadow: var(--pax-ui-title-glow);
  }

  .hudlab__note {
    margin: 8px 0 0;
    max-width: 70ch;
    color: var(--pax-ui-text-soft);
    font-size: var(--pax-type-sm);
    line-height: 1.55;
  }

  .hudlab__switch {
    position: sticky;
    top: 8px;
    z-index: 15;
    display: flex;
    flex-wrap: wrap;
    gap: var(--pax-gap-xs);
    max-width: 1280px;
    margin: 0 auto var(--pax-space-4);
    padding: 8px;
    background: var(--pax-ui-panel-bg-strong);
    border: 1px solid var(--pax-ui-border);
    border-radius: var(--pax-ui-radius-md);
  }

  .hudlab__tsw {
    display: flex;
    align-items: center;
    gap: var(--pax-gap-sm);
    flex: 1 1 170px;
    padding: 8px 10px;
    cursor: pointer;
    color: var(--pax-ui-text);
    background: var(--pax-ui-button-bg);
    border: 1px solid var(--pax-ui-divider);
    border-radius: var(--pax-ui-radius-sm);
    font: inherit;
  }
  .hudlab__tsw:hover { border-color: var(--pax-ui-border-strong); }
  .hudlab__tsw--on {
    border-color: var(--pax-ui-accent);
    box-shadow: 0 0 0 1px var(--pax-ui-accent);
  }

  .hudlab__sw {
    display: flex;
    width: 32px;
    height: 20px;
    overflow: hidden;
    flex-shrink: 0;
    border-radius: var(--pax-ui-radius-xs);
  }
  .hudlab__sw i { flex: 1; }

  .hudlab__tswname {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--pax-ui-text-strong);
    font-size: var(--pax-type-xs);
    font-weight: var(--pax-weight-semibold);
  }

  .hudlab__screen {
    max-width: 1280px;
    margin: 0 auto;
    overflow: hidden;
    border: 1px solid var(--pax-ui-border);
    border-radius: var(--pax-ui-radius-lg);
    background: var(--pax-color-void-mid);
  }

  .hudlab__body {
    display: grid;
    grid-template-columns: 340px 1fr 340px;
    min-height: 620px;
  }

  .hudlab__settings {
    display: grid;
    align-content: start;
    gap: var(--pax-gap-md);
    padding: var(--pax-gap-md);
    background: var(--pax-ui-panel-bg);
    border-right: 1px solid var(--pax-ui-divider);
  }

  .hudlab__map {
    display: grid;
    place-items: center;
    padding: var(--pax-space-6);
    background: var(--pax-color-void);
  }

  .hudlab__map p {
    margin: 0;
    max-width: 34ch;
    text-align: center;
    color: var(--pax-ui-text-dim);
    font-size: var(--pax-type-xs);
    line-height: 1.5;
  }

  .hudlab__rail {
    display: grid;
    align-content: start;
    gap: var(--pax-gap-sm);
    padding: var(--pax-gap-sm);
    background: var(--pax-ui-panel-bg-strong);
    border-left: 1px solid var(--pax-ui-divider);
  }

  .hudlab__ds {
    max-width: 1280px;
    margin: var(--pax-space-8) auto 0;
  }

  .hudlab__ds h2 {
    margin: 0 0 var(--pax-space-4);
    font-family: var(--pax-ui-font-brand);
    font-weight: var(--pax-ui-brand-weight);
    letter-spacing: var(--pax-ui-brand-tracking);
    font-size: var(--pax-type-lg);
    text-transform: uppercase;
    color: var(--pax-ui-text-strong);
  }

  .hudlab__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
    gap: var(--pax-gap-md);
  }

  .hudlab__cell {
    display: grid;
    align-content: start;
    gap: var(--pax-gap-sm);
    padding: var(--pax-gap-md);
    background: var(--pax-ui-panel-bg-muted);
    border: 1px solid var(--pax-ui-divider);
    border-radius: var(--pax-ui-radius-md);
  }

  .hudlab__label {
    display: inline-flex;
    align-items: center;
    gap: var(--pax-space-1);
    color: var(--pax-ui-text-muted);
    font-family: var(--pax-ui-font-label);
    font-size: var(--pax-type-3xs);
    font-weight: var(--pax-weight-extrabold);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .hudlab__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--pax-gap-xs);
  }

  .hudlab__copy {
    margin: 0;
    color: var(--pax-ui-text-soft);
    font-size: var(--pax-type-xs);
    line-height: 1.5;
  }

  @media (max-width: 1180px) {
    .hudlab__body { grid-template-columns: 1fr; }
  }
</style>
