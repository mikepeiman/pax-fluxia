<script lang="ts">
  import { onMount } from "svelte";
  import { loadFixtureMapDefinition } from "@pax/common/maps";
  import type { MapDefinition } from "$lib/types/map.types";
  import { mapEditorStore } from "$lib/editor/mapEditorStore.svelte";
  import { mapEditorUiStore } from "$lib/editor/mapEditorUiStore.svelte";
  import { generateMapThumbnail } from "$lib/utils/mapThumbnail";

  type RecentMapEntry = {
    key: string;
    label: string;
    source: "saved" | "builtin" | "fixture" | "autosave";
    savedAt?: string;
  };

  type MapFilter = "all" | "classic" | "custom" | "test";

  type LibraryCard = {
    key: string;
    title: string;
    subtitle: string;
    filter: Exclude<MapFilter, "all">;
    thumbUrl: string;
    canDelete?: boolean;
    deleteName?: string;
    open: () => void;
  };

  interface Props {
    recentMaps: RecentMapEntry[];
    onClose: () => void;
    onOpenRecent: (entry: RecentMapEntry) => void;
    onLoadRepositoryMap: (name: string) => void;
    onDeleteRepositoryMap: (name: string) => void;
    onLoadBuiltinMap: (name: string) => void;
    onLoadFixtureMap: (id: string) => void;
    onLoadAutosave: (id: string) => void;
  }

  let {
    recentMaps,
    onClose,
    onOpenRecent,
    onLoadRepositoryMap,
    onDeleteRepositoryMap,
    onLoadBuiltinMap,
    onLoadFixtureMap,
    onLoadAutosave,
  }: Props = $props();

  let searchQuery = $state("");
  let mapFilter = $state<MapFilter>("all");
  let fixturePreviewMaps = $state<Record<string, MapDefinition>>({});

  const density = $derived(mapEditorUiStore.density);

  function includesQuery(...parts: Array<string | number | undefined>) {
    if (!searchQuery.trim()) return true;
    const haystack = parts.join(" ").toLowerCase();
    return haystack.includes(searchQuery.trim().toLowerCase());
  }

  function buildThumbUrl(map: MapDefinition): string {
    if (typeof document === "undefined") return "";
    return generateMapThumbnail(
      map.stars.map((star) => ({
        id: star.id,
        x: star.x,
        y: star.y,
        ownerId: star.ownerId ?? "neutral",
        starType: star.starType,
      })),
      map.connections.map((connection) => ({
        sourceId: connection.sourceId,
        targetId: connection.targetId,
        laneWaypoints: connection.laneWaypoints,
      })),
      { width: 360, height: 220 },
    );
  }

  function formatRecentSource(source: RecentMapEntry["source"]): string {
    switch (source) {
      case "builtin":
        return "Classic";
      case "saved":
        return "Custom";
      case "fixture":
        return "Test";
      case "autosave":
        return "Autosave";
      default:
        return source;
    }
  }

  function formatMapFilterLabel(filter: Exclude<MapFilter, "all">): string {
    switch (filter) {
      case "classic":
        return "Classic";
      case "custom":
        return "Custom";
      case "test":
        return "Test";
    }
  }

  function deleteMap(event: MouseEvent, name: string) {
    event.stopPropagation();
    event.preventDefault();
    onDeleteRepositoryMap(name);
  }

  const mapCards = $derived.by(() => {
    const cards: LibraryCard[] = [];

    for (const map of mapEditorStore.builtinMaps) {
      cards.push({
        key: `classic:${map.metadata.name}`,
        title: map.metadata.name,
        subtitle: `${map.stars.length} stars - ${map.connections.length} lanes`,
        filter: "classic",
        thumbUrl: buildThumbUrl(map),
        open: () => onLoadBuiltinMap(map.metadata.name),
      });
    }

    for (const map of mapEditorStore.repositoryMaps) {
      cards.push({
        key: `custom:${map.metadata.name}`,
        title: map.metadata.name,
        subtitle: `${map.stars.length} stars - ${map.connections.length} lanes`,
        filter: "custom",
        thumbUrl: buildThumbUrl(map),
        canDelete: true,
        deleteName: map.metadata.name,
        open: () => onLoadRepositoryMap(map.metadata.name),
      });
    }

    for (const fixture of mapEditorStore.fixtureManifest) {
      const previewMap = fixturePreviewMaps[fixture.id];
      cards.push({
        key: `test:${fixture.id}`,
        title: fixture.name,
        subtitle: previewMap
          ? `${previewMap.stars.length} stars - ${previewMap.connections.length} lanes`
          : fixture.purpose,
        filter: "test",
        thumbUrl: previewMap ? buildThumbUrl(previewMap) : "",
        open: () => onLoadFixtureMap(fixture.id),
      });
    }

    return cards.filter((card) => {
      if (mapFilter !== "all" && card.filter !== mapFilter) return false;
      return includesQuery(card.title, card.subtitle, card.filter);
    });
  });

  const recentCards = $derived.by(() =>
    recentMaps
      .filter((entry) => includesQuery(entry.label, formatRecentSource(entry.source), entry.savedAt))
      .map((entry) => {
        const builtinMap =
          entry.source === "builtin"
            ? mapEditorStore.builtinMaps.find((map) => map.metadata.name === entry.key)
            : null;
        const repositoryMap =
          entry.source === "saved"
            ? mapEditorStore.repositoryMaps.find((map) => map.metadata.name === entry.key)
            : null;
        const autosaveMap =
          entry.source === "autosave"
            ? mapEditorStore.autosaveRevisions.find((revision) => revision.id === entry.key)?.map
            : null;
        const fixtureMap = entry.source === "fixture" ? fixturePreviewMaps[entry.key] : null;
        const map = builtinMap ?? repositoryMap ?? autosaveMap ?? fixtureMap ?? null;

        return {
          entry,
          canDelete: entry.source === "saved",
          deleteName: entry.source === "saved" ? entry.key : null,
          thumbUrl: map ? buildThumbUrl(map) : "",
          subtitle: entry.savedAt
            ? `${formatRecentSource(entry.source)} - ${new Date(entry.savedAt).toLocaleString()}`
            : formatRecentSource(entry.source),
        };
      }),
  );

  onMount(() => {
    let cancelled = false;

    async function hydrateFixturePreviews() {
      const entries = await Promise.all(
        mapEditorStore.fixtureManifest.map(async (fixture) => {
          try {
            const map = await loadFixtureMapDefinition(fixture.id, async (resourcePath) => {
              const response = await fetch(`/__fixture-maps?path=${encodeURIComponent(resourcePath)}`);
              if (!response.ok) {
                throw new Error(`Failed to load fixture map "${fixture.id}"`);
              }
              return response.text();
            });
            return [fixture.id, map] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) return;

      fixturePreviewMaps = Object.fromEntries(
        entries.filter((entry): entry is readonly [string, MapDefinition] => entry !== null),
      );
    }

    void hydrateFixturePreviews();

    return () => {
      cancelled = true;
    };
  });
</script>

<div class="modal" data-density={density} role="dialog" aria-modal="true" aria-label="Load map">
  <header class="modal__header">
    <strong>Load Map</strong>
    <button type="button" class="icon-btn" aria-label="Close load map dialog" onclick={onClose}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z" fill="currentColor" /></svg>
    </button>
  </header>

  <div class="modal__toolbar">
    <label class="stack stack--search">
      <span>Search</span>
      <input type="search" bind:value={searchQuery} placeholder="Search maps..." />
    </label>

    <div class="stack">
      <span>Map Type</span>
      <div class="filter-row" role="tablist" aria-label="Map type filter">
        <button type="button" class:is-active={mapFilter === "all"} onclick={() => (mapFilter = "all")}>All</button>
        <button type="button" class:is-active={mapFilter === "classic"} onclick={() => (mapFilter = "classic")}>Classic</button>
        <button type="button" class:is-active={mapFilter === "custom"} onclick={() => (mapFilter = "custom")}>Custom</button>
        <button type="button" class:is-active={mapFilter === "test"} onclick={() => (mapFilter = "test")}>Test</button>
      </div>
    </div>
  </div>

  <section class="sheet-section sheet-section--recent">
    <header class="section-header">
      <strong>Recent</strong>
      <span>{recentCards.length}</span>
    </header>

    <div class="card-grid">
      {#if recentCards.length === 0}
        <div class="empty-state empty-state--recent">No recent maps match.</div>
      {:else}
        {#each recentCards as recent}
          <article class="map-card map-card--recent">
            {#if recent.canDelete && recent.deleteName}
              <button
                type="button"
                class="map-card__delete"
                aria-label={`Delete ${recent.entry.label}`}
                title="Delete map"
                onclick={(event) => deleteMap(event, recent.deleteName!)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l1 2h4v2H4V6h4l1-2Zm1 6h2v7h-2v-7Zm4 0h2v7h-2v-7ZM7 10h2v7H7v-7Z" fill="currentColor" /></svg>
              </button>
            {/if}
            <button type="button" class="map-card__open" onclick={() => onOpenRecent(recent.entry)}>
              <div class="map-card__thumb-shell">
                {#if recent.thumbUrl}
                  <img src={recent.thumbUrl} alt={recent.entry.label} class="map-card__thumb" />
                {:else}
                  <div class="map-card__thumb-empty">No preview</div>
                {/if}
              </div>
              <div class="map-card__meta">
                <strong>{recent.entry.label}</strong>
                <span>{recent.subtitle}</span>
              </div>
            </button>
          </article>
        {/each}
      {/if}
    </div>
  </section>

  <section class="sheet-section">
    <header class="section-header">
      <strong>Maps</strong>
      <span>{mapCards.length}</span>
    </header>

    <div class="card-grid">
      {#if mapCards.length === 0}
        <div class="empty-state">No maps match the current filter.</div>
      {:else}
        {#each mapCards as card}
          <article class="map-card">
            {#if card.canDelete && card.deleteName}
              <button
                type="button"
                class="map-card__delete"
                aria-label={`Delete ${card.title}`}
                title="Delete map"
                onclick={(event) => deleteMap(event, card.deleteName!)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l1 2h4v2H4V6h4l1-2Zm1 6h2v7h-2v-7Zm4 0h2v7h-2v-7ZM7 10h2v7H7v-7Z" fill="currentColor" /></svg>
              </button>
            {/if}
            <button type="button" class="map-card__open" onclick={card.open}>
              <div class="map-card__thumb-shell">
                {#if card.thumbUrl}
                  <img src={card.thumbUrl} alt={card.title} class="map-card__thumb" />
                {:else}
                  <div class="map-card__thumb-empty">Loading preview...</div>
                {/if}
              </div>
              <div class="map-card__meta">
                <strong>{card.title}</strong>
                <span>{formatMapFilterLabel(card.filter)} - {card.subtitle}</span>
              </div>
            </button>
          </article>
        {/each}
      {/if}
    </div>
  </section>

  {#if mapEditorStore.autosaveRevisions.length > 0}
    <section class="sheet-section">
      <header class="section-header">
        <strong>Autosaves</strong>
      </header>

      <div class="autosave-list">
        {#each mapEditorStore.autosaveRevisions as revision}
          <button type="button" class="autosave-item" onclick={() => onLoadAutosave(revision.id)}>
            <strong>{revision.name}</strong>
            <span>{new Date(revision.savedAt).toLocaleString()}</span>
          </button>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .modal {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 13;
    width: min(1520px, calc(100% - 36px));
    max-height: calc(100% - 36px);
    padding: 18px;
    border-radius: 24px;
    border: 1px solid var(--editor-border, rgba(148, 163, 184, 0.16));
    background: rgba(3, 10, 24, 0.97);
    backdrop-filter: blur(20px);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.4);
    display: grid;
    align-content: start;
    gap: 16px;
    overflow: auto;
    transform: translate(-50%, -50%);
  }

  .modal__header,
  .modal__toolbar,
  .stack {
    display: grid;
    gap: 10px;
  }

  .modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .modal__header strong,
  .section-header strong {
    font-family: "Rajdhani", sans-serif;
    font-size: 1rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #f8fafc;
  }

  .section-header span,
  .stack span {
    font-size: 0.76rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.88);
  }

  .modal__toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
  }

  .stack--search {
    min-width: 0;
  }

  .filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .icon-btn,
  input,
  .filter-row button,
  .autosave-item,
  .map-card__open,
  .map-card__delete {
    min-height: 40px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(9, 16, 31, 0.9);
    color: rgba(226, 232, 240, 0.92);
    font: inherit;
  }

  .icon-btn,
  .filter-row button,
  .autosave-item,
  .map-card__open,
  .map-card__delete {
    cursor: pointer;
    transition:
      border-color 140ms ease,
      background 140ms ease,
      color 140ms ease,
      transform 140ms ease,
      box-shadow 140ms ease;
  }

  .icon-btn {
    display: inline-grid;
    place-items: center;
    width: 40px;
    min-width: 40px;
    padding: 0;
  }

  .icon-btn svg,
  .map-card__delete svg {
    width: 18px;
    height: 18px;
  }

  .filter-row button.is-active,
  .filter-row button:hover,
  .icon-btn:hover,
  .autosave-item:hover,
  .map-card__open:hover,
  .map-card__delete:hover {
    border-color: rgba(125, 211, 252, 0.58);
    background: rgba(17, 39, 63, 0.88);
    color: #f8fafc;
  }

  .sheet-section {
    display: grid;
    gap: 12px;
  }

  .sheet-section--recent {
    padding: 14px;
    border-radius: 20px;
    border: 1px solid rgba(251, 191, 36, 0.18);
    background: linear-gradient(180deg, rgba(59, 39, 7, 0.18), rgba(19, 23, 38, 0.08));
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 14px;
  }

  .map-card {
    position: relative;
    display: grid;
  }

  .map-card__open {
    display: grid;
    gap: 10px;
    min-width: 0;
    width: 100%;
    padding: 10px;
    border-radius: 18px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: rgba(9, 16, 31, 0.88);
    text-align: left;
    color: rgba(226, 232, 240, 0.92);
  }

  .map-card--recent .map-card__open {
    background: rgba(16, 23, 40, 0.94);
    border-color: rgba(251, 191, 36, 0.2);
  }

  .map-card__open:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 30px rgba(0, 0, 0, 0.24);
  }

  .map-card__delete {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 2;
    display: inline-grid;
    place-items: center;
    width: 36px;
    min-width: 36px;
    min-height: 36px;
    padding: 0;
    border-color: rgba(248, 113, 113, 0.28);
    background: rgba(28, 10, 10, 0.9);
  }

  .map-card__delete:hover {
    border-color: rgba(248, 113, 113, 0.62);
    background: rgba(127, 29, 29, 0.82);
  }

  .map-card__thumb-shell {
    overflow: hidden;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.12);
    background: rgba(3, 10, 24, 0.92);
    aspect-ratio: 1.5;
  }

  .map-card__thumb {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .map-card__thumb-empty,
  .empty-state {
    display: grid;
    place-items: center;
    min-height: 128px;
    padding: 18px;
    border-radius: 16px;
    border: 1px dashed rgba(148, 163, 184, 0.18);
    background: rgba(9, 16, 31, 0.72);
    color: rgba(148, 163, 184, 0.9);
    text-align: center;
  }

  .empty-state--recent {
    min-height: 110px;
  }

  .map-card__meta {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .map-card__meta strong,
  .autosave-item strong {
    font-family: "Rajdhani", sans-serif;
    font-size: 0.98rem;
    color: #f8fafc;
  }

  .map-card__meta span,
  .autosave-item span {
    font-size: 0.82rem;
    color: rgba(148, 163, 184, 0.9);
  }

  .autosave-list {
    display: grid;
    gap: 10px;
  }

  .autosave-item {
    width: 100%;
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    text-align: left;
  }

  @media (max-width: 1180px) {
    .modal__toolbar {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 780px) {
    .modal {
      width: calc(100% - 24px);
      max-height: calc(100% - 24px);
      padding: 14px;
    }

    .card-grid {
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    }
  }
</style>
