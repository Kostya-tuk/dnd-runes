// Мини-игра: Угадай под каким стаканчиком красный мячик

class CupsGame {
    constructor(container, onWin) {
        this.container = container;
        this.onWin = onWin;
        this.cupsCount = 5;
        this.ballPosition = -1;
        this.shuffling = false;
        this.chosen = -1;
        this.init();
    }

    init() {
        this.ballPosition = Math.floor(Math.random() * this.cupsCount);

        this.container.innerHTML = `
            <div class="game-status" id="game-status">Следите за стаканчиками...</div>
            <div class="cups-container" id="cups-container"></div>
            <div class="game-controls">
                <button class="game-btn-control" id="btn-shuffle">Перемешать</button>
                <button class="game-btn-control" id="btn-reset">Заново</button>
            </div>
        `;

        this.renderCups();
        document.getElementById('btn-shuffle').addEventListener('click', () => this.shuffle());
        document.getElementById('btn-reset').addEventListener('click', () => {
            this.ballPosition = Math.floor(Math.random() * this.cupsCount);
            this.chosen = -1;
            this.renderCups();
            document.getElementById('game-status').textContent = 'Следите за стаканчиками...';
        });
    }

    renderCups() {
        const container = document.getElementById('cups-container');
        container.innerHTML = '';

        for (let i = 0; i < this.cupsCount; i++) {
            const cup = document.createElement('button');
            cup.className = 'cup';
            if (i === this.chosen) cup.classList.add('revealed');
            if (i === this.chosen && i === this.ballPosition) cup.classList.add('has-ball');
            cup.textContent = i + 1;
            cup.addEventListener('click', () => this.choose(i));
            container.appendChild(cup);
        }
    }

    async shuffle() {
        if (this.shuffling) return;
        this.shuffling = true;
        this.chosen = -1;
        document.getElementById('game-status').textContent = 'Перемешиваю...';

        const cups = document.querySelectorAll('.cup');
        for (let s = 0; s < 8; s++) {
            const i1 = Math.floor(Math.random() * this.cupsCount);
            const i2 = Math.floor(Math.random() * this.cupsCount);

            if (i1 === this.ballPosition) this.ballPosition = i2;
            else if (i2 === this.ballPosition) this.ballPosition = i1;

            await this.animateSwap(i1, i2);
        }

        this.shuffling = false;
        document.getElementById('game-status').textContent = 'Выберите стаканчик!';
    }

    async animateSwap(i1, i2) {
        const cups = document.querySelectorAll('.cup');
        const c1 = cups[i1];
        const c2 = cups[i2];

        const x1 = c1.getBoundingClientRect().x;
        const x2 = c2.getBoundingClientRect().x;
        const dx = x2 - x1;

        c1.style.transform = `translateX(${dx}px)`;
        c2.style.transform = `translateX(${-dx}px)`;

        await new Promise(r => setTimeout(r, 200));

        c1.style.transform = '';
        c2.style.transform = '';

        const parent = c1.parentNode;
        const afterC2 = c2.nextSibling;
        parent.insertBefore(c2, c1);
        parent.insertBefore(c1, afterC2);
    }

    choose(index) {
        if (this.shuffling) return;
        this.chosen = index;
        this.renderCups();

        if (index === this.ballPosition) {
            document.getElementById('game-status').textContent = 'Верно! Красный мячик здесь.';
            setTimeout(() => {
                if (this.onWin) this.onWin(true);
            }, 1000);
        } else {
            document.getElementById('game-status').textContent = 'Неверно! Попробуйте ещё раз.';
        }
    }

    cleanup() {}
}
