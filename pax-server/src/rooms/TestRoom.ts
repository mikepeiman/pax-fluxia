// Minimal test room - simplest possible room for debugging WebSocket handshake
import { Room, Client } from "colyseus";
import { MinimalState, MinimalPlayerSchema } from "../schema/MinimalState";

export class TestRoom extends Room {
    // State declared, will be set in onCreate
    declare state: MinimalState;

    onCreate(options: any) {
        console.log("🧪 [TestRoom] onCreate starting...");
        console.log("🧪 [TestRoom] Options:", options);

        console.log("🧪 [TestRoom] Calling this.setState()...");
        this.setState(new MinimalState());

        console.log("🧪 [TestRoom] State set:", this.state);
        console.log("🧪 [TestRoom] State status:", this.state.status);
        console.log("✅ [TestRoom] onCreate complete");
    }

    onJoin(client: Client, options?: any) {
        console.log(`🧪 [TestRoom] Client JOINED: ${client.sessionId}`);

        const player = new MinimalPlayerSchema();
        player.id = client.sessionId;
        player.name = options?.name || "TestPlayer";

        this.state.players.set(client.sessionId, player);
        console.log(`🧪 [TestRoom] Player added: ${player.name}`);
    }

    onLeave(client: Client) {
        console.log(`🧪 [TestRoom] Client LEFT: ${client.sessionId}`);
        this.state.players.delete(client.sessionId);
    }

    onDispose() {
        console.log("🧪 [TestRoom] Room disposed");
    }
}
