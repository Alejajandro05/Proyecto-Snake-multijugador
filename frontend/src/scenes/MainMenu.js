export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        this.cameras.main.setBackgroundColor(0x1a1a2e);
        this.backgroundImage = this.add.image(0, 0, 'background').setAlpha(0.3);

        this.titleText = this.add.text(0, 0, 'SNAKE MULTIJUGADOR', {
            fontFamily: 'Arial Black',
            fontSize: 48,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
        }).setOrigin(0.5);

        // ── Local game button ───────────────────────────────────────────
        this.localBtn = this.add.text(0, 0, '🎮  Juego Local  (2 jugadores)', {
            fontFamily: 'Arial Black',
            fontSize: 30,
            color: '#2ecc71',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.localHint = this.add.text(0, 0, 'Jugador 1: WASD   |   Jugador 2: Flechas', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#aaaaaa',
            align: 'center',
        }).setOrigin(0.5);

        // ── Online game button ──────────────────────────────────────────
        this.onlineBtn = this.add.text(0, 0, '🌐  Juego Online  (Colyseus)', {
            fontFamily: 'Arial Black',
            fontSize: 30,
            color: '#3498db',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.onlineHint = this.add.text(0, 0, 'Conéctate con amigos en tiempo real', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#aaaaaa',
            align: 'center',
        }).setOrigin(0.5);

        // ── Hover / click handlers ──────────────────────────────────────
        this.localBtn.on('pointerover', () => this.localBtn.setColor('#27ae60'));
        this.localBtn.on('pointerout',  () => this.localBtn.setColor('#2ecc71'));
        this.localBtn.on('pointerdown', () => this.scene.start('LocalGame'));

        this.onlineBtn.on('pointerover', () => this.onlineBtn.setColor('#2980b9'));
        this.onlineBtn.on('pointerout',  () => this.onlineBtn.setColor('#3498db'));
        this.onlineBtn.on('pointerdown', () => this.scene.start('OnlineGame'));

        this.resizeHandler = (gameSize) => this.layoutMenu(gameSize.width, gameSize.height);
        this.scale.on('resize', this.resizeHandler);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.resizeHandler);
        });

        this.layoutMenu(this.scale.width, this.scale.height);
    }

    layoutMenu(width, height) {
        const centerX = width * 0.5;

        this.backgroundImage
            .setPosition(centerX, height * 0.5)
            .setDisplaySize(width, height);

        const titleSize = Math.max(28, Math.floor(width * 0.035));
        const buttonSize = Math.max(20, Math.floor(width * 0.024));
        const hintSize = Math.max(13, Math.floor(width * 0.012));

        this.titleText
            .setFontSize(titleSize)
            .setPosition(centerX, height * 0.22);

        this.localBtn
            .setFontSize(buttonSize)
            .setPosition(centerX, height * 0.46);

        this.localHint
            .setFontSize(hintSize)
            .setPosition(centerX, height * 0.52);

        this.onlineBtn
            .setFontSize(buttonSize)
            .setPosition(centerX, height * 0.62);

        this.onlineHint
            .setFontSize(hintSize)
            .setPosition(centerX, height * 0.68);
    }
}
