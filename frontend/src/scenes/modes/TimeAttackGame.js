import { SnakeEngine } from '@shared/SnakeEngine';
import { TICK_MS } from '@shared/GameConfig';
import { SnakeBoardRenderer } from '../../renderers/SnakeBoardRenderer.js';

const P1_ID = 'player1';
const P2_ID = 'player2';

export class TimeAttackGame extends Phaser.Scene {
    constructor() {
        super('TimeAttackGame');
        this.audioStateCache = new Map(); // Caché para detectar muertes y comida
    }

    // Inicializa motor, renderer, reloj y sistema de audio
    create() {
        this.boardRenderer = new SnakeBoardRenderer(this);
        this.crearRelojDOM();
        this.cacheHudElements();
        this.toggleHud(true);

        this.engine = new SnakeEngine();
        this.respawnPlayer(P1_ID, 0xe74c3c, 8, 12);
        this.respawnPlayer(P2_ID, 0x3498db, 24, 12);

        this.inputBuffers = { [P1_ID]: [], [P2_ID]: [] };
        this.configurarControles();
        this.configurarAudio();

        this.timeLeft = 60;
        this.isPaused = false;

        // Bucles de lógica y tiempo
        this.gameTimer = this.time.addEvent({ delay: TICK_MS, loop: true, callback: this.gameTick, callbackScope: this });
        this.clockTimer = this.time.addEvent({ delay: 1000, loop: true, callback: this.actualizarReloj, callbackScope: this });

        this.updateLayout(this.scale.width, this.scale.height);
        this.scale.on('resize', (gameSize) => this.updateLayout(gameSize.width, gameSize.height));
    }

    // Inyecta el temporizador en el DOM de forma dinámica
    crearRelojDOM() {
        this.timerDiv = document.createElement('div');
        this.timerDiv.id = 'time-attack-clock';
        this.timerDiv.className = 'position-absolute top-0 start-50 translate-middle-x mt-3 text-white fw-bold px-4 py-2 rounded-pill shadow';
        this.timerDiv.style = "background-color: #1A05A2; border: 2px solid #F67D31; font-size: 2rem; z-index: 1000;";
        this.timerDiv.innerText = '01:00';
        document.getElementById('game-container').appendChild(this.timerDiv);
    }

    // Configura el sistema de búfer de teclas para evitar bloqueos
    configurarControles() {
        const pushDir = (id, dir) => { if (this.inputBuffers[id].length < 3) this.inputBuffers[id].push(dir); };

        this.input.keyboard.on('keydown-W', () => pushDir(P1_ID, 'up'));
        this.input.keyboard.on('keydown-A', () => pushDir(P1_ID, 'left'));
        this.input.keyboard.on('keydown-S', () => pushDir(P1_ID, 'down'));
        this.input.keyboard.on('keydown-D', () => pushDir(P1_ID, 'right'));

        this.input.keyboard.on('keydown-UP', () => pushDir(P2_ID, 'up'));
        this.input.keyboard.on('keydown-LEFT', () => pushDir(P2_ID, 'left'));
        this.input.keyboard.on('keydown-DOWN', () => pushDir(P2_ID, 'down'));
        this.input.keyboard.on('keydown-RIGHT', () => pushDir(P2_ID, 'right'));

        this.input.keyboard.on('keydown-ESC', () => this.gestionarPausa());
    }

    // Lanza la escena de pausa sin cerrar la partida actual
    gestionarPausa() {
        if (this.isPaused) return;
        this.isPaused = true;
        this.scene.pause();
        this.scene.launch('Pause', {
            p1Score: this.engine.getState().players.get(P1_ID)?.score || 0,
            p2Score: this.engine.getState().players.get(P2_ID)?.score || 0
        });
    }

    // Configura audio y detecta cierre de escena para limpiar el DOM
    configurarAudio() {
        this.userMusicVol = parseFloat(localStorage.getItem('musicVolume')) || 0.2;
        this.userSfxVol = parseFloat(localStorage.getItem('sfxVolume')) || 0.7;
        let musicKey = localStorage.getItem('selectedMusic') || 'musica_in_game';

        this.music = this.sound.add(musicKey, { loop: true, volume: this.userMusicVol });
        this.music.play();

        this.events.on('shutdown', () => {
            if (this.music) this.music.stop();
            if (this.timerDiv) this.timerDiv.remove();
        });
        this.events.on('resume', () => { this.isPaused = false; });
    }

