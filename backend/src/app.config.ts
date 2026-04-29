import {
    defineServer,
    defineRoom,
} from "colyseus";
import type { Express, Request, Response } from "express";

import { SnakeRoom } from "./rooms/SnakeRoom.js";
import { MyRoom } from "./rooms/MyRoom.js";
import { LobbyRoom } from "./rooms/LobbyRoom.js";

const serverConfig: any = {
    rooms: {
        snake_room: defineRoom(SnakeRoom),
        my_room: defineRoom(MyRoom),
        lobby_room: defineRoom(LobbyRoom),
    },
};

if (process.env.NODE_ENV !== "test") {
    serverConfig.express = (app: Express) => {
        app.get("/api/hello", (_req: Request, res: Response) => {
            res.json({ message: "Hello World" });
        });

        app.get("/api/lobbies", (_req: Request, res: Response) => {
            res.json({ lobbies: LobbyRoom.listPublicLobbies() });
        });

        app.get("/api/lobbies/resolve", (req: Request, res: Response) => {
            const code = typeof req.query?.code === "string" ? req.query.code : "";
            const match = LobbyRoom.resolveInviteCode(code);
            res.json(match ?? { lobbyId: "" });
        });
    };
}

const server = defineServer(serverConfig);

export default server;
