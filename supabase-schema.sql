CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(6) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    master_name VARCHAR(50) NOT NULL,
    master_password_hash VARCHAR(64) NOT NULL,
    rune_alphabet TEXT NOT NULL DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    room_id VARCHAR(6) REFERENCES rooms(id) ON DELETE CASCADE,
    message_id VARCHAR(20) NOT NULL,
    author VARCHAR(50) NOT NULL,
    is_master BOOLEAN DEFAULT false,
    text TEXT NOT NULL,
    reactions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room_id, created_at);
CREATE TABLE IF NOT EXISTS player_progress (
    id BIGSERIAL PRIMARY KEY,
    room_id VARCHAR(6) REFERENCES rooms(id) ON DELETE CASCADE,
    player_id VARCHAR(30) NOT NULL,
    player_name VARCHAR(50) NOT NULL,
    rune_guesses JSONB DEFAULT '{}',
    unlocked_runes JSONB DEFAULT '[]',
    games_completed JSONB DEFAULT '[]',
    unlocked_games JSONB DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, player_id)
);
CREATE TABLE IF NOT EXISTS game_codes (
    id BIGSERIAL PRIMARY KEY,
    room_id VARCHAR(6) REFERENCES rooms(id) ON DELETE CASCADE,
    game_type VARCHAR(30) NOT NULL,
    code VARCHAR(8) NOT NULL,
    used BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_codes_room ON game_codes(room_id, code);
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_codes DISABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
