import { GRID_SIZE } from '@shared/GameConfig';

/**
 * HU-034 – Efectos visuales al consumir alimentos especiales.
 *
 * Mixin que añade dos métodos a cualquier Phaser.Scene de juego:
 *   • initFoodFx()   – llama una vez en create()
 *   • spawnFoodFx(gridX, gridY, foodType, foodConfig)  – dispara el efecto
 *   • destroyFoodFx() – limpia recursos al apagar la escena
 *
 * Criterios cubiertos:
 *  ✔ Solo tipos distintos de 'apple' generan efectos visuales.
 *  ✔ Burst de partículas del color asociado al tipo.
 *  ✔ Texto flotante que asciende y se desvanece en ~500 ms.
 *  ✔ Varios alimentos en el mismo ciclo generan efectos independientes.
 *  ✔ Tipo desconocido → sin efectos visuales (sonido por defecto, responsabilidad del caller).
 */

/** Color de partículas por tipo de alimento. */
const FOOD_FX_COLOR = {
    grape:  0x9b59b6,   // morado
    speed:  0x2ecc71,   // verde brillante
    poison: 0x27ae60,   // verde oscuro / veneno
};

/** Texto flotante por tipo de alimento. */
const FOOD_FX_LABEL = {
    grape:  '+3',
    speed:  '¡Boost!',
    poison: '-2 Lento',
};

/** Número de partículas por burst. */
const PARTICLE_COUNT = 12;

/** Duración total de la animación en milisegundos. */
const FX_DURATION_MS = 500;

/**
 * Mezcla el mixin en la instancia de una Phaser.Scene.
 * Uso: en create() → FoodFxMixin.init(this);
 */
export const FoodFxMixin = {
    /**
     * Inicializa las estructuras internas del mixin.
     * Debe llamarse al final de create(), después de inicializar boardOffsetX/Y y cellSize.
     *
     * @param {Phaser.Scene} scene
     */
    init(scene) {
        /** @type {Phaser.GameObjects.Graphics} Capa exclusiva para partículas manuales */
        scene._fxGraphics = scene.add.graphics().setDepth(100);

        /**
         * Lista de efectos activos.
         * Cada entrada: { px, py, color, label, startTime, textObj, particles }
         * donde particles = [{ x, y, vx, vy }]
         */
        scene._activeFx = [];

        /** Actualizar partículas cada frame */
        scene._fxUpdateHandler = (time, delta) => _tickFx(scene, time, delta);
        scene.events.on(Phaser.Scenes.Events.UPDATE, scene._fxUpdateHandler);
    },

    /**
     * Lanza el efecto visual para un alimento especial consumido.
     *
     * @param {Phaser.Scene} scene
     * @param {number}       gridX     – coordenada X en píxeles de la cuadrícula (múltiplo de GRID_SIZE)
     * @param {number}       gridY     – coordenada Y en píxeles de la cuadrícula (múltiplo de GRID_SIZE)
     * @param {string}       foodType  – tipo del alimento ('apple' | 'grape' | 'speed' | 'poison' | …)
     */
    spawn(scene, gridX, gridY, foodType) {
        // Las manzanas no generan efecto visual (criterio HU-034)
        if (foodType === 'apple') return;

        const color = FOOD_FX_COLOR[foodType];
        const label = FOOD_FX_LABEL[foodType];

        // Tipo desconocido → sin efecto visual
        if (color === undefined || label === undefined) return;

        // Centro de la celda en coordenadas de pantalla
        const col = Math.floor(gridX / GRID_SIZE);
        const row = Math.floor(gridY / GRID_SIZE);
        const px  = scene.boardOffsetX + col * scene.cellSize + scene.cellSize * 0.5;
        const py  = scene.boardOffsetY + row * scene.cellSize + scene.cellSize * 0.5;

        // Generar partículas con velocidades aleatorias en burst radial
        const particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const angle  = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.4;
            const speed  = 40 + Math.random() * 60;   // px/s
            particles.push({
                x:  px,
                y:  py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
            });
        }

        // Texto flotante
        const textObj = scene.add.text(px, py, label, {
            fontSize: `${Math.max(10, Math.round(scene.cellSize * 1.1))}px`,
            fontFamily: 'monospace',
            color:  '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            resolution: 2,
        })
            .setOrigin(0.5, 1)
            .setDepth(110)
            .setAlpha(1);

        scene._activeFx.push({
            px, py,
            color,
            label,
            startTime: scene.time.now,
            textObj,
            particles,
        });
    },

    /**
     * Limpia listeners y objetos gráficos.
     * Llamar en el evento SHUTDOWN de la escena.
     *
     * @param {Phaser.Scene} scene
     */
    destroy(scene) {
        if (scene._fxUpdateHandler) {
            scene.events.off(Phaser.Scenes.Events.UPDATE, scene._fxUpdateHandler);
        }
        if (scene._fxGraphics) {
            scene._fxGraphics.destroy();
        }
        if (scene._activeFx) {
            scene._activeFx.forEach(fx => {
                if (fx.textObj?.active) fx.textObj.destroy();
            });
            scene._activeFx = [];
        }
    },
};

// ─── Loop interno ─────────────────────────────────────────────────────────────

/**
 * Actualiza todos los efectos activos cada frame.
 * Se ejecuta desde el evento UPDATE de la escena.
 *
 * @param {Phaser.Scene} scene
 * @param {number}       time   – tiempo Phaser (ms)
 * @param {number}       delta  – delta frame (ms)
 */
function _tickFx(scene, time, delta) {
    if (!scene._activeFx || scene._activeFx.length === 0) return;

    const dt = delta / 1000;   // segundos
    scene._fxGraphics.clear();

    const remaining = [];

    for (const fx of scene._activeFx) {
        const elapsed  = time - fx.startTime;
        const progress = Math.min(elapsed / FX_DURATION_MS, 1);  // 0 → 1
        const alpha    = 1 - progress;

        // — Mover y dibujar partículas —
        for (const p of fx.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            // Fricción suave
            p.vx *= 0.92;
            p.vy *= 0.92;

            const radius = Math.max(1, scene.cellSize * 0.18 * (1 - progress * 0.6));
            scene._fxGraphics.fillStyle(fx.color, alpha);
            scene._fxGraphics.fillCircle(p.x, p.y, radius);
        }

        // — Texto flotante que asciende —
        if (fx.textObj?.active) {
            const rise = 30 * progress;   // sube hasta 30 px
            fx.textObj.setPosition(fx.px, fx.py - rise);
            fx.textObj.setAlpha(alpha);
        }

        if (progress < 1) {
            remaining.push(fx);
        } else {
            // Efecto terminado → limpiar
            if (fx.textObj?.active) fx.textObj.destroy();
        }
    }

    scene._activeFx = remaining;
}
