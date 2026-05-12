const P1_ID = 'player1';
const P2_ID = 'player2';

const SNAKE_BOARD_TILE = {
    empty: 0,
    player: 1,
    aiPlayer: 2,
    food: 3,
    obstacle: 4,
};

export const againstAIGameAiLogic = {
    calculateAINextDirection(oldState, engine) {
        const snakeboard2dPositions = this.fetchSnakeboard2dPositions(oldState, engine);
        console.log(snakeboard2dPositions);
        engine.setNextDirection(P2_ID, "up");
    },

    fetchSnakeboard2dPositions(oldState, engine) {
        const config = engine.getConfig();
        const state = oldState;
        const snakeboard2dPositions = Array.from({ length: config.gridRows }, () =>
            Array(config.gridCols).fill(SNAKE_BOARD_TILE.empty)
        );

        const setSnakeboardTile = (position, tileValue) => {
            const col = position.x / config.gridSize;
            const row = position.y / config.gridSize;

            if (
                Number.isInteger(col) &&
                Number.isInteger(row) &&
                row >= 0 &&
                row < config.gridRows &&
                col >= 0 &&
                col < config.gridCols
            ) {
                snakeboard2dPositions[row][col] = tileValue;
            }
        };

        const player = state.players.get(P1_ID);
        const aiPlayer = state.players.get(P2_ID);

        state.food?.forEach?.((food) => setSnakeboardTile(food, SNAKE_BOARD_TILE.food));

       if (player?.alive && player.segments?.length) {
            player.segments.forEach((segment) => setSnakeboardTile(segment, SNAKE_BOARD_TILE.player));
        }

        if (aiPlayer?.alive && aiPlayer.segments?.length) {
            aiPlayer.segments.forEach((segment) => setSnakeboardTile(segment, SNAKE_BOARD_TILE.aiPlayer));
        }

        state.obstacles?.forEach?.((obstacle) => setSnakeboardTile(obstacle, SNAKE_BOARD_TILE.obstacle));
        
        return snakeboard2dPositions;
    }
};
