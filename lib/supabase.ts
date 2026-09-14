import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/database.types';
import { resolveSupabasePublicConfig } from './supabase-config';

const { url, publishableKey } = resolveSupabasePublicConfig({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  VERCEL_ENV: process.env.VERCEL_ENV,
});

export const supabase = createClient<Database>(url, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
