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

    function getRoomMapLabel(room: RoomListing): string {
        return room.metadata?.customMapName || room.metadata?.mapType || "standard";
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

        {#if selectedRoom}
            <div class="selected-room">
                <div class="selected-room__header">
                    <span class="selected-room__label">Selected Public Room</span>
                    <span class="selected-room__phase">{selectedRoom.metadata?.phase || "lobby"}</span>
                </div>
                <strong class="selected-room__host">{getRoomLabel(selectedRoom)}</strong>
                <div class="selected-room__meta">
                    <span>{selectedRoom.clients}/{selectedRoom.maxClients} players</span>
                    <span>{getRoomMapLabel(selectedRoom)}</span>
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
                            <span>{getRoomMapLabel(room)}</span>
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
        gap: var(--pax-space-4);
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
        background: var(--pf-surface-card);
    }

    .room-status,
    .selected-room,
    .signal-card,
    .manual-join,
    .chat-shell {
        padding: var(--pax-gap-md);
    }

    .room-status {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--pax-space-3);
    }

    .room-status__identity {
        display: grid;
        gap: var(--pax-space-1);
    }

    .room-status__label,
    .selected-room__label,
    .manual-join__label,
    .browser-header__label {
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-xs-plus);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--pf-muted);
    }

    .room-status__copy,
    .action-pill {
        min-height: var(--pf-pill-h);
        padding: 0 var(--pax-gap-md);
        border-radius: var(--pf-pill-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-surface-pill);
        color: var(--pf-muted-strong);
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-sm);
        font-weight: var(--pax-weight-bold);
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
        background: var(--pf-surface-card-hover);
        color: var(--pf-text);
    }

    .action-pill--primary {
        border-color: var(--pf-accent-soft);
        background: linear-gradient(135deg, var(--pf-cta-alt-a), var(--pf-cta-alt-b));
        color: var(--pf-text-on-accent);
    }

    .action-pill:disabled {
        opacity: 0.42;
        cursor: not-allowed;
    }

    .room-slots {
        display: flex;
        flex-direction: column;
        gap: var(--pax-gap-sm);
    }

    .room-slot {
        display: flex;
        align-items: center;
        gap: var(--pax-space-3);
        padding: var(--pax-space-3) var(--pax-gap-md);
    }

    .room-slot.is-local {
        border-color: var(--pf-accent-soft);
    }

    .room-slot__index {
        width: 24px;
        text-align: center;
        font-family: var(--pf-font-display);
        font-size: var(--pax-type-xs-plus);
        font-weight: var(--pax-weight-bold);
        color: var(--pf-heading);
    }

    .room-slot__identity {
        display: grid;
        gap: 3px;
    }

    .room-slot__identity strong,
    .selected-room__host,
    .room-browser__top strong {
        font-family: var(--pf-font-display);
        font-size: var(--pax-type-sm);
        font-weight: var(--pax-weight-bold);
        color: var(--pf-text);
    }

    .room-slot__identity span,
    .selected-room__meta,
    .room-browser__meta {
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-xs-plus);
        color: var(--pf-muted);
    }

    .selected-room__header,
    .browser-header,
    .room-browser__top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--pax-gap-sm);
    }

    .selected-room__phase,
    .room-browser__phase {
        padding: 5px var(--pax-gap-sm);
        border-radius: var(--pf-pill-radius);
        background: var(--pf-surface-pill-active);
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-xs);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--pf-muted-strong);
    }

    .selected-room__meta,
    .room-browser__meta,
    .room-browser__players {
        display: flex;
        flex-wrap: wrap;
        gap: var(--pax-space-2) var(--pax-space-3);
        margin-top: var(--pax-gap-sm);
    }

    .multiplayer-panel__actions,
    .chat-shell__composer,
    .manual-join__row {
        display: flex;
        flex-wrap: wrap;
        gap: var(--pax-gap-sm);
    }

    .manual-join input,
    .chat-shell__composer input {
        flex: 1;
        min-height: var(--pf-control-h);
        padding: 0 var(--pax-gap-md);
        border-radius: var(--pf-button-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-surface-control);
        color: var(--pf-text);
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-base);
        font-weight: var(--pax-weight-semibold);
        outline: none;
    }

    .room-browser {
        display: flex;
        flex-direction: column;
        gap: var(--pax-gap-sm);
        max-height: 440px;
        overflow-y: auto;
        padding-right: var(--pax-space-1);
    }

    .room-browser__card {
        display: grid;
        gap: var(--pax-space-2);
        padding: var(--pax-gap-md);
        text-align: left;
        cursor: pointer;
    }

    .room-browser__players span {
        padding: var(--pax-space-1) var(--pax-space-2);
        border-radius: var(--pf-pill-radius);
        background: var(--pf-surface-tag);
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-xs-plus);
        color: var(--pf-muted-strong);
    }

    .chat-shell__toggle {
        display: inline-flex;
        align-items: center;
        gap: var(--pax-space-2);
        padding: 0;
        border: none;
        background: none;
        color: var(--pf-text);
        font-family: var(--pf-font-display);
        font-size: var(--pax-type-sm);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
    }

    .chat-shell__count {
        min-width: 22px;
        min-height: 22px;
        padding: 0 var(--pax-gap-xs);
        border-radius: var(--pf-pill-radius);
        display: inline-grid;
        place-items: center;
        background: var(--pf-surface-tag-active);
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-xs-plus);
    }

    .chat-shell__messages {
        display: flex;
        flex-direction: column;
        gap: var(--pax-space-2);
        max-height: 180px;
        overflow-y: auto;
        margin-top: var(--pax-space-3);
        padding-right: var(--pax-space-1);
    }

    .chat-shell__message {
        display: flex;
        gap: var(--pax-space-2);
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-sm-plus);
    }

    .chat-shell__sender {
        font-weight: var(--pax-weight-bold);
    }

    .chat-shell__text {
        color: var(--pf-muted-strong);
    }

    .signal-card {
        color: var(--pf-muted-strong);
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-sm-plus);
    }

    .signal-card--error {
        border-color: var(--pf-border-danger);
        background: var(--pf-surface-danger);
        color: var(--pf-danger);
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
