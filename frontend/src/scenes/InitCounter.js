import Phaser from 'phaser';

export class InitCounter extends Phaser.Scene {
    constructor() {
        super('InitCounter');
    }

    create(data) {

        const callerScene = data.caller;

        let count = 3;

        const { width, height } = this.scale;

        const timerText = this.add.text(width / 2, height / 2, count.toString(), {
            fontFamily: 'Arial Black',
            fontSize: '60px',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: {
                offsetX: 4,
                offsetY: 4,
                color: '#000000',
                blur: 8,
                stroke: true,
                fill: true
            }
        })
        .setOrigin(0.5);

        const randomColor = () => {
            return '#' + Phaser.Display.Color.RandomRGB().color.toString(16).padStart(6, '0');
        };

        this.time.addEvent({
            delay: 1000,
            repeat: 2,
            callback: () => {

                count--;

                if (count > 0) {

                    timerText.setText(count.toString());
                    timerText.setColor(randomColor())

                    timerText.setScale(2);

                    this.tweens.add({
                        targets: timerText,
                        scale: 1,
                        duration: 250,
                        ease: 'Back.Out'
                    });

                } else {
                     // Reanudar partida
                    this.scene.resume(callerScene);

                    // Mostrar FIGHT
                    timerText.setText('FIGHT!');
                    timerText.setColor(randomColor())
                    timerText.setFontSize(120);

                    this.tweens.add({
                        targets: timerText,
                        scale: { from: 0.2, to: 1.2 },
                        angle: { from: -10, to: 0 },
                        duration: 450,
                        ease: 'Elastic.Out'
                    });

                    // Esperar 1 segundo más
                    this.time.delayedCall(1000, () => {
                        this.scene.stop();
                    });
                }
            }
        });
    }

}
