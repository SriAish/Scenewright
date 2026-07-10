import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/*
  Supabase client for use in Client Components. Create a new instance
  where needed; @supabase/ssr manages a singleton browser client
  internally, so this is cheap to call repeatedly.
*/
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
