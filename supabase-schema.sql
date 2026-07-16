-- Схема базы данных Supabase
-- Выполните этот SQL в SQL Editor вашего проекта на supabase.com

-- Таблица комнат
CREATE TABLE rooms (
    id VARCHAR(6) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    master_name VARCHAR(50) NOT NULL,
    master_password_hash VARCHAR(64) NOT NULL,
    rune_alphabet TEXT NOT NULL DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица сообщений чата
CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    room_id VARCHAR(6) REFERENCES rooms(id) ON DELETE CASCADE,
    message_id VARCHAR(20) NOT NULL,
    author VARCHAR(50) NOT NULL,
    is_master BOOLEAN DEFAULT false,
    text TEXT NOT NULL,
    reactions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_room ON chat_messages(room_id, created_at);

-- Таблица прогресса игроков
CREATE TABLE player_progress (
    id BIGSERIAL PRIMARY KEY,
    room_id VARCHAR(6) REFERENCES rooms(id) ON DELETE CASCADE,
    player_id VARCHAR(30) NOT NULL,
    player_name VARCHAR(50) NOT NULL,
    rune_guesses JSONB DEFAULT '{}',
    unlocked_runes JSONB DEFAULT '[]',
    games_completed JSONB DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, player_id)
);

-- Таблица кодов мини-игр
CREATE TABLE game_codes (
    id BIGSERIAL PRIMARY KEY,
    room_id VARCHAR(6) REFERENCES rooms(id) ON DELETE CASCADE,
    game_type VARCHAR(30) NOT NULL,
    code VARCHAR(8) NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_codes_room ON game_codes(room_id, code);

-- Включаем RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_codes ENABLE ROW LEVEL SECURITY;

-- Политики: разрешаем все операции через anon ключ (для простоты, так как это некоммерческий проект)
-- В production стоит настроить более строгие политики
CREATE POLICY "Allow all on rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on player_progress" ON player_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on game_codes" ON game_codes FOR ALL USING (true) WITH CHECK (true);

-- Включаем real-time для таблицы чата
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
