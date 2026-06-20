<script lang="ts">
  import { onMount } from "svelte";
  import {
    loadFixtureMapDefinition,
    resolveAuthoredMapCategory,
    resolveOrCreateAuthoredMapFamily,
    type AuthoredMapCategory,
  } from "@pax/common/maps";
  import type { MapDefinition } from "$lib/types/map.types";
  import MapEditorMapPreviewDialog from "./MapEditorMapPreviewDialog.svelte";
  import { mapEditorStore } from "$lib/editor/mapEditorStore.svelte";
  import { mapEditorUiStore } from "$lib/editor/mapEditorUiStore.svelte";
  import { generateMapThumbnail } from "$lib/utils/mapThumbnail";

  type RecentMapEntry = {
    key: string;
    label: string;
    source: "saved" | "builtin" | "fixture" | "autosave";
    savedAt?: string;
  };

  type MapTypeFilter = "all" | "classic" | "custom" | "test";
  type LibraryCardSource = "saved" | "builtin" | "fixture" | "autosave";

  type LibraryActionTarget = {
    source: LibraryCardSource;
    key: string;
    label: string;
    category: AuthoredMapCategory;
    favoriteKey: string;
    canDelete: boolean;
    map: MapDefinition | null;
  };

  type LibraryCard = LibraryActionTarget & {
    title: string;
    subtitle: string;
    thumbUrl: string;
    savedAt?: string;
    editorHexRadius?: number;
    familyId?: string;
    familyName?: string;
    tags: string[];
    load: () => void;
  };

  interface Props {
    recentMaps: RecentMapEntry[];
    favoriteMapKeys: string[];
    onClose: () => void;
    onOpenRecent: (entry: RecentMapEntry) => void;
    onLoadRepositoryMap: (name: string) => void;
    onLoadBuiltinMap: (name: string) => void;
    onLoadFixtureMap: (id: string) => void;
    onLoadAutosave: (id: string) => void;
    onToggleFavorite: (target: LibraryActionTarget) => void;
    onRequestRename: (target: LibraryActionTarget) => void;
    onRequestExport: (target: LibraryActionTarget) => void;
    onRequestDuplicate: (target: LibraryActionTarget) => void;
    onRequestDelete: (target: LibraryActionTarget) => void;
  }

  let {
    recentMaps,
    favoriteMapKeys,
    onClose,
    onOpenRecent,
    onLoadRepositoryMap,
    onLoadBuiltinMap,
    onLoadFixtureMap,
    onLoadAutosave,
    onToggleFavorite,
    onRequestRename,
    onRequestExport,
    onRequestDuplicate,
    onRequestDelete,
  }: Props = $props();

  let searchQuery = $state("");
  let mapTypeFilter = $state<MapTypeFilter>("all");
  let favoritesOnly = $state(false);
  let categoryFilterKey = $state<string | null>(null);
  let familyFilterId = $state<string | null>(null);
  let fixturePreviewMaps = $state<Record<string, MapDefinition>>({});
  let contextMenu = $state<{ x: number; y: number; card: LibraryCard } | null>(null);
  let previewCard = $state<LibraryCard | null>(null);

  const density = $derived(mapEditorUiStore.density);
  const favoriteKeySet = $derived(new Set(favoriteMapKeys));

  function normalizeTagKey(tag: string): string {
    return tag.trim().toLowerCase();
  }

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

  function favoriteKeyFor(source: LibraryCardSource, key: string): string {
    return `${source}:${key}`;
  }

  function isFavorite(source: LibraryCardSource, key: string): boolean {
    return favoriteKeySet.has(favoriteKeyFor(source, key));
  }

  function categoryForMap(
    map: MapDefinition,
    source: LibraryCardSource,
  ): AuthoredMapCategory {
    return resolveAuthoredMapCategory(map, { isBuiltin: source === "builtin" });
  }

  function categoryLabel(category: AuthoredMapCategory): string {
    switch (category) {
      case "classic":
        return "Classic";
      case "custom":
        return "Custom";
      case "test":
        return "Test";
    }
  }

  function sourceLabel(source: LibraryCardSource, category: AuthoredMapCategory): string {
    if (source === "autosave") return "Autosave";
    return categoryLabel(category);
  }

  function familyForMap(map: MapDefinition | null): { id: string; name: string } | null {
    if (!map) return null;
    if (!map.metadata.familyId && !map.metadata.familyName) return null;
    const family = resolveOrCreateAuthoredMapFamily(map.metadata);
    return {
      id: family.familyId,
      name: family.familyName,
    };
  }

  function buildCard(
    source: LibraryCardSource,
    key: string,
    title: string,
    subtitle: string,
    map: MapDefinition | null,
    load: () => void,
    options?: { canDelete?: boolean; savedAt?: string },
  ): LibraryCard {
    const category = map
      ? categoryForMap(map, source)
      : source === "builtin"
        ? "classic"
        : source === "fixture"
          ? "test"
          : "custom";

    const family = familyForMap(map);

    return {
      source,
      key,
      title,
      label: title,
      subtitle,
      category,
      favoriteKey: favoriteKeyFor(source, key),
      canDelete: options?.canDelete ?? false,
      thumbUrl: map ? buildThumbUrl(map) : "",
      savedAt: options?.savedAt,
      editorHexRadius: map ? mapEditorStore.resolveMapHexRadius(map) : undefined,
      familyId: family?.id,
      familyName: family?.name,
      tags: map?.metadata.tags ?? [],
      map,
      load,
    };
  }

  function cardMatches(card: LibraryCard): boolean {
    if (favoritesOnly && !favoriteKeySet.has(card.favoriteKey)) return false;
    if (mapTypeFilter !== "all" && card.category !== mapTypeFilter) return false;
    if (categoryFilterKey && !card.tags.some((tag) => normalizeTagKey(tag) === categoryFilterKey)) return false;
    if (familyFilterId && card.familyId !== familyFilterId) return false;
    return includesQuery(
      card.title,
      card.subtitle,
      card.category,
      card.source,
      card.familyName,
      ...card.tags,
    );
  }

  function sortCards(cards: LibraryCard[]): LibraryCard[] {
    return [...cards].sort((left, right) => {
      const leftFavorite = favoriteKeySet.has(left.favoriteKey);
      const rightFavorite = favoriteKeySet.has(right.favoriteKey);
      if (leftFavorite !== rightFavorite) {
        return leftFavorite ? -1 : 1;
      }
      return left.title.localeCompare(right.title);
    });
  }

  function clampContextCoordinate(value: number, max: number): number {
    return Math.max(12, Math.min(value, max));
  }

  function closeContextMenu() {
    contextMenu = null;
  }

  function closePreview() {
    previewCard = null;
  }

  function openPreview(card: LibraryCard) {
    previewCard = card;
    closeContextMenu();
  }

  function openContextMenu(event: MouseEvent, card: LibraryCard) {
    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 220;
    const menuHeight = 260;
    contextMenu = {
      x: clampContextCoordinate(event.clientX + 6, window.innerWidth - menuWidth - 12),
      y: clampContextCoordinate(event.clientY + 6, window.innerHeight - menuHeight - 12),
      card,
    };
  }

  function toggleFavorite(event: MouseEvent, card: LibraryCard) {
    event.preventDefault();
    event.stopPropagation();
    onToggleFavorite(card);
    closeContextMenu();
  }

  function requestRename() {
    if (!contextMenu) return;
    onRequestRename(contextMenu.card);
    closeContextMenu();
  }

  function requestExport() {
    if (!contextMenu) return;
    onRequestExport(contextMenu.card);
    closeContextMenu();
  }

  function requestDuplicate() {
    if (!contextMenu) return;
    onRequestDuplicate(contextMenu.card);
    closeContextMenu();
  }

  function requestDelete() {
    if (!contextMenu) return;
    onRequestDelete(contextMenu.card);
    closeContextMenu();
  }

  const mapCards = $derived.by(() => {
    const cards: LibraryCard[] = [];

    for (const map of mapEditorStore.builtinMaps) {
      cards.push(
        buildCard(
          "builtin",
          map.metadata.name,
          map.metadata.name,
          `${map.stars.length} stars · ${map.connections.length} lanes`,
          map,
          () => onLoadBuiltinMap(map.metadata.name),
        ),
      );
    }

    for (const map of mapEditorStore.repositoryMaps) {
      cards.push(
        buildCard(
          "saved",
          map.metadata.name,
          map.metadata.name,
          `${map.stars.length} stars · ${map.connections.length} lanes`,
          map,
          () => onLoadRepositoryMap(map.metadata.name),
          { canDelete: true },
        ),
      );
    }

    for (const fixture of mapEditorStore.fixtureManifest) {
      const previewMap = fixturePreviewMaps[fixture.id] ?? null;
      cards.push(
        buildCard(
          "fixture",
          fixture.id,
          fixture.name,
          previewMap
            ? `${previewMap.stars.length} stars · ${previewMap.connections.length} lanes`
            : fixture.purpose,
          previewMap,
          () => onLoadFixtureMap(fixture.id),
        ),
      );
    }

    return sortCards(cards.filter(cardMatches));
  });

  const recentCards = $derived.by(() => {
    const cards = recentMaps
      .map((entry) => {
        const builtinMap =
          entry.source === "builtin"
            ? mapEditorStore.builtinMaps.find((map) => map.metadata.name === entry.key) ?? null
            : null;
        const repositoryMap =
          entry.source === "saved"
            ? mapEditorStore.repositoryMaps.find((map) => map.metadata.name === entry.key) ?? null
            : null;
        const autosaveMap =
          entry.source === "autosave"
            ? mapEditorStore.autosaveRevisions.find((revision) => revision.id === entry.key)?.map ?? null
            : null;
        const fixtureMap = entry.source === "fixture" ? fixturePreviewMaps[entry.key] ?? null : null;
        const map = builtinMap ?? repositoryMap ?? autosaveMap ?? fixtureMap;
        const category = map
          ? categoryForMap(map, entry.source)
          : entry.source === "builtin"
            ? "classic"
            : entry.source === "fixture"
              ? "test"
              : "custom";

        return buildCard(
          entry.source,
          entry.key,
          entry.label,
          entry.savedAt
            ? `${sourceLabel(entry.source, category)} · ${new Date(entry.savedAt).toLocaleString()}`
            : sourceLabel(entry.source, category),
          map,
          () => onOpenRecent(entry),
          {
            canDelete: entry.source === "saved",
            savedAt: entry.savedAt,
          },
        );
      })
      .filter(cardMatches);

    return cards;
  });

  const metadataCategoryFilters = $derived.by(() => {
    const categories = new Map<string, string>();
    const addTags = (map: MapDefinition | null) => {
      for (const tag of map?.metadata.tags ?? []) {
        const trimmed = tag.trim();
        if (!trimmed) continue;
        const key = normalizeTagKey(trimmed);
        if (!categories.has(key)) {
          categories.set(key, trimmed);
        }
      }
    };

    for (const map of mapEditorStore.builtinMaps) addTags(map);
    for (const map of mapEditorStore.repositoryMaps) addTags(map);
    for (const map of Object.values(fixturePreviewMaps)) addTags(map);
    for (const revision of mapEditorStore.autosaveRevisions) addTags(revision.map);

    return [...categories.entries()]
      .sort((left, right) => left[1].localeCompare(right[1]))
      .map(([key, label]) => ({ key, label }));
  });

  const familyFilters = $derived.by(() => {
    const families = new Map<string, { id: string; label: string; count: number }>();
    const addFamily = (map: MapDefinition | null) => {
      const family = familyForMap(map);
      if (!family) return;
      const existing = families.get(family.id);
      if (existing) {
        existing.count += 1;
        return;
      }
      families.set(family.id, {
        id: family.id,
        label: family.name,
        count: 1,
      });
    };

    for (const map of mapEditorStore.builtinMaps) addFamily(map);
    for (const map of mapEditorStore.repositoryMaps) addFamily(map);
    for (const map of Object.values(fixturePreviewMaps)) addFamily(map);
    for (const revision of mapEditorStore.autosaveRevisions) addFamily(revision.map);

    return [...families.values()]
      .sort((left, right) => left.label.localeCompare(right.label));
  });

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

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".context-menu")) return;
      closeContextMenu();
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (previewCard) {
          closePreview();
          return;
        }
        closeContextMenu();
      }
    }

    void hydrateFixturePreviews();
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeydown);

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeydown);
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
        <button type="button" class:is-active={mapTypeFilter === "all"} onclick={() => (mapTypeFilter = "all")}>All</button>
        <button type="button" class:is-active={mapTypeFilter === "classic"} onclick={() => (mapTypeFilter = "classic")}>Classic</button>
        <button type="button" class:is-active={mapTypeFilter === "custom"} onclick={() => (mapTypeFilter = "custom")}>Custom</button>
        <button type="button" class:is-active={mapTypeFilter === "test"} onclick={() => (mapTypeFilter = "test")}>Test</button>
      </div>
    </div>

    <div class="stack">
      <span>Favorites</span>
      <div class="filter-row" role="group" aria-label="Favorite filter">
        <button type="button" class:is-active={!favoritesOnly} onclick={() => (favoritesOnly = false)}>All Maps</button>
        <button type="button" class:is-active={favoritesOnly} onclick={() => (favoritesOnly = true)}>Starred Only</button>
      </div>
    </div>

    {#if metadataCategoryFilters.length > 0}
      <div class="stack stack--full">
        <span>Categories</span>
        <div class="filter-row" role="group" aria-label="Category filter">
          <button type="button" class:is-active={categoryFilterKey === null} onclick={() => (categoryFilterKey = null)}>All Categories</button>
          {#each metadataCategoryFilters as filter}
            <button type="button" class:is-active={categoryFilterKey === filter.key} onclick={() => (categoryFilterKey = filter.key)}>
              {filter.label}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if familyFilters.length > 0}
      <div class="stack stack--full">
        <span>Family</span>
        <div class="filter-row" role="group" aria-label="Family filter">
          <button type="button" class:is-active={familyFilterId === null} onclick={() => (familyFilterId = null)}>All Families</button>
          {#each familyFilters as filter}
            <button type="button" class:is-active={familyFilterId === filter.id} onclick={() => (familyFilterId = filter.id)}>
              {filter.label}
            </button>
          {/each}
        </div>
      </div>
    {/if}
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
        {#each recentCards as card}
          <article class="map-card map-card--recent" oncontextmenu={(event) => openContextMenu(event, card)}>
            <button
              type="button"
              class="map-card__favorite"
              class:is-active={isFavorite(card.source, card.key)}
              aria-label={isFavorite(card.source, card.key) ? `Unfavorite ${card.title}` : `Favorite ${card.title}`}
              title={isFavorite(card.source, card.key) ? "Unfavorite" : "Favorite"}
              onclick={(event) => toggleFavorite(event, card)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 17.3-5.56 3.28 1.48-6.3L3 10.1l6.46-.55L12 3.6l2.54 5.95 6.46.55-4.92 4.18 1.48 6.3z" fill="currentColor" /></svg>
            </button>
            <button type="button" class="map-card__open" onclick={() => openPreview(card)}>
              <div class="map-card__thumb-shell">
                {#if card.thumbUrl}
                  <img src={card.thumbUrl} alt={card.title} class="map-card__thumb" />
                {:else}
                  <div class="map-card__thumb-empty">No preview</div>
                {/if}
              </div>
              <div class="map-card__meta">
                <strong>{card.title}</strong>
                <span>{card.subtitle}</span>
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
          <article class="map-card" oncontextmenu={(event) => openContextMenu(event, card)}>
            <button
              type="button"
              class="map-card__favorite"
              class:is-active={isFavorite(card.source, card.key)}
              aria-label={isFavorite(card.source, card.key) ? `Unfavorite ${card.title}` : `Favorite ${card.title}`}
              title={isFavorite(card.source, card.key) ? "Unfavorite" : "Favorite"}
              onclick={(event) => toggleFavorite(event, card)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 17.3-5.56 3.28 1.48-6.3L3 10.1l6.46-.55L12 3.6l2.54 5.95 6.46.55-4.92 4.18 1.48 6.3z" fill="currentColor" /></svg>
            </button>
            <button type="button" class="map-card__open" onclick={() => openPreview(card)}>
              <div class="map-card__thumb-shell">
                {#if card.thumbUrl}
                  <img src={card.thumbUrl} alt={card.title} class="map-card__thumb" />
                {:else}
                  <div class="map-card__thumb-empty">Loading preview...</div>
                {/if}
              </div>
              <div class="map-card__meta">
                <strong>{card.title}</strong>
                <span>{categoryLabel(card.category)} · {card.subtitle}</span>
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

{#if previewCard}
  <MapEditorMapPreviewDialog
    title={previewCard.title}
    description={previewCard.map?.metadata.description}
    author={previewCard.map?.metadata.author}
    mapId={previewCard.map?.metadata.mapId}
    familyName={previewCard.familyName}
    editorHexRadius={previewCard.editorHexRadius}
    categoryLabel={categoryLabel(previewCard.category)}
    sourceLabel={sourceLabel(previewCard.source, previewCard.category)}
    starsCount={previewCard.map?.stars.length ?? 0}
    lanesCount={previewCard.map?.connections.length ?? 0}
    createdAt={previewCard.map?.metadata.createdAt}
    updatedAt={previewCard.savedAt ?? previewCard.map?.metadata.updatedAt}
    thumbUrl={previewCard.thumbUrl}
    tags={previewCard.map?.metadata.tags ?? []}
    canLoad={previewCard.map !== null || previewCard.source === "fixture"}
    onClose={closePreview}
    onLoad={() => {
      const target = previewCard;
      closePreview();
      target?.load();
    }}
  />
{/if}

{#if contextMenu}
  <div class="context-menu" style={`left:${contextMenu!.x}px;top:${contextMenu!.y}px;`}>
    <button type="button" onclick={() => { onToggleFavorite(contextMenu!.card); closeContextMenu(); }}>
      {isFavorite(contextMenu!.card.source, contextMenu!.card.key) ? "Unfavorite" : "Favorite"}
    </button>
    <button type="button" onclick={requestRename} disabled={!contextMenu.card.map}>
      Edit Metadata
    </button>
    <button type="button" onclick={requestExport} disabled={!contextMenu.card.map}>
      Export
    </button>
    <button type="button" onclick={requestDuplicate} disabled={!contextMenu.card.map}>
      Duplicate
    </button>
    <button type="button" class="danger" onclick={requestDelete} disabled={!contextMenu.card.canDelete}>
      Delete
    </button>
  </div>
{/if}

<style>
  .modal {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 13;
    width: min(1580px, calc(100% - 36px));
    max-height: calc(100% - 36px);
    padding: 18px;
    border-radius: 24px;
    border: 1px solid var(--editor-border, color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent));
    background: color-mix(in srgb, var(--pax-color-void) 97%, transparent);
    backdrop-filter: blur(20px);
    box-shadow: 0 24px 70px color-mix(in srgb, var(--pax-color-void) 40%, transparent);
    display: grid;
    align-content: start;
    gap: 16px;
    overflow: auto;
    transform: translate(-50%, -50%);
    isolation: isolate;
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
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-base);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--pax-ui-text-strong);
  }

  .section-header span,
  .stack span {
    font-size: var(--pax-type-xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--pax-ui-text-soft) 88%, transparent);
  }

  .modal__toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: end;
  }

  .stack--search {
    grid-column: 1 / -1;
    min-width: 0;
  }

  .stack--full {
    grid-column: 1 / -1;
  }

  .filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  @media (min-width: 1200px) {
    .modal__toolbar {
      grid-template-columns: minmax(320px, 1.3fr) minmax(0, 0.8fr) minmax(0, 0.8fr);
    }
  }

  .icon-btn,
  input,
  .filter-row button,
  .autosave-item,
  .map-card__open,
  .map-card__favorite,
  .context-menu button {
    min-height: 40px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 90%, transparent);
    color: color-mix(in srgb, var(--pax-ui-text) 92%, transparent);
    font: inherit;
  }

  .icon-btn,
  .filter-row button,
  .autosave-item,
  .map-card__open,
  .map-card__favorite,
  .context-menu button {
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
  .map-card__favorite svg {
    width: 18px;
    height: 18px;
  }

  .filter-row button.is-active,
  .filter-row button:hover,
  .icon-btn:hover,
  .autosave-item:hover,
  .map-card__open:hover,
  .map-card__favorite:hover,
  .context-menu button:hover {
    border-color: color-mix(in srgb, var(--pax-ui-accent) 58%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
    color: var(--pax-ui-text-strong);
  }

  .sheet-section {
    display: grid;
    gap: 12px;
  }

  .sheet-section--recent {
    padding: 14px;
    border-radius: 20px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-accent-warm) 34%, transparent);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--pax-ui-accent-warm) 26%, transparent), color-mix(in srgb, var(--pax-ui-accent-warm) 18%, transparent)),
      color-mix(in srgb, var(--pax-color-void) 10%, transparent);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--pax-ui-accent-warm) 12%, transparent),
      0 18px 36px color-mix(in srgb, var(--pax-color-void) 18%, transparent);
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
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 14%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
    text-align: left;
    color: color-mix(in srgb, var(--pax-ui-text) 92%, transparent);
  }

  .map-card--recent .map-card__open {
    background: linear-gradient(180deg, color-mix(in srgb, var(--pax-ui-accent-warm) 22%, color-mix(in srgb, var(--pax-color-void) 86%, transparent)), color-mix(in srgb, var(--pax-color-void) 96%, transparent));
    border-color: color-mix(in srgb, var(--pax-ui-accent-warm) 30%, transparent);
  }

  .map-card__open:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 30px color-mix(in srgb, var(--pax-color-void) 24%, transparent);
  }

  .map-card__favorite {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 2;
    display: inline-grid;
    place-items: center;
    width: 36px;
    min-width: 36px;
    min-height: 36px;
    padding: 0;
    color: color-mix(in srgb, var(--pax-ui-text) 72%, transparent);
  }

  .map-card__favorite.is-active {
    color: var(--pax-ui-accent-warm);
    border-color: color-mix(in srgb, var(--pax-ui-accent-warm) 44%, transparent);
    background: color-mix(in srgb, var(--pax-ui-accent-warm) 24%, color-mix(in srgb, var(--pax-color-void) 92%, transparent));
  }

  .map-card__thumb-shell {
    overflow: hidden;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 12%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 92%, transparent);
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
    border: 1px dashed color-mix(in srgb, var(--pax-ui-text-soft) 18%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 72%, transparent);
    color: color-mix(in srgb, var(--pax-ui-text-soft) 90%, transparent);
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
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-base);
    color: var(--pax-ui-text-strong);
  }

  .map-card__meta span,
  .autosave-item span {
    font-size: var(--pax-type-xs-plus);
    color: color-mix(in srgb, var(--pax-ui-text-soft) 90%, transparent);
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

  .context-menu {
    position: fixed;
    z-index: 30;
    min-width: 220px;
    display: grid;
    gap: 6px;
    padding: 10px;
    border-radius: 16px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 98%, transparent);
    box-shadow: 0 18px 36px color-mix(in srgb, var(--pax-color-void) 32%, transparent);
    backdrop-filter: blur(18px);
  }

  .context-menu button {
    width: 100%;
    text-align: left;
  }

  .context-menu button.danger {
    border-color: color-mix(in srgb, var(--pax-ui-danger) 24%, transparent);
  }

  .context-menu button.danger:hover {
    border-color: color-mix(in srgb, var(--pax-ui-danger) 58%, transparent);
    background: color-mix(in srgb, var(--pax-ui-danger) 34%, var(--pax-color-void));
  }

  .context-menu button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
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
