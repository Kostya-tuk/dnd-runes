// Конфигурация Supabase
const SUPABASE_URL = 'https://ziiqhrbkjqxdfmicbnpe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Z8jumEDG_YyYmjmRQFO3lA_chlpLvUM';

// Инициализация клиента (используем глобальный supabase из UMD-сборки)
const dbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
