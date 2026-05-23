<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import {
    pushStateCompat as pushState,
    replaceStateCompat as replaceState,
  } from "$lib/utils/navigationCompat";
  import { gameStore } from "$lib/stores/gameStore.svelte";
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
    GameSpeedPanel,
    HudTopbar,
    PlayerStandingsPanel,
    QuickAccessDock,
    SelectedStarPanel,
    SelectedStarTray,
    SettingsRibbon,
    buildPlayerStandings,
    buildSelectedStarViewModel,
    type QuickAccessAction,
  } from "$lib/components/game-hud";
  import GameCanvas from "$lib/components/game/GameCanvas.svelte";
  import AudioSettings from "$lib/components/ui/AudioSettings.svelte";
  import TopBar from "$lib/components/ui/TopBar.svelte";
  import type { SettingsSectionId } from "$lib/components/ui/settings/settingsRegistry";
  import type { PlayerState, StarState } from "$lib/types/game.types";
  import { audioManager } from "$lib/services/audioManager.svelte";
  import { sentence as txtSentence } from 'txtgen';
  import { rulerTool } from "$lib/territory/devtools/rulerTool";
  import { authoredMeasurementsUi } from "$lib/territory/devtools/authoredMeasurementsUi";
  import { hydrateConfigFromPersistedUiSettings } from "$lib/components/ui/panelSync";
  import { pushHomeRouteDiagEvent } from "$lib/utils/homeRouteDiagnostics";
  import { themeStore } from "$lib/stores/themeStore.svelte";
  import { GAME_CONFIG } from "$lib/config/game.config";
  import {
    applyTopbarTerritoryModeShortcut,
    getTopbarTerritoryModeOptions,
  } from "$lib/territory/ui/territoryModeShortcuts";

  if (typeof window !== "undefined") {
    hydrateConfigFromPersistedUiSettings();
  }

  let gameCanvasRef: any = $state(null);

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

  function loadDockSidePreference(
    key: string,
    fallback: DockSide,
  ): DockSide {
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
    isMobileAtLoad ? false : loadBooleanPreference("pax-settings-open", false),
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
    loadBooleanPreference("pax-settings-ribbon-expanded", false),
  );
  let quickAccessDrawerOpen = $state(false);
  let commandTrayCollapsed = $state(
    loadBooleanPreference("pax-command-tray-collapsed", false),
  );
  // Auto-pause: pause game when settings open, restore on close
  let pauseOnSettings = $state(
    typeof localStorage === "undefined" ||
      localStorage.getItem("pax-pause-on-settings") !== "false",
  ); // Default: ON
  let wasPausedBeforeSettings = false;

  function setSettingsPanelOpen(nextOpen: boolean) {
    if (showSettingsPanel === nextOpen) return;
    showSettingsPanel = nextOpen;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("pax-settings-open", String(showSettingsPanel));
    }
    if (pauseOnSettings && activeGameStore.phase === "playing") {
      if (showSettingsPanel) {
        wasPausedBeforeSettings = activeGameStore.isPaused;
        if (!activeGameStore.isPaused) {
          activeGameStore.pauseGame();
        }
      } else if (!wasPausedBeforeSettings && activeGameStore.isPaused) {
        activeGameStore.resumeGame();
      }
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

  function toggleCommandTrayCollapsed() {
    commandTrayCollapsed = !commandTrayCollapsed;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        "pax-command-tray-collapsed",
        String(commandTrayCollapsed),
      );
    }
  }

  function openAudioSettings() {
    menuTheme = loadMenuTheme();
    showAudioSettings = true;
  }

  const menuExpanded = true;

  // ── In-game menu collapse ──

  // ── F-62: Results overlay dismiss ──
  let resultsDismissed = $state(false);

  // ── Map save/load (F-70 in menu) ──
  let showSaveMapInput = $state(false);
  let saveMapName = $state("");
  let saveMapFeedback = $state("");
  let showLoadMapList = $state(false);

  // ── Game save (B-58) ──
  let showSaveGameInput = $state(false);
  let saveGameName = $state("");
  let saveGameFeedback = $state("");
  let showLoadGameList = $state(false);

  function suggestGameName(): string {
    const date = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
    const words = txtSentence().split(' ').slice(0, 3).join(' ');
    return `${words} ${date}`;
  }

  function openSaveGame() {
    showSaveGameInput = !showSaveGameInput;
    showSaveMapInput = false;
    showLoadMapList = false;
    showLoadGameList = false;
    if (showSaveGameInput && !saveGameName) {
      saveGameName = suggestGameName();
    }
  }

  function handleSaveMap() {
    const name = saveMapName.trim();
    if (!name) return;
    gameStore.saveCurrentMap(name);
    saveMapFeedback = `✓ Map saved "${name}"`;
    saveMapName = "";
    showSaveMapInput = false;
    setTimeout(() => (saveMapFeedback = ""), 2500);
  }

  function handleSaveGame() {
    const name = saveGameName.trim();
    if (!name) return;
    gameStore.saveCurrentGame(name);
    saveGameFeedback = `✓ Game saved "${name}"`;
    saveGameName = "";
    showSaveGameInput = false;
    setTimeout(() => (saveGameFeedback = ""), 2500);
  }

  async function handleLoadMap(map: any) {
    gameStore.loadSavedMap(map);
    showLoadMapList = false;
    await gameStore.startGame();
  }

  async function handleLoadSavedGame(game: any, freshStart = false) {
    gameStore.loadSavedGame(game, freshStart);
    showLoadGameList = false;
    await gameStore.startGame();
  }

  function handleDeleteMap(name: string) {
    gameStore.deleteSavedMap(name);
  }

  function handleDeleteSavedGame(id: string) {
    gameStore.deleteSavedGame(id);
  }

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
  const SETTINGS_PANEL_MIN = 320;
  const SETTINGS_PANEL_MAX = 720;
  const SETTINGS_PANEL_DEFAULT = 360;
  const SETTINGS_CHROME_COMPACT_WIDTH = 340;
  const SETTINGS_CHROME_EXPANDED_WIDTH = 360;
  const SETTINGS_PANEL_SECTION_DEFAULT = 520;

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
    settingsRibbonExpanded
      ? SETTINGS_CHROME_EXPANDED_WIDTH
      : SETTINGS_CHROME_COMPACT_WIDTH,
  );
  const settingsEffectiveWidth = $derived(
    settingsHasOpenSections
      ? settingsPanelWidth
      : settingsChromeWidth,
  );

  function setSettingsSectionActivity(hasOpenSections: boolean) {
    settingsHasOpenSections = hasOpenSections;
    if (hasOpenSections && settingsPanelWidth < SETTINGS_PANEL_SECTION_DEFAULT) {
      settingsPanelWidth = SETTINGS_PANEL_SECTION_DEFAULT;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(SETTINGS_PANEL_STORAGE_KEY, String(settingsPanelWidth));
      }
    }
  }

  function revealSettingsSection(section: SettingsSectionId) {
    forceOpenSettingsSection = section;
    forceOpenSettingsSectionNonce += 1;
  }

  function openSettingsSection(section: SettingsSectionId) {
    setSettingsPanelOpen(true);
    settingsRibbonExpanded = true;
    if (settingsPanelWidth < SETTINGS_PANEL_SECTION_DEFAULT) {
      settingsPanelWidth = SETTINGS_PANEL_SECTION_DEFAULT;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(SETTINGS_PANEL_STORAGE_KEY, String(settingsPanelWidth));
      }
    }
    revealSettingsSection(section);
  }

  function openDiagnostics() {
    openSettingsSection("diagnostics");
  }

  function toggleRulerDiagnostics() {
    const nextEnabled = !rulerTool.getState().enabled;
    rulerTool.setEnabled(nextEnabled);
    if (nextEnabled) {
      openDiagnostics();
    }
  }

  function startResize(e: PointerEvent) {
    e.preventDefault();
    isResizing = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    function onMove(ev: PointerEvent) {
      const delta =
        sidebarSide === "right"
          ? startX - ev.clientX
          : ev.clientX - startX;
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
        controlsSide === "right"
          ? startX - ev.clientX
          : ev.clientX - startX;
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

  const tacticalOverviewPlayers = $derived(
    leaderboardPlayers.slice(0, 5),
  );

  // ── Mobile drawer (icon-activated, no swipe) ──
  let mobileDrawerOpen = $state(false);
  let showSettingsFab = $state(false);
  let showExitConfirm = $state(false);
  let lastShellViewKey = "";
  const topbarTerritoryModeOptions = getTopbarTerritoryModeOptions();
  let topbarActiveTerritoryModeId = $state(GAME_CONFIG.TERRITORY_RENDER_MODE);
  const currentThemeName = $derived(
    themeStore.selectedThemeName || "Phase Field Default",
  );

  const quickAccessActions = $derived.by((): QuickAccessAction[] => {
    const actions: QuickAccessAction[] = [
      {
        id: "theme",
        icon: "theme",
        title: `Open theme tools (${currentThemeName})`,
        onClick: openThemeShortcuts,
      },
      {
        id: "diagnostics",
        icon: "diagnostics",
        title: "Diagnostics",
        active: showSettingsPanel && forceOpenSettingsSection === "diagnostics",
        onClick: openDiagnostics,
      },
      {
        id: "ruler",
        icon: "ruler",
        title: $rulerTool.enabled ? "Turn ruler off" : "Turn ruler on",
        active: $rulerTool.enabled,
        onClick: toggleRulerDiagnostics,
      },
    ];

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

    actions.push(
      {
        id: "fit",
        icon: "fit",
        title: "Center and fit map",
        onClick: () => gameCanvasRef?.centerAndFit?.(),
      },
      {
        id: "more",
        icon: "more",
        title: quickAccessDrawerOpen ? "Close quick access drawer" : "Open quick access drawer",
        active: quickAccessDrawerOpen,
        onClick: () => (quickAccessDrawerOpen = !quickAccessDrawerOpen),
      },
    );

    return actions;
  });

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
  // Push a history entry so Android back button fires popstate
  if (typeof window !== "undefined") {
    // Ensure we have a base history entry to pop against
    replaceState("", { pax: "base" });
    pushState("", { pax: "game" });

    window.addEventListener("popstate", (e) => {
      // Always re-push so we never actually leave the page
      pushState("", { pax: "game" });

      // Close overlays in priority order
      if (showSettingsPanel) {
        setSettingsPanelOpen(false);
        return;
      }
      if (mobileDrawerOpen) {
        mobileDrawerOpen = false;
        return;
      }
      if (showAudioSettings) {
        showAudioSettings = false;
        return;
      }
      if (showSurrenderModal) {
        showSurrenderModal = false;
        return;
      }
      if (showResults && !resultsDismissed) {
        resultsDismissed = true;
        return;
      }
      if (showExitConfirm) {
        showExitConfirm = false;
        return;
      }
      // Nothing open — if game is active, show exit confirmation
      if (
        gameStore.currentView === "game" &&
        activeGameStore.phase === "playing"
      ) {
        showExitConfirm = true;
        return;
      }
      // Not in active game — allow natural back (go to menu)
      if (gameStore.currentView === "game") {
        gameStore.setView("menu");
      }
    });
  }

  // ── Exit confirmation: warn before closing tab during active game ──
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", (e) => {
      if (
        gameStore.currentView === "game" &&
        activeGameStore.phase === "playing"
      ) {
        e.preventDefault();
        // Modern browsers show their own message, this is just for compat
        e.returnValue =
          "You have an active game. Are you sure you want to leave?";
      }
    });
  }

  function confirmExit() {
    showExitConfirm = false;
    gameStore.setView("menu");
  }
  function cancelExit() {
    showExitConfirm = false;
  }

  async function openThemeShortcuts() {
    setSettingsPanelOpen(true);
    settingsRibbonExpanded = true;
    await tick();
    document.getElementById("settings-theme-anchor")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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
    (window as typeof window & { __PAX_GAME_CANVAS__?: unknown }).__PAX_GAME_CANVAS__ =
      gameCanvasRef ?? null;
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
      window.dispatchEvent(new CustomEvent("pax-game-container-unmounted"));
    }
  });
