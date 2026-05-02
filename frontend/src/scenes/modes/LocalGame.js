import Phaser from 'phaser';
import { SnakeEngine } from '@shared/SnakeEngine.ts';
import { MAX_LIVES, TICK_MS, WIN_SCORE } from '@shared/GameConfig.js';
import { SnakeBoardRenderer } from '../../renderers/SnakeBoardRenderer.js';
import { colorNumberToCssHex, loadLocalGameSettings, normalizeLocalGameSettings, saveLocalGameSettings } from '../../utils/localGameSettings.js';
import { getLivesWinner, getScoreWinner } from '../gameOverRouting.js';
import { shouldDieAtWall } from '../localModeHelpers.js';

const P1_ID = 'player1';
const P2_ID = 'player2';

export class LocalGame extends Phaser.Scene {
    constructor(sceneKey = 'LocalGame') {
        super(sceneKey);
        this.sceneKey = sceneKey;
    }

    getSceneKey() {
        return this.sceneKey;
    }

    getRematchSceneKey() {
        return this.getSceneKey();
    }

    hasWallCollisionMode() {
        return false;
    }

    init(data) {
        // Recuperamos los nombres y skins que eligieron en el menú previo
        const fromStorage = loadLocalGameSettings();
        const merged = normalizeLocalGameSettings({ ...fromStorage, ...(data ?? {}) });
        this.matchSettings = merged;
        saveLocalGameSettings(merged);
    }

    create() {
        this.boardRenderer = new SnakeBoardRenderer(this, { mapId: this.matchSettings?.mapId });

        this.cacheHudElements();
        this.toggleHud(true);

        // 1. MOTOR: Usamos la dificultad elegida por el compañero
        const difficulty = this.matchSettings?.difficulty ?? 'normal';
        const p1Cfg = this.matchSettings?.players?.p1 ?? {};
        const p2Cfg = this.matchSettings?.players?.p2 ?? {};

        this.engine = new SnakeEngine({ difficulty });

        // Aplicamos los colores y skins del menú
        this.engine.addPlayer(P1_ID, { color: p1Cfg.color, skinId: p1Cfg.skinId, startCol: 8, startRow: 12 });
        this.engine.addPlayer(P2_ID, { color: p2Cfg.color, skinId: p2Cfg.skinId, startCol: 24, startRow: 12 });

        // 2. CONTROLES Y PAUSA (Corregido con 'Pause' y 'caller')
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({ up: 'W', left: 'A', down: 'S', right: 'D' });

        this.isPaused = false;
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.isPaused) return;
            this.isPaused = true;

            const state = this.engine.getState();
            const p1 = state.players.get(P1_ID);
            const p2 = state.players.get(P2_ID);

