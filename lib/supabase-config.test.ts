import { describe, expect, it } from 'vitest';
import { resolveSupabasePublicConfig } from './supabase-config';

describe('resolveSupabasePublicConfig', () => {
  it('uses configured public credentials when both values are present', () => {
    expect(resolveSupabasePublicConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://development.example',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
      VERCEL_ENV: 'preview',
    })).toEqual({ url: 'https://development.example', publishableKey: 'public-key' });
  });

  it('uses a non-networked placeholder for unconfigured Vercel previews', () => {
    expect(resolveSupabasePublicConfig({ VERCEL_ENV: 'preview' })).toEqual({
      url: 'https://disabled.invalid',
      publishableKey: 'preview-build-disabled',
    });
  });

  it('still fails fast outside an unconfigured Vercel preview', () => {
    expect(() => resolveSupabasePublicConfig({})).toThrow('Missing Supabase public environment variables.');
  });
});
