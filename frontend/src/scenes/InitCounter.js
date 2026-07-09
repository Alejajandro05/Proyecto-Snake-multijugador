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

        // Colors: uniform color for digits, distinct color for final "¡YA!"
        const digitColor = '#ffffff';
        const finalColor = '#ffd166';
        timerText.setColor(digitColor);

        // Keep references for cleanup
        this._timerEvent = null;
        this._tweens = [];

        // Ensure final visuals fade out

        // Play click sound for numbers and a distinct sound for the final "YA"
        const clickKey = 'sonido_choque'; // short click-like sound preloaded
        const finalKey = 'eat_apple'; // sharper distinct sound (reused asset)
        // Mark caller scene so it can ignore inputs while countdown runs
        const caller = this.scene.get(callerScene);
        if (caller) caller.initCounterActive = true;

        this._timerEvent = this.time.addEvent({
            delay: 1000,
            repeat: 2,
            callback: () => {
                count--;

                if (count > 0) {
                    timerText.setText(count.toString());
                    timerText.setColor(digitColor);

                    timerText.setAlpha(1);
                    timerText.setScale(2);

                    const t1 = this.tweens.add({
                        targets: timerText,
                        scale: 1,
                        duration: 350,
                        ease: 'Back.Out'
                    });
                    const t2 = this.tweens.add({
                        targets: timerText,
                        alpha: { from: 1, to: 0 },
                        duration: 300,
                        delay: 350,
                        ease: 'Quad.Out'
                    });
                    this._tweens.push(t1, t2);

                    // Play click sound (no guard so it matches other scenes' usage)
                    try { this.sound.play(clickKey); } catch (e) {}

                } else {
                    // Final "¡YA!" visible briefly, but the match must start immediately
                    const caller = this.scene.get(callerScene);

                    if (caller) {
                        // mark caller that init counter is no longer active
                        caller.initCounterActive = false;
                    }

                    // show final text and play final sound
                    timerText.setAlpha(1);
                    timerText.setText('¡YA!');
                    timerText.setFontSize(120);
                    timerText.setColor(finalColor);

                    try { this.sound.play(finalKey); } catch (e) {}

                    // Give a very short visual frame for the final text, then resume
                    this.time.delayedCall(150, () => {
                        this.scene.resume(callerScene);
                        this.scene.stop();
                    });
                }
            }
        });

        // Ensure clean cleanup if this scene is shutdown prematurely (e.g., player leaves)
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this._timerEvent) this._timerEvent.remove(false);
            this._tweens.forEach(t => t.stop());
            this._tweens = [];
        });
    }

}
