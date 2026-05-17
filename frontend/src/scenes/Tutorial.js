import Phaser from 'phaser';
import { TUTORIAL_SECTIONS } from '../config/tutorialSteps.js';

export class Tutorial extends Phaser.Scene {
    constructor() {
        super('Tutorial');
    }

    create() {
        const fondo = this.add.image(this.scale.width / 2, this.scale.height / 2, 'fondo_duelo');

        const ajustarFondo = (width, height) => {
            fondo.setPosition(width / 2, height / 2);
            const escalaX = width / fondo.width;
            const escalaY = height / fondo.height;
            fondo.setScale(Math.max(escalaX, escalaY));
        };

        ajustarFondo(this.scale.width, this.scale.height);
        this.scale.on('resize', (gameSize) => ajustarFondo(gameSize.width, gameSize.height));

        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
        overlay.style.zIndex = '1000';
        overlay.style.padding = 'clamp(12px, 3vw, 32px)';
        overlay.style.boxSizing = 'border-box';

        const sectionsHtml = TUTORIAL_SECTIONS.map((section) => `
            <section class="tutorial-section" aria-labelledby="tutorial-${section.id}">
                <h3 id="tutorial-${section.id}" class="tutorial-section-title">${section.title}</h3>
                <ul class="tutorial-list">
                    ${section.items.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}
                </ul>
            </section>
        `).join('');

        overlay.innerHTML = `
            <style>
                #tutorial-overlay .tutorial-card {
                    width: min(640px, 100%);
                    max-height: min(88vh, 720px);
                    display: flex;
                    flex-direction: column;
                    padding: clamp(18px, 4vw, 28px);
                    border: 2px solid rgba(246, 125, 49, 0.65);
                    border-radius: 16px;
                    background: linear-gradient(180deg, rgba(17, 24, 39, 0.96), rgba(49, 12, 53, 0.94));
                    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45), 0 0 24px rgba(246, 125, 49, 0.18);
                    color: white;
                    font-family: 'Montserrat', sans-serif;
                    backdrop-filter: blur(8px);
                }

                #tutorial-overlay .tutorial-header {
                    flex-shrink: 0;
                    margin-bottom: 14px;
                    text-align: center;
                }

                #tutorial-overlay .tutorial-title {
                    margin: 0 0 6px;
                    color: #FDE68A;
                    font-family: 'Teko', sans-serif;
                    font-size: clamp(2rem, 6vw, 2.75rem);
                    font-weight: 700;
                    letter-spacing: 1px;
                    text-shadow: 0 0 12px rgba(246, 125, 49, 0.45);
                }

                #tutorial-overlay .tutorial-subtitle {
                    margin: 0;
                    color: #CBD5E1;
                    font-size: 0.92rem;
                    font-weight: 600;
                }

                #tutorial-overlay .tutorial-body {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    padding-right: 6px;
                    margin-bottom: 16px;
                }

                #tutorial-overlay .tutorial-body::-webkit-scrollbar {
                    width: 6px;
                }

                #tutorial-overlay .tutorial-body::-webkit-scrollbar-thumb {
                    background: rgba(246, 125, 49, 0.55);
                    border-radius: 999px;
                }

                #tutorial-overlay .tutorial-section {
                    margin-bottom: 18px;
                }

                #tutorial-overlay .tutorial-section:last-child {
                    margin-bottom: 0;
                }

                #tutorial-overlay .tutorial-section-title {
                    margin: 0 0 8px;
                    color: #F67D31;
                    font-size: 1rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }

                #tutorial-overlay .tutorial-list {
                    margin: 0;
                    padding-left: 1.15rem;
                    color: #E2E8F0;
                    font-size: 0.9rem;
                    line-height: 1.45;
                }

                #tutorial-overlay .tutorial-list li {
                    margin-bottom: 6px;
                }

                #tutorial-overlay .tutorial-list li:last-child {
                    margin-bottom: 0;
                }

                #tutorial-overlay .tutorial-actions {
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    width: 100%;
                    max-width: 280px;
                    margin: 0 auto;
                }

                #tutorial-overlay .tutorial-actions .btn {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #F67D31;
                    border-radius: 12px;
                    color: white;
                    font-family: 'Montserrat', sans-serif;
                    font-size: 1.05rem;
                    font-weight: 700;
                    transition: transform 0.2s ease;
                }

                #tutorial-overlay #btn-tutorial-back {
                    background-color: #1A05A2;
                }

                #tutorial-overlay #btn-tutorial-complete {
                    background: linear-gradient(90deg, #0F766E, #059669);
                }

                #tutorial-overlay .tutorial-actions .btn:hover {
                    transform: scale(1.03);
                }
            </style>
            <article class="tutorial-card" aria-label="Tutorial del juego">
                <header class="tutorial-header">
                    <h1 class="tutorial-title">TUTORIAL</h1>
                    <p class="tutorial-subtitle">Cómo jugar a Snake Clash</p>
                </header>
                <div class="tutorial-body">
                    ${sectionsHtml}
                </div>
                <div class="tutorial-actions">
                    <button id="btn-tutorial-complete" type="button" class="btn shadow menu-btn">
                        COMPLETAR TUTORIAL
                    </button>
                    <button id="btn-tutorial-back" type="button" class="btn shadow menu-btn">
                        VOLVER AL MENÚ
                    </button>
                </div>
            </article>
        `;

        document.getElementById('game-container').appendChild(overlay);
        this.overlayEl = overlay;

        overlay.querySelector('#btn-tutorial-back')?.addEventListener('click', () => this.goToMainMenu());
        overlay.querySelector('#btn-tutorial-complete')?.addEventListener('click', () => {
            this.destroyOverlay();
            this.scene.start('TutorialGame');
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyOverlay());
    }

    goToMainMenu() {
        this.destroyOverlay();
        this.scene.start('MainMenu');
    }

    destroyOverlay() {
        if (this.overlayEl?.parentNode) {
            this.overlayEl.parentNode.removeChild(this.overlayEl);
        }
        this.overlayEl = null;
    }

    escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }
}
