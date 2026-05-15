import { MAX_LIVES, WIN_SCORE } from '@shared/GameConfig.js';

export const TUTORIAL_SECTIONS = [
    {
        id: 'objective',
        title: 'Objetivo',
        items: [
            `Gana el primero en alcanzar ${WIN_SCORE} puntos o cuando tu rival se quede sin vidas.`,
            `Cada jugador empieza con ${MAX_LIVES} vidas. Al morir pierdes una y reapareces tras unos segundos.`,
            'Come frutas para sumar puntos y hacer crecer tu serpiente.',
        ],
    },
    {
        id: 'controls',
        title: 'Controles',
        items: [
            'Jugador 1: teclas W, A, S y D.',
            'Jugador 2: flechas del teclado (↑ ↓ ← →).',
            'ESC: pausa la partida y abre el menú de pausa.',
            'En partidas online usas las mismas teclas en tu lado del tablero.',
        ],
    },
    {
        id: 'fruits',
        title: 'Frutas',
        items: [
            'Manzana (+1): suma 1 punto y crece tu serpiente.',
            'Uva (+3): suma 3 puntos de golpe.',
            'Fresa (velocidad): acelera tu serpiente durante 5 segundos.',
            'Kiwi (veneno): resta 2 puntos y te ralentiza 5 segundos.',
        ],
    },
    {
        id: 'obstacles',
        title: 'Obstáculos',
        items: [
            'En el tablero hay rocas u otros obstáculos según el mapa y la dificultad.',
            'Si chocas contra un obstáculo pierdes una vida y reapareces en otra zona.',
            'A mayor dificultad, más obstáculos aparecen en el mapa.',
        ],
    },
    {
        id: 'collisions',
        title: 'Colisiones',
        items: [
            'Chocar con tu propio cuerpo o el del rival te elimina (pierdes una vida).',
            'Cabeza contra cabeza: gana la serpiente más larga; si miden igual, mueren las dos.',
            'En el modo clásico, salir por un borde del tablero también te elimina.',
            'En el modo normal los bordes son continuos: sales por un lado y entras por el opuesto.',
        ],
    },
    {
        id: 'modes',
        title: 'Modos de juego',
        items: [
            'Juego local: elige modo (clásico, contrarreloj, caos, rey de la colina, territorio…) y dificultad en la configuración.',
            '1 vs 1 online: crea o únete a una sala y compite contra otro jugador en red.',
            'Consulta la descripción de cada modo en la pantalla de configuración local.',
        ],
    },
];
