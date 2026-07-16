// Менеджер мини-игр

const GAMES = {
    memory_colors: {
        name: 'Запомни последовательность',
        description: 'Повторите последовательность цветов',
        instance: null
    },
    find_pairs: {
        name: 'Найди пары',
        description: 'Откройте все пары одинаковых символов',
        instance: null
    },
    cups: {
        name: 'Стаканчики',
        description: 'Угадайте, под каким стаканчиком красный мячик',
        instance: null
    },
    timer: {
        name: 'Отсчёт времени',
        description: 'Остановите таймер как можно ближе к заданному времени',
        instance: null
    },
    catch_balls: {
        name: 'Поймай шарики',
        description: 'Поймайте 30 шариков в корзину',
        instance: null
    }
};

function renderGamesPanel(container, isPlayer, onGameSelect) {
    const section = document.createElement('div');
    section.className = 'games-section';

    const title = document.createElement('h3');
    title.textContent = 'Мини-игры';
    section.appendChild(title);

    const list = document.createElement('div');
    list.className = 'games-list';

    for (const [key, game] of Object.entries(GAMES)) {
        const btn = document.createElement('button');
        btn.className = 'game-btn';
        btn.textContent = game.name;
        btn.addEventListener('click', () => {
            if (onGameSelect) onGameSelect(key);
        });
        list.appendChild(btn);
    }

    section.appendChild(list);
    return section;
}

function renderCodeInput(container, onSubmitCode) {
    const area = document.createElement('div');
    area.className = 'code-input-area';

    const title = document.createElement('h3');
    title.textContent = 'Ввести код';
    area.appendChild(title);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Код мини-игры';
    input.maxLength = 20;
    area.appendChild(input);

    const btn = document.createElement('button');
    btn.className = 'btn-submit-code';
    btn.textContent = 'Активировать код';
    btn.addEventListener('click', () => {
        const code = input.value.trim().toUpperCase();
        if (code && onSubmitCode) onSubmitCode(code);
    });
    area.appendChild(btn);

    return area;
}

function renderMasterCodes(container, codes) {
    const section = document.createElement('div');
    section.className = 'codes-section';

    const title = document.createElement('h3');
    title.textContent = 'Коды мини-игр';
    section.appendChild(title);

    const list = document.createElement('div');
    list.className = 'codes-list';

    const grouped = {};
    for (const code of codes) {
        if (!grouped[code.game_type]) grouped[code.game_type] = [];
        grouped[code.game_type].push(code);
    }

    for (const [gameType, gameCodes] of Object.entries(grouped)) {
        const gameName = GAMES[gameType] ? GAMES[gameType].name : gameType;
        for (const c of gameCodes) {
            const item = document.createElement('div');
            item.className = 'code-item';
            if (c.used) item.classList.add('code-used');

            const codeText = document.createElement('span');
            codeText.className = 'code-text';
            codeText.textContent = c.code;

            const gameLabel = document.createElement('span');
            gameLabel.className = 'code-game';
            gameLabel.textContent = gameName + (c.used ? ' (исп.)' : '');

            item.appendChild(codeText);
            item.appendChild(gameLabel);
            list.appendChild(item);
        }
    }

    section.appendChild(list);
    return section;
}

function renderPlayersProgress(container, players) {
    const section = document.createElement('div');
    section.className = 'players-progress';

    const title = document.createElement('h3');
    title.textContent = 'Прогресс игроков';
    section.appendChild(title);

    for (const player of players) {
        const card = document.createElement('div');
        card.className = 'player-progress-card';

        const name = document.createElement('div');
        name.className = 'player-progress-name';
        name.textContent = player.player_name;

        const stats = document.createElement('div');
        stats.className = 'player-progress-stats';

        const knownCount = Object.values(player.guesses).filter(g =>
            g.status === 'confident' || g.status === 'locked'
        ).length;
        const unlockedCount = player.unlocked.length;
        const totalRunes = Object.keys(DEFAULT_ALPHABET).length;

        stats.innerHTML = `Известно рун: <span>${knownCount}</span> / ${totalRunes} | Разблокировано: <span>${unlockedCount}</span>`;

        card.appendChild(name);
        card.appendChild(stats);
        section.appendChild(card);
    }

    return section;
}

// Открыть модальное окно с игрой
function openGameModal(gameType, onWin) {
    const modal = document.getElementById('game-modal');
    const content = document.getElementById('game-modal-content');
    if (!modal || !content) return;

    const game = GAMES[gameType];
    if (!game) return;

    content.innerHTML = `
        <button class="modal-close" id="modal-close">✕</button>
        <div class="modal-title">${game.name}</div>
        <div class="game-container" id="game-container"></div>
    `;

    document.getElementById('modal-close').addEventListener('click', () => {
        modal.classList.remove('active');
        if (game.instance && game.instance.cleanup) game.instance.cleanup();
    });

    modal.classList.add('active');

    const gameContainer = document.getElementById('game-container');

    // Запускаем соответствующую игру
    switch (gameType) {
        case 'memory_colors':
            game.instance = new MemoryColorsGame(gameContainer, onWin);
            break;
        case 'find_pairs':
            game.instance = new FindPairsGame(gameContainer, onWin);
            break;
        case 'cups':
            game.instance = new CupsGame(gameContainer, onWin);
            break;
        case 'timer':
            game.instance = new TimerGame(gameContainer, onWin);
            break;
        case 'catch_balls':
            game.instance = new CatchBallsGame(gameContainer, onWin);
            break;
    }
}

function closeGameModal() {
    const modal = document.getElementById('game-modal');
    if (modal) modal.classList.remove('active');
}
