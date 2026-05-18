function isFormField(element) {
    if (!element) return false;
    const tag = element.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (element.isContentEditable) return true;
    return Boolean(element.closest?.('[contenteditable="true"]'));
}

export function setGameKeyboardEnabled(game, enabled) {
    const keyboard = game?.input?.keyboard;
    if (!keyboard) return;

    keyboard.enabled = enabled;
    if (!enabled && typeof keyboard.clearCaptures === 'function') {
        keyboard.clearCaptures();
    }
}

export function syncGameKeyboardWithFocus(game) {
    setGameKeyboardEnabled(game, !isFormField(document.activeElement));
}

export function bindFormKeyboardGuard(game) {
    const sync = () => syncGameKeyboardWithFocus(game);

    document.addEventListener('focusin', sync);
    document.addEventListener('focusout', () => setTimeout(sync, 0));
}

export function disableGameKeyboardForOverlayScene(scene) {
    setGameKeyboardEnabled(scene.game, false);

    scene.events.once('shutdown', () => {
        syncGameKeyboardWithFocus(scene.game);
    });
}
