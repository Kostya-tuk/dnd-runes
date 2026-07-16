// Мини-игра: Запомни последовательность цветов

class MemoryColorsGame {
    constructor(container, onWin) {
        this.container = container;
        this.onWin = onWin;
        this.colors = ['#c05858', '#5a9e6f', '#4a7eb0', '#c9a84c', '#8b6fc0', '#c0608b'];
        this.sequence = [];
        this.playerSequence = [];
        this.showingSequence = false;
        this.round = 1;
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="game-status" id="game-status">Раунд ${this.round}</div>
            <div class="color-grid" id="color-grid"></div>
            <div class="game-controls">
                <button class="game-btn-control" id="btn-start">Начать раунд</button>
            </div>
        `;

        const grid = document.getElementById('color-grid');
        this.colors.forEach((color, index) => {
            const btn = document.createElement('button');
            btn.className = 'color-btn';
            btn.style.backgroundColor = color;
            btn.addEventListener('click', () => this.onColorClick(index, color));
            grid.appendChild(btn);
        });

        document.getElementById('btn-start').addEventListener('click', () => this.startRound());
    }

    startRound() {
        this.showingSequence = true;
        this.playerSequence = [];
        this.sequence = [];
        const status = document.getElementById('game-status');
        status.textContent = `Раунд ${this.round} — Запоминайте...`;

        for (let i = 0; i < this.round + 2; i++) {
            this.sequence.push(Math.floor(Math.random() * this.colors.length));
        }

        this.showSequence(0);
    }

    showSequence(index) {
        if (index >= this.sequence.length) {
            this.showingSequence = false;
            document.getElementById('game-status').textContent = `Раунд ${this.round} — Повторите!`;
            return;
        }

        const buttons = document.querySelectorAll('.color-btn');
        buttons.forEach(b => b.classList.remove('active'));

        setTimeout(() => {
            buttons[this.sequence[index]].classList.add('active');
            setTimeout(() => {
                buttons[this.sequence[index]].classList.remove('active');
                setTimeout(() => this.showSequence(index + 1), 200);
            }, 400);
        }, 300);
    }

    onColorClick(index, color) {
        if (this.showingSequence) return;

        this.playerSequence.push(index);
        const buttons = document.querySelectorAll('.color-btn');
        buttons[index].classList.add('active');
        setTimeout(() => buttons[index].classList.remove('active'), 200);

        const checkIndex = this.playerSequence.length - 1;
        if (this.playerSequence[checkIndex] !== this.sequence[checkIndex]) {
            document.getElementById('game-status').textContent = 'Неверно! Игра окончена.';
            setTimeout(() => {
                if (this.onWin) this.onWin(false);
            }, 1000);
            return;
        }

        if (this.playerSequence.length === this.sequence.length) {
            if (this.round >= 3) {
                document.getElementById('game-status').textContent = 'Победа! Вы запомнили последовательность.';
                setTimeout(() => {
                    if (this.onWin) this.onWin(true);
                }, 1000);
            } else {
                this.round++;
                document.getElementById('game-status').textContent = `Правильно! Раунд ${this.round}`;
                setTimeout(() => this.startRound(), 1500);
            }
        }
    }

    cleanup() {}
}
