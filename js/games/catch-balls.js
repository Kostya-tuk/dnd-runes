// Мини-игра: Поймай шарики (как в "Ну, погоди!")

class CatchBallsGame {
    constructor(container, onWin) {
        this.container = container;
        this.onWin = onWin;
        this.score = 0;
        this.targetScore = 30;
        this.running = false;
        this.balls = [];
        this.basket = { x: 0, width: 80 };
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="game-score" id="catch-score">Очки: 0 / ${this.targetScore}</div>
            <canvas class="catch-canvas" id="catch-canvas" width="480" height="400"></canvas>
            <div class="game-controls">
                <button class="game-btn-control" id="btn-catch-start">Начать игру</button>
            </div>
        `;

        this.canvas = document.getElementById('catch-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.basket.x = this.canvas.width / 2 - this.basket.width / 2;

        this.canvas.addEventListener('mousemove', (e) => this.moveBasket(e));
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.moveBasket(e.touches[0]);
        });

        document.getElementById('btn-catch-start').addEventListener('click', () => this.start());
    }

    moveBasket(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        this.basket.x = Math.max(0, Math.min(x - this.basket.width / 2, this.canvas.width - this.basket.width));
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.score = 0;
        this.balls = [];
        document.getElementById('btn-catch-start').textContent = 'Идёт игра...';
        document.getElementById('btn-catch-start').disabled = true;
        this.gameLoop();
        this.spawnBalls();
    }

    spawnBalls() {
        if (!this.running) return;
        this.balls.push({
            x: Math.random() * (this.canvas.width - 30) + 15,
            y: -20,
            radius: 12,
            speed: 1.5 + Math.random() * 2.5,
            color: ['#c05858', '#5a9e6f', '#4a7eb0', '#c9a84c', '#8b6fc0'][Math.floor(Math.random() * 5)]
        });
        setTimeout(() => this.spawnBalls(), 600 + Math.random() * 400);
    }

    gameLoop() {
        if (!this.running) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем корзину
        this.ctx.fillStyle = '#2a2a36';
        this.ctx.fillRect(this.basket.x, this.canvas.height - 40, this.basket.width, 30);
        this.ctx.strokeStyle = '#5b4a9a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.basket.x, this.canvas.height - 40, this.basket.width, 30);

        // Рисуем шарики
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            ball.y += ball.speed;

            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = ball.color;
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // Проверка попадания в корзину
            if (ball.y + ball.radius >= this.canvas.height - 40 &&
                ball.y - ball.radius <= this.canvas.height - 10 &&
                ball.x > this.basket.x &&
                ball.x < this.basket.x + this.basket.width) {
                this.balls.splice(i, 1);
                this.score++;
                document.getElementById('catch-score').textContent = `Очки: ${this.score} / ${this.targetScore}`;

                if (this.score >= this.targetScore) {
                    this.running = false;
                    document.getElementById('catch-score').textContent = 'Победа! 30 очков!';
                    document.getElementById('btn-catch-start').textContent = 'Начать игру';
                    document.getElementById('btn-catch-start').disabled = false;
                    cancelAnimationFrame(this.animationId);
                    setTimeout(() => {
                        if (this.onWin) this.onWin(true);
                    }, 800);
                    return;
                }
                continue;
            }

            // Удаляем шарики, упавшие за экран
            if (ball.y - ball.radius > this.canvas.height) {
                this.balls.splice(i, 1);
            }
        }

        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    cleanup() {
        this.running = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }
}
