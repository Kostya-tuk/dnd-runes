// Главный модуль приложения

let playerGuesses = {};
let unlockedRuned = [];
let completedGames = [];

// Инициализация частиц
function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    const runes = 'ᚨᛒᚹᚷᛞᛖᛉᛁᚲᛚᛗᚾᛟᛈᚱᛊᛏᚢᚠᚺ';
    for (let i = 0; i < 30; i++) {
        const span = document.createElement('span');
        span.className = 'particle';
        span.textContent = runes[Math.floor(Math.random() * runes.length)];
        span.style.left = Math.random() * 100 + '%';
        span.style.fontSize = (12 + Math.random() * 24) + 'px';
        span.style.animationDuration = (10 + Math.random() * 20) + 's';
        span.style.animationDelay = Math.random() * 15 + 's';
        container.appendChild(span);
    }
}

// Переключение экранов
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Обработчики форм входа
function initLoginScreen() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const joinForm = document.getElementById('join-form');
    const createForm = document.getElementById('create-form');
    const errorDiv = document.getElementById('login-error');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            joinForm.classList.toggle('active', tab === 'join');
            createForm.classList.toggle('active', tab === 'create');
            errorDiv.textContent = '';
        });
    });

    // Подключение к комнате
    joinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDiv.textContent = '';
        const roomId = document.getElementById('join-room-id').value.trim().toUpperCase();
        const nickname = document.getElementById('join-nickname').value.trim();
        const masterPassword = document.getElementById('join-master-password').value.trim();

        if (!roomId || !nickname) {
            errorDiv.textContent = 'Заполните все поля';
            return;
        }

        try {
            let isMaster = false;
            let passwordHash = null;
            if (masterPassword) {
                passwordHash = await DB.hashPassword(masterPassword);
                isMaster = true;
            }
            await DB.joinRoom(roomId, nickname, isMaster, passwordHash);
            await loadGameScreen();
        } catch (err) {
            errorDiv.textContent = err.message || 'Ошибка подключения';
        }
    });

    // Создание комнаты
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDiv.textContent = '';
        const masterName = document.getElementById('create-master-name').value.trim();
        const password = document.getElementById('create-master-password').value;
        const roomName = document.getElementById('create-room-name').value.trim();

        if (!masterName || !password || !roomName) {
            errorDiv.textContent = 'Заполните все поля';
            return;
        }

        try {
            const passwordHash = await DB.hashPassword(password);
            const room = await DB.createRoom(roomName, masterName, passwordHash);
            await DB.joinRoom(room.id, masterName, true, passwordHash);
            await loadGameScreen();
        } catch (err) {
            errorDiv.textContent = err.message || 'Ошибка создания комнаты';
        }
    });
}

// Загрузка игрового экрана
async function loadGameScreen() {
    showScreen('game-screen');

    document.getElementById('room-id-display').textContent = DB.currentRoom.id;
    document.getElementById('room-name-display').textContent = DB.currentRoom.name;
    document.getElementById('player-name-display').textContent = DB.currentUser.nickname;

    const roleBadge = document.getElementById('role-badge-display');
    if (DB.isMaster) {
        roleBadge.textContent = 'Мастер';
        roleBadge.className = 'role-badge master';
    } else {
        roleBadge.textContent = 'Игрок';
        roleBadge.className = 'role-badge player';
    }

    // Загружаем историю чата
    const history = await DB.loadChatHistory();
    chatMessages = [];
    document.getElementById('chat-messages').innerHTML = '';
    history.forEach(msg => {
        chatMessages.push(msg);
        appendChatMessage(msg);
    });

    // Загружаем прогресс игрока
    if (!DB.isMaster) {
        const { data: progress } = await supabase
            .from('player_progress')
            .select('*')
            .eq('room_id', DB.currentRoom.id)
            .eq('player_id', DB.currentUser.id)
            .single();

        if (progress) {
            playerGuesses = typeof progress.rune_guesses === 'string'
                ? JSON.parse(progress.rune_guesses) : (progress.rune_guesses || {});
            unlockedRuned = typeof progress.unlocked_runes === 'string'
                ? JSON.parse(progress.unlocked_runes) : (progress.unlocked_runes || []);
            completedGames = typeof progress.games_completed === 'string'
                ? JSON.parse(progress.games_completed) : (progress.games_completed || []);
        }
    }

    renderPanels();
    setupChatInput();
    setupLeaveButton();

    // Периодическое обновление панели мастера
    if (DB.isMaster) {
        setInterval(async () => {
            await refreshMasterPanels();
        }, 5000);
    }
}

