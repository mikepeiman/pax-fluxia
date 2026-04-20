<script lang="ts">
  import { mapEditorStore } from "$lib/editor/mapEditorStore.svelte";
  import { mapEditorUiStore } from "$lib/editor/mapEditorUiStore.svelte";

  type RecentMapEntry = {
    key: string;
    label: string;
    source: "saved" | "builtin" | "fixture" | "autosave";
    savedAt?: string;
  };

  interface Props {
    recentMaps: RecentMapEntry[];
    previewUrl: string;
    onOpenRecent: (entry: RecentMapEntry) => void;
    onLoadRepositoryMap: (name: string) => void;
    onLoadBuiltinMap: (name: string) => void;
    onLoadFixtureMap: (id: string) => void;
    onLoadAutosave: (id: string) => void;
    onClose: () => void;
  }

  let {
    recentMaps,
    previewUrl,
    onOpenRecent,
    onLoadRepositoryMap,
    onLoadBuiltinMap,
    onLoadFixtureMap,
    onLoadAutosave,
    onClose,
  }: Props = $props();

  let searchQuery = $state("");

  const density = $derived(mapEditorUiStore.density);
  const expanded = $derived(mapEditorUiStore.isPanelExpanded("library"));

  function includesQuery(...parts: Array<string | number | undefined>) {
    if (!searchQuery.trim()) return true;
    const haystack = parts.join(" ").toLowerCase();
    return haystack.includes(searchQuery.trim().toLowerCase());
  }

  const filteredRecent = $derived(recentMaps.filter((entry) =>
    includesQuery(entry.label, entry.source, entry.savedAt),
  ));
  const filteredSaved = $derived(mapEditorStore.repositoryManifest.filter((entry) =>
    includesQuery(entry.name, entry.starCount, entry.laneCount),
  ));
  const filteredBuiltin = $derived(mapEditorStore.builtinMaps.filter((entry) =>
    includesQuery(entry.metadata.name, entry.stars.length, entry.connections.length),
  ));
  const filteredFixtures = $derived(mapEditorStore.fixtureManifest.filter((fixture) =>
    includesQuery(fixture.name, fixture.purpose),
  ));
  const filteredAutosaves = $derived(mapEditorStore.autosaveRevisions.filter((revision) =>
    includesQuery(revision.name, revision.savedAt),
  ));
</script>

