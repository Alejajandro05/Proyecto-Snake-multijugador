import Phaser from 'phaser';
import { SnakeEngine, FOOD_CONFIG } from '@shared/SnakeEngine.ts';
import { TICK_MS, GRID_COLS, GRID_ROWS, MAX_LIVES } from '@shared/GameConfig.js';
import { SnakeBoardRenderer } from '../../renderers/SnakeBoardRenderer.js';
import { INTERACTIVE_TUTORIAL_STEPS, TUTORIAL_FRUIT_PROGRESSION } from '../../config/tutorialInteractiveSteps.js';
import { getAudioSettings } from '../../utils/audioSettings.js';
import { applyPlayerThemeToHud } from '../../utils/playerIdentity.js';

const PLAYER_ID = 'tutorial-player';
const PLAYER_COLOR = 0xe74c3c;
const TUTORIAL_MAP_ID = 'arena03';
const TUTORIAL_SNAKE_ID = 'snake3';
const PRACTICE_DURATION_MS = 10_000;
const ALL_FRUIT_TYPES = [...TUTORIAL_FRUIT_PROGRESSION];

/** Casillas alejadas del spawn inicial de la serpiente para colocar frutas del tutorial. */
const FOOD_SPAWN_SLOTS = [
    { col: 20, row: 12 },
    { col: 22, row: 10 },
    { col: 18, row: 14 },
    { col: 24, row: 11 },
    { col: 16, row: 9 },
    { col: 12, row: 13 },
    { col: 25, row: 14 },
    { col: 14, row: 16 },
    { col: 21, row: 8 },
    { col: 10, row: 11 },
    { col: 23, row: 15 },
    { col: 17, row: 17 },
    { col: 26, row: 12 },
    { col: 11, row: 15 },
    { col: 19, row: 10 },
    { col: 13, row: 9 },
    { col: 24, row: 16 },
    { col: 15, row: 7 },
    { col: 9, row: 12 },
    { col: 27, row: 10 },
];

export class TutorialGame extends Phaser.Scene {
    constructor() {
        super('TutorialGame');
    }

    create() {
        this.stepIndex = 0;
        this.isTutorialPaused = true;
        this.popupOpen = false;
        this.completionShown = false;
        this.waitingDeathAck = false;
        this.inPracticePhase = false;

        this.boardRenderer = new SnakeBoardRenderer(this, { mapId: TUTORIAL_MAP_ID });

        this.engine = new SnakeEngine({
            difficulty: 'easy',
            foodCount: 0,
            obstaclesPerQuadrant: 0,
            maxLives: MAX_LIVES,
            tickMs: 140,
        });

        this.engine.addPlayer(PLAYER_ID, {
            color: PLAYER_COLOR,
            skinId: TUTORIAL_SNAKE_ID,
            startCol: Math.floor(GRID_COLS / 2) - 2,
            startRow: Math.floor(GRID_ROWS / 2),
        });

        this.inputBuffers = [];
        this.input.keyboard.on('keydown-W', () => this.pushDirection('up'));
        this.input.keyboard.on('keydown-A', () => this.pushDirection('left'));
        this.input.keyboard.on('keydown-S', () => this.pushDirection('down'));
        this.input.keyboard.on('keydown-D', () => this.pushDirection('right'));

        this.engine.events.on('playerEatFood', () => {
            const audioSettings = getAudioSettings(localStorage);
            this.sound.play('eat_apple', { volume: (audioSettings.sfxVolume ?? 0.5) * 0.7 });
        });

        this.cacheTutorialHud();
        this.createPopupOverlay();
        this.createExitButton();

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

        this.events.on('shutdown', () => {
            this.clearPracticeTimer();
            this.boardRenderer?.stopTutorialHighlightAnimation();
            this.boardRenderer?.setTutorialHighlight(null);
            this.scale.off('resize', this.resizeHandler);
            this.destroyOverlays();
            this.toggleHud(false);
        });

        this.beginStep(0);
    }

