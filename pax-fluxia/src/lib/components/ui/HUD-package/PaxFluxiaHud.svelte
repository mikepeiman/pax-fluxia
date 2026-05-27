<script lang="ts">
  import TopCommandHeader from './TopCommandHeader.svelte';
  import LeftUtilityPanel from './LeftUtilityPanel.svelte';
  import RightTacticalRail from './RightTacticalRail.svelte';
  import BottomCommandDock from './BottomCommandDock.svelte';
  import MapStageMock from './MapStageMock.svelte';
  import MapControls from './MapControls.svelte';
  import FloatingOverlayLegend from './FloatingOverlayLegend.svelte';
  import ConfirmationModal from './ConfirmationModal.svelte';
  import CollapsedRail from './CollapsedRail.svelte';

  type LeftMode = 'overview' | 'settings' | 'overlays' | 'legend';
  type RailSide = 'right' | 'left';
  type BottomMode = 'full' | 'compact' | 'hidden';
  type Speed = 'pause' | '1x' | '2x' | '4x';
  type Tone = 'cyan' | 'amber' | 'fuchsia' | 'slate' | 'emerald';

  type Faction = {
    id: string;
    name: string;
    subtitle?: string;
    score: number | string;
    icon: string;
    metric?: string;
    progress?: number;
    tone: Tone;
  };

  type StarNode = {
    id: string;
    name: string;
    x: number;
    y: number;
    owner: string;
    type?: string;
    icon: string;
    tone: Tone;
    pips?: number;
    control?: string;
    population?: string;
    defense?: number;
    pressure?: string;
    income?: string;
    intel?: string;
    connections?: string;
  };

  type MapLane = {
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    kind: 'friendly' | 'enemy' | 'active' | 'contested' | 'neutral';
  };

  type OverlayToggle = {
    id: string;
    label: string;
    enabled: boolean;
    sample?: string;
  };

  export let title = 'Pax Fluxia';
  export let themeName = 'Aurelia Drift';
  export let matchState = {
    turn: 67,
    timer: '28:47',
    phase: 'Match Time'
  };

  export let playerFaction: Faction = {
    id: 'luminara',
    name: 'Luminara Accord',
    subtitle: '+2.6 / s',
    score: 42,
    icon: '❖',
    metric: '62%',
    progress: 62,
    tone: 'cyan'
  };

  export let opponentFaction: Faction = {
    id: 'vaelari',
    name: 'Vaelari Combine',
    subtitle: '+1.8 / s',
    score: 38,
    icon: '✹',
    metric: '38%',
    progress: 38,
    tone: 'amber'
  };

  export let standings = [
    { rank: 1, faction: 'Luminara Accord', score: 42, icon: '❖', tone: 'cyan' },
    { rank: 2, faction: 'Vaelari Combine', score: 38, icon: '✹', tone: 'amber' },
    { rank: 3, faction: 'Umbra Syndicate', score: 15, icon: '◆', tone: 'fuchsia' }
  ];

  export let resources = [
    { icon: '✦', label: 'Stars', value: '25' },
    { icon: '⬢', label: 'Flux', value: '1,340' },
    { icon: '☷', label: 'Command', value: '8 / 12' }
  ];

  export let mapNodes: StarNode[] = [
    { id: 'eryndor', name: 'Eryndor', x: 14, y: 33, owner: 'Luminara Accord', type: 'Scout', icon: '✦', tone: 'cyan', pips: 3, control: '100%', population: '2 / 3', defense: 3, pressure: 'Low (12%)', income: '+8 / turn', intel: 'High', connections: '3 / 5' },
    { id: 'seraphis', name: 'Seraphis', x: 32, y: 43, owner: 'Luminara Accord', type: 'Beacon', icon: '✦', tone: 'cyan', pips: 4, control: '100%', population: '3 / 3', defense: 4, pressure: 'Low (18%)', income: '+12 / turn', intel: 'High', connections: '4 / 5' },
    { id: 'aurelia', name: 'Aurelia', x: 43, y: 52, owner: 'Luminara Accord', type: 'Capital Star', icon: '✦', tone: 'cyan', pips: 5, control: '100%', population: '3 / 3', defense: 8, pressure: 'Stable (24%)', income: '+36 / turn', intel: 'High', connections: '5 / 5' },
    { id: 'orionis', name: 'Orionis', x: 64, y: 49, owner: 'Vaelari Combine', type: 'Forge', icon: '✦', tone: 'amber', pips: 4, control: '62%', population: '2 / 3', defense: 5, pressure: 'Rising (45%)', income: '+18 / turn', intel: 'Medium', connections: '4 / 5' },
    { id: 'thaler', name: 'Thalor Prime', x: 73, y: 36, owner: 'Vaelari Combine', type: 'Production', icon: '✦', tone: 'amber', pips: 3, control: '100%', population: '3 / 3', defense: 7, pressure: 'Low (20%)', income: '+24 / turn', intel: 'Medium', connections: '3 / 5' },
    { id: 'dread', name: 'Dreadnought', x: 67, y: 56, owner: 'Umbra Syndicate', type: 'Attack', icon: '△', tone: 'fuchsia', pips: 2, control: '78%', population: '2 / 3', defense: 4, pressure: 'High (68%)', income: '+16 / turn', intel: 'Low', connections: '3 / 5' },
    { id: 'quorin', name: 'Quorin Belt', x: 62, y: 72, owner: 'Neutral', type: 'Belt', icon: '◌', tone: 'slate', pips: 2, control: '0%', population: '0 / 3', defense: 2, pressure: 'Unknown', income: '+10 / turn', intel: 'Scouted', connections: '2 / 5' },
    { id: 'nerithus', name: 'Nerithus', x: 48, y: 72, owner: 'Luminara Accord', type: 'Relay', icon: '✦', tone: 'cyan', pips: 3, control: '100%', population: '2 / 3', defense: 3, pressure: 'Low (16%)', income: '+9 / turn', intel: 'High', connections: '3 / 5' },
    { id: 'zephyra', name: 'Zephyra', x: 80, y: 74, owner: 'Umbra Syndicate', type: 'Veil', icon: '✦', tone: 'fuchsia', pips: 3, control: '83%', population: '2 / 3', defense: 5, pressure: 'Medium (52%)', income: '+14 / turn', intel: 'Low', connections: '3 / 5' }
  ];

  export let mapLanes: MapLane[] = [
    { id: 'l1', x1: 14, y1: 33, x2: 32, y2: 43, kind: 'friendly' },
    { id: 'l2', x1: 32, y1: 43, x2: 43, y2: 52, kind: 'friendly' },
    { id: 'l3', x1: 43, y1: 52, x2: 64, y2: 49, kind: 'active' },
    { id: 'l4', x1: 64, y1: 49, x2: 73, y2: 36, kind: 'enemy' },
    { id: 'l5', x1: 64, y1: 49, x2: 67, y2: 56, kind: 'enemy' },
    { id: 'l6', x1: 43, y1: 52, x2: 48, y2: 72, kind: 'friendly' },
    { id: 'l7', x1: 48, y1: 72, x2: 62, y2: 72, kind: 'contested' },
    { id: 'l8', x1: 67, y1: 56, x2: 80, y2: 74, kind: 'enemy' }
  ];

  export let overlayToggles: OverlayToggle[] = [
    { id: 'territory', label: 'Territory', enabled: true, sample: 'fill' },
    { id: 'borders', label: 'Borders', enabled: true, sample: 'solid' },
    { id: 'pressure', label: 'Pressure', enabled: true, sample: 'gradient' },
    { id: 'influence', label: 'Influence', enabled: false, sample: 'dashed' },
    { id: 'lanes', label: 'Lanes', enabled: true, sample: 'line' },
    { id: 'connections', label: 'Connections', enabled: true, sample: 'line' },
    { id: 'orders', label: 'Orders', enabled: true, sample: 'arrows' },
    { id: 'labels', label: 'Star Labels', enabled: true, sample: 'text' }
  ];

  export let commandModes = [
    { icon: '▲', label: 'Fleet' },
    { icon: '◎', label: 'Order' },
    { icon: '⚒', label: 'Build' },
    { icon: '⚛', label: 'Research' },
    { icon: '♛', label: 'Diplomacy' },
    { icon: '◉', label: 'Intel' }
  ];

  export let quickStars = [
    { id: 'aurelia', name: 'Aurelia', value: 12, icon: '✦', tone: 'cyan' },
    { id: 'seraphis', name: 'Seraphis', value: 11, icon: '✦', tone: 'cyan' },
    { id: 'nerithus', name: 'Nerithus', value: 8, icon: '✦', tone: 'cyan' },
    { id: 'orionis', name: 'Orionis', value: 7, icon: '✦', tone: 'amber' },
    { id: 'dread', name: 'Dreadnought', value: 6, icon: '△', tone: 'fuchsia' }
  ];

  export let orders = [
    { index: 1, type: 'Move Fleet', from: 'Aurelia', target: 'Orionis', eta: 2, icon: '↗', tone: 'cyan' },
    { index: 2, type: 'Hold Position', from: 'Aurelia', target: 'Orionis', eta: 3, icon: '⬟', tone: 'amber' },
    { index: 3, type: 'Fortify', from: 'Aurelia', target: 'Aurelia', eta: 4, icon: '▣', tone: 'amber' }
  ];

  export let events = [
    { time: '24:31', icon: '◎', text: 'Aurelia completed Production.', tone: 'cyan' },
    { time: '24:28', icon: '△', text: 'Vaelari launched an attack near Orionis.', tone: 'amber' },
    { time: '24:15', icon: '✦', text: 'New lane established: Aurelia → Orionis.', tone: 'cyan' }
  ];

  let leftMode: LeftMode = 'overview';
  let railSide: RailSide = 'right';
  let bottomMode: BottomMode = 'full';
  let leftCollapsed = false;
  let rightCollapsed = false;
  let selectedSpeed: Speed = '1x';
  let activeCommand = 'Order';
  let showFloatingLegend = true;
  let modalOpen = false;
  let pendingModal: 'cancel-order' | null = null;
  let selectedStarId = 'aurelia';
  let zoom = 100;

  const leftModes: Array<{ id: LeftMode; icon: string; label: string }> = [
    { id: 'overview', icon: '★', label: 'Overview' },
    { id: 'settings', icon: '⚙', label: 'Settings' },
    { id: 'overlays', icon: '◫', label: 'Overlays' },
    { id: 'legend', icon: '◇', label: 'Legend' }
  ];

  const rightRailIcons = [
    { id: 'standings', icon: '🏆', label: 'Standings' },
    { id: 'speed', icon: '▶', label: 'Game Speed' },
    { id: 'star', icon: '✦', label: 'Star View' },
    { id: 'orders', icon: '◎', label: 'Orders' },
    { id: 'feed', icon: '☷', label: 'Event Feed' }
  ];

  $: selectedStar = mapNodes.find((node) => node.id === selectedStarId) ?? mapNodes[0];
  $: ownedStarIds = mapNodes
    .filter((node) => node.owner === playerFaction.name || node.tone === playerFaction.tone)
    .map((node) => node.id);
  $: currentOrder = orders[0];
  $: shellClass = [
    `rail-${railSide}`,
    leftCollapsed ? 'left-collapsed' : '',
    rightCollapsed ? 'right-collapsed' : '',
    `bottom-${bottomMode}`
  ]
    .filter(Boolean)
    .join(' ');

  function setLeftMode(event: CustomEvent<{ mode: LeftMode }>) {
    leftMode = event.detail.mode;
    leftCollapsed = false;
  }

  function toggleOverlay(event: CustomEvent<{ id: string }>) {
    overlayToggles = overlayToggles.map((item) =>
      item.id === event.detail.id ? { ...item, enabled: !item.enabled } : item
    );
  }

  function setSpeed(event: CustomEvent<{ speed: Speed }>) {
    selectedSpeed = event.detail.speed;
  }

  function setCommandMode(event: CustomEvent<{ mode: string }>) {
    activeCommand = event.detail.mode;
  }

  function selectStar(id: string) {
    selectedStarId = id;
  }

  function handleStarSelect(event: CustomEvent<{ id: string }>) {
    selectStar(event.detail.id);
  }

  function stepOwnedStar(direction: -1 | 1) {
    if (!ownedStarIds.length) return;
    const currentIndex = ownedStarIds.indexOf(selectedStarId);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (safeIndex + direction + ownedStarIds.length) % ownedStarIds.length;
    selectedStarId = ownedStarIds[nextIndex];
  }

  function cycleBottomMode() {
    bottomMode = bottomMode === 'full' ? 'compact' : bottomMode === 'compact' ? 'hidden' : 'full';
  }

  function requestCancelOrder() {
    pendingModal = 'cancel-order';
    modalOpen = true;
  }

  function confirmModal() {
    if (pendingModal === 'cancel-order') {
      orders = orders.slice(1).map((order, index) => ({ ...order, index: index + 1 }));
    }
    pendingModal = null;
    modalOpen = false;
  }

  function removeQueuedOrder(event: CustomEvent<{ index: number }>) {
    orders = orders
      .filter((order) => order.index !== event.detail.index)
      .map((order, index) => ({ ...order, index: index + 1 }));
  }

  function updateZoom(delta: number) {
    zoom = Math.min(180, Math.max(40, zoom + delta));
  }
