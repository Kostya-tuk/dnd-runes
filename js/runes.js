// Рунический алфавит и переводчик

// Полный алфавит (руна -> русская буква)
// Используем Elder Futhark + адаптированные руны для покрытия русского алфавита
const DEFAULT_ALPHABET = {
    'ᚨ': 'а', 'ᛒ': 'б', 'ᚹ': 'в', 'ᚷ': 'г', 'ᛞ': 'д',
    'ᛖ': 'е', 'ᛃ': 'ж', 'ᛉ': 'з', 'ᛁ': 'и', 'ᚲ': 'к',
    'ᛚ': 'л', 'ᛗ': 'м', 'ᚾ': 'н', 'ᛟ': 'о', 'ᛈ': 'п',
    'ᚱ': 'р', 'ᛊ': 'с', 'ᛏ': 'т', 'ᚢ': 'у', 'ᚠ': 'ф',
    'ᚺ': 'х', 'ᛜ': 'ц', 'ᛝ': 'ч', 'ᛞᛊ': 'ш', 'ᛊᚲ': 'щ',
    'ᛇ': 'ъ', 'ᛉᛁ': 'ы', 'ᛒᛟ': 'ь', 'ᛖᚢ': 'э', 'ᛃᚢ': 'ю',
    'ᛃᚨ': 'я'
};

// Обратный словарь
function getReverseAlphabet(alphabet) {
    const reverse = {};
    for (const [rune, letter] of Object.entries(alphabet)) {
        reverse[letter] = rune;
    }
    return reverse;
}

// Преобразовать текст в руны (на основе словаря)
function textToRunes(text, alphabet) {
    const reverse = getReverseAlphabet(alphabet);
    let result = '';
    // Сортируем ключи по длине (длинные сначала) чтобы корректно заменять многосимвольные руны
    const sortedLetters = Object.keys(reverse).sort((a, b) => b.length - a.length);

    let i = 0;
    while (i < text.length) {
        let matched = false;
        for (const letter of sortedLetters) {
            if (text.slice(i, i + letter.length).toLowerCase() === letter) {
                result += reverse[letter];
                i += letter.length;
                matched = true;
                break;
            }
        }
        if (!matched) {
            result += text[i];
            i++;
        }
    }
    return result;
}

// Преобразовать руны в текст (на основе словаря)
function runesToText(runes, alphabet) {
    let result = '';
    // Сортируем ключи по длине (длинные сначала)
    const sortedRunes = Object.keys(alphabet).sort((a, b) => b.length - a.length);

    let i = 0;
    while (i < runes.length) {
        let matched = false;
        for (const rune of sortedRunes) {
            if (runes.slice(i, i + rune.length) === rune) {
                result += alphabet[rune];
                i += rune.length;
                matched = true;
                break;
            }
        }
        if (!matched) {
            result += runes[i];
            i++;
        }
    }
    return result;
}

// Отфильтровать алфавит только по известным рунам (для игрока)
function filterAlphabetByKnown(fullAlphabet, playerGuesses, unlockedRunes) {
    const result = {};
    for (const [rune, value] of Object.entries(fullAlphabet)) {
        // Если руна разблокирована через мини-игру
        const unlocked = unlockedRunes.find(u => u.symbol === rune);
        if (unlocked) {
            result[rune] = { value: unlocked.value, status: 'locked' };
        }
        // Если игрок сделал предположение
        else if (playerGuesses[rune]) {
            result[rune] = {
                value: playerGuesses[rune].value || '?',
                status: playerGuesses[rune].status || 'uncertain'
            };
        }
        // Неизвестная руна
        else {
            result[rune] = { value: '?', status: 'unknown' };
        }
    }
    return result;
}