    cacheTutorialHud() {
        this.hudRoot = document.getElementById('localgame-hud');
        this.hudJ1Score = document.getElementById('hud-j1-score');
        this.hudJ1ScoreBig = document.getElementById('hud-j1-score-big');
        this.hudJ1Lives = document.getElementById('hud-j1-lives');
        this.hudHelp = document.getElementById('hud-help');
        this.hudHelpWrap = document.getElementById('hud-help-wrap');
        this.hudLeftPlayer = document.getElementById('hud-left-player');
        this.hudRightPlayer = document.getElementById('hud-right-player');
        this.hudFoodHelp = document.getElementById('hud-food-help');

        if (this.hudJ1Score) this.hudJ1Score.textContent = 'Tutorial';
        if (this.hudHelp) this.hudHelp.textContent = 'WASD — Tutorial interactivo';
        if (this.hudFoodHelp) {
            this.hudFoodHelp.classList.remove('d-none');
            this.hudFoodHelp.textContent = Object.values(FOOD_CONFIG).map((f) => f.hudHelp).join(' | ');
        }
        if (this.hudRightPlayer) this.hudRightPlayer.classList.add('d-none');

        applyPlayerThemeToHud({
            panelEl: this.hudLeftPlayer,
            titleEl: this.hudJ1Score,
            scoreEl: this.hudJ1ScoreBig,
            livesEl: this.hudJ1Lives,
            colorNumber: PLAYER_COLOR,
        });

        this.updateLivesHud(this.hudJ1Lives, MAX_LIVES);
        this.toggleHud(true);
        this.renderHud(this.engine.getState());
    }

    updateLivesHud(targetElement, lives) {
        if (!targetElement) return;
        const safeLives = Math.max(0, Math.min(MAX_LIVES, Number(lives) || 0));
        targetElement.innerHTML = '<span class="text-danger">&#10084;</span>'.repeat(safeLives)
            + '<span class="text-secondary opacity-50">&#10084;</span>'.repeat(MAX_LIVES - safeLives);
    }

    toggleHud(visible) {
        if (this.hudRoot) this.hudRoot.classList.toggle('d-none', !visible);
    }

    createPopupOverlay() {
        const popup = document.createElement('div');
        popup.id = 'tutorial-game-popup';
        popup.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center d-none';
        popup.style.cssText = 'z-index:10020;background:transparent;padding:clamp(12px,3vw,28px);box-sizing:border-box;pointer-events:none;';

        popup.innerHTML = `
            <style>
                #tutorial-game-popup .tutorial-popup-card {
                    width: min(480px, 100%);
                    padding: clamp(20px, 4vw, 28px);
                    border: 2px solid rgba(246, 125, 49, 0.55);
                    border-radius: 16px;
                    background: linear-gradient(180deg, rgba(17, 24, 39, 0.28), rgba(49, 12, 53, 0.22));
                    backdrop-filter: blur(2px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
                    color: white;
                    font-family: 'Montserrat', sans-serif;
                    text-align: center;
                    pointer-events: auto;
                }
                #tutorial-game-popup .tutorial-popup-step {
                    margin: 0 0 8px;
                    color: #E2E8F0;
                    font-size: 0.8rem;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.85);
                }
                #tutorial-game-popup .tutorial-popup-title {
                    margin: 0 0 12px;
                    color: #FDE68A;
                    font-family: 'Teko', sans-serif;
                    font-size: clamp(1.75rem, 5vw, 2.25rem);
                    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9);
                }
                #tutorial-game-popup .tutorial-popup-body {
                    margin: 0 0 20px;
                    color: #F8FAFC;
                    font-size: 0.95rem;
                    line-height: 1.5;
                    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.9);
                }
                #tutorial-game-popup #btn-tutorial-popup-continue {
                    width: 100%;
                    max-width: 260px;
                    padding: 12px;
                    border: 2px solid #F67D31;
                    border-radius: 12px;
                    background: linear-gradient(90deg, #DE1A58, #8F0177);
                    color: white;
                    font-weight: 800;
                    font-size: 1rem;
                }
            </style>
            <div class="tutorial-popup-card" role="dialog" aria-modal="true">
                <p class="tutorial-popup-step" id="tutorial-popup-step-label"></p>
                <h2 class="tutorial-popup-title" id="tutorial-popup-title"></h2>
                <p class="tutorial-popup-body" id="tutorial-popup-body"></p>
                <button type="button" id="btn-tutorial-popup-continue" class="btn">CONTINUAR</button>
            </div>
        `;

        document.getElementById('game-container').appendChild(popup);
        this.popupEl = popup;

        popup.querySelector('#btn-tutorial-popup-continue')?.addEventListener('click', () => this.onPopupContinue());
    }

