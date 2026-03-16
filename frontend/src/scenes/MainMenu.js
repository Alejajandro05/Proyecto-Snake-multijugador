import { Client } from "@colyseus/sdk";

const BACKEND_URL = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_COLYSEUS_URL)
    ? import.meta.env.VITE_COLYSEUS_URL
    : "ws://localhost:2567";

export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        this.cameras.main.setBackgroundColor(0x1a1a2e);
        this.add.image(512, 384, 'background').setAlpha(0.4);

        this.add.text(512, 180, '🐍 Snake Multijugador', {
            fontFamily: 'Arial Black',
            fontSize: 48,
            color: '#00ff88',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(512, 290, 'Hasta 4 jugadores en línea', {
            fontFamily: 'Arial',
            fontSize: 20,
            color: '#aaaaaa',
            align: 'center'
        }).setOrigin(0.5);

        this.statusText = this.add.text(512, 400, 'Haz clic o pulsa ESPACIO para jugar', {
            fontFamily: 'Arial',
            fontSize: 28,
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(512, 560, '← ↑ ↓ → o W A S D para moverse', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#888888',
            align: 'center'
        }).setOrigin(0.5);

        this.isConnecting = false;
        this.input.once('pointerdown', () => this.connectAndPlay());
        this.input.keyboard.once('keydown-SPACE', () => this.connectAndPlay());
    }

    async connectAndPlay() {
        if (this.isConnecting) return;
        this.isConnecting = true;
        this.statusText.setText('Conectando al servidor...');

        try {
            const client = new Client(BACKEND_URL);
            const room = await client.joinOrCreate("snake_room");
            this.scene.start('Game', { room });
        } catch (e) {
            console.error("No se pudo conectar al servidor:", e);
            this.statusText.setText('Error al conectar. Haz clic para reintentar.');
            this.isConnecting = false;
            this.input.once('pointerdown', () => this.connectAndPlay());
            this.input.keyboard.once('keydown-SPACE', () => this.connectAndPlay());
        }
    }
}
