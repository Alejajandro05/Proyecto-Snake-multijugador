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

const SNAKE_DIRECTIONS = {
    up: "up",
    left: "left",
    right: "right",
    down: "down"
}

export const againstAIGameAiLogic = {
    targetApple: {y: null, x: null},

    calculateAINextDirection(oldState, engine) {
        const snakeboard = this.fetchsnakeboard(oldState, engine);

        //TODO if (P2_ID is alive) do else  don't do
        const direction = this.calculateAINextDirectionWithSnakeboard(snakeboard, oldState.players.get(P2_ID).direction);

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

    calculateAINextDirectionWithSnakeboard(snakeboard, currentAiDirection) {
        this.targetApple = this.findRandomTargetApple(snakeboard);
        return this.calculateAINextDirectionWithSnakeboardAndTargetApple(snakeboard, this.targetApple, currentAiDirection);
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

    calculateAINextDirectionWithSnakeboardAndTargetApple(snakeboard, targetApple, currentAiDirection) {
        const aiPlayerHead = this.findAiPlayerHead(snakeboard);
        const targetAppleDirection = this.calculateDirectionToTargetApple(snakeboard, aiPlayerHead, targetApple, currentAiDirection);
        return this.avoidObstaculeOrEnemy(snakeboard, aiPlayerHead, targetAppleDirection, currentAiDirection);
    },

    findAiPlayerHead(snakeboard) {
        for (let y = 0; y < snakeboard.length; y++) {
            for (let x = 0; x < snakeboard.length; x++) {
                if (snakeboard[y][x] == SNAKE_BOARD_TILE.aiPlayerHead) {
                    return {y:y, x:x};
                }
            }
        }
        throw error("AI Player Head not found!");
    },

    calculateDirectionToTargetApple(snakeboard, aiPlayerHead, targetApple, currentAiDirection) {
        if (aiPlayerHead.x === targetApple.x) {//TODO avoiding an obstacle could cause problems when requiring x to be the same
            if (this.verticalBorderDirectionFaster(snakeboard, aiPlayerHead, targetApple)) {
                return (aiPlayerHead.y-targetApple.y < 0) ? SNAKE_DIRECTIONS.up : SNAKE_DIRECTIONS.down;
            }
            else {
                return (aiPlayerHead.y-targetApple.y < 0) ? SNAKE_DIRECTIONS.down : SNAKE_DIRECTIONS.up;
            }
        }
        else {
            if (this.horizontalBorderDirectionFaster(snakeboard, aiPlayerHead, targetApple)) {
                return (aiPlayerHead.x-targetApple.x < 0) ? SNAKE_DIRECTIONS.left : SNAKE_DIRECTIONS.right;
            }
            else {
                return (aiPlayerHead.x-targetApple.x < 0) ? SNAKE_DIRECTIONS.right : SNAKE_DIRECTIONS.left;
            }
        }
    },

    horizontalBorderDirectionFaster(snakeboard, aiPlayerHead, targetApple) {
        return !(snakeboard[0].length/2 < aiPlayerHead.x-targetApple.x && aiPlayerHead.x-targetApple.x < snakeboard[0].length/2);
    },

    verticalBorderDirectionFaster(snakeboard, aiPlayerHead, targetApple) {
        return !(snakeboard.length/2 < aiPlayerHead.y-targetApple.y && aiPlayerHead.y-targetApple.y < snakeboard.length/2);
    },

    avoidObstaculeOrEnemy(snakeboard, aiPlayerHead, targetAppleDirection, currentAiDirection) {
        if (!this.obstaculInAISnakeDirection(snakeboard, aiPlayerHead, targetAppleDirection)) {
            return targetAppleDirection;
        }
        else {

        }
    },

    obstaculInAISnakeDirection(snakeboard, aiPlayerHead, nextSnakeDirection) {
        let nextX = aiPlayerHead.x;
        let nextY = aiPlayerHead.y;

        // count Direciton one up
        if (nextSnakeDirection == SNAKE_DIRECTIONS.up) {
            nextY += 1;
        }
        else if (nextSnakeDirection == SNAKE_DIRECTIONS.left) {
            nextX -= 1;
        }
        else if (nextSnakeDirection == SNAKE_DIRECTIONS.right) {
            nextX += 1;
        }
        else if (nextSnakeDirection == SNAKE_DIRECTIONS.down) {
            nextY += 1;
        }

        // next move to border appears at other side
        if (nextY >= snakeboard.length)
            nextY = 0;
        else if (nextY < 0)
            nextY = snakeboard.length;
        if (nextX >= snakeboard[0].length)
            nextX = 0;
        else if (nextX < 0)
            nextX = snakeboard[0].length;

        return (snakeboard[nextY][nextX] != SNAKE_BOARD_TILE.empty);
    },

    logSnakeboard(snakeboard) {
        console.log("");
        for (const snakeBoardRow of snakeboard) {
            console.log(...snakeBoardRow);
        }
        console.log("");
    }
};