    createExitButton() {
        const btn = document.createElement('button');
        btn.id = 'btn-tutorial-game-exit';
        btn.type = 'button';
        btn.textContent = 'VOLVER AL MENÚ';
        btn.className = 'position-absolute btn text-white fw-bold';
        btn.style.cssText = [
            'z-index:10030',
            'bottom:clamp(16px,4vh,28px)',
            'right:clamp(16px,3vw,28px)',
            'padding:10px 18px',
            'background:#1A05A2',
            'border:2px solid #F67D31',
            'border-radius:10px',
            "font-family:'Montserrat',sans-serif",
            'font-size:0.95rem',
        ].join(';');

        btn.addEventListener('click', () => this.exitToMenu());
        document.getElementById('game-container').appendChild(btn);
        this.exitBtnEl = btn;
    }

    clearPracticeTimer() {
        if (this.practiceTimer) {
            this.practiceTimer.remove(false);
            this.practiceTimer = null;
        }
    }

    schedulePracticeEnd() {
        this.clearPracticeTimer();
        this.practiceTimer = this.time.delayedCall(PRACTICE_DURATION_MS, () => this.onPracticeFinished(), [], this);
    }

    beginStep(index) {
        this.clearPracticeTimer();
        this.stepIndex = index;
        this.waitingDeathAck = false;
        this.completionShown = false;
        this.inPracticePhase = false;

        const step = INTERACTIVE_TUTORIAL_STEPS[index];
        if (!step) {
            this.showCompletionPopup();
            return;
        }

        this.applyStepWorld(step, true);
        this.showStepPopup(step, index);
    }

    getCumulativeFruitTypes(fruitType) {
        const index = TUTORIAL_FRUIT_PROGRESSION.indexOf(fruitType);
        if (index < 0) return [];
        return TUTORIAL_FRUIT_PROGRESSION.slice(0, index + 1);
    }

    configurePracticeFoodRules(step) {
        if (step?.fruitType) {
            this.engine.setTutorialAllowedFoodTypes(this.getCumulativeFruitTypes(step.fruitType));
            return;
        }
        if (step?.mixedWorld) {
            this.engine.setTutorialAllowedFoodTypes(ALL_FRUIT_TYPES);
            return;
        }
        this.engine.setTutorialAllowedFoodTypes(null);
    }

    showStepPopup(step, index) {
        this.isTutorialPaused = true;
        this.popupOpen = true;
        this.inPracticePhase = false;

        const stepLabel = this.popupEl?.querySelector('#tutorial-popup-step-label');
        const titleEl = this.popupEl?.querySelector('#tutorial-popup-title');
        const bodyEl = this.popupEl?.querySelector('#tutorial-popup-body');
        const continueBtn = this.popupEl?.querySelector('#btn-tutorial-popup-continue');

        if (stepLabel) stepLabel.textContent = `Paso ${index + 1} de ${INTERACTIVE_TUTORIAL_STEPS.length}`;
        if (titleEl) titleEl.textContent = step.title;
        if (bodyEl) bodyEl.textContent = step.body;
        if (continueBtn) continueBtn.textContent = 'CONTINUAR';

        this.popupEl?.classList.remove('d-none');
        this.syncTutorialHighlight(step);
        this.updatePracticeHudHint();
        this.renderState(this.engine.getState());
        this.boardRenderer.startTutorialHighlightAnimation();
    }

    hidePopup() {
        this.popupEl?.classList.add('d-none');
        this.popupOpen = false;
        this.clearTutorialHighlight();
    }

    syncTutorialHighlight(step) {
        const highlight = this.resolveTutorialHighlight(step);
        this.boardRenderer.setTutorialHighlight(highlight);
    }

    resolveTutorialHighlight(step) {
        if (!step) return null;
        if (step.fruitType) {
            return { type: 'fruit', fruitType: step.fruitType };
        }
        if (step.id === 'obstacles') {
            return { type: 'obstacles' };
        }
        if (step.mixedWorld) {
            return { type: 'fruits-and-obstacles' };
        }
        return null;
    }

    clearTutorialHighlight() {
        this.boardRenderer.stopTutorialHighlightAnimation();
        this.boardRenderer.setTutorialHighlight(null);
        this.renderState(this.engine.getState());
    }