            this.scene.pause();
            // Usamos la clave 'Pause' y pasamos el caller para que sepa volver
            this.scene.launch('Pause', {
                caller: this.getSceneKey(),
                p1Score: p1.score ?? 0,
                p2Score: p2.score ?? 0,
                p1Lives: p1.lives ?? 0,
                p2Lives: p2.lives ?? 0
            });
        });

        // 3. ENTRADA ASÍNCRONA (Inputs que no se pierden)
        this.inputBuffers = { [P1_ID]: [], [P2_ID]: [] };
        this.input.keyboard.on('keydown-W', () => this.pushDirection(P1_ID, 'up'));
        this.input.keyboard.on('keydown-A', () => this.pushDirection(P1_ID, 'left'));
        this.input.keyboard.on('keydown-S', () => this.pushDirection(P1_ID, 'down'));
        this.input.keyboard.on('keydown-D', () => this.pushDirection(P1_ID, 'right'));

        this.input.keyboard.on('keydown-UP', () => this.pushDirection(P2_ID, 'up'));
        this.input.keyboard.on('keydown-LEFT', () => this.pushDirection(P2_ID, 'left'));
        this.input.keyboard.on('keydown-DOWN', () => this.pushDirection(P2_ID, 'down'));
        this.input.keyboard.on('keydown-RIGHT', () => this.pushDirection(P2_ID, 'right'));

        // 4. BUCLE Y LAYOUT
        const runtimeConfig = this.engine.getConfig?.() ?? {};
        this.gameTimer = this.time.addEvent({
            delay: runtimeConfig.tickMs ?? TICK_MS,
            loop: true,
            callback: this.gameTick,
            callbackScope: this,
        });

        this.resizeHandler = (gameSize) => this.updateLayout(gameSize.width, gameSize.height);
        this.scale.on('resize', this.resizeHandler);

        this.updateLayout(this.scale.width, this.scale.height);

        // 5. AUDIO CORREGIDO
        this.userMusicVol = parseFloat(localStorage.getItem('musicVolume')) || 0.2;
        this.userSfxVol = parseFloat(localStorage.getItem('sfxVolume')) || 0.7;

        const musicKey = localStorage.getItem('selectedMusic') || 'musica_in_game';
        this.music = this.sound.add(musicKey, { loop: true, volume: this.userMusicVol });
        this.music.play();

        // Limpieza al cerrar
        this.events.on('shutdown', () => {
            if (this.music) this.music.stop();
            this.scale.off('resize', this.resizeHandler);
            this.toggleHud(false); // Ocultar nombres al salir
        });

        this.events.on('pause', () => { if (this.music) this.music.pause(); });
        this.events.on('resume', () => {
            this.isPaused = false;
            if (this.music) this.music.resume();
        });

        this.renderState(this.engine.getState());
    }

    cacheHudElements() {
        this.hudRoot = document.getElementById('localgame-hud');
        this.hudJ1Score = document.getElementById('hud-j1-score');
        this.hudJ1ScoreBig = document.getElementById('hud-j1-score-big');
        this.hudJ1Lives = document.getElementById('hud-j1-lives');
        this.hudJ2Score = document.getElementById('hud-j2-score');
        this.hudJ2ScoreBig = document.getElementById('hud-j2-score-big');
        this.hudJ2Lives = document.getElementById('hud-j2-lives');
        this.hudHelp = document.getElementById('hud-help');
        this.hudHelpWrap = document.getElementById('hud-help-wrap');
        this.hudLeftPlayer = document.getElementById('hud-left-player');
        this.hudRightPlayer = document.getElementById('hud-right-player');

        this.applyHudIdentity(); // Mostrar los nombres elegidos

        this.updateLivesHud(this.hudJ1Lives, MAX_LIVES);
        this.updateLivesHud(this.hudJ2Lives, MAX_LIVES);
    }

    applyHudIdentity() {
        const difficulty = String(this.matchSettings?.difficulty ?? 'normal');
        const mapId = this.matchSettings?.mapId ?? 'arena01';
        const p1Name = this.matchSettings?.players?.p1?.name ?? 'J1';
        const p2Name = this.matchSettings?.players?.p2?.name ?? 'J2';
        const p1Color = this.matchSettings?.players?.p1?.color;
        const p2Color = this.matchSettings?.players?.p2?.color;

        if (this.hudJ1Score) this.hudJ1Score.textContent = p1Name;
        if (this.hudJ2Score) this.hudJ2Score.textContent = p2Name;

        if (this.hudLeftPlayer && p1Color !== undefined) {
            const hex = colorNumberToCssHex(p1Color);
            this.hudLeftPlayer.style.borderColor = `${hex}55`;
            this.hudLeftPlayer.style.boxShadow = `0 12px 40px rgba(0,0,0,0.35), 0 0 0 2px ${hex}33 inset`;
        }

        if (this.hudRightPlayer && p2Color !== undefined) {
            const hex = colorNumberToCssHex(p2Color);
            this.hudRightPlayer.style.borderColor = `${hex}55`;
            this.hudRightPlayer.style.boxShadow = `0 12px 40px rgba(0,0,0,0.35), 0 0 0 2px ${hex}33 inset`;
        }

        if (this.hudHelp) {
            const label = difficulty === 'easy' ? 'Easy' : difficulty === 'hard' ? 'Difficult' : 'Medium';
            this.hudHelp.textContent = `${label} | ${mapId} | ${p1Name} (WASD) vs ${p2Name} (Flechas) — ESC: Menu`;
        }
    }

    // El resto de funciones (toggleHud, updateLayout, gameTick, handleInput, renderState, gameOver)
    // se mantienen igual que en la versión de tu compañero para no romper el layout dinámico.
    toggleHud(visible) { if (this.hudRoot) this.hudRoot.classList.toggle('d-none', !visible); }

    updateLayout(viewportWidth, viewportHeight) {
        const safePadding = 18;
        const helpHeight = this.hudHelpWrap ? this.hudHelpWrap.offsetHeight : 42;
        const topGap = helpHeight + 26;
        const sidePanelWidthLeft = this.hudLeftPlayer ? this.hudLeftPlayer.offsetWidth : 0;
        const sidePanelWidthRight = this.hudRightPlayer ? this.hudRightPlayer.offsetWidth : 0;
        const sideGap = 22;
        const metrics = this.boardRenderer.updateLayout({
            viewportWidth, viewportHeight, safePadding, sideGap, topGap, sidePanelWidthLeft, sidePanelWidthRight
        });
        this.boardOffsetX = metrics.boardOffsetX;
        this.boardOffsetY = metrics.boardOffsetY;
        this.boardWidth = metrics.boardWidth;
        this.boardHeight = metrics.boardHeight;
        this.positionHudElements(viewportWidth, viewportHeight, sidePanelWidthLeft, sidePanelWidthRight, sideGap, safePadding, helpHeight);
    }

    positionHudElements(viewportWidth, viewportHeight, sidePanelWidthLeft, sidePanelWidthRight, sideGap, safePadding, helpHeight) {
        if (this.hudLeftPlayer) {
            const leftX = Math.floor(safePadding + (this.boardOffsetX - sideGap - safePadding - sidePanelWidthLeft) * 0.5);
            const leftY = Math.floor(this.boardOffsetY + (this.boardHeight - this.hudLeftPlayer.offsetHeight) * 0.5);
            this.hudLeftPlayer.style.left = `${leftX}px`;
            this.hudLeftPlayer.style.top = `${Math.max(8, leftY)}px`;
        }
        if (this.hudRightPlayer) {
            const rightX = Math.floor((this.boardOffsetX + this.boardWidth + sideGap) + (viewportWidth - safePadding - (this.boardOffsetX + this.boardWidth + sideGap) - sidePanelWidthRight) * 0.5);
            const rightY = Math.floor(this.boardOffsetY + (this.boardHeight - this.hudRightPlayer.offsetHeight) * 0.5);
            this.hudRightPlayer.style.left = `${rightX}px`;
            this.hudRightPlayer.style.top = `${Math.max(8, rightY)}px`;
        }
        if (this.hudHelpWrap) {
            this.hudHelpWrap.style.top = `${Math.max(8, this.boardOffsetY - helpHeight - 10)}px`;
            this.hudHelpWrap.style.left = '50%';
            this.hudHelpWrap.style.transform = 'translateX(-50%)';
        }
    }

    updateLivesHud(targetElement, lives) {
        if (!targetElement) return;
        const safeLives = Math.max(0, Math.min(MAX_LIVES, Number(lives) || 0));
        targetElement.innerHTML = '<span class="text-danger">&#10084;</span>'.repeat(safeLives) +
            '<span class="text-secondary opacity-50">&#10084;</span>'.repeat(MAX_LIVES - safeLives);
    }

    pushDirection(playerId, direction) {
        if (this.inputBuffers[playerId].length < 3) this.inputBuffers[playerId].push(direction);
    }

    gameTick() {
        this.handleInput();

        // 1. Guardar el estado ANTES de mover (usando variables fijas como hizo tu compañero)
        const oldState = this.engine.getState();
        const p1Old = oldState.players.get(P1_ID);
        const p2Old = oldState.players.get(P2_ID);

        const score1 = p1Old?.score || 0;
        const score2 = p2Old?.score || 0;
        const lives1 = p1Old?.lives || 0;
        const lives2 = p2Old?.lives || 0;

        this.applyWallDeaths(oldState);

        // 2. Actualizar el motor
        const state = this.engine.tick();

        const p1New = state.players.get(P1_ID);
        const p2New = state.players.get(P2_ID);

        // 3. Comparar con los números fijos que guardamos antes
        if ((p1New?.score || 0) > score1 || (p2New?.score || 0) > score2) {
            this.sound.play('eat_apple', { volume: this.userSfxVol * 0.7 });
        }

        if ((p1New && p1New.lives < lives1) || (p2New && p2New.lives < lives2)) {
            this.sound.play('sonido_choque', { volume: this.userSfxVol });
        }

        this.renderState(state);
    }

    handleInput() {
        [P1_ID, P2_ID].forEach(id => {
            if (this.inputBuffers[id].length > 0) this.engine.setNextDirection(id, this.inputBuffers[id].shift());
        });
    }

    applyWallDeaths(state) {
        if (!this.hasWallCollisionMode()) return;

        const config = this.engine.getConfig?.();
        if (!config) return;

        [P1_ID, P2_ID].forEach((playerId) => {
            const player = state.players.get(playerId);
            if (!player?.alive || !player.segments?.length) return;

            const direction = player.nextDirection ?? player.direction;
            if (shouldDieAtWall(player.segments[0], direction, config)) {
                this.engine.killPlayer(player);
            }
        });
    }

    renderState(state) {
        this.boardRenderer.renderState(state);
        const p1 = state.players.get(P1_ID);
        const p2 = state.players.get(P2_ID);
        console.log(`p1 score: ${p1.score} \t p2 score: ${p2.score}`)
        if (p1 && this.hudJ1ScoreBig) this.hudJ1ScoreBig.textContent = `${p1.score}`;
        if (p2 && this.hudJ2ScoreBig) this.hudJ2ScoreBig.textContent = `${p2.score}`;
        if (p1) this.updateLivesHud(this.hudJ1Lives, p1.lives);
        if (p2) this.updateLivesHud(this.hudJ2Lives, p2.lives);

        if (p1.score >= WIN_SCORE || p2.score >= WIN_SCORE) this.gameOver(true);
        if (p1.lives <= 0 || p2.lives <= 0) this.gameOver(false);
    }

    gameOver(reason) {
        if (this.gameTimer) this.gameTimer.remove();
        const state = this.engine.getState();
        const p1 = state.players.get(P1_ID);
        const p2 = state.players.get(P2_ID);
        this.scene.start('GameOver', {
            winner: reason ? getScoreWinner(p1.score, p2.score) : getLivesWinner(p1.lives, p2.lives),
            p1Score: p1.score, p1Lives: p1.lives,
            p2Score: p2.score, p2Lives: p2.lives,
            reason: reason ? 'score' : 'lives',
            mode: 'local',
            rematchScene: this.getRematchSceneKey()
        });
    }
}
