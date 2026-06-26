<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { pushStateCompat as pushState } from "$lib/utils/navigationCompat";
  import { goto } from "$app/navigation";
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import { modalDismiss } from "$lib/actions/modalDismiss";
  import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
  import { selectedStarStore } from "$lib/stores/selectedStarStore.svelte";
  import { multiplayerStore } from "$lib/stores/multiplayerStore.svelte";
  import MainMenu, { type MenuTheme } from "$lib/components/ui/main-menu";
  import {
    HudIcon,
    Leaderboard,
    ResultsModal,
    SpeedControls,
    StarInfoPanel,
    StarNav,
    StarsPanel,
    StatusBar,
  } from "$lib/components/ui/hud";
  import {
    BottomCommandBar,
    GameSpeedPanel,
    HudTopbar,
    PlayerStandingsPanel,
    QuickAccessDock,
    SelectedStarPanel,
    SettingsRibbon,
    buildPlayerStandings,
    buildSelectedStarViewModel,
    type BottomCommandBarAction,
    type QuickAccessAction,
  } from "$lib/components/game-hud";
  import GameCanvas from "$lib/components/game/GameCanvas.svelte";
  import AudioSettings from "$lib/components/ui/AudioSettings.svelte";
  import {
    PaxHudButton,
    PaxHudIconButton,
    paxThemeState,
  } from "$lib/design-system";
  import type { SettingsSectionId } from "$lib/components/ui/settings/settingsRegistry";
  import type { PlayerState, StarState } from "$lib/types/game.types";
  import { audioManager } from "$lib/services/audioManager.svelte";
  import { authoredMeasurementsUi } from "$lib/territory/devtools/authoredMeasurementsUi";
  import { hydrateConfigFromPersistedUiSettings } from "$lib/components/ui/panelSync";
  import { pushHomeRouteDiagEvent } from "$lib/utils/homeRouteDiagnostics";
  import { GAME_CONFIG } from "$lib/config/game.config";
  import {
    applyTopbarTerritoryModeShortcut,
    getTopbarTerritoryModeOptions,
  } from "$lib/territory/ui/territoryModeShortcuts";

  if (typeof window !== "undefined") {
    hydrateConfigFromPersistedUiSettings();
  }

  let gameCanvasRef: any = $state(null);

  $effect(() => {
    paxThemeState.hydrate();
    paxThemeState.applyToDocument(false);
  });

  let roomIdCopied = $state(false);
  function copyRoomId() {
    if (multiplayerStore.roomId) {
      navigator.clipboard.writeText(multiplayerStore.roomId);
      roomIdCopied = true;
      setTimeout(() => (roomIdCopied = false), 1500);
    }
  }

  function loadMenuTheme(): MenuTheme {
    if (typeof localStorage === "undefined") return "imperial";
    const stored = localStorage.getItem("pax-fluxia-menuTheme");
    if (!stored) return "imperial";
    try {
      const parsed = JSON.parse(stored);
      return parsed === "imperial" || parsed === "neon" || parsed === "mythic"
        ? parsed
        : "imperial";
    } catch {
      return "imperial";
    }
  }

  // ── Panel visibility states ──
  let menuTheme = $state<MenuTheme>(loadMenuTheme());
  let showAudioSettings = $state(false);
  let showSurrenderModal = $state(false);
  let showRestartConfirm = $state(false);
  let showStarInfoPanel = $state(
    typeof localStorage !== "undefined" &&
      localStorage.getItem("pax-show-star-info") === "true",
  );

  // ── Settings panel toggle (secondary column) ──
  // On mobile (<1024px), always start closed regardless of localStorage
  const isMobileAtLoad =
    typeof window !== "undefined" && window.innerWidth < 1024;
  let isMobileNow = $state(isMobileAtLoad);

  type DockSide = "left" | "right";

  function loadBooleanPreference(key: string, fallback: boolean): boolean {
    if (typeof localStorage === "undefined") return fallback;
    const value = localStorage.getItem(key);
    if (value == null) return fallback;
    return value === "true";
  }

  function loadDockSidePreference(key: string, fallback: DockSide): DockSide {
    if (typeof localStorage === "undefined") return fallback;
    const value = localStorage.getItem(key);
    return value === "left" || value === "right" ? value : fallback;
  }

  // Track mobile state reactively for FAB visibility
  if (typeof window !== "undefined") {
    window.addEventListener("resize", () => {
      isMobileNow = window.innerWidth < 1024;
    });
  }

  let showSettingsPanel = $state(
    // Settings ribbon is a permanent fixture on desktop (no hide toggle).
    !isMobileAtLoad,
  );
  let sidebarSide = $state<DockSide>(
    loadDockSidePreference("pax-sidebar-side", "right"),
  );
  let controlsSide = $state<DockSide>(
    loadDockSidePreference("pax-controls-side", "left"),
  );
  let leaderboardCollapsed = $state(
    loadBooleanPreference("pax-leaderboard-collapsed", false),
  );
  let settingsRibbonExpanded = $state(
    loadBooleanPreference("pax-settings-ribbon-expanded", true),
  );
  // Auto-pause: pause game when settings open, restore on close
  let pauseOnSettings = $state(
    typeof localStorage === "undefined" ||
      localStorage.getItem("pax-pause-on-settings") !== "false",
  ); // Default: ON

  function setSettingsPanelOpen(nextOpen: boolean) {
    if (showSettingsPanel === nextOpen) return;
    showSettingsPanel = nextOpen;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("pax-settings-open", String(showSettingsPanel));
    }
    // Opening settings pauses the game so you can read it; closing never
    // auto-resumes. Resuming is always a deliberate player action, so toggling
    // the settings panel can no longer unpause the game.
    if (
      pauseOnSettings &&
      activeGameStore.phase === "playing" &&
      showSettingsPanel &&
      !activeGameStore.isPaused
    ) {
      activeGameStore.pauseGame();
    }
  }

  function toggleSettingsPanel() {
    setSettingsPanelOpen(!showSettingsPanel);
  }

  function toggleSidebarSide() {
    sidebarSide = sidebarSide === "right" ? "left" : "right";
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("pax-sidebar-side", sidebarSide);
    }
  }

  function toggleControlsSide() {
    controlsSide = controlsSide === "right" ? "left" : "right";
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("pax-controls-side", controlsSide);
    }
  }

  function toggleSettingsRibbonExpanded() {
    settingsRibbonExpanded = !settingsRibbonExpanded;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        "pax-settings-ribbon-expanded",
        String(settingsRibbonExpanded),
      );
    }
  }

  function toggleLeaderboardCollapsed() {
    leaderboardCollapsed = !leaderboardCollapsed;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        "pax-leaderboard-collapsed",
        String(leaderboardCollapsed),
      );
    }
  }

  function openAudioSettings() {
    menuTheme = loadMenuTheme();
    showAudioSettings = true;
  }

  // ── F-62: Results overlay dismiss ──
  let resultsDismissed = $state(false);

  const showResults = $derived(
    !resultsDismissed &&
      (gameStore.winner != null || activeGameStore.phase === "results"),
  );

  // ── Theme system (in right sidebar) ──
  // All theme state is now in the shared themeStore

  if (typeof window !== "undefined") {
    window.addEventListener("pax-star-info-toggle", ((e: CustomEvent) => {
      showStarInfoPanel = e.detail;
    }) as EventListener);

    // F hotkey — fit game to viewport
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        // Don't trigger if user is typing in an input
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        gameCanvasRef?.centerAndFit?.();
      }
    });
  }

  // ── Resizable sidebar (F-53) ──
  const SIDEBAR_STORAGE_KEY = "pax-sidebar-width";
  const SIDEBAR_MIN = 340;
  const SIDEBAR_MAX = 600;
  const SIDEBAR_DEFAULT = 390;
  const SETTINGS_PANEL_STORAGE_KEY = "pax-settings-panel-width";
  const SETTINGS_PANEL_MIN = 420;
  const SETTINGS_PANEL_MAX = 720;
  const SETTINGS_PANEL_DEFAULT = 520;
  const SETTINGS_CHROME_COMPACT_WIDTH = 68;
  const SETTINGS_CHROME_EXPANDED_WIDTH = 216;
  // Matches .pf-settings-ribbon's 12px horizontal padding on each side.
  const SETTINGS_CHROME_OUTER_PADDING_X = 24;
  const SETTINGS_PANEL_SECTION_DEFAULT = 640;

  function loadSidebarWidth(): number {
    if (typeof localStorage === "undefined") return SIDEBAR_DEFAULT;
    const v = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (v) {
      const n = parseInt(v);
      if (!isNaN(n)) return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, n));
    }
    return SIDEBAR_DEFAULT;
  }

  function loadSettingsPanelWidth(): number {
    if (typeof localStorage === "undefined") return SETTINGS_PANEL_DEFAULT;
    const v = localStorage.getItem(SETTINGS_PANEL_STORAGE_KEY);
    if (v) {
      const n = parseInt(v);
      if (!isNaN(n)) {
        return Math.max(SETTINGS_PANEL_MIN, Math.min(SETTINGS_PANEL_MAX, n));
      }
    }
    return SETTINGS_PANEL_DEFAULT;
  }

  let sidebarWidth = $state(loadSidebarWidth());
  let isResizing = $state(false);
  let settingsPanelWidth = $state(loadSettingsPanelWidth());
  let isSettingsResizing = $state(false);
  let settingsHasOpenSections = $state(false);
  let forceOpenSettingsSection = $state<SettingsSectionId | null>(null);
  let forceOpenSettingsSectionNonce = $state(0);

  const settingsChromeWidth = $derived(
    (settingsRibbonExpanded
      ? SETTINGS_CHROME_EXPANDED_WIDTH
      : SETTINGS_CHROME_COMPACT_WIDTH) + SETTINGS_CHROME_OUTER_PADDING_X,
  );
  const settingsEffectiveWidth = $derived(
    settingsHasOpenSections ? settingsPanelWidth : settingsChromeWidth,
  );

  function setSettingsSectionActivity(hasOpenSections: boolean) {
    settingsHasOpenSections = hasOpenSections;
    if (
      hasOpenSections &&
      settingsPanelWidth < SETTINGS_PANEL_SECTION_DEFAULT
    ) {
      settingsPanelWidth = SETTINGS_PANEL_SECTION_DEFAULT;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          SETTINGS_PANEL_STORAGE_KEY,
          String(settingsPanelWidth),
        );
      }
    }
  }

  function revealSettingsSection(section: SettingsSectionId) {
    forceOpenSettingsSection = section;
    forceOpenSettingsSectionNonce += 1;
  }

  function openSettingsSection(section: SettingsSectionId) {
    setSettingsPanelOpen(true);
    if (settingsPanelWidth < SETTINGS_PANEL_SECTION_DEFAULT) {
      settingsPanelWidth = SETTINGS_PANEL_SECTION_DEFAULT;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          SETTINGS_PANEL_STORAGE_KEY,
          String(settingsPanelWidth),
        );
      }
    }
    revealSettingsSection(section);
  }

  function openDiagnostics() {
    openSettingsSection("diagnostics");
  }

  function startResize(e: PointerEvent) {
    e.preventDefault();
    isResizing = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    function onMove(ev: PointerEvent) {
      const delta =
        sidebarSide === "right" ? startX - ev.clientX : ev.clientX - startX;
      sidebarWidth = Math.max(
        SIDEBAR_MIN,
        Math.min(SIDEBAR_MAX, startWidth + delta),
      );
    }

    function onUp() {
      isResizing = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth));
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startSettingsResize(e: PointerEvent) {
    e.preventDefault();
    isSettingsResizing = true;
    const startX = e.clientX;
    const startWidth = settingsPanelWidth;

    function onMove(ev: PointerEvent) {
      const delta =
        controlsSide === "right" ? startX - ev.clientX : ev.clientX - startX;
      settingsPanelWidth = Math.max(
        SETTINGS_PANEL_MIN,
        Math.min(SETTINGS_PANEL_MAX, startWidth + delta),
      );
    }

    function onUp() {
      isSettingsResizing = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          SETTINGS_PANEL_STORAGE_KEY,
          String(settingsPanelWidth),
        );
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // Derived leaderboard
  const leaderboardPlayers = $derived.by(() => {
    const players = activeGameStore.players as PlayerState[];
    return [...players]
      .filter((p: PlayerState) => !p.isEliminated)
      .sort(
        (a: PlayerState, b: PlayerState) =>
          (b.totalShips ?? 0) - (a.totalShips ?? 0),
      );
  });

  const playerStandings = $derived(
    buildPlayerStandings(
      leaderboardPlayers,
      activeGameStore.localPlayerId ?? undefined,
    ),
  );

  const selectedStarView = $derived(
    buildSelectedStarViewModel(
      selectedStarStore.id,
      activeGameStore.stars as StarState[],
      activeGameStore.players as PlayerState[],
      activeGameStore.localPlayerId ?? undefined,
    ),
  );

  const localPlayerForHud = $derived.by(() => {
    const localId = activeGameStore.localPlayerId;
    return (
      (activeGameStore.players as PlayerState[]).find((player) => {
        const sessionId = (player as PlayerState & { sessionId?: string })
          .sessionId;
        return player.id === localId || sessionId === localId;
      }) ?? null
    );
  });

  const ownedStarIds = $derived.by(() => {
    const ownerId = localPlayerForHud?.id;
    if (!ownerId) return [] as string[];
    return (activeGameStore.stars as StarState[])
      .filter((star) => star.ownerId === ownerId)
      .map((star) => star.id)
      .sort((left, right) => {
        const leftNum = Number(left.replace(/^star-/, ""));
        const rightNum = Number(right.replace(/^star-/, ""));
        if (Number.isFinite(leftNum) && Number.isFinite(rightNum)) {
          return leftNum - rightNum;
        }
        return left.localeCompare(right);
      });
  });

  function focusOwnedStar(direction: -1 | 1) {
    if (ownedStarIds.length === 0) return;
    const currentIndex = selectedStarStore.id
      ? ownedStarIds.indexOf(selectedStarStore.id)
      : -1;
    const fallbackIndex = direction > 0 ? 0 : ownedStarIds.length - 1;
    const nextIndex =
      currentIndex >= 0
        ? (currentIndex + direction + ownedStarIds.length) % ownedStarIds.length
        : fallbackIndex;
    const nextStarId = ownedStarIds[nextIndex];
    selectedStarStore.select(nextStarId);
    gameCanvasRef?.navigateToStar?.(nextStarId);
  }

  // ── Mobile drawer (icon-activated, no swipe) ──
  let mobileDrawerOpen = $state(false);
  let showSettingsFab = $state(false);
  let showExitConfirm = $state(false);
  let lastShellViewKey = "";
  const topbarTerritoryModeOptions = getTopbarTerritoryModeOptions();
  let topbarActiveTerritoryModeId = $state(GAME_CONFIG.TERRITORY_RENDER_MODE);
  const quickAccessActions = $derived.by((): QuickAccessAction[] => {
    const actions: QuickAccessAction[] = [];

    if (activeGameStore.mapDiagnostics.measurements.length > 0) {
      actions.push({
        id: "measure",
        icon: "measure",
        title: $authoredMeasurementsUi.visible
          ? "Hide map measurements"
          : "Show map measurements",
        active: $authoredMeasurementsUi.visible,
        onClick: () => authoredMeasurementsUi.toggle(),
      });
    }

    return actions;
  });

  const bottomCommandBarActions = $derived.by((): BottomCommandBarAction[] => [
    {
      id: "map",
      icon: "map-location",
      label: "Map",
      title: "Fit map to screen",
      onClick: () => gameCanvasRef?.centerAndFit?.(),
    },
    {
      id: "players",
      icon: "ranking-star",
      label: "Players",
      title: leaderboardCollapsed
        ? "Show player standings"
        : "Collapse player standings",
      active: !leaderboardCollapsed,
      onClick: toggleLeaderboardCollapsed,
    },
    {
      id: "overlays",
      icon: "overlay-legend",
      label: "Overlays",
      title: "Open appearance and map overlay controls",
      active: showSettingsPanel && forceOpenSettingsSection === "map_options",
      onClick: () => openSettingsSection("map_options"),
    },
    {
      id: "settings",
      icon: "settings",
      label: "Settings",
      title: showSettingsPanel
        ? "Collapse settings rail"
        : "Open settings rail",
      active: showSettingsPanel,
      onClick: toggleSettingsPanel,
    },
    {
      id: "view",
      icon: "fit-view",
      label: "View",
      title: "Fit map to screen",
      // Identical to the Star View fit button (StarNav onCenterFit): always
      // center+fit the whole map. Previously this branched to navigateToStar
      // whenever a star was selected, so the fit/maximize icon zoomed *into*
      // the selected star instead of fitting the map.
      onClick: () => gameCanvasRef?.centerAndFit?.(),
    },
  ]);

  const leftRailWidth = $derived.by(() => {
    let width = 0;
    if (showSettingsPanel && controlsSide === "left") {
      width = Math.max(width, settingsEffectiveWidth);
    }
    if (!leaderboardCollapsed && sidebarSide === "left") {
      width = Math.max(width, sidebarWidth);
    }
    return width;
  });

  const rightRailWidth = $derived.by(() => {
    let width = 0;
    if (showSettingsPanel && controlsSide === "right") {
      width = Math.max(width, settingsEffectiveWidth);
    }
    if (!leaderboardCollapsed && sidebarSide === "right") {
      width = Math.max(width, sidebarWidth);
    }
    return width;
  });

  const quickAccessWidth = $derived(
    showSettingsPanel ? Math.min(settingsPanelWidth, 320) : 272,
  );

  // ── Back button navigation: close overlays instead of exiting ──
  // On mount we push a history entry so the (Android) back button fires popstate
  // and in-game states resolve "back" internally. At the top-level menu, back is
  // a genuine "leave the game" — we navigate to the real landing route (`/`),
  // since the game lives at its own `/play` route. Handlers are named and removed
  // on destroy so this trap never leaks onto the landing after we leave /play.
  function handleBackPopstate() {
    // Re-push to keep trapping the back button for in-game states.
    const trap = () => pushState("", { pax: "game" });

    // Close overlays in priority order
    if (showSettingsPanel) {
      trap();
      setSettingsPanelOpen(false);
      return;
    }
    if (mobileDrawerOpen) {
      trap();
      mobileDrawerOpen = false;
      return;
    }
    if (showAudioSettings) {
      trap();
      showAudioSettings = false;
      return;
    }
    if (showSurrenderModal) {
      trap();
      showSurrenderModal = false;
      return;
    }
    if (showResults && !resultsDismissed) {
      trap();
      resultsDismissed = true;
      return;
    }
    if (showExitConfirm) {
      trap();
      showExitConfirm = false;
      return;
    }
    // Nothing open — if game is active, show exit confirmation
    if (
      gameStore.currentView === "game" &&
      activeGameStore.phase === "playing"
    ) {
      trap();
      showExitConfirm = true;
      return;
    }
    // In game view but not playing — step back to the menu
    if (gameStore.currentView === "game") {
      trap();
      gameStore.setView("menu");
      return;
    }
    // Top-level menu with nothing open: a genuine "leave the game" back. Don't
    // re-trap — leave /play and return to the landing route. (On the dedicated
    // game host the home route just sends `/` back to /play.)
    if (gameStore.currentView === "menu") {
      // Leave /play for the landing. A plain push discards the shallow trap
      // entry (so there's no forward "landing shown at /play URL" glitch); the
      // real /play route entry stays in history for clean re-entry.
      void goto("/");
      return;
    }
    // Unknown view — keep trapping to be safe.
    trap();
  }

  // ── Exit confirmation: warn before closing tab during active game ──
  function handleGameBeforeUnload(e: BeforeUnloadEvent) {
    if (
      gameStore.currentView === "game" &&
      activeGameStore.phase === "playing"
    ) {
      e.preventDefault();
      // Modern browsers show their own message, this is just for compat
      e.returnValue =
        "You have an active game. Are you sure you want to leave?";
    }
  }

  if (typeof window !== "undefined") {
    // Push a trap entry ON TOP of the real /play route entry. Back pops to /play
    // (real route) where the in-game branches re-trap. We intentionally do NOT
    // replaceState the route entry into a shallow marker — keeping it real means
    // leaving to the landing and re-entering stay clean route navigations with
    // no shallow-state ("landing shown at /play URL") glitch.
    pushState("", { pax: "game" });
    window.addEventListener("popstate", handleBackPopstate);
    window.addEventListener("beforeunload", handleGameBeforeUnload);
  }

  function confirmExit() {
    showExitConfirm = false;
    gameStore.setView("menu");
  }
  function cancelExit() {
    showExitConfirm = false;
  }

  function handleTopbarTerritoryModeSelect(modeId: string) {
    topbarActiveTerritoryModeId = modeId;
    applyTopbarTerritoryModeShortcut(modeId);
  }

  $effect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("pax-fluxia-menuTheme", JSON.stringify(menuTheme));
      localStorage.setItem(
        "pax-settings-ribbon-expanded",
        String(settingsRibbonExpanded),
      );
    }
  });

  $effect(() => {
    if (typeof window === "undefined") return;
    (
      window as typeof window & { __PAX_GAME_CANVAS__?: unknown }
    ).__PAX_GAME_CANVAS__ = gameCanvasRef ?? null;
  });

  // Lock body scroll when in game view (landing page needs scroll)
  $effect(() => {
    if (typeof document !== "undefined") {
      if (gameStore.currentView === "game") {
        document.body.classList.add("game-active");
      } else {
        document.body.classList.remove("game-active");
      }
    }
  });

  $effect(() => {
    const viewKey = `${gameStore.currentView}:${activeGameStore.phase}`;
    if (viewKey === lastShellViewKey) return;
    lastShellViewKey = viewKey;
    pushHomeRouteDiagEvent("game_container_view_changed", {
      currentView: gameStore.currentView,
      phase: activeGameStore.phase,
    });
  });

  onMount(() => {
    pushHomeRouteDiagEvent("game_container_mounted", {
      currentView: gameStore.currentView,
      phase: activeGameStore.phase,
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pax-game-container-mounted"));
    }
  });

  onDestroy(() => {
    pushHomeRouteDiagEvent("game_container_unmounted", {
      currentView: gameStore.currentView,
      phase: activeGameStore.phase,
    });
    if (typeof document !== "undefined") {
      document.body.classList.remove("game-active");
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("popstate", handleBackPopstate);
      window.removeEventListener("beforeunload", handleGameBeforeUnload);
      window.dispatchEvent(new CustomEvent("pax-game-container-unmounted"));
    }
  });
</script>

<div class="app-container">
  <!-- The main menu has its own controls (MenuUtilityTopbar: Background / Audio /
       Mixer). The legacy fixed TopBar only rendered OUTSIDE the game, where its
       left/center content is gated off — leaving two stray Settings/"?" buttons
       floating over the menu (Settings opened an audio modal that isn't even
       mounted on the menu; "?" was a placeholder alert). Removed. In-game uses
       HudTopbar, which never rendered this TopBar. -->

  {#if gameStore.currentView === "menu"}
    <MainMenu />
  {:else if gameStore.currentView === "game"}
    <!-- Audio Settings Modal -->
    <AudioSettings
      visible={showAudioSettings}
      {menuTheme}
      onClose={() => (showAudioSettings = false)} />

    <div
      class="game-layout"
      data-pax-theme={paxThemeState.current}
      class:settings-open={showSettingsPanel}
      class:layout-sidebar-left={sidebarSide === "left"}
      class:layout-controls-left={controlsSide === "left"}
      style:--left-rail-width={`${leftRailWidth}px`}
      style:--right-rail-width={`${rightRailWidth}px`}
      style:--quick-access-width={`${quickAccessWidth}px`}>
      <div class="area-topbar">
        <HudTopbar
          settingsOpen={showSettingsPanel}
          standingsCollapsed={leaderboardCollapsed}
          players={playerStandings}
          selectedStar={selectedStarView}
          currentTick={activeGameStore.currentTick ?? 0}
          speed={activeGameStore.speed}
          isPaused={activeGameStore.isPaused}
          modeOptions={topbarTerritoryModeOptions}
          activeModeId={topbarActiveTerritoryModeId}
          onMenuClick={() => gameStore.setView("menu")}
          onSettingsClick={toggleSettingsPanel}
          onToggleStandings={toggleLeaderboardCollapsed}
          onModeSelect={handleTopbarTerritoryModeSelect} />
      </div>
      <!-- STATUSBAR (info display) -->
      <StatusBar
        players={leaderboardPlayers}
        localPlayerId={activeGameStore.localPlayerId ?? undefined}
        isMuted={audioManager.muted}
        onToggleMute={() => audioManager.toggleMute()}
        onToggleSettings={() => (showSettingsFab = !showSettingsFab)} />
      <!-- CANVAS AREA -->
      <div class="area-canvas">
        <GameCanvas bind:this={gameCanvasRef} />

        <!-- TOP CENTER: Room ID Badge (MP only) -->
        {#if multiplayerStore.isConnected && multiplayerStore.roomId}
          <div class="overlay-top-center">
            <PaxHudButton
              class="room-id-badge glass-panel w-full h-full"
              onclick={copyRoomId}
              title="Click to copy Room ID">
              <span class="room-id-label">ROOM</span>
              <code class="room-id-code">{multiplayerStore.roomId}</code>
              <span class="room-id-icon">
                <HudIcon name={roomIdCopied ? "focus" : "logging"} size={12} />
              </span>
            </PaxHudButton>
          </div>
        {/if}

        <!-- TOP LEFT: overlay panels -->
        <div class="overlay-top-left">
          {#if showStarInfoPanel}
            <StarInfoPanel />
          {/if}
        </div>

        <!-- F-62: Results overlay -->
        {#if showResults}
          <div
            class="modal-overlay"
            use:modalDismiss={() => (resultsDismissed = true)}>
            <ResultsModal onClose={() => (resultsDismissed = true)} />
          </div>
        {/if}

        <BottomCommandBar items={bottomCommandBarActions} />
      </div>

      <!-- MOBILE-ONLY: Bottom controls bar (hidden on desktop, shown by mobile media query) -->
      <div class="area-controls-bar">
        <section class="speed-card">
          <div class="speed-card__label">Gamespeed</div>
          <SpeedControls
            speed={activeGameStore.speed}
            isPaused={activeGameStore.isPaused}
            hasStarted={true}
            onSpeedChange={(speed) => activeGameStore.setSpeed(speed)}
            onPause={() => activeGameStore.pauseGame()}
            onResume={() => activeGameStore.resumeGame()}
            onStart={() => activeGameStore.startGame()} />
        </section>
        <StarNav
          stars={activeGameStore.stars ?? []}
          players={activeGameStore.players ?? []}
          localPlayerId={activeGameStore.localPlayerId ?? undefined}
          onNavigateToStar={(starId) => gameCanvasRef?.navigateToStar?.(starId)}
          onCenterFit={() => gameCanvasRef?.centerAndFit?.()} />
      </div>

      <!-- SECONDARY CONTROLS COLUMN (toggled by gear icon) -->
      {#if showSettingsPanel}
        <div
          class="area-controls"
          class:area-controls--dock-left={controlsSide === "left"}
          style:width={`${settingsEffectiveWidth}px`}>
          <SettingsRibbon
            width={settingsEffectiveWidth}
            dockSide={controlsSide}
            resizeActive={isSettingsResizing}
            ribbonExpanded={settingsRibbonExpanded}
            forceOpenSection={forceOpenSettingsSection}
            forceOpenSectionNonce={forceOpenSettingsSectionNonce}
            onResizePointerDown={startSettingsResize}
            onClose={() => setSettingsPanelOpen(false)}
            onToggleRibbonExpanded={toggleSettingsRibbonExpanded}
            onToggleDockSide={toggleControlsSide}
            onSectionActivityChange={setSettingsSectionActivity}
            onRestartGame={() => {
              audioManager.play("click");
              showRestartConfirm = true;
            }}
            onQuitGame={() => {
              audioManager.play("click");
              showSurrenderModal = true;
            }} />
        </div>
      {/if}

      <!-- RIGHT SIDEBAR (always visible) -->
      <div
        class="area-right"
        class:area-right--dock-left={sidebarSide === "left"}
        style:width={`${sidebarWidth}px`}>
        <!-- Resize handle -->
        <div
          class={`resize-handle ${isResizing ? "active" : ""}`}
          onpointerdown={startResize}
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize">
        </div>

        {#if !leaderboardCollapsed}
          <div class="sidebar-leaderboard">
            <PlayerStandingsPanel
              players={playerStandings}
              dockSide={sidebarSide}
              onToggleDockSide={toggleSidebarSide}
              onCollapse={toggleLeaderboardCollapsed}
              currentTick={activeGameStore.currentTick ?? 0} />
          </div>
        {/if}

        <div class="sidebar-quicktools">
          <div class="sidebar-controls">
            <GameSpeedPanel
              speed={activeGameStore.speed}
              isPaused={activeGameStore.isPaused}
              hasStarted={true}
              onSpeedChange={(speed) => activeGameStore.setSpeed(speed)}
              onPause={() => activeGameStore.pauseGame()}
              onResume={() => activeGameStore.resumeGame()}
              onStart={() => activeGameStore.startGame()} />
          </div>

          <div class="sidebar-starnav">
            <SelectedStarPanel
              star={selectedStarView}
              onCenterStar={(starId) => gameCanvasRef?.navigateToStar?.(starId)}
              onFitMap={() => gameCanvasRef?.centerAndFit?.()}
              onPreviousOwnedStar={() => focusOwnedStar(-1)}
              onNextOwnedStar={() => focusOwnedStar(1)}
              onCancelOrder={(starId) => activeGameStore.cancelOrder(starId)}
              canCycleOwnedStars={ownedStarIds.length > 0} />
          </div>
        </div>

        {#if quickAccessActions.length > 0}
          <div class="sidebar-quick-access">
            <QuickAccessDock actions={quickAccessActions} />
          </div>
        {/if}
      </div>
    </div>

    <!-- Surrender Confirmation Modal -->
    {#if showSurrenderModal}
      <div
        class="modal-overlay modal-overlay--fixed"
        role="dialog"
        aria-modal="true"
        use:modalDismiss={() => (showSurrenderModal = false)}>
        <div class="surrender-modal glass-panel">
          <h3 class="surrender-modal__title">Surrender?</h3>
          <p class="surrender-modal__desc">Choose how to end your campaign.</p>
          <div class="surrender-modal__actions">
            <div class="modal-action">
              <PaxHudButton
                class="btn btn--primary btn--md"
                onclick={() => {
                  showSurrenderModal = false;
                  activeGameStore.surrender();
                }}>
                End Game
              </PaxHudButton>
              <span class="modal-action__sub">View results & graphs</span>
            </div>
            <div class="modal-action">
              <PaxHudButton
                class="btn btn--ghost btn--md"
                onclick={() => {
                  showSurrenderModal = false;
                  activeGameStore.returnToMenu();
                }}>
                Abandon
              </PaxHudButton>
              <span class="modal-action__sub">Return to main menu</span>
            </div>
          </div>
          <PaxHudButton
            class="btn btn--ghost btn--sm surrender-modal__cancel"
            onclick={() => (showSurrenderModal = false)}>
            Cancel
          </PaxHudButton>
        </div>
      </div>
    {/if}

    <!-- Restart Confirmation Modal -->
    {#if showRestartConfirm}
      <div
        class="modal-overlay modal-overlay--fixed"
        role="dialog"
        aria-modal="true"
        use:modalDismiss={() => (showRestartConfirm = false)}>
        <div class="surrender-modal glass-panel">
          <h3 class="surrender-modal__title">Restart match?</h3>
          <p class="surrender-modal__desc">
            Your current in-progress game will be discarded and a new match
            started. This can't be undone.
          </p>
          <div class="surrender-modal__actions">
            <div class="modal-action">
              <PaxHudButton
                class="btn btn--primary btn--md"
                onclick={() => {
                  showRestartConfirm = false;
                  activeGameStore.playAgain();
                }}>
                Restart
              </PaxHudButton>
              <span class="modal-action__sub">Discard & start a new match</span>
            </div>
          </div>
          <PaxHudButton
            class="btn btn--ghost btn--sm surrender-modal__cancel"
            onclick={() => (showRestartConfirm = false)}>
            Cancel
          </PaxHudButton>
        </div>
      </div>
    {/if}

    <!-- Exit Confirmation Modal (back button during active game) -->
    {#if showExitConfirm}
      <div
        class="modal-overlay modal-overlay--fixed"
        role="dialog"
        aria-modal="true"
        use:modalDismiss={() => (showExitConfirm = false)}>
        <div class="surrender-modal glass-panel">
          <h3 class="surrender-modal__title">Leave Game?</h3>
          <p class="surrender-modal__desc">
            You'll lose your current game progress.
          </p>
          <div class="surrender-modal__actions">
            <div class="modal-action">
              <PaxHudButton
                class="btn btn--ghost btn--md"
                onclick={confirmExit}>
                Leave
              </PaxHudButton>
              <span class="modal-action__sub">Return to main menu</span>
            </div>
          </div>
          <PaxHudButton
            class="btn btn--ghost btn--sm surrender-modal__cancel"
            onclick={cancelExit}>
            Continue Playing
          </PaxHudButton>
        </div>
      </div>
    {/if}
  {/if}

  <!-- ═══ MOBILE CONTROL RIBBON + DRAWER (hidden on desktop) ═══ -->
  {#if gameStore.currentView === "game"}
    <!-- Menu popup (triggered by ☰ in controls bar) -->
    {#if showSettingsFab}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="fab-scrim" onclick={() => (showSettingsFab = false)}></div>
      <div class="fab-popup glass-panel">
        <PaxHudButton
          class="fab-item"
          onclick={() => {
            audioManager.play("click");
            openAudioSettings();
            showSettingsFab = false;
          }}>
          <span class="fab-icon"><HudIcon name="audio" size={14} /></span>
          <span>Audio Settings</span>
        </PaxHudButton>
        <PaxHudButton
          class="fab-item"
          onclick={() => {
            audioManager.play("click");
            toggleSettingsPanel();
            showSettingsFab = false;
          }}>
          <span class="fab-icon"><HudIcon name="settings" size={14} /></span>
          <span>{showSettingsPanel ? "Hide" : "Show"} Settings</span>
        </PaxHudButton>
        <PaxHudButton
          class="fab-item"
          onclick={() => {
            audioManager.play("click");
            openDiagnostics();
            showSettingsFab = false;
          }}>
          <span class="fab-icon"><HudIcon name="diagnostics" size={14} /></span>
          <span>Diagnostics</span>
        </PaxHudButton>
        <PaxHudButton
          class="fab-item"
          onclick={() => {
            audioManager.play("click");
            mobileDrawerOpen = !mobileDrawerOpen;
            showSettingsFab = false;
          }}>
          <span class="fab-icon"><HudIcon name="leaderboard" size={14} /></span>
          <span>Leaderboard</span>
        </PaxHudButton>
        <PaxHudButton
          class="fab-item"
          onclick={() => {
            audioManager.play("click");
            activeGameStore.playAgain();
            showSettingsFab = false;
          }}>
          <span class="fab-icon"><HudIcon name="restart" size={14} /></span>
          <span>Restart</span>
        </PaxHudButton>
        <PaxHudButton
          class="fab-item"
          onclick={() => {
            audioManager.play("click");
            showSurrenderModal = true;
            showSettingsFab = false;
          }}>
          <span class="fab-icon"><HudIcon name="quit" size={14} /></span>
          <span>Quit Game</span>
        </PaxHudButton>
      </div>
    {/if}

    <!-- Mobile drawer: leaderboard + theme management -->
    {#if mobileDrawerOpen}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="mobile-scrim" onclick={() => (mobileDrawerOpen = false)}>
      </div>
      <div class="mobile-drawer open">
        <PaxHudIconButton
          class="drawer-close"
          icon="close"
          title="Close"
          size={14}
          onclick={() => (mobileDrawerOpen = false)} />
        <div class="mobile-drawer-content">
          <div class="drawer-leaderboard">
            <Leaderboard players={leaderboardPlayers} />
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  /* Note: Global body styles were removed as they should be in app.css or layout */

  .app-container {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
  }

  /* ═══ GRID LAYOUT V8 ═══ */
  /* Default: Playfield | Tactical rail */
  /* Settings open: Ribbon | Playfield | Tactical rail */
  .game-layout {
    --game-hud-topbar-clearance: 0px;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: var(--pax-ui-topbar-height) minmax(0, 1fr);
    grid-template-areas:
      "topbar topbar"
      "playfield tactical";
    height: 100vh;
    height: 100dvh;
    width: 100vw;
  }

  .game-layout.settings-open {
    grid-template-columns: 1fr auto auto;
    grid-template-areas:
      "topbar topbar topbar"
      "playfield ribbon tactical";
  }

  .game-layout.layout-sidebar-left {
    grid-template-columns: auto 1fr;
    grid-template-areas:
      "topbar topbar"
      "tactical playfield";
  }

  .game-layout.layout-controls-left:not(.settings-open) {
    grid-template-areas:
      "topbar topbar"
      "playfield tactical";
  }

  .game-layout.layout-sidebar-left.layout-controls-left:not(.settings-open) {
    grid-template-areas:
      "topbar topbar"
      "tactical playfield";
  }

  .game-layout.settings-open.layout-controls-left:not(.layout-sidebar-left) {
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
      "topbar topbar topbar"
      "ribbon playfield tactical";
  }

  .game-layout.settings-open.layout-sidebar-left:not(.layout-controls-left) {
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
      "topbar topbar topbar"
      "tactical playfield ribbon";
  }

  .game-layout.settings-open.layout-sidebar-left.layout-controls-left {
    grid-template-columns: auto auto 1fr;
    grid-template-areas:
      "topbar topbar topbar"
      "tactical ribbon playfield";
  }

  .area-topbar {
    grid-area: topbar;
    min-width: 0;
    position: relative;
    z-index: 40;
  }

  .area-canvas {
    grid-area: playfield;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0; /* Prevents CSS Grid from expanding cell beyond available space */
    overflow: hidden;
    box-sizing: border-box;
  }

  /* Sidebar sections */
  .sidebar-quicktools {
    display: flex;
    flex-direction: column;
    gap: var(--pax-gap-sm);
    padding: 0;
    margin-bottom: var(--pax-gap-sm);
    flex: 1 1 auto;
    min-height: 0;
    border-radius: 0;
    border: none;
    background: transparent;
    box-shadow: none;
    overflow-y: auto;
    scrollbar-width: thin;
  }
  .sidebar-controls {
    padding: 0;
  }
  .sidebar-starnav {
    padding: 0;
  }
  /* Mobile controls bar: hidden on desktop */
  .area-controls-bar {
    display: none;
  }
  @media (max-width: 1024px) {
    .area-topbar {
      display: none !important;
    }

    /* ── Mobile portrait: 3-row grid ── */
    .game-layout {
      grid-template-columns: 1fr !important;
      grid-template-rows: auto 1fr auto;
      grid-template-areas:
        "statusbar"
        "playfield"
        "ribbon" !important;
    }
    .game-layout.settings-open {
      grid-template-columns: 1fr !important;
      grid-template-rows: auto 1fr auto;
      grid-template-areas:
        "statusbar"
        "playfield"
        "ribbon" !important;
    }
    .area-right {
      display: none !important;
    }
    /* Settings panel → fullscreen overlay on mobile */
    .area-controls {
      position: fixed !important;
      inset: 0 !important;
      z-index: 200 !important;
      display: flex !important;
      flex-direction: column !important;
      background: color-mix(
        in srgb,
        var(--pax-color-void) 95%,
        transparent
      ) !important;
      backdrop-filter: blur(12px) !important;
      overflow-y: auto !important;
      padding: var(--pax-space-3) !important;
      padding-top: var(--pax-space-12) !important;
    }
    /* Hide desktop-only overlays */
    .overlay-top-left,
    .overlay-top-center {
      display: none !important;
    }
    /* Controls bar fills bottom grid area */
    .area-controls-bar {
      display: flex;
      grid-area: ribbon;
      padding: var(--pax-gap-xs) var(--pax-space-2);
      padding-bottom: 4rem;
      background: color-mix(in srgb, var(--pax-color-void) 92%, transparent);
      backdrop-filter: blur(8px);
      border-top: 1px solid
        color-mix(in srgb, var(--pax-ui-text-strong) 8%, transparent);
    }
    .speed-card {
      flex-direction: row !important;
      gap: var(--pax-gap-xs);
      padding: var(--pax-gap-xs) var(--pax-space-2) !important;
      max-width: 100%;
      overflow: visible;
    }
    /* Fab popup positioned above controls bar */
    .fab-popup {
      bottom: calc(56px + env(safe-area-inset-bottom, 0px)) !important;
    }
  }

  /* ── Landscape mobile: statusbar left, playfield center, ribbon right ── */
  @media (max-width: 1024px) and (orientation: landscape) {
    .game-layout {
      grid-template-columns: 50px 1fr 56px !important;
      grid-template-rows: 1fr !important;
      grid-template-areas: "statusbar playfield ribbon" !important;
    }
    .game-layout.settings-open {
      grid-template-columns: 50px 1fr 56px !important;
      grid-template-rows: 1fr !important;
      grid-template-areas: "statusbar playfield ribbon" !important;
    }
    /* Controls bar as vertical right sidebar — tight fit */
    .area-controls-bar {
      flex-direction: column !important;
      padding: 2px 2px;
      border-top: none;
      border-left: 1px solid
        color-mix(in srgb, var(--pax-ui-text-strong) 8%, transparent);
      gap: var(--pax-space-1);
      overflow: visible;
      max-height: 100dvh;
      align-items: center !important;
      justify-content: flex-start !important;
    }
    /* Rotate tactical cards so they become thin vertical strips */
    .speed-card,
    .area-controls-bar :global(.star-nav-card) {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      flex-direction: row-reverse !important;
      padding: var(--pax-space-1) 2px !important;
      gap: 2px !important;
      margin: 0;
      border-width: 1px;
    }
    /* Counter-rotate button contents so icons are upright */
    .speed-card :global(.speed-btn),
    .area-controls-bar :global(.sn-btn) {
      writing-mode: horizontal-tb;
      transform: rotate(180deg);
    }
    /* Label text reads vertically */
    .speed-card__label,
    .area-controls-bar :global(.star-nav-card__eyebrow) {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-size: var(--pax-type-4xs);
      padding: 1px 0;
      letter-spacing: 0.08em;
    }

    /* Settings panel: fullscreen overlay in landscape */
    .area-controls {
      position: fixed !important;
      inset: 0 !important;
      z-index: 610 !important;
      margin: 0 !important;
      width: 100vw !important;
      max-width: 100vw !important;
      height: 100vh !important;
      overflow-y: auto !important;
      display: flex !important;
      flex-direction: column !important;
      background: color-mix(
        in srgb,
        var(--pax-color-void) 95%,
        transparent
      ) !important;
      backdrop-filter: blur(12px) !important;
      padding: var(--pax-space-3) !important;
      padding-top: var(--pax-space-12) !important;
    }
    .mobile-scrim {
      z-index: 599 !important;
    }
    /* Landscape drawer: horizontal layout */
    .mobile-drawer-content {
      flex-direction: row !important;
      align-items: flex-start !important;
      justify-content: center !important;
      padding: var(--pax-space-4) var(--pax-space-8) !important;
      gap: var(--pax-space-6) !important;
    }
    .drawer-leaderboard {
      max-width: 280px !important;
      flex-shrink: 0;
    }
  }

  /* ── Mobile-only elements (hidden on desktop) ── */
  .mobile-scrim {
    display: none;
  }
  .mobile-drawer {
    display: none;
  }

  @media (max-width: 1024px) {
    .area-controls-bar {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ── Scrim behind drawer ── */
    .mobile-scrim {
      display: block;
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, var(--pax-color-void) 50%, transparent);
      z-index: 490;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    /* ── Fullscreen drawer overlay (no scroll, fits viewport) ── */
    .mobile-drawer {
      display: flex;
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      height: 100dvh;
      background: color-mix(in srgb, var(--pax-color-void) 97%, transparent);
      backdrop-filter: blur(16px);
      z-index: 600;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }
    .mobile-drawer.open {
      opacity: 1;
      pointer-events: auto;
    }

    /* ✕ close button */
    :global(.drawer-close) {
      position: absolute;
      top: 12px;
      right: 16px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--pax-ui-text-strong) 6%, transparent);
      border: 1px solid
        color-mix(in srgb, var(--pax-ui-text-strong) 15%, transparent);
      border-radius: 50%;
      color: color-mix(in srgb, var(--pax-ui-text-strong) 80%, transparent);
      font-size: var(--pax-type-md);
      cursor: pointer;
      z-index: 610;
      transition: all 0.15s ease;
    }
    :global(.drawer-close:active) {
      background: color-mix(in srgb, var(--pax-ui-accent) 15%, transparent);
      color: var(--pax-ui-accent);
      border-color: color-mix(in srgb, var(--pax-ui-accent) 40%, transparent);
    }

    /* Content: flex column, centered, no scroll */
    .mobile-drawer-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      padding: 56px var(--pax-space-6) var(--pax-space-6); /* top padding clears close button */
      gap: var(--pax-space-3);
      overflow: visible;
    }

    /* Leaderboard wrapper: takes only the space it needs */
    .drawer-leaderboard {
      width: 100%;
      max-width: 400px;
    }

    /* ── Compact leaderboard inside drawer ── */
    .drawer-leaderboard :global(.leaderboard) {
      padding: var(--pax-space-2) var(--pax-gap-sm);
      min-width: unset;
    }
    .drawer-leaderboard :global(.leaderboard__header) {
      margin-bottom: var(--pax-space-1);
    }
    .drawer-leaderboard :global(.leaderboard__title) {
      font-size: var(--pax-type-label);
    }
    .drawer-leaderboard :global(.game-totals) {
      padding: 2px var(--pax-space-1);
      margin-bottom: 2px;
      font-size: var(--pax-type-label);
    }
    .drawer-leaderboard :global(.totals-total) {
      font-size: var(--pax-type-2xs);
    }
    .drawer-leaderboard :global(.tick-counter) {
      gap: var(--pax-space-1);
    }
    .drawer-leaderboard :global(.tick-label) {
      font-size: var(--pax-type-3xs);
    }
    .drawer-leaderboard :global(.tick-value) {
      font-size: var(--pax-type-md);
    }
    .drawer-leaderboard :global(.tick-progress-bar) {
      height: 3px;
      margin: 2px 0 var(--pax-space-1) 0;
    }
    .drawer-leaderboard :global(.leaderboard__list) {
      gap: 2px;
    }
    .drawer-leaderboard :global(.leaderboard__item) {
      padding: 3px var(--pax-gap-xs);
      gap: var(--pax-gap-xs);
      font-size: var(--pax-type-xs);
    }
    .drawer-leaderboard :global(.player-dot) {
      width: 8px;
      height: 8px;
    }
    .drawer-leaderboard :global(.player-dot--self) {
      width: 10px;
      height: 10px;
    }
    .drawer-leaderboard :global(.player-name) {
      font-size: var(--pax-type-xs);
    }
    .drawer-leaderboard :global(.player-stats) {
      font-size: var(--pax-type-label);
    }
    .drawer-leaderboard :global(.stat-total) {
      font-size: var(--pax-type-2xs);
      min-width: 2em;
    }
    .drawer-leaderboard :global(.stat-breakdown) {
      font-size: var(--pax-type-4xs);
      min-width: 2.5em;
    }
    .drawer-leaderboard :global(.stat-stars) {
      min-width: 2em;
    }
    .drawer-leaderboard :global(.stat-prod) {
      min-width: 2em;
    }

    /* Hide desktop-only elements on mobile */
    :global(.top-bar) {
      display: none !important;
    }
    :global(.help-fab),
    :global(.fit-fab) {
      display: none !important;
    }
  }

  /* ═══ CANVAS ═══ */
  .area-canvas {
    grid-area: playfield;
    position: relative;
    /* L1+L4: All background depth in one property — strong enough to be visible */
    background:
      /* L4: Nebula texture at low opacity via color-burn */
      url("/assets/nebula-bg.png") center/cover,
      /* L1: Nebula radial gradients — boosted intensity */
        radial-gradient(
          ellipse at 15% 25%,
          rgba(0, 100, 160, 0.2),
          transparent 50%
        ),
      radial-gradient(
        ellipse at 85% 75%,
        rgba(90, 15, 120, 0.15),
        transparent 50%
      ),
      radial-gradient(
        ellipse at 50% 10%,
        rgba(0, 80, 100, 0.12),
        transparent 60%
      ),
      radial-gradient(
        ellipse at 70% 40%,
        rgba(15, 50, 100, 0.1),
        transparent 50%
      ),
      radial-gradient(
        ellipse at 30% 80%,
        rgba(0, 60, 90, 0.12),
        transparent 55%
      ),
      radial-gradient(
        ellipse at 60% 60%,
        rgba(50, 10, 70, 0.08),
        transparent 45%
      ),
      #050510;
    /* L4: blend nebula image subtly into gradients */
    background-blend-mode: soft-light, normal, normal, normal, normal, normal,
      normal, normal;
    overflow: hidden;
    min-width: 0;
    min-height: 0;
  }

  @keyframes nebula-drift {
    0%,
    100% {
      filter: hue-rotate(0deg);
      opacity: 0.8;
    }
    33% {
      filter: hue-rotate(30deg);
      opacity: 0.9;
    }
    66% {
      filter: hue-rotate(-20deg);
      opacity: 0.7;
    }
  }

  /* ═══ SECONDARY CONTROLS COLUMN ═══ */
  .area-controls {
    grid-area: ribbon;
    position: relative;
    display: flex;
    flex-direction: column;
    z-index: 20;
    overflow: hidden;
    /* min-width: 280px; */
    flex-shrink: 0;
    /* Width is set via inline style:width (settingsEffectiveWidth) and changes on
       every state transition — ribbon expand/collapse, section open/close, dock
       switch. Animate it so those changes glide instead of snapping. */
    transition: width 0.22s ease;
  }

  .area-controls--dock-left {
    box-shadow: 5px 0 20px
      color-mix(in srgb, var(--pax-color-void) 32%, transparent);
  }

  /* ═══ RIGHT SIDEBAR ═══ */
  .area-right {
    grid-area: tactical;
    position: relative;
    background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--pax-color-void) 98%, transparent),
        color-mix(in srgb, var(--pax-color-void) 94%, transparent)
      ),
      radial-gradient(
        circle at top,
        color-mix(in srgb, var(--pax-ui-accent-warm) 7%, transparent),
        transparent 50%
      );
    border-left: 1px solid var(--pax-ui-divider);
    display: flex;
    flex-direction: column;
    padding: var(--pax-space-3) var(--pax-space-3) var(--pax-gap-sm);
    gap: 0;
    z-index: 20;
    box-shadow: -12px 0 32px
      color-mix(in srgb, var(--pax-color-void) 42%, transparent);
    overflow: hidden;
    flex-shrink: 0;
  }

  .area-right--dock-left {
    border-left: none;
    border-right: 1px solid var(--pax-ui-divider);
    box-shadow: 12px 0 32px
      color-mix(in srgb, var(--pax-color-void) 42%, transparent);
  }

  .resize-handle {
    position: absolute;
    top: 0;
    left: -3px;
    width: 6px;
    height: 100%;
    cursor: col-resize;
    z-index: 25;
    background: transparent;
    transition: background 0.15s;
  }

  .area-right--dock-left .resize-handle {
    left: auto;
    right: -3px;
  }
  .resize-handle:hover,
  .resize-handle.active {
    background: color-mix(in srgb, var(--pax-ui-accent) 30%, transparent);
  }

  /* Leaderboard: standalone with gap below */
  .sidebar-leaderboard {
    flex-shrink: 0;
    padding-bottom: var(--pax-space-2);
    margin-bottom: var(--pax-gap-sm);
    border-bottom: 1px solid var(--pax-ui-divider);
  }

  .area-right :global(.leaderboard) {
    gap: var(--pax-space-2);
    padding: var(--pax-space-3);
  }

  .area-right :global(.leaderboard__eyebrow),
  .area-right :global(.leaderboard__summary),
  .area-right :global(.tick-progress-bar) {
    display: none;
  }

  .area-right :global(.leaderboard__header) {
    gap: var(--pax-space-2);
  }

  .area-right :global(.leaderboard__title) {
    font-size: var(--pax-type-xs-plus);
  }

  .area-right :global(.leaderboard__actions) {
    gap: 5px;
  }

  .area-right :global(.leaderboard__focus-toggle) {
    gap: 3px;
    padding: 3px;
  }

  .area-right :global(.focus-pill) {
    min-height: 30px;
    gap: 0;
    padding: 0 9px;
  }

  .area-right :global(.focus-pill span) {
    display: none;
  }

  .area-right :global(.leaderboard__columns) {
    margin-top: 2px;
  }

  .area-right :global(.leaderboard__item) {
    min-height: 30px;
    padding: var(--pax-space-1) 7px;
  }

  .area-right :global(.star-nav-card) {
    gap: var(--pax-gap-sm);
    padding: var(--pax-space-3);
  }

  .area-right :global(.star-nav-card__header) {
    gap: var(--pax-space-2);
    padding-bottom: var(--pax-space-2);
  }

  .area-right :global(.star-nav-body) {
    grid-template-columns: 68px minmax(0, 1fr);
    gap: var(--pax-gap-sm);
  }

  .area-right :global(.star-orb) {
    min-height: 68px;
    border-radius: 14px;
  }

  .area-right :global(.star-orb__ring) {
    width: 52px;
    height: 52px;
  }

  .area-right :global(.star-orb__core) {
    width: 22px;
    height: 22px;
  }

  .area-right :global(.star-field),
  .area-right :global(.star-rate) {
    padding: var(--pax-space-2);
  }

  .area-right :global(.star-rate-grid) {
    gap: 7px;
  }

  .area-right :global(.star-route-strip) {
    flex-wrap: wrap;
    gap: var(--pax-gap-xs);
  }

  .sidebar-quick-access {
    flex-shrink: 0;
    position: relative;
    margin: 0 0 var(--pax-space-3);
    z-index: 2;
  }

  /* ═══ OVERLAYS ═══ */
  .overlay-top-center {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    pointer-events: auto;
  }

  :global(.room-id-badge) {
    display: flex;
    z-index: 10;
    align-items: center;
    gap: var(--pax-space-2);
    padding: var(--pax-gap-xs) var(--pax-space-3);
    cursor: pointer;
    border: 1px solid color-mix(in srgb, var(--pax-ui-accent) 25%, transparent);
    transition: all 0.2s ease;
    font-family: inherit;
    color: var(--pax-ui-text-strong);
    width: 100%;
    height: 100%;
  }
  :global(.room-id-badge:hover) {
    border-color: color-mix(in srgb, var(--pax-ui-accent) 50%, transparent);
    box-shadow: 0 0 12px
      color-mix(in srgb, var(--pax-ui-accent) 15%, transparent);
  }
  .room-id-label {
    font-size: var(--pax-type-3xs);
    font-weight: var(--pax-weight-bold);
    letter-spacing: 0.12em;
    color: color-mix(in srgb, var(--pax-ui-text-strong) 50%, transparent);
    text-transform: uppercase;
  }
  .room-id-code {
    font-family: var(--pax-ui-font-data);
    font-size: var(--pax-type-xs-plus);
    color: var(--pax-ui-accent);
    letter-spacing: 0.05em;
  }
  .room-id-icon {
    font-size: var(--pax-type-xs);
    opacity: 0.6;
  }

  .overlay-top-left {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 30;
    pointer-events: auto;
  }

  .modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    pointer-events: auto;
  }

  .modal-overlay--fixed {
    position: fixed;
    z-index: 9999;
  }

  .speed-card {
    margin: 0;
    padding: var(--pax-space-3);
    border: 1px solid var(--pax-ui-border);
    border-radius: var(--pax-ui-radius-md);
    background: var(--pax-ui-panel-bg-muted);
    display: flex;
    gap: var(--pax-space-2);
    align-items: center;
  }
  .speed-card__label {
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-4xs);
    font-weight: var(--pax-weight-bold);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--pax-ui-accent);
    padding: 0 2px;
  }

  /* ═══ UTILITIES ═══ */
  .glass-panel {
    background: color-mix(in srgb, var(--pax-color-void) 80%, transparent);
    backdrop-filter: blur(8px);
    border: 1px solid
      color-mix(in srgb, var(--pax-ui-text-strong) 10%, transparent);
    border-radius: 8px;
    box-shadow: 0 4px 20px
      color-mix(in srgb, var(--pax-color-void) 40%, transparent);
  }

  /* Scoped to .surrender-modal — these used to be global :global(.btn*) and
     leaked onto the landing-page CTAs (stretched/pale/wrong font), overriding
     app.css's real .btn styles. Keep them confined to the game modals. */
  .surrender-modal :global(.btn) {
    flex: 1;
    padding: var(--pax-space-2);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    font-weight: var(--pax-weight-semibold);
    text-transform: uppercase;
    font-size: var(--pax-type-2xs);
    transition: all 0.2s;
  }

  .surrender-modal :global(.btn--ghost) {
    background: transparent;
    border: 1px solid var(--pax-ui-text-dim);
    color: var(--pax-ui-text-dim);
  }
  .surrender-modal :global(.btn--ghost:hover) {
    border-color: var(--pax-ui-text-strong);
    color: var(--pax-ui-text-strong);
  }

  .surrender-modal :global(.btn--primary) {
    background: color-mix(
      in srgb,
      var(--pax-color-player-blue) 30%,
      transparent
    );
    border: 1px solid
      color-mix(in srgb, var(--pax-color-player-blue) 60%, transparent);
    color: var(--pax-color-player-blue);
  }
  .surrender-modal :global(.btn--primary:hover) {
    background: color-mix(
      in srgb,
      var(--pax-color-player-blue) 50%,
      transparent
    );
    color: var(--pax-ui-text-strong);
  }

  .surrender-modal :global(.btn--md) {
    padding: var(--pax-space-3) var(--pax-space-4);
    font-size: var(--pax-type-xs-plus);
  }

  .surrender-modal {
    padding: var(--pax-space-6);
    max-width: 340px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--pax-space-4);
    text-align: center;
  }
  .surrender-modal__title {
    font-size: var(--pax-type-lg);
    margin: 0;
    color: var(--pax-ui-text-strong);
    letter-spacing: 0.08em;
  }
  .surrender-modal__desc {
    font-size: var(--pax-type-sm);
    color: var(--pax-ui-text-soft);
    margin: 0;
  }
  .surrender-modal__actions {
    display: flex;
    gap: var(--pax-space-3);
    width: 100%;
  }
  .modal-action {
    flex: 1;
    min-width: 0; /* allow shrink — was overflowing the modal */
    display: flex;
    flex-direction: column;
    gap: var(--pax-gap-xs);
  }
  .surrender-modal__actions :global(.btn) {
    width: 100%;
    justify-content: center;
    text-align: center;
  }
  .modal-action__sub {
    font-size: var(--pax-type-3xs);
    line-height: 1.25;
    color: var(--pax-ui-text-soft);
    text-align: center;
    text-transform: none;
  }
  :global(.surrender-modal__cancel) {
    opacity: 0.5;
    font-size: var(--pax-type-xs);
  }

  .fab-scrim {
    position: fixed;
    inset: 0;
    z-index: 89;
  }

  .fab-popup {
    position: fixed;
    bottom: 72px;
    right: 20px;
    z-index: 91;
    background: color-mix(in srgb, var(--pax-color-void) 96%, transparent);
    border: 1px solid color-mix(in srgb, var(--pax-ui-accent) 15%, transparent);
    border-radius: 12px;
    padding: var(--pax-gap-xs);
    backdrop-filter: blur(16px);
    box-shadow: 0 8px 32px
      color-mix(in srgb, var(--pax-color-void) 60%, transparent);
    animation: fab-pop-in 0.15s ease-out;
    min-width: 170px;
  }

  @keyframes fab-pop-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  :global(.fab-item) {
    display: flex;
    align-items: center;
    gap: var(--pax-gap-sm);
    width: 100%;
    padding: var(--pax-gap-sm) var(--pax-gap-md);
    border: none;
    background: transparent;
    color: color-mix(in srgb, var(--pax-ui-text-strong) 85%, transparent);
    font-size: var(--pax-type-xs-plus);
    font-family: inherit;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.15s;
    text-align: left;
  }
  :global(.fab-item:hover) {
    background: color-mix(in srgb, var(--pax-ui-accent) 8%, transparent);
  }
  .fab-icon {
    font-size: var(--pax-type-md);
    width: 24px;
    text-align: center;
    flex-shrink: 0;
  }

  /* ── Mobile settings overlay close button ── */
</style>
