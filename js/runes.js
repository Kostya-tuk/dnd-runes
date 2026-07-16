const DEFAULT_ALPHABET = {
    'ᚨ':'а','ᛒ':'б','ᚹ':'в','ᚷ':'г','ᛞ':'д','ᛖ':'е','ᛃ':'ж','ᛉ':'з','ᛁ':'и','ᚲ':'к',
    'ᛚ':'л','ᛗ':'м','ᚾ':'н','ᛟ':'о','ᛈ':'п','ᚱ':'р','ᛊ':'с','ᛏ':'т','ᚢ':'у','ᚠ':'ф',
    'ᚺ':'х','ᛜ':'ц','ᛝ':'ч','ᛞᛊ':'ш','ᛊᚲ':'щ','ᛇ':'ъ','ᛉᛁ':'ы','ᛒᛟ':'ь','ᛖᚢ':'э','ᛃᚢ':'ю','ᛃᚨ':'я'
};

function getReverseAlphabet(alphabet) {
    const reverse = {};
    for (const [rune, letter] of Object.entries(alphabet)) reverse[letter] = rune;
    return reverse;
}

function textToRunes(text, alphabet) {
    const reverse = getReverseAlphabet(alphabet);
    let result = '';
    const sortedLetters = Object.keys(reverse).sort((a,b)=>b.length-a.length);
    let i=0;
    while(i<text.length) {
        let matched=false;
        for(const letter of sortedLetters) {
            if(text.slice(i,i+letter.length).toLowerCase()===letter) { result+=reverse[letter]; i+=letter.length; matched=true; break; }
        }
        if(!matched) { result+=text[i]; i++; }
    }
    return result;
}

function runesToText(runes, alphabet, replaceUnknown=false) {
    let result = '';
    const sortedRunes = Object.keys(alphabet).sort((a,b)=>b.length-a.length);
    let i=0;
    while(i<runes.length) {
        let matched=false;
        for(const rune of sortedRunes) {
            if(runes.slice(i,i+rune.length)===rune) {
                result += alphabet[rune];
                i+=rune.length;
                matched=true;
                break;
            }
        }
        if(!matched) {
            result += replaceUnknown ? '?' : runes[i];
            i++;
        }
    }
    return result;
}

function filterAlphabetByKnown(fullAlphabet, playerGuesses, unlockedRunes) {
    const result = {};
    for (const [rune, value] of Object.entries(fullAlphabet)) {
        const unlocked = unlockedRunes.find(u => u.symbol === rune);
        if (unlocked) result[rune] = { value: unlocked.value, status: 'locked' };
        else if (playerGuesses[rune]) result[rune] = { value: playerGuesses[rune].value||'?', status: playerGuesses[rune].status||'uncertain' };
        else result[rune] = { value: '?', status: 'unknown' };
    }
    return result;
}

function shuffleAlphabet(alphabetData) {
    const entries = Object.entries(alphabetData);
    for (let i = entries.length-1; i>0; i--) { const j=Math.floor(Math.random()*(i+1)); [entries[i],entries[j]]=[entries[j],entries[i]]; }
    return Object.fromEntries(entries);
}

function renderRunePanel(container, alphabetData, isPlayer, onRuneClick) {
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'rune-grid';
    const shuffled = isPlayer ? shuffleAlphabet(alphabetData) : alphabetData;
    for (const [rune, data] of Object.entries(shuffled)) {
        const cell = document.createElement('div');
        cell.className = 'rune-cell';
        if (data.status==='locked') cell.classList.add('locked','known');
        else if (data.status==='confident') cell.classList.add('known','confident');
        else if (data.status==='uncertain') cell.classList.add('known','uncertain');
        if (isPlayer && data.status!=='locked') cell.classList.add('editable');
        cell.innerHTML = `<div class="rune-symbol">${rune}</div><div class="rune-value">${data.value!=='?'?data.value.toUpperCase():'?'}</div>`;
        if (data.status==='locked') cell.innerHTML += '<span class="rune-lock-icon">◆</span>';
        if (isPlayer && data.status!=='locked') {
            cell.addEventListener('click', (e) => {
                e.stopPropagation();
                if (cell.querySelector('.rune-edit-input')) return;
                showRuneEditor(cell, rune, data, onRuneClick);
            });
        }
        grid.appendChild(cell);
    }
    container.appendChild(grid);
}

