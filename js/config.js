const SUPABASE_URL = 'https://ziiqhrbkjqxdfmicbnpe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Z8jumEDG_YyYmjmRQFO3lA_chlpLvUM';
const dbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Глобальный код доступа мастера (общий для всех)
const MASTER_ACCESS_CODE = 'Timur228';
