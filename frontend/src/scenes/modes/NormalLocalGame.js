import { LocalGame } from './LocalGame.js';

export class NormalLocalGame extends LocalGame {
    constructor() {
        super('NormalLocalGame');
    }

    getSceneKey() {
        return 'NormalLocalGame';
    }

    getRematchSceneKey() {
        return 'NormalLocalGame';
    }

    hasWallCollisionMode() {
        return true;
    }
}
