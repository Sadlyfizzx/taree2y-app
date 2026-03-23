import { createClient } from '@supabase/supabase-js';
import { createLogger } from './logger';

const log = createLogger('supabase');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  log.error('init_failed', {
    hasUrl: Boolean(supabaseUrl),
    hasKey: Boolean(supabaseKey),
  });
  throw new Error('Missing Supabase env vars. Check .env.local');
}

const urlHost = (() => {
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return null;
  }
})();

log.info('init_ready', {
  urlHost,
  env: import.meta.env?.MODE || null,
});

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
