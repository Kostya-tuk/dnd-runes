const GAMES = {
    memory_colors: { name:'Запомни последовательность', instance:null },
    find_pairs: { name:'Найди пары', instance:null },
    cups: { name:'Стаканчики', instance:null },
    timer: { name:'Отсчёт времени', instance:null },
    catch_balls: { name:'Цветные шарики', instance:null }
};

let activeGameCode = null;

function renderGamesPanel(container, availableGames) {
    const section = document.createElement('div');
    section.className = 'games-section';
    section.innerHTML = '<h3>Мини-игры</h3>';
    const list = document.createElement('div');
    list.className = 'games-list';
    for (const [key, game] of Object.entries(GAMES)) {
        const btn = document.createElement('button');
        btn.className = 'game-btn';
        if (availableGames[key]) btn.classList.add('available');
        btn.textContent = game.name + (availableGames[key]?' — доступна':' — недоступна');
        btn.disabled = !availableGames[key];
        btn.addEventListener('click', ()=>{
            if (availableGames[key]) {
                activeGameCode = availableGames[key];
                openGameModal(key);
            }
        });
        list.appendChild(btn);
    }
    section.appendChild(list);
    return section;
}

function renderCodeInput(container) {
    const area = document.createElement('div');
    area.className = 'code-input-area';
    area.innerHTML = '<h3>Ввести код</h3>';
    const input = document.createElement('input');
    input.type='text'; input.placeholder='Код мини-игры'; input.maxLength=20;
    area.appendChild(input);
    const btn = document.createElement('button');
    btn.className='btn-submit-code'; btn.textContent='Активировать код';
    btn.addEventListener('click', async ()=>{
        const code = input.value.trim().toUpperCase();
        if (!code) return;
        const result = await DB.verifyCode(code);
        if (!result) { showToast('Неверный код'); return; }
        if (result.used) { showToast('Код уже использован'); return; }
        DB.availableGames[result.game_type] = code;
        showToast(`Игра "${GAMES[result.game_type].name}" разблокирована!`);
        renderPanels();
    });
    area.appendChild(btn);
    return area;
}

function renderMasterCodes(container, codes) {
    const section = document.createElement('div');
    section.className = 'codes-section';
    section.innerHTML = '<h3>Коды мини-игр</h3>';
    const list = document.createElement('div');
    list.className = 'codes-list';
    const grouped = {};
    for (const c of codes) { if(!grouped[c.game_type]) grouped[c.game_type]=[]; grouped[c.game_type].push(c); }
    for (const [gameType, gameCodes] of Object.entries(grouped)) {
        const gameName = GAMES[gameType] ? GAMES[gameType].name : gameType;
        for (const c of gameCodes) {
            const item = document.createElement('div');
            item.className = 'code-item';
            if (c.used) item.classList.add('code-used');
            item.innerHTML = `<span class="code-text">${c.code}</span><span class="code-game">${gameName}${c.used?' (исп.)':''}</span>`;
            if (!c.used && !c.active) {
                const activateBtn = document.createElement('button');
                activateBtn.className = 'btn-translate';
                activateBtn.textContent = 'Выдать';
                activateBtn.style.marginLeft='8px';
                activateBtn.addEventListener('click', async ()=>{
                    await DB.activateCodeForPlayers(c.id, c.game_type);
                    showToast('Код выдан игрокам');
                });
                item.appendChild(activateBtn);
            }
            list.appendChild(item);
        }
    }
    section.appendChild(list);
    return section;
}

function renderPlayerProgressDetail(container, players, fullAlphabet) {
    const section = document.createElement('div');
    section.className = 'players-progress';
    section.innerHTML = '<h3>Прогресс игроков</h3>';
    for (const player of players) {
        const card = document.createElement('div');
        card.className = 'player-progress-card';
        const name = document.createElement('div');
        name.className = 'player-progress-name';
        const knownCount = Object.values(player.guesses).filter(g=>g.status==='confident'||g.status==='locked').length;
        const unlockedCount = player.unlocked.length;
        name.textContent = `${player.player_name} — известно ${knownCount}/${Object.keys(fullAlphabet).length}, разблокировано ${unlockedCount}`;
        card.appendChild(name);
        const detailGrid = document.createElement('div');
        detailGrid.className = 'rune-grid';
        for (const [rune, correctValue] of Object.entries(fullAlphabet)) {
            const cell = document.createElement('div');
            cell.className = 'rune-cell';
            const guess = player.guesses[rune];
            const unlocked = player.unlocked.find(u=>u.symbol===rune);
            if (unlocked) cell.classList.add('locked','known');
            else if (guess && guess.status==='confident') cell.classList.add('known','confident');
            else if (guess && guess.status==='uncertain') cell.classList.add('known','uncertain');
            let guessVal = '?';
            if (unlocked) guessVal = unlocked.value;
            else if (guess && guess.value) guessVal = guess.value;
            cell.innerHTML = `<div class="rune-symbol">${rune}</div><div class="rune-value">${guessVal.toUpperCase()}</div>`;
            detailGrid.appendChild(cell);
        }
        card.appendChild(detailGrid);
        section.appendChild(card);
    }
    return section;
}

function openGameModal(gameType) {
    const modal = document.getElementById('game-modal');
    const content = document.getElementById('game-modal-content');
    const game = GAMES[gameType];
    content.innerHTML = `<button class="modal-close" id="modal-close">✕</button><div class="modal-title">${game.name}</div><div class="game-container" id="game-container"></div>`;
    document.getElementById('modal-close').addEventListener('click', ()=>{ modal.classList.remove('active'); if(game.instance&&game.instance.cleanup) game.instance.cleanup(); });
    modal.classList.add('active');
    const gameContainer = document.getElementById('game-container');
    const onWin = async (won) => {
        if (won && activeGameCode) {
            await DB.markCodeUsed(activeGameCode);
            activeGameCode = null;
        }
        closeGameModal();
        if (won) {
            const knownRunes = Object.keys(playerGuesses).filter(r=>playerGuesses[r].status==='confident'||playerGuesses[r].status==='locked');
            const allRunes = Object.keys(DEFAULT_ALPHABET);
            const unknownRunes = allRunes.filter(r=>!knownRunes.includes(r)&&!unlockedRuned.find(u=>u.symbol===r));
            if (unknownRunes.length>0) {
                const randomRune = unknownRunes[Math.floor(Math.random()*unknownRunes.length)];
                const correctValue = DEFAULT_ALPHABET[randomRune];
                unlockedRuned = await DB.unlockRune(randomRune, correctValue);
                playerGuesses[randomRune] = { value: correctValue, status: 'locked' };
                renderPanels();
                showToast(`Руна "${randomRune}" разблокирована! Значение: "${correctValue}"`);
            } else {
                showToast('Все руны уже известны!');
            }
        }
    };
    switch(gameType) {
        case 'memory_colors': game.instance = new MemoryColorsGame(gameContainer, onWin); break;
        case 'find_pairs': game.instance = new FindPairsGame(gameContainer, onWin); break;
        case 'cups': game.instance = new CupsGame(gameContainer, onWin); break;
        case 'timer': game.instance = new TimerGame(gameContainer, onWin); break;
        case 'catch_balls': game.instance = new CatchBallsGame(gameContainer, onWin); break;
    }
}

function closeGameModal() {
    document.getElementById('game-modal').classList.remove('active');
}
