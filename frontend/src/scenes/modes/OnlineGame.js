import Phaser from 'phaser';
import { MAX_LIVES, WIN_SCORE } from '@shared/GameConfig';
import { createLobbyClient } from '../../net/lobbyClient.js';
import { extractLeaderboardUserName, getCurrentUser } from '../../services/firebaseAuthService.js';
import { LeaderboardService } from '../../services/LeaderboardService.js';
import { SnakeBoardRenderer } from '../../renderers/SnakeBoardRenderer.js';
import { getLivesWinner, getScoreWinner } from '../gameOverRouting.js';
import { shouldEndStandardMatchByLives, shouldEndStandardMatchByScore } from '../matchEndRules.js';
import { DEFAULT_MUSIC_KEY, getAudioSettings } from '../../utils/audioSettings.js';
import { loadOnlinePrefs } from '../../utils/onlineStorage.js';
import { syncOnlineHudIdentity } from './onlineHudIdentity.js';
import { getControlsConfig } from '../../utils/controlsConfig.js';

const HILL_WIN_SCORE = 100;
const TERRITORY_MATCH_MS = 60_000;
const TIME_ATTACK_MATCH_MS = 60_000;
const CHAOS_MAX_LIVES = 5;

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
        this.lobbyRoomId = data?.lobbyRoomId ?? '';
        this.playerSkinId = data?.skinId ?? '';
        this.mapId = data?.mapId ?? '';
        this.playerName = data?.playerName ?? '';
        this.selectedGameMode = data?.gameMode ?? 'normal';
        this.selectedDifficulty = data?.difficulty ?? 'normal';
    }

    async create() {
        this.boardRenderer = new SnakeBoardRenderer(this, { mapId: this.mapId });
        this.hillGraphics = this.add.graphics().setDepth(4);
        this.territoryTimerDiv = null;
        this.timeAttackTimerDiv = null;
        this.chaosFxEl = null;

        this.cacheHudElements();
        this.toggleHud(true);
        this.syncModeChrome();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({ up: 'W', left: 'A', down: 'S', right: 'D' });

        const controls = getControlsConfig(localStorage);
        this.controls = controls;

        this.isLeavingRoom = false;
        this.input.keyboard.on('keydown-ESC', () => this.leaveRoom());

        this.directionHandlers = {
            up: () => this.sendDirection('up'),
            down: () => this.sendDirection('down'),
            left: () => this.sendDirection('left'),
            right: () => this.sendDirection('right'),
        };

        this.input.keyboard.on(`keydown-${controls.player1.up}`, this.directionHandlers.up);
        this.input.keyboard.on(`keydown-${controls.player1.down}`, this.directionHandlers.down);
        this.input.keyboard.on(`keydown-${controls.player1.left}`, this.directionHandlers.left);
        this.input.keyboard.on(`keydown-${controls.player1.right}`, this.directionHandlers.right);
        this.input.keyboard.on(`keydown-${controls.player2.up}`, this.directionHandlers.up);
        this.input.keyboard.on(`keydown-${controls.player2.down}`, this.directionHandlers.down);
        this.input.keyboard.on(`keydown-${controls.player2.left}`, this.directionHandlers.left);
        this.input.keyboard.on(`keydown-${controls.player2.right}`, this.directionHandlers.right);

        this.resizeHandler = (gameSize) => this.updateLayout(gameSize.width, gameSize.height);
        this.scale.on('resize', this.resizeHandler);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.resizeHandler);
            this.toggleHud(false);
            this.removeInputListeners();
            this.cleanupRoom();
            this.hillGraphics?.destroy();
            this.destroyTerritoryTimerDom();
            this.destroyTimeAttackTimerDom();
            this.destroyChaosHud();
        });

        this.updateLayout(this.scale.width, this.scale.height);

        this.latestState = null;
        this.renderState({ players: new Map(), food: [], obstacles: [] });

        const audioSettings = getAudioSettings(localStorage);
        this.userMusicVol = audioSettings.musicVolume;
        this.userSfxVol = audioSettings.sfxVolume;

        const musicKey = this.cache.audio.exists(audioSettings.selectedMusic) ? audioSettings.selectedMusic : DEFAULT_MUSIC_KEY;
        this.music = this.sound.add(musicKey, { loop: true, volume: this.userMusicVol });
        if (this.userMusicVol > 0) this.music.play();

        this.events.on('shutdown', () => { if (this.music) this.music.stop(); });
        this.events.on('pause', () => { if (this.music) this.music.pause(); });
        this.events.on('resume', () => {
            this.isPaused = false;
            if (this.music?.isPaused) this.music.resume();
            else if (this.music && !this.music.isPlaying && this.userMusicVol > 0) this.music.play();
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
            this.hudHelp.textContent = 'Online | WASD | Flechas - ESC: Menu';
        }

        this.updateLivesHud(this.hudJ1Lives, this.getModeMaxLives());
        this.updateLivesHud(this.hudJ2Lives, this.getModeMaxLives());
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
        this.redrawHillOverlay(this.latestState);
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
        if (this.isTimeAttackMode()) {
            targetElement.textContent = '∞';
            return;
        }

        const maxLives = this.getModeMaxLives();
        const safeLives = Math.max(0, Math.min(maxLives, Number(lives) || 0));
        const heartsOn = '<span class="text-danger">&#10084;</span>'.repeat(safeLives);
        const heartsOff = '<span class="text-secondary opacity-50">&#10084;</span>'.repeat(maxLives - safeLives);
        targetElement.innerHTML = `${heartsOn}${heartsOff}`;
    }

    getModeMaxLives(state = this.latestState) {
        const mode = state?.gameMode ?? this.selectedGameMode;
        if (mode === 'chaos') return CHAOS_MAX_LIVES;
        if (mode === 'timeAttack') return 99;
        if (mode === 'territory') return 1;
        return MAX_LIVES;
    }

    getOrderedPlayers(state) {
        return Array.from(state?.players?.values?.() ?? []);
    }

    isKingOfTheHillMode(state = this.latestState) {
        return (state?.gameMode ?? this.selectedGameMode) === 'kingOfTheHill';
    }

    isTerritoryMode(state = this.latestState) {
        return (state?.gameMode ?? this.selectedGameMode) === 'territory';
    }

    isTimeAttackMode(state = this.latestState) {
        return (state?.gameMode ?? this.selectedGameMode) === 'timeAttack';
    }

    isChaosMode(state = this.latestState) {
        return (state?.gameMode ?? this.selectedGameMode) === 'chaos';
    }

    syncModeChrome(state = this.latestState) {
        if (this.isTerritoryMode(state)) {
            this.createTerritoryTimerDom();
        } else {
            this.destroyTerritoryTimerDom();
        }

        if (this.isTimeAttackMode(state)) {
            this.createTimeAttackTimerDom();
        } else {
            this.destroyTimeAttackTimerDom();
        }

        if (this.isChaosMode(state)) {
            this.ensureChaosHud();
            this.updateChaosBanner(state);
        } else {
            this.destroyChaosHud();
        }
    }

    createTerritoryTimerDom() {
        if (this.territoryTimerDiv) return;

        this.territoryTimerDiv = document.createElement('div');
        this.territoryTimerDiv.id = 'territory-clock-online';
        this.territoryTimerDiv.className = 'position-absolute start-50 translate-middle-x text-white fw-bold px-5 py-2 rounded-pill shadow-lg text-center';
        this.territoryTimerDiv.style = 'background: linear-gradient(180deg, #0f4c5c, #0B081A); border: 4px solid #F67D31; font-size: 3.3rem; z-index: 1000; top: 15px; box-shadow: 0 0 30px rgba(246, 125, 49, 0.45); line-height: 1;';
        this.territoryTimerDiv.innerText = '01:00';
        document.getElementById('game-container')?.appendChild(this.territoryTimerDiv);
    }

    destroyTerritoryTimerDom() {
        if (!this.territoryTimerDiv) return;
        this.territoryTimerDiv.remove();
        this.territoryTimerDiv = null;
    }

    updateTerritoryClock(state = this.latestState) {
        if (!this.territoryTimerDiv) return;
        const remainingTimeMs = Math.max(0, Number(state?.remainingTimeMs) || TERRITORY_MATCH_MS);
        const totalSeconds = Math.ceil(remainingTimeMs / 1000);
        const min = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const sec = String(totalSeconds % 60).padStart(2, '0');
        this.territoryTimerDiv.innerText = `${min}:${sec}`;
    }

    createTimeAttackTimerDom() {
        if (this.timeAttackTimerDiv) return;

        this.timeAttackTimerDiv = document.createElement('div');
        this.timeAttackTimerDiv.id = 'time-attack-clock-online';
        this.timeAttackTimerDiv.className = 'position-absolute start-50 translate-middle-x text-white fw-bold px-5 py-2 rounded-pill shadow-lg text-center';
        this.timeAttackTimerDiv.style = 'background: linear-gradient(180deg, #1A05A2, #0B081A); border: 4px solid #F67D31; font-size: 4rem; z-index: 1000; top: 15px; box-shadow: 0 0 30px rgba(246, 125, 49, 0.8); line-height: 1;';
        this.timeAttackTimerDiv.innerText = '01:00';
        document.getElementById('game-container')?.appendChild(this.timeAttackTimerDiv);
    }

    destroyTimeAttackTimerDom() {
        if (!this.timeAttackTimerDiv) return;
        this.timeAttackTimerDiv.remove();
        this.timeAttackTimerDiv = null;
    }

    updateTimeAttackClock(state = this.latestState) {
        if (!this.timeAttackTimerDiv) return;
        const remainingTimeMs = Math.max(0, Number(state?.remainingTimeMs) || TIME_ATTACK_MATCH_MS);
        if (remainingTimeMs <= 0 && !state?.matchEnded) {
            this.timeAttackTimerDiv.style.fontSize = '2.2rem';
            this.timeAttackTimerDiv.style.background = 'linear-gradient(180deg, #990000, #330000)';
            this.timeAttackTimerDiv.style.borderColor = '#FFC107';
            this.timeAttackTimerDiv.innerText = 'PRIMERO EN 5';
            return;
        }
        const totalSeconds = Math.ceil(remainingTimeMs / 1000);
        const min = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const sec = String(totalSeconds % 60).padStart(2, '0');
        this.timeAttackTimerDiv.innerText = `${min}:${sec}`;
    }

    ensureChaosHud() {
        if (this.chaosFxEl || !this.hudHelpWrap) return;
        const el = document.createElement('div');
        el.id = 'chaos-fx-line-online';
        el.className = 'text-warning fw-bold small mt-1';
        el.style.textShadow = '0 0 12px rgba(250, 204, 21, 0.45)';
        el.style.display = 'none';
        this.hudHelpWrap.appendChild(el);
        this.chaosFxEl = el;
    }

    destroyChaosHud() {
        if (this.chaosFxEl?.parentNode) {
            this.chaosFxEl.parentNode.removeChild(this.chaosFxEl);
        }
        this.chaosFxEl = null;
    }

    chaosLabel(id) {
        if (id === 'speed') return 'Velocidad aumentada';
        if (id === 'invert') return 'Controles al reves';
        if (id === 'invertLR') return 'Izquierda y derecha invertidas';
        if (id === 'obstacles') return 'Obstaculos reubicados';
        return '';
    }

    updateChaosBanner(state = this.latestState) {
        if (!this.chaosFxEl) return;
        const effectId = String(state?.chaosEffectId ?? '');
        const label = this.chaosLabel(effectId);
        this.chaosFxEl.textContent = label ? `Caos: ${label}` : '';
        this.chaosFxEl.style.display = label ? '' : 'none';
    }

    getHudPlayerEntries(state) {
        const entries = this.getOrderedPlayerEntries(state);
        if (!entries.length) {
            return { firstEntry: undefined, secondEntry: undefined };
        }

        const currentSessionId = this.room?.sessionId;
        if (!currentSessionId) {
            return { firstEntry: entries[0], secondEntry: entries[1] };
        }

        const currentEntry = entries.find(([sessionId]) => sessionId === currentSessionId);
        const rivalEntry = entries.find(([sessionId]) => sessionId !== currentSessionId);
        return {
            firstEntry: currentEntry ?? entries[0],
            secondEntry: rivalEntry ?? entries.find((entry) => entry !== currentEntry),
        };
    }

    redrawHillOverlay(state = this.latestState) {
        if (!this.hillGraphics) return;

        this.hillGraphics.clear();
        if (!this.isKingOfTheHillMode(state)) return;

        const col0 = Number(state?.hillZoneCol0);
        const col1 = Number(state?.hillZoneCol1);
        const row0 = Number(state?.hillZoneRow0);
        const row1 = Number(state?.hillZoneRow1);
        if (![col0, col1, row0, row1].every(Number.isFinite)) return;

        const x = this.boardOffsetX + col0 * this.cellSize;
        const y = this.boardOffsetY + row0 * this.cellSize;
        const w = (col1 - col0 + 1) * this.cellSize;
        const h = (row1 - row0 + 1) * this.cellSize;

        this.hillGraphics.fillStyle(0xf67d31, 0.2);
        this.hillGraphics.fillRect(x, y, w, h);
        this.hillGraphics.lineStyle(Math.max(2, Math.floor(this.cellSize * 0.08)), 0xf67d31, 0.65);
        this.hillGraphics.strokeRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2));
    }

    getOrderedPlayerEntries(state) {
        const entries = [];
        state?.players?.forEach?.((player, sessionId) => {
            entries.push([sessionId, player]);
        });
        return entries;
    }

    syncHudFromPlayers(state) {
        const summary = syncOnlineHudIdentity({
            state: {
                ...state,
                difficulty: state?.difficulty ?? this.selectedDifficulty,
            },
            hud: {
                leftPanel: this.hudLeftPlayer,
                rightPanel: this.hudRightPlayer,
                leftName: this.hudJ1Score,
                rightName: this.hudJ2Score,
                leftScore: this.hudJ1ScoreBig,
                rightScore: this.hudJ2ScoreBig,
                leftLives: this.hudJ1Lives,
                rightLives: this.hudJ2Lives,
            },
            updateLivesHud: this.updateLivesHud.bind(this),
            currentSessionId: this.room?.sessionId,
        });

        if (this.hudHelp) {
            const firstName = summary.firstPlayer?.playerName || 'J1';
            const secondName = summary.secondPlayer?.playerName || 'J2';
            const mapId = state?.mapId ?? this.mapId ?? 'arena01';
            if (this.isTerritoryMode(state)) {
                this.hudHelp.textContent = `Territory Game | Pinta y roba casillas | ${firstName} (WASD) vs ${secondName} (Flechas) | ${mapId} | ESC`;
            } else if (this.isKingOfTheHillMode(state)) {
                const targetScore = Number(state?.hillWinScore) || HILL_WIN_SCORE;
                this.hudHelp.textContent = `Rey de la colina | Meta ${targetScore} pts o ganar por vidas | ${firstName} (WASD) vs ${secondName} (Flechas) | ${mapId} | ESC`;
            } else if (this.isTimeAttackMode(state)) {
                this.hudHelp.textContent = `Contrarreloj | ${firstName} (WASD) vs ${secondName} (Flechas) | ${mapId} | ESC`;
            } else if (this.isChaosMode(state)) {
                this.hudHelp.textContent = `Modo Caos | ${summary.difficultyLabel} | ${firstName} (WASD) vs ${secondName} (Flechas) | ${mapId} | ESC`;
            } else {
                this.hudHelp.textContent = `${summary.difficultyLabel} | ${mapId} | ${firstName} (WASD) vs ${secondName} (Flechas) - ESC: Menu`;
            }
        }

        return summary;
    }

    async connectToServer() {
        try {
            const client = createLobbyClient();
            const currentUser = await getCurrentUser();
            const onlinePrefs = loadOnlinePrefs();
            const options = {
                skinId: this.playerSkinId,
                playerName: this.playerName || onlinePrefs.playerName || 'Jugador',
            };
            if (currentUser) {
                options.firebaseUid = currentUser.uid;
            }
            this.room = this.matchRoomId
                ? await client.joinSnakeRoomById(this.matchRoomId, options)
                : await client.joinOrCreateSnakeRoom(options);

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
        if (!this.input?.keyboard || !this.directionHandlers || !this.controls) return;

        this.input.keyboard.off(`keydown-${this.controls.player1.up}`, this.directionHandlers.up);
        this.input.keyboard.off(`keydown-${this.controls.player1.down}`, this.directionHandlers.down);
        this.input.keyboard.off(`keydown-${this.controls.player1.left}`, this.directionHandlers.left);
        this.input.keyboard.off(`keydown-${this.controls.player1.right}`, this.directionHandlers.right);
        this.input.keyboard.off(`keydown-${this.controls.player2.up}`, this.directionHandlers.up);
        this.input.keyboard.off(`keydown-${this.controls.player2.down}`, this.directionHandlers.down);
        this.input.keyboard.off(`keydown-${this.controls.player2.left}`, this.directionHandlers.left);
        this.input.keyboard.off(`keydown-${this.controls.player2.right}`, this.directionHandlers.right);
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
        this.syncModeChrome(state);
        this.boardRenderer.renderState(state);
        this.redrawHillOverlay(state);
        this.updateTerritoryClock(state);
        this.updateTimeAttackClock(state);
        this.updateChaosBanner(state);

        const { firstPlayer, secondPlayer } = this.syncHudFromPlayers(state);
        if (this.isTerritoryMode(state)) {
            const { firstEntry, secondEntry } = this.getHudPlayerEntries(state);
            const firstTerritory = Number(firstEntry ? state?.territoryCounts?.get?.(firstEntry[0]) : 0) || 0;
            const secondTerritory = Number(secondEntry ? state?.territoryCounts?.get?.(secondEntry[0]) : 0) || 0;

            if (this.hudJ1ScoreBig) this.hudJ1ScoreBig.textContent = `${firstTerritory}`;
            if (this.hudJ2ScoreBig) this.hudJ2ScoreBig.textContent = `${secondTerritory}`;
        }

        if (state?.matchEnded) {
            this.finishMatch(String(state.matchEndReason || 'lives'));
            return;
        }

        if (firstPlayer && secondPlayer) {
            const hillWinScore = Number(state?.hillWinScore) || HILL_WIN_SCORE;
            if (this.isKingOfTheHillMode(state) && ((Number(firstPlayer.score) || 0) >= hillWinScore || (Number(secondPlayer.score) || 0) >= hillWinScore)) {
                this.finishMatch('hill');
                return;
            }

            if (!this.isTimeAttackMode(state) && !this.isKingOfTheHillMode(state) && !this.isTerritoryMode(state) && shouldEndStandardMatchByScore(firstPlayer, secondPlayer, WIN_SCORE)) {
                this.finishMatch('score');
                return;
            }

            if (shouldEndStandardMatchByLives(firstPlayer, secondPlayer)) {
                this.finishMatch('lives');
            }
        }
    }

    finishMatch(reason) {
        if (this.isLeavingRoom) return;
        this.isLeavingRoom = true;
        const currentSessionId = this.room?.sessionId;
        this.cleanupRoom();

        const playerEntries = this.getOrderedPlayerEntries(this.latestState);
        const [p1SessionId, p1] = playerEntries[0] ?? [];
        const [p2SessionId, p2] = playerEntries[1] ?? [];
        const p1Name = p1?.playerName || 'Jugador 1';
        const p2Name = p2?.playerName || 'Jugador 2';
        const isHillMode = this.isKingOfTheHillMode(this.latestState);
        const isTerritoryMode = this.isTerritoryMode(this.latestState);
        const isTimeAttackMode = this.isTimeAttackMode(this.latestState);
        const p1Territory = Number(p1SessionId ? this.latestState?.territoryCounts?.get?.(p1SessionId) : 0) || 0;
        const p2Territory = Number(p2SessionId ? this.latestState?.territoryCounts?.get?.(p2SessionId) : 0) || 0;

        if (!p1 || !p2) {
            this.scene.start('MainMenu');
            return;
        }

        const winner = (reason === 'territory')
            ? (p1Territory > p2Territory ? 'J1' : 'J2')
            : (reason === 'hill' || reason === 'score')
            ? (p1.score > p2.score ? 'J1' : 'J2')
            : (p1.lives > 0 ? 'J1' : 'J2');
        const winnerSessionId = winner === 'J1' ? p1SessionId : p2SessionId;

        this.recordWinIfCurrentUserWon(currentSessionId, winnerSessionId).catch((error) => {
            console.error('Leaderboard win update failed:', error);
        });

        if (reason === 'hill' || reason === 'score' || reason === 'time' || reason === 'tiebreaker') {
            this.scene.start('GameOver', {
                winner: getScoreWinner(p1.score, p2.score),
                p1Name,
                p2Name,
                p1Score: p1.score,
                p1Lives: p1.lives,
                p2Score: p2.score,
                p2Lives: p2.lives,
                reason,
                mode: isHillMode ? 'kingOfTheHill' : (isTimeAttackMode ? 'timeAttack' : 'online'),
                rematchScene: 'OnlineMenu',
                rematchData: { resumeLobby: true, lobbyRoomId: this.lobbyRoomId },
                leaveActiveLobby: true,
            });
        } else if (reason === 'territory') {
            this.scene.start('GameOver', {
                winner: getScoreWinner(p1Territory, p2Territory),
                p1Name,
                p2Name,
                p1Score: p1Territory,
                p1Lives: p1.lives,
                p2Score: p2Territory,
                p2Lives: p2.lives,
                reason: 'territory',
                mode: isTerritoryMode ? 'territory' : 'online',
                rematchScene: 'OnlineMenu',
                rematchData: { resumeLobby: true, lobbyRoomId: this.lobbyRoomId },
                leaveActiveLobby: true,
            });
        } else {
            this.scene.start('GameOver', {
                winner: getLivesWinner(p1.lives, p2.lives),
                p1Name,
                p2Name,
                p1Score: isTerritoryMode ? p1Territory : p1.score,
                p1Lives: p1.lives,
                p2Score: isTerritoryMode ? p2Territory : p2.score,
                p2Lives: p2.lives,
                reason: 'lives',
                mode: isTerritoryMode ? 'territory' : (isHillMode ? 'kingOfTheHill' : 'online'),
                rematchScene: 'OnlineMenu',
                rematchData: { resumeLobby: true, lobbyRoomId: this.lobbyRoomId },
                leaveActiveLobby: true,
            });
        }
    }

    async recordWinIfCurrentUserWon(currentSessionId, winnerSessionId) {
        if (!currentSessionId || currentSessionId !== winnerSessionId) return;

        const currentUser = await getCurrentUser();
        if (!currentUser) return;

        const userName = extractLeaderboardUserName(currentUser);
        if (!userName) return;

        await LeaderboardService.incrementWinCount(userName);
    }

    shutdown() {
        this.toggleHud(false);
        this.removeInputListeners();
        this.cleanupRoom();
    }
}
