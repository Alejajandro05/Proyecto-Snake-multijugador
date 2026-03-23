export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        this.cameras.main.setBackgroundColor(0x1a1a2e);
        this.add.image(512, 384, 'background').setAlpha(0.3);

        this.add.text(512, 160, 'SNAKE MULTIJUGADOR', {
            fontFamily: 'Arial Black',
            fontSize: 48,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
        }).setOrigin(0.5);

        // ── Local game button ───────────────────────────────────────────
        const localBtn = this.add.text(512, 320, '🎮  Juego Local  (2 jugadores)', {
            fontFamily: 'Arial Black',
            fontSize: 30,
            color: '#2ecc71',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.add.text(512, 365, 'Jugador 1: WASD   |   Jugador 2: Flechas', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#aaaaaa',
            align: 'center',
        }).setOrigin(0.5);

        // ── Online game button ──────────────────────────────────────────
        const onlineBtn = this.add.text(512, 480, '🌐  Juego Online  (Colyseus)', {
            fontFamily: 'Arial Black',
            fontSize: 30,
            color: '#3498db',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.add.text(512, 525, 'Conéctate con amigos en tiempo real', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#aaaaaa',
            align: 'center',
        }).setOrigin(0.5);

        // ── Hover / click handlers ──────────────────────────────────────
        localBtn.on('pointerover', () => localBtn.setColor('#27ae60'));
        localBtn.on('pointerout',  () => localBtn.setColor('#2ecc71'));
        localBtn.on('pointerdown', () => this.scene.start('LocalGame'));

        onlineBtn.on('pointerover', () => onlineBtn.setColor('#2980b9'));
        onlineBtn.on('pointerout',  () => onlineBtn.setColor('#3498db'));
        onlineBtn.on('pointerdown', () => this.scene.start('OnlineGame'));
    }
}
