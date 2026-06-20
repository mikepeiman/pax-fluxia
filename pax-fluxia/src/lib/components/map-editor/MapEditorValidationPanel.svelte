<script lang="ts">
  import { mapEditorStore } from "$lib/editor/mapEditorStore.svelte";
  import { mapEditorUiStore } from "$lib/editor/mapEditorUiStore.svelte";

  interface Props {
    onJumpToIssue: (index: number) => void;
    onClose: () => void;
  }

  let {
    onJumpToIssue,
    onClose,
  }: Props = $props();

  let severityFilter = $state<"all" | "error" | "warning">("all");

  const density = $derived(mapEditorUiStore.density);
  const expanded = $derived(mapEditorUiStore.isPanelExpanded("validation"));
  const filteredIssues = $derived.by(() => {
    if (severityFilter === "all") return mapEditorStore.validationIssues;
    return mapEditorStore.validationIssues.filter((issue) => issue.severity === severityFilter);
  });
</script>

<section class="sheet" data-density={density} class:is-expanded={expanded || density === "expanded"}>
  <header class="sheet__header">
    <strong>Validation</strong>
    <div class="sheet__actions">
      <button type="button" class="ghost" onclick={() => mapEditorUiStore.togglePanelExpanded("validation")}>
        {expanded ? "Less" : "More"}
      </button>
      <button type="button" class="icon-btn" onclick={onClose} aria-label="Close validation panel">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z" fill="currentColor" /></svg>
      </button>
    </div>
  </header>

  <div class="summary-strip">
    <div><strong>{mapEditorStore.validationErrors.length}</strong><span>Errors</span></div>
    <div><strong>{mapEditorStore.validationWarnings.length}</strong><span>Warnings</span></div>
  </div>

  <div class="filter-row">
    <button type="button" class:is-active={severityFilter === "all"} onclick={() => (severityFilter = "all")}>All</button>
    <button type="button" class:is-active={severityFilter === "error"} onclick={() => (severityFilter = "error")}>Errors</button>
    <button type="button" class:is-active={severityFilter === "warning"} onclick={() => (severityFilter = "warning")}>Warnings</button>
  </div>

  <div class="issue-list">
    {#if filteredIssues.length === 0}
      <div class="empty-state">No issues match the current filter.</div>
    {:else}
      {#each filteredIssues as issue, index}
        <button type="button" class="issue" class:issue--error={issue.severity === "error"} onclick={() => onJumpToIssue(index)}>
          <div class="issue__top">
            <strong>{issue.code}</strong>
            <span>{issue.severity}</span>
          </div>
          <p>{issue.message}</p>
        </button>
      {/each}
    {/if}
  </div>
</section>

<style>
  .sheet {
    position: absolute;
    top: 76px;
    right: 16px;
    bottom: 92px;
    width: min(420px, 36vw);
    padding: 16px;
    border-radius: 24px;
    border: 1px solid var(--editor-border, color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent));
    background: color-mix(in srgb, var(--pax-color-void) 96%, transparent);
    backdrop-filter: blur(20px);
    box-shadow: 0 24px 70px color-mix(in srgb, var(--pax-color-void) 40%, transparent);
    display: grid;
    gap: 14px;
    overflow: auto;
    z-index: 12;
  }

  .sheet__header,
  .sheet__actions,
  .summary-strip,
  .filter-row,
  .issue__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .issue-list {
    display: grid;
    gap: 10px;
  }

  .sheet__header strong,
  .summary-strip strong,
  .issue strong {
    font-family: var(--pax-ui-font-ui);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--pax-ui-text-strong);
  }

  .summary-strip span,
  .issue span {
    font-size: var(--pax-type-xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--pax-ui-text-soft) 88%, transparent);
  }

  .ghost,
  .icon-btn,
  .filter-row button,
  .issue {
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 90%, transparent);
    color: color-mix(in srgb, var(--pax-ui-text) 92%, transparent);
    font: inherit;
  }

  .ghost,
  .icon-btn,
  .filter-row button {
    min-height: 40px;
    padding: 0 12px;
    cursor: pointer;
  }

  .icon-btn {
    display: inline-grid;
    place-items: center;
    min-width: 40px;
    padding: 0;
  }

  .icon-btn svg {
    width: 18px;
    height: 18px;
  }

  .filter-row button.is-active {
    border-color: color-mix(in srgb, var(--pax-ui-accent) 58%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
  }

  .summary-strip div {
    flex: 1;
    min-height: 64px;
    padding: 12px;
    border-radius: 16px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 14%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
    display: grid;
    gap: 4px;
    place-items: center;
  }

  .issue {
    padding: 12px 14px;
    text-align: left;
    display: grid;
    gap: 8px;
    cursor: pointer;
  }

  .issue p,
  .empty-state {
    margin: 0;
    color: color-mix(in srgb, var(--pax-ui-text) 92%, transparent);
  }

  .issue--error {
    border-color: color-mix(in srgb, var(--pax-ui-danger) 28%, transparent);
    background: color-mix(in srgb, var(--pax-ui-danger) 26%, var(--pax-color-void));
  }

  .empty-state {
    min-height: 68px;
    padding: 12px;
    border-radius: 16px;
    border: 1px dashed color-mix(in srgb, var(--pax-ui-text-soft) 24%, transparent);
    display: grid;
    place-items: center;
  }

  @media (max-width: 980px) {
    .sheet {
      top: 68px;
      right: 12px;
      left: 12px;
      bottom: 88px;
      width: auto;
    }
  }
</style>
