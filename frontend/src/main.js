import Phaser from 'phaser';
import { Boot } from './scenes/Boot.js';
import { Game } from './scenes/Game.js';
import { GameOver } from './scenes/GameOver.js';
import { Preloader } from './scenes/Preloader.js';
import { MainMenu } from './scenes/MainMenu.js';
import { LocalGame } from './scenes/LocalGame.js';
import { OnlineMenu } from './scenes/OnlineMenu.js';
import { OnlineGame } from './scenes/OnlineGame.js';
import { Pause } from './scenes/Pause.js';

const config = {
    type: Phaser.AUTO,
    
    // 1. VOLVEMOS AL TAMAÑO DINÁMICO (Pantalla completa real)
    width: window.innerWidth,
    height: window.innerHeight,
    
    parent: 'game-container',
    
    // 2. Mantenemos el fondo oscuro elegante que queríamos
    backgroundColor: '#0B081A', 
    
    // 3. Mantenemos las mejoras de nitidez y el estilo retro para el tablero
    pixelArt: true,
    antialias: false, 
    roundPixels: true,
    resolution: window.devicePixelRatio || 1,

    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 500 }
        }
    },
    
    // 4. VOLVEMOS AL MODO RESIZE: Phaser no pelea con tu CSS, simplemente se adapta
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER
    },
    
    scene: [
        Boot,
        Preloader,
        MainMenu,
        OnlineMenu,
        LocalGame,
        OnlineGame,
        Game,
        GameOver,
        Pause
    ]
};

new Phaser.Game(config);
