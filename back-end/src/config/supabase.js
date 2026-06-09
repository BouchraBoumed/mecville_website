import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.warn('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  console.warn('Backend will start but Supabase features will fail at runtime.');
}

export const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function getAuthenticatedClient(jwt) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );
}
