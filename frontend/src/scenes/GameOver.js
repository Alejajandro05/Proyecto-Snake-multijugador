export class GameOver extends Phaser.Scene {
    constructor() {
        super('GameOver');
    }

    init(data) {
        this.result = data.result || 'Game Over';
        this.resultColor = data.resultColor || '#ffffff';
    }

    create() {
        this.cameras.main.setBackgroundColor(0x0a0a1e);

        this.add.text(512, 300, this.result, {
            fontFamily: 'Arial Black', fontSize: 64, color: this.resultColor,
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(512, 420, 'Click to return to menu', {
            fontFamily: 'Arial', fontSize: 24, color: '#aaaaaa',
            align: 'center'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }
}
