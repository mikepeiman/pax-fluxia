<script lang="ts">
  import type { AuthoredMeasurementAnchor } from "@pax/common/maps";
  import {
    MAP_EDITOR_BOARD_HEIGHT,
    MAP_EDITOR_BOARD_WIDTH,
    buildGameBoardHexPointsAt,
    buildPolygonPointsAt,
    generateEditorHexGrid,
    getOwnerPaletteColor,
    snapPointToHexCenter,
  } from "$lib/editor/mapEditorPresentation";
  import { mapEditorStore } from "$lib/editor/mapEditorStore.svelte";
  import {
    getPortalGroupCssColor,
    getPortalGroupLabel,
  } from "$lib/utils/portalStyling";

  const BOARD_WIDTH = MAP_EDITOR_BOARD_WIDTH;
  const BOARD_HEIGHT = MAP_EDITOR_BOARD_HEIGHT;

  type Point = { x: number; y: number };
  type LaneHit = {
    laneId: string;
    x: number;
    y: number;
  };
  type StarBrushKind = "owner" | "force";

  type ContextMenuState = {
    x: number;
    y: number;
    kind: "star" | "lane";
    id: string;
    label: string;
  };

  type InteractionState =
    | {
        mode: "pan";
        pointerId: number;
        screenX: number;
        screenY: number;
        panX: number;
        panY: number;
      }
    | {
        mode: "move-stars";
        pointerId: number;
        origin: Point;
        starIds: string[];
        basePositions: Record<string, Point>;
      }
    | {
        mode: "connect-lanes";
        pointerId: number;
        lastStarId: string;
        traversedKeys: string[];
      }
    | {
        mode: "paint-stars";
        pointerId: number;
        brush: StarBrushKind;
        paintedStarIds: string[];
      }
    | {
        mode: "box-select";
        pointerId: number;
        origin: Point;
        current: Point;
        screenOrigin: Point;
        screenCurrent: Point;
        append: boolean;
      };

  let {
    ownerRingRadius = 24,
    ownerRingThickness = 4,
    ownerColorHueShift = 0,
    ownerColorSaturation = 100,
    ownerColorLightness = 0,
    ownerColorAlpha = 0.94,
  }: {
    ownerRingRadius?: number;
    ownerRingThickness?: number;
    ownerColorHueShift?: number;
    ownerColorSaturation?: number;
    ownerColorLightness?: number;
    ownerColorAlpha?: number;
  } = $props();

  let canvasEl: SVGSVGElement | null = null;
  let hoverPoint = $state<Point | null>(null);
  let interaction = $state<InteractionState | null>(null);
  let previewPositions = $state<Record<string, Point>>({});
  let selectionBox = $state<{ x: number; y: number; width: number; height: number } | null>(null);
  let contextMenu = $state<ContextMenuState | null>(null);
  let isSpacePanning = $state(false);

  const issueIds = $derived.by(() => {
    const errorIds = new Set<string>();
    const warningIds = new Set<string>();
    for (const issue of mapEditorStore.validationIssues) {
      const target = issue.severity === "error" ? errorIds : warningIds;
      for (const id of issue.relatedIds ?? []) {
        if (id) target.add(id);
      }
    }
    return { errorIds, warningIds };
  });

  const measurementPreviewItems = $derived.by(() => {
    const preview = measurementPreview();
    return preview ? [preview] : [];
  });

  const hexCells = $derived.by(() => generateEditorHexGrid(mapEditorStore.hexRadius));

  function getStarById(starId: string) {
    return mapEditorStore.document.stars.find((star) => star.id === starId) ?? null;
  }

  function getStarTypeMeta(starType: string) {
    return (
      mapEditorStore.starTypePalette.find((entry) => entry.id === starType) ??
      mapEditorStore.starTypePalette[0]
    );
  }

  function getOwnerColor(ownerId?: string | null) {
    return getOwnerPaletteColor(mapEditorStore.document.factions, ownerId);
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function hexToRgb(color: string) {
    const normalized = color.trim().replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
      return { r: 148, g: 163, b: 184 };
    }
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }

  function rgbToHsl(color: { r: number; g: number; b: number }) {
    const red = color.r / 255;
    const green = color.g / 255;
    const blue = color.b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const lightness = (max + min) * 0.5;
    const delta = max - min;

    if (delta === 0) {
      return { h: 0, s: 0, l: lightness * 100 };
    }

    const saturation = delta / (1 - Math.abs(2 * lightness - 1));
    let hue = 0;
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }

    return {
      h: ((hue * 60) + 360) % 360,
      s: saturation * 100,
      l: lightness * 100,
    };
  }

  function getAdjustedOwnerColor(ownerId?: string | null, alpha = ownerColorAlpha) {
    const hsl = rgbToHsl(hexToRgb(getOwnerColor(ownerId)));
    const hue = ((hsl.h + ownerColorHueShift) % 360 + 360) % 360;
    const saturation = clamp(hsl.s * (ownerColorSaturation / 100), 0, 100);
    const lightness = clamp(hsl.l + ownerColorLightness, 0, 100);
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${clamp(alpha, 0, 1)})`;
  }

  function getOwnerBadgeLabel(ownerId?: string | null) {
    if (!ownerId || ownerId === "neutral") {
      return "N";
    }

    const ordered = [...mapEditorStore.document.factions].sort((left, right) => left.order - right.order);
    const index = ordered.findIndex((faction) => faction.id === ownerId);
    return index >= 0 ? `P${index + 1}` : "?";
  }

  function snapWorldPoint(point: Point): Point {
    return snapPointToHexCenter(point, mapEditorStore.hexRadius);
  }

  function buildLanePairKey(sourceId: string, targetId: string): string {
    return sourceId <= targetId ? `${sourceId}|${targetId}` : `${targetId}|${sourceId}`;
  }

  function buildTraversalKey(sourceId: string, targetId: string, connected: boolean): string {
    return `${connected ? "add" : "remove"}:${buildLanePairKey(sourceId, targetId)}`;
  }

  function getScreenPoint(clientX: number, clientY: number): Point {
    const rect = canvasEl?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return {
      x: ((clientX - rect.left) / rect.width) * BOARD_WIDTH,
      y: ((clientY - rect.top) / rect.height) * BOARD_HEIGHT,
    };
  }

  function screenToWorld(clientX: number, clientY: number): Point {
    const point = getScreenPoint(clientX, clientY);
    return {
      x: (point.x - mapEditorStore.viewport.panX) / mapEditorStore.viewport.zoom,
      y: (point.y - mapEditorStore.viewport.panY) / mapEditorStore.viewport.zoom,
    };
  }

  function getRenderedPoint(starId: string): Point | null {
    const preview = previewPositions[starId];
    if (preview) return preview;
    const star = getStarById(starId);
    return star ? { x: star.x, y: star.y } : null;
  }

  function lanePoints(laneId: string): Point[] {
    const lane = mapEditorStore.document.connections.find((entry) => entry.id === laneId);
    if (!lane) return [];
    const source = getRenderedPoint(lane.sourceId);
    const target = getRenderedPoint(lane.targetId);
    if (!source || !target) return [];
    if (lane.laneWaypoints && lane.laneWaypoints.length > 1) {
      return lane.laneWaypoints.map(([x, y]) => ({ x, y }));
    }
    return [source, target];
  }

  function findStarAt(world: Point) {
    const hitRadius = 24 / mapEditorStore.viewport.zoom;
    const stars = [...mapEditorStore.document.stars].reverse();
    for (const star of stars) {
      const point = getRenderedPoint(star.id);
      if (!point) continue;
      const dist = Math.hypot(point.x - world.x, point.y - world.y);
      if (dist <= hitRadius) {
        return star;
      }
    }
    return null;
  }

  function projectPointToSegment(point: Point, start: Point, end: Point) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;
    const t =
      lengthSq === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq),
          );
    const x = start.x + dx * t;
    const y = start.y + dy * t;
    return {
      x,
      y,
      distance: Math.hypot(point.x - x, point.y - y),
    };
  }

  function findLaneAt(world: Point): LaneHit | null {
    const threshold = 12 / mapEditorStore.viewport.zoom;
    let best: LaneHit & { distance: number } | null = null;
    for (const lane of mapEditorStore.document.connections) {
      const points = lanePoints(lane.id);
      for (let index = 0; index < points.length - 1; index += 1) {
        const projected = projectPointToSegment(world, points[index], points[index + 1]);
        if (projected.distance > threshold) continue;
        if (!best || projected.distance < best.distance) {
          best = {
            laneId: lane.id,
            x: projected.x,
            y: projected.y,
            distance: projected.distance,
          };
        }
      }
    }
    return best;
  }

  function buildAnchor(world: Point): AuthoredMeasurementAnchor {
    const star = findStarAt(world);
    if (star) {
      return {
        x: star.x,
        y: star.y,
        snapKind: "star",
        starId: star.id,
      };
    }

    const laneHit = findLaneAt(world);
    if (laneHit) {
      const lane = mapEditorStore.document.connections.find(
        (entry) => entry.id === laneHit.laneId,
      );
      return {
        x: laneHit.x,
        y: laneHit.y,
        snapKind: "lane",
        laneId: laneHit.laneId,
        laneKey: lane ? `${lane.sourceId}|${lane.targetId}` : laneHit.laneId,
        laneLabel: lane ? `${lane.sourceId} <-> ${lane.targetId}` : laneHit.laneId,
      };
    }

    return {
      x: world.x,
      y: world.y,
      snapKind: "free",
    };
  }

  function normalizeRect(start: Point, end: Point) {
    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  }

  function starIdsInRect(start: Point, end: Point): string[] {
    const rect = normalizeRect(start, end);
    return mapEditorStore.document.stars
      .filter((star) => {
        const point = getRenderedPoint(star.id);
        if (!point) return false;
        return (
          point.x >= rect.x &&
          point.x <= rect.x + rect.width &&
          point.y >= rect.y &&
          point.y <= rect.y + rect.height
        );
      })
      .map((star) => star.id);
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const rect = canvasEl?.getBoundingClientRect();
    if (!rect) return;

    const point = getScreenPoint(event.clientX, event.clientY);
    const screenX = point.x;
    const screenY = point.y;

    if (!event.ctrlKey && !event.metaKey) {
      const panDeltaX = event.shiftKey && Math.abs(event.deltaX) < 0.001
        ? event.deltaY
        : event.deltaX;
      const panDeltaY = event.shiftKey && Math.abs(event.deltaX) < 0.001
        ? 0
        : event.deltaY;

      mapEditorStore.setViewport({
        ...mapEditorStore.viewport,
        panX: mapEditorStore.viewport.panX - panDeltaX,
        panY: mapEditorStore.viewport.panY - panDeltaY,
      });
      return;
    }

    const worldX = (screenX - mapEditorStore.viewport.panX) / mapEditorStore.viewport.zoom;
    const worldY = (screenY - mapEditorStore.viewport.panY) / mapEditorStore.viewport.zoom;
    const nextZoom = Math.min(
      2.5,
      Math.max(0.35, mapEditorStore.viewport.zoom * (event.deltaY > 0 ? 0.92 : 1.08)),
    );

    mapEditorStore.setViewport({
      zoom: nextZoom,
      panX: screenX - worldX * nextZoom,
      panY: screenY - worldY * nextZoom,
    });
  }

  function trySetPointerCapture(pointerId: number) {
    if (!canvasEl || typeof canvasEl.setPointerCapture !== "function") {
      return;
    }

    try {
      canvasEl.setPointerCapture(pointerId);
    } catch {
      // Some browsers reject pointer capture on SVG in edge cases.
      // The editor should still place/select even without capture.
    }
  }

  function isTypingTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    return (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable
    );
  }

  function handleWindowKeyDown(event: KeyboardEvent) {
    if (event.code !== "Space" || isTypingTarget(event.target)) {
      return;
    }
    event.preventDefault();
    isSpacePanning = true;
  }

  function handleWindowKeyUp(event: KeyboardEvent) {
    if (event.code !== "Space") {
      return;
    }
    isSpacePanning = false;
  }

  function handlePointerDown(event: PointerEvent) {
    if (!canvasEl) return;
    if (event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    contextMenu = null;
    const world = screenToWorld(event.clientX, event.clientY);
    hoverPoint = world;
    const star = findStarAt(world);
    const laneHit = star ? null : findLaneAt(world);
    const lane = laneHit
      ? mapEditorStore.document.connections.find((entry) => entry.id === laneHit.laneId) ?? null
      : null;
    const wantsPanPointer = event.button === 1 || (event.button === 0 && isSpacePanning);

    if (wantsPanPointer) {
      trySetPointerCapture(event.pointerId);
      const screenPoint = getScreenPoint(event.clientX, event.clientY);
      interaction = {
        mode: "pan",
        pointerId: event.pointerId,
        screenX: screenPoint.x,
        screenY: screenPoint.y,
        panX: mapEditorStore.viewport.panX,
        panY: mapEditorStore.viewport.panY,
      };
      return;
    }

    trySetPointerCapture(event.pointerId);

    if (mapEditorStore.tool !== "connect-lane" && event.ctrlKey && (star || lane)) {
      if (star) {
        mapEditorStore.selectStar(star.id, event.shiftKey);
      } else if (lane) {
        mapEditorStore.selectLane(lane.id, event.shiftKey);
      }
      mapEditorStore.deleteSelection();
      return;
    }

    if (mapEditorStore.tool === "measure") {
      mapEditorStore.startOrCompleteMeasurement(buildAnchor(world));
      return;
    }

    const wantsMove = Boolean(
      star &&
      !event.shiftKey &&
      (event.altKey || mapEditorStore.tool === "auto")
    );

    if (star && wantsMove) {
      const preserveSelection =
        !event.shiftKey &&
        mapEditorStore.selection.starIds.includes(star.id) &&
        mapEditorStore.selection.starIds.length > 1;
      const starIds = event.shiftKey
        ? Array.from(new Set([...mapEditorStore.selection.starIds, star.id]))
        : preserveSelection
          ? [...mapEditorStore.selection.starIds]
          : [star.id];
      mapEditorStore.setSelection({
        starIds,
        laneIds: [],
        measurementIds: [],
      });
      const basePositions = Object.fromEntries(
        starIds
          .map((starId) => {
            const point = getRenderedPoint(starId);
            return point ? [starId, point] : null;
          })
          .filter((entry): entry is [string, Point] => entry !== null),
      );
      previewPositions = basePositions;
      interaction = {
        mode: "move-stars",
        pointerId: event.pointerId,
        origin: world,
        starIds,
        basePositions,
      };
      return;
    }

    if (mapEditorStore.tool === "delete-star") {
      if (star) {
        mapEditorStore.selectStar(star.id);
        mapEditorStore.deleteSelection();
      } else if (lane) {
        mapEditorStore.selectLane(lane.id);
        mapEditorStore.deleteSelection();
      }
      return;
    }

    if (mapEditorStore.tool === "paint-owner" && star) {
      mapEditorStore.setSelection({
        starIds: [star.id],
        laneIds: [],
        measurementIds: [],
      });
      mapEditorStore.applyOwnerBrush([star.id], {
        pushUndo: true,
        clearRedo: true,
        autosave: false,
      });
      interaction = {
        mode: "paint-stars",
        pointerId: event.pointerId,
        brush: "owner",
        paintedStarIds: [star.id],
      };
      return;
    }

    if (mapEditorStore.tool === "paint-force" && star) {
      mapEditorStore.setSelection({
        starIds: [star.id],
        laneIds: [],
        measurementIds: [],
      });
      mapEditorStore.applyForceBrush([star.id], {
        pushUndo: true,
        clearRedo: true,
        autosave: false,
      });
      interaction = {
        mode: "paint-stars",
        pointerId: event.pointerId,
        brush: "force",
        paintedStarIds: [star.id],
      };
      return;
    }

    if (mapEditorStore.tool === "connect-lane") {
      if (star) {
        mapEditorStore.startOrAdvanceLaneDraft(star.id, !event.ctrlKey);
        interaction = {
          mode: "connect-lanes",
          pointerId: event.pointerId,
          lastStarId: star.id,
          traversedKeys: [],
        };
        return;
      }

      if (lane && event.ctrlKey) {
        mapEditorStore.setLaneConnection(lane.sourceId, lane.targetId, false);
        mapEditorStore.selectLane(lane.id);
        return;
      }

      if (lane) {
        mapEditorStore.selectLane(lane.id, event.shiftKey);
        return;
      }

      if (mapEditorStore.draftLaneSourceId) {
        mapEditorStore.clearLaneDraft();
      }
      return;
    }

    if (star) {
      const starIds = event.shiftKey
        ? Array.from(new Set([...mapEditorStore.selection.starIds, star.id]))
        : mapEditorStore.selection.starIds.includes(star.id) &&
            mapEditorStore.selection.starIds.length > 1
          ? [...mapEditorStore.selection.starIds]
          : [star.id];
      mapEditorStore.setSelection({
        starIds,
        laneIds: [],
        measurementIds: [],
      });
      return;
    }

    if (lane) {
      mapEditorStore.selectLane(lane.id, event.shiftKey);
      return;
    }

    if (mapEditorStore.tool === "auto") {
      const screenPoint = getScreenPoint(event.clientX, event.clientY);
      selectionBox = normalizeRect(world, world);
      interaction = {
        mode: "box-select",
        pointerId: event.pointerId,
        origin: world,
        current: world,
        screenOrigin: screenPoint,
        screenCurrent: screenPoint,
        append: event.shiftKey,
      };
      return;
    }

    if (mapEditorStore.tool === "place-star") {
      mapEditorStore.placeStar(world.x, world.y);
      return;
    }

    mapEditorStore.clearSelection();
    const screenPoint = getScreenPoint(event.clientX, event.clientY);
    interaction = {
      mode: "pan",
      pointerId: event.pointerId,
      screenX: screenPoint.x,
      screenY: screenPoint.y,
      panX: mapEditorStore.viewport.panX,
      panY: mapEditorStore.viewport.panY,
    };
  }

  function handlePointerMove(event: PointerEvent) {
    hoverPoint = screenToWorld(event.clientX, event.clientY);

    if (!interaction || interaction.pointerId !== event.pointerId) {
      return;
    }

    if (interaction.mode === "pan") {
      const screenPoint = getScreenPoint(event.clientX, event.clientY);
      mapEditorStore.setViewport({
        ...mapEditorStore.viewport,
        panX: interaction.panX + (screenPoint.x - interaction.screenX),
        panY: interaction.panY + (screenPoint.y - interaction.screenY),
      });
      return;
    }

    if (interaction.mode === "connect-lanes") {
      const star = findStarAt(hoverPoint);
      if (!star || star.id === interaction.lastStarId) {
        return;
      }

      const currentSourceId = mapEditorStore.draftLaneSourceId ?? interaction.lastStarId;
      const connected = !event.ctrlKey;
      const traversalKey = buildTraversalKey(currentSourceId, star.id, connected);
      if (interaction.traversedKeys.includes(traversalKey)) {
        mapEditorStore.setLaneDraftSource(star.id);
        interaction = {
          ...interaction,
          lastStarId: star.id,
        };
        return;
      }

      mapEditorStore.startOrAdvanceLaneDraft(star.id, connected);
      interaction = {
        ...interaction,
        lastStarId: star.id,
        traversedKeys: [...interaction.traversedKeys, traversalKey],
      };
      return;
    }

    if (interaction.mode === "paint-stars") {
      const star = findStarAt(hoverPoint);
      if (!star || interaction.paintedStarIds.includes(star.id)) {
        return;
      }

      const applied = interaction.brush === "owner"
        ? mapEditorStore.applyOwnerBrush([star.id], {
            pushUndo: false,
            clearRedo: false,
            autosave: false,
          })
        : mapEditorStore.applyForceBrush([star.id], {
            pushUndo: false,
            clearRedo: false,
            autosave: false,
          });

      if (!applied) {
        return;
      }

      interaction = {
        ...interaction,
        paintedStarIds: [...interaction.paintedStarIds, star.id],
      };
      return;
    }

    if (interaction.mode === "box-select") {
      const current = screenToWorld(event.clientX, event.clientY);
      const screenCurrent = getScreenPoint(event.clientX, event.clientY);
      selectionBox = normalizeRect(interaction.origin, current);
      interaction = {
        ...interaction,
        current,
        screenCurrent,
      };
      return;
    }

    const moveInteraction = interaction;
    if (moveInteraction.mode !== "move-stars") {
      return;
    }

    const world = screenToWorld(event.clientX, event.clientY);
    const dx = world.x - moveInteraction.origin.x;
    const dy = world.y - moveInteraction.origin.y;
    previewPositions = Object.fromEntries(
      moveInteraction.starIds.map((starId) => {
        const base = moveInteraction.basePositions[starId];
        const snapped = snapWorldPoint({
          x: base.x + dx,
          y: base.y + dy,
        });
        return [
          starId,
          {
            x: snapped.x,
            y: snapped.y,
          },
        ];
      }),
    );
  }

  function handleMeasurementPointerDown(event: PointerEvent, measurementId: string) {
    event.preventDefault();
    event.stopPropagation();

    mapEditorStore.selectMeasurement(measurementId, event.shiftKey);
    if (event.ctrlKey || mapEditorStore.tool === "delete-star") {
      mapEditorStore.deleteSelection();
    }
  }

  function handleMeasurementKeyDown(event: KeyboardEvent, measurementId: string) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    mapEditorStore.selectMeasurement(measurementId, event.shiftKey);
    if (mapEditorStore.tool === "delete-star") {
      mapEditorStore.deleteSelection();
    }
  }

  function endInteraction(event: PointerEvent) {
    if (!interaction || interaction.pointerId !== event.pointerId) {
      return;
    }

    if (interaction.mode === "move-stars") {
      mapEditorStore.moveStars(
        Object.entries(previewPositions).map(([id, point]) => ({
          id,
          x: point.x,
          y: point.y,
        })),
      );
    } else if (interaction.mode === "paint-stars" && interaction.paintedStarIds.length > 0) {
      mapEditorStore.finalizeTransientEdit();
    } else if (interaction.mode === "box-select") {
      const dragPx = Math.max(
        Math.abs(interaction.screenCurrent.x - interaction.screenOrigin.x),
        Math.abs(interaction.screenCurrent.y - interaction.screenOrigin.y),
      );
      if (dragPx < 6) {
        if (!interaction.append) {
          mapEditorStore.clearSelection();
        }
      } else {
        const boxStarIds = starIdsInRect(interaction.origin, interaction.current);
        mapEditorStore.setSelection({
          starIds: interaction.append
            ? Array.from(new Set([...mapEditorStore.selection.starIds, ...boxStarIds]))
            : boxStarIds,
          laneIds: [],
          measurementIds: [],
        });
      }
    }

    previewPositions = {};
    selectionBox = null;
    interaction = null;
    hoverPoint = null;
  }

  function measurementPreview() {
    if (mapEditorStore.tool !== "measure" || !mapEditorStore.draftMeasurementStart || !hoverPoint) {
      return null;
    }
    return {
      start: mapEditorStore.draftMeasurementStart,
      end: buildAnchor(hoverPoint),
    };
  }

  function handleContextMenu(event: MouseEvent) {
    if (!canvasEl) return;
    if (mapEditorStore.tool === "measure") {
      event.preventDefault();
      contextMenu = null;
      mapEditorStore.cancelDraftInteractions();
      return;
    }

    if (mapEditorStore.tool === "connect-lane") {
      event.preventDefault();
      contextMenu = null;
      const world = screenToWorld(event.clientX, event.clientY);
      const star = findStarAt(world);
      if (star) {
        mapEditorStore.cancelDraftInteractions();
        mapEditorStore.removeLatestLaneForStar(star.id);
        mapEditorStore.selectStar(star.id);
        return;
      }

      mapEditorStore.cancelDraftInteractions();
      return;
    }

    const world = screenToWorld(event.clientX, event.clientY);
    const star = findStarAt(world);
    const laneHit = star ? null : findLaneAt(world);
    const lane = laneHit
      ? mapEditorStore.document.connections.find((entry) => entry.id === laneHit.laneId) ?? null
      : null;
    if (!star && !lane) {
      contextMenu = null;
      return;
    }

    event.preventDefault();
    const rect = canvasEl.getBoundingClientRect();

    if (star) {
      mapEditorStore.selectStar(star.id);
      contextMenu = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        kind: "star",
        id: star.id,
        label: star.id,
      };
      return;
    }

    if (lane) {
      mapEditorStore.selectLane(lane.id);
      contextMenu = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        kind: "lane",
        id: lane.id,
        label: `${lane.sourceId} to ${lane.targetId}`,
      };
    }
  }

  function deleteContextTarget() {
    if (!contextMenu) return;
    if (contextMenu.kind === "star") {
      mapEditorStore.selectStar(contextMenu.id);
    } else {
      mapEditorStore.selectLane(contextMenu.id);
    }
    mapEditorStore.deleteSelection();
    contextMenu = null;
  }
</script>

<svelte:window onkeydown={handleWindowKeyDown} onkeyup={handleWindowKeyUp} />

<div class="canvas-shell">
  <svg
    bind:this={canvasEl}
    class="editor-canvas"
    viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
    role="application"
    aria-label="Custom map editor canvas"
    onwheel={handleWheel}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={endInteraction}
    onpointercancel={endInteraction}
    oncontextmenu={handleContextMenu}
  >
    <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="rgba(2, 6, 23, 0.96)" />

    <g transform={`translate(${mapEditorStore.viewport.panX} ${mapEditorStore.viewport.panY}) scale(${mapEditorStore.viewport.zoom})`}>
      <rect
        x="0"
        y="0"
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        rx="24"
        fill="rgba(4, 8, 18, 0.9)"
        stroke="rgba(148,165,184,0.18)"
        stroke-width="2"
      />

      {#each hexCells as hex}
        <polygon
          class="hex-cell"
          points={buildGameBoardHexPointsAt(hex.x, hex.y, mapEditorStore.hexRadius * 0.95)}
        />
      {/each}

      {#each mapEditorStore.document.connections as lane}
        {@const points = lanePoints(lane.id)}
        {#if points.length >= 2}
          <polyline
            points={points.map((point) => `${point.x},${point.y}`).join(" ")}
            class:selected={mapEditorStore.selection.laneIds.includes(lane.id)}
            class:error={issueIds.errorIds.has(lane.id)}
            class:warning={issueIds.warningIds.has(lane.id)}
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
          <polyline
            points={points.map((point) => `${point.x},${point.y}`).join(" ")}
            class="lane-hit"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
        {/if}
      {/each}

      {#each mapEditorStore.document.measurements ?? [] as measurement}
        <g class="measurement" class:selected={mapEditorStore.selection.measurementIds.includes(measurement.id)}>
          <line
            x1={measurement.start.x}
            y1={measurement.start.y}
            x2={measurement.end.x}
            y2={measurement.end.y}
          />
          <text
            x={(measurement.start.x + measurement.end.x) * 0.5}
            y={(measurement.start.y + measurement.end.y) * 0.5 - 12}
            role="button"
            tabindex="0"
            aria-label={`Select measurement ${measurement.label || measurement.relatedLaneLabel || measurement.starPairLabel || measurement.id}`}
            onpointerdown={(event) => handleMeasurementPointerDown(event, measurement.id)}
            onkeydown={(event) => handleMeasurementKeyDown(event, measurement.id)}
          >
            {measurement.label || measurement.relatedLaneLabel || measurement.starPairLabel || measurement.id}
          </text>
        </g>
      {/each}

      {#each measurementPreviewItems as preview}
        <line
          class="measurement-preview"
          x1={preview.start.x}
          y1={preview.start.y}
          x2={preview.end.x}
          y2={preview.end.y}
        />
      {/each}

      {#each mapEditorStore.document.stars as star}
        {@const point = getRenderedPoint(star.id)}
        {@const starTypeMeta = getStarTypeMeta(star.starType)}
        {@const isPortalStar = star.starType === "portal"}
        {@const portalColor = getPortalGroupCssColor(star.portalGroup)}
        {@const portalLabel = getPortalGroupLabel(star.portalGroup)}
        {@const ownerColor = getAdjustedOwnerColor(star.ownerId)}
        {@const ownerHaloColor = getAdjustedOwnerColor(star.ownerId, Math.max(0.16, ownerColorAlpha * 0.28))}
        {@const ownerBadge = getOwnerBadgeLabel(star.ownerId)}
        {#if point}
          <g class="star-node" transform={`translate(${point.x} ${point.y})`}>
            <circle
              r={ownerRingRadius + ownerRingThickness * 1.4}
              class="owner-halo"
              fill={ownerHaloColor}
            />
            <circle
              r="18"
              class:selected={mapEditorStore.selection.starIds.includes(star.id)}
              class:error={issueIds.errorIds.has(star.id)}
              class:warning={issueIds.warningIds.has(star.id)}
              class="star-shell"
              fill="rgba(7, 12, 24, 0.92)"
            />
            <circle
              r={ownerRingRadius}
              class="star-owner"
              stroke={ownerColor}
              stroke-width={ownerRingThickness}
            />
            {#if isPortalStar}
              <circle class="portal-shell" r="12.5" fill="rgba(2, 6, 23, 0.98)" stroke={portalColor} stroke-width="3.2" />
              <circle class="portal-core" r="7" fill="rgba(1, 4, 12, 0.98)" />
              <path class="portal-swirl" d="M -10 -1.4 C -6.5 -8.8 5.8 -9.5 10 -1.2" stroke={portalColor} />
              <path class="portal-swirl portal-swirl--inner" d="M -8.5 5 C -2.5 10 6.6 8.6 9.2 1.2" stroke={portalColor} />
              <text y="4.4" class="portal-group-label" fill={portalColor}>{portalLabel}</text>
            {:else if starTypeMeta.sides > 0}
              <polygon
                class="star-shape"
                points={buildPolygonPointsAt(0, 0, 11, starTypeMeta.sides)}
                fill={starTypeMeta.color}
              />
            {:else}
              <circle class="star-shape" r="10" fill={starTypeMeta.color} />
            {/if}
            <g class="owner-badge">
              <rect x="-13" y="14" width="26" height="16" rx="8" fill="rgba(2, 6, 23, 0.92)" />
              <text y="25" class="owner-badge__text" fill={ownerColor}>{ownerBadge}</text>
            </g>
            <text y="38">{star.id}</text>
            <text y="-28" class="ships-label">{star.activeShips ?? 0}</text>
          </g>
        {/if}
      {/each}

      {#if mapEditorStore.draftLaneSourceId}
        {@const draftStar = getRenderedPoint(mapEditorStore.draftLaneSourceId)}
        {#if draftStar}
          <circle class="draft-source" cx={draftStar.x} cy={draftStar.y} r="28" />
        {/if}
      {/if}

      {#if selectionBox}
        <rect
          class="selection-box"
          x={selectionBox.x}
          y={selectionBox.y}
          width={selectionBox.width}
          height={selectionBox.height}
          rx="10"
        />
      {/if}
    </g>
  </svg>

  {#if contextMenu}
    <div
      class="context-menu"
      style={`left:${contextMenu.x}px; top:${contextMenu.y}px;`}
    >
      <div class="context-menu__label">{contextMenu.label}</div>
      <button type="button" class="context-menu__action" onclick={deleteContextTarget}>
        Delete {contextMenu.kind === "star" ? "Star" : "Lane"}
      </button>
    </div>
  {/if}
</div>

<style>
  .canvas-shell {
    position: absolute;
    inset: 0;
    min-height: 0;
    height: 100%;
    border-radius: 28px;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    border: 1px solid rgba(148, 163, 184, 0.2);
    background:
      radial-gradient(circle at top, rgba(56, 189, 248, 0.14), transparent 40%),
      linear-gradient(180deg, rgba(2, 6, 23, 0.96), rgba(3, 7, 18, 0.92));
  }

  .editor-canvas {
    width: 100%;
    height: 100%;
    min-height: 0;
    display: block;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    cursor: crosshair;
  }

  .context-menu {
    position: absolute;
    z-index: 4;
    min-width: 160px;
    padding: 10px;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.24);
    background: rgba(2, 6, 23, 0.96);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.34);
    backdrop-filter: blur(12px);
  }

  .context-menu__label {
    margin-bottom: 8px;
    color: rgba(226, 232, 240, 0.92);
    font-family: var(--pax-ui-font-data);
    font-size: 11px;
  }

  .context-menu__action {
    width: 100%;
    min-height: 38px;
    border-radius: 10px;
    border: 1px solid rgba(248, 113, 113, 0.3);
    background: rgba(127, 29, 29, 0.52);
    color: rgba(254, 226, 226, 0.96);
    font: inherit;
    font-size: 0.86rem;
    cursor: pointer;
  }

  polyline {
    stroke: rgba(148, 163, 184, 0.65);
    stroke-width: 4;
  }

  polyline.selected {
    stroke: rgba(96, 165, 250, 0.95);
    stroke-width: 6;
  }

  polyline.error {
    stroke: rgba(248, 113, 113, 0.94);
  }

  polyline.warning {
    stroke-dasharray: 18 12;
  }

  .hex-cell {
    fill: rgba(8, 15, 31, 0.24);
    stroke: rgba(71, 85, 105, 0.34);
    stroke-width: 1.2;
  }

  .lane-hit {
    stroke: transparent;
    stroke-width: 18;
  }

  .owner-halo {
    opacity: 1;
  }

  .star-shell {
    fill: rgba(7, 12, 24, 0.92);
  }

  .star-node circle {
    stroke: rgba(226, 232, 240, 0.18);
    stroke-width: 2;
    transition: stroke 0.12s ease, transform 0.12s ease;
  }

  .star-node circle.selected {
    stroke: rgba(125, 211, 252, 1);
    stroke-width: 4;
  }

  .star-node circle.error {
    stroke: rgba(248, 113, 113, 1);
  }

  .star-node circle.warning {
    stroke-dasharray: 10 8;
  }

  .star-owner {
    fill: none;
    opacity: 0.9;
  }

  .portal-shell {
    filter: drop-shadow(0 0 10px rgba(15, 23, 42, 0.7));
  }

  .portal-core {
    opacity: 0.98;
  }

  .portal-swirl {
    fill: none;
    stroke-width: 1.8;
    stroke-linecap: round;
    opacity: 0.92;
  }

  .portal-swirl--inner {
    stroke-width: 1.5;
    opacity: 0.72;
  }

  .portal-group-label {
    font-family: var(--pax-ui-font-ui);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .owner-badge__text {
    font-family: var(--pax-ui-font-ui);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .star-shape {
    stroke: rgba(255, 255, 255, 0.6);
    stroke-width: 1.1;
  }

  .star-node text {
    fill: rgba(226, 232, 240, 0.95);
    font-family: var(--pax-ui-font-data);
    font-size: 11px;
    text-anchor: middle;
    pointer-events: none;
  }

  .ships-label {
    fill: rgba(250, 204, 21, 0.95);
    font-weight: 700;
  }

  .measurement line,
  .measurement-preview {
    stroke: rgba(250, 204, 21, 0.92);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 14 10;
  }

  .measurement.selected line {
    stroke: rgba(253, 224, 71, 1);
    stroke-width: 4;
  }

  .measurement text {
    fill: rgba(253, 224, 71, 0.94);
    font-family: var(--pax-ui-font-data);
    font-size: 12px;
    text-anchor: middle;
    cursor: pointer;
    user-select: none;
  }

  .draft-source {
    fill: none;
    stroke: rgba(96, 165, 250, 0.9);
    stroke-width: 3;
    stroke-dasharray: 12 10;
  }

  .selection-box {
    fill: rgba(56, 189, 248, 0.12);
    stroke: rgba(125, 211, 252, 0.94);
    stroke-width: 2;
    stroke-dasharray: 10 8;
  }

  :global(.canvas-shell) {
    --star-grey: #94a3b8;
    --star-yellow: #facc15;
    --star-blue: #60a5fa;
    --star-purple: #c084fc;
    --star-red: #f87171;
    --star-green: #4ade80;
  }
</style>
