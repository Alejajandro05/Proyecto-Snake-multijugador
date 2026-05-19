import {
    extractLeaderboardUserName,
    getCurrentUser,
    signOutUser,
} from '../services/firebaseAuthService.js';

export const ACCOUNT_GUEST_LABEL = 'CREA / INICIA SESIÓN';

let activeDropdown = null;
let dropdownOutsideListener = null;

const ACCOUNT_DROPDOWN_STYLES = `
        .account-dropdown-menu {
            position: fixed;
            z-index: 11000;
            min-width: 200px;
            padding: 8px;
            border: 2px solid rgba(246, 125, 49, 0.75);
            border-radius: 12px;
            background: linear-gradient(180deg, rgba(17, 24, 39, 0.98), rgba(49, 12, 53, 0.96));
            box-shadow: 0 14px 36px rgba(0, 0, 0, 0.45);
            font-family: 'Montserrat', sans-serif;
            pointer-events: auto;
        }

        .account-dropdown-menu button {
            display: block;
            width: 100%;
            border: none;
            border-radius: 8px;
            padding: 10px 12px;
            margin: 0;
            text-align: left;
            font-size: 0.92rem;
            font-weight: 700;
            color: white;
            background: rgba(255, 255, 255, 0.08);
            transition: background 0.15s ease, transform 0.15s ease;
        }

        .account-dropdown-menu button + button {
            margin-top: 6px;
        }

        .account-dropdown-menu button:hover {
            background: rgba(246, 125, 49, 0.22);
            transform: translateY(-1px);
        }

        .account-dropdown-menu button[data-action="logout"] {
            color: #fecaca;
        }
`;

function ensureDropdownStyles() {
    let style = document.getElementById('account-dropdown-styles');
    if (!style) {
        style = document.createElement('style');
        style.id = 'account-dropdown-styles';
        document.head.appendChild(style);
    }
    style.textContent = ACCOUNT_DROPDOWN_STYLES;
}

export function closeAccountDropdown() {
    if (activeDropdown?.parentNode) {
        activeDropdown.parentNode.removeChild(activeDropdown);
    }
    activeDropdown = null;

    if (dropdownOutsideListener) {
        document.removeEventListener('mousedown', dropdownOutsideListener);
        dropdownOutsideListener = null;
    }
}

export async function refreshAccountButton(buttonEl) {
    if (!buttonEl) return;

    try {
        const user = await getCurrentUser();
        if (user) {
            const userName = extractLeaderboardUserName(user);
            buttonEl.textContent = `👤 ${userName}`;
            buttonEl.title = 'Tu cuenta';
            buttonEl.dataset.loggedIn = 'true';
        } else {
            buttonEl.textContent = ACCOUNT_GUEST_LABEL;
            buttonEl.title = 'Crear cuenta o iniciar sesión';
            buttonEl.dataset.loggedIn = 'false';
        }
    } catch {
        buttonEl.textContent = ACCOUNT_GUEST_LABEL;
        buttonEl.title = 'Crear cuenta o iniciar sesión';
        buttonEl.dataset.loggedIn = 'false';
    }
}

function openAccountDropdown({ scene, buttonEl, returnScene, onBeforeNavigate }) {
    closeAccountDropdown();
    ensureDropdownStyles();

    const rect = buttonEl.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'account-dropdown-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = `
        <button type="button" data-action="profile" role="menuitem">Editar perfil</button>
        <button type="button" data-action="logout" role="menuitem">Cerrar sesión</button>
    `;

    const mountRoot = document.getElementById('game-container') ?? document.body;
    mountRoot.appendChild(menu);
    activeDropdown = menu;

    const menuWidth = menu.offsetWidth || 200;
    const menuHeight = menu.offsetHeight || 96;
    let left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
    let top = rect.bottom + 8;

    if (top + menuHeight > window.innerHeight - 8) {
        top = Math.max(8, rect.top - menuHeight - 8);
    }

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    menu.querySelector('[data-action="profile"]')?.addEventListener('click', () => {
        closeAccountDropdown();
        onBeforeNavigate?.();
        scene.scene.start('Profile', { returnScene });
    });

    menu.querySelector('[data-action="logout"]')?.addEventListener('click', async () => {
        closeAccountDropdown();
        try {
            await signOutUser();
        } catch (error) {
            console.error('No se pudo cerrar sesión.', error);
        }
        await refreshAccountButton(buttonEl);
    });

    dropdownOutsideListener = (event) => {
        if (menu.contains(event.target) || buttonEl.contains(event.target)) return;
        closeAccountDropdown();
    };
    setTimeout(() => {
        document.addEventListener('mousedown', dropdownOutsideListener);
    }, 0);
}

export function bindAccountButton({ scene, buttonEl, returnScene, onBeforeNavigate }) {
    if (!buttonEl) return;

    refreshAccountButton(buttonEl);

    buttonEl.addEventListener('click', async (event) => {
        event.stopPropagation();
        closeAccountDropdown();

        const user = await getCurrentUser();
        if (!user) {
            onBeforeNavigate?.();
            scene.scene.start('Login', { returnScene });
            return;
        }

        openAccountDropdown({ scene, buttonEl, returnScene, onBeforeNavigate });
    });
}
