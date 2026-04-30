import Phaser from 'phaser';
import { MAX_LIVES, WIN_SCORE } from '@shared/GameConfig';
import { createLobbyClient } from '../../net/lobbyClient.js';
import { SnakeBoardRenderer } from '../../renderers/SnakeBoardRenderer.js';

function normalizeHttpUrlToWebSocket(url) {
    const s = String(url ?? '').trim();
    if (!s) return '';
    if (s.startsWith('https://')) return `wss://${s.slice('https://'.length)}`;
    if (s.startsWith('http://')) return `ws://${s.slice('http://'.length)}`;
    return s;
}

/** Path público del WebSocket detrás del proxy (p. ej. Caddy handle /ws* → strip_prefix /ws → backend). */
function getPublicWsPathSuffix() {
    const raw = import.meta.env.VITE_WS_PATH;
    if (raw === '') return '';
    if (raw === undefined || raw === null) return '/ws';
    const p = String(raw).trim();
    if (!p) return '/ws';
    return p.startsWith('/') ? p : `/${p}`;
}

function getColyseusServerUrl() {
    const explicitWs = String(import.meta.env.VITE_COLYSEUS_URL ?? '').trim();
    if (explicitWs) return explicitWs;

    const fromHttpEnv = normalizeHttpUrlToWebSocket(import.meta.env.VITE_SERVER_URL ?? '');
    if (fromHttpEnv) return fromHttpEnv;

    if (import.meta.env.DEV) {
        return 'ws://localhost:2567';
    }

    const { protocol, host } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    const pathSuffix = getPublicWsPathSuffix();
    return `${wsProtocol}//${host}${pathSuffix}`;
}

/**
 * Online multiplayer game use case.
 * Renders the same UI as LocalGame while syncing authoritative state from Colyseus.
 */
export class OnlineGame extends Phaser.Scene {
    constructor() {
        super('OnlineGame');
    }

    init(data) {
        this.matchRoomId = data?.matchRoomId ?? '';
        this.playerSkinId = data?.skinId ?? '';
    }

