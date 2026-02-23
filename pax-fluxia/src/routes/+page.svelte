<script lang="ts">
  import "../app.css";
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
  import { applyTheme, loadThemes, type GameTheme } from "$lib/config/themes";
  import { BUILTIN_THEMES } from "$lib/config/builtinThemes";

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
  let showSettingsPanel = $state(
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
  let userThemes = $state<GameTheme[]>(
    typeof window !== "undefined" ? loadThemes() : [],
  );
  let allThemes = $derived([...BUILTIN_THEMES, ...userThemes]);
  let selectedThemeName = $state<string>("");

  function handleApplyTheme(name: string) {
    const theme = allThemes.find((t) => t.name === name);
    if (!theme) return;
    applyTheme(theme);
    selectedThemeName = name;
    // Dispatch event so GameSettingsPanel can sync its reactive state
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pax-theme-applied", { detail: name }),
      );
    }
  }

  // Listen for StarInfoPanel toggle from GameSettingsPanel
  if (typeof window !== "undefined") {
    window.addEventListener("pax-star-info-toggle", ((e: CustomEvent) => {
      showStarInfoPanel = e.detail;
    }) as EventListener);
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
</script>

<svelte:head>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Exo:wght@400;700;900&family=Montserrat:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<main class="app-container">
  <TopBar
    onSettingsClick={gameStore.currentView !== "game"
      ? () => (showAudioSettings = true)
      : undefined}
    onHelpClick={() => alert("Help & controls guide coming soon!")}
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
        <!-- L3: SVG star speckle background -->
        <svg
          class="starfield-bg"
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern
              id="starfield"
              width="200"
              height="200"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="12" cy="45" r="0.6" fill="white" opacity="0.12" />
              <circle cx="67" cy="12" r="0.9" fill="white" opacity="0.07" />
              <circle cx="134" cy="78" r="0.4" fill="white" opacity="0.18" />
              <circle cx="45" cy="156" r="0.7" fill="white" opacity="0.09" />
              <circle cx="178" cy="34" r="0.5" fill="white" opacity="0.14" />
              <circle cx="89" cy="189" r="0.8" fill="white" opacity="0.06" />
              <circle cx="156" cy="123" r="0.3" fill="white" opacity="0.2" />
              <circle cx="23" cy="89" r="0.6" fill="white" opacity="0.1" />
              <circle cx="112" cy="167" r="0.5" fill="white" opacity="0.13" />
              <circle cx="167" cy="178" r="0.7" fill="white" opacity="0.08" />
              <circle cx="78" cy="67" r="0.4" fill="white" opacity="0.16" />
              <circle cx="145" cy="45" r="0.6" fill="white" opacity="0.11" />
              <circle cx="34" cy="134" r="0.5" fill="white" opacity="0.09" />
              <circle cx="189" cy="89" r="0.8" fill="white" opacity="0.05" />
              <circle cx="56" cy="23" r="0.3" fill="white" opacity="0.17" />
              <circle cx="123" cy="112" r="0.7" fill="white" opacity="0.07" />
              <circle cx="90" cy="145" r="0.4" fill="white" opacity="0.15" />
              <circle cx="178" cy="156" r="0.6" fill="white" opacity="0.1" />
              <circle cx="12" cy="178" r="0.5" fill="white" opacity="0.12" />
              <circle cx="145" cy="12" r="0.9" fill="white" opacity="0.06" />
              <circle cx="67" cy="100" r="0.3" fill="#aaddff" opacity="0.08" />
              <circle cx="100" cy="34" r="0.4" fill="#ffddaa" opacity="0.06" />
              <circle cx="156" cy="89" r="0.5" fill="#aaffdd" opacity="0.05" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#starfield)" />
        </svg>
        <GameCanvas />

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
            />

            <div class="action-buttons">
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
            value={selectedThemeName}
            onchange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              if (v) handleApplyTheme(v);
            }}
          >
            <option value="">Select Theme…</option>
            {#each allThemes as theme}
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
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #000;
    color: #fff;
    font-family: "Montserrat", sans-serif;
  }

  :global(h1, h2, h3, h4, .ship-count, .value, .tick, .star-id) {
    font-family: "Exo", sans-serif;
  }

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

  @media (max-width: 800px) {
    .game-layout {
      grid-template-columns: 1fr;
      grid-template-areas: "canvas";
    }
    .area-right,
    .area-controls {
      display: none;
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

  /* L3: SVG starfield — above canvas for visibility */
  .starfield-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
    opacity: 0.8;
    /* L2: slow drift animation on starfield */
    animation: nebula-drift 90s ease-in-out infinite;
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
</style>
