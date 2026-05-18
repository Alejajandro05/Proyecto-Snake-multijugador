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

        if (oldState.players.get(P2_ID).alive) {
            const snakeboard = this.fetchsnakeboard(oldState, engine);
            const direction = this.calculateAINextDirectionWithSnakeboard(snakeboard, oldState.players.get(P2_ID).direction);
            engine.setNextDirection(P2_ID, direction);
            this.logSnakeboard(snakeboard); // TODO delete this
        }
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
            console.log("Apple"); console.log(this.targetApple);
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
        console.error("AI couldn't find Target Apple. No apple exist in the snakeboard!");
    },

    calculateAINextDirectionWithSnakeboardAndTargetApple(snakeboard, targetApple, currentAiDirection) {
        const aiPlayerHead = this.findAiPlayerHead(snakeboard);

        const specialCaseMove = this.whenAlignedWithYExistsObstacule(snakeboard, aiPlayerHead, targetApple, currentAiDirection);// this is a rare specialcase
        if (specialCaseMove != null) return specialCaseMove;//when logic changes it should be avoided

        const targetAppleDirection = this.calculateDirectionToTargetApple(snakeboard, aiPlayerHead, targetApple, currentAiDirection);
        return this.avoidObstaculeOrEnemy(snakeboard, aiPlayerHead, targetAppleDirection, targetApple, currentAiDirection);
    },

    findAiPlayerHead(snakeboard) {
        for (let y = 0; y < snakeboard.length; y++) {
            for (let x = 0; x < snakeboard[0].length; x++) {
                if (snakeboard[y][x] == SNAKE_BOARD_TILE.aiPlayerHead) {
                    return {y:y, x:x};
                }
            }
        }
        console.error("AI Player Head not found!");
    },

    whenAlignedWithYExistsObstacule(snakeboard, aiPlayerHead, targetApple, currentAiDirection) {
        //TODO comment  what this function does and why it exists
        // this function is a rare case. When the sourrounding logic / method changes it should be avoided using this function.
        //TODO refactor this code
        const aiHeadAfterOneMove = this.calculateNextSnakeheadPosition(snakeboard, aiPlayerHead, currentAiDirection);

        if (aiHeadAfterOneMove.y != targetApple.y || snakeboard[aiHeadAfterOneMove.y][aiHeadAfterOneMove.x] != SNAKE_BOARD_TILE.empty) {
            return null;
        }

        const snakeboardAfterOneMove = this.calculateSnakeboardAfterOneMove(snakeboard, aiPlayerHead, aiHeadAfterOneMove);
        const directionAfterOneMove = this.fastestHorizontalDirectionToApple(snakeboardAfterOneMove, aiHeadAfterOneMove, targetApple);
        if (this.obstaculeInAISnakeDirection(snakeboardAfterOneMove,  aiHeadAfterOneMove, directionAfterOneMove)) {
            return directionAfterOneMove;
        }
        
        return null;
    },

    calculateSnakeboardAfterOneMove(snakeboard, currentAiPlayerHead, nextAiPlayerHead) {
        snakeboard[currentAiPlayerHead.y][currentAiPlayerHead.x] = SNAKE_BOARD_TILE.aiPlayer;
        snakeboard[nextAiPlayerHead.y][nextAiPlayerHead.x] = SNAKE_BOARD_TILE.aiPlayerHead;
        return snakeboard;
    },

    calculateDirectionToTargetApple(snakeboard, aiPlayerHead, targetApple, currentAiDirection) {
        console.log("AI Head x: "); console.log(aiPlayerHead);
        if (aiPlayerHead.y === targetApple.y) {//TODO avoiding an obstacle could cause problems when requiring x to be the same
            return this.fastestHorizontalDirectionToApple(snakeboard, aiPlayerHead, targetApple);
        }
        else {
            return this.fastestVerticalDirectionToApple(snakeboard, aiPlayerHead, targetApple);
        }
    },

    fastestVerticalDirectionToApple(snakeboard, aiPlayerHead, targetApple) {
        if (this.verticalBorderDirectionFaster(snakeboard, aiPlayerHead, targetApple)) {
            return (aiPlayerHead.y-targetApple.y < 0) ? SNAKE_DIRECTIONS.up : SNAKE_DIRECTIONS.down;
        }
        else {
            return (aiPlayerHead.y-targetApple.y < 0) ? SNAKE_DIRECTIONS.down : SNAKE_DIRECTIONS.up;
        }
    },

    fastestHorizontalDirectionToApple(snakeboard, aiPlayerHead, targetApple) {
        if (this.horizontalBorderDirectionFaster(snakeboard, aiPlayerHead, targetApple)) {
            return (aiPlayerHead.x-targetApple.x < 0) ? SNAKE_DIRECTIONS.left : SNAKE_DIRECTIONS.right;
        }
        else {
            return (aiPlayerHead.x-targetApple.x < 0) ? SNAKE_DIRECTIONS.right : SNAKE_DIRECTIONS.left;
        }
    },

    verticalBorderDirectionFaster(snakeboard, aiPlayerHead, targetApple) {
        return !(Math.abs(aiPlayerHead.y-targetApple.y) < snakeboard.length/2);
    },

    horizontalBorderDirectionFaster(snakeboard, aiPlayerHead, targetApple) {
        return !(Math.abs(aiPlayerHead.x-targetApple.x) < snakeboard[0].length/2);
    },

    avoidObstaculeOrEnemy(snakeboard, aiPlayerHead, targetAppleDirection, targetApple, currentAiDirection) {
        if (this.obstaculeInAISnakeDirection(snakeboard, aiPlayerHead, targetAppleDirection)) {
            console.log("AVOIDING OBSTACULE DIRECTION WAS: " + targetAppleDirection);
            return this.avoidObstacule_Helper(snakeboard, aiPlayerHead, targetAppleDirection, targetApple, currentAiDirection);
        }
        else {
            return targetAppleDirection;
        }
    },

    obstaculeInAISnakeDirection(snakeboard, aiPlayerHead, nextSnakeDirection) {
        const newAiHeadPosition = this.calculateNextSnakeheadPosition(snakeboard, aiPlayerHead, nextSnakeDirection);

        return (snakeboard[newAiHeadPosition.y][newAiHeadPosition.x] != SNAKE_BOARD_TILE.empty && snakeboard[newAiHeadPosition.y][newAiHeadPosition.x] != SNAKE_BOARD_TILE.food);
    },

    calculateNextSnakeheadPosition(snakeboard, snakeHead, nextSnakeDirection) {
        let nextX = snakeHead.x;
        let nextY = snakeHead.y;

        // count Direciton one up
        if (nextSnakeDirection == SNAKE_DIRECTIONS.up) {
            nextY -= 1;
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
            nextY = snakeboard.length-1;
        if (nextX >= snakeboard[0].length)
            nextX = 0;
        else if (nextX < 0)
            nextX = snakeboard[0].length-1;

        return {y: nextY, x: nextX};
    },

    avoidObstacule_Helper(snakeboard, aiPlayerHead, targetAppleDirection, targetApple, currentAiDirection) { //TODO better logic for avoiding obstacules, a queue could be nesecarry to move arount abstacules
        var direction = currentAiDirection;
        // try vertical (other side if horizontal)
        if (targetAppleDirection === SNAKE_DIRECTIONS.left || targetAppleDirection === SNAKE_DIRECTIONS.right) {
            direction = this.fastestVerticalDirectionToApple(snakeboard, aiPlayerHead, targetApple);
        }
        if (!this.obstaculeInAISnakeDirection(snakeboard, aiPlayerHead, direction))
            return direction;


        // try horizontal (other side if vertical)
        if (targetAppleDirection === SNAKE_DIRECTIONS.up || targetAppleDirection === SNAKE_DIRECTIONS.down) {
            direction = this.fastestHorizontalDirectionToApple(snakeboard, aiPlayerHead, targetApple);
        }
        if (!this.obstaculeInAISnakeDirection(snakeboard, aiPlayerHead, direction))
            return direction;

        return currentAiDirection;
        
    },

    logSnakeboard(snakeboard) {
        console.log("");
        for (const snakeBoardRow of snakeboard) {
            console.log(...snakeBoardRow);
        }
        console.log("");
    }
};
