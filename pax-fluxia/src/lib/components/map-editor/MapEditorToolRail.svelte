<script lang="ts">
  import { fly, fade } from "svelte/transition";
  import { PORTAL_GROUP_IDS, type StarType } from "@pax/common";
  import EditorSliderField from "./EditorSliderField.svelte";
  import { mapEditorStore, type MapEditorTool } from "$lib/editor/mapEditorStore.svelte";
  import { buildRegularPolygonPoints } from "$lib/editor/mapEditorPresentation";
  import {
    mapEditorUiStore,
    type MapEditorDensityPreset,
    type MapEditorPanelId,
  } from "$lib/editor/mapEditorUiStore.svelte";

  type OwnerChoice = {
    id: string;
    label: string;
    slotLabel: string;
    color: string;
  };

  type SymmetryFold = 2 | 3 | 4 | 5 | 6;
  type RailToolPanel = Exclude<MapEditorPanelId, "library" | "validation" | "duplicate" | "selection" | "factions">;

  interface Props {
    ownerChoices: OwnerChoice[];
    selectedStarCount: number;
    portalGroupBrush: string;
    symmetryFold: SymmetryFold;
    ownerRingRadius: number;
    ownerRingThickness: number;
    ownerColorHueShift: number;
    ownerColorSaturation: number;
    ownerColorLightness: number;
    ownerColorAlpha: number;
    onSelectOwner: (ownerId: string) => void;
    onSelectStarType: (starType: StarType) => void;
    onSelectPortalGroup: (portalGroup: string) => void;
    onArmForceBrush: () => void;
    onApplyOwnerToSelection: () => void;
    onApplyForceToSelection: () => void;
    onSetSymmetryFold: (fold: SymmetryFold) => void;
    onApplySymmetry: () => void;
    onAutoConnect: () => void;
    onGenerateMeasures: () => void;
    onDuplicateSelection: () => void;
    onMirrorSelection: (axis: "horizontal" | "vertical") => void;
    onInsertTemplate: (template: "triangle" | "line" | "ring") => void;
    onWipeOwnership: () => void;
    onWipeFleets: () => void;
    onWipeConnections: () => void;
    onSetOwnerRingRadius: (value: number) => void;
    onSetOwnerRingThickness: (value: number) => void;
    onSetOwnerColorHueShift: (value: number) => void;
    onSetOwnerColorSaturation: (value: number) => void;
    onSetOwnerColorLightness: (value: number) => void;
    onSetOwnerColorAlpha: (value: number) => void;
  }

  let {
    ownerChoices,
    selectedStarCount,
    portalGroupBrush,
    symmetryFold,
    ownerRingRadius,
    ownerRingThickness,
    ownerColorHueShift,
    ownerColorSaturation,
    ownerColorLightness,
    ownerColorAlpha,
    onSelectOwner,
    onSelectStarType,
    onSelectPortalGroup,
    onArmForceBrush,
    onApplyOwnerToSelection,
    onApplyForceToSelection,
    onSetSymmetryFold,
    onApplySymmetry,
    onAutoConnect,
    onGenerateMeasures,
    onDuplicateSelection,
    onMirrorSelection,
    onInsertTemplate,
    onWipeOwnership,
    onWipeFleets,
    onWipeConnections,
    onSetOwnerRingRadius,
    onSetOwnerRingThickness,
    onSetOwnerColorHueShift,
    onSetOwnerColorSaturation,
    onSetOwnerColorLightness,
    onSetOwnerColorAlpha,
  }: Props = $props();

  const density = $derived(mapEditorUiStore.density);
  const activePanel = $derived(mapEditorUiStore.activeToolPanel);
  const railExpanded = $derived(mapEditorUiStore.railExpanded);
  const utilitiesExpanded = $derived(mapEditorUiStore.isPanelExpanded("utilities"));
  const displayExpanded = $derived(mapEditorUiStore.isPanelExpanded("display"));
  const starTypeOptions = $derived(mapEditorStore.starTypePalette);
  const activeOwnerChoice = $derived(
    ownerChoices.find((choice) => choice.id === mapEditorStore.ownerBrush) ?? ownerChoices[0],
  );
  const activeStarType = $derived(
    starTypeOptions.find((option) => option.id === mapEditorStore.starTypeBrush) ?? starTypeOptions[0],
  );
  const placeStarHotkeyLabel = $derived(`1-${Math.min(9, starTypeOptions.length)}`);
  let showHotkeyChips = $state(false);

  function panelButtonStyle(color: string) {
    return `--owner-color:${color}`;
  }

  function buttonStyle(accent: string, extra = "") {
    return `--tool-accent:${accent};${extra}`;
  }

  function activateTool(
    tool: MapEditorTool,
    panel?: RailToolPanel,
    options?: { showPanelWhenCollapsed?: boolean },
  ) {
    mapEditorStore.setTool(tool);
    if (panel) {
      if (!railExpanded && options?.showPanelWhenCollapsed === false) {
        mapEditorUiStore.closeToolPanel();
        return;
      }
      mapEditorUiStore.toggleToolPanel(panel);
      return;
    }
    mapEditorUiStore.closeToolPanel();
  }

  function togglePanel(panel: RailToolPanel) {
    mapEditorUiStore.toggleToolPanel(panel);
  }

  function toggleDrawer() {
    mapEditorUiStore.toggleRailExpanded();
  }

  function handleShellPointerDown(event: PointerEvent) {
    if (railExpanded) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (
      target.closest(".drawer-toggle") ||
      target.closest(".rail-button") ||
      target.closest(".tool-panel")
    ) {
      return;
    }
    mapEditorUiStore.setRailExpanded(true);
  }

  function railButtonTitle(label: string, hotkey?: string) {
    return hotkey ? `${label} (${hotkey})` : label;
  }

  function tooltipText(panel: MapEditorPanelId) {
    if (panel === "connect-lane") {
      return "Click or drag through stars to chain lanes. Hold Ctrl to clear.";
    }
    if (panel === "measure") {
      return "Click two anchors to create a measurement.";
    }
    return "";
  }

  function numericBadge(index: number) {
    return `${index + 1}`;
  }

  function isPortalOption(starType: StarType) {
    return starType === "portal";
  }

  function applySelectionLabel() {
    return `Apply To ${selectedStarCount} Selected Star${selectedStarCount === 1 ? "" : "s"}`;
  }

  function selectSymmetryFold(event: Event) {
    const next = Number((event.currentTarget as HTMLSelectElement).value) as SymmetryFold;
    onSetSymmetryFold(next);
  }

  function iconClass(panel: MapEditorPanelId, tool?: MapEditorTool) {
    return activePanel === panel || (tool ? mapEditorStore.tool === tool : false);
  }

  function syncHotkeyChips(event: KeyboardEvent) {
    showHotkeyChips = event.altKey;
  }

  function clearHotkeyChips() {
    showHotkeyChips = false;
  }

