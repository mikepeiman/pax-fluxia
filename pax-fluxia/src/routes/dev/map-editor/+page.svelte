<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { AUTHORED_NEUTRAL_OWNER_ID, type AuthoredFactionSlot } from "@pax/common/maps";
  import type { StarType } from "@pax/common";
  import "../../../app.css";
  import MapEditorCanvas from "$lib/components/editor/MapEditorCanvas.svelte";
  import { GAME_CONFIG, buildEngineConfig } from "$lib/config/game.config";
  import {
    MAP_EDITOR_MAX_HEX_RADIUS,
    MAP_EDITOR_MIN_HEX_RADIUS,
    buildRegularPolygonPoints,
    getOwnerPaletteColor,
  } from "$lib/editor/mapEditorPresentation";
  import {
    MAP_EDITOR_SYMMETRY_FOLDS,
    type MapEditorSymmetryFold,
  } from "$lib/editor/mapEditorSymmetry";
  import { mapEditorStore } from "$lib/editor/mapEditorStore.svelte";
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import { multiplayerStore } from "$lib/stores/multiplayerStore.svelte";
  import { generateMapThumbnail } from "$lib/utils/mapThumbnail";

  type BottomDrawerKey = "library" | "selection" | "validation" | null;
  type RecentMapEntry = {
    key: string;
    label: string;
    source: "saved" | "builtin" | "fixture" | "autosave";
    savedAt?: string;
  };
  const RECENT_MAPS_STORAGE_KEY = "pax-map-editor-recent-v1";

  let statusMessage = $state("Editor ready.");
  let showPreview = $state(true);
  let symmetryFold = $state<MapEditorSymmetryFold>(2);
  let bottomDrawer = $state<BottomDrawerKey>(null);
  let lastBottomDrawer = $state<Exclude<BottomDrawerKey, null>>("library");
  let recentMaps = $state<RecentMapEntry[]>([]);
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
  const selectedStar = $derived.by(() => (selectedStars.length === 1 ? selectedStars[0] : null));
  const hasStarSelection = $derived(selectedStars.length > 0);
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
  const selectedMeasurement = $derived(
    (mapEditorStore.document.measurements ?? []).find(
      (measurement) => measurement.id === mapEditorStore.selection.measurementIds[0],
    ) ?? null,
  );
  const selectionCount = $derived.by(
    () =>
      mapEditorStore.selection.starIds.length +
      mapEditorStore.selection.laneIds.length +
      mapEditorStore.selection.measurementIds.length,
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

  const activePointerLabel = $derived.by(() => {
    switch (mapEditorStore.tool) {
      case "place-star":
        return `Place ${mapEditorStore.starTypeBrush}`;
      case "paint-owner":
        return `Paint ${ownerChoices.find((choice) => choice.id === mapEditorStore.ownerBrush)?.label ?? "Owner"}`;
      case "paint-force":
        return `Paint Fleets ${mapEditorStore.forceBrush}`;
      case "connect-lane":
        return "Connect / Clear";
      case "measure":
        return "Measure";
      case "delete-star":
        return "Delete";
      default:
        return "Move";
    }
  });

  const previewUrl = $derived.by(() => {
    if (typeof document === "undefined") return "";
    return generateMapThumbnail(
      mapEditorStore.document.stars.map((star) => ({
        id: star.id,
        x: star.x,
        y: star.y,
        ownerId: star.ownerId ?? "neutral",
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
  function inputValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement).value;
  }
  function textAreaValue(event: Event): string {
    return (event.currentTarget as HTMLTextAreaElement).value;
  }
  function numberValue(event: Event): number {
    return Number((event.currentTarget as HTMLInputElement).value);
  }
  function selectValue(event: Event): string {
    return (event.currentTarget as HTMLSelectElement).value;
  }
  function checkedValue(event: Event): boolean {
    return (event.currentTarget as HTMLInputElement).checked;
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

  function selectOwnerBrush(ownerId: string) {
    mapEditorStore.ownerBrush = ownerId;
    if (mapEditorStore.selection.starIds.length > 0) {
      mapEditorStore.updateSelectedStars({
        ownerId,
      });
    }
    mapEditorStore.setTool("paint-owner");
  }
  function armForceBrush() {
    mapEditorStore.setTool("paint-force");
  }
  function selectStarTypeBrush(starType: StarType) {
    mapEditorStore.starTypeBrush = starType;
    mapEditorStore.setTool("place-star");
  }
  function setPointerMode(mode: "auto" | "connect-lane" | "measure" | "delete-star" | "paint-force") {
    mapEditorStore.setTool(mode);
  }
  function toggleBottomDrawer(drawer: Exclude<BottomDrawerKey, null>) {
    if (bottomDrawer === drawer) {
      bottomDrawer = null;
      return;
    }
    bottomDrawer = drawer;
    lastBottomDrawer = drawer;
  }
  function openBottomDrawer(drawer?: Exclude<BottomDrawerKey, null>) {
    const target = drawer ?? lastBottomDrawer;
    bottomDrawer = target;
    lastBottomDrawer = target;
  }
  function handleBottomBarClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      openBottomDrawer();
    }
  }
  function handleBottomBarKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openBottomDrawer();
    }
  }

  function updateSelectedStarType(starType: StarType) {
    if (!selectedStar) return;
    mapEditorStore.updateStar(selectedStar.id, {
      starType,
    });
  }
  function updateSelectedStarOwner(ownerId: string) {
    if (!hasStarSelection) return;
    mapEditorStore.ownerBrush = ownerId;
    mapEditorStore.updateSelectedStars({
      ownerId,
    });
  }
  function updateSelectedStarShips(value: number) {
    if (!hasStarSelection) return;
    const ships = Math.max(0, Math.round(value));
    mapEditorStore.forceBrush = ships;
    mapEditorStore.updateSelectedStars({
      activeShips: ships,
    });
  }
  function updateSelectedLaneMode(event: Event) {
    if (!selectedLane) return;
    mapEditorStore.updateLane(selectedLane.id, {
      pathMode: selectValue(event) as "auto" | "manual",
    });
  }
  function validateDocument() {
    setStatus(
      mapEditorStore.validationErrors.length > 0
        ? `Validation found ${mapEditorStore.validationErrors.length} error(s) and ${mapEditorStore.validationWarnings.length} warning(s).`
        : `Validation clear. ${mapEditorStore.validationWarnings.length} warning(s).`,
    );
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
  }
  function exportDocument() {
    const payload = mapEditorStore.exportDocument({
      coerceUnownedStars: true,
    });
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

    const saved = mapEditorStore.saveDocument(undefined, {
      coerceUnownedStars: true,
    });
    const playerCount = Math.max(
      2,
      gameStore.settings.playerCount ?? 2,
      saved.factions.length,
    );
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

    const saved = mapEditorStore.saveDocument(undefined, {
      coerceUnownedStars: true,
    });
    const playerCount = Math.max(
      2,
      gameStore.settings.playerCount ?? 2,
      saved.factions.length,
    );

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

  function loadRepositoryMap(mapName: string) {
    const source = mapEditorStore.repositoryMaps.find((map) => map.metadata.name === mapName);
    if (!source) return;
    mapEditorStore.loadMap(source, `saved:${mapName}`);
    recordRecentMap({
      key: mapName,
      label: mapName,
      source: "saved",
    });
    setStatus(`Loaded saved map "${mapName}".`);
  }
  function loadBuiltinMap(mapName: string) {
    const source = mapEditorStore.builtinMaps.find((map) => map.metadata.name === mapName);
    if (!source) return;
    mapEditorStore.loadMap(source, `builtin:${mapName}`);
    recordRecentMap({
      key: mapName,
      label: mapName,
      source: "builtin",
    });
    setStatus(`Loaded built-in map "${mapName}".`);
  }
  async function loadFixtureMap(fixtureId: string) {
    await mapEditorStore.loadFixture(fixtureId);
    recordRecentMap({
      key: fixtureId,
      label: fixtureId,
      source: "fixture",
    });
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
  function ownerButtonStyle(color: string) {
    return `--owner-color:${color}`;
  }
  function buildStarGlyphPoints(sides: number) {
    return buildRegularPolygonPoints(7.5, sides);
  }
  function factionColor(faction: AuthoredFactionSlot) {
    return getOwnerPaletteColor(mapEditorStore.document.factions, faction.id);
  }
  function updateSymmetryFold(event: Event) {
    const nextFold = Number(selectValue(event));
    if (MAP_EDITOR_SYMMETRY_FOLDS.includes(nextFold as MapEditorSymmetryFold)) {
      symmetryFold = nextFold as MapEditorSymmetryFold;
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
  function handleGlobalKeyDown(event: KeyboardEvent) {
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
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    if (isTextEntryTarget(event.target)) return;
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

<svelte:window onkeydown={handleGlobalKeyDown} />

<div class="editor-page">
  <div class="editor-shell">
    <aside class="sidebar-shell">
      <section class="sidebar panel">
        <div class="panel-heading">
          <h2>Editor Controls</h2>
          <span class="mode-badge">{activePointerLabel}</span>
        </div>

        <div class="field-group">
          <span>Pointer</span>
          <div class="mode-grid">
            <button type="button" class="mode-button" class:is-active={mapEditorStore.tool === "auto"} onclick={() => setPointerMode("auto")}>Move</button>
            <button type="button" class="mode-button" class:is-active={mapEditorStore.tool === "connect-lane"} onclick={() => setPointerMode("connect-lane")}>Connect</button>
            <button type="button" class="mode-button" class:is-active={mapEditorStore.tool === "measure"} onclick={() => setPointerMode("measure")}>Measure</button>
            <button type="button" class="mode-button mode-button--danger" class:is-active={mapEditorStore.tool === "delete-star"} onclick={() => setPointerMode("delete-star")}>Delete</button>
          </div>
          <small class="slider-caption">Ctrl-click deletes. Alt-drag moves. Shift-click extends selection. In Connect mode, click or drag through stars to chain lanes, and hold Ctrl to clear them.</small>
        </div>

        <div class="field-group">
          <span>Owner / Faction</span>
          <div class="owner-palette">
            {#each ownerChoices as choice}
              <button type="button" class="swatch-button owner-button" class:is-active={mapEditorStore.ownerBrush === choice.id} style={ownerButtonStyle(choice.color)} onclick={() => selectOwnerBrush(choice.id)}>
                <span class="owner-button__chip"></span>
                <span class="owner-button__meta"><strong>{choice.slotLabel}</strong><span>{choice.label}</span></span>
              </button>
            {/each}
          </div>
          <small class="slider-caption">Click a faction to arm ownership paint, then drag across stars to apply it.</small>
        </div>

        <div class="field-group">
          <span>Star Type</span>
          <div class="star-type-grid">
            {#each mapEditorStore.starTypePalette as option}
              <button type="button" class="swatch-button star-type-button" class:is-active={mapEditorStore.starTypeBrush === option.id} onclick={() => selectStarTypeBrush(option.id)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {#if option.sides > 0}
                    <polygon points={buildStarGlyphPoints(option.sides)} fill={option.color} />
                  {:else}
                    <circle cx="12" cy="12" r="7.5" fill={option.color} />
                  {/if}
                </svg>
                <span>{option.label}</span>
              </button>
            {/each}
          </div>
        </div>

        <div class="field-group">
          <div class="panel-heading panel-heading--compact">
            <span>Fleet Paint</span>
            <button type="button" class="mode-button mode-button--compact" class:is-active={mapEditorStore.tool === "paint-force"} onclick={armForceBrush}>Paint Fleets</button>
          </div>
          <label>
            <span>Starting Force</span>
            <input type="range" min="0" max="200" step="5" bind:value={mapEditorStore.forceBrush} />
          </label>
          <div class="split-row">
            <input type="number" min="0" value={mapEditorStore.forceBrush} oninput={(event) => (mapEditorStore.forceBrush = numberValue(event))} />
            <strong>{mapEditorStore.forceBrush} ships</strong>
          </div>
          <small class="slider-caption">Arm fleet paint, then drag across stars to stamp ship counts.</small>
        </div>

        <label>
          <span>Hex Grid Size</span>
          <input type="range" min={MAP_EDITOR_MIN_HEX_RADIUS} max={MAP_EDITOR_MAX_HEX_RADIUS} step="1" value={mapEditorStore.hexRadius} oninput={(event) => (mapEditorStore.hexRadius = numberValue(event))} />
          <strong>{mapEditorStore.hexRadius}px hex radius</strong>
          <small class="slider-caption">Stars save in grid space and scale with the lattice. Minimum spacing is 2 tiles.</small>
        </label>

        <div class="field-group">
          <span>Map Metadata</span>
          <label><span>Name</span><input type="text" value={mapEditorStore.document.metadata.name} oninput={(event) => mapEditorStore.updateMetadata({ name: inputValue(event), mapId: inputValue(event).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") })} /></label>
          <label><span>Author</span><input type="text" value={mapEditorStore.document.metadata.author ?? ""} oninput={(event) => mapEditorStore.updateMetadata({ author: inputValue(event) })} /></label>
          <label><span>Description</span><textarea rows="3" oninput={(event) => mapEditorStore.updateMetadata({ description: textAreaValue(event) })}>{mapEditorStore.document.metadata.description ?? ""}</textarea></label>
        </div>

        <div class="field-group">
          <span>Helpers</span>
          <div class="split-row split-row--stack">
            <label>
              <span>Fold</span>
              <select value={String(symmetryFold)} oninput={updateSymmetryFold}>
                {#each MAP_EDITOR_SYMMETRY_FOLDS as fold}
                  <option value={fold}>{fold}-fold</option>
                {/each}
              </select>
            </label>
            <button type="button" onclick={applySymmetry}>Apply Symmetry</button>
          </div>
          <div class="helper-grid">
            <button type="button" onclick={autoConnect}>Auto Connect</button>
            <button type="button" onclick={() => mapEditorStore.generateLaneMeasurementsForSelection()}>Lane Measurements</button>
            <button type="button" onclick={() => mapEditorStore.duplicateSelection()}>Clone Selection</button>
            <button type="button" onclick={() => mapEditorStore.mirrorSelection("horizontal")}>Mirror X</button>
            <button type="button" onclick={() => mapEditorStore.mirrorSelection("vertical")}>Mirror Y</button>
            <button type="button" onclick={() => mapEditorStore.insertTemplate("triangle")}>Triangle</button>
            <button type="button" onclick={() => mapEditorStore.insertTemplate("line")}>Line</button>
            <button type="button" onclick={() => mapEditorStore.insertTemplate("ring")}>Ring</button>
          </div>
        </div>

        <div class="field-group">
          <span>Ownership Visuals</span>
          <label>
            <span>Ring Radius</span>
            <input type="range" min="18" max="34" step="1" bind:value={ownerRingRadius} />
            <strong>{ownerRingRadius}px</strong>
          </label>
          <label>
            <span>Ring Thickness</span>
            <input type="range" min="2" max="12" step="1" bind:value={ownerRingThickness} />
            <strong>{ownerRingThickness}px</strong>
          </label>
          <label>
            <span>Hue Shift</span>
            <input type="range" min="-180" max="180" step="1" bind:value={ownerColorHueShift} />
            <strong>{ownerColorHueShift}°</strong>
          </label>
          <label>
            <span>Saturation</span>
            <input type="range" min="0" max="200" step="5" bind:value={ownerColorSaturation} />
            <strong>{ownerColorSaturation}%</strong>
          </label>
          <label>
            <span>Lightness</span>
            <input type="range" min="-35" max="35" step="1" bind:value={ownerColorLightness} />
            <strong>{ownerColorLightness > 0 ? `+${ownerColorLightness}` : ownerColorLightness}%</strong>
          </label>
          <label>
            <span>Alpha</span>
            <input type="range" min="10" max="100" step="1" bind:value={ownerColorAlpha} />
            <strong>{ownerColorAlpha}%</strong>
          </label>
        </div>

        <div class="field-group">
          <span>Global</span>
          <div class="helper-grid">
            <button type="button" onclick={wipeAllOwnership}>Wipe Ownership</button>
            <button type="button" onclick={wipeAllFleets}>Wipe Fleets</button>
            <button type="button" class="danger-button" onclick={wipeAllConnections}>Wipe Connections</button>
          </div>
        </div>

        <div class="field-group">
          <span>Factions</span>
          <button type="button" onclick={() => mapEditorStore.addFactionSlot()}>Add Faction Slot</button>
          {#each mapEditorStore.document.factions as faction}
            <div class="faction-row">
              <span class="faction-row__swatch" style={ownerButtonStyle(factionColor(faction))} aria-hidden="true"></span>
              <input type="text" value={faction.label} oninput={(event) => mapEditorStore.updateFactionSlot(faction.id, { label: inputValue(event) })} />
              <button type="button" onclick={() => mapEditorStore.removeFactionSlot(faction.id)}>Remove</button>
            </div>
          {/each}
        </div>

        <div class="field-group">
          <div class="panel-heading">
            <h3>Preview</h3>
            <button type="button" onclick={() => (showPreview = !showPreview)}>{showPreview ? "Hide" : "Show"}</button>
          </div>
          {#if showPreview && previewUrl}
            <img class="preview-image" src={previewUrl} alt="Map preview" />
          {/if}
          <div class="stats-row stats-row--wrap">
            <span>{mapEditorStore.document.stars.length} stars</span>
            <span>{mapEditorStore.document.connections.length} lanes</span>
            <span>{mapEditorStore.document.measurements?.length ?? 0} measurements</span>
            <span>Dirty: {mapEditorStore.isDirty ? "Yes" : "No"}</span>
          </div>
        </div>
      </section>
    </aside>

    <main class="board-stage">
      <div class="board-topline">
        <div class="board-title">
          <span class="eyebrow">Developer Map Editor</span>
          <strong>{mapEditorStore.document.metadata.name}</strong>
          <span class="status-line">{statusMessage}</span>
        </div>
        <div class="board-topline__actions">
          <button type="button" class="status-pill" class:is-alert={mapEditorStore.validationErrors.length > 0} onclick={() => toggleBottomDrawer("validation")}><strong>{mapEditorStore.validationErrors.length}E</strong><span>{mapEditorStore.validationWarnings.length}W</span></button>
          <button type="button" class="status-pill" onclick={() => toggleBottomDrawer("selection")}><strong>{selectionCount}</strong><span>Selected</span></button>
          <button type="button" class="board-icon" onclick={fitMapToViewport} aria-label="Fit and center map" title="Fit and center map">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3v2H7v4H5V3h6Zm8 0v6h-2V5h-4V3h6Zm-8 18v-2H7v-4H5v6h6Zm8-6v4h-4v2h6v-6h-2ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" fill="currentColor" /></svg>
            <span>Center</span>
          </button>
        </div>
      </div>
      <div class="board-frame">
        <MapEditorCanvas
          ownerRingRadius={ownerRingRadius}
          ownerRingThickness={ownerRingThickness}
          ownerColorHueShift={ownerColorHueShift}
          ownerColorSaturation={ownerColorSaturation}
          ownerColorLightness={ownerColorLightness}
          ownerColorAlpha={ownerColorAlpha / 100}
        />
      </div>
    </main>

    <section class="footer-shell">
      {#if bottomDrawer}
        <section class="bottom-drawer panel">
          <div class="panel-heading">
            <h2>{bottomDrawer === "library" ? "Load Maps" : bottomDrawer === "selection" ? "Selection" : "Validation"}</h2>
            <button type="button" class="drawer-close" onclick={() => (bottomDrawer = null)}>Close</button>
          </div>

          {#if bottomDrawer === "library"}
            <div class="drawer-grid drawer-grid--library">
              <section class="subpanel">
                <h3>Recent</h3>
                <div class="manifest-list">
                  {#if recentMaps.length === 0}
                    <div class="empty-state">No recent maps yet.</div>
                  {:else}
                    {#each recentMaps as entry}
                      <button type="button" onclick={() => openRecentMap(entry)}>
                        <strong>{entry.label}</strong>
                        <span>{entry.source}{entry.savedAt ? ` · ${new Date(entry.savedAt).toLocaleString()}` : ""}</span>
                      </button>
                    {/each}
                  {/if}
                </div>
              </section>
              <section class="subpanel">
                <h3>Saved Maps</h3>
                <div class="manifest-list">
                  {#each mapEditorStore.repositoryManifest as entry}
                    <button type="button" onclick={() => loadRepositoryMap(entry.name)}><strong>{entry.name}</strong><span>{entry.starCount} stars · {entry.laneCount} lanes</span></button>
                  {/each}
                </div>
              </section>
              <section class="subpanel">
                <h3>Built-In Maps</h3>
                <div class="manifest-list">
                  {#each mapEditorStore.builtinMaps as entry}
                    <button type="button" onclick={() => loadBuiltinMap(entry.metadata.name)}><strong>{entry.metadata.name}</strong><span>{entry.stars.length} stars · {entry.connections.length} lanes</span></button>
                  {/each}
                </div>
              </section>
              <section class="subpanel">
                <h3>Fixtures</h3>
                <div class="manifest-list">
                  {#each mapEditorStore.fixtureManifest as fixture}
                    <button type="button" onclick={() => loadFixtureMap(fixture.id)}><strong>{fixture.name}</strong><span>{fixture.purpose}</span></button>
                  {/each}
                </div>
              </section>
              <section class="subpanel">
                <h3>Autosave Recovery</h3>
                <div class="manifest-list">
                  {#each mapEditorStore.autosaveRevisions as revision}
                    <button type="button" onclick={() => loadAutosave(revision.id)}><strong>{revision.name}</strong><span>{new Date(revision.savedAt).toLocaleString()}</span></button>
                  {/each}
                </div>
              </section>
            </div>
          {:else if bottomDrawer === "selection"}
            <div class="drawer-grid drawer-grid--selection">
              {#if hasStarSelection}
                <section class="subpanel">
                  <h3>{selectedStars.length === 1 ? "Selected Star" : `Selected Stars (${selectedStars.length})`}</h3>
                  {#if selectedStar}
                    <label><span>ID</span><input type="text" value={selectedStar.id} disabled /></label>
                    <div class="split-row">
                      <label><span>Grid Q</span><input type="number" value={selectedStar.gridQ ?? 0} oninput={(event) => mapEditorStore.updateStar(selectedStar.id, { gridQ: numberValue(event) })} /></label>
                      <label><span>Grid R</span><input type="number" value={selectedStar.gridR ?? 0} oninput={(event) => mapEditorStore.updateStar(selectedStar.id, { gridR: numberValue(event) })} /></label>
                      <label><span>X / Y</span><input type="text" value={`${selectedStar.x}, ${selectedStar.y}`} disabled /></label>
                    </div>
                  {/if}
                  <label>
                    <span>Owner</span>
                    <div class="owner-palette owner-palette--compact">
                      {#each ownerChoices as choice}
                        <button type="button" class="swatch-button owner-button owner-button--compact" class:is-active={selectedStarOwnerId === choice.id} style={ownerButtonStyle(choice.color)} onclick={() => updateSelectedStarOwner(choice.id)}>
                          <span class="owner-button__chip"></span>
                          <span class="owner-button__meta"><strong>{choice.slotLabel}</strong><span>{choice.label}</span></span>
                        </button>
                      {/each}
                    </div>
                  </label>
                  <label>
                    <span>Ships</span>
                    <input type="range" min="0" max="200" step="5" value={selectedStarShips ?? mapEditorStore.forceBrush} oninput={(event) => updateSelectedStarShips(numberValue(event))} />
                    <div class="split-row">
                      <input type="number" min="0" value={selectedStarShips ?? mapEditorStore.forceBrush} oninput={(event) => updateSelectedStarShips(numberValue(event))} />
                      <strong>{selectedStarShips ?? "Mixed"} ships</strong>
                    </div>
                  </label>
                  {#if selectedStar}
                    <div class="field-group">
                      <span>Type</span>
                      <div class="star-type-grid star-type-grid--compact">
                        {#each mapEditorStore.starTypePalette as option}
                          <button type="button" class="swatch-button star-type-button star-type-button--compact" class:is-active={selectedStar.starType === option.id} onclick={() => updateSelectedStarType(option.id)}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              {#if option.sides > 0}
                                <polygon points={buildStarGlyphPoints(option.sides)} fill={option.color} />
                              {:else}
                                <circle cx="12" cy="12" r="7.5" fill={option.color} />
                              {/if}
                            </svg>
                            <span>{option.label}</span>
                          </button>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </section>
              {:else if selectedLane}
                <section class="subpanel">
                  <h3>Selected Lane</h3>
                  <label><span>ID</span><input type="text" value={selectedLane.id} disabled /></label>
                  <div class="stats-row"><span>{selectedLane.sourceId}</span><span>to</span><span>{selectedLane.targetId}</span></div>
                  <label>
                    <span>Path Mode</span>
                    <select value={selectedLane.pathMode ?? "auto"} oninput={updateSelectedLaneMode}>
                      <option value="auto">Auto</option>
                      <option value="manual">Manual</option>
                    </select>
                  </label>
                </section>
              {:else if selectedMeasurement}
                <section class="subpanel">
                  <h3>Selected Measurement</h3>
                  <label><span>Label</span><input type="text" value={selectedMeasurement.label ?? ""} oninput={(event) => mapEditorStore.updateMeasurement(selectedMeasurement.id, { label: inputValue(event) })} /></label>
                  <label class="toggle-row"><input type="checkbox" checked={selectedMeasurement.visibleByDefault !== false} oninput={(event) => mapEditorStore.updateMeasurement(selectedMeasurement.id, { visibleByDefault: checkedValue(event) })} /><span>Visible By Default</span></label>
                </section>
              {:else}
                <section class="subpanel"><h3>No Selection</h3><div class="empty-state">Select stars, lanes, or measurements to edit them here.</div></section>
              {/if}

              <section class="subpanel">
                <h3>Measurements</h3>
                <div class="manifest-list">
                  {#if (mapEditorStore.document.measurements?.length ?? 0) === 0}
                    <div class="empty-state">No measurements authored yet.</div>
                  {:else}
                    {#each mapEditorStore.document.measurements ?? [] as measurement}
                      <button type="button" class:is-selected={mapEditorStore.selection.measurementIds.includes(measurement.id)} onclick={() => mapEditorStore.selectMeasurement(measurement.id)}>
                        <strong>{measurement.label || measurement.relatedLaneLabel || measurement.starPairLabel || measurement.id}</strong>
                        <span>{measurement.mode} measurement</span>
                      </button>
                    {/each}
                  {/if}
                </div>
              </section>
            </div>
          {:else}
            <div class="drawer-grid">
              <section class="subpanel">
                <h3>Validation Summary</h3>
                <div class="validation-strip__meta"><strong>{mapEditorStore.validationErrors.length} errors</strong><span>{mapEditorStore.validationWarnings.length} warnings</span></div>
                <div class="validation-strip__issues">
                  {#if mapEditorStore.validationIssues.length === 0}
                    <div class="issue issue--ok">No validation issues.</div>
                  {:else}
                    {#each mapEditorStore.validationIssues as issue}
                      <div class="issue" class:issue--error={issue.severity === "error"}><strong>{issue.code}</strong><span>{issue.message}</span></div>
                    {/each}
                  {/if}
                </div>
              </section>
            </div>
          {/if}
        </section>
      {/if}

      <div class="bottom-bar panel panel--bar" role="button" tabindex="0" onclick={handleBottomBarClick} onkeydown={handleBottomBarKeyDown}>
        <button type="button" class="bottom-bar__summary bottom-bar__summary--button" onclick={() => openBottomDrawer()}>
          <span class="eyebrow">Map</span>
          <strong>{mapEditorStore.document.metadata.name}</strong>
          <span>{activePointerLabel}</span>
        </button>
        <div class="bottom-bar__buttons">
          <button type="button" onclick={saveDocument}>Save</button>
          <button type="button" class="dock-button" class:is-active={bottomDrawer === "library"} onclick={() => toggleBottomDrawer("library")}>Load</button>
          <button type="button" onclick={exportDocument}>Export</button>
          <button type="button" onclick={() => mapEditorStore.newMap()}>New</button>
          <button type="button" class="dock-button" class:is-active={bottomDrawer === "selection"} onclick={() => toggleBottomDrawer("selection")}>Selection</button>
          <button type="button" class="dock-button" class:is-active={bottomDrawer === "validation"} onclick={() => toggleBottomDrawer("validation")}>Validate</button>
        </div>
        <div class="bottom-bar__quick">
          <button type="button" class="accent" onclick={testSinglePlayer}>Test SP</button>
          <button type="button" class="accent" onclick={hostMultiplayer}>Host MP</button>
          <button type="button" onclick={() => mapEditorStore.undo()} disabled={!mapEditorStore.canUndo}>Undo</button>
          <button type="button" onclick={() => mapEditorStore.redo()} disabled={!mapEditorStore.canRedo}>Redo</button>
          <button type="button" class="board-icon" onclick={() => openBottomDrawer()} aria-label="Expand bottom drawer" title="Expand bottom drawer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 8 6 6H6l6-6Z" fill="currentColor" /></svg>
          </button>
        </div>
      </div>
    </section>
  </div>
</div>

<style>
  .editor-page {
    height: 100vh;
    overflow: hidden;
    padding: 16px;
    background:
      radial-gradient(circle at top left, rgba(14, 165, 233, 0.14), transparent 32%),
      radial-gradient(circle at bottom right, rgba(250, 204, 21, 0.1), transparent 26%),
      #030712;
    color: #e2e8f0;
    font-family: "Inter", sans-serif;
  }

  .editor-shell {
    height: calc(100vh - 32px);
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-areas:
      "sidebar board"
      "sidebar footer";
    gap: 14px;
  }

  .panel,
  .board-frame,
  .bottom-drawer {
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(3, 7, 18, 0.82);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(18px);
  }

  .sidebar-shell {
    grid-area: sidebar;
    min-height: 0;
    width: min(360px, 30vw);
  }

  .sidebar {
    height: 100%;
    overflow: auto;
  }

  .board-stage {
    grid-area: board;
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 12px;
  }

  .board-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .board-title,
  .bottom-bar__summary {
    display: grid;
    gap: 4px;
  }

  .board-title strong,
  .bottom-bar__summary strong {
    font-family: "Rajdhani", sans-serif;
    font-size: 1.35rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .status-line {
    color: rgba(191, 219, 254, 0.88);
    font-size: 0.92rem;
  }

  .board-topline__actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .status-pill,
  .board-icon {
    min-height: 46px;
    padding: 0 14px;
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }

  .status-pill strong,
  .status-pill span,
  .board-icon span {
    font-family: "Rajdhani", sans-serif;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .status-pill.is-alert {
    border-color: rgba(248, 113, 113, 0.4);
    color: #fee2e2;
  }

  .board-icon svg {
    width: 18px;
    height: 18px;
  }

  .board-frame {
    min-height: 0;
    height: 100%;
    border-radius: 28px;
    overflow: hidden;
  }

  .footer-shell {
    grid-area: footer;
    position: relative;
    min-width: 0;
    min-height: 76px;
  }

  .bottom-drawer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(100% + 12px);
    z-index: 30;
    border-radius: 28px;
    max-height: min(44vh, 460px);
    overflow: auto;
  }

  .bottom-bar {
    min-height: 76px;
  }

  .panel {
    border-radius: 24px;
    padding: 18px;
    display: grid;
    gap: 14px;
  }

  .panel--bar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 12px;
    align-items: center;
  }

  .bottom-bar__buttons,
  .bottom-bar__quick {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .dock-button.is-active {
    background: rgba(14, 165, 233, 0.16);
    border-color: rgba(125, 211, 252, 0.66);
  }

  .bottom-bar__summary--button {
    text-align: left;
    align-items: start;
    justify-items: start;
    text-transform: none;
    letter-spacing: 0;
    background: rgba(15, 23, 42, 0.68);
  }

  .eyebrow,
  h2,
  h3,
  label span,
  .stats-row span {
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .eyebrow,
  label span,
  .stats-row span {
    font-size: 0.76rem;
    color: rgba(148, 163, 184, 0.85);
  }

  h2 {
    margin: 0;
    font-family: "Rajdhani", sans-serif;
    font-size: 1rem;
    color: #f8fafc;
  }

  h3 {
    margin: 0;
    font-family: "Rajdhani", sans-serif;
    font-size: 0.96rem;
    color: #f8fafc;
  }

  button,
  select,
  input,
  textarea {
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.22);
    background: rgba(15, 23, 42, 0.92);
    color: #e2e8f0;
    font: inherit;
  }

  button {
    min-height: 42px;
    padding: 0 14px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
  }

  button.accent,
  .mode-button.is-active {
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.95), rgba(59, 130, 246, 0.9));
    color: #f8fafc;
    border-color: rgba(125, 211, 252, 0.7);
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .panel-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .panel-heading--compact {
    align-items: end;
  }

  .mode-badge {
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(8, 15, 31, 0.64);
    color: rgba(191, 219, 254, 0.94);
    font-size: 0.74rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  label {
    display: grid;
    gap: 8px;
  }

  .field-group,
  .subpanel {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  .drawer-grid {
    display: grid;
    gap: 16px;
  }

  .drawer-grid--library {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .drawer-grid--selection {
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.9fr);
  }

  input,
  select,
  textarea {
    width: 100%;
    min-height: 42px;
    padding: 0 12px;
    outline: none;
  }

  textarea {
    min-height: 96px;
    padding: 12px;
    resize: vertical;
  }

  .split-row,
  .stats-row,
  .faction-row,
  .toggle-row {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .split-row label,
  .faction-row input {
    flex: 1;
  }

  .split-row--stack {
    align-items: end;
  }

  .helper-grid {
    display: grid;
    gap: 10px;
  }

  .helper-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mode-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .mode-button {
    min-height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .mode-button--compact {
    min-height: 42px;
  }

  .mode-button--danger {
    border-color: rgba(248, 113, 113, 0.24);
    color: rgba(254, 226, 226, 0.94);
  }

  .mode-button--danger.is-active {
    background: linear-gradient(135deg, rgba(153, 27, 27, 0.94), rgba(220, 38, 38, 0.9));
    border-color: rgba(252, 165, 165, 0.56);
  }

  .danger-button {
    border-color: rgba(248, 113, 113, 0.3);
    background: rgba(127, 29, 29, 0.52);
    color: rgba(254, 226, 226, 0.96);
  }

  .owner-palette,
  .star-type-grid {
    display: grid;
    gap: 10px;
  }

  .owner-palette,
  .owner-palette--compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .star-type-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .star-type-grid--compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .swatch-button {
    min-height: 54px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: flex-start;
    text-transform: none;
    letter-spacing: 0;
  }

  .swatch-button.is-active {
    border-color: rgba(125, 211, 252, 0.74);
    background: rgba(14, 165, 233, 0.14);
    box-shadow: inset 0 0 0 1px rgba(125, 211, 252, 0.22);
  }

  .owner-button__chip,
  .faction-row__swatch {
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background: var(--owner-color);
    box-shadow:
      0 0 0 2px rgba(15, 23, 42, 0.92),
      0 0 18px color-mix(in srgb, var(--owner-color) 34%, transparent);
    flex: 0 0 auto;
  }

  .owner-button__meta {
    display: grid;
    gap: 2px;
    justify-items: start;
  }

  .owner-button__meta strong {
    font-family: "Rajdhani", sans-serif;
    font-size: 0.98rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .owner-button__meta span {
    font-size: 0.78rem;
    color: rgba(148, 163, 184, 0.9);
  }

  .owner-button--compact {
    min-height: 48px;
  }

  .star-type-button {
    flex-direction: column;
    justify-content: center;
    min-height: 72px;
    gap: 8px;
  }

  .star-type-button svg {
    width: 24px;
    height: 24px;
    filter: drop-shadow(0 0 8px rgba(148, 163, 184, 0.2));
  }

  .star-type-button polygon,
  .star-type-button circle {
    stroke: rgba(255, 255, 255, 0.55);
    stroke-width: 1.1;
  }

  .star-type-button span {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .star-type-button--compact {
    min-height: 64px;
  }

  .slider-caption {
    font-size: 0.78rem;
    color: rgba(148, 163, 184, 0.9);
  }

  .preview-image {
    width: 100%;
    border-radius: 18px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: #020617;
  }

  .manifest-list {
    display: grid;
    gap: 10px;
    max-height: 240px;
    overflow: auto;
  }

  .manifest-list button {
    min-height: 58px;
    padding: 10px 12px;
    display: grid;
    justify-items: start;
    align-content: center;
    gap: 4px;
    text-align: left;
    text-transform: none;
    letter-spacing: 0;
  }

  .manifest-list button strong {
    font-family: "Rajdhani", sans-serif;
    font-size: 1rem;
    color: #f8fafc;
  }

  .manifest-list button span {
    font-size: 0.84rem;
    color: rgba(148, 163, 184, 0.9);
  }

  .manifest-list button.is-selected {
    border-color: rgba(125, 211, 252, 0.7);
    background: rgba(14, 165, 233, 0.16);
  }

  .faction-row__swatch {
    margin-right: 2px;
  }

  .drawer-close {
    min-height: 36px;
    padding: 0 12px;
    font-size: 0.74rem;
  }

  .stats-row--wrap {
    flex-wrap: wrap;
  }

  .empty-state {
    padding: 12px 14px;
    border-radius: 16px;
    border: 1px dashed rgba(148, 163, 184, 0.24);
    color: rgba(148, 163, 184, 0.9);
    font-size: 0.9rem;
  }

  .validation-strip__meta {
    display: flex;
    gap: 14px;
    align-items: center;
    font-family: "Rajdhani", sans-serif;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .validation-strip__issues {
    display: grid;
    gap: 10px;
    max-height: 260px;
    overflow: auto;
  }

  .issue {
    display: grid;
    gap: 4px;
    padding: 12px 14px;
    border-radius: 16px;
    border: 1px solid rgba(250, 204, 21, 0.24);
    background: rgba(250, 204, 21, 0.08);
  }

  .issue--error {
    border-color: rgba(248, 113, 113, 0.28);
    background: rgba(248, 113, 113, 0.1);
  }

  .issue--ok {
    border-color: rgba(74, 222, 128, 0.28);
    background: rgba(74, 222, 128, 0.08);
  }

  @media (max-width: 1280px) {
    .drawer-grid--selection,
    .drawer-grid--library {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 1040px) {
    .editor-page {
      padding: 12px;
    }

    .editor-shell {
      height: calc(100vh - 24px);
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(0, 1fr) auto;
      grid-template-areas:
        "sidebar"
        "board"
        "footer";
    }

    .sidebar-shell {
      width: 100%;
    }
  }

  @media (max-width: 860px) {
    .drawer-grid--selection,
    .drawer-grid--library,
    .panel--bar {
      grid-template-columns: 1fr;
    }

    .board-topline {
      flex-direction: column;
      align-items: stretch;
    }

    .board-topline__actions {
      justify-content: space-between;
    }

    .owner-palette,
    .owner-palette--compact,
    .star-type-grid,
    .star-type-grid--compact {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
