let playerGuesses = {};
let unlockedRuned = [];
let completedGames = [];

function initParticles() {
    const c=document.getElementById('particles'); if(!c) return;
    const r='ᚨᛒᚹᚷᛞᛖᛉᛁᚲᛚᛗᚾᛟᛈᚱᛊᛏᚢᚠᚺ';
    for(let i=0;i<30;i++){ const s=document.createElement('span'); s.className='particle'; s.textContent=r[Math.floor(Math.random()*r.length)]; s.style.left=Math.random()*100+'%'; s.style.fontSize=(12+Math.random()*24)+'px'; s.style.animationDuration=(10+Math.random()*20)+'s'; s.style.animationDelay=Math.random()*15+'s'; c.appendChild(s); }
}

function showScreen(id) { document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); document.getElementById(id).classList.add('active'); }

// Session persistence
function saveSession() {
    if (!DB.currentUser) return;
    const data = {
        roomId: DB.currentRoom.id,
        nickname: DB.currentUser.nickname,
        isMaster: DB.isMaster,
        passwordHash: DB.isMaster ? DB.currentRoom.master_password_hash : null
    };
    localStorage.setItem('dnd_rune_session', JSON.stringify(data));
}

function clearSession() {
    localStorage.removeItem('dnd_rune_session');
}

async function restoreSession() {
    const raw = localStorage.getItem('dnd_rune_session');
    if (!raw) return false;
    try {
        const data = JSON.parse(raw);
        await DB.joinRoom(data.roomId, data.nickname, data.isMaster, data.passwordHash);
        await DB.loadUnlockedGames(DB.currentUser.id); // Load permanent unlocks
        return true;
    } catch (e) {
        clearSession();
        return false;
    }
}

function initLoginScreen() {
    document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
        document.querySelectorAll('.tab-btn').forEach(b2=>b2.classList.remove('active')); b.classList.add('active');
        const isJoin = b.dataset.tab==='join';
        document.getElementById('join-form').classList.toggle('active', isJoin);
        document.getElementById('create-form').classList.toggle('active', !isJoin);
    }));

    document.getElementById('join-form').addEventListener('submit',async(e)=>{
        e.preventDefault(); const err=document.getElementById('login-error'); err.textContent='';
        const rid=document.getElementById('join-room-id').value.trim().toUpperCase();
        const nick=document.getElementById('join-nickname').value.trim();
        const accessCode = document.getElementById('join-master-access-code').value.trim();
        if(!rid||!nick){ err.textContent='Заполните все поля'; return; }
        
        let isMaster = false;
        let passwordHash = null;
        if (accessCode) {
            if (accessCode !== MASTER_ACCESS_CODE) { err.textContent='Неверный код доступа мастера'; return; }
            // Need room password as well
            const roomPassword = prompt('Введите пароль комнаты:');
            if (!roomPassword) return;
            passwordHash = await DB.hashPassword(roomPassword);
            isMaster = true;
        }
        try{
            await DB.joinRoom(rid, nick, isMaster, passwordHash);
            if (!isMaster) await DB.loadUnlockedGames(DB.currentUser.id);
            saveSession();
            await loadGameScreen();
        } catch(ex){ err.textContent=ex.message; }
    });

    document.getElementById('create-form').addEventListener('submit',async(e)=>{
        e.preventDefault(); const err=document.getElementById('login-error'); err.textContent='';
        const name=document.getElementById('create-master-name').value.trim();
        const accessCode=document.getElementById('create-master-access-code').value.trim();
        const pw=document.getElementById('create-master-password').value;
        const rn=document.getElementById('create-room-name').value.trim();
        if(!name||!pw||!rn||!accessCode){ err.textContent='Заполните все поля'; return; }
        if(accessCode !== MASTER_ACCESS_CODE){ err.textContent='Неверный код доступа мастера'; return; }
        try{
            const ph=await DB.hashPassword(pw);
            const room=await DB.createRoom(rn,name,ph);
            await DB.joinRoom(room.id,name,true,ph);
            saveSession();
            await loadGameScreen();
        } catch(ex){ err.textContent=ex.message; }
    });
}

