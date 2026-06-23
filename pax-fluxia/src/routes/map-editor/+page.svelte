<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    AUTHORED_NEUTRAL_OWNER_ID,
    resolveOrCreateAuthoredMapFamily,
    serializeAuthoredMap,
    type AuthoredMapCategory,
  } from "@pax/common/maps";
  import type { StarType } from "@pax/common";
  import "../../app.css";
  import {
    MapEditorBoardHud,
    MapEditorCanvas,
    MapEditorCommandDock,
    MapEditorConfirmDialog,
    MapEditorDuplicateDialog,
    MapEditorLibrarySheet,
    MapEditorSelectionPanel,
    MapEditorToolRail,
    MapEditorValidationPanel,
  } from "$lib/components/map-editor";
  import { GAME_CONFIG, buildEngineConfig } from "$lib/config/game.config";
  import { type MapEditorSymmetryFold } from "$lib/editor/mapEditorSymmetry";
  import { mapEditorStore, type MapEditorTool } from "$lib/editor/mapEditorStore.svelte";
  import {
    mapEditorUiStore,
    type MapEditorPanelId,
  } from "$lib/editor/mapEditorUiStore.svelte";
  import { getOwnerPaletteColor } from "$lib/editor/mapEditorPresentation";
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import { multiplayerStore } from "$lib/stores/multiplayerStore.svelte";
  import type { MapDefinition } from "$lib/types/map.types";

  type RecentMapEntry = {
    key: string;
    label: string;
    source: "saved" | "builtin" | "fixture" | "autosave";
    savedAt?: string;
  };

  type LibraryMapSource = RecentMapEntry["source"];
  type LibraryMapTarget = {
    source: LibraryMapSource;
    key: string;
    label: string;
    category: "classic" | "custom" | "test";
    favoriteKey: string;
    canDelete: boolean;
    map: MapDefinition | null;
  };

  type MetadataDialogState = {
    mode: "rename" | "duplicate";
    target: LibraryMapTarget;
    title: string;
    confirmLabel: string;
    initialName: string;
    initialDescription: string;
    initialCategory: AuthoredMapCategory;
    initialFamilyName: string;
    initialHexRadius: number;
    initialTags: string[];
  };

  type MapMetadataPatch = {
    name: string;
    description?: string;
    category: AuthoredMapCategory;
    familyName?: string;
    editorHexRadius: number;
    tags?: string[];
  };

  type EditorToolPanel = Exclude<
    MapEditorPanelId,
    "library" | "validation" | "duplicate" | "selection" | "factions"
  >;

  const RECENT_MAPS_STORAGE_KEY = "pax-map-editor-recent-v1";
  const FAVORITE_MAPS_STORAGE_KEY = "pax-map-editor-favorites-v1";
  const MENU_SETTING_PREFIX = "pax-fluxia-";

  let statusMessage = $state("Editor ready.");
  let recentMaps = $state<RecentMapEntry[]>([]);
  let favoriteMapKeys = $state<string[]>([]);
  let symmetryFold = $state<MapEditorSymmetryFold>(2);
  let ownerRingRadius = $state(24);
  let ownerRingThickness = $state(5);
  let ownerColorHueShift = $state(0);
  let ownerColorSaturation = $state(100);
  let ownerColorLightness = $state(0);
  let ownerColorAlpha = $state(94);
  let deleteTarget = $state<{ name: string; favoriteKey?: string } | null>(null);
  let metadataDialog = $state<MetadataDialogState | null>(null);
  let showClearConfirm = $state(false);

  const selectedStars = $derived.by(() =>
    mapEditorStore.document.stars.filter((star) =>
      mapEditorStore.selection.starIds.includes(star.id),
    ),
  );
  const selectedStarOwnerId = $derived.by(() => {
    if (selectedStars.length === 0) return null;
    const ownerId = selectedStars[0]?.ownerId ?? AUTHORED_NEUTRAL_OWNER_ID;
    return selectedStars.every((star) => (star.ownerId ?? AUTHORED_NEUTRAL_OWNER_ID) === ownerId)
      ? ownerId
      : null;
  });
  const selectedStarShips = $derived.by(() => {
    if (selectedStars.length === 0) return null;
    const ships = selectedStars[0]?.activeShips ?? 0;
    return selectedStars.every((star) => (star.activeShips ?? 0) === ships) ? ships : null;
  });
  const selectedPortalGroup = $derived.by(() => {
    if (selectedStars.length === 0 || !selectedStars.every((star) => star.starType === "portal")) {
      return null;
    }

    const portalGroup = selectedStars[0]?.portalGroup ?? null;
    return selectedStars.every((star) => (star.portalGroup ?? null) === portalGroup)
      ? portalGroup
      : null;
  });
  const selectedLane = $derived(
    mapEditorStore.document.connections.find(
      (lane) => lane.id === mapEditorStore.selection.laneIds[0],
    ) ?? null,
  );
  const ownerChoices = $derived.by(() => {
    const factions = [...mapEditorStore.document.factions].sort(
      (left, right) => left.order - right.order,
    );
    return [
      {
        id: AUTHORED_NEUTRAL_OWNER_ID,
        label: "Neutral",
        slotLabel: "N",
        color: getOwnerPaletteColor(factions, AUTHORED_NEUTRAL_OWNER_ID),
      },
      ...factions.map((faction, index) => ({
        id: faction.id,
        label: faction.label,
        slotLabel: `P${index + 1}`,
        color: getOwnerPaletteColor(factions, faction.id),
      })),
    ];
  });

  onMount(() => {
    if (typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(RECENT_MAPS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as RecentMapEntry[];
          if (Array.isArray(parsed)) {
            recentMaps = parsed;
          }
        }
      } catch {
        recentMaps = [];
      }

      try {
        const rawFavorites = localStorage.getItem(FAVORITE_MAPS_STORAGE_KEY);
        if (rawFavorites) {
          const parsed = JSON.parse(rawFavorites) as string[];
          if (Array.isArray(parsed)) {
            favoriteMapKeys = parsed.filter((entry): entry is string => typeof entry === "string");
          }
        }
      } catch {
        favoriteMapKeys = [];
      }
    }
    void mapEditorStore.refreshSources();
  });

  function setStatus(message: string) {
    statusMessage = message;
  }

  function numberValue(event: Event): number {
    return Number((event.currentTarget as HTMLInputElement).value);
  }

  function isTextEntryTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tagName = target.tagName;
    return (
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT" ||
      target.isContentEditable
    );
  }

  function hasTopLevelModalOverlay(): boolean {
    if (typeof document === "undefined") return false;
    return document.querySelector(".preview-dialog") !== null;
  }

  function persistRecentMaps() {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(RECENT_MAPS_STORAGE_KEY, JSON.stringify(recentMaps));
  }

  function persistFavoriteMapKeys() {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(FAVORITE_MAPS_STORAGE_KEY, JSON.stringify(favoriteMapKeys));
  }

  function slugifyMapId(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || `map-${Date.now()}`;
  }

  function cloneMapDefinition(map: MapDefinition): MapDefinition {
    return structuredClone(map);
  }

  function setFavoriteMapKeys(nextKeys: string[]) {
    favoriteMapKeys = nextKeys;
    persistFavoriteMapKeys();
  }

  function removeFavoriteKey(favoriteKey: string) {
    if (!favoriteMapKeys.includes(favoriteKey)) return;
    setFavoriteMapKeys(favoriteMapKeys.filter((entry) => entry !== favoriteKey));
  }

  function toggleFavoriteTarget(target: LibraryMapTarget) {
    if (favoriteMapKeys.includes(target.favoriteKey)) {
      setFavoriteMapKeys(favoriteMapKeys.filter((entry) => entry !== target.favoriteKey));
      setStatus(`Removed "${target.label}" from favorites.`);
      return;
    }

    setFavoriteMapKeys([target.favoriteKey, ...favoriteMapKeys]);
    setStatus(`Marked "${target.label}" as a favorite.`);
  }

  function transferFavoriteKey(previousKey: string, nextKey: string) {
    if (previousKey === nextKey || !favoriteMapKeys.includes(previousKey)) return;
    setFavoriteMapKeys([
      nextKey,
      ...favoriteMapKeys.filter((entry) => entry !== previousKey && entry !== nextKey),
    ]);
  }

  function downloadMapJson(map: MapDefinition, fallbackName: string) {
    const payload = serializeAuthoredMap(map);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${map.metadata.mapId || slugifyMapId(fallbackName)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function buildSavedCustomMap(
    sourceMap: MapDefinition,
    patch: MapMetadataPatch,
    options?: { preserveCreatedAt?: boolean },
  ): MapDefinition {
    const now = new Date().toISOString();
    const nextName = patch.name.trim();
    const nextDescription = patch.description?.trim() || undefined;
    const nextTags = patch.tags?.length ? patch.tags : undefined;
    const nextMap = cloneMapDefinition(
      mapEditorStore.retargetMapHexRadius(sourceMap, patch.editorHexRadius),
    );
    const nextFamily = resolveOrCreateAuthoredMapFamily(
      {
        familyId: patch.familyName ? undefined : nextMap.metadata.familyId,
        familyName: patch.familyName ?? nextMap.metadata.familyName,
        mapId: nextMap.metadata.mapId,
        name: nextMap.metadata.name,
      },
      patch.familyName,
    );

    nextMap.metadata = {
      ...nextMap.metadata,
      mapId: slugifyMapId(nextName),
      name: nextName,
      description: nextDescription,
      category: patch.category,
      familyId: nextFamily.familyId,
      familyName: nextFamily.familyName,
      editorHexRadius: nextMap.metadata.editorHexRadius,
      createdAt: options?.preserveCreatedAt
        ? nextMap.metadata.createdAt ?? now
        : now,
      updatedAt: now,
      tags: nextTags,
      importedFrom: {
        kind: "editor",
        sourceId: sourceMap.metadata.mapId || sourceMap.metadata.name,
      },
    };

    return nextMap;
  }

  function recordRecentMap(entry: RecentMapEntry) {
    recentMaps = [
      entry,
      ...recentMaps.filter((item) => !(item.source === entry.source && item.key === entry.key)),
    ].slice(0, 10);
    persistRecentMaps();
  }

  function removeRecentMapEntry(source: RecentMapEntry["source"], key: string) {
    recentMaps = recentMaps.filter((item) => !(item.source === source && item.key === key));
    persistRecentMaps();
  }

  function closeActiveOverlays() {
    deleteTarget = null;
    metadataDialog = null;
    showClearConfirm = false;
    mapEditorUiStore.closeSheet();
    mapEditorUiStore.closeToolPanel();
  }

  function ensureToolPanel(panel: EditorToolPanel) {
    if (mapEditorUiStore.activeToolPanel !== panel) {
      mapEditorUiStore.toggleToolPanel(panel);
    }
  }

  function activateEditorTool(
    tool: MapEditorTool,
    options?: {
      panel?: EditorToolPanel;
      status?: string;
    },
  ) {
    mapEditorStore.setTool(tool);
    if (options?.panel) {
      ensureToolPanel(options.panel);
    } else {
      mapEditorUiStore.closeToolPanel();
    }
    if (options?.status) {
      setStatus(options.status);
    }
  }

  function selectOwnerBrush(ownerId: string) {
    mapEditorStore.ownerBrush = ownerId;
    mapEditorStore.setTool("paint-owner");
  }

  function selectStarTypeBrush(
    starType: StarType,
    options?: {
      openPanel?: boolean;
    },
  ) {
    mapEditorStore.starTypeBrush = starType;
    mapEditorStore.setTool("place-star");
    if (options?.openPanel ?? true) {
      ensureToolPanel("place-star");
      return;
    }
    mapEditorUiStore.closeToolPanel();
  }

  function selectPortalGroupBrush(portalGroup: string) {
    mapEditorStore.portalGroupBrush = portalGroup;
    if (mapEditorStore.starTypeBrush === "portal") {
      mapEditorStore.setTool("place-star");
    }
  }

  function armForceBrush() {
    mapEditorStore.setTool("paint-force");
  }

  function applyOwnerBrushToSelection() {
    const count = mapEditorStore.selection.starIds.length;
    if (count === 0) {
      setStatus("Select one or more stars first.");
      return;
    }
    const applied = mapEditorStore.applyOwnerBrush();
    if (!applied) {
      setStatus("Selection already matches the current owner brush.");
      return;
    }
    setStatus(`Applied owner brush to ${count} selected star${count === 1 ? "" : "s"}.`);
  }

  function applyForceBrushToSelection() {
    const count = mapEditorStore.selection.starIds.length;
    if (count === 0) {
      setStatus("Select one or more stars first.");
      return;
    }
    const applied = mapEditorStore.applyForceBrush();
    if (!applied) {
      setStatus("Selection already matches the current fleet brush.");
      return;
    }
    setStatus(`Applied ${mapEditorStore.forceBrush} ships to ${count} selected star${count === 1 ? "" : "s"}.`);
  }

  function updateSelectedStarOwner(ownerId: string) {
    mapEditorStore.ownerBrush = ownerId;
    mapEditorStore.updateSelectedStars({ ownerId });
  }

  function updateSelectedStarShips(value: number) {
    const ships = Math.max(0, Math.round(value));
    mapEditorStore.forceBrush = ships;
    mapEditorStore.updateSelectedStars({ activeShips: ships });
  }

  function updateSelectedPortalGroup(portalGroup: string) {
    mapEditorStore.portalGroupBrush = portalGroup;
    mapEditorStore.updateSelectedStars({ portalGroup });
  }

  function updateSelectedLaneMode(event: Event) {
    if (!selectedLane) return;
    mapEditorStore.updateLane(selectedLane.id, {
      pathMode: (event.currentTarget as HTMLSelectElement).value as "auto" | "manual",
    });
  }

  function saveDocument() {
    const saved = mapEditorStore.saveDocument();
    recordRecentMap({
      key: saved.metadata.name,
      label: saved.metadata.name,
      source: "saved",
      savedAt: new Date().toISOString(),
    });
    setStatus(`Saved "${saved.metadata.name}" to shared map storage.`);
    return saved;
  }

  function persistMainMenuCustomMapSelection(mapName: string) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(`${MENU_SETTING_PREFIX}mapMode`, JSON.stringify("custom"));
    localStorage.setItem(`${MENU_SETTING_PREFIX}selectedClassicMap`, JSON.stringify(null));
    localStorage.setItem(`${MENU_SETTING_PREFIX}selectedCustomMap`, JSON.stringify(mapName));
  }

  async function saveAndExitDocument() {
    const saved = saveDocument();
    persistMainMenuCustomMapSelection(saved.metadata.name);
    gameStore.setView("menu");
    await goto("/");
  }

  async function returnToMainMenu() {
    gameStore.setView("menu");
    await goto("/");
  }

  function openLoadSheet() {
    mapEditorUiStore.closeToolPanel();
    mapEditorUiStore.openSheet("library");
  }

  function openDuplicateSheet() {
    mapEditorUiStore.closeToolPanel();
    mapEditorUiStore.openSheet("duplicate");
  }

  function requestDeleteMap(target: LibraryMapTarget) {
    if (!target.canDelete) {
      setStatus(`Delete is only available for saved maps.`);
      return;
    }
    deleteTarget = { name: target.key, favoriteKey: target.favoriteKey };
  }

  async function confirmDeleteMap() {
    if (!deleteTarget) return;
    const deletedName = deleteTarget.name;
    gameStore.deleteSavedMap(deletedName);
    removeRecentMapEntry("saved", deletedName);
    if (deleteTarget.favoriteKey) {
      removeFavoriteKey(deleteTarget.favoriteKey);
    }
    await mapEditorStore.refreshSources();
    deleteTarget = null;
    setStatus(`Deleted saved map "${deletedName}".`);
  }

  function createNewMap() {
    mapEditorStore.newMap();
    mapEditorUiStore.closeSheet();
    mapEditorUiStore.closeToolPanel();
    setStatus("Started a new map.");
  }

  function requestClearBoard() {
    showClearConfirm = true;
  }

  function confirmClearBoard() {
    mapEditorStore.clearBoard();
    showClearConfirm = false;
    mapEditorUiStore.closeToolPanel();
    setStatus("Cleared the board. Press Ctrl+Z to undo.");
  }

  function confirmDuplicateMap(patch: MapMetadataPatch) {
    if (metadataDialog) {
      const sourceTarget = metadataDialog.target;
      const sourceMap = metadataDialog.target.map;
      if (!sourceMap) {
        metadataDialog = null;
        setStatus(`That map is not available for duplication right now.`);
        return;
      }

      const duplicated = buildSavedCustomMap(sourceMap, patch);
      const saved = gameStore.upsertSavedMapDefinition(duplicated);
      recordRecentMap({
        key: saved.metadata.name,
        label: saved.metadata.name,
        source: "saved",
        savedAt: saved.metadata.updatedAt,
      });
      if (favoriteMapKeys.includes(metadataDialog.target.favoriteKey)) {
        setFavoriteMapKeys([
          `saved:${saved.metadata.name}`,
          ...favoriteMapKeys.filter((entry) => entry !== `saved:${saved.metadata.name}`),
        ]);
      }
      void mapEditorStore.refreshSources();
      metadataDialog = null;
      setStatus(`Duplicated "${sourceTarget.label}" as "${saved.metadata.name}".`);
      return;
    }

    mapEditorStore.duplicateMap(patch);
    mapEditorUiStore.closeSheet();
    setStatus(`Duplicated map as "${patch.name}".`);
  }

  function exportDocument() {
    const payload = mapEditorStore.exportDocument({ coerceUnownedStars: true });
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${mapEditorStore.document.metadata.mapId || "custom-map"}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus(
      `Exported "${mapEditorStore.document.metadata.name}". Unowned stars were emitted as neutral with 0 ships.`,
    );
  }

  function openRenameDialog(target: LibraryMapTarget) {
    if (!target.map) {
      setStatus(`That map is not available for metadata editing right now.`);
      return;
    }

    metadataDialog = {
      mode: "rename",
      target,
      title: "Edit Map Metadata",
      confirmLabel: target.source === "saved" ? "Save Changes" : "Save Custom Copy",
      initialName: target.label,
      initialDescription: target.map.metadata.description ?? "",
      initialCategory: target.map.metadata.category ?? target.category,
      initialFamilyName: target.map.metadata.familyName ?? target.map.metadata.name,
      initialHexRadius: mapEditorStore.resolveMapHexRadius(target.map),
      initialTags: target.map.metadata.tags ?? [],
    };
  }

  function openDuplicateTargetDialog(target: LibraryMapTarget) {
    if (!target.map) {
      setStatus(`That map is not available for duplication right now.`);
      return;
    }

    metadataDialog = {
      mode: "duplicate",
      target,
      title: "Duplicate Map",
      confirmLabel: "Duplicate",
      initialName: `${target.label} Copy`,
      initialDescription: target.map.metadata.description ?? "",
      initialCategory: target.map.metadata.category ?? target.category,
      initialFamilyName: target.map.metadata.familyName ?? target.map.metadata.name,
      initialHexRadius: mapEditorStore.resolveMapHexRadius(target.map),
      initialTags: target.map.metadata.tags ?? [],
    };
  }

  async function confirmRenameMap(patch: MapMetadataPatch) {
    const sourceMap = metadataDialog?.target.map;
    if (!metadataDialog || !sourceMap) {
      metadataDialog = null;
      return;
    }

    const sourceTarget = metadataDialog.target;
    const renamed = buildSavedCustomMap(sourceMap, patch, {
      preserveCreatedAt: sourceTarget.source === "saved",
    });
    const saved = gameStore.upsertSavedMapDefinition(renamed);

    if (sourceTarget.source === "saved" && sourceTarget.key !== saved.metadata.name) {
      gameStore.deleteSavedMap(sourceTarget.key);
      removeRecentMapEntry("saved", sourceTarget.key);
      transferFavoriteKey(sourceTarget.favoriteKey, `saved:${saved.metadata.name}`);
    } else if (favoriteMapKeys.includes(sourceTarget.favoriteKey)) {
      setFavoriteMapKeys([
        `saved:${saved.metadata.name}`,
        ...favoriteMapKeys.filter((entry) => entry !== `saved:${saved.metadata.name}`),
      ]);
    }

    recordRecentMap({
      key: saved.metadata.name,
      label: saved.metadata.name,
      source: "saved",
      savedAt: saved.metadata.updatedAt,
    });

    await mapEditorStore.refreshSources();
    metadataDialog = null;
    setStatus(
      sourceTarget.source === "saved"
        ? sourceTarget.label === saved.metadata.name
          ? `Updated metadata for "${saved.metadata.name}".`
          : `Renamed "${sourceTarget.label}" to "${saved.metadata.name}".`
        : `Saved "${saved.metadata.name}" as a ${saved.metadata.category ?? "custom"} map.`,
    );
  }

  function exportMapTarget(target: LibraryMapTarget) {
    if (!target.map) {
      setStatus(`That map is not available for export right now.`);
      return;
    }

    downloadMapJson(target.map, target.label);
    setStatus(`Exported "${target.label}".`);
  }

  async function testSinglePlayer() {
    if (!mapEditorStore.canLaunch) {
      setStatus("Fix validation errors before launching single-player.");
      mapEditorUiStore.openSheet("validation");
      return;
    }

    const saved = mapEditorStore.saveDocument(undefined, { coerceUnownedStars: true });
    const playerCount = Math.max(2, gameStore.settings.playerCount ?? 2, saved.factions.length);

    gameStore.updateSettings({
      ...gameStore.settings,
      playerCount,
      mapType: "custom",
    });
    gameStore.loadSavedMap(saved);
    await gameStore.startGame();
    await goto("/play");
  }

  async function hostMultiplayer() {
    if (!mapEditorStore.canLaunch) {
      setStatus("Fix validation errors before hosting multiplayer.");
      mapEditorUiStore.openSheet("validation");
      return;
    }

    const saved = mapEditorStore.saveDocument(undefined, { coerceUnownedStars: true });
    const playerCount = Math.max(2, gameStore.settings.playerCount ?? 2, saved.factions.length);

    await multiplayerStore.createRoom({
      playerCount,
      mapType: "custom",
      customMap: saved,
      starsPerPlayer: Math.max(1, Math.ceil(saved.stars.length / playerCount)),
      shipsPerStar: GAME_CONFIG.STARTING_SHIPS,
      starSpacing: gameStore.settings.starSpacing ?? 1,
      mapBoardFit: gameStore.settings.mapBoardFit ?? 0.55,
      minLinks: gameStore.settings.minLinksPerStar ?? 1,
      maxLinks: gameStore.settings.maxLinksPerStar ?? 6,
      retainOrderOnConquest: gameStore.retainOrderOnConquest,
      gameplayConfig: buildEngineConfig(),
      playerColors: gameStore.settings.playerColors,
    });

    gameStore.setView("menu");
    await goto("/play");
  }

  function fitMapToViewport() {
    const stars = mapEditorStore.document.stars;
    if (stars.length === 0) {
      mapEditorStore.setViewport({ panX: 0, panY: 0, zoom: 1 });
      setStatus("Centered empty board.");
      return;
    }

    const xs = stars.map((star) => star.x);
    const ys = stars.map((star) => star.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padding = Math.max(140, mapEditorStore.hexRadius * 4);
    const contentWidth = Math.max(maxX - minX + padding * 2, mapEditorStore.hexRadius * 10);
    const contentHeight = Math.max(maxY - minY + padding * 2, mapEditorStore.hexRadius * 8);
    const centerX = (minX + maxX) * 0.5;
    const centerY = (minY + maxY) * 0.5;
    const nextZoom = Math.min(
      2.4,
      Math.max(
        0.35,
        Math.min(
          mapEditorStore.boardWidth / contentWidth,
          mapEditorStore.boardHeight / contentHeight,
        ) * 0.94,
      ),
    );

    mapEditorStore.setViewport({
      zoom: nextZoom,
      panX: mapEditorStore.boardWidth * 0.5 - centerX * nextZoom,
      panY: mapEditorStore.boardHeight * 0.5 - centerY * nextZoom,
    });
    setStatus("Centered and fit map to board view.");
  }

  function loadRepositoryMap(mapName: string) {
    const source = mapEditorStore.repositoryMaps.find((map) => map.metadata.name === mapName);
    if (!source) return;
    mapEditorStore.loadMap(source, `saved:${mapName}`);
    recordRecentMap({ key: mapName, label: mapName, source: "saved" });
    mapEditorUiStore.closeSheet();
    setStatus(`Loaded saved map "${mapName}".`);
  }

  function loadBuiltinMap(mapName: string) {
    const source = mapEditorStore.builtinMaps.find((map) => map.metadata.name === mapName);
    if (!source) return;
    mapEditorStore.loadMap(source, `builtin:${mapName}`);
    recordRecentMap({ key: mapName, label: mapName, source: "builtin" });
    mapEditorUiStore.closeSheet();
    setStatus(`Loaded built-in map "${mapName}".`);
  }

  async function loadFixtureMap(fixtureId: string) {
    await mapEditorStore.loadFixture(fixtureId);
    recordRecentMap({ key: fixtureId, label: fixtureId, source: "fixture" });
    mapEditorUiStore.closeSheet();
    setStatus(`Loaded fixture "${fixtureId}".`);
  }

  function loadAutosave(revisionId: string) {
    mapEditorStore.restoreAutosave(revisionId);
    const revision = mapEditorStore.autosaveRevisions.find((entry) => entry.id === revisionId);
    recordRecentMap({
      key: revisionId,
      label: revision?.name ?? "Autosave",
      source: "autosave",
      savedAt: revision?.savedAt,
    });
    mapEditorUiStore.closeSheet();
    setStatus("Recovered map editor autosave revision.");
  }

  function openRecentMap(entry: RecentMapEntry) {
    if (entry.source === "saved") {
      loadRepositoryMap(entry.key);
      return;
    }
    if (entry.source === "builtin") {
      loadBuiltinMap(entry.key);
      return;
    }
    if (entry.source === "fixture") {
      void loadFixtureMap(entry.key);
      return;
    }
    if (entry.source === "autosave") {
      loadAutosave(entry.key);
    }
  }

  function applySymmetry() {
    const created = mapEditorStore.applyRotationalSymmetry(symmetryFold);
    if (created > 0) {
      setStatus(`Created ${created} mirrored star(s) using ${symmetryFold}-fold symmetry.`);
      return;
    }
    setStatus(
      "No symmetry copies were created. Select stars first, or free more snapped grid cells around the board center.",
    );
  }

  function autoConnect() {
    const scope = mapEditorStore.selection.starIds.length >= 2 ? "selection" : "map";
    const created = mapEditorStore.autoConnectSelection();
    if (created > 0) {
      setStatus(`Auto-connected ${created} lane(s) for the current ${scope}.`);
      return;
    }
    setStatus("Auto-connect needs at least two stars in the current selection or map.");
  }

  function wipeAllOwnership() {
    mapEditorStore.wipeAllOwnership();
    setStatus("Set every star owner to neutral.");
  }

  function wipeAllFleets() {
    mapEditorStore.wipeAllFleets();
    setStatus("Cleared all fleets to 0 ships.");
  }

  function wipeAllConnections() {
    mapEditorStore.wipeAllConnections();
    setStatus("Removed all lanes and lane-attached measurements.");
  }

  function jumpToValidationIssue(index: number) {
    const issue = mapEditorStore.validationIssues[index];
    const targetId = issue?.relatedIds?.find((id) => (
      mapEditorStore.document.stars.some((star) => star.id === id)
      || mapEditorStore.document.connections.some((lane) => lane.id === id)
      || (mapEditorStore.document.measurements ?? []).some((measurement) => measurement.id === id)
    ));
    if (!targetId) return;

    if (mapEditorStore.document.stars.some((star) => star.id === targetId)) {
      mapEditorStore.selectStar(targetId);
    } else if (mapEditorStore.document.connections.some((lane) => lane.id === targetId)) {
      mapEditorStore.selectLane(targetId);
    } else {
      mapEditorStore.selectMeasurement(targetId);
    }
    mapEditorUiStore.closeSheet();
    setStatus(`Focused validation target ${targetId}.`);
  }

  function handleGlobalKeyDown(event: KeyboardEvent) {
    if (
      event.key === "Alt" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !isTextEntryTarget(event.target)
    ) {
      event.preventDefault();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      if (isTextEntryTarget(event.target)) return;
      event.preventDefault();
      if (event.shiftKey) {
        mapEditorStore.redo();
        setStatus("Redid last editor change.");
        return;
      }
      mapEditorStore.undo();
      setStatus("Undid last editor change.");
      return;
    }

    const key = event.key.toLowerCase();
    const textEntryTarget = isTextEntryTarget(event.target);
    const plainKey = !event.ctrlKey && !event.metaKey && !event.altKey;

    if (plainKey && !textEntryTarget) {
      if (key === "v") {
        event.preventDefault();
        activateEditorTool("auto", { status: "Armed move/select tool." });
        return;
      }
      if (key === "o") {
        event.preventDefault();
        activateEditorTool("paint-owner", {
          panel: "paint-owner",
          status: "Armed ownership brush.",
        });
        return;
      }
      if (key === "f") {
        event.preventDefault();
        activateEditorTool("paint-force", {
          panel: "paint-force",
          status: "Armed fleet brush.",
        });
        return;
      }
      if (key === "c") {
        event.preventDefault();
        activateEditorTool("connect-lane", {
          panel: "connect-lane",
          status: "Armed connect lanes tool.",
        });
        return;
      }
      if (key === "r") {
        event.preventDefault();
        activateEditorTool("measure", {
          panel: "measure",
          status: "Armed ruler tool.",
        });
        return;
      }
      if (key === "u") {
        event.preventDefault();
        ensureToolPanel("utilities");
        setStatus("Opened utilities panel.");
        return;
      }
      if (key === "g") {
        event.preventDefault();
        ensureToolPanel("display");
        setStatus("Opened display panel.");
        return;
      }

      const digit = Number(event.key);
      if (Number.isInteger(digit) && digit >= 1) {
        const starType = mapEditorStore.starTypePalette[digit - 1];
        if (starType) {
          event.preventDefault();
          selectStarTypeBrush(starType.id, { openPanel: false });
          setStatus(`Armed ${starType.label} placement.`);
        }
        return;
      }
    }

    if (event.key !== "Delete" && event.key !== "Backspace" && event.key !== "Escape") {
      return;
    }

    if (event.key === "Escape") {
      if (hasTopLevelModalOverlay()) {
        return;
      }
      closeActiveOverlays();
      mapEditorStore.cancelDraftInteractions();
      return;
    }

    if (textEntryTarget) return;
    if (
      mapEditorStore.selection.starIds.length === 0 &&
      mapEditorStore.selection.laneIds.length === 0 &&
      mapEditorStore.selection.measurementIds.length === 0
    ) {
      return;
    }
    event.preventDefault();
    mapEditorStore.deleteSelection();
    setStatus("Deleted current selection.");
  }

  function handleGlobalKeyUp(event: KeyboardEvent) {
    if (
      event.key === "Alt" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !isTextEntryTarget(event.target)
    ) {
      event.preventDefault();
    }
  }
</script>

<svelte:head>
  <title>Map Editor | Pax Fluxia</title>
</svelte:head>

<svelte:window onkeydown={handleGlobalKeyDown} onkeyup={handleGlobalKeyUp} />

<div class="editor-page" data-density={mapEditorUiStore.density}>
  <div class="editor-topbar">
    <div class="editor-topbar__cluster">
      <button type="button" class="topbar-btn" onclick={returnToMainMenu}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.8 5.2 4 12l6.8 6.8 1.4-1.4L7.8 13H20v-2H7.8l4.4-4.4-1.4-1.4Z" fill="currentColor" /></svg>
        <span>Main Menu</span>
      </button>
      <button type="button" class="topbar-btn topbar-btn--icon" onclick={() => mapEditorStore.undo()} disabled={!mapEditorStore.canUndo} aria-label="Undo">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7 7 0 1 1-6.93 8h2.08A5 5 0 1 0 12 7h-1.59l2.3 2.29-1.42 1.42L6.59 6l4.7-4.71 1.42 1.42L10.41 5H12Z" fill="currentColor" /></svg>
      </button>
      <button type="button" class="topbar-btn topbar-btn--icon" onclick={() => mapEditorStore.redo()} disabled={!mapEditorStore.canRedo} aria-label="Redo">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5h1.59l-2.3 2.29 1.42 1.42L17.41 4l-4.7-4.71-1.42 1.42L13.59 3H12a7 7 0 1 0 6.93 8h-2.08A5 5 0 1 1 12 5Z" fill="currentColor" /></svg>
      </button>
    </div>
    <div class="editor-topbar__cluster editor-topbar__cluster--right">
      <MapEditorBoardHud
        {statusMessage}
        onFitViewport={fitMapToViewport}
      />
    </div>
  </div>

  <div class="editor-shell">
    <aside class="rail-area">
      <MapEditorToolRail
        {ownerChoices}
        selectedStarCount={selectedStars.length}
        portalGroupBrush={mapEditorStore.portalGroupBrush}
        {symmetryFold}
        {ownerRingRadius}
        {ownerRingThickness}
        {ownerColorHueShift}
        {ownerColorSaturation}
        {ownerColorLightness}
        {ownerColorAlpha}
        onSelectOwner={selectOwnerBrush}
        onSelectStarType={selectStarTypeBrush}
        onSelectPortalGroup={selectPortalGroupBrush}
        onArmForceBrush={armForceBrush}
        onApplyOwnerToSelection={applyOwnerBrushToSelection}
        onApplyForceToSelection={applyForceBrushToSelection}
        onSetSymmetryFold={(fold) => (symmetryFold = fold)}
        onApplySymmetry={applySymmetry}
        onAutoConnect={autoConnect}
        onGenerateMeasures={() => mapEditorStore.generateLaneMeasurementsForSelection()}
        onDuplicateSelection={() => mapEditorStore.duplicateSelection()}
        onMirrorSelection={(axis) => mapEditorStore.mirrorSelection(axis)}
        onInsertTemplate={(template) => mapEditorStore.insertTemplate(template)}
        onWipeOwnership={wipeAllOwnership}
        onWipeFleets={wipeAllFleets}
        onWipeConnections={wipeAllConnections}
        onSetOwnerRingRadius={(value) => (ownerRingRadius = value)}
        onSetOwnerRingThickness={(value) => (ownerRingThickness = value)}
        onSetOwnerColorHueShift={(value) => (ownerColorHueShift = value)}
        onSetOwnerColorSaturation={(value) => (ownerColorSaturation = value)}
        onSetOwnerColorLightness={(value) => (ownerColorLightness = value)}
        onSetOwnerColorAlpha={(value) => (ownerColorAlpha = value)}
      />
    </aside>

    <main class="stage-area">
      <div class="board-stage">
        {#if mapEditorUiStore.activeSheet !== null || deleteTarget !== null || metadataDialog !== null || showClearConfirm}
          <button
            type="button"
            class="board-dismiss-layer"
            aria-label="Close editor panels"
            onclick={closeActiveOverlays}
          ></button>
        {/if}

        <MapEditorCanvas
          ownerRingRadius={ownerRingRadius}
          ownerRingThickness={ownerRingThickness}
          ownerColorHueShift={ownerColorHueShift}
          ownerColorSaturation={ownerColorSaturation}
          ownerColorLightness={ownerColorLightness}
          ownerColorAlpha={ownerColorAlpha / 100}
        />

        {#if mapEditorUiStore.activeSheet === null}
          <MapEditorSelectionPanel
            {ownerChoices}
            {selectedStarOwnerId}
            {selectedStarShips}
            {selectedPortalGroup}
            onUpdateOwner={updateSelectedStarOwner}
            onUpdateShips={updateSelectedStarShips}
            onUpdatePortalGroup={updateSelectedPortalGroup}
            onUpdateLaneMode={updateSelectedLaneMode}
          />
        {/if}

        {#if mapEditorUiStore.activeSheet === "library"}
          <MapEditorLibrarySheet
            {recentMaps}
            {favoriteMapKeys}
            onClose={() => mapEditorUiStore.closeSheet()}
            onOpenRecent={openRecentMap}
            onLoadRepositoryMap={loadRepositoryMap}
            onLoadBuiltinMap={loadBuiltinMap}
            onLoadFixtureMap={loadFixtureMap}
            onLoadAutosave={loadAutosave}
            onToggleFavorite={toggleFavoriteTarget}
            onRequestRename={openRenameDialog}
            onRequestExport={exportMapTarget}
            onRequestDuplicate={openDuplicateTargetDialog}
            onRequestDelete={requestDeleteMap}
          />
        {:else if mapEditorUiStore.activeSheet === "validation"}
          <MapEditorValidationPanel
            onJumpToIssue={jumpToValidationIssue}
            onClose={() => mapEditorUiStore.closeSheet()}
          />
        {:else if mapEditorUiStore.activeSheet === "duplicate"}
          <MapEditorDuplicateDialog
            title="Duplicate Map"
            confirmLabel="Duplicate"
            initialName={`${mapEditorStore.document.metadata.name || "Untitled Map"} Copy`}
            initialDescription={mapEditorStore.document.metadata.description ?? ""}
            initialCategory={mapEditorStore.document.metadata.category ?? "custom"}
            initialFamilyName={mapEditorStore.document.metadata.familyName ?? mapEditorStore.document.metadata.name}
            initialHexRadius={mapEditorStore.hexRadius}
            initialTags={mapEditorStore.document.metadata.tags ?? []}
            currentName={mapEditorStore.document.metadata.name}
            currentDescription={mapEditorStore.document.metadata.description ?? ""}
            currentDate={mapEditorStore.document.metadata.updatedAt ?? new Date().toISOString()}
            currentHexRadius={mapEditorStore.hexRadius}
            onSubmit={confirmDuplicateMap}
            onClose={() => mapEditorUiStore.closeSheet()}
          />
        {/if}

        {#if metadataDialog}
          <MapEditorDuplicateDialog
            title={metadataDialog.title}
            confirmLabel={metadataDialog.confirmLabel}
            initialName={metadataDialog.initialName}
            initialDescription={metadataDialog.initialDescription}
            initialCategory={metadataDialog.initialCategory}
            initialFamilyName={metadataDialog.initialFamilyName}
            initialHexRadius={metadataDialog.initialHexRadius}
            initialTags={metadataDialog.initialTags}
            currentName={metadataDialog.target.label}
            currentDescription={metadataDialog.target.map?.metadata.description ?? ""}
            currentDate={metadataDialog.target.map?.metadata.updatedAt ?? new Date().toISOString()}
            currentHexRadius={metadataDialog.target.map ? mapEditorStore.resolveMapHexRadius(metadataDialog.target.map) : undefined}
            onSubmit={metadataDialog.mode === "rename" ? confirmRenameMap : confirmDuplicateMap}
            onClose={() => {
              metadataDialog = null;
            }}
          />
        {/if}

        {#if deleteTarget}
          <MapEditorConfirmDialog
            title="Delete Map"
            message={`Delete "${deleteTarget.name}" from saved maps? This cannot be undone.`}
            confirmLabel="Delete Map"
            onConfirm={confirmDeleteMap}
            onClose={() => {
              deleteTarget = null;
            }}
          />
        {/if}

        {#if showClearConfirm}
          <MapEditorConfirmDialog
            title="Clear Board"
            message={`Remove every star, lane, and measurement from "${mapEditorStore.document.metadata.name || "this map"}"? Factions and map details are kept, and you can undo with Ctrl+Z.`}
            confirmLabel="Clear Board"
            onConfirm={confirmClearBoard}
            onClose={() => {
              showClearConfirm = false;
            }}
          />
        {/if}

        <MapEditorCommandDock
          onNewMap={createNewMap}
          onClearBoard={requestClearBoard}
          onOpenDuplicate={openDuplicateSheet}
          onSave={saveDocument}
          onSaveAndExit={saveAndExitDocument}
          onOpenLoad={openLoadSheet}
          onExport={exportDocument}
          onTestSinglePlayer={testSinglePlayer}
          onHostMultiplayer={hostMultiplayer}
        />
      </div>
    </main>
  </div>
</div>

<style>
  .editor-page {
    position: fixed;
    inset: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: var(--pax-space-3);
    overflow: hidden;
    padding: var(--pax-space-4);
    overscroll-behavior: none;
    background:
      radial-gradient(circle at top left, color-mix(in srgb, var(--pax-ui-accent) 14%, transparent), transparent 32%),
      radial-gradient(circle at bottom right, color-mix(in srgb, var(--pax-ui-accent-warm) 10%, transparent), transparent 28%),
      var(--pax-color-void);
    color: var(--pax-ui-text);
    font-family: var(--pax-ui-font-copy);
    --editor-border: color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent);
    --editor-surface: color-mix(in srgb, var(--pax-color-void) 84%, transparent);
  }

  .editor-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pax-space-3);
    min-height: 0;
  }

  .editor-topbar__cluster {
    display: flex;
    align-items: center;
    gap: var(--pax-gap-sm);
  }

  .editor-topbar__cluster--right {
    margin-left: auto;
    min-width: 0;
    flex: 1 1 auto;
    justify-content: flex-end;
  }

  .topbar-btn {
    min-height: 40px;
    padding: 0 var(--pax-space-3);
    border-radius: 14px;
    border: 1px solid var(--editor-border, color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent));
    background: color-mix(in srgb, var(--pax-color-void) 82%, transparent);
    backdrop-filter: blur(14px);
    color: var(--pax-ui-text);
    box-shadow: 0 14px 40px color-mix(in srgb, var(--pax-color-void) 24%, transparent);
    display: inline-flex;
    align-items: center;
    gap: var(--pax-space-2);
    cursor: pointer;
    transition:
      border-color 140ms ease,
      background 140ms ease,
      color 140ms ease,
      box-shadow 140ms ease;
  }

  .topbar-btn:hover {
    border-color: color-mix(in srgb, var(--pax-ui-accent) 58%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
    color: var(--pax-ui-text-strong);
    box-shadow: 0 10px 24px color-mix(in srgb, var(--pax-color-void) 22%, transparent);
  }

  .topbar-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .topbar-btn svg {
    width: 18px;
    height: 18px;
  }

  .topbar-btn span {
    font-family: var(--pax-ui-font-ui);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .topbar-btn--icon {
    justify-content: center;
    min-width: 40px;
    padding: 0;
  }

  .editor-shell {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(72px, auto) minmax(0, 1fr);
    grid-template-areas: "rail stage";
    gap: var(--pax-gap-md);
  }

  .rail-area {
    grid-area: rail;
    position: relative;
    z-index: 20;
    min-width: 0;
    display: grid;
    align-content: start;
    overflow: visible;
  }

  .stage-area {
    grid-area: stage;
    position: relative;
    z-index: 10;
    min-width: 0;
    min-height: 0;
  }

  .board-stage {
    position: relative;
    height: 100%;
    min-height: 0;
    border-radius: 30px;
    overflow: hidden;
    border: 1px solid var(--editor-border);
    background: color-mix(in srgb, var(--pax-color-void) 82%, transparent);
    box-shadow: 0 28px 90px color-mix(in srgb, var(--pax-color-void) 36%, transparent);
  }

  .board-dismiss-layer {
    position: absolute;
    inset: 0;
    z-index: 9;
    border: 0;
    background: transparent;
    cursor: default;
  }

  :global(html),
  :global(body) {
    overflow: hidden;
  }

  @media (max-width: 980px) {
    .editor-page {
      padding: var(--pax-space-3);
    }

    .editor-topbar {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .editor-topbar__cluster--right {
      width: 100%;
      justify-content: flex-start;
    }

    .editor-shell {
      gap: var(--pax-space-3);
      grid-template-columns: 72px minmax(0, 1fr);
    }

  }

  @media (max-width: 780px) {
    .editor-shell {
      grid-template-columns: 1fr;
      grid-template-areas:
        "rail"
        "stage";
      grid-template-rows: auto minmax(0, 1fr);
    }

    .rail-area {
      overflow: auto;
    }
  }
</style>
