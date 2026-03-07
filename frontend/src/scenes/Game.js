export class Game extends Phaser.Scene {
    constructor() {
        super('Game');

        this.snake = [];
        this.food = {};
        this.direction = 'right';
        this.nextDirection = 'right';
        this.gridSize = 32;
        this.snakeSpeed = 150;
        this.lastMoveTime = 0;
        this.isGameOver = false;
    }

    create() {
        this.isGameOver = false;
        this.direction = 'right';
        this.nextDirection = 'right';
        this.cameras.main.setBackgroundColor(0x00ff00);
        this.add.image(512, 384, 'background').setAlpha(0.5);

        // Create tutorial text 
        this.tutorialText = this.add.text(512, 100, 'Use arrow keys to move the snake', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // Initialize snake
        this.snake = [];
        const startX = 5;
        const startY = 5;

        // Create initial snake body (3 segments), feel free to play with it
        for (let i = 0; i < 3; i++) {
            const segment = this.add.rectangle(
                (startX - i) * this.gridSize,
                startY * this.gridSize,
                this.gridSize - 2,
                this.gridSize - 2,
                0x000000
            );
            this.snake.push(segment);
        }

        // Spawn initial food
        this.spawnFood();

        // Setup keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();

        // Add listener for any key press to hide tutorial
        this.input.keyboard.on('keydown', () => {
            if (this.tutorialText.visible) {
                this.tutorialText.setVisible(false);
            }
        });
    }

    update(time) {
        if (this.isGameOver) return;

        // Handle input
        if (this.cursors.left.isDown && this.direction !== 'right') {
            this.nextDirection = 'left';
        } else if (this.cursors.right.isDown && this.direction !== 'left') {
            this.nextDirection = 'right';
        } else if (this.cursors.up.isDown && this.direction !== 'down') {
            this.nextDirection = 'up';
        } else if (this.cursors.down.isDown && this.direction !== 'up') {
            this.nextDirection = 'down';
        }

        // Move snake at fixed intervals
        if (time >= this.lastMoveTime + this.snakeSpeed) {
            this.moveSnake();
            this.lastMoveTime = time;
        }
    }

    moveSnake() {
        // Update current direction
        this.direction = this.nextDirection;

        // Calculate new head position
        const head = this.snake[0];
        let newX = head.x;
        let newY = head.y;

        switch (this.direction) {
            case 'left':
                newX -= this.gridSize;
                break;
            case 'right':
                newX += this.gridSize;
                break;
            case 'up':
                newY -= this.gridSize;
                break;
            case 'down':
                newY += this.gridSize;
                break;
        }

        // Check for collisions with walls
        if (newX < 0 || newX >= 1024 || newY < 0 || newY >= 768) {
            this.gameOver();
            return;
        }

        // Check for collision with self
        for (let segment of this.snake) {
            if (newX === segment.x && newY === segment.y) {
                this.gameOver();
                return;
            }
        }

        // Check for food collision
        const eating = newX === this.food.x && newY === this.food.y;

        // Move snake
        const newHead = this.add.rectangle(newX, newY, this.gridSize - 2, this.gridSize - 2, 0x000000);
        this.snake.unshift(newHead);

        if (!eating) {
            // Remove tail if not eating
            const tail = this.snake.pop();
            tail.destroy();
        } else {
            // Spawn new food if eating
            this.food.destroy();
            this.spawnFood();
        }
    }

    spawnFood() {
        const x = Math.floor(Math.random() * (1024 / this.gridSize)) * this.gridSize;
        const y = Math.floor(Math.random() * (768 / this.gridSize)) * this.gridSize;
        this.food = this.add.rectangle(x, y, this.gridSize - 2, this.gridSize - 2, 0xff0000);
    }

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;

        // Reset directions
        this.direction = 'right';
        this.nextDirection = 'right';

        // Destroy all existing game objects
        this.snake.forEach(segment => segment.destroy());
        this.snake = [];
        if (this.food) {
            this.food.destroy();
        }

        this.add.text(512, 384, 'GAME OVER', {
            fontFamily: 'Arial Black',
            fontSize: 64,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // Restart the scene after a delay
        this.time.delayedCall(1000, () => {
            this.scene.restart();
        });
    }
}