    onPopupContinue() {
        if (this.completionShown) {
            this.exitToMenu();
            return;
        }

        if (this.waitingDeathAck) {
            this.waitingDeathAck = false;
            this.hidePopup();
            this.isTutorialPaused = false;
            this.inPracticePhase = true;
            this.configurePracticeFoodRules(INTERACTIVE_TUTORIAL_STEPS[this.stepIndex]);
            this.schedulePracticeEnd();
            this.updatePracticeHudHint();
            return;
        }

        this.hidePopup();
        this.advanceAfterPopupContinue();
    }

    advanceAfterPopupContinue() {
        const step = INTERACTIVE_TUTORIAL_STEPS[this.stepIndex];

        if (step?.advanceToCompletion) {
            this.showCompletionPopup();
            return;
        }

        if (step?.skipPracticeAfter) {
            const next = this.stepIndex + 1;
            if (next >= INTERACTIVE_TUTORIAL_STEPS.length) {
                this.showCompletionPopup();
            } else {
                this.beginStep(next);
            }
            return;
        }

        this.startPracticePeriod();
    }

    startPracticePeriod() {
        const step = INTERACTIVE_TUTORIAL_STEPS[this.stepIndex];
        this.inPracticePhase = true;
        this.isTutorialPaused = false;
        this.configurePracticeFoodRules(step);
        this.updatePracticeHudHint(step?.title);
        this.schedulePracticeEnd();
    }

    updatePracticeHudHint(stepTitle) {
        if (!this.hudHelp) return;

        if (this.popupOpen) {
            this.hudHelp.textContent = 'Lee el mensaje y pulsa Continuar';
            return;
        }

        if (this.inPracticePhase && stepTitle) {
            this.hudHelp.textContent = `${stepTitle} — Practica 10 s con WASD`;
            return;
        }

        if (this.completionShown) {
            this.hudHelp.textContent = 'Tutorial completado';
            return;
        }

        this.hudHelp.textContent = 'WASD — Tutorial interactivo';
    }

    onPracticeFinished() {
        this.clearPracticeTimer();
        this.inPracticePhase = false;
        this.isTutorialPaused = true;

        const next = this.stepIndex + 1;
        if (next >= INTERACTIVE_TUTORIAL_STEPS.length) {
            this.showCompletionPopup();
            return;
        }

        this.beginStep(next);
    }

    applyStepWorld(step, forPopup = false) {
        this.engine.clearTutorialFood();
        this.engine.spawnTutorialObstacles(0);
        this.engine.setTutorialAllowedFoodTypes(null);

        if (step.fruitType) {
            if (forPopup) {
                this.spawnFruitsOfType(step.fruitType, step.fruitCount ?? 5);
            }
            return;
        }

        if (step.mixedWorld) {
            this.spawnAllFruitTypes(3);
            if (step.obstacles > 0) {
                this.engine.spawnTutorialObstacles(step.obstacles);
            }
            return;
        }

        if (step.obstacles > 0) {
            this.engine.spawnTutorialObstacles(step.obstacles);
        }
    }

    spawnFruitsOfType(type, count) {
        let placed = 0;
        for (const slot of FOOD_SPAWN_SLOTS) {
            if (placed >= count) break;
            if (this.engine.spawnTutorialFood(type, slot.col, slot.row)) {
                placed += 1;
            }
        }
    }

    spawnAllFruitTypes(countPerType = 3) {
        let slotIndex = 0;
        for (const type of ALL_FRUIT_TYPES) {
            let placed = 0;
            while (placed < countPerType && slotIndex < FOOD_SPAWN_SLOTS.length) {
                const slot = FOOD_SPAWN_SLOTS[slotIndex];
                slotIndex += 1;
                if (this.engine.spawnTutorialFood(type, slot.col, slot.row)) {
                    placed += 1;
                }
            }
        }
    }

    showCompletionPopup() {
        this.clearPracticeTimer();
        this.isTutorialPaused = true;
        this.popupOpen = true;
        this.completionShown = true;
        this.inPracticePhase = false;

        const stepLabel = this.popupEl?.querySelector('#tutorial-popup-step-label');
        const titleEl = this.popupEl?.querySelector('#tutorial-popup-title');
        const bodyEl = this.popupEl?.querySelector('#tutorial-popup-body');
        const continueBtn = this.popupEl?.querySelector('#btn-tutorial-popup-continue');

        if (stepLabel) stepLabel.textContent = 'Tutorial completado';
        if (titleEl) titleEl.textContent = '¡Muy bien!';
        if (bodyEl) bodyEl.textContent = 'Ya conoces lo básico. Pulsa Continuar para volver al menú principal.';
        if (continueBtn) continueBtn.textContent = 'CONTINUAR';

        this.clearTutorialHighlight();
        this.popupEl?.classList.remove('d-none');
        this.updatePracticeHudHint();
    }

