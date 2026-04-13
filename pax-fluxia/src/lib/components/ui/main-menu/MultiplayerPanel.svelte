<script lang="ts">
    import { multiplayerStore, type RoomListing } from "$lib/stores/multiplayerStore.svelte";

    type MapMode = "random" | "classic" | "custom";

    interface Props {
        mapMode: MapMode;
        selectedRoomId: string | null;
        onSelectRoom: (roomId: string) => void;
    }

    let { mapMode, selectedRoomId, onSelectRoom }: Props = $props();

    let joinRoomId = $state("");
    let chatOpen = $state(false);
    let chatInput = $state("");

    const selectedRoom = $derived(
        multiplayerStore.availableRooms.find((room) => room.roomId === selectedRoomId) ?? null,
    );

    async function handleManualJoin() {
        if (!joinRoomId.trim()) return;
        await multiplayerStore.joinRoom(joinRoomId.trim());
    }

    function copyRoomId() {
        if (multiplayerStore.roomId) {
            navigator.clipboard.writeText(multiplayerStore.roomId);
        }
    }

    function sendChat() {
        if (!chatInput.trim()) return;
        multiplayerStore.sendChat(chatInput);
        chatInput = "";
    }

    function getRoomLabel(room: RoomListing): string {
        return (
            room.metadata?.publicRoomLabel ||
            room.metadata?.hostName ||
            room.name ||
            "Unknown"
        );
    }
</script>