async function loadGameScreen() {
    showScreen('game-screen');
    document.getElementById('room-id-display').textContent=DB.currentRoom.id;
    document.getElementById('room-name-display').textContent=DB.currentRoom.name;
    document.getElementById('player-name-display').textContent=DB.currentUser.nickname;
    const rb=document.getElementById('role-badge-display');
    rb.textContent=DB.isMaster?'Мастер':'Игрок'; rb.className='role-badge '+(DB.isMaster?'master':'player');
    const history = await DB.loadChatHistory();
    chatMessages=[]; document.getElementById('chat-messages').innerHTML='';
    history.forEach(m=>{ chatMessages.push(m); appendChatMessage(m); });
    if(!DB.isMaster){
        const {data:p}=await dbClient.from('player_progress').select('*').eq('room_id',DB.currentRoom.id).eq('player_id',DB.currentUser.id).single();
        if(p){
            playerGuesses=typeof p.rune_guesses==='string'?JSON.parse(p.rune_guesses):(p.rune_guesses||{});
            unlockedRuned=typeof p.unlocked_runes==='string'?JSON.parse(p.unlocked_runes):(p.unlocked_runes||[]);
            completedGames=typeof p.games_completed==='string'?JSON.parse(p.games_completed):(p.games_completed||[]);
            // Load unlocked games from DB
            if (p.unlocked_games) {
                const games = typeof p.unlocked_games==='string'?JSON.parse(p.unlocked_games):p.unlocked_games;
                games.forEach(g => DB.availableGames[g] = true);
            }
        }
    }
    renderPanels();
    document.getElementById('btn-send').addEventListener('click',sendMessage);
    document.getElementById('chat-input').addEventListener('keydown',(e)=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(); } });
    document.getElementById('btn-leave').addEventListener('click',async()=>{
        await DB.disconnect();
        chatMessages=[];
        playerGuesses={};
        unlockedRuned=[];
        clearSession();
        showScreen('login-screen');
    });
}

function renderPanels() {
    const rpb=document.getElementById('rune-panel-body'), tpb=document.getElementById('tools-panel-body');
    tpb.innerHTML='';
    if(DB.isMaster){
        document.getElementById('rune-panel-title').textContent='Полный алфавит';
        const fa={}; for(const[r,v]of Object.entries(DEFAULT_ALPHABET)) fa[r]={value:v,status:'known'};
        renderRunePanel(rpb,fa,false,null);
        document.getElementById('tools-panel-title').textContent='Инструменты мастера';
        renderTranslator(tpb,DEFAULT_ALPHABET,false,null);
        refreshMasterPanels();
    } else {
        document.getElementById('rune-panel-title').textContent='Ваш алфавит';
        const fa=filterAlphabetByKnown(DEFAULT_ALPHABET,playerGuesses,unlockedRuned);
        renderRunePanel(rpb,fa,true,(rune,value,status)=>{
            playerGuesses[rune]={value,status};
            DB.updateRuneGuesses(playerGuesses);
            const nf=filterAlphabetByKnown(DEFAULT_ALPHABET,playerGuesses,unlockedRuned);
            renderRunePanel(document.getElementById('rune-panel-body'),nf,true,(r,v,s)=>{ playerGuesses[r]={value:v,status:s}; DB.updateRuneGuesses(playerGuesses); });
        });
        document.getElementById('tools-panel-title').textContent='Инструменты';
        const pa=filterAlphabetByKnown(DEFAULT_ALPHABET,playerGuesses,unlockedRuned);
        renderTranslator(tpb,pa,true,pa);
        tpb.appendChild(renderCodeInput(tpb));
        tpb.appendChild(renderGamesPanel(tpb, DB.availableGames));
    }
}

async function refreshMasterPanels() {
    if(!DB.isMaster) return;
    const tpb=document.getElementById('tools-panel-body');
    const translatorEl = tpb.querySelector('.translator-section');
    tpb.innerHTML = '';
    if (translatorEl) tpb.appendChild(translatorEl);
    else renderTranslator(tpb, DEFAULT_ALPHABET, false, null);
    const codes=await DB.getRoomCodes(); tpb.appendChild(renderMasterCodes(tpb,codes));
    const players=await DB.getPlayersProgress(); tpb.appendChild(renderPlayerProgressDetail(tpb,players,DEFAULT_ALPHABET));
}

function onGameActivated(payload) {
    if(DB.isMaster) return;
    DB.availableGames[payload.game_type] = true;
    showNotification(`Вам доступна новая игра: ${GAMES[payload.game_type].name}`);
    renderPanels();
}

function onRuneUpdate(payload) { if(DB.isMaster) refreshMasterPanels(); }

function sendMessage() {
    const inp=document.getElementById('chat-input'); const t=inp.value.trim(); if(!t) return; inp.value=''; DB.sendChatMessage(t);
}

// Auto-restore session on page load
document.addEventListener('DOMContentLoaded', async ()=>{
    initParticles();
    initLoginScreen();
    const restored = await restoreSession();
    if (restored) {
        await loadGameScreen();
    } else {
        showScreen('login-screen');
    }
});
document.addEventListener('click',(e)=>{ if(e.target.id==='game-modal') closeGameModal(); });
