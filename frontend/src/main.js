import Phaser from 'phaser';
import { Boot } from './scenes/Boot.js';
import { GameOver } from './scenes/GameOver.js';
import { Preloader } from './scenes/Preloader.js';
import { MainMenu } from './scenes/MainMenu.js';
import { Tutorial } from './scenes/Tutorial.js';
import { TutorialGame } from './scenes/modes/TutorialGame.js';
import { LocalGame } from './scenes/modes/LocalGame.js';
import { NormalLocalGame } from './scenes/modes/NormalLocalGame.js';
import { OnlineMenu } from './scenes/OnlineMenu.js';
import { Registration } from './scenes/Registration.js';
import { Login } from './scenes/Login.js';
import { OnlineGame } from './scenes/modes/OnlineGame.js';
import { TimeAttackGame } from './scenes/modes/TimeAttackGame.js';
import { ChaosGame } from './scenes/modes/ChaosGame.js';
import { KingOfTheHillGame } from './scenes/modes/KingOfTheHillGame.js';
import { TerritoryGame } from './scenes/modes/TerritoryGame.js';
import { AgainstAIGame } from './scenes/modes/AgainstAIGame.js';
import { CaptureTheFlagGame } from './scenes/modes/CaptureTheFlagGame.js';
import { Pause } from './scenes/Pause.js';
import {LocalGameSetup} from "./scenes/LocalGameSetup";
import { SoloGameSetup } from './scenes/SoloGameSetup.js';
import { SoloGame } from './scenes/modes/SoloGame.js';
import { ControlsMenu } from './scenes/ControlsMenu.js';
import { bindFormKeyboardGuard } from './utils/formKeyboardGuard.js';

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
        Tutorial,
        TutorialGame,
        ControlsMenu,
        OnlineMenu,
        Registration,
        Login,
        LocalGameSetup,
        SoloGameSetup,
        SoloGame,
        LocalGame,
        NormalLocalGame,
        OnlineGame,
        TimeAttackGame,
        ChaosGame,
        KingOfTheHillGame,
        TerritoryGame,
        AgainstAIGame,
        CaptureTheFlagGame,
        GameOver,
        Pause
    ]
};

const game = new Phaser.Game(config);
bindFormKeyboardGuard(game);
