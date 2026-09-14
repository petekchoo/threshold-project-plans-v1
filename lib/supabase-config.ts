type PublicEnvironment = Record<string, string | undefined>;

const disabledPreviewConfig = {
  url: 'https://disabled.invalid',
  publishableKey: 'preview-build-disabled',
};

export function resolveSupabasePublicConfig(environment: PublicEnvironment) {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (url && publishableKey) return { url, publishableKey };

  // Feature previews deliberately receive no backend configuration. A disabled
  // client lets Vercel prove that they compile without granting data access.
  if (environment.VERCEL_ENV === 'preview') return disabledPreviewConfig;

  throw new Error('Missing Supabase public environment variables.');
}