// Рендер панелей
function renderPanels() {
    const runePanelBody = document.getElementById('rune-panel-body');
    const toolsPanelBody = document.getElementById('tools-panel-body');
    const runePanelTitle = document.getElementById('rune-panel-title');
    const toolsPanelTitle = document.getElementById('tools-panel-title');

    toolsPanelBody.innerHTML = '';

    if (DB.isMaster) {
        runePanelTitle.textContent = 'Полный алфавит';
        const fullAlphabetData = {};
        for (const [rune, value] of Object.entries(DEFAULT_ALPHABET)) {
            fullAlphabetData[rune] = { value, status: 'known' };
        }
        renderRunePanel(runePanelBody, fullAlphabetData, false, null);

        toolsPanelTitle.textContent = 'Инструменты мастера';
        renderTranslator(toolsPanelBody, DEFAULT_ALPHABET, false, {}, []);

        // Коды и прогресс
        refreshMasterPanels();
    } else {
        runePanelTitle.textContent = 'Ваш алфавит';
        const filteredAlphabet = filterAlphabetByKnown(DEFAULT_ALPHABET, playerGuesses, unlockedRuned);

        renderRunePanel(runePanelBody, filteredAlphabet, true, (rune, value, status) => {
            playerGuesses[rune] = { value, status };
            DB.updateRuneGuesses(playerGuesses);
            const newFiltered = filterAlphabetByKnown(DEFAULT_ALPHABET, playerGuesses, unlockedRuned);
            renderRunePanel(runePanelBody, newFiltered, true, (r, v, s) => {
                playerGuesses[r] = { value: v, status: s };
                DB.updateRuneGuesses(playerGuesses);
            });
        });

        toolsPanelTitle.textContent = 'Инструменты';
        const workingAlphabet = {};
        for (const [rune, value] of Object.entries(DEFAULT_ALPHABET)) {
            const guess = playerGuesses[rune];
            const unlocked = unlockedRuned.find(u => u.symbol === rune);
            if (unlocked) {
                workingAlphabet[rune] = unlocked.value;
            } else if (guess && (guess.status === 'confident' || guess.status === 'uncertain')) {
                workingAlphabet[rune] = guess.value;
            }
        }
        const playerAlphabetData = filterAlphabetByKnown(DEFAULT_ALPHABET, playerGuesses, unlockedRuned);
        renderTranslator(toolsPanelBody, playerAlphabetData, true, playerGuesses, unlockedRuned);

        // Поле ввода кода
        const codeInputArea = renderCodeInput(toolsPanelBody, async (code) => {
            const result = await DB.verifyCode(code);
            if (!result) {
                showToast('Неверный или уже использованный код');
                return;
            }
            await DB.markCodeUsed(result.id);
            showToast('Код принят! Выберите мини-игру в списке ниже.');
        });
        toolsPanelBody.appendChild(codeInputArea);

        // Список мини-игр
        const gamesSection = renderGamesPanel(toolsPanelBody, true, (gameType) => {
            openGameModal(gameType, async (won) => {
                if (won) {
                    // Выдаём случайную неизвестную руну
                    const knownRunes = Object.keys(playerGuesses).filter(r =>
                        playerGuesses[r].status === 'confident' || playerGuesses[r].status === 'locked'
                    );
                    const allRunes = Object.keys(DEFAULT_ALPHABET);
                    const unknownRunes = allRunes.filter(r => !knownRunes.includes(r) &&
                        !unlockedRuned.find(u => u.symbol === r));

                    if (unknownRunes.length > 0) {
                        const randomRune = unknownRunes[Math.floor(Math.random() * unknownRunes.length)];
                        const correctValue = DEFAULT_ALPHABET[randomRune];
                        unlockedRuned = await DB.unlockRune(randomRune, correctValue);

                        // Обновляем локально
                        playerGuesses[randomRune] = { value: correctValue, status: 'locked' };

                        closeGameModal();
                        renderPanels();
                        showToast(`Руна "${randomRune}" разблокирована! Значение: "${correctValue}"`);
                    } else {
                        closeGameModal();
                        showToast('Все руны уже известны!');
                    }
                } else {
                    closeGameModal();
                }
            });
        });
        toolsPanelBody.appendChild(gamesSection);
    }
}

async function refreshMasterPanels() {
    if (!DB.isMaster) return;
    const toolsPanelBody = document.getElementById('tools-panel-body');
    if (!toolsPanelBody) return;

    // Очищаем только секции с данными, оставляя переводчик
    const existingTranslator = toolsPanelBody.querySelector('.translator-section');
    const existingTitle = toolsPanelBody.querySelector('h3');

    toolsPanelBody.innerHTML = '';
    document.getElementById('tools-panel-title').textContent = 'Инструменты мастера';

    // Переводчик
    renderTranslator(toolsPanelBody, DEFAULT_ALPHABET, false, {}, []);

    // Коды
    const codes = await DB.getRoomCodes();
    const codesSection = renderMasterCodes(toolsPanelBody, codes);
    toolsPanelBody.appendChild(codesSection);

    // Прогресс игроков
    const players = await DB.getPlayersProgress();
    const progressSection = renderPlayersProgress(toolsPanelBody, players);
    toolsPanelBody.appendChild(progressSection);
}

// Настройка чата
function setupChatInput() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('btn-send');

    sendBtn.addEventListener('click', () => sendMessage());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    await DB.sendChatMessage(text);
}

// Кнопка выхода
function setupLeaveButton() {
    document.getElementById('btn-leave').addEventListener('click', async () => {
        await DB.disconnect();
        chatMessages = [];
        playerGuesses = {};
        unlockedRuned = [];
        completedGames = [];
        showScreen('login-screen');
    });
}

// Обработчик обновлений рун от игроков
function onRuneUpdate(payload) {
    if (DB.isMaster) {
        refreshMasterPanels();
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initLoginScreen();
    showScreen('login-screen');
});

// Закрытие модального окна по клику на фон
document.addEventListener('click', (e) => {
    if (e.target.id === 'game-modal') {
        closeGameModal();
    }
});
