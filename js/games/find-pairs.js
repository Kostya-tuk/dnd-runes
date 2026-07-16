// Мини-игра: Найди пары

class FindPairsGame {
    constructor(container, onWin) {
        this.container = container;
        this.onWin = onWin;
        this.symbols = ['ᚨ', 'ᛒ', 'ᚹ', 'ᚷ', 'ᛞ', 'ᛖ', 'ᛉ', 'ᛁ'];
        this.cards = [];
        this.flipped = [];
        this.matched = [];
        this.lockBoard = false;
        this.moves = 0;
        this.init();
    }

    init() {
        // Создаём пары
        this.cards = [...this.symbols, ...this.symbols];
        this.shuffle(this.cards);

        this.container.innerHTML = `
            <div class="game-status" id="game-status">Ходов: 0</div>
            <div class="pairs-grid" id="pairs-grid"></div>
        `;

        const grid = document.getElementById('pairs-grid');
        this.cards.forEach((symbol, index) => {
            const card = document.createElement('button');
            card.className = 'pair-card';
            card.dataset.index = index;
            card.dataset.symbol = symbol;
            card.addEventListener('click', () => this.flipCard(card, index));
            grid.appendChild(card);
        });
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    flipCard(card, index) {
        if (this.lockBoard) return;
        if (this.flipped.length === 2) return;
        if (this.matched.includes(index)) return;
        if (this.flipped.includes(index)) return;

        card.classList.add('flipped');
        card.textContent = this.cards[index];
        this.flipped.push(index);

        if (this.flipped.length === 2) {
            this.moves++;
            document.getElementById('game-status').textContent = `Ходов: ${this.moves}`;
            this.checkMatch();
        }
    }

    checkMatch() {
        const [i1, i2] = this.flipped;
        const cards = document.querySelectorAll('.pair-card');

        if (this.cards[i1] === this.cards[i2]) {
            this.matched.push(i1, i2);
            cards[i1].classList.add('matched');
            cards[i2].classList.add('matched');
            this.flipped = [];

            if (this.matched.length === this.cards.length) {
                document.getElementById('game-status').textContent = `Победа! Ходов: ${this.moves}`;
                setTimeout(() => {
                    if (this.onWin) this.onWin(this.moves <= 12);
                }, 800);
            }
        } else {
            this.lockBoard = true;
            setTimeout(() => {
                cards[i1].classList.remove('flipped');
                cards[i1].textContent = '';
                cards[i2].classList.remove('flipped');
                cards[i2].textContent = '';
                this.flipped = [];
                this.lockBoard = false;
            }, 600);
        }
    }

    cleanup() {}
}