</script>

<svelte:window
  onkeydown={syncHotkeyChips}
  onkeyup={syncHotkeyChips}
  onblur={clearHotkeyChips}
/>

<div
  class="tool-rail-shell"
  data-density={density}
  data-expanded={railExpanded}
  role="group"
  aria-label="Map editor tool rail"
  onpointerdown={handleShellPointerDown}
>
  <div class="tool-rail">
    <button
      type="button"
      class="drawer-toggle"
      aria-label={railExpanded ? "Collapse tool drawer" : "Expand tool drawer"}
      aria-pressed={railExpanded}
      onclick={toggleDrawer}
    >
      <span class="drawer-toggle__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="16" rx="4" fill="currentColor" opacity="0.16"></rect>
          <path d="M8 8h4M8 12h4M8 16h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <path d={railExpanded ? "m15 8-3 4 3 4" : "m12 8 3 4-3 4"} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      </span>
      {#if railExpanded}
        <span class="rail-copy">
          <strong>Tool Drawer</strong>
          <small>Expand options without covering the board</small>
        </span>
      {/if}
    </button>

    <button
      type="button"
      class="rail-button"
      class:is-active={mapEditorStore.tool === "auto" && !activePanel}
      style={buttonStyle("#7dd3fc")}
      onclick={() => activateTool("auto")}
      title={railButtonTitle("Move / Select", "V")}
      aria-label="Move and select"
    >
      <span class="rail-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="m6 3 11 9h-5.1l2.2 7-2.8.9-2.2-7L5.7 16z" fill="currentColor" /><path d="M15 5h4v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.72" /></svg>
        {#if showHotkeyChips}
          <span class="hotkey-chip">V</span>
        {/if}
      </span>
      {#if railExpanded}
        <span class="rail-copy">
          <strong>Move / Select</strong>
          <small>Pan, drag, and multi-select</small>
        </span>
      {/if}
    </button>

    <button
      type="button"
      class="rail-button rail-button--star"
      class:is-active={iconClass("place-star", "place-star")}
      style={buttonStyle(activeStarType.color, `--star-color:${activeStarType.color};`)}
      onclick={() => activateTool("place-star", "place-star")}
      title={railButtonTitle("Place Star", placeStarHotkeyLabel)}
      aria-label="Place star"
    >
      <span class="rail-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><polygon points="12,3 14.8,8.3 20.7,9.2 16.4,13.4 17.4,19.3 12,16.4 6.6,19.3 7.6,13.4 3.3,9.2 9.2,8.3" fill="currentColor" /></svg>
        {#if showHotkeyChips}
          <span class="hotkey-chip">{placeStarHotkeyLabel}</span>
        {/if}
      </span>
      {#if railExpanded}
        <span class="rail-copy">
          <strong>Place Star</strong>
          <small>
            {activeStarType.label}
            {#if mapEditorStore.starTypeBrush === "portal"} · Group {portalGroupBrush}{/if}
          </small>
        </span>
      {/if}
    </button>

    <button
      type="button"
      class="rail-button rail-button--owner"
      class:is-active={iconClass("paint-owner", "paint-owner")}
      style={`${buttonStyle(activeOwnerChoice.color)};${panelButtonStyle(activeOwnerChoice.color)}`}
      onclick={() => activateTool("paint-owner", "paint-owner")}
      title={railButtonTitle("Paint Ownership", "O")}
      aria-label="Paint ownership"
    >
      <span class="rail-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M7 4v16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /><path d="M8 5h9l-2.7 3.2L17 11H8z" fill="currentColor" /><circle cx="17" cy="17" r="2.5" fill="currentColor" opacity="0.7" /></svg>
        {#if showHotkeyChips}
          <span class="hotkey-chip">O</span>
        {/if}
      </span>
      {#if railExpanded}
        <span class="rail-copy">
          <strong>Paint Ownership</strong>
          <small>{activeOwnerChoice.label}</small>
        </span>
      {/if}
    </button>

    <button
      type="button"
      class="rail-button"
      class:is-active={iconClass("paint-force", "paint-force")}
      style={buttonStyle("#fb923c")}
      onclick={() => { onArmForceBrush(); togglePanel("paint-force"); }}
      title={railButtonTitle("Paint Fleets", "F")}
      aria-label="Paint fleets"
    >
      <span class="rail-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="m6 14 4-6 4 6H6Zm5 4 3-4 3 4h-6Zm-6 0 3-4 3 4H5Z" fill="currentColor" /></svg>
        {#if showHotkeyChips}
          <span class="hotkey-chip">F</span>
        {/if}
      </span>
      {#if railExpanded}
        <span class="rail-copy">
          <strong>Paint Fleets</strong>
          <small>{mapEditorStore.forceBrush} ships</small>
        </span>
      {/if}
    </button>

    <button
      type="button"
      class="rail-button"
      class:rail-button--tooltip={!railExpanded}
      class:is-active={iconClass("connect-lane", "connect-lane")}
      style={buttonStyle("#38bdf8")}
      data-tooltip={tooltipText("connect-lane")}
      onclick={() => activateTool("connect-lane", "connect-lane", { showPanelWhenCollapsed: false })}
      title={railButtonTitle("Connect Lanes", "C")}
      aria-label="Connect lanes"
    >
      <span class="rail-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M7 8h10M8.2 9.2l7.6 5.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /><circle cx="6" cy="8" r="2.6" fill="currentColor" /><circle cx="18" cy="8" r="2.6" fill="currentColor" opacity="0.92" /><circle cx="18" cy="16" r="2.6" fill="currentColor" opacity="0.72" /></svg>
        {#if showHotkeyChips}
          <span class="hotkey-chip">C</span>
        {/if}
      </span>
      {#if railExpanded}
        <span class="rail-copy">
          <strong>Connect Lanes</strong>
          <small>Chain paths across stars</small>
        </span>
      {/if}
    </button>

    <button
      type="button"
      class="rail-button"
      class:rail-button--tooltip={!railExpanded}
      class:is-active={iconClass("measure", "measure")}
      style={buttonStyle("#4ade80")}
      data-tooltip={tooltipText("measure")}
      onclick={() => activateTool("measure", "measure", { showPanelWhenCollapsed: false })}
      title={railButtonTitle("Measurements", "R")}
      aria-label="Measurements"
    >
      <span class="rail-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M5 17 17 5l2 2-12 12H5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" /><path d="M10 12 12 14M12.8 9.2l2 2M7.2 14.8l2 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
        {#if showHotkeyChips}
          <span class="hotkey-chip">R</span>
        {/if}
      </span>
      {#if railExpanded}
        <span class="rail-copy">
          <strong>Measurements</strong>
          <small>Author distance references</small>
        </span>
      {/if}
    </button>

    <button
      type="button"
      class="rail-button"
      class:is-active={iconClass("utilities")}
      style={buttonStyle("#c084fc")}
      onclick={() => togglePanel("utilities")}
      title={railButtonTitle("Utilities", "U")}
      aria-label="Utilities"
    >
      <span class="rail-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M6 7h10M6 12h6M6 17h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /><circle cx="18" cy="7" r="2.2" fill="currentColor" /><circle cx="14" cy="12" r="2.2" fill="currentColor" opacity="0.84" /><circle cx="18" cy="17" r="2.2" fill="currentColor" opacity="0.68" /></svg>
        {#if showHotkeyChips}
          <span class="hotkey-chip">U</span>
        {/if}
      </span>
      {#if railExpanded}
        <span class="rail-copy">
          <strong>Utilities</strong>
          <small>Symmetry, templates, cleanup</small>
        </span>
      {/if}
    </button>

    <button
      type="button"
      class="rail-button"
      class:is-active={iconClass("display")}
      style={buttonStyle("#60a5fa")}
      onclick={() => togglePanel("display")}
      title={railButtonTitle("Display", "G")}
      aria-label="Display"
    >
      <span class="rail-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M5 5h14v14H5z" fill="none" stroke="currentColor" stroke-width="1.8" /><path d="M5 10h14M10 5v14" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.85" /></svg>
        {#if showHotkeyChips}
          <span class="hotkey-chip">G</span>
        {/if}
      </span>
      {#if railExpanded}
        <span class="rail-copy">
          <strong>Display</strong>
          <small>Grid and ownership rendering</small>
        </span>
      {/if}
    </button>
  </div>

  {#if activePanel}
    <section
      class="tool-panel"
      class:tool-panel--embedded={railExpanded}
      class:is-expanded={mapEditorUiStore.isPanelExpanded(activePanel)}
      in:fly={{ x: -10, duration: 140 }}
      out:fade={{ duration: 120 }}
    >
      {#if activePanel === "place-star"}
        <header>
          <div>
            <strong>Place Star</strong>
            {#if density !== "compact"}<span>Pick a star type, then place on a hex center.</span>{/if}
          </div>
        </header>
        <div class="star-grid">
          {#each starTypeOptions as option, index}
            <button
              type="button"
              class="swatch"
              class:is-active={mapEditorStore.starTypeBrush === option.id}
              onclick={() => onSelectStarType(option.id)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {#if isPortalOption(option.id)}
                  <circle cx="12" cy="12" r="8.8" fill="rgba(2, 6, 23, 0.96)" stroke={option.color} stroke-width="2.2" />
                  <circle cx="12" cy="12" r="4.6" fill="rgba(2, 6, 23, 0.98)" />
                  <path d="M6 11c1.8-3.5 6.6-4.8 11.2-.8" fill="none" stroke={option.color} stroke-width="1.5" stroke-linecap="round" />
                  <path d="M7.4 14.8c2.8 2.8 7.5 2.2 10-.9" fill="none" stroke={option.color} stroke-width="1.5" stroke-linecap="round" opacity="0.84" />
                {:else if option.sides > 0}
                  <polygon points={buildRegularPolygonPoints(7.5, option.sides)} fill={option.color} />
                {:else}
                  <circle cx="12" cy="12" r="7.5" fill={option.color} />
                {/if}
              </svg>
              <div>
                <strong>{option.label}</strong>
                <span>Key {numericBadge(index)}</span>
              </div>
            </button>
          {/each}
        </div>
        {#if mapEditorStore.starTypeBrush === "portal"}
          <div class="portal-group-card">
            <div class="portal-group-card__header">
              <strong>Portal Group</strong>
              <span>Shared capture set for linked portals.</span>
            </div>
            <div class="portal-group-grid">
              {#each PORTAL_GROUP_IDS as portalGroup}
                <button
                  type="button"
                  class="portal-group-chip"
                  class:is-active={portalGroupBrush === portalGroup}
                  onclick={() => onSelectPortalGroup(portalGroup)}
                >
                  {portalGroup}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      {:else if activePanel === "paint-owner"}
        <header>
          <div>
            <strong>Paint Ownership</strong>
            {#if density !== "compact"}<span>Pick an owner, then drag-paint on the board or apply it to the current selection.</span>{/if}
          </div>
        </header>
        <div class="owner-grid">
          {#each ownerChoices as choice}
            <button
              type="button"
              class="owner-chip"
              class:is-active={mapEditorStore.ownerBrush === choice.id}
              style={panelButtonStyle(choice.color)}
              onclick={() => onSelectOwner(choice.id)}
            >
              <span class="owner-dot"></span>
              <div>
                <strong>{choice.slotLabel}</strong>
                <span>{choice.label}</span>
              </div>
            </button>
          {/each}
        </div>
        {#if selectedStarCount > 0}
          <div class="panel-actions">
            <button type="button" class="action-btn action-btn--primary" onclick={onApplyOwnerToSelection}>
              {applySelectionLabel()}
            </button>
          </div>
        {/if}
      {:else if activePanel === "paint-force"}
        <header>
          <div>
            <strong>Paint Fleets</strong>
            {#if density !== "compact"}<span>Set the ship count, then click or drag through stars, or apply it to the current selection.</span>{/if}
          </div>
        </header>
        <EditorSliderField
          label="Fleet Count"
          value={mapEditorStore.forceBrush}
          min={0}
          max={200}
          step={5}
          accent="#c084fc"
          valueText={`${mapEditorStore.forceBrush} ships`}
          onChange={(value) => {
            mapEditorStore.forceBrush = value;
          }}
        />
        {#if selectedStarCount > 0}
          <div class="panel-actions">
            <button type="button" class="action-btn action-btn--primary" onclick={onApplyForceToSelection}>
              {applySelectionLabel()}
            </button>
          </div>
        {/if}
      {:else if activePanel === "connect-lane"}
        <header>
          <div>
            <strong>Connect Lanes</strong>
            <span>Author lane topology directly from the tool rail.</span>
          </div>
        </header>
        <div class="hint-card">
          <strong>Controls</strong>
          <ul>
            <li>Click stars to chain lanes.</li>
            <li>Drag through stars to lay down multiple lanes.</li>
            <li>Hold <kbd>Ctrl</kbd> to clear lanes.</li>
            <li>Right-click a star to peel back its newest attached lane.</li>
            <li>Right-click empty space to cancel the draft.</li>
          </ul>
        </div>
      {:else if activePanel === "measure"}
        <header>
          <div>
            <strong>Measurements</strong>
            <span>Create persistent references for lane clearance and authored-map diagnostics.</span>
          </div>
        </header>
        <div class="hint-card">
          <strong>Controls</strong>
          <ul>
            <li>Click a first anchor, then a second anchor.</li>
            <li>Anchors can snap to stars or stay freeform.</li>
            <li>Right-click to cancel the draft.</li>
          </ul>
        </div>
      {:else if activePanel === "utilities"}
        <header>
          <div>
            <strong>Utilities</strong>
            {#if density !== "compact"}<span>Higher-level generation, cleanup, and faction management.</span>{/if}
          </div>
          <button type="button" class="expand-btn" onclick={() => mapEditorUiStore.togglePanelExpanded("utilities")}>
            {utilitiesExpanded ? "Less" : "More"}
          </button>
        </header>
        <div class="stack">
          <label class="stack">
            <span>Symmetry</span>
            <div class="inline-field inline-field--segmented">
              <select class="editor-select" value={String(symmetryFold)} oninput={selectSymmetryFold}>
                <option value="2">2-fold</option>
                <option value="3">3-fold</option>
                <option value="4">4-fold</option>
                <option value="5">5-fold</option>
                <option value="6">6-fold</option>
              </select>
              <button type="button" class="action-btn action-btn--primary" onclick={onApplySymmetry}>Apply</button>
            </div>
          </label>
          <div class="utility-grid">
            <button type="button" onclick={onAutoConnect}>Auto Connect</button>
            <button type="button" onclick={onGenerateMeasures}>Lane Measures</button>
            <button type="button" onclick={onDuplicateSelection}>Clone</button>
            <button type="button" onclick={() => onMirrorSelection("horizontal")}>Mirror X</button>
            <button type="button" onclick={() => onMirrorSelection("vertical")}>Mirror Y</button>
            <button type="button" onclick={() => onInsertTemplate("triangle")}>Triangle</button>
            <button type="button" onclick={() => onInsertTemplate("line")}>Line</button>
            <button type="button" onclick={() => onInsertTemplate("ring")}>Ring</button>
          </div>
        </div>
        {#if utilitiesExpanded || density === "expanded"}
          <section class="subsection">
            <header class="subsection__header">
              <strong>Global Cleanup</strong>
            </header>
            <div class="utility-grid">
              <button type="button" onclick={onWipeOwnership}>Wipe Ownership</button>
              <button type="button" onclick={onWipeFleets}>Wipe Fleets</button>
              <button type="button" class="danger" onclick={onWipeConnections}>Wipe Connections</button>
            </div>
          </section>
          <section class="subsection">
            <header class="subsection__header">
              <strong>Faction Slots</strong>
              <button type="button" class="ghost" onclick={() => mapEditorStore.addFactionSlot()}>Add</button>
            </header>
            <div class="faction-list">
              {#each mapEditorStore.document.factions as faction}
                <div class="faction-row">
                  <span class="owner-dot owner-dot--large" style={panelButtonStyle(faction.color ?? "#94a3b8")}></span>
                  <input
                    type="text"
                    value={faction.label}
                    oninput={(event) => mapEditorStore.updateFactionSlot(faction.id, { label: (event.currentTarget as HTMLInputElement).value })}
                  />
                  <button type="button" class="ghost" onclick={() => mapEditorStore.removeFactionSlot(faction.id)}>Remove</button>
                </div>
              {/each}
            </div>
          </section>
        {/if}
      {:else if activePanel === "display"}
        <header>
          <div>
            <strong>Display</strong>
            {#if density !== "compact"}<span>Grid, ownership rings, and editor-only visual tuning.</span>{/if}
          </div>
          <button type="button" class="expand-btn" onclick={() => mapEditorUiStore.togglePanelExpanded("display")}>
            {displayExpanded ? "Less" : "More"}
          </button>
        </header>
        <EditorSliderField
          label="Hex Grid"
          value={mapEditorStore.hexRadius}
          min={10}
          max={100}
          step={1}
          accent="#60a5fa"
          valueText={`${mapEditorStore.hexRadius}px`}
          unitLabel="px"
          onChange={(value) => {
            mapEditorStore.hexRadius = value;
          }}
        />
        {#if displayExpanded || density !== "compact"}
          <div class="slider-grid">
            <EditorSliderField label="Ring Radius" value={ownerRingRadius} min={18} max={34} step={1} accent="#38bdf8" valueText={`${ownerRingRadius}px`} unitLabel="px" onChange={onSetOwnerRingRadius} />
            <EditorSliderField label="Ring Thickness" value={ownerRingThickness} min={2} max={12} step={1} accent="#22d3ee" valueText={`${ownerRingThickness}px`} unitLabel="px" onChange={onSetOwnerRingThickness} />
            <EditorSliderField label="Hue Shift" value={ownerColorHueShift} min={-180} max={180} step={1} accent="#f472b6" valueText={`${ownerColorHueShift}°`} unitLabel="deg" onChange={onSetOwnerColorHueShift} />
            <EditorSliderField label="Saturation" value={ownerColorSaturation} min={0} max={200} step={5} accent="#f59e0b" valueText={`${ownerColorSaturation}%`} unitLabel="pct" onChange={onSetOwnerColorSaturation} />
            <EditorSliderField label="Lightness" value={ownerColorLightness} min={-35} max={35} step={1} accent="#a78bfa" valueText={`${ownerColorLightness}`} onChange={onSetOwnerColorLightness} />
            <EditorSliderField label="Alpha" value={ownerColorAlpha} min={10} max={100} step={1} accent="#34d399" valueText={`${ownerColorAlpha}%`} unitLabel="pct" onChange={onSetOwnerColorAlpha} />
          </div>
        {/if}
      {/if}
    </section>
  {/if}
</div>

<style>
  .tool-rail-shell {
    position: relative;
    width: 80px;
    min-width: 80px;
    height: 100%;
    min-height: 0;
    transition:
      width 180ms ease,
      min-width 180ms ease;
  }

  .tool-rail-shell[data-expanded="true"] {
    width: 332px;
    min-width: 332px;
  }

  .tool-rail {
    width: 100%;
    height: 100%;
    padding: 12px 10px;
    border-radius: 28px;
    border: 1px solid var(--editor-border, rgba(148, 163, 184, 0.16));
    background:
      linear-gradient(180deg, rgba(20, 33, 57, 0.94), rgba(7, 14, 28, 0.96)),
      var(--editor-surface, rgba(4, 11, 26, 0.86));
    backdrop-filter: blur(22px);
    display: grid;
    align-content: start;
    gap: 10px;
    box-shadow:
      0 22px 64px rgba(0, 0, 0, 0.34),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }

  .drawer-toggle,
  .rail-button {
    width: 100%;
    min-height: 60px;
    color: rgba(226, 232, 240, 0.94);
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 14px;
    padding: 10px 12px;
    text-align: left;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
      border-color 140ms ease,
      background 140ms ease,
      box-shadow 140ms ease,
      color 140ms ease,
      transform 140ms ease;
  }

  .drawer-toggle::before,
  .rail-button::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at top left, color-mix(in srgb, var(--tool-accent, #94a3b8) 22%, transparent), transparent 58%);
    opacity: 0.92;
    pointer-events: none;
  }

  .drawer-toggle {
    --tool-accent: #cbd5f5;
    min-height: 72px;
    border-radius: 20px;
    border: 1px solid rgba(191, 219, 254, 0.22);
    background:
      linear-gradient(180deg, rgba(33, 56, 94, 0.98), rgba(14, 26, 46, 0.97));
    color: #f8fafc;
    box-shadow:
      inset 0 0 0 1px rgba(191, 219, 254, 0.08),
      0 16px 34px rgba(2, 8, 23, 0.28);
  }

  .rail-button {
    border-radius: 18px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background:
      linear-gradient(180deg, rgba(18, 29, 51, 0.94), rgba(8, 14, 28, 0.94));
  }

  .drawer-toggle:hover,
  .drawer-toggle[aria-pressed="true"],
  .rail-button:hover,
  .rail-button.is-active {
    border-color: color-mix(in srgb, var(--tool-accent, #7dd3fc) 68%, white 10%);
    background:
      linear-gradient(180deg, rgba(25, 45, 75, 0.98), rgba(10, 18, 33, 0.97));
    color: #f8fafc;
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--tool-accent, #7dd3fc) 26%, transparent),
      0 12px 30px rgba(2, 8, 23, 0.28);
    transform: translateY(-1px);
  }

  .drawer-toggle__icon,
  .rail-icon {
    width: 40px;
    height: 40px;
    min-width: 40px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--tool-accent, #94a3b8) 22%, rgba(255, 255, 255, 0.04)), rgba(8, 14, 28, 0.08));
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--tool-accent, #94a3b8) 20%, transparent),
      0 8px 18px rgba(2, 8, 23, 0.24);
    color: color-mix(in srgb, var(--tool-accent, #94a3b8) 82%, white 18%);
    position: relative;
    z-index: 1;
  }

  .hotkey-chip {
    position: absolute;
    right: -6px;
    bottom: -6px;
    min-width: 1.35rem;
    min-height: 1.15rem;
    padding: 0 0.3rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--tool-accent, #94a3b8) 48%, rgba(255, 255, 255, 0.16));
    background:
      linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(226, 232, 240, 0.94));
    box-shadow:
      0 6px 14px rgba(2, 8, 23, 0.24),
      inset 0 1px 0 rgba(255, 255, 255, 0.62);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--pax-ui-font-data);
    font-size: 0.58rem;
    font-weight: var(--pax-weight-bold);
    letter-spacing: 0.04em;
    line-height: 1;
    color: rgba(15, 23, 42, 0.96);
    pointer-events: none;
    z-index: 2;
  }

  .drawer-toggle__icon svg,
  .rail-icon svg {
    width: 24px;
    height: 24px;
  }

  .rail-copy {
    min-width: 0;
    display: grid;
    gap: 2px;
    position: relative;
    z-index: 1;
  }

  .rail-copy strong {
    display: block;
    font-family: var(--pax-ui-font-ui);
    font-size: 1rem;
    font-weight: var(--pax-weight-bold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #f8fafc;
  }

  .rail-copy small {
    display: block;
    min-width: 0;
    font-size: 0.74rem;
    line-height: 1.3;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(191, 219, 254, 0.78);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tool-rail-shell[data-expanded="false"] .drawer-toggle,
  .tool-rail-shell[data-expanded="false"] .rail-button {
    justify-content: center;
    padding-inline: 0;
  }

  .tool-rail-shell[data-expanded="false"] .drawer-toggle {
    min-height: 76px;
  }

  .tool-rail-shell[data-expanded="false"] .rail-copy {
    display: none;
  }

  .rail-button--star {
    --tool-accent: var(--star-color, #facc15);
  }

  .rail-button--owner {
    --tool-accent: var(--owner-color, #f472b6);
  }

  .rail-button--star::after,
  .rail-button--owner::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--tool-accent) 20%, transparent), transparent 72%);
    pointer-events: none;
  }

  .rail-button--owner svg circle {
    filter: drop-shadow(0 0 7px color-mix(in srgb, var(--owner-color) 56%, transparent));
  }

  .rail-button--tooltip {
    position: relative;
  }

  .rail-button--tooltip::after {
    content: attr(data-tooltip);
    position: absolute;
    left: calc(100% + 14px);
    top: 50%;
    transform: translateY(-50%) translateX(-4px);
    min-width: 220px;
    max-width: 280px;
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(3, 10, 24, 0.96);
    color: rgba(226, 232, 240, 0.94);
    font-size: 0.76rem;
    line-height: 1.35;
    text-transform: none;
    letter-spacing: 0;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.34);
    opacity: 0;
    pointer-events: none;
    transition: opacity 120ms ease, transform 120ms ease;
    z-index: 30;
  }

  .tool-rail-shell[data-expanded="true"] .rail-button--tooltip::after {
    display: none;
  }

  .rail-button--tooltip:hover::after,
  .rail-button--tooltip:focus-visible::after {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }

  .tool-panel {
    position: absolute;
    top: 0;
    left: calc(100% + 14px);
    width: min(360px, calc(100vw - 180px));
    max-height: calc(100vh - 72px);
    overflow: auto;
    padding: 14px;
    border-radius: 22px;
    border: 1px solid var(--editor-border, rgba(148, 163, 184, 0.16));
    background: rgba(3, 10, 24, 0.94);
    backdrop-filter: blur(20px);
    display: grid;
    gap: 12px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.4);
    z-index: 25;
  }

  .tool-panel--embedded {
    position: relative;
    top: auto;
    left: auto;
    width: 100%;
    max-height: none;
    margin-top: 12px;
    border-radius: 22px;
  }

  .tool-panel header,
  .subsection__header,
  .inline-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .tool-panel header div,
  .hint-card {
    display: grid;
    gap: 4px;
  }

  .slider-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .panel-actions {
    display: grid;
    gap: 8px;
  }

  .tool-panel strong,
  .tool-panel span {
    max-width: 100%;
  }

  .tool-panel header strong,
  .subsection__header strong,
  .hint-card strong {
    font-family: var(--pax-ui-font-ui);
    font-size: 0.98rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #f8fafc;
  }

  .tool-panel header span,
  .stack span {
    font-size: 0.76rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.88);
  }

  .hint-card {
    padding: 12px 14px;
    border-radius: 16px;
    border: 1px solid rgba(96, 165, 250, 0.22);
    background: linear-gradient(180deg, rgba(16, 27, 48, 0.92), rgba(7, 12, 24, 0.88));
  }

  .hint-card ul {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 6px;
    color: rgba(203, 213, 225, 0.92);
    font-size: 0.82rem;
  }

  .hint-card kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.35rem;
    min-height: 1.35rem;
    padding: 0 0.3rem;
    border-radius: 0.45rem;
    border: 1px solid rgba(148, 163, 184, 0.22);
    background: rgba(15, 23, 42, 0.9);
    font: inherit;
    font-size: 0.74rem;
    font-weight: var(--pax-weight-bold);
    color: #f8fafc;
  }

  .stack {
    display: grid;
    gap: 8px;
  }

  .star-grid,
  .owner-grid,
  .portal-group-grid,
  .utility-grid,
  .faction-list {
    display: grid;
    gap: 10px;
  }

  .star-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .owner-grid,
  .utility-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .portal-group-card {
    display: grid;
    gap: 10px;
    padding: 12px;
    border-radius: 16px;
    border: 1px solid rgba(99, 102, 241, 0.22);
    background: rgba(11, 16, 34, 0.9);
  }

  .portal-group-card__header {
    display: grid;
    gap: 4px;
  }

  .portal-group-card__header strong {
    font-family: var(--pax-ui-font-ui);
    font-size: 0.9rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #eef2ff;
  }

  .portal-group-card__header span {
    font-size: 0.74rem;
    color: rgba(165, 180, 252, 0.84);
  }

  .portal-group-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .portal-group-chip {
    min-height: 40px;
    border-radius: 12px;
    border: 1px solid rgba(129, 140, 248, 0.22);
    background: rgba(15, 23, 42, 0.88);
    color: #e0e7ff;
    font: inherit;
    font-weight: var(--pax-weight-bold);
    cursor: pointer;
  }

  .portal-group-chip.is-active {
    border-color: rgba(129, 140, 248, 0.72);
    background: rgba(55, 48, 163, 0.34);
    color: #ffffff;
  }

  .swatch,
  .owner-chip {
    min-height: 62px;
    padding: 10px 12px;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(9, 16, 31, 0.9);
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    cursor: pointer;
  }

  .swatch.is-active,
  .owner-chip.is-active {
    border-color: rgba(125, 211, 252, 0.64);
    background: rgba(10, 39, 67, 0.88);
  }

  .swatch svg {
    width: 22px;
    height: 22px;
    flex: 0 0 auto;
  }

  .swatch div,
  .owner-chip div {
    display: grid;
    gap: 2px;
  }

  .swatch strong,
  .owner-chip strong {
    font-family: var(--pax-ui-font-ui);
    font-size: 0.92rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #f8fafc;
  }

  .swatch span,
  .owner-chip span {
    font-size: 0.74rem;
    color: rgba(148, 163, 184, 0.88);
  }

  .owner-dot {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: var(--owner-color);
    box-shadow:
      0 0 0 2px rgba(15, 23, 42, 0.95),
      0 0 16px color-mix(in srgb, var(--owner-color) 42%, transparent);
    flex: 0 0 auto;
  }

  .owner-dot--large {
    width: 18px;
    height: 18px;
  }

  .faction-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
  }

  input,
  select,
  button {
    font: inherit;
  }

  input,
  select {
    width: 100%;
    min-height: 38px;
    padding: 0 10px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(7, 14, 28, 0.92);
    color: #e2e8f0;
  }

  .editor-select {
    appearance: none;
  }

  .inline-field--segmented {
    align-items: stretch;
  }

  .action-btn,
  .expand-btn,
  .ghost,
  .utility-grid button,
  .inline-field button {
    min-height: 38px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(9, 16, 31, 0.9);
    color: rgba(226, 232, 240, 0.92);
    cursor: pointer;
  }

  .action-btn--primary {
    border-color: rgba(103, 232, 249, 0.32);
    background: linear-gradient(135deg, rgba(16, 44, 70, 0.96), rgba(8, 19, 34, 0.96));
  }

  .danger {
    border-color: rgba(248, 113, 113, 0.28);
    background: rgba(127, 29, 29, 0.5);
    color: rgba(254, 226, 226, 0.98);
  }

  .subsection {
    display: grid;
    gap: 10px;
    padding-top: 6px;
    border-top: 1px solid rgba(148, 163, 184, 0.12);
  }

  [data-density="compact"] .tool-panel {
    width: min(320px, calc(100vw - 160px));
  }

  @media (max-width: 980px) {
    .tool-panel {
      left: calc(100% + 10px);
      width: min(300px, calc(100vw - 120px));
    }

    .slider-grid,
    .owner-grid,
    .utility-grid,
    .star-grid,
    .portal-group-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 780px) {
    .tool-rail-shell {
      width: auto;
      min-width: 0;
    }

    .tool-rail-shell[data-expanded="true"] {
      width: min(100vw - 24px, 332px);
      min-width: min(100vw - 24px, 332px);
    }

    .tool-panel {
      left: 0;
      top: calc(100% + 10px);
      width: min(320px, calc(100vw - 24px));
    }

    .rail-button--tooltip::after {
      left: 0;
      top: calc(100% + 10px);
      transform: translateY(0) translateX(0);
      min-width: 200px;
      max-width: 260px;
    }

    .rail-button--tooltip:hover::after,
    .rail-button--tooltip:focus-visible::after {
      transform: translateY(0) translateX(0);
    }
  }
</style>
