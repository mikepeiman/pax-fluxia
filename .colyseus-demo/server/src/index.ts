// Colyseus 0.17 server entry point using defineServer pattern
import { defineServer, defineRoom } from "colyseus";
import { DemoRoom } from "./DemoRoom";

const PORT = 3000;

const server = defineServer({
    rooms: {
        demo_room: defineRoom(DemoRoom),
    },
});

server.listen(PORT).then(() => {
    console.log(`\n🚀 Demo Server running on port ${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log(`   Started: ${new Date().toLocaleTimeString()}\n`);
});