    // Procesa el movimiento y detecta muertes/comida mediante caché
    gameTick() {
        this.handleInput();
        const state = this.engine.tick();

        this.checkAudioAndRespawn(state);
        this.forzarFrenesiComida(state);
        this.renderState(state);
    }

    // Compara el estado para disparar sonidos y reaparecer serpientes
    checkAudioAndRespawn(state) {
        state.players.forEach((player, id) => {
            const old = this.audioStateCache.get(id) || { score: 0, lives: 3 };

            if (player.score > old.score) this.sound.play('eat_apple', { volume: this.userSfxVol * 0.7 });

            if (player.lives < old.lives) {
                this.sound.play('sonido_choque', { volume: this.userSfxVol });
                this.respawnPlayer(id, id === P1_ID ? 0xe74c3c : 0x3498db, id === P1_ID ? 8 : 24, 12);
            }

            this.audioStateCache.set(id, { score: player.score, lives: player.lives });
        });
    }

    // Reinstancia al jugador con penalización de puntos y tamaño base
    respawnPlayer(id, color, col, row) {
        const player = this.engine.getState().players.get(id);
        const newScore = player ? Math.floor(player.score / 2) : 0;

        this.engine.removePlayer(id);
        this.engine.addPlayer(id, { color, startCol: col, startRow: row });
        this.engine.getState().players.get(id).score = newScore;
        this.inputBuffers[id] = [];
    }

    // Asegura que siempre haya mucha comida en el tablero
    forzarFrenesiComida(state) {
        if (state.food.length < 15) {
            for (let i = 0; i < 5; i++) this.engine.spawnFood();
        }
    }

    // Procesa los inputs del búfer en cada tick
    handleInput() {
        [P1_ID, P2_ID].forEach(id => {
            if (this.inputBuffers[id].length > 0) {
                this.engine.setNextDirection(id, this.inputBuffers[id].shift());
            }
        });
    }

    // Actualiza el tiempo y finaliza la escena al llegar a cero
    actualizarReloj() {
        if (this.isPaused) return;
        this.timeLeft--;
        const min = String(Math.floor(this.timeLeft / 60)).padStart(2, '0');
        const sec = String(this.timeLeft % 60).padStart(2, '0');
        this.timerDiv.innerText = `${min}:${sec}`;

        if (this.timeLeft <= 0) this.finalizarPartida();
    }

    // Envía los resultados finales a la pantalla de GameOver
    finalizarPartida() {
        const p1 = this.engine.getState().players.get(P1_ID);
        const p2 = this.engine.getState().players.get(P2_ID);
        this.scene.start('GameOver', {
            winner: p1.score > p2.score ? 'J1' : (p2.score > p1.score ? 'J2' : 'EMPATE'),
            p1Score: p1.score, p2Score: p2.score, reason: 'time'
        });
    }

    // Métodos auxiliares de renderizado y HUD
    renderState(state) {
        this.boardRenderer.renderState(state);
        if (this.hudJ1ScoreBig) this.hudJ1ScoreBig.textContent = state.players.get(P1_ID)?.score || 0;
        if (this.hudJ2ScoreBig) this.hudJ2ScoreBig.textContent = state.players.get(P2_ID)?.score || 0;
    }

    cacheHudElements() {
        this.hudRoot = document.getElementById('localgame-hud');
        this.hudJ1ScoreBig = document.getElementById('hud-j1-score-big');
        this.hudJ2ScoreBig = document.getElementById('hud-j2-score-big');
        const lives = [document.getElementById('hud-j1-lives'), document.getElementById('hud-j2-lives')];
        lives.forEach(l => { if (l) l.style.display = 'none'; });
    }

    toggleHud(v) { if (this.hudRoot) this.hudRoot.classList.toggle('d-none', !v); }

    updateLayout(w, h) {
        this.boardRenderer.updateLayout({ viewportWidth: w, viewportHeight: h, safePadding: 18, sideGap: 22, topGap: 68, sidePanelWidthLeft: 0, sidePanelWidthRight: 0 });
    }
}