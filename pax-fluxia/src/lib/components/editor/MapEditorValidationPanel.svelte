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
    <div>
      <strong>Validation</strong>
      <span>Compact summary stays in the HUD. Open this sheet to inspect and jump to issues.</span>
    </div>
    <div class="sheet__actions">
      <button type="button" class="ghost" onclick={() => mapEditorUiStore.togglePanelExpanded("validation")}>
        {expanded ? "Less" : "More"}
      </button>
      <button type="button" class="ghost" onclick={onClose}>Close</button>
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
    border: 1px solid var(--editor-border, rgba(148, 163, 184, 0.16));
    background: rgba(3, 10, 24, 0.96);
    backdrop-filter: blur(20px);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.4);
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

  .sheet__header div:first-child,
  .issue-list {
    display: grid;
    gap: 10px;
  }

  .sheet__header strong,
  .summary-strip strong,
  .issue strong {
    font-family: "Rajdhani", sans-serif;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #f8fafc;
  }

  .sheet__header span,
  .summary-strip span,
  .issue span {
    font-size: 0.76rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.88);
  }

  .ghost,
  .filter-row button,
  .issue {
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(9, 16, 31, 0.9);
    color: rgba(226, 232, 240, 0.92);
    font: inherit;
  }

  .ghost,
  .filter-row button {
    min-height: 40px;
    padding: 0 12px;
    cursor: pointer;
  }

  .filter-row button.is-active {
    border-color: rgba(125, 211, 252, 0.58);
    background: rgba(17, 39, 63, 0.88);
  }

  .summary-strip div {
    flex: 1;
    min-height: 64px;
    padding: 12px;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: rgba(9, 16, 31, 0.88);
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
    color: rgba(226, 232, 240, 0.92);
  }

  .issue--error {
    border-color: rgba(248, 113, 113, 0.28);
    background: rgba(127, 29, 29, 0.26);
  }

  .empty-state {
    min-height: 68px;
    padding: 12px;
    border-radius: 16px;
    border: 1px dashed rgba(148, 163, 184, 0.24);
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
