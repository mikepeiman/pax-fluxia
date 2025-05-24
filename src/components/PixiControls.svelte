<script>
  import { onMount, onDestroy } from "svelte";
  import { PixiGameManager } from "$lib/PixiGameManager.js";

  export let width = 1200;
  export let height = 800;

  let gameManager = null;
  let containerElement;
  let stats = {};
  let statsInterval;

  // Reactive settings
  let performanceMode = "high";
  let tickSpeed = 1.0;
  let tickDuration = 2000;
  let enableParticles = true;
  let enableTrails = true;
  let enableGlow = true;
  let enableAntialiasing = false;
  let numStars = 15;

  onMount(() => {
    initializeGame();
    startStatsUpdate();
  });

  onDestroy(() => {
    if (gameManager) {
      gameManager.destroy();
    }
    if (statsInterval) {
      clearInterval(statsInterval);
    }
  });

  function initializeGame() {
    if (gameManager) {
      gameManager.destroy();
    }

    gameManager = new PixiGameManager(containerElement, width, height);
    gameManager.numStars = numStars;

    // Apply initial settings
    applySettings();
  }

  function applySettings() {
    if (!gameManager) return;

    gameManager.setPerformanceMode(performanceMode);
    gameManager.setTickSpeed(tickSpeed);
    gameManager.setTickDuration(tickDuration);

    // Apply individual performance settings
    gameManager.animationEngine.enableGlow = enableGlow;
    gameManager.animationEngine.enableTrails = enableTrails;
    gameManager.animationEngine.enableAntialiasing = enableAntialiasing;
  }

  function startStatsUpdate() {
    statsInterval = setInterval(() => {
      if (gameManager) {
        stats = gameManager.getGameStats();
      }
    }, 100); // Update stats 10 times per second
  }

  // Control functions
  function toggleAnimation() {
    if (gameManager) {
      gameManager.toggleAnimation();
    }
  }

  function resetGame() {
    if (gameManager) {
      gameManager.resetGame();
    }
  }

  function changePerformanceMode(mode) {
    performanceMode = mode;
    if (gameManager) {
      gameManager.setPerformanceMode(mode);
    }
  }

  function updateTickSpeed() {
    if (gameManager) {
      gameManager.setTickSpeed(tickSpeed);
    }
  }

  function updateTickDuration() {
    if (gameManager) {
      gameManager.setTickDuration(tickDuration);
    }
  }

  function toggleSetting(setting) {
    switch (setting) {
      case "particles":
        enableParticles = !enableParticles;
        if (gameManager) {
          gameManager.togglePerformanceSetting("enableParticles");
        }
        break;
      case "trails":
        enableTrails = !enableTrails;
        if (gameManager) {
          gameManager.animationEngine.enableTrails = enableTrails;
        }
        break;
      case "glow":
        enableGlow = !enableGlow;
        if (gameManager) {
          gameManager.animationEngine.enableGlow = enableGlow;
        }
        break;
      case "antialiasing":
        enableAntialiasing = !enableAntialiasing;
        if (gameManager) {
          gameManager.animationEngine.enableAntialiasing = enableAntialiasing;
        }
        break;
    }
  }

  function regenerateStars() {
    if (gameManager) {
      gameManager.numStars = numStars;
      gameManager.resetGame();
    }
  }

  // Reactive statements
  $: if (gameManager && tickSpeed !== undefined) updateTickSpeed();
  $: if (gameManager && tickDuration !== undefined) updateTickDuration();
</script>

