const P1_ID = 'player1';
const P2_ID = 'player2';

const SNAKE_BOARD_TILE = {
    empty: 0,
    player: 1,
    playerHead: 2,
    aiPlayer: 3,
    aiPlayerHead: 4,
    food: 5,
    obstacle: 6,
};

export const againstAIGameAiLogic = {
    targetApple: {y: null, x: null},

    calculateAINextDirection(oldState, engine) {
        const snakeboard = this.fetchsnakeboard(oldState, engine);

        const direction = this.calculateAINextDirectionWithSnakeboard(snakeboard);

        engine.setNextDirection(P2_ID, "up"/*direction*/);//TODO use direction

        // TODO delete this
        this.logSnakeboard(snakeboard);
    },

    fetchsnakeboard(oldState, engine) {
        const config = engine.getConfig();
        const state = oldState;
        const snakeboard = Array.from({ length: config.gridRows }, () =>
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
                snakeboard[row][col] = tileValue;
            }
        };

        const player = state.players.get(P1_ID);
        const aiPlayer = state.players.get(P2_ID);

        state.food?.forEach?.((food) => setSnakeboardTile(food, SNAKE_BOARD_TILE.food));

       if (player?.alive && player.segments?.length) {
            player.segments.forEach((segment) => setSnakeboardTile(segment, SNAKE_BOARD_TILE.player));
            setSnakeboardTile(player.segments[0], SNAKE_BOARD_TILE.playerHead);
        }

        if (aiPlayer?.alive && aiPlayer.segments?.length) {
            aiPlayer.segments.forEach((segment) => setSnakeboardTile(segment, SNAKE_BOARD_TILE.aiPlayer));
            setSnakeboardTile(aiPlayer.segments[0], SNAKE_BOARD_TILE.aiPlayerHead);
        }

        state.obstacles?.forEach?.((obstacle) => setSnakeboardTile(obstacle, SNAKE_BOARD_TILE.obstacle));
        
        return snakeboard;
    },

    calculateAINextDirectionWithSnakeboard(snakeboard) {
        this.targetApple = this.findRandomTargetApple(snakeboard);
        return this.calculateAINextDirectionWithSnakeboardAndTargetApple(snakeboard, this.targetApple);
    },

    findRandomTargetApple(snakeboard) {
        if (!this.targetAppleExists(snakeboard)) {
            const randomRow = (Math.floor(Math.random() * snakeboard.length))
            return this.findFirstTargetApple(snakeboard, randomRow);
        }
            console.log(this.targetApple);
        return this.targetApple;
    },

    targetAppleExists(snakeboard) {
        return ((this.targetApple.x != null && this.targetApple.y != null)
                && (snakeboard[this.targetApple.y][this.targetApple.x] == SNAKE_BOARD_TILE.food));
    },

    findFirstTargetApple(snakeboard, startRow) {
        for (let yCounter = 0; yCounter < snakeboard.length; yCounter++) {
            const y = (yCounter+startRow >= snakeboard.length) ? yCounter+startRow-snakeboard.length : yCounter+startRow;
            for (let x = 0; x < snakeboard.length; x++) {
                if (snakeboard[y][x] == SNAKE_BOARD_TILE.food) {
                    return {y: y, x: x};
                }
            }
        }
        throw error("AI couldn't find Target Apple. No apple exist in the snakeboard!");
    },

    calculateAINextDirectionWithSnakeboardAndTargetApple(snakeboard, targetApple) {
        var direction = this.calculateDirectionToTargetApple(snakeboard, targetApple);
        direction = this.avoidObstaculeOrEnemy(snakeboard, direction);
        return direction;
    },

    calculateDirectionToTargetApple(snakeboard, targetApple) {

    },

    avoidObstaculeOrEnemy(snakeboard) {

    },

    logSnakeboard(snakeboard) {
        console.log("");
        for (const snakeBoardRow of snakeboard) {
            console.log(...snakeBoardRow);
        }
        console.log("");
    }
};
