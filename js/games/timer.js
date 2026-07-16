// Мини-игра: Отсчёт времени

class TimerGame {
    constructor(container, onWin) {
        this.container = container;
        this.onWin = onWin;
        this.targetTime = 0;
        this.startTime = 0;
        this.elapsed = 0;
        this.running = false;
        this.timerInterval = null;
        this.difficulty = 'medium';
        this.init();
    }

    init() {
        this.setDifficulty();
        this.container.innerHTML = `
            <div class="game-status">Остановите таймер как можно ближе к <strong>${this.targetTime.toFixed(1)}</strong> секунд</div>
            <div class="timer-display" id="timer-display">0.0</div>
            <div class="game-controls">
                <button class="game-btn-control" id="btn-timer-start">Старт</button>
                <button class="game-btn-control" id="btn-timer-stop" disabled>Стоп</button>
                <button class="game-btn-control" id="btn-timer-reset">Сброс</button>
            </div>
        `;

        document.getElementById('btn-timer-start').addEventListener('click', () => this.start());
        document.getElementById('btn-timer-stop').addEventListener('click', () => this.stop());
        document.getElementById('btn-timer-reset').addEventListener('click', () => this.reset());
    }

    setDifficulty() {
        this.targetTime = 3 + Math.random() * 8; // от 3 до 11 секунд
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.startTime = Date.now();
        document.getElementById('btn-timer-start').disabled = true;
        document.getElementById('btn-timer-stop').disabled = false;
        document.getElementById('timer-display').textContent = '0.0';

        this.timerInterval = setInterval(() => {
            this.elapsed = (Date.now() - this.startTime) / 1000;
            document.getElementById('timer-display').textContent = this.elapsed.toFixed(1);
        }, 100);
    }

    stop() {
        if (!this.running) return;
        this.running = false;
        clearInterval(this.timerInterval);
        this.elapsed = (Date.now() - this.startTime) / 1000;
        document.getElementById('timer-display').textContent = this.elapsed.toFixed(1);
        document.getElementById('btn-timer-start').disabled = false;
        document.getElementById('btn-timer-stop').disabled = true;

        const diff = Math.abs(this.elapsed - this.targetTime);
        const threshold = 0.5; // полсекунды погрешность

        if (diff <= threshold) {
            document.querySelector('.game-status').textContent =
                `Отлично! Разница: ${diff.toFixed(1)} сек. Цель: ${this.targetTime.toFixed(1)} сек.`;
            setTimeout(() => {
                if (this.onWin) this.onWin(true);
            }, 1000);
        } else {
            document.querySelector('.game-status').textContent =
                `Мимо! Разница: ${diff.toFixed(1)} сек. Цель: ${this.targetTime.toFixed(1)} сек. Попробуйте ещё.`;
        }
    }

    reset() {
        this.running = false;
        clearInterval(this.timerInterval);
        this.elapsed = 0;
        document.getElementById('timer-display').textContent = '0.0';
        document.getElementById('btn-timer-start').disabled = false;
        document.getElementById('btn-timer-stop').disabled = true;
        this.setDifficulty();
        document.querySelector('.game-status').textContent =
            `Остановите таймер как можно ближе к <strong>${this.targetTime.toFixed(1)}</strong> секунд`;
    }

    cleanup() {
        clearInterval(this.timerInterval);
    }
}
