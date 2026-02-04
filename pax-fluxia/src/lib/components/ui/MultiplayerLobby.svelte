<script lang="ts">
    import { multiplayerStore } from "$lib/stores/multiplayerStore.svelte";

    // Local state
    let joinRoomId = $state("");
    let playerName = $state("");
    let playerCount = $state(4);
    let mapType = $state<"standard" | "debug">("standard");

    // Handlers
    async function handleCreateRoom() {
        await multiplayerStore.createRoom({ playerCount, mapType });
    }

    async function handleJoinRoom() {
        if (joinRoomId.trim()) {
            await multiplayerStore.joinRoom(joinRoomId.trim());
        }
    }

    function handleStartGame() {
        multiplayerStore.startGame();
    }

    function handleLeaveRoom() {
        multiplayerStore.leaveRoom();
    }

    function copyRoomId() {
        if (multiplayerStore.roomId) {
            navigator.clipboard.writeText(multiplayerStore.roomId);
        }
    }
</script>

<div class="lobby-container">
    {#if multiplayerStore.isConnecting}
        <div class="loading">
            <div class="spinner"></div>
            <p>Connecting...</p>
        </div>
    {:else if !multiplayerStore.isConnected}
        <!-- Not connected - show join/create options -->
        <div class="lobby-panel">
            <h2>Multiplayer</h2>

            <!-- Create Room Section -->
            <section class="lobby-section">
                <h3>Create Game</h3>
                <div class="form-group">
                    <label for="playerCount">Players</label>
                    <select id="playerCount" bind:value={playerCount}>
                        <option value={2}>2 Players</option>
                        <option value={3}>3 Players</option>
                        <option value={4}>4 Players</option>
                        <option value={5}>5 Players</option>
                        <option value={6}>6 Players</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="mapType">Map</label>
                    <select id="mapType" bind:value={mapType}>
                        <option value="standard">Standard</option>
                        <option value="debug">Debug (4 stars)</option>
                    </select>
                </div>
                <button class="btn-primary" onclick={handleCreateRoom}>
                    Create Room
                </button>
            </section>

            <div class="divider">OR</div>

            <!-- Join Room Section -->
            <section class="lobby-section">
                <h3>Join Game</h3>
                <div class="form-group">
                    <label for="roomId">Room ID</label>
                    <input
                        id="roomId"
                        type="text"
                        placeholder="Enter room ID"
                        bind:value={joinRoomId}
                    />
                </div>
                <button
                    class="btn-secondary"
                    onclick={handleJoinRoom}
                    disabled={!joinRoomId.trim()}
                >
                    Join Room
                </button>
            </section>

            {#if multiplayerStore.connectionError}
                <div class="error-message">
                    {multiplayerStore.connectionError}
                </div>
            {/if}
        </div>
    {:else}
        <!-- Connected - show room info -->
        <div class="lobby-panel">
            <h2>Game Lobby</h2>

            <!-- Room Info -->
            <section class="room-info">
                <div class="room-id-row">
                    <span class="label">Room ID:</span>
                    <code class="room-id">{multiplayerStore.roomId}</code>
                    <button
                        class="btn-icon"
                        onclick={copyRoomId}
                        title="Copy Room ID"
                    >
                        📋
                    </button>
                </div>
                <div class="player-count">
                    {multiplayerStore.playerCount} / {multiplayerStore.maxPlayers}
                    Players
                </div>
            </section>

            <!-- Players List -->
            <section class="players-list">
                <h3>Players</h3>
                <ul>
                    {#each multiplayerStore.players as player}
                        <li
                            class="player-item"
                            style:--player-color={player.color}
                        >
                            <span
                                class="player-color"
                                style:background-color={player.color}
                            ></span>
                            <span class="player-name">
                                {player.name}
                                {#if player.isAI}
                                    <span class="badge ai">AI</span>
                                {/if}
                            </span>
                        </li>
                    {/each}
                </ul>
            </section>

            <!-- Actions -->
            <section class="lobby-actions">
                {#if multiplayerStore.isHost}
                    <button
                        class="btn-primary btn-large"
                        onclick={handleStartGame}
                    >
                        🚀 Start Game
                    </button>
                {:else}
                    <p class="waiting-text">Waiting for host to start...</p>
                {/if}
                <button class="btn-secondary" onclick={handleLeaveRoom}>
                    Leave Room
                </button>
            </section>
        </div>
    {/if}
</div>

<style>
    .lobby-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100%;
        padding: 2rem;
        color: #fff;
    }

    .lobby-panel {
        background: linear-gradient(
            135deg,
            rgba(20, 25, 40, 0.95),
            rgba(10, 15, 30, 0.98)
        );
        border: 1px solid rgba(100, 150, 255, 0.3);
        border-radius: 16px;
        padding: 2rem;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    h2 {
        margin: 0 0 1.5rem 0;
        text-align: center;
        font-size: 1.75rem;
        background: linear-gradient(135deg, #4488ff, #00ffff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    h3 {
        margin: 0 0 1rem 0;
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.8);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .lobby-section {
        margin-bottom: 1.5rem;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.7);
    }

    .form-group input,
    .form-group select {
        width: 100%;
        padding: 0.75rem 1rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: #fff;
        font-size: 1rem;
    }

    .form-group input:focus,
    .form-group select:focus {
        outline: none;
        border-color: rgba(100, 150, 255, 0.6);
        box-shadow: 0 0 0 3px rgba(100, 150, 255, 0.2);
    }

    .btn-primary,
    .btn-secondary {
        width: 100%;
        padding: 0.875rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .btn-primary {
        background: linear-gradient(135deg, #4488ff, #00bbff);
        color: #fff;
    }

    .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(68, 136, 255, 0.4);
    }

    .btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.15);
    }

    .btn-secondary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .btn-large {
        padding: 1rem 2rem;
        font-size: 1.125rem;
    }

    .btn-icon {
        padding: 0.5rem;
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        opacity: 0.7;
        transition: opacity 0.2s;
    }

    .btn-icon:hover {
        opacity: 1;
    }

    .divider {
        text-align: center;
        margin: 1.5rem 0;
        color: rgba(255, 255, 255, 0.4);
        position: relative;
    }

    .divider::before,
    .divider::after {
        content: "";
        position: absolute;
        top: 50%;
        width: 40%;
        height: 1px;
        background: rgba(255, 255, 255, 0.2);
    }

    .divider::before {
        left: 0;
    }

    .divider::after {
        right: 0;
    }

    .error-message {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: rgba(255, 68, 68, 0.2);
        border: 1px solid rgba(255, 68, 68, 0.4);
        border-radius: 8px;
        color: #ff6b6b;
        font-size: 0.875rem;
    }

    .room-info {
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
    }

    .room-id-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .room-id {
        flex: 1;
        padding: 0.25rem 0.5rem;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.875rem;
        color: #00ffff;
    }

    .player-count {
        text-align: center;
        font-size: 1.125rem;
        color: rgba(255, 255, 255, 0.8);
    }

    .players-list {
        margin-bottom: 1.5rem;
    }

    .players-list ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .player-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border-left: 3px solid var(--player-color);
    }

    .player-color {
        width: 24px;
        height: 24px;
        border-radius: 50%;
    }

    .player-name {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .badge {
        padding: 0.125rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        text-transform: uppercase;
    }

    .badge.ai {
        background: rgba(170, 102, 255, 0.3);
        color: #aa66ff;
    }

    .lobby-actions {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .waiting-text {
        text-align: center;
        color: rgba(255, 255, 255, 0.6);
        font-style: italic;
        margin: 0.5rem 0;
    }

    .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255, 255, 255, 0.2);
        border-top-color: #4488ff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
