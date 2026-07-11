import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/*
  Service-role client, server-only. The scene-maps and entity-images
  buckets carry no storage.objects RLS policies (see the storage_buckets
  migration), so every read/write goes through this client rather than
  the per-request cookie-scoped one: issuing signed upload URLs and
  short-lived signed read URLs, per architecture.md's blob storage flow.
  Never import this from a Client Component.
*/
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
