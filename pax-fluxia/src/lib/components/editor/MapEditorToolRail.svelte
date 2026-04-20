<script lang="ts">
  import { fly, fade } from "svelte/transition";
  import type { StarType } from "@pax/common";
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

  interface Props {
    ownerChoices: OwnerChoice[];
    symmetryFold: SymmetryFold;
    ownerRingRadius: number;
    ownerRingThickness: number;
    ownerColorHueShift: number;
    ownerColorSaturation: number;
    ownerColorLightness: number;
    ownerColorAlpha: number;
    onSelectOwner: (ownerId: string) => void;
    onSelectStarType: (starType: StarType) => void;
    onArmForceBrush: () => void;
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
    symmetryFold,
    ownerRingRadius,
    ownerRingThickness,
    ownerColorHueShift,
    ownerColorSaturation,
    ownerColorLightness,
    ownerColorAlpha,
    onSelectOwner,
    onSelectStarType,
    onArmForceBrush,
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
  const utilitiesExpanded = $derived(mapEditorUiStore.isPanelExpanded("utilities"));
  const displayExpanded = $derived(mapEditorUiStore.isPanelExpanded("display"));
  const starTypeOptions = $derived(mapEditorStore.starTypePalette);
  const activeOwnerChoice = $derived(
    ownerChoices.find((choice) => choice.id === mapEditorStore.ownerBrush) ?? ownerChoices[0],
  );
  const activeStarType = $derived(
    starTypeOptions.find((option) => option.id === mapEditorStore.starTypeBrush) ?? starTypeOptions[0],
  );

  function panelButtonStyle(color: string) {
    return `--owner-color:${color}`;
  }

  function activateTool(tool: MapEditorTool, panel?: MapEditorPanelId) {
    mapEditorStore.setTool(tool);
    if (panel) {
      mapEditorUiStore.toggleToolPanel(
        panel as Exclude<MapEditorPanelId, "library" | "validation" | "overflow" | "selection">,
      );
      return;
    }
    mapEditorUiStore.closeToolPanel();
  }

  function togglePanel(panel: Exclude<MapEditorPanelId, "library" | "validation" | "overflow" | "selection">) {
    mapEditorUiStore.toggleToolPanel(panel);
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

  function selectSymmetryFold(event: Event) {
    const next = Number((event.currentTarget as HTMLSelectElement).value) as SymmetryFold;
    onSetSymmetryFold(next);
  }

  function iconClass(panel: MapEditorPanelId, tool?: MapEditorTool) {
    return activePanel === panel || (tool ? mapEditorStore.tool === tool : false);
  }

</script>

<div class="tool-rail-shell" data-density={density}>
  <div class="tool-rail">
    <button
      type="button"
      class:is-active={mapEditorStore.tool === "auto" && !activePanel}
      onclick={() => activateTool("auto")}
      title={railButtonTitle("Move / Select", "V")}
      aria-label="Move and select"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 3-2 1v4h4l1-2 3 3-3 3-1-2h-4v4l2 1-3 3-3-3 2-1v-4H7l-1 2-3-3 3-3 1 2h4V6l-2-1 3-3Z" fill="currentColor" /></svg>
    </button>
    <button
      type="button"
      class:is-active={iconClass("place-star", "place-star")}
      class="rail-button rail-button--star"
      style={`--star-color:${activeStarType.color};`}
      onclick={() => activateTool("place-star", "place-star")}
      title={railButtonTitle("Place Star", "1-6")}
      aria-label="Place star"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {#if activeStarType.sides > 0}
          <polygon points={buildRegularPolygonPoints(7.5, activeStarType.sides)} fill={activeStarType.color} />
        {:else}
          <circle cx="12" cy="12" r="7.5" fill={activeStarType.color} />
        {/if}
      </svg>
    </button>
    <button
      type="button"
      class:is-active={iconClass("paint-owner", "paint-owner")}
      class="rail-button rail-button--owner"
      style={panelButtonStyle(activeOwnerChoice.color)}
      onclick={() => activateTool("paint-owner", "paint-owner")}
      title={railButtonTitle("Paint Ownership")}
      aria-label="Paint ownership"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7" fill="var(--owner-color)" />
        <path d="M12 3a6 6 0 1 0 6 6A6 6 0 0 0 12 3Zm-8 16c0-3.3 3.6-6 8-6s8 2.7 8 6v2H4Z" fill="currentColor" opacity="0.5" />
      </svg>
    </button>
    <button
      type="button"
      class:is-active={iconClass("paint-force", "paint-force")}
      onclick={() => { onArmForceBrush(); togglePanel("paint-force"); }}
      title={railButtonTitle("Paint Fleets")}
      aria-label="Paint fleets"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18h12l-1.7-6H7.7L6 18Zm3.6-8h4.8L12 4 9.6 10Z" fill="currentColor" /></svg>
    </button>
    <button
      type="button"
      class:is-active={iconClass("connect-lane", "connect-lane")}
      class="rail-button rail-button--tooltip"
      data-tooltip={tooltipText("connect-lane")}
      onclick={() => activateTool("connect-lane")}
      title={railButtonTitle("Connect Lanes", "C")}
      aria-label="Connect lanes"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12-4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM8.6 9.6l6-2.2.8 2.1-6 2.2-.8-2.1Zm0 4.8.8-2.1 6 2.2-.8 2.1-6-2.2Z" fill="currentColor" /></svg>
    </button>
    <button
      type="button"
      class:is-active={iconClass("measure", "measure")}
      class="rail-button rail-button--tooltip"
      data-tooltip={tooltipText("measure")}
      onclick={() => activateTool("measure")}
      title={railButtonTitle("Measurements", "M")}
      aria-label="Measurements"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.5 17.5 3 21 6.5 6.5 21H3v-3.5Zm3.8 1.2 9.9-9.9-1.4-1.4-9.9 9.9v1.4h1.4Z" fill="currentColor" /></svg>
    </button>
    <button
      type="button"
      class:is-active={iconClass("utilities")}
      onclick={() => togglePanel("utilities")}
      title={railButtonTitle("Utilities")}
      aria-label="Utilities"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.7 2.9 3.3.7-.7 3.3L19 10.6 17.4 12 19 13.4l-2.7 1.7.7 3.3-3.3.7L12 22l-1.7-2.9-3.3-.7.7-3.3L5 13.4 6.6 12 5 10.6l2.7-1.7-.7-3.3 3.3-.7L12 2Zm0 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" fill="currentColor" /></svg>
    </button>
    <button
      type="button"
      class:is-active={iconClass("display")}
      onclick={() => togglePanel("display")}
      title={railButtonTitle("Display")}
      aria-label="Display"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v10H4V5Zm6 12h4l1 2H9l1-2Z" fill="currentColor" /></svg>
    </button>
  </div>

  {#if activePanel}
    <section
      class="tool-panel"
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
                {#if option.sides > 0}
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
      {:else if activePanel === "paint-owner"}
        <header>
          <div>
            <strong>Paint Ownership</strong>
            {#if density !== "compact"}<span>Select stars first to apply immediately, or drag-paint on the board.</span>{/if}
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
      {:else if activePanel === "paint-force"}
        <header>
          <div>
            <strong>Paint Fleets</strong>
            {#if density !== "compact"}<span>Apply to selection immediately, or drag to stamp fleet counts.</span>{/if}
          </div>
        </header>
        <label class="stack">
          <span>Fleet Count</span>
          <input type="range" min="0" max="200" step="5" bind:value={mapEditorStore.forceBrush} />
        </label>
        <div class="inline-field">
          <input type="number" min="0" value={mapEditorStore.forceBrush} oninput={(event) => (mapEditorStore.forceBrush = Number((event.currentTarget as HTMLInputElement).value))} />
          <strong>{mapEditorStore.forceBrush}</strong>
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
            <div class="inline-field">
              <select value={String(symmetryFold)} oninput={selectSymmetryFold}>
                <option value="2">2-fold</option>
                <option value="3">3-fold</option>
                <option value="4">4-fold</option>
                <option value="5">5-fold</option>
                <option value="6">6-fold</option>
              </select>
              <button type="button" onclick={onApplySymmetry}>Apply</button>
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
        <label class="stack">
          <span>Hex Grid</span>
          <input type="range" min="10" max="96" step="1" value={mapEditorStore.hexRadius} oninput={(event) => (mapEditorStore.hexRadius = Number((event.currentTarget as HTMLInputElement).value))} />
          <strong>{mapEditorStore.hexRadius}px radius</strong>
        </label>
        {#if displayExpanded || density !== "compact"}
          <div class="stack">
            <label class="stack"><span>Ring Radius</span><input type="range" min="18" max="34" step="1" value={ownerRingRadius} oninput={(event) => onSetOwnerRingRadius(Number((event.currentTarget as HTMLInputElement).value))} /></label>
            <label class="stack"><span>Ring Thickness</span><input type="range" min="2" max="12" step="1" value={ownerRingThickness} oninput={(event) => onSetOwnerRingThickness(Number((event.currentTarget as HTMLInputElement).value))} /></label>
            <label class="stack"><span>Hue Shift</span><input type="range" min="-180" max="180" step="1" value={ownerColorHueShift} oninput={(event) => onSetOwnerColorHueShift(Number((event.currentTarget as HTMLInputElement).value))} /></label>
            <label class="stack"><span>Saturation</span><input type="range" min="0" max="200" step="5" value={ownerColorSaturation} oninput={(event) => onSetOwnerColorSaturation(Number((event.currentTarget as HTMLInputElement).value))} /></label>
            <label class="stack"><span>Lightness</span><input type="range" min="-35" max="35" step="1" value={ownerColorLightness} oninput={(event) => onSetOwnerColorLightness(Number((event.currentTarget as HTMLInputElement).value))} /></label>
            <label class="stack"><span>Alpha</span><input type="range" min="10" max="100" step="1" value={ownerColorAlpha} oninput={(event) => onSetOwnerColorAlpha(Number((event.currentTarget as HTMLInputElement).value))} /></label>
          </div>
        {/if}
      {/if}
    </section>
  {/if}
</div>

<style>
  .tool-rail-shell {
    position: relative;
    width: 68px;
    min-width: 68px;
    height: max-content;
  }

  .tool-rail {
    width: 68px;
    padding: 10px 8px;
    border-radius: 24px;
    border: 1px solid var(--editor-border, rgba(148, 163, 184, 0.16));
    background: var(--editor-surface, rgba(4, 11, 26, 0.86));
    backdrop-filter: blur(18px);
    display: grid;
    gap: 8px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  }

  .tool-rail button {
    width: 100%;
    min-height: 50px;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(10, 17, 33, 0.78);
    color: rgba(203, 213, 225, 0.88);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: 140ms ease;
  }

  .tool-rail button:hover,
  .tool-rail button.is-active {
    border-color: rgba(125, 211, 252, 0.58);
    background: linear-gradient(180deg, rgba(17, 39, 63, 0.95), rgba(11, 28, 49, 0.95));
    color: #f8fafc;
    box-shadow: inset 0 0 0 1px rgba(125, 211, 252, 0.18);
  }

  .tool-rail button svg {
    width: 22px;
    height: 22px;
  }

  .rail-button--star,
  .rail-button--owner {
    position: relative;
    overflow: hidden;
  }

  .rail-button--star::before,
  .rail-button--owner::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, color-mix(in srgb, var(--star-color, var(--owner-color, #38bdf8)) 18%, transparent), transparent 70%);
    opacity: 0.9;
    pointer-events: none;
  }

  .rail-button--owner::before {
    background: linear-gradient(180deg, color-mix(in srgb, var(--owner-color) 24%, transparent), transparent 70%);
  }

  .rail-button--owner svg circle {
    filter: drop-shadow(0 0 6px color-mix(in srgb, var(--owner-color) 55%, transparent));
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

  .rail-button--tooltip:hover::after,
  .rail-button--tooltip:focus-visible::after {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }

  .tool-panel {
    position: absolute;
    top: 0;
    left: calc(100% + 12px);
    width: min(360px, calc(100vw - 180px));
    max-height: calc(100vh - 72px);
    overflow: auto;
    padding: 16px;
    border-radius: 24px;
    border: 1px solid var(--editor-border, rgba(148, 163, 184, 0.16));
    background: rgba(3, 10, 24, 0.94);
    backdrop-filter: blur(20px);
    display: grid;
    gap: 14px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.4);
    z-index: 25;
  }

  .tool-panel header,
  .subsection__header,
  .inline-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .tool-panel header div {
    display: grid;
    gap: 4px;
  }

  .tool-panel strong,
  .tool-panel span {
    max-width: 100%;
  }

  .tool-panel header strong,
  .subsection__header strong {
    font-family: "Rajdhani", sans-serif;
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

  .stack {
    display: grid;
    gap: 8px;
  }

  .star-grid,
  .owner-grid,
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
    font-family: "Rajdhani", sans-serif;
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
    min-height: 40px;
    padding: 0 10px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(7, 14, 28, 0.92);
    color: #e2e8f0;
  }

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

    .owner-grid,
    .utility-grid,
    .star-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 780px) {
    .tool-rail-shell {
      width: auto;
      min-width: 0;
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
