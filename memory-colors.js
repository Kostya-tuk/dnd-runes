let chatMessages = [];

function onChatMessage(message) {
    if (chatMessages.find(m=>m.id===message.id)) return;
    chatMessages.push(message);
    appendChatMessage(message);
}

function appendChatMessage(message) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg';
    msgDiv.classList.add(message.is_master ? 'msg-master' : 'msg-player');
    msgDiv.dataset.messageId = message.id;
    const avatar = document.createElement('div');
    avatar.className = 'chat-msg-avatar';
    avatar.textContent = message.author[0].toUpperCase();
    const content = document.createElement('div');
    content.className = 'chat-msg-content';
    const header = document.createElement('div');
    header.className = 'chat-msg-header';
    const author = document.createElement('span');
    author.className = 'chat-msg-author';
    if (message.is_master) author.classList.add('master-tag');
    author.textContent = message.author;
    const time = document.createElement('span');
    time.className = 'chat-msg-time';
    time.textContent = new Date(message.timestamp).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
    header.appendChild(author); header.appendChild(time);
    const text = document.createElement('div');
    text.className = 'chat-msg-text'; text.textContent = message.text;
    const actions = document.createElement('div');
    actions.className = 'chat-msg-actions';
    const copyBtn = document.createElement('button');
    copyBtn.className='chat-btn-copy'; copyBtn.textContent='Копировать';
    copyBtn.addEventListener('click', ()=>{ navigator.clipboard.writeText(message.text).then(()=>showToast('Текст скопирован')); });
    const reactBtn = document.createElement('button');
    reactBtn.className='chat-btn-react'; reactBtn.innerHTML='<span class="poop-outline">💩</span>';
    reactBtn.title='Поставить какашку';
    reactBtn.addEventListener('click', async ()=>{
        await DB.addReaction(message.id, 'poop');
        reactBtn.classList.add('reacted');
        reactBtn.innerHTML='<span class="poop-animate">💩</span>';
        const reactionSpan = document.createElement('span');
        reactionSpan.className='chat-reaction'; reactionSpan.textContent='💩';
        text.appendChild(reactionSpan);
    });
    actions.appendChild(copyBtn); actions.appendChild(reactBtn);
    content.appendChild(header); content.appendChild(text); content.appendChild(actions);
    if (message.reactions && message.reactions.poop) {
        const reactionSpan = document.createElement('span');
        reactionSpan.className='chat-reaction'; reactionSpan.textContent='💩'.repeat(message.reactions.poop);
        text.appendChild(reactionSpan);
        reactBtn.classList.add('reacted');
        reactBtn.innerHTML='<span class="poop-animate">💩</span>';
    }
    msgDiv.appendChild(avatar); msgDiv.appendChild(content);
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message; toast.classList.add('visible');
    setTimeout(()=>toast.classList.remove('visible'), 2000);
}

function showNotification(message) {
    const notif = document.getElementById('notification');
    if (!notif) return;
    notif.textContent = message; notif.classList.add('visible');
    setTimeout(()=>notif.classList.remove('visible'), 4000);
}