</script>

<div class="app-container">
  {#if gameStore.currentView !== "game"}
    <TopBar
      onSettingsClick={openAudioSettings}
      onHelpClick={() => alert("Help & controls guide coming soon!")}
    />
  {/if}

  {#if gameStore.currentView === "menu"}
    <MainMenu />
  {:else if gameStore.currentView === "game"}
    <!-- Audio Settings Modal -->
    <AudioSettings
      visible={showAudioSettings}
      menuTheme={menuTheme}
      onClose={() => (showAudioSettings = false)}
    />

    <div
      class="game-layout"
      class:settings-open={showSettingsPanel}
      class:layout-sidebar-left={sidebarSide === "left"}
      class:layout-controls-left={controlsSide === "left"}
      style={`--left-rail-width:${leftRailWidth}px; --right-rail-width:${rightRailWidth}px; --quick-access-width:${quickAccessWidth}px;`}>
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
          onModeSelect={handleTopbarTerritoryModeSelect}
        />
      </div>
      <!-- STATUSBAR (info display) -->
      <StatusBar
        players={leaderboardPlayers}
        localPlayerId={activeGameStore.localPlayerId ?? undefined}
        isMuted={audioManager.muted}
        onToggleMute={() => audioManager.toggleMute()}
        onToggleSettings={() => (showSettingsFab = !showSettingsFab)}
      />
      <!-- CANVAS AREA -->
      <div class="area-canvas">
        <GameCanvas bind:this={gameCanvasRef} />

        <!-- TOP CENTER: Room ID Badge (MP only) -->
        {#if multiplayerStore.isConnected && multiplayerStore.roomId}
          <div class="overlay-top-center">
            <button
              class="room-id-badge glass-panel w-full h-full"
              onclick={copyRoomId}
              title="Click to copy Room ID"
            >
              <span class="room-id-label">ROOM</span>
              <code class="room-id-code">{multiplayerStore.roomId}</code>
              <span class="room-id-icon">
                <HudIcon name={roomIdCopied ? "active-focus" : "logging"} size={12} />
              </span>
            </button>
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
          <div class="modal-overlay">
            <ResultsModal onClose={() => (resultsDismissed = true)} />
          </div>
        {/if}

        <SelectedStarTray
          star={selectedStarView}
          collapsed={commandTrayCollapsed}
          onToggleCollapsed={toggleCommandTrayCollapsed}
          onCenterStar={(starId) => gameCanvasRef?.navigateToStar?.(starId)}
          onFitMap={() => gameCanvasRef?.centerAndFit?.()}
          onCancelOrder={(starId) => activeGameStore.cancelOrder(starId)}
        />
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
            onStart={() => activeGameStore.startGame()}
          />
        </section>
        <StarNav
          stars={activeGameStore.stars ?? []}
          players={activeGameStore.players ?? []}
          localPlayerId={activeGameStore.localPlayerId ?? undefined}
          onNavigateToStar={(starId) => gameCanvasRef?.navigateToStar?.(starId)}
          onCenterFit={() => gameCanvasRef?.centerAndFit?.()}
        />
      </div>

      <!-- SECONDARY CONTROLS COLUMN (toggled by gear icon) -->
      {#if showSettingsPanel}
        <div
          class="area-controls"
          class:area-controls--dock-left={controlsSide === "left"}
          style={`width:${settingsEffectiveWidth}px;`}
        >
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
          />
        </div>
      {/if}

      <!-- RIGHT SIDEBAR (always visible) -->
      <div
        class="area-right"
        class:area-right--dock-left={sidebarSide === "left"}
        style="width: {sidebarWidth}px;">
        <!-- Resize handle -->
        <div
          class="resize-handle"
          class:active={isResizing}
          onpointerdown={startResize}
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize"
        ></div>

        {#if !leaderboardCollapsed}
          <div class="sidebar-leaderboard">
            <PlayerStandingsPanel
              players={playerStandings}
              dockSide={sidebarSide}
              onToggleDockSide={toggleSidebarSide}
              onCollapse={toggleLeaderboardCollapsed}
              currentTick={activeGameStore.currentTick ?? 0}
            />
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
              onStart={() => activeGameStore.startGame()}
            />
          </div>

          <div class="sidebar-starnav">
            <SelectedStarPanel
              star={selectedStarView}
              onCenterStar={(starId) => gameCanvasRef?.navigateToStar?.(starId)}
              onFitMap={() => gameCanvasRef?.centerAndFit?.()}
            />
          </div>
        </div>

        <section class="tactical-overview-card" aria-label="Tactical overview">
          <div class="tactical-overview-card__header">
            <span>Tactical Overview</span>
            <span class="font-hud-data">{activeGameStore.currentTick ?? 0}</span>
          </div>
          <div class="tactical-overview-card__players">
            {#each tacticalOverviewPlayers as player}
              <div class="tactical-overview-player" title={player.name}>
                <span
                  class="tactical-overview-player__mark"
                  style={`background:${player.color};`}
                ></span>
                <span class="tactical-overview-player__ships font-hud-data">
                  {player.activeShips ?? player.totalShips ?? 0}
                </span>
                <span class="tactical-overview-player__stars font-hud-data">
                  {player.starCount ?? 0}
                </span>
              </div>
            {/each}
          </div>
        </section>

        <div class="sidebar-quick-access">
          <QuickAccessDock actions={quickAccessActions} />
        </div>

        <hr class="sidebar-divider" class:sidebar-divider--hidden={!quickAccessDrawerOpen} />

        <!-- 2. IN-GAME MENU -->
        <div class="sidebar-menu" class:sidebar-menu--open={quickAccessDrawerOpen}>
          {#if menuExpanded && quickAccessDrawerOpen}
            <div class="menu-items">
              <button
                class="menu-item"
                class:active={showSettingsPanel}
                onclick={toggleSettingsPanel}
              >
                <span class="mi-icon"><HudIcon name="settings" /></span>
                <span class="mi-label">Settings</span>
              </button>
              <button
                class="menu-item"
                class:active={showSettingsPanel &&
                  forceOpenSettingsSection === "diagnostics"}
                onclick={openDiagnostics}
              >
                <span class="mi-icon"><HudIcon name="diagnostics" /></span>
                <span class="mi-label">Diagnostics</span>
              </button>
              <button
                class="menu-item"
                onclick={openAudioSettings}
              >
                <span class="mi-icon"><HudIcon name="audio" /></span>
                <span class="mi-label">Audio</span>
              </button>
              <button
                class="menu-item"
                onclick={() => alert("Screenshot coming soon")}
              >
                <span class="mi-icon"><HudIcon name="camera" /></span>
                <span class="mi-label">Screenshot</span>
              </button>
              <button
                class="menu-item"
                onclick={() => alert("Shortcuts coming soon")}
              >
                <span class="mi-icon"><HudIcon name="keyboard" /></span>
                <span class="mi-label">Keyboard Shortcuts</span>
              </button>
              <button
                class="menu-item"
                onclick={() => alert("Chat coming soon")}
              >
                <span class="mi-icon"><HudIcon name="chat" /></span>
                <span class="mi-label">Chat</span>
              </button>
              <hr class="menu-divider" />
              <!-- Save Map (topology only) -->
              <button
                class="menu-item"
                onclick={() => {
                  showSaveMapInput = !showSaveMapInput;
                  showSaveGameInput = false;
                  showLoadMapList = false;
                  showLoadGameList = false;
                }}
              >
                <span class="mi-icon"><HudIcon name="save-map" /></span>
                <span class="mi-label">Save Map</span>
              </button>
              {#if showSaveMapInput}
                <div class="map-save-row">
                  <input
                    type="text"
                    class="map-name-input"
                    placeholder="Map name…"
                    bind:value={saveMapName}
                    onkeydown={(e) => {
                      if (e.key === "Enter") handleSaveMap();
                    }}
                  />
                  <button
                    class="map-save-btn"
                    onclick={handleSaveMap}
                    disabled={!saveMapName.trim()}>Save</button
                  >
                </div>
              {/if}
              {#if saveMapFeedback}
                <div class="map-feedback">{saveMapFeedback}</div>
              {/if}
              <!-- Save Game (full in-progress snapshot) -->
              <button class="menu-item" onclick={openSaveGame}>
                <span class="mi-icon"><HudIcon name="save-game" /></span>
                <span class="mi-label">Save Game</span>
              </button>
              {#if showSaveGameInput}
                <div class="map-save-row">
                  <input
                    type="text"
                    class="map-name-input"
                    placeholder="Game name…"
                    bind:value={saveGameName}
                    onkeydown={(e) => {
                      if (e.key === "Enter") handleSaveGame();
                    }}
                  />
                  <button
                    class="map-save-btn"
                    onclick={handleSaveGame}
                    disabled={!saveGameName.trim()}>Save</button
                  >
                </div>
              {/if}
              {#if saveGameFeedback}
                <div class="map-feedback">{saveGameFeedback}</div>
              {/if}
              <!-- Load Map -->
              <button
                class="menu-item"
                onclick={() => {
                  showLoadMapList = !showLoadMapList;
                  showLoadGameList = false;
                  showSaveMapInput = false;
                  showSaveGameInput = false;
                }}
              >
                <span class="mi-icon"><HudIcon name="load-map" /></span>
                <span class="mi-label">Load Map</span>
              </button>
              {#if showLoadMapList}
                <div class="map-list">
                  {#if gameStore.savedMaps.length === 0}
                    <div class="map-list-empty">No saved maps</div>
                  {:else}
                    {#each gameStore.savedMaps as map}
                      <div class="map-list-item">
                        <button
                          class="map-load-btn"
                          onclick={() => handleLoadMap(map)}
                          title="Load and restart with this map"
                        >
                          {map.metadata.name}
                        </button>
                        <button
                          class="map-delete-btn"
                          onclick={() => handleDeleteMap(map.metadata.name)}
                          title="Delete"><HudIcon name="close" size={14} /></button
                        >
                      </div>
                    {/each}
                  {/if}
                </div>
              {/if}
              <!-- Load Saved Game -->
              <button
                class="menu-item"
                onclick={() => {
                  showLoadGameList = !showLoadGameList;
                  showLoadMapList = false;
                  showSaveMapInput = false;
                  showSaveGameInput = false;
                }}
              >
                <span class="mi-icon"><HudIcon name="load-game" /></span>
                <span class="mi-label">Load Game</span>
              </button>
              {#if showLoadGameList}
                <div class="map-list">
                  {#if gameStore.savedGames.length === 0}
                    <div class="map-list-empty">No saved games</div>
                  {:else}
                    {#each gameStore.savedGames as game}
                      <div class="map-list-item map-list-item--game">
                        <div class="saved-game-name" title={game.name}>{game.name}</div>
                        <div class="saved-game-meta">Tick {game.tick} · {new Date(game.createdAt).toLocaleDateString()}</div>
                        <div class="saved-game-actions">
                          <button class="map-load-btn" onclick={() => handleLoadSavedGame(game, false)}>Resume</button>
                          <button class="map-load-btn map-load-btn--alt" onclick={() => handleLoadSavedGame(game, true)}>Fresh Start</button>
                          <button class="map-delete-btn" onclick={() => handleDeleteSavedGame(game.id)}><HudIcon name="close" size={14} /></button>
                        </div>
                      </div>
                    {/each}
                  {/if}
                </div>
              {/if}
              <hr class="menu-divider" />
              <button
                class="menu-item"
                onclick={() => {
                  audioManager.play("click");
                  activeGameStore.playAgain();
                }}
              >
                <span class="mi-icon"><HudIcon name="restart" /></span>
                <span class="mi-label">Restart</span>
              </button>
              <button
                class="menu-item quit-item"
                onclick={() => {
                  audioManager.play("click");
                  showSurrenderModal = true;
                }}
              >
                <span class="mi-icon"><HudIcon name="quit" /></span>
                <span class="mi-label">Quit Game</span>
              </button>
            </div>
          {/if}
        </div>

      </div>
    </div>

    <!-- Surrender Confirmation Modal -->
    {#if showSurrenderModal}
      <div
        class="modal-overlay modal-overlay--fixed"
        role="dialog"
        aria-modal="true"
      >
        <div class="surrender-modal glass-panel">
          <h3 class="surrender-modal__title">Surrender?</h3>
          <p class="surrender-modal__desc">Choose how to end your campaign.</p>
          <div class="surrender-modal__actions">
            <button
              class="btn btn--primary btn--md"
              onclick={() => {
                showSurrenderModal = false;
                activeGameStore.surrender();
              }}
            >
              🏁 End Game
              <span class="btn-sub">View results & graphs</span>
            </button>
            <button
              class="btn btn--ghost btn--md"
              onclick={() => {
                showSurrenderModal = false;
                activeGameStore.returnToMenu();
              }}
            >
              🚪 Abandon
              <span class="btn-sub">Return to main menu</span>
            </button>
          </div>
          <button
            class="btn btn--ghost btn--sm surrender-modal__cancel"
            onclick={() => (showSurrenderModal = false)}
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}

    <!-- Exit Confirmation Modal (back button during active game) -->
    {#if showExitConfirm}
      <div
        class="modal-overlay modal-overlay--fixed"
        role="dialog"
        aria-modal="true"
      >
        <div class="surrender-modal glass-panel">
          <h3 class="surrender-modal__title">Leave Game?</h3>
          <p class="surrender-modal__desc">
            You'll lose your current game progress.
          </p>
          <div class="surrender-modal__actions">
            <button class="btn btn--ghost btn--md" onclick={confirmExit}>
              🚪 Leave
              <span class="btn-sub">Return to main menu</span>
            </button>
          </div>
          <button
            class="btn btn--ghost btn--sm surrender-modal__cancel"
            onclick={cancelExit}
          >
            Continue Playing
          </button>
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
        <button
          class="fab-item"
          onclick={() => {
            audioManager.play("click");
            openAudioSettings();
            showSettingsFab = false;
          }}
        >
          <span class="fab-icon"><HudIcon name="audio" size={14} /></span>
          <span>Audio Settings</span>
        </button>
        <button
          class="fab-item"
          onclick={() => {
            audioManager.play("click");
            toggleSettingsPanel();
            showSettingsFab = false;
          }}
        >
          <span class="fab-icon"><HudIcon name="settings" size={14} /></span>
          <span>{showSettingsPanel ? "Hide" : "Show"} Settings</span>
        </button>
        <button
          class="fab-item"
          onclick={() => {
            audioManager.play("click");
            openDiagnostics();
            showSettingsFab = false;
          }}
        >
          <span class="fab-icon"><HudIcon name="diagnostics" size={14} /></span>
          <span>Diagnostics</span>
        </button>
        <button
          class="fab-item"
          onclick={() => {
            audioManager.play("click");
            mobileDrawerOpen = !mobileDrawerOpen;
            showSettingsFab = false;
          }}
        >
          <span class="fab-icon"><HudIcon name="leaderboard" size={14} /></span>
          <span>Leaderboard</span>
        </button>
        <button
          class="fab-item"
          onclick={() => {
            audioManager.play("click");
            activeGameStore.playAgain();
            showSettingsFab = false;
          }}
        >
          <span class="fab-icon"><HudIcon name="restart" size={14} /></span>
          <span>Restart</span>
        </button>
        <button
          class="fab-item"
          onclick={() => {
            audioManager.play("click");
            showSurrenderModal = true;
            showSettingsFab = false;
          }}
        >
          <span class="fab-icon"><HudIcon name="quit" size={14} /></span>
          <span>Quit Game</span>
        </button>
      </div>
    {/if}

    <!-- Mobile drawer: leaderboard + theme management -->
    {#if mobileDrawerOpen}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="mobile-scrim"
        onclick={() => (mobileDrawerOpen = false)}
      ></div>
      <div class="mobile-drawer open">
        <button
          class="drawer-close"
          onclick={() => (mobileDrawerOpen = false)}
          title="Close"><HudIcon name="close" size={14} /></button
        >
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
    grid-template-rows: var(--hud-topbar-height) minmax(0, 1fr);
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
    gap: 10px;
    padding: 0;
    margin-bottom: 10px;
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
  .sidebar-divider {
    border: none;
    border-top: 1px solid var(--hud-divider);
    margin: 4px 0 8px;
  }

  .sidebar-divider--hidden {
    display: none;
  }

  /* Mobile controls bar: hidden on desktop */
  .area-controls-bar {
    display: none;
  }
  .sidebar-divider {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin: 4px 0 8px;
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
      background: rgba(5, 10, 25, 0.95) !important;
      backdrop-filter: blur(12px) !important;
      overflow-y: auto !important;
      padding: 12px !important;
      padding-top: 48px !important;
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
      padding: 6px 8px;
      padding-bottom: 4rem;
      background: rgba(5, 10, 25, 0.92);
      backdrop-filter: blur(8px);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .speed-card {
      flex-direction: row !important;
      gap: 6px;
      padding: 6px 8px !important;
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
      border-left: 1px solid rgba(255, 255, 255, 0.08);
      gap: 4px;
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
      padding: 4px 2px !important;
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
      font-size: 0.4rem;
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
      background: rgba(5, 10, 25, 0.95) !important;
      backdrop-filter: blur(12px) !important;
      padding: 12px !important;
      padding-top: 48px !important;
    }
    .mobile-scrim {
      z-index: 599 !important;
    }
    /* Landscape drawer: horizontal layout */
    .mobile-drawer-content {
      flex-direction: row !important;
      align-items: flex-start !important;
      justify-content: center !important;
      padding: 16px 32px !important;
      gap: 24px !important;
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
      background: rgba(0, 0, 0, 0.5);
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
      background: rgba(8, 8, 16, 0.97);
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
    .drawer-close {
      position: absolute;
      top: 12px;
      right: 16px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 50%;
      color: rgba(255, 255, 255, 0.8);
      font-size: 1.1rem;
      cursor: pointer;
      z-index: 610;
      transition: all 0.15s ease;
    }
    .drawer-close:active {
      background: rgba(0, 255, 255, 0.15);
      color: #0ff;
      border-color: rgba(0, 255, 255, 0.4);
    }

    /* Content: flex column, centered, no scroll */
    .mobile-drawer-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      padding: 56px 24px 24px; /* top padding clears close button */
      gap: 12px;
      overflow: visible;
    }

    /* Leaderboard wrapper: takes only the space it needs */
    .drawer-leaderboard {
      width: 100%;
      max-width: 400px;
    }

    /* ── Compact leaderboard inside drawer ── */
    .drawer-leaderboard :global(.leaderboard) {
      padding: 8px 10px;
      min-width: unset;
    }
    .drawer-leaderboard :global(.leaderboard__header) {
      margin-bottom: 4px;
    }
    .drawer-leaderboard :global(.leaderboard__title) {
      font-size: 0.65rem;
    }
    .drawer-leaderboard :global(.game-totals) {
      padding: 2px 4px;
      margin-bottom: 2px;
      font-size: 0.65rem;
    }
    .drawer-leaderboard :global(.totals-total) {
      font-size: 0.7rem;
    }
    .drawer-leaderboard :global(.tick-counter) {
      gap: 4px;
    }
    .drawer-leaderboard :global(.tick-label) {
      font-size: 0.6rem;
    }
    .drawer-leaderboard :global(.tick-value) {
      font-size: 1.1rem;
    }
    .drawer-leaderboard :global(.tick-progress-bar) {
      height: 3px;
      margin: 2px 0 4px 0;
    }
    .drawer-leaderboard :global(.leaderboard__list) {
      gap: 2px;
    }
    .drawer-leaderboard :global(.leaderboard__item) {
      padding: 3px 6px;
      gap: 6px;
      font-size: 0.75rem;
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
      font-size: 0.75rem;
    }
    .drawer-leaderboard :global(.player-stats) {
      font-size: 0.65rem;
    }
    .drawer-leaderboard :global(.stat-total) {
      font-size: 0.7rem;
      min-width: 2em;
    }
    .drawer-leaderboard :global(.stat-breakdown) {
      font-size: 0.55rem;
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
    min-width: 280px;
    flex-shrink: 0;
  }

  .area-controls--dock-left {
    box-shadow: 5px 0 20px rgba(0, 0, 0, 0.32);
  }

  /* ═══ RIGHT SIDEBAR ═══ */
  .area-right {
    grid-area: tactical;
    position: relative;
    background:
      linear-gradient(180deg, rgba(6, 11, 23, 0.98), rgba(5, 9, 19, 0.94)),
      radial-gradient(circle at top, rgba(255, 200, 107, 0.07), transparent 50%);
    border-left: 1px solid var(--hud-divider);
    display: flex;
    flex-direction: column;
    padding: 12px 12px 10px;
    gap: 0;
    z-index: 20;
    box-shadow: -12px 0 32px rgba(2, 6, 23, 0.42);
    overflow: hidden;
    flex-shrink: 0;
  }

  .area-right--dock-left {
    border-left: none;
    border-right: 1px solid var(--hud-divider);
    box-shadow: 12px 0 32px rgba(2, 6, 23, 0.42);
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
    background: rgba(0, 224, 255, 0.3);
  }

  /* Leaderboard: standalone with gap below */
  .sidebar-leaderboard {
    flex-shrink: 0;
    padding-bottom: 8px;
    margin-bottom: 10px;
    border-bottom: 1px solid var(--hud-divider);
  }

  .area-right :global(.leaderboard) {
    gap: 8px;
    padding: 12px;
  }

  .area-right :global(.leaderboard__eyebrow),
  .area-right :global(.leaderboard__summary),
  .area-right :global(.tick-progress-bar) {
    display: none;
  }

  .area-right :global(.leaderboard__header) {
    gap: 8px;
  }

  .area-right :global(.leaderboard__title) {
    font-size: 0.82rem;
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
    padding: 4px 7px;
  }

  .area-right :global(.star-nav-card) {
    gap: 10px;
    padding: 12px;
  }

  .area-right :global(.star-nav-card__header) {
    gap: 8px;
    padding-bottom: 8px;
  }

  .area-right :global(.star-nav-body) {
    grid-template-columns: 68px minmax(0, 1fr);
    gap: 10px;
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
    padding: 8px;
  }

  .area-right :global(.star-rate-grid) {
    gap: 7px;
  }

  .area-right :global(.star-route-strip) {
    flex-wrap: wrap;
    gap: 6px;
  }

  .tactical-overview-card {
    flex-shrink: 0;
    margin-bottom: 12px;
    border: 1px solid var(--hud-border);
    border-radius: var(--hud-radius-md);
    background: rgba(6, 11, 23, 0.9);
    box-shadow: var(--hud-shadow-soft);
  }

  .tactical-overview-card {
    display: none;
    gap: 12px;
    padding: 13px;
  }

  @media (min-height: 960px) {
    .tactical-overview-card {
      display: grid;
    }
  }

  .tactical-overview-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: var(--hud-text-soft);
    font-family: var(--hud-font-ui);
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .tactical-overview-card__players {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
  }

  .tactical-overview-player {
    min-width: 0;
    display: grid;
    justify-items: center;
    gap: 5px;
    padding: 9px 6px;
    border-radius: 12px;
    background: rgba(12, 22, 40, 0.72);
  }

  .tactical-overview-player__mark {
    width: 22px;
    height: 3px;
    border-radius: 99px;
    box-shadow: 0 0 12px currentColor;
  }

  .tactical-overview-player__ships {
    color: var(--hud-text-strong);
    font-size: 0.72rem;
  }

  .tactical-overview-player__stars {
    color: var(--hud-text-soft);
    font-size: 0.62rem;
  }

  .sidebar-quick-access {
    flex-shrink: 0;
    position: relative;
    margin: 0 0 12px;
    z-index: 2;
  }

  /* In-game menu */
  .sidebar-menu {
    display: none;
    flex-shrink: 0;
    padding: 0 0 4px;
  }

  .sidebar-menu--open {
    display: block;
  }

  .sidebar-menu .menu-items > .menu-item:nth-child(-n + 2) {
    display: none;
  }

  .menu-items {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 40px;
    padding: 0 12px;
    background: rgba(7, 13, 26, 0.72);
    border: 1px solid var(--hud-border);
    border-radius: 12px;
    color: var(--hud-text);
    font-family: var(--hud-font-ui);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }
  .menu-item:hover {
    background: rgba(14, 24, 43, 0.92);
    border-color: var(--hud-border-strong);
    color: var(--hud-text-strong);
  }
  .menu-item.active {
    background: rgba(21, 53, 82, 0.72);
    border-color: var(--hud-border-strong);
    color: var(--hud-accent);
  }

  .mi-icon {
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .mi-icon :global(svg) {
    width: 18px;
    height: 18px;
  }

  .mi-label {
    flex: 1;
  }

  .menu-divider {
    border: none;
    border-top: 1px solid var(--hud-divider);
    margin: 6px 0;
  }

  .menu-item.quit-item:hover {
    background: rgba(255, 80, 80, 0.1);
    border-color: rgba(255, 80, 80, 0.25);
    color: #fca5a5;
  }

  /* Map save/load */
  .map-save-row {
    display: flex;
    gap: 6px;
    padding: 4px 12px 4px 42px;
  }
  .map-name-input {
    flex: 1;
    min-height: 34px;
    padding: 0 10px;
    background: rgba(7, 13, 26, 0.92);
    border: 1px solid var(--hud-border);
    border-radius: 10px;
    color: var(--hud-text-strong);
    font-family: var(--hud-font-ui);
    font-size: 0.72rem;
  }
  .map-name-input:focus {
    border-color: var(--hud-border-strong);
    outline: none;
  }
  .map-save-btn {
    padding: 4px 10px;
    background: rgba(80, 200, 120, 0.2);
    border: 1px solid rgba(80, 200, 120, 0.4);
    border-radius: 4px;
    color: #6ee7b7;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .map-save-btn:hover:not(:disabled) {
    background: rgba(80, 200, 120, 0.3);
  }
  .map-save-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .map-feedback {
    padding: 2px 12px 2px 42px;
    color: #6ee7b7;
    font-size: 0.7rem;
    font-weight: 500;
  }
  .map-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 12px 4px 42px;
  }
  .map-list-empty {
    color: rgba(255, 255, 255, 0.35);
    font-size: 0.7rem;
    font-style: italic;
  }
  .map-list-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .map-load-btn {
    flex: 1;
    padding: 4px 8px;
    background: rgba(80, 140, 255, 0.1);
    border: 1px solid rgba(80, 140, 255, 0.2);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.72rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
  }
  .map-load-btn:hover {
    background: rgba(80, 140, 255, 0.2);
    border-color: rgba(80, 140, 255, 0.4);
    color: #93c5fd;
  }
  .map-delete-btn {
    padding: 4px 6px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.3);
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .map-delete-btn:hover {
    background: rgba(255, 80, 80, 0.15);
    border-color: rgba(255, 80, 80, 0.3);
    color: #fca5a5;
  }
  /* Saved Game list items (stacked layout) */
  .map-list-item--game {
    flex-direction: column;
    align-items: stretch;
    padding: 4px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .saved-game-name {
    font-size: 0.73rem;
    color: rgba(255, 255, 255, 0.75);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }
  .saved-game-meta {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.35);
    margin-bottom: 3px;
  }
  .saved-game-actions {
    display: flex;
    gap: 3px;
  }
  .map-load-btn--alt {
    background: rgba(120, 200, 100, 0.1);
    border-color: rgba(120, 200, 100, 0.2);
    color: rgba(160, 230, 140, 0.8);
  }
  .map-load-btn--alt:hover {
    background: rgba(120, 200, 100, 0.2);
    border-color: rgba(120, 200, 100, 0.4);
    color: #86efac;
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

  .room-id-badge {
    display: flex;
    z-index: 10;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    cursor: pointer;
    border: 1px solid rgba(0, 255, 255, 0.25);
    transition: all 0.2s ease;
    font-family: inherit;
    color: #fff;
    width: 100%;
    height: 100%;
  }
  .room-id-badge:hover {
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 0 12px rgba(0, 255, 255, 0.15);
  }
  .room-id-label {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
  }
  .room-id-code {
    font-family: var(--hud-font-data);
    font-size: 0.8rem;
    color: var(--hud-accent);
    letter-spacing: 0.05em;
  }
  .room-id-icon {
    font-size: 0.75rem;
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
    padding: 12px;
    border: 1px solid var(--hud-border);
    border-radius: var(--hud-radius-md);
    background: var(--hud-panel-bg-muted);
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .speed-card__label {
    font-family: var(--hud-font-ui);
    font-size: 0.56rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--hud-accent);
    padding: 0 2px;
  }

  /* ═══ UTILITIES ═══ */
  .glass-panel {
    background: rgba(20, 20, 30, 0.8);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  }

  .btn {
    flex: 1;
    padding: 8px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    transition: all 0.2s;
  }

  .btn--ghost {
    background: transparent;
    border: 1px solid #556;
    color: #889;
  }
  .btn--ghost:hover {
    border-color: #fff;
    color: #fff;
  }

  .btn--primary {
    background: rgba(59, 130, 246, 0.3);
    border: 1px solid rgba(59, 130, 246, 0.6);
    color: #93c5fd;
  }
  .btn--primary:hover {
    background: rgba(59, 130, 246, 0.5);
    color: #fff;
  }

  .btn--md {
    padding: 12px 16px;
    font-size: 13px;
  }

  .surrender-modal {
    padding: 24px;
    max-width: 340px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
  }
  .surrender-modal__title {
    font-size: 1.2rem;
    margin: 0;
    color: #fff;
    letter-spacing: 0.08em;
  }
  .surrender-modal__desc {
    font-size: 0.875rem;
    color: #888;
    margin: 0;
  }
  .surrender-modal__actions {
    display: flex;
    gap: 12px;
    width: 100%;
  }
  .surrender-modal__actions .btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .btn-sub {
    font-size: 0.65rem;
    opacity: 0.6;
    font-weight: 400;
    text-transform: none;
  }
  .surrender-modal__cancel {
    opacity: 0.5;
    font-size: 0.75rem;
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
    background: rgba(10, 14, 30, 0.96);
    border: 1px solid rgba(0, 255, 255, 0.15);
    border-radius: 12px;
    padding: 6px;
    backdrop-filter: blur(16px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
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

  .fab-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 14px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.82rem;
    font-family: inherit;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.15s;
    text-align: left;
  }
  .fab-item:hover {
    background: rgba(0, 255, 255, 0.08);
  }
  .fab-icon {
    font-size: 1.1rem;
    width: 24px;
    text-align: center;
    flex-shrink: 0;
  }

  /* ── Mobile settings overlay close button ── */
</style>
