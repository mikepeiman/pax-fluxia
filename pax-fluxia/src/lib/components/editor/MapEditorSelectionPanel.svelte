<script lang="ts">
  import type { StarType } from "@pax/common";
  import EditorSliderField from "$lib/components/editor/EditorSliderField.svelte";
  import { mapEditorStore } from "$lib/editor/mapEditorStore.svelte";
  import { mapEditorUiStore } from "$lib/editor/mapEditorUiStore.svelte";
  import { buildRegularPolygonPoints } from "$lib/editor/mapEditorPresentation";

  type OwnerChoice = {
    id: string;
    label: string;
    slotLabel: string;
    color: string;
  };

  interface Props {
    ownerChoices: OwnerChoice[];
    selectedStarOwnerId: string | null;
    selectedStarShips: number | null;
    onUpdateOwner: (ownerId: string) => void;
    onUpdateShips: (value: number) => void;
    onUpdateLaneMode: (event: Event) => void;
  }

  let {
    ownerChoices,
    selectedStarOwnerId,
    selectedStarShips,
    onUpdateOwner,
    onUpdateShips,
    onUpdateLaneMode,
  }: Props = $props();

  const density = $derived(mapEditorUiStore.density);
  const selectionExpanded = $derived(mapEditorUiStore.isPanelExpanded("selection"));
  const selectedStars = $derived.by(() =>
    mapEditorStore.document.stars.filter((star) =>
      mapEditorStore.selection.starIds.includes(star.id),
    ),
  );
  const selectedStar = $derived.by(() => (selectedStars.length === 1 ? selectedStars[0] : null));
  const selectedLane = $derived.by(() =>
    mapEditorStore.document.connections.find((lane) =>
      lane.id === mapEditorStore.selection.laneIds[0]
    ) ?? null,
  );
  const selectedMeasurement = $derived.by(() =>
    (mapEditorStore.document.measurements ?? []).find((measurement) =>
      measurement.id === mapEditorStore.selection.measurementIds[0]
    ) ?? null,
  );
  const hasSelection = $derived(
    mapEditorStore.selection.starIds.length > 0
      || mapEditorStore.selection.laneIds.length > 0
      || mapEditorStore.selection.measurementIds.length > 0,
  );

  function ownerStyle(color: string) {
    return `--owner-color:${color}`;
  }

  function setStarType(starType: StarType) {
    if (!selectedStar) return;
    mapEditorStore.updateStar(selectedStar.id, { starType });
  }

  function numberValue(event: Event) {
    return Number((event.currentTarget as HTMLInputElement).value);
  }

  function expandToggleLabel() {
    return selectionExpanded ? "Less" : "More";
  }
</script>

