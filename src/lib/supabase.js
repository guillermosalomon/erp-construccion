import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if credentials are real (not placeholder values)
const isValidConfig =
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('YOUR_PROJECT') &&
  !supabaseAnonKey.includes('YOUR_ANON_KEY') &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20;

if (!isValidConfig) {
  console.warn(
    'Supabase credentials not configured. Using demo mode with local data.'
  );
}

export const supabase = isValidConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => {
  return supabase !== null;
};
