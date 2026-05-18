/** Orden de introducción de frutas en el tutorial (acumulativo en práctica). */
export const TUTORIAL_FRUIT_PROGRESSION = ['apple', 'grape', 'speed', 'poison'];

/** Pasos del tutorial interactivo (una serpiente, popups con juego pausado). */
export const INTERACTIVE_TUTORIAL_STEPS = [
    {
        id: 'board',
        title: 'Tu serpiente',
        body: 'Este es el tablero de la Arena 03. Controlas la Snake 3. En este tutorial solo hay una serpiente.',
        skipPracticeAfter: true,
    },
    {
        id: 'controls',
        title: 'Controles',
        body: 'Muévete con W (arriba), A (izquierda), S (abajo) y D (derecha). No puedes girar 180° de golpe. ¡Prueba a moverte un poco!',
        practice: true,
    },
    {
        id: 'apple',
        title: 'Manzana',
        body: 'Las manzanas suman +1 punto y hacen crecer tu serpiente. Acércate y cómelas para practicar.',
        practice: true,
        fruitType: 'apple',
        fruitCount: 5,
    },
    {
        id: 'grape',
        title: 'Uva',
        body: 'La uva vale +3 puntos. Al practicar también pueden reaparecer manzanas, pero no otros tipos nuevos todavía.',
        practice: true,
        fruitType: 'grape',
        fruitCount: 5,
    },
    {
        id: 'speed',
        title: 'Fresa (velocidad)',
        body: 'La fresa acelera tu serpiente durante unos segundos. Al practicar pueden reaparecer manzanas y uvas.',
        practice: true,
        fruitType: 'speed',
        fruitCount: 5,
    },
    {
        id: 'poison',
        title: 'Kiwi (veneno)',
        body: 'El kiwi resta 2 puntos y te ralentiza. Al practicar pueden reaparecer todos los tipos que ya conoces.',
        practice: true,
        fruitType: 'poison',
        fruitCount: 5,
    },
    {
        id: 'obstacles',
        title: 'Obstáculos',
        body: 'Las rocas bloquean el paso. Si chocas contra una pierdes una vida y reapareces tras unos segundos.',
        practice: true,
        mixedWorld: true,
        obstacles: 8,
    },
    {
        id: 'self-collision',
        title: 'Tu propio cuerpo',
        body: 'Si chocas con tu propia cola, pierdes una vida. Mantén espacio para girar.',
        practice: true,
        mixedWorld: true,
        obstacles: 6,
    },
    {
        id: 'wrap',
        title: 'Bordes del tablero',
        body: 'En el modo normal los bordes son continuos: sales por un lado y entras por el opuesto. Prueba a cruzar un borde.',
        practice: true,
        mixedWorld: true,
        obstacles: 6,
    },
    {
        id: 'objective',
        title: 'Objetivo de la partida',
        body: 'En duelo ganas llegando a 15 puntos o dejando al rival sin vidas (3 corazones). ¡Ya estás listo para jugar!',
        advanceToCompletion: true,
    },
];
