import {
    defineServer,
    defineRoom,
    monitor,
    playground,
    createRouter,
    createEndpoint,
} from "colyseus";
import express from "express";

import { SnakeRoom } from "./rooms/SnakeRoom.js";
import { MyRoom } from "./rooms/MyRoom.js";
import { LobbyRoom } from "./rooms/LobbyRoom.js";

const server = defineServer({
    rooms: {
        snake_room: defineRoom(SnakeRoom),
        my_room: defineRoom(MyRoom),
        lobby_room: defineRoom(LobbyRoom),
    },

    routes: createRouter({
        api_hello: createEndpoint("/api/hello", { method: "GET", }, async (ctx) => {
            return { message: "Hello World" }
        }),
        api_lobbies: createEndpoint("/api/lobbies", { method: "GET" }, async () => {
            return { lobbies: LobbyRoom.listPublicLobbies() };
        }),
        api_lobbies_list: createEndpoint("/api/lobbies/list", { method: "POST" }, async () => {
            return { lobbies: LobbyRoom.listPublicLobbies() };
        }),
        api_lobbies_list_nonce: createEndpoint("/api/lobbies/list/:nonce", { method: "POST" }, async () => {
            return { lobbies: LobbyRoom.listPublicLobbies() };
        }),
    }),

    express: (app) => {
        app.use(express.json());
        app.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
            res.header("Access-Control-Allow-Headers", "Content-Type");

            if (req.method === "OPTIONS") {
                res.sendStatus(204);
                return;
            }

            next();
        });

        app.get("/hi", (req, res) => {
            res.send("Snake Multiplayer backend running!");
        });

        app.get("/api/lobbies/resolve", (req, res) => {
            const code = typeof req.query?.code === "string" ? req.query.code : "";
            const match = LobbyRoom.resolveInviteCode(code);
            res.json(match ?? { lobbyId: "" });
        });

        app.post("/api/lobbies/resolve", (req, res) => {
            const code = typeof req.body?.code === "string" ? req.body.code : "";
            const match = LobbyRoom.resolveInviteCode(code);
            res.json(match ?? { lobbyId: "" });
        });

        app.use("/monitor", monitor());

        if (process.env.NODE_ENV !== "production") {
            app.use("/", playground());
        }
    }
});

export default server;
