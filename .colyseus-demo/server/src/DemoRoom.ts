// Demo room following Colyseus 0.17 pattern
import { Room } from "colyseus";
import { DemoState, Player } from "./DemoState";

export class DemoRoom extends Room<DemoState> {
    // State as class property (Colyseus 0.17 pattern)
    state = new DemoState();
    maxClients = 4;

    onCreate(options: any) {
        console.log("🎮 DemoRoom created with options:", options);
        this.state.phase = "lobby";
    }

    onJoin(client: any, options: any) {
        console.log(`👤 Player joined: ${client.sessionId}`);

        const player = new Player();
        player.name = options?.name || `Player ${this.state.players.size + 1}`;
        player.sessionId = client.sessionId;

        this.state.players.set(client.sessionId, player);
        this.state.playerCount = this.state.players.size;

        console.log(`   → ${player.name} (${client.sessionId})`);
    }

    onLeave(client: any, code?: number) {
        console.log(`👤 Player left: ${client.sessionId} (code: ${code})`);
        this.state.players.delete(client.sessionId);
        this.state.playerCount = this.state.players.size;
    }
}
