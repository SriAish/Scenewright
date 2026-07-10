/*
  NEXT_PUBLIC_SUPABASE_URL in this project's env carries a /rest/v1/
  path suffix. The auth and realtime endpoints live under the project
  origin, not that path, so every Supabase client here uses the origin
  rather than the raw env value.
*/
export function getSupabaseEnv() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawUrl || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return {
    url: new URL(rawUrl).origin,
    anonKey,
  };
}