<section class="sheet" data-density={density} class:is-expanded={expanded || density === "expanded"}>
  <header class="sheet__header">
    <div>
      <strong>Load Maps</strong>
      <span>Recent maps first, with searchable saved, built-in, fixture, and autosave sources.</span>
    </div>
    <div class="sheet__actions">
      <button type="button" class="ghost" onclick={() => mapEditorUiStore.togglePanelExpanded("library")}>
        {expanded ? "Less" : "More"}
      </button>
      <button type="button" class="ghost" onclick={onClose}>Close</button>
    </div>
  </header>

  <label class="stack">
    <span>Search</span>
    <input type="search" bind:value={searchQuery} placeholder="Search maps..." />
  </label>

  {#if (expanded || density !== "compact") && previewUrl}
    <section class="preview-card">
      <img src={previewUrl} alt="Current map preview" />
    </section>
  {/if}

  <div class="sheet__sections">
    <section class="sheet-section">
      <header><strong>Recent</strong></header>
      <div class="manifest-list">
        {#if filteredRecent.length === 0}
          <div class="empty-state">No recent maps match.</div>
        {:else}
          {#each filteredRecent as entry}
            <button type="button" onclick={() => onOpenRecent(entry)}>
              <strong>{entry.label}</strong>
              <span>{entry.source}{entry.savedAt ? ` · ${new Date(entry.savedAt).toLocaleString()}` : ""}</span>
            </button>
          {/each}
        {/if}
      </div>
    </section>

    <section class="sheet-section">
      <header><strong>Saved</strong></header>
      <div class="manifest-list">
        {#if filteredSaved.length === 0}
          <div class="empty-state">No saved maps match.</div>
        {:else}
          {#each filteredSaved as entry}
            <button type="button" onclick={() => onLoadRepositoryMap(entry.name)}>
              <strong>{entry.name}</strong>
              <span>{entry.starCount} stars · {entry.laneCount} lanes</span>
            </button>
          {/each}
        {/if}
      </div>
    </section>

    <section class="sheet-section">
      <header><strong>Built-In</strong></header>
      <div class="manifest-list">
        {#if filteredBuiltin.length === 0}
          <div class="empty-state">No built-in maps match.</div>
        {:else}
          {#each filteredBuiltin as entry}
            <button type="button" onclick={() => onLoadBuiltinMap(entry.metadata.name)}>
              <strong>{entry.metadata.name}</strong>
              <span>{entry.stars.length} stars · {entry.connections.length} lanes</span>
            </button>
          {/each}
        {/if}
      </div>
    </section>

    {#if expanded || density !== "compact"}
      <section class="sheet-section">
        <header><strong>Fixtures</strong></header>
        <div class="manifest-list">
          {#if filteredFixtures.length === 0}
            <div class="empty-state">No fixtures match.</div>
          {:else}
            {#each filteredFixtures as fixture}
              <button type="button" onclick={() => onLoadFixtureMap(fixture.id)}>
                <strong>{fixture.name}</strong>
                <span>{fixture.purpose}</span>
              </button>
            {/each}
          {/if}
        </div>
      </section>

      <section class="sheet-section">
        <header><strong>Autosave</strong></header>
        <div class="manifest-list">
          {#if filteredAutosaves.length === 0}
            <div class="empty-state">No autosaves match.</div>
          {:else}
            {#each filteredAutosaves as revision}
              <button type="button" onclick={() => onLoadAutosave(revision.id)}>
                <strong>{revision.name}</strong>
                <span>{new Date(revision.savedAt).toLocaleString()}</span>
              </button>
            {/each}
          {/if}
        </div>
      </section>
    {/if}
  </div>
</section>

<style>
  .sheet {
    position: absolute;
    top: 76px;
    right: 16px;
    bottom: 92px;
    width: min(460px, 40vw);
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
  .sheet__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .sheet__header div:first-child,
  .stack,
  .sheet__sections {
    display: grid;
    gap: 10px;
  }

  .sheet__header strong,
  .sheet-section header strong {
    font-family: "Rajdhani", sans-serif;
    font-size: 1rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #f8fafc;
  }

  .sheet__header span,
  .stack span {
    font-size: 0.76rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.88);
  }

  .sheet__sections {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .sheet-section {
    display: grid;
    gap: 8px;
  }

  input,
  .ghost {
    min-height: 40px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(9, 16, 31, 0.9);
    color: rgba(226, 232, 240, 0.92);
    font: inherit;
  }

  .ghost {
    cursor: pointer;
  }

  .preview-card {
    border-radius: 18px;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: rgba(9, 16, 31, 0.72);
  }

  .preview-card img {
    display: block;
    width: 100%;
    height: auto;
  }

  .manifest-list {
    display: grid;
    gap: 10px;
    max-height: 260px;
    overflow: auto;
  }

  .manifest-list button,
  .empty-state {
    min-height: 58px;
    padding: 12px;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: rgba(9, 16, 31, 0.88);
    text-align: left;
    color: rgba(226, 232, 240, 0.92);
    display: grid;
    gap: 4px;
  }

  .manifest-list button {
    cursor: pointer;
  }

  .manifest-list strong {
    font-family: "Rajdhani", sans-serif;
    font-size: 0.98rem;
    color: #f8fafc;
  }

  .manifest-list span,
  .empty-state {
    font-size: 0.82rem;
    color: rgba(148, 163, 184, 0.9);
  }

  [data-density="compact"]:not(.is-expanded) {
    width: min(360px, calc(100vw - 24px));
  }

  [data-density="compact"]:not(.is-expanded) .sheet__sections {
    grid-template-columns: 1fr;
  }

  @media (max-width: 980px) {
    .sheet {
      top: 68px;
      right: 12px;
      left: 12px;
      bottom: 88px;
      width: auto;
    }

    .sheet__sections {
      grid-template-columns: 1fr;
    }
  }
</style>