</script>

<section class={`pf-hud ${shellClass} isolate min-h-screen w-full overflow-hidden bg-slate-950 text-amber-50`}>
  <div class="pf-map-layer">
    <slot name="map">
      <MapStageMock
        nodes={mapNodes}
        lanes={mapLanes}
        {selectedStarId}
        showLabels={overlayToggles.find((item) => item.id === 'labels')?.enabled ?? true}
        showLanes={overlayToggles.find((item) => item.id === 'lanes')?.enabled ?? true}
        on:select-star={handleStarSelect}
      />
    </slot>
  </div>

  <div class="pf-hud-grid pointer-events-none">
    <div class="pf-top-area pointer-events-auto">
      <TopCommandHeader
        {title}
        {themeName}
        {matchState}
        {playerFaction}
        {opponentFaction}
        {railSide}
        {bottomMode}
        leftPanelCollapsed={leftCollapsed}
        tacticalRailCollapsed={rightCollapsed}
        floatingLegendOpen={showFloatingLegend}
        on:swap-rails={() => (railSide = railSide === 'right' ? 'left' : 'right')}
        on:toggle-left-panel={() => (leftCollapsed = !leftCollapsed)}
        on:toggle-tactical-rail={() => (rightCollapsed = !rightCollapsed)}
        on:cycle-bottom-dock={cycleBottomMode}
        on:toggle-floating-legend={() => (showFloatingLegend = !showFloatingLegend)}
      />
    </div>

    <div class="pf-left-area pointer-events-auto min-h-0">
      {#if leftCollapsed}
        <CollapsedRail
          title="Utility"
          variant="utility"
          items={leftModes}
          on:expand={() => (leftCollapsed = false)}
          on:open-mode={setLeftMode}
        />
      {:else}
        <LeftUtilityPanel
          mode={leftMode}
          modes={leftModes}
          {overlayToggles}
          selectedStar={selectedStar}
          on:collapse={() => (leftCollapsed = true)}
          on:mode-change={setLeftMode}
          on:toggle-overlay={toggleOverlay}
        />
      {/if}
    </div>

    <div class="pf-center-area min-h-0">
      <div class="pf-center-widgets">
        <div class="pf-map-controls pointer-events-auto">
          <MapControls
            {zoom}
            floatingLegendOpen={showFloatingLegend}
            on:zoom-in={() => updateZoom(10)}
            on:zoom-out={() => updateZoom(-10)}
            on:center-star={() => selectedStar && selectStar(selectedStar.id)}
            on:toggle-legend={() => (showFloatingLegend = !showFloatingLegend)}
          />
        </div>

        {#if showFloatingLegend}
          <div class="pf-floating-legend pointer-events-auto">
            <FloatingOverlayLegend
              {overlayToggles}
              on:toggle-overlay={toggleOverlay}
              on:close={() => (showFloatingLegend = false)}
            />
          </div>
        {/if}

        {#if modalOpen}
          <div class="pf-modal-slot pointer-events-auto">
            <ConfirmationModal
              title="Cancel Order"
              body={`Cancel the current order at ${selectedStar?.name ?? 'the selected star'}? This removes it from the queue.`}
              confirmLabel="Cancel Order"
              cancelLabel="Keep Order"
              on:confirm={confirmModal}
              on:cancel={() => (modalOpen = false)}
              on:close={() => (modalOpen = false)}
            />
          </div>
        {/if}
      </div>
    </div>

    <div class="pf-right-area pointer-events-auto min-h-0">
      {#if rightCollapsed}
        <CollapsedRail
          title="Tactical"
          variant="tactical"
          items={rightRailIcons}
          on:expand={() => (rightCollapsed = false)}
        />
      {:else}
        <RightTacticalRail
          {standings}
          speed={selectedSpeed}
          star={selectedStar}
          {currentOrder}
          {orders}
          {events}
          on:collapse={() => (rightCollapsed = true)}
          on:speed-change={setSpeed}
          on:prev-star={() => stepOwnedStar(-1)}
          on:next-star={() => stepOwnedStar(1)}
          on:focus-star={() => selectedStar && selectStar(selectedStar.id)}
          on:cancel-order={requestCancelOrder}
          on:remove-order={removeQueuedOrder}
        />
      {/if}
    </div>

    {#if bottomMode !== 'hidden'}
      <div class="pf-bottom-area pointer-events-auto">
        <BottomCommandDock
          mode={bottomMode}
          {quickStars}
          {commandModes}
          {activeCommand}
          {resources}
          selectedStarId={selectedStar?.id}
          on:select-star={(event) => selectStar(event.detail.id)}
          on:mode-change={setCommandMode}
          on:cycle-mode={cycleBottomMode}
        />
      </div>
    {/if}
  </div>
</section>

<style>
  .pf-hud {
    --pf-gap: clamp(0.65rem, 1vw, 1rem);
    --pf-pad: clamp(0.65rem, 1vw, 1rem);
    --pf-left-col: minmax(15.5rem, 19.5rem);
    --pf-right-col: minmax(18rem, 22rem);
    --pf-bottom-row: clamp(4.75rem, 8vh, 6.5rem);
    --pf-top-row: auto;
  }

  .pf-hud.left-collapsed {
    --pf-left-col: 3.5rem;
  }

  .pf-hud.right-collapsed {
    --pf-right-col: 3.5rem;
  }

  .pf-hud.bottom-compact {
    --pf-bottom-row: 4.3rem;
  }

  .pf-hud.bottom-hidden {
    --pf-bottom-row: 0rem;
  }

  .pf-map-layer {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .pf-hud-grid {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: grid;
    grid-template-columns: var(--pf-left-col) minmax(0, 1fr) var(--pf-right-col);
    grid-template-rows: var(--pf-top-row) minmax(0, 1fr) var(--pf-bottom-row);
    grid-template-areas:
      'top top top'
      'left center right'
      'bottom bottom bottom';
    gap: var(--pf-gap);
    padding: var(--pf-pad);
  }

  .pf-top-area {
    grid-area: top;
  }

  .pf-left-area {
    grid-area: left;
  }

  .pf-right-area {
    grid-area: right;
  }

  .pf-center-area {
    grid-area: center;
    position: relative;
    pointer-events: none;
  }

  .pf-bottom-area {
    grid-area: bottom;
    min-height: 0;
  }

  .pf-hud.rail-left .pf-left-area {
    grid-area: right;
  }

  .pf-hud.rail-left .pf-right-area {
    grid-area: left;
  }

  .pf-center-widgets {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .pf-map-controls {
    position: absolute;
    left: 0;
    bottom: 0;
  }

  .pf-floating-legend {
    position: absolute;
    left: 1rem;
    top: 1rem;
    width: min(22rem, 42vw);
  }

  .pf-modal-slot {
    position: absolute;
    left: 50%;
    bottom: clamp(1.5rem, 8vh, 5.5rem);
    width: min(34rem, 92%);
    transform: translateX(-50%);
  }

  @media (max-width: 1120px) {
    .pf-hud {
      --pf-left-col: 3.5rem;
      --pf-right-col: minmax(16rem, 20rem);
    }

    .pf-left-area :global(.auto-collapse-label) {
      display: none;
    }
  }

  @media (max-width: 860px) {
    .pf-hud-grid {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr) auto auto;
      grid-template-areas:
        'top'
        'center'
        'right'
        'bottom';
    }

    .pf-left-area {
      display: none;
    }

    .pf-floating-legend {
      left: 0;
      right: 0;
      top: 0;
      width: auto;
    }
  }
</style>