    gameTick() {
        if (this.isTutorialPaused || this.popupOpen) {
            return;
        }

        if (this.inputBuffers.length > 0) {
            this.engine.setNextDirection(PLAYER_ID, this.inputBuffers.shift());
        }

        const livesBefore = this.engine.getState().players.get(PLAYER_ID)?.lives ?? 0;
        const state = this.engine.tick();
        const player = state.players.get(PLAYER_ID);

        if (player && player.lives < livesBefore && !this.waitingDeathAck) {
            const audioSettings = getAudioSettings(localStorage);
            this.sound.play('sonido_choque', { volume: audioSettings.sfxVolume ?? 0.5 });
            this.pauseForDeathNotice();
        }

        this.renderState(state);
    }

    pauseForDeathNotice() {
        this.clearPracticeTimer();
        this.isTutorialPaused = true;
        this.popupOpen = true;
        this.waitingDeathAck = true;
        this.inPracticePhase = false;

        const stepLabel = this.popupEl?.querySelector('#tutorial-popup-step-label');
        const titleEl = this.popupEl?.querySelector('#tutorial-popup-title');
        const bodyEl = this.popupEl?.querySelector('#tutorial-popup-body');
        const continueBtn = this.popupEl?.querySelector('#btn-tutorial-popup-continue');

        if (stepLabel) stepLabel.textContent = 'Has chocado';
        if (titleEl) titleEl.textContent = 'Perdiste una vida';
        if (bodyEl) bodyEl.textContent = 'Reaparecerás en unos segundos. Pulsa Continuar para seguir practicando.';
        if (continueBtn) continueBtn.textContent = 'CONTINUAR';

        this.clearTutorialHighlight();
        this.popupEl?.classList.remove('d-none');
        this.updatePracticeHudHint();
    }

    pushDirection(direction) {
        if (this.isTutorialPaused || this.popupOpen) return;
        if (this.inputBuffers.length < 3) this.inputBuffers.push(direction);
    }

    renderState(state) {
        this.boardRenderer.renderState(state);
        this.renderHud(state);
    }

    renderHud(state) {
        const player = state.players.get(PLAYER_ID);
        if (!player) return;

        if (this.hudJ1ScoreBig) this.hudJ1ScoreBig.textContent = `${player.score}`;
        this.updateLivesHud(this.hudJ1Lives, player.lives);
    }

    updateLayout(viewportWidth, viewportHeight) {
        const helpHeight = this.hudHelpWrap?.offsetHeight ?? 42;
        const topGap = helpHeight + 26;
        const sidePanelWidthLeft = this.hudLeftPlayer?.offsetWidth ?? 0;

        this.boardRenderer.updateLayout({
            viewportWidth,
            viewportHeight,
            safePadding: 18,
            sideGap: 22,
            topGap,
            sidePanelWidthLeft,
            sidePanelWidthRight: 0,
        });

        if (this.hudLeftPlayer) {
            const { boardOffsetX, boardOffsetY, boardHeight } = this.boardRenderer;
            const leftX = Math.floor(18 + (boardOffsetX - 22 - 18 - sidePanelWidthLeft) * 0.5);
            const leftY = Math.floor(boardOffsetY + (boardHeight - this.hudLeftPlayer.offsetHeight) * 0.5);
            this.hudLeftPlayer.style.left = `${Math.max(8, leftX)}px`;
            this.hudLeftPlayer.style.top = `${Math.max(8, leftY)}px`;
        }

        if (this.hudHelpWrap) {
            this.hudHelpWrap.style.top = `${Math.max(8, this.boardRenderer.boardOffsetY - helpHeight - 10)}px`;
            this.hudHelpWrap.style.left = '50%';
            this.hudHelpWrap.style.transform = 'translateX(-50%)';
        }
    }

    exitToMenu() {
        this.clearPracticeTimer();
        this.scene.start('MainMenu');
    }

    destroyOverlays() {
        this.popupEl?.remove();
        this.exitBtnEl?.remove();
        this.popupEl = null;
        this.exitBtnEl = null;
        if (this.hudRightPlayer) this.hudRightPlayer.classList.remove('d-none');
    }
}
