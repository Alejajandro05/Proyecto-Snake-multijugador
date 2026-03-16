import {
    defineServer,
    defineRoom,
    monitor,
    playground,
    createRouter,
    createEndpoint,
} from "colyseus";

import { SnakeRoom } from "./rooms/SnakeRoom.js";

const server = defineServer({
    rooms: {
        snake_room: defineRoom(SnakeRoom)
    },

    routes: createRouter({
        api_hello: createEndpoint("/api/hello", { method: "GET", }, async (ctx) => {
            return { message: "Hello World" }
        })
    }),

    express: (app) => {
        // Allow cross-origin requests from the Phaser frontend
        const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
        app.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", allowedOrigin);
            res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            if (req.method === "OPTIONS") {
                res.sendStatus(200);
                return;
            }
            next();
        });

        app.get("/hi", (req, res) => {
            res.send("Snake Multiplayer backend running!");
        });

        app.use("/monitor", monitor());

        if (process.env.NODE_ENV !== "production") {
            app.use("/", playground());
        }
    }
});

export default server;
