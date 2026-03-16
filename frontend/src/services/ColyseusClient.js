import { Client } from "@colyseus/sdk";

/**
 * Colyseus client instance.
 *
 * By default it connects to ws://localhost:2567 which is the standard
 * Colyseus port used in docker-compose.yml.
 *
 * To override the URL set the VITE_COLYSEUS_URL environment variable
 * before starting the Vite dev server, for example:
 *   VITE_COLYSEUS_URL=ws://192.168.1.50:2567 npm run dev
 */
const endpoint = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_COLYSEUS_URL)
    ? import.meta.env.VITE_COLYSEUS_URL
    : "ws://localhost:2567";

const client = new Client(endpoint);

export default client;
