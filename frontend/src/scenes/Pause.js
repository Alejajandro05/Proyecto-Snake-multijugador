export class Pause extends Phaser.Scene {
    constructor() {
        super('PauseScene');
    }

    create(data) {
        const { width, height } = this.scale;

        this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0);

        this.add.rectangle(width/2, height/2, 350, 250, 0x222222);

        this.add.text(width/2, height/2 - 80, 'PAUSA', {
            fontSize: '28px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(width/2, height/2 - 30,
            `J1: ${data.p1Score}   |   J2: ${data.p2Score}`,
            { fontSize: '20px', color: '#ffffff' }
        ).setOrigin(0.5);

        const resume = this.add.text(width/2, height/2 + 20, 'Reanudar', {
            fontSize: '22px',
            backgroundColor: '#2ecc71',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive();

        resume.on('pointerdown', () => {
            this.scene.stop();
            this.scene.resume('LocalGame');
            this.scene.get('LocalGame').isPaused = false;
        });

        const exit = this.add.text(width/2, height/2 + 70, 'Salir al menú', {
            fontSize: '22px',
            backgroundColor: '#e74c3c',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive();

        exit.on('pointerdown', () => {
            this.scene.stop('LocalGame');
            this.scene.start('MainMenu');
        });

        // ESC también reanuda la partida
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.stop();
            this.scene.resume('LocalGame');
            this.scene.get('LocalGame').isPaused = false;
        });
    }
}
