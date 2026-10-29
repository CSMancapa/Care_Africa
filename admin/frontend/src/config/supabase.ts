import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('supabaseUrl and supabaseKey are required.');
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true
    },
    db: {
      schema: 'public',
    },
  }
);

export default supabase; 