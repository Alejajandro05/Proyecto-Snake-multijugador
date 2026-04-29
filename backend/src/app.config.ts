import {
    defineServer,
    defineRoom,
} from "colyseus";

import { SnakeRoom } from "./rooms/SnakeRoom.js";
import { MyRoom } from "./rooms/MyRoom.js";
import { LobbyRoom } from "./rooms/LobbyRoom.js";

const serverConfig = {
    rooms: {
        snake_room: defineRoom(SnakeRoom),
        my_room: defineRoom(MyRoom),
        lobby_room: defineRoom(LobbyRoom),
    },
};

if (process.env.NODE_ENV !== "test") {
    serverConfig.express = (app) => {
        app.get("/api/hello", (req, res) => {
            res.json({ message: "Hello World" });
        });

        app.get("/api/lobbies", (req, res) => {
            res.json({ lobbies: LobbyRoom.listPublicLobbies() });
        });

        app.get("/api/lobbies/resolve", (req, res) => {
            const code = typeof req.query?.code === "string" ? req.query.code : "";
            const match = LobbyRoom.resolveInviteCode(code);
            res.json(match ?? { lobbyId: "" });
        });
    };
}

const server = defineServer(serverConfig);

export default server;
