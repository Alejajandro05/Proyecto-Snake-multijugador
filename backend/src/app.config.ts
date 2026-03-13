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
