<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { pushState, replaceState } from "$app/navigation";
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
  import { multiplayerStore } from "$lib/stores/multiplayerStore.svelte";
  import MainMenu from "$lib/components/ui/MainMenu.svelte";
  import ResultsModal from "$lib/components/ui/ResultsModal.svelte";
  import GameCanvas from "$lib/components/game/GameCanvas.svelte";
  import GameSettingsPanel from "$lib/components/ui/GameSettingsPanel.svelte";
  import Leaderboard from "$lib/components/ui/Leaderboard.svelte";
  import SpeedControls from "$lib/components/ui/SpeedControls.svelte";
  import StarsPanel from "$lib/components/ui/StarsPanel.svelte";
  import StarInfoPanel from "$lib/components/ui/StarInfoPanel.svelte";
  import AudioSettings from "$lib/components/ui/AudioSettings.svelte";
  import TopBar from "$lib/components/ui/TopBar.svelte";
  import DiagnosticsBar from "$lib/components/ui/DiagnosticsBar.svelte";
  import StatusBar from "$lib/components/ui/StatusBar.svelte";
  import StarNav from "$lib/components/ui/StarNav.svelte";
  import type { PlayerState } from "$lib/types/game.types";
  import { themeStore } from "$lib/stores/themeStore.svelte";
  import { audioManager } from "$lib/services/audioManager.svelte";
  import { sentence as txtSentence } from 'txtgen';
  import { diagnosticsUi } from "$lib/territory/devtools/diagnosticsUi";

  let gameCanvasRef: any = $state(null);

  let roomIdCopied = $state(false);
  function copyRoomId() {
    if (multiplayerStore.roomId) {
      navigator.clipboard.writeText(multiplayerStore.roomId);
      roomIdCopied = true;
      setTimeout(() => (roomIdCopied = false), 1500);
    }
  }

  // ── Panel visibility states ──
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

  // Track mobile state reactively for FAB visibility
  if (typeof window !== "undefined") {
    window.addEventListener("resize", () => {
      isMobileNow = window.innerWidth < 1024;
    });
  }

  let showSettingsPanel = $state(
    !isMobileAtLoad &&
      typeof localStorage !== "undefined" &&
      localStorage.getItem("pax-settings-open") === "true",
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

  // ── In-game menu collapse ──
  let menuExpanded = $state(true);

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

  // Listen for StarInfoPanel toggle from GameSettingsPanel
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
  const SIDEBAR_MIN = 280;
  const SIDEBAR_MAX = 600;
  const SIDEBAR_DEFAULT = 320;
  const SETTINGS_PANEL_STORAGE_KEY = "pax-settings-panel-width";
  const SETTINGS_PANEL_MIN = 280;
  const SETTINGS_PANEL_MAX = 720;
  const SETTINGS_PANEL_DEFAULT = 360;

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

  function startResize(e: PointerEvent) {
    e.preventDefault();
    isResizing = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    function onMove(ev: PointerEvent) {
      const delta = startX - ev.clientX;
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
      const delta = startX - ev.clientX;
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

  // ── Mobile drawer (icon-activated, no swipe) ──
  let mobileDrawerOpen = $state(false);
  let showSettingsFab = $state(false);
  let showExitConfirm = $state(false);

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

  onDestroy(() => {
    if (typeof document !== "undefined") {
      document.body.classList.remove("game-active");
    }
  });
</script>

<div class="app-container">
  <TopBar
    onSettingsClick={gameStore.currentView !== "game"
      ? () => (showAudioSettings = true)
      : undefined}
    onHelpClick={() => alert("Help & controls guide coming soon!")}
    onFitViewport={gameStore.currentView === "game"
      ? () => gameCanvasRef?.centerAndFit?.()
      : undefined}
  />

  {#if gameStore.currentView === "game" && $diagnosticsUi.open}
    <DiagnosticsBar />
  {/if}

  {#if gameStore.currentView === "menu"}
    <MainMenu />
  {:else if gameStore.currentView === "game"}
    <!-- Audio Settings Modal -->
    <AudioSettings
      visible={showAudioSettings}
      onClose={() => (showAudioSettings = false)}
    />

    <div class="game-layout" class:settings-open={showSettingsPanel}>
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
              <span class="room-id-icon">{roomIdCopied ? "✓" : "📋"}</span>
            </button>
          </div>
        {/if}

        <!-- TOP LEFT: debug panels -->
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
      </div>

      <!-- MOBILE-ONLY: Bottom controls bar (hidden on desktop, shown by mobile media query) -->
      <div class="area-controls-bar">
        <fieldset class="speed-fieldset">
          <legend class="speed-legend">Gamespeed</legend>
          <SpeedControls
            speed={activeGameStore.speed}
            isPaused={activeGameStore.isPaused}
            hasStarted={true}
            onSpeedChange={(speed) => activeGameStore.setSpeed(speed)}
            onPause={() => activeGameStore.pauseGame()}
            onResume={() => activeGameStore.resumeGame()}
            onStart={() => activeGameStore.startGame()}
          />
        </fieldset>
        <StarNav
          stars={activeGameStore.stars ?? []}
          localPlayerId={activeGameStore.localPlayerId ?? undefined}
          onNavigateToStar={(starId) => gameCanvasRef?.navigateToStar?.(starId)}
          onCenterFit={() => gameCanvasRef?.centerAndFit?.()}
        />
      </div>

      <!-- SECONDARY CONTROLS COLUMN (toggled by gear icon) -->
      {#if showSettingsPanel}
        <div class="area-controls" style="width: {settingsPanelWidth}px;">
          <div
            class="controls-resize-handle"
            class:active={isSettingsResizing}
            onpointerdown={startSettingsResize}
            role="separator"
            aria-orientation="vertical"
            title="Drag to resize settings panel"
          ></div>
          <button
            class="settings-overlay-close"
            onclick={() => setSettingsPanelOpen(false)}
            title="Close Settings">✕</button
          >
          <div class="panel-section section-tuning">
            <GameSettingsPanel />
          </div>
        </div>
      {/if}

      <!-- RIGHT SIDEBAR (always visible) -->
      <div class="area-right" style="width: {sidebarWidth}px;">
        <!-- Resize handle -->
        <div
          class="resize-handle"
          class:active={isResizing}
          onpointerdown={startResize}
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize"
        ></div>

        <!-- 1. GAME CONTROLS (speed + pause) -->
        <div class="sidebar-controls">
          <fieldset class="speed-fieldset">
            <legend class="speed-legend">Gamespeed</legend>
            <SpeedControls
              speed={activeGameStore.speed}
              isPaused={activeGameStore.isPaused}
              hasStarted={true}
              onSpeedChange={(speed) => activeGameStore.setSpeed(speed)}
              onPause={() => activeGameStore.pauseGame()}
              onResume={() => activeGameStore.resumeGame()}
              onStart={() => activeGameStore.startGame()}
            />
          </fieldset>
        </div>

        <!-- 2. STAR VIEW (cycling navigation) -->
        <div class="sidebar-starnav">
          <StarNav
            stars={activeGameStore.stars ?? []}
            localPlayerId={activeGameStore.localPlayerId ?? undefined}
            onNavigateToStar={(starId) =>
              gameCanvasRef?.navigateToStar?.(starId)}
            onCenterFit={() => gameCanvasRef?.centerAndFit?.()}
          />
        </div>

        <!-- 3. LEADERBOARD -->
        <div class="sidebar-leaderboard">
          <Leaderboard players={leaderboardPlayers} />
        </div>

        <hr class="sidebar-divider" />

        <!-- 2. THEME SELECTOR (bold, prominent) -->
        <div class="sidebar-theme">
          <label class="theme-label" for="theme-select">🎨 THEME</label>
          <select
            id="theme-select"
            class="theme-select"
            value={themeStore.selectedThemeName}
            onchange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              if (v) themeStore.applyTheme(v);
            }}
          >
            <option value="">Select Theme…</option>
            {#each themeStore.allThemes as theme}
              <option value={theme.name}>{theme.name}</option>
            {/each}
          </select>
        </div>

        <!-- 3. IN-GAME MENU -->
        <div class="sidebar-menu">
          <button
            class="menu-header"
            onclick={() => (menuExpanded = !menuExpanded)}
          >
            <span>MENU</span>
            <span class="menu-chevron">{menuExpanded ? "▾" : "▸"}</span>
          </button>

          {#if menuExpanded}
            <div class="menu-items">
              <button
                class="menu-item"
                class:active={showSettingsPanel}
                onclick={toggleSettingsPanel}
              >
                <span class="mi-icon">⚙</span>
                <span class="mi-label">Settings</span>
              </button>
              <button
                class="menu-item"
                onclick={() => (showAudioSettings = true)}
              >
                <span class="mi-icon">🔊</span>
                <span class="mi-label">Audio</span>
              </button>
              <button
                class="menu-item"
                onclick={() => alert("Screenshot coming soon")}
              >
                <span class="mi-icon">📸</span>
                <span class="mi-label">Screenshot</span>
              </button>
              <button
                class="menu-item"
                onclick={() => alert("Shortcuts coming soon")}
              >
                <span class="mi-icon">⌨</span>
                <span class="mi-label">Keyboard Shortcuts</span>
              </button>
              <button
                class="menu-item"
                onclick={() => alert("Chat coming soon")}
              >
                <span class="mi-icon">💬</span>
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
                <span class="mi-icon">🗺</span>
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
                <span class="mi-icon">💾</span>
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
                <span class="mi-icon">📂</span>
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
                          🗺 {map.metadata.name}
                        </button>
                        <button
                          class="map-delete-btn"
                          onclick={() => handleDeleteMap(map.metadata.name)}
                          title="Delete">✕</button
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
                <span class="mi-icon">🎮</span>
                <span class="mi-label">Load Game</span>
              </button>
              {#if showLoadGameList}
                <div class="map-list">
                  {#if gameStore.savedGames.length === 0}
                    <div class="map-list-empty">No saved games</div>
                  {:else}
                    {#each gameStore.savedGames as game}
                      <div class="map-list-item map-list-item--game">
                        <div class="saved-game-name" title={game.name}>💾 {game.name}</div>
                        <div class="saved-game-meta">Tick {game.tick} · {new Date(game.createdAt).toLocaleDateString()}</div>
                        <div class="saved-game-actions">
                          <button class="map-load-btn" onclick={() => handleLoadSavedGame(game, false)}>Resume</button>
                          <button class="map-load-btn map-load-btn--alt" onclick={() => handleLoadSavedGame(game, true)}>Fresh Start</button>
                          <button class="map-delete-btn" onclick={() => handleDeleteSavedGame(game.id)}>✕</button>
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
                <span class="mi-icon">🔄</span>
                <span class="mi-label">Restart</span>
              </button>
              <button
                class="menu-item quit-item"
                onclick={() => {
                  audioManager.play("click");
                  showSurrenderModal = true;
                }}
              >
                <span class="mi-icon">🏳</span>
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
            showAudioSettings = true;
            showSettingsFab = false;
          }}
        >
          <span class="fab-icon">🎵</span>
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
          <span class="fab-icon">⚙</span>
          <span>{showSettingsPanel ? "Hide" : "Show"} Settings</span>
        </button>
        <button
          class="fab-item"
          onclick={() => {
            audioManager.play("click");
            mobileDrawerOpen = !mobileDrawerOpen;
            showSettingsFab = false;
          }}
        >
          <span class="fab-icon">📊</span>
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
          <span class="fab-icon">🔄</span>
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
          <span class="fab-icon">🏳</span>
          <span>Quit Game</span>
        </button>
      </div>
    {/if}

    <!-- Mobile drawer: leaderboard + theme -->
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
          title="Close">✕</button
        >
        <div class="mobile-drawer-content">
          <div class="drawer-leaderboard">
            <Leaderboard players={leaderboardPlayers} />
          </div>
          <div class="drawer-theme-row">
            <span class="drawer-theme-icon">🎨</span>
            <select
              id="mobile-theme-select"
              class="drawer-theme-select"
              value={themeStore.selectedThemeName}
              onchange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                if (v) themeStore.applyTheme(v);
              }}
            >
              <option value="">Theme…</option>
              {#each themeStore.allThemes as theme}
                <option value={theme.name}>{theme.name}</option>
              {/each}
            </select>
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
  /* Default: Canvas | Right sidebar */
  /* Settings open: Canvas | Secondary (controls) | Right sidebar */
  .game-layout {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas: "canvas right";
    height: 100vh;
    height: 100dvh;
    width: 100vw;
  }

  .game-layout.settings-open {
    grid-template-columns: 1fr auto auto;
    grid-template-areas: "canvas controls right";
  }

  .area-canvas {
    grid-area: canvas;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0; /* Prevents CSS Grid from expanding cell beyond available space */
    overflow: hidden;
    box-sizing: border-box;
  }

  /* Sidebar sections */
  .sidebar-controls {
    padding: 6px 8px;
  }
  .sidebar-starnav {
    padding: 2px 8px 6px;
  }
  .sidebar-divider {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin: 4px 8px;
  }

  /* Mobile controls bar: hidden on desktop */
  .area-controls-bar {
    display: none;
  }
  .sidebar-divider {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin: 4px 8px;
  }

  @media (max-width: 1024px) {
    /* ── Mobile portrait: 3-row grid ── */
    .game-layout {
      grid-template-columns: 1fr !important;
      grid-template-rows: auto 1fr auto;
      grid-template-areas:
        "statusbar"
        "canvas"
        "controls" !important;
    }
    .game-layout.settings-open {
      grid-template-columns: 1fr !important;
      grid-template-rows: auto 1fr auto;
      grid-template-areas:
        "statusbar"
        "canvas"
        "controls" !important;
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
      grid-area: controls;
      padding: 6px 8px;
      padding-bottom: 4rem;
      background: rgba(5, 10, 25, 0.92);
      backdrop-filter: blur(8px);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .speed-fieldset {
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

  /* ── Landscape mobile: statusbar left, canvas center, controls right ── */
  @media (max-width: 1024px) and (orientation: landscape) {
    .game-layout {
      grid-template-columns: 50px 1fr 56px !important;
      grid-template-rows: 1fr !important;
      grid-template-areas: "statusbar canvas controls" !important;
    }
    .game-layout.settings-open {
      grid-template-columns: 50px 1fr 56px !important;
      grid-template-rows: 1fr !important;
      grid-template-areas: "statusbar canvas controls" !important;
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
    /* Rotate fieldsets so they become thin vertical strips */
    .speed-fieldset,
    .area-controls-bar :global(.star-nav-fieldset) {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      flex-direction: row-reverse !important;
      padding: 4px 2px !important;
      gap: 2px !important;
      margin: 0;
      border-width: 1px;
    }
    /* Counter-rotate button contents so icons are upright */
    .speed-fieldset :global(.speed-btn),
    .area-controls-bar :global(.sn-btn) {
      writing-mode: horizontal-tb;
      transform: rotate(180deg);
    }
    /* Legend text reads vertically */
    .speed-legend,
    .area-controls-bar :global(.star-nav-legend) {
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
    .drawer-theme-row {
      flex-direction: column !important;
      align-self: center !important;
      max-width: 160px !important;
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
      overflow: hidden;
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

    /* Theme selector: inline icon + select */
    .drawer-theme-row {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      max-width: 400px;
    }
    .drawer-theme-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }
    .drawer-theme-select {
      flex: 1;
      padding: 6px 10px;
      background: rgba(20, 20, 35, 0.9);
      border: 1px solid rgba(255, 200, 60, 0.3);
      border-radius: 6px;
      color: #fff;
      font-family: "Montserrat", sans-serif;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
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
    grid-area: canvas;
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
    grid-area: controls;
    position: relative;
    background: rgba(10, 10, 15, 0.95);
    border-left: 1px solid #223;
    border-right: 1px solid #223;
    display: flex;
    flex-direction: column;
    padding: 10px;
    gap: 10px;
    z-index: 20;
    overflow-y: auto;
    width: 340px;
    min-width: 280px;
    flex-shrink: 0;
  }

  .section-tuning {
    flex: 1;
    overflow: hidden;
    min-height: 200px;
    display: flex;
    flex-direction: column;
  }

  /* ═══ RIGHT SIDEBAR ═══ */
  .area-right {
    grid-area: right;
    position: relative;
    background: rgba(10, 10, 15, 0.95);
    border-left: 1px solid #334;
    display: flex;
    flex-direction: column;
    padding: 10px;
    gap: 0;
    z-index: 20;
    box-shadow: -5px 0 20px rgba(0, 0, 0, 0.5);
    overflow-y: auto;
    flex-shrink: 0;
  }

  .controls-resize-handle,
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
  .resize-handle:hover,
  .resize-handle.active,
  .controls-resize-handle:hover,
  .controls-resize-handle.active {
    background: rgba(0, 224, 255, 0.3);
  }

  /* Leaderboard: standalone with gap below */
  .sidebar-leaderboard {
    flex-shrink: 0;
    padding-bottom: 8px;
    margin-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  /* Theme selector: bold and prominent */
  .sidebar-theme {
    flex-shrink: 0;
    padding: 8px 4px;
    margin-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .theme-label {
    display: block;
    font-family: "Exo", sans-serif;
    font-size: 0.8rem;
    font-weight: 900;
    letter-spacing: 0.15em;
    color: rgba(255, 200, 60, 0.9);
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .theme-select {
    width: 100%;
    padding: 8px 10px;
    background: rgba(20, 20, 35, 0.9);
    border: 1px solid rgba(255, 200, 60, 0.3);
    border-radius: 6px;
    color: #fff;
    font-family: "Montserrat", sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .theme-select:hover,
  .theme-select:focus {
    border-color: rgba(255, 200, 60, 0.6);
    outline: none;
  }

  /* In-game menu */
  .sidebar-menu {
    flex-shrink: 0;
    padding: 4px 0;
  }

  .menu-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.45);
    font-family: "Exo", sans-serif;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    cursor: pointer;
    transition: color 0.15s;
  }
  .menu-header:hover {
    color: rgba(255, 255, 255, 0.7);
  }

  .menu-chevron {
    font-size: 0.7rem;
  }

  .menu-items {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 0;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.6);
    font-family: "Montserrat", sans-serif;
    font-size: 0.78rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }
  .menu-item:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
  .menu-item.active {
    background: rgba(80, 120, 255, 0.12);
    border-color: rgba(80, 120, 255, 0.3);
    color: #93c5fd;
  }

  .mi-icon {
    font-size: 1rem;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }

  .mi-label {
    flex: 1;
  }

  .menu-divider {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin: 4px 0;
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
    padding: 4px 8px;
    background: rgba(20, 20, 35, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    color: #fff;
    font-family: "Montserrat", sans-serif;
    font-size: 0.72rem;
  }
  .map-name-input:focus {
    border-color: rgba(80, 200, 255, 0.5);
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
    font-family: monospace;
    font-size: 0.8rem;
    color: #00ffff;
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

  .speed-fieldset {
    margin: 0;
    padding: 6px 10px 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .speed-legend {
    font-family: "Montserrat", sans-serif;
    font-size: 0.55rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.35);
    padding: 0 6px;
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
  .settings-overlay-close {
    display: none; /* hidden on desktop */
  }
  @media (max-width: 1024px) {
    .settings-overlay-close {
      display: flex;
      position: fixed;
      top: 8px;
      right: 8px;
      z-index: 210;
      width: 40px;
      height: 40px;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(0, 255, 255, 0.3);
      border-radius: 50%;
      background: rgba(10, 14, 30, 0.9);
      color: rgba(255, 255, 255, 0.9);
      font-size: 1.2rem;
      cursor: pointer;
      backdrop-filter: blur(8px);
    }
  }
</style>
