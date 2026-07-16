// Модуль работы с базой данных dbClient

const DB = {
    // Текущая комната и пользователь
    currentRoom: null,
    currentUser: null,
    isMaster: false,
    channel: null,

    // Создать комнату
    async createRoom(roomName, masterName, masterPasswordHash) {
        const roomId = this.generateRoomId();
        const { data, error } = await dbClient
            .from('rooms')
            .insert({
                id: roomId,
                name: roomName,
                master_name: masterName,
                master_password_hash: masterPasswordHash,
                rune_alphabet: JSON.stringify(DEFAULT_ALPHABET),
                active: true
            })
            .select()
            .single();

        if (error) throw error;

        // Создать записи кодов мини-игр
        await this.generateCodes(roomId);

        return data;
    },

    // Подключиться к комнате
    async joinRoom(roomId, nickname, isMaster = false, passwordHash = null) {
        const { data: room, error } = await dbClient
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .eq('active', true)
            .single();

        if (error) throw new Error('Комната не найдена');

        if (isMaster) {
            if (room.master_password_hash !== passwordHash) {
                throw new Error('Неверный пароль мастера');
            }
        }

        this.currentRoom = room;
        this.currentUser = {
            id: this.generateUserId(),
            nickname: nickname,
            room_id: roomId,
            is_master: isMaster
        };
        this.isMaster = isMaster;

        // Если игрок, создаём запись прогресса
        if (!isMaster) {
            const { data: existing } = await dbClient
                .from('player_progress')
                .select('*')
                .eq('room_id', roomId)
                .eq('player_id', this.currentUser.id)
                .single();

            if (!existing) {
                await dbClient.from('player_progress').insert({
                    room_id: roomId,
                    player_id: this.currentUser.id,
                    player_name: nickname,
                    rune_guesses: JSON.stringify({}),
                    unlocked_runes: JSON.stringify([]),
                    games_completed: JSON.stringify([])
                });
            }
        }

        // Подписаться на real-time канал
        await this.subscribeToRoom(roomId);

        return room;
    },

    // Подписка на real-time обновления
    async subscribeToRoom(roomId) {
        this.channel = dbClient
            .channel(`room:${roomId}`)
            .on('broadcast', { event: 'chat' }, (payload) => {
                if (typeof onChatMessage === 'function') {
                    onChatMessage(payload.payload);
                }
            })
            .on('broadcast', { event: 'rune_update' }, (payload) => {
                if (typeof onRuneUpdate === 'function') {
                    onRuneUpdate(payload.payload);
                }
            })
            .subscribe();
    },

    // Отправить сообщение в чат
    async sendChatMessage(text) {
        const message = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            author: this.currentUser.nickname,
            is_master: this.isMaster,
            text: text,
            timestamp: new Date().toISOString(),
            reactions: {}
        };

        // Сохраняем в БД
        await dbClient.from('chat_messages').insert({
            room_id: this.currentRoom.id,
            message_id: message.id,
            author: message.author,
            is_master: message.is_master,
            text: message.text,
            reactions: JSON.stringify(message.reactions),
            created_at: message.timestamp
        });

        // Отправляем через broadcast
        await this.channel.send({
            type: 'broadcast',
            event: 'chat',
            payload: message
        });

        return message;
    },

    // Загрузить историю чата
    async loadChatHistory() {
        const { data, error } = await dbClient
            .from('chat_messages')
            .select('*')
            .eq('room_id', this.currentRoom.id)
            .order('created_at', { ascending: true })
            .limit(100);

        if (error) return [];
        return data.map(msg => ({
            id: msg.message_id,
            author: msg.author,
            is_master: msg.is_master,
            text: msg.text,
            timestamp: msg.created_at,
            reactions: typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : (msg.reactions || {})
        }));
    },

    // Добавить реакцию
    async addReaction(messageId, reaction) {
        const { data: msg } = await dbClient
            .from('chat_messages')
            .select('reactions')
            .eq('message_id', messageId)
            .single();

        if (!msg) return;
        const reactions = typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : (msg.reactions || {});
        reactions[reaction] = (reactions[reaction] || 0) + 1;

        await dbClient
            .from('chat_messages')
            .update({ reactions: JSON.stringify(reactions) })
            .eq('message_id', messageId);
    },

    // Обновить догадки игрока о рунах
    async updateRuneGuesses(guesses) {
        if (this.isMaster) return;
        await dbClient
            .from('player_progress')
            .update({ rune_guesses: JSON.stringify(guesses) })
            .eq('room_id', this.currentRoom.id)
            .eq('player_id', this.currentUser.id);

        // Уведомить мастера
        await this.channel.send({
            type: 'broadcast',
            event: 'rune_update',
            payload: {
                player_id: this.currentUser.id,
                player_name: this.currentUser.nickname,
                guesses: guesses
            }
        });
    },

    // Разблокировать руну (после мини-игры)
    async unlockRune(runeSymbol, runeValue) {
        if (this.isMaster) return;
        const { data: progress } = await dbClient
            .from('player_progress')
            .select('*')
            .eq('room_id', this.currentRoom.id)
            .eq('player_id', this.currentUser.id)
            .single();

        if (!progress) return;

        const unlocked = typeof progress.unlocked_runes === 'string'
            ? JSON.parse(progress.unlocked_runes)
            : (progress.unlocked_runes || []);

        if (!unlocked.find(r => r.symbol === runeSymbol)) {
            unlocked.push({ symbol: runeSymbol, value: runeValue });
        }

        const guesses = typeof progress.rune_guesses === 'string'
            ? JSON.parse(progress.rune_guesses)
            : (progress.rune_guesses || {});
        guesses[runeSymbol] = { value: runeValue, status: 'locked' };

        await dbClient
            .from('player_progress')
            .update({
                unlocked_runes: JSON.stringify(unlocked),
                rune_guesses: JSON.stringify(guesses)
            })
            .eq('room_id', this.currentRoom.id)
            .eq('player_id', this.currentUser.id);

        await this.channel.send({
            type: 'broadcast',
            event: 'rune_update',
            payload: {
                player_id: this.currentUser.id,
                player_name: this.currentUser.nickname,
                guesses: guesses,
                unlocked_runes: unlocked
            }
        });

        return unlocked;
    },

    // Получить прогресс всех игроков (для мастера)
    async getPlayersProgress() {
        const { data, error } = await dbClient
            .from('player_progress')
            .select('*')
            .eq('room_id', this.currentRoom.id);

        if (error) return [];
        return data.map(p => ({
            player_id: p.player_id,
            player_name: p.player_name,
            guesses: typeof p.rune_guesses === 'string' ? JSON.parse(p.rune_guesses) : {},
            unlocked: typeof p.unlocked_runes === 'string' ? JSON.parse(p.unlocked_runes) : [],
            completed: typeof p.games_completed === 'string' ? JSON.parse(p.games_completed) : []
        }));
    },

    // Сгенерировать коды мини-игр
    async generateCodes(roomId) {
        const games = ['memory_colors', 'find_pairs', 'cups', 'timer', 'catch_balls'];
        const codes = [];
        for (const game of games) {
            for (let i = 0; i < 5; i++) {
                codes.push({
                    room_id: roomId,
                    game_type: game,
                    code: this.generateCode(),
                    used: false
                });
            }
        }
        await dbClient.from('game_codes').insert(codes);
    },

    // Проверить код мини-игры
    async verifyCode(code) {
        const { data, error } = await dbClient
            .from('game_codes')
            .select('*')
            .eq('room_id', this.currentRoom.id)
            .eq('code', code)
            .eq('used', false)
            .single();

        if (error || !data) return null;
        return data;
    },

    // Отметить код как использованный
    async markCodeUsed(codeId) {
        await dbClient
            .from('game_codes')
            .update({ used: true })
            .eq('id', codeId);
    },

    // Получить коды комнаты (для мастера)
    async getRoomCodes() {
        const { data } = await dbClient
            .from('game_codes')
            .select('*')
            .eq('room_id', this.currentRoom.id)
            .order('game_type');

        return data || [];
    },

    // Вспомогательные функции
    generateRoomId() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id;
    },

    generateUserId() {
        return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    },

    generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    },

    // Простой хеш пароля (SHA-256 через SubtleCrypto)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Отключиться
    async disconnect() {
        if (this.channel) {
            await dbClient.removeChannel(this.channel);
            this.channel = null;
        }
        this.currentRoom = null;
        this.currentUser = null;
        this.isMaster = false;
    }
};
