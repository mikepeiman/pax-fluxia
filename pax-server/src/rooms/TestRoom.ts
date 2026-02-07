// Minimal test room - simplest possible room for debugging WebSocket handshake
import { Room, Client } from "colyseus";
import { MinimalState, MinimalPlayerSchema } from "../schema/MinimalState";
import { log } from "../utils/logger";

export class TestRoom extends Room {
    // State declared, will be set in onCreate
    declare state: MinimalState;

    onCreate(options: any) {
        log.sys('TestRoom', 'onCreate starting...', options);
        this.setState(new MinimalState());
        log.sys('TestRoom', `State set, status: ${this.state.status}`);
    }

    onJoin(client: Client, options?: any) {
        log.net('TestRoom', `Client JOINED: ${client.sessionId}`);

        const player = new MinimalPlayerSchema();
        player.id = client.sessionId;
        player.name = options?.name || "TestPlayer";

        this.state.players.set(client.sessionId, player);
        log.net('TestRoom', `Player added: ${player.name}`);
    }

    onLeave(client: Client) {
        log.net('TestRoom', `Client LEFT: ${client.sessionId}`);
        this.state.players.delete(client.sessionId);
    }

    onDispose() {
        log.sys('TestRoom', 'Room disposed');
    }
}