    async create() {
        this.boardRenderer = new SnakeBoardRenderer(this);

        this.cacheHudElements();
        this.toggleHud(true);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({ up: 'W', left: 'A', down: 'S', right: 'D' });

        this.isLeavingRoom = false;
        this.input.keyboard.on('keydown-ESC', () => this.leaveRoom());

        this.directionHandlers = {
            up: () => this.sendDirection('up'),
            down: () => this.sendDirection('down'),
            left: () => this.sendDirection('left'),
            right: () => this.sendDirection('right'),
        };

        this.input.keyboard.on('keydown-UP', this.directionHandlers.up);
        this.input.keyboard.on('keydown-DOWN', this.directionHandlers.down);
        this.input.keyboard.on('keydown-LEFT', this.directionHandlers.left);
        this.input.keyboard.on('keydown-RIGHT', this.directionHandlers.right);
        this.input.keyboard.on('keydown-W', this.directionHandlers.up);
        this.input.keyboard.on('keydown-A', this.directionHandlers.left);
        this.input.keyboard.on('keydown-S', this.directionHandlers.down);
        this.input.keyboard.on('keydown-D', this.directionHandlers.right);

        this.resizeHandler = (gameSize) => this.updateLayout(gameSize.width, gameSize.height);
        this.scale.on('resize', this.resizeHandler);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.resizeHandler);
            this.toggleHud(false);
            this.removeInputListeners();
            this.cleanupRoom();
        });

        this.updateLayout(this.scale.width, this.scale.height);

        this.latestState = null;
        this.renderState({ players: new Map(), food: [], obstacles: [], tickMs: 110 });

        this.userMusicVol = localStorage.getItem('musicVolume') !== null ? parseFloat(localStorage.getItem('musicVolume')) : 0.2;
        this.userSfxVol = localStorage.getItem('sfxVolume') !== null ? parseFloat(localStorage.getItem('sfxVolume')) : 0.7;

        const musicKey = localStorage.getItem('selectedMusic') || 'musica_in_game';
        this.music = this.sound.add(musicKey, { loop: true, volume: this.userMusicVol });
        this.music.play();

        this.events.on('shutdown', () => { if (this.music) this.music.stop(); });
        this.events.on('pause', () => { if (this.music) this.music.pause(); });
        this.events.on('resume', () => {
            this.isPaused = false;
            if (this.music) this.music.resume();
        });

        this.audioStateCache = new Map();

        await this.connectToServer();
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

        if (this.hudHelp) {
            this.hudHelp.textContent = 'WASD | Flechas - ESC: Menu';
        }

        this.updateLivesHud(this.hudJ1Lives, MAX_LIVES);
        this.updateLivesHud(this.hudJ2Lives, MAX_LIVES);
    }

    toggleHud(visible) {
        if (!this.hudRoot) return;
        this.hudRoot.classList.toggle('d-none', !visible);
    }

    updateLayout(viewportWidth, viewportHeight) {
        const safePadding = 18;
        const helpHeight = this.hudHelpWrap ? this.hudHelpWrap.offsetHeight : 42;
        const topGap = helpHeight + 26;
        const sidePanelWidthLeft = this.hudLeftPlayer ? this.hudLeftPlayer.offsetWidth : 0;
        const sidePanelWidthRight = this.hudRightPlayer ? this.hudRightPlayer.offsetWidth : 0;
        const sideGap = 22;
        this.applyBoardMetrics(this.boardRenderer.updateLayout({
            viewportWidth,
            viewportHeight,
            safePadding,
            sideGap,
            topGap,
            sidePanelWidthLeft,
            sidePanelWidthRight,
        }));

        this.positionHudElements(viewportWidth, viewportHeight, sidePanelWidthLeft, sidePanelWidthRight, sideGap, safePadding, helpHeight);
    }

    applyBoardMetrics(metrics) {
        this.boardOffsetX = metrics.boardOffsetX;
        this.boardOffsetY = metrics.boardOffsetY;
        this.boardWidth = metrics.boardWidth;
        this.boardHeight = metrics.boardHeight;
        this.cellSize = metrics.cellSize;
    }

    positionHudElements(viewportWidth, viewportHeight, sidePanelWidthLeft, sidePanelWidthRight, sideGap, safePadding, helpHeight) {
        if (this.hudLeftPlayer) {
            const leftAreaStart = safePadding;
            const leftAreaEnd = this.boardOffsetX - sideGap;
            const leftFree = Math.max(0, leftAreaEnd - leftAreaStart - sidePanelWidthLeft);
            const leftX = Math.floor(leftAreaStart + leftFree * 0.5);
            const leftY = Math.floor(this.boardOffsetY + (this.boardHeight - this.hudLeftPlayer.offsetHeight) * 0.5);
            this.hudLeftPlayer.style.left = `${leftX}px`;
            this.hudLeftPlayer.style.right = 'auto';
            this.hudLeftPlayer.style.top = `${Math.max(8, leftY)}px`;
            this.hudLeftPlayer.style.transform = 'none';
        }

        if (this.hudRightPlayer) {
            const rightAreaStart = this.boardOffsetX + this.boardWidth + sideGap;
            const rightAreaEnd = viewportWidth - safePadding;
            const rightFree = Math.max(0, rightAreaEnd - rightAreaStart - sidePanelWidthRight);
            const rightX = Math.floor(rightAreaStart + rightFree * 0.5);
            const rightY = Math.floor(this.boardOffsetY + (this.boardHeight - this.hudRightPlayer.offsetHeight) * 0.5);
            this.hudRightPlayer.style.left = `${rightX}px`;
            this.hudRightPlayer.style.right = 'auto';
            this.hudRightPlayer.style.top = `${Math.max(8, rightY)}px`;
            this.hudRightPlayer.style.transform = 'none';
        }

        if (this.hudHelpWrap) {
            const helpTop = Math.max(8, this.boardOffsetY - helpHeight - 10);
            this.hudHelpWrap.style.top = `${helpTop}px`;
            this.hudHelpWrap.style.left = `${Math.floor(viewportWidth * 0.5)}px`;
            this.hudHelpWrap.style.transform = 'translateX(-50%)';
        }
    }

    updateLivesHud(targetElement, lives) {
        if (!targetElement) return;

        const safeLives = Math.max(0, Math.min(MAX_LIVES, Number(lives) || 0));
        const heartsOn = '<span class="text-danger">&#10084;</span>'.repeat(safeLives);
        const heartsOff = '<span class="text-secondary opacity-50">&#10084;</span>'.repeat(MAX_LIVES - safeLives);
        targetElement.innerHTML = `${heartsOn}${heartsOff}`;
    }

    getOrderedPlayers(state) {
        return Array.from(state?.players?.values?.() ?? []);
    }

    syncHudFromPlayers(state) {
        const players = this.getOrderedPlayers(state);
        const firstPlayer = players[0];
        const secondPlayer = players[1];

        if (this.hudJ1Score) this.hudJ1Score.textContent = 'J1';
        if (this.hudJ2Score) this.hudJ2Score.textContent = 'J2';

        if (this.hudJ1ScoreBig) this.hudJ1ScoreBig.textContent = `${firstPlayer?.score ?? 0}`;
        if (this.hudJ2ScoreBig) this.hudJ2ScoreBig.textContent = `${secondPlayer?.score ?? 0}`;

        if (this.hudJ1Lives) this.updateLivesHud(this.hudJ1Lives, firstPlayer?.lives ?? MAX_LIVES);
        if (this.hudJ2Lives) this.updateLivesHud(this.hudJ2Lives, secondPlayer?.lives ?? MAX_LIVES);

        return { firstPlayer, secondPlayer };
    }

    async connectToServer() {
        try {
            const client = createLobbyClient();
            this.room = this.matchRoomId
                ? await client.joinSnakeRoomById(this.matchRoomId, { skinId: this.playerSkinId })
                : await client.joinOrCreateSnakeRoom({ skinId: this.playerSkinId });

            this.room.onStateChange((state) => {
                this.checkAudioEvents(state);
                this.latestState = state;
                this.renderState(state);
            });

            this.room.onLeave(() => {
                if (this.isLeavingRoom) return;
                this.cleanupRoom();
                this.scene.start('MainMenu');
            });

            this.room.onError((code, message) => {
                console.error('OnlineGame room error:', code, message);
                if (!this.isLeavingRoom) {
                    this.cleanupRoom();
                    this.scene.start('MainMenu');
                }
            });
        } catch (err) {
            console.error('OnlineGame connection error:', err);
            this.cleanupRoom();
            this.scene.start('MainMenu');
        }
    }

    checkAudioEvents(state) {
        if (!state || !state.players || !this.room) return;

        const mySessionId = this.room.sessionId; // Así sabemos cuál es nuestra serpiente

        state.players.forEach((player, sessionId) => {
            // Recuperamos cómo estaba este jugador hace un milisegundo
            const oldData = this.audioStateCache.get(sessionId) || { score: 0, lives: MAX_LIVES };

            const isMe = (sessionId === mySessionId);

            // --- Lógica de Comer Manzana ---
            if (player.score > oldData.score) {
                // Si soy yo, volumen normal. Si es el enemigo, volumen muy bajito.
                const vol = isMe ? 0.7 : 0.15;
                this.sound.play('eat_apple', { volume: vol });
            }

            // --- Lógica de Choque / Perder Vida ---
            if (player.lives < oldData.lives) {
                const vol = isMe ? 0.9 : 0.2;
                this.sound.play('sonido_choque', { volume: vol });

                // Solo paramos la música si YO muero definitivamente
                if (isMe && player.lives <= 0 && this.music) {
                    this.music.stop();
                }
            }

            // Actualizamos la caché para la próxima comprobación
            this.audioStateCache.set(sessionId, { score: player.score, lives: player.lives });
        });
    }

    sendDirection(direction) {
        if (!this.room) return;
        this.room.send('changeDirection', direction);
    }

    removeInputListeners() {
        if (!this.input?.keyboard || !this.directionHandlers) return;

        this.input.keyboard.off('keydown-UP', this.directionHandlers.up);
        this.input.keyboard.off('keydown-DOWN', this.directionHandlers.down);
        this.input.keyboard.off('keydown-LEFT', this.directionHandlers.left);
        this.input.keyboard.off('keydown-RIGHT', this.directionHandlers.right);
        this.input.keyboard.off('keydown-W', this.directionHandlers.up);
        this.input.keyboard.off('keydown-S', this.directionHandlers.down);
        this.input.keyboard.off('keydown-A', this.directionHandlers.left);
        this.input.keyboard.off('keydown-D', this.directionHandlers.right);
    }

    cleanupRoom() {
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
    }

    leaveRoom() {
        if (this.isLeavingRoom) return;
        this.isLeavingRoom = true;
        this.cleanupRoom();
        this.scene.start('MainMenu');
    }

    renderState(state) {
        if (!state) return;

        this.latestState = state;
        this.boardRenderer.renderState(state, state.tickMs ?? 110);

        const { firstPlayer, secondPlayer } = this.syncHudFromPlayers(state);

        if (firstPlayer && secondPlayer) {
            if (firstPlayer.score >= WIN_SCORE || secondPlayer.score >= WIN_SCORE) {
                this.gameOver(true);
                return;
            }

            if (firstPlayer.lives <= 0 || secondPlayer.lives <= 0) {
                this.gameOver(false);
            }
        }
    }

    update() {
        this.boardRenderer?.update?.();
    }

    gameOver(reason) {
        if (this.isLeavingRoom) return;
        this.isLeavingRoom = true;
        this.cleanupRoom();

        const players = this.getOrderedPlayers(this.latestState);
        const p1 = players[0];
        const p2 = players[1];

        if (!p1 || !p2) {
            this.scene.start('MainMenu');
            return;
        }

        if (reason) {
            this.scene.start('GameOver', {
                winner: p1.score > p2.score ? 'J1' : 'J2',
                p1Score: p1.score,
                p1Lives: p1.lives,
                p2Score: p2.score,
                p2Lives: p2.lives,
                reason: 'score'
            });
        } else {
            this.scene.start('GameOver', {
                winner: p1.lives > 0 ? 'J1' : 'J2',
                p1Score: p1.score,
                p1Lives: p1.lives,
                p2Score: p2.score,
                p2Lives: p2.lives,
                reason: 'lives'
            });
        }
    }

    shutdown() {
        this.toggleHud(false);
        this.removeInputListeners();
        this.cleanupRoom();
    }
}
