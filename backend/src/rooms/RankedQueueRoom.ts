import { Room, Client, matchMaker } from "colyseus";
import { LeaderboardService, getFirebaseAuth } from "../services/LeaderboardService.js";

interface QueueTicket {
    client: Client;
    uid: string;         // UUID de Firebase
    playerName: string;
    winCount: number;    // Usamos victorias en vez de ELO
    joinedAt: number;
}

export class RankedQueueRoom extends Room {
    private queue: QueueTicket[] = [];

    async onCreate(options: any) {
        this.maxClients = 200;
        console.log("🏆 RankedQueueRoom creada y lista para emparejar.");

        // Revisamos la cola cada 2 segundos
        this.setSimulationInterval(() => this.processQueue(), 2000);
    }

    // EL MURO DE SEGURIDAD DEL BACKEND
    async onAuth(client: Client, options: any) {
        try {
            // 1. Verificamos la firma criptográfica del Token JWT
            const decodedToken = await getFirebaseAuth().verifyIdToken(options.token);
            const uid = decodedToken.uid;
            const playerName = options.playerName || "Jugador";

            // 2. Buscamos sus victorias actuales en tu LeaderboardService
            const allEntries = await LeaderboardService.getAll();
            const userEntry = allEntries.find(e => e.userUUID === uid);
            const winCount = userEntry ? userEntry.winCount : 0;

            console.log(`✅ Jugador verificado: ${playerName} (Victorias: ${winCount})`);
            return { uid, playerName, winCount };

        } catch (error) {
            console.error("❌ Intento de conexión Ranked bloqueado (Token inválido)");
            throw new Error("No autenticado o token caducado.");
        }
    }

    onJoin(client: Client, options: any, auth: any) {
        this.queue.push({
            client,
            uid: auth.uid,
            playerName: auth.playerName,
            winCount: auth.winCount,
            joinedAt: Date.now()
        });
    }

    onLeave(client: Client) {
        this.queue = this.queue.filter(t => t.client.sessionId !== client.sessionId);
    }

    private async processQueue() {
        if (this.queue.length < 2) return;

        this.queue.sort((a, b) => a.joinedAt - b.joinedAt);
        const now = Date.now();

        for (let i = 0; i < this.queue.length; i++) {
            const p1 = this.queue[i];

            for (let j = i + 1; j < this.queue.length; j++) {
                const p2 = this.queue[j];

                // EMPAREJAMIENTO POR VICTORIAS (Tolerancia inicial: 5 victorias de diferencia)
                // Se expande 1 victoria por cada segundo de espera para evitar colas infinitas.
                const waitingSecs = (now - p1.joinedAt) / 1000;
                const tolerance = 5 + waitingSecs;

                if (Math.abs(p1.winCount - p2.winCount) <= tolerance) {
                    await this.createMatch(p1, p2);
                    return;
                }
            }
        }
    }

    private async createMatch(p1: QueueTicket, p2: QueueTicket) {
        this.queue = this.queue.filter(t => t !== p1 && t !== p2);

        try {
            // Creamos el SnakeRoom competitivo en secreto
            const matchRoom = await matchMaker.createRoom("snake_room", {
                isRanked: true,
                gameMode: "normal",
                visibility: "private"
            });

            console.log(`⚔️ Match: ${matchRoom.roomId} | ${p1.playerName} vs ${p2.playerName}`);

            // Avisamos a los dos clientes
            const matchData = { roomId: matchRoom.roomId };
            p1.client.send("matchFound", matchData);
            p2.client.send("matchFound", matchData);

        } catch (e) {
            console.error("Error creando partida Ranked:", e);
            this.queue.push(p1, p2);
        }
    }
}