<section class="menu-panel multiplayer-panel">
    <div class="menu-panel__header">
        <div>
            <h2 class="menu-panel__eyebrow">Multiplayer</h2>
            <p class="menu-panel__title">Public lobbies and live room state</p>
        </div>
    </div>

    {#if multiplayerStore.isConnected || multiplayerStore.isLobbyConnected}
        {#if multiplayerStore.isConnected}
            <div class="room-status">
                <div class="room-status__identity">
                    <span class="room-status__label">Room</span>
                    <strong>{multiplayerStore.roomId}</strong>
                </div>
                <button type="button" class="room-status__copy" onclick={copyRoomId}>
                    Copy ID
                </button>
            </div>

            <div class="room-slots">
                {#each multiplayerStore.players as player, index}
                    <div
                        class="room-slot"
                        class:is-local={player.sessionId === multiplayerStore.localSessionId}
                    >
                        <span class="room-slot__index">{index + 1}</span>
                        <div class="room-slot__identity">
                            <strong>{player.name}</strong>
                            <span>
                                {#if player.sessionId === multiplayerStore.hostSessionId}Host{/if}
                                {#if player.sessionId === multiplayerStore.localSessionId}
                                    {player.sessionId === multiplayerStore.hostSessionId ? " / " : ""}You
                                {/if}
                                {#if player.isAI}
                                    {(player.sessionId === multiplayerStore.hostSessionId ||
                                        player.sessionId === multiplayerStore.localSessionId)
                                        ? " / "
                                        : ""}AI
                                {/if}
                            </span>
                        </div>
                    </div>
                {/each}
            </div>

            <div class="multiplayer-panel__actions">
                {#if multiplayerStore.isHost}
                    <button type="button" class="action-pill action-pill--primary" onclick={() => multiplayerStore.startGame()}>
                        Start Game
                    </button>
                {:else}
                    <button type="button" class="action-pill" onclick={() => multiplayerStore.voteToStart()}>
                        Vote To Start
                    </button>
                {/if}

                <button type="button" class="action-pill" onclick={() => multiplayerStore.leaveRoom()}>
                    Leave Room
                </button>

                {#if multiplayerStore.isHost}
                    <button type="button" class="action-pill" onclick={() => multiplayerStore.disposeRoom()}>
                        Dispose Room
                    </button>
                {/if}
            </div>

            {#if multiplayerStore.startVoteInfo && !multiplayerStore.isHost}
                <div class="signal-card">
                    {multiplayerStore.startVoteInfo.votes}/{multiplayerStore.startVoteInfo.needed} start votes
                </div>
            {/if}

            <div class="chat-shell">
                <button
                    type="button"
                    class="chat-shell__toggle"
                    onclick={() => (chatOpen = !chatOpen)}
                >
                    {chatOpen ? "Hide Chat" : "Show Chat"}
                    {#if multiplayerStore.chatMessages.length > 0}
                        <span class="chat-shell__count">{multiplayerStore.chatMessages.length}</span>
                    {/if}
                </button>

                {#if chatOpen}
                    <div class="chat-shell__messages">
                        {#if multiplayerStore.chatMessages.length === 0}
                            <div class="signal-card">No messages yet</div>
                        {:else}
                            {#each multiplayerStore.chatMessages as message}
                                <div class="chat-shell__message">
                                    <span
                                        class="chat-shell__sender"
                                        style={`color:${message.senderColor}`}
                                    >
                                        {message.senderName}
                                    </span>
                                    <span class="chat-shell__text">{message.text}</span>
                                </div>
                            {/each}
                        {/if}
                    </div>

                    <div class="chat-shell__composer">
                        <input
                            type="text"
                            value={chatInput}
                            placeholder="Type a message..."
                            oninput={(event) =>
                                (chatInput = (event.currentTarget as HTMLInputElement).value)}
                            onkeydown={(event) => {
                                if (event.key === "Enter") {
                                    sendChat();
                                }
                            }}
                        />
                        <button type="button" class="action-pill action-pill--primary" onclick={sendChat}>
                            Send
                        </button>
                    </div>
                {/if}
            </div>
        {:else}
            <div class="signal-card">Connecting to public lobby feed...</div>
        {/if}
    {:else if multiplayerStore.isConnecting}
        <div class="signal-card">Connecting...</div>
    {:else}
        <div class="manual-join">
            <label class="manual-join__label" for="room-id-input">Room ID</label>
            <div class="manual-join__row">
                <input
                    id="room-id-input"
                    type="text"
                    value={joinRoomId}
                    placeholder="Enter room ID"
                    oninput={(event) =>
                        (joinRoomId = (event.currentTarget as HTMLInputElement).value)}
                />
                <button
                    type="button"
                    class="action-pill"
                    onclick={handleManualJoin}
                    disabled={!joinRoomId.trim()}
                >
                    Join
                </button>
            </div>
        </div>

        {#if mapMode === "custom"}
            <div class="signal-card">
                Custom maps currently launch in single-player only.
            </div>
        {/if}

        {#if selectedRoom}
            <div class="selected-room">
                <div class="selected-room__header">
                    <span class="selected-room__label">Selected Public Room</span>
                    <span class="selected-room__phase">{selectedRoom.metadata?.phase || "lobby"}</span>
                </div>
                <strong class="selected-room__host">{getRoomLabel(selectedRoom)}</strong>
                <div class="selected-room__meta">
                    <span>{selectedRoom.clients}/{selectedRoom.maxClients} players</span>
                    <span>{selectedRoom.metadata?.mapType || "standard"}</span>
                    <span>{selectedRoom.metadata?.starsPerPlayer || "?"} stars / player</span>
                </div>
            </div>
        {/if}

        <div class="browser-header">
            <span class="browser-header__label">Public Lobbies</span>
            <button
                type="button"
                class="action-pill"
                onclick={() => multiplayerStore.fetchRooms()}
                disabled={multiplayerStore.isFetchingRooms}
            >
                Refresh
            </button>
        </div>

        {#if multiplayerStore.isFetchingRooms}
            <div class="signal-card">Scanning public rooms...</div>
        {:else if multiplayerStore.availableRooms.length === 0}
            <div class="signal-card">No rooms available</div>
        {:else}
            <div class="room-browser">
                {#each multiplayerStore.availableRooms as room}
                    <button
                        type="button"
                        class="room-browser__card"
                        class:is-selected={selectedRoomId === room.roomId}
                        onclick={() => onSelectRoom(room.roomId)}
                    >
                        <div class="room-browser__top">
                            <strong>{getRoomLabel(room)}</strong>
                            <span class="room-browser__phase">{room.metadata?.phase || "lobby"}</span>
                        </div>

                        <div class="room-browser__meta">
                            <span>{room.clients}/{room.maxClients} players</span>
                            <span>{room.metadata?.mapType || "standard"}</span>
                            <span>{room.metadata?.shipsPerStar || "?"} ships / star</span>
                        </div>

                        {#if room.metadata?.playerNames?.length}
                            <div class="room-browser__players">
                                {#each room.metadata.playerNames as playerName}
                                    <span>{playerName}</span>
                                {/each}
                            </div>
                        {/if}
                    </button>
                {/each}
            </div>
        {/if}

        {#if multiplayerStore.connectionError}
            <div class="signal-card signal-card--error">{multiplayerStore.connectionError}</div>
        {/if}
    {/if}
</section>

<style>
    .multiplayer-panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .room-status,
    .selected-room,
    .signal-card,
    .room-slot,
    .manual-join,
    .room-browser__card,
    .chat-shell {
        border-radius: 16px;
        border: 1px solid var(--pf-border-soft);
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 42%),
            rgba(255, 255, 255, 0.025);
    }

    .room-status,
    .selected-room,
    .signal-card,
    .manual-join,
    .chat-shell {
        padding: 14px;
    }

    .room-status {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
    }

    .room-status__identity {
        display: grid;
        gap: 4px;
    }

    .room-status__label,
    .selected-room__label,
    .manual-join__label,
    .browser-header__label {
        font-family: "Rajdhani", sans-serif;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--pf-muted);
    }

    .room-status__copy,
    .action-pill {
        min-height: var(--pf-pill-h);
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid var(--pf-border-soft);
        background: rgba(255, 255, 255, 0.04);
        color: var(--pf-muted-strong);
        font-family: "Rajdhani", sans-serif;
        font-size: 0.86rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease;
    }

    .room-status__copy:hover,
    .action-pill:hover:enabled,
    .room-browser__card:hover,
    .room-browser__card.is-selected {
        border-color: var(--pf-accent-soft);
        background: rgba(255, 255, 255, 0.07);
        color: var(--pf-text);
    }

    .action-pill--primary {
        border-color: var(--pf-accent-soft);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
        color: var(--pf-text);
    }

    .action-pill:disabled {
        opacity: 0.42;
        cursor: not-allowed;
    }

    .room-slots {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .room-slot {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
    }

    .room-slot.is-local {
        border-color: var(--pf-accent-soft);
    }

    .room-slot__index {
        width: 24px;
        text-align: center;
        font-family: "Oxanium", sans-serif;
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--pf-heading);
    }

    .room-slot__identity {
        display: grid;
        gap: 3px;
    }

    .room-slot__identity strong,
    .selected-room__host,
    .room-browser__top strong {
        font-family: "Oxanium", sans-serif;
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--pf-text);
    }

    .room-slot__identity span,
    .selected-room__meta,
    .room-browser__meta {
        font-family: "Rajdhani", sans-serif;
        font-size: 0.84rem;
        color: var(--pf-muted);
    }

    .selected-room__header,
    .browser-header,
    .room-browser__top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
    }

    .selected-room__phase,
    .room-browser__phase {
        padding: 5px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        font-family: "Rajdhani", sans-serif;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--pf-muted-strong);
    }

    .selected-room__meta,
    .room-browser__meta,
    .room-browser__players {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 12px;
        margin-top: 10px;
    }

    .multiplayer-panel__actions,
    .chat-shell__composer,
    .manual-join__row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }

    .manual-join input,
    .chat-shell__composer input {
        flex: 1;
        min-height: var(--pf-control-h);
        padding: 0 14px;
        border-radius: 12px;
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-control-bg);
        color: var(--pf-text);
        font-family: "Rajdhani", sans-serif;
        font-size: 1rem;
        font-weight: 600;
        outline: none;
    }

    .room-browser {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 440px;
        overflow-y: auto;
        padding-right: 4px;
    }

    .room-browser__card {
        display: grid;
        gap: 8px;
        padding: 14px;
        text-align: left;
        cursor: pointer;
    }

    .room-browser__players span {
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        font-family: "Rajdhani", sans-serif;
        font-size: 0.8rem;
        color: var(--pf-muted-strong);
    }

    .chat-shell__toggle {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0;
        border: none;
        background: none;
        color: var(--pf-text);
        font-family: "Oxanium", sans-serif;
        font-size: 0.86rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
    }

    .chat-shell__count {
        min-width: 22px;
        min-height: 22px;
        padding: 0 6px;
        border-radius: 999px;
        display: inline-grid;
        place-items: center;
        background: rgba(255, 255, 255, 0.06);
        font-family: "Rajdhani", sans-serif;
        font-size: 0.8rem;
    }

    .chat-shell__messages {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 180px;
        overflow-y: auto;
        margin-top: 12px;
        padding-right: 4px;
    }

    .chat-shell__message {
        display: flex;
        gap: 8px;
        font-family: "Rajdhani", sans-serif;
        font-size: 0.92rem;
    }

    .chat-shell__sender {
        font-weight: 700;
    }

    .chat-shell__text {
        color: var(--pf-muted-strong);
    }

    .signal-card {
        color: var(--pf-muted-strong);
        font-family: "Rajdhani", sans-serif;
        font-size: 0.96rem;
    }

    .signal-card--error {
        border-color: rgba(255, 110, 110, 0.3);
        color: #ffc0c0;
    }

    @media (max-width: 640px) {
        .room-status,
        .browser-header,
        .manual-join__row,
        .chat-shell__composer {
            flex-direction: column;
            align-items: stretch;
        }
    }
</style>