function showRuneEditor(cell, rune, data, onRuneClick) {
    // Save original display
    const origInnerHTML = cell.innerHTML;
    cell.innerHTML = '';
    
    const input = document.createElement('input');
    input.type='text'; input.className='rune-edit-input'; input.maxLength=3;
    input.value = data.value!=='?' ? data.value : ''; 
    input.placeholder = 'буква';
    
    const statusSelect = document.createElement('select');
    statusSelect.className = 'rune-status-select';
    statusSelect.innerHTML = `
        <option value="">Статус...</option>
        <option value="confident" ${data.status==='confident'?'selected':''}>Уверен</option>
        <option value="uncertain" ${data.status==='uncertain'?'selected':''}>Наверное</option>
    `;
    
    cell.appendChild(input);
    cell.appendChild(statusSelect);
    input.focus();
    
    let savedValue = data.value!=='?' ? data.value : '';
    let savedStatus = data.status==='unknown' ? 'uncertain' : data.status;
    
    const save = () => {
        const val = input.value.trim().toLowerCase();
        const finalValue = val || savedValue || '?';
        const st = statusSelect.value || savedStatus || 'uncertain';
        
        // Update data
        if (onRuneClick) onRuneClick(rune, finalValue, st);
        
        // Re-render cell
        cell.innerHTML = `<div class="rune-symbol">${rune}</div><div class="rune-value">${finalValue!=='?'?finalValue.toUpperCase():'?'}</div>`;
        if (st==='confident') cell.classList.add('confident');
        else cell.classList.remove('confident');
        if (st==='uncertain') cell.classList.add('uncertain');
        if (finalValue!=='?') cell.classList.add('known');
        // Re-add click handler if not locked
        if (data.status!=='locked') {
            cell.classList.add('editable');
            cell.addEventListener('click', (e) => {
                e.stopPropagation();
                if (cell.querySelector('.rune-edit-input')) return;
                showRuneEditor(cell, rune, {value: finalValue, status: st}, onRuneClick);
            });
        }
    };
    
    // Auto-save on blur of both elements, but delay to allow status change to register
    let blurTimeout;
    const delayedSave = () => {
        clearTimeout(blurTimeout);
        blurTimeout = setTimeout(save, 200);
    };
    input.addEventListener('blur', delayedSave);
    statusSelect.addEventListener('change', () => {
        savedStatus = statusSelect.value;
        // Do not save value yet, just update status
    });
    statusSelect.addEventListener('blur', delayedSave);
    input.addEventListener('keydown', (e) => { if(e.key==='Enter') { clearTimeout(blurTimeout); save(); } });
}

function renderTranslator(container, alphabet, isPlayer, playerAlphabetData) {
    const section = document.createElement('div');
    section.className = 'translator-section';
    section.innerHTML = '<h3>Переводчик</h3>';
    const input = document.createElement('textarea');
    input.className='translator-input'; input.placeholder='Введите текст...';
    section.appendChild(input);
    const btnRow = document.createElement('div');
    btnRow.style.display='flex'; btnRow.style.gap='8px';
    const btnToRunes = document.createElement('button');
    btnToRunes.className='btn-translate'; btnToRunes.textContent='В руны';
    const btnToText = document.createElement('button');
    btnToText.className='btn-translate'; btnToText.textContent='Из рун';
    btnRow.appendChild(btnToRunes); btnRow.appendChild(btnToText);
    if (isPlayer) {
        const btnKeyboard = document.createElement('button');
        btnKeyboard.className='btn-translate'; btnKeyboard.textContent='Клавиатура рун';
        btnKeyboard.addEventListener('click', ()=>toggleFloatingKeyboard(playerAlphabetData));
        btnRow.appendChild(btnKeyboard);
    }
    section.appendChild(btnRow);
    const output = document.createElement('div');
    output.className='translator-output'; output.textContent='...';
    section.appendChild(output);

    let workingAlphabet = alphabet;
    if (isPlayer && playerAlphabetData) {
        workingAlphabet = {};
        for (const [rune, data] of Object.entries(playerAlphabetData)) {
            if (data.status!=='unknown') workingAlphabet[rune] = data.value;
        }
    }
    btnToRunes.addEventListener('click', ()=>{ output.textContent = textToRunes(input.value, workingAlphabet); });
    btnToText.addEventListener('click', ()=>{
        output.textContent = runesToText(input.value, workingAlphabet, isPlayer);
    });
    container.appendChild(section);
}

// Floating keyboard
let floatKeyboardVisible = false;
function toggleFloatingKeyboard(alphabetData) {
    const keyboard = document.getElementById('rune-keyboard-float');
    if (!keyboard) return;
    if (floatKeyboardVisible) {
        keyboard.style.display = 'none';
        floatKeyboardVisible = false;
    } else {
        buildFloatingKeyboard(alphabetData);
        keyboard.style.display = 'block';
        floatKeyboardVisible = true;
        // Default position
        keyboard.style.top = '100px';
        keyboard.style.left = '50px';
    }
}

function buildFloatingKeyboard(alphabetData) {
    const body = document.getElementById('rune-keyboard-body');
    body.innerHTML = '';
    for (const [rune] of Object.entries(alphabetData)) {
        const cell = document.createElement('div');
        cell.className = 'keyboard-rune-cell';
        cell.textContent = rune;
        cell.addEventListener('click', () => {
            // Insert rune into active input (chat or translator)
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
                const start = activeEl.selectionStart;
                const end = activeEl.selectionEnd;
                const val = activeEl.value;
                activeEl.value = val.substring(0, start) + rune + val.substring(end);
                activeEl.selectionStart = activeEl.selectionEnd = start + rune.length;
                activeEl.focus();
            }
        });
        body.appendChild(cell);
    }
}

// Draggable
document.addEventListener('DOMContentLoaded', () => {
    const keyboard = document.getElementById('rune-keyboard-float');
    const handle = document.getElementById('rune-keyboard-drag-handle');
    if (!keyboard || !handle) return;
    let offsetX, offsetY, mouseDown = false;
    handle.addEventListener('mousedown', (e) => {
        mouseDown = true;
        const rect = keyboard.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (!mouseDown) return;
        keyboard.style.left = (e.clientX - offsetX) + 'px';
        keyboard.style.top = (e.clientY - offsetY) + 'px';
    });
    document.addEventListener('mouseup', () => { mouseDown = false; });
    document.getElementById('keyboard-close').addEventListener('click', () => {
        keyboard.style.display = 'none';
        floatKeyboardVisible = false;
    });
});
