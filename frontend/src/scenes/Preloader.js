import Phaser from 'phaser';
import { getImageAssetsToPreload, getSpriteSheetAssetsToPreload } from '../config/assetManifest.js';

export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    init() {
        const centerX = this.scale.width * 0.5;
        const centerY = this.scale.height * 0.5;

        this.add.image(centerX, centerY, 'background');
        this.add.rectangle(centerX, centerY, 468, 32).setStrokeStyle(1, 0xffffff);

        const bar = this.add.rectangle(centerX - 230, centerY, 4, 28, 0xffffff);

        this.load.on('progress', (progress) => {
            bar.width = 4 + (460 * progress);
        });
    }

    preload() {
        this.load.setPath('');

        this.load.audio('musica_in_game', 'audio/musica_in_game.mp3');
        this.load.audio('eat_apple', 'audio/eat_apple.mp3');
        this.load.audio('sonido_choque', 'audio/sonido_choque.mp3');

        getImageAssetsToPreload().forEach((asset) => {
            this.load.image(asset.key, asset.path);
        });

        getSpriteSheetAssetsToPreload().forEach((asset) => {
            this.load.spritesheet(asset.key, asset.path, asset.frameConfig);
        });
    }

    create() {
        this.scene.start('MainMenu');
    }
}
