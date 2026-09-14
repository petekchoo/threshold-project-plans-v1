import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/database.types';
import { resolveSupabasePublicConfig } from './supabase-config';

const { url, publishableKey } = resolveSupabasePublicConfig(process.env);

export const supabase = createClient<Database>(url, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
