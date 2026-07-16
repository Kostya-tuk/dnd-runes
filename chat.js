const DB = {
    currentRoom: null,
    currentUser: null,
    isMaster: false,
    channel: null,
    availableGames: {},

    async createRoom(roomName, masterName, masterPasswordHash) {
        const roomId = this.generateRoomId();
        const { data, error } = await dbClient.from('rooms').insert({
            id: roomId, name: roomName, master_name: masterName,
            master_password_hash: masterPasswordHash,
            rune_alphabet: JSON.stringify(DEFAULT_ALPHABET), active: true
        }).select().single();
        if (error) throw error;
        await this.generateCodes(roomId);
        return data;
    },

    async joinRoom(roomId, nickname, isMaster = false, passwordHash = null) {
        const { data: room, error } = await dbClient.from('rooms').select('*').eq('id', roomId).eq('active', true).single();
        if (error) throw new Error('Комната не найдена');
        if (isMaster && room.master_password_hash !== passwordHash) throw new Error('Неверный пароль мастера');
        this.currentRoom = room;
        this.currentUser = { id: this.generateUserId(), nickname, room_id: roomId, is_master: isMaster };
        this.isMaster = isMaster;
        if (!isMaster) {
            const { data: existing } = await dbClient.from('player_progress').select('*').eq('room_id', roomId).eq('player_id', this.currentUser.id).single();
            if (!existing) {
                await dbClient.from('player_progress').insert({ room_id: roomId, player_id: this.currentUser.id, player_name: nickname, rune_guesses: JSON.stringify({}), unlocked_runes: JSON.stringify([]), games_completed: JSON.stringify([]) });
            }
        }
        await this.subscribeToRoom(roomId);
        return room;
    },

    async subscribeToRoom(roomId) {
        this.channel = dbClient.channel(`room:${roomId}`)
            .on('broadcast', { event: 'chat' }, (payload) => { if (typeof onChatMessage === 'function') onChatMessage(payload.payload); })
            .on('broadcast', { event: 'rune_update' }, (payload) => { if (typeof onRuneUpdate === 'function') onRuneUpdate(payload.payload); })
            .on('broadcast', { event: 'game_activated' }, (payload) => { if (typeof onGameActivated === 'function') onGameActivated(payload.payload); })
            .subscribe();
    },

    async sendChatMessage(text) {
        const message = { id: Date.now().toString(36)+Math.random().toString(36).slice(2,6), author: this.currentUser.nickname, is_master: this.isMaster, text, timestamp: new Date().toISOString(), reactions: {} };
        await dbClient.from('chat_messages').insert({ room_id: this.currentRoom.id, message_id: message.id, author: message.author, is_master: message.is_master, text: message.text, reactions: JSON.stringify(message.reactions), created_at: message.timestamp });
        await this.channel.send({ type: 'broadcast', event: 'chat', payload: message });
        return message;
    },

    async loadChatHistory() {
        const { data } = await dbClient.from('chat_messages').select('*').eq('room_id', this.currentRoom.id).order('created_at', { ascending: true }).limit(100);
        return (data||[]).map(m=>({ id:m.message_id, author:m.author, is_master:m.is_master, text:m.text, timestamp:m.created_at, reactions: typeof m.reactions==='string'?JSON.parse(m.reactions):(m.reactions||{}) }));
    },

    async addReaction(messageId, reaction) {
        const { data: msg } = await dbClient.from('chat_messages').select('reactions').eq('message_id', messageId).single();
        if (!msg) return;
        const reactions = typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : (msg.reactions || {});
        reactions[reaction] = (reactions[reaction] || 0) + 1;
        await dbClient.from('chat_messages').update({ reactions: JSON.stringify(reactions) }).eq('message_id', messageId);
    },

    async updateRuneGuesses(guesses) {
        if (this.isMaster) return;
        await dbClient.from('player_progress').update({ rune_guesses: JSON.stringify(guesses) }).eq('room_id', this.currentRoom.id).eq('player_id', this.currentUser.id);
        await this.channel.send({ type: 'broadcast', event: 'rune_update', payload: { player_id: this.currentUser.id, player_name: this.currentUser.nickname, guesses } });
    },

    async unlockRune(runeSymbol, runeValue) {
        if (this.isMaster) return [];
        const { data: progress } = await dbClient.from('player_progress').select('*').eq('room_id', this.currentRoom.id).eq('player_id', this.currentUser.id).single();
        if (!progress) return [];
        const unlocked = typeof progress.unlocked_runes === 'string' ? JSON.parse(progress.unlocked_runes) : (progress.unlocked_runes || []);
        if (!unlocked.find(r => r.symbol === runeSymbol)) unlocked.push({ symbol: runeSymbol, value: runeValue });
        const guesses = typeof progress.rune_guesses === 'string' ? JSON.parse(progress.rune_guesses) : (progress.rune_guesses || {});
        guesses[runeSymbol] = { value: runeValue, status: 'locked' };
        await dbClient.from('player_progress').update({ unlocked_runes: JSON.stringify(unlocked), rune_guesses: JSON.stringify(guesses) }).eq('room_id', this.currentRoom.id).eq('player_id', this.currentUser.id);
        await this.channel.send({ type: 'broadcast', event: 'rune_update', payload: { player_id: this.currentUser.id, player_name: this.currentUser.nickname, guesses, unlocked_runes: unlocked } });
        return unlocked;
    },

    async getPlayersProgress() {
        const { data } = await dbClient.from('player_progress').select('*').eq('room_id', this.currentRoom.id);
        return (data||[]).map(p => ({ player_id: p.player_id, player_name: p.player_name, guesses: typeof p.rune_guesses==='string'?JSON.parse(p.rune_guesses):{}, unlocked: typeof p.unlocked_runes==='string'?JSON.parse(p.unlocked_runes):[], completed: typeof p.games_completed==='string'?JSON.parse(p.games_completed):[] }));
    },

    async generateCodes(roomId) {
        const games = ['memory_colors','find_pairs','cups','timer','catch_balls'];
        const codes = [];
        for (const game of games) for (let i=0;i<5;i++) codes.push({ room_id: roomId, game_type: game, code: this.generateCode(), used: false, active: false });
        await dbClient.from('game_codes').insert(codes);
    },

    async verifyCode(code) {
        const { data } = await dbClient.from('game_codes').select('*').eq('room_id', this.currentRoom.id).eq('code', code).single();
        if (!data) return null;
        return data;
    },

    async markCodeUsed(codeId) {
        await dbClient.from('game_codes').update({ used: true, active: false }).eq('id', codeId);
    },

    async activateCodeForPlayers(codeId, gameType) {
        await dbClient.from('game_codes').update({ active: true }).eq('id', codeId);
        await this.channel.send({ type: 'broadcast', event: 'game_activated', payload: { game_type: gameType, code_id: codeId } });
    },

    async getRoomCodes() {
        const { data } = await dbClient.from('game_codes').select('*').eq('room_id', this.currentRoom.id).order('game_type');
        return data || [];
    },

    generateRoomId() { const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let id=''; for(let i=0;i<6;i++) id+=chars[Math.floor(Math.random()*chars.length)]; return id; },
    generateUserId() { return 'u_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); },
    generateCode() { const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code=''; for(let i=0;i<8;i++) code+=chars[Math.floor(Math.random()*chars.length)]; return code; },

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
    },

    async disconnect() {
        if (this.channel) { await dbClient.removeChannel(this.channel); this.channel = null; }
        this.currentRoom = null; this.currentUser = null; this.isMaster = false; this.availableGames = {};
    }
};
