// frontend/src/renderers/FoodEffectsLayer.js
//
// HU-034: Efectos visuales al consumir alimentos especiales
// ─────────────────────────────────────────────────────────
// Responsabilidades:
//   - Recibir un trigger (tipo de comida + coordenadas de celda)
//   - Emitir un burst de partículas del color asociado al tipo
//   - Mostrar un texto flotante (+3, speed boost, -2…) que asciende
//     y se desvanece en ~0,5 s
//   - Las manzanas (apple) NO generan ningún efecto visual
//   - Si el tipo es desconocido no se generan efectos
//   - Cada consumo genera su propio efecto independiente

import { GRID_SIZE } from '@shared/GameConfig';

// ── Colores por tipo de alimento (hex Phaser) ──────────────────────
const FOOD_EFFECT_COLORS = {
    grape:  0xC084FC,   // violeta
    speed:  0xF472B6,   // rosa
    poison: 0xA3E635,   // verde lima
};

// ── Etiquetas flotantes por tipo ───────────────────────────────────
const FOOD_EFFECT_LABELS = {
    grape:  '+3',
    speed:  'SPEED!',
    poison: '-2 SLOW',
};

// Duración total de la animación en milisegundos
const EFFECT_DURATION_MS = 500;

// Número de partículas por burst
const PARTICLE_COUNT = 12;

/**
 * FoodEffectsLayer
 *
 * Uso:
 *   const fxLayer = new FoodEffectsLayer(scene);
 *   fxLayer.updateLayout(boardOffsetX, boardOffsetY, cellSize);  // llamar cuando cambie el layout
 *   fxLayer.trigger(foodType, gridX, gridY);   // llamar desde la escena al consumir comida
 *   fxLayer.destroy();   // llamar al salir de la escena
 */
export class FoodEffectsLayer {
    /**
     * @param {Phaser.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.boardOffsetX = 0;
        this.boardOffsetY = 0;
        this.cellSize = GRID_SIZE;

        // Graphics layer para las partículas (depth alto, sobre comida)
        this.particleGraphics = scene.add.graphics().setDepth(30);

        // Pool de objetos de texto flotante activos
        // Cada entrada: { text: Phaser.GameObjects.Text, tween: Phaser.Tweens.Tween }
        this._activeLabels = [];
    }

    /**
     * Actualiza las métricas del tablero para convertir coordenadas de celda
     * a píxeles correctamente.
     * @param {number} boardOffsetX
     * @param {number} boardOffsetY
     * @param {number} cellSize
     */
    updateLayout(boardOffsetX, boardOffsetY, cellSize) {
        this.boardOffsetX = boardOffsetX;
        this.boardOffsetY = boardOffsetY;
        this.cellSize = cellSize;
    }

    /**
     * Dispara el efecto visual para el tipo de alimento consumido en (gridX, gridY).
     * gridX / gridY son coordenadas en píxeles de la cuadrícula (múltiplos de GRID_SIZE),
     * tal como los almacena el engine.
     *
     * @param {string} foodType  - 'apple' | 'grape' | 'speed' | 'poison' | …
     * @param {number} gridX     - coordenada x del engine (píxeles de grid)
     * @param {number} gridY     - coordenada y del engine (píxeles de grid)
     */
    trigger(foodType, gridX, gridY) {
        // Las manzanas y tipos desconocidos no generan efecto visual
        if (foodType === 'apple' || !(foodType in FOOD_EFFECT_COLORS)) return;

        const color = FOOD_EFFECT_COLORS[foodType];
        const label = FOOD_EFFECT_LABELS[foodType];

        // Centro de la celda en pantalla
        const col = Math.floor(gridX / GRID_SIZE);
        const row = Math.floor(gridY / GRID_SIZE);
        const cx  = this.boardOffsetX + col * this.cellSize + this.cellSize * 0.5;
        const cy  = this.boardOffsetY + row * this.cellSize + this.cellSize * 0.5;

        this._spawnParticleBurst(cx, cy, color);
        this._spawnFloatingLabel(cx, cy, label, color);
    }