{#if hasSelection}
  <aside class="selection-panel" data-density={density} class:is-expanded={selectionExpanded || density === "expanded"}>
    <header>
      <div>
        <strong>
          {#if selectedStars.length > 1}
            {selectedStars.length} Stars Selected
          {:else if selectedStar}
            Selected Star
          {:else if selectedLane}
            Selected Lane
          {:else}
            Selected Measurement
          {/if}
        </strong>
        <span>
          {#if selectedStars.length > 1}
            Apply shared owner and fleet changes.
          {:else if selectedStar}
            Edit ownership, fleets, type, and position.
          {:else if selectedLane}
            Inspect path mode and endpoints.
          {:else}
            Edit label and visibility.
          {/if}
        </span>
      </div>
      <button type="button" class="expand-btn" onclick={() => mapEditorUiStore.togglePanelExpanded("selection")}>
        {expandToggleLabel()}
      </button>
    </header>

    {#if selectedStars.length > 0}
      <section class="panel-block">
        {#if selectedStar}
          <div class="readout-grid">
            <div><span>ID</span><strong>{selectedStar.id}</strong></div>
            <div><span>Q/R</span><strong>{selectedStar.gridQ ?? 0}, {selectedStar.gridR ?? 0}</strong></div>
          </div>
        {/if}

        <label class="stack">
          <span>Owner</span>
          <div class="owner-grid">
            {#each ownerChoices as choice}
              <button
                type="button"
                class="owner-chip"
                class:is-active={selectedStarOwnerId === choice.id}
                style={ownerStyle(choice.color)}
                onclick={() => onUpdateOwner(choice.id)}
              >
                <span class="owner-dot"></span>
                <div>
                  <strong>{choice.slotLabel}</strong>
                  <span>{choice.label}</span>
                </div>
              </button>
            {/each}
          </div>
        </label>

        <EditorSliderField
          label="Ships"
          value={selectedStarShips ?? mapEditorStore.forceBrush}
          min={0}
          max={200}
          step={5}
          accent="#c084fc"
          valueText={selectedStarShips === null ? "Mixed" : `${selectedStarShips} ships`}
          onChange={onUpdateShips}
        />

        {#if selectedStar && (selectionExpanded || density !== "compact")}
          <section class="panel-block panel-block--subtle">
            <strong class="subheading">Star Type</strong>
            <div class="type-grid">
              {#each mapEditorStore.starTypePalette as option}
                <button type="button" class="type-chip" class:is-active={selectedStar.starType === option.id} onclick={() => setStarType(option.id)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {#if option.sides > 0}
                      <polygon points={buildRegularPolygonPoints(7.5, option.sides)} fill={option.color} />
                    {:else}
                      <circle cx="12" cy="12" r="7.5" fill={option.color} />
                    {/if}
                  </svg>
                  <span>{option.label}</span>
                </button>
              {/each}
            </div>
          </section>
        {/if}
      </section>
    {:else if selectedLane}
      <section class="panel-block">
        <div class="readout-grid">
          <div><span>ID</span><strong>{selectedLane.id}</strong></div>
          <div><span>Endpoints</span><strong>{selectedLane.sourceId} → {selectedLane.targetId}</strong></div>
        </div>
        <label class="stack">
          <span>Path Mode</span>
          <select class="editor-select" value={selectedLane.pathMode ?? "auto"} oninput={onUpdateLaneMode}>
            <option value="auto">Auto</option>
            <option value="manual">Manual</option>
          </select>
        </label>
      </section>
    {:else if selectedMeasurement}
      <section class="panel-block">
        <label class="stack">
          <span>Label</span>
          <input type="text" value={selectedMeasurement.label ?? ""} oninput={(event) => mapEditorStore.updateMeasurement(selectedMeasurement.id, { label: (event.currentTarget as HTMLInputElement).value })} />
        </label>
        <label class="checkbox-row">
          <input type="checkbox" checked={selectedMeasurement.visibleByDefault !== false} oninput={(event) => mapEditorStore.updateMeasurement(selectedMeasurement.id, { visibleByDefault: (event.currentTarget as HTMLInputElement).checked })} />
          <span>Visible by default</span>
        </label>
      </section>
    {/if}
  </aside>
{/if}

<style>
  .selection-panel {
    position: absolute;
    top: 76px;
    right: 16px;
    width: min(316px, 30vw);
    max-height: calc(100% - 180px);
    overflow: auto;
    padding: 14px;
    border-radius: 24px;
    border: 1px solid var(--editor-border, rgba(148, 163, 184, 0.16));
    background: rgba(3, 10, 24, 0.94);
    backdrop-filter: blur(20px);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.4);
    display: grid;
    gap: 12px;
    z-index: 10;
    isolation: isolate;
  }

  .selection-panel::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: linear-gradient(180deg, rgba(125, 211, 252, 0.86), rgba(167, 139, 250, 0.72));
    border-top-left-radius: 24px;
    border-bottom-left-radius: 24px;
  }

  .selection-panel header,
  .checkbox-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .selection-panel header div,
  .stack,
  .panel-block {
    display: grid;
    gap: 10px;
  }

  .selection-panel header strong,
  .subheading {
    font-family: "Rajdhani", sans-serif;
    font-size: 0.98rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #f8fafc;
  }

  .selection-panel header span,
  .stack span,
  .readout-grid span,
  .checkbox-row span {
    font-size: 0.76rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.88);
  }

  .panel-block--subtle {
    padding-top: 10px;
    border-top: 1px solid rgba(148, 163, 184, 0.12);
  }

  .readout-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .readout-grid div {
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(9, 16, 31, 0.88);
    border: 1px solid rgba(148, 163, 184, 0.14);
    display: grid;
    gap: 6px;
  }

  .readout-grid strong {
    color: #f8fafc;
  }

  .owner-grid,
  .type-grid {
    display: grid;
    gap: 8px;
  }

  .owner-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .type-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .owner-chip,
  .type-chip {
    min-height: 48px;
    padding: 9px 10px;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(9, 16, 31, 0.9);
    color: rgba(226, 232, 240, 0.92);
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    cursor: pointer;
  }

  .type-chip {
    flex-direction: column;
    justify-content: center;
    gap: 6px;
  }

  .owner-chip.is-active,
  .type-chip.is-active {
    border-color: rgba(125, 211, 252, 0.58);
    background: rgba(17, 39, 63, 0.88);
  }

  .owner-chip div {
    display: grid;
    gap: 2px;
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

  input,
  select {
    width: 100%;
    min-height: 36px;
    padding: 0 10px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(7, 14, 28, 0.92);
    color: #e2e8f0;
    font: inherit;
  }

  .expand-btn {
    min-height: 34px;
    padding: 0 10px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(9, 16, 31, 0.9);
    color: rgba(226, 232, 240, 0.92);
    cursor: pointer;
  }

  .type-chip svg {
    width: 22px;
    height: 22px;
  }

  .checkbox-row {
    justify-content: flex-start;
  }

  .editor-select {
    appearance: none;
    background:
      linear-gradient(180deg, rgba(10, 18, 36, 0.96), rgba(5, 11, 22, 0.96));
  }

  [data-density="compact"]:not(.is-expanded) {
    width: min(248px, 24vw);
  }

  [data-density="compact"]:not(.is-expanded) header span,
  [data-density="compact"]:not(.is-expanded) .subheading,
  [data-density="compact"]:not(.is-expanded) .readout-grid,
  [data-density="compact"]:not(.is-expanded) .type-grid {
    display: none;
  }

  @media (max-width: 980px) {
    .selection-panel {
      top: 68px;
      right: 12px;
      width: min(320px, calc(100vw - 24px));
    }

    .owner-grid,
    .type-grid,
    .readout-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
