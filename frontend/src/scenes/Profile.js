import Phaser from 'phaser';
import {
    extractLeaderboardUserName,
    formatUserEmailForDisplay,
    getCurrentUser,
    updateUserDisplayName,
    updateUserPassword,
    validateUserName,
} from '../services/firebaseAuthService.js';
import { disableGameKeyboardForOverlayScene } from '../utils/formKeyboardGuard.js';

export class Profile extends Phaser.Scene {
    constructor() {
        super('Profile');
    }

    init(data) {
        this.returnScene = data?.returnScene ?? 'MainMenu';
    }

    create() {
        disableGameKeyboardForOverlayScene(this);

        const fondo = this.add.image(this.scale.width / 2, this.scale.height / 2, 'fondo_duelo');

        const ajustarFondo = (width, height) => {
            fondo.setPosition(width / 2, height / 2);
            const escalaX = width / fondo.width;
            const escalaY = height / fondo.height;
            fondo.setScale(Math.max(escalaX, escalaY));
        };

        ajustarFondo(this.scale.width, this.scale.height);
        this.scale.on('resize', (gameSize) => ajustarFondo(gameSize.width, gameSize.height));

        this.renderOverlay();
    }

    async renderOverlay() {
        const user = await getCurrentUser();
        if (!user) {
            this.scene.start('Login', { returnScene: this.returnScene });
            return;
        }

        const userName = extractLeaderboardUserName(user);
        const userEmail = formatUserEmailForDisplay(user);

        const escapeHtml = (value) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        const overlay = document.createElement('div');
        overlay.id = 'profile-overlay';
        overlay.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center';
        overlay.style.cssText = [
            'z-index:1100',
            'overflow-x:hidden',
            'overflow-y:auto',
            'box-sizing:border-box',
            'padding:max(0.75rem, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) max(5.75rem, calc(env(safe-area-inset-bottom, 0px) + 4.5rem)) max(12px, env(safe-area-inset-left, 0px))',
            '-webkit-overflow-scrolling:touch',
        ].join(';');

        const btnStyleBase = `width: 280px; padding: 12px; border: 2px solid #94A3B8; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.1rem; transition: transform 0.2s ease;`;
        const btnStyleBack = `${btnStyleBase} background-color: #334155; color: white;`;
        const btnStyleSubmit = `${btnStyleBase} background-color: #0F766E; color: white; border-color: #5EEAD4;`;

        overlay.innerHTML = `
            <style>
                #profile-overlay .profile-scroll-wrap {
                    width: 100%;
                    max-width: 960px;
                    margin: 0 auto;
                    flex: 0 0 auto;
                }
                #profile-overlay .profile-card {
                    background: rgba(15, 23, 42, 0.85);
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    backdrop-filter: blur(5px);
                    max-width: 560px;
                    width: 100%;
                    margin: 0 auto;
                    max-height: min(88vh, calc(100dvh - 7.25rem));
                    overflow-y: auto;
                    overflow-x: hidden;
                    -webkit-overflow-scrolling: touch;
                }
                #profile-overlay .profile-card::-webkit-scrollbar { width: 8px; }
                #profile-overlay .profile-card::-webkit-scrollbar-thumb {
                    background: rgba(246, 125, 49, 0.45);
                    border-radius: 999px;
                }
                #profile-overlay .profile-card::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.06);
                    border-radius: 999px;
                }
                @media (max-width: 575.98px) {
                    #profile-overlay .profile-actions {
                        flex-direction: column !important;
                    }
                    #profile-overlay .profile-actions .btn {
                        width: 100% !important;
                    }
                }
            </style>
            <div class="profile-scroll-wrap text-center px-2">
                <div class="profile-card mx-auto p-4">
                    <h2 class="text-white text-center fw-bold mb-4" style="font-family: 'Montserrat', sans-serif;">Mi perfil</h2>

                    <form id="profile-username-form" class="text-start mb-4" novalidate>
                        <label for="profile-username-input" class="form-label text-white fw-semibold">Nombre de usuario</label>
                        <input id="profile-username-input" type="text" class="form-control mb-2" maxlength="24" value="${escapeHtml(userName)}" autocomplete="username" style="width:100%; padding: 0.85rem 1rem; border-radius: 10px; border: 2px solid #94A3B8; background: rgba(15, 23, 42, 0.9); color: white;" />
                        <p class="text-white-50 small mb-3">Solo letras, números, punto, guion y guion bajo (3-24 caracteres).</p>
                        <button id="btn-profile-save-username" type="submit" class="btn text-white fw-bold shadow w-100" style="${btnStyleSubmit}">Guardar nombre</button>
                    </form>

                    <div class="text-start mb-4 p-3 rounded-3" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);">
                        <p class="text-white-50 small mb-1">Correo</p>
                        <p id="profile-email" class="text-white fw-semibold mb-0">${escapeHtml(userEmail)}</p>
                    </div>

                    <div id="profile-username-message" class="text-start mb-3" style="min-height: 1.4rem; font-size: 0.95rem;"></div>

                    <h3 class="h6 text-white fw-bold mb-3 text-start" style="font-family: 'Montserrat', sans-serif;">Cambiar contraseña</h3>

                    <form id="profile-password-form" novalidate>
                        <div class="mb-3 text-start position-relative">
                            <label for="profile-current-password" class="form-label text-white fw-semibold">Contraseña actual</label>
                            <input id="profile-current-password" type="password" class="form-control" style="width:100%; padding: 0.85rem 1rem; border-radius: 10px; border: 2px solid #94A3B8; background: rgba(15, 23, 42, 0.9); color: white;" autocomplete="current-password" />
                        </div>
                        <div class="mb-3 text-start position-relative">
                            <label for="profile-new-password" class="form-label text-white fw-semibold">Nueva contraseña</label>
                            <input id="profile-new-password" type="password" class="form-control" style="width:100%; padding: 0.85rem 1rem; border-radius: 10px; border: 2px solid #94A3B8; background: rgba(15, 23, 42, 0.9); color: white;" autocomplete="new-password" />
                        </div>
                        <div class="mb-3 text-start position-relative">
                            <label for="profile-confirm-password" class="form-label text-white fw-semibold">Confirmar nueva contraseña</label>
                            <input id="profile-confirm-password" type="password" class="form-control" style="width:100%; padding: 0.85rem 1rem; border-radius: 10px; border: 2px solid #94A3B8; background: rgba(15, 23, 42, 0.9); color: white;" autocomplete="new-password" />
                        </div>

                        <div id="profile-validation-message" class="text-danger text-start mb-3" style="min-height: 1.4rem; font-size: 0.95rem;"></div>

                        <div class="d-flex justify-content-between gap-2 flex-row profile-actions">
                            <button id="btn-profile-back" type="button" class="btn text-white fw-bold shadow menu-btn" style="${btnStyleBack}">VOLVER</button>
                            <button id="btn-profile-save" type="submit" class="btn text-white fw-bold shadow" style="${btnStyleSubmit}">Guardar contraseña</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('game-container').appendChild(overlay);
        this.overlayRoot = overlay;

        const usernameForm = overlay.querySelector('#profile-username-form');
        const usernameInput = overlay.querySelector('#profile-username-input');
        const usernameMessage = overlay.querySelector('#profile-username-message');
        const saveUsernameButton = overlay.querySelector('#btn-profile-save-username');

        const form = overlay.querySelector('#profile-password-form');
        const currentPasswordInput = overlay.querySelector('#profile-current-password');
        const newPasswordInput = overlay.querySelector('#profile-new-password');
        const confirmPasswordInput = overlay.querySelector('#profile-confirm-password');
        const validationMessage = overlay.querySelector('#profile-validation-message');
        const saveButton = overlay.querySelector('#btn-profile-save');

        const resetValidation = () => {
            [currentPasswordInput, newPasswordInput, confirmPasswordInput].forEach((input) => {
                input.style.borderColor = '#94A3B8';
            });
            validationMessage.textContent = '';
            validationMessage.style.color = '';
        };

        const validatePassword = (value) => /[a-z]/.test(value)
            && /[A-Z]/.test(value)
            && /[0-9]/.test(value)
            && /[^A-Za-z0-9]/.test(value);

        overlay.querySelector('#btn-profile-back')?.addEventListener('click', () => {
            this.scene.start(this.returnScene);
        });

        usernameForm?.addEventListener('submit', async (event) => {
            event.preventDefault();
            usernameInput.style.borderColor = '#94A3B8';
            usernameMessage.textContent = '';

            const usernameValue = usernameInput.value.trim();
            const usernameValidation = validateUserName(usernameValue);
            if (!usernameValidation.ok) {
                usernameInput.style.borderColor = 'red';
                usernameMessage.style.color = '#f87171';
                usernameMessage.textContent = usernameValidation.message;
                return;
            }

            const originalText = saveUsernameButton.textContent;
            saveUsernameButton.disabled = true;
            saveUsernameButton.textContent = 'Guardando...';

            try {
                const updatedName = await updateUserDisplayName(usernameValue);
                usernameInput.value = updatedName;
                usernameMessage.style.color = '#86efac';
                usernameMessage.textContent = 'Nombre de usuario actualizado correctamente.';
            } catch (error) {
                usernameInput.style.borderColor = 'red';
                usernameMessage.style.color = '#f87171';
                usernameMessage.textContent = error.message || 'No se pudo actualizar el nombre.';
            } finally {
                saveUsernameButton.disabled = false;
                saveUsernameButton.textContent = originalText;
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            resetValidation();

            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!currentPassword) {
                currentPasswordInput.style.borderColor = 'red';
                validationMessage.textContent = 'Introduce tu contraseña actual.';
                return;
            }

            if (!validatePassword(newPassword)) {
                newPasswordInput.style.borderColor = 'red';
                validationMessage.textContent = 'La nueva contraseña debe incluir mayúsculas, minúsculas, números y un símbolo.';
                return;
            }

            if (newPassword !== confirmPassword) {
                confirmPasswordInput.style.borderColor = 'red';
                validationMessage.textContent = 'Las contraseñas nuevas no coinciden.';
                return;
            }

            const originalText = saveButton.textContent;
            saveButton.disabled = true;
            saveButton.textContent = 'Guardando...';

            try {
                await updateUserPassword(currentPassword, newPassword);
                validationMessage.style.color = '#86efac';
                validationMessage.textContent = 'Contraseña actualizada correctamente.';
                form.reset();
            } catch (error) {
                validationMessage.style.color = '#f87171';
                validationMessage.textContent = error.message || 'No se pudo actualizar la contraseña.';
            } finally {
                saveButton.disabled = false;
                saveButton.textContent = originalText;
            }
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.destroyOverlay();
        });
    }

    destroyOverlay() {
        if (this.overlayRoot?.parentNode) {
            this.overlayRoot.parentNode.removeChild(this.overlayRoot);
        }
        this.overlayRoot = null;
    }
}