<div class="pixi-game-container">
  <div class="game-canvas" bind:this={containerElement}></div>

  <div class="controls-panel">
    <div class="panel-section">
      <h3 class="section-title">⚡ PAX FLUXIA ⚡</h3>
      <p class="subtitle">High-Performance Space Strategy</p>

      <!-- Game Controls -->
      <div class="control-group">
        <h4>Game Controls</h4>
        <div class="button-grid">
          <button class="control-btn primary" on:click={toggleAnimation}>
            {stats.fps
              ? gameManager?.isRunning
                ? "⏸️ Pause"
                : "▶️ Start"
              : "▶️ Start"}
          </button>
          <button class="control-btn secondary" on:click={resetGame}>
            🔄 Reset
          </button>
        </div>
      </div>

      <!-- Performance Mode -->
      <div class="control-group">
        <h4>Performance Mode</h4>
        <div class="performance-buttons">
          <button
            class="perf-btn {performanceMode === 'low' ? 'active' : ''}"
            on:click={() => changePerformanceMode("low")}>
            💚 Low
          </button>
          <button
            class="perf-btn {performanceMode === 'medium' ? 'active' : ''}"
            on:click={() => changePerformanceMode("medium")}>
            💛 Medium
          </button>
          <button
            class="perf-btn {performanceMode === 'high' ? 'active' : ''}"
            on:click={() => changePerformanceMode("high")}>
            ❤️ High
          </button>
        </div>
      </div>

      <!-- Tick Controls -->
      <div class="control-group">
        <h4>Tick System</h4>
        <div class="slider-group">
          <label>
            Tick Speed: {tickSpeed.toFixed(1)}x
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              bind:value={tickSpeed}
              class="slider" />
          </label>
          <label>
            Tick Duration: {tickDuration}ms
            <input
              type="range"
              min="500"
              max="5000"
              step="100"
              bind:value={tickDuration}
              class="slider" />
          </label>
        </div>
      </div>

      <!-- Visual Effects -->
      <div class="control-group">
        <h4>Visual Effects</h4>
        <div class="toggle-grid">
          <label class="toggle-item">
            <input
              type="checkbox"
              bind:checked={enableParticles}
              on:change={() => toggleSetting("particles")} />
            <span class="toggle-label">✨ Particles</span>
          </label>
          <label class="toggle-item">
            <input
              type="checkbox"
              bind:checked={enableTrails}
              on:change={() => toggleSetting("trails")} />
            <span class="toggle-label">💫 Ship Trails</span>
          </label>
          <label class="toggle-item">
            <input
              type="checkbox"
              bind:checked={enableGlow}
              on:change={() => toggleSetting("glow")} />
            <span class="toggle-label">🌟 Glow Effects</span>
          </label>
          <label class="toggle-item">
            <input
              type="checkbox"
              bind:checked={enableAntialiasing}
              on:change={() => toggleSetting("antialiasing")} />
            <span class="toggle-label">🎨 Antialiasing</span>
          </label>
        </div>
      </div>

      <!-- Galaxy Settings -->
      <div class="control-group">
        <h4>Galaxy Settings</h4>
        <div class="slider-group">
          <label>
            Number of Stars: {numStars}
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              bind:value={numStars}
              class="slider" />
          </label>
          <button
            class="control-btn secondary small"
            on:click={regenerateStars}>
            🌌 Regenerate Galaxy
          </button>
        </div>
      </div>

      <!-- Statistics -->
      <div class="control-group">
        <h4>Statistics</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">FPS:</span>
            <span class="stat-value">{stats.fps || "0"}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Tick:</span>
            <span class="stat-value">{stats.currentTick || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Stars:</span>
            <span class="stat-value">{stats.stars || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Ships:</span>
            <span class="stat-value">{stats.totalShips || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Particles:</span>
            <span class="stat-value">{stats.activeParticles || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Transferring:</span>
            <span class="stat-value">{stats.transferringShips || 0}</span>
          </div>
        </div>
      </div>

      <!-- Instructions -->
      <div class="control-group">
        <h4>Instructions</h4>
        <div class="instructions">
          <p>🖱️ <strong>Click</strong> a star to select it</p>
          <p>🎯 <strong>Click another star</strong> to send ships</p>
          <p>⌨️ <strong>Space:</strong> Pause/Resume</p>
          <p>⌨️ <strong>R:</strong> Reset game</p>
          <p>⌨️ <strong>1/2/3:</strong> Performance modes</p>
          <p>⌨️ <strong>Esc:</strong> Clear selection</p>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .pixi-game-container {
    display: flex;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #0a0a0f, #1a1a2e);
    font-family: "Courier New", monospace;
  }

  .game-canvas {
    flex: 1;
    position: relative;
  }

  .controls-panel {
    width: 320px;
    background: linear-gradient(180deg, #1a1a2e, #16213e);
    border-left: 2px solid rgba(255, 255, 255, 0.1);
    overflow-y: auto;
    padding: 20px;
  }

  .panel-section {
    color: white;
  }

  .section-title {
    font-size: 1.5rem;
    font-weight: bold;
    text-align: center;
    background: linear-gradient(45deg, #00d2d3, #54a0ff, #5f27cd);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 0.5rem;
    text-shadow: 0 0 20px rgba(147, 51, 234, 0.5);
  }

  .subtitle {
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    margin-bottom: 2rem;
  }

  .control-group {
    margin-bottom: 2rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .control-group h4 {
    margin: 0 0 1rem 0;
    color: #00d2d3;
    font-size: 1.1rem;
    border-bottom: 1px solid rgba(0, 210, 211, 0.3);
    padding-bottom: 0.5rem;
  }

  .button-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .control-btn {
    padding: 0.75rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .control-btn.primary {
    background: linear-gradient(45deg, #00d2d3, #54a0ff);
    color: white;
  }

  .control-btn.secondary {
    background: linear-gradient(45deg, #6c5ce7, #a29bfe);
    color: white;
  }

  .control-btn.small {
    padding: 0.5rem;
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }

  .control-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }

  .performance-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.5rem;
  }

  .perf-btn {
    padding: 0.5rem;
    border: 2px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .perf-btn.active {
    border-color: #00d2d3;
    background: rgba(0, 210, 211, 0.2);
    box-shadow: 0 0 15px rgba(0, 210, 211, 0.3);
  }

  .perf-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .slider-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .slider-group label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9rem;
  }

  .slider {
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    outline: none;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: linear-gradient(45deg, #00d2d3, #54a0ff);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 10px rgba(0, 210, 211, 0.5);
  }

  .slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: linear-gradient(45deg, #00d2d3, #54a0ff);
    border-radius: 50%;
    cursor: pointer;
    border: none;
    box-shadow: 0 0 10px rgba(0, 210, 211, 0.5);
  }

  .toggle-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .toggle-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9rem;
  }

  .toggle-item input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #00d2d3;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .stat-label {
    color: rgba(255, 255, 255, 0.7);
  }

  .stat-value {
    color: #00d2d3;
    font-weight: bold;
  }

  .instructions {
    font-size: 0.85rem;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.8);
  }

  .instructions p {
    margin: 0.5rem 0;
  }

  .instructions strong {
    color: #00d2d3;
  }

  /* Scrollbar styling */
  .controls-panel::-webkit-scrollbar {
    width: 6px;
  }

  .controls-panel::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  .controls-panel::-webkit-scrollbar-thumb {
    background: rgba(0, 210, 211, 0.5);
    border-radius: 3px;
  }

  .controls-panel::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 210, 211, 0.7);
  }
</style>
