<script lang="ts">
  import { PORTAL_GROUP_IDS, type StarType } from "@pax/common";
  import EditorSliderField from "./EditorSliderField.svelte";
  import { mapEditorStore } from "$lib/editor/mapEditorStore.svelte";
  import { mapEditorUiStore } from "$lib/editor/mapEditorUiStore.svelte";
  import { buildRegularPolygonPoints } from "$lib/editor/mapEditorPresentation";
  import PaxSettingsToggleRow from "$lib/design-system/components/PaxSettingsToggleRow.svelte";

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
    selectedPortalGroup: string | null;
    onUpdateOwner: (ownerId: string) => void;
    onUpdateShips: (value: number) => void;
    onUpdatePortalGroup: (portalGroup: string) => void;
    onUpdateLaneMode: (event: Event) => void;
  }

  let {
    ownerChoices,
    selectedStarOwnerId,
    selectedStarShips,
    selectedPortalGroup,
    onUpdateOwner,
    onUpdateShips,
    onUpdatePortalGroup,
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
  const selectedPortalEligible = $derived.by(() =>
    selectedStars.length > 0 && selectedStars.every((star) => star.starType === "portal"),
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

        {#if selectedPortalEligible && (selectionExpanded || density !== "compact")}
          <section class="panel-block panel-block--subtle">
            <strong class="subheading">Portal Group</strong>
            <div class="portal-group-grid">
              {#each PORTAL_GROUP_IDS as portalGroup}
                <button
                  type="button"
                  class="portal-group-chip"
                  class:is-active={selectedPortalGroup === portalGroup}
                  onclick={() => onUpdatePortalGroup(portalGroup)}
                >
                  {portalGroup}
                </button>
              {/each}
            </div>
          </section>
        {/if}

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
        <PaxSettingsToggleRow
          label="Visible by default"
          checked={selectedMeasurement.visibleByDefault !== false}
          onChange={(checked) => mapEditorStore.updateMeasurement(selectedMeasurement.id, { visibleByDefault: checked })} />
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
    padding: var(--pax-gap-md);
    border-radius: 24px;
    border: 1px solid var(--editor-border, color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent));
    background: color-mix(in srgb, var(--pax-color-void) 94%, transparent);
    backdrop-filter: blur(20px);
    box-shadow: 0 24px 70px color-mix(in srgb, var(--pax-color-void) 40%, transparent);
    display: grid;
    gap: var(--pax-space-3);
    z-index: 10;
    isolation: isolate;
  }

  .selection-panel::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--pax-ui-accent) 86%, transparent), color-mix(in srgb, var(--pax-color-player-purple) 72%, transparent));
    border-top-left-radius: 24px;
    border-bottom-left-radius: 24px;
  }

  .selection-panel header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pax-gap-sm);
  }

  .selection-panel header div,
  .stack,
  .panel-block {
    display: grid;
    gap: var(--pax-gap-sm);
  }

  .selection-panel header strong,
  .subheading {
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-base);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--pax-ui-text-strong);
  }

  .selection-panel header span,
  .stack span,
  .readout-grid span {
    font-size: var(--pax-type-xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--pax-ui-text-soft) 88%, transparent);
  }

  .panel-block--subtle {
    padding-top: var(--pax-gap-sm);
    border-top: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 12%, transparent);
  }

  .readout-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--pax-gap-sm);
  }

  .readout-grid div {
    padding: var(--pax-gap-sm) var(--pax-space-3);
    border-radius: 14px;
    background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 14%, transparent);
    display: grid;
    gap: var(--pax-gap-xs);
  }

  .readout-grid strong {
    color: var(--pax-ui-text-strong);
  }

  .owner-grid,
  .type-grid,
  .portal-group-grid {
    display: grid;
    gap: var(--pax-space-2);
  }

  .owner-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .type-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .portal-group-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .owner-chip,
  .type-chip,
  .portal-group-chip {
    min-height: 48px;
    padding: 9px var(--pax-gap-sm);
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 90%, transparent);
    color: color-mix(in srgb, var(--pax-ui-text) 92%, transparent);
    display: flex;
    align-items: center;
    gap: var(--pax-gap-sm);
    text-align: left;
    cursor: pointer;
  }

  .type-chip {
    flex-direction: column;
    justify-content: center;
    gap: var(--pax-gap-xs);
  }

  .portal-group-chip {
    justify-content: center;
    font-weight: var(--pax-weight-bold);
  }

  .owner-chip.is-active,
  .type-chip.is-active,
  .portal-group-chip.is-active {
    border-color: color-mix(in srgb, var(--pax-ui-accent) 58%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
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
      0 0 0 2px color-mix(in srgb, var(--pax-color-void) 95%, transparent),
      0 0 16px color-mix(in srgb, var(--owner-color) 42%, transparent);
    flex: 0 0 auto;
  }

  input,
  select {
    width: 100%;
    min-height: 36px;
    padding: 0 var(--pax-gap-sm);
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 92%, transparent);
    color: var(--pax-ui-text);
    font: inherit;
  }

  .expand-btn {
    min-height: 34px;
    padding: 0 var(--pax-gap-sm);
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 90%, transparent);
    color: color-mix(in srgb, var(--pax-ui-text) 92%, transparent);
    cursor: pointer;
  }

  .type-chip svg {
    width: 22px;
    height: 22px;
  }

  .editor-select {
    appearance: none;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 96%, transparent), color-mix(in srgb, var(--pax-color-void) 96%, transparent));
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
    .portal-group-grid,
    .readout-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
