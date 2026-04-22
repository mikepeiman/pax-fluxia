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
    open: () => void;
  };

  interface Props {
    recentMaps: RecentMapEntry[];
    onOpenRecent: (entry: RecentMapEntry) => void;
    onLoadRepositoryMap: (name: string) => void;
    onLoadBuiltinMap: (name: string) => void;
    onLoadFixtureMap: (id: string) => void;
    onLoadAutosave: (id: string) => void;
  }

  let {
    recentMaps,
    onOpenRecent,
    onLoadRepositoryMap,
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

<section class="sheet" data-density={density}>
  <header class="sheet__header">
    <strong>Load Map</strong>
  </header>

  <div class="sheet__toolbar">
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
    </header>

    <div class="card-grid card-grid--recent">
      {#if recentCards.length === 0}
        <div class="empty-state empty-state--recent">No recent maps match.</div>
      {:else}
        {#each recentCards as recent}
          <button type="button" class="map-card map-card--recent" onclick={() => onOpenRecent(recent.entry)}>
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
        {/each}
      {/if}
    </div>
  </section>

  <section class="sheet-section">
    <header class="section-header">
      <strong>Maps</strong>
    </header>

    <div class="card-grid">
      {#if mapCards.length === 0}
        <div class="empty-state">No maps match the current filter.</div>
      {:else}
        {#each mapCards as card}
          <button type="button" class="map-card" onclick={card.open}>
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
</section>

<style>
  .sheet {
    position: absolute;
    top: 76px;
    right: 16px;
    bottom: 92px;
    width: min(560px, 48vw);
    padding: 18px;
    border-radius: 24px;
    border: 1px solid var(--editor-border, rgba(148, 163, 184, 0.16));
    background: rgba(3, 10, 24, 0.96);
    backdrop-filter: blur(20px);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.4);
    display: grid;
    align-content: start;
    gap: 16px;
    overflow: auto;
    z-index: 12;
  }

  .sheet__header,
  .sheet__toolbar,
  .stack {
    display: grid;
    gap: 10px;
  }

  .sheet__header,
  .sheet__header strong,
  .section-header strong {
    font-family: "Rajdhani", sans-serif;
    font-size: 1rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #f8fafc;
  }

  .stack span {
    font-size: 0.76rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.88);
  }

  .sheet__toolbar {
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

  input,
  .filter-row button,
  .autosave-item {
    min-height: 40px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(9, 16, 31, 0.9);
    color: rgba(226, 232, 240, 0.92);
    font: inherit;
  }

  .filter-row button,
  .autosave-item,
  .map-card {
    cursor: pointer;
    transition:
      border-color 140ms ease,
      background 140ms ease,
      color 140ms ease,
      transform 140ms ease,
      box-shadow 140ms ease;
  }

  .filter-row button.is-active,
  .filter-row button:hover {
    border-color: rgba(125, 211, 252, 0.58);
    background: rgba(17, 39, 63, 0.88);
    color: #f8fafc;
  }

  .sheet-section {
    display: grid;
    gap: 10px;
  }

  .sheet-section--recent {
    padding: 14px;
    border-radius: 20px;
    border: 1px solid rgba(251, 191, 36, 0.26);
    background:
      linear-gradient(135deg, rgba(76, 45, 7, 0.28), rgba(30, 41, 59, 0.06)),
      rgba(9, 16, 31, 0.9);
    box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.08);
  }

  .section-header {
    display: grid;
    gap: 4px;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .card-grid--recent {
    grid-template-columns: 1fr;
  }

  .map-card {
    display: grid;
    gap: 10px;
    min-width: 0;
    padding: 10px;
    border-radius: 18px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: rgba(9, 16, 31, 0.88);
    text-align: left;
    color: rgba(226, 232, 240, 0.92);
  }

  .map-card:hover {
    transform: translateY(-1px);
    border-color: rgba(125, 211, 252, 0.42);
    box-shadow: 0 16px 30px rgba(0, 0, 0, 0.24);
  }

  .map-card--recent {
    background: rgba(16, 23, 40, 0.94);
    border-color: rgba(251, 191, 36, 0.2);
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
    min-height: 160px;
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
    display: grid;
    gap: 4px;
    justify-items: start;
    text-align: left;
    padding: 12px;
  }

  .autosave-item:hover {
    border-color: rgba(125, 211, 252, 0.42);
    background: rgba(17, 39, 63, 0.88);
    color: #f8fafc;
  }

  @media (max-width: 980px) {
    .sheet {
      top: 68px;
      right: 12px;
      left: 12px;
      bottom: 88px;
      width: auto;
    }

    .sheet__toolbar,
    .card-grid,
    .card-grid--recent {
      grid-template-columns: 1fr;
    }
  }
</style>
