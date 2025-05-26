<script>
  /**
   * Main Game Interface Component for Pax Fluxia
   * Phase 1: Basic UI and connection status
   */
  
  import { onMount, onDestroy } from 'svelte';
  import { gameState, isConnected, currentPlayerId, stars, players, gameStateActions } from '../lib/stores/gameState.ts';
  import { MockNakamaClient } from '../lib/network/MockNakamaClient.ts';

  // Nakama configuration - in production this would come from environment variables
  const nakamaConfig = {
    serverKey: 'defaultkey',
    host: '127.0.0.1',
    port: '7350',
    useSSL: false
  };

  let nakamaClient;
  let connectionStatus = 'Disconnected';
  let matchId = '';
  let deviceId = '';

  // Generate a simple device ID for testing
  function generateDeviceId() {
    return 'device_' + Math.random().toString(36).substr(2, 9);
  }

  // Initialize Nakama client
  onMount(() => {
    deviceId = generateDeviceId();
    nakamaClient = new MockNakamaClient(nakamaConfig);
    
    // Set up callbacks
    nakamaClient.setGameStateCallback((state) => {
      gameStateActions.updateGameState(state);
    });
    
    nakamaClient.setConnectionStatusCallback((connected) => {
      gameStateActions.setConnectionStatus(connected);
      connectionStatus = connected ? 'Connected' : 'Disconnected';
    });
  });

  // Connect to Nakama
  async function connect() {
    try {
      connectionStatus = 'Connecting...';
      await nakamaClient.authenticate(deviceId);
      await nakamaClient.connect();
      connectionStatus = 'Connected';
    } catch (error) {
      console.error('Connection failed:', error);
      connectionStatus = 'Connection Failed';
    }
  }

  // Create a new match
  async function createMatch() {
    try {
      const newMatchId = await nakamaClient.createMatch();
      matchId = newMatchId;
      // Set current player ID to the first player for testing
      gameStateActions.setCurrentPlayerId('p1');
    } catch (error) {
      console.error('Failed to create match:', error);
    }
  }

  // Join an existing match
  async function joinMatch() {
    if (!matchId.trim()) {
      alert('Please enter a match ID');
      return;
    }
    
    try {
      await nakamaClient.joinMatch(matchId.trim());
      // Set current player ID to the second player for testing
      gameStateActions.setCurrentPlayerId('p2');
    } catch (error) {
      console.error('Failed to join match:', error);
    }
  }

  // Disconnect from Nakama
  async function disconnect() {
    try {
      await nakamaClient.disconnect();
      gameStateActions.clearGameState();
      gameStateActions.setCurrentPlayerId(null);
      connectionStatus = 'Disconnected';
      matchId = '';
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }

  // Toggle game pause
  function togglePause() {
    nakamaClient.togglePause();
  }

  // Set game speed
  function setGameSpeed(multiplier) {
    nakamaClient.setGameSpeed(multiplier);
  }

  // Cleanup on component destroy
  onDestroy(() => {
    if (nakamaClient) {
      nakamaClient.disconnect();
    }
  });

  // Reactive statements for display
  $: starsArray = Object.values($stars);
  $: playersArray = Object.values($players);
</script>

<div class="game-interface">
  <div class="header">
    <h1>Pax Fluxia - Phase 1</h1>
    <div class="connection-status">
      Status: <span class="status" class:connected={$isConnected}>{connectionStatus}</span>
    </div>
  </div>

  <div class="controls">
    <div class="connection-controls">
      <h3>Connection</h3>
      <button on:click={connect} disabled={$isConnected}>Connect</button>
      <button on:click={disconnect} disabled={!$isConnected}>Disconnect</button>
      <p>Device ID: {deviceId}</p>
    </div>

    <div class="match-controls">
      <h3>Match</h3>
      <button on:click={createMatch} disabled={!$isConnected}>Create Match</button>
      <div class="join-match">
        <input 
          type="text" 
          bind:value={matchId} 
          placeholder="Enter Match ID"
          disabled={!$isConnected}
        />
        <button on:click={joinMatch} disabled={!$isConnected || !matchId.trim()}>Join Match</button>
      </div>
      {#if nakamaClient?.getCurrentMatchId()}
        <p>Current Match: {nakamaClient.getCurrentMatchId()}</p>
      {/if}
    </div>

    {#if $gameState}
      <div class="game-controls">
        <h3>Game Controls</h3>
        <button on:click={togglePause}>
          {$gameState.isPaused ? 'Resume' : 'Pause'} Game
        </button>
        <div class="speed-controls">
          <label>Game Speed:</label>
          <button on:click={() => setGameSpeed(0.5)}>0.5x</button>
          <button on:click={() => setGameSpeed(1.0)}>1x</button>
          <button on:click={() => setGameSpeed(2.0)}>2x</button>
          <button on:click={() => setGameSpeed(4.0)}>4x</button>
        </div>
        <p>Current Speed: {$gameState.gameSpeedMultiplier}x</p>
        <p>Tick: {$gameState.tick}</p>
        <p>Paused: {$gameState.isPaused ? 'Yes' : 'No'}</p>
      </div>
    {/if}
  </div>

  {#if $gameState}
    <div class="game-state">
      <div class="players-panel">
        <h3>Players</h3>
        {#each playersArray as player}
          <div class="player" style="border-left: 4px solid {player.color}">
            <strong>{player.name}</strong>
            <p>Active Ships: {player.activeShipsTotal}</p>
            <p>Damaged Ships: {player.damagedShipsTotal}</p>
          </div>
        {/each}
      </div>

      <div class="stars-panel">
        <h3>Stars</h3>
        {#each starsArray as star}
          <div class="star" class:owned={star.ownerPlayerId === $currentPlayerId}>
            <strong>{star.id}</strong> ({star.starType})
            <p>Position: ({star.x}, {star.y})</p>
            <p>Owner: {star.ownerPlayerId || 'Neutral'}</p>
            <p>Active Ships: {star.activeShips}</p>
            <p>Damaged Ships: {star.damagedShips}</p>
            <p>Production: {Math.round(star.productionProgress * 100)}%</p>
            {#if star.currentOutgoingOrder}
              <p>Order: → {star.currentOutgoingOrder.targetStarId}</p>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .game-interface {
    padding: 20px;
    font-family: Arial, sans-serif;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 2px solid #333;
  }

  .connection-status {
    font-weight: bold;
  }

  .status {
    color: #ff4444;
  }

  .status.connected {
    color: #44ff44;
  }

  .controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
  }

  .connection-controls,
  .match-controls,
  .game-controls {
    padding: 15px;
    border: 1px solid #ccc;
    border-radius: 5px;
    background: #f9f9f9;
  }

  .join-match {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }

  .join-match input {
    flex: 1;
    padding: 5px;
  }

  .speed-controls {
    display: flex;
    gap: 10px;
    align-items: center;
    margin: 10px 0;
  }

  .speed-controls button {
    padding: 5px 10px;
  }

  button {
    padding: 8px 16px;
    margin: 5px;
    border: none;
    border-radius: 3px;
    background: #007bff;
    color: white;
    cursor: pointer;
  }

  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  button:hover:not(:disabled) {
    background: #0056b3;
  }

  .game-state {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 20px;
  }

  .players-panel,
  .stars-panel {
    border: 1px solid #ccc;
    border-radius: 5px;
    padding: 15px;
    background: #f9f9f9;
  }

  .player,
  .star {
    margin: 10px 0;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 3px;
    background: white;
  }

  .star.owned {
    background: #e8f5e8;
    border-color: #4caf50;
  }

  .player strong,
  .star strong {
    display: block;
    margin-bottom: 5px;
  }

  .player p,
  .star p {
    margin: 2px 0;
    font-size: 0.9em;
  }

  h3 {
    margin-top: 0;
    color: #333;
  }
</style>