    // ── Private ───────────────────────────────────────────────────────

    /**
     * Dibuja PARTICLE_COUNT pequeños círculos que parten del centro de la
     * celda en direcciones radiales y se desvanecen con la API de tweens.
     */
    _spawnParticleBurst(cx, cy, color) {
        const radius      = this.cellSize * 0.55;   // distancia final de cada partícula
        const particleR   = Math.max(2, this.cellSize * 0.09); // radio visual
        const duration    = EFFECT_DURATION_MS;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const angle   = (i / PARTICLE_COUNT) * Math.PI * 2;
            const targetX = cx + Math.cos(angle) * radius;
            const targetY = cy + Math.sin(angle) * radius;

            // Objeto de estado animable
            const state = { x: cx, y: cy, alpha: 1 };

            const tween = this.scene.tweens.add({
                targets: state,
                x: targetX,
                y: targetY,
                alpha: 0,
                duration,
                ease: 'Power2',
                onUpdate: () => {
                    // Re-dibujamos sólo este punto sobre el graphics layer.
                    // Dado que clearDynamicLayers() no limpia este layer,
                    // necesitamos un graphics por partícula o dibujar en update.
                    // Usamos un approach sencillo: Image temporal 1×1 transparente
                    // No disponible sin textura extra, así que usamos el onUpdate
                    // para actualizar un rect pequeño sin clear (ver nota abajo).
                },
                onComplete: () => {
                    tween.remove();
                },
            });

            // Alternativa limpia: crear una imagen cuadrada coloreada
            // usando un RenderTexture de 1px como textura base.
            this._drawParticleObject(cx, cy, targetX, targetY, color, particleR, duration, angle);
        }
    }

    /**
     * Crea un GameObject Rectangle de Phaser (no requiere textura) y lo
     * anima con tweens: se desplaza hacia targetX/Y y se desvanece.
     */
    _drawParticleObject(startX, startY, targetX, targetY, color, particleR, duration) {
        // Phaser.GameObjects.Rectangle es un GameObject nativo, no necesita sprite.
        const rect = this.scene.add.rectangle(
            startX, startY,
            particleR * 2, particleR * 2,
            color, 1
        ).setDepth(30);

        this.scene.tweens.add({
            targets: rect,
            x: targetX,
            y: targetY,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            duration,
            ease: 'Power2',
            onComplete: () => {
                rect.destroy();
            },
        });
    }

    /**
     * Crea un texto flotante que asciende y se desvanece en EFFECT_DURATION_MS.
     */
    _spawnFloatingLabel(cx, cy, label, color) {
        // Convertir color hex a CSS string para Phaser Text
        const cssColor = '#' + color.toString(16).padStart(6, '0');
        const fontSize  = Math.max(10, Math.round(this.cellSize * 0.55));

        const text = this.scene.add.text(cx, cy, label, {
            fontSize:   `${fontSize}px`,
            fontFamily: 'Arial, sans-serif',
            fontStyle:  'bold',
            color:      cssColor,
            stroke:     '#000000',
            strokeThickness: Math.max(1, Math.round(fontSize * 0.18)),
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 2,
                fill: true,
            },
        })
        .setOrigin(0.5, 1)
        .setDepth(35);

        const tween = this.scene.tweens.add({
            targets: text,
            y:       cy - this.cellSize * 1.4,
            alpha:   0,
            duration: EFFECT_DURATION_MS,
            ease: 'Power1',
            onComplete: () => {
                text.destroy();
                this._activeLabels = this._activeLabels.filter(e => e.text !== text);
            },
        });

        this._activeLabels.push({ text, tween });
    }

    /**
     * Limpia todos los efectos activos inmediatamente.
     * Llamar al destruir la escena para evitar leaks.
     */
    destroy() {
        this._activeLabels.forEach(({ text, tween }) => {
            tween?.stop();
            text?.destroy();
        });
        this._activeLabels = [];
        this.particleGraphics?.destroy();
        this.particleGraphics = null;
    }
}
