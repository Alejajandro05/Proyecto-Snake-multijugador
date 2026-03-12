export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        this.cameras.main.setBackgroundColor(0x040218);

        // Title
        this.add.text(512, 120, '🐍 SNAKE', {
            fontFamily: 'Arial Black',
            fontSize: 72,
            color: '#00ff00',
            stroke: '#003300',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(512, 190, 'MULTIPLAYER', {
            fontFamily: 'Arial Black',
            fontSize: 36,
            color: '#00cc00',
            stroke: '#003300',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);

        // Menu buttons
        const buttonStyle = {
            fontFamily: 'Arial Black',
            fontSize: 28,
            color: '#ffffff',
            align: 'center'
        };

        const buttons = [
            { text: '▶  PLAY', y: 320, callback: () => this.onPlay() },
            { text: '🏆  LEADERBOARD', y: 410, callback: () => this.onLeaderboard() },
            { text: '👥  SOCIAL', y: 500, callback: () => this.onSocial() },
            { text: '⚙  CONFIG', y: 590, callback: () => this.onConfig() }
        ];

        buttons.forEach(({ text, y, callback }) => {
            // Button background
            const bg = this.add.rectangle(512, y, 320, 60, 0x1a1a3e)
                .setStrokeStyle(2, 0x00ff00)
                .setInteractive({ useHandCursor: true });

            // Button text
            const label = this.add.text(512, y, text, buttonStyle).setOrigin(0.5);

            // Hover effects
            bg.on('pointerover', () => {
                bg.setFillStyle(0x2a2a5e);
                bg.setStrokeStyle(3, 0x44ff44);
                label.setScale(1.05);
            });

            bg.on('pointerout', () => {
                bg.setFillStyle(0x1a1a3e);
                bg.setStrokeStyle(2, 0x00ff00);
                label.setScale(1);
            });

            bg.on('pointerdown', callback);
        });

        // Version text
        this.add.text(512, 720, 'v1.0 - 1v1 Multiplayer', {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#666666',
            align: 'center'
        }).setOrigin(0.5);
    }

    onPlay() {
        this.scene.start('Game');
    }

    onLeaderboard() {
        this.showNotification('Leaderboard coming soon!');
    }

    onSocial() {
        this.showNotification('Social features coming soon!');
    }

    onConfig() {
        this.showNotification('Configuration coming soon!');
    }

    showNotification(message) {
        // Show a temporary notification
        const bg = this.add.rectangle(512, 384, 400, 80, 0x000000, 0.85)
            .setStrokeStyle(2, 0x00ff00);
        const text = this.add.text(512, 384, message, {
            fontFamily: 'Arial',
            fontSize: 20,
            color: '#00ff00',
            align: 'center'
        }).setOrigin(0.5);

        this.time.delayedCall(2000, () => {
            bg.destroy();
            text.destroy();
        });
    }
}
