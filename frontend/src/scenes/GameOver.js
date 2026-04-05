export class GameOver extends Phaser.Scene {
    constructor() {
        super('GameOver');
    }

    create(data) {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor(0xff0000);
        this.add.image(width/2, height/2, 'background').setAlpha(0.5);

        this.add.text(width/2, 100, 'Partida Terminada', {
            fontFamily: 'Arial Black',
            fontSize: 64,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(width/2, 180, `Ganador: ${data.winner}`, {
            fontFamily: 'Arial Black',
            fontSize: 48,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        let reasonText = '';
        if (data.reason === 'score') {
            reasonText = 'Ganador por alcanzar la puntuación máxima';
        } else if (data.reason === 'lives') {
            reasonText = 'Ganador por el oponente quedarse sin vidas';
        }

        this.add.text(width/2, 250, reasonText, {
            fontFamily: 'Arial Black',
            fontSize: 36,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.add.text(width/2, 350, 'Resumen:', {
            fontFamily: 'Arial Black',
            fontSize: 36,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Bloques paralelos para stats
        const blockY = 400;
        const blockGapX = 180; // separación horizontal entre P1 y P2

        // P1 Stats (rojo)
        this.add.text(width/2 - blockGapX, blockY, `P1\nScore: ${data.p1Score}\nVidas: ${data.p1Lives}`, {
            fontFamily: 'Arial Black',
            fontSize: 32,
            color: '#e74c3c',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5, 0);

        // P2 Stats (azul)
        this.add.text(width/2 + blockGapX, blockY, `P2\nScore: ${data.p2Score}\nVidas: ${data.p2Lives}`, {
            fontFamily: 'Arial Black',
            fontSize: 32,
            color: '#3498db',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5, 0);

        const newMatch = this.add.text(width/2 - blockGapX, 600, 'Nueva Partida', {
            fontSize: '22px',
            backgroundColor: '#2ecc71',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive();

        newMatch.on('pointerdown', () => {
            this.scene.start('LocalGame');
        });

        const menu = this.add.text(width/2 + blockGapX, 600, 'Volver al menú', {
            fontSize: '22px',
            backgroundColor: '#2e78cc',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive();

        menu.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });

    }
}