// Функции рендеринга алфавита
function renderRunePanel(container, alphabetData, isPlayer, onRuneClick) {
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'rune-grid';

    for (const [rune, data] of Object.entries(alphabetData)) {
        const cell = document.createElement('div');
        cell.className = 'rune-cell';

        // Определяем классы
        if (data.status === 'locked') {
            cell.classList.add('locked', 'known');
        } else if (data.status === 'confident') {
            cell.classList.add('known', 'confident');
        } else if (data.status === 'uncertain') {
            cell.classList.add('known', 'uncertain');
        }

        if (isPlayer && data.status !== 'locked') {
            cell.classList.add('editable');
        }

        const symbol = document.createElement('div');
        symbol.className = 'rune-symbol';
        symbol.textContent = rune;

        const value = document.createElement('div');
        value.className = 'rune-value';
        value.textContent = data.value !== '?' ? data.value.toUpperCase() : '?';

        cell.appendChild(symbol);
        cell.appendChild(value);

        if (data.status === 'locked') {
            const lockIcon = document.createElement('span');
            lockIcon.className = 'rune-lock-icon';
            lockIcon.textContent = '◆';
            cell.appendChild(lockIcon);
        }

        if (isPlayer && data.status !== 'locked') {
            cell.addEventListener('click', () => {
                showRuneEditor(cell, rune, data, alphabetData, onRuneClick);
            });
        }

        grid.appendChild(cell);
    }
    container.appendChild(grid);
}

function showRuneEditor(cell, rune, data, alphabetData, onRuneClick) {
    const currentValue = data.value !== '?' ? data.value : '';
    const currentStatus = data.status === 'unknown' ? '' : data.status;

    cell.innerHTML = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'rune-edit-input';
    input.maxLength = 3;
    input.value = currentValue;
    input.placeholder = 'буква';

    const statusSelect = document.createElement('select');
    statusSelect.className = 'rune-status-select';
    statusSelect.innerHTML = `
        <option value="">Статус...</option>
        <option value="confident" ${currentStatus === 'confident' ? 'selected' : ''}>Уверен</option>
        <option value="uncertain" ${currentStatus === 'uncertain' ? 'selected' : ''}>Наверное</option>
    `;

    cell.appendChild(input);
    cell.appendChild(statusSelect);
    input.focus();

    const save = () => {
        const newValue = input.value.trim().toLowerCase();
        const newStatus = statusSelect.value;
        if (onRuneClick) {
            onRuneClick(rune, newValue || '?', newStatus || 'uncertain');
        }
    };

    input.addEventListener('blur', () => {
        setTimeout(save, 200);
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
    });
    statusSelect.addEventListener('change', save);
}

// Рендер переводчика
function renderTranslator(container, alphabet, isPlayer, playerGuesses, unlockedRuned) {
    container.innerHTML = '';

    const section = document.createElement('div');
    section.className = 'translator-section';

    const title = document.createElement('h3');
    title.textContent = 'Переводчик';
    section.appendChild(title);

    const input = document.createElement('textarea');
    input.className = 'translator-input';
    input.placeholder = 'Введите текст...';
    section.appendChild(input);

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '8px';

    const btnToRunes = document.createElement('button');
    btnToRunes.className = 'btn-translate';
    btnToRunes.textContent = 'В руны';
    btnRow.appendChild(btnToRunes);

    const btnToText = document.createElement('button');
    btnToText.className = 'btn-translate';
    btnToText.textContent = 'Из рун';
    btnRow.appendChild(btnToText);

    section.appendChild(btnRow);

    const output = document.createElement('div');
    output.className = 'translator-output';
    output.textContent = '...';
    section.appendChild(output);

    // Определяем рабочий алфавит
    let workingAlphabet = alphabet;
    if (isPlayer) {
        workingAlphabet = {};
        for (const [rune, data] of Object.entries(alphabet)) {
            if (data.status === 'locked' || data.status === 'confident' || data.status === 'uncertain') {
                workingAlphabet[rune] = data.value;
            }
        }
    }

    btnToRunes.addEventListener('click', () => {
        output.textContent = textToRunes(input.value, workingAlphabet);
    });

    btnToText.addEventListener('click', () => {
        output.textContent = runesToText(input.value, workingAlphabet);
    });

    container.appendChild(section);
}
