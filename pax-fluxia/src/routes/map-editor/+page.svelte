<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { AUTHORED_NEUTRAL_OWNER_ID } from "@pax/common/maps";
  import type { StarType } from "@pax/common";
  import "../../app.css";
  import MapEditorCanvas from "$lib/components/editor/MapEditorCanvas.svelte";
  import MapEditorBoardHud from "$lib/components/editor/MapEditorBoardHud.svelte";
  import MapEditorCommandDock from "$lib/components/editor/MapEditorCommandDock.svelte";
  import MapEditorLibrarySheet from "$lib/components/editor/MapEditorLibrarySheet.svelte";
  import MapEditorOverflowSheet from "$lib/components/editor/MapEditorOverflowSheet.svelte";
  import MapEditorSelectionPanel from "$lib/components/editor/MapEditorSelectionPanel.svelte";
  import MapEditorToolRail from "$lib/components/editor/MapEditorToolRail.svelte";
  import MapEditorValidationPanel from "$lib/components/editor/MapEditorValidationPanel.svelte";
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
  import { generateMapThumbnail } from "$lib/utils/mapThumbnail";

  type RecentMapEntry = {
    key: string;
    label: string;
    source: "saved" | "builtin" | "fixture" | "autosave";
    savedAt?: string;
  };

  type EditorToolPanel = Exclude<
    MapEditorPanelId,
    "library" | "validation" | "overflow" | "selection" | "factions"
  >;

  const RECENT_MAPS_STORAGE_KEY = "pax-map-editor-recent-v1";
  const MENU_SETTING_PREFIX = "pax-fluxia-";

  let statusMessage = $state("Editor ready.");
  let recentMaps = $state<RecentMapEntry[]>([]);
  let symmetryFold = $state<MapEditorSymmetryFold>(2);
  let ownerRingRadius = $state(24);
  let ownerRingThickness = $state(5);
  let ownerColorHueShift = $state(0);
  let ownerColorSaturation = $state(100);
  let ownerColorLightness = $state(0);
  let ownerColorAlpha = $state(94);

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
  const selectedLane = $derived(
    mapEditorStore.document.connections.find(
      (lane) => lane.id === mapEditorStore.selection.laneIds[0],
    ) ?? null,
  );
  const previewUrl = $derived.by(() => {
    if (typeof document === "undefined") return "";
    return generateMapThumbnail(
      mapEditorStore.document.stars.map((star) => ({
        id: star.id,
        x: star.x,
        y: star.y,
        ownerId: star.ownerId ?? AUTHORED_NEUTRAL_OWNER_ID,
        starType: star.starType,
      })),
      mapEditorStore.document.connections.map((lane) => ({
        sourceId: lane.sourceId,
        targetId: lane.targetId,
        laneWaypoints: lane.laneWaypoints,
      })),
      { width: 360, height: 220 },
    );
  });
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

  function persistRecentMaps() {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(RECENT_MAPS_STORAGE_KEY, JSON.stringify(recentMaps));
  }

  function recordRecentMap(entry: RecentMapEntry) {
    recentMaps = [
      entry,
      ...recentMaps.filter((item) => !(item.source === entry.source && item.key === entry.key)),
    ].slice(0, 10);
    persistRecentMaps();
  }

  function updateMetadata(patch: {
    name?: string;
    author?: string;
    description?: string;
    mapId?: string;
  }) {
    mapEditorStore.updateMetadata(patch);
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
    mapEditorUiStore.openSheet("library");
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

  async function testSinglePlayer() {
    if (!mapEditorStore.canLaunch) {
      setStatus("Fix validation errors before launching single-player.");
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
      mapEditorUiStore.closeSheet();
      mapEditorUiStore.closeToolPanel();
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
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&family=Rajdhani:wght@500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<svelte:window onkeydown={handleGlobalKeyDown} onkeyup={handleGlobalKeyUp} />

<div class="editor-page" data-density={mapEditorUiStore.density}>
  <div class="editor-shell">
    <aside class="rail-area">
      <div class="rail-title">
        <span class="eyebrow">Developer Editor</span>
        <strong>{mapEditorStore.document.metadata.name}</strong>
      </div>
      <MapEditorToolRail
        {ownerChoices}
        selectedStarCount={selectedStars.length}
        {symmetryFold}
        {ownerRingRadius}
        {ownerRingThickness}
        {ownerColorHueShift}
        {ownerColorSaturation}
        {ownerColorLightness}
        {ownerColorAlpha}
        onSelectOwner={selectOwnerBrush}
        onSelectStarType={selectStarTypeBrush}
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
        {#if mapEditorUiStore.activeSheet !== null}
          <button
            type="button"
            class="board-dismiss-layer"
            aria-label="Close editor panels"
            onclick={() => {
              mapEditorUiStore.closeSheet();
              mapEditorUiStore.closeToolPanel();
            }}
          ></button>
        {/if}

        <MapEditorBoardHud
          {statusMessage}
          onReturnToMenu={returnToMainMenu}
          onFitViewport={fitMapToViewport}
          onToggleValidation={() => mapEditorUiStore.openSheet("validation")}
        />

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
            onUpdateOwner={updateSelectedStarOwner}
            onUpdateShips={updateSelectedStarShips}
            onUpdateLaneMode={updateSelectedLaneMode}
          />
        {/if}

        {#if mapEditorUiStore.activeSheet === "library"}
          <MapEditorLibrarySheet
            {recentMaps}
            {previewUrl}
            onOpenRecent={openRecentMap}
            onLoadRepositoryMap={loadRepositoryMap}
            onLoadBuiltinMap={loadBuiltinMap}
            onLoadFixtureMap={loadFixtureMap}
            onLoadAutosave={loadAutosave}
            onClose={() => mapEditorUiStore.closeSheet()}
          />
        {:else if mapEditorUiStore.activeSheet === "validation"}
          <MapEditorValidationPanel
            onJumpToIssue={jumpToValidationIssue}
            onClose={() => mapEditorUiStore.closeSheet()}
          />
        {:else if mapEditorUiStore.activeSheet === "overflow"}
          <MapEditorOverflowSheet
            {previewUrl}
            onNewMap={() => {
              mapEditorStore.newMap();
              mapEditorUiStore.closeSheet();
              setStatus("Started a new authored map.");
            }}
            onDuplicateMap={() => {
              mapEditorStore.duplicateMap();
              mapEditorUiStore.closeSheet();
              setStatus("Duplicated current map.");
            }}
            onUpdateMetadata={updateMetadata}
            onClose={() => mapEditorUiStore.closeSheet()}
          />
        {/if}

        <MapEditorCommandDock
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
    height: 100vh;
    overflow: hidden;
    padding: 16px;
    background:
      radial-gradient(circle at top left, rgba(14, 165, 233, 0.14), transparent 32%),
      radial-gradient(circle at bottom right, rgba(234, 179, 8, 0.1), transparent 28%),
      #020617;
    color: #e2e8f0;
    font-family: "Inter", sans-serif;
    --editor-border: rgba(148, 163, 184, 0.16);
    --editor-surface: rgba(4, 11, 26, 0.84);
  }

  .editor-shell {
    height: calc(100vh - 32px);
    display: grid;
    grid-template-columns: minmax(72px, auto) minmax(0, 1fr);
    grid-template-areas: "rail stage";
    gap: 14px;
  }

  .rail-area {
    grid-area: rail;
    position: relative;
    z-index: 20;
    min-width: 0;
    display: grid;
    gap: 12px;
    align-content: start;
    overflow: visible;
  }

  .rail-title {
    padding: 8px 4px;
    display: grid;
    gap: 4px;
  }

  .eyebrow {
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.86);
  }

  .rail-title strong {
    font-family: "Rajdhani", sans-serif;
    font-size: 1rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #f8fafc;
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
    background: rgba(3, 7, 18, 0.82);
    box-shadow: 0 28px 90px rgba(0, 0, 0, 0.36);
  }

  .board-dismiss-layer {
    position: absolute;
    inset: 0;
    z-index: 9;
    border: 0;
    background: transparent;
    cursor: default;
  }

  [data-density="compact"] .rail-title strong {
    display: none;
  }

  @media (max-width: 980px) {
    .editor-page {
      padding: 12px;
    }

    .editor-shell {
      height: calc(100vh - 24px);
      gap: 12px;
      grid-template-columns: 72px minmax(0, 1fr);
    }

    .rail-title {
      display: none;
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
