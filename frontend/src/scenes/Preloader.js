export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    init() {
        this.add.image(512, 384, 'background');

        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);
        const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

        this.load.on('progress', (progress) => {
            bar.width = 4 + (460 * progress);
        });
    }

    preload() {
        this.load.setPath('assets');

        // Fondo del menú principal
        this.load.image('fondo_duelo', 'fondo_duelo.png');

        // ── NUEVOS ASSETS ────────────────────────────────────────────
        // Tile de suelo del tablero (pixel art 8-bit, 32x32px)
        this.load.image('map_tile', 'map_tile.png');
        // ─────────────────────────────────────────────────────────────
    }

    create() {
        this.scene.start('MainMenu');
    }
}