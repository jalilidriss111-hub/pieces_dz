import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vezrezjgwbaxgtrghzoc.supabase.co';
const supabaseKey = 'sb_publishable__UMZd33HvZTYHdOhyBa99g_wmqWMNjk';

export const supabase = createClient(supabaseUrl, supabaseKey);
