import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

/*
  Supabase client for use in Server Components, Server Actions, and
  Route Handlers. Create a new client per request; never share one
  across requests.

  setAll can fail when called from a Server Component (cookies are
  read-only there). That's fine as long as middleware is refreshing
  the session on every request, which it does here.
*/
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component; middleware refreshes the
          // session instead, so this can be safely ignored.
        }
      },
    },
  });
}
