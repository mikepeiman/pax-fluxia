<script lang="ts">
  import { onMount, onDestroy } from "svelte";
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
  import type { PlayerState } from "$lib/types/game.types";
  import { themeStore } from "$lib/stores/themeStore.svelte";
  import { audioManager } from "$lib/services/audioManager.svelte";

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
  function toggleSettingsPanel() {
    showSettingsPanel = !showSettingsPanel;
    localStorage.setItem("pax-settings-open", String(showSettingsPanel));
  }

  // ── In-game menu collapse ──
  let menuExpanded = $state(true);

  // ── F-62: Results overlay dismiss ──
  let resultsDismissed = $state(false);
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

  function loadSidebarWidth(): number {
    if (typeof localStorage === "undefined") return SIDEBAR_DEFAULT;
    const v = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (v) {
      const n = parseInt(v);
      if (!isNaN(n)) return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, n));
    }
    return SIDEBAR_DEFAULT;
  }

  let sidebarWidth = $state(loadSidebarWidth());
  let isResizing = $state(false);

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
    history.replaceState({ pax: "base" }, "");
    history.pushState({ pax: "game" }, "");

    window.addEventListener("popstate", (e) => {
      // Always re-push so we never actually leave the page
      history.pushState({ pax: "game" }, "");

      // Close overlays in priority order
      if (showSettingsPanel) {
        showSettingsPanel = false;
        localStorage.setItem("pax-settings-open", "false");
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

  {#if gameStore.currentView === "menu"}
    <MainMenu />
  {:else if gameStore.currentView === "game"}
    <!-- Audio Settings Modal -->
    <AudioSettings
      visible={showAudioSettings}
      onClose={() => (showAudioSettings = false)}
    />

    <div class="game-layout" class:settings-open={showSettingsPanel}>
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

        <!-- BOTTOM LEFT: Speed & quick actions -->
        <div class="overlay-bottom-left">
          <div class="controls-wrapper glass-panel">
            <SpeedControls
              speed={activeGameStore.speed}
              isPaused={activeGameStore.isPaused}
              hasStarted={activeGameStore.phase === "playing"}
              onSpeedChange={(speed) => activeGameStore.setSpeed(speed)}
              onPause={() => activeGameStore.pauseGame()}
              onResume={() => activeGameStore.resumeGame()}
              onStart={() => activeGameStore.startGame()}
              onCenterFit={() => gameCanvasRef?.centerAndFit?.()}
            />

            <div class="action-buttons mobile-hide">
              <button
                class="btn btn--ghost btn--sm"
                onclick={() => activeGameStore.playAgain()}
              >
                Restart
              </button>
              <button
                class="btn btn--ghost btn--sm"
                onclick={() => (showAudioSettings = true)}
                title="Audio Settings"
              >
                🔊
              </button>
              <button
                class="btn btn--danger btn--sm"
                onclick={() => (showSurrenderModal = true)}
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- SECONDARY CONTROLS COLUMN (toggled by gear icon) -->
      {#if showSettingsPanel}
        <div class="area-controls">
          <button
            class="settings-overlay-close"
            onclick={() => (showSettingsPanel = false)}
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

        <!-- 1. LEADERBOARD (standalone, visual gap below) -->
        <div class="sidebar-leaderboard">
          <Leaderboard players={leaderboardPlayers} />
        </div>

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
    <!-- MOBILE MENU BUTTON (☰ only) — hide when settings overlay is open -->
    {#if !showSettingsPanel}
      <button
        class="mobile-menu-btn"
        class:active={mobileDrawerOpen}
        onclick={() => (mobileDrawerOpen = !mobileDrawerOpen)}
        title="Menu"
      >
        {mobileDrawerOpen ? "✕" : "☰"}
      </button>
    {/if}

    <!-- Scrim -->
    {#if mobileDrawerOpen}
      <div
        class="mobile-scrim"
        onclick={() => (mobileDrawerOpen = false)}
        role="presentation"
      ></div>
    {/if}

    <!-- Drawer panel (opens from ribbon ☰ icon only) -->
    <div class="mobile-drawer" class:open={mobileDrawerOpen}>
      <div class="mobile-drawer-content">
        <!-- Leaderboard -->
        <div class="mobile-section">
          <Leaderboard players={leaderboardPlayers} />
        </div>

        <!-- Theme -->
        <div class="mobile-section">
          <label class="mobile-theme-label" for="mobile-theme-select"
            >🎨 THEME</label
          >
          <select
            id="mobile-theme-select"
            class="mobile-theme-select"
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
      </div>
    </div>

    <!-- F-96: Floating Settings Gear (visible on both mobile and desktop in-game) -->
    <!-- Hidden on mobile when settings overlay is open to avoid overlapping close button -->
    {#if !showSettingsPanel || !isMobileNow}
      <button
        class="settings-fab"
        class:active={showSettingsFab}
        onclick={() => (showSettingsFab = !showSettingsFab)}
        title="Quick Settings"
      >
        ⚙
      </button>
    {/if}

    {#if showSettingsFab}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="fab-scrim" onclick={() => (showSettingsFab = false)}></div>
      <div class="fab-popup glass-panel">
        <button
          class="fab-item"
          onclick={() => {
            audioManager.toggleMute();
            audioManager.play("click");
          }}
        >
          <span class="fab-icon">{audioManager.muted ? "🔇" : "🔊"}</span>
          <span>{audioManager.muted ? "Unmute" : "Mute"} Audio</span>
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
            showSurrenderModal = true;
            showSettingsFab = false;
          }}
        >
          <span class="fab-icon">🏳</span>
          <span>Quit Game</span>
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  /* Note: Global body styles were removed as they should be in app.css or layout */

  .app-container {
    width: 100vw;
    height: 100vh;
  }

  /* ═══ GRID LAYOUT V8 ═══ */
  /* Default: Canvas | Right sidebar */
  /* Settings open: Canvas | Secondary (controls) | Right sidebar */
  .game-layout {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas: "canvas right";
    height: 100vh;
    width: 100vw;
  }

  .game-layout.settings-open {
    grid-template-columns: 1fr auto auto;
    grid-template-areas: "canvas controls right";
  }

  @media (max-width: 1024px) {
    .game-layout {
      grid-template-columns: 1fr !important;
      grid-template-areas: "canvas" !important;
    }
    .game-layout.settings-open {
      grid-template-columns: 1fr !important;
      grid-template-areas: "canvas" !important;
    }
    .area-right {
      display: none !important;
    }
    /* On mobile, settings panel becomes a fullscreen scrollable overlay */
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
      padding-top: 48px !important; /* room for close button */
    }
    /* ── Hide desktop overlays on mobile (but NOT overlay-bottom-left) ── */
    .overlay-top-left,
    .overlay-top-center {
      display: none !important;
    }
    /* Reposition speed controls to center-bottom on mobile */
    .overlay-bottom-left {
      left: 8px !important;
      right: 8px !important;
      bottom: calc(56px + env(safe-area-inset-bottom, 0px)) !important;
      transform: none;
      width: auto !important;
      max-width: 100%;
    }
    .controls-wrapper {
      flex-direction: row !important;
      gap: 6px;
      padding: 8px !important;
      max-width: 100%;
      overflow: visible;
    }
    .action-buttons {
      flex-direction: row !important;
      flex-shrink: 0;
    }
    .mobile-hide {
      display: none !important;
    }
    .settings-fab {
      bottom: calc(64px + env(safe-area-inset-bottom, 0px));
    }
  }

  /* ── Landscape mobile: convert top/bottom bars to left/right sidebars ── */
  @media (max-width: 1024px) and (orientation: landscape) {
    .mobile-menu-btn {
      /* Left sidebar: narrow vertical strip */
      top: 0 !important;
      left: 0 !important;
      right: auto !important;
      width: 44px !important;
      height: 100vh !important;
      flex-direction: column !important;
      border-bottom: none !important;
      border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
      gap: 8px !important;
      padding: 8px 4px !important;
    }
    .mobile-menu-btn .ribbon-stat {
      writing-mode: vertical-rl !important;
      text-orientation: mixed !important;
      font-size: 0.65rem !important;
    }
    /* Shift canvas so it doesn't sit under left sidebar */
    .area-canvas {
      margin-left: 44px !important;
    }
    /* Bottom speed controls → right sidebar */
    .overlay-bottom-left {
      left: auto !important;
      right: 0 !important;
      top: 0 !important;
      bottom: 0 !important;
      width: 56px !important;
      height: 100vh !important;
      max-width: 56px !important;
    }
    .controls-wrapper {
      flex-direction: column !important;
      padding: 6px !important;
      height: 100% !important;
      justify-content: center !important;
    }
    /* Also shift canvas to not sit under right sidebar */
    .area-canvas {
      margin-right: 56px !important;
    }
    /* FAB position adjustment for landscape */
    .settings-fab {
      bottom: 12px !important;
      right: 64px !important;
    }
  }

  /* ── Mobile-only elements (hidden on desktop) ── */
  .mobile-menu-btn {
    display: none;
  }
  .mobile-scrim {
    display: none;
  }
  .mobile-drawer {
    display: none;
  }

  @media (max-width: 1024px) {
    /* ── Mobile menu button (☰) — top-right ── */
    /* ── Mobile top ribbon (replaces floating ☰ circle) ── */
    .mobile-menu-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 40px;
      border-radius: 0;
      background: rgba(10, 10, 18, 0.92);
      backdrop-filter: blur(10px);
      border: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.7);
      font-size: 1.2rem;
      cursor: pointer;
      z-index: 500;
      transition: all 0.2s ease;
    }
    .mobile-menu-btn:active {
      background: rgba(10, 10, 18, 0.95);
      border-color: rgba(0, 255, 255, 0.4);
      color: #fff;
    }
    .mobile-menu-btn.active {
      color: #0ff;
      border-color: rgba(0, 255, 255, 0.4);
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

    /* ── Slide-in drawer from right ── */
    .mobile-drawer {
      display: flex;
      position: fixed;
      top: 0;
      right: 0;
      width: 280px;
      max-width: 80vw;
      height: 100vh;
      height: 100dvh;
      background: rgba(10, 10, 18, 0.97);
      backdrop-filter: blur(12px);
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 495;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
      flex-direction: column;
      overflow-y: auto;
      overscroll-behavior: contain;
    }
    .mobile-drawer.open {
      transform: translateX(0);
    }

    .mobile-drawer-content {
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .mobile-section {
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .mobile-section:last-child {
      border-bottom: none;
    }

    .mobile-theme-label {
      display: block;
      font-family: "Exo", sans-serif;
      font-size: 0.7rem;
      font-weight: 900;
      letter-spacing: 0.15em;
      color: rgba(255, 200, 60, 0.9);
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .mobile-theme-select {
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
  .resize-handle.active {
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

  .overlay-bottom-left {
    position: absolute;
    bottom: 20px;
    left: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 280px;
    z-index: 50;
    pointer-events: none;
  }
  .overlay-bottom-left > * {
    pointer-events: auto;
  }

  .controls-wrapper {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
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

  .btn--danger {
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.5);
    color: #fca5a5;
  }
  .btn--danger:hover {
    background: rgba(239, 68, 68, 0.4);
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

  /* ── F-96: Floating Settings Gear FAB ── */
  .settings-fab {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 90;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid rgba(0, 255, 255, 0.2);
    background: rgba(10, 14, 30, 0.85);
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.3rem;
    cursor: pointer;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .settings-fab:hover,
  .settings-fab.active {
    border-color: rgba(0, 255, 255, 0.5);
    background: rgba(10, 14, 30, 0.95);
    transform: rotate(45deg);
    box-shadow: 0 4px 24px rgba(0, 255, 255, 0.15);
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
